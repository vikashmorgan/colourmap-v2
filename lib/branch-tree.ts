/*
 * A BRANCH, GROWN TO ITS PAGES — the tree that stands when one of the life
 * tree's three opens (components/LifeTree.tsx).
 *
 * Martin, 2026-10-30: "want individual trees to connect to their segments in
 * a unique, non generic and more precise way once you click on one of the 3
 * branches that open bigger."
 *
 * At the top the three trees are Star Trees (lib/star-tree.ts): grown from a
 * seed, full, and saying nothing about what hangs on them. Opened, a tree is
 * regrown from its data instead. The trunk forks into exactly one limb per
 * area, as thick as that area is full; each limb forks into exactly one twig
 * per page, and the page's name sits on the end of its twig. An area with no
 * page is a short bare stub. So the shape is the map: count the limbs and
 * you have counted the areas, and every star that leaves the root runs to a
 * page.
 *
 * Each tree grows in its own way, so the three are not one template:
 *
 *   Art     flowing   limbs sway in an S from one crown, twigs curl
 *   Admin   angular   a ladder of limbs up the trunk, bent once at an
 *                     elbow, long and short in turn, twigs at a fixed angle
 *   Energy  upright   limbs leave low and turn upward like a flame,
 *                     twigs rising
 *
 * Pure: world units as lib/star-tree.ts (x across, y up, the foot at FOOT_Y),
 * to be put on screen by treeToScreen (lib/life-tree.ts).
 */

import type { Branch } from './branches';
import { FOOT_Y, type Route, resample, seeded } from './star-tree';

export type Shape = 'flowing' | 'angular' | 'upright';

export const BRANCH_SHAPE: Record<Branch, Shape> = {
  art: 'flowing',
  admin: 'angular',
  energy: 'upright',
};

/** One area to grow a limb for: its name and the addresses of its pages. */
export type Segment = { label: string; pages: string[] };

/** A route a star runs, root to page; `page` is -1 on a bare stub. */
export type ShapedRoute = Route & { area: number; page: number };

export type BranchLimb = {
  /** Where the area's name sits along its limb, before the twigs. */
  name: [number, number];
  /** Where the limb ends and its twigs fork. */
  fork: [number, number];
  /** Each page's twig: where it ends, and a point just past the end, which way a name goes on. */
  leaves: { end: [number, number]; on: [number, number] }[];
};

export type BranchTree = {
  routes: ShapedRoute[];
  limbs: BranchLimb[];
};

type Char = {
  /** Half the crown's fan, radians either side of straight up. */
  spread: number;
  trunk: number;
  limb: number;
  /** How far limbs leave below the top of the trunk, outermost lowest. */
  stagger: number;
  /** Side twigs off the limb, radians. */
  twigTurn: number;
  twig: number;
};

const CHAR: Record<Shape, Char> = {
  flowing: { spread: 1.45, trunk: 0.34, limb: 0.8, stagger: 0, twigTurn: 0.95, twig: 0.28 },
  angular: {
    spread: 1.62,
    trunk: 0.46,
    limb: 0.78,
    stagger: 0.2,
    twigTurn: Math.PI / 3,
    twig: 0.24,
  },
  upright: { spread: 0.95, trunk: 0.46, limb: 0.82, stagger: 0.32, twigTurn: 0.55, twig: 0.28 },
};

const SEED: Record<Branch, number> = { art: 7, admin: 11, energy: 23 };

type P = [number, number];
/** A path as x, y, width triplets, finely sampled. */
type Path = number[];

const dir = (a: number): P => [Math.sin(a), Math.cos(a)];
const add = (p: P, d: P, k: number): P => [p[0] + d[0] * k, p[1] + d[1] * k];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function cubic(p0: P, p1: P, p2: P, p3: P, w0: number, w1: number, steps = 40): Path {
  const out: Path = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push(
      a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
      w0 + (w1 - w0) * t,
    );
  }
  return out;
}

/** A straight piece. */
const line = (a: P, b: P, w0: number, w1: number, steps = 20): Path =>
  cubic(a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b, w0, w1, steps);

const count = (path: Path) => path.length / 3;

