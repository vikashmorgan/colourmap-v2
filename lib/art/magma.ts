/*
 * Magma Cores: five ways of drawing a glowing core of magma, for the Art builder's Experiment tab.
 * Spec: docs/specs/geometry-field.md, "Magma Cores" (2026-11-16).
 *
 * The pure math, kept free of three.js so it can be tested: the colour ramp, the per-dot data for
 * the particle methods, the bubbles of the boiling core, the convection field whose streamlines
 * draw the Magma Currents, and the loops and vents of the Eruptive Core. The drawing is in
 * components/geometry-magma.ts and lib/art/magma-shaders.ts.
 *
 * Units: the core has radius 1. Time is in seconds of the core's own clock (the Speed slider
 * scales it), so nothing moves when the builder is set to static.
 */

export type Vec3 = [number, number, number];

export const METHODS = [
  { name: 'Boiling Magma', tag: 'DOTS' },
  { name: 'Molten Core', tag: 'SHADER' },
  { name: 'Cracked Crust', tag: 'CRUST' },
  { name: 'Magma Currents', tag: 'FLOW' },
  { name: 'Eruptive Core', tag: 'ERUPT' },
] as const;

export const BOIL = 0;
export const MOLTEN = 1;
export const CRUST = 2;
export const CURRENTS = 3;
export const ERUPTIVE = 4;

/** The core's radius as a share of the builder's radius R, leaving room for the glow and plumes. */
export const CORE = 0.6;

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** The piece the Method slider (the builder's `particles`) points at. */
export function methodOf(particles: number): number {
  return clamp(Math.round(Number.isFinite(particles) ? particles : 0), 0, METHODS.length - 1);
}

/* ── Colour ────────────────────────────────────────────────── */

/**
 * The magma ramp in sRGB, from cold to hot: near-black, deep red, red, orange, amber, yellow and a
 * pale yellow for the hottest centre. The shaders are generated from the same stops.
 */
export const MAGMA_STOPS: readonly { at: number; rgb: Vec3 }[] = [
  { at: 0, rgb: [0.02, 0.006, 0.004] },
  { at: 0.18, rgb: [0.22, 0.025, 0.01] },
  { at: 0.38, rgb: [0.63, 0.1, 0.016] },
  { at: 0.58, rgb: [0.91, 0.32, 0.04] },
  { at: 0.78, rgb: [1, 0.63, 0.1] },
  { at: 0.92, rgb: [1, 0.85, 0.29] },
  { at: 1, rgb: [1, 0.95, 0.69] },
];

/** The ramp at heat t in [0, 1], in sRGB. */
export function magmaColour(t: number): Vec3 {
  const x = clamp(t, 0, 1);
  for (let i = 1; i < MAGMA_STOPS.length; i++) {
    const a = MAGMA_STOPS[i - 1];
    const b = MAGMA_STOPS[i];
    if (x <= b.at) {
      const k = (x - a.at) / (b.at - a.at);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k,
      ];
    }
  }
  return [...MAGMA_STOPS[MAGMA_STOPS.length - 1].rgb];
}

/**
 * The Heat slider (0..1, 0.7 by default) leans every heat toward hot or cold before it meets the
 * ramp. At the default it changes almost nothing.
 */
export function heatShift(t: number, heat: number): number {
  const h = clamp(heat, 0, 1.5);
  return clamp(t * (0.75 + 0.45 * h) - 0.1 + 0.15 * h, 0, 1);
}

/* ── Seeded randomness ─────────────────────────────────────── */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A repeatable number in [0, 1) for a pair of integers. */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x165667b1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** A uniform direction from two numbers in [0, 1). */
export function sphereDir(u: number, v: number): Vec3 {
  const z = 1 - 2 * u;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const a = 2 * Math.PI * v;
  return [r * Math.cos(a), r * Math.sin(a), z];
}

/** n directions spread evenly over the sphere (a Fibonacci lattice). */
export function fibonacciDirs(n: number): Vec3[] {
  const out: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - z * z);
    out.push([r * Math.cos(i * golden), r * Math.sin(i * golden), z]);
  }
  return out;
}

