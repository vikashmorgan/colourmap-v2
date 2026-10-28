import type { CSSProperties } from 'react';

/*
 * The art sliders' fill (app/globals.css, .art-slider): how far along the
 * value is, as the --fill the track's gradient runs up to.
 */

export type SliderSkin = 'sand' | 'magma';

/** How far `value` is between `min` and `max`, as a percentage, kept to 0..100. */
export function fillPercent(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/** The inline style that tells the track how far to fill. */
export const fillStyle = (value: number, min: number, max: number): CSSProperties =>
  ({ '--fill': `${fillPercent(value, min, max).toFixed(1)}%` }) as CSSProperties;

/** The class for an art slider in a skin. */
export const sliderClass = (skin: SliderSkin): string => `art-slider ${skin}`;
