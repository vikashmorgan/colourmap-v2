/*
 * ATLANTIS — the golden city under the sea, a City Studio piece (docs/specs/art-city.md).
 *
 * 2026-11-12: "add Atlantis as a city, with marine life around it, like ocean, and spaceships are
 * submarines that leave a trail of bubbles etc... think map, different compartments etc...
 * develop. has coral gardens in some parts etc..."
 *
 * The golden city's plan (GOLDEN, read only) laid on the sea floor: its land rings hold glass
 * domes and pressure compartments joined by tubes, its canals become trenches walled on both
 * banks where coral gardens and kelp grow, and the open heart becomes a temple under a tall
 * glass dome, its lattice sphere glowing through the water. Submarines cruise in lanes over the
 * canals and along four long loops out to the harbour, each lane in one colour, every
 * submarine leaving a stream of bubbles that rise and fade. Fish schools, jellyfish, mantas and
 * far whales live round it; plankton drifts; light shafts fall from the surface; caustics
 * shimmer on the sand and the glass. Everything drifts slowly, never flashes.
 *
 * Five views on pills: Plan, Domes, Coral gardens, The heart, Harbour.
 *
 * Pure: no three.js, no DOM.
 */

import {
  fibonacciSphere,
  hash,
  type Particle,
  type Phase,
  type RGB,
  smooth,
  type Vec3,
} from './bigbang';
import { band, GOLDEN } from './golden-city';
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

const TAU = Math.PI * 2;
const G = GROUND_Y;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const frac = (x: number) => x - Math.floor(x);
const wrap = (x: number, n: number) => ((x % n) + n) % n;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const polar = (r: number, a: number, y: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];

type Spot = { pos: Vec3; rgb: RGB };
export type Eye = { eye: Vec3; target: Vec3 };

/* ---------- the piece and its views ---------- */

export const ATLANTIS_PHASE: Phase & { words: string[] } = {
  id: 'atlantis',
  name: 'Atlantis',
  line: 'The golden city under the sea: glass domes and compartments on its rings joined by tubes, coral gardens in its canals, its heart glowing through the water, submarines trailing bubbles in their lanes, fish, mantas and jellyfish all round.',
  words: [
    'A city can keep its light even at the bottom of the sea.',
    'Every bubble rising is someone travelling home.',
  ],
  duration: 40,
  glow: 1,
  size: 1.2,
};

export const ATLANTIS_VIEWS = ['Plan', 'Domes', 'Coral gardens', 'The heart', 'Harbour'] as const;
let view = 0;
/** The pills under Atlantis. */
export const ATLANTIS_VARIANTS = {
  names: [...ATLANTIS_VIEWS] as string[],
  label: 'View',
  set: (i: number) => {
    view = ATLANTIS_VIEWS[i] ? i : 0;
  },
};
export const atlantisView = () => view;

/* ---------- the plan: GOLDEN's rings, under the sea ---------- */

const HEART = band('Heart');
const INNER = band('Inner canal');
const KNOW = band('Ring of knowledge');
const MAKE = band('Ring of making');
const MIDDLE = band('Middle canal');
const LIVE = band('Ring of living');
const OUTER = band('Outer canal');
const NATURE = band('Ring of nature');
const mid = (b: { r0: number; r1: number }) => (b.r0 + b.r1) / 2;
const SECTORS = GOLDEN.spokes;
const sectorAngle = (k: number) => ((k + 0.5) / SECTORS) * TAU;
const spokeAngle = (k: number) => (k / SECTORS) * TAU;

const CANALS = [INNER, MIDDLE, OUTER];
/** The canals are trenches this deep, walled on both banks. */
export const TRENCH = 1.2;
const WALL_TOP = 1.4;
/** The basin's rocky rim begins here. */
const RIM = 58;
/** The surface, far above. */
const SURFACE = G + 44;

/** The sea floor's height at (x, z): the land rings flat, the canals sunk, the rim rising. */
export function floorAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  for (const c of CANALS) if (r > c.r0 && r < c.r1) return G - TRENCH;
  if (r < RIM) return G;
  const a = Math.atan2(z, x);
  return G + smooth((r - RIM) / 9) * (5 + 2 * Math.sin(a * 7) + 1.2 * Math.sin(a * 17 + 1));
}

/** Compartments a submarine must keep clear of: centre and radius of each dome's bounding sphere. */
export type Compartment = { c: Vec3; r: number; kind: string };
export const COMPARTMENTS: Compartment[] = [];

const KNOW_R = 1.7;
const MAKE_R = 1.9;
const LIVE_R = 3.6;
const TUBE_Y = G + 0.9;
const TUBE_R = 0.35;
const HEART_DOME_H = 5.2;
/** Garden domes in the ring of living (even sectors); the odd ones hold terraced homes. */
export const isGardenDome = (k: number) => k % 2 === 0;
/** Reef sectors of the ring of nature; the harbour sits on boulevard 0. */
export const REEF_SECTORS = [2, 4, 6, 8, 10];
/** Nature sectors holding a cluster of domes. */
export const NATURE_DOME_SECTORS = [1, 5, 9];
export const HARBOUR = { x0: 38.6, x1: 53, gate: 55.5, hall: 36.4 };
export const BERTHS: Vec3[] = [40.4, 43.4, 46.4, 49.4].flatMap((x) => [
  [x, G + 1.5, 2.7] as Vec3,
  [x, G + 1.5, -2.7] as Vec3,
]);

/** A level ring standing upright round centre c, facing `axis` (a horizontal unit vector). */
function uprightRing(m: Mesh, c: Vec3, axis: Vec3, r: number, tone: number, n = 12, o = {}) {
  const side = norm(cross(axis, [0, 1, 0]));
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    return add(add(c, side, Math.cos(a) * r), [0, 1, 0], Math.sin(a) * r);
  });
  m.poly(pts, true, tone, o);
}

/**
 * A glass tunnel from a to b at radius r (2026-11-12: "glass tunnels between them"): a faint
 * skin of glass, a gold rib every 1.5 and two gold rails along its top, and a lit walkway along
 * its floor with lights running both ways.
 */
function tube(m: Mesh, a: Vec3, b: Vec3, r = TUBE_R) {
  const ax = norm(sub(b, a));
  const side = norm(cross(ax, [0, 1, 0]));
  const up = cross(side, ax);
  const L = dist(a, b);
  const n = Math.max(1, Math.floor(L / 1.5));
  m.surface(
    (u, v) => {
      const e = v * TAU;
      return add(add(add(a, ax, u * L), side, Math.cos(e) * r), up, Math.sin(e) * r);
    },
    n,
    8,
    Tone.glass,
    { two: true, w: 0.3 },
  );
  for (const s of [1, -1]) {
    const o = add(scale(side as RGB, s * r * 0.7) as Vec3, up, r * 0.7);
    m.line(add(a, o), add(b, o), Tone.edge, { w: 0.3 });
  }
  for (let i = 0; i <= n; i++)
    uprightRing(m, add(a, ax, (i / n) * L), ax, r, Tone.edge, 8, { w: 0.3 });
  // The walkway: a lit strip along the floor, lights running both ways along it.
  const floor = scale(up as RGB, -r * 0.6) as Vec3;
  for (const s of [1, -1]) {
    const o = add(floor, side, s * r * 0.35);
    m.line(add(a, o), add(b, o), Tone.road, { w: 0.22 });
  }
  // Lights only run along long tunnels: on a short one a running light would wrap round too
  // quickly and blink, so short tunnels keep a steady lit walkway.
  const run = L > 8 ? { anim: Anim.flow, key: 1.6, w: 0.45 } : { w: 0.25 };
  m.line(add(add(a, floor), side, 0.08), add(add(b, floor), side, 0.08), Tone.road, run);
  m.line(add(add(b, floor), side, -0.08), add(add(a, floor), side, -0.08), Tone.road, run);
}

/**
 * A round porthole ("hublot") on a wall at c, facing out along n: a gold frame and a warm light
 * glowing through it from inside, breathing slowly on its own beat.
 */
function porthole(m: Mesh, c: Vec3, n: Vec3, r: number, key: number) {
  uprightRing(m, c, n, r, Tone.edge, 10, { w: 0.12 });
  m.dot(c, r * 0.7, Tone.light, { anim: Anim.pulse, key, w: 0.12 * r * 10 });
}

/** A ring of `count` portholes round a drum at c of radius R, at height y. */
function portholes(m: Mesh, c: Vec3, R: number, y: number, count: number, r: number, key: number) {
  for (let j = 0; j < count; j++) {
    const a = (j / count) * TAU + key;
    const n: Vec3 = [Math.cos(a), 0, Math.sin(a)];
    porthole(m, [c[0] + n[0] * (R + 0.02), y, c[2] + n[2] * (R + 0.02)], n, r, key * 3 + j);
  }
}

/** A tube bent along a level arc of radius R from angle a0 to a1. */
function arcTube(m: Mesh, R: number, a0: number, a1: number, y: number) {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * R) / 1.4));
  for (let i = 0; i < n; i++)
    tube(m, polar(R, lerp(a0, a1, i / n), y), polar(R, lerp(a0, a1, (i + 1) / n), y));
}

/** A glass dome over (x, G, z): a hemisphere of glass faces, its meridians and parallels gold. */
function glassDome(m: Mesh, c: Vec3, r: number, h = r, nu = 16, nv = 5) {
  const keep = m.centre;
  m.centre = c;
  m.surface(
    (u, v) => {
      const a = u * TAU;
      const e = (v * Math.PI) / 2;
      return [
        c[0] + Math.cos(a) * Math.cos(e) * r,
        c[1] + Math.sin(e) * h,
        c[2] + Math.sin(a) * Math.cos(e) * r,
      ];
    },
    nu,
    nv,
    Tone.glass,
    { two: true, w: 0.55 },
    { tone: Tone.edge, uEvery: 2, vEvery: 1, opts: { w: 1.7 } },
  );
  m.centre = keep;
}

/*
 * Each close view keeps only the part of the city and its reefs the eye flies through, so the
 * fixed grain budget lands where it is seen (the whole city is 130 across: spread over all of
 * it, a close view would get a thin scatter). The Plan keeps everything.
 */
