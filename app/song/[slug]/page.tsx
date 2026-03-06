import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import SongPageClient from './SongPageClient'

interface Props {
    params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = params

    try {
        const song = await prisma.song.findUnique({
            where: { slug },
            select: { title: true, artist: true, rawLyrics: true },
        })

        if (!song) {
            return { title: 'Song Not Found' }
        }

        const artistLine = song.artist ? ` by ${song.artist}` : ''
        const preview = song.rawLyrics.slice(0, 120).replace(/\n/g, ' ') + '…'

        return {
            title: `${song.title}${artistLine} — Translated`,
            description: `SDK → English translation of "${song.title}"${artistLine}. ${preview}`,
            openGraph: {
                title: `${song.title}${artistLine} — Decoded`,
                description: `AI-translated SDK lyrics: ${preview}`,
                type: 'article',
                siteName: 'DecodedSound',
            },
            twitter: {
                card: 'summary',
                title: `${song.title}${artistLine} — DecodedSound`,
                description: `SDK → English translation. ${preview}`,
            },
        }
    } catch {
        return { title: 'DecodedSound' }
    }
}

export default function SongPage({ params }: Props) {
    return <SongPageClient slug={params.slug} />
}
