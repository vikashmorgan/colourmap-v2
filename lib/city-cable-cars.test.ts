/*
 * The city's cable cars (docs/specs/art-city.md, "Favela boxes and the city's cable cars"),
 * 2026-11-15: "add cable cars inside the city."
 */
import { describe, expect, it } from 'vitest';

import { BAR_LOW } from './city-bars';
import {
  CABLE_LINES,
  CAR_DROP,
  CAR_HH,
  CAR_HL,
  CAR_HW,
  CAR_SITES,
  CAR_SPEED,
  type CableSupport,
  CITY_HEAD,
  cabinInto,
  cabinSite,
  cableCarItems,
  cablePlaces,
  cablePylonHolds,
  LINE_GEO,
  PYLON_R,
  PYLON_SITES,
  ropeInto,
  STATION_SITES,
  supportSite,
} from './city-cable-cars';
import { CORRIDOR_HALF, CORRIDOR_X } from './city-corridors';
import { HIGH_STREAMS, MARKET_STREAMS, marketPoint, OUTLIERS, SKY_STREAMS } from './city-currents';
import { FAVELA_PYLONS, favelaHeight } from './city-favela';
import { AVE_HEIGHTS, EXPRESS_X, EXPRESS_Z, X_HEIGHTS, Z_HEIGHTS } from './city-flow';
import { blocked, LANDMARKS, MARGIN } from './city-game';
import {
  AVENUE,
  BLOCK_X,
  BLOCK_Z,
  C,
  GROUND,
  type Item,
  STRIP_X,
  TILE_X,
  TILE_Z,
  wideLine,
} from './city-grid';
import { RAIL } from './city-metro';
import { cityMapData } from './city-minimap';
import { RIVER_Z } from './city-rain';
import { SKY_LANES } from './city-skycars';
import { STATION_LOW } from './city-stations';
import { ARCH_OUTER, ARCH_Z, SATURN_X, SATURN_Z } from './city-symbols';
import { TUBE, TUBE_R } from './city-tube-metro';
import { darterLine } from './city-ufos';

const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const flat = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(wrapd(ax - bx, TILE_X), wrapd(az - bz, TILE_Z));
/** Every rope point of every line, every metre or so: [x, y over the street, z, line]. */
const ropes = (() => {
  const out: number[][] = [];
  const o = [0, 0, 0];
  LINE_GEO.forEach((G, l) =>
    G.spans.forEach((sp, j) => {
      const n = Math.ceil(sp.len);
      for (let i = 0; i <= n; i++)
        for (const side of [-1, 1]) {
          ropeInto(l, j, i / n, side, o);
          out.push([o[0] as number, o[1] as number, o[2] as number, l]);
        }
    }),
  );
  return out;
})();
/** Every cabin's middle and heading, over a long while: [x, y, z, ux, uz, line]. */
const cabins = (() => {
  const out: number[][] = [];
  const o = [0, 0, 0, 0, 0];
  LINE_GEO.forEach((G, l) => {
    // One cabin round its whole loop covers every place any cabin passes.
    for (let t = 0; t < G.loop / CAR_SPEED; t += 1.5) {
      cabinInto(l, 0, t, o);
      out.push([...o, l]);
    }
  });
  return out;
})();
/** A cabin's box corners and edge middles (tile-local, world y), a little out from its walls. */
function cabinBox(c: number[], pad: number): [number, number, number][] {
  const [x, y, z, ux, uz] = c as [number, number, number, number, number];
  const out: [number, number, number][] = [];
  for (const a of [-1, 0, 1])
    for (const b of [-1, 0, 1])
      for (const h of [-1, 1]) {
        const A = a * (CAR_HL + pad);
        const B = b * (CAR_HW + pad);
        out.push([x + ux * A - uz * B, GROUND + y + h * (CAR_HH + pad), z + uz * A + ux * B]);
      }
  return out;
}
const isSupport = (q: [number, number, number]) => cablePylonHolds(q, MARGIN);

