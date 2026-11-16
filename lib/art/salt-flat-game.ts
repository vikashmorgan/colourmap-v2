/**
 * Drive, world 1: the Salt Flat (docs/specs/drive-game.md). The pure half: the course (a long
 * painted line, a measured mile between two gates, marker poles), sparse stakes scattered over the
 * endless flat, the far mesas and the sun, and the red streak that crosses the flat now and then.
 * The car itself runs on lib/art/vehicle.ts. No three.js, no DOM.
 *
 * World: x east, y north, metres; headings are counter-clockwise from +x.
 */

import { type Gate, wrapAngle } from '@/lib/art/drive';

/** Where the car starts: just south of the course, facing north up the line. */
export const START = { x: 6, y: -70, h: Math.PI / 2 };

/* ── The course ────────────────────────────────────────────── */

/** A measured mile, as on the salt flats where speed records are run. */
export const MILE = 1609.344;
/** The painted line: north along x = 0. */
export const LINE = { x: 0, y0: -400, y1: 4800 };
export const START_Y = 300;
export const FINISH_Y = START_Y + MILE;
const GATE_HALF = 22;
const GATE_X = 5;
export const START_GATE: Gate = {
  ax: GATE_X - GATE_HALF,
  ay: START_Y,
  bx: GATE_X + GATE_HALF,
  by: START_Y,
};
export const FINISH_GATE: Gate = {
  ax: GATE_X - GATE_HALF,
  ay: FINISH_Y,
  bx: GATE_X + GATE_HALF,
  by: FINISH_Y,
};

export type PoleKind = 0 | 1 | 2 | 3;
/** 0 a survey stake, 1 a mile marker, 2 a start-gate post, 3 a finish-gate post. */
export interface Pole {
  x: number;
  y: number;
  height: number;
  kind: PoleKind;
}

/** The course's own poles: tenth-mile markers along the line, two posts at each gate. */
export const COURSE_POLES: Pole[] = (() => {
  const out: Pole[] = [];
  for (let i = 0; i <= 10; i++)
    out.push({ x: -3, y: START_Y + (MILE * i) / 10, height: 1.5, kind: 1 });
  for (const [g, kind] of [
    [START_GATE, 2],
    [FINISH_GATE, 3],
  ] as const) {
    out.push({ x: g.ax, y: g.ay, height: 4.5, kind });
    out.push({ x: g.bx, y: g.by, height: 4.5, kind });
  }
  return out;
})();

function hash2(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Cells the stakes are scattered in (m); about one cell in four holds one. */
export const STAKE_CELL = 520;

/** The lone stake in a cell, if it has one; never on the course itself. */
export function stakeIn(i: number, j: number): Pole | null {
  if (hash2(i, j, 1) > 0.28) return null;
  const x = (i + 0.15 + 0.7 * hash2(i, j, 2)) * STAKE_CELL;
  const y = (j + 0.15 + 0.7 * hash2(i, j, 3)) * STAKE_CELL;
  if (Math.abs(x - GATE_X) < 60 && y > LINE.y0 && y < LINE.y1) return null;
  return { x, y, height: 1.1 + 1.3 * hash2(i, j, 4), kind: 0 };
}

/** Farthest a stake is drawn (m). */
export const POLE_REACH = 2600;
export const MAX_STAKES = 48;

/** The stakes within reach of a point, nearest first, at most MAX_STAKES. */
export function stakesNear(x: number, y: number): Pole[] {
  const out: { p: Pole; d: number }[] = [];
  const ci = Math.floor(x / STAKE_CELL);
  const cj = Math.floor(y / STAKE_CELL);
  const r = Math.ceil(POLE_REACH / STAKE_CELL);
  for (let i = ci - r; i <= ci + r; i++) {
    for (let j = cj - r; j <= cj + r; j++) {
      const p = stakeIn(i, j);
      if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < POLE_REACH) out.push({ p, d });
    }
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, MAX_STAKES).map((o) => o.p);
}

/* ── The horizon ───────────────────────────────────────────── */

/** Where the low sun stands: just right of the way the car first faces. */
export const SUN_AZ = START.h - 0.146;

/** The sun's place across the screen and whether it is in front at all. */
export function sunOnScreen(yaw: number, focal: number): { sx: number; seen: number } {
  const rel = wrapAngle(yaw - SUN_AZ);
  if (Math.abs(rel) > 1.3) return { sx: 0, seen: 0 };
  return { sx: focal * Math.tan(rel), seen: 1 };
}

/** Far mesas round the horizon: azimuth, half-width (radians) and height (view heights at f 1.5). */
export const MESAS: { az: number; half: number; height: number }[] = [
  { az: START.h + 0.42, half: 0.09, height: 0.034 },
  { az: START.h + 0.58, half: 0.035, height: 0.026 },
  { az: START.h - 0.95, half: 0.12, height: 0.03 },
  { az: START.h + 2.4, half: 0.16, height: 0.038 },
  { az: START.h - 2.2, half: 0.07, height: 0.028 },
];

/* ── The streak ────────────────────────────────────────────── */

/**
 * The red streak from the Salt Flat piece: now and then a light crosses the flat 420 m out, 2.6 km
 * in 26 s, then a pause; each crossing is laid out in the world in front of wherever the camera
 * looks when it begins, so turning away leaves it behind.
 */
export const STREAK = { cycle: 30, run: 26, span: 2600, out: 420, height: 0.7, tail: 160 };

export interface Streak {
  t0: number;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
}

export function newStreak(cam: { x: number; y: number; yaw: number }, t: number, side = 1): Streak {
  const fx = Math.cos(cam.yaw);
  const fy = Math.sin(cam.yaw);
  // Across the view, left to right (side 1) or back (side -1).
  const dx = fy * side;
  const dy = -fx * side;
  const cx = cam.x + fx * STREAK.out;
  const cy = cam.y + fy * STREAK.out;
  return {
    t0: t,
    ox: cx - dx * (STREAK.span / 2),
    oy: cy - dy * (STREAK.span / 2),
    dx,
    dy,
  };
}

/** Whether a new crossing is due. */
export function streakDue(s: Streak, t: number): boolean {
  return t - s.t0 >= STREAK.cycle;
}

/** The streak's head and tail at time t (null between crossings). */
export function streakAt(
  s: Streak,
  t: number,
): { hx: number; hy: number; tx: number; ty: number } | null {
  const k = (t - s.t0) / STREAK.run;
  if (k < 0 || k > 1) return null;
  const d = STREAK.span * k;
  const tail = Math.max(0, d - STREAK.tail);
  return {
    hx: s.ox + s.dx * d,
    hy: s.oy + s.dy * d,
    tx: s.ox + s.dx * tail,
    ty: s.oy + s.dy * tail,
  };
}

/** A world period for the shader's textures: the salt repeats every 2,048 m each way. */
export const SALT_PERIOD = 2048;

export function wrapPeriod(v: number): number {
  return ((v % SALT_PERIOD) + SALT_PERIOD) % SALT_PERIOD;
}
