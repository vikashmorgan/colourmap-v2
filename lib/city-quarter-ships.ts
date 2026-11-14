/*
 * Each quarter's own ships and drones over the City of Dreams (docs/specs/art-city.md, "Ship
 * currents and quarter ships"). Pure: no three.js, no DOM.
 *
 * 2026-11-14: "also make some unique ships or drones for each quarter." And: "a few unique ships
 * become part of the quarter. this doesn't mean only those."
 *
 * Twelve designs of our own, one a quarter, each made of grains in its quarter's colours: a share
 * of the ships in that quarter's street currents (the general ships keep flowing among them), and
 * small swarms of drones drifting slowly round the quarter's heart (its landmark's crossing, or
 * the middle of its side of the avenue where it has none). Colours lean slowly, never flash.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { BAND_ROWS, BANDS, DISTRICTS, type DistrictId } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, mix, nearest, scale, TAU, TILE_X, TILE_Z } from './city-grid';

export type QuarterDesign = {
  district: DistrictId;
  name: string;
  /** What it is, in a line. */
  line: string;
  /** Its second colour, in its quarter's family. */
  accent: RGB;
};

export const QUARTER_DESIGNS: Record<DistrictId, QuarterDesign> = {
  chinatown: {
    district: 'chinatown',
    name: 'Lantern skiff',
    line: 'A slim curved skiff, a paper lantern glowing over its stern.',
    accent: [1, 0.5, 0.2],
  },
  indian: {
    district: 'indian',
    name: 'Lotus glider',
    line: 'Six petals opening round a marigold light.',
    accent: [1, 0.7, 0.1],
  },
  oriental: {
    district: 'oriental',
    name: 'Crescent wing',
    line: 'A crescent flying on its points, a star of light ahead of it.',
    accent: [0.45, 0.95, 0.9],
  },
  heights: {
    district: 'heights',
    name: 'Glass needle',
    line: 'A long thin needle of glass, a ring at its waist, a bright tip.',
    accent: [0.6, 0.97, 1],
  },
  canals: {
    district: 'canals',
    name: 'Gondola drone',
    line: 'A gondola curling up at both ends, two rotor rings over it.',
    accent: [0.78, 0.6, 1],
  },
  golden: {
    district: 'golden',
    name: 'Gilded seed pod',
    line: 'A seamed golden pod with two swept seed wings.',
    accent: [1, 0.85, 0.5],
  },
  temples: {
    district: 'temples',
    name: 'Prayer-flag drone',
    line: 'A small ring trailing a line of soft flags.',
    accent: [1, 0.85, 0.7],
  },
  industrial: {
    district: 'industrial',
    name: 'Cargo hauler',
    line: 'A box frame with a lamp at each corner and an engine glow.',
    accent: [0.78, 0.84, 1],
  },
  domes: {
    district: 'domes',
    name: 'Bubble pod',
    line: 'A glass bubble with a green light growing inside.',
    accent: [0.75, 1, 0.55],
  },
  egypt: {
    district: 'egypt',
    name: 'Sun-sail boat',
    line: 'A curved boat under an upright disc of a sail.',
    accent: [1, 0.8, 0.4],
  },
  market: {
    district: 'market',
    name: 'Neon kite',
    line: 'A diamond kite trailing a slow ribbon.',
    accent: [1, 0.42, 0.68],
  },
  code: {
    district: 'code',
    name: 'Glyph drone',
    line: 'A square frame holding one glyph of our own.',
    accent: [0.6, 1, 0.68],
  },
};

/** Which part of a design a grain is: its body, its accent, or its light. */
export type QuarterPart = 0 | 1 | 2;

/**
 * Grain q (0..1, spread over the design) of quarter d's design, with a second number r (0..1) for
 * spreads: where it sits in the design's own frame (a forward, b to its right, h up, about a unit
 * of its length either way), and which part it is. `t` for the few slow motions.
 */
