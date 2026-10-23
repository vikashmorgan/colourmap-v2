import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addSection,
  cueSheet,
  DEFAULT_SECTIONS,
  formatCueSheet,
  loadSections,
  MAX_SECTIONS,
  moveSection,
  parseSections,
  playheadBar,
  positionAt,
  removeSection,
  renameSection,
  SECTIONS_LS,
  type SectionBars,
  type SongSection,
  saveSections,
  setSectionBars,
  setSectionSnapshot,
  totalBars,
} from './sections';

const song = DEFAULT_SECTIONS.map((s) => ({ ...s }));

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('positionAt', () => {
  it('starts on bar 1 of the intro and counts across boundaries', () => {
    expect(totalBars(song)).toBe(72);
    expect(positionAt(song, 0, null)).toMatchObject({
      index: 0,
      barInSection: 1,
      songBar: 1,
      totalBars: 72,
      ended: false,
    });
    expect(positionAt(song, 15.99, null)).toMatchObject({ index: 0, barInSection: 16 });
    expect(positionAt(song, 16, null)).toMatchObject({ index: 1, barInSection: 1, songBar: 17 });
    expect(positionAt(song, 28.5, null)).toMatchObject({
      index: 2,
      barInSection: 5,
      section: { name: 'Drop' },
    });
    expect(positionAt(song, 71.9, null)).toMatchObject({ index: 5, barInSection: 8, ended: false });
  });

  it('plays once and holds on the last section', () => {
    const end = { index: 5, barInSection: 8, songBar: 72, ended: true };
    expect(positionAt(song, 72, null)).toMatchObject(end);
    expect(positionAt(song, 500, null)).toMatchObject(end);
    expect(playheadBar(song, 500, null)).toEqual({ bar: 72, ended: true });
  });

  it('runs into a looped section, then wraps inside it', () => {
    expect(positionAt(song, 10, 'drop-1')).toMatchObject({ index: 0, barInSection: 11 });
    expect(positionAt(song, 24, 'drop-1')).toMatchObject({ index: 2, barInSection: 1 });
    expect(positionAt(song, 40, 'drop-1')).toMatchObject({ index: 2, barInSection: 1 });
    expect(positionAt(song, 45, 'drop-1')).toMatchObject({ index: 2, barInSection: 6 });
    expect(positionAt(song, 1000, 'outro')).toMatchObject({ index: 5, ended: false });
    expect(playheadBar(song, 41.5, 'drop-1').bar).toBeCloseTo(25.5);
  });

  it('wraps from wherever the song was when the loop starts later', () => {
    // At bar 60 (inside the second drop) looping the build (bars 16–24): 44 % 8 = 4
    expect(positionAt(song, 60, 'build')).toMatchObject({ index: 1, barInSection: 5 });
  });

  it('ignores an unknown loop id, negative bars and empty songs', () => {
    expect(positionAt(song, 20, 'gone')).toMatchObject({ index: 1 });
    expect(positionAt(song, -3, null)).toMatchObject({ index: 0, barInSection: 1 });
    expect(positionAt([], 3, null)).toBeNull();
  });
});

describe('cue sheet', () => {
  it('times each section start at the bpm', () => {
    const cues = cueSheet(song, 120);
    expect(cues.map((c) => c.at)).toEqual([0, 32, 48, 80, 96, 128]);
    expect(formatCueSheet(cues)).toBe(
      '00:00 Intro\n00:32 Build\n00:48 Drop\n01:20 Break\n01:36 Drop\n02:08 Outro',
    );
  });

  it('floors fractional seconds and keeps minutes past the hour', () => {
    expect(formatCueSheet([{ at: 59.9, label: 'A' }])).toBe('00:59 A');
    expect(formatCueSheet([{ at: 3725, label: 'B' }])).toBe('62:05 B');
    expect(formatCueSheet(cueSheet(song, 90)).split('\n')[1]).toBe('00:42 Build');
    expect(formatCueSheet([])).toBe('');
  });
});

