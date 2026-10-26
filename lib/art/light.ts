/*
 * LIGHT BODIES — a generative collection for the Art section (2026-10-26).
 *
 * The other ideas from the night of the butterflies (docs/specs/visual-references.md):
 * "not the buttefly but the eclipse and enlightement and light coour bubble stuff".
 * Three bodies of light, each its own shader (lib/art/light-shaders.ts):
 *
 *   eclipse   a black sun inside a painted ring of fire, flares reaching out and
 *             embers drifting off (reference 2)
 *   deity     Enlightenment: a seated figure of gold filament with six arms,
 *             light at the heart and crown, a beam, halo rings and sacred
 *             geometry, numbers orbiting; over time it meditates, prays and
 *             dances (reference 5)
 *   bubble    a wobbling drop of liquid light, its skin a soap film that keeps
 *             changing colour, with small drops around it (reference 4)
 *
 * Every piece shares one set of settings; each kind reads the ones it uses and
 * shows only those as sliders (KIND_SLIDERS), some under its own name.
 * Art first: once a piece holds up here it passes to the Geometry Builder and
 * the Chill Machine.
 *
 * Pure: no DOM except the two storage helpers at the end.
 */

import type { Palette } from './butterflies';

export { hexToRgb, rampUniform } from './butterflies';
export type { Palette };

export type LightKind = 'eclipse' | 'deity' | 'bubble';

export type LightSettings = {
  /** Overall speed. 0 is still. */
  speed: number;
  /** Size of the body. */
  size: number;
  /** How far its light reaches. */
  glow: number;
  /** Eclipse: how wild the fire is. Deity: light flowing in the body. Bubble: wobble. */
  flow: number;
  /** Eclipse: ring width. Deity: filament lines. Bubble: film bands. */
  detail: number;
  /** How fast the colours travel. */
  drift: number;
  /** Eclipse: cold touches in the fire. Bubble: film strength. */
  iris: number;
  /** Eclipse: flares. Deity: halo rings and sacred geometry. */
  corona: number;
  /** Eclipse: embers. Deity: motes of light. Bubble: specks. */
  sparks: number;
  /** Film grain. */
  grain: number;
  /** Deity: 0 meditating, 1 praying, 2 dancing (in between blends). */
  pose: number;
  /** Deity: how fast it moves on through the poses; 0 holds the pose. */
  cycle: number;
  /** Deity: rings of numbers orbiting. */
  numbers: number;
  /** Bubble: small drops around the big one. */
  count: number;
  /**
   * Eclipse: 0 the ring, 1 jets above and below, 2 rays pulsing out, 3 a
   * spectral halo, 4 pillars of colour up and down, 5 a vortex (ECLIPSE_STYLES).
   */
  style: number;
};

export type LightPiece = {
  slug: string;
  title: string;
  line: string;
  kind: LightKind;
  palette: string;
  settings: LightSettings;
};

