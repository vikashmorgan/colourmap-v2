/*
 * The flame tool (docs/specs/geometry-field.md, "Fire", 2026-11-16): a reusable flame that can be
 * dropped anywhere, at any size, in any full-screen shader. No three.js, no DOM.
 *
 * A flame is a plain object (`Flame`): where its base sits, how big it is, how it moves and what
 * colour it burns. `packFlames` writes a list of them into the uniform arrays the GLSL half of the
 * tool reads (lib/art/flame-shaders.ts, `FLAME_GLSL`), which draws each one as:
 *
 * - a body: a teardrop (round base, pointed tip) or a wall (a wide front of tongues), eaten away
 *   by rising, buoyant noise (domain-warped fBm scrolling upward, stretched vertically), so the
 *   tongues lick and break off at the top;
 * - a colour from a blackbody ramp: the hot core near the base, cooling to orange and red at the
 *   tips, its brightness growing with temperature (roughly T³);
 * - a blue root: the chemiluminescent zone where air mixes in, bowl-shaped and brightest at the
 *   edge, which on a gas flame becomes the whole flame with a crisp cyan inner cone;
 * - a soft halo, added in light, that the renderer's bloom lifts further.
 *
 * Embers (rising sparks) and Smoke (a plume) are separate emitters with their own uniforms.
 *
 * Units: screen units, the view's height is 1 and y points up. Times in seconds; temperatures in
 * kelvin.
 */

export interface Flame {
  /** Base of the flame (bottom centre), screen units. */
  x: number;
  y: number;
  /** Width at the widest point and height to the tip, screen units. */
  width: number;
  height: number;
  /** How much the noise breaks the body into tongues: 0 a smooth teardrop, 1.5 a roaring blaze. */
  turbulence: number;
  /** How fast the tongues climb, in flame heights a second (small flames are quicker). */
  rise: number;
  /** Wind lean: how far the tip is pushed sideways, in flame heights (negative leans left). */
  lean: number;
  /** Phase, so neighbouring flames never move in step. */
  seed: number;
  /** Colour temperature of the hottest part, kelvin: ~1900 deep orange, 2600 yellow, 3400 white-hot. */
  coreK: number;
  /** Share of blue chemiluminescent light, 0–1: 0 a wood fire, 0.3 a candle's root, 1 a gas flame. */
  blue: number;
  /** Soot glow (the yellow body), 0–1: a gas flame has almost none. */
  luminous: number;
  /** Overall light; the flicker rides on it. */
  brightness: number;
  /** 'drop' is one tongue; 'wall' a wide front whose height varies across it. */
  shape: 'drop' | 'wall';
  /** For a wall: how many tall tongues across its width. */
  tongues: number;
  /** Draw order: 0 behind the scene's middle ground, 1 in front of it. */
  layer: 0 | 1;
  /** The soft glow round the flame. */
  halo: number;
}

export const MAX_FLAMES = 20;

export const FLAME_DEFAULTS: Flame = {
  x: 0,
  y: 0,
  width: 0.08,
  height: 0.24,
  turbulence: 0.5,
  rise: 1.6,
  lean: 0,
  seed: 0,
  coreK: 2500,
  blue: 0.2,
  luminous: 1,
  brightness: 1,
  shape: 'drop',
  tongues: 6,
  layer: 1,
  halo: 0.3,
};

/** Colour sets for a flame: blackbody temperature, blue share and soot glow. */
export type FlamePalette = Pick<Flame, 'coreK' | 'blue' | 'luminous'>;

export const FLAME_PALETTES = {
  /** A match or a lighter: blue root, yellow body, orange tips. */
  match: { coreK: 2700, blue: 0.35, luminous: 1 },
  /** A candle: small blue root, yellow-orange body, white-hot core. */
  candle: { coreK: 3000, blue: 0.28, luminous: 1 },
  /** A gas burner: blue and cyan, almost no yellow. */
  gas: { coreK: 2200, blue: 1, luminous: 0.04 },
  /** Burning wood: red, orange and yellow, no blue. */
  wood: { coreK: 2350, blue: 0.04, luminous: 1 },
  /** A blaze: deeper red and orange with yellow cores. */
  blaze: { coreK: 2150, blue: 0, luminous: 1 },
  /** White-hot: a forge or magnesium. */
  whiteHot: { coreK: 3800, blue: 0.1, luminous: 1 },
} satisfies Record<string, FlamePalette>;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** A flame with defaults filled in and every value kept in its range. */
export function flame(f: Partial<Flame> = {}): Flame {
  const o = { ...FLAME_DEFAULTS, ...f };
  return {
    ...o,
    width: Math.max(1e-4, o.width),
    height: Math.max(1e-4, o.height),
    turbulence: clamp(o.turbulence, 0, 2),
    rise: Math.max(0, o.rise),
    lean: clamp(o.lean, -1.5, 1.5),
    coreK: clamp(o.coreK, 1000, 6500),
    blue: clamp(o.blue, 0, 1),
    luminous: clamp(o.luminous, 0, 1.5),
    brightness: Math.max(0, o.brightness),
    tongues: Math.max(1, o.tongues),
    halo: Math.max(0, o.halo),
  };
}

/* ── Packing for the shader ────────────────────────────────── */

/** The four vec4 arrays the shader reads (see FLAME_GLSL for the layout). */
export interface FlamePack {
  a: Float32Array;
  b: Float32Array;
  c: Float32Array;
  d: Float32Array;
  count: number;
}

export function emptyPack(): FlamePack {
  const n = MAX_FLAMES * 4;
  return {
    a: new Float32Array(n),
    b: new Float32Array(n),
    c: new Float32Array(n),
    d: new Float32Array(n),
    count: 0,
  };
}

