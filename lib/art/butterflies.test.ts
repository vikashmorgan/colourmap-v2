import { describe, expect, it } from 'vitest';

import {
  builderPresetName,
  builderSettings,
  builderSliders,
  clampSettings,
  FORMS,
  frameName,
  hexToRgb,
  isBg,
  LIMITS,
  makeSavedButterfly,
  PALETTES,
  PIECES,
  paletteById,
  parseSavedButterflies,
  pieceBySlug,
  rampUniform,
  SLIDER_KEYS,
  slidersFor,
  withBg,
} from './butterflies';

const HEX = /^#[0-9a-f]{6}$/i;

const BASE_OF = () => (PIECES[0] as (typeof PIECES)[number]).settings;

describe('palettes', () => {
  it('each has two background colours and a six-stop ramp, all valid', () => {
    for (const p of PALETTES) {
      expect(p.bg.every((c) => HEX.test(c))).toBe(true);
      expect(p.ramp).toHaveLength(6);
      expect(p.ramp.every((c) => HEX.test(c))).toBe(true);
    }
  });

  it('packs the ramp as 18 numbers between 0 and 1', () => {
    const r = rampUniform(paletteById('thermal'));
    expect(r).toHaveLength(18);
    expect(r.every((v) => v >= 0 && v <= 1)).toBe(true);
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

  it('includes the eclipse and the iridescent drop', () => {
    expect(pieceBySlug('eclipse')?.settings.sparks).toBeGreaterThan(0);
    expect(pieceBySlug('opal-drop')?.settings.iris).toBeGreaterThan(0);
  });

  it('has a slider for every setting but the design, which is chosen with buttons', () => {
    expect([...SLIDER_KEYS, 'form'].sort()).toEqual(Object.keys(PIECES[0]?.settings ?? {}).sort());
  });

  it('builds pieces on every design, and shows petals only where there are petals', () => {
    for (let form = 0; form < FORMS.length; form++) {
      expect(PIECES.some((p) => p.settings.form === form)).toBe(true);
    }
    expect(FORMS).toEqual(['Butterfly', 'Flower', 'Heart', 'Volcano', 'Mountains', 'Thangka']);
    expect(slidersFor(1)).toContain('petals');
    expect(slidersFor(5)).toContain('petals');
    expect(slidersFor(0)).not.toContain('petals');
    expect(clampSettings({ ...BASE_OF(), form: 9.4, petals: 2 })).toMatchObject({
      form: 5,
      petals: 3,
    });
  });

  it('gives Thermal Monarch a warm background', () => {
    const [top, bottom] = paletteById('thermal').bg.map(hexToRgb);
    for (const c of [top, bottom]) expect((c?.[0] ?? 0) > (c?.[2] ?? 1)).toBe(true);
  });
});

describe('helpers', () => {
  it('clamps settings and rounds the counts', () => {
    const base = (PIECES[0] as (typeof PIECES)[number]).settings;
    const c = clampSettings({
      ...base,
      slices: 99,
      echoes: 2.6,
      fold: 0,
      flow: -1,
      speed: Number.NaN,
    });
    expect(c.slices).toBe(LIMITS.slices.max);
    expect(c.echoes).toBe(3);
    expect(c.fold).toBe(1);
    expect(c.flow).toBe(0);
    expect(Number.isFinite(c.speed)).toBe(true);
  });

  it('reads hex colours, short and long', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0f0')).toEqual([0, 1, 0]);
    expect(hexToRgb('nope')).toEqual([0, 0, 0]);
  });

  it('names a saved frame after the piece, and the palette when changed', () => {
    const p = pieceBySlug('eclipse') as (typeof PIECES)[number];
    expect(frameName(p, 'eclipse')).toBe('liquid-butterfly-eclipse.png');
    expect(frameName(p, 'gold')).toBe('liquid-butterfly-eclipse-gold.png');
  });
});

describe('in the Geometry Builder', () => {
  it('names every piece once, with Eclipse renamed', () => {
    const names = PIECES.map(builderPresetName);
    expect(new Set(names).size).toBe(PIECES.length);
    expect(names).toContain('Eclipse Butterfly');
  });

  it('round-trips a piece through the builder sliders', () => {
    for (const p of PIECES) {
      expect(builderSettings(p.slug, builderSliders(p))).toEqual(p.settings);
    }
  });

  it('lays the sliders over the piece and falls back to the first piece', () => {
    const s = builderSettings('eclipse', {
      symmetry: 4,
      complexity: 6,
      particles: 3,
      glow: 5,
      intensity: 2,
      breathSpeed: 1,
    });
    expect(s).toMatchObject({
      fold: 4,
      slices: 6,
      echoes: 3,
      flow: 0.5,
      morph: 0.2,
      speed: 1,
    });
    expect(builderSettings('nope', builderSliders(PIECES[0] as (typeof PIECES)[number]))).toEqual(
      PIECES[0]?.settings,
    );
  });
});

describe('saved tunings', () => {
  const eclipse = () => pieceBySlug('eclipse') as (typeof PIECES)[number];

  it('names a tuning after its piece with the next free number', () => {
    const a = makeSavedButterfly(eclipse(), 'gold', eclipse().settings, [], 1);
    expect(a.name).toBe('Eclipse 1');
    expect(makeSavedButterfly(eclipse(), 'gold', eclipse().settings, [a], 2).name).toBe(
      'Eclipse 2',
    );
  });

  it('round-trips, and repairs or drops what it cannot trust', () => {
    const a = makeSavedButterfly(eclipse(), 'gold', { ...eclipse().settings, sparks: 0.3 }, [], 1);
    expect(parseSavedButterflies(JSON.stringify([a]))).toEqual([a]);
    expect(parseSavedButterflies('nope')).toEqual([]);
    expect(parseSavedButterflies(JSON.stringify([{ ...a, piece: 'gone' }]))).toEqual([]);
    const wild = parseSavedButterflies(
      JSON.stringify([{ ...a, palette: 'nope', settings: { slices: 99 } }]),
    )[0];
    expect(wild?.palette).toBe(PALETTES[0]?.id);
    expect(wild?.settings.slices).toBe(LIMITS.slices.max);
  });
});

describe('a background from the colour wheel', () => {
  it('lays over the palette and is kept with a saved tuning', () => {
    const pal = paletteById('gold');
    expect(withBg(pal, null)).toBe(pal);
    expect(withBg(pal, ['#112233', '#445566']).bg).toEqual(['#112233', '#445566']);
    expect(withBg(pal, ['#112233', '#445566']).ramp).toEqual(pal.ramp);
    const piece = PIECES[0] as (typeof PIECES)[number];
    const a = makeSavedButterfly(piece, 'gold', piece.settings, [], 1, ['#112233', '#445566']);
    expect(parseSavedButterflies(JSON.stringify([a]))[0]?.bg).toEqual(['#112233', '#445566']);
    const b = makeSavedButterfly(piece, 'gold', piece.settings, [], 1);
    expect(b.bg).toBeUndefined();
    expect(
      parseSavedButterflies(JSON.stringify([{ ...a, bg: ['red', 'blue'] }]))[0]?.bg,
    ).toBeUndefined();
  });

  it('only takes two hex colours', () => {
    expect(isBg(['#000000', '#ffffff'])).toBe(true);
    expect(isBg(['#000000'])).toBe(false);
    expect(isBg('nope')).toBe(false);
  });
});
