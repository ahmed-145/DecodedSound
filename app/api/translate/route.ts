import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { translateLyrics } from '@/lib/ai'
import { generateSlug } from '@/lib/utils'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { lyrics, title, artist } = body as {
            lyrics: string
            title?: string
            artist?: string
        }

        if (!lyrics || lyrics.trim().length < 10) {
            return NextResponse.json({ error: 'Lyrics too short' }, { status: 400 })
        }

        // Look up KB context for known terms
        const kbEntries = await prisma.kBEntry.findMany({
            where: { isApproved: true },
            select: { term: true, definition: true },
            take: 200,
        })

        const kbContext = kbEntries.length > 0
            ? kbEntries.map(e => `${e.term}: ${e.definition}`).join('\n')
            : undefined

        // Translate via Gemini
        const result = await translateLyrics(lyrics, kbContext)

        // Persist song first, then translation separately (cleaner Prisma types)
        const songTitle = title || 'Untitled'
        const slug = generateSlug(songTitle, artist)

        const song = await prisma.song.create({
            data: {
                title: songTitle,
                artist: artist ?? null,
                inputType: 'TYPED',
                rawLyrics: lyrics,
                slug,
            },
        })

        // Cast JSON fields — Prisma requires Prisma.InputJsonValue for Json columns
        const translation = await prisma.translation.create({
            data: {
                songId: song.id,
                plainTranslation: result.plainTranslation,
                lineByLine: JSON.parse(JSON.stringify(result.lineByLine)),
                culturalContext: result.culturalContext,
                unknownTerms: JSON.parse(JSON.stringify(result.unknownTerms ?? [])),
                genreConfidence: result.genreConfidence,
                overallConfidence: result.overallConfidence,
            },
        })

        // Auto-promote unknown terms to KB candidates
        if (result.unknownTerms?.length > 0) {
            await prisma.kBCandidate.createMany({
                data: result.unknownTerms.map(t => ({
                    term: t.term,
                    provisionalDefinition: t.provisionalDefinition,
                    confidence: t.confidence,
                    sourceSongId: song.id,
                })),
                skipDuplicates: true,
            })
        }

        return NextResponse.json({
            songId: song.id,
            slug: song.slug,
            translation,
        })
    } catch (err) {
        console.error('[/api/translate]', err)
        const msg = err instanceof Error ? err.message : String(err)
        // Surface helpful messages for known failure modes
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')) {
            return NextResponse.json({ error: 'AI rate limit hit — please wait 30 seconds and try again.' }, { status: 429 })
        }
        if (msg.includes('404') || msg.includes('Not Found')) {
            return NextResponse.json({ error: 'AI model unavailable. Please try again.' }, { status: 500 })
        }
        return NextResponse.json(
            { error: 'Translation failed: ' + (msg.length < 200 ? msg : 'Unknown error. Check server logs.') },
            { status: 500 }
        )
    }
}
