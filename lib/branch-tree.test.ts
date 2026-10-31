import { describe, expect, it } from 'vitest';
import { BRANCH_SHAPE, buildBranchTree, segmentsOf } from './branch-tree';
import { groupingsIn } from './branches';
import { AREAS_2 } from './life-tree-2';
import { FOOT_Y, STEP } from './star-tree';

const last = (r: { pts: Float32Array; count: number }): [number, number] => [
  r.pts[(r.count - 1) * 3] as number,
  r.pts[(r.count - 1) * 3 + 1] as number,
];

describe('a branch grown to its pages', () => {
  it('has one limb per area and one twig, one route, per page; a bare stub for an empty area', () => {
    for (const b of ['art', 'admin', 'energy'] as const) {
      const areas = AREAS_2[b];
      const tree = buildBranchTree(b, areas);
      expect(tree.limbs).toHaveLength(areas.length);
      areas.forEach((a, i) => {
        expect(tree.limbs[i]!.leaves).toHaveLength(a.pages.length);
        const mine = tree.routes.filter((r) => r.area === i);
        if (a.pages.length === 0) {
          expect(mine.map((r) => r.page)).toEqual([-1]);
        } else {
          expect(mine.map((r) => r.page)).toEqual(a.pages.map((_, k) => k));
        }
      });
    }
  });

  it('runs every route from the foot of the trunk to the exact end of its twig', () => {
    const tree = buildBranchTree('admin', AREAS_2.admin);
    for (const r of tree.routes) {
      expect(r.pts[0]).toBeCloseTo(0, 5);
      expect(r.pts[1]).toBeCloseTo(FOOT_Y, 5);
      if (r.page < 0) continue;
      const [x, y] = last(r);
      const leaf = tree.limbs[r.area]!.leaves[r.page]!;
      expect(Math.hypot(x - leaf.end[0], y - leaf.end[1])).toBeLessThan(STEP * 1.5);
    }
  });

  it('ends every twig in its own place, and keeps the tree inside its height', () => {
    for (const b of ['art', 'admin', 'energy'] as const) {
      const tree = buildBranchTree(b, AREAS_2[b]);
      const ends = tree.limbs.flatMap((l) => l.leaves.map((f) => f.end));
      for (let i = 0; i < ends.length; i++) {
        for (let j = i + 1; j < ends.length; j++) {
          const [a, c] = [ends[i]!, ends[j]!];
          expect(Math.hypot(a[0] - c[0], a[1] - c[1])).toBeGreaterThan(0.02);
        }
      }
      for (const [, y] of ends) expect(y - FOOT_Y).toBeLessThan(1.7);
    }
  });

  it('grows the three in their own manner, and the same tree every time', () => {
    expect(new Set(Object.values(BRANCH_SHAPE)).size).toBe(3);
    const once = buildBranchTree('art', AREAS_2.art);
    const again = buildBranchTree('art', AREAS_2.art);
    expect(again.limbs).toEqual(once.limbs);
    // Same areas, another tree's manner: a different shape.
    const asEnergy = buildBranchTree('energy', AREAS_2.art);
    expect(asEnergy.limbs[1]!.fork).not.toEqual(once.limbs[1]!.fork);
  });

  it('gives a fuller area a wider share of the crown', () => {
    // Art: Writing (1 page), Visual (10). Visual's twig ends spread wider than one page's would.
    const tree = buildBranchTree('art', AREAS_2.art);
    const xs = tree.limbs[1]!.leaves.map((f) => f.end[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
  });

  it('reads design I areas too', () => {
    const segs = segmentsOf(groupingsIn('energy'));
    expect(segs.map((s) => s.pages.length)).toEqual(
      groupingsIn('energy').map((g) => g.routes.length),
    );
    const tree = buildBranchTree('energy', segs);
    expect(tree.routes.length).toBe(segs.reduce((n, s) => n + Math.max(1, s.pages.length), 0));
  });
});
