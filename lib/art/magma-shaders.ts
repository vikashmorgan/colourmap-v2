/*
 * The Magma Cores' shaders (docs/specs/geometry-field.md, "Magma Cores", 2026-11-16), drawn by
 * components/geometry-magma.ts.
 *
 * - One full-screen fragment shader, specialised per method with `#define METHOD n`. It draws the
 *   warm dark background and the halo for every method, and the core itself: a faint ember glow
 *   behind the boiling dots (0), the molten core ray-marched through its shell (1), the cracked
 *   crust (2), a dim body under the currents (3) and the granulated, breathing core that erupts (4).
 * - Point shaders for the boiling dots and the eruption, a line shader for the currents. All the
 *   motion of the particles runs on the GPU from per-dot seeds, so tens of thousands of dots cost
 *   the CPU nothing.
 *
 * Every pixel and dot takes its colour from one ramp (lib/art/magma.ts MAGMA_STOPS), turned linear
 * here since the output pass turns the frame back into sRGB.
 *
 * Staying smooth: no noise finer than a few pixels moves fast, edges are anti-aliased with a width
 * worked out from the pixel size and the foreshortening (no derivatives, so it is safe inside
 * branches), dots are never smaller than about 1.5 px and fade softly, and nothing flashes: bursts
 * and pulses ease in and out over seconds.
 */

import { BUBBLES, CELL_REACH, CORE, LOOPS, MAGMA_STOPS, VENTS } from './magma';

const f = (x: number) => (Number.isInteger(x) ? `${x}.0` : `${x}`);
const lin = (c: number) => Math.round(c ** 2.2 * 100000) / 100000;

/** The ramp and the Heat slider's lean, generated from MAGMA_STOPS. */
export const RAMP_GLSL = (() => {
  const s = MAGMA_STOPS;
  const stops = s
    .map((st, i) => `const vec3 S${i} = vec3(${st.rgb.map((c) => f(lin(c))).join(', ')});`)
    .join('\n');
  const mixes = s
    .slice(1)
    .map(
      (st, i) =>
        `  c = mix(c, S${i + 1}, clamp((t - ${f(s[i].at)}) / ${f(st.at - s[i].at)}, 0.0, 1.0));`,
    )
    .join('\n');
  return `
${stops}
uniform float uHeat;
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = S0;
${mixes}
  return c;
}
float heatShift(float t) {
  float h = clamp(uHeat, 0.0, 1.5);
  return clamp(t * (0.75 + 0.45 * h) - 0.1 + 0.15 * h, 0.0, 1.0);
}
vec3 magma(float t) { return ramp(heatShift(t)); }
`;
})();

export const MAGMA_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Every float uniform of the full-screen shader. */
export const MAGMA_FLOATS = ['uTime', 'uTurb', 'uDetail', 'uPulse', 'uGlow'] as const;

const NOISE = /* glsl */ `
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 u = fract(x);
  u = u * u * (3.0 - 2.0 * u);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), u.x),
        mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x),
        mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}
// Fractal noise in [0, 1], up to six octaves.
float fbm(vec3 p, float oct) {
  float s = 0.0;
  float a = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= oct) break;
    s += a * vnoise(p);
    norm += a;
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s / norm;
}
// Distance to the nearest and second nearest cell point: their difference is small on a crack.
vec2 voronoi(vec3 x) {
  vec3 i = floor(x);
  vec3 fr = fract(x);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int xx = -1; xx <= 1; xx++) {
    vec3 g = vec3(float(xx), float(y), float(z));
    vec3 o = 0.1 + 0.8 * hash33(i + g);
    float d = length(g + o - fr);
    if (d < d1) { d2 = d1; d1 = d; }
    else if (d < d2) { d2 = d; }
  }
  return vec2(d1, d2);
}
`;

const CORE_SOURCE = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uTurb;
uniform float uDetail;
uniform float uPulse;
uniform float uGlow;
uniform mat3 uRotInv;
${RAMP_GLSL}
${NOISE}

// The ember glow just behind the boiling dots: faint, so the dots carry the core.
vec3 boilBody(vec3 n, vec3 q, float d, float mu) {
  float g = fbm(q * 2.2 + vec3(0.0, -uTime * 0.05, 0.0), 3.0);
  return magma(0.42 + 0.38 * mu + 0.12 * g) * (0.075 * mu);
}

