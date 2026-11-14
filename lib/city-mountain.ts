/*
 * The Mountain quarter of the City of Dreams (docs/specs/art-city.md, "Mountain and Favela
 * quarters"): tall peaks in the annex beside the strip, drawn as a topographic map in light,
 * with temples on their summits and ledges, long stairways climbing to them, and cable cars
 * gliding slowly between the peaks. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "add the mountain and favela above, so the city becomes more square", and "draw the
 * mountains NOT as scattered dots but as TOPO LINES, contour lines like a topographic map".
 *
 * The look borrows the Art builder's Mountains (lib/art/butterflies.ts, Data Peak and Wire Peaks):
 * a white summit over gold, amber, magenta and violet foothills, "like a chart of light", the
 * lines echoing out. Every peak is a rounded cone with a wavering foot; its contour rings stand at
 * every CONTOUR of height, every fifth one (the index contour, as on a survey map) brighter and
 * paler. Where a neighbour's slope stands higher, a ring is hidden, so the lines merge round the
 * saddles as a real map's do. A few faint ridge lines run from each summit to its foot.
 *
 * Everything here is in the annex's own frame: `ax` across from the strip's edge street (0 to
 * ANNEX_I blocks), `lz` along the tile (0 to MOUNTAIN_Z1, the river). The geometry is laid out
 * once, into flat arrays, the first time it is asked for; a frame only reads it, and the sites
 * write straight into the renderer's array (no allocation per grain). Light is mellow: hues lean
 * slowly, lamps breathe, nothing flashes.
 */

import { fibonacciSphere, hash, type RGB, smooth, type Vec3 } from './bigbang';
import {
  BLOCK_Z,
  C,
  clamp,
  GROUND,
  type Item,
  lerp,
  mixId,
  nearest,
  STRIP_X,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';

/** The Mountain quarter runs along the tile from its start to the river (row 24). */
export const MOUNTAIN_Z1 = 24 * BLOCK_Z;

/* ---------- the peaks: a cheap height field ---------- */

/**
 * A peak: its middle, the height its slope would reach, its foot's size, two phases for its
 * wavering foot, and `top`, the height it stops at: its summit, or a small plateau a summit temple
 * stands on.
 */
export type Peak = {
  x: number;
  z: number;
  h: number;
  r: number;
  p1: number;
  p2: number;
  top: number;
};
/** How a slope curves: steep near the summit, easing out to the foot. */
export const PEAK_EXP = 1.6;
/** How wide a summit temple's plateau is, from its middle. */
export const PLATEAU_R = 6.5;
const peak = (x: number, z: number, h: number, r: number, n: number): Peak => ({
  x,
  z,
  h,
  r,
  p1: TAU * hash(n, 701),
  p2: TAU * hash(n, 702),
  // Every other peak (the second, fourth...) is cut to a plateau for its summit temple.
  top: n % 2 === 0 ? h * (1 - PLATEAU_R / r) ** PEAK_EXP : h,
});

/**
 * Eight peaks, annex-local, with valleys between to fly through. None taller than 128 (with its
 * temple, under the high currents' loops at 142 and the long ferry), every foot inside the annex.
 */
export const PEAKS: Peak[] = [
  peak(74, 120, 112, 70, 1),
  peak(214, 100, 125, 76, 2),
  peak(140, 270, 96, 62, 3),
  peak(236, 300, 118, 58, 4),
  peak(62, 430, 104, 60, 5),
  peak(196, 468, 128, 84, 6),
  peak(96, 630, 100, 70, 7),
  peak(222, 660, 116, 68, 8),
];
/** The height between two contour lines. */
export const CONTOUR = 8;
/** Every this many rings, an index contour: brighter and paler. */
export const INDEX_EVERY = 5;

/** How far peak p's foot reaches toward angle a: a wavering circle, never past 1.2 r. */
export const footR = (p: Peak, a: number) =>
  p.r * (1 + 0.11 * Math.sin(3 * a + p.p1) + 0.07 * Math.sin(5 * a + p.p2));

/** Peak p's height over the street at annex-local (ax, lz). */
export function peakHeight(p: Peak, ax: number, lz: number): number {
  const dx = ax - p.x;
  const dz = lz - p.z;
  const lim = p.r * 1.2;
  if (dx > lim || dx < -lim || dz > lim || dz < -lim) return 0;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d >= lim) return 0;
  const u = d / footR(p, Math.atan2(dz, dx));
  return u < 1 ? Math.min(p.top, p.h * (1 - u) ** PEAK_EXP) : 0;
}

