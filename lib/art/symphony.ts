/**
 * The Symphony (docs/specs/symphony-track.md): a track made of mathematics. Pure: no three.js, no
 * DOM. Everything the road, the physics, the autopilot and the views read about it is laid out
 * here, in metres into its lap.
 *
 * - **The road never repeats.** Its heading is a sum of sinusoids whose frequencies stand in
 *   irrational ratios (1, φ, √2, φ²), so it never closes into a pattern yet always feels
 *   rhythmic; its height another such sum (1, √3, φ²). An envelope over the lap shapes it like a
 *   piece of music (a calm opening, a build, the climax, a release) and brings it dead straight
 *   and level at the lap's start for the grid. The waves run on absolute distance, so no two laps
 *   are the same road either. The bank follows the curvature (lib/art/track.ts bankFor), so the
 *   tilt always matches the turn.
 * - **Catenary bridges** on a raised viaduct: cables hanging in a cosh curve, the shape a real
 *   cable takes, hangers at Fibonacci intervals quickening toward the towers, spans of 233, 377
 *   and 610 m (consecutive Fibonacci numbers, so each is φ times the last), towers one φ³-th of
 *   their span tall.
 * - **Golden-angle pillars:** a sunflower of pillars round a hub beside the road, each 137.5°
 *   round from the last, at radius c √n.
 * - **Euclidean fire rows:** burners down both edges firing in Euclidean rhythms (5 in 8, 7 in 12
 *   …), a different one each side, so the rows groove as you pass.
 * - **Ring gates:** three rings inside one another turning about the road at golden-ratio speeds;
 *   their gaps line up only for a moment. Pass while they line up and you get the boost.
 *
 * Net heading is nil at every lap's start and the heading never strays past about 60° off the
 * lap's way, so the road never comes back across itself.
 */

/* ── The constants of the piece ───────────────────────────── */

export const PHI = (1 + Math.sqrt(5)) / 2;
/** The golden angle (rad): 360° / φ², about 137.5°, the angle sunflower seeds grow at. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const SYM = {
  /** The lap (m): the piece comes round, the road never does. */
  LAP: 16_000,
  HALF: 16,
  LIP: 0.45,
  /** The bank's design speed (m/s) and its steepest (rad). */
  BANK_SPEED: 60,
  BANK_MAX: 0.6,
  /** Barriers this far past the edge, a curled wall on a bank's high side (as the Golden Track). */
  BARRIER: 1.5,
  CURL: 14,
};

const TAU = Math.PI * 2;

/** The lap's sections, in order (m into the lap): the piece's movements. */
export const SYM_SECTIONS: readonly { id: string; from: number; to: number; name: string }[] = [
  { id: 'opening', from: 0, to: 1700, name: 'The opening: a calm line, the first sunflower' },
  { id: 'bridges', from: 1700, to: 4600, name: 'The bridges: a viaduct and three catenaries' },
  { id: 'gates', from: 4600, to: 6400, name: 'The ring gates: circles in circles' },
  { id: 'fire', from: 6400, to: 7800, name: 'The fire rows: Euclidean rhythms' },
  { id: 'knot', from: 7800, to: 9800, name: 'The build (the torus knot to come)' },
  { id: 'spiral', from: 9800, to: 11000, name: 'The rise (the golden spiral to come)' },
  { id: 'gyroid', from: 11000, to: 13000, name: 'The climax (the gyroid tunnel to come)' },
  { id: 'hopf', from: 13000, to: 14300, name: 'The linked rings (to come)' },
  { id: 'release', from: 14300, to: 16000, name: 'The release: the second sunflower, home' },
];

/** Where s falls in the lap (m into it). */
export function lapOf(s: number): number {
  return ((s % SYM.LAP) + SYM.LAP) % SYM.LAP;
}

/** The section s is in. */
export function symSection(s: number) {
  const p = lapOf(s);
  return SYM_SECTIONS.find((c) => p >= c.from && p < c.to) ?? SYM_SECTIONS[0];
}

