/*
 * Atlantis rising (docs/specs/art-city.md, "Atlantis rising and the speed tunnel"): the City of
 * Dreams' Atlantis, a big, high city planted circle by circle at the end of the speedway
 * (lib/city-speedway.ts), on its own ground. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "plant Atlantis circle by circle, adding height and circles as you go ... more
 * spaced out than the first city ... towers, spirals ... tubes connecting bubble domes that float
 * in the air."
 *
 * Realm-local coordinates (the speedway's: its gate at z = 0, north is -z). The heart stands at
 * ATL_CENTRE, 1,160 north of the gate. Six rings of towers round it, planted from the outside in,
 * each ring taller than the one outside it (44 high at the rim, 186 at the inner ring, the heart
 * 250), so from the approach the city rises like a crown. The rings are 76 apart and the towers
 * along each some 62 apart (centre to centre): 40 to 55 clear between them, where the first
 * city's streets are 6 to 11. A straight avenue from the speedway runs to the heart through every
 * ring, kept clear.
 *
 * Height everywhere: drum towers of three tiers, square towers twisting as they rise (spiral
 * towers), slender needles; a glowing tube winding up every third tower (and a great one round
 * the heart); bubble domes floating over the gaps between the rings, joined in circles by
 * glowing tubes and each tied to a tower of the ring inside; and, kept from PR #465, four dome
 * complexes at north, east, south and west, floating over circle plazas on the ground, joined to
 * one another by a great ring of tube. Ring roads of light on the ground mark every circle.
 *
 * Light is mellow (the City's rule): Atlantis's gold, glass teal and pearl, each hue drifting
 * slowly, soft pulses gliding along the tubes; nothing flashes here (the lane's racing light
 * stops at the lane). Towers and domes are solid (`atlantisBlocked`); tubes and roads are light.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { C, GROUND, type Item, mix, mixId, TAU, wrap } from './city-grid';
import { alongLane, LANE_LEN, laneBlocked } from './city-speedway';

/* ---------- the plan ---------- */

/** The heart of Atlantis (realm-local). */
export const ATL_CENTRE: Vec3 = [0, GROUND, -(LANE_LEN + 60 + 460)];
/** The rings, from the outside in: radius and height over the ground, each taller than the last. */
export const RINGS: { r: number; h: number }[] = [
  { r: 460, h: 44 },
  { r: 384, h: 72 },
  { r: 308, h: 100 },
  { r: 232, h: 128 },
  { r: 156, h: 156 },
  { r: 84, h: 186 },
];
export const HEART_H = 250;
export const HEART_R = 16;
/** How far apart the towers stand along a ring, centre to centre (about). */
export const TOWER_STEP = 62;
/** How much a tower's height may differ from its ring's (a share): rings never overlap in height. */
export const HEIGHT_SPREAD = 0.08;
/** The avenue in from the speedway: half its width, kept clear of towers and domes. */
export const APPROACH_HALF = 36;
/** How high you can fly over Atlantis, and how far out from the heart before you are turned back. */
export const ATL_CEIL = GROUND + 300;
export const ATL_SOFT = 560;
export const ATL_EDGE = 640;
/** The dome complexes' circle (the gap between rings 2 and 3) and their height. */
export const COMPLEX_R = 270;
export const COMPLEX_Y = GROUND + 118;

export type TowerKind = 'drum' | 'spiral' | 'needle' | 'heart';
export type AtlTower = {
  ring: number;
  x: number;
  z: number;
  r: number;
  h: number;
  kind: TowerKind;
  key: number;
};
export type AtlDome = { c: Vec3; r: number; key: number; complex: number };
/** A light path: a straight tube (sagging a little), an arc of a circle, or a helix round a tower. */
export type AtlPath =
  | { kind: 'line'; a: Vec3; b: Vec3; sag: number; key: number }
  | { kind: 'arc'; R: number; a0: number; a1: number; y: number; key: number }
  | {
      kind: 'helix';
      x: number;
      z: number;
      r: number;
      y0: number;
      y1: number;
      turns: number;
      a0: number;
      key: number;
    };
/** A ring road on the ground (an arc of it), or a plaza (rings and spokes round a point). */
export type AtlGround =
  | { kind: 'road'; R: number; a0: number; a1: number; key: number }
  | { kind: 'plaza'; x: number; z: number; R: number; key: number };

