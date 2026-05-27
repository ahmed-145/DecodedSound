import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { termToSlug, siteUrl } from '@/lib/utils'

// Regenerated hourly (matches term-page ISR). Lists every crawlable URL so the
// public slang dictionary + song translations get indexed.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = siteUrl()

    const staticPages: MetadataRoute.Sitemap = [
        { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
        { url: `${base}/kb`, changeFrequency: 'daily', priority: 0.9 },
        { url: `${base}/library`, changeFrequency: 'daily', priority: 0.8 },
    ]

    try {
        const [terms, songs] = await Promise.all([
            prisma.kBEntry.findMany({
                where: { isApproved: true },
                select: { term: true, updatedAt: true },
            }),
            prisma.song.findMany({
                where: { isPublic: true },
                select: { slug: true, createdAt: true },
            }),
        ])

        const termPages: MetadataRoute.Sitemap = terms.map(t => ({
            url: `${base}/kb/${termToSlug(t.term)}`,
            lastModified: t.updatedAt,
            changeFrequency: 'monthly',
            priority: 0.6,
        }))

        const songPages: MetadataRoute.Sitemap = songs.map(s => ({
            url: `${base}/song/${s.slug}`,
            lastModified: s.createdAt,
            changeFrequency: 'monthly',
            priority: 0.5,
        }))

        return [...staticPages, ...termPages, ...songPages]
    } catch {
        // If the DB is unreachable at build/runtime, still serve the static pages.
        return staticPages
    }
}
