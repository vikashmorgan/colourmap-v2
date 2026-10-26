/*
 * The Light Bodies fragment shaders (lib/art/light.ts), one per kind, shared by
 * the collection's canvas (components/LightCanvas.tsx). GLSL ES 1.0, so they
 * run on any phone; three.js ShaderMaterial accepts them as they are.
 *
 * Pixel space comes from gl_FragCoord and uRes (the drawing-buffer size), so
 * the same code works on a bare canvas and inside three's render passes.
 * Every shader declares the same uniforms; each reads the ones it needs.
 */

import type { LightKind } from './light';

export const LIGHT_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const LIGHT_UNIFORMS = [
  'uRes',
  'uTime',
  'uSize',
  'uGlow',
  'uFlow',
  'uDetail',
  'uDrift',
  'uIris',
  'uCorona',
  'uStreaks',
  'uSparks',
  'uGrain',
  'uPose',
  'uCycle',
  'uNumbers',
  'uCount',
  'uShift',
  'uBg0',
  'uBg1',
  'uRamp',
] as const;

const COMMON = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSize;
uniform float uGlow;
uniform float uFlow;
uniform float uDetail;
uniform float uDrift;
uniform float uIris;
uniform float uCorona;
uniform float uStreaks;
uniform float uSparks;
uniform float uGrain;
uniform float uPose;
uniform float uCycle;
uniform float uNumbers;
uniform float uCount;
uniform float uShift;
uniform vec3 uBg0;
uniform vec3 uBg1;
uniform vec3 uRamp[6];

const float TAU = 6.2831853;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 ramp(float g) {
  vec3 col = uRamp[0];
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (g >= fi && g <= fi + 1.0) col = mix(uRamp[i], uRamp[i + 1], g - fi);
  }
  if (g > 5.0) col = uRamp[5];
  return col;
}

// Walks lo..hi and back, so drifting colour never jumps.
float pingpong(float x, float lo, float hi) {
  float w = hi - lo;
  return lo + w - abs(mod(x, 2.0 * w) - w);
}

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec2 screen() { return (gl_FragCoord.xy - 0.5 * uRes) / uRes.y; }

vec3 backdrop(vec2 p) { return mix(uBg0, uBg1, smoothstep(0.0, 1.0, 0.5 - p.y)); }

// Glitch: thin columns near the centre line, each its own height and flicker.
vec3 streaks(vec3 col, vec2 p, float amount, float width) {
  if (amount <= 0.0) return col;
  float ax = abs(p.x);
  float ci = floor(ax / 0.006);
  float hc = hash(vec2(ci, 3.1));
  float reach = 0.15 + 0.45 * hash(vec2(ci, floor(uTime * 2.0 + hc * 9.0)));
  float on = step(0.45, hc) * smoothstep(width, 0.0, ax) * smoothstep(reach, reach * 0.4, abs(p.y));
  vec3 sc = mix(ramp(1.0), ramp(2.0 + 2.0 * hash(vec2(ci, 7.0))), 0.5);
  return mix(col, sc, amount * on * 0.85);
}

// Points of light in a few grid cells, twinkling, drifting up; near weights where.
vec3 sparks(vec3 col, vec2 p, float amount, float near, float tone) {
  if (amount <= 0.0) return col;
  vec2 cp = p * 34.0 + vec2(0.0, -uTime * 0.6);
  vec2 cell = floor(cp);
  float hs = hash(cell);
  vec2 at = cell + 0.5 + 0.35 * vec2(sin(hs * 40.0), cos(hs * 30.0));
  float ember = smoothstep(0.16, 0.0, length(cp - at)) * step(0.88, hs);
  float tw = 0.5 + 0.5 * sin(uTime * 4.0 + hs * 60.0);
  return col + ramp(tone + hs * 1.5) * ember * near * tw * amount * 1.4;
}

