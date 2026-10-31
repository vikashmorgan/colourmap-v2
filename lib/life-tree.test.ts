import { describe, expect, it } from 'vitest';

import { BRANCHES } from './branches';
import {
  buildLifeTrees,
  crownPoint,
  GROWN,
  pulse,
  REACH,
  ROOT_RADIUS,
  rootPoint,
  routeLabel,
  SHRUNK,
  SWITCH_SECONDS,
  scatter,
  shifted,
  treeToScreen,
  viewFor,
} from './life-tree';
import { along, FOOT_Y, routeLength } from './star-tree';

const f = { cx: 500, cy: 400, min: 800 };
const dist = ([x, y]: [number, number]) => Math.hypot(x - f.cx, y - f.cy);

describe('the life tree', () => {
  it('grows three different trees, each starting at the shared root', () => {
    const trees = buildLifeTrees();
    for (const b of BRANCHES) {
      const r = trees[b].routes[0];
      if (!r) throw new Error('no route');
      const [x, y] = along(r, 0);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(FOOT_Y);
      expect(dist(treeToScreen(b, x, y, f))).toBeCloseTo(f.min * ROOT_RADIUS);
    }
    expect(trees.art.routes[3]?.pts[30]).not.toBe(trees.admin.routes[3]?.pts[30]);
  });

  it('turns Art upward and the other two downward, either side', () => {
    const trees = buildLifeTrees();
    const tip = (b: (typeof BRANCHES)[number]) => {
      const r = trees[b].routes[0];
      if (!r) throw new Error('no route');
      const [x, y] = along(r, routeLength(r));
      return treeToScreen(b, x, y, f);
    };
    expect(tip('art')[1]).toBeLessThan(f.cy);
    expect(tip('admin')[0]).toBeGreaterThan(f.cx);
    expect(tip('energy')[0]).toBeLessThan(f.cx);
    for (const b of BRANCHES)
      expect(dist(tip(b))).toBeLessThan(f.min * (REACH + ROOT_RADIUS + 0.1));
  });

  it('puts names beyond the crowns and your pages round the root', () => {
    for (const b of BRANCHES) expect(dist(crownPoint(b, f))).toBeGreaterThan(f.min * REACH);
    expect(dist(rootPoint(2, 7, f))).toBeCloseTo(f.min * 0.2);
  });

  it('pulses from the root: a ring leaving and fading, the current surging as it goes', () => {
    const start = pulse(0);
    const later = pulse(2);
    expect(start.radius).toBeCloseTo(ROOT_RADIUS);
    expect(later.radius).toBeGreaterThan(start.radius);
    expect(later.alpha).toBeLessThan(start.alpha);
    expect(start.surge).toBe(1);
    expect(pulse(3.2).radius).toBeCloseTo(ROOT_RADIUS);
  });

  it('names a page from its address when the Grid does not', () => {
    expect(routeLabel('/figure-stars-trio')).toBe('Figure stars trio');
    expect(routeLabel('/')).toBe('/');
  });

  it('grows the tree stood in and slides the root away from it; the others shrink back', () => {
    expect(viewFor(null)).toEqual({ grow: { art: 1, admin: 1, energy: 1 }, shiftX: 0, shiftY: 0 });
    const v = viewFor('art');
    expect(v.grow.art).toBe(GROWN);
    expect(v.grow.admin).toBe(SHRUNK);
    // Art grows upward, so the root moves down to give it room.
    expect(shifted(f, v).cy).toBeGreaterThan(f.cy);
    expect(shifted(f, viewFor('admin')).cx).toBeLessThan(f.cx);
  });

  it('comes apart for a second and builds back in the next', () => {
    expect(scatter(0)).toBe(0);
    expect(scatter(SWITCH_SECONDS / 2)).toBe(1);
    expect(scatter(0.5)).toBeGreaterThan(0);
    expect(scatter(0.5)).toBeCloseTo(scatter(SWITCH_SECONDS - 0.5));
    expect(scatter(SWITCH_SECONDS)).toBe(0);
    expect(scatter(-1)).toBe(0);
  });
});
