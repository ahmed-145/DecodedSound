'use client'

import { useState, useRef } from 'react'

type Tab = 'typed' | 'audio' | 'youtube'

interface InputTabsProps {
    lyrics: string
    setLyrics: (v: string) => void
    title: string
    setTitle: (v: string) => void
    artist: string
    setArtist: (v: string) => void
    youtubeUrl: string
    setYoutubeUrl: (v: string) => void
    loading: boolean
    error: string
    setError: (v: string) => void
    transcription: string
    onTranslate: (override?: boolean) => void
    onAudioUpload: (file: File) => void
    onYouTubeExtract: () => void
    onClear: () => void
    genreWarning: { message: string; confidence: number } | null
    onGenreOverride: () => void
    onGenreDismiss: () => void
}

export default function InputTabs({
    lyrics, setLyrics, title, setTitle, artist, setArtist,
    youtubeUrl, setYoutubeUrl, loading, error, setError,
    transcription, onTranslate, onAudioUpload, onYouTubeExtract, onClear,
    genreWarning, onGenreOverride, onGenreDismiss,
}: InputTabsProps) {
    const [tab, setTab] = useState<Tab>('typed')
    const [dragOver, setDragOver] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'typed', label: 'Paste Lyrics', icon: '✍️' },
        { id: 'audio', label: 'Upload Audio', icon: '🎵' },
        { id: 'youtube', label: 'YouTube', icon: '▶️' },
    ]

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onAudioUpload(file)
    }

    return (
        <div className="ds-card glow-accent animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {/* Tabs */}
            <div className="flex border-b border-ds-border">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        id={`tab-${t.id}`}
                        onClick={() => { setTab(t.id); setError('') }}
                        className={`flex-1 py-3 sm:py-3.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px flex items-center justify-center gap-1 sm:gap-2
                ${tab === t.id
                                ? 'border-ds-accent text-ds-accent-light bg-ds-accent/5'
                                : 'border-transparent text-white/40 hover:text-white/70'}`}
                    >
                        <span>{t.icon}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                        <span className="sm:hidden">{t.id === 'typed' ? 'Lyrics' : t.id === 'audio' ? 'Audio' : 'YT'}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 sm:p-6 space-y-4">
                {/* Title + Artist row */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 font-mono">Song title (optional)</label>
                        <input
                            id="input-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Bietjie Wyn"
                            className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 font-mono">Artist (optional)</label>
                        <input
                            id="input-artist"
                            value={artist}
                            onChange={e => setArtist(e.target.value)}
                            placeholder="e.g. Dj Buckz"
                            className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors"
                        />
                    </div>
                </div>

                {/* Tab content */}
                {tab === 'typed' && (
                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 font-mono">
                            {transcription ? '✅ Transcribed lyrics — edit if needed' : 'Lyrics'}
                        </label>
                        <textarea
                            id="textarea-lyrics"
                            value={lyrics}
                            onChange={e => setLyrics(e.target.value)}
                            rows={10}
                            placeholder={"Paste your SDK lyrics here…\n\ne.g.\nHy sê hy's a g\nMaar hy's nie 'n real g nie\nHy loop met die mandem\nMaar hy's net 'n spook..."}
                            className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-3 text-sm text-white placeholder-white/15 focus:outline-none focus:border-ds-accent/60 transition-colors resize-none font-mono leading-relaxed"
                        />
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-white/20">{lyrics.split('\n').filter(Boolean).length} lines</span>
                            <span className="text-xs text-white/20">{lyrics.length} chars</span>
                        </div>
                    </div>
                )}

                {tab === 'audio' && (
                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 font-mono">Audio file</label>
                        <div
                            onDrop={handleDrop}
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-colors group
                                ${dragOver ? 'border-ds-accent/70 bg-ds-accent/5' : 'border-ds-border hover:border-ds-accent/40'}`}
                        >
                            <div className="text-3xl sm:text-4xl mb-3">🎵</div>
                            <p className="text-white/50 text-sm group-hover:text-white/70 transition-colors">
                                {dragOver ? 'Drop to upload' : 'Click to select or drag & drop'}
                            </p>
                            <p className="text-white/20 text-xs mt-1">MP3, WAV, M4A · Max 50MB · Groq Whisper</p>
                            <input
                                ref={fileRef}
                                type="file"
                                id="input-audio"
                                accept=".mp3,.wav,.m4a,audio/*"
                                className="hidden"
                                onChange={() => {
                                    const file = fileRef.current?.files?.[0]
                                    if (file) onAudioUpload(file)
                                }}
                            />
                        </div>
                        <button
                            id="btn-transcribe"
                            onClick={() => {
                                const file = fileRef.current?.files?.[0]
                                if (file) onAudioUpload(file)
                                else setError('Select an audio file first.')
                            }}
                            disabled={loading}
                            className="mt-3 w-full py-2.5 rounded-lg border border-ds-accent/30 bg-ds-accent/10 text-ds-accent-light text-sm font-medium hover:bg-ds-accent/20 transition-all disabled:opacity-50"
                        >
                            {loading ? '⏳ Transcribing…' : '🎙️ Transcribe Audio'}
                        </button>
                    </div>
                )}

                {tab === 'youtube' && (
                    <div>
                        <label className="block text-xs text-white/40 mb-1.5 font-mono">YouTube URL</label>
                        <input
                            id="input-youtube"
                            value={youtubeUrl}
                            onChange={e => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-ds-bg border border-ds-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ds-accent/60 transition-colors"
                        />
                        <p className="text-xs text-white/20 mt-1.5">Audio via yt-dlp · Transcribed by Groq Whisper · Cape Flats phonetics</p>
                        <button
                            id="btn-extract"
                            onClick={onYouTubeExtract}
                            disabled={loading || !youtubeUrl.trim()}
                            className="mt-3 w-full py-2.5 rounded-lg border border-ds-accent/30 bg-ds-accent/10 text-ds-accent-light text-sm font-medium hover:bg-ds-accent/20 transition-all disabled:opacity-50"
                        >
                            {loading ? '⏳ Extracting audio…' : '▶️ Extract Lyrics'}
                        </button>
                        {/* YouTube-specific hints */}
                        <div className="mt-3 space-y-1.5 text-xs text-white/25">
                            <p>✓ youtube.com/watch and youtu.be links supported</p>
                            <p>✗ Private or age-restricted videos cannot be processed</p>
                        </div>
                    </div>
                )}

                {/* ── Error display ─────────────────────────────────────────── */}
                {error && (
                    <div
                        id="error-banner"
                        role="alert"
                        className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                        <span className="text-base mt-0.5 shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                            <p>{error}</p>
                            {/* Contextual help links */}
                            {error.includes('rate limit') && (
                                <p className="text-red-400/60 text-xs mt-1">Tip: Rate limits reset every 60 seconds.</p>
                            )}
                            {error.includes('yt-dlp') && (
                                <code className="text-xs text-red-300/70 bg-red-900/20 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    pip3 install yt-dlp
                                </code>
                            )}
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="text-red-400/40 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ── Genre warning ──────────────────────────────────────────── */}
                {genreWarning && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm space-y-3">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">🎵</span>
                            <div>
                                <p className="font-semibold">Doesn&apos;t look like SDK music</p>
                                <p className="text-yellow-400/80 text-xs mt-0.5">
                                     Our AI specialises in SDK / Cape Flats music — this looks like something else.
                                     SDK confidence: {Math.round(genreWarning.confidence * 100)}%.
                                     Translation quality may be lower for non-SDK lyrics.
                                 </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onGenreOverride}
                                className="px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-medium transition-colors">
                                Try anyway
                            </button>
                            <button onClick={onGenreDismiss}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Action buttons (typed tab only) ───────────────────────── */}
                {tab === 'typed' && (
                    <div className="flex gap-3">
                        <button
                            id="btn-clear"
                            onClick={onClear}
                            disabled={loading || (!lyrics.trim() && !title && !artist)}
                            className="px-4 sm:px-6 py-4 rounded-xl text-sm font-medium text-white/50 transition-all
                                border border-ds-border hover:border-white/20 hover:text-white/80
                                disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ✕ Clear
                        </button>
                        <button
                            id="btn-translate"
                            onClick={() => onTranslate()}
                            disabled={loading || !lyrics.trim()}
                            className="flex-1 py-4 rounded-xl text-base font-semibold text-white transition-all
                                bg-gradient-to-r from-ds-accent to-ds-purple
                                hover:from-ds-accent hover:to-ds-accent
                                disabled:opacity-40 disabled:cursor-not-allowed
                                shadow-lg shadow-ds-accent/20 hover:shadow-ds-accent/40"
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Translating via Groq…
                                </span>
                                : '🔊 Translate Lyrics'}
                        </button>
                    </div>
                )}

                {/* Translate button after audio transcription */}
                {tab === 'audio' && lyrics.trim() && (
                    <button
                        id="btn-translate-audio"
                        onClick={() => onTranslate()}
                        disabled={loading}
                        className="w-full py-4 rounded-xl text-base font-semibold text-white transition-all
                            bg-gradient-to-r from-ds-accent to-ds-purple
                            hover:from-ds-accent hover:to-ds-accent
                            disabled:opacity-40 disabled:cursor-not-allowed
                            shadow-lg shadow-ds-accent/20"
                    >
                        {loading ? '⏳ Translating…' : '🔊 Translate Transcription'}
                    </button>
                )}

                {/* Translate button after YouTube extraction */}
                {tab === 'youtube' && lyrics.trim() && (
                    <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-ds-accent/5 border border-ds-accent/15">
                            <p className="text-xs text-white/40 mb-1 font-mono">Transcribed lyrics (review before translating):</p>
                            <p className="text-xs text-white/60 line-clamp-3 font-mono">{lyrics.slice(0, 200)}{lyrics.length > 200 ? '…' : ''}</p>
                        </div>
                        <button
                            id="btn-translate-youtube"
                            onClick={() => onTranslate()}
                            disabled={loading}
                            className="w-full py-4 rounded-xl text-base font-semibold text-white transition-all
                                bg-gradient-to-r from-ds-accent to-ds-purple
                                hover:from-ds-accent hover:to-ds-accent
                                disabled:opacity-40 disabled:cursor-not-allowed
                                shadow-lg shadow-ds-accent/20"
                        >
                            {loading ? '⏳ Translating…' : '🔊 Translate Lyrics'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