vec3 grain(vec3 col) { return col + (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrain; }
`;

/*
 * ECLIPSE. A black disc; round it a ring painted with a brush: its width and
 * edge are broken by noise sampled round the circle (so there is no seam), its
 * colour runs white at the rim through gold and orange to red, with cold
 * touches where a second noise peaks. Flares are rays of noise reaching out.
 */
const ECLIPSE = `${COMMON}
void main() {
  vec2 p = screen();
  float t = uTime;
  float ph = t * uDrift * 0.5 + uShift;
  float R = 0.22 * uSize;
  float r = length(p);
  float a = atan(p.y, p.x);
  vec2 ang = vec2(cos(a), sin(a));
  float off = r - R;

  float n1 = fbm(ang * 2.5 + vec2(t * 0.12, -t * 0.08) + r * 3.0);
  float n2 = fbm(ang * (3.0 + 6.0 * uFlow) + vec2(-t * 0.2, t * 0.15) + r * (6.0 + 8.0 * uFlow));
  float width = R * (0.12 + 0.55 * uDetail) * (0.55 + 0.9 * n1);
  float u = (off + (n2 - 0.5) * 0.07 * uFlow * uSize) / max(width, 1e-3);

  vec3 col = backdrop(p);

  float rays = fbm(ang * 7.0 + vec2(t * 0.05, -t * 0.03) + vec2(0.0, r * 1.5));
  float reach = R * (0.25 + 0.9 * uGlow);
  float out1 = max(off, 0.0);
  col += ramp(3.0) * exp(-out1 / (R * 0.12 * (0.4 + uGlow))) * 0.5;
  col += mix(ramp(2.5), ramp(4.0), 0.4) * uCorona * pow(rays, 2.6) * 2.2 * exp(-out1 / reach) * step(0.0, off);

  float edge = 1.0 - smoothstep(0.55, 1.0 + 0.35 * n2, u);
  float brush = smoothstep(0.22, 0.5, n2 + 0.45 * (1.0 - u));
  float mask = smoothstep(-0.08, 0.04, u) * edge * brush;
  float g = pingpong(u * 2.6 + (n2 - 0.5) * 1.8 + ph, 1.0, 4.2);
  vec3 fire = ramp(g) * (1.15 - 0.3 * u);
  float cold = smoothstep(0.7, 0.8, fbm(ang * 4.0 + vec2(3.0, 1.0) + t * 0.1 + r * 5.0)) * uIris;
  fire = mix(fire, ramp(5.0) * 1.2, cold * smoothstep(0.1, 0.5, u));
  col = mix(col, fire, mask);

  float disc = smoothstep(0.003, -0.003, off);
  col = mix(col, ramp(0.0), disc);
  col += ramp(1.0) * exp(-abs(off) / (R * 0.02)) * 0.9;

  col = streaks(col, p, uStreaks, R * 0.9);
  col = sparks(col, p, uSparks, exp(-abs(off) * 6.0 / uSize) * step(0.0, off), 1.5);
  gl_FragColor = vec4(grain(col), 1.0);
}
`;

/*
 * ENLIGHTENMENT. A seated figure, mirrored left to right, built from capsules
 * joined with a smooth minimum: head, chest, crossed legs and three pairs of
 * arms. Each pose (meditating, praying, dancing) is a set of elbow and hand
 * places; the figure blends between them, and with Move on it travels round
 * all three. It is drawn as light, not filled: an outline, inner contour
 * filaments and flowing lines, with a white light at the heart and crown, a
 * beam, halo rings, a flower of life, and rings of seven-segment numbers.
 */
const DEITY = `${COMMON}
float bit(float m, float i) { return mod(floor(m / exp2(i)), 2.0); }

float digitMask(float n) {
  if (n < 0.5) return 63.0;
  if (n < 1.5) return 6.0;
  if (n < 2.5) return 91.0;
  if (n < 3.5) return 79.0;
  if (n < 4.5) return 102.0;
  if (n < 5.5) return 109.0;
  if (n < 6.5) return 125.0;
  if (n < 7.5) return 7.0;
  if (n < 8.5) return 127.0;
  return 111.0;
}

// A seven-segment digit in a cell, uv in -0.5..0.5.
float digit(vec2 uv, float n) {
  float m = digitMask(n);
  float d = 1.0;
  d = mix(d, min(d, seg(uv, vec2(-0.18, 0.38), vec2(0.18, 0.38))), bit(m, 0.0));
  d = mix(d, min(d, seg(uv, vec2(0.24, 0.32), vec2(0.24, 0.05))), bit(m, 1.0));
  d = mix(d, min(d, seg(uv, vec2(0.24, -0.05), vec2(0.24, -0.32))), bit(m, 2.0));
  d = mix(d, min(d, seg(uv, vec2(-0.18, -0.38), vec2(0.18, -0.38))), bit(m, 3.0));
  d = mix(d, min(d, seg(uv, vec2(-0.24, -0.05), vec2(-0.24, -0.32))), bit(m, 4.0));
  d = mix(d, min(d, seg(uv, vec2(-0.24, 0.32), vec2(-0.24, 0.05))), bit(m, 5.0));
  d = mix(d, min(d, seg(uv, vec2(-0.18, 0.0), vec2(0.18, 0.0))), bit(m, 6.0));
  return smoothstep(0.09, 0.04, d);
}

float limb(vec2 q, vec2 a, vec2 b, float r) { return seg(q, a, b) - r; }

float figure(vec2 q, float t, float wM, float wP, float wD) {
  float d = length(q - vec2(0.0, 0.255)) - 0.05;
  d = smin(d, limb(q, vec2(0.0, 0.21), vec2(0.0, 0.16), 0.022), 0.02);
  vec2 ta = vec2(0.0, 0.15);
  vec2 tb = vec2(0.0, -0.04);
  float h = clamp(dot(q - ta, tb - ta) / dot(tb - ta, tb - ta), 0.0, 1.0);
  d = smin(d, seg(q, ta, tb) - mix(0.062, 0.046, h), 0.03);
  vec2 S = vec2(0.085, 0.15);
  d = smin(d, limb(q, vec2(0.0, 0.15), S, 0.024), 0.03);
  d = smin(d, limb(q, vec2(0.0, -0.05), vec2(0.07, -0.075), 0.04), 0.03);
  d = smin(d, limb(q, vec2(0.06, -0.08), vec2(0.21, -0.16), 0.036), 0.02);
  d = smin(d, limb(q, vec2(0.21, -0.16), vec2(-0.04, -0.15), 0.028), 0.02);

  float br = 0.008 * sin(t * 0.9);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 eM = i == 0 ? vec2(0.17, 0.0) : (i == 1 ? vec2(0.22, 0.12) : vec2(0.17, 0.28));
    vec2 hM = i == 0 ? vec2(0.19, -0.125) : (i == 1 ? vec2(0.34, 0.2) : vec2(0.24, 0.42));
    vec2 eP = i == 0 ? vec2(0.14, 0.04) : (i == 1 ? vec2(0.24, 0.18) : vec2(0.14, 0.32));
    vec2 hP = i == 0 ? vec2(0.014, 0.1) : (i == 1 ? vec2(0.3, 0.33) : vec2(0.03, 0.47));
    vec2 eD = i == 0 ? vec2(0.2, 0.06) : (i == 1 ? vec2(0.24, 0.2) : vec2(0.2, 0.33));
    vec2 hD = i == 0 ? vec2(0.31, -0.02) : (i == 1 ? vec2(0.37, 0.12) : vec2(0.33, 0.42));
    eD += vec2(0.0, 0.04 * sin(t * 2.0 + fi * 2.1));
    hD += vec2(0.035 * cos(t * 2.3 + fi * 1.7), 0.06 * sin(t * 2.0 + fi * 2.1 + 0.8));
    vec2 E = eM * wM + eP * wP + eD * wD + vec2(0.0, br);
    vec2 H = hM * wM + hP * wP + hD * wD + vec2(0.0, br * 1.5);
    float th = 0.019 - fi * 0.002;
    d = smin(d, limb(q, S + vec2(-fi * 0.006, -fi * 0.012), E, th), 0.015);
    d = smin(d, limb(q, E, H, th * 0.8), 0.012);
    d = min(d, length(q - H) - th * 1.15);
  }
  return d;
}

