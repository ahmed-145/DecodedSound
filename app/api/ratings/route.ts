import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { songId, stars } = await req.json()

    if (!songId || !stars || stars < 1 || stars > 5) {
        return NextResponse.json({ error: 'songId and stars (1-5) required' }, { status: 400 })
    }

    try {
        // @@unique([songId, ip]) — one rating per IP per song (upsert on re-rate)
        const rating = await prisma.rating.upsert({
            where: { songId_ip: { songId, ip } },
            create: { songId, stars, ip },
            update: { stars },
        })

        return NextResponse.json({ id: rating.id, message: 'Rating saved. Thanks!' })
    } catch (err) {
        console.error('[/api/ratings]', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Foreign key') || msg.includes('foreign key') || msg.includes('violates foreign key')) {
            return NextResponse.json({ error: 'Song not found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }
}

