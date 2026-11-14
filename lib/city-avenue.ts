/*
 * The Grand Avenue of the City of Dreams (docs/specs/art-city.md, "The Grand Avenue"): the main
 * avenue down the middle of the plan, given its own design in every quarter it runs through, on
 * many levels above the street, and a gateway at every band's edge so the plan's turn (Matrix
 * back into Chinatown) flows on without a seam.
 *
 * 2026-11-14: "make the main street when u go from chinatown start forward forever unique. on
 * multiple heights so it is all top quality stuff like chinatown main street part. but not only
 * close to ground level. and make it a loop so when i go to end of map it goes back to the other
 * side. so from china town forward finish game and goes back to china town so u can go infinitely
 * forward." And: "make sure these main streets are high with many vertical levels. so I don't fly
 * on road level and all good info is on the levels above road level as well."
 *
 * Each band's stretch of the avenue has: its walls raised (avenueHeight, used by lib/city-game.ts
 * blockTower), galleries stacked up both façades at four to seven levels, bridges across the avenue
 * at four heights (two in each block, the other two in the next), a feature overhead in places
 * (a ceiling of lamps, a garden deck, a crane, a neon grid, a glyph cascade, sun discs), and its
 * roofs lit (gardens, pools, landing pads, stepped crowns, signs). Everything here is light: the
 * Ship flies through it (it never enters lib/city-game.ts `blocked`), so the avenue, the autopilot's
 * route, the races and the quarter starts stay as clear as they were.
 *
 * Original designs only, each in its quarter's own colours; the light is mellow: every hue drifts
 * slowly between the two quarters' colours, lamps twinkle softly, nothing flashes. Only what is
 * near the eye and ahead of it is drawn, each piece's shape built once and kept.
 *
 * Pure: no three.js, no DOM. The towers come from lib/city-game.ts, handed in (so no cycle).
 */

import { fibonacciSphere, hash, type RGB, type Vec3 } from './bigbang';
import { CODE_GREEN } from './city-code';
import { textPixels } from './city-font';
import {
  AVENUE,
  BLOCK_Z,
  boxDist,
  C,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  TAU,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { codeHeight, codeRise } from './city-rise';
import { type WordSign, wordItem } from './city-signs';
import { inMouthRows } from './city-speedway';

/** The rows of a band (as lib/city-game.ts BAND_ROWS; the tests hold the two the same). */
export const AVENUE_BAND_ROWS = 8;
const BANDS_N = TILE_J / AVENUE_BAND_ROWS;

/** What the avenue needs of a block's building. */
export type AvenueTower = {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  k: number;
  shape: string;
};

/* ---------- the walls: raised ---------- */

/**
 * How tall the avenue's own towers stand in each quarter (2026-11-14: "make sure these main streets
 * are high with many vertical levels"): from the first number to the first plus the second, so the
 * avenue is a deep street everywhere, its galleries and bridges climbing well above the road. The
 * Heights are tall already; the metro and the Chinatown lounge still lower the towers under them.
 */
const RAISE: Record<string, [number, number]> = {
  chinatown: [36, 26],
  indian: [64, 40],
  oriental: [60, 40],
  canals: [58, 36],
  golden: [70, 40],
  temples: [64, 36],
  industrial: [66, 36],
  domes: [60, 36],
  egypt: [52, 30],
  market: [72, 44],
  code: [66, 50],
};
/** An avenue tower's height in district d (hh its own 0..1), never lower than it was (h). */
export function avenueHeight(d: string, hh: number, h: number): number {
  const r = RAISE[d];
  return r ? Math.max(h, r[0] + r[1] * hh) : h;
}

/* ---------- each band's design ---------- */

export type SpanKind =
  | 'moon'
  | 'lattice'
  | 'arcade'
  | 'glass'
  | 'waterArch'
  | 'colonnade'
  | 'truss'
  | 'pipes'
  | 'obelisk'
  | 'neon'
  | 'code';
export type GalleryKind =
  | 'lantern'
  | 'jharokha'
  | 'arcade'
  | 'glass'
  | 'water'
  | 'colonnade'
  | 'catwalk'
  | 'bubble'
  | 'terrace'
  | 'neon'
  | 'glyph';
export type RoofKind =
  | 'none'
  | 'pavilion'
  | 'pool'
  | 'pad'
  | 'garden'
  | 'stepped'
  | 'sign'
  | 'dome';
export type FeatureKind =
  | 'lamps'
  | 'garden'
  | 'vines'
  | 'crane'
  | 'tube'
  | 'neonGrid'
  | 'cascade'
  | 'sundisc';
/** Something over the avenue across band rows r0..r1, at about y over the street. */
export type Feature = { kind: FeatureKind; r0: number; r1: number; y: number };

export type BandStyle = {
  /** The words on the gateway into it. */
  name: string;
  /** Its hues: the left side's, the right side's. */
  hues: [RGB, RGB];
  lamp: RGB;
  /** The heights of the bridges across the avenue, and their two designs, block by block. */
  spans: number[];
  spanKinds: [SpanKind, SpanKind];
  /** The heights of the galleries up the left and the right façades, and their designs. */
  galleries: [number[], number[]];
  galleryKinds: [GalleryKind, GalleryKind];
  roofs: [RoofKind, RoofKind];
  features: Feature[];
};

const LEAF_GOLD = mix(C.leaf, C.gold, 0.45);
const CODE_PALE = mix(CODE_GREEN, C.white, 0.45);

/**
 * The seven designs, band by band down the plan (lib/city-game.ts BANDS): Chinatown, the Indian
 * quarter and Istanbul, the Heights and the Canals, the golden gardens and the temples, the
 * industrial quarter and the domes, Egypt and the Neon market, the Matrix quarter.
 */
export const AVENUE_STYLES: BandStyle[] = [
  {
    // Chinatown: moon bridges with lanterns under their swept roofs, lantern balconies stacked up.
    name: 'CHINATOWN',
    hues: [C.red, C.red],
    lamp: C.gold,
    spans: [24, 32, 40, 50],
    spanKinds: ['moon', 'moon'],
    galleries: [
      [22, 32, 42, 52],
      [22, 32, 42, 52],
    ],
    galleryKinds: ['lantern', 'lantern'],
    roofs: ['none', 'none'],
    features: [],
  },
  {
    // Carved bay balconies stacked up the left; domed arcades and terraces in tiers on the right;
    // lattice bridges and arcade bridges between; a ceiling of hanging lamps at the band's end.
    name: 'LAMPS & DOMES',
    hues: [C.saffron, C.turquoise],
    lamp: C.marigold,
    spans: [30, 44, 58, 74],
    spanKinds: ['lattice', 'arcade'],
    galleries: [
      [22, 36, 50, 64, 78],
      [20, 34, 48, 62, 76],
    ],
    galleryKinds: ['jharokha', 'arcade'],
    roofs: ['pavilion', 'pool'],
    features: [{ kind: 'lamps', r0: 6, r1: 7, y: 96 }],
  },
  {
    // Glass skybridges at four heights, glass bands up the towers, lit water terraces stepping up
    // the Canals' side, landing pads and roof pools, and a garden deck hung high over the avenue.
    name: 'THE HEIGHTS',
    hues: [C.cyan, C.violet],
    lamp: C.white,
    spans: [36, 52, 70, 92],
    spanKinds: ['glass', 'waterArch'],
    galleries: [
      [30, 50, 70, 90, 110],
      [20, 32, 44, 56, 68],
    ],
    galleryKinds: ['glass', 'water'],
    roofs: ['pad', 'pool'],
    features: [{ kind: 'garden', r0: 5, r1: 6, y: 100 }],
  },
  {
    // Golden colonnades on four levels with gardens hanging from them, colonnade bridges, roof
    // gardens and stepped crowns, a trellis of hanging vines overhead.
    name: 'GOLDEN GARDENS',
    hues: [C.gold, C.ivory],
    lamp: C.warm,
    spans: [30, 46, 62, 80],
    spanKinds: ['colonnade', 'colonnade'],
    galleries: [
      [24, 44, 64, 84],
      [24, 44, 64, 84],
    ],
    galleryKinds: ['colonnade', 'colonnade'],
    roofs: ['garden', 'stepped'],
    features: [{ kind: 'vines', r0: 4, r1: 5, y: 104 }],
  },
  {
    // Truss gantries and pipe bridges, catwalks up the works, dome balconies on the glasshouses,
    // a long glass tube down the avenue and a travelling crane high over it.
    name: 'FORGE & GLASS',
    hues: [C.steel, C.leaf],
    lamp: C.amber,
    spans: [28, 42, 56, 72],
    spanKinds: ['truss', 'pipes'],
    galleries: [
      [24, 40, 56, 72],
      [22, 38, 54, 70],
    ],
    galleryKinds: ['catwalk', 'bubble'],
    roofs: ['pad', 'dome'],
    features: [
      { kind: 'tube', r0: 1, r1: 6, y: 76 },
      { kind: 'crane', r0: 3, r1: 4, y: 98 },
    ],
  },
  {
    // Stepped terraces up the left, neon decks every twelve up the right, floating obelisk bridges
    // and neon bridges with their boards, sun-disc gates to fly through, a neon grid overhead.
    name: 'SUN & NEON',
    hues: [C.sand, C.magenta],
    lamp: C.cyan,
    spans: [28, 42, 56, 72],
    spanKinds: ['obelisk', 'neon'],
    galleries: [
      [18, 30, 42, 54, 66],
      [20, 32, 44, 56, 68, 80, 92],
    ],
    galleryKinds: ['terrace', 'neon'],
    roofs: ['stepped', 'sign'],
    features: [
      { kind: 'sundisc', r0: 1, r1: 7, y: 54 },
      { kind: 'neonGrid', r0: 4, r1: 6, y: 104 },
    ],
  },
  {
    // Code bridges with glyphs running along them, glyph ledges up the towers, landing pads, and a
    // cascade of glyph columns hanging from a lattice high over the avenue.
    name: 'MATRIX',
    hues: [CODE_GREEN, CODE_GREEN],
    lamp: CODE_PALE,
    spans: [30, 46, 62, 80],
    spanKinds: ['code', 'code'],
    galleries: [
      [24, 44, 64, 84, 104],
      [24, 44, 64, 84, 104],
    ],
    galleryKinds: ['glyph', 'glyph'],
    roofs: ['pad', 'pad'],
    features: [{ kind: 'cascade', r0: 3, r1: 5, y: 112 }],
  },
];

/** The band of row J (0..6) and its row in the band (0..7). */
export const bandOfRow = (J: number) => {
  const lj = wrap(J, TILE_J);
  return { b: Math.floor(lj / AVENUE_BAND_ROWS), r: lj % AVENUE_BAND_ROWS };
};

/**
 * Row r of band b's two hues: its first and last rows lean toward the next band's (2026-11-14:
 * the bands blend into each other at their edges, the gateway between them in both).
 */
export function rowHues(b: number, r: number): [RGB, RGB] {
  const S = AVENUE_STYLES[b] as BandStyle;
  const o =
    r === 0
      ? (AVENUE_STYLES[wrap(b - 1, BANDS_N)] as BandStyle)
      : r === AVENUE_BAND_ROWS - 1
        ? (AVENUE_STYLES[wrap(b + 1, BANDS_N)] as BandStyle)
        : null;
  if (!o) return S.hues;
  return [mix(S.hues[0], o.hues[0], 0.3), mix(S.hues[1], o.hues[1], 0.3)];
}

/**
 * Whether something at tile-local z, y over the street keeps clear of the Heights' tube and its two
 * lounges on the avenue (lib/city-game.ts TUBE, lib/city-docks.ts LOUNGES): over rows 17 to 21 it
 * must stand at 64 or higher.
 */
const clearOfLounges = (lz: number, y: number) =>
  y >= 64 || lz < 17 * BLOCK_Z - 4 || lz > 21 * BLOCK_Z + 4;

/* ---------- shapes, as parts of light sites ---------- */

type Part = {
  n: number;
  /** Site j of n (u its middle, 0..1): its place at time t. */
  f: (u: number, j: number, o: number[], t: number) => void;
  rgb: RGB;
  rgb2: RGB;
  b: number;
  /** How much it twinkles, softly (0 none). */
  tw: number;
  /** Its own light at time t (a stream along it, a shimmer), times b. */
  k?: (j: number, t: number) => number;
};
type Model = {
  parts: Part[];
  cum: number[];
  count: number;
  lo: Vec3;
  hi: Vec3;
  probe: Vec3[];
  phase: number;
};

const part = (
  n: number,
  f: Part['f'],
  rgb: RGB,
  rgb2: RGB = rgb,
  b = 0.4,
  tw = 0,
  k?: Part['k'],
): Part => ({ n: Math.max(1, Math.round(n)), f, rgb, rgb2, b, tw, k });

/** A line from a to c, a site every `gap`. */
const line = (a: Vec3, c: Vec3, gap: number, rgb: RGB, rgb2 = rgb, b = 0.4, tw = 0): Part =>
  part(
    Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / gap,
    (u, _j, o) => {
      o[0] = lerp(a[0], c[0], u);
      o[1] = lerp(a[1], c[1], u);
      o[2] = lerp(a[2], c[2], u);
    },
    rgb,
    rgb2,
    b,
    tw,
  );

/** `count` little balls (lanterns, lamps) of `per` sites each, round centre(i). */
const balls = (
  count: number,
  per: number,
  r: number,
  centre: (i: number) => Vec3,
  rgb: RGB,
  rgb2 = rgb,
  b = 0.45,
  tw = 0.15,
): Part =>
  part(
    count * per,
    (_u, j, o) => {
      const c = centre(Math.floor(j / per));
      const q = fibonacciSphere(j % per, per);
      o[0] = c[0] + q[0] * r;
      o[1] = c[1] + q[1] * r * 1.15;
      o[2] = c[2] + q[2] * r;
    },
    rgb,
    rgb2,
    b,
    tw,
  );

/** `count` short strokes of `per` sites each, from a(i) to c(i) (columns, posts, rays, ribs). */
const strokes = (
  count: number,
  per: number,
  ends: (i: number) => [Vec3, Vec3],
  rgb: RGB,
  rgb2 = rgb,
  b = 0.35,
): Part =>
  part(
    count * per,
    (_u, j, o) => {
      const [a, c] = ends(Math.floor(j / per));
      const v = ((j % per) + 0.5) / per;
      o[0] = lerp(a[0], c[0], v);
      o[1] = lerp(a[1], c[1], v);
      o[2] = lerp(a[2], c[2], v);
    },
    rgb,
    rgb2,
    b,
  );

function build(parts: Part[], probe: Vec3[], phase: number): Model {
  const cum: number[] = [];
  let n = 0;
  for (const p of parts) {
    n += p.n;
    cum.push(n);
  }
  const lo: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const hi: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  const o = [0, 0, 0];
  for (const p of parts)
    for (let j = 0; j < p.n; j += Math.max(1, Math.floor(p.n / 12))) {
      p.f((j + 0.5) / p.n, j, o, 0);
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i] as number, o[i] as number);
        hi[i] = Math.max(hi[i] as number, o[i] as number);
      }
    }
  return { parts, cum, count: n, lo, hi, probe, phase };
}

