import { describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import { blockTower } from './city-game';
import { GROUND, type Item } from './city-grid';
import { ropeItems, ropeY } from './city-ropes';

const near = (eye: Vec3) => {
  const out: Item[] = [];
  ropeItems(eye, 5, 160, blockTower, () => true, out);
  return out;
};

describe('rope lights across the streets', () => {
  it('hangs each rope in a U: level at the walls, deepest in the middle', () => {
    expect(ropeY(10, 3, 0)).toBeCloseTo(10);
    expect(ropeY(10, 3, 1)).toBeCloseTo(10);
    expect(ropeY(10, 3, 0.5)).toBeCloseTo(7);
    expect(ropeY(10, 3, 0.25)).toBeGreaterThan(7);
    expect(ropeY(10, 3, 0.25)).toBeLessThan(10);
  });

  it('strings corridors thickest in the Indian quarter, some elsewhere, between real walls', () => {
    const indian = near([-60, GROUND + 10, 380]);
    const golden = near([-60, GROUND + 10, 900]);
    expect(indian.length).toBeGreaterThan(golden.length);
    expect(golden.length).toBeGreaterThan(0);
  });

  it('shimmers slowly, never flashing, its lights finite and over the street', () => {
    const it0 = near([-60, GROUND + 10, 380])[0] as Item;
    const o = [0, 0, 0, 0, 0, 0];
    const p = [0, 0, 0, 0, 0, 0];
    for (let s = 0; s < it0.count; s += 3) {
      expect(it0.site(s, o)).toBe(true);
      expect(o.every(Number.isFinite)).toBe(true);
      expect(o[1] as number).toBeGreaterThan(GROUND + 2);
    }
    // A sixtieth of a second later, no light jumps more than a little.
    const at = (t: number, s: number, out: number[]) => {
      const fresh: Item[] = [];
      ropeItems([-60, GROUND + 10, 380], t, 160, blockTower, () => true, fresh);
      (fresh.find((q) => q.gid === it0.gid) as Item).site(s, out);
    };
    for (let s = 0; s < it0.count; s += 6) {
      at(10, s, o);
      at(10 + 1 / 60, s, p);
      expect(Math.abs((o[3] as number) - (p[3] as number))).toBeLessThan(0.02);
    }
  });
});
