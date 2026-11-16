/**
 * Drive's two vehicles as meshes (docs/specs/drive-game.md).
 *
 * - The car: the Speed pieces' original low, wide body seen from behind (lib/art/speed-shaders.ts
 *   carLayer) built in the round at the same proportions: a black lower body with diffuser fins and
 *   two exhausts, the wedge of the body, a dark glass cabin, wide rear wheels and one red light bar
 *   across the tail. No logos.
 * - The hover ship: a low lens of a hull with a pointed nose, a glass bubble in the middle with the
 *   pilot's seat and a faint figure inside, and a turbine booster on each side (an intake ring with
 *   a turning fan, a ribbed housing, a nozzle) from which the fire comes out. No wheels: it floats,
 *   a soft glow under it.
 *
 * The hull's finish (chrome, rust, red) and the fire are the Design panel's (lib/art/drive-design.ts).
 */

import * as THREE from 'three';

import { type Fire, type Hull, hullById } from '@/lib/art/drive-design';
import { FIRE_FRAGMENT, FIRE_VERTEX } from '@/lib/art/drive-shaders';
import { CAR_SCALE } from '@/lib/art/salt-flat-game';
import type { Vehicle } from '@/lib/art/vehicle';

export interface VehicleView {
  group: THREE.Group;
  /** Where the fire leaves (vehicle-local) for the trails, and the wheels or pads for the dust. */
  nozzles: THREE.Vector3[];
  feet: THREE.Vector3[];
  update(v: Vehicle, t: number, dt: number, power: number, speedN: number): void;
  setHull(h: Hull, env: THREE.Texture | null): void;
  setFire(f: Fire): void;
  dispose(): void;
}

/* ── Finishes ──────────────────────────────────────────────── */

let rustMap: THREE.Texture | null = null;
/** A weathered patina: orange-brown with darker streaks and pale bloom, made once. */
function rustTexture(): THREE.Texture | null {
  if (rustMap) return rustMap;
  if (typeof document === 'undefined') return null;
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#8a4a26';
  g.fillRect(0, 0, 256, 256);
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 900; i++) {
    const r = 2 + rnd() * 14;
    const tone = rnd();
    g.fillStyle =
      tone < 0.45
        ? `rgba(60,28,14,${0.15 + rnd() * 0.3})`
        : tone < 0.8
          ? `rgba(170,90,40,${0.12 + rnd() * 0.25})`
          : `rgba(95,110,90,${0.08 + rnd() * 0.14})`;
    g.beginPath();
    g.ellipse(rnd() * 256, rnd() * 256, r, r * (0.4 + rnd()), rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // Streaks running down.
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(50,24,12,${0.1 + rnd() * 0.15})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 20 + rnd() * 60);
  }
  rustMap = new THREE.CanvasTexture(c);
  rustMap.wrapS = THREE.RepeatWrapping;
  rustMap.wrapT = THREE.RepeatWrapping;
  rustMap.colorSpace = THREE.SRGBColorSpace;
  return rustMap;
}

export function hullMaterial(h: Hull, env: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(h.colour),
    metalness: h.metalness,
    roughness: h.roughness,
    clearcoat: h.clearcoat,
    clearcoatRoughness: 0.08,
    envMap: env,
    envMapIntensity: h.id === 'chrome' ? 1.4 : 0.8,
  });
  if (h.patina > 0) {
    const map = rustTexture();
    if (map) {
      m.map = map;
      m.color.set('#ffffff');
    }
  }
  return m;
}

function applyHull(target: THREE.MeshPhysicalMaterial, h: Hull, env: THREE.Texture | null) {
  const fresh = hullMaterial(h, env);
  target.copy(fresh);
  fresh.dispose();
  target.needsUpdate = true;
}

const glassMat = (env: THREE.Texture | null) =>
  new THREE.MeshPhysicalMaterial({
    color: 0x9fb4d8,
    metalness: 0,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.32,
    envMap: env,
    envMapIntensity: 1.6,
    depthWrite: false,
  });

