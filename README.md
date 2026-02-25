<div align="center">

# 🎵 DecodedSound

### SDK / Esdeekid Music — Cultural Translation Engine

*Translating the coded language of the Cape Flats, South Africa into plain, accessible English*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-orange)](https://groq.com)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## What Is This?

SDK (Esdeekid) music is a genre born in the Cape Flats of Cape Town, South Africa. It's rapped in a coded mix of **Cape Flats Afrikaans**, Kaaps slang, Xhosa borrowings, and Cape Malay vocabulary — a language that's deliberately hard to understand if you're not from there.

**DecodedSound** is an AI platform that translates this music into plain English, with 4 output panels per song:

| Panel | What it does |
|---|---|
| 📝 Plain Translation | The full song in natural English prose |
| 🔤 Line-by-Line | Annotated breakdown with slang flags per line |
| 📖 Slang Dictionary | Unknown terms the AI flagged, with confidence scores |
| 🏙️ Cultural Context | 2-4 paragraph narrative for someone with zero Cape Flats knowledge |

**3 ways to get lyrics in:**
- ✍️ Paste lyrics directly
- 🎵 Upload an audio file (MP3, WAV, M4A)
- 📺 Paste a YouTube link (auto-downloads + transcribes via Whisper)

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Node 18 compatible |
| Language | **TypeScript** | |
| Database | **PostgreSQL 16** (Docker) | Port 5433 locally |
| ORM | **Prisma 5** | Type-safe, 7 models |
| Translation AI | **Groq LLaMA 3.3 70B** | 14,400 req/day free tier |
| Transcription | **Groq Whisper Large v3** | `language: af` for Cape Flats phonetics |
| YouTube | **yt-dlp** | Downloads `.webm` natively — no ffmpeg needed |
| Styling | **Tailwind CSS v3** | |
| Deployment | **Vercel** | Cron worker included |

> **Why Groq for translation?** Groq's free tier gives 14,400 requests/day at 6,000 RPM. That's effectively unlimited for v1.0. The `response_format: json_object` mode guarantees clean JSON output with no markdown leakage.

> **Why Whisper with `language: af`?** YouTube auto-captions for SDK music auto-translate Cape Flats Afrikaans to broken English. Whisper with the Afrikaans language hint captures the actual phonetics — `marapagik`, `liggen tele by die grafik`, `addik` — correctly.

---

## Project Structure

```
app/
├── app/
│   ├── page.tsx                    # Home — 3-tab input (typed/audio/youtube)
│   ├── song/[slug]/page.tsx        # 4-panel translation result
│   ├── library/page.tsx            # Public song library with search
│   ├── kb/page.tsx                 # Slang knowledge base browser
│   └── api/
│       ├── translate/route.ts      # POST — translate typed lyrics
│       ├── audio/route.ts          # POST — transcribe + save audio
│       ├── youtube/route.ts        # POST — download + transcribe YouTube
│       ├── songs/route.ts          # GET  — song library + search
│       ├── songs/[slug]/route.ts   # GET  — single song with translation
│       ├── kb/route.ts             # GET/POST — KB browse + contribute
│       ├── kb/[id]/flag/route.ts   # POST — flag a KB entry
│       ├── ratings/route.ts        # POST — rate a song 1-5 stars
│       └── worker/route.ts         # GET  — Vercel cron job processor
├── lib/
│   ├── ai.ts                       # All AI calls (Groq LLaMA + Whisper)
│   ├── ytdlp.ts                    # yt-dlp wrapper
│   ├── prisma.ts                   # Prisma client singleton
│   └── utils.ts                    # Slug generation, helpers
├── prisma/
│   ├── schema.prisma               # 7 models, 4 enums
│   ├── seed.ts                     # 20 seed KB terms
│   └── migrations/                 # init migration
└── docs/
    ├── build-log.md                # Full build story + all bugs + decisions
    ├── architecture.md             # System design, AI layer, DB schema
    └── setup.md                    # Local dev setup + all API routes
```

---

## Local Setup

### Prerequisites

- Node.js 18+ (`node --version`)
- Docker (`docker --version`)
- A [Groq API key](https://console.groq.com) (free)

### 1. Install yt-dlp

```bash
pip3 install yt-dlp
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Configure environment

Create `.env.local`:

```env
DATABASE_URL="postgresql://decodedsound:decodedsound_pass@localhost:5433/decodedsound"
GROQ_API_KEY="your-groq-key-here"
GEMINI_API_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
WORKER_SECRET="any-secret-string"
```

Get your free Groq key at [console.groq.com](https://console.groq.com) — no credit card needed.

### 4. Start the database

```bash
docker compose up -d
```

> **Note:** Docker maps to port 5433 (not 5432) because most machines already have a local Postgres on 5432.

### 5. Run migrations + seed

```bash
DATABASE_URL="postgresql://decodedsound:decodedsound_pass@localhost:5433/decodedsound" \
  npx prisma migrate deploy

DATABASE_URL="postgresql://decodedsound:decodedsound_pass@localhost:5433/decodedsound" \
  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| Route | Description |
|---|---|
| `/` | Home — paste lyrics, upload audio, or enter a YouTube link |
| `/song/[slug]` | 4-panel translation result for a specific song |
| `/library` | Browse all translated songs with search |
| `/kb` | Browse + contribute to the slang knowledge base |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/translate` | Translate lyrics → 4-panel JSON |
| `POST` | `/api/audio` | Transcribe audio file via Whisper |
| `POST` | `/api/youtube` | Download YouTube audio + transcribe |
| `GET` | `/api/songs` | Song library (`?q=search&page=1`) |
| `GET` | `/api/songs/[slug]` | Single song + translation |
| `GET` | `/api/kb` | Browse approved KB terms |
| `POST` | `/api/kb` | Submit community term contribution |
| `POST` | `/api/kb/[id]/flag` | Flag a KB entry for review |
| `POST` | `/api/ratings` | Rate a song 1-5 stars |
| `GET` | `/api/worker` | Cron job — processes async jobs |

---

## Deployment (Vercel)

1. Push to GitHub (already done)
2. Create a new project at [vercel.com](https://vercel.com) and import this repo
3. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` → your Supabase/Neon connection string
   - `GROQ_API_KEY` → your Groq key
   - `WORKER_SECRET` → any secret string
4. Deploy

The cron job (`/api/worker`) is pre-configured in `vercel.json` to run every 60 seconds on Vercel's free tier.

---

## Knowledge Base

DecodedSound ships with 20 seed KB terms covering common SDK/Cape Flats slang. The AI:

1. **Uses** approved KB terms as context before translating (better accuracy)
2. **Extracts** unknown terms it encounters into a `KBCandidate` table
3. **Promotes** candidates to the main KB after admin review

Community members can contribute new terms via `/kb` → each submission goes into a moderation queue.

---

## How the AI Works

```
Lyrics (any input) → Groq LLaMA 3.3 70B
      │
      ├─ System prompt: DecodedSound cultural translator
      ├─ KB context: up to 200 approved slang terms injected
      ├─ response_format: json_object (guaranteed clean JSON)
      │
      └─ Output:
           plainTranslation   — full song in plain English
           lineByLine[]       — one entry per line with flaggedTerms
           culturalContext    — narrative for outsiders
           unknownTerms[]     — new slang with confidence scores
           genreConfidence    — 0.0–1.0 how SDK this is
           overallConfidence  — 0.0–1.0 translation quality

YouTube URL → yt-dlp (.webm download, no ffmpeg)
           → Groq Whisper Large v3 (language: af)
           → Actual Cape Flats phonetics (not YouTube's broken auto-captions)
           → LLaMA translation
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | Translation (LLaMA) + transcription (Whisper) |
| `GEMINI_API_KEY` | No | Reserved for future use |
| `NEXT_PUBLIC_APP_URL` | No | Base URL for share links |
| `WORKER_SECRET` | No | Protects `/api/worker` in production |

---

## Roadmap

- [ ] Authentication (Clerk)
- [ ] Admin panel for KB moderation
- [ ] Upgrade to Node 20 → Next.js 15 + Tailwind v4
- [ ] Non-SDK Cape Flats genres
- [ ] Artist dashboard
- [ ] Mobile app (React Native)

---

## Docs

Full documentation lives in `/docs`:

- [`build-log.md`](docs/build-log.md) — complete build story, every bug, every decision
- [`architecture.md`](docs/architecture.md) — system design, AI layer, database schema
- [`setup.md`](docs/setup.md) — local dev setup + full API reference

---

<div align="center">

Built with 💚 for the Cape Flats

</div>
