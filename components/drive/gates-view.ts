/**
 * Drive: the gates drawn (docs/specs/drive-tracks.md, "Gates and pickups"). Six looks, each a
 * small group in its own frame (x across the road, positive left; y up; z along the road, ahead):
 *
 * - fire: two iron pillars spitting fire, jets in toward the road and out to the sides, a plume
 *   off each top;
 * - halo: a half ring of light standing over the road;
 * - glow: an arch filled with a soft sheet of light you drive through;
 * - chrome: old polished chrome columns and arch, the sky and the horizon faked in its gradients;
 * - rust: a riveted girder portal, rusted through;
 * - fabric: poles and a crossbar hung with the place's own cloth, swaying.
 *
 * The light is soft and steady (no strobing or flashing); fire is a continuous stream. Every
 * material is shared and lives as long as the page; each gate's geometry is its own. A gate
 * standing on the road carries an orb in its middle, coloured by what it gives (lib/art/pickups.ts),
 * gone once taken. `GatesView` stands them on the track, or on the open plains' drift gates.
 */

import * as THREE from 'three';
import { DRIFT_GATE_HALF, DRIFT_GATES } from '@/lib/art/drift-gates';
import type { WorldId } from '@/lib/art/drive-design';
import {
  fabricOf,
  GATE_REARM,
  type GatePlan,
  gatePlan,
  gateStyle,
  stationsBetween,
} from '@/lib/art/drive-gates';
import type { WorldCfg } from '@/lib/art/drive-worlds';
import { type Pickup, pickupFor } from '@/lib/art/pickups';
import { frameAt, heightAt, pointAt, type Track } from '@/lib/art/track';
import type { GateStyle } from '@/lib/art/track-data';
import { glowSprite } from './vehicles';

type V3 = [number, number, number];

/** The gates' clock and the canvas height in pixels (for the fire's point sizes), shared. */
export const GATE_U = { uTime: { value: 0 }, uPx: { value: 800 } };

export function tickGates(t: number, px: number) {
  GATE_U.uTime.value = t;
  GATE_U.uPx.value = px;
}

/** Each world's light: the halos, the glow sheets, chrome's horizon. */
export function lightOf(world: WorldId): V3 {
  switch (world) {
    case 'gold':
      return [1, 0.66, 0.26];
    case 'neon':
      return [0.3, 0.85, 1];
    case 'chinatown':
      return [1, 0.5, 0.2];
    case 'night':
      return [0.85, 0.82, 0.7];
    case 'canyon':
      return [1, 0.62, 0.32];
    case 'mars':
      return [1, 0.55, 0.3];
    case 'sky':
      return [1, 0.86, 0.6];
    default:
      return [1, 0.9, 0.75];
  }
}

/** The orb's colour for each pickup. */
export const PICKUP_COLOUR: Record<Pickup, V3> = {
  booster: [1, 0.8, 0.45],
  shark: [0.35, 0.9, 0.8],
  shot: [1, 0.88, 0.25],
  laser: [1, 0.3, 0.22],
};

/* ── shader pieces ── */

const NOISE = /* glsl */ `
  float h31(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ return 0.55*n3(p) + 0.3*n3(p*2.1) + 0.15*n3(p*4.3); }
`;

/** The fog's amount here (0 clear, 1 gone), from three's own fog uniforms. */
const FOG_AMOUNT = /* glsl */ `
  float fogF = 0.0;
  vec3 fogC = vec3(0.0);
  #ifdef USE_FOG
    fogC = fogColor;
    #ifdef FOG_EXP2
      fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      fogF = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
  #endif
`;

const SOLID_VERTEX = /* glsl */ `
  varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vLN; varying vec2 vUv;
  #include <fog_pars_vertex>
  void main(){
    vL = position; vLN = normal; vUv = uv;
    vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz;
    vN = normalize(mat3(modelMatrix)*normal);
    vec4 mvPosition = viewMatrix*w;
    gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
  }
`;