/** The mountains' height over the street at annex-local (ax, lz): the highest slope there. */
export function mountainHeight(ax: number, lz: number): number {
  let h = 0;
  for (const p of PEAKS) {
    const v = peakHeight(p, ax, lz);
    if (v > h) h = v;
  }
  return h;
}

/** How far from its middle peak p's contour at height L stands, toward angle a. */
export const contourR = (p: Peak, L: number, a: number) =>
  footR(p, a) * (1 - (L / p.h) ** (1 / PEAK_EXP));

/* ---------- temples, stations and cables ---------- */

export type Temple = { x: number; z: number; y: number; s: number; kind: 'summit' | 'ledge' };
/** A temple's height, platform to roof tip. */
export const TEMPLE_H = 9.5;

/**
 * The temples: on the summits of four peaks, and on a ledge halfway up each of the other four,
 * turned toward the strip (-x) so they are seen from the city. Those four keep their summits for
 * the cable cars' stations.
 */
export const TEMPLES: Temple[] = PEAKS.map((p, i) => {
  if (i % 2 === 1) return { x: p.x, z: p.z, y: p.top, s: 4.6, kind: 'summit' as const };
  const L = Math.round((0.5 * p.h) / CONTOUR) * CONTOUR;
  const a = Math.PI + 0.35 * (hash(i, 711) - 0.5);
  const r = contourR(p, L, a) * 0.98;
  const x = p.x + Math.cos(a) * r;
  const z = p.z + Math.sin(a) * r;
  return { x, z, y: peakHeight(p, x, z), s: 3.8, kind: 'ledge' as const };
});

/** A cable car station: a pylon from its foot (y) up to its head, where the cable is fixed. */
export type CableStation = { name: string; x: number; z: number; y: number; head: number };
const summitStation = (i: number, name: string): CableStation => {
  const p = PEAKS[i] as Peak;
  return { name, x: p.x, z: p.z, y: p.h - 1, head: p.h + 6 };
};
export const CABLE_STATIONS: CableStation[] = [
  { name: 'Lower cable station', x: 6, z: 210, y: 0, head: 26 },
  summitStation(0, 'First peak station'),
  summitStation(2, 'Middle peak station'),
  summitStation(4, 'West peak station'),
  summitStation(6, 'Last peak station'),
  { name: 'Valley cable station', x: 6, z: 548, y: 0, head: 26 },
];
/** The cables, station to station: up from the city's edge and on from peak to peak. */
export const CABLES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [5, 4],
];
/** How far a cable sags in its middle, for its length across. */
const SAG = 0.03;
/** The two ropes of a cable stand this far either side of its line. */
export const ROPE_OFF = 0.9;
/** A cabin hangs this far under its rope, and moves this fast along it: slowly. */
export const CAR_DROP = 2.4;
export const CAR_SPEED = 2.2;
/** Cabins on each cable: half going up on one rope, half coming back down the other. */
export const CARS_PER_CABLE = 4;

/** A cable's ends, its unit across (px, pz), its length across and its full length: worked out once. */
type CableGeo = {
  a: Vec3;
  b: Vec3;
  ux: number;
  uz: number;
  px: number;
  pz: number;
  hl: number;
  len: number;
};
const CABLE_GEO: CableGeo[] = CABLES.map(([i, j]) => {
  const A = CABLE_STATIONS[i] as CableStation;
  const B = CABLE_STATIONS[j] as CableStation;
  const hl = Math.hypot(B.x - A.x, B.z - A.z) || 1;
  return {
    a: [A.x, A.head, A.z],
    b: [B.x, B.head, B.z],
    ux: (B.x - A.x) / hl,
    uz: (B.z - A.z) / hl,
    px: -(B.z - A.z) / hl,
    pz: (B.x - A.x) / hl,
    hl,
    len: Math.hypot(B.x - A.x, B.head - A.head, B.z - A.z),
  };
});

