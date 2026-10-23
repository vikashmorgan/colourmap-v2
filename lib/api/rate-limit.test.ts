import { describe, expect, it } from 'vitest';

import { clientIp, createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows up to the limit inside the window, then refuses', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 10)).toBe(true);
    expect(limiter.hit('a', 20)).toBe(false);
    expect(limiter.hit('b', 20)).toBe(true);
  });

  it('slides: old hits fall out of the window', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 999)).toBe(false);
    expect(limiter.hit('a', 1000)).toBe(true);
  });

  it('reset clears every key', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.hit('a', 0);
    limiter.reset();
    expect(limiter.hit('a', 1)).toBe(true);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) => new Request('http://x', { headers });

  it('takes the first x-forwarded-for hop', () => {
    expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip, then unknown', () => {
    expect(clientIp(req({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(req({}))).toBe('unknown');
  });
});
