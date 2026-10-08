/*
 * THE BIG BANG — one continuous trip of light, as math.
 *
 * Every grain of light is one particle with a fixed identity. Each step of the
 * trip is a formula: given a particle and the time inside the step, where is it
 * and what colour is it. Between steps nothing cuts: each particle flows from
 * the formula of one step to the next, leaving at its own moment (a golden-ratio
 * stagger), so a transition pours like sand instead of snapping.
 *
 * The math chosen for beauty:
 *  - the golden ratio and golden angle (even, sunflower-like spreads),
 *  - Kepler's law for orbits (inner turns faster than outer),
 *  - dihedral symmetry (rotations and mirrors) for the triangle mandala,
 *  - iterated fractals (Sierpinski) for infinite detail from one rule,
 *  - Fibonacci numbers for the symmetry that grows: 3, 5, 8, 13, 21, 34.
 *
 * The trip ends where it starts, at a single point, so it loops forever.
 * Everything here is pure: no three.js, no DOM.
 */

export type Vec3 = [number, number, number];
export type RGB = [number, number, number];

export const PHI = (1 + Math.sqrt(5)) / 2;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

export interface Phase {
  id: string;
  name: string;
  line: string;
  duration: number;
  /** Bloom strength while in this step. */
  glow: number;
  /** Particle size multiplier. */
  size: number;
}

export const PHASES: Phase[] = [
  {
    id: 'explosion',
    name: 'Explosion',
    line: 'A single point of light trembles, then bursts outward in every direction.',
    duration: 26,
    glow: 1.15,
    size: 1.1,
  },
  {
    id: 'clusters',
    name: 'Star clusters',
    line: 'The fire cools into clusters, each a small spiral of stars.',
    duration: 16,
    glow: 1.0,
    size: 0.9,
  },
  {
    id: 'gravity',
    name: 'Gravity',
    line: 'Clusters fall together into five masses, inner orbits turning faster.',
    duration: 16,
    glow: 1.15,
    size: 0.95,
  },
  {
    id: 'light',
    name: 'Light',
    line: 'The masses unite: one ball of light, twelve rays and a halo.',
    duration: 14,
    glow: 1.6,
    size: 1.05,
  },
  {
    id: 'symmetry',
    name: 'Symmetry',
    line: 'The rays settle into triangles: rings growing by the golden ratio.',
    duration: 14,
    glow: 1.0,
    size: 0.85,
  },
  {
    id: 'play',
    name: 'Symmetry plays',
    line: 'Rings turn at harmonic speeds; triangles fold into smaller triangles.',
    duration: 16,
    glow: 1.05,
    size: 0.85,
  },
  {
    id: 'symtunnel',
    name: 'Symmetry tunnel',
    line: 'The mandala stacks into depth: hexagram after hexagram, twisting as you fly through.',
    duration: 26,
    glow: 1.15,
    size: 0.95,
  },
  {
    id: 'depth',
    name: 'Into 3D',
    line: 'The triangles rise out of the plane and become prisms.',
    duration: 14,
    glow: 0.95,
    size: 0.9,
  },
  {
    id: 'tunnel',
    name: 'Tunnel',
    line: 'The prisms line up into an endless tunnel of depth, and you travel through it.',
    duration: 30,
    glow: 1.05,
    size: 1.0,
  },
  {
    id: 'fractal',
    name: 'Fractal',
    line: 'At the end of the tunnel: a Sierpinski tetrahedron, triangles inside triangles forever.',
    duration: 18,
    glow: 1.15,
    size: 0.8,
  },
  {
    id: 'pulse',
    name: 'Pulse',
    line: 'The fractal becomes sand: fourteen-fold, pulsing like Magnetic Sands 2.',
    duration: 18,
    glow: 1.25,
    size: 0.85,
  },
  {
    id: 'growing',
    name: 'Growing symmetry',
    line: 'Petals multiply by Fibonacci numbers, then gather into one point of life.',
    duration: 20,
    glow: 1.35,
    size: 0.9,
  },
  {
    id: 'cells',
    name: 'Cells',
    line: 'The point becomes a cell, and the cell divides: 1, 2, 4, 8, 16, 32.',
    duration: 18,
    glow: 1.1,
    size: 0.85,
  },
  {
    id: 'microbes',
    name: 'Microbes',
    line: 'Each cell evolves into a living form, its outline drawn by the superformula.',
    duration: 18,
    glow: 1.15,
    size: 0.85,
  },
  {
    id: 'ocean',
    name: 'Ocean of life',
    line: 'Swimmers circle in great slow currents, heads bright, tails beating.',
    duration: 18,
    glow: 1.2,
    size: 0.85,
  },
  {
    id: 'shoals',
    name: 'Shoals',
    line: 'Fish of light school together, split, merge, and gather into a single point again.',
    duration: 22,
    glow: 1.15,
    size: 0.9,
  },
];

