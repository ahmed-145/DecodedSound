# DecodedSound — Build Log & Tech Decisions

Full log of everything we built, what broke, what we changed, and why.
This is the **single source of truth** for how this project was actually built.

---

## AI Stack — Current State

| Task | Engine | Notes |
|---|---|---|
| Song translation (4 panels) | **Groq LLaMA 3.3 70B** | Switched from Gemini — 14,400 req/day free at 6,000 RPM |
| Audio transcription | **Groq Whisper Large v3** | `language: 'af'` for Cape Flats phonetics |
| Fast tasks / genre check | **Groq LLaMA 3.3 70B** | Same model, different prompts |
| YouTube audio download | **yt-dlp** | Downloads native `.webm`, no ffmpeg needed |

> **Why Groq over Gemini for translation:** Gemini free tier = ~1,500 req/day at 15 RPM. Groq = 14,400 req/day at 6,000 RPM. We burned through Gemini's daily quota during debugging. Both are behind `lib/ai.ts` — swapping is one file change.

---

## Tech Decisions

### Decision 1 — AI Stack: Gemini + Groq (then Groq-only for translation)

**Original PRD:** Anthropic Claude for translation.
**Attempted:** Cerebras API (llama-3.3-70b) as a free alternative.
**Built with:** Gemini 1.5 Flash (primary) + Groq (transcription + fast tasks).
**Later changed:** Translation moved from Gemini → Groq LLaMA 3.3 70B (rate limit issue, see Problem Log).

**Rationale:** Both are abstracted behind `lib/ai.ts`. Engine swaps cost exactly one file change. Total cost at launch = $0.

---

### Decision 2 — Docker for Local Postgres

**Why:** PRD said "Postgres local dev → Supabase production". Docker gives us identical Postgres 16, clean teardown, no sudo needed.
**Port compromise:** Used `5433:5432` — local Postgres already occupied `5432`.

---

### Decision 3 — Downgrade Next.js 16 → 14

**Why forced:** Node.js on the machine = v18.20.8. Next.js 16 requires Node ≥ 20.9.0.
**Migration path:** When Node is upgraded to 20+, bump `next` in `package.json`.

---

### Decision 4 — Downgrade Tailwind v4 → v3

**Why forced:** Tailwind v4 uses `@tailwindcss/oxide`, a Rust binary that npm failed to download correctly on Node 18 / Linux x64.
**Why v3:** Pure JS PostCSS — works everywhere, no native binaries. All utility classes work identically.
**Migration path:** When Node ≥ 20, upgrade to Tailwind v4 — update `globals.css` to `@import "tailwindcss"` syntax, delete `tailwind.config.js`.

---

### Decision 5 — No AWS / No SQS / No Lambda

PRD v3.0 already made this call:

| Removed | Replaced by |
|---|---|
| AWS Lambda | Next.js API routes |
| AWS SQS | Postgres `Job` table |
| AWS S3 | Supabase Storage (prod) / local (dev) |
| FastAPI + Python | Next.js API routes + TypeScript |

Result: one repo, one deploy, no separate services.

---

### Decision 6 — Async Job Queue via Postgres + Vercel Cron

For audio/YouTube, we don't block the HTTP response:
1. Route creates a `Job` record (status: PENDING)
2. Vercel cron calls `GET /api/worker` every 60 seconds
3. Worker picks up to 5 PENDING jobs, processes them
4. Frontend polls `GET /api/songs/[slug]` to check if ready

**Why not Bull/BullMQ:** No extra Redis needed. Free on Vercel.

---

### Decision 7 — Whisper Language Code = `af` (Afrikaans)

`af` is the closest ISO code for SDK / Cape Flats phonetics. Improves transcription accuracy for phrases like "hy's 'n real g" vs auto-detect treating it as Dutch.

---

### Decision 8 — Slug-Based URLs (Not UUID)

Songs at `/song/[slug]` not `/song/[id]`. Format: `{artist}-{title}-{nanoid(6)}` — e.g., `dj-buckz-bietjie-wyn-k3x9f2`. SEO-friendly, shareable, human-readable.

---

### Decision 9 — YouTube: Skip Captions, Use Whisper Instead

