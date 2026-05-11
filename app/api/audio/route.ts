import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transcribeAudio } from '@/lib/ai'
import { generateSlug } from '@/lib/utils'
import { audioLimiter } from '@/lib/rateLimit'

const MAX_BYTES = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!audioLimiter.check(ip)) {
        return NextResponse.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('audio') as File | null
        const title = formData.get('title') as string | null
        const artist = formData.get('artist') as string | null

        if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'File too large. Max 50MB.' }, { status: 400 })
        }

        // BUG-4: audio route creates a Job record but the translate route does NOT —
        // so TYPED translations never get background-processed. Fixed: audio route still
        // creates a job (correct), but we must NOT create a job for TYPED (it's already
        // synchronous). The job here is used by the worker to retry if transcription
        // succeeded but translation fails (the worker picks it up). ✓ correct design.

        // BUG-5: transcribeAudio errors (e.g. Groq 429 on Whisper) were silently caught
        // by the outer catch and returned as generic "Transcription failed."
        // Now we surface the specific Groq error.
        let transcription: string
        try {
            const buffer = Buffer.from(await file.arrayBuffer())
            transcription = await transcribeAudio(buffer, file.name)
        } catch (whisperErr) {
            const msg = whisperErr instanceof Error ? whisperErr.message : String(whisperErr)
            console.error('[/api/audio] Whisper error:', msg)
            if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                return NextResponse.json({ error: 'AI transcription rate limit hit — please wait 30 seconds.' }, { status: 429 })
            }
            if (msg.includes('413') || msg.toLowerCase().includes('too large')) {
                return NextResponse.json({ error: 'File too large for Whisper API. Try a shorter clip.' }, { status: 413 })
            }
            return NextResponse.json({ error: 'Transcription failed: ' + (msg.length < 200 ? msg : 'Unknown Whisper error.') }, { status: 500 })
        }

        if (!transcription || transcription.trim().length < 3) {
            return NextResponse.json({ error: 'No speech detected in audio. Make sure the file contains vocals.' }, { status: 422 })
        }

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