/** Site s of model M at time t: its place, and its colour drifting slowly between its two hues. */
function siteOf(M: Model, s: number, t: number, o: number[]): boolean {
  let lo = 0;
  let hi = M.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((M.cum[mid] as number) <= s) lo = mid + 1;
    else hi = mid;
  }
  const p = M.parts[lo] as Part;
  const j = s - ((M.cum[lo] as number) - p.n);
  p.f((j + 0.5) / p.n, j, o, t);
  const w = 0.5 + 0.5 * Math.sin(t * 0.13 + M.phase + j * 0.004);
  const tw = p.tw ? 1 - p.tw * (0.5 + 0.5 * Math.sin(t * 0.6 + j * 1.7)) : 1;
  const k = p.b * (0.88 + 0.12 * Math.sin(t * 0.45 + M.phase)) * tw * (p.k ? p.k(j, t) : 1);
  o[3] = lerp(p.rgb[0], p.rgb2[0], w) * k;
  o[4] = lerp(p.rgb[1], p.rgb2[1], w) * k;
  o[5] = lerp(p.rgb[2], p.rgb2[2], w) * k;
  return true;
}

/** A slow stream of light running along a row of sites (glyphs, shimmer): 0.25..1, smooth. */
const stream = (seed: number, speed: number, every: number) => (j: number, t: number) => {
  const x = frac((j - t * speed + seed * 7.3) / every);
  return 0.25 + 0.75 * Math.exp(-((x - 0.5) ** 2) / 0.02);
};

/* ---------- the bridges across the avenue ---------- */

/** A bridge across the avenue: wall to wall, x0..x1, at height y (world), its middle at z. */
export type Span = {
  kind: SpanKind;
  x0: number;
  x1: number;
  y: number;
  z: number;
  band: number;
  row: number;
  key: number;
};

/**
 * The bridges across the avenue in row J of tile column m: two of the band's four heights in each
 * block (the other two in the next), wherever both walls reach, staggered along the block so they
 * never stand one over another. Light, as Chinatown's walkways are: the Ship flies through.
 */
export function avenueSpans(m: number, J: number, towerAt: (I: number, J: number) => AvenueTower) {
  const out: Span[] = [];
  const { b, r } = bandOfRow(J);
  const S = AVENUE_STYLES[b] as BandStyle;
  const I0 = m * TILE_I;
  const A = towerAt(I0 - 1, J);
  const B = towerAt(I0, J);
  if (!solid(A) || !solid(B)) return out;
  const x0 = A.x + A.hx;
  const x1 = B.x - B.hx;
  const xc = m * TILE_X;
  if (x0 > xc - AVENUE + 2 || x1 < xc + AVENUE - 2 || x1 - x0 > 30) return out;
  let z0 = Math.max(A.z - A.hz, B.z - B.hz) + 1.5;
  let z1 = Math.min(A.z + A.hz, B.z + B.hz) - 1.5;
  if (z1 - z0 < 2) [z0, z1] = [(J + 0.5) * BLOCK_Z - 1, (J + 0.5) * BLOCK_Z + 1];
  const top = Math.min(lowest(A), lowest(B)) - 2;
  const lz = wrap(J, TILE_J) * BLOCK_Z;
  S.spans.forEach((h, i) => {
    if (i % 2 !== r % 2 || h > top || !clearOfLounges(lz, h)) return;
    // The speedway's mouth over Chinatown's first rows keeps its lane clear (lib/city-speedway.ts).
    if (inMouthRows(lz, GROUND + h)) return;
    out.push({
      kind: S.spanKinds[r % 2] as SpanKind,
      x0,
      x1,
      y: GROUND + h,
      z: lerp(z0, z1, (i >> 1) % 2 ? 0.72 : 0.28),
      band: b,
      row: r,
      key: mixId(J * 13 + i, m * 7 + 991),
    });
  });
  return out;
}
const solid = (tw: AvenueTower) => tw.shape === 'box' || tw.shape === 'code';
/**
 * The lowest a tower stands: a Matrix tower that rises and sinks (lib/city-rise.ts) at the
 * bottom of its cycle, so the bridges and galleries on it never stand over its roof.
 */
const lowest = (tw: AvenueTower) =>
  tw.shape === 'code' ? tw.h * (1 - (codeRise(tw.k)?.drop ?? 0)) : tw.h;
/** A roof's parts riding up and down with a Matrix tower as it rises and sinks. */
const riding = (tw: AvenueTower, parts: Part[]): Part[] =>
  tw.shape !== 'code' || !codeRise(tw.k)
    ? parts
    : parts.map((p) => ({
        ...p,
        f: (u, j, o, t) => {
          p.f(u, j, o, t);
          o[1] = (o[1] as number) + codeHeight(tw.h, tw.k, t) - tw.h;
        },
      }));

