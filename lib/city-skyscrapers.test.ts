import { afterEach, describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { flier, makeParticles, PHASES, pieceAt, pieceCamera, placeShip, SKY, setFly } from './city';
import { studioBlockHeight } from './city-big';
import { BUILDING_SPOTS, buildingModel } from './city-buildings-15';
import {
  HIGH_STREAMS,
  highCurrent,
  highShip,
  loopAt,
  OUTLIERS,
  SKY_STREAMS,
} from './city-currents';
import { aliveMonuments, blocked, blockTower, districtAt, districtOf } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_X, wrap } from './city-grid';
import { orbitShip, orbitsOf } from './city-orbits';
import { RIVER_ROW, RIVER_W, RIVER_Z } from './city-rain';
import {
  bridgeEnds,
  bridgeSet,
  currentLift,
  LIFT_Y,
  STYLE_SPAN,
  skyscraperHolds,
  skyscraperItems,
  TEMPLE_BRIDGES,
  TEMPLE_TOWERS,
  TOWER_SITES,
  towerReach,
} from './city-skyscrapers';
import { STATION_LOW } from './city-stations';
import { strokePoint } from './city-strokes';

const G = GROUND;
const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
const all = () => true;
/** The racing corridors either side of the avenue, and the avenue itself. */
const CORRIDOR = 3 * BLOCK_X;

afterEach(() => setFly(false, [], 0, 0));

/** The temples' quarter's blocks in the first tile (east of the avenue, rows 24 to 31). */
function quarterBlocks() {
  const out = [];
  for (let I = 0; I <= 5; I++) for (let J = 24; J <= 31; J++) out.push(blockTower(I, J));
  return out;
}

describe('Temple skyscrapers: where they stand', () => {
  it('stands five to seven in the Temples quarter, each on an open block, well apart', () => {
    expect(TEMPLE_TOWERS.length).toBeGreaterThanOrEqual(5);
    expect(TEMPLE_TOWERS.length).toBeLessThanOrEqual(7);
    for (const T of TEMPLE_TOWERS) {
      expect(districtAt(T.x, T.z)).toBe('temples');
      expect(districtOf(T.I, T.J)).toBe('temples');
      expect(blockTower(T.I, T.J).shape).toBe('plaza');
      // Its block's middle row, its footprint inside the block, 4.5 or more from every street.
      // Back from the river's bank (z 828) by 4.5 or more.
      expect(T.z).toBeCloseTo((T.J + 0.5) * BLOCK_Z, 6);
      // Off the river's row and its neighbours (their walls stay where they were).
      expect(Math.abs(T.J - RIVER_ROW)).toBeGreaterThan(1);
      expect(T.z - T.r).toBeGreaterThan(RIVER_Z + RIVER_W + 20);
      expect(T.x - T.r).toBeGreaterThanOrEqual(T.I * BLOCK_X + 4.4);
      expect(T.x + T.r).toBeLessThanOrEqual((T.I + 1) * BLOCK_X - 4.4);
      expect(T.z - T.r).toBeGreaterThanOrEqual(T.J * BLOCK_Z + 4.4);
      expect(T.z + T.r).toBeLessThanOrEqual((T.J + 1) * BLOCK_Z - 4.4);
    }
    for (let i = 0; i < TEMPLE_TOWERS.length; i++)
      for (let j = i + 1; j < TEMPLE_TOWERS.length; j++) {
        const A = TEMPLE_TOWERS[i] as (typeof TEMPLE_TOWERS)[number];
        const B = TEMPLE_TOWERS[j] as (typeof TEMPLE_TOWERS)[number];
        // Never on neighbouring blocks: a diagonal block away at the nearest, open air between.
        expect(Math.abs(A.I - B.I) + Math.abs(A.J - B.J), `${A.name} / ${B.name}`).toBeGreaterThan(
          1,
        );
        expect(Math.hypot(A.x - B.x, A.z - B.z)).toBeGreaterThan(40);
        const gap = Math.max(Math.abs(A.x - B.x) - A.r - B.r, Math.abs(A.z - B.z) - A.r - B.r);
        expect(gap).toBeGreaterThanOrEqual(9);
      }
  });

  it('lines them up into views: two or more share a file down the quarter', () => {
    const files = new Map<number, number>();
    for (const T of TEMPLE_TOWERS) files.set(T.x, (files.get(T.x) ?? 0) + 1);
    expect([...files.values()].filter((n) => n >= 2).length).toBeGreaterThanOrEqual(2);
  });

  it('makes them clearly the tallest in the quarter', () => {
    const blocksTop = Math.max(
      ...quarterBlocks().map((b) =>
        b.shape === 'studio' && b.studio ? studioBlockHeight(b.studio) : b.h,
      ),
    );
    const echo = BUILDING_SPOTS.filter((b) => b.d === 'temples').map((b) => buildingModel(b).top);
    for (const T of TEMPLE_TOWERS) expect(T.top).toBeGreaterThan(blocksTop + 30);
    expect(Math.max(...TEMPLE_TOWERS.map((T) => T.top))).toBeGreaterThan(Math.max(...echo) + 10);
    // Under the stations and the higher streams.
    for (const T of TEMPLE_TOWERS) {
      expect(T.top).toBeLessThan(STATION_LOW - 20);
      expect(T.top).toBeLessThan((HIGH_STREAMS[0]?.y ?? 186) - 10);
    }
  });

  it('keeps the racing corridors (x ±78) and the avenue clear: no tower, no pier', () => {
    for (const T of TEMPLE_TOWERS) {
      // Out of the corridor (66 to 90) and the slimmed columns beside it (2 and 3).
      expect(T.I).toBeGreaterThanOrEqual(4);
      expect(T.x - T.r).toBeGreaterThanOrEqual(4 * BLOCK_X + 4.4);
      expect(Math.abs(T.x - CORRIDOR) - T.r).toBeGreaterThanOrEqual(12 + 8);
      expect(T.x - T.r).toBeGreaterThan(BLOCK_X);
    }
    // The bridges have no piers: nothing of theirs comes down under 118.
    for (let bi = 0; bi < TEMPLE_BRIDGES.length; bi++)
      expect(bridgeSet(bi).lo[1]).toBeGreaterThan(G + 118);
    // Down the corridor and the avenue through the quarter, under the bridges, nothing is in the way.
    for (let z = 24 * BLOCK_Z; z <= 32 * BLOCK_Z; z += 2)
      for (let y = 4; y < 118; y += 4)
        for (const x of [CORRIDOR, -CORRIDOR, 0])
          expect(skyscraperHolds([x, G + y, z], 3), `${x} ${y} ${z}`).toBe(false);
  });
});

