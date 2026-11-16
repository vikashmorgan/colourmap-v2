/*
 * Drive's shaders (docs/specs/drive-game.md), on the Speed pieces' shared head
 * (lib/art/speed-shaders.ts SPEED_COMMON): its noise, its colour conversion C(), its finish.
 *
 * - The backdrop: one full-screen pass drawn first, behind every mesh. It casts a ray per pixel from
 *   the game's camera and finds, in closed form, the sky, the far mountain ranges and the endless
 *   plane under them: the crazed salt with its mirage (the Salt Flat piece's own formulas, now seen
 *   from a camera that can turn), the sea under the Coast Road's cliff, or the wet night plain. One
 *   source, specialised per world with `#define WORLD n` (0 salt, 1 coast, 2 canyon, 3 night).
 * - The motes: the Coast Road piece's oncoming dust (one particle per angular bin round the
 *   vanishing point, drawn from where it was a frame ago so it lengthens with speed), added in light
 *   over everything; the weather sets their colour, number, length and width.
 * - The boosters' fire, the trails and the dust: small materials for meshes and points.
 *
 * Mellow: glows, never flashes; nothing strobes; repeating ground detail is scattered (jittered
 * cells), never a grid, and fades before it can alias.
 */

import { SPEED_COMMON } from '@/lib/art/speed-shaders';

export const DRIVE_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** World ids for the backdrop's `#define WORLD`. */
export const WORLD_SHADER: Record<'salt' | 'coast' | 'canyon' | 'night', number> = {
  salt: 0,
  coast: 1,
  canyon: 2,
  night: 3,
};

/** The backdrop's own uniforms (floats), besides SPEED_COMMON's. */
export const BACKDROP_FLOATS = [
  'uHz',
  'uCamY',
  'uPlaneY',
  'uSunAz',
  'uSunAmt',
  'uFogDen',
  'uSnow',
  'uWet',
  'uTintAmt',
  'uCourse',
] as const;