describe('the cable car lines (2026-11-15: "add cable cars inside the city")', () => {
  it('runs a few lines: two down the long streets, one up the favela hill', () => {
    expect(CABLE_LINES.length).toBe(3);
    for (const L of CABLE_LINES) {
      expect(L.supports.length).toBeGreaterThanOrEqual(4);
      // A station at each end, pylons between.
      expect(L.supports[0]?.station).toBe(true);
      expect(L.supports[L.supports.length - 1]?.station).toBe(true);
      for (const S of L.supports.slice(1, -1)) expect(S.station).toBe(false);
    }
    // The favela line ends on the first hill's summit, in the annex.
    const fav = CABLE_LINES[2] as (typeof CABLE_LINES)[number];
    const top = fav.supports[fav.supports.length - 1] as CableSupport;
    expect(top.hx).toBeGreaterThan(STRIP_X / 2);
    expect(fav.supports[0]?.hx).toBeLessThan(STRIP_X / 2);
  });

  it('lays the city lines straight down a long street, pylons receding at even steps', () => {
    for (const L of CABLE_LINES.slice(0, 2)) {
      const x = L.supports[0]?.hx as number;
      const steps = new Set<number>();
      L.supports.forEach((S, i) => {
        expect(S.hx).toBe(x);
        expect(S.hy).toBe(CITY_HEAD);
        if (i > 0) steps.add(Math.round(S.hz - (L.supports[i - 1] as CableSupport).hz));
      });
      expect(steps.size).toBe(1);
      expect([...steps][0]).toBe(4 * BLOCK_Z);
      // Along a street's middle, its whole length before the river.
      expect(Math.abs(x / BLOCK_X - Math.round(x / BLOCK_X))).toBeLessThan(1e-9);
      for (const S of L.supports) expect(S.hz).toBeLessThan(RIVER_Z - 60);
    }
  });

  it('keeps off the avenue, the racing corridors and the darters’ lines', () => {
    for (const p of ropes) {
      const lx = wrapd(p[0] as number, TILE_X);
      expect(Math.abs(lx)).toBeGreaterThan(AVENUE + 30);
      for (const x of CORRIDOR_X) expect(Math.abs(lx - x)).toBeGreaterThan(CORRIDOR_HALF + 20);
      for (let li = -6; li <= 6; li++)
        if (darterLine(li)) expect(Math.abs(lx - li * BLOCK_X)).toBeGreaterThan(14);
    }
  });

  it('hangs its ropes between the lanes below and the tube, the barge and the express lanes above', () => {
    for (const p of ropes) {
      const y = p[1] as number;
      if ((p[0] as number) > STRIP_X / 2 + 2) continue;
      expect(y - CAR_DROP - CAR_HH).toBeGreaterThan(
        Math.max(...AVE_HEIGHTS, ...Z_HEIGHTS, ...X_HEIGHTS) + 10,
      );
      expect(y + 2).toBeLessThan(Math.min(EXPRESS_Z, EXPRESS_X) - 30);
      expect(y).toBeLessThan(BAR_LOW);
      expect(y).toBeLessThan(STATION_LOW);
    }
    // And well clear of the tube metro's glass.
    for (let i = 0; i < ropes.length; i += 3) {
      const p = ropes[i] as number[];
      let d = Number.POSITIVE_INFINITY;
      for (let s = 0; s < TUBE.n; s += 4)
        d = Math.min(
          d,
          Math.hypot(
            wrapd((TUBE.pos[s * 3] as number) - (p[0] as number), TILE_X),
            (TUBE.pos[s * 3 + 1] as number) - GROUND - (p[1] as number),
            wrapd((TUBE.pos[s * 3 + 2] as number) - (p[2] as number), TILE_Z),
          ),
        );
      expect(d).toBeGreaterThan(TUBE_R + 20);
    }
  });

  it('keeps its cabins clear of every wall along the way, and the hill’s houses under them', () => {
    for (const c of cabins)
      for (const q of cabinBox(c, 0.4)) {
        if (isSupport(q)) continue;
        expect(blocked(q)).toBe(false);
      }
    // Over the favela, the cabins pass well over its houses (their height a height field).
    for (const c of cabins) {
      if ((c[0] as number) < STRIP_X / 2) continue;
      const bottom = (c[1] as number) - CAR_HH;
      expect(bottom - favelaHeight((c[0] as number) - STRIP_X / 2, c[2] as number)).toBeGreaterThan(
        3,
      );
    }
  });

  it('crosses over the loop metro and keeps off every current and big ship’s line', () => {
    for (const c of cabins) {
      for (let r = 0; r < RAIL.n; r += 8) {
        const d = Math.hypot(
          wrapd((c[0] as number) - (RAIL.pos[r * 3] as number), TILE_X),
          GROUND + (c[1] as number) - (RAIL.pos[r * 3 + 1] as number),
          wrapd((c[2] as number) - (RAIL.pos[r * 3 + 2] as number), TILE_Z),
        );
        expect(d).toBeGreaterThan(12);
      }
    }
    const lanes: number[][] = [];
    for (const S of [...MARKET_STREAMS, ...SKY_STREAMS, ...HIGH_STREAMS])
      for (let s = S.s0; s <= S.s1; s += 2) lanes.push(marketPoint(S, s));
    for (const o of OUTLIERS) {
      if (o.axis === 2) for (let z = 0; z < TILE_Z; z += 3) lanes.push([o.off, GROUND + o.y, z]);
      else
        for (let z = o.off; z < TILE_Z; z += o.every)
          for (let x = -STRIP_X / 2; x < STRIP_X / 2; x += 3) lanes.push([x, GROUND + o.y, z]);
    }
    // Bucketed along the tile, so each rope point meets only the lanes near it.
    const B = 24;
    const buckets = new Map<number, number[][]>();
    for (const q of lanes) {
      const k = Math.floor(((((q[2] as number) % TILE_Z) + TILE_Z) % TILE_Z) / B);
      const list = buckets.get(k) ?? [];
      list.push(q);
      buckets.set(k, list);
    }
    const nb = Math.ceil(TILE_Z / B);
    for (let i = 0; i < ropes.length; i += 2) {
      const p = ropes[i] as number[];
      const k = Math.floor(((((p[2] as number) % TILE_Z) + TILE_Z) % TILE_Z) / B);
      const near = [-1, 0, 1].flatMap((dk) => buckets.get((k + dk + nb) % nb) ?? []);
      for (const q of near) {
        const d = Math.hypot(
          wrapd((q[0] as number) - (p[0] as number), TILE_X),
          (q[1] as number) - GROUND - (p[1] as number),
          wrapd((q[2] as number) - (p[2] as number), TILE_Z),
        );
        // A ship's hull (3.5) and a cabin under the rope, with room between.
        expect(d).toBeGreaterThan(3.5 + CAR_DROP + CAR_HH + 6);
      }
    }
    for (const S of CABLE_LINES.flatMap((L) => L.supports))
      for (const L of SKY_LANES)
        if (S.hy > L.y) expect(Math.abs(wrapd(S.fx - L.x, TILE_X))).toBeGreaterThan(6);
  });

  it('keeps clear of the great arch, the Saturn Tower and the landmarks', () => {
    for (const p of ropes) {
      expect(flat(p[0] as number, p[2] as number, 0, ARCH_Z)).toBeGreaterThan(ARCH_OUTER + 40);
      expect(flat(p[0] as number, p[2] as number, SATURN_X, SATURN_Z)).toBeGreaterThan(60);
      for (const l of LANDMARKS)
        expect(flat(p[0] as number, p[2] as number, l.x, l.z)).toBeGreaterThan(8);
    }
  });
});

