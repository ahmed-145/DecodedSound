import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/kb — search KB entries
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    const entries = await prisma.kBEntry.findMany({
        where: {
            isApproved: true,
            ...(q ? { term: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: { term: 'asc' },
        take: limit,
    })

    return NextResponse.json({ entries })
}

// POST /api/kb/contribute — community contribution (goes to moderation)
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const { term, definition, example } = await req.json()

    if (!term || !definition) {
        return NextResponse.json({ error: 'Term and definition required' }, { status: 400 })
    }

    // Honeypot check (field should be empty)
    const body = await req.text().catch(() => '')

    const contribution = await prisma.contribution.create({
        data: { term: term.trim(), definition: definition.trim(), example: example?.trim(), ip },
    })

    return NextResponse.json({ id: contribution.id, message: 'Contribution submitted for review. Thank you!' })
}
