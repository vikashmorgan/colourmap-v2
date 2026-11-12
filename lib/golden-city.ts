/*
 * THE GOLDEN CITY — the City chapter's new main theme (docs/specs/art-city.md).
 *
 * 2026-11-12: "build the city" — a round city of light seen from above,
 * grown from φ: an open golden heart, then the Ring of knowledge, the Ring of
 * making, the Ring of living in terraces and the Ring of nature, with canals
 * between some of them and twelve boulevards running from the heart out
 * through every ring. Few forms: ring, spoke, terrace, tower, arch. The light
 * grows brighter toward the centre, hope as a gradient. Gold, ivory and warm
 * white on a deep blue dawn, drifting slowly, never flashing.
 *
 * The plan is worked out once from φ in GOLDEN, so every piece (the plan, the
 * city rising from it, the heart, and later a flight) shares the same city.
 *
 * Pure: no three.js, no DOM.
 */

import {
  fibonacciSphere,
  GOLDEN_ANGLE,
  hash,
  type Particle,
  type RGB,
  smooth,
  type Vec3,
} from './bigbang';
import { type BuildingSet, buildingMesh, DOMES, FACTORIES, TEMPLES } from './golden-buildings';
import {
  Anim,
  type Built,
  GROUND_Y,
  type Hit,
  Mesh,
  onMesh,
  PHI,
  type Shares,
  Tone,
} from './grain-mesh';

export { DOMES, FACTORIES, PHI, TEMPLES };

const TAU = Math.PI * 2;
const G = GROUND_Y;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const clamp1 = (c: RGB): RGB => [
  Math.min(1, Math.max(0, c[0])),
  Math.min(1, Math.max(0, c[1])),
  Math.min(1, Math.max(0, c[2])),
];

/* ---------- the plan, from φ ---------- */

export type Band = { name: string; kind: 'heart' | 'land' | 'water'; r0: number; r1: number };

/**
 * The rings, from the centre out. The heart is 3 across its radius; each land ring is φ times
 * wider than the one inside it (3φ, 3φ², 3φ³, 3φ⁴), and so is each canal (3/φ², 3/φ, 3).
 */
export const GOLDEN = (() => {
  const unit = 3;
  const parts: [string, Band['kind'], number][] = [
    ['Heart', 'heart', unit],
    ['Inner canal', 'water', unit / PHI ** 2],
    ['Ring of knowledge', 'land', unit * PHI],
    ['Ring of making', 'land', unit * PHI ** 2],
    ['Middle canal', 'water', unit / PHI],
    ['Ring of living', 'land', unit * PHI ** 3],
    ['Outer canal', 'water', unit],
    ['Ring of nature', 'land', unit * PHI ** 4],
  ];
  let r = 0;
  const bands: Band[] = parts.map(([name, kind, w]) => {
    const b = { name, kind, r0: r, r1: r + w };
    r += w;
    return b;
  });
  return {
    unit,
    bands,
    outer: r,
    /** Twelve boulevards from the heart out through every ring. */
    spokes: 12,
    /** The boulevards' width. */
    boulevard: 1.4,
    /** How high each ring rises in the city's 3D form: φ times higher each ring toward the heart. */
    heights: {
      nature: 0.8,
      living: 1.2 * PHI ** 3,
      making: 1.2 * PHI ** 4,
      knowledge: 1.2 * PHI ** 5,
      tower: 1.2 * PHI ** 6,
    },
  };
})();

export const band = (name: string) => GOLDEN.bands.find((b) => b.name === name) as Band;
/** Which ring radius r falls in, counted from the heart (0) out; past the edge, the last. */
export function bandIndex(r: number): number {
  for (let i = 0; i < GOLDEN.bands.length; i++) if (r < (GOLDEN.bands[i] as Band).r1) return i;
  return GOLDEN.bands.length - 1;
}
/** The angle of boulevard k. */
const spokeAngle = (k: number) => (k / GOLDEN.spokes) * TAU;

/* ---------- the palette: gold, ivory and warm white over a deep blue dawn ---------- */

