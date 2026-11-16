/*
 * The flame tool's GLSL half (docs/specs/geometry-field.md, "Fire", 2026-11-16). Paste
 * `FLAME_GLSL` into any full-screen fragment shader (GLSL ES 1.0 style, highp) after its own
 * declarations, feed the uniforms from lib/art/flame.ts (`packFlames`, `Embers`, `Smoke`), then call:
 *
 *   flames(p, back, front)  the light of every flame at p, split by layer (halos go in back)
 *   embers(p)                rising sparks
 *   smokeAt(p)               plume density 0..1
 *
 * p is in screen units with the view's height 1 and y up. The caller must set `FPX` (one pixel in
 * screen units) before calling, so sparks are never drawn smaller than a pixel.
 *
 * Cost: each flame first tests its bounding box, so a pixel only pays the noise for the flames it
 * is inside: six texture fetches (two for the warp, four for the fBm), and the blackbody colour is
 * one more fetch from a ramp. Colours come out linear.
 */

import { MAX_FLAMES, RAMP_MAX_K, RAMP_MIN_K, RAMP_SIZE } from './flame';

export const FLAME_MAX = MAX_FLAMES;

/** Every float uniform FLAME_GLSL reads besides the arrays. */
export const FLAME_FLOATS = ['uFT'] as const;
/** Every vec4 uniform FLAME_GLSL reads besides the arrays. */
export const FLAME_VEC4S = ['uEA', 'uEB', 'uEC', 'uSA', 'uSB'] as const;

