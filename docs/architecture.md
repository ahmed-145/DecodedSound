# DecodedSound — Architecture

---

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        User (browser)                          │
│                   http://localhost:3000                        │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                       │
│                                                                │
│  ┌─────────────────┐    ┌──────────────────────────────────┐  │
│  │   UI Pages       │    │         API Routes               │  │
│  │                  │    │                                  │  │
│  │  /               │    │  POST /api/translate             │  │
│  │  /song/[slug]    │    │  POST /api/audio                 │  │
│  │  /library        │    │  POST /api/youtube               │  │
│  │  /kb             │    │  GET  /api/songs                 │  │
│  └─────────────────┘    │  GET  /api/songs/[slug]          │  │
│                          │  GET  /api/kb                    │  │
│                          │  POST /api/kb                    │  │
│                          │  POST /api/kb/[id]/flag          │  │
│                          │  POST /api/ratings               │  │
│                          │  GET  /api/worker (cron)         │  │
│                          └──────────────┬───────────────────┘  │
└─────────────────────────────────────────┼──────────────────────┘
                                          │
              ┌───────────────────────────┼──────────────────────┐
              │                           │                       │
              ▼                           ▼                       ▼
┌──────────────────────┐  ┌─────────────────────┐  ┌───────────────────────┐
│  Groq LLaMA 3.3 70B  │  │  Groq Whisper v3    │  │  Postgres 16 (Docker) │
│                      │  │                     │  │  port 5433            │
│  Translation         │  │  Transcription      │  │                       │
│  4-panel JSON        │  │  language: af       │  │  Songs                │
└──────────────────────┘  └─────────────────────┘  │  Translations         │
                                                    │  Jobs                 │
                                    ┌───────────────│  KBEntry              │
                                    │               │  Contributions        │
                          ┌──────────────────┐      │  Flags                │
                          │   yt-dlp (CLI)   │      │  Ratings              │
                          │  .webm download  │      └───────────────────────┘
                          │  no ffmpeg needed│
                          └──────────────────┘
```

---

## Request Flows

### Typed Lyrics → Translation
```
User pastes lyrics → POST /api/translate
  → Fetch 200 approved KB terms from Postgres
  → Build KB context string
  → Send to Groq LLaMA 3.3 70B with system prompt + response_format: json_object
  → LLaMA returns strict JSON (4 panels)
  → Save Song + Translation to Postgres
  → Promote unknown terms → KBCandidate table
  → Return { songId, slug, translation }
  → Browser redirects to /song/[slug]
  → Page fetches GET /api/songs/[slug] → renders 4-panel UI
```

### Audio Upload → Transcription → Translation
```
User uploads MP3 → POST /api/audio (multipart)
  → Read file buffer
  → Groq SDK toFile() — works on Node 18 (no global File)
  → Send to Groq Whisper Large v3 (language: "af")
  → Receive transcription text
  → Return transcription to user for review
  → User edits if needed, clicks Translate
  → POST /api/translate (same flow as above)
```

### YouTube Link → Whisper → Translation
```
User pastes URL → POST /api/youtube
  → yt-dlp downloads audio as .webm (no ffmpeg needed)
  → YTDLP_BIN = full path (/home/ahmeed/.local/bin/yt-dlp)
    because ~/.local/bin is not in Node.js exec() PATH
  → Groq Whisper transcribes with language: "af"
  → Returns Cape Flats phonetics (not YouTube auto-caption garbage)
  → User clicks Translate → POST /api/translate
```

> **Why skip YouTube captions:** YouTube auto-translates Cape Flats Afrikaans to broken English. "liggen tele by die grafik" → "running for running in the car". Completely useless. Whisper gets the actual phonetics.

### Job Worker (Async Queue)
```
Vercel cron (every 60s) → GET /api/worker
  → Find up to 5 PENDING jobs (oldest first)
  → For each: PENDING → PROCESSING → COMPLETE / FAILED
  → After 3 failures: status = FAILED permanently
```

---

## AI Layer — `lib/ai.ts`

All AI calls go through one abstraction file. Swapping engines = one file change, nothing else.

```
┌─────────────────────────────────────────────────┐
│                  lib/ai.ts                      │
│                                                  │
│  translateLyrics()   → Groq LLaMA 3.3 70B       │
│  transcribeAudio()   → Groq Whisper Large v3     │
│  groqChat()          → Groq LLaMA 3.3 70B        │
└─────────────────────────────────────────────────┘
```

### Translation — Groq LLaMA 3.3 70B

```typescript
const completion = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `LYRICS:\n${lyrics}` },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' }, // pure JSON — no markdown leakage
})
```

**Why `response_format: json_object` instead of Gemini's `responseMimeType`:**
Groq's JSON mode is rock-solid. Gemini 2.5 Flash is a *thinking* model — reasoning tokens leak before the JSON and break `JSON.parse()`. LLaMA 3.3 70B with this mode always returns clean JSON.

### Translation System Prompt (summary)

- Role: `You are DecodedSound, a cultural translation engine for SDK / Esdeekid music from the Cape Flats, South Africa`
- Know that YouTube captions of SDK music are auto-translated Afrikaans → English. Still treat as SDK.
- **Always return JSON.** Never write plain text explanations.
- Required JSON schema: `plainTranslation`, `lineByLine[]`, `culturalContext`, `unknownTerms[]`, `genreConfidence`, `overallConfidence`

### KB Context Injection

Before each translation, up to 200 approved KB terms are injected:
```
KB CONTEXT:
mandem: Crew, gang, or close group of friends.
spook: A fake person pretending to be real.
...

