import { describe, expect, it } from 'vitest';
import { PATH_SIGNS } from './chinatown-paths';
import {
  bladeUsed,
  CT_ATLAS,
  CT_BLADE_WORDS,
  CT_BOARD_FREE,
  CT_BOARD_WORDS,
  CT_PATH_CELLS,
  CT_SIGN_FLOOR,
  CT_STOREY,
  CT_TALL_FLOORS,
  CT_TONES,
  CT_UNDER_FLOORS,
  CT_UNDER_TOP,
  ctBlades,
  ctBoards,
  ctCell,
  ctCellRect,
  ctFloors,
  ctRoofs,
  ctTop,
  ctWindows,
} from './chinatown-street';
import { piecesBetween, SHOP_STEP } from './night-course';
import { CHINA_OPEN, CHINA_PERIOD, CHINATOWN, chinatownHalf } from './track';
import { UNDER, UNDER_LENGTH } from './undertown';

const W = SHOP_STEP * 0.48;
const lane = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('the street canyon (2026-11-24: "make a taller chinatown streets")', () => {
  it('stands six to eleven storeys along a slow roofline, a tall tiered tower about one in six', () => {
    const fl = lane(400).map((i) => ctFloors(i, 1, i * SHOP_STEP, false, false));
    const plain = fl.filter((f) => f < CT_TALL_FLOORS);
    expect(Math.min(...plain)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...plain)).toBeLessThanOrEqual(11);
    const tall = fl.filter((f) => f >= CT_TALL_FLOORS);
    expect(tall.length / fl.length).toBeGreaterThan(0.08);
    expect(tall.length / fl.length).toBeLessThan(0.25);
    expect(Math.max(...fl)).toBeLessThanOrEqual(CT_TALL_FLOORS + 4);
    // The mean well above the old two to five storeys: a canyon, not a row of houses.
    expect((fl.reduce((a, b) => a + b, 0) / fl.length) * CT_STOREY).toBeGreaterThan(24);
    // Neighbours alike (the roofline swells, it does not jump): most steps a storey or two.
    let small = 0;
    for (let i = 1; i < plain.length; i++) if (Math.abs(plain[i] - plain[i - 1]) <= 2) small++;
    expect(small / (plain.length - 1)).toBeGreaterThan(0.75);
  });

  it('is the same every time, two storeys taller on the avenues, low under Undertown', () => {
    expect(ctFloors(17, -1, 238, false, false)).toBe(ctFloors(17, -1, 238, false, false));
    expect(ctFloors(17, -1, 238, true, false)).toBe(ctFloors(17, -1, 238, false, false) + 2);
    for (const i of lane(200)) {
      const f = ctFloors(i, 1, i * SHOP_STEP, true, true);
      expect(f).toBeLessThanOrEqual(CT_UNDER_FLOORS);
      // Crown and all, under Undertown's hanging houses (the road runs 2 × AXIS over the street).
      expect(ctTop(f, true)).toBeLessThanOrEqual(CT_UNDER_TOP);
      expect(CT_UNDER_TOP).toBeLessThan(2 * UNDER.AXIS - 12);
    }
  });

  it('crowns them in three roofs, five and a spire on the tall towers, one under Undertown', () => {
    expect(ctRoofs(8, false)).toBe(3);
    expect(ctRoofs(CT_TALL_FLOORS, false)).toBe(5);
    expect(ctRoofs(CT_TALL_FLOORS, true)).toBe(1);
    expect(ctTop(CT_TALL_FLOORS, false)).toBeGreaterThan(CT_TALL_FLOORS * CT_STOREY + 5 * 2.6);
  });
});

