/*
 * Drive's shaders (docs/specs/drive-game.md), on the Speed pieces' shared head
 * (lib/art/speed-shaders.ts SPEED_COMMON): its noise, its colour conversion C(), its finish.
 *
 * - The backdrop: one full-screen pass drawn first, behind every mesh. It casts a ray per pixel from
 *   the game's camera and finds, in closed form, the sky, the far mountain ranges and the endless
 *   plane under them: the crazed salt with its mirage (the Salt Flat piece's own formulas, now seen
 *   from a camera that can turn), the sea under the Coast Road's cliff, or the wet night plain. One
 *   source, specialised per world with `#define WORLD n` (0 salt, 1 coast, 2 canyon, 3 night,
 *   4 Mars: the salt's plain in Mars colours, 5 the Golden Track's gold night).
 * - The motes: the Coast Road piece's oncoming dust (one particle per angular bin round the
 *   vanishing point, drawn from where it was a frame ago so it lengthens with speed), added in light
 *   over everything; the weather sets their colour, number, length and width.
 * - The boosters' fire, the trails and the dust: small materials for meshes and points.
 *
 * Mellow: glows, never flashes; nothing strobes; repeating ground detail is scattered (jittered
 * cells), never a grid, and fades before it can alias.
 */

import { marsTerrainGlsl } from '@/lib/art/mars';
import { LINE } from '@/lib/art/salt-flat-game';
import { SPEED_COMMON } from '@/lib/art/speed-shaders';

export const DRIVE_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** World ids for the backdrop's `#define WORLD`. */
export const WORLD_SHADER: Record<'salt' | 'coast' | 'canyon' | 'night' | 'mars' | 'gold', number> =
  {
    salt: 0,
    mars: 4,
    gold: 5,
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

#if WORLD == 4
/* Mars's craters (2026-11-19: "more craters on Mars"): one layer of a given size, scattered on a
   grid that wraps with the ground. Each crater: a bowl shadowed on the sun side and lit on the far
   wall, a raised rim catching the sun, and a pale apron of thrown-out dust round it. Returns how
   much to darken (x) and how much rim light to add (y). Small ones fade where they would shimmer. */
vec2 craters(vec2 g, float cs, float per, float seed, float rMin, float rMax, float lod) {
  vec2 c = floor(g / cs);
  vec2 sunD = vec2(cos(uSunAz), sin(uSunAz));
  vec2 o = vec2(0.0);
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 cell = c + vec2(float(i), float(j));
      vec2 id = mod(cell, per);
      float h = hash11(id.x * 17.0 + id.y * 131.0 + seed);
      if (h < 0.2) continue;
      float h2 = hash11(id.x * 7.3 + id.y * 29.1 + seed * 2.0);
      vec2 center = (cell + 0.2 + 0.6 * vec2(h2, fract(h2 * 13.7))) * cs;
      float R = mix(rMin, rMax, fract(h * 7.1));
      vec2 dv = g - center;
      float r = length(dv);
      float d = r / R;
      if (d > 1.7) continue;
      float vis = 1.0 - smoothstep(0.15, 0.5, lod / R);
      float side = dot(dv / max(r, 1e-3), sunD);
      float bowl = 1.0 - smoothstep(0.82, 0.98, d);
      o.x += bowl * (0.3 + 0.6 * max(side, 0.0) * smoothstep(0.2, 0.9, d)) * vis;
      o.y += bowl * max(-side, 0.0) * 0.35 * smoothstep(0.35, 0.95, d) * vis;
      float rim = exp(-pow((d - 1.0) / 0.09, 2.0));
      o.y += rim * (0.5 + 0.6 * side) * vis;
      o.x += rim * max(-side, 0.0) * 0.25 * vis;
      o.x -= step(1.05, d) * (1.0 - smoothstep(1.05, 1.7, d)) * 0.1 * vis;
    }
  return o;
}
#endif

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * t);
}

#if WORLD == 4
/*MARS_TERRAIN*/
// The depth the backdrop writes on Mars, so the vehicle and the stations hide behind the dunes.
float gDepth = 1.0;
#endif

