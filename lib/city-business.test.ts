import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  BUSINESS_PLAZA,
  businessSize,
  coreItem,
  skyBridgeItem,
  TOWER_KINDS,
  towerItem,
} from './city-business';
import { blocked, blockTower, gameItems, LANDMARKS } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, type Item } from './city-grid';

const sites = (it: Item, step = 1) => {
  const out: number[][] = [];
  const o = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < it.count; s += step) if (it.site(s, o)) out.push([...o]);
  return out;
};
const heights = () => {
  const list = [];
  for (let I = -6; I <= -2; I++) for (let J = 16; J < 24; J++) list.push(blockTower(I, J));
  return list;
};

describe('the business district (queued: "a business district of twisting towers with docks")', () => {
  it('fills the Heights with towers of five designs round the Nova Core on its plaza', () => {
    const towers = heights().filter((tw) => tw.shape === 'business');
    expect(towers.length).toBeGreaterThan(25);
    const kinds = new Set(towers.map((tw) => businessSize(tw.I, tw.J, tw.k).kind));
    expect(kinds.size).toBe(TOWER_KINDS.length);
    const core = LANDMARKS.find((l) => l.kind === 'nova');
    expect(core?.d).toBe('heights');
    expect(core?.x).toBe(BUSINESS_PLAZA.x);
    expect(core?.z).toBe(BUSINESS_PLAZA.z);
    // Taller toward the plaza (the metro lowers the ones it passes over).
    const free = towers.filter((tw) => tw.h > 50);
    const d = (tw: { x: number; z: number }) =>
      Math.hypot(tw.x - BUSINESS_PLAZA.x, tw.z - BUSINESS_PLAZA.z);
    const near = free.filter((tw) => d(tw) < 60);
    const far = free.filter((tw) => d(tw) > 110);
    const mean = (l: { h: number }[]) => l.reduce((s, x) => s + x.h, 0) / l.length;
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);
    expect(mean(near)).toBeGreaterThan(mean(far));
  });

  it('keeps streets of six or more round each tower, and holds you out of it', () => {
    for (const tw of heights()) {
      if (tw.shape !== 'business') continue;
      expect(tw.x - tw.hx - tw.I * BLOCK_X).toBeGreaterThanOrEqual(3 - 1e-9);
      expect((tw.I + 1) * BLOCK_X - tw.x - tw.hx).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(tw.z - tw.hz - tw.J * BLOCK_Z).toBeGreaterThanOrEqual(3 - 1e-9);
      expect((tw.J + 1) * BLOCK_Z - tw.z - tw.hz).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(blocked([tw.x, GROUND + tw.h * 0.5, tw.z])).toBe(true);
      expect(blocked([tw.x, GROUND + tw.h + 3, tw.z])).toBe(false);
    }
  });

  it('draws each tower finite, inside its block, its crown and windows lit', () => {
    const eye: Vec3 = [-40, GROUND + 40, 760];
    for (const tw of heights()) {
      if (tw.shape !== 'business') continue;
      const size = { ...businessSize(tw.I, tw.J, tw.k), hx: tw.hx, hz: tw.hz, h: tw.h };
      const all = sites(towerItem(tw, size, eye, 30, 20), 4);
      expect(all.length).toBeGreaterThan(200);
      for (const q of all) {
        expect(q.every(Number.isFinite)).toBe(true);
        expect(Math.min(q[3], q[4], q[5])).toBeGreaterThanOrEqual(0);
        expect(Math.abs(q[0] - tw.x)).toBeLessThan(tw.hx + 3);
        expect(Math.abs(q[2] - tw.z)).toBeLessThan(tw.hz + 3);
        expect(q[1]).toBeGreaterThanOrEqual(GROUND - 1e-6);
        expect(q[1]).toBeLessThan(GROUND + tw.h + 16);
      }
      expect(all.filter((q) => Math.max(q[3], q[4], q[5]) > 0.2).length).toBeGreaterThan(8);
    }
  });

  it('joins tall neighbours by sky bridges and breathes its Nova Core on the plaza', () => {
    let bridges = 0;
    for (const tw of heights()) {
      const B = blockTower(tw.I + 1, tw.J);
      if (tw.shape !== 'business' || B.shape !== 'business') continue;
      const it = skyBridgeItem(tw, B, 0, [tw.x, GROUND + 50, tw.z + 40], 10);
      if (!it) continue;
      bridges++;
      for (const q of sites(it)) {
        expect(q[0]).toBeGreaterThanOrEqual(tw.x + tw.hx - 1e-6);
        expect(q[0]).toBeLessThanOrEqual(B.x - B.hx + 1e-6);
        expect(q[1]).toBeLessThan(GROUND + Math.min(tw.h, B.h));
      }
    }
    expect(bridges).toBeGreaterThan(2);
    const at = [BUSINESS_PLAZA.x, BUSINESS_PLAZA.z] as const;
    const eye: Vec3 = [at[0] + 50, GROUND + 25, at[1] + 50];
    const a = sites(coreItem(at[0], at[1], eye, 10, 30, 1));
    const b = sites(coreItem(at[0], at[1], eye, 13, 30, 1));
    expect(a.length).toBe(3200);
    expect(a.every((q) => q.every(Number.isFinite))).toBe(true);
    const moved = a.filter(
      (q, i) => Math.hypot(q[0] - b[i][0], q[1] - b[i][1], q[2] - b[i][2]) > 0.05,
    );
    expect(moved.length).toBeGreaterThan(200);
    // The game draws them when the eye is near.
    const items = gameItems(eye, [-0.7, -0.1, -0.7], 10);
    expect(items.some((it) => it.count === 3200)).toBe(true);
  });
});