LYRICS:
[raw lyrics]
```

### Transcription — Groq Whisper Large v3

```typescript
// Node 18 has no global File — use Groq SDK's toFile() helper
const file = await toFile(audioBuffer, filename, { type: mimeType })

await groqClient.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    language: 'af',          // Afrikaans — closest to Cape Flats phonetics
    response_format: 'json',
})
```

Supports: `.mp3`, `.wav`, `.webm`, `.m4a` (yt-dlp downloads `.webm` natively, no ffmpeg).

---

## Database Schema — `prisma/schema.prisma`

### Model Relationships

```
Song ──────────────── Translation (1:many)
  │
  ├──────────────────── Job (1:many)
  │
  └──────────────────── Rating (1:many)

KBEntry ───────────── Flag (1:many)
  │
  └──────────────────── KBCandidate (1:many)

Contribution (standalone → admin moderation)
```

### Song
| Field | Type | Notes |
|---|---|---|
| `id` | cuid | Primary key |
| `title` | String | User-provided or auto-detected |
| `artist` | String? | Optional |
| `inputType` | Enum | `TYPED`, `AUDIO`, `YOUTUBE` |
| `rawLyrics` | Text | Original before translation |
| `sourceUrl` | String? | YouTube URL if applicable |
| `slug` | String (unique) | `{artist}-{title}-{nanoid(6)}` |
| `isPublic` | Boolean | Default true — shows in /library |

### Translation
| Field | Type | Notes |
|---|---|---|
| `songId` | FK → Song | Cascade delete |
| `plainTranslation` | Text | Full song in plain English |
| `lineByLine` | Json | `[{ original, translation, flaggedTerms[] }]` |
| `culturalContext` | Text | 2-4 paragraph narrative |
| `unknownTerms` | Json | `[{ term, provisionalDefinition, confidence }]` |
| `genreConfidence` | Float | 0.0–1.0 SDK genre match |
| `overallConfidence` | Float | 0.0–1.0 translation confidence |

### Job (Async Queue)
| Field | Type | Notes |
|---|---|---|
| `status` | Enum | `PENDING → PROCESSING → COMPLETE / FAILED` |
| `inputType` | Enum | `AUDIO`, `YOUTUBE` |
| `payload` | Json | `{ transcription?, youtubeUrl? }` |
| `attempts` | Int | Max 3 before FAILED |

### KBEntry
| Field | Type | Notes |
|---|---|---|
| `term` | String (unique) | The slang word/phrase |
| `definition` | Text | Plain English definition |
| `origin` | String? | e.g., "Cape Flats Afrikaans slang" |
| `confidence` | Float | 0.0–1.0 |
| `isApproved` | Boolean | Only approved terms fed to LLaMA |

### KBCandidate
Auto-extracted from translations. Admin approves → becomes KBEntry.

### Contribution
Community term submissions. Admin approval required.

### Rating
One per IP per song (upsert on re-rate). Stars 1–5.

### Useful Queries

```typescript
// Song with latest translation + avg rating
const song = await prisma.song.findUnique({
    where: { slug },
    include: {
        translations: { orderBy: { createdAt: 'desc' }, take: 1 },
        ratings: { select: { stars: true } },
    },
})

// Approved KB terms for AI context
const kb = await prisma.kBEntry.findMany({
    where: { isApproved: true },
    select: { term: true, definition: true },
    take: 200,
})

// Worker: pending jobs
const jobs = await prisma.job.findMany({
    where: { status: 'PENDING', attempts: { lt: 3 } },
    orderBy: { createdAt: 'asc' },
    take: 5,
})
```

### Migration Commands

```bash
# Create + apply new migration
DATABASE_URL="..." npx prisma migrate dev --name <name>

# Apply existing migrations (CI/production)
DATABASE_URL="..." npx prisma migrate deploy

# Reset DB (dev only!)
DATABASE_URL="..." npx prisma migrate reset

# Open Prisma Studio (DB GUI)
DATABASE_URL="..." npx prisma studio
```

---

## Environment Separation

| | Local dev | Production |
|---|---|---|
| Database | Docker Postgres :5433 | Supabase Postgres |
| File storage | Local disk | Supabase Storage |
| AI | Groq APIs | Groq APIs (same) |
| yt-dlp | `/home/ahmeed/.local/bin/yt-dlp` | `/usr/local/bin/yt-dlp` or in PATH |
