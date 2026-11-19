/**
 * Drive: the racing game's shared pieces (docs/specs/drive-game.md). Pure: no three.js, no DOM.
 *
 * - Controls, read from the keys held (the City game's convention: arrows or WASD, Space boosts,
 *   Shift is a double boost) or from touches (hold the left or right of the screen to steer; any
 *   touch drives, two fingers boost).
 * - The chase camera's lag: angles and lengths eased toward their target, frame-rate independent.
 * - Timed runs through gates: a run starts as you cross the start gate and ends at the finish; the
 *   best is kept.
 */

export const TAU = Math.PI * 2;

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** The angle a, brought into -π..π. */
export function wrapAngle(a: number): number {
  return a - TAU * Math.floor((a + Math.PI) / TAU);
}

/* ── Controls ──────────────────────────────────────────────── */

export interface Controls {
  /** -1 (brake / reverse) .. 1 (full throttle). */
  throttle: number;
  /** -1 (right) .. 1 (left): positive turns counter-clockwise, as angles do. */
  steer: number;
  /** 0 none, 1 boost (Space), 2 double boost (Shift). */
  boost: 0 | 1 | 2;
  /** The handbrake (F, or the Handbrake button): held while turning, the tail lets go to drift. */
  handbrake?: boolean;
  /** Climbing (1) or diving (-1): Sky Canyon's free flight, the ship only. */
  climb?: number;
  /** The driving mode (lib/art/vehicle.ts MODES); Flow when not given. */
  mode?: 'easy' | 'flow' | 'drift' | 'grip';
}

export const NO_CONTROLS: Controls = { throttle: 0, steer: 0, boost: 0 };

/** The keys the game claims, so the page never scrolls or tabs away under them. */
export const DRIVE_KEYS = [
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'w',
  'a',
  's',
  'd',
  ' ',
  'shift',
  'f',
  'e',
  'q',
];

/** Controls from the keys held, lower-cased as KeyboardEvent.key gives them. */
export function controlsFromKeys(keys: ReadonlySet<string>): Controls {
  const held = (...names: string[]) => names.some((n) => keys.has(n));
  const up = held('w', 'arrowup');
  const down = held('s', 'arrowdown');
  const left = held('a', 'arrowleft');
  const right = held('d', 'arrowright');
  const boost: 0 | 1 | 2 = held('shift') ? 2 : held(' ') ? 1 : 0;
  return {
    throttle: (up ? 1 : 0) - (down ? 1 : 0),
    steer: (left ? 1 : 0) - (right ? 1 : 0),
    boost,
    handbrake: held('f'),
  };
}

/**
 * Sky Canyon flies as the City of Dreams does (2026-11-19: "you can use the mechanics of the city of
 * dreams"): the ship always cruises forward; A D or ← → turn, W S or ↑ ↓ climb and dive, E faster,
 * Q slower, Space boosts, Shift double boosts, F the handbrake.
 */
export function flightFromKeys(keys: ReadonlySet<string>): Controls {
  const held = (...names: string[]) => names.some((n) => keys.has(n));
  const left = held('a', 'arrowleft');
  const right = held('d', 'arrowright');
  const boost: 0 | 1 | 2 = held('shift') ? 2 : held(' ', 'e') ? 1 : 0;
  return {
    throttle: held('q') ? -0.4 : 1,
    steer: (left ? 1 : 0) - (right ? 1 : 0),
    boost,
    handbrake: held('f'),
    climb: (held('w', 'arrowup') ? 1 : 0) - (held('s', 'arrowdown') ? 1 : 0),
  };
}

/**
 * Controls from touches, given as x across the screen (0 left .. 1 right). Any touch drives; the
 * outer thirds steer, more the further out; two fingers or more boost.
 */
export function controlsFromTouches(xs: readonly number[]): Controls {
  if (xs.length === 0) return NO_CONTROLS;
  let steer = 0;
  for (const x of xs) {
    if (x < 1 / 3) steer += clamp((1 / 3 - x) * 4.5, 0.45, 1);
    else if (x > 2 / 3) steer -= clamp((x - 2 / 3) * 4.5, 0.45, 1);
  }
  const steering = xs.filter((x) => x < 1 / 3 || x > 2 / 3).length;
  // Two thumbs on both edges just steer (and cancel); a finger more in the middle boosts, three
  // fingers double boost.
  const boost: 0 | 1 | 2 = xs.length >= 3 ? 2 : xs.length === 2 && steering < 2 ? 1 : 0;
  return { throttle: 1, steer: clamp(steer, -1, 1), boost };
}

