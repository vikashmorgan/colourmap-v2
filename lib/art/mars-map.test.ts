import { describe, expect, it } from 'vitest';
import type { Controls } from './drive';
import {
  ARCH_FEET,
  CLEAR,
  craterHeight,
  distToLoop,
  MARS_TERRAIN,
  marsGround,
  marsHeight,
  onLake,
  radiation,
  regionAt,
  SITES,
  siteHit,
} from './mars';
import {
  ARCHES,
  ATOMIC,
  archGate,
  CRATER,
  LAKE_LEVEL,
  LAKES,
  LIGHTHOUSE,
  RAD_REACH,
  REGIONS,
} from './mars-map';
import { START } from './salt-flat-game';
import { newVehicle, stepVehicle } from './vehicle';

describe('the map of Mars', () => {
  it('names a region for each of its places, and nothing out on open Mars', () => {
    for (const r of REGIONS) {
      if (r.id === 'run') continue;
      expect(regionAt(r.x, r.y)?.id).toBe(r.id);
    }
    expect(regionAt(START.x, START.y)?.id).toBe('plain');
    expect(regionAt(30000, -30000)).toBeNull();
  });

  it('names the run along his loop where no other region holds it', () => {
    // Somewhere on his loop that no circle holds.
    let found = false;
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const x = -300 + Math.cos(a) * 1700;
      const y = 2900 + Math.sin(a) * 1700;
      if (distToLoop(x, y) > 100) continue;
      const free = REGIONS.every((r) => r.id === 'run' || Math.hypot(x - r.x, y - r.y) >= r.r);
      if (!free) continue;
      expect(regionAt(x, y)?.id).toBe('run');
      found = true;
      break;
    }
    expect(found).toBe(true);
  });

  it('keeps the regions apart (no middle inside another region)', () => {
    const real = REGIONS.filter((r) => r.id !== 'run');
    for (const a of real)
      for (const b of real) {
        if (a === b) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(Math.max(a.r, b.r) * 0.9);
      }
  });

  it('places every station clear of his loop, the start, the crater, the lakes and the arches', () => {
    const stations = SITES.filter((s) => s.kind !== 'lighthouse');
    expect(stations.length).toBeGreaterThan(10);
    for (const s of stations) {
      expect(distToLoop(s.x, s.y)).toBeGreaterThanOrEqual(s.r + CLEAR.loop);
      expect(Math.hypot(s.x - START.x, s.y - START.y)).toBeGreaterThan(s.r + CLEAR.start);
      expect(Math.hypot(s.x - CRATER.x, s.y - CRATER.y)).toBeGreaterThan(CRATER.R * 1.5);
      for (const l of LAKES) expect(Math.hypot(s.x - l.x, s.y - l.y)).toBeGreaterThan(l.r * 1.35);
      for (const a of ARCHES) expect(Math.hypot(s.x - a.x, s.y - a.y)).toBeGreaterThan(a.r + 60);
    }
  });

  it('stands the atomic plants near the lakes and the lighthouse on the crater rim', () => {
    const plants = SITES.filter((s) => s.kind === 'atomic');
    expect(plants.length).toBe(ATOMIC.length);
    for (const p of plants) expect(regionAt(p.x, p.y)?.id).toBe('lakes');
    const lh = SITES.find((s) => s.kind === 'lighthouse');
    expect(lh).toBeDefined();
    const d = Math.hypot((lh?.x ?? 0) - CRATER.x, (lh?.y ?? 0) - CRATER.y);
    expect(Math.abs(d - CRATER.R)).toBeLessThan(40);
    expect(marsHeight(LIGHTHOUSE.x, LIGHTHOUSE.y)).toBeGreaterThan(CRATER.rim * 0.8);
  });

  it('makes the lighthouse and the arches feet solid, and the way under an arch open', () => {
    expect(siteHit(LIGHTHOUSE.x + LIGHTHOUSE.r * 0.5, LIGHTHOUSE.y)).not.toBeNull();
    for (const f of ARCH_FEET) expect(siteHit(f.x, f.y)).not.toBeNull();
    for (const a of ARCHES) expect(siteHit(a.x, a.y)).toBeNull();
  });

  it('stands each arch across its way: its feet a diameter apart, square to the heading', () => {
    for (const a of ARCHES) {
      const g = archGate(a);
      expect(Math.hypot(g.bx - g.ax, g.by - g.ay)).toBeCloseTo(a.r * 2, 6);
      const along = (g.bx - g.ax) * Math.cos(a.h) + (g.by - g.ay) * Math.sin(a.h);
      expect(Math.abs(along)).toBeLessThan(1e-9);
    }
    expect(ARCHES.filter((a) => a.kind === 'tunnel').length).toBeGreaterThanOrEqual(6);
    expect(ARCHES.some((a) => a.kind === 'real')).toBe(true);
  });
});

