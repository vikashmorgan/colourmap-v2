import { describe, expect, it } from 'vitest';

import {
  CANYON,
  COAST,
  COAST_CLIFF,
  COAST_HALF,
  COAST_RAIL,
  DECK,
  FALLEN,
  frameAt,
  GOLDEN,
  GOLDEN_BANK,
  GOLDEN_HALF,
  gapAround,
  groundAt,
  heightAt,
  loopShape,
  makeTrack,
  makeTrackWorld,
  NEON_HALF,
  NEON_TRACK,
  NIGHT,
  NIGHT_BARRIER,
  NIGHT_HALF,
  onDeck,
  pipeReach,
  pointAt,
  project,
  RACE,
  surfPull,
  type TrackDef,
  twistPose,
  VOID_DEPTH,
} from './track';
import {
  CROSS,
  CROSS_LENGTH,
  compileTrack,
  DIVE_BACK,
  diveRise,
  JUMP,
  jumpRise,
  type TrackData,
  trackOutline,
  validateTrackData,
} from './track-data';
import coast from './tracks/coast.json';
import gold from './tracks/gold.json';
import neon from './tracks/neon.json';
import night from './tracks/night.json';
import { newVehicle, stepVehicle } from './vehicle';

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
/** The Golden Track's waves alone, without its jumps, to compare with how it was by hand. */
const WAVES_ONLY = (d: TrackData): TrackData => ({
  ...d,
  features: (d.features ?? []).filter(
    (f) =>
      f.kind !== 'jump' &&
      f.kind !== 'straight' &&
      f.kind !== 'twist' &&
      f.kind !== 'crossover' &&
      f.kind !== 'dive',
  ),
});

