/*
 * Rings of light over the City of Dreams (docs/specs/art-city.md, "Flying stations and rings of
 * light"): big concentric rings as decoration, and a long parcours of rings high over the city to
 * line up with and carve through. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "and big circles of lights concentric in many parts, they look good as decorative
 * element u can fly through. can be part of architecture on top or on side of a tall building or
 * below a flying station. or just in the air creating a kind of tunnel parcours higher up as you
 * fly above the city and try to align flying into them and turning carving to keep on going
 * through that tunnel. but make circles big so not too precise and tiny."
 *
 * - **Concentric rings**: two to four rings round one middle, in one plane (radius 16 to 40), on
 *   top of landmarks, round and over some of the fifteen buildings, under some flying stations and
 *   free in the air; each ring dashed, turning slowly the other way to the next, in its quarter's
 *   colour, breathing gently.
 * - **The parcours**: a chain of big rings (radius 20) laid along one smooth curve that weaves and
 *   rises and falls 270 to 370 over the street the whole length of the city, banking into its turns.
 *   The curve repeats with the plan, so the chain never ends: down the city it comes round to its
 *   start. Through a ring (its plane crossed within 1.1 of its radius: forgiving, never precise) it
 *   warms toward gold, a soft halo ripples out from it, and the count of rings in a row shows in the
 *   quiet words beside the bar ("Rings 7"); a ring missed is no matter, a pause of ten seconds
 *   starts the count again. These are not the space portals (lib/city-space.ts): they never open
 *   hyperspace, and they stand well clear of them.
 *
 * All light: the Ship flies through every ring.
 */

