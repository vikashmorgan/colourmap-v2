/**
 * Drive, Mars (docs/specs/drive-game.md, world 8). The pure half: the dunes under the wheels, the
 * Red Bastard's long loop over them, the rust stations standing on the plain and the derelict craft
 * hanging in the sky. No three.js, no DOM.
 *
 * 2026-11-23: "make the mars world not flat. and a bunch of big spaceships in the sky. like cool
 * rusty satellites. with rings around them"; "on mars put Mission Unlocked. Follow the Red Bastard";
 * "space stations on the ground. dome clusters … nova cores pipelines. cool factories and tubes.
 * and abandoned stations in the rust. a whole rusty space future."
 *
 * World: x east, y north, metres (the Salt Flat's, lib/art/salt-flat-game.ts).
 */

import { DRIFT_PATH } from '@/lib/art/drift-gates';
import { clamp } from '@/lib/art/drive';
import { PORTAL_R, type Portal } from '@/lib/art/mars-boost';
import { CANYONS, canyonCut, canyonGlsl, canyonNear, canyonPoint } from '@/lib/art/mars-canyons';
import {
  ARCHES,
  ATOMIC,
  archGate,
  CRATER,
  LAKE_LEVEL,
  LAKES,
  LIGHTHOUSE,
  PLACES,
  RAD_REACH,
  REGIONS,
  type Region,
} from '@/lib/art/mars-map';
import { DECK, type Deck, KICKER, type Kicker, rampHeight, SLAB } from '@/lib/art/mars-ramps';
import { placeRocks, type Rock, type RockArch, rockArchFeet } from '@/lib/art/mars-rocks';
import {
  type Barrel,
  type Box,
  barrelAt,
  barrelHit,
  boxHit,
  CITY,
  FLATS,
  galleryFor,
  MEGA_WORKS,
  NUKE_RAD,
  NUKES,
  platformTop,
  ROOF_STEP,
  type Tank,
  TOWN,
  townXY,
  WORK_R,
} from '@/lib/art/mars-works';
import {
  ARTEFACT_DEFS,
  ARTEFACT_R,
  type Artefact,
  artefactSolids,
  type Discovery,
  discoveries,
  type Hull,
  hullFloor,
  hullHit,
  layWreck,
  nearHull,
  type Solid,
  solidHit,
  TRENCH,
  WRECK_DEFS,
  WRECK_FLATS,
  WRECK_REACH,
  type Wreck,
  wreckSolids,
} from '@/lib/art/mars-wrecks';
import { LINE, SALT_PERIOD, START } from '@/lib/art/salt-flat-game';
import { type Ground, type Hit, MARS_HANDLING, type Vehicle, type World } from '@/lib/art/vehicle';

/* ── The dunes ─────────────────────────────────────────────── */

/**
 * The terrain is a sum of smooth waves, each a whole number of cycles across the ground's period
 * (2,048 m both ways), so the backdrop shader, which sees the ground wrapped to that period, draws
 * exactly the hills the physics drives. Big swells (380 to 650 m long, 2.4 to 4 m high) carry
 * rolling dunes (120 to 210 m, 0.5 to 1.3 m). The steepest slope anywhere is under 15°; the sharpest
 * crests throw a car near top speed into a short air, never at cruising speed.
 * [n, m, amplitude (m), phase]: the wave runs along (n, m) cycles per period.
 */
export const DUNE_WAVES: readonly [number, number, number, number][] = [
  [1, 2, 9.0, 0.3],
  [3, 1, 6.5, 2.4],
  [-1, 4, 5.0, 1.7],
  [2, -5, 3.6, 4.1],
  [9, 4, 1.5, 2.2],
  [-6, 11, 0.8, 5.0],
  [13, -7, 0.4, 0.9],
];

/** Highest the dunes can stand (m): the sum of the amplitudes. */
export const DUNE_MAX = DUNE_WAVES.reduce((s, w) => s + w[2], 0);

const K = (2 * Math.PI) / SALT_PERIOD;

/**
 * Where the plain is kept flat: the measured mile's corridor along the painted line, and the dry
 * lake bed the drift gates stand on. Flat within `flat` m, the dunes back in full by `full` m.
 */
