/**
 * Small in-memory sliding-window rate limiter. Per server instance only, so on
 * serverless it is a speed bump rather than a hard guarantee — good enough to
 * stop a form being hammered from one browser.
 */
export type RateLimiter = {
  /** Records one hit for `key`; returns false when the key is over the limit. */
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
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Keep the map from growing without bound on a long-lived instance.
      if (hits.size > 10_000) {
        for (const [k, times] of hits) {
          if (times.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