import { type RGB, smooth, type Vec3 } from './bigbang';
import { copiesNear } from './city-big';
import { BUILDING_SPOTS, buildingAt, buildingModel } from './city-buildings-15';
import { DISTRICTS, districtAt, LANDMARKS } from './city-game';
import {
  C,
  frac,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { crownKey, landmarkHeight } from './city-landmarks';
import { STATIONS, stationCentre, stationItems, stationModel } from './city-stations';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Two unit vectors square to n and to each other. */
function basis(n: Vec3): [Vec3, Vec3] {
  const u = norm(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
  return [u, cross(n, u)];
}
const colourAt = (x: number, z: number): RGB => DISTRICTS[districtAt(x, z)].colour;

/* ---------- concentric rings ---------- */

export type RingSetKind = 'crown' | 'halo' | 'over' | 'under' | 'free';
export type RingSet = {
  kind: RingSetKind;
  /** Its middle, tile-local (for one under a station, under its middle at t = 0). */
  c: Vec3;
  /** The way through it (the normal to its plane). */
  n: Vec3;
  radii: number[];
  /** How fast its rings turn (radians a second), every other one the other way. */
  spin: number;
  /** The station it hangs under, which it bobs with; -1 for none. */
  under: number;
  key: number;
};

/** The smallest a decorative ring may be (2026-11-14: "make circles big so not too precise and tiny"). */
export const RING_MIN_R = 16;
/** How densely a ring's lights are strung: one every this much. */
const RING_STEP = 0.55;

const vertical = (yaw: number, tilt = 0): Vec3 =>
  norm([Math.sin(yaw) * Math.cos(tilt), Math.sin(tilt), Math.cos(yaw) * Math.cos(tilt)]);
const UP: Vec3 = [0, 1, 0];

/** How high the rings standing over buildings float: over the high currents (142 to 182). */
const OVER_Y = 226;

let sets: RingSet[] | null = null;
/**
 * Every set of concentric rings, tile-local: halos over six landmarks' crowns, halos round six of
 * the fifteen buildings, rings standing over four more, rings under six flying stations, and six
 * free in the air. All of them under 80 over the street or over 195, so never among the flocks
 * (some 120 to 165), the high currents of ships (142 to 182) or the big ships (96 to 142).
 */
export function ringSets(): RingSet[] {
  if (sets) return sets;
  const out: RingSet[] = [];
  const add = (s: Omit<RingSet, 'key'>) => out.push({ ...s, key: mixId(out.length, 6161) });
  // Halos floating over six landmarks' crowns, thirty over their tops and at least 200 over the
  // street (over the flocks and the high currents), under where their fireworks burst.
  const crowned: [string, string | undefined][] = [
    ['pagoda', undefined],
    ['shikhara', undefined],
    ['studio', 'temples'],
    ['studio', 'factories'],
    ['pyramid', undefined],
    ['dataspire', undefined],
  ];
  for (const [kind, set] of crowned) {
    const L = LANDMARKS.find((l) => l.kind === kind && l.set === set);
    if (!L) continue;
    const key = crownKey(L.kind, L.set);
    const top = key ? landmarkHeight(key) : 60;
    add({
      kind: 'crown',
      c: [L.x, GROUND + Math.max(top + 30, 200), L.z],
      n: UP,
      radii: [18, 26, 34],
      spin: 0.08,
      under: -1,
    });
  }
  // Halos round six of the fifteen buildings, under halfway up (under the big ships and flocks).
  const halo = [
    'Lantern Spindle',
    'Helix Exchange',
    'Sunleaf Column',
    'Sunboat Mast',
    'Neon Prism',
    'Cascade Monolith',
  ];
  // Rings standing over four more, facing down the city, so you fly through them along it.
  const over = ['Hourglass Tower', 'Ivory Echo', 'Cog Tower', 'Seed Pod'];
  for (const b of BUILDING_SPOTS) {
    const [x, z] = buildingAt(b);
    const top = buildingModel(b).top;
    if (halo.includes(b.name))
      add({
        kind: 'halo',
        c: [x, GROUND + Math.min(70, 0.45 * top), z],
        n: UP,
        radii: [18, 24, 30],
        spin: 0.1,
        under: -1,
      });
    if (over.includes(b.name))
      add({
        kind: 'over',
        c: [x, GROUND + OVER_Y, z],
        n: [0, 0, 1],
        radii: [16, 22, 28],
        spin: 0.09,
        under: -1,
      });
  }
  // Under six flying stations, hanging with them.
  for (const name of [
    'Lantern Harbour',
    'Turquoise Wheel',
    'Violet Disc City',
    'Sky Ziggurat',
    'Neon Carousel',
    'Twin Ring Habitat',
  ]) {
    const i = STATIONS.findIndex((s) => s.name === name);
    const st = STATIONS[i];
    if (!st) continue;
    const c = stationCentre(st, 0);
    const drop = -stationModel(st).lo + 16;
    add({
      kind: 'under',
      c: [c[0], c[1] - drop, c[2]],
      n: UP,
      radii: [18, 27, 36],
      spin: 0.06,
      under: i,
    });
  }
  // Free in the air, standing at a slant, over the flocks and under the parcours.
  const free: [number, number, number, number, number[]][] = [
    [-35, 420, 232, 0.3, [18, 24, 30]],
    [45, 960, 232, -0.5, [18, 28]],
    [-40, 1040, 232, 1.1, [20, 25, 30]],
    [40, 1380, 232, 0.2, [16, 21, 26, 30]],
    [-30, 1600, 232, -0.8, [20, 30]],
    [35, 1830, 224, 0.6, [18, 24, 30]],
  ];
  for (const [x, z, h, yaw, radii] of free)
    add({
      kind: 'free',
      c: [x, GROUND + h, z],
      n: vertical(yaw, 0.18),
      radii,
      spin: 0.07,
      under: -1,
    });
  sets = out;
  return out;
}

/** How many lights a set's ring of radius r has, and the whole set. */
const ringSites = (r: number) => Math.round((TAU * r) / RING_STEP);
export const setCount = (S: RingSet) => S.radii.reduce((n, r) => n + ringSites(r), 0);

/** Set S's middle at time t, at its tile copy at (x, z): bobbing with its station, if under one. */
export function setCentre(S: RingSet, t: number, x = S.c[0], z = S.c[2]): Vec3 {
  const st = STATIONS[S.under];
  if (!st) return [x, S.c[1], z];
  const dy = stationCentre(st, t)[1] - stationCentre(st, 0)[1];
  return [x, S.c[1] + dy, z];
}

/**
 * Site s of set S (its middle c) at time t: on one of its rings, dashed (twelve dashes, a lamp at
 * every third dash's head), turning slowly, every other ring the other way, the plane leaning a
 * hair as it breathes. Into o, brightness k.
 */
export function setSite(
  S: RingSet,
  s: number,
  t: number,
  c: Vec3,
  colour: RGB,
  k: number,
  o: number[],
): boolean {
  let i = 0;
  let start = 0;
  while (i < S.radii.length - 1 && s >= start + ringSites(S.radii[i] as number)) {
    start += ringSites(S.radii[i] as number);
    i++;
  }
  const r = S.radii[i] as number;
  const n = ringSites(r);
  const q = (s - start + 0.5) / n;
  const dash = Math.floor(q * 12);
  const along = frac(q * 12);
  const a = ((dash + along * 0.8) / 12) * TAU + (i % 2 ? -1 : 1) * S.spin * t + i * 0.4;
  const [u, v] = planeOf(S);
  const lean = 0.03 * Math.sin(t * 0.05 + (S.key % 17));
  const ca = Math.cos(a) * r;
  const sa = Math.sin(a) * r;
  o[0] = c[0] + u[0] * ca + v[0] * sa + S.n[0] * lean * sa;
  o[1] = c[1] + u[1] * ca + v[1] * sa + S.n[1] * lean * sa;
  o[2] = c[2] + u[2] * ca + v[2] * sa + S.n[2] * lean * sa;
  const lamp = dash % 3 === 0 && along > 0.86;
  const breath = 0.85 + 0.15 * Math.sin(t * 0.3 + i * 0.9 + (S.key % 7));
  const [warm, deep] = tonesOf(colour);
  const tone = lamp ? warm : i % 2 ? deep : colour;
  const b = (lamp ? 0.62 : 0.4) * breath * k;
  o[3] = tone[0] * b;
  o[4] = tone[1] * b;
  o[5] = tone[2] * b;
  return true;
}

/** Each set's plane, worked out once. */
const planes = new WeakMap<RingSet, [Vec3, Vec3]>();
function planeOf(S: RingSet): [Vec3, Vec3] {
  let p = planes.get(S);
  if (!p) {
    p = basis(S.n);
    planes.set(S, p);
  }
  return p;
}
/** A quarter colour's lamp and inner-ring shades, worked out once a colour. */
const tones = new WeakMap<RGB, [RGB, RGB]>();
function tonesOf(c: RGB): [RGB, RGB] {
  let p = tones.get(c);
  if (!p) {
    p = [mix(c, C.warm, 0.4), scale(mix(c, C.violet, 0.15), 0.9)];
    tones.set(c, p);
  }
  return p;
}

/** The decorative sets within sight (R), as the Ship's items. */
export function ringSetItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]) {
  ringSets().forEach((S, si) => {
    const rad = S.radii[S.radii.length - 1] as number;
    copiesNear(S.c[0], S.c[2], eye, R + rad, (x, z, n) => {
      const c = setCentre(S, t, x, z);
      const rel = sub(c, eye);
      const d = Math.max(0, len(rel) - rad);
      if (d > R || (dot(rel, fwd) < -rad - 10 && d > 0)) return;
      const colour = colourAt(c[0], c[2]);
      // Round a building, under its top: the towers may stand in front of it.
      const probe: Vec3[] | undefined =
        S.kind === 'halo'
          ? [
              [c[0] + rad, c[1], c[2]],
              [c[0] - rad, c[1], c[2]],
              [c[0], c[1], c[2] + rad],
              [c[0], c[1], c[2] - rad],
            ]
          : undefined;
      out.push({
        d,
        gid: mixId(si * 991 + n, 5252),
        count: setCount(S),
        weight: 1.6,
        probe,
        site: (s, o) => setSite(S, s, t, c, colour, 1, o),
      });
    });
  });
}

