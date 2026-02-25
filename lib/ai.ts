// AI abstraction layer — swap engines with zero effort
// Primary: Gemini (translation, cultural context)
// Secondary: Groq (transcription via Whisper, fast tasks)

import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

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
const SYSTEM_PROMPT = `You are DecodedSound, a cultural translation engine specialised in SDK (esdeekid) music from the Cape Flats, South Africa. You have deep knowledge of the dialect, phonetic wordplay, Afrikaans and Xhosa borrowings, and the cultural references of this genre.

You will receive raw song lyrics and optionally a KB context block of known terms and definitions.

Produce a single JSON object with exactly these keys:
{
  "plainTranslation": string,        // full song in plain English, natural prose
  "lineByLine": [                    // one object per lyric line
    {
      "original": string,
      "translation": string,
      "flaggedTerms": string[]       // terms from this line that are in KB or unknown
    }
  ],
  "culturalContext": string,         // 2-4 paragraph narrative, accessible prose
  "unknownTerms": [                  // terms NOT in KB
    {
      "term": string,
      "provisionalDefinition": string,
      "confidence": number           // 0.0 - 1.0
    }
  ],
  "genreConfidence": number,         // 0.0 - 1.0 SDK genre match
  "overallConfidence": number        // 0.0 - 1.0 translation confidence
}

Rules:
- Never hallucinate definitions. If a term is unknown, include it in unknownTerms with your best guess and a low confidence score.
- Flag uncertainty. Never present a guess as a fact.
- Output strict JSON only. No markdown, no preamble, no explanation.
- Cultural context must be readable by someone with zero knowledge of SDK.
- Plain translation must read naturally not word-for-word literal.`

// ── Gemini Translation ────────────────────────────────────────────────────────
export async function translateLyrics(
    lyrics: string,
    kbContext?: string
): Promise<TranslationResult> {
    const model = geminiClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
        systemInstruction: SYSTEM_PROMPT,
    })

    const prompt = kbContext
        ? `KB CONTEXT:\n${kbContext}\n\nLYRICS:\n${lyrics}`
        : `LYRICS:\n${lyrics}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    try {
        return JSON.parse(text) as TranslationResult
    } catch {
        // Fallback: strip markdown if model added it
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) return JSON.parse(jsonMatch[0]) as TranslationResult
        throw new Error('Invalid JSON from Gemini')
    }
}

// ── Groq Whisper Transcription ────────────────────────────────────────────────
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    const file = new File([audioBuffer], filename, {
        type: filename.endsWith('.mp3') ? 'audio/mpeg' :
            filename.endsWith('.wav') ? 'audio/wav' : 'audio/mp4',
    })

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
