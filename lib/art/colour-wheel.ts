/*
 * The colour wheel's maths (components/ColourWheel.tsx): hue round the circle,
 * saturation from the centre out, and lightness on its own slider.
 * Pure: no DOM.
 */

export type Hsl = { h: number; s: number; l: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Hue 0..360, saturation and lightness 0..1, to 0..255 channels (fast: the wheel calls it per pixel). */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) [r, g] = [c, x];
  else if (hh < 2) [r, g] = [x, c];
  else if (hh < 3) [g, b] = [c, x];
  else if (hh < 4) [g, b] = [x, c];
  else if (hh < 5) [r, b] = [x, c];
  else [r, b] = [c, x];
  const to = (v: number) => Math.round(clamp01(v + m) * 255);
  return [to(r), to(g), to(b)];
}

/** Hue 0..360, saturation and lightness 0..1, to '#rrggbb'. */
export function hslToHex({ h, s, l }: Hsl): string {
  return `#${hslToRgb(h, s, l)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** '#rrggbb' to hue, saturation and lightness; black for anything else. */
export function hexToHsl(hex: string): Hsl {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { h: 0, s: 0, l: 0 };
  const n = Number.parseInt(m[1] as string, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: clamp01(s), l };
}

/**
 * A point on the wheel (pixels from its centre, y down) to hue and
 * saturation. Hue 0 is at the top and turns clockwise. Outside the rim it
 * keeps to the rim, so a drag past the edge still picks.
 */
export function pointToHueSat(x: number, y: number, radius: number): { h: number; s: number } {
  const h = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  return { h, s: clamp01(Math.hypot(x, y) / radius) };
}

/** Where a hue and saturation sit on the wheel, in pixels from its centre. */
export function hueSatToPoint(h: number, s: number, radius: number): { x: number; y: number } {
  const a = (h * Math.PI) / 180;
  return { x: Math.sin(a) * s * radius, y: -Math.cos(a) * s * radius };
}
