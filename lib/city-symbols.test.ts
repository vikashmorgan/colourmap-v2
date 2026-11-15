import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  makeParticles,
  PHASES,
  pieceAt,
  pieceCamera,
  placeShip,
  STRATOSPHERE,
  setFly,
} from './city';
import { BIG_SQUARES, BIG_STRETCH, BIG_STRETCH_WAS, bigHeight } from './city-big';
import { BUILDING_SPOTS, buildingModel } from './city-buildings-15';
import { blocked, blockTower, LANDMARKS, SPIRE } from './city-game';
import { AVENUE, BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { CROWN_LIFT, type CrownKey, crownKey, landmarkHeight } from './city-landmarks';
import { RAIL } from './city-metro';
import { PARCOURS_R, parcoursRings } from './city-rings';
import { STATIONS, stationModel } from './city-stations';
import {
  ARCH_COLS,
  ARCH_INNER,
  ARCH_OUTER,
  ARCH_PIER,
  ARCH_ROW,
  ARCH_TOP,
  ARCH_Z,
  archHolds,
  archModelOf,
  archUnderside,
  LOGGIA_HI,
  LOGGIA_LO,
  SATURN_BLOCK,
  SATURN_R,
  SATURN_RINGS,
  SATURN_TOP,
  SATURN_X,
  SATURN_Y,
  SATURN_Z,
  SPIRE_AT,
  SPIRE_NOVA_OUT,
  SPIRE_NOVA_REACH,
  SPIRE_NOVAS,
  saturnModelOf,
  symbolBlock,
  symbolItems,
} from './city-symbols';

const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
const flat = (ax: number, az: number, bx: number, bz: number) =>
  Math.hypot(wrapd(ax - bx, TILE_X), wrapd(az - bz, TILE_Z));
const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;

describe('the Great Arch over the avenue (2026-11-14: "really big, hundreds high")', () => {
  it('spans the avenue, its piers on the blocks either side, hundreds high', () => {
    expect(ARCH_TOP).toBeGreaterThan(400);
    expect(ARCH_INNER).toBeGreaterThan(AVENUE + 15);
    expect(ARCH_OUTER * 2).toBeGreaterThan(90);
    for (const I of ARCH_COLS) {
      expect(symbolBlock(I, ARCH_ROW)).toBe(true);
      expect(blockTower(I, ARCH_ROW).shape).toBe('plaza');
      // The pier stands inside its block, off the streets' middles.
      const x = Math.sign(I + 0.5) * ARCH_PIER.x;
      expect(Math.floor((x - ARCH_PIER.hx) / BLOCK_X)).toBe(I);
      expect(Math.floor((x + ARCH_PIER.hx) / BLOCK_X)).toBe(I);
    }
    expect(Math.floor((ARCH_Z - ARCH_PIER.hz) / BLOCK_Z)).toBe(ARCH_ROW);
    expect(Math.floor((ARCH_Z + ARCH_PIER.hz) / BLOCK_Z)).toBe(ARCH_ROW);
    expect(archModelOf().top).toBe(ARCH_TOP);
  });

  it('holds the ship at its piers only: the opening is free from the street to under the vault', () => {
    for (const s of [-1, 1]) {
      for (const y of [20, 100, 250, 380])
        expect(blocked([s * ARCH_PIER.x, GROUND + y, ARCH_Z])).toBe(true);
      // Every copy of the plan.
      expect(blocked([s * ARCH_PIER.x + TILE_X, GROUND + 60, ARCH_Z - TILE_Z])).toBe(true);
    }
    for (let z = ARCH_Z - 40; z <= ARCH_Z + 40; z += 2)
      for (const y of [8, 30, 150, 250, 300, 320])
        expect(blocked([0, GROUND + y, z]), `${z} ${y}`).toBe(false);
    for (let x = -ARCH_INNER + 3; x <= ARCH_INNER - 3; x += 3)
      expect(archHolds([x, GROUND + archUnderside(x) - 3, ARCH_Z], 1.2)).toBe(false);
    expect(archUnderside(0)).toBeGreaterThan(320);
  });

  it('opens a loggia through each pier where the high currents fly, only its corner columns standing', () => {
    expect(LOGGIA_LO).toBeLessThan(142 - 4);
    expect(LOGGIA_HI).toBeGreaterThan(182 + 8);
    for (const s of [-1, 1]) {
      expect(archHolds([s * ARCH_PIER.x, GROUND + 165, ARCH_Z], 1.2)).toBe(false);
      const cx = s * (ARCH_PIER.x + ARCH_PIER.hx - 1);
      expect(archHolds([cx, GROUND + 165, ARCH_Z + ARCH_PIER.hz - 1], 1.2)).toBe(true);
    }
  });

  it('lets the ring parcours run through its opening, clear of the stone', () => {
    let near = 0;
    for (const g of parcoursRings()) {
      if (Math.abs(wrapd(g.c[2] - ARCH_Z, TILE_Z)) > ARCH_PIER.hz + PARCOURS_R + 2) continue;
      near++;
      for (let k = 0; k < 48; k++) {
        const a = (k * Math.PI * 2) / 48;
        const p: Vec3 = [0, 1, 2].map(
          (j) =>
            (g.c[j] as number) +
            PARCOURS_R * (Math.cos(a) * (g.u[j] as number) + Math.sin(a) * (g.v[j] as number)),
        ) as Vec3;
        if (Math.abs(wrapd(p[2] - ARCH_Z, TILE_Z)) > ARCH_PIER.hz + 2) continue;
        expect(Math.abs(p[0])).toBeLessThan(ARCH_INNER - 2);
        expect(p[1] - GROUND).toBeLessThan(archUnderside(p[0]) - 2);
      }
    }
    expect(near).toBeGreaterThan(0);
  });

  it('keeps its piers off the metro, the stations and the corridors', () => {
    for (let i = 0; i < RAIL.n; i += 3) {
      const q: Vec3 = [
        RAIL.pos[i * 3] as number,
        RAIL.pos[i * 3 + 1] as number,
        RAIL.pos[i * 3 + 2] as number,
      ];
      expect(archHolds(q, 4)).toBe(false);
    }
    for (const st of STATIONS) {
      const M = stationModel(st);
      const h = flat(st.x, st.z, 0, ARCH_Z) - M.r;
      // Beside the arch's reach across, or over its top.
      expect(h > ARCH_OUTER + 10 || st.h + M.lo > ARCH_TOP + 10, st.name).toBe(true);
    }
    expect(ARCH_OUTER + 4).toBeLessThan(3 * BLOCK_X - 12);
  });

  it('is drawn far down the avenue, a frame at the end of the long view', () => {
    const out: Item[] = [];
    symbolItems([0, GROUND + 30, ARCH_Z + 700], 3, 900, out);
    const A = archModelOf();
    expect(out.some((it) => it.count === A.count)).toBe(true);
    const o = [0, 0, 0, 0, 0, 0];
    const it = out.find((q) => q.count === A.count) as Item;
    for (let s = 0; s < it.count; s += 11) {
      expect(it.site(s, o)).toBe(true);
      expect(Math.max(o[3] as number, o[4] as number, o[5] as number)).toBeLessThan(0.8);
    }
  });
});

describe('the Saturn Tower (2026-11-14: "a large Saturn on top of a pole, the symbol of the city")', () => {
  it('is the tallest thing in the city, under the stratosphere, its planet ringed', () => {
    expect(SATURN_TOP).toBeGreaterThan(ARCH_TOP);
    for (const L of LANDMARKS) {
      const k = crownKey(L.kind, L.set);
      expect(SATURN_TOP).toBeGreaterThan(k ? landmarkHeight(k) : landmarkHeight('spire'));
    }
    for (const q of BIG_SQUARES) expect(SATURN_TOP).toBeGreaterThan(bigHeight(q));
    for (const b of BUILDING_SPOTS) expect(SATURN_TOP).toBeGreaterThan(buildingModel(b).top);
    expect(GROUND + SATURN_TOP).toBeLessThan(STRATOSPHERE - 40);
    expect(SATURN_RINGS.length).toBeGreaterThanOrEqual(5);
    expect(Math.min(...SATURN_RINGS)).toBeGreaterThan(SATURN_R * 1.2);
    expect(Math.max(...SATURN_RINGS)).toBeGreaterThan(SATURN_R * 2);
    const M = saturnModelOf();
    // The rings are tilted: their lights span heights round the planet's middle.
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    let far = 0;
    let s = 0;
    for (const p of M.parts) {
      for (let j = 0; j < p.n; j++, s++) {
        const q = p.f((j + 0.5) / p.n, s, 20);
        if (Math.hypot(q[0], q[2]) > SATURN_R * 1.3 && q[1] > SATURN_Y - 40) {
          far++;
          lo = Math.min(lo, q[1]);
          hi = Math.max(hi, q[1]);
        }
      }
    }
    expect(far).toBeGreaterThan(500);
    expect(hi - lo).toBeGreaterThan(20);
  });

  it('stands beside the avenue at the plan’s heart, on an open block, clear of the sky', () => {
    expect(symbolBlock(SATURN_BLOCK.I, SATURN_BLOCK.J)).toBe(true);
    expect(blockTower(SATURN_BLOCK.I, SATURN_BLOCK.J).shape).toBe('plaza');
    expect(Math.abs(SATURN_X)).toBeLessThan(2 * BLOCK_X);
    expect(Math.abs(SATURN_X) - 12).toBeGreaterThan(AVENUE);
    expect(Math.abs(SATURN_Z - TILE_Z / 2)).toBeLessThan(TILE_Z * 0.1);
    const R = Math.max(...SATURN_RINGS);
    for (const st of STATIONS) {
      const M = stationModel(st);
      expect(flat(st.x, st.z, SATURN_X, SATURN_Z) - M.r - R, st.name).toBeGreaterThan(15);
    }
    for (const g of parcoursRings()) {
      const h = flat(g.c[0], g.c[2], SATURN_X, SATURN_Z);
      // Off the pole, and off the planet and its rings.
      expect(h).toBeGreaterThan(PARCOURS_R + 8);
      const dy = Math.abs(g.c[1] - GROUND - SATURN_Y);
      expect(Math.max(h - R - PARCOURS_R, dy - 30 - PARCOURS_R)).toBeGreaterThan(5);
    }
  });

  it('is drawn from across the city', () => {
    const out: Item[] = [];
    symbolItems([SATURN_X, GROUND + 40, SATURN_Z + 800], 3, 900, out);
    expect(out.some((it) => it.count === saturnModelOf().count)).toBe(true);
  });
});

describe('big novas round the Golden Spire (2026-11-14)', () => {
  it('surrounds the spire with six big Nova Cores in a rising spiral, one ensemble', () => {
    expect(SPIRE_AT).toEqual([SPIRE.x, SPIRE.z]);
    expect(SPIRE_NOVAS).toHaveLength(6);
    const angles = SPIRE_NOVAS.map((q) => Math.atan2(q.z - SPIRE_AT[1], q.x - SPIRE_AT[0])).sort(
      (a, b) => a - b,
    );
    for (let i = 0; i < angles.length; i++) {
      const next =
        i + 1 < angles.length ? (angles[i + 1] as number) : (angles[0] as number) + Math.PI * 2;
      expect(next - (angles[i] as number)).toBeLessThan(Math.PI / 2);
    }
    for (const [k, q] of SPIRE_NOVAS.entries()) {
      expect(Math.hypot(q.x - SPIRE_AT[0], q.z - SPIRE_AT[1])).toBeCloseTo(SPIRE_NOVA_OUT, 5);
      // Big: a core some five times the Studio's, off the spire's axis, its foot over the corridor's traffic.
      expect(SPIRE_NOVA_REACH).toBeGreaterThan(20);
      expect(SPIRE_NOVA_OUT - SPIRE_NOVA_REACH).toBeGreaterThan(6);
      expect(q.y - SPIRE_NOVA_REACH).toBeGreaterThan(20);
      expect(q.y + SPIRE_NOVA_REACH).toBeLessThan(landmarkHeight('spire') + 10);
      if (k > 0)
        expect(q.y).toBeGreaterThan((SPIRE_NOVAS[k - 1] as (typeof SPIRE_NOVAS)[number]).y);
      expect(new Set(SPIRE_NOVAS.map((n) => n.kind)).size).toBe(6);
    }
  });

  it('draws them as the eye nears the spire, every grain finite', () => {
    const out: Item[] = [];
    symbolItems([SPIRE_AT[0], GROUND + 60, SPIRE_AT[1] + 200], 3, 500, out);
    const novas = out.filter((it) => it.count === 1500);
    expect(novas.length).toBe(6);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of novas)
      for (let s = 0; s < 1500; s += 50) {
        it.site(s, o);
        expect(o.every(Number.isFinite)).toBe(true);
      }
  });
});