/** A bridge's parts, in its quarter's design and its two quarters' hues (a left, c right). */
function spanParts(sp: Span, a: RGB, c: RGB, lamp: RGB): Part[] {
  const { x0, x1, y, z } = sp;
  const len = x1 - x0;
  const X = (u: number) => lerp(x0, x1, u);
  const edges = (dy: number, dz: number, gap: number, rgb: RGB, rgb2: RGB, b: number) => [
    line([x0, y + dy, z - dz], [x1, y + dy, z - dz], gap, rgb, rgb2, b),
    line([x0, y + dy, z + dz], [x1, y + dy, z + dz], gap, rgb, rgb2, b),
  ];
  switch (sp.kind) {
    case 'moon': {
      // A deck arching gently, red rails, a gold ridge with its ends swept up, lanterns under it.
      const arch = (u: number) => 1.1 * Math.sin(Math.PI * u);
      const nL = Math.max(2, Math.floor(len / 3));
      return [
        part(
          (2 * len) / 0.45,
          (u, j, o) => {
            o[0] = X(u);
            o[1] = y + arch(u);
            o[2] = z + (j % 2 ? 1.1 : -1.1);
          },
          C.gold,
          C.amber,
          0.32,
        ),
        part(
          (2 * len) / 0.6,
          (u, j, o) => {
            o[0] = X(u);
            o[1] = y + arch(u) + 1.05;
            o[2] = z + (j % 2 ? 1.1 : -1.1);
          },
          C.red,
          a,
          0.34,
        ),
        part(
          len / 0.45,
          (u, _j, o) => {
            const e = Math.abs(2 * u - 1);
            o[0] = lerp(x0 - 0.6, x1 + 0.6, u);
            o[1] = y + arch(u) + 2.8 + 0.8 * e ** 4;
            o[2] = z;
          },
          C.gold,
          C.gold,
          0.4,
        ),
        balls(
          nL,
          7,
          0.38,
          (i) => {
            const u = (i + 0.5) / nL;
            return [X(u), y + arch(u) + 1.9, z];
          },
          mix(C.red, C.amber, 0.25),
          C.red,
          0.48,
        ),
      ];
    }
    case 'lattice': {
      // A deck and a rail with a carved diamond lattice between them, lamps along its foot.
      const nJ = Math.ceil(len / 0.32);
      const tri = (v: number) => Math.abs(2 * frac(v) - 1);
      return [
        ...edges(0, 1, 0.45, a, lamp, 0.34),
        ...edges(1.5, 1, 0.55, a, c, 0.3),
        part(
          4 * nJ,
          (_u, j, o) => {
            const side = j & 1;
            const ph = (j >> 1) & 1;
            const u = ((j >> 2) + 0.5) / nJ;
            o[0] = X(u);
            o[1] = y + 1.5 * (ph ? tri((u * len) / 1.2) : 1 - tri((u * len) / 1.2));
            o[2] = z + (side ? 1 : -1);
          },
          lamp,
          a,
          0.26,
        ),
        balls(
          Math.floor(len / 1.4),
          3,
          0.12,
          (i) => [x0 + 0.7 + i * 1.4, y - 0.25, z + (i % 2 ? 1 : -1)],
          C.marigold,
          C.warm,
          0.5,
          0.3,
        ),
      ];
    }
    case 'arcade': {
      // A deck on a row of pointed arches, a small dome at its middle, lamps hung in the arches.
      const nA = Math.max(3, Math.round(len / 2.4));
      const per = 16;
      return [
        ...edges(0, 1, 0.45, c, a, 0.34),
        ...edges(1.0, 1, 0.6, c, lamp, 0.26),
        part(
          2 * nA * per,
          (_u, j, o) => {
            const side = j & 1;
            const q = j >> 1;
            const i = Math.floor(q / per);
            const v = ((q % per) + 0.5) / per;
            o[0] = x0 + (i + v) * (len / nA);
            o[1] = y - 2.4 * Math.abs(2 * v - 1) ** 0.7;
            o[2] = z + (side ? 1 : -1);
          },
          c,
          C.turquoise,
          0.3,
        ),
        part(
          40,
          (_u, j, o) => {
            const q = fibonacciSphere(j, 80);
            o[0] = (x0 + x1) / 2 + q[0] * 1.5;
            o[1] = y + 1.1 + Math.abs(q[1]) * 1.6;
            o[2] = z + q[2] * 1.5;
          },
          c,
          lamp,
          0.36,
        ),
        balls(
          nA,
          5,
          0.22,
          (i) => [x0 + (i + 0.5) * (len / nA), y - 1.3, z],
          C.amber,
          C.turquoise,
          0.5,
          0.2,
        ),
      ];
    }
    case 'glass': {
      // A glass skybridge: four edges, a rib every two, a slow shimmer running over its sides.
      const nR = Math.ceil(len / 2);
      const nG = Math.ceil(len / 0.5);
      return [
        ...edges(0, 1.3, 0.45, a, c, 0.36),
        ...edges(2.6, 1.3, 0.55, a, C.white, 0.3),
        part(
          nR * 12,
          (_u, j, o) => {
            const i = Math.floor(j / 12);
            const [px, pz] = rectAround((j % 12) / 12, 1.3, 1.3);
            o[0] = x0 + (i + 0.5) * (len / nR);
            o[1] = y + 1.3 + px;
            o[2] = z + pz;
          },
          a,
          C.white,
          0.22,
        ),
        part(
          nG * 2,
          (_u, j, o) => {
            const u = ((j >> 1) + 0.5) / nG;
            o[0] = X(u);
            o[1] = y + 0.6 + 1.4 * hash(j, 77);
            o[2] = z + (j & 1 ? 1.3 : -1.3);
          },
          mix(a, C.white, 0.5),
          c,
          0.3,
          0,
          stream(sp.key % 97, 3, 24),
        ),
      ];
    }
    case 'waterArch': {
      // An arched bridge with lit water running down its middle, its arch below it.
      const lift = (u: number) => 1.5 * Math.sin(Math.PI * u);
      return [
        part(
          (2 * len) / 0.45,
          (u, j, o) => {
            o[0] = X(u);
            o[1] = y + lift(u);
            o[2] = z + (j % 2 ? 1.2 : -1.2);
          },
          c,
          a,
          0.34,
        ),
        part(
          len / 0.4,
          (u, _j, o, t) => {
            o[0] = X(u);
            o[1] = y + lift(u) + 0.1;
            o[2] = z + 0.35 * Math.sin(u * 9 + t * 0.6);
          },
          C.violet,
          C.turquoise,
          0.42,
          0.25,
        ),
        part(
          (2 * len) / 0.55,
          (u, j, o) => {
            o[0] = X(u);
            o[1] = y - 2.6 + 2.6 * Math.sin(Math.PI * u) ** 0.6;
            o[2] = z + (j % 2 ? 1.2 : -1.2);
          },
          c,
          C.violet,
          0.24,
        ),
        balls(
          4,
          5,
          0.25,
          (i) => [i < 2 ? x0 + 1 : x1 - 1, y + 1.4, z + (i % 2 ? 1.2 : -1.2)],
          lamp,
          c,
        ),
      ];
    }
    case 'colonnade': {
      // A deck carried on two rows of slim columns under an architrave, gardens trailing below.
      const nC = Math.max(4, Math.round(len / 1.8));
      return [
        ...edges(0, 1, 0.45, a, c, 0.36),
        ...edges(2.4, 1, 0.5, a, C.warm, 0.34),
        strokes(
          2 * nC,
          6,
          (i) => {
            const x = x0 + ((i >> 1) + 0.5) * (len / nC);
            const zz = z + (i & 1 ? 1 : -1);
            return [
              [x, y, zz],
              [x, y + 2.4, zz],
            ];
          },
          c,
          a,
          0.3,
        ),
        part(
          nC * 10,
          (_u, j, o) => {
            const i = Math.floor(j / 10);
            const q = j % 10;
            o[0] = x0 + (i + 0.5) * (len / nC) + (hash(j, 61) - 0.5) * 1.2;
            o[1] = y - 0.3 - q * 0.22 * (0.6 + hash(i, 62));
            o[2] = z + (i % 2 ? 1.05 : -1.05);
          },
          LEAF_GOLD,
          C.rose,
          0.32,
          0.2,
        ),
      ];
    }
    case 'truss': {
      // A Warren truss: four chords, the diagonals zigzagging between them, a lamp at every node.
      const panel = 2.2;
      const nP = Math.max(3, Math.round(len / panel));
      const per = 8;
      return [
        ...edges(0, 1.2, 0.45, a, C.white, 0.34),
        ...edges(2.2, 1.2, 0.5, a, c, 0.3),
        part(
          2 * nP * per,
          (_u, j, o) => {
            const side = j & 1;
            const q = j >> 1;
            const i = Math.floor(q / per);
            const v = ((q % per) + 0.5) / per;
            o[0] = x0 + (i + v) * (len / nP);
            o[1] = y + 2.2 * (i % 2 ? 1 - v : v);
            o[2] = z + (side ? 1.2 : -1.2);
          },
          a,
          C.steel,
          0.28,
        ),
        balls(
          nP + 1,
          3,
          0.12,
          (i) => [x0 + i * (len / nP), y + (i % 2) * 2.2, z + 1.3],
          lamp,
          C.amber,
        ),
      ];
    }
    case 'pipes': {
      // Three pipes side by side, ringed every so often, hung from a light frame.
      const nR = Math.ceil(len / 0.55);
      const off: [number, number][] = [
        [-0.9, 0],
        [0, 0.9],
        [0.9, 0],
      ];
      return [
        part(
          3 * nR * 5,
          (_u, j, o) => {
            const p = off[j % 3] as [number, number];
            const q = Math.floor(j / 3);
            const i = Math.floor(q / 5);
            const ang = ((q % 5) / 5) * TAU;
            o[0] = x0 + (i + 0.5) * (len / nR);
            o[1] = y + p[1] + Math.sin(ang) * 0.32;
            o[2] = z + p[0] + Math.cos(ang) * 0.32;
          },
          a,
          c,
          0.26,
        ),
        strokes(
          Math.max(2, Math.floor(len / 4)),
          8,
          (i) => {
            const x = x0 + 2 + i * 4;
            return [
              [x, y + 1.6, z - 1.3],
              [x, y + 1.6, z + 1.3],
            ];
          },
          lamp,
          C.amber,
          0.34,
        ),
        line([x0, y + 1.6, z], [x1, y + 1.6, z], 0.6, a, lamp, 0.24),
      ];
    }
    case 'obelisk': {
      // An obelisk floating across the avenue on nothing, gold bands round its shaft, its tip lit.
      const xs = x0 + 1.2;
      const xe = x1 - 3.2;
      const half = (u: number) => lerp(0.75, 0.55, u);
      return [
        part(
          4 * Math.ceil((xe - xs) / 0.4),
          (u, j, o) => {
            const [sy, sz] = CORN[j % 4] as [number, number];
            o[0] = lerp(xs, xe, u);
            o[1] = y + sy * half(u);
            o[2] = z + sz * half(u);
          },
          a,
          C.sand,
          0.36,
        ),
        part(
          4 * 8,
          (_u, j, o) => {
            const [sy, sz] = CORN[j % 4] as [number, number];
            const v = (Math.floor(j / 4) + 0.5) / 8;
            o[0] = lerp(xe, x1 - 0.6, v);
            o[1] = y + sy * 0.55 * (1 - v);
            o[2] = z + sz * 0.55 * (1 - v);
          },
          C.gold,
          C.gold,
          0.45,
        ),
        balls(1, 9, 0.35, () => [x1 - 0.5, y, z], C.gold, C.warm, 0.7, 0.1),
        part(
          5 * 16,
          (_u, j, o) => {
            const band = Math.floor(j / 16);
            const [py, pz] = rectAround((j % 16) / 16, 1, 1);
            const u = (band + 0.5) / 5;
            o[0] = lerp(xs, xe, u);
            o[1] = y + py * half(u) * 1.05;
            o[2] = z + pz * half(u) * 1.05;
          },
          C.gold,
          c,
          0.36,
        ),
      ];
    }
    case 'neon': {
      // A neon deck: double edges drifting magenta to cyan, a zigzag under it, drops of light.
      return [
        ...edges(0, 1.1, 0.4, c, lamp, 0.42),
        ...edges(0.35, 1.1, 0.5, lamp, c, 0.3),
        part(
          len / 0.3,
          (u, _j, o) => {
            o[0] = X(u);
            o[1] = y - 0.6 * Math.abs(2 * frac((u * len) / 1.6) - 1);
            o[2] = z;
          },
          c,
          C.violet,
          0.34,
        ),
        strokes(
          Math.max(2, Math.floor(len / 3)),
          6,
          (i) => {
            const x = x0 + 1.5 + i * 3;
            return [
              [x, y - 0.2, z + 1.1],
              [x, y - 2.4, z + 1.1],
            ];
          },
          lamp,
          c,
          0.3,
        ),
      ];
    }
    default: {
      // A code bridge: green rails, and three rows of glyph lights with a stream running along.
      const nG = Math.ceil(len / 0.42);
      return [
        ...edges(0, 1, 0.45, a, CODE_PALE, 0.32),
        ...edges(1.4, 1, 0.55, a, a, 0.24),
        part(
          nG * 3 * 2,
          (_u, j, o) => {
            const side = j & 1;
            const q = j >> 1;
            const row = q % 3;
            const u = (Math.floor(q / 3) + 0.5) / nG;
            o[0] = X(u);
            o[1] = y + 0.35 + row * 0.35;
            o[2] = z + (side ? 1 : -1);
          },
          CODE_GREEN,
          CODE_PALE,
          0.42,
          0,
          stream(sp.key % 89, 18, 70),
        ),
      ];
    }
  }
}
/** The four corners of a square section, as (y, z) signs. */
const CORN: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, 1],
  [1, -1],
];
/** A point a fraction v round a rectangle's outline (half sizes p, q), as (first, second). */
function rectAround(v: number, p: number, q: number): [number, number] {
  const e = frac(v) * 4 * (p + q);
  if (e < 2 * p) return [-p + e, -q];
  if (e < 2 * p + 2 * q) return [p, -q + (e - 2 * p)];
  if (e < 4 * p + 2 * q) return [p - (e - 2 * p - 2 * q), q];
  return [-p, q - (e - 4 * p - 2 * q)];
}