void main() {
  vec2 p = screen();
  float t = uTime;
  float ph = t * uDrift * 0.4 + uShift;
  float sc = 0.8 * uSize;

  float x = mod(uPose + uCycle * t * 0.08, 3.0);
  float wM = max(0.0, 1.0 - min(abs(x), abs(x - 3.0)));
  float wP = max(0.0, 1.0 - abs(x - 1.0));
  float wD = max(0.0, 1.0 - abs(x - 2.0));

  vec2 f = p / sc + vec2(0.0, 0.06 - 0.012 * sin(t * 0.8));
  f.x += 0.025 * wD * sin(t * 1.7);
  vec2 q = vec2(abs(f.x), f.y);
  float d = figure(q, t, wM, wP, wD) * sc;

  vec3 col = backdrop(p);
  vec2 C = vec2(0.0, 0.16) * sc;
  vec2 pc = p - C;
  float rr = length(pc);
  float an = atan(pc.y, pc.x);

  // The beam, and the glow round the body.
  float fade = smoothstep(0.75, 0.0, abs(p.y + 0.05));
  col += ramp(1.5) * (exp(-abs(p.x) * 90.0) * 0.55 + exp(-abs(p.x) * 14.0) * 0.12) * fade * (0.4 + uGlow);
  col += ramp(3.0) * exp(-max(d, 0.0) * 34.0 / (0.3 + uGlow)) * 0.35;

  // Halo rings, some dashed and turning, and a flower of life behind.
  float halo = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float R = (0.13 + 0.1 * fi + 0.012 * fi * fi) * sc;
    float line = smoothstep(0.0035, 0.0, abs(rr - R));
    float n = 12.0 + fi * 10.0;
    float dash = mod(fi, 2.0) < 0.5 ? 1.0 : step(0.45, fract(an / TAU * n + t * (0.05 - fi * 0.02)));
    halo += line * dash * (0.8 - fi * 0.12);
  }
  float Rf = 0.18 * sc;
  float rot = t * 0.03;
  for (int i = 0; i < 6; i++) {
    float aa = float(i) * TAU / 6.0 + rot;
    vec2 cc = C + Rf * vec2(cos(aa), sin(aa));
    halo += smoothstep(0.0025, 0.0, abs(length(p - cc) - Rf)) * 0.35;
  }
  halo += smoothstep(0.0025, 0.0, abs(rr - 2.0 * Rf)) * 0.35;
  col += ramp(pingpong(2.0 + ph + rr * 2.0, 1.0, 3.5)) * halo * uCorona * smoothstep(-0.0, 0.03, d);

  // Numbers on two orbits, fading in and out.
  if (uNumbers > 0.0) {
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float R = (0.56 + 0.13 * fi) * sc;
      float hgt = 0.032 * sc;
      float v = (rr - R) / hgt;
      if (abs(v) < 0.6) {
        float cells = floor(TAU * R / (hgt * 0.85));
        float s = (an / TAU + t * (0.012 - fi * 0.02)) * cells;
        float cell = floor(s);
        float hs = hash(vec2(cell, fi + 4.0));
        float n = floor(10.0 * hash(vec2(cell, floor(t * 0.4 + hs * 7.0))));
        float on = step(0.35, hs) * (0.35 + 0.65 * (0.5 + 0.5 * sin(t * 0.7 + hs * 30.0)));
        col += ramp(1.5 + hs) * digit(vec2(fract(s) - 0.5, v), n) * on * uNumbers * 0.8;
      }
    }
  }

  // The figure itself, drawn as filaments of light.
  float inside = step(d, 0.0);
  float outline = smoothstep(0.003, 0.0, abs(d));
  float cn = abs(fract(-d / sc * (25.0 + 70.0 * uDetail)) - 0.5);
  float contours = smoothstep(0.36, 0.5, cn) * inside * (0.35 + 0.65 * uDetail);
  float fl = abs(fract(fbm(f * 7.0 + vec2(t * 0.1, -t * 0.07)) * 7.0 - t * 0.25 * (0.2 + uFlow)) - 0.5);
  float flowing = smoothstep(0.4, 0.5, fl) * inside * uFlow;
  float lit = max(outline, max(contours, flowing));
  float g = pingpong(1.0 + 2.0 * fbm(f * 3.0 + t * 0.05) + ph, 0.6, 3.6);
  col += ramp(g) * lit * 1.3;
  col += ramp(2.0) * inside * 0.06;

  // Light at the heart and the crown, each with a lens streak.
  for (int i = 0; i < 2; i++) {
    vec2 at = (i == 0 ? vec2(0.0, 0.05) : vec2(0.0, 0.25)) * sc;
    vec2 dp = p - at;
    float pulse = 0.85 + 0.15 * sin(t * 1.3 + float(i) * 2.0);
    float core = 0.00035 / (dot(dp, dp) + 0.00025);
    float streak = exp(-abs(dp.y) * 380.0) * exp(-abs(dp.x) * 5.0) * 0.7;
    col += ramp(0.0) * (core + streak) * pulse * (0.5 + uGlow);
  }

  col = sparks(col, p, uSparks, exp(-rr * 2.5), 1.0);
  gl_FragColor = vec4(grain(col), 1.0);
}
`;

/*
 * LIGHT BUBBLE. A raymarched drop: a sphere whose surface is moved by slow
 * waves, with up to six small drops orbiting that melt into it when they pass
 * close. Its skin is a soap film: the colour follows a film thickness that
 * the liquid keeps moving and the angle it is seen at. Fresnel makes the edge
 * bright; two lights give it sharp highlights; through it the ground is bent.
 */
const BUBBLE = `${COMMON}
float scene(vec3 pos, float t) {
  float R = 0.55 * uSize;
  float w = uFlow * (0.075 * sin(3.0 * pos.x + t) * sin(3.3 * pos.y + 1.2 * t) * sin(2.7 * pos.z + 0.8 * t)
    + 0.035 * sin(5.0 * pos.y - 1.7 * t + 3.0 * pos.x));
  float d = length(pos) - R + w;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi < uCount) {
      vec3 c = vec3(cos(t * 0.3 + fi * 1.7) * 0.95, sin(t * 0.4 + fi * 2.3) * 0.62, sin(t * 0.25 + fi) * 0.4) * uSize;
      float r = (0.07 + 0.05 * hash(vec2(fi, 2.0))) * uSize;
      d = smin(d, length(pos - c) - r, 0.12 * uSize);
    }
  }
  return d;
}