/** A cable's length, end to end. */
export const cableLength = (c: number) => (CABLE_GEO[c] as CableGeo).len;

/** Cable c's rope `side` (-1, 0 its middle line, 1) at s (0..1), into o[0..2]: annex-local, y over the street. */
function cableInto(c: number, s: number, side: number, o: number[]): void {
  const g = CABLE_GEO[c] as CableGeo;
  o[0] = lerp(g.a[0], g.b[0], s) + g.px * side * ROPE_OFF;
  o[1] = lerp(g.a[1], g.b[1], s) - 4 * SAG * g.hl * s * (1 - s);
  o[2] = lerp(g.a[2], g.b[2], s) + g.pz * side * ROPE_OFF;
}
/** The point `s` (0..1) along cable c's rope `side`: a straight line sagging gently in the middle. */
export function cablePoint(c: number, s: number, side = 0): Vec3 {
  const o = [0, 0, 0];
  cableInto(c, s, side, o);
  return o as Vec3;
}
/**
 * Cabin k of cable c at time t: how far along (0 at its first station), the rope it rides, and its
 * middle (annex-local, y over the street). The even ones go up the +1 rope, the odd ones come back
 * down the -1 rope, all at one slow pace, evenly spaced: a formula of the time, nothing kept.
 */
export function cableCarAt(c: number, k: number, t: number): { s: number; side: 1 | -1; c: Vec3 } {
  const ph = ((((t * CAR_SPEED) / cableLength(c) + k / CARS_PER_CABLE + hash(c, 721)) % 1) + 1) % 1;
  const side: 1 | -1 = k % 2 === 0 ? 1 : -1;
  const s = side > 0 ? ph : 1 - ph;
  const p = cablePoint(c, s, side);
  return { s, side, c: [p[0], p[1] - CAR_DROP, p[2]] };
}

/** Whether annex-local (ax, y over the street, lz) is inside a temple or a station's pylon, `m` round. */
function builtAt(ax: number, y: number, lz: number, m: number): boolean {
  for (const T of TEMPLES) {
    if (Math.abs(ax - T.x) < T.s + 1.4 + m && Math.abs(lz - T.z) < T.s + 1.4 + m)
      if (y > T.y - m - 2 && y < T.y + TEMPLE_H + m) return true;
  }
  for (const S of CABLE_STATIONS) {
    if (Math.abs(ax - S.x) < 1.8 + m && Math.abs(lz - S.z) < 1.8 + m)
      if (y > S.y - m && y < S.head + 1.8 + m) return true;
  }
  return false;
}

/**
 * Whether annex-local (ax, y over the street, lz) is inside a peak, a temple or a pylon, `m` round.
 * Off the slopes the street (or the river) is the floor, as everywhere (the collision's floorAt).
 */
export function mountainSolid(ax: number, y: number, lz: number, m: number): boolean {
  const h = mountainHeight(ax, lz);
  if (h > 0 && y < h + m) return true;
  return builtAt(ax, y, lz, m);
}

/* ---------- laid out once: contour rings, ridges, stairs ---------- */

/** One contour ring: its peak, height, where its points begin, how many, its size, an index one. */
export type Ring = { p: number; L: number; start: number; n: number; r: number; index: boolean };
/** A stairway up to a temple: where its samples begin and how many. */
export type Stair = { start: number; n: number; temple: number };

export type MountainGeo = {
  /** Contour and ridge points: x, y, z (annex-local), three a point. */
  pts: Float32Array;
  rings: Ring[];
  ridges: { p: number; start: number; n: number }[];
  /** Stair samples: x, y, z, then the unit across the stair (px, pz), five a sample. */
  steps: Float32Array;
  stairs: Stair[];
};
let geo: MountainGeo | null = null;

/** The spacing of a ring's points, of an index ring's, of a ridge's and of the stairs' steps. */
const RING_GAP = 1.5;
const INDEX_GAP = 1.0;
const RIDGE_GAP = 1.6;
const STEP_GAP = 1.0;
/** A stairway's last stretch, a flight rising off the slope onto its temple's platform. */
export const STAIR_FLIGHT = 8;

