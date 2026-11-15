/*
 * The space police over the City of Dreams (docs/specs/art-city.md, "UFOs, more flying cars and
 * the space police", 2026-11-15). Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "space police with flare lights; they travel through town sometimes at full
 * speed chasing other spaceships like ours."
 *
 * Step one: chases between others. Every so often a fugitive (a flat arrowhead with two engines, the
 * shape of the player's Arrow, in a hot amber) races down one of the racing corridors (x ±78,
 * lib/city-corridors.ts) at the Ship's street boost, with one to three police cruisers on its tail,
 * each flying the very path it flew a moment before. The corridors are straight and open the whole
 * tile, so the chase reads down the long view, shrinking to the vanishing point. Their height, 24
 * over the street, threads every obstacle: over the low decks (12), through the middle of the ring
 * gates (24, radius 9), under the high decks (40). They weave a little, inside every corridor's
 * walls.
 *
 * The cruisers: an interceptor of our own (a slim swept hull, two tail fins, a bar across its back
 * with a flare at each end). Their flares alternate red and blue, the one flash the user asked for,
 * kept to the police lights alone; everything else stays mellow.
 *
 * A chase starts at random (about two in three of every 50-second slot), now and then laid to
 * pass right by the player, and ends after 16 to 24 seconds. Each is planned once, at its start,
 * from the time and the player's place then (`planChase`), and from then on is a formula of the
 * time: nothing else kept.
 *
 * Hooks for later (not built yet; the spec notes them): `ChaseTarget` is what the police chase. A
 * target is a path in time; today it is always a fugitive's corridor run (`fugitivePath`). Chasing
 * the player would pass the player's recent flight as the target, starting after wild flying, and
 * `lineOfSight` is where the police lose the player when it breaks (a tunnel, under a bridge).
 * Bounty would turn a chase's fugitive into a wanted ship the player tails to capture.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { CORRIDOR_X } from './city-corridors';
import { GROUND, type Item, mixId, nearest, TILE_X, TILE_Z } from './city-grid';

/** The Ship's pace and its street boost (lib/city.ts FLY_SPEED, STREET_BOOST): a chase's pace. */
export const CHASE_SPEED = 9 * 3.2;
/** A chase's height over the street: through the corridors' gates, between their decks. */
export const CHASE_Y = 24;
/** How far a chase may weave from its corridor's middle, across and up and down. */
export const WEAVE_X = 2.5;
export const WEAVE_Y = 2.5;
/** Chases come in slots this long; most slots have one. */
export const CHASE_SLOT = 50;
const CHASE_SHARE = 0.68;
/** How long a chase lasts, at least and at most. */
export const CHASE_MIN = 16;
export const CHASE_MAX = 24;
/** Of the chases, about this share are laid to pass by the player. */
const NEAR_SHARE = 0.4;
/** How far behind its fugitive each cruiser flies, in seconds of the path. */
export const COP_LAGS = [0.75, 1.3, 1.85] as const;

/** What the police chase: a path in time (where it is at time t, and the way it heads). */
export type ChaseTarget = {
  kind: 'fugitive';
  /** Its place at time t, written into `o`. */
  at: (t: number, o: Vec3) => void;
};

export type Chase = {
  /** Its number (its slot). */
  n: number;
  start: number;
  end: number;
  /** The corridor's middle, world x (the copy it runs in), its start along z, its way. */
  x: number;
  z0: number;
  sgn: 1 | -1;
  /** How many cruisers give chase: one to three. */
  cops: number;
  /** Whether it was laid to pass by the player. */
  near: boolean;
  target: ChaseTarget;
};

/**
 * The fugitive's path: down the corridor at x from z0 one way at the chase's pace from `start`,
 * weaving softly across and up and down. Written into o (no allocation).
 */
export function fugitivePath(
  c: Pick<Chase, 'n' | 'start' | 'x' | 'z0' | 'sgn'>,
  t: number,
  o: Vec3,
) {
  const u = t - c.start;
  const ph = hash(c.n, 1301) * 6.28;
  o[0] = c.x + WEAVE_X * Math.sin(0.55 * u + ph) * Math.cos(0.17 * u);
  o[1] = GROUND + CHASE_Y + WEAVE_Y * Math.sin(0.8 * u + 2 * ph);
  o[2] = c.z0 + c.sgn * CHASE_SPEED * u;
}

