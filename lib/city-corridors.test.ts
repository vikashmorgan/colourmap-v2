/*
 * The racing corridors (docs/specs/art-city.md, "Racing corridors and the Heights–Golden bridges"),
 * 2026-11-14: "open up and enlarge the main long streets, so it creates other long corridors like
 * the central horizontal one on the map, but three buildings above and three below ... from far left
 * to far right."
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { makeParticles, PHASES, pieceAt, pieceCamera, placeShip, setFly } from './city';
import { BIG_SQUARES } from './city-big';
import { CANYON_WALLS } from './city-canyon';
import {
  CORRIDOR_FEATURES,
  CORRIDOR_HALF,
  CORRIDOR_LINES,
  CORRIDOR_MIN,
  CORRIDOR_X,
  corridorClear,
  corridorItems,
  corridorSide,
  featureSpan,
  GATE_R,
  inCorridor,
} from './city-corridors';
import { EMBASSIES } from './city-embassy';
import {
  type Block,
  blocked,
  blockTower,
  LANDMARKS,
  MARGIN,
  type Strand,
  strandsNear,
  walkwaysNear,
} from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_I, TILE_J, TILE_X, TILE_Z } from './city-grid';
import { cityMapData } from './city-minimap';
import { THROUGH } from './city-under';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
const SOLID = new Set(['box', 'business', 'code', 'pyramid', 'embassy', 'design']);
const solid = (tw: Block) => SOLID.has(tw.shape);
/** A street line's clear width at row J: wall to wall between the towers either side (open blocks count as their whole block). */
function clear(L: number, J: number): [number, number] {
  const A = blockTower(L - 1, J);
  const B = blockTower(L, J);
  const a = solid(A) ? A.x + A.hx : (L - 1) * BLOCK_X;
  const b = solid(B) ? B.x - B.hx : (L + 1) * BLOCK_X;
  return [a, b];
}
const throughRow = (L: number, J: number) =>
  L * BLOCK_X - THROUGH.x > 0 &&
  L * BLOCK_X - THROUGH.x < BLOCK_X &&
  J >= THROUGH.J0 &&
  J <= THROUGH.J1;

describe('the racing corridors: where they run', () => {
  it('runs on the street lines three blocks either side of the avenue, 24 across', () => {
    expect([...CORRIDOR_LINES]).toEqual([-3, 3]);
    expect(CORRIDOR_X).toEqual([-3 * BLOCK_X, 3 * BLOCK_X]);
    expect(2 * CORRIDOR_HALF).toBe(24);
    expect(corridorSide(-4)).toBe(-1);
    expect(corridorSide(-3)).toBe(1);
    expect(corridorSide(2)).toBe(-1);
    expect(corridorSide(3)).toBe(1);
    for (const I of [-6, -5, -2, -1, 0, 1, 4, 5]) expect(corridorSide(I)).toBe(0);
    // Every copy of the plan, the annex never (it has no streets).
    expect(corridorSide(2 + TILE_I)).toBe(-1);
    expect(corridorSide(-3 - 2 * TILE_I)).toBe(1);
    for (let I = 6; I < TILE_I - 6; I++) expect(corridorSide(I)).toBe(0);
    expect(inCorridor(78 + TILE_X)).toBe(true);
    expect(inCorridor(-78 - TILE_X, 2)).toBe(true);
    expect(inCorridor(52)).toBe(false);
  });

  it('slims a tower out of the corridor, keeping the least gap on its far side', () => {
    // Column 2's high edge is the corridor at 78: the face goes back to 66.
    const c = corridorClear(2, 65, 6, 4.5, 3.5);
    expect(c.x + c.hx).toBeCloseTo(66, 9);
    expect(c.x - c.hx).toBeCloseTo(59, 9);
    // Too thin: the far face moves out, never past the least gap.
    const d = corridorClear(2, 64, 3, 4.5, 3.6);
    expect(d.x + d.hx).toBeCloseTo(66, 9);
    expect(d.hx).toBeCloseTo(3.6, 9);
    // Off the corridors, untouched; already clear, untouched.
    expect(corridorClear(1, 40, 6, 4.5)).toEqual({ x: 40, hx: 6 });
    expect(corridorClear(3, 100, 2, 4.5)).toEqual({ x: 100, hx: 2 });
    // Across from a tower that keeps its place, the corridor is made up from this side.
    const k = corridorClear(3, 91, 6, 4.5, 3.6, 72);
    expect(k.x - k.hx).toBeCloseTo(72 + CORRIDOR_MIN, 9);
  });
});

