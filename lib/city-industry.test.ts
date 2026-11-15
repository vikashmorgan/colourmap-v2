/*
 * The Industry superquarter (docs/specs/art-city.md, "Industry superquarter and the observatory"),
 * 2026-11-14: "a massive giant factory town ... CONNECTED to each other into one mega set", "LOTS of
 * bridges, rails and diagonal conveyor galleries and pipes, so you can fly below them and in between
 * the parts", cooling towers, windmills, spinning wheels, meshing gears and the atom on the tallest
 * tower. And the Observatory, added to the Domes collection.
 */
import { afterEach, describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  makeParticles,
  PHASES,
  pieceAt,
  pieceCamera,
  placeShip,
  setFly,
  shipNow,
  travelling,
  travelTo,
} from './city';
import { ANNEX_STARTS, annexDistrict, annexItems, GATEWAYS } from './city-annex';
import { FAVELA_Z1, HILLS } from './city-favela';
import { blocked, blockTower, DISTRICTS, districtAt, districtOf } from './city-game';
import {
  atomFacing,
  bladeAngle,
  electronAt,
  gearAngle,
  rimRadius,
  TOOTH_PITCH,
  toothPhase,
  windmillSite,
} from './city-gears';
import { GROUND, type Item, inAnnex, STRIP_X, TAU, TILE_J, TILE_X, TILE_Z } from './city-grid';
import {
  ATOM,
  ATOM_TOWER,
  CHIMNEYS,
  COOLING_TOWERS,
  coolingRadius,
  GALLERIES,
  GALLERY_HH,
  GATE_Z,
  GEAR_MESHES,
  GEARS,
  INDUSTRY_ROW0,
  INDUSTRY_Z0,
  industryBlocked,
  industryItems,
  industrySite,
  KILNS,
  LANE_CLEAR,
  LANE_HALF,
  LANE_X,
  PIECES,
  PIPE_RACKS,
  VIADUCTS,
  WINDMILLS,
  WORKS,
} from './city-industry';
import { MOUNTAIN_Z1, PEAKS } from './city-mountain';
import {
  OBS_FOOT,
  OBS_R,
  OBSERVATORY_AT,
  OBSERVATORY_BLOCK,
  observatoryHolds,
} from './city-observatory';
import { nearestCopy, QUARTER_STARTS, quarterStart } from './city-travel';
import { DOME_KINDS, OBSERVATORY_KIND } from './golden-buildings';
import { DOMES } from './golden-quarters';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
const X = (ax: number) => STRIP_X / 2 + ax;

afterEach(() => setFly(false, [], 0, 0));

describe('the annex: three quarters', () => {
  it('holds the Mountain, the Favela and the Industry superquarter, in that order along it', () => {
    const seen: string[] = [];
    for (let J = 0; J < TILE_J; J++) {
      const d = annexDistrict(J);
      if (seen[seen.length - 1] !== d) seen.push(d);
      expect(districtOf(STRIP_X / 26 / 2 + 3, J)).toBe(d);
    }
    expect(seen).toEqual(['mountain', 'favela', 'industry']);
    expect(INDUSTRY_Z0).toBe(FAVELA_Z1);
    // The Mountain whole, the Favela shorter but every hill short of the industry.
    expect(PEAKS).toHaveLength(8);
    expect(MOUNTAIN_Z1).toBeLessThan(FAVELA_Z1);
    for (const p of HILLS) expect(p.z + 1.15 * p.r).toBeLessThan(INDUSTRY_Z0);
    expect(districtAt(X(LANE_X), 1700)).toBe('industry');
    expect(blockTower(Math.floor(X(LANE_X) / 26), INDUSTRY_ROW0 + 3).shape).toBe('hill');
    expect(GATEWAYS.map((g) => g.d)).toEqual(['mountain', 'favela', 'industry']);
    expect(ANNEX_STARTS.map((a) => a.d)).toEqual(['mountain', 'favela', 'industry']);
  });

  it('keeps every work, tower and wheel inside its own rows of the annex', () => {
    for (const w of WORKS) {
      expect(w.x - w.hx).toBeGreaterThan(0);
      expect(w.x + w.hx).toBeLessThan(STRIP_X);
      expect(w.z - w.hz).toBeGreaterThan(INDUSTRY_Z0);
      expect(w.z + w.hz).toBeLessThan(TILE_Z);
    }
    for (const c of COOLING_TOWERS) {
      expect(c.x - c.r0).toBeGreaterThan(0);
      expect(c.x + c.r0).toBeLessThan(STRIP_X);
    }
    for (const m of WINDMILLS) expect(m.x + m.blade).toBeLessThan(STRIP_X);
  });
});

