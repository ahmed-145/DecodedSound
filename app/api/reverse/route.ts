import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reverseTranslate } from '@/lib/ai'
import { translateLimiter } from '@/lib/rateLimit'

// POST /api/reverse — English → SDK reverse translation
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    if (!translateLimiter.check(ip)) {
        return NextResponse.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 })
    }

    try {
        const { text } = await req.json() as { text: string }

        if (!text || text.trim().length < 5) {
            return NextResponse.json({ error: 'Text too short — give us at least a sentence.' }, { status: 400 })
        }

        if (text.length > 2000) {
            return NextResponse.json({ error: 'Text too long — max 2000 characters for reverse mode.' }, { status: 400 })
        }

        // Fetch KB terms for context
        const kbEntries = await prisma.kBEntry.findMany({
            where: { isApproved: true },
            select: { term: true, definition: true },
            take: 200,
        })
        const kbContext = kbEntries.length > 0
            ? kbEntries.map(e => `${e.term}: ${e.definition}`).join('\n')
            : undefined

        const result = await reverseTranslate(text, kbContext)

        return NextResponse.json({
            sdkOutput: result.sdkOutput,
            termsUsed: result.termsUsed,
            styleNotes: result.styleNotes,
        })
    } catch (err) {
        console.error('[/api/reverse]', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('429') || msg.includes('Too Many Requests')) {
            return NextResponse.json({ error: 'AI rate limit hit — please wait 30 seconds and try again.' }, { status: 429 })
        }
        return NextResponse.json(
            { error: 'Reverse translation failed: ' + (msg.length < 200 ? msg : 'Unknown error.') },
            { status: 500 }
        )
    }
}
