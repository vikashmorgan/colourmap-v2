import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { route } from './city';
import { textPixels } from './city-font';
import { blockTower, gameItems } from './city-game';
import { GROUND, TILE_Z, wrap } from './city-grid';
import {
  boardsOn,
  brandLines,
  frameOf,
  gateGlow,
  OPENING,
  POSTERS,
  passGate,
  posterBoardItem,
  posterOn,
  posterSigns,
  resetGates,
  signPoint,
  TORII,
  TORII_Z,
  toriiItem,
  type WordSign,
  welcomeSign,
  wordItem,
} from './city-signs';

const finite = (v: number[]) => v.every(Number.isFinite);
const C1: [number, number, number] = [1, 0.5, 0.2];

describe('signs that read (2026-11-13: "check how banner typos can be better")', () => {
  it('reads from both sides: from behind the letters are laid the other way, never mirrored', () => {
    const w: WordSign = { text: 'BAR', at: [10, 20, 5], px: 0.5, rgb: C1, key: 1 };
    const W = textPixels('BAR', { fill: true }).w * w.px;
    const front = signPoint(w, W, 0, 0, false);
    const back = signPoint(w, W, 0, 0, true);
    // The first letter's first column: on the reader's left both ways (left is -x from +z, +x from -z).
    expect(front[0]).toBeCloseTo(10 + 0.25);
    expect(back[0]).toBeCloseTo(10 + W - 0.25);
    expect(front[1]).toBe(back[1]);
    // Drawn from either side, every site somewhere finite and lit.
    const o = [0, 0, 0, 0, 0, 0];
    for (const eye of [
      [10, 20, 40],
      [10, 20, -40],
    ] as Vec3[]) {
      const it = wordItem(w, eye, 3);
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(finite(o)).toBe(true);
      }
    }
  });

  it('frames the big banners, underlines the smaller words, and fills the strokes', () => {
    expect(frameOf({ text: 'A', at: [0, 0, 0], px: 0.5, rgb: C1, key: 0 })).toBe('box');
    expect(frameOf({ text: 'A', at: [0, 0, 0], px: 0.25, rgb: C1, key: 0 })).toBe('line');
    const w = welcomeSign(0, 100, 1);
    expect(frameOf(w)).toBe('box');
    const it = wordItem(w, [0, GROUND + 20, 160], 0);
    expect(it.count).toBeGreaterThan(textPixels(w.text, { face: 'deco' }).px.length / 2);
  });

  it('breathes slowly: no sign light jumps between frames', () => {
    const w = welcomeSign(0, 100, 1);
    const o = [0, 0, 0, 0, 0, 0];
    const p = [0, 0, 0, 0, 0, 0];
    for (let t = 0; t < 10; t += 0.25) {
      const a = wordItem(w, [0, GROUND + 20, 160], t);
      const b = wordItem(w, [0, GROUND + 20, 160], t + 1 / 60);
      for (let s = 0; s < a.count; s += 37) {
        a.site(s, o);
        b.site(s, p);
        expect(Math.abs((o[3] as number) - (p[3] as number))).toBeLessThan(0.02);
      }
    }
  });
});

