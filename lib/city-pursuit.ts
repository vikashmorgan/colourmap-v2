/*
 * The space police chase you (docs/specs/art-city.md, "The space police chase you, and the
 * bounties", 2026-11-15). Pure apart from the state it is handed: no three.js, no DOM.
 *
 * 2026-11-15, the user: "space police with the flare lights ... think how police chases could be
 * ... and police stops chasing when u hide."
 *
 * Step two of the police (lib/city-police.ts is step one, their chases between others). Fun, not
 * punishing: no game over, no count on the screen.
 *
 * - **Heat**: flying wild warms it, calm flying cools it. Shift's double boost held low in the
 *   streets (under LOW_FLIGHT over the street) fills it in HEAT_DOUBLE seconds; scraping walls at
 *   speed in HEAT_SCRAPE; buzzing a police patrol (passing within BUZZ_R of a step-one cruiser at
 *   speed) at once. Full, the police come.
 * - **The chase**: one to three cruisers come up from behind and follow the path you flew (your own
 *   breadcrumbs: free of every wall, since you flew it), at PURSUIT_SPEED, faster than the cruise,
 *   slower than the street boost, so the boost gets you away and a cruise does not.
 * - **Hiding**: they follow only as far as where they last saw you. Out of their sight (a tower in
 *   the way, something solid over you: a tunnel, a bore, the Deep Line, a sky bridge; or too far,
 *   past SIGHT) for HIDE_TIME seconds and they lose you: they search round where they last saw you
 *   for SEARCH_TIME, then rise and fade away. Seen again close while searching, the chase is on again.
 * - **Caught**: the leading cruiser within CATCH_R for CATCH_TIME seconds, its flares flash brighter
 *   a moment, your ship slows softly for a few seconds, and they leave. Then a cool-down.
 */

import { hash, smooth, type Vec3 } from './bigbang';
import type { Item } from './city-grid';
import { mixId } from './city-grid';
import { CHASE_SIGHT, CRUISER_SITES, chaseNow, cruiserAt, cruiserSite } from './city-police';

/* ---------- the path you flew: breadcrumbs the cruisers follow ---------- */

const CAP = 640;
/** A crumb every this far: 640 of them keep the last 960 or so of the path. */
const STEP = 1.5;
/** A leap further than this in one step (a portal, a fast trip) starts the path afresh. */
const JUMP = 60;

export type Crumbs = {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  /** How far along the path each crumb is. */
  s: Float64Array;
  head: number;
  n: number;
};

export function makeCrumbs(): Crumbs {
  return {
    x: new Float64Array(CAP),
    y: new Float64Array(CAP),
    z: new Float64Array(CAP),
    s: new Float64Array(CAP),
    head: -1,
    n: 0,
  };
}

export function clearCrumbs(c: Crumbs) {
  c.head = -1;
  c.n = 0;
}

const slot = (c: Crumbs, k: number) => (c.head - c.n + 1 + k + CAP) % CAP;

/** One more place on the path; false when it was a leap (the path starts afresh from it). */
export function pushCrumb(c: Crumbs, p: Vec3): boolean {
  let leap = false;
  let s = 0;
  if (c.n > 0) {
    const h = c.head;
    const d = Math.hypot(
      p[0] - (c.x[h] as number),
      p[1] - (c.y[h] as number),
      p[2] - (c.z[h] as number),
    );
    if (d < STEP) return true;
    if (d > JUMP) {
      clearCrumbs(c);
      leap = true;
    } else s = (c.s[h] as number) + d;
  }
  c.head = (c.head + 1) % CAP;
  c.n = Math.min(CAP, c.n + 1);
  c.x[c.head] = p[0];
  c.y[c.head] = p[1];
  c.z[c.head] = p[2];
  c.s[c.head] = s;
  return !leap;
}

/** How far along the path its newest crumb is, and its oldest. */
export const crumbHead = (c: Crumbs) => (c.n > 0 ? (c.s[c.head] as number) : 0);
export const crumbTail = (c: Crumbs) => (c.n > 0 ? (c.s[slot(c, 0)] as number) : 0);