function shader(
  vertex: string,
  fragment: string,
  uniforms: Record<string, THREE.IUniform>,
  opts: { additive?: boolean; transparent?: boolean; side?: THREE.Side } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    transparent: opts.additive || opts.transparent,
    depthWrite: !opts.additive,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: opts.side ?? THREE.FrontSide,
  });
}

const cache = new Map<string, THREE.Material>();
function cached<M extends THREE.Material>(key: string, make: () => M): M {
  let m = cache.get(key);
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m as M;
}

/** Old chrome: the sky above, the horizon band, the ground below, mirrored in the surface, with
 * dull, pitted patches where the years got at it. */
function chromeMat(world: WorldId, night: boolean): THREE.ShaderMaterial {
  return cached(`chrome.${world}.${night}`, () => {
    const light = lightOf(world);
    const sky: V3 = night
      ? [0.04, 0.05, 0.09]
      : world === 'mars'
        ? [0.7, 0.45, 0.3]
        : [0.4, 0.55, 0.8];
    const horizon: V3 = night ? (light.map((c) => c * 0.9) as V3) : [1, 0.86, 0.72];
    const ground: V3 = night ? [0.015, 0.015, 0.02] : [0.22, 0.17, 0.14];
    return shader(
      SOLID_VERTEX,
      /* glsl */ `
      uniform vec3 uSky; uniform vec3 uHorizon; uniform vec3 uGround;
      varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vLN; varying vec2 vUv;
      #include <fog_pars_fragment>
      ${NOISE}
      void main(){
        vec3 V = normalize(vW - cameraPosition);
        vec3 N = normalize(vN);
        vec3 R = reflect(V, N);
        float y = R.y;
        vec3 env = y > 0.0 ? mix(uHorizon, uSky, smoothstep(0.0, 0.5, y))
                           : mix(uHorizon*0.4, uGround, smoothstep(0.0, -0.35, y));
        env += uHorizon * 0.9 * exp(-abs(y - 0.03) * 22.0);
        float dull = smoothstep(0.5, 0.78, fbm(vL*0.9));
        float pit = step(0.9, h31(floor(vL*18.0)));
        vec3 col = env * mix(vec3(0.95), vec3(0.6, 0.53, 0.44), dull) * (1.0 - 0.4*pit);
        float fres = pow(1.0 - max(0.0, dot(-V, N)), 3.0);
        col += uHorizon * fres * 0.25;
        ${FOG_AMOUNT}
        gl_FragColor = vec4(mix(col, fogC, fogF), 1.0);
      }`,
      {
        uSky: { value: new THREE.Vector3(...sky) },
        uHorizon: { value: new THREE.Vector3(...horizon) },
        uGround: { value: new THREE.Vector3(...ground) },
      },
    );
  });
}

/** Rusty riveted metal; `age` 1 is rusted through, lower is dark iron with rust in its seams. */
function rustMat(age: number, night: boolean, world: WorldId): THREE.ShaderMaterial {
  return cached(`rust.${age}.${night}.${world}`, () =>
    shader(
      SOLID_VERTEX,
      /* glsl */ `
      uniform float uAge; uniform float uLit; uniform vec3 uRim;
      varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vLN; varying vec2 vUv;
      #include <fog_pars_fragment>
      ${NOISE}
      void main(){
        vec3 N = normalize(vN);
        float n = fbm(vL*0.7);
        float m = fbm(vL*2.3 + 7.0);
        vec3 iron = vec3(0.07, 0.065, 0.06);
        vec3 brown = vec3(0.2, 0.075, 0.03);
        vec3 orange = vec3(0.58, 0.22, 0.06);
        vec3 paint = vec3(0.26, 0.3, 0.27);
        float rust = smoothstep(0.62 - 0.4*uAge, 0.9 - 0.3*uAge, n + 0.25*m);
        vec3 col = mix(iron, mix(brown, orange, m), rust);
        col = mix(col, paint, smoothstep(0.68, 0.74, n) * (1.0 - rust) * uAge);
        // Rivets in columns along each face.
        vec3 a = abs(vLN);
        vec2 q = a.y > 0.6 ? vL.xz : a.x > 0.6 ? vL.zy : vL.xy;
        vec2 c = fract(q / 0.45) - 0.5;
        float col3 = step(mod(floor(q.x / 0.45), 3.0), 0.5);
        float d = length(c);
        float rivet = (1.0 - smoothstep(0.12, 0.16, d)) * col3;
        col = mix(col, col * (0.75 + 1.3 * (0.5 - c.y)), rivet);
        float lam = 0.35 + 0.65 * max(0.0, dot(N, normalize(vec3(0.4, 0.8, 0.3))));
        col *= lam * uLit;
        vec3 V = normalize(cameraPosition - vW);
        col += uRim * pow(1.0 - max(0.0, dot(V, N)), 3.0) * 0.12;
        ${FOG_AMOUNT}
        gl_FragColor = vec4(mix(col, fogC, fogF), 1.0);
      }`,
      {
        uAge: { value: age },
        uLit: { value: night ? 0.45 : 1.25 },
        uRim: { value: new THREE.Vector3(...lightOf(world)) },
      },
    ),
  );
}