/*
 * The grains add up and the player tone-maps them, so the colours here are deep and saturated
 * (linear light) and each grain is kept faint enough that where many overlap, on a dense edge,
 * they stay gold instead of piling up to white (2026-11-12, seen in the player: "nothing reads
 * gold"). Only lamps and the heart's core are white-hot.
 */
const WARM_WHITE: RGB = [1, 0.78, 0.5];
const IVORY_GOLD: RGB = [1, 0.56, 0.2];
const GOLD: RGB = [1, 0.5, 0.12];
const DEEP_GOLD: RGB = [0.95, 0.42, 0.08];
const AMBER_GLASS: RGB = [1, 0.48, 0.14];
const ROSE_GOLD: RGB = [1, 0.42, 0.2];
const WATER: RGB = [0.3, 0.42, 0.9];
const PLANT: RGB = [0.62, 0.72, 0.16];
const FIRE: RGB = [1, 0.36, 0.06];
const STAR: RGB = [0.8, 0.78, 1];

/** Each tone's colour and strength. */
const TONES: [RGB, number][] = [
  [GOLD, 0.34], // edge
  [DEEP_GOLD, 0.22], // face
  [AMBER_GLASS, 0.07], // glass
  [WATER, 0.18], // water
  [PLANT, 0.34], // plant
  [FIRE, 0.6], // fire
  [WARM_WHITE, 0.8], // light
  [DEEP_GOLD, 0.08], // ground
  [IVORY_GOLD, 0.42], // road
  [IVORY_GOLD, 0.16], // steam
  [GOLD, 0.2], // film
];

/**
 * The colour of a grain: its tone, drifting slowly toward rose gold and back (minutes, never a
 * flash), twinkling softly, `hope` brighter toward the heart.
 */
function glow(h: Hit, p: Particle, t: number, hope = 1, warm = 0): RGB {
  const [base, k] = TONES[h.tone] ?? (TONES[0] as [RGB, number]);
  let c = base;
  if (h.tone === Tone.film)
    c = mix(GOLD, ROSE_GOLD, 0.5 + 0.5 * Math.sin(t * 0.05 + h.pos[1] * 0.4 + h.pos[0] * 0.1));
  c = mix(c, ROSE_GOLD, 0.2 * (0.5 + 0.5 * Math.sin(t * 0.013 + p.i * 0.0007)));
  if (warm > 0) c = mix(c, WARM_WHITE, warm);
  const twinkle =
    h.tone === Tone.water
      ? 0.35 + 0.65 * Math.sin(t * 0.5 + p.i * 1.3) ** 2
      : 0.85 + 0.15 * Math.sin(t * 0.9 + p.i * 0.37);
  return clamp1(scale(c, k * h.lit * twinkle * hope));
}

/** Faint stars in a dome over the city. */
function starAt(p: Particle, t: number, c: Vec3): { pos: Vec3; rgb: RGB } {
  const d = fibonacciSphere(p.i % 997, 997);
  const r = 170;
  return {
    pos: [c[0] + d[0] * r, c[1] + 25 + Math.abs(d[1]) * r * 0.6, c[2] + d[2] * r],
    rgb: scale(STAR, 0.22 * (0.7 + 0.3 * Math.sin(t * 0.7 + p.i))),
  };
}
const STARS = 0.03;

/* ---------- the eye ---------- */

export type Eye = { eye: Vec3; target: Vec3 };
/** An eye on a slow orbit: round the vertical by `az`, `el` above the level, `d` away. */
function orbit(az: number, el: number, d: number, target: Vec3): Eye {
  return {
    eye: [
      target[0] + Math.sin(az) * Math.cos(el) * d,
      target[1] + Math.sin(el) * d,
      target[2] + Math.cos(az) * Math.cos(el) * d,
    ],
    target,
  };
}

/* ---------- 1. Golden plan: the city from above, ring by ring ---------- */

/** A circle of radius r on the ground, as points. */
const circle = (r: number, y = G) =>
  Mesh.circle([0, y, 0], r, Math.max(24, Math.ceil(TAU * r * 0.8)));
