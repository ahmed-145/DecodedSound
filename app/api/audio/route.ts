import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transcribeAudio } from '@/lib/ai'
import { generateSlug } from '@/lib/utils'
import fs from 'fs/promises'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('audio') as File | null
        const title = formData.get('title') as string | null
        const artist = formData.get('artist') as string | null

        if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Max 50MB.' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const transcription = await transcribeAudio(buffer, file.name)

        const slug = generateSlug(title || 'Audio Upload', artist || undefined)
        const song = await prisma.song.create({
            data: {
                title: title || 'Audio Upload',
                artist: artist ?? null,
                inputType: 'AUDIO',
                rawLyrics: transcription,
                slug,
                jobs: {
                    create: {
                        inputType: 'AUDIO',
                        status: 'PENDING',
                        payload: { transcription },
                    },
                },
            },
        })

        return NextResponse.json({
            songId: song.id,
            slug: song.slug,
            transcription,
            message: 'Audio transcribed. Review lyrics before translating.',
        })
    } catch (err) {
        console.error('[/api/audio]', err)
        return NextResponse.json({ error: 'Transcription failed.' }, { status: 500 })
    }
}