/* ---------- the parcours ---------- */

/** The parcours' rings: their radius, the gap between them along the curve, its heights. */
export const PARCOURS_R = 20;
export const PARCOURS_GAP = 46;
export const PARCOURS_LOW = GROUND + 270;
export const PARCOURS_HIGH = GROUND + 370;
/** Through a ring counts within this much of its radius from its middle (forgiving: a little outside too). */
export const PASS_SHARE = 1.1;
/** A pause this long between rings starts the count again. */
export const STREAK_WINDOW = 10;

/**
 * The curve, tile-local, from z (it repeats with the plan along z, so the chain never ends): a slow
 * weave across the city with a faster one over it, rising and falling between 270 and 370 over
 * the street. Its phases are chosen to keep it clear of the stations, the portals, the Sky Island
 * Loop and the decorative rings (tested).
 */
export function parcoursAt(z: number): Vec3 {
  const a = (TAU * z) / TILE_Z;
  return [
    60 * Math.sin(2 * a + 3.05) + 15 * Math.sin(4 * a + 1.886),
    GROUND + 320 + 36 * Math.sin(3 * a + 5.802) + 10 * Math.sin(5 * a + 1.823),
    z,
  ];
}

export type ParcoursRing = {
  i: number;
  /** Its middle, tile-local, and the way through it (the curve's heading there). */
  c: Vec3;
  n: Vec3;
  /** Its plane's right and up, rolled by the bank. */
  u: Vec3;
  v: Vec3;
  r: number;
  /** How far it leans into the turn. */
  bank: number;
};