/** Angle round the heart: 0 north (-z), π/2 east (+x). */
const at = (R: number, a: number): [number, number] => [
  ATL_CENTRE[0] + R * Math.sin(a),
  ATL_CENTRE[2] - R * Math.cos(a),
];
/** In the approach's way: south of the heart, near its line. */
const onApproach = (x: number, z: number, pad: number) =>
  z > ATL_CENTRE[2] && Math.abs(x) < APPROACH_HALF + pad;
const COMPLEX_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
const nearComplex = (x: number, z: number, pad: number) =>
  COMPLEX_ANGLES.some((a) => {
    const [cx, cz] = at(COMPLEX_R, a);
    return Math.hypot(x - cx, z - cz) < pad;
  });

/** A tower's radius from its height: slender low, broader high. */
const towerRadius = (h: number) => 7 + 0.03 * h;

export type AtlPlan = {
  towers: AtlTower[];
  domes: AtlDome[];
  paths: AtlPath[];
  ground: AtlGround[];
};
let plan: AtlPlan | null = null;

/** Atlantis's plan, worked out once: towers ring by ring, domes, tubes, roads and plazas. */
export function atlantisPlan(): AtlPlan {
  if (plan) return plan;
  const towers: AtlTower[] = [];
  const domes: AtlDome[] = [];
  const paths: AtlPath[] = [];
  const ground: AtlGround[] = [];
  const kinds: TowerKind[] = ['drum', 'spiral', 'needle'];
  // Planted circle by circle, from the rim in, each ring taller.
  RINGS.forEach((ring, k) => {
    const n = Math.floor((TAU * ring.r) / TOWER_STEP);
    const shift = k % 2 ? 0.5 : 0;
    for (let i = 0; i < n; i++) {
      const a = ((i + shift) / n) * TAU;
      const [x, z] = at(ring.r, a);
      if (onApproach(x, z, 14)) continue;
      // The complexes' plazas stay open on the rings either side of their circle.
      if ((k === 2 || k === 3) && nearComplex(x, z, 52)) continue;
      const key = k * 1000 + i;
      const h = ring.h * (1 + HEIGHT_SPREAD * (2 * hash(key, 3) - 1));
      towers.push({
        ring: k,
        x,
        z,
        r: towerRadius(h),
        h,
        kind: kinds[(i + k) % 3] as TowerKind,
        key,
      });
    }
  });
  towers.push({
    ring: RINGS.length,
    x: ATL_CENTRE[0],
    z: ATL_CENTRE[2],
    r: HEART_R,
    h: HEART_H,
    kind: 'heart',
    key: 9999,
  });
  // A tube winding up every third tower, and a great one round the heart.
  for (const tw of towers) {
    if (tw.kind !== 'heart' && tw.key % 3 !== 0) continue;
    const big = tw.kind === 'heart';
    paths.push({
      kind: 'helix',
      x: tw.x,
      z: tw.z,
      r: tw.r * (tw.kind === 'spiral' ? 1.2 : 1) + (big ? 9 : 4),
      y0: GROUND + 4,
      y1: GROUND + tw.h * (big ? 0.9 : 0.94),
      turns: big ? 5 : 2 + tw.h / 70,
      a0: hash(tw.key, 5) * TAU,
      key: mixId(tw.key, 71),
    });
  }
  // The heart's pearl, floating over its tip.
  domes.push({
    c: [ATL_CENTRE[0], GROUND + HEART_H + 18, ATL_CENTRE[2]],
    r: 9,
    key: 9998,
    complex: -1,
  });
  // Bubble domes floating over the gaps between the rings (the complexes' gap left to them),
  // chained round each gap by tubes, each tied to the nearest tower of the ring inside it.
  for (let k = 0; k + 1 < RINGS.length; k++) {
    if (k === 2) continue;
    const outer = RINGS[k] as { r: number; h: number };
    const inner = RINGS[k + 1] as { r: number; h: number };
    const R = (outer.r + inner.r) / 2;
    const n = Math.max(4, Math.floor((TAU * R) / 140));
    const gap: AtlDome[] = [];
    for (let i = 0; i < n; i++) {
      const key = 5000 + k * 100 + i;
      const a = ((i + 0.25 + 0.2 * hash(key, 1)) / n) * TAU;
      const [x, z] = at(R, a);
      if (onApproach(x, z, 16)) continue;
      const y = GROUND + 0.55 * ((outer.h + inner.h) / 2) + 24 * hash(key, 2);
      const d: AtlDome = { c: [x, y, z], r: 8 + 5 * hash(key, 4), key, complex: -1 };
      domes.push(d);
      gap.push(d);
    }
    gap.forEach((d, i) => {
      const e = gap[(i + 1) % gap.length] as AtlDome;
      // Not across the approach: the chain opens there.
      const mx = (d.c[0] + e.c[0]) / 2;
      const mz = (d.c[2] + e.c[2]) / 2;
      if (
        gap.length > 1 &&
        !onApproach(mx, mz, 0) &&
        Math.hypot(e.c[0] - d.c[0], e.c[2] - d.c[2]) < 260
      )
        paths.push(tubeBetween(d, e, mixId(d.key, 72)));
      const tw = nearestTower(towers, d.c, k + 1);
      if (tw) {
        const top: Vec3 = [tw.x, Math.min(d.c[1], GROUND + tw.h * 0.82), tw.z];
        const toward = norm2(d.c[0] - tw.x, d.c[2] - tw.z);
        top[0] += toward[0] * tw.r;
        top[2] += toward[1] * tw.r;
        paths.push({ kind: 'line', a: rim(d, top), b: top, sag: 3, key: mixId(d.key, 73) });
      }
    });
  }
  // The four dome complexes (PR #465's, folded into the rings): a great dome and four smaller
  // along the circle, floating over a circle plaza, the great domes joined by a ring of tube.
  COMPLEX_ANGLES.forEach((a, c) => {
    const [x, z] = at(COMPLEX_R, a);
    const big: AtlDome = { c: [x, COMPLEX_Y, z], r: 20, key: 7000 + c * 10, complex: c };
    domes.push(big);
    [-1, 1, -2, 2].forEach((side, j) => {
      const b = a + (side * 36) / COMPLEX_R;
      const [sx, sz] = at(COMPLEX_R, b);
      const small: AtlDome = {
        c: [sx, COMPLEX_Y + (j % 2 ? 14 : -12), sz],
        r: Math.abs(side) === 1 ? 10 : 7,
        key: 7000 + c * 10 + j + 1,
        complex: c,
      };
      domes.push(small);
      const to = Math.abs(side) === 1 ? big : (domes[domes.length - 3] as AtlDome);
      paths.push(tubeBetween(small, to, mixId(small.key, 74)));
    });
    ground.push({ kind: 'plaza', x, z, R: 40, key: 7100 + c });
    // The great ring of tube to the next complex, in arcs of about 50 (each drawn on its own).
    const span = TAU / 4;
    const parts = 8;
    for (let p = 0; p < parts; p++) {
      const a0 = a + (p / parts) * span;
      const a1 = a + ((p + 1) / parts) * span;
      paths.push({ kind: 'arc', R: COMPLEX_R, a0, a1, y: COMPLEX_Y + 2, key: mixId(7200 + c, p) });
    }
  });
  // Ring roads of light between the rings (and round the heart), in arcs of about 60.
  const roadRs = [
    ...RINGS.slice(0, -1).map((r, k) => (r.r + (RINGS[k + 1] as { r: number }).r) / 2),
    46,
  ];
  roadRs.forEach((R, k) => {
    const parts = Math.max(6, Math.ceil((TAU * R) / 60));
    for (let p = 0; p < parts; p++)
      ground.push({
        kind: 'road',
        R,
        a0: (p / parts) * TAU,
        a1: ((p + 1) / parts) * TAU,
        key: mixId(7300 + k, p),
      });
  });
  ground.push({ kind: 'plaza', x: ATL_CENTRE[0], z: ATL_CENTRE[2], R: 60, key: 7400 });
  plan = { towers, domes, paths, ground };
  return plan;
}