export function quarterGrain(
  d: DistrictId,
  q: number,
  r: number,
  t: number,
): { a: number; b: number; h: number; part: QuarterPart } {
  const e = r < 0.5 ? 1 : -1;
  const s = (r < 0.5 ? r : r - 0.5) * 2;
  switch (d) {
    case 'chinatown': {
      if (q < 0.5) {
        const a = -1 + 2 * (q / 0.5);
        return { a, b: e * 0.28 * (1 - a * a), h: -0.15 + 0.22 * a * a, part: 0 };
      }
      if (q < 0.85) {
        const w = TAU * ((q - 0.5) / 0.35);
        return { a: -0.35, b: 0.22 * Math.cos(w), h: 0.45 + 0.28 * Math.sin(w), part: 1 };
      }
      return { a: 1.05, b: 0, h: 0.1, part: 2 };
    }
    case 'indian': {
      if (q < 0.8) {
        const u = q / 0.8;
        const k = Math.floor(u * 6);
        const f = u * 6 - k;
        const w = (k * TAU) / 6 + (f - 0.5) * 0.7 * e;
        const rad = 0.9 * Math.sin(Math.PI * f) + 0.15;
        return { a: Math.cos(w) * rad, b: Math.sin(w) * rad, h: 0.25 * rad * rad, part: 0 };
      }
      return { a: 0, b: 0, h: 0.15 + 0.2 * s, part: 1 };
    }
    case 'oriental': {
      if (q < 0.85) {
        const w = -2.3 + 4.6 * (q / 0.85);
        const inner = r < 0.5;
        const R = inner ? 0.72 : 1;
        const shift = inner ? 0.3 : 0;
        return {
          a: Math.cos(w) * R + shift - 0.3,
          b: Math.sin(w) * R,
          h: 0.05 * Math.sin(w),
          part: 0,
        };
      }
      return { a: 0.95, b: 0, h: 0.12, part: 2 };
    }
    case 'heights': {
      if (q < 0.55) return { a: -1.4 + 2.8 * (q / 0.55), b: 0, h: 0, part: 0 };
      if (q < 0.85) {
        const w = TAU * ((q - 0.55) / 0.3);
        return { a: -0.2, b: 0.35 * Math.cos(w), h: 0.35 * Math.sin(w), part: 1 };
      }
      return { a: 1.5, b: 0, h: 0, part: 2 };
    }
    case 'canals': {
      if (q < 0.5) {
        const a = -1 + 2 * (q / 0.5);
        return { a, b: e * 0.18 * (1 - a * a), h: -0.2 + 0.45 * a ** 4, part: 0 };
      }
      if (q < 0.88) {
        const w = TAU * ((q - 0.5) / 0.38) * 2 + 0.4 * t;
        return { a: e * 0.55 + 0.3 * Math.cos(w), b: 0.3 * Math.sin(w), h: 0.45, part: 1 };
      }
      return { a: 0, b: 0, h: -0.32, part: 2 };
    }
    case 'golden': {
      if (q < 0.55) {
        const u = q / 0.55;
        const a = -0.8 + 1.6 * u;
        const rad = 0.45 * Math.sqrt(Math.max(0, 1 - (a / 0.8) ** 2));
        const w = (Math.floor(r * 4) * TAU) / 4 + 0.6;
        return { a, b: Math.cos(w) * rad, h: Math.sin(w) * rad, part: 0 };
      }
      if (q < 0.88) {
        const f = (q - 0.55) / 0.33;
        return { a: -0.2 - 0.7 * f, b: e * (0.2 + 0.6 * f), h: 0.4 - 0.12 * f, part: 1 };
      }
      return { a: 0, b: 0, h: 0, part: 2 };
    }
    case 'temples': {
      if (q < 0.35) {
        const w = TAU * (q / 0.35);
        return { a: 0.3 * Math.cos(w), b: 0.3 * Math.sin(w), h: 0, part: 0 };
      }
      if (q < 0.9) {
        const f = (q - 0.35) / 0.55;
        const drop = 0.25 * Math.sin(Math.PI * f) + (r < 0.5 ? 0 : 0.18);
        return { a: -0.3 - 1.4 * f, b: 0.05 * Math.sin(5 * f - 0.6 * t), h: 0.3 - drop, part: 1 };
      }
      return { a: 0, b: 0, h: 0.05, part: 2 };
    }
    case 'industrial': {
      if (q < 0.6) {
        // The box's twelve edges.
        const k = Math.floor((q / 0.6) * 12);
        const f = ((q / 0.6) * 12 - k) * 2 - 1;
        const X = 1.1;
        const Y = 0.45;
        const Z = 0.4;
        const sa = k & 1 ? 1 : -1;
        const sb = k & 2 ? 1 : -1;
        if (k < 4) return { a: f * X, b: sa * Y, h: sb * Z, part: 0 };
        if (k < 8) return { a: sa * X, b: f * Y, h: sb * Z, part: 0 };
        return { a: sa * X, b: sb * Y, h: f * Z, part: 0 };
      }
      if (q < 0.85) {
        const k = Math.floor(((q - 0.6) / 0.25) * 4);
        return { a: k & 1 ? 1.1 : -1.1, b: k & 2 ? 0.45 : -0.45, h: 0.4, part: 1 };
      }
      return { a: -1.25 - 0.3 * s, b: 0, h: 0, part: 2 };
    }
    case 'domes': {
      if (q < 0.7) {
        // A sphere, golden-angle spread.
        const u = q / 0.7;
        const y = 1 - 2 * u;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const w = 2.39996 * Math.floor(u * 40);
        return { a: 0.6 * rad * Math.cos(w), b: 0.6 * rad * Math.sin(w), h: 0.6 * y, part: 0 };
      }
      return { a: 0.15 * (s - 0.5), b: 0.15 * (r - 0.5), h: -0.1 + 0.2 * s, part: 1 };
    }
    case 'egypt': {
      if (q < 0.45) {
        const a = -1 + 2 * (q / 0.45);
        return { a, b: e * 0.22 * (1 - a * a), h: -0.2 + 0.3 * a * a, part: 0 };
      }
      if (q < 0.88) {
        const w = TAU * ((q - 0.45) / 0.43);
        return { a: 0.45 * Math.cos(w), b: 0, h: 0.6 + 0.45 * Math.sin(w), part: 1 };
      }
      return { a: 0, b: 0, h: 1.12, part: 2 };
    }
    case 'market': {
      if (q < 0.5) {
        const P: [number, number][] = [
          [1, 0],
          [0, 0.6],
          [-0.6, 0],
          [0, -0.6],
        ];
        const u = (q / 0.5) * 4;
        const k = Math.floor(u);
        const f = u - k;
        const A = P[k % 4] as [number, number];
        const B = P[(k + 1) % 4] as [number, number];
        return { a: A[0] + (B[0] - A[0]) * f, b: A[1] + (B[1] - A[1]) * f, h: 0, part: 0 };
      }
      if (q < 0.88) {
        const f = (q - 0.5) / 0.38;
        return { a: -0.6 - 1.2 * f, b: 0.15 * Math.sin(4 * f - 0.8 * t), h: -0.1 * f, part: 1 };
      }
      return { a: 0.1, b: 0, h: 0, part: 2 };
    }
    default: {
      // The Green Code's glyph drone: a square frame upright, a glyph of our own in it.
      if (q < 0.45) {
        const u = (q / 0.45) * 4;
        const k = Math.floor(u);
        const f = (u - k) * 2 - 1;
        const side = k & 1 ? 1 : -1;
        return k < 2
          ? { a: 0, b: f * 0.45, h: side * 0.45, part: 0 }
          : { a: 0, b: side * 0.45, h: f * 0.45, part: 0 };
      }
      if (q < 0.9) {
        // A 3 by 4 grid of dots, some lit: the glyph is the dots this drone's number keeps.
        const cell = Math.floor(((q - 0.45) / 0.45) * 12);
        return {
          a: 0.02,
          b: ((cell % 3) - 1) * 0.25,
          h: (Math.floor(cell / 3) - 1.5) * 0.22,
          part: 1,
        };
      }
      return { a: -0.1, b: 0, h: 0, part: 2 };
    }
  }
}