let rings: ParcoursRing[] | null = null;
/** The parcours' rings over one turn of the plan: evenly along the curve, about PARCOURS_GAP apart. */
export function parcoursRings(): ParcoursRing[] {
  if (rings) return rings;
  // The curve's length, walked in small steps.
  const steps = 4000;
  const cum: number[] = [0];
  let prev = parcoursAt(0);
  for (let k = 1; k <= steps; k++) {
    const p = parcoursAt((k / steps) * TILE_Z);
    cum.push((cum[k - 1] as number) + len(sub(p, prev)));
    prev = p;
  }
  const L = cum[steps] as number;
  const N = Math.round(L / PARCOURS_GAP);
  const out: ParcoursRing[] = [];
  let k = 0;
  for (let i = 0; i < N; i++) {
    const want = (i * L) / N;
    while ((cum[k + 1] as number) < want) k++;
    const f = (want - (cum[k] as number)) / ((cum[k + 1] as number) - (cum[k] as number) || 1);
    const z = ((k + f) / steps) * TILE_Z;
    const c = parcoursAt(z);
    const n = norm(sub(parcoursAt(z + 1), parcoursAt(z - 1)));
    // Leaning into the turn: the curve's bend across, eased to at most 0.5.
    const x2 = parcoursAt(z + 20)[0] - 2 * c[0] + parcoursAt(z - 20)[0];
    const bank = Math.max(-0.5, Math.min(0.5, -(x2 / 400) * 90));
    const right = norm(cross(n, UP));
    const up = cross(right, n);
    const cb = Math.cos(bank);
    const sb = Math.sin(bank);
    out.push({
      i,
      c,
      n,
      u: [right[0] * cb + up[0] * sb, right[1] * cb + up[1] * sb, right[2] * cb + up[2] * sb],
      v: [-right[0] * sb + up[0] * cb, -right[1] * sb + up[1] * cb, -right[2] * sb + up[2] * cb],
      r: PARCOURS_R,
      bank,
    });
  }
  rings = out;
  return out;
}

/** Ring g's copy nearest q, and its own number (which ring, which copy). */
export function parcoursCopy(g: ParcoursRing, q: Vec3): { c: Vec3; key: number } {
  const x = nearest(g.c[0], q[0], TILE_X);
  const z = nearest(g.c[2], q[2], TILE_Z);
  const mx = Math.round((x - g.c[0]) / TILE_X);
  const nz = Math.round((z - g.c[2]) / TILE_Z);
  return { c: [x, g.c[1], z], key: mixId(g.i * 4099 + mx * 97, nz * 7919 + 13) };
}

/**
 * Whether the step from a to b went through ring g at middle c (either way): its plane crossed
 * within PASS_SHARE of its radius from its middle.
 */
export function ringPassedBy(g: ParcoursRing, c: Vec3, a: Vec3, b: Vec3): boolean {
  const da = dot(sub(a, c), g.n);
  const db = dot(sub(b, c), g.n);
  if (da === db || da * db > 0) return false;
  const k = da / (da - db);
  const q: Vec3 = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  return len(sub(q, c)) < g.r * PASS_SHARE;
}

