/*
 * Speed (docs/specs/geometry-field.md, "Speed: ten drives for the Ferrari pitch", 2026-11-16):
 * the pure math behind the Art builder's Speed pieces. No three.js, no DOM.
 *
 * - SCENES: the ten pieces, in the order of the Scene slider.
 * - The Monza trace: an original, stylised drawing of the circuit's shape (the long main straight,
 *   the first chicane, Curva Grande, Roggia, the two Lesmos, Serraglio, Ascari and the Parabolica),
 *   built from straights and arcs like a turtle, closed exactly, then sampled every few metres.
 * - The lap: a speed for every point (as fast as the curve allows, braking before corners and
 *   accelerating out of them) and the time to each point, so a clock gives a place on the lap.
 * - The road ahead: the track (or a winding mountain road) seen from a chase camera, as lists of
 *   (lateral, forward) points the shader reads to lay the road, the kerbs and the walls.
 * - The track field: a grid holding, for each cell, the distance to the centre line, where along
 *   the lap the nearest point is, and the speed there. The top view draws the circuit from it.
 *
 * - The Triangle Stream (scene 10): small triangles carried by the Wind Body's air field.
 *
 * Units are metres and seconds. Headings are radians, 0 east, π/2 north; the lap runs clockwise.
 */

import { normalAt, windShape, windVelocity } from '@/lib/wind';

export type SpeedScene = {
  slug: string;
  title: string;
  line: string;
};

/** The ten pieces, by Scene slider index. */
export const SCENES: SpeedScene[] = [
  {
    slug: 'monza-lap',
    title: 'Monza Lap',
    line: 'The circuit from above; a red light runs the lap and leaves a trail coloured by its speed',
  },
  {
    slug: 'monza-chase',
    title: 'Monza Chase',
    line: 'Low behind the car round the lap: kerbs flicking past, the park trees, corner names',
  },
  {
    slug: 'peak-straight',
    title: 'Peak Straight',
    line: 'An endless straight between mountains drawn in topo lines, to the vanishing point',
  },
  {
    slug: 'mountain-pass',
    title: 'Mountain Pass',
    line: 'A road winding through the Data Peak mountains at dusk',
  },
  {
    slug: 'wind-corridor',
    title: 'Wind Corridor',
    line: 'Streamlines race past on both sides and part round the car',
  },
  {
    slug: 'neon-run',
    title: 'Neon Run',
    line: 'A straight between towers built of light; the windows streak into lines',
  },
  {
    slug: 'tunnel-light',
    title: 'Tunnel to Light',
    line: 'A tunnel of lights, accelerating, opening onto the straight',
  },
  {
    slug: 'coast-road',
    title: 'Coast Road',
    line: 'Along a cliff above the sea at sunset, the water shimmering',
  },
  {
    slug: 'salt-flat',
    title: 'Salt Flat',
    line: 'An empty salt flat at sunset, heat shimmer, one long red streak',
  },
  {
    slug: 'night-rain',
    title: 'Night Rain',
    line: 'The straight at night in the rain: reflections, streaking lamps, spray',
  },
  {
    slug: 'triangle-stream',
    title: 'Triangle Stream',
    line: 'Rivers of small Chaos Triangles flowing over the red body, splitting at the nose, curling into the wake',
  },
];

/* ── Small helpers ─────────────────────────────────────────── */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function wrap(x: number, n: number): number {
  return ((x % n) + n) % n;
}

/* ── The Monza trace ───────────────────────────────────────── */

/** Corner and straight names, by label index. */
export const MONZA_NAMES = [
  'Rettifilo',
  'Prima Variante',
  'Curva Grande',
  'Variante della Roggia',
  'Lesmo 1',
  'Lesmo 2',
  'Serraglio',
  'Variante Ascari',
  'Parabolica',
] as const;

type Step = { len: number; turn: number; r: number; label: number };

const S = (len: number, label: number): Step => ({ len, turn: 0, r: 0, label });
/** An arc: `deg` > 0 turns left, < 0 right. */
const A = (deg: number, r: number, label: number): Step => ({
  len: Math.abs(deg * DEG) * r,
  turn: deg * DEG,
  r,
  label,
});

