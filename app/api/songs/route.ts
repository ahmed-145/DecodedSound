import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/songs — public library with search + pagination
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const skip = (page - 1) * limit

    const where = q
        ? {
            isPublic: true,
            OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { artist: { contains: q, mode: 'insensitive' as const } },
            ],
        }
        : { isPublic: true }

    const [songs, total] = await Promise.all([
        prisma.song.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                translations: { select: { overallConfidence: true, genreConfidence: true }, take: 1 },
                ratings: { select: { stars: true } },
                _count: { select: { ratings: true } },
            },
        }),
        prisma.song.count({ where }),
    ])

    const songsWithRating = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        slug: s.slug,
        inputType: s.inputType,
        createdAt: s.createdAt,
        overallConfidence: s.translations[0]?.overallConfidence ?? 0,
        genreConfidence: s.translations[0]?.genreConfidence ?? 0,
        avgRating: s.ratings.length
            ? s.ratings.reduce((sum, r) => sum + r.stars, 0) / s.ratings.length
            : null,
        ratingCount: s._count.ratings,
    }))

    return NextResponse.json({ songs: songsWithRating, total, page, totalPages: Math.ceil(total / limit) })
}