describe('tracks as data', () => {
  it.each(Object.keys(DOCS))('%s compiles to exactly the road it was by hand', (id) => {
    const def = compileTrack(WAVES_ONLY(DOCS[id]));
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

describe('the jump over the void (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const jump = (DOCS.gold.features ?? []).find((f) => f.kind === 'jump') as {
    at: number;
    length: number;
    every: number;
  };

  it('opens a gap across the whole road, every lap of the pattern', () => {
    for (const k of [0, 1, 2]) {
      const a = jump.at + k * jump.every;
      expect(def.gap?.(a - 1)).toBe(false);
      expect(def.gap?.(a + 1)).toBe(true);
      expect(def.gap?.(a + jump.length - 1)).toBe(true);
      expect(def.gap?.(a + jump.length + 1)).toBe(false);
    }
    const t = makeTrack(def);
    const s = jump.at + 50;
    expect(heightAt(t, s, 0)).toBeLessThan(def.elev(s) - VOID_DEPTH + 1);
    expect(heightAt(t, s, 30)).toBeLessThan(def.elev(s) - VOID_DEPTH + 1);
    expect(heightAt(t, s, 0, true)).toBeGreaterThan(def.elev(s) - 5);
  });

  it('runs straight and flat over the jump, a kicker before it, the far side lower', () => {
    for (let s = jump.at - JUMP.STRAIGHT; s < jump.at + jump.length + JUMP.STRAIGHT; s += 5)
      expect(Math.abs(def.curv(s))).toBe(0);
    const base = (s: number) => compileTrack(WAVES_ONLY(DOCS.gold)).elev(s);
    expect(def.elev(jump.at - 0.01) - base(jump.at - 0.01)).toBeCloseTo(JUMP.RAMP_H, 1);
    expect(def.elev(jump.at + jump.length) - base(jump.at + jump.length)).toBeCloseTo(
      -JUMP.LAND_DROP,
      5,
    );
    expect(def.elev(jump.at + jump.length + JUMP.LAND + 1)).toBeCloseTo(
      base(jump.at + jump.length + JUMP.LAND + 1),
      6,
    );
  });

  /** Drives straight at the jump at a speed and reports how it ended. */
  const leap = (kind: 'car' | 'ship', speed: number, throttle = 1, back = 320) => {
    const w = makeTrackWorld(def);
    const s0 = jump.at - back;
    const f = frameAt(w.track, s0);
    w.track.hint = s0;
    const v = newVehicle(kind, f.x, f.y, f.h, heightAt(w.track, s0, 0));
    v.vx = Math.cos(f.h) * speed;
    v.vy = Math.sin(f.h) * speed;
    let flew = false;
    for (let i = 0; i < 60 * 20; i++) {
      stepVehicle(v, { throttle, steer: 0, boost: 0 }, 1 / 60, w, i / 60);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      if (v.air && def.gap?.(q.s)) flew = true;
      if (v.z < heightAt(w.track, q.s, q.u, true) - FALLEN) return { flew, fell: true, s: q.s };
      if (q.s > jump.at + jump.length + 300) return { flew, fell: false, s: q.s };
    }
    return { flew, fell: false, s: project(w.track, v.x, v.y).s };
  };

  it('is cleared flat out, by the car and the ship', () => {
    for (const kind of ['car', 'ship'] as const) {
      const r = leap(kind, 72);
      expect(r.flew).toBe(true);
      expect(r.fell).toBe(false);
    }
  });

  it('is made from a retry: 450 m back, rolling at 45 m/s, throttle down', () => {
    for (const kind of ['car', 'ship'] as const) expect(leap(kind, 45, 1, 450).fell).toBe(false);
  });

  it('finds the gap you fell into, from inside it or just past it', () => {
    const t = makeTrack(def);
    expect(gapAround(t, jump.at + 40)).toEqual({ from: jump.at, to: jump.at + jump.length });
    expect(gapAround(t, jump.at + jump.length + 20)).toEqual({
      from: jump.at,
      to: jump.at + jump.length,
    });
    expect(gapAround(t, jump.at - 600)).toBeNull();
  });

  it('swallows you if you come at it too slowly', () => {
    expect(leap('car', 25, 0).fell).toBe(true);
  });

  it('passes its own checks with the jump', () => {
    expect(validateTrackData(DOCS.gold)).toEqual([]);
  });
});

describe('the level start (2026-11-22)', () => {
  it('runs the Golden grid straight and unbanked, easing into the bends after', () => {
    const def = compileTrack(DOCS.gold);
    for (let s = 0; s <= 140; s += 5) {
      expect(Math.abs(def.curv(s))).toBe(0);
      expect(Math.abs(frameAt(makeTrack(def), s).bank)).toBeLessThan(1e-9);
    }
    expect(Math.abs(def.curv(400))).toBeGreaterThan(0);
  });
});

describe('the blue fire tunnel (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const fire = (DOCS.gold.features ?? []).find((f) => f.kind === 'fire') as {
    at: number;
    length: number;
    every: number;
  };

  it('stands over its stretch of road every lap, nowhere else, and changes no road', () => {
    for (const k of [0, 1]) {
      const a = fire.at + k * fire.every;
      expect(def.fire?.(a - 1)).toBe(false);
      expect(def.fire?.(a + 1)).toBe(true);
      expect(def.fire?.(a + fire.length - 1)).toBe(true);
      expect(def.fire?.(a + fire.length + 1)).toBe(false);
    }
    expect(def.gap?.(fire.at + 10)).toBe(false);
    const plain = compileTrack({
      ...DOCS.gold,
      features: (DOCS.gold.features ?? []).filter((f) => f.kind !== 'fire'),
    });
    for (let s = fire.at - 50; s < fire.at + fire.length + 50; s += 7) {
      expect(def.curv(s)).toBe(plain.curv(s));
      expect(def.elev(s)).toBe(plain.elev(s));
    }
  });

  it('is checked like the rest', () => {
    const bad = {
      ...DOCS.gold,
      features: [{ kind: 'fire', at: 100, length: 0 }],
    } as unknown as TrackData;
    expect(validateTrackData(bad).join(' ')).toContain('fire tunnel');
  });
});