export const FLAME_GLSL = /* glsl */ `
#define FLAME_MAX ${FLAME_MAX}
// Flames: a = (x, y, width, height), b = (turbulence, rise, lean, seed),
// c = (coreK, blue, luminous, brightness), d = (shape 0 drop / 1 wall, tongues, layer, halo).
uniform vec4 uFA[FLAME_MAX];
uniform vec4 uFB[FLAME_MAX];
uniform vec4 uFC[FLAME_MAX];
uniform vec4 uFD[FLAME_MAX];
uniform float uFN;
// The flames' clock, seconds (wrapped hourly on the CPU).
uniform float uFT;
// Embers: a = (x0, x1, y0, height), b = (density, size, wind, rise); hot kelvin in uEC.x.
uniform vec4 uEA;
uniform vec4 uEB;
uniform vec4 uEC;
// Smoke: a = (x, y, width, height), b = (amount, wind, rise, curl).
uniform vec4 uSA;
uniform vec4 uSB;
// A 256x256 random texture (R and G independent; repeat wrap, linear filter, no mipmaps) and the
// blackbody ramp (lib/art/flame.ts flameNoiseData, blackbodyRamp).
uniform sampler2D uFNoise;
uniform sampler2D uFRamp;

float FPX = 0.001;

float fHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// Value noise from the random texture in one fetch: the hardware's bilinear filter does the
// blend, and moving the sample point along the smoothstep curve makes it smooth (C1).
vec2 fNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return texture2D(uFNoise, (i + u + 0.5) / 256.0).xy;
}
float fNoise(vec2 p) { return fNoise2(p).x; }
const mat2 F_ROT = mat2(1.6, 1.2, -1.2, 1.6);
float fFbm4(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * fNoise(p);
    p = F_ROT * p;
    a *= 0.5;
  }
  return s / 0.9375;
}
float fFbm2(vec2 p) { return fNoise(p) * 0.6667 + fNoise(F_ROT * p) * 0.3333; }

// Blackbody colour, linear, from the ramp (lib/art/flame.ts blackbodyRamp: the square root of
// the linear colour from RAMP_MIN_K to RAMP_MAX_K, squared back here for precision in the reds).
vec3 bb(float K) {
  float t = clamp((K - ${RAMP_MIN_K.toFixed(1)}) / ${(RAMP_MAX_K - RAMP_MIN_K).toFixed(1)}, 0.0, 1.0);
  vec3 c = texture2D(uFRamp, vec2(t * ${((RAMP_SIZE - 1) / RAMP_SIZE).toFixed(6)} + ${(0.5 / RAMP_SIZE).toFixed(6)}, 0.5)).rgb;
  return c * c;
}
// Light of glowing soot at K: blackbody colour, brightness rising roughly with T^3.
vec3 sootLight(float K) {
  float k = K / 2000.0;
  return bb(K) * k * k * k;
}

const vec3 F_BLUE = vec3(0.05, 0.16, 1.0);
const vec3 F_CYAN = vec3(0.22, 0.6, 1.0);

vec3 flameAt(vec2 p, vec4 A, vec4 B, vec4 C, vec4 D) {
  vec2 q = (p - A.xy) / A.zw;
  float y = q.y;
  float yp = max(y, 0.0);
  float aspect = A.w / A.z;
  // Wind lean: the tip is pushed sideways, more the higher up.
  q.x -= B.z * aspect * yp * yp;
  float T = B.x;
  float wall = D.x;
  float reach = 1.0 + 0.45 * T;
  if (y < -0.4 || y > reach + 0.2 || abs(q.x) > (wall > 0.5 ? 0.62 : 0.85 + 0.3 * T)) return vec3(0.0);
  float t = uFT * B.y + B.w * 13.7;
  // Buoyant noise in flame-height units: aspect-true across, stretched up, scrolling upward.
  vec2 nq = vec2(q.x / aspect * 3.2 + B.w * 7.1, y * 1.9 - t);
  // Domain warp: two slow fields bend the fine noise sideways and up, so tongues curl and fork
  // rather than streak.
  vec2 wq = nq * 0.7 + vec2(3.1, 0.0);
  vec2 w = fNoise2(wq) * 0.6667 + fNoise2(F_ROT * wq) * 0.3333 - 0.5;
  float n = fFbm4(nq + w * (0.6 + 1.6 * T));
  // The column wobbles, more toward the tip.
  float xd = q.x + w.x * T * 0.55 * yp;
  float body;
  if (wall < 0.5) {
    // Teardrop: round base, pointed tip (max half-width 0.5 at y ~ 0.39).
    float ys = clamp(y / reach * 1.0, -0.12, 1.0);
    float r = sqrt((ys + 0.12) / 1.12) * pow(1.0 - ys, 0.6);
    body = 1.0 - abs(xd) / max(r, 1e-3);
  } else {
    // Wall: a front of peaked tongues whose heights wander, tapering at the ends, its base
    // fading down into the fuel.
    float hn = fNoise(vec2(q.x * D.y + B.w * 5.3, uFT * 0.15 + B.w));
    float hg = 0.28 + 0.72 * hn * hn;
    body = (1.0 - yp / hg) * smoothstep(0.5, 0.34, abs(xd)) * smoothstep(-0.35, 0.04, y) * (0.7 + 0.6 * hn);
  }
  // Tongues: the noise eats the envelope, more so higher up.
  float I = body + (n - 0.5) * T * (0.35 + 1.7 * yp) - 0.08 * yp;
  if (I <= 0.0) return vec3(0.0);
  float edge = smoothstep(0.0, 0.28, I);

  // Temperature: hottest low in the middle, cooling to the tips.
  float heat = clamp(I, 0.0, 1.0) * (1.0 - 0.5 * clamp(yp, 0.0, 1.2));
  if (wall < 0.5) {
    float core = exp(-xd * xd / 0.03) * smoothstep(0.03, 0.2, y) * (1.0 - smoothstep(0.3, 0.75, y));
    heat += core * 0.3;
  }
  heat = clamp(heat, 0.0, 1.15);
  float K = mix(850.0, C.x, heat);
  // Soot glows above the blue root.
  float lumStart = 0.35 * C.y;
  float lumZone = smoothstep(lumStart - 0.08, lumStart + 0.14, y);
  // A wall with no blue root (wood) glows right down into the fuel.
  lumZone = mix(lumZone, smoothstep(-0.4, 0.0, y), smoothstep(0.15, 0.05, C.y) * wall);
  vec3 col = sootLight(K) * C.z * lumZone * edge;

  // Blue root: bowl-shaped, brightest at the edge where air mixes in.
  float bh = 0.14 + 0.95 * C.y * C.y * C.y;
  float bz = (1.0 - smoothstep(bh * 0.35, bh, y)) * smoothstep(-0.14, 0.0, y);
  float shell = edge * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.55, I)));
  col += F_BLUE * bz * shell * C.y * 1.4;
  // Gas: a crisp inner cone, cyan at its surface.
  if (C.y > 0.6) {
    float iy = y / 0.55;
    float iys = clamp(iy, -0.1, 1.0);
    float ri = 0.26 * sqrt((iys + 0.1) / 1.1) * pow(1.0 - iys, 0.9);
    float di = (abs(xd) - ri) / 0.05;
    float cone = exp(-di * di) + 0.35 * step(abs(xd), ri);
    cone *= smoothstep(-0.12, 0.0, y) * (1.0 - smoothstep(0.8, 1.05, iy));
    col += F_CYAN * cone * (C.y - 0.6) * 3.0;
  }
  return col * C.w;
}

// The halo round a flame: cheap, no noise.
vec3 flameHalo(vec2 p, vec4 A, vec4 B, vec4 C, vec4 D) {
  vec2 c = A.xy + vec2(B.z * A.w * 0.3, A.w * 0.4);
  vec2 s = vec2(A.z * 0.8 + A.w * 0.4, A.w * 0.65);
  vec2 d = (p - c) / s;
  float hd = dot(d, d);
  float h = 0.5 * exp(-hd * 1.2) + 0.12 / (1.0 + hd * 2.5);
  vec3 tint = mix(sootLight(C.x * 0.85) * C.z, F_BLUE * 0.8, smoothstep(0.5, 1.0, C.y));
  return tint * h * D.w * C.w * 0.25;
}

void flames(vec2 p, out vec3 back, out vec3 front) {
  back = vec3(0.0);
  front = vec3(0.0);
  for (int i = 0; i < FLAME_MAX; i++) {
    if (float(i) >= uFN) break;
    vec4 A = uFA[i];
    vec4 B = uFB[i];
    vec4 C = uFC[i];
    vec4 D = uFD[i];
    vec3 f = flameAt(p, A, B, C, D);
    if (D.z > 0.5) front += f;
    else back += f;
    // Skipped when off: busy scenes light the air once, from their fire light, instead.
    if (D.w > 0.0) back += flameHalo(p, A, B, C, D);
  }
}

// Rising sparks: three layers of cells scrolling upward, a few holding an ember each. Each fades
// and cools as it climbs, flutters sideways, fans out and drifts with the wind, and is stretched
// along its path by one frame of motion so it never judders.
vec3 embers(vec2 p) {
  if (uEB.x <= 0.0) return vec3(0.0);
  float h = (p.y - uEA.z) / uEA.w;
  if (h < -0.05 || h > 1.05) return vec3(0.0);
  float hp = max(h, 0.0);
  float mid = 0.5 * (uEA.x + uEA.y);
  float hw = 0.5 * (uEA.y - uEA.x);
  vec3 acc = vec3(0.0);
  for (int l = 0; l < 3; l++) {
    float fl = float(l);
    float cell = 0.016 + 0.01 * fl;
    float speed = uEB.w * (0.75 + 0.25 * fl);
    float x = p.x - uEB.z * uEA.w * pow(hp, 1.4);
    x = mid + (x - mid) / (1.0 + 0.7 * hp);
    if (abs(x - mid) > hw + cell) continue;
    vec2 g = vec2((x - mid) / cell, (p.y - uEA.z - uFT * speed) / cell + fl * 17.0);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float r = fHash(id + fl * 31.7);
    if (r > uEB.x) continue;
    float r2 = fHash(id + 7.3 + fl);
    vec2 o = vec2(r2 - 0.5, fract(r * 13.1) - 0.5) * 0.45;
    o.x += 0.15 * sin(uFT * (1.0 + 2.0 * r2) + r * 40.0);
    vec2 d = f - o;
    float sx = max(uEB.y, 1.2 * FPX) / cell;
    float sy = max(sx, speed / 60.0 / cell * 0.6);
    d /= vec2(sx, sy);
    float life = 1.0 - hp * (0.8 + 0.4 * r2);
    float tw = 0.8 + 0.2 * sin(uFT * (2.0 + 3.0 * r) + r * 60.0);
    float K = mix(1000.0, uEC.x, clamp(life, 0.0, 1.0));
    acc += sootLight(K) * exp(-dot(d, d)) * smoothstep(0.0, 0.3, life) * smoothstep(-0.05, 0.05, h) * tw
      * (sx / sy) * 2.5;
  }
  return acc;
}

// A plume: widening as it rises, drifting with the wind, a lazy S-curl, thinning out at the top.
float smokeAt(vec2 p) {
  if (uSB.x <= 0.0) return 0.0;
  vec2 q = (p - uSA.xy) / uSA.zw;
  if (q.y < -0.05 || q.y > 1.15) return 0.0;
  float yp = max(q.y, 0.0);
  q.x -= uSB.y * (uSA.w / uSA.z) * yp * yp;
  q.x += uSB.w * 0.3 * yp * sin(yp * 6.0 - uFT * 0.8);
  float wide = 0.12 + 0.9 * yp;
  vec2 nq = vec2(q.x * uSA.z / uSA.w * 3.0, q.y * 2.0 - uFT * uSB.z * 2.0);
  float n = fFbm4(nq + vec2(fFbm2(nq * 0.7) * 1.2, 0.0));
  float env = exp(-q.x * q.x / (wide * wide) * 2.5) * smoothstep(-0.02, 0.12, q.y)
    * (1.0 - smoothstep(0.5, 1.1, q.y));
  return clamp(env * (n * 1.7 - 0.4) * uSB.x, 0.0, 1.0);
}
`;
