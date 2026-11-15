/*
 * Hyper-speed city (docs/specs/hyper-speed-city.md): autopilot, in a straight line, at mega speed
 * above neon cities generated as you go. The look is the City's far layer (lib/far-layer.ts,
 * taken off the City on 2026-11-14 because it "feels like a totally different game"): the user
 * loved its "big psychedelic futuristic neon feel" and asked for it as a design, "a game where you
 * travel much faster through cities in that kind of design, that are more quickly generated and
 * just give an impression of mega speed above the city", then "do a procedural straight line
 * travelling through a hyper-speed city in the design, in autopilot, straight line."
 *
 * One tile, built once from a seed: eight strips along the flight, each a city of its own (its own
 * seed, its own neon pair), with an open avenue down the middle so the eye flies straight down a
 * long canyon of light to its vanishing point. The GPU draws the tile in copies round the eye
 * (components/TripPlayer.tsx), each repetition its hue turned a little, the whole palette drifting
 * slowly with distance flown: drifts, never flashes. The live grains are only speed streaks on a
 * computer; on a phone, with no far layer, they also carry a light cut of the city.
 * Pure: no three.js, no DOM.
 */

import type { Particle, Phase, RGB, Vec3 } from './bigbang';
import type { FarCloud, FarLayer } from './far-layer';

const TAU = Math.PI * 2;

/** The tile across the flight (x, centred on the avenue) and one strip of it along (z). */
export const TILE_X = 320;
export const STRIP_LEN = 360;
export const STRIPS = 8;
export const TILE_Z = STRIP_LEN * STRIPS;
/** Half the avenue's width: nothing stands in it, so the straight line never meets a tower. */
export const AVENUE = 28;
/** The tallest a tower may climb, spire included. */
export const MAX_H = 230;
/** Block pitch along and across; the columns of blocks each side of the avenue. */
const BLOCK_Z = 45;
const COLUMNS = [45, 90, 135];
const BLOCK_HALF = 16;

/** The autopilot: the eye's height (a bit above most roofs) and its speed, units a second. */
export const EYE_Y = 118;
export const SPEED = 450;
/** The view's field: at rest, and pushed wide once under way, for the sense of speed. */
export const FOV_REST = 55;
export const FOV_PUSH = 74;
const FOV_IN = 3;
/** How far ahead the eye looks, and how far down: the avenue runs to the screen's middle. */
const AHEAD = 300;
const DIP = 30;
/** The far layer: from just past the eye out to the horizon. */
export const NEAR = 36;
export const FAR = 2200;
/** Distance flown for the palette to turn once round the colour wheel: about two minutes. */
const HUE_CYCLE = SPEED * 120;
/** How much each repetition of the tile is turned in hue, at most. */
export const ROW_HUE = 0.9;

/** The default city. */
export const SEED = 7;

/** A small seeded random: the same numbers for the same seed, every time. */
export function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The neon colours a strip draws its pair from. */
const NEON: RGB[] = [
  [1, 0.16, 0.72], // magenta
  [0.12, 0.9, 1], // cyan
  [0.62, 0.28, 1], // violet
  [0.55, 1, 0.3], // lime
  [1, 0.55, 0.12], // orange
  [0.2, 0.45, 1], // electric blue
  [1, 0.9, 0.3], // gold
];

const mix = (a: RGB, b: RGB, f: number): RGB => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
  a[2] + (b[2] - a[2]) * f,
];