/** What the parcours remembers: when each ring copy was last flown through, and the count in a row. */
const state = {
  passed: new Map<number, number>(),
  streak: 0,
  last: Number.NEGATIVE_INFINITY,
};

/** Forgets every ring flown and the count (a fresh start, a jump in time); the best stays. */
export function resetRings() {
  state.passed.clear();
  state.streak = 0;
  state.last = Number.NEGATIVE_INFINITY;
}

/**
 * The best run (most rings in a row), kept on the device as the races' best times are
 * (lib/city-race.ts), read once; where there is no storage it lives this visit only.
 */
export const RING_BEST_KEY = 'colourmap:city-rings:best';
let best = -1;
/** The best run of rings in a row so far (0 before any). */
export function ringBest(): number {
  if (best < 0) {
    best = 0;
    try {
      const n = Number(globalThis.localStorage?.getItem(RING_BEST_KEY));
      if (Number.isInteger(n) && n > 0) best = n;
    } catch {
      /* no storage: the best lives this visit only */
    }
  }
  return best;
}
function noteBest(n: number) {
  if (n <= ringBest()) return;
  best = n;
  try {
    globalThis.localStorage?.setItem(RING_BEST_KEY, String(n));
  } catch {
    /* no storage: the best lives this visit only */
  }
}
/**
 * Forgets the best, here and on the device (a test's fresh start); with `device` false, only here,
 * so it is read from the device again (as on a new visit).
 */
export function resetRingBest(device = true) {
  best = device ? 0 : -1;
  if (!device) return;
  try {
    globalThis.localStorage?.removeItem(RING_BEST_KEY);
  } catch {
    /* no storage: nothing kept */
  }
}

/**
 * A step of the ship from a to b at time t: every parcours ring it went through warms and counts
 * (the same ring twice within a second and a half, once). Returns how many it went through.
 */
export function ringStep(a: Vec3, b: Vec3, t: number): number {
  if (t < state.last) resetRings();
  const step = len(sub(b, a));
  let hits = 0;
  for (const g of parcoursRings()) {
    const { c, key } = parcoursCopy(g, b);
    if (len(sub(c, b)) > g.r * PASS_SHARE + step + 2) continue;
    if (!ringPassedBy(g, c, a, b)) continue;
    const had = state.passed.get(key);
    if (had !== undefined && t - had < 1.5) continue;
    state.passed.set(key, t);
    state.streak = t - state.last < STREAK_WINDOW ? state.streak + 1 : 1;
    state.last = t;
    noteBest(state.streak);
    hits++;
  }
  if (state.passed.size > 256)
    for (const [k, when] of state.passed) if (t - when > 12) state.passed.delete(k);
  return hits;
}

/**
 * The count of rings in a row, while it lasts, for the quiet words beside the bar, and the best
 * run after it when this one is short of it ("Rings 7 · best 12"); '' otherwise.
 */
export function ringBanner(t: number): string {
  if (!(state.streak > 0 && t - state.last >= 0 && t - state.last < STREAK_WINDOW)) return '';
  const b = ringBest();
  return b > state.streak ? `Rings ${state.streak} · best ${b}` : `Rings ${state.streak}`;
}

/**
 * How warm a ring copy is at time t, 0..1: up over half a second as you pass, cooling over six
 * (mellow: it eases, never flashes).
 */
export function ringHeat(key: number, t: number): number {
  const when = state.passed.get(key);
  if (when === undefined || t < when) return 0;
  const e = t - when;
  return smooth(e / 0.5) * (1 - smooth((e - 0.5) / 6));
}

/** Sites in a parcours ring: its two strands, the brighter keel under it, the halo after a pass. */
const STRANDS = 220;
const ECHO = 60;
export const PARCOURS_SITES = STRANDS + ECHO;

/**
 * Site s of parcours ring g (its copy at c, its own number key) at time t: two strands round it,
 * a brighter keel at its foot that leans with the bank (so the banking reads), and, after you pass
 * through, a soft halo rippling out from it and fading. Its quarter's colour, drifting slowly,
 * warming toward gold as you pass.
 */