describe('the twist (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const tw = (DOCS.gold.features ?? []).find((f) => f.kind === 'twist') as {
    at: number;
    length: number;
    every: number;
  };
  const t = makeTrack(def);

  it('rolls the road a full turn, easing in and out, on a straight', () => {
    expect(def.twist?.(tw.at - 1)).toBe(0);
    expect(def.twist?.(tw.at + tw.length / 2)).toBeCloseTo(Math.PI, 6);
    expect(def.twist?.(tw.at + tw.length + 1)).toBe(0);
    expect(def.twist?.(tw.at + tw.every + tw.length / 2)).toBeCloseTo(Math.PI, 6);
    for (let s = tw.at - 150; s < tw.at + tw.length + 150; s += 5)
      expect(Math.abs(def.curv(s))).toBe(0);
  });

  it('draws the plain road off the twist, and upside down over its axis halfway', () => {
    const s0 = tw.at - 50;
    const plain = twistPose(t, s0, 5, 1);
    const f0 = frameAt(t, s0);
    expect(plain.roll).toBe(0);
    expect(plain.z).toBeCloseTo(heightAt(t, s0, 5) + 1, 6);
    const mid = tw.at + tw.length / 2;
    const f = frameAt(t, mid);
    const top = twistPose(t, mid, 0, 0);
    // The road's centre is two half-widths up, and the body is upside down.
    expect(top.z - f.e).toBeCloseTo(2 * f.half, 1);
    expect(Math.abs(top.roll)).toBeCloseTo(Math.PI, 6);
    // Its left side has swung to the right.
    const left = twistPose(t, mid, 6, 0);
    const across = (left.x - f.x) * -Math.sin(f.h) + (left.y - f.y) * Math.cos(f.h);
    expect(across).toBeLessThan(-5);
    expect(Number.isFinite(f0.x)).toBe(true);
  });

  it('is checked like the rest', () => {
    const bad = {
      ...DOCS.gold,
      features: [{ kind: 'twist', at: 100, length: 20 }],
    } as unknown as TrackData;
    expect(validateTrackData(bad).join(' ')).toContain('twist');
    expect(validateTrackData(DOCS.gold)).toEqual([]);
  });
});

describe('the crossover (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const t = makeTrack(def);
  const at = ((DOCS.gold.features ?? []).find((f) => f.kind === 'crossover') as { at: number }).at;

  /** Where the road passes over itself: pairs of far-apart stretches within a road's width. */
  const crossings = () => {
    const out: { a: number; b: number; dz: number }[] = [];
    for (let a = at - 200; a < at + CROSS_LENGTH + 200; a += 4) {
      const pa = pointAt(t, a, 0);
      for (let b = a + 300; b < at + CROSS_LENGTH + 400; b += 4) {
        const pb = pointAt(t, b, 0);
        if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < 6) {
          const dz = heightAt(t, b, 0) - heightAt(t, a, 0);
          if (!out.some((o) => Math.abs(o.a - a) < 60 && Math.abs(o.b - b) < 60))
            out.push({ a, b, dz });
        }
      }
    }
    return out;
  };

  it('passes over itself twice, with room for a racer between the decks', () => {
    const c = crossings();
    expect(c).toHaveLength(2);
    for (const k of c) expect(Math.abs(k.dz)).toBeGreaterThan(CROSS.RISE - 4);
    // First you pass over the road you came in on; later, under the stretch you crossed it on.
    expect(c[0].dz).toBeGreaterThan(0);
    expect(c[1].dz).toBeLessThan(0);
  });

  it('comes out heading as it went in, and marks its raised stretch as a bridge', () => {
    const h0 = frameAt(t, at).h;
    const h1 = frameAt(t, at + CROSS_LENGTH).h;
    expect(Math.abs(h1 - h0)).toBeLessThan(1e-6);
    expect(def.bridge?.(at + CROSS.LEAD + 1600)).toBe(true);
    expect(def.bridge?.(at - 100)).toBe(false);
    expect(def.lap).toBe(12000);
  });

  it('is driven flat out without losing the road', () => {
    const w = makeTrackWorld(def);
    const s0 = at - 100;
    const f = frameAt(w.track, s0);
    w.track.hint = s0;
    const v = newVehicle('car', f.x, f.y, f.h, heightAt(w.track, s0, 0));
    v.vx = Math.cos(f.h) * 60;
    v.vy = Math.sin(f.h) * 60;
    let s = s0;
    let worst = 0;
    for (let i = 0; i < 60 * 70 && s < at + CROSS_LENGTH; i++) {
      stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, w, i / 60);
      const q = project(w.track, v.x, v.y, s);
      w.track.hint = q.s;
      s = q.s;
      worst = Math.max(worst, Math.abs(q.u));
      expect(Math.abs(v.z - heightAt(w.track, q.s, q.u))).toBeLessThan(8);
    }
    expect(s).toBeGreaterThan(at + CROSS_LENGTH - 10);
    expect(worst).toBeLessThan(def.half(0) + 2);
  });

  it('passes its own checks', () => {
    expect(validateTrackData(DOCS.gold, 12000)).toEqual([]);
  });
});