/** One strip's points: x across the tile's middle, z from 0 to STRIP_LEN, and their colours. */
export function hyperStrip(seed: number): { positions: number[]; colours: number[] } {
  const r = rng(seed);
  const positions: number[] = [];
  const colours: number[] = [];
  const a = NEON[Math.floor(r() * NEON.length)] as RGB;
  let b = NEON[Math.floor(r() * NEON.length)] as RGB;
  if (b === a) b = NEON[(NEON.indexOf(a) + 3) % NEON.length] as RGB;
  const put = (x: number, y: number, z: number, c: RGB, k: number) => {
    // Kept inside the tile, whatever the shape asked for.
    const px = Math.min(TILE_X / 2, Math.max(-TILE_X / 2, x));
    const pz = Math.min(STRIP_LEN - 0.01, Math.max(0, z));
    const v = k * (0.85 + 0.3 * r());
    positions.push(px, Math.min(MAX_H, Math.max(0, y)), pz);
    colours.push(c[0] * v, c[1] * v, c[2] * v);
  };
  // The avenue: two bright edges and a dashed centre line, the lines that run to the vanishing point.
  for (let z = 0; z < STRIP_LEN; z += 3) {
    put(-AVENUE, 0.2, z, a, 0.5);
    put(AVENUE, 0.2, z, a, 0.5);
    if (z % 18 < 9) put(0, 0.2, z, b, 0.28);
  }
  // Cross streets: a dim line of light across the tile at every block's edge.
  for (let z = 0; z < STRIP_LEN; z += BLOCK_Z) {
    for (let x = -TILE_X / 2; x <= TILE_X / 2; x += 6) {
      if (Math.abs(x) < AVENUE) continue;
      put(x, 0.2, z, b, 0.16);
    }
  }
  // The blocks, each side of the avenue: a tower or two, an open glow now and then.
  for (let bz = BLOCK_Z / 2; bz < STRIP_LEN; bz += BLOCK_Z) {
    for (const side of [-1, 1]) {
      for (const [ci, cx] of COLUMNS.entries()) {
        const x0 = side * cx;
        if (r() < 0.12) {
          put(x0, 0.5, bz, b, 0.14);
          continue;
        }
        // Taller near the avenue, so it reads as a canyon; now and then a giant.
        const giant = r() < 0.06;
        const base = (ci === 0 ? 70 : ci === 1 ? 50 : 34) + r() * 60;
        const h = Math.min(MAX_H - 20, giant ? base + 90 + r() * 40 : base);
        const hx = BLOCK_HALF * (0.55 + 0.45 * r());
        const hz = BLOCK_HALF * (0.55 + 0.45 * r());
        tower(put, x0, bz, hx, hz, h, r() < 0.5 ? a : b, r() < 0.5 ? a : b, r);
      }
    }
  }
  return { positions, colours };
}

type Put = (x: number, y: number, z: number, c: RGB, k: number) => void;

/**
 * A tower: its roof's rim, its four edges dimming to the street, a neon band or two round it,
 * windows on the tall ones, and on the giants a spire.
 */
function tower(
  put: Put,
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  c: RGB,
  band: RGB,
  r: () => number,
) {
  const roof = mix(c, [1, 1, 1], 0.2);
  const corners: [number, number][] = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ];
  // Round the rim, a point every `step`.
  const ring = (y: number, col: RGB, k: number, step: number) => {
    corners.forEach(([cx, cz], e) => {
      const [nx, nz] = corners[(e + 1) % 4] as [number, number];
      const len = Math.hypot(nx - cx, nz - cz);
      const n = Math.max(2, Math.round(len / step));
      for (let i = 0; i < n; i++) {
        const f = i / n;
        put(x + cx + (nx - cx) * f, y, z + cz + (nz - cz) * f, col, k);
      }
    });
  };
  ring(h, roof, 0.55, 4);
  // Down the edges, every 8, from bright at the roof to dim at the street.
  const n = Math.max(3, Math.round(h / 8));
  for (const [cx, cz] of corners) {
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      put(x + cx, h * (1 - f), z + cz, c, 0.36 - 0.26 * f);
    }
  }
  // A neon band or two, the psychedelic glow of the far city.
  const bands = h > 60 ? 2 : 1;
  for (let i = 0; i < bands; i++) ring(h * (0.3 + 0.45 * r()), band, 0.3, 5);
  // Windows on the tall ones: a few warm rows on the faces toward the avenue.
  if (h > 70) {
    const warm = mix(c, [1, 0.85, 0.6], 0.5);
    for (let row = 0; row < 3; row++) {
      const y = h * (0.45 + row * 0.15);
      for (let i = -2; i <= 2; i++) {
        put(x - Math.sign(x) * hx, y, z + (i / 2.5) * hz, warm, 0.22);
      }
    }
  }
  // A spire on the giants: a column to the tip.
  if (h > 140) {
    const tip = Math.min(MAX_H, h + 20 + r() * 20);
    for (let y = h; y <= tip; y += 3) put(x, y, z, roof, 0.6);
  }
}

