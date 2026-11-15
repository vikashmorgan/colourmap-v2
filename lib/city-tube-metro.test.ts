import { describe, expect, it } from 'vitest';

import { BAR_LOW, SKY_BARS } from './city-bars';
import {
  CORRIDOR_HALF,
  CORRIDOR_X,
  GATE_R,
  GATE_Y,
  HIGH_DECK,
  HIGH_DEPTH,
  LOW_DECK,
} from './city-corridors';
import { HIGH_STREAMS, MARKET_STREAMS, marketPoint, OUTLIERS, SKY_STREAMS } from './city-currents';
import { AVE_HEIGHTS, EXPRESS_X, EXPRESS_Z, X_HEIGHTS, Z_HEIGHTS } from './city-flow';
import { blocked, LANDMARKS, MARGIN } from './city-game';
import {
  AVENUE,
  BLOCK_X,
  BLOCK_Z,
  GROUND,
  type Item,
  STRIP_X,
  TILE_X,
  TILE_Z,
  wideLine,
} from './city-grid';
import { crownKey, crownModel } from './city-landmarks';
import { RAIL } from './city-metro';
import { cityMapData, fitView, fitView3D, mapPick, projectMap } from './city-minimap';
import { SKY_LANES } from './city-skycars';
import { TEMPLE_TOWERS } from './city-skyscrapers-plan';
import { STATION_LOW } from './city-stations';
import {
  ARCH_OUTER,
  ARCH_PIER,
  ARCH_Z,
  SATURN_X,
  SATURN_Z,
  SPIRE_NOVA_REACH,
  SPIRE_NOVAS,
} from './city-symbols';
import { spotFor } from './city-travel';
import {
  CAPSULE_CARS,
  CAPSULE_R,
  CAPSULE_SITES,
  CAPSULE_SPEED,
  CAPSULES,
  capsuleS,
  capsuleSite,
  loopGap,
  PILLAR_R,
  TUBE,
  TUBE_PILLARS,
  TUBE_POINTS,
  TUBE_R,
  TUBE_STATIONS,
  tubeItems,
  tubeLine,
  tubePillarHolds,
  tubePlaces,
  tubePoint,
  tubeSpot,
  tubeStationGlow,
} from './city-tube-metro';
import { DARTER_HIGH, darterLine, darterOf, PATROL } from './city-ufos';

const at = (s: number) => {
  const o = [0, 0, 0];
  tubePoint(s, o);
  return o as [number, number, number];
};
const L = TUBE.length;
/** Every metre round the loop. */
const everyMetre = Array.from({ length: Math.floor(L) }, (_, i) => i);
const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const mod = (d: number, P: number) => ((d % P) + P) % P;
const flat = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(wrapd(ax - bx, TILE_X), wrapd(az - bz, TILE_Z));
/** The nearest the tube's middle comes to a point. */
function fromTube(p: number[]): number {
  let d = Number.POSITIVE_INFINITY;
  for (let s = 0; s < TUBE.n; s++) {
    const dx = wrapd((TUBE.pos[s * 3] as number) - (p[0] as number), TILE_X);
    const dy = (TUBE.pos[s * 3 + 1] as number) - (p[1] as number);
    const dz = wrapd((TUBE.pos[s * 3 + 2] as number) - (p[2] as number), TILE_Z);
    d = Math.min(d, Math.hypot(dx, dy, dz));
  }
  return d;
}

