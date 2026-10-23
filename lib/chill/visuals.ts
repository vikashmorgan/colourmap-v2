/**
 * Chill visual settings — the Look (mode, colours, shape sliders) and Echo
 * the player picks under the visualizer. Saved in the browser like the pad
 * palette. Spec: docs/specs/chill-machine-public.md → Visuals and Echo.
 */

import type { VisualizerMode } from '@/components/AtomVisualizer';
import { getPadPalette, PAD_PALETTES, type PadPaletteId } from '@/lib/pad-palettes';

import { DEFAULT_ECHO, type EchoSettings, parseEcho } from './echo';

export const VISUALIZER_MODES: readonly VisualizerMode[] = [
  'atom',
  'fibonacci',
  'phyllotaxis',
  'wave',
  'lissajous',
  'constellation',
  'helix',
  'tunnel',
  'morph',
  'saturn',
  'galaxy',
  'orbital',
  'solar',
];

/** The visualizer's original warm dot colours — what Earth shows. */
export const EARTH_VISUAL_PALETTE: readonly string[] = [
  '#E0908A',
  '#E8B568',
  '#C4A060',
  '#B33A2B',
  '#D4805A',
  '#9B6BA0',
  '#88C8E8',
  '#7AAA58',
];

export type ChillVisualSettings = {
  mode: VisualizerMode;
  /** 'match' follows the pad palette. */
  colors: 'match' | PadPaletteId;
  /** 0–1 shape sliders, passed straight to AtomVisualizer. */
  speed: number;
  density: number;
  scale: number;
  opacity: number;
  depth3d: number;
  echo: EchoSettings;
};

export const DEFAULT_VISUALS: ChillVisualSettings = {
  mode: 'atom',
  colors: 'match',
  speed: 0.5,
  density: 0.5,
  scale: 0.5,
  opacity: 1,
  depth3d: 0,
  echo: DEFAULT_ECHO,
};

export const VISUALS_LS = 'colourmap:chill-visuals';

function unit(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

/** Validates anything (parsed JSON) into full visual settings, filling gaps from defaults. */
export function parseVisuals(raw: unknown): ChillVisualSettings {
  const v = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_VISUALS;
  const mode = VISUALIZER_MODES.find((m) => m === v.mode) ?? d.mode;
  const colors =
    v.colors === 'match' ? 'match' : (PAD_PALETTES.find((p) => p.id === v.colors)?.id ?? d.colors);
  return {
    mode,
    colors,
    speed: unit(v.speed, d.speed),
    density: unit(v.density, d.density),
    scale: unit(v.scale, d.scale),
    opacity: unit(v.opacity, d.opacity),
    depth3d: unit(v.depth3d, d.depth3d),
    echo: parseEcho(v.echo),
  };
}

export function loadVisuals(): ChillVisualSettings {
  try {
    const raw = localStorage.getItem(VISUALS_LS);
    return parseVisuals(raw ? JSON.parse(raw) : null);
  } catch {
    return parseVisuals(null);
  }
}

export function saveVisuals(settings: ChillVisualSettings): void {
  try {
    localStorage.setItem(VISUALS_LS, JSON.stringify(settings));
  } catch {
    // Private mode / quota — visuals just won't persist.
  }
}

/** Dot colours for the visualizer: the chosen palette, or the pad palette when matching. */
export function resolveVisualPalette(
  settings: Pick<ChillVisualSettings, 'colors'>,
  padPalette: PadPaletteId,
): string[] {
  const palette = getPadPalette(settings.colors === 'match' ? padPalette : settings.colors);
  return [...(palette.colors.length ? palette.colors : EARTH_VISUAL_PALETTE)];
}
