import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { translateLyrics } from '@/lib/ai'

// Vercel cron: GET /api/worker
// In vercel.json: { "crons": [{ "path": "/api/worker", "schedule": "* * * * *" }] }
export async function GET(req: NextRequest) {
    // Protect cron endpoint
    const secret = req.headers.get('x-worker-secret')
    if (process.env.NODE_ENV === 'production' && secret !== process.env.WORKER_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Grab up to 5 pending jobs
    const jobs = await prisma.job.findMany({
        where: { status: 'PENDING', attempts: { lt: 3 } },
        orderBy: { createdAt: 'asc' },
        take: 5,
        include: { song: true },
    })

    if (jobs.length === 0) return NextResponse.json({ processed: 0 })

    const results = await Promise.allSettled(
        jobs.map(async (job) => {
            await prisma.job.update({ where: { id: job.id }, data: { status: 'PROCESSING', attempts: { increment: 1 } } })

            try {
                const lyrics = (job.payload as { transcription?: string; lyrics?: string })?.transcription
                    ?? (job.payload as { lyrics?: string })?.lyrics
                    ?? job.song?.rawLyrics

                if (!lyrics) throw new Error('No lyrics in job payload')

                const kbEntries = await prisma.kBEntry.findMany({ where: { isApproved: true }, select: { term: true, definition: true }, take: 200 })
                const kbContext = kbEntries.map(e => `${e.term}: ${e.definition}`).join('\n')

                const result = await translateLyrics(lyrics, kbContext)

                await prisma.translation.create({
                    data: {
                        songId: job.songId!,
                        plainTranslation: result.plainTranslation,
                        lineByLine: result.lineByLine,
                        culturalContext: result.culturalContext,
                        unknownTerms: result.unknownTerms,
                        genreConfidence: result.genreConfidence,
                        overallConfidence: result.overallConfidence,
                    },
                })

                await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETE' } })
            } catch (err) {
                const error = err instanceof Error ? err.message : 'Unknown error'
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: job.attempts >= 2 ? 'FAILED' : 'PENDING',
                        error,
                    },
                })
                throw err
            }
        })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ processed: jobs.length, succeeded, failed })
}
