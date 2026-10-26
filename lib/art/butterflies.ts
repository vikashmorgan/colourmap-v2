/*
 * LIQUID BUTTERFLIES — a generative collection for the Art section (2026-10-25).
 *
 * Martin pinned three images of one style (credited on Pinterest to Martin
 * Naumann): a soft glowing form coloured like a heat map, cut into vertical
 * strips where each strip shows the form a moment later. Then: "i want a
 * collection of almost liquid butterfly in constant change and transformation.
 * with symmetry. and psychedelic echo effects or slices like a constantly
 * flowing evolving pool of colour around the butterfly theme."
 *
 * So each piece is a butterfly, mirrored left to right, that never holds still:
 *
 *   flow     the space it sits in is warped by slow noise, so it moves like liquid
 *   flap     the wings fold toward you and open again
 *   morph    the wings swell and change shape
 *   slices   strips from the centre outward, each a moment later (the pins' idea)
 *   echoes   rings of colour that keep leaving the wings
 *   pool     the background is a flowing pool in the piece's own colours
 *   fold     1 is the mirror only; more folds it round like a kaleidoscope
 *   drift    the colours travel through the ramp, so nothing stays one colour
 *   iris     soap-film colour on the wings, shifting like oil (the
 *            iridescent-drop reference)
 *   sparks   embers drifting off the rim (from the eclipse reference)
 *
 * The technique is taken, never the pieces: our own shapes and palettes, drawn
 * live by a shader (`components/ButterflyCanvas.tsx`).
 *
 * Pure: no DOM.
 */

export type Palette = {
  id: string;
  label: string;
  /** Background, top and bottom. */
  bg: [string, string];
  /** Core → inner → rim → glow → glow → outer glow. */
  ramp: [string, string, string, string, string, string];
};

export type ButterflySettings = {
  /** Strips of time from the centre out; 0 for none. */
  slices: number;
  /** How far apart in time the strips are. */
  delay: number;
  /** Rings of colour leaving the wings; 0 for none. */
  echoes: number;
  /** How fast the colours travel. */
  drift: number;
  /** How liquid the space is. */
  flow: number;
  /** How far the wings fold. */
  flap: number;
  /** How much the wings change shape. */
  morph: number;
  /** 1: mirror only. 2 to 8: folded round like a kaleidoscope. */
  fold: number;
  /** Size of the butterfly. */
  size: number;
  /** How far the glow reaches. */
  glow: number;
  /** How strong the flowing pool of colour behind is. */
  pool: number;
  /** Overall speed. 0 is still. */
  speed: number;
  /** Soap-film iridescence on the wings. */
  iris: number;
  /** Embers drifting off the rim. */
  sparks: number;
  /** Film grain. */
  grain: number;
  /** The core design, by its number in FORMS: butterfly, flower, heart, volcano, mountains, thangka, circle, sacred, island, digital, lens, diamond, portal, orb. */
  form: number;
  /** Petals of the flower, and of the thangka's lotus ring. */
  petals: number;
};

/** The core designs a piece can be built on, by their number in `form`. */
export const FORMS = [
  'Butterfly',
  'Flower',
  'Heart',
  'Volcano',
  'Mountains',
  'Thangka',
  'Circle',
  'Sacred',
  'Island',
  'Digital',
  'Lens',
  'Diamond',
  'Portal',
  'Orb',
] as const;

/** Whether a design uses the petals setting. */
export const usesPetals = (form: number): boolean => form === 1 || form === 5;

export type Piece = {
  slug: string;
  title: string;
  line: string;
  palette: string;
  settings: ButterflySettings;
};