describe('the great crater', () => {
  it('is a bowl below the plain with a raised rim that falls away outside', () => {
    expect(craterHeight(0)).toBeCloseTo(-CRATER.depth, 6);
    expect(craterHeight(CRATER.R)).toBeCloseTo(CRATER.rim, 6);
    expect(craterHeight(CRATER.R * 1.5)).toBeLessThan(CRATER.rim * 0.2);
    expect(craterHeight(CRATER.R * 3)).toBeLessThan(0.01);
    // Smooth across the rim: no step.
    expect(Math.abs(craterHeight(CRATER.R - 0.01) - craterHeight(CRATER.R + 0.01))).toBeLessThan(
      0.01,
    );
    expect(marsHeight(CRATER.x, CRATER.y)).toBeLessThan(-CRATER.depth + 1);
  });

  it('slopes gently enough to ride in and out of', () => {
    let steepest = 0;
    for (let d = 0; d < CRATER.R * 2; d += 5) {
      const g = marsGround(CRATER.x + d, CRATER.y);
      steepest = Math.max(steepest, Math.hypot(g.gx, g.gy));
    }
    expect(steepest).toBeLessThan(0.45);
    expect(steepest).toBeGreaterThan(0.1);
  });

  it('throws you off its rim at speed', () => {
    // Driving straight out of the bowl, west to east over the rim, flat out.
    const v = newVehicle('car', CRATER.x + CRATER.R * 0.2, CRATER.y, 0);
    v.vx = 70;
    v.z = marsHeight(v.x, v.y);
    const go: Controls = { throttle: 1, steer: 0, boost: 1 };
    let air = 0;
    for (let i = 0; i < 60 * 20 && v.x < CRATER.x + CRATER.R * 1.6; i++) {
      stepVehicle(v, go, 1 / 60, MARS_TERRAIN, i / 60);
      if (v.air) air += 1 / 60;
    }
    expect(v.x).toBeGreaterThan(CRATER.x + CRATER.R);
    expect(air).toBeGreaterThan(0.3);
  });
});

describe('the radioactive lakes', () => {
  it('lie flat at their level, glowing, and the radiation fades out past their shore', () => {
    for (const l of LAKES) {
      expect(marsHeight(l.x, l.y)).toBeCloseTo(LAKE_LEVEL, 6);
      expect(onLake(l.x, l.y)).toBe(true);
      expect(radiation(l.x + l.r, l.y)).toBeCloseTo(1, 6);
    }
    // West of the westmost lake, alone: half way out, half strength or so.
    const w = LAKES[0];
    const half = radiation(w.x - w.r - RAD_REACH / 2, w.y);
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(0.8);
    expect(radiation(w.x - w.r - RAD_REACH - 1, w.y)).toBe(0);
    expect(radiation(START.x, START.y)).toBe(0);
    expect(onLake(START.x, START.y)).toBe(false);
  });

  it('rises steadily as you come closer', () => {
    const l = LAKES[0];
    let prev = -1;
    for (let d = RAD_REACH + l.r + 50; d >= l.r; d -= 25) {
      const r = radiation(l.x - d, l.y);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});
