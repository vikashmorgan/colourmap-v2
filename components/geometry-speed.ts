/**
 * Speed: ten drives and a triangle stream for the Ferrari pitch, in the Art builder's Experiment
 * tab.
 * Spec: docs/specs/geometry-field.md, "Speed" (2026-11-16).
 *
 * One mode, `speed`; the Scene slider (the builder's `particles`) picks the piece, as the Tree
 * slider does for the Star Trees. Each piece is one full-screen shader (lib/art/speed-shaders.ts)
 * fed each frame from the pure math in lib/art/speed.ts: the distance travelled, the speed, the
 * field of view and shake that come with it, the road ahead for the chase cameras, and the car's
 * place on the Monza lap.
 *
 * Sliders: Scene, Speed (breathSpeed), Streaks (glow), Light (intensity), Car (symmetry: 0 hides
 * it), Detail (complexity), Bloom (luminous).
 *
 * The Triangle Stream (scene 10) adds one more layer: Chaos Triangles in one instanced mesh, carried
 * by the Wind Body's air field (lib/wind.ts) round the car the shader draws.
 */

import * as THREE from 'three';

import {
  aheadDistance,
  CAR,
  CHASE,
  CRUISE,
  chaseYaw,
  clamp,
  emptyRoad,
  feel,
  labelAlpha,
  lapPosition,
  MONZA_NAMES,
  makeStream,
  monzaField,
  monzaTrack,
  PERIOD,
  pointAt,
  ROAD_POINTS,
  roadAhead,
  roadCentreAt,
  SCENES,
  STREAM_SHAPE,
  type Stream,
  sectionOf,
  stepStream,
  streamColour,
  tunnelSpeed,
  windingAt,
  windingHeading,
} from '@/lib/art/speed';
import { SPEED_FLOATS, SPEED_VERTEX, speedFragment } from '@/lib/art/speed-shaders';

export const SPEED_MODE = 'speed';

export function isSpeedMode(mode: string): boolean {
  return mode === SPEED_MODE;
}

export interface SpeedCfg {
  mode: string;
  particles: number;
  breathSpeed: number;
  intensity: number;
  glow: number;
  complexity: number;
  symmetry: number;
}

/** The piece the Scene slider points at. */
export function sceneOf(cfg: Pick<SpeedCfg, 'particles'>): number {
  return clamp(Math.round(cfg.particles), 0, SCENES.length - 1);
}

/* ── Textures made once ────────────────────────────────────── */

