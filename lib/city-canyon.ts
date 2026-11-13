/*
 * The Neon Canyon of the City of Dreams (docs/specs/art-city.md, "The Neon Canyon"): a long, deep,
 * narrow street through the Neon market, with a bend, walled close on both sides by very tall
 * towers, so flying it feels like flying down a canyon. The city's neon part: bands of coloured
 * light up its walls, boards hanging over it at many heights, glowing cables strung across it at
 * every level, and the light lying on its street.
 *
 * 2026-11-13: "add a neon part to the city and a canyon in there. if not done allready."
 *
 * The Studio's Canyon (lib/city.ts) gave the idea: towers close either side, feet below the eye,
 * roofs far above. Here it is a real place in the plan: its walls are the plan's own towers
 * (lib/city-game.ts blockTower), pushed up to the street's edge and raised, so they hold you like
 * every tower. Light is mellow: every hue drifts slowly round cyan, magenta, amber and violet,
 * nothing flashes. Only what is near the eye and ahead of it is lit (the grains' pool never grows).
 *
 * Pure: no three.js, no DOM. The towers come from lib/city-game.ts, handed in (so no cycle).
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { textPixels } from './city-font';
import {
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  C,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  nearest,
  scale,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { ropeY } from './city-ropes';
import { boardsOn, type WordSign, wordItem } from './city-signs';

/** Half the canyon's street, wall to wall: twelve across. */
export const CANYON_W = 6;
/** How tall its walls stand (before the metro lowers the two rows it crosses). */
export const CANYON_H: [number, number] = [104, 140];

/**
 * The canyon's middle line, tile-local (x, z): in from the domes' edge down the street at x = 52,
 * a bend west along the cross street at z = 1428, then down the street at x = 26 to the Green
 * Code quarter's edge. Its last two rows pass under the metro, where the walls step down.
 */
export const CANYON_PATH: [number, number][] = [
  [2 * BLOCK_X, 40 * BLOCK_Z],
  [2 * BLOCK_X, 42 * BLOCK_Z],
  [BLOCK_X, 42 * BLOCK_Z],
  [BLOCK_X, 48 * BLOCK_Z],
];
/** Its length along the middle line. */
export const CANYON_LENGTH = CANYON_PATH.slice(1).reduce((s, p, i) => {
  const q = CANYON_PATH[i] as [number, number];
  return s + Math.hypot(p[0] - q[0], p[1] - q[1]);
}, 0);

/** A straight run of the canyon: along z at x = c, or along x at z = c, from s0 to s1. */
export type CanyonRun = { axis: 0 | 2; c: number; s0: number; s1: number };
export const CANYON_RUNS: CanyonRun[] = CANYON_PATH.slice(1).map((p, i) => {
  const q = CANYON_PATH[i] as [number, number];
  return q[0] === p[0]
    ? { axis: 2, c: p[0], s0: Math.min(q[1], p[1]), s1: Math.max(q[1], p[1]) }
    : { axis: 0, c: p[1], s0: Math.min(q[0], p[0]), s1: Math.max(q[0], p[0]) };
});

/** A wall of the canyon: its block (tile-local), its footprint, and the faces turned to the street. */
export type CanyonWall = {
  li: number;
  lj: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Outward normals of the faces the canyon sees. */
  faces: [number, number][];
};
const W = CANYON_W;
const row = (J: number): [number, number] => [J * BLOCK_Z + 3, (J + 1) * BLOCK_Z - 3];
const X52 = 2 * BLOCK_X;
const X26 = BLOCK_X;
const ZB = 42 * BLOCK_Z;
export const CANYON_WALLS: CanyonWall[] = [
  // The first run, down x = 52.
  { li: 1, lj: 40, x0: X26 + 3, x1: X52 - W, z0: row(40)[0], z1: row(40)[1], faces: [[1, 0]] },
  {
    li: 2,
    lj: 40,
    x0: X52 + W,
    x1: 3 * BLOCK_X - 3,
    z0: row(40)[0],
    z1: row(40)[1],
    faces: [[-1, 0]],
  },
  {
    li: 1,
    lj: 41,
    x0: X26 + 3,
    x1: X52 - W,
    z0: row(41)[0],
    z1: ZB - W,
    faces: [
      [1, 0],
      [0, 1],
    ],
  },
  {
    li: 2,
    lj: 41,
    x0: X52 + W,
    x1: 3 * BLOCK_X - 3,
    z0: row(41)[0],
    z1: row(41)[1],
    faces: [[-1, 0]],
  },
  // The head of the second run: the wall the bend turns against.
  { li: 0, lj: 41, x0: 9, x1: X26 - W, z0: row(41)[0], z1: row(41)[1], faces: [[1, 0]] },
  // The bend's far wall, and the second run down x = 26, to the band's end.
  {
    li: 1,
    lj: 42,
    x0: X26 + W,
    x1: X52 - 3,
    z0: ZB + W,
    z1: row(42)[1],
    faces: [
      [-1, 0],
      [0, -1],
    ],
  },
  ...[43, 44, 45, 46, 47].map(
    (J): CanyonWall => ({
      li: 1,
      lj: J,
      x0: X26 + W,
      x1: X52 - 3,
      z0: row(J)[0],
      z1: row(J)[1],
      faces: [[-1, 0]],
    }),
  ),
  ...[42, 43, 44, 45, 46, 47].map(
    (J): CanyonWall => ({
      li: 0,
      lj: J,
      x0: 9,
      x1: X26 - W,
      z0: row(J)[0],
      z1: row(J)[1],
      faces: [[1, 0]],
    }),
  ),
];
const wallMap = new Map(CANYON_WALLS.map((w) => [w.li * 4096 + w.lj, w]));
/** The canyon wall on block (I, J), if it is one (the plan repeating every tile). */
export function canyonWallAt(I: number, J: number): CanyonWall | null {
  const li = wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
  return wallMap.get(li * 4096 + wrap(J, TILE_J)) ?? null;
}
/** A wall's height from its block's own number: very tall, each its own. */
export const canyonHeight = (k: number) => lerp(CANYON_H[0], CANYON_H[1], hash(k, 901));