/** Light: a soft glowing tube or sheet, brighter where seen edge-on (`rim`) or face-on. */
function lightMat(key: string, colour: V3, gain: number, rim: boolean): THREE.ShaderMaterial {
  return cached(`light.${key}`, () =>
    shader(
      SOLID_VERTEX,
      /* glsl */ `
      uniform vec3 uCol; uniform float uGain; uniform float uRimMode;
      varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vLN; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float f = abs(dot(normalize(vN), V));
        float a = uRimMode > 0.5 ? f * f : 1.0;
        ${FOG_AMOUNT}
        gl_FragColor = vec4(uCol * uGain * a * (1.0 - fogF), 1.0);
      }`,
      {
        uCol: { value: new THREE.Vector3(...colour) },
        uGain: { value: gain },
        uRimMode: { value: rim ? 1 : 0 },
      },
      { additive: true, side: THREE.DoubleSide },
    ),
  );
}

/** The glow gate's sheet: brighter toward its rim, a slow soft drift inside, never a flicker. */
function sheetMat(colour: V3): THREE.ShaderMaterial {
  return cached(`sheet.${colour.join(',')}`, () =>
    shader(
      /* glsl */ `
      varying vec2 vP;
      #include <fog_pars_vertex>
      void main(){
        vP = uv;
        vec4 mvPosition = modelViewMatrix*vec4(position,1.0);
        gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
      /* glsl */ `
      uniform vec3 uCol; uniform float uTime; varying vec2 vP;
      #include <fog_pars_fragment>
      ${NOISE}
      void main(){
        float r = length(vP);
        float body = 0.16 + 0.42 * smoothstep(0.55, 1.0, r) + 0.12 * (1.0 - vP.y);
        body += 0.1 * fbm(vec3(vP * 2.5, uTime * 0.06));
        float edge = 1.0 - smoothstep(0.97, 1.0, r);
        ${FOG_AMOUNT}
        gl_FragColor = vec4(uCol * body * edge * (1.0 - fogF), 1.0);
      }`,
      {
        uCol: { value: new THREE.Vector3(...colour) },
        uTime: GATE_U.uTime,
      },
      { additive: true, side: THREE.DoubleSide },
    ),
  );
}

/** Cloth that sways from its top edge (uv.y 1 at the top), in the place's colours. */
function clothMat(world: WorldId, night: boolean): THREE.ShaderMaterial {
  return cached(`cloth.${world}.${night}`, () => {
    const f = fabricOf(world);
    return shader(
      /* glsl */ `
      uniform float uTime; uniform float uSeed; uniform float uSway;
      varying vec2 vUv; varying float vShade;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv;
        float hang = pow(1.0 - uv.y, 1.4);
        float ph = uTime * 1.1 + uSeed * 6.0 + (1.0 - uv.y) * 2.6 + uv.x * 1.7;
        vec3 p = position;
        p.z += (sin(ph) * 0.8 + sin(uTime * 0.6 + uSeed) * 0.35) * hang * uSway;
        p.x += sin(ph * 0.7 + 1.3) * 0.15 * hang * uSway;
        vShade = 0.78 + 0.22 * cos(ph);
        vec4 mvPosition = modelViewMatrix*vec4(p,1.0);
        gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
      /* glsl */ `
      uniform vec3 uBase; uniform vec3 uTrim; uniform float uMesh; uniform float uLit;
      uniform float uWorld;
      varying vec2 vUv; varying float vShade;
      #include <fog_pars_fragment>
      void main(){
        vec2 uv = vUv;
        float border = step(uv.x, 0.06) + step(0.94, uv.x) + step(uv.y, 0.05) + step(0.95, uv.y);
        vec3 col = uBase;
        float a = 1.0;
        if (uMesh > 0.5) {
          // Neon mesh: an open weave, its threads lit, the border solid.
          vec2 g = abs(fract(uv * vec2(10.0, 22.0)) - 0.5);
          float thread = 1.0 - smoothstep(0.06, 0.12, min(g.x, g.y));
          col = mix(uBase, uTrim, step(0.5, fract(uv.y * 11.0))) * 1.6;
          a = max(thread, border > 0.0 ? 1.0 : 0.0) * 0.85;
          if (a < 0.05) discard;
          col *= vShade;
        } else {
          if (uWorld < 0.5) {
            // Silk: a gold disc and its ring in the middle.
            float r = length((uv - vec2(0.5, 0.58)) * vec2(1.0, 2.2));
            col = mix(col, uTrim, (1.0 - smoothstep(0.15, 0.17, r)) + smoothstep(0.24, 0.26, r) * (1.0 - smoothstep(0.28, 0.3, r)));
          } else {
            // Stripes down the cloth.
            col = mix(col, uTrim, step(0.66, fract(uv.x * 3.0)));
          }
          col = mix(col, uTrim, min(1.0, border));
          col *= vShade * uLit;
          col += uBase * 0.08;
        }
        ${FOG_AMOUNT}
        if (uMesh > 0.5) gl_FragColor = vec4(col * a * (1.0 - fogF), a);
        else gl_FragColor = vec4(mix(col, fogC, fogF), 1.0);
      }`,
      {
        uTime: GATE_U.uTime,
        uSeed: { value: 0 },
        uSway: { value: 1 },
        uBase: { value: new THREE.Vector3(...f.base) },
        uTrim: { value: new THREE.Vector3(...f.trim) },
        uMesh: { value: f.mesh ? 1 : 0 },
        uLit: { value: night ? 0.55 : 1.1 },
        uWorld: { value: world === 'chinatown' || world === 'gold' ? 0 : 1 },
      },
      f.mesh
        ? { additive: true, side: THREE.DoubleSide }
        : { transparent: false, side: THREE.DoubleSide },
    );
  });
}