export const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);
export const PHASE_START: number[] = PHASES.map((_, i) =>
  PHASES.slice(0, i).reduce((s, p) => s + p.duration, 0),
);

/** Which step a moment of the trip is in, and how far through it (0..1). */
export function phaseAt(time: number): { index: number; u: number } {
  const t = ((time % TOTAL) + TOTAL) % TOTAL;
  let index = PHASES.length - 1;
  for (let i = 0; i < PHASES.length; i++) {
    if (t < PHASE_START[i] + PHASES[i].duration) {
      index = i;
      break;
    }
  }
  return { index, u: (t - PHASE_START[index]) / PHASES[index].duration };
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const frac = (x: number) => x - Math.floor(x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A deterministic hash in [0, 1). */
export function hash(i: number, salt: number): number {
  return frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);
}

/** Even points on a sphere: the Fibonacci (golden-angle) spiral. */
export function fibonacciSphere(i: number, n: number): Vec3 {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const a = i * GOLDEN_ANGLE;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

export interface Particle {
  i: number;
  /** Golden-ratio sequence: an even spread in [0,1). */
  a: number;
  b: number;
  c: number;
  d: number;
  dir: Vec3;
  cluster: number;
  /** When this particle leaves for the next step, 0..1. */
  stagger: number;
}

const CLUSTERS = 21;
const CLUSTER_CENTRES: Vec3[] = Array.from({ length: CLUSTERS }, (_, j) => {
  const d = fibonacciSphere(j, CLUSTERS);
  const r = 22 * (0.8 + 0.4 * hash(j, 7));
  return [d[0] * r, d[1] * r * 0.7, d[2] * r];
});
const CLUSTER_NORMALS: Vec3[] = Array.from({ length: CLUSTERS }, (_, j) =>
  normalise([hash(j, 1) - 0.5, hash(j, 2) - 0.5, hash(j, 3) - 0.5]),
);

export function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const dir = fibonacciSphere(i, n);
    // the cluster in the direction the particle flies out, so it never doubles back
    let best = 0;
    let bestDot = -2;
    for (let j = 0; j < CLUSTERS; j++) {
      const c = normalise(CLUSTER_CENTRES[j]);
      const dot = c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2];
      if (dot > bestDot) {
        bestDot = dot;
        best = j;
      }
    }
    return {
      i,
      a: frac(i * PHI),
      b: hash(i, 1),
      c: hash(i, 2),
      d: hash(i, 3),
      dir,
      cluster: best,
      stagger: frac(i * PHI * PHI),
    };
  });
}