export const PALETTES: Palette[] = [
  {
    id: 'thermal',
    label: 'Thermal',
    // Warm ground (Martin, 2026-10-26: "a warm background for the first preset").
    bg: ['#f4b26a', '#9c2f45'],
    ramp: ['#4258cc', '#30388a', '#2a1a2e', '#d8361c', '#f08a2a', '#f7d27a'],
  },
  {
    id: 'neon',
    label: 'Neon',
    bg: ['#1c1c0c', '#3a1a36'],
    ramp: ['#ff8a3a', '#ff78a8', '#f070e8', '#a060ff', '#5a5aff', '#2a2a7a'],
  },
  {
    id: 'acid',
    label: 'Acid',
    bg: ['#3a1212', '#b82428'],
    ramp: ['#3a62d0', '#5ac8c0', '#c8f040', '#a8e030', '#e05040', '#8a1a2a'],
  },
  {
    id: 'pearl',
    label: 'Pearl',
    bg: ['#1c1426', '#2a0f24'],
    ramp: ['#f2f4ec', '#9ad4c0', '#3a9a86', '#f08a6a', '#d0507a', '#4a1838'],
  },
  {
    id: 'gold',
    label: 'Gold',
    bg: ['#1a120a', '#3a2412'],
    ramp: ['#fff2cc', '#f0d080', '#c4a060', '#a0602a', '#6a3418', '#2a160a'],
  },
  {
    id: 'eclipse',
    label: 'Eclipse',
    bg: ['#0e1118', '#07080c'],
    ramp: ['#020205', '#06060c', '#fff1cc', '#ffb030', '#e0401c', '#2aa8c8'],
  },
  {
    id: 'thangka',
    label: 'Thangka',
    bg: ['#3a0e12', '#160a1e'],
    ramp: ['#fff1c8', '#f2c14a', '#d8402a', '#2a6ac8', '#2a9a6a', '#1a1030'],
  },
  {
    // After Martin's screenshots (2026-10-26): navy-black cores, red, orange and
    // peach, a cold fringe, on a dark warm-brown ground.
    id: 'lens',
    label: 'Lens',
    bg: ['#2b1d24', '#160f14'],
    ramp: ['#0b0a12', '#1d2c80', '#d93a26', '#f28a36', '#f4c08c', '#2a1c26'],
  },
  {
    // After Martin's fourth screenshot: a pastel orb, pink and lavender clouds.
    id: 'dream',
    label: 'Dream',
    bg: ['#a294e0', '#c77ac4'],
    ramp: ['#ff3d96', '#ff6ab8', '#7aa4ff', '#fbf6b0', '#9cefe6', '#a48ae6'],
  },
  {
    id: 'opal',
    label: 'Opal',
    bg: ['#f0eff2', '#d9d6de'],
    ramp: ['#efe4f6', '#c9b4f2', '#6adcc4', '#f6f4fa', '#e6e3ea', '#dcd9e0'],
  },
  {
    id: 'deep',
    label: 'Deep sea',
    bg: ['#06121e', '#14304a'],
    ramp: ['#e0fff8', '#60e0d0', '#1a6a8a', '#2a3a9a', '#6a3ac0', '#1a1a4a'],
  },
];

const BASE: ButterflySettings = {
  slices: 0,
  delay: 0.3,
  echoes: 0,
  drift: 0.3,
  flow: 0.35,
  flap: 0.5,
  morph: 0.4,
  fold: 1,
  size: 1,
  glow: 0.07,
  pool: 0.3,
  speed: 0.6,
  iris: 0,
  sparks: 0,
  grain: 0.04,
  form: 0,
  petals: 8,
};

