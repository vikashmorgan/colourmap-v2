/**
 * Drive, Mars: the picture's moods (docs/specs/drive-game.md, world 8, "Vintage Mars"). Pure.
 *
 * 2026-11-23: "mars gets that vintage feel and there are circles on it. like semi circles of rust
 * with fire when u go through them. and tunnels of semi circles shooting fire that make the game
 * become sepia oldschool black and white beige"; "u gotta find other ones to bring it back to real
 * mars"; "radioactive lakes that give a slight old tv glitch".
 *
 * - The grade: through a tunnel's arch the picture eases to old film (sepia, beige, a soft grain)
 *   over 1.5 s; through an iron arch of the other make it eases back to Mars.
 * - The glitch: near a lake, gentle scan lines and a slow sideways drift, growing with the
 *   radiation (lib/art/mars.ts radiation), eased so it never jumps.
 */

import { crosses } from '@/lib/art/drive';
import { type Arch, ARCHES, archGate } from '@/lib/art/mars-map';

/** Seconds the grade takes to turn all the way. */
export const GRADE_TIME = 1.5;

export interface Grade {
  /** Where it is going (1 old film, 0 Mars) and how far it has gone (0..1). */
  target: 0 | 1;
  amt: number;
}

export function newGrade(): Grade {
  return { target: 0, amt: 0 };
}

/** The arch a move from p to q went through, if any. */
export function archThrough(
  px: number,
  py: number,
  qx: number,
  qy: number,
  arches: readonly Arch[] = ARCHES,
): Arch | null {
  for (const a of arches) {
    if (Math.abs(qx - a.x) > a.r + 60 || Math.abs(qy - a.y) > a.r + 60) continue;
    if (crosses(px, py, qx, qy, archGate(a))) return a;
  }
  return null;
}

/** The grade a moment on: an arch sets where it goes, and it eases there at an even pace. */
export function stepGrade(g: Grade, dt: number, through: Arch | null): Grade {
  let target = g.target;
  if (through?.kind === 'tunnel') target = 1;
  else if (through?.kind === 'real') target = 0;
  const step = dt / GRADE_TIME;
  const amt = target === 1 ? Math.min(1, g.amt + step) : Math.max(0, g.amt - step);
  return { target, amt };
}

/** The grade as the screen uses it: eased at both ends, so it slides in and out. */
export function gradeShown(g: Grade): number {
  const k = g.amt;
  return k * k * (3 - 2 * k);
}

/** How much glitch the radiation gives (never past a gentle 0.6). */
export function glitchOf(radiation: number): number {
  return 0.6 * radiation * radiation;
}
