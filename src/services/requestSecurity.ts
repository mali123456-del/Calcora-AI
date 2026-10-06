import { timingSafeEqual } from 'node:crypto';

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface FixedWindowOptions {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}

interface WindowEntry {
  count: number;
  expiresAt: number;
}

export function isAuthorizationTokenValid(
  providedToken: string | undefined,
  expectedToken: string | undefined,
): boolean {
  if (!providedToken || !expectedToken) return false;
  const provided = Buffer.from(providedToken);
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** Small in-memory fixed-window limiter for single-process Express deployments. */
export function createFixedWindowRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: FixedWindowOptions) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error('Rate limit and window duration must be positive.');
  }

  const entries = new Map<string, WindowEntry>();

  return {
    check(key: string, now = Date.now()): RateLimitDecision {
      let entry = entries.get(key);
      if (!entry || now >= entry.expiresAt) {
        entry = { count: 0, expiresAt: now + windowMs };
        entries.set(key, entry);
      }

      if (entry.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
        };
      }

      entry.count += 1;
      if (entries.size > maxKeys) {
        for (const [candidate, value] of entries) {
          if (now >= value.expiresAt) entries.delete(candidate);
          if (entries.size <= maxKeys) break;
        }
        if (entries.size > maxKeys) entries.delete(entries.keys().next().value as string);
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