/**
 * Writes up to MAX_FLAMES flames into the pack:
 * a = (x, y, width, height), b = (turbulence, rise, lean, seed),
 * c = (coreK, blue, luminous, brightness), d = (shape, tongues, layer, halo).
 * Flames with no light are skipped; the rest are zeroed so a shorter list leaves nothing behind.
 */
export function packFlames(flames: readonly Flame[], out: FlamePack = emptyPack()): FlamePack {
  out.a.fill(0);
  out.b.fill(0);
  out.c.fill(0);
  out.d.fill(0);
  let n = 0;
  for (const f of flames) {
    if (n >= MAX_FLAMES) break;
    if (f.brightness <= 0 || f.height <= 0 || f.width <= 0) continue;
    const i = n * 4;
    out.a.set([f.x, f.y, f.width, f.height], i);
    out.b.set([f.turbulence, f.rise, f.lean, f.seed], i);
    out.c.set([f.coreK, f.blue, f.luminous, f.brightness], i);
    out.d.set([f.shape === 'wall' ? 1 : 0, f.tongues, f.layer, f.halo], i);
    n++;
  }
  out.count = n;
  return out;
}

/* ── Embers and smoke ──────────────────────────────────────── */

export interface Embers {
  /** Where they leave from: a strip x0..x1 at height y0. */
  x0: number;
  x1: number;
  y0: number;
  /** How high they climb before they die out. */
  height: number;
  /** Share of places holding an ember, 0–1 (0 = none). */
  density: number;
  /** Ember radius, screen units (never drawn under ~1.2 pixels). */
  size: number;
  /** Sideways drift at the top, in climb heights. */
  wind: number;
  /** Climb speed, screen units a second. */
  rise: number;
  /** Temperature of a fresh ember, kelvin; it cools to dull red as it climbs. */
  hotK: number;
}

export const NO_EMBERS: Embers = {
  x0: 0,
  x1: 0,
  y0: 0,
  height: 1,
  density: 0,
  size: 0.002,
  wind: 0,
  rise: 0.2,
  hotK: 2400,
};

export interface Smoke {
  /** Where the plume starts and how big it gets. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Thickness, 0–1.5 (0 = none). */
  amount: number;
  /** Sideways drift at the top, in plume heights. */
  wind: number;
  /** Climb speed, in plume heights a second. */
  rise: number;
  /** A lazy S-curl as it rises, 0–1. */
  curl: number;
}

export const NO_SMOKE: Smoke = {
  x: 0,
  y: 0,
  width: 0.1,
  height: 0.4,
  amount: 0,
  wind: 0,
  rise: 0.1,
  curl: 0,
};

/* ── Colour ────────────────────────────────────────────────── */

/**
 * The colour of a blackbody at `kelvin`, as sRGB 0–1 (Tanner Helland's fit, good from 1000 K to
 * 40000 K). Brightness is left out: the shader scales it with temperature. FLAME_GLSL's `bb()` is
 * the same fit.
 */
export function blackbody(kelvin: number): [number, number, number] {
  const t = clamp(kelvin, 1000, 40000) / 100;
  const r = t <= 66 ? 1 : clamp(1.292936 * (t - 60) ** -0.1332047592, 0, 1);
  const g =
    t <= 66
      ? clamp((99.4708025861 * Math.log(t) - 161.1195681661) / 255, 0, 1)
      : clamp(1.129890861 * (t - 60) ** -0.0755148492, 0, 1);
  const b =
    t >= 66
      ? 1
      : t <= 19
        ? 0
        : clamp((138.5177312231 * Math.log(t - 10) - 305.0447927307) / 255, 0, 1);
  return [r, g, b];
}

/* ── Lookup data for the shader ────────────────────────────── */

export const RAMP_SIZE = 256;
export const RAMP_MIN_K = 800;
export const RAMP_MAX_K = 6500;

/**
 * The blackbody ramp as an RGBA8 strip of RAMP_SIZE texels from RAMP_MIN_K to RAMP_MAX_K. Each
 * texel holds the square root of the linear colour, which the shader squares back, so the dim
 * reds keep their precision.
 */
export function blackbodyRamp(): Uint8Array {
  const out = new Uint8Array(RAMP_SIZE * 4);
  for (let i = 0; i < RAMP_SIZE; i++) {
    const k = RAMP_MIN_K + ((RAMP_MAX_K - RAMP_MIN_K) * i) / (RAMP_SIZE - 1);
    const c = blackbody(k);
    for (let j = 0; j < 3; j++) out[i * 4 + j] = Math.round(255 * Math.sqrt(c[j] ** 2.2));
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** A 256x256 RGBA8 random texture (seeded, so every run looks the same) for the shader's noise. */
export function flameNoiseData(size = 256): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  let s = 0x9e3779b9;
  for (let i = 0; i < out.length; i++) {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    out[i] = (s >>> 0) & 255;
  }
  return out;
}

/* ── Flicker ───────────────────────────────────────────────── */

function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}

/**
 * Smooth flicker in -1..1: three octaves of value noise, so a flame breathes and gutters without
 * ever jumping from one frame to the next. `t` in seconds; `rate` is roughly the changes a second.
 */
export function flicker(t: number, seed = 0, rate = 4): number {
  const x = t * rate + seed * 17.13;
  const v = noise1(x) * 0.55 + noise1(x * 2.07 + 5.1) * 0.3 + noise1(x * 4.31 + 9.7) * 0.15;
  return v * 2 - 1;
}