/** Any unit vector at right angles to d, turned by angle a about it. */
export function tangentOf(d: Vec3, a: number): Vec3 {
  const ref: Vec3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const t1 = normalize(cross(d, ref));
  const t2 = cross(d, t1);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [t1[0] * c + t2[0] * s, t1[1] * c + t2[1] * s, t1[2] * c + t2[2] * s];
}

/** Turns v about the unit axis k by angle a (Rodrigues). */
export function rotate(v: Vec3, k: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = (k[0] * v[0] + k[1] * v[1] + k[2] * v[2]) * (1 - c);
  const x = cross(k, v);
  return [
    v[0] * c + x[0] * s + k[0] * d,
    v[1] * c + x[1] * s + k[1] * d,
    v[2] * c + x[2] * s + k[2] * d,
  ];
}

/* ── The core's clock and its slow turn ────────────────────── */

export interface Clock {
  last: number | null;
  time: number;
}

/** Advances the clock by the frame's time at the Speed slider's rate; big gaps count as one frame. */
export function tick(clock: Clock, t: number, speed: number): number {
  const dt = clock.last === null ? 0 : clamp((t - clock.last) / 1000, 0, 0.1);
  clock.last = t;
  const step = dt * Math.max(0, speed);
  clock.time += step;
  return step;
}

/** The axis the core turns about: tilted, so the poles never sit dead centre. */
export const SPIN_AXIS: Vec3 = normalize([0.28, 1, 0.12]);
/** Radians a second: one turn in about two minutes. */
export const SPIN_RATE = 0.05;

/* ── 1. Boiling Magma: the dots ────────────────────────────── */

/** Convection cells over the sphere, and how far each reaches (radians). */
export const CELLS = 22;
export const CELL_REACH = 0.5;
/** Bubbles swelling at the surface at any time; the shader has room for this many. */
export const BUBBLES = 8;

/** How many dots the Detail slider asks for: 6,000 up to 26,000. */
export function boilCount(complexity: number): number {
  return Math.round(6000 + 20000 * clamp((complexity - 1) / 9, 0, 1));
}

export const DOT_CONVECT = 0;
export const DOT_CORE = 1;
export const DOT_SPRAY = 2;

export interface BoilDots {
  n: number;
  /** Convection: the cell's centre; core: a point in the inner ball; spray: unused. */
  position: Float32Array;
  /** Convection: the way the dot spreads from its cell centre; core: its turning axis; spray: a direction to fly off along. */
  tangent: Float32Array;
  /** Phase, rate, reach (or bubble for spray), size: each in [0, 1). */
  seed: Float32Array;
  kind: Float32Array;
}

/** The dots of the boiling core: 70% churning in cells, 20% in the hot inner ball, 10% spray. */
export function makeBoilDots(n: number, seed = 7): BoilDots {
  const r = rng(seed);
  const cells = fibonacciDirs(CELLS).map((d, i) =>
    normalize([
      d[0] + (hash2(i, 1) - 0.5) * 0.2,
      d[1] + (hash2(i, 2) - 0.5) * 0.2,
      d[2] + (hash2(i, 3) - 0.5) * 0.2,
    ]),
  );
  const out: BoilDots = {
    n,
    position: new Float32Array(n * 3),
    tangent: new Float32Array(n * 3),
    seed: new Float32Array(n * 4),
    kind: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const roll = r();
    const kind = roll < 0.7 ? DOT_CONVECT : roll < 0.9 ? DOT_CORE : DOT_SPRAY;
    let p: Vec3 = [0, 0, 0];
    let t: Vec3;
    if (kind === DOT_CONVECT) {
      p = cells[Math.floor(r() * CELLS) % CELLS];
      t = tangentOf(p, r() * Math.PI * 2);
    } else if (kind === DOT_CORE) {
      // Uniform in a ball of radius 0.6.
      const d = sphereDir(r(), r());
      const rad = 0.6 * Math.cbrt(r());
      p = [d[0] * rad, d[1] * rad, d[2] * rad];
      t = sphereDir(r(), r());
    } else {
      t = sphereDir(r(), r());
    }
    out.position.set(p, i * 3);
    out.tangent.set(t, i * 3);
    // Spray dots keep their bubble in the third seed, as an index over BUBBLES.
    const third = kind === DOT_SPRAY ? (Math.floor(r() * BUBBLES) + 0.5) / BUBBLES : r();
    out.seed.set([r(), r(), third, r()], i * 4);
    out.kind[i] = kind;
  }
  return out;
}