describe('list edits', () => {
  it('adds after a section, or at the end', () => {
    const a = addSection(song, 'intro', { id: 'x', name: '  Breakdown ', bars: 4 });
    expect(a[1]).toEqual({ id: 'x', name: 'Breakdown', bars: 4, snapshot: null });
    const b = addSection(song, null);
    expect(b).toHaveLength(7);
    expect(b[6]).toMatchObject({ name: 'Section', bars: 8, snapshot: null });
    expect(b[6].id).toMatch(/^sec-/);
    expect(addSection(song, 'x', { name: '   ' })[6].name).toBe('Section');
  });

  it('caps the number of sections', () => {
    let many: SongSection[] = [];
    for (let i = 0; i < MAX_SECTIONS + 3; i++) many = addSection(many, null, { id: `s${i}` });
    expect(many).toHaveLength(MAX_SECTIONS);
  });

  it('removes but always keeps one section', () => {
    expect(removeSection(song, 'build').map((s) => s.id)).not.toContain('build');
    const one = [song[0]];
    expect(removeSection(one, 'intro')).toEqual(one);
  });

  it('moves by index and refuses out-of-range moves', () => {
    expect(
      moveSection(song, 0, 2)
        .map((s) => s.id)
        .slice(0, 3),
    ).toEqual(['build', 'drop-1', 'intro']);
    expect(moveSection(song, 5, 4)[4].id).toBe('outro');
    expect(moveSection(song, 0, 6)).toEqual(song);
    expect(moveSection(song, -1, 0)).toEqual(song);
    expect(moveSection(song, 2, 2)).toEqual(song);
  });

  it('renames with trimmed 1–24 character names', () => {
    expect(renameSection(song, 'intro', '  Dawn ')[0].name).toBe('Dawn');
    expect(renameSection(song, 'intro', '   ')[0].name).toBe('Intro');
    expect(renameSection(song, 'intro', 'x'.repeat(25))[0].name).toBe('Intro');
    expect(renameSection(song, 'intro', 'x'.repeat(24))[0].name).toHaveLength(24);
  });

  it('sets bars to 4/8/16/32 only and stores snapshots', () => {
    expect(setSectionBars(song, 'build', 32)[1].bars).toBe(32);
    expect(setSectionBars(song, 'build', 12 as SectionBars)[1].bars).toBe(8);
    const snap = setSectionSnapshot(song, 'drop-1', { pads: ['rain'] });
    expect(snap[2].snapshot).toEqual({ pads: ['rain'] });
    expect(setSectionSnapshot(snap, 'drop-1', null)[2].snapshot).toBeNull();
    expect(song[2].snapshot).toBeNull();
  });
});

describe('storage', () => {
  it('falls back to the default template', () => {
    expect(loadSections()).toEqual(DEFAULT_SECTIONS);
    localStorage.setItem(SECTIONS_LS, '{not json');
    expect(loadSections()).toEqual(DEFAULT_SECTIONS);
    localStorage.setItem(SECTIONS_LS, JSON.stringify([{ id: 'a', name: '', bars: 8 }]));
    expect(loadSections()).toEqual(DEFAULT_SECTIONS);
  });

  it('round-trips a saved arrangement', () => {
    const next = setSectionSnapshot(renameSection(song, 'intro', 'Dawn'), 'intro', { beat: true });
    saveSections(next);
    expect(loadSections()).toEqual(next);
  });

  it('keeps only valid, unique sections', () => {
    expect(
      parseSections([
        { id: 'a', name: ' A ', bars: 8 },
        { id: 'a', name: 'Dup', bars: 8, snapshot: null },
        { id: 'b', name: 'B', bars: 7, snapshot: null },
        { id: 'c', name: 'C', bars: 4, snapshot: [1] },
        { id: '', name: 'D', bars: 4, snapshot: null },
        { id: 'e', name: 5, bars: 4, snapshot: null },
        'nope',
        null,
      ]),
    ).toEqual([{ id: 'a', name: 'A', bars: 8, snapshot: null }]);
    expect(parseSections({})).toBeNull();
    expect(parseSections([])).toBeNull();
  });

  it('does not save an empty list and survives blocked storage', () => {
    saveSections([]);
    expect(localStorage.getItem(SECTIONS_LS)).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveSections(song)).not.toThrow();
  });
});
