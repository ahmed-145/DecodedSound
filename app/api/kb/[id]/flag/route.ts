import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const { reason } = await req.json()

    if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

    const entry = await prisma.kBEntry.findUnique({ where: { id: params.id } })
    if (!entry) return NextResponse.json({ error: 'Term not found' }, { status: 404 })

    await prisma.flag.create({
        data: { kbEntryId: params.id, reason: reason.trim(), ip },
    })

    return NextResponse.json({ message: 'Flag submitted. Our team will review it.' })
}
