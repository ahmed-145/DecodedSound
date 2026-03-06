'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import InputTabs from '@/components/InputTabs'
import ReverseMode from '@/components/ReverseMode'
import StatsRow from '@/components/StatsRow'

type Mode = 'translate' | 'reverse'

export default function Home() {
    const router = useRouter()
    const [mode, setMode] = useState<Mode>('translate')
    const [lyrics, setLyrics] = useState('')
    const [title, setTitle] = useState('')
    const [artist, setArtist] = useState('')
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [transcription, setTranscription] = useState('')
    const [genreWarning, setGenreWarning] = useState<{ message: string; confidence: number } | null>(null)

    const handleTranslate = async (overrideGenre = false) => {
        if (!lyrics.trim()) return setError('Paste some lyrics first.')
        setLoading(true); setError(''); setGenreWarning(null)
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics, title, artist, overrideGenreWarning: overrideGenre }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            if (data.genreWarning && !overrideGenre) {
                setGenreWarning({ message: data.message, confidence: data.genreConfidence })
                setLoading(false)
                return
            }
            router.push(`/song/${data.slug}`)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong.')
            setLoading(false)
        }
    }

    const handleAudioUpload = async (file: File) => {
        setLoading(true); setError('')
        const form = new FormData()
        form.append('audio', file)
        if (title) form.append('title', title)
        if (artist) form.append('artist', artist)
        try {
            const res = await fetch('/api/audio', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setTranscription(data.transcription)
            setLyrics(data.transcription)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Transcription failed.')
        } finally { setLoading(false) }
    }

    const handleYouTubeExtract = async () => {
        if (!youtubeUrl) return setError('Paste a YouTube URL first.')
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeUrl, title, artist }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setLyrics(data.lyrics)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'YouTube extraction failed.')
        } finally { setLoading(false) }
    }

    return (
        <main className="max-w-4xl mx-auto px-4 pt-16 pb-32">
            {/* Hero */}
            <div className="text-center mb-16 animate-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ds-accent/30 bg-ds-accent/5 text-ds-accent-light text-xs font-mono mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-ds-accent animate-pulse" />
                    SDK / Esdeekid only · v1.0
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4 glow-text">
                    Decoded<span className="gradient-text">Sound</span>
                </h1>
                <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
                    AI-powered translation for <span className="text-white/80">SDK / Esdeekid</span> music
                    from the Cape Flats. Understand the lyrics, slang, and culture.
                </p>
            </div>

            {/* Mode toggle */}
            <div className="flex justify-center mb-8 animate-fade-up">
                <div className="inline-flex rounded-xl border border-ds-border bg-ds-card/50 p-1">
                    <button
                        id="mode-translate"
                        onClick={() => { setMode('translate'); setError('') }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                            ${mode === 'translate'
                                ? 'bg-ds-accent/15 text-ds-accent-light border border-ds-accent/30 shadow-sm'
                                : 'text-white/40 hover:text-white/70'}`}
                    >
                        <span>🔊</span> SDK → English
                    </button>
                    <button
                        id="mode-reverse"
                        onClick={() => { setMode('reverse'); setError('') }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                            ${mode === 'reverse'
                                ? 'bg-ds-purple/15 text-purple-300 border border-ds-purple/30 shadow-sm'
                                : 'text-white/40 hover:text-white/70'}`}
                    >
                        <span>🔄</span> English → SDK
                    </button>
                </div>
            </div>

            {/* Input area — switches based on mode */}
            {mode === 'translate' ? (
                <InputTabs
                    lyrics={lyrics} setLyrics={setLyrics}
                    title={title} setTitle={setTitle}
                    artist={artist} setArtist={setArtist}
                    youtubeUrl={youtubeUrl} setYoutubeUrl={setYoutubeUrl}
                    loading={loading} error={error} setError={setError}
                    transcription={transcription}
                    onTranslate={handleTranslate}
                    onAudioUpload={handleAudioUpload}
                    onYouTubeExtract={handleYouTubeExtract}
                    onClear={() => {
                        setLyrics(''); setTitle(''); setArtist(''); setYoutubeUrl('')
                        setTranscription(''); setError(''); setGenreWarning(null)
                    }}
                    genreWarning={genreWarning}
                    onGenreOverride={() => handleTranslate(true)}
                    onGenreDismiss={() => setGenreWarning(null)}
                />
            ) : (
                <ReverseMode
                    loading={loading}
                    error={error}
                    setError={setError}
                />
            )}

            {/* Stats row */}
            <StatsRow />
        </main>
    )
}
