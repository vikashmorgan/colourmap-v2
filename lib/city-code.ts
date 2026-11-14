/*
 * The Matrix quarter of the City of Dreams (docs/specs/art-city.md, "The Matrix quarter"):
 * dark towers whose faces carry slowly falling columns of green glyph-dots, green-lit streets, and
 * on its plaza a monolithic data spire. Pure: no three.js, no DOM.
 *
 * 2026-11-13: "do a matrix quarter in green". The film is a mood only: no names, logos or
 * characters; the glyphs are our own little clusters of dots, the spire our own shape.
 *
 * Green only: a deep green for the towers' edges, the code's green for the falling columns, a pale
 * mint at the head of each column. Everything moves slowly: each column falls at two to three and
 * a half a second, its light fading smoothly behind its head (never a flash); the spire's halos
 * sink slowly down it and its beacon breathes on the quarter's beat.
 */

import { fibonacciSphere, hash, type RGB, type Vec3 } from './bigbang';
import { beat, frac, GROUND, type Item, mix, mixId, scale, TAU } from './city-grid';

const G = GROUND;

/** The quarter's three greens: deep, the code's own, pale mint. */
export const CODE_DEEP: RGB = [0.04, 0.36, 0.13];
export const CODE_GREEN: RGB = [0.22, 1, 0.42];
export const CODE_MINT: RGB = [0.72, 1, 0.8];
/** Its beat, as a ratio of the city's clock: slow. */
export const CODE_TEMPO = 1 / 3;

/** A code tower's size from its block's own number: slim and dark, taller than most. */
export function codeSize(k: number, ave: boolean): { hx: number; hz: number; h: number } {
  return {
    hx: ave ? 6.2 : 6.4 + 1.6 * hash(k, 701),
    hz: 9 + 3 * hash(k, 702),
    h: 34 + 48 * hash(k, 703) ** 1.2,
  };
}

/** The length of a column's lit trail, in cells. */
export const TRAIL = 12;
/**
 * How lit cell `row` (0 at the top) of a column of `rows` is at time t, 0..1: two streams fall
 * down each column at its own slow pace, each a pale head with its light fading smoothly behind
 * it. `seed` is the column's own number. Smooth in t: no cell ever jumps.
 */
export function rainLight(seed: number, row: number, rows: number, t: number): number {
  const v = 2 + 1.5 * hash(seed, 711);
  const L = rows + TRAIL + 6 + 14 * hash(seed, 712);
  const ph = hash(seed, 713);
  let b = 0;
  for (let k = 0; k < 2; k++) {
    // From two cells over the top (so it comes in dark) to past the trail's end under the foot.
    const head = frac((t * v) / L + ph + k * 0.5) * L - 2;
    const e = head - row;
    // Just ahead of the head it fades in over a cell; behind it, it fades out over the trail.
    const lit = e < -1 ? 0 : e < 0 ? 1 + e : e <= TRAIL ? (1 - e / TRAIL) ** 1.6 : 0;
    b = Math.max(b, lit);
  }
  return b;
}
/** Whether a cell is at a column's head (the brightest, mint). */
const headOf = (b: number) => b > 0.86;

/** The dots of a glyph: two of six places in a cell (two across, three up), fixed by the cell. */
const PAIRS: [number, number][] = [
  [0, 3],
  [1, 2],
  [0, 5],
  [2, 3],
  [1, 4],
  [3, 4],
  [0, 1],
  [4, 5],
];
function glyphDot(cell: number, dot: number, cw: number, ch: number): [number, number] {
  const pair = PAIRS[Math.floor(hash(cell, 721) * PAIRS.length)] as [number, number];
  const i = pair[dot] as number;
  return [((i % 2) - 0.5) * cw * 0.5, (1 - Math.floor(i / 2)) * ch * 0.3];
}

