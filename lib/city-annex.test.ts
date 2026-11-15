/*
 * The annex beside the strip (docs/specs/art-city.md, "Mountain and Favela quarters"), 2026-11-14:
 * "add the mountain and favela above, so the city becomes more square. doesn't have to be a square
 * map yet."
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
import {
  ANNEX_STARTS,
  ANNEX_X,
  annexBlocked,
  annexContours,
  annexDistrict,
  annexGround,
  annexItems,
  annexLocal,
  annexPlaces,
  FAVELA_ROWS,
  GATEWAYS,
  MOUNTAIN_ROWS,
} from './city-annex';
import { carItems } from './city-cars';
import { streamShip } from './city-currents';
import { farCity } from './city-far';
import { HILLS, HOUSE_TOP } from './city-favela';
import {
  BAND_ROWS,
  BANDS,
  blocked,
  blockTower,
  DISTRICTS,
  districtAt,
  districtOf,
  LANDMARKS,
} from './city-game';
import {
  ANNEX_I,
  BLOCK_X,
  BLOCK_Z,
  GROUND,
  type Item,
  inAnnex,
  mixId,
  PLAN_X0,
  planX,
  STRIP_I,
  STRIP_X,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { INDUSTRY_ROW0 } from './city-industry';
import { cityMapData, fitView, projectMap, tileLocal } from './city-minimap';
import { MOUNTAIN_Z1, PEAKS, TEMPLE_H } from './city-mountain';
import { nearestCopy, QUARTER_STARTS, quarterStart } from './city-travel';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;

afterEach(() => setFly(false, [], 0, 0));

describe('the plan, wider: the annex beside the strip', () => {
  it('doubles the tile across, so the plan is about half as long for its width', () => {
    expect(STRIP_I).toBe(12);
    expect(TILE_I).toBe(STRIP_I + ANNEX_I);
    expect(STRIP_X).toBe(312);
    expect(TILE_X).toBe(STRIP_X + ANNEX_X);
    expect(TILE_Z).toBe(TILE_J * BLOCK_Z);
    // Was 1904 by 312 (over six to one): now about three to one, and no longer.
    expect(TILE_Z / TILE_X).toBeLessThan(3.1);
    expect(TILE_Z).toBe(56 * 34);
  });

  it('keeps every quarter of the strip where it was round the avenue, copies and all', () => {
    for (let J = 0; J < TILE_J; J++) {
      const band = BANDS[Math.floor(J / BAND_ROWS)] as [string, string];
      for (let I = -STRIP_I / 2; I < STRIP_I / 2; I++) {
        const want = I < 0 ? band[0] : band[1];
        expect(districtOf(I, J)).toBe(want);
        expect(districtOf(I + TILE_I, J - TILE_J)).toBe(want);
        expect(districtOf(I - 3 * TILE_I, J + 2 * TILE_J)).toBe(want);
        const tw = blockTower(I, J);
        expect(tw.shape).not.toBe('hill');
        // Its building where it stands, in its own block.
        expect(Math.floor(tw.x / BLOCK_X)).toBe(I);
      }
    }
    // The landmarks on their crossings, three blocks either side of the avenue.
    for (const L of LANDMARKS) expect(Math.abs(L.x)).toBe(3 * BLOCK_X);
  });

  it('lays the Mountain quarter beside the strip up to the river, the Favela after, then the Industry superquarter, all open ground', () => {
    expect(MOUNTAIN_ROWS * BLOCK_Z).toBe(MOUNTAIN_Z1);
    // Three quarters along the annex (2026-11-14): the Mountain and the Favela kept, the industry last.
    expect(MOUNTAIN_ROWS + FAVELA_ROWS).toBe(INDUSTRY_ROW0);
    expect(FAVELA_ROWS).toBeGreaterThan(15);
    expect(TILE_J - INDUSTRY_ROW0).toBeGreaterThanOrEqual(10);
    for (let J = 0; J < TILE_J; J++) {
      const want = J < MOUNTAIN_ROWS ? 'mountain' : J < INDUSTRY_ROW0 ? 'favela' : 'industry';
      expect(annexDistrict(J)).toBe(want);
      for (let I = STRIP_I / 2; I < STRIP_I / 2 + ANNEX_I; I++) {
        expect(districtOf(I, J)).toBe(want);
        expect(districtOf(I - TILE_I, J + TILE_J)).toBe(want);
        const tw = blockTower(I, J);
        expect(tw.shape).toBe('hill');
        expect(tw.h).toBe(0);
      }
    }
    expect(DISTRICTS.mountain.name).toBe('Mountain quarter');
    expect(DISTRICTS.favela.name).toBe('Favela');
    expect(DISTRICTS.industry.name).toBe('Industry superquarter');
    expect(districtAt(STRIP_X / 2 + 100, 300)).toBe('mountain');
    expect(districtAt(STRIP_X / 2 + 100 - TILE_X, 1500)).toBe('favela');
    expect(inAnnex(STRIP_X / 2 + 1)).toBe(true);
    expect(inAnnex(STRIP_X / 2 - 1)).toBe(false);
    expect(inAnnex(-STRIP_X / 2 + 1)).toBe(false);
    expect(planX(STRIP_X / 2 + 10 + 5 * TILE_X)).toBeCloseTo(STRIP_X / 2 + 10);
    expect(annexLocal(STRIP_X / 2 + 10 - TILE_X, 20 + TILE_Z)).toEqual([10, 20]);
  });

  it('puts the annex above the strip on the map on a wide screen, the tile’s frame from its west edge', () => {
    const v = fitView(1200, 600);
    const [, strip] = projectMap(v, 1200, 600, 0, 0, TILE_Z / 2);
    const [, annex] = projectMap(v, 1200, 600, STRIP_X / 2 + ANNEX_X / 2, 0, TILE_Z / 2);
    expect(annex).toBeLessThan(strip);
    expect(tileLocal(STRIP_X / 2 + 10 + TILE_X, 5)[0]).toBeCloseTo(STRIP_X / 2 + 10);
    const m = cityMapData();
    expect(m.x0).toBe(PLAN_X0);
    for (const id of ['mountain', 'favela', 'industry'] as const) {
      const d = m.districts.find((q) => q.id === id);
      expect(d?.x0).toBe(STRIP_X / 2);
      expect(d?.x1).toBe(STRIP_X / 2 + ANNEX_X);
    }
    // Its topography as lines: the peaks' contours, the hills' terraces, at their heights.
    const lines = m.contours ?? [];
    expect(lines.filter((c) => c.d === 'mountain').length).toBeGreaterThan(PEAKS.length * 4);
    expect(lines.filter((c) => c.d === 'favela').length).toBe(HILLS.length * 3);
    expect(annexContours()).toHaveLength(lines.length);
    for (const c of lines) for (const [x] of c.pts) expect(inAnnex(x)).toBe(true);
    // The temples and the cable stations, named.
    expect(m.places.filter((p) => p.kind === 'temple')).toHaveLength(8);
    expect(m.places.filter((p) => p.kind === 'cable').length).toBe(
      annexPlaces().filter((p) => p.kind === 'cable').length,
    );
    // The industry's Atom tower, clockwork gate and cooling towers.
    expect(m.places.filter((p) => p.kind === 'works').map((p) => p.name)).toContain('Atom tower');
  });
});

describe('the annex: collision', () => {
  it('blocks the ship in every peak, temple, hill and house, and leaves the valleys open', () => {
    for (const p of PEAKS) {
      const q: Vec3 = [STRIP_X / 2 + p.x, GROUND + p.top * 0.6, p.z];
      expect(blocked(q)).toBe(true);
      expect(annexBlocked(q, 1.2)).toBe(true);
      expect(blocked([q[0] + 2 * TILE_X, q[1], q[2] - TILE_Z])).toBe(true);
      expect(blocked([q[0], GROUND + p.top + TEMPLE_H + 8, q[2]])).toBe(false);
      expect(annexGround(q[0], q[2])).toBeCloseTo(p.top, 6);
    }
    for (const p of HILLS) {
      expect(blocked([STRIP_X / 2 + p.x, GROUND + p.h + HOUSE_TOP - 1, p.z])).toBe(true);
      expect(blocked([STRIP_X / 2 + p.x, GROUND + p.h + HOUSE_TOP + 3, p.z])).toBe(false);
    }
    // The Mountain quarter's valley from the river, and the river through the annex.
    for (let z = MOUNTAIN_Z1 - 20; z > 600; z -= 4)
      expect(blocked([STRIP_X / 2 + 150, GROUND + 30, z])).toBe(false);
    expect(blocked([STRIP_X / 2 + 150, GROUND - 4, MOUNTAIN_Z1])).toBe(false);
    expect(blocked([STRIP_X / 2 + 150, GROUND + 1, 300 - 40])).toBe(true);
  });
});

describe('the annex: no streets, so no street traffic', () => {
  it('lets no street current or car run through its peaks and hills', () => {
    for (const cz of [200, 500, 1100, 1600])
      for (const cx of [STRIP_X / 2 + 60, STRIP_X / 2 + 160, STRIP_X / 2 + 260])
        for (let j = 0; j < 160; j++) {
          const s = streamShip(j, 160, cx, cz, 9);
          if (inAnnex(s.head[0])) expect(s.k).toBe(0);
        }
    const cars: Item[] = [];
    const eye: Vec3 = [STRIP_X / 2 + 150, GROUND + 10, 1200];
    carItems(eye, [0, 0, -1], 4, (x) => inAnnex(x), cars);
    const o = [0, 0, 0, 0, 0, 0];
    for (const c of cars) {
      c.site(0, o);
      expect(inAnnex(o[0] as number)).toBe(false);
    }
  });
});

describe('the annex: drawn, and its gateways', () => {
  it('draws both quarters and their gateways near, nothing from far across the strip', () => {
    GATEWAYS.forEach((g, gi) => {
      const out: Item[] = [];
      annexItems([g.x, GROUND + 30, g.z + 40], [0, 0, -1], 3, 400, out);
      expect(out.length).toBeGreaterThan(20);
      // The quarter's two posts, and its name between them over the way in.
      expect(out.some((it) => it.gid === mixId(gi, 75100) && it.count === 120)).toBe(true);
      expect(out.some((it) => it.d < 60 && it.count > 200 && it.gid !== mixId(gi, 75100))).toBe(
        true,
      );
    });
    // On the strip's far side, the annexes either way out of reach.
    const none: Item[] = [];
    annexItems([-40, GROUND + 30, 400], [0, 0, -1], 3, 100, none);
    expect(none).toHaveLength(0);
  });

  it('adds its contours and houses to the far city, inside the tile', () => {
    const { positions } = farCity();
    let annex = 0;
    for (let i = 0; i < positions.length; i += 3) if (inAnnex(positions[i] as number)) annex++;
    expect(annex).toBeGreaterThan(1500);
  });
});

describe('the annex: fast travel', () => {
  it('starts each quarter in it, clear, looking up its way', () => {
    for (const a of ANNEX_STARTS) {
      const q = quarterStart(a.d);
      expect(QUARTER_STARTS).toContain(q);
      expect(districtAt(q.pos[0], q.pos[2])).toBe(a.d);
      expect(blocked(q.pos)).toBe(false);
      expect(q.name).toBe(DISTRICTS[a.d].name);
    }
  });

  it('flies the ship there in about a second from anywhere, landing clear', () => {
    let t = 50;
    setFly(false, [], 0, t);
    setFly(true, [], dt, t);
    for (const d of ['mountain', 'favela', 'mountain'] as const) {
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

describe('the annex: within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains in both quarters, every grain finite', () => {
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      for (const d of ['mountain', 'favela'] as const) {
        const q = quarterStart(d);
        let t = 200;
        setFly(false, [], 0, t);
        setFly(true, [], dt, t);
        placeShip(q.pos, q.yaw);
        let lit = 0;
        let inside = 0;
        let finite = true;
        for (let f = 0; f < 4; f++) {
          t += dt;
          setFly(true, [], dt, t);
          pieceCamera(ship, t);
          lit = 0;
          inside = 0;
          for (const p of ps) {
            const g = pieceAt(p, ship, t);
            finite &&= g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite);
            const on = g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.004;
            if (!on) continue;
            lit++;
            if (inAnnex(g.pos[0]) && g.pos[1] > GROUND + 0.5) inside++;
          }
        }
        expect(finite).toBe(true);
        expect(lit).toBeLessThanOrEqual(n);
        expect(lit).toBeGreaterThan(n * 0.3);
        // The quarter itself takes a good share of what is seen there.
        expect(inside).toBeGreaterThan(n * 0.1);
        setFly(false, [], 0, 0);
      }
    }
  });
});
