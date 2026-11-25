/**
 * The lake behind Chinatown Run's start, drawn (lib/art/chinatown-lake.ts; docs/specs/drive-tracks.md,
 * "The lake behind the start"): the dark slipway down from the street, the quay, the water in the
 * rain (rings spreading from the car, drops dimpling it, the portals' light lying on it), the seven
 * portals of light, the sharks breaching, the kraken's tentacles, the rain itself, and Water City lit
 * on the far shore, mirrored in the lake. One group in the road's frame at the start, placed
 * relative to the camera each frame like the track's chunks.
 */

import * as THREE from 'three';
import {
  KRAKEN,
  krakenRise,
  LAKE,
  type LakeRun,
  lairPoint,
  PORTAL,
  PORTALS,
  portalFacing,
  RAIN,
  RIPPLE,
  type RippleTrail,
  SHARKS,
  SLAMMER,
  SLIP,
  sharkAt,
  slamPose,
  slipHeight,
  TENTACLES,
  tentaclePoints,
} from '@/lib/art/chinatown-lake';
import { buildLakeCity, type V3 } from './lake-city-view';

/** Water City's lights on the far shore: teal, deep blue, gold, pale aqua. */
export const WATER_TONES: V3[] = [
  [1.6, 1.15, 0.45],
  [0.25, 1.1, 1.3],
  [0.35, 0.55, 1.6],
  [0.7, 1.4, 1.3],
];

/** The far shore's city: laid as the lake cities are, its anchor this far behind the start. */
const CITY_AT = -2080;
const CITY_SEED = 2600;
const SEGS = 22;
const DROPS = 2200;
const RAIN_BOX = { W: 110, H: 46 };

const WATER_VERTEX = /* glsl */ `
varying vec2 vP;
varying float vFog;
void main() {
  vP = vec2(position.x, -position.z);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFog = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const WATER_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec4 uRip[${RIPPLE.MAX}];
uniform vec4 uPortal[${PORTALS.length}];
uniform vec3 uCam;
uniform float uLevel;
uniform float uRain;
varying vec2 vP;
varying float vFog;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// The water's height here: slow swell, the rings from the car and the splashes, the rain's dimples.
float wave(vec2 p) {
  float h = 0.05 * sin(p.x * 0.05 + uTime * 0.6) * sin(p.y * 0.043 - uTime * 0.45);
  h += 0.02 * sin(dot(p, vec2(0.21, 0.13)) + uTime * 1.7);
  for (int i = 0; i < ${RIPPLE.MAX}; i++) {
    vec4 q = uRip[i];
    float age = uTime - q.z;
    if (q.w <= 0.0 || age < 0.0 || age > ${RIPPLE.LIFE.toFixed(2)}) continue;
    float r = age * ${RIPPLE.SPEED.toFixed(2)};
    float d = length(p - q.xy);
    float x = d - r;
    float fade = q.w * pow(1.0 - age / ${RIPPLE.LIFE.toFixed(2)}, 2.0);
    h += 0.16 * fade * sin(x * 2.4) * exp(-x * x * 0.35);
  }
  // Rain: a drop lands in each 1.6 m cell now and then, a small ring growing from it.
  vec2 c = floor(p / 1.6);
  for (int dx = 0; dx <= 1; dx++) for (int dy = 0; dy <= 1; dy++) {
    vec2 cell = c + vec2(float(dx), float(dy)) - 0.5;
    float seed = hash(cell);
    float period = 0.7 + seed;
    float age = mod(uTime + seed * 9.0, period);
    if (age > ${RAIN.DIMPLE_LIFE.toFixed(2)}) continue;
    vec2 at = (cell + vec2(hash(cell + 3.1), hash(cell + 7.7))) * 1.6;
    float x = length(p - at) - age * ${(RAIN.DIMPLE / RAIN.DIMPLE_LIFE).toFixed(2)};
    h += uRain * 0.035 * (1.0 - age / ${RAIN.DIMPLE_LIFE.toFixed(2)}) * sin(x * 18.0) * exp(-x * x * 40.0);
  }
  return h;
}

void main() {
  vec2 p = vP;
  float e = 0.12;
  float h0 = wave(p);
  vec3 n = normalize(vec3(-(wave(p + vec2(e, 0.0)) - h0) / e, -(wave(p + vec2(0.0, e)) - h0) / e, 1.0));
  vec3 toEye = normalize(vec3(uCam.xy - p, uCam.z - uLevel));
  float fres = pow(1.0 - max(dot(n, toEye), 0.0), 4.0);
  // The storm's sky in it: deep teal-black, lighter toward the horizon.
  vec3 deep = vec3(0.004, 0.012, 0.02);
  vec3 sky = vec3(0.03, 0.07, 0.1);
  vec3 col = mix(deep, sky, fres);
  // The portals' light lying on the water: a pool round each foot, streaked toward you.
  for (int i = 0; i < ${PORTALS.length}; i++) {
    vec4 q = uPortal[i];
    vec2 d = p - q.xy;
    vec2 view = normalize(uCam.xy - q.xy);
    float along = dot(d, view);
    float across = abs(d.x * view.y - d.y * view.x);
    float streak = exp(-across * across / 9.0) * exp(-abs(along) / 60.0) * step(0.0, along);
    float pool = exp(-dot(d, d) / 140.0);
    vec3 tone = mix(vec3(0.35, 1.1, 1.4), vec3(1.6, 1.1, 0.4), q.z);
    col += tone * (pool * 0.5 + streak * 0.35) * (0.6 + 0.6 * fres + 2.0 * length(n.xy));
  }
  // Glints off the rings and the dimples.
  col += vec3(0.25, 0.4, 0.45) * pow(length(n.xy) * 4.0, 2.0) * 0.4;
  float fog = 1.0 - exp(-vFog * 0.0011);
  col = mix(col, vec3(0.02, 0.035, 0.05), fog);
  gl_FragColor = vec4(col, 0.8 + 0.15 * fres);
}
`;

