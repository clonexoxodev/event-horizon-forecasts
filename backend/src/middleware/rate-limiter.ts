/**
 * In-memory sliding-window rate limiter for payment endpoints.
 *
 * Works per-key (typically userId or IP). In a Vercel serverless environment
 * each cold start resets the store, which is acceptable because:
 *   - The primary protection is against burst abuse from a single session.
 *   - Provider-side rate limits and database constraints provide the
 *     second layer of defence across cold starts.
 *   - For high-traffic production, swap the Map for a Redis-backed store.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

/**
 * Sweep expired entries periodically so the Map doesn't grow unbounded.
 * Runs at most once every 60 seconds.
 */
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

const sweep = (now: number) => {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3_600_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
};

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check (and record) a request against the rate limit for the given key.
 *
 * @param key       Unique identifier — e.g. `userId`, `ip`, or `ip:userId`.
 * @param config    { maxRequests, windowMs }
 * @returns         Whether the request is allowed, remaining quota, and retry-after.
 */
export const checkRateLimit = (key: string, config: RateLimitConfig): RateLimitResult => {
  const now = Date.now();
  sweep(now);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0]!;
    const retryAfterMs = config.windowMs - (now - oldest);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1_000) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: config.maxRequests - entry.timestamps.length, retryAfterMs: 0 };
};

/**
 * Express middleware factory for rate limiting.
 *
 * Usage:
 *   router.post('/deposit', rateLimit({ maxRequests: 5, windowMs: 60_000 }), handler);
 */
import { Request, Response, NextFunction } from 'express';

export const rateLimit = (config: RateLimitConfig, keyFn?: (req: Request) => string) => {
  const getKey = keyFn || ((req: Request) => {
    const userId = (req as any).user?.userId || (req as any).user?.id || '';
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req);
    const result = checkRateLimit(key, config);

    res.setHeader('X-RateLimit-Limit', String(config.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfterMs: result.retryAfterMs,
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};

/**
 * Preset rate limits for payment endpoints.
 */
export const DEPOSIT_RATE_LIMIT: RateLimitConfig = { maxRequests: 5, windowMs: 60_000 };
export const WITHDRAWAL_RATE_LIMIT: RateLimitConfig = { maxRequests: 3, windowMs: 60_000 };
export const PAYMENT_CALLBACK_RATE_LIMIT: RateLimitConfig = { maxRequests: 10, windowMs: 60_000 };