const norm2 = (x: number, z: number): [number, number] => {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
};
/** The point of dome d's skin toward p. */
function rim(d: AtlDome, p: Vec3): Vec3 {
  const v: Vec3 = [p[0] - d.c[0], p[1] - d.c[1], p[2] - d.c[2]];
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [d.c[0] + (v[0] / l) * d.r, d.c[1] + (v[1] / l) * d.r, d.c[2] + (v[2] / l) * d.r];
}
function tubeBetween(a: AtlDome, b: AtlDome, key: number): AtlPath {
  return { kind: 'line', a: rim(a, b.c), b: rim(b, a.c), sag: 4, key };
}
function nearestTower(towers: AtlTower[], c: Vec3, ring: number): AtlTower | null {
  let best: AtlTower | null = null;
  let bd = Number.POSITIVE_INFINITY;
  for (const tw of towers) {
    if (tw.ring !== ring) continue;
    const d = Math.hypot(tw.x - c[0], tw.z - c[2]);
    if (d < bd) {
      bd = d;
      best = tw;
    }
  }
  return best;
}

/* ---------- solid: towers and domes ---------- */

/** A tower's radius at height y over the ground, by its kind (0 above its top). */
export function towerProfile(tw: AtlTower, y: number): number {
  const v = y / tw.h;
  if (v < 0 || v > 1) return 0;
  switch (tw.kind) {
    case 'drum':
      return tw.r * (v < 0.5 ? 1 : v < 0.8 ? 0.72 : 0.46);
    case 'needle':
      return tw.r * (1 - 0.8 * v ** 1.6);
    case 'spiral':
      return tw.r * 1.15;
    default:
      return tw.r * (v < 0.3 ? 1 : v < 0.6 ? 0.78 : v < 0.85 ? 0.56 : 0.36);
  }
}