/**
 * Chase n, as planned at its start: which corridor copy, where along it, which way, how many
 * cruisers, and how long; `eye` the player's place then. Null when slot n has none.
 */
export function planChase(n: number, eye: Vec3): Chase | null {
  if (hash(n, 1311) >= CHASE_SHARE) return null;
  const start = n * CHASE_SLOT + 6 * hash(n, 1312);
  const end = start + CHASE_MIN + (CHASE_MAX - CHASE_MIN) * hash(n, 1313);
  const sgn: 1 | -1 = hash(n, 1314) < 0.5 ? 1 : -1;
  const near = hash(n, 1315) < NEAR_SHARE;
  const side = hash(n, 1316) < 0.5 ? 0 : 1;
  const cops = 1 + Math.floor(hash(n, 1317) * 3);
  let x: number;
  let z0: number;
  if (near) {
    // The corridor nearest the player, started so the chase passes the player some seconds in.
    const best = CORRIDOR_X.map((cx) => nearest(cx, eye[0], TILE_X)).sort(
      (a, b) => Math.abs(a - eye[0]) - Math.abs(b - eye[0]),
    );
    x = best[0] as number;
    const by = (5 + 4 * hash(n, 1318)) * CHASE_SPEED;
    z0 = eye[2] - sgn * by;
  } else {
    x = nearest(CORRIDOR_X[side] as number, eye[0], TILE_X);
    z0 = nearest(TILE_Z * hash(n, 1319), eye[2], TILE_Z);
  }
  const plan = { n, start, x, z0, sgn };
  return {
    ...plan,
    end,
    cops,
    near,
    target: { kind: 'fugitive', at: (t, o) => fugitivePath(plan, t, o) },
  };
}

/** How much of a chase shows at t: easing in over its first second and out over its last two. */
export const chaseShows = (c: Chase, t: number) =>
  t < c.start || t > c.end ? 0 : smooth((t - c.start) / 1) * smooth((c.end - t) / 2);

/** The chase going on now, planned when it began (the player's place `eye` then); null if none. */
let current: Chase | null = null;
export function chaseNow(t: number, eye: Vec3): Chase | null {
  const n = Math.floor(t / CHASE_SLOT);
  if (!current || current.n !== n) current = planChase(n, eye);
  if (!current || t < current.start || t > current.end) return null;
  return current;
}
/** Forget the chase going on (a new flight, a test). */
export function resetChases() {
  current = null;
}

/**
 * Cruiser i of chase c at time t: on the target's path, COP_LAGS[i] behind it, a little to one side
 * so the cruisers fly a loose file. Written into o; its heading into f.
 */
export function cruiserAt(c: Chase, i: number, t: number, o: Vec3, f: Vec3) {
  const lag = COP_LAGS[i] as number;
  c.target.at(t - lag, o);
  c.target.at(t - lag + 0.05, f);
  f[0] -= o[0];
  f[1] -= o[1];
  f[2] -= o[2];
  const l = Math.hypot(f[0], f[1], f[2]) || 1;
  f[0] /= l;
  f[1] /= l;
  f[2] /= l;
  // A loose file: the second to the right, the third to the left, each a little lower.
  const side = i === 0 ? 0 : i === 1 ? 1.6 : -1.6;
  o[0] += f[2] * -side;
  o[2] += f[0] * side;
  o[1] -= 0.4 * i;
}

/* ---------- the police lights ---------- */

export const POLICE_RED: RGB = [1, 0.12, 0.1];
export const POLICE_BLUE: RGB = [0.15, 0.35, 1];
/** How long each flare holds before the two swap (seconds): two swaps a second and a half. */
export const FLARE_HALF = 0.32;

/**
 * Which flare is red at time t for cruiser i: the left (0) or the right (1), swapping every
 * FLARE_HALF; and how bright the flares are (a quick soft rise each swap, never a hard strobe).
 */
export function flarePhase(t: number, i = 0): { redLeft: boolean; bright: number } {
  return { redLeft: flareRedLeft(t, i), bright: flareBright(t, i) };
}
/** Whether cruiser i's left flare is the red one at time t. */
export const flareRedLeft = (t: number, i = 0) => (Math.floor(t / FLARE_HALF + 0.37 * i) & 1) === 0;
/** How bright cruiser i's flares are at time t: a quick soft rise after each swap. */
export function flareBright(t: number, i = 0): number {
  const u = t / FLARE_HALF + 0.37 * i;
  const f = u - Math.floor(u);
  return 0.55 + 0.45 * smooth(f / 0.25) * smooth((1 - f) / 0.2);
}

