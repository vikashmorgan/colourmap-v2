/*
 * The City game's world (docs/specs/art-city.md, "Game design"): the planned city the Ship flies
 * through. Pure: no three.js, no DOM.
 *
 * 2026-11-12: "develop the video game city with elements from the studio. developing chinatown.
 * to go higher not just one street. but panneaux chinois on many levels of the city higher and
 * lower and other streets with lampions. or portals. or diwali lights. or tunnels inside
 * buildings u can navigate through. add a few other spaceships. plan the city."
 *
 * The plan is data: a tile of 12 blocks across and 48 along, repeating every way so the city never
 * ends. The avenue runs down its middle; six bands of eight blocks lie along it, a district on
 * each side of the avenue (Chinatown on both), each district built round one landmark on an open
 * plaza where its streets meet. Every district has one strong colour, one silhouette, one slow
 * motion. Streets stand at several levels: canals under the street, the street, sky bridges and
 * the metro high above, a lane over every roof. And the city responds: lights wake as you pass,
 * lanterns you fly through stay lit, ships move aside.
 */

import { fibonacciSphere, hash, type RGB, smooth, type Vec3 } from './bigbang';
import type { Sign, Tower } from './city';
import { bigItems, openBlock, studioBlockItems } from './city-big';
import { businessSize, coreItem, skyBridgeItem, towerItem } from './city-business';
import { carItems } from './city-cars';
import { CODE_GREEN, CODE_TEMPO, codeSize, codeTowerItem, dataSpireItem } from './city-code';
import { type Design, designFor, designHolds, designItem, studioItem } from './city-designs';
import { dockItems } from './city-docks';
import { embassyAt, embassyItems } from './city-embassy';
import { textPixels } from './city-font';
import {
  AVENUE,
  aroundRect,
  BLOCK_X,
  BLOCK_Z,
  beat,
  boxDist,
  C,
  clamp,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { crownItem, crownKey } from './city-landmarks';
import { CAR_LEN, CARS, carAt, RAIL, railAt, railCeiling, STATIONS, TRAINS } from './city-metro';
import { besideRiver, inRiver, RIVER_Y, riverClear, riverItems } from './city-rain';
import { FACADE_SHARE, FACADES, type Facade, facadeItem, roofItem } from './city-roofs';
import { ropeItems } from './city-ropes';
import {
  avenueWall,
  boardsOn,
  OPENING,
  openingRow,
  posterBoardItem,
  posterOn,
  posterSigns,
  TORII_Z,
  toriiItem,
  type WordSign,
  welcomeSign,
  wordItem,
} from './city-signs';
import { cityPortalItems } from './city-space';
import { DEEP_MOUTHS, THROUGH, underAt, underBlocked, underItems, underOpen } from './city-under';

/* ---------- the plan: districts ---------- */

export type DistrictId =
  | 'chinatown'
  | 'indian'
  | 'oriental'
  | 'heights'
  | 'canals'
  | 'golden'
  | 'temples'
  | 'industrial'
  | 'domes'
  | 'egypt'
  | 'market'
  | 'code';

export type District = {
  id: DistrictId;
  name: string;
  /** Its one colour: walls, roofs from above, its signs. */
  colour: RGB;
  /** The landmark on its plaza, if it has one. */
  landmark: string | null;
  /** Its one slow motion. */
  signature: string;
  /** Its beat, as a ratio of the city's one clock (BPM): every district its own simple tempo. */
  tempo: number;
};

/** How bright a district's lights are now: breathing on its own beat, gently (0.82..1). */
export const districtPulse = (d: DistrictId, t: number, phase = 0) =>
  0.82 + 0.18 * beat(t, DISTRICTS[d].tempo, phase);

export const DISTRICTS: Record<DistrictId, District> = {
  chinatown: {
    id: 'chinatown',
    tempo: 1,
    name: 'Chinatown',
    colour: C.red,
    landmark: 'Pagoda of nine roofs, and the race plaza',
    signature: 'red lanterns swaying, sky lanterns rising',
  },
  indian: {
    id: 'indian',
    tempo: 1 / 2,
    name: 'Indian quarter',
    colour: C.saffron,
    landmark: 'Temple of the curved spire',
    signature: 'Diwali lamps twinkling slowly',
  },
  oriental: {
    id: 'oriental',
    tempo: 2 / 3,
    name: 'Istanbul',
    colour: C.turquoise,
    landmark: 'Mosque of the four minarets',
    signature: 'domes breathing light',
  },
  heights: {
    id: 'heights',
    tempo: 2,
    name: 'The Heights',
    colour: C.cyan,
    landmark: 'The Nova Core, among the business towers',
    signature: 'pulses racing down the tube, portals turning, crowns breathing on the beat',
  },
  canals: {
    id: 'canals',
    tempo: 1 / 2,
    name: 'The Canals',
    colour: C.violet,
    landmark: null,
    signature: 'water shimmering under the street',
  },
  golden: {
    id: 'golden',
    tempo: 1 / 3,
    name: 'Golden gardens',
    colour: C.gold,
    landmark: 'The golden spire, seen from everywhere',
    signature: 'gold leaves shimmering',
  },
  temples: {
    id: 'temples',
    tempo: 1 / 4,
    name: 'Temple quarter',
    colour: C.ivory,
    landmark: 'The Studio’s ziggurat, stairs on every side',
    signature: 'a light rising from each temple',
  },
  industrial: {
    id: 'industrial',
    tempo: 1,
    name: 'Industrial quarter',
    colour: C.steel,
    landmark: 'The Studio’s foundry, its chimneys breathing steam',
    signature: 'conveyors of light, slow furnaces',
  },
  domes: {
    id: 'domes',
    tempo: 1 / 2,
    name: 'Solarpunk domes',
    colour: C.leaf,
    landmark: 'The Studio’s garden of domes',
    signature: 'plants glowing under glass',
  },
  egypt: {
    id: 'egypt',
    tempo: 1 / 4,
    name: 'Egyptian quarter',
    colour: C.sand,
    landmark: 'The great pyramid and its sphinx',
    signature: 'a light at every apex',
  },
  market: {
    id: 'market',
    tempo: 3 / 2,
    name: 'Neon market',
    colour: C.magenta,
    landmark: null,
    signature: 'word signs: bank, bar, hotel, café',
  },
  // 2026-11-13: "do a matrix quarter in green". A mood only: our own glyphs, our own spire.
  code: {
    id: 'code',
    tempo: CODE_TEMPO,
    name: 'Green Code quarter',
    colour: CODE_GREEN,
    landmark: 'The data spire, code falling down its faces',
    signature: 'columns of green glyphs falling slowly down dark towers',
  },
};

/** The six bands along the avenue, eight blocks each: the district left of it, and right. */
export const BANDS: [DistrictId, DistrictId][] = [
  ['chinatown', 'chinatown'],
  ['indian', 'oriental'],
  ['heights', 'canals'],
  ['golden', 'temples'],
  ['industrial', 'domes'],
  ['egypt', 'market'],
  // Beyond the market, where the plan begins again: the Green Code quarter, both sides.
  ['code', 'code'],
];
export const BAND_ROWS = 8;

/** A block's place in the tile: column -6..5 (the avenue between -1 and 0), row 0..47. */
export const tileCol = (I: number) => wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
export const tileRow = (J: number) => wrap(J, TILE_J);

export function districtOf(I: number, J: number): DistrictId {
  const band = BANDS[Math.floor(tileRow(J) / BAND_ROWS)] as [DistrictId, DistrictId];
  return tileCol(I) < 0 ? band[0] : band[1];
}
/** The district at a point. */
export const districtAt = (x: number, z: number) =>
  districtOf(Math.floor(x / BLOCK_X), Math.floor(z / BLOCK_Z));

/** The landmarks, tile-local: each on the crossing at the middle of its district's side. */
export type Landmark = {
  d: DistrictId;
  kind:
    | 'pagoda'
    | 'race'
    | 'shikhara'
    | 'mosque'
    | 'spire'
    | 'studio'
    | 'pyramid'
    | 'nova'
    | 'dataspire';
  x: number;
  z: number;
  /** For a Studio building: its set and which. */
  set?: 'temples' | 'factories' | 'domes';
  i?: number;
};
const LM = (band: number, side: -1 | 1) => ({
  x: side * 3 * BLOCK_X,
  z: (band * BAND_ROWS + BAND_ROWS / 2) * BLOCK_Z,
});
export const LANDMARKS: Landmark[] = [
  { d: 'chinatown', kind: 'pagoda', ...LM(0, -1) },
  { d: 'chinatown', kind: 'race', ...LM(0, 1) },
  { d: 'indian', kind: 'shikhara', ...LM(1, -1) },
  { d: 'oriental', kind: 'mosque', ...LM(1, 1) },
  { d: 'heights', kind: 'nova', ...LM(2, -1) },
  { d: 'golden', kind: 'spire', ...LM(3, -1) },
  { d: 'temples', kind: 'studio', set: 'temples', i: 1, ...LM(3, 1) },
  { d: 'industrial', kind: 'studio', set: 'factories', i: 1, ...LM(4, -1) },
  { d: 'domes', kind: 'studio', set: 'domes', i: 4, ...LM(4, 1) },
  { d: 'egypt', kind: 'pyramid', ...LM(5, -1) },
  { d: 'code', kind: 'dataspire', ...LM(6, -1) },
];
/** The golden spire: the one landmark seen from everywhere. */
export const SPIRE = LANDMARKS.find((l) => l.kind === 'spire') as Landmark;
export const SPIRE_H = 190;

/** Whether block (I, J) is part of a landmark's open plaza: the four blocks round its crossing. */
function plazaOf(I: number, J: number): Landmark | null {
  const li = tileCol(I);
  const lj = tileRow(J);
  for (const l of LANDMARKS) {
    const ci = Math.round(l.x / BLOCK_X);
    const cj = Math.round(l.z / BLOCK_Z);
    if ((li === ci - 1 || li === ci) && (lj === cj - 1 || lj === cj)) return l;
  }
  return null;
}

/* ---------- the blocks ---------- */

export type Shape =
  | 'box'
  | 'pyramid'
  | 'park'
  | 'plaza'
  | 'studio'
  | 'business'
  | 'embassy'
  | 'design'
  | 'code';
/**
 * A lit tunnel through a tower, along x (0) or z (2), at height y, half as wide and high as hw, hh.
 * `through`: part of the one tunnel bored through a whole row of towers (lib/city-under.ts THROUGH).
 */
export type Bore = { axis: 0 | 2; y: number; hw: number; hh: number; through?: boolean };
export type Block = Tower & {
  I: number;
  J: number;
  d: DistrictId;
  shape: Shape;
  bore: Bore | null;
  /** On a block that holds one of the Studio's buildings: which, and how large. */
  studio: { set: 'temples' | 'factories' | 'domes'; i: number } | null;
  /** On a block that holds one of the Studio's twenty buildings (lib/city-designs.ts): which, how large. */
  design: Design | null;
  /** A plain building that wears readable windows (lib/city-roofs.ts): their style. */
  facade: Facade | null;
};

const blockCache = new Map<number, Block>();
/**
 * The building on block (I, J), from the plan: its district, shape and size, a tunnel through it
 * now and then. Towers leave a street of at least seven all round (ten in Chinatown and on the
 * canals), on the avenue their inner wall on its edge; under the metro they stand lower.
 */
export function blockTower(I: number, J: number): Block {
  const key = I * 65536 + J;
  const had = blockCache.get(key);
  if (had) return had;
  const k = 300 + wrap(I * 37 + J * 101, 9973);
  const d = districtOf(I, J);
  const ave = I === 0 || I === -1;
  const cx = (I + 0.5) * BLOCK_X;
  const cz = (J + 0.5) * BLOCK_Z;
  let hx = 7 + 2.5 * hash(k, 421);
  let hz = 10.5 + 3.5 * hash(k, 422);
  let jx = hash(k, 423) - 0.5;
  let jz = hash(k, 424) - 0.5;
  const hh = hash(k, 425);
  let h = 24 + 44 * hh ** 1.3;
  let shape: Shape = 'box';
  let studio: Block['studio'] = null;
  const pick = hash(k, 430);
  switch (d) {
    case 'chinatown':
      hx = Math.min(hx, ave ? 6 : 8);
      hz = Math.min(hz, 12);
      jx = 0;
      jz = 0;
      h = 22 + 16 * hh;
      break;
    case 'canals':
      hz = Math.min(hz, 11);
      jz = 0;
      h = 18 + 30 * hh;
      break;
    case 'heights':
      h = 70 + 58 * hh ** 0.8;
      // The business district (lib/city-business.ts): each tower its own design, taller toward
      // the Nova Core on the plaza.
      if (!ave) {
        const b = businessSize(I, J, k);
        shape = 'business';
        [hx, hz, h, jx, jz] = [b.hx, b.hz, b.h, 0, 0];
      }
      break;
    case 'indian':
      h = 14 + 16 * hh;
      break;
    case 'oriental':
      h = 12 + 18 * hh;
      break;
    case 'golden':
      h = 20 + 34 * hh;
      if (!ave && pick < 0.3) shape = 'park';
      break;
    case 'temples':
      h = 14 + 14 * hh;
      if (!ave && pick < 0.4) shape = 'studio';
      studio = { set: 'temples', i: Math.floor(hash(k, 431) * 5) };
      break;
    case 'industrial':
      h = 14 + 20 * hh;
      if (!ave && pick < 0.45) shape = 'studio';
      studio = { set: 'factories', i: Math.floor(hash(k, 431) * 5) };
      break;
    case 'domes':
      h = 12 + 16 * hh;
      if (!ave && pick < 0.45) shape = 'studio';
      else if (!ave && pick < 0.7) shape = 'park';
      studio = { set: 'domes', i: Math.floor(hash(k, 431) * 5) };
      break;
    case 'egypt':
      if (ave) h = 8 + 6 * hh;
      else {
        shape = 'pyramid';
        hx = hz = 8 + 2 * hash(k, 432);
        jx = jz = 0;
        h = hx * Math.sqrt((1 + Math.sqrt(5)) / 2);
      }
      break;
    case 'code': {
      // The Green Code quarter (lib/city-code.ts): slim dark towers, code falling down their faces.
      shape = 'code';
      const c = codeSize(k, ave);
      [hx, hz, h] = [c.hx, c.hz, c.h];
      jx *= 0.5;
      break;
    }
    default:
      if (!ave && hash(k, 426) < 0.12) h = 9 + 6 * hh;
  }
  if (shape !== 'studio') studio = null;
  if (shape === 'box' && !ave && hash(k, 433) < 0.04) shape = 'park';
  // One of the Studio's twenty buildings (lib/city-designs.ts), in the quarter it belongs to
  // (2026-11-13: "use the 20 buildings in the main city, in the quarters they belong to").
  let design: Design | null = null;
  if (!ave && (shape === 'box' || shape === 'business' || shape === 'pyramid')) {
    design = designFor(d, k, railCeiling(I, J));
    if (design) shape = 'design';
  }
  // Beside the river (lib/city-rain.ts) only plain towers, standing back from its banks.
  if (besideRiver(J) && shape !== 'box' && shape !== 'business') {
    shape = 'box';
    studio = null;
    design = null;
    if (h <= 0) h = 14 + 10 * hh;
  }
  const plaza = plazaOf(I, J);
  // The big squares and the new buildings' blocks are kept open too (lib/city-big.ts).
  if (plaza || openBlock(I, J)) shape = 'plaza';
  // An Embassy of Happiness (lib/city-embassy.ts): its own building, in the middle of its block.
  const emb = embassyAt(I, J);
  if (emb) {
    shape = 'embassy';
    studio = null;
    [hx, hz, h, jx, jz] = [emb.hx, emb.hz, emb.h, 0, 0];
  }
  if (shape !== 'design') design = null;
  if (design) [hx, hz, h, jx, jz] = [design.r, design.r, design.h, 0, 0];
  // The row of towers the through tunnel bores (2026-11-13: "a tunnel that bores a hole straight
  // through several buildings in a row"): plain, on its line, tall enough to hold it.
  const thru =
    !ave &&
    tileCol(I) === Math.floor(THROUGH.x / BLOCK_X) &&
    tileRow(J) >= THROUGH.J0 &&
    tileRow(J) <= THROUGH.J1 &&
    shape !== 'plaza' &&
    shape !== 'embassy';
  if (thru) {
    shape = 'box';
    studio = null;
    jx = 0;
    hx = Math.max(hx, 7.5);
    h = Math.max(h, THROUGH.y + THROUGH.hh + 8 - GROUND + 10 * hh);
  }
  let x = cx + jx * Math.max(0, BLOCK_X - 2 * hx - 7);
  if (ave && (shape === 'box' || shape === 'code')) {
    hx = Math.min(hx, 7);
    x = (I === 0 ? 1 : -1) * (AVENUE + hx);
  }
  let z = cz + jz * Math.max(0, BLOCK_Z - 2 * hz - 7);
  if (besideRiver(J)) ({ z, hz } = riverClear(J, z, hz));
  if (shape === 'park' || shape === 'plaza' || shape === 'studio') {
    h = 0;
    hx = BLOCK_X / 2 - 4;
    hz = BLOCK_Z / 2 - 4;
  }
  // Under the metro, lower, so the rail and its hanging carriages clear every roof.
  if (shape === 'box' || shape === 'business' || shape === 'code')
    h = Math.max(8, Math.min(h, railCeiling(I, J)));
  let bore: Bore | null = null;
  if (thru) bore = { axis: 2, y: THROUGH.y, hw: THROUGH.hw, hh: THROUGH.hh, through: true };
  // More tunnels through towers than there were (2026-11-13: "more tunnels inside buildings").
  else if (shape === 'box' && h >= 20 && hash(k, 440) < (d === 'heights' ? 0.4 : 0.2)) {
    const hhB = 2.8;
    bore = {
      axis: hash(k, 441) < 0.5 ? 0 : 2,
      y: GROUND + 5 + (h - 11) * hash(k, 442),
      hw: 3.4,
      hh: hhB,
    };
  }
  const style = FACADES[d];
  const facade: Facade | null =
    style && shape === 'box' && !thru && h >= 14 && hash(k, 480) < FACADE_SHARE ? style : null;
  const tw: Block = { x, z, hx, hz, h, k, I, J, d, shape, bore, studio, design, facade };
  if (blockCache.size > 20000) blockCache.clear();
  blockCache.set(key, tw);
  return tw;
}

/** How close to a wall the ship can come. */
export const MARGIN = 1.2;

/** Whether a point is inside a tower's tunnel, with room to spare. */
export function inBore(tw: Block, q: Vec3, room = MARGIN): boolean {
  const b = tw.bore;
  if (!b) return false;
  const lat = b.axis === 0 ? q[2] - tw.z : q[0] - tw.x;
  return Math.abs(lat) < b.hw - room && Math.abs(q[1] - b.y) < b.hh - room;
}

/* ---------- canals: the undercity ---------- */

/** The canals: under the cross streets of the Canals district, this deep and half this wide. */
export const CANAL_DEPTH = 14;
export const CANAL_W = 4.5;
const CANAL_ROWS = [18, 20, 22];
/** Whether (x, z) is over a canal, `room` in from its walls. */
export function inCanal(x: number, z: number, room = 0): boolean {
  const J = Math.round(z / BLOCK_Z);
  if (!CANAL_ROWS.includes(tileRow(J))) return false;
  if (Math.abs(z - J * BLOCK_Z) > CANAL_W - room) return false;
  const lx = x - nearest(0, x, TILE_X);
  return lx > AVENUE + 1 && lx < (TILE_I / 2) * BLOCK_X - 2;
}
/** The lowest the ship can go at (x, z): the street, or down in a canal. */
export const floorAt = (x: number, z: number) =>
  inCanal(x, z, MARGIN)
    ? GROUND - CANAL_DEPTH
    : (underAt(x, z, MARGIN)?.floor ?? (inRiver(x, z, MARGIN) ? RIVER_Y : GROUND));
/** The water's surface at (x, z): the river's or a canal's; null on dry ground. */
export const waterAt = (x: number, z: number): number | null =>
  inRiver(x, z) ? RIVER_Y : inCanal(x, z) ? GROUND - CANAL_DEPTH + 0.6 : null;

/** Whether a point is inside a building or under the floor, walls and MARGIN included. */
export function blocked(q: Vec3): boolean {
  // The Deep Line (lib/city-under.ts): its rock, or free inside it under the street.
  if (!inCanal(q[0], q[2])) {
    const u = underBlocked(q, MARGIN);
    if (u !== null) return u;
  }
  if (q[1] < floorAt(q[0], q[2]) + 2 - 1e-6) return true;
  const tw = blockTower(Math.floor(q[0] / BLOCK_X), Math.floor(q[2] / BLOCK_Z));
  const dx = Math.abs(q[0] - tw.x);
  const dz = Math.abs(q[2] - tw.z);
  if (tw.shape === 'design' && tw.design) return designHolds(tw.design, tw.x, tw.z, q, MARGIN);
  if (tw.shape === 'pyramid') {
    const ex = tw.hx + MARGIN;
    const ez = tw.hz + MARGIN;
    if (dx >= ex || dz >= ez) return false;
    return q[1] < GROUND + MARGIN + tw.h * (1 - Math.max(dx / ex, dz / ez));
  }
  if (
    tw.shape !== 'box' &&
    tw.shape !== 'business' &&
    tw.shape !== 'embassy' &&
    tw.shape !== 'code'
  )
    return false;
  return (
    q[1] <= GROUND + tw.h + MARGIN && dx < tw.hx + MARGIN && dz < tw.hz + MARGIN && !inBore(tw, q)
  );
}

/** A tower's walls in its district's colour (Chinatown keeps its own red and gold). */
export function wallTint(tw: Tower): RGB | null {
  const d = (tw as Block).d;
  if (!d || d === 'chinatown' || d === 'market' || d === 'heights') return null;
  return DISTRICTS[d].colour;
}
/** Whether a point on a wall falls in a tunnel's mouth (so no window is drawn there). */
export function inMouth(tw: Tower, x: number, y: number, z: number): boolean {
  const b = (tw as Block).bore;
  if (!b) return false;
  const lat = b.axis === 0 ? z - tw.z : x - tw.x;
  return Math.abs(lat) < b.hw + 0.3 && Math.abs(y - b.y) < b.hh + 0.3;
}

/* ---------- shapes: a few primitives, built once ---------- */

type Part = { n: number; f: (u: number, s: number, t: number) => Vec3; rgb: RGB; tw?: number };
type Model = { parts: Part[]; cum: number[]; count: number };
const model = (parts: Part[]): Model => {
  const cum: number[] = [];
  let n = 0;
  for (const p of parts) {
    n += p.n;
    cum.push(n);
  }
  return { parts, cum, count: n };
};
const seg = (a: Vec3, b: Vec3, n: number, rgb: RGB, tw = 0): Part => ({
  n: Math.max(1, Math.round(n)),
  f: (u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
  rgb,
  tw,
});
/** A horizontal circle, or one standing across x ('x') or z ('z'). */
const ring = (
  c: Vec3,
  r: number,
  n: number,
  rgb: RGB,
  plane: 'y' | 'x' | 'z' = 'y',
  tw = 0,
): Part => ({
  n: Math.max(3, Math.round(n)),
  f: (u) => {
    const a = u * TAU;
    const p = Math.cos(a) * r;
    const q = Math.sin(a) * r;
    if (plane === 'y') return [c[0] + p, c[1], c[2] + q];
    if (plane === 'z') return [c[0] + p, c[1] + q, c[2]];
    return [c[0], c[1] + q, c[2] + p];
  },
  rgb,
  tw,
});
/** A dome: points over the upper half of a sphere, squashed by `sq`. */
const cap = (c: Vec3, r: number, n: number, rgb: RGB, sq = 1, tw = 0): Part => {
  const m = Math.max(4, Math.round(n));
  return {
    n: m,
    f: (u) => {
      const d = fibonacciSphere(Math.floor(u * m), 2 * m);
      return [c[0] + d[0] * r, c[1] + d[1] * r * sq, c[2] + d[2] * r];
    },
    rgb,
    tw,
  };
};
/** A rectangle round (0, y, 0), its corners lifted by `lift` (a Chinese roof's upturned eaves). */
const eave = (hx: number, hz: number, y: number, lift: number, n: number, rgb: RGB): Part => ({
  n: Math.max(4, Math.round(n)),
  f: (u) => {
    const [x, z] = aroundRect(u * 4 * (hx + hz), hx, hz);
    const corner =
      Math.max(Math.abs(x) / hx, Math.abs(z) / hz) * Math.min(Math.abs(x) / hx, Math.abs(z) / hz);
    return [x, y + lift * corner ** 4, z];
  },
  rgb,
});
/** A surface turned round the vertical: `ribs` lines up it and `rings` round it, radius r(v) at height y(v). */
const turned = (
  prof: (v: number) => [number, number],
  ribs: number,
  rings: number,
  n: number,
  rgb: RGB,
  ringRgb: RGB,
): Part[] => [
  {
    n: Math.round(n * 0.55),
    f: (u) => {
      const rib = Math.floor(u * ribs);
      const v = frac(u * ribs);
      const [r, y] = prof(v);
      const a = (rib / ribs) * TAU;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    },
    rgb,
  },
  {
    n: Math.round(n * 0.45),
    f: (u) => {
      const k = Math.floor(u * rings);
      const a = frac(u * rings) * TAU;
      const [r, y] = prof((k + 0.5) / rings);
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    },
    rgb: ringRgb,
  },
];
/** Four edges up a box, its rim at the top. */
const boxEdges = (hx: number, hz: number, y0: number, y1: number, n: number, rgb: RGB): Part[] => [
  ...[
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) =>
    seg(
      [(a as number) * hx, y0, (b as number) * hz],
      [(a as number) * hx, y1, (b as number) * hz],
      n / 6,
      rgb,
    ),
  ),
  eave(hx, hz, y1, 0, n / 3, rgb),
];

/* The buildings of the districts, each from those few shapes. */

const PHI = (1 + Math.sqrt(5)) / 2;
const models = new Map<string, Model>();
const cached = (key: string, make: () => Model) => {
  const had = models.get(key);
  if (had) return had;
  const m = make();
  models.set(key, m);
  return m;
};

/** Chinatown's roofs: eaves turned up at the corners at two floors, and a three-roofed pagoda on top. */
function pagodaTop(hx: number, hz: number, h: number): Model {
  const parts: Part[] = [];
  for (const f of [0.36, 0.68])
    parts.push(eave(hx + 0.7, hz + 0.7, h * f, 0.7, (hx + hz) * 3, C.gold));
  for (let k = 0; k < 3; k++) {
    const w = 1.1 - 0.27 * k;
    const y = h + 2.6 * k;
    parts.push(eave(hx * w, hz * w, y, 1.1, (hx + hz) * w * 4, C.gold));
    parts.push(
      ...boxEdges(hx * w * 0.72, hz * w * 0.72, y, y + 1.6, (hx + hz) * w * 2, scale(C.red, 0.8)),
    );
  }
  parts.push(seg([0, h + 7.4, 0], [0, h + 10.5, 0], 10, C.gold));
  return model(parts);
}
/** The pagoda of nine roofs, Chinatown's landmark. */
const grandPagoda = () =>
  cached('pagoda', () => {
    const parts: Part[] = [];
    let w = 11;
    for (let k = 0; k < 9; k++) {
      const y = k * 6.2;
      parts.push(...boxEdges(w * 0.78, w * 0.78, y, y + 4.6, w * 7, scale(C.red, 0.9)));
      parts.push(eave(w, w, y + 4.6, 1.6, w * 14, C.gold));
      parts.push(ring([0, y + 2.4, 0], w * 0.79, w * 5, C.warm, 'y', 0.4));
      w *= 0.89;
    }
    parts.push(seg([0, 56, 0], [0, 64, 0], 24, C.gold));
    for (const y of [58, 60, 62]) parts.push(ring([0, y, 0], 0.8, 10, C.gold));
    return model(parts);
  });
/** The Indian temple's curved spire (shikhara): ribs and rings up its curve, a flat stone ring and finial on top. */
function shikhara(R: number, H: number, n: number): Part[] {
  const prof = (v: number): [number, number] => [
    R * (1 - 0.82 * v ** 1.5) * (1 + 0.1 * Math.sin(Math.PI * v)),
    H * v,
  ];
  return [
    ...turned(prof, 16, 14, n, scale(C.sand, 0.9), C.marigold),
    ring([0, H + 0.4, 0], R * 0.28, n * 0.06, C.gold),
    ring([0, H + 0.9, 0], R * 0.2, n * 0.04, C.gold),
    seg([0, H + 1, 0], [0, H + 3, 0], n * 0.03, C.gold),
  ];
}
/** A chhatri: four pillars under a small dome. */
const chhatri = (r: number): Part[] => [
  ...[
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) =>
    seg(
      [(a as number) * r, 0, (b as number) * r],
      [(a as number) * r, 1.8 * r, (b as number) * r],
      5,
      C.sand,
    ),
  ),
  cap([0, 1.8 * r, 0], r * 1.15, 26, C.marigold),
];
const templeLandmark = () =>
  cached('shikhara', () => {
    const parts: Part[] = [];
    for (let k = 0; k < 4; k++)
      parts.push(eave(17 - 2.2 * k, 17 - 2.2 * k, k * 1.4, 0, 60, scale(C.sand, 0.7)));
    parts.push(...shikhara(9, 46, 900).map((p) => shiftPart(p, [0, 5.6, 0])));
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      parts.push(
        ...shikhara(3.6, 16, 200).map((p) =>
          shiftPart(p, [(a as number) * 11, 5.6, (b as number) * 11]),
        ),
      );
    parts.push(...chhatri(3).map((p) => shiftPart(p, [0, 5.6, 15])));
    return model(parts);
  });