/* ---------- the galleries up the façades ---------- */

/**
 * The galleries on an avenue tower's face (x = F, the avenue toward `inward`), along z0..z1, at
 * each of the levels it reaches: the design of its side of its band.
 */
function galleryParts(
  kind: GalleryKind,
  F: number,
  inward: number,
  z0: number,
  z1: number,
  levels: number[],
  hue: RGB,
  other: RGB,
  lamp: RGB,
  seed: number,
): Part[] {
  const out: Part[] = [];
  const len = z1 - z0;
  const X = (p: number) => F + inward * p;
  const Z = (u: number) => lerp(z0, z1, u);
  const along = (p: number, y: number, gap: number, rgb: RGB, rgb2: RGB, b: number) =>
    line([X(p), y, z0], [X(p), y, z1], gap, rgb, rgb2, b);
  levels.forEach((lv, m) => {
    const y = GROUND + lv;
    switch (kind) {
      case 'lantern': {
        const nL = Math.max(2, Math.floor(len / 3));
        out.push(
          along(1.6, y, 0.5, C.gold, hue, 0.3),
          along(1.6, y + 1.0, 0.6, C.red, hue, 0.3),
          strokes(
            Math.floor(len / 2),
            3,
            (i) => [
              [X(1.6), y, z0 + 1 + i * 2],
              [X(1.6), y + 1, z0 + 1 + i * 2],
            ],
            C.red,
            C.gold,
            0.26,
          ),
          balls(
            nL,
            7,
            0.36,
            (i) => [X(1.2), y - 1.1, Z((i + 0.5) / nL)],
            mix(C.red, C.amber, 0.25),
            C.red,
            0.46,
          ),
        );
        break;
      }
      case 'jharokha': {
        // Carved bay balconies: a ledge, an arched bay with a little dome over it, a lamp at its foot.
        const nB = Math.max(2, Math.floor(len / 3.2));
        const w = len / nB;
        out.push(
          along(1.4, y, 0.45, hue, lamp, 0.32),
          part(
            nB * 22,
            (_u, j, o) => {
              const i = Math.floor(j / 22);
              const q = j % 22;
              const zc = z0 + (i + 0.5) * w;
              if (q < 14) {
                const a = Math.PI * (q / 13);
                o[0] = X(1.4);
                o[1] = y + 1.2 + Math.sin(a) * 1.3;
                o[2] = zc + Math.cos(a) * 1.1;
              } else {
                const a = Math.PI * ((q - 14) / 7);
                o[0] = X(0.8);
                o[1] = y + 2.6 + Math.sin(a) * 0.8;
                o[2] = zc + Math.cos(a) * 0.9;
              }
            },
            hue,
            other,
            0.34,
          ),
          along(1.4, y + 0.8, 0.7, lamp, hue, 0.24),
          balls(
            nB,
            3,
            0.13,
            (i) => [X(1.4), y + 0.25, z0 + (i + 0.5) * w],
            C.marigold,
            C.warm,
            0.55,
            0.3,
          ),
        );
        break;
      }
      case 'arcade': {
        // A terrace on a row of pointed arches, lamps hung from the arches' crowns.
        const nA = Math.max(2, Math.round(len / 2.6));
        const w = len / nA;
        out.push(
          along(2.0, y, 0.45, hue, lamp, 0.32),
          along(2.0, y + 1.0, 0.6, hue, other, 0.24),
          part(
            nA * 14,
            (_u, j, o) => {
              const i = Math.floor(j / 14);
              const v = ((j % 14) + 0.5) / 14;
              o[0] = X(0.3);
              o[1] = y + 3.4 - 3.0 * Math.abs(2 * v - 1) ** 0.7;
              o[2] = z0 + (i + v) * w;
            },
            hue,
            C.turquoise,
            0.3,
          ),
          balls(nA, 5, 0.22, (i) => [X(1.1), y + 2.0, z0 + (i + 0.5) * w], C.amber, hue, 0.5, 0.2),
        );
        break;
      }
      case 'glass': {
        const nM = Math.floor(len / 1.5);
        out.push(
          along(0.8, y, 0.45, hue, C.white, 0.32),
          along(0.8, y + 3, 0.5, hue, other, 0.28),
          strokes(
            nM,
            5,
            (i) => [
              [X(0.8), y, z0 + (i + 0.5) * 1.5],
              [X(0.8), y + 3, z0 + (i + 0.5) * 1.5],
            ],
            mix(hue, C.white, 0.4),
            hue,
            0.2,
          ),
          part(
            len / 0.4,
            (u, _j, o) => {
              o[0] = X(0.75);
              o[1] = y + 1.5;
              o[2] = Z(u);
            },
            mix(hue, C.white, 0.5),
            other,
            0.36,
            0,
            stream(seed + m, 4, 40),
          ),
        );
        break;
      }
      case 'water': {
        // A lit water terrace: its ledge, the water shimmering on it, falls running down its edge.
        const nF = Math.max(1, Math.floor(len / 6));
        out.push(
          along(2.2, y, 0.45, hue, lamp, 0.3),
          part(
            len / 0.35,
            (u, _j, o, t) => {
              o[0] = X(1.6 + 0.3 * Math.sin(u * 11 + t * 0.5));
              o[1] = y + 0.25;
              o[2] = Z(u);
            },
            C.violet,
            C.turquoise,
            0.4,
            0.3,
          ),
          part(
            nF * 12,
            (_u, j, o, t) => {
              const i = Math.floor(j / 12);
              const f = frac((j % 12) / 12 + t * 0.25);
              o[0] = X(2.3 + 0.2 * f);
              o[1] = y - 5 * f;
              o[2] = z0 + (i + 0.5) * (len / nF);
            },
            mix(C.turquoise, C.white, 0.3),
            C.violet,
            0.34,
          ),
        );
        break;
      }
      case 'colonnade': {
        // Slim columns between a base and an architrave, a garden hanging from the base.
        const nC = Math.max(3, Math.round(len / 2.2));
        const w = len / nC;
        out.push(
          along(1.6, y, 0.45, hue, other, 0.32),
          along(1.6, y + 5, 0.5, hue, C.warm, 0.34),
          strokes(
            nC + 1,
            8,
            (i) => [
              [X(1.6), y, z0 + i * w],
              [X(1.6), y + 5, z0 + i * w],
            ],
            hue,
            other,
            0.28,
          ),
          part(
            nC * 9,
            (_u, j, o) => {
              const i = Math.floor(j / 9);
              const q = j % 9;
              o[0] = X(1.5 + 0.3 * hash(j, 63));
              o[1] = y - 0.3 - q * 0.2 * (0.6 + hash(i + seed, 64));
              o[2] = z0 + (i + hash(j, 65)) * w;
            },
            LEAF_GOLD,
            C.rose,
            0.32,
            0.2,
          ),
        );
        break;
      }
      case 'catwalk': {
        const nS = Math.floor(len / 1.5);
        out.push(
          along(0.4, y, 0.6, hue, hue, 0.24),
          along(1.8, y, 0.45, hue, C.white, 0.32),
          along(1.8, y + 1.1, 0.6, hue, lamp, 0.26),
          strokes(
            nS,
            3,
            (i) => [
              [X(1.8), y, z0 + (i + 0.5) * 1.5],
              [X(1.8), y + 1.1, z0 + (i + 0.5) * 1.5],
            ],
            hue,
            hue,
            0.22,
          ),
          strokes(
            Math.floor(len / 3),
            5,
            (i) => [
              [X(1.8), y, z0 + 1.5 + i * 3],
              [X(0), y - 1.8, z0 + 1.5 + i * 3],
            ],
            hue,
            other,
            0.2,
          ),
          balls(
            Math.max(1, Math.floor(len / 6)),
            3,
            0.12,
            (i) => [X(1.8), y + 1.3, z0 + 3 + i * 6],
            lamp,
            C.amber,
            0.55,
            0.25,
          ),
        );
        break;
      }
      case 'bubble': {
        // Dome balconies: half bubbles of glass standing out of the wall, green light inside.
        const nB = Math.max(1, Math.floor(len / 5));
        const w = len / nB;
        out.push(
          part(
            nB * 34,
            (_u, j, o) => {
              const i = Math.floor(j / 34);
              const q = fibonacciSphere(j % 34, 34);
              o[0] = X(Math.abs(q[0]) * 1.8);
              o[1] = y + 1.6 + q[1] * 1.8;
              o[2] = z0 + (i + 0.5) * w + q[2] * 1.8;
            },
            mix(hue, C.white, 0.35),
            hue,
            0.3,
          ),
          part(
            nB * 16,
            (_u, j, o) => {
              const i = Math.floor(j / 16);
              const a = ((j % 16) / 16) * TAU;
              o[0] = X(0.1);
              o[1] = y + 1.6 + Math.sin(a) * 1.85;
              o[2] = z0 + (i + 0.5) * w + Math.cos(a) * 1.85;
            },
            hue,
            other,
            0.34,
          ),
          balls(
            nB,
            5,
            0.5,
            (i) => [X(0.7), y + 1.2, z0 + (i + 0.5) * w],
            C.leaf,
            LEAF_GOLD,
            0.4,
            0.2,
          ),
        );
        break;
      }
      case 'terrace': {
        // Stepped terraces: each ledge further out than the one under it, lamps on its edge, a
        // battered parapet down to the wall, small obelisk lamps along it.
        const p = 1.2 + 0.25 * m;
        out.push(
          along(p, y, 0.45, hue, C.gold, 0.32),
          balls(
            Math.floor(len / 1.2),
            2,
            0.08,
            (i) => [X(p), y + 0.2, z0 + 0.6 + i * 1.2],
            C.gold,
            C.warm,
            0.5,
            0.25,
          ),
          strokes(
            Math.floor(len / 4),
            6,
            (i) => [
              [X(p), y, z0 + 2 + i * 4],
              [X(0), y - 3, z0 + 2 + i * 4],
            ],
            hue,
            hue,
            0.22,
          ),
          strokes(
            Math.max(1, Math.floor(len / 6)),
            6,
            (i) => [
              [X(p - 0.3), y, z0 + 3 + i * 6],
              [X(p - 0.3), y + 2.2, z0 + 3 + i * 6],
            ],
            C.sand,
            C.gold,
            0.36,
          ),
        );
        break;
      }
      case 'neon': {
        out.push(
          along(1.2, y, 0.4, hue, lamp, 0.4),
          along(1.6, y + 0.3, 0.5, lamp, hue, 0.32),
          strokes(
            Math.max(1, Math.floor(len / 5)),
            7,
            (i) => [
              [X(0.2), y, z0 + 2.5 + i * 5],
              [X(0.2), y + 4, z0 + 2.5 + i * 5],
            ],
            i0(m) ? C.violet : lamp,
            hue,
            0.34,
          ),
        );
        break;
      }
      default: {
        // Glyph ledges: a green ledge and three rows of glyph lights, a stream falling along them.
        const nG = Math.ceil(len / 0.45);
        out.push(
          along(1.0, y, 0.5, hue, CODE_PALE, 0.3),
          part(
            nG * 3,
            (_u, j, o) => {
              const row = j % 3;
              o[0] = X(0.2);
              o[1] = y + 0.6 + row * 0.5;
              o[2] = z0 + (Math.floor(j / 3) + 0.5) * (len / nG);
            },
            CODE_GREEN,
            CODE_PALE,
            0.42,
            0,
            stream(seed * 3 + m, 20, 60),
          ),
        );
      }
    }
  });
  return out;
}
const i0 = (m: number) => m % 2 === 0;

