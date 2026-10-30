import { describe, expect, it } from 'vitest';

import { nextQuote, POWER_QUOTES } from './power-quotes';

describe('the power quotes', () => {
  it('are fifty, each said once, each short enough to read at a glance', () => {
    expect(POWER_QUOTES).toHaveLength(50);
    expect(new Set(POWER_QUOTES.map((q) => q.text)).size).toBe(50);
    for (const q of POWER_QUOTES) {
      expect(q.who.length).toBeGreaterThan(0);
      expect(q.text.length).toBeLessThan(140);
    }
  });

  it('never picks the one already showing, and reaches every other', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const k = nextQuote(7, i / 1000);
      expect(k).not.toBe(7);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(POWER_QUOTES.length);
      seen.add(k);
    }
    expect(seen.size).toBe(POWER_QUOTES.length - 1);
    expect(nextQuote(0, 0.999999)).toBe(POWER_QUOTES.length - 1);
  });
});
