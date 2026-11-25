/**
 * Drive, Mars: the enemies as you see them (docs/specs/mars-world.md, "Enemies"). The rules are
 * pure (lib/art/mars-foes.ts); this draws them: the patrol robots (instanced), the giant spider
 * robots stepping on eight legs (each leg a thigh and a shin bent at a raised knee,
 * `legKnee`), the ghosts (instanced, glowing, fading in and out), the dusty manta rays (instanced,
 * their wings beating in the vertex shader, dust trailing under them), the space squids high in
 * the sky with glowing tentacles, the UFOs with their turning rim lights and the beam under a
 * swoop; and what happens when one goes: a flash that swells and fades, a shock ring over the
 * ground, debris flung out and falling, a cloud of dust.
 *
 * Cheap: robots, ghosts and mantas are one instanced mesh each; only the four spiders, five UFOs
 * and eight squids are their own groups. Nothing is drawn far off.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {
  FOE,
  type Foe,
  type FoeKind,
  ghostShown,
  legKnee,
  SPIDER,
  SPIDER_LEGS,
  STRIDE,
  swoopOf,
} from '@/lib/art/mars-foes';
import { part, place } from './mars-parts';
import { glowSprite, glowTexture } from './vehicles';

type Dust = (
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  life: number,
  size: number,
) => void;

/** Something that happened to a foe this moment, to be seen and heard. */
export interface FoeEvent {
  kind: 'boom' | 'hit' | 'poof';
  foe: FoeKind;
  x: number;
  y: number;
  /** Height over the world's zero (m). */
  z: number;
}

const IRON = [0x3a2a24, 0x2e221e, 0x4a3830];
const ROBOT_PAINT = [0xb0582a, 0xa04a22, 0xc06a30];
const HAZARD = [0xd8a030, 0x2a1c18];

/** How far each kind is drawn (m). */
const DRAW: Record<FoeKind, number> = {
  robot: 1400,
  spider: 2600,
  ghost: 900,
  manta: 1800,
  ufo: 4000,
  squid: 5000,
};

/* ── Shapes ── */

/** A patrol robot, facing +x: a boxy body on two treads, a dome head, arms. */
function robotGeo(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1])
    p.push(part(new THREE.BoxGeometry(2.8, 0.9, 0.8), place(0, 0.45, s * 1.05), IRON, 1 + s));
  p.push(part(new THREE.BoxGeometry(2.2, 1.7, 1.9), place(0, 1.75, 0), ROBOT_PAINT, 3));
  p.push(part(new THREE.BoxGeometry(2.25, 0.3, 1.95), place(0, 1.05, 0), HAZARD, 4));
  p.push(
    part(
      new THREE.SphereGeometry(0.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      place(0, 2.6, 0),
      IRON,
      5,
    ),
  );
  for (const s of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(0.5, 0.5, 0.5), place(0.2, 2.2, s * 1.2), IRON, 6));
    p.push(
      part(new THREE.BoxGeometry(1.6, 0.35, 0.35), place(0.9, 1.9, s * 1.3, 0, 0, -0.3), IRON, 7),
    );
  }
  const g = mergeGeometries(p) as THREE.BufferGeometry;
  for (const q of p) q.dispose();
  return g;
}