/** Fire: points streaming out of nozzles, each from white-hot through orange to a dark red tip. */
const fireMat = new THREE.ShaderMaterial({
  uniforms: {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: GATE_U.uTime,
    uPx: GATE_U.uPx,
  },
  fog: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    attribute vec3 aDir; attribute vec4 aJet;
    uniform float uTime; uniform float uPx;
    varying float vAge;
    #include <fog_pars_vertex>
    float r1(float s){ return fract(sin(s * 91.7) * 43758.5) - 0.5; }
    void main(){
      float seed = aJet.x;
      float a = fract(uTime * (1.3 + fract(seed * 7.13) * 0.5) + seed);
      float swell = 0.88 + 0.12 * sin(uTime * 0.8 + position.y * 0.2 + position.x * 0.05);
      vec3 side = normalize(cross(aDir, abs(aDir.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
      vec3 up2 = cross(side, aDir);
      vec3 p = position + aDir * aJet.y * swell * a
        + (side * r1(seed) + up2 * r1(seed + 3.1)) * aJet.z * aJet.y * a
        + vec3(0.0, 1.0, 0.0) * a * a * 1.8;
      vAge = a;
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = min(72.0, aJet.w * (0.55 + 1.5 * a) * projectionMatrix[1][1] * uPx * 0.5 / max(-mvPosition.z, 1.0));
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */ `
    varying float vAge;
    #include <fog_pars_fragment>
    void main(){
      vec2 q = gl_PointCoord - 0.5;
      float m = exp(-dot(q, q) * 14.0);
      float a = vAge;
      vec3 c = mix(vec3(1.0, 0.92, 0.7), vec3(1.0, 0.55, 0.12), smoothstep(0.0, 0.35, a));
      c = mix(c, vec3(0.7, 0.12, 0.03), smoothstep(0.35, 0.9, a));
      float k = m * pow(1.0 - a, 1.4) * smoothstep(0.0, 0.06, a) * 0.55;
      ${FOG_AMOUNT}
      gl_FragColor = vec4(c * k * (1.0 - fogF), k);
    }`,
});

/* ── building one gate ── */

export interface GateOpts {
  /** Half the opening (m): the posts stand just outside it. */
  hw: number;
  /** How much taller than wide (Sky Canyon's stand tall enough for its top level). */
  tall: number;
  world: WorldId;
  night: boolean;
  /** For the sway and the fire's seeds, so neighbours differ. */
  seed: number;
}

interface Jet {
  at: V3;
  dir: V3;
  len: number;
  spread: number;
  size: number;
  n: number;
}

function jets(list: Jet[], seed: number): THREE.Points {
  const total = list.reduce((a, j) => a + j.n, 0);
  const pos = new Float32Array(total * 3);
  const dir = new Float32Array(total * 3);
  const jet = new Float32Array(total * 4);
  let i = 0;
  let k = 0;
  for (const j of list) {
    const l = Math.hypot(...j.dir) || 1;
    k++;
    for (let p = 0; p < j.n; p++, i++) {
      pos.set(j.at, i * 3);
      dir.set([j.dir[0] / l, j.dir[1] / l, j.dir[2] / l], i * 3);
      jet.set([(p / j.n + k * 0.137 + seed * 0.071) % 1, j.len, j.spread, j.size], i * 4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aJet', new THREE.BufferAttribute(jet, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 10, 0), 80);
  const pts = new THREE.Points(geo, fireMat);
  pts.frustumCulled = false;
  return pts;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** A half ring from the ground on the right, over the top, to the ground on the left, in the
 * gate's plane (x across, y up), stretched `tall` times upward. */
function arc(r: number, tube: number, tall: number, seg = 64): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, 10, seg, Math.PI);
  g.scale(1, tall, 1);
  return g;
}

function fireGate(o: GateOpts): THREE.Group {
  const g = new THREE.Group();
  const H = (0.72 * o.hw + 3) * o.tall;
  const iron = rustMat(0.3, o.night, o.world);
  const px = o.hw + 0.9;
  for (const sd of [1, -1]) {
    g.add(mesh(new THREE.BoxGeometry(1.8, H, 1.8), iron, sd * px, H / 2, 0));
    for (const y of [0.25, 0.5, 0.75])
      g.add(
        mesh(
          new THREE.CylinderGeometry(0.28, 0.36, 0.7, 10).rotateZ(Math.PI / 2),
          iron,
          sd * (o.hw - 0.2),
          H * y,
          0,
        ),
      );
  }
  g.add(mesh(new THREE.BoxGeometry(2 * px + 2.6, 1.3, 1.9), iron, 0, H + 0.65, 0));
  const list: Jet[] = [];
  for (const sd of [1, -1]) {
    // In toward the road, short of its middle, so the way through stays clear.
    for (const y of [0.25, 0.5, 0.75])
      list.push({
        at: [sd * (o.hw - 0.5), H * y, 0],
        dir: [-sd, 0.1, 0],
        len: o.hw * 0.42,
        spread: 0.16,
        size: 2.2,
        n: 90,
      });
    // Out to the sides.
    for (const y of [0.4, 0.7])
      list.push({
        at: [sd * (px + 0.9), H * y, 0],
        dir: [sd, 0.2, 0],
        len: 7,
        spread: 0.2,
        size: 2,
        n: 70,
      });
    // A plume off the top.
    list.push({
      at: [sd * px, H + 1.4, 0],
      dir: [0, 1, 0],
      len: 6,
      spread: 0.28,
      size: 3,
      n: 110,
    });
  }
  for (let i = -2; i <= 2; i++)
    list.push({
      at: [(i * px) / 2.5, H + 1.4, 0],
      dir: [0, 1, 0],
      len: 2.4,
      spread: 0.3,
      size: 1.6,
      n: 36,
    });
  g.add(jets(list, o.seed));
  return g;
}

function haloGate(o: GateOpts): THREE.Group {
  const g = new THREE.Group();
  const c = lightOf(o.world);
  const R = o.hw + 0.5;
  g.add(
    mesh(arc(R, 0.3, o.tall), lightMat(`core.${o.world}`, c.map((x) => x * 2.2) as V3, 1, false)),
  );
  g.add(mesh(arc(R, 1.5, o.tall, 48), lightMat(`soft.${o.world}`, c, 0.32, true)));
  g.add(mesh(arc(R, 3.2, o.tall, 40), lightMat(`haze.${o.world}`, c, 0.08, true)));
  const plinth = rustMat(0.15, o.night, o.world);
  for (const sd of [1, -1])
    g.add(mesh(new THREE.CylinderGeometry(1, 1.3, 0.8, 16), plinth, sd * R, 0.4, 0));
  // A soft line of light across the road under it.
  const line = mesh(
    new THREE.PlaneGeometry(2 * R, 0.6).rotateX(-Math.PI / 2),
    lightMat(`line.${o.world}`, c, 0.5, false),
    0,
    0.06,
    0,
  );
  g.add(line);
  return g;
}

function glowGate(o: GateOpts): THREE.Group {
  const g = new THREE.Group();
  const c = lightOf(o.world);
  const R = o.hw + 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(R, 0);
  shape.absarc(0, 0, R, 0, Math.PI, false);
  shape.lineTo(R, 0);
  const geo = new THREE.ShapeGeometry(shape, 48);
  // Its uv: the point over the arch's own radius, so the sheet's shading fits any size.
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / R, uv.getY(i) / R);
  geo.scale(1, o.tall, 1);
  g.add(mesh(geo, sheetMat(c)));
  g.add(
    mesh(
      arc(R, 0.7, o.tall),
      o.world === 'mars' ? rustMat(0.5, o.night, o.world) : chromeMat(o.world, o.night),
    ),
  );
  g.add(
    mesh(
      arc(R - 0.75, 0.14, o.tall),
      lightMat(`edge.${o.world}`, c.map((x) => x * 1.8) as V3, 1, false),
    ),
  );
  return g;
}

function chromeGate(o: GateOpts): THREE.Group {
  const g = new THREE.Group();
  const mat = chromeMat(o.world, o.night);
  const R = o.hw + 0.9;
  const P = (0.45 * o.hw + 2) * o.tall;
  for (const sd of [1, -1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.85, 1.05, P, 28), mat, sd * R, P / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(1.4, 1.6, 1, 28), mat, sd * R, 0.5, 0));
    g.add(mesh(new THREE.TorusGeometry(1, 0.22, 10, 28).rotateX(Math.PI / 2), mat, sd * R, P, 0));
    g.add(mesh(new THREE.SphereGeometry(0.9, 24, 16), mat, sd * (R + 1.8), P + 0.4, 0));
  }
  const top = mesh(arc(R, 0.8, o.tall * 0.6, 72), mat, 0, P, 0);
  g.add(top);
  g.add(mesh(arc(R - 1.6, 0.35, o.tall * 0.6, 72), mat, 0, P, 0));
  return g;
}

function rustGate(o: GateOpts): THREE.Group {
  const g = new THREE.Group();
  const mat = rustMat(1, o.night, o.world);
  const px = o.hw + 0.9;
  const H = (0.85 * o.hw + 4) * o.tall;
  for (const sd of [1, -1]) {
    g.add(mesh(new THREE.BoxGeometry(1.6, H, 1.6), mat, sd * px, H / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(3, 0.8, 3), mat, sd * px, 0.4, 0));
  }
  const W = 2 * px + 3;
  g.add(mesh(new THREE.BoxGeometry(W, 1.6, 1.6), mat, 0, H, 0));
  g.add(mesh(new THREE.BoxGeometry(W - 2, 0.5, 0.9), mat, 0, H - 2.6, 0));
  // Diagonal braces in the top corners and a Warren web between the two beams.
  for (const sd of [1, -1]) {
    const b = new THREE.BoxGeometry(0.45, 5, 0.6);
    const m = mesh(b, mat, sd * (px - 1.6), H - 2.4, 0);
    m.rotation.z = sd * 0.75;
    g.add(m);
  }
  const n = Math.max(4, Math.round((W - 4) / 3));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 2 + ((i + 0.5) * (W - 4)) / n;
    const m = mesh(new THREE.BoxGeometry(0.3, 2.6, 0.4), mat, x, H - 1.3, 0);
    m.rotation.z = i % 2 ? 0.55 : -0.55;
    g.add(m);
  }
  return g;
}

function fabricGate(o: GateOpts): THREE.Group {
  const g = new THREE.Group();
  const pole = o.world === 'neon' ? chromeMat(o.world, o.night) : rustMat(0.2, o.night, o.world);
  const px = o.hw + 0.6;
  const H = (0.7 * o.hw + 4) * o.tall;
  for (const sd of [1, -1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, H, 12), pole, sd * px, H / 2, 0));
    g.add(
      mesh(
        new THREE.SphereGeometry(0.6, 16, 10),
        lightMat(`finial.${o.world}`, fabricOf(o.world).trim.map((c) => c * 1.4) as V3, 1, false),
        sd * (px + 1.6),
        H,
        0,
      ),
    );
  }
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 2 * px + 3.2, 10).rotateZ(Math.PI / 2),
      pole,
      0,
      H,
      0,
    ),
  );
  const base = clothMat(o.world, o.night);
  const cloth = (w: number, h: number, x: number, seed: number, sway: number) => {
    const m = base.clone();
    m.uniforms.uTime = GATE_U.uTime;
    m.uniforms.uSeed.value = seed;
    m.uniforms.uSway.value = sway;
    const geo = new THREE.PlaneGeometry(w, h, 8, 16);
    geo.translate(0, -h / 2, 0);
    const c = mesh(geo, m, x, H - 0.25, 0);
    c.userData.ownMaterial = true;
    return c;
  };
  const bw = Math.max(2.4, o.hw * 0.3);
  for (const sd of [1, -1]) g.add(cloth(bw, H * 0.72, sd * (px - bw / 2 - 0.4), o.seed + sd, 1));
  g.add(cloth(2 * px - 2 * bw - 1, H * 0.14, 0, o.seed + 5, 0.35));
  return g;
}