/** Whether a point (x, z) lies on the canyon's street, `room` in from its walls. */
export function inCanyon(x: number, z: number, room = 0): boolean {
  const lx = x - nearest(0, x, TILE_X);
  const lz = wrap(z, TILE_Z);
  return CANYON_RUNS.some((r) => {
    const [a, s] = r.axis === 2 ? [lx, lz] : [lz, lx];
    return Math.abs(a - r.c) < W - room && s >= r.s0 - W && s <= r.s1 + W;
  });
}

/* ---------- the light ---------- */

const NEON: RGB[] = [C.cyan, C.magenta, C.amber, C.violet];
/** A neon hue drifting slowly round cyan, magenta, amber and violet: `u` its place, one turn a cycle. */
export function neonHue(u: number): RGB {
  const x = frac(u) * NEON.length;
  const i = Math.floor(x);
  return mix(NEON[i] as RGB, NEON[(i + 1) % NEON.length] as RGB, smooth(x - i));
}
/** How fast the hues drift: a full turn round the four in about a minute and a half. */
export const DRIFT = 0.011;

/** What the canyon's items need of a tower: its walls, its height, its own number. */
export type CanyonTower = { x: number; z: number; hx: number; hz: number; h: number; k: number };

const BAND_GAP = 6;
const LIGHT_GAP = 0.42;
const REFLECT = 320;

/**
 * One face of a wall turned to the canyon: bands of neon across it every six up (some broken into
 * a stretch, each band its own hue on the drift), a bright strip up each of its edges, and their
 * light lying on the street below the face in soft streaks that shimmer slowly.
 */