/** Whether a realm point is inside a tower or a dome of Atlantis (with a margin). */
export function atlantisBlocked(q: Vec3, margin = 1.2): boolean {
  const P = atlantisPlan();
  const y = q[1] - GROUND;
  for (const tw of P.towers) {
    const dx = q[0] - tw.x;
    const dz = q[2] - tw.z;
    const R = tw.r * 1.2 + margin;
    if (dx * dx + dz * dz > R * R) continue;
    const pr = towerProfile(tw, Math.min(Math.max(y, 0), tw.h));
    if (y < tw.h + margin && Math.hypot(dx, dz) < pr + margin) return true;
  }
  for (const d of P.domes) {
    const r = d.r + margin;
    const dx = q[0] - d.c[0];
    const dy = q[1] - d.c[1];
    const dz = q[2] - d.c[2];
    if (dx * dx + dy * dy + dz * dz < r * r) return true;
  }
  return false;
}

/** How far a realm point is from the heart, on the ground. */
export const fromHeart = (q: Vec3) => Math.hypot(q[0] - ATL_CENTRE[0], q[2] - ATL_CENTRE[2]);

/**
 * Everything solid on Atlantis's ground: the lane's walls along the lane, else the towers and
 * domes, and (outside the lane) the far edge, so nothing ever traps you: the lane is open at both
 * ends and the edge only turns you back.
 */
export function realmBlocked(q: Vec3): boolean {
  if (alongLane(q)) return laneBlocked(q);
  if (q[2] > 1) return false;
  if (fromHeart(q) > ATL_EDGE) return true;
  return atlantisBlocked(q);
}
/** How high you can fly at a realm point: the lane's top in the lane, Atlantis's sky beyond it. */
export const realmCeiling = (q: Vec3, laneTop: number) => (alongLane(q) ? laneTop : ATL_CEIL);

/**
 * Past ATL_SOFT from the heart, a turn back toward it (radians a second, added to the yaw): none
 * inside, growing to 0.9 at the edge. Outside the lane only.
 */
export function edgePull(q: Vec3, yaw: number): number {
  if (alongLane(q)) return 0;
  const d = fromHeart(q);
  const k = smooth((d - ATL_SOFT) / (ATL_EDGE - ATL_SOFT));
  if (k <= 0) return 0;
  const want = Math.atan2(q[0] - ATL_CENTRE[0], q[2] - ATL_CENTRE[2]);
  const miss = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
  return 0.9 * k * Math.sign(miss) * Math.min(1, Math.abs(miss) * 2);
}

/* ---------- the light: sites ---------- */

const GLASS: RGB = [0.35, 0.85, 0.85];
const PEARL: RGB = [0.92, 0.95, 1];
const WARM: RGB = C.warm;
const GOLD: RGB = C.gold;
const now = { t: 0 };