/** The colour of cruiser i's left (side -1) or right (side 1) flare at time t. */
export function flareColour(t: number, i: number, side: -1 | 1): RGB {
  const { redLeft, bright } = flarePhase(t, i);
  const red = side < 0 ? redLeft : !redLeft;
  const c = red ? POLICE_RED : POLICE_BLUE;
  return [c[0] * bright, c[1] * bright, c[2] * bright];
}

/* ---------- the designs ---------- */

/** Sites in a cruiser and in the fugitive. */
export const CRUISER_SITES = 90;
export const FUGITIVE_SITES = 72;
/** Their lengths, about the Ship's. */
export const CRUISER_LEN = 2.8;
export const FUGITIVE_LEN = 2.4;

const HULL: RGB = [0.78, 0.84, 0.95];
const FUGITIVE_HULL: RGB = [1, 0.82, 0.6];
const FUGITIVE_GLOW: RGB = [1, 0.55, 0.15];

/**
 * Site s of a cruiser at c heading f (unit), its number i, at time t, into o [x, y, z, r, g, b]:
 * its swept hull outline, two tail fins, a bar across its back with a flare either end (and a soft
 * halo round each flare), a white nose light and a cool engine glow.
 */
export function cruiserSite(
  c: Vec3,
  f: Vec3,
  i: number,
  s: number,
  t: number,
  k: number,
  o: number[],
) {
  const L = CRUISER_LEN / 2;
  let a: number;
  let b: number;
  let h: number;
  let r: number;
  let g: number;
  let bl: number;
  if (s < 40) {
    // The hull: a swept dart outline, nose to the two rear corners and back.
    const u = (s + 0.5) / 40;
    const e = u < 0.5 ? 1 : -1;
    const v = u < 0.5 ? u * 2 : (u - 0.5) * 2;
    a = L - 2 * L * v;
    b = e * (0.15 + 0.75 * v * v);
    h = 0.1 * (1 - v);
    r = HULL[0] * 0.32;
    g = HULL[1] * 0.32;
    bl = HULL[2] * 0.32;
  } else if (s < 52) {
    // Two tail fins, upright.
    const e = s & 1 ? 1 : -1;
    const v = (s - 40) / 12;
    a = -L * 0.8 + 0.3 * v;
    b = e * 0.55;
    h = 0.1 + 0.55 * v;
    r = HULL[0] * 0.3;
    g = HULL[1] * 0.3;
    bl = HULL[2] * 0.3;
  } else if (s < 60) {
    // The light bar across its back.
    const v = (s - 52 + 0.5) / 8;
    a = -0.1;
    b = -0.5 + v;
    h = 0.32;
    r = 0.25;
    g = 0.25;
    bl = 0.3;
  } else if (s < 80) {
    // The two flares and their halos: alternating red and blue.
    const side: -1 | 1 = s < 70 ? -1 : 1;
    const m = (s - 60) % 10;
    const halo = m >= 3;
    const w = hash(s, 1331) * 6.283;
    const rad = halo ? 0.12 + 0.2 * hash(s, 1332) : 0.02 * m;
    a = -0.1 + rad * Math.cos(w);
    b = side * 0.55;
    h = 0.32 + rad * Math.sin(w);
    const col = side < 0 === flareRedLeft(t, i) ? POLICE_RED : POLICE_BLUE;
    const lit = (halo ? 0.3 : 0.95) * flareBright(t, i);
    r = col[0] * lit;
    g = col[1] * lit;
    bl = col[2] * lit;
  } else if (s < 84) {
    // A white nose light.
    a = L + 0.05;
    b = (s - 81.5) * 0.06;
    h = 0.08;
    r = 0.55;
    g = 0.58;
    bl = 0.62;
  } else {
    // A cool engine glow behind.
    const v = (s - 84) / 6;
    a = -L - 0.2 - 0.9 * v;
    b = 0;
    h = 0.05;
    const lit = 0.5 * (1 - v);
    r = 0.5 * lit;
    g = 0.75 * lit;
    bl = lit;
  }
  place(c, f, a, b, h, r * k, g * k, bl * k, o);
}

/**
 * Site s of the fugitive at c heading f, at time t: a flat arrowhead with two engines, the shape of
 * the player's Arrow, in a hot amber, its boost plume streaming behind.
 */
export function fugitiveSite(c: Vec3, f: Vec3, s: number, t: number, k: number, o: number[]) {
  const L = FUGITIVE_LEN / 2;
  let a: number;
  let b: number;
  let h: number;
  let lit: number;
  let col: RGB;
  if (s < 36) {
    // The arrowhead's outline: the nose, out to the swept wingtips, in to the notch.
    const u = (s + 0.5) / 36;
    const e = u < 0.5 ? 1 : -1;
    const v = u < 0.5 ? u * 2 : (u - 0.5) * 2;
    if (v < 0.7) {
      a = L - (2 * L * v) / 0.7;
      b = (e * (1.05 * v)) / 0.7;
    } else {
      const w = (v - 0.7) / 0.3;
      a = -L + 0.5 * w;
      b = e * 1.05 * (1 - w * 0.75);
    }
    h = 0;
    lit = 0.4;
    col = FUGITIVE_HULL;
  } else if (s < 44) {
    // Two engines.
    const e = s & 1 ? 1 : -1;
    a = -L * 0.75;
    b = e * 0.35;
    h = 0.05;
    lit = 0.65;
    col = FUGITIVE_GLOW;
  } else {
    // The boost plume: two streams fading behind, flickering a little.
    const v = (s - 44 + 0.5) / (FUGITIVE_SITES - 44);
    const e = s & 1 ? 1 : -1;
    a = -L - 0.3 - 5 * v;
    b = e * 0.35 * (1 - v) + 0.08 * Math.sin(9 * t + s);
    h = 0.05;
    lit = 0.5 * (1 - v) ** 1.5;
    col = FUGITIVE_GLOW;
  }
  place(c, f, a, b, h, col[0] * lit * k, col[1] * lit * k, col[2] * lit * k, o);
}

/** A point a forward, b to the right, h up of c heading f (unit), with its colour, into o. */
function place(
  c: Vec3,
  f: Vec3,
  a: number,
  b: number,
  h: number,
  r: number,
  g: number,
  bl: number,
  o: number[],
) {
  const fl = Math.hypot(f[0], f[2]) || 1;
  const fx = f[0] / fl;
  const fz = f[2] / fl;
  o[0] = c[0] + fx * a - fz * b;
  o[1] = c[1] + h + f[1] * a;
  o[2] = c[2] + fz * a + fx * b;
  o[3] = r;
  o[4] = g;
  o[5] = bl;
}

/* ---------- drawing ---------- */

/** How far a chase is drawn: down the whole corridor's view. */
export const CHASE_SIGHT = 520;

/** The chase going on, near the eye, for the Ship's renderer: the fugitive and its cruisers. */
export function policeItems(eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const c = chaseNow(t, eye);
  if (!c) return;
  const k = chaseShows(c, t);
  if (k <= 0) return;
  const push = (pos: Vec3, gid: number, count: number, site: Item['site']) => {
    const ex = pos[0] - eye[0];
    const ez = pos[2] - eye[2];
    const d = Math.max(0, Math.hypot(ex, pos[1] - eye[1], ez) - 3);
    if (d > CHASE_SIGHT || ex * fwd[0] + ez * fwd[2] < -6) return;
    out.push({ d, gid, count, weight: 1.6, probe: [pos], site });
  };
  const fp: Vec3 = [0, 0, 0];
  const ff: Vec3 = [0, 0, 0];
  c.target.at(t, fp);
  c.target.at(t + 0.05, ff);
  ff[0] -= fp[0];
  ff[1] -= fp[1];
  ff[2] -= fp[2];
  push(fp, mixId(c.n, 13401), FUGITIVE_SITES, (s, o) => {
    fugitiveSite(fp, ff, s, t, k, o);
    return true;
  });
  for (let i = 0; i < c.cops; i++) {
    const p: Vec3 = [0, 0, 0];
    const f: Vec3 = [0, 0, 0];
    cruiserAt(c, i, t, p, f);
    push(p, mixId(c.n, 13411 + i), CRUISER_SITES, (s, o) => {
      cruiserSite(p, f, i, s, t, k, o);
      return true;
    });
  }
}
