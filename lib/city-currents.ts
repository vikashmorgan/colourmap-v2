/*
 * Ship currents over the City of Dreams (docs/specs/art-city.md, "Ship currents and quarter
 * ships"): the traffic as rivers you can slot into and follow. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "make more channels where ships navigate together in one direction to avoid
 * overload. so u follow linear currents of ships. some of these currents can be above and turn
 * together or be more curvy currents. but mainly one street one direction of ship and a few
 * outliers with the unique big ships." And: "feeling of current is to have a cool feeling that you
 * are going in a direction, it feels satisfying."
 *
 * Three kinds of current, all formulas of the time (nothing kept frame to frame):
 * - Street channels, on the flow's rules (lib/city-flow.ts): the avenue one way at each level, two
 *   files a level clear of its middle; one file down the middle of each street, one way, the next
 *   street the other way; the cross streets higher, alternating the same way, passing over; the
 *   express lanes over the roofs. In each channel every ship flies at the channel's one speed, at
 *   the same spacing as the next, so a channel reads as a river. Faint lane lights mark each one,
 *   a slow swell of light running along them the way the channel flows.
 * - High currents over the roofs: long smooth loops (sums of a few sines), each crossing the
 *   avenue twice, linking the quarters either side; a flock of ships two abreast flies each, all
 *   turning and banking together, a faint path of light ahead of them showing where they will go.
 * - Outliers: three big ships of our own, a slow cargo liner, a lantern barge and a long ferry,
 *   each alone in a long stretch, slow, high over the blocks at its own height, never on the
 *   avenue's way low down.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import {
  AVE_HEIGHTS,
  avenueWay,
  EXPRESS_X,
  EXPRESS_Z,
  X_HEIGHTS,
  xStreetWay,
  Z_HEIGHTS,
  zStreetWay,
} from './city-flow';
import { BLOCK_X, BLOCK_Z, GROUND, mix, nearest, TAU, TILE_I, TILE_X, wrap } from './city-grid';

/* ---------- street channels ---------- */

export type ChannelKind = 'avenue' | 'street' | 'cross' | 'express';

/**
 * A channel round the eye's centre (cx, cz): along z (`axis` 2, at x = line · BLOCK_X) or along x
 * (`axis` 0, at z = line · BLOCK_Z); its height over the street, its way along its axis, how far off
 * the line it runs, its one speed, and how many lines of its kind are kept round the eye.
 */
export type Channel = {
  kind: ChannelKind;
  axis: 0 | 2;
  line: number;
  y: number;
  sgn: 1 | -1;
  off: number;
  speed: number;
  streets: number;
};

/** The avenue's files (two a level), the streets', the cross streets', the express lanes'. */
const AVE_FILES = AVE_HEIGHTS.length * 2;
export const STREET_LINES = 4;
export const CROSS_LINES = 4;
export const EXPRESS_LINES = 2;
export const CHANNELS = AVE_FILES + STREET_LINES + CROSS_LINES + EXPRESS_LINES * 2;
/** How long a stretch of each channel is kept round the eye (ships come round within it). */
export const RUN = 180;

/** The whole number ≡ slot (mod n) nearest x: a line brought round to the one nearest the eye. */
const nearestOf = (slot: number, n: number, x: number) => slot + n * Math.round((x - slot) / n);

