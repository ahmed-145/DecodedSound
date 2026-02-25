# DecodedSound — Setup & API Reference

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 18.x (18.20.8 tested) | `node --version` |
| npm | ≥ 10.x | `npm --version` |
| Docker | any recent | `docker --version` |
| Docker Compose | V2 (built-in) | `docker compose version` |
| yt-dlp | any | `yt-dlp --version` |

### Install yt-dlp (if missing)
```bash
pip3 install yt-dlp
# installs to ~/.local/bin/yt-dlp
# Note: lib/ytdlp.ts hardcodes this path since it's not in Node.js exec() PATH
```

---

## First-Time Setup

```bash
# 1. Navigate to project
cd /home/ahmeed/Documents/NEEDS/EsDeeKiiiid/app

# 2. Install dependencies
npm install --legacy-peer-deps
# --legacy-peer-deps needed: ESLint v9 vs eslint-config-next@14 peer conflict

# 3. Verify .env.local exists (see Environment section below)

# 4. Start the database
docker compose up -d
# Expected: ✔ Container decodedsound_db  Started

# 5. Run migrations
DATABASE_URL="postgresql://decodedsound:decodedsound_pass@localhost:5433/decodedsound" \
  npx prisma migrate deploy

# 6. Seed the KB
DATABASE_URL="postgresql://decodedsound:decodedsound_pass@localhost:5433/decodedsound" \
  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
# Expected: ✅ KB seeded successfully! (20 terms)

# 7. Start dev server
npm run dev
# Expected: ▲ Next.js 14 · Local: http://localhost:3000 · Ready in 2.3s
```

---

## Day-to-Day Commands

```bash
# Start everything
docker compose up -d && npm run dev

# Stop (keeps data)
docker compose down

# Stop and WIPE all data
docker compose down -v

# DB GUI in browser (:5555)
npx prisma studio

# Check Docker logs
docker logs decodedsound_db

# Reset + reseed DB (dev only)
DATABASE_URL="..." npx prisma migrate reset
DATABASE_URL="..." npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

## npm Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Generate Prisma client + build Next.js |
| `npm run db:migrate` | Create + apply new Prisma migration |
| `npm run db:seed` | Seed KB with initial 20 terms |
| `npm run db:studio` | Open Prisma Studio on :5555 |
| `npm run docker:up` | Start Docker Postgres |
| `npm run docker:down` | Stop Docker Postgres |

---

## Environment Variables — `.env.local`

> Never commit this file. It's gitignored by default.

```env
# Database (Docker on 5433 — local Postgres occupies 5432)
DATABASE_URL="postgresql://decodedsound:decodedsound_pass@localhost:5433/decodedsound"

# AI APIs (both free tier, both needed)
GEMINI_API_KEY=""      # kept for future use, not currently used for translation
GROQ_API_KEY=""        # primary — translation (LLaMA) + transcription (Whisper)

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
WORKER_SECRET="decodedsound_worker_secret_local"

