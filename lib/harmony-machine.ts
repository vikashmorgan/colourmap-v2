/**
 * Harmony Machine: the pure music logic behind the ringed planet.
 * Rings turn; each light on a ring sings when it passes the golden needle.
 * See docs/specs/harmony-machine.md.
 */

export const TAU = Math.PI * 2;

/** Ring-local angle that faces the viewer, where the needle sits. */
export const NEEDLE = -Math.PI / 2;

/** Wrap an angle into (-π, π]. */
export function wrapAngle(a: number): number {
  return ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}

/** True when a light moved across `target` between two frames, in either direction. */
export function crossed(prev: number, next: number, target = NEEDLE): boolean {
  const d0 = wrapAngle(prev - target);
  const d1 = wrapAngle(next - target);
  return d0 !== d1 && Math.sign(d0) !== Math.sign(d1) && Math.abs(d0 - d1) < Math.PI;
}

/** MIDI note number to frequency in Hz. */
export function mtof(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

export type Chord = { name: string; notes: number[] };
export type Progression = { name: 'dusk' | 'day' | 'dawn'; chords: Chord[] };

/** Three colours of harmony along the dusk to dawn gradient, each a loop of four chords. */
export const PROGRESSIONS: Progression[] = [
  {
    name: 'dusk',
    chords: [
      { name: 'Am9', notes: [45, 57, 60, 64, 67, 71] },
      { name: 'Fmaj7', notes: [41, 53, 57, 60, 64] },
      { name: 'Cmaj7', notes: [48, 55, 59, 64] },
      { name: 'Em7', notes: [40, 52, 55, 59, 62] },
    ],
  },
  {
    name: 'day',
    chords: [
      { name: 'Dmaj9', notes: [38, 50, 54, 57, 61, 64] },
      { name: 'Bm7', notes: [47, 50, 54, 57, 62] },
      { name: 'Gmaj7', notes: [43, 55, 59, 62, 66] },
      { name: 'Aadd9', notes: [45, 52, 57, 59, 61] },
    ],
  },
  {
    name: 'dawn',
    chords: [
      { name: 'Cmaj7#11', notes: [36, 48, 55, 59, 64, 66] },
      { name: 'D/C', notes: [36, 50, 54, 57, 62] },
      { name: 'Bm7', notes: [35, 50, 54, 57, 62] },
      { name: 'Em9', notes: [40, 52, 55, 59, 62, 66] },
    ],
  },
];

/** The progression for a colour between 0 (dusk) and 1 (dawn). */
export function progressionFor(colour: number): Progression {
  const c = Math.min(1, Math.max(0, colour));
  return PROGRESSIONS[Math.min(2, Math.floor(c * 3))];
}

/** Chord tones folded into the singing range (MIDI 62 to 86), low to high. */
export function melodyPool(notes: number[]): number[] {
  const pcs = new Set(notes.map((n) => ((n % 12) + 12) % 12));
  const pool: number[] = [];
  for (let m = 62; m <= 86; m++) if (pcs.has(m % 12)) pool.push(m);
  return pool;
}

/** The note a light sings: picked from the pool by light, ring and chord, shifted by the ring's octave. */
export function ringNote(
  pool: number[],
  light: number,
  ring: number,
  chordIdx: number,
  octave: number,
): number | null {
  if (!pool.length) return null;
  const m = pool[(light * 2 + ring + chordIdx) % pool.length] + octave;
  return octave < 0 ? Math.max(43, m) : m;
}

/** Where along the three palettes a colour sits: palette index and blend toward the next. */
export function paletteBlend(colour: number): { index: 0 | 1; t: number } {
  const x = Math.min(1.999, Math.max(0, colour * 2));
  const index = Math.floor(x) as 0 | 1;
  return { index, t: x - index };
}