/** Every place of a lap list between s0 and s1, lap by lap (absolute s, its index, the item). */
export function eachSym<T extends number | { at: number }>(
  list: readonly T[],
  s0: number,
  s1: number,
): { s: number; i: number; item: T }[] {
  const out: { s: number; i: number; item: T }[] = [];
  if (!(s1 > s0)) return out;
  const at = (it: T) => (typeof it === 'number' ? it : it.at);
  for (let n = Math.floor(s0 / SYM.LAP); n * SYM.LAP < s1; n++)
    list.forEach((item, i) => {
      const s = n * SYM.LAP + at(item);
      if (s >= s0 && s < s1 && s >= 0) out.push({ s, i, item });
    });
  return out.sort((a, b) => a.s - b.s);
}

/* ── Easing ────────────────────────────────────────────────── */

/** Smootherstep and its slope: slope and curve both ease to nothing at its ends. */
const s5 = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
const ds5 = (x: number) => 30 * x * x * (x - 1) * (x - 1);
const dds5 = (x: number) => 60 * x * (x - 1) * (2 * x - 1);

/** A value eased (smootherstep) between keys [p, value], its slope and its curve (per m). */
export function keyed(
  keys: readonly (readonly [number, number])[],
  p: number,
): [number, number, number] {
  if (p <= keys[0][0]) return [keys[0][1], 0, 0];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i];
    if (p > p1) continue;
    const [p0, v0] = keys[i - 1];
    const L = p1 - p0;
    const x = (p - p0) / L;
    const d = v1 - v0;
    return [v0 + d * s5(x), (d * ds5(x)) / L, (d * dds5(x)) / (L * L)];
  }
  return [keys[keys.length - 1][1], 0, 0];
}

/* ── The road ──────────────────────────────────────────────── */

/** A wave: amp × sin(ω s + phase), ω = 2π ratio / base. */
export interface SymWave {
  amp: number;
  /** Its frequency over the base's: irrational to every other. */
  ratio: number;
  phase: number;
}

/** The heading's base period (m) and its waves (rad): frequencies 1, φ, √2, φ². */
export const HEAD_BASE = 1700;
export const HEAD_WAVES: readonly SymWave[] = [
  { amp: 0.42, ratio: 1, phase: 0 },
  { amp: 0.24, ratio: PHI, phase: 1.3 },
  { amp: 0.2, ratio: Math.SQRT2, phase: 2.6 },
  { amp: 0.08, ratio: PHI * PHI, phase: 4.1 },
];

/** The height's base period (m) and its waves (m): frequencies 1, √3, φ². */
export const RISE_BASE = 1900;
export const RISE_WAVES: readonly SymWave[] = [
  { amp: 6, ratio: 1, phase: 0.7 },
  { amp: 3.5, ratio: Math.sqrt(3), phase: 2.2 },
  { amp: 1.8, ratio: PHI * PHI, phase: 5 },
];

/** How much of the heading's waves the road carries along the lap: none at the start (the grid
 * runs straight), a calm opening, more through the build and the climax, eased off home. */
export const HEAD_SHAPE: readonly (readonly [number, number])[] = [
  [140, 0],
  [900, 0.45],
  [1700, 0.5],
  // Long arcs over the bridges, so each reads as one sweep.
  [2300, 0.4],
  [4000, 0.4],
  [4800, 0.75],
  [6400, 0.85],
  [7800, 1],
  [13000, 1],
  [14300, 0.7],
  [15200, 0.45],
  [SYM.LAP - 220, 0],
];

/** How much of the height's waves it carries (level at the start). */
export const RISE_SHAPE: readonly (readonly [number, number])[] = [
  [140, 0],
  [1000, 0.5],
  [1700, 0.4],
  [4600, 0.4],
  [6400, 0.8],
  [7800, 1],
  [13000, 1],
  [15000, 0.5],
  [SYM.LAP - 220, 0],
];

/** The viaduct the bridges stand on: up from `from` to `up`, H m over the plain, down from `down`
 * to `to` (smootherstep ramps, under 9 % at their steepest). */
export const VIADUCT = { from: 1700, up: 2300, down: 4000, to: 4600, H: 26 };
/** Higher than this over the plain and the road is a bridge: no ground beside it. */
export const BRIDGE_CLEAR = 8;

