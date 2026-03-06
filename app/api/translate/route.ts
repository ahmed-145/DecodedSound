import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { translateLyrics, detectGenre } from '@/lib/ai'
import { generateSlug } from '@/lib/utils'
import { translateLimiter } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!translateLimiter.check(ip)) {
        return NextResponse.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 })
    }

    try {
        const body = await req.json()
        const { lyrics, title, artist, overrideGenreWarning } = body as {
            lyrics: string
            title?: string
            artist?: string
            overrideGenreWarning?: boolean
        }

        if (!lyrics || lyrics.trim().length < 10) {
            return NextResponse.json({ error: 'Lyrics too short' }, { status: 400 })
        }

        // PRD Section 10, Step 7: genre detection before translation
        // Run genre check + KB lookup in parallel to save time
        const [genre, kbEntries] = await Promise.all([
            detectGenre(lyrics),
            prisma.kBEntry.findMany({
                where: { isApproved: true },
                select: { term: true, definition: true },
                take: 200,
            }),
        ])

        // >0.85 non-SDK AND user hasn't clicked "try anyway" → return genre warning
        if (!genre.isSDK && genre.confidence > 0.85 && !overrideGenreWarning) {
            return NextResponse.json({
                genreWarning: true,
                genreConfidence: genre.confidence,
                message: "Doesn't look like SDK music — we specialise in SDK for now. Try anyway?",
            }, { status: 200 })
        }

        const kbContext = kbEntries.length > 0
            ? kbEntries.map(e => `${e.term}: ${e.definition}`).join('\n')
            : undefined

        // Track processing time (PRD Section 7.2 - processingTimeMs)
        const t0 = Date.now()
        const result = await translateLyrics(lyrics, kbContext)
        const processingTimeMs = Date.now() - t0

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

        const translation = await prisma.translation.create({
            data: {
                songId: song.id,
                plainTranslation: result.plainTranslation,
                lineByLine: JSON.parse(JSON.stringify(result.lineByLine)),
                culturalContext: result.culturalContext,
                unknownTerms: JSON.parse(JSON.stringify(result.unknownTerms ?? [])),
                genreConfidence: result.genreConfidence,
                overallConfidence: result.overallConfidence,
                aiModelVersion: 'llama-3.3-70b-versatile',
                processingTimeMs,
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
            // Include genreWarning if low SDK confidence (disclaimer banner in UI)
            genreWarning: !genre.isSDK || genre.confidence < 0.6 ? true : undefined,
            genreConfidence: genre.confidence,
            translation,
        })
    } catch (err) {
        console.error('[/api/translate]', err)
        const msg = err instanceof Error ? err.message : String(err)
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