/* The same shape as the butterflies' palettes: a background and a six-stop ramp. */
export const PALETTES: Palette[] = [
  {
    id: 'fire',
    label: 'Fire',
    bg: ['#0c0d12', '#050507'],
    ramp: ['#020203', '#fff4d6', '#ffc040', '#f06a1c', '#b8201a', '#2ab0d0'],
  },
  {
    id: 'corona',
    label: 'Corona',
    bg: ['#05070e', '#020306'],
    ramp: ['#010103', '#f4fbff', '#9ad8ff', '#4a7cf0', '#6a2ab0', '#ffb860'],
  },
  {
    id: 'blood',
    label: 'Blood moon',
    bg: ['#100606', '#040202'],
    ramp: ['#030101', '#ffe2c8', '#ff6a3a', '#c41a2a', '#5a0a2a', '#f0d040'],
  },
  {
    id: 'navy',
    label: 'Navy',
    bg: ['#13224a', '#081028'],
    ramp: ['#030512', '#fffbe8', '#ffe9a8', '#f2b84a', '#b86a2a', '#6ab0e0'],
  },
  {
    id: 'gold-light',
    label: 'Gold light',
    bg: ['#08060a', '#020203'],
    ramp: ['#fffaf0', '#ffe6a0', '#f0b850', '#c47a2a', '#6a3a1a', '#2a1a10'],
  },
  {
    id: 'silver',
    label: 'Silver',
    bg: ['#04060c', '#010204'],
    ramp: ['#ffffff', '#dcecff', '#9ab8e8', '#5a72c0', '#2a3270', '#0e1230'],
  },
  {
    id: 'aurora',
    label: 'Aurora',
    bg: ['#060410', '#020106'],
    ramp: ['#ffffff', '#ffd0f0', '#b080ff', '#40d0e0', '#40e090', '#1a2a50'],
  },
  {
    id: 'pearl-light',
    label: 'Pearl',
    bg: ['#f3f1f5', '#d8d4de'],
    ramp: ['#ffffff', '#f0e8f8', '#c8b8f0', '#80dccc', '#f4b8d8', '#9a90b0'],
  },
  {
    id: 'spectrum',
    label: 'Spectrum',
    bg: ['#2a1c46', '#0c0818'],
    ramp: ['#050308', '#fff6ea', '#ff8ad0', '#ffb050', '#5ae08a', '#4aa0ff'],
  },
  {
    id: 'painted',
    label: 'Painted',
    bg: ['#151925', '#090b11'],
    ramp: ['#06070c', '#fff4dc', '#ffcc3a', '#f0562a', '#3ab8e0', '#e8f4ff'],
  },
  {
    id: 'dusk',
    label: 'Dusk',
    bg: ['#3a4048', '#121418'],
    ramp: ['#030303', '#fff2dc', '#f0d8b0', '#e88a3a', '#a8401e', '#8aa0b0'],
  },
  {
    id: 'night-drop',
    label: 'Night drop',
    bg: ['#0a0c1c', '#02030a'],
    ramp: ['#ffffff', '#e8f0ff', '#a0b0ff', '#60e0d0', '#ff90c8', '#2a2a60'],
  },
];

export const BASE: LightSettings = {
  speed: 0.5,
  size: 1,
  glow: 0.5,
  flow: 0.5,
  detail: 0.5,
  drift: 0.2,
  iris: 0.3,
  corona: 0.5,
  sparks: 0.3,
  grain: 0.03,
  pose: 0,
  cycle: 0,
  numbers: 0,
  count: 0,
  style: 0,
};