/** Istanbul's mosque: a square hall, the great dome on its drum, four half domes, four slender minarets. */
const mosque = () =>
  cached('mosque', () => {
    const parts: Part[] = [...boxEdges(15, 15, 0, 12, 160, scale(C.ivory, 0.6))];
    parts.push(ring([0, 13, 0], 12, 70, C.gold));
    parts.push(cap([0, 13.5, 0], 12, 360, C.ivory, 0.92, 0.2));
    for (let m = 0; m < 16; m++) {
      const a = (m / 16) * TAU;
      parts.push({
        n: 14,
        f: (u) => [
          Math.cos(a) * 12 * Math.cos((u * Math.PI) / 2),
          13.5 + 11 * Math.sin((u * Math.PI) / 2),
          Math.sin(a) * 12 * Math.cos((u * Math.PI) / 2),
        ],
        rgb: C.turquoise,
      });
    }
    for (const [a, b] of [
      [12, 0],
      [-12, 0],
      [0, 12],
      [0, -12],
    ])
      parts.push(cap([a as number, 11, b as number], 6.5, 90, scale(C.turquoise, 0.8), 0.8));
    for (const [a, b] of [
      [-20, -20],
      [20, -20],
      [20, 20],
      [-20, 20],
    ]) {
      const x = a as number;
      const z = b as number;
      for (const [ox, oz] of [
        [0.8, 0],
        [-0.8, 0],
        [0, 0.8],
        [0, -0.8],
      ])
        parts.push(
          seg(
            [x + (ox as number), 0, z + (oz as number)],
            [x + (ox as number), 44, z + (oz as number)],
            30,
            C.ivory,
          ),
        );
      parts.push(ring([x, 27, z], 1.6, 14, C.gold), ring([x, 37, z], 1.4, 12, C.gold));
      for (const [ox, oz] of [
        [0.8, 0],
        [-0.8, 0],
        [0, 0.8],
        [0, -0.8],
      ])
        parts.push(seg([x + (ox as number), 44, z + (oz as number)], [x, 50, z], 6, C.turquoise));
      parts.push(seg([x, 50, z], [x, 51.5, z], 3, C.gold, 0.3));
    }
    return model(parts);
  });