describe('the racing corridors: continuous, building-free, wider than any street', () => {
  it('leaves 24 wall to wall along the whole tile, 20 beside the through tunnel, in every copy', () => {
    for (const L of CORRIDOR_LINES) {
      for (const n of [0, 1, -2]) {
        for (let lj = 0; lj < TILE_J; lj++) {
          const J = lj + n * TILE_J;
          const I = L + n * TILE_I;
          const [a, b] = clear(I, J);
          const line = I * BLOCK_X;
          if (throughRow(L, lj)) {
            expect(b - a).toBeGreaterThanOrEqual(CORRIDOR_MIN - 1e-9);
            expect(a).toBeLessThanOrEqual(line - 6 + 1e-9);
          } else {
            expect(a).toBeLessThanOrEqual(line - CORRIDOR_HALF + 1e-9);
            expect(b).toBeGreaterThanOrEqual(line + CORRIDOR_HALF - 1e-9);
          }
        }
      }
    }
  });

  it('flies end to end down both, low, middle and high, through every quarter, nothing solid', () => {
    for (const L of CORRIDOR_LINES) {
      for (const ox of [0, TILE_X]) {
        for (let z = 0; z < TILE_Z; z += 2.5) {
          const lj = Math.floor(z / BLOCK_Z);
          const half = CORRIDOR_HALF - MARGIN - 0.1;
          const xs = throughRow(L, lj)
            ? [72 + MARGIN + 0.1, 82, 92 - MARGIN - 0.1]
            : [-half, -half / 2, 0, half / 2, half].map((d) => L * BLOCK_X + d);
          for (const x of xs)
            for (const y of [GROUND + 4, GROUND + 22, GROUND + 60])
              expect(blocked([ox + x, y, z + TILE_Z])).toBe(false);
        }
      }
    }
  });

  it('is wider than every ordinary street, on every row but the five beside the through tunnel', () => {
    const ordinary: number[] = [];
    for (const L of [-5, -4, -2, -1, 1, 2, 4, 5])
      for (let J = 0; J < TILE_J; J++) {
        const A = blockTower(L - 1, J);
        const B = blockTower(L, J);
        if (solid(A) && solid(B)) ordinary.push(B.x - B.hx - (A.x + A.hx));
      }
    const widest = Math.max(...ordinary);
    const mean = ordinary.reduce((s, w) => s + w, 0) / ordinary.length;
    let rows = 0;
    for (const L of CORRIDOR_LINES)
      for (let J = 0; J < TILE_J; J++) {
        const [a, b] = clear(L, J);
        if (throughRow(L, J)) continue;
        rows++;
        expect(b - a).toBeGreaterThan(widest);
      }
    expect(rows).toBe(2 * TILE_J - (THROUGH.J1 - THROUGH.J0 + 1));
    expect(CORRIDOR_MIN).toBeGreaterThan(1.6 * mean);
  });

  it('runs through the landmarks’ and big squares’ open plazas, the embassies and canyon off it', () => {
    // The landmarks and big squares on the corridors' crossings stand on open plazas (light).
    for (const l of LANDMARKS) {
      expect(CORRIDOR_X).toContain(l.x);
      const I = Math.round(l.x / BLOCK_X);
      const J = Math.round(l.z / BLOCK_Z);
      for (const [i, j] of [
        [I - 1, J - 1],
        [I, J - 1],
        [I - 1, J],
        [I, J],
      ])
        expect(solid(blockTower(i as number, j as number))).toBe(false);
    }
    for (const s of BIG_SQUARES)
      expect(solid(blockTower(Math.round(s.x / BLOCK_X), s.z / BLOCK_Z))).toBe(false);
    // The embassies moved off the blocks beside the corridors; the canyon's walls stop short.
    for (const e of EMBASSIES) expect(corridorSide(e.li)).toBe(0);
    for (const w of CANYON_WALLS) {
      for (const c of CORRIDOR_X) {
        expect(w.x1 <= c - CORRIDOR_HALF || w.x0 >= c + CORRIDOR_HALF).toBe(true);
      }
    }
  });

  it('strings nothing across them: no lantern strings or walkways from one side to the other', () => {
    for (const L of CORRIDOR_LINES) {
      const x = L * BLOCK_X;
      const eye: Vec3 = [x, GROUND + 30, 4 * BLOCK_Z];
      const st: Strand[] = [];
      strandsNear(eye, 160, st);
      // And the Indian quarter's Diwali strings, a band further.
      strandsNear([x, GROUND + 30, 12 * BLOCK_Z], 160, st);
      for (const s of st)
        expect(Math.min(s.a[0], s.b[0]) < x && Math.max(s.a[0], s.b[0]) > x).toBe(false);
      for (const w of walkwaysNear(eye, 160)) expect(w.x0 < x && w.x1 > x).toBe(false);
    }
  });
});