/** A soft round glow texture for sprites and pads, made once. */
let glowTex: THREE.DataTexture | null = null;
export function glowTexture(): THREE.DataTexture {
  if (glowTex) return glowTex;
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5;
      const dy = (y + 0.5) / n - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      const a = Math.max(0, 1 - r) ** 2;
      const i = (y * n + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  glowTex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  glowTex.needsUpdate = true;
  glowTex.magFilter = THREE.LinearFilter;
  glowTex.minFilter = THREE.LinearFilter;
  return glowTex;
}

export function glowSprite(
  colour: THREE.ColorRepresentation,
  size: number,
  opacity = 1,
): THREE.Sprite {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: colour,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  s.scale.set(size, size, 1);
  return s;
}

/** A flat soft blob on the ground (shadow or glow). */
function groundBlob(
  colour: THREE.ColorRepresentation,
  w: number,
  l: number,
  additive: boolean,
  opacity: number,
) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, l),
    new THREE.MeshBasicMaterial({
      map: glowTexture(),
      color: colour,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ── The car ───────────────────────────────────────────────── */

/**
 * In the car's own frame: x across (right +), y up, z forward; the tail at z = 0. Sizes are the
 * carLayer's units times CAR_SCALE, so the car seen from behind matches the pieces' car.
 */
export function buildCar(hull: Hull, env: THREE.Texture | null): VehicleView {
  const k = CAR_SCALE;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6, metalness: 0.2 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x060608,
    roughness: 0.05,
    metalness: 0.3,
    clearcoat: 1,
    envMap: env,
    envMapIntensity: 1,
  });
  const len = 4.5;

  // The body: a wedge in side view (tail up, nose down), extruded across its width.
  const side = new THREE.Shape();
  side.moveTo(0, 0.3 * k);
  side.lineTo(0, 0.98 * k);
  side.lineTo(0.5, 1.0 * k);
  side.lineTo(1.6, 0.98 * k);
  side.lineTo(3.2, 0.82 * k);
  side.lineTo(len, 0.5 * k);
  side.lineTo(len, 0.3 * k);
  side.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(side, {
    depth: 1.84 * k,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 3,
  });
  // Shape x → car z, shape y → car y, extrude (z) → across.
  bodyGeo.rotateY(-Math.PI / 2);
  bodyGeo.translate((1.84 * k) / 2, 0, 0);
  const bodyMesh = new THREE.Mesh(bodyGeo, paint);
  body.add(bodyMesh);

  // The cabin: a lower, narrower wedge of dark glass.
  const cab = new THREE.Shape();
  cab.moveTo(1.0, 0.98 * k);
  cab.lineTo(1.25, 1.2 * k);
  cab.lineTo(2.3, 1.2 * k);
  cab.lineTo(3.0, 0.88 * k);
  cab.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(cab, {
    depth: 1.12 * k,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  cabGeo.rotateY(-Math.PI / 2);
  cabGeo.translate((1.12 * k) / 2, 0, 0);
  body.add(new THREE.Mesh(cabGeo, glass));

  // The black lower body, diffuser fins and exhausts.
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9 * k, 0.32 * k, len - 0.2), black);
  lower.position.set(0, 0.42 * k, len / 2);
  body.add(lower);
  for (const x of [-0.32, 0.32]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2 * k, 0.6), black);
    fin.position.set(x * k, 0.35 * k, 0.25);
    body.add(fin);
  }
  for (const x of [-0.2, 0.2]) {
    const ex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055 * k, 0.055 * k, 0.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.4, metalness: 0.8 }),
    );
    ex.rotation.x = Math.PI / 2;
    ex.position.set(x * k, 0.36 * k, 0.02);
    body.add(ex);
  }

  // The light bar across the tail: the one red line of light.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.52 * k, 0.045 * k, 0.04),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.04), toneMapped: false }),
  );
  bar.position.set(0, 0.8 * k, -0.06);
  body.add(bar);
  const barGlow = glowSprite(0xff1a08, 1.6, 0.35);
  barGlow.scale.set(2.4, 0.5, 1);
  barGlow.position.set(0, 0.8 * k, -0.1);
  body.add(barGlow);

  // Wheels: wide at the back.
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.34 * k, 0.34 * k, 0.34 * k * 1.1, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-0.78, 0.55],
    [0.78, 0.55],
    [-0.74, 3.55],
    [0.74, 3.55],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.position.set(x * k, 0.34 * k, z);
    group.add(w);
    wheels.push(w);
  }

  // Its shadow, and the red pool its light throws on the ground behind it.
  const shadow = groundBlob(0x000000, 2.6, 5.6, false, 0.55);
  shadow.position.set(0, 0.02, len / 2);
  group.add(shadow);
  const pool = groundBlob(0xff1006, 2.8, 4, true, 0.12);
  pool.position.set(0, 0.03, -1.6);
  group.add(pool);

  let spin = 0;
  const view: VehicleView = {
    group,
    nozzles: [],
    feet: [new THREE.Vector3(-0.78 * k, 0, 0.55), new THREE.Vector3(0.78 * k, 0, 0.55)],
    update(v, _t, dt) {
      spin += (v.vLong / (0.34 * k)) * dt;
      for (const w of wheels) w.rotation.x = spin;
      body.rotation.z = -v.roll * 0.6;
      shadow.visible = !v.air || v.airTime < 0.05;
      pool.visible = shadow.visible;
    },
    setHull(h, e) {
      applyHull(paint, h, e);
    },
    setFire() {},
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
        }
      });
    },
  };
  return view;
}