// Clockwise from the Parabolica's exit, heading north up the main straight. The turns add up to
// one full right-hand turn; the two straights marked below are stretched to close the loop.
const MONZA_STEPS: Step[] = [
  S(1050, 0), // main straight (stretched to close)
  A(-75, 20, 1),
  S(12, 1),
  A(75, 22, 1),
  S(90, 2),
  A(-95, 250, 2),
  S(100, 2), // after Curva Grande (stretched to close)
  A(55, 22, 3),
  S(8, 3),
  A(-55, 22, 3),
  S(100, 4),
  A(-50, 95, 4),
  S(140, 5),
  A(-55, 75, 5),
  S(520, 6),
  A(30, 60, 7),
  A(-55, 90, 7),
  A(25, 80, 7),
  S(760, 8),
  A(-60, 95, 8),
  A(-100, 210, 8),
];
const CLOSE_A = 0;
const CLOSE_B = 6;

function walk(steps: Step[]): { x: number; y: number; h: number } {
  let x = 0;
  let y = 0;
  let h = Math.PI / 2;
  for (const st of steps) {
    if (st.turn === 0) {
      x += Math.cos(h) * st.len;
      y += Math.sin(h) * st.len;
    } else {
      // Chord of the arc.
      const half = st.turn / 2;
      const chord = 2 * st.r * Math.sin(Math.abs(half));
      x += Math.cos(h + half) * chord;
      y += Math.sin(h + half) * chord;
      h += st.turn;
    }
  }
  return { x, y, h };
}

function headingBefore(steps: Step[], i: number): number {
  let h = Math.PI / 2;
  for (let k = 0; k < i; k++) h += steps[k].turn;
  return h;
}

/** The steps with the two marked straights stretched so the loop closes exactly. */
export function closedSteps(): Step[] {
  const steps = MONZA_STEPS.map((s) => ({ ...s }));
  const end = walk(steps);
  const ha = headingBefore(steps, CLOSE_A);
  const hb = headingBefore(steps, CLOSE_B);
  // Solve da·ua + db·ub = −end.
  const ax = Math.cos(ha);
  const ay = Math.sin(ha);
  const bx = Math.cos(hb);
  const by = Math.sin(hb);
  const det = ax * by - ay * bx;
  const da = (-end.x * by + end.y * bx) / det;
  const db = (-ax * end.y + ay * end.x) / det;
  steps[CLOSE_A].len += da;
  steps[CLOSE_B].len += db;
  return steps;
}

