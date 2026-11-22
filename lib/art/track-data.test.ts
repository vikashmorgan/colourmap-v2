import { describe, expect, it } from 'vitest';

import {
  CANYON,
  COAST,
  COAST_CLIFF,
  COAST_HALF,
  COAST_RAIL,
  frameAt,
  GOLDEN,
  GOLDEN_BANK,
  GOLDEN_HALF,
  makeTrack,
  NEON_HALF,
  NEON_TRACK,
  NIGHT,
  NIGHT_BARRIER,
  NIGHT_HALF,
  RACE,
  type TrackDef,
} from './track';
import { compileTrack, type TrackData, trackOutline, validateTrackData } from './track-data';
import coast from './tracks/coast.json';
import gold from './tracks/gold.json';
import neon from './tracks/neon.json';
import night from './tracks/night.json';

const TAU = Math.PI * 2;
const bump = (s: number, c: number, a: number, w: number) => {
  const x = (s - c) / w;
  return Math.abs(x) >= 1 ? 0 : (a * (1 + Math.cos(Math.PI * x))) / 2;
};
const mod = (s: number, m: number) => ((s % m) + m) % m;

/** The tracks as they were written by hand before they became data (2026-11-22): the compiled
 * documents must give exactly the same road. */
const REFERENCE: Record<
  string,
  { curv(s: number): number; elev(s: number): number; half: number }
> = {
  coast: {
    curv: (s) =>
      0.8 * (TAU / 2600) * Math.cos((TAU * s) / 2600) +
      0.35 * (TAU / 1500) * Math.cos((TAU * s) / 1500 + 1.3) +
      0.1 * (TAU / 950) * Math.cos((TAU * s) / 950 + 0.4),
    elev: (s) => 4 * Math.sin((TAU * s) / 1300) + 1.2 * Math.sin((TAU * s) / 600 + 0.7),
    half: 22,
  },
  night: {
    curv: (s) =>
      0.7 * (TAU / 2400) * Math.cos((TAU * s) / 2400 + 0.6) +
      0.35 * (TAU / 1100) * Math.cos((TAU * s) / 1100 + 2.1),
    elev: (s) => {
      const p = mod(s, 1500);
      return bump(p, 600, 4.5, 34) + bump(p, 1100, -3, 50) + 1.5 * Math.sin((TAU * s) / 640);
    },
    half: 14,
  },
  neon: {
    curv: (s) =>
      0.9 * (TAU / 3000) * Math.cos((TAU * s) / 3000 + 0.2) +
      0.3 * (TAU / 1200) * Math.cos((TAU * s) / 1200 + 1.9),
    elev: (s) => {
      const p = mod(s, 1800);
      return bump(p, 700, 5.5, 36) + bump(p, 1400, -3.5, 55) + 2 * Math.sin((TAU * s) / 900);
    },
    half: 16,
  },
  gold: {
    curv: (s) =>
      1.3 * (TAU / 2400) * Math.cos((TAU * s) / 2400) +
      0.6 * (TAU / 900) * Math.cos((TAU * s) / 900 + 0.7),
    elev: (s) => 3 * Math.sin((TAU * s) / 1300) + 1.5 * Math.sin((TAU * s) / 520 + 1.1),
    half: 18,
  },
};

const DOCS = { coast, night, neon, gold } as unknown as Record<string, TrackData>;