/** The four faces of a box: their outward normals, as lib/city.ts numbers them. */
const NORMALS: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
/** A point on face f of a box round (x, z), `a` across it (-1..1), at height y, `out` off it. */
function onFace(
  x: number,
  z: number,
  hx: number,
  hz: number,
  f: number,
  a: number,
  y: number,
  out: number,
): Vec3 {
  const [nx, nz] = NORMALS[f] as [number, number];
  if (nz !== 0) return [x + a * hx, y, z + nz * (hz + out)];
  return [x + nx * (hx + out), y, z - nx * a * hz];
}

type Rain = { f: number; cols: number; rows: number; cells: number; w: number };
/** The faces of a box turned toward the eye, each ruled into cells for the falling code. */
function rainFaces(
  x: number,
  z: number,
  hx: number,
  hz: number,
  h: number,
  eye: Vec3,
  cw: number,
  ch: number,
): Rain[] {
  const out: Rain[] = [];
  for (let f = 0; f < 4; f++) {
    const [nx, nz] = NORMALS[f] as [number, number];
    const c = onFace(x, z, hx, hz, f, 0, 0, 0);
    if ((eye[0] - c[0]) * nx + (eye[2] - c[2]) * nz <= 0.05) continue;
    const w = nz !== 0 ? hx : hz;
    const cols = Math.max(2, Math.floor((2 * w) / cw));
    const rows = Math.max(2, Math.floor(h / ch));
    out.push({ f, cols, rows, cells: cols * rows, w });
  }
  return out;
}

/** The code on site r of the rain faces: false where its cell is dark. */
function rainSite(
  faces: Rain[],
  r: number,
  per: number,
  key: number,
  at: (f: number, a: number, y: number) => Vec3,
  y0: number,
  h: number,
  t: number,
  k: number,
  o: number[],
): boolean {
  for (const R of faces) {
    const n = R.cells * per;
    if (r >= n) {
      r -= n;
      continue;
    }
    const cell = Math.floor(r / per);
    const col = cell % R.cols;
    const row = Math.floor(cell / R.cols);
    const seed = mixId(key, R.f * 97 + col);
    const b = rainLight(seed, row, R.rows, t);
    if (b < 0.04) return false;
    const cw = (2 * R.w) / R.cols;
    const ch = h / R.rows;
    const [dx, dy] = per > 1 ? glyphDot(mixId(seed, row), r % per, cw, ch) : [0, 0];
    const p = at(R.f, -1 + ((col + 0.5) * 2) / R.cols + dx / R.w, y0 + h - (row + 0.5) * ch + dy);
    [o[0], o[1], o[2]] = p;
    const c = headOf(b) ? CODE_MINT : mix(CODE_DEEP, CODE_GREEN, Math.min(1, b * 1.3));
    [o[3], o[4], o[5]] = scale(c, (0.12 + 0.5 * b) * k);
    return true;
  }
  return false;
}

/**
 * A code tower: its dark edges in deep green, a rim at its roof, the green-lit kerb round its foot
 * with a lamp every few steps, and the falling code on the faces turned toward the eye.
 */