let fieldTexture: THREE.DataTexture | null = null;
function trackFieldTexture(): THREE.DataTexture {
  if (!fieldTexture) {
    const f = monzaField();
    const half = new Uint16Array(f.data.length);
    for (let i = 0; i < f.data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(f.data[i]);
    fieldTexture = new THREE.DataTexture(
      half,
      f.size,
      f.size,
      THREE.RGBAFormat,
      THREE.HalfFloatType,
    );
    fieldTexture.magFilter = THREE.LinearFilter;
    fieldTexture.minFilter = THREE.LinearFilter;
    fieldTexture.wrapS = THREE.ClampToEdgeWrapping;
    fieldTexture.wrapT = THREE.ClampToEdgeWrapping;
    fieldTexture.needsUpdate = true;
  }
  return fieldTexture;
}

let blankTexture: THREE.DataTexture | null = null;
function blank(): THREE.DataTexture {
  if (!blankTexture) {
    blankTexture = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
    blankTexture.needsUpdate = true;
  }
  return blankTexture;
}

/** Row height and count of the corner-name atlas; the shader reads row `uLabel`. */
const LABEL_ROW = 64;
let labelTexture: THREE.Texture | null = null;
function labels(): THREE.Texture {
  if (labelTexture) return labelTexture;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  // jsdom has no 2D context (and says so loudly); tests just get a blank atlas.
  const jsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
  const ctx = canvas && !jsdom ? canvas.getContext('2d') : null;
  if (!canvas || !ctx) {
    labelTexture = blank();
    return labelTexture;
  }
  canvas.width = 1024;
  canvas.height = LABEL_ROW * MONZA_NAMES.length;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.font = '300 40px system-ui, -apple-system, "Segoe UI", sans-serif';
  MONZA_NAMES.forEach((name, i) => {
    ctx.fillText(name.toUpperCase().split('').join(' '), 6, i * LABEL_ROW + LABEL_ROW / 2);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  labelTexture = tex;
  return tex;
}

/* ── Per-scene clocks: they survive rebuilds, so a slider move never restarts the drive ── */

interface Drive {
  last: number | null;
  time: number;
  travel: number;
  lap: number;
  speed: number;
}
const drives = new Map<number, Drive>();
function driveFor(scene: number): Drive {
  let d = drives.get(scene);
  if (!d) {
    // Each lap piece starts a little way in, on the straight; the others at the origin.
    d = { last: null, time: 0, travel: 0, lap: scene === 1 ? 3 : 0, speed: 0 };
    drives.set(scene, d);
  }
  return d;
}

/* ── Build ─────────────────────────────────────────────────── */

function makeUniforms(): Record<string, THREE.IUniform> {
  const u: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uShake: { value: new THREE.Vector2() },
    uRoadX: { value: new Float32Array(ROAD_POINTS) },
    uRoadZ: { value: new Float32Array(ROAD_POINTS) },
    uRoadS: { value: new Float32Array(ROAD_POINTS) },
    uRoadK: { value: new Float32Array(ROAD_POINTS) },
    uField: { value: blank() },
    uFieldBox: { value: new THREE.Vector4(0, 0, 1, 1) },
    uOrbit: { value: new THREE.Vector4(0, 0, 1000, 1) },
    uTarget: { value: new THREE.Vector4() },
    uLabels: { value: blank() },
    // The Triangle Stream's body outline (lib/wind.ts shape 2), 15 points.
    uPoly: { value: STREAM_SHAPE.outline.slice(0, 15).map(([x, y]) => new THREE.Vector2(x, y)) },
  };
  for (const n of SPEED_FLOATS) u[n] = { value: 0 };
  // A straight road until a scene says otherwise.
  const z = u.uRoadZ.value as Float32Array;
  const s = u.uRoadS.value as Float32Array;
  for (let k = 0; k < ROAD_POINTS; k++) {
    z[k] = aheadDistance(k);
    s[k] = aheadDistance(k);
  }
  return u;
}

function materialFor(
  scene: number,
  uniforms: Record<string, THREE.IUniform>,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SPEED_VERTEX,
    fragmentShader: speedFragment(scene),
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

export function buildSpeed(cfg: SpeedCfg): THREE.Group {
  const group = new THREE.Group();
  const uniforms = makeUniforms();
  const scene = sceneOf(cfg);
  const geo = new THREE.BufferGeometry();
  // One big triangle over the frame; the vertex shader passes it straight through.
  geo.setAttribute('aPos', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const quad = new THREE.Mesh(geo, materialFor(scene, uniforms));
  quad.frustumCulled = false;
  quad.renderOrder = -10;
  quad.userData.tag = 'visualShader';
  quad.userData.scene = scene;
  quad.userData.uniforms = uniforms;
  const size = new THREE.Vector2();
  quad.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(size);
    const target = renderer.getRenderTarget();
    if (target) size.set(target.width, target.height);
    (uniforms.uRes.value as THREE.Vector2).copy(size);
  };
  group.add(quad);
  return group;
}

/* ── Triangle Stream (scene 10) ────────────────────────────── */

export const TRIANGLE_STREAM = 10;
/** Air speed at Speed 1, in view heights (2.2 units) a second, roughly. */
export const STREAM_AIR = 1.3;
const STREAM_MAX = 2600;

/** How many triangles the Detail slider asks for. */
export function streamCount(complexity: number): number {
  return Math.round(900 + 1700 * clamp((complexity - 1) / 9, 0, 1));
}

/*
 * Chaos Triangles' look (components/GeometryField.tsx buildChaostri3d): flat triangles added in
 * light, tumbling, but far smaller, and here each points along the air it rides and spins about
 * that line, coloured by the air's speed.
 */
function buildStreamMesh(): THREE.InstancedMesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([1, 0, 0, -0.5, 0.62, 0, -0.5, -0.62, 0], 3),
  );
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, STREAM_MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.userData.tag = 'speedStream';
  mesh.count = 0;
  return mesh;
}

const dummy = new THREE.Object3D();
dummy.rotation.order = 'ZYX';
const tint = new THREE.Color();

function updateStream(group: THREE.Group, cfg: SpeedCfg, d: Drive, dt: number, R: number): void {
  let mesh = group.children.find((c) => c.userData.tag === 'speedStream') as
    | THREE.InstancedMesh
    | undefined;
  if (!mesh) {
    mesh = buildStreamMesh();
    group.add(mesh);
  }
  const n = streamCount(cfg.complexity);
  let st = group.userData.stream as Stream | undefined;
  if (!st || st.n !== n) {
    st = makeStream(n);
    group.userData.stream = st;
  }
  mesh.visible = true;
  stepStream(st, dt, d.speed, d.time * 0.6);
  const S = R / (0.42 * 2.2);
  const size = R * 0.016;
  for (let i = 0; i < n; i++) {
    const vx = st.vx[i];
    const vy = st.vy[i];
    const sp = Math.hypot(vx, vy);
    const s0 = st.seed[i * 3];
    const s1 = st.seed[i * 3 + 1];
    const s2 = st.seed[i * 3 + 2];
    dummy.position.set(st.x[i] * S, st.y[i] * S, 0);
    dummy.rotation.set(
      s2 * 6.283 + d.time * (0.8 + 1.4 * s1),
      0,
      Math.atan2(vy, vx) + (s0 - 0.5) * 0.5,
    );
    const k = size * (0.6 + 0.8 * s1);
    dummy.scale.set(k * (1 + 0.45 * sp * Math.min(1, cfg.breathSpeed)), k, k);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const [r, g, b] = streamColour(sp);
    mesh.setColorAt(i, tint.setRGB(r, g, b));
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  (mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * clamp(cfg.intensity / 10, 0.2, 1.3);
}

function hideStream(group: THREE.Group): void {
  const mesh = group.children.find((c) => c.userData.tag === 'speedStream');
  if (mesh) mesh.visible = false;
}

/* ── Update ────────────────────────────────────────────────── */

const roadScratch = emptyRoad();

/** Advances a scene's drive by the frame's time and returns its speed (m/s). */
export function advanceDrive(scene: number, t: number, speedMul: number): Drive {
  const d = driveFor(scene);
  const dt = d.last === null ? 0 : clamp((t - d.last) / 1000, 0, 0.1);
  d.last = t;
  d.time += dt;
  if (scene === 0 || scene === 1) {
    const track = monzaTrack();
    d.lap = (d.lap + dt * speedMul) % track.lapTime;
    const pos = lapPosition(track, d.lap);
    d.speed = pos.speed * speedMul;
    d.travel = pos.s;
  } else if (scene === TRIANGLE_STREAM) {
    // World units a second (the view is 2.2 high): the air, and the road under the car.
    d.speed = STREAM_AIR * speedMul;
    d.travel = (d.travel + d.speed * dt) % 64;
  } else {
    // A slow swell in the cruise, so the speed breathes rather than holding dead level.
    const base =
      scene === 6 ? tunnelSpeed(d.travel) : CRUISE[scene] * (1 + 0.06 * Math.sin(d.time * 0.21));
    d.speed = base * speedMul;
    d.travel = (d.travel + d.speed * dt) % PERIOD;
  }
  return d;
}

export function updateSpeed(group: THREE.Group, cfg: SpeedCfg, t: number, R = 300): void {
  const quad = group.children[0] as THREE.Mesh;
  const u = quad.userData.uniforms as Record<string, THREE.IUniform>;
  const scene = sceneOf(cfg);
  if (quad.userData.scene !== scene) {
    (quad.material as THREE.Material).dispose();
    quad.material = materialFor(scene, u);
    quad.userData.scene = scene;
  }
  const speedMul = Math.max(0, cfg.breathSpeed);
  const prevTime = driveFor(scene).time;
  const d = advanceDrive(scene, t, speedMul);
  const dt = d.time - prevTime;
  const { focal, shakeX, shakeY } = feel(d.speed, d.time);
  u.uTime.value = d.time;
  u.uTravel.value = d.travel;
  u.uSpeedN.value = clamp(d.speed / CAR.vTop, 0, 1.5);
  // Metres travelled in one frame: the width of the motion-blur box.
  u.uBlur.value = clamp(d.speed * (dt > 0 ? dt : 1 / 60), 0, 4);
  u.uFocal.value = scene === 8 ? 1.5 : focal;
  (u.uShake.value as THREE.Vector2).set(shakeX, shakeY);
  u.uLight.value = clamp(cfg.intensity / 10, 0, 1.5);
  u.uStreaks.value = clamp(cfg.glow / 10, 0, 1);
  u.uDetail.value = clamp((cfg.complexity - 1) / 9, 0, 1);
  u.uCar.value =
    scene === 0 || scene === 8 || scene === TRIANGLE_STREAM ? 0 : clamp(cfg.symmetry, 0, 1);
  u.uCarX.value = 0.12 * Math.sin(d.time * 0.37);
  u.uRoll.value = 0;
  u.uLabelA.value = 0;

  if (scene === TRIANGLE_STREAM) {
    u.uSpeedN.value = clamp(d.speed / STREAM_AIR, 0, 1.5);
    updateStream(group, cfg, d, dt, R);
  } else hideStream(group);
  if (scene === 0) updateLap(u, d);
  else if (scene === 1) updateChase(u, d);
  else if (scene === 3 || scene === 7) updateWinding(u, d);
  if (scene === 8) {
    // The streak: across 2.6 km of flat every 26 s at Speed 1, then a pause.
    const cycle = 30;
    const ph = (d.time % cycle) / 26;
    u.uStreakX.value = -1300 + 2600 * ph;
  }
}

function setLabel(u: Record<string, THREE.IUniform>, s: number): void {
  const track = monzaTrack();
  const sec = sectionOf(track, s);
  u.uLabels.value = labels();
  u.uLabel.value = sec.label;
  u.uLabelA.value = labelAlpha(sec.into, sec.length) * 0.8;
}

function updateLap(u: Record<string, THREE.IUniform>, d: Drive): void {
  const track = monzaTrack();
  const f = monzaField();
  u.uField.value = trackFieldTexture();
  (u.uFieldBox.value as THREE.Vector4).set(f.x0, f.y0, f.span, track.length);
  const car = pointAt(track, d.travel);
  const cx = (track.bounds.x0 + track.bounds.x1) / 2;
  const cy = (track.bounds.y0 + track.bounds.y1) / 2;
  // The camera circles slowly, high and tilted, looking at a point eased toward the car.
  const ang = -Math.PI / 2 + d.time * 0.03;
  const dist = 1450;
  (u.uOrbit.value as THREE.Vector4).set(
    cx + Math.cos(ang) * dist,
    cy + Math.sin(ang) * dist,
    1500,
    1.25,
  );
  (u.uTarget.value as THREE.Vector4).set(
    cx + (car.x - cx) * 0.12,
    cy + (car.y - cy) * 0.12,
    car.x,
    car.y,
  );
  u.uCarS.value = d.travel;
  setLabel(u, d.travel);
}

function writeRoad(u: Record<string, THREE.IUniform>, curv: (s: number) => number): void {
  (u.uRoadX.value as Float32Array).set(roadScratch.x);
  (u.uRoadZ.value as Float32Array).set(roadScratch.z);
  (u.uRoadS.value as Float32Array).set(roadScratch.s);
  const k = u.uRoadK.value as Float32Array;
  for (let i = 0; i < ROAD_POINTS; i++) k[i] = curv(roadScratch.s[i]);
}

function updateChase(u: Record<string, THREE.IUniform>, d: Drive): void {
  const track = monzaTrack();
  const at = (s: number) => pointAt(track, s);
  const sCam = d.travel - CHASE.behind;
  const cam = at(sCam);
  const yaw = chaseYaw(at, sCam);
  roadAhead(at, sCam, cam.x, cam.y, yaw, roadScratch);
  writeRoad(u, (s) => {
    const i = Math.floor(((((sCam + s) % track.length) + track.length) % track.length) / track.ds);
    return track.curv[i % track.n];
  });
  u.uTravel.value = sCam;
  u.uCarX.value = roadCentreAt(roadScratch, CHASE.behind);
  // Lean out of the corner a touch with the sideways load.
  const k = track.curv[Math.floor(d.travel / track.ds) % track.n];
  u.uRoll.value = clamp(k * d.speed * d.speed * 0.0006, -0.05, 0.05);
  setLabel(u, d.travel);
}

function updateWinding(u: Record<string, THREE.IUniform>, d: Drive): void {
  const sCam = d.travel;
  const cam = windingAt(sCam);
  const yaw = chaseYaw(windingAt, sCam);
  roadAhead(windingAt, sCam, cam.x, cam.y, yaw, roadScratch);
  const ds = 2;
  writeRoad(u, (s) => (windingHeading(sCam + s + ds) - windingHeading(sCam + s - ds)) / (2 * ds));
  u.uCarX.value = roadCentreAt(roadScratch, CHASE.behind);
  const k = (windingHeading(sCam + 8) - windingHeading(sCam + 6)) / 2;
  u.uRoll.value = clamp(k * d.speed * d.speed * 0.0006, -0.05, 0.05);
}