export function channel(c: number, cx: number, cz: number): Channel {
  let n = c;
  if (n < AVE_FILES) {
    const level = n >> 1;
    return {
      kind: 'avenue',
      axis: 2,
      line: TILE_I * Math.round(cx / TILE_X),
      y: (AVE_HEIGHTS[level] as number) + 0.6,
      sgn: avenueWay(level),
      off: (n & 1 ? 1 : -1) * 4.8,
      speed: 9 + 2 * hash(c, 631),
      streets: 1,
    };
  }
  n -= AVE_FILES;
  if (n < STREET_LINES) {
    const I = nearestOf(n, STREET_LINES, cx / BLOCK_X);
    return {
      kind: 'street',
      axis: 2,
      line: I,
      y: Z_HEIGHTS[wrap(I, 2)] as number,
      // The flow's way for every street (on the avenue's own line, where no file flies, the
      // same as the street two over, so a channel keeps its way as it comes round).
      sgn: wrap(I, TILE_I) === 0 ? zStreetWay(I + 2) : zStreetWay(I),
      off: 0,
      speed: 7.5 + 2.5 * hash(c, 631),
      streets: STREET_LINES,
    };
  }
  n -= STREET_LINES;
  if (n < CROSS_LINES) {
    const J = nearestOf(n, CROSS_LINES, cz / BLOCK_Z);
    return {
      kind: 'cross',
      axis: 0,
      line: J,
      y: X_HEIGHTS[wrap(J, 2)] as number,
      sgn: xStreetWay(J),
      off: 0,
      speed: 8 + 2.5 * hash(c, 631),
      streets: CROSS_LINES,
    };
  }
  n -= CROSS_LINES;
  const fast = 15 + 3 * hash(c, 632);
  if (n < EXPRESS_LINES) {
    const I = nearestOf(n, EXPRESS_LINES, cx / BLOCK_X);
    return {
      kind: 'express',
      axis: 2,
      line: I,
      y: EXPRESS_Z,
      sgn: wrap(I, 2) === 0 ? -1 : 1,
      off: 0,
      speed: fast,
      streets: EXPRESS_LINES,
    };
  }
  n -= EXPRESS_LINES;
  const J = nearestOf(n, EXPRESS_LINES, cz / BLOCK_Z);
  return {
    kind: 'express',
    axis: 0,
    line: J,
    y: EXPRESS_X,
    sgn: xStreetWay(J) > 0 ? -1 : 1,
    off: 0,
    speed: fast,
    streets: EXPRESS_LINES,
  };
}

/** How the ships are shared among the channels: the avenue's files fuller, the express thinner. */
const weightOf = (c: number) =>
  c < AVE_FILES ? 1.5 : c < AVE_FILES + STREET_LINES + CROSS_LINES ? 1 : 0.75;

const splits = new Map<number, Int32Array>();
/** Where each channel's ships begin among `n` ships (the last entry is n). */
function splitOf(n: number): Int32Array {
  let s = splits.get(n);
  if (s) return s;
  let W = 0;
  for (let c = 0; c < CHANNELS; c++) W += weightOf(c);
  s = new Int32Array(CHANNELS + 1);
  let acc = 0;
  for (let c = 0; c < CHANNELS; c++) {
    s[c] = Math.round(acc);
    acc += (n * weightOf(c)) / W;
  }
  s[CHANNELS] = n;
  if (splits.size > 16) splits.clear();
  splits.set(n, s);
  return s;
}

/** Ship j of n: its channel, its place in the channel's file, and how many fly it. */
export function channelSlot(j: number, n: number): { c: number; rank: number; count: number } {
  const s = splitOf(n);
  let c = 0;
  while (c < CHANNELS - 1 && j >= (s[c + 1] as number)) c++;
  return {
    c,
    rank: j - (s[c] as number),
    count: Math.max(1, (s[c + 1] as number) - (s[c] as number)),
  };
}

/** How far along its channel a ship is: steady spacing, the channel's one speed. */
const alongOf = (c: number, rank: number, count: number, sgn: number, speed: number, t: number) =>
  rank * (RUN / count) + hash(c, 633) * RUN + sgn * speed * t;
const near = (a: number, c: number, period: number) =>
  c + wrap(a - c + period / 2, period) - period / 2;

export type StreamShip = {
  /** Its nose, and the way it flies. */
  head: Vec3;
  dir: Vec3;
  F: Channel;
  c: number;
  rank: number;
  /** How much it shows: fading where its stretch, or its kind's lines, come round. */
  k: number;
};

