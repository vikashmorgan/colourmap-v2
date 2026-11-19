/**
 * Drive: the road worlds drawn (docs/specs/drive-game.md). The track is built in 120 m chunks
 * ahead of the vehicle and dropped behind it, a couple of chunks a frame so nothing stalls; each
 * chunk carries its piece of road (banked, its edges curling up into lips), the ground beside it,
 * its walls (the Coast Road's cliff, rail and sea cliff; the canyon's rock walls and arches), its
 * gates (no obstacles since 2026-11-17), the night roads' glowing lines, and on the night worlds their furniture (lib/art/night-course.ts) with a
 * mirrored copy of every light below the wet road: long, slightly rippled reflections.
 *
 * Chunks hold their vertices relative to their own anchor and are placed relative to the camera
 * each frame (a floating origin), so nothing loses precision however far you drive.
 */

import * as THREE from 'three';
import type { WorldCfg } from '@/lib/art/drive-worlds';
import {
  ARCH_STEP,
  chevronGlow,
  HIGHWAYS,
  highwayShips,
  type NightTheme,
  type Piece,
  palette,
  piecesBetween,
  RING_STEP,
  ringAt,
} from '@/lib/art/night-course';
import {
  CANYON_ARCHES,
  COAST_CLIFF,
  COAST_GATE,
  COAST_RAIL,
  COAST_SEA,
  canyonDepth,
  canyonWallHeight,
  canyonWallU,
  frameAt,
  heightAt,
  PIPE_TOP,
  pipeAt,
  pointAt,
  RACE,
  SKY_LAP,
  SKY_LEVELS,
  SKY_PIPE,
  skyWallHeight,
  skyWallU,
  type TrackWorld,
} from '@/lib/art/track';
import type { Weather } from '@/lib/art/weather';
import { glowSprite } from './vehicles';

export const CHUNK = 120;
/** How tall a building's reflection in the wet road may be (m). */
const MIRROR_CAP = 26;
const AHEAD = 1500;
const BEHIND = 160;
const ROW = 2;

type V3 = [number, number, number];
const lin = (r: number, g: number, b: number): V3 => [r ** 2.2, g ** 2.2, b ** 2.2];

function hash(n: number, k: number): number {
  const s = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smooth1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

/* ── A geometry builder with an optional mirror ────────────── */

class Builder {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  extra: Record<string, { size: number; data: number[] }> = {};
  constructor(extras: Record<string, number> = {}) {
    for (const [k, size] of Object.entries(extras)) this.extra[k] = { size, data: [] };
  }
  vertex(p: V3, n: V3, c: V3, ex: Record<string, number[]> = {}) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.col.push(c[0], c[1], c[2]);
    for (const [k, a] of Object.entries(this.extra)) {
      const v = ex[k] ?? new Array(a.size).fill(0);
      for (let i = 0; i < a.size; i++) a.data.push(v[i] ?? 0);
    }
  }
  /** A quad a-b-c-d (counter-clockwise seen from its front), as two triangles. */
  quad(a: V3, b: V3, c: V3, d: V3, n: V3, col: V3, ex: Record<string, number[][]> = {}) {
    const at = (i: number) => {
      const o: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(ex)) o[k] = v[i];
      return o;
    };
    for (const i of [0, 1, 2, 0, 2, 3]) this.vertex([a, b, c, d][i], n, col, at(i));
  }
  get empty() {
    return this.pos.length === 0;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    for (const [k, a] of Object.entries(this.extra))
      g.setAttribute(k, new THREE.Float32BufferAttribute(a.data, a.size));
    return g;
  }
}

/** A triangle strip grid (rows along, columns across) into a builder, with per-vertex colours. */
function grid(b: Builder, pts: V3[][], cols: V3[][]) {
  for (let i = 0; i + 1 < pts.length; i++) {
    for (let j = 0; j + 1 < pts[i].length; j++) {
      const a = pts[i][j];
      const c = pts[i + 1][j + 1];
      const p1 = pts[i + 1][j];
      const p2 = pts[i][j + 1];
      const n = faceNormal(a, p1, c);
      const tri = (x: V3, y: V3, z: V3, cx: V3, cy: V3, cz: V3) => {
        b.vertex(x, n, cx);
        b.vertex(y, n, cy);
        b.vertex(z, n, cz);
      };
      tri(a, p2, c, cols[i][j], cols[i][j + 1], cols[i + 1][j + 1]);
      tri(a, c, p1, cols[i][j], cols[i + 1][j + 1], cols[i + 1][j]);
    }
  }
}

function faceNormal(a: V3, b: V3, c: V3): V3 {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz);
  // A collapsed face (a boulder's crown, where the ring shrinks to a point) has no normal: a zero
  // one would light as NaN, which the bloom spreads over the whole frame. Call it up.
  if (l < 1e-9) return [0, 1, 0];
  nx /= l;
  ny /= l;
  nz /= l;
  // Up-facing for the ground.
  return ny < 0 ? [-nx, -ny, -nz] : [nx, ny, nz];
}

/* ── Materials for the night furniture ─────────────────────── */

