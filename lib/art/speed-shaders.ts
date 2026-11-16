/*
 * The Speed pieces' fragment shader (docs/specs/geometry-field.md, "Speed", 2026-11-16). One
 * source, specialised per scene with `#define SCENE n` (lib/art/speed.ts SCENES), drawn on a
 * full-screen quad by components/geometry-speed.ts. GLSL ES 1.0 style; three.js converts it.
 *
 * How it stays smooth and reads as speed:
 * - No ray marching. Every surface is found in closed form: the ground plane, side walls (vertical
 *   planes beside the road whose top edge is a height profile: mountains, trees, towers, cliffs),
 *   a cylinder for the tunnel and the wind, and a plane for the sea. A pixel costs a handful of
 *   noise lookups, so a laptop holds 60 fps and a phone stays usable.
 * - Perspective: one vanishing point down the road; repeats recede (lane dashes, kerbs, lamps,
 *   windows, ridges); near walls slide past fast and far ridges barely move (motion parallax).
 * - No temporal aliasing: anything evenly spaced along the road (dashes, kerbs, lamps, windows,
 *   tunnel lights, puffs of wind) is box-filtered over the distance travelled in one frame
 *   (`uBlur`), worked out exactly for a square wave, so it turns into a streak as it speeds up
 *   instead of juddering. Textures along the road never vary on less than a few metres.
 * - The world repeats every PERIOD metres (the noise wraps on it), so the travelled distance can
 *   wrap without a seam and floats keep their precision.
 * - Light is mellow: tone-mapped colours, glows rather than flashes, nothing strobes.
 *
 * Colours are written in sRGB and turned linear with C(), since the output pass turns the frame
 * back into sRGB.
 */

export const SPEED_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Every uniform the shader reads, besides the arrays and samplers set up separately. */
export const SPEED_FLOATS = [
  'uTime',
  'uTravel',
  'uSpeedN',
  'uBlur',
  'uFocal',
  'uLight',
  'uStreaks',
  'uDetail',
  'uCar',
  'uCarX',
  'uRoll',
  'uCarS',
  'uLabel',
  'uLabelA',
  'uStreakX',
] as const;

const SOURCE = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uTravel;
uniform float uSpeedN;
uniform float uBlur;
uniform float uFocal;
uniform vec2 uShake;
uniform float uLight;
uniform float uStreaks;
uniform float uDetail;
uniform float uCar;
uniform float uCarX;
uniform float uRoll;
uniform float uRoadX[32];
uniform float uRoadZ[32];
uniform float uRoadS[32];
uniform float uRoadK[32];
uniform sampler2D uField;
uniform vec4 uFieldBox;
uniform vec4 uOrbit;
uniform vec4 uTarget;
uniform float uCarS;
uniform sampler2D uLabels;
uniform float uLabel;
uniform float uLabelA;
uniform float uStreakX;

#define TAU 6.28318530718
#define PERIOD 2048.0
#define CAMH 1.45
#define HZ 0.07
#define CARZ 7.0

vec3 C(float r, float g, float b) { return pow(vec3(r, g, b), vec3(2.2)); }

// One pixel in screen units (set in main). Inside loops with break/continue derivatives are
// undefined, so footprints there are worked out from it: on a wall at depth z one pixel is
// z / f * PX metres; on the ground it is z * z / (CAMH * f) * PX metres along the road.
float PX = 0.001;
// A line of half-width w around 0 in d, antialiased over a footprint of one pixel fp.
float lineFP(float d, float w, float fp) {
  return 1.0 - smoothstep(w - fp, w + fp, abs(d));
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise along the road: w in cells, wrapping every per cells (per = PERIOD / cell length).
float pn1(float w, float per, float seed) {
  float i = floor(w);
  float f = fract(w);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash21(vec2(seed, mod(i, per))), hash21(vec2(seed, mod(i + 1.0, per))), u);
}

