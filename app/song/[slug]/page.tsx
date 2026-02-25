'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LineTranslation { original: string; translation: string; flaggedTerms: string[] }
interface UnknownTerm { term: string; provisionalDefinition: string; confidence: number }
interface Translation {
    id: string; plainTranslation: string; lineByLine: LineTranslation[]
    culturalContext: string; unknownTerms: UnknownTerm[]
    genreConfidence: number; overallConfidence: number
}
interface Song {
    id: string; title: string; artist: string | null; slug: string; inputType: string
    rawLyrics: string; createdAt: string; avgRating: number | null; ratingCount: number
    translations: Translation[]
}

function ConfidenceBadge({ score, label }: { score: number; label: string }) {
    const color = score >= 0.85 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
        : score >= 0.6 ? 'text-amber-400 border-amber-400/30 bg-amber-400/5'
            : 'text-red-400 border-red-400/30 bg-red-400/5'
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono ${color}`}>
            {label}: {Math.round(score * 100)}%
        </span>
    )
}

function StarRating({ songId, current, count }: { songId: string; current: number | null; count: number }) {
    const [stars, setStars] = useState(0)
    const [hover, setHover] = useState(0)
    const [submitted, setSubmitted] = useState(false)

    const submit = async (s: number) => {
        setStars(s)
        await fetch('/api/ratings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId, stars: s }),
        })
        setSubmitted(true)
    }

    if (submitted) return <span className="text-ds-gold text-sm">{'★'.repeat(stars)} Thanks!</span>

    return (
        <div className="flex items-center gap-2">
            <div className="flex">
                {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} id={`star-${s}`} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => submit(s)}
                        className={`text-xl transition-colors ${(hover || stars) >= s ? 'text-ds-gold' : 'text-white/20'}`}>★</button>
                ))}
            </div>
            {current && <span className="text-white/30 text-xs">{current.toFixed(1)} ({count})</span>}
        </div>
    )
}

export default function SongPage({ params }: { params: { slug: string } }) {
    const { slug } = params
    const [song, setSong] = useState<Song | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState(0)
    const [copied, setCopied] = useState(false)
    const [flagModal, setFlagModal] = useState<{ open: boolean; termId?: string; term?: string }>({ open: false })
    const [flagReason, setFlagReason] = useState('')

    useEffect(() => {
        fetch(`/api/songs/${slug}`)
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setSong(d) })
            .catch(() => setError('Failed to load song.'))
            .finally(() => setLoading(false))
    }, [slug])

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return (
        <div className="max-w-4xl mx-auto px-4 pt-16">
            <div className="shimmer h-8 w-48 rounded mb-4" />
            <div className="shimmer h-96 rounded-xl" />
        </div>
    )

    if (error || !song) return (
        <div className="max-w-4xl mx-auto px-4 pt-24 text-center">
            <div className="text-6xl mb-4">🔇</div>
            <h2 className="text-xl font-semibold text-white mb-2">Song not found</h2>
            <p className="text-white/40 mb-6">{error}</p>
            <Link href="/" className="text-ds-accent-light hover:underline">← Back to translate</Link>
        </div>
    )

    const t = song.translations[0]
    const panels = [
        { label: 'Plain Translation', icon: '📖', id: 'tab-plain' },
        { label: 'Line by Line', icon: '📝', id: 'tab-linebyline' },
        { label: 'Slang Dictionary', icon: '📚', id: 'tab-slang' },
        { label: 'Cultural Context', icon: '🌍', id: 'tab-cultural' },
    ]

    return (
        <main className="max-w-4xl mx-auto px-4 pt-8 pb-24">
            {/* Header */}
            <div className="mb-8 animate-fade-up">
                <Link href="/" className="text-white/30 text-sm hover:text-white/60 transition-colors mb-4 inline-block">
                    ← New translation
                </Link>
                <h1 className="text-3xl font-bold text-white">{song.title}</h1>
                {song.artist && <p className="text-white/50 mt-1">{song.artist}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                    {t && <>
                        <ConfidenceBadge score={t.overallConfidence} label="Confidence" />
                        <ConfidenceBadge score={t.genreConfidence} label="SDK match" />
                    </>}
                    <span className="text-xs text-white/20 font-mono px-2 py-0.5 rounded border border-white/5">
                        {song.inputType}
                    </span>
                    <button id="btn-share" onClick={copyLink}
                        className="ml-auto text-xs text-white/40 hover:text-ds-accent-light transition-colors flex items-center gap-1">
                        {copied ? '✅ Copied!' : '🔗 Share link'}
                    </button>
                </div>
                <div className="mt-3">
                    <StarRating songId={song.id} current={song.avgRating} count={song.ratingCount} />
                </div>
            </div>

            {/* Panels */}
            {!t ? (
                <div className="ds-card p-8 text-center">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-white/50">Translation is being processed…</p>
                </div>
            ) : (
                <div className="ds-card animate-fade-up">
                    {/* Panel tabs */}
                    <div className="flex border-b border-ds-border overflow-x-auto">
                        {panels.map((p, i) => (
                            <button key={p.id} id={p.id} onClick={() => setActiveTab(i)}
                                className={`flex-1 min-w-fit px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px flex items-center justify-center gap-1.5
                  ${activeTab === i
                                        ? 'border-ds-accent text-ds-accent-light bg-ds-accent/5'
                                        : 'border-transparent text-white/40 hover:text-white/70'}`}>
                                <span>{p.icon}</span>{p.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* Panel 0 — Plain Translation */}
                        {activeTab === 0 && (
                            <div className="prose prose-invert max-w-none">
                                <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-base">{t.plainTranslation}</p>
                            </div>
                        )}

                        {/* Panel 1 — Line by Line */}
                        {activeTab === 1 && (
                            <div className="space-y-3">
                                {(t.lineByLine as LineTranslation[]).map((line, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-4 py-3 border-b border-ds-border/50 last:border-0">
                                        <div className="font-mono text-sm text-white/60 leading-relaxed">
                                            {line.original}
                                            {line.flaggedTerms.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {line.flaggedTerms.map(term => (
                                                        <span key={term} className="text-xs px-1.5 py-0.5 rounded bg-ds-accent/10 text-ds-accent-light border border-ds-accent/20">
                                                            {term}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-white/90 leading-relaxed">{line.translation}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Panel 2 — Slang Dictionary */}
                        {activeTab === 2 && (
                            <div className="space-y-4">
                                {(t.unknownTerms as UnknownTerm[]).length === 0 ? (
                                    <p className="text-white/40 text-center py-4">All terms recognised in KB.</p>
                                ) : (
                                    (t.unknownTerms as UnknownTerm[]).map((term, i) => (
                                        <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-lg bg-ds-bg border border-ds-border">
                                            <div>
                                                <div className="font-mono text-ds-accent-light font-semibold">{term.term}</div>
                                                <div className="text-white/70 text-sm mt-1">{term.provisionalDefinition}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span className={`text-xs font-mono ${term.confidence >= 0.7 ? 'text-emerald-400' : term.confidence >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {Math.round(term.confidence * 100)}% conf
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Panel 3 — Cultural Context */}
                        {activeTab === 3 && (
                            <div>
                                <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-base">{t.culturalContext}</p>
                                <div className="mt-6 p-3 rounded-lg bg-ds-accent/5 border border-ds-accent/15">
                                    <p className="text-xs text-white/30">
                                        🤖 AI-generated cultural context · Always verify with the community ·{' '}
                                        <Link href="/kb" className="text-ds-accent-light hover:underline">Browse Slang KB</Link>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    )
}