describe('the industry: one connected mega set', () => {
  it('joins every work to every other by its galleries', () => {
    const parent = WORKS.map((_, i) => i);
    const root = (i: number): number => (parent[i] === i ? i : root(parent[i] as number));
    for (const g of GALLERIES) parent[root(g.from)] = root(g.to);
    const roots = new Set(WORKS.map((_, i) => root(i)));
    expect(roots.size).toBe(1);
    expect(GALLERIES.length).toBeGreaterThanOrEqual(WORKS.length + 4);
    // Each gallery's ends on its two works' faces, within their heights; and diagonal, most of them.
    let diagonal = 0;
    for (const g of GALLERIES) {
      for (const [end, wi] of [
        [g.a, g.from],
        [g.b, g.to],
      ] as [Vec3, number][]) {
        const w = WORKS[wi] as (typeof WORKS)[number];
        expect(Math.abs(end[0] - w.x)).toBeLessThanOrEqual(w.hx + 0.01);
        expect(Math.abs(end[2] - w.z)).toBeLessThanOrEqual(w.hz + 0.01);
        expect(end[1]).toBeLessThan(w.h);
      }
      if (Math.abs(g.a[1] - g.b[1]) > 4) diagonal++;
    }
    expect(diagonal).toBeGreaterThan(GALLERIES.length * 0.7);
  });

  it('draws its works, galleries, towers and clockwork, finite, on or over the ground', () => {
    for (const P of PIECES)
      for (let s = 0; s < P.count; s += 3) {
        const o = industrySite(P, s, 12.3);
        for (let c = 0; c < 6; c++) expect(Number.isFinite(o[c] as number)).toBe(true);
        expect(o[1]).toBeGreaterThan(-0.01);
        for (const c of [3, 4, 5]) {
          expect(o[c]).toBeGreaterThanOrEqual(0);
          expect(o[c]).toBeLessThanOrEqual(0.8);
        }
      }
  });

  it('glides its light slowly: no site changes colour by much from one frame to the next', () => {
    for (const P of PIECES)
      for (let s = 0; s < P.count; s += 5) {
        const a = industrySite(P, s, 40);
        const b = industrySite(P, s, 40 + dt);
        for (const c of [3, 4, 5])
          expect(Math.abs((a[c] as number) - (b[c] as number))).toBeLessThan(0.05);
      }
  });
});

describe('the industry: fly under and in between', () => {
  /** The height of a span from a to b where it crosses x (null if it never does). */
  const yAt = (a: Vec3, b: Vec3, x: number) => {
    if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) return null;
    return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  };

  it('keeps every gallery, pipe, rail bridge and gear over the Great Lane high enough to fly under', () => {
    const edges = [LANE_X - LANE_HALF, LANE_X, LANE_X + LANE_HALF];
    let crossing = 0;
    for (const g of GALLERIES)
      for (const x of edges) {
        const y = yAt(g.a, g.b, x);
        if (y === null) continue;
        crossing++;
        expect(y - GALLERY_HH).toBeGreaterThanOrEqual(LANE_CLEAR);
      }
    // A gallery over the lane at every station, and the two up to the Atom tower.
    expect(crossing).toBeGreaterThanOrEqual(5 * 3);
    for (const r of PIPE_RACKS) expect(r.y).toBeGreaterThanOrEqual(LANE_CLEAR);
    const bridge = VIADUCTS.find((v) => v.az === v.bz);
    expect(bridge?.y).toBeGreaterThanOrEqual(LANE_CLEAR);
    for (const g of GEARS.slice(0, 5)) expect(g.y - g.r - g.depth).toBeGreaterThan(40);
  });

  it('flies the ship down the whole lane under every span, at street level and higher', () => {
    for (let z = TILE_Z - 4; z > ATOM_TOWER.z + ATOM_TOWER.hz + 4; z -= 1.5)
      for (const x of [LANE_X - LANE_HALF + 2, LANE_X, LANE_X + LANE_HALF - 2])
        for (const y of [3, 10, LANE_CLEAR - 3, 34])
          expect(blocked([X(x), GROUND + y, z])).toBe(false);
    // And in another copy of the tile.
    expect(blocked([X(LANE_X) - 3 * TILE_X, GROUND + 10, 1750 + 2 * TILE_Z])).toBe(false);
  });

  it('leaves open ways between the works, the cooling towers and the turbines', () => {
    // Between the west cooling towers and the west row, and between the east row and its towers.
    for (let z = INDUSTRY_Z0 + 40; z < TILE_Z - 10; z += 2) {
      expect(blocked([X(86), GROUND + 6, z])).toBe(false);
      expect(blocked([X(228), GROUND + 6, z])).toBe(false);
    }
    // Between the stations, across the rows (over the kilns' backs).
    for (let x = 4; x < STRIP_X - 20; x += 2) expect(industryBlocked(x, 14, 1760, 1.2)).toBe(false);
    // Light things are flown through: a gallery's middle, a gear's hub.
    const g = GALLERIES[0] as (typeof GALLERIES)[number];
    const mid: Vec3 = [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2, (g.a[2] + g.b[2]) / 2];
    expect(blocked([X(mid[0]), GROUND + mid[1], mid[2]])).toBe(false);
    const g0 = GEARS[0] as (typeof GEARS)[number];
    expect(blocked([X(g0.x), GROUND + g0.y, g0.z])).toBe(false);
  });
});