describe('the tube metro (2026-11-15: "another metro flying through the city in a tube")', () => {
  it('is one continuous closed loop, evenly sampled', () => {
    expect(TUBE_POINTS.length).toBeGreaterThan(8);
    expect(L).toBeGreaterThan(1200);
    const step = L / TUBE.n;
    for (let s = 0; s < TUBE.n; s++) {
      const a = s * 3;
      const b = ((s + 1) % TUBE.n) * 3;
      const d = Math.hypot(
        (TUBE.pos[b] as number) - (TUBE.pos[a] as number),
        (TUBE.pos[b + 1] as number) - (TUBE.pos[a + 1] as number),
        (TUBE.pos[b + 2] as number) - (TUBE.pos[a + 2] as number),
      );
      // The last step closes the loop back onto the first, as long as every other.
      expect(Math.abs(d - step)).toBeLessThan(0.05);
    }
    // Any s: it loops.
    const a = at(12.5);
    const b = at(12.5 + L);
    for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(a[i] as number, 3);
  });

  it('curves smoothly: no tight bend, and its curvature never jumps', () => {
    const h = 4;
    let prev = -1;
    for (const s of everyMetre) {
      const a = at(s - h);
      const b = at(s);
      const c = at(s + h);
      const k = Math.hypot(
        ...[0, 1, 2].map(
          (i) => ((a[i] as number) + (c[i] as number) - 2 * (b[i] as number)) / h ** 2,
        ),
      );
      // No bend tighter than a radius of 15.
      expect(k).toBeLessThan(1 / 15);
      // A B-spline: its curvature changes smoothly metre to metre.
      if (prev >= 0) expect(Math.abs(k - prev)).toBeLessThan(0.006);
      prev = k;
    }
  });

  it('crosses the Grand Avenue twice, high over the street, a station over it at each crossing', () => {
    let crossings = 0;
    for (const s of everyMetre) {
      const a = at(s);
      const b = at(s + 1);
      if (Math.sign(a[0]) !== Math.sign(b[0])) crossings++;
    }
    expect(crossings).toBe(2);
    expect(TUBE_STATIONS).toHaveLength(2);
    for (const s0 of TUBE_STATIONS) expect(Math.abs(at(s0)[0])).toBeLessThan(1);
  });

  it('flies at mid height, between the lanes and the corridors below and the sky above', () => {
    for (const s of everyMetre) {
      const y = at(s)[1] - GROUND;
      // Over the street channels, the avenue's files and the metro (to 45, rising and falling).
      expect(y - TUBE_R).toBeGreaterThan(Math.max(...AVE_HEIGHTS, ...Z_HEIGHTS, ...X_HEIGHTS) + 25);
      expect(y - TUBE_R).toBeGreaterThan(45 + 20);
      // Under the express lanes (the high currents, big ships and stations are higher still).
      expect(y + TUBE_R).toBeLessThan(Math.min(EXPRESS_Z, EXPRESS_X) - 8);
      expect(y + TUBE_R).toBeLessThan(Math.min(BAR_LOW, STATION_LOW) - 60);
    }
  });

  it('keeps clear of every wall along its path, a body round it free', () => {
    for (const s of everyMetre) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const j = Math.round((s / L) * TUBE.n) % TUBE.n;
        const c = at(s);
        const r = TUBE_R + 1.5;
        const q: [number, number, number] = [
          c[0] +
            (TUBE.side[j * 3] as number) * Math.cos(a) * r +
            (TUBE.up[j * 3] as number) * Math.sin(a) * r,
          c[1] +
            (TUBE.side[j * 3 + 1] as number) * Math.cos(a) * r +
            (TUBE.up[j * 3 + 1] as number) * Math.sin(a) * r,
          c[2] +
            (TUBE.side[j * 3 + 2] as number) * Math.cos(a) * r +
            (TUBE.up[j * 3 + 2] as number) * Math.sin(a) * r,
        ];
        // Its own pillars hold it up from under: everything else keeps away.
        expect(blocked(q) && !tubePillarHolds(q, MARGIN)).toBe(false);
      }
    }
  });

  it("keeps clear of the landmarks' crowns, the spire's novas, the temple towers and the metro", () => {
    for (const s of everyMetre) {
      const c = at(s);
      for (const l of LANDMARKS) {
        const key = crownKey(l.kind, l.set);
        if (!key) continue;
        expect(flat(c[0], c[2], l.x, l.z)).toBeGreaterThan(crownModel(key).r + TUBE_R + 6);
      }
      for (const q of SPIRE_NOVAS) {
        const d = Math.hypot(flat(c[0], c[2], q.x, q.z), c[1] - (GROUND + q.y));
        expect(d).toBeGreaterThan(SPIRE_NOVA_REACH + TUBE_R + 4);
      }
      for (const tw of TEMPLE_TOWERS)
        expect(flat(c[0], c[2], tw.x, tw.z)).toBeGreaterThan(tw.r + TUBE_R + 6);
    }
    for (let s = 0; s < L; s += 3) {
      const c = at(s);
      for (let r = 0; r < RAIL.n; r += 6) {
        const d = Math.hypot(
          wrapd(c[0] - (RAIL.pos[r * 3] as number), TILE_X),
          c[1] - (RAIL.pos[r * 3 + 1] as number),
          wrapd(c[2] - (RAIL.pos[r * 3 + 2] as number), TILE_Z),
        );
        expect(d).toBeGreaterThan(20);
      }
    }
  });

  it('keeps clear of the great arch, the Saturn Tower, the space bars and the flying stations', () => {
    for (const s of everyMetre) {
      const c = at(s);
      // The arch: its piers and opening (the whole of its row across the avenue).
      expect(Math.abs(wrapd(c[2] - ARCH_Z, TILE_Z))).toBeGreaterThan(ARCH_PIER.hz + 200);
      expect(flat(c[0], c[2], 0, ARCH_Z)).toBeGreaterThan(ARCH_OUTER + 100);
      // The Saturn Tower's pole and plinth.
      expect(flat(c[0], c[2], SATURN_X, SATURN_Z)).toBeGreaterThan(30);
      // The bars and stations float far over it.
      for (const b of SKY_BARS) expect(GROUND + b.h - 20 - (c[1] + TUBE_R)).toBeGreaterThan(60);
    }
  });

  it("runs clear of the currents: never in a lane's height where it runs alongside one", () => {
    const lanes: number[][] = [];
    for (const S of [...MARKET_STREAMS, ...SKY_STREAMS, ...HIGH_STREAMS])
      for (let s = S.s0; s <= S.s1; s += 2) lanes.push(marketPoint(S, s));
    // The big ships' lines: the liner and the barge along z, the ferry along x every few bands.
    for (const o of OUTLIERS) {
      if (o.axis === 2) for (let z = 0; z < TILE_Z; z += 3) lanes.push([o.off, GROUND + o.y, z]);
      else
        for (let z = o.off; z < TILE_Z; z += o.every)
          for (let x = -STRIP_X / 2; x < STRIP_X / 2; x += 3) lanes.push([x, GROUND + o.y, z]);
    }
    let near = Number.POSITIVE_INFINITY;
    for (const p of lanes) near = Math.min(near, fromTube(p));
    // A ship's hull (to 3.5 either side) and the glass, with room between.
    expect(near).toBeGreaterThan(TUBE_R + 3.5 + 6);
  });

  it("clears the racing corridors' obstacles by far where it passes over them", () => {
    const top = Math.max(LOW_DECK + 1.2, HIGH_DECK + HIGH_DEPTH, GATE_Y + GATE_R);
    for (const s of everyMetre) {
      const c = at(s);
      const lx = wrapd(c[0], TILE_X);
      if (CORRIDOR_X.some((x) => Math.abs(lx - x) < CORRIDOR_HALF + TUBE_R))
        expect(c[1] - TUBE_R - (GROUND + top)).toBeGreaterThan(30);
    }
  });

  it('flies over the darting UFOs, and its pillars keep off their lines and the flying cars', () => {
    // Every darter's stretch: the glass above the top of its sway, with room.
    for (let li = -12; li <= 12; li++) {
      if (!darterLine(li)) continue;
      for (let cell = 0; cell < 14; cell++) {
        const d = darterOf(li, cell);
        if (!d) continue;
        const x = li * BLOCK_X;
        const z0 = cell * PATROL;
        for (const s of everyMetre) {
          const c = at(s);
          const lz = mod(c[2], TILE_Z);
          if (Math.abs(wrapd(c[0], TILE_X) - x) > d.design.size + 3 + TUBE_R) continue;
          if (lz < z0 || lz > z0 + PATROL) continue;
          expect(c[1] - GROUND - TUBE_R - (DARTER_HIGH + 0.6 + d.design.size)).toBeGreaterThan(4);
        }
      }
    }
    for (const P of TUBE_PILLARS) {
      // Off every flying car's lane it would stand in.
      for (const L of SKY_LANES)
        if (P.top > GROUND + L.y) expect(Math.abs(P.x - L.x)).toBeGreaterThan(4);
      // And off every darter's line by more than its sway.
      const cell = Math.floor(mod(P.z, TILE_Z) / PATROL);
      for (let li = -12; li <= 12; li++)
        if (darterLine(li) && darterOf(li, cell))
          expect(Math.abs(P.x - li * BLOCK_X)).toBeGreaterThan(6);
    }
  });
});