const omega = (base: number, w: SymWave) => (TAU * w.ratio) / base;

/** The heading's waves at s, and their slope. */
function headWaves(s: number): [number, number] {
  let h = 0;
  let dh = 0;
  for (const w of HEAD_WAVES) {
    const o = omega(HEAD_BASE, w);
    h += w.amp * Math.sin(o * s + w.phase);
    dh += w.amp * o * Math.cos(o * s + w.phase);
  }
  return [h, dh];
}

/** The heading off the lap's way at s (rad): the envelope times the waves. */
export function symHeading(s: number): number {
  const [E] = keyed(HEAD_SHAPE, lapOf(s));
  return E * headWaves(s)[0];
}

/** The curvature (1/m): the heading's slope. */
export function symCurv(s: number): number {
  const [E, dE] = keyed(HEAD_SHAPE, lapOf(s));
  const [h, dh] = headWaves(s);
  return dE * h + E * dh;
}

/** The viaduct's height at s (m). */
export function viaduct(s: number): number {
  const p = lapOf(s);
  const { from, up, down, to, H } = VIADUCT;
  if (p <= from || p >= to) return 0;
  if (p < up) return H * s5((p - from) / (up - from));
  if (p <= down) return H;
  return H * (1 - s5((p - down) / (to - down)));
}

/** The road's height (m). */
export function symElev(s: number): number {
  const [E] = keyed(RISE_SHAPE, lapOf(s));
  let e = 0;
  for (const w of RISE_WAVES) e += w.amp * Math.sin(omega(RISE_BASE, w) * s + w.phase);
  return E * e + viaduct(s);
}

/** Where the road runs as a bridge, high over the plain. */
export function symBridge(s: number): boolean {
  return viaduct(s) > BRIDGE_CLEAR;
}

/* ── Fibonacci, the catenary and the bridges ───────────────── */