/** A small dome and one minaret, for Istanbul's towers. */
function domeTop(hx: number, hz: number, h: number, minaret: boolean, rgb: RGB): Model {
  const r = Math.min(hx, hz) * 0.75;
  const parts: Part[] = [
    ring([0, h + 0.2, 0], r, r * 6, C.gold),
    cap([0, h + 0.3, 0], r, r * 16, rgb, 0.9, 0.2),
  ];
  if (minaret) {
    const x = hx - 1;
    const z = hz - 1;
    parts.push(seg([x, h, z], [x, h + 16, z], 16, C.ivory), ring([x, h + 11, z], 1.1, 8, C.gold));
    parts.push(seg([x, h + 16, z], [x, h + 18.5, z], 4, C.turquoise));
  }
  return model(parts);
}
/** A pyramid: four edges to the apex, its courses, its faces faintly lit, a light on top. */
function pyramid(hb: number, h: number): Model {
  const corners: Vec3[] = [
    [-hb, 0, -hb],
    [hb, 0, -hb],
    [hb, 0, hb],
    [-hb, 0, hb],
  ];
  const apex: Vec3 = [0, h, 0];
  const parts: Part[] = corners.map((c) => seg(c, apex, h * 2.4, C.sand));
  parts.push(eave(hb, hb, 0.05, 0, hb * 6, scale(C.sand, 0.7)));
  for (let k = 1; k < 9; k++)
    parts.push(
      eave(
        hb * (1 - k / 9),
        hb * (1 - k / 9),
        (h * k) / 9,
        0,
        hb * 4 * (1 - k / 9) + 4,
        scale(C.sand, 0.32),
      ),
    );
  parts.push({
    n: Math.round(hb * hb * 1.2),
    f: (_u, s) => {
      const face = s % 4;
      let a = hash(s, 71);
      let b = hash(s, 72);
      if (a + b > 1) [a, b] = [1 - a, 1 - b];
      const p = corners[face] as Vec3;
      const q = corners[(face + 1) % 4] as Vec3;
      return [
        p[0] + (q[0] - p[0]) * a + (apex[0] - p[0]) * b,
        p[1] + (apex[1] - p[1]) * b,
        p[2] + (q[2] - p[2]) * a + (apex[2] - p[2]) * b,
      ];
    },
    rgb: scale(C.sand, 0.16),
  });
  parts.push(ring([0, h + 0.4, 0], 0.5, 10, C.gold, 'y', 0.25));
  return model(parts);
}
/** An obelisk, tapering to a small pyramid. */
const obelisk = (h: number): Part[] => [
  ...[
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) =>
    seg(
      [(a as number) * 0.9, 0, (b as number) * 0.9],
      [(a as number) * 0.6, h, (b as number) * 0.6],
      h * 1.2,
      C.sand,
    ),
  ),
  ...[
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => seg([(a as number) * 0.6, h, (b as number) * 0.6], [0, h + 1.3, 0], 4, C.gold)),
];
/** A sphinx-like figure lying on the plaza: a long body, raised head and headdress, paws forward. Our own simple shape. */
const sphinx = (): Part[] => {
  const body = boxEdges(2.3, 6, 0, 4, 70, scale(C.sand, 0.85));
  const head = boxEdges(1.6, 1.4, 4, 8, 40, C.sand).map((p) => shiftPart(p, [0, 0, 6.5]));
  return [
    ...body,
    ...head,
    seg([-1.6, 8, 6.5], [-2.6, 4.5, 5], 8, C.gold),
    seg([1.6, 8, 6.5], [2.6, 4.5, 5], 8, C.gold),
    seg([-1.4, 0.6, 6], [-1.4, 0.6, 11], 10, C.sand),
    seg([1.4, 0.6, 6], [1.4, 0.6, 11], 10, C.sand),
  ];
};
const egyptLandmark = () =>
  cached('egypt', () => {
    const p = pyramid(22, 22 * Math.sqrt(PHI));
    return model([
      ...p.parts,
      ...sphinx().map((q) => shiftPart(q, [0, 0, 26])),
      ...obelisk(16).map((q) => shiftPart(q, [-14, 0, 30])),
      ...obelisk(16).map((q) => shiftPart(q, [14, 0, 30])),
    ]);
  });
/** A golden tree: trunk, branches and a shimmering crown of gold leaves. */
function goldenTree(h: number, n: number): Part[] {
  const crown: Vec3 = [0, h * 0.72, 0];
  const parts: Part[] = [seg([0, 0, 0], [0, h * 0.6, 0], n * 0.12, scale(C.amber, 0.8))];
  for (let b = 0; b < 4; b++) {
    const a = b * 2.39996;
    parts.push(
      seg(
        [0, h * 0.45, 0],
        [Math.cos(a) * h * 0.25, h * 0.75, Math.sin(a) * h * 0.25],
        n * 0.05,
        scale(C.amber, 0.7),
      ),
    );
  }
  const m = Math.round(n * 0.68);
  parts.push({
    n: m,
    f: (u) => {
      const d = fibonacciSphere(Math.floor(u * m), m);
      return [crown[0] + d[0] * h * 0.34, crown[1] + d[1] * h * 0.24, crown[2] + d[2] * h * 0.34];
    },
    rgb: C.gold,
    tw: 0.35,
  });
  return parts;
}
/** A park: golden trees set round by the golden angle, a ring path. */
function park(hx: number, hz: number, key: number): Model {
  const parts: Part[] = [eave(hx * 0.8, hz * 0.8, 0.05, 0, (hx + hz) * 2, scale(C.amber, 0.25))];
  for (let k = 0; k < 5; k++) {
    const r = Math.sqrt((k + 0.5) / 5) * Math.min(hx, hz) * 0.8;
    const a = k * 2.39996 + key;
    const h = 6 + 4 * hash(key, k);
    parts.push(
      ...goldenTree(h, 70).map((p) => shiftPart(p, [Math.cos(a) * r, 0, Math.sin(a) * r])),
    );
  }
  return model(parts);
}
/** The golden spire: four edges tapering high over the city, rings of light, an open sphere of light on top. */
const spire = () =>
  cached('spire', () => {
    const parts: Part[] = [];
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      parts.push(
        seg(
          [(a as number) * 5, 0, (b as number) * 5],
          [(a as number) * 0.8, SPIRE_H, (b as number) * 0.8],
          160,
          C.gold,
        ),
      );
    for (let y = 10; y < SPIRE_H; y += 12) {
      const w = lerp(5, 0.8, y / SPIRE_H);
      parts.push(eave(w, w, y, 0, 16, C.gold));
    }
    const top: Vec3 = [0, SPIRE_H + 9, 0];
    for (let m = 0; m < 12; m++) {
      const a = (m / 12) * TAU;
      parts.push({
        n: 18,
        f: (u) => {
          const v = (u - 0.5) * Math.PI;
          return [
            top[0] + Math.cos(a) * Math.cos(v) * 9,
            top[1] + Math.sin(v) * 9,
            top[2] + Math.sin(a) * Math.cos(v) * 9,
          ];
        },
        rgb: C.gold,
        tw: 0.2,
      });
    }
    for (const y of [-4.5, 0, 4.5])
      parts.push(ring([0, top[1] + y, 0], 9 * Math.cos(Math.asin(y / 9)), 30, C.warm));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      parts.push(
        ...goldenTree(9, 60).map((p) => shiftPart(p, [Math.cos(a) * 22, 0, Math.sin(a) * 22])),
      );
    }
    return model(parts);
  });
/** The race plaza: a ring of moon gates round the start. */
const racePlaza = () =>
  cached('race', () => {
    const parts: Part[] = [
      ring([0, 0.1, 0], 20, 120, scale(C.red, 0.5)),
      ring([0, 0.1, 0], 14, 80, scale(C.gold, 0.4)),
    ];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.3;
      parts.push(ring([Math.cos(a) * 20, 5, Math.sin(a) * 20], 4.5, 40, C.red, k % 2 ? 'x' : 'z'));
    }
    return model(parts);
  });
function shiftPart(p: Part, d: Vec3): Part {
  return {
    ...p,
    f: (u, s, t) => {
      const q = p.f(u, s, t);
      return [q[0] + d[0], q[1] + d[1], q[2] + d[2]];
    },
  };
}

/** The ornaments on a block's building, in place: Chinese roofs, temple spires, domes, pyramids, parks. */
function ornamentOf(tw: Block): Model | null {
  const key = `${tw.I},${tw.J}`;
  switch (tw.shape) {
    case 'park':
      return cached(`park ${key}`, () => park(tw.hx, tw.hz, tw.k));
    case 'pyramid':
      return cached(`pyr ${Math.round(tw.hx * 10)}`, () => pyramid(tw.hx, tw.h));
    case 'box':
      break;
    default:
      return null;
  }
  switch (tw.d) {
    case 'chinatown':
      return cached(`ct ${key}`, () => pagodaTop(tw.hx, tw.hz, tw.h));
    case 'indian':
      return cached(`in ${key}`, () => {
        const r = Math.min(tw.hx, tw.hz);
        if (hash(tw.k, 450) < 0.5)
          return model(shikhara(r * 0.7, r * 1.9, 260).map((p) => shiftPart(p, [0, tw.h, 0])));
        return model(
          [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].flatMap(([a, b]) =>
            chhatri(1.4).map((p) =>
              shiftPart(p, [(a as number) * (tw.hx - 2), tw.h, (b as number) * (tw.hz - 2)]),
            ),
          ),
        );
      });
    case 'oriental':
      return cached(`or ${key}`, () =>
        domeTop(tw.hx, tw.hz, tw.h, hash(tw.k, 451) < 0.6, C.turquoise),
      );
    case 'golden':
      return hash(tw.k, 452) < 0.5
        ? cached(`go ${key}`, () => domeTop(tw.hx, tw.hz, tw.h, false, C.gold))
        : null;
    case 'egypt':
      return cached(`ob ${key}`, () => model(obelisk(10).map((p) => shiftPart(p, [0, tw.h, 0]))));
    default:
      return null;
  }
}