export function wallFaceItem(
  tw: CanyonTower,
  face: [number, number],
  eye: Vec3,
  t: number,
  d: number,
): Item {
  const [nx, nz] = face;
  const along = nx !== 0 ? tw.hz : tw.hx;
  const bands = Math.max(1, Math.floor((tw.h - 4) / BAND_GAP));
  const per = Math.ceil((2 * along) / LIGHT_GAP);
  const strip = Math.ceil(tw.h / 0.5);
  const nB = bands * per;
  const nS = nB + 2 * strip;
  const count = Math.min(3600, nS + REFLECT);
  // A point on the face, `a` across it (-1..1), at height y, `out` off it.
  const at = (a: number, y: number, out: number): Vec3 =>
    nx !== 0
      ? [tw.x + nx * (tw.hx + out), y, tw.z + a * tw.hz]
      : [tw.x + a * tw.hx, y, tw.z + nz * (tw.hz + out)];
  const hueOf = (b: number) => neonHue(t * DRIFT + b * 0.17 + hash(tw.k, 910) * 4);
  const mid = at(0, GROUND + tw.h / 2, 0);
  return {
    d,
    gid: mixId(tw.k, 9300 + (nx + 2) * 3 + nz),
    count,
    weight: 1.3,
    probe: [mid, at(-0.9, GROUND + 4, 0.2), at(0.9, GROUND + tw.h - 2, 0.2)],
    site: (s, o) => {
      if (s < nB) {
        const b = Math.floor(s / per);
        const q = s % per;
        // Some bands run only part of the way across, each its own stretch.
        const lo = hash(tw.k * 31 + b, 911) < 0.35 ? hash(tw.k * 31 + b, 912) * 0.6 : 0;
        const u = (q + 0.5) / per;
        if (u < lo || u > lo + (lo ? 0.4 : 1)) return false;
        const y = GROUND + 4 + (b + 0.5) * BAND_GAP;
        [o[0], o[1], o[2]] = at(-1 + 2 * u, y, 0.15);
        const breath = 0.82 + 0.18 * Math.sin(t * 0.5 + b * 0.9 + tw.k);
        [o[3], o[4], o[5]] = scale(hueOf(b), 0.36 * breath);
        return true;
      }
      if (s < nS) {
        // Up each edge of the face, a strip of light, its hue drifting with height.
        const q = s - nB;
        const e = q < strip ? -1 : 1;
        const y = GROUND + (((q % strip) + 0.5) * tw.h) / strip;
        [o[0], o[1], o[2]] = at(e, y, 0.2);
        [o[3], o[4], o[5]] = scale(hueOf((y - GROUND) / BAND_GAP + 2), 0.3);
        return true;
      }
      // The light on the street: streaks reaching out from the foot of the face toward the middle.
      const q = s - nS;
      const a = -1 + 2 * hash(q, 913);
      const r = hash(q, 914) ** 1.4;
      const out = 0.4 + r * (CANYON_W * 1.5);
      [o[0], o[1], o[2]] = at(a, GROUND + 0.04, out);
      const b = Math.floor(hash(q, 915) * Math.min(bands, 6));
      const ripple = 0.65 + 0.35 * Math.sin(t * 0.45 + a * 6 + r * 4);
      [o[3], o[4], o[5]] = scale(hueOf(b), 0.17 * (1 - r) * ripple);
      return true;
    },
  };
}

/** The heights cables are strung at across the canyon, up to just under the lower wall. */
export const CABLE_YS = [14, 24, 36, 50, 66, 84, 104, 124];
const CABLE_EVERY = 8.5;
const CABLE_LIGHTS = 56;

/**
 * Cables across the stretch of run `r` from s0 to s1 (world, one block's length), strung wall to
 * wall every 8.5 at every height both walls reach, sagging, tiny lights along them drifting in the
 * neon hues and a slow wave running down the canyon.
 */
export function cableItem(
  r: CanyonRun,
  c: number,
  s0: number,
  s1: number,
  top: number,
  eye: Vec3,
  t: number,
  key: number,
): Item | null {
  const ys = CABLE_YS.filter((y) => y < top - 3);
  const n = Math.floor((s1 - s0) / CABLE_EVERY);
  if (!ys.length || n < 1) return null;
  const pad = (s1 - s0 - (n - 1) * CABLE_EVERY) / 2;
  const sag = 0.15 * 2 * W;
  const end = (s: number, side: number, y: number): Vec3 =>
    r.axis === 2 ? [c + side * W, y, s] : [s, y, c + side * W];
  const y0 = GROUND + (ys[0] as number);
  const y1 = GROUND + (ys[ys.length - 1] as number);
  const lo = end(s0, -1, y0 - sag);
  const hi = end(s1, 1, y1 + 1);
  const box: [Vec3, Vec3] = [
    [Math.min(lo[0], hi[0]), lo[1], Math.min(lo[2], hi[2])],
    [Math.max(lo[0], hi[0]), hi[1], Math.max(lo[2], hi[2])],
  ];
  return {
    d: boxDist(eye, box[0], box[1]),
    gid: mixId(key, 9411),
    count: ys.length * n * CABLE_LIGHTS,
    weight: 1.8,
    probe: [end((s0 + s1) / 2, 0, y0), end((s0 + s1) / 2, 0, y1)],
    site: (s, o) => {
      const cable = Math.floor(s / CABLE_LIGHTS);
      const q = s % CABLE_LIGHTS;
      const level = cable % ys.length;
      const j = Math.floor(cable / ys.length);
      const along = s0 + pad + j * CABLE_EVERY;
      const y = GROUND + (ys[level] as number) + 0.5 * Math.sin(j * 1.7 + level + key);
      const u = (q + 0.5) / CABLE_LIGHTS;
      const p = end(along, -1 + 2 * u, ropeY(y, sag, u));
      [o[0], o[1], o[2]] = p;
      if (q & 1) {
        // The cable itself, faint.
        [o[3], o[4], o[5]] = scale(C.violet, 0.05);
        return true;
      }
      const wave = 0.5 + 0.5 * Math.sin(t * 0.35 - along * 0.05 - u * 3);
      const hue = neonHue(t * DRIFT + level * 0.23 + j * 0.05);
      [o[3], o[4], o[5]] = scale(hue, 0.22 + 0.24 * wave);
      return true;
    },
  };
}

