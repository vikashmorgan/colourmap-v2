import { afterEach, describe, expect, it, vi } from 'vitest';

import { emptyPattern, getLoop } from './beat-loops';
import {
  BEATS_LS,
  beatsSummary,
  DEFAULT_BEATS,
  loadBeats,
  saveBeats,
  validateBeats,
} from './beats-settings';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('beats settings', () => {
  it('loads the defaults when nothing is saved', () => {
    expect(loadBeats()).toEqual(DEFAULT_BEATS);
  });

  it('round-trips through localStorage, never auto-playing', () => {
    const custom = emptyPattern(2);
    custom.steps.kick[0] = 1;
    const settings = {
      ...DEFAULT_BEATS,
      on: true,
      loopId: 'tropical',
      volume: 0.4,
      fill: 0.9,
      lowCut: 0.3,
      muteKick: true,
      custom,
      mode: 'custom' as const,
    };
    saveBeats(settings);
    expect(localStorage.getItem(BEATS_LS)).not.toBeNull();
    expect(loadBeats()).toEqual({ ...settings, on: false });
  });

  it('falls back field by field on bad data', () => {
    const v = validateBeats({
      on: 'yes',
      loopId: 'polka',
      volume: 7,
      fill: 'loud',
      lowCut: -2,
      muteKick: 1,
      custom: { bars: 3 },
      mode: 'custom',
      rowMix: { kick: { volume: 0.2, mute: true, solo: 'no' }, clap: 'x' },
    });
    expect(v.on).toBe(false);
    expect(v.loopId).toBe(DEFAULT_BEATS.loopId);
    expect(v.volume).toBe(1);
    expect(v.fill).toBe(DEFAULT_BEATS.fill);
    expect(v.lowCut).toBe(0);
    expect(v.muteKick).toBe(false);
    expect(v.custom).toBeNull();
    // Custom mode needs a custom pattern.
    expect(v.mode).toBe('simple');
    expect(v.rowMix.kick).toEqual({ volume: 0.2, mute: true, solo: false });
    expect(v.rowMix.clap).toEqual({ volume: 1, mute: false, solo: false });
  });

  it('survives corrupt JSON and non-objects', () => {
    localStorage.setItem(BEATS_LS, '{not json');
    expect(loadBeats()).toEqual(DEFAULT_BEATS);
    expect(validateBeats(42)).toEqual(DEFAULT_BEATS);
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveBeats(DEFAULT_BEATS)).not.toThrow();
  });

  it('summarises the module for its closed header', () => {
    expect(beatsSummary(DEFAULT_BEATS, 120)).toBe('off');
    expect(beatsSummary({ ...DEFAULT_BEATS, on: true }, 124)).toBe(
      `124 · ${getLoop(DEFAULT_BEATS.loopId).label}`,
    );
    expect(
      beatsSummary({ ...DEFAULT_BEATS, on: true, mode: 'custom', custom: emptyPattern() }, 118),
    ).toBe('118 · Custom');
  });
});