export interface Bubble {
  dir: Vec3;
  /** 0..1 through the bubble's life: swells to 0.75, bursts, its spray flies to 1. */
  phase: number;
  /** Angular size (radians). */
  size: number;
}

/** Where a bubble swells and where it is in its life. It moves only when its spray has landed. */
export function bubbleAt(k: number, time: number): Bubble {
  const period = 7 + 4 * hash2(k, 11);
  const p = time / period + hash2(k, 12);
  const cycle = Math.floor(p);
  return {
    dir: sphereDir(hash2(k * 131 + cycle, 13), hash2(k * 131 + cycle, 14)),
    phase: p - cycle,
    size: 0.13 + 0.09 * hash2(k * 131 + cycle, 15),
  };
}

/** How swollen a bubble is at a phase: grows slowly, then collapses quickly once it bursts. */
export function swellOf(phase: number): number {
  const grow = smooth(0, 0.75, phase);
  return phase < 0.75 ? grow : 1 - smooth(0.75, 0.86, phase);
}

function smooth(a: number, b: number, x: number): number {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}

/* ── 4. Magma Currents: the convection field ───────────────── */

/** Vortices in the stream function; their streamlines close on themselves like convection cells. */
export const FIELD_TERMS = 7;
const FIELD_K = 2.6;
const FIELD_AXES = fibonacciDirs(FIELD_TERMS);
const FIELD_SPIN = FIELD_AXES.map((_, i) => sphereDir(hash2(i, 21), hash2(i, 22)));

export interface Field {
  axes: Vec3[];
  strength: number[];
}

/** The field at a time: each vortex drifts slowly over the sphere. Shells get their own time. */
export function fieldAt(time: number, out?: Field): Field {
  const f = out ?? { axes: FIELD_AXES.map(() => [0, 0, 0] as Vec3), strength: [] };
  for (let i = 0; i < FIELD_TERMS; i++) {
    const a = rotate(FIELD_AXES[i], FIELD_SPIN[i], time * (0.02 + 0.03 * hash2(i, 23)));
    f.axes[i][0] = a[0];
    f.axes[i][1] = a[1];
    f.axes[i][2] = a[2];
    f.strength[i] = (i % 2 === 0 ? 1 : -1) * (0.8 + 0.4 * hash2(i, 24));
  }
  return f;
}

/**
 * The flow at a point p on the unit sphere: p × ∇ψ for the stream function
 * ψ = Σ sᵢ exp(k (aᵢ·p − 1)). It is tangent to the sphere and has no divergence, so the magma
 * neither piles up nor thins: every streamline is a level line of ψ.
 */
export function flowAt(f: Field, p: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  let gx = 0;
  let gy = 0;
  let gz = 0;
  for (let i = 0; i < FIELD_TERMS; i++) {
    const a = f.axes[i];
    const e =
      f.strength[i] * FIELD_K * Math.exp(FIELD_K * (a[0] * p[0] + a[1] * p[1] + a[2] * p[2] - 1));
    gx += e * a[0];
    gy += e * a[1];
    gz += e * a[2];
  }
  out[0] = p[1] * gz - p[2] * gy;
  out[1] = p[2] * gx - p[0] * gz;
  out[2] = p[0] * gy - p[1] * gx;
  return out;
}

/** The stream function itself, constant along every streamline (used by the tests). */
export function streamAt(f: Field, p: Vec3): number {
  let s = 0;
  for (let i = 0; i < FIELD_TERMS; i++) {
    const a = f.axes[i];
    s += f.strength[i] * Math.exp(FIELD_K * (a[0] * p[0] + a[1] * p[1] + a[2] * p[2] - 1));
  }
  return s;
}

