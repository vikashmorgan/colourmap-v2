/**
 * Mandala: the shaders of the five Mandala pieces (components/geometry-mandala.ts).
 * Spec: docs/specs/geometry-field.md, "Mandala" (2026-11-27).
 *
 * Asked for 2026-11-27, from the gold mandala behind a Buddha portrait: "there is light pulsing
 * through it. Like a cracked mandala that evolves continuously although it has a shape that
 * reappears." Gold lines on black: rings, spokes, sawtooth stars, circuit-like traces and cracks,
 * folded into N-fold symmetry. Light runs out from the centre along the lines and leaks through the
 * cracks; the pattern drifts on a loop of LOOP seconds, so the same shape keeps coming back.
 *
 * One fragment shader per piece, from one source with `SCENE` defined:
 *   0 Circuit Mandala  rings, spokes, sawtooth teeth and circuit traces, light pulsing outward
 *   1 Cracked Mandala  a gold plate broken by cracks that shift and heal, light pouring through
 *   2 Living Mandala   the symmetry, the rings and the turns evolve, and return every loop
 *   3 Lotus of Light   layers of petals, each breathing, light flowing petal to petal
 *   4 Star Gate        nested triangles and hexagrams turning against each other, cracked between
 */

/** Seconds for the pattern to come back to where it started. */
export const LOOP = 48;

export const MANDALA_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Every float uniform the shader reads. */
export const MANDALA_FLOATS = [
  'uTime',
  'uLoop',
  'uLight',
  'uCrack',
  'uFold',
  'uSparks',
  'uExposure',
] as const;

const SOURCE = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;    // seconds, the pulses' clock
uniform float uLoop;    // 0..1 round the loop: the shape's clock
uniform float uLight;   // 0..1 how much light runs through the lines
uniform float uCrack;   // 0..1 how cracked
uniform float uFold;    // folds of the symmetry
uniform float uSparks;  // 0..1 gold dust
uniform float uExposure;

