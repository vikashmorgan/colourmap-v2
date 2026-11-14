import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { flier, placeShip, STRATOSPHERE, setFly } from './city';
import {
  BIRDS,
  birdAt,
  birdColour,
  flockCentre,
  flockItems,
  flockOf,
  OPEN_R,
  OPEN_REACH,
} from './city-flocks';
import {
  AVE_HEIGHTS,
  avenueWay,
  EXPRESS_X,
  EXPRESS_Z,
  flowLane,
  LANE_COUNT,
  X_HEIGHTS,
  xStreetWay,
  Z_HEIGHTS,
  zStreetWay,
} from './city-flow';
import { BAND_ROWS, BANDS, blocked, blockTower, LANDMARKS, MARGIN } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_I, TILE_Z } from './city-grid';
import {
  chinatownSkyItems,
  FLY_LANTERNS,
  flyingLantern,
  JELLY_HANG,
  LANDMARK_CLEAR,
  LANTERN_FLOOR,
  overChinatown,
  SKY_JELLIES,
  skyJelly,
} from './city-lanterns';
import { lifeItems } from './city-life';
import { codeHeight, codeRise, RISE_MAX_DROP, setRiseClock } from './city-rise';
import { skyGrain } from './city-sky';
import { borrowShare, extraStar, lookUp, STAR_BORROW, twinkle } from './city-stars';

const finite = (v: number[]) => v.every(Number.isFinite);
const roofUnder = (q: Vec3) =>
  GROUND + blockTower(Math.floor(q[0] / BLOCK_X), Math.floor(q[2] / BLOCK_Z)).h;
const sites = (items: Item[]) => {
  const o = [0, 0, 0, 0, 0, 0];
  const out: number[][] = [];
  for (const it of items) for (let s = 0; s < it.count; s++) if (it.site(s, o)) out.push([...o]);
  return out;
};

describe('Life in the city: Chinatown’s flying lanterns and jellyfish (2026-11-14)', () => {
  it('flies the lanterns over Chinatown, above its roofs, rising slowly, warm red and amber', () => {
    for (const n of [0, 1, -1]) {
      for (let j = 0; j < FLY_LANTERNS; j++) {
        let last = flyingLantern(n, j, 0).c;
        for (let t = 0; t < 300; t += 7.3) {
          const L = flyingLantern(n, j, t);
          expect(finite(L.c)).toBe(true);
          expect(overChinatown(L.c[0], L.c[2])).toBe(true);
          expect(L.c[1] - 0.8).toBeGreaterThan(roofUnder(L.c) + 2);
          expect(L.c[1]).toBeGreaterThanOrEqual(LANTERN_FLOOR);
          // Clear of Chinatown's tall landmarks on their crossings.
          for (const M of LANDMARKS.filter((m) => m.d === 'chinatown'))
            expect(Math.hypot(L.c[0] - M.x, L.c[2] - n * TILE_Z - M.z)).toBeGreaterThan(
              LANDMARK_CLEAR - 3,
            );
          expect(L.k).toBeGreaterThanOrEqual(0);
          expect(L.k).toBeLessThanOrEqual(1);
          last = L.c;
        }
        // Slowly: under a unit a second, apart from the climb coming round (faded out there).
        const a = flyingLantern(n, j, 50);
        const b = flyingLantern(n, j, 51);
        if (a.k > 0.05 && b.k > 0.05)
          expect(Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2])).toBeLessThan(1);
        expect(last).toBeDefined();
      }
    }
    // At several heights at once.
    const ys = Array.from({ length: FLY_LANTERNS }, (_, j) => flyingLantern(0, j, 40).c[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(40);
  });

  it('floats jellyfish among them, tendrils clear of the roofs, in rose, amber and violet', () => {
    for (const n of [0, 2]) {
      for (let j = 0; j < SKY_JELLIES; j++) {
        for (let t = 0; t < 200; t += 11) {
          const J = skyJelly(n, j, t);
          expect(overChinatown(J.c[0], J.c[2])).toBe(true);
          expect(J.c[1] - JELLY_HANG * J.k).toBeGreaterThan(roofUnder(J.c) + 4);
          expect(J.pull).toBeGreaterThanOrEqual(0);
          expect(J.pull).toBeLessThanOrEqual(1);
        }
      }
    }
    // From the street in Chinatown, looking along the avenue: lanterns and jellyfish in sight.
    const eye: Vec3 = [0, GROUND + 10, BAND_ROWS * BLOCK_Z - 20];
    const items: Item[] = [];
    chinatownSkyItems(eye, 30, items);
    expect(items.length).toBeGreaterThan(30);
    const all = sites(items);
    expect(all.length).toBeLessThan(FLY_LANTERNS * 22 + SKY_JELLIES * 120 + 1);
    let warm = 0;
    for (const s of all) {
      expect(finite(s)).toBe(true);
      expect(s[1] as number).toBeGreaterThan(GROUND + 30);
      // Never green: red, amber, rose or violet, all of it.
      expect(s[4] as number).toBeLessThanOrEqual(Math.max(s[3] as number, s[5] as number) + 1e-9);
      if ((s[3] as number) > (s[5] as number)) warm++;
    }
    expect(warm).toBeGreaterThan(all.length / 2);
  });
});