/** The mountains' geometry: built the first time it is asked for, the same object after. */
export function mountainGeo(): MountainGeo {
  if (geo) return geo;
  const pts: number[] = [];
  const rings: Ring[] = [];
  const ridges: MountainGeo['ridges'] = [];
  PEAKS.forEach((p, pi) => {
    for (let lv = 1; lv * CONTOUR < p.top - 2; lv++) {
      const L = lv * CONTOUR;
      const index = lv % INDEX_EVERY === 0;
      const r = contourR(p, L, 0);
      // Spaced for the widest the wavering ring reaches.
      const n = Math.max(8, Math.ceil((1.2 * TAU * r) / (index ? INDEX_GAP : RING_GAP)));
      const start = pts.length / 3;
      for (let s = 0; s < n; s++) {
        const a = ((s + 0.5) / n) * TAU;
        const rr = contourR(p, L, a);
        const x = p.x + Math.cos(a) * rr;
        const z = p.z + Math.sin(a) * rr;
        // Under a neighbour's higher slope this line is hidden: the rings merge at the saddles.
        if (mountainHeight(x, z) > L + 0.6) continue;
        pts.push(x, L, z);
      }
      rings.push({ p: pi, L, start, n: pts.length / 3 - start, r, index });
    }
    // Three ridges from the summit down to the foot, faint, along the slope.
    const start = pts.length / 3;
    for (let k = 0; k < 3; k++) {
      const a = p.p1 + (k * TAU) / 3;
      const len = footR(p, a);
      for (let e = RIDGE_GAP; e < len; e += RIDGE_GAP) {
        const x = p.x + Math.cos(a) * e;
        const z = p.z + Math.sin(a) * e;
        const y = peakHeight(p, x, z);
        if (mountainHeight(x, z) > y + 0.6) continue;
        pts.push(x, y + 0.2, z);
      }
    }
    ridges.push({ p: pi, start, n: pts.length / 3 - start });
  });
  // The stairways: from the foot of each temple's peak, on its city side, zigzagging up the slope
  // to the temple's platform.
  const steps: number[] = [];
  const stairs: Stair[] = [];
  TEMPLES.forEach((T, ti) => {
    const p = PEAKS[ti] as Peak;
    const a = T.kind === 'ledge' ? Math.atan2(T.z - p.z, T.x - p.x) : Math.PI - 0.5;
    const foot = footR(p, a) * 1.02;
    const fx = p.x + Math.cos(a) * foot;
    const fz = p.z + Math.sin(a) * foot;
    // Up to the temple's platform edge on the side it is climbed from.
    const tx = T.x + Math.cos(a) * (T.s + 1.5);
    const tz = T.z + Math.sin(a) * (T.s + 1.5);
    const len = Math.hypot(tx - fx, tz - fz);
    const ux = (tx - fx) / len;
    const uz = (tz - fz) / len;
    const start = steps.length / 5;
    let px = Number.NaN;
    let pz = Number.NaN;
    for (let e = 0; e <= len; e += STEP_GAP * 0.05) {
      const s = e / len;
      // A gentle zigzag across the slope, narrowing as it nears the top.
      const zig = 5 * Math.sin(s * TAU * 3) * (1 - s);
      const x = fx + ux * e - uz * zig;
      const z = fz + uz * e + ux * zig;
      const first = Number.isNaN(px);
      if (!first && Math.hypot(x - px, z - pz) < STEP_GAP) continue;
      const dx = first ? ux : x - px;
      const dz = first ? uz : z - pz;
      const dl = Math.hypot(dx, dz) || 1;
      px = x;
      pz = z;
      // Up the slope, then over its last stretch a flight rising onto the platform.
      const up = smooth((e - (len - STAIR_FLIGHT)) / STAIR_FLIGHT);
      const y = lerp(Math.min(mountainHeight(x, z), T.y), T.y, up);
      steps.push(x, y + 0.25, z, -dz / dl, dx / dl);
    }
    stairs.push({ start, n: steps.length / 5 - start, temple: ti });
  });
  geo = { pts: new Float32Array(pts), rings, ridges, steps: new Float32Array(steps), stairs };
  return geo;
}

/* ---------- colours, written straight into a site ---------- */

