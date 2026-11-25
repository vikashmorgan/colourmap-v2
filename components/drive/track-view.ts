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
import { LOWER } from '@/lib/art/chinatown-paths';
import { CT_STOREY, CT_TALL_FLOORS, ctCellRect, ctWindows } from '@/lib/art/chinatown-street';
import { VISTA, vistaAt, vistasBetween } from '@/lib/art/chinatown-vista';
import type { WorldCfg } from '@/lib/art/drive-worlds';
import { LAKE_CITY, lakeAnchor, lakeNear } from '@/lib/art/lake-city';
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
  DECK,
  frameAt,
  heightAt,
  LOWER_RAIL,
  LOWER_SLAB,
  laneHalf,
  lowerFloor,
  onDeck,
  PIPE_TOP,
  pipeAt,
  pointAt,
  RACE,
  ROOF_OPEN,
  SKY_LAP,
  SKY_LEVELS,
  SKY_PIPE,
  skyWallHeight,
  skyWallU,
  type TrackWorld,
  twistPose,
  voidLeft,
} from '@/lib/art/track';
import { underTint } from '@/lib/art/undertown';
import type { Weather } from '@/lib/art/weather';
import { nearTwist, STRAIGHT } from '@/lib/art/wreck';
import { ctSignMaterial, SignBuilder } from './chinatown-signs';
import { buildLakeCity } from './lake-city-view';
import { glowSprite } from './vehicles';

export const CHUNK = 120;
/** The underpass's void as drawn: the quay past the track's far kerb (m), the lake's level, and how
 * far right the water reaches (u). Drawn once the floor is this far down (VOID_SHOWS m). */
const VOID = { QUAY: 30, LAKE: -12.4, FAR: 240 };
const VOID_SHOWS = 0.05;
/** The lake city is built while you are this near its anchor (m along the road). */
const LAKE_SEEN = 2300;
/** The arcade's city is a skyline of its own (seeded apart), its water from this far out (m). */
const VISTA_SEED = 500;
const VISTA_NEAR = 60;
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

/** A triangle strip grid (rows along, columns across) into a builder, with per-vertex colours.
 * `smooth` lights it with normals averaged over the grid (or given, one per point), so a banked, curving road reads as one
 * surface, not a patchwork of flat facets (2026-11-22: "the track floor is not smooth, some parts
 * seem divided like shades of black"); rock keeps its crisp faces. */
function grid(b: Builder, pts: V3[][], cols: V3[][], smooth: boolean | V3[][] = false) {
  const nrm = smooth === true ? gridNormals(pts) : smooth || null;
  for (let i = 0; i + 1 < pts.length; i++) {
    for (let j = 0; j + 1 < pts[i].length; j++) {
      const a = pts[i][j];
      const c = pts[i + 1][j + 1];
      const p1 = pts[i + 1][j];
      const p2 = pts[i][j + 1];
      const n = faceNormal(a, p1, c);
      const N = (r: number, q: number) => (nrm ? nrm[r][q] : n);
      b.vertex(a, N(i, j), cols[i][j]);
      b.vertex(p2, N(i, j + 1), cols[i][j + 1]);
      b.vertex(c, N(i + 1, j + 1), cols[i + 1][j + 1]);
      b.vertex(a, N(i, j), cols[i][j]);
      b.vertex(c, N(i + 1, j + 1), cols[i + 1][j + 1]);
      b.vertex(p1, N(i + 1, j), cols[i + 1][j]);
    }
  }
}