const polar = (r: number, a: number, y = G): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];

/** The plan as lines and dots: streets, boulevards, canals, terraces, towers, trees, the heart. */
function planMesh(): Mesh {
  const m = new Mesh();
  const { road, edge, light, water, plant, face, ground } = Tone;
  m.centre = [0, G - 10, 0];
  // The open heart: florets on the golden angle, as a sunflower.
  const N = 377;
  for (let n = 0; n < N; n++) {
    const r = 2.8 * Math.sqrt((n + 0.5) / N);
    m.dot(polar(r, n * GOLDEN_ANGLE, G + 0.05), 0.08, light, { w: 0.05 });
  }
  for (const b of GOLDEN.bands) {
    if (b.kind === 'water') {
      m.poly(circle(b.r0), true, edge);
      m.poly(circle(b.r1), true, edge);
      m.disc([0, G, 0], b.r1, water, b.r0, { w: 0.6 });
      // Bridges over the canal where the boulevards cross: a low arch each.
      for (let k = 0; k < GOLDEN.spokes; k++) {
        const a = spokeAngle(k);
        const span = b.r1 - b.r0;
        m.poly(
          Array.from({ length: 9 }, (_, j) => {
            const f = j / 8;
            return polar(b.r0 + span * f, a, G + Math.sin(Math.PI * f) * span * 0.45);
          }),
          false,
          edge,
          { w: 1.5 },
        );
      }
    } else m.poly(circle(b.r1), true, road, { w: 1.2 });
  }
  const kn = band('Ring of knowledge');
  const mk = band('Ring of making');
  const lv = band('Ring of living');
  const nt = band('Ring of nature');
  // Streets inside each ring: two in knowledge, three in making; terraces in living.
  for (const f of [1 / 3, 2 / 3]) m.poly(circle(lerp(kn.r0, kn.r1, f)), true, road, { w: 0.6 });
  for (const f of [0.25, 0.5, 0.75]) m.poly(circle(lerp(mk.r0, mk.r1, f)), true, road, { w: 0.55 });
  for (const f of [1 / PHI ** 3, 1 / PHI ** 2, 1 / PHI])
    m.poly(circle(lerp(lv.r0, lv.r1, f)), true, edge, { w: 0.7 });
  // Lanes across the rings of making and living, between the boulevards.
  for (let j = 0; j < 72; j++) {
    const a = ((j + 0.5) / 72) * TAU;
    if (j % 2 === 0) m.line(polar(mk.r0, a), polar(mk.r1, a), road, { w: 0.45 });
    m.line(polar(lv.r0, a), polar(lv.r1, a), road, { w: 0.35 });
  }
  // Towers in the ring of knowledge, two between each pair of boulevards: seen from above, points of light.
  for (let j = 0; j < 2 * GOLDEN.spokes; j++) {
    const a = ((j + 0.5) / (2 * GOLDEN.spokes)) * TAU;
    const at = polar((kn.r0 + kn.r1) / 2, a);
    m.line(at, [at[0], G + 2.4, at[2]], light, { w: 1.5 });
  }
  // Lit blocks: soft dots along the streets, more toward the heart.
  for (let j = 0; j < 600; j++) {
    const r = lerp(kn.r0, lv.r1, Math.sqrt(hash(j, 401)));
    if (GOLDEN.bands[bandIndex(r)]?.kind !== 'land') continue;
    m.dot(polar(r, hash(j, 402) * TAU, G + 0.05), 0.45, face, { w: Math.exp(-r / 18) });
  }
  // Fields and woods in the ring of nature.
  for (let j = 0; j < 24; j++)
    m.line(polar(nt.r0, (j / 24) * TAU), polar(nt.r1, (j / 24) * TAU), ground, { w: 0.6 });
  for (let j = 0; j < 220; j++) {
    const r = lerp(nt.r0 + 1, nt.r1 - 1, hash(j, 403));
    m.dot(polar(r, hash(j, 404) * TAU, G + 0.3), 0.5 + 0.6 * hash(j, 405), plant, { w: 0.5 });
  }
  // The twelve boulevards, and travellers walking slowly along them, in toward the heart and out.
  for (let k = 0; k < GOLDEN.spokes; k++) {
    const a = spokeAngle(k);
    m.line(polar(GOLDEN.unit, a), polar(GOLDEN.outer + 1, a), road, { w: 1.8 });
    const side: Vec3 = [-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35];
    const off = (q: Vec3, s: number): Vec3 => [q[0] + side[0] * s, q[1] + 0.05, q[2] + side[2] * s];
    m.line(off(polar(GOLDEN.outer, a), 1), off(polar(GOLDEN.unit, a), 1), light, {
      anim: Anim.flow,
      key: 2.2,
      w: 0.45,
    });
    m.line(off(polar(GOLDEN.unit, a), -1), off(polar(GOLDEN.outer, a), -1), light, {
      anim: Anim.flow,
      key: 2.2,
      w: 0.45,
    });
  }
  return m;
}