describe('Life in the city: the Matrix quarter towers rising and sinking (2026-11-14)', () => {
  const J0 = BANDS.findIndex((b) => b[0] === 'code') * BAND_ROWS;
  const towers = () => {
    const out = [];
    for (let J = J0; J < J0 + BAND_ROWS; J++)
      for (let I = -TILE_I / 2; I < TILE_I / 2; I++) {
        const tw = blockTower(I, J);
        if (tw.shape === 'code') out.push(tw);
      }
    return out;
  };

  it('moves some towers up and down, slowly, within their range, never above their full height', () => {
    const tws = towers();
    const moving = tws.filter((tw) => codeRise(tw.k));
    expect(moving.length).toBeGreaterThan(tws.length * 0.25);
    expect(moving.length).toBeLessThan(tws.length * 0.85);
    for (const tw of tws) {
      const r = codeRise(tw.k);
      if (r) {
        expect(r.period).toBeGreaterThanOrEqual(8);
        expect(r.period).toBeLessThanOrEqual(20);
      }
      let lo = Number.POSITIVE_INFINITY;
      let hi = 0;
      let last = codeHeight(tw.h, tw.k, 0);
      for (let f = 1; f < 25 * 60; f += 3) {
        const h = codeHeight(tw.h, tw.k, f / 60);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
        expect(Math.abs(h - last)).toBeLessThan(0.6);
        last = h;
      }
      expect(hi).toBeLessThanOrEqual(tw.h + 1e-9);
      expect(lo).toBeGreaterThanOrEqual(tw.h * (1 - RISE_MAX_DROP) - 1e-9);
      if (r) expect(hi - lo).toBeGreaterThan(tw.h * 0.15);
      else expect(hi - lo).toBe(0);
    }
  });

  it('keeps its walls at the drawn height, and lifts the ship on a roof that rises under it', () => {
    const tw = towers()
      .filter((x) => codeRise(x.k))
      .sort((a, b) => (codeRise(b.k)?.drop ?? 0) - (codeRise(a.k)?.drop ?? 0))[0];
    expect(tw).toBeDefined();
    if (!tw) return;
    const r = codeRise(tw.k) as NonNullable<ReturnType<typeof codeRise>>;
    // The lowest moment after ten seconds.
    let t = (0.5 - r.phase) * r.period;
    while (t < 10) t += r.period;
    setRiseClock(t);
    const low = codeHeight(tw.h, tw.k, t);
    expect(low).toBeLessThan(tw.h - 3);
    expect(blocked([tw.x, GROUND + low - 1, tw.z])).toBe(true);
    expect(blocked([tw.x, GROUND + low + MARGIN + 0.5, tw.z])).toBe(false);
    // On the roof at its lowest, slow, the roof rising under it: the ship is never inside.
    const dt = 1 / 60;
    setFly(false, [], 0, t - 2 * dt);
    setFly(true, [], dt, t - dt);
    placeShip([tw.x, GROUND + low + MARGIN + 0.3, tw.z + tw.hz - 1], 0);
    const y0 = flier(t).c[1];
    let top = y0;
    for (let i = 0; i < 4 * 60; i++) {
      setFly(true, ['q'], dt, t);
      const { c } = flier(t);
      expect(blocked(c)).toBe(false);
      top = Math.max(top, c[1]);
      t += dt;
    }
    expect(top).toBeGreaterThan(y0 + 1);
    setFly(false, [], 0, 0);
  });
});

