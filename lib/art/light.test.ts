import { describe, expect, it } from 'vitest';

import {
  clampSettings,
  frameName,
  KIND_SLIDERS,
  LIMITS,
  makeSavedLight,
  PALETTES,
  PIECES,
  paletteById,
  parseSavedLights,
  pieceBySlug,
  poseName,
  rampUniform,
  SETTING_KEYS,
} from './light';
import { LIGHT_FRAGMENTS, LIGHT_UNIFORMS } from './light-shaders';

const HEX = /^#[0-9a-f]{6}$/i;

describe('palettes', () => {
  it('each has two background colours and a six-stop ramp, all valid', () => {
    for (const p of PALETTES) {
      expect(p.bg.every((c) => HEX.test(c))).toBe(true);
      expect(p.ramp).toHaveLength(6);
      expect(p.ramp.every((c) => HEX.test(c))).toBe(true);
      expect(rampUniform(p)).toHaveLength(18);
    }
  });

  it('falls back to the first palette for an unknown id', () => {
    expect(paletteById('nope')).toBe(PALETTES[0]);
  });
});

describe('pieces', () => {
  it('have unique slugs, real palettes and settings inside the limits', () => {
    expect(new Set(PIECES.map((p) => p.slug)).size).toBe(PIECES.length);
    for (const p of PIECES) {
      expect(PALETTES.some((pal) => pal.id === p.palette)).toBe(true);
      expect(clampSettings(p.settings)).toEqual(p.settings);
    }
  });

  it('holds the three ideas: eclipse, enlightenment and the light bubble', () => {
    expect(pieceBySlug('burning-ring')?.kind).toBe('eclipse');
    expect(pieceBySlug('enlightenment')?.kind).toBe('deity');
    expect(pieceBySlug('opal-bubble')?.kind).toBe('bubble');
    for (const kind of ['eclipse', 'deity', 'bubble'] as const) {
      expect(PIECES.filter((p) => p.kind === kind).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives each kind sliders only for settings that exist, each once', () => {
    for (const list of Object.values(KIND_SLIDERS)) {
      const keys = list.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.every((k) => k in LIMITS)).toBe(true);
    }
    expect(KIND_SLIDERS.deity.map((s) => s.key)).toContain('pose');
  });
});

describe('settings', () => {
  it('clamps into the limits and keeps the drops whole', () => {
    const base = PIECES[0]?.settings as (typeof PIECES)[number]['settings'];
    const c = clampSettings({ ...base, size: 9, glow: -1, count: 2.6, speed: Number.NaN });
    expect(c.size).toBe(LIMITS.size.max);
    expect(c.glow).toBe(0);
    expect(c.count).toBe(3);
    expect(c.speed).toBe(0.5);
  });

  it('names the poses', () => {
    expect(poseName(0)).toBe('Meditating');
    expect(poseName(1.2)).toBe('Praying');
    expect(poseName(2)).toBe('Dancing');
    expect(poseName(7)).toBe('Dancing');
  });

  it('names a saved frame after the piece and any other palette', () => {
    const p = pieceBySlug('blood-moon');
    if (!p) throw new Error('missing');
    expect(frameName(p, 'blood')).toBe('light-blood-moon.png');
    expect(frameName(p, 'fire')).toBe('light-blood-moon-fire.png');
  });
});

describe('the shaders', () => {
  it('each declare every uniform the canvas sets', () => {
    for (const src of Object.values(LIGHT_FRAGMENTS)) {
      for (const u of LIGHT_UNIFORMS) expect(src).toMatch(new RegExp(`uniform \\w+ ${u}\\b`));
    }
  });

  it('cover every kind', () => {
    expect(Object.keys(LIGHT_FRAGMENTS).sort()).toEqual(['bubble', 'deity', 'eclipse']);
  });
});

describe('saved tunings', () => {
  const piece = pieceBySlug('enlightenment');
  if (!piece) throw new Error('missing');

  it('are named after the piece with the next free number', () => {
    const a = makeSavedLight(piece, 'silver', piece.settings, [], 1);
    expect(a.name).toBe('Enlightenment 1');
    expect(makeSavedLight(piece, 'silver', piece.settings, [a], 2).name).toBe('Enlightenment 2');
  });

  it('round-trip, and junk is dropped', () => {
    const a = makeSavedLight(piece, 'silver', { ...piece.settings, pose: 1.5 }, [], 1);
    expect(parseSavedLights(JSON.stringify([a]))).toEqual([a]);
    expect(parseSavedLights('nope')).toEqual([]);
    expect(parseSavedLights(null)).toEqual([]);
    expect(parseSavedLights('{"a":1}')).toEqual([]);
    expect(parseSavedLights(JSON.stringify([{ ...a, piece: 'gone' }]))).toEqual([]);
  });

  it('fill missing settings from the piece and clamp the rest', () => {
    const raw = [
      { id: 'x', name: 'x', piece: 'enlightenment', palette: 'nope', settings: { pose: 9 } },
    ];
    const [s] = parseSavedLights(JSON.stringify(raw));
    expect(s?.settings.pose).toBe(2);
    expect(s?.settings.numbers).toBe(piece.settings.numbers);
    expect(s?.palette).toBe(PALETTES[0]?.id);
  });

  it('keep every setting', () => {
    expect([...SETTING_KEYS].sort()).toEqual(Object.keys(piece.settings).sort());
  });
});
