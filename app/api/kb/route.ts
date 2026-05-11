import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeLimiter } from '@/lib/rateLimit'

// GET /api/kb — search KB entries
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500) // BUG-1: cap limit to 500 (was uncapped — DoS vector)

    try {
        const entries = await prisma.kBEntry.findMany({
            where: {
                isApproved: true,
                ...(q ? { term: { contains: q, mode: 'insensitive' } } : {}),
            },
            orderBy: { term: 'asc' },
            take: limit,
        })
        return NextResponse.json({ entries })
    } catch (err) {
        console.error('[/api/kb GET]', err)
        return NextResponse.json({ error: 'Failed to load KB entries.' }, { status: 500 })
    }
}

// POST /api/kb — community contribution (goes to moderation)
// BUG-2: Was using req.json() then req.text() — body can only be read once.
// BUG-3: writeLimiter was imported but never applied here.
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    // Apply rate limit (was missing)
    if (!writeLimiter.check(ip)) {
        return NextResponse.json({ error: 'Too many contributions — please wait a moment.' }, { status: 429 })
    }

    let body: { term?: string; definition?: string; example?: string; honeypot?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { term, definition, example, honeypot } = body

    // Honeypot: bots fill hidden fields, humans don't
    if (honeypot) {
        // Silently accept to not reveal the check
        return NextResponse.json({ id: 'bot', message: 'Contribution submitted for review. Thank you!' })
    }

    if (!term || !definition) {
        return NextResponse.json({ error: 'Term and definition required' }, { status: 400 })
    }

    if (term.trim().length > 100) {
        return NextResponse.json({ error: 'Term too long (max 100 characters).' }, { status: 400 })
    }
    if (definition.trim().length > 1000) {
        return NextResponse.json({ error: 'Definition too long (max 1000 characters).' }, { status: 400 })
    }

    try {
        const contribution = await prisma.contribution.create({
            data: { term: term.trim(), definition: definition.trim(), example: example?.trim(), ip },
        })
        return NextResponse.json({ id: contribution.id, message: 'Contribution submitted for review. Thank you!' })
    } catch (err) {
        console.error('[/api/kb POST]', err)
        return NextResponse.json({ error: 'Failed to submit contribution.' }, { status: 500 })
    }
}