export const PIECES: LightPiece[] = [
  {
    slug: 'burning-ring',
    title: 'Burning Ring',
    line: 'A black sun in a painted ring of fire',
    kind: 'eclipse',
    palette: 'fire',
    settings: {
      ...BASE,
      flow: 0.6,
      detail: 0.45,
      corona: 0.55,
      sparks: 0.6,
      iris: 0.25,
    },
  },
  {
    slug: 'blue-corona',
    title: 'Blue Corona',
    line: 'A cold eclipse, all flare and quiet',
    kind: 'eclipse',
    palette: 'corona',
    settings: {
      ...BASE,
      speed: 0.35,
      flow: 0.35,
      detail: 0.3,
      corona: 0.9,
      sparks: 0.25,
      iris: 0.4,
    },
  },
  {
    slug: 'blood-moon',
    title: 'Blood Moon',
    line: 'Wide fire and embers everywhere',
    kind: 'eclipse',
    palette: 'blood',
    settings: {
      ...BASE,
      speed: 0.6,
      size: 1.15,
      flow: 0.85,
      detail: 0.7,
      corona: 0.4,
      sparks: 0.9,
      iris: 0.15,
      grain: 0.06,
    },
  },
  /* 2026-10-26: "another mode for burning ring where the fire pulses out above
     and below", and "energy goes out in rayons like a pulse". */
  {
    slug: 'twin-jets',
    title: 'Twin Jets',
    line: 'The ring held still while its fire pulses out above and below',
    kind: 'eclipse',
    palette: 'fire',
    settings: { ...BASE, style: 1, flow: 0.55, detail: 0.4, corona: 0.65, sparks: 0.5, iris: 0.2 },
  },
  {
    slug: 'sun-rays',
    title: 'Sun Rays',
    line: 'A painted black sun, its light leaving in sharp pulsing rays',
    kind: 'eclipse',
    palette: 'navy',
    settings: {
      ...BASE,
      style: 2,
      speed: 0.45,
      flow: 0.3,
      detail: 0.25,
      corona: 0.7,
      sparks: 0.3,
      iris: 0,
      grain: 0.05,
    },
  },
  /* 2026-10-26, night: "see how energy shoots up and below on the eclipse and
     with colours as well. that but more symmetric centered" (Martin's
     screenshots, visual-references.md #13). */
  {
    slug: 'colour-pillar',
    title: 'Colour Pillar',
    line: 'A painted ring, its energy shooting straight up and down in streaks of colour',
    kind: 'eclipse',
    palette: 'painted',
    settings: { ...BASE, style: 4, flow: 0.5, detail: 0.85, corona: 0.7, sparks: 0.6, iris: 0.3 },
  },
  {
    slug: 'solar-beam',
    title: 'Solar Beam',
    line: 'A black sun in a fiery corona, one beam of light through it',
    kind: 'eclipse',
    palette: 'fire',
    settings: {
      ...BASE,
      style: 4,
      flow: 0.2,
      detail: 0.05,
      corona: 0.55,
      sparks: 0.2,
      iris: 0,
      glow: 0.7,
    },
  },
  {
    slug: 'dark-sun',
    title: 'Dark Sun',
    line: 'A thin white rim in a wide bloom of rainbow light',
    kind: 'eclipse',
    palette: 'spectrum',
    settings: {
      ...BASE,
      style: 3,
      flow: 0.4,
      detail: 0.1,
      corona: 0.7,
      sparks: 0.7,
      iris: 0,
      glow: 0.6,
    },
  },
  {
    slug: 'vortex',
    title: 'Vortex',
    line: 'Light spiralling round and into the black centre',
    kind: 'eclipse',
    palette: 'dusk',
    settings: {
      ...BASE,
      style: 5,
      flow: 0.5,
      detail: 0.4,
      corona: 0.6,
      sparks: 0.2,
      iris: 0,
      glow: 0.6,
    },
  },
  {
    slug: 'enlightenment',
    title: 'Enlightenment',
    line: 'Six arms of gold light, meditating, praying, dancing',
    kind: 'deity',
    palette: 'gold-light',
    settings: {
      ...BASE,
      speed: 0.6,
      detail: 0.6,
      flow: 0.5,
      corona: 0.7,
      sparks: 0.4,
      numbers: 0.7,
      cycle: 0.5,
    },
  },
  {
    slug: 'night-prayer',
    title: 'Night Prayer',
    line: 'Silver filament, hands together, the beam open',
    kind: 'deity',
    palette: 'silver',
    settings: {
      ...BASE,
      speed: 0.4,
      detail: 0.5,
      flow: 0.35,
      corona: 0.9,
      sparks: 0.25,
      numbers: 0.4,
      pose: 1,
    },
  },
  {
    slug: 'dance-of-light',
    title: 'Dance of Light',
    line: 'Every arm moving, colours running through the body',
    kind: 'deity',
    palette: 'aurora',
    settings: {
      ...BASE,
      speed: 0.8,
      detail: 0.75,
      flow: 0.8,
      drift: 0.5,
      corona: 0.5,
      sparks: 0.7,
      numbers: 1,
      pose: 2,
    },
  },
  {
    slug: 'opal-bubble',
    title: 'Opal Bubble',
    line: 'A drop of liquid light on a pale ground',
    kind: 'bubble',
    palette: 'pearl-light',
    settings: {
      ...BASE,
      speed: 0.45,
      flow: 0.55,
      detail: 0.5,
      iris: 0.85,
      glow: 0.6,
      sparks: 0,
      count: 0,
      grain: 0.015,
    },
  },
  {
    slug: 'night-bubble',
    title: 'Night Bubble',
    line: 'Soap-film colour in the dark, small drops around it',
    kind: 'bubble',
    palette: 'night-drop',
    settings: {
      ...BASE,
      speed: 0.5,
      size: 0.9,
      flow: 0.7,
      detail: 0.7,
      iris: 1,
      glow: 0.7,
      sparks: 0.4,
      count: 4,
    },
  },
];

export const paletteById = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? (PALETTES[0] as Palette);

export const pieceBySlug = (slug: string): LightPiece | undefined =>
  PIECES.find((p) => p.slug === slug);

type Limit = { min: number; max: number; step: number; label: string };

