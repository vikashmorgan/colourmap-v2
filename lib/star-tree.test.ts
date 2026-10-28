import { describe, expect, it } from 'vitest';

import { along, buildStarTree, resample, routeLength, STEP, seeded } from './star-tree';

describe('the star tree', () => {
  it('grows the same tree from the same seed', () => {
    const a = buildStarTree(6, 3);
    const b = buildStarTree(6, 3);
    expect(a.routes.length).toBe(b.routes.length);
    expect(Array.from(a.routes[5]?.pts.slice(0, 30) ?? [])).toEqual(
      Array.from(b.routes[5]?.pts.slice(0, 30) ?? []),
    );
    expect(seeded(1)()).toBe(seeded(1)());
  });

  it('runs every route from a root below the trunk up to a branch tip in the crown', () => {
    const tree = buildStarTree(6);
    expect(tree.routes.length).toBeGreaterThanOrEqual(2 ** 6 * 2);
    for (const r of tree.routes) {
      const [, y0] = along(r, 0);
      const [, y1] = along(r, routeLength(r));
      expect(y0).toBeLessThan(-0.62);
      expect(y1).toBeGreaterThan(-0.2);
    }
  });

  it('is wide at the trunk and fine at the twigs, inside the frame', () => {
    const tree = buildStarTree(7);
    const r = tree.routes[0];
    if (!r) throw new Error('no route');
    const trunkW = along(r, routeLength(r) * 0.25)[2];
    const tipW = along(r, routeLength(r))[2];
    expect(trunkW).toBeGreaterThan(tipW * 3);
    for (const [x, y] of tree.tips) {
      expect(Math.abs(x)).toBeLessThan(1.6);
      expect(y).toBeLessThan(1.4);
    }
  });

  it('lays a route out STEP apart and keeps a star at the tip past its end', () => {
    const r = resample([0, 0, 1, 0, 0.1, 1]);
    expect(r.count).toBe(Math.floor(0.1 / STEP + 1e-9) + 1);
    const end = along(r, 5);
    expect(end[1]).toBeCloseTo((r.count - 1) * STEP);
  });
});