// The molten core: domain-warped fractal noise for the flowing surface, dark crust plates where it
// runs high, and the bright interior seen through the gaps, marched in four steps through the
// shell so it has depth and parallax as the core turns.
vec3 molten(vec3 n, vec3 q, float mu, float px) {
  float oct = 3.0 + floor(uDetail * 3.0 + 0.5);
  float t = uTime * 0.035;
  vec3 w = vec3(
    fbm(q * 1.6 + vec3(0.0, 0.0, t), 2.0),
    fbm(q * 1.6 + vec3(5.2, 1.3, -t), 2.0),
    fbm(q * 1.6 + vec3(2.1, 7.7, t * 0.7), 2.0)) - 0.5;
  vec3 wq = q * 3.2 + w * (0.8 + 2.4 * uTurb);
  float fs = fbm(wq + vec3(t * 0.6, 0.0, 0.0), oct);
  // Anti-aliasing width: the noise changes about this much from one pixel to the next.
  float aa = 4.2 * px / max(mu, 0.12);
  float thr = 0.47;
  float crust = smoothstep(thr - aa, thr + 0.035 + aa, fs);
  float rim = smoothstep(thr - 0.09, thr, fs) * (1.0 - crust);

  // The interior, front to back.
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int k = 0; k < 3; k++) {
    float depth = 0.05 + 0.12 * float(k);
    vec3 pos = vec3(n.xy, n.z - depth);
    vec3 qi = uRotInv * pos;
    float dens = fbm(qi * 3.1 + w * 1.4 + vec3(0.0, -uTime * 0.045, uTime * 0.02), 2.0);
    float wk = 0.45 - 0.12 * float(k);
    float hot = 0.66 + 0.3 * (1.0 - length(pos)) + 0.32 * (dens - 0.5);
    acc += magma(hot) * wk * (0.7 + 0.6 * dens);
    wsum += wk;
  }
  vec3 inner = acc / wsum * (0.5 + 0.4 * mu);
  float fine = vnoise(q * 13.0);
  vec3 crustCol = magma(0.03 + 0.1 * fine) * 0.6;
  vec3 col = inner;
  col += magma(0.86) * rim * 0.55;
  col = mix(col, crustCol, crust * 0.97);
  // A warm limb, as if the glow scattered in a thin skin.
  col += magma(0.6) * pow(1.0 - mu, 2.5) * 0.3 * (1.0 - 0.7 * crust);
  return col;
}

// The cracked crust: a charcoal shell broken by Voronoi veins whose width breathes slowly region by
// region, so cracks widen and heal over half a minute, and light leaks onto the crust round them.
vec3 crust(vec3 n, vec3 q, float mu, float px) {
  float t = uTime;
  vec3 qv = q * 3.0 + 0.12 * vec3(sin(t * 0.07 + q.y * 2.0), sin(t * 0.06 + q.z * 2.0), sin(t * 0.05 + q.x * 2.0));
  vec2 v = voronoi(qv);
  float e = v.y - v.x;
  float ph = vnoise(q * 1.3 + 4.0) * 6.2832 + t * 0.12;
  float w = mix(0.006, 0.08, smoothstep(-0.4, 1.0, sin(ph))) * (0.55 + 0.9 * uTurb);
  float aa = 2.0 * 3.0 * px / max(mu, 0.12);
  float vein = 1.0 - smoothstep(w - aa, w + aa, e);
  float inner = clamp(1.0 - e / max(w, 0.002), 0.0, 1.0);
  float leak = exp(-e / (w * 2.2 + 0.02));

  // Finer cracks between the plates, with the Detail slider.
  vec2 v2 = voronoi(qv * 2.3 + 7.0);
  float e2 = v2.y - v2.x;
  float w2 = w * 0.32 * uDetail;
  float aa2 = aa * 2.3;
  float vein2 = (1.0 - smoothstep(w2 - aa2, w2 + aa2, e2)) * step(0.001, w2) * 0.75;

  float grain = vnoise(q * 11.0) * 0.6 + vnoise(q * 27.0) * 0.4;
  vec3 coal = vec3(0.011, 0.008, 0.007) * (0.55 + 0.9 * grain) * (0.75 + 0.5 * v.x);
  vec3 col = coal + magma(0.38) * leak * 0.5 + magma(0.25) * exp(-e2 / (w2 * 2.0 + 0.01)) * 0.12 * uDetail;
  vec3 hot = magma(0.55 + 0.4 * inner) * (0.8 + 0.9 * inner);
  col = mix(col, magma(0.62) * 1.1, vein2 * (1.0 - vein));
  col = mix(col, hot, vein);
  col += magma(0.45) * pow(1.0 - mu, 3.0) * 0.25;
  return col;
}