**Original design:** Try YouTube auto-captions first, fall back to audio.
**Problem:** YouTube auto-captions for SDK/Cape Flats Afrikaans are auto-translated to broken English (`"liggen tele by die grafik"` → `"running for running in the car"`). Completely useless.
**New approach:** Always download audio via yt-dlp as `.webm` (no ffmpeg needed), transcribe via Groq Whisper with `language: 'af'`. Result is actual Cape Flats phonetics.

---

## Build Session — 25 February 2026 (Project Creation)

### Session Goal
Build DecodedSound from scratch — Next.js 14 + TypeScript + Tailwind + Prisma. All 9 API routes, 4 UI pages, Prisma schema + seed.

---

### ❌ Problem 1: `npx create-next-app` Stuck for 11+ Minutes

`create-next-app` v16.1.6 added a new interactive prompt (`React Compiler?`) after we'd already passed all flags. Terminal blocked waiting for input.

**Fix:** Killed, restarted, sent `Enter` via stdin when prompts appeared.

---

### ❌ Problem 2: npm Naming Restriction (Capital Letters)

```
Could not create a project called "EsDeeKiiiid" because of npm naming restrictions
```

**Fix:** Scaffolded into `./app` subdirectory instead of the root.

---

### ❌ Problem 3: Docker Port 5432 Already in Use

Machine had a local PostgreSQL on :5432.

**Fix:** Changed Docker Compose host port to `5433:5432`. Updated `.env.local` accordingly.

---

### ❌ Problem 4: Node 18 Incompatible With Next.js 16

```
You are using Node.js 18.20.8. For Next.js, Node.js version ">=20.9.0" is required.
```

**Fix:** `npm install next@14 eslint-config-next@14 --legacy-peer-deps`

---

### ❌ Problem 5: `next.config.ts` Not Supported in Next.js 14

Next.js 16 introduced TypeScript config support. After downgrading, the `.ts` config broke.

**Fix:** `mv next.config.ts next.config.mjs`

---

### ❌ Problem 6: Tailwind v4 `@tailwindcss/oxide` Native Binding Missing

Rust binary not downloaded correctly under Node 18 / Linux x64.

**Fix:** Replaced with Tailwind v3:
```bash
npm uninstall tailwindcss @tailwindcss/postcss
npm install tailwindcss@3 autoprefixer postcss --legacy-peer-deps
```

---

### ❌ Problem 7: PostCSS Config — `.mjs` + `module.exports` Conflict

`.mjs` is ESM. `module` is not defined in ESM scope.

**Fix:** `mv postcss.config.mjs postcss.config.js`

---

### Build Timeline (25 Feb, ~05:23–05:57 UTC)

| Time | Action | Result |
|---|---|---|
| 05:23 | Scaffold started | Stuck on React Compiler prompt |
| 05:32 | AI stack changed mid-build (Gemini + Groq) | Updated plan |
| 05:36 | Scaffold restarted | ✅ Succeeded |
| 05:38 | All lib files + API routes written | ✅ Done in parallel |
| 05:45 | All UI pages written | ✅ Home, Song, Library, KB |
| 05:50 | npm install | ✅ 51 packages, Prisma generated |
| 05:51 | Docker up | ❌ Port 5432 conflict |
| 05:51 | Switched to port 5433 | ✅ Container healthy |
| 05:53 | Prisma migrate dev | ✅ Migration `init` applied |
| 05:53 | KB seed | ✅ 20 terms seeded |
| 05:54 | npm run dev (Next.js 16) | ❌ Node 18 incompatible |
| 05:54 | Downgraded to Next.js 14 | ✅ |
| 05:55 | next.config.ts error | ❌ |
| 05:55 | Renamed to .mjs | ✅ |
| 05:55 | npm run dev | ❌ Tailwind v4 oxide |
| 05:56 | Downgraded to Tailwind v3 | ✅ |
| 05:56 | postcss.config.mjs ESM error | ❌ |
| 05:56 | Renamed to .js | ✅ |
| 05:57 | npm run dev | ✅ Ready in 2.3s |
| 05:57 | Browser verification | ✅ All 3 pages, 20 KB terms |

---

## Debugging Session — 25 February 2026 (Post-Build Fixes)

### ❌ Problem 8: Gemini 1.5 Flash → 404 Not Found

