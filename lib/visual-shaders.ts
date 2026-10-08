/**
 * Fragment shaders for the full-screen Geometry Field visuals: the shader
 * tunnels and the Oils family. One shared vertex shader; each mode is one
 * fragment string. `vP` is the pixel position in units of the field radius
 * R (|vP| = 1 is the classic rim), so every shader shares the same rim fade.
 *
 * Uniforms (set by components/geometry-visuals.ts):
 *   uTime     integrated phase (seconds × speed)
 *   uScale    pattern zoom (Symmetry slider on oils)
 *   uSym      arm/side count (Symmetry slider on tunnels)
 *   uLayers   detail: fbm octaves / fold iterations / blob count (Complexity)
 *   uRainbow  0..1 mix from the palette ramp toward a full spectrum (Glow)
 *   uSwirl    0..1 mode-specific extra (Particles slider)
 *   uBright   0..1 light (Colour slider)
 *   uC0..uC3  the four palette stops, linear RGB
 */

export const SHADER_VERTEX = /* glsl */ `
varying vec2 vP;
uniform float uSpan;
void main() {
  vP = position.xy * uSpan;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const COMMON = /* glsl */ `
varying vec2 vP;
uniform float uTime;
uniform float uScale;
uniform float uSym;
uniform float uLayers;
uniform float uRainbow;
uniform float uSwirl;
uniform float uBright;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;

const float TAU = 6.28318530718;

vec3 ramp(float x) {
  x = fract(x);
  vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.25, x));
  c = mix(c, uC2, smoothstep(0.25, 0.5, x));
  c = mix(c, uC3, smoothstep(0.5, 0.75, x));
  return mix(c, uC0, smoothstep(0.75, 1.0, x));
}

vec3 spectrum(float x) {
  return 0.5 + 0.5 * cos(TAU * (x + vec3(0.0, 0.33, 0.67)));
}