/** Quarter d's design colour for a part: the body leaning slowly toward its accent, a soft light. */
export function quarterColour(d: DistrictId, part: QuarterPart, t: number, phase = 0): RGB {
  const body = DISTRICTS[d].colour;
  const { accent } = QUARTER_DESIGNS[d];
  const lean = 0.5 + 0.5 * Math.sin(0.15 * t + phase);
  if (part === 0) return mix(body, accent, 0.25 * lean);
  if (part === 1) return mix(accent, body, 0.3 * lean);
  return mix(body, [1, 1, 1], 0.3);
}

/** How bright each part is drawn (a share of its colour): the light brightest. */
export const PART_LIGHT = [0.38, 0.46, 0.6] as const;

/**
 * Where grain q (with r) of quarter d's design is, flying at c heading f (level), `len` long,
 * and its colour, `k` of its light.
 */
export function quarterShipGrain(
  d: DistrictId,
  q: number,
  r: number,
  c: Vec3,
  f: Vec3,
  len: number,
  t: number,
  phase: number,
  k: number,
): { pos: Vec3; rgb: RGB } {
  const g = quarterGrain(d, q, r, t);
  const fl = Math.hypot(f[0], f[2]) || 1;
  const fx = f[0] / fl;
  const fz = f[2] / fl;
  // To the ship's right: forward turned a quarter clockwise seen from above.
  const sx = -fz;
  const sz = fx;
  const pos: Vec3 = [
    c[0] + (fx * g.a + sx * g.b) * len,
    c[1] + g.h * len,
    c[2] + (fz * g.a + sz * g.b) * len,
  ];
  return { pos, rgb: scale(quarterColour(d, g.part, t, phase), PART_LIGHT[g.part] * k) };
}