const BACKDROP = /* glsl */ `
uniform mat3 uRot;
uniform vec2 uCamW;
uniform vec2 uMtn;
uniform vec4 uLine;
uniform vec4 uGateA;
uniform vec4 uGateB;
uniform vec3 uFogCol;
uniform vec3 uTint;
uniform float uHz;
uniform float uCamY;
uniform float uPlaneY;
uniform float uSunAz;
uniform float uSunAmt;
uniform float uFogDen;
uniform float uSnow;
uniform float uWet;
uniform float uTintAmt;
uniform float uCourse;

// The sky's gradient is drawn in the pieces' screen units at their focal length.
#define F0 1.5
#define WRAPP 2048.0

float wrapA(float a) { return a - TAU * floor((a + 3.14159265) / TAU); }

// Value noise wrapping every per cells both ways (the salt repeats every 2,048 m).
float pnw(vec2 q, float per) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 i0 = mod(i, per);
  vec2 i1 = mod(i + 1.0, per);
  float a = hash21(i0);
  float b = hash21(vec2(i1.x, i0.y));
  float c = hash21(vec2(i0.x, i1.y));
  float d = hash21(i1);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Crazed salt (the Salt Flat piece's), wrapping both ways: distance to the nearest crack.
float saltW(vec2 q, float per) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  float d1 = 9.0;
  float d2 = 9.0;
  for (int a = -1; a <= 1; a++) {
    for (int b = -1; b <= 1; b++) {
      vec2 g = vec2(float(a), float(b));
      vec2 cell = mod(i + g, per);
      vec2 o = vec2(hash21(cell), hash21(cell + 17.0)) * 0.8 + 0.1;
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) d2 = d;
    }
  }
  return d2 - d1;
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * t);
}

// The sun's offset across the view and its height, in the pieces' screen units.
vec2 sunOff(float az, float yE, float sunY) {
  return vec2(-F0 * clamp(wrapA(az - uSunAz), -3.0, 3.0), yE - sunY);
}

#if WORLD == 0 || WORLD == 2
/* The Salt Flat piece's sky: warm at the horizon, violet, then deep blue; a big low sun. */
vec3 sky(float az, float yE) {
  vec3 c = mix(C(1.0, 0.72, 0.52), C(0.62, 0.5, 0.72), smoothstep(0.0, 0.25, yE));
  c = mix(c, C(0.2, 0.22, 0.45), smoothstep(0.2, 0.7, yE));
  float d = length(sunOff(az, yE, 0.06));
  c += C(1.0, 0.75, 0.5) * exp(-d * 6.0) * 0.8 * uSunAmt;
  c += C(1.0, 0.9, 0.7) * (1.0 - smoothstep(0.035, 0.04, d)) * 1.5 * uSunAmt;
  return c;
}
#elif WORLD == 1
/* The Coast Road piece's sky: amber low down, violet, deep blue; the sun over the sea. */
vec3 sky(float az, float yE) {
  vec3 c = mix(C(1.0, 0.66, 0.38), C(0.56, 0.42, 0.62), smoothstep(0.0, 0.3, yE));
  c = mix(c, C(0.18, 0.2, 0.42), smoothstep(0.25, 0.7, yE));
  c += C(1.0, 0.8, 0.5) * exp(-length(sunOff(az, yE, 0.05)) * 7.0) * 1.2 * uSunAmt;
  return c;
}
#else
/* Night: a dark sky, the city's glow low round the horizon. */
vec3 sky(float az, float yE) {
  vec3 c = mix(C(0.06, 0.06, 0.1), C(0.008, 0.008, 0.016), smoothstep(-0.05, 0.4, yE));
  float glow = exp(-max(yE, 0.0) * 14.0);
  vec3 tint = mix(C(0.5, 0.18, 0.42), C(0.75, 0.45, 0.22), 0.5 + 0.5 * sin(az * 3.0 + 1.0));
  return c + tint * glow * 0.18;
}
#endif

/* The far ranges: three rings of ridged mountains round a point that drifts with the camera at a
   fifth of its pace, so they barely move. Nearest darker and sharper, farthest pale blue-violet,
   snow on the tallest peaks, their sun side catching the low light. Returns colour and cover. */
float ridged(vec2 w) {
  float n = 0.0;
  float amp = 0.55;
  for (int o = 0; o < 4; o++) {
    float v = vn(w);
    n += (1.0 - abs(2.0 * v - 1.0)) * amp;
    w = w * 2.03 + 3.1;
    amp *= 0.5;
  }
  return n;
}

vec4 range(vec2 dir, float yE, float R, float Hmax, float layer) {
  // Cheap tests first: nothing below the horizon or above the tallest a peak could stand.
  if (yE <= 0.0) return vec4(0.0);
  float dc = dot(dir, uMtn);
  float disc = dc * dc - dot(uMtn, uMtn) + R * R;
  if (disc <= 0.0) return vec4(0.0);
  float t = dc + sqrt(disc);
  if (yE > F0 * (Hmax - uCamY) / t) return vec4(0.0);
  vec2 q = dir * t - uMtn;
  vec2 qn = q / R;
  float sc = R / 2600.0;
  vec2 w = qn * sc + layer * 7.3;
  float n = ridged(w);
  float H = Hmax * pow(clamp(n, 0.0, 1.0), 1.6);
  float top = F0 * (H - uCamY) / t;
  if (yE > top) return vec4(0.0);
  // The slope along the ring, for the light.
  vec2 tang = vec2(-qn.y, qn.x);
  float n2 = ridged((qn + tang * 0.004) * sc + layer * 7.3);
  float slope = (n2 - n) * 40.0;
  vec2 face = normalize(-qn + tang * slope * 1.5);
  vec2 sunD = vec2(cos(uSunAz), sin(uSunAz));
  float lit = clamp(0.5 + 0.5 * dot(face, sunD), 0.0, 1.0);
  vec3 base = layer < 0.5 ? C(0.3, 0.2, 0.33) : layer < 1.5 ? C(0.46, 0.35, 0.52) : C(0.64, 0.56, 0.74);
  vec3 col = base * (0.75 + 0.35 * lit) + C(1.0, 0.6, 0.4) * lit * lit * 0.22 * uSunAmt * (1.0 - layer * 0.25);
  // Snow on the tallest, where the height runs high up the peak.
  float snow = smoothstep(0.62, 0.75, H / Hmax) * step(0.5, layer);
  col = mix(col, mix(C(0.62, 0.62, 0.8), C(1.0, 0.88, 0.82), lit), snow * 0.85);
  // A soft edge on the ridge line, and haze toward the horizon.
  float edge = smoothstep(0.0, 0.0015 * (1.0 + layer), top - yE);
  float haze = 0.18 + 0.22 * layer;
  return vec4(col, edge * (1.0 - haze * 0.4)) * vec4(1.0, 1.0, 1.0, 1.0 - clamp(1.0 - exp(-t * uFogDen * 0.35), 0.0, 1.0));
}

/* Everything on the horizon at a direction and height: sky, ranges, mesas, hills. */
vec3 horizon(vec2 dir, float az, float yE) {
  vec3 col = sky(az, yE);
#if WORLD == 0 || WORLD == 2
  vec3 skyH = sky(az, 0.0);
  vec4 m = range(dir, yE, 26000.0, 1500.0, 2.0);
  col = mix(col, mix(m.rgb, skyH, 0.4), m.a);
  m = range(dir, yE, 15000.0, 750.0, 1.0);
  col = mix(col, mix(m.rgb, skyH, 0.25), m.a);
  m = range(dir, yE, 8000.0, 260.0, 0.0);
  col = mix(col, mix(m.rgb, skyH, 0.12), m.a);
  // The mesas: flat tops with sheer sides.
/*MESAS*/
  // The low violet hills of the piece, nearest of all.
  vec2 cs = vec2(cos(az), sin(az));
  float hills = 0.008 + 0.022 * (vn(cs * 3.0 + 9.0) * 0.7 + vn(cs * 11.0 + 2.0) * 0.3);
  if (yE > 0.0 && yE < hills) col = mix(col, C(0.55, 0.42, 0.62), 0.7);
#elif WORLD == 1
  // Headlands far across the bay, on the sea side.
  float rel = wrapA(az - uSunAz);
  float H = 0.012 + 0.03 * vn(vec2(az * 5.0, 7.0)) * smoothstep(1.2, 0.1, abs(rel - 0.2));
  if (yE > 0.0 && yE < H) col = mix(col, C(0.45, 0.3, 0.42), 0.8);
#elif WORLD == 3
  // The neon city's towers far off, lit floors glowing; no sharp detail at this distance.
  float cellA = floor(az * 60.0);
  float hT = hash11(mod(cellA, 377.0) + 3.0);
  float tall = 0.01 + 0.05 * hT * hT * (0.6 + 0.4 * vn(vec2(az * 4.0, 1.0)));
  if (yE > 0.0 && yE < tall) {
    vec3 tower = C(0.03, 0.025, 0.05);
    float win = smoothstep(0.55, 0.9, vn(vec2(az * 900.0, yE * 400.0)));
    vec3 lamp = mix(C(1.0, 0.68, 0.32), mix(C(0.9, 0.3, 0.8), C(0.3, 0.8, 1.0), hT), step(0.6, hT));
    col = tower + lamp * win * 0.18;
  }
#endif
  return col;
}

vec3 fogged(vec3 col, float dist) {
  return mix(col, uFogCol, 1.0 - exp(-dist * uFogDen));
}

vec3 scene(vec2 p, out float yHz) {
  vec3 dv = normalize(vec3(p.x / uFocal, (p.y - uHz) / uFocal, -1.0));
  vec3 d = uRot * dv;
  float hl = max(length(d.xz), 1e-5);
  // Game plane: x east, y north (three's -z).
  vec2 dir = vec2(d.x, -d.z) / hl;
  float az = atan(dir.y, dir.x);
  float yE = F0 * d.y / hl;
  yHz = yE;
#if WORLD == 0 || WORLD == 2
  // Heat shimmer: the air near the ground wavers, most toward the horizon.
  float sh = exp(-abs(yE) * 40.0);
  yE += (vn(vec2(az * 60.0, uTime * 3.0)) - 0.5) * 0.004 * sh;
  d.y = yE / F0 * hl;
#endif
  vec3 col = horizon(dir, az, yE);
  // Haze over the sky, thickest low down.
  col = mix(col, uFogCol, (1.0 - exp(-6000.0 * uFogDen)) * (1.0 - smoothstep(0.0, 0.6, yE)));
  if (d.y >= 0.0) return col;
  float t = (uPlaneY - uCamY) / d.y;
  if (t <= 0.0) return col;
  vec2 rel = dir * t * hl;
  float dist = t * hl;
  vec2 g = uCamW + rel;
#if WORLD == 0 || WORLD == 2
  vec3 groundC = mix(C(0.92, 0.82, 0.8), C(1.0, 0.9, 0.84), pnw(g / 11.0, WRAPP / 11.0));
  float cr = saltW(g / 2.0, WRAPP / 2.0);
  float fw = max(fwidth(cr), 1e-4);
  float crack = 1.0 - smoothstep(0.02, 0.02 + fw * 1.5, cr);
  crack *= 1.0 - smoothstep(0.15, 0.45, length(fwidth(g / 2.0)));
  groundC *= 1.0 - 0.16 * crack * exp(-dist / 60.0);
  groundC = mix(groundC, C(1.0, 0.98, 1.0), uSnow * 0.6);
  groundC *= 0.42;
#if WORLD == 0
  if (uCourse > 0.5) {
    // The painted line, worn in places, and the start and finish lines across it.
    float ld = segDist(rel, uLine.xy, uLine.zw);
    float lw = max(fwidth(ld), 1e-4);
    float worn = 0.75 + 0.25 * pnw(g / 3.0, WRAPP / 3.0);
    float lineA = (1.0 - smoothstep(0.12, 0.12 + lw * 1.5, ld)) * worn * (1.0 - smoothstep(0.04, 0.1, lw));
    groundC = mix(groundC, C(0.12, 0.12, 0.2) * 0.42, lineA * 0.85);
    for (int k = 0; k < 2; k++) {
      vec4 gt = k == 0 ? uGateA : uGateB;
      float gd = segDist(rel, gt.xy, gt.zw);
      float gw = max(fwidth(gd), 1e-4);
      float gA = (1.0 - smoothstep(0.25, 0.25 + gw * 1.5, gd)) * (1.0 - smoothstep(0.05, 0.12, gw));
      groundC = mix(groundC, C(1.0, 0.96, 0.92) * 0.55, gA * 0.7);
    }
  }
#endif
  // The mirage: toward the horizon the salt turns into the sky and the ranges, mirrored.
  float mir = smoothstep(300.0, 2000.0, dist);
  vec3 refl = horizon(dir, az, -yE * 0.6) * 0.55;
  // Wet salt mirrors a little even close by.
  col = mix(groundC + refl * (0.04 + 0.2 * uWet), refl, mir);
#elif WORLD == 1
  // Over the edge: the sea, 40 m below.
  float wv = vn(vec2(g.x / 9.0 + uTime * 0.05, g.y / 30.0 - uTime * 0.1)) * 0.6 + vn(vec2(g.x / 3.0, g.y / 8.0 + uTime * 0.2)) * 0.4;
  vec3 sea = mix(C(0.1, 0.2, 0.32), C(0.28, 0.32, 0.45), wv);
  sea = mix(sea, C(1.0, 0.68, 0.45), smoothstep(150.0, 3000.0, dist) * 0.75);
  float path = exp(-abs(sunOff(az, 0.0, 0.0).x) * 7.0) * uSunAmt;
  float gl = smoothstep(0.72, 0.95, vn(vec2(g.x / 1.5 + uTime * 0.3, g.y / 2.5)));
  sea += C(1.0, 0.85, 0.6) * gl * path * 1.6 * (1.0 - smoothstep(1500.0, 5000.0, dist));
  sea += C(1.0, 0.75, 0.5) * path * 0.25;
  col = mix(sea, C(0.9, 0.95, 1.0) * 0.6, uSnow * 0.15);
#else
  // The wet night plain: near black, the city's glow lying in it.
  float rip = pnw(g / 4.0, WRAPP / 4.0);
  vec3 plain = C(0.012, 0.012, 0.02) * (0.8 + 0.4 * rip);
  plain += horizon(dir, az, -yE * 0.8) * (0.25 + 0.25 * uWet);
  col = mix(plain, C(0.06, 0.06, 0.1), smoothstep(200.0, 1500.0, dist));
#endif
  return fogged(col, dist);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  PX = 1.0 / uRes.y;
  vec2 p = uv + uShake;
  float yHz;
  vec3 col = scene(p, yHz);
  col = mix(col, uTint * (0.25 + dot(col, vec3(0.6))), uTintAmt);
  gl_FragColor = vec4(finish(col, uv), 1.0);
}
`;