// Value noise across (a) and along (w) the road, wrapping along it every per cells.
float pn2(vec2 q, float per) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float w0 = mod(i.y, per);
  float w1 = mod(i.y + 1.0, per);
  float a = hash21(vec2(i.x, w0));
  float b = hash21(vec2(i.x + 1.0, w0));
  float c = hash21(vec2(i.x, w1));
  float d = hash21(vec2(i.x + 1.0, w1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Plain value noise (screen space, the sea, the sky).
float vn(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Ridged height along the road, 0..1: sharp crests, wide valleys. L is the cell (a power of two).
float ridge(float Zw, float L, float seed) {
  float per = PERIOD / L;
  float n = pn1(Zw / L, per, seed) * 0.62 + pn1(Zw / (L * 0.5), per * 2.0, seed + 3.0) * 0.28
    + pn1(Zw / (L * 0.25), per * 4.0, seed + 7.0) * 0.1 * uDetail;
  float r = 1.0 - abs(2.0 * n - 1.0);
  return r * r;
}

// A square wave (1 while fract(u) < duty) box-filtered over [u - w, u]: exact motion blur.
float sqI(float u, float duty) { return floor(u) * duty + min(fract(u), duty); }
float dashB(float u, float duty, float w) {
  w = max(w, 1e-3);
  return (sqI(u, duty) - sqI(u - w, duty)) / w;
}

// A line of half-width w (in the units of d), antialiased.
float lineAA(float d, float w) {
  float a = max(fwidth(d), 1e-5);
  return 1.0 - smoothstep(w - a, w + a, abs(d));
}

float sdBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// Trapezoid centred on the origin: bottom half-width r1, top r2, half-height he.
float sdTrap(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}

// The Data Peak ramp (Liquid Butterflies, palette Peak): violet foot, magenta, amber, white crest.
vec3 peakRamp(float h) {
  h = clamp(h, 0.0, 1.0) * 5.0;
  vec3 c = mix(C(0.04, 0.03, 0.13), C(0.35, 0.16, 0.82), clamp(h, 0.0, 1.0));
  c = mix(c, C(0.82, 0.25, 0.63), clamp(h - 1.0, 0.0, 1.0));
  c = mix(c, C(1.0, 0.69, 0.19), clamp(h - 2.0, 0.0, 1.0));
  c = mix(c, C(1.0, 0.95, 0.63), clamp(h - 3.0, 0.0, 1.0));
  return mix(c, vec3(1.0), clamp(h - 4.0, 0.0, 1.0));
}

// Lap speed as colour: violet in the slow corners, magenta, Ferrari red, hot amber at the top.
vec3 speedRamp(float v) {
  vec3 c = mix(C(0.35, 0.16, 0.82), C(0.82, 0.25, 0.63), smoothstep(0.0, 0.35, v));
  c = mix(c, C(0.95, 0.07, 0.05), smoothstep(0.3, 0.7, v));
  return mix(c, C(1.0, 0.66, 0.32), smoothstep(0.84, 1.0, v));
}

const vec3 ROSSO = vec3(0.66, 0.0, 0.0);

/* ── The road ahead (chase scenes): arrays from lib/art/speed.ts roadAhead ── */

// Road centre at forward distance z: x, slope dx/dz, arc length from the camera, curvature.
vec4 roadAt(float z) {
  if (z <= uRoadZ[0]) return vec4(uRoadX[0], 0.0, uRoadS[0] + z - uRoadZ[0], uRoadK[0]);
  int lo = 0;
  int hi = 31;
  for (int it = 0; it < 5; it++) {
    int mid = (lo + hi) / 2;
    if (uRoadZ[mid] <= z) lo = mid;
    else hi = mid;
  }
  float z0 = uRoadZ[lo];
  float dz = max(uRoadZ[hi] - z0, 1e-3);
  float t = clamp((z - z0) / dz, 0.0, 8.0);
  float slope = (uRoadX[hi] - uRoadX[lo]) / dz;
  return vec4(
    uRoadX[lo] + (uRoadX[hi] - uRoadX[lo]) * t,
    slope,
    uRoadS[lo] + (uRoadS[hi] - uRoadS[lo]) * t,
    mix(uRoadK[lo], uRoadK[hi], clamp(t, 0.0, 1.0))
  );
}

// Where the ray through screen x px meets the wall standing \`off\` metres right (+) or left (-)
// of the road centre: the nearest crossing. Straight roads in closed form; curved ones segment by
// segment along the road arrays (exact on each straight piece), then along the last one carried on.
float wallZ(float px, float f, float off, bool curved) {
  if (!curved) {
    if (px * off <= 0.0) return -1.0;
    return off * f / px;
  }
  float k = px / f;
  for (int i = 0; i < 31; i++) {
    float z0 = uRoadZ[i];
    float z1 = uRoadZ[i + 1];
    if (z1 <= 0.3) continue;
    float x0 = uRoadX[i] + off;
    float x1 = uRoadX[i + 1] + off;
    if (z0 < 0.3) {
      x0 = mix(x0, x1, (0.3 - z0) / (z1 - z0));
      z0 = 0.3;
    }
    // The ray is x = k z; the wall piece runs from (x0, z0) to (x1, z1).
    float g0 = x0 - k * z0;
    float g1 = x1 - k * z1;
    if (g0 * g1 <= 0.0) {
      float t = g0 / (g0 - g1);
      return mix(z0, z1, t);
    }
  }
  float dz = max(uRoadZ[31] - uRoadZ[30], 1e-3);
  float b = (uRoadX[31] - uRoadX[30]) / dz;
  float a = uRoadX[31] + off - b * uRoadZ[31];
  float den = k - b;
  if (abs(den) < 1e-6) return -1.0;
  float z = a / den;
  return z > uRoadZ[31] ? z : -1.0;
}

/* ── Speed lines: one particle per angular bin round the vanishing point, drawn from where it was
 *    a frame ago (a little longer) to where it is, so it lengthens with speed. ── */
float speedLines(vec2 p, vec2 vp, float f, float amount, float rMin, float rMax, float bins) {
  if (amount <= 0.001) return 0.0;
  vec2 d = p - vp;
  float r = length(d);
  float u = (atan(d.y, d.x) / TAU + 0.5) * bins;
  float bin = floor(u);
  float h = hash11(bin * 1.37 + 3.1);
  if (h > amount * 0.85) return 0.0;
  float rho = mix(rMin, rMax, hash11(bin + 17.0));
  float zp = 2.0 + mod(hash11(bin + 5.0) * 128.0 - uTravel * (0.8 + 0.4 * hash11(bin + 9.0)), 128.0);
  float head = f * rho / zp;
  float tail = f * rho / (zp + max(uBlur, 0.02) * 2.0 + 0.4);
  float centre = 0.5 + (hash11(bin + 11.0) - 0.5) * 0.6;
  float across = abs(fract(u) - centre) * TAU / bins * r;
  float w = 0.0012 + 0.0016 * hash11(bin + 23.0);
  float aa = PX * 1.2;
  float along = smoothstep(tail - aa, tail + (head - tail) * 0.35, r) * (1.0 - smoothstep(head - aa, head + aa, r));
  float fade = smoothstep(128.0, 70.0, zp) * smoothstep(2.0, 6.0, zp);
  return along * (1.0 - smoothstep(w, w + aa, across)) * fade;
}

/* ── The car, seen from behind: an original low, wide shape; Ferrari red, one light bar ── */
vec4 carLayer(vec2 p, float f, float hz, vec3 env, inout vec3 glow) {
  float sc = f / CARZ;
  vec2 q = (p - vec2(uCarX * sc, hz - CAMH * sc)) / sc;
  // A slight lean in the corners, about the middle of the body.
  q -= vec2(0.0, 0.6);
  float cr = cos(uRoll);
  float sr = sin(uRoll);
  q = vec2(cr * q.x + sr * q.y, -sr * q.x + cr * q.y) + vec2(0.0, 0.6);
  float aa = fwidth(q.x) * 1.2;
  float wheels = sdBox(vec2(abs(q.x) - 0.78, q.y - 0.34), vec2(0.17, 0.34), 0.08);
  float lower = sdBox(q - vec2(0.0, 0.42), vec2(0.96, 0.17), 0.1);
  float body = sdTrap(q - vec2(0.0, 0.73), 1.0, 0.82, 0.25);
  float cabin = sdTrap(q - vec2(0.0, 1.08), 0.64, 0.42, 0.12);
  float shape = min(min(wheels, lower), min(body, cabin));
  float a = 1.0 - smoothstep(-aa, aa, shape);
  float bar = sdBox(q - vec2(0.0, 0.8), vec2(0.76, 0.02), 0.02);
  float bd = max(bar, 0.0);
  glow += vec3(1.0, 0.05, 0.02) * (exp(-bd * 22.0) * 0.35 + exp(-bd * 3.0) * 0.07) * uCar;
  if (shape > aa) return vec4(0.0);
  vec3 c = vec3(0.008);
  // Diffuser fins and two exhausts in the black lower part.
  float fins = lineAA(abs(abs(q.x) - 0.32) - 0.0, 0.012) * step(q.y, 0.48);
  c += vec3(0.03) * fins;
  float ex = length(vec2(abs(q.x) - 0.2, q.y - 0.36)) - 0.055;
  c = mix(c, vec3(0.05, 0.02, 0.01), 1.0 - smoothstep(-aa, aa, ex));
  float inBody = 1.0 - smoothstep(-aa, aa, body);
  float top = smoothstep(0.5, 0.98, q.y);
  vec3 paint = ROSSO * (0.18 + 0.55 * top) + env * 0.12 * top;
  paint += env * 0.5 * smoothstep(0.93, 0.975, q.y) * (1.0 - smoothstep(0.975, 0.99, q.y));
  paint += env * 0.25 * (1.0 - smoothstep(0.0, 0.05, abs(body))) * step(0.6, q.y);
  c = mix(c, paint, inBody);
  float inCabin = 1.0 - smoothstep(-aa, aa, cabin);
  vec3 glass = mix(vec3(0.006, 0.006, 0.01), env * 0.45, smoothstep(1.0, 1.2, q.y) * 0.7);
  c = mix(c, glass, inCabin);
  float lit = 1.0 - smoothstep(-aa, aa, bar);
  c = mix(c, vec3(3.0, 0.1, 0.04), lit);
  return vec4(c, a * uCar);
}

// The car's shadow and the red pool of its light on the road behind it.
vec3 carOnGround(vec3 col, float x, float z, float wet) {
  if (uCar <= 0.0) return col;
  vec2 d = vec2((x - uCarX) / 1.25, (z - CARZ - 0.3) / 2.6);
  float sh = 1.0 - smoothstep(0.55, 1.0, length(d));
  col *= 1.0 - 0.75 * sh * uCar;
  vec2 g = vec2((x - uCarX) / (1.6 + wet), (z - CARZ + 2.0) / (3.0 + 5.0 * wet));
  col += vec3(0.35, 0.01, 0.005) * exp(-dot(g, g) * 1.4) * (0.08 + 0.5 * wet) * uCar;
  return col;
}

// The current section's name, quietly at the lower left (atlas rows from lib/art/speed.ts).
float labelMask(vec2 p) {
  if (uLabelA <= 0.0) return 0.0;
  float aspect = uRes.x / uRes.y;
  vec2 o = vec2(-0.5 * aspect + 0.07, -0.43);
  vec2 uv = (p - o) / vec2(0.56, 0.035);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  float rows = 9.0;
  return texture2D(uLabels, vec2(uv.x, 1.0 - (uLabel + 1.0 - uv.y) / rows)).a * uLabelA;
}

// Asphalt with the sky glancing off it toward the horizon.
vec3 asphalt(float x, float Zw, float z, vec3 skyLow, float wet) {
  float g = pn2(vec2(x * 1.7, Zw / 4.0), PERIOD / 4.0);
  vec3 c = vec3(0.018 + 0.01 * g);
  float fres = smoothstep(4.0, 160.0, z);
  return c + skyLow * (0.06 + 0.5 * wet) * fres;
}

// Lane lines: edge lines at +-edge and dashes down the middle, motion blurred.
vec3 laneLines(vec3 col, float rel, float Zw, float z, float edge, vec3 paint) {
  float fz = fwidth(z);
  float edgeL = lineAA(abs(rel) - edge, 0.08);
  float mid = lineAA(rel, 0.07) * dashB(Zw / 12.0, 0.4, (uBlur + fz) / 12.0) * 0.7;
  float fade = exp(-z / 260.0);
  return mix(col, paint, clamp((edgeL + mid) * fade, 0.0, 1.0));
}

vec3 finish(vec3 col, vec2 uv) {
  // Soft vignette, light, and a gentle tone curve before the renderer's own.
  float v = 1.0 - 0.35 * dot(uv, uv);
  return max(col * v * (0.35 + 0.9 * uLight), 0.0);
}

/* ═════ The scenes ═════ */

#if SCENE == 0
/* Monza Lap: the circuit from above, the camera circling slowly, tilted so the far side recedes.
   The track field gives each ground point its distance to the centre line and its place on the
   lap; the trail is the stretch the car has just run, coloured by its speed there. */
vec3 scene(vec2 p) {
  vec3 cam = uOrbit.xyz;
  vec3 fwd = normalize(vec3(uTarget.xy, 0.0) - cam);
  vec3 right = normalize(cross(fwd, vec3(0.0, 0.0, 1.0)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd * uOrbit.w + right * p.x + up * p.y);
  vec3 bg = mix(C(0.03, 0.02, 0.06), C(0.008, 0.006, 0.016), clamp(p.y + 0.5, 0.0, 1.0));
  if (rd.z > -0.02) return bg;
  float t = -cam.z / rd.z;
  vec2 G = cam.xy + rd.xy * t;
  vec2 uv = (G - uFieldBox.xy) / uFieldBox.z;
  vec4 fld = vec4(90.0, 1.0, 0.0, 0.0);
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) fld = texture2D(uField, uv);
  float L = uFieldBox.w;
  float d = fld.x;
  float s = fract(atan(fld.z, fld.y) / TAU + 1.0) * L;
  float far = smoothstep(1200.0, 3600.0, t);
  // The park: a dark ground with a survey grid, faint.
  vec3 col = mix(C(0.025, 0.03, 0.045), C(0.04, 0.03, 0.07), vn(G / 140.0));
  vec2 gq = G / 100.0;
  vec2 gw = fwidth(gq);
  vec2 gl = 1.0 - smoothstep(vec2(0.0), gw * 1.2, abs(fract(gq + 0.5) - 0.5));
  col += C(0.12, 0.1, 0.22) * max(gl.x, gl.y) * 0.25 * (1.0 - smoothstep(0.03, 0.12, max(gw.x, gw.y)));
  // The track: asphalt band, fine white edges, a start line.
  float aa = max(fwidth(d), 1e-3);
  float band = 1.0 - smoothstep(5.5 - aa, 5.5 + aa, d);
  col = mix(col, C(0.09, 0.09, 0.11), band);
  col += vec3(0.25) * lineAA(d - 5.5, 0.35) * (1.0 - far);
  float ds = min(s, L - s);
  col = mix(col, vec3(0.8), band * (1.0 - smoothstep(1.0, 1.0 + fwidth(ds) * 1.5, ds)));
  // The trail: what the car ran in the last part of the lap, fading.
  float behind = mod(uCarS - s, L);
  float trail = exp(-behind / (L * 0.11)) * (1.0 - smoothstep(L * 0.3, L * 0.5, behind));
  vec3 rc = speedRamp(fld.w);
  float core = 1.0 - smoothstep(1.4 - aa, 1.4 + aa, d);
  col += rc * trail * (core * 2.2 + exp(-d / 6.0) * 0.6 + exp(-d / 30.0) * 0.18);
  // The car: a red light with a soft halo, reflected on the ground round it.
  float dc = length(G - uTarget.zw);
  col += vec3(1.0, 0.06, 0.03) * (exp(-dc / 4.0) * 3.5 + exp(-dc / 22.0) * 0.6 + exp(-dc / 90.0) * 0.12);
  col = mix(col, bg, far);
  return col;
}
#endif

#if SCENE == 1
/* Monza Chase: low behind the car round the lap. Asphalt between white edge lines, red and white
   kerbs in the corners, grass, a low barrier, and the park's trees close on both sides. */
vec3 sky1(vec2 p, float hz) {
  float y = p.y - hz;
  vec3 c = mix(C(1.0, 0.78, 0.5), C(0.42, 0.55, 0.78), smoothstep(0.0, 0.45, y));
  c = mix(c, C(0.2, 0.3, 0.55), smoothstep(0.3, 0.8, y));
  c += C(1.0, 0.8, 0.5) * exp(-length(p - vec2(0.55, hz + 0.08)) * 5.0) * 0.6;
  return c;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  vec3 col = sky1(p, hz);
  vec3 skyLow = C(1.0, 0.82, 0.6);
  float best = 1e9;
  // Trees (19 m out) and the barrier (12 m), both sides.
  for (int i = 0; i < 4; i++) {
    float side = (i == 0 || i == 2) ? 1.0 : -1.0;
    float off = (i < 2 ? 12.0 : 19.0 + 3.0 * float(i - 2)) * side;
    float z = wallZ(p.x, f, off, true);
    if (z <= 0.5 || z >= best) continue;
    float y = CAMH + (p.y - hz) * z / f;
    if (y < 0.0) continue;
    vec4 rc = roadAt(z);
    float Zw = uTravel + rc.z;
    if (i < 2) {
      if (y > 1.0) continue;
      best = z;
      float fy = y / 1.0;
      col = mix(C(0.5, 0.52, 0.55), C(0.85, 0.86, 0.88), smoothstep(0.55, 0.8, fy));
      col *= 0.55 + 0.45 * lineFP(fy - 0.68, 0.08, z / f * PX);
      col = mix(col, skyLow * 0.8, smoothstep(40.0, 500.0, z));
    } else {
      float seed = side > 0.0 ? 11.0 : 29.0;
      float H = 17.0 + 9.0 * pn1(Zw / 32.0, PERIOD / 32.0, seed) + 3.5 * pn1(Zw / 8.0, PERIOD / 8.0, seed + 1.0);
      if (y > H) continue;
      best = z;
      float leaf = pn2(vec2(y / 2.5, Zw / 8.0), PERIOD / 8.0);
      float lit = smoothstep(H - 6.0, H, y) * 0.7 + 0.3 * leaf;
      col = mix(C(0.05, 0.08, 0.04), C(0.32, 0.36, 0.14), lit * 0.8);
      col *= 0.55 + 0.45 * smoothstep(0.0, 4.0, y);
      col = mix(col, skyLow * 0.7, smoothstep(60.0, 700.0, z));
    }
  }
  if (best > 1e8 && p.y < hz) {
    float z = CAMH * f / (hz - p.y);
    vec4 rc = roadAt(z);
    float x = p.x * z / f;
    float rel = (x - rc.x) / sqrt(1.0 + rc.y * rc.y);
    float Zw = uTravel + rc.z;
    float ar = abs(rel);
    vec3 grass = mix(C(0.16, 0.24, 0.08), C(0.24, 0.32, 0.12), pn2(vec2(rel / 3.0, Zw / 8.0), PERIOD / 8.0));
    col = grass;
    if (ar < 6.0) col = asphalt(rel, Zw, z, skyLow, 0.0);
    // Kerbs: on the inside of every corner, and both sides in the chicanes.
    float k = rc.w;
    float inside = sign(k) * -sign(rel);
    float kerbOn = smoothstep(0.0025, 0.005, abs(k)) * (inside > 0.0 ? 1.0 : smoothstep(0.012, 0.02, abs(k)));
    if (ar >= 6.0 && ar < 7.3 && kerbOn > 0.0) {
      float red = dashB(Zw / 4.0, 0.5, (uBlur + fwidth(z)) / 4.0);
      vec3 kerb = mix(C(0.95, 0.95, 0.92), C(0.85, 0.06, 0.05), red);
      col = mix(col, kerb, kerbOn);
    }
    col = mix(col, vec3(0.85), lineAA(ar - 5.8, 0.12) * exp(-z / 300.0));
    col = carOnGround(col, x, z, 0.0);
    col = mix(col, skyLow * 0.7, smoothstep(80.0, 900.0, z));
  }
  return col;
}
#endif

#if SCENE == 2 || SCENE == 3
/* The mountains as walls beside the road: a ridge profile along the road, layered at three
   distances so the near ridge slides past and the far one barely moves. */
float mountainH(float Zw, int k, float seed) {
  if (k == 0) return 1.2 + 4.5 * ridge(Zw, 32.0, seed);
  if (k == 1) return 18.0 + 70.0 * ridge(Zw, 64.0, seed);
  if (k == 2) return 60.0 + 240.0 * ridge(Zw, 128.0, seed);
  return 200.0 + 620.0 * ridge(Zw, 256.0, seed);
}
// Wall distances off the road, and how far each layer is drawn before the next takes over (so
// ridges never crowd into a comb at the vanishing point).
float mountainOff(int k) { return k == 0 ? 16.0 : k == 1 ? 110.0 : k == 2 ? 300.0 : 900.0; }
float mountainFar(int k) { return k == 0 ? 400.0 : k == 1 ? 1600.0 : k == 2 ? 4500.0 : 14000.0; }
#endif

#if SCENE == 2
/* Peak Straight: an endless straight between mountains drawn as topo lines (Wire and Data Peak):
   each wall's lines echo its ridge, coloured up the Data Peak ramp, every fifth brighter. */
vec3 topo(float y, float H, float z, float fy) {
  float t = clamp(y / H, 0.0, 1.0);
  float c = t * 16.0;
  float fw = max(16.0 / H * fy, 1e-4);
  float dl = abs(fract(c + 0.5) - 0.5) / fw;
  float idx = step(abs(mod(floor(c + 0.5), 5.0)), 0.0);
  float line = 1.0 - smoothstep(0.4 + idx * 0.5, 1.2 + idx * 0.6, dl);
  float dense = smoothstep(0.12, 0.45, fw);
  line = mix(line, 0.15, dense);
  float rim = 1.0 - smoothstep(0.6, 1.6, (H - y) / max(fy, 1e-4));
  vec3 lc = peakRamp(0.12 + t * 0.88);
  vec3 fill = mix(C(0.02, 0.012, 0.05), C(0.06, 0.02, 0.1), t);
  vec3 col = fill + lc * line * (0.55 + idx * 0.6) + vec3(1.0, 0.95, 0.9) * rim * 1.1;
  return col * exp(-z / 2600.0);
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float y0 = p.y - hz;
  vec3 col = mix(C(0.09, 0.03, 0.14), C(0.01, 0.008, 0.03), smoothstep(0.0, 0.5, y0));
  col += C(0.55, 0.2, 0.5) * exp(-abs(y0) * 18.0) * 0.18;
  float sx = abs(p.x) + 1e-4;
  float side = p.x > 0.0 ? 1.0 : -1.0;
  bool hit = false;
  for (int k = 0; k < 4; k++) {
    float z = mountainOff(k) * f / sx;
    if (z > mountainFar(k)) continue;
    float y = CAMH + y0 * z / f;
    if (y < 0.0) continue;
    float Zw = uTravel + z;
    float H = mountainH(Zw, k, float(k) * 7.0 + (side > 0.0 ? 0.0 : 31.0));
    if (y < H) {
      col = topo(y, H, z, z / f * PX) * (1.0 - smoothstep(mountainFar(k) * 0.6, mountainFar(k), z) * 0.6);
      hit = true;
      break;
    }
  }
  if (!hit && y0 > 0.0) {
    // The far range across the horizon, too far to move.
    float a = p.x / f;
    float H = 0.035 + 0.05 * (vn(vec2(a * 6.0, 1.0)) * 0.7 + vn(vec2(a * 17.0, 4.0)) * 0.3);
    if (y0 < H) col = topo(y0, H, 4000.0, PX) * 0.8;
  }
  if (!hit && y0 < 0.0) {
    float z = CAMH * f / -y0;
    float x = p.x * z / f;
    float Zw = uTravel + z;
    col = vec3(0.004, 0.003, 0.01);
    // A survey grid on the plain: lines along the road and across it (blurred), violet.
    float along = lineAA(fract(x / 8.0 + 0.5) - 0.5, 0.012 + fwidth(x / 8.0) * 0.4);
    float across = dashB(Zw / 16.0, 0.03, (uBlur + fwidth(z)) / 16.0);
    float gfade = exp(-z / 400.0) * (1.0 - smoothstep(0.2, 0.6, fwidth(x / 8.0)));
    col += C(0.35, 0.16, 0.82) * (along * 0.25 + across * 0.3) * gfade * step(6.5, abs(x));
    if (abs(x) < 6.0) col = asphalt(x, Zw, z, C(0.3, 0.15, 0.4), 0.0) * 0.6;
    col = laneLines(col, x, Zw, z, 5.6, vec3(0.9));
    col = carOnGround(col, x, z, 0.0);
  }
  // Roadside reflectors: an amber light every 32 m each side, streaking when fast.
  for (int s = 0; s < 2; s++) {
    float off = s == 0 ? 7.2 : -7.2;
    float z = wallZ(p.x, f, off, false);
    if (z > 1.0 && z < 900.0) {
      float y = CAMH + y0 * z / f;
      float fy = z / f * PX;
      float on = lineFP(y - 0.9, 0.05, fy);
      float Zw = uTravel + z + (s == 0 ? 0.0 : 16.0);
      float lamp = dashB(Zw / 32.0, 0.012, (uBlur + z * z / (off * f) * PX) / 32.0);
      col += C(1.0, 0.6, 0.2) * on * lamp * 3.0 * exp(-z / 300.0);
    }
  }
  return col;
}
#endif

#if SCENE == 3
/* Mountain Pass: the road winds through filled mountains at dusk, Data Peak colours: violet feet,
   magenta and amber slopes, snow on the high crests, the far ridges fading into the sky. */
vec3 sky3(vec2 p, float hz) {
  float y = p.y - hz;
  vec3 c = mix(C(1.0, 0.62, 0.32), C(0.82, 0.3, 0.52), smoothstep(-0.02, 0.18, y));
  c = mix(c, C(0.22, 0.1, 0.42), smoothstep(0.12, 0.5, y));
  c += C(1.0, 0.75, 0.45) * exp(-length(p - vec2(-0.35, hz + 0.03)) * 9.0) * 0.9;
  return c;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float y0 = p.y - hz;
  vec3 col = sky3(p, hz);
  vec3 haze = C(0.95, 0.55, 0.5);
  float best = 1e9;
  for (int i = 0; i < 6; i++) {
    int k = i / 2;
    float side = (i == 0 || i == 2 || i == 4) ? 1.0 : -1.0;
    float off = mountainOff(k + 1) * 0.55 * side;
    float z = wallZ(p.x, f, off, true);
    if (z <= 0.5 || z >= best) continue;
    float y = CAMH + y0 * z / f;
    if (y < 0.0) continue;
    vec4 rc = roadAt(z);
    float Zw = uTravel + rc.z;
    float H = mountainH(Zw, k + 1, float(k) * 5.0 + (side > 0.0 ? 2.0 : 19.0));
    if (y >= H) continue;
    best = z;
    float t = y / H;
    float band = t + 0.08 * (pn2(vec2(y / 18.0, Zw / 32.0), PERIOD / 32.0) - 0.5);
    vec3 m = peakRamp(0.08 + band * 0.62);
    m *= 0.35 + 0.65 * smoothstep(0.0, 1.0, t);
    float snow = smoothstep(0.82, 0.92, t + 0.05 * pn1(Zw / 16.0, PERIOD / 16.0, 3.0)) * step(150.0, H);
    m = mix(m, C(0.95, 0.85, 0.9), snow);
    float fy = z / f * PX;
    float rim = 1.0 - smoothstep(0.8, 2.2, (H - y) / max(fy, 1e-4));
    m += C(1.0, 0.75, 0.4) * rim * 0.9;
    float c = t * 12.0;
    float fc = 12.0 / H * fy;
    m += peakRamp(0.6 + t * 0.4) * lineFP(fract(c + 0.5) - 0.5, 0.02, fc) * 0.15 * (1.0 - smoothstep(0.1, 0.3, fc));
    col = mix(m, haze * 0.8, smoothstep(30.0, 2200.0, z) * 0.8);
  }
  if (best > 1e8 && y0 > 0.0) {
    float a = p.x / f;
    float H = 0.05 + 0.07 * (vn(vec2(a * 4.0, 2.0)) * 0.7 + vn(vec2(a * 13.0, 5.0)) * 0.3);
    if (y0 < H) col = mix(peakRamp(0.3 + 0.5 * y0 / H), haze, 0.55);
  }
  if (best > 1e8 && y0 < 0.0) {
    float z = CAMH * f / -y0;
    vec4 rc = roadAt(z);
    float x = p.x * z / f;
    float rel = (x - rc.x) / sqrt(1.0 + rc.y * rc.y);
    float Zw = uTravel + rc.z;
    col = mix(C(0.08, 0.04, 0.12), C(0.16, 0.07, 0.16), pn2(vec2(rel / 4.0, Zw / 16.0), PERIOD / 16.0));
    if (abs(rel) < 5.5) col = asphalt(rel, Zw, z, C(0.9, 0.5, 0.45), 0.05);
    col = laneLines(col, rel, Zw, z, 5.1, C(1.0, 0.92, 0.85));
    // Guard rails: a steel band on each side catching the sunset.
    col = mix(col, C(0.9, 0.6, 0.5), lineAA(abs(rel) - 6.6, 0.12) * 0.8 * exp(-z / 500.0));
    col = carOnGround(col, x, z, 0.0);
    col = mix(col, haze * 0.7, smoothstep(60.0, 1500.0, z) * 0.85);
  }
  return col;
}
#endif

#if SCENE == 4
/* Wind Corridor: smoke lines (the Wind series' warm white) on four cylinders round the car's line
   of travel. They stream past toward the camera; at the car they bulge outward round the body
   and close behind it, brighter where the air speeds up over the shoulders. */
vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float y0 = p.y - hz;
  vec3 col = mix(C(0.02, 0.04, 0.08), C(0.005, 0.008, 0.02), smoothstep(-0.1, 0.5, y0));
  col += C(0.2, 0.35, 0.55) * exp(-abs(y0) * 14.0) * 0.12;
  float zGround = y0 < 0.0 ? CAMH * f / -y0 : 1e9;
  if (y0 < 0.0) {
    float z = zGround;
    float x = p.x * z / f;
    float Zw = uTravel + z;
    col = asphalt(x, Zw, z, C(0.2, 0.3, 0.45), 0.1) * 0.8;
    col = laneLines(col, x, Zw, z, 5.6, C(0.75, 0.8, 0.85));
    // Air along the ground: faint lines at constant x, puffing.
    float gx = x / 1.6;
    float gl = lineAA(fract(gx + 0.5) - 0.5, 0.02);
    float puff = dashB(Zw / 8.0 + hash11(floor(gx + 0.5)) * 3.0, 0.3, (uBlur + fwidth(z)) / 8.0);
    col += C(0.9, 0.88, 0.8) * gl * puff * 0.35 * exp(-z / 90.0) * (1.0 - smoothstep(0.2, 0.5, fwidth(gx)));
    col = carOnGround(col, x, z, 0.2);
  }
  float A2 = p.x * p.x + y0 * y0;
  float c = CAMH - 0.7;
  float acc = 0.0;
  for (int k = 0; k < 4; k++) {
    float rho = k == 0 ? 1.7 : k == 1 ? 2.6 : k == 2 ? 4.0 : 6.5;
    float lines = k == 0 ? 14.0 : k == 1 ? 18.0 : k == 2 ? 24.0 : 30.0;
    float rEff = rho;
    float z = 0.0;
    float th = 0.0;
    float qy = 0.0;
    for (int it = 0; it < 3; it++) {
      float disc = c * c * y0 * y0 - A2 * (c * c - rEff * rEff);
      if (disc < 0.0) break;
      float u = (-c * y0 + sqrt(disc)) / A2;
      z = u * f;
      vec2 q = vec2(p.x * u, c + y0 * u);
      th = atan(q.y, q.x);
      qy = q.y;
      // The bulge round the car: strongest just ahead of its nose, weaker far out, closing behind.
      float zc = (z - CARZ - 1.5) / 3.2;
      float bump = exp(-zc * zc) * (zc > 0.0 ? 1.0 : 0.7);
      rEff = rho + bump * 2.2 / rho * (0.7 + 0.3 * sin(th));
    }
    if (z <= 0.5 || z > zGround) continue;
    float Zw = uTravel + z;
    float u = (th / TAU + 0.5) * lines;
    float id = floor(u);
    float j = hash11(id + float(k) * 41.0);
    float centre = 0.5 + (j - 0.5) * 0.5;
    float dl = abs(fract(u) - centre) * TAU / lines * rEff;
    // One pixel on the cylinder, across the line; the smoke lines stay a pixel or two wide.
    float aw = max(z / f * PX, 1e-4);
    float w = aw * (0.5 + 0.7 * j);
    float lineM = 1.0 - smoothstep(w, w + aw, dl);
    float zfp = z * z / (rEff * f) * PX;
    float puffs = 0.35 + 0.65 * dashB(Zw / (6.0 + 4.0 * j) + j * 5.0, 0.45, (uBlur + zfp) / (6.0 + 4.0 * j));
    float fast = 1.0 + 1.2 * (rEff - rho) * rho;
    float fade = exp(-z / 90.0) * smoothstep(3.0, 12.0, z);
    // Below the road there is no air to see (the axis runs 0.7 m above it).
    float above = smoothstep(-0.7, -0.5, qy);
    acc += lineM * puffs * fade * fast * above * (k == 3 ? 0.35 : 0.55);
  }
  col += mix(C(0.75, 0.88, 1.0), C(1.0, 0.95, 0.85), 0.6) * acc;
  return col;
}
#endif

#if SCENE == 5
/* Neon Run: towers built of light both sides (the City of Dreams' glowing grains): lit floors
   whose windows blur into lines when fast, neon edges, a second row standing taller behind, and
   all of it mirrored in the wet road. */
vec3 tower(float Zw, float y, float z, float row, float side, float fy, float fz, out float hit) {
  hit = 0.0;
  float L = 32.0;
  float cell = floor(Zw / L);
  float cid = mod(cell, PERIOD / L) + row * 101.0 + (side > 0.0 ? 0.0 : 57.0);
  float g0 = 2.0 + 5.0 * hash11(cid * 1.7);
  float g1 = 2.0 + 6.0 * hash11(cid * 2.3 + 1.0);
  float H = (row < 0.5 ? 18.0 + 90.0 * pow(hash11(cid * 3.1 + 2.0), 1.6) : 60.0 + 220.0 * hash11(cid * 4.7 + 5.0));
  if (y > H) return vec3(0.0);
  float a = cell * L + g0;
  float b = (cell + 1.0) * L - g1;
  float w = max(uBlur, fz * 0.5);
  // How much of [Zw - w, Zw] the tower covers: soft edges as it speeds past.
  float cov = clamp((min(Zw, b) - max(Zw - w, a)) / w, 0.0, 1.0);
  if (cov <= 0.0) return vec3(0.0);
  hit = cov;
  float hue = hash11(cid * 5.3 + 7.0);
  vec3 neon = hue < 0.3 ? C(0.62, 0.38, 1.0) : hue < 0.55 ? C(1.0, 0.25, 0.68) : hue < 0.8 ? C(0.25, 0.85, 1.0) : hue < 0.95 ? C(1.0, 0.72, 0.3) : C(1.0, 0.1, 0.06);
  float floorI = floor(y / 3.6);
  float litF = step(0.35, hash11(cid * 7.1 + floorI * 0.37));
  float inFloor = smoothstep(0.6, 0.9, fract(y / 3.6)) * (1.0 - smoothstep(0.9, 1.0, fract(y / 3.6)));
  inFloor = mix(inFloor, 0.3, smoothstep(0.15, 0.5, fy / 3.6));
  float win = dashB((Zw - a) / 3.2, 0.62, (uBlur + fz) / 3.2);
  vec3 c = C(0.02, 0.015, 0.04);
  vec3 warm = mix(C(1.0, 0.85, 0.6), neon, 0.45);
  c += warm * litF * inFloor * win * 0.9;
  float edge = max(1.0 - smoothstep(0.0, max(fy, 1e-4) * 2.0, H - y), 0.0);
  float corner = clamp((min(Zw, min(a + 0.7, b)) - max(Zw - w, a)) / w, 0.0, 1.0)
    + clamp((min(Zw, b) - max(Zw - w, max(b - 0.7, a))) / w, 0.0, 1.0);
  c += neon * (edge * 2.2 + corner * 1.4);
  return c * cov;
}

vec3 city(vec2 p, float f, float hz, out float zHit) {
  float y0 = p.y - hz;
  zHit = 1e9;
  vec3 col = vec3(0.0);
  float sx = abs(p.x) + 1e-4;
  float side = p.x > 0.0 ? 1.0 : -1.0;
  float acc = 0.0;
  for (int r = 0; r < 2; r++) {
    float off = r == 0 ? 15.0 : 46.0;
    float z = off * f / sx;
    float y = CAMH + y0 * z / f;
    if (y < 0.0 || z > 5000.0) continue;
    float h;
    vec3 c = tower(uTravel + z, y, z, float(r), side, z / f * PX, z * z / (off * f) * PX, h);
    float fog = exp(-z / 900.0);
    col += c * (1.0 - acc) * fog;
    if (h > 0.0 && zHit > 1e8) zHit = z;
    acc += h * (1.0 - acc);
    if (acc > 0.99) break;
  }
  return col;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float y0 = p.y - hz;
  vec3 sky = mix(C(0.18, 0.06, 0.25), C(0.02, 0.01, 0.05), smoothstep(0.0, 0.45, y0));
  sky += C(0.9, 0.3, 0.6) * exp(-length(vec2(p.x * 0.6, y0)) * 9.0) * 0.25;
  vec3 col;
  float zc;
  if (y0 >= 0.0) {
    vec3 c = city(p, f, hz, zc);
    col = sky + c;
  } else {
    float z = CAMH * f / -y0;
    float x = p.x * z / f;
    float Zw = uTravel + z;
    vec3 c = city(p, f, hz, zc);
    if (zc < z) {
      col = c;
    } else {
      col = asphalt(x, Zw, z, C(0.4, 0.15, 0.4), 0.3);
      // The city in the wet road, a little broken up by the surface.
      float jitter = (pn2(vec2(x * 2.0, Zw / 4.0), PERIOD / 4.0) - 0.5) * 0.012;
      vec2 pr = vec2(p.x + jitter, hz - y0 * 0.9);
      float zr;
      vec3 refl = city(pr, f, hz, zr) + sky * 0.3;
      col += refl * (0.25 + 0.35 * smoothstep(4.0, 80.0, z));
      col = laneLines(col, x, Zw, z, 5.6, C(0.9, 0.85, 1.0));
      col = carOnGround(col, x, z, 0.6);
    }
  }
  return col;
}
#endif

#if SCENE == 6
/* Tunnel to Light: a vaulted tunnel, lamps in two long rows overhead and structural rings, all
   streaking as the car accelerates; the far portal opens as a disc of light onto the straight,
   the trees and the sky. Then the next tunnel's mouth comes back down the road. */
#define TUNNEL_LEN 1500.0
#define VAULT 6.8

vec3 outside(vec2 p, float f, float hz) {
  float y0 = p.y - hz;
  vec3 sky = mix(C(1.0, 0.92, 0.78), C(0.5, 0.68, 0.92), smoothstep(0.0, 0.5, y0)) * 2.2;
  vec3 col = sky;
  float best = 1e9;
  for (int i = 0; i < 2; i++) {
    float off = i == 0 ? 18.0 : -18.0;
    float z = wallZ(p.x, f, off, false);
    if (z <= 0.5) continue;
    float y = CAMH + y0 * z / f;
    float Zw = uTravel + z;
    float H = 15.0 + 8.0 * pn1(Zw / 32.0, PERIOD / 32.0, off) + 3.0 * pn1(Zw / 8.0, PERIOD / 8.0, off + 2.0);
    if (y < 0.0 || y > H) continue;
    best = z;
    float leaf = pn2(vec2(y / 2.5, Zw / 8.0), PERIOD / 8.0);
    col = mix(C(0.08, 0.14, 0.06), C(0.4, 0.48, 0.2), 0.3 * leaf + 0.6 * smoothstep(H - 5.0, H, y)) * 1.6;
    col = mix(col, sky * 0.8, smoothstep(50.0, 700.0, z));
  }
  if (best > 1e8 && y0 < 0.0) {
    float z = CAMH * f / -y0;
    float x = p.x * z / f;
    float Zw = uTravel + z;
    col = abs(x) < 6.0 ? asphalt(x, Zw, z, sky * 0.5, 0.0) * 2.0 : mix(C(0.2, 0.3, 0.1), C(0.3, 0.4, 0.15), pn2(vec2(x / 3.0, Zw / 8.0), PERIOD / 8.0)) * 1.6;
    col = laneLines(col, x, Zw, z, 5.6, vec3(1.6));
    col = mix(col, sky * 0.8, smoothstep(80.0, 900.0, z));
  }
  return col;
}

// Ray against the vault (a cylinder of radius VAULT on the road's centre line, at road level).
float vaultZ(vec2 p, float f, float hz, out float th) {
  float y0 = p.y - hz;
  float A2 = p.x * p.x + y0 * y0;
  float c = CAMH;
  float disc = c * c * y0 * y0 - A2 * (c * c - VAULT * VAULT);
  float u = (-c * y0 + sqrt(max(disc, 0.0))) / max(A2, 1e-6);
  vec2 q = vec2(p.x * u, c + y0 * u);
  th = atan(q.y, q.x);
  return u * f;
}

vec3 inside(vec2 p, float f, float hz, float zEnd) {
  float y0 = p.y - hz;
  float th;
  float z = vaultZ(p, f, hz, th);
  float zg = y0 < 0.0 ? CAMH * f / -y0 : 1e9;
  vec3 col;
  float zs = min(z, zg);
  if (zs > zEnd) return outside(p, f, hz);
  float Zw = uTravel + zs;
  float bw = (uBlur + fwidth(zs)) ;
  if (zg < z) {
    float x = p.x * zg / f;
    col = asphalt(x, Zw, zg, C(1.0, 0.7, 0.4), 0.15) * 0.8;
    col = laneLines(col, x, Zw, zg, 4.6, C(0.9, 0.85, 0.7));
    // The lamps' light on the road.
    col += C(1.0, 0.7, 0.4) * 0.03 * (0.6 + 0.4 * dashB(Zw / 8.0, 0.5, bw / 8.0));
    col = carOnGround(col, x, zg, 0.3);
  } else {
    float ang = th;
    float wall = 0.02 + 0.012 * pn2(vec2(ang * 6.0, Zw / 8.0), PERIOD / 8.0);
    col = vec3(wall) * C(1.0, 0.85, 0.7);
    // Panel joints every 8 m, rings every 32 m.
    col *= 0.85 + 0.15 * (1.0 - dashB(Zw / 8.0, 0.06, bw / 8.0));
    col += C(1.0, 0.8, 0.6) * dashB(Zw / 32.0, 0.03, bw / 32.0) * 0.08;
    // Two rows of lamps overhead, 4 m long every 8 m: streaks at speed.
    float aw = max(fwidth(ang), 1e-4);
    for (int i = 0; i < 2; i++) {
      float a0 = i == 0 ? 1.18 : 1.96;
      float row = 1.0 - smoothstep(0.022, 0.022 + aw * 1.5, abs(ang - a0));
      float lamp = dashB(Zw / 8.0 + float(i) * 0.5, 0.5, bw / 8.0);
      col += C(1.0, 0.82, 0.55) * row * lamp * 3.2;
      col += C(1.0, 0.7, 0.4) * exp(-abs(ang - a0) * 9.0) * 0.06;
    }
    // A thin red guide light along each wall at waist height.
    float guide = 1.0 - smoothstep(0.008, 0.008 + aw * 1.5, abs(abs(ang - 1.5708) - 1.483));
    col += C(1.0, 0.1, 0.05) * guide * 0.9;
  }
  // The opening's light spills back down the tunnel.
  col += C(1.0, 0.9, 0.75) * 0.25 * exp(-(zEnd - zs) / 60.0);
  return col * exp(-zs / 700.0) + C(0.12, 0.08, 0.05) * (1.0 - exp(-zs / 700.0)) * 0.3;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float u = mod(uTravel, PERIOD);
  if (u < TUNNEL_LEN) return inside(p, f, hz, TUNNEL_LEN - u);
  // Out on the straight; the next tunnel's portal ahead.
  float zP = PERIOD - u;
  vec3 col = outside(p, f, hz);
  float y0 = p.y - hz;
  float x = p.x * zP / f;
  float y = CAMH + y0 * zP / f;
  float zg = y0 < 0.0 ? CAMH * f / -y0 : 1e9;
  if (zg < zP) return col;
  float th;
  float zv = vaultZ(p, f, hz, th);
  float r = length(vec2(x, y));
  float hill = 26.0 + 10.0 * vn(vec2(x / 30.0, 3.0));
  if (r < VAULT && y > 0.0) {
    // Into the dark mouth: its lamps far down the tube.
    vec3 dark = vec3(0.004);
    float Zw = uTravel + zv;
    float aw = max(fwidth(th), 1e-4);
    for (int i = 0; i < 2; i++) {
      float a0 = i == 0 ? 1.18 : 1.96;
      float row = 1.0 - smoothstep(0.022, 0.022 + aw * 1.5, abs(th - a0));
      dark += C(1.0, 0.82, 0.55) * row * dashB(Zw / 8.0 + float(i) * 0.5, 0.5, (uBlur + fwidth(zv)) / 8.0) * 2.0 * exp(-(zv - zP) / 300.0);
    }
    return dark;
  }
  if (y > 0.0 && y < hill) {
    vec3 rock = mix(C(0.12, 0.13, 0.1), C(0.22, 0.24, 0.16), vn(vec2(x / 6.0, y / 6.0)));
    float ring = 1.0 - smoothstep(0.0, 0.6, abs(r - VAULT - 0.6));
    rock = mix(rock, C(0.6, 0.6, 0.58), ring);
    return mix(rock * 1.5, col, smoothstep(300.0, 1200.0, zP) * 0.6);
  }
  return col;
}
#endif

#if SCENE == 7
/* Coast Road: along a cliff top at sunset; the sea far below on the left, its sun path
   glittering, a rail at the edge, warm rock rising on the right. The road winds. */
vec3 sky7(vec2 p, float hz) {
  float y = p.y - hz;
  vec3 c = mix(C(1.0, 0.66, 0.38), C(0.56, 0.42, 0.62), smoothstep(0.0, 0.3, y));
  c = mix(c, C(0.18, 0.2, 0.42), smoothstep(0.25, 0.7, y));
  c += C(1.0, 0.8, 0.5) * exp(-length(p - vec2(-0.55, hz + 0.05)) * 7.0) * 1.2;
  return c;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float y0 = p.y - hz;
  vec3 col = sky7(p, hz);
  // Cliff on the right, 9 m off the centre line.
  float zc = wallZ(p.x, f, 9.0, true);
  if (zc > 0.5) {
    float y = CAMH + y0 * zc / f;
    vec4 rc = roadAt(zc);
    float Zw = uTravel + rc.z;
    float H = 25.0 + 55.0 * ridge(Zw, 64.0, 4.0);
    if (y > 0.0 && y < H) {
      float strata = pn2(vec2(y / 1.2, Zw / 16.0), PERIOD / 16.0) * 0.6 + pn2(vec2(y / 0.5, Zw / 4.0), PERIOD / 4.0) * 0.4;
      vec3 rock = mix(C(0.36, 0.16, 0.1), C(0.85, 0.5, 0.3), 0.55 * strata + 0.45 * smoothstep(0.0, H, y));
      // Clefts down the face, and its ledges catching the low sun.
      float cleft = pn2(vec2(y / 14.0, Zw / 4.0), PERIOD / 4.0);
      rock *= 0.45 + 0.55 * smoothstep(0.2, 0.6, cleft);
      rock += C(1.0, 0.6, 0.35) * 0.12 * smoothstep(0.75, 0.95, fract(y / 4.0 + 0.2 * cleft));
      float rim = 1.0 - smoothstep(0.8, 2.0, (H - y) / max(fwidth(y), 1e-4));
      rock += C(1.0, 0.75, 0.45) * rim * 0.6;
      return mix(rock, C(1.0, 0.7, 0.55), smoothstep(40.0, 1400.0, zc) * 0.7);
    }
  }
  if (y0 >= 0.0) {
    // Headlands far across the bay.
    float a = p.x / f;
    float H = 0.012 + 0.03 * vn(vec2(a * 5.0, 7.0)) * smoothstep(0.1, -0.6, a);
    if (y0 < H) col = mix(col, C(0.45, 0.3, 0.42), 0.8);
    return col;
  }
  float z = CAMH * f / -y0;
  vec4 rc = roadAt(z);
  float x = p.x * z / f;
  float rel = (x - rc.x) / sqrt(1.0 + rc.y * rc.y);
  float Zw = uTravel + rc.z;
  if (rel > -7.0) {
    col = rel < 6.0 ? asphalt(rel, Zw, z, C(1.0, 0.7, 0.5), 0.05) : mix(C(0.35, 0.22, 0.12), C(0.5, 0.33, 0.18), pn2(vec2(rel / 2.0, Zw / 8.0), PERIOD / 8.0));
    col = laneLines(col, rel, Zw, z, 5.4, C(1.0, 0.95, 0.85));
    col = carOnGround(col, x, z, 0.0);
    col = mix(col, C(1.0, 0.7, 0.55), smoothstep(80.0, 1400.0, z) * 0.7);
  } else {
    // Over the edge: the sea, 40 m below.
    float zs = (CAMH + 40.0) * f / -y0;
    float xs = p.x * zs / f;
    float Zs = uTravel + zs;
    float wv = vn(vec2(xs / 9.0 + uTime * 0.05, Zs / 30.0 - uTime * 0.1)) * 0.6 + vn(vec2(xs / 3.0, Zs / 8.0 + uTime * 0.2)) * 0.4;
    vec3 sea = mix(C(0.1, 0.2, 0.32), C(0.28, 0.32, 0.45), wv);
    sea = mix(sea, C(1.0, 0.68, 0.45), smoothstep(150.0, 3000.0, zs) * 0.75);
    // The sun's path: glints near its line, drifting with the waves.
    float path = exp(-abs(p.x + 0.55) * 7.0);
    float gl = smoothstep(0.72, 0.95, vn(vec2(xs / 1.5 + uTime * 0.3, Zs / 2.5)));
    sea += C(1.0, 0.85, 0.6) * gl * path * 1.6 * (1.0 - smoothstep(1500.0, 5000.0, zs));
    sea += C(1.0, 0.75, 0.5) * path * 0.25;
    col = sea;
  }
  // The rail along the edge: a steel band with posts every 2 m, blurred.
  float zr = wallZ(p.x, f, -6.8, true);
  if (zr > 0.5 && zr < z * 1.001 + 1.0) {
    float y = CAMH + y0 * zr / f;
    vec4 rr = roadAt(zr);
    float Zr = uTravel + rr.z;
    float band = step(0.55, y) * step(y, 0.8);
    float post = dashB(Zr / 2.0, 0.08, (uBlur + fwidth(zr)) / 2.0) * step(0.0, y) * step(y, 0.8);
    float m = max(band, post);
    col = mix(col, mix(C(0.5, 0.45, 0.45), C(1.0, 0.8, 0.6), smoothstep(0.55, 0.8, y)), m * exp(-zr / 900.0));
  }
  return col;
}
#endif

#if SCENE == 8
/* Salt Flat: nearly empty. White-pink salt crazed into polygons, the far edge melting in heat
   shimmer, low violet hills, a big low sun, and one long red streak racing across the flat. */
vec3 sky8(vec2 p, float hz) {
  float y = p.y - hz;
  vec3 c = mix(C(1.0, 0.72, 0.52), C(0.62, 0.5, 0.72), smoothstep(0.0, 0.25, y));
  c = mix(c, C(0.2, 0.22, 0.45), smoothstep(0.2, 0.7, y));
  c += C(1.0, 0.75, 0.5) * exp(-length(p - vec2(0.22, hz + 0.06)) * 6.0) * 0.8;
  c += C(1.0, 0.9, 0.7) * (1.0 - smoothstep(0.035, 0.04, length(p - vec2(0.22, hz + 0.06)))) * 1.5;
  return c;
}

// Crazed salt: distance to the nearest crack of a jittered cell pattern, wrapping along the road.
float salt(vec2 q, float per) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  float d1 = 9.0;
  float d2 = 9.0;
  for (int a = -1; a <= 1; a++) {
    for (int b = -1; b <= 1; b++) {
      vec2 g = vec2(float(a), float(b));
      vec2 cell = vec2(i.x + g.x, mod(i.y + g.y, per));
      vec2 o = vec2(hash21(cell), hash21(cell + 17.0)) * 0.8 + 0.1;
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) d2 = d;
    }
  }
  return d2 - d1;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ - 0.06;
  float y0 = p.y - hz;
  // Heat shimmer: the air near the ground wavers, most toward the horizon.
  float sh = exp(-abs(y0) * 40.0);
  vec2 ps = p + vec2(0.0, (vn(vec2(p.x * 40.0, uTime * 3.0)) - 0.5) * 0.004 * sh);
  y0 = ps.y - hz;
  vec3 col = sky8(ps, hz);
  float a = ps.x / f;
  float hills = 0.008 + 0.022 * (vn(vec2(a * 3.0, 9.0)) * 0.7 + vn(vec2(a * 11.0, 2.0)) * 0.3);
  if (y0 > 0.0 && y0 < hills) col = mix(col, C(0.55, 0.42, 0.62), 0.7);
  if (y0 < 0.0) {
    float z = 1.2 * f / -y0;
    float x = ps.x * z / f;
    float Zw = uTravel + z;
    vec3 groundC = mix(C(0.92, 0.82, 0.8), C(1.0, 0.9, 0.84), pn2(vec2(x / 7.0, Zw / 16.0), PERIOD / 16.0));
    float cr = salt(vec2(x / 2.0, Zw / 2.0), PERIOD / 2.0);
    float fw = max(fwidth(cr), 1e-4);
    float crack = 1.0 - smoothstep(0.02, 0.02 + fw * 1.5, cr);
    crack *= 1.0 - smoothstep(0.15, 0.45, fwidth(Zw / 2.0));
    groundC *= 1.0 - 0.16 * crack * exp(-z / 60.0);
    groundC *= 0.42;
    // The mirage: near the horizon the ground turns into sky.
    float mir = smoothstep(300.0, 2000.0, z);
    col = mix(groundC, sky8(vec2(ps.x, hz - y0 * 0.6), hz) * 0.55, mir);
  }
  // The streak: a red light crossing the flat 700 m out, its trail lingering behind it.
  float zS = 420.0;
  float yS = hz + (0.7 - 1.2) * f / zS;
  float xh = uStreakX * f / zS;
  float dy = abs(ps.y - yS);
  float behind = xh - ps.x;
  float tr = behind > 0.0 ? exp(-behind / 1.1) : 0.0;
  float thick = 0.003;
  float body = (1.0 - smoothstep(thick, thick * 2.5, dy)) * tr;
  col += C(1.0, 0.12, 0.06) * body * 3.0;
  col += C(1.0, 0.18, 0.08) * exp(-dy / 0.012) * tr * 0.4;
  float hd = length(vec2(ps.x - xh, ps.y - yS));
  col += vec3(1.0, 0.25, 0.12) * (exp(-hd / 0.004) * 3.0 + exp(-hd / 0.03) * 0.4);
  // Its reflection in the glassy salt below it.
  float yR = hz - (yS - hz) * 0.9;
  float dr = abs(ps.y - yR);
  col += C(1.0, 0.15, 0.08) * (1.0 - smoothstep(thick * 2.0, thick * 6.0, dr)) * tr * 0.5 * step(ps.y, hz);
  return col;
}
#endif