/* ---------- the drones: small swarms round each quarter's heart ---------- */

/** A quarter's heart: the middle of its side of the avenue, in its band (its landmark's crossing). */
export type Home = { x: number; z: number; d: DistrictId; key: number };

/** The hearts in the tile: two to a band, one either side of the avenue. */
export const HOMES: Home[] = BANDS.flatMap((band, i) =>
  ([-1, 1] as const).map((side) => ({
    x: side * 3 * BLOCK_X,
    z: (i * BAND_ROWS + BAND_ROWS / 2) * BLOCK_Z,
    d: band[side < 0 ? 0 : 1],
    key: i * 2 + (side < 0 ? 0 : 1),
  })),
);

/** How many drones a swarm has, and how near the eye a swarm is drawn. */
export const DRONES = 6;
export const SWARM_R = 300;

/** The `count` hearts nearest the eye (each brought round to the copy of the tile nearest it). */
export function homesNear(eye: Vec3, count: number): Home[] {
  return HOMES.map((h) => ({
    ...h,
    x: nearest(h.x, eye[0], TILE_X),
    z: nearest(h.z, eye[2], TILE_Z),
  }))
    .sort((a, b) => Math.hypot(a.x - eye[0], a.z - eye[2]) - Math.hypot(b.x - eye[0], b.z - eye[2]))
    .slice(0, count);
}

/**
 * Drone i of the swarm round heart h at time t: drifting slowly round it, out past its plaza, each
 * at its own height, hovering a little; its middle, its heading (along its drift), and its light.
 */
export function droneAt(h: Home, i: number, t: number): { c: Vec3; f: Vec3; phase: number } {
  const R = 40 + 14 * hash(h.key * 31 + i, 621);
  const way = hash(h.key, 622) < 0.5 ? 1 : -1;
  const w = 0.08 + 0.05 * hash(h.key * 31 + i, 623);
  const a0 = TAU * hash(h.key * 31 + i, 624);
  const a = a0 + way * w * t;
  const y = GROUND + 48 + 13 * (i % 3) + 2.5 * Math.sin(0.4 * t + a0);
  // A gentle wander in and out as it goes round.
  const rr = R + 4 * Math.sin(0.23 * t + 2 * a0);
  const c: Vec3 = [h.x + rr * Math.cos(a), y, h.z + rr * Math.sin(a)];
  const f: Vec3 = [-Math.sin(a) * way, 0, Math.cos(a) * way];
  return { c, f, phase: a0 };
}

/** How much a swarm shows from the eye: in full near it, gone by SWARM_R. */
export const swarmSeen = (h: Home, eye: Vec3) =>
  smooth((SWARM_R - Math.hypot(h.x - eye[0], h.z - eye[2])) / 60);