/** The mesas' GLSL, from lib/art/salt-flat-game.ts MESAS: flat tops with sheer, soft sides. */
export function mesaGlsl(mesas: readonly { az: number; half: number; height: number }[]): string {
  return mesas
    .map(
      (m) =>
        `  { float da = abs(wrapA(az - ${m.az.toFixed(4)})); float mh = ${m.height.toFixed(4)} * (1.0 - smoothstep(${(m.half * 0.8).toFixed(4)}, ${m.half.toFixed(4)}, da)) * (0.93 + 0.07 * vn(vec2(az * 80.0, 3.0)));\n    if (yE > 0.0 && yE < mh) col = mix(col, mix(C(0.42, 0.28, 0.4), sky(az, 0.0), 0.25), 0.9); }`,
    )
    .join('\n');
}

/** The backdrop for one world. */
export function backdropFragment(
  world: 'salt' | 'coast' | 'canyon' | 'night',
  mesas: readonly { az: number; half: number; height: number }[],
): string {
  const src = BACKDROP.replace('/*MESAS*/', mesaGlsl(mesas));
  return `#define WORLD ${WORLD_SHADER[world]}\n${SPEED_COMMON}\n${src}`;
}

/* ── The motes ─────────────────────────────────────────────── */

export const MOTE_FLOATS = ['uAmount', 'uLen', 'uWid', 'uBelow', 'uHzS', 'uBright'] as const;