/** One gate in its own frame, standing on y = 0, its opening centred on x = 0. */
export function buildGate(style: GateStyle, o: GateOpts): THREE.Group {
  switch (style) {
    case 'fire':
      return fireGate(o);
    case 'halo':
      return haloGate(o);
    case 'glow':
      return glowGate(o);
    case 'chrome':
      return chromeGate(o);
    case 'rust':
      return rustGate(o);
    case 'fabric':
      return fabricGate(o);
  }
}

/** Frees a gate's geometry (and the few materials that are its own). */
export function disposeGate(g: THREE.Object3D) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
      if (!(o instanceof THREE.Sprite)) o.geometry.dispose();
      if (o.userData.ownMaterial) (o.material as THREE.Material).dispose();
    }
  });
}

/* ── the gates on the track ── */

interface Placed {
  obj: THREE.Group;
  orb: THREE.Sprite;
  /** Where it stands (physics x, y, ground height) and which way it faces. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
  lift: number;
}

/** How far behind and ahead of you the road's gates stand. */
const WINDOW = { BEHIND: 150, AHEAD: 1700 };

export class GatesView {
  readonly group = new THREE.Group();
  private placed = new Map<number, Placed>();
  /** When each gate gave its pickup (s on the clock). */
  private taken = new Map<number, number>();
  private plan: GatePlan | null;
  private night: boolean;
  private stations: { k: number; s: number }[] = [];
  private stationsAt = Number.NaN;