const cities = new Map<number, FarCloud>();

/**
 * The whole tile for a seed: STRIPS strips laid one after another along z, each its own city
 * (seeded from the tile's seed and its place), built the first time it is asked for.
 */
export function hyperCity(seed: number = SEED): FarCloud {
  const had = cities.get(seed);
  if (had) return had;
  const pos: number[] = [];
  const col: number[] = [];
  const cuts: number[] = [];
  const spans: [number, number][] = [];
  for (let s = 0; s < STRIPS; s++) {
    const strip = hyperStrip(seed * 7919 + s * 104729 + 1);
    cuts.push(pos.length / 3);
    for (let i = 0; i < strip.positions.length; i += 3) {
      pos.push(
        strip.positions[i] as number,
        strip.positions[i + 1] as number,
        (strip.positions[i + 2] as number) + s * STRIP_LEN,
      );
    }
    col.push(...strip.colours);
    spans.push([s * STRIP_LEN, (s + 1) * STRIP_LEN]);
  }
  const cloud: FarCloud = {
    positions: new Float32Array(pos),
    colours: new Float32Array(col),
    tile: [TILE_X, TILE_Z],
    cuts,
    spans,
  };
  cities.set(seed, cloud);
  return cloud;
}

/** The palette's turn, radians, at an eye: slowly round the wheel with distance flown. */
export function hueAt(eye: Vec3): number {
  return ((-eye[2] / HUE_CYCLE) % 1) * TAU;
}

/** The far layer the trip player draws: on every step, from just past the eye to the horizon. */
export const HYPER_FAR: FarLayer = {
  build: () => hyperCity(SEED),
  near: () => NEAR,
  far: () => FAR,
  shown: () => 1,
  everyStep: true,
  hue: hueAt,
  rowHue: ROW_HUE,
};

/* ---------- the autopilot ---------- */

const smooth = (x: number) => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

/** Where the eye is `s` seconds in: down the avenue's middle, at a constant height and speed. */
export function eyeAt(s: number): Vec3 {
  return [0, EYE_Y, -SPEED * s];
}

/** The autopilot's camera: straight ahead, a little down, the field pushed wide once under way. */
export function hyperCamera(_k: number, s: number): { eye: Vec3; target: Vec3; fov: number } {
  const eye = eyeAt(s);
  return {
    eye,
    target: [0, EYE_Y - DIP, eye[2] - AHEAD],
    fov: FOV_REST + (FOV_PUSH - FOV_REST) * smooth(s / FOV_IN),
  };
}

/* ---------- the grains: speed streaks, and on a phone the city ---------- */

/** Grains given to streaks; any beyond (a phone's, with no far layer) carry the city. */
export const STREAK_GRAINS = 2400;
/** Points to a streak: a line of them, like motion blur. */
const STREAK_POINTS = 6;
/** How far ahead streaks come in from, and how long one is. */
const STREAK_LOOP = 1200;
const STREAK_LEN = 18;
/** The phone's city: the tile's first two strips, repeated. */
const PHONE_LOOP = STRIP_LEN * 2;

const wrap = (x: number, m: number) => ((x % m) + m) % m;
const hash = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    i,
    a: hash(i, 1),
    b: hash(i, 2),
    c: hash(i, 3),
    d: hash(i, 4),
    dir: [0, 0, -1] as Vec3,
    cluster: 0,
    stagger: 0,
  }));
}

