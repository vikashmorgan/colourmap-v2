/**
 * Chill song sections — the arrangement timeline (Intro / Build / Drop …) that
 * tells a player where they are in the track. Pure logic: positions on the
 * transport clock, list edits, the recording cue sheet, and localStorage.
 * Spec: docs/specs/chill-machine-public.md → Song sections.
 */

import { barDuration } from './transport';

/** Opaque: the host decides what a section remembers (pads, volumes, beat…). */
export type SectionSnapshot = Record<string, unknown>;

export type SectionBars = 4 | 8 | 16 | 32;

export type SongSection = {
  id: string;
  name: string;
  bars: SectionBars;
  snapshot: SectionSnapshot | null;
};

export type SongPosition = {
  index: number;
  section: SongSection;
  /** 1-based bar inside the current section. */
  barInSection: number;
  totalBars: number;
  /** 1-based bar in the whole song. */
  songBar: number;
  /** The song played once through and now holds on its last section. */
  ended: boolean;
};

export type Cue = { at: number; label: string };

export const BAR_OPTIONS: readonly SectionBars[] = [4, 8, 16, 32];
export const QUICK_NAMES = ['Intro', 'Build', 'Drop', 'Break', 'Breakdown', 'Outro'] as const;
export const MAX_NAME = 24;
export const MAX_SECTIONS = 32;
export const SECTIONS_LS = 'colourmap:chill-sections';

export const DEFAULT_SECTIONS: readonly SongSection[] = [
  { id: 'intro', name: 'Intro', bars: 16, snapshot: null },
  { id: 'build', name: 'Build', bars: 8, snapshot: null },
  { id: 'drop-1', name: 'Drop', bars: 16, snapshot: null },
  { id: 'break', name: 'Break', bars: 8, snapshot: null },
  { id: 'drop-2', name: 'Drop', bars: 16, snapshot: null },
  { id: 'outro', name: 'Outro', bars: 8, snapshot: null },
];

export function totalBars(sections: readonly SongSection[]): number {
  return sections.reduce((n, s) => n + s.bars, 0);
}

/**
 * Where the playhead sits, in fractional bars from the start of the song
 * (0 … totalBars). `bar` is transport bars elapsed (barAt). Without a loop the
 * song plays once and holds at the end. With a loop the playhead runs normally
 * until it reaches that section, then wraps inside it; if the song was already
 * past it, it jumps in at the same offset (bar - start) mod length.
 */
export function playheadBar(
  sections: readonly SongSection[],
  bar: number,
  loopSectionId: string | null,
): { bar: number; ended: boolean } {
  const total = totalBars(sections);
  const b = Math.max(0, bar);
  let start = 0;
  for (const s of sections) {
    if (s.id === loopSectionId) {
      if (b < start) return { bar: b, ended: false };
      return { bar: start + ((b - start) % s.bars), ended: false };
    }
    start += s.bars;
  }
  if (b >= total) return { bar: total, ended: true };
  return { bar: b, ended: false };
}

export function positionAt(
  sections: readonly SongSection[],
  bar: number,
  loopSectionId: string | null,
): SongPosition | null {
  if (sections.length === 0) return null;
  const total = totalBars(sections);
  const head = playheadBar(sections, bar, loopSectionId);
  if (head.ended) {
    const index = sections.length - 1;
    const section = sections[index];
    return {
      index,
      section,
      barInSection: section.bars,
      totalBars: total,
      songBar: total,
      ended: true,
    };
  }
  const whole = Math.floor(head.bar);
  let start = 0;
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    if (whole < start + section.bars) {
      return {
        index,
        section,
        barInSection: whole - start + 1,
        totalBars: total,
        songBar: whole + 1,
        ended: false,
      };
    }
    start += section.bars;
  }
  return null; // unreachable: a non-ended playhead is always inside a section
}