/** A ghost: a hooded robe of light, tapering to nothing at its foot. */
function ghostGeo(): THREE.BufferGeometry {
  const prof = [
    [0, 9.2],
    [0.9, 8.9],
    [1.35, 8.1],
    [1.3, 7.1],
    [1.05, 6.5],
    [1.6, 5.6],
    [1.9, 3.8],
    [1.7, 1.8],
    [1.0, 0.6],
    [0.2, 0],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(prof, 14);
}

/** A manta ray, facing +x: wide flat wings, a long thin tail, a low hump. */
function mantaGeo(): THREE.BufferGeometry {
  const v = (x: number, y: number, z: number) => [x, y, z];
  const tris = [
    // Top: nose, hump, wing tips, tail root.
    [v(2.4, 0, 0), v(0.2, 0.45, 0), v(-0.4, 0, 4.3)],
    [v(2.4, 0, 0), v(-0.4, 0, -4.3), v(0.2, 0.45, 0)],
    [v(0.2, 0.45, 0), v(-1.9, 0, 0), v(-0.4, 0, 4.3)],
    [v(0.2, 0.45, 0), v(-0.4, 0, -4.3), v(-1.9, 0, 0)],
    // Under: flat.
    [v(2.4, 0, 0), v(-0.4, 0, 4.3), v(-1.9, -0.05, 0)],
    [v(2.4, 0, 0), v(-1.9, -0.05, 0), v(-0.4, 0, -4.3)],
    // The tail: a thin blade.
    [v(-1.9, 0.05, 0.12), v(-6.5, 0, 0), v(-1.9, 0.05, -0.12)],
    [v(-1.9, -0.05, 0.12), v(-1.9, -0.05, -0.12), v(-6.5, 0, 0)],
  ];
  const pos: number[] = [];
  for (const t of tris) for (const p of t) pos.push(...p);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A unit cylinder standing on its foot, for bones stretched between two points. */
const BONE = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0);

/** Lays a bone (a unit cylinder, scaled) from a to b (scene space), r thick. */
function bone(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(len || 1));
  m.scale.set(r, len, r);
}

interface Leg {
  thigh: THREE.Mesh;
  shin: THREE.Mesh;
  knee: THREE.Mesh;
  /** Where its foot is (world: x, y, z up), where the step started and where it lands. */
  foot: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  stepAt: number;
}

interface SpiderRig {
  f: Foe;
  group: THREE.Group;
  body: THREE.Group;
  mat: THREE.MeshLambertMaterial;
  legs: Leg[];
  placed: boolean;
}

function buildSpider(f: Foe, legMat: THREE.Material): SpiderRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x5a3a2c, flatShading: true });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat);
  abdomen.scale.set(4.6, 3, 3.6);
  abdomen.position.set(-4.2, 0.8, 0);
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 8), mat);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), mat);
  head.position.set(2.8, 0.2, 0);
  body.add(abdomen, thorax, head);
  // Six red eyes, and a hazard band round the abdomen.
  const eyeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 0.25, 0.1),
    toneMapped: false,
  });
  for (let i = 0; i < 6; i++) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.26 + (i < 2 ? 0.12 : 0), 6, 5), eyeMat);
    const a = (i % 3) * 0.45 - 0.45;
    e.position.set(4.1, 0.55 + (i < 3 ? 0.35 : -0.15), a * (i < 3 ? 1 : 1.4));
    body.add(e);
  }
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(3.15, 0.25, 5, 24),
    new THREE.MeshLambertMaterial({ color: 0xd8a030 }),
  );
  band.position.set(-4.2, 0.8, 0);
  band.rotation.y = Math.PI / 2;
  body.add(band);
  group.add(body);
  const legs: Leg[] = SPIDER_LEGS.map(() => {
    const thigh = new THREE.Mesh(BONE, legMat);
    const shin = new THREE.Mesh(BONE, legMat);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), legMat);
    group.add(thigh, shin, knee);
    return {
      thigh,
      shin,
      knee,
      foot: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      stepAt: -99,
    };
  });
  return { f, group, body, mat, legs, placed: false };
}

interface UfoRig {
  f: Foe;
  group: THREE.Group;
  rim: THREE.Group;
  beam: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
  hull: THREE.MeshLambertMaterial;
}

function buildUfo(f: Foe): UfoRig {
  const group = new THREE.Group();
  const hull = new THREE.MeshLambertMaterial({ color: 0x8a8a90, flatShading: true });
  const prof = [
    [0.2, -1.2],
    [3, -1.1],
    [7, -0.2],
    [7.2, 0.1],
    [4.5, 0.9],
    [2.4, 1.2],
    [0.2, 1.25],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  group.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 28), hull));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.4, 1.3, 1.1),
      transparent: true,
      opacity: 0.7,
      toneMapped: false,
    }),
  );
  dome.position.y = 1.1;
  group.add(dome);
  const rim = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = glowSprite(i % 2 ? 0xffd060 : 0x60ffd0, 1.8, 0.9);
    (s.material as THREE.SpriteMaterial).fog = false;
    s.position.set(Math.cos(a) * 7.1, 0, Math.sin(a) * 7.1);
    rim.add(s);
  }
  group.add(rim);
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.5, 1.4, 1.1),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 8, 1, 20, 1, true).translate(0, -0.5, 0),
    beamMat,
  );
  beam.position.y = -1;
  group.add(beam);
  return { f, group, rim, beam, beamMat, hull };
}

