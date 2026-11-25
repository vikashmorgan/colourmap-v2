/**
 * The lake behind Chinatown Run's start (2026-11-25: "AND WHEN U 180 ON THE START OF CHINATOWN U GO
 * INTO THE LAKE AND HAVE WATER RIPPLES AND RAIN. AND DRIVE THROUGH IT AND HAVE PORTALS OF LIGHT ON
 * THE LAKE AND A WHOLE WATER CITY RACING TRACK UNLOCKS", "BUT IT IS ALL THE SAME WORLD … THE MORE U
 * KNOW THE MORE U DISCOVER. AND ADD A KRAKEN IN THE LAKE. AND SHARKS JUMPING INTO THE AIR AND BACK
 * DOWN"). Pure: no three.js, no DOM.
 *
 * Nobody tells you. Turn round on the grid and drive back past it: the street runs on behind the
 * start, dips down a dark slipway and runs out onto the lake. You skim over the water in the rain
 * (loose grip, spray, rings spreading behind you), the city of Water City lit on the far shore.
 * Seven portals of light stand on the water in a long S toward it; pass through them all in one
 * visit and Water City is found: its track is yours from then on. Sharks breach round the portals;
 * past the third and the fifth a kraken wakes, its tentacles rising round you, two arching over
 * your way, one slamming down where you just were (a near miss nudges you). Drive back up the
 * slipway and you are on Chinatown Run again.
 *
 * Everything is laid out in the road's own coordinates behind its start: s < 0 along the line the
 * street runs back on (straight, its heading at the start), u across it (positive left).
 */

import type { Ground, Hit } from '@/lib/art/vehicle';

/** The slipway: the street runs on back from the start at its width, dipping from FROM to LEN m
 * behind it down to the water (eased at both ends), walled at HALF + WALL either side. */
export const SLIP = { FROM: 30, LEN: 280, HALF: 10, WALL: 1.6 } as const;

/** The lake: its level (m: the lake cities' water), how far back from the start it reaches (m),
 * how far either side (m). The quay runs across at the slipway's foot. */
export const LAKE = { LEVEL: -12.4, BACK: 2700, HALF: 820 } as const;

/** On the water: the share of the road's grip the tyres find (a skim), and a little drag. */
export const WATER = { GRIP: 0.5, DRAG: 0.08 } as const;

/** A body's radius against the lake's edges (m: as the track's walls). */
const BODY = 1;

const smoother = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * k * (k * (6 * k - 15) + 10);
};

/** Whether (s, u) is behind the start, on the slipway or the lake (where the lake's ground is). */
export function behindStart(s: number): boolean {
  return s < 0;
}

/** Whether (s, u) is out on the water (past the slipway's foot). */
export function onLake(s: number, u: number): boolean {
  return s < -SLIP.LEN || (s < 0 && Math.abs(u) > SLIP.HALF + SLIP.WALL);
}

/** The slipway's floor at s (m, from the street's datum at the start down to the lake). */
export function slipHeight(s: number): number {
  return LAKE.LEVEL * smoother((-s - SLIP.FROM) / (SLIP.LEN - SLIP.FROM));
}

/** The ground's height behind the start at (s, u): the slipway, flat across, or the water. */
export function lakeHeight(s: number, u: number): number {
  if (onLake(s, u)) return LAKE.LEVEL;
  return Math.max(LAKE.LEVEL, slipHeight(s));
}

/**
 * The ground behind the start, for the physics. On the slipway: its floor, sloping only along, the
 * street's hold along it (`road`, heading the street's way at the start, `h0`). On the water: level,
 * loose grip, no road to hold you.
 */
export function lakeGround(s: number, u: number, h0: number): Ground {
  const water = onLake(s, u);
  const dS = water ? 0 : (slipHeight(s + 0.5) - slipHeight(s - 0.5)) / 1;
  const c = Math.cos(h0);
  const sn = Math.sin(h0);
  return {
    h: lakeHeight(s, u),
    gx: dS * c,
    gy: dS * sn,
    rough: water ? WATER.DRAG : 0,
    grip: water ? WATER.GRIP : 1,
    water,
    road: water ? undefined : { h: h0, k: 0, u, half: SLIP.HALF },
  };
}