describe('the publicity panels', () => {
  it('stacks blade signs up every face at several heights, more and bigger on the tall towers', () => {
    for (const i of lane(120)) {
      for (const side of [1, -1] as const) {
        const floors = ctFloors(i, side, i * SHOP_STEP, false, false);
        const bl = ctBlades(i, side, floors, W);
        const H = floors * CT_STOREY;
        expect(bl.length).toBeGreaterThanOrEqual(floors >= 6 ? 2 : 1);
        if (floors >= CT_TALL_FLOORS) expect(bl.length).toBeGreaterThanOrEqual(4);
        for (const b of bl) {
          // Over the pavement's head height, under the eaves, on the face.
          expect(b.lift).toBeGreaterThanOrEqual(CT_SIGN_FLOOR);
          expect(b.lift + b.h).toBeLessThanOrEqual(H - 0.8 + 1e-9);
          expect(Math.abs(b.da)).toBeLessThan(W);
          // The atlas' proportions: as tall as its lettering.
          const word = ctCell('blade', b.cell).word;
          expect(b.h / b.out).toBeCloseTo(bladeUsed(word) / CT_ATLAS.blade[0], 9);
        }
        // Never two on one level of a tower overlapping.
        const sorted = [...bl].sort((a, b) => a.lift - b.lift);
        for (let k = 1; k < sorted.length; k++)
          expect(sorted[k].lift).toBeGreaterThan(sorted[k - 1].lift + sorted[k - 1].h - 1e-9);
      }
    }
  });

  it('staggers them, so across the street two never stand at the same end of their faces', () => {
    let pairs = 0;
    for (const i of lane(40)) {
      const a = ctBlades(i, 1, 14, W);
      const b = ctBlades(i, -1, 14, W);
      for (const x of a) {
        const y = b.find((q) => q.level === x.level);
        if (!y) continue;
        pairs++;
        expect(Math.sign(x.da)).not.toBe(Math.sign(y.da));
      }
      // And up a face they step from one end to the other.
      for (let k = 1; k < a.length; k++)
        if (a[k].level === a[k - 1].level + 1)
          expect(Math.sign(a[k].da)).not.toBe(Math.sign(a[k - 1].da));
    }
    expect(pairs).toBeGreaterThan(80);
  });

  it('hangs horizontal boards between the blades, on storeys without a balcony', () => {
    let boards = 0;
    for (const i of lane(90)) {
      const floors = ctFloors(i, 1, i * SHOP_STEP, false, false);
      const bl = ctBlades(i, 1, floors, W);
      const bo = ctBoards(i, 1, floors, W);
      if (i % 3 === 2) expect(bo).toEqual([]);
      boards += bo.length;
      for (const o of bo) {
        expect(o.len / o.h).toBeCloseTo(4, 9);
        expect(o.len).toBeLessThanOrEqual(2 * W);
        expect(Math.round((o.lift - 0.5) / CT_STOREY) % 2).toBe(0);
        expect(o.lift + o.h).toBeLessThanOrEqual(floors * CT_STOREY - 1);
        for (const b of bl) expect(o.lift + o.h < b.lift || o.lift > b.lift + b.h).toBe(true);
      }
    }
    expect(boards).toBeGreaterThan(50);
  });

  it('letters 32 blade and 32 board cells on one atlas, cut to their lettering, never overlapping', () => {
    const rects = (['blade', 'board'] as const).flatMap((k) =>
      lane(CT_ATLAS.cells).map((c) => ctCellRect(k, c)),
    );
    for (const r of rects) {
      expect(r.x + r.w).toBeLessThanOrEqual(CT_ATLAS.size);
      expect(r.y + r.h).toBeLessThanOrEqual(CT_ATLAS.size);
      for (const v of r.uv) expect(v >= 0 && v <= 1).toBe(true);
      expect(r.uv[3]).toBeGreaterThan(r.uv[1]);
    }
    for (let a = 0; a < rects.length; a++)
      for (let b = a + 1; b < rects.length; b++) {
        const A = rects[a];
        const B = rects[b];
        const apart = A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y;
        expect(apart).toBe(true);
      }
    // Every word gets a cell, in more than one tone; the four-character ones fit their cell.
    const words = new Set(lane(32).map((c) => ctCell('blade', c).word));
    expect(words).toEqual(new Set(CT_BLADE_WORDS));
    expect(new Set(lane(CT_BOARD_FREE).map((c) => ctCell('board', c).word))).toEqual(
      new Set(CT_BOARD_WORDS),
    );
    // The last cells sign the two paths (lib/art/chinatown-paths.ts).
    expect(ctCell('board', CT_PATH_CELLS.deep).word).toBe(PATH_SIGNS.deep);
    expect(ctCell('board', CT_PATH_CELLS.under).word).toBe(PATH_SIGNS.under);
    expect(ctCell('board', CT_PATH_CELLS.main).word).toBe(PATH_SIGNS.main);
    expect(ctCell('board', CT_PATH_CELLS.balcony).word).toBe(PATH_SIGNS.balcony);
    expect(new Set(lane(32).map((c) => ctCell('blade', c).tone)).size).toBe(CT_TONES.length);
    for (const w of CT_BLADE_WORDS) expect(bladeUsed(w)).toBeLessThanOrEqual(CT_ATLAS.blade[1]);
    expect(ctCell('blade', -1)).toEqual(ctCell('blade', 31));
  });

  it('keeps to red and gold with a little neon', () => {
    const neon = CT_TONES.filter((t) => t.ink === '#5cf0a8' || t.ink === '#ff5ab4');
    expect(neon.length).toBeLessThanOrEqual(CT_TONES.length / 4);
  });
});

