/**
 * Chill beats — the six core loops and the pure performance transforms
 * (fill, mute kick, bass-to-scale). Data only; the sound lives in
 * beat-engine.ts. Spec: docs/specs/chill-machine-public.md → Beats.
 */

import { STEPS_PER_BAR } from '@/lib/chill/transport';

export type BeatRow = 'kick' | 'clap' | 'closedHat' | 'openHat' | 'perc' | 'bass';

export const BEAT_ROWS: readonly BeatRow[] = [
  'kick',
  'clap',
  'closedHat',
  'openHat',
  'perc',
  'bass',
];

export const BEAT_ROW_LABELS: Record<BeatRow, string> = {
  kick: 'Kick',
  clap: 'Clap',
  closedHat: 'Closed hat',
  openHat: 'Open hat',
  perc: 'Perc',
  bass: 'Bass',
};

export type BeatPattern = {
  bars: 1 | 2 | 4;
  /** Velocity 0..1 per 16th; each row is bars × 16 long. 0 = silent. */
  steps: Record<BeatRow, number[]>;
  /** Semitone offset from the root per step (null = no note). */
  bassNotes: (number | null)[];
};

/** Which voice plays each row — the loop's sound colour. */
export type BeatKit = {
  kick: 'deep' | 'dry' | 'soft' | 'warm' | 'driving';
  closedHat: 'hat' | 'click' | 'shaker' | 'tambourine';
  openHat: 'open' | 'ride';
  perc: 'shaker' | 'rim' | 'conga' | 'marimba' | 'afro';
  bass: 'saw' | 'sub' | 'pluck' | 'rumble';
  /** Marimba pitches per step (semitones above the root, two octaves up). */
  percNotes?: number[];
};

export type BeatLoop = {
  id: string;
  label: string;
  bpm: number;
  /** 0–0.6, same unit as the transport swing. */
  swing: number;
  description: string;
  kit: BeatKit;
  pattern: BeatPattern;
};

const _ = null;

function bar(steps: Record<BeatRow, number[]>, bassNotes: (number | null)[]): BeatPattern {
  return { bars: 1, steps, bassNotes };
}