/** Draws site s of model M placed at (x, y, z), its colour drifting slowly; brightness k. */
function modelSite(
  M: Model,
  s: number,
  t: number,
  x: number,
  y: number,
  z: number,
  sc: number,
  k: number,
  o: number[],
) {
  let i = 0;
  while ((M.cum[i] as number) <= s) i++;
  const part = M.parts[i] as Part;
  const start = (M.cum[i] as number) - part.n;
  const p = part.f((s - start + 0.5) / part.n, s, t);
  o[0] = x + p[0] * sc;
  o[1] = y + p[1] * sc;
  o[2] = z + p[2] * sc;
  const tw = part.tw ? 1 - part.tw * (0.5 + 0.5 * Math.sin(t * 0.8 + s * 1.7)) : 1;
  const drift = 0.88 + 0.12 * Math.sin(t * 0.21 + s * 0.013);
  const b = 0.42 * k * tw * drift;
  o[3] = part.rgb[0] * b;
  o[4] = part.rgb[1] * b;
  o[5] = part.rgb[2] * b;
  return true;
}

/* ---------- lanterns, Diwali lamps, sky lanterns ---------- */

type Strand = { a: Vec3; b: Vec3; kind: 'red' | 'diwali'; key: number };
/** Strings hung across the streets of Chinatown (red lanterns) and the Indian quarter (Diwali lamps), at three heights. */
function strandsNear(eye: Vec3, R: number, out: Strand[]) {
  const I0 = Math.floor((eye[0] - R) / BLOCK_X);
  const I1 = Math.floor((eye[0] + R) / BLOCK_X);
  const J0 = Math.floor((eye[2] - R) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + R) / BLOCK_Z);
  for (let I = I0; I <= I1; I++) {
    for (let J = J0; J <= J1; J++) {
      const d = districtOf(I, J);
      if (d !== 'chinatown' && d !== 'indian') continue;
      const kind = d === 'chinatown' ? 'red' : 'diwali';
      const A = blockTower(I, J);
      const B = blockTower(I + 1, J);
      if (A.shape !== 'box' || B.shape !== 'box') continue;
      // Across the street to the east, from wall to wall, at the heights both walls reach.
      const x0 = A.x + A.hx;
      const x1 = B.x - B.hx;
      const ave = I === -1;
      const tops = Math.min(A.h, B.h) - 3;
      const levels = ave ? [30, 36] : [9, 17, 26];
      levels.forEach((lv, n) => {
        if (lv > tops) return;
        for (const f of [0.25, 0.7]) {
          const z = lerp(
            Math.max(A.z - A.hz, B.z - B.hz),
            Math.min(A.z + A.hz, B.z + B.hz),
            f + 0.04 * n,
          );
          out.push({
            a: [x0, GROUND + lv, z],
            b: [x1, GROUND + lv, z],
            kind,
            key: mixId(I * 7 + n, J * 13 + Math.round(f * 10)),
          });
        }
      });
      // And across the cross street to the north.
      const N = blockTower(I, J + 1);
      if (N.shape === 'box' && !ave) {
        const z0 = A.z + A.hz;
        const z1 = N.z - N.hz;
        const top2 = Math.min(A.h, N.h) - 3;
        for (const lv of [12, 22]) {
          if (lv > top2) continue;
          const x = lerp(Math.max(A.x - A.hx, N.x - N.hx), Math.min(A.x + A.hx, N.x + N.hx), 0.5);
          out.push({
            a: [x, GROUND + lv, z0],
            b: [x, GROUND + lv, z1],
            kind,
            key: mixId(I * 11 + lv, J * 5),
          });
        }
      }
    }
  }
}
const LANTERN_GAP = 1.7;
const LAMP_GAP = 0.55;
function strandItem(st: Strand, eye: Vec3, t: number): Item {
  const len = Math.hypot(st.b[0] - st.a[0], st.b[2] - st.a[2]);
  const red = st.kind === 'red';
  const nl = red ? Math.max(1, Math.floor(len / LANTERN_GAP)) : 0;
  const lamps = red ? 0 : Math.floor(len / LAMP_GAP) * 2;
  const string = Math.ceil(len / 0.6);
  const sag = 0.5 + len * 0.05;
  const at = (u: number, s2 = 0): Vec3 => [
    lerp(st.a[0], st.b[0], u),
    st.a[1] - (sag + s2) * 4 * u * (1 - u),
    lerp(st.a[2], st.b[2], u),
  ];
  const mid = at(0.5);
  return {
    d: boxDist(
      eye,
      [Math.min(st.a[0], st.b[0]), mid[1] - 2, Math.min(st.a[2], st.b[2])],
      [Math.max(st.a[0], st.b[0]), st.a[1], Math.max(st.a[2], st.b[2])],
    ),
    gid: st.key,
    count: nl * 10 + lamps + string,
    weight: red ? 1.6 : 2.2,
    probe: [st.a, mid, st.b],
    site: (s, o) => {
      if (s < nl * 10) {
        const j = Math.floor(s / 10);
        const q = s % 10;
        const p = at((j + 0.5) / nl);
        const sway = 0.1 * Math.sin(t * 0.6 + j + st.key);
        if (q < 8) {
          const d = fibonacciSphere(q, 8);
          o[0] = p[0] + d[0] * 0.55;
          o[1] = p[1] - 0.9 + d[1] * 0.65;
          o[2] = p[2] + d[2] * 0.55 + sway;
          // On Chinatown's beat, the swell running along the string.
          const g = 0.8 + 0.2 * beat(t, 1, -j * 0.06);
          [o[3], o[4], o[5]] = scale(mix(C.red, C.amber, 0.15), 0.42 * g);
        } else {
          o[0] = p[0];
          o[1] = p[1] - (q === 8 ? 0.2 : 1.8);
          o[2] = p[2] + sway;
          [o[3], o[4], o[5]] = scale(C.gold, 0.4);
        }
        return true;
      }
      if (s < nl * 10 + lamps) {
        const j = s - nl * 10;
        const strand = j & 1;
        const u = ((j >> 1) + 0.5) / (lamps / 2);
        const p = at(u, strand * 0.7);
        [o[0], o[1], o[2]] = p;
        const tone = (j >> 1) % 3 ? C.marigold : C.warm;
        // A slow twinkle, each lamp on its own beat: never a flash.
        const tw = 0.7 + 0.3 * Math.sin(t * (0.8 + hash(j, st.key % 97) * 0.9) + j);
        [o[3], o[4], o[5]] = scale(tone, 0.5 * tw);
        return true;
      }
      const u = (s - nl * 10 - lamps + 0.5) / string;
      [o[0], o[1], o[2]] = at(u);
      [o[3], o[4], o[5]] = scale(C.gold, 0.1);
      return true;
    },
  };
}

/** Sky lanterns: warm lights rising slowly from Chinatown's streets; fly through one and it stays lit. */
export const SKY_LANTERNS = 40;
const litLanterns = new Set<number>();
/** Sky lantern j of Chinatown's stretch n (tile index) at time t: its place, and how far it has faded in. */
export function skyLantern(n: number, j: number, t: number): { c: Vec3; k: number; id: number } {
  const h1 = hash(j, 461);
  const h2 = hash(j, 462);
  const lane = j % 4;
  const x =
    lane === 0 ? (h1 - 0.5) * 12 : (lane % 2 ? 1 : -1) * (lane === 1 ? 26 : 52) + (h1 - 0.5) * 3;
  const z = n * TILE_Z + 10 + h2 * (BAND_ROWS * BLOCK_Z - 20);
  const rise = wrap(t * (0.6 + 0.5 * hash(j, 463)) + hash(j, 464) * 150, 150);
  const id = n * 1000 + j;
  return {
    c: [x + 1.5 * Math.sin(t * 0.1 + j), GROUND + 3 + rise, z],
    k: smooth(rise / 10) * smooth((150 - rise) / 30),
    id,
  };
}
export const lanternLit = (id: number) => litLanterns.has(id);
/** Lights every sky lantern the ship passes through; returns how many it lit. */
export function touchLanterns(c: Vec3, t: number): number {
  if (districtAt(c[0], c[2]) !== 'chinatown') return 0;
  const n = Math.floor(c[2] / TILE_Z);
  let lit = 0;
  for (let j = 0; j < SKY_LANTERNS; j++) {
    const L = skyLantern(n, j, t);
    if (
      L.k > 0.3 &&
      !litLanterns.has(L.id) &&
      Math.hypot(L.c[0] - c[0], L.c[1] - c[1], L.c[2] - c[2]) < 2.6
    ) {
      litLanterns.add(L.id);
      lit++;
    }
  }
  if (litLanterns.size > 2000) litLanterns.clear();
  return lit;
}

/* ---------- tunnels: pulses that run ahead of you ---------- */

/**
 * The pulses in the tunnels: rings lighting up in waves that run on ahead of the ship, always
 * faster than it, pulling it forward (2026-11-12: "pulses in the tunnel like rings light up faster
 * than you"). The waves' front has travelled `front` since the start, the way you fly.
 */
export const pulses = { front: 0, dx: 1 as 1 | -1, dz: -1 as 1 | -1 };
/** How fast the waves run, for a ship flying at `speed`: always well ahead of it. */
export const pulseSpeed = (speed: number) => 1.7 * Math.abs(speed) + 8;
export const PULSE_GAP = 14;
/** Moves the waves on by a frame, for a ship at `speed` heading f: they run the way it flies. */
export function advancePulses(dt: number, speed: number, f: Vec3) {
  if (Math.abs(f[0]) > 0.3) pulses.dx = f[0] > 0 ? 1 : -1;
  if (Math.abs(f[2]) > 0.3) pulses.dz = f[2] > 0 ? 1 : -1;
  pulses.front += pulseSpeed(speed) * dt;
}
/**
 * How bright a ring is at coordinate `s` along a tunnel running along x (axis 0) or z (2): a
 * soft swell up to the wave's front, dark just ahead of it, the waves running on the way you fly.
 */
export function pulseAt(s: number, axis: 0 | 2): number {
  const x = frac((s * (axis === 0 ? pulses.dx : pulses.dz) - pulses.front) / PULSE_GAP);
  return 0.25 + 0.75 * x ** 5;
}

/** The long tube in the Heights, round the avenue: its rings every 2.5, from z0 to z1 (tile-local), at the cruise height. */
export const TUBE = { z0: 17 * BLOCK_Z + 6, z1: 21 * BLOCK_Z - 6, y: GROUND + 21, r: 7 };
function tubeItem(n: number, eye: Vec3): Item {
  const z0 = n * TILE_Z + TUBE.z0;
  const z1 = n * TILE_Z + TUBE.z1;
  const rings = Math.floor((z1 - z0) / 2.5);
  const per = 30;
  const rails = Math.ceil((z1 - z0) / 0.8);
  return {
    d: boxDist(eye, [-TUBE.r, TUBE.y - TUBE.r, z0], [TUBE.r, TUBE.y + TUBE.r, z1]),
    gid: mixId(n, 777),
    count: rings * per + 4 * rails,
    weight: 1.4,
    site: (s, o) => {
      if (s < rings * per) {
        const k = Math.floor(s / per);
        const a = ((s % per) / per) * TAU;
        const z = z0 + (k + 0.5) * 2.5;
        o[0] = Math.cos(a) * TUBE.r;
        o[1] = TUBE.y + Math.sin(a) * TUBE.r;
        o[2] = z;
        const p = pulseAt(z, 2);
        [o[3], o[4], o[5]] = scale(mix(C.violet, C.cyan, p), 0.12 + 0.4 * p);
        return true;
      }
      const j = s - rings * per;
      const r = j % 4;
      const a = (r / 4) * TAU + Math.PI / 4;
      o[0] = Math.cos(a) * TUBE.r;
      o[1] = TUBE.y + Math.sin(a) * TUBE.r;
      o[2] = z0 + ((Math.floor(j / 4) + 0.5) / rails) * (z1 - z0);
      [o[3], o[4], o[5]] = scale(C.cyan, 0.12);
      return true;
    },
  };
}
/** A tower's tunnel: square rings of light every 1.6 through it, a lit floor, pulses running ahead. */
function boreItem(tw: Block, eye: Vec3): Item {
  const b = tw.bore as Bore;
  const len = 2 * (b.axis === 0 ? tw.hx : tw.hz);
  const rings = Math.floor(len / 1.6) + 1;
  const per = 24;
  const at = (along: number, lat: number, y: number): Vec3 =>
    b.axis === 0 ? [tw.x - tw.hx + along, y, tw.z + lat] : [tw.x + lat, y, tw.z - tw.hz + along];
  const mouthA = at(0, 0, b.y);
  const mouthB = at(len, 0, b.y);
  return {
    d: Math.min(
      Math.hypot(mouthA[0] - eye[0], mouthA[1] - eye[1], mouthA[2] - eye[2]),
      Math.hypot(mouthB[0] - eye[0], mouthB[1] - eye[1], mouthB[2] - eye[2]),
    ),
    gid: mixId(tw.k, 991),
    count: rings * per,
    weight: 2.2,
    probe: [mouthA, mouthB],
    site: (s, o) => {
      const k = Math.floor(s / per);
      const e = ((s % per) + 0.5) / per;
      const along = (k / (rings - 1)) * len;
      // Round the square ring: floor, wall, ceiling, wall.
      const [lat, dy] = aroundRect(e * 4 * (b.hw + b.hh), b.hw, b.hh);
      [o[0], o[1], o[2]] = at(along, lat, b.y + dy);
      const p = pulseAt(b.axis === 0 ? (o[0] as number) : (o[2] as number), b.axis);
      const mouth = k === 0 || k === rings - 1;
      [o[3], o[4], o[5]] = mouth
        ? scale(C.warm, 0.5)
        : scale(mix(C.amber, C.cyan, p), 0.1 + 0.42 * p);
      return true;
    },
  };
}