interface SquidRig {
  f: Foe;
  group: THREE.Group;
  beads: THREE.Points;
  pos: Float32Array;
}

const TENTACLES = 8;
const BEADS = 14;

function buildSquid(f: Foe): SquidRig {
  const group = new THREE.Group();
  const mantle = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 22],
        [2.5, 20],
        [4.2, 15],
        [4.8, 8],
        [4.2, 2],
        [3.4, 0],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      16,
    ),
    new THREE.MeshLambertMaterial({
      color: 0x6a3a6a,
      emissive: new THREE.Color(0.25, 0.08, 0.3),
      fog: false,
      flatShading: true,
    }),
  );
  group.add(mantle);
  // Its fins near the top.
  const finMat = new THREE.MeshLambertMaterial({
    color: 0x7a4a7a,
    fog: false,
    side: THREE.DoubleSide,
  });
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.CircleGeometry(4, 3), finMat);
    fin.position.set(s * 4.5, 18, 0);
    fin.rotation.set(0, 0, s * 0.4);
    group.add(fin);
  }
  const glow = glowSprite(0xc060ff, 40, 0.35);
  (glow.material as THREE.SpriteMaterial).fog = false;
  glow.position.y = 6;
  group.add(glow);
  const pos = new Float32Array(TENTACLES * BEADS * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const beads = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      map: glowTexture(),
      color: new THREE.Color(0.6, 1.6, 2.2),
      size: 2.6,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  beads.frustumCulled = false;
  group.add(beads);
  return { f, group, beads, pos };
}

/* ── Explosions ── */

interface Fade {
  obj: THREE.Object3D;
  mat: THREE.Material & { opacity: number };
  x: number;
  y: number;
  z: number;
  born: number;
  life: number;
  from: number;
  to: number;
  peak: number;
  /** Lying flat on the ground (a shock ring). */
  flat: boolean;
}

const CHUNKS = 120;

export class FoeView {
  private group = new THREE.Group();
  private robots: THREE.InstancedMesh;
  private eyes: THREE.InstancedMesh;
  private ghosts: THREE.InstancedMesh;
  private mantas: THREE.InstancedMesh;
  private spiders: SpiderRig[] = [];
  private ufos: UfoRig[] = [];
  private squids: SquidRig[] = [];
  private robotIds: Foe[] = [];
  private ghostIds: Foe[] = [];
  private mantaIds: Foe[] = [];
  private uTime = { value: 0 };
  private fades: Fade[] = [];
  private chunks: THREE.InstancedMesh;
  private chunk = Array.from({ length: CHUNKS }, () => ({
    x: 0,
    y: 0,
    z: -1e5,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    life: 0,
    size: 1,
  }));
  private nextChunk = 0;
  private dustDebt = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private legMat = new THREE.MeshLambertMaterial({ color: 0x2e221e, flatShading: true });
  private ringGeo = new THREE.RingGeometry(0.8, 1, 48);