/** Data Peak's ramp, foot to summit: violet, magenta, amber, pale gold, white. */
const RAMP: RGB[] = [
  [0.36, 0.18, 0.82],
  [0.82, 0.26, 0.64],
  [1, 0.66, 0.2],
  [1, 0.94, 0.62],
  [1, 1, 1],
];
/**
 * The ramp at f (0 the foot, 1 the summit), paled toward white by `pale`, times k, into o[3..5].
 */
export function rampInto(o: number[], f: number, pale: number, k: number): void {
  const x = clamp(f, 0, 1) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const u = x - i;
  const a = RAMP[i] as RGB;
  const b = RAMP[i + 1] as RGB;
  for (let c = 0; c < 3; c++) {
    const v = lerp(a[c] as number, b[c] as number, u);
    o[3 + c] = lerp(v, 1, pale) * k;
  }
}
/** A colour times k into o[3..5]. */
const tint = (o: number[], c: RGB, k: number) => {
  o[3] = c[0] * k;
  o[4] = c[1] * k;
  o[5] = c[2] * k;
};

/* ---------- drawing ---------- */

/** The shift from annex-local to the world for the annex's copy nearest the eye. */
function shiftNear(ax: number, lz: number, eye: Vec3): [number, number] {
  const x = STRIP_X / 2 + ax;
  return [nearest(x, eye[0], TILE_X) - x + STRIP_X / 2, nearest(lz, eye[2], TILE_Z) - lz];
}

/** Sites in a temple, a cable station, a cabin. */
export const TEMPLE_SITES = 136;
export const STATION_SITES = 40;
export const CAR_SITES = 40;

/** A point `q` of `n` round a square of half side h: written into SQ. */
const SQ = [0, 0];
function onSquare(q: number, n: number, h: number): void {
  const e = (q / n) * 4;
  const side = Math.floor(e);
  const f = (e - side) * 2 - 1;
  const a = side === 0 ? f : side === 1 ? 1 : side === 2 ? -f : -1;
  const b = side === 0 ? -1 : side === 1 ? f : side === 2 ? 1 : -f;
  SQ[0] = a * h;
  SQ[1] = b * h;
}

/**
 * Site s of a temple into o, its colour too: a platform's rim, four columns, an eave, an upper
 * eave, a roof rising to a tip, and a warm lamp glowing inside. Gold, ivory and saffron.
 */
export function templeSite(T: Temple, s: number, t: number, ox: number, oz: number, o: number[]) {
  const breath = 0.9 + 0.1 * Math.sin(0.3 * t + T.x * 0.1);
  let x = 0;
  let y = 0;
  let z = 0;
  if (s < 32) {
    onSquare(s, 32, T.s + 1);
    [x, z] = [SQ[0] as number, SQ[1] as number];
    y = 0.3;
    tint(o, C.gold, 0.42 * breath);
  } else if (s < 56) {
    const q = s - 32;
    const corner = Math.floor(q / 6);
    x = (corner & 1 ? 1 : -1) * (T.s - 0.6);
    z = (corner & 2 ? 1 : -1) * (T.s - 0.6);
    y = 0.6 + ((q % 6) / 5) * 4.6;
    tint(o, C.ivory, 0.4 * breath);
  } else if (s < 88) {
    onSquare(s - 56, 32, T.s + 1.4);
    [x, z] = [SQ[0] as number, SQ[1] as number];
    y = 5.4;
    tint(o, C.saffron, 0.5 * breath);
  } else if (s < 108) {
    onSquare(s - 88, 20, T.s * 0.7);
    [x, z] = [SQ[0] as number, SQ[1] as number];
    y = 7.2;
    tint(o, C.marigold, 0.48 * breath);
  } else if (s < 128) {
    const q = s - 108;
    const corner = Math.floor(q / 5);
    const f = ((q % 5) + 1) / 6;
    x = (corner & 1 ? 1 : -1) * T.s * 0.7 * (1 - f);
    z = (corner & 2 ? 1 : -1) * T.s * 0.7 * (1 - f);
    y = 7.2 + (TEMPLE_H - 7.2) * f;
    tint(o, C.gold, 0.5 * breath);
  } else {
    const q = fibonacciSphere(s - 128, 8);
    x = q[0];
    y = 2.6 + q[1];
    z = q[2];
    tint(o, C.warm, 0.7 * breath);
  }
  o[0] = ox + T.x + x;
  o[1] = GROUND + T.y + y;
  o[2] = oz + T.z + z;
}

