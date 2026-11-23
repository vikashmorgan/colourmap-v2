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

import { buildBody } from '@/components/drive/bodies';
import type { BodyId, Fire, Hull, ShipParts } from '@/lib/art/drive-design';
import { FIRE_FRAGMENT, FIRE_VERTEX } from '@/lib/art/drive-shaders';
import { CAR_SCALE } from '@/lib/art/salt-flat-game';
import type { Vehicle } from '@/lib/art/vehicle';

export interface VehicleView {
  group: THREE.Group;
  /** Where the fire leaves (vehicle-local) for the trails, and the wheels or pads for the dust. */
  nozzles: THREE.Vector3[];
  feet: THREE.Vector3[];
  /** flame: 0..1, the speed flames (lib/art/drive.ts speedFlame), 0 when they are off. */
  update(v: Vehicle, t: number, dt: number, power: number, speedN: number, flame?: number): void;
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

let leopardMap: THREE.Texture | null = null;

/** A leopard's coat: tawny, paler in places, printed with broken rosettes and small spots. */
function leopardTexture(): THREE.Texture | null {
  if (leopardMap) return leopardMap;
  if (typeof document === 'undefined') return null;
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null;
  const N = 512;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#c8923f';
  g.fillRect(0, 0, N, N);
  let s = 11;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  // Soft paler and deeper patches in the coat.
  for (let i = 0; i < 40; i++) {
    const r = 30 + rnd() * 70;
    g.fillStyle = rnd() < 0.5 ? 'rgba(232,190,110,0.18)' : 'rgba(150,95,35,0.15)';
    g.beginPath();
    g.ellipse(rnd() * N, rnd() * N, r, r * 0.7, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // Drawn three times over (wrapped), so the coat repeats without a seam.
  const both = (draw: (x: number, y: number) => void, x: number, y: number) => {
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) draw(x + dx, y + dy);
  };
  // Rosettes: a darker centre, a ring broken into three to five black-brown arcs.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 11 + rnd() * 9;
    const sq = 0.75 + rnd() * 0.35;
    const rot = rnd() * Math.PI;
    const arcs = 3 + Math.floor(rnd() * 3);
    const gaps = Array.from({ length: arcs }, () => 0.25 + rnd() * 0.35);
    const start = rnd() * Math.PI * 2;
    both(
      (cx, cy) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.scale(1, sq);
        g.fillStyle = 'rgba(160,98,34,0.85)';
        g.beginPath();
        g.ellipse(0, 0, r * 0.75, r * 0.75, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(28,16,8,0.92)';
        g.lineCap = 'round';
        let a = start;
        for (let k = 0; k < arcs; k++) {
          const len = (Math.PI * 2) / arcs - gaps[k];
          g.lineWidth = r * (0.32 + 0.12 * Math.sin(k * 2.3 + i));
          g.beginPath();
          g.arc(0, 0, r, a, a + len);
          g.stroke();
          a += len + gaps[k];
        }
        g.restore();
      },
      x,
      y,
    );
  }
  // Small solid spots between the rosettes.
  for (let i = 0; i < 160; i++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 2 + rnd() * 4;
    const ry = r * (0.6 + rnd() * 0.5);
    const rot = rnd() * 3;
    both(
      (cx, cy) => {
        g.fillStyle = 'rgba(28,16,8,0.88)';
        g.beginPath();
        g.ellipse(cx, cy, r, ry, rot, 0, Math.PI * 2);
        g.fill();
      },
      x,
      y,
    );
  }
  leopardMap = new THREE.CanvasTexture(c);
  leopardMap.wrapS = THREE.RepeatWrapping;
  leopardMap.wrapT = THREE.RepeatWrapping;
  leopardMap.colorSpace = THREE.SRGBColorSpace;
  leopardMap.anisotropy = 4;
  return leopardMap;
}

let tarnishMap: THREE.Texture | null = null;

/**
 * Old chrome's tarnish (2026-11-23): a warm silver clouded with soft brown-grey haze, darker
 * blooms where it has oxidised, fine pitting, and faint polish streaks still catching the light.
 * Kept light overall, so the metal still mirrors the world.
 */
function tarnishTexture(): THREE.Texture | null {
  if (tarnishMap) return tarnishMap;
  if (typeof document === 'undefined') return null;
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null;
  const N = 256;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#d8ccb4';
  g.fillRect(0, 0, N, N);
  let s = 23;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const wrap = (draw: (x: number, y: number) => void, x: number, y: number) => {
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) draw(x + dx, y + dy);
  };
  // Broad haze: soft warm-grey clouds.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 18 + rnd() * 50;
    const warm = rnd() < 0.6;
    const a = 0.05 + rnd() * 0.09;
    wrap(
      (cx, cy) => {
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, warm ? `rgba(150,118,80,${a})` : `rgba(110,106,100,${a})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
      },
      x,
      y,
    );
  }
  // Oxide blooms: small darker brown stains.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * N;
    const y = rnd() * N;
    const r = 1.5 + rnd() * 6;
    const rot = rnd() * 3;
    wrap(
      (cx, cy) => {
        g.fillStyle = `rgba(96,72,48,${0.12 + rnd() * 0.18})`;
        g.beginPath();
        g.ellipse(cx, cy, r, r * (0.5 + rnd() * 0.5), rot, 0, Math.PI * 2);
        g.fill();
      },
      x,
      y,
    );
  }
  // Fine pitting.
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(70,60,50,${0.18 + rnd() * 0.25})`;
    g.fillRect(rnd() * N, rnd() * N, 1, 1);
  }
  // Polish streaks, pale and long.
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(250,244,232,${0.06 + rnd() * 0.08})`;
    g.fillRect(0, rnd() * N, N, 0.6 + rnd() * 1.4);
  }
  tarnishMap = new THREE.CanvasTexture(c);
  tarnishMap.wrapS = THREE.RepeatWrapping;
  tarnishMap.wrapT = THREE.RepeatWrapping;
  tarnishMap.colorSpace = THREE.SRGBColorSpace;
  return tarnishMap;
}

/** The rims' and trim's own metal for a hull, or the vehicle's usual colour (fallback). */
export function rimMaterial(
  h: Hull,
  fallback: { color: number; metalness: number; roughness: number },
  env: THREE.Texture | null,
): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ envMap: env });
  applyRim(m, h, fallback);
  return m;
}

export function applyRim(
  m: THREE.MeshStandardMaterial,
  h: Hull,
  fallback: { color: number; metalness: number; roughness: number },
) {
  if (h.rim) {
    m.color.set(h.rim);
    m.metalness = 1;
    m.roughness = 0.16;
  } else {
    m.color.set(fallback.color);
    m.metalness = fallback.metalness;
    m.roughness = fallback.roughness;
  }
  m.needsUpdate = true;
}

export function hullMaterial(h: Hull, env: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(h.colour),
    metalness: h.metalness,
    roughness: h.roughness,
    clearcoat: h.clearcoat,
    clearcoatRoughness: 0.08,
    envMap: env,
    // New chrome mirrors the most; old chrome a little less, its haze softening the reflection.
    envMapIntensity: h.id === 'chrome' ? 1.4 : h.id === 'oldChrome' ? 1.15 : 0.8,
  });
  if (h.pattern === 'tarnish') {
    const map = tarnishTexture();
    if (map) {
      m.map = map;
      m.color.set('#f2ead8');
    }
    // A thin, rubbed sheen over the haze, as polished old metal has.
    m.sheen = 0.25;
    m.sheenRoughness = 0.6;
    m.sheenColor.set('#d9c7a2');
  }
  if (h.patina > 0) {
    const map = rustTexture();
    if (map) {
      m.map = map;
      m.color.set('#ffffff');
    }
  }
  if (h.pattern === 'leopard') {
    const map = leopardTexture();
    if (map) {
      m.map = map;
      m.color.set('#ffffff');
    }
  }
  return m;
}

export function applyHull(target: THREE.MeshPhysicalMaterial, h: Hull, env: THREE.Texture | null) {
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
export function groundBlob(
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
export function buildCar(hull: Hull, env: THREE.Texture | null, fire?: Fire): VehicleView {
  const k = CAR_SCALE;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6, metalness: 0.2 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
  // The wheels' faces: tyre-black, or the hull's own rim metal (the leopard's gold).
  const RIM_OFF = { color: 0x0a0a0a, metalness: 0, roughness: 0.9 };
  const rim = rimMaterial(hull, RIM_OFF, env);
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

  // Speed flames out of the two exhausts (2026-11-19: "flames come out when you are at high speed"):
  // a long outer flame and a hot core each, hidden until the speed calls for them.
  const exFlames: THREE.Mesh[] = [];
  const exFire = fire ?? null;
  if (exFire)
    for (const x of [-0.2, 0.2])
      for (const [rad, lenK, seed] of [
        [0.07, 1, x * 7],
        [0.035, 0.55, x * 13],
      ] as const) {
        const mat = fireMaterial(exFire, seed);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(rad * k, 1, 16, 4, true), mat);
        flame.userData.lenK = lenK;
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(x * k, 0.36 * k, -0.1);
        flame.renderOrder = 6;
        flame.visible = false;
        body.add(flame);
        exFlames.push(flame);
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
    const w = new THREE.Mesh(wheelGeo, [tyre, rim, rim]);
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
    update(v, t, dt, _power, _speedN, flame = 0) {
      spin += (v.vLong / (0.34 * k)) * dt;
      for (const f of exFlames) {
        f.visible = flame > 0.02;
        if (!f.visible) continue;
        const m = f.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = t;
        m.uniforms.uPower.value = 0.5 + 0.9 * flame;
        m.uniforms.uLenK.value = (0.4 + 2.4 * flame) * f.userData.lenK;
      }
      for (const w of wheels) w.rotation.x = spin;
      body.rotation.z = -v.roll * 0.6;
      shadow.visible = !v.air || v.airTime < 0.05;
      pool.visible = shadow.visible;
    },
    setHull(h, e) {
      applyHull(paint, h, e);
      applyRim(rim, h, RIM_OFF);
    },
    setFire(f) {
      for (const fl of exFlames) {
        const u = (fl.material as THREE.ShaderMaterial).uniforms;
        u.uS0.value.setRGB(...f.stops[0]);
        u.uS1.value.setRGB(...f.stops[1]);
        u.uS2.value.setRGB(...f.stops[2]);
      }
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

/* ── The hover ship ────────────────────────────────────────── */

export function fireMaterial(f: Fire, seed: number): THREE.ShaderMaterial {
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

/** Where the reactors sit (ship frame), and their size. */
export function reactorLayout(
  r: ShipParts['reactors'],
): { x: number; y: number; z: number; s: number }[] {
  if (r === 'top') return [{ x: 0, y: 1.45, z: 0.9, s: 1.25 }];
  if (r === 'quad')
    return [
      { x: -1.3, y: 0.45, z: 1.7, s: 0.72 },
      { x: 1.3, y: 0.45, z: 1.7, s: 0.72 },
      { x: -0.8, y: 1.2, z: 1.0, s: 0.66 },
      { x: 0.8, y: 1.2, z: 1.0, s: 0.66 },
    ];
  return [
    { x: -1.45, y: 0.55, z: 1.6, s: 1 },
    { x: 1.45, y: 0.55, z: 1.6, s: 1 },
  ];
}

export function buildShip(
  hull: Hull,
  fire: Fire,
  env: THREE.Texture | null,
  parts: ShipParts = { reactors: 'side', bubble: 'dome', core: 'none' },
): VehicleView {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.45, metalness: 0.7 });
  // The trim (the turbines' ribs, lips, hubs and blades): dark metal, or the hull's rim metal.
  const TRIM_OFF = { color: 0x23232c, metalness: 0.9, roughness: 0.3 };
  const trim = rimMaterial(hull, TRIM_OFF, env);

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

  // The cockpit: clear glass over the pilot, in one of four shapes.
  const pilotAt = (x: number, y: number, z: number) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.12), dark);
    seat.position.set(x, y - 0.03, z - 0.17);
    seat.rotation.x = -0.25;
    body.add(seat);
    const pilot = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.25, 4, 10), dark);
    pilot.position.set(x, y, z);
    body.add(pilot);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), trim);
    head.position.set(x, y + 0.24, z + 0.02);
    body.add(head);
  };
  const glassDome = (r: number, scale: [number, number, number], at: [number, number, number]) => {
    const g = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      glassMat(env),
    );
    g.scale.set(...scale);
    g.position.set(...at);
    g.renderOrder = 5;
    body.add(g);
  };
  if (parts.bubble === 'racer') {
    // A long low canopy, drawn back like a racer's.
    glassDome(0.62, [0.78, 0.62, 2.4], [0, 0.6, 2.3]);
    pilotAt(0, 0.82, 2.0);
  } else if (parts.bubble === 'twin') {
    // Two small bubbles side by side.
    for (const x of [-0.4, 0.4]) {
      glassDome(0.4, [1, 0.95, 1.2], [x, 0.62, 1.95]);
      pilotAt(x, 0.82, 1.8);
    }
  } else if (parts.bubble === 'visor') {
    // A low, wide wraparound band of glass at the front.
    glassDome(0.62, [1.45, 0.45, 1.1], [0, 0.66, 2.75]);
    pilotAt(0, 0.78, 2.45);
  } else {
    glassDome(0.62, [1, 0.85, 1.2], [0, 0.62, 1.9]);
    pilotAt(0, 0.88, 1.72);
  }

  // The core: a light that shows the ship's power, in the fire's colour (so it always matches).
  const coreColour = () => new THREE.Color(...fire.stops[1]).multiplyScalar(2.2);
  const coreMats: THREE.MeshBasicMaterial[] = [];
  const coreSprites: THREE.Sprite[] = [];
  let crystal: THREE.Mesh | null = null;
  if (parts.core === 'ring') {
    // A ring of light round the hull's waist.
    const m = new THREE.MeshBasicMaterial({ color: coreColour(), toneMapped: false });
    coreMats.push(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 96), m);
    ring.scale.set(1.07, 2.33, 1);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.47, 2.0);
    body.add(ring);
  } else if (parts.core === 'orb' || parts.core === 'crystal') {
    // Behind the cockpit, raised on the hull's back.
    const at = new THREE.Vector3(0, 0.95, parts.bubble === 'racer' ? 0.55 : 0.75);
    const m = new THREE.MeshBasicMaterial({ color: coreColour(), toneMapped: false });
    coreMats.push(m);
    const cradle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.22, 20), trim);
    cradle.position.set(at.x, at.y - 0.3, at.z);
    body.add(cradle);
    if (parts.core === 'orb') {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), m);
      orb.position.copy(at);
      body.add(orb);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), glassMat(env));
      shell.position.copy(at);
      body.add(shell);
    } else {
      crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), m);
      crystal.scale.set(0.8, 1.3, 0.8);
      crystal.position.set(at.x, at.y + 0.05, at.z);
      body.add(crystal);
    }
    const glow = glowSprite(new THREE.Color(...fire.stops[1]), 1.3, 0.7);
    glow.position.copy(at);
    body.add(glow);
    coreSprites.push(glow);
  }

  // The two turbine boosters.
  const fans: THREE.Group[] = [];
  const fires: THREE.ShaderMaterial[] = [];
  const glows: THREE.Sprite[] = [];
  const nozzles: THREE.Vector3[] = [];
  const layout = reactorLayout(parts.reactors);
  for (const [k, pl] of layout.entries()) {
    const side = Math.sign(pl.x) || 1;
    const pod = new THREE.Group();
    pod.position.set(pl.x, pl.y, pl.z);
    pod.scale.setScalar(pl.s);
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
    // A strut from the pod to the hull, however the pod sits.
    const dx = ((pl.x === 0 ? 0 : side * 0.55) - pl.x) / pl.s;
    const dy = (0.55 - pl.y) / pl.s;
    const reach = Math.hypot(dx, dy);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(reach, 0.08, 0.9), paint);
    strut.position.set(dx / 2, dy / 2, 0.2);
    strut.rotation.z = Math.atan2(dy, dx);
    pod.add(strut);
    // The fire: a long outer flame and a short hot core, pointing back.
    for (const [rad, lenK, seed] of [
      [0.3, 1, side * 1.3 + k],
      [0.16, 0.55, side * 2.7 + k],
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
    if (nozzles.length < 2) nozzles.push(new THREE.Vector3(pl.x, pl.y, pl.z - 1.8 * pl.s));
  }
  // The engine draws two trails: one reactor gives both, a little apart.
  if (nozzles.length === 1) {
    const n = nozzles[0];
    nozzles.splice(0, 1, n.clone().setX(n.x - 0.3), n.clone().setX(n.x + 0.3));
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
    update(v, t, dt, power, speedN, flame = 0) {
      fanSpin += dt * (6 + 30 * speedN);
      for (const f of fans) f.rotation.z = fanSpin;
      const bob = Math.sin(t * 2.1) * 0.05 + Math.sin(t * 3.7) * 0.02;
      body.position.y = v.air ? 0 : bob;
      body.rotation.z = -v.roll * 0.4;
      // The speed flames stretch the fire out long and hot.
      const len = 1.2 + 3.2 * speedN + 2.2 * Math.max(0, power - 1) + 5 * flame;
      for (const m of fires) {
        m.uniforms.uTime.value = t;
        m.uniforms.uPower.value = 0.45 + 0.55 * Math.min(power + flame, 2);
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
      if (crystal) crystal.rotation.y = t * 1.2;
      for (const g of coreSprites) {
        const s = 1.1 + 0.25 * Math.sin(t * 3) + 0.5 * speedN;
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
      applyRim(trim, h, TRIM_OFF);
    },
    setFire(f) {
      for (const m of fires) {
        (m.uniforms.uS0.value as THREE.Color).setRGB(...f.stops[0]);
        (m.uniforms.uS1.value as THREE.Color).setRGB(...f.stops[1]);
        (m.uniforms.uS2.value as THREE.Color).setRGB(...f.stops[2]);
      }
      for (const g of glows) g.material.color.setRGB(...f.stops[0]);
      pad.material.color.setRGB(...f.stops[1]);
      for (const m of coreMats) m.color.setRGB(...f.stops[1]).multiplyScalar(2.2);
      for (const g of coreSprites) g.material.color.setRGB(...f.stops[1]);
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
  hull: Hull,
  fire: Fire,
  env: THREE.Texture | null,
  body: BodyId = 'wedge',
  parts?: ShipParts,
): VehicleView {
  if (kind === 'car' && body !== 'wedge') return buildBody(body, hull, fire, env);
  if (kind === 'ship') return buildShip(hull, fire, env, parts);
  return kind === 'car' ? buildCar(hull, env, fire) : buildShip(hull, fire, env);
}