/** The boards' tones: the neon four. */
const BOARD_TONES: RGB[] = [C.magenta, C.cyan, C.amber, C.violet];
/** The canyon's name, hung over both its mouths. */
export const CANYON_NAME = 'NEON\nCANYON';

/**
 * Everything the canyon lights near the eye: its walls' faces, the cables across it, boards
 * hanging over it at many heights, and its name over both mouths. `towerAt` is the plan's own
 * tower on a block, `ahead` what is in front of the eye; only the walls within R are lit.
 */
export function canyonItems(
  eye: Vec3,
  t: number,
  R: number,
  towerAt: (I: number, J: number) => CanyonTower,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
) {
  const ox = nearest(0, eye[0], TILE_X);
  if (Math.abs(eye[0] - ox - 40) > R + 40) return;
  const n0 = Math.floor((eye[2] - R - 300) / TILE_Z);
  const n1 = Math.floor((eye[2] + R) / TILE_Z);
  for (let n = n0; n <= n1; n++) {
    const oz = n * TILE_Z;
    if (eye[2] < oz + 40 * BLOCK_Z - R - 10 || eye[2] > oz + 48 * BLOCK_Z + R + 10) continue;
    const I0 = Math.round(ox / BLOCK_X);
    const J0 = n * TILE_J;
    for (const w of CANYON_WALLS) {
      const tw = towerAt(I0 + w.li, J0 + w.lj);
      const d = boxDist(
        eye,
        [tw.x - tw.hx, GROUND, tw.z - tw.hz],
        [tw.x + tw.hx, GROUND + tw.h, tw.z + tw.hz],
      );
      if (d > R || (d > 14 && !ahead(tw.x, tw.z, Math.max(tw.hx, tw.hz) + 6))) continue;
      for (const f of w.faces) out.push(wallFaceItem(tw, f, eye, t, d));
      // Boards hanging over the street from the walls of the long runs, at five heights.
      const side = w.faces.find((f) => f[0] !== 0);
      if (side && d < R * 0.8) {
        const levels = tw.h > 60 ? [0.1, 0.28, 0.46, 0.64, 0.82] : [0.3, 0.7];
        const signs: WordSign[] = boardsOn(tw, [side[0] as -1 | 1], levels, BOARD_TONES);
        for (const b of signs) {
          const it = wordItem(b, eye, t);
          if (it.d < R) out.push(it);
        }
      }
    }
    // The cables, one block's stretch of each run at a time.
    CANYON_RUNS.forEach((r, ri) => {
      const c = r.axis === 2 ? r.c + ox : r.c + oz;
      const base = r.axis === 2 ? oz : ox;
      const step = r.axis === 2 ? BLOCK_Z : BLOCK_X;
      for (let s = r.s0; s < r.s1 - 1; s += step) {
        const a = base + s;
        const b = base + Math.min(r.s1, s + step);
        const m = (a + b) / 2;
        const [mx, mz] = r.axis === 2 ? [c, m] : [m, c];
        if (Math.hypot(mx - eye[0], mz - eye[2]) > R + step) continue;
        if (Math.hypot(mx - eye[0], mz - eye[2]) > 20 && !ahead(mx, mz, 20)) continue;
        // The lower of the two walls the cables hang between here.
        const pick = (dx: number, dz: number) =>
          towerAt(Math.floor((mx + dx) / BLOCK_X), Math.floor((mz + dz) / BLOCK_Z)).h;
        const top =
          r.axis === 2
            ? Math.min(pick(-W - 2, 0), pick(W + 2, 0))
            : Math.min(pick(0, -W - 2), pick(0, W + 2));
        const it = cableItem(r, c, a, b, top, eye, t, mixId(n * 7 + ri, Math.round(s)));
        if (it && it.d < R) out.push(it);
      }
    });
    // Its name, over both mouths, drifting from magenta to cyan.
    const T = textPixels(CANYON_NAME, { face: 'deco' });
    const px = Math.min(0.26, (2 * W - 1) / T.w);
    const ends: [number, number][] = [
      CANYON_PATH[0] as [number, number],
      CANYON_PATH[CANYON_PATH.length - 1] as [number, number],
    ];
    ends.forEach(([x, z], k) => {
      const it = wordItem(
        {
          text: CANYON_NAME,
          at: [ox + x - (T.w * px) / 2, GROUND + 30, oz + z],
          px,
          rgb: C.magenta,
          rgb2: C.cyan,
          key: 9500 + n * 2 + k,
          face: 'deco',
          frame: 'box',
        },
        eye,
        t,
      );
      if (it.d < R) out.push(it);
    });
  }
}
