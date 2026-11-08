import { describe, expect, it } from 'vitest';

import { along, FOOT_Y, routeLength } from './star-tree';
import {
  buildBanyan,
  buildStarTreeShape,
  buildWillow,
  buildWindTree,
  leeward,
  STAR_TREE_SHAPES,
} from './star-trees';

const ends = (tree: ReturnType<typeof buildWillow>) =>
  tree.routes.map((r) => [along(r, 0), along(r, routeLength(r))] as const);

describe('the star trees', () => {
  it('grows each tree the same way every time, inside the frame, from the roots', () => {
    expect(STAR_TREE_SHAPES).toHaveLength(3);
    for (const shape of [0, 1, 2]) {
      const a = buildStarTreeShape(shape, 6);
      const b = buildStarTreeShape(shape, 6);
      expect(a.routes.length).toBe(b.routes.length);
      expect(Array.from(a.routes[3]?.pts.slice(0, 30) ?? [])).toEqual(
        Array.from(b.routes[3]?.pts.slice(0, 30) ?? []),
      );
      expect(a.tips.length).toBeGreaterThan(0);
      let wide = 0;
      let low = 0;
      let high = 0;
      for (const r of a.routes) {
        expect(along(r, 0)[1]).toBeLessThan(FOOT_Y);
        for (let i = 0; i < r.count; i++) {
          wide = Math.max(wide, Math.abs(r.pts[i * 3] as number));
          low = Math.min(low, r.pts[i * 3 + 1] as number);
          high = Math.max(high, r.pts[i * 3 + 1] as number);
        }
      }
      expect(wide).toBeLessThan(1.1);
      expect(low).toBeGreaterThan(-0.95);
      expect(high).toBeLessThan(0.7);
    }
  });

  it('the willow lets its strands hang down from the boughs', () => {
    const tree = buildWillow(6);
    let hanging = 0;
    for (const r of tree.routes) {
      let top = -Infinity;
      for (let i = 0; i < r.count; i++) top = Math.max(top, r.pts[i * 3 + 1] as number);
      const [, endY] = along(r, routeLength(r));
      if (endY < top - 0.4) hanging++;
    }
    expect(hanging).toBe(tree.routes.length);
  });

  it('the sea-wind tree streams its crown to the lee side', () => {
    const tree = buildWindTree(6);
    const [footX] = leeward(0, FOOT_Y + 0.001);
    const tipsX = tree.tips.map(([x]) => x);
    const mean = tipsX.reduce((s, x) => s + x, 0) / tipsX.length;
    expect(mean).toBeGreaterThan(footX + 0.3);
    // The windward side is pressed in: few tips reach far against the wind.
    expect(tipsX.filter((x) => x < footX - 0.3).length).toBeLessThan(tipsX.length * 0.1);
  });

  it('the banyan is wider than tall, and drops aerial roots to the ground away from the trunk', () => {
    const tree = buildBanyan(6);
    const aerial = ends(tree).filter(([, [x, y]]) => y < FOOT_Y + 0.05 && Math.abs(x) > 0.25);
    expect(aerial.length).toBeGreaterThanOrEqual(6);
    const xs = tree.tips.map(([x]) => x);
    const ys = tree.tips.map(([, y]) => y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - FOOT_Y);
  });
});