/** A ring's hue, teal at the rim warming to gold toward the heart, drifting slowly. */
function ringHue(ring: number, key: number): RGB {
  const v = ring / RINGS.length;
  const drift = 0.12 * Math.sin(now.t * 0.07 + key * 0.37);
  return mix(GLASS, GOLD, Math.min(1, Math.max(0, 0.15 + 0.7 * v + drift)));
}

const put = (o: number[], x: number, y: number, z: number, c: RGB, k: number) => {
  o[0] = x;
  o[1] = y;
  o[2] = z;
  o[3] = c[0] * k;
  o[4] = c[1] * k;
  o[5] = c[2] * k;
  return true;
};

/** Columns round a tower: a multiple of eight, so its edges (eight, or a spiral's four corners) fall on them. */
const towerCols = (tw: AtlTower) =>
  Math.min(72, Math.max(24, 8 * Math.round((TAU * tw.r) / 1.1 / 8)));
const towerRows = (tw: AtlTower) => Math.ceil(tw.h / 1.1);
/** Its bands: every seven rows, and up to three more at the tiers' steps. */
const towerBands = (tw: AtlTower) => Math.ceil(towerRows(tw) / 7) + 3;
/** Its portholes: about one place in nine of its skin. */
const towerPorts = (tw: AtlTower) => Math.ceil((towerRows(tw) * towerCols(tw)) / 9);
const CROWN = 48;
/** The sites of a tower, nearly every one a light: its edges, bands, portholes and crown. */
export const towerSites = (tw: AtlTower) =>
  8 * towerRows(tw) + towerBands(tw) * towerCols(tw) + towerPorts(tw) + CROWN;

/** A point on a tower's skin at row `row` (fractional) and column `col` of `cols`, into o[0..2]. */
function onTower(tw: AtlTower, row: number, col: number, cols: number, o: number[]) {
  const rows = towerRows(tw);
  const v = Math.min(1, Math.max(0, (row + 0.5) / rows));
  const y = v * tw.h;
  let a = (col / cols) * TAU;
  let r = towerProfile(tw, Math.min(y, tw.h * 0.999));
  if (tw.kind === 'spiral') {
    // A square twisting as it rises: its four corners wind round the tower.
    const c = Math.max(Math.abs(Math.cos(a - Math.PI / 4)), Math.abs(Math.sin(a - Math.PI / 4)));
    r = (tw.r * 0.82) / Math.max(0.5, c);
    a += v * TAU * 0.75;
  }
  o[0] = tw.x + r * Math.sin(a);
  o[1] = GROUND + y;
  o[2] = tw.z - r * Math.cos(a);
  return v;
}

/** Where a tower's tiers step (a share of its height), for its brighter bands. */
const TIERS: Record<TowerKind, number[]> = {
  drum: [0.5, 0.8],
  heart: [0.3, 0.6, 0.85],
  spiral: [0.4],
  needle: [0.66],
};