/** Section start times in seconds at `bpm`, for the recording's cue sheet. */
export function cueSheet(sections: readonly SongSection[], bpm: number): Cue[] {
  const bar = barDuration(bpm);
  let start = 0;
  return sections.map((s) => {
    const cue = { at: start * bar, label: s.name };
    start += s.bars;
    return cue;
  });
}

function clock(seconds: number): string {
  const s = Math.floor(seconds + 1e-6);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatCueSheet(cues: readonly Cue[]): string {
  return cues.map((c) => `${clock(c.at)} ${c.label}`).join('\n');
}

// ── List edits: each returns a new list, or the same one when the edit is refused ──

export function newSectionId(): string {
  return `sec-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function isSectionName(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= MAX_NAME;
}

export function addSection(
  sections: readonly SongSection[],
  afterId: string | null,
  init: Partial<Pick<SongSection, 'id' | 'name' | 'bars'>> = {},
): SongSection[] {
  if (sections.length >= MAX_SECTIONS) return [...sections];
  const section: SongSection = {
    id: init.id ?? newSectionId(),
    name: init.name && isSectionName(init.name) ? init.name.trim() : 'Section',
    bars: init.bars ?? 8,
    snapshot: null,
  };
  const at = sections.findIndex((s) => s.id === afterId);
  const next = [...sections];
  next.splice(at === -1 ? next.length : at + 1, 0, section);
  return next;
}

export function removeSection(sections: readonly SongSection[], id: string): SongSection[] {
  if (sections.length <= 1) return [...sections];
  return sections.filter((s) => s.id !== id);
}

export function moveSection(
  sections: readonly SongSection[],
  from: number,
  to: number,
): SongSection[] {
  const next = [...sections];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [s] = next.splice(from, 1);
  next.splice(to, 0, s);
  return next;
}

function patch(
  sections: readonly SongSection[],
  id: string,
  change: Partial<SongSection>,
): SongSection[] {
  return sections.map((s) => (s.id === id ? { ...s, ...change } : s));
}

export function renameSection(
  sections: readonly SongSection[],
  id: string,
  name: string,
): SongSection[] {
  if (!isSectionName(name)) return [...sections];
  return patch(sections, id, { name: name.trim() });
}

export function setSectionBars(
  sections: readonly SongSection[],
  id: string,
  bars: SectionBars,
): SongSection[] {
  if (!BAR_OPTIONS.includes(bars)) return [...sections];
  return patch(sections, id, { bars });
}

export function setSectionSnapshot(
  sections: readonly SongSection[],
  id: string,
  snapshot: SectionSnapshot | null,
): SongSection[] {
  return patch(sections, id, { snapshot });
}

// ── Storage ──

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Keeps the valid sections (unique ids, legal names and lengths); null if none. */
export function parseSections(raw: unknown): SongSection[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: SongSection[] = [];
  for (const item of raw) {
    if (!isPlainObject(item)) continue;
    const { id, name, bars, snapshot } = item;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    if (typeof name !== 'string' || !isSectionName(name)) continue;
    if (!BAR_OPTIONS.includes(bars as SectionBars)) continue;
    if (snapshot !== null && snapshot !== undefined && !isPlainObject(snapshot)) continue;
    seen.add(id);
    out.push({
      id,
      name: name.trim(),
      bars: bars as SectionBars,
      snapshot: isPlainObject(snapshot) ? snapshot : null,
    });
    if (out.length === MAX_SECTIONS) break;
  }
  return out.length ? out : null;
}

export function loadSections(): SongSection[] {
  const fallback = DEFAULT_SECTIONS.map((s) => ({ ...s }));
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(SECTIONS_LS);
    return (raw && parseSections(JSON.parse(raw))) || fallback;
  } catch {
    return fallback;
  }
}

export function saveSections(sections: readonly SongSection[]): void {
  if (typeof window === 'undefined') return;
  const valid = parseSections(sections);
  if (!valid) return;
  try {
    localStorage.setItem(SECTIONS_LS, JSON.stringify(valid));
  } catch {
    /* storage full or blocked: the timeline still works for this session */
  }
}