/** The place s along the path (clamped to what is kept) into o, the way it goes into f. */
export function crumbAt(c: Crumbs, s: number, o: Vec3, f: Vec3) {
  f[0] = 0;
  f[1] = 0;
  f[2] = -1;
  if (c.n === 0) return;
  let lo = 0;
  let hi = c.n - 1;
  if (s <= (c.s[slot(c, 0)] as number)) hi = Math.min(1, hi);
  else if (s >= (c.s[c.head] as number)) lo = Math.max(0, hi - 1);
  else
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if ((c.s[slot(c, m)] as number) <= s) lo = m;
      else hi = m;
    }
  const a = slot(c, lo);
  const b = slot(c, hi);
  const sa = c.s[a] as number;
  const sb = c.s[b] as number;
  const u = sb > sa ? Math.max(0, Math.min(1, (s - sa) / (sb - sa))) : 0;
  const ax = c.x[a] as number;
  const ay = c.y[a] as number;
  const az = c.z[a] as number;
  const bx = c.x[b] as number;
  const by = c.y[b] as number;
  const bz = c.z[b] as number;
  o[0] = ax + (bx - ax) * u;
  o[1] = ay + (by - ay) * u;
  o[2] = az + (bz - az) * u;
  const l = Math.hypot(bx - ax, by - ay, bz - az);
  if (l > 1e-9) {
    f[0] = (bx - ax) / l;
    f[1] = (by - ay) / l;
    f[2] = (bz - az) / l;
  }
}

/* ---------- heat: what brings the police ---------- */

/** Under this over the street you are low, in the streets. */
export const LOW_FLIGHT = 32;
/** Seconds of the double boost held low that bring the police. */
export const HEAT_DOUBLE = 8;
/** Seconds of scraping walls at speed that bring them. */
export const HEAT_SCRAPE = 2.5;
/** Faster than this counts as speed (the cruise is 9, the street boost 28.8). */
export const RECKLESS_SPEED = 20;
/** Within this of a patrol's cruiser at speed: buzzing the police, and they come at once. */
export const BUZZ_R = 12;
/** Calm, the heat cools away in this many seconds. */
export const HEAT_COOL = 15;

/* ---------- the chase ---------- */

/** The cruisers' pace: faster than the cruise (9), slower than the street boost (28.8). */
export const PURSUIT_SPEED = 24;
/** How far behind you on your path each cruiser keeps. */
export const COP_GAPS = [7, 12, 17] as const;
/** Where they come up from: this far back on your path. */
export const COME_FROM = 45;
/** How far they see. */
export const SIGHT = 170;
/** Out of sight this long, and they have lost you. */
export const HIDE_TIME = 3;
/** How long they search round where they lost you, and how far along the path either way. */
export const SEARCH_TIME = 7;
const WANDER = 10;
const SEARCH_SPEED = 10;
/** Seen again while searching, this near, the chase is on again. */
export const SPOT_AGAIN = 100;
/** The leading cruiser within this of you this long: caught. */
export const CATCH_R = 10;
export const CATCH_TIME = 2.5;
/** How long the flares flash bright when you are caught. */
export const CAUGHT_TIME = 1.6;
/** How long they take to rise and fade away. */
export const LEAVE_TIME = 2.5;
/** After a chase, this long before another can begin. */
export const COOLDOWN = 30;
/** Caught, the ship slows to this share of its pace, easing back over DRAG_TIME. */
export const DRAG_LOW = 0.45;
export const DRAG_TIME = 3.5;

export type PursuitPhase = 'off' | 'pursue' | 'search' | 'caught' | 'leave';

export type Pursuit = {
  phase: PursuitPhase;
  /** When the phase began, and when the chase began. */
  since: number;
  began: number;
  /** Its number, for its ships' ids and how many cruisers. */
  n: number;
  cops: number;
  /** Each cruiser's place along your path. */
  s: number[];
  /** How far they have risen, leaving. */
  lift: number;
  heat: number;
  coolUntil: number;
  /** Seconds out of their sight; seconds the leader has been close. */
  unseen: number;
  close: number;
  /** Where along your path they last saw you. */
  lastSeen: number;
  /** The glow at the screen's edges, 0..1, eased. */
  alert: number;
  caughtAt: number;
  crumbs: Crumbs;
};

export function makePursuit(): Pursuit {
  return {
    phase: 'off',
    since: 0,
    began: 0,
    n: 0,
    cops: 0,
    s: [0, 0, 0],
    lift: 0,
    heat: 0,
    coolUntil: Number.NEGATIVE_INFINITY,
    unseen: 0,
    close: 0,
    lastSeen: 0,
    alert: 0,
    caughtAt: Number.NEGATIVE_INFINITY,
    crumbs: makeCrumbs(),
  };
}