/** Site s of a tower: its edges and bands, portholes lit here and there, a crown of lamps. */
function towerSite(tw: AtlTower, s: number, o: number[]): boolean {
  const cols = towerCols(tw);
  const rows = towerRows(tw);
  const hue = ringHue(tw.ring, tw.key);
  const edges = 8 * rows;
  const nb = towerBands(tw);
  const bands = nb * cols;
  const ports = towerPorts(tw);
  if (s < edges) {
    // Eight edges up the tower (a spiral's four corners, each drawn twice as densely).
    const e = s % 8;
    const row = Math.floor(s / 8);
    const spiral = tw.kind === 'spiral';
    const col = spiral ? (e % 4) * (cols / 4) : e * (cols / 8);
    const v = onTower(tw, spiral ? row / 2 + (e >= 4 ? rows / 2 : 0) : row, col, cols, o);
    const k = 0.3 + 0.08 * (1 - v);
    o[3] = hue[0] * k;
    o[4] = hue[1] * k;
    o[5] = hue[2] * k;
    return true;
  }
  if (s < edges + bands) {
    const j = s - edges;
    const b = Math.floor(j / cols);
    const col = j % cols;
    const tier = b >= nb - 3 ? TIERS[tw.kind][b - (nb - 3)] : undefined;
    if (b >= nb - 3 && tier === undefined) return false;
    onTower(tw, tier !== undefined ? tier * rows - 0.5 : b * 7, col, cols, o);
    const c = mix(hue, GOLD, 0.4);
    const k = tier !== undefined ? 0.4 : 0.24;
    o[3] = c[0] * k;
    o[4] = c[1] * k;
    o[5] = c[2] * k;
    return true;
  }
  if (s < edges + bands + ports) {
    // Portholes, here and there, breathing slowly.
    const j = s - edges - bands;
    const row = Math.floor(hash(tw.key * 977 + j, 12) * rows);
    const col = Math.floor(hash(tw.key * 977 + j, 11) * cols);
    onTower(tw, row, col + 0.5, cols, o);
    const breath = 0.8 + 0.2 * Math.sin(now.t * 0.4 + j);
    const c = hash(j, tw.key) < 0.25 ? PEARL : WARM;
    o[3] = c[0] * 0.22 * breath;
    o[4] = c[1] * 0.22 * breath;
    o[5] = c[2] * 0.22 * breath;
    return true;
  }
  // The crown: a ring of lamps at the tip and a slow light over it.
  const j = s - edges - bands - ports;
  const top = GROUND + tw.h;
  if (j >= CROWN - 6) {
    const k = 0.35 + 0.15 * Math.sin(now.t * 0.6 + tw.key);
    return put(o, tw.x, top + 1.5 + (j - (CROWN - 6)) * 0.6, tw.z, mix(WARM, PEARL, 0.3), k);
  }
  const a = (j / (CROWN - 6)) * TAU;
  const r = towerProfile(tw, tw.h * 0.999) + 0.6;
  return put(o, tw.x + r * Math.sin(a), top, tw.z - r * Math.cos(a), mix(hue, WARM, 0.5), 0.42);
}

export const domeSites = (d: AtlDome) => Math.ceil((4 * Math.PI * d.r * d.r) / 1.5);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Site s of a floating dome: a glass bubble, its bands and equator gold, a pearl light inside. */
function domeSite(d: AtlDome, s: number, o: number[]): boolean {
  const n = domeSites(d);
  const core = Math.floor(n * 0.05);
  if (s < core) {
    // The light inside, a soft pearl at a third of the radius.
    const yy = 1 - (2 * (s + 0.5)) / core;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
    const a = s * GOLDEN_ANGLE;
    const R = d.r * 0.3;
    const k = 0.3 + 0.1 * Math.sin(now.t * 0.5 + d.key);
    return put(
      o,
      d.c[0] + Math.cos(a) * rr * R,
      d.c[1] + yy * R,
      d.c[2] + Math.sin(a) * rr * R,
      mix(PEARL, WARM, 0.4),
      k,
    );
  }
  const i = s - core;
  const m = n - core;
  const yy = 1 - (2 * (i + 0.5)) / m;
  const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
  const a = i * GOLDEN_ANGLE;
  const x = d.c[0] + Math.cos(a) * rr * d.r;
  const y = d.c[1] + yy * d.r;
  const z = d.c[2] + Math.sin(a) * rr * d.r;
  const hue = d.complex >= 0 ? mix(GLASS, GOLD, 0.35) : mix(GLASS, PEARL, 0.25);
  if (Math.abs(yy) < 0.05) return put(o, x, y, z, GOLD, 0.42);
  const lat = Math.asin(yy) / (Math.PI / 10);
  if (Math.abs(lat - Math.round(lat)) < 0.09) return put(o, x, y, z, hue, yy > 0 ? 0.24 : 0.12);
  return put(o, x, y, z, hue, yy > 0 ? 0.07 : 0.035);
}

const TUBE_STEP = 0.7;
const TUBE_R = 0.9;
const scratch: Vec3 = [0, 0, 0];
const scratch2: Vec3 = [0, 0, 0];

