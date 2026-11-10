import { describe, expect, it } from 'vitest';

import { parseDesign4 } from '@/components/DesignTab';
import { BRANCHES } from './branches';
import {
  BRANCH_RGB,
  buildLifeTrees,
  buildTree3d,
  crownPoint,
  depthAlong,
  figureYaw,
  GOLD_RGB,
  GROWN,
  makeTurn,
  outwardWave,
  project3,
  pulse,
  REACH,
  ROOT_RADIUS,
  rootPoint,
  routeLabel,
  SHRUNK,
  SWITCH_SECONDS,
  scatter,
  setTurn,
  shifted,
  TREE_ANGLE,
  TURN_PITCH,
  tint,
  treeToScreen,
  viewFor,
} from './life-tree';
import { along, FOOT_Y, routeLength, STEP } from './star-tree';

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

  it('has four looks, a different shape each, all from the shared root and within reach', () => {
    const looks = ([1, 2, 3, 4] as const).map((l) => buildLifeTrees(8, l));
    const counts = looks.map((l) => l.art.routes.length);
    expect(new Set(counts).size).toBe(4);
    // Only II, the 3D tree, stands out of the page; III and IV are the willow and banyan as before.
    expect(looks[1]?.art.routes[0]?.z).toBeDefined();
    for (const l of [0, 2, 3]) expect(looks[l]?.art.routes[0]?.z).toBeUndefined();
    for (const trees of looks) {
      for (const b of BRANCHES) {
        for (const r of trees[b].routes) {
          const [x, y] = along(r, 0);
          expect(x).toBeCloseTo(0);
          expect(y).toBeCloseTo(FOOT_Y);
          const [ex, ey] = along(r, routeLength(r));
          expect(dist(treeToScreen(b, ex, ey, f))).toBeLessThan(f.min * (REACH + 0.15));
        }
      }
    }
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

  it('leans an opened tree from gold to its own tint, and never to blue', () => {
    for (const b of BRANCHES) {
      expect(tint(b, 0)).toEqual(GOLD_RGB);
      expect(tint(b, 1)).toEqual(BRANCH_RGB[b]);
      expect(tint(b, 2)).toEqual(BRANCH_RGB[b]);
      const [r, , bl] = BRANCH_RGB[b];
      expect(r).toBeGreaterThan(bl);
    }
    expect(new Set(BRANCHES.map((b) => BRANCH_RGB[b].join())).size).toBe(3);
  });
});

describe('the breath of the current', () => {
  it('swells and settles with the beat, never stepping from one moment to the next', () => {
    let last = pulse(0).breath;
    for (let t = 0.01; t < 10; t += 0.01) {
      const b = pulse(t).breath;
      expect(Math.abs(b - last)).toBeLessThan(0.02);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
      last = b;
    }
    expect(pulse(1.6).breath).toBeCloseTo(1);
  });
});