describe('its pylons and stations', () => {
  const supports = CABLE_LINES.flatMap((L) => L.supports);

  it('stand on open ground at street corners, off the car lanes, their arms over the street', () => {
    for (const S of supports) {
      if (S.fx > STRIP_X / 2) {
        // In the annex: on the hill, where no house stands.
        expect(
          FAVELA_PYLONS.some(([x, z]) => Math.hypot(S.fx - STRIP_X / 2 - x, S.fz - z) < 1e-6),
        ).toBe(true);
        continue;
      }
      const I = Math.round(S.fx / BLOCK_X);
      const J = Math.round(S.fz / BLOCK_Z);
      const r = PYLON_R;
      expect(Math.abs(S.fx - I * BLOCK_X) - r).toBeGreaterThan((wideLine(2, I) ? 2.6 : 1.7) + 0.5);
      expect(Math.abs(S.fz - J * BLOCK_Z) - r).toBeGreaterThan((wideLine(0, J) ? 2.6 : 1.7) + 0.5);
      expect(Math.hypot(S.hx - S.fx, S.hz - S.fz)).toBeLessThan(6);
      // Its column free of every other wall, from the street up to its head.
      for (let y = GROUND + 2.5; y < GROUND + S.hy; y += 2)
        for (let a = 0; a < 8; a++) {
          const q: [number, number, number] = [
            S.fx + (r + 0.6) * Math.cos(a),
            y,
            S.fz + (r + 0.6) * Math.sin(a),
          ];
          expect(blocked(q) && !isSupport(q)).toBe(false);
        }
    }
  });

  it('are walls (cheaply): the ship cannot fly through one, in any tile; over one it is free', () => {
    for (const S of supports) {
      for (const [ox, oz] of [
        [0, 0],
        [TILE_X, -TILE_Z],
        [-TILE_X, 2 * TILE_Z],
      ] as [number, number][]) {
        const mid: [number, number, number] = [
          S.fx + ox,
          GROUND + (S.fy + S.hy) / 2 + 1,
          S.fz + oz,
        ];
        expect(cablePylonHolds(mid, 0)).toBe(true);
        expect(blocked(mid)).toBe(true);
        const r = PYLON_R;
        expect(cablePylonHolds([mid[0] + r + MARGIN + 0.2, mid[1], mid[2]], MARGIN)).toBe(false);
        expect(cablePylonHolds([mid[0], GROUND + S.hy + MARGIN + 3, mid[2]], MARGIN)).toBe(false);
      }
    }
  });

  it('lets the ship fly through the cables and the cabins', () => {
    for (let i = 0; i < ropes.length; i += 17) {
      const p = ropes[i] as number[];
      const q: [number, number, number] = [
        p[0] as number,
        GROUND + (p[1] as number),
        p[2] as number,
      ];
      if (isSupport(q) || (p[0] as number) > STRIP_X / 2) continue;
      expect(blocked(q)).toBe(false);
    }
  });
});