describe('posters and hanging boards (2026-11-13: "affiches publicitaires. cool pancartes")', () => {
  it('advertises invented brands on a few roofs, the brand bold over its line', () => {
    expect(POSTERS.length).toBeGreaterThanOrEqual(8);
    expect(brandLines('GLOWBERRY SODA')).toBe('GLOWBERRY\nSODA');
    expect(brandLines('BAR')).toBe('BAR');
    let found = 0;
    let towers = 0;
    for (let J = 30; J < 48; J++) {
      for (let I = -6; I < 6; I++) {
        const tw = blockTower(I, J);
        if (tw.shape !== 'box') continue;
        towers++;
        const p = posterOn(tw, C1);
        if (!p) continue;
        found++;
        const [a, b] = posterSigns(p) as [WordSign, WordSign];
        // The board fits the roof, the brand above its line, both above the roof.
        expect(textPixels(brandLines(p.brand), { face: 'deco' }).w * a.px).toBeLessThanOrEqual(p.w);
        expect(a.at[1]).toBeGreaterThan(b.at[1]);
        expect(b.at[1] - textPixels(b.text, { face: 'tall' }).h * b.px).toBeGreaterThan(p.at[1]);
        const it = posterBoardItem(p, [p.at[0], p.at[1], p.at[2] + 40], 2);
        const o = [0, 0, 0, 0, 0, 0];
        for (let s = 0; s < it.count; s += 7) {
          it.site(s, o);
          expect(finite(o)).toBe(true);
        }
      }
    }
    // With care, not noise: a few roofs in every hundred.
    expect(found).toBeGreaterThan(0);
    expect(found / towers).toBeLessThan(0.2);
  });

  it('hangs boards out from the walls, a word stacked top to bottom, clear of the street', () => {
    const tw = { x: 40, z: 300, hx: 8, hz: 11, h: 40, k: 777 };
    const boards = boardsOn(tw, [-1, 1], [0.3, 0.75], [C1]);
    expect(boards.length).toBe(4);
    for (const b of boards) {
      const T = textPixels(b.text, { face: 'brush', vertical: true });
      expect(b.vertical).toBe(true);
      expect(T.h).toBeGreaterThan(T.w);
      expect(b.at[1] - T.h * b.px).toBeGreaterThanOrEqual(GROUND + 2 - 1e-9);
      expect(b.at[1]).toBeLessThanOrEqual(GROUND + tw.h);
    }
  });
});

describe('the road you start on (2026-11-13: "a cool entry for the game")', () => {
  it('starts the Ship at the head of the opening road, its gates ahead down to Chinatown', () => {
    expect(wrap(route(0).c[2], TILE_Z)).toBeCloseTo(OPENING.start, 0);
    for (const z of TORII_Z) {
      expect(z).toBeGreaterThan(OPENING.end);
      expect(z).toBeLessThan(OPENING.start);
    }
    expect(OPENING.welcome).toBeGreaterThan(OPENING.end);
    expect(OPENING.welcome).toBeLessThan(OPENING.start);
    // The route flies under every lintel, between the posts.
    for (let t = 0; t < 22; t += 0.5) {
      const c = route(t).c;
      expect(Math.abs(c[0])).toBeLessThan(TORII.post - 1);
      expect(c[1]).toBeLessThan(GROUND + TORII.beam - 1);
    }
  });

  it('lights a gate softly as you pass through it, and keeps it glowing', () => {
    resetGates();
    expect(gateGlow(Number.NaN)).toBeCloseTo(0.3);
    let last = gateGlow(0);
    for (let s = 0; s < 120; s += 1 / 60) {
      const g = gateGlow(s);
      expect(Math.abs(g - last)).toBeLessThan(0.02);
      last = g;
    }
    expect(gateGlow(600)).toBeGreaterThan(0.45);
    const z = TORII_Z[0] as number;
    expect(Number.isNaN(passGate(5, z, 0, [0, GROUND + 20, z + 30], 1))).toBe(true);
    expect(passGate(5, z, 0, [0, GROUND + 20, z + 1], 2)).toBe(2);
    expect(passGate(5, z, 0, [0, GROUND + 20, z - 30], 9)).toBe(2);
    const it = toriiItem(z, 0, [0, GROUND + 20, z + 20], 3, 6);
    const o = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < it.count; s++) {
      expect(it.site(s, o)).toBe(true);
      expect(finite(o)).toBe(true);
      expect(o[1] as number).toBeLessThan(GROUND + TORII.lintel + 2);
    }
  });

  it('dresses the first seconds: gates, the welcome and boards in sight from the start', () => {
    const c = route(0).c;
    const items = gameItems([c[0], c[1] + 3, c[2] + 10], [0, -0.1, -1], 0);
    const gates = items.filter((it) => it.count === toriiItem(0, 0, [0, 0, 0], 0, 0).count);
    expect(gates.length).toBeGreaterThanOrEqual(6);
    // Nothing the game adds there is out of place.
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of items)
      for (let s = 0; s < it.count; s += Math.max(1, Math.floor(it.count / 20)))
        if (it.site(s, o)) expect(finite(o)).toBe(true);
  });
});
