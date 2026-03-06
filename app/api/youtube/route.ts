import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractYouTubeAudio } from '@/lib/ytdlp'
import { transcribeAudio } from '@/lib/ai'
import { generateSlug } from '@/lib/utils'
import { audioLimiter } from '@/lib/rateLimit'
import fs from 'fs/promises'

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!audioLimiter.check(ip)) {
        return NextResponse.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 })
    }

    try {
        const { url, title, artist } = await req.json()

        const isValidYT = url && (url.includes('youtube.com') || url.includes('youtu.be'))
        if (!isValidYT) {
            return NextResponse.json({ error: 'Please paste a valid YouTube URL (youtube.com or youtu.be)' }, { status: 400 })
        }

        // ── YouTube URL Cache (PRD US-05) ─────────────────────────────
        // If this URL has already been translated, serve the cached result
        const existingSong = await prisma.song.findFirst({
            where: { sourceUrl: url, inputType: 'YOUTUBE' },
            include: { translations: { take: 1 } },
        })
        if (existingSong) {
            return NextResponse.json({
                songId: existingSong.id,
                slug: existingSong.slug,
                lyrics: existingSong.rawLyrics,
                method: 'cache',
                cached: true,
                message: 'This song was previously translated! Loading cached result.',
            })
        }

        // Skip YouTube auto-captions entirely — they auto-translate SDK/Cape Flats Afrikaans
        // into broken English, making them useless. Download audio + use Groq Whisper instead.
        let audioPath: string | null = null
        let mimeType = 'audio/webm'
        let cleanupFn: (() => Promise<void>) | null = null

        try {
            const extracted = await extractYouTubeAudio(url)
            audioPath = extracted.audioPath
            mimeType = extracted.mimeType
            cleanupFn = extracted.cleanup
        } catch (ytErr) {
            const ytMsg = ytErr instanceof Error ? ytErr.message : String(ytErr)
            console.error('[/api/youtube] yt-dlp error:', ytMsg)

            if (ytMsg.toLowerCase().includes('not found') || ytMsg.includes('No such file') || ytMsg.includes('yt-dlp')) {
                return NextResponse.json({ error: 'yt-dlp not found. Run: pip3 install yt-dlp' }, { status: 422 })
            }
            if (ytMsg.includes('Private') || ytMsg.includes('private')) {
                return NextResponse.json({ error: 'This video is private or unavailable.' }, { status: 422 })
            }
            return NextResponse.json({ error: 'Could not download audio. The video may be private or age-restricted.' }, { status: 422 })
        }

        // Transcribe with Groq Whisper using Afrikaans hint for Cape Flats phonetics
        let lyrics: string
        try {
            const buffer = await fs.readFile(audioPath!)
            lyrics = await transcribeAudio(buffer, `audio${mimeType === 'audio/webm' ? '.webm' : mimeType === 'audio/mp4' ? '.m4a' : '.mp3'}`)
        } finally {
            if (cleanupFn) await cleanupFn()
        }

        if (!lyrics || lyrics.trim().length < 5) {
            return NextResponse.json({ error: 'Could not transcribe audio. The audio may be too short or unclear.' }, { status: 422 })
        }

        const slug = generateSlug(title || 'YouTube Song', artist || undefined)
        const song = await prisma.song.create({
            data: {
                title: title || 'YouTube Song',
                artist: artist ?? null,
                inputType: 'YOUTUBE',
                rawLyrics: lyrics,
                sourceUrl: url,
                slug,
            },
        })

        return NextResponse.json({
            songId: song.id,
            slug: song.slug,
            lyrics,
            method: 'whisper',
            message: 'Audio transcribed by Groq Whisper. Review lyrics then hit Translate.',
        })
    } catch (err) {
        console.error('[/api/youtube]', err)
        return NextResponse.json({ error: 'YouTube extraction failed.' }, { status: 500 })
    }
}