export function codeTowerItem(
  tw: { x: number; z: number; hx: number; hz: number; h: number; k: number },
  eye: Vec3,
  t: number,
  d: number,
): Item {
  const { x, z, hx, hz, h } = tw;
  const corner = Math.ceil(h / 0.6);
  const rim = Math.ceil((4 * (hx + hz)) / 0.5);
  const kerb = Math.ceil((4 * (hx + hz + 3)) / 0.7);
  const edges = 4 * corner + rim + kerb;
  const faces = rainFaces(x, z, hx, hz, h, eye, 1.25, 1.15);
  const rain = faces.reduce((s, R) => s + R.cells * 2, 0);
  const pulse = 0.85 + 0.15 * beat(t, CODE_TEMPO, (tw.k % 7) * 0.05);
  const at = (f: number, a: number, y: number) => onFace(x, z, hx, hz, f, a, y, 0.12);
  return {
    d,
    gid: mixId(tw.k, 7401),
    count: Math.min(4200, edges + rain),
    weight: 1.25,
    probe: [
      [x, G + h, z],
      [x + hx, G + h * 0.5, z + hz],
      [x - hx, G + h * 0.5, z - hz],
      [x, G + 6, z],
    ],
    site: (s, o) => {
      if (s < 4 * corner) {
        const c = s % 4;
        const sx = c === 1 || c === 2 ? 1 : -1;
        const sz = c >= 2 ? 1 : -1;
        o[0] = x + sx * hx;
        o[1] = G + ((Math.floor(s / 4) + 0.5) * h) / corner;
        o[2] = z + sz * hz;
        [o[3], o[4], o[5]] = scale(CODE_DEEP, 0.55 * pulse);
        return true;
      }
      s -= 4 * corner;
      if (s < rim) {
        const e = ((s + 0.5) / rim) * 4 * (hx + hz);
        const P = 2 * (hx + hz);
        const m = e % P;
        const [px, pz] =
          m < 2 * hx ? [-hx + m, e < P ? -hz : hz] : [e < P ? hx : -hx, -hz + (m - 2 * hx)];
        [o[0], o[1], o[2]] = [x + px, G + h, z + pz];
        [o[3], o[4], o[5]] = scale(CODE_GREEN, 0.36 * pulse);
        return true;
      }
      s -= rim;
      if (s < kerb) {
        // The street round its foot, lit green: a kerb line and a soft lamp every few steps.
        const kx = hx + 1.5;
        const kz = hz + 1.5;
        const e = ((s + 0.5) / kerb) * 4 * (kx + kz);
        const P = 2 * (kx + kz);
        const m = e % P;
        const [px, pz] =
          m < 2 * kx ? [-kx + m, e < P ? -kz : kz] : [e < P ? kx : -kx, -kz + (m - 2 * kx)];
        [o[0], o[1], o[2]] = [x + px, G + 0.03, z + pz];
        const lamp = s % 9 === 0;
        [o[3], o[4], o[5]] = scale(lamp ? CODE_MINT : CODE_GREEN, lamp ? 0.42 : 0.16);
        return true;
      }
      return rainSite(faces, s - kerb, 2, tw.k, at, G, h, t, pulse, o);
    },
  };
}

/** The data spire: its height to the shoulder, its point, its half-width at the foot and shoulder. */
export const DATA_SPIRE = { h: 150, top: 162, w0: 8, w1: 4.5 };
const HALOS = 3;
const HALO_SITES = 110;
const BEACON = 36;
const PLAZA = 200;

/**
 * The Matrix quarter's landmark on its plaza: a monolith tapering from 16 across to 9, 150
 * high, a point on top; its four edges bright, the falling code down the faces turned toward the
 * eye, three square halos sinking slowly down it and fading in and out, a beacon breathing at its
 * point, and on the plaza a ring and lines of light running out to the streets.
 */