export const FLAT_LINE = { flat: 30, full: 260 };
export const DRIFT_PAN = (() => {
  const xs = DRIFT_PATH.map((p) => p[0]);
  const ys = DRIFT_PATH.map((p) => p[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = Math.max(...DRIFT_PATH.map((p) => Math.hypot(p[0] - x, p[1] - y)));
  return { x, y, flat: r + 40, full: r + 260 };
})();

function smooth(e0: number, e1: number, v: number): number {
  const k = clamp((v - e0) / (e1 - e0), 0, 1);
  return k * k * (3 - 2 * k);
}

function smoothD(e0: number, e1: number, v: number): number {
  const k = (v - e0) / (e1 - e0);
  if (k <= 0 || k >= 1) return 0;
  return (6 * k * (1 - k)) / (e1 - e0);
}

/** The bare dunes (no flattening), with their slope. */
function waves(x: number, y: number): { h: number; gx: number; gy: number } {
  let h = 0;
  let gx = 0;
  let gy = 0;
  for (const [n, m, a, p] of DUNE_WAVES) {
    const arg = K * (n * x + m * y) + p;
    h += a * Math.sin(arg);
    const c = a * Math.cos(arg) * K;
    gx += c * n;
    gy += c * m;
  }
  return { h, gx, gy };
}

/** How much of the dunes stand at a point (0 on the flat corridor and the lake bed, 1 out on the
 * dunes), with its slope. */
export function duneMask(x: number, y: number): { m: number; mx: number; my: number } {
  // The line's corridor: distance to the segment x = LINE.x, y0..y1.
  const cy = clamp(y, LINE.y0, LINE.y1);
  const lx = x - LINE.x;
  const ly = y - cy;
  const dl = Math.hypot(lx, ly) || 1e-6;
  const ml = smooth(FLAT_LINE.flat, FLAT_LINE.full, dl);
  const dml = smoothD(FLAT_LINE.flat, FLAT_LINE.full, dl);
  const px = x - DRIFT_PAN.x;
  const py = y - DRIFT_PAN.y;
  const dp = Math.hypot(px, py) || 1e-6;
  const mp = smooth(DRIFT_PAN.flat, DRIFT_PAN.full, dp);
  const dmp = smoothD(DRIFT_PAN.flat, DRIFT_PAN.full, dp);
  return {
    m: ml * mp,
    mx: dml * (lx / dl) * mp + ml * dmp * (px / dp),
    my: dml * (ly / dl) * mp + ml * dmp * (py / dp),
  };
}

/** The crater's profile at a distance d from its middle: the bowl, then the rim falling away. */
export function craterHeight(d: number): number {
  const u = d / CRATER.R;
  if (u < 1) return -CRATER.depth + (CRATER.depth + CRATER.rim) * u * u;
  return CRATER.rim * Math.exp(-(((u - 1) / 0.3) ** 2));
}

/** The flattened ground: the towns' (lib/art/mars-works.ts) and the wrecks' (lib/art/mars-wrecks.ts). */
const GROUND_FLATS = [...FLATS, ...WRECK_FLATS];

/** How much of the dunes stand near the crater and the lakes (0 in them, 1 away). */
function featureMask(x: number, y: number): number {
  const dc = Math.hypot(x - CRATER.x, y - CRATER.y);
  let m = smooth(CRATER.R * 1.05, CRATER.R * 1.6, dc);
  for (const l of LAKES) m *= smooth(l.r, l.r + 450, Math.hypot(x - l.x, y - l.y));
  // The towns stand on flattened ground (lib/art/mars-works.ts FLATS).
  for (const f of GROUND_FLATS) m *= smooth(f.flat, f.full, Math.hypot(x - f.x, y - f.y));
  return m;
}

/** The kickers and decks (filled in once the stations and pipelines are placed, below). */
export const KICKERS: Kicker[] = [];
export const DECKS: Deck[] = [];

/** The rocks round the canyons, solid (filled in below): mesas, spires, boulders, and the rock arches' feet. */
export const ROCKS: Rock[] = [];
/** The natural arches over the canyons' floors (the way under is open). */
export const ROCK_ARCHES: RockArch[] = [];
/** The factory city's buildings, tanks and barrel pipes (filled in below, once clear). */
export const BOXES: Box[] = [];
export const TANKS: Tank[] = [];
export const BARRELS: Barrel[] = [];
/** The crashed stations, their hulls you drive through, the artefacts, what of them is solid and
 * everything there is to find (filled in below, once clear; lib/art/mars-wrecks.ts). */
export const WRECKS: Wreck[] = [];
export const HULLS: Hull[] = [];
export const ARTEFACTS: Artefact[] = [];
export const WRECK_SOLIDS: Solid[] = [];
export const DISCOVERIES: Discovery[] = [];

/** The ground's height on Mars (m) as the physics drives it: the terrain and the ramps, decks
 * and barrel floors on it, or a roof or tank top where one stands higher. */
export function marsHeight(x: number, y: number): number {
  let h = marsBase(x, y) + rampHeight(KICKERS, DECKS, x, y);
  for (const b of BARRELS) h += barrelAt(b, x, y).h;
  for (const hl of HULLS) if (nearHull(hl, x, y, 0)) h += hullFloor(hl, x, y);
  if (BOXES.length || TANKS.length) h = Math.max(h, platformTop(BOXES, TANKS, x, y));
  return h;
}

/** The bare terrain (m): the dunes, flattened on the course, the canyons cut into them, the
 * great crater and the flat glowing lakes. The backdrop draws this; the ramps and decks are meshes
 * on it. */
export function marsBase(x: number, y: number): number {
  let h = waves(x, y).h * duneMask(x, y).m * featureMask(x, y);
  h -= canyonCut(x, y).carve;
  const dc = Math.hypot(x - CRATER.x, y - CRATER.y);
  if (dc < CRATER.R * 2.5) h += craterHeight(dc);
  for (const l of LAKES) {
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < l.r * 1.35) h += (LAKE_LEVEL - h) * (1 - smooth(l.r, l.r * 1.35, d));
  }
  return h;
}

const EPS = 0.05;

/** The ground on Mars: its height and slope, smooth regolith that never drags. */
export function marsGround(x: number, y: number): Ground {
  return {
    h: marsHeight(x, y),
    gx: (marsHeight(x + EPS, y) - marsHeight(x - EPS, y)) / (2 * EPS),
    gy: (marsHeight(x, y + EPS) - marsHeight(x, y - EPS)) / (2 * EPS),
    rough: 0,
  };
}

/** Whether a point is on a lake's glowing surface. */
export function onLake(x: number, y: number): boolean {
  return LAKES.some((l) => Math.hypot(x - l.x, y - l.y) < l.r);
}

/** How strong the radiation is at a point (0..1): full at a lake's shore, none RAD_REACH past it. */
export function radiation(x: number, y: number): number {
  let r = 0;
  for (const l of LAKES) {
    const d = Math.hypot(x - l.x, y - l.y) - l.r;
    r = Math.max(r, 1 - smooth(0, RAD_REACH, d));
  }
  // The nuclear towns' reactors, milder than the lakes.
  for (const n of NUKES) {
    const d = Math.hypot(x - n.x, y - n.y) - 40;
    r = Math.max(r, NUKE_RAD.peak * (1 - smooth(0, NUKE_RAD.reach, d)));
  }
  return r;
}

/**
 * The terrain in GLSL for the backdrop (lib/art/drive-shaders.ts, `#define WORLD 4`): the same
 * waves on the wrapped ground g, flattened by distance to the line and the lake bed measured in the
 * camera's frame (rel), with the crater and the lakes. `org` is the world origin in that frame
 * (minus the camera's position).
 */
export function marsTerrainGlsl(): string {
  const f = (v: number) => v.toFixed(6);
  const terms = DUNE_WAVES.map(
    ([n, m, a, p]) => `  h += ${f(a)} * sin(${f(K)} * (${f(n)} * g.x + ${f(m)} * g.y) + ${f(p)});`,
  ).join('\n');
  const flatMask = GROUND_FLATS.map(
    (q) => `  m *= smoothstep(${f(q.flat)}, ${f(q.full)}, length(a - vec2(${f(q.x)}, ${f(q.y)})));`,
  ).join('\n');
  const lakeMask = LAKES.map(
    (l) => `  m *= smoothstep(${f(l.r)}, ${f(l.r + 450)}, length(a - vec2(${f(l.x)}, ${f(l.y)})));`,
  ).join('\n');
  const lakeFill = LAKES.map(
    (l) =>
      `  h = mix(h, ${f(LAKE_LEVEL)}, 1.0 - smoothstep(${f(l.r)}, ${f(l.r * 1.35)}, length(a - vec2(${f(l.x)}, ${f(l.y)}))));`,
  ).join('\n');
  const lakeIn = LAKES.map(
    (l) => `  k = max(k, 1.0 - length(a - vec2(${f(l.x)}, ${f(l.y)})) / ${f(l.r)});`,
  ).join('\n');
  return `#define MARS_HMAX ${f(Math.max(DUNE_MAX, CRATER.rim) + 0.5)}
${canyonGlsl()}
float marsCrater(float d) {
  float u = d / ${f(CRATER.R)};
  if (u < 1.0) return ${f(-CRATER.depth)} + ${f(CRATER.depth + CRATER.rim)} * u * u;
  return ${f(CRATER.rim)} * exp(-pow((u - 1.0) / 0.3, 2.0));
}
float marsH(vec2 g, vec2 rel, vec2 org) {
  float h = 0.0;
${terms}
  vec2 a = rel - org;
  float dl = length(vec2(a.x - ${f(LINE.x)}, a.y - clamp(a.y, ${f(LINE.y0)}, ${f(LINE.y1)})));
  float dp = length(a - vec2(${f(DRIFT_PAN.x)}, ${f(DRIFT_PAN.y)}));
  float dc = length(a - vec2(${f(CRATER.x)}, ${f(CRATER.y)}));
  float m = smoothstep(${f(FLAT_LINE.flat)}, ${f(FLAT_LINE.full)}, dl) * smoothstep(${f(DRIFT_PAN.flat)}, ${f(DRIFT_PAN.full)}, dp);
  m *= smoothstep(${f(CRATER.R * 1.05)}, ${f(CRATER.R * 1.6)}, dc);
${lakeMask}
${flatMask}
  h *= m;
  float ck;
  h -= marsCanyon(a, ck);
  if (dc < ${f(CRATER.R * 2.5)}) h += marsCrater(dc);
${lakeFill}
  return h;
}
// How far inside a lake a point is (0 at the shore or outside, 1 at its middle).
float marsLake(vec2 rel, vec2 org) {
  vec2 a = rel - org;
  float k = 0.0;
${lakeIn}
  return k;
}
`;
}

/* ── The Red Bastard's loop ────────────────────────────────── */

/**
 * He runs a long closed loop over the dunes, round a point north of the start: a circle of 1.7 km
 * wobbled three and five times round, so it swings in long curves (never tighter than about 300 m)
 * and passes about a kilometre in front of where you start.
 */
export const LOOP = { cx: -300, cy: 2900, r: 1700, a3: 0.22, p3: 0.7, a5: 0.1, p5: 2.1 };

function loopXY(th: number): [number, number] {
  const r =
    LOOP.r * (1 + LOOP.a3 * Math.sin(3 * th + LOOP.p3) + LOOP.a5 * Math.sin(5 * th + LOOP.p5));
  return [LOOP.cx + Math.cos(th) * r, LOOP.cy + Math.sin(th) * r];
}

const LOOP_N = 2048;

/** The loop sampled round, with the distance run to each sample. */
export const LOOP_PATH = (() => {
  const x = new Float64Array(LOOP_N + 1);
  const y = new Float64Array(LOOP_N + 1);
  const s = new Float64Array(LOOP_N + 1);
  // Start where it passes south of the centre, running east (counter-clockwise).
  const th0 = -Math.PI / 2;
  for (let i = 0; i <= LOOP_N; i++) {
    const [px, py] = loopXY(th0 + (i / LOOP_N) * Math.PI * 2);
    x[i] = px;
    y[i] = py;
    s[i] = i === 0 ? 0 : s[i - 1] + Math.hypot(px - x[i - 1], py - y[i - 1]);
  }
  return { x, y, s, length: s[LOOP_N] };
})();

/** His place on the loop, `s` metres round from its start: position, heading and curvature. */
export function loopAt(s: number): { x: number; y: number; h: number; k: number } {
  const L = LOOP_PATH.length;
  const q = ((s % L) + L) % L;
  let lo = 0;
  let hi = LOOP_N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (LOOP_PATH.s[mid] <= q) lo = mid;
    else hi = mid;
  }
  const seg = LOOP_PATH.s[hi] - LOOP_PATH.s[lo] || 1;
  const f = (q - LOOP_PATH.s[lo]) / seg;
  const x = LOOP_PATH.x[lo] + (LOOP_PATH.x[hi] - LOOP_PATH.x[lo]) * f;
  const y = LOOP_PATH.y[lo] + (LOOP_PATH.y[hi] - LOOP_PATH.y[lo]) * f;
  const h = Math.atan2(LOOP_PATH.y[hi] - LOOP_PATH.y[lo], LOOP_PATH.x[hi] - LOOP_PATH.x[lo]);
  // Curvature from the headings a few samples either side.
  const a = (lo - 4 + LOOP_N) % LOOP_N;
  const b = (lo + 4) % LOOP_N;
  const ha = Math.atan2(LOOP_PATH.y[a + 1] - LOOP_PATH.y[a], LOOP_PATH.x[a + 1] - LOOP_PATH.x[a]);
  const hb = Math.atan2(LOOP_PATH.y[b + 1] - LOOP_PATH.y[b], LOOP_PATH.x[b + 1] - LOOP_PATH.x[b]);
  let dh = hb - ha;
  dh -= Math.PI * 2 * Math.round(dh / (Math.PI * 2));
  const ds = (LOOP_PATH.length / LOOP_N) * 8;
  return { x, y, h, k: dh / ds };
}