function normalise(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function rotZ(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}
/** A narrow bell-shaped wobble, from two hashes (Box-Muller). */
function gauss(p: Particle, salt: number): number {
  const u1 = Math.max(1e-6, hash(p.i, salt));
  const u2 = hash(p.i, salt + 0.5);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
}

/* ---------- triangles ---------- */

/** Vertices of an equilateral triangle of circumradius r, turned by a. */
function triangle(r: number, a: number): [number, number][] {
  return [0, 1, 2].map((k) => [
    Math.cos(a + (k * TAU) / 3 + Math.PI / 2) * r,
    Math.sin(a + (k * TAU) / 3 + Math.PI / 2) * r,
  ]);
}
/** A point on a triangle's outline: s in [0,1) runs once around it. */
function onTriangle(v: [number, number][], s: number): [number, number] {
  const e = Math.floor(s * 3) % 3;
  const f = frac(s * 3);
  const p = v[e];
  const q = v[(e + 1) % 3];
  return [lerp(p[0], q[0], f), lerp(p[1], q[1], f)];
}

/* ---------- the steps ---------- */

const RING_COUNT = 5;
const ringRadius = (j: number) => 3.4 * PHI ** j;

/** Where particle p is during step k, u in [0,1], t the trip clock in seconds. */
export function target(k: number, p: Particle, u: number, t: number): Vec3 {
  switch (PHASES[k].id) {
    case 'explosion': {
      // First the singularity: a tiny point of light, trembling (the first 15%).
      // Then the burst: speed shells, the fastest outermost, decelerating like a
      // real blast, the plasma swirling a little as it spreads.
      const seed = 0.5 * smooth(u / 0.06) * (1 + 0.35 * Math.sin(t * 9 + p.i));
      const b = clamp01((u - 0.15) / 0.85);
      const s = 0.3 + 0.7 * Math.sqrt(p.c);
      const r = seed + 27 * s * easeOutCubic(b) + 3 * s * b * b;
      const swirl = 0.5 * b * (1 - s) + 0.12 * Math.sin(3 * p.dir[1] + b * 5) * b;
      const v: Vec3 = [p.dir[0] * r, p.dir[1] * r, p.dir[2] * r];
      return rotY(v, swirl);
    }
    case 'clusters': {
      const centre = CLUSTER_CENTRES[p.cluster];
      const n = CLUSTER_NORMALS[p.cluster];
      const e1 = normalise(cross(n, [0, 1, 0.3]));
      const e2 = cross(n, e1);
      // a two-armed spiral galaxy around each centre, tightening as it cools
      const rr = 4.6 * Math.sqrt(p.c) * (1 - 0.35 * u);
      const arm = p.a < 0.5 ? 0 : Math.PI;
      const th = rr * 0.85 + arm + t * (0.9 / (0.6 + rr)) + p.b * 0.5;
      const h = gauss(p, 4) * 0.35;
      const v: Vec3 = [
        centre[0] + Math.cos(th) * rr * e1[0] + Math.sin(th) * rr * e2[0] + n[0] * h,
        centre[1] + Math.cos(th) * rr * e1[1] + Math.sin(th) * rr * e2[1] + n[1] * h,
        centre[2] + Math.cos(th) * rr * e1[2] + Math.sin(th) * rr * e2[2] + n[2] * h,
      ];
      return rotY(v, 0.04 * t);
    }
    case 'gravity': {
      const m = p.cluster % 5;
      const ring = 15 * (1 - 0.3 * u);
      const ca = (m * TAU) / 5 + 0.12 * t;
      const centre: Vec3 = [
        Math.cos(ca) * ring,
        Math.sin(ca) * ring * 0.55,
        Math.sin(ca) * ring * 0.4,
      ];
      // logarithmic infall, angular speed from Kepler: omega ~ r^-1.5
      const rr = (1.6 + 6.5 * p.c) * (1 - 0.55 * u);
      const omega = 2.2 / (rr ** 1.5 / 4 + 0.35);
      const th = p.a * TAU + omega * t;
      const tilt = 0.5 + m * 0.3;
      const disc: Vec3 = [
        Math.cos(th) * rr,
        Math.sin(th) * rr * Math.cos(tilt),
        Math.sin(th) * rr * Math.sin(tilt) + gauss(p, 5) * 0.2,
      ];
      return [centre[0] + disc[0], centre[1] + disc[1], centre[2] + disc[2]];
    }
    case 'light': {
      const spin = 0.05 * t;
      if (p.b < 0.38) {
        // the core: a dense sphere, breathing
        const r = 2.7 * Math.cbrt(p.c) * (1 + 0.06 * Math.sin(3 * t));
        return [p.dir[0] * r, p.dir[1] * r, p.dir[2] * r];
      }
      if (p.b < 0.74) {
        // twelve rays, dihedral: denser near the centre, flickering in length
        const j = Math.floor(p.a * 12);
        const ang = (j * TAU) / 12 + spin;
        const len = (3 + 26 * p.c ** 1.6) * (0.88 + 0.12 * Math.sin(4 * t + j * 1.7));
        const w = gauss(p, 6) * 0.12;
        return [
          Math.cos(ang) * len - Math.sin(ang) * w,
          Math.sin(ang) * len + Math.cos(ang) * w,
          gauss(p, 7) * 0.1,
        ];
      }
      // the halo: two rings
      const outer = p.c < 0.3;
      const r = (outer ? 13.5 : 9) + gauss(p, 8) * (outer ? 0.12 : 0.22);
      const ang = p.a * TAU + (outer ? -1 : 1) * 0.1 * t;
      return [Math.cos(ang) * r, Math.sin(ang) * r, 0];
    }
    case 'symmetry':
    case 'play': {
      const play = PHASES[k].id === 'play';
      const j = Math.floor(p.c * RING_COUNT);
      const up = p.b < 0.5;
      const dir = j % 2 === 0 ? 1 : -1;
      // harmonic speeds: when playing, ring j gains an extra turn in proportion to j+1,
      // growing from zero so the change of step never jumps
      const harmonic = play ? (j + 1) * 0.9 * u * u : 0;
      let a = dir * (0.03 * t + harmonic) + (up ? 0 : Math.PI / 3) + (j * Math.PI) / 12;
      let r = ringRadius(j);
      if (play) {
        // fold into medial triangles: each level is half the size, turned 60 degrees
        const levels = Math.floor(p.d * (1 + 3 * smooth(u)));
        for (let l = 0; l < levels; l++) {
          r *= 0.5;
          a += Math.PI / 3;
        }
        // half the triangles turn 30 degrees: six-fold becomes twelve-fold
        if (p.a > 1 - 0.5 * smooth(u * 1.5)) a += Math.PI / 6;
      }
      const pt = onTriangle(triangle(r, a), p.a);
      const jitter = gauss(p, 9) * 0.09;
      return [pt[0] + jitter, pt[1] - jitter, 0];
    }
    case 'symtunnel': {
      // the triangle mandala stacked into depth. Each layer is a hexagram with a
      // smaller hexagram nested inside (turned 30 degrees); layers fly toward the
      // viewer on their own and the twist belongs to the depth, as in the tunnel.
      const layers = 22;
      const layer = Math.floor(p.b * layers);
      const spacing = 15;
      const span = layers * spacing;
      const travel = (((layer * spacing - t * 7) % span) + span) % span;
      const z = 40 - travel;
      const up = p.d < 0.5;
      const inner = p.c < 0.34;
      const r = inner ? 7 : 7 * PHI * PHI * 0.62 * 1.6;
      // the mandala opens out of the plane: at the start every layer is the flat figure
      const open = smooth(u * 2.2);
      const zz = lerp(0, z, open);
      const a = zz * 0.02 + 0.05 * t + (up ? 0 : Math.PI / 3) + (inner ? Math.PI / 6 : 0);
      const pt = onTriangle(triangle(r, a), p.a);
      return [pt[0], pt[1], zz];
    }
    case 'depth': {
      // twelve triangles on a ring, extruded into prisms that rise out of the plane
      const q = Math.floor(p.a * 12);
      const ang = (q * TAU) / 12;
      const h = 7 * smooth(u);
      const tri = triangle(3.1, ang);
      const local = prismPoint(tri, h, p);
      const cx = Math.cos(ang) * 13;
      const cy = Math.sin(ang) * 13;
      let v: Vec3 = [cx + local[0], cy + local[1], local[2]];
      v = rotX(v, -0.9 * smooth(u));
      return rotZ(v, 0.06 * t);
    }
    case 'tunnel': {
      // rings of six prisms along the depth. Each ring flies toward the viewer on its
      // own and returns to the far end only once it is out of sight, and the twist
      // belongs to the depth, not the ring: an endless spiral you travel through.
      const rings = 16;
      const ring = Math.floor(p.b * rings);
      const spacing = 22;
      const span = rings * spacing;
      const travel = (((ring * spacing - t * 9) % span) + span) % span;
      const z = 40 - travel;
      const q = Math.floor(p.a * 6);
      const ang = (q * TAU) / 6 + z * 0.012 + 0.04 * t;
      const tri = triangle(3.4, ang);
      const local = prismPoint(tri, 8, p);
      const radius = 13;
      return [
        Math.cos(ang) * radius + local[0],
        Math.sin(ang) * radius + local[1],
        z + local[2] - 4,
      ];
    }
    case 'fractal': {
      // six levels: enough for the holes to show, every smallest pyramid still lit
      const v = sierpinskiTetra(p.a, 6, 40 * (1 + 0.3 * smooth(u)));
      const drift = 0.15 * Math.sin(t * 0.7 + p.i);
      let w: Vec3 = [v[0] + drift, v[1] + 2, v[2] - drift];
      w = rotY(w, 0.22 * t);
      return rotX(w, 0.22);
    }
    case 'pulse': {
      return fractalSand(p, t, 14, 1);
    }
    case 'growing': {
      const seq = [3, 5, 8, 13, 21, 34];
      const pos = smooth(u / 0.85) * (seq.length - 1);
      const lo = Math.min(seq.length - 1, Math.floor(pos));
      const hi = Math.min(seq.length - 1, lo + 1);
      const f = smooth(pos - lo);
      const A = rose(p, t, seq[lo]);
      const B = rose(p, t, seq[hi]);
      // the last moments gather everything into one point: the first cell
      const gather = 1 - smooth((u - 0.86) / 0.14);
      return [
        lerp(A[0], B[0], f) * gather,
        lerp(A[1], B[1], f) * gather,
        lerp(A[2], B[2], f) * gather,
      ];
    }
    case 'cells':
      return cellPoint(p, u, t);
    case 'microbes':
      return microbePoint(p, u, t);
    case 'ocean':
      return swimmerPoint(p, u, t);
    case 'shoals': {
      const v = fishPoint(p, u, t);
      // the end of the trip: everything gathers into the point the Big Bang starts from
      const gather = 1 - smooth((u - 0.86) / 0.14);
      return [v[0] * gather, v[1] * gather, v[2] * gather];
    }
    default:
      return [0, 0, 0];
  }
}

/** A point on the nine edges of a triangular prism of height h, centred on z = 0. */
function prismPoint(tri: [number, number][], h: number, p: Particle): Vec3 {
  const e = Math.floor(p.c * 9);
  const s = frac(p.c * 9);
  if (e < 6) {
    const top = e >= 3;
    const v = tri[e % 3];
    const w = tri[(e + 1) % 3];
    return [lerp(v[0], w[0], s), lerp(v[1], w[1], s), top ? h / 2 : -h / 2];
  }
  const v = tri[e - 6];
  return [v[0], v[1], lerp(-h / 2, h / 2, s)];
}

/* A regular tetrahedron standing on its base, apex up, so it reads as a pyramid. */
const TETRA: Vec3[] = [
  [0, 1, 0],
  [Math.sqrt(8 / 9), -1 / 3, 0],
  [-Math.sqrt(2 / 9), -1 / 3, Math.sqrt(2 / 3)],
  [-Math.sqrt(2 / 9), -1 / 3, -Math.sqrt(2 / 3)],
];
/** A point of the Sierpinski tetrahedron: the base-4 digits of x choose the corners. */
export function sierpinskiTetra(x: number, levels: number, size: number): Vec3 {
  let f = x;
  const out: Vec3 = [0, 0, 0];
  let scale = 0.5;
  for (let l = 0; l < levels; l++) {
    f *= 4;
    const d = Math.floor(f) % 4;
    f -= Math.floor(f);
    out[0] += TETRA[d][0] * scale;
    out[1] += TETRA[d][1] * scale;
    out[2] += TETRA[d][2] * scale;
    scale *= 0.5;
  }
  return [out[0] * size * 0.5, out[1] * size * 0.5, out[2] * size * 0.5];
}

/** A point of the Sierpinski triangle in the unit triangle, from the base-3 digits of x. */
export function sierpinskiTri(x: number, levels: number): [number, number] {
  const V: [number, number][] = [
    [0, 0],
    [1, 0],
    [0.5, Math.sqrt(3) / 2],
  ];
  let f = x;
  let px = 0;
  let py = 0;
  let scale = 0.5;
  for (let l = 0; l < levels; l++) {
    f *= 3;
    const d = Math.floor(f) % 3;
    f -= Math.floor(f);
    px += V[d][0] * scale;
    py += V[d][1] * scale;
    scale *= 0.5;
  }
  return [px, py];
}

/** Fractal sand: a Sierpinski triangle folded into n mirrored sectors, pulsing. */
function fractalSand(p: Particle, t: number, n: number, pulse: number): Vec3 {
  const [fx, fy] = sierpinskiTri(p.a, 9);
  const sector = Math.floor(p.b * n);
  const mirror = sector % 2 === 1 ? -1 : 1;
  const half = Math.PI / n;
  let r = 2.2 + (25 * fy) / (Math.sqrt(3) / 2);
  const off = (fx - 0.5) * 2 * half * 0.92;
  // the pulse: a wave running outward, breathing like Magnetic Sands 2
  r *= 1 + pulse * 0.09 * Math.sin(TAU * 0.45 * t - r * 0.32);
  const th = (sector * TAU) / n + mirror * off + 0.03 * t;
  const z = 1.6 * Math.sin(r * 0.38 - t * 1.2) * pulse;
  return [Math.cos(th) * r, Math.sin(th) * r, z];
}

/** A rose of n petals, filled like sand, turning on a golden spiral. */
function rose(p: Particle, t: number, n: number): Vec3 {
  const th = p.a * TAU + 0.06 * t;
  const petal = Math.abs(Math.cos((n * th) / 2)) ** 0.7;
  const r = 24 * (0.25 + 0.75 * petal) * Math.sqrt(p.c);
  const z = 1.2 * Math.sin(n * th + t);
  return [Math.cos(th) * r, Math.sin(th) * r, z];
}

/* ---------- life ---------- */

const MAX_DIVISIONS = 5; // 32 cells
/**
 * Cell j of 2^level. Each division splits a cell in two along an axis that turns
 * a quarter at each generation (with a small twist), the daughters touching, so
 * the cluster grows like an early embryo and a daughter never jumps away.
 */
function cellCentre(j: number, level: number): [number, number] {
  let x = 0;
  let y = 0;
  for (let l = 1; l <= level; l++) {
    const prefix = j >> (level - l);
    const parent = prefix >> 1;
    const th = (l * Math.PI) / 2 + (hash(parent + l * 97, 51) - 0.5) * 0.8;
    const d = cellRadius(l) * 1.02 * ((prefix & 1) === 1 ? 1 : -1);
    x += Math.cos(th) * d;
    y += Math.sin(th) * d;
  }
  return [x, y];
}
function cellRadius(level: number): number {
  return 7.5 / Math.sqrt(2) ** level;
}

/** Cells dividing: each particle follows its line of ancestors, membrane or nucleus. */
function cellPoint(p: Particle, u: number, t: number): Vec3 {
  const lv = smooth(u / 0.9) * MAX_DIVISIONS;
  const L = Math.min(MAX_DIVISIONS, Math.floor(lv));
  const f = smooth((lv - L) * 1.4);
  const leaf = Math.floor(p.a * 2 ** MAX_DIVISIONS);
  const here = leaf >> (MAX_DIVISIONS - L);
  const next = L < MAX_DIVISIONS ? leaf >> (MAX_DIVISIONS - L - 1) : here;
  const c0 = cellCentre(here, L);
  const c1 = L < MAX_DIVISIONS ? cellCentre(next, L + 1) : c0;
  const cx = lerp(c0[0], c1[0], f);
  const cy = lerp(c0[1], c1[1], f);
  const R =
    lerp(cellRadius(L), L < MAX_DIVISIONS ? cellRadius(L + 1) : cellRadius(L), f) * smooth(u * 12);
  const wob = 1 + 0.05 * Math.sin(5 * p.b * TAU + 2 * t + here);
  if (p.b < 0.72) {
    // the membrane, breathing
    const a = p.c * TAU;
    return [cx + Math.cos(a) * R * wob, cy + Math.sin(a) * R * wob, gauss(p, 11) * 0.15];
  }
  // the nucleus
  const rr = R * 0.3 * Math.sqrt(p.c);
  const a = p.d * TAU + t * 0.3;
  return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, gauss(p, 12) * 0.2];
}

