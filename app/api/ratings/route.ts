import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const { songId, stars } = await req.json()

    if (!songId || !stars || stars < 1 || stars > 5) {
        return NextResponse.json({ error: 'songId and stars (1-5) required' }, { status: 400 })
    }

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
}
