<div align="center">

<br>

<img src="https://img.shields.io/badge/🎵_DecodedSound-Cape_Flats_Culture-ff6b35?style=for-the-badge&labelColor=1a1a2e" alt="DecodedSound" />

<br><br>

# DecodedSound

**AI-Powered Cultural Translator for SDK Music**

*The Cape Flats speak a language the world doesn't understand yet. We're changing that.*

<br>

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Groq LLaMA](https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-F55036?style=flat-square)](https://groq.com)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![KB Terms](https://img.shields.io/badge/KB-502%20terms-4ade80?style=flat-square)](#knowledge-base)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## The Problem

**SDK (Esdeekid)** is a music genre from the **Cape Flats** — a sprawling area of gang-heavy communities southeast of Cape Town, South Africa. It's rapped in a hyper-coded mix of:

- 🔤 **Cape Flats Afrikaans** (Kaaps) — not standard Afrikaans
- 🔀 **Xhosa borrowings** — township language mixing
- 🕌 **Cape Malay vocabulary** — centuries of cultural fusion
- 🔒 **Prison gang codes** — 26s, 27s, 28s terminology
- 🤫 **Street slang** — deliberately opaque to outsiders

> *"Hy's 'n real g vannie Flats, hy jaag die paper met die mandem"*
>
> Translation: *"He's a real gangster from the Flats, he chases money with his crew"*

**No translator, dictionary, or AI model understands this language.** Until now.

---

## What DecodedSound Does

Paste lyrics, upload audio, or drop a YouTube link → Get 4 panels of cultural translation:

| Panel | What You Get |
|---|---|
| 📝 **Plain Translation** | Full song rendered in natural English prose |
| 🔤 **Line-by-Line** | Every line annotated with slang flags + hover tooltips from the KB |
| 📖 **Slang Dictionary** | Unknown terms the AI flagged, with confidence scores |
| 🏙️ **Cultural Context** | 2-4 paragraph narrative explaining the Cape Flats world behind the lyrics |

### 3 Input Methods

| Method | How | Tech |
|---|---|---|
| ✍️ **Typed Lyrics** | Paste directly | Groq LLaMA 3.3 70B |
| 🎵 **Audio Upload** | MP3, WAV, M4A | Groq Whisper → LLaMA |
| 📺 **YouTube Link** | Paste URL | yt-dlp → Whisper → LLaMA |

> **YouTube Cache:** Previously translated URLs are served instantly from the database — no re-download needed.

---

## Tech Stack

| Layer | Technology | Why This |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR + API routes in one repo |
| **Language** | TypeScript | Type-safe, Prisma-native |
| **Database** | PostgreSQL 16 (Docker) | Relational data, raw SQL for analytics |
| **ORM** | Prisma 5 | 8 models, type-safe queries |
| **Translation AI** | Groq LLaMA 3.3 70B | 14,400 req/day free, `json_object` mode = no markdown leakage |
| **Transcription** | Groq Whisper Large v3 | `language: 'af'` — captures Cape Flats phonetics correctly |
| **YouTube** | yt-dlp | Downloads `.webm` natively — **no ffmpeg needed** |
| **Styling** | Tailwind CSS v3 | Dark glassmorphism theme |
| **Rate Limiting** | In-memory sliding window | Per-IP, auto-cleanup, 3 tiers |
| **Deployment** | Vercel + Supabase | Free tier, cron worker included |

<details>
<summary><b>Why Groq over Gemini?</b></summary>

We started with Gemini 2.0 Flash. Hit the daily quota (1,500 req/day, 15 RPM) during debugging — got locked out for 45+ minutes. Groq gives 14,400 req/day at 6,000 RPM. Both are behind `lib/ai.ts` — swapping is a one-file change.
</details>

<details>
<summary><b>Why Whisper instead of YouTube captions?</b></summary>

YouTube auto-captions auto-translate Cape Flats Afrikaans to broken English: *"liggen tele by die grafik"* → *"running for running in the car"*. Completely useless. Whisper with `language: 'af'` captures the actual phonetics.
</details>

---

## Knowledge Base

DecodedSound ships with **502 hand-curated slang terms** across 12 categories:

> Core SDK slang · Money & hustle · People & reputation · Streets & places · Substances · Violence & danger · Gang culture & loyalty · Emotions · Music terms · Lifestyle · Cape Malay vocabulary · Prison gang terminology

The KB is a **living system**, not a static dictionary:

```
User translates song
    → AI uses 500+ KB terms as context (better translations)
    → AI flags unknown terms with confidence scores
    → Unknown terms → KBCandidate table
    → Admin reviews → approve/reject
    → Approved terms join the KB
    → Community can contribute terms via /kb page
    → 3+ flags on any term → auto-downgraded pending review
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)             │
│  /           /song/[slug]    /library    /kb  /admin │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                   API Routes (12)                     │
│  translate · audio · youtube · songs · kb · ratings   │
│  reverse · admin · worker · songs/[slug] · kb/flag    │
└───────┬──────────┬───────────────┬──────────────────┘
        │          │               │
   ┌────▼────┐ ┌───▼───┐   ┌──────▼──────┐
   │ Groq AI │ │yt-dlp │   │ PostgreSQL  │
   │ LLaMA   │ │       │   │ 8 models    │
   │ Whisper │ │ .webm │   │ 4 enums     │
   └─────────┘ └───────┘   └─────────────┘
```

### Data Models

| Model | Purpose |
|---|---|
| `Song` | Lyrics, source URL, slug, input type |
| `Translation` | 4-panel JSON output, confidence scores, AI model version |
| `Job` | Async processing queue for audio/YouTube |
| `KBEntry` | Approved slang terms (502 seeded) |
| `KBCandidate` | AI-discovered terms pending review |
| `Contribution` | Community-submitted terms |
| `Rating` | 1-5 stars per song (IP-deduplicated, `@@unique`) |
| `Flag` | Community reports on KB inaccuracies |

---

## Project Structure

```
app/
├── app/
│   ├── page.tsx                    # Home — 3-tab input + reverse translation toggle
│   ├── song/[slug]/
│   │   ├── page.tsx                # Dynamic OG metadata for social sharing
│   │   └── SongPageClient.tsx      # 4-panel results + KB tooltips + ratings
│   ├── library/page.tsx            # Song library with search + pagination
│   ├── kb/page.tsx                 # KB browser + community contributions
│   ├── admin/page.tsx              # Admin dashboard + moderation + low-rated songs
│   └── api/
│       ├── translate/route.ts      # POST — lyrics → 4-panel translation
│       ├── audio/route.ts          # POST — audio file → Whisper → save
│       ├── youtube/route.ts        # POST — URL → yt-dlp → Whisper (+ cache)
│       ├── songs/route.ts          # GET  — paginated library + search
│       ├── songs/[slug]/route.ts   # GET  — single song + avg rating
│       ├── kb/route.ts             # GET/POST — browse + contribute
│       ├── kb/[id]/flag/route.ts   # POST — flag + auto-downgrade at 3
│       ├── ratings/route.ts        # POST — 1-5 stars (upsert, IP-unique)
│       ├── reverse/route.ts        # POST — English → SDK translation
│       ├── admin/route.ts          # GET/POST — dashboard + moderation
│       └── worker/route.ts         # GET  — cron job processor
├── components/
│   ├── InputTabs.tsx               # Typed/audio/YouTube tab switcher + clear
│   ├── ReverseMode.tsx             # English → SDK UI
│   ├── StatsRow.tsx                # Stats display
│   └── SlangPill.tsx               # KB term hover tooltip component
├── lib/
│   ├── ai.ts                       # All AI calls (translate, reverse, genre detect)
│   ├── ytdlp.ts                    # yt-dlp wrapper with binary discovery
│   ├── prisma.ts                   # Prisma client singleton
│   ├── rateLimit.ts                # Sliding-window IP rate limiter (3 tiers)
│   └── utils.ts                    # Slug generation, helpers
├── prisma/
│   ├── schema.prisma               # 8 models, 4 enums, @@unique constraints
│   └── seed.ts                     # 502 curated SDK/Kaaps slang terms
└── docs/
    ├── build-log.md                # Full build story — every bug, every decision
    ├── architecture.md             # System design, AI layer, DB schema
    └── setup.md                    # Local dev setup + API reference
```

---

## Quick Start

### Prerequisites

- **Node.js 18+** · **Docker** · **[Groq API key](https://console.groq.com)** (free, no credit card)

```bash
# 1. Install yt-dlp (for YouTube input)
pip3 install yt-dlp

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your GROQ_API_KEY

# 4. Start database
docker compose up -d

# 5. Run migrations + seed 502 KB terms
npx prisma migrate deploy
npx tsx prisma/seed.ts

# 6. Start dev server
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | Powers translation (LLaMA) + transcription (Whisper) |
| `ADMIN_SECRET` | Prod only | Protects `/admin` panel |
| `WORKER_SECRET` | Prod only | Protects cron endpoint |
| `NEXT_PUBLIC_APP_URL` | No | Base URL for share links |

---

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/translate` | Translate lyrics → 4-panel JSON | Rate limited |
| `POST` | `/api/audio` | Transcribe audio via Whisper | Rate limited |
| `POST` | `/api/youtube` | YouTube → yt-dlp → Whisper (cached) | Rate limited |
| `POST` | `/api/reverse` | English → SDK reverse translation | Rate limited |
| `GET` | `/api/songs` | Song library (`?q=search&page=1`) | Public |
| `GET` | `/api/songs/[slug]` | Single song + translation + rating | Public |
| `GET` | `/api/kb` | Browse approved KB terms | Public |
| `POST` | `/api/kb` | Submit community term | Rate limited |
| `POST` | `/api/kb/[id]/flag` | Flag a KB entry (3 flags = auto-downgrade) | Public |
| `POST` | `/api/ratings` | Rate 1-5 stars (IP-deduplicated) | Public |
| `GET` | `/api/admin` | Dashboard stats + moderation data | `x-admin-secret` |
| `POST` | `/api/admin` | Approve/reject candidates, delete flags | `x-admin-secret` |

### Rate Limits (per IP)

| Tier | Window | Max | Routes |
|---|---|---|---|
| Heavy | 60s | 10 | translate, reverse |
| Audio | 60s | 5 | audio, youtube |
| Write | 60s | 30 | kb, ratings |

---

## Pages

| Route | What | Features |
|---|---|---|
| `/` | **Home** | 3-tab input, reverse translation toggle, genre detection warning, clear button |
| `/song/[slug]` | **Song Result** | 4 translation panels, KB hover tooltips, star ratings, share, dynamic OG |
| `/library` | **Song Library** | Search, pagination, confidence badges, rating display |
| `/kb` | **Slang KB** | Browse 500+ terms, community contributions, flag system |
| `/admin` | **Admin Panel** | Stats dashboard, KB candidate review, flag management, low-rated songs |

---

## Deploy to Production

```bash
# 1. Push to GitHub
git push origin main

# 2. Import to Vercel → set env vars:
#    DATABASE_URL    → Supabase/Neon connection string
#    GROQ_API_KEY    → your Groq key
#    ADMIN_SECRET    → any secret for admin auth
#    WORKER_SECRET   → any secret for cron

# 3. Deploy — cron worker pre-configured in vercel.json
```

---

## PRD Status

> Built against PRD v3.3 · Currently in **Weeks 7-8 (KB & Community)** with Phase 2 completed ahead of schedule

| Phase | Status |
|---|---|
| Phase 0 — Setup, DB, scaffolding | ✅ Complete |
| Phase 1 — MVP (translate, audio, YouTube, library, KB) | ✅ Complete |
| Phase 2 — English → SDK reverse translation | ✅ Complete (ahead of schedule) |
| Admin panel + rate limiting | ✅ Complete (not in original PRD) |
| KB seeded to 500+ terms | ✅ 502 terms |
| God-mode test pass | ✅ 17/17 pages, 10/10 APIs |

### Remaining for v1.0 Launch

- [ ] Error states (PRD §6 — 10 specific scenarios)
- [ ] Mobile responsive polish
- [ ] Vercel + Supabase deployment

### Roadmap (Post-Launch)

- [ ] Authentication (Clerk)
- [ ] Non-SDK Cape Flats genres
- [ ] Artist dashboard
- [ ] Mobile app (React Native)
- [ ] B2B API + monetisation

---

## Docs

| Document | What's Inside |
|---|---|
| [`build-log.md`](docs/build-log.md) | Complete build story — every bug, every fix, every decision across 5 sessions |
| [`architecture.md`](docs/architecture.md) | System design, request flows, AI layer, database schema |
| [`setup.md`](docs/setup.md) | Full local dev setup + API reference |

---

<div align="center">

Built with 💚 for the Cape Flats

*"Die Kaap se taal verdien om gehoor te word"*
— The Cape's language deserves to be heard

</div>