/** Ship j of n in the channels round (cx, cz) at time t. */
export function streamShip(j: number, n: number, cx: number, cz: number, t: number): StreamShip {
  const { c, rank, count } = channelSlot(j, n);
  const F = channel(c, cx, cz);
  const s = alongOf(c, rank, count, F.sgn, F.speed, t);
  let head: Vec3;
  let dir: Vec3;
  let k: number;
  if (F.axis === 2) {
    const z = near(s, cz, RUN);
    head = [F.line * BLOCK_X + F.off, GROUND + F.y, z];
    dir = [0, 0, F.sgn];
    k = smooth((RUN / 2 - Math.abs(z - cz)) / 20);
    if (F.kind !== 'avenue') {
      k *= smooth(((F.streets / 2) * BLOCK_X - Math.abs(F.line * BLOCK_X - cx)) / 15);
      // The avenue's own files fly over its line, so no street file there.
      if (wrap(F.line, TILE_I) === 0) k = 0;
    }
  } else {
    const x = near(s, cx, RUN);
    head = [x, GROUND + F.y, F.line * BLOCK_Z + F.off];
    dir = [F.sgn, 0, 0];
    k = smooth((RUN / 2 - Math.abs(x - cx)) / 20);
    k *= smooth(((F.streets / 2) * BLOCK_Z - Math.abs(F.line * BLOCK_Z - cz)) / 15);
  }
  return { head, dir, F, c, rank, k };
}

/** Of the ships in the streets (not the express), about this share are their quarter's own. */
export const QUARTER_SHARE = 0.3;
export const isQuarterShip = (s: StreamShip) =>
  s.F.kind !== 'express' && hash(s.c * 977 + s.rank, 613) < QUARTER_SHARE;

/**
 * How far a point is from the edge of the district it is in, along the way the channel runs: the
 * bands' edges along z, the avenue and the tile's edge along x. A quarter's own ships fade out
 * there and the next quarter's fade in, so each flies only its own streets.
 */
export function quarterEdge(F: Channel, p: Vec3): number {
  if (F.axis === 2) {
    const band = 8 * BLOCK_Z;
    const s = wrap(p[2], band);
    return Math.min(s, band - s);
  }
  const half = TILE_X / 2;
  const s = wrap(p[0], half);
  return Math.min(s, half - s);
}

/** Lane light g of G along the channels round (cx, cz): fixed over the street, a slow swell running with the flow. */
export function laneLight(
  g: number,
  G: number,
  cx: number,
  cz: number,
  t: number,
): { pos: Vec3; light: number; k: number; F: Channel } {
  const c = g % CHANNELS;
  const idx = Math.floor(g / CHANNELS);
  const count = Math.max(1, Math.floor(G / CHANNELS));
  const F = channel(c, cx, cz);
  const centre = F.axis === 2 ? cz : cx;
  const a = near(idx * (RUN / count), centre, RUN);
  let pos: Vec3;
  let k = smooth((RUN / 2 - Math.abs(a - centre)) / 20);
  if (F.axis === 2) {
    pos = [F.line * BLOCK_X + F.off, GROUND + F.y - 0.6, a];
    if (F.kind !== 'avenue') {
      k *= smooth(((F.streets / 2) * BLOCK_X - Math.abs(F.line * BLOCK_X - cx)) / 15);
      if (wrap(F.line, TILE_I) === 0) k = 0;
    }
  } else {
    pos = [a, GROUND + F.y - 0.6, F.line * BLOCK_Z + F.off];
    k *= smooth(((F.streets / 2) * BLOCK_Z - Math.abs(F.line * BLOCK_Z - cz)) / 15);
  }
  // The swell runs along with the ships, at a little over half their speed: a slow, soft wave.
  const wave = 0.5 + 0.5 * Math.cos((TAU * (a - F.sgn * 0.6 * F.speed * t)) / 48);
  return { pos, light: 0.45 + 0.55 * wave, k, F };
}

/** The lane lights' colour: warm on the avenue, a pale blue in the streets, violet over the roofs. */
export function laneColour(F: Channel, t: number): RGB {
  const lean = 0.5 + 0.5 * Math.sin(0.05 * t + F.line);
  if (F.kind === 'avenue') return mix([1, 0.75, 0.45], [1, 0.6, 0.5], lean);
  if (F.kind === 'express') return mix([0.65, 0.5, 1], [0.5, 0.6, 1], lean);
  return mix([0.55, 0.8, 1], [0.7, 0.85, 1], lean);
}

/* ---------- high currents over the roofs ---------- */

/** The cells the high currents are laid out in: one loop a cell, centred on the avenue. */
export const HIGH_X = TILE_X;
export const HIGH_Z = 12 * BLOCK_Z;
/** How many ships fly each high current, two abreast. */
export const FLOCK = 12;