/**
 * The Coast Road piece's speed lines (SPEED_COMMON `speedLines`) with a length and a width, over a
 * second, denser layer in thick weather.
 */
export const MOTE_FRAGMENT = /* glsl */ `${SPEED_COMMON}
uniform vec2 uVp;
uniform vec3 uMote;
uniform float uAmount;
uniform float uLen;
uniform float uWid;
uniform float uBelow;
uniform float uHzS;
uniform float uBright;

float motes(vec2 p, vec2 vp, float f, float amount, float rMin, float rMax, float bins, float seed) {
  if (amount <= 0.001) return 0.0;
  vec2 d = p - vp;
  float r = length(d);
  float u = (atan(d.y, d.x) / TAU + 0.5) * bins;
  float bin = floor(u) + seed;
  float h = hash11(bin * 1.37 + 3.1);
  if (h > amount * 0.85) return 0.0;
  float rho = mix(rMin, rMax, hash11(bin + 17.0));
  float zp = 2.0 + mod(hash11(bin + 5.0) * 128.0 - uTravel * (0.8 + 0.4 * hash11(bin + 9.0)), 128.0);
  float head = f * rho / zp;
  float tail = f * rho / (zp + (max(uBlur, 0.02) * 2.0 + 0.4) * uLen);
  float centre = 0.5 + (hash11(bin + 11.0) - 0.5) * 0.6;
  float across = abs(fract(u) - centre) * TAU / bins * r;
  float w = (0.0012 + 0.0016 * hash11(bin + 23.0)) * uWid;
  float aa = PX * 1.2;
  float along = smoothstep(tail - aa, tail + (head - tail) * 0.35, r) * (1.0 - smoothstep(head - aa, head + aa, r));
  float fade = smoothstep(128.0, 70.0, zp) * smoothstep(2.0, 6.0, zp);
  return along * (1.0 - smoothstep(w, w + aa, across)) * fade;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  PX = 1.0 / uRes.y;
  vec2 p = uv + uShake;
  float sl = motes(p, uVp, uFocal, uAmount, 1.5, 9.0, 150.0, 0.0);
  // Thick weather: a second, nearer layer.
  float thick = clamp((uAmount - 0.55) * 2.0, 0.0, 1.0);
  sl += motes(p, uVp, uFocal, thick * 0.95, 0.4, 5.0, 260.0, 911.0) * 0.8;
  float place = mix(smoothstep(uHzS - 0.12, uHzS + 0.02, p.y), 1.0, uBelow);
  vec3 col = uMote * sl * uBright * place;
  gl_FragColor = vec4(finish(col, uv), 1.0);
}
`;

