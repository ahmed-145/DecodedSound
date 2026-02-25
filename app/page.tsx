'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'typed' | 'audio' | 'youtube'

export default function Home() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('typed')
  const [lyrics, setLyrics] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcription, setTranscription] = useState('')
  const [audioSongId, setAudioSongId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleTypedTranslate = async () => {
    if (!lyrics.trim()) return setError('Paste some lyrics first.')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics, title, artist }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/song/${data.slug}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  const handleAudioUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return setError('Select an audio file first.')
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
      setAudioSongId(data.songId)
      setLyrics(data.transcription)
      setTab('typed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transcription failed.')
    } finally { setLoading(false) }
  }

  const handleYouTube = async () => {
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
      setTab('typed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'YouTube extraction failed.')
    } finally { setLoading(false) }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'typed', label: 'Paste Lyrics', icon: '✍️' },
    { id: 'audio', label: 'Upload Audio', icon: '🎵' },
    { id: 'youtube', label: 'YouTube Link', icon: '▶️' },
  ]

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

      {/* Input card */}
      <div className="ds-card glow-accent animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {/* Tabs */}
        <div className="flex border-b border-ds-border">
          {tabs.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              onClick={() => { setTab(t.id); setError('') }}
              className={`flex-1 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px flex items-center justify-center gap-2
                ${tab === t.id
                  ? 'border-ds-accent text-ds-accent-light bg-ds-accent/5'
                  : 'border-transparent text-white/40 hover:text-white/70'}`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Title + Artist row */}
          <div className="grid grid-cols-2 gap-3">
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
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-ds-border hover:border-ds-accent/40 rounded-lg p-10 text-center cursor-pointer transition-colors group"
              >
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-white/50 text-sm group-hover:text-white/70 transition-colors">
                  Click to select MP3, WAV, or M4A
                </p>
                <p className="text-white/20 text-xs mt-1">Max 50MB · Transcribed by Groq Whisper</p>
                <input
                  ref={fileRef}
                  type="file"
                  id="input-audio"
                  accept=".mp3,.wav,.m4a,audio/*"
                  className="hidden"
                  onChange={() => { }}
                />
              </div>
              <button
                id="btn-transcribe"
                onClick={handleAudioUpload}
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
              <p className="text-xs text-white/20 mt-1.5">Fetches captions first · yt-dlp fallback</p>
              <button
                id="btn-extract"
                onClick={handleYouTube}
                disabled={loading}
                className="mt-3 w-full py-2.5 rounded-lg border border-ds-accent/30 bg-ds-accent/10 text-ds-accent-light text-sm font-medium hover:bg-ds-accent/20 transition-all disabled:opacity-50"
              >
                {loading ? '⏳ Extracting…' : '▶️ Extract Lyrics'}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Translate button */}
          {tab === 'typed' && (
            <button
              id="btn-translate"
              onClick={handleTypedTranslate}
              disabled={loading || !lyrics.trim()}
              className="w-full py-4 rounded-xl text-base font-semibold text-white transition-all
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
                  Translating via Gemini…
                </span>
                : '🔊 Translate Lyrics'}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        {[
          { label: 'Genre scope', value: 'SDK only' },
          { label: 'AI engine', value: 'Gemini + Groq' },
          { label: 'No account', value: 'Fully open' },
        ].map(s => (
          <div key={s.label} className="ds-card p-4 text-center">
            <div className="text-white font-semibold text-sm">{s.value}</div>
            <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
