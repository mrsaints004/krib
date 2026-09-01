/**
 * Rate limiter for API routes.
 *
 * Uses an in-memory sliding window counter stored in a Map.
 * On Vercel, each cold start resets the Map. This provides
 * per-instance throttling as a first layer; Supabase GoTrue
 * provides a second layer for auth endpoints.
 *
 * For production at scale, replace with Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
const MAX_STORE_SIZE = 10_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
  // Hard cap: prevent unbounded memory growth
  if (store.size > MAX_STORE_SIZE) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = entries.slice(0, store.size - MAX_STORE_SIZE);
    for (const [key] of toRemove) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Unique namespace to separate different limiters (e.g. "auth:login") */
  prefix: string;
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const storeKey = `${config.prefix}:${key}`;
  const now = Date.now();
  const entry = store.get(storeKey);

  if (!entry || now > entry.resetAt) {
    store.set(storeKey, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Compound rate limiter: checks multiple keys (e.g., IP + email).
 * Returns blocked if ANY key exceeds its limit.
 */
export function checkRateLimitMulti(
  checks: { key: string; config: RateLimitConfig }[]
): RateLimitResult {
  for (const { key, config } of checks) {
    const result = checkRateLimit(key, config);
    if (!result.allowed) return result;
  }
  // All passed — return the last check's result (most restrictive remaining)
  const results = checks.map(({ key, config }) => {
    const storeKey = `${config.prefix}:${key}`;
    const entry = store.get(storeKey);
    return entry ? config.maxRequests - entry.count : config.maxRequests;
  });
  return {
    allowed: true,
    remaining: Math.min(...results),
    retryAfterSeconds: 0,
  };
}