  constructor(
    private cfg: WorldCfg,
    private track: Track | null,
    /** The ground's height under a point on the open plains (Mars's dunes); flat when absent. */
    private ground: (x: number, y: number) => number = () => 0,
  ) {
    this.plan = gatePlan(cfg.id, track?.def ?? null);
    this.night = cfg.theme !== null;
    if (!track) DRIFT_GATES.forEach((_, i) => this.place(i));
  }

  /** The look and the pickup of gate k in this world. */
  styleOf(k: number): GateStyle {
    return gateStyle(this.cfg.id, k, this.plan?.style ?? null);
  }

  private build(
    k: number,
    hw: number,
    tall: number,
  ): Omit<Placed, 'x' | 'y' | 'z' | 'yaw' | 'roll'> {
    const style = this.styleOf(k);
    const obj = buildGate(style, { hw, tall, world: this.cfg.id, night: this.night, seed: k });
    const orb = glowSprite(new THREE.Color(...PICKUP_COLOUR[pickupFor(k, style)]), 3.4, 0.9);
    orb.userData.ownMaterial = true;
    const lift = Math.min(hw * 0.55, 7) * Math.max(1, tall * 0.8);
    orb.position.set(0, lift, 0);
    obj.add(orb);
    this.group.add(obj);
    return { obj, orb, lift };
  }