/**
 * A stretch of the through tunnel (lib/city-under.ts THROUGH): rings of light down the whole
 * block, through the tower and on over the street to the next, so the row reads as one tunnel;
 * warm frames at its two ends, the pulses running on ahead of you.
 */
function throughItem(tw: Block, eye: Vec3): Item {
  const b = tw.bore as Bore;
  const z0 = tw.J * BLOCK_Z;
  const len = BLOCK_Z;
  const rings = Math.floor(len / 1.6);
  const per = 28;
  const first = tileRow(tw.J) === THROUGH.J0;
  const last = tileRow(tw.J) === THROUGH.J1;
  return {
    d: boxDist(eye, [tw.x - b.hw, b.y - b.hh, z0], [tw.x + b.hw, b.y + b.hh, z0 + len]),
    gid: mixId(tw.k, 992),
    count: rings * per,
    weight: 2.2,
    probe: [
      [tw.x, b.y, z0],
      [tw.x, b.y, z0 + len / 2],
      [tw.x, b.y, z0 + len],
    ],
    site: (s, o) => {
      const k = Math.floor(s / per);
      const e = ((s % per) + 0.5) / per;
      const z = z0 + (k + 0.5) * (len / rings);
      const [lat, dy] = aroundRect(e * 4 * (b.hw + b.hh), b.hw, b.hh);
      o[0] = tw.x + lat;
      o[1] = b.y + dy;
      o[2] = z;
      const mouth = (first && k === 0) || (last && k === rings - 1);
      const p = pulseAt(z, 2);
      [o[3], o[4], o[5]] = mouth
        ? scale(C.warm, 0.55)
        : scale(mix(C.magenta, C.cyan, p), 0.1 + 0.45 * p);
      return true;
    },
  };
}

/* ---------- portals ---------- */

/** Portals: ring gates over the avenue in the Heights; fly through one and it carries you on to another district. */
export const PORTALS = [
  { z: 16.5 * BLOCK_Z, to: 3 },
  { z: 23.5 * BLOCK_Z, to: 5 },
].map((p) => ({ ...p, y: GROUND + 21, r: 6 }));
/**
 * Whether moving from a to b goes through a portal: if so, how far along z it carries you, to the
 * start of the band it leads to, always ahead the way you fly; else 0.
 */
export function portalJump(a: Vec3, b: Vec3): number {
  for (const p of PORTALS) {
    const z = nearest(p.z, b[2], TILE_Z);
    if ((a[2] - z) * (b[2] - z) > 0 || a[2] === b[2]) continue;
    if (Math.hypot(b[0], b[1] - p.y) > p.r - 0.6) continue;
    const dir = b[2] < a[2] ? -1 : 1;
    const tile = z - p.z;
    let to =
      tile + (dir < 0 ? (p.to + 1) * BAND_ROWS * BLOCK_Z - 12 : p.to * BAND_ROWS * BLOCK_Z + 12);
    if (dir < 0 && to > b[2]) to -= TILE_Z;
    if (dir > 0 && to < b[2]) to += TILE_Z;
    return to - b[2];
  }
  return 0;
}
function portalItem(z: number, eye: Vec3, t: number, key: number): Item {
  const p = PORTALS[0] as (typeof PORTALS)[number];
  return {
    d: boxDist(eye, [-p.r, p.y - p.r, z - 0.5], [p.r, p.y + p.r, z + 0.5]),
    gid: mixId(key, 313),
    count: 420,
    weight: 2.4,
    probe: [
      [0, p.y + p.r, z],
      [-p.r, p.y, z],
      [p.r, p.y, z],
    ],
    site: (s, o) => {
      const u = (s + 0.5) / 420;
      let a: number;
      let r: number;
      if (s < 160) [a, r] = [u * (420 / 160) * TAU, p.r];
      else if (s < 260) [a, r] = [((s - 160) / 100) * TAU, p.r - 0.7];
      else {
        a = ((s - 260) / 160) * TAU * 3 + t * 0.5;
        r = p.r * (0.25 + 0.6 * frac((s - 260) / 53.3 + t * 0.05));
      }
      o[0] = Math.cos(a) * r;
      o[1] = p.y + Math.sin(a) * r;
      o[2] = z;
      const c = mix(C.cyan, C.violet, 0.5 + 0.5 * Math.sin(t * 0.15 + a));
      [o[3], o[4], o[5]] = scale(c, s < 260 ? 0.5 : 0.25);
      return true;
    },
  };
}

/* ---------- canals and sky bridges ---------- */

function canalItem(J: number, xc: number, eye: Vec3, t: number): Item {
  const z = J * BLOCK_Z;
  const x0 = xc + AVENUE + 1;
  const x1 = xc + (TILE_I / 2) * BLOCK_X - 2;
  const len = x1 - x0;
  const walls = Math.ceil(len / 0.9) * 2;
  const pipes = Math.ceil(len / 0.7) * 2;
  const water = Math.ceil(len * 2.2);
  const lamps = Math.floor(len / 8) * 2;
  const arches = Math.floor(len / 3) * 20;
  return {
    d: boxDist(eye, [x0, GROUND - CANAL_DEPTH, z - CANAL_W], [x1, GROUND, z + CANAL_W]),
    gid: mixId(J, Math.round(xc)),
    count: arches + walls + pipes + water + lamps,
    weight: 1.2,
    site: (s, o) => {
      if (s < arches) {
        // Arches of light over the canal every 3, making the undercity a tunnel; the pulses run
        // along them ahead of you.
        const k = Math.floor(s / 20);
        const a = (((s % 20) + 0.5) / 20) * Math.PI;
        o[0] = x0 + (k + 0.5) * 3;
        o[1] = GROUND - CANAL_DEPTH + 1 + Math.sin(a) * (CANAL_DEPTH - 1.5);
        o[2] = z - Math.cos(a) * CANAL_W;
        const p = pulseAt(o[0] as number, 0);
        [o[3], o[4], o[5]] = scale(mix(C.violet, C.cyan, p), 0.08 + 0.4 * p);
        return true;
      }
      s -= arches;
      if (s < walls) {
        const side = s & 1 ? 1 : -1;
        const u = ((s >> 1) + 0.5) / (walls / 2);
        o[0] = x0 + u * len;
        o[1] = GROUND - CANAL_DEPTH * hash(s, 81);
        o[2] = z + side * CANAL_W;
        [o[3], o[4], o[5]] = scale(C.violet, 0.1);
        return true;
      }
      s -= walls;
      if (s < pipes) {
        const side = s & 1 ? 1 : -1;
        o[0] = x0 + (((s >> 1) + 0.5) / (pipes / 2)) * len;
        o[1] = GROUND - 3 - (s % 3 === 0 ? 4 : 0);
        o[2] = z + side * (CANAL_W - 0.3);
        [o[3], o[4], o[5]] = scale(C.steel, 0.16);
        return true;
      }
      s -= pipes;
      if (s < water) {
        o[0] = x0 + hash(s, 82) * len;
        o[2] = z + (hash(s, 83) - 0.5) * 2 * (CANAL_W - 0.3);
        o[1] = GROUND - CANAL_DEPTH + 0.6 + 0.08 * Math.sin(t * 0.9 + (o[0] as number) * 0.7);
        const sh = 0.5 + 0.5 * Math.sin(t * 0.7 + s * 0.37 + (o[0] as number) * 0.3);
        [o[3], o[4], o[5]] = scale(mix(C.violet, C.cyan, sh), 0.06 + 0.12 * sh);
        return true;
      }
      s -= water;
      const side = s & 1 ? 1 : -1;
      o[0] = x0 + ((s >> 1) + 0.5) * 8;
      o[1] = GROUND - 6;
      o[2] = z + side * (CANAL_W - 0.4);
      [o[3], o[4], o[5]] = scale(C.warm, 0.5);
      return true;
    },
  };
}
/** Sky bridges between the Heights' tall towers, across the street, at a height both reach. */
function bridgeItem(A: Block, B: Block, eye: Vec3): Item | null {
  const top = Math.min(A.h, B.h) - 6;
  if (top < 36) return null;
  const y = GROUND + 30 + (top - 30) * hash(A.k, 471);
  const z = clamp(
    (A.z + B.z) / 2,
    Math.max(A.z - A.hz, B.z - B.hz) + 2,
    Math.min(A.z + A.hz, B.z + B.hz) - 2,
  );
  const x0 = A.x + A.hx;
  const x1 = B.x - B.hx;
  const len = x1 - x0;
  if (len <= 0) return null;
  const per = Math.ceil(len / 0.4);
  return {
    d: boxDist(eye, [x0, y - 1, z - 1], [x1, y + 1.6, z + 1]),
    gid: mixId(A.k, 472),
    count: per * 5,
    weight: 2,
    probe: [
      [x0, y, z],
      [(x0 + x1) / 2, y, z],
      [x1, y, z],
    ],
    site: (s, o) => {
      const e = Math.floor(s / per);
      const u = ((s % per) + 0.5) / per;
      o[0] = x0 + u * len;
      if (e < 4) {
        o[1] = y + (e & 1 ? 1.6 : 0);
        o[2] = z + (e & 2 ? 0.9 : -0.9);
        [o[3], o[4], o[5]] = scale(C.cyan, 0.3);
      } else {
        o[1] = y + 0.05;
        o[2] = z;
        [o[3], o[4], o[5]] = scale(C.warm, s % 3 === 0 ? 0.55 : 0.12);
      }
      return true;
    },
  };
}

/* ---------- word signs: the city's pixel faces (lib/city-font.ts, lib/city-signs.ts) ---------- */

export type { WordSign };

const MARKET_WORDS = ['BANK', 'BAR', 'HOTEL', 'CAFE', 'NOODLES', 'CINEMA', 'TEA', 'DREAMS'];
const NEON_TONES: RGB[] = [C.magenta, C.cyan];
/** The Green Code quarter's welcome, at both its mouths. */
export const CODE_WELCOME = 'WELCOME TO THE\nGREEN CODE QUARTER';
/** The words the plan itself writes on its signs (with the districts' names), for the tests. */
export const SIGN_STRINGS = [CODE_WELCOME, ...MARKET_WORDS, 'METRO', 'RACE'];
/**
 * The word signs near the eye: district names at their mouths, the Green Code quarter's welcome
 * at both of its; the city's welcome is the opening road's (`openingItems`).
 */
function wordsNear(eye: Vec3, R: number, out: WordSign[]) {
  const n0 = Math.floor((eye[2] - R) / TILE_Z);
  const n1 = Math.floor((eye[2] + R) / TILE_Z);
  const xc = nearest(0, eye[0], TILE_X);
  const code = BANDS.findIndex((b) => b[0] === 'code');
  const T = textPixels(CODE_WELCOME, { face: 'deco' });
  const px = 0.34;
  for (let n = n0; n <= n1; n++) {
    const z0 = n * TILE_Z;
    // The Green Code quarter's welcome, over the avenue at both its mouths, in green.
    for (const [z, k] of [
      [z0 + code * BAND_ROWS * BLOCK_Z, 0],
      [z0 + TILE_Z, 1],
    ] as const)
      out.push({
        text: CODE_WELCOME,
        at: [xc - (T.w * px) / 2, GROUND + 30 + T.h * px, z],
        px,
        rgb: CODE_GREEN,
        rgb2: mix(CODE_GREEN, C.white, 0.5),
        key: 9101 + n * 2 + k,
        face: 'deco',
        frame: 'box',
      });
    BANDS.forEach((band, b) => {
      // Each district's name over its mouth, on the avenue's walls, in the bold face.
      const J = n * TILE_J + b * BAND_ROWS + BAND_ROWS - 1;
      band.forEach((id, side) => {
        const tw = blockTower(side ? 0 : -1, J);
        const name = DISTRICTS[id].name.toUpperCase();
        const T2 = textPixels(name, { face: 'deco' });
        const px2 = 0.22;
        const x = side ? xc + AVENUE + 1 : xc - AVENUE - 1 - T2.w * px2;
        out.push({
          text: name,
          at: [x, GROUND + Math.min(tw.h - 2, 14), tw.z + tw.hz + 0.4],
          px: px2,
          rgb: DISTRICTS[id].colour,
          key: b * 2 + side,
          face: 'deco',
          frame: 'line',
        });
      });
    });
  }
}
/**
 * The market's shop words in the tall neon face (now and then elsewhere too), on tower faces that
 * look down the streets (+z); and the market's hanging boards.
 */
function shopWords(tw: Block, out: WordSign[]) {
  if (tw.shape !== 'box') return;
  const h = hash(tw.k, 480);
  if (tw.d !== 'market' && h > 0.06) return;
  const word = MARKET_WORDS[Math.floor(hash(tw.k, 481) * MARKET_WORDS.length)] as string;
  const T = textPixels(word, { face: 'tall' });
  const px = Math.min(0.42, (tw.hx * 1.6) / T.w);
  const y = GROUND + Math.min(tw.h - 2, 8 + T.h * px + (tw.h - 14) * hash(tw.k, 482));
  out.push({
    text: word,
    at: [tw.x - (T.w * px) / 2, y, tw.z + tw.hz + 0.3],
    px,
    rgb: NEON_TONES[tw.k % NEON_TONES.length] as RGB,
    key: tw.k,
    face: 'tall',
    frame: 'line',
  });
  // A few hanging boards on the market's side streets, at one or two heights: not every tower.
  if (tw.d === 'market' && hash(tw.k, 483) < 0.5 && tw.I !== 0)
    out.push(
      ...boardsOn(
        tw,
        [hash(tw.k, 484) < 0.5 ? -1 : 1],
        tw.h > 34 ? [0.3, 0.75] : [0.5],
        NEON_TONES,
      ),
    );
}

