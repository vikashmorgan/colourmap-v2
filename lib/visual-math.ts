/**
 * Pure math for the Tunnels and Oils visual families in Geometry Field.
 * Kept free of three.js so it can be unit tested and reused by shaders' JS
 * side (palette derivation) and the line/point tunnel builders.
 */

export const PHI = 1.618033988749895;
export const GOLDEN_FRACTION = 0.618033988749895;
/** Golden angle in radians (~137.508°). */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

export type Rgb = [number, number, number];

/** Wrap `x` into [0, n). Works for negative inputs. */
export function wrap(x: number, n: number): number {
  return ((x % n) + n) % n;
}

/** Hermite smoothstep between two edges (edges may be reversed). */
export function smoothstepEdge(e0: number, e1: number, x: number): number {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Recycling depth for element `k` of `n`, flying toward the viewer as
 * `travel` grows. 0 = at the camera, n = at the vanishing point.
 */
export function recycledDepth(k: number, travel: number, n: number): number {
  return wrap(k - travel, n);
}

/**
 * The soft dive-in fade: born out of darkness at the far end, dissolving
 * before it reaches the camera, and fading on screen before the rim.
 * - `z` depth in [0, n)
 * - `rNorm` screen radius as a fraction of the field radius R
 */
export function tunnelFade(z: number, n: number, rNorm: number): number {
  const birth = 1 - smoothstepEdge(n * 0.55, n, z);
  const death = smoothstepEdge(0, 1.6, z);
  const rim = 1 - smoothstepEdge(0.72, 1.15, rNorm);
  return birth * death * rim;
}

/** Golden-ratio hue sequence in [0, 1): neighbours never clash, never repeat. */
export function goldenHue(k: number): number {
  return wrap(k * GOLDEN_FRACTION, 1);
}

/** Gielis superformula radius. Returns 0 for degenerate inputs. */
export function superformula(
  theta: number,
  m: number,
  n1: number,
  n2: number,
  n3: number,
  a = 1,
  b = 1,
): number {
  const t1 = Math.abs(Math.cos((m * theta) / 4) / a) ** n2;
  const t2 = Math.abs(Math.sin((m * theta) / 4) / b) ** n3;
  const sum = t1 + t2;
  if (sum === 0 || n1 === 0) return 0;
  const r = sum ** (-1 / n1);
  return Number.isFinite(r) ? r : 0;
}

/** Radius of a regular n-gon (circumradius 1) along angle theta. */
export function polygonRadius(theta: number, sides: number): number {
  const n = Math.max(3, Math.round(sides));
  const seg = TAU / n;
  const local = wrap(theta, seg) - seg / 2;
  return Math.cos(Math.PI / n) / Math.cos(local);
}

/**
 * Breathing Fourier wall: 1 + Σ (amp / j²) · sin(jθ + j·0.3·z + ω_j·phase).
 * Waves travel along the tube because the phase depends on depth.
 */
export function fourierRadius(theta: number, z: number, phase: number, amp: number): number {
  let r = 1;
  for (let j = 1; j <= 3; j++) {
    r += (amp / (j * j)) * Math.sin(j * theta + j * 0.3 * z + (0.6 + j * 0.37) * phase);
  }
  return r;
}

/**
 * Lissajous flight path of the tunnel centreline, relative to the camera,
 * so the nearest rings stay centred and the far ones swing: you steer.
 */
export function flightOffset(depth: number, travel: number, amount: number): [number, number] {
  const w = depth + travel;
  return [
    amount * (Math.sin(0.21 * w) - Math.sin(0.21 * travel)),
    amount * (Math.sin(0.16 * w + 1.1) - Math.sin(0.16 * travel + 1.1)),
  ];
}

/**
 * Parse '#rgb', '#rrggbb', 'rgb(...)' or 'rgba(...)' into 0..1 sRGB channels.
 * Unknown input falls back to black.
 */
export function parseCssColor(input: string): Rgb {
  const s = input.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    if (hex.length !== 6 || /[^0-9a-f]/i.test(hex)) return [0, 0, 0];
    const v = Number.parseInt(hex, 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return [0, 0, 0];
  const parts = m[1].split(',').map((p) => Number.parseFloat(p));
  if (parts.length < 3 || parts.slice(0, 3).some((p) => Number.isNaN(p))) return [0, 0, 0];
  return [clamp01(parts[0] / 255), clamp01(parts[1] / 255), clamp01(parts[2] / 255)];
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** RGB (0..1) → HSL (all 0..1). */
export function rgbToHsl([r, g, b]: Rgb): Rgb {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

/** HSL (all 0..1) → RGB (0..1). */
export function hslToRgb([h, s, l]: Rgb): Rgb {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const x = wrap(t, 1);
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

/** Rotate a colour's hue by `shift` turns, keeping saturation and lightness. */
export function shiftHue(rgb: Rgb, shift: number): Rgb {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([wrap(h + shift, 1), s, l]);
}

export interface PaletteSource {
  bg0: string;
  line: string;
  dots: string;
  rgb: [number, number, number];
}

/**
 * Four-stop oil palette (sRGB 0..1) from a Geometry Field palette:
 * deep ground → main colour → light highlight → a neighbouring hue.
 * The ground is lifted a little so oils never sit on pure black.
 */
export function oilPaletteStops(pal: PaletteSource): [Rgb, Rgb, Rgb, Rgb] {
  const main: Rgb = [pal.rgb[0] / 255, pal.rgb[1] / 255, pal.rgb[2] / 255];
  const ground = parseCssColor(pal.bg0).map((c, i) => c * 0.6 + main[i] * 0.12) as Rgb;
  const light = parseCssColor(pal.dots);
  const neighbour = shiftHue(main, 0.18);
  return [ground, main, light, neighbour];
}

/**
 * Advance a per-mode phase clock by real elapsed time × speed. Integrating
 * (instead of t·speed) keeps motion smooth while a journey eases the speed.
 * Large gaps (tab hidden, static motion) are clamped so nothing jumps.
 */
export function advancePhase(
  clock: { phase: number; last: number | null },
  t: number,
  speed: number,
): number {
  const dt = clock.last === null ? 0 : Math.min(100, Math.max(0, t - clock.last));
  clock.last = t;
  clock.phase += (dt / 1000) * speed;
  return clock.phase;
}