describe('design II, the 3D tree', () => {
  const trees = buildLifeTrees(8, 2);

  it('grows a limb for each of Art, Admin and Energy from the shared root, in their directions', () => {
    for (const b of BRANCHES) {
      const routes = trees[b].routes;
      expect(routes.length).toBeGreaterThan(60);
      let sx = 0;
      let sy = 0;
      for (const r of routes) {
        const [x, y] = along(r, 0);
        expect(x).toBeCloseTo(0);
        expect(y).toBeCloseTo(FOOT_Y);
        expect(depthAlong(r, 0)).toBeCloseTo(0);
        const [ex, ey] = along(r, routeLength(r));
        const [px, py] = treeToScreen(b, ex, ey, f);
        sx += px - f.cx;
        sy += py - f.cy;
      }
      // The crown, on average, lies the way its tree grows.
      const a = Math.atan2(sy, sx);
      const off = Math.abs(Math.atan2(Math.sin(a - TREE_ANGLE[b]), Math.cos(a - TREE_ANGLE[b])));
      expect(off).toBeLessThan(0.3);
    }
  });

  it('is genuinely 3D: its tips spread toward and away from you, not in one plane', () => {
    for (const b of BRANCHES) {
      const zs = trees[b].routes.map((r) => depthAlong(r, routeLength(r)));
      expect(Math.min(...zs)).toBeLessThan(-0.3);
      expect(Math.max(...zs)).toBeGreaterThan(0.3);
      for (const r of trees[b].routes) {
        expect(r.z?.length).toBe(r.count);
        for (const v of r.pts) expect(Number.isFinite(v)).toBe(true);
        for (const v of r.z ?? []) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('reaches no farther than the flat looks, its stars a step apart in 3D', () => {
    const t = buildTree3d(8, 7);
    for (const r of t.routes) {
      const [x, y] = along(r, routeLength(r));
      const z = depthAlong(r, routeLength(r));
      expect(Math.hypot(x, y - FOOT_Y, z)).toBeLessThanOrEqual(1.5 + 1e-3);
      const [x1, y1] = along(r, STEP);
      const z1 = depthAlong(r, STEP);
      const [x0, y0] = along(r, 0);
      expect(Math.hypot(x1 - x0, y1 - y0, z1 - depthAlong(r, 0))).toBeCloseTo(STEP, 3);
    }
    // The same seed grows the same tree.
    expect(buildTree3d(8, 7).routes[5]?.z?.[40]).toBe(t.routes[5]?.z?.[40]);
  });

  it('turns about the root: the centre stays put, nearer points come larger, farther smaller', () => {
    const turn = makeTurn();
    setTurn(turn, figureYaw(10), TURN_PITCH, f.min);
    const out = new Float32Array(3);
    project3(out, 0, 0, 0, turn);
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(0);
    expect(out[2]).toBeCloseTo(1);
    setTurn(turn, 0, 0, f.min);
    project3(out, 100, 0, 100, turn);
    expect(out[2]).toBeGreaterThan(1);
    expect(out[0]).toBeGreaterThan(100);
    project3(out, 100, 0, -100, turn);
    expect(out[2]).toBeLessThan(1);
    expect(out[0]).toBeLessThan(100);
  });

  it('sways a little each way, smoothly, and stands three-quarter on when still', () => {
    let last = figureYaw(0);
    for (let t = 0.05; t < 80; t += 0.05) {
      const y = figureYaw(t);
      expect(Math.abs(y - last)).toBeLessThan(0.01);
      expect(Math.abs(y)).toBeLessThan(0.6);
      last = y;
    }
    expect(figureYaw(123, true)).toBeGreaterThan(0.2);
  });

  it('pulses outwards: a wave from the root to every tip, with no jump when the next beat starts', () => {
    // Brightest where the beat has reached.
    expect(outwardWave(0.5, 0.5)).toBeCloseTo(1);
    expect(outwardWave(0.2, 0.5)).toBeLessThan(0.1);
    // Nothing at the very start and end of a beat, so the wrap is seamless.
    for (const u of [0, 0.5, 1]) {
      expect(outwardWave(u, 0)).toBeCloseTo(0);
      expect(outwardWave(u, 1)).toBeCloseTo(0);
    }
    // Moving out over the beat.
    const peak = (phase: number) => {
      let best = 0;
      for (let u = 0; u <= 1; u += 0.01)
        if (outwardWave(u, phase) > outwardWave(best, phase)) best = u;
      return best;
    };
    expect(peak(0.3)).toBeLessThan(peak(0.7));
    expect(pulse(1.6).phase).toBeCloseTo(0.5);
  });
});

describe('the stored tree design', () => {
  it('reads I to IV from the new key, and moves an old II and III up one', () => {
    for (const d of ['1', '2', '3', '4']) expect(parseDesign4(d)).toBe(Number(d));
    expect(parseDesign4(null, '2')).toBe(3);
    expect(parseDesign4(null, '3')).toBe(4);
    expect(parseDesign4(null, '1')).toBe(1);
    expect(parseDesign4(null, null)).toBe(1);
    expect(parseDesign4('9', 'x')).toBe(1);
    // A choice made since wins over the old key.
    expect(parseDesign4('2', '3')).toBe(2);
  });
});