let planBuilt: Built | null = null;
const plan = () => {
  if (!planBuilt) planBuilt = planMesh().build();
  return planBuilt;
};
const PLAN_SHARES: Shares = { lines: 0.74, faces: 0.8 };

/** How far ring i has come into the light, `u` through the plan: the heart first, then outward. */
export const revealed = (i: number, u: number) => smooth((u - 0.05 - 0.07 * i) / 0.08);
/** Brighter toward the heart: hope as a gradient. */
export const hopeAt = (r: number) => 0.6 + 0.4 * Math.exp(-r / 16);

export function goldenPlanEye(u: number, t: number): Eye {
  return orbit(0.5 + t * 0.01, 1.08, 100 - 8 * u, [0, G, 0]);
}

export function goldenPlanAt(p: Particle, u: number, t: number): { pos: Vec3; rgb: RGB } {
  if (p.c < STARS) return starAt(p, t, [0, G, 0]);
  const h = onMesh(plan(), p, (p.c - STARS) / (1 - STARS), t, goldenPlanEye(u, t).eye, PLAN_SHARES);
  const r = Math.hypot(h.pos[0], h.pos[2]);
  const rgb = glow(h, p, t, hopeAt(r) * revealed(bandIndex(r), u), 0.25 * Math.exp(-r / 6));
  return { pos: h.pos, rgb };
}

/* ---------- 2. Rising: the city rises from its plan ---------- */

/*
 * 2026-11-12: "then imagine one 3d design of golden city rising from the
 * map." The same rings, lifted by one rule: φ times higher each ring toward
 * the heart. Nature stays low, the living ring steps down in three terraces,
 * the ring of making stands φ³ high, the ring of knowledge φ⁴ with a tower φ⁵
 * high in every sector; the canals stay flat and shine.
 */

/** A block between two boulevards, from r0 to r1, h high: walls and roof as faces, its edges lit. */
function sector(m: Mesh, r0: number, r1: number, a0: number, a1: number, h: number) {
  const { face, edge } = Tone;
  const n = Math.max(2, Math.ceil(((a1 - a0) * r1) / 1.6));
  const am = (a0 + a1) / 2;
  m.centre = polar((r0 + r1) / 2, am, G + h / 2);
  const arcAt = (r: number, y: number) =>
    Array.from({ length: n + 1 }, (_, i) => polar(r, lerp(a0, a1, i / n), y));
  const lo0 = arcAt(r0, G);
  const lo1 = arcAt(r1, G);
  const up: Vec3 = [0, h, 0];
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  for (let i = 0; i < n; i++) {
    for (const lo of [lo0, lo1])
      m.quad(lo[i] as Vec3, sub(lo[i + 1] as Vec3, lo[i] as Vec3), up, face);
    const A = lo0[i] as Vec3;
    const B = lo0[i + 1] as Vec3;
    const D = lo1[i] as Vec3;
    const top = (q: Vec3): Vec3 => [q[0], q[1] + h, q[2]];
    m.tri(top(A), top(B), top(lo1[i + 1] as Vec3), face);
    m.tri(top(A), top(lo1[i + 1] as Vec3), top(D), face);
  }
  for (const lo of [lo0, lo1]) {
    m.poly(lo, false, edge, { w: 0.15 });
    m.poly(
      lo.map((q) => [q[0], q[1] + h, q[2]] as Vec3),
      false,
      edge,
      { w: 1.4 },
    );
  }
  for (const i of [0, n]) {
    const A = lo0[i] as Vec3;
    const B = lo1[i] as Vec3;
    m.quad(A, sub(B, A), up, face);
    m.line(A, [A[0], A[1] + h, A[2]], edge, { w: 1.6 });
    m.line(B, [B[0], B[1] + h, B[2]], edge, { w: 1.6 });
  }
}

