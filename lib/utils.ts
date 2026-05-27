import { nanoid } from 'nanoid'

export function generateSlug(title: string, artist?: string): string {
    const base = artist ? `${artist}-${title}` : title
    const clean = base
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50)
    return `${clean}-${nanoid(6)}`
}

export function formatConfidence(score: number): string {
    if (score >= 0.85) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
}

export function getConfidenceColor(score: number): string {
    if (score >= 0.85) return 'text-emerald-400'
    if (score >= 0.6) return 'text-amber-400'
    return 'text-red-400'
}

export function truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len) + '…' : str
}

// URL-safe slug for a KB term (e.g. "real g" → "real-g"). Stable, no nanoid —
// the term is already unique, so its slug is its canonical, shareable URL.
export function termToSlug(term: string): string {
    return term
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

// Absolute site origin — needed for sitemap + canonical/OG URLs. Falls back
// through explicit env → Vercel-provided host → localhost for dev.
export function siteUrl(): string {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return 'http://localhost:3000'
}