describe('Life in the city: the traffic’s flow (2026-11-14)', () => {
  const lanes = (cx: number, cz: number) =>
    Array.from({ length: LANE_COUNT }, (_, l) => flowLane(l, cx, cz, BLOCK_X, BLOCK_Z));

  it('runs every street one way, the next street the other way, crossings alternating too', () => {
    for (const [cx, cz] of [
      [0, 0],
      [400, -900],
      [-1234, 5678],
    ] as const) {
      const ways = new Map<string, number>();
      for (const F of lanes(cx, cz)) {
        if (F.express) continue;
        const key = `${F.axis}:${F.line}:${F.avenue && F.streets === 1 ? F.y : 'street'}`;
        const had = ways.get(key);
        if (had !== undefined) expect(F.sgn).toBe(had);
        ways.set(key, F.sgn);
        if (F.axis === 2 && !F.avenue) expect(F.sgn).toBe(zStreetWay(F.line));
        if (F.axis === 0) expect(F.sgn).toBe(xStreetWay(F.line));
      }
    }
    // Neighbouring streets flow opposite ways.
    for (let I = -5; I < 5; I++)
      if (I !== 0 && I + 1 !== 0) expect(zStreetWay(I)).toBe(-zStreetWay(I + 1));
    for (let J = -5; J < 5; J++) expect(xStreetWay(J)).toBe(-xStreetWay(J + 1));
  });

  it('flows down the avenue with you low and toward you high, crossings higher, express over the roofs', () => {
    expect(avenueWay(0)).toBe(-1);
    expect(avenueWay(1)).toBe(-1);
    expect(avenueWay(2)).toBe(1);
    expect(avenueWay(3)).toBe(1);
    expect(Math.min(...X_HEIGHTS)).toBeGreaterThan(Math.max(...Z_HEIGHTS));
    expect(Math.min(EXPRESS_X, EXPRESS_Z)).toBeGreaterThan(100);
    for (const F of lanes(37, -411)) {
      // None at the height the ship cruises at (21 over the street, three either way).
      expect(Math.abs(F.y - 21)).toBeGreaterThan(4);
      if (F.avenue && F.streets === 1)
        expect(AVE_HEIGHTS).toContain(Math.round(F.y - (F.y % 1 ? 1.2 : 0)));
      if (F.express) expect(F.speed).toBeGreaterThan(14);
      // On the avenue, clear of its middle where the ship flies.
      if (F.line === 0 && F.axis === 2 && !F.express) expect(Math.abs(F.off)).toBeGreaterThan(3);
    }
  });

  it('keeps a lane’s way as it is brought round to the streets ahead', () => {
    for (let l = 0; l < LANE_COUNT; l++) {
      const a = flowLane(l, 0, 0, BLOCK_X, BLOCK_Z);
      for (const k of [1, 5, 13, 40]) {
        const b = flowLane(l, k * BLOCK_X * 3.7, -k * BLOCK_Z * 2.9, BLOCK_X, BLOCK_Z);
        if (a.avenue || b.avenue) continue;
        expect(b.sgn).toBe(a.sgn);
      }
    }
  });
});

