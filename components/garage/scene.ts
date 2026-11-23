/**
 * The Garage's room (docs/specs/garage.md): a dark, polished hangar with a raised circular platform
 * in the middle and your ride on top. Drag turns the platform, up and down tilts the view, the wheel
 * zooms. The ride is the same one Drive builds (components/drive/vehicles.ts), in the same paint.
 *
 * The pad, in the gold-dots-on-dark look of the City and Art: a mirror-dark floor, the platform's
 * rim a ring of light, rings of gold dots round it, short warm beacons round its edge, one soft key
 * light from above and a cool rim light behind.
 *
 * Around it, Mars (2026-11-23: "make garage have the mars context around"): the pad stands on rust
 * regolith under the Drive world's Mars dusk (butterscotch at the horizon, dusty rose, a dark
 * umber overhead, a small white sun in a blue halo, Phobos), low dunes, flat-topped mesas on the
 * horizon, an old lattice mast and a rusted tank. All cheap: a gradient dome, plain meshes, fog the
 * colour of the dust. The ride stays lit by its own key light, the hero.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { buildVehicle, type VehicleView } from '@/components/drive/vehicles';
import { type Design, fireById, hullOf, shipParts } from '@/lib/art/drive-design';
import {
  dragTurn,
  newTurntable,
  stepTurntable,
  TILT,
  type Turntable,
  tiltBy,
  ZOOM,
  zoomBy,
} from '@/lib/art/garage';
import { newVehicle, type VehicleKind } from '@/lib/art/vehicle';

const PLATFORM_R = 4.2;
const PLATFORM_H = 0.42;
const GOLD = new THREE.Color(1.6, 1.05, 0.38);
/** The pad's radius: polished dark metal, then Mars beyond. */
const PAD_R = 12;

/** Mars at dusk, as the Drive world's sky (lib/art/drive-shaders.ts, WORLD 4). */
export const MARS = {
  horizon: new THREE.Color(0.86, 0.6, 0.4),
  rose: new THREE.Color(0.6, 0.38, 0.32),
  umber: new THREE.Color(0.16, 0.1, 0.11),
  /** The fog and the far ground: the dust in the air, a darker butterscotch. */
  dust: 0x8a5a40,
  ground: 0x7a3e22,
  rock: 0x5a2c1a,
  rust: 0x6e3a20,
  /** The sun's direction: low, ahead and to the left of the camera's start. */
  sun: new THREE.Vector3(-0.55, 0.12, -0.83).normalize(),
};

const SKY_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/* The Mars dusk: the horizon warm, dusty rose, a dark umber overhead; the sun small and white in a
   blue halo; Phobos a small grey moon. */