#if SCENE == 9
/* Night Rain: the straight at night in the rain. Lamps every 32 m each side streak past and stretch
   into long trembling columns in the wet asphalt; rain streams at the camera; spray lifts behind
   the car's wheels, lit red by its light bar. */
vec3 lamps(vec2 p, float f, float hz, bool mirror) {
  vec3 col = vec3(0.0);
  float y0 = p.y - hz;
  float k0 = floor(uTravel / 32.0);
  for (int s = 0; s < 2; s++) {
    float off = s == 0 ? 9.5 : -9.5;
    float ph = s == 0 ? 0.0 : 16.0;
    for (int i = 0; i < 12; i++) {
      float k = k0 + float(i);
      float zl = k * 32.0 + ph - uTravel;
      if (zl < 0.6) continue;
      float hy = mirror ? -8.0 : 8.0;
      float x1 = off * f / zl;
      float y1 = hz + (hy - CAMH) * f / zl;
      float zt = zl + max(uBlur, 0.02) * 2.5;
      float x0 = off * f / zt;
      float y0l = hz + (hy - CAMH) * f / zt;
      vec2 a = vec2(x0, y0l);
      vec2 b = vec2(x1, y1);
      vec2 pa = p - a;
      vec2 ba = b - a;
      float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
      vec2 dd = pa - ba * t;
      // In the wet road a lamp stretches into a long column.
      if (mirror) dd.y /= 7.0;
      float d = length(dd);
      float size = 0.25 * f / zl;
      float sodium = hash11(mod(k, 64.0) + float(s) * 9.0);
      vec3 lc = sodium < 0.7 ? C(1.0, 0.68, 0.32) : C(0.85, 0.9, 1.0);
      col += lc * (exp(-d / max(size * 0.12, 0.0008)) * 2.0 + exp(-d / max(size, 0.006)) * 0.4) * exp(-zl / 320.0);
    }
  }
  return col;
}