// The sun's offset across the view and its height, in the pieces' screen units.
vec2 sunOff(float az, float yE, float sunY) {
  return vec2(-F0 * clamp(wrapA(az - uSunAz), -3.0, 3.0), yE - sunY);
}

#if WORLD == 4
/* Mars at dusk: butterscotch at the horizon, dusty rose, then a dark umber; a small white sun in a
   blue halo (Martian dust scatters blue round the sun); Phobos and Deimos, two small grey moons. */
vec3 sky(float az, float yE) {
  // The dark umber comes down low (2026-11-23: "bring it a bit lower so we see the darker part
  // when we dont turn"): it starts just over the horizon and is deep by a third of the way up.
  vec3 c = mix(C(0.86, 0.6, 0.4), C(0.6, 0.38, 0.32), smoothstep(0.0, 0.1, yE));
  c = mix(c, C(0.16, 0.1, 0.11), smoothstep(0.06, 0.36, yE));
  float d = length(sunOff(az, yE, 0.07));
  c += C(0.5, 0.68, 1.0) * exp(-d * 9.0) * 0.75 * uSunAmt;
  c += C(0.95, 0.97, 1.0) * (1.0 - smoothstep(0.018, 0.022, d)) * 1.6 * uSunAmt;
  float ph = length(sunOff(az - 1.25, yE, 0.24) * vec2(1.0, 1.3));
  c = mix(c, C(0.62, 0.58, 0.55), (1.0 - smoothstep(0.009, 0.011, ph)) * 0.9);
  float de = length(sunOff(az + 0.95, yE, 0.42));
  c = mix(c, C(0.72, 0.7, 0.68), (1.0 - smoothstep(0.004, 0.006, de)) * 0.8);
  return c;
}
#elif WORLD == 0 || WORLD == 2
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
#if WORLD == 5
/* The Golden Track's night (2026-11-21: "stars look unnatural … saturn as well … how can it look
   like a real planet"): a real night sky, not a pattern. Stars jittered off any grid, a steep spread
   of brightness (many faint, few bright), the colours of real stars, a faint Milky Way with dust
   lanes; and Saturn as it is: a flattened globe in soft cream and butterscotch bands, darker poles,
   its limb darkened, the C, B and A rings with the Cassini division and the Encke gap, the rings
   translucent, the globe's shadow on the rings and the rings' shadow on the globe. */

// One layer of stars over sky coordinates p (x = F0 · azimuth, y = height): at most one per cell,
// jittered in it. keep: the share of cells holding a star.
vec3 starLayer(vec2 p, float cells, float seed, float keep) {
  vec2 g = p * cells;
  vec2 id = floor(g);
  id.x = mod(id.x, floor(TAU * F0 * cells));
  if (hash21(id + seed) > keep) return vec3(0.0);
  vec2 o = vec2(hash21(id + seed + 31.7), hash21(id + seed + 73.1)) * 0.7 + 0.15;
  float d = length(fract(g) - o) / cells;
  float mag = pow(hash21(id + seed + 11.3), 7.0);
  float w = max(0.0011, fwidth(p.y) * 0.9);
  float core = exp(-d * d / (w * w));
  float halo = exp(-d / (w * 3.5)) * mag * 0.35;
  float tw = 0.88 + 0.12 * sin(uTime * (0.6 + hash21(id + seed + 5.1) * 1.4) + hash21(id) * 40.0);
  float t = hash21(id + seed + 91.9);
  vec3 col = t < 0.2 ? C(0.7, 0.8, 1.0) : t < 0.75 ? C(1.0, 0.97, 0.92) : t < 0.93 ? C(1.0, 0.86, 0.62) : C(1.0, 0.68, 0.45);
  return col * (core * (0.03 + 1.1 * mag) + halo) * tw;
}