/** The superformula (Gielis): one equation that draws shells, diatoms, starfish, flowers. */
export function superformula(th: number, m: number, n1: number, n2: number, n3: number): number {
  const c = Math.abs(Math.cos((m * th) / 4)) ** n2;
  const s = Math.abs(Math.sin((m * th) / 4)) ** n3;
  return (c + s) ** (-1 / n1);
}

/** Each of the 32 cells evolves into a creature: from a circle (m = 0) to a symmetric form. */
function microbePoint(p: Particle, u: number, t: number): Vec3 {
  const j = Math.floor(p.a * 2 ** MAX_DIVISIONS);
  const [c0x, c0y] = cellCentre(j, MAX_DIVISIONS);
  // the colony spreads out as its creatures grow
  const spread = 1 + 1.25 * smooth(u * 1.3);
  const cx = c0x * spread;
  const cy = c0y * spread;
  const species = 3 + (j % 7); // 3 to 9-fold
  const m = species * smooth(u * 1.6);
  const n1 = lerp(2, 0.35 + 0.5 * hash(j, 21), smooth(u * 1.6));
  const R0 = cellRadius(MAX_DIVISIONS) * (1 + 0.9 * smooth(u * 1.3));
  const spin = (j % 2 ? 1 : -1) * 0.25 * t;
  // a slow drift, like Brownian motion
  const dx = Math.sin(t * 0.21 + j) * 0.9;
  const dy = Math.cos(t * 0.17 + j * 1.3) * 0.9;
  const th = p.c * TAU;
  if (p.b < 0.7) {
    const r =
      (R0 * superformula(th, m, n1, n1 * 1.1, n1 * 1.1)) /
      superformula(0, m, n1, n1 * 1.1, n1 * 1.1);
    const rr = Math.min(r, R0 * 1.8);
    return [
      cx + dx + Math.cos(th + spin) * rr,
      cy + dy + Math.sin(th + spin) * rr,
      gauss(p, 13) * 0.12,
    ];
  }
  // inner lines: spokes of the creature's symmetry
  const spokes = Math.max(1, species);
  const k = Math.floor(p.d * spokes);
  const a = (k * TAU) / spokes + spin;
  const rr = R0 * 0.85 * p.c * smooth(u * 1.6);
  return [cx + dx + Math.cos(a) * rr, cy + dy + Math.sin(a) * rr, 0];
}