/** A tower's poster on its roof, in its district's hue, where it carries one. */
function posterItems(tw: Block, eye: Vec3, t: number, out: Item[]) {
  if (tw.shape !== 'box' || tw.d === 'chinatown') return;
  const often = openingRow(tileRow(tw.J)) && (tw.I === 0 || tw.I === -1);
  const p = posterOn(tw, often ? C.saffron : DISTRICTS[tw.d].colour, often);
  if (!p) return;
  out.push(posterBoardItem(p, eye, t));
  for (const w of posterSigns(p)) out.push(wordItem(w, eye, t));
}

/**
 * The road you start on (2026-11-13: "a cool entry for the game. a first road that is awesome
 * (like the chinatown one)"): down the avenue from where the Ship starts to Chinatown's gate, a
 * row of temple gates glowing as you pass through them, the welcome hung over it, boards on its
 * walls at many heights (the posters on its roofs come with the towers').
 */
function openingItems(eye: Vec3, t: number, out: Item[]) {
  const xc = nearest(0, eye[0], TILE_X);
  if (Math.abs(eye[0] - xc) > NEAR) return;
  const mid = (OPENING.start + OPENING.end) / 2;
  const n = Math.round((eye[2] - mid) / TILE_Z);
  const oz = n * TILE_Z;
  if (Math.abs(oz + mid - eye[2]) > NEAR + 120) return;
  TORII_Z.forEach((z, i) => {
    const it = toriiItem(oz + z, xc, eye, t, n * 31 + i);
    if (it.d < NEAR) out.push(it);
  });
  const w = wordItem(welcomeSign(xc, oz + OPENING.welcome, 9001 + n), eye, t);
  if (w.d < NEAR + 40) out.push(w);
  for (let lj = 8; lj < 14; lj++) {
    for (const I of [-1, 0] as const) {
      const tw = blockTower(I, n * TILE_J + lj);
      if (tw.shape !== 'box' || Math.abs(tw.z - eye[2]) > NEAR) continue;
      const side: -1 | 1 = I < 0 ? -1 : 1;
      const levels = tw.h > 26 ? [0.25, 0.55, 0.85] : [0.3, 0.75];
      for (const b of boardsOn(tw, [side], levels, [C.red, C.gold, C.saffron], avenueWall(xc)))
        out.push(wordItem(b, eye, t));
    }
  }
}

/* ---------- Chinatown's signs at every height ---------- */

const SIGN_WORDS = ['ラーメン', '茶', '龍', '酒', '夢', '麺', '福', '喫茶', '夜市'];
const SIGN_TONES: Sign['tone'][] = ['red', 0, 'gold', 1, 'red', 2.2, 'gold', 0.4, 'red'];
const GLYPH = 16;
const sizeOf = (text: string, px: number) => px * (GLYPH + ([...text].length - 1) * (GLYPH + 3));
const blockSigns = new Map<number, Sign[]>();
/**
 * Chinatown's tall signs on a tower, low, middle and high, on both its street walls, standing out
 * over the street and facing down it (+z) so you read them as you come; the avenue's low ones are
 * lib/city.ts's own (avenueSigns), so here only its middle and high ones.
 */
export function towerSigns(tw: Block): Sign[] {
  if (tw.d !== 'chinatown' || tw.shape !== 'box') return [];
  const key = tw.I * 65536 + tw.J;
  const had = blockSigns.get(key);
  if (had) return had;
  const out: Sign[] = [];
  const ave = tw.I === 0 || tw.I === -1;
  for (const side of [-1, 1]) {
    // On the avenue, only the side away from it gets low signs here.
    const facesAve = ave && (tw.I === 0 ? side < 0 : side > 0);
    const levels = facesAve ? [0.55, 0.85] : [0.15, 0.5, 0.82];
    levels.forEach((lv, m) => {
      const j = tw.k * 7 + m * 3 + (side > 0 ? 1 : 0);
      const text = SIGN_WORDS[wrap(j, SIGN_WORDS.length)] as string;
      const px = 0.22;
      const w = px * GLYPH;
      const h = sizeOf(text, px);
      const top = GROUND + Math.max(h + 2, Math.min(tw.h - 1, tw.h * lv + h / 2));
      if (top - h < GROUND + 1.5) return;
      const x0 = side > 0 ? tw.x + tw.hx + 0.3 : tw.x - tw.hx - 0.3 - w;
      out.push({
        text,
        at: [x0, top, tw.z + tw.hz * (m % 2 ? -0.4 : 0.55)],
        vertical: true,
        px,
        tone: SIGN_TONES[wrap(j, SIGN_TONES.length)] as Sign['tone'],
        k: 300 + wrap(j, 97),
      });
    });
  }
  if (blockSigns.size > 4096) blockSigns.clear();
  blockSigns.set(key, out);
  return out;
}

/* ---------- the metro ---------- */

function railItems(eye: Vec3, t: number, R: number, out: Item[]) {
  const ox = nearest(0, eye[0], TILE_X);
  const oz0 = Math.floor((eye[2] - R) / TILE_Z) * TILE_Z;
  const CH = 30;
  const chunks = Math.ceil(RAIL.length / CH);
  for (let oz = oz0; oz <= eye[2] + R; oz += TILE_Z) {
    for (let c = 0; c < chunks; c++) {
      const s0 = c * CH;
      const mid = railAt(s0 + CH / 2).c;
      const wx = mid[0] + ox;
      const wz = mid[2] + oz;
      const d = Math.hypot(wx - eye[0], mid[1] - eye[1], wz - eye[2]) - CH / 2;
      if (d > R) continue;
      const per = Math.ceil(CH / 0.35);
      const pylon = 40;
      out.push({
        d: Math.max(0, d),
        gid: mixId(Math.round(oz / TILE_Z), 5000 + c),
        count: per * 3 + pylon,
        weight: 1.6,
        probe: [[wx, mid[1], wz]],
        site: (s, o) => {
          if (s < per * 3) {
            const e = Math.floor(s / per);
            const r = railAt(s0 + ((s % per) + 0.5) * (CH / per));
            const side: Vec3 = [-r.f[2], 0, r.f[0]];
            const off = e === 2 ? 0 : e ? 0.5 : -0.5;
            o[0] = r.c[0] + ox + side[0] * off;
            o[1] = r.c[1] + (e === 2 ? 0.6 : 0);
            o[2] = r.c[2] + oz + side[2] * off;
            const sleeper = e === 2;
            [o[3], o[4], o[5]] = sleeper
              ? scale(C.steel, 0.16)
              : scale(mix(C.white, C.cyan, 0.3), 0.32);
            return true;
          }
          // The pylon holding this stretch: up from the street, its arm curving over to the rail.
          const r = railAt(s0 + CH / 2);
          const u = (s - per * 3 + 0.5) / pylon;
          const side: Vec3 = [-r.f[2], 0, r.f[0]];
          const foot: Vec3 = [r.c[0] + side[0] * 3, GROUND, r.c[2] + side[2] * 3];
          if (u < 0.75) {
            const v = u / 0.75;
            o[0] = foot[0] + ox;
            o[1] = lerp(GROUND, r.c[1] + 1.5, v);
            o[2] = foot[2] + oz;
          } else {
            const v = (u - 0.75) / 0.25;
            o[0] = lerp(foot[0], r.c[0], v) + ox;
            o[1] = r.c[1] + 1.5 + 0.8 * Math.sin(Math.PI * v);
            o[2] = lerp(foot[2], r.c[2], v) + oz;
          }
          [o[3], o[4], o[5]] = scale(C.amber, u > 0.97 || s % 7 === 0 ? 0.45 : 0.14);
          return true;
        },
      });
    }
    for (let j = 0; j < TRAINS; j++) {
      for (let car = 0; car < CARS; car++) {
        const K = carAt(j, car, t);
        const wc: Vec3 = [K.c[0] + ox, K.c[1], K.c[2] + oz];
        const d = Math.hypot(wc[0] - eye[0], wc[1] - eye[1], wc[2] - eye[2]) - CAR_LEN;
        if (d > R) continue;
        out.push({
          d: Math.max(0, d),
          gid: mixId(Math.round(oz / TILE_Z) * 31 + j, 6000 + car),
          count: 170,
          weight: 2.4,
          probe: [wc],
          site: (s, o) => carSite(K, s, ox, oz, t, o),
        });
      }
    }
    STATIONS.forEach((s0, k) => {
      const r = railAt(s0);
      const side: Vec3 = [-r.f[2], 0, r.f[0]];
      const c: Vec3 = [r.c[0] + ox + side[0] * 3.4, r.c[1] - 4.4, r.c[2] + oz + side[2] * 3.4];
      const d = Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) - 12;
      if (d > R) return;
      out.push({
        d: Math.max(0, d),
        gid: mixId(Math.round(oz / TILE_Z), 7000 + k),
        count: 360,
        weight: 2,
        probe: [c],
        site: (s, o) => {
          // The platform: a long deck beside the rail, its edge lit, pillars down to the street.
          const u = (s + 0.5) / 360;
          const f = r.f;
          if (s < 240) {
            const along = (frac(u * 3) - 0.5) * 22;
            const across = (Math.floor(u * 3) - 1) * 1.4;
            o[0] = c[0] + f[0] * along + side[0] * across;
            o[1] = c[1];
            o[2] = c[2] + f[2] * along + side[2] * across;
            [o[3], o[4], o[5]] = scale(across < 0 ? C.warm : C.steel, across < 0 ? 0.42 : 0.14);
            return true;
          }
          const p = s - 240;
          const along = ((p % 4) / 3 - 0.5) * 20;
          const v = Math.floor(p / 4) / 30;
          o[0] = c[0] + f[0] * along + side[0] * 1.4;
          o[1] = lerp(c[1], GROUND, v);
          o[2] = c[2] + f[2] * along + side[2] * 1.4;
          [o[3], o[4], o[5]] = scale(C.steel, 0.14);
          return true;
        },
      });
      // Its name, METRO, over the platform.
      const wi = wordItem(
        { text: 'METRO', at: [c[0] - 3, c[1] + 5.5, c[2]], px: 0.25, rgb: C.cyan, key: 7100 + k },
        eye,
        t,
      );
      out.push(wi);
    });
  }
}
/** A carriage hung under the rail: its outline, lit windows down both sides, leaning into the bend. */
function carSite(
  K: { c: Vec3; f: Vec3; bank: number },
  s: number,
  ox: number,
  oz: number,
  t: number,
  o: number[],
) {
  const f = K.f;
  const side0: Vec3 = [-f[2], 0, f[0]];
  const cb = Math.cos(K.bank);
  const sb = Math.sin(K.bank);
  const side: Vec3 = [side0[0] * cb, sb, side0[2] * cb];
  const up: Vec3 = [-side0[0] * sb, cb, -side0[2] * sb];
  const P = (a: number, b: number, c: number) => {
    o[0] = K.c[0] + ox + f[0] * a + side[0] * b + up[0] * c;
    o[1] = K.c[1] + f[1] * a + side[1] * b + up[1] * c;
    o[2] = K.c[2] + oz + f[2] * a + side[2] * b + up[2] * c;
  };
  const L = CAR_LEN / 2;
  if (s < 96) {
    // The body's outline: four long edges and the rounded ends.
    const e = s % 4;
    const u = (Math.floor(s / 4) + 0.5) / 24;
    P((u * 2 - 1) * L * 0.92, e & 1 ? 1.1 : -1.1, e & 2 ? 1.1 : -1.1);
    [o[3], o[4], o[5]] = scale(C.white, 0.22);
    return true;
  }
  if (s < 156) {
    const q = s - 96;
    const sd = q & 1 ? 1.15 : -1.15;
    const u = ((q >> 1) + 0.5) / 30;
    P((u * 2 - 1) * L * 0.85, sd, 0.2);
    const lit = 0.75 + 0.25 * Math.sin(t * 0.4 + q);
    [o[3], o[4], o[5]] = scale(C.warm, 0.5 * lit);
    return true;
  }
  // The hanger up to the rail.
  const u = (s - 156 + 0.5) / 14;
  P(0, 0, 1.1 + u * 1.3);
  [o[3], o[4], o[5]] = scale(C.steel, 0.3);
  return true;
}

/* ---------- the plan from far above ---------- */

/** Districts lit by a race won: their roofs glow brighter from above. */
export const litDistricts = new Set<DistrictId>();

/**
 * What of the ground the eye sees: the box round where the corners of its view (up to a wide
 * screen's) meet the ground, kept within Rg of the eye, and a test for a point inside the view's
 * cone. The plan spends its grains only there, so from the stratosphere they gather where you look.
 */
function viewFootprint(eye: Vec3, fwd: Vec3, Rg: number) {
  const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
  const f: Vec3 = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
  const rl = Math.hypot(f[2], f[0]) || 1;
  const r: Vec3 = [-f[2] / rl, 0, f[0] / rl];
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let z0 = Number.POSITIVE_INFINITY;
  let z1 = Number.NEGATIVE_INFINITY;
  for (const [a, b] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
    [0, 0],
  ] as const) {
    const dir: Vec3 = [
      f[0] + a * VIEW_TAN_H * r[0] + b * VIEW_TAN_V * u[0],
      f[1] + a * VIEW_TAN_H * r[1] + b * VIEW_TAN_V * u[1],
      f[2] + a * VIEW_TAN_H * r[2] + b * VIEW_TAN_V * u[2],
    ];
    const s = dir[1] < -1e-6 ? (GROUND - eye[1]) / dir[1] : Number.POSITIVE_INFINITY;
    let gx = s * dir[0];
    let gz = s * dir[2];
    const g = Math.hypot(gx, gz);
    if (!Number.isFinite(g) || g > Rg) {
      const hl = Math.hypot(dir[0], dir[2]) || 1;
      gx = (dir[0] / hl) * Rg;
      gz = (dir[2] / hl) * Rg;
    }
    x0 = Math.min(x0, eye[0] + gx);
    x1 = Math.max(x1, eye[0] + gx);
    z0 = Math.min(z0, eye[2] + gz);
    z1 = Math.max(z1, eye[2] + gz);
  }
  const seen = (x: number, y: number, z: number, pad: number) => {
    const dx = x - eye[0];
    const dy = y - eye[1];
    const dz = z - eye[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    return (dx * f[0] + dy * f[1] + dz * f[2]) / d > VIEW_COS - pad / d;
  };
  return { x0, x1, z0, z1, seen };
}
/** The view's half-widths as tangents (a wide screen's, 55° tall), and the cosine of its cone. */
const VIEW_TAN_V = Math.tan((27.5 * Math.PI) / 180);
const VIEW_TAN_H = VIEW_TAN_V * 2;
const VIEW_COS = 1 / Math.hypot(1, VIEW_TAN_H, VIEW_TAN_V);