describe('Life in the city: murmurations over the whole city (2026-11-14)', () => {
  const cell = (() => {
    for (let a = 0; ; a++) {
      const key = flockOf(a, 3);
      if (key !== null) return { a, b: 3, key };
    }
  })();

  it('flies its flocks high over the roofs, under the stratosphere, the same every time', () => {
    for (const t of [0, 13, 77, 300]) {
      const c = flockCentre(cell.a, cell.b, cell.key, t);
      for (let i = 0; i < BIRDS; i += 7) {
        const q = birdAt(cell.key, c, i, t);
        expect(finite(q)).toBe(true);
        expect(q[1]).toBeGreaterThan(GROUND + 100);
        expect(q[1]).toBeLessThan(STRATOSPHERE);
        expect(birdAt(cell.key, c, i, t)).toEqual(q);
        const rgb = birdColour(i, t);
        expect(Math.max(...rgb)).toBeLessThan(0.4);
      }
    }
    // It changes shape slowly: a bird moves a little from one frame to the next.
    const c0 = flockCentre(cell.a, cell.b, cell.key, 40);
    const c1 = flockCentre(cell.a, cell.b, cell.key, 40 + 1 / 60);
    for (let i = 0; i < BIRDS; i += 13) {
      const a = birdAt(cell.key, c0, i, 40);
      const b = birdAt(cell.key, c1, i, 40 + 1 / 60);
      expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeLessThan(0.3);
    }
    // Most cells have a flock: a few over every part of the city.
    let n = 0;
    for (let a = -5; a < 5; a++) for (let b = -5; b < 5; b++) if (flockOf(a, b) !== null) n++;
    expect(n).toBeGreaterThan(40);
    expect(n).toBeLessThan(100);
  });

  it('opens round a ship flying through it, and stays closed with the ship far off', () => {
    const t = 55;
    const c = flockCentre(cell.a, cell.b, cell.key, t);
    const closed = Array.from({ length: BIRDS }, (_, i) => birdAt(cell.key, c, i, t));
    // The ship right where a bird is, flying along x.
    const at = closed[100] as Vec3;
    const ship = { c: at, f: [1, 0, 0] as Vec3 };
    const dist = (q: Vec3) => Math.hypot(q[0] - at[0], q[1] - at[1], q[2] - at[2]);
    const before = Math.min(...closed.map(dist));
    const open = Array.from({ length: BIRDS }, (_, i) => birdAt(cell.key, c, i, t, ship));
    const after = Math.min(...open.map(dist));
    expect(before).toBeLessThan(1);
    expect(after).toBeGreaterThan(0.6 * OPEN_R);
    // Wider ahead of the ship than behind it.
    const ahead = open.filter((q) => q[0] - at[0] > 6 && q[0] - at[0] < 12);
    const behind = open.filter((q) => at[0] - q[0] > 6 && at[0] - q[0] < 12);
    const side = (q: Vec3) => Math.hypot(q[1] - at[1], q[2] - at[2]);
    if (ahead.length && behind.length)
      expect(Math.min(...ahead.map(side))).toBeGreaterThan(Math.min(...behind.map(side)) - 1e-9);
    // Far off, not a bird moves.
    const far = { c: [at[0] + OPEN_REACH + 200, at[1], at[2]] as Vec3, f: [1, 0, 0] as Vec3 };
    for (let i = 0; i < BIRDS; i += 5) expect(birdAt(cell.key, c, i, t, far)).toEqual(closed[i]);
  });

  it('keeps to a budget: five flocks at most, near the eye', () => {
    const c = flockCentre(cell.a, cell.b, cell.key, 20);
    const items: Item[] = [];
    flockItems([c[0], GROUND + 60, c[2] + 150], 20, items);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(5);
    for (const it of items) expect(it.count).toBe(BIRDS);
    const all = lifeItems([0, GROUND + 10, 200], 30, [0, GROUND + 10, 200], [0, 0, -1]);
    expect(all.reduce((s, it) => s + it.count, 0)).toBeLessThan(6000);
    expect(TILE_Z).toBeGreaterThan(0);
  });
});

describe('Life in the city: stars when you look up (2026-11-14)', () => {
  it('borrows grains for the stars only as the eye looks up, one at a time, easing across', () => {
    expect(lookUp(0)).toBe(0);
    expect(lookUp(-0.5)).toBe(0);
    expect(lookUp(0.6)).toBe(1);
    for (let b = 0; b < STAR_BORROW; b++) {
      expect(borrowShare(b, 0)).toBe(0);
      expect(borrowShare(b, 1)).toBe(1);
    }
    expect(borrowShare(0, 0.5)).toBeGreaterThan(borrowShare(STAR_BORROW - 1, 0.5));
  });

  it('brightens the sky looking up, every borrowed star over the horizon, twinkling gently', () => {
    const c: Vec3 = [0, GROUND + 20, 0];
    const n = 450;
    let ahead = 0;
    let upward = 0;
    for (let L = 0; L < 180; L++) {
      const a = skyGrain(L, n, c, 380, 0, 12, 0);
      const b = skyGrain(L, n, c, 380, 0, 12, 1);
      ahead += a.rgb[0] + a.rgb[1] + a.rgb[2];
      upward += b.rgb[0] + b.rgb[1] + b.rgb[2];
      for (const v of b.rgb) expect(v).toBeLessThanOrEqual(1);
    }
    expect(upward).toBeGreaterThan(1.3 * ahead);
    let band = 0;
    for (let L = 0; L < 300; L++) {
      const s = extraStar(L, 300, 9);
      expect(s.d[1]).toBeGreaterThan(0.04);
      expect(s.k).toBeGreaterThan(0);
      if (L < 150) band++;
    }
    expect(band).toBe(150);
    let step = 0;
    for (let f = 1; f < 600; f++)
      step = Math.max(step, Math.abs(twinkle(5, f / 60) - twinkle(5, (f - 1) / 60)));
    expect(step).toBeLessThan(0.01);
    expect(Math.min(...Array.from({ length: 600 }, (_, f) => twinkle(9, f / 10)))).toBeGreaterThan(
      0.8,
    );
  });
});