/** Swimmers on three great circular currents: a dense head and a beating tail. */
function swimmerPoint(p: Particle, u: number, t: number): Vec3 {
  const S = 160;
  const s = Math.floor(p.a * S);
  const current = s % 3;
  const centres: [number, number][] = [
    [-9, 3],
    [9, 3],
    [0, -10],
  ];
  const [ccx, ccy] = centres[current];
  const R = 6 + 11 * hash(s, 31);
  const dir = current === 1 ? -1 : 1;
  const speed = (3.2 + 1.2 * hash(s, 32)) / R;
  const a0 = hash(s, 33) * TAU + dir * speed * t;
  // along the body: q = 0 head, 1 tail end; heads are denser
  const q = p.c ** 2;
  const len = 2.4;
  const a = a0 - (dir * (q * len)) / R;
  const beat = Math.sin(14 * q - 9 * t + s) * 0.45 * q;
  const rr = R + beat;
  const appear = smooth(u * 3);
  const x = ccx + Math.cos(a) * rr;
  const y = ccy + Math.sin(a) * rr;
  return [x * appear, y * appear, Math.sin(a * 2 + s) * 1.5];
}

/** Fish made of dots, schooling: three mills that drift, then merge into one great ring. */
function fishPoint(p: Particle, u: number, t: number): Vec3 {
  const F = 140;
  const f = Math.floor(p.a * F);
  const school = f % 3;
  const merge = smooth((u - 0.35) / 0.35);
  const sa = (school * TAU) / 3 + 0.08 * t;
  const sx = Math.cos(sa) * 12 * (1 - merge);
  const sy = Math.sin(sa) * 9 * (1 - merge);
  // each fish on a ring of the mill; all swim at the same speed, so inner rings turn faster
  const R = (3.5 + 6 * hash(f, 41)) * (1 + 1.3 * merge);
  const dir = school === 1 && merge < 0.5 ? -1 : 1;
  const ang = hash(f, 42) * TAU + (dir * 4.2 * t) / R;
  const hx = sx + Math.cos(ang) * R;
  const hy = sy + Math.sin(ang) * R + Math.sin(t * 0.6 + school) * 1.5;
  const head: [number, number] = [-Math.sin(ang) * dir, Math.cos(ang) * dir];
  const side: [number, number] = [head[1], -head[0]];
  // the body: an ellipse of dots along the fish, the tail wagging
  const l = p.c * 2 - 1;
  const wag = Math.sin(10 * t + f) * 0.18 * (1 - l) * 0.5;
  const width = l > -0.75 ? 0.32 * Math.sqrt(Math.max(0, 1 - l * l)) : 0.32 * (-0.75 - l) * 3;
  const sideOff = (p.b * 2 - 1) * width + wag;
  const scale = 1.25;
  return [
    hx + head[0] * l * scale + side[0] * sideOff,
    hy + head[1] * l * scale + side[1] * sideOff,
    Math.sin(ang + f) * 1.2,
  ];
}