/** The point a share `t` along a path, and the angle it heads in there (0 = up). */
function at(path: Path, t: number): { p: P; a: number } {
  const n = count(path);
  const i = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))));
  const j = Math.min(n - 1, i + 1);
  const h = Math.max(0, j - 1);
  const p: P = [path[i * 3] as number, path[i * 3 + 1] as number];
  const dx = (path[j * 3] as number) - (path[h * 3] as number);
  const dy = (path[j * 3 + 1] as number) - (path[h * 3 + 1] as number);
  return { p, a: Math.atan2(dx, dy) };
}

/** The path up to a share `t` along it. */
const upTo = (path: Path, t: number): Path =>
  path.slice(0, (Math.round(t * (count(path) - 1)) + 1) * 3);

/** The limb itself, from where it leaves the trunk, in the tree's own manner. */
function limbPath(shape: Shape, base: P, a: number, len: number, i: number, w: number): Path {
  if (shape === 'flowing') {
    // An S: out one way, back the other, alternate limbs mirrored.
    const end = add(base, dir(a), len);
    const side = i % 2 ? 1 : -1;
    const n: P = [Math.cos(a), -Math.sin(a)];
    return cubic(
      base,
      add(lerp(base, end, 1 / 3), n, 0.2 * len * side),
      add(lerp(base, end, 2 / 3), n, -0.2 * len * side),
      end,
      w,
      w * 0.55,
    );
  }
  if (shape === 'angular') {
    // Straight out, flatter, to an elbow; then straight on, steeper.
    const elbow = add(base, dir(a * 1.3), len * 0.42);
    const end = add(elbow, dir(a * 0.8), len * 0.58);
    const first = line(base, elbow, w, w * 0.8);
    return [...first, ...line(elbow, end, w * 0.8, w * 0.55).slice(3)];
  }
  // Upright: leaves the trunk wide, then turns to rise, like a flame.
  const end = add(base, dir(a * 0.7), len);
  return cubic(
    base,
    add(base, dir(a * 1.7), len * 0.4),
    add(end, dir(Math.PI + a * 0.15), len * 0.4),
    end,
    w,
    w * 0.55,
  );
}

/** One twig from `from`, heading `a`, in the tree's own manner; `side` is which way it turned off. */
function twigPath(shape: Shape, from: P, a: number, len: number, side: number): Path {
  const end =
    shape === 'upright'
      ? add(from, dir(a * 0.55), len) // rising: pulled toward straight up
      : add(from, dir(a), len);
  if (shape === 'angular') return line(from, end, 0.012, 0.006);
  const curl = shape === 'flowing' ? 0.3 * side : 0;
  const n: P = [Math.cos(a), -Math.sin(a)];
  return cubic(
    from,
    add(add(from, dir(a), len * 0.35), n, curl * len * 0.4),
    add(lerp(from, end, 0.7), n, -curl * len * 0.25),
    end,
    0.013,
    0.006,
    20,
  );
}

/**
 * The tree for one branch, grown from its areas: one limb per area, one
 * twig per page, the same tree every time for the same areas.
 */
