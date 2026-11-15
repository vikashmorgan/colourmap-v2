/*
 * The Favela quarter (docs/specs/art-city.md, "Mountain and Favela quarters"), 2026-11-14: "add
 * the mountain and favela above, so the city becomes more square."
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { ANNEX_X } from './city-annex';
import {
  FAVELA_Z0,
  FAVELA_Z1,
  favelaGeo,
  favelaHeight,
  favelaItems,
  HILLS,
  HOUSE_SITES,
  HOUSE_STRIDE,
  HOUSE_TOP,
  hillFoot,
  hillSurface,
  houseCount,
  houseSite,
  STOREY,
  stairAngles,
  TERRACE,
  WALLS,
} from './city-favela';
import { GROUND, type Item, STRIP_X, TILE_Z } from './city-grid';
import { RIVER_W } from './city-rain';

const sites = (items: Item[], step = 1) => {
  const out: number[][] = [];
  for (const it of items)
    for (let s = 0; s < it.count; s += step) {
      const o = [0, 0, 0, 0, 0, 0];
      if (it.site(s, o)) out.push(o);
    }
  return out;
};
/**
 * An eye at the Favela's far end (its edge with the Industry superquarter since 2026-11-14),
 * looking up the tile (−z) over its hills.
 */
const EYE: Vec3 = [STRIP_X / 2 + 160, GROUND + 50, FAVELA_Z1 - 30];

describe('the Favela: hills past the river', () => {
  it('raises its hills inside the annex, past the river, before the industry and the tile’s end', () => {
    expect(FAVELA_Z1).toBeLessThan(TILE_Z);
    expect(HILLS.length).toBeGreaterThanOrEqual(6);
    for (const p of HILLS) {
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        const r = hillFoot(p, a);
        expect(r).toBeLessThan(1.15 * p.r);
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(ANNEX_X - 5);
        expect(z).toBeGreaterThan(FAVELA_Z0 + RIVER_W);
        expect(z).toBeLessThan(FAVELA_Z1);
      }
      expect(hillSurface(p.x, p.z)).toBeCloseTo(p.h, 6);
    }
  });

  it('holds the ship off its hills and houses, and is open over them and between', () => {
    for (const p of HILLS) {
      expect(favelaHeight(p.x, p.z)).toBeCloseTo(p.h + HOUSE_TOP, 6);
      expect(favelaHeight(p.x + p.r * 0.5, p.z)).toBeGreaterThan(HOUSE_TOP);
    }
    // Off the hills, open: the river's bank, and the far side of the annex beside the first hill.
    expect(favelaHeight(150, FAVELA_Z0 + RIVER_W + 4)).toBe(0);
    for (let x = 0; x < ANNEX_X; x += 3)
      for (let z = FAVELA_Z0; z < FAVELA_Z1; z += 3) {
        const h = favelaHeight(x, z);
        expect(h === 0 || h >= HOUSE_TOP).toBe(true);
        expect(h > 0).toBe(hillSurface(x, z) > 0 || h === HOUSE_TOP);
      }
  });
});

