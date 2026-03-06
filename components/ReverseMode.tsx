'use client'

import { useState } from 'react'

interface ReverseModeProps {
    loading: boolean
    error: string
    setError: (v: string) => void
}

export default function ReverseMode({ loading: parentLoading, error, setError }: ReverseModeProps) {
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        sdkOutput: string
        termsUsed: string[]
        styleNotes: string
    } | null>(null)

    const handleReverse = async () => {
        if (!text.trim() || text.trim().length < 5) return setError('Type at least a sentence.')
        setLoading(true); setError(''); setResult(null)
        try {
            const res = await fetch('/api/reverse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setResult(data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Reverse translation failed.')
        } finally { setLoading(false) }
    }

    const isLoading = loading || parentLoading

    return (
        <div className="ds-card glow-accent animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-mono">
                        Type in English — get SDK back
                    </label>
                    <textarea
                        id="textarea-reverse"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={6}
                        placeholder={"Type something in plain English…\n\ne.g.\nHe talks tough but he's not about that life.\nHe walks with the crew but he's invisible."}
                        className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-3 text-sm text-white placeholder-white/15 focus:outline-none focus:border-ds-accent/60 transition-colors resize-none font-mono leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-white/20">{text.length} / 2000 chars</span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <span>⚠️</span><span>{error}</span>
                    </div>
                )}

                <button
                    id="btn-reverse"
                    onClick={handleReverse}
                    disabled={isLoading || !text.trim()}
                    className="w-full py-4 rounded-xl text-base font-semibold text-white transition-all
                        bg-gradient-to-r from-ds-purple to-ds-accent
                        hover:from-ds-purple hover:to-ds-purple
                        disabled:opacity-40 disabled:cursor-not-allowed
                        shadow-lg shadow-ds-purple/20 hover:shadow-ds-purple/40"
                >
                    {isLoading
                        ? <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Flipping to SDK…
                        </span>
                        : '🔄 Flip to SDK'}
                </button>

                {/* Result */}
                {result && (
                    <div className="space-y-4 pt-2 animate-fade-up">
                        {/* SDK output */}
                        <div className="p-5 rounded-xl bg-ds-accent/5 border border-ds-accent/20">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">🔊</span>
                                <span className="text-xs font-mono text-ds-accent-light">SDK Output</span>
                            </div>
                            <p className="text-white/90 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                                {result.sdkOutput}
                            </p>
                        </div>

                        {/* Terms used */}
                        {result.termsUsed.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-white/30">KB terms used:</span>
                                {result.termsUsed.map(term => (
                                    <span key={term} className="text-xs px-2 py-0.5 rounded-full bg-ds-accent/10 text-ds-accent-light border border-ds-accent/20">
                                        {term}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Style notes */}
                        <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                            <p className="text-xs text-white/30">
                                🤖 {result.styleNotes}
                            </p>
                        </div>

                        {/* Copy button */}
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(result.sdkOutput)
                                const btn = document.getElementById('btn-copy-reverse')
                                if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy SDK text', 2000) }
                            }}
                            id="btn-copy-reverse"
                            className="text-xs text-white/40 hover:text-ds-accent-light transition-colors"
                        >
                            📋 Copy SDK text
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
