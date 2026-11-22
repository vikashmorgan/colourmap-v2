/**
 * Drive's engine (docs/specs/drive-game.md): the renderer, the loop, and the game's state from one
 * frame to the next. The physics, the tracks, the weather and the design are pure modules in
 * lib/art/; this file only runs them and draws.
 *
 * Every frame: the controls move the vehicle (lib/art/vehicle.ts) over the world's ground; the race
 * clock looks at the gates; the chase camera follows with a little lag, its view widening and
 * shaking softly with speed; then the backdrop (sky, ranges, the endless plane), the world's meshes,
 * the vehicle, its trails and dust, and the oncoming motes are drawn, with the builder's bloom.
 *
 * The camera's projection is the Speed pieces' own (focal length in view heights, the horizon a
 * little above the middle on the Salt Flat), so the backdrop shader and the meshes agree to the
 * pixel. Everything is placed relative to the camera (a floating origin).
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { autopilotControls } from '@/lib/art/autopilot';
import { comboOf, type DriftRun, liveScore, newDriftRun, stepDrift } from '@/lib/art/drift-gates';
import {
  type Controls,
  clamp,
  ease,
  easeAngle,
  formatTime,
  gearOf,
  kmh,
  makeTrail,
  NO_CONTROLS,
  newRun,
  pushTrail,
  type Run,
  speedFeel,
  speedFlame,
  stepRun,
  type Trail,
  trailFade,
  trailIndex,
  wrapAngle,
} from '@/lib/art/drive';
import {
  bestKey,
  type Design,
  fireById,
  hullOf,
  loadBest,
  type Store,
  saveBest,
  shipParts,
  type WorldId,
} from '@/lib/art/drive-design';
import {
  BACKDROP_FLOATS,
  backdropFragment,
  DRIVE_VERTEX,
  MOTE_FLOATS,
  MOTE_FRAGMENT,
  PUFF_FRAGMENT,
  PUFF_VERTEX,
  RIBBON_FRAGMENT,
  RIBBON_VERTEX,
} from '@/lib/art/drive-shaders';
import { WORLD_CFG, type WorldCfg } from '@/lib/art/drive-worlds';
import {
  MOODS,
  RING_STEP,
  type RingMood,
  ringAt,
  SURGE_LIFE,
  surgeAccel,
  throughRing,
} from '@/lib/art/night-course';
import {
  type IntroClock,
  type IntroPhase,
  introPhase,
  lightsAt,
  newIntro,
  plainShot,
  racing,
  type Shot,
  trackShot,
} from '@/lib/art/race-intro';
import { type RaceResult, raceResult } from '@/lib/art/race-result';
import { bump, placeOf, RIVALS, type Rival, rivalControls, rivalHull } from '@/lib/art/rivals';
import {
  CAM_H,
  CAR_DIST,
  FINISH_GATE,
  LINE,
  MESAS,
  START,
  START_GATE,
  wrapPeriod,
} from '@/lib/art/salt-flat-game';
import { SPEED_FLOATS } from '@/lib/art/speed-shaders';
import { STAGE_OUT } from '@/lib/art/stage-fire';
import {
  FALLEN,
  frameAt,
  gapAround,
  heightAt,
  makeTrackWorld,
  newRace,
  onBypass,
  pointAt,
  project,
  type Race,
  SKY_LAP,
  SKY_PIPE,
  stepCanyonRace,
  stepKmRace,
  type TrackWorld,
  twistPose,
} from '@/lib/art/track';
import { trackInfo } from '@/lib/art/track-registry';
import {
  FLAT,
  MARS_FLAT,
  newVehicle,
  type StepEvents,
  speedOf,
  stepVehicle,
  VEHICLES,
  type Vehicle,
  type World,
} from '@/lib/art/vehicle';
import {
  gustAt,
  moteAmount,
  newWeather,
  setWeather,
  stepWeather,
  type Weather,
  type WeatherState,
  weatherNow,
} from '@/lib/art/weather';
import {
  choosesStraight,
  newWreck,
  offTwist,
  stepWreck,
  twistEntry,
  type Wreck,
} from '@/lib/art/wreck';
import { buildSaltView, type SaltView } from './salt-view';
import { makeStageFire } from './stage-fire';
import { buildTrackView, disposeGroup, type TrackView } from './track-view';
import { buildVehicle, type VehicleView } from './vehicles';

export interface Hud {
  speed: number;
  /** The automatic box: the gear, and how far through it (the revs, 0..1). */
  gear?: number;
  revs?: number;
  /** The Salt Flat's drift gates: the lap's score (or the last lap's), the best, the combo held. */
  drift: number | null;
  driftBest: number | null;
  combo: number | null;
  /** The clock: the run under way, or the last finished, and the best. */
  time: string | null;
  best: string | null;
  record: boolean;
  running: boolean;
  /** Your place among the racers when the rivals are on (1 = leading), and how many race. */
  place?: number | null;
  racers?: number;
}

export interface EngineOptions {
  world: WorldId;
  design: Design;
  store: Store | null;
  onHud?: (h: Hud) => void;
  /** The race intro's phase and lights as they change; null when it is over (docs/specs/drive-menus.md). */
  onIntro?: (s: IntroState | null) => void;
  /** A course finished (the Canyon): your time, best and everyone's places. */
  onFinish?: (r: RaceResult) => void;
}

export interface IntroState {
  phase: IntroPhase;
  /** Red lights lit (0–3), and whether they have turned to GO. */
  lit: number;
  go: boolean;
}

/** The start gantry's lamps: off, red, and GO in the track's colour. */
const LAMP_OFF = 0x1a0606;
const LAMP_RED = new THREE.Color(3.2, 0.25, 0.12);

/** The Speed pieces' projection: focal length f (view heights), horizon hz, shake (sx, sy). */
export function setProjection(
  cam: THREE.Camera,
  f: number,
  aspect: number,
  hz: number,
  sx: number,
  sy: number,
  near = 0.3,
  far = 9000,
): void {
  const m = cam.projectionMatrix;
  m.set(
    (2 * f) / aspect,
    0,
    (2 * sx) / aspect,
    0,
    0,
    2 * f,
    -2 * (hz - sy),
    0,
    0,
    0,
    -(far + near) / (far - near),
    (-2 * far * near) / (far - near),
    0,
    0,
    -1,
    0,
  );
  cam.projectionMatrixInverse.copy(m).invert();
}

/* ── Trails as ribbons ─────────────────────────────────────── */