describe('tracks as data', () => {
  it.each(Object.keys(DOCS))('%s compiles to exactly the road it was by hand', (id) => {
    const def = compileTrack(DOCS[id]);
    const ref = REFERENCE[id];
    for (let s = -50; s < 12000; s += 7.3) {
      expect(def.curv(s)).toBe(ref.curv(s));
      expect(def.elev(s)).toBe(ref.elev(s));
      expect(def.half(s)).toBe(ref.half);
    }
  });

  it.each(Object.keys(DOCS))('%s passes its own checks', (id) => {
    expect(validateTrackData(DOCS[id])).toEqual([]);
  });

  it('keeps the named constants the views use in step with the documents', () => {
    expect([COAST_HALF, NIGHT_HALF, NEON_HALF, GOLDEN_HALF]).toEqual(
      [22, 14, 16, 18].map((h, i) =>
        [DOCS.coast, DOCS.night, DOCS.neon, DOCS.gold][i].half === h ? h : Number.NaN,
      ),
    );
    expect(DOCS.gold.bank.max).toBe(GOLDEN_BANK);
    expect(DOCS.night.barrier).toBe(NIGHT_BARRIER);
    expect(DOCS.coast.walls).toEqual({
      left: { u: COAST_RAIL, height: 40 },
      right: { u: COAST_CLIFF, height: 30 },
    });
    for (const def of [COAST, NIGHT, NEON_TRACK, GOLDEN])
      expect(def.half(123)).toBe(DOCS[def.id].half);
  });

  it('builds walls from a barrier, or takes them as written', () => {
    expect(compileTrack(DOCS.gold).walls(0).left).toEqual({ u: 19.5, height: 30 });
    expect(compileTrack(DOCS.coast).walls(0)).toEqual({
      left: { u: 28, height: 40 },
      right: { u: -31, height: 30 },
    });
  });

  it('adds curvature and height keyframes on top of the waves', () => {
    const def = compileTrack({
      id: 'gold',
      curve: {
        keys: [
          [0, 0],
          [100, 0.004],
        ],
      },
      rise: {
        keys: [
          [0, 0],
          [200, 10],
        ],
      },
      half: 18,
      lip: 0.4,
      bank: { speed: 60, max: 0.3 },
      terrain: 0,
    });
    expect(def.curv(50)).toBeCloseTo(0.002, 9);
    expect(def.elev(100)).toBeCloseTo(5, 9);
    expect(def.walls(0)).toEqual({ left: null, right: null });
  });
});

describe('checking a track document', () => {
  const ok: TrackData = {
    id: 'gold',
    curve: { waves: [{ amp: 1, period: 2400 }] },
    rise: { waves: [{ amp: 3, period: 1300 }] },
    half: 18,
    lip: 0.45,
    bank: { speed: 70, max: 0.34 },
    terrain: 0,
    barrier: 1.5,
  };

  it('accepts a sound one', () => {
    expect(validateTrackData(ok)).toEqual([]);
  });

  it('names what is wrong, in plain words', () => {
    expect(validateTrackData(null)).toEqual(['not an object']);
    expect(validateTrackData({ ...ok, half: 3 })).toContain('half must be 8–40 m');
    expect(validateTrackData({ ...ok, bank: { speed: 70, max: 1 } })[0]).toMatch(/bank max/);
    expect(
      validateTrackData({
        ...ok,
        rise: {
          keys: [
            [10, 0],
            [5, 1],
          ],
        },
      }),
    ).toContain('keys must run forward');
    expect(
      validateTrackData({ ...ok, features: [{ kind: 'jump', at: 500, length: 400 }] })[0],
    ).toMatch(/jump/);
  });

  it('refuses a bend too tight or a slope too steep to drive', () => {
    expect(validateTrackData({ ...ok, curve: { waves: [{ amp: 3, period: 600 }] } })[0]).toMatch(
      /tighter/,
    );
    expect(validateTrackData({ ...ok, rise: { waves: [{ amp: 60, period: 600 }] } })[0]).toMatch(
      /steeper/,
    );
  });
});

describe('the outline, for the map', () => {
  it('follows the same centre line as the physics', () => {
    const def = compileTrack(DOCS.gold);
    const t = makeTrack(def);
    const o = trackOutline(def, 4000, 10);
    expect(o.points[0]).toMatchObject({ x: 0, y: 0, s: 0 });
    for (const p of o.points.filter((_, i) => i % 37 === 0)) {
      const f = frameAt(t, p.s);
      expect(p.x).toBeCloseTo(f.x, 6);
      expect(p.y).toBeCloseTo(f.y, 6);
      expect(p.e).toBeCloseTo(f.e, 9);
      expect(p.bank).toBeCloseTo(f.bank, 9);
    }
    expect(o.points.at(-1)?.s).toBe(4000);
  });

  it('boxes its points, heights included', () => {
    const o = trackOutline(CANYON as TrackDef, RACE.finish, 20);
    for (const p of o.points) {
      expect(p.x).toBeGreaterThanOrEqual(o.min.x);
      expect(p.y).toBeLessThanOrEqual(o.max.y);
      expect(p.e).toBeGreaterThanOrEqual(o.min.e);
      expect(p.e).toBeLessThanOrEqual(o.max.e);
    }
    expect(o.max.x - o.min.x).toBeGreaterThan(1000);
  });
});