#define PI 3.14159265
#define TAU 6.28318531

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash2(vec2 p) {
  float n = hash(p);
  return vec2(n, hash(p + n + 17.17));
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// A thin line round distance d, w wide, in screen units.
float ln(float d, float w) { return smoothstep(w, 0.0, abs(d)); }

// The distance to the nearest Voronoi edge: the cracks. Seeds circle on the loop, so the cracks
// shift and come back.
float crackEdge(vec2 x, float phase) {
  vec2 n = floor(x), f = fract(x), mg = vec2(0), mr = vec2(0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash2(n + g);
    o = 0.5 + 0.38 * sin(phase + TAU * o);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = hash2(n + g);
    o = 0.5 + 0.38 * sin(phase + TAU * o);
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}

// Polar coordinates folded into n mirrored wedges: x the radius, y the angle from the wedge's middle.
vec2 fold(vec2 p, float n, float turn) {
  float a = atan(p.y, p.x) + turn;
  float s = TAU / n;
  a = mod(a + PI, s) - 0.5 * s;
  return vec2(length(p), abs(a));
}

// Light that runs out from the centre: a few soft fronts, each at its own speed.
float fronts(float r, float t) {
  float l = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float at = mod(t * (0.16 + 0.05 * fk) + fk * 0.53, 1.9) - 0.15;
    l += exp(-pow((r - at) * (7.0 - fk), 2.0)) * (1.0 - 0.25 * fk);
  }
  return l;
}

// The circuit: arcs, radial stubs and pads on a polar grid, inside a band of rings.
float circuit(vec2 fr, float cell, float seed, out float phase) {
  vec2 g = vec2(fr.y * fr.x, fr.x) / cell;
  vec2 c = floor(g), f = fract(g) - 0.5;
  float h = hash(c + seed);
  float h2 = hash(c + seed + 7.3);
  float w = 0.06;
  float v = 0.0;
  if (h < 0.34) v = ln(f.y, w) * step(abs(f.x), 0.5);
  else if (h < 0.52) v = ln(f.x, w) * step(abs(f.y), 0.5);
  else if (h < 0.62) v = max(ln(f.y, w) * step(f.x, 0.0), ln(f.x, w) * step(f.y, 0.0));
  if (h2 > 0.86) v = max(v, ln(length(f) - 0.16, w * 0.9));
  if (h2 > 0.95) v = max(v, smoothstep(0.1, 0.04, length(f)));
  phase = hash(c + seed + 3.1);
  return v;
}

vec3 gold(float x) {
  vec3 deep = vec3(0.30, 0.15, 0.04);
  vec3 mid = vec3(0.86, 0.56, 0.18);
  vec3 hot = vec3(1.0, 0.90, 0.66);
  return x < 0.5 ? mix(deep, mid, x * 2.0) : mix(mid, hot, (x - 0.5) * 2.0);
}

// One mandala layer: rings, spokes, teeth and circuit, seen through n folds.
// Returns (line strength, light on the lines).
vec2 mandala(vec2 p, float n, float turn, float breathe, float t) {
  vec2 fr = fold(p, n, turn);
  float r = fr.x, a = fr.y, s = TAU / n;
  float px = 1.6 / uRes.y;
  float lines = 0.0, glow = 0.0;
  float wave = fronts(r, t);

  // Rings, some doubled.
  for (int k = 0; k < 10; k++) {
    float fk = float(k);
    float rk = 0.16 + fk * 0.135 + 0.018 * sin(TAU * uLoop + fk * 1.7) * breathe;
    float wk = px * (fk == 3.0 || fk == 6.0 ? 1.8 : 1.0);
    float ring = ln(r - rk, wk) + 0.6 * ln(r - rk - 0.012, px) * step(mod(fk, 3.0), 0.5);
    lines += ring * (0.55 + 0.45 * step(fk, 7.5));
  }
  // Spokes on the wedge's middle and edge, between the inner and the outer rings.
  float span = smoothstep(0.14, 0.18, r) * smoothstep(1.62, 1.4, r);
  lines += ln(r * sin(a), px) * span * 0.9;
  lines += ln(r * sin(0.5 * s - a), px) * smoothstep(0.55, 0.6, r) * span * 0.6;
  // Sawtooth teeth: a star between two rings, and a smaller one further in.
  float tooth = 1.0 - a / (0.5 * s);
  lines += ln(r - (0.70 + 0.24 * tooth), px * 1.2) * step(0.68, r) * step(r, 0.96);
  lines += ln(r - (0.30 + 0.12 * (1.0 - tooth)), px) * step(0.29, r) * step(r, 0.43);
  // Circuit traces in two bands.
  float ph1, ph2;
  float c1 = circuit(fr, 0.034, 1.0, ph1) * step(0.97, r) * step(r, 1.2);
  float c2 = circuit(fr, 0.028, 5.0, ph2) * step(0.44, r) * step(r, 0.68);
  float c3 = circuit(fr, 0.04, 9.0, ph1) * step(1.24, r) * step(r, 1.55) * 0.8;
  float trace = c1 + c2 + c3;
  lines += trace * 0.8;
  // Pulses along each trace, at its own phase.
  float run = exp(-pow((fract(t * 0.35 + ph1 + ph2 * 0.3) - 0.5) * 9.0, 2.0));
  glow += trace * run * 0.9;
  glow += lines * wave;
  return vec2(lines, glow);
}

vec3 sparks(vec2 p, float t) {
  vec3 col = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float sc = 34.0 + float(k) * 41.0;
    vec2 g = p * sc;
    vec2 c = floor(g), f = fract(g) - 0.5;
    float h = hash(c + float(k) * 13.0);
    if (h > 0.9) {
      vec2 o = (hash2(c) - 0.5) * 0.6;
      float tw = 0.5 + 0.5 * sin(t * (1.0 + 2.0 * h) + h * 40.0);
      col += gold(0.75) * smoothstep(0.09, 0.0, length(f - o)) * tw * (0.6 - 0.25 * float(k));
    }
  }
  return col;
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - uRes) / uRes.y * 1.08;
  float r = length(p);
  float t = uTime;
  float loopA = TAU * uLoop;
  float n = max(4.0, floor(uFold + 0.5));
  float px = 1.6 / uRes.y;
  float lines = 0.0, glow = 0.0, leak = 0.0, plate = 0.0;