/* ---------- the roofs along the avenue ---------- */

/** An avenue tower's lit roof, in its side's design: never a plain black roof. */
function roofParts(kind: RoofKind, tw: AvenueTower, hue: RGB, other: RGB, lamp: RGB): Part[] {
  const Y = GROUND + tw.h;
  const ax = tw.hx - 1.2;
  const az = tw.hz - 1.2;
  const r = Math.min(ax, az);
  const garden = (n: number) =>
    part(
      n,
      (_u, j, o) => {
        o[0] = tw.x + (hash(j, 71) * 2 - 1) * ax;
        o[1] = Y + 0.3 + 0.8 * hash(j, 72);
        o[2] = tw.z + (hash(j, 73) * 2 - 1) * az;
      },
      LEAF_GOLD,
      C.leaf,
      0.3,
      0.25,
    );
  const rim = (inset: number, dy: number, gap: number, rgb: RGB, rgb2: RGB, b: number) =>
    part(
      (4 * (ax + az - 2 * inset)) / gap,
      (u, _j, o) => {
        const [px, pz] = rectAround(u, ax - inset, az - inset);
        o[0] = tw.x + px;
        o[1] = Y + dy;
        o[2] = tw.z + pz;
      },
      rgb,
      rgb2,
      b,
    );
  switch (kind) {
    case 'pavilion':
      return [
        garden(46),
        rim(0.5, 0.2, 0.9, lamp, hue, 0.34),
        strokes(
          4,
          6,
          (i) => {
            const [sx, sz] = CORN[i] as [number, number];
            return [
              [tw.x + sx * 1.3, Y, tw.z + sz * 1.3],
              [tw.x + sx * 1.3, Y + 2.6, tw.z + sz * 1.3],
            ];
          },
          hue,
          lamp,
          0.34,
        ),
        part(
          36,
          (_u, j, o) => {
            const q = fibonacciSphere(j, 72);
            o[0] = tw.x + q[0] * 1.7;
            o[1] = Y + 2.6 + Math.abs(q[1]) * 1.9;
            o[2] = tw.z + q[2] * 1.7;
          },
          hue,
          C.gold,
          0.4,
        ),
      ];
    case 'pool':
      return [
        rim(1.2, 0.15, 0.6, hue, C.white, 0.36),
        part(
          Math.round(ax * az * 0.8),
          (_u, j, o, t) => {
            const u = hash(j, 74);
            const v = hash(j, 75);
            o[0] = tw.x + (2 * u - 1) * (ax - 1.6);
            o[1] = Y + 0.12 + 0.05 * Math.sin(t * 0.8 + j);
            o[2] = tw.z + (2 * v - 1) * (az - 1.6);
          },
          hue,
          other,
          0.32,
          0.4,
        ),
        balls(
          8,
          3,
          0.12,
          (i) => {
            const [px, pz] = rectAround(i / 8, ax, az);
            return [tw.x + px, Y + 0.5, tw.z + pz];
          },
          lamp,
          C.warm,
          0.5,
        ),
      ];
    case 'pad':
      return [
        part(
          Math.round((TAU * (r - 0.8)) / 0.5),
          (u, _j, o) => {
            o[0] = tw.x + Math.cos(u * TAU) * (r - 0.8);
            o[1] = Y + 0.15;
            o[2] = tw.z + Math.sin(u * TAU) * (r - 0.8);
          },
          hue,
          C.white,
          0.42,
        ),
        part(
          Math.round((TAU * (r - 2.2)) / 0.6),
          (u, _j, o) => {
            o[0] = tw.x + Math.cos(u * TAU) * (r - 2.2);
            o[1] = Y + 0.15;
            o[2] = tw.z + Math.sin(u * TAU) * (r - 2.2);
          },
          lamp,
          hue,
          0.3,
        ),
        line(
          [tw.x - 1.4, Y + 0.15, tw.z - 1.8],
          [tw.x - 1.4, Y + 0.15, tw.z + 1.8],
          0.4,
          C.white,
          hue,
          0.4,
        ),
        line(
          [tw.x + 1.4, Y + 0.15, tw.z - 1.8],
          [tw.x + 1.4, Y + 0.15, tw.z + 1.8],
          0.4,
          C.white,
          hue,
          0.4,
        ),
        line([tw.x - 1.4, Y + 0.15, tw.z], [tw.x + 1.4, Y + 0.15, tw.z], 0.4, C.white, hue, 0.4),
        balls(
          4,
          5,
          0.2,
          (i) => {
            const [sx, sz] = CORN[i] as [number, number];
            return [tw.x + sx * ax, Y + 0.6, tw.z + sz * az];
          },
          lamp,
          hue,
          0.55,
          0.3,
        ),
      ];
    case 'garden':
      return [garden(70), rim(0.4, 0.3, 0.8, lamp, hue, 0.32), rim(2.6, 0.2, 1, hue, other, 0.24)];
    case 'stepped':
      return [
        rim(0.6, 0.2, 0.6, hue, lamp, 0.34),
        rim(2.0, 1.4, 0.6, hue, other, 0.32),
        rim(3.4, 2.6, 0.6, hue, C.gold, 0.32),
        balls(1, 9, 0.4, () => [tw.x, Y + 3.8, tw.z], C.gold, C.warm, 0.7, 0.1),
      ];
    case 'sign': {
      // A billboard frame standing on the roof's avenue edge, three neon stripes across it.
      const w = az * 0.8;
      return [
        part(
          Math.round((4 * (w + 2.5)) / 0.4),
          (u, _j, o) => {
            const [pz, py] = rectAround(u, w, 2.5);
            o[0] = tw.x;
            o[1] = Y + 3 + py;
            o[2] = tw.z + pz;
          },
          hue,
          lamp,
          0.44,
        ),
        part(
          Math.round((3 * 2 * w) / 0.35),
          (u, j, o) => {
            o[0] = tw.x;
            o[1] = Y + 1.8 + (j % 3) * 1.2;
            o[2] = tw.z - w + 2 * w * u;
          },
          lamp,
          C.violet,
          0.36,
          0,
          stream(tw.k % 31, 6, 50),
        ),
      ];
    }
    case 'dome':
      return [
        part(
          70,
          (_u, j, o) => {
            const q = fibonacciSphere(j, 140);
            o[0] = tw.x + q[0] * r;
            o[1] = Y + Math.abs(q[1]) * r * 0.8;
            o[2] = tw.z + q[2] * r;
          },
          mix(hue, C.white, 0.35),
          hue,
          0.3,
        ),
        garden(30),
      ];
    default:
      return [];
  }
}

