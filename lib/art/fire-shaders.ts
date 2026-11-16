/*
 * The Fire pieces' fragment shader (docs/specs/geometry-field.md, "Fire", 2026-11-16). One
 * source, specialised per piece with `#define SCENE n` (lib/art/fire.ts FIRE_SCENES), drawn on a
 * full-screen triangle by components/geometry-fire.ts. GLSL ES 1.0 style; three.js converts it.
 *
 * Each piece draws its surroundings (the match stick, the candle, the burner, the logs, the
 * burning trees) and calls the flame tool (lib/art/flame-shaders.ts) for the flames, embers and
 * smoke. Order: backdrop, smoke, the far flames (layer 0), the middle ground (logs, trees), the
 * near flames (layer 1), embers. Surroundings are lit by one flickering fire light from the CPU.
 *
 * Smooth by design: no ray marching, only the flames a pixel is inside pay for noise, every edge
 * is antialiased over one pixel, and nothing moves faster than the eye can follow (embers are
 * stretched over one frame of travel). Colours are linear; the output pass tone-maps and turns
 * them into sRGB.
 */

import { FLAME_GLSL } from './flame-shaders';

export const FIRE_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Every float uniform the scene shader reads (the flame tool's are listed in flame-shaders). */
export const FIRE_FLOATS = ['uTime', 'uFit', 'uShimmer', 'uExposure'] as const;
/** Every vec4 uniform the scene shader reads. */
export const FIRE_VEC4S = ['uLight', 'uObj', 'uObj2'] as const;

const SOURCE = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFit;
uniform float uShimmer;
uniform float uExposure;
// Fire light: (x, y, intensity, radius), colour in uLightC.
uniform vec4 uLight;
uniform vec3 uLightC;
// Scene state: (offset x, offset y, char, alpha) and (glow, flare, 0, 0).
uniform vec4 uObj;
uniform vec4 uObj2;

${FLAME_GLSL}

vec3 C(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }

vec3 fireLight(vec2 p) {
  vec2 d = (p - uLight.xy) / uLight.w;
  return uLightC * uLight.z / (1.0 + dot(d, d));
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// 1 inside (d < 0), antialiased over a pixel.
float fill(float d) { return 1.0 - smoothstep(-FPX, FPX, d); }

#if SCENE == 0
/* ═════ Match ═════ */
#define HEAD vec2(0.04, -0.1)
vec3 backdrop(vec2 p) {
  vec3 col = mix(C(0.03, 0.026, 0.028), C(0.008, 0.007, 0.008), clamp(p.y + 0.5, 0.0, 1.0));
  return col + fireLight(p) * 0.05;
}
vec3 middle(vec2 p, vec3 col) {
  vec2 H = HEAD + uObj.xy;
  vec2 dir = normalize(vec2(-0.62, -0.78));
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 r = p - H;
  float a = dot(r, dir);
  float across = dot(r, nrm);
  float charEnd = 0.012 + uObj.z * 0.24;
  float burnt = 1.0 - smoothstep(charEnd - 0.004, charEnd + 0.004, a);
  float halfW = 0.0085 * (1.0 - 0.25 * burnt);
  float stick = fill(sdSeg(p, H + dir * 0.012, H + dir * 0.62) - halfW);
  // Wood: pale, a faint grain along the stick, round in section, lit from the flame.
  float grain = fNoise(vec2(a * 60.0, across * 900.0)) * 0.12;
  float rnd = sqrt(max(0.0, 1.0 - pow(across / halfW, 2.0)));
  vec3 lit = vec3(0.025) + fireLight(p) * (0.55 + 0.45 * clamp(-across / halfW, -1.0, 1.0));
  vec3 wood = C(0.82, 0.66, 0.44) * (0.55 + 0.45 * rnd - grain) * lit * 3.0;
  vec3 charC = C(0.06, 0.05, 0.05) * (0.6 + 0.4 * rnd) * lit * 2.0;
  vec3 s = mix(wood, charC, burnt);
  // The glowing front where the wood is turning to char, only while it burns.
  float front = exp(-pow((a - charEnd) / 0.003, 2.0)) * step(0.001, uObj.z);
  s += sootLight(1500.0) * front * 0.8 * (1.0 - uObj2.x * 0.5) * step(0.0, 1.0 - uObj2.x * 0.98);
  col = mix(col, s, stick * uObj.w);
  // Head: dark red before the strike, black once struck, glowing as it dies.
  vec2 hq = vec2(dot(r, dir), dot(r, nrm)) / vec2(0.022, 0.0145);
  float head = fill((length(hq) - 1.0) * 0.0145);
  float struck = max(step(0.001, uObj.z), step(0.001, uObj2.y));
  vec3 hc = mix(C(0.42, 0.07, 0.05), C(0.05, 0.04, 0.04), struck) * (vec3(0.03) + fireLight(p) * 2.0);
  hc += sootLight(1300.0 + 300.0 * uObj2.x) * uObj2.x * (0.5 + 0.5 * fNoise(hq * 3.0 + uTime));
  col = mix(col, hc, head * uObj.w);
  return col;
}
#elif SCENE == 1
/* ═════ Candle ═════ */
#define WICK vec2(0.0, -0.075)
#define WAX_TOP -0.1
#define WAX_R 0.075
#define TABLE -0.44
vec3 backdrop(vec2 p) {
  vec3 col = mix(C(0.025, 0.018, 0.016), C(0.006, 0.005, 0.006), clamp(p.y + 0.5, 0.0, 1.0));
  col += fireLight(p) * 0.06;
  if (p.y < TABLE) {
    // A dark table, lit round the candle, with a soft reflection of the flame.
    float d = TABLE - p.y;
    vec3 wood = C(0.08, 0.05, 0.035) * (0.8 + 0.2 * fNoise(vec2(p.x * 8.0, d * 120.0)));
    col = wood * (vec3(0.03) + fireLight(vec2(p.x, TABLE + d * 3.0)) * 0.9);
    col += C(1.0, 0.7, 0.35) * 0.05 * exp(-p.x * p.x / 0.004) * exp(-d / 0.03);
  }
  return col;
}
vec3 middle(vec2 p, vec3 col) {
  // Wax: a cylinder with a melted pool on top, glowing through near the flame.
  float x = p.x / WAX_R;
  float topY = WAX_TOP + 0.016 * sqrt(max(0.0, 1.0 - x * x));
  float botY = TABLE - 0.016 * sqrt(max(0.0, 1.0 - x * x));
  float body = fill(abs(p.x) - WAX_R) * fill(p.y - topY) * fill(botY - p.y);
  float shade = 0.55 + 0.45 * sqrt(max(0.0, 1.0 - x * x));
  vec3 wax = C(0.93, 0.86, 0.74) * shade * (vec3(0.02) + fireLight(p) * 0.35);
  float through = exp(-(WAX_TOP - p.y) / 0.07);
  wax += C(1.0, 0.62, 0.3) * through * uLight.z * 0.45 * (0.6 + 0.4 * shade);
  col = mix(col, wax, body);
  // The pool: an ellipse on top, brighter and warmer, with a raised rim.
  vec2 e = vec2(p.x / WAX_R, (p.y - WAX_TOP) / 0.016);
  float pool = fill((length(e) - 1.0) * 0.016);
  vec3 pc = C(1.0, 0.78, 0.5) * uLight.z * (0.5 + 0.35 * (1.0 - length(e)));
  pc += C(1.0, 0.9, 0.75) * smoothstep(0.75, 0.97, length(e)) * 0.15 * uLight.z;
  col = mix(col, pc, pool);
  // Wick: a short dark curl with a glowing tip.
  float wick = fill(sdSeg(p, vec2(0.0, WAX_TOP), WICK + vec2(0.003, 0.0)) - 0.0022);
  col = mix(col, C(0.04, 0.03, 0.03), wick);
  vec2 tip = WICK + vec2(0.003, 0.0);
  col += sootLight(1450.0) * exp(-dot(p - tip, p - tip) / 0.000006) * 0.6;
  return col;
}
#elif SCENE == 2
/* ═════ Gas Ring ═════ */
#define RC vec2(0.0, -0.12)
#define RX 0.3
#define RY 0.085
vec3 backdrop(vec2 p) {
  // A dark enamel stove top, a little sheen, lit blue by the ring.
  vec3 col = mix(C(0.035, 0.035, 0.04), C(0.012, 0.012, 0.015), clamp(p.y + 0.5, 0.0, 1.0));
  vec2 e = (p - RC) / vec2(RX, RY);
  float er = length(e);
  col += fireLight(p) * 0.04;
  col += C(0.2, 0.4, 1.0) * 0.06 * uLight.z * exp(-pow((er - 1.0) / 0.35, 2.0));
  // The pan supports: four dark bars outside the ring.
  for (int i = 0; i < 4; i++) {
    float a = 0.785 + 1.5708 * float(i);
    vec2 dir = vec2(cos(a) * RX, sin(a) * RY);
    float bar = fill(sdSeg(p, RC + dir * 1.25, RC + dir * 1.9) - 0.007);
    vec3 bc = C(0.02, 0.02, 0.022) + C(0.3, 0.5, 1.0) * 0.08 * uLight.z * smoothstep(1.9, 1.25, er);
    col = mix(col, bc, bar);
  }
  // The burner: a short steel cylinder; its side band shows below the top ellipse.
  float bx = p.x / (RX * 1.06);
  float lowEdge = RY * 1.06 * sqrt(max(0.0, 1.0 - bx * bx));
  float side = fill(abs(bx) - 1.0) * fill(p.y - RC.y) * fill((RC.y - 0.028 - lowEdge) - p.y);
  vec3 steel = C(0.16, 0.16, 0.18) * (0.35 + 0.65 * sqrt(max(0.0, 1.0 - bx * bx)));
  col = mix(col, steel * (vec3(0.08) + fireLight(p) * 0.5), side);
  float top = fill((er - 1.06) * RY);
  vec3 tc = C(0.3, 0.3, 0.33) * (0.4 + 0.25 * fNoise(e * 20.0)) * (vec3(0.15) + fireLight(p) * 1.4);
  col = mix(col, tc, top);
  // The cap: raised, darker, a soft blue sheen.
  vec2 ce = (p - RC - vec2(0.0, 0.012)) / vec2(RX * 0.72, RY * 0.72);
  float cap = fill((length(ce) - 1.0) * RY * 0.72);
  vec3 cc = C(0.07, 0.07, 0.08) + C(0.25, 0.45, 1.0) * 0.12 * uLight.z * smoothstep(0.4, 1.0, length(ce));
  cc += C(0.6, 0.7, 0.9) * 0.05 * exp(-pow((ce.y + 0.4) / 0.25, 2.0)) * exp(-ce.x * ce.x / 0.2);
  col = mix(col, cc, cap);
  // Ports: small dark notches round the rim.
  float ang = atan(e.y, e.x);
  float port = smoothstep(0.35, 0.15, abs(fract((ang - 0.09) / 6.28318 * 18.0 + 0.5) - 0.5))
    * exp(-pow((er - 1.0) / 0.05, 2.0));
  col *= 1.0 - 0.6 * port;
  return col;
}
vec3 middle(vec2 p, vec3 col) { return col; }
#elif SCENE == 3
/* ═════ Campfire ═════ */
#define FC vec2(0.0, -0.26)
#define HORIZON -0.04
vec3 backdrop(vec2 p) {
  vec3 col = mix(C(0.03, 0.03, 0.06), C(0.004, 0.006, 0.016), clamp((p.y - HORIZON) * 1.6, 0.0, 1.0));
  // A few faint stars, slow to twinkle, never under a pixel.
  vec2 sg = p * 90.0;
  vec2 sid = floor(sg);
  float sh = fHash(sid);
  if (sh > 0.965 && p.y > HORIZON + 0.05) {
    vec2 so = fract(sg) - 0.5 - (vec2(fHash(sid + 3.1), fHash(sid + 5.7)) - 0.5) * 0.6;
    float sz = max(0.0016, 1.1 * FPX) * 90.0;
    float tw = 0.7 + 0.3 * sin(uTime * (0.6 + sh) + sh * 50.0);
    col += vec3(0.5, 0.55, 0.7) * exp(-dot(so, so) / (sz * sz)) * (sh - 0.965) * 12.0 * tw;
  }
  // The far tree line, lit faintly by the fire.
  float ridge = HORIZON + 0.05 + 0.06 * fFbm2(vec2(p.x * 6.0, 1.3)) + 0.04 * fNoise(vec2(p.x * 30.0, 7.0));
  float trees = fill(p.y - ridge);
  col = mix(col, C(0.01, 0.012, 0.012) + fireLight(p) * 0.02, trees);
  if (p.y < HORIZON) {
    // Earth, lit round the fire: the light squashed into the ground's perspective.
    float n = fFbm2(p * vec2(14.0, 40.0));
    vec3 earth = C(0.07, 0.05, 0.04) * (0.7 + 0.5 * n);
    vec2 g = vec2(p.x, FC.y + (p.y - FC.y) * 3.2);
    col = earth * (vec3(0.015) + fireLight(g) * 1.0);
  }
  // Stones round the fire: back half here, front half in the middle ground.
  return col;
}
vec3 stone(vec2 p, vec3 col, float frontHalf) {
  for (int i = 0; i < 11; i++) {
    float a = 6.28318 * float(i) / 11.0 + 0.2;
    float s = sin(a);
    if ((s < 0.0 ? 1.0 : 0.0) != frontHalf) continue;
    vec2 c = FC + vec2(cos(a) * 0.28, s * 0.075 - 0.035);
    float k = 1.0 - 0.15 * s;
    vec2 q = (p - c) / (vec2(0.042, 0.03) * k * (0.85 + 0.3 * fHash(vec2(float(i), 2.0))));
    float d = length(q) - 1.0 + 0.12 * fNoise(q * 3.0 + float(i));
    float m = fill(d * 0.03);
    float up = clamp(0.5 - q.y * 0.5, 0.0, 1.0);
    vec3 sc = C(0.2, 0.18, 0.17) * (0.5 + 0.5 * fNoise(q * 6.0)) * (vec3(0.01) + fireLight(c + vec2(0.0, 0.03)) * (0.4 + 0.8 * (1.0 - up)) );
    col = mix(col, sc, m);
  }
  return col;
}
vec3 logAt(vec2 p, vec3 col, vec2 a, vec2 b, float r, float seed) {
  float d = sdSeg(p, a, b) - r;
  if (d > FPX) return col;
  vec2 ab = normalize(b - a);
  vec2 nrm = vec2(-ab.y, ab.x);
  if (nrm.y < 0.0) nrm = -nrm;
  float along = dot(p - a, ab);
  float across = clamp(dot(p - a, nrm) / r, -1.0, 1.0);
  float rnd = sqrt(max(0.0, 1.0 - across * across));
  float bark = fFbm2(vec2(along * 40.0 + seed, across * 4.0));
  vec3 lit = vec3(0.012) + fireLight(p) * (0.45 + 0.55 * clamp(across, 0.0, 1.0));
  vec3 lc = C(0.16, 0.09, 0.05) * (0.4 + 0.6 * rnd) * (0.6 + 0.6 * bark) * lit * 1.4;
  // Charred skin with glowing cracks that breathe slowly.
  float n = fFbm4(vec2(along * 55.0 + seed * 3.0, across * 5.0 + seed) + vec2(0.0, uTime * 0.04));
  float pulse = 0.75 + 0.25 * sin(uTime * 0.7 + n * 9.0 + seed);
  float crack = smoothstep(0.68, 0.78, n) * (1.0 - smoothstep(-0.2, 0.6, across));
  lc += sootLight(1350.0 + 350.0 * crack) * crack * pulse * 0.9;
  return mix(col, lc, fill(d));
}
vec3 middle(vec2 p, vec3 col) {
  col = stone(p, col, 1.0);
  col = logAt(p, col, FC + vec2(-0.23, -0.055), FC + vec2(0.13, 0.025), 0.032, 1.0);
  col = logAt(p, col, FC + vec2(0.23, -0.065), FC + vec2(-0.11, 0.03), 0.03, 5.0);
  col = logAt(p, col, FC + vec2(-0.05, -0.085), FC + vec2(0.03, 0.0), 0.026, 9.0);
  return col;
}
// The back stones and the back log sit behind the flames.
vec3 behind(vec2 p, vec3 col) {
  col = stone(p, col, 0.0);
  col = logAt(p, col, FC + vec2(-0.19, 0.035), FC + vec2(0.18, 0.05), 0.028, 13.0);
  return col;
}
#else
/* ═════ Wildfire ═════ */
#define BACKY -0.12
#define FRONTY -0.3
vec3 backdrop(vec2 p) {
  // A sky thick with smoke, glowing low where the fire lights it from below.
  float hy = clamp((p.y - BACKY) / 0.7, 0.0, 1.0);
  vec3 col = mix(C(0.3, 0.08, 0.03), C(0.025, 0.01, 0.012), pow(hy, 0.5));
  float billow = fFbm2(vec2(p.x * 2.2 - uTime * 0.02, p.y * 3.0 - uTime * 0.03));
  col *= 0.5 + 0.9 * billow;
  // Far hills, black against the glow.
  float ridge = BACKY + 0.03 + 0.07 * fFbm2(vec2(p.x * 3.0, 4.2));
  col = mix(col, C(0.03, 0.012, 0.008), fill(p.y - ridge));
  return col;
}
// Burnt trees between the walls: a trunk per cell, a few bare branches.
vec3 middle(vec2 p, vec3 col) {
  float cw = 0.17;
  float cx = floor(p.x / cw);
  float h = fHash(vec2(cx, 3.0));
  float tx = (cx + 0.5 + (fHash(vec2(cx, 7.0)) - 0.5) * 0.3) * cw;
  float base = -0.24;
  float top = base + 0.34 + 0.26 * fHash(vec2(cx, 11.0));
  float m = 0.0;
  if (h > 0.35 && p.y > base - 0.02 && p.y < top + 0.02) {
    float t = clamp((p.y - base) / (top - base), 0.0, 1.0);
    float w = mix(0.01, 0.0018, t);
    float lean = (fHash(vec2(cx, 13.0)) - 0.5) * 0.07;
    float x = tx + lean * t * t;
    m = fill(abs(p.x - x) - w) * step(p.y, top) * step(base - 0.05, p.y);
    // A few bare, uneven branches, most of them burnt away.
    for (int k = 0; k < 5; k++) {
      float fk = float(k);
      float hk = fHash(vec2(cx, 20.0 + fk));
      if (hk < 0.3) continue;
      float tk = 0.3 + 0.13 * fk + (fHash(vec2(cx, 40.0 + fk)) - 0.5) * 0.08;
      float side = fHash(vec2(cx, 60.0 + fk)) > 0.5 ? 1.0 : -1.0;
      float len = 0.065 * (1.0 - 0.14 * fk) * (0.4 + 0.8 * hk);
      vec2 a = vec2(tx + lean * tk * tk, base + (top - base) * tk);
      vec2 b = a + vec2(side * len, len * (0.4 + 0.6 * hk));
      vec2 c = b + vec2(side * len * 0.35, len * 0.45);
      m = max(m, fill(sdSeg(p, a, b) - 0.002));
      m = max(m, fill(sdSeg(p, b, c) - 0.0014));
    }
  }
  vec3 tc = C(0.02, 0.008, 0.005) + fireLight(p) * 0.03;
  col = mix(col, tc, m);
  // The burnt ground in front.
  if (p.y < -0.2) {
    float g = smoothstep(-0.2, -0.24, p.y);
    float gn = fFbm2(p * vec2(10.0, 30.0));
    vec3 gc = C(0.12, 0.06, 0.035) * (0.6 + 0.6 * gn);
    gc *= vec3(0.02) + fireLight(vec2(p.x, FRONTY + (p.y - FRONTY) * 1.6)) * 1.6;
    // Smouldering patches that breathe slowly.
    float sn = fFbm4(p * vec2(9.0, 26.0) + vec2(0.0, uTime * 0.03));
    float glow = smoothstep(0.6, 0.75, sn) * (0.7 + 0.3 * sin(uTime * 0.6 + sn * 12.0));
    gc += sootLight(1300.0 + 300.0 * glow) * glow * 0.5;
    col = mix(col, gc, g);
  }
  return col;
}
#endif

vec3 finish(vec3 col, vec2 uv) {
  float v = 1.0 - 0.4 * dot(uv, uv);
  return max(col * v * uExposure, 0.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 p = uv / uFit;
  FPX = 1.0 / (uRes.y * uFit);
  // Heat shimmer: the air above the fire bends what is seen through it.
#if SCENE == 3 || SCENE == 4
  float above = smoothstep(uLight.y - 0.15, uLight.y + 0.05, p.y) * (1.0 - smoothstep(0.3, 0.6, p.y - uLight.y));
  vec2 sq = vec2(p.x * 22.0, p.y * 12.0 - uFT * 2.6);
  p += uShimmer * above * (fNoise2(sq) - 0.5) * 2.0;
#endif
  vec3 col = backdrop(p);
  // Smoke sits behind the flames: dark, lit warm from below near the fire.
  float sm = smokeAt(p);
  if (sm > 0.0) {
#if SCENE == 4
    vec3 sc = C(0.09, 0.05, 0.04) + fireLight(p) * 0.12;
#else
    vec3 sc = C(0.3, 0.29, 0.28) * 0.25 + fireLight(p) * 0.5;
#endif
    col = mix(col, sc, sm * 0.8);
  }
#if SCENE == 3
  col = behind(p, col);
#endif
  vec3 back;
  vec3 front;
  flames(p, back, front);
  col += back;
  // The glow in the air round a busy fire, once, from its light (single flames bring a halo).
#if SCENE == 2
  col += fireLight(p) * 0.06;
#elif SCENE == 3
  col += fireLight(p) * 0.1;
#elif SCENE == 4
  col += fireLight(p) * 0.08;
#endif
  col = middle(p, col);
  col += front;
  col += embers(uv / uFit);
  gl_FragColor = vec4(finish(col, uv), 1.0);
}
`;

/** The shader for one piece (0–4). */
export function fireFragment(scene: number): string {
  return `#define SCENE ${Math.max(0, Math.min(4, Math.round(scene)))}\n${SOURCE}`;
}