describe('Temple skyscrapers: the long bridges', () => {
  it('joins every tower, pairs only, long spans', () => {
    const joined = new Set<number>();
    for (const B of TEMPLE_BRIDGES) {
      expect(B.a).not.toBe(B.b);
      joined.add(B.a);
      joined.add(B.b);
      const { p, q } = bridgeEnds(B);
      const A = TEMPLE_TOWERS[B.a] as (typeof TEMPLE_TOWERS)[number];
      const Z = TEMPLE_TOWERS[B.b] as (typeof TEMPLE_TOWERS)[number];
      // Each end on its tower's wall, a long span between.
      for (const [e, T] of [
        [p, A],
        [q, Z],
      ] as const) {
        const w = towerReach(T, B.y);
        expect(Math.max(Math.abs(e[0] - T.x), Math.abs(e[2] - T.z))).toBeGreaterThan(w - 0.5);
        expect(Math.max(Math.abs(e[0] - T.x), Math.abs(e[2] - T.z))).toBeLessThanOrEqual(w + 1e-6);
        expect(B.y + STYLE_SPAN[B.style][1]).toBeLessThan(T.top - 4);
      }
      expect(Math.hypot(q[0] - p[0], q[2] - p[2])).toBeGreaterThan(40);
    }
    expect(joined.size).toBe(TEMPLE_TOWERS.length);
    expect(new Set(TEMPLE_BRIDGES.map((b) => b.style)).size).toBeGreaterThanOrEqual(3);
  });

  it('leaves room to fly under, over and between, clear of the express lanes', () => {
    for (let bi = 0; bi < TEMPLE_BRIDGES.length; bi++) {
      const B = TEMPLE_BRIDGES[bi] as (typeof TEMPLE_BRIDGES)[number];
      const S = bridgeSet(bi);
      // Over the express lanes (112, 120) by four, under ordinary flight's ceiling with room over.
      expect(S.lo[1]).toBeGreaterThanOrEqual(G + 124 - 1e-6);
      expect(S.hi[1]).toBeLessThan(SKY - 5);
      const { p, q } = bridgeEnds(B);
      const mid: Vec3 = [(p[0] + q[0]) / 2, 0, (p[2] + q[2]) / 2];
      expect(blocked([mid[0], G + B.y, mid[2]])).toBe(true);
      expect(blocked([mid[0], G + B.y + STYLE_SPAN[B.style][0] - 6, mid[2]])).toBe(false);
      expect(blocked([mid[0], G + B.y + STYLE_SPAN[B.style][1] + 3, mid[2]])).toBe(false);
      // Other bridges and towers stay away from its span.
      for (let s = 0.1; s < 0.9; s += 0.05) {
        const x = p[0] + (q[0] - p[0]) * s;
        const z = p[2] + (q[2] - p[2]) * s;
        TEMPLE_TOWERS.forEach((T, ti) => {
          if (ti === B.a || ti === B.b) return;
          // Threading between two towers, five or more from their walls.
          expect(Math.max(Math.abs(x - T.x), Math.abs(z - T.z))).toBeGreaterThan(T.r + 5);
        });
      }
    }
    // Between two towers, low down, open air.
    const A = TEMPLE_TOWERS[0] as (typeof TEMPLE_TOWERS)[number];
    const B = TEMPLE_TOWERS[2] as (typeof TEMPLE_TOWERS)[number];
    expect(blocked([(A.x + B.x) / 2, G + 70, (A.z + B.z) / 2])).toBe(false);
  });
});