describe('its pillars', () => {
  it('are few: at most eight a tile, tall and slender, each under the tube', () => {
    expect(TUBE_PILLARS.length).toBeGreaterThan(2);
    expect(TUBE_PILLARS.length).toBeLessThanOrEqual(8);
    expect(PILLAR_R).toBeLessThan(1.2);
    for (const p of TUBE_PILLARS) {
      const c = at(p.s);
      expect(Math.hypot(c[0] - p.x, c[2] - p.z)).toBeLessThan(1e-3);
      expect(p.top).toBeCloseTo(c[1] - TUBE_R, 3);
      expect(p.top - GROUND).toBeGreaterThan(60);
    }
  });

  it('are walls (cheaply): the ship cannot fly through one, in any tile', () => {
    for (const p of TUBE_PILLARS) {
      for (const [ox, oz] of [
        [0, 0],
        [TILE_X, -TILE_Z],
        [-TILE_X, 2 * TILE_Z],
      ] as [number, number][]) {
        const mid: [number, number, number] = [p.x + ox, (GROUND + p.top) / 2, p.z + oz];
        expect(tubePillarHolds(mid, 0)).toBe(true);
        expect(blocked(mid)).toBe(true);
        // Just past its reach, nothing of it.
        expect(tubePillarHolds([mid[0] + PILLAR_R + MARGIN + 0.2, mid[1], mid[2]], MARGIN)).toBe(
          false,
        );
        // Over the tube it holds nothing (the tube is light).
        expect(tubePillarHolds([mid[0], p.top + MARGIN + 3, mid[2]], MARGIN)).toBe(false);
      }
    }
  });

  it("stand on open ground: off the avenue, the corridors, the river and the cars' lanes", () => {
    for (const p of TUBE_PILLARS) {
      expect(Math.abs(p.x)).toBeGreaterThan(AVENUE + 10);
      for (const x of CORRIDOR_X) expect(Math.abs(p.x - x)).toBeGreaterThan(CORRIDOR_HALF + 2);
      // Off every street's middle by more than a car keeps from it (2.6 on the wide ones).
      const I = Math.round(p.x / BLOCK_X);
      const J = Math.round(p.z / BLOCK_Z);
      const offX = Math.abs(p.x - I * BLOCK_X);
      const offZ = Math.abs(p.z - J * BLOCK_Z);
      expect(offX - PILLAR_R).toBeGreaterThan((wideLine(2, I) ? 2.6 : 1.7) + 0.5);
      expect(offZ - PILLAR_R).toBeGreaterThan((wideLine(0, J) ? 2.6 : 1.7) + 0.5);
      // Its column free of every other wall, from the street up to the tube.
      for (let y = GROUND + 2.5; y < p.top; y += 2)
        for (let a = 0; a < 6; a++) {
          const q: [number, number, number] = [
            p.x + (PILLAR_R + 0.6) * Math.cos(a),
            y,
            p.z + (PILLAR_R + 0.6) * Math.sin(a),
          ];
          expect(blocked(q) && !tubePillarHolds(q, MARGIN)).toBe(false);
        }
    }
  });
});

