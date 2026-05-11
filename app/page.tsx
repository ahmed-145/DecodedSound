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

    // Classify server error into a user-friendly message
    const classifyError = (msg: string): string => {
        if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many'))
            return 'Rate limit hit — please wait 30 seconds and try again. (Groq free tier: 10 translations/min)'
        if (msg.includes('model unavailable') || msg.includes('404') || msg.includes('AI model'))
            return 'AI model is temporarily unavailable. Try again in a few seconds.'
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('daily quota'))
            return 'Daily AI quota reached. Try again tomorrow or contact us.'
        if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch'))
            return 'Network error — check your connection and try again.'
        return msg || 'Something went wrong. Please try again.'
    }

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
            if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
            if (data.genreWarning && !overrideGenre) {
                setGenreWarning({ message: data.message, confidence: data.genreConfidence })
                setLoading(false)
                return
            }
            router.push(`/song/${data.slug}`)
        } catch (e: unknown) {
            const raw = e instanceof Error ? e.message : 'Something went wrong.'
            setError(classifyError(raw))
            setLoading(false)
        }
    }

    const handleAudioUpload = async (file: File) => {
        // File size guard (50MB)
        if (file.size > 52_428_800) {
            return setError('File too large — max 50MB. Try compressing the audio first.')
        }
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a']
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|webm)$/i)) {
            return setError('Unsupported file type. Please upload MP3, WAV, or M4A.')
        }

        setLoading(true); setError('')
        const form = new FormData()
        form.append('audio', file)
        if (title) form.append('title', title)
        if (artist) form.append('artist', artist)
        try {
            const res = await fetch('/api/audio', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)
            setTranscription(data.transcription)
            setLyrics(data.transcription)
        } catch (e: unknown) {
            const raw = e instanceof Error ? e.message : 'Transcription failed.'
            setError(classifyError(raw))
        } finally { setLoading(false) }
    }

    const handleYouTubeExtract = async () => {
        if (!youtubeUrl) return setError('Paste a YouTube URL first.')
        if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
            return setError('Please paste a valid YouTube URL (youtube.com or youtu.be).')
        }
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeUrl, title, artist }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Extraction failed (${res.status})`)
            if (data.cached) {
                // BUG-11 fix: cached hit must redirect — spinner stays on forever without this
                router.push(`/song/${data.slug}`)
                return
            }
            setLyrics(data.lyrics)
        } catch (e: unknown) {
            const raw = e instanceof Error ? e.message : 'YouTube extraction failed.'
            if (raw.toLowerCase().includes('private') || raw.toLowerCase().includes('unavailable'))
                setError('This video is private or unavailable. Try a public YouTube link.')
            else if (raw.toLowerCase().includes('yt-dlp'))
                setError('yt-dlp not installed on server. Run: pip3 install yt-dlp')
            else
                setError(classifyError(raw))
        } finally { setLoading(false) }
    }

    return (
        <main className="max-w-4xl mx-auto px-4 pt-10 sm:pt-16 pb-24 sm:pb-32">
            {/* Hero */}
            <div className="text-center mb-10 sm:mb-16 animate-fade-up">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ds-accent/30 bg-ds-accent/5 text-ds-accent-light text-xs font-mono mb-5 sm:mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-ds-accent animate-pulse" />
                    SDK / Esdeekid only · v1.0
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-4 glow-text">
                    Decoded<span className="gradient-text">Sound</span>
                </h1>
                <p className="text-base sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed px-2">
                    AI-powered translation for <span className="text-white/80">SDK / Esdeekid</span> music
                    from the Cape Flats. Understand the lyrics, slang, and culture.
                </p>
            </div>

            {/* Mode toggle */}
            <div className="flex justify-center mb-6 sm:mb-8 animate-fade-up">
                <div className="inline-flex rounded-xl border border-ds-border bg-ds-card/50 p-1 w-full max-w-xs sm:max-w-none sm:w-auto">
                    <button
                        id="mode-translate"
                        onClick={() => { setMode('translate'); setError('') }}
                        className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${mode === 'translate'
                                ? 'bg-ds-accent/15 text-ds-accent-light border border-ds-accent/30 shadow-sm'
                                : 'text-white/40 hover:text-white/70'}`}
                    >
                        <span>🔊</span> SDK → English
                    </button>
                    <button
                        id="mode-reverse"
                        onClick={() => { setMode('reverse'); setError('') }}
                        className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
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