describe('its cabins', () => {
  it('glide slowly and smoothly, out on one rope and back on the other, never jumping', () => {
    const a = [0, 0, 0, 0, 0];
    const b = [0, 0, 0, 0, 0];
    LINE_GEO.forEach((G, l) => {
      expect(G.cars).toBeGreaterThanOrEqual(3);
      for (let k = 0; k < G.cars; k++)
        for (let t = 0; t < G.loop / CAR_SPEED; t += 0.25) {
          cabinInto(l, k, t, a);
          cabinInto(l, k, t + 0.25, b);
          const d = Math.hypot(
            (a[0] as number) - (b[0] as number),
            (a[1] as number) - (b[1] as number),
            (a[2] as number) - (b[2] as number),
          );
          // At its slow pace (a little less where it rises or falls along a span).
          expect(d).toBeLessThan(CAR_SPEED * 0.25 + 0.05);
          expect(Math.hypot(a[3] as number, a[4] as number)).toBeCloseTo(1, 3);
        }
      // Evenly spaced round the loop.
      cabinInto(l, 0, 0, a);
      cabinInto(l, 0, G.loop / G.cars / CAR_SPEED, b);
      cabinInto(l, 1, 0, a);
      expect(
        Math.hypot((a[0] as number) - (b[0] as number), (a[2] as number) - (b[2] as number)),
      ).toBeLessThan(0.5);
    });
  });

  it('hangs under its rope, warm windows drifting slowly', () => {
    const o = [0, 0, 0, 0, 0, 0];
    const p = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < CAR_SITES; s++) {
      expect(cabinSite(0, 60, 0, 1, 0, C.ivory, 1, s, 5, 0, 0, o)).toBe(true);
      expect(o.every(Number.isFinite)).toBe(true);
      expect((o[1] as number) - GROUND).toBeLessThanOrEqual(60 + CAR_DROP + 1e-9);
      expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.7);
      cabinSite(0, 60, 0, 1, 0, C.ivory, 1, s, 5 + 1 / 60, 0, 0, p);
      for (const c of [3, 4, 5])
        expect(Math.abs((o[c] as number) - (p[c] as number))).toBeLessThan(0.01);
    }
  });
});