// How much of the light Saturn's rings stop at r (in Saturn radii): C, B, Cassini, A, Encke.
// fine: how much of the ringlets to draw (0 where they would shimmer).
float ringOpacity(float r, float fine) {
  float o = 0.0;
  o += 0.14 * smoothstep(1.23, 1.26, r) * (1.0 - smoothstep(1.51, 1.53, r));
  o += mix(0.7, 0.95, smoothstep(1.53, 1.75, r)) * smoothstep(1.52, 1.54, r) * (1.0 - smoothstep(1.94, 1.96, r));
  o += 0.06 * smoothstep(1.95, 1.96, r) * (1.0 - smoothstep(2.02, 2.03, r));
  o += 0.55 * smoothstep(2.02, 2.04, r) * (1.0 - smoothstep(2.26, 2.28, r));
  o *= 1.0 - 0.85 * smoothstep(2.205, 2.21, r) * (1.0 - smoothstep(2.215, 2.22, r));
  float lets = vn(vec2(r * 90.0, 0.5)) * 0.6 + vn(vec2(r * 260.0, 7.0)) * 0.4;
  return clamp(o * (1.0 - fine * 0.35 + fine * 0.35 * 2.0 * lets), 0.0, 1.0);
}

vec3 sky(float az, float yE) {
  vec3 c = mix(C(0.05, 0.035, 0.02), C(0.006, 0.005, 0.004), smoothstep(-0.05, 0.4, yE));
  c += C(0.9, 0.6, 0.25) * exp(-max(yE, 0.0) * 16.0) * 0.16;

  vec2 p = vec2(F0 * az, yE);
  // The Milky Way: a faint band tilted across the sky, clumped, cut by dark dust lanes.
  float mwc = 0.42 + 0.22 * sin(az + 0.8);
  float mw = exp(-pow((yE - mwc) / 0.16, 2.0));
  float clump = vn(p * 9.0) * 0.6 + vn(p * 23.0) * 0.4;
  float lane = smoothstep(0.45, 0.7, vn(p * 6.0 + 3.0)) * exp(-pow((yE - mwc - 0.02) / 0.05, 2.0));
  float above = smoothstep(0.0, 0.12, yE);
  c += C(0.75, 0.72, 0.68) * mw * (0.25 + 0.75 * clump) * (1.0 - 0.8 * lane) * 0.035 * above;
  // Three layers of stars, denser in the Milky Way, dimmed low down by the air.
  vec3 st = starLayer(p, 50.0, 1.0, 0.1) + starLayer(p, 120.0, 7.0, 0.08 + 0.2 * mw) * 0.7 + starLayer(p, 260.0, 13.0, 0.03 + 0.15 * mw) * 0.4;
  c += st * above;

  // Saturn: a tilted frame (qr), the ring plane opened to 0.24 (k).
  vec2 q = sunOff(az - 0.35, yE, 0.2);
  float R = 0.17;
  float ct = cos(0.38);
  float sn = sin(0.38);
  vec2 qr = vec2(ct * q.x + sn * q.y, -sn * q.x + ct * q.y) / R;
  float k = 0.24;
  float kc = sqrt(1.0 - k * k);
  vec3 L = normalize(vec3(-0.6, 0.4, 0.7));
  vec3 N = vec3(0.0, kc, k);
  // The ring point under this pixel: in-plane x and depth (positive: the far side).
  float rx = qr.x;
  float rz = qr.y / k;
  float r = length(vec2(rx, rz));
  float fine = 1.0 - smoothstep(0.004, 0.02, fwidth(r));
  float op = r < 2.4 ? ringOpacity(r, fine) : 0.0;
  // The globe's shadow on the rings.
  vec3 P = vec3(rx, k * rz, -kc * rz);
  float bb = dot(P, L);
  float disc = bb * bb - (dot(P, P) - 1.0);
  float shade = disc > 0.0 && -bb + sqrt(max(disc, 0.0)) > 0.0 ? 1.0 - smoothstep(0.0, 0.04, disc) * 0.92 : 1.0;
  vec3 ringC = mix(C(0.55, 0.5, 0.44), mix(C(0.9, 0.8, 0.62), C(0.76, 0.69, 0.57), step(2.0, r)), smoothstep(1.5, 1.56, r));
  vec3 ringLit = ringC * 0.5 * shade;
  // The far half of the rings, behind the globe.
  if (rz > 0.0) c = mix(c, ringLit, op);

  // The globe, flattened a tenth at the poles.
  vec2 qg = vec2(qr.x, qr.y / 0.9);
  float dP = length(qg);
  float fw = max(fwidth(dP), 1e-4);
  float globe = 1.0 - smoothstep(1.0 - fw, 1.0 + fw, dP);
  if (globe > 0.0) {
    vec3 n = vec3(qg, sqrt(max(0.0, 1.0 - dP * dP)));
    float lat = n.y;
    float lon = atan(n.x, n.z);
    float wl = lat + 0.012 * (vn(vec2(lon * 5.0, lat * 40.0)) - 0.5);
    float b = vn(vec2(wl * 7.0, 0.3)) * 0.55 + vn(vec2(wl * 19.0, 4.1)) * 0.3 + vn(vec2(wl * 45.0, 9.7)) * 0.15;
    vec3 body = mix(C(0.8, 0.64, 0.42), C(0.94, 0.86, 0.66), b);
    body = mix(body, C(0.98, 0.9, 0.72), exp(-pow(wl / 0.12, 2.0)) * 0.5);
    body = mix(body, C(0.58, 0.58, 0.56), smoothstep(0.7, 0.95, abs(wl)) * 0.6);
    float lit = max(dot(n, L), 0.0);
    float term = smoothstep(-0.05, 0.25, dot(n, L));
    float limb = pow(max(n.z, 0.0), 0.35);
    // The rings' shadow: follow the light from the globe to the ring plane.
    float dn = dot(N, L);
    float tt = -dot(N, n) / dn;
    float rs = 0.0;
    if (tt > 0.0) {
      vec3 H = n + L * tt;
      rs = ringOpacity(length(H), 0.0);
    }
    vec3 bodyC = body * (0.03 + 0.62 * lit * term * limb) * (1.0 - 0.8 * rs);
    // A little ringshine on the night side.
    bodyC += body * 0.02 * (1.0 - term);
    c = mix(c, bodyC, globe);
  }
  // The near half of the rings, over the globe.
  if (rz <= 0.0) c = mix(c, ringLit, op);
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
#if WORLD == 4
  vec3 base = layer < 0.5 ? C(0.36, 0.17, 0.12) : layer < 1.5 ? C(0.52, 0.3, 0.22) : C(0.7, 0.5, 0.4);
#else
  vec3 base = layer < 0.5 ? C(0.3, 0.2, 0.33) : layer < 1.5 ? C(0.46, 0.35, 0.52) : C(0.64, 0.56, 0.74);
#endif
  vec3 col = base * (0.75 + 0.35 * lit) + C(1.0, 0.6, 0.4) * lit * lit * 0.22 * uSunAmt * (1.0 - layer * 0.25);
  // Snow on the tallest, where the height runs high up the peak.
  float snow = smoothstep(0.62, 0.75, H / Hmax) * step(0.5, layer);
#if WORLD == 4
  // No snow on Mars: pale dust on the tops.
  col = mix(col, mix(C(0.62, 0.42, 0.34), C(0.9, 0.7, 0.55), lit), snow * 0.5);
#else
  col = mix(col, mix(C(0.62, 0.62, 0.8), C(1.0, 0.88, 0.82), lit), snow * 0.85);
#endif
  // A soft edge on the ridge line, and haze toward the horizon.
  float edge = smoothstep(0.0, 0.0015 * (1.0 + layer), top - yE);
  float haze = 0.18 + 0.22 * layer;
  return vec4(col, edge * (1.0 - haze * 0.4)) * vec4(1.0, 1.0, 1.0, 1.0 - clamp(1.0 - exp(-t * uFogDen * 0.35), 0.0, 1.0));
}