  private place(k: number, s = 0) {
    if (this.track && this.plan) {
      const tr = this.track;
      const f = frameAt(tr, s);
      const hw = tr.def.half(s) + this.plan.margin;
      const p = pointAt(tr, s, 0);
      this.placed.set(k, {
        ...this.build(k, hw, this.plan.tall),
        x: p.x,
        y: p.y,
        z: heightAt(tr, s, 0, true),
        yaw: f.h + Math.PI / 2,
        roll: -f.bank,
      });
      return;
    }
    const g = DRIFT_GATES[k];
    const x = (g.ax + g.bx) / 2;
    const y = (g.ay + g.by) / 2;
    this.placed.set(k, {
      ...this.build(k, DRIFT_GATE_HALF + 1, 1),
      x,
      y,
      z: this.ground(x, y),
      yaw: Math.atan2(g.ay - g.by, g.ax - g.bx),
      roll: 0,
    });
  }

  /** Whether gate k has a pickup to give at t: once on a road, again a while later on the open
   * plains' loop. */
  ready(k: number, t: number): boolean {
    const at = this.taken.get(k);
    return at === undefined || (!this.track && t - at >= GATE_REARM);
  }

  /** Gate k has given its pickup: its orb goes out. */
  take(k: number, t: number) {
    this.taken.set(k, t);
  }

