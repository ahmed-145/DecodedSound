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
    const [fetchError, setFetchError] = useState('')

    const fetchSongs = useCallback(async () => {
        setLoading(true)
        setFetchError('')
        try {
            const params = new URLSearchParams({ page: String(page) })
            if (search) params.set('q', search)
            const res = await fetch(`/api/songs?${params}`)
            if (!res.ok) throw new Error(`Server error ${res.status}`)
            const data = await res.json()
            setSongs(data.songs || [])
            setTotal(data.total || 0)
        } catch {
            setFetchError('Could not load the library. Check your connection and refresh.')
            setSongs([])
        } finally {
            setLoading(false)
        }
    }, [page, search])

    useEffect(() => { fetchSongs() }, [fetchSongs])

    const inputTypeIcon = (t: string) =>
        t === 'AUDIO' ? '🎵' : t === 'YOUTUBE' ? '▶️' : '✍️'

    const confidenceColor = (c: number) =>
        c >= 0.85 ? 'text-emerald-400' : c >= 0.6 ? 'text-amber-400' : 'text-red-400'

    return (
        <main className="max-w-5xl mx-auto px-4 pt-8 sm:pt-12 pb-24">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Song Library</h1>
                <p className="text-white/40 text-sm sm:text-base">Every SDK song translated — searchable, rateable, shareable.</p>
            </div>

            {/* Search */}
            <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8">
                <input
                    id="library-search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setSearch(q); setPage(1) } }}
                    placeholder="Search by title or artist…"
                    className="flex-1 bg-ds-surface border border-ds-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors"
                />
                <button id="btn-search" onClick={() => { setSearch(q); setPage(1) }}
                    className="px-4 sm:px-5 py-2.5 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors shrink-0">
                    Search
                </button>
                {search && (
                    <button onClick={() => { setQ(''); setSearch(''); setPage(1) }}
                        className="px-3 py-2.5 rounded-lg border border-ds-border text-white/40 hover:text-white text-sm transition-colors shrink-0">
                        ✕
                    </button>
                )}
            </div>

            {/* Status line */}
            {!loading && !fetchError && (
                <p className="text-white/30 text-xs sm:text-sm mb-4">
                    {search
                        ? `${total} result${total !== 1 ? 's' : ''} for "${search}"`
                        : `${total} song${total !== 1 ? 's' : ''} in library`}
                </p>
            )}

            {/* States */}
            {fetchError ? (
                /* ── Fetch error state ── */
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">⚡</div>
                    <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load the library</h2>
                    <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">{fetchError}</p>
                    <button
                        id="btn-retry-library"
                        onClick={fetchSongs}
                        className="px-6 py-2.5 rounded-lg bg-ds-accent/10 border border-ds-accent/30 text-ds-accent-light text-sm hover:bg-ds-accent/20 transition-all"
                    >
                        Try again
                    </button>
                </div>
            ) : loading ? (
                /* ── Loading skeleton ── */
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="shimmer h-20 rounded-xl" />
                    ))}
                </div>
            ) : songs.length === 0 ? (
                /* ── Empty state ── */
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">🎵</div>
                    <h2 className="text-lg font-semibold text-white mb-2">
                        {search ? 'No songs match that search' : 'Library is empty'}
                    </h2>
                    <p className="text-white/40 text-sm mb-6">
                        {search
                            ? `No results for "${search}". Try a different title or artist.`
                            : 'Be the first to translate an SDK song!'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {search && (
                            <button onClick={() => { setQ(''); setSearch(''); setPage(1) }}
                                className="px-5 py-2.5 rounded-lg border border-ds-border text-white/50 hover:text-white text-sm transition-colors">
                                Clear search
                            </button>
                        )}
                        <Link href="/"
                            className="px-5 py-2.5 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors">
                            Translate a song →
                        </Link>
                    </div>
                </div>
            ) : (
                /* ── Song list ── */
                <div className="space-y-2 sm:space-y-3">
                    {songs.map(s => (
                        <Link key={s.id} href={`/song/${s.slug}`}
                            className="ds-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:border-ds-accent/30 transition-all group block">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-ds-accent/10 flex items-center justify-center text-base sm:text-lg shrink-0">
                                {inputTypeIcon(s.inputType)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-medium group-hover:text-ds-accent-light transition-colors truncate text-sm sm:text-base">
                                    {s.title}
                                </div>
                                <div className="text-white/40 text-xs sm:text-sm">{s.artist || 'Unknown artist'}</div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {s.avgRating && (
                                    <span className="text-ds-gold text-xs sm:text-sm">★ {s.avgRating.toFixed(1)}</span>
                                )}
                                <span className={`text-xs font-mono ${confidenceColor(s.overallConfidence)}`}>
                                    {Math.round(s.overallConfidence * 100)}%
                                </span>
                                <span className="text-white/20 text-xs hidden sm:inline">→</span>
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
                    <span className="px-4 py-2 text-white/30 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
                    <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 rounded-lg border border-ds-border text-white/50 disabled:opacity-30 hover:border-ds-accent/30 transition-colors text-sm">
                        Next →
                    </button>
                </div>
            )}
        </main>
    )
}