export type HighCurrent = {
  key: number;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  a: number;
  b: number;
  p1: number;
  p2: number;
  p3: number;
  y: number;
  sgn: 1 | -1;
  speed: number;
  phase: number;
};

/** The high current of cell (ix, iz): a long loop over the roofs, crossing the avenue twice. */
export function highCurrent(ix: number, iz: number): HighCurrent {
  const key = ((ix * 73856093) ^ (iz * 19349663)) >>> 0;
  const h = (s: number) => hash(key % 1000003, s);
  return {
    key,
    cx: ix * HIGH_X,
    cz: iz * HIGH_Z + (h(641) - 0.5) * 120,
    rx: 190 + 60 * h(642),
    rz: 240 + 80 * h(643),
    a: 30 + 30 * h(644),
    b: 20 + 25 * h(645),
    p1: TAU * h(646),
    p2: TAU * h(647),
    p3: TAU * h(648),
    y: 150 + 24 * h(649),
    sgn: h(650) < 0.5 ? 1 : -1,
    speed: 12 + 3 * h(651),
    phase: TAU * h(652),
  };
}

/** A point of the loop at θ, and its first and second derivatives (for its heading and its bank). */
export function loopAt(H: HighCurrent, th: number): { p: Vec3; d1: Vec3; d2: Vec3 } {
  const c1 = Math.cos(th);
  const s1 = Math.sin(th);
  const c2 = Math.cos(2 * th + H.p1);
  const s2 = Math.sin(2 * th + H.p1);
  const c3 = Math.cos(3 * th + H.p2);
  const s3 = Math.sin(3 * th + H.p2);
  const cy = Math.cos(2 * th + H.p3);
  const sy = Math.sin(2 * th + H.p3);
  return {
    p: [H.cx + H.rx * c1 + H.a * c2, GROUND + H.y + 8 * sy, H.cz + H.rz * s1 + H.b * s3],
    d1: [-H.rx * s1 - 2 * H.a * s2, 16 * cy, H.rz * c1 + 3 * H.b * c3],
    d2: [-H.rx * c1 - 4 * H.a * c2, -32 * sy, -H.rz * s1 - 9 * H.b * s3],
  };
}

const meanR = (H: HighCurrent) => (H.rx + H.rz) / 2;
/** Where the flock's leaders are on the loop at time t. */
export const flockTheta = (H: HighCurrent, t: number) => H.phase + (H.sgn * H.speed * t) / meanR(H);
/** How far apart the ships fly along the loop (about nine units). */
export const flockGap = (H: HighCurrent) => 9 / meanR(H);

/**
 * Ship i of the high current's flock at time t: its middle, its heading (along the loop, the way
 * the flock flies), its side, and its bank (into the turn, all the flock together).
 */
export function highShip(
  H: HighCurrent,
  i: number,
  t: number,
): { c: Vec3; f: Vec3; side: Vec3; bank: number } {
  const th = flockTheta(H, t) - H.sgn * (i >> 1) * flockGap(H);
  const { p, d1, d2 } = loopAt(H, th);
  const l = Math.hypot(d1[0], d1[1], d1[2]) || 1;
  const f: Vec3 = [(H.sgn * d1[0]) / l, (H.sgn * d1[1]) / l, (H.sgn * d1[2]) / l];
  // The turn's curvature over the street (seen from above), signed: banked into it.
  const v2 = d1[0] * d1[0] + d1[2] * d1[2];
  const kappa = (d1[0] * d2[2] - d1[2] * d2[0]) / Math.max(1e-6, v2 ** 1.5);
  const bank = Math.max(-0.7, Math.min(0.7, Math.atan((H.speed * H.speed * kappa) / 5)));
  const hl = Math.hypot(f[0], f[2]) || 1;
  const side: Vec3 = [-f[2] / hl, 0, f[0] / hl];
  const off = (i & 1 ? 1 : -1) * 2.2;
  const c: Vec3 = [
    p[0] + side[0] * off * Math.cos(bank),
    p[1] + off * Math.sin(bank) * H.sgn,
    p[2] + side[2] * off * Math.cos(bank),
  ];
  return { c, f, side, bank };
}