describe('the big twist and the curled banks (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const t = makeTrack(def);

  it('can roll the other way, and your line through it changes your speed', () => {
    // The Golden Track's second one became a normal looping (2026-11-22); a road can still have it.
    const big = {
      kind: 'twist',
      at: 4100,
      length: 560,
      every: 10000,
      dir: -1,
      surge: 0.14,
    } as const;
    const def = compileTrack({ ...DOCS.gold, features: [big] } as unknown as TrackData);
    const mid = big.at + big.length / 2;
    expect(def.twist?.(mid)).toBeCloseTo(-Math.PI, 5);
    // Rolling the other way, the fast side swaps too: the right runs downhill, the left uphill.
    expect(def.surge?.(mid, -def.half(mid))).toBeCloseTo(-big.surge, 5);
    expect(def.surge?.(mid, def.half(mid))).toBeCloseTo(big.surge, 5);
    expect(def.surge?.(big.at - 50, 10)).toBe(0);
  });

  it('curls a wall up past the golden lines on a banked bend’s high side, never the low side', () => {
    let s = 0;
    let best = 0;
    for (let q = 200; q < 12000; q += 10) {
      const b = Math.abs(frameAt(t, q).bank);
      if (b > best && !def.twist?.(q)) {
        best = b;
        s = q;
      }
    }
    const f = frameAt(t, s);
    const high = f.bank > 0 ? -1 : 1;
    const edgeH = (side: number) => heightAt(t, s, side * f.half);
    // On the road it is the plain bank; 8 m past the high edge you are well up a curved wall.
    expect(heightAt(t, s, high * f.half * 0.5)).toBeCloseTo(
      f.e - Math.tan(f.bank) * high * f.half * 0.5,
      5,
    );
    const up4 = heightAt(t, s, high * (f.half + 4)) - edgeH(high);
    const up8 = heightAt(t, s, high * (f.half + 8)) - edgeH(high);
    expect(up4).toBeGreaterThan(0.4);
    expect(up8).toBeGreaterThan(up4 * 3);
    // The low side only levels back toward the flat ground (1 in 2), no wall.
    expect(heightAt(t, s, -high * (f.half + 8))).toBeLessThanOrEqual(edgeH(-high) + 4.01);
    expect(pipeReach(t, s, high)).toBeGreaterThan(8);
  });
});