describe('the unique designs, properly big (2026-11-14: "make sure ... reach high")', () => {
  it('raises the four short crowns well over their old heights', () => {
    const was: Partial<Record<CrownKey, number>> = {
      race: 140,
      shikhara: 138,
      mosque: 142,
      domes: 142,
    };
    for (const key of Object.keys(CROWN_LIFT) as CrownKey[]) {
      expect(landmarkHeight(key)).toBeGreaterThan((was[key] as number) + 40);
      expect(landmarkHeight(key)).toBeLessThan(SATURN_TOP);
    }
  });

  it('raises the big squares’ temples, domes and Nova Cores, still under the high currents', () => {
    for (const q of BIG_SQUARES) {
      expect(BIG_STRETCH[q.kind].sv).toBeGreaterThan(BIG_STRETCH_WAS[q.kind]);
      expect(bigHeight(q)).toBeGreaterThan(75);
      expect(bigHeight(q)).toBeLessThan(142);
    }
  });
});

describe('the symbols within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains flying through the arch and by the Saturn Tower', () => {
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      for (const [at, yaw] of [
        [[0, GROUND + 60, ARCH_Z + 90], 0],
        [[SATURN_X - 40, GROUND + 300, SATURN_Z + 160], 0],
      ] as [Vec3, number][]) {
        let t = 300;
        setFly(false, [], 0, t);
        setFly(true, [], dt, t);
        placeShip(at, yaw);
        let lit = 0;
        let finite = true;
        for (let k = 0; k < 2; k++) {
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