type Crop = ((q: Vec3) => boolean) | null;
let crop: Crop = null;
/** A mesh that only keeps elements whose middle passes the current crop. */
class CropMesh extends Mesh {
  override line(a: Vec3, b: Vec3, tone: number, o = {}) {
    if (!crop || crop([(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2])) super.line(a, b, tone, o);
  }
  override tri(a: Vec3, b: Vec3, c: Vec3, tone: number, o = {}) {
    if (!crop || crop([(a[0] + b[0] + c[0]) / 3, 0, (a[2] + b[2] + c[2]) / 3]))
      super.tri(a, b, c, tone, o);
  }
  override dot(at: Vec3, r: number, tone: number, o = {}) {
    if (!crop || crop(at)) super.dot(at, r, tone, o);
  }
}
const angDist = (a: number, c: number) => Math.abs(wrap(a - c + Math.PI, TAU) - Math.PI);
const angleOf = (q: Vec3) => Math.atan2(q[2], q[0]);
const radiusOf = (q: Vec3) => Math.hypot(q[0], q[2]);
/** What each view keeps of the city and the reefs. */
export const VIEW_CROPS: Crop[] = [
  null,
  (q) => angDist(angleOf(q), 0.95) < 0.62 && radiusOf(q) < 36.5 && radiusOf(q) > 8,
  (q) => angDist(angleOf(q), 2.4) < 0.6 && radiusOf(q) > 30 && radiusOf(q) < 50,
  (q) => radiusOf(q) < 15,
  (q) => q[0] > 27 && Math.abs(q[2]) < 18,
];
/** Notes a compartment, on the full build only. */
const note = (c: Compartment) => {
  if (!crop) COMPARTMENTS.push(c);
};

/** The city's buildings, walls and tubes (the heart's temple and the harbour apart). */
function cityMesh(): Mesh {
  const m = new CropMesh();
  m.centre = [0, G - 10, 0];
  if (!crop) COMPARTMENTS.length = 0;
  // The plan on the floor: every bank a line, so the rings read from above.
  for (const b of GOLDEN.bands.slice(1)) {
    const y = b.kind === 'water' ? G - TRENCH : G;
    m.ring([0, G + 0.02, 0], b.r0, Tone.road, { w: 0.9 }, Math.ceil(TAU * b.r0));
    if (b.kind === 'water')
      m.ring([0, y + 0.02, 0], mid(b), Tone.water, { w: 0.35 }, Math.ceil(TAU * mid(b)));
  }
  // Ring walls on both banks of every canal, from the trench floor up: Plato's rings of wall.
  for (const c of [INNER, MIDDLE, OUTER]) {
    const top = c === INNER ? G + 0.6 : G + WALL_TOP;
    for (const r of [c.r0, c.r1]) {
      // A faint wall, its top edge bright: the rings read without spending the budget on stone.
      const n = Math.ceil(TAU * r * 0.6);
      m.surface((u, v) => polar(r, u * TAU, lerp(G - TRENCH, top, v)), n, 1, Tone.face, {
        w: 0.25,
      });
      m.ring([0, top, 0], r, Tone.edge, { w: 1.2 }, Math.ceil(TAU * r));
    }
  }
  // Ring of knowledge: six geodesic domes in the even sectors, lit inside; slim pressure towers between.
  for (let k = 0; k < SECTORS; k++) {
    const a = sectorAngle(k);
    const at = polar(mid(KNOW), a, G);
    if (k % 2 === 0) {
      m.geodesic(at, KNOW_R, 2, Tone.glass, Tone.edge, -0.05, { two: true });
      m.dot([at[0], G + 0.6, at[2]], 0.9, Tone.light, { anim: Anim.pulse, key: k, w: 0.5 });
      note({ c: at, r: KNOW_R, kind: 'knowledge' });
    } else {
      m.cylinder(at, 0.6, G, G + 2.8, Tone.face, Tone.edge, 4, 10);
      for (const y of [0.8, 1.6, 2.4]) portholes(m, at, 0.6, G + y, 4, 0.12, k + y);
      m.dot([at[0], G + 2.95, at[2]], 0.18, Tone.light, { anim: Anim.pulse, key: k * 1.7, w: 0.2 });
      note({ c: [at[0], G + 1.4, at[2]], r: 1.5, kind: 'tower' });
    }
  }
  // Ring of making: twelve pressure compartments, drums under low glass caps, portholes round them.
  for (let k = 0; k < SECTORS; k++) {
    const at = polar(mid(MAKE), sectorAngle(k), G);
    m.cylinder(at, MAKE_R, G, G + 1.8, Tone.face, Tone.edge, 8, 18);
    m.ring([at[0], G + 0.9, at[2]], MAKE_R, Tone.edge, { w: 0.4 }, 18);
    glassDome(m, [at[0], G + 1.8, at[2]], MAKE_R, 0.9, 12, 3);
    portholes(m, at, MAKE_R, G + 1.25, 10, 0.2, k);
    note({ c: [at[0], G + 1.2, at[2]], r: 2.3, kind: 'making' });
  }
  // Ring of living: twelve great domes, gardens in the even sectors, terraced homes in the odd.
  for (let k = 0; k < SECTORS; k++) {
    const at = polar(mid(LIVE), sectorAngle(k), G);
    m.cylinder(at, LIVE_R, G, G + 0.7, Tone.face, Tone.edge, 0, 26);
    portholes(m, at, LIVE_R, G + 0.38, 14, 0.18, k * 1.3);
    glassDome(m, [at[0], G + 0.7, at[2]], LIVE_R);
    note({ c: at, r: LIVE_R, kind: isGardenDome(k) ? 'garden' : 'homes' });
    if (isGardenDome(k)) continue;
    [2.8, 2.0, 1.2].forEach((r, i) => {
      const y = G + 0.4 + 0.6 * i;
      m.ring([at[0], y, at[2]], r, Tone.edge, { w: 0.7 }, 20);
      for (let j = 0; j < 9 - 2 * i; j++) {
        const a = (j / (9 - 2 * i)) * TAU + i;
        m.dot([at[0] + Math.cos(a) * r, y + 0.15, at[2] + Math.sin(a) * r], 0.12, Tone.light, {
          anim: Anim.pulse,
          key: k * 3 + j,
          w: 0.1,
        });
      }
    });
  }
  // Ring corridors joining the compartments of making and of living, airlock porches at each door.
  for (const [R, rr] of [
    [mid(MAKE), MAKE_R],
    [mid(LIVE), LIVE_R],
  ] as const) {
    const gap = Math.asin((rr + 0.1) / R);
    for (let k = 0; k < SECTORS; k++) {
      const a0 = sectorAngle(k) + gap;
      const a1 = sectorAngle(k + 1) - gap;
      arcTube(m, R, a0, a1, TUBE_Y);
      for (const a of [a0, a1])
        uprightRing(m, polar(R, a, TUBE_Y), [-Math.sin(a), 0, Math.cos(a)], 0.55, Tone.edge, 10);
    }
  }
  // Twelve tubes, the boulevards, from the heart's dome out across every ring; spoke 0 on to the harbour.
  for (let k = 0; k < SECTORS; k++) {
    const a = spokeAngle(k);
    const r1 = k === 0 ? HARBOUR.hall - 2.4 : OUTER.r1 + 0.4;
    tube(m, polar(HEART.r1, a, TUBE_Y), polar(r1, a, TUBE_Y));
    // Airlocks on both banks of every canal it crosses: drums standing on the bank, a lamp on top.
    for (const c of [INNER, MIDDLE, OUTER]) {
      if (c === INNER) continue;
      for (const r of [c.r0 - 0.8, c.r1 + 0.8]) {
        const at = polar(r, a, G);
        m.cylinder(at, 0.75, G, G + 2.2, Tone.face, Tone.edge, 4, 10);
        portholes(m, at, 0.75, G + 1.5, 3, 0.14, k + r);
        m.dot([at[0], G + 2.35, at[2]], 0.16, Tone.light, {
          anim: Anim.pulse,
          key: k + r,
          w: 0.15,
        });
        note({ c: [at[0], G + 1.1, at[2]], r: 1.25, kind: 'airlock' });
      }
    }
  }
  // Smaller domes of many sizes round the great ones, each joined to it by a glass tunnel
  // (2026-11-12: "atlantis also has domes, and glass tunnels between them").
  for (let k = 0; k < SECTORS; k++) {
    const a = sectorAngle(k);
    const big = polar(mid(LIVE), a, G);
    for (const [dr, da, rr] of [
      [-4.9, 0.17, 1.1 + 0.4 * hash(k, 21)],
      [5.0, -0.15, 1.3 + 0.5 * hash(k, 22)],
    ] as const) {
      const at = polar(mid(LIVE) + dr, a + da, G);
      domeWithTunnel(m, at, rr, big, LIVE_R, k + dr);
    }
  }
  // Out in the ring of nature, between the reefs: clusters of three domes (large, middle, small),
  // joined to each other and back to the boulevard's end by glass tunnels.
  for (const k of NATURE_DOME_SECTORS) {
    const a = sectorAngle(k);
    const hub = polar(41, a, G);
    domeWithTunnel(m, hub, 2.8, polar(OUTER.r1 + 0.4, spokeAngle(k), TUBE_Y), 0, k);
    domeWithTunnel(m, polar(46.5, a + 0.09, G), 1.8, hub, 2.8, k + 0.5);
    domeWithTunnel(m, polar(44.5, a - 0.13, G), 1.1, hub, 2.8, k + 0.7);
  }
  return m;
}

/** A glass dome of radius r at `at`, a drum of portholes under it, a glass tunnel to `to`. */
function domeWithTunnel(m: Mesh, at: Vec3, r: number, to: Vec3, toR: number, key: number) {
  const drum = 0.25 + 0.15 * r;
  m.cylinder(at, r, G, G + drum, Tone.face, Tone.edge, 0, Math.max(12, Math.ceil(r * 7)));
  portholes(
    m,
    at,
    r,
    G + drum * 0.55,
    Math.max(4, Math.round(r * 4)),
    Math.min(0.18, 0.08 + 0.04 * r),
    key,
  );
  glassDome(
    m,
    [at[0], G + drum, at[2]],
    r,
    r,
    Math.max(10, Math.round(r * 5)),
    Math.max(3, Math.round(r * 1.5)),
  );
  m.dot([at[0], G + 0.5, at[2]], r * 0.5, Tone.light, { anim: Anim.pulse, key, w: 0.1 * r });
  note({ c: [at[0], G + drum, at[2]], r: r + drum, kind: 'dome' });
  const d = norm([to[0] - at[0], 0, to[2] - at[2]]);
  const a: Vec3 = [at[0] + d[0] * r, TUBE_Y, at[2] + d[2] * r];
  const b: Vec3 = [to[0] - d[0] * toR, TUBE_Y, to[2] - d[2] * toR];
  if (dist(a, b) > 0.3) tube(m, a, b, 0.3);
}

/*
 * The heart: a temple under a tall glass dome. Three round steps, twelve columns, a ring beam,
 * and over it an open lattice sphere breathing light round a glowing core, rays of light running
 * out from it, a beacon of motes rising toward the surface.
 */
export const TEMPLE_SPHERE: { c: Vec3; r: number } = { c: [0, G + 3.6, 0], r: 1.05 };
function templeMesh(): Mesh {
  const m = new Mesh();
  m.centre = [0, G + 1.5, 0];
  const { face, edge, light } = Tone;
  [2.7, 2.35, 2.0].forEach((r, i) => {
    m.cylinder([0, 0, 0], r, G + 0.3 * i, G + 0.3 * (i + 1), face, edge, 0, 28);
    m.disc([0, G + 0.3 * (i + 1), 0], r, face, i === 2 ? 0 : r - 0.35);
  });
  for (let k = 0; k < 12; k++) {
    const a = spokeAngle(k);
    const b = polar(1.7, a, G + 0.9);
    m.line(b, [b[0], G + 2.5, b[2]], edge, { w: 1.6 });
  }
  m.ring([0, G + 2.5, 0], 1.85, edge, { w: 1.2 }, 28);
  m.ring([0, G + 2.65, 0], 1.85, edge, { w: 1.2 }, 28);
  // The lattice sphere: twelve meridians, parallels at 0, ±1/φ² and ±1/φ, nodes of light.
  const { c, r: R } = TEMPLE_SPHERE;
  m.pivot = c;
  const breathe = { anim: Anim.breathe, w: 1.1 };
  for (let k = 0; k < 12; k++) {
    const a = spokeAngle(k);
    m.poly(
      Array.from({ length: 13 }, (_, j) => {
        const e = -Math.PI / 2 + (j / 12) * Math.PI;
        return [
          c[0] + Math.cos(a) * Math.cos(e) * R,
          c[1] + Math.sin(e) * R,
          c[2] + Math.sin(a) * Math.cos(e) * R,
        ] as Vec3;
      }),
      false,
      edge,
      breathe,
    );
  }
  for (const s of [0, 1 / PHI ** 2, -1 / PHI ** 2, 1 / PHI, -1 / PHI]) {
    const rr = R * Math.sqrt(1 - s * s);
    m.poly(Mesh.circle([c[0], c[1] + s * R, c[2]], rr, 24), true, edge, breathe);
    for (let k = 0; k < 12; k++)
      m.dot(polar(rr, spokeAngle(k), c[1] + s * R), 0.06, light, { anim: Anim.breathe, w: 0.04 });
  }
  // The core, glowing slowly, and still rays of light reaching out from it.
  m.dot(c, 0.5, light, { anim: Anim.pulse, key: 0, w: 2.2 });
  for (let k = 0; k < 20; k++) {
    const d = fibonacciSphere(k, 20);
    m.line(add(c, d, 0.25), add(c, d, R * 0.92), light, { w: 0.4 });
  }
  // A beacon: motes rising from the dome's crown toward the surface.
  m.dot([0, G + HEART_DOME_H + 0.2, 0], 0.35, light, { anim: Anim.rise, key: 16, w: 0.9 });
  // The tall glass dome over the heart, a door ring where each tube meets it.
  glassDome(m, [0, G, 0], HEART.r1, HEART_DOME_H, 24, 7);
  for (let k = 0; k < SECTORS; k++) {
    const a = spokeAngle(k);
    uprightRing(m, polar(HEART.r1, a, TUBE_Y), [Math.cos(a), 0, Math.sin(a)], 0.55, edge, 10);
  }
  return m;
}

/*
 * The harbour on boulevard 0, in the ring of nature: a hall under a geodesic dome, a long pier
 * with eight berths (four a side), each a cradle under the submarine and a gangway tube up to it,
 * lamps along the pier, and a ring gate at its far end.
 */
function harbourMesh(): Mesh {
  const m = new Mesh();
  const { face, edge, light, road } = Tone;
  m.centre = [46, G - 4, 0];
  m.geodesic([HARBOUR.hall, G, 0], 2.4, 2, Tone.glass, edge, -0.05, { two: true });
  m.dot([HARBOUR.hall, G + 0.7, 0], 1.2, light, { anim: Anim.pulse, key: 2, w: 0.5 });
  portholes(m, [HARBOUR.hall, G, 0], 2.4, G + 0.45, 8, 0.17, 3);
  tube(m, [HARBOUR.hall + 2.3, TUBE_Y, 0], [HARBOUR.x0, TUBE_Y, 0]);
  const len = HARBOUR.x1 - HARBOUR.x0;
  m.box([(HARBOUR.x0 + HARBOUR.x1) / 2, G, 0], len / 2, 1.4, 0.7, face, edge);
  m.line([HARBOUR.x0, G + 1.42, 0], [HARBOUR.x1, G + 1.42, 0], road, {
    anim: Anim.flow,
    key: 2,
    w: 1.2,
  });
  // Portholes all along both sides of the pier, the halls inside it lit warm.
  for (let x = HARBOUR.x0 + 0.8; x < HARBOUR.x1; x += 1.2)
    for (const z of [1, -1]) porthole(m, [x, G + 0.75, z * 0.72], [0, 0, z], 0.2, x);
  for (let x = HARBOUR.x0 + 0.5; x < HARBOUR.x1; x += 2) {
    for (const z of [0.6, -0.6]) {
      m.line([x, G + 1.4, z], [x, G + 2.4, z], edge, { w: 0.3 });
      m.dot([x, G + 2.5, z], 0.1, light, { anim: Anim.pulse, key: x * 0.7, w: 0.06 });
    }
  }
  for (const [x, y, z] of BERTHS) {
    const s = Math.sign(z);
    // A cradle of two arcs under the submarine, its legs down to the floor.
    for (const dx of [-0.45, 0.45]) {
      m.poly(
        Array.from({ length: 9 }, (_, j) => {
          const a = Math.PI + (j / 8) * Math.PI;
          return [x + dx, y + Math.sin(a) * 0.45, z + Math.cos(a) * 0.45] as Vec3;
        }),
        false,
        edge,
        { w: 0.6 },
      );
      m.line([x + dx, y - 0.45, z], [x + dx, G, z], edge, { w: 0.4 });
    }
    // The gangway from the pier to the submarine's hatch, a collar of light where it meets.
    tube(m, [x, G + 1.2, s * 0.7], [x, y + 0.35, z - s * 0.3], 0.18);
    m.ring([x, y + 0.42, z - s * 0.3], 0.26, light, { w: 0.2 }, 10);
  }
  // The ring gate the submarines come in through.
  const gc: Vec3 = [HARBOUR.gate, G + 4, 0];
  uprightRing(m, gc, [1, 0, 0], 3.4, edge, 40, { w: 1.6 });
  // Lamps round its inner ring, each glowing on a beat a little after the last: a slow chase.
  for (let j = 0; j < 24; j++) {
    const a = (j / 24) * TAU;
    m.dot([gc[0], gc[1] + Math.sin(a) * 3, gc[2] + Math.cos(a) * 3], 0.12, light, {
      anim: Anim.pulse,
      key: -j * 0.5,
      w: 0.08,
    });
  }
  for (const z of [-3.2, 3.2])
    m.line([HARBOUR.gate, G, z], [HARBOUR.gate, G + 3, z], edge, { w: 1 });
  return m;
}

/* ---------- coral gardens and kelp ---------- */

/** Coral colours, by the element's key. */
const CORAL: RGB[] = [
  [1, 0.36, 0.42], // pink
  [1, 0.52, 0.18], // orange
  [0.68, 0.38, 1], // violet
  [1, 0.72, 0.22], // gold
  [0.3, 0.95, 0.68], // sea green
  [1, 0.26, 0.2], // red
];
const ANEMONE = 7;
const KELP = 9;

/** A tiny seeded random, so the same reef grows every time. */
function seeded(seed: number) {
  let n = 0;
  return () => hash(seed * 131 + n++, 977);
}

/** A branching coral from `at`: each branch forks in two or three, shorter, leaning out. */
function branching(m: Mesh, at: Vec3, size: number, key: number, seed: number, flat = false) {
  const rnd = seeded(seed);
  const yaw = rnd() * TAU;
  const grow = (o: Vec3, d: Vec3, len: number, depth: number) => {
    const e = add(o, d, len);
    m.line(o, e, Tone.plant, { key, w: 0.6 + depth * 0.15 });
    if (depth === 0) {
      m.dot(e, 0.12, Tone.plant, { key, w: 0.03 });
      return;
    }
    const kids = rnd() < 0.4 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spread = 0.35 + 0.4 * rnd();
      const a = flat ? (i - (kids - 1) / 2) * spread * 1.6 : yaw + (i / kids) * TAU + rnd();
      const n: Vec3 = flat
        ? norm([d[0] + Math.sin(a) * Math.cos(yaw), d[1] + 0.2, d[2] + Math.sin(a) * Math.sin(yaw)])
        : norm([d[0] + Math.cos(a) * spread, d[1] + 0.25, d[2] + Math.sin(a) * spread]);
      grow(e, n, len * (0.68 + 0.12 * rnd()), depth - 1);
    }
  };
  grow(at, [0, 1, 0], 0.55 * size, flat ? 4 : 3);
}