export const CORE_LOOPS: readonly BeatLoop[] = [
  {
    id: 'melodic',
    label: 'Melodic',
    bpm: 120,
    swing: 0,
    description: 'Rolling kick, offbeat open hat, hypnotic bassline',
    kit: { kick: 'deep', closedHat: 'hat', openHat: 'open', perc: 'shaker', bass: 'saw' },
    pattern: bar(
      {
        // Four on the floor with a ghost on the last 16th that rolls into the 1.
        kick: [1, 0, 0, 0, 0.92, 0, 0, 0, 1, 0, 0, 0, 0.92, 0, 0, 0.22],
        clap: [0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0.55, 0, 0, 0],
        closedHat: [0, 0.18, 0, 0.3, 0, 0.18, 0, 0.34, 0, 0.18, 0, 0.3, 0, 0.22, 0, 0.4],
        openHat: [0, 0, 0.8, 0, 0, 0, 0.72, 0, 0, 0, 0.8, 0, 0, 0, 0.74, 0],
        perc: [0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0.35, 0, 0.55],
        // Rolling 16ths that sit between the kicks.
        bass: [0, 0.55, 0.8, 0.6, 0, 0.55, 0.8, 0.6, 0, 0.55, 0.8, 0.6, 0, 0.6, 0.85, 0.65],
      },
      [_, 0, 0, 12, _, 0, 0, 7, _, 0, 0, 12, _, 3, 0, 10],
    ),
  },
  {
    id: 'minimal',
    label: 'Minimal',
    bpm: 126,
    swing: 0.08,
    description: 'Dry kick, clicky hats, rim on the off-16th',
    kit: { kick: 'dry', closedHat: 'click', openHat: 'open', perc: 'rim', bass: 'sub' },
    pattern: bar(
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0, 0],
        closedHat: [
          0.2, 0.25, 0.7, 0.25, 0.2, 0.3, 0.75, 0.25, 0.2, 0.25, 0.7, 0.3, 0.2, 0.3, 0.8, 0.35,
        ],
        openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0],
        perc: [0, 0, 0, 0.7, 0, 0, 0.3, 0, 0, 0, 0, 0.65, 0, 0.5, 0, 0],
        bass: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0],
      },
      [_, _, _, _, _, _, _, _, _, _, 0, _, _, _, _, _],
    ),
  },
  {
    id: 'deep-house',
    label: 'Deep House',
    bpm: 122,
    swing: 0.22,
    description: 'Warm kick, clap on 2 and 4, shuffled hats, round sub',
    kit: { kick: 'warm', closedHat: 'hat', openHat: 'open', perc: 'conga', bass: 'sub' },
    pattern: bar(
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0, 0.22],
        closedHat: [0.35, 0.2, 0, 0.45, 0.35, 0.2, 0, 0.5, 0.35, 0.2, 0, 0.45, 0.35, 0.25, 0, 0.55],
        openHat: [0, 0, 0.7, 0, 0, 0, 0.68, 0, 0, 0, 0.7, 0, 0, 0, 0.66, 0],
        perc: [0, 0, 0, 0, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0.4, 0],
        bass: [0, 0, 0.9, 0, 0, 0, 0, 0.7, 0, 0, 0.9, 0, 0, 0.6, 0, 0],
      },
      [_, _, 0, _, _, _, _, 0, _, _, 0, _, _, -2, _, _],
    ),
  },
  {
    id: 'tropical',
    label: 'Tropical',
    bpm: 110,
    swing: 0.3,
    description: 'Soft kick, marimba, swung shaker, bouncy plucked bass',
    kit: {
      kick: 'soft',
      closedHat: 'shaker',
      openHat: 'open',
      perc: 'marimba',
      bass: 'pluck',
      percNotes: [24, 24, 27, 24, 24, 31, 24, 29, 24, 24, 27, 24, 24, 31, 24, 24],
    },
    pattern: bar(
      {
        kick: [0.8, 0, 0, 0, 0.75, 0, 0, 0, 0.8, 0, 0, 0, 0.75, 0, 0, 0],
        clap: [0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0],
        closedHat: [
          0.5, 0.25, 0.4, 0.25, 0.5, 0.25, 0.4, 0.3, 0.5, 0.25, 0.4, 0.25, 0.5, 0.3, 0.45, 0.3,
        ],
        openHat: [0, 0, 0.45, 0, 0, 0, 0, 0, 0, 0, 0.45, 0, 0, 0, 0, 0],
        perc: [0, 0, 0.7, 0, 0, 0.5, 0, 0.6, 0, 0, 0.7, 0, 0, 0.5, 0, 0],
        bass: [0.9, 0, 0, 0.6, 0, 0, 0.8, 0, 0, 0.6, 0, 0.7, 0, 0, 0.8, 0],
      },
      [0, _, _, 0, _, _, 12, _, _, 7, _, 5, _, _, 7, _],
    ),
  },
  {
    id: 'afro',
    label: 'Organic / Afro',
    bpm: 118,
    swing: 0.15,
    description: 'Kick with djembe and conga, tambourine 16ths',
    kit: { kick: 'warm', closedHat: 'tambourine', openHat: 'open', perc: 'afro', bass: 'sub' },
    pattern: bar(
      {
        kick: [1, 0, 0, 0, 0.9, 0, 0, 0, 1, 0, 0, 0, 0.9, 0, 0, 0],
        clap: [0, 0, 0, 0, 0.45, 0, 0, 0, 0, 0, 0, 0, 0.45, 0, 0, 0],
        closedHat: [
          0.6, 0.3, 0.45, 0.3, 0.6, 0.3, 0.45, 0.35, 0.6, 0.3, 0.45, 0.3, 0.6, 0.35, 0.5, 0.4,
        ],
        openHat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        // Djembe on the strong hits (≥ 0.8), conga tones in between.
        perc: [0, 0, 0.9, 0, 0, 0.5, 0, 0.85, 0, 0, 0.9, 0.45, 0, 0.5, 0.85, 0],
        bass: [0.8, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0.7, 0, 0, 0, 0, 0],
      },
      [0, _, _, _, _, _, _, 7, _, _, 3, _, _, _, _, _],
    ),
  },
  {
    id: 'hypnotic',
    label: 'Hypnotic Techno',
    bpm: 130,
    swing: 0,
    description: 'Driving 4/4, offbeat ride, rumbling sub, no clap',
    kit: { kick: 'driving', closedHat: 'hat', openHat: 'ride', perc: 'rim', bass: 'rumble' },
    pattern: bar(
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        closedHat: [0.3, 0.2, 0, 0.25, 0.3, 0.2, 0, 0.3, 0.3, 0.2, 0, 0.25, 0.3, 0.25, 0, 0.35],
        openHat: [0, 0, 0.9, 0, 0, 0, 0.85, 0, 0, 0, 0.9, 0, 0, 0, 0.85, 0],
        perc: [0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0, 0, 0, 0, 0.3],
        // The rumble: sub hits in the tail of every kick.
        bass: [0, 0.6, 0.75, 0.5, 0, 0.6, 0.75, 0.5, 0, 0.6, 0.75, 0.5, 0, 0.6, 0.75, 0.55],
      },
      [_, 0, 0, 0, _, 0, 0, 0, _, 0, 0, 0, _, 0, 0, -2],
    ),
  },
];

