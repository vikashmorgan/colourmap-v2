/**
 * Gear rings (2026-11-23: "add boost circles visual like speed sound circle wall explosions for
 * each gear u pass bigger and bigger"). Pure: no three.js, no DOM; components/drive/shift-rings.ts
 * draws them.
 *
 * Each time the box shifts up, a ring of light bursts out round the vehicle, across its way, like
 * the shock of breaking the sound barrier, growing outward and fading as it slides back past you.
 * Each gear's ring is bigger and brighter than the last, with more echoes behind it; the top gear's
 * is a full sonic boom: a wall of rings and a cone of light opening back from the nose. Soft and
 * quick: never a flash over the screen.
 */

import { GEARS } from '@/lib/art/drive';

export interface GearRing {
  /** The gear shifted into, and how high it is in the box (0 the second gear, 1 the top). */
  gear: number;
  level: number;
  /** The radius it grows to (m), how long it lives (s) and its brightness (0..1). */
  radius: number;
  life: number;
  bright: number;
  /** Echoes: more rings following it, each a little later and smaller. */
  echoes: number;
  /** The top gear: a sonic boom, a wall of rings and a cone back from the nose. */
  wall: boolean;
}

export const RING = {
  /** The second gear's ring and the top gear's (m). */
  R0: 4.5,
  R1: 22,
  /** A gear's ring rings again only after this long (s), so a speed hovering at a shift never
   * strobes. */
  REARM: 2.5,
  /** How fast a ring slides back past you (m/s). */
  BACK: 9,
  /** The most a ring ever shows (its peak opacity at full brightness). */
  PEAK: 0.55,
} as const;

/** The ring for shifting up into `gear` (of a box of `gears`), or null for the first gear. */
export function gearRing(gear: number, gears: number): GearRing | null {
  if (!Number.isFinite(gear) || gear < 2 || gears < 2) return null;
  const g = Math.min(gear, gears);
  const level = gears > 2 ? (g - 2) / (gears - 2) : 1;
  const wall = g === gears;
  return {
    gear: g,
    level,
    radius: RING.R0 + (RING.R1 - RING.R0) * level ** 1.25,
    life: 0.7 + 0.6 * level,
    bright: 0.35 + 0.65 * level,
    echoes: wall ? 3 : Math.round(level * 2),
    wall,
  };
}

/** The ring for a vehicle's box ('car' six gears, 'ship' five). */
export function ringFor(kind: 'car' | 'ship', gear: number): GearRing | null {
  return gearRing(gear, GEARS[kind].length);
}

/**
 * How a ring is at `age` seconds: its radius now (bursting out fast, then easing to its full
 * size), how far it has slid back (m), and its opacity (up in a moment, fading out to nothing).
 * Null once it is gone. An echo `k` starts 0.08 s × k late, at 85 % per echo of the size.
 */
export function ringAt(
  r: GearRing,
  age: number,
  k = 0,
): { radius: number; back: number; alpha: number } | null {
  const a = age - 0.08 * k;
  if (a < 0) return { radius: 0, back: 0, alpha: 0 };
  const x = a / r.life;
  if (x >= 1) return null;
  const grow = 1 - (1 - x) ** 3;
  const rise = Math.min(1, x / 0.08);
  const fade = (1 - x) ** 2;
  return {
    radius: r.radius * 0.85 ** k * (0.15 + 0.85 * grow),
    back: RING.BACK * a,
    alpha: RING.PEAK * r.bright * rise * fade * 0.8 ** k,
  };
}

/** Watches the box: which gear rang last, and when each gear last rang. */
export interface ShiftWatch {
  gear: number;
  rang: Record<number, number>;
}

export function newShiftWatch(gear = 1): ShiftWatch {
  return { gear, rang: {} };
}

/**
 * The box is in `gear` at time t: returns the gear just shifted up into if it should ring now
 * (an upshift, and that gear has not rung for RING.REARM s), else null. Downshifts never ring.
 */
export function watchShift(w: ShiftWatch, gear: number, t: number): number | null {
  const prev = w.gear;
  w.gear = gear;
  if (gear <= prev || gear < 2) return null;
  const last = w.rang[gear];
  if (last !== undefined && t - last < RING.REARM) return null;
  w.rang[gear] = t;
  return gear;
}