/** An anemone: a ring on the floor and tentacles reaching up and out, their tips glowing. */
function anemone(m: Mesh, at: Vec3, r: number, seed: number) {
  m.ring(at, r * 0.5, Tone.plant, { key: ANEMONE, w: 0.3 }, 10);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + hash(seed, i);
    const tip = add(at, [Math.cos(a) * r, r * (1.1 + 0.4 * hash(seed, i + 30)), Math.sin(a) * r]);
    m.line(add(at, [Math.cos(a) * r * 0.45, 0, Math.sin(a) * r * 0.45]), tip, Tone.plant, {
      key: ANEMONE,
      w: 0.25,
    });
    m.dot(tip, 0.06, Tone.light, { key: ANEMONE, w: 0.02 });
  }
}

/** A strand of kelp `h` tall, zigzagging gently up, a few blades along it. */
function kelp(m: Mesh, at: Vec3, h: number, seed: number) {
  const n = 8;
  const pts = Array.from({ length: n + 1 }, (_, j) => {
    const f = j / n;
    return add(at, [Math.sin(f * 5 + seed) * 0.25, f * h, Math.cos(f * 4 + seed) * 0.2]);
  });
  m.poly(pts, false, Tone.plant, { key: KELP, w: 0.3 });
  for (let j = 2; j < n; j += 2) {
    const p = pts[j] as Vec3;
    const a = hash(seed, j) * TAU;
    m.line(p, add(p, [Math.cos(a) * 0.5, 0.35, Math.sin(a) * 0.5]), Tone.plant, {
      key: KELP,
      w: 0.15,
    });
  }
}