/** Each grid point's normal from its neighbours along and across (up-facing, as `faceNormal`). */
export function gridNormals(pts: V3[][]): V3[][] {
  const out: V3[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const row: V3[] = [];
    for (let j = 0; j < pts[i].length; j++) {
      const a = pts[Math.max(0, i - 1)][j];
      const b = pts[Math.min(pts.length - 1, i + 1)][j];
      const c = pts[i][Math.max(0, j - 1)];
      const d = pts[i][Math.min(pts[i].length - 1, j + 1)];
      const o: V3 = [0, 0, 0];
      row.push(
        faceNormal(
          o,
          [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
          [d[0] - c[0], d[1] - c[1], d[2] - c[2]],
        ),
      );
    }
    out.push(row);
  }
  return out;
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
    // A light grain only on the Golden Track, so the road never breaks into dark patches.
    const grain = cfg.theme === 'gold' ? 0.1 : 0.3;
    c = tint.map((v) => v * (1 - grain / 2 + grain * n)) as V3;
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

/** A fire tunnel: a ring of burners every RING m, BURNERS round each arch, FLAMES particles a
 * burner, each flame LONG m out from its nozzle over 1 / RATE s. */
export const FIRE = { RING: 20, BURNERS: 11, FLAMES: 52, LONG: 22, RATE: 0.85 };

/** Rings of fire on the golden arches (2026-11-22: "big ass rings of shooting fires", "real big
 * fire shots, not small mini gases"): every arch in a tunnel carries burners round its curve, each
 * shooting a great tongue of flame out from the arch, white-yellow at the nozzle, orange, then red
 * thinning to smoke. Idle they lick low; as you reach an arch it roars out to full length. */
function makeFire(uTime: THREE.IUniform): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime,
      uYou: { value: 0 },
      uScale: { value: 900 },
      uLong: { value: FIRE.LONG },
      uRate: { value: FIRE.RATE },
    },
    vertexShader: `
      attribute vec3 aDir;
      attribute float aPhase;
      attribute float aS;
      attribute float aStyle;
      attribute float aB;
      uniform float uTime;
      uniform float uYou;
      uniform float uScale;
      uniform float uLong;
      uniform float uRate;
      varying float vK;
      varying float vRoar;
      varying float vStyle;
      void main() {
        vStyle = aStyle;
        // 0 roar, 1 crown (in toward you), 2 wave (round the arch), 3 blue lances.
        float rate = aStyle > 2.5 && aStyle < 3.5 ? uRate * 1.6 : aStyle > 0.5 && aStyle < 1.5 ? uRate * 1.3 : uRate;
        float k = fract(uTime * rate + aPhase);
        vK = k;
        float d = aS - uYou;
        float roar = smoothstep(90.0, 30.0, d) * smoothstep(-30.0, -8.0, d);
        float reach = 0.28 + 0.72 * roar;
        float len = uLong;
        float cone = (1.2 + 4.5 * k);
        float lift = 2.5;
        vec3 dir = aDir;
        if (aStyle > 4.5) {
          // Red: the superloop's side fire, long thick red jets out from both edges.
          len = uLong * 1.6;
          cone = 1.4 + 5.0 * k;
          lift = 1.5;
          reach = 0.6 + 0.4 * roar;
        } else if (aStyle > 3.5) {
          // Blaze: the deck's stronger fire, tall thick columns that never die right down.
          len = uLong * 1.9;
          cone = 1.8 + 6.5 * k;
          lift = 4.0;
          reach = 0.55 + 0.45 * roar;
        } else if (aStyle > 0.5 && aStyle < 1.5) {
          // Crown: jets in toward the arch's middle, a ring of fire closing round you.
          dir = -aDir;
          len = uLong * 0.5;
          cone = 0.6 + 2.0 * k;
          lift = 0.6;
          reach = 0.2 + 0.8 * roar;
        } else if (aStyle > 1.5 && aStyle < 2.5) {
          // Wave: a swell of fire running round the arch, foot to foot and back, slow.
          float w = 0.5 + 0.5 * sin(uTime * 2.2 - aB * 6.283 + aS * 0.05);
          reach *= 0.25 + 0.95 * w * w;
          len = uLong * 1.1;
        } else if (aStyle > 2.5) {
          // Blue: long thin lances of gas.
          len = uLong * 1.35;
          cone = 0.3 + 1.2 * k;
          lift = 0.4;
        }
        vRoar = roar;
        vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
        vec3 up2 = normalize(cross(side, dir));
        float ang = aPhase * 191.0 + uTime * 1.7;
        vec3 p = position + dir * (k * len * reach * (0.75 + 0.5 * fract(aPhase * 17.0)))
          + (side * cos(ang) + up2 * sin(ang)) * cone * k * reach * fract(aPhase * 7.3)
          + vec3(0.0, lift * k * k * reach, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float big = aStyle > 4.5 ? 1.4 : aStyle > 3.5 ? 1.5 : aStyle > 2.5 ? 0.55 : 1.0;
        gl_PointSize = clamp((1.6 + 10.0 * k) * big * reach * uScale / max(-mv.z, 0.5), 1.0, 140.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vK;
      varying float vRoar;
      varying float vStyle;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, r) * pow(1.0 - vK, 1.2) * (0.4 + 0.6 * vRoar) * 0.55;
        vec3 c;
        if (vStyle > 4.5) {
          vec3 core = vec3(2.3, 0.9, 0.3);
          vec3 red = vec3(2.0, 0.12, 0.03);
          vec3 deep = vec3(0.6, 0.02, 0.02);
          c = vK < 0.2 ? mix(core, red, vK / 0.2) : mix(red, deep, (vK - 0.2) / 0.8);
          a *= 1.5;
        } else if (vStyle > 3.5) {
          vec3 core = vec3(2.4, 2.0, 1.1);
          vec3 orange = vec3(2.2, 0.75, 0.12);
          vec3 red = vec3(0.9, 0.12, 0.02);
          c = vK < 0.25 ? mix(core, orange, vK / 0.25) : mix(orange, red, (vK - 0.25) / 0.75);
          a *= 1.4;
        } else if (vStyle > 2.5) {
          vec3 core = vec3(0.85, 0.95, 1.7);
          vec3 blue = vec3(0.12, 0.38, 1.8);
          vec3 violet = vec3(0.45, 0.15, 1.1);
          c = vK < 0.25 ? mix(core, blue, vK / 0.25) : mix(blue, violet, (vK - 0.25) / 0.75);
        } else if (vStyle > 1.5) {
          vec3 core = vec3(2.0, 0.9, 0.25);
          vec3 red = vec3(1.4, 0.18, 0.04);
          vec3 deep = vec3(0.45, 0.03, 0.02);
          c = vK < 0.3 ? mix(core, red, vK / 0.3) : mix(red, deep, (vK - 0.3) / 0.7);
        } else if (vStyle > 0.5) {
          vec3 white = vec3(2.2, 2.1, 1.7);
          vec3 gold = vec3(2.0, 1.3, 0.35);
          vec3 orange = vec3(1.3, 0.4, 0.08);
          c = vK < 0.3 ? mix(white, gold, vK / 0.3) : mix(gold, orange, (vK - 0.3) / 0.7);
        } else {
          vec3 core = vec3(2.0, 1.75, 1.0);
          vec3 orange = vec3(1.9, 0.7, 0.12);
          vec3 red = vec3(0.7, 0.1, 0.02);
          c = vK < 0.2 ? mix(core, orange, vK / 0.2) : mix(orange, red, (vK - 0.2) / 0.8);
        }
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** A lap (m) for a road whose data names none: the portal stands at the end of every one. */
export const GOLD_LAP = 6000;
/** The words over the Golden Track's portal (2026-11-22: "a kind of portal dome arch with stay
 * wild written on top in golden letters at the end of the track lap"). */
export const PORTAL_WORDS = 'STAY WILD';

let portalMat: THREE.MeshBasicMaterial | null = null;
/** The portal's words, golden serif capitals on a transparent board, drawn once and shared. */
function portalWords(): THREE.MeshBasicMaterial {
  if (portalMat) return portalMat;
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 320;
  const x = c.getContext('2d');
  if (x) {
    x.font = '600 230px Georgia, "Times New Roman", serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const g = x.createLinearGradient(0, 40, 0, 280);
    g.addColorStop(0, '#fff1c4');
    g.addColorStop(0.5, '#e2b04a');
    g.addColorStop(1, '#9a6a1c');
    x.shadowColor = 'rgba(226,176,74,0.9)';
    x.shadowBlur = 40;
    x.fillStyle = g;
    // Letter-spaced by hand: canvas letterSpacing is not everywhere yet.
    const letters = [...PORTAL_WORDS];
    const step = 196;
    letters.forEach((ch, i) => {
      x.fillText(ch, 1024 + (i - (letters.length - 1) / 2) * step, 165);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  portalMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  portalMat.color.setScalar(1.6);
  portalMat.userData.shared = true;
  return portalMat;
}

/** The streams' look in Sky Canyon: a dim rest, a bright head, a 14 m tail. */
export const DOT_LOOK = { base: 0.4, pulse: 1.8, tail: 14 };

/** Dots of light, as the City of Dreams draws them: soft round glows; a stream's head bright, its
 * tail fading over 14 m, a head every 90 m running ahead of you. */
function makeDots(calm: boolean | 'steady' = false): THREE.ShaderMaterial {
  // The Golden Track's are calm (2026-11-22: the arches "flash too much. stressful"): a softer
  // head over a brighter rest, and a longer tail, so a passing stream glows rather than flashes.
  // Chinatown's windows are steady: no stream runs through them.
  const look =
    calm === 'steady'
      ? { base: 1, pulse: 0, tail: 1 }
      : calm
        ? { base: 0.7, pulse: 0.75, tail: 30 }
        : DOT_LOOK;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uFront: { value: 0 },
      uScale: { value: 900 },
      uBase: { value: look.base },
      uPulse: { value: look.pulse },
      uTail: { value: look.tail },
    },
    vertexShader: `
      attribute vec3 aCol;
      attribute float aS;
      attribute float aSize;
      uniform float uFront;
      uniform float uScale;
      uniform float uBase;
      uniform float uPulse;
      uniform float uTail;
      varying vec3 vCol;
      varying float vGlow;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float behind = fract((uFront - aS) / 90.0) * 90.0;
        vGlow = uBase + uPulse * exp(-behind / uTail);
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
  const dotMat = cfg.id === 'sky' || cfg.id === 'gold' ? makeDots(cfg.id === 'gold') : null;
  /** Chinatown's lit windows, points of light as the City draws them. */
  const winMat = theme === 'chinatown' ? makeDots('steady') : null;
  let streamS = cfg.startS;
  let streamT = 0;
  const shared: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uFogCol: { value: new THREE.Color(0, 0, 0) },
    uFogDen: { value: 0 },
    uSun: { value: new THREE.Vector3(0.3, 0.9, 0.2).normalize() },
  };
  const fireMat = def.fire || def.deck || def.looping ? makeFire(shared.uTime) : null;
  if (fireMat) fireMat.userData.shared = true;
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
  /** The lake past the underpass's void: dark water, clear enough that what stands mirrored under
   * it (lake-city.ts) shows through. */
  const lakeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // The lake city past Undertown (lib/art/lake-city.ts): its towers dark, their lights bright.
  const cityBody = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const cityLit = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const lakes = new Map<string, { group: THREE.Group; x: number; y: number }>();
  const lakeCities = theme === 'chinatown' && !!def.under;
  for (const m of [
    facade,
    facadeMirror,
    neon,
    neonMirror,
    groundMat,
    rockMat,
    solidMat,
    lakeMat,
    cityBody,
    cityLit,
  ])
    m.userData.shared = true;
  let snowLevel = 0;

  const local = (ax: number, ay: number, x: number, y: number, h: number): V3 => [
    x - ax,
    h,
    -(y - ay),
  ];

  /** Heights for drawing: the road as if it went on over a gap (nothing is drawn in the void). */
  const hAt = (s: number, u: number) => heightAt(track, s, u, true);
  /** In a jump's gap: no road, no ground, no lines (2026-11-22: "the long jump over the void"). */
  const gapAt = (s: number) => def.gap?.(Math.max(0, s)) ?? false;
  /** Where the road is raised as a bridge over another stretch of itself. */
  const bridgeAt = (s: number) => def.bridge?.(Math.max(0, s)) ?? false;
  /** How far the road is turned about its axis here (0 off a twist). */
  const twistAt = (s: number) => def.twist?.(Math.max(0, s)) ?? 0;

  function columns(half: number): number[] {
    const fr = [
      -1, -0.94, -0.85, -0.77, -0.55, -0.3, -0.12, 0, 0.12, 0.3, 0.55, 0.77, 0.85, 0.94, 1,
    ];
    const us = fr.map((f) => f * half);
    if (cfg.id === 'coast')
      return [COAST_CLIFF, -half - 4, ...us, half + 3, COAST_RAIL, COAST_RAIL + 1.5];
    // The canyon's pipes need more columns to curve smoothly up to the rock.
    const outs =
      cfg.id === 'canyon' || cfg.id === 'sky' || def.curl
        ? [0.6, 2, 4, 6, 8, 10, 11.5, 12.8, 13.9, 14.7, 15.4, 16.2]
        : [0.6, 3, 8, 16];
    // A high deck needs the ground drawn out past it: its top, then the stands falling away.
    if (def.deck)
      outs.push(18, 20, 23, 26, 28.5, DECK.OUT - 0.3, DECK.OUT + 0.3, DECK.OUT + 6, DECK.OUT + 14);
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
      if (gapAt(s) || gapAt(s + ROW)) continue;
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
      return local(ax, ay, p.x, p.y, hAt(s, u) + h);
    };
    // The road as drawn: turned about its axis on a twist (the road's lines ride it too).
    const LR = (s: number, u: number, h = 0): V3 => {
      if (!twistAt(s)) return L(s, u, h);
      const p = twistPose(track, s, u, h);
      return local(ax, ay, p.x, p.y, p.z);
    };

    // The road and the ground beside it.
    const ground = new Builder();
    let pts: V3[][] = [];
    let cols: V3[][] = [];
    let nrms: V3[][] = [];
    const flush = () => {
      if (pts.length > 1) grid(ground, pts, cols, nrms);
      pts = [];
      cols = [];
      nrms = [];
    };
    // The surface's own normal at (s, u), from the track itself, so chunks meet without a seam.
    const normalAt = (s: number, u: number): V3 => {
      const a = L(s - 0.5, u);
      const b = L(s + 0.5, u);
      const c = L(s, u - 0.25);
      const d = L(s, u + 0.25);
      return faceNormal(
        [0, 0, 0],
        [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        [d[0] - c[0], d[1] - c[1], d[2] - c[2]],
      );
    };
    const rowAt = (at: number, bridged: boolean) => {
      const half = def.half(at);
      const row: V3[] = [];
      const crow: V3[] = [];
      const nrow: V3[] = [];
      // On a twist the road has risen away from the ground: what is left under it is ground.
      const twisting = twistAt(at) > ROOF_OPEN;
      // Over the underpass's void the ground stops at the road's right edge, or once the flip has
      // lifted the road off, at the void's own edge: the columns past it fold onto it.
      const hole = voidLeft(def, at, VOID_SHOWS);
      const hi = hole === null ? null : twisting ? hole : -half;
      for (const u0 of columns(half)) {
        // On a bridge only the deck is drawn: no ground beside it to hang over the road beneath.
        if (bridged && Math.abs(u0) > half + 0.7) continue;
        const u = hi === null ? u0 : Math.max(u0, hi);
        const onRoad = Math.abs(u) <= half;
        row.push(twisting && onRoad ? L(at, u, -0.4) : L(at, u));
        crow.push(
          // Up on a high deck the ground is road again.
          def.deck && onDeck(track, at, u)
            ? groundColour(cfg, at, 0, half, snowLevel)
            : groundColour(cfg, at, u, twisting ? -1 : half, snowLevel),
        );
        nrow.push(normalAt(at, u));
      }
      pts.push(row);
      cols.push(crow);
      nrms.push(nrow);
    };
    let wasBridged: boolean | null = null;
    for (let s = s0; s <= s1 + 0.01; s += ROW) {
      // A gap breaks the road: what is before it ends at its lip, what is after starts again.
      if (gapAt(s) && gapAt(s - ROW + 0.01)) {
        flush();
        wasBridged = null;
        continue;
      }
      const at = gapAt(s) ? s - 0.01 : s;
      const bridged = bridgeAt(at);
      if (wasBridged !== null && bridged !== wasBridged) {
        // The deck meets the road with ground: end one on this row, start the other on it.
        rowAt(at, wasBridged);
        flush();
      }
      wasBridged = bridged;
      rowAt(at, bridged);
      if (gapAt(s)) flush();
    }
    flush();
    // A bridge's underside and its sides: a dark slab 1.6 m deep under the deck.
    {
      let under: V3[][] = [];
      let lsideA: V3[][] = [];
      let rsideA: V3[][] = [];
      const dark = lin(0.04, 0.032, 0.028);
      const slab = () => {
        if (under.length > 1) {
          const uc = under.map((r) => r.map(() => dark));
          grid(
            ground,
            under.map((r) => [...r].reverse()),
            uc,
          );
          grid(
            ground,
            lsideA,
            lsideA.map((r) => r.map(() => dark)),
          );
          grid(
            ground,
            rsideA.map((r) => [...r].reverse()),
            rsideA.map((r) => r.map(() => dark)),
          );
        }
        under = [];
        lsideA = [];
        rsideA = [];
      };
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        if (!bridgeAt(s)) {
          slab();
          continue;
        }
        const half = def.half(s) + 0.7;
        under.push([L(s, -half, -1.6), L(s, 0, -1.6), L(s, half, -1.6)]);
        lsideA.push([L(s, half, 0), L(s, half, -1.6)]);
        rsideA.push([L(s, -half, 0), L(s, -half, -1.6)]);
      }
      slab();
    }
    // The straight road through a twist's hollow: a lane flat on the ground, the ribbon rolling
    // round it.
    if (def.twist) {
      let lane: V3[][] = [];
      let lc: V3[][] = [];
      const done = () => {
        if (lane.length > 1) grid(ground, lane, lc, true);
        lane = [];
        lc = [];
      };
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        const q = Math.max(0, s);
        // A looping has no hollow, and Undertown no way through it: everyone goes under.
        if (def.twist(q) === 0 || def.looping?.(q) || def.under?.(q)) {
          done();
          continue;
        }
        const row: V3[] = [];
        const crow: V3[] = [];
        for (const f of [-1, -0.5, 0, 0.5, 1]) {
          const u = f * STRAIGHT.LANE;
          const p = pointAt(track, s, u);
          row.push(local(ax, ay, p.x, p.y, frameAt(track, s).e + 0.04));
          crow.push(groundColour(cfg, s, u, STRAIGHT.LANE, snowLevel));
        }
        lane.push(row);
        lc.push(crow);
      }
      done();
    }
    // A twist's bypass: a flat lane peeling off to the right, drawn just over the ground.
    if (def.bypass) {
      let lane: V3[][] = [];
      let lc: V3[][] = [];
      const done = () => {
        if (lane.length > 1) grid(ground, lane, lc, true);
        lane = [];
        lc = [];
      };
      const lh = laneHalf(def);
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        const c = def.bypass(Math.max(0, s));
        // Down in its void the underpass is drawn with the void, below.
        if (c === null || voidLeft(def, s, VOID_SHOWS) !== null) {
          done();
          continue;
        }
        const row: V3[] = [];
        const crow: V3[] = [];
        for (const f of [-1.08, -1, -0.8, -0.4, 0, 0.4, 0.8, 1, 1.08]) {
          const u = c + f * lh;
          const p = pointAt(track, s, u);
          // On the lane's own level (where it runs beside a banked road, its edge's).
          row.push(local(ax, ay, p.x, p.y, hAt(s, u) + 0.05));
          crow.push(groundColour(cfg, s, f * lh, lh, snowLevel));
        }
        lane.push(row);
        lc.push(crow);
      }
      done();
    }
    // The underpass's void (lib/art/chinatown-paths.ts, 2026-11-24: "a big ass second track on the
    // right with more emptiness around it"): right of the street the ground falls away into an open
    // plain, the second track across it between gold kerbs, a quay past its far side and the lake
    // beyond (its far shore and the city on it: lake-city.ts). The street runs along the plain's edge
    // on a lacquered retaining wall, a rail along its top; where the track goes in under it, the
    // street is a deck over it, its underside dark, the wall standing under its far side. Once the
    // flip lifts the road off, the deck goes with it and the void is open to the sky.
    const water = new Builder();
    const glow = new Builder();
    if (def.lower && def.bypass) {
      const strip = () => ({ pts: [] as V3[][], cols: [] as V3[][] });
      let floor = strip();
      let lake = strip();
      let wall = strip();
      let deck = strip();
      let fascia = strip();
      const flushVoid = () => {
        if (floor.pts.length > 1) grid(ground, floor.pts, floor.cols, true);
        if (lake.pts.length > 1) grid(water, lake.pts, lake.cols);
        if (wall.pts.length > 1) grid(ground, wall.pts, wall.cols);
        floor = strip();
        lake = strip();
        wall = strip();
      };
      const flushDeck = () => {
        if (deck.pts.length > 1)
          grid(
            ground,
            deck.pts.map((r) => [...r].reverse()),
            deck.cols,
          );
        if (fascia.pts.length > 1) grid(ground, fascia.pts, fascia.cols);
        deck = strip();
        fascia = strip();
      };
      const at = (s: number, u: number, z: number): V3 => {
        const p = pointAt(track, s, u);
        return local(ax, ay, p.x, p.y, z);
      };
      const stone = lin(0.035, 0.022, 0.024);
      const quay = lin(0.06, 0.035, 0.03);
      const lacquer = lin(0.16, 0.02, 0.016);
      const under = lin(0.02, 0.008, 0.01);
      const deep = lin(0.004, 0.006, 0.016);
      const kerbGold: V3 = [1.4, 0.85, 0.3];
      const railRed: V3 = [1.3, 0.16, 0.08];
      const lh = laneHalf(def);
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        const vl = voidLeft(def, s, VOID_SHOWS);
        const c = def.bypass(Math.max(0, s));
        if (vl === null || c === null) {
          flushVoid();
          flushDeck();
          continue;
        }
        const half = def.half(s);
        const fz = lowerFloor(def, s);
        const twisting = twistAt(s) > ROOF_OPEN;
        const shore = c - lh - LOWER.KERB - VOID.QUAY;
        // The plain: the track between its kerbs, the quay, then the water at the lake's level.
        const us = [
          c + lh + LOWER.KERB,
          c + lh,
          c + lh * 0.5,
          c,
          c - lh * 0.5,
          c - lh,
          c - lh - LOWER.KERB,
          shore,
        ].map((u) => Math.min(u, vl));
        floor.pts.push([at(s, vl, fz), ...us.map((u) => at(s, u, fz + 0.02))]);
        floor.cols.push([
          stone,
          ...us.map((u) =>
            Math.abs(u - c) <= lh ? groundColour(cfg, s, u - c, lh, snowLevel) : quay,
          ),
        ]);
        lake.pts.push([at(s, shore, fz), at(s, shore, VOID.LAKE), at(s, -VOID.FAR, VOID.LAKE)]);
        lake.cols.push([quay, deep, deep]);
        // The retaining wall at the void's edge: up to the street (or the deck's underside, or the
        // street left under the lifted road).
        const covered = !twisting && vl > -half;
        const top = covered
          ? hAt(s, vl) - LOWER_SLAB
          : twisting && vl > -half
            ? hAt(s, vl) - 0.4
            : hAt(s, -half);
        wall.pts.push([at(s, vl, top), at(s, vl, fz)]);
        wall.cols.push([lacquer, stone]);
        // The deck over the track, and its face along the street's right edge.
        if (covered) {
          deck.pts.push([-half, (vl - half) / 2, vl].map((u) => at(s, u, hAt(s, u) - LOWER_SLAB)));
          deck.cols.push([under, under, under]);
          fascia.pts.push([at(s, -half, hAt(s, -half)), at(s, -half, hAt(s, -half) - LOWER_SLAB)]);
          fascia.cols.push([lacquer, lacquer]);
        } else flushDeck();
        // Light: the kerbs in gold along the floor, a red line along the wall's top (and the rail on
        // the street's edge over the plain).
        const sb = Math.min(s + ROW, s1 + 0.01);
        const line = (u: number, z0: number, z1: number, w: number, col: V3) =>
          glow.quad(
            at(s, u - w, z0),
            at(sb, u - w, z1),
            at(sb, u + w, z1),
            at(s, u + w, z0),
            [0, 1, 0],
            col,
          );
        const fz1 = lowerFloor(def, sb);
        for (const u of [c + lh + 0.3, c - lh - 0.3])
          if (u <= vl) line(u, fz + 0.06, fz1 + 0.06, 0.18, kerbGold);
        if (!twisting) {
          const ru = -(half + LOWER_RAIL);
          const z0 = hAt(s, -half) + 0.9;
          const z1 = hAt(sb, -half) + 0.9;
          glow.quad(
            at(s, ru, z0),
            at(sb, ru, z1),
            at(sb, ru, z1 - 0.12),
            at(s, ru, z0 - 0.12),
            [0, 1, 0],
            railRed,
          );
        }
      }
      flushVoid();
      flushDeck();
    }
    // The lake arcade (lib/art/chinatown-vista.ts, 2026-11-24: "a whole part left that is below the
    // buildings in a whole area with a wider view to the left"): the left side's shophouses up on a
    // deck over the road's left edge (they are pieces; the deck is drawn here: dark underside, red
    // faces, a gold line along its front edge), the terrace past the columns to a balustrade lit
    // red, the drop, and the lake out to its city.
    if (lakeCities) {
      const at = (s: number, u: number, z: number): V3 => {
        const p = pointAt(track, s, u);
        return local(ax, ay, p.x, p.y, z);
      };
      const rows = { under: [] as V3[][], front: [] as V3[][], back: [] as V3[][] };
      const terrace = { pts: [] as V3[][], cols: [] as V3[][] };
      const lake = { pts: [] as V3[][], cols: [] as V3[][] };
      const dark = lin(0.03, 0.01, 0.01);
      const red = lin(0.2, 0.025, 0.02);
      const pave = lin(0.05, 0.03, 0.028);
      const stone = lin(0.035, 0.022, 0.024);
      const deep = lin(0.004, 0.006, 0.016);
      const gold: V3 = [1.4, 0.85, 0.3];
      const rail: V3 = [1.3, 0.16, 0.08];
      const paint = (r: V3[][], c: V3) => r.map((q) => q.map(() => c));
      const flushArcade = () => {
        if (rows.under.length > 1) {
          grid(
            ground,
            rows.under.map((r) => [...r].reverse()),
            paint(rows.under, dark),
          );
          grid(ground, rows.front, paint(rows.front, red));
          grid(ground, rows.back, paint(rows.back, red));
        }
        if (terrace.pts.length > 1) grid(ground, terrace.pts, terrace.cols, true);
        if (lake.pts.length > 1) grid(water, lake.pts, lake.cols);
        rows.under = [];
        rows.front = [];
        rows.back = [];
        terrace.pts = [];
        terrace.cols = [];
        lake.pts = [];
        lake.cols = [];
      };
      // The arcade, or an overlook (lib/art/chinatown-vista.ts): the canyon parted on one side,
      // the hillside down to the balustrade, the drop and the lake; no deck.
      let was: string | null = null;
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        const va = vistaAt(s);
        const key = va ? `${va.v.kind}${va.v.start}` : null;
        if (key !== was && was !== null) flushArcade();
        was = key;
        if (!va) continue;
        const half = def.half(s);
        const sd = va.v.side;
        if (va.v.kind === 'overlook') {
          const rim = sd * (half + VISTA.RAIL);
          lake.pts.push([
            at(s, rim, hAt(s, rim)),
            at(s, rim, VOID.LAKE),
            at(s, sd * (half + VOID.FAR), VOID.LAKE),
          ]);
          lake.cols.push([stone, deep, deep]);
          const sb = Math.min(s + ROW, s1 + 0.01);
          glow.quad(
            at(s, rim, hAt(s, rim) + 1.1),
            at(sb, rim, hAt(sb, rim) + 1.1),
            at(sb, rim, hAt(sb, rim) + 0.98),
            at(s, rim, hAt(s, rim) + 0.98),
            [0, 1, 0],
            rail,
          );
          continue;
        }
        const lo = half - VISTA.DECK_IN;
        const hi = half + VISTA.DEEP + 1;
        const z0 = hAt(s, half) + VISTA.DECK;
        const z1 = z0 + VISTA.SLAB;
        const cap = (zA: number, zB: number) =>
          ground.quad(at(s, lo, zA), at(s, hi, zA), at(s, hi, zB), at(s, lo, zB), [0, 1, 0], red);
        // The deck's ends, where the arcade starts and stops.
        if (va.x < ROW / 2 || va.x + ROW >= va.v.length) cap(z0, z1);
        rows.under.push([at(s, lo, z0), at(s, (lo + hi) / 2, z0), at(s, hi, z0)]);
        rows.front.push([at(s, lo, z1), at(s, lo, z0)]);
        rows.back.push([at(s, hi, z0), at(s, hi, z1)]);
        const rim = half + VISTA.RAIL;
        terrace.pts.push([half + 15.5, half + 17, rim].map((u) => at(s, u, hAt(s, u) + 0.02)));
        terrace.cols.push([pave, pave, pave]);
        lake.pts.push([
          at(s, rim, hAt(s, rim)),
          at(s, rim, VOID.LAKE),
          at(s, half + VOID.FAR, VOID.LAKE),
        ]);
        lake.cols.push([stone, deep, deep]);
        const sb = Math.min(s + ROW, s1 + 0.01);
        const line = (u: number, zA: number, zB: number, w: number, col: V3) =>
          glow.quad(
            at(s, u, zA),
            at(sb, u, zB),
            at(sb, u, zB - w),
            at(s, u, zA - w),
            [0, 1, 0],
            col,
          );
        line(rim, hAt(s, rim) + 1.1, hAt(sb, rim) + 1.1, 0.12, rail);
        line(lo - 0.05, z0 + 0.25, hAt(sb, half) + VISTA.DECK + 0.25, 0.1, gold);
      }
      flushArcade();
    }
    // The balcony road (lib/art/chinatown-paths.ts): a deck one storey up beside the road on the
    // left, its top the road's own colour, its underside dark, its two faces lacquer red; down its
    // ramp, then flat on the street as it merges back.
    if (def.balcony) {
      let top: V3[][] = [];
      let tc: V3[][] = [];
      let bot: V3[][] = [];
      let inner: V3[][] = [];
      let outer: V3[][] = [];
      const dark = lin(0.05, 0.012, 0.01);
      const fascia = lin(0.36, 0.05, 0.035);
      const paint = (rows: V3[][], c: V3) => rows.map((r) => r.map(() => c));
      const done = () => {
        if (top.length > 1) {
          grid(ground, top, tc, true);
          if (bot.length > 1) {
            grid(
              ground,
              bot.map((r) => [...r].reverse()),
              paint(bot, dark),
            );
            grid(
              ground,
              inner.map((r) => [...r].reverse()),
              paint(inner, fascia),
            );
            grid(ground, outer, paint(outer, fascia));
          }
        }
        top = [];
        tc = [];
        bot = [];
        inner = [];
        outer = [];
      };
      let wasRaised: boolean | null = null;
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        const bc = def.balcony(Math.max(0, s));
        if (!bc || (wasRaised !== null && bc.raised !== wasRaised)) done();
        if (!bc) {
          wasRaised = null;
          continue;
        }
        wasRaised = bc.raised;
        const at = (u: number, z: number): V3 => {
          const p = pointAt(track, s, u);
          return local(ax, ay, p.x, p.y, z);
        };
        const fs = [-1, -0.6, -0.2, 0.2, 0.6, 1];
        top.push(
          fs.map((f) => at(bc.c + f * bc.w, bc.raised ? bc.z : hAt(s, bc.c + f * bc.w) + 0.05)),
        );
        tc.push(fs.map((f) => groundColour(cfg, s, f * bc.w, bc.w, snowLevel)));
        if (bc.raised) {
          const lo = bc.z - 0.7;
          const uIn = bc.c - bc.w;
          const uOut = bc.c + bc.w;
          bot.push([at(uIn, lo), at(bc.c, lo), at(uOut, lo)]);
          inner.push([at(uIn, bc.z), at(uIn, lo)]);
          outer.push([at(uOut, bc.z + 1), at(uOut, lo)]);
        }
      }
      done();
    }
    // The twist's ribbon: the road turned about its axis, lit by its turned up, its underside dark
    // so it reads from outside too.
    {
      let top: V3[][] = [];
      let tc: V3[][] = [];
      let tn: V3[][] = [];
      const ribbon = () => {
        if (top.length > 1) {
          grid(ground, top, tc, tn);
          const under = top.map((r) => [...r].reverse());
          const uc = tc.map((r) => r.map(() => lin(0.05, 0.04, 0.035)));
          const un = tn.map((r) => [...r].reverse().map((n) => [-n[0], -n[1], -n[2]] as V3));
          grid(ground, under, uc, un);
        }
        top = [];
        tc = [];
        tn = [];
      };
      for (let s = s0; s <= s1 + 0.01; s += ROW) {
        const th = twistAt(s);
        if (!th && !twistAt(s - ROW) && !twistAt(s + ROW)) {
          ribbon();
          continue;
        }
        const half = def.half(s);
        const nu = twistPose(track, s, 0, 0).up;
        const up: V3 = [nu[0], nu[2], -nu[1]];
        const cs = columns(half).filter((u) => Math.abs(u) <= half);
        top.push(cs.map((u) => LR(s, u, 0.02)));
        // Undertown's side of the road is darker, toward deep red and purple, the more it has
        // turned over.
        const dk = def.under?.(Math.max(0, s)) ? (1 - Math.cos(th)) / 2 : 0;
        tc.push(
          cs.map((u) => {
            const c = groundColour(cfg, s, u, half, snowLevel);
            return dk ? underTint(c, u / half, dk) : c;
          }),
        );
        tn.push(cs.map(() => up));
      }
      ribbon();
    }
    // The lips of a gap: the road's edge drops away as a dark cliff face.
    for (let s = s0; s < s1; s += ROW) {
      const into = !gapAt(s) && gapAt(s + ROW);
      const outOf = gapAt(s) && !gapAt(s + ROW);
      if (!into && !outOf) continue;
      const sl = into ? s + ROW - 0.01 : s + ROW;
      const half = def.half(sl);
      const cs = columns(half);
      const face: V3[][] = [];
      const fc: V3[][] = [];
      for (const d of [0, 6, 40]) {
        face.push(cs.map((u) => L(sl, u, -d)));
        fc.push(cs.map(() => (d === 0 ? lin(0.5, 0.36, 0.14) : lin(0.03, 0.025, 0.02))));
      }
      grid(ground, into ? face : face.map((r) => [...r].reverse()), fc);
    }
    const gm = new THREE.Mesh(ground.geometry(), groundMat);
    gm.renderOrder = 2;
    g.add(gm);
    if (!water.empty) {
      const wm = new THREE.Mesh(water.geometry(), lakeMat);
      wm.renderOrder = 2;
      g.add(wm);
    }
    if (!glow.empty) g.add(new THREE.Mesh(glow.geometry(), lineMat));
    if (night) markings(s0, s1, LR, g);

    const rock = new Builder();
    if (cfg.id === 'coast') {
      // The cliff on the right, rising 25 to 80 m in strata, and the sea cliff down to the water.
      const cliff: V3[][] = [];
      const cc: V3[][] = [];
      const face: V3[][] = [];
      const fc: V3[][] = [];
      for (let s = s0; s <= s1 + 0.01; s += 4) {
        const H = 25 + 55 * smooth1(s / 64, 4) ** 1.5;
        const base = hAt(s, COAST_CLIFF);
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
        const top = hAt(s, COAST_RAIL + 1.5);
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
          const base = hAt(s, side * wu);
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
    if (fireMat) fireTunnel(s0, s1, g);
    if (fireMat && def.deck) deckFire(s0, s1, g);
    if (fireMat && def.looping) loopFire(s0, s1, g);
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
    const edgeH = hAt(s, side * half);
    const R = SKY_PIPE;
    const pipeTop = pipeAt(R * PIPE_TOP, R);
    if (hb < pipeTop) {
      const x = Math.sqrt(1 - (1 - hb / R) ** 2);
      return [side * (half + x * R - 0.3), edgeH + hb + 0.4];
    }
    const wu = skyWallU();
    const base = hAt(s, side * wu);
    const z = edgeH + hb;
    return [side * (wu + 1 + 0.25 * Math.max(0, z - base) - 0.8), z];
  }

  /**
   * The Golden Track's dots (the City's and Art's gold dots): a row along each edge, a second
   * higher and fainter; a dotted arch over the road every 90 m; now and then a ring of dots
   * standing beside the road; and constellations scattered over the dark ground either side.
   * All on the shared dot material, so the streams run ahead of you as in Sky Canyon.
   */
  /** The fire tunnels in this stretch: arches of burners over the road, each jet shooting its
   * blue flame straight outwards, away from the road, so you race through a ring of fire. */
  /** Fire both sides of a high deck: burners on its inner lip and its outer edge every 12 m,
   * shooting straight up, roaring as you pass (2026-11-22: "with fire on the sides"). A blazing
   * deck has burners every 6 m, two rows a side, in the taller, thicker blaze. */
  function deckFire(s0: number, s1: number, g: THREE.Group) {
    if (!fireMat || !def.deck) return;
    const a = frameAt(track, s0);
    const pos: number[] = [];
    const dir: number[] = [];
    const ph: number[] = [];
    const at: number[] = [];
    const sty: number[] = [];
    const bf: number[] = [];
    for (let s = Math.ceil(s0 / 6) * 6; s < s1; s += 6) {
      const side = def.deck(s);
      if (!side || !def.deck(s - 30) || !def.deck(s + 30)) continue;
      const blaze = def.blaze?.(s) ?? false;
      if (!blaze && s % 12 !== 0) continue;
      const f = frameAt(track, s);
      for (const out of blaze ? [16, 17.4, DECK.OUT - 2.2, DECK.OUT - 0.8] : [16, DECK.OUT - 0.8]) {
        const p = pointAt(track, s, side * (f.half + out));
        const z = f.e + DECK.H + 0.3;
        for (let k = 0; k < FIRE.FLAMES; k++) {
          pos.push(p.x - a.x, z, -(p.y - a.y));
          dir.push((Math.random() - 0.5) * 0.15, 1, (Math.random() - 0.5) * 0.15);
          ph.push((k + 0.37 * out + 0.61 * (s / 12)) / FIRE.FLAMES);
          at.push(s);
          sty.push(blaze ? 4 : 0);
          bf.push(0);
        }
      }
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(at, 1));
    geo.setAttribute('aStyle', new THREE.Float32BufferAttribute(sty, 1));
    geo.setAttribute('aB', new THREE.Float32BufferAttribute(bf, 1));
    const pts = new THREE.Points(geo, fireMat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    g.add(pts);
  }

  /** Strong red fire down both sides of the superloop (2026-11-22: "add strong red fire on sides
   * of the second loop"): burners on each edge every 8 m, riding the loop round, each jet
   * shooting straight out sideways, away from the road. */
  function loopFire(s0: number, s1: number, g: THREE.Group) {
    if (!fireMat || !def.looping) return;
    const a = frameAt(track, s0);
    const pos: number[] = [];
    const dir: number[] = [];
    const ph: number[] = [];
    const at: number[] = [];
    const sty: number[] = [];
    const bf: number[] = [];
    for (let s = Math.ceil(s0 / 8) * 8; s < s1; s += 8) {
      if (!def.looping(Math.max(0, s))) continue;
      const f = frameAt(track, s);
      for (const side of [1, -1]) {
        const p = twistPose(track, s, side * (f.half + 0.8), 0.4);
        // Out across the road, to its side: the road's left, which the loop never turns.
        const d: V3 = [-Math.sin(f.h) * side, 0.15, -Math.cos(f.h) * side];
        for (let k = 0; k < FIRE.FLAMES; k++) {
          pos.push(p.x - a.x, p.z, -(p.y - a.y));
          dir.push(d[0] + (Math.random() - 0.5) * 0.15, d[1], d[2] + (Math.random() - 0.5) * 0.15);
          ph.push((k + 0.53 * side + 0.61 * (s / 8)) / FIRE.FLAMES);
          at.push(s);
          sty.push(5);
          bf.push(0);
        }
      }
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(at, 1));
    geo.setAttribute('aStyle', new THREE.Float32BufferAttribute(sty, 1));
    geo.setAttribute('aB', new THREE.Float32BufferAttribute(bf, 1));
    const pts = new THREE.Points(geo, fireMat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    g.add(pts);
  }

  function fireTunnel(s0: number, s1: number, g: THREE.Group) {
    if (!fireMat || !def.fire) return;
    const a = frameAt(track, s0);
    const pos: number[] = [];
    const dir: number[] = [];
    const ph: number[] = [];
    const at: number[] = [];
    const sty: number[] = [];
    const bf: number[] = [];
    const nozzle = new Builder();
    const steel = lin(0.12, 0.13, 0.16);
    for (let s = Math.ceil(s0 / FIRE.RING) * FIRE.RING; s < s1; s += FIRE.RING) {
      if (!def.fire(s) || gapAt(s) || twistAt(s)) continue;
      const f = frameAt(track, s);
      const style = def.fireStyle?.(s) ?? 0;
      // The same arch as the golden ones: half + 2.5 wide, three quarters as tall.
      const R = def.half(s) + 2.5;
      const e = hAt(s, 0);
      const nx = -Math.sin(f.h);
      const ny = Math.cos(f.h);
      for (let b = 0; b < FIRE.BURNERS; b++) {
        const t = (Math.PI * b) / (FIRE.BURNERS - 1);
        const c = Math.cos(t);
        const sn = Math.sin(t);
        // The nozzle on the arch, its jet pointing out from the arch's centre.
        const x = f.x + nx * c * R - a.x;
        const y = f.y + ny * c * R - a.y;
        const z = e + sn * R * 0.75;
        // Out along the arch's normal (an ellipse's: across by 0.75 c, up by s).
        const m = Math.hypot(0.75 * c, sn) || 1;
        const d: V3 = [(nx * 0.75 * c) / m, sn / m, -(ny * 0.75 * c) / m];
        for (let k = 0; k < FIRE.FLAMES; k++) {
          pos.push(x, z, -y);
          dir.push(...d);
          ph.push((k + 0.37 * b + 0.61 * (s / FIRE.RING)) / FIRE.FLAMES);
          at.push(s);
          sty.push(style);
          bf.push(b / (FIRE.BURNERS - 1));
        }
        // A small dark burner head, so the flame comes out of something.
        const p0: V3 = [x - d[0] * 0.4, z - d[1] * 0.4, -y - d[2] * 0.4];
        const w = 0.7;
        const tx = Math.cos(f.h) * w;
        const ty = Math.sin(f.h) * w;
        nozzle.quad(
          [p0[0] - tx, p0[1] - w, p0[2] + ty],
          [p0[0] + tx, p0[1] - w, p0[2] - ty],
          [p0[0] + tx, p0[1] + w, p0[2] - ty],
          [p0[0] - tx, p0[1] + w, p0[2] + ty],
          [d[0], d[1], d[2]],
          steel,
        );
      }
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(at, 1));
    geo.setAttribute('aStyle', new THREE.Float32BufferAttribute(sty, 1));
    geo.setAttribute('aB', new THREE.Float32BufferAttribute(bf, 1));
    const pts = new THREE.Points(geo, fireMat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    g.add(pts);
    if (!nozzle.empty) g.add(new THREE.Mesh(nozzle.geometry(), solidMat));
  }

  function goldDots(s0: number, s1: number, g: THREE.Group) {
    if (!dotMat) return;
    const pos: number[] = [];
    const col: number[] = [];
    const ss: number[] = [];
    const size: number[] = [];
    const a = frameAt(track, s0);
    // `stream` is where a dot sits for the passing streams (its own s unless given), so a shape
    // standing at one s can take the light across it instead of all at once.
    const put = (s: number, u: number, z: number, c: V3, sz: number, stream = s) => {
      const p = pointAt(track, s, u);
      pos.push(p.x - a.x, z, -(p.y - a.y));
      col.push(...c);
      ss.push(stream);
      size.push(sz);
    };
    // Where the road loops back over itself, nothing of this stretch may stand on that one.
    const others: { s: number; x: number; y: number }[] = [];
    if (def.bridge)
      for (let so = Math.max(0, s0 - 3600); so < s1 + 3600; so += 8) {
        const p = pointAt(track, so, 0);
        others.push({ s: so, x: p.x, y: p.y });
      }
    const clear = (s: number, u: number, r: number) => {
      // Nothing stands on a high deck or its stands.
      const ds = def.deck?.(Math.max(0, s - 40)) || def.deck?.(Math.max(0, s + 40)) || 0;
      if (ds && Math.sign(u) === ds && Math.abs(u) < def.half(s) + DECK.OUT + 18 + r) return false;
      if (!others.length) return true;
      const p = pointAt(track, s, u);
      for (const o of others)
        if (Math.abs(o.s - s) > 250 && Math.hypot(o.x - p.x, o.y - p.y) < def.half(o.s) + r)
          return false;
      return true;
    };
    const pillars: { s: number; u: number; top: number; foot: number }[] = [];
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
      if (gapAt(s)) continue;
      const half = def.half(s);
      if (twistAt(s) || twistAt(s + 40) || twistAt(s - 40)) {
        // On a twist the edge lights ride the road round: two golden helices.
        if (twistAt(s))
          for (const side of [1, -1]) {
            const p = twistPose(track, s, side * (half + 0.6), 0.5);
            pos.push(p.x - a.x, p.z, -(p.y - a.y));
            col.push(...golds[0]);
            ss.push(s);
            size.push(0.9);
          }
        if (twistAt(s)) continue;
      }
      for (const side of [1, -1]) {
        const e = hAt(s, side * (half + 1));
        put(s, side * (half + 1), e + 0.5, golds[0], 0.8);
        if (Math.round(s / 2.5) % 2 === 0) put(s, side * (half + 1.6), e + 2.4, golds[1], 0.6);
      }
    }
    // A high deck: its edges in gold, rows of light down the stands below its outer edge, and
    // chevrons climbing the wall before it so you know there is a way up.
    if (def.deck) {
      for (let s = Math.ceil(s0 / 2.5) * 2.5; s < s1; s += 2.5) {
        const side = def.deck(s);
        if (!side) continue;
        const f = frameAt(track, s);
        const top = f.e + DECK.H;
        put(s, side * (f.half + DECK.OUT - 0.3), top + 0.2, golds[0], 0.9);
        put(s, side * (f.half + 15), top + 0.2, golds[0], 0.7);
        if (s % 5 === 0)
          for (let z = top - 3; z > (def.terrain ?? 0) + 0.5; z -= 3)
            put(s, side * (f.half + DECK.OUT + 1 + (top - z) * 0.5), z, golds[1], 0.6);
      }
      for (let s = Math.ceil(s0 / 20) * 20; s < s1; s += 20) {
        const side = def.deck(s + 80);
        if (!side || def.deck(s)) continue;
        const f = frameAt(track, s);
        for (let o = 1; o < 14; o += 0.8) {
          const lift = Math.abs(o - 7) * 0.9;
          put(
            s - lift,
            side * (f.half + o),
            hAt(s - lift, side * (f.half + o)) + 0.25,
            golds[2],
            0.9,
          );
        }
      }
    }
    // The straight road through a twist (2026-11-22): its centre strip marked in gold for the
    // stretch before it, chevrons pointing in, and its lane lit right through the hollow.
    if (def.twist)
      for (let s = Math.ceil(s0 / 2.5) * 2.5; s < s1; s += 2.5) {
        if (!nearTwist(def, s)) continue;
        const inside = def.twist(Math.max(0, s)) !== 0;
        if (inside && def.looping?.(Math.max(0, s))) continue;
        const e = frameAt(track, s).e + 0.12;
        const w = inside ? STRAIGHT.LANE : STRAIGHT.STRIP;
        for (const side of [1, -1]) put(s, side * w, e, golds[inside ? 0 : 2], inside ? 1 : 0.8);
        if (!inside && s % 20 === 0)
          for (let o = -STRAIGHT.STRIP + 0.8; o < STRAIGHT.STRIP; o += 0.9)
            put(s - Math.abs(o) * 0.8, o, e, golds[0], 0.9);
      }
    // The bypass lane's edges, in gold like the road's (down in the void, at its floor).
    if (def.bypass)
      for (let s = Math.ceil(s0 / 2.5) * 2.5; s < s1; s += 2.5) {
        const c = def.bypass(Math.max(0, s));
        if (c === null) continue;
        const e = (def.lower ? lowerFloor(def, s) : frameAt(track, s).e) + 0.25;
        for (const side of [1, -1]) {
          const u = c + side * laneHalf(def);
          if (Math.abs(u) < def.half(s) + 1 && voidLeft(def, s, VOID_SHOWS) === null) continue;
          put(s, u, e, golds[0], 0.9);
        }
      }
    // A bridge over the road below (2026-11-22: "the passage of the road above you more aesthetic
    // … a cool bridge … a feeling of grandiose"): its edges lit, lines of light under its deck,
    // and tall pillars of light standing clear of the road beneath.
    for (let s = Math.ceil(s0 / 2.5) * 2.5; s < s1; s += 2.5) {
      if (!bridgeAt(s)) continue;
      const half = def.half(s) + 0.7;
      const e = hAt(s, 0);
      for (const side of [1, -1]) put(s, side * half, hAt(s, side * half) - 0.4, golds[1], 0.8);
      for (const u of [-0.6, 0, 0.6]) put(s, u * half, e - 1.75, golds[0], 0.7);
    }
    for (let s = Math.ceil(s0 / 48) * 48; s < s1; s += 48) {
      if (!bridgeAt(s) || !bridgeAt(s - 30) || !bridgeAt(s + 30)) continue;
      for (const side of [1, -1]) {
        const u = side * (def.half(s) - 2);
        if (!clear(s, u, 6)) continue;
        const top = hAt(s, u) - 1.6;
        const foot = Math.min(top - 2, def.terrain ?? 0);
        for (let z = foot; z < top; z += 0.7)
          for (const k of [-1, 1]) put(s + k * 0.9, u, z, golds[2], 0.75);
        pillars.push({ s, u, top, foot });
      }
    }
    // Arches over the road.
    // In a fire tunnel every ring of fire is an arch, so they stand closer: every FIRE.RING m.
    for (let sa = Math.ceil(s0 / FIRE.RING) * FIRE.RING; sa < s1; sa += FIRE.RING) {
      if (sa % 90 !== 0 && !def.fire?.(sa)) continue;
      if (twistAt(sa) || !clear(sa, 0, 24)) continue;
      const half = def.half(sa) + 2.5;
      const e = hAt(sa, 0);
      for (let t = 0; t <= Math.PI + 1e-6; t += 0.9 / half)
        // The light sweeps over the arch, foot to foot, as a stream passes under it.
        put(
          sa,
          Math.cos(t) * half,
          e + Math.sin(t) * half * 0.75,
          golds[2],
          1.2,
          sa - 30 + (t / Math.PI) * 60,
        );
    }
    // The portal at the end of each lap: a dome of light over the road, its ribs rising to a crown
    // and falling away, and the words over the way in.
    const lap = def.lap ?? GOLD_LAP;
    for (let sp = Math.max(lap, Math.ceil(s0 / lap) * lap); sp < s1; sp += lap) {
      const half = def.half(sp) + 6;
      const e = hAt(sp, 0);
      const DEEP = 30;
      for (let ds = -DEEP; ds <= DEEP + 1e-6; ds += 5) {
        const k = Math.sqrt(Math.max(0, 1 - (ds / (DEEP + 6)) ** 2));
        const w = half * (0.7 + 0.3 * k);
        const tall = half * 1.05 * k;
        for (let t = 0; t <= Math.PI + 1e-6; t += 0.7 / w)
          put(
            sp + ds,
            Math.cos(t) * w,
            e + Math.sin(t) * tall,
            golds[ds === -DEEP ? 2 : 0],
            ds === -DEEP ? 1.6 : 1,
            sp + ds,
          );
      }
      // Ribs over the top, along the road, so it reads as a dome and not a row of arches.
      for (const t of [
        0.35,
        0.7,
        1.05,
        1.4,
        Math.PI / 2,
        Math.PI - 1.4,
        Math.PI - 1.05,
        Math.PI - 0.7,
        Math.PI - 0.35,
      ])
        for (let ds = -DEEP; ds <= DEEP; ds += 1.2) {
          const k = Math.sqrt(Math.max(0, 1 - (ds / (DEEP + 6)) ** 2));
          const w = half * (0.7 + 0.3 * k);
          put(sp + ds, Math.cos(t) * w, e + Math.sin(t) * half * 1.05 * k, golds[1], 0.7, sp + ds);
        }
      // The words, standing on the crown of the way in, facing whoever comes.
      const f = frameAt(track, sp - DEEP);
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(half * 1.7, half * 1.7 * (320 / 2048)),
        portalWords(),
      );
      board.position.set(
        f.x - a.x,
        e + half * 1.05 * Math.sqrt(1 - (DEEP / (DEEP + 6)) ** 2) + 5,
        -(f.y - a.y),
      );
      board.rotation.y = f.h - Math.PI / 2;
      board.renderOrder = 7;
      g.add(board);
    }
    // A ring of dots standing beside the road, every 360 m, alternating sides.
    for (let sr = Math.ceil(s0 / 360) * 360 + 180; sr < s1; sr += 360) {
      const side = Math.round(sr / 360) % 2 ? 1 : -1;
      const uc = side * (def.half(sr) + 14);
      if (!clear(sr, uc, 12)) continue;
      const e = hAt(sr, uc);
      for (let t = 0; t < Math.PI * 2; t += 0.12)
        put(
          sr + Math.cos(t) * 0.01,
          uc + Math.cos(t) * 8,
          e + 9 + Math.sin(t) * 8,
          golds[1],
          1.4,
          sr + (t / (Math.PI * 2)) * 90,
        );
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
        if (def.curv(st) * u > 0.45 || !clear(st, u, 30)) continue;
        const c = P(st, u);
        const e = hAt(st, side * def.half(st));
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
      if (def.curv(sf) * u > 0.45 || !clear(sf, u, 20)) continue;
      const c = P(sf, u);
      const e = hAt(sf, 0) + 38;
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
        if (r > 0.45 || gapAt(s) || bridgeAt(s)) continue;
        const u = side * (def.half(s) + 6 + hashN(s + side) * 70);
        put(s, u, hAt(s, u) + 0.15 + hashN(s * 3.1) * 0.6, golds[Math.floor(r * 6.6) % 3], 0.5);
      }
    // The pillars' bodies: dark columns under the light.
    if (pillars.length) {
      const b = new Builder();
      const dark = lin(0.05, 0.04, 0.035);
      for (const pl of pillars) {
        const f = frameAt(track, pl.s);
        const c = pointAt(track, pl.s, pl.u);
        const tx = Math.cos(f.h) * 0.9;
        const ty = Math.sin(f.h) * 0.9;
        const nx = -ty;
        const ny = tx;
        const corners: [number, number][] = [
          [c.x - tx - nx, c.y - ty - ny],
          [c.x + tx - nx, c.y + ty - ny],
          [c.x + tx + nx, c.y + ty + ny],
          [c.x - tx + nx, c.y - ty + ny],
        ];
        for (let k = 0; k < 4; k++) {
          const [x0, y0] = corners[k];
          const [x1, y1] = corners[(k + 1) % 4];
          const p0 = local(a.x, a.y, x0, y0, pl.foot);
          const p1 = local(a.x, a.y, x1, y1, pl.foot);
          const p2 = local(a.x, a.y, x1, y1, pl.top);
          const p3 = local(a.x, a.y, x0, y0, pl.top);
          const n: V3 = [y1 - y0, 0, x1 - x0];
          b.quad(p0, p1, p2, p3, n, dark);
        }
      }
      if (!b.empty) g.add(new THREE.Mesh(b.geometry(), solidMat));
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
      const e = hAt(sd, 0);
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
    const groundAt = (s: number, u: number) => hAt(s, u);
    const centre = (s: number) => frameAt(track, s).e;

    /** A box in the road frame: (s, u) its middle, half sizes along and across, from h0 to h1. */
    /** Drawing a piece up off the street (the lake arcade's buildings on their deck): no mirror in
     * the wet road under it. */
    let lifted = false;
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
      for (const m of mirror && !lifted ? [false, true] : [false]) {
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
      mirror = true,
    ) => {
      for (const m of mirror && !lifted ? [false, true] : [false]) {
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
    const bulb = (
      s: number,
      u: number,
      h: number,
      r: number,
      col: V3,
      base: number,
      mirror = true,
    ) => {
      for (const m of mirror && !lifted ? [false, true] : [false]) {
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
    // Chinatown's lettered signs (one mesh a chunk) and lit windows (one cloud of points a chunk).
    const signs = new SignBuilder();
    const win = {
      pos: [] as number[],
      col: [] as number[],
      ss: [] as number[],
      size: [] as number[],
    };
    const pieces = piecesBetween(th, def, s0, s1);
    for (const p of pieces) drawPiece(p);

    /**
     * A Chinatown shophouse tower (lib/art/chinatown-street.ts, after the City's tieredTower):
     * storey on storey, a flared gold eave with its ends swept up on every other storey over a
     * red fascia, a balcony rail and a lantern at each street corner on the eave storeys, lit
     * windows as points of light, a red awning at the shop, and a pagoda crown (its roofs in
     * lift), a spire on the tall towers.
     */
    function shophouse(p: Piece, base: number) {
      const s = p.s;
      const H = p.h;
      const n = Math.round(H / CT_STOREY);
      const tall = n >= CT_TALL_FLOORS;
      const sd = p.side;
      box(s, p.u, p.w, p.d, 0, H, base, [0.03, 0.012, 0.01], glowCol(GOLDISH, 0.45));
      const face = -sd * (p.d + 0.15);
      const gold = glowCol(GOLDISH, 1.25);
      const fascia = glowCol(LANTERNISH, 0.55);
      const rail = glowCol(p.colour, 0.6);
      const lantern = glowCol(LANTERNISH, 2.1);
      const z: V3 = [0, 0, 0];
      // The shop's red awning.
      bar(s, p.u, [-p.w, face, 2.8], [p.w, face, 2.8], 0.12, glowCol(LANTERNISH, 0.9), z, base);
      for (let k = 1; k < n; k++) {
        const y = k * CT_STOREY;
        const m = y < MIRROR_CAP;
        if (k % 2 === 0) {
          bar(s, p.u, [-p.w, face, y], [p.w, face, y], 0.05, fascia, z, base, m);
          continue;
        }
        // The eave, out over the street, its ends swept up.
        const out = face - sd * 0.9;
        const e = p.w + 0.5;
        bar(s, p.u, [-e - 0.7, out, y + 0.45], [-e, out, y], 0.06, gold, z, base, m);
        bar(s, p.u, [-e, out, y], [e, out, y], 0.07, gold, z, base, m);
        bar(s, p.u, [e, out, y], [e + 0.7, out, y + 0.45], 0.06, gold, z, base, m);
        // The balcony rail over it, and a lantern hanging under each street corner.
        const rl = face - sd * 0.7;
        bar(s, p.u, [-p.w * 0.8, rl, y + 1.1], [p.w * 0.8, rl, y + 1.1], 0.04, rail, z, base, m);
        for (const da of [-e + 0.3, e - 0.3])
          bulb(s + da, p.u + out, y - 0.9, 0.3, lantern, base, m);
      }
      // The crown: stepped roofs, each a dark red drum under a flared gold eave.
      const roofs = Math.max(1, Math.round(p.lift));
      for (let k = 0; k < roofs; k++) {
        const wk = 0.8 - 0.12 * k;
        const y = H + 2.6 * k;
        const dw = p.w * wk;
        const dd = p.d * wk;
        box(s, p.u, dw * 0.85, dd * 0.85, y, y + 1.6, base, [0.09, 0.012, 0.01], null, false);
        for (const fc of [-1, 1]) {
          const du = fc * (dd + 0.8);
          bar(s, p.u, [-dw - 1, du, y + 0.5], [-dw, du, y], 0.06, gold, z, base, false);
          bar(s, p.u, [-dw, du, y], [dw, du, y], 0.07, gold, z, base, false);
          bar(s, p.u, [dw, du, y], [dw + 1, du, y + 0.5], 0.06, gold, z, base, false);
        }
      }
      if (tall) {
        const top = H + 2.6 * roofs;
        bar(s, p.u, [0, 0, top], [0, 0, top + 8], 0.08, gold, z, base, false);
        for (const y of [2, 4, 6]) bulb(s, p.u, top + y, 0.35, gold, base, false);
      }
      // Lit windows up the street face.
      const i = Math.floor(p.id / 2);
      const tones: V3[] = [
        [1.3, 0.85, 0.42],
        [1.4, 0.4, 0.16],
        [1.4, 1.15, 0.8],
        [0.4, 1.3, 0.8],
      ];
      for (const w of ctWindows(i, sd, n, p.w)) {
        const q = P(s, p.u, w.da, face - sd * 0.05, w.h, base);
        win.pos.push(q[0], q[1], q[2]);
        win.col.push(...tones[w.t]);
        win.ss.push(s);
        win.size.push(0.34);
      }
    }

    /**
     * A lettered sign from the atlas: a blade standing out from the wall, facing along the road
     * (lettered on both faces, each reading the right way to whoever it faces), or a board flat
     * on the face reading to the road; a neon frame along its edges in its ink.
     */
    function lettered(p: Piece, base: number) {
      if (p.cell === undefined) return;
      const s = p.s;
      const along = p.w < p.d;
      const r = ctCellRect(p.kind === 'blade' ? 'blade' : 'board', p.cell).uv;
      const h0 = p.lift;
      const h1 = p.lift + p.h;
      const m = h0 < MIRROR_CAP;
      const frame = glowCol(p.colour, 1.5);
      const z: V3 = [0, 0, 0];
      if (along) {
        // Its two faces, a hair apart: to who comes (its left at the higher u) and who goes.
        const hi = p.u + p.d;
        const lo = p.u - p.d;
        for (const [ds, uL, uR] of [
          [-0.03, hi, lo],
          [0.03, lo, hi],
        ] as const) {
          const A = P(s + ds, uL, 0, 0, h0, base);
          const B = P(s + ds, uR, 0, 0, h0, base);
          const C = P(s + ds, uR, 0, 0, h1, base);
          const D = P(s + ds, uL, 0, 0, h1, base);
          signs.quad(A, B, C, D, r);
        }
        bar(s, p.u, [0, -p.d, h0], [0, p.d, h0], 0.05, frame, z, base, m);
        bar(s, p.u, [0, -p.d, h1], [0, p.d, h1], 0.05, frame, z, base, m);
        // The edge out over the street (a roof board: both ends).
        const edges = p.kind === 'blade' ? [-p.side * p.d] : [-p.d, p.d];
        for (const eu of edges) bar(s, p.u, [0, eu, h0], [0, eu, h1], 0.06, frame, z, base, m);
      } else {
        // Flat on a wall facing the road: on the left wall its left is behind you, on the right
        // wall ahead.
        const sl = p.side > 0 ? -p.w : p.w;
        const du = -p.side * p.d;
        const A = P(s, p.u, sl, du, h0, base);
        const B = P(s, p.u, -sl, du, h0, base);
        const C = P(s, p.u, -sl, du, h1, base);
        const D = P(s, p.u, sl, du, h1, base);
        signs.quad(A, B, C, D, r);
        const fu = du * 1.6;
        bar(s, p.u, [-p.w, fu, h0], [p.w, fu, h0], 0.05, frame, z, base, m);
        bar(s, p.u, [-p.w, fu, h1], [p.w, fu, h1], 0.05, frame, z, base, m);
      }
    }

    function drawPiece(p: Piece) {
      const s = p.s;
      const half = def.half(s);
      // Down in the underpass's void a piece stands on its floor, given; up on the lake arcade's
      // deck, on the deck.
      // A street tower stands down to the lower of the ground at its middle and at its face, so on
      // a swell or a bank its foot never shows over the slope in front of it.
      const base =
        p.base ??
        (p.kind === 'shophouse'
          ? Math.min(groundAt(s, p.u), groundAt(s, p.u - p.side * p.d))
          : groundAt(s, p.u));
      lifted = base > groundAt(s, p.u) + 1;
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
          if (th === 'chinatown') {
            shophouse(p, base);
            break;
          }
          box(s, p.u, p.w, p.d, 0, p.h, base, [0.03, 0.012, 0.01], glowCol(GOLDISH, 0.8));
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
        case 'blade':
        case 'billboard':
          lettered(p, base);
          break;
        case 'gantry': {
          // The paths' sign gantry: two dark red posts and a beam, its top edge in gold light.
          const e = centre(s);
          const red: V3 = [0.12, 0.012, 0.01];
          for (const end of [-p.d, p.d])
            box(s, p.u + end, 0.3, 0.3, 0, p.lift, groundAt(s, p.u + end), red, null);
          box(s, p.u, 0.25, p.d, p.lift - 0.5, p.lift, e, red, null);
          bar(
            s,
            p.u,
            [0, -p.d, p.lift + 0.05],
            [0, p.d, p.lift + 0.05],
            0.05,
            glowCol(c, 1.8),
            [0, 0, 0],
            e,
          );
          break;
        }
        case 'beacon':
          // On the balcony road at its own height; elsewhere over the ground.
          if (p.z !== undefined) bulb(s, p.u, p.z, p.w, glowCol(c, 2.4), 0, false);
          else bulb(s, p.u, p.lift, p.w, glowCol(c, 2.4), base);
          break;
        case 'pillar':
          box(
            s,
            p.u,
            0.3,
            0.3,
            0,
            Math.max(0.5, (p.z ?? 0) - base),
            base,
            [0.14, 0.014, 0.01],
            null,
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
    const signMat = signs.empty ? null : ctSignMaterial();
    if (signMat) {
      const mesh = new THREE.Mesh(signs.geometry(), signMat);
      mesh.renderOrder = 3;
      mesh.frustumCulled = false;
      g.add(mesh);
    }
    if (winMat && win.pos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(win.pos, 3));
      geo.setAttribute('aCol', new THREE.Float32BufferAttribute(win.col, 3));
      geo.setAttribute('aS', new THREE.Float32BufferAttribute(win.ss, 1));
      geo.setAttribute('aSize', new THREE.Float32BufferAttribute(win.size, 1));
      const pts = new THREE.Points(geo, winMat);
      pts.frustumCulled = false;
      pts.renderOrder = 4;
      g.add(pts);
    }
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
      if (fireMat) fireMat.uniforms.uYou.value = s;
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
      if (lakeCities) {
        // The lake cities while they can be seen: past the underpass's void around each Undertown
        // (on the right), and past the lake arcade after it (on the left, its own skyline).
        const want = new Map<string, { at: number; seed: number; side: 1 | -1; near: number }>();
        const k = lakeNear(s);
        if (k !== null && Math.abs(s - lakeAnchor(k)) < LAKE_SEEN)
          want.set(`u${k}`, { at: lakeAnchor(k), seed: k, side: -1, near: LAKE_CITY.NEAR });
        for (const v of vistasBetween(s - LAKE_SEEN - 1000, s + LAKE_SEEN + 1000)) {
          const at = v.start + v.length / 2;
          if (Math.abs(s - at) < LAKE_SEEN)
            want.set(`v${v.k}`, { at, seed: v.k + VISTA_SEED, side: v.side, near: VISTA_NEAR });
        }
        for (const [key, l] of lakes) {
          if (want.has(key)) continue;
          group.remove(l.group);
          disposeGroup(l.group);
          lakes.delete(key);
        }
        for (const [key, w] of want) {
          if (lakes.has(key)) continue;
          const f = frameAt(track, w.at);
          const lg = buildLakeCity(w.seed, f.h, lakeMat, cityBody, cityLit, w.side, w.near);
          group.add(lg);
          lakes.set(key, { group: lg, x: f.x, y: f.y });
        }
        for (const l of lakes.values()) l.group.position.set(l.x - ox, 0, -(l.y - oy));
      }
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
      for (const l of lakes.values()) disposeGroup(l.group);
      lakes.clear();
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
        lakeMat,
        cityBody,
        cityLit,
      ])
        m.dispose();
      fireMat?.dispose();
      winMat?.dispose();
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
