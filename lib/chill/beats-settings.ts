/**
 * Chill beats settings — what the Beats module remembers between visits.
 * Stored in localStorage; every field is validated on load so a stale or
 * hand-edited value falls back to its default instead of breaking the page.
 */

import { defaultRowMix, type RowMix } from '@/lib/chill/beat-engine';
import {
  BEAT_ROWS,
  type BeatPattern,
  type BeatRow,
  CORE_LOOPS,
  DEFAULT_LOOP_ID,
  getLoop,
  isBeatPattern,
} from '@/lib/chill/beat-loops';

export const BEATS_LS = 'colourmap:chill-beats';

export type ChillBeatSettings = {
  on: boolean;
  loopId: string;
  /** 0..1 */
  volume: number;
  /** 0..1, 0.5 = as written. */
  fill: number;
  /** 0..1 highpass amount on the beat bus. */
  lowCut: number;
  muteKick: boolean;
  /** The edited grid; null until Customise is first opened. */
  custom: BeatPattern | null;
  mode: 'simple' | 'custom';
  /** Per-row volume, mute and solo for the custom grid. */
  rowMix: Record<BeatRow, RowMix>;
};

export const DEFAULT_BEATS: ChillBeatSettings = {
  on: false,
  loopId: DEFAULT_LOOP_ID,
  volume: 0.7,
  fill: 0.5,
  lowCut: 0,
  muteKick: false,
  custom: null,
  mode: 'simple',
  rowMix: defaultRowMix(),
};

function unit(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function validRowMix(v: unknown): Record<BeatRow, RowMix> {
  const mix = defaultRowMix();
  if (!v || typeof v !== 'object') return mix;
  for (const row of BEAT_ROWS) {
    const r = (v as Record<string, unknown>)[row];
    if (!r || typeof r !== 'object') continue;
    const m = r as Partial<RowMix>;
    mix[row] = {
      volume: unit(m.volume, 1),
      mute: m.mute === true,
      solo: m.solo === true,
    };
  }
  return mix;
}

/** Coerce anything into valid settings, field by field. */
export function validateBeats(raw: unknown): ChillBeatSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BEATS, rowMix: defaultRowMix() };
  const r = raw as Record<string, unknown>;
  const loopId =
    typeof r.loopId === 'string' && CORE_LOOPS.some((l) => l.id === r.loopId)
      ? r.loopId
      : DEFAULT_BEATS.loopId;
  const custom = isBeatPattern(r.custom) ? r.custom : null;
  return {
    on: r.on === true,
    loopId,
    volume: unit(r.volume, DEFAULT_BEATS.volume),
    fill: unit(r.fill, DEFAULT_BEATS.fill),
    lowCut: unit(r.lowCut, DEFAULT_BEATS.lowCut),
    muteKick: r.muteKick === true,
    custom,
    mode: r.mode === 'custom' && custom ? 'custom' : 'simple',
    rowMix: validRowMix(r.rowMix),
  };
}

/** Load saved settings. The beat never auto-plays: `on` always loads false. */
export function loadBeats(): ChillBeatSettings {
  try {
    const raw = localStorage.getItem(BEATS_LS);
    if (!raw) return validateBeats(null);
    return { ...validateBeats(JSON.parse(raw)), on: false };
  } catch {
    return validateBeats(null);
  }
}

export function saveBeats(settings: ChillBeatSettings): void {
  try {
    localStorage.setItem(BEATS_LS, JSON.stringify(validateBeats(settings)));
  } catch {
    /* storage full or blocked — settings stay in memory */
  }
}

/** One-line summary for the closed module header, e.g. "124 · Melodic". */
export function beatsSummary(settings: ChillBeatSettings, bpm: number): string {
  if (!settings.on) return 'off';
  const label = settings.mode === 'custom' ? 'Custom' : getLoop(settings.loopId).label;
  return `${bpm} · ${label}`;
}