/** Distance from a point to the loop (m), from a coarse polyline (good to a few centimetres). */
export function distToLoop(x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  const step = 4;
  for (let i = 0; i < LOOP_N; i += step) {
    const j = i + step;
    const ax = LOOP_PATH.x[i];
    const ay = LOOP_PATH.y[i];
    const bx = LOOP_PATH.x[j];
    const by = LOOP_PATH.y[j];
    const dx = bx - ax;
    const dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) best = d;
  }
  return best;
}

/**
 * His pace (m/s): fast (216 km/h), a sprint when you close in (245 km/h), always under a car's top
 * speed (331 km/h), so he can be caught.
 */
export const BASTARD = { speed: 60, sprint: 68, sprintNear: 220, hover: 0.75, catchR: 14 };

export interface Bastard {
  s: number;
  speed: number;
}

export function newBastard(): Bastard {
  return { s: 0, speed: BASTARD.speed };
}

/** Moves him on round the loop; he sprints while you are within `sprintNear` m. `slow` (0..1) is
 * the share of his pace he keeps while an attack has him slowed. */
export function stepBastard(b: Bastard, dt: number, gap: number, slow = 1): Bastard {
  const want = (gap < BASTARD.sprintNear ? BASTARD.sprint : BASTARD.speed) * slow;
  const speed = b.speed + (want - b.speed) * (1 - Math.exp(-1.5 * dt));
  return { s: (b.s + speed * dt) % LOOP_PATH.length, speed };
}