describe('Temple skyscrapers: the ways of the sky round them', () => {
  it('lifts the high currents over them, smoothly, under the higher streams', () => {
    expect(LIFT_Y).toBeLessThan((HIGH_STREAMS[0]?.y ?? 186) - 6);
    let near = 0;
    for (let a = -1; a <= 1; a++)
      for (let b = -3; b <= 4; b++) {
        const H = highCurrent(a, b);
        for (let s = 0; s < 1200; s++) {
          const { p } = loopAt(H, (s / 1200) * Math.PI * 2);
          for (const T of TEMPLE_TOWERS) {
            const lx = T.x + Math.round((p[0] - T.x) / TILE_X) * TILE_X;
            const d = Math.max(Math.abs(p[0] - lx), Math.abs(wrap(p[2] - T.z + 952, 1904) - 952));
            if (d > T.r + 20) continue;
            near++;
            expect(p[1] - G).toBeGreaterThan(T.top + 5);
          }
          expect(p[1] - G).toBeLessThan(184);
          expect(skyscraperHolds(p, 3)).toBe(false);
        }
        for (let i = 0; i < 12; i++)
          for (let f = 0; f < 300; f += 7)
            expect(skyscraperHolds(highShip(H, i, f).c, 2)).toBe(false);
      }
    expect(near).toBeGreaterThan(0);
    // Far from them, untouched.
    expect(currentLift(-300, 100, 150)).toBe(150);
  });

  it('threads the highway through the gates, the barge under the arch, the high streams over all', () => {
    for (const S of SKY_STREAMS)
      for (let s = S.s0; s <= S.s1; s += 0.5)
        for (const off of [-1.2, 0, 1.2])
          expect(skyscraperHolds([S.c + off, G + S.y, s], 1.5), `${S.c} ${s}`).toBe(false);
    const barge = OUTLIERS.find((o) => o.kind === 'barge');
    expect(barge).toBeDefined();
    if (barge)
      for (let z = 0; z < 56 * BLOCK_Z; z += 1)
        for (const [dx, dy] of [
          [0, 0],
          [3.5, -3.6],
          [-3.5, 2.6],
          [3.2, 0],
          [-3.2, 0],
        ] as const)
          expect(skyscraperHolds([barge.off + dx, G + barge.y + dy, z], 1)).toBe(false);
    for (const S of HIGH_STREAMS)
      for (let s = S.s0; s <= S.s1; s += 2)
        expect(skyscraperHolds([S.c, G + S.y, s], 4)).toBe(false);
  });

  it('keeps the monuments’ orbits clear of them', () => {
    const mons = aliveMonuments();
    mons.forEach((M, mi) => {
      if (Math.hypot(M.x - 100, M.z - 950) > 260) return;
      for (const O of orbitsOf(M, mi, 0, 0, blockTower))
        for (let i = 0; i < 40; i++)
          for (const t of [0, 3, 9]) expect(skyscraperHolds(orbitShip(O, i, t).p, 2)).toBe(false);
    });
  });

  it('puts no grain of theirs in a street lane or a current: towers inside their blocks, bridges high', () => {
    const eye: Vec3 = [100, G + 120, 760];
    const out: Item[] = [];
    skyscraperItems(eye, 5, 600, 160, all, out);
    expect(out.length).toBeGreaterThanOrEqual(TEMPLE_TOWERS.length + TEMPLE_BRIDGES.length);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out)
      for (let s = 0; s < Math.min(it.count, 4000); s += 3) {
        if (!it.site(s, o)) continue;
        const y = (o[1] as number) - G;
        // Under the lifted high currents by four or more.
        expect(y).toBeLessThan(LIFT_Y - 4);
        // Low down, only inside the blocks (off every street's line by four), so out of the lanes.
        if (y < 124) {
          const lx = wrap(o[0] as number, BLOCK_X);
          const lz = wrap(o[2] as number, BLOCK_Z);
          expect(Math.min(lx, BLOCK_X - lx), `${o.map((v) => v.toFixed(1))}`).toBeGreaterThan(4);
          expect(Math.min(lz, BLOCK_Z - lz)).toBeGreaterThan(4);
        }
      }
    for (let bi = 0; bi < TEMPLE_BRIDGES.length; bi++) {
      const S = bridgeSet(bi);
      for (let s = 0; s < S.count; s += 2) {
        strokePoint(S, s, 0, 0, o);
        expect((o[1] as number) - G).toBeGreaterThanOrEqual(124 - 1e-6);
      }
    }
  });
});