function reefMesh(): Mesh {
  const m = new CropMesh();
  m.centre = [0, G - 10, 0];
  let seed = 1;
  const colony = (at: Vec3, size: number, kind: number) => {
    const key = Math.floor(hash(seed, 5) * CORAL.length);
    if (kind === 0) branching(m, at, size, key, seed);
    else if (kind === 1) branching(m, at, size * 1.1, key, seed, true);
    else if (kind === 2) anemone(m, at, 0.35 * size, seed);
    else m.dot(add(at, [0, 0.3 * size, 0]), 0.45 * size, Tone.plant, { key, w: 0.25 * size });
    seed++;
  };
  // The inner canal: a small ring garden round the heart.
  for (let i = 0; i < 8; i++)
    colony(polar(mid(INNER), (i / 8) * TAU + 0.2, G - TRENCH), 1.2, i % 3);
  // The middle canal: a garden all the way round its trench.
  for (let i = 0; i < 30; i++)
    colony(
      polar(lerp(MIDDLE.r0 + 0.3, MIDDLE.r1 - 0.3, hash(i, 41)), (i / 30) * TAU + 0.05, G - TRENCH),
      1.5,
      i % 4,
    );
  // The outer canal: a kelp forest, anemones at its feet.
  for (let i = 0; i < 64; i++) {
    const at = polar(lerp(OUTER.r0 + 0.4, OUTER.r1 - 0.4, hash(i, 42)), (i / 64) * TAU, G - TRENCH);
    kelp(m, at, 4 + 4 * hash(i, 43), i);
    if (i % 6 === 0) colony(add(at, [0.4, 0, 0.3]), 1.6, 2);
  }
  // The garden domes of the ring of living: corals and kelp under glass.
  for (let k = 0; k < SECTORS; k += 2) {
    const c = polar(mid(LIVE), sectorAngle(k), G);
    for (let i = 0; i < 6; i++)
      colony(add(c, polar(1.1 + 1.3 * hash(k, i), i * 2.4, 0)), 1.5, i % 4);
    for (let i = 0; i < 3; i++) kelp(m, add(c, polar(0.6, i * 2.1, 0)), 2.6, k * 7 + i);
  }
  // The reefs of the ring of nature, in five sectors: corals, fans, anemones, boulder corals.
  for (const k of REEF_SECTORS) {
    const a0 = sectorAngle(k);
    for (let i = 0; i < 44; i++) {
      const r = lerp(NATURE.r0 + 2, RIM - 3, Math.sqrt(hash(k * 50 + i, 44)));
      const a = a0 + (hash(k * 50 + i, 45) - 0.5) * 0.42;
      colony(polar(r, a, G), 2.2 + 1.8 * hash(i, 46), i % 5 === 4 ? 3 : i % 4);
    }
    // A carpet of small colonies between the big ones, so the reef reads thick up close.
    for (let i = 0; i < 40; i++) {
      const r = lerp(NATURE.r0 + 1.5, RIM - 2, hash(k * 70 + i, 50));
      const a = a0 + (hash(k * 70 + i, 51) - 0.5) * 0.46;
      colony(polar(r, a, G), 0.9 + 0.7 * hash(i, 52), (i % 3) + 1);
    }
  }
  // The other nature sectors: kelp meadows.
  for (let k = 0; k < SECTORS; k++) {
    if (REEF_SECTORS.includes(k) || k === 0 || k === 11) continue;
    for (let i = 0; i < 6; i++) {
      const r = lerp(NATURE.r0 + 2, RIM - 3, hash(k * 30 + i, 47));
      kelp(
        m,
        polar(r, sectorAngle(k) + (hash(k * 30 + i, 48) - 0.5) * 0.4, G),
        3 + 5 * hash(i, 49),
        k * 31 + i,
      );
    }
  }
  return m;
}

/* ---------- built once ---------- */

type Meshes = { city: Built; temple: Built; harbour: Built; reef: Built };
const built: (Meshes | undefined)[] = [];
/** View v's meshes, built the first time it is shown; the full set (view 0) always first. */
function meshes(v: number): Meshes {
  const hit = built[v];
  if (hit) return hit;
  const full = v === 0 ? undefined : meshes(0);
  crop = VIEW_CROPS[v] ?? null;
  const M: Meshes = {
    city: cityMesh().build(),
    temple: full ? full.temple : templeMesh().build(),
    harbour: full ? full.harbour : harbourMesh().build(),
    reef: reefMesh().build(),
  };
  crop = null;
  built[v] = M;
  return M;
}
/** Builds the meshes (and fills COMPARTMENTS) ahead of the first frame. */
export const prepareAtlantis = (v = 0) => meshes(v);

const CITY_SHARES: Shares = { lines: 0.62, faces: 0.86 };
const TEMPLE_SHARES: Shares = { lines: 0.55, faces: 0.82 };
const HARBOUR_SHARES: Shares = { lines: 0.6, faces: 0.85 };
const REEF_SHARES: Shares = { lines: 0.86, faces: 0.86 };

/* ---------- lanes and submarines ---------- */

export type SubLane = {
  name: string;
  colour: RGB;
  /** Points every STEP along the closed lane. */
  pts: Vec3[];
  len: number;
  subs: number;
  speed: number;
};
const STEP = 0.25;

/** A closed polyline resampled to points STEP apart. */
function resample(raw: Vec3[]): { pts: Vec3[]; len: number } {
  const cum = [0];
  for (let i = 0; i < raw.length; i++)
    cum.push((cum[i] as number) + dist(raw[i] as Vec3, raw[(i + 1) % raw.length] as Vec3));
  const len = cum[raw.length] as number;
  const n = Math.round(len / STEP);
  const pts: Vec3[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * len;
    while ((cum[j + 1] as number) < s) j++;
    const f = (s - (cum[j] as number)) / ((cum[j + 1] as number) - (cum[j] as number) || 1);
    const a = raw[j] as Vec3;
    const b = raw[(j + 1) % raw.length] as Vec3;
    pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]);
  }
  return { pts, len };
}

const ring = (r: number, y: number, dir: 1 | -1): Vec3[] =>
  Array.from({ length: 240 }, (_, i) => polar(r, (dir * i * TAU) / 240, y));

/** A long loop along boulevard angle a: out at y0 on one side, back at y1 on the other. */
function petal(a: number, r0: number, r1: number, y0: number, y1: number, w = 1.6): Vec3[] {
  const e: Vec3 = [Math.cos(a), 0, Math.sin(a)];
  const s: Vec3 = [-Math.sin(a), 0, Math.cos(a)];
  const at = (r: number, side: number, y: number): Vec3 => [
    e[0] * r + s[0] * side,
    y,
    e[2] * r + s[2] * side,
  ];
  const out: Vec3[] = [];
  const legN = 120;
  for (let i = 0; i < legN; i++) out.push(at(lerp(r0, r1, i / legN), w, y0));
  for (let i = 0; i < 16; i++) {
    const ph = Math.PI / 2 - (i / 16) * Math.PI;
    out.push(at(r1 + w * Math.cos(ph), w * Math.sin(ph), lerp(y0, y1, smooth(i / 16))));
  }
  for (let i = 0; i < legN; i++) out.push(at(lerp(r1, r0, i / legN), -w, y1));
  for (let i = 0; i < 16; i++) {
    const ph = Math.PI / 2 - (i / 16) * Math.PI;
    out.push(at(r0 - w * Math.cos(ph), -w * Math.sin(ph), lerp(y1, y0, smooth(i / 16))));
  }
  return out;
}

/** The lanes: two over each of the middle and outer canals (one each way), one round the heart, four long loops. */
export const SUB_LANES: SubLane[] = (
  [
    ['Heart ring', [1, 0.84, 0.58], ring(mid(INNER), G + 1.9, 1), 2, 1.1],
    ['Middle canal, low', [0.25, 0.9, 1], ring(mid(MIDDLE), G + 3.2, -1), 3, 1.8],
    ['Middle canal, high', [1, 0.45, 0.45], ring(mid(MIDDLE), G + 6.4, 1), 3, 2],
    ['Outer canal, low', [0.6, 1, 0.35], ring(mid(OUTER), G + 3.2, 1), 4, 2.2],
    ['Outer canal, high', [0.66, 0.5, 1], ring(mid(OUTER), G + 6.8, -1), 4, 2.4],
    ['Harbour loop', [1, 0.62, 0.18], petal(spokeAngle(0), 5, 57, G + 9, G + 11.5), 3, 2.6],
    ['East loop', [0.3, 1, 0.8], petal(spokeAngle(3), 5, 57, G + 9, G + 11.5), 3, 2.6],
    ['South loop', [1, 0.45, 0.75], petal(spokeAngle(6), 5, 57, G + 9, G + 11.5), 3, 2.6],
    ['West loop', [0.72, 0.86, 1], petal(spokeAngle(9), 5, 57, G + 9, G + 11.5), 3, 2.6],
  ] as [string, RGB, Vec3[], number, number][]
).map(([name, colour, raw, subs, speed]) => ({ name, colour, ...resample(raw), subs, speed }));

/** Every cruising submarine, by lane. */
const SUBS: { lane: number; j: number }[] = SUB_LANES.flatMap((L, lane) =>
  Array.from({ length: L.subs }, (_, j) => ({ lane, j })),
);
export const SUB_COUNT = SUBS.length;

/** Where along lane L (arc length s, wrapped) a point is, and the way it runs. */
function alongLane(L: SubLane, s: number): { c: Vec3; f: Vec3 } {
  const n = L.pts.length;
  const x = wrap(s, L.len) / STEP;
  const i = Math.floor(x) % n;
  const a = L.pts[i] as Vec3;
  const b = L.pts[(i + 1) % n] as Vec3;
  const f = x - Math.floor(x);
  return { c: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)], f: norm(sub(b, a)) };
}

/** Cruising submarine g at time t: where it is, its heading and its lane. */
export function submarine(g: number, t: number): { c: Vec3; f: Vec3; lane: number } {
  const { lane, j } = SUBS[wrap(g, SUB_COUNT)] as { lane: number; j: number };
  const L = SUB_LANES[lane] as SubLane;
  const s = (j / L.subs) * L.len + hash(lane, 501 + j) * 2 + L.speed * t;
  return { ...alongLane(L, s), lane };
}

export const SUB_LEN = 1.7;
const SUB_R = 0.26;
export const BUBBLE_LIFE = 6;
/** How far a bubble has risen `age` seconds after leaving the stern: slowly at first, then quicker. */
export const bubbleRise = (age: number) => 1.1 * age + 0.16 * age * age;