function planItems(eye: Vec3, fwd: Vec3, R: number, k: number, t: number, out: Item[]) {
  const Rg = Math.sqrt(Math.max(0, R * R - (eye[1] - GROUND) ** 2));
  const V = viewFootprint(eye, fwd, Rg);
  // From the stratosphere the roofs' outlines and the side streets give way (they would spread
  // the grains thin), leaving the roofs' fills, the main roads and the plazas bold.
  const far = smooth((eye[1] - GROUND - 250) / 300);
  const fine = 1 - 0.92 * far;
  const I0 = Math.floor(V.x0 / BLOCK_X);
  const I1 = Math.floor(V.x1 / BLOCK_X);
  const J0 = Math.floor(V.z0 / BLOCK_Z);
  const J1 = Math.floor(V.z1 / BLOCK_Z);
  for (let I = I0; I <= I1; I++) {
    for (let J = J0; J <= J1; J++) {
      const tw = blockTower(I, J);
      const y = GROUND + tw.h;
      const d = Math.hypot(tw.x - eye[0], y - eye[1], tw.z - eye[2]);
      if (d > R || !V.seen(tw.x, y, tw.z, 30)) continue;
      const col = DISTRICTS[tw.d].colour;
      const glow = (litDistricts.has(tw.d) ? 1.6 : 1) * districtPulse(tw.d, t, (tw.k % 5) * 0.03);
      const n = Math.ceil((4 * (tw.hx + tw.hz)) / 2.4);
      const gid = mixId(I * 7919, J * 104729);
      // A fill of the roof's own hue (a 3 × 3 of lights, kept before its outline), so each
      // district reads from far above as a patch of one colour, as the Golden plan's rings do,
      // the roofs shining up at you (2026-11-13: "not just black roofs").
      if (tw.h > 0 && tw.shape !== 'pyramid') {
        out.push({
          d,
          gid: gid + 1,
          count: 9,
          weight: (2.2 + 2.3 * far) * k,
          site: (s, o) => {
            o[0] = tw.x + ((s % 3) - 1) * 0.62 * tw.hx;
            o[1] = y;
            o[2] = tw.z + (Math.floor(s / 3) - 1) * 0.62 * tw.hz;
            [o[3], o[4], o[5]] = scale(s === 4 ? mix(col, C.warm, 0.5) : col, 0.72 * glow);
            return true;
          },
        });
      }
      out.push({
        d,
        gid,
        count: n,
        weight: 1.1 * k * fine,
        site: (s, o) => {
          const e = ((s + 0.5) / n) * 4 * (tw.hx + tw.hz);
          const P = 2 * (tw.hx + tw.hz);
          let x: number;
          let z: number;
          const m = e % P;
          if (m < 2 * tw.hx) [x, z] = [-tw.hx + m, e < P ? -tw.hz : tw.hz];
          else [x, z] = [e < P ? tw.hx : -tw.hx, -tw.hz + (m - 2 * tw.hx)];
          o[0] = tw.x + x;
          o[1] = tw.shape === 'pyramid' ? GROUND + 0.1 : y;
          o[2] = tw.z + z;
          [o[3], o[4], o[5]] = scale(col, 0.5 * glow);
          return true;
        },
      });
    }
  }
  // The landmarks' plazas: a ring of light round each in its district's hue, breathing on the
  // district's beat, a bright heart at the middle, so every district's centre is found from above.
  const ox = nearest(0, eye[0], TILE_X);
  for (let nz = Math.floor((V.z0 - 30) / TILE_Z); nz * TILE_Z <= V.z1 + 30; nz++) {
    LANDMARKS.forEach((L, li) => {
      const cx = L.x + ox;
      const cz = L.z + nz * TILE_Z;
      const d = Math.hypot(cx - eye[0], GROUND - eye[1], cz - eye[2]);
      if (d > R || !V.seen(cx, GROUND, cz, 30)) return;
      const col = DISTRICTS[L.d].colour;
      const glow = (litDistricts.has(L.d) ? 1.5 : 1) * districtPulse(L.d, t);
      out.push({
        d,
        gid: mixId(nz * 13 + li, 515151),
        count: PLAZA_RING + PLAZA_HEART,
        weight: 3 * k,
        site: (s, o) => {
          if (s < PLAZA_RING) {
            const a = ((s + 0.5) / PLAZA_RING) * Math.PI * 2;
            o[0] = cx + Math.cos(a) * 24;
            o[1] = GROUND + 0.2;
            o[2] = cz + Math.sin(a) * 24;
            [o[3], o[4], o[5]] = scale(col, 0.75 * glow);
            return true;
          }
          const q = fibonacciSphere(s - PLAZA_RING, PLAZA_HEART);
          o[0] = cx + q[0] * 4;
          o[1] = GROUND + 2 + Math.abs(q[1]) * 4;
          o[2] = cz + q[2] * 4;
          [o[3], o[4], o[5]] = scale(mix(col, C.white, 0.35), 0.9 * glow);
          return true;
        },
      });
    });
  }
  // Street lights: the avenue brightest, then the main roads (the tile's edges along, the bands'
  // edges across) as bold threads of gold, then every other street a fainter thread of amber. Few
  // strong lines, as the Golden plan's boulevards and rings, so the plan reads from far above.
  for (let I = I0; I <= I1 + 1; I++) {
    const x = I * BLOCK_X;
    const ave = tileCol(I) === 0;
    const main = ave || tileCol(I) === -TILE_I / 2;
    const gap = ave ? 1.2 : main ? 2 : 4;
    const n = Math.ceil((V.z1 - V.z0) / gap);
    out.push({
      d: Math.abs(eye[1] - GROUND),
      gid: mixId(I, 424242),
      count: n,
      weight: (main ? 3 : 0.5 + 0.5 * fine) * k,
      site: (s, o) => {
        o[0] = x + (ave ? (s & 1 ? 3 : -3) : 0);
        o[1] = GROUND + 0.1;
        o[2] = V.z0 + (s + 0.5) * gap;
        // A slow wave of light running down every street, on the city's beat.
        const wave = 0.6 + 0.4 * beat(t, 1, -(o[2] as number) / 160);
        // The Green Code quarter's streets are lit green.
        const rgb = inCode(x, o[2] as number)
          ? CODE_GREEN
          : ave
            ? C.white
            : main
              ? C.gold
              : C.amber;
        [o[3], o[4], o[5]] = scale(rgb, (ave ? 0.62 : main ? 0.5 : 0.3) * wave);
        return true;
      },
    });
  }
  for (let J = J0; J <= J1 + 1; J++) {
    const z = J * BLOCK_Z;
    const main = tileRow(J) % BAND_ROWS === 0;
    const gap = main ? 2 : 4;
    const n = Math.ceil((V.x1 - V.x0) / gap);
    out.push({
      d: Math.abs(eye[1] - GROUND),
      gid: mixId(J, 434343),
      count: n,
      weight: (main ? 3 : 0.5 + 0.5 * fine) * k,
      site: (s, o) => {
        o[0] = V.x0 + (s + 0.5) * gap;
        o[1] = GROUND + 0.1;
        o[2] = z;
        const wave = 0.6 + 0.4 * beat(t, 1, -(o[0] as number) / 160);
        const rgb = inCode(o[0] as number, z) ? CODE_GREEN : main ? C.gold : C.amber;
        [o[3], o[4], o[5]] = scale(rgb, (main ? 0.5 : 0.28) * wave);
        return true;
      },
    });
  }
}
/** Whether a point is in the Green Code quarter (its streets lit green). */
const inCode = (x: number, z: number) => districtAt(x + 0.01, z) === 'code';
/** Cars in the Green Code quarter take its green, their lights too. */
const codeCars = (x: number, z: number): RGB | null => (inCode(x, z) ? CODE_GREEN : null);
/** Sites in a landmark plaza's ring from above, and in its bright heart. */
const PLAZA_RING = 72;
const PLAZA_HEART = 24;

/* ---------- everything lit near the eye ---------- */

/** How far the details are drawn: ornaments, signs, lanterns, tunnels. */
export const NEAR = 160;
/**
 * How far the eye can see at a height: 340 in the street, opening wide as you climb, to 1,300.
 * Was 160 (2026-11-14: "improve density and visibility so buildings can be seen in the distance"):
 * the towers now stand out to twice as far, their details still kept to NEAR.
 */
export const STREET_VIEW = 340;
export function viewAt(y: number): number {
  return clamp(STREET_VIEW + (y - GROUND - 60) * 1.6, STREET_VIEW, 1300);
}
/** How much the city is drawn as its plan, from above: none low down, all of it high. */
export const planLook = (y: number) => smooth((y - GROUND - 70) / 90);

/**
 * Everything the game adds to the Ship's picture near the eye: the districts' roofs, landmarks
 * and Studio buildings, lanterns and lamps, tunnels and their pulses, portals, canals, bridges,
 * the metro, word signs and, from high up, the plan. With the `ship`, the pad it comes in to
 * brightens and the cars' lights dip as it passes low.
 */