/** Where he is in the world: on the loop, riding the dunes. */
export function bastardPose(b: Bastard): { x: number; y: number; z: number; h: number; k: number } {
  const p = loopAt(b.s);
  return { ...p, z: marsHeight(p.x, p.y) + BASTARD.hover };
}

/** Close enough counts as caught. */
export function caught(dx: number, dy: number, dz = 0): boolean {
  return Math.hypot(dx, dy, dz) < BASTARD.catchR;
}

/** The region a point is in (the map's first that holds it), or null out on open Mars. The run is
 * the band within 160 m of his loop. */
export function regionAt(x: number, y: number): Region | null {
  for (const r of REGIONS) {
    if (r.id === 'run') {
      if (distToLoop(x, y) < 160) return r;
    } else if (Math.hypot(x - r.x, y - r.y) < r.r) return r;
  }
  return null;
}

/* ── The rust stations ─────────────────────────────────────── */

export type SiteKind =
  | 'domes'
  | 'nova'
  | 'factory'
  | 'ruin'
  | 'atomic'
  | 'lighthouse'
  | 'chimney'
  | 'cooling'
  | 'reactor'
  | 'preheater'
  | 'silos';

export interface Site {
  x: number;
  y: number;
  kind: SiteKind;
  /** What it stands on: you flow round this circle (m). */
  r: number;
  rot: number;
  seed: number;
}