/** The bounds of every setting, for the sliders and for clamping. */
export const LIMITS: Record<keyof LightSettings, Limit> = {
  speed: { min: 0, max: 1.5, step: 0.05, label: 'Speed' },
  size: { min: 0.5, max: 1.6, step: 0.05, label: 'Size' },
  glow: { min: 0, max: 1, step: 0.05, label: 'Glow' },
  flow: { min: 0, max: 1, step: 0.05, label: 'Flow' },
  detail: { min: 0, max: 1, step: 0.05, label: 'Detail' },
  drift: { min: 0, max: 1, step: 0.05, label: 'Colour drift' },
  iris: { min: 0, max: 1, step: 0.05, label: 'Iridescence' },
  corona: { min: 0, max: 1, step: 0.05, label: 'Corona' },
  sparks: { min: 0, max: 1, step: 0.05, label: 'Sparks' },
  grain: { min: 0, max: 0.15, step: 0.01, label: 'Grain' },
  pose: { min: 0, max: 2, step: 0.05, label: 'Pose' },
  cycle: { min: 0, max: 1, step: 0.05, label: 'Move on' },
  numbers: { min: 0, max: 1, step: 0.05, label: 'Numbers' },
  count: { min: 0, max: 6, step: 1, label: 'Drops' },
  style: { min: 0, max: 5, step: 1, label: 'Style' },
};

export const SETTING_KEYS = Object.keys(LIMITS) as (keyof LightSettings)[];

/** The sliders each kind shows, and what it calls them. */
export const KIND_SLIDERS: Record<LightKind, { key: keyof LightSettings; label?: string }[]> = {
  eclipse: [
    { key: 'speed' },
    { key: 'size' },
    { key: 'detail', label: 'Ring' },
    { key: 'flow', label: 'Fire' },
    { key: 'corona', label: 'Flares' },
    { key: 'glow' },
    { key: 'iris', label: 'Cold fire' },
    { key: 'sparks', label: 'Embers' },
    { key: 'drift' },
    { key: 'grain' },
  ],
  deity: [
    { key: 'speed' },
    { key: 'pose' },
    { key: 'cycle' },
    { key: 'size' },
    { key: 'detail', label: 'Filaments' },
    { key: 'flow', label: 'Inner light' },
    { key: 'corona', label: 'Halo' },
    { key: 'numbers' },
    { key: 'glow' },
    { key: 'sparks', label: 'Motes' },
    { key: 'drift' },
    { key: 'grain' },
  ],
  bubble: [
    { key: 'speed' },
    { key: 'size' },
    { key: 'flow', label: 'Wobble' },
    { key: 'iris', label: 'Film' },
    { key: 'detail', label: 'Bands' },
    { key: 'glow', label: 'Shine' },
    { key: 'count' },
    { key: 'sparks', label: 'Specks' },
    { key: 'drift' },
    { key: 'grain' },
  ],
};

/** The eclipse's styles, by their number in `style`; chosen with buttons. */
export const ECLIPSE_STYLES = ['Ring', 'Jets', 'Rays', 'Halo', 'Pillar', 'Vortex'] as const;

/** A pose's name, for the pose slider. */
export function poseName(pose: number): string {
  const names = ['Meditating', 'Praying', 'Dancing'];
  return names[Math.round(Math.min(2, Math.max(0, pose)))] as string;
}

/** Settings kept inside their bounds; drops a whole number. */
export function clampSettings(s: LightSettings): LightSettings {
  const out = { ...s };
  for (const k of SETTING_KEYS) {
    const { min, max } = LIMITS[k];
    const v = Number.isFinite(s[k]) ? s[k] : BASE[k];
    const c = Math.min(max, Math.max(min, v));
    out[k] = k === 'count' || k === 'style' ? Math.round(c) : c;
  }
  return out;
}

/** A file name for a saved frame. */
export const frameName = (piece: LightPiece, paletteId: string): string =>
  `light-${piece.slug}${paletteId === piece.palette ? '' : `-${paletteId}`}.png`;

/* ── In the Geometry Builder (Stars tab) ────────────────────────────────── */

/*
 * 2026-10-26: "make sure all these art categories are in the art visual part
 * with stars etc... each by category". Each kind is its own builder mode (so
 * the shader is built once per kind) and its own category in the Stars tab:
 * Eclipse, Enlightenment, Light Bubble.
 */
export const LIGHT_BUILDER_MODES: Record<LightKind, string> = {
  eclipse: 'lighteclipse',
  deity: 'lightdeity',
  bubble: 'lightbubble',
};

/** The kind a builder mode draws, if it is one of them. */
export const kindOfBuilderMode = (mode: string): LightKind | undefined =>
  (Object.keys(LIGHT_BUILDER_MODES) as LightKind[]).find((k) => LIGHT_BUILDER_MODES[k] === mode);