describe('the industry: solid masses', () => {
  it('holds the ship off its cooling towers, wall to throat, and lets it over them', () => {
    expect(COOLING_TOWERS).toHaveLength(4);
    for (const c of COOLING_TOWERS) {
      // A hyperboloid: narrowest at its waist, flaring to the top, widest at the foot.
      const waist = Math.min(
        ...Array.from({ length: 50 }, (_, i) => coolingRadius(c, (i / 49) * c.h)),
      );
      expect(waist).toBeLessThan(coolingRadius(c, c.h) - 1);
      expect(coolingRadius(c, 0)).toBeCloseTo(c.r0, 6);
      for (const y of [4, c.h * 0.4, c.h * 0.7, c.h - 3]) {
        const r = coolingRadius(c, y);
        expect(blocked([X(c.x + r - 2), GROUND + y, c.z])).toBe(true);
        expect(blocked([X(c.x), GROUND + y, c.z - r + 2])).toBe(true);
        expect(blocked([X(c.x + r + 3), GROUND + y, c.z])).toBe(false);
      }
      expect(blocked([X(c.x), GROUND + c.h + 4, c.z])).toBe(false);
    }
  });

  it('holds the works, chimneys and kilns, and the Atom tower tapering to its top', () => {
    for (const w of WORKS) {
      expect(blocked([X(w.x), GROUND + w.h * 0.5, w.z])).toBe(true);
      expect(blocked([X(w.x), GROUND + w.h + (w.kind === 'hall' ? 6 : 3), w.z])).toBe(false);
    }
    for (const c of CHIMNEYS) expect(blocked([X(c.x), GROUND + c.h - 2, c.z])).toBe(true);
    for (const k of KILNS)
      expect(blocked([X(k.x), GROUND + (k.y0 + k.y1) / 2, (k.z0 + k.z1) / 2])).toBe(true);
    const T = ATOM_TOWER;
    expect(blocked([X(T.x + 8), GROUND + 4, T.z])).toBe(true);
    expect(blocked([X(T.x + 8), GROUND + T.h - 4, T.z])).toBe(false);
  });
});