describe('its capsules and stations', () => {
  it('shoot round the loop, every capsule inside the glass', () => {
    for (const t of [0, 3.3, 17.9, 120.25]) {
      for (let j = 0; j < CAPSULES; j++) {
        // On, one way, at the one pace.
        expect(loopGap(capsuleS(j, 0, t + 0.1), capsuleS(j, 0, t))).toBeCloseTo(
          CAPSULE_SPEED * 0.1,
          3,
        );
        for (let car = 0; car < CAPSULE_CARS; car++) {
          const sc = capsuleS(j, car, t);
          const o = [0, 0, 0, 0, 0, 0];
          for (let s = 0; s < CAPSULE_SITES; s += 3) {
            expect(capsuleSite(sc, s, 0, 0, o)).toBe(true);
            expect(o.every(Number.isFinite)).toBe(true);
            // Within a few metres of its middle, inside the tube's radius.
            let d = Number.POSITIVE_INFINITY;
            for (let u = sc - 5; u <= sc + 5; u += 0.05) {
              const c = at(u);
              d = Math.min(
                d,
                Math.hypot(
                  (o[0] as number) - c[0],
                  (o[1] as number) - c[1],
                  (o[2] as number) - c[2],
                ),
              );
            }
            expect(d).toBeLessThan(TUBE_R - 0.6);
            expect(d).toBeLessThanOrEqual(CAPSULE_R + 0.05);
          }
        }
      }
    }
  });

  it('a station glows softly while a capsule is in it, and never jumps', () => {
    for (let k = 0; k < TUBE_STATIONS.length; k++) {
      let lo = 1;
      let hi = 0;
      let prev = tubeStationGlow(k, 0);
      for (let t = 0; t < 120; t += 1 / 30) {
        const g = tubeStationGlow(k, t);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(1);
        expect(Math.abs(g - prev)).toBeLessThan(0.08);
        prev = g;
        lo = Math.min(lo, g);
        hi = Math.max(hi, g);
      }
      expect(hi).toBeCloseTo(1, 3);
      expect(lo).toBeCloseTo(0, 3);
    }
  });
});