describe('the racing corridors: the obstacles', () => {
  it('stands a few low bridges, ring gates and high bridges along each, sparse and staggered', () => {
    for (const c of CORRIDOR_X) {
      const fs = CORRIDOR_FEATURES.filter((f) => f.x === c).sort((a, b) => a.z - b.z);
      expect(fs.length).toBeGreaterThanOrEqual(6);
      expect(fs.length).toBeLessThanOrEqual(12);
      expect(new Set(fs.map((f) => f.kind)).size).toBe(3);
      for (let i = 1; i < fs.length; i++)
        expect(
          (fs[i] as (typeof fs)[number]).z - (fs[i - 1] as (typeof fs)[number]).z,
        ).toBeGreaterThanOrEqual(5 * BLOCK_Z - 1e-9);
      for (const f of fs) {
        // Mid-block, never in a plaza round a landmark's or big square's crossing.
        const J = Math.floor(f.z / BLOCK_Z);
        expect(f.z).toBeCloseTo((J + 0.5) * BLOCK_Z, 9);
        expect(
          solid(blockTower(Math.round(c / BLOCK_X) - 1, J)) ||
            solid(blockTower(Math.round(c / BLOCK_X), J)),
        ).toBe(true);
      }
    }
    // The two corridors' obstacles never side by side: staggered along the plan.
    const zs = (c: number) => new Set(CORRIDOR_FEATURES.filter((f) => f.x === c).map((f) => f.z));
    const left = zs(CORRIDOR_X[0] as number);
    for (const z of zs(CORRIDOR_X[1] as number)) expect(left.has(z)).toBe(false);
  });

  it('leaves room to go under and over each: under a low deck, over it, under a high one, through a gate', () => {
    for (const f of CORRIDOR_FEATURES) {
      const [lo, hi] = featureSpan(f);
      if (f.kind === 'low') {
        expect(lo).toBeGreaterThanOrEqual(10);
        expect(hi).toBeLessThan(16);
      }
      if (f.kind === 'high') expect(lo).toBeGreaterThanOrEqual(30);
      if (f.kind === 'gate') {
        expect(lo).toBeGreaterThanOrEqual(10);
        expect(GATE_R).toBeLessThan(CORRIDOR_HALF);
      }
      // Light: the open air under, at and over it never holds the ship.
      for (const y of [GROUND + 4, GROUND + (lo + hi) / 2, GROUND + hi + 6])
        expect(blocked([f.x, y, f.z])).toBe(false);
    }
  });

  it('draws them near the eye inside the corridor, finite and mellow, with kerb lamps along it', () => {
    const f = CORRIDOR_FEATURES.find(
      (g) => g.kind === 'high',
    ) as (typeof CORRIDOR_FEATURES)[number];
    const eye: Vec3 = [f.x + TILE_X, GROUND + 30, f.z - 60 + TILE_Z];
    const out: Item[] = [];
    corridorItems(eye, 12, 160, () => true, out);
    expect(out.length).toBeGreaterThan(2);
    const o = [0, 0, 0, 0, 0, 0];
    let sites = 0;
    for (const it of out) {
      expect(it.d).toBeLessThan(160);
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
        const lx = (o[0] as number) - TILE_X;
        expect(CORRIDOR_X.some((c) => Math.abs(lx - c) <= CORRIDOR_HALF + 1e-6)).toBe(true);
        expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThanOrEqual(0.75);
        sites++;
      }
    }
    expect(sites).toBeLessThan(4000);
  });

  it('opens a long view down each corridor: frames receding ahead, kerbs out to 320 (perspective)', () => {
    for (const c of CORRIDOR_X) {
      const fs = CORRIDOR_FEATURES.filter((f) => f.x === c).sort((a, b) => a.z - b.z);
      const first = fs[0] as (typeof fs)[number];
      // Standing a little before the first, looking down the corridor (+z).
      const eye: Vec3 = [c, GROUND + 20, first.z - 20];
      const out: Item[] = [];
      corridorItems(eye, 5, 420, (_x, z) => z > eye[2] - 40, out);
      // This corridor's frames (the other corridor, 156 across, is in reach too).
      const frames = out
        .filter((it) => it.probe && Math.abs((it.probe[0] as Vec3)[0] - c) < 1)
        .map((it) => it.d);
      const reach = fs.filter((f) => f.z - eye[2] < 420 - CORRIDOR_HALF);
      expect(reach.length).toBeGreaterThanOrEqual(2);
      expect(frames.length).toBe(reach.length);
      // Nearest first down the line: each next frame further off.
      for (let i = 1; i < frames.length; i++)
        expect(frames[i] as number).toBeGreaterThan(frames[i - 1] as number);
      // Nothing solid in the line of sight down the middle, all the way.
      for (let z = eye[2]; z < eye[2] + 420; z += 2) expect(blocked([c, eye[1], z])).toBe(false);
      // The kerb lamps run out to KERB_REACH each way.
      const o = [0, 0, 0, 0, 0, 0];
      const kerb = out.find((it) => {
        if (it.probe) return false;
        it.site(0, o);
        return Math.abs((o[0] as number) - c) < CORRIDOR_HALF;
      }) as Item;
      let far = 0;
      for (let s = 0; s < kerb.count; s++) {
        kerb.site(s, o);
        far = Math.max(far, (o[2] as number) - eye[2]);
      }
      expect(far).toBeGreaterThan(300);
    }
  });

  it('shows both corridors on the map as main roads the whole tile long', () => {
    const roads = cityMapData().roads.filter((r) => r.main && r.x0 === r.x1);
    for (const c of CORRIDOR_X)
      for (const e of [-CORRIDOR_HALF, CORRIDOR_HALF]) {
        const r = roads.find((q) => q.x0 === c + e);
        expect(r).toBeDefined();
        expect(r?.z0).toBe(0);
        expect(r?.z1).toBe(TILE_Z);
      }
  });
});

describe('the racing corridors: within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains racing down a corridor, every grain finite', () => {
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      for (const c of CORRIDOR_X) {
        const f = CORRIDOR_FEATURES.find(
          (g) => g.x === c && g.kind === 'gate',
        ) as (typeof CORRIDOR_FEATURES)[number];
        let t = 300;
        setFly(false, [], 0, t);
        setFly(true, [], dt, t);
        // Facing down the corridor (+z), a little before a gate.
        placeShip([c, GROUND + 20, f.z - 50], Math.PI);
        let lit = 0;
        let finite = true;
        for (let k = 0; k < 3; k++) {
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
        expect(lit).toBeGreaterThan(n * 0.3);
        setFly(false, [], 0, 0);
      }
    }
  });
});