/** The high currents of the cells round the eye, nearest first: `count` of them. */
export function highCurrentsNear(eye: Vec3, count: number): HighCurrent[] {
  const ix0 = Math.round(eye[0] / HIGH_X);
  const iz0 = Math.round(eye[2] / HIGH_Z);
  const all: { H: HighCurrent; d: number }[] = [];
  for (let a = -1; a <= 1; a++)
    for (let b = -1; b <= 1; b++) {
      const H = highCurrent(ix0 + a, iz0 + b);
      let d = Number.POSITIVE_INFINITY;
      for (let s = 0; s < 24; s++) {
        const { p } = loopAt(H, (s * TAU) / 24);
        d = Math.min(d, Math.hypot(p[0] - eye[0], p[2] - eye[2]));
      }
      all.push({ H, d });
    }
  all.sort((x, y) => x.d - y.d);
  return all.slice(0, count).map((e) => e.H);
}

/** A high current's colour now: a pale warm gold leaning slowly to a soft cyan and back. */
export const highColour = (H: HighCurrent, t: number): RGB =>
  mix([1, 0.82, 0.55], [0.55, 0.9, 1], 0.5 + 0.5 * Math.sin(0.04 * t + H.phase));

/* ---------- outliers: the big ships ---------- */

export type OutlierKind = 'liner' | 'barge' | 'ferry';

export type Outlier = {
  kind: OutlierKind;
  name: string;
  axis: 0 | 2;
  /** Its line across: x for one flying along z (in the tile), z for one along x (every `every`). */
  off: number;
  every: number;
  y: number;
  sgn: 1 | -1;
  speed: number;
  /** The stretch it flies alone in: one ship in every `run`. */
  run: number;
  len: number;
};

export const OUTLIERS: Outlier[] = [
  {
    kind: 'liner',
    name: 'Cargo liner',
    axis: 2,
    off: -4.5 * BLOCK_X,
    every: TILE_X,
    y: 126,
    sgn: -1,
    speed: 3,
    run: 900,
    len: 34,
  },
  {
    kind: 'barge',
    name: 'Lantern barge',
    axis: 2,
    off: 4.5 * BLOCK_X,
    every: TILE_X,
    y: 96,
    sgn: 1,
    speed: 2.2,
    run: 760,
    len: 22,
  },
  {
    kind: 'ferry',
    name: 'Long ferry',
    axis: 0,
    off: 7.5 * BLOCK_Z,
    every: 14 * BLOCK_Z,
    y: 142,
    sgn: 1,
    speed: 3.6,
    run: 700,
    len: 40,
  },
];

/** Big ship o near the eye at time t: its middle, heading, and how much it shows. */
export function outlierAt(o: number, eye: Vec3, t: number): { c: Vec3; f: Vec3; k: number } {
  const O = OUTLIERS[o] as Outlier;
  const centre = O.axis === 2 ? eye[2] : eye[0];
  const a = near(hash(o, 661) * O.run + O.sgn * O.speed * t, centre, O.run);
  const k = smooth((O.run / 2 - Math.abs(a - centre)) / 60);
  if (O.axis === 2) {
    const x = nearest(O.off, eye[0], O.every);
    return { c: [x, GROUND + O.y, a], f: [0, 0, O.sgn], k };
  }
  const z = nearest(O.off, eye[2], O.every);
  return { c: [a, GROUND + O.y, z], f: [O.sgn, 0, 0], k };
}

/**
 * Grain q (0..1) of big ship `kind` (r a second number for spreads): where it sits in the ship's
 * frame (a forward, b to its right, h up, in the city's units), its colour and light. Our own
 * designs; lights breathe slowly.
 */