export function parcoursSite(
  g: ParcoursRing,
  c: Vec3,
  key: number,
  colour: RGB,
  s: number,
  t: number,
  o: number[],
): boolean {
  const heat = ringHeat(key, t);
  let r = g.r;
  let a: number;
  let k: number;
  if (s < STRANDS) {
    a = ((s >> 1) / (STRANDS / 2)) * TAU + 0.04 * t;
    if (s & 1) r *= 0.94;
    // The keel: the ring's foot (its plane's down) glows a little more.
    const off = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
    k = 0.42 + 0.22 * smooth(1 - Math.abs(off) / 0.6);
  } else {
    const when = state.passed.get(key);
    if (when === undefined) return false;
    const e = (t - when) / 1.4;
    if (e < 0 || e >= 1) return false;
    a = ((s - STRANDS + 0.5) / ECHO) * TAU;
    r *= 1 + 0.5 * e;
    k = 0.4 * smooth(e / 0.1) * (1 - e) ** 2;
  }
  const ca = Math.cos(a) * r;
  const sa = Math.sin(a) * r;
  o[0] = c[0] + g.u[0] * ca + g.v[0] * sa;
  o[1] = c[1] + g.u[1] * ca + g.v[1] * sa;
  o[2] = c[2] + g.u[2] * ca + g.v[2] * sa;
  // Toward warm by up to 0.3, drifting slowly; toward gold by up to 0.6 as it warms.
  const w = 0.15 + 0.15 * Math.sin(t * 0.05 + g.i * 0.4);
  const gh = 0.6 * heat;
  const b = k * (1 + 0.4 * heat);
  for (let j = 0; j < 3; j++) {
    const base = colour[j] + (C.warm[j] - colour[j]) * w;
    o[3 + j] = (base + (C.gold[j] - base) * gh) * b;
  }
  return true;
}

/** The parcours' rings within sight (R), as the Ship's items: every tile copy near, ahead of the eye. */
export function parcoursItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]) {
  for (const g of parcoursRings()) {
    copiesNear(g.c[0], g.c[2], eye, R + g.r, (x, z) => {
      const { c, key } = parcoursCopy(g, [x, g.c[1], z]);
      const rel = sub(c, eye);
      const d = Math.max(0, len(rel) - g.r * 1.5);
      if (d > R || (dot(rel, fwd) < -g.r * 1.5 - 10 && d > 0)) return;
      const colour = colourAt(c[0], c[2]);
      out.push({
        d,
        gid: mixId(key, 5151),
        count: PARCOURS_SITES,
        weight: 2.2,
        site: (s, o) => parcoursSite(g, c, key, colour, s, t, o),
      });
    });
  }
}

/**
 * At most this many of each are drawn, the nearest: the stations, the decorative sets and the
 * parcours' rings. With the renderer's thinning, that holds them to a modest share of the pool
 * (some 30,000 sites in all at the very most, far fewer drawn), so the city under them keeps its grains.
 */
export const MOST_STATIONS = 6;
export const MOST_SETS = 10;
export const MOST_PARCOURS = 16;

/** The nearest n of a list of items. */
const nearestOf = (items: Item[], n: number) => items.sort((a, b) => a.d - b.d).slice(0, n);

/**
 * Everything over the city this file and lib/city-stations.ts add, for the Ship's picture: the
 * nearest stations, decorative rings and parcours rings within sight. From over the stations (the
 * stratosphere, looking down on the plan) they thin to a quarter, so the plan stays clear.
 */
export function aboveCityItems(eye: Vec3, fwd: Vec3, t: number, R: number): Item[] {
  const st: Item[] = [];
  const sets: Item[] = [];
  const parc: Item[] = [];
  stationItems(eye, fwd, t, R, st);
  ringSetItems(eye, fwd, t, R, sets);
  parcoursItems(eye, fwd, t, R, parc);
  const out = [
    ...nearestOf(st, MOST_STATIONS),
    ...nearestOf(sets, MOST_SETS),
    ...nearestOf(parc, MOST_PARCOURS),
  ];
  const over = smooth((eye[1] - GROUND - 480) / 120);
  if (over > 0) for (const it of out) it.weight *= 1 - 0.75 * over;
  return out;
}
