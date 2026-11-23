/**
 * Drive: the picture's last touches before the output (docs/specs/drive-game.md, "Camera and
 * feel" and Mars's "Vintage Mars"). One screen pass after the bloom:
 *
 * - The G-force mask (every world): the edges darken and blur a little with a hard turn, and
 *   pulse softly on a hit (lib/art/g-force.ts).
 * - Mars's old photograph: rounded dark-brown edges with a soft blur (2026-11-23: "the whole
 *   screen should have some darker brown blur on edges rounded. like old photographs").
 * - Old film (Mars, through the fire tunnels): sepia, beige highlights, a little contrast and a
 *   gentle grain that drifts slowly, never flickers.
 * - The old-TV glitch near the radioactive lakes: soft scan lines and a slow sideways drift of
 *   bands, growing with the radiation; every motion under 1 Hz.
 *
 * Off (skipped) when none of them shows.
 */

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface VintageLevels {
  /** Mars's brown rounded edges (0 elsewhere). */
  vintage: number;
  /** Old film, 0 Mars to 1 sepia. */
  sepia: number;
  /** The lakes' TV glitch. */
  glitch: number;
  /** The G-force mask. */
  g: number;
}

const FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform float uTime;
uniform float uVintage;
uniform float uSepia;
uniform float uGlitch;
uniform float uG;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// How near the rounded frame a point is: 0 well inside, 1 at the edge.
float frame(vec2 uv, float inset, float round) {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = abs(uv - 0.5) * asp;
  vec2 box = 0.5 * asp - inset;
  vec2 d = max(q - box + round, 0.0);
  return length(d) / round;
}

void main() {
  vec2 uv = vUv;
  // The glitch: bands of rows drift sideways slowly (well under 1 Hz), more with the radiation.
  if (uGlitch > 0.001) {
    float band = floor(uv.y * 18.0);
    float drift = sin(uTime * 0.7 + band * 1.7) * sin(uTime * 0.23 + band * 0.9);
    uv.x += drift * 0.006 * uGlitch;
  }
  vec3 col = texture2D(tDiffuse, uv).rgb;

  // Edges: the brown photograph and the G mask share one rounded frame, blurred toward the middle.
  float edgeV = smoothstep(0.15, 1.0, frame(vUv, 0.0, 0.42)) * uVintage;
  float edgeG = smoothstep(0.25, 1.0, frame(vUv, 0.02, 0.5)) * uG;
  float blur = max(edgeV * 0.8, edgeG);
  if (blur > 0.01) {
    vec2 toMid = (vec2(0.5) - vUv);
    vec3 acc = col;
    for (int i = 1; i <= 4; i++) {
      float k = float(i) * 3.5 * blur;
      acc += texture2D(tDiffuse, uv + toMid * 0.004 * k).rgb;
      acc += texture2D(tDiffuse, uv + vec2(toMid.y, -toMid.x) * 0.002 * k).rgb;
    }
    col = mix(col, acc / 9.0, clamp(blur * 1.4, 0.0, 1.0));
  }
  col = mix(col, vec3(0.16, 0.085, 0.045) * 0.6, edgeV * 0.75);
  col *= 1.0 - edgeG * 0.75;

  // Old film: sepia, beige highlights, a little contrast, a gentle grain stepping twice a second at most.
  if (uSepia > 0.001) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    l = l / (1.0 + l);
    l = smoothstep(0.0, 1.0, l);
    vec3 sep = mix(vec3(0.16, 0.11, 0.07), vec3(1.0, 0.9, 0.74), l) * 1.6;
    vec2 gp = floor(vUv * uRes / 1.5) + floor(vec2(uTime * 2.0, uTime * 1.3)) * 17.0;
    float grain = (hash(gp) - 0.5) * 0.06;
    col = mix(col, sep * (1.0 + grain), uSepia);
  }

  // The TV: soft scan lines, still, and a faint green cast at the strongest.
  if (uGlitch > 0.001) {
    float scan = 0.5 + 0.5 * sin(vUv.y * uRes.y * 1.5708);
    col *= 1.0 - uGlitch * 0.22 * scan;
    col = mix(col, col * vec3(0.9, 1.08, 0.86), uGlitch * 0.5);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export function makeVintagePass(): ShaderPass & {
  set(l: VintageLevels, t: number, w: number, h: number): void;
} {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uVintage: { value: 0 },
      uSepia: { value: 0 },
      uGlitch: { value: 0 },
      uG: { value: 0 },
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: FRAGMENT,
  }) as ShaderPass & { set(l: VintageLevels, t: number, w: number, h: number): void };
  pass.set = (l, t, w, h) => {
    const u = pass.uniforms;
    u.uVintage.value = l.vintage;
    u.uSepia.value = l.sepia;
    u.uGlitch.value = l.glitch;
    u.uG.value = l.g;
    u.uTime.value = t;
    (u.uRes.value as THREE.Vector2).set(w, h);
    pass.enabled = l.vintage > 0.001 || l.sepia > 0.001 || l.glitch > 0.001 || l.g > 0.003;
  };
  pass.enabled = false;
  return pass;
}
