/**
 * The water's pieces, shared by the lake behind Chinatown Run's start (lake-view.ts) and Water City
 * (water-city-view.ts): the water itself (one shader: swell, rings, the rain's dimples, the storm's
 * sky, the portals' light lying on it), a portal of light, the sharks, the kraken's tentacles and
 * the rain falling round the camera.
 */

import * as THREE from 'three';
import { RAIN, RIPPLE, type Ripple } from '@/lib/art/chinatown-lake';

export const WATER_VERTEX = /* glsl */ `
varying vec2 vP;
varying float vFog;
void main() {
  vP = vec2(position.x, -position.z);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFog = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

/** The water's fragment shader, lit by `portals` portals. Positions are the mesh's local (x, -z). */
export function waterFragment(portals: number): string {
  return /* glsl */ `
uniform float uTime;
uniform vec4 uRip[${RIPPLE.MAX}];
uniform vec4 uPortal[${portals}];
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
  for (int i = 0; i < ${portals}; i++) {
    vec4 q = uPortal[i];
    if (q.w <= 0.0) continue;
    vec2 d = p - q.xy;
    vec2 view = normalize(uCam.xy - q.xy);
    float along = dot(d, view);
    float across = abs(d.x * view.y - d.y * view.x);
    float streak = exp(-across * across / 9.0) * exp(-abs(along) / 60.0) * step(0.0, along);
    float pool = exp(-dot(d, d) / 140.0);
    vec3 tone = mix(vec3(0.35, 1.1, 1.4), vec3(1.6, 1.1, 0.4), q.z);
    col += q.w * tone * (pool * 0.5 + streak * 0.35) * (0.6 + 0.6 * fres + 2.0 * length(n.xy));
  }
  // Glints off the rings and the dimples.
  col += vec3(0.25, 0.4, 0.45) * pow(length(n.xy) * 4.0, 2.0) * 0.4;
  float fog = 1.0 - exp(-vFog * 0.0011);
  col = mix(col, vec3(0.02, 0.035, 0.05), fog);
  gl_FragColor = vec4(col, 0.8 + 0.15 * fres);
}
`;
}

export interface Water {
  material: THREE.ShaderMaterial;
  /** Each frame: the time, the camera (in the mesh's local x, y; height), the rain (0..1), the
   * rings (world x, y, made local by the anchor ax, ay), and the portals ([local x, y, lit, shown]). */
  update(
    t: number,
    cam: { x: number; y: number; z: number },
    rain: number,
    rings: readonly Ripple[],
    ax: number,
    ay: number,
  ): void;
  portals: THREE.Vector4[];
}

export function makeWater(portals: number, level: number): Water {
  const rip = Array.from({ length: RIPPLE.MAX }, () => new THREE.Vector4(0, 0, -99, 0));
  const port = Array.from({ length: portals }, () => new THREE.Vector4());
  const material = new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: waterFragment(portals),
    uniforms: {
      uTime: { value: 0 },
      uRip: { value: rip },
      uPortal: { value: port },
      uCam: { value: new THREE.Vector3() },
      uLevel: { value: level },
      uRain: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return {
    material,
    portals: port,
    update(t, cam, rain, rings, ax, ay) {
      const u = material.uniforms;
      u.uTime.value = t;
      (u.uCam.value as THREE.Vector3).set(cam.x, cam.y, cam.z);
      u.uRain.value = rain;
      for (let i = 0; i < RIPPLE.MAX; i++) {
        const r = rings[i];
        if (!r) rip[i].set(0, 0, -99, 0);
        else rip[i].set(r.x - ax, r.y - ay, r.t, r.k);
      }
    },
  };
}

/** A portal of light: a ring standing upright, a faint veil across it; cyan, gold once lit. */
export function makePortal(
  ringGeo: THREE.BufferGeometry,
  discGeo: THREE.BufferGeometry,
): {
  group: THREE.Group;
  set(lit: boolean, t: number, i: number): void;
  dispose(): void;
} {
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
  const group = new THREE.Group();
  group.add(new THREE.Mesh(ringGeo, ring), new THREE.Mesh(discGeo, veil));
  return {
    group,
    set(lit, t, i) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.2 + i);
      if (lit) ring.color.setRGB(1.8 * pulse, 1.2 * pulse, 0.45 * pulse);
      else ring.color.setRGB(0.4 * pulse, 1.4 * pulse, 1.7 * pulse);
      veil.opacity = lit ? 0.2 : 0.1 + 0.04 * Math.sin(t * 1.3 + i);
      veil.color.set(lit ? 0xffb050 : 0x40c8e8);
    },
    dispose() {
      ring.dispose();
      veil.dispose();
    },
  };
}

/** n sharks: each a dark body with a pale belly, a dorsal fin and a tail; nose toward its +z. */
export function makeSharks(
  n: number,
  parent: THREE.Object3D,
): {
  /** Shark i at scene (x, y, z), heading (world rad), nose pitched up by `pitch`; null hides it. */
  place(i: number, at: [number, number, number] | null, heading?: number, pitch?: number): void;
  dispose(): void;
} {
  const sharkMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a58,
    roughness: 0.4,
    metalness: 0.1,
  });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0x9aa8b0, roughness: 0.5 });
  const bodyGeo = new THREE.SphereGeometry(1, 14, 10);
  const finGeo = new THREE.ConeGeometry(0.5, 1.4, 4);
  const e = new THREE.Euler();
  const sharks = Array.from({ length: n }, () => {
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
    g.add(body, belly, fin, tail);
    g.visible = false;
    parent.add(g);
    return g;
  });
  return {
    place(i, at, heading = 0, pitch = 0) {
      const g = sharks[i];
      g.visible = !!at;
      if (!at) return;
      g.position.set(...at);
      // +z turned to the world heading (scene −y is the world's +y), then the nose pitched.
      e.set(-pitch, heading + Math.PI / 2, 0, 'YXZ');
      g.rotation.copy(e);
    },
    dispose() {
      for (const m of [sharkMat, bellyMat, bodyGeo, finGeo]) m.dispose();
    },
  };
}

/** The kraken's flesh: tentacles as lines of spheres (thick at the root), faint aqua lights down
 * each, and a bulk breaking the water at each lair. Filled afresh each frame. */
export function makeKraken(
  most: number,
  parent: THREE.Object3D,
): {
  begin(): void;
  /** A tentacle through these scene points, `root` its radius at the root. */
  tentacle(pts: [number, number, number][], root: number): void;
  bulk(at: [number, number, number]): void;
  end(): void;
  dispose(): void;
} {
  const fleshMat = new THREE.MeshStandardMaterial({
    color: 0x2a0d1e,
    roughness: 0.45,
    metalness: 0.15,
    emissive: new THREE.Color(0.05, 0.0, 0.03),
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.2, 0.9, 1.0),
    toneMapped: false,
  });
  const ball = new THREE.SphereGeometry(1, 10, 8);
  const flesh = new THREE.InstancedMesh(ball, fleshMat, most);
  const spots = new THREE.InstancedMesh(ball, glowMat, most);
  for (const im of [flesh, spots]) {
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.count = 0;
    parent.add(im);
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  let n = 0;
  let ns = 0;
  return {
    begin() {
      n = 0;
      ns = 0;
    },
    tentacle(pts, root) {
      const last = Math.max(1, pts.length - 1);
      pts.forEach((p, k) => {
        if (n >= most) return;
        const r = root * (1 - 0.85 * (k / last));
        pv.set(...p);
        sc.set(r, r, r);
        m4.compose(pv, q, sc);
        flesh.setMatrixAt(n++, m4);
        if (k % 3 === 1 && ns < most) {
          sc.setScalar(r * 0.28);
          pv.y += r * 0.8;
          m4.compose(pv, q, sc);
          spots.setMatrixAt(ns++, m4);
        }
      });
    },
    bulk(at) {
      if (n >= most) return;
      pv.set(...at);
      sc.set(9, 5, 9);
      m4.compose(pv, q, sc);
      flesh.setMatrixAt(n++, m4);
    },
    end() {
      flesh.count = n;
      spots.count = ns;
      flesh.instanceMatrix.needsUpdate = true;
      spots.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      fleshMat.dispose();
      glowMat.dispose();
      ball.dispose();
    },
  };
}

const DROPS = 2200;
const RAIN_BOX = { W: 110, H: 46 };

/** The rain: streaks falling round the camera (in the scene's own frame). */
export function makeRain(): {
  group: THREE.Group;
  update(
    cam: { x: number; y: number; z: number },
    ox: number,
    oy: number,
    dt: number,
    k: number,
  ): void;
  dispose(): void;
} {
  const pos = new Float32Array(DROPS * 6);
  const drops = new Float32Array(DROPS * 3);
  for (let i = 0; i < DROPS; i++) {
    drops[i * 3] = Math.random() * RAIN_BOX.W;
    drops[i * 3 + 1] = Math.random() * RAIN_BOX.W;
    drops[i * 3 + 2] = Math.random() * RAIN_BOX.H;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0.55, 0.7, 0.8),
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 9;
  const group = new THREE.Group();
  group.add(lines);
  return {
    group,
    update(cam, ox, oy, dt, k) {
      lines.visible = k > 0.02;
      mat.opacity = 0.32 * k;
      if (!lines.visible) return;
      const fall = RAIN.FALL * dt;
      const W = RAIN_BOX.W;
      for (let i = 0; i < DROPS; i++) {
        let z = drops[i * 3 + 2] - fall;
        if (z < 0) z += RAIN_BOX.H;
        drops[i * 3 + 2] = z;
        // Each drop keeps its place on a grid of tiles round the camera.
        const wx = cam.x + ((((drops[i * 3] - cam.x) % W) + W) % W) - W / 2;
        const wy = cam.y + ((((drops[i * 3 + 1] - cam.y) % W) + W) % W) - W / 2;
        const wz = cam.z - RAIN_BOX.H * 0.4 + z;
        const sx = wx - ox;
        const sy = wy - oy;
        pos.set([sx, wz, -sy, sx + 0.05, wz + 0.9, -sy], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