/* Everything on the horizon at a direction and height: sky, ranges, mesas, hills. */
vec3 horizon(vec2 dir, float az, float yE) {
  vec3 col = sky(az, yE);
#if WORLD == 0 || WORLD == 2 || WORLD == 4
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
#if WORLD == 4
  if (yE > 0.0 && yE < hills) col = mix(col, C(0.55, 0.3, 0.22), 0.7);
#else
  if (yE > 0.0 && yE < hills) col = mix(col, C(0.55, 0.42, 0.62), 0.7);
#endif
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
#if WORLD == 0 || WORLD == 2 || WORLD == 4
  // Heat shimmer: the air near the ground wavers, most toward the horizon.
  float sh = exp(-abs(yE) * 40.0);
  yE += (vn(vec2(az * 60.0, uTime * 3.0)) - 0.5) * 0.004 * sh;
  d.y = yE / F0 * hl;
#endif
  vec3 col = horizon(dir, az, yE);
  // Haze over the sky, thickest low down.
  col = mix(col, uFogCol, (1.0 - exp(-6000.0 * uFogDen)) * (1.0 - smoothstep(0.0, 0.6, yE)));
#if WORLD == 4
  // The dunes (lib/art/mars.ts): march the ray over the terrain, then refine the crossing.
  vec2 org = uLine.xy - vec2(MARS_LINE);
  float t = 0.0;
  {
    if (d.y >= 0.0 && uCamY > MARS_HMAX) return col;
    float a = 0.0;
    float b = 0.3;
    bool hit = false;
    for (int i = 0; i < 110; i++) {
      vec2 r = dir * b * hl;
      float gap = uCamY + d.y * b - marsH(uCamW + r, r, org);
      if (gap < 0.0) { hit = true; break; }
      if (d.y >= 0.0 && uCamY + d.y * b > MARS_HMAX) break;
      if (b > 5000.0) break;
      a = b;
      b += max(gap / (0.3 * hl + abs(d.y)) * 0.8, 0.05 + 0.01 * b);
    }
    if (!hit) {
      // Past the march: the far plain, flattened into the mirage.
      if (d.y >= 0.0) return col;
      b = (uPlaneY - uCamY) / d.y;
      if (b <= 0.0) return col;
    } else {
      for (int i = 0; i < 6; i++) {
        float m = 0.5 * (a + b);
        vec2 r = dir * m * hl;
        if (uCamY + d.y * m - marsH(uCamW + r, r, org) < 0.0) b = m;
        else a = m;
      }
    }
    t = b;
    // View depth for the z-buffer, with setProjection's near 0.3 and far 9000.
    float vz = dv.z * t;
    float ndc = (-(9000.3 / 8999.7) * vz - (2.0 * 9000.0 * 0.3 / 8999.7)) / -vz;
    gDepth = clamp(0.5 * ndc + 0.5, 0.0, 0.99999);
  }
#else
  if (d.y >= 0.0) return col;
  float t = (uPlaneY - uCamY) / d.y;
  if (t <= 0.0) return col;
#endif
  vec2 rel = dir * t * hl;
  float dist = t * hl;
  vec2 g = uCamW + rel;
#if WORLD == 0 || WORLD == 2 || WORLD == 4
#if WORLD == 4
  // Rust regolith, patchy, with darker basalt grit.
  vec3 groundC = mix(C(0.66, 0.34, 0.2), C(0.82, 0.48, 0.3), pnw(g / 11.0, WRAPP / 11.0));
  groundC = mix(groundC, C(0.36, 0.2, 0.14), smoothstep(0.62, 0.8, pnw(g / 37.0 + 4.0, WRAPP / 37.0)) * 0.6);
#else
  vec3 groundC = mix(C(0.92, 0.82, 0.8), C(1.0, 0.9, 0.84), pnw(g / 11.0, WRAPP / 11.0));
#endif
  float cr = saltW(g / 2.0, WRAPP / 2.0);
  float fw = max(fwidth(cr), 1e-4);
  float crack = 1.0 - smoothstep(0.02, 0.02 + fw * 1.5, cr);
  crack *= 1.0 - smoothstep(0.15, 0.45, length(fwidth(g / 2.0)));
#if WORLD == 4
  groundC *= 1.0 - 0.3 * crack * exp(-dist / 60.0);
  {
    float lod = length(fwidth(g));
    vec2 cr3 = craters(g, 32.0, 64.0, 3.0, 3.0, 11.0, lod)
      + craters(g, 128.0, 16.0, 11.0, 12.0, 40.0, lod)
      + craters(g, 512.0, 4.0, 23.0, 60.0, 170.0, lod);
    groundC *= 1.0 - clamp(cr3.x, -0.15, 0.75);
    groundC += C(0.95, 0.6, 0.4) * clamp(cr3.y, 0.0, 1.2) * 0.32;
  }
#else
  groundC *= 1.0 - 0.16 * crack * exp(-dist / 60.0);
#endif
#if WORLD == 4
  {
    // The dunes in the low sun: the faces toward it lit, the far sides in shade.
    vec2 e = vec2(0.6, 0.0);
    float h0 = marsH(g, rel, org);
    float hx = marsH(g + e, rel + e, org) - h0;
    float hy = marsH(g + e.yx, rel + e.yx, org) - h0;
    vec3 n = normalize(vec3(-hx / 0.6, 1.0, -hy / 0.6));
    vec3 sunV = normalize(vec3(cos(uSunAz), 0.32, sin(uSunAz)));
    float lit = max(dot(n, sunV), 0.0) / 0.305;
    groundC *= clamp(mix(1.0, lit, 0.8), 0.3, 1.9);
  }
#endif
  groundC = mix(groundC, C(1.0, 0.98, 1.0), uSnow * 0.6);
  groundC *= 0.42;
#if WORLD == 4
  {
    // The radioactive lakes: a sickly green-yellow glow, a slow ripple, a pale rim of salts.
    float lk = marsLake(rel, org);
    if (lk > 0.0) {
      float rip = vn((rel - org) / 7.0 + vec2(uTime * 0.12, -uTime * 0.08));
      vec3 glow = mix(C(0.42, 0.78, 0.12), C(0.82, 0.95, 0.3), rip) * (1.1 + 0.5 * lk);
      groundC = mix(groundC, glow, smoothstep(0.0, 0.06, lk));
      groundC += C(0.9, 0.95, 0.6) * (1.0 - smoothstep(0.0, 0.03, lk)) * 0.25;
    }
  }
#endif
#if WORLD == 0 || WORLD == 4
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
#if WORLD == 4
  gl_FragDepthEXT = gDepth;
#endif
}
`;

/** The mesas' GLSL, from lib/art/salt-flat-game.ts MESAS: flat tops with sheer, soft sides. */
export function mesaGlsl(mesas: readonly { az: number; half: number; height: number }[]): string {
  return mesas
    .map(
      (m) =>
        `  { float da = abs(wrapA(az - ${m.az.toFixed(4)})); float mh = ${m.height.toFixed(4)} * (1.0 - smoothstep(${(m.half * 0.8).toFixed(4)}, ${m.half.toFixed(4)}, da)) * (0.93 + 0.07 * vn(vec2(az * 80.0, 3.0)));\n    if (yE > 0.0 && yE < mh) col = mix(col, mix(MESA_C, sky(az, 0.0), 0.25), 0.9); }`,
    )
    .join('\n');
}

/** The backdrop for one world. */
export function backdropFragment(
  world: 'salt' | 'coast' | 'canyon' | 'night' | 'mars' | 'gold',
  mesas: readonly { az: number; half: number; height: number }[],
): string {
  const src = BACKDROP.replace('/*MESAS*/', mesaGlsl(mesas)).replace(
    '/*MARS_TERRAIN*/',
    world === 'mars'
      ? `#define MARS_LINE ${LINE.x.toFixed(1)}, ${LINE.y0.toFixed(1)}
${marsTerrainGlsl()}`
      : '',
  );
  const mesa = world === 'mars' ? 'C(0.5, 0.25, 0.17)' : 'C(0.42, 0.28, 0.4)';
  return `#define WORLD ${WORLD_SHADER[world]}\n#define MESA_C ${mesa}\n${SPEED_COMMON}\n${src}`;
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