describe('Temple skyscrapers: walls, budget, light', () => {
  it('holds the Ship off their walls, open through their voids', () => {
    for (const T of TEMPLE_TOWERS) {
      expect(blocked([T.x + 0.9 * towerReach(T, 120), G + 120, T.z])).toBe(true);
      expect(blocked([T.x, G + T.top + 3, T.z])).toBe(false);
      expect(blocked([T.x + T.r + 2, G + 60, T.z + T.r + 2])).toBe(false);
    }
    // Through the highway gates and under the barge's arch.
    expect(blocked([143, G + 86, 26.5 * BLOCK_Z])).toBe(false);
    expect(blocked([143, G + 86, 28.5 * BLOCK_Z])).toBe(false);
    expect(blocked([143, G + 86, 31.5 * BLOCK_Z])).toBe(false);
    expect(blocked([117, G + 96, 27.5 * BLOCK_Z])).toBe(false);
    expect(blocked([117, G + 96, 29.5 * BLOCK_Z])).toBe(false);
    // In the next tile too.
    expect(blocked([143 + TILE_X, G + 60, 26.5 * BLOCK_Z])).toBe(true);
  });

  it('stops the flying Ship at a tower’s wall', () => {
    const T = TEMPLE_TOWERS[0] as (typeof TEMPLE_TOWERS)[number];
    let t = 100;
    setFly(false, [], 0, t);
    setFly(true, [], dt, t);
    // Facing +x, toward the tower, thirty short of it.
    placeShip([T.x - T.r - 30, G + 60, T.z], -Math.PI / 2);
    for (let f = 0; f < 300; f++) {
      t += dt;
      setFly(true, [], dt, t);
      const c = flier(t).c;
      expect(skyscraperHolds(c, 1.19)).toBe(false);
    }
    const c = flier(t).c;
    expect(c[0]).toBeLessThan(T.x - T.r);
    setFly(false, [], 0, 0);
  });

  it('keeps to a phone’s and a computer’s grains flying among them, every grain finite', () => {
    const items: Item[] = [];
    skyscraperItems([100, G + 90, 900], 5, 600, 160, all, items);
    for (const it of items) {
      expect(it.count).toBeLessThanOrEqual(4000);
      expect(Number.isFinite(it.d)).toBe(true);
    }
    expect(items.reduce((s, it) => s + it.count, 0)).toBeLessThan(50000);
    expect(TOWER_SITES).toBeLessThanOrEqual(4000);
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      let t = 300;
      setFly(false, [], 0, t);
      setFly(true, [], dt, t);
      placeShip([100, G + 100, 860], Math.PI);
      let lit = 0;
      let finite = true;
      for (let f = 0; f < 3; f++) {
        t += dt;
        setFly(true, [], dt, t);
        pieceCamera(ship, t);
        lit = 0;
        for (const p of ps) {
          const g = pieceAt(p, ship, t);
          finite &&= g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite);
          if (g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.004) lit++;
        }
      }
      expect(finite).toBe(true);
      expect(lit).toBeLessThanOrEqual(n);
      setFly(false, [], 0, 0);
    }
  });

  it('drifts slowly: no light jumps between two frames', () => {
    const eye: Vec3 = [100, G + 90, 860];
    const a: Item[] = [];
    const b: Item[] = [];
    skyscraperItems(eye, 20, 600, 160, all, a);
    skyscraperItems(eye, 20 + dt, 600, 160, all, b);
    expect(a.length).toBe(b.length);
    const o = [0, 0, 0, 0, 0, 0];
    const q = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < a.length; i++)
      for (let s = 0; s < 300; s++) {
        (a[i] as Item).site(s, o);
        (b[i] as Item).site(s, q);
        for (let c = 3; c < 6; c++)
          expect(Math.abs((o[c] as number) - (q[c] as number))).toBeLessThan(0.05);
      }
  });
});
