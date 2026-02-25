import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const { songId, stars } = await req.json()

    if (!songId || !stars || stars < 1 || stars > 5) {
        return NextResponse.json({ error: 'songId and stars (1-5) required' }, { status: 400 })
    }

    try {
        // Only one rating per IP per song
        const existing = await prisma.rating.findFirst({
            where: { songId, ip },
        })

        if (existing) {
            const updated = await prisma.rating.update({
                where: { id: existing.id },
                data: { stars },
            })
            return NextResponse.json({ id: updated.id, message: 'Rating updated' })
        }

        const rating = await prisma.rating.create({
            data: { songId, stars, ip },
        })

        return NextResponse.json({ id: rating.id, message: 'Rating saved. Thanks!' })
    } catch (err) {
        console.error('[/api/ratings]', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Foreign key') || msg.includes('foreign key')) {
            return NextResponse.json({ error: 'Song not found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }
}