export interface Track {
  /** Number of samples; sample i sits at s = i·ds. */
  n: number;
  ds: number;
  length: number;
  x: Float32Array;
  y: Float32Array;
  heading: Float32Array;
  /** Signed curvature (1/m), left positive, smoothed over a few samples. */
  curv: Float32Array;
  label: Uint8Array;
  /** Speed at each sample (m/s). */
  speed: Float32Array;
  /** Time from the start line to each sample (s). */
  time: Float64Array;
  lapTime: number;
  vMin: number;
  vMax: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

/** The car: top speed, sideways grip, acceleration and braking (m/s, m/s²). */
export const CAR = { vTop: 92, grip: 32, accel: 11, brake: 36 };

const TRACK_DS = 4;
let monza: Track | null = null;

/** The lap is scaled to exactly this length (two world periods), so the scenery joins up. */
export const LAP_LENGTH = 4096;

/** The Monza trace, built once. */
export function monzaTrack(): Track {
  if (!monza) {
    const steps = closedSteps();
    const k = LAP_LENGTH / steps.reduce((a, st) => a + st.len, 0);
    for (const st of steps) {
      st.len *= k;
      st.r *= k;
    }
    monza = buildTrack(steps, TRACK_DS);
  }
  return monza;
}

export function buildTrack(steps: Step[], dsWanted: number): Track {
  const total = steps.reduce((a, s) => a + s.len, 0);
  const n = Math.max(8, Math.round(total / dsWanted));
  const ds = total / n;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const heading = new Float32Array(n);
  const rawCurv = new Float32Array(n);
  const label = new Uint8Array(n);
  let si = 0;
  let into = 0; // distance into step si
  let px = 0;
  let py = 0;
  let h = Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const st = steps[si];
    x[i] = px;
    y[i] = py;
    heading[i] = h;
    rawCurv[i] = st.turn === 0 ? 0 : Math.sign(st.turn) / st.r;
    label[i] = st.label;
    // Advance ds along the steps (it may cross into the next ones).
    let left = ds;
    while (left > 1e-9 && si < steps.length) {
      const cur = steps[si];
      const room = cur.len - into;
      const d = Math.min(room, left);
      if (cur.turn === 0) {
        px += Math.cos(h) * d;
        py += Math.sin(h) * d;
      } else {
        const k = Math.sign(cur.turn) / cur.r;
        const dh = k * d;
        const half = dh / 2;
        const chord = 2 * cur.r * Math.sin(Math.abs(half));
        px += Math.cos(h + half) * chord;
        py += Math.sin(h + half) * chord;
        h += dh;
      }
      into += d;
      left -= d;
      if (into >= cur.len - 1e-9) {
        si++;
        into = 0;
      }
    }
  }
  // Smooth the curvature over ±6 samples, so speed changes as the steering would.
  const curv = new Float32Array(n);
  const W = 6;
  for (let i = 0; i < n; i++) {
    let a = 0;
    for (let k = -W; k <= W; k++) a += rawCurv[wrap(i + k, n)];
    curv[i] = a / (2 * W + 1);
  }
  const speed = speedProfile(curv, ds);
  const time = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const v = (speed[i] + speed[(i + 1) % n]) / 2;
    time[i + 1] = time[i] + ds / v;
  }
  let vMin = Infinity;
  let vMax = 0;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    vMin = Math.min(vMin, speed[i]);
    vMax = Math.max(vMax, speed[i]);
    x0 = Math.min(x0, x[i]);
    y0 = Math.min(y0, y[i]);
    x1 = Math.max(x1, x[i]);
    y1 = Math.max(y1, y[i]);
  }
  return {
    n,
    ds,
    length: total,
    x,
    y,
    heading,
    curv,
    label,
    speed,
    time,
    lapTime: time[n],
    vMin,
    vMax,
    bounds: { x0, y0, x1, y1 },
  };
}

/**
 * As fast as the curve allows (grip = v²·curvature), limited by how hard the car accelerates out
 * of a corner and brakes into the next. Two passes each way round a closed loop.
 */
export function speedProfile(curv: Float32Array, ds: number): Float32Array {
  const n = curv.length;
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.abs(curv[i]);
    v[i] = k < 1e-6 ? CAR.vTop : Math.min(CAR.vTop, Math.sqrt(CAR.grip / k));
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < n; j++) {
      const i = (j + 1) % n;
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * CAR.accel * ds));
    }
    for (let j = n - 1; j >= 0; j--) {
      const i = wrap(j - 1, n);
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * CAR.brake * ds));
    }
  }
  return v;
}

export interface TrackPoint {
  s: number;
  x: number;
  y: number;
  heading: number;
  speed: number;
  label: number;
}

/** The point at arc length s (wrapped onto the lap), interpolated between samples. */
export function pointAt(track: Track, s: number): TrackPoint {
  const u = wrap(s, track.length) / track.ds;
  const i = Math.floor(u) % track.n;
  const j = (i + 1) % track.n;
  const f = u - Math.floor(u);
  let dh = track.heading[j] - track.heading[i];
  dh = wrap(dh + Math.PI, TAU) - Math.PI;
  return {
    s: wrap(s, track.length),
    x: track.x[i] + (track.x[j] - track.x[i]) * f,
    y: track.y[i] + (track.y[j] - track.y[i]) * f,
    heading: track.heading[i] + dh * f,
    speed: track.speed[i] + (track.speed[j] - track.speed[i]) * f,
    label: track.label[f < 0.5 ? i : j],
  };
}

