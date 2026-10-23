/**
 * In-memory sliding-window rate limiter.
 *
 * Good enough for v1: each serverless instance keeps its own window, so the
 * real ceiling is `limit × warm instances`, and a cold start resets it. Move
 * to a shared store (Postgres or KV) if abuse ever shows up.
 */
export type RateLimiter = {
  /** Records a hit for `key` and returns true when it is within the limit. */
  hit: (key: string, now?: number) => boolean;
  reset: () => void;
};

export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}

/** The caller's IP from `x-forwarded-for` (first hop), or 'unknown'. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip')?.trim() || 'unknown';
}
