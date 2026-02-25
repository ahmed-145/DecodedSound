import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    const song = await prisma.song.findUnique({
        where: { slug: params.slug },
        include: {
            translations: { orderBy: { createdAt: 'desc' }, take: 1 },
            ratings: { select: { stars: true } },
            _count: { select: { ratings: true } },
        },
    })

    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

    const avgRating = song.ratings.length
        ? song.ratings.reduce((sum, r) => sum + r.stars, 0) / song.ratings.length
        : null

    return NextResponse.json({
        ...song,
        avgRating,
        ratingCount: song._count.ratings,
    })
}