/** A bubble from submarine g that left its stern `age` seconds before t. */
export function bubble(g: number, age: number, t: number, seed = 0): Vec3 {
  const { c, f } = submarine(g, t - age);
  const stern = add(c, f, -SUB_LEN * 0.55);
  return [
    stern[0] + Math.sin(age * 2.4 + seed * 7) * 0.12 * age + (hash(seed, 601) - 0.5) * 0.25,
    stern[1] + bubbleRise(age),
    stern[2] + Math.cos(age * 2.1 + seed * 5) * 0.12 * age + (hash(seed, 602) - 0.5) * 0.25,
  ];
}

/** A grain on a submarine at c heading f: hull, sail, propeller ring, portholes and a bow lamp. */
function subGrain(c: Vec3, f: Vec3, colour: RGB, p: Particle, t: number, k = 1): Spot {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const at = (x: number, y: number, z: number): Vec3 => [
    c[0] + f[0] * x + up[0] * y + side[0] * z,
    c[1] + f[1] * x + up[1] * y + side[1] * z,
    c[2] + f[2] * x + up[2] * y + side[2] * z,
  ];
  const q = p.b;
  const a = p.d * TAU;
  if (q < 0.58) {
    const s = 2 * hash(p.i, 611) - 1;
    const rr = SUB_R * Math.sqrt(Math.max(0, 1 - s * s)) ** 0.7;
    return {
      pos: at((s * SUB_LEN) / 2, Math.sin(a) * rr, Math.cos(a) * rr),
      rgb: scale(colour, 0.34 * k),
    };
  }
  if (q < 0.7) {
    // The sail: a small fin on its back.
    const s = hash(p.i, 612);
    return {
      pos: at(0.15 + (s - 0.5) * 0.45 * (1 - 0.4 * p.d), SUB_R + p.d * 0.28, 0),
      rgb: scale(colour, 0.3 * k),
    };
  }
  if (q < 0.84) {
    // The propeller's ring at the stern, turning.
    const b = a + t * 3;
    return {
      pos: at(-SUB_LEN / 2 - 0.08, Math.sin(b) * 0.2, Math.cos(b) * 0.2),
      rgb: scale(colour, 0.26 * k),
    };
  }
  if (q < 0.94) {
    // Portholes down both sides, warm.
    const s = Math.floor(hash(p.i, 613) * 5);
    const z = hash(p.i, 614) < 0.5 ? -1 : 1;
    return {
      pos: at(-0.4 + s * 0.2, 0.05, z * SUB_R * 0.98),
      rgb: scale([1, 0.78, 0.45], 0.6 * k * (0.85 + 0.15 * Math.sin(t * 0.7 + p.i))),
    };
  }
  // The bow lamp, in the lane's colour, bright.
  return { pos: at(SUB_LEN / 2 + 0.05, 0, 0), rgb: scale(mix(colour, [1, 1, 1], 0.4), 0.85 * k) };
}

/* ---------- the harbour's own submarines: in, rest, out ---------- */

export const DOCK_CYCLE = 26;
/** Berth b's submarine at time t: where, heading, how visible, and whether it rests. */
export function dockedSub(b: number, t: number): { c: Vec3; f: Vec3; k: number; resting: boolean } {
  const B = BERTHS[b % BERTHS.length] as Vec3;
  const zs = Math.sign(B[2]);
  const ph = frac(t / DOCK_CYCLE + hash(b, 701));
  const bez = (P0: Vec3, P1: Vec3, P2: Vec3, u: number) => {
    const w0 = (1 - u) ** 2;
    const w1 = 2 * u * (1 - u);
    const w2 = u * u;
    const c: Vec3 = [
      P0[0] * w0 + P1[0] * w1 + P2[0] * w2,
      P0[1] * w0 + P1[1] * w1 + P2[1] * w2,
      P0[2] * w0 + P1[2] * w1 + P2[2] * w2,
    ];
    const d = norm(add(scale(sub(P1, P0) as RGB, 1 - u) as Vec3, sub(P2, P1), u));
    return { c, f: d };
  };
  const A: Vec3 = [HARBOUR.gate + 2, G + 4, zs * 1.2];
  const C: Vec3 = [B[0] + 6, B[1] + 0.4, B[2]];
  const out1: Vec3 = [B[0] - 5, G + 5, B[2] + zs * 2];
  const out2: Vec3 = [B[0] - 1, G + 9, zs * 7];
  if (ph < 0.3) {
    const r = bez(A, C, B, smooth(ph / 0.3));
    return { ...r, k: smooth(ph / 0.06), resting: false };
  }
  if (ph < 0.68) return { c: B, f: [-1, 0, 0], k: 1, resting: true };
  const u = (ph - 0.68) / 0.32;
  const r = bez(B, out1, out2, smooth(u));
  return { ...r, k: smooth((1 - u) / 0.2), resting: false };
}

/* ---------- marine life ---------- */

type School = {
  c: Vec3;
  r: number;
  w: number;
  n: number;
  len: number;
  colour: RGB;
  spread: number;
};
export const SCHOOLS: School[] = [
  { c: [0, G + 7, 0], r: 6.5, w: 0.16, n: 18, len: 0.5, colour: [1, 0.8, 0.28], spread: 1.6 },
  {
    c: polar(mid(LIVE), sectorAngle(0), G + 5.5),
    r: 5.5,
    w: -0.2,
    n: 16,
    len: 0.5,
    colour: [0.3, 0.6, 1],
    spread: 1.4,
  },
  {
    c: polar(mid(LIVE), sectorAngle(4), G + 5.5),
    r: 5.5,
    w: 0.18,
    n: 16,
    len: 0.5,
    colour: [1, 0.5, 0.25],
    spread: 1.4,
  },
  {
    c: polar(mid(LIVE), sectorAngle(8), G + 5.5),
    r: 5.5,
    w: -0.17,
    n: 16,
    len: 0.5,
    colour: [0.75, 0.88, 1],
    spread: 1.4,
  },
  {
    c: polar(46, sectorAngle(4), G + 3.5),
    r: 6.5,
    w: 0.14,
    n: 18,
    len: 0.55,
    colour: [1, 0.85, 0.2],
    spread: 1.8,
  },
  {
    c: polar(46, sectorAngle(8), G + 3.5),
    r: 6.5,
    w: -0.13,
    n: 18,
    len: 0.55,
    colour: [0.35, 0.75, 1],
    spread: 1.8,
  },
  { c: [0, G + 16, 0], r: 30, w: 0.045, n: 30, len: 0.7, colour: [0.62, 0.8, 1], spread: 2.6 },
];
const SCHOOL_FISH = SCHOOLS.reduce((s, x) => s + x.n, 0);
const FISH_OF: { s: number; m: number }[] = SCHOOLS.flatMap((S, s) =>
  Array.from({ length: S.n }, (_, m) => ({ s, m })),
);

/** Fish m of school s at time t: where it is and its heading. */
export function schoolFish(s: number, m: number, t: number): { c: Vec3; f: Vec3 } {
  const S = SCHOOLS[s] as School;
  const th = S.w * t + (hash(s * 97 + m, 801) - 0.5) * 1.3;
  const dr = (hash(s * 97 + m, 802) - 0.5) * S.spread + Math.sin(t * 0.3 + m) * 0.25;
  const dy = (hash(s * 97 + m, 803) - 0.5) * S.spread * 0.6 + Math.sin(t * 0.23 + m * 1.7) * 0.2;
  const c: Vec3 = [
    S.c[0] + Math.cos(th) * (S.r + dr),
    S.c[1] + dy,
    S.c[2] + Math.sin(th) * (S.r + dr),
  ];
  const sg = Math.sign(S.w);
  return { c, f: [-Math.sin(th) * sg, 0, Math.cos(th) * sg] };
}

/** Grain p on a fish at c heading f, `len` long (as Ocean's fish, simpler). */
function fishGrain(c: Vec3, f: Vec3, len: number, p: Particle, t: number, j: number): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const s = p.b;
  const body = 0.2 * len * Math.sin(Math.PI * Math.min(1, s ** 0.7 * 1.05));
  const fin = s > 0.82 ? ((s - 0.82) / 0.18) * 0.22 * len : 0;
  const wag = 0.12 * len * Math.sin(9 * t + j * 1.3 - 6 * s) * s * s;
  const a = p.d * TAU;
  const back = len * (0.5 - s);
  const lat = Math.cos(a) * body + wag;
  const ver = Math.sin(a) * (body * 0.75 + fin);
  return [
    c[0] + f[0] * back + side[0] * lat + up[0] * ver,
    c[1] + f[1] * back + side[1] * lat + up[1] * ver,
    c[2] + f[2] * back + side[2] * lat + up[2] * ver,
  ];
}

const JELLIES = 9;
const JELLY_SPAN = 26;
/** Jellyfish j: its bell top rising slowly through the water, coming round again from below. */
export function jellyTop(j: number, t: number): { c: Vec3; k: number } {
  const r = 14 + 40 * hash(j, 901);
  const a = hash(j, 902) * TAU + Math.sin(t * 0.03 + j) * 0.05;
  const y = wrap(hash(j, 903) * JELLY_SPAN + t * (0.3 + 0.15 * hash(j, 904)), JELLY_SPAN);
  return { c: polar(r, a, G + 3 + y), k: smooth(y / 3) * smooth((JELLY_SPAN - y) / 4) };
}
const JELLY_COLOURS: RGB[] = [
  [0.7, 0.45, 1],
  [0.35, 0.9, 1],
  [1, 0.5, 0.8],
];

function jellyGrain(c: Vec3, p: Particle, t: number, j: number): Vec3 {
  const pull = Math.max(0, Math.sin(t * 1.1 + hash(j, 905) * TAU)) ** 2;
  const R = 0.9 * (1 - 0.2 * pull);
  const H = 0.65 * (1 + 0.18 * pull);
  if (p.d < 0.5) {
    const v = Math.sqrt(p.b);
    const ang = frac(p.b * 13.7) * TAU;
    const rr = R * Math.sin((v * Math.PI) / 2);
    return [
      c[0] + Math.cos(ang) * rr,
      c[1] - H * (1 - Math.cos((v * Math.PI) / 2)),
      c[2] + Math.sin(ang) * rr,
    ];
  }
  const n = Math.floor(frac(p.b * 8) * 8);
  const s = frac(p.b * 97.1);
  const ang = (n / 8) * TAU;
  const sway = Math.sin(s * 5 - t * 1.4 + n + j) * 0.25 * s;
  return [
    c[0] + Math.cos(ang) * R * (1 - 0.3 * s) + Math.cos(ang + 1.6) * sway,
    c[1] - H - s * 2.8 * (1 - 0.15 * pull),
    c[2] + Math.sin(ang) * R * (1 - 0.3 * s) + Math.sin(ang + 1.6) * sway,
  ];
}