/** The stretch between two boulevards cut into n blocks, a lane 0.9 wide between each. */
function blocks(m: Mesh, r0: number, r1: number, a0: number, a1: number, h: number, n: number) {
  const lane = 0.9 / ((r0 + r1) / 2);
  const w = (a1 - a0 - lane * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const b0 = a0 + i * (w + lane);
    sector(m, r0, r1, b0, b0 + w, h);
  }
}

function risingMesh(): Mesh {
  const m = new Mesh();
  const { road, light, water, plant, edge } = Tone;
  const H = GOLDEN.heights;
  // The heart: a round garden, and a small open sphere of light floating over it.
  m.centre = [0, G - 10, 0];
  for (let n = 0; n < 233; n++)
    m.dot(polar(2.8 * Math.sqrt((n + 0.5) / 233), n * GOLDEN_ANGLE, G + 0.05), 0.08, light, {
      w: 0.05,
    });
  m.pivot = [0, G + 4.5, 0];
  for (let k = 0; k < 12; k++) {
    const a = spokeAngle(k);
    m.poly(
      Array.from({ length: 13 }, (_, j) => {
        const lat = -Math.PI / 2 + (j / 12) * Math.PI;
        return [
          Math.cos(a) * Math.cos(lat) * 1.6,
          G + 4.5 + Math.sin(lat) * 1.6,
          Math.sin(a) * Math.cos(lat) * 1.6,
        ] as Vec3;
      }),
      false,
      light,
      { anim: Anim.breathe, w: 0.8 },
    );
  }
  for (const b of GOLDEN.bands) {
    if (b.kind === 'water') {
      m.disc([0, G, 0], b.r1, water, b.r0, { w: 0.8 });
      m.poly(circle(b.r0), true, edge, { w: 0.6 });
      m.poly(circle(b.r1), true, edge, { w: 0.6 });
    }
  }
  const half = GOLDEN.boulevard / 2;
  for (let k = 0; k < GOLDEN.spokes; k++) {
    const a0 = spokeAngle(k);
    const a1 = spokeAngle(k + 1);
    const inset = (r: number) => (half + 0.6) / r;
    const kn = band('Ring of knowledge');
    const mk = band('Ring of making');
    const lv = band('Ring of living');
    const nt = band('Ring of nature');
    const rk = (kn.r0 + kn.r1) / 2;
    sector(m, kn.r0 + 0.3, kn.r1 - 0.3, a0 + inset(rk), a1 - inset(rk), H.knowledge);
    // A tower in every sector of the ring of knowledge.
    const am = (a0 + a1) / 2;
    m.box(
      polar(rk, am, G + H.knowledge),
      0.9,
      H.tower - H.knowledge,
      0.9,
      Tone.face,
      Tone.edge,
      -am,
    );
    m.dot(polar(rk, am, G + H.tower + 0.6), 0.4, light, { w: 0.6 });
    // Two halls in each sector of the ring of making.
    const rm = (mk.r0 + mk.r1) / 2;
    blocks(m, mk.r0 + 0.3, rm - 0.3, a0 + inset(rm), a1 - inset(rm), H.making, 1);
    blocks(m, rm + 0.3, mk.r1 - 0.3, a0 + inset(rm), a1 - inset(rm), H.making / PHI, 1);
    // Three terraces in the ring of living, one block each, stepping down outward by φ.
    const steps = [lv.r0 + 0.3, lerp(lv.r0, lv.r1, 1 / 3), lerp(lv.r0, lv.r1, 2 / 3), lv.r1 - 0.3];
    for (let s = 0; s < 3; s++) {
      const r = (steps[s] as number) + 0.15;
      blocks(
        m,
        r,
        (steps[s + 1] as number) - 0.15,
        a0 + inset(r),
        a1 - inset(r),
        H.living / PHI ** s,
        1,
      );
    }
    // The ring of nature stays low: woods and fields.
    for (let j = 0; j < 22; j++) {
      const r = lerp(nt.r0 + 1, nt.r1 - 1, hash(k * 40 + j, 411));
      const a = lerp(a0 + inset(r) * 2, a1 - inset(r) * 2, hash(k * 40 + j, 412));
      const tall = H.nature + hash(k * 40 + j, 413);
      m.line(polar(r, a), polar(r, a, G + tall), plant, { w: 0.2 });
      m.dot(polar(r, a, G + tall), 0.5 + 0.4 * hash(k * 40 + j, 414), plant, { w: 0.1 });
    }
    m.line(polar(GOLDEN.unit, a0), polar(GOLDEN.outer + 1, a0), road, { w: 1.4 });
  }
  return m;
}