/** Site s of a cable station into o: its pylon, the wheel at its head, a lamp over it. */
function stationSite(S: CableStation, s: number, t: number, ox: number, oz: number, o: number[]) {
  const breath = 0.9 + 0.1 * Math.sin(0.25 * t + S.z * 0.05);
  let x = 0;
  let y: number;
  let z = 0;
  if (s < 16) {
    y = S.y + ((s + 0.5) / 16) * (S.head - S.y);
    x = s & 1 ? 0.5 : -0.5;
    tint(o, C.steel, 0.35 * breath);
  } else if (s < 32) {
    const a = ((s - 16) / 16) * TAU;
    x = Math.cos(a) * 1.6;
    z = Math.sin(a) * 1.6;
    y = S.head;
    tint(o, C.white, 0.4 * breath);
  } else {
    const q = fibonacciSphere(s - 32, 8);
    x = q[0] * 0.5;
    y = S.head + 1.2 + q[1] * 0.5;
    z = q[2] * 0.5;
    tint(o, C.amber, 0.7 * breath);
  }
  o[0] = ox + S.x + x;
  o[1] = GROUND + y;
  o[2] = oz + S.z + z;
}

/** Site s of a cabin hanging at (cx, cy, cz) (annex-local) on a cable running along (ux, uz). */
function carSite(
  cx: number,
  cy: number,
  cz: number,
  ux: number,
  uz: number,
  s: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
) {
  const hw = 1.0;
  const hl = 1.3;
  const hh = 0.9;
  let a = 0;
  let b = 0;
  let h = 0;
  if (s < 4) {
    // The hanger up to the rope.
    h = hh + ((s + 0.5) / 4) * (CAR_DROP - hh);
    tint(o, C.steel, 0.32);
  } else if (s < 24) {
    // Its roof's rim and its floor's.
    const q = s - 4;
    onSquare(q % 10, 10, 1);
    a = (SQ[0] as number) * hl;
    b = (SQ[1] as number) * hw;
    h = q < 10 ? hh : -hh;
    tint(o, C.ivory, 0.42);
  } else if (s < 32) {
    const q = s - 24;
    const corner = q >> 1;
    a = (corner & 1 ? 1 : -1) * hl;
    b = (corner & 2 ? 1 : -1) * hw;
    h = q & 1 ? 0.35 : -0.35;
    tint(o, C.ivory, 0.42);
  } else {
    // Its windows, warm, four a side, glowing softly.
    const q = s - 32;
    a = ((q & 3) - 1.5) * 0.6;
    b = (q < 4 ? 1 : -1) * (hw + 0.05);
    h = 0.15;
    tint(o, C.warm, 0.6 * (0.9 + 0.1 * Math.sin(0.4 * t + q)));
  }
  o[0] = ox + cx + ux * a - uz * b;
  o[1] = GROUND + cy + h;
  o[2] = oz + cz + uz * a + ux * b;
}

/**
 * The mountains' lit things round the eye, out to R: their contour rings, ridges, temples,
 * stairways, cable stations, cables and cabins, each an Item, kept to the view ahead.
 */