/* ── The hover ship ────────────────────────────────────────── */

function fireMaterial(f: Fire, seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: FIRE_VERTEX,
    fragmentShader: FIRE_FRAGMENT,
    uniforms: {
      uS0: { value: new THREE.Color(...f.stops[0]) },
      uS1: { value: new THREE.Color(...f.stops[1]) },
      uS2: { value: new THREE.Color(...f.stops[2]) },
      uTime: { value: 0 },
      uPower: { value: 1 },
      uSeed: { value: seed },
      uLenK: { value: 2 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * A cone of the fire shader standing upright, wide at the top: a dust devil in dusty colours (the
 * booster's flame turned into a whirl of sand).
 */
export function buildFireCone(
  stops: [[number, number, number], [number, number, number], [number, number, number]],
  radius: number,
  height: number,
  power: number,
): THREE.Group {
  const g = new THREE.Group();
  const mat = fireMaterial(
    { id: 'speed', name: '', palette: { coreK: 0, blue: 0, luminous: 0 }, stops },
    3.1,
  );
  mat.uniforms.uLenK.value = height;
  mat.uniforms.uPower.value = power;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 1, 20, 6, true), mat);
  cone.rotation.x = Math.PI;
  cone.position.y = height;
  g.add(cone);
  g.userData.fire = mat;
  return g;
}

export function buildShip(hull: Hull, fire: Fire, env: THREE.Texture | null): VehicleView {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.45, metalness: 0.7 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x23232c, roughness: 0.3, metalness: 0.9 });

  // The hull: a low lens, longer than wide, its nose drawn to a point.
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), paint);
  lens.scale.set(1.05, 0.32, 2.3);
  lens.position.set(0, 0.45, 2.0);
  body.add(lens);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 24), paint);
  nose.rotation.x = Math.PI / 2;
  nose.scale.set(1.6, 0.55, 1);
  nose.position.set(0, 0.42, 4.6);
  body.add(nose);
  // A dark keel under it and a fine glowing seam round its waist.
  const keel = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12), dark);
  keel.scale.set(0.8, 0.16, 1.9);
  keel.position.set(0, 0.26, 2.0);
  body.add(keel);

  // The bubble: clear glass over the pilot's seat, the pilot a faint shape inside.
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat(env),
  );
  bubble.scale.set(1, 0.85, 1.2);
  bubble.position.set(0, 0.62, 1.9);
  bubble.renderOrder = 5;
  body.add(bubble);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.12), dark);
  seat.position.set(0, 0.85, 1.55);
  seat.rotation.x = -0.25;
  body.add(seat);
  const pilot = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.25, 4, 10), dark);
  pilot.position.set(0, 0.88, 1.72);
  body.add(pilot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), trim);
  head.position.set(0, 1.12, 1.74);
  body.add(head);

  // The two turbine boosters.
  const fans: THREE.Group[] = [];
  const fires: THREE.ShaderMaterial[] = [];
  const glows: THREE.Sprite[] = [];
  const nozzles: THREE.Vector3[] = [];
  for (const side of [-1, 1]) {
    const pod = new THREE.Group();
    pod.position.set(side * 1.45, 0.55, 1.6);
    body.add(pod);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 2.2, 28, 1, true), paint);
    housing.rotation.x = Math.PI / 2;
    pod.add(housing);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.34, 2.2, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.8, side: THREE.BackSide }),
    );
    inner.rotation.x = Math.PI / 2;
    pod.add(inner);
    // Ribs round the housing.
    for (let r = 0; r < 5; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.43 - r * 0.012, 0.025, 8, 32), trim);
      rib.position.z = -0.7 + r * 0.38;
      pod.add(rib);
    }
    // The intake ring and its fan.
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 36), trim);
    lip.position.z = 1.1;
    pod.add(lip);
    const fan = new THREE.Group();
    fan.position.z = 0.95;
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 16), trim);
    hub.rotation.x = Math.PI / 2;
    fan.add(hub);
    for (let b = 0; b < 9; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.015), trim);
      blade.position.y = 0.2;
      blade.rotation.y = 0.5;
      const arm = new THREE.Group();
      arm.rotation.z = (b / 9) * Math.PI * 2;
      arm.add(blade);
      fan.add(arm);
    }
    pod.add(fan);
    fans.push(fan);
    // The nozzle at the back, glowing from inside.
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 24, 1, true), dark);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = -1.22;
    pod.add(nozzle);
    // A strut to the hull.
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.9), paint);
    strut.position.set(-side * 0.55, -0.05, 0.2);
    pod.add(strut);
    // The fire: a long outer flame and a short hot core, pointing back.
    for (const [rad, lenK, seed] of [
      [0.3, 1, side * 1.3],
      [0.16, 0.55, side * 2.7],
    ] as const) {
      const geo = new THREE.ConeGeometry(rad, 1, 24, 6, true);
      const mat = fireMaterial(fire, seed);
      mat.uniforms.uLenK.value = lenK;
      const flame = new THREE.Mesh(geo, mat);
      flame.userData.lenK = lenK;
      // Cone tip +y → pointing back (-z).
      flame.rotation.x = -Math.PI / 2;
      flame.position.z = -1.3;
      flame.renderOrder = 6;
      pod.add(flame);
      fires.push(mat);
    }
    const glow = glowSprite(new THREE.Color(...fire.stops[0]), 1.4, 0.8);
    glow.position.z = -1.35;
    pod.add(glow);
    glows.push(glow);
    nozzles.push(new THREE.Vector3(side * 1.45, 0.55, -0.2));
  }

  // The hover glow under it, in the fire's middle colour.
  const pad = groundBlob(new THREE.Color(...fire.stops[1]), 3.6, 6, true, 0.25);
  pad.position.set(0, 0.02, 2);
  group.add(pad);
  const shadow = groundBlob(0x000000, 3.2, 5.6, false, 0.35);
  shadow.position.set(0, 0.01, 2);
  group.add(shadow);

  let fanSpin = 0;
  const view: VehicleView = {
    group,
    nozzles,
    feet: [new THREE.Vector3(-0.8, 0, 1.0), new THREE.Vector3(0.8, 0, 1.0)],
    update(v, t, dt, power, speedN) {
      fanSpin += dt * (6 + 30 * speedN);
      for (const f of fans) f.rotation.z = fanSpin;
      const bob = Math.sin(t * 2.1) * 0.05 + Math.sin(t * 3.7) * 0.02;
      body.position.y = v.air ? 0 : bob;
      body.rotation.z = -v.roll * 0.4;
      const len = 1.2 + 3.2 * speedN + 2.2 * Math.max(0, power - 1);
      for (const m of fires) {
        m.uniforms.uTime.value = t;
        m.uniforms.uPower.value = 0.45 + 0.55 * Math.min(power, 2);
      }
      for (const pod of body.children) {
        for (const c of pod.children) {
          if (c instanceof THREE.Mesh && c.userData.lenK) {
            (c.material as THREE.ShaderMaterial).uniforms.uLenK.value = len * c.userData.lenK;
          }
        }
      }
      for (const g of glows) {
        const s = 1 + 0.6 * Math.min(power, 2);
        g.scale.set(s, s, 1);
      }
      // The ground glow and shadow keep to the ground: the vehicle's group sits at its body's height.
      const over = Math.max(0, v.airTime > 0 ? 2 : 0);
      pad.material.opacity = 0.25 / (1 + over);
      pad.position.y = 0.02 - (v.air ? 0 : 0.75);
      shadow.position.y = 0.01 - (v.air ? 0 : 0.75);
      shadow.visible = !v.air;
      pad.visible = !v.air;
    },
    setHull(h, e) {
      applyHull(paint, h, e);
    },
    setFire(f) {
      for (const m of fires) {
        (m.uniforms.uS0.value as THREE.Color).setRGB(...f.stops[0]);
        (m.uniforms.uS1.value as THREE.Color).setRGB(...f.stops[1]);
        (m.uniforms.uS2.value as THREE.Color).setRGB(...f.stops[2]);
      }
      for (const g of glows) g.material.color.setRGB(...f.stops[0]);
      pad.material.color.setRGB(...f.stops[1]);
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
        }
      });
    },
  };
  return view;
}

export function buildVehicle(
  kind: 'car' | 'ship',
  hullId: string,
  fire: Fire,
  env: THREE.Texture | null,
): VehicleView {
  const hull = hullById(hullId);
  return kind === 'car' ? buildCar(hull, env) : buildShip(hull, fire, env);
}