/** No chase, no heat, a fresh path (a new flight). */
export function resetPursuit(P: Pursuit) {
  const n = P.n;
  Object.assign(P, makePursuit(), { n, crumbs: P.crumbs });
  clearCrumbs(P.crumbs);
}

export type LawInput = {
  t: number;
  dt: number;
  /** Whether you are piloting over the city, where the police are (no race, room or space). */
  on: boolean;
  pos: Vec3;
  speed: number;
  /** Shift's double boost held; low in the streets; the side of a wall being scraped (0 none). */
  double: boolean;
  low: boolean;
  wall: number;
  /** Passing a patrol's cruiser close. */
  buzz: boolean;
  /** No heat now (tailing a wanted ship: the boost is the point). */
  calm: boolean;
  /** Whether a cruiser at `from` sees the ship at `to`. */
  sees: (from: Vec3, to: Vec3) => boolean;
};

const tmp: Vec3 = [0, 0, 0];
const tmpF: Vec3 = [0, 0, 0];

function setPhase(P: Pursuit, phase: PursuitPhase, t: number) {
  P.phase = phase;
  P.since = t;
}

/** Whether any cruiser sees the ship, within `reach`. */
function anySees(P: Pursuit, inp: LawInput, reach: number): boolean {
  for (let i = 0; i < P.cops; i++) {
    copAt(P, i, tmp, tmpF);
    const d = Math.hypot(tmp[0] - inp.pos[0], tmp[1] - inp.pos[1], tmp[2] - inp.pos[2]);
    if (d < reach && inp.sees(tmp, inp.pos)) return true;
  }
  return false;
}

/** One frame of the police: the heat, then the chase's phase and its cruisers along your path. */
export function pursuitStep(P: Pursuit, inp: LawInput) {
  const { t, dt } = inp;
  const kept = pushCrumb(P.crumbs, inp.pos);
  const S = crumbHead(P.crumbs);
  // A leap (a portal, a fast trip): they cannot follow.
  if (!kept && (P.phase === 'pursue' || P.phase === 'search' || P.phase === 'caught')) {
    setPhase(P, 'off', t);
    P.coolUntil = t + COOLDOWN;
    P.heat = 0;
  }
  // The edge glow eases toward how hot the chase is.
  const want =
    P.phase === 'pursue'
      ? Math.max(0.15, 1 - P.unseen / HIDE_TIME)
      : P.phase === 'caught'
        ? 1
        : P.phase === 'search'
          ? 0.12 * (1 - smooth((t - P.since) / SEARCH_TIME))
          : 0;
  P.alert += (want - P.alert) * (1 - Math.exp(-(want > P.alert ? 4 : 2) * dt));

  if (P.phase === 'off') {
    const fast = inp.speed > RECKLESS_SPEED;
    if (!inp.on || inp.calm || t < P.coolUntil) {
      P.heat = Math.max(0, P.heat - dt / HEAT_COOL);
      return;
    }
    let warm = 0;
    if (inp.double && inp.low && fast) warm += 1 / HEAT_DOUBLE;
    if (inp.wall !== 0 && fast) warm += 1 / HEAT_SCRAPE;
    P.heat = Math.min(1, Math.max(0, P.heat + (warm > 0 ? warm : -1 / HEAT_COOL) * dt));
    if (inp.buzz && fast) P.heat = 1;
    if (P.heat < 1) return;
    // The police come: up from behind you, along the path you flew.
    P.n++;
    P.cops = 1 + Math.floor(hash(P.n, 1401) * 3);
    const tail = crumbTail(P.crumbs);
    for (let i = 0; i < 3; i++)
      P.s[i] = Math.max(tail, S - COME_FROM - (COP_GAPS[i] as number) - 5 * i);
    P.unseen = 0;
    P.close = 0;
    P.lastSeen = S;
    P.lift = 0;
    P.began = t;
    setPhase(P, 'pursue', t);
    return;
  }
  if (P.phase === 'leave') {
    P.lift += 3 * dt;
    if (t - P.since >= LEAVE_TIME) {
      setPhase(P, 'off', t);
      P.coolUntil = t + COOLDOWN;
      P.heat = 0;
    }
    return;
  }
  if (!inp.on) {
    setPhase(P, 'leave', t);
    return;
  }
  const tail = crumbTail(P.crumbs);
  if (P.phase === 'pursue') {
    // On along your path, no further than where they last saw you, each its gap behind.
    for (let i = 0; i < P.cops; i++) {
      const cap = Math.min(S, P.lastSeen) - (COP_GAPS[i] as number);
      const s = P.s[i] as number;
      P.s[i] = Math.max(tail, s < cap ? Math.min(cap, s + PURSUIT_SPEED * dt) : s);
    }
    if (anySees(P, inp, SIGHT)) {
      P.unseen = 0;
      P.lastSeen = S;
    } else P.unseen += dt;
    copAt(P, 0, tmp, tmpF);
    const lead = Math.hypot(tmp[0] - inp.pos[0], tmp[1] - inp.pos[1], tmp[2] - inp.pos[2]);
    P.close = lead < CATCH_R && P.unseen === 0 ? P.close + dt : Math.max(0, P.close - dt);
    if (P.close >= CATCH_TIME) {
      P.caughtAt = t;
      setPhase(P, 'caught', t);
    } else if (P.unseen >= HIDE_TIME) setPhase(P, 'search', t);
    return;
  }
  if (P.phase === 'search') {
    // Back and forth along your path round where they lost you, each its own way.
    const u = t - P.since;
    for (let i = 0; i < P.cops; i++) {
      const goal = Math.max(
        tail,
        Math.min(S, P.lastSeen - (COP_GAPS[i] as number) + WANDER * Math.sin(0.7 * u + 2.1 * i)),
      );
      const s = P.s[i] as number;
      const step = SEARCH_SPEED * dt;
      P.s[i] = Math.abs(goal - s) <= step ? goal : s + Math.sign(goal - s) * step;
    }
    if (anySees(P, inp, SPOT_AGAIN)) {
      P.unseen = 0;
      P.lastSeen = S;
      setPhase(P, 'pursue', t);
    } else if (u >= SEARCH_TIME) setPhase(P, 'leave', t);
    return;
  }
  // Caught: the flares flash a moment, then they leave.
  if (t - P.since >= CAUGHT_TIME) setPhase(P, 'leave', t);
}