export const PIECES: Piece[] = [
  {
    slug: 'thermal-monarch',
    title: 'Thermal Monarch',
    line: 'Eight moments of one flight, side by side, hot at the heart',
    palette: 'thermal',
    settings: { ...BASE, slices: 8, delay: 0.35, pool: 0.2 },
  },
  {
    slug: 'neon-psyche',
    title: 'Neon Psyche',
    line: 'Rings of light keep leaving the wings and never stop',
    palette: 'neon',
    settings: { ...BASE, echoes: 6, drift: 0.5, flow: 0.5, pool: 0.5 },
  },
  {
    slug: 'acid-morpho',
    title: 'Acid Morpho',
    line: 'Sliced thin, fourteen beats of a wing in acid colour',
    palette: 'acid',
    settings: { ...BASE, slices: 14, delay: 0.18, echoes: 2, flow: 0.4 },
  },
  {
    slug: 'pearl-moth',
    title: 'Pearl Moth',
    line: 'A pale moth melting slowly into its own echoes',
    palette: 'pearl',
    settings: { ...BASE, echoes: 4, drift: 0.25, flow: 0.25, flap: 0.35, pool: 0.3, speed: 0.4 },
  },
  {
    slug: 'golden-swallowtail',
    title: 'Golden Swallowtail',
    line: 'The app gold, liquid, in six slow steps',
    palette: 'gold',
    settings: { ...BASE, slices: 6, delay: 0.5, echoes: 3, flow: 0.3 },
  },
  {
    slug: 'deep-kaleido',
    title: 'Deep Kaleido',
    line: 'Six butterflies folded into one flowing flower',
    palette: 'deep',
    settings: { ...BASE, fold: 6, echoes: 5, flow: 0.6, pool: 0.6, size: 0.8 },
  },
  {
    slug: 'eclipse',
    title: 'Eclipse',
    line: 'A butterfly of void inside a burning ring, shedding embers',
    palette: 'eclipse',
    settings: {
      ...BASE,
      flow: 0.15,
      flap: 0.3,
      morph: 0.3,
      glow: 0.09,
      pool: 0,
      sparks: 0.7,
      drift: 0.1,
      size: 1.1,
    },
  },
  {
    slug: 'opal-drop',
    title: 'Opal Drop',
    line: 'Liquid glass wings on pale paper, every colour of a soap film',
    palette: 'opal',
    settings: {
      ...BASE,
      flow: 0.55,
      morph: 0.6,
      iris: 0.9,
      glow: 0.05,
      pool: 0,
      drift: 0.2,
      speed: 0.45,
      grain: 0.02,
    },
  },

  /* Liquid Forms (2026-10-26): "flower. volcano. mountains. butterfly. heart as
     different core designs", and "a tangka one … where it plays with geometry". */
  {
    slug: 'thermal-lotus',
    title: 'Thermal Lotus',
    line: 'A lotus opening and closing on a warm ground, rings leaving its petals',
    palette: 'thermal',
    settings: { ...BASE, form: 1, petals: 8, echoes: 4, flow: 0.4, flap: 0.5, pool: 0.25 },
  },
  {
    slug: 'opal-bloom',
    title: 'Opal Bloom',
    line: 'Twelve petals of liquid glass, every colour of a soap film',
    palette: 'opal',
    settings: {
      ...BASE,
      form: 1,
      petals: 12,
      iris: 0.9,
      glow: 0.05,
      pool: 0,
      flow: 0.5,
      morph: 0.5,
      speed: 0.45,
      grain: 0.02,
    },
  },
  {
    slug: 'liquid-heart',
    title: 'Liquid Heart',
    line: 'A heart that beats slowly and sends out its echoes',
    palette: 'neon',
    settings: { ...BASE, form: 2, echoes: 5, drift: 0.4, flow: 0.4, flap: 0.6, pool: 0.4 },
  },
  {
    slug: 'volcano',
    title: 'Volcano',
    line: 'Lava rising out of the crater in slow liquid blobs, embers drifting',
    palette: 'eclipse',
    settings: {
      ...BASE,
      form: 3,
      flap: 0.8,
      morph: 0.4,
      sparks: 0.6,
      glow: 0.09,
      pool: 0.1,
      drift: 0.15,
      size: 1.1,
    },
  },
  {
    slug: 'golden-peaks',
    title: 'Golden Peaks',
    line: 'A ridge of mountains with echoes rolling off the peaks',
    palette: 'gold',
    settings: { ...BASE, form: 4, echoes: 4, flow: 0.25, morph: 0.6, glow: 0.05, pool: 0.35 },
  },
  {
    slug: 'thangka',
    title: 'Thangka',
    line: 'A mandala of light: palace, gates and a turning lotus, in liquid echoes',
    palette: 'thangka',
    settings: {
      ...BASE,
      form: 5,
      petals: 8,
      echoes: 5,
      flow: 0.3,
      morph: 0.4,
      glow: 0.06,
      pool: 0.35,
      drift: 0.25,
    },
  },

  /* 2026-10-26, later: "1 is this psychedelic circle … 2 is this sacred geometry
     of colour … 3 is this digital mountains … flying island volcano stuff". */
  {
    slug: 'psychedelic-circle',
    title: 'Psychedelic Circle',
    line: 'A breathing circle drowning in its own rings of colour',
    palette: 'acid',
    settings: {
      ...BASE,
      form: 6,
      echoes: 7,
      drift: 0.6,
      flow: 0.55,
      morph: 0.6,
      pool: 0.6,
      iris: 0.25,
    },
  },
  {
    slug: 'sacred-geometry',
    title: 'Sacred Geometry',
    line: 'The flower of life in lines of colour, slowly turning',
    palette: 'thangka',
    settings: {
      ...BASE,
      form: 7,
      echoes: 4,
      drift: 0.4,
      flow: 0.25,
      morph: 0.4,
      glow: 0.05,
      pool: 0.4,
    },
  },
  {
    slug: 'floating-island',
    title: 'Floating Island',
    line: 'A volcano on a rock hanging in the air, lava rising, stones drifting',
    palette: 'thermal',
    settings: {
      ...BASE,
      form: 8,
      flap: 0.7,
      morph: 0.5,
      sparks: 0.5,
      glow: 0.08,
      pool: 0.15,
      drift: 0.15,
      size: 1.05,
    },
  },
  {
    slug: 'digital-peaks',
    title: 'Digital Peaks',
    line: 'Mountains drawn in light, a scan rising through them',
    palette: 'deep',
    settings: {
      ...BASE,
      form: 9,
      echoes: 3,
      drift: 0.35,
      flow: 0.2,
      morph: 0.5,
      glow: 0.05,
      pool: 0.4,
    },
  },

  /* 2026-10-26, night: three screenshots Martin took "to develop a butterfly
     type of visual. but a different preset of it" (visual-references.md, 12). */
  {
    slug: 'lens-butterfly',
    title: 'Lens Butterfly',
    line: 'A fan of wings opening inside a lens, rainbow at every edge',
    palette: 'lens',
    settings: {
      ...BASE,
      form: 10,
      iris: 0.2,
      echoes: 4,
      glow: 0.02,
      pool: 0.05,
      flow: 0.2,
      flap: 0.5,
      grain: 0.06,
    },
  },
  {
    slug: 'sliced-diamond',
    title: 'Sliced Diamond',
    line: 'A breathing diamond cut into five moments, side by side',
    palette: 'lens',
    settings: {
      ...BASE,
      form: 11,
      slices: 5,
      delay: 0.5,
      flap: 0.8,
      echoes: 0,
      iris: 0.1,
      glow: 0.06,
      pool: 0.05,
      flow: 0.1,
      grain: 0.06,
    },
  },
  {
    slug: 'portal',
    title: 'Portal',
    line: 'Doorways inside doorways, drawing you further in',
    palette: 'lens',
    settings: {
      ...BASE,
      form: 12,
      iris: 0.25,
      echoes: 3,
      glow: 0.02,
      pool: 0.05,
      flow: 0.15,
      grain: 0.05,
      speed: 0.5,
    },
  },
  {
    slug: 'dream-orb',
    title: 'Dream Orb',
    line: 'Pink and lavender clouds in a sphere of light, mirrored on its horizon',
    palette: 'dream',
    settings: {
      ...BASE,
      form: 13,
      pool: 0.85,
      iris: 0.7,
      glow: 0.03,
      flow: 0.6,
      drift: 0.15,
      speed: 0.35,
      grain: 0.07,
    },
  },
];