/* ── Fire, trails, dust ────────────────────────────────────── */

/** The booster flame: a cone, hot at the nozzle, cooling along three colours to its tip. */
export const FIRE_VERTEX = /* glsl */ `
uniform float uLenK;
varying float vT;
varying float vFacing;
varying float vAng;
void main() {
  // The cone's tip is +y; t runs 0 at the nozzle to 1 at the tip.
  vT = clamp(position.y + 0.5, 0.0, 1.0);
  // atan(0, 0) at the tip is undefined (NaN on some GPUs, which the bloom spreads over the frame).
  vAng = atan(position.z, position.x + 1e-4);
  vec3 pos = vec3(position.x, (position.y + 0.5) * uLenK, position.z);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vFacing = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}
`;

export const FIRE_FRAGMENT = /* glsl */ `
uniform vec3 uS0;
uniform vec3 uS1;
uniform vec3 uS2;
uniform float uTime;
uniform float uPower;
uniform float uSeed;
varying float vT;
varying float vFacing;
varying float vAng;
float h1(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float n1(float x) { float i = floor(x); float f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), u); }
void main() {
  float t = vT;
  vec3 c = mix(uS0, uS1, smoothstep(0.0, 0.35, t));
  c = mix(c, uS2, smoothstep(0.35, 0.85, t));
  // Tongues: noise running down the flame, smooth in time, so it licks rather than flickers.
  float tongue = 0.65 + 0.35 * n1(t * 7.0 - uTime * 9.0 + vAng * 1.7 + uSeed * 13.0);
  float body = pow(max(1.0 - t, 0.0), 1.25) * pow(clamp(vFacing, 0.0, 1.0), 1.4) * tongue;
  gl_FragColor = vec4(c * body * uPower * 2.2, 1.0);
}
`;

/** A trail ribbon: its alpha fades with age and toward its edges. */
export const RIBBON_VERTEX = /* glsl */ `
attribute float aAlpha;
attribute float aSide;
varying float vAlpha;
varying float vSide;
void main() {
  vAlpha = aAlpha;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RIBBON_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
varying float vAlpha;
varying float vSide;
void main() {
  float edge = 1.0 - vSide * vSide;
  gl_FragColor = vec4(uColour, vAlpha * edge * uOpacity);
}
`;

/** Dust, spray and sparks as soft round points that grow as they fade. */
export const PUFF_VERTEX = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.5, aSize * uScale / max(-mv.z, 0.1));
  gl_Position = projectionMatrix * mv;
}
`;

export const PUFF_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = (1.0 - smoothstep(0.2, 1.0, r)) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColour, a);
}
`;
