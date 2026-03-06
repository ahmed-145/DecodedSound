/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding-window approach per IP address.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })
 *   // In your route handler:
 *   const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
 *   if (!limiter.check(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimiterOptions {
    /** Time window in milliseconds */
    windowMs: number
    /** Max requests per window */
    max: number
}

interface Entry {
    timestamps: number[]
}

export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
    const store = new Map<string, Entry>()

    // Cleanup stale entries every 5 minutes to prevent memory leaks
    setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of store) {
            entry.timestamps = entry.timestamps.filter(t => now - t < windowMs)
            if (entry.timestamps.length === 0) store.delete(key)
        }
    }, 5 * 60 * 1000).unref?.()

    return {
        /**
         * Returns true if the request is allowed, false if rate-limited.
         */
        check(key: string): boolean {
            const now = Date.now()
            const entry = store.get(key) ?? { timestamps: [] }

            // Remove timestamps outside the window
            entry.timestamps = entry.timestamps.filter(t => now - t < windowMs)

            if (entry.timestamps.length >= max) {
                return false // rate limited
            }

            entry.timestamps.push(now)
            store.set(key, entry)
            return true
        },

        /** How many requests remain for this key */
        remaining(key: string): number {
            const now = Date.now()
            const entry = store.get(key)
            if (!entry) return max
            const recent = entry.timestamps.filter(t => now - t < windowMs)
            return Math.max(0, max - recent.length)
        },
    }
}

// Pre-configured limiters for different route tiers
// Translate: 10 per minute (hits Groq LLaMA — most expensive)
export const translateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

// Audio/YouTube: 5 per minute (hits Groq Whisper)
export const audioLimiter = createRateLimiter({ windowMs: 60_000, max: 5 })

// KB/Ratings: 30 per minute (DB only, lighter)
export const writeLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })
