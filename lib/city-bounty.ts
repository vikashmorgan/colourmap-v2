/*
 * Bounty hunting over the City of Dreams (docs/specs/art-city.md, "The space police chase you, and
 * the bounties", 2026-11-15). Pure apart from the state it is handed: no three.js, no DOM.
 *
 * 2026-11-15, the user: "think how police chases could be and how we could do bounty hunting and
 * try to capture bad guys."
 *
 * Step three of the police. Now and then (in some BOUNTY_SLOT-second slots, while you fly by a
 * racing corridor, along it) a wanted ship breaks out ahead of you and flees down the corridor: a
 * dark hull with a single slow red warning light. Its route weaves inside the corridor's walls,
 * threading the ring gates and ducking under the high bridges, over the low ones (the corridors are
 * open the whole tile, so it recedes down the long view). It flees smartly: slow while you are far,
 * faster as you close in (FLEE_MIN to FLEE_MAX, under the street boost, so the boost catches it).
 *
 * Tail it close (within TAIL_R, behind it) for TAIL_TIME seconds and it is captured: it slows to a
 * stop, its light turns a soft gold and a ring of light spreads from it once; two police cruisers
 * close in along its route, one from ahead, one from behind, and fly it away between them. The
 * capture counts, quietly, on the map.
 * Too far behind (ESCAPE_D) or too long (RUN_MAX), it gets away and fades.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { CORRIDOR_X } from './city-corridors';
import { GROUND, type Item, mixId, nearest, TILE_X } from './city-grid';
import { CHASE_SIGHT, CRUISER_SITES, cruiserSite } from './city-police';

/** Wanted ships come in slots this long; about this share of them have one. */
export const BOUNTY_SLOT = 70;
const BOUNTY_SHARE = 0.6;
/** It breaks out only while you fly within this of a corridor's middle, along it, in the streets. */
export const SPAWN_NEAR = 34;
/** This far ahead of you. */
export const SPAWN_AHEAD = 45;
/** Its pace: slow while you are far (FLEE_FAR and more), fast when you are near (FLEE_NEAR). */
export const FLEE_MIN = 13;
export const FLEE_MAX = 26;
export const FLEE_NEAR = 18;
export const FLEE_FAR = 75;
/** Its height over the street, and how far it weaves across and up and down. */
export const WANTED_Y = 24;
export const WANTED_WEAVE_X = 2.5;
export const WANTED_WEAVE_Y = 3;
/** Within this of it, behind it, this long: captured. */
export const TAIL_R = 16;
export const TAIL_TIME = 3;
/** Further than this, or running longer than this, it gets away. */
export const ESCAPE_D = 320;
export const RUN_MAX = 50;
/** The police take this long to come to it, then escort it away for ESCORT_TIME. */
export const ARRIVE = 3;
export const ESCORT_TIME = 6;
const ESCORT_PACE = 22;
/** How far ahead of it and behind it the two escorts fly. */
export const ESCORT_GAP = 5;
/** How far down the corridor the escorts come from. */
const ARRIVE_FROM = 70;
const GONE_TIME = 2;
/** How long the capture's ring of light spreads. */
export const RING_TIME = 1.8;

export type BountyPhase = 'off' | 'flee' | 'caught' | 'escort' | 'gone';

export type Bounty = {
  phase: BountyPhase;
  /** Its slot, and the last slot that had one. */
  n: number;
  used: number;
  /** The corridor copy it runs down (world x), where along it it began, which way. */
  x: number;
  z0: number;
  sgn: 1 | -1;
  /** How far it has flown, and how fast. */
  s: number;
  v: number;
  began: number;
  since: number;
  /** Seconds you have tailed it. */
  tail: number;
  /** How many you have captured. */
  caught: number;
};

export function makeBounty(): Bounty {
  return {
    phase: 'off',
    n: -1,
    used: -1,
    x: 0,
    z0: 0,
    sgn: 1,
    s: 0,
    v: 0,
    began: 0,
    since: 0,
    tail: 0,
    caught: 0,
  };
}

/** No wanted ship about (a new flight); the captures kept. */
export function resetBounty(b: Bounty) {
  b.phase = 'off';
  b.tail = 0;
}

/** Its route s along: down the corridor, weaving inside its walls. Written into o. */
export function wantedPath(b: Pick<Bounty, 'n' | 'x' | 'z0' | 'sgn'>, s: number, o: Vec3) {
  const ph = hash(b.n, 1503) * 6.28;
  o[0] = b.x + WANTED_WEAVE_X * Math.sin(s / 23 + ph);
  o[1] = GROUND + WANTED_Y + WANTED_WEAVE_Y * Math.sin(s / 31 + 2 * ph);
  o[2] = b.z0 + b.sgn * s;
}

export type BountyInput = {
  t: number;
  dt: number;
  /** Whether you are piloting over the city (no race, room or space). */
  on: boolean;
  /** The police are after you: no wanted ship now. */
  busy: boolean;
  pos: Vec3;
  fwd: Vec3;
};

const w: Vec3 = [0, 0, 0];

function setPhase(b: Bounty, phase: BountyPhase, t: number) {
  b.phase = phase;
  b.since = t;
}

/** Whether a wanted ship breaks out now near p heading f, and from where; null if not. */
export function planBounty(
  n: number,
  t: number,
  p: Vec3,
  f: Vec3,
): Pick<Bounty, 'n' | 'x' | 'z0' | 'sgn'> | null {
  if (hash(n, 1501) >= BOUNTY_SHARE) return null;
  if (t < n * BOUNTY_SLOT + 10 * hash(n, 1502)) return null;
  const y = p[1] - GROUND;
  if (y < 6 || y > 60) return null;
  const fl = Math.hypot(f[0], f[2]);
  if (fl < 1e-6 || Math.abs(f[2]) / fl < 0.6) return null;
  let x = Number.NaN;
  for (const cx of CORRIDOR_X) {
    const c = nearest(cx, p[0], TILE_X);
    if (Math.abs(c - p[0]) < SPAWN_NEAR && !(Math.abs(x - p[0]) < Math.abs(c - p[0]))) x = c;
  }
  if (Number.isNaN(x)) return null;
  const sgn: 1 | -1 = f[2] > 0 ? 1 : -1;
  return { n, x, z0: p[2] + sgn * SPAWN_AHEAD, sgn };
}

/** One frame of the bounty: a wanted ship breaking out, fleeing, captured and escorted, or gone. */
export function bountyStep(b: Bounty, inp: BountyInput) {
  const { t, dt, pos } = inp;
  if (b.phase === 'off') {
    const n = Math.floor(t / BOUNTY_SLOT);
    if (n === b.used || !inp.on || inp.busy) return;
    const plan = planBounty(n, t, pos, inp.fwd);
    if (!plan) return;
    Object.assign(b, plan);
    b.used = n;
    b.s = 0;
    b.v = FLEE_MIN;
    b.tail = 0;
    b.began = t;
    setPhase(b, 'flee', t);
    return;
  }
  if (b.phase === 'flee') {
    wantedPath(b, b.s, w);
    const d = Math.hypot(pos[0] - w[0], pos[1] - w[1], pos[2] - w[2]);
    // Smart: slow while you are far, faster as you close in.
    const near = smooth((FLEE_FAR - d) / (FLEE_FAR - FLEE_NEAR));
    const want = FLEE_MIN + (FLEE_MAX - FLEE_MIN) * near;
    b.v += (want - b.v) * (1 - Math.exp(-2.5 * dt));
    b.s += b.v * dt;
    // Behind it: not past its tail along the corridor.
    const behind = (pos[2] - w[2]) * b.sgn < 1;
    b.tail = d < TAIL_R && behind ? b.tail + dt : Math.max(0, b.tail - 0.5 * dt);
    if (b.tail >= TAIL_TIME) {
      b.caught++;
      setPhase(b, 'caught', t);
    } else if (!inp.on || d > ESCAPE_D || t - b.began > RUN_MAX) setPhase(b, 'gone', t);
    return;
  }
  if (b.phase === 'caught') {
    // It slows to a stop as the police come.
    b.v *= Math.exp(-2 * dt);
    b.s += b.v * dt;
    if (t - b.since >= ARRIVE) setPhase(b, 'escort', t);
    return;
  }
  if (b.phase === 'escort') {
    b.v += (ESCORT_PACE - b.v) * (1 - Math.exp(-0.8 * dt));
    b.s += b.v * dt;
    if (t - b.since >= ESCORT_TIME) setPhase(b, 'off', t);
    return;
  }
  // Gone: on down the corridor, fading.
  b.s += b.v * dt;
  if (t - b.since >= GONE_TIME) setPhase(b, 'off', t);
}

/** How much of it shows: in over a second; out at the escort's end, or as it gets away. */
export function bountyShows(b: Bounty, t: number): number {
  switch (b.phase) {
    case 'off':
      return 0;
    case 'flee':
      return smooth((t - b.began) / 1);
    case 'caught':
      return 1;
    case 'escort':
      return 1 - smooth((t - b.since - (ESCORT_TIME - 3)) / 3);
    default:
      return 1 - smooth((t - b.since) / GONE_TIME);
  }
}

/** The wanted ship now into o, its way into f. */
export function wantedAt(b: Bounty, o: Vec3, f: Vec3) {
  wantedPath(b, b.s, o);
  wantedPath(b, b.s + 0.5, f);
  f[0] -= o[0];
  f[1] -= o[1];
  f[2] -= o[2];
  const l = Math.hypot(f[0], f[1], f[2]) || 1;
  f[0] /= l;
  f[1] /= l;
  f[2] /= l;
}

/**
 * Escort j at time t into o, its way into f: a pincer down the corridor, on the wanted ship's own
 * route (so as clear of every wall as it is). Escort 0 comes back down the corridor to it, facing
 * it, then turns about ESCORT_GAP ahead to lead it away; escort 1 comes up from behind and follows
 * ESCORT_GAP behind. A convoy of three down the long view.
 */
export function escortAt(b: Bounty, j: number, t: number, o: Vec3, f: Vec3) {
  const u = t - b.since;
  const come = b.phase === 'caught' ? (ARRIVE_FROM - ESCORT_GAP) * (1 - smooth(u / ARRIVE)) : 0;
  const lead = j === 0;
  wantedPath(b, b.s + (lead ? 1 : -1) * (ESCORT_GAP + come), o);
  o[1] += 0.3;
  const turn = !lead ? 0 : b.phase === 'caught' ? Math.PI : Math.PI * (1 - smooth(u / 1.2));
  f[0] = Math.sin(turn);
  f[1] = 0;
  f[2] = b.sgn * Math.cos(turn);
}

/* ---------- the design ---------- */

/** Sites in the wanted ship, and in the capture's ring of light. */
export const WANTED_SITES = 84;
export const RING_SITES = 36;
export const WANTED_LEN = 2.6;

const DARK_HULL: RGB = [0.34, 0.3, 0.46];
export const WARNING: RGB = [1, 0.16, 0.08];
const SOFT_GOLD: RGB = [1, 0.84, 0.55];
/** The warning light breathes slowly (a period this long): never a flash. */
export const WARNING_PERIOD = 1.4;

/**
 * Site s of the wanted ship at c heading f, at time t (`free` 0 once captured), into o
 * [x, y, z, r, g, b]: a dark blunt delta with a notched tail, a dim spine, a single warning light
 * on its back (slow red; a soft steady gold once captured) and a faint violet exhaust. Sites past
 * WANTED_SITES are the capture's ring of light (`ring` 0..1 its spread).
 */