  constructor(
    private scene: THREE.Scene,
    foes: readonly Foe[],
    private dust: Dust,
    private height: (x: number, y: number) => number,
  ) {
    scene.add(this.group);
    this.robotIds = foes.filter((f) => f.kind === 'robot');
    this.ghostIds = foes.filter((f) => f.kind === 'ghost');
    this.mantaIds = foes.filter((f) => f.kind === 'manta');
    this.robots = new THREE.InstancedMesh(
      robotGeo(),
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
      Math.max(1, this.robotIds.length),
    );
    this.eyes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.2, 0.22, 1.1).translate(0.82, 2.75, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      Math.max(1, this.robotIds.length),
    );
    this.ghosts = new THREE.InstancedMesh(
      ghostGeo(),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.55, 0.95, 1.1),
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      Math.max(1, this.ghostIds.length),
    );
    const mantaMat = new THREE.MeshLambertMaterial({ color: 0x9a6a4a, side: THREE.DoubleSide });
    const uTime = this.uTime;
    mantaMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
        float ph = float(gl_InstanceID) * 1.7;
        #else
        float ph = 0.0;
        #endif
        transformed.y += sin(uTime * 2.1 + ph - abs(position.z) * 0.35) * abs(position.z) * 0.22;`,
      );
    };
    this.mantas = new THREE.InstancedMesh(mantaGeo(), mantaMat, Math.max(1, this.mantaIds.length));
    for (const im of [this.robots, this.eyes, this.ghosts, this.mantas]) {
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.setColorAt(0, new THREE.Color(1, 1, 1));
      this.group.add(im);
    }
    for (const f of foes) {
      if (f.kind === 'spider') {
        const r = buildSpider(f, this.legMat);
        this.spiders.push(r);
        this.group.add(r.group);
      } else if (f.kind === 'ufo') {
        const r = buildUfo(f);
        this.ufos.push(r);
        this.group.add(r.group);
      } else if (f.kind === 'squid') {
        const r = buildSquid(f);
        this.squids.push(r);
        this.group.add(r.group);
      }
    }
    this.chunks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.6, 0.8),
      new THREE.MeshLambertMaterial({
        color: 0x3a2a24,
        emissive: new THREE.Color(0.5, 0.18, 0.04),
      }),
      CHUNKS,
    );
    this.chunks.frustumCulled = false;
    this.chunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.chunks);
  }

  /** What happened: a wreck goes up (flash, shock ring, debris, dust), a hit sparks, a manta or a
   * ghost goes in a puff. */
  events(evs: readonly FoeEvent[], t: number) {
    for (const e of evs) {
      if (e.kind === 'boom') {
        const big = e.foe === 'spider' ? 2.6 : e.foe === 'ufo' ? 1.6 : 1;
        // The flash: a white core gone in a quarter second, an orange ball swelling and fading.
        this.fade(glowSprite(0xfff0d0, 6, 1), e, t, 0.28, 6 * big, 22 * big, 1, false);
        this.fade(glowSprite(0xff8a30, 8, 0.9), e, t, 1.1, 8 * big, 46 * big, 0.9, false);
        // The shock ring over the ground.
        const ring = new THREE.Mesh(
          this.ringGeo,
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(1.6, 1.0, 0.55),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        const g = this.height(e.x, e.y);
        this.fade(ring, { ...e, z: g + 0.4 }, t, 0.8, 2, 34 * big, 0.8, true);
        // Debris flung out and falling.
        const n = Math.round(14 * big);
        for (let i = 0; i < n; i++) {
          const c = this.chunk[this.nextChunk];
          this.nextChunk = (this.nextChunk + 1) % CHUNKS;
          const a = Math.random() * Math.PI * 2;
          const s = (6 + Math.random() * 14) * Math.sqrt(big);
          Object.assign(c, {
            x: e.x,
            y: e.y,
            z: e.z + 1,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            vz: 6 + Math.random() * 14 * Math.sqrt(big),
            spin: (Math.random() - 0.5) * 12,
            life: 2.2 + Math.random(),
            size: (0.5 + Math.random() * 0.9) * Math.sqrt(big),
          });
        }
        for (let i = 0; i < 22 * big; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 8 + Math.random() * 12;
          this.dust(
            e.x,
            e.y,
            g + 0.5,
            Math.cos(a) * v,
            Math.sin(a) * v,
            2 + Math.random() * 5,
            3,
            4 + big * 2,
          );
        }
      } else if (e.kind === 'hit') {
        this.fade(glowSprite(0xffc070, 4, 0.9), e, t, 0.45, 4, 10, 0.9, false);
      } else {
        const ghost = e.foe === 'ghost';
        this.fade(
          glowSprite(ghost ? 0x80f0ff : 0xffb080, 6, 0.8),
          e,
          t,
          ghost ? 1.4 : 0.7,
          6,
          ghost ? 26 : 14,
          0.8,
          false,
        );
        if (!ghost)
          for (let i = 0; i < 12; i++)
            this.dust(
              e.x,
              e.y,
              e.z,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              Math.random() * 3,
              2.2,
              3,
            );
      }
    }
  }

  private fade(
    obj: THREE.Sprite | THREE.Mesh,
    at: { x: number; y: number; z: number },
    t: number,
    life: number,
    from: number,
    to: number,
    peak: number,
    flat: boolean,
  ) {
    const mat = obj.material as THREE.Material & { opacity: number };
    if (mat instanceof THREE.SpriteMaterial) mat.fog = false;
    this.group.add(obj);
    this.fades.push({ obj, mat, x: at.x, y: at.y, z: at.z, born: t, life, from, to, peak, flat });
  }

  /** Places every foe near you and moves the explosions on. */
  update(foes: readonly Foe[], ox: number, oy: number, t: number, dt: number) {
    this.uTime.value = t;
    const near = (f: Foe) => Math.hypot(f.x - ox, f.y - oy) < DRAW[f.kind];
    const flash = (f: Foe) => Math.max(0, 1 - (t - f.hitAt) / 0.25);

    // Robots: bobbing on their treads, a red eye that burns brighter when it rolls at you.
    let n = 0;
    for (const f of this.robotIds) {
      if (f.dead !== null || !near(f)) continue;
      const g = this.height(f.x, f.y);
      const bob = Math.abs(Math.sin(t * 9 + f.seed * 20)) * 0.12;
      this.q.setFromEuler(this.e.set(0, f.h, Math.sin(t * 9 + f.seed) * 0.03));
      this.m.compose(this.v.set(f.x - ox, g + bob, -(f.y - oy)), this.q, this.s.set(1.3, 1.3, 1.3));
      this.robots.setMatrixAt(n, this.m);
      this.eyes.setMatrixAt(n, this.m);
      const k = 1 + 2.5 * flash(f);
      this.robots.setColorAt(n, this.c.setRGB(k, k, k));
      this.eyes.setColorAt(n, this.c.setRGB(f.chasing ? 3 : 1.6, 0.2, 0.08));
      n++;
    }
    this.robots.count = n;
    this.eyes.count = n;
    this.robots.instanceMatrix.needsUpdate = true;
    this.eyes.instanceMatrix.needsUpdate = true;
    if (this.robots.instanceColor) this.robots.instanceColor.needsUpdate = true;
    if (this.eyes.instanceColor) this.eyes.instanceColor.needsUpdate = true;

    // Ghosts: fading in and out, turning slowly, swaying.
    n = 0;
    for (const f of this.ghostIds) {
      if (f.dead !== null || !near(f)) continue;
      const g = this.height(f.x, f.y);
      this.q.setFromEuler(
        this.e.set(Math.sin(t * 0.7 + f.seed * 9) * 0.08, t * 0.3 + f.seed * 6, 0),
      );
      const breathe = 1 + 0.05 * Math.sin(t * 1.3 + f.seed * 5);
      this.m.compose(
        this.v.set(f.x - ox, g + f.z, -(f.y - oy)),
        this.q,
        this.s.set(breathe, breathe, breathe),
      );
      this.ghosts.setMatrixAt(n, this.m);
      const k = ghostShown(f, t);
      this.ghosts.setColorAt(n, this.c.setRGB(k, k, k));
      n++;
    }
    this.ghosts.count = n;
    this.ghosts.instanceMatrix.needsUpdate = true;
    if (this.ghosts.instanceColor) this.ghosts.instanceColor.needsUpdate = true;

    // Mantas: banking with their weave, dust streaming under them.
    n = 0;
    this.dustDebt += dt * 26;
    for (const f of this.mantaIds) {
      if (f.dead !== null || !near(f)) continue;
      const g = this.height(f.x, f.y);
      this.q.setFromEuler(this.e.set(Math.sin(t * 0.7 + f.seed * 37) * 0.25, f.h, 0, 'YXZ'));
      this.m.compose(this.v.set(f.x - ox, g + f.z, -(f.y - oy)), this.q, this.s.set(1.2, 1.2, 1.2));
      this.mantas.setMatrixAt(n, this.m);
      n++;
      if (this.dustDebt >= 1 && Math.hypot(f.x - ox, f.y - oy) < 500) {
        this.dustDebt -= 1;
        this.dust(
          f.x - Math.cos(f.h) * 3,
          f.y - Math.sin(f.h) * 3,
          g + 0.3,
          -Math.cos(f.h) * 4 + (Math.random() - 0.5) * 3,
          -Math.sin(f.h) * 4 + (Math.random() - 0.5) * 3,
          0.5 + Math.random() * 1.5,
          2.5 + Math.random(),
          3 + Math.random() * 2,
        );
      }
    }
    this.dustDebt = Math.min(this.dustDebt, 3);
    this.mantas.count = n;
    this.mantas.instanceMatrix.needsUpdate = true;

    for (const r of this.spiders) this.updateSpider(r, ox, oy, t, near(r.f));
    for (const r of this.ufos) {
      const f = r.f;
      r.group.visible = f.dead === null && near(f);
      if (!r.group.visible) continue;
      const g = this.height(f.x, f.y);
      r.group.position.set(f.x - ox, g + f.z, -(f.y - oy));
      r.group.rotation.set(Math.sin(t * 0.6 + f.seed * 9) * 0.12, 0, Math.cos(t * 0.5) * 0.1);
      r.rim.rotation.y = t * 1.6;
      const low = swoopOf(f, t);
      r.beamMat.opacity = 0.35 * Math.max(0, (low - 0.3) / 0.7);
      r.beam.scale.set(1, Math.max(1, f.z - 1), 1);
      r.hull.emissive.setRGB(flash(f) * 2, flash(f) * 2, flash(f) * 2);
    }
    for (const r of this.squids) this.updateSquid(r, ox, oy, t);

    // Debris tumbling down, stopping on the ground.
    for (let i = 0; i < CHUNKS; i++) {
      const c = this.chunk[i];
      if (c.life > 0) {
        c.life -= dt;
        const g = this.height(c.x, c.y);
        if (c.z > g + 0.3) {
          c.vz -= 9.8 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.z = Math.max(g + 0.3, c.z + c.vz * dt);
        }
      }
      const s = c.life > 0 ? c.size * Math.min(1, c.life * 2) : 0;
      this.q.setFromEuler(this.e.set(c.spin * c.life, c.spin * c.life * 0.7, 0));
      this.m.compose(this.v.set(c.x - ox, c.z, -(c.y - oy)), this.q, this.s.set(s, s, s));
      this.chunks.setMatrixAt(i, this.m);
    }
    this.chunks.instanceMatrix.needsUpdate = true;

    this.fades = this.fades.filter((f) => {
      const k = (t - f.born) / f.life;
      if (k >= 1) {
        this.group.remove(f.obj);
        f.mat.dispose();
        return false;
      }
      f.obj.position.set(f.x - ox, f.z, -(f.y - oy));
      const size = f.from + (f.to - f.from) * Math.sqrt(k);
      f.obj.scale.set(size, size, f.flat ? 1 : size);
      f.mat.opacity = f.peak * (1 - k) * (1 - k);
      return true;
    });
  }

  /** A spider: its body riding high and swaying, each foot planted until it lags too far behind
   * its rest, then stepping there in an arc while the other group stands. */
  private updateSpider(r: SpiderRig, ox: number, oy: number, t: number, shown: boolean) {
    const f = r.f;
    r.group.visible = f.dead === null && shown;
    if (!r.group.visible) {
      r.placed = false;
      return;
    }
    const g = this.height(f.x, f.y);
    const z = g + SPIDER.body + Math.sin(t * 4 + f.seed) * 0.35;
    r.body.position.set(f.x - ox, z, -(f.y - oy));
    r.body.rotation.set(Math.sin(t * 2 + f.seed) * 0.04, f.h, Math.sin(t * 4) * 0.03, 'YXZ');
    const fl = Math.max(0, 1 - (t - f.hitAt) / 0.3) * 2;
    r.mat.emissive.setRGB(fl, fl * 0.6, fl * 0.3);
    const c = Math.cos(f.h);
    const s = Math.sin(f.h);
    const stepping = [false, false];
    for (const [i, leg] of r.legs.entries()) {
      const L = SPIDER_LEGS[i];
      if (leg.stepAt > 0 && t - leg.stepAt < STRIDE.time) stepping[L.group] = true;
    }
    for (const [i, leg] of r.legs.entries()) {
      const L = SPIDER_LEGS[i];
      // Its rest a little ahead (the way it walks), on the ground.
      const rx = f.x + (L.fx + 1.5) * c - L.fy * s;
      const ry = f.y + (L.fx + 1.5) * s + L.fy * c;
      const rest = new THREE.Vector3(rx, ry, this.height(rx, ry));
      if (!r.placed) {
        leg.foot.copy(rest);
        leg.stepAt = -99;
      }
      const k = (t - leg.stepAt) / STRIDE.time;
      if (k < 1 && leg.stepAt > 0) {
        leg.foot.lerpVectors(leg.from, leg.to, k);
        leg.foot.z += Math.sin(k * Math.PI) * STRIDE.lift;
      } else {
        if (leg.stepAt > 0) leg.foot.copy(leg.to);
        const lag = Math.hypot(leg.foot.x - rest.x, leg.foot.y - rest.y);
        if (lag > STRIDE.reach && !stepping[1 - L.group]) {
          leg.from.copy(leg.foot);
          leg.to.copy(rest);
          leg.stepAt = t;
          stepping[L.group] = true;
        }
      }
      const hx = f.x + L.hx * c - L.hy * s;
      const hy = f.y + L.hx * s + L.hy * c;
      const hip: [number, number, number] = [hx, hy, z + 0.4];
      const foot: [number, number, number] = [leg.foot.x, leg.foot.y, leg.foot.z];
      const knee = legKnee(hip, foot, 9, 11);
      const H = new THREE.Vector3(hip[0] - ox, hip[2], -(hip[1] - oy));
      const K = new THREE.Vector3(knee[0] - ox, knee[2], -(knee[1] - oy));
      const F = new THREE.Vector3(foot[0] - ox, foot[2], -(foot[1] - oy));
      bone(leg.thigh, H, K, 0.9);
      bone(leg.shin, K, F, 0.55);
      leg.knee.position.copy(K);
    }
    r.placed = true;
  }

  /** A squid: high in the sky, mantle up, its tentacles trailing below in slow waves of light. */
  private updateSquid(r: SquidRig, ox: number, oy: number, t: number) {
    const f = r.f;
    r.group.visible = Math.hypot(f.x - ox, f.y - oy) < DRAW.squid;
    if (!r.group.visible) return;
    r.group.position.set(f.x - ox, f.z, -(f.y - oy));
    // Pulsing as it swims: the mantle squeezes and the whole leans along its way.
    const pulse = 1 + 0.06 * Math.sin(t * 1.1 + f.seed * 9);
    r.group.scale.set(pulse, 1 / pulse, pulse);
    r.group.rotation.set(0.35, f.h, 0, 'YXZ');
    let i = 0;
    for (let k = 0; k < TENTACLES; k++) {
      const a = (k / TENTACLES) * Math.PI * 2;
      for (let b = 0; b < BEADS; b++) {
        const d = b / (BEADS - 1);
        const sway = Math.sin(t * 1.4 - d * 4 + k) * (1 + d * 4);
        const rr = 2.8 + d * 2.5;
        r.pos[i++] = Math.cos(a) * rr + Math.cos(a + 1.6) * sway;
        r.pos[i++] = -d * (18 + 4 * Math.sin(k * 2.1));
        r.pos[i++] = Math.sin(a) * rr + Math.sin(a + 1.6) * sway;
      }
    }
    r.beads.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
        if (o.geometry !== BONE) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    this.ringGeo.dispose();
  }
}

/** How big each kind goes up (for the boom's sound). */
export function boomSize(kind: FoeKind): number {
  return kind === 'spider' ? 2.5 : kind === 'ufo' ? 1.6 : 1;
}

export { FOE };