describe('the windows', () => {
  it('lights about a third of a grid up the street face, the same every time', () => {
    const w = ctWindows(5, 1, 10, W);
    expect(w).toEqual(ctWindows(5, 1, 10, W));
    const cols = Math.floor((2 * W - 1.6) / 2.2);
    const share = w.length / (cols * 9);
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.6);
    for (const p of w) {
      expect(Math.abs(p.da)).toBeLessThan(W);
      expect(p.h).toBeGreaterThan(CT_STOREY);
      expect(p.h).toBeLessThan(10 * CT_STOREY);
    }
  });
});

describe('Chinatown Run, longer (2026-11-24: "chinatown make it longer")', () => {
  it('runs 1,100 m of lane, then 900 m of avenue', () => {
    expect(chinatownHalf(500)).toBeCloseTo(10, 6);
    expect(chinatownHalf(CHINA_OPEN + 450)).toBeCloseTo(15, 6);
    expect(chinatownHalf(CHINA_PERIOD + 500)).toBeCloseTo(10, 6);
    expect(CHINA_OPEN).toBeGreaterThan(1000);
  });

  it('lets Undertown come round less often, after 1.3 km of street, never overlapping itself', () => {
    expect(UNDER.AT).toBeGreaterThanOrEqual(1000);
    expect(UNDER.EVERY).toBeGreaterThan(3000);
    expect(UNDER.EVERY - UNDER_LENGTH).toBeGreaterThan(2000);
  });

  it('furnishes the canyon with blades, boards and high strings of light, nothing in Undertown’s flips', () => {
    const ps = piecesBetween('chinatown', CHINATOWN, 0, 6000);
    const kinds = new Map<string, number>();
    for (const p of ps) kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
    const shops = kinds.get('shophouse') ?? 0;
    expect((kinds.get('blade') ?? 0) / shops).toBeGreaterThan(2);
    expect((kinds.get('billboard') ?? 0) / shops).toBeGreaterThan(0.5);
    expect(kinds.get('lights') ?? 0).toBeGreaterThan(5);
    for (const p of ps) {
      if (p.kind === 'blade' || p.kind === 'billboard') expect(p.cell).toBeGreaterThanOrEqual(0);
      // Under Undertown the street stays low (towers, crowns and their signs).
      const x = (p.s - UNDER.AT) % UNDER.EVERY;
      if (p.s >= UNDER.AT && x >= 0 && x < UNDER_LENGTH) {
        if (p.kind === 'shophouse') expect(p.h).toBeLessThanOrEqual(CT_UNDER_FLOORS * CT_STOREY);
        if (p.kind === 'blade' || p.kind === 'billboard')
          expect(p.lift + p.h).toBeLessThanOrEqual(CT_UNDER_TOP);
        expect(p.kind === 'lights').toBe(false);
      }
    }
  });
});