export const paletteById = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? (PALETTES[0] as Palette);

export const pieceBySlug = (slug: string): Piece | undefined => PIECES.find((p) => p.slug === slug);

type Limit = { min: number; max: number; step: number; label: string };

/** The bounds of every setting, for the sliders and for clamping. */
export const LIMITS: Record<keyof ButterflySettings, Limit> = {
  flow: { min: 0, max: 1, step: 0.05, label: 'Liquid' },
  flap: { min: 0, max: 1, step: 0.05, label: 'Flap' },
  morph: { min: 0, max: 1, step: 0.05, label: 'Morph' },
  slices: { min: 0, max: 16, step: 1, label: 'Slices' },
  delay: { min: 0.05, max: 1, step: 0.05, label: 'Slice delay' },
  echoes: { min: 0, max: 10, step: 1, label: 'Echoes' },
  drift: { min: 0, max: 1, step: 0.05, label: 'Colour drift' },
  pool: { min: 0, max: 1, step: 0.05, label: 'Pool' },
  fold: { min: 1, max: 8, step: 1, label: 'Kaleido' },
  size: { min: 0.5, max: 1.6, step: 0.05, label: 'Size' },
  glow: { min: 0.02, max: 0.3, step: 0.01, label: 'Glow' },
  speed: { min: 0, max: 1.5, step: 0.05, label: 'Speed' },
  iris: { min: 0, max: 1, step: 0.05, label: 'Iridescence' },
  sparks: { min: 0, max: 1, step: 0.05, label: 'Embers' },
  grain: { min: 0, max: 0.15, step: 0.01, label: 'Grain' },
  form: { min: 0, max: FORMS.length - 1, step: 1, label: 'Design' },
  petals: { min: 3, max: 16, step: 1, label: 'Petals' },
};