/** Three mantas looping slowly round the city, high over the rings. */
export const MANTAS = [
  { r: 42, y: G + 13, w: 0.05, a0: 0.4 },
  { r: 36, y: G + 16, w: -0.06, a0: 2.5 },
  { r: 47, y: G + 19, w: 0.045, a0: 4.4 },
];
export function manta(j: number, t: number): { c: Vec3; f: Vec3 } {
  const M = MANTAS[j % MANTAS.length] as (typeof MANTAS)[number];
  const a = M.a0 + M.w * t;
  const sg = Math.sign(M.w);
  return {
    c: [Math.cos(a) * M.r, M.y + Math.sin(t * 0.2 + j) * 1.2, Math.sin(a) * M.r],
    f: [-Math.sin(a) * sg, 0, Math.cos(a) * sg],
  };
}
function mantaGrain(c: Vec3, f: Vec3, p: Particle, t: number, j: number): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const W = 2.3;
  const C = 1.7;
  let x: number;
  let y: number;
  let z: number;
  if (p.d > 0.92) {
    x = -0.5 * C - ((p.d - 0.92) / 0.08) * 2;
    y = 0;
    z = 0;
  } else {
    const v = 2 * p.b - 1;
    const av = Math.abs(v);
    const chord = C * (1 - av ** 1.4);
    x = (0.5 - p.d / 0.92) * chord - 0.35 * av * C;
    z = v * W;
    y = 0.45 * av * Math.sin(t * 1.1 - av * 2.2 + j) * W * 0.35;
  }
  return [
    c[0] + f[0] * x + up[0] * y + side[0] * z,
    c[1] + f[1] * x + up[1] * y + side[1] * z,
    c[2] + f[2] * x + up[2] * y + side[2] * z,
  ];
}

/** Two whales far off beyond the rim, passing slowly. */
export const WHALES = [
  { r: 92, y: G + 24, w: 0.012, a0: 1 },
  { r: 108, y: G + 31, w: -0.01, a0: 4 },
];
export function whale(j: number, t: number): { c: Vec3; f: Vec3 } {
  const W = WHALES[j % WHALES.length] as (typeof WHALES)[number];
  const a = W.a0 + W.w * t;
  const sg = Math.sign(W.w);
  return {
    c: [Math.cos(a) * W.r, W.y, Math.sin(a) * W.r],
    f: [-Math.sin(a) * sg, 0, Math.cos(a) * sg],
  };
}
function whaleGrain(c: Vec3, f: Vec3, p: Particle, t: number): Vec3 {
  const side = norm(cross(f, [0, 1, 0]));
  const up = cross(side, f);
  const L = 16;
  const s = p.b;
  const beat = 0.04 * L * Math.sin(t * 0.6 - 4 * s) * s * s;
  let x = L * (0.5 - s);
  let y = beat;
  let z = 0;
  if (p.d > 0.9) {
    // The flukes, spread flat at the tail.
    x = -L * 0.5 - 0.8 * ((p.d - 0.9) / 0.1);
    z = (2 * hash(p.i, 951) - 1) * 2.4 * (1 - 0.5 * ((p.d - 0.9) / 0.1));
    y = 0.04 * L * Math.sin(t * 0.6 - 4);
  } else if (p.d > 0.84) {
    // The long pectoral fins.
    const q = (p.d - 0.84) / 0.06;
    x = L * 0.22 - q * 1.5;
    z = (hash(p.i, 952) < 0.5 ? -1 : 1) * (1 + q * 3.2);
    y = -0.5 - q * 0.8;
  } else {
    const r = 0.11 * L * Math.sin(Math.PI * Math.min(1, (s * 1.05) ** 0.6)) * (1 - 0.55 * s);
    const a = (p.d / 0.84) * TAU;
    y += Math.sin(a) * r * 0.85;
    z = Math.cos(a) * r;
  }
  return [
    c[0] + f[0] * x + up[0] * y + side[0] * z,
    c[1] + f[1] * x + up[1] * y + side[1] * z,
    c[2] + f[2] * x + up[2] * y + side[2] * z,
  ];
}

/* ---------- the water: light, fog and colour ---------- */

const WARM_WHITE: RGB = [1, 0.8, 0.52];
const IVORY_GOLD: RGB = [1, 0.58, 0.2];
const GOLD: RGB = [1, 0.5, 0.12];
const DEEP_GOLD: RGB = [0.95, 0.42, 0.08];
const ROSE_GOLD: RGB = [1, 0.42, 0.22];
const GLASS: RGB = [0.36, 0.82, 0.86];
const SAND: RGB = [0.62, 0.5, 0.32];
const TRENCH_SAND: RGB = [0.24, 0.5, 0.56];
const BUBBLE: RGB = [0.72, 0.95, 1];
const PLANKTON: RGB = [0.62, 0.92, 0.85];
const SHAFT: RGB = [0.55, 0.85, 0.95];

/** The water's colour, drifting slowly between teal and a deeper blue (minutes, never a flash). */
const tealAt = (t: number): RGB =>
  mix([0.08, 0.52, 0.62], [0.1, 0.4, 0.72], 0.5 + 0.5 * Math.sin(t * 0.011));

/** Caustics: the surface's light rippling slowly over what lies below. */
export function caustic(x: number, z: number, t: number): number {
  const a = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 0.5 + t * 0.35) * 1.6 + t * 0.5);
  const b = 0.5 + 0.5 * Math.sin(z * 0.8 + Math.sin(x * 0.6 - t * 0.3) * 1.6 - t * 0.4);
  return 0.6 + 0.8 * a * b;
}

/** Each city tone's colour and strength. */
const TONES: [RGB, number][] = [
  [GOLD, 0.42], // edge
  [DEEP_GOLD, 0.2], // face
  [GLASS, 0.09], // glass
  [[0.2, 0.6, 0.75], 0.14], // water
  [CORAL[0] as RGB, 0.3], // plant (by key)
  [[1, 0.36, 0.06], 0.6], // fire
  [WARM_WHITE, 0.72], // light
  [SAND, 0.1], // ground
  [IVORY_GOLD, 0.46], // road
  [BUBBLE, 0.2], // steam
  [ROSE_GOLD, 0.2], // film
];

type Eyed = { eye: Vec3; target: Vec3; focus: number; teal: RGB };