/** How big each kind stands (its footprint's radius, m). */
export const SITE_R: Record<SiteKind, number> = {
  domes: 34,
  factory: 42,
  nova: 18,
  ruin: 26,
  atomic: 48,
  lighthouse: 7,
  ...WORK_R,
};

/** The clearances: his loop, the line's corridor, the start and the drift lake bed (m). */
export const CLEAR = { loop: 70, line: 140, start: 420, pan: 60, pipeLoop: 30 };

function hash(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Whether a circle at (x, y) of radius r leaves the open ways clear. */
export function siteClear(x: number, y: number, r: number): boolean {
  const cy = clamp(y, LINE.y0, LINE.y1);
  if (Math.hypot(x - LINE.x, y - cy) < r + CLEAR.line) return false;
  if (Math.hypot(x - START.x, y - START.y) < r + CLEAR.start) return false;
  if (Math.hypot(x - DRIFT_PAN.x, y - DRIFT_PAN.y) < DRIFT_PAN.full + r + CLEAR.pan) return false;
  // Out of the crater's bowl and off its rim, out of the lakes, clear of the arches.
  if (Math.hypot(x - CRATER.x, y - CRATER.y) < CRATER.R * 1.5 + r) return false;
  for (const l of LAKES) if (Math.hypot(x - l.x, y - l.y) < l.r * 1.35 + r + 20) return false;
  for (const a of ARCHES) if (Math.hypot(x - a.x, y - a.y) < a.r + r + 60) return false;
  // Off the canyons' cuts.
  if (canyonNear(x, y, r)) return false;
  return distToLoop(x, y) >= r + CLEAR.loop;
}

/** The arches' feet, solid (the way between them is open). */
export const ARCH_FEET: { x: number; y: number }[] = ARCHES.flatMap((a) => {
  const g = archGate(a);
  return [
    { x: g.ax, y: g.ay },
    { x: g.bx, y: g.by },
  ];
});
const FOOT_R = 1.9;

/** The stations, placed by the map (lib/art/mars-map.ts): the city's domes and Nova Cores, the
 * factory belt, the derelicts, the atomic plants by the lakes and the lighthouse on the crater's
 * rim; each kept only where it leaves the open ways clear. */
export const SITES: Site[] = (() => {
  const out: Site[] = [];
  PLACES.forEach(([x, y, kind], i) => {
    const r = SITE_R[kind];
    if (!siteClear(x, y, r)) return;
    out.push({ x, y, kind, r, rot: hash(i, 7, 5) * Math.PI * 2, seed: hash(i, 7, 6) });
  });
  ATOMIC.forEach((p, i) => {
    if (siteClear(p.x, p.y, SITE_R.atomic))
      out.push({ ...p, kind: 'atomic', r: SITE_R.atomic, seed: hash(i, 9, 6) });
  });
  out.push({
    x: LIGHTHOUSE.x,
    y: LIGHTHOUSE.y,
    kind: 'lighthouse',
    r: LIGHTHOUSE.r,
    rot: 0,
    seed: 0.5,
  });
  // The factory city's stacks, towers and reactors (lib/art/mars-works.ts): the towns' own when
  // the towns are clear, the mega works one by one, off the towns' flat ground.
  if (cityClear()) {
    CITY.works.forEach((w, i) => {
      out.push({ ...w, r: SITE_R[w.kind], seed: hash(i, 11, 6) });
    });
  }
  MEGA_WORKS.forEach((w, i) => {
    const r = SITE_R[w.kind];
    if (!siteClear(w.x, w.y, r)) return;
    if (FLATS.some((f) => Math.hypot(w.x - f.x, w.y - f.y) < f.flat + r + 40)) return;
    out.push({ ...w, r, seed: hash(i, 12, 6) });
  });
  return out;
})();

/** Whether the towns leave the open ways clear (each its whole flat ground). */
export function cityClear(): boolean {
  return FLATS.every((f) => siteClear(f.x, f.y, f.full));
}

// The towns' buildings, tanks and barrel (lib/art/mars-works.ts), when clear.
if (cityClear()) {
  BOXES.push(...CITY.boxes);
  TANKS.push(...CITY.tanks);
  BARRELS.push(...CITY.barrels);
}

export interface Pipe {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Whether a pipeline run stays clear of his loop, the line's corridor and the start. */
export function pipeClear(p: Pipe): boolean {
  const len = Math.hypot(p.bx - p.ax, p.by - p.ay);
  const n = Math.max(2, Math.ceil(len / 20));
  for (let i = 0; i <= n; i++) {
    const x = p.ax + ((p.bx - p.ax) * i) / n;
    const y = p.ay + ((p.by - p.ay) * i) / n;
    if (distToLoop(x, y) < CLEAR.pipeLoop) return false;
    const cy = clamp(y, LINE.y0, LINE.y1);
    if (Math.hypot(x - LINE.x, y - cy) < CLEAR.line * 0.6) return false;
    if (Math.hypot(x - START.x, y - START.y) < CLEAR.start * 0.6) return false;
  }
  return true;
}

/** The pipelines: from each Nova Core to the nearest two stations within 1.1 km, where clear. Up
 * on trestles 5 m high, so anything that drives under them passes. */
export const PIPE_H = 5;
export const PIPES: Pipe[] = (() => {
  const out: Pipe[] = [];
  for (const a of SITES) {
    if (a.kind !== 'nova') continue;
    const near = SITES.filter((b) => b !== a)
      .map((b) => ({ b, d: Math.hypot(b.x - a.x, b.y - a.y) }))
      .filter((o) => o.d < 1100)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    for (const { b } of near) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      const p = {
        ax: a.x + (dx / l) * a.r,
        ay: a.y + (dy / l) * a.r,
        bx: b.x - (dx / l) * b.r,
        by: b.y - (dy / l) * b.r,
      };
      if (pipeClear(p)) out.push(p);
    }
  }
  return out;
})();

/** Whether a kicker leaves the open ways clear (his loop, the line, the start, the drift pan). */
export function kickerClear(k: Kicker): boolean {
  // The run-up too (60 m before it) must miss the stations.
  for (const u of [-60, -30]) {
    if (siteHit(k.x + Math.cos(k.h) * u, k.y + Math.sin(k.h) * u, k.width / 2 + 2)) return false;
  }
  for (const u of [0, k.len / 2, k.len + KICKER.back]) {
    const x = k.x + Math.cos(k.h) * u;
    const y = k.y + Math.sin(k.h) * u;
    if (distToLoop(x, y) < 40) return false;
    const cy = clamp(y, LINE.y0, LINE.y1);
    if (Math.hypot(x - LINE.x, y - cy) < 60) return false;
    if (Math.hypot(x - START.x, y - START.y) < 120) return false;
    if (Math.hypot(x - DRIFT_PAN.x, y - DRIFT_PAN.y) < DRIFT_PAN.full + 20) return false;
    if (siteHit(x, y, k.width / 2 + 4)) return false;
  }
  return true;
}

// Two kickers by each factory, running past it; a ring of them out on the Landing Plain;
// a deck on top of each pipeline run.
(() => {
  const add = (x: number, y: number, h: number) => {
    const k: Kicker = { x, y, h, len: KICKER.len, height: KICKER.height, width: KICKER.width };
    if (kickerClear(k)) KICKERS.push(k);
  };
  for (const s of SITES) {
    if (s.kind !== 'factory') continue;
    for (const a of [s.rot, s.rot + Math.PI]) {
      const d = s.r + 16;
      // Tangent to the factory, so the run-up passes beside it, not through it.
      add(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, a + Math.PI / 2);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    add(START.x + Math.cos(a) * 560, START.y + Math.sin(a) * 560, a + Math.PI / 2);
  }
  // The factory city's roof ramps and the mega works' conveyor galleries.
  const big = (r: Omit<Kicker, 'gallery'>) => {
    const k: Kicker = { ...r, gallery: true };
    if (kickerClear(k)) KICKERS.push(k);
  };
  if (BOXES.length) for (const r of CITY.ramps) big(r);
  for (const s of MEGA_SITES()) big(galleryFor(s));
  for (const p of PIPES) {
    const L = Math.hypot(p.bx - p.ax, p.by - p.ay);
    if (L < DECK.ramp * 2 + 30) continue;
    DECKS.push({ ...p, height: DECK.height, width: DECK.width, ramp: DECK.ramp });
  }
})();

/* ── The rock fields and the portals (docs/specs/mars-world.md) ── */

(() => {
  const placed = placeRocks((x, y, r) => siteClear(x, y, r) && !rampNear(x, y, r));
  ROCKS.push(...placed.rocks.filter((r) => !rampNear(r.x, r.y, r.r)));
  for (const a of placed.arches) {
    ROCK_ARCHES.push(a);
    ROCKS.push(...rockArchFeet(a));
  }
  // The slabs: natural kickers, kept off the rocks and clear of the open ways.
  for (const s of placed.slabs) {
    const k: Kicker = {
      x: s.x - Math.cos(s.h) * SLAB.len * 0.5,
      y: s.y - Math.sin(s.h) * SLAB.len * 0.5,
      h: s.h,
      len: SLAB.len,
      height: SLAB.height,
      width: SLAB.width,
      rock: true,
    };
    if (slabClear(k)) KICKERS.push(k);
  }
})();

/** Whether a footprint would sit on a kicker or deck (or its run-up). */
function rampNear(x: number, y: number, r: number): boolean {
  for (const k of KICKERS) {
    for (const u of [-50, -25, 0, k.len / 2, k.len + KICKER.back])
      if (
        Math.hypot(x - k.x - Math.cos(k.h) * u, y - k.y - Math.sin(k.h) * u) <
        r + k.width / 2 + 4
      )
        return true;
  }
  return false;
}

/** A slab's run-up and landing must miss the rocks and keep off his loop, the line and start. */
function slabClear(k: Kicker): boolean {
  for (const u of [-60, -30, 0, k.len / 2, k.len, k.len + 40]) {
    const x = k.x + Math.cos(k.h) * u;
    const y = k.y + Math.sin(k.h) * u;
    if (distToLoop(x, y) < 60) return false;
    if (Math.hypot(x - START.x, y - START.y) < CLEAR.start) return false;
    for (const r of ROCKS) if (Math.hypot(x - r.x, y - r.y) < r.r + k.width / 2 + 4) return false;
    for (const s of SITES) if (Math.hypot(x - s.x, y - s.y) < s.r + k.width / 2 + 4) return false;
  }
  return true;
}

/**
 * The superboost portals (lib/art/mars-boost.ts): two on the approach to each canyon, one where
 * each gorge narrows, one at each canyon's mouth and two more out along the desert straight
 * beyond it. Each kept off the rocks, the stations and the ramps, and clear of his loop.
 */
export const PORTALS: Portal[] = (() => {
  const out: Portal[] = [];
  const add = (x: number, y: number, h: number) => {
    if (distToLoop(x, y) < 60) return;
    if (Math.hypot(x - START.x, y - START.y) < 300) return;
    if (siteHit(x, y, PORTAL_R + 6)) return;
    if (rampNear(x, y, PORTAL_R + 4)) return;
    out.push({ x, y, h, r: PORTAL_R });
  };
  for (const arcs of CANYONS) {
    const first = arcs[0];
    const h0 = canyonPoint(first, 0).h;
    for (const u of [300, 700]) add(first.x0 - Math.cos(h0) * u, first.y0 - Math.sin(h0) * u, h0);
    for (const a of arcs)
      if (a.w0 >= 60 && a.w1 < 60) {
        const p = canyonPoint(a, 0.04);
        add(p.x, p.y, p.h);
      }
    const last = arcs[arcs.length - 1];
    for (const u of [60, 700, 1200])
      add(last.x1 + Math.cos(last.h1) * u, last.y1 + Math.sin(last.h1) * u, last.h1);
  }
  // One half way down the Foundry Town's avenue, sending you down the chimney slalom.
  if (BOXES.length) {
    const p = townXY(-40, 0);
    add(p.x, p.y, TOWN.rot);
  }
  return out;
})();

/* ── Things to explore (docs/specs/mars-world.md) ── */

/** Whether a wreck's whole ground (and its trench) leaves the open ways, the stations, the rocks,
 * the ramps and the portals clear. */
export function wreckClear(x: number, y: number, h: number, L: number): boolean {
  if (!siteClear(x, y, WRECK_REACH) || siteHit(x, y, WRECK_REACH)) return false;
  if (rampNear(x, y, WRECK_REACH)) return false;
  if (PORTALS.some((p) => Math.hypot(p.x - x, p.y - y) < WRECK_REACH + p.r + 20)) return false;
  // The trench back from the hull's tail.
  for (let u = L / 2; u <= L / 2 + TRENCH.len; u += 40) {
    const px = x - Math.cos(h) * u;
    const py = y - Math.sin(h) * u;
    if (!siteClear(px, py, TRENCH.w) || siteHit(px, py, TRENCH.w)) return false;
  }
  return true;
}

(() => {
  WRECK_DEFS.forEach((d, i) => {
    if (!wreckClear(d.x, d.y, d.h, d.L)) return;
    const w = layWreck(d, i);
    WRECKS.push(w);
    HULLS.push(w.hull);
    WRECK_SOLIDS.push(...wreckSolids(w));
  });
  ARTEFACT_DEFS.forEach((d, i) => {
    const r = ARTEFACT_R[d.kind];
    if (!siteClear(d.x, d.y, r) || siteHit(d.x, d.y, r + 20) || rampNear(d.x, d.y, r)) return;
    if (PORTALS.some((p) => Math.hypot(p.x - d.x, p.y - d.y) < r + p.r + 30)) return;
    const a: Artefact = { ...d, seed: hash(i, 13, 6) };
    ARTEFACTS.push(a);
    WRECK_SOLIDS.push(...artefactSolids(a));
  });
  DISCOVERIES.push(...discoveries(WRECKS, ARTEFACTS));
})();

/** The mega works that stand (not the towns' own towers). */
function MEGA_SITES() {
  return MEGA_WORKS.filter((w) => SITES.some((s) => s.x === w.x && s.y === w.y));
}

/** You flow round a station's footprint, never crash into it (as along every wall). */
export function siteHit(
  x: number,
  y: number,
  radius = 1.2,
  z = Number.NEGATIVE_INFINITY,
): Hit | null {
  // The factory city's walls: a box or tank is solid below its top (above it you drive its roof).
  for (const b of BOXES) {
    const h = boxHit(b, x, y, radius, z);
    if (h) return { ...h, loss: 0, spin: 0, flow: true };
  }
  for (const t of TANKS) {
    if (z > t.h - ROOF_STEP) continue;
    const dx = x - t.x;
    const dy = y - t.y;
    const reach = t.r + radius;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy);
    if (d >= reach) continue;
    return {
      nx: d > 1e-6 ? dx / d : 1,
      ny: d > 1e-6 ? dy / d : 0,
      depth: reach - d,
      loss: 0,
      spin: 0,
      flow: true,
    };
  }
  for (const b of BARRELS) {
    const h = barrelHit(b, x, y, radius);
    if (h) return { ...h, loss: 0, spin: 0, flow: true };
  }
  for (const s of SITES) {
    const dx = x - s.x;
    const dy = y - s.y;
    const reach = s.r + radius;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy);
    if (d >= reach) continue;
    const nx = d > 1e-6 ? dx / d : 1;
    const ny = d > 1e-6 ? dy / d : 0;
    return { nx, ny, depth: reach - d, loss: 0, spin: 0, flow: true };
  }
  for (const r of ROCKS) {
    const dx = x - r.x;
    const dy = y - r.y;
    const reach = r.r + radius;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy);
    if (d >= reach) continue;
    const nx = d > 1e-6 ? dx / d : 1;
    const ny = d > 1e-6 ? dy / d : 0;
    return { nx, ny, depth: reach - d, loss: 0, spin: 0, flow: true };
  }
  // The wrecks: their hulls' shells, the ring feet, noses, debris and artefacts, solid below their tops.
  for (const hl of HULLS) {
    if (!nearHull(hl, x, y, radius + 2)) continue;
    const h = hullHit(hl, x, y, radius, z - marsBase(x, y));
    if (h) return { ...h, loss: 0, spin: 0, flow: true };
  }
  for (const s of WRECK_SOLIDS) {
    const reach = s.r + radius;
    if (Math.abs(x - s.x) > reach || Math.abs(y - s.y) > reach) continue;
    const h = solidHit(s, x, y, radius, z - marsBase(x, y));
    if (h) return { ...h, loss: 0, spin: 0, flow: true };
  }
  for (const f of ARCH_FEET) {
    const dx = x - f.x;
    const dy = y - f.y;
    const reach = FOOT_R + radius;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    const d = Math.hypot(dx, dy);
    if (d >= reach) continue;
    const nx = d > 1e-6 ? dx / d : 1;
    const ny = d > 1e-6 ? dy / d : 0;
    return { nx, ny, depth: reach - d, loss: 0, spin: 0, flow: true };
  }
  return null;
}

