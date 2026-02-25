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