vec3 scene(vec2 p) {
  float f = uFocal;
  float hz = HZ;
  float y0 = p.y - hz;
  vec3 col = mix(C(0.06, 0.06, 0.1), C(0.008, 0.008, 0.016), smoothstep(-0.05, 0.4, y0));
  if (y0 < 0.0) {
    float z = CAMH * f / -y0;
    float x = p.x * z / f;
    float Zw = uTravel + z;
    col = asphalt(x, Zw, z, C(0.16, 0.15, 0.2), 0.6);
    if (abs(x) > 7.0) col *= 0.5;
    col = laneLines(col, x, Zw, z, 5.6, vec3(0.5));
    // Puddled streaks on the surface wobble the reflections.
    float rip = (pn2(vec2(x * 1.3, Zw / 4.0), PERIOD / 4.0) - 0.5) * 0.02;
    col += lamps(vec2(p.x + rip, p.y), f, hz, true) * 0.9 * smoothstep(3.0, 30.0, z);
    // The car's light bar in the wet road: a long red column below it.
    if (uCar > 0.0) {
      float sc = f / CARZ;
      float bx = uCarX * sc;
      float by = hz - CAMH * sc;
      float yb = by - 0.8 * sc;
      float colm = exp(-pow(abs(p.x - bx) / (0.76 * sc), 6.0)) * smoothstep(yb - 0.3, yb, p.y) * step(p.y, by);
      col += vec3(0.5, 0.012, 0.006) * colm * 0.3 * (0.6 + 0.4 * vn(vec2(p.x * 80.0, p.y * 12.0 + uTime * 2.0))) * uCar;
    }
    col = carOnGround(col, x, z, 0.2);
    col = mix(col, C(0.06, 0.06, 0.1), smoothstep(120.0, 900.0, z));
  }
  col += lamps(p, f, hz, false);
  // Rain: drops streaming at the camera from the vanishing point, faint and cool.
  col += C(0.6, 0.65, 0.75) * speedLines(p, vec2(0.0, hz + 0.05), f, 0.95, 0.4, 5.0, 260.0) * 0.18;
  // Spray from the rear wheels: soft mist, drifting back, lit red near the light bar.
  if (uCar > 0.0) {
    float sc = f / CARZ;
    vec2 base = vec2(uCarX * sc, hz - CAMH * sc);
    float mist = 0.0;
    for (int w = 0; w < 2; w++) {
      vec2 wh = base + vec2((w == 0 ? 0.78 : -0.78) * sc, 0.2 * sc);
      vec2 d = p - wh;
      float spread = 1.0 + max(-d.y, 0.0) * 5.0;
      float m = exp(-abs(d.x) / (0.25 * sc * spread)) * exp(-max(d.y, 0.0) / (0.5 * sc)) * smoothstep(-0.35, 0.0, d.y);
      mist += m * (0.5 + 0.5 * vn(vec2(d.x * 30.0 / spread, d.y * 18.0 - uTime * 6.0)));
    }
    col += mix(C(0.5, 0.52, 0.58), vec3(0.6, 0.03, 0.02), 0.45) * mist * 0.12 * uSpeedN * uCar;
  }
  return col;
}
#endif