/** How many streamlines the Detail slider asks for, and the points along each. */
export function lineCount(complexity: number): number {
  return Math.round(90 + 170 * clamp((complexity - 1) / 9, 0, 1));
}
export const LINE_POINTS = 36;
/** The shells the lines run on: the surface and two layers inside, seen through it. */
export const SHELLS = [1, 0.86, 0.72] as const;

export interface Lines {
  n: number;
  seeds: Vec3[];
  shell: Float32Array;
  phase: Float32Array;
  /** LineSegments positions, (LINE_POINTS - 1) segments per line, two vertices each. */
  positions: Float32Array;
  /** Per vertex: place along the line (0..1) and the line's phase. */
  along: Float32Array;
  /** Per vertex: heat, deeper and faster lines hotter. */
  heat: Float32Array;
}

export function makeLines(n: number, seed = 11): Lines {
  const r = rng(seed);
  const seeds: Vec3[] = [];
  const shell = new Float32Array(n);
  const phase = new Float32Array(n);
  const segs = LINE_POINTS - 1;
  const along = new Float32Array(n * segs * 2 * 2);
  for (let i = 0; i < n; i++) {
    seeds.push(sphereDir(r(), r()));
    const roll = r();
    shell[i] = roll < 0.6 ? 0 : roll < 0.85 ? 1 : 2;
    phase[i] = r();
    for (let j = 0; j < segs; j++) {
      const o = (i * segs + j) * 4;
      along[o] = j / segs;
      along[o + 1] = phase[i];
      along[o + 2] = (j + 1) / segs;
      along[o + 3] = phase[i];
    }
  }
  return {
    n,
    seeds,
    shell,
    phase,
    positions: new Float32Array(n * segs * 2 * 3),
    along,
    heat: new Float32Array(n * segs * 2),
  };
}

const fields = SHELLS.map(() => fieldAt(0));
const pathX = new Float32Array(LINE_POINTS);
const pathY = new Float32Array(LINE_POINTS);
const pathZ = new Float32Array(LINE_POINTS);
const pathV = new Float32Array(LINE_POINTS);
const v1: Vec3 = [0, 0, 0];
const v2: Vec3 = [0, 0, 0];
const q: Vec3 = [0, 0, 0];

/** One midpoint step along the flow from (x, y, z), back on the sphere; returns the speed. */
function stepFlow(f: Field, p: Vec3, h: number): number {
  flowAt(f, p, v1);
  q[0] = p[0] + v1[0] * h * 0.5;
  q[1] = p[1] + v1[1] * h * 0.5;
  q[2] = p[2] + v1[2] * h * 0.5;
  flowAt(f, q, v2);
  const x = p[0] + v2[0] * h;
  const y = p[1] + v2[1] * h;
  const z = p[2] + v2[2] * h;
  const l = Math.hypot(x, y, z) || 1;
  p[0] = x / l;
  p[1] = y / l;
  p[2] = z / l;
  return Math.hypot(v2[0], v2[1], v2[2]);
}

/**
 * Traces every streamline at a time, half backward and half forward from its fixed seed, so the
 * lines stay put and only bend as the field drifts. Turbulence lengthens them.
 */
export function traceLines(lines: Lines, time: number, turbulence: number): void {
  SHELLS.forEach((_, s) => {
    fieldAt(time + s * 37, fields[s]);
  });
  const h = 0.026 * (0.6 + 0.8 * clamp(turbulence, 0, 1));
  const mid = Math.floor(LINE_POINTS / 2);
  const p: Vec3 = [0, 0, 0];
  const segs = LINE_POINTS - 1;
  for (let i = 0; i < lines.n; i++) {
    const sh = lines.shell[i];
    const f = fields[sh];
    const rad = SHELLS[sh];
    const seed = lines.seeds[i];
    for (const dir of [1, -1]) {
      p[0] = seed[0];
      p[1] = seed[1];
      p[2] = seed[2];
      pathX[mid] = p[0];
      pathY[mid] = p[1];
      pathZ[mid] = p[2];
      for (let j = 1; mid + j * dir >= 0 && mid + j * dir < LINE_POINTS; j++) {
        const sp = stepFlow(f, p, h * dir);
        const k = mid + j * dir;
        pathX[k] = p[0];
        pathY[k] = p[1];
        pathZ[k] = p[2];
        pathV[k] = sp;
      }
    }
    pathV[mid] = pathV[mid + 1];
    const deep = sh / (SHELLS.length - 1);
    for (let j = 0; j < segs; j++) {
      const o = (i * segs + j) * 2;
      for (let e = 0; e < 2; e++) {
        const k = j + e;
        const v = (o + e) * 3;
        lines.positions[v] = pathX[k] * rad;
        lines.positions[v + 1] = pathY[k] * rad;
        lines.positions[v + 2] = pathZ[k] * rad;
        lines.heat[o + e] = clamp(0.5 + 0.3 * deep + 0.12 * Math.min(1, pathV[k] / 2.5), 0, 1);
      }
    }
  }
}