const SKY_FRAGMENT = `
uniform vec3 uHorizon;
uniform vec3 uRose;
uniform vec3 uUmber;
uniform vec3 uSun;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uRose, smoothstep(0.0, 0.22, y));
  c = mix(c, uUmber, smoothstep(0.2, 0.7, y));
  float s = distance(d, uSun);
  c += vec3(0.5, 0.68, 1.0) * exp(-s * 9.0) * 0.75;
  c += vec3(0.95, 0.97, 1.0) * (1.0 - smoothstep(0.018, 0.022, s)) * 1.6;
  vec3 ph = normalize(vec3(0.62, 0.3, -0.72));
  c = mix(c, vec3(0.62, 0.58, 0.55), (1.0 - smoothstep(0.009, 0.011, distance(d, ph))) * 0.9);
  // Below the horizon, the dust.
  c = mix(c, uHorizon * 0.62, smoothstep(0.0, -0.08, d.y));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/** A small deterministic random, so Mars is the same every visit. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export class GarageScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  private composer: EffectComposer;
  private env: THREE.Texture;
  private turntable: Turntable = newTurntable();
  private pivot = new THREE.Group();
  private view: VehicleView | null = null;
  private design: Design;
  /** The vehicle on the platform (the Garage page shows the salt's; Drive's menu, the track's). */
  private kind: VehicleKind;
  private tilt = TILT.start;
  private dist = ZOOM.start;
  private raf = 0;
  private last = 0;
  private dragAt: { x: number; y: number; t: number } | null = null;
  /** Holding Rev: the flames and the fire at full, as at top speed. */
  private rev = 0;
  private revving = false;
  private dots: THREE.Points;

  constructor(canvas: HTMLCanvasElement, design: Design, kind: VehicleKind = design.vehicle.salt) {
    this.design = design;
    this.kind = kind;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.9;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.4;
    this.scene.background = new THREE.Color(MARS.dust);
    this.scene.fog = new THREE.Fog(MARS.dust, 30, 140);

    this.buildRoom();
    this.buildMars();
    this.dots = this.floorDots();
    this.scene.add(this.dots);
    this.scene.add(this.pivot);
    this.pivot.position.y = PLATFORM_H;
    this.setRide(design, kind);

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.4, 0.92));
    this.composer.addPass(new OutputPass());
  }

  private buildRoom() {
    // The pad: near-black and polished, so the lights lie in it.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(PAD_R, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0b0b0e,
        metalness: 0.6,
        roughness: 0.4,
        // Only a faint sheen of the room: the beacons and the rim are what lie in it.
        envMapIntensity: 0.08,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(PAD_R, PAD_R + 0.08, 128),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.45, 0.18), toneMapped: false }),
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.025;
    this.scene.add(edge);

    // The platform: a dark metal drum, its top a shade lighter, its rim a ring of gold light.
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATFORM_R, PLATFORM_R + 0.15, PLATFORM_H, 96),
      new THREE.MeshStandardMaterial({ color: 0x15151a, metalness: 0.85, roughness: 0.3 }),
    );
    drum.position.y = PLATFORM_H / 2;
    drum.castShadow = true;
    drum.receiveShadow = true;
    this.scene.add(drum);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(PLATFORM_R - 0.05, 96),
      new THREE.MeshStandardMaterial({ color: 0x1c1c22, metalness: 0.6, roughness: 0.35 }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = PLATFORM_H + 0.002;
    top.receiveShadow = true;
    this.pivot.add(top);
    top.position.y = 0.002;
    // Fine rings on the top, turning with it, so the turn reads.
    for (const rr of [1.4, 2.6, 3.7]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rr, rr + 0.025, 96),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.36, 0.16), toneMapped: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.004;
      this.pivot.add(ring);
    }
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.004, 0.5),
      new THREE.MeshBasicMaterial({ color: GOLD, toneMapped: false }),
    );
    tick.position.set(0, 0.006, -PLATFORM_R + 0.4);
    this.pivot.add(tick);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_R + 0.02, 0.035, 8, 160),
      new THREE.MeshBasicMaterial({ color: GOLD, toneMapped: false }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = PLATFORM_H;
    this.scene.add(rim);
    const foot = new THREE.Mesh(
      new THREE.TorusGeometry(PLATFORM_R + 0.18, 0.02, 8, 160),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.6, 0.22), toneMapped: false }),
    );
    foot.rotation.x = Math.PI / 2;
    foot.position.y = 0.01;
    this.scene.add(foot);

    // Short warm beacons round the pad's edge, a cooler one every fourth.
    const beacons = 16;
    for (let i = 0; i < beacons; i++) {
      const a = (i / beacons) * Math.PI * 2;
      const cool = i % 4 === 0;
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.4, 0.1),
        new THREE.MeshBasicMaterial({
          color: cool ? new THREE.Color(0.35, 0.55, 1.1) : new THREE.Color(0.95, 0.62, 0.3),
          toneMapped: false,
        }),
      );
      post.position.set(Math.cos(a) * (PAD_R + 0.4), 0.7, Math.sin(a) * (PAD_R + 0.4));
      this.scene.add(post);
    }

    // The key light from above, soft shadows; a cool rim from behind; a little fill.
    const key = new THREE.SpotLight(0xfff1dc, 80, 30, 0.5, 0.7, 1.6);
    key.position.set(-3, 12, -2);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    this.scene.add(key, key.target);
    const rimLight = new THREE.DirectionalLight(0x8ab8ff, 0.7);
    // High, so its gleam on the floor falls below the view (lower, it glared blue across it).
    rimLight.position.set(-4, 16, -9);
    this.scene.add(rimLight);
    // The Mars dusk: a low warm sun, the sky's rose from above, the rust thrown back from below.
    const sun = new THREE.DirectionalLight(0xffc08a, 0.9);
    sun.position.copy(MARS.sun).multiplyScalar(60);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x9a6450, 0x2a140c, 0.55));
  }

  /** Mars round the pad: the sky, the regolith, dunes, mesas on the horizon, rusty relics. */
  private buildMars() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 16),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: {
          uHorizon: { value: MARS.horizon },
          uRose: { value: MARS.rose },
          uUmber: { value: MARS.umber },
          uSun: { value: MARS.sun },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    sky.name = 'mars-sky';
    sky.renderOrder = -1;
    this.scene.add(sky);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(190, 64),
      new THREE.MeshStandardMaterial({ color: MARS.ground, roughness: 0.95, metalness: 0 }),
    );
    ground.name = 'mars-ground';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const rnd = rand(19);
    const rock = new THREE.MeshStandardMaterial({
      color: MARS.rock,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    const sand = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 1, metalness: 0 });
    // Low dunes, not too near.
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 28 + rnd() * 26;
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), sand);
      dune.scale.set(6 + rnd() * 8, 0.8 + rnd() * 1.4, 3 + rnd() * 4);
      dune.position.set(Math.cos(a) * r, -0.2, Math.sin(a) * r);
      dune.rotation.y = rnd() * Math.PI;
      this.scene.add(dune);
    }
    // Mesas on the horizon: flat tops, steep sides, in a broken ring.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rnd() * 0.4;
      const r = 80 + rnd() * 50;
      const top = 4 + rnd() * 10;
      const h = 6 + rnd() * 12;
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(top, top * 1.5, h, 7), rock);
      mesa.name = 'mars-mesa';
      mesa.position.set(Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r);
      mesa.scale.z = 0.6 + rnd() * 0.6;
      mesa.rotation.y = rnd() * Math.PI;
      this.scene.add(mesa);
    }

    // Rusty relics: an old lattice mast and a half-sunk tank.
    const rust = new THREE.MeshStandardMaterial({
      color: MARS.rust,
      roughness: 0.85,
      metalness: 0.5,
    });
    const mast = new THREE.Group();
    mast.name = 'mars-mast';
    const H = 11;
    for (const [x, z] of [
      [-0.6, -0.6],
      [0.6, -0.6],
      [0.6, 0.6],
      [-0.6, 0.6],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 0.12), rust);
      leg.position.set(x, H / 2, z);
      mast.add(leg);
    }
    for (let k = 1; k < 7; k++) {
      for (const [w, d, x, z] of [
        [1.3, 0.08, 0, -0.6],
        [1.3, 0.08, 0, 0.6],
        [0.08, 1.3, -0.6, 0],
        [0.08, 1.3, 0.6, 0],
      ]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), rust);
        brace.position.set(x, k * (H / 7), z);
        mast.add(brace);
      }
    }
    // A warm lamp on top, steady.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.5, 0.2), toneMapped: false }),
    );
    lamp.position.y = H + 0.2;
    mast.add(lamp);
    mast.position.set(-19, 0, -16);
    mast.rotation.z = 0.04;
    this.scene.add(mast);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 7, 20), rust);
    tank.name = 'mars-tank';
    tank.rotation.set(0, 0.6, Math.PI / 2, 'YXZ');
    tank.position.set(21, 1.2, -20);
    this.scene.add(tank);
  }

  /** Rings of gold dots on the floor round the platform, softly breathing. */
  private floorDots(): THREE.Points {
    const pos: number[] = [];
    for (const [rr, n] of [
      [5.2, 120],
      [6.4, 150],
      [8.2, 190],
      [11, 240],
    ] as const)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pos.push(Math.cos(a) * rr, 0.03, Math.sin(a) * rr);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: GOLD,
      size: 0.09,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return new THREE.Points(geo, mat);
  }

  /** Builds the ride on the platform, centred, from the design (vehicle, hull, fire). */
  setRide(design: Design, kind: VehicleKind = design.vehicle.salt) {
    this.design = design;
    this.kind = kind;
    if (this.view) {
      this.pivot.remove(this.view.group);
      this.view.dispose();
    }
    const view = buildVehicle(
      kind,
      hullOf(design),
      fireById(design.fire),
      this.env,
      design.body,
      shipParts(design),
    );
    view.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    // Centre it on the platform (its own frame has the tail at z = 0, x across, y up).
    const box = new THREE.Box3().setFromObject(view.group);
    const c = box.getCenter(new THREE.Vector3());
    view.group.position.set(-c.x, kind === 'ship' ? 0.55 : 0, -c.z);
    this.pivot.add(view.group);
    this.view = view;
  }

  setRev(on: boolean) {
    this.revving = on;
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    // Narrow screens step back so the whole ride fits.
    this.camera.fov = this.camera.aspect < 1 ? 50 : 36;
    this.camera.updateProjectionMatrix();
  }

  pointerDown(x: number, y: number) {
    this.dragAt = { x, y, t: performance.now() };
    this.turntable = { ...this.turntable, held: true };
  }

  pointerMove(x: number, y: number) {
    if (!this.dragAt) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - this.dragAt.t) / 1000);
    this.turntable = dragTurn(this.turntable, x - this.dragAt.x, dt);
    this.tilt = tiltBy(this.tilt, y - this.dragAt.y);
    this.dragAt = { x, y, t: now };
  }

  pointerUp() {
    if (!this.dragAt) return;
    // A drag that had stopped before letting go is not a fling.
    const still = performance.now() - this.dragAt.t > 120;
    this.turntable = {
      ...this.turntable,
      held: false,
      speed: still ? 0 : this.turntable.speed,
    };
    this.dragAt = null;
  }

  wheel(dy: number) {
    this.dist = zoomBy(this.dist, dy);
  }

  start() {
    const loop = (ms: number) => {
      this.raf = requestAnimationFrame(loop);
      const t = ms / 1000;
      const dt = Math.min(0.05, this.last ? t - this.last : 0);
      this.last = t;
      this.frame(t, dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private frame(t: number, dt: number) {
    this.turntable = stepTurntable(this.turntable, dt);
    this.pivot.rotation.y = this.turntable.angle;
    this.rev += ((this.revving ? 1 : 0) - this.rev) * Math.min(1, dt * (this.revving ? 5 : 3));
    if (this.view) {
      const v = newVehicle(this.kind, 0, 0, 0);
      const flame = this.design.flames ? this.rev : 0;
      this.view.update(v, t, dt, 0.6 + 0.9 * this.rev, 0.15 + 0.85 * this.rev, flame);
    }
    (this.dots.material as THREE.PointsMaterial).opacity = 0.65 + 0.25 * Math.sin(t * 1.3);
    const target = new THREE.Vector3(0, 1.0, 0);
    this.camera.position.set(
      0,
      target.y + Math.sin(this.tilt) * this.dist,
      Math.cos(this.tilt) * this.dist,
    );
    this.camera.lookAt(target);
    this.composer.render(dt);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.view?.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    this.env.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
