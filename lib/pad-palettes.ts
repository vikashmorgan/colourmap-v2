/**
 * Pad palettes — the colour sets a player picks for the Chill Machine pads
 * (and, later, the visuals). Earth keeps the original per-category colours;
 * every other palette gives each pad its own colour, walked in grid order so
 * neighbouring pads differ. Spec: docs/specs/chill-machine-public.md.
 */

export type PadPaletteId = 'earth' | 'rainbow' | 'warm' | 'cool' | 'pastel' | 'night';

export type PadPalette = {
  id: PadPaletteId;
  label: string;
  /** Pad colours, walked in grid order. Empty for Earth (category colours). */
  colors: readonly string[];
  /** Dark pads with light text when on. */
  dark?: boolean;
  /** Soft colours: pads fill with the full colour when on so they read on beige. */
  solid?: boolean;
};

export const PAD_PALETTES: readonly PadPalette[] = [
  { id: 'earth', label: 'Earth', colors: [] },
  {
    id: 'rainbow',
    label: 'Rainbow',
    colors: [
      '#E53935',
      '#FB8C00',
      '#FDD835',
      '#43A047',
      '#00ACC1',
      '#1E88E5',
      '#5E35B1',
      '#D81B60',
    ],
  },
  {
    id: 'warm',
    label: 'Warm',
    colors: ['#E8A33D', '#E0705A', '#D9576B', '#C98A2E', '#B5523B', '#E58F7A', '#C4A060'],
  },
  {
    id: 'cool',
    label: 'Cool',
    colors: ['#2A9D8F', '#3D5A98', '#5FA8D3', '#7B5EA7', '#3E8E9E', '#4F6DC2', '#8A7FC7'],
  },
  {
    id: 'pastel',
    label: 'Pastel',
    colors: ['#F2A7A7', '#F6C99A', '#EEDC8A', '#A9D8A4', '#9DD3DB', '#A8BFEA', '#C6AEE3'],
    solid: true,
  },
  {
    id: 'night',
    label: 'Night',
    colors: ['#1F3A5F', '#4B2A63', '#0F5257', '#6B1E3A', '#2D2F6B', '#5A3E1B', '#1E4D2B'],
    dark: true,
  },
];

export const DEFAULT_PAD_PALETTE: PadPaletteId = 'earth';
export const PAD_PALETTE_LS = 'colourmap:pad-palette';

export function getPadPalette(id: string | null | undefined): PadPalette {
  return PAD_PALETTES.find((p) => p.id === id) ?? PAD_PALETTES[0];
}

/** Colour for the pad at `index` in grid order; Earth falls back to its category colour. */
export function padColor(palette: PadPalette, index: number, categoryColor: string): string {
  if (palette.colors.length === 0) return categoryColor;
  return palette.colors[index % palette.colors.length];
}

/** Colours a palette shows in its swatch dot. */
export function paletteSwatch(palette: PadPalette, categoryColors: readonly string[]): string[] {
  return (palette.colors.length ? palette.colors : categoryColors).slice(0, 4);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Darkens `hex` until it reaches AA contrast (4.5:1) against `background`,
 * so pad labels stay readable in bright palettes like Pastel and Rainbow.
 */
export function readableInk(hex: string, background = '#FBF6EC'): string {
  let [r, g, b] = parseHex(hex);
  let ink = toHex(r, g, b);
  for (let i = 0; i < 20 && contrastRatio(ink, background) < 4.5; i++) {
    r *= 0.88;
    g *= 0.88;
    b *= 0.88;
    ink = toHex(r, g, b);
  }
  return ink;
}
