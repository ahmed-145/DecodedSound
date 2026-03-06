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
    const [loading, setLoading] = useState(true)
    const [contributeOpen, setContributeOpen] = useState(false)
    const [form, setForm] = useState({ term: '', definition: '', example: '' })
    const [submitted, setSubmitted] = useState(false)

    const fetchKB = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/kb${q ? `?q=${encodeURIComponent(q)}` : ''}`)
        const data = await res.json()
        setEntries(data.entries || [])
        setLoading(false)
    }, [q])

    useEffect(() => { fetchKB() }, [fetchKB])

    const handleContribute = async (e: React.FormEvent) => {
        e.preventDefault()
        await fetch('/api/kb', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        setSubmitted(true)
    }

    return (
        <main className="max-w-5xl mx-auto px-4 pt-12 pb-24">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Slang Knowledge Base</h1>
                    <p className="text-white/40">{entries.length} approved terms · growing with every translation</p>
                </div>
                <button id="btn-contribute" onClick={() => setContributeOpen(true)}
                    className="px-4 py-2 rounded-lg bg-ds-accent/10 border border-ds-accent/30 text-ds-accent-light text-sm hover:bg-ds-accent/20 transition-all">
                    + Contribute term
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input id="kb-search" value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Search terms…"
                    className="w-full bg-ds-surface border border-ds-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors" />
            </div>

            {loading ? (
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-xl" />)}
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📚</div>
                    <p className="text-white/40">No terms yet. <button onClick={() => setContributeOpen(true)} className="text-ds-accent-light hover:underline">Add the first one!</button></p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {entries.map(e => (
                        <div key={e.id} className="ds-card p-4 hover:border-ds-accent/20 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-ds-accent-light font-semibold">{e.term}</span>
                                <span className={`text-xs font-mono shrink-0 ${e.confidence >= 0.85 ? 'text-emerald-400' : e.confidence >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {Math.round(e.confidence * 100)}%
                                </span>
                            </div>
                            <p className="text-white/70 text-sm mt-2 leading-relaxed">{e.definition}</p>
                            {e.example && <p className="text-white/30 text-xs mt-2 italic">&ldquo;{e.example}&rdquo;</p>}
                            {e.origin && <p className="text-white/20 text-xs mt-1">Origin: {e.origin}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Contribute modal */}
            {contributeOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="ds-card w-full max-w-md p-6 animate-fade-up">
                        <h2 className="text-lg font-bold text-white mb-1">Contribute a term</h2>
                        <p className="text-white/40 text-sm mb-5">Submitted for community review before going live.</p>
                        {submitted ? (
                            <div className="text-center py-6">
                                <div className="text-4xl mb-3">🙏</div>
                                <p className="text-white/70">Thanks! Your contribution has been submitted.</p>
                                <button onClick={() => { setContributeOpen(false); setSubmitted(false); setForm({ term: '', definition: '', example: '' }) }}
                                    className="mt-4 text-ds-accent-light hover:underline text-sm">Close</button>
                            </div>
                        ) : (
                            <form onSubmit={handleContribute} className="space-y-3">
                                <input id="contrib-term" required value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                                    placeholder="Term (e.g. mandem)" className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60" />
                                <textarea id="contrib-def" required value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))}
                                    placeholder="Definition" rows={3} className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 resize-none" />
                                <input id="contrib-example" value={form.example} onChange={e => setForm(f => ({ ...f, example: e.target.value }))}
                                    placeholder="Example usage (optional)" className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60" />
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setContributeOpen(false)}
                                        className="flex-1 py-2.5 rounded-lg border border-ds-border text-white/40 hover:text-white text-sm transition-colors">Cancel</button>
                                    <button type="submit" id="btn-submit-contrib"
                                        className="flex-1 py-2.5 rounded-lg bg-ds-accent text-white text-sm font-medium hover:bg-ds-purple transition-colors">Submit</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </main>
    )
}