/* ---------- colour ---------- */

const AMBER_DUST: RGB = [190 / 255, 145 / 255, 75 / 255];
const GOLDEN_SOURCE: RGB = [1, 195 / 255, 35 / 255];

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
/** A soft spectral colour from an angle-like value in [0,1). */
function spectrum(x: number, sat = 0.65): RGB {
  const r = 0.5 + 0.5 * Math.cos(TAU * (x + 0.0));
  const g = 0.5 + 0.5 * Math.cos(TAU * (x + 0.33));
  const b = 0.5 + 0.5 * Math.cos(TAU * (x + 0.67));
  return [lerp(1, r, sat), lerp(1, g, sat), lerp(1, b, sat)];
}

/** The colour of particle p during step k (linear, may exceed 1 for glow). */
export function colour(k: number, p: Particle, u: number, t: number): RGB {
  switch (PHASES[k].id) {
    case 'explosion': {
      // white-hot, cooling through gold to ember as it travels (the clock starts at the burst)
      const heat = 1 - clamp01((u - 0.15) / 0.85) * (0.4 + 0.6 * p.c);
      if (heat > 0.6) return mixRGB([1, 0.62, 0.25], [1.4, 1.3, 1.15], (heat - 0.6) / 0.4);
      return mixRGB([0.75, 0.2, 0.35], [1, 0.62, 0.25], heat / 0.6);
    }
    case 'clusters': {
      const core = 1 - Math.sqrt(p.c);
      return mixRGB([0.55, 0.7, 1.05], [1.1, 0.9, 0.65], core * 0.9);
    }
    case 'gravity':
      return mixRGB(GOLDEN_SOURCE, [1.2, 1.05, 0.85], (1 - p.c) * 0.7);
    case 'light': {
      // Kizaru: yellow-white light, the core brightest
      if (p.b < 0.38) return [1.5, 1.38, 1.05];
      if (p.b < 0.74) return mixRGB([1.25, 1.05, 0.55], [1.4, 1.3, 1.0], 1 - p.c);
      return [1.2, 1.12, 0.85];
    }
    case 'symmetry':
      return mixRGB(AMBER_DUST, GOLDEN_SOURCE, p.c);
    case 'play': {
      const j = Math.floor(p.c * RING_COUNT);
      return mixRGB(
        mixRGB(AMBER_DUST, GOLDEN_SOURCE, p.c),
        spectrum(j / RING_COUNT + 0.08, 0.45),
        0.5 * smooth(u * 2),
      );
    }
    case 'symtunnel': {
      // amber dust to gold, the nested triangles a little brighter
      const inner = p.c < 0.34;
      return inner ? [1.3, 1.05, 0.55] : mixRGB(AMBER_DUST, GOLDEN_SOURCE, 0.35 + 0.65 * p.b);
    }
    case 'depth': {
      const vertical = Math.floor(p.c * 9) >= 6;
      return vertical ? [1.05, 0.8, 0.4] : [0.45, 0.85, 1.05];
    }
    case 'tunnel': {
      // golden: deep gold edges, white-gold uprights, so the depth still reads
      const vertical = Math.floor(p.c * 9) >= 6;
      return vertical ? [1.35, 1.12, 0.68] : [1.1, 0.74, 0.26];
    }
    case 'fractal': {
      // the first corner chosen gives the hue: four families of light
      const d = Math.floor(p.a * 4);
      const hues: RGB[] = [
        [1.1, 0.78, 0.35],
        [1.0, 0.45, 0.55],
        [0.45, 0.85, 1.05],
        [0.7, 0.5, 1.1],
      ];
      return hues[d];
    }
    case 'pulse': {
      const glint = 0.75 + 0.35 * Math.sin(TAU * 0.45 * t - p.c * 6);
      return [
        AMBER_DUST[0] * 1.35 * glint,
        AMBER_DUST[1] * 1.35 * glint,
        AMBER_DUST[2] * 1.35 * glint,
      ];
    }
    case 'growing': {
      const c = spectrum(p.a + 0.05 * t, 0.55 + 0.25 * smooth(u));
      return mixRGB(c, [1.4, 1.35, 1.2], smooth((u - 0.8) / 0.2));
    }
    case 'cells':
      // bioluminescent: membranes green-cyan, nuclei warm
      return p.b < 0.72 ? [0.35, 1.0, 0.75] : [1.1, 0.85, 0.45];
    case 'microbes': {
      const j = Math.floor(p.a * 2 ** MAX_DIVISIONS);
      const hues: RGB[] = [
        [0.4, 1.0, 0.7],
        [0.95, 0.9, 0.4],
        [0.65, 0.55, 1.1],
        [0.35, 0.85, 1.1],
      ];
      return mixRGB(hues[j % 4], [1.2, 1.15, 1.0], p.b < 0.7 ? 0 : 0.3);
    }
    case 'ocean': {
      const q = p.c ** 2;
      return mixRGB([1.35, 1.35, 1.3], [0.25, 0.6, 1.0], smooth(q * 3));
    }
    case 'shoals': {
      // silver-blue, with a flash of gold when a fish turns toward the light
      const f = Math.floor(p.a * 140);
      const flash = Math.max(0, Math.sin(t * 1.3 + f * 0.7)) ** 6;
      return mixRGB([0.55, 0.75, 1.0], [1.4, 1.15, 0.6], flash);
    }
    default:
      return [1, 1, 1];
  }
}