let risingBuilt: Built | null = null;
const rising = () => {
  if (!risingBuilt) risingBuilt = risingMesh().build();
  return risingBuilt;
};
const RISING_SHARES: Shares = { lines: 0.5, faces: 0.92 };

/** How far ring i has risen, `u` through the piece: flat as a map at first, the heart rising first. */
export const risen = (i: number, u: number) => smooth((u - 0.12 - 0.04 * i) / 0.2);

export function risingEye(u: number, t: number): Eye {
  const tilt = smooth((u - 0.12) / 0.6);
  return orbit(0.4 + t * 0.018, lerp(1.38, 0.38, tilt), lerp(108, 58, tilt), [0, G + 2, 0]);
}

export function risingAt(p: Particle, u: number, t: number): { pos: Vec3; rgb: RGB } {
  if (p.c < STARS) return starAt(p, t, [0, G, 0]);
  const h = onMesh(rising(), p, (p.c - STARS) / (1 - STARS), t, risingEye(u, t).eye, RISING_SHARES);
  const r = Math.hypot(h.pos[0], h.pos[2]);
  const k = Math.max(0.01, risen(bandIndex(r), u));
  const pos: Vec3 = [h.pos[0], G + (h.pos[1] - G) * k, h.pos[2]];
  return { pos, rgb: glow(h, p, t, hopeAt(r), 0.2 * Math.exp(-r / 6)) };
}

/* ---------- 3. The heart: the centre up close ---------- */

/*
 * An open golden sphere, a lattice of light, not a solid ball, floating over
 * a round garden where all twelve boulevards meet, breathing slowly; low
 * terraces stepping down round it to the inner canal; slow ships far above.
 * It belongs to no one: open, light.
 */

/** The heart drawn K times the plan's size. */
export const HEART_K = 5;
const PLAZA_Y = 2.4;
export const SPHERE_R = 5.5;
export const SPHERE_C: Vec3 = [0, G + PLAZA_Y + 4 + SPHERE_R, 0];