/**
 * What stops you behind the start: the slipway's walls, the quay across its foot either side, and
 * the lake's far edges (all flowed along, as the street's walls). `nx, ny` is the road's left.
 */
export function lakeCollide(s: number, u: number, nx: number, ny: number): Hit | null {
  const flow = (hx: number, hy: number, depth: number): Hit => ({
    nx: hx,
    ny: hy,
    depth,
    loss: 0,
    spin: 0,
    flow: true,
  });
  // Along the road (back toward the start is +s): its unit vector is (ny, -nx).
  const ax = ny;
  const ay = -nx;
  const wall = SLIP.HALF + SLIP.WALL;
  if (s > -SLIP.LEN) {
    // On the slipway between its walls.
    if (Math.abs(u) < wall + 0.5) {
      if (u > wall - BODY) return flow(-nx, -ny, u - (wall - BODY));
      if (u < -(wall - BODY)) return flow(nx, ny, -(wall - BODY) - u);
      return null;
    }
    // Out beside it on the water: the quay holds you off the shore.
    return flow(-ax, -ay, s - (-SLIP.LEN - BODY) + 0);
  }
  if (s < -LAKE.BACK + BODY) return flow(ax, ay, -LAKE.BACK + BODY - s);
  if (u > LAKE.HALF - BODY) return flow(-nx, -ny, u - (LAKE.HALF - BODY));
  if (u < -(LAKE.HALF - BODY)) return flow(nx, ny, -(LAKE.HALF - BODY) - u);
  // The quay's end walls: by the slipway's foot, the water meets the quay's face.
  if (s > -SLIP.LEN - BODY && Math.abs(u) > wall) return flow(-ax, -ay, s - (-SLIP.LEN - BODY));
  return null;
}

/* ── Turning round on the grid ─────────────────────────────── */

/** Whether a racer at s, heading `h` on a road heading `roadH` there, is going back the way the
 * road came (more than 120° off it) behind its start: the secret's first step. */
export function turnedBack(s: number, h: number, roadH: number, moving: number): boolean {
  if (!(s < 0) || moving < 2) return false;
  return Math.cos(h - roadH) < Math.cos((2 * Math.PI) / 3);
}

/* ── The portals of light ──────────────────────────────────── */

/** The portals: [s, u] (m), in a long S out across the lake toward Water City. */
export const PORTALS: readonly (readonly [number, number])[] = Array.from({ length: 7 }, (_, i) => [
  -560 - i * 300,
  Math.round(170 * Math.sin(i * 0.95)),
]);
/** A portal's ring: its radius, its middle's height over the water (its foot just in it). */
export const PORTAL = { R: 7.5, LIFT: 7 } as const;
/** How many portals unlock Water City (all of them, in one visit). */
export const PORTALS_NEEDED = PORTALS.length;

/** Which way portal i faces (rad, in the road's frame: 0 back along the street's line toward
 * the far shore): along the S from the one before to the one after. */
