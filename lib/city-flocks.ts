/*
 * Murmurations over the City of Dreams (docs/specs/art-city.md, "Life in the city"): flocks of
 * birds high over the roofs, folding slowly through abstract shapes, parting round the ship as it
 * flies through. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "make flocks of flying birds creating abstract shapes above the whole city that open
 * up when u fly past them. organically."
 *
 * A flock lives in each of most cells of a wide grid laid over the whole city, wandering slowly
 * round its cell some 140 over the street (over the roofs, under the stratosphere). Its birds are
 * small dark-gold and silver grains. Every bird has its own place (u, v) in the flock, and the
 * flock is a shape of those places: a twisting ribbon, a ring, a spiral, a wave, a sheet folding
 * along its middle. It holds a shape a while, then eases into the next, all of it turning slowly,
 * each bird wandering a little round its place, and a slow shimmer runs across it. When the ship
 * comes near, the birds part from the line it flies along in a soft wave, opening ahead of it
 * (they see it coming) and closing quickly behind; a bird is pushed out from that line by a smooth
 * amount that falls off with its distance, so no bird ever crosses another and none stays in the
 * ship's way. Every place is a formula of the bird, the flock and the time: nothing is kept from
 * frame to frame.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { viewAt } from './city-game';
import { frac, GROUND, type Item, mix, mixId, scale, TAU, wrap } from './city-grid';

/** The grid the flocks live on: a cell across and along. */
export const FLOCK_CELL_X = 360;
export const FLOCK_CELL_Z = 480;
/** How many cells have a flock. */
const FLOCK_SHARE = 0.7;
/** The height a flock wanders round, over the street. */
export const FLOCK_Y = GROUND + 140;
/** The birds in a flock: each a light site. */
export const BIRDS = 520;
/** How wide the opening round the ship is, and how far off it begins to part the birds. */
export const OPEN_R = 13;
export const OPEN_REACH = 70;
/** How many flocks are drawn at most, the nearest. */
export const FLOCKS_DRAWN = 5;

const GOLD_DARK: RGB = [0.62, 0.47, 0.22];
const SILVER: RGB = [0.66, 0.7, 0.8];

/** Whether cell (a, b) has a flock, and its own number. */
export function flockOf(a: number, b: number): number | null {
  const key = mixId(a * 7919 + 13, b * 104729 + 7);
  return hash(key % 100000, 851) < FLOCK_SHARE ? key % 100000 : null;
}

/** Where the flock of cell (a, b) is at time t: wandering slowly round its cell. */
export function flockCentre(a: number, b: number, key: number, t: number): Vec3 {
  const ph = hash(key, 852) * TAU;
  return [
    (a + 0.5) * FLOCK_CELL_X + (hash(key, 853) - 0.5) * 120 + 50 * Math.sin(t * 0.011 + ph),
    FLOCK_Y + 6 * Math.sin(t * 0.02 + ph),
    (b + 0.5) * FLOCK_CELL_Z + (hash(key, 854) - 0.5) * 160 + 60 * Math.cos(t * 0.009 + ph),
  ];
}

/** The five shapes a flock folds through, from a bird's place (u, v) in it, round its middle. */
function shapeAt(kind: number, u: number, v: number, t: number, ph: number): Vec3 {
  switch (kind) {
    case 0: {
      // A ribbon, twisting along its length.
      const w = (v - 0.5) * 7;
      const tw = u * 3 * Math.PI;
      return [
        (u - 0.5) * 70,
        7 * Math.sin(u * TAU * 1.25 + t * 0.05) + w * Math.cos(tw),
        10 * Math.sin(u * Math.PI * 1.5 + t * 0.04) + w * Math.sin(tw),
      ];
    }
    case 1: {
      // A ring, a little wavy.
      const A = u * TAU + t * 0.03;
      const B = v * TAU;
      const r = 20 + 3.5 * Math.cos(B);
      return [r * Math.cos(A), 3.5 * Math.sin(B) + 3 * Math.sin(2 * A), r * Math.sin(A)];
    }
    case 2: {
      // A spiral, opening out from its middle.
      const A = u * 3 * TAU + t * 0.04;
      const r = 3 + u * 24;
      return [r * Math.cos(A), (v - 0.5) * 5 + (u - 0.5) * 10, r * Math.sin(A)];
    }
    case 3: {
      // A wave rolling through a sheet.
      const x = (u - 0.5) * 60;
      const z = (v - 0.5) * 34;
      return [x, 6 * Math.sin(x * 0.12 + t * 0.25) + 3 * Math.cos(z * 0.18 - t * 0.2), z];
    }
    default: {
      // A sheet folding slowly along its middle, open, then closing like a book.
      const x = (u - 0.5) * 48;
      const z = (v - 0.5) * 32;
      const fold = 1.1 * Math.sin(t * 0.07 + ph);
      return [x * Math.cos(fold), Math.abs(x) * Math.sin(fold) * 0.8 + 2 * Math.sin(z * 0.2), z];
    }
  }
}
const SHAPES = 5;
/** How long a flock spends on one shape, holding it, then easing into the next. */
const SHAPE_TIME = 16;

/** The ship, for the flocks to part round: where it is and which way it flies. */
export type Flier = { c: Vec3; f: Vec3 };

/**
 * Bird i of the flock with number `key` round `centre` at time t: its place, parting round the
 * ship if one is given and near.
 */