/** Cruiser i of the chase: on your path where it has got to (risen, leaving), into o; its way into f. */
export function copAt(P: Pursuit, i: number, o: Vec3, f: Vec3) {
  crumbAt(P.crumbs, P.s[i] as number, o, f);
  o[1] += P.lift;
}

/** How much of the chase shows: in over a second, out as they leave. */
export function pursuitShows(P: Pursuit, t: number): number {
  if (P.phase === 'off') return 0;
  const k = smooth((t - P.began) / 1);
  return P.phase === 'leave' ? k * (1 - smooth((t - P.since) / LEAVE_TIME)) : k;
}

/** Your pace's share now: a soft slowdown after being caught, easing back. */
export function pursuitDrag(P: Pursuit, t: number): number {
  const u = t - P.caughtAt;
  if (!(u >= 0 && u < DRAG_TIME)) return 1;
  return 1 - (1 - DRAG_LOW) * (1 - smooth(u / DRAG_TIME));
}

/** Whether a patrol's cruiser (a chase between others, lib/city-police.ts) is within BUZZ_R of p. */
export function nearPatrol(p: Vec3, t: number): boolean {
  const c = chaseNow(t, p);
  if (!c) return false;
  for (let i = 0; i < c.cops; i++) {
    cruiserAt(c, i, t, tmp, tmpF);
    if (Math.hypot(tmp[0] - p[0], tmp[1] - p[1], tmp[2] - p[2]) < BUZZ_R) return true;
  }
  return false;
}

/** The chase's cruisers near the eye, for the Ship's renderer; the flares brighter when caught. */
export function pursuitItems(P: Pursuit, eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const k = pursuitShows(P, t);
  if (k <= 0) return;
  const flash =
    P.phase === 'caught'
      ? 1 + 0.35 * Math.sin(Math.PI * Math.min(1, (t - P.since) / CAUGHT_TIME))
      : 1;
  for (let i = 0; i < P.cops; i++) {
    const p: Vec3 = [0, 0, 0];
    const f: Vec3 = [0, 0, 0];
    copAt(P, i, p, f);
    const ex = p[0] - eye[0];
    const ez = p[2] - eye[2];
    const d = Math.max(0, Math.hypot(ex, p[1] - eye[1], ez) - 3);
    if (d > CHASE_SIGHT || ex * fwd[0] + ez * fwd[2] < -6) continue;
    out.push({
      d,
      gid: mixId(P.n, 14011 + i),
      count: CRUISER_SITES,
      weight: 1.6,
      probe: [p],
      site: (s, o) => {
        cruiserSite(p, f, i, s, t, s >= 60 && s < 80 ? k * flash : k, o);
        return true;
      },
    });
  }
}