export const DEFAULT_LOOP_ID = 'melodic';

export function getLoop(id: string): BeatLoop {
  return CORE_LOOPS.find((l) => l.id === id) ?? CORE_LOOPS[0];
}

export function patternLength(p: BeatPattern): number {
  return p.bars * STEPS_PER_BAR;
}

export function emptyPattern(bars: 1 | 2 | 4 = 1): BeatPattern {
  const len = bars * STEPS_PER_BAR;
  const steps = {} as Record<BeatRow, number[]>;
  for (const row of BEAT_ROWS) steps[row] = new Array(len).fill(0);
  return { bars, steps, bassNotes: new Array(len).fill(null) };
}

export function clonePattern(p: BeatPattern): BeatPattern {
  const steps = {} as Record<BeatRow, number[]>;
  for (const row of BEAT_ROWS) steps[row] = [...p.steps[row]];
  return { bars: p.bars, steps, bassNotes: [...p.bassNotes] };
}

/** Change the pattern length: growing repeats the existing bars, shrinking cuts. */
export function resizePattern(p: BeatPattern, bars: 1 | 2 | 4): BeatPattern {
  const len = bars * STEPS_PER_BAR;
  const from = patternLength(p);
  const steps = {} as Record<BeatRow, number[]>;
  for (const row of BEAT_ROWS) {
    steps[row] = Array.from({ length: len }, (_, i) => p.steps[row][i % from] ?? 0);
  }
  return {
    bars,
    steps,
    bassNotes: Array.from({ length: len }, (_, i) => p.bassNotes[i % from] ?? null),
  };
}

/** Structural check for patterns read back from storage. */
export function isBeatPattern(value: unknown): value is BeatPattern {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<BeatPattern>;
  if (p.bars !== 1 && p.bars !== 2 && p.bars !== 4) return false;
  const len = p.bars * STEPS_PER_BAR;
  if (!p.steps || typeof p.steps !== 'object') return false;
  for (const row of BEAT_ROWS) {
    const r = (p.steps as Record<string, unknown>)[row];
    if (!Array.isArray(r) || r.length !== len) return false;
    if (!r.every((v) => typeof v === 'number' && v >= 0 && v <= 1)) return false;
  }
  if (!Array.isArray(p.bassNotes) || p.bassNotes.length !== len) return false;
  return p.bassNotes.every(
    (n) => n === null || (typeof n === 'number' && Number.isInteger(n) && Math.abs(n) <= 36),
  );
}