/** Where the car is `t` seconds into its laps. */
export function lapPosition(track: Track, t: number): TrackPoint {
  const tt = wrap(t, track.lapTime);
  // Binary search the time table.
  let lo = 0;
  let hi = track.n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track.time[mid] <= tt) lo = mid;
    else hi = mid;
  }
  const t0 = track.time[lo];
  const t1 = track.time[lo + 1];
  const f = t1 > t0 ? (tt - t0) / (t1 - t0) : 0;
  return pointAt(track, (lo + f) * track.ds);
}

/** How far into its own named section the point is, and how long that section is (metres). */
export function sectionOf(
  track: Track,
  s: number,
): { label: number; into: number; length: number } {
  const i = Math.floor(wrap(s, track.length) / track.ds) % track.n;
  const lab = track.label[i];
  let a = 0;
  while (a < track.n && track.label[wrap(i - a - 1, track.n)] === lab) a++;
  let b = 0;
  while (b < track.n && track.label[(i + b + 1) % track.n] === lab) b++;
  return { label: lab, into: a * track.ds, length: (a + b + 1) * track.ds };
}

/** Corner name opacity: fades in over the first 40 m of a section and out over its last 60. */
export function labelAlpha(into: number, length: number): number {
  const fadeIn = clamp(into / 40, 0, 1);
  const fadeOut = clamp((length - into) / 60, 0, 1);
  return Math.min(fadeIn, fadeOut);
}

/* ── The road ahead, for the chase cameras ─────────────────── */

export const ROAD_POINTS = 32;

/** Distance ahead of the camera of road sample k (squared spacing: dense near, sparse far). */
export function aheadDistance(k: number): number {
  const u = k / (ROAD_POINTS - 1);
  return -6 + 606 * u * u;
}

export interface RoadAhead {
  /** Lateral offset of the road centre (m, + right) at each sample. */
  x: Float32Array;
  /** Forward distance (m), strictly increasing. */
  z: Float32Array;
  /** Arc length along the road from the camera (m). */
  s: Float32Array;
}

export function emptyRoad(): RoadAhead {
  return {
    x: new Float32Array(ROAD_POINTS),
    z: new Float32Array(ROAD_POINTS),
    s: new Float32Array(ROAD_POINTS),
  };
}

/**
 * Projects a road, given as a function from arc length to a world point, into the camera's frame
 * (camera at (cx, cy) looking along `yaw`). Forward distance must keep growing for the shader's
 * search, so once the road turns back past the side (out of view anyway) it is carried on straight.
 */
export function roadAhead(
  at: (s: number) => { x: number; y: number },
  sCam: number,
  cx: number,
  cy: number,
  yaw: number,
  out: RoadAhead = emptyRoad(),
): RoadAhead {
  const fx = Math.cos(yaw);
  const fy = Math.sin(yaw);
  let lastX = 0;
  let lastZ = -1e9;
  let dirX = 0;
  let dirZ = 1;
  let broken = false;
  for (let k = 0; k < ROAD_POINTS; k++) {
    const d = aheadDistance(k);
    let X: number;
    let Z: number;
    if (!broken) {
      const p = at(sCam + d);
      const dx = p.x - cx;
      const dy = p.y - cy;
      Z = dx * fx + dy * fy;
      // Right of the heading is positive.
      X = dx * fy - dy * fx;
      if (Z <= lastZ + 0.5) broken = true;
    } else {
      X = 0;
      Z = 0;
    }
    if (broken) {
      const step = d - aheadDistance(k - 1);
      X = lastX + dirX * step;
      Z = lastZ + Math.max(0.5, dirZ * step);
    } else if (k > 0) {
      const len = Math.hypot(X - lastX, Z - lastZ) || 1;
      dirX = (X - lastX) / len;
      dirZ = (Z - lastZ) / len;
      // Carry on no more sideways than 60°, so the carried-on road stays in front.
      if (dirZ < 0.5) {
        dirZ = 0.5;
        dirX = Math.sign(dirX) * Math.sqrt(0.75);
      }
    }
    out.x[k] = X;
    out.z[k] = Z;
    out.s[k] = d;
    lastX = X;
    lastZ = Z;
  }
  return out;
}

