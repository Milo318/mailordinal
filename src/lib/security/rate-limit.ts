type RateLimitEntry = { count: number; resetAt: number };

const globalRateLimit = globalThis as typeof globalThis & {
  __mailOrdinalRateLimit?: Map<string, RateLimitEntry>;
};

const rateLimitStore =
  globalRateLimit.__mailOrdinalRateLimit ?? new Map<string, RateLimitEntry>();
globalRateLimit.__mailOrdinalRateLimit = rateLimitStore;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * A lightweight same-instance guard. Production deployments should add a
 * distributed limiter or authenticated gateway in front of the route.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  now = Date.now(),
): RateLimitResult {
  const windowMilliseconds = 60_000;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMilliseconds;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}