#if SCENE == 0
  // Circuit Mandala: the layer turns a little on the loop and comes back.
  vec2 m = mandala(p, n, 0.04 * sin(loopA), 1.0, t);
  lines = m.x; glow = m.y;
  float ce = crackEdge(fold(p, n, 0.0).xy * vec2(5.0, 9.0), loopA);
  float crack = ln(ce, 0.02) * smoothstep(0.3, 0.7, noise(p * 3.0 + 4.0)) * uCrack * smoothstep(1.55, 1.2, r);
  lines += crack * 0.5;
  leak = crack * (0.35 + fronts(r, t));
#elif SCENE == 1
  // Cracked Mandala: a gold plate in bands, broken by cracks the light pours through.
  vec2 fr = fold(p, n, 0.0);
  vec2 q = fr.x * vec2(cos(fr.y), sin(fr.y));
  float band = step(0.2, r) * step(r, 1.5) * step(0.5, fract(r * 3.7 + 0.15));
  plate = band * (0.16 + 0.1 * noise(q * 14.0));
  vec2 m = mandala(p, n, 0.0, 0.6, t);
  lines = m.x * 0.8; glow = m.y * 0.5;
  // The fractures ignore the symmetry, as a real crack would: warped Voronoi edges, two scales.
  vec2 wp = p + 0.12 * vec2(noise(p * 4.0 + 1.0), noise(p * 4.0 + 7.0)) + 0.04 * vec2(noise(p * 13.0), noise(p * 13.0 + 3.0));
  float e1 = crackEdge(wp * 3.2, loopA);
  float e2 = crackEdge(wp * 8.5 + 3.0, loopA * 2.0);
  float open = 0.5 + 0.5 * sin(loopA + r * 4.0);
  float core = ln(e1, 0.010 + 0.008 * open) + 0.7 * ln(e2, 0.008) * smoothstep(0.4, 0.7, noise(wp * 2.2));
  float halo = exp(-e1 * (40.0 - 18.0 * open)) * 0.5 + exp(-e2 * 60.0) * 0.25 * smoothstep(0.4, 0.7, noise(wp * 2.2));
  float mask = step(0.12, r) * smoothstep(1.6, 1.25, r) * (0.3 + 0.7 * uCrack);
  float crack = (core + halo) * mask;
  plate *= 1.0 - clamp(core * mask, 0.0, 1.0);
  lines += core * mask * 0.4;
  leak = crack * (0.5 + 0.9 * fronts(r, t * 0.8) + 0.2 * sin(t * 1.3 + r * 6.0));
#elif SCENE == 2
  // Living Mandala: two symmetries cross-fade, layers turn at whole turns per loop, rings breathe.
  float w = 0.5 + 0.5 * cos(loopA);
  vec2 a1 = mandala(p, n, loopA / n, 1.6, t);
  vec2 a2 = mandala(p, n + 4.0, -loopA / (n + 4.0), 1.6, t + 0.7);
  lines = mix(a2.x, a1.x, w); glow = mix(a2.y, a1.y, w);
  float ce = crackEdge(fold(p, n, loopA / n).xy * vec2(4.0, 7.0), loopA);
  float crack = ln(ce, 0.02) * smoothstep(0.35, 0.75, noise(p * 2.5 + 9.0)) * uCrack * smoothstep(1.55, 1.2, r);
  lines += crack * 0.45;
  leak = crack * (0.3 + fronts(r, t));
