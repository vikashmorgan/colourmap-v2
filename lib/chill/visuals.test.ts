import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ECHO } from './echo';
import {
  DEFAULT_VISUALS,
  EARTH_VISUAL_PALETTE,
  loadVisuals,
  parseVisuals,
  resolveVisualPalette,
  saveVisuals,
  VISUALS_LS,
} from './visuals';

describe('chill visuals', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('validates mode, colours and sliders, falling back to defaults', () => {
    expect(parseVisuals(null)).toEqual(DEFAULT_VISUALS);
    const v = parseVisuals({ mode: 'galaxy', colors: 'cool', speed: -2, density: 0.3, echo: 5 });
    expect(v.mode).toBe('galaxy');
    expect(v.colors).toBe('cool');
    expect(v.speed).toBe(0);
    expect(v.density).toBe(0.3);
    expect(v.echo).toEqual(DEFAULT_ECHO);
    expect(parseVisuals({ mode: 'disco', colors: 'neon' })).toMatchObject({
      mode: 'atom',
      colors: 'match',
    });
  });

  it('round-trips through localStorage and survives bad JSON', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const next = { ...DEFAULT_VISUALS, mode: 'wave' as const, colors: 'night' as const };
    saveVisuals(next);
    expect(loadVisuals()).toEqual(next);
    store.set(VISUALS_LS, '{bad');
    expect(loadVisuals()).toEqual(DEFAULT_VISUALS);
  });

  it('saving never throws when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadVisuals()).toEqual(DEFAULT_VISUALS);
    expect(() => saveVisuals(DEFAULT_VISUALS)).not.toThrow();
  });

  it('resolves the dot palette: match follows the pads, Earth uses the warm set', () => {
    expect(resolveVisualPalette({ colors: 'match' }, 'earth')).toEqual([...EARTH_VISUAL_PALETTE]);
    expect(resolveVisualPalette({ colors: 'match' }, 'rainbow')[0]).toBe('#E53935');
    expect(resolveVisualPalette({ colors: 'cool' }, 'rainbow')[0]).toBe('#2A9D8F');
    expect(resolveVisualPalette({ colors: 'earth' }, 'night')).toEqual([...EARTH_VISUAL_PALETTE]);
  });
});