/** The point of a path at u (0..1), into out. */
function pathPoint(p: AtlPath, u: number, out: Vec3) {
  if (p.kind === 'line') {
    out[0] = p.a[0] + (p.b[0] - p.a[0]) * u;
    out[1] = p.a[1] + (p.b[1] - p.a[1]) * u - p.sag * 4 * u * (1 - u);
    out[2] = p.a[2] + (p.b[2] - p.a[2]) * u;
  } else if (p.kind === 'arc') {
    const a = p.a0 + (p.a1 - p.a0) * u;
    out[0] = ATL_CENTRE[0] + p.R * Math.sin(a);
    out[1] = p.y;
    out[2] = ATL_CENTRE[2] - p.R * Math.cos(a);
  } else {
    const a = p.a0 + u * p.turns * TAU;
    out[0] = p.x + p.r * Math.sin(a);
    out[1] = p.y0 + (p.y1 - p.y0) * u;
    out[2] = p.z - p.r * Math.cos(a);
  }
}

/** A path's length (worked out from 32 steps, kept). */
const lengths = new Map<number, number>();
export function pathLength(p: AtlPath): number {
  const had = lengths.get(p.key);
  if (had !== undefined) return had;
  let L = 0;
  pathPoint(p, 0, scratch);
  for (let i = 1; i <= 32; i++) {
    pathPoint(p, i / 32, scratch2);
    L += Math.hypot(scratch2[0] - scratch[0], scratch2[1] - scratch[1], scratch2[2] - scratch[2]);
    scratch[0] = scratch2[0];
    scratch[1] = scratch2[1];
    scratch[2] = scratch2[2];
  }
  lengths.set(p.key, L);
  return L;
}
export const pathSites = (p: AtlPath) => 4 * Math.ceil(pathLength(p) / TUBE_STEP);

/**
 * Site s of a tube: four lines round it (top, bottom, either side) every 0.7 along, a faint skin,
 * soft pulses of warm light gliding along inside at 3 a second.
 */
function pathSite(p: AtlPath, s: number, o: number[]): boolean {
  const L = pathLength(p);
  const n = Math.ceil(L / TUBE_STEP);
  const line = s % 4;
  const j = Math.floor(s / 4);
  if (j >= n) return false;
  const u = (j + 0.5) / n;
  pathPoint(p, u, scratch);
  pathPoint(p, Math.min(1, u + 0.5 / n), scratch2);
  // Side: level and square to the path; up: the world's.
  let sx = -(scratch2[2] - scratch[2]);
  let sz = scratch2[0] - scratch[0];
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl;
  sz /= sl;
  const off =
    line === 0 ? [0, TUBE_R] : line === 1 ? [0, -TUBE_R] : line === 2 ? [TUBE_R, 0] : [-TUBE_R, 0];
  const x = scratch[0] + sx * (off[0] as number);
  const y = scratch[1] + (off[1] as number);
  const z = scratch[2] + sz * (off[0] as number);
  const e = u * L;
  const pulse = Math.exp(-wrap(now.t * 3 - e + hash(p.key, 9) * 30, 30) / 4);
  const base = p.kind === 'arc' ? 0.16 : 0.12;
  const c = mix(GLASS, WARM, 0.6 * pulse);
  return put(o, x, y, z, c, base + (line === 0 ? 0.06 : 0) + 0.38 * pulse);
}

export const groundSites = (g: AtlGround) =>
  g.kind === 'road'
    ? 3 * Math.ceil((g.R * (g.a1 - g.a0)) / 1.5)
    : 2 * Math.ceil((TAU * g.R) / 1.2) + 8 * Math.ceil(g.R / 1.5);

/** Site s of a ring road (three lines on the ground) or a plaza (two circles and eight spokes). */
function groundSite(g: AtlGround, s: number, o: number[]): boolean {
  const y = GROUND + 0.25;
  if (g.kind === 'road') {
    const n = Math.ceil((g.R * (g.a1 - g.a0)) / 1.5);
    const line = s % 3;
    const j = Math.floor(s / 3);
    if (j >= n) return false;
    const a = g.a0 + ((j + 0.5) / n) * (g.a1 - g.a0);
    const R = g.R + (line - 1) * 4;
    const x = ATL_CENTRE[0] + R * Math.sin(a);
    const z = ATL_CENTRE[2] - R * Math.cos(a);
    // A slow swell running round each circle: the city's own breath.
    const swell = 0.5 + 0.5 * Math.sin(a * 6 - now.t * 0.3 + g.R * 0.01);
    return put(
      o,
      x,
      y,
      z,
      line === 1 ? GOLD : mix(GLASS, GOLD, 0.3),
      (line === 1 ? 0.2 : 0.1) * (0.7 + 0.3 * swell),
    );
  }
  const ring = Math.ceil((TAU * g.R) / 1.2);
  if (s < 2 * ring) {
    const R = s < ring ? g.R : g.R * 0.6;
    const a = ((s % ring) / ring) * TAU;
    return put(o, g.x + R * Math.sin(a), y, g.z - R * Math.cos(a), GOLD, s < ring ? 0.26 : 0.18);
  }
  const j = s - 2 * ring;
  const per = Math.ceil(g.R / 1.5);
  const spoke = Math.floor(j / per);
  if (spoke >= 8) return false;
  const a = (spoke / 8) * TAU + Math.PI / 8;
  const r = ((j % per) + 0.5) * 1.5;
  return put(o, g.x + r * Math.sin(a), y, g.z - r * Math.cos(a), mix(GOLD, PEARL, 0.3), 0.14);
}