/** Every setting. */
export const SETTING_KEYS = Object.keys(LIMITS) as (keyof ButterflySettings)[];

/** The settings shown as sliders; the design is chosen with buttons. */
export const SLIDER_KEYS = SETTING_KEYS.filter((k) => k !== 'form');

/** The sliders for a design: petals only where there are petals. */
export const slidersFor = (form: number): (keyof ButterflySettings)[] =>
  SLIDER_KEYS.filter((k) => k !== 'petals' || usesPetals(form));

const WHOLE: (keyof ButterflySettings)[] = ['slices', 'echoes', 'fold', 'form', 'petals'];

/** Settings kept inside their bounds; counts and the design whole numbers. */
export function clampSettings(s: ButterflySettings): ButterflySettings {
  const out = { ...s };
  for (const k of SETTING_KEYS) {
    const { min, max } = LIMITS[k];
    const v = Number.isFinite(s[k]) ? s[k] : BASE[k];
    const c = Math.min(max, Math.max(min, v));
    out[k] = WHOLE.includes(k) ? Math.round(c) : c;
  }
  return out;
}

/** '#rrggbb' (or '#rgb') to 0..1 channels. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The six ramp colours as one flat list, for the shader's vec3 array. */
export const rampUniform = (p: Palette): number[] => p.ramp.flatMap(hexToRgb);

/** A file name for a saved frame. */
export const frameName = (piece: Piece, paletteId: string): string =>
  `liquid-butterfly-${piece.slug}${paletteId === piece.palette ? '' : `-${paletteId}`}.png`;

/* ── In the Geometry Builder (Stars tab, "Liquid Butterflies") ─────────── */

/** The Geometry Builder mode that draws a piece. */
export const BUILDER_MODE = 'liquidbutterfly';

/** The piece's preset name in the builder ("Eclipse" is already taken there). */
export const builderPresetName = (p: Piece): string => BUILDER_NAMES[p.slug] ?? p.title;

/* Names already taken by other builder presets. */
const BUILDER_NAMES: Record<string, string> = {
  eclipse: 'Eclipse Butterfly',
  volcano: 'Liquid Volcano',
  thangka: 'Liquid Thangka',
};