const FACADE_VERTEX = /* glsl */ `
attribute vec3 aWin;
attribute vec3 aCell;
uniform float uMirror;
uniform float uTime;
varying vec3 vCol;
varying vec3 vWin;
varying vec3 vCell;
varying vec3 vNor;
varying float vDist;
void main() {
  vCol = color;
  vWin = aWin;
  vCell = aCell;
  vNor = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  // In the wet road: a slight ripple, growing with the depth below the surface.
  if (uMirror > 0.5) wp.x += sin(wp.z * 0.7 + uTime * 1.3) * 0.12 * (1.0 + abs(aCell.z));
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FACADE_FRAGMENT = /* glsl */ `
uniform float uMirror;
uniform vec3 uFogCol;
uniform float uFogDen;
uniform vec3 uSun;
varying vec3 vCol;
varying vec3 vWin;
varying vec3 vCell;
varying vec3 vNor;
varying float vDist;
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  // Windows as glowing grains on the faces, scattered (no lattice shimmer), fading to their
  // average once they would be smaller than a pixel.
  vec2 cell = vCell.xy / vec2(2.1, 3.1);
  vec2 id = floor(cell);
  vec2 f = fract(cell);
  float lit = step(0.72, h2(id + floor(vCol.r * 97.0)));
  float tone = 0.6 + 0.4 * h2(id + 9.1);
  float win = smoothstep(0.12, 0.24, f.x) * smoothstep(0.88, 0.76, f.x) * smoothstep(0.18, 0.3, f.y) * smoothstep(0.82, 0.7, f.y);
  vec2 fw = fwidth(cell);
  float far = smoothstep(0.25, 0.8, max(fw.x, fw.y));
  float glow = mix(lit * win * tone, 0.28 * 0.3, far) * step(0.5, length(vWin));
  float sun = 0.55 + 0.45 * max(dot(normalize(vNor), uSun), 0.0);
  vec3 col = vCol * sun + vWin * glow * 1.1;
  if (uMirror > 0.5) col = vWin * glow * 0.3;
  col = mix(col, uFogCol * (uMirror > 0.5 ? 0.0 : 1.0), 1.0 - exp(-vDist * uFogDen));
  gl_FragColor = vec4(col, 1.0);
}
`;

const NEON_VERTEX = /* glsl */ `
attribute vec3 aAnim;
uniform float uMirror;
uniform float uTime;
varying vec3 vCol;
varying vec3 vAnim;
varying float vDist;
void main() {
  vCol = color;
  vAnim = aAnim;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  if (uMirror > 0.5) wp.x += sin(wp.z * 0.7 + uTime * 1.3) * 0.12 * (1.0 + abs(aAnim.z));
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const NEON_FRAGMENT = /* glsl */ `
uniform float uMirror;
uniform float uTime;
uniform vec3 uFogCol;
uniform float uFogDen;
varying vec3 vCol;
varying vec3 vAnim;
varying float vDist;
float h1(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
void main() {
  float k = 1.0;
  // 1: an LED chevron, its wave running the way you drive; 2: a flashing sign (Neon District).
  if (vAnim.x > 0.5 && vAnim.x < 1.5) {
    float w = 0.5 + 0.5 * cos(6.2831853 * (0.65 * uTime - vAnim.y / 12.8));
    k = 0.25 + 0.75 * w * w * w;
  } else if (vAnim.x > 1.5) {
    float ph = uTime * 1.3 + h1(vAnim.y) * 7.0;
    k = fract(ph) < 0.55 ? 1.0 : 0.15;
  }
  vec3 col = vCol * k * (uMirror > 0.5 ? 0.42 : 1.0);
  col *= exp(-vDist * uFogDen * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeFacade(mirror: boolean, shared: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: FACADE_VERTEX,
    fragmentShader: FACADE_FRAGMENT,
    uniforms: { ...shared, uMirror: { value: mirror ? 1 : 0 } },
    vertexColors: true,
    transparent: mirror,
    blending: mirror ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !mirror,
    side: THREE.DoubleSide,
  });
}

function makeNeon(mirror: boolean, shared: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: NEON_VERTEX,
    fragmentShader: NEON_FRAGMENT,
    uniforms: { ...shared, uMirror: { value: mirror ? 1 : 0 } },
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/* ── Colours of the ground ─────────────────────────────────── */

function groundColour(cfg: WorldCfg, s: number, u: number, half: number, snow: number): V3 {
  const out = Math.abs(u) - half;
  const n = smooth1(s / 9 + u * 0.13, 3) * 0.6 + smooth1(s / 3.1 + u * 0.7, 5) * 0.4;
  let c: V3;
  if (cfg.id === 'coast') {
    // Packed brown earth, darker ruts where the wheels run, clay at the lips, dry verge beyond.
    const rut = Math.max(
      Math.exp(-(((Math.abs(u) - 3.4) / 0.9) ** 2)),
      Math.exp(-(((Math.abs(u) - 8.2) / 0.9) ** 2)),
    );
    c = lin(0.46 + 0.08 * n, 0.3 + 0.05 * n, 0.17 + 0.03 * n);
    c = c.map((v) => v * (1 - 0.35 * rut)) as V3;
    if (Math.abs(u) > half - 2.5 && out <= 0) c = lin(0.5, 0.27, 0.16);
    if (out > 0) c = lin(0.5 + 0.08 * n, 0.38 + 0.06 * n, 0.22);
  } else if (cfg.id === 'sky') {
    // Red sandstone, a paler band down the middle so the way reads at speed; the pipes darker rock.
    const mid = Math.exp(-((u / 7) ** 2));
    c = lin(0.6 + 0.07 * n, 0.36 + 0.05 * n, 0.26 + 0.03 * n).map(
      (v) => v * 0.85 * (1 + 0.35 * mid),
    ) as V3;
    if (out > 0)
      c = lin(0.5 + 0.08 * n, 0.27 + 0.05 * n, 0.17 + 0.03 * n).map((v) => v * 0.9) as V3;
  } else if (cfg.id === 'canyon') {
    // Packed salt, worn darker where the wheels run; the salt flat beside it.
    const rut = Math.exp(-(((Math.abs(u) - 3) / 1.4) ** 2));
    const k = 0.42;
    c = lin(0.92 + 0.06 * n, 0.83 + 0.05 * n, 0.79 + 0.04 * n).map(
      (v) => v * k * (1 - 0.12 * rut),
    ) as V3;
    if (out > 0) c = lin(0.94, 0.85, 0.81).map((v) => v * k) as V3;
    const rock = canyonDepth(s);
    if (rock > 0 && out > 0)
      c = c.map((v, i) => v + (lin(0.5, 0.28, 0.18)[i] - v) * rock * 0.7) as V3;
  } else {
    // Wet night asphalt, a clear grey you can read (2026-11-17: "the road is invisible like a
    // transparent black shadow, make a road I can see and understand"), its curled-up edges a
    // shade lighter, the ground beyond darker so the road stands out from it. Glowing edge lines
    // and lane dashes are laid on top (see `markings`).
    const tint: V3 =
      cfg.theme === 'chinatown'
        ? [0.095, 0.07, 0.062]
        : cfg.theme === 'gold'
          ? [0.07, 0.055, 0.04]
          : cfg.theme === 'neon'
            ? [0.075, 0.07, 0.1]
            : [0.08, 0.082, 0.095];
    c = tint.map((v) => v * (0.85 + 0.3 * n)) as V3;
    if (Math.abs(u) > half - 2.5 && out <= 0) c = c.map((v) => v * 1.35) as V3;
    if (out > 0) c = c.map((v) => v * 0.45) as V3;
  }
  if (snow > 0) c = c.map((v) => v + (0.75 - v) * snow * 0.6) as V3;
  return c;
}

/* ── The view ──────────────────────────────────────────────── */

interface Chunk {
  i: number;
  group: THREE.Group;
  ax: number;
  ay: number;
}

/** Sky Canyon's bands, low to high (amber, rose, violet), and the lap door's gold: linear, bright. */
const SKY_BANDS: V3[] = [
  [1.4, 0.55, 0.12],
  [1.35, 0.22, 0.6],
  [0.55, 0.28, 1.5],
];
const SKY_DOOR: V3 = [1.6, 1.05, 0.3];

/** Dots of light, as the City of Dreams draws them: soft round glows; a stream's head bright, its
 * tail fading over 14 m, a head every 90 m running ahead of you. */
function makeDots(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: { uFront: { value: 0 }, uScale: { value: 900 } },
    vertexShader: `
      attribute vec3 aCol;
      attribute float aS;
      attribute float aSize;
      uniform float uFront;
      uniform float uScale;
      varying vec3 vCol;
      varying float vGlow;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float behind = fract((uFront - aS) / 90.0) * 90.0;
        vGlow = 0.4 + 1.8 * exp(-behind / 14.0);
        vCol = aCol;
        gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.5), 1.0, 48.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vCol;
      varying float vGlow;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, r);
        gl_FragColor = vec4(vCol * vGlow * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  m.userData.shared = true;
  return m;
}