/** Seen through water: far things dim and turn teal; light carries further; the nearest fade. */
function underwater(rgb: RGB, pos: Vec3, E: Eyed, light = false): RGB {
  const dx = pos[0] - E.eye[0];
  const dy = pos[1] - E.eye[1];
  const dz = pos[2] - E.eye[2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const deep = d - E.focus - 4;
  const f = deep > 0 ? 1 - Math.exp(-deep / (light ? 120 : 62)) : 0;
  const w = 0.72 * f;
  const tl = ((rgb[0] + rgb[1] + rgb[2]) / 3) * 1.7 * w;
  const near = d < 3.7 ? smooth((d - 1.2) / 2.5) : 1;
  // A little brighter toward the surface, where the light comes from.
  const hy = (pos[1] - G) / 22;
  const high = 0.82 + 0.18 * (hy >= 1 ? 1 : hy <= 0 ? 0 : hy * hy * (3 - 2 * hy));
  const k = (1 - 0.78 * f) * near * high;
  const T = E.teal;
  return [
    Math.min(1, Math.max(0, (rgb[0] * (1 - w) + T[0] * tl) * k)),
    Math.min(1, Math.max(0, (rgb[1] * (1 - w) + T[1] * tl) * k)),
    Math.min(1, Math.max(0, (rgb[2] * (1 - w) + T[2] * tl) * k)),
  ];
}

/** A grain of a mesh, lit. */
function meshColour(h: Hit, p: Particle, t: number, reef: boolean): RGB {
  let base: RGB;
  let k: number;
  if (h.tone === Tone.plant) {
    base =
      h.key === KELP
        ? [0.55, 0.78, 0.26]
        : h.key === ANEMONE
          ? [1, 0.55, 0.85]
          : (CORAL[h.key] ?? (CORAL[0] as RGB));
    k = h.key === KELP ? 0.26 : 0.4;
  } else if (h.tone === Tone.light && h.key === ANEMONE && reef) {
    base = [1, 0.85, 0.95];
    k = 0.5;
  } else [base, k] = TONES[h.tone] ?? (TONES[0] as [RGB, number]);
  // Gold drifts slowly toward rose gold and back; corals breathe a little.
  const twinkle = 0.86 + 0.14 * Math.sin(t * 0.8 + p.i * 0.37);
  const lightOn =
    h.tone === Tone.light || h.tone === Tone.road ? 1 : caustic(h.pos[0], h.pos[2], t);
  const m = k * h.lit * twinkle * lightOn;
  if (h.tone === Tone.edge || h.tone === Tone.face || h.tone === Tone.road) {
    const r = 0.22 * (0.5 + 0.5 * Math.sin(t * 0.013 + p.i * 0.0007));
    return [
      (base[0] + (ROSE_GOLD[0] - base[0]) * r) * m,
      (base[1] + (ROSE_GOLD[1] - base[1]) * r) * m,
      (base[2] + (ROSE_GOLD[2] - base[2]) * r) * m,
    ];
  }
  return [base[0] * m, base[1] * m, base[2] * m];
}

/** Corals and kelp sway in the current, more the higher they reach. */
function swayed(q: Vec3, kelpy: boolean, t: number): Vec3 {
  const h = Math.max(0, q[1] - floorAt(q[0], q[2]));
  const amp = kelpy ? 0.11 * h : (0.06 * h * h) / (1 + h);
  return [
    q[0] + amp * Math.sin(t * 0.55 + q[0] * 0.25 + q[2] * 0.18),
    q[1],
    q[2] + amp * 0.6 * Math.cos(t * 0.47 + q[2] * 0.22 + q[0] * 0.1),
  ];
}

/* ---------- the views: roles and eyes ---------- */

type Role =
  | 'plankton'
  | 'shaft'
  | 'floor'
  | 'city'
  | 'temple'
  | 'harbour'
  | 'reef'
  | 'sub'
  | 'bubble'
  | 'dock'
  | 'fish'
  | 'jelly'
  | 'manta'
  | 'whale'
  | 'map';

/** How each view shares out the grains (each row sums to 1). */
const SHARES: [Role, number][][] = [
  // Plan: the map; more on the buildings and the gardens, no shafts; a share drawn as the map
  // itself (2026-11-12, the user: the Plan "too dark/murky"): bright banks, tunnels, domes, heart.
  [
    ['plankton', 0.015],
    ['floor', 0.06],
    ['city', 0.34],
    ['temple', 0.05],
    ['harbour', 0.04],
    ['reef', 0.15],
    ['sub', 0.07],
    ['bubble', 0.04],
    ['dock', 0.02],
    ['fish', 0.03],
    ['jelly', 0.01],
    ['manta', 0.01],
    ['whale', 0.005],
    ['map', 0.16],
  ],
  // Domes: flying between the compartments; most grains on the domes, little on the open water.
  [
    ['plankton', 0.02],
    ['shaft', 0.03],
    ['floor', 0.06],
    ['city', 0.47],
    ['temple', 0.04],
    ['harbour', 0.02],
    ['reef', 0.12],
    ['sub', 0.07],
    ['bubble', 0.05],
    ['dock', 0.01],
    ['fish', 0.06],
    ['jelly', 0.02],
    ['manta', 0.02],
    ['whale', 0.01],
  ],
  // Coral gardens: the reefs carry most of the grains, fish thick about them.
  [
    ['plankton', 0.02],
    ['shaft', 0.03],
    ['floor', 0.05],
    ['city', 0.13],
    ['temple', 0.02],
    ['harbour', 0.01],
    ['reef', 0.48],
    ['sub', 0.04],
    ['bubble', 0.03],
    ['fish', 0.12],
    ['jelly', 0.03],
    ['manta', 0.02],
    ['whale', 0.02],
  ],
  // The heart: a third of the grains on the temple.
  [
    ['plankton', 0.05],
    ['shaft', 0.05],
    ['floor', 0.06],
    ['city', 0.16],
    ['temple', 0.34],
    ['reef', 0.06],
    ['sub', 0.07],
    ['bubble', 0.06],
    ['fish', 0.08],
    ['jelly', 0.03],
    ['manta', 0.02],
    ['whale', 0.02],
  ],
  // Harbour: the pier, its berths and the submarines coming and going.
  [
    ['plankton', 0.05],
    ['shaft', 0.04],
    ['floor', 0.07],
    ['city', 0.14],
    ['temple', 0.01],
    ['harbour', 0.26],
    ['reef', 0.08],
    ['sub', 0.06],
    ['bubble', 0.05],
    ['dock', 0.12],
    ['fish', 0.06],
    ['jelly', 0.02],
    ['manta', 0.02],
    ['whale', 0.02],
  ],
];
const BOUNDS: [Role, number, number][][] = SHARES.map((rows) => {
  let s = 0;
  return rows.map(([r, w]) => {
    const b: [Role, number, number] = [r, s, s + w];
    s += w;
    return b;
  });
});
/** Which role a grain plays in the current view, and where it falls within it (0..1). */
function roleOf(c: number, v: number): { role: Role; q: number } {
  const rows = BOUNDS[v] as [Role, number, number][];
  for (const [role, a, b] of rows) if (c < b) return { role, q: (c - a) / (b - a) };
  const [role, a, b] = rows[rows.length - 1] as [Role, number, number];
  return { role, q: Math.min(0.999999, (c - a) / (b - a)) };
}
/** How many grains of `n` view v gives each role. */
export function roleShare(v: number, role: string): number {
  return SHARES[v]?.find(([r]) => r === role)?.[1] ?? 0;
}

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

export const HARBOUR_C: Vec3 = [46, G + 2, 0];

/** Where the eye is in view v, `u` through the piece, at time t. */
export function viewEye(v: number, u: number, t: number): Eye {
  switch (v) {
    case 1: {
      // From just outside the outer canal, a little above the domes, gliding slowly round and
      // looking in across the great domes, the canal and the compartments toward the heart.
      const a = 0.55 + u * 0.6;
      const bob = Math.sin(t * 0.11) * 0.8;
      return {
        eye: polar(36, a, G + 8.5 + bob),
        target: polar(mid(MAKE) + 3, a + 0.2, G + 1.5),
      };
    }
    case 2: {
      // Low over the reefs of the ring of nature, near its rim, looking in over the corals.
      const a = 2.0 + u * 0.6;
      const bob = Math.sin(t * 0.09) * 0.6;
      return { eye: polar(50, a, G + 3.6 + bob), target: polar(38, a + 0.14, G + 0.6) };
    }
    case 3:
      return orbit(t * 0.03, 0.3, 16, [0, G + 2.6, 0]);
    case 4:
      return orbit(0.9 + t * 0.02, 0.42, 25, HARBOUR_C);
    default:
      return orbit(0.3 + t * 0.006, 1.32, 116 - 6 * u, [0, G, 0]);
  }
}
export const atlantisEye = (u: number, t: number) => viewEye(view, u, t);

const eyeMemo: { v: number; u: number; t: number; E: Eyed }[] = [];
function eyed(v: number, u: number, t: number): Eyed {
  for (const m of eyeMemo) if (m.v === v && m.u === u && m.t === t) return m.E;
  const { eye, target } = viewEye(v, u, t);
  const E = { eye, target, focus: dist(eye, target), teal: tealAt(t) };
  eyeMemo.unshift({ v, u, t, E });
  if (eyeMemo.length > 3) eyeMemo.pop();
  return E;
}

/* ---------- where every grain is ---------- */

/** The value ≡ x (mod 2R) nearest c: something fixed in the water, kept in a window round c. */
const near = (x: number, c: number, R: number) => c + wrap(x - c + R, 2 * R) - R;
/** Fades toward the edges of a window of half-size R, where things come round. */
const edgeFade = (dx: number, dz: number, R: number) =>
  smooth((R - Math.abs(dx)) / 5) * smooth((R - Math.abs(dz)) / 5);

/* ---------- the Plan, read as a map ---------- */

/*
 * 2026-11-12, the user on the Plan in the real player: too dark and murky. From above the city now
 * reads as a map: each ring in its own hue (knowledge cyan, making amber, living coral rose,
 * nature sea green, the heart warm white), everything lifted brighter, and a share of the grains
 * drawn as the map itself: bright banks, the twelve tunnels with slow pulses running in to the
 * heart, every dome a lit disc, the heart a sunflower of light breathing on its 9 s breath.
 */
const PLAN_LIFT = 2.2;
const WATER_HUE: RGB = [0.3, 0.85, 1];
/** Each ring's hue on the map, by distance from the heart. */
export function ringHue(r: number): RGB {
  if (r < HEART.r1) return [1, 0.84, 0.55];
  if (r < INNER.r1) return WATER_HUE;
  if (r < KNOW.r1) return [0.42, 0.92, 1];
  if (r < MAKE.r1) return [1, 0.62, 0.2];
  if (r < MIDDLE.r1) return WATER_HUE;
  if (r < LIVE.r1) return [1, 0.48, 0.52];
  if (r < OUTER.r1) return WATER_HUE;
  return [0.42, 1, 0.6];
}
/** A grain of the Plan, lifted brighter and (for the buildings) leaned toward its ring's hue. */
function planLift(rgb: RGB, pos: Vec3, hued: boolean): RGB {
  let c = rgb;
  if (hued) {
    const hue = ringHue(Math.hypot(pos[0], pos[2]));
    const lum = Math.max(rgb[0], rgb[1], rgb[2]);
    c = mix(rgb, scale(hue, lum), 0.5);
  }
  return [
    Math.min(1, c[0] * PLAN_LIFT),
    Math.min(1, c[1] * PLAN_LIFT),
    Math.min(1, c[2] * PLAN_LIFT),
  ];
}
const MAP_RGB: number[] = [0, 0, 0];
const MAP_KIND: Record<string, RGB> = {
  garden: [0.45, 1, 0.5],
  homes: [1, 0.66, 0.38],
  knowledge: [0.42, 0.92, 1],
  making: [1, 0.62, 0.2],
  dome: [0.4, 0.95, 0.9],
  tower: [1, 0.8, 0.45],
  airlock: [1, 0.8, 0.45],
};
/** The heart's 9 s breath, 0..1, eased: never a flash. */
const breath = (t: number) => 0.5 - 0.5 * Math.cos((t / 9) * TAU);

/**
 * A grain of the map share (the Plan only): its place, and its colour into `out`. A third on the
 * banks of every ring, a quarter on the twelve tunnels, a quarter on the domes, the rest the heart.
 */
export function mapSite(p: Particle, q: number, t: number, out: number[]): Vec3 {
  const a = p.d * TAU;
  let pos: Vec3;
  let c: RGB;
  let k: number;
  if (q < 0.34) {
    // The banks: a circle at every band's inner edge, and the rim; a slow wave running outward.
    const rings = GOLDEN.bands.slice(1);
    const n = Math.min(rings.length, Math.floor((q / 0.34) * (rings.length + 1)));
    const b = rings[n];
    const r = b ? b.r0 : RIM;
    const water = b?.kind === 'water';
    pos = polar(r, a, (water ? G + WALL_TOP : G) + 0.05);
    c = ringHue(r + (water ? -0.5 : 0.5));
    k = 0.42 * (0.75 + 0.25 * Math.sin(t * 0.5 - r * 0.12));
  } else if (q < 0.6) {
    // The tunnels: twelve spokes, pulses running in toward the heart, slow and soft.
    const s = (q - 0.34) / 0.26;
    const spoke = Math.floor(s * SECTORS);
    const along = hash(p.i, 211);
    const r1 = spoke === 0 ? HARBOUR.x1 : OUTER.r1 + 0.4;
    const r = lerp(HEART.r1, r1, along);
    pos = polar(r, spokeAngle(spoke), TUBE_Y + 0.4);
    const x = frac(r / 9 + t * 0.1);
    const pulse = Math.exp(-((x - 0.5) ** 2) / 0.012);
    c = mix([1, 0.62, 0.22], [1, 0.9, 0.7], pulse);
    k = 0.3 + 0.4 * pulse;
  } else if (q < 0.86) {
    // The domes: every compartment a disc, its rim brighter, breathing on its own beat.
    const list = COMPARTMENTS.length
      ? COMPARTMENTS
      : [{ c: [0, G, 0] as Vec3, r: 1, kind: 'dome' }];
    const j = Math.floor(((q - 0.6) / 0.26) * list.length) % list.length;
    const C0 = list[j] as Compartment;
    const rim = hash(p.i, 212) < 0.55;
    const rr = C0.r * (rim ? 1 : Math.sqrt(hash(p.i, 213)) * 0.92);
    pos = [C0.c[0] + Math.cos(a) * rr, G + 0.1, C0.c[2] + Math.sin(a) * rr];
    c = MAP_KIND[C0.kind] ?? (MAP_KIND.dome as RGB);
    k = (rim ? 0.4 : 0.16) * (0.8 + 0.2 * Math.sin(t * 0.6 + j * 1.7));
  } else {
    // The heart: a sunflower of light on the golden angle, brightest in the middle, breathing.
    const n = Math.floor(((q - 0.86) / 0.14) * 377);
    const r = HEART.r1 * 0.95 * Math.sqrt((n + 0.5) / 377);
    const ga = n * 2.399963 + t * 0.02;
    pos = polar(r, ga, G + 0.15);
    c = mix([1, 0.92, 0.75], [1, 0.62, 0.2], r / HEART.r1);
    k = (0.35 + 0.35 * (1 - r / HEART.r1)) * (0.8 + 0.2 * breath(t));
  }
  out[0] = Math.min(1, c[0] * k);
  out[1] = Math.min(1, c[1] * k);
  out[2] = Math.min(1, c[2] * k);
  return pos;
}

/** How large the grains are drawn in each view: bold on the map, a little fuller up close. */
const VIEW_SIZE = [1.9, 1.4, 1.4, 1.2, 1.2];
export const atlantisSize = (v = view) => VIEW_SIZE[v] ?? 1.2;

/**
 * The water's own background for the piece (the player's per-piece background): teal near the
 * surface, deepening to blue-black below.
 */
export const ATLANTIS_WATER = ['#0b3f52', '#072c40', '#041a2e', '#020a16'];

/** Grain p in Atlantis, `u` through the piece, at time t, in the view on the pills (or v). */
export function atlantisAt(p: Particle, u: number, t: number, v = view): Spot {
  const M = meshes(v);
  const E = eyed(v, u, t);
  const { role, q } = roleOf(p.c, v);
  switch (role) {
    case 'plankton': {
      // Specks drifting slowly up, twinkling softly: fixed in the water, kept in a window round
      // where the eye looks (each speck leaving one side comes in at the other, faded).
      const R = v === 0 ? 60 : 28;
      const h = 36;
      const cx = v === 0 ? 0 : E.target[0];
      const cz = v === 0 ? 0 : E.target[2];
      const x = near(hash(p.i, 81) * 400 + Math.sin(t * 0.13 + p.i) * 1.2, cx, R);
      const z = near(hash(p.i, 83) * 400 + Math.cos(t * 0.11 + p.i) * 1.2, cz, R);
      const y = wrap(hash(p.i, 82) * h + t * 0.3, h);
      const pos: Vec3 = [x, G + 0.3 + y, z];
      const k =
        0.16 *
        smooth(y / 3) *
        smooth((h - y) / 3) *
        edgeFade(x - cx, z - cz, R) *
        (0.6 + 0.4 * Math.sin(t * 0.5 + p.i * 1.3) ** 2);
      return {
        pos,
        rgb: underwater(scale(mix(PLANKTON, IVORY_GOLD, hash(p.i, 84) * 0.4), k), pos, E),
      };
    }
    case 'shaft': {
      // Shafts of light slanting down from the surface, swaying; the surface shimmering above.
      // Both stand still in the water as the eye moves past.
      const cx = E.target[0];
      const cz = E.target[2];
      if (q < 0.3) {
        const x = near(hash(p.i, 85) * 400, cx, 45);
        const z = near(hash(p.i, 86) * 400, cz, 45);
        const pos: Vec3 = [x, SURFACE + Math.sin(t * 0.4 + p.i) * 0.3, z];
        const k = 0.1 * caustic(x * 0.5, z * 0.5, t) * edgeFade(x - cx, z - cz, 45);
        return { pos, rgb: underwater(scale(SHAFT, k), pos, E, true) };
      }
      // Shaft n stands on a grid 9 apart, the nearest seven columns and three rows to the eye.
      const n = Math.floor(hash(p.i, 87) * 21);
      const col = Math.floor(cx / 9) + (n % 7) - 3;
      const row = Math.floor(cz / 9) + Math.floor(n / 7) - 1;
      const s = hash(p.i, 88);
      const x0 = col * 9 + Math.sin(t * 0.07 + col) * 2;
      const z0 = row * 9;
      const pos: Vec3 = [
        x0 + s * 12 + (hash(p.i, 89) - 0.5) * 1.6,
        SURFACE - s * (SURFACE - G),
        z0 + s * 4 + (hash(p.i, 90) - 0.5) * 1.6,
      ];
      const k =
        0.08 *
        (1 - s) ** 0.7 *
        (0.75 + 0.25 * Math.sin(t * 0.21 + col * 1.7 + row)) *
        edgeFade(x0 - cx, (z0 - cz) * 2.3, 31) *
        (hash(col * 31 + row, 91) < 0.6 ? 1 : 0);
      return { pos, rgb: underwater(scale(SHAFT, k), pos, E, true) };
    }
    case 'floor': {
      // Sand over the basin, the canals sunk and darker, caustics rippling over it, the rim rising.
      // The Plan spreads it over the whole basin; a close view keeps it round the eye.
      let x: number;
      let z: number;
      let fade = 1;
      if (v === 0) {
        const r = (RIM + 8) * Math.sqrt(q);
        x = Math.cos(p.d * TAU) * r;
        z = Math.sin(p.d * TAU) * r;
      } else {
        const R = 30;
        x = near(hash(p.i, 92) * 400, E.target[0], R);
        z = near(hash(p.i, 93) * 400, E.target[2], R);
        fade = edgeFade(x - E.target[0], z - E.target[2], R);
      }
      const r = Math.hypot(x, z);
      const pos: Vec3 = [x, floorAt(x, z) + 0.04 * Math.sin(x * 1.3 + z * 0.7), z];
      const wet = pos[1] < G - 0.5;
      const base = wet ? TRENCH_SAND : r > RIM ? mix(SAND, [0.4, 0.42, 0.5], 0.6) : SAND;
      const k =
        (wet ? 0.12 : 0.1) *
        (v === 0 ? 1.7 : 1) *
        fade *
        caustic(x, z, t) *
        (0.7 + 0.3 * hash(p.i, 94));
      return { pos, rgb: underwater(scale(base, k), pos, E) };
    }
    case 'city':
    case 'temple':
    case 'harbour': {
      const B = role === 'city' ? M.city : role === 'temple' ? M.temple : M.harbour;
      const sh = role === 'city' ? CITY_SHARES : role === 'temple' ? TEMPLE_SHARES : HARBOUR_SHARES;
      const h = onMesh(B, p, q, t, E.eye, sh);
      // The heart's gold glows warmer toward its core.
      const warm = role === 'temple' ? 0.35 * Math.exp(-dist(h.pos, TEMPLE_SPHERE.c) / 1.5) : 0;
      let rgb = mix(meshColour(h, p, t, false), scale(WARM_WHITE, 0.6 * h.lit), warm);
      if (v === 0) rgb = planLift(rgb, h.pos, true);
      return { pos: h.pos, rgb: underwater(rgb, h.pos, E, h.tone === Tone.light) };
    }
    case 'reef': {
      const h = onMesh(M.reef, p, q, t, E.eye, REEF_SHARES);
      const pos = swayed(h.pos, h.key === KELP, t);
      const rgb = meshColour(h, p, t, true);
      return { pos, rgb: underwater(v === 0 ? planLift(rgb, pos, false) : rgb, pos, E) };
    }
    case 'map': {
      const pos = mapSite(p, q, t, MAP_RGB);
      return { pos, rgb: underwater([MAP_RGB[0], MAP_RGB[1], MAP_RGB[2]] as RGB, pos, E, true) };
    }
    case 'sub': {
      const g = Math.floor(q * SUB_COUNT);
      const { c, f, lane } = submarine(g, t);
      const s = subGrain(c, f, (SUB_LANES[lane] as SubLane).colour, p, t);
      return { pos: s.pos, rgb: underwater(s.rgb, s.pos, E, true) };
    }
    case 'bubble': {
      const g = Math.floor(q * SUB_COUNT);
      const a = frac(hash(p.i, 701) + t / BUBBLE_LIFE);
      const age = a * BUBBLE_LIFE;
      const pos = bubble(g, age, t, p.i);
      const k = 0.32 * smooth(a / 0.04) * (1 - a) ** 1.3 * (0.8 + 0.2 * Math.sin(age * 5 + p.i));
      return { pos, rgb: underwater(scale(BUBBLE, k), pos, E) };
    }
    case 'dock': {
      const b = Math.floor(q * BERTHS.length);
      const D = dockedSub(b, t);
      if (p.b < 0.8) {
        const s = subGrain(D.c, D.f, [1, 0.62, 0.18], { ...p, b: p.b / 0.8 }, t, D.k);
        return { pos: s.pos, rgb: underwater(s.rgb, s.pos, E, true) };
      }
      // Its bubbles, only while it moves.
      const a = frac(hash(p.i, 702) + t / BUBBLE_LIFE);
      const age = a * BUBBLE_LIFE;
      const then = dockedSub(b, t - age);
      const stern = add(then.c, then.f, -SUB_LEN * 0.55);
      const pos: Vec3 = [
        stern[0] + Math.sin(age * 2.4 + p.i) * 0.12 * age,
        stern[1] + bubbleRise(age),
        stern[2] + Math.cos(age * 2.1 + p.i) * 0.12 * age,
      ];
      const k = then.resting ? 0 : 0.32 * then.k * smooth(a / 0.04) * (1 - a) ** 1.3;
      return { pos, rgb: underwater(scale(BUBBLE, k), pos, E) };
    }
    case 'fish': {
      const { s, m } = FISH_OF[Math.floor(q * SCHOOL_FISH)] as { s: number; m: number };
      const S = SCHOOLS[s] as School;
      const { c, f } = schoolFish(s, m, t);
      const pos = fishGrain(c, f, S.len, p, t, m);
      const flash = 0.85 + 0.15 * Math.sin(t * 0.6 + m * 2.1);
      return { pos, rgb: underwater(scale(S.colour, 0.3 * flash), pos, E) };
    }
    case 'jelly': {
      const j = Math.floor(q * JELLIES);
      const { c, k } = jellyTop(j, t);
      const pos = jellyGrain(c, p, t, j);
      const glow = 0.26 * k * (0.8 + 0.2 * Math.sin(t * 0.9 + j));
      return { pos, rgb: underwater(scale(JELLY_COLOURS[j % 3] as RGB, glow), pos, E, true) };
    }
    case 'manta': {
      const j = Math.floor(q * MANTAS.length);
      const { c, f } = manta(j, t);
      const pos = mantaGrain(c, f, p, t, j);
      return { pos, rgb: underwater(scale([0.42, 0.58, 0.85], 0.3), pos, E) };
    }
    default: {
      const j = Math.floor(q * WHALES.length);
      const { c, f } = whale(j, t);
      const pos = whaleGrain(c, f, p, t);
      return { pos, rgb: underwater(scale([0.45, 0.6, 0.85], 0.4), pos, E) };
    }
  }
}
