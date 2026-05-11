import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// BUG-8: Worker uses job.attempts >= 2 to decide FAILED status, but increments attempts
// BEFORE the try block. So when attempts starts at 0:
//   Run 1: attempts → 1, on failure → attempts(1) >= 2? No → PENDING ✓
//   Run 2: attempts → 2, on failure → attempts(2) >= 2? Yes → FAILED ✓
//   BUT: the comparison uses the OLD value from the DB (before increment), so it's
//   actually checking (attempts_before_increment >= 2). When attempts was 1 going in,
//   it becomes 2 after increment, but the check uses the PRE-increment value of 1.
//   This means a job will retry a THIRD time when it should be marked FAILED.
//
// Fix: re-fetch the updated attempt count after increment, or use a predictable
// threshold against the already-incremented value by checking (job.attempts + 1 >= 3).

// Vercel cron: GET /api/worker
// In vercel.json: { "crons": [{ "path": "/api/worker", "schedule": "* * * * *" }] }
export async function GET(req: NextRequest) {
    // Protect cron endpoint
    // BUG-9: Vercel cron sends an Authorization header, not x-worker-secret.
    // The actual Vercel cron OIDC token is in Authorization: Bearer <token>.
    // Our custom header check is fine for an extra layer, but we also need to allow
    // the Vercel-originated cron call. Fix: also allow requests from Vercel's cron
    // by checking the Authorization header Vercel sends automatically.
    const secret = req.headers.get('x-worker-secret')
    const authHeader = req.headers.get('authorization') ?? ''
    // Vercel cron sends `authorization: Bearer <OIDC token>` — treat presence as valid from Vercel infra
    const isVercelCron = authHeader.startsWith('Bearer ')
    if (process.env.NODE_ENV === 'production' && secret !== process.env.WORKER_SECRET && !isVercelCron) {
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
            // Increment attempts FIRST (prevents double-processing if worker is slow)
            const updated = await prisma.job.update({
                where: { id: job.id },
                data: { status: 'PROCESSING', attempts: { increment: 1 } },
            })
            const newAttempts = updated.attempts

            try {
                const lyrics = (job.payload as { transcription?: string; lyrics?: string })?.transcription
                    ?? (job.payload as { lyrics?: string })?.lyrics
                    ?? job.song?.rawLyrics

                if (!lyrics) throw new Error('No lyrics in job payload')

                const kbEntries = await prisma.kBEntry.findMany({ where: { isApproved: true }, select: { term: true, definition: true }, take: 200 })
                const kbContext = kbEntries.map(e => `${e.term}: ${e.definition}`).join('\n')

                const { translateLyrics } = await import('@/lib/ai')
                const result = await translateLyrics(lyrics, kbContext)

                await prisma.translation.create({
                    data: {
                        songId: job.songId!,
                        plainTranslation: result.plainTranslation,
                        lineByLine: JSON.parse(JSON.stringify(result.lineByLine)),
                        culturalContext: result.culturalContext,
                        unknownTerms: JSON.parse(JSON.stringify(result.unknownTerms ?? [])),
                        genreConfidence: result.genreConfidence,
                        overallConfidence: result.overallConfidence,
                    },
                })

                await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETE' } })
            } catch (err) {
                const error = err instanceof Error ? err.message : 'Unknown error'
                // BUG-8 fix: use newAttempts (post-increment value) to determine FAILED
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: newAttempts >= 3 ? 'FAILED' : 'PENDING',
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
