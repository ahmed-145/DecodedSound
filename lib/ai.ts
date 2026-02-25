// AI abstraction layer — swap engines with zero effort
// Primary: Gemini (translation, cultural context)
// Secondary: Groq (transcription via Whisper, fast tasks)

import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq, { toFile } from 'groq-sdk'
import type { Uploadable } from 'groq-sdk/uploads'

// ── Clients ──────────────────────────────────────────────────────────────────
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LineTranslation {
    original: string
    translation: string
    flaggedTerms: string[]
}

export interface UnknownTerm {
    term: string
    provisionalDefinition: string
    confidence: number
}

export interface TranslationResult {
    plainTranslation: string
    lineByLine: LineTranslation[]
    culturalContext: string
    unknownTerms: UnknownTerm[]
    genreConfidence: number
    overallConfidence: number
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are DecodedSound, a cultural translation engine specialised in SDK (Esdeekid) music from the Cape Flats, South Africa. You have deep knowledge of Cape Flats Afrikaans dialect, phonetic wordplay, Kaaps slang, Xhosa borrowings, and the cultural references of this genre.

IMPORTANT: YouTube auto-captions of SDK music are often in broken English (auto-translated from Afrikaans). Even if the lyrics look like English, still recognise them as SDK lyrics and apply full cultural translation.

You will receive raw song lyrics and optionally a KB context block of known terms.

YOU MUST ALWAYS respond with a single valid JSON object. NEVER write plain text, explanations, or markdown. Even if you are uncertain, fill every JSON key with your best attempt.

The JSON object must have EXACTLY these keys:
{
  "plainTranslation": string,        // full song in plain English, natural prose
  "lineByLine": [                    // one object per lyric line (skip blank lines)
    {
      "original": string,
      "translation": string,
      "flaggedTerms": string[]       // slang/unknown terms found in this line
    }
  ],
  "culturalContext": string,         // 2-4 paragraph narrative for someone with zero SDK knowledge
  "unknownTerms": [                  // slang/terms not in the KB context
    {
      "term": string,
      "provisionalDefinition": string,
      "confidence": number           // 0.0 - 1.0
    }
  ],
  "genreConfidence": number,         // 0.0 - 1.0 how confident this is SDK/Cape Flats music
  "overallConfidence": number        // 0.0 - 1.0 overall translation quality
}

Rules:
- ALWAYS return JSON. Never return plain text or explanations of any kind.
- Never hallucinate definitions. Include uncertain terms in unknownTerms with low confidence.
- Output strict JSON only. No markdown fences, no preamble, no trailing text.
- If genreConfidence is low (English-looking lyrics), still complete all fields.`

// ── Translation via Groq LLaMA 3.3 70B ───────────────────────────────────────
// Using Groq instead of Gemini: 14,400 req/day free at 6,000 RPM vs Gemini's
// ~1,500 req/day at 15 RPM. LLaMA 3.3 70B is excellent at JSON instruction-following.
export async function translateLyrics(
    lyrics: string,
    kbContext?: string
): Promise<TranslationResult> {
    const userMessage = kbContext
        ? `KB CONTEXT:\n${kbContext}\n\nLYRICS:\n${lyrics}`
        : `LYRICS:\n${lyrics}`

    const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' }, // forces pure JSON output, no markdown
    })

    const text = completion.choices[0]?.message?.content ?? ''

    // Try direct parse first
    try {
        return JSON.parse(text) as TranslationResult
    } catch { /* continue to fallback */ }

    // Fallback: extract outermost JSON object (first { to last })
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
        try {
            return JSON.parse(text.slice(start, end + 1)) as TranslationResult
        } catch { /* continue */ }
    }

    console.error('[translateLyrics] LLaMA response could not be parsed as JSON.')
    console.error('[translateLyrics] First 500 chars:', text.slice(0, 500))
    throw new Error('Translation failed: could not parse AI response')
}


// ── Groq Whisper Transcription ────────────────────────────────────────────────
// Note: Node.js 18 does NOT have a global `File`. We use Groq SDK's toFile() helper
// which works on all Node versions and is the officially recommended approach.
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg'
        : filename.endsWith('.wav') ? 'audio/wav'
            : filename.endsWith('.webm') ? 'audio/webm'
                : filename.endsWith('.m4a') ? 'audio/mp4'
                    : 'audio/webm'

    // toFile() works in Node 18+ and creates the multipart upload Groq expects
    const file: Uploadable = await toFile(audioBuffer, filename, { type: mimeType })

    const transcription = await groqClient.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3',
        language: 'af', // Afrikaans / Cape Flats — closest to SDK phonetics
        response_format: 'json',
    })

    return transcription.text
}


// ── Groq Fast Chat (genre check, quick helpers) ───────────────────────────────
export async function groqChat(prompt: string, systemPrompt?: string): Promise<string> {
    const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            { role: 'user' as const, content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
    })
    return completion.choices[0]?.message?.content ?? ''
}
