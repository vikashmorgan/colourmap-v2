/**
 * The Garage's room (docs/specs/garage.md): a dark, polished hangar with a raised circular platform
 * in the middle and your ride on top. Drag turns the platform, up and down tilts the view, the wheel
 * zooms. The ride is the same one Drive builds (components/drive/vehicles.ts), in the same paint.
 *
 * The room, in the gold-dots-on-dark look of the City and Art: a mirror-dark floor, the platform's
 * rim a ring of light, rings of gold dots on the floor round it, tall strips of warm light round
 * the walls, one soft key light from above and a cool rim light behind.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { buildVehicle, type VehicleView } from '@/components/drive/vehicles';
import { type Design, fireById, hullOf } from '@/lib/art/drive-design';
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
import { newVehicle } from '@/lib/art/vehicle';

const PLATFORM_R = 4.2;
const PLATFORM_H = 0.42;
const GOLD = new THREE.Color(1.6, 1.05, 0.38);

export class GarageScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  private composer: EffectComposer;
  private env: THREE.Texture;
  private turntable: Turntable = newTurntable();
  private pivot = new THREE.Group();
  private view: VehicleView | null = null;
  private design: Design;
  private tilt = TILT.start;
  private dist = ZOOM.start;
  private raf = 0;
  private last = 0;
  private dragAt: { x: number; y: number; t: number } | null = null;
  /** Holding Rev: the flames and the fire at full, as at top speed. */
  private rev = 0;
  private revving = false;
  private dots: THREE.Points;

  constructor(canvas: HTMLCanvasElement, design: Design) {
    this.design = design;
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
    this.scene.background = new THREE.Color(0x050507);
    this.scene.fog = new THREE.Fog(0x050507, 18, 46);

    this.buildRoom();
    this.dots = this.floorDots();
    this.scene.add(this.dots);
    this.scene.add(this.pivot);
    this.pivot.position.y = PLATFORM_H;
    this.setRide(design);

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.4, 0.92));
    this.composer.addPass(new OutputPass());
  }

  private buildRoom() {
    // The floor: near-black and polished, so the lights lie in it.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(40, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0b0b0e,
        metalness: 0.6,
        roughness: 0.4,
        // Only a faint sheen of the room: the strips and the rim are what lie in it.
        envMapIntensity: 0.08,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

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

    // The walls: tall strips of warm light in a ring, a cooler one every fourth.
    const strips = 28;
    for (let i = 0; i < strips; i++) {
      const a = (i / strips) * Math.PI * 2;
      const cool = i % 4 === 0;
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 7, 0.12),
        new THREE.MeshBasicMaterial({
          color: cool ? new THREE.Color(0.35, 0.55, 1.1) : new THREE.Color(0.95, 0.62, 0.3),
          toneMapped: false,
        }),
      );
      strip.position.set(Math.cos(a) * 22, 4.2, Math.sin(a) * 22);
      this.scene.add(strip);
    }
    // A halo ring overhead.
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.05, 8, 160),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.75, 0.32), toneMapped: false }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 9;
    this.scene.add(halo);

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
    this.scene.add(new THREE.HemisphereLight(0x3a3040, 0x050507, 0.6));
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
  setRide(design: Design) {
    this.design = design;
    if (this.view) {
      this.pivot.remove(this.view.group);
      this.view.dispose();
    }
    const kind = design.vehicle.salt;
    const view = buildVehicle(kind, hullOf(design), fireById(design.fire), this.env);
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
      const v = newVehicle(this.design.vehicle.salt, 0, 0, 0);
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