function heartMesh(): Mesh {
  const m = new Mesh();
  const { road, edge, light, water, plant, face, ground } = Tone;
  const R = GOLDEN.unit * HEART_K;
  const plazaR = R / PHI;
  // The garden: florets on the golden angle, paths along the twelve boulevards, a round basin.
  m.centre = [0, G - 10, 0];
  const N = 610;
  for (let n = 0; n < N; n++) {
    const r = 1.8 + (plazaR - 2) * Math.sqrt((n + 0.5) / N);
    m.dot(polar(r, n * GOLDEN_ANGLE, G + PLAZA_Y + 0.1), 0.22, n % 5 ? plant : light, { w: 0.1 });
  }
  m.disc([0, G + PLAZA_Y, 0], 1.6, water, 0, { w: 0.8 });
  m.poly(circle(1.6, G + PLAZA_Y), true, edge);
  m.disc([0, G + PLAZA_Y, 0], plazaR, ground, 1.6, { w: 0.25 });
  // Terraces stepping down from the garden to the canal, four steps.
  for (let s = 0; s < 4; s++) {
    const r = lerp(plazaR, R, s / 4);
    const y = G + PLAZA_Y * (1 - s / 4);
    m.centre = [0, G - 10, 0];
    m.cylinder([0, 0, 0], r, y - PLAZA_Y / 4, y, face, edge, 0);
    m.disc([0, y - PLAZA_Y / 4, 0], lerp(plazaR, R, (s + 1) / 4), ground, r, { w: 0.3 });
  }
  // The inner canal, and the boulevards crossing it on arched bridges.
  const cn = band('Inner canal');
  m.disc([0, G, 0], cn.r1 * HEART_K, water, cn.r0 * HEART_K, { w: 0.5 });
  m.poly(circle(cn.r1 * HEART_K), true, edge, { w: 0.7 });
  for (let k = 0; k < GOLDEN.spokes; k++) {
    const a = spokeAngle(k);
    m.line(polar(1.6, a, G + PLAZA_Y + 0.05), polar(plazaR, a, G + PLAZA_Y + 0.05), road, {
      w: 1.5,
    });
    const side: Vec3 = [-Math.sin(a), 0, Math.cos(a)];
    for (const s of [-1.2, 1.2]) {
      const off = (q: Vec3): Vec3 => [q[0] + side[0] * s, q[1], q[2] + side[2] * s];
      m.line(off(polar(R, a, G + 0.05)), off(polar(R * 4, a, G + 0.05)), road, { w: 0.8 });
      const span = (cn.r1 - cn.r0) * HEART_K;
      m.poly(
        Array.from({ length: 13 }, (_, j) => {
          const f = j / 12;
          return off(polar(cn.r0 * HEART_K + span * f, a, G + Math.sin(Math.PI * f) * span * 0.25));
        }),
        false,
        edge,
        { w: 1.3 },
      );
      for (let j = 0; j < 10; j++)
        m.dot(off(polar(R * (1.3 + j * 0.28), a, G + 0.6)), 0.15, light, { w: 0.2 });
    }
  }
  // The near edge of the ring of knowledge: low towers past the canal.
  for (let j = 0; j < 24; j++) {
    const a = ((j + 0.5) / 24) * TAU;
    const r = band('Ring of knowledge').r0 * HEART_K + 4.5;
    m.box(polar(r, a), 1.6, 6 + 4 * hash(j, 421), 1.6, face, edge, -a);
  }
  // The open sphere: twelve meridians over the boulevards, parallels at ±1/φ², ±1/φ, nodes of light.
  m.pivot = SPHERE_C;
  const o = { anim: Anim.breathe };
  const S = SPHERE_R;
  const C = SPHERE_C;
  const lats = [0, 1 / PHI ** 2, -1 / PHI ** 2, 1 / PHI, -1 / PHI].map((s) => Math.asin(s));
  for (let k = 0; k < 12; k++) {
    const a = spokeAngle(k);
    m.poly(
      Array.from({ length: 25 }, (_, j) => {
        const lat = -Math.PI / 2 + (j / 24) * Math.PI;
        return [
          C[0] + Math.cos(a) * Math.cos(lat) * S,
          C[1] + Math.sin(lat) * S,
          C[2] + Math.sin(a) * Math.cos(lat) * S,
        ] as Vec3;
      }),
      false,
      edge,
      { ...o, w: 1.2 },
    );
    for (const lat of lats)
      m.dot(
        [
          C[0] + Math.cos(a) * Math.cos(lat) * S,
          C[1] + Math.sin(lat) * S,
          C[2] + Math.sin(a) * Math.cos(lat) * S,
        ],
        0.18,
        light,
        { ...o, w: 0.5 },
      );
  }
  for (const lat of lats)
    m.poly(Mesh.circle([C[0], C[1] + Math.sin(lat) * S, C[2]], Math.cos(lat) * S, 48), true, edge, {
      ...o,
      w: 1.1,
    });
  m.dot(C, 1.2, light, { anim: Anim.pulse, key: 0, w: 1.5 });
  // Motes of light rising slowly from the garden toward the sphere.
  for (let j = 0; j < 30; j++)
    m.dot(
      polar(plazaR * Math.sqrt(hash(j, 422)), hash(j, 423) * TAU, G + PLAZA_Y + 0.3),
      0.3,
      light,
      { anim: Anim.rise, key: 9, w: 0.5 },
    );
  // Slow ships far above, circling the heart.
  m.pivot = SPHERE_C;
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * TAU;
    const r = 30 + 14 * hash(j, 424);
    const y = G + 42 + 10 * hash(j, 425);
    const c = polar(r, a, y);
    const f: Vec3 = [-Math.sin(a), 0, Math.cos(a)];
    const s: Vec3 = [Math.cos(a), 0, Math.sin(a)];
    const at = (x: number, z: number): Vec3 => [
      c[0] + f[0] * x + s[0] * z,
      y,
      c[2] + f[2] * x + s[2] * z,
    ];
    const os = { anim: Anim.orbit, key: 0.02 };
    m.poly([at(1.2, 0), at(-0.8, 0.8), at(-0.5, 0), at(-0.8, -0.8)], true, edge, { ...os, w: 1 });
    m.line(at(-0.5, 0), at(-4, 0), light, { ...os, w: 0.6 });
  }
  return m;
}