/** Combines the keys and touches: whichever asks for more wins on each axis. */
export function mergeControls(a: Controls, b: Controls): Controls {
  const pick = (x: number, y: number) => (Math.abs(x) >= Math.abs(y) ? x : y);
  return {
    throttle: pick(a.throttle, b.throttle),
    steer: pick(a.steer, b.steer),
    boost: Math.max(a.boost, b.boost) as 0 | 1 | 2,
    handbrake: !!(a.handbrake || b.handbrake),
    ...(a.climb !== undefined || b.climb !== undefined
      ? { climb: pick(a.climb ?? 0, b.climb ?? 0) }
      : {}),
  };
}

/** How the boost lifts the top speed and the pull: Space a quarter more, Shift half again. */
export function boostOf(level: 0 | 1 | 2): { top: number; pull: number } {
  return level === 2
    ? { top: 1.5, pull: 2.3 }
    : level === 1
      ? { top: 1.25, pull: 1.6 }
      : { top: 1, pull: 1 };
}

/* ── Easing for the chase camera and the body ──────────────── */

/** Eases a toward b at `rate` per second (1 - e^(-rate dt) of the gap each frame). */
export function ease(a: number, b: number, rate: number, dt: number): number {
  return a + (b - a) * (1 - Math.exp(-rate * dt));
}

/** Eases an angle toward another the short way round. */
export function easeAngle(a: number, b: number, rate: number, dt: number): number {
  return a + wrapAngle(b - a) * (1 - Math.exp(-rate * dt));
}

/**
 * Field of view and shake from speed (m/s against a top speed): the view widens as speed builds,
 * and a soft, slow tremor (a few hertz, never strobing) grows with the square of the speed.
 * `focal` is the screen's focal length in view heights (lib/art/speed.ts `feel`, the same curve).
 */
export function speedFeel(
  speed: number,
  top: number,
  time: number,
): { focal: number; fov: number; shakeX: number; shakeY: number } {
  const n = clamp(Math.abs(speed) / top, 0, 1.4);
  const focal = 1.5 - 0.32 * n;
  const fov = (2 * Math.atan(0.5 / focal) * 180) / Math.PI;
  const amp = 0.003 * n * n;
  const shakeX = amp * (Math.sin(time * 7.1) * 0.6 + Math.sin(time * 12.7 + 1.3) * 0.4);
  const shakeY = amp * (Math.sin(time * 9.3 + 0.7) * 0.6 + Math.sin(time * 15.1 + 2.1) * 0.4);
  return { focal, fov, shakeX, shakeY };
}

/** m/s to the km/h the corner shows. */
export function kmh(speed: number): number {
  return Math.round(Math.abs(speed) * 3.6);
}

/* ── Gates and timed runs ──────────────────────────────────── */