class Ribbon {
  trail: Trail;
  mesh: THREE.Mesh;
  pos: Float32Array;
  alpha: Float32Array;
  constructor(
    n: number,
    spacing: number,
    readonly width: number,
    readonly life: number,
    readonly upright: boolean,
    material: THREE.ShaderMaterial,
  ) {
    this.trail = makeTrail(n, spacing);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    this.alpha = new Float32Array(n * 2);
    const side = new Float32Array(n * 2);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      side[i * 2] = -1;
      side[i * 2 + 1] = 1;
      if (i + 1 < n) {
        const a = i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
  }
  update(ox: number, oy: number, t: number) {
    const tr = this.trail;
    const n = tr.x.length;
    this.alpha.fill(0);
    for (let i = 0; i < tr.count; i++) {
      const k = trailIndex(tr, i);
      const j = trailIndex(tr, Math.min(i + 1, tr.count - 1));
      const h = i === 0 ? k : trailIndex(tr, i - 1);
      // Across the ribbon: square to its run in the plane (flat), or straight up (upright).
      let dx = tr.x[h] - tr.x[j];
      let dy = tr.y[h] - tr.y[j];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const w = this.width / 2;
      const x = tr.x[k] - ox;
      const z = -(tr.y[k] - oy);
      const y = tr.z[k];
      const o = i * 6;
      if (this.upright) {
        this.pos.set([x, y - w, z, x, y + w, z], o);
      } else {
        const px = -dy * w;
        const pz = -dx * w;
        this.pos.set([x - px, y, z - pz, x + px, y, z + pz], o);
      }
      const a = trailFade(t - tr.t[k], this.life) * tr.w[k];
      this.alpha[i * 2] = a;
      this.alpha[i * 2 + 1] = a;
    }
    // Collapse the unused tail onto the last point.
    for (let i = tr.count; i < n; i++) {
      const o = i * 6;
      const last = Math.max(0, tr.count - 1) * 6;
      for (let q = 0; q < 6; q++) this.pos[o + q] = this.pos[last + q];
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }
}

/* ── Dust, spray and puffs ─────────────────────────────────── */

const PUFFS = 700;

class Puffs {
  x = new Float64Array(PUFFS);
  y = new Float64Array(PUFFS);
  z = new Float32Array(PUFFS);
  vx = new Float32Array(PUFFS);
  vy = new Float32Array(PUFFS);
  vz = new Float32Array(PUFFS);
  age = new Float32Array(PUFFS).fill(99);
  life = new Float32Array(PUFFS).fill(1);
  size = new Float32Array(PUFFS);
  next = 0;
  points: THREE.Points;
  pos = new Float32Array(PUFFS * 3);
  sizes = new Float32Array(PUFFS);
  alphas = new Float32Array(PUFFS);
  material: THREE.ShaderMaterial;
  /** Sparks: bright and additive, shrinking and falling, instead of dust that billows. */
  constructor(private spark = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERTEX,
      fragmentShader: PUFF_FRAGMENT,
      uniforms: { uColour: { value: new THREE.Color(1, 1, 1) }, uScale: { value: 600 } },
      transparent: true,
      depthWrite: false,
      blending: spark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
  }
  emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
  ) {
    const i = this.next;
    this.next = (this.next + 1) % PUFFS;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
    this.age[i] = 0;
    this.life[i] = life;
    this.size[i] = size;
  }
  update(dt: number, ox: number, oy: number) {
    const drag = Math.exp(-1.6 * dt);
    for (let i = 0; i < PUFFS; i++) {
      this.age[i] += dt;
      const a = this.age[i];
      if (a >= this.life[i]) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      this.vx[i] *= drag;
      this.vy[i] *= drag;
      this.vz[i] = this.vz[i] * drag - (this.spark ? 9 : 0.4) * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
      const k = a / this.life[i];
      this.pos[i * 3] = this.x[i] - ox;
      this.pos[i * 3 + 1] = this.z[i];
      this.pos[i * 3 + 2] = -(this.y[i] - oy);
      this.sizes[i] = this.size[i] * (this.spark ? 1 - 0.7 * k : 0.6 + 2.2 * k);
      this.alphas[i] = this.spark ? 1 - k * k : 0.32 * (1 - k) * Math.min(1, a * 8);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }
}

/** The night light over the vehicle (candela; close over the hull, falling off before it pools much light on the road). */
export const CAR_LIGHT = 12;

/** A step that moved nothing (the grid, waiting for GO). */
const HELD: StepEvents = { landed: 0, bump: 0, tookOff: false };

/** Lost to a jump's void: back this far before its gap (m), rolling at this speed (m/s), enough
 * run-up to make it with the throttle down. */
export const RETRY_BACK = 450;

/** The walls of light behind the racers: how tall (m), how long they last (s), how bright. */
export const WALL = { HEIGHT: 1.1, LIFE: 2.4, POINTS: 150, SPACING: 1.5, GLOW: 2.2, OPACITY: 0.55 };
export const RETRY_SPEED = 45;

/* ── The sky as an environment, for chrome and glass ───────── */

function skyEnvironment(
  renderer: THREE.WebGLRenderer,
  night: boolean,
  sunAz: number,
): THREE.Texture {
  const W = 128;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
  for (let y = 0; y < H; y++) {
    const el = (0.5 - (y + 0.5) / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const az = ((x + 0.5) / W) * Math.PI * 2 - Math.PI;
      let c: number[];
      if (night) {
        // 2026-11-21 ("car doesnt change colour for hull … stays black"): a metal hull shows only
        // what it mirrors, so the night sky carries a warm glow low along the horizon and a soft
        // warm light overhead, gold and never white ("too white, not connected to the golden warm of
        // the track"); the sky the eye sees stays dark (this is only what the hull reflects).
        c =
          el > 0
            ? mix([0.18, 0.1, 0.22], [0.02, 0.02, 0.05], Math.min(1, el * 3))
            : [0.03, 0.03, 0.05];
        const glow = Math.exp(-Math.abs(el) * 14);
        c = c.map((v, i) => v + glow * [0.85, 0.6, 0.35][i]);
        const top = clamp((el - 1.05) / 0.35, 0, 1);
        c = c.map((v, i) => v + top * [0.42, 0.3, 0.16][i]);
      } else if (el > 0) {
        c = mix([1, 0.72, 0.52], [0.62, 0.5, 0.72], Math.min(1, el * 4));
        c = mix(c, [0.2, 0.22, 0.45], clamp((el - 0.2) * 2, 0, 1));
        const d = Math.hypot(wrapAngle(az - sunAz), el - 0.05);
        const sun = Math.exp(-d * 5) * 0.9;
        c = c.map((v, i) => v + sun * [1, 0.8, 0.55][i]);
      } else {
        c = [0.78, 0.66, 0.62];
      }
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) data[i + k] = Math.round(clamp(c[k], 0, 1) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose();
  tex.dispose();
  return env;
}

/* ── The engine ────────────────────────────────────────────── */

export class DriveEngine {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  /** The Neon District's rings recolour every light (lib/art/night-course.ts MOODS). */
  private moodPass: ShaderPass;
  private mood: RingMood | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private backdrop: THREE.Mesh;
  private backdropU: Record<string, THREE.IUniform>;
  private motes: THREE.Mesh;
  private moteU: Record<string, THREE.IUniform>;
  private sun = new THREE.DirectionalLight(0xffd2a8, 1.4);
  private hemi = new THREE.HemisphereLight(0xb8a4c8, 0x8a7068, 0.9);
  /** At night, a soft light riding over the vehicle so its hull keeps its colour (off by day). */
  private carLight = new THREE.PointLight(0xffc878, 0, 9, 2);
  private env: THREE.Texture | null = null;
  private puffs = new Puffs();
  private sparks = new Puffs(true);
  private ribbonFlat: THREE.ShaderMaterial;
  private ribbonGlow: THREE.ShaderMaterial;
  private ribbons: Ribbon[] = [];
  /** The walls of light behind every racer (2026-11-22: "cars leave colour trail behind them,
   * bikes as well"), by who leaves them ('you', or a rival's name). */
  private walls = new Map<string, { rib: Ribbon; mat: THREE.ShaderMaterial; colour: string }>();

  private cfg: WorldCfg;
  private design: Design;
  private store: Store | null;
  private onHud?: (h: Hud) => void;
  private onIntro?: (s: IntroState | null) => void;
  private onFinish?: (r: RaceResult) => void;
  /** The race intro, while it runs (null: driving). */
  private intro: IntroClock | null = null;
  private lastIntro = '';
  /** The start gantry over the line on every road: two posts, a bar, three lamps. */
  private gantry = new THREE.Group();
  /** The start's stage fire, on the gantry; its clock runs from the click (-1000 before). */
  private stage = makeStageFire();
  private stageNow = -1000;
  private sparkColour = new THREE.Color(2, 1.4, 0.5);
  private lamps: THREE.MeshBasicMaterial[] = [];
  /** The gantry's edges of light, in the track's colour. */
  private gantryGlow = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private worlds = new Map<WorldId, TrackWorld>();
  private physics: World = FLAT;
  private trackWorld: TrackWorld | null = null;
  private view: TrackView | SaltView | null = null;
  private vehicle!: Vehicle;
  private vehicleView: VehicleView | null = null;
  private rivals: { r: Rival; v: Vehicle; s: number; view: VehicleView }[] = [];
  /** The rivals hold the grid until you pull away. */
  private rivalsGo = false;
  private weather: WeatherState;

  private controls: Controls = NO_CONTROLS;
  private t = 0;
  private last: number | null = null;
  private raf = 0;
  private running = false;
  private preview = false;
  private previewYaw = 0;

  private cam = { x: 0, y: 0, z: 1.2, yaw: 0, roll: 0, focal: 1.5 };
  private s = 0;
  private autopilot = false;
  private odometer = 0;
  private run: Run = newRun();
  private drift: DriftRun = newDriftRun();
  private race: Race = newRace();
  private best: number | null = null;
  private surgeAt = -99;
  /** Off a twist and diving into the stars, or null (lib/art/wreck.ts). */
  private wreck: Wreck | null = null;
  /** On a twist's ribbon since its start (for the boost after it), or null. */
  private riding: { end: number } | null = null;
  /** Who is going straight through a twist, and where it ends (2026-11-22). */
  private straight = new Map<Vehicle, number>();
  private hudAt = 0;
  private lastHud = '';
  private size = { w: 1, h: 1 };

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.design = opts.design;
    this.store = opts.store;
    this.onHud = opts.onHud;
    this.onIntro = opts.onIntro;
    this.onFinish = opts.onFinish;
    this.cfg = WORLD_CFG[opts.world];
    this.weather = newWeather(opts.design.weather);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    this.renderer = renderer;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Before the bloom, so the glow takes the new colours too.
    this.moodPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uAmt: { value: 0 },
        uA: { value: new THREE.Vector3(1, 1, 1) },
        uB: { value: new THREE.Vector3(1, 1, 1) },
        uC: { value: new THREE.Vector3(1, 1, 1) },
      },
      vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
      fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmt;
    uniform vec3 uA;
    uniform vec3 uB;
    uniform vec3 uC;
    varying vec2 vUv;
    vec3 along(float f) {
      f = fract(f) * 3.0;
      if (f < 1.0) return mix(uA, uB, f);
      if (f < 2.0) return mix(uB, uC, f - 1.0);
      return mix(uC, uA, f - 2.0);
    }
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      vec3 c = t.rgb;
      float m = max(c.r, max(c.g, c.b));
      float lo = min(c.r, min(c.g, c.b));
      // Only what glows: bright, coloured or white light; the dark road and walls stay as they are.
      float w = smoothstep(0.16, 0.6, m) * uAmt;
      // Each light keeps its place along the mood by its own hue, so the variety stays.
      float h = atan(0.866 * (c.g - c.b), c.r - 0.5 * (c.g + c.b)) / 6.2832 + 0.5;
      h = mix(h, fract(dot(vUv, vec2(3.1, 1.7))), step(m - lo, 0.04));
      vec3 target = along(h) * m;
      gl_FragColor = vec4(mix(c, target, w), t.a);
    }`,
    });
    this.moodPass.enabled = false;
    this.composer.addPass(this.moodPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.144, 0.45, 0.55);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.camera.matrixAutoUpdate = true;

    const quad = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('aPos', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
      g.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
      );
      return g;
    };
    const res = new THREE.Vector2(1, 1);
    const common = (): Record<string, THREE.IUniform> => {
      const u: Record<string, THREE.IUniform> = {
        uRes: { value: res },
        uShake: { value: new THREE.Vector2() },
        uRoadX: { value: new Float32Array(32) },
        uRoadZ: { value: new Float32Array(32) },
        uRoadS: { value: new Float32Array(32) },
        uRoadK: { value: new Float32Array(32) },
        uOrbit: { value: new THREE.Vector4() },
        uTarget: { value: new THREE.Vector4() },
        uFieldBox: { value: new THREE.Vector4() },
      };
      for (const n of SPEED_FLOATS) u[n] = { value: 0 };
      return u;
    };
    this.backdropU = {
      ...common(),
      uRot: { value: new THREE.Matrix3() },
      uCamW: { value: new THREE.Vector2() },
      uMtn: { value: new THREE.Vector2() },
      uLine: { value: new THREE.Vector4() },
      uGateA: { value: new THREE.Vector4() },
      uGateB: { value: new THREE.Vector4() },
      uFogCol: { value: new THREE.Color() },
      uTint: { value: new THREE.Color(1, 1, 1) },
    };
    for (const n of BACKDROP_FLOATS) this.backdropU[n] = { value: 0 };
    this.backdrop = new THREE.Mesh(quad(), this.backdropMaterial());
    this.backdrop.frustumCulled = false;
    this.backdrop.renderOrder = -100;
    this.backdrop.onBeforeRender = (r) => {
      const t = r.getRenderTarget();
      if (t) res.set(t.width, t.height);
      else r.getDrawingBufferSize(res);
    };
    this.scene.add(this.backdrop);

    this.moteU = {
      ...common(),
      uVp: { value: new THREE.Vector2() },
      uMote: { value: new THREE.Color() },
    };
    this.moteU.uRes = this.backdropU.uRes;
    this.moteU.uShake = this.backdropU.uShake;
    for (const n of MOTE_FLOATS) this.moteU[n] = { value: 0 };
    this.motes = new THREE.Mesh(
      quad(),
      new THREE.ShaderMaterial({
        vertexShader: DRIVE_VERTEX,
        fragmentShader: MOTE_FRAGMENT,
        uniforms: this.moteU,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 1000;
    this.scene.add(this.motes);

    this.scene.add(this.sun, this.sun.target, this.hemi, this.carLight);
    this.buildGantry();
    this.scene.add(this.gantry);
    this.scene.add(this.puffs.points);
    this.scene.add(this.sparks.points);
    (this.sparks.material.uniforms.uColour.value as THREE.Color).setRGB(2.4, 1.3, 0.45);
    this.ribbonFlat = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERTEX,
      fragmentShader: RIBBON_FRAGMENT,
      uniforms: {
        uColour: { value: new THREE.Color(0.05, 0.04, 0.04) },
        uOpacity: { value: 0.35 },
      },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.ribbonGlow = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERTEX,
      fragmentShader: RIBBON_FRAGMENT,
      uniforms: { uColour: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.enterWorld(opts.world);
  }

  private backdropMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: DRIVE_VERTEX,
      fragmentShader: backdropFragment(this.cfg.backdrop, MESAS),
      uniforms: this.backdropU,
      depthTest: false,
      depthWrite: false,
    });
  }

  /* ── Worlds and vehicles ── */

  private enterWorld(id: WorldId) {
    this.cfg = WORLD_CFG[id];
    (this.backdrop.material as THREE.Material).dispose();
    this.backdrop.material = this.backdropMaterial();
    if (this.view) {
      this.scene.remove(this.view.group);
      this.view.dispose();
    }
    const night = this.cfg.theme !== null;
    if (this.env) this.env.dispose();
    this.env = skyEnvironment(this.renderer, night, this.cfg.sunAz);
    this.scene.environment = this.env;
    const sunDir = new THREE.Vector3(
      Math.cos(this.cfg.sunAz),
      0.32,
      -Math.sin(this.cfg.sunAz),
    ).normalize();
    if (this.cfg.track) {
      let w = this.worlds.get(id);
      if (!w) {
        w = makeTrackWorld(this.cfg.track);
        this.worlds.set(id, w);
      }
      this.trackWorld = w;
      this.physics = w;
      this.view = buildTrackView(this.cfg, w, sunDir);
    } else {
      this.trackWorld = null;
      this.physics = this.cfg.id === 'mars' ? MARS_FLAT : FLAT;
      this.view = buildSaltView();
    }
    this.scene.add(this.view.group);
    this.sun.position.copy(sunDir).multiplyScalar(100);
    this.sun.target.position.set(0, 0, 0);
    // The Golden Track's moon is warm too: no cold white glint on the hull (2026-11-21).
    const gold = this.cfg.id === 'gold';
    this.sun.color.set(gold ? 0xc89058 : night ? 0x6070a0 : 0xffd2a8);
    const mars = this.cfg.id === 'mars';
    this.hemi.color.set(night ? 0x303050 : mars ? 0xd8a888 : 0xd8c0d0);
    this.hemi.groundColor.set(night ? 0x101018 : mars ? 0x8a4a30 : 0x8a7068);
    this.bloom.strength = night ? 0.55 : 0.144;
    this.bloom.threshold = night ? 0.4 : 0.55;
    this.bloom.radius = night ? 0.5 : 0.448;
    this.scene.fog = new THREE.FogExp2(0x000000, 0);
    this.spawn();
  }

  /** The gantry, built once (1 m wide; scaled to each road). Its frame faces up the road (+x). */
  private buildGantry() {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x17141c,
      metalness: 0.7,
      roughness: 0.4,
    });
    const post = new THREE.BoxGeometry(0.6, 8.4, 0.6);
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(post, metal);
      m.name = side < 0 ? 'post-right' : 'post-left';
      m.position.set(0, 4.2, 0);
      this.gantry.add(m);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 1), metal);
    bar.name = 'bar';
    bar.position.set(0, 8.2, 0);
    this.gantry.add(bar);
    // Lines of light along the bar's top and bottom and up the posts' faces, so it reads at night.
    const strip = new THREE.BoxGeometry(0.12, 0.12, 1);
    for (const y of [7.1, 9.3]) {
      const m = new THREE.Mesh(strip, this.gantryGlow);
      m.name = 'strip';
      m.position.set(-0.5, y, 0);
      this.gantry.add(m);
    }
    const rail = new THREE.BoxGeometry(0.12, 8.4, 0.12);
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(rail, this.gantryGlow);
      m.name = side < 0 ? 'rail-right' : 'rail-left';
      m.position.set(-0.32, 4.2, 0);
      this.gantry.add(m);
    }
    const disc = new THREE.CircleGeometry(0.9, 32);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: LAMP_OFF, toneMapped: false });
      const lamp = new THREE.Mesh(disc, mat);
      // Facing back down the road, toward the grid.
      lamp.rotation.y = -Math.PI / 2;
      lamp.position.set(-0.47, 8.2, (i - 1) * 2.6);
      this.lamps.push(mat);
      this.gantry.add(lamp);
    }
    this.gantry.add(this.stage.points);
    this.gantry.visible = false;
  }

  /** Spans the gantry across this road, just ahead of the grid. */
  private placeGantry() {
    const tw = this.trackWorld;
    this.gantry.visible = !!tw;
    if (!tw) return;
    const half = tw.track.def.half(Math.max(0, this.cfg.startS + 6));
    const w = half + 1.4;
    for (const c of this.gantry.children) {
      if (c.name === 'post-left' || c.name === 'rail-left') c.position.z = -w;
      if (c.name === 'post-right' || c.name === 'rail-right') c.position.z = w;
      if (c.name === 'bar' || c.name === 'strip') c.scale.z = 2 * w;
    }
    this.gantryGlow.color.set(trackInfo(this.cfg.id).colour).multiplyScalar(1.6);
    // Each burner on the road's edge where it stands, in the gantry's frame (the road may curve).
    const gs = this.cfg.startS + 6;
    const g = frameAt(tw.track, gs);
    const ge = heightAt(tw.track, gs, 0);
    this.stage.place(
      this.stage.jets.map((j) => {
        const s = Math.max(0, gs + j.along);
        const p = pointAt(tw.track, s, j.side * (tw.track.def.half(s) + STAGE_OUT));
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        return {
          x: dx * Math.cos(g.h) + dy * Math.sin(g.h),
          y: heightAt(tw.track, s, j.side * tw.track.def.half(s)) - ge,
          z: -(-dx * Math.sin(g.h) + dy * Math.cos(g.h)),
        };
      }),
    );
    this.sparkColour.set(trackInfo(this.cfg.id).colour).multiplyScalar(2.2);
  }

  private spawn() {
    const kind = this.design.vehicle[this.cfg.id];
    if (this.cfg.track && this.trackWorld) {
      const tr = this.trackWorld.track;
      const s = this.cfg.startS;
      const p = pointAt(tr, s, 0);
      tr.hint = s;
      this.s = s;
      this.vehicle = newVehicle(kind, p.x, p.y, frameAt(tr, s).h, heightAt(tr, s, 0));
    } else {
      this.s = 0;
      this.vehicle = newVehicle(kind, START.x, START.y, START.h);
    }
    this.cam.yaw = this.vehicle.h;
    this.cam.x = this.vehicle.x - Math.cos(this.vehicle.h) * CAR_DIST;
    this.cam.y = this.vehicle.y - Math.sin(this.vehicle.h) * CAR_DIST;
    this.cam.z = this.vehicle.z + (this.pieceCamera() ? CAM_H : 2.4);
    this.run = newRun();
    this.race = newRace();
    this.mood = null;
    this.best = loadBest(this.store, bestKey(this.cfg.id, kind));
    this.drift = this.newDrift(kind);
    this.straight.clear();
    this.surgeAt = -99;
    this.wreck = null;
    this.riding = null;
    if (this.vehicleView) this.vehicleView.group.visible = true;
    this.buildVehicleView();
    this.buildRivals();
    this.placeGantry();
    this.lastHud = '';
  }

  /** The five rivals, lined up round your start on a track; none on the open plains. */
  private buildRivals() {
    for (const rv of this.rivals) {
      this.scene.remove(rv.view.group);
      rv.view.dispose();
    }
    this.rivals = [];
    this.rivalsGo = false;
    if (!this.design.rivals || !this.trackWorld) return;
    const tr = this.trackWorld.track;
    const kind = this.vehicle.kind;
    const bodies = ['wedge', 'cycle', 'classic', 'future', 'cycle'] as const;
    this.rivals = RIVALS.map((r, i) => {
      const s = this.s + r.grid.ds;
      const u = r.grid.du * tr.def.half(Math.max(0, s)) * 0.7;
      const p = pointAt(tr, s, u);
      const v = newVehicle(kind, p.x, p.y, frameAt(tr, s).h, heightAt(tr, s, u));
      const view = buildVehicle(
        kind,
        rivalHull(r),
        fireById(r.fire),
        this.env,
        bodies[i],
        shipParts(this.design),
      );
      this.scene.add(view.group);
      return { r, v, s, view };
    });
    tr.hint = this.s;
  }

  /** The rivals drive, and bump into you and each other. */
  private stepRivals(dt: number, t: number) {
    if (!this.trackWorld || this.rivals.length === 0) return;
    const tr = this.trackWorld.track;
    const sky = this.cfg.id === 'sky';
    if (speedOf(this.vehicle) > 2) this.rivalsGo = true;
    for (const rv of this.rivals) {
      if (!this.rivalsGo) break;
      tr.hint = rv.s;
      const ctl = rivalControls(rv.r, rv.v, tr, rv.s, t, rv.s - this.s, sky);
      stepVehicle(rv.v, { ...ctl, mode: this.design.mode }, dt, this.physics, t);
      const q = project(tr, rv.v.x, rv.v.y, rv.s);
      if (rv.v.z < heightAt(tr, Math.max(0, q.s), q.u, true) - FALLEN) {
        // A rival lost to the void comes back just past it, still racing.
        const g = gapAround(tr, q.s);
        rv.s = (g?.to ?? q.s) + 30;
        this.placeOnRoad(rv.v, rv.s, Math.max(30, speedOf(rv.v)));
      } else if (Math.abs(q.u) > 80 || !Number.isFinite(q.s)) {
        const p = pointAt(tr, Math.max(0, rv.s), 0);
        rv.v.x = p.x;
        rv.v.y = p.y;
        rv.v.z = heightAt(tr, Math.max(0, rv.s), 0) + VEHICLES[rv.v.kind].hover;
        rv.v.vx = 0;
        rv.v.vy = 0;
      } else {
        rv.s = q.s;
        this.trackStraight(rv.v, q.s, q.u);
      }
    }
    for (let i = 0; i < this.rivals.length; i++) {
      bump(this.vehicle, this.rivals[i].v);
      for (let j = i + 1; j < this.rivals.length; j++) bump(this.rivals[i].v, this.rivals[j].v);
    }
    tr.hint = this.s;
  }

  /** The Salt Flat's car keeps the piece's own camera: 1.2 m up, level, right behind it. */
  private pieceCamera(): boolean {
    return this.cfg.track === null && this.vehicle?.kind === 'car';
  }

  private buildVehicleView() {
    if (this.vehicleView) {
      this.scene.remove(this.vehicleView.group);
      this.vehicleView.dispose();
    }
    for (const r of this.ribbons) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
    }
    const fire = fireById(this.design.fire);
    this.vehicleView = buildVehicle(
      this.vehicle.kind,
      hullOf(this.design),
      fire,
      this.env,
      this.design.body,
      shipParts(this.design),
    );
    this.scene.add(this.vehicleView.group);
    if (this.vehicle.kind === 'car') {
      this.ribbons = [0, 1].map(() => new Ribbon(160, 1.5, 0.24, 9, false, this.ribbonFlat));
    } else {
      this.ribbons = [0, 1].map(() => new Ribbon(70, 1.2, 0.5, 1.3, false, this.ribbonGlow));
      (this.ribbonGlow.uniforms.uColour.value as THREE.Color)
        .setRGB(...fire.stops[1])
        .multiplyScalar(1.6);
    }
    for (const r of this.ribbons) {
      r.mesh.renderOrder = this.vehicle.kind === 'car' ? 3 : 7;
      this.scene.add(r.mesh);
    }
  }

  setWorld(id: WorldId) {
    if (id === this.cfg.id) return;
    this.enterWorld(id);
  }

  setDesign(d: Design) {
    const prev = this.design;
    this.design = d;
    if (d.rivals !== prev.rivals || d.vehicle[this.cfg.id] !== prev.vehicle[this.cfg.id]) {
      // Rebuilt once the vehicle below is settled.
      queueMicrotask(() => this.buildRivals());
    }
    this.weather = setWeather(this.weather, d.weather, this.cfg.id);
    if (d.vehicle[this.cfg.id] !== this.vehicle.kind) {
      // Change vehicle where you are.
      const old = this.vehicle;
      this.vehicle = {
        ...newVehicle(d.vehicle[this.cfg.id], old.x, old.y, old.h),
        vx: old.vx,
        vy: old.vy,
      };
      this.vehicle.z = old.z - VEHICLES[old.kind].hover + VEHICLES[this.vehicle.kind].hover;
      this.best = loadBest(this.store, bestKey(this.cfg.id, this.vehicle.kind));
      this.run = newRun();
      this.race = newRace();
      this.drift = this.newDrift(this.vehicle.kind);
      this.buildVehicleView();
      return;
    }
    if (
      d.body !== prev.body ||
      d.reactors !== prev.reactors ||
      d.bubble !== prev.bubble ||
      d.core !== prev.core
    ) {
      this.buildVehicleView();
      return;
    }
    if (d.hull !== prev.hull || d.paint !== prev.paint)
      this.vehicleView?.setHull(hullOf(d), this.env);
    if (d.fire !== prev.fire) {
      const fire = fireById(d.fire);
      this.vehicleView?.setFire(fire);
      (this.ribbonGlow.uniforms.uColour.value as THREE.Color)
        .setRGB(...fire.stops[1])
        .multiplyScalar(1.6);
    }
  }

  setControls(c: Controls) {
    this.controls = c;
  }

  /** The Design panel's preview: the game holds still and the camera turns slowly round the vehicle. */
  /** The races playing themselves (the Grid's porthole, lib/art/autopilot.ts). */
  setAutopilot(on: boolean) {
    this.autopilot = on;
  }

  setPreview(on: boolean) {
    this.preview = on;
    this.previewYaw = 0;
  }

  reset() {
    this.spawn();
  }

  /** Where a point is drawn on a twisting road, or null where the road is not twisting. */
  /** A wall of light behind each racer, in its colour, fading over WALL.LIFE s. */
  private lightWalls(t: number, ox: number, oy: number) {
    const seen = new Set<string>();
    if (this.design.trail && this.trackWorld && !this.preview) {
      const racers: { key: string; colour: string; v: Vehicle; s: number }[] = [];
      if (!this.wreck)
        racers.push({ key: 'you', colour: hullOf(this.design).colour, v: this.vehicle, s: this.s });
      for (const rv of this.rivals)
        racers.push({ key: rv.r.name, colour: rv.r.colour, v: rv.v, s: rv.s });
      for (const r of racers) {
        seen.add(r.key);
        let wall = this.walls.get(r.key);
        if (!wall) {
          const mat = this.ribbonGlow.clone();
          mat.uniforms = {
            uColour: { value: new THREE.Color() },
            uOpacity: { value: WALL.OPACITY },
          };
          const rib = new Ribbon(WALL.POINTS, WALL.SPACING, WALL.HEIGHT, WALL.LIFE, true, mat);
          rib.mesh.renderOrder = 7;
          this.scene.add(rib.mesh);
          wall = { rib, mat, colour: '' };
          this.walls.set(r.key, wall);
        }
        if (wall.colour !== r.colour) {
          (wall.mat.uniforms.uColour.value as THREE.Color).set(r.colour).multiplyScalar(WALL.GLOW);
          wall.colour = r.colour;
        }
        const v = r.v;
        const base = v.z - VEHICLES[v.kind].hover;
        const p = this.posed(v.x, v.y, base + WALL.HEIGHT / 2, r.s, v) ?? {
          x: v.x,
          y: v.y,
          z: base + WALL.HEIGHT / 2,
        };
        // Behind the tail, so the wall leaves the vehicle rather than standing in it.
        pushTrail(wall.rib.trail, p.x - Math.cos(v.h) * 0.4, p.y - Math.sin(v.h) * 0.4, p.z, t, 1);
        wall.rib.update(ox, oy, t);
      }
    }
    for (const [key, wall] of this.walls) {
      if (seen.has(key)) continue;
      this.scene.remove(wall.rib.mesh);
      wall.rib.mesh.geometry.dispose();
      wall.mat.dispose();
      this.walls.delete(key);
    }
  }

  /** Off the twist's edge: the dive starts from where you are drawn, thrown out from its axis. */
  private startWreck(s: number, u: number) {
    const tr = this.trackWorld?.track;
    const v = this.vehicle;
    if (!tr) return;
    const surf = heightAt(tr, Math.max(0, s), u, true);
    const p = twistPose(tr, s, u, v.z - surf);
    const axis = twistPose(tr, s, 0, tr.def.half(Math.max(0, s)));
    this.wreck = newWreck(p, v, axis);
    this.riding = null;
  }

  /** The dive: the vehicle falls with it, trailing fire; it blows up, then the race is called. */
  private stepWreck(dt: number) {
    const wk = this.wreck;
    if (!wk) return;
    const v = this.vehicle;
    const f = stepWreck(wk, dt);
    v.x = wk.x;
    v.y = wk.y;
    v.z = wk.z;
    v.vx = wk.vx;
    v.vy = wk.vy;
    v.pitch = Math.min(1.2, wk.t * 0.5);
    if (!wk.boomed && Math.random() < 0.8)
      this.sparks.emit(wk.x, wk.y, wk.z, wk.vx * 0.6, wk.vy * 0.6, wk.vz * 0.6, 0.5, 0.25);
    if (f.boom) {
      for (let i = 0; i < 260; i++) {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(Math.random() * 2 - 1);
        const sp = 8 + Math.random() * 30;
        const dx = Math.sin(b) * Math.cos(a) * sp;
        const dy = Math.sin(b) * Math.sin(a) * sp;
        const dz = Math.cos(b) * sp;
        this.sparks.emit(
          wk.x,
          wk.y,
          wk.z,
          wk.vx * 0.3 + dx,
          wk.vy * 0.3 + dy,
          wk.vz * 0.3 + dz,
          0.8 + Math.random() * 1.4,
          0.3 + Math.random() * 0.5,
        );
        if (i < 90)
          this.puffs.emit(
            wk.x,
            wk.y,
            wk.z,
            dx * 0.3,
            dy * 0.3,
            dz * 0.3,
            1.6 + Math.random(),
            3 + Math.random() * 4,
          );
      }
      if (this.vehicleView) this.vehicleView.group.visible = false;
      wk.vx *= 0.2;
      wk.vy *= 0.2;
      wk.vz *= 0.2;
    }
    if (f.over) this.wrecked();
  }

  /** The race is over: you went off the twist. */
  private wrecked() {
    if (!this.onFinish) return;
    const r = raceResult(
      {
        time: this.race.start !== null ? this.t - this.race.start : 0,
        best: this.race.best,
        record: false,
      },
      { name: 'You', colour: hullOf(this.design).colour, s: this.s },
      this.rivals.map((rv) => ({ name: rv.r.name, colour: rv.r.colour, s: rv.s })),
    );
    this.onFinish({ ...r, wrecked: true });
  }

  /** Track a ride through a twist on its ribbon; out of its end still on it, a boost. */
  private rideTwist(s: number, u: number) {
    const tr = this.trackWorld?.track;
    if (!tr?.def.twist || this.wreck) return;
    const on = Math.abs(u) <= tr.def.half(Math.max(0, s)) + 1;
    const turning = (tr.def.twist(Math.max(0, s)) ?? 0) !== 0;
    if (turning && !this.riding && on && Math.abs(tr.def.twist(Math.max(0, s))) < 0.05) {
      let end = s;
      while (end < s + 1000 && tr.def.twist(end) !== 0) end += 2;
      this.riding = { end };
    }
    if (!this.riding) return;
    if (!on) this.riding = null;
    else if (s >= this.riding.end) {
      this.surgeAt = this.t;
      this.riding = null;
    }
  }

  /** Keeps who is going straight through a twist: chosen at its start, held to its end. */
  private trackStraight(v: Vehicle, s: number, u: number) {
    const tr = this.trackWorld?.track;
    if (!tr?.def.twist) return;
    const end = this.straight.get(v);
    if (end !== undefined) {
      if (s >= end || s < end - 1500) this.straight.delete(v);
      return;
    }
    if (choosesStraight(tr.def, s, u)) {
      const e = twistEntry(tr.def, s);
      if (e) this.straight.set(v, e.end);
    }
  }

  private posed(x: number, y: number, z: number, near: number, who: Vehicle | null = null) {
    const tr = this.trackWorld?.track;
    if (!tr?.def.twist) return null;
    // Straight through: drawn flat on the ground, the ribbon rolling round you.
    if (who && this.straight.has(who)) return null;
    const q = project(tr, x, y, near);
    if ((tr.def.twist(Math.max(0, q.s)) ?? 0) === 0) return null;
    if (Math.abs(q.u) > tr.def.half(Math.max(0, q.s)) + 4 && onBypass(tr, q.s, q.u) !== null)
      return null;
    return twistPose(tr, q.s, q.u, z - heightAt(tr, Math.max(0, q.s), q.u, true));
  }

  /** Puts a vehicle on the road's centre at s, facing along it at a speed. */
  private placeOnRoad(v: Vehicle, s: number, speed: number) {
    const tr = this.trackWorld?.track;
    if (!tr) return;
    const f = frameAt(tr, s);
    v.x = f.x;
    v.y = f.y;
    v.z = heightAt(tr, s, 0) + VEHICLES[v.kind].hover;
    v.h = f.h;
    v.vx = Math.cos(f.h) * speed;
    v.vy = Math.sin(f.h) * speed;
    v.vz = 0;
    v.yawRate = 0;
    v.roll = 0;
    v.pitch = 0;
  }

  /** Back to the start for the race intro: the flyover (or straight to the grid on a restart),
   * then it waits for `launch`. */
  startIntro(skipFly = false) {
    this.spawn();
    this.intro = newIntro(skipFly);
    this.stageNow = -1000;
    this.lastIntro = '';
  }

  /** Any key during the flyover: straight to the grid. */
  skipIntro() {
    const c = this.intro;
    if (!c || c.launchedAt !== null) return;
    const p = introPhase(c);
    if (p?.phase === 'fly') this.intro = newIntro(true);
  }

  /** The click to start: the lights count down, then everyone goes. */
  launch() {
    const c = this.intro;
    if (!c || c.launchedAt !== null) return;
    this.intro = { ...c, launchedAt: c.t };
    this.stageNow = 0;
  }

  /** The course is run: hand the shell the results. */
  private finished(time: number) {
    if (!this.onFinish) return;
    this.onFinish(
      raceResult(
        { time, best: this.race.best, record: this.race.record },
        { name: 'You', colour: hullOf(this.design).colour, s: this.s },
        this.rivals.map((rv) => ({ name: rv.r.name, colour: rv.r.colour, s: rv.s })),
      ),
    );
  }

  /** The intro's camera now, or null when the chase camera has it. */
  private introShot(): Shot | null {
    const c = this.intro;
    if (!c) return null;
    const p = introPhase(c);
    if (!p || p.phase === 'go') return null;
    const shotPhase = p.phase === 'count' ? 'ready' : p.phase;
    if (this.trackWorld) return trackShot(this.trackWorld.track, this.cfg.startS, shotPhase, p.k);
    return plainShot(this.vehicle, shotPhase, p.k);
  }

  /** Moves the intro on: lamps, the rivals' start, and tells the shell when its phase changes. */
  private stepIntro(dt: number) {
    const c = this.intro;
    if (!c) return;
    c.t += dt;
    const p = introPhase(c);
    const l = lightsAt(c);
    if (racing(c)) this.rivalsGo = true;
    const colour = new THREE.Color(trackInfo(this.cfg.id).colour).multiplyScalar(2.6);
    this.lamps.forEach((m, i) => {
      if (l.go) m.color.copy(colour);
      else if (i < l.lit) m.color.copy(LAMP_RED);
      else m.color.set(LAMP_OFF);
    });
    const key = p ? `${p.phase}:${l.lit}:${l.go}` : 'done';
    if (key !== this.lastIntro) {
      this.lastIntro = key;
      this.onIntro?.(p ? { phase: p.phase, lit: l.lit, go: l.go } : null);
    }
    if (!p) this.intro = null;
  }

  resize(w: number, h: number) {
    this.size = { w: Math.max(1, w), h: Math.max(1, h) };
    this.renderer.setSize(this.size.w, this.size.h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.size.w, this.size.h);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = null;
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = this.last === null ? 1 / 60 : clamp((now - this.last) / 1000, 0, 0.05);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    if (this.view) this.view.dispose();
    this.vehicleView?.dispose();
    for (const rv of this.rivals) rv.view.dispose();
    disposeGroup(this.scene);
    this.env?.dispose();
    this.composer.dispose();
    this.stage.dispose();
    this.renderer.dispose();
  }

  /* ── One frame ── */

  frame(dt: number) {
    this.t += dt;
    const t = this.t;
    this.weather = stepWeather(this.weather, dt);
    const w = weatherNow(this.weather, this.cfg.id);
    const v = this.vehicle;
    const spec = VEHICLES[v.kind];
    this.stepIntro(dt);
    // The stage fire's show runs on past GO until its last sparks fall (about 4.5 s in all).
    if (this.stageNow >= 0 && this.stageNow < 8) this.stageNow += dt;
    this.stage.set(this.stageNow, this.sparkColour);
    const holding = this.intro !== null && !racing(this.intro);
    const ctl =
      this.preview || holding
        ? NO_CONTROLS
        : this.autopilot
          ? autopilotControls(v, this.trackWorld?.track ?? null, this.s, t, this.cfg.id === 'sky')
          : this.controls;

    if (!this.preview) {
      // A ring's surge and the weather's gusts push before the vehicle moves.
      const surge = surgeAccel(t - this.surgeAt);
      if (surge > 0) {
        v.vx += Math.cos(v.h) * surge * dt;
        v.vy += Math.sin(v.h) * surge * dt;
      }
      const gust = gustAt(w, t) * (v.kind === 'ship' ? 1.5 : 1);
      if (gust !== 0 && !v.air) {
        v.vx += -Math.sin(v.h) * gust * dt;
        v.vy += Math.cos(v.h) * gust * dt;
      }
      const px = v.x;
      const py = v.y;
      const s0 = this.s;
      if (this.trackWorld) this.trackWorld.track.hint = this.s;
      // On the grid everyone stands still until GO: a steeply banked start would let the cars
      // slide down the bank while the lights count.
      const ev =
        holding || this.wreck
          ? HELD
          : stepVehicle(v, { ...ctl, mode: this.design.mode }, dt, this.physics, t);
      if (this.wreck) this.stepWreck(dt);
      this.odometer = (this.odometer + Math.hypot(v.x - px, v.y - py)) % 4096;
      let u = 0;
      if (this.trackWorld) {
        const tr = this.trackWorld.track;
        const q = project(tr, v.x, v.y, s0);
        this.s = q.s;
        u = q.u;
        const half = tr.def.half(Math.max(0, q.s));
        this.trackStraight(v, q.s, u);
        const straight = this.straight.has(v);
        // Off a twist's open edge: gone into the void (2026-11-22). Not going straight through.
        if (!this.wreck && !straight && offTwist(tr, q.s, u)) this.startWreck(q.s, u);
        // Through a twist on its ribbon, start to end: a boost out of it (the bypass and the
        // straight road get none).
        if (straight) this.riding = null;
        else this.rideTwist(q.s, u);
        // Into the void: back on the road before the jump, rolling, for another go.
        if (this.wreck) {
          // The dive is drawn from the wreck; nothing to put back.
        } else if (v.z < heightAt(tr, Math.max(0, q.s), u, true) - FALLEN) {
          const g = gapAround(tr, q.s);
          const back = Math.max(0, (g?.from ?? q.s) - RETRY_BACK);
          this.placeOnRoad(v, back, RETRY_SPEED);
          this.s = back;
          tr.hint = back;
        }
        // Lost (should never happen): back onto the road where you are.
        else if (Math.abs(u) > 90 || !Number.isFinite(q.s)) {
          const p = pointAt(tr, Math.max(0, q.s), 0);
          v.x = p.x;
          v.y = p.y;
          v.z = heightAt(tr, Math.max(0, q.s), 0) + spec.hover;
          v.vx = 0;
          v.vy = 0;
        }
        if (this.cfg.race === 'canyon') {
          const before = this.race.last;
          this.race = stepCanyonRace(this.race, s0, q.s, u, half, t);
          if (this.race.last !== null && this.race.last !== before) this.finished(this.race.last);
        } else if (this.cfg.race === 'lap')
          this.race = stepKmRace(this.race, s0, q.s, u, half + SKY_PIPE, t, SKY_LAP);
        else this.race = stepKmRace(this.race, s0, q.s, u, half, t);
        if (this.cfg.theme) {
          const k = Math.round((q.s - 180) / RING_STEP);
          const ring = k >= 0 ? ringAt(this.cfg.theme, k, tr.def.half(k * RING_STEP + 180)) : null;
          if (ring && throughRing(ring, s0, q.s, u, v.z - spec.hover - heightAt(tr, q.s, u) + 1)) {
            this.surgeAt = t;
            if (ring.mood) this.mood = ring.mood;
          }
        }
        this.keepBest(this.race.last, this.race.record);
      } else {
        this.run = stepRun(this.run, START_GATE, FINISH_GATE, px, py, v.x, v.y, t);
        this.keepBest(this.run.last, this.run.record);
        const before = this.drift;
        this.drift = stepDrift(
          before,
          { px, py, qx: v.x, qy: v.y, speed: speedOf(v), slip: v.slip, air: v.air },
          dt,
          t,
        );
        if (this.drift.lastTime !== before.lastTime) {
          const k = v.kind;
          if (this.drift.recordTime && this.drift.lastTime !== null)
            saveBest(this.store, `drive.gates.time.${k}`, this.drift.lastTime);
          if (this.drift.recordScore && this.drift.lastScore !== null)
            saveBest(this.store, `drive.gates.score.${k}`, this.drift.lastScore);
        }
      }
      this.stepRivals(dt, t);
      this.dust(ev.landed, ev.bump, dt, w);
      if (ev.scrape) this.spray(ev.scrape, ev.scrapeNx ?? 0, ev.scrapeNy ?? 0, dt);
    }

    // The camera.
    const speed = speedOf(v);
    const boost = ctl.boost + (surgeAccel(t - this.surgeAt) > 0 ? 1 : 0);
    const feel = speedFeel(speed, spec.vTop, t);
    this.cam.focal = ease(this.cam.focal, feel.focal - 0.05 * boost, 3, dt);
    const piece = this.pieceCamera();
    const travel = speed > 2 && v.vLong > 0 ? v.h - v.slip * 0.65 : v.h;
    this.cam.yaw = wrapAngle(easeAngle(this.cam.yaw, travel, 3.2, dt));
    let yaw = this.cam.yaw;
    let dist = piece ? CAR_DIST : v.kind === 'ship' ? 8.5 : 7.2;
    let lift = piece ? CAM_H : v.kind === 'ship' ? 2.7 : 2.2;
    if (this.preview) {
      this.previewYaw += dt * 0.35;
      yaw = v.h + Math.PI + this.previewYaw;
      dist = v.kind === 'ship' ? 7.5 : 6.5;
      lift = 1.9;
    }
    this.cam.x = v.x - Math.cos(yaw) * dist;
    this.cam.y = v.y - Math.sin(yaw) * dist;
    const baseZ = piece ? 0 : v.z - spec.hover;
    const wantZ = baseZ + lift + (v.air ? 0.8 : 0);
    this.cam.z = ease(this.cam.z, wantZ, v.air ? 2.5 : 7, dt);
    const wk = this.wreck;
    if (wk) {
      // Off the twist: watch the dive from above and behind, falling with it.
      const sp = Math.hypot(wk.vx, wk.vy) || 1;
      this.cam.x = wk.x - (wk.vx / sp) * 16;
      this.cam.y = wk.y - (wk.vy / sp) * 16;
      this.cam.z = wk.z + 10 + Math.min(20, wk.t * 6);
      this.cam.roll = 0;
    } else if (this.trackWorld && !this.preview) {
      // Never under the ground (a banked turn's high side behind you).
      const g = heightAt(
        this.trackWorld.track,
        project(this.trackWorld.track, this.cam.x, this.cam.y, this.s).s,
        0,
      );
      this.cam.z = Math.max(this.cam.z, g + 1.2);
    }
    this.cam.roll = ease(this.cam.roll, piece ? 0 : v.roll * 0.35, 4, dt);
    const shot = this.preview ? null : this.introShot();
    if (shot) {
      this.cam.x = shot.cam.x;
      this.cam.y = shot.cam.y;
      this.cam.z = shot.cam.z;
      this.cam.roll = 0;
    }

    // A twist turns what is drawn about the road's axis (the physics drives a flat road): the
    // camera rides it too, its up turning with the road, so the world rolls over you.
    const camP =
      !shot && !piece && !wk ? this.posed(this.cam.x, this.cam.y, this.cam.z, this.s, v) : null;
    const vP = wk ? null : this.posed(v.x, v.y, v.z, this.s, v);
    const ox = camP ? camP.x : this.cam.x;
    const oy = camP ? camP.y : this.cam.y;
    const camera = this.camera;
    camera.position.set(0, camP ? camP.z : this.cam.z, 0);
    if (shot) {
      camera.up.set(0, 1, 0);
      camera.lookAt(shot.look.x - ox, shot.look.z, -(shot.look.y - oy));
    } else if (piece) {
      camera.rotation.set(0, yaw - Math.PI / 2, 0, 'YXZ');
    } else {
      const ahead = this.preview ? 0 : 6;
      const lx = v.x + Math.cos(yaw) * ahead;
      const ly = v.y + Math.sin(yaw) * ahead;
      const lz = baseZ + (this.preview ? 0.7 : 0.9);
      const look = wk
        ? { x: wk.x, y: wk.y, z: wk.z }
        : (this.posed(lx, ly, lz, this.s, v) ?? { x: lx, y: ly, z: lz });
      const th = vP?.th ?? 0;
      // The road's up, turned with it: its left side rises as the twist turns.
      camera.up.set(Math.sin(v.h) * Math.sin(th), Math.cos(th), Math.cos(v.h) * Math.sin(th));
      camera.lookAt(look.x - ox, look.z, -(look.y - oy));
      camera.rotateZ(this.cam.roll);
    }
    camera.updateMatrixWorld();
    const aspect = this.size.w / this.size.h;
    const shake = this.preview ? { x: 0, y: 0 } : { x: feel.shakeX, y: feel.shakeY };
    const hz = piece ? 0.01 : 0;
    setProjection(camera, this.cam.focal, aspect, hz, shake.x, shake.y);

    // The start gantry, just ahead of the grid.
    if (this.trackWorld) {
      const gs = this.cfg.startS + 6;
      const tr = this.trackWorld.track;
      const gp = pointAt(tr, gs, 0);
      this.gantry.position.set(gp.x - ox, heightAt(tr, gs, 0), -(gp.y - oy));
      this.gantry.rotation.set(0, frameAt(tr, gs).h, 0);
    }

    // The vehicle.
    const vv = this.vehicleView;
    if (vv) {
      vv.group.position.set((vP?.x ?? v.x) - ox, vP?.z ?? v.z, -((vP?.y ?? v.y) - oy));
      // Over the vehicle and a little behind it, toward the camera.
      this.carLight.position.set(
        v.x - ox - Math.cos(v.h) * 2.5,
        v.z + 3,
        -(v.y - oy - Math.sin(v.h) * 2.5),
      );
      vv.group.rotation.set(-v.pitch, v.h + Math.PI / 2, -(v.roll + (vP?.roll ?? 0)), 'YXZ');
      const power =
        (ctl.throttle > 0 || ctl.boost > 0 ? 1 : 0.35) +
        ctl.boost * 0.5 +
        (surgeAccel(t - this.surgeAt) > 0 ? 0.8 : 0);
      vv.update(
        v,
        t,
        dt,
        power,
        clamp(speed / spec.vTop, 0, 1.4),
        this.design.flames ? speedFlame(speed, spec.vTop) : 0,
      );
    }
    for (const rv of this.rivals) {
      const g = rv.view.group;
      const rs = speedOf(rv.v);
      g.visible = Math.hypot(rv.v.x - ox, rv.v.y - oy) < 700;
      if (!g.visible) continue;
      const rP = this.posed(rv.v.x, rv.v.y, rv.v.z, rv.s, rv.v);
      g.position.set((rP?.x ?? rv.v.x) - ox, rP?.z ?? rv.v.z, -((rP?.y ?? rv.v.y) - oy));
      g.rotation.set(-rv.v.pitch, rv.v.h + Math.PI / 2, -(rv.v.roll + (rP?.roll ?? 0)), 'YXZ');
      rv.view.update(
        rv.v,
        t,
        dt,
        1,
        clamp(rs / spec.vTop, 0, 1.4),
        this.design.flames ? speedFlame(rs, spec.vTop) : 0,
      );
    }
    this.trails(t, w);
    for (const r of this.ribbons) r.update(ox, oy, t);
    this.lightWalls(t, ox, oy);
    this.puffs.update(dt, ox, oy);
    this.sparks.update(dt, ox, oy);
    this.sparks.material.uniforms.uScale.value = this.puffs.material.uniforms.uScale.value;
    (this.puffs.material.uniforms.uColour.value as THREE.Color).setRGB(...this.cfg.dust);
    this.puffs.material.uniforms.uScale.value =
      this.renderer.getDrawingBufferSize(new THREE.Vector2()).y * this.cam.focal;

    // The world.
    if (this.view) {
      if ('update' in this.view && this.trackWorld)
        (this.view as TrackView).update(ox, oy, this.s, t, w);
      else
        (this.view as SaltView).update(
          ox,
          oy,
          { x: ox, y: oy, yaw: this.cam.yaw },
          t,
          w,
          this.drift.next,
        );
    }
    const night = this.cfg.theme !== null;
    this.sun.intensity = (night ? 0.12 : 1.5) * (0.4 + 0.6 * w.sun) * w.light;
    this.hemi.intensity = (night ? 0.35 : 1.0) * w.light;
    this.carLight.intensity = night ? CAR_LIGHT : 0;
    const fog = this.scene.fog as THREE.FogExp2;
    const base = night ? 0.0012 : this.cfg.id === 'coast' ? 0.0005 : 0.00018;
    const baseCol: [number, number, number] = night
      ? [0.03, 0.03, 0.05]
      : this.cfg.id === 'coast'
        ? [1, 0.7, 0.55]
        : [0.95, 0.75, 0.62];
    const k = w.fogDensity / (w.fogDensity + base);
    fog.density = base + w.fogDensity;
    fog.color.setRGB(
      ...(baseCol.map((c, i) => c + (w.fog[i] - c) * k) as [number, number, number]),
    );

    this.updateBackdrop(ox, oy, t, w, aspect);
    this.updateMotes(speed, spec.vTop, boost, dt, w, aspect);

    this.paintMood(dt);
    this.composer.render(dt);
    this.emitHud(speed, t);
  }

  private newDrift(kind: string): DriftRun {
    return newDriftRun(
      loadBest(this.store, `drive.gates.time.${kind}`),
      loadBest(this.store, `drive.gates.score.${kind}`),
    );
  }

  /** Eases every light toward the last ring's mood (half a second), and away when there is none. */
  private paintMood(dt: number) {
    const u = this.moodPass.uniforms;
    const on = this.mood !== null && this.cfg.theme === 'neon';
    u.uAmt.value = ease(u.uAmt.value as number, on ? 0.85 : 0, on ? 4 : 6, dt);
    if (on && this.mood) {
      const stops = MOODS[this.mood].stops;
      for (const [i, key] of (['uA', 'uB', 'uC'] as const).entries()) {
        const vec = u[key].value as THREE.Vector3;
        vec.x = ease(vec.x, stops[i][0], 4, dt);
        vec.y = ease(vec.y, stops[i][1], 4, dt);
        vec.z = ease(vec.z, stops[i][2], 4, dt);
      }
    }
    this.moodPass.enabled = (u.uAmt.value as number) > 0.002;
  }

  private keepBest(last: number | null, record: boolean) {
    if (record && last !== null && last !== this.best) {
      this.best = last;
      saveBest(this.store, bestKey(this.cfg.id, this.vehicle.kind), last);
    }
  }

  private trails(t: number, w: Weather) {
    const v = this.vehicle;
    const vv = this.vehicleView;
    if (!vv) return;
    const lx = -Math.sin(v.h);
    const ly = Math.cos(v.h);
    const fx = Math.cos(v.h);
    const fy = Math.sin(v.h);
    if (v.kind === 'car') {
      // Tyre marks, faint when rolling straight, dark in a slide; none in the wet.
      const mark =
        this.cfg.wet || v.air ? 0 : clamp(Math.abs(v.slip) * 9 + 0.12 + w.snow * 0.3, 0, 1);
      vv.feet.forEach((f, i) => {
        const x = v.x + lx * f.x + fx * f.z;
        const y = v.y + ly * f.x + fy * f.z;
        const g = this.physics.ground(x, y);
        pushTrail(this.ribbons[i].trail, x, y, g.h + 0.03, t, mark);
      });
      this.ribbonFlat.uniforms.uOpacity.value = this.cfg.id === 'coast' ? 0.45 : 0.3;
    } else {
      // The fire's glowing trail, from each booster.
      vv.nozzles.forEach((n, i) => {
        const x = v.x + lx * n.x + fx * n.z;
        const y = v.y + ly * n.x + fy * n.z;
        pushTrail(
          this.ribbons[i].trail,
          x,
          y,
          v.z + n.y + (v.air ? 0 : Math.sin(t * 2.1) * 0.05),
          t,
          clamp(speedOf(v) / 30, 0.2, 1),
        );
      });
    }
    if (this.trackWorld) this.trackWorld.track.hint = this.s;
  }

  /** Sparks where the vehicle scrapes a wall: more the faster it slides along it. */
  private spray(along: number, nx: number, ny: number, dt: number) {
    const v = this.vehicle;
    const x = v.x - nx * 1.0;
    const y = v.y - ny * 1.0;
    const z = v.z - VEHICLES[v.kind].hover + 0.4;
    let n = Math.min(220, 40 + along * 4) * dt;
    while (n > 0) {
      if (Math.random() < n) {
        const out = 2 + Math.random() * 6;
        this.sparks.emit(
          x,
          y,
          z + Math.random() * 0.4,
          v.vx * (0.55 + Math.random() * 0.3) + nx * out + (Math.random() - 0.5) * 3,
          v.vy * (0.55 + Math.random() * 0.3) + ny * out + (Math.random() - 0.5) * 3,
          1.5 + Math.random() * 3.5,
          0.25 + Math.random() * 0.35,
          0.12 + Math.random() * 0.12,
        );
      }
      n -= 1;
    }
  }

  private dust(landed: number, bump: number, dt: number, w: Weather) {
    const v = this.vehicle;
    const vv = this.vehicleView;
    if (!vv) return;
    const speed = speedOf(v);
    const lx = -Math.sin(v.h);
    const ly = Math.cos(v.h);
    const fx = Math.cos(v.h);
    const fy = Math.sin(v.h);
    const g = this.physics.ground(v.x, v.y);
    if (this.trackWorld) this.trackWorld.track.hint = this.s;
    const rate = v.air
      ? 0
      : (speed > 8 ? speed * (this.cfg.wet ? 1.6 : 0.9) : 0) +
        Math.abs(v.slip) * 260 +
        g.rough * speed * 2 +
        w.wet * speed * 0.8;
    let n = rate * dt;
    while (n > 0) {
      if (Math.random() < n) {
        const f = vv.feet[Math.random() < 0.5 ? 0 : 1];
        const x = v.x + lx * f.x + fx * f.z;
        const y = v.y + ly * f.x + fy * f.z;
        const spread = 1 + speed * 0.05;
        this.puffs.emit(
          x,
          y,
          g.h + 0.15,
          v.vx * 0.25 + (Math.random() - 0.5) * spread,
          v.vy * 0.25 + (Math.random() - 0.5) * spread,
          0.4 + Math.random() * (this.cfg.wet ? 2.2 : 1.2),
          1.2 + Math.random() * 1.6,
          0.5 + Math.random() * 0.6,
        );
      }
      n -= 1;
    }
    // A puff on landing and on a hit.
    const burst = (count: number, power: number) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        this.puffs.emit(
          v.x,
          v.y,
          g.h + 0.2,
          Math.cos(a) * power + v.vx * 0.3,
          Math.sin(a) * power + v.vy * 0.3,
          0.5 + Math.random() * 1.5,
          1.5 + Math.random(),
          0.8 + Math.random() * 0.8,
        );
      }
    };
    if (landed > 2) burst(Math.min(60, 10 + landed * 3), 2 + landed * 0.2);
    if (bump > 2) burst(Math.min(50, 10 + bump * 2), 3);
  }

  private updateBackdrop(ox: number, oy: number, t: number, w: Weather, aspect: number) {
    const u = this.backdropU;
    void aspect;
    (u.uRot.value as THREE.Matrix3).setFromMatrix4(this.camera.matrixWorld);
    (u.uCamW.value as THREE.Vector2).set(wrapPeriod(ox), wrapPeriod(oy));
    (u.uMtn.value as THREE.Vector2).set(-0.2 * ox, -0.2 * oy);
    // The shake is set with the motes' (it is one uniform), from the projection itself.
    u.uFocal.value = this.cam.focal;
    u.uHz.value = this.pieceCamera() ? 0.01 : 0;
    u.uTime.value = t;
    u.uLight.value = 0.8 * w.light;
    u.uDetail.value = 0.667;
    u.uCamY.value = this.cam.z;
    u.uPlaneY.value = this.cfg.planeY;
    u.uSunAz.value = this.cfg.sunAz;
    u.uSunAmt.value = w.sun;
    u.uFogDen.value = w.fogDensity;
    (u.uFogCol.value as THREE.Color).setRGB(...w.fog);
    u.uSnow.value = w.snow;
    u.uWet.value = Math.max(w.wet, this.cfg.wet ? 1 : 0);
    (u.uTint.value as THREE.Color).setRGB(...w.tint);
    u.uTintAmt.value = w.tintAmount;
    // The painted mile on the open plains: the Salt Flat and Mars.
    u.uCourse.value = this.cfg.track === null ? 1 : 0;
    (u.uLine.value as THREE.Vector4).set(LINE.x - ox, LINE.y0 - oy, LINE.x - ox, LINE.y1 - oy);
    const gA = START_GATE;
    const gB = FINISH_GATE;
    (u.uGateA.value as THREE.Vector4).set(gA.ax - ox, gA.ay - oy, gA.bx - ox, gA.by - oy);
    (u.uGateB.value as THREE.Vector4).set(gB.ax - ox, gB.ay - oy, gB.bx - ox, gB.by - oy);
  }

  private shakeNow = new THREE.Vector2();

  private updateMotes(
    speed: number,
    top: number,
    boost: number,
    dt: number,
    w: Weather,
    aspect: number,
  ) {
    const u = this.moteU;
    const v = this.vehicle;
    // The vanishing point: where the way you travel meets the screen, and the horizon's height.
    const dir = speed > 1 ? Math.atan2(v.vy, v.vx) : v.h;
    const far = new THREE.Vector3(Math.cos(dir) * 2000, this.cam.z, -Math.sin(dir) * 2000).project(
      this.camera,
    );
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize().multiplyScalar(2000);
    fwd.y = this.cam.z;
    const hz = fwd.project(this.camera);
    const e = this.camera.projectionMatrix.elements;
    // The shake the projection carries (see setProjection), back in view heights.
    this.shakeNow.set((e[8] * aspect) / 2, e[9] / 2 + (this.pieceCamera() ? 0.01 : 0));
    (this.backdropU.uShake.value as THREE.Vector2).copy(this.shakeNow);
    const sh = this.shakeNow;
    (u.uVp.value as THREE.Vector2).set(far.x * 0.5 * aspect + sh.x, far.y * 0.5 + sh.y);
    u.uHzS.value = hz.y * 0.5 + sh.y;
    u.uFocal.value = this.cam.focal;
    u.uTravel.value = this.odometer;
    u.uBlur.value = clamp(speed * dt, 0, 4);
    u.uAmount.value = moteAmount(w, clamp(speed / top, 0, 1.5), boost);
    u.uLen.value = w.length * (1 + 0.3 * boost);
    u.uWid.value = w.width;
    u.uBelow.value = w.below;
    u.uBright.value = 0.25;
    u.uLight.value = 0.8 * w.light;
    (u.uMote.value as THREE.Color).setRGB(...(w.mote ?? [1, 0.95, 0.92]));
  }

  private emitHud(speed: number, t: number) {
    if (!this.onHud || t - this.hudAt < 0.1) return;
    this.hudAt = t;
    // On the Salt Flat the clock is the measured mile while one is run, else the drift gates' lap.
    const d = this.drift;
    const gates =
      !this.trackWorld && this.run.start === null && (d.start !== null || d.lastTime !== null);
    const start = this.trackWorld ? this.race.start : gates ? d.start : this.run.start;
    const last = this.trackWorld ? this.race.last : gates ? d.lastTime : this.run.last;
    const record = this.trackWorld ? this.race.record : gates ? d.recordTime : this.run.record;
    const best = gates ? d.bestTime : this.best;
    const running = start !== null;
    const drifting = gates && d.start !== null && d.held > 0 && d.lapse < 0.1;
    const box = gearOf(this.vehicle.kind, speed, VEHICLES[this.vehicle.kind].vTop);
    const hud: Hud = {
      speed: kmh(speed),
      gear: box.gear,
      revs: Math.round(box.revs * 20) / 20,
      time: running ? formatTime(t - (start as number)) : last !== null ? formatTime(last) : null,
      best: best !== null ? formatTime(best) : null,
      record: !running && record,
      running,
      drift: !gates ? null : d.start !== null ? liveScore(d) : d.lastScore,
      driftBest: gates ? d.bestScore : null,
      combo: drifting ? Math.round(comboOf(d.held) * 10) / 10 : null,
      place: this.rivals.length
        ? placeOf(
            this.s,
            this.rivals.map((rv) => rv.s),
          )
        : null,
      racers: this.rivals.length + 1,
    };
    const key = JSON.stringify(hud);
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.onHud(hud);
  }
}

export { SURGE_LIFE };