export function dataSpireItem(
  x: number,
  z: number,
  eye: Vec3,
  t: number,
  d: number,
  gid: number,
): Item {
  const { h, top, w0, w1 } = DATA_SPIRE;
  const half = (y: number) => w0 + (w1 - w0) * Math.min(1, Math.max(0, (y - G) / h));
  const edge = Math.ceil(h / 0.45);
  const point = 4 * 24;
  // Ruled on its mid-height width: the tapering faces carry the code the same way.
  const wm = (w0 + w1) / 2;
  const faces = rainFaces(x, z, wm, wm, h, eye, 1.5, 1.4);
  const rain = faces.reduce((s, R) => s + R.cells, 0);
  const pulse = 0.85 + 0.15 * beat(t, CODE_TEMPO);
  const at = (f: number, a: number, y: number) => {
    const w = half(y);
    return onFace(x, z, w, w, f, a, y, 0.15);
  };
  const n0 = 4 * edge + point;
  const n1 = n0 + HALOS * HALO_SITES + BEACON + PLAZA;
  return {
    d,
    gid,
    count: n1 + rain,
    weight: 1.4,
    probe: [
      [x, G + 30, z],
      [x, G + 90, z],
      [x, G + top, z],
      [x + w0, G + 8, z + w0],
    ],
    site: (s, o) => {
      if (s < 4 * edge) {
        const c = s % 4;
        const y = G + ((Math.floor(s / 4) + 0.5) * h) / edge;
        const w = half(y);
        o[0] = x + (c === 1 || c === 2 ? w : -w);
        o[1] = y;
        o[2] = z + (c >= 2 ? w : -w);
        [o[3], o[4], o[5]] = scale(mix(CODE_GREEN, CODE_MINT, 0.25), 0.5 * pulse);
        return true;
      }
      if (s < n0) {
        // The point: four edges up from the shoulder.
        const q = s - 4 * edge;
        const c = q % 4;
        const u = (Math.floor(q / 4) + 0.5) / 24;
        const w = w1 * (1 - u);
        o[0] = x + (c === 1 || c === 2 ? w : -w);
        o[1] = G + h + u * (top - h);
        o[2] = z + (c >= 2 ? w : -w);
        [o[3], o[4], o[5]] = scale(CODE_GREEN, 0.5 * pulse);
        return true;
      }
      if (s < n0 + HALOS * HALO_SITES) {
        // The halos: square rings a little off the faces, each sinking from the shoulder to the
        // foot in about seventy seconds, fading in at the top and out at the bottom.
        const q = s - n0;
        const k = Math.floor(q / HALO_SITES);
        const u = frac(t * 0.014 + k / HALOS);
        const y = G + h * (1 - u);
        const w = half(y) + 1.6;
        const e = (((q % HALO_SITES) + 0.5) / HALO_SITES) * 8 * w;
        const m = e % (2 * w);
        const side = Math.floor(e / (2 * w));
        const [px, pz] =
          side === 0
            ? [-w + m, -w]
            : side === 1
              ? [w, -w + m]
              : side === 2
                ? [w - m, w]
                : [-w, w - m];
        [o[0], o[1], o[2]] = [x + px, y, z + pz];
        [o[3], o[4], o[5]] = scale(CODE_GREEN, 0.42 * Math.sin(Math.PI * u) ** 1.5);
        return true;
      }
      if (s < n0 + HALOS * HALO_SITES + BEACON) {
        const q = fibonacciSphere(s - n0 - HALOS * HALO_SITES, BEACON);
        [o[0], o[1], o[2]] = [x + q[0] * 1.2, G + top + 1.5 + q[1] * 1.2, z + q[2] * 1.2];
        [o[3], o[4], o[5]] = scale(CODE_MINT, 0.35 + 0.35 * beat(t, CODE_TEMPO));
        return true;
      }
      if (s < n1) {
        // The plaza: a ring round the spire's foot, and eight lines of light out to the streets,
        // a slow glow running out along them.
        const q = s - n0 - HALOS * HALO_SITES - BEACON;
        if (q < 80) {
          const a = ((q + 0.5) / 80) * TAU;
          [o[0], o[1], o[2]] = [x + Math.cos(a) * 14, G + 0.05, z + Math.sin(a) * 14];
          [o[3], o[4], o[5]] = scale(CODE_GREEN, 0.3 * pulse);
          return true;
        }
        const j = q - 80;
        const ray = j % 8;
        const u = (Math.floor(j / 8) + 0.5) / 15;
        const a = (ray / 8) * TAU + Math.PI / 8;
        const r = 14 + u * 12;
        [o[0], o[1], o[2]] = [x + Math.cos(a) * r, G + 0.05, z + Math.sin(a) * r];
        const run = 0.5 + 0.5 * Math.sin(t * 0.6 - u * 5);
        [o[3], o[4], o[5]] = scale(CODE_GREEN, 0.12 + 0.2 * run);
        return true;
      }
      return rainSite(faces, s - n1, 1, gid, at, G, h, t, pulse, o);
    },
  };
}