vec3 normalAt(vec3 pos, float t) {
  vec2 e = vec2(0.002, -0.002);
  return normalize(
    e.xyy * scene(pos + e.xyy, t) + e.yyx * scene(pos + e.yyx, t) + e.yxy * scene(pos + e.yxy, t) + e.xxx * scene(pos + e.xxx, t)
  );
}

vec3 ground(vec2 p) {
  vec3 col = backdrop(p);
  float pool = fbm(p * 1.6 + vec2(uTime * 0.03, -uTime * 0.02));
  return mix(col, ramp(pingpong(pool * 6.0 + uShift, 1.0, 4.0)), 0.12);
}

void main() {
  vec2 p = screen();
  float t = uTime;
  vec3 ro = vec3(0.0, 0.0, 2.6);
  vec3 rd = normalize(vec3(p, -1.6));

  float dist = 1.4;
  float nearest = 10.0;
  bool hit = false;
  vec3 pos = ro;
  for (int i = 0; i < 64; i++) {
    pos = ro + rd * dist;
    float d = scene(pos, t);
    nearest = min(nearest, d);
    if (d < 0.001) { hit = true; break; }
    dist += d * 0.9;
    if (dist > 4.2) break;
  }

  vec3 col = ground(p);
  if (hit) {
    vec3 n = normalAt(pos, t);
    vec3 v = -rd;
    float c = clamp(dot(n, v), 0.0, 1.0);
    float fres = 0.04 + 0.96 * pow(1.0 - c, 5.0);
    float th = 0.6 * noise(pos.xy * 2.5 + vec2(t * 0.1, -t * 0.07)) + 0.4 * (0.5 + 0.5 * sin(pos.y * 4.0 - t * 0.7 + pos.x * 2.0));
    float phase = th * (1.0 + 3.0 * uDetail) * (0.6 + 0.4 * c) + t * uDrift * 0.3 + uShift * 0.2;
    vec3 iris = 0.5 + 0.5 * cos(TAU * (phase + vec3(0.0, 0.33, 0.67)));
    vec3 film = mix(ramp(pingpong(phase * 5.0, 1.0, 4.5)), iris, 0.55);

    vec3 through = ground(p - n.xy * 0.18) * mix(vec3(1.0), ramp(1.0), 0.25);
    col = mix(through, film, clamp(uIris * (0.3 + 0.7 * fres) + 0.12, 0.0, 1.0));
    col += film * pow(1.0 - c, 2.5) * 0.6 * uIris;

    vec3 l1 = normalize(vec3(-0.5, 0.7, 0.6));
    vec3 l2 = normalize(vec3(0.6, -0.2, 0.7));
    float s1 = pow(max(dot(n, normalize(l1 + v)), 0.0), 90.0);
    float s2 = pow(max(dot(n, normalize(l2 + v)), 0.0), 30.0);
    col += vec3(1.0) * (s1 * 1.4 + s2 * 0.25) * (0.3 + uGlow);
    col += ramp(0.0) * pow(1.0 - c, 4.0) * 0.35 * uGlow;
  } else {
    col += ramp(3.0) * exp(-max(nearest, 0.0) * 9.0) * 0.18 * uGlow;
  }

  col = sparks(col, p, uSparks, 1.0, 0.0);
  gl_FragColor = vec4(grain(col), 1.0);
}
`;

export const LIGHT_FRAGMENTS: Record<LightKind, string> = {
  eclipse: ECLIPSE,
  deity: DEITY,
  bubble: BUBBLE,
};