describe('the secret high road (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const t = makeTrack(def);
  const k = (DOCS.gold.features ?? []).find((f) => f.kind === 'deck') as {
    from: number;
    to: number;
  };
  const mid = (k.from + k.to) / 2;

  it('runs a flat deck along the top of the curled wall on the high side, and nowhere else', () => {
    const f = frameAt(t, mid);
    expect(f.bank * 1).toBeLessThan(0); // the high side is the left
    const top = f.e + DECK.H;
    expect(heightAt(t, mid, f.half + DECK.OUT - 2)).toBeCloseTo(top, 5);
    expect(onDeck(t, mid, f.half + DECK.OUT - 2)).toBe(true);
    // Below it the wall still curls up; beyond it the stands fall away.
    expect(heightAt(t, mid, f.half + 3)).toBeLessThan(top - 5);
    expect(heightAt(t, mid, f.half + DECK.OUT + 3)).toBeLessThan(top - 10);
    expect(onDeck(t, mid, -(f.half + 10))).toBe(false);
    expect(onDeck(t, k.to + 40, f.half + 20)).toBe(false);
    t.hint = mid;
    expect(groundAt(t, pointAt(t, mid, f.half + 20).x, pointAt(t, mid, f.half + 20).y).rough).toBe(
      0,
    );
  });

  it('can be reached: flat out up the wall, you come out on top', () => {
    const w = makeTrackWorld(def);
    const s0 = k.from - 120;
    const f = frameAt(w.track, s0);
    w.track.hint = s0;
    const p = pointAt(w.track, s0, 6);
    const v = newVehicle('car', p.x, p.y, f.h, heightAt(w.track, s0, 6));
    v.vx = Math.cos(f.h) * 75;
    v.vy = Math.sin(f.h) * 75;
    let s = s0;
    let up = false;
    for (let i = 0; i < 60 * 12 && s < k.to; i++) {
      stepVehicle(v, { throttle: 1, steer: 1, boost: 1 }, 1 / 60, w, i / 60);
      const q = project(w.track, v.x, v.y, s);
      w.track.hint = q.s;
      s = q.s;
      if (onDeck(w.track, q.s, q.u)) up = true;
    }
    expect(up).toBe(true);
  });

  it('passes its own checks', () => {
    expect(validateTrackData(DOCS.gold, 12000)).toEqual([]);
  });
});

describe('surf: fly off the bend, pulled back (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const t = makeTrack(def);
  const s = 11760; // a right-hand bend at full bank, its high side on the right

  it('cuts the curled wall to a kicker: past its lip, no ground to catch you', () => {
    const f = frameAt(t, s);
    const high = -Math.sign(f.bank);
    const edge = heightAt(t, s, high * f.half);
    expect(heightAt(t, s, high * (f.half + 1))).toBeLessThan(edge + (def.surf ?? 0) + 0.01);
    expect(heightAt(t, s, high * (f.half + 13))).toBeLessThan(f.e - 100);
    // Drawn, it is the flat beyond, not a cliff.
    expect(heightAt(t, s, high * (f.half + 13), true)).toBeGreaterThan(f.e - 100);
    // The low side is as it was.
    expect(heightAt(t, s, -high * (f.half + 5))).toBeGreaterThan(f.e - 100);
  });

  it('pulls you back toward the road and down to it, only where the ground gave way', () => {
    const f = frameAt(t, s);
    const high = -Math.sign(f.bank);
    t.hint = s;
    const out = pointAt(t, s, high * (f.half + 10));
    const p = surfPull(t, out.x, out.y, f.e + 30);
    expect(p).not.toBeNull();
    const nx = -Math.sin(f.h);
    const ny = Math.cos(f.h);
    // Toward the road (against u's side) and down.
    expect(Math.sign((p?.ax ?? 0) * nx + (p?.ay ?? 0) * ny)).toBe(-high);
    expect(p?.az ?? 0).toBeLessThan(0);
    const on = pointAt(t, s, 0);
    expect(surfPull(t, on.x, on.y, f.e + 5)).toBeNull();
  });

  it('flat out off the high side, you fly out and come back down on the road', () => {
    const w = makeTrackWorld(def);
    const s0 = 6150;
    const f = frameAt(w.track, s0);
    w.track.hint = s0;
    const p = pointAt(w.track, s0, 0);
    const v = newVehicle('car', p.x, p.y, f.h, heightAt(w.track, s0, 0));
    v.vx = Math.cos(f.h) * 80;
    v.vy = Math.sin(f.h) * 80;
    let at = s0;
    let flew = false;
    let lowest = 0;
    let rolled = 0;
    for (let i = 0; i < 60 * 9; i++) {
      stepVehicle(v, { throttle: 1, steer: i < 150 ? -1 : 0, boost: 1 }, 1 / 60, w, i / 60);
      const q = project(w.track, v.x, v.y, at);
      w.track.hint = q.s;
      at = q.s;
      const fr = frameAt(w.track, q.s);
      if (Math.abs(q.u) > fr.half + 8 && v.air) flew = true;
      lowest = Math.min(lowest, v.z - fr.e);
      rolled = Math.max(rolled, Math.abs(v.roll));
    }
    const q = project(w.track, v.x, v.y, at);
    expect(flew).toBe(true);
    expect(lowest).toBeGreaterThan(-20); // never lost to the void
    expect(rolled).toBeGreaterThan(0.9); // the surf's lean
    expect(Math.abs(q.u)).toBeLessThan(frameAt(w.track, q.s).half + 1);
    expect(v.air).toBe(false);
  });
});