# Supabase (production only — leave blank locally)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
```

| Variable | Used in |
|---|---|
| `DATABASE_URL` | `lib/prisma.ts`, all Prisma CLI commands |
| `GROQ_API_KEY` | `lib/ai.ts` → translation + transcription |
| `GEMINI_API_KEY` | `lib/ai.ts` (reserved, not active) |
| `WORKER_SECRET` | `app/api/worker/route.ts` — header check in production |
| `NEXT_PUBLIC_APP_URL` | Share URL generation |

> Variables prefixed `NEXT_PUBLIC_` are exposed to the browser. Never prefix secret keys with it.

---

## Known Gotchas

**Port 5432 conflict:** Docker uses `5433:5432`. Already configured in `.env.local`. Nothing to change.

**`--legacy-peer-deps` on install:** ESLint v9 vs eslint-config-next@14 conflict. No functional impact.

**PostCSS must be `.js`:** `postcss.config.js` uses `module.exports`. Never rename to `.mjs`.

**yt-dlp PATH:** pip installs to `~/.local/bin/` which Node.js `exec()` doesn't see. `lib/ytdlp.ts` hardcodes the full path.

**Node.js 18 has no global `File`:** Audio uploads use Groq SDK's `toFile()` helper instead of `new File()`.

**Gemini rate limits:** Gemini free tier = 15 RPM, ~1,500/day. Translation now uses Groq LLaMA instead (14,400/day, 6,000 RPM). Gemini key is kept for future reference.

---

## Production Deployment (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard (same keys as `.env.local`)
4. Change `DATABASE_URL` to your Supabase connection string
5. Vercel auto-deploys on push
6. Cron job (`/api/worker`) runs automatically via `vercel.json`

---

## API Routes Reference

All routes live in `app/api/`. All accept and return JSON.

### `POST /api/translate`
Translate typed (or reviewed) lyrics. The main flow.

**Request:**
```json
{ "lyrics": "...", "title": "optional", "artist": "optional" }
```
**Response:**
```json
{
  "songId": "...", "slug": "dj-buckz-bietjie-wyn-k3x9f2",
  "translation": {
    "plainTranslation": "...",
    "lineByLine": [{ "original": "...", "translation": "...", "flaggedTerms": [] }],
    "culturalContext": "...",
    "unknownTerms": [{ "term": "...", "provisionalDefinition": "...", "confidence": 0.6 }],
    "genreConfidence": 0.93, "overallConfidence": 0.87
  }
}
```
**Side effects:** Creates `Song` + `Translation` + `KBCandidate` records.

---

### `POST /api/audio`
Transcribe an uploaded audio file via Groq Whisper.

**Request:** `multipart/form-data` — `audio: <file>`, `title`, `artist`
**Response:** `{ "songId", "slug", "transcription": "...", "message": "..." }`

After this, user reviews transcription, then calls `POST /api/translate`.

---

### `POST /api/youtube`
Download audio from YouTube, transcribe via Whisper.

**Request:** `{ "url": "https://youtube.com/watch?v=...", "title", "artist" }`
**Response:** `{ "songId", "slug", "lyrics": "...", "method": "whisper", "message": "..." }`

> Captions are skipped entirely — Whisper with `language: 'af'` gives actual Cape Flats phonetics.

---

### `GET /api/songs`
Public song library with search + pagination.

**Query:** `?q=search&page=1`
**Response:** `{ "songs": [...], "total": 47, "page": 1, "totalPages": 3 }`

---

### `GET /api/songs/[slug]`
Fetch one song with its latest translation.

**Response:** Full song object with `translations[]` and rating stats. **404** if not found.

---

### `GET /api/kb`
Search approved KB entries.

**Query:** `?q=search&limit=50`
**Response:** `{ "entries": [{ "term", "definition", "origin", "example", "confidence" }] }`

---

### `POST /api/kb`
Community term contribution.

**Request:** `{ "term": "bokkie", "definition": "...", "example": "optional" }`
**Response:** `{ "id": "...", "message": "Contribution submitted for review." }`

Goes into `Contribution` table with status `PENDING`. Admin must approve.

---

### `POST /api/kb/[id]/flag`
Flag a KB entry for review.

**Request:** `{ "reason": "..." }`

---

### `POST /api/ratings`
Rate a song 1–5 stars. One per IP per song (upsert on re-rate).

**Request:** `{ "songId": "...", "stars": 4 }`

---

### `GET /api/worker`
Cron endpoint — processes up to 5 PENDING jobs.

**Headers (production only):** `x-worker-secret: <WORKER_SECRET>`
**Response:** `{ "processed": 5, "succeeded": 4, "failed": 1 }`

Configured in `vercel.json` to run every 60 seconds.

---

### Error Format

All errors:
```json
{ "error": "Human-readable message" }
```

| Code | Meaning |
|---|---|
| 400 | Bad request — missing/invalid input |
| 401 | Unauthorized — wrong worker secret |
| 404 | Song or KB entry not found |
| 422 | Unprocessable — could not extract from YouTube |
| 429 | AI rate limit hit (Groq) |
| 500 | Server error — AI failed, DB error |