let heartBuilt: Built | null = null;
const heart = () => {
  if (!heartBuilt) heartBuilt = heartMesh().build();
  return heartBuilt;
};
const HEART_SHARES: Shares = { lines: 0.48, faces: 0.8 };

export function heartEye(t: number): Eye {
  return orbit(0.3 + t * 0.02, 0.2, 48, [0, G + 7, 0]);
}

export function heartAt(p: Particle, t: number): { pos: Vec3; rgb: RGB } {
  if (p.c < STARS) return starAt(p, t, [0, G, 0]);
  const h = onMesh(heart(), p, (p.c - STARS) / (1 - STARS), t, heartEye(t).eye, HEART_SHARES);
  const r = Math.hypot(h.pos[0], h.pos[2]) / HEART_K;
  // The sphere breathes light: brighter as it swells.
  const breath = 0.85 + 0.15 * Math.sin((TAU * t) / 9);
  const near =
    Math.hypot(h.pos[0] - SPHERE_C[0], h.pos[1] - SPHERE_C[1], h.pos[2] - SPHERE_C[2]) <
    SPHERE_R * 1.2;
  return {
    pos: h.pos,
    rgb: glow(h, p, t, hopeAt(r) * (near ? breath * 1.2 : 1), 0.15 * Math.exp(-r / 3)),
  };
}

/* ---------- 4–6. Temples, factories, domes ---------- */

const builtSets = new Map<BuildingSet, (Built | null)[]>();
export function building(set: BuildingSet, i: number): Built {
  let list = builtSets.get(set);
  if (!list) {
    list = set.names.map(() => null);
    builtSets.set(set, list);
  }
  const k = set.names[i] ? i : 0;
  const got = list[k];
  if (got) return got;
  const b = buildingMesh(set, k).build();
  list[k] = b;
  return b;
}
const BUILDING_SHARES: Shares = { lines: 0.42, faces: 0.84 };

/** Slowly round the building, a little above it. */
export function buildingEye(t: number): Eye {
  return orbit(0.8 + t * 0.035, 0.32, 46, [0, G + 6, 0]);
}

export function buildingAt(
  set: BuildingSet,
  i: number,
  p: Particle,
  t: number,
): { pos: Vec3; rgb: RGB } {
  if (p.c < STARS) return starAt(p, t, [0, G, 0]);
  const h = onMesh(
    building(set, i),
    p,
    (p.c - STARS) / (1 - STARS),
    t,
    buildingEye(t).eye,
    BUILDING_SHARES,
  );
  return { pos: h.pos, rgb: glow(h, p, t) };
}