export function birdAt(key: number, centre: Vec3, i: number, t: number, ship?: Flier): Vec3 {
  const u = frac(0.5 + i * 0.7548776662);
  const v = frac(0.5 + i * 0.569840291);
  const ph = hash(key, 855) * TAU;
  const x = t / SHAPE_TIME + hash(key, 856) * SHAPES;
  const k0 = Math.floor(x);
  const blend = smooth((frac(x) - 0.5) / 0.5);
  const A = shapeAt(wrap(k0, SHAPES), u, v, t, ph);
  const B = shapeAt(wrap(k0 + 1, SHAPES), u, v, t, ph);
  const lx = A[0] + (B[0] - A[0]) * blend;
  const ly = A[1] + (B[1] - A[1]) * blend;
  const lz = A[2] + (B[2] - A[2]) * blend;
  // The whole flock turning slowly, each bird wandering a little round its place.
  const yaw = t * 0.02 + ph;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const q: Vec3 = [
    centre[0] + lx * cy - lz * sy + 1.2 * Math.sin(t * 0.4 + i * 1.3),
    centre[1] + ly + 1.2 * Math.sin(t * 0.33 + i * 2.1),
    centre[2] + lx * sy + lz * cy + 1.2 * Math.sin(t * 0.37 + i * 0.7),
  ];
  return ship ? partAround(q, ship, i) : q;
}

/**
 * A bird at q pushed out from the line the ship flies along: by OPEN_R right beside the ship,
 * falling off smoothly with the distance from that line, more ahead of the ship than behind it,
 * none at all from OPEN_REACH away. Its distance from the line only ever grows with what it was,
 * so the birds part without crossing, and close again once the ship is past.
 */
export function partAround(q: Vec3, ship: Flier, i: number): Vec3 {
  const vx = q[0] - ship.c[0];
  const vy = q[1] - ship.c[1];
  const vz = q[2] - ship.c[2];
  const far = Math.hypot(vx, vy, vz);
  if (far >= OPEN_REACH) return q;
  const fl = Math.hypot(ship.f[0], ship.f[1], ship.f[2]) || 1;
  const fx = ship.f[0] / fl;
  const fy = ship.f[1] / fl;
  const fz = ship.f[2] / fl;
  const along = vx * fx + vy * fy + vz * fz;
  let px = vx - along * fx;
  let py = vy - along * fy;
  let pz = vz - along * fz;
  const rp = Math.hypot(px, py, pz);
  if (rp < 1e-6) {
    // Right on the line: out along the bird's own side.
    const a = hash(i, 857) * TAU;
    const s: Vec3 = Math.abs(fy) < 0.9 ? [-fz, 0, fx] : [1, 0, 0];
    const sl = Math.hypot(s[0], s[1], s[2]) || 1;
    const up: Vec3 = [
      fy * (s[2] / sl) - fz * (s[1] / sl),
      fz * (s[0] / sl) - fx * (s[2] / sl),
      fx * (s[1] / sl) - fy * (s[0] / sl),
    ];
    px = (Math.cos(a) * s[0]) / sl + Math.sin(a) * up[0];
    py = (Math.cos(a) * s[1]) / sl + Math.sin(a) * up[1];
    pz = (Math.cos(a) * s[2]) / sl + Math.sin(a) * up[2];
  } else {
    px /= rp;
    py /= rp;
    pz /= rp;
  }
  const w = Math.exp(-((along / (along > 0 ? 34 : 12)) ** 2)) * smooth((OPEN_REACH - far) / 20);
  const push = OPEN_R * w * Math.exp(-0.5 * (rp / OPEN_R) ** 2);
  // A soft wave through the parting: the birds lift a little as they open.
  const lift = 0.08 * push * Math.sin(along * 0.15 + i);
  return [q[0] + px * push, q[1] + py * push + lift, q[2] + pz * push];
}

/** A bird's colour: dark gold or silver, a slow shimmer running across the flock. */
export function birdColour(i: number, t: number): RGB {
  const u = frac(0.5 + i * 0.7548776662);
  const shimmer = 0.8 + 0.2 * Math.sin(t * 0.6 + u * 9);
  return scale(hash(i, 858) < 0.6 ? GOLD_DARK : mix(SILVER, GOLD_DARK, 0.15), 0.34 * shimmer);
}

/** The flocks near the eye, the nearest FLOCKS_DRAWN of them, parting round the ship. */
export function flockItems(eye: Vec3, t: number, out: Item[], ship?: Flier) {
  const R = Math.min(viewAt(eye[1]), 600);
  const a0 = Math.floor((eye[0] - R) / FLOCK_CELL_X) - 1;
  const a1 = Math.floor((eye[0] + R) / FLOCK_CELL_X) + 1;
  const b0 = Math.floor((eye[2] - R) / FLOCK_CELL_Z) - 1;
  const b1 = Math.floor((eye[2] + R) / FLOCK_CELL_Z) + 1;
  const near: { d: number; key: number; c: Vec3 }[] = [];
  for (let a = a0; a <= a1; a++) {
    for (let b = b0; b <= b1; b++) {
      const key = flockOf(a, b);
      if (key === null) continue;
      const c = flockCentre(a, b, key, t);
      const d = Math.max(0, Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) - 40);
      if (d <= R) near.push({ d, key, c });
    }
  }
  near.sort((p, q) => p.d - q.d);
  for (const { d, key, c } of near.slice(0, FLOCKS_DRAWN)) {
    out.push({
      d,
      gid: mixId(key, 9401),
      count: BIRDS,
      weight: 1.2,
      probe: [c, [c[0] + 30, c[1], c[2]], [c[0] - 30, c[1], c[2]], [c[0], c[1] + 15, c[2]]],
      site: (s, o) => {
        const q = birdAt(key, c, s, t, ship);
        [o[0], o[1], o[2]] = q;
        [o[3], o[4], o[5]] = birdColour(s, t);
        return true;
      },
    });
  }
}