describe('the industry: clockwork', () => {
  it('meshes its gears truly: one pitch, centres two radii apart, opposite turns, tooth into gap', () => {
    for (const g of GEARS.filter((q) => q.n > 0)) {
      expect((TAU * g.r) / g.n).toBeCloseTo(
        (TAU * (GEARS[0] as (typeof GEARS)[0]).r) / (GEARS[0] as (typeof GEARS)[0]).n,
        6,
      );
      expect(Math.abs((TAU * g.r) / g.n - TOOTH_PITCH)).toBeLessThan(0.3);
    }
    for (const [i, j] of GEAR_MESHES) {
      const A = GEARS[i] as (typeof GEARS)[number];
      const B = GEARS[j] as (typeof GEARS)[number];
      expect(A.plane).toBe(B.plane);
      const du = A.plane === 'z' ? B.x - A.x : B.z - A.z;
      const dv = B.y - A.y;
      expect(Math.hypot(du, dv)).toBeCloseTo(A.r + B.r, 6);
      expect(Math.sign(A.w)).toBe(-Math.sign(B.w));
      expect(A.w * A.r).toBeCloseTo(-B.w * B.r, 9);
      const dir = Math.atan2(dv, du);
      for (const t of [0, 3.7, 17.3, 123.4, 1000]) {
        // Where they touch, A's tooth meets B's gap: their phases sum to a whole number.
        const sum = toothPhase(A, dir, t) + toothPhase(B, dir + Math.PI, t);
        expect(Math.abs(sum - Math.round(sum))).toBeLessThan(1e-6);
        // So their rims never cross: A's tip at the contact reaches no further than B's root lets it.
        const reach = rimRadius(A, dir, t) + rimRadius(B, dir + Math.PI, t);
        expect(reach).toBeLessThanOrEqual(A.r + B.r + 1e-9);
      }
    }
  });

  it('turns every gear and wheel, slowly', () => {
    for (const g of GEARS) {
      expect(gearAngle(g, 10)).not.toBeCloseTo(gearAngle(g, 0), 3);
      // No faster than a turn in forty seconds.
      expect(Math.abs(g.w)).toBeLessThan(TAU / 40 + 0.15);
    }
    // The gate's train hangs over the lane, the big wheels between the cooling towers.
    expect(GEARS.slice(0, 5).every((g) => g.z === GATE_Z)).toBe(true);
    expect(GEARS.filter((g) => g.n === 0)).toHaveLength(2);
  });

  it('turns the windmills’ blades, three of them, a third of a turn apart', () => {
    expect(WINDMILLS.length).toBeGreaterThanOrEqual(5);
    const o = [0, 0, 0];
    for (const m of WINDMILLS) {
      expect(bladeAngle(m, 1, 5) - bladeAngle(m, 0, 5)).toBeCloseTo(TAU / 3, 9);
      expect(bladeAngle(m, 0, 6) - bladeAngle(m, 0, 4)).toBeCloseTo(2 * m.w, 9);
      // A blade's tip lamp moves.
      const n = 400;
      windmillSite(m, n - 1, n, 0, 0, 0, o);
      const a = [...o];
      windmillSite(m, n - 1, n, 3, 0, 0, o);
      expect(
        Math.hypot((o[0] as number) - (a[0] as number), (o[1] as number) - (a[1] as number)),
      ).toBeGreaterThan(1);
      expect(m.hub - m.blade).toBeGreaterThan(30);
    }
  });
});

describe('the industry: the atom', () => {
  it('stands on the tallest of the industry’s towers, over every other thing there', () => {
    const tallest = WORKS.reduce((a, b) => (b.h > a.h ? b : a));
    expect(tallest).toBe(ATOM_TOWER);
    for (const c of COOLING_TOWERS) expect(c.h).toBeLessThan(ATOM_TOWER.h);
    for (const c of CHIMNEYS) expect(c.h).toBeLessThan(ATOM_TOWER.h);
    expect(ATOM.x).toBe(ATOM_TOWER.x);
    expect(ATOM.z).toBe(ATOM_TOWER.z);
    expect(ATOM.y - ATOM.R).toBeGreaterThan(ATOM_TOWER.h);
    // Under the high currents' loops at 142.
    expect(ATOM.y + ATOM.R).toBeLessThan(142);
    // At the far end of the Great Lane, straight ahead from the quarter's start.
    expect(ATOM.x).toBe(LANE_X);
    expect(quarterStart('industry').view).toEqual([X(LANE_X), ATOM.z]);
  });

  it('turns its orbits round the vertical and runs its electrons round them', () => {
    expect(atomFacing(ATOM, 10)).not.toBeCloseTo(atomFacing(ATOM, 0), 3);
    for (let k = 0; k < 3; k++) {
      const a = electronAt(ATOM, k, 0);
      const b = electronAt(ATOM, k, 2);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(2);
      expect(Math.hypot(a[0] - ATOM.x, a[1] - GROUND - ATOM.y, a[2] - ATOM.z)).toBeLessThanOrEqual(
        ATOM.R + 1e-6,
      );
    }
  });

  it('draws the atom from the far end of the quarter, weighed as a landmark', () => {
    const out: Item[] = [];
    const eye: Vec3 = [X(LANE_X), GROUND + 50, TILE_Z - 6];
    industryItems(eye, [0, 0, -1], 5, 520, out);
    const atom = PIECES.find((P) => P.lo[1] > ATOM_TOWER.h);
    expect(atom).toBeDefined();
    expect(out.some((it) => it.gid === atom?.gid && it.weight >= 2.4)).toBe(true);
  });
});