describe('drawn', () => {
  const collect = (eye: [number, number, number], t: number) => {
    const out: Item[] = [];
    tubeItems(eye, t, 700, out);
    return out;
  };

  it('draws its glass, pillars, capsules and stations near the eye, finite and mellow', () => {
    const s0 = TUBE_STATIONS[0] as number;
    const c = at(s0);
    const items = collect([c[0], c[1] + 10, c[2] + 40], 5);
    expect(items.length).toBeGreaterThan(20);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of items) {
      expect(it.d).toBeGreaterThanOrEqual(0);
      for (let s = 0; s < it.count; s += 7) {
        if (!it.site(s, o)) continue;
        expect(o.every(Number.isFinite)).toBe(true);
        // Mellow: no light past a lit window's glow.
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.8);
      }
    }
  });

  it('keeps within the grain budget: fewer grains a ring the farther, and nothing beyond sight', () => {
    // From the street far off the tube, and from high over the plan.
    for (const eye of [
      [0, GROUND + 10, 300],
      [0, GROUND + 90, 1200],
      [-60, GROUND + 400, 1300],
    ] as [number, number, number][]) {
      const items = collect(eye, 9);
      const sites = items.reduce((n, it) => n + it.count, 0);
      expect(sites).toBeLessThan(25000);
      for (const it of items) expect(it.d).toBeLessThanOrEqual(700);
    }
    // A far chunk spends fewer sites than a near one.
    const near = collect(
      at(400).map((v, i) => (i === 1 ? v + 6 : v)) as [number, number, number],
      0,
    );
    const counts = near.filter((it) => it.weight < 1.4 && it.count !== 200).map((it) => it.count);
    expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts));
  });
});

describe('travel and the map', () => {
  it('a tap on a tube station flies there: over the avenue, clear, facing the station', () => {
    const places = tubePlaces();
    expect(places.map((p) => p.name)).toEqual(['Tube 1', 'Tube 2']);
    for (const [k, p] of places.entries()) {
      const spot = spotFor(p.go as NonNullable<typeof p.go>);
      expect(spot).toEqual(tubeSpot(k));
      expect(blocked(spot.pos)).toBe(false);
      // Facing it: yaw 0 flies -z, π flies +z.
      const fz = -Math.cos(spot.yaw);
      expect(Math.sign(p.z - spot.pos[2])).toBe(Math.sign(fz));
      expect(Math.abs(spot.pos[0])).toBeLessThan(AVENUE - 3);
    }
  });

  it('shows the tube on the map: its loop at its height and its two stations', () => {
    const data = cityMapData();
    expect(data.tube).toEqual(tubeLine());
    expect((data.tube ?? []).length).toBeGreaterThan(100);
    for (const [, , y] of data.tube ?? []) expect(y).toBeGreaterThan(60);
    const names = data.places.filter((p) => p.kind === 'station').map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Tube 1', 'Tube 2', 'Metro 1']));
  });

  it('a tap on a tube station mark on the map picks it, flat or tilted', () => {
    const data = cityMapData();
    for (const v of [fitView(1536, 640), fitView3D(1536, 640)]) {
      const raised = v.tilt > 0.02;
      for (const p of data.places.filter((q) => q.name.startsWith('Tube '))) {
        const [x, y] = projectMap(v, 1536, 640, p.x, raised ? p.y : 0, p.z);
        expect(mapPick([], data, v, 1536, 640, { x: x + 1, y: y - 1 }, false)).toEqual(p.go);
      }
    }
  });
});