export function gameItems(eye: Vec3, fwd: Vec3, t: number, ship?: Vec3): Item[] {
  const out: Item[] = [];
  const R = viewAt(eye[1]);
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const ahead = (x: number, z: number, rad: number) => {
    const rx = x - eye[0];
    const rz = z - eye[2];
    const depth = rx * hx + rz * hz;
    return depth > -rad && Math.abs(rx * hz - rz * hx) < depth * 1.1 + rad * 1.5 + 6;
  };
  // Blocks near: their ornaments, Studio buildings, tunnels, signs.
  const I0 = Math.floor((eye[0] - NEAR) / BLOCK_X);
  const I1 = Math.floor((eye[0] + NEAR) / BLOCK_X);
  const J0 = Math.floor((eye[2] - NEAR) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + NEAR) / BLOCK_Z);
  const words: WordSign[] = [];
  for (let I = I0; I <= I1; I++) {
    for (let J = J0; J <= J1; J++) {
      const tw = blockTower(I, J);
      if (!ahead(tw.x, tw.z, 20)) continue;
      const top = GROUND + tw.h;
      const d = boxDist(
        eye,
        [tw.x - tw.hx, GROUND, tw.z - tw.hz],
        [tw.x + tw.hx, top + 12, tw.z + tw.hz],
      );
      if (d > NEAR) continue;
      const M = ornamentOf(tw);
      if (M) {
        const pulse = districtPulse(tw.d, t, (tw.k % 7) * 0.02);
        out.push({
          d,
          gid: mixId(tw.k, 1234),
          count: M.count,
          weight: tw.shape === 'pyramid' ? 1.3 : 1.6,
          probe: [
            [tw.x, top + 2, tw.z],
            [tw.x + tw.hx, top, tw.z + tw.hz],
            [tw.x - tw.hx, top, tw.z + tw.hz],
          ],
          site: (s, o) => modelSite(M, s, t, tw.x, GROUND, tw.z, 1, pulse, o),
        });
      }
      if (tw.shape === 'design' && tw.design)
        out.push(designItem(tw.design, tw, DISTRICTS[tw.d].colour, eye, t));
      if (tw.bore?.through) out.push(throughItem(tw, eye));
      else if (tw.bore) out.push(boreItem(tw, eye));
      if (tw.shape === 'box') {
        // Roofs that glow from above, and readable windows on some (lib/city-roofs.ts).
        const roof = roofItem(tw, DISTRICTS[tw.d].colour, eye, t);
        if (roof) out.push(roof);
        if (tw.facade && d < 120)
          for (let face = 0; face < 4; face++) {
            const it = facadeItem(tw, face, tw.facade, DISTRICTS[tw.d].colour, eye, t);
            if (it) out.push(it);
          }
      }
      if (tw.shape === 'business') {
        const size = { ...businessSize(I, J, tw.k), hx: tw.hx, hz: tw.hz, h: tw.h };
        out.push(towerItem(tw, size, eye, t, d));
        for (const [B, axis] of [
          [blockTower(I + 1, J), 0],
          [blockTower(I, J + 1), 2],
        ] as const) {
          if (B.shape !== 'business') continue;
          const it = skyBridgeItem(tw, B, axis, eye, t);
          if (it) out.push(it);
        }
      }
      shopWords(tw, words);
      posterItems(tw, eye, t, out);
      if (tw.shape === 'code') out.push(codeTowerItem(tw, eye, t, d));
      if (tw.d === 'heights' && tw.shape === 'box') {
        const B = blockTower(I + 1, J);
        if (B.shape === 'box' && B.d === 'heights') {
          const it = bridgeItem(tw, B, eye);
          if (it) out.push(it);
        }
      }
    }
  }
  // Landmarks within sight (from high up, from far off). From high up the tall crowns and the big
  // squares are lit up to the plan's strength, so they read on it.
  const lift = 1 + 1.6 * planLook(eye[1]);
  const ox = nearest(0, eye[0], TILE_X);
  const n0 = Math.floor((eye[2] - R) / TILE_Z);
  const n1 = Math.floor((eye[2] + R) / TILE_Z);
  for (let n = n0; n <= n1; n++) {
    const oz = n * TILE_Z;
    LANDMARKS.forEach((L, li) => {
      const x = L.x + ox;
      const z = L.z + oz;
      const d = Math.max(0, Math.hypot(x - eye[0], GROUND + 20 - eye[1], z - eye[2]) - 30);
      if (d > R || (d > 40 && !ahead(x, z, 40) && eye[1] < GROUND + 80)) return;
      const gid = mixId(n * 13 + li, 8080);
      const probe: Vec3[] = [
        [x, GROUND + 30, z],
        [x, GROUND + 8, z + 20],
        [x - 20, GROUND + 8, z],
      ];
      // Each landmark's tall crown (lib/city-landmarks.ts; 2026-11-14: "they need to be much bigger").
      const ck = crownKey(L.kind, L.set);
      if (ck) out.push(crownItem(ck, x, z, eye, t, gid, districtPulse(L.d, t) * lift));
      if (L.kind === 'nova') {
        out.push(coreItem(x, z, eye, t, d, gid));
        return;
      }
      if (L.kind === 'dataspire') {
        out.push(dataSpireItem(x, z, eye, t, d, gid));
        return;
      }
      if (L.kind === 'studio' && L.set) {
        out.push({ ...studioItem(L.set, L.i ?? 0, { x, z, key: gid }, 1.5, 4000, eye, t), d });
        return;
      }
      const M =
        L.kind === 'pagoda'
          ? grandPagoda()
          : L.kind === 'race'
            ? racePlaza()
            : L.kind === 'shikhara'
              ? templeLandmark()
              : L.kind === 'mosque'
                ? mosque()
                : L.kind === 'spire'
                  ? spire()
                  : egyptLandmark();
      out.push({
        d,
        gid,
        count: M.count,
        weight: 1.5,
        probe,
        site: (s, o) => modelSite(M, s, t, x, GROUND, z, 1, 1.15 * districtPulse(L.d, t), o),
      });
      if (L.kind === 'race') {
        const wi = wordItem(
          { text: 'RACE', at: [x - 4.5, GROUND + 16, z + 21], px: 0.42, rgb: C.red, key: 4000 + n },
          eye,
          t,
        );
        out.push(wi);
      }
    });
    // The Heights' tube and portals, over the avenue.
    if (Math.abs(eye[0] - ox) < NEAR + 10) {
      const tz = (TUBE.z0 + TUBE.z1) / 2 + oz;
      if (Math.abs(tz - eye[2]) < NEAR + 80) out.push(tubeItem(n, eye));
      PORTALS.forEach((p, k) => {
        const z = p.z + oz;
        if (Math.abs(z - eye[2]) < NEAR && ahead(ox, z, 8)) {
          const it = portalItem(z, [eye[0] - ox, eye[1], eye[2]], t, n * 5 + k);
          out.push({
            ...it,
            site: (s, o) => {
              if (!it.site(s, o)) return false;
              o[0] = (o[0] as number) + ox;
              return true;
            },
          });
        }
      });
      // The canals under the Canals' cross streets.
      for (const row of CANAL_ROWS) {
        const z = oz + row * BLOCK_Z;
        if (Math.abs(z - eye[2]) < NEAR) out.push(canalItem(n * TILE_J + row, ox, eye, t));
      }
    }
    // Chinatown's sky lanterns.
    const ctz = oz + (BAND_ROWS * BLOCK_Z) / 2;
    if (Math.abs(ctz - eye[2]) < NEAR + 150 && Math.abs(eye[0] - ox) < 120) {
      for (let j = 0; j < SKY_LANTERNS; j++) {
        const L = skyLantern(n, j, t);
        const c: Vec3 = [L.c[0] + ox, L.c[1], L.c[2]];
        const d = Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]);
        if (d > NEAR || L.k <= 0) continue;
        const lit = litLanterns.has(L.id);
        out.push({
          d,
          gid: mixId(L.id, 9191),
          count: 9,
          weight: 3,
          site: (s, o) => {
            const q = fibonacciSphere(s, 9);
            o[0] = c[0] + q[0] * 0.45;
            o[1] = c[1] + q[1] * 0.6;
            o[2] = c[2] + q[2] * 0.45;
            const g = (0.85 + 0.15 * Math.sin(t * 0.7 + j)) * L.k;
            [o[3], o[4], o[5]] = scale(
              lit ? C.gold : mix(C.amber, C.red, 0.3),
              (lit ? 0.85 : 0.45) * g,
            );
            return true;
          },
        });
      }
    }
  }
  // The Studio's temples, factories and domes on the blocks, much bigger, out to the view, and the
  // big squares' temples, domes and Nova Cores (lib/city-big.ts; 2026-11-14: "BIG TEMPLES. BIG
  // DOMES. AND NOVA CORES IN THE CITY.").
  const colourAt = (x: number, z: number) => DISTRICTS[districtAt(x, z)].colour;
  if (planLook(eye[1]) < 0.5) studioBlockItems(eye, t, R, blockTower, ahead, colourAt, out);
  bigItems(eye, t, R, ahead, colourAt, out, lift);
  wordsNear(eye, NEAR, words);
  for (const w of words) {
    const it = wordItem(w, eye, t);
    if (it.d < NEAR) out.push(it);
  }
  openingItems(eye, t, out);
  const strands: Strand[] = [];
  strandsNear(eye, NEAR, strands);
  for (const st of strands) {
    if (!ahead((st.a[0] + st.b[0]) / 2, (st.a[2] + st.b[2]) / 2, 12)) continue;
    const it = strandItem(st, eye, t);
    if (it.d < NEAR) out.push(it);
  }
  // Rope lights across the streets (lib/city-ropes.ts), Diwali lanes in the Indian quarter.
  ropeItems(eye, t, NEAR, blockTower, ahead, out);
  // The Deep Line under the city (lib/city-under.ts), and its name over the avenue ramp's mouth.
  underItems(eye, t, NEAR, pulseAt, ahead, out);
  for (const m of DEEP_MOUTHS) {
    if (m.down !== -1) continue;
    const at: Vec3 = [
      nearest(m.x, eye[0], TILE_X) - 9.5,
      GROUND + 15.5,
      nearest(m.z, eye[2], TILE_Z) + 0.5,
    ];
    if (Math.hypot(at[0] - eye[0], at[2] - eye[2]) > NEAR) continue;
    const wi = wordItem({ text: 'DEEP LINE', at, px: 0.42, rgb: C.cyan, key: 4400 }, eye, t);
    if (wi) out.push(wi);
  }
  railItems(eye, t, Math.min(R, NEAR + 60), out);
  riverItems(eye, t, R, floorAt, waterAt, out);
  dockItems(eye, t, Math.min(R, NEAR + 40), out, ship);
  embassyItems(eye, t, R, out);
  carItems(eye, fwd, t, (x, z) => inCanal(x, z) || underOpen(x, z), out, ship, codeCars);
  cityPortalItems(eye, t, out);
  const k = planLook(eye[1]);
  if (k > 0) planItems(eye, fwd, R, k, t, out);
  return out;
}

/** Chinatown's signs near the eye at every height, on all its streets. */
export function signsNear(eye: Vec3): Sign[] {
  const out: Sign[] = [];
  const I0 = Math.floor((eye[0] - NEAR) / BLOCK_X);
  const I1 = Math.floor((eye[0] + NEAR) / BLOCK_X);
  const J0 = Math.floor((eye[2] - NEAR) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + NEAR) / BLOCK_Z);
  for (let I = I0; I <= I1; I++) {
    for (let J = J0; J <= J1; J++) {
      if (districtOf(I, J) !== 'chinatown') continue;
      for (const s of towerSigns(blockTower(I, J))) out.push(s);
    }
  }
  return out;
}

/* ---------- other ships ---------- */

/**
 * The other ships: a few, cruising the avenue, the streets and the lane over every roof, one
 * convoy of three, all brought round near the eye as it flies (as the traffic is), each moving up
 * and aside as you come close: the city yields.
 */
export type ShipLane = {
  axis: 'x' | 'z';
  /** The street's line across (x for a z street), or none: the cross street nearest the eye. */
  line: number | null;
  y: number;
  dir: 1 | -1;
  speed: number;
  convoy: number;
  design: 0 | 1 | 2;
};
export const SHIP_LANES: ShipLane[] = [
  { axis: 'z', line: 4.5, y: 27, dir: -1, speed: 12, convoy: 3, design: 0 },
  { axis: 'z', line: 52, y: 17, dir: 1, speed: 10, convoy: 1, design: 1 },
  { axis: 'x', line: null, y: 24, dir: 1, speed: 11, convoy: 1, design: 2 },
  { axis: 'z', line: -26, y: 150, dir: -1, speed: 16, convoy: 1, design: 1 },
];
/** The second convoy, when no race takes those three slots. */
export const SPARE_LANE: ShipLane = {
  axis: 'z',
  line: -52,
  y: 12,
  dir: 1,
  speed: 9,
  convoy: 3,
  design: 2,
};
export const SHIP_SLOTS = 9;
const SHIP_RUN = 260;

/** Ship `slot` (of the cruising six, or the spare convoy's three) near the eye at time t: its middle, heading, and design. */
export function cruiser(
  slot: number,
  t: number,
  eye: Vec3,
  you: Vec3,
): { c: Vec3; f: Vec3; design: number; k: number } {
  let lane = SPARE_LANE;
  let m = slot - 6;
  let acc = 0;
  for (const L of SHIP_LANES) {
    if (slot < acc + L.convoy) {
      lane = L;
      m = slot - acc;
      break;
    }
    acc += L.convoy;
  }
  const s0 = hash(slot, 491) * SHIP_RUN;
  const along = s0 + lane.dir * lane.speed * t - m * 9 * lane.dir;
  const centre = lane.axis === 'z' ? eye[2] : eye[0];
  const a = centre + wrap(along - centre + SHIP_RUN / 2, SHIP_RUN) - SHIP_RUN / 2;
  const k = smooth((SHIP_RUN / 2 - Math.abs(a - centre)) / 25);
  let c: Vec3;
  if (lane.axis === 'z') {
    const x = nearest(lane.line ?? 0, eye[0], TILE_X) + (m % 2) * 1.5 * lane.dir;
    c = [x, GROUND + lane.y, a];
  } else {
    const z = Math.round(eye[2] / BLOCK_Z) * BLOCK_Z;
    c = [a, GROUND + lane.y, z];
  }
  // Moving aside as you come near: up and away.
  const d = Math.hypot(c[0] - you[0], c[1] - you[1], c[2] - you[2]);
  const yield_ = smooth((16 - d) / 10);
  c[1] += 4 * yield_;
  if (lane.axis === 'z') c[0] += Math.sign(c[0] - you[0] || 1) * 2 * yield_;
  else c[2] += Math.sign(c[2] - you[2] || 1) * 2 * yield_;
  const f: Vec3 = lane.axis === 'z' ? [0, 0, lane.dir] : [lane.dir, 0, 0];
  return { c, f, design: lane.design, k };
}

/**
 * Grain q (0..1) of a ship of `design` at c heading f: our own three shapes, made of grains as
 * the player's is. 0 a long hauler, a box body in a ring; 1 a dart, a thin delta with twin tails;
 * 2 a pod, a round cabin in a turning ring.
 */
export function shipGrain(
  design: number,
  q: number,
  i: number,
  c: Vec3,
  f: Vec3,
  t: number,
): { pos: Vec3; rgb: RGB } {
  const side: Vec3 = [-f[2], 0, f[0]];
  const P = (a: number, b: number, h: number): Vec3 => [
    c[0] + f[0] * a + side[0] * b,
    c[1] + h,
    c[2] + f[2] * a + side[2] * b,
  ];
  const r1 = hash(i, 501);
  if (design === 0) {
    if (q < 0.45) {
      const e = Math.floor(r1 * 4);
      return {
        pos: P((hash(i, 502) - 0.5) * 5, e & 1 ? 0.8 : -0.8, e & 2 ? 0.7 : -0.7),
        rgb: scale(C.steel, 0.35),
      };
    }
    if (q < 0.75) {
      const a = r1 * TAU;
      return { pos: P(-0.5, Math.cos(a) * 1.5, Math.sin(a) * 1.5), rgb: scale(C.amber, 0.4) };
    }
    if (q < 0.88) return { pos: P(2.6, (r1 - 0.5) * 1.2, 0), rgb: scale(C.white, 0.5) };
    return {
      pos: P(-2.6 - hash(i, 503) * 2, (r1 - 0.5) * 1, 0),
      rgb: scale(C.magenta, 0.4 * (1 - hash(i, 503))),
    };
  }
  if (design === 1) {
    if (q < 0.55) {
      const s = hash(i, 502);
      const e = r1 < 0.5 ? 1 : -1;
      return { pos: P(1.8 - s * 3.2, e * s * 1.4, 0), rgb: scale(C.white, 0.32) };
    }
    if (q < 0.75) {
      const e = r1 < 0.5 ? 1 : -1;
      return { pos: P(-1.4, e * 1.2, hash(i, 502) * 0.9), rgb: scale(C.cyan, 0.38) };
    }
    const s = hash(i, 503);
    return {
      pos: P(-1.5 - s * 2.5, (r1 < 0.5 ? 1 : -1) * 1.2, 0.2),
      rgb: scale(C.cyan, 0.35 * (1 - s)),
    };
  }
  if (q < 0.5) {
    const d = fibonacciSphere(i % 40, 40);
    return { pos: P(d[0] * 0.9, d[2] * 0.9, d[1] * 0.9), rgb: scale(C.warm, 0.38) };
  }
  const a = r1 * TAU + t * 0.8;
  return { pos: P(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0), rgb: scale(C.rose, 0.4) };
}

/** The district a point is in, by name, for the quiet label as you enter one. */
export const districtName = (x: number, z: number) => DISTRICTS[districtAt(x, z)].name;