/* ---------- over the avenue: ceilings, cranes, tubes, sun discs ---------- */

function featureParts(
  F: Feature,
  xc: number,
  z0: number,
  z1: number,
  y: number,
  hue: RGB,
  other: RGB,
  lamp: RGB,
): Part[] {
  const len = z1 - z0;
  const W = AVENUE - 0.6;
  switch (F.kind) {
    case 'lamps': {
      // A lattice over the avenue, lamps hung from its every crossing on chains of their own lengths.
      const nz = Math.floor(len / 4);
      const xs = [-6, -2, 2, 6];
      return [
        ...xs.map((x) => line([xc + x, y, z0], [xc + x, y, z1], 0.6, hue, other, 0.26)),
        strokes(
          nz + 1,
          18,
          (i) => [
            [xc - W, y, z0 + i * 4],
            [xc + W, y, z0 + i * 4],
          ],
          hue,
          lamp,
          0.22,
        ),
        part(
          xs.length * (nz + 1) * 9,
          (_u, j, o, t) => {
            const node = Math.floor(j / 9);
            const q = j % 9;
            const x = xc + (xs[node % xs.length] as number);
            const z = z0 + Math.floor(node / xs.length) * 4;
            const drop = 2 + 4 * hash(node, 81);
            const sway = 0.12 * Math.sin(t * 0.5 + node);
            if (q < 3) {
              o[0] = x;
              o[1] = y - ((q + 1) / 4) * drop;
              o[2] = z + sway * (q / 3);
            } else {
              const s = fibonacciSphere(q - 3, 6);
              o[0] = x + s[0] * 0.3;
              o[1] = y - drop - 0.4 + s[1] * 0.38;
              o[2] = z + sway + s[2] * 0.3;
            }
          },
          lamp,
          other,
          0.44,
          0.2,
        ),
      ];
    }
    case 'garden': {
      // A garden deck hung high over the avenue: its rim, its deck, trees on it, vines trailing.
      const nT = Math.floor(len / 4);
      return [
        part(
          (2 * (2 * W + len)) / 0.5,
          (u, _j, o) => {
            const [px, pz] = rectAround(u, W, len / 2);
            o[0] = xc + px;
            o[1] = y;
            o[2] = (z0 + z1) / 2 + pz;
          },
          hue,
          C.white,
          0.38,
        ),
        strokes(
          Math.floor(len / 2),
          14,
          (i) => [
            [xc - W, y, z0 + 1 + i * 2],
            [xc + W, y, z0 + 1 + i * 2],
          ],
          hue,
          other,
          0.16,
        ),
        part(
          2 * nT * 12,
          (_u, j, o) => {
            const i = Math.floor(j / 12);
            const q = fibonacciSphere(j % 12, 12);
            o[0] = xc + (i % 2 ? 5.5 : -5.5) + q[0] * 1.3;
            o[1] = y + 1.8 + q[1] * 1.2;
            o[2] = z0 + 2 + (i >> 1) * 4 + q[2] * 1.3;
          },
          C.leaf,
          LEAF_GOLD,
          0.34,
          0.2,
        ),
        part(
          nT * 2 * 8,
          (_u, j, o) => {
            const i = Math.floor(j / 8);
            o[0] = xc + (i % 2 ? W : -W);
            o[1] = y - 0.4 - (j % 8) * 0.35 * (0.5 + hash(i, 82));
            o[2] = z0 + 1 + (i >> 1) * 4 + hash(i, 83);
          },
          C.leaf,
          hue,
          0.28,
        ),
      ];
    }
    case 'vines': {
      const nz = Math.floor(len / 3);
      const xs = [-7, -3.5, 0, 3.5, 7];
      return [
        ...xs.map((x) => line([xc + x, y, z0], [xc + x, y, z1], 0.6, hue, C.warm, 0.3)),
        strokes(
          nz + 1,
          18,
          (i) => [
            [xc - 7, y, z0 + i * 3],
            [xc + 7, y, z0 + i * 3],
          ],
          hue,
          other,
          0.22,
        ),
        part(
          xs.length * (nz + 1) * 8,
          (_u, j, o, t) => {
            const node = Math.floor(j / 8);
            const q = j % 8;
            const drop = 3 + 4 * hash(node, 84);
            o[0] = xc + (xs[node % xs.length] as number) + 0.15 * Math.sin(t * 0.4 + node);
            o[1] = y - ((q + 1) / 8) * drop;
            o[2] = z0 + Math.floor(node / xs.length) * 3;
          },
          LEAF_GOLD,
          C.rose,
          0.34,
          0.25,
        ),
      ];
    }
    case 'crane': {
      // Two rails along the avenue's walls and a bridge crane rolling slowly between them, its
      // hook and lamp hanging.
      const at = (t: number) => lerp(z0 + 3, z1 - 3, 0.5 + 0.5 * Math.sin(t * 0.05));
      return [
        line([xc - W, y, z0], [xc - W, y, z1], 0.5, hue, lamp, 0.32),
        line([xc + W, y, z0], [xc + W, y, z1], 0.5, hue, lamp, 0.32),
        part(
          (4 * 2 * W) / 0.45,
          (u, j, o, t) => {
            o[0] = xc - W + 2 * W * u;
            o[1] = y - 0.4 + (j % 2) * 1.2;
            o[2] = at(t) + (j % 4 < 2 ? -0.6 : 0.6);
          },
          lamp,
          C.amber,
          0.36,
        ),
        part(
          30,
          (u, _j, o, t) => {
            o[0] = xc + 2 * Math.sin(t * 0.07);
            o[1] = y - 0.4 - 12 * u;
            o[2] = at(t);
          },
          hue,
          C.white,
          0.26,
        ),
        part(
          8,
          (_u, j, o, t) => {
            const q = fibonacciSphere(j, 8);
            o[0] = xc + 2 * Math.sin(t * 0.07) + q[0] * 0.4;
            o[1] = y - 12.8 + q[1] * 0.4;
            o[2] = at(t) + q[2] * 0.4;
          },
          C.amber,
          lamp,
          0.6,
        ),
      ];
    }
    case 'tube': {
      // A glass tube down the avenue's right side, ringed, plants glowing inside it.
      const x = xc + 4.6;
      const nR = Math.ceil(len / 1.5);
      return [
        part(
          nR * 10,
          (_u, j, o) => {
            const a = ((j % 10) / 10) * TAU;
            o[0] = x + Math.cos(a) * 1.6;
            o[1] = y + Math.sin(a) * 1.6;
            o[2] = z0 + (Math.floor(j / 10) + 0.5) * (len / nR);
          },
          mix(hue, C.white, 0.4),
          other,
          0.24,
        ),
        ...[0, 1, 2].map((i) => {
          const a = (i / 3) * TAU + 0.5;
          return line(
            [x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, z0],
            [x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, z1],
            0.6,
            other,
            C.white,
            0.28,
          );
        }),
        part(
          len / 0.8,
          (u, j, o) => {
            o[0] = x + (hash(j, 85) - 0.5) * 1.6;
            o[1] = y - 1.1 + hash(j, 86) * 0.9;
            o[2] = lerp(z0, z1, u);
          },
          C.leaf,
          LEAF_GOLD,
          0.36,
          0.3,
        ),
      ];
    }
    case 'neonGrid': {
      const xs = [-8, -4, 0, 4, 8];
      const nz = Math.floor(len / 3);
      return [
        ...xs.map((x, i) =>
          part(
            len / 0.4,
            (u, _j, o) => {
              o[0] = xc + x;
              o[1] = y;
              o[2] = lerp(z0, z1, u);
            },
            i % 2 ? hue : lamp,
            C.violet,
            0.36,
            0,
            stream(i * 11, 9, 90),
          ),
        ),
        strokes(
          nz + 1,
          20,
          (i) => [
            [xc - 8, y, z0 + i * 3],
            [xc + 8, y, z0 + i * 3],
          ],
          hue,
          lamp,
          0.24,
        ),
      ];
    }
    case 'cascade': {
      // Glyph columns hanging from a lattice, a slow stream of light falling down each.
      const xs = [-7, -3.5, 3.5, 7];
      const nz = Math.floor(len / 4);
      const rows = 60;
      return [
        ...xs.map((x) => line([xc + x, y, z0], [xc + x, y, z1], 0.6, hue, CODE_PALE, 0.3)),
        part(
          xs.length * (nz + 1) * rows,
          (_u, j, o) => {
            const col = Math.floor(j / rows);
            const row = j % rows;
            o[0] = xc + (xs[col % xs.length] as number);
            o[1] = y - 0.6 - row * 0.6 * (0.7 + 0.3 * hash(col, 87));
            o[2] = z0 + Math.floor(col / xs.length) * 4;
          },
          CODE_GREEN,
          CODE_PALE,
          0.44,
          0,
          (j, t) => {
            const col = Math.floor(j / rows);
            const row = j % rows;
            const head = frac(t * (0.05 + 0.04 * hash(col, 88)) + hash(col, 89)) * (rows + 20);
            const d = head - row;
            return d < 0 ? 0.12 : 0.12 + 0.88 * Math.exp(-d / 7);
          },
        ),
      ];
    }
    default:
      return [];
  }
}