describe('the Favela: small stacked houses', () => {
  it('covers its hills densely: thousands of houses, hundreds a hill', () => {
    const G = favelaGeo();
    expect(favelaGeo()).toBe(G);
    // Six hills since the industry took the annex's last rows (2026-11-14): still thousands.
    expect(houseCount()).toBeGreaterThan(5000);
    HILLS.forEach((p, hi) => {
      const n = G.rows.filter((r) => r.hill === hi).reduce((s, r) => s + r.n, 0);
      expect(n).toBeGreaterThan(400);
      // At least one house to every twenty square metres of the hill.
      expect(n / (Math.PI * p.r * p.r)).toBeGreaterThan(0.05);
    });
  });

  it('stands each house on its terrace, one to three storeys, side by side along it', () => {
    const G = favelaGeo();
    const H = G.houses;
    for (const row of G.rows) {
      const p = HILLS[row.hill] as (typeof HILLS)[number];
      expect(row.y).toBeCloseTo(row.k * TERRACE, 9);
      let lastA = Number.NEGATIVE_INFINITY;
      for (let h = row.start; h < row.start + row.n; h++) {
        const i = h * HOUSE_STRIDE;
        expect(H[i + 2]).toBeCloseTo(row.y, 4);
        const storeys = (H[i + 11] as number) & 3;
        expect(storeys).toBeGreaterThanOrEqual(1);
        expect(storeys).toBeLessThanOrEqual(3);
        expect(H[i + 7]).toBeCloseTo(row.y + storeys * STOREY, 4);
        // On the hill, inside its terrace's ring, in order round it.
        const a = Math.atan2((H[i + 1] as number) - p.z, (H[i] as number) - p.x);
        const aa = a < lastA - 1e-6 ? a + Math.PI * 2 : a;
        expect(aa).toBeGreaterThanOrEqual(lastA - 1e-6);
        lastA = aa;
        expect(hillSurface(H[i] as number, H[i + 1] as number)).toBeGreaterThan(row.y - 1e-6);
      }
    }
  });

  it('paints them in a warm palette, a few cool ones among them; tanks and antennas on some roofs', () => {
    const H = favelaGeo().houses;
    const n = houseCount();
    let warm = 0;
    let tanks = 0;
    let antennas = 0;
    const colours = WALLS.map((c) => c.join(','));
    for (let h = 0; h < n; h++) {
      const i = h * HOUSE_STRIDE;
      const c = [H[i + 8], H[i + 9], H[i + 10]].map((v) => Math.round((v as number) * 100) / 100);
      expect(colours).toContain(c.join(','));
      if ((c[0] as number) >= (c[2] as number)) warm++;
      const f = H[i + 11] as number;
      if (f & 4) tanks++;
      if (f & 8) antennas++;
    }
    expect(warm / n).toBeGreaterThan(0.7);
    expect(tanks / n).toBeGreaterThan(0.2);
    expect(tanks / n).toBeLessThan(0.5);
    expect(antennas / n).toBeGreaterThan(0.1);
    expect(antennas / n).toBeLessThan(0.3);
  });

  it('lights some windows warm, never on a storey a house does not have', () => {
    const H = favelaGeo().houses;
    const o = [0, 0, 0, 0, 0, 0];
    let lit = 0;
    for (let h = 0; h < 500; h++) {
      const storeys = (H[h * HOUSE_STRIDE + 11] as number) & 3;
      for (let s = 18; s < 24; s++) {
        const on = houseSite(H, h, s, 3, 0, 0, o);
        if ((s - 18) >> 1 >= storeys) expect(on).toBe(false);
        if (on) {
          lit++;
          expect(o[3] as number).toBeGreaterThan(o[5] as number);
          expect(o[1] as number).toBeLessThanOrEqual(GROUND + (H[h * HOUSE_STRIDE + 7] as number));
        }
      }
    }
    expect(lit).toBeGreaterThan(300);
  });

  it('keeps four stairways clear up every hill, and hangs strings of lights along its terraces', () => {
    const G = favelaGeo();
    HILLS.forEach((p, hi) => {
      const ways = stairAngles(p);
      expect(G.stairs.filter((s) => s.hill === hi)).toHaveLength(4);
      // No house on a stairway's way.
      for (const row of G.rows.filter((r) => r.hill === hi)) {
        for (let h = row.start; h < row.start + row.n; h++) {
          const i = h * HOUSE_STRIDE;
          const a = Math.atan2((G.houses[i + 1] as number) - p.z, (G.houses[i] as number) - p.x);
          for (const w of ways) {
            const da = Math.abs(((a - w + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            expect(da * row.r).toBeGreaterThan(2.2);
          }
        }
      }
      expect(G.strings.filter((s) => s.hill === hi).length).toBeGreaterThan(2);
    });
    // The stairs climb from the foot to near the top.
    for (const st of G.stairs) {
      const p = HILLS[st.hill] as (typeof HILLS)[number];
      const y0 = G.steps[st.start * 5 + 1] as number;
      const y1 = G.steps[(st.start + st.n - 1) * 5 + 1] as number;
      expect(y0).toBeLessThan(3);
      expect(y1).toBeGreaterThan(p.h * 0.9);
    }
  });
});

describe('the Favela: drawn', () => {
  it('draws its houses, lights and stairs from its end, finite, softly lit', () => {
    const out: Item[] = [];
    favelaItems(EYE, [0, 0, -1], 7, 400, out);
    expect(out.length).toBeGreaterThan(30);
    const all = sites(out, 5);
    expect(all.length).toBeGreaterThan(3000);
    for (const o of all) {
      expect(o.every(Number.isFinite)).toBe(true);
      for (const c of [3, 4, 5]) {
        expect(o[c]).toBeGreaterThanOrEqual(0);
        expect(o[c]).toBeLessThanOrEqual(0.7);
      }
    }
    // Each house its full set of sites.
    expect(out.some((it) => it.count % HOUSE_SITES === 0 && it.count > HOUSE_SITES * 20)).toBe(
      true,
    );
    // Twinkling slowly: a frame later no light moves by 0.01.
    const a: Item[] = [];
    const b: Item[] = [];
    favelaItems(EYE, [0, 0, -1], 7, 400, a);
    favelaItems(EYE, [0, 0, -1], 7 + 1 / 60, 400, b);
    const o1 = [0, 0, 0, 0, 0, 0];
    const o2 = [0, 0, 0, 0, 0, 0];
    for (let k = 0; k < a.length; k++) {
      for (let s = 0; s < (a[k] as Item).count; s += 11) {
        if (!(a[k] as Item).site(s, o1)) continue;
        (b[k] as Item).site(s, o2);
        for (const c of [3, 4, 5])
          expect(Math.abs((o1[c] as number) - (o2[c] as number))).toBeLessThan(0.01);
      }
    }
  });

  it('draws nothing from the Mountain quarter looking away', () => {
    const out: Item[] = [];
    favelaItems([STRIP_X / 2 + 150, GROUND + 40, 300], [0, 0, -1], 0, 300, out);
    expect(out.length).toBe(0);
  });
});