  /** A new run: every orb back. */
  reset() {
    this.taken.clear();
  }

  update(ox: number, oy: number, s: number, t: number) {
    if (this.track && this.plan) {
      const tr = this.track;
      const plan = this.plan;
      const step = Math.floor(s / 100);
      if (step !== this.stationsAt) {
        this.stationsAt = step;
        this.stations = stationsBetween(plan, tr.def, s - WINDOW.BEHIND, s + WINDOW.AHEAD);
        const keep = new Set(this.stations.map((st) => st.k));
        for (const [k, p] of this.placed)
          if (!keep.has(k)) {
            this.group.remove(p.obj);
            disposeGate(p.obj);
            this.placed.delete(k);
          }
      }
      // One new gate a frame, so nothing stalls.
      for (const st of this.stations)
        if (!this.placed.has(st.k)) {
          this.place(st.k, st.s);
          break;
        }
    }
    for (const [k, p] of this.placed) {
      p.obj.position.set(p.x - ox, p.z, -(p.y - oy));
      p.obj.rotation.set(0, p.yaw, p.roll, 'YXZ');
      p.orb.visible = this.ready(k, t);
      p.orb.position.y = p.lift + 0.35 * Math.sin(t * 0.9 + k);
    }
  }

  dispose() {
    for (const p of this.placed.values()) disposeGate(p.obj);
    this.placed.clear();
    this.group.parent?.remove(this.group);
  }
}