/**
 * A sun disc over the avenue at z (2026-11-14, Egypt's stretch): a gold ring to fly through, a
 * second inside it, rays all round, and two wings sweeping out to the walls.
 */
function sunDiscParts(xc: number, y: number, z: number, hue: RGB, other: RGB): Part[] {
  const R = 6.4;
  return [
    part(
      110,
      (u, _j, o) => {
        o[0] = xc + Math.cos(u * TAU) * R;
        o[1] = y + Math.sin(u * TAU) * R;
        o[2] = z;
      },
      C.gold,
      hue,
      0.46,
    ),
    part(
      80,
      (u, _j, o) => {
        o[0] = xc + Math.cos(u * TAU) * (R - 1.1);
        o[1] = y + Math.sin(u * TAU) * (R - 1.1);
        o[2] = z;
      },
      hue,
      other,
      0.3,
    ),
    strokes(
      20,
      4,
      (i) => {
        const a = (i / 20) * TAU;
        return [
          [xc + Math.cos(a) * (R + 0.4), y + Math.sin(a) * (R + 0.4), z],
          [xc + Math.cos(a) * (R + 1.5), y + Math.sin(a) * (R + 1.5), z],
        ];
      },
      C.gold,
      C.warm,
      0.34,
    ),
    part(
      2 * 3 * 16,
      (_u, j, o) => {
        const side = j % 2 ? 1 : -1;
        const q = j >> 1;
        const feather = q % 3;
        const v = (Math.floor(q / 3) + 0.5) / 16;
        o[0] = xc + side * lerp(R + 0.6, AVENUE - 0.5, v);
        o[1] = y + 1.5 - feather * 0.8 - 1.6 * v * v;
        o[2] = z;
      },
      hue,
      C.gold,
      0.32,
    ),
  ];
}

/* ---------- the gateways between the bands ---------- */

/** Half the span between a gateway's pylons, how high they stand, and its crown's rise. */
export const GATE_X = AVENUE + 1.8;
export const GATE_Y = 112;
const GATE_RISE = 16;
/** The lintels across a gateway, over the street. */
export const GATE_LINTELS = [34, 64, 94];

/** A gateway at a band's edge: tile-local z, the band behind it (lower z) and the band ahead. */
export type Gateway = { z: number; from: number; to: number };
/**
 * The gateways (2026-11-14: "make it a loop ... so u can go infinitely forward"): one at each of
 * the seven band edges, the first (z = 0) the join where the plan turns, the Matrix quarter giving way
 * to Chinatown again.
 */
export const GATEWAYS: Gateway[] = Array.from({ length: BANDS_N }, (_, b) => ({
  z: b * AVENUE_BAND_ROWS * BLOCK_Z,
  from: wrap(b - 1, BANDS_N),
  to: b,
}));
const meanHue = (b: number) => {
  const h = (AVENUE_STYLES[b] as BandStyle).hues;
  return mix(h[0], h[1], 0.5);
};

/**
 * A gateway's parts: two pylons rising from the cross street's corners, three lintels, a crown
 * arching over the avenue, their light drifting between the two quarters' hues; where Chinatown is
 * one side, a flared roof on the crown and two great lanterns; where the Matrix quarter is, glyphs
 * falling down the pylons; else a ring in the crown.
 */
function gatewayParts(g: Gateway, xc: number, z: number): Part[] {
  const A = meanHue(g.from);
  const B = meanHue(g.to);
  const top = GROUND + GATE_Y;
  const out: Part[] = [];
  for (const s of [-1, 1]) {
    const x = xc + s * GATE_X;
    // Four edges up each pylon, rings round it, lamp beads up its inner face.
    out.push(
      part(
        4 * Math.ceil(GATE_Y / 0.6),
        (_u, j, o) => {
          const [cx, cz] = CORN[j % 4] as [number, number];
          o[0] = x + cx * 0.8;
          o[1] = GROUND + GATE_Y * ((Math.floor(j / 4) + 0.5) / Math.ceil(GATE_Y / 0.6));
          o[2] = z + cz * 0.8;
        },
        s < 0 ? A : B,
        s < 0 ? B : A,
        0.34,
      ),
      part(
        14 * 12,
        (_u, j, o) => {
          const i = Math.floor(j / 12);
          const [px, pz] = rectAround((j % 12) / 12, 0.95, 0.95);
          o[0] = x + px;
          o[1] = GROUND + 8 * (i + 1);
          o[2] = z + pz;
        },
        mix(A, B, 0.5),
        C.white,
        0.3,
      ),
      balls(
        Math.floor(GATE_Y / 4),
        2,
        0.1,
        (i) => [x - s * 0.9, GROUND + 2 + i * 4, z],
        C.warm,
        s < 0 ? A : B,
        0.5,
        0.2,
      ),
    );
  }
  for (const h of GATE_LINTELS) {
    const y = GROUND + h;
    out.push(
      line([xc - GATE_X, y, z - 0.6], [xc + GATE_X, y, z - 0.6], 0.4, A, B, 0.38),
      line([xc - GATE_X, y, z + 0.6], [xc + GATE_X, y, z + 0.6], 0.4, B, A, 0.38),
      balls(
        9,
        3,
        0.12,
        (i) => [xc - GATE_X + (i + 1) * ((2 * GATE_X) / 10), y - 0.5, z],
        C.warm,
        C.gold,
        0.5,
        0.2,
      ),
    );
  }
  // The crown: a double arch over the avenue, a smaller one inside it.
  for (const [r, dz, b] of [
    [1, -0.6, 0.42],
    [1, 0.6, 0.42],
    [0.72, 0, 0.3],
  ] as const) {
    out.push(
      part(
        70,
        (u, _j, o) => {
          const a = Math.PI * u;
          o[0] = xc + Math.cos(a) * GATE_X * r;
          o[1] = top + Math.sin(a) * GATE_RISE * r;
          o[2] = z + dz;
        },
        A,
        B,
        b,
      ),
    );
  }
  const chinatown = g.from === 0 || g.to === 0;
  const code = g.from === BANDS_N - 1 || g.to === BANDS_N - 1;
  if (chinatown) {
    // A flared roof over the crown, its corners swept up, and two great lanterns under the top lintel.
    out.push(
      part(
        2 * 70,
        (u, j, o) => {
          const e = Math.abs(2 * u - 1);
          o[0] = xc + (2 * u - 1) * (GATE_X + 3.5);
          o[1] = top + GATE_RISE + 1.5 + 3 * e ** 4;
          o[2] = z + (j % 2 ? 1.8 : -1.8);
        },
        C.red,
        C.gold,
        0.42,
      ),
      line(
        [xc - GATE_X, top + GATE_RISE + 2.8, z],
        [xc + GATE_X, top + GATE_RISE + 2.8, z],
        0.4,
        C.gold,
        C.gold,
        0.44,
      ),
      balls(
        2,
        22,
        1.1,
        (i) => [xc + (i ? 5 : -5), GROUND + (GATE_LINTELS[2] as number) - 2.6, z],
        mix(C.red, C.amber, 0.2),
        C.red,
        0.55,
        0.1,
      ),
    );
  }
  if (code) {
    out.push(
      part(
        2 * 2 * 90,
        (_u, j, o) => {
          const s = j % 2 ? 1 : -1;
          const face = (j >> 1) % 2 ? 1 : -1;
          const row = j >> 2;
          o[0] = xc + s * GATE_X + face * 0.5;
          o[1] = GROUND + 4 + row * 1.2;
          o[2] = z - 0.9;
        },
        CODE_GREEN,
        CODE_PALE,
        0.42,
        0,
        (j, t) => {
          const row = j >> 2;
          const head = frac(t * 0.04 + (j & 3) * 0.27) * 110;
          const d = head - row;
          return d < 0 ? 0.15 : 0.15 + 0.85 * Math.exp(-d / 8);
        },
      ),
    );
  }
  if (!chinatown && !code) {
    out.push(
      part(
        60,
        (u, _j, o) => {
          o[0] = xc + Math.cos(u * TAU) * 3;
          o[1] = top + 6 + Math.sin(u * TAU) * 3;
          o[2] = z;
        },
        B,
        A,
        0.45,
      ),
    );
  }
  return out;
}

