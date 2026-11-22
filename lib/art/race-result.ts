/**
 * Drive: a finished race's results (docs/specs/drive-menus.md, "Results"): your time against your
 * best, and everyone's places, leader first. Pure.
 */

import { formatTime } from '@/lib/art/drive';

export interface Standing {
  name: string;
  colour: string;
  you: boolean;
}

export interface RaceResult {
  time: string;
  best: string | null;
  record: boolean;
  /** Your place (1 = won), or null racing alone. */
  place: number | null;
  standings: Standing[];
}

export interface Racer {
  name: string;
  colour: string;
  /** How far along the road (m): farther is ahead. */
  s: number;
}

export function raceResult(
  run: { time: number; best: number | null; record: boolean },
  you: Racer,
  rivals: readonly Racer[],
): RaceResult {
  const all = [{ ...you, you: true }, ...rivals.map((r) => ({ ...r, you: false }))];
  // Ahead first; on a tie you keep the better place (you crossed the line this frame).
  all.sort((a, b) => b.s - a.s || Number(b.you) - Number(a.you));
  return {
    time: formatTime(run.time),
    best: run.best !== null ? formatTime(run.best) : null,
    record: run.record,
    place: rivals.length ? all.findIndex((r) => r.you) + 1 : null,
    standings: all.map(({ name, colour, you: y }) => ({ name, colour, you: y })),
  };
}

/** "1st", "2nd", "3rd", "4th"… */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}