/** A gate: a line across the way from (ax, ay) to (bx, by). */
export interface Gate {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Whether the move from p to q crosses the gate's line (either way through). */
export function crosses(px: number, py: number, qx: number, qy: number, g: Gate): boolean {
  const side = (x: number, y: number) => (g.bx - g.ax) * (y - g.ay) - (g.by - g.ay) * (x - g.ax);
  const s1 = side(px, py);
  const s2 = side(qx, qy);
  if (s1 === s2 || (s1 > 0 && s2 > 0) || (s1 < 0 && s2 < 0)) return false;
  // And the move passes between the two posts.
  const t1 = (qx - px) * (g.ay - py) - (qy - py) * (g.ax - px);
  const t2 = (qx - px) * (g.by - py) - (qy - py) * (g.bx - px);
  return (t1 >= 0 && t2 <= 0) || (t1 <= 0 && t2 >= 0);
}

export interface Run {
  /** When the current run started (game seconds), or null between runs. */
  start: number | null;
  /** The last finished run's time, seconds. */
  last: number | null;
  /** The best time so far. */
  best: number | null;
  /** Whether the last finished run set the best. */
  record: boolean;
}

export function newRun(best: number | null = null): Run {
  return { start: null, last: null, best, record: false };
}

/**
 * One step of a timed run: crossing `start` starts the clock (again, if a run was on), crossing
 * `finish` with the clock running stops it and keeps the best. Returns a new Run.
 */
export function stepRun(
  run: Run,
  start: Gate,
  finish: Gate,
  px: number,
  py: number,
  qx: number,
  qy: number,
  t: number,
): Run {
  if (run.start !== null && crosses(px, py, qx, qy, finish)) {
    const time = t - run.start;
    const record = run.best === null || time < run.best;
    return { start: null, last: time, best: record ? time : run.best, record };
  }
  if (crosses(px, py, qx, qy, start)) return { ...run, start: t, record: false };
  return run;
}

/** A time as m:ss.cc, or ss.cc under a minute. */
export function formatTime(s: number): string {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const rest = t - m * 60;
  const sec = rest.toFixed(2).padStart(5, '0');
  return m > 0 ? `${m}:${sec}` : rest.toFixed(2);
}

/* ── Trails ────────────────────────────────────────────────── */

/** A fading trail: points dropped every `spacing` metres, each remembering when. */
export interface Trail {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  /** When each point was dropped, and how strongly it marks (0..1). */
  t: Float64Array;
  w: Float32Array;
  /** Index of the newest point; points run backwards from it. */
  head: number;
  count: number;
  spacing: number;
}

export function makeTrail(n: number, spacing: number): Trail {
  return {
    x: new Float64Array(n),
    y: new Float64Array(n),
    z: new Float64Array(n),
    t: new Float64Array(n),
    w: new Float32Array(n),
    head: -1,
    count: 0,
    spacing,
  };
}

/**
 * Adds a point if the trail's head is at least `spacing` away; otherwise moves the head with it, so
 * the ribbon always reaches the source. A gap (more than 20 spacings, as after a reset) starts the
 * trail over.
 */
export function pushTrail(tr: Trail, x: number, y: number, z: number, t: number, w: number): void {
  const n = tr.x.length;
  if (tr.count > 0) {
    const h = tr.head;
    const d = Math.hypot(x - tr.x[h], y - tr.y[h]);
    if (d > tr.spacing * 20) tr.count = 0;
    else if (d < tr.spacing && tr.count > 1) {
      tr.x[h] = x;
      tr.y[h] = y;
      tr.z[h] = z;
      tr.t[h] = t;
      tr.w[h] = Math.max(tr.w[h], w);
      return;
    }
  }
  tr.head = (tr.head + 1) % n;
  tr.x[tr.head] = x;
  tr.y[tr.head] = y;
  tr.z[tr.head] = z;
  tr.t[tr.head] = t;
  tr.w[tr.head] = w;
  tr.count = Math.min(n, tr.count + 1);
}

/** The i-th newest point's index (0 = head). */
export function trailIndex(tr: Trail, i: number): number {
  const n = tr.x.length;
  return (((tr.head - i) % n) + n) % n;
}

/** How visible a mark of age `age` seconds still is: full for a moment, then fading out by `life`. */
export function trailFade(age: number, life: number): number {
  if (age <= 0) return 1;
  if (age >= life) return 0;
  const k = age / life;
  return (1 - k) * (1 - k);
}

/* ── Gears, speed flames and the dials ─────────────────────── */

/**
 * Gears (2026-11-19: "different gear speeds on the cars and spaceship, so you have another counter
 * on the cockpit instrument for gear 1, 2, 3, 4 …"): an automatic box. Each gear ends at a share of
 * the vehicle's top speed; the last runs on through the boosts.
 */
export const GEARS: Record<'car' | 'ship', readonly number[]> = {
  car: [0.21, 0.36, 0.51, 0.66, 0.83, Number.POSITIVE_INFINITY],
  ship: [0.25, 0.45, 0.65, 0.85, Number.POSITIVE_INFINITY],
};

/** The gear (1..n) at a speed, and how far through it (0 at its start, 1 at its shift): the revs. */
export function gearOf(
  kind: 'car' | 'ship',
  speed: number,
  top: number,
): { gear: number; revs: number } {
  const ends = GEARS[kind];
  const n = clamp(Math.abs(speed) / top, 0, 10);
  let lo = 0;
  for (let i = 0; i < ends.length; i++) {
    if (n < ends[i]) {
      const hi = Number.isFinite(ends[i]) ? ends[i] : 1.5;
      return { gear: i + 1, revs: clamp((n - lo) / (hi - lo), 0, 1) };
    }
    lo = ends[i];
  }
  return { gear: ends.length, revs: 1 };
}

/** The pull through a gear: strongest low in its range, easing toward the shift (averages 1). */
export function gearPull(revs: number): number {
  return 1.12 - 0.24 * revs;
}

/**
 * Speed flames (2026-11-19: "a mode where flames come out when you are at high speed"): nothing
 * below 72% of the top speed, then rising to full at the top.
 */
export function speedFlame(speed: number, top: number): number {
  return clamp((Math.abs(speed) / top - 0.72) / 0.28, 0, 1);
}

/** The dials read up to this (km/h): past the car's double boost. */
export const DIAL_MAX = 420;