/** The words over a gateway: the band you enter flying down (−z) on its near face, the other under it. */
export function gatewayWords(g: Gateway, xc: number, z: number, key: number): WordSign[] {
  return [
    [g.from, 88, 0.7],
    [g.to, 60, -0.7],
  ].map(([b, y, dz], i) => {
    const text = (AVENUE_STYLES[b as number] as BandStyle).name;
    const T = textPixels(text, { face: 'deco' });
    const px = Math.min(0.42, (2 * AVENUE - 2) / T.w);
    const hue = meanHue(b as number);
    return {
      text,
      at: [xc - (T.w * px) / 2, GROUND + (y as number), z + (dz as number)] as Vec3,
      px,
      rgb: hue,
      rgb2: mix(hue, C.white, 0.45),
      key: key * 2 + i,
      face: 'deco',
      frame: 'box',
    };
  });
}

/* ---------- the market's boards under its neon bridges ---------- */

const BOARD_WORDS = ['NOODLES', 'TEA', 'HOTEL', 'DREAMS', 'CAFE', 'BAR', 'CINEMA', 'NIGHT'];
function spanBoard(sp: Span, hue: RGB): WordSign {
  const text = BOARD_WORDS[Math.floor(hash(sp.key, 91) * BOARD_WORDS.length)] as string;
  const T = textPixels(text, { face: 'tall' });
  const px = Math.min(0.3, 9 / T.w);
  return {
    text,
    at: [(sp.x0 + sp.x1) / 2 - (T.w * px) / 2, sp.y - 0.8, sp.z + 1.15],
    px,
    rgb: hue,
    rgb2: C.cyan,
    key: 7700 + (sp.key % 997),
    face: 'tall',
    frame: 'board',
  };
}

/* ---------- near the eye ---------- */

const models = new Map<string, Model>();
const kept = (key: string, make: () => Model) => {
  const had = models.get(key);
  if (had) return had;
  if (models.size > 900) models.clear();
  const m = make();
  models.set(key, m);
  return m;
};
const itemOf = (M: Model, eye: Vec3, t: number, gid: number, weight: number): Item => ({
  d: boxDist(eye, M.lo, M.hi),
  gid,
  count: M.count,
  weight,
  probe: M.probe,
  site: (s, o) => siteOf(M, s, t, o),
});

/** How much further than the details the gateways are drawn (they stand tall). */
export const GATE_REACH = 110;

/**
 * Everything of the Grand Avenue near the eye, for the Ship's renderer: the bridges and galleries
 * of each block within R ahead, the roofs (seen from about their height up), the features over the
 * avenue, and the gateways (seen from further) with their words.
 */
export function avenueItems(
  eye: Vec3,
  t: number,
  R: number,
  towerAt: (I: number, J: number) => AvenueTower,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
) {
  const m = Math.round(eye[0] / TILE_X);
  const xc = m * TILE_X;
  if (Math.abs(eye[0] - xc) > R + 30) return;
  const I0 = m * TILE_I;
  const J0 = Math.floor((eye[2] - R) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + R) / BLOCK_Z);
  for (let J = J0; J <= J1; J++) {
    const zc = (J + 0.5) * BLOCK_Z;
    if (!ahead(xc, zc, BLOCK_Z)) continue;
    const { b, r } = bandOfRow(J);
    const S = AVENUE_STYLES[b] as BandStyle;
    const [ha, hb] = rowHues(b, r);
    // The bridges across.
    const spans = avenueSpans(m, J, towerAt);
    if (spans.length) {
      const M = kept(`s${m},${J}`, () =>
        build(
          spans.flatMap((sp) => spanParts(sp, ha, hb, S.lamp)),
          spans.map((sp) => [(sp.x0 + sp.x1) / 2, sp.y + 1, sp.z] as Vec3),
          J * 0.37,
        ),
      );
      const it = itemOf(M, eye, t, mixId(J, m * 31 + 7001), 1.6);
      if (it.d < R) out.push(it);
      if (b === 5)
        for (const sp of spans)
          if (sp.kind === 'neon') {
            const w = wordItem(spanBoard(sp, hb), eye, t);
            if (w.d < R * 0.7) out.push(w);
          }
    }
    // The galleries up the two façades, and the roofs.
    for (const side of [0, 1] as const) {
      const tw = towerAt(I0 - 1 + side, J);
      if (!solid(tw)) continue;
      const inward = side ? -1 : 1;
      const F = side ? tw.x - tw.hx : tw.x + tw.hx;
      if (Math.abs(F - xc) > AVENUE + 4) continue;
      const hue = side ? hb : ha;
      const other = side ? ha : hb;
      const lz = wrap(J, TILE_J) * BLOCK_Z;
      const levels = (S.galleries[side] as number[]).filter(
        (lv) => lv < lowest(tw) - 3 && (side === 1 || lv < 40 || clearOfLounges(lz, lv)),
      );
      if (levels.length) {
        const M = kept(`g${m},${J},${side}`, () =>
          build(
            galleryParts(
              S.galleryKinds[side] as GalleryKind,
              F,
              inward,
              tw.z - tw.hz + 0.8,
              tw.z + tw.hz - 0.8,
              levels,
              hue,
              other,
              S.lamp,
              tw.k,
            ),
            levels.map((lv) => [F + inward * 1.5, GROUND + lv + 1, tw.z] as Vec3),
            tw.k * 0.11,
          ),
        );
        const it = itemOf(M, eye, t, mixId(tw.k, 7101 + side), 1.3);
        if (it.d < R) out.push(it);
      }
      const roof = S.roofs[side] as RoofKind;
      if (roof !== 'none' && eye[1] > GROUND + tw.h - 25) {
        const M = kept(`r${m},${J},${side}`, () =>
          build(
            riding(tw, roofParts(roof, tw, hue, other, S.lamp)),
            [[tw.x, GROUND + tw.h + 2, tw.z]],
            tw.k * 0.07,
          ),
        );
        const it = itemOf(M, eye, t, mixId(tw.k, 7201), 1.2);
        if (it.d < R) out.push(it);
      }
    }
  }
  // The features over the avenue, band by band, and the gateways at the bands' edges.
  const n0 = Math.floor((eye[2] - R - GATE_REACH) / TILE_Z);
  const n1 = Math.floor((eye[2] + R + GATE_REACH) / TILE_Z);
  for (let n = n0; n <= n1; n++) {
    const oz = n * TILE_Z;
    AVENUE_STYLES.forEach((S, b) => {
      const bz = oz + b * AVENUE_BAND_ROWS * BLOCK_Z;
      if (bz > eye[2] + R + GATE_REACH || bz + AVENUE_BAND_ROWS * BLOCK_Z < eye[2] - R - GATE_REACH)
        return;
      S.features.forEach((F, fi) => {
        const Jb = n * TILE_J + b * AVENUE_BAND_ROWS;
        const [ha, hb] = rowHues(b, F.r0);
        if (F.kind === 'sundisc') {
          for (let r = F.r0; r <= F.r1; r += 2) {
            const z = (Jb + r + 0.5) * BLOCK_Z;
            if (Math.abs(z - eye[2]) > R || !ahead(xc, z, 10)) continue;
            const y = GROUND + F.y;
            const M = kept(`d${m},${Jb + r}`, () =>
              build(
                sunDiscParts(xc, y, z, ha, hb),
                [
                  [xc, y + 6, z],
                  [xc - 6, y, z],
                  [xc + 6, y, z],
                ],
                r,
              ),
            );
            const it = itemOf(M, eye, t, mixId(Jb + r, m * 3 + 7301), 1.6);
            if (it.d < R) out.push(it);
          }
          return;
        }
        const z0 = (Jb + F.r0) * BLOCK_Z + 2;
        const z1 = (Jb + F.r1 + 1) * BLOCK_Z - 2;
        if (z0 > eye[2] + R || z1 < eye[2] - R || !ahead(xc, (z0 + z1) / 2, (z1 - z0) / 2)) return;
        const M = kept(`f${m},${n},${b},${fi}`, () => {
          // Hung just under the walls' tops where they stand lower than its height.
          let low = Number.POSITIVE_INFINITY;
          for (let J = Jb + F.r0; J <= Jb + F.r1; J++)
            for (const I of [I0 - 1, I0]) {
              const tw = towerAt(I, J);
              if (solid(tw)) low = Math.min(low, lowest(tw));
            }
          const y = GROUND + Math.max(40, Math.min(F.y, low - 3));
          return build(
            featureParts(F, xc, z0, z1, y, ha, hb, S.lamp),
            [
              [xc, y, z0],
              [xc, y, (z0 + z1) / 2],
              [xc, y, z1],
            ],
            b + fi,
          );
        });
        const it = itemOf(M, eye, t, mixId(n * 17 + b, m * 5 + fi + 7401), 1.4);
        if (it.d < R) out.push(it);
      });
    });
    GATEWAYS.forEach((g, gi) => {
      const z = oz + g.z;
      if (Math.abs(z - eye[2]) > R + GATE_REACH || !ahead(xc, z, 30)) return;
      const M = kept(`w${m},${n},${gi}`, () =>
        build(
          gatewayParts(g, xc, z),
          [
            [xc - GATE_X, GROUND + 30, z],
            [xc + GATE_X, GROUND + 70, z],
            [xc, GROUND + GATE_Y, z],
          ],
          gi * 0.9,
        ),
      );
      const it = itemOf(M, eye, t, mixId(n * 7 + gi, m * 11 + 7501), 2);
      if (it.d > R + GATE_REACH) return;
      out.push(it);
      for (const w of gatewayWords(g, xc, z, 7600 + wrap(n * 7 + gi, 997))) {
        const wi = wordItem(w, eye, t);
        if (wi.d < R + GATE_REACH * 0.5) out.push(wi);
      }
    });
  }
}