describe('drawn', () => {
  const collect = (eye: [number, number, number], t: number) => {
    const out: Item[] = [];
    cableCarItems(eye, t, 600, out);
    return out;
  };

  it('draws ropes, pylons, stations and cabins down the street, finite and mellow', () => {
    const S = CABLE_LINES[0]?.supports[0] as CableSupport;
    // Down the west line's street, from its north station.
    const items = collect([S.hx, GROUND + 60, S.hz - 20], 7);
    expect(items.length).toBeGreaterThan(15);
    expect(items.some((it) => it.count === STATION_SITES)).toBe(true);
    expect(items.some((it) => it.count === PYLON_SITES)).toBe(true);
    expect(items.some((it) => it.count === CAR_SITES)).toBe(true);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of items) {
      expect(it.d).toBeGreaterThanOrEqual(0);
      expect(it.d).toBeLessThanOrEqual(600);
      for (let s = 0; s < it.count; s += 3) {
        if (!it.site(s, o)) continue;
        expect(o.every(Number.isFinite)).toBe(true);
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.7);
      }
    }
  });

  it('draws a pylon tall and slender from its foot to its head, its arm reaching to the ropes', () => {
    const o = [0, 0, 0, 0, 0, 0];
    for (const S of CABLE_LINES.flatMap((L) => L.supports)) {
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      let reach = 0;
      for (let s = 0; s < (S.station ? STATION_SITES : PYLON_SITES); s++) {
        if (!supportSite(S, 0, 1, s, 3, 0, 0, o)) continue;
        lo = Math.min(lo, (o[1] as number) - GROUND);
        hi = Math.max(hi, (o[1] as number) - GROUND);
        reach = Math.max(
          reach,
          Math.hypot((o[0] as number) - S.hx, (o[2] as number) - S.hz) < 2 ? 1 : reach,
        );
      }
      expect(lo).toBeLessThan(S.fy + 3);
      expect(hi).toBeGreaterThan(S.hy);
      expect(reach).toBe(1);
    }
  });

  it('keeps within the grain budget, and draws the copy nearest the eye in any tile', () => {
    for (const eye of [
      [-130, GROUND + 60, 300],
      [130, GROUND + 20, 600],
      [200, GROUND + 80, 930],
      [0, GROUND + 400, 400],
    ] as [number, number, number][]) {
      const sites = collect(eye, 9).reduce((n, it) => n + it.count, 0);
      expect(sites).toBeLessThan(9000);
    }
    const a = collect([-130, GROUND + 60, 300], 4);
    const b = collect([-130 + TILE_X, GROUND + 60, 300 - 2 * TILE_Z], 4);
    expect(b.length).toBe(a.length);
    const o1 = [0, 0, 0, 0, 0, 0];
    const o2 = [0, 0, 0, 0, 0, 0];
    (a[0] as Item).site(3, o1);
    (b[0] as Item).site(3, o2);
    expect((o2[0] as number) - (o1[0] as number)).toBeCloseTo(TILE_X, 3);
    expect((o2[2] as number) - (o1[2] as number)).toBeCloseTo(-2 * TILE_Z, 3);
  });

  it('names its stations on the map', () => {
    const names = cityMapData()
      .places.filter((p) => p.kind === 'cable')
      .map((p) => p.name);
    for (const p of cablePlaces()) expect(names).toContain(p.name);
    expect(cablePlaces().map((p) => p.name)).toContain('Favela summit station');
  });
});