describe('the normal looping (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const t = makeTrack(def);
  const lp = (DOCS.gold.features ?? []).find(
    (f) => f.kind === 'twist' && (f as { loop?: boolean }).loop,
  ) as { at: number; length: number };

  it('is the second one, and the first still rolls sideways', () => {
    const first = (DOCS.gold.features ?? []).find((f) => f.kind === 'twist') as { at: number };
    expect(first.at).toBeLessThan(lp.at);
    expect(def.looping?.(first.at + 100)).toBeNull();
    expect(def.looping?.(lp.at + 100)?.from).toBeCloseTo(lp.at, 6);
  });

  it('goes over end over end: upside down at the top, back on the straight at its end', () => {
    const mid = lp.at + lp.length / 2;
    const f = frameAt(t, mid);
    const top = twistPose(t, mid, 0, 0);
    expect(top.z - f.e).toBeGreaterThan(100);
    expect(top.roll).toBe(0);
    expect(Math.abs(top.pitch)).toBeCloseTo(Math.PI, 6);
    expect(top.up[2]).toBeCloseTo(-1, 6);
    // Past it, the plain road where the straight carries on.
    const out = twistPose(t, lp.at + lp.length + 5, 0, 0);
    expect(out.pitch).toBe(0);
    expect(out.up).toEqual([0, 0, 1]);
    // Its pose moves smoothly: no jump between neighbouring metres anywhere through it.
    let prev = twistPose(t, lp.at - 2, 0, 0);
    for (let s = lp.at - 1; s < lp.at + lp.length + 2; s += 1) {
      const p = twistPose(t, s, 0, 0);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)).toBeLessThan(3);
      prev = p;
    }
  });

  it('never meets itself where the way up crosses the way down', () => {
    const half = def.half(lp.at);
    // (Near the top the two halves are one and the same road.)
    for (let i = 1; i < 440; i++) {
      const a = loopShape(i / 1000, lp.length, half);
      const b = loopShape(1 - i / 1000, lp.length, half);
      if (Math.abs(a.a - b.a) < 4 && Math.abs(a.z - b.z) < 6)
        expect(Math.abs(a.side - b.side)).toBeGreaterThan(2 * half);
    }
  });

  it('has no straight through its middle: the bypass is the way round', () => {
    expect(def.bypass?.(lp.at + lp.length / 2)).not.toBeNull();
    expect(def.surge?.(lp.at + lp.length / 2, 10)).toBe(0);
  });
});

describe('the blazing deck (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const decks = (DOCS.gold.features ?? []).filter((f) => f.kind === 'deck') as {
    from: number;
    to: number;
    blaze?: boolean;
  }[];

  it('blazes on the second deck only, high on its bend', () => {
    const [plain, hot] = decks;
    expect(hot.blaze).toBe(true);
    expect(def.blaze?.((plain.from + plain.to) / 2)).toBe(false);
    expect(def.blaze?.((hot.from + hot.to) / 2)).toBe(true);
    expect(def.deck?.((hot.from + hot.to) / 2)).toBe(1);
    const t = makeTrack(def);
    expect(frameAt(t, (hot.from + hot.to) / 2).bank).toBeLessThan(-0.5);
  });
});