export interface TrackView {
  group: THREE.Group;
  update(ox: number, oy: number, s: number, t: number, w: Weather): void;
  /** Whether the ground under the current weather has changed enough to rebuild (snow). */
  dispose(): void;
}

export function buildTrackView(cfg: WorldCfg, world: TrackWorld, sunDir: THREE.Vector3): TrackView {
  const track = world.track;
  const def = track.def;
  const theme: NightTheme | null = cfg.theme;
  const group = new THREE.Group();
  const chunks = new Map<number, Chunk>();
  const night = theme !== null;
  // Rock walls either side: the Canyon's (inside it) and Sky Canyon's (everywhere).
  const rockWalls =
    cfg.id === 'canyon'
      ? { u: canyonWallU, h: canyonWallHeight, on: canyonDepth }
      : cfg.id === 'sky'
        ? { u: () => skyWallU(), h: skyWallHeight, on: () => 1 }
        : null;
  const dotMat = cfg.id === 'sky' || cfg.id === 'gold' ? makeDots() : null;
  let streamS = cfg.startS;
  let streamT = 0;
  const shared: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uFogCol: { value: new THREE.Color(0, 0, 0) },
    uFogDen: { value: 0 },
    uSun: { value: new THREE.Vector3(0.3, 0.9, 0.2).normalize() },
  };
  const facade = makeFacade(false, shared);
  const facadeMirror = makeFacade(true, shared);
  const neon = makeNeon(false, shared);
  const neonMirror = makeNeon(true, shared);
  const groundMat = night
    ? new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        // Mostly solid: the lights' mirror still shows through, the road no longer vanishes.
        opacity: 0.95,
        depthWrite: true,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // Two-sided: the grids are laid out in (s, u), which the world's y → −z flip mirrors.
  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  for (const m of [facade, facadeMirror, neon, neonMirror, groundMat, rockMat, solidMat])
    m.userData.shared = true;
  let snowLevel = 0;

  const local = (ax: number, ay: number, x: number, y: number, h: number): V3 => [
    x - ax,
    h,
    -(y - ay),
  ];

  function columns(half: number): number[] {
    const fr = [
      -1, -0.94, -0.85, -0.77, -0.55, -0.3, -0.12, 0, 0.12, 0.3, 0.55, 0.77, 0.85, 0.94, 1,
    ];
    const us = fr.map((f) => f * half);
    if (cfg.id === 'coast')
      return [COAST_CLIFF, -half - 4, ...us, half + 3, COAST_RAIL, COAST_RAIL + 1.5];
    // The canyon's pipes need more columns to curve smoothly up to the rock.
    const outs =
      cfg.id === 'canyon' || cfg.id === 'sky'
        ? [0.6, 2, 4, 6, 8, 10, 11.5, 12.8, 13.9, 14.7, 15.4, 16.2]
        : [0.6, 3, 8, 16];
    return [...outs.map((o) => -half - o).reverse(), ...us, ...outs.map((o) => half + o)];
  }

  /** The night roads' lines: a glowing line along each edge (where the road starts to curl up)
   * and dashes between three lanes, in the world's colours, so the road reads at any speed. */
  const lineMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  lineMat.userData.shared = true;
  const lineCols: { edge: V3; dash: V3 } =
    theme === 'chinatown'
      ? { edge: [1.5, 0.95, 0.35], dash: [0.9, 0.55, 0.25] }
      : theme === 'gold'
        ? { edge: [1.6, 1.05, 0.38], dash: [0.95, 0.65, 0.28] }
        : theme === 'neon'
          ? { edge: [0.3, 1.3, 1.6], dash: [1.2, 0.3, 1.1] }
          : { edge: [0.55, 0.85, 1.4], dash: [0.5, 0.55, 0.65] };
  function markings(
    s0: number,
    s1: number,
    L: (s: number, u: number, h?: number) => V3,
    g: THREE.Group,
  ) {
    const b = new Builder();
    const lift = 0.05;
    const strip = (sa: number, sb: number, u: number, w: number, col: V3) =>
      b.quad(
        L(sa, u - w, lift),
        L(sb, u - w, lift),
        L(sb, u + w, lift),
        L(sa, u + w, lift),
        [0, 1, 0],
        col,
      );
    for (let s = s0; s < s1 - 0.01; s += ROW) {
      const half = def.half(s);
      const edge = half - 2.6;
      strip(s, s + ROW, edge, 0.22, lineCols.edge);
      strip(s, s + ROW, -edge, 0.22, lineCols.edge);
      // Dashes 4 m long every 12 m.
      if (((s % 12) + 12) % 12 < 4) {
        for (const f of [-1 / 3, 1 / 3]) strip(s, s + ROW, f * edge, 0.12, lineCols.dash);
      }
    }
    const m = new THREE.Mesh(b.geometry(), lineMat);
    m.renderOrder = 3;
    g.add(m);
  }

  function buildChunk(i: number): Chunk {
    const s0 = i * CHUNK;
    const s1 = s0 + CHUNK;
    const a = frameAt(track, s0);
    const ax = a.x;
    const ay = a.y;
    const g = new THREE.Group();
    const L = (s: number, u: number, h = 0): V3 => {
      const p = pointAt(track, s, u);
      return local(ax, ay, p.x, p.y, heightAt(track, s, u) + h);
    };

    // The road and the ground beside it.
    const ground = new Builder();
    const pts: V3[][] = [];
    const cols: V3[][] = [];
    for (let s = s0; s <= s1 + 0.01; s += ROW) {
      const half = def.half(s);
      const row: V3[] = [];
      const crow: V3[] = [];
      for (const u of columns(half)) {
        row.push(L(s, u));
        crow.push(groundColour(cfg, s, u, half, snowLevel));
      }
      pts.push(row);
      cols.push(crow);
    }
    grid(ground, pts, cols);
    const gm = new THREE.Mesh(ground.geometry(), groundMat);
    gm.renderOrder = 2;
    g.add(gm);
    if (night) markings(s0, s1, L, g);

    const rock = new Builder();
    if (cfg.id === 'coast') {
      // The cliff on the right, rising 25 to 80 m in strata, and the sea cliff down to the water.
      const cliff: V3[][] = [];
      const cc: V3[][] = [];
      const face: V3[][] = [];
      const fc: V3[][] = [];
      for (let s = s0; s <= s1 + 0.01; s += 4) {
        const H = 25 + 55 * smooth1(s / 64, 4) ** 1.5;
        const base = heightAt(track, s, COAST_CLIFF);
        const row: V3[] = [];
        const crow: V3[] = [];
        for (let k = 0; k <= 6; k++) {
          const f = k / 6;
          const lean = -2 - 6 * f - 3 * smooth1(s / 11 + k, 7);
          const p = pointAt(track, s, COAST_CLIFF + lean);
          row.push(local(ax, ay, p.x, p.y, base + H * f));
          const strata = smooth1(base + H * f, 9) * 0.6 + smooth1(s / 16 + f * 5, 11) * 0.4;
          crow.push(
            lin(
              0.36 + 0.4 * strata * f + 0.1,
              0.16 + 0.24 * strata * f + 0.04,
              0.1 + 0.12 * strata * f,
            ),
          );
        }
        cliff.push(row);
        cc.push(crow);
        const top = heightAt(track, s, COAST_RAIL + 1.5);
        const frow: V3[] = [];
        const fcol: V3[] = [];
        for (let k = 0; k <= 3; k++) {
          const f = k / 3;
          const p = pointAt(track, s, COAST_RAIL + 1.5 + f * (4 + 3 * smooth1(s / 13, 2)));
          frow.push(local(ax, ay, p.x, p.y, top + (COAST_SEA - top) * f));
          fcol.push(lin(0.32 - 0.12 * f, 0.18 - 0.06 * f, 0.12 - 0.04 * f));
        }
        face.push(frow);
        fc.push(fcol);
      }
      grid(rock, cliff, cc);
      grid(rock, face, fc);
      // The rail: a steel band and posts every 4 m.
      const rail = new Builder();
      const steel = lin(0.55, 0.5, 0.5);
      for (let s = s0; s < s1; s += 4) {
        const p0 = L(s, COAST_RAIL, 0.55);
        const p1 = L(s + 4, COAST_RAIL, 0.55);
        const q0 = L(s, COAST_RAIL, 0.8);
        const q1 = L(s + 4, COAST_RAIL, 0.8);
        rail.quad(p0, p1, q1, q0, [0, 0, 1], steel);
        const b0 = L(s, COAST_RAIL, 0);
        const b1 = L(s + 0.12, COAST_RAIL, 0);
        rail.quad(b0, b1, L(s + 0.12, COAST_RAIL, 0.8), L(s, COAST_RAIL, 0.8), [0, 0, 1], steel);
      }
      g.add(new THREE.Mesh(rail.geometry(), rockMat));
    }

    if (rockWalls && rockWalls.on(s0) + rockWalls.on(s1) > 0) {
      // The canyon walls: red-brown rock in strata, leaning back, jagged along the top; a ledge
      // runs back from the top so the walls never look thin from the air.
      for (const side of [1, -1] as const) {
        const wall: V3[][] = [];
        const wc: V3[][] = [];
        for (let s = s0; s <= s1 + 0.01; s += 4) {
          const wu = rockWalls.u(s);
          const H = rockWalls.h(s, side);
          const base = heightAt(track, s, side * wu);
          const row: V3[] = [];
          const crow: V3[] = [];
          for (let k = 0; k <= 7; k++) {
            const f = Math.min(k, 6) / 6;
            const jag = 3 * smooth1(s / 7 + k * 3.1, 13 + side);
            const out = k === 7 ? 25 : 1 + f * (0.25 * H) + jag * f;
            const p = pointAt(track, s, side * (wu + out));
            row.push(local(ax, ay, p.x, p.y, base + H * f + (k === 7 ? 0 : jag * f * 0.3)));
            const strata =
              smooth1((base + H * f) / 2.2, 17) * 0.6 + smooth1(s / 20 + f * 4, 19) * 0.4;
            crow.push(lin(0.5 + 0.25 * strata, 0.24 + 0.15 * strata, 0.14 + 0.08 * strata));
          }
          wall.push(row);
          wc.push(crow);
        }
        grid(rock, wall, wc);
      }
      // The arches over the canyon.
      for (const sa of cfg.id === 'canyon' ? CANYON_ARCHES : []) {
        if (sa < s0 || sa >= s1) continue;
        const R = canyonWallU(sa);
        const e = frameAt(track, sa).e;
        const archRows: V3[][] = [];
        const ac: V3[][] = [];
        for (let k = 0; k <= 16; k++) {
          const th = (Math.PI * k) / 16;
          const row: V3[] = [];
          const crow: V3[] = [];
          for (const [ds, dr] of [
            [-3, 0],
            [-3, 4],
            [3, 4],
            [3, 0],
            [-3, 0],
          ] as const) {
            const rr = R + dr;
            const p = pointAt(track, sa + ds, Math.cos(th) * rr);
            row.push(local(ax, ay, p.x, p.y, e + 14 + Math.sin(th) * rr * 0.9));
            crow.push(lin(0.55, 0.3, 0.2));
          }
          archRows.push(row);
          ac.push(crow);
        }
        grid(rock, archRows, ac);
      }
    }
    if (!rock.empty) g.add(new THREE.Mesh(rock.geometry(), rockMat));

    const solid = new Builder();

    // Gates: two posts with a lamp each, at the race's gates or every kilometre.
    const gateS: { s: number; finish: boolean }[] = [];
    if (cfg.race === 'canyon') {
      for (const s of [RACE.start, ...RACE.checkpoints, RACE.finish])
        gateS.push({ s, finish: s === RACE.finish });
    } else if (cfg.race === 'lap') {
      // Sky Canyon: no posts; the bands of dots and the lap door instead.
      skyDots(s0, s1, g);
    } else {
      for (let s = Math.ceil(s0 / COAST_GATE) * COAST_GATE; s < s1; s += COAST_GATE)
        gateS.push({ s, finish: false });
    }
    for (const { s, finish } of gateS) {
      if (s < s0 || s >= s1 || s <= 0) continue;
      const half = def.half(s);
      for (const side of [1, -1]) {
        const u = side * (half + 1.6);
        const b = L(s, u);
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.12, 5, 8),
          new THREE.MeshLambertMaterial({ color: 0x1a1a1f }),
        );
        post.position.set(b[0], b[1] + 2.5, b[2]);
        g.add(post);
        const lamp = glowSprite(finish ? 0xff3a1a : 0xffe2c0, 1.6, 0.9);
        lamp.position.set(b[0], b[1] + 5.1, b[2]);
        g.add(lamp);
      }
    }

    // The Golden Track has no buildings: only its gold dots.
    if (theme === 'gold') goldDots(s0, s1, g);
    else if (theme) furnish(theme, s0, s1, ax, ay, g, solid);
    if (!solid.empty) g.add(new THREE.Mesh(solid.geometry(), solidMat));
    group.add(g);
    return { i, group: g, ax, ay };
  }

  /* ── Sky Canyon: bands of dots at the three heights, streams running ahead, the lap door ── */

  /** Where a band hb metres over the road's edge sits: up the pipe, then on the rock face (which
   * leans back a quarter of its height). Returns [u, height]. */
  function bandAt(s: number, side: number, hb: number): [number, number] {
    const half = def.half(s);
    const edgeH = heightAt(track, s, side * half);
    const R = SKY_PIPE;
    const pipeTop = pipeAt(R * PIPE_TOP, R);
    if (hb < pipeTop) {
      const x = Math.sqrt(1 - (1 - hb / R) ** 2);
      return [side * (half + x * R - 0.3), edgeH + hb + 0.4];
    }
    const wu = skyWallU();
    const base = heightAt(track, s, side * wu);
    const z = edgeH + hb;
    return [side * (wu + 1 + 0.25 * Math.max(0, z - base) - 0.8), z];
  }

  /**
   * The Golden Track's dots (the City's and Art's gold dots): a row along each edge, a second
   * higher and fainter; a dotted arch over the road every 90 m; now and then a ring of dots
   * standing beside the road; and constellations scattered over the dark ground either side.
   * All on the shared dot material, so the streams run ahead of you as in Sky Canyon.
   */
  function goldDots(s0: number, s1: number, g: THREE.Group) {
    if (!dotMat) return;
    const pos: number[] = [];
    const col: number[] = [];
    const ss: number[] = [];
    const size: number[] = [];
    const a = frameAt(track, s0);
    const put = (s: number, u: number, z: number, c: V3, sz: number) => {
      const p = pointAt(track, s, u);
      pos.push(p.x - a.x, z, -(p.y - a.y));
      col.push(...c);
      ss.push(s);
      size.push(sz);
    };
    const golds: V3[] = [
      [2.2, 1.5, 0.6],
      [2.0, 1.1, 0.35],
      [2.4, 1.9, 1.0],
    ];
    const hashN = (n: number) => {
      const x = Math.sin(n * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let s = Math.ceil(s0 / 2.5) * 2.5; s < s1; s += 2.5) {
      const half = def.half(s);
      for (const side of [1, -1]) {
        const e = heightAt(track, s, side * (half + 1));
        put(s, side * (half + 1), e + 0.5, golds[0], 0.8);
        if (Math.round(s / 2.5) % 2 === 0) put(s, side * (half + 1.6), e + 2.4, golds[1], 0.6);
      }
    }
    // Arches over the road.
    for (let sa = Math.ceil(s0 / 90) * 90; sa < s1; sa += 90) {
      const half = def.half(sa) + 2.5;
      const e = heightAt(track, sa, 0);
      for (let t = 0; t <= Math.PI + 1e-6; t += 0.9 / half)
        put(sa, Math.cos(t) * half, e + Math.sin(t) * half * 0.75, golds[2], 1.2);
    }
    // A ring of dots standing beside the road, every 360 m, alternating sides.
    for (let sr = Math.ceil(s0 / 360) * 360 + 180; sr < s1; sr += 360) {
      const side = Math.round(sr / 360) % 2 ? 1 : -1;
      const uc = side * (def.half(sr) + 14);
      const e = heightAt(track, sr, uc);
      for (let t = 0; t < Math.PI * 2; t += 0.12)
        put(sr + Math.cos(t) * 0.01, uc + Math.cos(t) * 8, e + 9 + Math.sin(t) * 8, golds[1], 1.4);
    }
    // The city of gold (2026-11-19: "more graphic elements to decorate it, like a city around"):
    // towers drawn as dots, their edges and a ring at every floor, set back on both sides; fewer
    // and lower close to the road, tall far off. None stands on the inside of a tight bend, where
    // it would land on the road.
    const P = (s: number, u: number) => {
      const p = pointAt(track, s, u);
      return { x: p.x - a.x, y: -(p.y - a.y) };
    };
    const dot = (x: number, z: number, y: number, c: V3, sz: number, s: number) => {
      pos.push(x, z, y);
      col.push(...c);
      ss.push(s);
      size.push(sz);
    };
    for (let st = Math.ceil(s0 / 45) * 45; st < s1; st += 45) {
      for (const side of [1, -1]) {
        const r = hashN(st * 0.11 + side * 5.7);
        const u = side * (def.half(st) + 30 + r * 110);
        if (def.curv(st) * u > 0.45) continue;
        const c = P(st, u);
        const e = heightAt(track, st, side * def.half(st));
        const w = 8 + hashN(st + side * 3) * 14;
        const d = 8 + hashN(st * 1.7 + side) * 14;
        const H = 20 + (Math.abs(u) / 160) * 90 * (0.5 + hashN(st * 2.3 + side));
        const h = frameAt(track, st).h;
        const ca = Math.cos(h);
        const sa = Math.sin(h);
        const corner = (cx: number, cy: number) => ({
          x: c.x + cx * ca - cy * sa,
          y: c.y - (cx * sa + cy * ca),
        });
        const cs = [
          corner(-w / 2, -d / 2),
          corner(w / 2, -d / 2),
          corner(w / 2, d / 2),
          corner(-w / 2, d / 2),
        ];
        const tint = golds[Math.floor(r * 9) % 3];
        const dim: V3 = [tint[0] * 0.55, tint[1] * 0.55, tint[2] * 0.55];
        for (const q of cs) for (let z = 0; z <= H; z += 1.6) dot(q.x, e + z, q.y, tint, 0.7, st);
        for (let z = 4; z <= H; z += 4.5)
          for (let k = 0; k < 4; k++) {
            const qa = cs[k];
            const qb = cs[(k + 1) % 4];
            const n = Math.ceil(Math.hypot(qb.x - qa.x, qb.y - qa.y) / 2.2);
            for (let i = 1; i < n; i++)
              dot(
                qa.x + ((qb.x - qa.x) * i) / n,
                e + z,
                qa.y + ((qb.y - qa.y) * i) / n,
                dim,
                0.5,
                st,
              );
          }
        // A beacon on the tallest.
        if (H > 70) dot(c.x, e + H + 3, c.y, golds[2], 3, st);
      }
    }
    // Floating forms over the city: a dotted sphere every 600 m, high on alternate sides.
    for (let sf = Math.ceil(s0 / 600) * 600 + 300; sf < s1; sf += 600) {
      const side = Math.round(sf / 600) % 2 ? 1 : -1;
      const u = side * (def.half(sf) + 45);
      if (def.curv(sf) * u > 0.45) continue;
      const c = P(sf, u);
      const e = heightAt(track, sf, 0) + 38;
      const R = 12;
      const N = 260;
      for (let i = 0; i < N; i++) {
        const y = 1 - (2 * (i + 0.5)) / N;
        const rr = Math.sqrt(1 - y * y);
        const t = i * 2.399963;
        dot(c.x + Math.cos(t) * rr * R, e + y * R, c.y + Math.sin(t) * rr * R, golds[0], 0.9, sf);
      }
    }
    // Constellations on the dark ground either side.
    for (let s = Math.ceil(s0 / 4) * 4; s < s1; s += 4)
      for (const side of [1, -1]) {
        const r = hashN(s * 0.37 + side * 11.3);
        if (r > 0.45) continue;
        const u = side * (def.half(s) + 6 + hashN(s + side) * 70);
        put(
          s,
          u,
          heightAt(track, s, u) + 0.15 + hashN(s * 3.1) * 0.6,
          golds[Math.floor(r * 6.6) % 3],
          0.5,
        );
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    const pts = new THREE.Points(geo, dotMat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    g.add(pts);
  }

  function skyDots(s0: number, s1: number, g: THREE.Group) {
    if (!dotMat) return;
    const pos: number[] = [];
    const col: number[] = [];
    const ss: number[] = [];
    const size: number[] = [];
    const a = frameAt(track, s0);
    const put = (s: number, u: number, z: number, c: V3, sz: number) => {
      const p = pointAt(track, s, u);
      pos.push(p.x - a.x, z, -(p.y - a.y));
      col.push(...c);
      ss.push(s);
      size.push(sz);
    };
    // A band a little above each flying height, on both sides, a dot every 5 m.
    SKY_LEVELS.forEach((lift, k) => {
      for (let s = Math.ceil(s0 / 5) * 5; s < s1; s += 5)
        for (const side of [1, -1]) {
          const [u, z] = bandAt(s, side, lift + 4);
          put(s, u, z, SKY_BANDS[k], 0.9);
        }
    });
    // The lap door: three gold frames of dots across the canyon, pillars and an arch.
    for (let sd = Math.ceil(s0 / SKY_LAP) * SKY_LAP; sd < s1; sd += SKY_LAP) {
      if (sd <= 0) continue;
      const W = skyWallU() - 3;
      const e = heightAt(track, sd, 0);
      for (const ds of [-3, 0, 3]) {
        const s = sd + ds;
        for (let h = 0; h <= 60; h += 1.4)
          for (const side of [1, -1]) put(s, side * W, e + h, SKY_DOOR, 1.5);
        for (let t = 0; t <= Math.PI; t += 1.4 / W)
          put(s, Math.cos(t) * W, e + 60 + Math.sin(t) * W * 0.5, SKY_DOOR, 1.5);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    const pts = new THREE.Points(geo, dotMat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    g.add(pts);
  }

  /* ── Night furniture ── */

  function furnish(
    th: NightTheme,
    s0: number,
    s1: number,
    ax: number,
    ay: number,
    g: THREE.Group,
    solid: Builder,
  ) {
    const fb = new Builder({ aWin: 3, aCell: 3 });
    const fm = new Builder({ aWin: 3, aCell: 3 });
    const nb = new Builder({ aAnim: 3 });
    const nm = new Builder({ aAnim: 3 });
    const pal = palette(th);
    // Road-frame basis at s.
    const basis = (s: number) => {
      const f = frameAt(track, s);
      return { f, tx: Math.cos(f.h), ty: Math.sin(f.h), nx: -Math.sin(f.h), ny: Math.cos(f.h) };
    };
    // A point at (s, u) offset along/across by (da, du), h over a base height.
    const P = (
      s: number,
      u: number,
      da: number,
      du: number,
      h: number,
      base: number,
      mirror = false,
    ): V3 => {
      const b = basis(s);
      const c = pointAt(track, s, u);
      const x = c.x + b.tx * da + b.nx * du;
      const y = c.y + b.ty * da + b.ny * du;
      return local(ax, ay, x, y, mirror ? base - h * 1.35 : base + h);
    };
    const groundAt = (s: number, u: number) => heightAt(track, s, u);
    const centre = (s: number) => frameAt(track, s).e;

    /** A box in the road frame: (s, u) its middle, half sizes along and across, from h0 to h1. */
    const box = (
      s: number,
      u: number,
      w: number,
      d: number,
      h0: number,
      h1: number,
      base: number,
      col: V3,
      win: V3 | null,
      mirror = true,
    ) => {
      for (const m of mirror ? [false, true] : [false]) {
        // The mirror only shows the lower floors (the rest falls past the road's edge anyway), and
        // every metre of it is additive fill: cap it.
        if (m && h0 >= MIRROR_CAP) continue;
        const b = m ? fm : fb;
        const top = m ? Math.min(h1, MIRROR_CAP) : h1;
        const c = (da: number, du: number, h: number) =>
          P(s, u, da, du, h === h1 ? top : h, base, m);
        const sides: [number, number, number, number, V3][] = [
          [-w, -d, w, -d, [0, 0, 1]],
          [w, -d, w, d, [1, 0, 0]],
          [w, d, -w, d, [0, 0, -1]],
          [-w, d, -w, -d, [-1, 0, 0]],
        ];
        for (const [a1, d1, a2, d2, n] of sides) {
          const len = Math.hypot(a2 - a1, d2 - d1);
          const ex = {
            aWin: [win ?? [0, 0, 0], win ?? [0, 0, 0], win ?? [0, 0, 0], win ?? [0, 0, 0]],
            aCell: [
              [0, h0, m ? -h0 / 10 : 0],
              [len, h0, m ? -h0 / 10 : 0],
              [len, top, m ? -top / 10 : 0],
              [0, top, m ? -top / 10 : 0],
            ],
          };
          b.quad(c(a1, d1, h0), c(a2, d2, h0), c(a2, d2, h1), c(a1, d1, h1), n, col, ex);
        }
        if (!m) {
          const z = [0, 0, 0];
          b.quad(c(-w, -d, h1), c(w, -d, h1), c(w, d, h1), c(-w, d, h1), [0, 1, 0], col, {
            aWin: [z, z, z, z],
            aCell: [z, z, z, z],
          });
        }
      }
    };

    /** A glowing bar (neon) from a to b (road-frame offsets at s), thickness r, with its mirror. */
    const bar = (
      s: number,
      u: number,
      a: V3,
      b: V3,
      r: number,
      col: V3,
      anim: V3 = [0, 0, 0],
      base = groundAt(s, u),
    ) => {
      for (const m of [false, true]) {
        const t = m ? nm : nb;
        const A = P(s, u, a[0], a[1], a[2], base, m);
        const B = P(s, u, b[0], b[1], b[2], base, m);
        const dx = B[0] - A[0];
        const dy = B[1] - A[1];
        const dz = B[2] - A[2];
        const l = Math.hypot(dx, dy, dz) || 1;
        // Two crossed ribbons, so it reads from every side.
        const up: V3 = Math.abs(dy / l) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const sx = (dy * up[2] - dz * up[1]) / l;
        const sy = (dz * up[0] - dx * up[2]) / l;
        const sz = (dx * up[1] - dy * up[0]) / l;
        const s2: V3 = [(sy * dz - sz * dy) / l, (sz * dx - sx * dz) / l, (sx * dy - sy * dx) / l];
        const animM: V3 = [anim[0], anim[1], m ? -(a[2] + b[2]) / 20 : 0];
        for (const v of [[sx, sy, sz] as V3, s2]) {
          const o = v.map((q) => q * r) as V3;
          t.quad(
            [A[0] - o[0], A[1] - o[1], A[2] - o[2]],
            [B[0] - o[0], B[1] - o[1], B[2] - o[2]],
            [B[0] + o[0], B[1] + o[1], B[2] + o[2]],
            [A[0] + o[0], A[1] + o[1], A[2] + o[2]],
            [0, 1, 0],
            col,
            { aAnim: [animM, animM, animM, animM] },
          );
        }
      }
    };

    /** A small glowing bulb (an octahedron) and its mirror. */
    const bulb = (s: number, u: number, h: number, r: number, col: V3, base: number) => {
      for (const m of [false, true]) {
        const t = m ? nm : nb;
        const c = P(s, u, 0, 0, h, base, m);
        const pts: V3[] = [
          [c[0] + r, c[1], c[2]],
          [c[0], c[1] + r * 1.3, c[2]],
          [c[0] - r, c[1], c[2]],
          [c[0], c[1] - r * 1.3, c[2]],
          [c[0], c[1], c[2] + r],
          [c[0], c[1], c[2] - r],
        ];
        const an: V3 = [0, 0, m ? -h / 10 : 0];
        for (const [i, j] of [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ]) {
          for (const k of [4, 5]) {
            t.vertex(pts[i], [0, 1, 0], col, { aAnim: an });
            t.vertex(pts[j], [0, 1, 0], col, { aAnim: an });
            t.vertex(pts[k], [0, 1, 0], col, { aAnim: an });
          }
        }
      }
    };

    const glowCol = (c: readonly number[], k: number): V3 => [c[0] * k, c[1] * k, c[2] * k];
    const pieces = piecesBetween(th, def, s0, s1);
    for (const p of pieces) drawPiece(p);

    function drawPiece(p: Piece) {
      const s = p.s;
      const half = def.half(s);
      const base = groundAt(s, p.u);
      const c = p.colour;
      switch (p.kind) {
        case 'tower': {
          box(s, p.u, p.w, p.d, 0, p.h, base, [0.012, 0.012, 0.018], glowCol(c, 0.9));
          if (th === 'neon') {
            // Neon edges up the corners toward the track and round the roof.
            const ed = glowCol(c, 2.2);
            const near = -p.side * p.d;
            for (const da of [-p.w, p.w])
              bar(s, p.u, [da, near, 0], [da, near, p.h], 0.09, ed, [0, 0, 0], base);
            bar(s, p.u, [-p.w, near, p.h], [p.w, near, p.h], 0.09, ed, [0, 0, 0], base);
          }
          break;
        }
        case 'shophouse': {
          box(s, p.u, p.w, p.d, 0, p.h, base, [0.03, 0.012, 0.01], glowCol(GOLDISH, 0.8));
          // A dim warm line under each floor's balcony, and a red awning at the shop.
          const face = -p.side * (p.d + 0.15);
          for (let h = 3.4; h < p.h; h += 3.4)
            bar(s, p.u, [-p.w, face, h], [p.w, face, h], 0.05, glowCol(c, 0.7), [0, 0, 0], base);
          bar(
            s,
            p.u,
            [-p.w, face, 2.8],
            [p.w, face, 2.8],
            0.12,
            glowCol(LANTERNISH, 0.9),
            [0, 0, 0],
            base,
          );
          break;
        }
        case 'lamp': {
          const col = glowCol(c, 3.2);
          if (p.u === 0) {
            bulb(s, 0, p.h, 0.35, col, centre(s));
          } else {
            box(s, p.u, 0.08, 0.08, 0, p.h, base, [0.02, 0.02, 0.025], null, false);
            bar(
              s,
              p.u,
              [0, 0, p.h],
              [0, -p.side * 1.6, p.h],
              0.04,
              glowCol(c, 0.25),
              [0, 0, 0],
              base,
            );
            bulb(s, p.u, p.h - 0.15, 0.3, col, base);
            // Reaching out over the road.
            bulb(s, p.u - p.side * 1.6, p.h - 0.15, 0.3, col, base);
          }
          break;
        }
        case 'lights':
        case 'lanterns': {
          const lantern = p.kind === 'lanterns';
          const span = half + 2.5;
          const n = lantern ? 9 : 13;
          const e = centre(s);
          for (let k = 0; k <= n; k++) {
            const f = k / n;
            const u = -span + 2 * span * f;
            const sag = (lantern ? 1.4 : 1.1) * (1 - (2 * f - 1) ** 2);
            const col = lantern ? glowCol(LANTERNISH, 2.2) : glowCol(pal[k % pal.length], 2.6);
            bulb(s, u, p.lift - sag, lantern ? 0.42 : 0.16, col, e);
            if (lantern) bulb(s, u, p.lift - sag + 0.5, 0.12, glowCol(GOLDISH, 1.5), e);
          }
          break;
        }
        case 'gate':
        case 'temple': {
          const e = centre(s);
          const red: V3 = [0.12, 0.012, 0.01];
          const posts = p.kind === 'temple' ? [half + 1.2, half * 0.45] : [half + 1.2];
          for (const off of posts) {
            for (const side of [1, -1]) {
              const u = side * off;
              box(s, u, 0.45, 0.45, 0, p.lift, groundAt(s, u), red, null);
            }
          }
          const span = half + 3.2;
          // Two beams across and the roof over them, its edge in gold light.
          box(s, 0, 0.35, span, p.lift - 1.6, p.lift - 1.1, e, red, null);
          box(s, 0, 0.6, span + 0.8, p.lift, p.lift + 0.6, e, [0.05, 0.01, 0.01], null);
          bar(
            s,
            0,
            [-0.6, -span - 0.8, p.lift + 0.62],
            [-0.6, span + 0.8, p.lift + 0.62],
            0.06,
            glowCol(GOLDISH, 1.8),
            [0, 0, 0],
            e,
          );
          bar(
            s,
            0,
            [-0.4, -span, p.lift - 1.12],
            [-0.4, span, p.lift - 1.12],
            0.04,
            glowCol(GOLDISH, 1.1),
            [0, 0, 0],
            e,
          );
          // A sign in the middle.
          bar(
            s,
            0,
            [-0.5, -1.6, p.lift - 0.45],
            [-0.5, 1.6, p.lift - 0.45],
            0.28,
            glowCol(GOLDISH, 1.2),
            [0, 0, 0],
            e,
          );
          if (p.kind === 'temple') {
            box(s, 0, 0.5, span * 0.6, p.lift + 1.1, p.lift + 1.6, e, [0.05, 0.01, 0.01], null);
            bar(
              s,
              0,
              [-0.5, -span * 0.6, p.lift + 1.62],
              [-0.5, span * 0.6, p.lift + 1.62],
              0.06,
              glowCol(GOLDISH, 1.8),
              [0, 0, 0],
              e,
            );
          }
          break;
        }
        case 'arch': {
          // The great arch: two piers and a half ring of light over the road.
          const e = centre(s);
          const R = p.lift;
          for (const side of [1, -1])
            box(
              s,
              side * R,
              1.2,
              1.2,
              0,
              6,
              groundAt(s, side * R),
              [0.03, 0.025, 0.02],
              glowCol(GOLDISH, 0.5),
            );
          const n = 24;
          for (let k = 0; k < n; k++) {
            const a0 = (Math.PI * k) / n;
            const a1 = (Math.PI * (k + 1)) / n;
            for (const rr of [R, R + 1.4]) {
              bar(
                s,
                0,
                [0, Math.cos(a0) * rr, 6 + Math.sin(a0) * rr],
                [0, Math.cos(a1) * rr, 6 + Math.sin(a1) * rr],
                0.12,
                glowCol(c, 1.6),
                [0, 0, 0],
                e,
              );
            }
          }
          break;
        }
        case 'banner':
          bar(
            s,
            p.u,
            [0, 0, p.lift],
            [0, 0, p.lift + p.h],
            p.w / 2,
            glowCol(c, 0.45),
            [0, 0, 0],
            base,
          );
          break;
        case 'sign':
          bar(
            s,
            p.u,
            [0, 0, p.lift],
            [0, 0, p.lift + p.h],
            Math.max(0.12, p.w / 2),
            glowCol(c, 1.5),
            [p.flash ? 2 : 0, p.id, 0],
            base,
          );
          break;
        case 'panel':
          bar(
            s,
            p.u,
            [-p.w / 2, 0, p.lift + p.h / 2],
            [p.w / 2, 0, p.lift + p.h / 2],
            p.h / 2,
            glowCol(c, 1.1),
            [0, 0, 0],
            base,
          );
          break;
        case 'arrow': {
          // A chevron, pointing the way the bend turns, lit by the wave.
          const col = glowCol(c, 2.4);
          const k = p.side;
          for (let j = 0; j < 3; j++) {
            const da = (j - 1) * 0.9;
            bar(
              s,
              p.u,
              [da - 0.35 * k, 0, p.lift + 0.6],
              [da + 0.35 * k, 0, p.lift],
              0.07,
              col,
              [1, s + j * 3, 0],
              base,
            );
            bar(
              s,
              p.u,
              [da + 0.35 * k, 0, p.lift],
              [da - 0.35 * k, 0, p.lift - 0.6],
              0.07,
              col,
              [1, s + j * 3, 0],
              base,
            );
          }
          box(s, p.u, 0.06, 0.06, 0, p.lift - 0.7, base, [0.02, 0.02, 0.02], null, false);
          break;
        }
        case 'bridge': {
          const e = centre(s);
          const span = half + 28;
          box(s, 0, p.w / 2, span, p.lift, p.lift + p.h, e, [0.02, 0.02, 0.03], glowCol(c, 0.6));
          for (const da of [-p.w / 2 - 0.1, p.w / 2 + 0.1]) {
            bar(s, 0, [da, -span, p.lift], [da, span, p.lift], 0.08, glowCol(c, 2.2), [0, 0, 0], e);
            bar(
              s,
              0,
              [da, -span, p.lift + p.h],
              [da, span, p.lift + p.h],
              0.06,
              glowCol(pal[(p.id + 1) % pal.length], 1.6),
              [0, 0, 0],
              e,
            );
          }
          break;
        }
      }
    }

    // Boost rings standing on the road.
    for (let k = Math.ceil((s0 - 180) / RING_STEP); k * RING_STEP + 180 < s1; k++) {
      if (k < 0) continue;
      const ring = ringAt(th, k, def.half(k * RING_STEP + 180));
      if (!ring) continue;
      const base = groundAt(ring.s, ring.u);
      const n = 28;
      for (let j = 0; j < n; j++) {
        const a0 = (j / n) * Math.PI * 2;
        const a1 = ((j + 1) / n) * Math.PI * 2;
        for (const rr of [ring.r, ring.r - 0.35]) {
          bar(
            ring.s,
            ring.u,
            [0, Math.cos(a0) * rr, ring.lift + Math.sin(a0) * rr],
            [0, Math.cos(a1) * rr, ring.lift + Math.sin(a1) * rr],
            0.07,
            glowCol(ring.colour, rr === ring.r ? 2.6 : 1.2),
            [0, 0, 0],
            base,
          );
        }
      }
    }

    const add = (b: Builder, m: THREE.Material, order: number) => {
      if (b.empty) return;
      const mesh = new THREE.Mesh(b.geometry(), m);
      mesh.renderOrder = order;
      mesh.frustumCulled = false;
      g.add(mesh);
    };
    add(fm, facadeMirror, 1);
    add(nm, neonMirror, 1);
    add(fb, facade, 3);
    add(nb, neon, 4);
    void solid;
    void ARCH_STEP;
  }

  /* ── Moving things: the ship highways (Neon District) ── */

  let ships: THREE.InstancedMesh | null = null;
  if (theme === 'neon') {
    ships = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.4, 0.5, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.8), toneMapped: false }),
      90,
    );
    ships.frustumCulled = false;
    ships.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(ships);
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const pv = new THREE.Vector3();

  return {
    group,
    update(ox, oy, s, t, w) {
      shared.uTime.value = t;
      if (dotMat) {
        // The streams run ahead faster than you (the City's pulses: 1.7 times your pace, plus 8).
        const dt = Math.min(0.1, Math.max(0, t - streamT));
        dotMat.uniforms.uFront.value += Math.max(0, s - streamS) * 1.7 + 8 * dt;
        streamS = s;
        streamT = t;
      }
      (shared.uFogCol.value as THREE.Color).setRGB(...w.fog);
      shared.uFogDen.value = w.fogDensity;
      (shared.uSun.value as THREE.Vector3).copy(sunDir);
      // Snow on the ground: rebuild the ground colours when it has changed enough.
      const snow = Math.round(w.snow * 4) / 4;
      if (snow !== snowLevel) {
        snowLevel = snow;
        for (const c of chunks.values()) {
          group.remove(c.group);
          disposeGroup(c.group);
        }
        chunks.clear();
      }
      const first = Math.floor((s - BEHIND) / CHUNK);
      const last = Math.floor((s + AHEAD) / CHUNK);
      for (const [i, c] of chunks) {
        if (i < first || i > last) {
          group.remove(c.group);
          disposeGroup(c.group);
          chunks.delete(i);
        }
      }
      // Nearest first, two a frame (all of them the first time).
      let built = 0;
      const budget = chunks.size === 0 ? 99 : 2;
      for (let i = Math.max(0, first); i <= last && built < budget; i++) {
        if (chunks.has(i)) continue;
        chunks.set(i, buildChunk(i));
        built++;
      }
      for (const c of chunks.values()) c.group.position.set(c.ax - ox, 0, -(c.ay - oy));
      if (ships) {
        let n = 0;
        for (let lane = 0; lane < HIGHWAYS.length; lane++) {
          const hw = HIGHWAYS[lane];
          for (const ss of highwayShips(lane, t, Math.max(0, s - 100), s + 1100)) {
            if (n >= 90) break;
            const f = frameAt(track, ss);
            const p = pointAt(track, ss, hw.u);
            pv.set(p.x - ox, f.e + hw.lift, -(p.y - oy));
            q.setFromAxisAngle(up, f.h - Math.PI / 2);
            m4.compose(pv, q, one);
            ships.setMatrixAt(n++, m4);
          }
        }
        ships.count = n;
        ships.instanceMatrix.needsUpdate = true;
      }
      void chevronGlow;
    },
    dispose() {
      for (const c of chunks.values()) disposeGroup(c.group);
      chunks.clear();
      disposeGroup(group);
      for (const m of [
        facade,
        facadeMirror,
        neon,
        neonMirror,
        groundMat,
        rockMat,
        solidMat,
        lineMat,
      ])
        m.dispose();
    },
  };
}

const GOLDISH: V3 = [1, 0.75, 0.35];
const LANTERNISH: V3 = [1, 0.22, 0.08];

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Sprite || o instanceof THREE.Points) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        // Shared materials are disposed by their owner; a dispose here is harmless (they rebuild).
        if (!(m as THREE.Material).userData.shared) m.dispose();
      }
    }
  });
}
