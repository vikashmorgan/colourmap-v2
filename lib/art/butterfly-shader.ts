/*
 * The Liquid Butterflies fragment shader, shared by the collection's canvas
 * (components/ButterflyCanvas.tsx) and the Geometry Builder's Stars tab
 * (components/geometry-visuals.ts). How it draws is described in
 * ButterflyCanvas.tsx. GLSL ES 1.0; three.js ShaderMaterial accepts it as is.
 *
 * Pixel space comes from gl_FragCoord and uRes (the drawing-buffer size), so
 * the same code works on a bare canvas and inside three's render passes.
 */

export const BUTTERFLY_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const BUTTERFLY_FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSlices;
uniform float uDelay;
uniform float uEchoes;
uniform float uDrift;
uniform float uFlow;
uniform float uFlap;
uniform float uMorph;
uniform float uFold;
uniform float uSize;
uniform float uGlow;
uniform float uPool;
uniform float uGrain;
uniform float uIris;
uniform float uSparks;
uniform float uForm;
uniform float uPetals;
uniform vec3 uBg0;
uniform vec3 uBg1;
uniform vec3 uRamp[6];

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

float ellipse(vec2 p, vec2 c, vec2 r, float rot) {
  vec2 q = p - c;
  float cs = cos(rot);
  float sn = sin(rot);
  q = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y);
  // A close distance even for long thin ellipses (the body), so no glow leaks along them.
  float k0 = length(q / r);
  float k1 = length(q / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// One side of the butterfly (x >= 0), and its body on the centre line.
float butterfly(vec2 q, float t) {
  float open = 1.0 - uFlap * 0.55 * (0.5 + 0.5 * sin(t * 1.3));
  q.x /= max(open, 0.2);
  float m1 = 1.0 + uMorph * 0.22 * sin(t * 0.7);
  float m2 = 1.0 + uMorph * 0.25 * sin(t * 0.9 + 2.0);
  float a = atan(q.y, q.x);
  float wob = 1.0 + uMorph * 0.08 * sin(a * 6.0 + t * 1.1);
  float up = ellipse(q, vec2(0.21, 0.12) * m1, vec2(0.21, 0.13) * m1 * wob, 0.55 + uMorph * 0.15 * sin(t * 0.5));
  float lo = ellipse(q, vec2(0.14, -0.13) * m2, vec2(0.12, 0.10) * m2 * wob, -0.7 + uMorph * 0.15 * sin(t * 0.6 + 1.0));
  float body = ellipse(q, vec2(0.0, 0.0), vec2(0.016, 0.15), 0.0);
  return smin(smin(up, lo, 0.04), body, 0.03) * max(open, 0.2);
}

float dot2(vec2 v) { return dot(v, v); }

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

// A flower seen from above: an outer ring of petals and an inner one between them.
float flower(vec2 q, float t) {
  float bloom = 1.0 - uFlap * 0.3 * (0.5 + 0.5 * sin(t * 1.3));
  float a = atan(q.x, q.y);
  float r = length(q);
  float n = uPetals;
  float m = 1.0 + uMorph * 0.12 * sin(t * 0.7 + a * 3.0);
  float outer = pow(abs(cos(a * n * 0.5 + uMorph * 0.3 * sin(t * 0.4))), 0.6);
  float inner = pow(abs(cos(a * n * 0.5 + 1.5708)), 0.6);
  float R = 0.33 * bloom * m * (0.32 + 0.48 * outer + 0.2 * inner);
  return min((r - R) * 0.6, r - 0.05);
}

// A heart (after Inigo Quilez's distance), beating with the flap.
float heart(vec2 q, float t) {
  float beat = 1.0 + uFlap * 0.08 * pow(0.5 + 0.5 * sin(t * 2.6), 4.0);
  float k = 0.36 * beat * (1.0 + uMorph * 0.05 * sin(atan(q.y, q.x) * 5.0 + t));
  vec2 p = q / k + vec2(0.0, 0.55);
  float d;
  if (p.y + p.x > 1.0) d = sqrt(dot2(p - vec2(0.25, 0.75))) - 0.35355;
  else d = sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
  return d * k;
}

float trapezoid(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0 * he);
  vec2 ca = vec2(p.x - min(p.x, p.y < 0.0 ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot2(k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot2(ca), dot2(cb)));
}

// A volcano: a cone with a crater, and blobs of lava rising out of it.
float volcano(vec2 q, float t) {
  vec2 c = q - vec2(0.0, -0.08);
  c.x += uMorph * 0.015 * sin(c.y * 30.0 + t);
  float d = trapezoid(c, 0.42, 0.08, 0.17);
  d = max(d, -(length(c - vec2(0.0, 0.2)) - 0.065));
  float erupt = 0.6 + 0.4 * uFlap * (0.5 + 0.5 * sin(t * 0.9));
  d = smin(d, seg(q, vec2(0.0, 0.06), vec2(0.0, 0.16 + 0.06 * erupt)) - 0.035, 0.04);
  for (int i = 0; i < 4; i++) {
    float f = fract(t * 0.12 + float(i) * 0.25);
    vec2 at = vec2(0.03 * sin(t * 0.8 + float(i) * 2.0) * f, 0.1 + f * 0.45 * erupt);
    float r = (0.045 + 0.08 * f) * (1.0 - f * f);
    d = smin(d, length(q - at) - r, 0.06);
  }
  return d;
}

// A ridge of mountains: a high peak in the middle and lower ones each side.
float mountains(vec2 q, float t) {
  float x = q.x;
  float h = 0.3 - x * 1.15;
  h = max(h, 0.17 - abs(x - 0.3) * 1.0);
  h = max(h, 0.07 - abs(x - 0.55) * 0.9);
  h += uMorph * 0.025 * (noise(vec2(x * 18.0, t * 0.2)) - 0.5);
  h *= 1.0 + uFlap * 0.06 * sin(t * 0.8);
  float d = (q.y + 0.05 - h) * 0.7;
  d = max(d, -(q.y + 0.25));
  return max(d, x - 0.75);
}

float box(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// A thangka mandala, drawn as lines of light: rings, a square palace with four
// gates, a turning ring of lotus petals and a seed at the heart.
float thangka(vec2 q, float t) {
  vec2 m = abs(q);
  float r = length(m);
  float w = 0.008;
  float d = abs(r - 0.4) - w * 1.5;
  d = min(d, abs(r - 0.36) - w * 0.7);
  float sq = box(m, vec2(0.26));
  float gate = min(box(m - vec2(0.0, 0.28), vec2(0.06, 0.03)), box(m - vec2(0.28, 0.0), vec2(0.03, 0.06)));
  d = min(d, abs(min(sq, gate)) - w);
  d = min(d, abs(r - 0.22) - w * 0.7);
  float a = atan(q.x, q.y) + t * 0.1 * (0.3 + uMorph);
  float petal = 0.13 + 0.06 * pow(abs(cos(a * uPetals * 0.5)), 0.7);
  d = min(d, abs(r - petal) - w);
  d = min(d, r - 0.05 - 0.01 * uFlap * sin(t * 1.3));
  return d;
}

// A psychedelic circle: a disc whose rim breathes and ripples.
float circle(vec2 q, float t) {
  float a = atan(q.x, q.y);
  float R = 0.3 * (1.0 + uMorph * 0.06 * sin(a * 6.0 + t) + uFlap * 0.05 * sin(t * 1.3));
  return length(q) - R;
}

// Sacred geometry: the flower of life in lines of light, slowly turning,
// inside its bounding circle, with a seed at the heart.
float sacred(vec2 q, float t) {
  float Rf = 0.1;
  float w = 0.006;
  float rot = t * 0.05 * (0.3 + uMorph);
  float d = abs(length(q) - Rf) - w;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472 + rot;
    d = min(d, abs(length(q - Rf * vec2(sin(a), cos(a))) - Rf) - w);
    float b = a + 0.5236;
    d = min(d, abs(length(q - Rf * 1.732 * vec2(sin(b), cos(b))) - Rf) - w);
    d = min(d, abs(length(q - Rf * 2.0 * vec2(sin(a), cos(a))) - Rf) - w);
  }
  d = max(d, length(q) - Rf * 3.05);
  d = min(d, abs(length(q) - Rf * 3.0) - w * 1.5);
  d = min(d, abs(length(q) - Rf * 3.25 - 0.01 * uFlap * sin(t * 1.3)) - w);
  return min(d, length(q) - 0.025);
}

// A floating island: a rock hanging in the air, a volcano on it, lava rising,
// and two small stones drifting beside it.
float island(vec2 q, float t) {
  vec2 c = q - vec2(0.0, 0.02 * sin(t * 0.6));
  vec2 rock = vec2(c.x + uMorph * 0.02 * (noise(vec2(c.y * 14.0, 3.0)) - 0.5), -(c.y + 0.12));
  float d = trapezoid(rock, 0.36, 0.03, 0.16);
  d += 0.015 * (noise(vec2(c.x * 30.0, c.y * 8.0)) - 0.5);
  float cone = trapezoid(c - vec2(0.0, 0.1), 0.24, 0.06, 0.07);
  cone = max(cone, -(length(c - vec2(0.0, 0.18)) - 0.045));
  d = smin(d, cone, 0.03);
  float erupt = 0.6 + 0.4 * uFlap * (0.5 + 0.5 * sin(t * 0.9));
  for (int i = 0; i < 3; i++) {
    float f = fract(t * 0.12 + float(i) * 0.33);
    vec2 at = vec2(0.02 * sin(t + float(i) * 2.0) * f, 0.17 + f * 0.32 * erupt);
    d = smin(d, length(c - at) - (0.035 + 0.05 * f) * (1.0 - f * f), 0.04);
  }
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 at = vec2(0.42 + fi * 0.1, -0.05 - fi * 0.14 + 0.025 * sin(t * 0.7 + fi * 2.0));
    d = min(d, length(c - at) - (0.035 - fi * 0.012));
  }
  return d;
}