vec3 pal(float x) {
  return mix(ramp(x), spectrum(x) * 0.9, uRainbow);
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p, float octaves) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) break;
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Soft circular edge so every visual dissolves before the screen edge.
float rimFade(float r, float inner, float outer) {
  return 1.0 - smoothstep(inner, outer, r);
}
`;

/** Demoscene tunnel: (angle, 1/r) coordinates, glowing rings and ribs. */
const SHADER_TUNNEL = /* glsl */ `
void main() {
  vec2 p = vP;
  float r = length(p);
  float a = atan(p.y, p.x);
  float depth = 1.3 / max(r, 0.0008) + uTime * 0.9;
  float twist = uLayers * 0.12;
  float ang = a * uSym + depth * twist;

  float ring = pow(0.5 + 0.5 * cos(TAU * depth), 40.0);
  float rib = pow(0.5 + 0.5 * cos(ang), 40.0);
  float cell = floor(depth);
  vec3 tint = pal(fract(cell * 0.618034) * 0.5 + 0.18);
  vec3 col = tint * (ring * 1.8 + rib * 0.7 + 0.03);

  // Far fog hides the dense vanishing point; the core slider lights it.
  float fog = smoothstep(0.0, 0.32, r);
  col *= fog;
  col += uC2 * uSwirl * 0.035 / (r * r + 0.012);

  col *= rimFade(r, 0.72, 1.2) * (0.2 + uBright * 0.8);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Two families of logarithmic spirals: an Escher wormhole you zoom into. */
const LOG_SPIRAL = /* glsl */ `
void main() {
  vec2 p = vP;
  float r = length(p);
  float a = atan(p.y, p.x);
  float lr = log(max(r, 0.0008));
  float wind = 0.6 + uLayers * 0.22;
  float arms = max(1.0, uSym);

  float s1 = a * arms / TAU + lr * wind - uTime * 0.35;
  float s2 = a * arms / TAU - lr * wind * 0.62 - uTime * 0.22;
  float l1 = pow(0.5 + 0.5 * cos(TAU * s1), 30.0);
  float l2 = pow(0.5 + 0.5 * cos(TAU * s2), 30.0);

  float id = floor(s1) + floor(s2) * 7.0;
  vec3 fill = pal(fract(id * 0.618034)) * 0.1;
  vec3 col = fill + pal(fract(s1 * 0.1)) * l1 + pal(fract(s2 * 0.1 + 0.4)) * l2 * 0.8;

  col *= smoothstep(0.0, 0.18, r);
  col += uC2 * uSwirl * 0.03 / (r * r + 0.01);
  col *= rimFade(r, 0.72, 1.2) * (0.2 + uBright * 0.8);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Domain warping (fbm of fbm of fbm): the classic oil-projector look. */
const OIL_WARP = /* glsl */ `
void main() {
  vec2 p = vP * uScale;
  float t = uTime * 0.18;
  float oct = clamp(uLayers, 2.0, 8.0);
  vec2 q = vec2(fbm(p + vec2(0.0, t), oct), fbm(p + vec2(5.2, 1.3) - t, oct));
  float w = 2.5 + uSwirl * 3.5;
  vec2 s = vec2(
    fbm(p + w * q + vec2(1.7, 9.2) + 0.7 * t, oct),
    fbm(p + w * q + vec2(8.3, 2.8) - 0.5 * t, oct)
  );
  float f = fbm(p + w * s, oct);

  vec3 col = pal(f * 1.3 + length(q) * 0.55 + t * 0.04);
  col *= 0.25 + 1.25 * f * f + 0.35 * length(s);
  col = mix(col, uC2, smoothstep(0.62, 0.95, f) * 0.35);

  float r = length(vP);
  col *= mix(0.15, 1.0, rimFade(r, 0.9, 2.1)) * (0.3 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Iterated sine folding: liquid marble in a few lines. */
const RIPPLE_FOLD = /* glsl */ `
void main() {
  vec2 p = vP * uScale * 1.7;
  float t = uTime * 0.5;
  float amp = 0.45 + uSwirl * 0.5;
  for (int i = 1; i < 11; i++) {
    if (float(i) > uLayers) break;
    float fi = float(i);
    p.x += amp / fi * sin(fi * p.y + t + 0.3 * fi) + 0.6;
    p.y += amp / fi * sin(fi * p.x + t * 0.8 + 0.3 * fi + 1.6) - 0.6;
  }
  float v = 0.5 + 0.5 * sin(p.x + p.y);
  float v2 = 0.5 + 0.5 * cos(p.x * 0.7 - p.y * 0.5);
  vec3 col = pal(v * 0.75 + v2 * 0.25 + t * 0.02) * (0.3 + 0.95 * v);

  float r = length(vP);
  col *= mix(0.15, 1.0, rimFade(r, 0.9, 2.1)) * (0.3 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Thin-film interference: soap bubble / oil slick on dark water. */
const THIN_FILM = /* glsl */ `
void main() {
  vec2 p = vP * uScale;
  float t = uTime * 0.12;
  float oct = clamp(uLayers, 2.0, 8.0);
  vec2 warp = vec2(fbm(p * 0.8 + t, oct), fbm(p * 0.8 - t + 3.1, oct));
  float h = fbm(p * 0.7 + warp * (0.8 + uSwirl * 1.4) + vec2(t * 0.4, 0.0), min(oct, 4.0));

  // Interference per channel at ~650 / 510 / 440 nm.
  float bands = 1.6 + uScale * 0.8;
  vec3 film = 0.5 + 0.5 * cos(TAU * h * bands * vec3(1.0 / 0.65, 1.0 / 0.51, 1.0 / 0.44));
  vec3 tinted = pal(h * 2.0) * (0.4 + 0.8 * dot(film, vec3(0.333)));
  vec3 col = mix(tinted, film, uRainbow);
  col *= smoothstep(0.18, 0.55, h);

  float r = length(vP);
  col *= mix(0.12, 1.0, rimFade(r, 0.9, 2.1)) * (0.25 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Two immiscible coloured oils turning against each other in a lens circle. */
const TWO_OIL = /* glsl */ `
void main() {
  vec2 p = vP * uScale;
  float t = uTime * 0.14;
  float oct = clamp(uLayers, 2.0, 7.0);
  vec2 pa = rot(t * 0.35) * p;
  vec2 pb = rot(-t * 0.28) * p;
  float a = fbm(pa * 1.2 + fbm(pa + t, oct) * (1.2 + uSwirl * 1.6), oct);
  float b = fbm(pb * 1.0 + 3.7 + fbm(pb - t + 1.9, oct) * (1.2 + uSwirl * 1.6), oct);

  float ma = smoothstep(0.46, 0.53, a);
  float mb = smoothstep(0.49, 0.56, b);
  vec3 glass = mix(uC0, uC2, 0.12);
  vec3 col = glass;
  col = mix(col, pal(0.3 + a * 0.4), ma);
  col = mix(col, pal(0.72 + b * 0.3), mb * 0.85);
  col += uC2 * ma * mb * 0.35;
  // Dark meniscus lines where the oils meet the clear fluid.
  col *= 1.0 - 0.55 * exp(-abs(a - 0.495) * 70.0);
  col *= 1.0 - 0.45 * exp(-abs(b - 0.525) * 70.0);

  // Projected lens circle: the vintage light-show frame.
  float r = length(vP);
  col *= rimFade(r, 0.92, 1.3) * (0.3 + uBright * 1.15);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Metaballs rising and sinking: a lava lamp. */
const LAVA_LAMP = /* glsl */ `
void main() {
  vec2 p = vP / max(0.6, uScale * 0.7);
  float t = uTime * 0.25;
  float field = 0.0;
  float hue = 0.0;
  float count = clamp(uLayers + 2.0, 3.0, 12.0);
  for (int i = 0; i < 12; i++) {
    if (float(i) >= count) break;
    float fi = float(i);
    vec2 c = vec2(
      sin(t * (0.21 + fi * 0.031) + fi * 2.4) * 0.65,
      sin(t * (0.13 + fi * 0.023) + fi * 1.7) * 0.85
    );
    float rad = 0.2 + 0.07 * sin(fi * 3.1 + t * 0.4);
    vec2 d = p - c;
    float k = rad * rad / (dot(d, d) + 0.0004);
    field += k;
    hue += k * fi * 0.618034;
  }
  hue = fract(hue / max(field, 0.0001));
  float inside = smoothstep(0.85, 1.15, field);
  float halo = clamp(field * 0.35, 0.0, 1.0);

  vec3 ground = mix(uC0, uC1 * 0.25, 0.5 + 0.5 * vP.y * 0.4);
  vec3 wax = pal(hue * (0.35 + uSwirl * 0.65) + 0.3) * (0.7 + 0.5 * smoothstep(1.1, 2.6, field));
  vec3 col = ground + uC1 * halo * 0.25;
  col = mix(col, wax, inside);

  float r = length(vP);
  col *= mix(0.15, 1.0, rimFade(r, 0.9, 2.1)) * (0.3 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Rorschach oils: the plane is folded before the ink is drawn. Two mirrors
 * give the classic inkblot (left = right); more fold it into a kaleidoscope.
 * The ink keeps flowing, so the blot breathes like folded wet paint.
 */
const RORSCHACH = /* glsl */ `
void main() {
  vec2 p = vP;
  float folds = max(2.0, floor(uSym + 0.5));
  if (folds < 2.5) {
    p.x = abs(p.x);
  } else {
    float seg = TAU / folds;
    float a = mod(atan(p.y, p.x), seg);
    a = abs(a - seg * 0.5);
    p = vec2(cos(a), sin(a)) * length(p);
  }
  float t = uTime * 0.15;
  float oct = clamp(uLayers, 2.0, 8.0);
  vec2 q = p * 1.6 + vec2(0.0, t * 0.3);
  vec2 w = vec2(fbm(q + t, oct), fbm(q + 4.1 - t, oct));
  float ink = fbm(q * 1.2 + w * (1.5 + uSwirl * 2.5), oct);
  // Ink pools toward the fold, like paint pressed between paper.
  float pool = folds < 2.5 ? exp(-abs(vP.x) * 1.4) : exp(-length(vP) * 1.1);
  ink += pool * 0.28 - 0.12;

  float blot = smoothstep(0.47, 0.53, ink);
  float edge = smoothstep(0.43, 0.5, ink) - smoothstep(0.5, 0.57, ink);
  vec3 paper = mix(uC0, uC2 * 0.1, 0.5);
  vec3 inkCol = pal(ink * 1.6 + w.x * 0.5 + t * 0.03) * (0.55 + 0.8 * ink);
  vec3 col = mix(paper, inkCol, blot);
  col += uC2 * edge * 0.3;

  float r = length(vP);
  col *= mix(0.15, 1.0, rimFade(r, 0.9, 2.1)) * (0.3 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/*
 * Waves. The sea is drawn as thin parallel lines; "twirls" (a rotation that
 * fades with distance from a centre) bend those lines into curling lips, the
 * way Hokusai drew the claws of a breaking wave.
 */
const WAVE_COMMON = /* glsl */ `
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }

vec2 twirl(vec2 p, vec2 c, float strength, float radius) {
  vec2 d = p - c;
  float a = strength * exp(-dot(d, d) / (radius * radius));
  float cs = cos(a), sn = sin(a);
  return c + vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
}

// Antialiased line at every integer of v.
float waveLine(float v) {
  float d = abs(fract(v + 0.5) - 0.5);
  float fw = fwidth(v);
  return 1.0 - smoothstep(fw * 0.5, fw * 1.5 + 0.008, d);
}
`;

/**
 * Rolling Wave (freestyle): a few twirls ride an organic swell. Each one
 * curls up, travels, crashes into foam and lets go; its size, strength,
 * height and timing are drawn fresh every cycle, so the sea never repeats.
 */
const ROLLING_WAVE = /* glsl */ `
void main() {
  vec2 p = vP * 1.1;
  float t = uTime;
  vec2 q = p;
  float foam = 0.0;
  float n = clamp(uSym, 2.0, 6.0);
  for (int i = 0; i < 6; i++) {
    if (float(i) >= n) break;
    float fi = float(i);
    float period = 7.0 + fi * 2.3 + h1(fi) * 3.0;
    float u = t / period + h1(fi + 7.0);
    float cyc = floor(u);
    float life = fract(u);
    float seed = cyc * 13.0 + fi * 7.0;
    float rad = 0.22 + h1(seed + 2.0) * 0.25;
    float smax = 3.0 + h1(seed + 3.0) * 3.5;
    float env = sin(3.14159 * life);
    env *= env;
    vec2 c = vec2(
      -0.95 + h1(seed) * 0.8 + life * (0.7 + h1(seed + 5.0) * 0.5),
      -0.35 + h1(seed + 1.0) * 0.7 + 0.08 * sin(life * 3.14159)
    );
    // Negative = clockwise: the lip curls forward as the wave runs right.
    q = twirl(q, c, -smax * env, rad * (0.7 + 0.5 * life));
    float dc = length(p - c) / rad;
    foam += smoothstep(0.55, 1.0, life) * exp(-dc * dc * 1.5);
  }
  float swell = 0.09 * sin(1.6 * q.x + t * 0.5) + 0.05 * sin(3.3 * q.x - t * 0.37 + 1.3)
    + 0.03 * sin(5.1 * q.x + t * 0.8);
  float dens = 6.0 + uLayers * 1.4;
  float v = (q.y + swell) * dens + fbm(q * 1.5 + t * 0.05, 3.0) * 0.6 * uSwirl;
  float line = waveLine(v);
  float level = floor(v + 0.5);

  vec3 water = mix(uC0, uC1 * 0.3, 0.5 + 0.5 * sin(level * 0.7));
  vec3 col = water * 0.45 + pal(fract(level * 0.08) + 0.2) * line;
  float sparkle = smoothstep(0.55, 0.9, noise(p * 40.0 + t * 2.0));
  col += uC2 * clamp(foam, 0.0, 1.0) * (0.25 + 0.9 * sparkle);

  col *= rimFade(length(vP), 0.85, 1.25) * (0.3 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Fractal Wave (Hokusai + sacred numbers): the water is rings inside an
 * invisible circle. Big claws (Symmetry of them) roll around the circle;
 * each carries smaller claws placed by the golden angle and shrinking by the
 * golden ratio, so every curl holds smaller curls, like Hokusai's foam.
 */
const FRACTAL_WAVE = /* glsl */ `
void main() {
  vec2 p = vP * 1.05;
  float t = uTime;
  const float PHI = 1.6180339887;
  const float GA = 2.39996323;
  float claws = clamp(uSym, 1.0, 6.0);
  float kids = clamp(floor(uLayers * 0.8) + 1.0, 2.0, 8.0);
  vec2 q = p;
  float foam = 0.0;
  for (int m = 0; m < 6; m++) {
    if (float(m) >= claws) break;
    float fm = float(m);
    float ang = t * 0.12 + fm * TAU / claws;
    vec2 c0 = 0.48 * vec2(cos(ang), sin(ang));
    float breathe = 0.75 + 0.25 * sin(t * 0.5 + fm * PHI * 2.0);
    float rad0 = 0.34;
    q = twirl(q, c0, -4.2 * breathe, rad0);
    for (int k = 1; k < 9; k++) {
      if (float(k) > kids) break;
      float fk = float(k);
      float sc = pow(PHI, -fk * 0.6);
      float a = fk * GA + ang + t * 0.25;
      vec2 ck = c0 + vec2(cos(a), sin(a)) * rad0 * 1.1 * pow(PHI, -fk * 0.35);
      float sk = -4.0 * breathe * (0.8 + 0.2 * sin(t * 0.7 + fk * PHI));
      float rk = rad0 * sc * 0.8;
      q = twirl(q, ck, sk, rk);
      vec2 dk = p - ck;
      foam += exp(-dot(dk, dk) / (rk * rk * 0.08)) * 0.5;
    }
  }
  float dens = 7.0 + uLayers * 1.2;
  float v = length(q) * dens - t * 0.4 + fbm(q * 2.0 + t * 0.03, 3.0) * 0.4 * uSwirl;
  float line = waveLine(v);
  float level = floor(v + 0.5);

  vec3 water = mix(uC0, uC1 * 0.3, 0.5 + 0.5 * sin(level * 0.9));
  vec3 col = water * 0.45 + pal(fract(level * 0.07) + 0.15) * line;
  col += uC2 * clamp(foam, 0.0, 1.0) * 0.8;

  // The circle is never drawn; it only sets where the sea ends.
  col *= rimFade(length(vP), 0.8, 1.02) * (0.3 + uBright * 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const SHADER_FRAGMENTS = {
  shadertunnel: COMMON + SHADER_TUNNEL,
  logspiral: COMMON + LOG_SPIRAL,
  oilwarp: COMMON + OIL_WARP,
  ripplefold: COMMON + RIPPLE_FOLD,
  thinfilm: COMMON + THIN_FILM,
  twooil: COMMON + TWO_OIL,
  lavalamp: COMMON + LAVA_LAMP,
  rorschach: COMMON + RORSCHACH,
  rollingwave: COMMON + WAVE_COMMON + ROLLING_WAVE,
  fractalwave: COMMON + WAVE_COMMON + FRACTAL_WAVE,
} as const;

export type ShaderVisualMode = keyof typeof SHADER_FRAGMENTS;

export const SHADER_UNIFORM_NAMES = [
  'uTime',
  'uScale',
  'uSym',
  'uLayers',
  'uRainbow',
  'uSwirl',
  'uBright',
  'uC0',
  'uC1',
  'uC2',
  'uC3',
] as const;

/** Full-screen colour fields: these dial bloom down and skip the star floor. */
export const OIL_MODES = [
  'oilwarp',
  'ripplefold',
  'thinfilm',
  'twooil',
  'lavalamp',
  'rorschach',
] as const;

export function isShaderVisualMode(mode: string): mode is ShaderVisualMode {
  return Object.hasOwn(SHADER_FRAGMENTS, mode);
}

export function isOilMode(mode: string): boolean {
  return (OIL_MODES as readonly string[]).includes(mode);
}