export function outlierGrain(
  kind: OutlierKind,
  q: number,
  r: number,
  t: number,
): { a: number; b: number; h: number; rgb: RGB; light: number } {
  const e = r < 0.5 ? 1 : -1;
  const breathe = 0.85 + 0.15 * Math.sin(0.5 * t + 7 * r);
  if (kind === 'liner') {
    const L = 17;
    if (q < 0.45) {
      // The hull: a long spindle in rings.
      const u = q / 0.45;
      const a = -L + 2 * L * u;
      const rad = 3.2 * Math.sqrt(Math.max(0, 1 - (a / L) ** 2));
      const w = TAU * r;
      return { a, b: rad * Math.cos(w), h: rad * Math.sin(w), rgb: [0.62, 0.7, 0.88], light: 0.32 };
    }
    if (q < 0.72) {
      // A warm row of windows along both flanks.
      const a = -L * 0.8 + 1.6 * L * ((q - 0.45) / 0.27);
      const rad = 3.2 * Math.sqrt(Math.max(0, 1 - (a / L) ** 2));
      return { a, b: e * rad * 0.98, h: 0.6, rgb: [1, 0.82, 0.55], light: 0.5 * breathe };
    }
    if (q < 0.85) {
      // Its bridge, standing up toward the bow.
      const f = (q - 0.72) / 0.13;
      return { a: 8 + 3 * r, b: 0, h: 3 + 2.2 * f, rgb: [0.8, 0.86, 1], light: 0.4 };
    }
    const k = Math.floor(r * 3) - 1;
    return {
      a: -L - 0.5 - 1.5 * ((q - 0.85) / 0.15),
      b: k * 1.4,
      h: 0,
      rgb: [0.5, 0.85, 1],
      light: 0.55 * breathe,
    };
  }
  if (kind === 'barge') {
    if (q < 0.35) {
      // The deck's outline, wide and flat.
      const u = (q / 0.35) * 2;
      const along = u < 1;
      const f = (along ? u : u - 1) * 2 - 1;
      return along
        ? { a: f * 11, b: e * 3.5, h: 0, rgb: [0.7, 0.5, 0.3], light: 0.3 }
        : { a: e * 11, b: f * 3.5, h: 0, rgb: [0.7, 0.5, 0.3], light: 0.3 };
    }
    if (q < 0.75) {
      // Lanterns hanging under both edges, swaying a little.
      const n = Math.floor(((q - 0.35) / 0.4) * 20);
      const a = -10 + (n % 10) * (20 / 9);
      const sway = 0.3 * Math.sin(0.6 * t + n);
      const red = 0.5 + 0.5 * Math.sin(0.12 * t + n);
      return {
        a: a + sway,
        b: (n < 10 ? 1 : -1) * 3.5,
        h: -1.6 - 0.4 * r,
        rgb: mix([1, 0.3, 0.18], [1, 0.62, 0.25], red),
        light: 0.6 * breathe,
      };
    }
    // A low arched canopy over the deck.
    const f = (q - 0.75) / 0.25;
    const w = Math.PI * r;
    return {
      a: -8 + 16 * f,
      b: 3.2 * Math.cos(w),
      h: 2.4 * Math.sin(w),
      rgb: [1, 0.7, 0.4],
      light: 0.28,
    };
  }
  // The long ferry: a slim two-decked hull, its windows in two soft bands, a light at bow and stern.
  const L = 20;
  if (q < 0.3) {
    const a = -L + 2 * L * (q / 0.3);
    const taper = Math.min(1, (L - Math.abs(a)) / 4);
    return { a, b: e * 2.4 * taper, h: -1.2, rgb: [0.4, 0.8, 0.78], light: 0.32 };
  }
  if (q < 0.75) {
    const u = (q - 0.3) / 0.45;
    const upper = r < 0.5;
    const a = -L * 0.85 + 1.7 * L * u;
    return {
      a,
      b: (Math.floor(u * 40) % 2 ? 1 : -1) * (upper ? 1.8 : 2.3),
      h: upper ? 1.4 : 0.2,
      rgb: mix([0.6, 0.95, 0.9], [0.9, 0.95, 1], upper ? 0.6 : 0.2),
      light: 0.45 * breathe,
    };
  }
  if (q < 0.9) {
    // A slim mast amidships, a soft beacon at its top.
    const f = (q - 0.75) / 0.15;
    return { a: 2, b: 0, h: 1.6 + 4 * f, rgb: [0.7, 1, 0.95], light: 0.3 + 0.3 * f * breathe };
  }
  return {
    a: r < 0.5 ? L + 0.6 : -L - 0.6,
    b: 0,
    h: -0.4,
    rgb: r < 0.5 ? [0.9, 0.95, 1] : [1, 0.35, 0.3],
    light: 0.55,
  };
}
