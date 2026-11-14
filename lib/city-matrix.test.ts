import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { AVENUE_STYLES } from './city-avenue';
import {
  BAND_ROWS,
  BANDS,
  blocked,
  blockTower,
  CODE_WELCOME,
  DISTRICTS,
  gameItems,
  SIGN_STRINGS,
} from './city-game';
import { GROUND, type Item, TILE_I, TILE_J } from './city-grid';
import {
  BLINK_LOW,
  BLINK_MAX,
  BLINK_MIN,
  blinkLevel,
  blinkOf,
  MATRIX_J0,
  MATRIX_ROWS,
  matrixBoost,
  matrixDepth,
  matrixForm,
  matrixHolds,
  matrixTowerItem,
  outline,
  perimeter,
  runHead,
  runOf,
} from './city-matrix';
import { cityMapData } from './city-minimap';
import { codeHeight } from './city-rise';
import { quarterStart } from './city-travel';

const J0 = BANDS.findIndex((b) => b[0] === 'code') * BAND_ROWS;

/** Every lit site of an item, sampled: green the strongest of the three, finite. */
function greenOnly(it: Item): number {
  const o = [0, 0, 0, 0, 0, 0];
  let n = 0;
  for (let s = 0; s < it.count; s += Math.max(1, Math.floor(it.count / 600))) {
    if (!it.site(s, o)) continue;
    expect(o.every(Number.isFinite)).toBe(true);
    expect(o[4] as number).toBeGreaterThanOrEqual(o[3] as number);
    expect(o[4] as number).toBeGreaterThanOrEqual(o[5] as number);
    n++;
  }
  return n;
}

/** The quarter's code towers, off the avenue, with their row. */
function towers() {
  const out = [];
  for (let J = J0; J < J0 + BAND_ROWS; J++)
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++) {
      const tw = blockTower(I, J);
      if (tw.shape === 'code' && I !== 0 && I !== -1) out.push(tw);
    }
  return out;
}

describe('the Matrix quarter: its name (2026-11-14, was the Green Code)', () => {
  it('is called the Matrix quarter everywhere a player reads it', () => {
    expect(DISTRICTS.code.name).toBe('Matrix quarter');
    expect(CODE_WELCOME).toContain('MATRIX QUARTER');
    expect(quarterStart('code').name).toBe('Matrix quarter');
    expect(AVENUE_STYLES.some((b) => b.name === 'MATRIX')).toBe(true);
    const shown = [
      ...Object.values(DISTRICTS).flatMap((d) => [d.name, d.landmark ?? '', d.signature]),
      ...SIGN_STRINGS,
      ...AVENUE_STYLES.map((b) => b.name),
      ...cityMapData().districts.map((d) => JSON.stringify(d)),
    ].join('\n');
    expect(shown).not.toMatch(/green code/i);
  });
});

describe('the Matrix quarter: forms by depth (2026-11-14)', () => {
  it('finds its rows in the plan and counts their depth from the entry edges', () => {
    expect(MATRIX_J0).toBe(J0);
    expect(MATRIX_ROWS).toBe(BAND_ROWS);
    expect(matrixDepth(J0)).toBe(0);
    expect(matrixDepth(J0 + BAND_ROWS - 1)).toBe(0);
    expect(matrixDepth(J0 + 1)).toBe(1);
    expect(matrixDepth(J0 + 3)).toBe(3);
    expect(matrixDepth(J0 - 1)).toBe(-1);
    expect(matrixDepth(J0 + TILE_J)).toBe(0);
  });

  it('stands round tubes at the entrance, octagons next, square blocks deeper in', () => {
    const all = towers();
    const at = (d: number) => all.filter((tw) => matrixDepth(tw.J) === d);
    expect(at(0).length).toBeGreaterThan(8);
    for (const tw of at(0)) expect(matrixForm(tw.I, tw.J)).toBe('round');
    for (const tw of at(1)) expect(matrixForm(tw.I, tw.J)).toBe('octagon');
    for (const tw of [...at(2), ...at(3)]) expect(matrixForm(tw.I, tw.J)).toBe('square');
    // The avenue's own towers stay square, whatever the row.
    expect(matrixForm(0, J0)).toBe('square');
    expect(matrixForm(-1, J0)).toBe('square');
    // Round and octagonal towers are as deep as wide.
    for (const tw of [...at(0), ...at(1)]) expect(tw.hz).toBeCloseTo(tw.hx, 9);
  });

  it('holds the ship off a round tube by its circle, so it can fly round close by the corners', () => {
    const tw = towers().find((x) => matrixForm(x.I, x.J) === 'round');
    expect(tw).toBeDefined();
    if (!tw) return;
    const y = GROUND + 4;
    expect(blocked([tw.x, y, tw.z])).toBe(true);
    expect(blocked([tw.x + tw.hx * 0.9, y, tw.z])).toBe(true);
    // Just off a box's corner, but outside the circle (and its margin): free.
    const c = (tw.hx + 1.3) * 0.86;
    expect(blocked([tw.x + c, y, tw.z + c])).toBe(false);
    expect(matrixHolds('round', c, c, tw.hx, tw.hz, 1.2)).toBe(false);
    expect(matrixHolds('square', c, c, tw.hx, tw.hz, 1.2)).toBe(true);
    // The octagon cuts its corners too, less.
    expect(matrixHolds('octagon', 0.8, 0.8, 1, 1, 0)).toBe(false);
    expect(matrixHolds('octagon', 0.6, 0.6, 1, 1, 0)).toBe(true);
  });

  it('walks every outline all the way round, its normals pointing out', () => {
    const o = [0, 0, 0, 0];
    for (const form of ['round', 'octagon', 'square'] as const) {
      let len = 0;
      let last: [number, number] | null = null;
      for (let i = 0; i <= 400; i++) {
        outline(form, 5, 7, i / 400, o);
        expect(o[0] * o[2] + o[1] * o[3]).toBeGreaterThan(0);
        if (last) len += Math.hypot(o[0] - last[0], o[1] - last[1]);
        last = [o[0], o[1]];
      }
      expect(len).toBeCloseTo(perimeter(form, 5, form === 'square' ? 7 : 5), 0);
    }
  });
});