export function portalFacing(i: number): number {
  const a = PORTALS[Math.max(0, i - 1)];
  const b = PORTALS[Math.min(PORTALS.length - 1, i + 1)];
  // Toward more negative s is the way out; in the road frame (s, u) that is the heading π.
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

/** The portal passed moving from (s0, u0) to (s1, u1) at `over` m above the water, or -1. Through
 * means crossing its plane within its width and under its top (either way through it counts). */
export function portalThrough(s0: number, u0: number, s1: number, u1: number, over = 1): number {
  if (Math.hypot(s1 - s0, u1 - u0) > 60) return -1;
  for (let i = 0; i < PORTALS.length; i++) {
    const [ps, pu] = PORTALS[i];
    const f = portalFacing(i);
    const fx = Math.cos(f);
    const fy = Math.sin(f);
    const d0 = (s0 - ps) * fx + (u0 - pu) * fy;
    const d1 = (s1 - ps) * fx + (u1 - pu) * fy;
    if (d0 === d1 || Math.sign(d0) === Math.sign(d1)) continue;
    const k = d0 / (d0 - d1);
    const cs = s0 + (s1 - s0) * k;
    const cu = u0 + (u1 - u0) * k;
    const across = -(cs - ps) * fy + (cu - pu) * fx;
    // Anywhere across its width under its top (skimming the water through its foot counts).
    if (Math.abs(across) <= PORTAL.R && over <= PORTAL.LIFT + PORTAL.R) return i;
  }
  return -1;
}

/** A visit to the lake: which portals you have lit, and whether this visit found Water City. */
export interface LakeRun {
  lit: boolean[];
  found: boolean;
}

export function newLakeRun(): LakeRun {
  return { lit: PORTALS.map(() => false), found: false };
}

/** Lights the portal passed (if any). Water City is found the moment the last is lit. */
export function stepLakeRun(run: LakeRun, passed: number): LakeRun {
  if (passed < 0 || run.lit[passed]) return run;
  const lit = run.lit.map((l, i) => l || i === passed);
  const count = lit.filter(Boolean).length;
  return { lit, found: run.found || count >= PORTALS_NEEDED };
}

/* ── Ripples and rain ──────────────────────────────────────── */

/** Rings spreading from the car on the water: one every STEP m it skims (or every EVERY s while
 * it sits), up to MAX at once, each growing at SPEED m/s and gone after LIFE s. */
export const RIPPLE = { STEP: 5, EVERY: 0.5, MAX: 24, SPEED: 5, LIFE: 3.2 } as const;

export interface Ripple {
  x: number;
  y: number;
  t: number;
  /** How strong (0..1): harder from a fast car, a splash or a slap. */
  k: number;
}

export interface RippleTrail {
  rings: Ripple[];
  /** Where and when the last ring was dropped. */
  x: number;
  y: number;
  t: number;
}

export function newRipples(): RippleTrail {
  return { rings: [], x: Number.NaN, y: Number.NaN, t: -99 };
}

/** Drops a ring where the car is if it has skimmed far enough (or waited long enough) since the
 * last; old rings fade out of the list. */
export function stepRipples(
  r: RippleTrail,
  x: number,
  y: number,
  t: number,
  speed: number,
  wet: boolean,
): RippleTrail {
  let rings = r.rings.filter((q) => t - q.t < RIPPLE.LIFE);
  let { x: lx, y: ly, t: lt } = r;
  const far = !Number.isFinite(lx) || Math.hypot(x - lx, y - ly) >= RIPPLE.STEP;
  if (wet && (far || t - lt >= RIPPLE.EVERY)) {
    rings = [...rings, { x, y, t, k: Math.min(1, 0.35 + speed / 90) }];
    lx = x;
    ly = y;
    lt = t;
  }
  if (rings.length > RIPPLE.MAX) rings = rings.slice(rings.length - RIPPLE.MAX);
  return { rings, x: lx, y: ly, t: lt };
}

/** Adds one ring (a shark's splash, a tentacle's slap). */
export function splashRing(r: RippleTrail, x: number, y: number, t: number, k = 1): RippleTrail {
  const rings = [...r.rings, { x, y, t, k }];
  return { ...r, rings: rings.slice(Math.max(0, rings.length - RIPPLE.MAX)) };
}

/** A ring's radius and its strength at time t (0 once gone). */
export function ringAt(q: Ripple, t: number): { r: number; a: number } {
  const age = t - q.t;
  if (age < 0 || age >= RIPPLE.LIFE) return { r: 0, a: 0 };
  return { r: age * RIPPLE.SPEED, a: q.k * (1 - age / RIPPLE.LIFE) ** 2 };
}

/** The rain over the lake: drops per square metre per second, how fast they fall (m/s), and the
 * dimples they leave (a ring that grows to DIMPLE m in DIMPLE_LIFE s). */
export const RAIN = { RATE: 0.9, FALL: 22, DIMPLE: 0.45, DIMPLE_LIFE: 0.5 } as const;

/* ── Sharks ────────────────────────────────────────────────── */

/** The sharks: each keeps to a spot by a portal and breaches every `every` s, leaping LEAP m along
 * its way and up to HIGH m in an arc over AIR s, then splashing back down. */
export const SHARK = { AIR: 1.5, LEAP: 18, HIGH: 7 } as const;

export interface SharkSpot {
  s: number;
  u: number;
  /** Which way it leaps (rad, road frame), its period and its phase (s). */
  way: number;
  every: number;
  phase: number;
}

export const SHARKS: readonly SharkSpot[] = PORTALS.flatMap(([s, u], i) => [
  { s: s + 60, u: u + 38 + (i % 3) * 9, way: 0.6 + i, every: 6 + (i % 3) * 1.7, phase: i * 1.3 },
  { s: s - 90, u: u - 44 - (i % 2) * 12, way: 2.4 + i, every: 7.5 + (i % 2) * 2.1, phase: i * 2.1 },
]);

export interface SharkPose {
  s: number;
  u: number;
  /** Over the water (m), its heading (road frame) and its nose's pitch (rad, positive up). */
  z: number;
  way: number;
  pitch: number;
}

/** Shark i at time t: in the air on its arc, or null while it is under the water. */
export function sharkAt(i: number, t: number): SharkPose | null {
  const sp = SHARKS[i];
  const p = (((t + sp.phase) % sp.every) + sp.every) % sp.every;
  if (p >= SHARK.AIR) return null;
  const k = p / SHARK.AIR;
  const along = (k - 0.5) * SHARK.LEAP;
  // A parabola from the water up to HIGH and back: its slope gives the pitch.
  const z = SHARK.HIGH * 4 * k * (1 - k);
  const dz = (SHARK.HIGH * 4 * (1 - 2 * k)) / SHARK.LEAP;
  return {
    s: sp.s + Math.cos(sp.way) * along,
    u: sp.u + Math.sin(sp.way) * along,
    z,
    way: sp.way,
    pitch: Math.atan(dz),
  };
}

/** Where sharks broke the water between t0 and t1 (leaping out, splashing back in). */
export function sharkSplashes(t0: number, t1: number): { s: number; u: number; out: boolean }[] {
  const out: { s: number; u: number; out: boolean }[] = [];
  if (!(t1 > t0) || t1 - t0 > 1) return out;
  SHARKS.forEach((sp) => {
    const at = (t: number) => (((t + sp.phase) % sp.every) + sp.every) % sp.every;
    const a = at(t0);
    const b = at(t1);
    const end = (sign: number) => ({
      s: sp.s + Math.cos(sp.way) * sign * (SHARK.LEAP / 2),
      u: sp.u + Math.sin(sp.way) * sign * (SHARK.LEAP / 2),
    });
    if (b < a) out.push({ ...end(-1), out: true });
    if (a < SHARK.AIR && b >= SHARK.AIR) out.push({ ...end(1), out: false });
  });
  return out;
}

/* ── The kraken ────────────────────────────────────────────── */

/** The kraken's lairs: where it sleeps under the S (between the third and fourth portals, the
 * fifth and sixth), and how near you wake it (m). */
export const KRAKEN = {
  LAIRS: [
    [(PORTALS[2][0] + PORTALS[3][0]) / 2, (PORTALS[2][1] + PORTALS[3][1]) / 2],
    [(PORTALS[4][0] + PORTALS[5][0]) / 2, (PORTALS[4][1] + PORTALS[5][1]) / 2],
  ] as readonly (readonly [number, number])[],
  WAKE: 330,
  /** Rising out of the water (s), and back down when you have gone this far past (m). */
  RISE: 2.6,
  SLEEP: 520,
  /** A slam every SLAP s once up (the first after FIRST s), lifted for LIFT s then down in DOWN s,
   * landing where you were LAG s before. Within REACH m of it you are nudged. */
  SLAP: 4.2,
  FIRST: 3.4,
  LIFT: 1.1,
  DOWN: 0.25,
  REACH: 9,
  /** The nudge: across (m/s) and up (m/s). */
  PUSH: 9,
  POP: 3.5,
} as const;

/** A tentacle: where it rises from (lair frame: along the S and across it, m), how tall (m), and
 * which way it leans (rad, lair frame); `arch` +1/-1: one of the pair arching over the way. */
export interface Tentacle {
  a: number;
  b: number;
  tall: number;
  lean: number;
  arch: number;
}

export const TENTACLES: readonly Tentacle[] = [
  // The pair arching over the way, their tips meeting over it.
  { a: 0, b: 24, tall: 30, lean: -Math.PI / 2, arch: 1 },
  { a: 0, b: -24, tall: 30, lean: Math.PI / 2, arch: -1 },
  // Round about, leaning out and swaying.
  { a: 45, b: 38, tall: 24, lean: 0.9, arch: 0 },
  { a: -40, b: 42, tall: 20, lean: 2.4, arch: 0 },
  { a: 55, b: -36, tall: 22, lean: -0.8, arch: 0 },
  { a: -52, b: -40, tall: 26, lean: -2.3, arch: 0 },
  // The one that slams.
  { a: -20, b: 30, tall: 28, lean: 0, arch: 0 },
];
/** The slamming tentacle's index. */
export const SLAMMER = TENTACLES.length - 1;

/** How far out of the water the kraken of a lair has risen (0 asleep, 1 up), `since` s after it
 * woke, with you `past` m beyond it along the S (negative before it). */
export function krakenRise(since: number, past: number): number {
  if (!(since >= 0)) return 0;
  const up = smoother(since / KRAKEN.RISE);
  const down = 1 - smoother((past - KRAKEN.SLEEP) / 200);
  return up * down;
}

/** Whether you wake lair l at (s, u). */
export function wakes(l: number, s: number, u: number): boolean {
  const [ls, lu] = KRAKEN.LAIRS[l];
  return Math.hypot(s - ls, u - lu) < KRAKEN.WAKE;
}

/** The slam `since` s after the kraken woke: its phase (0 resting, rising to 1 lifted, then the
 * strike), and whether it lands in this very moment (between since0 and since). */
export function slamPhase(since: number): { lift: number; strike: boolean; n: number } {
  if (!(since >= KRAKEN.FIRST)) return { lift: 0, strike: false, n: -1 };
  const x = since - KRAKEN.FIRST;
  const n = Math.floor(x / KRAKEN.SLAP);
  const p = x - n * KRAKEN.SLAP;
  if (p < KRAKEN.LIFT) return { lift: smoother(p / KRAKEN.LIFT), strike: false, n };
  if (p < KRAKEN.LIFT + KRAKEN.DOWN)
    return { lift: 1 - (p - KRAKEN.LIFT) / KRAKEN.DOWN, strike: false, n };
  return { lift: 0, strike: p < KRAKEN.LIFT + KRAKEN.DOWN + 0.05, n };
}

/** Whether a slam lands between since0 and since1 (once per slam). */
export function slamLands(since0: number, since1: number): boolean {
  if (!(since1 > since0) || since1 < KRAKEN.FIRST) return false;
  const at = (x: number) => x - KRAKEN.FIRST - KRAKEN.LIFT - KRAKEN.DOWN;
  const a = at(since0);
  const b = at(since1);
  return Math.floor(b / KRAKEN.SLAP) > Math.floor(a / KRAKEN.SLAP) || (a < 0 && b >= 0);
}

/** The nudge a slam landing at (sx, sy) gives a car at (x, y) (world m/s, and up), or null out of
 * its reach: away from where it hit, stronger the nearer. */
export function slamPush(
  sx: number,
  sy: number,
  x: number,
  y: number,
): { vx: number; vy: number; vz: number } | null {
  const d = Math.hypot(x - sx, y - sy);
  if (d > KRAKEN.REACH) return null;
  const k = 1 - d / KRAKEN.REACH;
  const nx = d > 1e-3 ? (x - sx) / d : 1;
  const ny = d > 1e-3 ? (y - sy) / d : 0;
  return { vx: nx * KRAKEN.PUSH * k, vy: ny * KRAKEN.PUSH * k, vz: KRAKEN.POP * k };
}

/** The lair frame at lair l: along the S there (from the portal before to the one after) and its
 * middle, so tentacle (a, b) stands at road (s, u). */
export function lairPoint(l: number, a: number, b: number): { s: number; u: number; way: number } {
  const i = l === 0 ? 2 : 4;
  const p = PORTALS[i];
  const q = PORTALS[i + 1];
  const way = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const [ls, lu] = KRAKEN.LAIRS[l];
  return {
    s: ls + Math.cos(way) * a - Math.sin(way) * b,
    u: lu + Math.sin(way) * a + Math.cos(way) * b,
    way,
  };
}

/**
 * Tentacle j of lair l as a line of points from its root up to its tip (road s, u and height over
 * the water), `rise` out of the water, at time t (its sway), `lift` the slammer's raise (0..1) and
 * `strike` its fall toward (ts, tu). n points.
 */
export function tentaclePoints(
  l: number,
  j: number,
  rise: number,
  t: number,
  n: number,
  slam?: { lift: number; ts: number; tu: number; down: number },
): { s: number; u: number; z: number }[] {
  const tc = TENTACLES[j];
  const root = lairPoint(l, tc.a, tc.b);
  const out: { s: number; u: number; z: number }[] = [];
  const tall = tc.tall * rise;
  const sway = 0.25 * Math.sin(t * 0.9 + j * 1.7 + l);
  const lean = root.way + tc.lean;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    let s: number;
    let u: number;
    let z: number;
    if (tc.arch !== 0) {
      // Up and over: a half arch from the root to over the way's middle (the pair meet there).
      const ang = (k * Math.PI) / 2;
      const reach = Math.abs(tc.b) * (1 - Math.cos(ang)) * (0.92 + 0.08 * Math.sin(t * 0.7 + l));
      s = root.s + Math.cos(lean) * reach;
      u = root.u + Math.sin(lean) * reach;
      z = tall * Math.sin(ang) + Math.sin(t * 1.3 + k * 5 + j) * 0.6 * k;
    } else {
      // A tentacle curling: up, bending over toward its lean, swaying at its tip.
      const bend = (0.35 + sway) * k * k;
      s = root.s + Math.cos(lean) * tall * bend;
      u = root.u + Math.sin(lean) * tall * bend;
      z = tall * (k - 0.3 * k * k * k);
    }
    if (j === SLAMMER && slam) {
      // Lifted high, then whipped down across toward where it strikes.
      const up = slam.lift * 10 * k;
      const w = slam.down * k * k;
      s += (slam.ts - s) * w;
      u += (slam.tu - u) * w;
      z = z * (1 - slam.down * k) + up;
    }
    out.push({ s, u, z: Math.max(0, z) });
  }
  return out;
}

/** How the slammer is posed `since` s after the kraken woke: `lift` raised over its root (0..1),
 * `down` whipped down onto its strike (0..1, held a moment after it lands, then drawn back). */
export function slamPose(since: number): { lift: number; down: number } {
  if (!(since >= KRAKEN.FIRST)) return { lift: 0, down: 0 };
  const x = since - KRAKEN.FIRST;
  const p = x - Math.floor(x / KRAKEN.SLAP) * KRAKEN.SLAP;
  if (p < KRAKEN.LIFT) return { lift: smoother(p / KRAKEN.LIFT), down: 0 };
  const q = p - KRAKEN.LIFT;
  if (q < KRAKEN.DOWN) return { lift: 1 - q / KRAKEN.DOWN, down: q / KRAKEN.DOWN };
  return { lift: 0, down: 1 - smoother((q - KRAKEN.DOWN) / 0.9) };
}

/** Where the slam lands: where you were LAG s before it (so it strikes behind a car that keeps
 * going, and onto one that dawdles). */
export const SLAM_LAG = 0.9;
