import { describe, expect, it } from 'vitest';

import {
  chevronGlow,
  HIGHWAYS,
  highwayShips,
  type NightTheme,
  palette,
  piecesBetween,
  RING_STEP,
  ringAt,
  SURGE_LIFE,
  signLight,
  surgeAccel,
  throughRing,
} from './night-course';
import { CHINATOWN, NEON_TRACK, NIGHT } from './track';

const DEF = { rain: NIGHT, chinatown: CHINATOWN, neon: NEON_TRACK } as const;
const kinds = (theme: NightTheme, s0 = 0, s1 = 1600) =>
  new Set(piecesBetween(theme, DEF[theme], s0, s1).map((p) => p.kind));

describe('night furniture', () => {
  it('gives each theme its own pieces', () => {
    const rain = kinds('rain');
    expect(rain.has('lamp')).toBe(true);
    expect(rain.has('tower')).toBe(true);
    expect(rain.has('arch')).toBe(true);
    expect(rain.has('lanterns')).toBe(false);

    const china = kinds('chinatown');
    expect(china.has('lanterns')).toBe(true);
    expect(china.has('gate')).toBe(true);
    expect(china.has('shophouse')).toBe(true);
    expect(china.has('panel')).toBe(true);
    expect(china.has('tower')).toBe(false);

    const neon = kinds('neon');
    expect(neon.has('bridge')).toBe(true);
    expect(neon.has('tower')).toBe(true);
  });

  it('keeps every piece off the road (the arches and bridges span it, overhead)', () => {
    for (const theme of ['rain', 'chinatown', 'neon'] as const) {
      for (const p of piecesBetween(theme, DEF[theme], 0, 3000)) {
        const half = DEF[theme].half(p.s);
        const overhead =
          p.lift >= 4.5 ||
          ['arch', 'gate', 'temple', 'bridge', 'lights', 'lanterns'].includes(p.kind);
        if (!overhead) expect(Math.abs(p.u)).toBeGreaterThan(half);
      }
    }
  });

  it('is the same every time, and sorted along the track', () => {
    const a = piecesBetween('neon', NEON_TRACK, 200, 900);
    const b = piecesBetween('neon', NEON_TRACK, 200, 900);
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) expect(a[i].s).toBeGreaterThanOrEqual(a[i - 1].s);
  });

  it('lets signs flash only in the Neon District', () => {
    for (const theme of ['rain', 'chinatown'] as const) {
      expect(piecesBetween(theme, DEF[theme], 0, 3000).some((p) => p.flash)).toBe(false);
    }
    const neon = piecesBetween('neon', NEON_TRACK, 0, 6000).filter((p) => p.kind === 'sign');
    const flashing = neon.filter((p) => p.flash);
    expect(flashing.length).toBeGreaterThan(0);
    expect(flashing.length / neon.length).toBeLessThan(0.3);
    expect(signLight({ flash: false, id: 3 }, 1.234)).toBe(1);
    const seen = new Set([0, 0.2, 0.4, 0.6, 0.8].map((t) => signLight({ flash: true, id: 3 }, t)));
    expect(seen.size).toBe(2);
  });

  it('runs the LED chevrons as a soft wave, never dark', () => {
    for (let t = 0; t < 3; t += 0.1) {
      const g = chevronGlow(10, t);
      expect(g).toBeGreaterThanOrEqual(0.25);
      expect(g).toBeLessThanOrEqual(1);
    }
  });

  it('has the palettes the themes are named for', () => {
    expect(palette('chinatown').length).toBeGreaterThan(0);
    expect(palette('neon').length).toBeGreaterThan(0);
  });
});

describe('ship highways', () => {
  it('streams ships at their own spacing, moving with time', () => {
    const now = highwayShips(0, 0, 0, 400);
    const later = highwayShips(0, 0.25, 0, 400);
    expect(now.length).toBeGreaterThan(5);
    for (let i = 1; i < now.length; i++) expect(now[i] - now[i - 1]).toBeCloseTo(HIGHWAYS[0].gap);
    expect(later[0]).not.toBeCloseTo(now[0]);
    for (const s of later) expect(s).toBeGreaterThanOrEqual(0);
  });
});

describe('boost rings', () => {
  it('stand on Night Rain and the Neon District, not in Chinatown', () => {
    expect(ringAt('chinatown', 1, 10)).toBeNull();
    const r = ringAt('neon', 2, 13);
    expect(r?.s).toBe(2 * RING_STEP + 180);
    expect(Math.abs(r?.u ?? 99) + (r?.r ?? 0)).toBeLessThanOrEqual(13);
  });

  it('count a pass only when you cross it, through the hoop', () => {
    const r = ringAt('rain', 1, 10);
    if (!r) throw new Error('ring');
    expect(throughRing(r, r.s - 1, r.s + 1, r.u, 1)).toBe(true);
    expect(throughRing(r, r.s - 1, r.s + 1, r.u + 9, 1)).toBe(false);
    expect(throughRing(r, r.s + 1, r.s + 2, r.u, 1)).toBe(false);
  });

  it('surge forward softly and fade out', () => {
    expect(surgeAccel(-0.1)).toBe(0);
    expect(surgeAccel(0)).toBe(0);
    expect(surgeAccel(0.3)).toBeGreaterThan(5);
    expect(surgeAccel(SURGE_LIFE * 0.8)).toBeLessThan(surgeAccel(0.3));
    expect(surgeAccel(SURGE_LIFE)).toBe(0);
  });
});