export interface LakeFrame {
  /** The camera, and where along the road you are. */
  cam: { x: number; y: number; z: number };
  s: number;
  run: LakeRun;
  ripples: RippleTrail;
  /** When each lair's kraken woke (null asleep), and how far past each you are (m along the S). */
  woke: (number | null)[];
  past: number[];
  /** Where each lair's slam is aimed (road s, u). */
  aim: { s: number; u: number }[];
  /** How much of the storm is about you (0 on the street, 1 out on the lake). */
  storm: number;
}

export interface LakeView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number, dt: number, f: LakeFrame): void;
  dispose(): void;
}

/** The lake's view, its anchor the road's start (x0, y0) heading h0 there. */
export function buildLakeView(x0: number, y0: number, h0: number): LakeView {
  const group = new THREE.Group();
  const c = Math.cos(h0);
  const sn = Math.sin(h0);
  /** Road (s, u) behind the start to local world (dx, dy) from the anchor. */
  const W = (s: number, u: number) => ({ x: c * s - sn * u, y: sn * s + c * u });
  /** And to the scene (x, height, −y). */
  const S = (s: number, u: number, z: number): [number, number, number] => {
    const p = W(s, u);
    return [p.x, z, -p.y];
  };
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => {
    owned.push(x);
    return x;
  };

  /* The slipway, its walls and the quay. */
  const stone = new THREE.MeshStandardMaterial({
    color: 0x0b0d10,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  own(stone);
  const lineMat = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.0, 1.15), toneMapped: false }),
  );
  const goldMat = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.05, 0.4), toneMapped: false }),
  );
  {
    const pos: number[] = [];
    const lines: number[] = [];
    const quad = (out: number[], a: number[], b: number[], cc: number[], d: number[]) =>
      out.push(...a, ...b, ...cc, ...a, ...cc, ...d);
    const wall = SLIP.HALF + SLIP.WALL;
    const end = -SLIP.LEN - 10;
    for (let s = 0; s > end; s -= 4) {
      const s1 = Math.max(end, s - 4);
      const z0 = Math.max(LAKE.LEVEL - 0.3, slipHeight(s));
      const z1 = Math.max(LAKE.LEVEL - 0.3, slipHeight(s1));
      quad(pos, S(s, -wall, z0), S(s, wall, z0), S(s1, wall, z1), S(s1, -wall, z1));
      for (const side of [1, -1]) {
        const u = side * wall;
        // A low wall, a thin teal line along its top: the only light on the way down.
        quad(pos, S(s, u, z0 - 3), S(s, u, z0 + 1.1), S(s1, u, z1 + 1.1), S(s1, u, z1 - 3));
        quad(
          lines,
          S(s, u, z0 + 1.1),
          S(s, u - side * 0.12, z0 + 1.12),
          S(s1, u - side * 0.12, z1 + 1.12),
          S(s1, u, z1 + 1.1),
        );
      }
    }
    // The quay across the slipway's foot, either side out to the lake's edges.
    for (const side of [1, -1])
      for (let u = wall; u < LAKE.HALF; u += 20) {
        const a = side * u;
        const b = side * Math.min(LAKE.HALF, u + 20);
        const q = -SLIP.LEN;
        quad(pos, S(q, a, LAKE.LEVEL - 2), S(q, b, LAKE.LEVEL - 2), S(q, b, 0.8), S(q, a, 0.8));
        quad(pos, S(q, a, 0.8), S(q, b, 0.8), S(q + 30, b, 0.8), S(q + 30, a, 0.8));
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(own(geo), stone));
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    group.add(new THREE.Mesh(own(lg), lineMat));
    // Gold lamps along the quay's edge, and dim buoys marking the lake's far edges.
    const lamp = own(new THREE.SphereGeometry(0.35, 8, 6));
    const lamps: THREE.Vector3[] = [];
    for (const side of [1, -1])
      for (let u = wall + 10; u < LAKE.HALF; u += 40)
        lamps.push(new THREE.Vector3(...S(-SLIP.LEN, side * u, 1.6)));
    for (let s = -SLIP.LEN - 40; s > -LAKE.BACK; s -= 60)
      for (const side of [1, -1])
        lamps.push(new THREE.Vector3(...S(s, side * LAKE.HALF, LAKE.LEVEL + 0.6)));
    for (let u = -LAKE.HALF; u <= LAKE.HALF; u += 60)
      lamps.push(new THREE.Vector3(...S(-LAKE.BACK, u, LAKE.LEVEL + 0.6)));
    const lampMesh = new THREE.InstancedMesh(lamp, goldMat, lamps.length);
    const m = new THREE.Matrix4();
    lamps.forEach((p, i) => {
      lampMesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
    });
    lampMesh.frustumCulled = false;
    group.add(lampMesh);
  }

  /* The water. */
  const ripU: THREE.Vector4[] = Array.from({ length: RIPPLE.MAX }, () => new THREE.Vector4());
  const portalU: THREE.Vector4[] = PORTALS.map(([s, u]) => {
    const p = W(s, u);
    return new THREE.Vector4(p.x, p.y, 0, 0);
  });
  const waterMat = own(
    new THREE.ShaderMaterial({
      vertexShader: WATER_VERTEX,
      fragmentShader: WATER_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uRip: { value: ripU },
        uPortal: { value: portalU },
        uCam: { value: new THREE.Vector3() },
        uLevel: { value: LAKE.LEVEL },
        uRain: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  {
    // Wider than the lake's edges and on under the far shore's city, so it meets the horizon.
    const pos: number[] = [];
    const near = -SLIP.LEN + 30;
    const far = -LAKE.BACK - 900;
    const wide = LAKE.HALF + 900;
    const n = 24;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const s0 = near + ((far - near) * i) / n;
        const s1 = near + ((far - near) * (i + 1)) / n;
        const u0 = -wide + (2 * wide * j) / n;
        const u1 = -wide + (2 * wide * (j + 1)) / n;
        const a = S(s0, u0, LAKE.LEVEL);
        const b = S(s0, u1, LAKE.LEVEL);
        const cc = S(s1, u1, LAKE.LEVEL);
        const d = S(s1, u0, LAKE.LEVEL);
        pos.push(...a, ...b, ...cc, ...a, ...cc, ...d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const water = new THREE.Mesh(own(geo), waterMat);
    water.renderOrder = 2;
    water.frustumCulled = false;
    group.add(water);
  }

  /* Water City on the far shore, mirrored in the lake. */
  const cityBody = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const cityLit = own(
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }),
  );
  const city = buildLakeCity(CITY_SEED, h0 + Math.PI / 2, waterMat, cityBody, cityLit, 1, 0, {
    tones: WATER_TONES,
    water: false,
  });
  const cp = W(CITY_AT, 0);
  city.position.set(cp.x, 0, -cp.y);
  group.add(city);

  /* The portals of light. */
  const ringGeo = own(new THREE.TorusGeometry(PORTAL.R, 0.32, 10, 64));
  const discGeo = own(new THREE.CircleGeometry(PORTAL.R - 0.3, 48));
  const portals = PORTALS.map(([s, u], i) => {
    const ring = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.4, 1.4, 1.7),
      toneMapped: false,
    });
    const veil = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.2, 0.7, 0.9),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    own(ring);
    own(veil);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ringGeo, ring), new THREE.Mesh(discGeo, veil));
    const p = S(s, u, LAKE.LEVEL + PORTAL.LIFT);
    g.position.set(...p);
    g.rotation.y = h0 + portalFacing(i) + Math.PI / 2;
    group.add(g);
    return { g, ring, veil };
  });

  /* The sharks. */
  const sharkMat = own(
    new THREE.MeshStandardMaterial({ color: 0x3a4a58, roughness: 0.4, metalness: 0.1 }),
  );
  const bellyMat = own(new THREE.MeshStandardMaterial({ color: 0x9aa8b0, roughness: 0.5 }));
  const bodyGeo = own(new THREE.SphereGeometry(1, 14, 10));
  const finGeo = own(new THREE.ConeGeometry(0.5, 1.4, 4));
  const sharks = SHARKS.map(() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, sharkMat);
    body.scale.set(0.75, 0.7, 2.8);
    const belly = new THREE.Mesh(bodyGeo, bellyMat);
    belly.scale.set(0.6, 0.45, 2.3);
    belly.position.y = -0.3;
    const fin = new THREE.Mesh(finGeo, sharkMat);
    fin.position.set(0, 0.95, -0.2);
    fin.rotation.x = -0.35;
    fin.scale.set(0.35, 1, 1);
    const tail = new THREE.Mesh(finGeo, sharkMat);
    tail.position.set(0, 0.4, -2.9);
    tail.rotation.x = -0.9;
    tail.scale.set(0.3, 1.3, 1);
    // The body's long axis is its z: nose toward +z.
    g.add(body, belly, fin, tail);
    g.visible = false;
    group.add(g);
    return g;
  });

  /* The kraken: each tentacle a line of spheres, thick at the root, thin at the tip, with a row
   * of faint lights down it. */
  const per = TENTACLES.length * SEGS;
  const fleshMat = own(
    new THREE.MeshStandardMaterial({
      color: 0x2a0d1e,
      roughness: 0.45,
      metalness: 0.15,
      emissive: new THREE.Color(0.05, 0.0, 0.03),
    }),
  );
  const glowMat = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.9, 1.0), toneMapped: false }),
  );
  const ball = own(new THREE.SphereGeometry(1, 10, 8));
  const flesh = new THREE.InstancedMesh(ball, fleshMat, per * KRAKEN.LAIRS.length);
  const spots = new THREE.InstancedMesh(ball, glowMat, per * KRAKEN.LAIRS.length);
  for (const im of [flesh, spots]) {
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.count = 0;
    group.add(im);
  }

  /* The rain: streaks falling round the camera. */
  const rainPos = new Float32Array(DROPS * 6);
  const drops = new Float32Array(DROPS * 3);
  for (let i = 0; i < DROPS; i++) {
    drops[i * 3] = Math.random() * RAIN_BOX.W;
    drops[i * 3 + 1] = Math.random() * RAIN_BOX.W;
    drops[i * 3 + 2] = Math.random() * RAIN_BOX.H;
  }
  const rainGeo = own(new THREE.BufferGeometry());
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = own(
    new THREE.LineBasicMaterial({
      color: new THREE.Color(0.55, 0.7, 0.8),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.renderOrder = 9;
  // The rain is drawn round the camera, in the scene's own frame (not the lake's group).
  const rainGroup = new THREE.Group();
  rainGroup.add(rain);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const e = new THREE.Euler();

  return {
    group: (() => {
      const outer = new THREE.Group();
      outer.add(group, rainGroup);
      return outer;
    })(),
    update(ox, oy, t, dt, f) {
      group.position.set(x0 - ox, 0, -(y0 - oy));
      const u = waterMat.uniforms;
      u.uTime.value = t;
      (u.uCam.value as THREE.Vector3).set(f.cam.x - x0, f.cam.y - y0, f.cam.z);
      u.uRain.value = 0.4 + 0.6 * f.storm;
      for (let i = 0; i < RIPPLE.MAX; i++) {
        const r = f.ripples.rings[i];
        if (!r) ripU[i].set(0, 0, -99, 0);
        else ripU[i].set(r.x - x0, r.y - y0, r.t, r.k);
      }
      PORTALS.forEach((_, i) => {
        const lit = f.run.lit[i];
        portalU[i].z = lit ? 1 : 0;
        const p = portals[i];
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.2 + i);
        if (lit) p.ring.color.setRGB(1.8 * pulse, 1.2 * pulse, 0.45 * pulse);
        else p.ring.color.setRGB(0.4 * pulse, 1.4 * pulse, 1.7 * pulse);
        p.veil.opacity = lit ? 0.2 : 0.1 + 0.04 * Math.sin(t * 1.3 + i);
        p.veil.color.set(lit ? 0xffb050 : 0x40c8e8);
      });

      // Sharks in the air.
      SHARKS.forEach((_, i) => {
        const g = sharks[i];
        const p = sharkAt(i, t);
        g.visible = !!p;
        if (!p) return;
        g.position.set(...S(p.s, p.u, LAKE.LEVEL + p.z - 0.4));
        // Its nose along its leap (world heading h0 + way), pitched up out and down back in.
        e.set(-p.pitch, h0 + p.way + Math.PI / 2, 0, 'YXZ');
        g.rotation.copy(e);
      });

      // The kraken.
      let n = 0;
      let ns = 0;
      for (let l = 0; l < KRAKEN.LAIRS.length; l++) {
        const woke = f.woke[l];
        if (woke === null) continue;
        const since = t - woke;
        const past = f.past[l];
        const rise = krakenRise(since, past);
        if (rise <= 0.001) continue;
        const pose = slamPose(since);
        for (let j = 0; j < TENTACLES.length; j++) {
          const pts = tentaclePoints(
            l,
            j,
            rise,
            t,
            SEGS,
            j === SLAMMER
              ? { lift: pose.lift, down: pose.down, ts: f.aim[l].s, tu: f.aim[l].u }
              : undefined,
          );
          const root = 2.6 * (TENTACLES[j].tall / 26);
          pts.forEach((pt, k) => {
            const r = root * (1 - 0.85 * (k / (SEGS - 1)));
            pv.set(...S(pt.s, pt.u, LAKE.LEVEL - 1 + pt.z));
            sc.set(r, r, r);
            m4.compose(pv, q.identity(), sc);
            flesh.setMatrixAt(n++, m4);
            if (k % 3 === 1) {
              sc.set(r * 0.28, r * 0.28, r * 0.28);
              pv.y += r * 0.8;
              m4.compose(pv, q, sc);
              spots.setMatrixAt(ns++, m4);
            }
          });
        }
        // The lair's root bulk, just breaking the water.
        const mid = lairPoint(l, 0, 0);
        pv.set(...S(mid.s, mid.u, LAKE.LEVEL - 6 + 3 * rise));
        sc.set(9, 5, 9);
        m4.compose(pv, q.identity(), sc);
        flesh.setMatrixAt(n++, m4);
      }
      flesh.count = n;
      spots.count = ns;
      flesh.instanceMatrix.needsUpdate = true;
      spots.instanceMatrix.needsUpdate = true;

      // The rain round the camera, heavier out on the lake.
      rain.visible = f.storm > 0.02;
      rainMat.opacity = 0.32 * f.storm;
      if (rain.visible) {
        const fall = RAIN.FALL * dt;
        const len = 0.9;
        const W = RAIN_BOX.W;
        for (let i = 0; i < DROPS; i++) {
          let z = drops[i * 3 + 2] - fall;
          if (z < 0) z += RAIN_BOX.H;
          drops[i * 3 + 2] = z;
          // Each drop keeps its place on a grid of RAIN_BOX tiles round the camera.
          const wx = f.cam.x + ((((drops[i * 3] - f.cam.x) % W) + W) % W) - W / 2;
          const wy = f.cam.y + ((((drops[i * 3 + 1] - f.cam.y) % W) + W) % W) - W / 2;
          const wz = f.cam.z - RAIN_BOX.H * 0.4 + z;
          const sx = wx - ox;
          const sy = wy - oy;
          rainPos.set([sx, wz, -sy, sx + 0.05, wz + len, -sy], i * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      for (const o of owned) o.dispose();
      city.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
