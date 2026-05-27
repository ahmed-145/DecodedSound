import type { Metadata } from 'next'
import { siteUrl } from '@/lib/utils'

export const metadata: Metadata = {
    title: 'SDK / Cape Flats Slang Dictionary',
    description:
        'A living dictionary of SDK (Esdeekid) and Cape Flats slang — Kaaps Afrikaans, Xhosa borrowings, Cape Malay vocabulary and street terms, each with plain-English definitions and cultural origin. Hand-curated and growing with every translation.',
    keywords: ['Cape Flats slang', 'Kaaps dictionary', 'SDK slang meaning', 'esdeekid words', 'Cape Town slang', 'Afrikaans street slang'],
    alternates: { canonical: `${siteUrl()}/kb` },
    openGraph: {
        title: 'SDK / Cape Flats Slang Dictionary — DecodedSound',
        description: 'A living, hand-curated dictionary of Cape Flats slang with definitions and cultural origin.',
        type: 'website',
        url: `${siteUrl()}/kb`,
        siteName: 'DecodedSound',
    },
}

export default function KBLayout({ children }: { children: React.ReactNode }) {
    return children
}