// ─── Performance transforms ─────────────────────────────────

/** Order in which empty steps of a bar take ghost hits as Fill rises above 0.5. */
const GHOST_ORDER = [15, 7, 11, 3, 13, 5, 9, 1, 14, 6, 10, 2, 12, 4, 8, 0];

/** Up to `count` ghost hits per bar on the first free steps in GHOST_ORDER. */
function addGhosts(
  out: BeatPattern,
  row: BeatRow,
  count: number,
  vel: number,
  free: (i: number) => boolean,
) {
  for (let barStart = 0; barStart < patternLength(out); barStart += STEPS_PER_BAR) {
    let added = 0;
    for (const s of GHOST_ORDER) {
      if (added >= count) break;
      const i = barStart + s;
      if (out.steps[row][i] === 0 && free(i)) {
        out.steps[row][i] = vel;
        added++;
      }
    }
  }
}

/**
 * Fill: 0 = stripped to kick and hats, 0.5 = as written, 1 = extra ghost
 * hits and perc. Below 0.5 the other rows lose their softest hits first.
 */
export function applyFill(pattern: BeatPattern, fill: number): BeatPattern {
  const f = Math.min(1, Math.max(0, fill));
  const out = clonePattern(pattern);
  if (f === 0.5) return out;
  if (f < 0.5) {
    const t = f / 0.5;
    for (const row of ['clap', 'perc', 'bass'] as const) {
      out.steps[row] = out.steps[row].map((v) => (t > 0 && v >= 1 - t ? v : 0));
    }
    out.bassNotes = out.bassNotes.map((n, i) => (out.steps.bass[i] > 0 ? n : null));
    return out;
  }
  const u = (f - 0.5) / 0.5;
  addGhosts(out, 'closedHat', Math.round(u * 6), 0.18, (i) => out.steps.openHat[i] === 0);
  addGhosts(out, 'perc', Math.round(u * 4), 0.3, (i) => out.steps.kick[i] === 0);
  if (u >= 0.8) {
    for (let i = 14; i < patternLength(out); i += STEPS_PER_BAR) {
      if (out.steps.kick[i] === 0) out.steps.kick[i] = 0.3;
    }
  }
  return out;
}

export function muteKick(pattern: BeatPattern): BeatPattern {
  const out = clonePattern(pattern);
  out.steps.kick = out.steps.kick.map(() => 0);
  return out;
}

/**
 * Snap each bass note to the nearest degree of `scale` (semitone offsets
 * within an octave, e.g. [0, 3, 5, 7, 10]), keeping its octave. Ties go down.
 */
export function scaleBass(
  bassNotes: (number | null)[],
  scale: readonly number[],
): (number | null)[] {
  const degrees = [...new Set(scale.map((s) => ((Math.round(s) % 12) + 12) % 12))];
  if (degrees.length === 0) return [...bassNotes];
  return bassNotes.map((n) => {
    if (n === null) return null;
    let best = n;
    let bestDist = Number.POSITIVE_INFINITY;
    const octave = Math.floor(n / 12) * 12;
    for (const d of degrees) {
      for (const candidate of [octave + d - 12, octave + d, octave + d + 12]) {
        const dist = Math.abs(candidate - n);
        if (dist < bestDist || (dist === bestDist && candidate < best)) {
          best = candidate;
          bestDist = dist;
        }
      }
    }
    return best;
  });
}

/** Scale offsets for the bass picker: an octave below the root up to the octave above. */
export function bassChoices(scale: readonly number[]): number[] {
  const degrees = [...new Set(scale.map((s) => ((Math.round(s) % 12) + 12) % 12))].sort(
    (a, b) => a - b,
  );
  const base = degrees.length ? degrees : [0];
  return [...base.map((d) => d - 12), ...base, 12];
}
