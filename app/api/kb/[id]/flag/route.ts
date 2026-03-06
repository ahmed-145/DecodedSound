import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const { reason } = await req.json()

    if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

    const entry = await prisma.kBEntry.findUnique({ where: { id } })
    if (!entry) return NextResponse.json({ error: 'Term not found' }, { status: 404 })

    await prisma.flag.create({
        data: { kbEntryId: id, reason: reason.trim(), ip },
    })

    // PRD US-12: 3+ flags auto-downgrade entry to Unverified
    const flagCount = await prisma.flag.count({ where: { kbEntryId: id } })
    if (flagCount >= 3 && entry.isApproved) {
        await prisma.kBEntry.update({
            where: { id },
            data: { isApproved: false },
        })
        return NextResponse.json({ message: 'Flag submitted. Entry has been auto-downgraded pending review.' })
    }

    return NextResponse.json({ message: 'Flag submitted. Our team will review it.' })
}
