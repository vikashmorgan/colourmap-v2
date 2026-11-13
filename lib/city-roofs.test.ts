import { describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import { blockTower, DISTRICTS } from './city-game';
import { C, GROUND, TILE_I, TILE_J } from './city-grid';
import { FACADES, facadeItem, roofItem, windowOn } from './city-roofs';
import { skyGrain } from './city-sky';

const towers = () => {
  const out: ReturnType<typeof blockTower>[] = [];
  for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
    for (let J = 0; J < TILE_J; J++) out.push(blockTower(I, J));
  return out.filter((t) => t.shape === 'box');
};

describe('windows', () => {
  it('keeps most windows as they are all night; a few switch over minutes, easing, never flickering', () => {
    let switching = 0;
    let jump = 0;
    for (let key = 0; key < 300; key++) {
      let last = windowOn(key, 0);
      let changed = false;
      for (let t = 0; t < 600; t += 1) {
        const v = windowOn(key, t);
        // Never more than a small step in a second.
        jump = Math.max(jump, Math.abs(v - last));
        if (Math.abs(v - last) > 0.01) changed = true;
        last = v;
      }
      if (changed) switching++;
    }
    expect(jump).toBeLessThan(0.4);
    expect(switching).toBeGreaterThan(10);
    expect(switching).toBeLessThan(90);
  });

  it('gives some plain buildings readable windows in their quarter’s style, not all', () => {
    const ts = towers();
    const worn = ts.filter((t) => t.facade);
    expect(worn.length).toBeGreaterThan(30);
    expect(worn.length).toBeLessThan(ts.length * 0.7);
    for (const t of worn) expect(t.facade).toBe(FACADES[t.d]);
    expect(new Set(worn.map((t) => t.facade)).size).toBe(4);
  });

  it('draws them only on the faces you see, on the face, finite', () => {
    const tw = towers().find((t) => t.facade === 'arched') as ReturnType<typeof blockTower>;
    const eye: Vec3 = [tw.x, GROUND + 10, tw.z + tw.hz + 30];
    const front = facadeItem(tw, 2, 'arched', C.saffron, eye, 3);
    expect(front).not.toBeNull();
    expect(facadeItem(tw, 0, 'arched', C.saffron, eye, 3)).toBeNull();
    const o = [0, 0, 0, 0, 0, 0];
    let lit = 0;
    const it = front as NonNullable<typeof front>;
    for (let s = 0; s < it.count; s++) {
      if (!it.site(s, o)) continue;
      lit++;
      expect(o[2] as number).toBeCloseTo(tw.z + tw.hz + 0.1, 5);
      expect(o[1] as number).toBeLessThan(GROUND + tw.h);
    }
    expect(lit).toBeGreaterThan(10);
  });
});

describe('the city shining from above', () => {
  it('lights every roof you look down on: its edge, lamps, and a haze rising off it', () => {
    const tw = towers().find((t) => t.h > 40) as ReturnType<typeof blockTower>;
    const col = DISTRICTS[tw.d].colour;
    expect(roofItem(tw, col, [tw.x, GROUND + tw.h - 10, tw.z + 40], 1)).toBeNull();
    const it = roofItem(tw, col, [tw.x, GROUND + tw.h + 40, tw.z + 40], 1);
    expect(it).not.toBeNull();
    const o = [0, 0, 0, 0, 0, 0];
    let sum = 0;
    for (let s = 0; s < (it?.count ?? 0); s++) {
      it?.site(s, o);
      expect(o.every(Number.isFinite)).toBe(true);
      expect(o[1] as number).toBeGreaterThanOrEqual(GROUND + tw.h);
      sum += o[3] as number;
    }
    expect(sum).toBeGreaterThan(10);
  });

  it('fills the sky with stars from the street: hundreds of them, up above', () => {
    let up = 0;
    for (let L = 0; L < 450; L++) {
      const g = skyGrain(L, 450, [0, GROUND + 5, 0], 200, 0, 30);
      if (g.pos[1] > GROUND + 30 && g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.3) up++;
    }
    expect(up).toBeGreaterThan(180);
  });
});
