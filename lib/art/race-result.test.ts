import { describe, expect, it } from 'vitest';

import { ordinal, raceResult } from './race-result';

const you = { name: 'You', colour: '#c8923f', s: 4800 };

describe('a race’s results', () => {
  it('orders everyone leader first and finds your place', () => {
    const r = raceResult({ time: 101.234, best: 99.5, record: false }, you, [
      { name: 'Cyan', colour: '#18c8e0', s: 4810 },
      { name: 'Rose', colour: '#e04a8a', s: 4700 },
    ]);
    expect(r.standings.map((s) => s.name)).toEqual(['Cyan', 'You', 'Rose']);
    expect(r.place).toBe(2);
    expect(r.time).toBe('1:41.23');
    expect(r.best).toBe('1:39.50');
    expect(r.standings[1].you).toBe(true);
  });

  it('gives you the place on a tie, and none racing alone', () => {
    expect(
      raceResult({ time: 1, best: null, record: true }, you, [{ ...you, name: 'Cyan', s: 4800 }])
        .place,
    ).toBe(1);
    const alone = raceResult({ time: 50, best: null, record: true }, you, []);
    expect(alone.place).toBeNull();
    expect(alone.best).toBeNull();
    expect(alone.record).toBe(true);
  });

  it('says places in words', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
  });
});