/** The builder's shared sliders, as far as a butterfly uses them. */
export type BuilderSliders = {
  symmetry: number;
  complexity: number;
  glow: number;
  breathSpeed: number;
  intensity: number;
  particles: number;
};

/**
 * The builder's sliders for a piece. Kaleido is Symmetry, Slices is
 * Complexity, Echoes is Particles, Liquid is Glow and Morph is Light (both
 * 0..10), Speed is Speed.
 */
export const builderSliders = (p: Piece): BuilderSliders => ({
  symmetry: p.settings.fold,
  complexity: p.settings.slices,
  particles: p.settings.echoes,
  glow: p.settings.flow * 10,
  intensity: p.settings.morph * 10,
  breathSpeed: p.settings.speed,
});

/** A piece's full settings with the builder's sliders laid over them. */
export function builderSettings(slug: string | undefined, s: BuilderSliders): ButterflySettings {
  const piece = (slug && pieceBySlug(slug)) || (PIECES[0] as Piece);
  return clampSettings({
    ...piece.settings,
    fold: s.symmetry,
    slices: s.complexity,
    echoes: s.particles,
    flow: s.glow / 10,
    morph: s.intensity / 10,
    speed: s.breathSpeed,
  });
}

/* ── Saved tunings ("also make that u can save presets for the butterfly") ── */

/** A tuning saved from the full-screen viewer: every setting and the palette. */
export type SavedButterfly = {
  id: string;
  name: string;
  /** The piece it started from. */
  piece: string;
  palette: string;
  settings: ButterflySettings;
  /** A background chosen on the colour wheel, top and bottom, over the palette's own. */
  bg?: [string, string];
};

export const SAVED_BUTTERFLIES_KEY = 'colourmap:butterfly-saved';

function parseSavedOne(raw: unknown): SavedButterfly | null {
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
    if (typeof s[k] === 'number')
      (settings as Record<string, number | boolean>)[k] = s[k] as number;
  }
  return {
    id: r.id,
    name: r.name.slice(0, 60),
    piece: r.piece,
    palette: paletteById(r.palette).id,
    settings: clampSettings(settings),
    ...(isBg(r.bg) ? { bg: r.bg } : {}),
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Two '#rrggbb' colours, as a custom background is kept. */
export const isBg = (v: unknown): v is [string, string] =>
  Array.isArray(v) && v.length === 2 && v.every((c) => typeof c === 'string' && HEX.test(c));

/** The palette with a custom background laid over it, if there is one. */
export const withBg = (p: Palette, bg?: [string, string] | null): Palette =>
  bg ? { ...p, bg } : p;

export function parseSavedButterflies(raw: string | null): SavedButterfly[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list)
      ? list.map(parseSavedOne).filter((b): b is SavedButterfly => b !== null)
      : [];
  } catch {
    return [];
  }
}

/** A new saved tuning, named after its piece with the next free number ("Eclipse 2"). */
export function makeSavedButterfly(
  piece: Piece,
  palette: string,
  settings: ButterflySettings,
  saved: SavedButterfly[],
  now: number,
  bg?: [string, string] | null,
): SavedButterfly {
  const taken = new Set(saved.map((b) => b.name));
  let n = 1;
  while (taken.has(`${piece.title} ${n}`)) n++;
  return {
    id: `bfly-${now.toString(36)}`,
    name: `${piece.title} ${n}`,
    piece: piece.slug,
    palette,
    settings: { ...settings },
    ...(bg ? { bg } : {}),
  };
}

export function readSavedButterflies(): SavedButterfly[] {
  try {
    return parseSavedButterflies(window.localStorage.getItem(SAVED_BUTTERFLIES_KEY));
  } catch {
    return [];
  }
}

export function writeSavedButterflies(saved: SavedButterfly[]): void {
  try {
    window.localStorage.setItem(SAVED_BUTTERFLIES_KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked: kept for this visit only.
  }
}
