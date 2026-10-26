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
  float d = butterfly(fq / sc, t) * sc;
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
