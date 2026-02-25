'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface SongSummary {
    id: string; title: string; artist: string | null; slug: string
    inputType: string; createdAt: string; overallConfidence: number
    genreConfidence: number; avgRating: number | null; ratingCount: number
}

export default function LibraryPage() {
    const [songs, setSongs] = useState<SongSummary[]>([])
    const [q, setQ] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    const fetchSongs = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page) })
        if (search) params.set('q', search)
        const res = await fetch(`/api/songs?${params}`)
        const data = await res.json()
        setSongs(data.songs || [])
        setTotal(data.total || 0)
        setLoading(false)
    }, [page, search])

    useEffect(() => { fetchSongs() }, [fetchSongs])

    return (
        <main className="max-w-5xl mx-auto px-4 pt-12 pb-24">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Song Library</h1>
                <p className="text-white/40">Every SDK song translated — searchable, rateable, shareable.</p>
            </div>

            {/* Search */}
            <div className="flex gap-3 mb-8">
                <input
                    id="library-search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setSearch(q); setPage(1) } }}
                    placeholder="Search by title or artist…"
                    className="flex-1 bg-ds-surface border border-ds-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors"
                />
                <button id="btn-search" onClick={() => { setSearch(q); setPage(1) }}
                    className="px-5 py-2.5 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors">
                    Search
                </button>
            </div>

            <p className="text-white/30 text-sm mb-4">{total} songs in library</p>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="shimmer h-20 rounded-xl" />
                    ))}
                </div>
            ) : songs.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">🎵</div>
                    <p className="text-white/40">No songs yet. <Link href="/" className="text-ds-accent-light hover:underline">Translate one!</Link></p>
                </div>
            ) : (
                <div className="space-y-3">
                    {songs.map(s => (
                        <Link key={s.id} href={`/song/${s.slug}`}
                            className="ds-card p-4 flex items-center gap-4 hover:border-ds-accent/30 transition-all group block">
                            <div className="w-10 h-10 rounded-lg bg-ds-accent/10 flex items-center justify-center text-lg shrink-0">
                                {s.inputType === 'AUDIO' ? '🎵' : s.inputType === 'YOUTUBE' ? '▶️' : '✍️'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-medium group-hover:text-ds-accent-light transition-colors truncate">{s.title}</div>
                                <div className="text-white/40 text-sm">{s.artist || 'Unknown artist'}</div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {s.avgRating && (
                                    <span className="text-ds-gold text-sm">★ {s.avgRating.toFixed(1)}</span>
                                )}
                                <span className={`text-xs font-mono ${s.overallConfidence >= 0.85 ? 'text-emerald-400' : s.overallConfidence >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {Math.round(s.overallConfidence * 100)}%
                                </span>
                                <span className="text-white/20 text-xs">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {total > 20 && (
                <div className="flex justify-center gap-3 mt-8">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 rounded-lg border border-ds-border text-white/50 disabled:opacity-30 hover:border-ds-accent/30 transition-colors text-sm">
                        ← Prev
                    </button>
                    <span className="px-4 py-2 text-white/30 text-sm">Page {page}</span>
                    <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 rounded-lg border border-ds-border text-white/50 disabled:opacity-30 hover:border-ds-accent/30 transition-colors text-sm">
                        Next →
                    </button>
                </div>
            )}
        </main>
    )
}