/** Mars's world for the physics: the dunes, the stations to flow round, its own handling. */
export const MARS_TERRAIN: World = {
  ground: marsGround,
  collide: (v: Vehicle) => siteHit(v.x, v.y, 1.2, v.z),
  handling: MARS_HANDLING,
};

/* ── The craft in the sky ──────────────────────────────────── */

export type CraftKind = 'station' | 'carrier' | 'gyro' | 'dish';

export interface Craft {
  kind: CraftKind;
  /** Where it hangs: its bearing from the start (counter-clockwise from east), how far out and how
   * high (m), and its length (m). */
  az: number;
  dist: number;
  alt: number;
  size: number;
  /** Its rings: radius (share of the size), tilt (rad) and how fast it turns (rad/s; 0 still). */
  rings: { r: number; tilt: number; spin: number }[];
  /** How it lies: a slow drift of its own yaw (rad/s) and its fixed pitch. */
  yaw: number;
  pitch: number;
  seed: number;
}

/**
 * Five derelicts, huge and far: 4.8 to 7 km out, 0.5 to 1 km up (5° to 12° over the horizon, so
 * they hang in view as you drive), 600 m to 1.4 km long. They drift at
 * a few hundredths of a degree a second; rings turn once in two to five minutes.
 */
export const CRAFT: Craft[] = [
  {
    kind: 'station',
    az: START.h + 0.35,
    dist: 6400,
    alt: 900,
    size: 1400,
    rings: [
      { r: 0.42, tilt: 0.25, spin: 0.03 },
      { r: 0.3, tilt: -0.2, spin: 0 },
    ],
    yaw: 0.0015,
    pitch: 0.12,
    seed: 0.17,
  },
  {
    kind: 'carrier',
    az: START.h - 0.7,
    dist: 5600,
    alt: 620,
    size: 1100,
    rings: [{ r: 0.38, tilt: 1.2, spin: 0.02 }],
    yaw: -0.001,
    pitch: -0.08,
    seed: 0.41,
  },
  {
    kind: 'gyro',
    az: START.h + 1.25,
    dist: 4800,
    alt: 1000,
    size: 600,
    rings: [
      { r: 0.95, tilt: 0.4, spin: 0.05 },
      { r: 0.8, tilt: 1.3, spin: -0.04 },
      { r: 0.65, tilt: 2.2, spin: 0.03 },
    ],
    yaw: 0.002,
    pitch: 0,
    seed: 0.63,
  },
  {
    kind: 'dish',
    az: START.h + 2.6,
    dist: 6000,
    alt: 760,
    size: 900,
    rings: [{ r: 0.55, tilt: 0.6, spin: -0.025 }],
    yaw: 0.0012,
    pitch: 0.2,
    seed: 0.82,
  },
  {
    kind: 'station',
    az: START.h - 2.1,
    dist: 7000,
    alt: 520,
    size: 800,
    rings: [{ r: 0.5, tilt: -0.5, spin: 0.035 }],
    yaw: -0.0018,
    pitch: -0.15,
    seed: 0.29,
  },
];

/** The sky craft keep their place in the sky as you drive: they follow you at this share. */
export const CRAFT_FOLLOW = 0.85;