#if SCENE == 10
/* Triangle Stream: the Wind Body from the side, red, driving left on a dark road; the triangles
   (components/geometry-speed.ts) stream over it. Here: the ground scrolling under it, the body
   lit from above with a rim along its roofline, wheels whose spokes blur as they turn, a faint
   mirror of it all in the road. World units, the view 2.2 high. */
uniform vec2 uPoly[15];
#define GROUND -0.226
#define WHEEL_R 0.085

float polySdf(vec2 p) {
  float d = 1e9;
  bool inside = false;
  for (int i = 0; i < 15; i++) {
    vec2 a = uPoly[i == 0 ? 14 : i - 1];
    vec2 b = uPoly[i];
    vec2 e = b - a;
    vec2 w = p - a;
    vec2 q = w - e * clamp(dot(w, e) / max(dot(e, e), 1e-8), 0.0, 1.0);
    d = min(d, dot(q, q));
    if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return (inside ? -1.0 : 1.0) * sqrt(d);
}

float bodySdf(vec2 w) {
  float d = polySdf(w);
  // Wheel arches.
  d = max(d, -(length(w - vec2(-0.86, -0.14)) - WHEEL_R - 0.018));
  d = max(d, -(length(w - vec2(0.12, -0.14)) - WHEEL_R - 0.018));
  return d;
}

vec3 bodyColour(vec2 w, float d) {
  float aa = max(fwidth(d), 1e-5);
  float top = smoothstep(-0.13, 0.3, w.y);
  vec3 c = ROSSO * (0.14 + 0.75 * top);
  // A soft band of reflected sky along the shoulder, and a bright rim on the roofline.
  c += C(1.0, 0.55, 0.4) * 0.18 * smoothstep(0.1, 0.2, w.y) * (1.0 - smoothstep(0.2, 0.28, w.y));
  c += C(1.0, 0.6, 0.4) * exp(d / (aa * 2.5)) * 0.8 * smoothstep(-0.05, 0.1, w.y);
  // The glasshouse: dark glass inset from the outline.
  float glass = step(0.16, w.y) * step(w.x, 0.08) * step(-0.62, w.x) * (1.0 - smoothstep(-0.03, -0.022, d));
  c = mix(c, C(0.04, 0.03, 0.05) + C(1.0, 0.5, 0.4) * 0.05 * smoothstep(0.2, 0.3, w.y), glass);
  return c;
}

vec3 wheel(vec2 w, vec2 c, float rot, float blurA, out float a) {
  vec2 q = w - c;
  float r = length(q);
  float aa = max(fwidth(r), 1e-5);
  a = 1.0 - smoothstep(WHEEL_R - aa, WHEEL_R + aa, r);
  vec3 col = vec3(0.012);
  float rim = 1.0 - smoothstep(0.052, 0.052 + aa, r);
  float ang = atan(q.y, q.x) / TAU * 5.0 + rot;
  float spokes = dashB(ang, 0.3, blurA);
  col = mix(col, mix(vec3(0.03), vec3(0.18, 0.17, 0.17), spokes), rim);
  col += vec3(0.2) * lineAA(r - 0.052, 0.003);
  return col;
}

vec3 scene(vec2 p) {
  float m = min(uRes.x, uRes.y);
  vec2 w = (gl_FragCoord.xy - 0.5 * uRes) / m * 2.2;
  float bob = 0.0025 * sin(uTime * 9.0) * min(uSpeedN, 1.0);
  vec3 col = mix(C(0.07, 0.015, 0.012), C(0.005, 0.003, 0.004), clamp(length(w * vec2(0.4, 0.8)), 0.0, 1.0));
  col += C(0.5, 0.12, 0.06) * exp(-abs(w.y - GROUND) * 9.0) * 0.12;
  if (w.y < GROUND) {
    // The road from the side: a dark band, its edge marks rushing left.
    float depth = GROUND - w.y;
    vec3 road = mix(C(0.06, 0.05, 0.05), C(0.012, 0.01, 0.01), smoothstep(0.0, 0.25, depth));
    float mark = lineAA(depth - 0.018, 0.004) * dashB((w.x + uTravel) / 0.5, 0.45, uBlur / 0.5 + fwidth(w.x) * 2.0);
    road += C(0.9, 0.85, 0.8) * mark * 0.6;
    // A faint mirror of the car in the polished road.
    vec2 mw = vec2(w.x, 2.0 * GROUND - w.y - bob);
    float md = bodySdf(mw);
    road += bodyColour(mw, md) * (1.0 - smoothstep(0.0, 0.004, md)) * 0.18 * exp(-depth * 8.0);
    col = road;
  }
  vec2 wb = w - vec2(0.0, bob);
  float d = bodySdf(wb);
  float aa = max(fwidth(d), 1e-5);
  col = mix(col, bodyColour(wb, d), 1.0 - smoothstep(-aa, aa, d));
  // Tail light at the back, a warm lamp at the nose.
  float tl = length((wb - vec2(0.405, -0.035)) * vec2(1.0, 0.45));
  col += vec3(1.0, 0.05, 0.02) * (exp(-tl / 0.006) * 2.5 + exp(-tl / 0.05) * 0.25);
  float hl = length((wb - vec2(-1.17, -0.05)) * vec2(1.0, 0.6));
  col += C(1.0, 0.85, 0.6) * (exp(-hl / 0.006) * 1.5 + exp(-hl / 0.04) * 0.12);
  float rot = uTravel / (TAU * WHEEL_R);
  float blurA = uBlur / (TAU * WHEEL_R) * 5.0;
  for (int i = 0; i < 2; i++) {
    float a;
    vec2 c = i == 0 ? vec2(-0.86, -0.14) : vec2(0.12, -0.14);
    vec3 wc = wheel(w, c, rot, blurA, a);
    col = mix(col, wc, a);
  }
  return col;
}
#endif

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  PX = 1.0 / uRes.y;
  vec2 p = uv + uShake;
  vec3 col = scene(p);
#if SCENE != 0 && SCENE != 8 && SCENE != 10
  // Speed lines round the vanishing point: sparse, faint, longer as it goes faster.
  vec2 vp = vec2(0.0, HZ);
#if SCENE == 1 || SCENE == 3 || SCENE == 7
  vp.x = roadAt(200.0).x * uFocal / 200.0;
#endif
  // Only round and above the horizon: the ground carries its own streaks.
  float sl = speedLines(p, vp, uFocal, uStreaks * (0.15 + 0.35 * uSpeedN), 1.5, 9.0, 150.0);
  col += vec3(1.0, 0.95, 0.92) * sl * 0.25 * smoothstep(HZ - 0.12, HZ + 0.02, p.y);
#endif
#if SCENE != 0 && SCENE != 8 && SCENE != 10
  vec3 glow = vec3(0.0);
  vec3 env = vec3(0.3);
#if SCENE == 1
  env = C(1.0, 0.8, 0.6);
#elif SCENE == 3 || SCENE == 7
  env = C(1.0, 0.6, 0.5);
#elif SCENE == 5
  env = C(0.7, 0.35, 0.8);
#elif SCENE == 6
  env = C(1.0, 0.75, 0.45) * 0.5;
#elif SCENE == 9
  env = C(0.4, 0.4, 0.5);
#endif
  if (uCar > 0.0) {
    vec4 car = carLayer(p, uFocal, HZ, env, glow);
    col = mix(col, car.rgb, car.a);
    col += glow;
  }
#endif
#if SCENE == 0 || SCENE == 1
  col = mix(col, vec3(0.92), labelMask(uv) * 0.75);
#endif
  gl_FragColor = vec4(finish(col, uv), 1.0);
}
`;

/** The shader for one scene (0–10). */
export function speedFragment(scene: number): string {
  return `#define SCENE ${Math.max(0, Math.min(10, Math.round(scene)))}\n${SOURCE}`;
}