export function mountainItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]): void {
  const G = mountainGeo();
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const ahead = (x: number, z: number, rad: number) => {
    const rx = x - eye[0];
    const rz = z - eye[2];
    const depth = rx * hx + rz * hz;
    return depth > -rad && Math.abs(rx * hz - rz * hx) < depth * 1.1 + rad * 1.5 + 6;
  };
  const pts = G.pts;
  const shifts = PEAKS.map((p) => shiftNear(p.x, p.z, eye));
  for (const ring of G.rings) {
    if (ring.n <= 0) continue;
    const p = PEAKS[ring.p] as Peak;
    const [ox, oz] = shifts[ring.p] as [number, number];
    const cx = ox + p.x;
    const cz = oz + p.z;
    const flat = Math.hypot(eye[0] - cx, eye[2] - cz);
    const d = Math.hypot(
      Math.max(0, Math.abs(flat - ring.r) - 0.2 * ring.r),
      eye[1] - GROUND - ring.L,
    );
    if (d > R || !ahead(cx, cz, ring.r * 1.2)) continue;
    const f = ring.L / p.top;
    const { start, index, L } = ring;
    // The hue leans slowly up and down the ramp, a lava drift, never a jump; the light breathes.
    const lean = 0.07 * Math.sin(0.03 * t + p.p1 + L * 0.05);
    const breath = 0.92 + 0.08 * Math.sin(0.2 * t + L * 0.13 + p.p2);
    const k = (index ? 0.62 : 0.42) * breath;
    const pale = index ? 0.45 : 0;
    out.push({
      d,
      gid: mixId(ring.p * 97 + L, 73100),
      count: ring.n,
      weight: index ? 1.6 : 1.25,
      site: (s, o) => {
        const i = (start + s) * 3;
        o[0] = ox + (pts[i] as number);
        o[1] = GROUND + (pts[i + 1] as number);
        o[2] = oz + (pts[i + 2] as number);
        rampInto(o, f + lean, pale, k);
        return true;
      },
    });
  }
  for (const rg of G.ridges) {
    if (rg.n <= 0) continue;
    const p = PEAKS[rg.p] as Peak;
    const [ox, oz] = shifts[rg.p] as [number, number];
    const cx = ox + p.x;
    const cz = oz + p.z;
    const d = Math.max(0, Math.hypot(eye[0] - cx, eye[1] - GROUND - p.h * 0.5, eye[2] - cz) - p.r);
    if (d > R || !ahead(cx, cz, p.r * 1.2)) continue;
    const { start } = rg;
    out.push({
      d,
      gid: mixId(rg.p, 73200),
      count: rg.n,
      weight: 1,
      site: (s, o) => {
        const i = (start + s) * 3;
        o[0] = ox + (pts[i] as number);
        o[1] = GROUND + (pts[i + 1] as number);
        o[2] = oz + (pts[i + 2] as number);
        rampInto(o, (pts[i + 1] as number) / p.top, 0.5, 0.26);
        return true;
      },
    });
  }
  TEMPLES.forEach((T, ti) => {
    const [ox, oz] = shiftNear(T.x, T.z, eye);
    const x = ox + T.x;
    const z = oz + T.z;
    const d = Math.max(0, Math.hypot(x - eye[0], GROUND + T.y + 4 - eye[1], z - eye[2]) - T.s - 2);
    if (d > R || !ahead(x, z, 12)) return;
    out.push({
      d,
      gid: mixId(ti, 73300),
      count: TEMPLE_SITES,
      weight: 1.6,
      site: (s, o) => {
        templeSite(T, s, t, ox, oz, o);
        return true;
      },
    });
  });
  const steps = G.steps;
  for (const st of G.stairs) {
    const T = TEMPLES[st.temple] as Temple;
    const [ox, oz] = shiftNear(T.x, T.z, eye);
    // The nearest of a few of its samples.
    let d = Number.POSITIVE_INFINITY;
    for (let m = 0; m < st.n; m += 8) {
      const i = (st.start + m) * 5;
      d = Math.min(
        d,
        Math.hypot(
          ox + (steps[i] as number) - eye[0],
          GROUND + (steps[i + 1] as number) - eye[1],
          oz + (steps[i + 2] as number) - eye[2],
        ),
      );
    }
    d = Math.max(0, d - 8);
    if (d > R || !ahead(ox + T.x, oz + T.z, 60)) continue;
    const { start } = st;
    out.push({
      d,
      gid: mixId(st.temple, 73400),
      count: st.n * 4,
      weight: 1.4,
      site: (s, o) => stairSite(steps, start, s, t, ox, oz, o),
    });
  }
  CABLE_STATIONS.forEach((S, si) => {
    const [ox, oz] = shiftNear(S.x, S.z, eye);
    const d = Math.hypot(ox + S.x - eye[0], GROUND + S.head - eye[1], oz + S.z - eye[2]);
    if (d > R || !ahead(ox + S.x, oz + S.z, 8)) return;
    out.push({
      d,
      gid: mixId(si, 73500),
      count: STATION_SITES,
      weight: 1.5,
      site: (s, o) => {
        stationSite(S, s, t, ox, oz, o);
        return true;
      },
    });
  });
  CABLE_GEO.forEach((g, c) => {
    const mx = (g.a[0] + g.b[0]) / 2;
    const mz = (g.a[2] + g.b[2]) / 2;
    const [ox, oz] = shiftNear(mx, mz, eye);
    const half = g.len / 2;
    const dMid = Math.hypot(
      ox + mx - eye[0],
      GROUND + (g.a[1] + g.b[1]) / 2 - eye[1],
      oz + mz - eye[2],
    );
    if (Math.max(0, dMid - half) > R || !ahead(ox + mx, oz + mz, half)) return;
    const n = Math.ceil(g.len / 1.3);
    const lean = 0.5 + 0.5 * Math.sin(0.04 * t + c);
    const rope: RGB = [lerp(0.9, 0.55, lean), lerp(0.95, 0.65, lean), lerp(1, 0.85, lean)];
    out.push({
      d: Math.max(0, dMid - half),
      gid: mixId(c, 73600),
      count: 2 * n,
      weight: 1.2,
      site: (s, o) => {
        cableInto(c, ((s % n) + 0.5) / n, s < n ? 1 : -1, o);
        o[0] = ox + (o[0] as number);
        o[1] = GROUND + (o[1] as number);
        o[2] = oz + (o[2] as number);
        tint(o, rope, 0.3);
        return true;
      },
    });
    for (let k = 0; k < CARS_PER_CABLE; k++) {
      const [cx, cy, cz] = cableCarAt(c, k, t).c;
      const dc = Math.hypot(ox + cx - eye[0], GROUND + cy - eye[1], oz + cz - eye[2]);
      if (dc > R || !ahead(ox + cx, oz + cz, 4)) continue;
      out.push({
        d: Math.max(0, dc - 2),
        gid: mixId(c * 16 + k, 73700),
        count: CAR_SITES,
        weight: 1.7,
        site: (s, o) => {
          carSite(cx, cy, cz, g.ux, g.uz, s, t, ox, oz, o);
          return true;
        },
      });
    }
  });
}