/* ---------- items for the renderer ---------- */

type Kept = { item: Item; c: Vec3; rad: number };
let kept: Kept[] | null = null;

function keptItems(): Kept[] {
  if (kept) return kept;
  const P = atlantisPlan();
  const list: Kept[] = [];
  for (const tw of P.towers)
    list.push({
      item: {
        d: 0,
        gid: mixId(tw.key, 8101),
        count: towerSites(tw),
        weight: 1.6,
        site: (s, o) => towerSite(tw, s, o),
      },
      c: [tw.x, GROUND + tw.h / 2, tw.z],
      rad: Math.hypot(tw.r * 1.2, tw.h / 2) + 2,
    });
  for (const d of P.domes)
    list.push({
      item: {
        d: 0,
        gid: mixId(d.key, 8102),
        count: domeSites(d),
        weight: 1.8,
        site: (s, o) => domeSite(d, s, o),
      },
      c: d.c,
      rad: d.r,
    });
  for (const p of P.paths) {
    const L = pathLength(p);
    const mid: Vec3 = [0, 0, 0];
    pathPoint(p, 0.5, mid);
    const end: Vec3 = [0, 0, 0];
    pathPoint(p, 0, end);
    const rad = p.kind === 'helix' ? Math.hypot(p.r, (p.y1 - p.y0) / 2) + 2 : L / 2 + 6;
    const c: Vec3 = p.kind === 'helix' ? [p.x, (p.y0 + p.y1) / 2, p.z] : mid;
    list.push({
      item: {
        d: 0,
        gid: mixId(p.key, 8103),
        count: pathSites(p),
        weight: 2,
        site: (s, o) => pathSite(p, s, o),
      },
      c,
      rad,
    });
  }
  for (const g of P.ground) {
    const c: Vec3 =
      g.kind === 'road'
        ? [
            ATL_CENTRE[0] + g.R * Math.sin((g.a0 + g.a1) / 2),
            GROUND,
            ATL_CENTRE[2] - g.R * Math.cos((g.a0 + g.a1) / 2),
          ]
        : [g.x, GROUND, g.z];
    const rad = g.kind === 'road' ? (g.R * (g.a1 - g.a0)) / 2 + 6 : g.R + 2;
    list.push({
      item: {
        d: 0,
        gid: mixId(g.key, 8104),
        count: groundSites(g),
        weight: 1.2,
        site: (s, o) => groundSite(g, s, o),
      },
      c,
      rad,
    });
  }
  kept = list;
  return list;
}

/** How far Atlantis is drawn from the eye. */
export const ATL_REACH = 1100;

/**
 * Atlantis near the eye (realm-local), for the renderer: every tower, dome, tube, road and plaza
 * within reach and not behind the eye, nearest first. The items are made once and kept; only
 * their distance is set each frame.
 */
export function atlantisItems(eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  now.t = t;
  for (const K of keptItems()) {
    const rx = K.c[0] - eye[0];
    const ry = K.c[1] - eye[1];
    const rz = K.c[2] - eye[2];
    const dc = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const d = Math.max(0, dc - K.rad);
    if (d > ATL_REACH) continue;
    if (rx * fwd[0] + ry * fwd[1] + rz * fwd[2] < -K.rad) continue;
    K.item.d = d;
    out.push(K.item);
  }
}