/* ── 5. Eruptive Core: loops, plumes and embers ────────────── */

export const LOOPS = 6;
export const VENTS = 5;

export const ERUPT_LOOP = 0;
export const ERUPT_PLUME = 1;
export const ERUPT_EMBER = 2;

/** How many molten particles the Detail slider asks for: 4,000 up to 14,000. */
export function eruptCount(complexity: number): number {
  return Math.round(4000 + 10000 * clamp((complexity - 1) / 9, 0, 1));
}

export interface Eruption {
  n: number;
  /** A random direction: the ember's way out, a plume particle's sideways drift, a loop's jitter. */
  tangent: Float32Array;
  /** Phase, rate, spread or height, size. */
  seed: Float32Array;
  kind: Float32Array;
  /** The loop or vent the particle belongs to. */
  index: Float32Array;
}

/** 45% riding the loops, 35% thrown up from the vents, 20% embers drifting out. */
export function makeEruption(n: number, seed = 5): Eruption {
  const r = rng(seed);
  const out: Eruption = {
    n,
    tangent: new Float32Array(n * 3),
    seed: new Float32Array(n * 4),
    kind: new Float32Array(n),
    index: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const roll = r();
    const kind = roll < 0.45 ? ERUPT_LOOP : roll < 0.8 ? ERUPT_PLUME : ERUPT_EMBER;
    out.kind[i] = kind;
    out.index[i] = Math.floor(r() * (kind === ERUPT_LOOP ? LOOPS : VENTS));
    out.tangent.set(sphereDir(r(), r()), i * 3);
    out.seed.set([r(), r(), r(), r()], i * 4);
  }
  return out;
}

export interface Loop {
  a: Vec3;
  b: Vec3;
  /** How high the arch rises above the surface, in core radii. */
  height: number;
  /** 0..1: rises in, holds, fades out before the loop moves elsewhere. */
  life: number;
}

/** A prominence loop: two footpoints on the surface and an arch between them that lives and fades. */
export function loopAt(k: number, time: number): Loop {
  const period = 16 + 8 * hash2(k, 31);
  const p = time / period + hash2(k, 32);
  const cycle = Math.floor(p);
  const f = p - cycle;
  const id = k * 977 + cycle;
  const a = sphereDir(hash2(id, 33), hash2(id, 34));
  const axis = tangentOf(a, hash2(id, 35) * Math.PI * 2);
  const b = rotate(a, axis, 0.35 + 0.4 * hash2(id, 36));
  const life = smooth(0, 0.2, f) * (1 - smooth(0.75, 1, f));
  return { a, b, height: (0.22 + 0.32 * hash2(id, 37)) * (0.65 + 0.35 * life), life };
}

export interface Vent {
  dir: Vec3;
  /** 0..1: how hard it throws; it moves only while quiet. */
  strength: number;
}

export function ventAt(k: number, time: number): Vent {
  const period = 10 + 6 * hash2(k, 41);
  const p = time / period + hash2(k, 42);
  const cycle = Math.floor(p);
  const f = p - cycle;
  const id = k * 613 + cycle;
  return {
    dir: sphereDir(hash2(id, 43), hash2(id, 44)),
    strength: smooth(0, 0.25, f) * (1 - smooth(0.6, 0.95, f)),
  };
}

/** The core's slow breath, 0..1, about every 14 s: brighter and more eruptive at the top. */
export function pulseAt(time: number): number {
  return 0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 14);
}