describe('the Observatory in the Domes collection', () => {
  it('is one of the domes, its own single building before the rungs', () => {
    expect(DOME_KINDS.names[OBSERVATORY_KIND]).toBe('Observatory');
    expect(DOMES.names[OBSERVATORY_KIND]).toBe('Observatory');
    expect(DOMES.rung[OBSERVATORY_KIND]).toBe(0);
    expect(DOMES.rung.slice(-3)).toEqual([1, 2, 3]);
  });

  it('stands once in the Solarpunk domes quarter, on its own open block, solid', () => {
    expect(districtOf(OBSERVATORY_BLOCK.I, OBSERVATORY_BLOCK.J)).toBe('domes');
    expect(blockTower(OBSERVATORY_BLOCK.I, OBSERVATORY_BLOCK.J).shape).toBe('plaza');
    const [x, z] = OBSERVATORY_AT;
    expect(blocked([x, GROUND + OBS_FOOT * 0.5, z + OBS_R - 1])).toBe(true);
    expect(blocked([x, GROUND + OBS_FOOT + OBS_R - 1, z])).toBe(true);
    expect(observatoryHolds([x + TILE_X, GROUND + 3, z - TILE_Z], 1)).toBe(true);
    expect(blocked([x, GROUND + OBS_FOOT + OBS_R + 3, z])).toBe(false);
    expect(blocked([x + OBS_R + 3, GROUND + 3, z])).toBe(false);
  });
});

describe('the industry: fast travel', () => {
  it('starts the quarter over its Great Lane, clear, under its gateway’s name', () => {
    const q = quarterStart('industry');
    expect(QUARTER_STARTS).toContain(q);
    expect(q.name).toBe(DISTRICTS.industry.name);
    expect(districtAt(q.pos[0], q.pos[2])).toBe('industry');
    expect(blocked(q.pos)).toBe(false);
    expect(q.yaw).toBeCloseTo(0, 6);
    const g = GATEWAYS.find((w) => w.d === 'industry');
    expect(g?.x).toBe(X(LANE_X));
    const out: Item[] = [];
    annexItems(q.pos, [0, 0, -1], 3, 400, out);
    expect(out.length).toBeGreaterThan(40);
  });

  it('flies the ship there in about a second from anywhere, landing clear', () => {
    let t = 60;
    setFly(false, [], 0, t);
    setFly(true, [], dt, t);
    for (const d of ['industry', 'domes', 'industry'] as const) {
      const q = quarterStart(d);
      const from = shipNow().c;
      travelTo(q);
      let frames = 0;
      while (travelling() && frames < 120) {
        t += dt;
        setFly(true, [], dt, t);
        frames++;
      }
      expect(travelling()).toBe(false);
      const { c } = shipNow();
      const at = nearestCopy(q.pos, from);
      expect(Math.hypot(c[0] - at[0], c[1] - at[1], c[2] - at[2])).toBeLessThan(3);
      expect(districtAt(c[0], c[2])).toBe(d);
      expect(blocked(c)).toBe(false);
    }
    setFly(false, [], 0, 0);
  });
});

describe('the industry: within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains looking down its lane, every grain finite', () => {
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      const q = quarterStart('industry');
      let t = 220;
      setFly(false, [], 0, t);
      setFly(true, [], dt, t);
      placeShip(q.pos, q.yaw);
      let lit = 0;
      let inside = 0;
      let finite = true;
      for (let f = 0; f < 3; f++) {
        t += dt;
        setFly(true, [], dt, t);
        pieceCamera(ship, t);
        lit = 0;
        inside = 0;
        for (const p of ps) {
          const g = pieceAt(p, ship, t);
          finite &&= g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite);
          if (g.rgb[0] + g.rgb[1] + g.rgb[2] <= 0.004) continue;
          lit++;
          if (inAnnex(g.pos[0]) && g.pos[1] > GROUND + 0.5) inside++;
        }
      }
      expect(finite).toBe(true);
      expect(lit).toBeLessThanOrEqual(n);
      expect(lit).toBeGreaterThan(n * 0.3);
      expect(inside).toBeGreaterThan(n * 0.1);
      setFly(false, [], 0, 0);
    }
  });
});