describe('the dive after the superloop (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const feats = DOCS.gold.features ?? [];
  const dv = feats.find((f) => f.kind === 'dive') as {
    at: number;
    length: number;
    depth: number;
    hold: number;
  };
  const loop = feats.find((f) => f.kind === 'twist' && (f as { loop?: boolean }).loop) as {
    at: number;
    length: number;
  };

  it('comes right after the superloop: straight, down, half back up, then the jump', () => {
    expect(dv.at).toBeGreaterThan(loop.at + loop.length);
    expect(dv.at - (loop.at + loop.length)).toBeLessThan(200);
    for (let s = dv.at; s < dv.at + dv.length; s += 10) expect(Math.abs(def.curv(s))).toBe(0);
    // Downhill all the way to its bottom.
    for (let s = dv.at + 10; s < dv.at + 0.7 * dv.length; s += 10)
      expect(diveRise(s - dv.at, dv)).toBeLessThan(diveRise(s - 10 - dv.at, dv));
    expect(diveRise(0.7 * dv.length, dv)).toBeCloseTo(-dv.depth, 6);
    expect(diveRise(dv.length, dv)).toBeCloseTo(-dv.depth / 2, 6);
    expect(diveRise(dv.length + dv.hold + DIVE_BACK, dv)).toBe(0);
    // The jump's kicker starts where the climb ends, and its gap is within the hold.
    const jump = feats.find((f) => f.kind === 'jump' && f.at > dv.at) as {
      at: number;
      length: number;
    };
    expect(jump.at - JUMP.RAMP).toBe(dv.at + dv.length);
    expect(jump.at + jump.length + JUMP.LAND).toBeLessThan(dv.at + dv.length + dv.hold);
    expect(def.gap?.(jump.at + 10)).toBe(true);
  });

  it('gains you speed: coasting down it you are faster at the bottom', () => {
    const w = makeTrackWorld(def);
    const f0 = frameAt(w.track, dv.at);
    w.track.hint = dv.at;
    const v = newVehicle('car', f0.x, f0.y, f0.h, heightAt(w.track, dv.at, 0));
    v.vx = Math.cos(f0.h) * 30;
    v.vy = Math.sin(f0.h) * 30;
    for (let i = 0; i < 1200; i++) {
      stepVehicle(v, { throttle: 0, steer: 0, boost: 0 }, 1 / 60, w, i / 60);
      const q = project(w.track, v.x, v.y, dv.at);
      if (q.s > dv.at + 0.65 * dv.length) break;
    }
    expect(Math.hypot(v.vx, v.vy)).toBeGreaterThan(40);
  });
});

describe('downslope landings (2026-11-23)', () => {
  it('lands on a slope steepest at touchdown that falls `down` further, then eases back', () => {
    const L = 120;
    const D = 30;
    expect(jumpRise(L, L, D)).toBeCloseTo(-JUMP.LAND_DROP, 6);
    const slope0 = jumpRise(L + 1, L, D) - jumpRise(L, L, D);
    const slope1 = jumpRise(L + JUMP.DOWN_RUN - 1, L, D) - jumpRise(L + JUMP.DOWN_RUN - 2, L, D);
    expect(slope0).toBeLessThan(slope1);
    expect(jumpRise(L + JUMP.DOWN_RUN, L, D)).toBeCloseTo(-JUMP.LAND_DROP - D, 6);
    expect(jumpRise(L + JUMP.DOWN_RUN + JUMP.DOWN_BACK, L, D)).toBeCloseTo(0, 6);
    // Without `down` the landing climbs back as before.
    expect(jumpRise(L + JUMP.LAND, L)).toBe(0);
  });

  it('gives the Neon District two jumps a lap, one landing downhill', () => {
    const def = compileTrack(neon as TrackData);
    expect(def.gap?.(1050)).toBe(true);
    expect(def.gap?.(2900)).toBe(true);
    expect(def.gap?.(1500)).toBe(false);
    const e0 = def.elev(2850 + 120);
    const e1 = def.elev(2850 + 120 + JUMP.DOWN_RUN);
    expect(e1).toBeLessThan(e0 - 20);
  });

  it('refuses a downslope deeper than the limit', () => {
    const bad = {
      ...(neon as TrackData),
      features: [{ kind: 'jump', at: 500, length: 80, down: 90 }],
    };
    expect(validateTrackData(bad).join(' ')).toMatch(/downslope/);
  });
});
