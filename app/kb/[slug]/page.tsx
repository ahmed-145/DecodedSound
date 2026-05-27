import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { termToSlug, siteUrl } from '@/lib/utils'

interface Props {
    params: Promise<{ slug: string }>
}

// ISR: term pages are cached and re-rendered hourly. Keeps them static-fast and
// crawlable while still picking up newly-approved terms without a redeploy.
export const revalidate = 3600

// Cached per-request so generateMetadata + the page share one DB lookup.
const getEntryBySlug = cache(async (slug: string) => {
    // Fast path: most slugs are just the term with spaces → hyphens.
    const guess = slug.replace(/-/g, ' ')
    const direct = await prisma.kBEntry.findFirst({
        where: { isApproved: true, term: { equals: guess, mode: 'insensitive' } },
    })
    if (direct) return direct

    // Fallback: punctuation/multi-word terms — match against the computed slug.
    const all = await prisma.kBEntry.findMany({ where: { isApproved: true } })
    return all.find(e => termToSlug(e.term) === slug) ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const entry = await getEntryBySlug(slug)

    if (!entry) return { title: 'Term not found' }

    const def = entry.definition.length > 155
        ? entry.definition.slice(0, 152) + '…'
        : entry.definition
    const url = `${siteUrl()}/kb/${termToSlug(entry.term)}`

    return {
        title: `${entry.term} — meaning in SDK / Cape Flats slang`,
        description: `"${entry.term}" means: ${def}`,
        alternates: { canonical: url },
        openGraph: {
            title: `${entry.term} — Cape Flats slang, decoded`,
            description: def,
            type: 'article',
            url,
            siteName: 'DecodedSound',
        },
        twitter: {
            card: 'summary',
            title: `${entry.term} — SDK slang meaning`,
            description: def,
        },
    }
}

export default async function KBTermPage({ params }: Props) {
    const { slug } = await params
    const entry = await getEntryBySlug(slug)
    if (!entry) notFound()

    // A handful of sibling terms (same first letter) for internal linking + crawl depth.
    const firstChar = entry.term[0]?.toLowerCase() ?? ''
    const related = (await prisma.kBEntry.findMany({
        where: {
            isApproved: true,
            term: { startsWith: firstChar, mode: 'insensitive' },
            NOT: { id: entry.id },
        },
        orderBy: { term: 'asc' },
        take: 6,
    }))

    const confPct = Math.round(entry.confidence * 100)
    const confColor = entry.confidence >= 0.85 ? 'text-emerald-400'
        : entry.confidence >= 0.6 ? 'text-amber-400' : 'text-red-400'

    // Schema.org DefinedTerm — lets Google show this as a dictionary entry.
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: entry.term,
        description: entry.definition,
        inDefinedTermSet: {
            '@type': 'DefinedTermSet',
            name: 'DecodedSound — SDK / Cape Flats Slang Dictionary',
            url: `${siteUrl()}/kb`,
        },
        url: `${siteUrl()}/kb/${termToSlug(entry.term)}`,
    }

    return (
        <main className="max-w-2xl mx-auto px-4 pt-8 sm:pt-12 pb-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <Link href="/kb" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                ← Slang dictionary
            </Link>

            <article className="ds-card p-6 sm:p-8 mt-4">
                <div className="flex items-start justify-between gap-3">
                    <h1 className="font-mono text-2xl sm:text-3xl font-bold text-ds-accent-light break-words">
                        {entry.term}
                    </h1>
                    <span className={`text-sm font-mono shrink-0 ${confColor}`} title="Definition confidence">
                        {confPct}%
                    </span>
                </div>

                <p className="text-white/80 text-base sm:text-lg mt-4 leading-relaxed">
                    {entry.definition}
                </p>

                {entry.example && (
                    <blockquote className="border-l-2 border-ds-accent/40 pl-4 mt-5 text-white/50 italic">
                        &ldquo;{entry.example}&rdquo;
                    </blockquote>
                )}

                {entry.origin && (
                    <p className="text-white/30 text-sm mt-5">
                        <span className="text-white/40">Origin:</span> {entry.origin}
                    </p>
                )}

                <div className="mt-7 pt-5 border-t border-ds-border flex flex-wrap gap-3">
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors"
                    >
                        Translate a song with this slang →
                    </Link>
                </div>
            </article>

            {related.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-white/50 text-sm font-semibold mb-3">
                        More terms starting with &ldquo;{firstChar.toUpperCase()}&rdquo;
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {related.map(r => (
                            <Link
                                key={r.id}
                                href={`/kb/${termToSlug(r.term)}`}
                                className="px-3 py-1.5 rounded-lg bg-ds-surface border border-ds-border text-white/60 hover:text-ds-accent-light hover:border-ds-accent/30 text-sm font-mono transition-colors"
                            >
                                {r.term}
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </main>
    )
}