#elif SCENE == 3
  // Lotus of Light: rings of petals, each breathing at its own time, light passing outwards.
  float ang = atan(p.y, p.x);
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float nk = n * (1.0 + floor(fk / 2.0) * 0.5);
    float rk = 0.2 + fk * 0.21 + 0.02 * sin(loopA + fk);
    float turn = mod(fk, 2.0) * PI / nk;
    float pet = rk * (0.78 + 0.22 * abs(cos(0.5 * nk * (ang + turn))));
    float l = ln(r - pet, px * 1.3) + 0.5 * ln(r - pet * 0.93, px);
    // The petal's middle vein.
    vec2 fr = fold(p, nk, turn);
    l += 0.7 * ln(fr.x * sin(fr.y), px) * step(rk * 0.6, r) * step(r, pet);
    float beat = exp(-pow((fract(t * 0.18 - fk * 0.12) - 0.5) * 6.0, 2.0));
    lines += l;
    glow += l * beat * 1.4;
  }
  vec2 m = mandala(p, n * 2.0, 0.0, 0.5, t);
  lines += m.x * 0.25; glow += m.y * 0.2;
  float ce = crackEdge(p * 6.0, loopA);
  float crack = ln(ce, 0.018) * smoothstep(0.4, 0.8, noise(p * 2.0)) * uCrack * smoothstep(1.45, 1.1, r);
  lines += crack * 0.4; leak = crack * (0.25 + fronts(r, t));
#else
  // Star Gate: nested triangles and hexagrams, alternate ones turning the other way.
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    float sides = mod(fk, 2.0) < 0.5 ? 3.0 : 6.0;
    float dir = mod(fk, 2.0) < 0.5 ? 1.0 : -1.0;
    float turn = dir * loopA / sides * (1.0 + floor(fk / 2.0));
    float ap = 0.14 + fk * 0.11;
    for (int h = 0; h < 2; h++) {
      vec2 fr = fold(p, sides, turn + float(h) * PI / sides);
      float d = fr.x * cos(fr.y) - ap;
      float l = ln(d, px * 1.4) * smoothstep(1.5, 1.05, fr.x);
      lines += l * (1.0 - 0.15 * fk / 7.0);
      glow += l * fronts(fr.x, t + fk * 0.2) * 1.2;
      if (sides > 4.0) break;
    }
  }
  vec2 m = mandala(p, n, 0.0, 0.4, t);
  lines += m.x * 0.35; glow += m.y * 0.3;
  float ce = crackEdge(fold(p, n, 0.0).xy * vec2(5.0, 8.0), loopA);
  float crack = ln(ce, 0.022) * smoothstep(0.3, 0.7, noise(p * 3.0 + 2.0)) * uCrack * smoothstep(1.55, 1.2, r);
  lines += crack * 0.5; leak = crack * (0.4 + fronts(r, t));
#endif

  // Gold: dim lines, light running through them, light leaking from the cracks.
  float L = 0.25 + 0.75 * uLight;
  vec3 col = vec3(0.012, 0.009, 0.006);
  col += gold(0.25) * plate;
  col += gold(0.45) * clamp(lines, 0.0, 1.5) * 0.55;
  col += gold(0.8) * clamp(glow, 0.0, 2.0) * 0.9 * L;
  col += gold(0.95) * clamp(leak, 0.0, 2.0) * 1.1 * L;
  // A soft halo in the middle, breathing with the loop.
  col += gold(0.6) * exp(-r * r * 6.0) * (0.12 + 0.06 * sin(loopA * 2.0)) * L;
  col += sparks(p, t) * uSparks;
  // Darker towards the edges.
  col *= smoothstep(2.4, 0.6, r);
  col *= uExposure;
  gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
}
`;

export const MANDALA_SCENES = [
  'Circuit Mandala',
  'Cracked Mandala',
  'Living Mandala',
  'Lotus of Light',
  'Star Gate',
] as const;

export function mandalaFragment(scene: number): string {
  return `#define SCENE ${scene}\n${SOURCE}`;
}