describe('the Matrix quarter: rising, blinking and running lights (2026-11-14)', () => {
  it('moves most towers up and down, by a lot, smoothly', () => {
    const all = towers();
    let moving = 0;
    for (const tw of all) {
      let lo = tw.h;
      for (let f = 0; f < 20 * 30; f++) lo = Math.min(lo, codeHeight(tw.h, tw.k, f / 30));
      if (lo < tw.h - 1e-9) moving++;
      if (lo < tw.h - 1e-9) expect(tw.h - lo).toBeGreaterThan(Math.min(tw.h * 0.29, 28));
    }
    expect(moving).toBeGreaterThan(all.length * 0.55);
  });

  it('blinks some towers softly on a one-and-a-quarter to two second rhythm, staggered, never dark', () => {
    const all = towers();
    const blinking = all.filter((tw) => blinkOf(tw.k));
    expect(blinking.length).toBeGreaterThan(all.length * 0.15);
    expect(blinking.length).toBeLessThan(all.length * 0.5);
    const phases = new Set(blinking.map((tw) => (blinkOf(tw.k)?.phase ?? 0).toFixed(2)));
    expect(phases.size).toBeGreaterThan(blinking.length * 0.6);
    for (const tw of blinking.slice(0, 12)) {
      const b = blinkOf(tw.k) as NonNullable<ReturnType<typeof blinkOf>>;
      expect(b.period).toBeGreaterThanOrEqual(BLINK_MIN);
      expect(b.period).toBeLessThanOrEqual(BLINK_MAX);
      let lo = 1;
      let hi = 0;
      let last = blinkLevel(tw.k, 0);
      for (let f = 1; f < 6 * 60; f++) {
        const v = blinkLevel(tw.k, f / 60);
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
        // Eased: never more than a soft step a frame, so never a strobe.
        expect(Math.abs(v - last)).toBeLessThan(0.1);
        last = v;
      }
      expect(lo).toBeGreaterThanOrEqual(BLINK_LOW - 1e-9);
      expect(lo).toBeLessThan(0.3);
      expect(hi).toBeGreaterThan(0.95);
    }
    for (const tw of all.filter((x) => !blinkOf(x.k))) expect(blinkLevel(tw.k, 3.3)).toBe(1);
  });

  it('runs each tower’s streaks one way only, fast, and brightens them as the ship comes close', () => {
    const modes = new Set<string>();
    for (const tw of towers()) {
      const run = runOf(tw.k);
      modes.add(run.mode);
      expect(run.speed).toBeGreaterThan(20);
      // The head moves forward every frame (but where it comes round, past the end).
      let last = runHead(run, 0, tw.h, 0);
      let back = 0;
      for (let f = 1; f < 120; f++) {
        const hd = runHead(run, 0, tw.h, f / 60);
        if (hd < last) back++;
        last = hd;
      }
      // It comes round once a lap: a lap is the height and a little more.
      expect(back).toBeLessThanOrEqual(Math.ceil((2 * run.speed) / (tw.h + 25)));
    }
    expect(modes).toEqual(new Set(['up', 'down', 'around']));
    const tw = towers()[0] as ReturnType<typeof blockTower>;
    const far = matrixBoost(tw.x, tw.z, tw.hx, tw.h, [tw.x + 80, GROUND + 10, tw.z]);
    const close = matrixBoost(tw.x, tw.z, tw.hx, tw.h, [tw.x + tw.hx + 3, GROUND + 10, tw.z]);
    expect(far).toBe(0);
    expect(close).toBeGreaterThan(0.8);
  });

  it('draws every form in green only, its streaks brighter with the ship close', () => {
    const all = towers();
    for (const form of ['round', 'octagon', 'square'] as const) {
      const tw = all.find((x) => matrixForm(x.I, x.J) === form);
      expect(tw).toBeDefined();
      if (!tw) continue;
      const eye: Vec3 = [tw.x - 30, GROUND + 20, tw.z + 40];
      for (const t of [0.4, 2.7, 9.1]) {
        const it = matrixTowerItem(tw, form, eye, t, 30, eye);
        expect(greenOnly(it)).toBeGreaterThan(40);
        expect(it.count).toBeLessThan(5000);
      }
      // The streaks: the last sites. Brighter, all summed, with the ship against the wall.
      const sum = (ship: Vec3) => {
        const it = matrixTowerItem(tw, form, eye, 1.3, 30, ship);
        const o = [0, 0, 0, 0, 0, 0];
        let s = 0;
        for (let i = Math.max(0, it.count - 200); i < it.count; i++)
          if (it.site(i, o)) s += o[4] as number;
        return s;
      };
      expect(sum([tw.x + tw.hx + 2, GROUND + 10, tw.z])).toBeGreaterThan(
        sum([tw.x + 200, GROUND + 10, tw.z]),
      );
    }
  });

  it('adds its towers to the game’s picture near the eye, green, round at the entrance', () => {
    const tw = towers().find((x) => matrixForm(x.I, x.J) === 'round');
    if (!tw) throw new Error('no round tower');
    const eye: Vec3 = [tw.x, GROUND + 15, tw.z + 60];
    const items = gameItems(eye, [0, -0.1, -1], 4, eye).filter((it) => it.d < 50);
    expect(items.length).toBeGreaterThan(2);
  });
});
