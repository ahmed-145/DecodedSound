import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple auth: check ADMIN_SECRET header (set in .env)
function checkAuth(req: NextRequest) {
    const secret = req.headers.get('x-admin-secret')
    const expected = process.env.ADMIN_SECRET
    if (!expected) return true // no secret configured = open in dev
    return secret === expected
}

// GET /api/admin — dashboard data
export async function GET(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
        totalSongs,
        totalTranslations,
        totalKB,
        pendingCandidates,
        totalFlags,
        candidates,
        flags,
        recentSongs,
    ] = await Promise.all([
        prisma.song.count(),
        prisma.translation.count(),
        prisma.kBEntry.count({ where: { isApproved: true } }),
        prisma.kBCandidate.count({ where: { status: 'PENDING' } }),
        prisma.flag.count(),
        prisma.kBCandidate.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.flag.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { kbEntry: { select: { term: true } } },
        }),
        prisma.song.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, title: true, artist: true, slug: true, createdAt: true, inputType: true },
        }),
    ])

    return NextResponse.json({
        stats: { totalSongs, totalTranslations, totalKB, pendingCandidates, totalFlags },
        candidates,
        flags,
        recentSongs,
    })
}

// POST /api/admin — moderation actions
export async function POST(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, id } = body as { action: string; id: string }

    if (!action || !id) {
        return NextResponse.json({ error: 'Missing action or id' }, { status: 400 })
    }

    switch (action) {
        case 'approve_candidate': {
            const candidate = await prisma.kBCandidate.update({
                where: { id },
                data: { status: 'APPROVED' },
            })
            // Create real KB entry from candidate
            await prisma.kBEntry.upsert({
                where: { term: candidate.term },
                create: {
                    term: candidate.term,
                    definition: candidate.provisionalDefinition,
                    confidence: 0.85,
                    isApproved: true,
                },
                update: {
                    definition: candidate.provisionalDefinition,
                },
            })
            return NextResponse.json({ ok: true, message: `Approved: ${candidate.term}` })
        }

        case 'reject_candidate': {
            await prisma.kBCandidate.update({
                where: { id },
                data: { status: 'REJECTED' },
            })
            return NextResponse.json({ ok: true, message: 'Candidate rejected.' })
        }

        case 'delete_flag': {
            await prisma.flag.delete({ where: { id } })
            return NextResponse.json({ ok: true, message: 'Flag deleted.' })
        }

        default:
            return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
}