/* ---------- the continuous flow between steps ---------- */

/**
 * How far particle p has moved on to the next step, 0..1. It leaves late in the
 * step, at its own golden-ratio moment, and always arrives by the step's end.
 */
export function flow(p: Particle, u: number): number {
  const start = 0.78 - 0.16 * p.stagger;
  return smooth((u - start) / 0.22);
}

/** Position and colour of particle p at trip time t, flowing between steps. */
export function particleAt(
  p: Particle,
  time: number,
): { pos: Vec3; rgb: RGB; phase: number; u: number } {
  const t = ((time % TOTAL) + TOTAL) % TOTAL;
  const { index, u } = phaseAt(t);
  const w = flow(p, u);
  const a = target(index, p, u, t);
  const ca = colour(index, p, u, t);
  if (w <= 0) return { pos: a, rgb: ca, phase: index, u };
  const next = (index + 1) % PHASES.length;
  // the next step evaluated at its own start, so arriving there is seamless
  const tn = next === 0 ? 0 : t;
  const b = target(next, p, 0, tn);
  const cb = colour(next, p, 0, tn);
  return {
    pos: [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)],
    rgb: mixRGB(ca, cb, w),
    phase: index,
    u,
  };
}

/** Glow and size for the whole picture, blended across step boundaries. */
export function look(time: number): { glow: number; size: number } {
  const { index, u } = phaseAt(time);
  const next = (index + 1) % PHASES.length;
  const w = smooth((u - 0.75) / 0.25);
  return {
    glow: lerp(PHASES[index].glow, PHASES[next].glow, w),
    size: lerp(PHASES[index].size, PHASES[next].size, w),
  };
}
