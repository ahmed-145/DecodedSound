// AI abstraction layer — all AI calls go through Groq
// Translation: LLaMA 3.3 70B · Transcription: Whisper Large v3
// Swap providers by changing baseURL + apiKey only

import Groq, { toFile } from 'groq-sdk'
import type { Uploadable } from 'groq-sdk/uploads'

// ── Client ───────────────────────────────────────────────────────────────────
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
// 14,400 req/day free at 6,000 RPM. LLaMA 3.3 70B is excellent at JSON
// instruction-following with response_format: json_object.
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


// ── Genre Detection ───────────────────────────────────────────────────────────
// PRD Section 10, Step 7: classify SDK vs non-SDK before every translation.
// >0.85 non-SDK confidence → warn user. <0.6 SDK → disclaimer banner.
export async function detectGenre(lyrics: string): Promise<{ isSDK: boolean; confidence: number }> {
    const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a music genre classifier specialised in South African music. Your only task is to determine whether a given set of lyrics is from SDK (Esdeekid / EsDeeKid) / Cape Flats music or not.

SDK music characteristics:
- Cape Flats Afrikaans dialect (Cape Town)
- Kaaps slang terms (g, mandem, bra, kwaai, lekker, skolly, etc.)
- Afrikaans words mixed with English
- References to Cape Town, Cape Flats, Mitchells Plain, Kraaifontein, etc.
- Phonetic wordplay and coded double meanings

Respond ONLY with a JSON object, no explanation:
{"isSDK": boolean, "confidence": number}
confidence is 0.0 to 1.0 — how confident this IS SDK music (not how confident it's not SDK).`
            },
            {
                role: 'user',
                content: `Classify these lyrics:\n\n${lyrics.slice(0, 800)}`
            }
        ],
        temperature: 0.1,
        max_tokens: 64,
        response_format: { type: 'json_object' },
    })

    const text = completion.choices[0]?.message?.content ?? ''
    try {
        const result = JSON.parse(text)
        return {
            isSDK: Boolean(result.isSDK),
            confidence: Number(result.confidence ?? 0.5),
        }
    } catch {
        // Default: assume SDK if we can't parse (fail open)
        return { isSDK: true, confidence: 0.5 }
    }
}


// ── Reverse Translation (English → SDK) ──────────────────────────────────────
// PRD Section 16: user types plain English, gets SDK-style output back.
const REVERSE_SYSTEM_PROMPT = `You are DecodedSound in reverse mode. Your job is to rewrite plain English text in the style of EsDeeKid (SDK) — Cape Flats hip-hop from South Africa.

EsDeeKid's style includes:
- Cape Flats Afrikaans dialect (Kaaps)
- Slang terms: bra, g, kwaai, lekker, mandem, skolly, naai, poes, etc.
- Short, punchy sentences with street cadence
- Phonetic wordplay and double meanings
- Afrikaans and Xhosa words mixed into English

You will receive plain English text and a list of verified KB terms.

Respond with a JSON object:
{
  "sdkOutput": string,         // the full rewrite in SDK style
  "termsUsed": string[],        // which KB terms you used
  "styleNotes": string          // 1-2 sentence note on the style choices made
}

Rules:
- Only use KB terms where they fit naturally. Do not force them.
- Keep the core meaning of the input intact.
- Match EsDeeKid's cadence and phonetic style.
- Output strict JSON only. No markdown, no preamble.`

export interface ReverseResult {
    sdkOutput: string
    termsUsed: string[]
    styleNotes: string
}

export async function reverseTranslate(
    text: string,
    kbContext?: string
): Promise<ReverseResult> {
    const userMessage = kbContext
        ? `KB TERMS (use where natural):\n${kbContext}\n\nENGLISH TEXT:\n${text}`
        : `ENGLISH TEXT:\n${text}`

    const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: REVERSE_SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
        ],
        temperature: 0.7, // higher creativity for style
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? ''

    try {
        return JSON.parse(raw) as ReverseResult
    } catch {
        const start = raw.indexOf('{')
        const end = raw.lastIndexOf('}')
        if (start !== -1 && end > start) {
            return JSON.parse(raw.slice(start, end + 1)) as ReverseResult
        }
        throw new Error('Reverse translation failed: could not parse AI response')
    }
}