/**
 * Site s of a stairway (its samples from `start` in `steps`) into o: four a step, its two rails,
 * its tread between, and at every seventh step a lamp, either side in turn.
 */
function stairSite(
  steps: Float32Array,
  start: number,
  s: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): boolean {
  const m = s >> 2;
  const part = s & 3;
  const i = (start + m) * 5;
  let off = 0;
  let lift = 0;
  if (part === 0 || part === 1) {
    off = part === 0 ? -1.1 : 1.1;
    tint(o, C.ivory, 0.34);
  } else if (part === 2) {
    tint(o, C.sand, 0.22);
  } else {
    if (m % 7 !== 0) return false;
    off = (m % 14 === 0 ? 1 : -1) * 1.5;
    lift = 1.8;
    tint(o, C.amber, 0.62 * (0.88 + 0.12 * Math.sin(0.35 * t + m * 0.4)));
  }
  o[0] = ox + (steps[i] as number) + (steps[i + 3] as number) * off;
  o[1] = GROUND + (steps[i + 1] as number) + lift;
  o[2] = oz + (steps[i + 2] as number) + (steps[i + 4] as number) * off;
  return true;
}

/**
 * The far city's mountains (lib/city-far.ts): a coarse cut of every other contour, plan-local, in
 * the quarter's one colour (the far city is lit in the districts' colours), the index ones brighter.
 */
export function mountainFar(
  put: (x: number, y: number, z: number, c: RGB, k: number, salt: number) => void,
  colour: RGB,
): void {
  const G = mountainGeo();
  for (const ring of G.rings) {
    if (!ring.index && ring.L % (2 * CONTOUR) !== 0) continue;
    const b = ring.index ? 0.36 : 0.2;
    const c: RGB = [colour[0] * b, colour[1] * b, colour[2] * b];
    for (let s = 0; s < ring.n; s += 6) {
      const i = (ring.start + s) * 3;
      put(
        STRIP_X / 2 + (G.pts[i] as number),
        GROUND + (G.pts[i + 1] as number),
        G.pts[i + 2] as number,
        c,
        ring.p * 131 + s,
        940,
      );
    }
  }
}