// The body under the currents: deep red, a little brighter toward the middle.
vec3 currentsBody(vec3 q, float mu) {
  float g = fbm(q * 2.6 + vec3(uTime * 0.03, 0.0, 0.0), 3.0);
  return magma(0.18 + 0.22 * mu + 0.1 * g) * (0.22 + 0.22 * mu);
}

// The eruptive core: bright granulated plasma that breathes with uPulse.
vec3 eruptive(vec3 q, float mu) {
  float oct = 3.0 + floor(uDetail * 2.0 + 0.5);
  float t = uTime * 0.05;
  vec3 w = vec3(fbm(q * 2.0 + vec3(t, 0.0, 0.0), 2.0), fbm(q * 2.0 + vec3(3.1, -t, 1.7), 2.0), 0.0) - 0.5;
  float g = fbm(q * 5.5 + w * (0.6 + 1.6 * uTurb) + vec3(0.0, 0.0, t), oct);
  float hot = 0.42 + 0.42 * g + 0.06 * uPulse + 0.1 * mu;
  return magma(hot) * (0.45 + 0.55 * mu) * (0.5 + 0.15 * uPulse);
}

void main() {
  float sc = 0.42 * min(uRes.x, uRes.y) * ${f(CORE)};
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / sc;
  float px = 1.0 / sc;
  float d = length(p);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  // The warm dark room and the halo round the core.
  vec3 col = vec3(0.0035, 0.0012, 0.0008) * (1.0 - 0.6 * dot(uv, uv));
  float out1 = max(d - 1.0, 0.0);
#if METHOD == 4
  float halo = (0.14 + 0.06 * uPulse) * exp(-out1 * 3.5) + 0.03 * exp(-out1 * 1.0);
#elif METHOD == 2
  float halo = 0.12 * exp(-out1 * 5.0) + 0.04 * exp(-out1 * 1.2);
#else
  float halo = 0.12 * exp(-out1 * 4.5) + 0.03 * exp(-out1 * 1.2);
#endif
  col += magma(0.5) * halo * uGlow;

  if (d < 1.0 + 2.0 * px) {
    float z = sqrt(max(0.0, 1.0 - d * d));
    vec3 n = vec3(p, z);
    vec3 q = uRotInv * n;
    float mu = z;
#if METHOD == 0
    vec3 body = boilBody(n, q, d, mu);
#elif METHOD == 1
    vec3 body = molten(n, q, mu, px);
#elif METHOD == 2
    vec3 body = crust(n, q, mu, px);
#elif METHOD == 3
    vec3 body = currentsBody(q, mu);
#else
    vec3 body = eruptive(q, mu);
#endif
    float edge = smoothstep(1.0 + 1.5 * px, 1.0 - 1.5 * px, d);
#if METHOD == 0
    // The dots' glow adds to the halo: no hard disc behind them.
    col += body * edge;
#else
    col = mix(col, body, edge);
#endif
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export function magmaFragment(method: number): string {
  return `#define METHOD ${Math.max(0, Math.min(4, Math.round(method)))}\n${CORE_SOURCE}`;
}

/* ── Particles ─────────────────────────────────────────────── */

const PARTICLE_COMMON = /* glsl */ `
uniform float uTime;
uniform float uTurb;
uniform float uPx;
uniform float uScale;
uniform float uAlpha;
uniform float uSize;
varying vec3 vCol;
varying float vA;
${RAMP_GLSL}
const float TAU = 6.2831853;
vec3 turn(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
// How hidden a point is behind the core: 1 when it is behind the disc, 0 in front or clear of it.
float behind(vec3 world) {
  float zN = world.z / uScale;
  float r = length(world.xy) / uScale;
  return smoothstep(0.0, -0.1, zN) * smoothstep(1.03, 0.95, r);
}
`;

export const POINT_FRAGMENT = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0 || vA <= 0.0) discard;
  float k = 1.0 - r2;
  gl_FragColor = vec4(vCol, vA * k * k);
}
`;

/** The boiling dots: convection cells, the hot inner ball, and spray from bursting bubbles. */
export const BOIL_VERTEX = /* glsl */ `
attribute vec3 aTan;
attribute vec4 aSeed;
attribute float aKind;
uniform vec4 uBub[${BUBBLES}];
uniform vec4 uBubB[${BUBBLES}];
${PARTICLE_COMMON}
void main() {
  vec3 pos;
  float heat;
  float a = 1.0;
  float size = uSize * (0.7 + 0.8 * aSeed.w);
  vec3 wob = vec3(
    sin(uTime * 0.7 + aSeed.y * 40.0),
    sin(uTime * 0.6 + aSeed.z * 40.0),
    sin(uTime * 0.8 + aSeed.w * 40.0)) * 0.012 * (0.5 + uTurb);
  if (aKind < 0.5) {
    // Round a convection roll: rise at the cell's centre, spread along the surface, sink at its
    // edge, and come back underneath.
    float phi = aSeed.x * TAU + uTime * (0.2 + 0.3 * uTurb) * (0.6 + 0.8 * aSeed.y);
    float reach = ${f(CELL_REACH)} * (0.3 + 0.7 * aSeed.z) * (0.8 + 0.4 * uTurb);
    float ang = reach * (0.5 - 0.5 * cos(phi));
    float r = 0.79 + 0.19 * sin(phi);
    vec3 dir = position * cos(ang) + aTan * sin(ang);
    // A slow, smooth warp of the whole pattern, so the cells never sit on a lattice.
    vec3 warp = vec3(
      sin(dir.y * 3.1 + uTime * 0.07),
      sin(dir.z * 2.7 - uTime * 0.06),
      sin(dir.x * 3.3 + uTime * 0.05));
    dir = normalize(dir + warp * (0.1 + 0.14 * uTurb));
    float dome = 0.0;
    for (int k = 0; k < ${BUBBLES}; k++) {
      vec4 b = uBub[k];
      float s = uBubB[k].y;
      dome += b.w * exp(-2.0 * (1.0 - dot(dir, b.xyz)) / (s * s));
    }
    dome = min(dome, 1.0);
    r += 0.13 * dome * smoothstep(0.8, 0.95, r);
    float plume = 0.5 + 0.5 * cos(phi);
    float radial = clamp((1.0 - r) / 0.42, 0.0, 1.0);
    heat = 0.26 + 0.4 * radial + 0.28 * plume * (1.0 - 0.4 * radial) + 0.14 * dome;
    pos = dir * r + wob;
  } else if (aKind < 1.5) {
    // The hot inner ball, turning slowly about each dot's own axis.
    float ang = uTime * (0.05 + 0.1 * aSeed.y) * (0.6 + uTurb);
    pos = turn(position, aTan, ang) + wob;
    heat = 0.8 + 0.2 * (1.0 - length(position) / 0.6);
    size *= 0.9;
  } else {
    // Spray: thrown off when its bubble bursts, falling back under gravity.
    int bi = int(aSeed.z * ${f(BUBBLES)});
    vec4 b = uBub[bi];
    vec4 bb = uBubB[bi];
    float u = (bb.x - 0.75) / 0.25;
    vec3 d = b.xyz;
    vec3 t = aTan - dot(aTan, d) * d;
    t = t / max(length(t), 1e-4);
    float hgt = (0.1 + 0.22 * aSeed.w) * (0.7 + 0.6 * uTurb) * 4.0 * u * (1.0 - u);
    float lat = bb.y * (0.7 * aSeed.y + (0.4 + 1.6 * aSeed.y) * u);
    pos = normalize(d + t * lat) * (1.0 + hgt);
    heat = 0.86 - 0.42 * u;
    a = u < 0.0 ? 0.0 : smoothstep(0.0, 0.2, u) * (1.0 - smoothstep(0.8, 1.0, u));
    size *= 0.85;
  }
  vec4 world = modelMatrix * vec4(pos, 1.0);
  float zN = world.z / uScale;
  // Dots on the far side glow through the magma, dimmer.
  a *= 1.0 - 0.5 * smoothstep(0.05, -0.5, zN) * smoothstep(0.55, 0.85, length(pos));
  size *= 0.85 + 0.25 * zN;
  vCol = magma(heat) * 1.6;
  vA = a * uAlpha * (0.55 + 0.6 * heat);
  gl_PointSize = a > 0.0 ? max(size * uPx, 1.5) : 0.0;
  // A hidden dot goes outside the frame, so it is never drawn at all.
  gl_Position = a > 0.0 ? projectionMatrix * viewMatrix * world : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/** The eruption: particles riding the prominence loops, plumes thrown from vents, embers. */
export const ERUPT_VERTEX = /* glsl */ `
attribute vec3 aTan;
attribute vec4 aSeed;
attribute float aKind;
attribute float aIdx;
uniform vec4 uLoopA[${LOOPS}];
uniform vec4 uLoopB[${LOOPS}];
uniform vec4 uVent[${VENTS}];
uniform float uPulse;
${PARTICLE_COMMON}
void main() {
  vec3 pos;
  float heat;
  float a;
  float size = uSize * (0.7 + 0.8 * aSeed.w);
  int idx = int(aIdx + 0.5);
  if (aKind < 0.5) {
    // Along a loop, from one footpoint up over the arch and down to the other.
    vec4 la = uLoopA[idx];
    vec4 lb = uLoopB[idx];
    float s = fract(aSeed.x + uTime * 0.06 * (0.6 + 0.8 * aSeed.y));
    vec3 dir = normalize(mix(la.xyz, lb.xyz, s));
    float arch = sin(3.14159265 * s);
    vec3 t = aTan - dot(aTan, dir) * dir;
    pos = dir * (1.0 + lb.w * arch) + t * 0.035 * (0.4 + aSeed.z) * (0.6 + 0.8 * uTurb) * (0.4 + arch);
    a = la.w * smoothstep(0.0, 0.05, s) * (1.0 - smoothstep(0.95, 1.0, s)) * 0.9;
    heat = 0.93 - 0.5 * arch * clamp(lb.w / 0.5, 0.3, 1.0);
  } else if (aKind < 1.5) {
    // Thrown up from a vent; up and back down on a parabola, drifting sideways.
    vec4 v = uVent[idx];
    float tau = fract(aSeed.x + uTime * 0.16 * (0.7 + 0.6 * aSeed.y));
    vec3 t = aTan - dot(aTan, v.xyz) * v.xyz;
    t = t / max(length(t), 1e-4);
    float hgt = (0.1 + 0.42 * aSeed.z) * (0.55 + 0.45 * v.w) * (0.7 + 0.6 * uTurb) * (0.85 + 0.3 * uPulse);
    pos = normalize(v.xyz + t * (0.05 * aSeed.y + (0.04 + 0.22 * aSeed.w) * tau)) * (1.0 + hgt * 4.0 * tau * (1.0 - tau));
    a = v.w * smoothstep(0.0, 0.15, tau) * (1.0 - smoothstep(0.86, 1.0, tau));
    heat = 0.95 - 0.5 * tau;
  } else {
    // Embers drift out, wandering a little, cooling and fading.
    float tau = fract(aSeed.x + uTime * 0.035 * (0.6 + 0.8 * aSeed.y));
    vec3 wander = vec3(
      sin(uTime * 0.3 + aSeed.z * 30.0),
      cos(uTime * 0.27 + aSeed.w * 30.0),
      sin(uTime * 0.23 + aSeed.y * 30.0));
    vec3 dir = normalize(aTan + wander * 0.3 * tau);
    pos = dir * (1.02 + tau * (0.7 + 0.5 * aSeed.z));
    a = 0.75 * smoothstep(0.0, 0.08, tau) * (1.0 - tau) * (1.0 - tau);
    heat = 0.62 - 0.35 * tau;
    size *= 0.7;
  }
  vec4 world = modelMatrix * vec4(pos, 1.0);
  a *= 1.0 - behind(world.xyz);
  vCol = magma(heat) * 1.7;
  vA = a * uAlpha;
  gl_PointSize = a > 0.0 ? max(size * uPx, 1.5) : 0.0;
  // A hidden dot goes outside the frame, so it is never drawn at all.
  gl_Position = a > 0.0 ? projectionMatrix * viewMatrix * world : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/** The currents' filaments, a slow wave of light travelling along each. */
export const LINE_VERTEX = /* glsl */ `
attribute vec2 aAlong;
attribute float aHeat;
${PARTICLE_COMMON}
void main() {
  float u = aAlong.x;
  float ph = aAlong.y;
  float env = pow(sin(3.14159265 * u), 0.7);
  float wave = 0.5 + 0.5 * sin(TAU * (u * 1.6 - uTime * 0.09 * (0.7 + 0.6 * ph) + ph * 7.0));
  vec4 world = modelMatrix * vec4(position, 1.0);
  float r = length(position);
  // Surface lines behind the core are mostly hidden; the inner shells glow through the body.
  float vis = r > 0.95 ? 1.0 - 0.78 * behind(world.xyz) : 0.6 - 0.25 * behind(world.xyz);
  vCol = magma(aHeat + 0.14 * wave) * 2.8;
  vA = env * vis * (0.3 + 0.7 * wave * wave) * uAlpha;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const LINE_FRAGMENT = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  gl_FragColor = vec4(vCol, vA);
}
`;