export function wantedSite(
  c: Vec3,
  f: Vec3,
  s: number,
  t: number,
  k: number,
  free: number,
  ring: number,
  o: number[],
) {
  const L = WANTED_LEN / 2;
  let a: number;
  let b: number;
  let h: number;
  let col: RGB;
  let lit: number;
  if (s < 48) {
    // The hull: a blunt delta, its tail notched.
    const u = (s + 0.5) / 48;
    const e = u < 0.5 ? 1 : -1;
    const v = u < 0.5 ? u * 2 : (u - 0.5) * 2;
    if (v < 0.6) {
      a = L - (2 * L * v) / 0.6;
      b = e * (0.25 + (0.95 * v) / 0.6);
    } else {
      const q = (v - 0.6) / 0.4;
      a = -L + 0.55 * q;
      b = e * 1.2 * (1 - 0.8 * q);
    }
    h = 0;
    col = DARK_HULL;
    lit = 0.3;
  } else if (s < 60) {
    // A dim spine down its back.
    const v = (s - 48 + 0.5) / 12;
    a = L - 2 * L * v;
    b = 0;
    h = 0.12;
    col = DARK_HULL;
    lit = 0.24;
  } else if (s < 72) {
    // The one warning light, on its back: a core and a halo.
    const m = s - 60;
    const halo = m >= 3;
    const wv = hash(s, 1511) * 6.283;
    const rad = halo ? 0.1 + 0.18 * hash(s, 1512) : 0.03 * m;
    a = -0.2 + rad * Math.cos(wv);
    b = 0;
    h = 0.3 + rad * Math.sin(wv);
    const breathe = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((6.2832 * t) / WARNING_PERIOD));
    col = free > 0 ? WARNING : SOFT_GOLD;
    lit = (halo ? 0.3 : 0.85) * (free > 0 ? breathe : 0.8);
  } else if (s < WANTED_SITES) {
    // A faint violet exhaust.
    const v = (s - 72 + 0.5) / 12;
    const e = s & 1 ? 1 : -1;
    a = -L - 0.2 - 2.4 * v;
    b = e * 0.3;
    h = 0.03;
    col = [0.55, 0.4, 1];
    lit = 0.35 * (1 - v) * free;
  } else {
    // The capture's ring of light, spreading level round it once and fading.
    const q = (s - WANTED_SITES + 0.5) / RING_SITES;
    const r = 0.8 + 6 * ring;
    a = r * Math.cos(q * 6.2832);
    b = r * Math.sin(q * 6.2832);
    h = 0.1;
    col = SOFT_GOLD;
    lit = ring > 0 && ring < 1 ? 0.5 * (1 - ring) : 0;
    // Level: no pitch for the ring.
    const fl = Math.hypot(f[0], f[2]) || 1;
    o[0] = c[0] + (f[0] / fl) * a - (f[2] / fl) * b;
    o[1] = c[1] + h;
    o[2] = c[2] + (f[2] / fl) * a + (f[0] / fl) * b;
    o[3] = col[0] * lit * k;
    o[4] = col[1] * lit * k;
    o[5] = col[2] * lit * k;
    return;
  }
  const fl = Math.hypot(f[0], f[2]) || 1;
  const fx = f[0] / fl;
  const fz = f[2] / fl;
  o[0] = c[0] + fx * a - fz * b;
  o[1] = c[1] + h + f[1] * a;
  o[2] = c[2] + fz * a + fx * b;
  o[3] = col[0] * lit * k;
  o[4] = col[1] * lit * k;
  o[5] = col[2] * lit * k;
}

/* ---------- drawing ---------- */

/** The wanted ship and its escorts near the eye, for the Ship's renderer. */
export function bountyItems(b: Bounty, eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const k = bountyShows(b, t);
  if (k <= 0) return;
  const push = (pos: Vec3, gid: number, count: number, site: Item['site']) => {
    const ex = pos[0] - eye[0];
    const ez = pos[2] - eye[2];
    const d = Math.max(0, Math.hypot(ex, pos[1] - eye[1], ez) - 3);
    if (d > CHASE_SIGHT || ex * fwd[0] + ez * fwd[2] < -6) return;
    out.push({ d, gid, count, weight: 1.6, probe: [pos], site });
  };
  const p: Vec3 = [0, 0, 0];
  const f: Vec3 = [0, 0, 0];
  wantedAt(b, p, f);
  const free = b.phase === 'flee' || b.phase === 'gone' ? 1 : 0;
  const ringU = b.phase === 'caught' ? (t - b.since) / RING_TIME : 1;
  const ringOn = ringU < 1;
  push(p, mixId(b.n, 15011), WANTED_SITES + (ringOn ? RING_SITES : 0), (s, o) => {
    wantedSite(p, f, s, t, k, free, ringU, o);
    return true;
  });
  if (b.phase !== 'caught' && b.phase !== 'escort') return;
  for (let j = 0; j < 2; j++) {
    const q: Vec3 = [0, 0, 0];
    const g: Vec3 = [0, 0, 0];
    escortAt(b, j, t, q, g);
    // Coming in over the first second.
    const kk = b.phase === 'caught' ? k * smooth((t - b.since) / 1) : k;
    push(q, mixId(b.n, 15021 + j), CRUISER_SITES, (s, o) => {
      cruiserSite(q, g, j, s, t, kk, o);
      return true;
    });
  }
}