/** The n-th Fibonacci number (F1 = F2 = 1). */
export function fib(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

/**
 * A suspension bridge on the viaduct: its first tower at `at` (m into the lap), `span` m to the
 * second. Spans are consecutive Fibonacci numbers (each φ times the last, near enough), spaced by
 * smaller ones.
 */
export interface SymBridge {
  at: number;
  span: number;
}
export const SYM_BRIDGES: readonly SymBridge[] = [
  { at: 2380, span: 233 },
  { at: 2380 + 233 + 89, span: 377 },
  { at: 2380 + 233 + 89 + 377 + 144, span: 610 },
];

/** A tower's height over the deck: its span over φ³ (so tower : half span = 2 : φ³ … golden). */
export function towerHeight(span: number): number {
  return span / PHI ** 3;
}
/** How high over the deck the cables come down to at midspan (m). */
export const CABLE_LOW = 3;

/**
 * The catenary's parameter a for a cable over `span` m that sags `sag` m from its ends to its
 * lowest point: a (cosh(span / 2a) − 1) = sag, found by bisection (the sag falls as a grows).
 */
export function catenaryA(span: number, sag: number): number {
  let lo = 1e-3;
  let hi = 1e7;
  const f = (a: number) => a * (Math.cosh(span / (2 * a)) - 1) - sag;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/** A cable's height over the deck at x m from the first tower: CABLE_LOW at midspan, the tower's
 * top at each end, a cosh curve between. */
export function cableHeight(
  span: number,
  x: number,
  a = catenaryA(span, towerHeight(span) - CABLE_LOW),
): number {
  return CABLE_LOW + a * (Math.cosh((x - span / 2) / a) - 1);
}

/**
 * Where the hangers hang (m from the first tower): from each tower toward the middle at Fibonacci
 * intervals 1, 1, 2, 3, 5, 8 … units, so the rhythm quickens toward the towers; the unit is chosen
 * so the last interval ends at midspan. At most `n` intervals a half.
 */
export function hangers(span: number, n = 9): number[] {
  // Fewer intervals on a short span, so the first is still a few metres.
  let k = n;
  while (k > 3 && span / 2 / (fib(k + 2) - 1) < 2.5) k--;
  const unit = span / 2 / (fib(k + 2) - 1);
  const half: number[] = [];
  for (let i = 1; i <= k; i++) half.push(unit * (fib(i + 2) - 1));
  const mirror = half.slice(0, -1).map((x) => span - x);
  return [...half, ...mirror.reverse()];
}

/* ── The golden angle ──────────────────────────────────────── */

/** The n-th seed of a sunflower (Vogel's model): radius c √n, angle n × the golden angle. */
export function phyllotaxis(n: number, c: number): { r: number; a: number; x: number; y: number } {
  const r = c * Math.sqrt(n);
  const a = n * GOLDEN_ANGLE;
  return { r, a, x: r * Math.cos(a), y: r * Math.sin(a) };
}

/** A sunflower of pillars: its hub `out` m from the road's middle (positive left) at `at` (m into
 * the lap), `n` pillars, `c` m the spacing scale; the tallest `h` m, at the hub. */
export interface SymHub {
  at: number;
  out: number;
  n: number;
  c: number;
  h: number;
}
export const SYM_HUBS: readonly SymHub[] = [
  { at: 900, out: -150, n: 233, c: 7, h: 55 },
  { at: 5300, out: 170, n: 144, c: 8, h: 70 },
  { at: 15100, out: 160, n: 233, c: 7, h: 55 },
];

/** A pillar's height: tallest at the hub, falling away as the seeds spread (m). */
export function pillarHeight(hub: SymHub, n: number): number {
  const r = Math.sqrt(n / hub.n);
  return hub.h * (0.25 + 0.75 * (1 - r) ** 1.5);
}

/** Where the irrational waves run beside the road (m into the lap): the opening and the release. */
export const SYM_WAVES: readonly { at: number; to: number }[] = [
  { at: 200, to: 1700 },
  { at: 14300, to: 15800 },
];

/** A wave line's height over the road at s (m): a sum of sinusoids in ratios 1, φ, √2, so it never
 * repeats; side 1 or -1 has its own phases. */
export function waveLine(s: number, side: 1 | -1): number {
  const o = (TAU * s) / 260;
  const p = side === 1 ? 0 : 2.1;
  return (
    5 +
    1.6 * Math.sin(o + p) +
    1.1 * Math.sin(PHI * o + 2 * p) +
    0.7 * Math.sin(Math.SQRT2 * o + 3 * p)
  );
}

/** The epicycloids beside the road (m into the lap; side 1 left, -1 right): wheels on wheels, in
 * the build. */
export const SYM_EPICYCLES: readonly { at: number; side: 1 | -1 }[] = [
  { at: 8200, side: 1 },
  { at: 8900, side: -1 },
  { at: 9500, side: 1 },
];
/** An epicycloid: a circle of radius R/k rolling round one of radius R; k cusps (petals). */
export const EPICYCLE = { R: 26, K: 5, OUT: 24 };

/** The epicycloid's point at θ (m, in its plane, from its middle). */
export function epicycloid(theta: number, R = EPICYCLE.R, k = EPICYCLE.K): [number, number] {
  const r = R / k;
  return [
    (R + r) * Math.cos(theta) - r * Math.cos(((R + r) / r) * theta),
    (R + r) * Math.sin(theta) - r * Math.sin(((R + r) / r) * theta),
  ];
}

/* ── Euclidean rhythms ─────────────────────────────────────── */

/**
 * The Euclidean rhythm E(k, n): k onsets spread as evenly as they can be over n steps (Bjorklund's
 * algorithm, as Toussaint found it in the world's music: E(3, 8) is the tresillo, E(5, 8) the
 * cinquillo). Starts on an onset.
 */
export function euclid(k: number, n: number): boolean[] {
  if (n <= 0) return [];
  const kk = Math.max(0, Math.min(k, n));
  // Bresenham's form: step i is an onset when i k mod n falls under k (so step 0 always is).
  return Array.from({ length: n }, (_, i) => (i * kk) % n < kk);
}

/** A row of burners: `step` m apart down both edges from `from` to `to`, the left firing E(left),
 * the right E(right). */
export interface SymFireRow {
  at: number;
  to: number;
  step: number;
  left: readonly [number, number];
  right: readonly [number, number];
}
export const SYM_FIRE_ROWS: readonly SymFireRow[] = [
  { at: 6550, to: 6810, step: 6, left: [5, 8], right: [3, 8] },
  { at: 6990, to: 7270, step: 5, left: [7, 12], right: [5, 12] },
  { at: 7420, to: 7720, step: 5, left: [5, 13], right: [8, 13] },
];

/** Whether the burner at s on a side (1 left, -1 right) is in its row's rhythm, or null if there is
 * no burner there. */
export function burnerAt(s: number, side: 1 | -1): boolean | null {
  const p = lapOf(s);
  for (const r of SYM_FIRE_ROWS) {
    if (p < r.at - 1e-6 || p > r.to + 1e-6) continue;
    const i = Math.round((p - r.at) / r.step);
    if (Math.abs(p - r.at - i * r.step) > 1e-3) return null;
    const [k, n] = side === 1 ? r.left : r.right;
    return euclid(k, n)[i % n];
  }
  return null;
}

/* ── Ring gates ────────────────────────────────────────────── */

/**
 * A ring gate: three rings inside one another, radius R/φ^k, all round one centre CENTRE m over
 * the road's crown (the inner ring's foot on the road), each turning about the road at ω φ^k (the
 * middle one the other way), each with a gap GAP rad wide. Their gaps line up only for a moment.
 */
export const GATE = {
  R: 30,
  RINGS: 3,
  GAP: 2,
  /** The slowest ring's speed (rad/s). */
  W: 0.7,
  /** How close the gaps' middles must be for the way through to be open (rad): within it the
   * three gaps still share an opening of GAP − OPEN, about 43°. Open about an eighth of the time,
   * for three quarters of a second, about every five seconds, never more than about six apart. */
  OPEN: 1.25,
};
/** Where the gates stand (m into the lap): 233 m apart. */
export const SYM_GATES: readonly number[] = [4800, 5033, 5266, 5499, 5732, 5965];

export function ringRadius(k: number): number {
  return GATE.R / PHI ** k;
}
/** The rings' middle over the road's crown (m): the inner ring's foot on the road. */
export const GATE_CENTRE = GATE.R / PHI ** (GATE.RINGS - 1);

const wrap = (a: number) => {
  const x = (((a + Math.PI) % TAU) + TAU) % TAU;
  return x - Math.PI;
};

/** Where each ring's gap points at time t (rad, counter-clockwise from the left, looking up the
 * road) for gate i. */
export function gateAngles(i: number, t: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < GATE.RINGS; k++) {
    const dir = k % 2 ? -1 : 1;
    // Each gate starts its rings at its own golden turn, so no two gates open together.
    const start = (i + 1) * (k + 1) * GOLDEN_ANGLE;
    out.push(wrap(start + dir * GATE.W * PHI ** k * t));
  }
  return out;
}

/** How far apart the gaps are (rad): the widest angle between any two, the short way. */
export function gateSpread(i: number, t: number): number {
  const a = gateAngles(i, t);
  let most = 0;
  for (let x = 0; x < a.length; x++)
    for (let y = x + 1; y < a.length; y++) most = Math.max(most, Math.abs(wrap(a[x] - a[y])));
  return most;
}

/** Whether gate i's way through is open at t: every gap lined up with every other. */
export function gateOpen(i: number, t: number): boolean {
  return gateSpread(i, t) < GATE.OPEN;
}

/** How open it looks, 0 to 1: rising as the gaps close in on one another, 1 once open. */
export function gateGlow(i: number, t: number): number {
  const d = gateSpread(i, t);
  return Math.max(0, Math.min(1, (2 * GATE.OPEN - d) / GATE.OPEN));
}

/** The gate you crossed going from s0 to s1 this step (its index into SYM_GATES, its lap number
 * folded in), or null. */
export function gateCrossed(s0: number, s1: number): { i: number; s: number } | null {
  if (!(s1 > s0) || s1 - s0 > 60) return null;
  for (const g of eachSym(SYM_GATES, s0, s1)) if (g.s > s0 && g.s <= s1) return { i: g.i, s: g.s };
  return null;
}

/** Whether a pass through a gate gets the boost: it was open as you went through, and you went
 * through the rings (within the inner ring across the road). */
export function gateBoost(i: number, t: number, u: number): boolean {
  return gateOpen(i, t) && Math.abs(u) < ringRadius(GATE.RINGS - 1) + 4;
}

/** Nothing else stands within this of a gate (m along the road). */
export const GATE_CLEAR = 40;
/** Whether s is near a gate (other pieces keep off). */
export function nearGate(s: number): boolean {
  const p = lapOf(s);
  return SYM_GATES.some((g) => Math.abs(p - g) < GATE_CLEAR);
}

/* ── Space ripples ─────────────────────────────────────────── */

/**
 * Ripples in space itself, like gravitational waves (2026-11-24: "ripples like space ripples"):
 * rings spreading out from a point at SPEED m/s, a wave packet WIDTH m deep of wavelength WAVE m,
 * fading over LIFE s. As one passes, the road, the sky and the light bend gently with it: the deck
 * and what rides it swell by up to AMP m, the camera's view swells and settles. Only ever drawn:
 * the physics never feels them, so they never throw the car.
 */
export const RIPPLE = {
  SPEED: 150,
  WAVE: 80,
  WIDTH: 70,
  LIFE: 7,
  AMP: 0.7,
  /** Through a gate: a ripple from it, stronger if you got the boost. */
  GATE: 0.6,
  BOOST: 1,
  /** On their own: one about every PERIOD s (± JITTER), FAR m away, somewhere ahead. */
  PERIOD: 11,
  JITTER: 6,
  FAR: 900,
  /** At most this many at once (the shader's slots). */
  MAX: 4,
};

export interface Ripple {
  x: number;
  y: number;
  /** When it was born (s) and how strong it is (1 the usual). */
  t0: number;
  amp: number;
}

/** How far a ripple lifts the point (x, y) at time t (m). */
export function rippleAt(r: Ripple, x: number, y: number, t: number): number {
  const age = t - r.t0;
  if (age <= 0 || age >= RIPPLE.LIFE) return 0;
  const z = Math.hypot(x - r.x, y - r.y) - RIPPLE.SPEED * age;
  const pack = Math.exp(-((z / RIPPLE.WIDTH) ** 2));
  if (pack < 1e-4) return 0;
  // Born softly, dying away; wider spread, weaker (as 1/√d, gently).
  const life = Math.min(1, age / 0.4) * (1 - age / RIPPLE.LIFE) ** 2;
  return RIPPLE.AMP * r.amp * life * pack * Math.sin((TAU * z) / RIPPLE.WAVE);
}

/** All the ripples' lift at (x, y) at t (m). */
export function swell(rs: readonly Ripple[], x: number, y: number, t: number): number {
  let h = 0;
  for (const r of rs) h += rippleAt(r, x, y, t);
  return h;
}

function hash(n: number, k: number): number {
  const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** When the k-th ripple on its own is born (s): about every PERIOD, never two at once. */
export function ambientAt(k: number): number {
  return k * RIPPLE.PERIOD + (hash(k, 3) - 0.5) * RIPPLE.JITTER;
}

/** The k-th ripple on its own, born round a driver at (x, y) heading h: FAR m off, ahead of them
 * within 70° either side, so its rings come toward them. */
export function ambientRipple(k: number, x: number, y: number, h: number): Ripple {
  const a = h + (hash(k, 7) - 0.5) * 2 * ((70 * Math.PI) / 180);
  const far = RIPPLE.FAR * (0.7 + 0.6 * hash(k, 11));
  return {
    x: x + Math.cos(a) * far,
    y: y + Math.sin(a) * far,
    t0: ambientAt(k),
    amp: 0.7 + 0.5 * hash(k, 13),
  };
}

/** The living ripples, the newest kept when there are too many. */
export function liveRipples(rs: readonly Ripple[], t: number): Ripple[] {
  return rs.filter((r) => t - r.t0 < RIPPLE.LIFE && t >= r.t0).slice(-RIPPLE.MAX);
}

/* ── Rainbows ──────────────────────────────────────────────── */

/**
 * Sudden rainbows (2026-11-24: "and sudden rainbows"): after a stretch of rain, with the sun behind
 * you, a bow stands at its real angle, 42° from the point opposite the sun (red outside, violet
 * inside at 40°), sliding as you turn; now and then a fainter second bow at 50 to 53° with its
 * colours reversed. Rare: rain falls on two laps in five, on one of its two stretches, and the
 * second bow stands on a third of those.
 */
export const RAIN_STRETCHES: readonly { at: number; to: number }[] = [
  { at: 7900, to: 9100 },
  { at: 12900, to: 14000 },
];
export const RAINBOW = {
  /** The primary's red and violet edges and the secondary's (degrees from the antisolar point). */
  RED: 42,
  VIOLET: 40.6,
  RED2: 50.4,
  VIOLET2: 53.2,
  /** Rain eases in and out over this (m); the bow stands this long after it (m). */
  EASE: 150,
  STAYS: 1100,
  /** How many laps in five it rains on. */
  LAPS: 2,
  SECOND: 1 / 3,
};

/** On lap n, which stretch it rains on (an index into RAIN_STRETCHES), or null on a dry lap. */
export function rainyStretch(n: number): number | null {
  if (hash(n, 21) * 5 >= RAINBOW.LAPS) return null;
  return hash(n, 23) < 0.5 ? 0 : 1;
}

/** How hard it rains at s (0 to 1). */
export function rainAt(s: number): number {
  const n = Math.floor(s / SYM.LAP);
  const k = rainyStretch(n);
  if (k === null || s < 0) return 0;
  const { at, to } = RAIN_STRETCHES[k];
  const p = lapOf(s);
  const e = RAINBOW.EASE;
  if (p <= at || p >= to) return 0;
  return s5(Math.min(1, (p - at) / e, (to - p) / e));
}

/** How strong the bow is at s (0 to 1): rising as the rain stops, held, fading after STAYS m; and
 * whether its second bow stands. */
export function rainbowAt(s: number): { k: number; second: boolean } {
  const n = Math.floor(s / SYM.LAP);
  const r = rainyStretch(n);
  if (r === null || s < 0) return { k: 0, second: false };
  const { to } = RAIN_STRETCHES[r];
  const x = lapOf(s) - (to - RAINBOW.EASE);
  if (x <= 0 || x >= RAINBOW.STAYS) return { k: 0, second: false };
  const k = s5(Math.min(1, x / 250, (RAINBOW.STAYS - x) / 300));
  return { k, second: hash(n, 29) < RAINBOW.SECOND };
}

/** The colour at an angle from the antisolar point (degrees), linear RGB times its share of the
 * bow's light; zero outside the bows. The primary runs violet (inside) to red (outside), the
 * secondary the other way and fainter. */
export function bowColour(deg: number, second: boolean): [number, number, number] {
  const band = (a: number, b: number) => (deg - a) / (b - a);
  let x = band(RAINBOW.VIOLET, RAINBOW.RED);
  let w = 1;
  if (x < 0 || x > 1) {
    if (!second) return [0, 0, 0];
    // Reversed: red inside at 50.4°, violet outside at 53.2°.
    x = 1 - band(RAINBOW.RED2, RAINBOW.VIOLET2);
    if (x < 0 || x > 1) return [0, 0, 0];
    w = 0.42;
  }
  // x: 0 violet … 1 red, a soft spectrum, the edges fading.
  const hueRgb = (h: number): [number, number, number] => {
    const c = (o: number) => Math.max(0, Math.min(1, Math.abs(((h * 6 + o) % 6) - 3) - 1));
    return [c(0), c(4), c(2)];
  };
  // Red (hue 0) at x = 1, violet (hue 0.78) at x = 0.
  const rgb = hueRgb((1 - x) * 0.78);
  const edge = Math.sin(Math.PI * x) ** 0.6;
  return [rgb[0] * edge * w, rgb[1] * edge * w, rgb[2] * edge * w];
}