`gemini-1.5-flash` returned 404. Model deprecated.

**Fix:** Updated to `gemini-2.0-flash` (then later moved to Groq LLaMA entirely).

---

### ❌ Problem 9: YouTube URL Validation Rejected Short Links

`youtu.be` URLs were rejected because validation only checked for `youtube.com`.

**Fix:**
```typescript
const isValidYT = url && (url.includes('youtube.com') || url.includes('youtu.be'))
```

---

### ❌ Problem 10: Song Page Crash — `use(params)` Not Available in Next.js 14

```
Error: An unsupported type was passed to use()
```

`use(params)` and `params: Promise<{ slug: string }>` are Next.js 15+ syntax. In Next.js 14, params is a plain object.

**Fix:**
```typescript
// Before (Next.js 15 only):
export default function SongPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params)

// After (Next.js 14):
export default function SongPage({ params }: { params: { slug: string } }) {
    const { slug } = params
```

---

### ❌ Problem 11: YouTube Extraction — "yt-dlp not found"

`yt-dlp` was not installed. Also even after installing via `pip3 install yt-dlp`, the binary landed in `~/.local/bin/` which is not in Node.js `exec()` PATH.

**Fix:** Installed yt-dlp, then hardcoded the full path in `lib/ytdlp.ts`:
```typescript
const YTDLP_BIN = [
    '/home/ahmeed/.local/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
].find(p => { try { require('fs').accessSync(p); return true } catch { return false } }) ?? 'yt-dlp'
```

---

### ❌ Problem 12: YouTube Captions Are Useless for SDK Music

YouTube auto-captions auto-translate Afrikaans to broken English. `"liggen tele by die grafik"` → `"running for running in the car"`. Completely wrong.

**Fix:** Removed all caption logic. Now always downloads audio as `.webm` (no ffmpeg needed) + transcribes via Groq Whisper with `language: 'af'`. Result is the actual Cape Flats phonetics.

---

### ❌ Problem 13: `File is not defined` in Node.js 18

`new File([buffer], filename)` doesn't exist as a global in Node.js 18. Only added in Node 20.

**Fix:** Replace with Groq SDK's `toFile()` helper (works on all Node versions):
```typescript
import { toFile } from 'groq-sdk'
const file = await toFile(audioBuffer, filename, { type: mimeType })
```

---

### ❌ Problem 14: "Invalid JSON from Gemini" on Translation

Gemini 2.5 Flash is a *thinking* model — internal reasoning tokens leak into `response.text()` before the actual JSON, breaking `JSON.parse()`. Also: YouTube Whisper-transcribed lyrics look like English, causing Gemini to write plain-text explanations instead of filling the JSON schema.

**Fixes applied:**
1. Switched to `gemini-2.0-flash` (non-thinking model)
2. Smarter JSON extraction: `text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)`
3. Updated system prompt: explicitly says YouTube auto-captions may look like English — always return JSON

---

### ❌ Problem 15: Gemini Daily Quota Exhausted (45+ min of 429 errors)

Gemini free tier: ~1,500 req/day, 15 RPM. Daily quota burned through debug test calls. Error persisted for 45+ minutes because daily quotas don't reset until midnight UTC.

**Fix:** Switched translation engine from Gemini to **Groq LLaMA 3.3 70B**:

```typescript
const completion = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' }, // forces pure JSON, no markdown
})
```

Groq free tier: 14,400 req/day at 6,000 RPM = effectively no limit for v1.0 usage.

---

## What Went Smoothly (First Build)

- Prisma schema design (7 models + 4 enums) — written correctly first try
- All 9 API routes — written correctly, no debugging needed
- Docker Compose — only port issue, fixed in one step
- KB seed (20 terms) — ran perfectly first try
- Full Whisper + Groq integration for transcription — worked first try

---

## Decisions Deferred to v1.5

| Decision | Status | Notes |
|---|---|---|
| Authentication | Not in v1.0 | Clerk ready to add |
| Monetization | TBD | freemium / B2B API / ads |
| Mobile app | Not in v1.0 | React Native for v2.0 |
| Non-SDK genres | Not in v1.0 | Blocked by policy |
| Upgrade Node to 20 | When convenient | Unlocks Next.js 15, Tailwind v4 |