/** The builder's shared sliders, as far as a light piece uses them. */
export type LightBuilderSliders = {
  symmetry: number;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
};

/* Symmetry is the one slider each kind reads differently: the eclipse's style,
   the figure's pose, the bubble's drops. */
const SYMMETRY_KEY: Record<LightKind, keyof LightSettings> = {
  eclipse: 'style',
  deity: 'pose',
  bubble: 'count',
};

/* Light (intensity) is the flares and halo, or the bubble's film. */
const INTENSITY_KEY: Record<LightKind, keyof LightSettings> = {
  eclipse: 'corona',
  deity: 'corona',
  bubble: 'iris',
};

/**
 * The builder's sliders for a piece: Speed is Speed, Glow is Flow (0..10),
 * Light is Flares, Halo or Film (0..10), Complexity is Detail (0..10),
 * Particles is Sparks (0..10), and Symmetry is Style, Pose or Drops.
 */
export const lightBuilderSliders = (p: LightPiece): LightBuilderSliders => ({
  symmetry: p.settings[SYMMETRY_KEY[p.kind]],
  complexity: p.settings.detail * 10,
  glow: p.settings.flow * 10,
  intensity: p.settings[INTENSITY_KEY[p.kind]] * 10,
  particles: p.settings.sparks * 10,
  breathSpeed: p.settings.speed,
});

/** A piece's full settings with the builder's sliders laid over them. */
export function lightBuilderSettings(
  slug: string | undefined,
  kind: LightKind,
  s: LightBuilderSliders,
): LightSettings {
  const found = slug ? pieceBySlug(slug) : undefined;
  const piece =
    found && found.kind === kind ? found : (PIECES.find((p) => p.kind === kind) as LightPiece);
  return clampSettings({
    ...piece.settings,
    [SYMMETRY_KEY[kind]]: s.symmetry,
    [INTENSITY_KEY[kind]]: s.intensity / 10,
    detail: s.complexity / 10,
    flow: s.glow / 10,
    sparks: s.particles / 10,
    speed: s.breathSpeed,
  });
}

/* ── Saved tunings ──────────────────────────────────────────────────────── */

/** A tuning saved from the full-screen viewer: every setting and the palette. */
export type SavedLight = {
  id: string;
  name: string;
  /** The piece it started from. */
  piece: string;
  palette: string;
  settings: LightSettings;
};

export const SAVED_LIGHT_KEY = 'colourmap:light-saved';

function parseSavedOne(raw: unknown): SavedLight | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== 'string' ||
    typeof r.name !== 'string' ||
    typeof r.piece !== 'string' ||
    typeof r.palette !== 'string'
  ) {
    return null;
  }
  const piece = pieceBySlug(r.piece);
  if (!piece || !r.settings || typeof r.settings !== 'object') return null;
  const s = r.settings as Record<string, unknown>;
  const settings = { ...piece.settings };
  for (const k of SETTING_KEYS) {
    if (typeof s[k] === 'number') settings[k] = s[k] as number;
  }
  return {
    id: r.id,
    name: r.name.slice(0, 60),
    piece: r.piece,
    palette: paletteById(r.palette).id,
    settings: clampSettings(settings),
  };
}

export function parseSavedLights(raw: string | null): SavedLight[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list)
      ? list.map(parseSavedOne).filter((b): b is SavedLight => b !== null)
      : [];
  } catch {
    return [];
  }
}

/** A new saved tuning, named after its piece with the next free number ("Blood Moon 2"). */
export function makeSavedLight(
  piece: LightPiece,
  palette: string,
  settings: LightSettings,
  saved: SavedLight[],
  now: number,
): SavedLight {
  const taken = new Set(saved.map((b) => b.name));
  let n = 1;
  while (taken.has(`${piece.title} ${n}`)) n++;
  return {
    id: `light-${now.toString(36)}`,
    name: `${piece.title} ${n}`,
    piece: piece.slug,
    palette,
    settings: { ...settings },
  };
}

export function readSavedLights(): SavedLight[] {
  try {
    return parseSavedLights(window.localStorage.getItem(SAVED_LIGHT_KEY));
  } catch {
    return [];
  }
}

export function writeSavedLights(saved: SavedLight[]): void {
  try {
    window.localStorage.setItem(SAVED_LIGHT_KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked: kept for this visit only.
  }
}