export function buildBranchTree(branch: Branch, areas: Segment[]): BranchTree {
  const shape = BRANCH_SHAPE[branch];
  const c = CHAR[shape];
  const rng = seeded(SEED[branch]);
  const foot: P = [0, FOOT_Y];
  const top: P = [shape === 'flowing' ? 0.03 : 0, FOOT_Y + c.trunk];
  const trunk =
    shape === 'flowing'
      ? cubic(
          foot,
          [-0.05, FOOT_Y + c.trunk * 0.35],
          [0.06, FOOT_Y + c.trunk * 0.7],
          top,
          0.07,
          0.05,
        )
      : line(foot, top, 0.07, 0.05, 30);
  // Each limb's share of the crown's fan grows with its pages, so a full area has room.
  const weights = areas.map((x) => (x.pages.length ? 0.6 + Math.sqrt(x.pages.length) : 0.8));
  const total = weights.reduce((t, w) => t + w, 0) || 1;
  let swept = 0;
  const routes: ShapedRoute[] = [];
  const limbs: BranchLimb[] = areas.map((area, i) => {
    const share = (weights[i] as number) / total;
    const a = -c.spread + (swept + share / 2) * 2 * c.spread;
    swept += share;
    const out = Math.abs(a) / c.spread;
    // Where it leaves the trunk: outermost lowest; Admin's in a ladder of three rungs.
    const drop = shape === 'angular' ? (Math.round(out * 2) / 2) * c.stagger : out * c.stagger;
    const leaveAt = 1 - drop / c.trunk;
    const base = at(trunk, leaveAt).p;
    const m = area.pages.length;
    const rungLength = shape === 'angular' ? (i % 2 ? 0.78 : 1.06) : 1;
    const len =
      c.limb *
      (m === 0 ? 0.42 : (0.86 + 0.07 * Math.min(m, 5)) * rungLength) *
      (0.94 + 0.12 * rng());
    const w = m === 0 ? 0.014 : 0.018 + 0.005 * Math.min(m, 6);
    const limb = limbPath(shape, base, a, len, i, w);
    const stem = upTo(trunk, leaveAt);
    const toLimb = [...stem, ...limb.slice(3)];
    const fork = at(limb, 1).p;

    if (m === 0) {
      routes.push({ ...resample(toLimb), area: i, page: -1 });
      // A stub's name on its end: this is where the area would grow.
      return { name: add(fork, dir(at(limb, 1).a), 0.05), fork, leaves: [] };
    }

    // Where each twig leaves the limb, and which way it turns. A few pages fork from
    // the end; more line the limb on alternate sides, the last at the end.
    const twigs: { t: number; turn: number; side: number }[] = [];
    if (m <= 3) {
      const fan = m === 1 ? [0] : m === 2 ? [-0.5, 0.5] : [-0.75, 0, 0.75];
      for (const f of fan) twigs.push({ t: 1, turn: f * c.twigTurn, side: Math.sign(f) || 1 });
    } else {
      const sides = m - 1;
      for (let k = 0; k < sides; k++) {
        const side = k % 2 ? 1 : -1;
        twigs.push({ t: 0.42 + (0.55 * (k + 0.5)) / sides, turn: side * c.twigTurn, side });
      }
      twigs.push({ t: 1, turn: 0, side: 1 });
    }

    const leaves = twigs.map((tw, k) => {
      const from = at(limb, tw.t);
      // Lower twigs longer, as on a real limb; neighbours on one side long and short in turn.
      const tlen = c.twig * (1.12 - 0.25 * tw.t) * (m <= 3 ? 1 : 1 - 0.2 * (Math.floor(k / 2) % 2));
      const twig = twigPath(shape, from.p, from.a + tw.turn, tlen, tw.side);
      routes.push({
        ...resample([...stem, ...upTo(limb, tw.t).slice(3), ...twig.slice(3)]),
        area: i,
        page: k,
      });
      const end = at(twig, 1);
      return { end: end.p, on: add(end.p, dir(end.a), 0.05) };
    });
    // Before the first twig, so the area's name is on bare limb.
    const name = at(limb, m <= 3 ? 0.62 : 0.3).p;
    return { name, fork, leaves };
  });
  return { routes, limbs };
}

/** Segments from areas that list their pages as `routes` (lib/branches.ts). */
export const segmentsOf = (list: { label: string; routes: string[] }[]): Segment[] =>
  list.map((g) => ({ label: g.label, pages: g.routes }));

/*
 * USE SHOWS ON THE TWIGS (2026-10-31): a twig to a page opened this week runs
 * bright; one opened this month as it is; one not opened for longer, or
 * never, thins to a faint thread. Read from the one fact the Grid keeps --
 * when a page was last opened (lib/grid.ts readVisits) -- so no counts.
 */
const DAY = 24 * 60 * 60 * 1000;

export const TWIG_USE = { week: 1.45, month: 1, older: 0.6, never: 0.45 };

/** How strongly a twig shows, from when its page was last opened. */
export function twigUse(last: number | undefined, now: number): number {
  if (last === undefined) return TWIG_USE.never;
  const age = now - last;
  if (age <= 7 * DAY) return TWIG_USE.week;
  if (age <= 30 * DAY) return TWIG_USE.month;
  return TWIG_USE.older;
}

/*
 * A BARE STUB ASKS FOR SOMETHING (2026-10-31). Tapping an area with nothing
 * built offers to plant a private spark for it (/sparks), so the empty limb
 * leads somewhere: the idea is kept where ideas are kept, until it is built.
 */
export const seedText = (area: string): string => `Grow ${area}: give it a place in the brain`;
