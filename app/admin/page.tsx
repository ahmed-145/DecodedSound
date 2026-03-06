'use client'

import { useEffect, useState, useCallback } from 'react'

interface Stats {
    totalSongs: number; totalTranslations: number; totalKB: number
    pendingCandidates: number; pendingFlags: number
}
interface Candidate {
    id: string; term: string; provisionalDefinition: string; confidence: number
    sourceSongId: string | null; createdAt: string
}
interface Flag {
    id: string; reason: string; createdAt: string
    kbEntryId: string; kbEntry?: { term: string }
}
interface RecentSong {
    id: string; title: string; artist: string | null; slug: string
    inputType: string; createdAt: string
}

export default function AdminPage() {
    const [authed, setAuthed] = useState(false)
    const [secret, setSecret] = useState('')
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<Stats & { totalFlags: number } | null>(null)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [flags, setFlags] = useState<Flag[]>([])
    const [recentSongs, setRecentSongs] = useState<RecentSong[]>([])
    const [message, setMessage] = useState('')

    const headers = useCallback(() => ({
        'Content-Type': 'application/json',
        'x-admin-secret': secret,
    }), [secret])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin', { headers: { 'x-admin-secret': secret } })
            if (!res.ok) throw new Error('Unauthorized')
            const data = await res.json()
            setStats(data.stats)
            setCandidates(data.candidates)
            setFlags(data.flags)
            setRecentSongs(data.recentSongs)
            setAuthed(true)
        } catch {
            setMessage('Invalid admin secret.')
        } finally { setLoading(false) }
    }, [secret])

    useEffect(() => {
        // Auto-login in dev (no ADMIN_SECRET set)
        fetch('/api/admin').then(r => {
            if (r.ok) {
                r.json().then(data => {
                    setStats(data.stats)
                    setCandidates(data.candidates)
                    setFlags(data.flags)
                    setRecentSongs(data.recentSongs)
                    setAuthed(true)
                })
            }
        })
    }, [])

    const doAction = async (action: string, id: string) => {
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ action, id }),
        })
        const data = await res.json()
        setMessage(data.message || data.error)
        fetchData() // refresh
    }

    if (!authed) {
        return (
            <main className="max-w-md mx-auto px-4 pt-24">
                <div className="ds-card p-8">
                    <h1 className="text-xl font-bold text-white mb-4">🔐 Admin Login</h1>
                    <input
                        type="password"
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        placeholder="Enter admin secret..."
                        className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 mb-3"
                    />
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-ds-accent/20 text-ds-accent-light font-medium text-sm hover:bg-ds-accent/30 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Checking…' : 'Enter'}
                    </button>
                    {message && <p className="text-red-400 text-xs mt-2">{message}</p>}
                </div>
            </main>
        )
    }

    return (
        <main className="max-w-6xl mx-auto px-4 pt-8 pb-24">
            <h1 className="text-2xl font-bold text-white mb-6">🛡️ Admin Dashboard</h1>

            {message && (
                <div className="mb-4 p-3 rounded-lg bg-ds-accent/10 border border-ds-accent/20 text-ds-accent-light text-sm">
                    {message}
                </div>
            )}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {[
                        { label: 'Songs', value: stats.totalSongs, icon: '🎵' },
                        { label: 'Translations', value: stats.totalTranslations, icon: '📖' },
                        { label: 'KB Terms', value: stats.totalKB, icon: '📚' },
                        { label: 'Pending KB', value: stats.pendingCandidates, icon: '⏳', highlight: stats.pendingCandidates > 0 },
                        { label: 'Flags', value: stats.totalFlags, icon: '🚩', highlight: stats.totalFlags > 0 },
                    ].map(s => (
                        <div key={s.label} className={`ds-card p-4 text-center ${s.highlight ? 'border-yellow-500/30' : ''}`}>
                            <div className="text-2xl mb-1">{s.icon}</div>
                            <div className="text-2xl font-bold text-white">{s.value}</div>
                            <div className="text-xs text-white/40">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Pending KB Candidates */}
                <div className="ds-card">
                    <div className="p-4 border-b border-ds-border">
                        <h2 className="text-lg font-semibold text-white">⏳ Pending KB Candidates ({candidates.length})</h2>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {candidates.length === 0 ? (
                            <p className="p-4 text-white/30 text-sm">No pending candidates.</p>
                        ) : candidates.map(c => (
                            <div key={c.id} className="p-4 border-b border-ds-border/50 last:border-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="font-mono text-ds-accent-light font-semibold">{c.term}</span>
                                        <span className="text-xs text-white/20 ml-2">{Math.round(c.confidence * 100)}%</span>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            onClick={() => doAction('approve_candidate', c.id)}
                                            className="px-2.5 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                        >✓ Approve</button>
                                        <button
                                            onClick={() => doAction('reject_candidate', c.id)}
                                            className="px-2.5 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                        >✗ Reject</button>
                                    </div>
                                </div>
                                <p className="text-white/60 text-sm mt-1">{c.provisionalDefinition}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Open Flags */}
                <div className="ds-card">
                    <div className="p-4 border-b border-ds-border">
                        <h2 className="text-lg font-semibold text-white">🚩 Open Flags ({flags.length})</h2>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {flags.length === 0 ? (
                            <p className="p-4 text-white/30 text-sm">No open flags.</p>
                        ) : flags.map(f => (
                            <div key={f.id} className="p-4 border-b border-ds-border/50 last:border-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-white/70 text-sm">{f.reason}</p>
                                        <p className="text-white/20 text-xs mt-1">
                                            {new Date(f.createdAt).toLocaleDateString()}
                                            {f.kbEntry?.term && <> · <span className="text-ds-accent-light">{f.kbEntry.term}</span></>}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => doAction('delete_flag', f.id)}
                                        className="px-2.5 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors shrink-0"
                                    >✗ Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Songs */}
            <div className="ds-card mt-6">
                <div className="p-4 border-b border-ds-border">
                    <h2 className="text-lg font-semibold text-white">🎵 Recent Songs</h2>
                </div>
                <div className="divide-y divide-ds-border/50">
                    {recentSongs.map(s => (
                        <a key={s.id} href={`/song/${s.slug}`} className="flex items-center justify-between p-4 hover:bg-white/2 transition-colors">
                            <div>
                                <span className="text-white font-medium">{s.title}</span>
                                {s.artist && <span className="text-white/40 text-sm ml-2">{s.artist}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-white/20 font-mono">{s.inputType}</span>
                                <span className="text-xs text-white/20">{new Date(s.createdAt).toLocaleDateString()}</span>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </main>
    )
}