/** A colour turned round the grey axis by `a` radians, as the far layer's shader turns it. */
export function turnHue(c: RGB, a: number): RGB {
  const k = 0.5773502691896258;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dot = k * (c[0] + c[1] + c[2]);
  // c cos a + (k × c) sin a + k (k · c)(1 − cos a)
  const cx: RGB = [k * (c[2] - c[1]), k * (c[0] - c[2]), k * (c[1] - c[0])];
  return [
    Math.max(0, c[0] * cos + cx[0] * sin + k * dot * (1 - cos)),
    Math.max(0, c[1] * cos + cx[1] * sin + k * dot * (1 - cos)),
    Math.max(0, c[2] * cos + cx[2] * sin + k * dot * (1 - cos)),
  ];
}

const DARK: RGB = [0, 0, 0];

/** A grain `s` seconds in: a speed streak, or (beyond the streaks) a point of the city. */
export function pieceAt(p: Particle, _k: number, s: number): { pos: Vec3; rgb: RGB } {
  const eye = eyeAt(s);
  const turn = hueAt(eye);
  if (p.i < STREAK_GRAINS) {
    // Dust still in the air, passing at the eye's speed: drawn as a short line behind each mote.
    const id = Math.floor(p.i / STREAK_POINTS);
    const j = p.i % STREAK_POINTS;
    const x0 = (hash(id, 11) - 0.5) * 2 * 150;
    // Clear of the eye's own line, so nothing streaks straight into it.
    const x = Math.abs(x0) < 6 ? Math.sign(x0 || 1) * 6 : x0;
    const y = 6 + hash(id, 12) * 200;
    const ahead = STREAK_LOOP - wrap(SPEED * s + hash(id, 13) * STREAK_LOOP, STREAK_LOOP);
    const z = eye[2] - ahead + (j / STREAK_POINTS) * STREAK_LEN;
    const fade = smooth((ahead - 8) / 60) * smooth((STREAK_LOOP - ahead) / 400);
    const c = turnHue(NEON[id % NEON.length] as RGB, turn);
    const k = fade * (0.55 - 0.07 * j);
    return { pos: [x, y, z], rgb: [c[0] * k, c[1] * k, c[2] * k] };
  }
  // The phone's city: a point of the tile's first two strips, in the repeat ahead of the eye.
  const cloud = hyperCity(SEED);
  const count = cloud.cuts[2] ?? cloud.positions.length / 3;
  const idx = Math.floor(p.a * count);
  const px = cloud.positions[idx * 3] as number;
  const py = cloud.positions[idx * 3 + 1] as number;
  const pz = cloud.positions[idx * 3 + 2] as number;
  const copy = Math.floor(p.b * 3) - 1;
  const x = px + copy * TILE_X;
  const z = eye[2] - wrap(eye[2] - pz, PHONE_LOOP);
  const ahead = eye[2] - z;
  const fade = smooth((ahead - 10) / 50) * smooth((PHONE_LOOP - ahead) / 260);
  if (fade <= 0) return { pos: [x, py, z], rgb: DARK };
  const c = turnHue(
    [
      cloud.colours[idx * 3] as number,
      cloud.colours[idx * 3 + 1] as number,
      cloud.colours[idx * 3 + 2] as number,
    ],
    turn,
  );
  const k = fade * 1.6;
  return { pos: [x, py, z], rgb: [c[0] * k, c[1] * k, c[2] * k] };
}

/* ---------- the trip ---------- */

export const PHASES: Phase[] = [
  {
    id: 'hyper-speed',
    name: 'Hyper-speed',
    line: 'A straight line over cities of light, generated as fast as you cross them.',
    duration: 600,
    glow: 1.05,
    size: 1,
  },
];
export const PHASE_START = [0];
export const TOTAL = 600;
export const STEP_COLOURS = ['#e040ff'];

export function phaseAt(t: number): { index: number; u: number } {
  return { index: 0, u: wrap(t, TOTAL) / TOTAL };
}

export function look(): { glow: number; size: number } {
  return { glow: 1.05, size: 1 };
}

export const pieceLength = () => TOTAL;
export const pieceProgress = (_k: number, s: number) => wrap(s, TOTAL) / TOTAL;