/** Interpolated road centre at forward distance z (the shader does the same). */
export function roadCentreAt(road: RoadAhead, z: number): number {
  const { x, z: zz } = road;
  if (z <= zz[0]) return x[0];
  for (let k = 1; k < ROAD_POINTS; k++) {
    if (z <= zz[k]) {
      const f = (z - zz[k - 1]) / (zz[k] - zz[k - 1]);
      return x[k - 1] + (x[k] - x[k - 1]) * f;
    }
  }
  return x[ROAD_POINTS - 1];
}

/** The chase camera: this far behind the car, looking at a point this far ahead of it. */
export const CHASE = { behind: 7, lookAhead: 14 };

/** Yaw of a camera at arc length s, looking at the road a little ahead (eases into corners). */
export function chaseYaw(at: (s: number) => { x: number; y: number }, s: number): number {
  const a = at(s);
  const b = at(s + CHASE.behind + CHASE.lookAhead);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/* ── The winding mountain road ─────────────────────────────── */

/** The world period (m) every scene repeats on, so the travelled distance can wrap seamlessly. */
export const PERIOD = 2048;

/**
 * A winding road as a heading that sways with distance: sums of sines whose wavelengths divide
 * PERIOD, so the road joins up after one period (the shader's world wraps on it).
 */
export function windingHeading(s: number): number {
  const w = (TAU * s) / PERIOD;
  return 0.55 * Math.sin(w * 3) + 0.3 * Math.sin(w * 7 + 1.3) + 0.12 * Math.sin(w * 13 + 0.4);
}

/** The winding road traced out, sampled every 4 m round one period (built once). */
let winding: { x: Float32Array; y: Float32Array; n: number; ds: number } | null = null;
function windingTrace() {
  if (!winding) {
    const ds = 4;
    const n = PERIOD / ds;
    const x = new Float32Array(n + 1);
    const y = new Float32Array(n + 1);
    for (let i = 0; i < n; i++) {
      const h = Math.PI / 2 + windingHeading(i * ds + ds / 2);
      x[i + 1] = x[i] + Math.cos(h) * ds;
      y[i + 1] = y[i] + Math.sin(h) * ds;
    }
    winding = { x, y, n, ds };
  }
  return winding;
}

/** A point on the winding road at arc length s (any s; each period continues from the last). */
export function windingAt(s: number): { x: number; y: number } {
  const w = windingTrace();
  const laps = Math.floor(s / PERIOD);
  const u = (s - laps * PERIOD) / w.ds;
  const i = Math.min(w.n - 1, Math.floor(u));
  const f = u - i;
  const ex = w.x[w.n];
  const ey = w.y[w.n];
  return {
    x: w.x[i] + (w.x[i + 1] - w.x[i]) * f + laps * ex,
    y: w.y[i] + (w.y[i + 1] - w.y[i]) * f + laps * ey,
  };
}

/* ── The track field (top view) ────────────────────────────── */

export const FIELD_SIZE = 512;
/** Farthest distance the field keeps (m); beyond it a cell just says "far". */
export const FIELD_REACH = 90;

export interface TrackField {
  size: number;
  /** World metres covered by the square, and its lower-left corner. */
  span: number;
  x0: number;
  y0: number;
  /** Four floats a cell: distance (m), cos and sin of the lap angle, speed 0–1. */
  data: Float32Array;
}

let field: TrackField | null = null;

/** The Monza field, built once. Each segment only touches the cells within reach of it. */
export function monzaField(): TrackField {
  if (!field) field = buildField(monzaTrack(), FIELD_SIZE);
  return field;
}

export function buildField(track: Track, size: number): TrackField {
  const { x0, y0, x1, y1 } = track.bounds;
  const span = Math.max(x1 - x0, y1 - y0) + 2 * FIELD_REACH + 40;
  const ox = (x0 + x1) / 2 - span / 2;
  const oy = (y0 + y1) / 2 - span / 2;
  const cell = span / size;
  const best = new Float32Array(size * size).fill(FIELD_REACH);
  const at = new Float32Array(size * size);
  const reach = Math.ceil(FIELD_REACH / cell) + 1;
  for (let i = 0; i < track.n; i++) {
    const j = (i + 1) % track.n;
    const ax = track.x[i];
    const ay = track.y[i];
    const bx = track.x[j];
    const by = track.y[j];
    const ex = bx - ax;
    const ey = by - ay;
    const ll = ex * ex + ey * ey || 1;
    const ci0 = Math.max(0, Math.floor((Math.min(ax, bx) - ox) / cell) - reach);
    const ci1 = Math.min(size - 1, Math.ceil((Math.max(ax, bx) - ox) / cell) + reach);
    const cj0 = Math.max(0, Math.floor((Math.min(ay, by) - oy) / cell) - reach);
    const cj1 = Math.min(size - 1, Math.ceil((Math.max(ay, by) - oy) / cell) + reach);
    for (let cj = cj0; cj <= cj1; cj++) {
      const py = oy + (cj + 0.5) * cell;
      for (let ci = ci0; ci <= ci1; ci++) {
        const px = ox + (ci + 0.5) * cell;
        const t = clamp(((px - ax) * ex + (py - ay) * ey) / ll, 0, 1);
        const d = Math.hypot(px - ax - ex * t, py - ay - ey * t);
        const idx = cj * size + ci;
        if (d < best[idx]) {
          best[idx] = d;
          at[idx] = (i + t) * track.ds;
        }
      }
    }
  }
  const data = new Float32Array(size * size * 4);
  const range = track.vMax - track.vMin || 1;
  for (let idx = 0; idx < size * size; idx++) {
    const s = at[idx];
    const ang = (TAU * s) / track.length;
    const near = best[idx] < FIELD_REACH;
    const v = near ? pointAt(track, s).speed : track.vMin;
    data[idx * 4] = best[idx];
    data[idx * 4 + 1] = near ? Math.cos(ang) : 0;
    data[idx * 4 + 2] = near ? Math.sin(ang) : 0;
    data[idx * 4 + 3] = (v - track.vMin) / range;
  }
  return { size, span, x0: ox, y0: oy, data };
}

/* ── Feel ──────────────────────────────────────────────────── */

/** Scene speeds (m/s) at Speed 1: a steady cruise for the open-road pieces. */
export const CRUISE = [0, 0, 70, 38, 62, 66, 0, 46, 9, 52, 0];

/**
 * The tunnel's speed by where the car is in the period: accelerating through the tunnel (the
 * first 1500 m), easing off on the open straight after it, back down before the next portal.
 */
export const TUNNEL_LENGTH = 1500;
export function tunnelSpeed(travel: number): number {
  const u = wrap(travel, PERIOD);
  if (u < TUNNEL_LENGTH) return 42 + 50 * smooth(u / TUNNEL_LENGTH);
  return 92 - 50 * smooth((u - TUNNEL_LENGTH) / (PERIOD - TUNNEL_LENGTH));
}

function smooth(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Field of view and shake from speed: the view widens a little as speed builds, and a soft,
 * slow tremor (no faster than a few hertz, so it never strobes) grows with the square of speed.
 */
export function feel(
  speed: number,
  time: number,
): { focal: number; shakeX: number; shakeY: number } {
  const n = clamp(speed / CAR.vTop, 0, 1.3);
  const focal = 1.35 - 0.3 * n;
  const amp = 0.0035 * n * n;
  const shakeX = amp * (Math.sin(time * 7.1) * 0.6 + Math.sin(time * 12.7 + 1.3) * 0.4);
  const shakeY = amp * (Math.sin(time * 9.3 + 0.7) * 0.6 + Math.sin(time * 15.1 + 2.1) * 0.4);
  return { focal, shakeX, shakeY };
}

/* ── Triangle Stream: Chaos Triangles riding the Wind Body's air ── */

/*
 * 2026-11-16: "currents of small triangles streaming over the car, like air flowing over the body
 * at speed … splitting at the nose and curling into the wake, in Chaos Triangles' orange-red".
 * The car is the Wind series' streamlined body (lib/wind.ts, shape 2) seen from the side, nose to
 * the left, driving left; the air runs left to right through the same field the Wind smoke rides.
 * Triangles are released in lanes (rivers), denser at roof height, and carried by the field.
 */

/** The Wind Body, and the ground under its wheels (world units: the view is 2.2 high). */
export const STREAM_SHAPE = windShape(2);
export const STREAM_GROUND = -0.226;
/** Wheel centres and radius, under the body's front and rear. */
export const STREAM_WHEELS: [number, number][] = [
  [-0.86, -0.14],
  [0.12, -0.14],
];
export const STREAM_WHEEL_R = 0.085;
/** Released this far left, recycled this far right (covers screens up to 2.2:1). */
export const STREAM_X = 2.45;

/** Lane heights: the rivers. Closer together round the roofline (y 0.1–0.45), sparser above. */
export const STREAM_LANES: number[] = (() => {
  const out: number[] = [];
  for (let i = 0; i < 18; i++) {
    const u = i / 17;
    out.push(STREAM_GROUND + 0.04 + 1.05 * u ** 1.35);
  }
  return out;
})();

export interface Stream {
  n: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  /** Per triangle: its lane jitter, size and tumble phase, all 0–1. */
  seed: Float32Array;
}

/** A released triangle's height: its lane plus a little jitter. */
function laneY(rand: () => number): number {
  const lane = STREAM_LANES[Math.floor(rand() * STREAM_LANES.length)];
  return lane + (rand() - 0.5) * 0.014;
}

export function makeStream(n: number, rand: () => number = Math.random): Stream {
  const st: Stream = {
    n,
    x: new Float32Array(n),
    y: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    seed: new Float32Array(n * 3),
  };
  for (let i = 0; i < n; i++) {
    let x = 0;
    let y = 0;
    // Spread over the whole view at the start, outside the body.
    do {
      x = (rand() * 2 - 1) * STREAM_X;
      y = laneY(rand);
    } while (STREAM_SHAPE.sdf(x, y) < 0.01);
    st.x[i] = x;
    st.y[i] = y;
    st.vx[i] = 1;
    for (let k = 0; k < 3; k++) st.seed[i * 3 + k] = rand();
  }
  return st;
}

/**
 * Carries every triangle `dt` seconds through the field at air speed `air` (world units a
 * second). Triangles leaving on the right come back in on the left, in a lane; none stays inside
 * the body or below the road.
 */
export function stepStream(
  st: Stream,
  dt: number,
  air: number,
  time: number,
  rand: () => number = Math.random,
): void {
  const h = dt * air;
  for (let i = 0; i < st.n; i++) {
    let x = st.x[i];
    let y = st.y[i];
    // Midpoint step: smooth curves round the nose at any frame rate.
    const [ax, ay] = windVelocity(STREAM_SHAPE, x, y, time, 0.7);
    const [bx, by] = windVelocity(STREAM_SHAPE, x + ax * h * 0.5, y + ay * h * 0.5, time, 0.7);
    x += bx * h;
    y += by * h;
    if (STREAM_SHAPE.sdf(x, y) < 0) {
      const [nx, ny] = normalAt(STREAM_SHAPE, x, y);
      const d = STREAM_SHAPE.sdf(x, y);
      x -= nx * (d - 0.004);
      y -= ny * (d - 0.004);
    }
    if (y < STREAM_GROUND + 0.012) y = STREAM_GROUND + 0.012;
    if (x > STREAM_X || y > 1.4 || y < -1.4) {
      x = -STREAM_X - rand() * 0.2;
      y = laneY(rand);
    }
    st.vx[i] = bx;
    st.vy[i] = by;
    st.x[i] = x;
    st.y[i] = y;
  }
}

/**
 * Chaos Triangles' orange-red by the air's speed (free stream 1): slow air on the nose and in the
 * wake deep red, the free stream Ferrari red-orange, fast air over the roof hot orange-gold.
 * Linear RGB, 0–1.
 */
export function streamColour(speed: number): [number, number, number] {
  const u = clamp((speed - 0.4) / 1.2, 0, 1);
  const stops: [number, number, number][] = [
    [0.32, 0.02, 0.01],
    [0.95, 0.09, 0.02],
    [1.0, 0.34, 0.05],
    [1.0, 0.62, 0.22],
  ];
  const f = u * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  const v = f - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v];
}
