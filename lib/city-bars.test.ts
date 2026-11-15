import { afterEach, describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  BAR_HIGH,
  BAR_LOW,
  barCentre,
  barItems,
  barName,
  barPlaces,
  barSite,
  barSpot,
  barTurn,
  barWarmth,
  SKY_BARS,
} from './city-bars';
import { blocked } from './city-game';
import { GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { cityMapData } from './city-minimap';
import { PARCOURS_R, parcoursRings, ringSets } from './city-rings';
import { burstClear, resetSkyDock, skyDockBanner, skyDocked, skyDockStep } from './city-skyport';
import { CITY_PORTALS } from './city-space';
import { STATIONS, stationModel } from './city-stations';
import {
  ARCH_OUTER,
  ARCH_TOP,
  ARCH_Z,
  SATURN_RINGS,
  SATURN_X,
  SATURN_Z,
  SPIRE_AT,
} from './city-symbols';
import { spotFor } from './city-travel';
import { BAR_DESIGNS, barModel } from './space-bars';

const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const flat = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(wrapd(ax - bx, TILE_X), wrapd(az - bz, TILE_Z));

/** Bar b's reach: a cylinder round its axis, from its lowest grain to its sign's top, bob and all. */
const reach = (b: (typeof SKY_BARS)[number]) => {
  const M = barModel(b.design);
  return { r: M.r, lo: GROUND + b.h + M.lo - b.bob, hi: GROUND + b.h + M.top + b.bob };
};
/** How far a sphere of radius R at c stands from bar b's reach. */
function fromBar(b: (typeof SKY_BARS)[number], c: Vec3, R: number): number {
  const B = reach(b);
  const h = Math.max(0, flat(c[0], c[2], b.x, b.z) - B.r);
  const y = c[1] < B.lo ? B.lo - c[1] : c[1] > B.hi ? c[1] - B.hi : 0;
  return Math.hypot(h, y) - R;
}

afterEach(() => resetSkyDock());

describe('space bars in the sky (2026-11-14: "a space bar in big flying buildings with terraces")', () => {
  it('floats all five, one of each design, between the high currents and the stations', () => {
    expect(SKY_BARS).toHaveLength(5);
    expect(new Set(SKY_BARS.map((b) => b.design))).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(SKY_BARS.map(barName)).toContain('Flying Saloon');
    for (const b of SKY_BARS) {
      expect(b.h).toBeGreaterThanOrEqual(BAR_LOW);
      expect(b.h).toBeLessThanOrEqual(BAR_HIGH);
      const B = reach(b);
      // Over the high currents' flocks (to 182, lib/city-currents.ts), under 260.
      expect(B.lo - GROUND).toBeGreaterThan(186);
      expect(B.hi - GROUND).toBeLessThan(BAR_HIGH);
      // Inside the strip, out of the annex.
      expect(Math.abs(b.x) + B.r).toBeLessThan(156);
    }
  });

  it('wears a glowing name sign over each, over the deck', () => {
    for (const b of SKY_BARS) {
      const D = BAR_DESIGNS[b.design] as (typeof BAR_DESIGNS)[number];
      expect(D.sign.length).toBeGreaterThan(5);
      expect(barModel(b.design).top).toBeGreaterThan(D.signY);
      expect(D.signY).toBeGreaterThan(20);
    }
  });

  it('keeps clear of the stations, the rings, the parcours, the portals and one another', () => {
    for (const b of SKY_BARS) {
      for (const st of STATIONS) {
        const M = stationModel(st);
        const B = reach(b);
        const h = flat(b.x, b.z, st.x, st.z) - B.r - M.r;
        const lo = GROUND + st.h + M.lo - st.bob;
        const hi = GROUND + st.h + M.hi + st.bob;
        const y = B.hi < lo ? lo - B.hi : B.lo > hi ? B.lo - hi : 0;
        expect(Math.max(h, y), st.name).toBeGreaterThan(10);
      }
      for (const S of ringSets())
        expect(fromBar(b, S.c, Math.max(...S.radii)), S.kind).toBeGreaterThan(10);
      for (const g of parcoursRings()) expect(fromBar(b, g.c, PARCOURS_R)).toBeGreaterThan(10);
      for (const p of CITY_PORTALS) expect(fromBar(b, p.at, 24), p.name).toBeGreaterThan(10);
      for (const o of SKY_BARS) {
        if (o === b) continue;
        expect(flat(b.x, b.z, o.x, o.z)).toBeGreaterThan(200);
      }
    }
  });

  it('keeps clear of the great arch, the Saturn Tower and the Golden Spire’s novas', () => {
    for (const b of SKY_BARS) {
      const r = barModel(b.design).r;
      expect(Math.abs(wrapd(b.z - ARCH_Z, TILE_Z)) - r).toBeGreaterThan(60);
      expect(Math.abs(b.x) + r > ARCH_OUTER || b.h < ARCH_TOP).toBe(true);
      expect(flat(b.x, b.z, SATURN_X, SATURN_Z) - r - Math.max(...SATURN_RINGS)).toBeGreaterThan(
        40,
      );
      expect(flat(b.x, b.z, SPIRE_AT[0], SPIRE_AT[1]) - r).toBeGreaterThan(60);
    }
  });

  it('turns and bobs slowly, from the time alone, its lamps finite and mellow', () => {
    const o = [0, 0, 0, 0, 0, 0];
    for (const [i, b] of SKY_BARS.entries()) {
      const c0 = barCentre(b, 10);
      const c1 = barCentre(b, 10 + 1 / 60);
      expect(Math.abs(c1[1] - c0[1])).toBeLessThan(0.02);
      expect(Math.abs(barTurn(b, 10 + 1 / 60) - barTurn(b, 10))).toBeLessThan(0.001);
      expect(barCentre(b, 33)).toEqual(barCentre(b, 33));
      const M = barModel(b.design);
      for (let s = 0; s < M.count; s += 7) {
        expect(barSite(b, s, 12, c0, 2, o, barWarmth(i, 12))).toBe(true);
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThanOrEqual(0.75);
      }
    }
  });

  it('draws them from far off, and never holds the ship (all light)', () => {
    const b = SKY_BARS[1] as (typeof SKY_BARS)[number];
    const out: Item[] = [];
    barItems([b.x, GROUND + b.h, b.z + 300], [0, 0, -1], 5, 420, out);
    expect(out.some((it) => it.count === barModel(b.design).count)).toBe(true);
    for (const q of SKY_BARS) expect(blocked(barCentre(q, 0))).toBe(false);
  });

  it('shows them on the map and flies there from it, out past their reach, facing them', () => {
    const P = barPlaces();
    expect(P).toHaveLength(5);
    const map = cityMapData().places.filter((p) => p.kind === 'bar');
    expect(map.map((p) => p.name)).toEqual(SKY_BARS.map(barName));
    for (const [i, p] of P.entries()) {
      expect(p.go).toEqual({ bar: i, name: barName(SKY_BARS[i] as (typeof SKY_BARS)[number]) });
      const s = spotFor(p.go as NonNullable<typeof p.go>);
      expect(s).toEqual(barSpot(i));
      const b = SKY_BARS[i] as (typeof SKY_BARS)[number];
      expect(s.pos[2] - b.z).toBeGreaterThan(barModel(b.design).r);
      expect(s.yaw).toBe(0);
      expect(blocked(s.pos)).toBe(false);
    }
  });

  it('docks at a bar flown slowly into its middle, warming its lamps; steering undocks', () => {
    const i = 2;
    const b = SKY_BARS[i] as (typeof SKY_BARS)[number];
    const t = 40;
    const c = barCentre(b, t);
    const hold = skyDockStep([c[0], c[1] + 3, c[2]], 2, false, t);
    expect(hold).not.toBeNull();
    expect(skyDocked()).toBe(STATIONS.length + i);
    expect(skyDockBanner()).toBe(`Docked · ${barName(b)}`);
    expect(barWarmth(i, t + 3)).toBeGreaterThan(0.9);
    expect(skyDockStep([c[0], c[1] + 3, c[2]], 2, true, t + 4)).toBeNull();
    expect(skyDocked()).toBe(-1);
    expect(barWarmth(i, t + 20)).toBeLessThan(0.05);
  });

  it('keeps the fireworks off them', () => {
    for (const b of SKY_BARS) expect(burstClear(barCentre(b, 0), 20)).toBe(false);
  });
});