// Digital peaks: the mountains drawn in light, an outline and strata lines
// rising through them like a scan.
float digital(vec2 q, float t) {
  float m = mountains(q, t);
  float n = 26.0;
  float u = fract(q.y * n - t * 0.15);
  float strata = min(u, 1.0 - u) / n - 0.004;
  return min(abs(m) - 0.005, max(m, strata));
}

// The core design the piece is built on.
float form(vec2 q, float t) {
  if (uForm < 0.5) return butterfly(q, t);
  if (uForm < 1.5) return flower(q, t);
  if (uForm < 2.5) return heart(q, t);
  if (uForm < 3.5) return volcano(q, t);
  if (uForm < 4.5) return mountains(q, t);
  if (uForm < 5.5) return thangka(q, t);
  if (uForm < 6.5) return circle(q, t);
  if (uForm < 7.5) return sacred(q, t);
  if (uForm < 8.5) return island(q, t);
  return digital(q, t);
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

// Walks 0..5 and back, so drifting colour never jumps.
float bounce(float g) { return 5.0 - abs(mod(g, 10.0) - 5.0); }

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  if (uFold > 1.5) {
    float sector = 6.2831853 / uFold;
    float a = atan(p.x, p.y);
    a = mod(a + 0.5 * sector, sector) - 0.5 * sector;
    p = length(p) * vec2(sin(a), cos(a)) - vec2(0.0, 0.18);
  }
  vec2 q = vec2(abs(p.x), p.y);

  float k = 0.0;
  if (uSlices > 0.5) {
    float w = 0.5 * aspect / uSlices;
    float s = q.x / w;
    k = floor(s) + smoothstep(0.88, 1.0, fract(s));
    k = min(k, uSlices - 1.0);
  }
  float t = uTime - k * uDelay * 2.0;
  float grow = 1.0 + k * 0.06;

  vec2 warp = vec2(fbm(q * 2.2 + vec2(0.0, t * 0.15)), fbm(q * 2.2 + vec2(5.2, 1.3) - t * 0.12)) - 0.5;
  vec2 fq = q + uFlow * 0.22 * warp;

  float sc = uSize * grow * 0.78;
  float d = form(fq / sc, t) * sc;
  float phase = uTime * uDrift * 0.6;

  float inside = clamp(-d / (0.1 * uSize), 0.0, 1.0);
  float swirl = fbm(fq * 4.0 + vec2(t * 0.2, -t * 0.15));
  float gIn = bounce(2.0 * (1.0 - inside) + (swirl - 0.5) * 2.2 * (0.3 + uFlow) + phase * 2.0);
  float gOut = 2.0 + 3.0 * clamp(d / uGlow, 0.0, 1.0);
  float g = d < 0.0 ? gIn : bounce(gOut + phase * 2.0 * (1.0 - clamp(d / uGlow, 0.0, 1.0)));
  float alpha = 1.0 - smoothstep(0.0, uGlow, d);
  alpha *= 1.0 - 0.55 * (k / max(uSlices - 1.0, 1.0)) * step(0.5, uSlices);

  float y = clamp(0.5 - p.y, 0.0, 1.0);
  vec3 col = mix(uBg0, uBg1, smoothstep(0.0, 1.0, y));
  float pool = fbm(q * 1.4 + warp * 1.5 + vec2(uTime * 0.03, -uTime * 0.02));
  col = mix(col, ramp(bounce(pool * 7.0 + phase)), uPool * 0.55);
  col *= 1.0 - 0.2 * length(p / vec2(aspect, 1.0));

  if (uEchoes > 0.5 && d > 0.0) {
    float wave = d * uEchoes * 9.0 - uTime * (0.6 + uDrift);
    float band = pow(0.5 + 0.5 * cos(6.2831853 * wave), 3.0);
    float reach = exp(-d * 4.5);
    vec3 ec = ramp(bounce(3.0 + 2.0 * fract(wave * 0.25) + phase));
    col = mix(col, ec, band * reach * 0.75);
  }

  vec3 body = ramp(g);
  if (uIris > 0.0) {
    // Thin film: the colour follows the film's thickness, which the liquid keeps moving.
    float film = d * 38.0 + swirl * 5.0 + uTime * 0.15;
    vec3 iris = 0.55 + 0.45 * cos(6.2831853 * (film + vec3(0.0, 0.33, 0.67)));
    float edge = smoothstep(0.03, 0.0, abs(d + 0.006));
    body = mix(body, iris, uIris * (0.35 + 0.65 * (1.0 - inside)) * step(d, 0.0));
    body += uIris * edge * 0.45;
  }
  col = mix(col, body, alpha);

  if (uSparks > 0.0) {
    // Embers: one in a few grid cells near the rim, twinkling, drifting up.
    vec2 cp = p * 34.0 + vec2(0.0, -uTime * 0.6);
    vec2 cell = floor(cp);
    float hs = hash(cell);
    vec2 at = cell + 0.5 + 0.35 * vec2(sin(hs * 40.0), cos(hs * 30.0));
    float ember = smoothstep(0.16, 0.0, length(cp - at)) * step(0.88, hs);
    float near = exp(-max(d, 0.0) * 9.0) * step(0.0, d);
    float tw = 0.5 + 0.5 * sin(uTime * 4.0 + hs * 60.0);
    col += ramp(3.0 + hs * 2.0) * ember * near * tw * uSparks * 1.4;
  }

  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;
