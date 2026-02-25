# DecodedSound — Developer Documentation

> SDK / Esdeekid Music AI Translator · PRD v3.0 · February 2026

---

## Docs Structure

```
docs/
├── README.md        ← You are here
├── build-log.md     ← Full build story: what we built, what broke, why we fixed it how we did
├── architecture.md  ← System design: request flows, AI layer, database schema
└── setup.md         ← Local dev setup, env vars, all 9 API routes
```

---

## What Is DecodedSound?

An AI platform that translates **SDK (Esdeekid) music** — a coded cultural language from the Cape Flats, South Africa — into plain, accessible English.

**4 output panels per song:** Plain Translation · Line-by-Line breakdown · Slang Dictionary · Cultural Context narrative

**3 input methods:** Typed lyrics · Audio upload (.mp3/.wav) · YouTube link

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Node 18 compatible |
| Language | TypeScript | |
| Database | Postgres 16 (Docker) | Port 5433 locally |
| ORM | Prisma 5.22 | |
| Translation AI | Groq LLaMA 3.3 70B | 14,400 req/day free — switched from Gemini |
| Transcription | Groq Whisper Large v3 | `language: 'af'` for Cape Flats phonetics |
| YouTube | yt-dlp | Downloads `.webm` natively, no ffmpeg needed |
| Styling | Tailwind CSS v3 | Node 18 compatible (v4 requires Node 20) |
| Deployment | Vercel (free tier) | Cron for job worker |

---

## Quick Start

```bash
cd /home/ahmeed/Documents/NEEDS/EsDeeKiiiid/app
docker compose up -d
npm run dev
# → http://localhost:3000
```

Full setup guide: [setup.md](./setup.md)

---

## Key URLs (local dev)

| Page | URL |
|---|---|
| Home (translate) | http://localhost:3000 |
| Song result | http://localhost:3000/song/[slug] |
| Song Library | http://localhost:3000/library |
| Slang KB | http://localhost:3000/kb |
