'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface KBEntry {
    id: string; term: string; definition: string; origin: string | null
    example: string | null; confidence: number
}

export default function KBPage() {
    const [entries, setEntries] = useState<KBEntry[]>([])
    const [q, setQ] = useState('')
    const [debouncedQ, setDebouncedQ] = useState('')
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')
    const [contributeOpen, setContributeOpen] = useState(false)
    const [form, setForm] = useState({ term: '', definition: '', example: '' })
    const [submitted, setSubmitted] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [flaggedId, setFlaggedId] = useState<string | null>(null)
    const [flagReason, setFlagReason] = useState('')
    const [flagSubmitting, setFlagSubmitting] = useState(false)

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q), 350)
        return () => clearTimeout(t)
    }, [q])

    const fetchKB = useCallback(async () => {
        setLoading(true)
        setFetchError('')
        try {
            const res = await fetch(`/api/kb${debouncedQ ? `?q=${encodeURIComponent(debouncedQ)}` : ''}`)
            if (!res.ok) throw new Error(`Server error ${res.status}`)
            const data = await res.json()
            setEntries(data.entries || [])
        } catch {
            setFetchError('Could not load the knowledge base. Check your connection.')
        } finally {
            setLoading(false)
        }
    }, [debouncedQ])

    useEffect(() => { fetchKB() }, [fetchKB])

    const handleContribute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.term.trim() || !form.definition.trim()) return
        setSubmitting(true)
        setSubmitError('')
        try {
            const res = await fetch('/api/kb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Submission failed')
            }
            setSubmitted(true)
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Submission failed. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleFlag = async (id: string) => {
        if (!flagReason.trim()) return
        setFlagSubmitting(true)
        try {
            await fetch(`/api/kb/${id}/flag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: flagReason }),
            })
            setFlaggedId(null)
            setFlagReason('')
        } catch {
            // silently fail — non-critical
        } finally {
            setFlagSubmitting(false)
        }
    }

    const closeContribute = () => {
        setContributeOpen(false)
        setSubmitted(false)
        setSubmitError('')
        setForm({ term: '', definition: '', example: '' })
    }

    return (
        <main className="max-w-5xl mx-auto px-4 pt-8 sm:pt-12 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Slang Knowledge Base</h1>
                    <p className="text-white/40 text-sm">
                        {loading ? 'Loading…' : `${entries.length} approved terms · growing with every translation`}
                    </p>
                </div>
                <button
                    id="btn-contribute"
                    onClick={() => setContributeOpen(true)}
                    className="self-start sm:self-auto px-4 py-2 rounded-lg bg-ds-accent/10 border border-ds-accent/30 text-ds-accent-light text-sm hover:bg-ds-accent/20 transition-all whitespace-nowrap"
                >
                    + Contribute term
                </button>
            </div>

            {/* Search */}
            <div className="mb-5 sm:mb-6 relative">
                <input
                    id="kb-search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Search 502 terms…"
                    className="w-full bg-ds-surface border border-ds-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors pr-8"
                />
                {q && (
                    <button
                        onClick={() => setQ('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* States */}
            {fetchError ? (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">⚡</div>
                    <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load the KB</h2>
                    <p className="text-white/40 text-sm mb-6">{fetchError}</p>
                    <button
                        id="btn-retry-kb"
                        onClick={fetchKB}
                        className="px-6 py-2.5 rounded-lg bg-ds-accent/10 border border-ds-accent/30 text-ds-accent-light text-sm hover:bg-ds-accent/20 transition-all"
                    >
                        Try again
                    </button>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-xl" />)}
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📚</div>
                    <h2 className="text-lg font-semibold text-white mb-2">
                        {debouncedQ ? `No results for "${debouncedQ}"` : 'No terms yet'}
                    </h2>
                    <p className="text-white/40 text-sm mb-6">
                        {debouncedQ ? 'Try a different search term.' : 'Help build the dictionary!'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {debouncedQ && (
                            <button onClick={() => setQ('')}
                                className="px-5 py-2.5 rounded-lg border border-ds-border text-white/50 hover:text-white text-sm transition-colors">
                                Clear search
                            </button>
                        )}
                        <button
                            onClick={() => setContributeOpen(true)}
                            className="px-5 py-2.5 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors">
                            Add the first one!
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {entries.map(e => (
                        <div key={e.id} className="ds-card p-4 hover:border-ds-accent/20 transition-colors group">
                            <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-ds-accent-light font-semibold">{e.term}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-mono ${e.confidence >= 0.85 ? 'text-emerald-400' : e.confidence >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {Math.round(e.confidence * 100)}%
                                    </span>
                                    {/* Flag button — visible on hover */}
                                    <button
                                        onClick={() => setFlaggedId(e.id)}
                                        className="text-white/10 hover:text-yellow-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                                        title="Flag inaccuracy"
                                    >
                                        🚩
                                    </button>
                                </div>
                            </div>
                            <p className="text-white/70 text-sm mt-2 leading-relaxed">{e.definition}</p>
                            {e.example && <p className="text-white/30 text-xs mt-2 italic">&ldquo;{e.example}&rdquo;</p>}
                            {e.origin && <p className="text-white/20 text-xs mt-1">Origin: {e.origin}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Flag modal ──────────────────────────────────────────────────── */}
            {flaggedId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="ds-card w-full max-w-sm p-6 animate-fade-up">
                        <h2 className="text-base font-bold text-white mb-1">Flag this term</h2>
                        <p className="text-white/40 text-sm mb-4">Tell us what&apos;s wrong with this definition.</p>
                        <textarea
                            value={flagReason}
                            onChange={e => setFlagReason(e.target.value)}
                            placeholder="e.g. Definition is incorrect, term is offensive..."
                            rows={3}
                            className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => { setFlaggedId(null); setFlagReason('') }}
                                className="flex-1 py-2.5 rounded-lg border border-ds-border text-white/40 hover:text-white text-sm transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => handleFlag(flaggedId)}
                                disabled={!flagReason.trim() || flagSubmitting}
                                className="flex-1 py-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                            >
                                {flagSubmitting ? 'Flagging…' : '🚩 Submit flag'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Contribute modal ─────────────────────────────────────────────── */}
            {contributeOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="ds-card w-full max-w-md p-6 animate-fade-up">
                        <h2 className="text-lg font-bold text-white mb-1">Contribute a term</h2>
                        <p className="text-white/40 text-sm mb-5">Submitted for community review before going live.</p>
                        {submitted ? (
                            <div className="text-center py-6">
                                <div className="text-4xl mb-3">🙏</div>
                                <p className="text-white/70 font-medium">Thanks! Your contribution has been submitted.</p>
                                <p className="text-white/30 text-sm mt-1">Our team will review it within 24–48 hours.</p>
                                <button onClick={closeContribute}
                                    className="mt-4 text-ds-accent-light hover:underline text-sm">
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleContribute} className="space-y-3">
                                <input
                                    id="contrib-term"
                                    required
                                    value={form.term}
                                    onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                                    placeholder="Term (e.g. mandem)"
                                    className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60"
                                />
                                <textarea
                                    id="contrib-def"
                                    required
                                    value={form.definition}
                                    onChange={e => setForm(f => ({ ...f, definition: e.target.value }))}
                                    placeholder="Definition"
                                    rows={3}
                                    className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 resize-none"
                                />
                                <input
                                    id="contrib-example"
                                    value={form.example}
                                    onChange={e => setForm(f => ({ ...f, example: e.target.value }))}
                                    placeholder="Example usage (optional)"
                                    className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60"
                                />

                                {submitError && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        <span>⚠️</span><span>{submitError}</span>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={closeContribute}
                                        className="flex-1 py-2.5 rounded-lg border border-ds-border text-white/40 hover:text-white text-sm transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        id="btn-submit-contrib"
                                        disabled={submitting || !form.term.trim() || !form.definition.trim()}
                                        className="flex-1 py-2.5 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors disabled:opacity-50"
                                    >
                                        {submitting ? 'Submitting…' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </main>
    )
}
