/*
 * Bridges high over the gap between the Heights and the Golden gardens (docs/specs/art-city.md,
 * "Racing corridors and the Heights–Golden bridges", 2026-11-14). Pure: no three.js, no DOM.
 *
 * 2026-11-14, the user: "I love the space between the Heights and Golden Garden. Add more bridges
 * higher up, so I can fly below them, or above, or in between. That width is perfect for racing and
 * the pleasure of flying."
 *
 * That space is the river's strip (lib/city-rain.ts): the river along x on the line before row 24,
 * the Heights' towers standing back from its north bank and the Golden gardens' from its south, 30
 * clear wall to wall. Its width is kept exactly as it was (no tower moves; tested). Over it, west of
 * the avenue where the two quarters face each other, six bridges span the gap from bank to bank,
 * staggered along it, each with two or three decks stacked at clearly different heights (the lowest
 * 16 or more over the street, the highest over a hundred, 20 or more of open air between decks):
 * flat decks, arched decks, lattice girders. Slim posts of light carry them on the embankment
 * walks, where nothing stands. Light, like every sky bridge: the street's ground bridges stay where
 * they were, and nothing here holds the ship. Mellow: steel toward the Heights warming to gold
 * toward the gardens, a slow swell across each deck.
 */

import type { Vec3 } from './bigbang';
import { boxDist, C, GROUND, type Item, mix, mixId, nearest, scale, TILE_X } from './city-grid';
import { RIVER_W, RIVER_Z, riverZ } from './city-rain';

export type GapDeckStyle = 'flat' | 'arch' | 'lattice';
/** A deck: its height over the street and its style. */
export type GapDeck = { y: number; style: GapDeckStyle };
/** A bridge across the gap: its tile-local x and its decks, low to high. */
export type GapBridge = { x: number; decks: GapDeck[] };

/** The gap, wall to wall: the river and an embankment walk of three each side. */
export const GAP_HALF = RIVER_W + 3;
/** Where the posts stand: on the embankment walks, between the banks and the towers. */
export const POST_Z = RIVER_W + 1.5;
/** Half a deck's width, across x. */
export const DECK_HALF = 2.4;
/** How far each style reaches up from its deck: rails, an arch's crown, a girder's top chord. */
export const DECK_DEPTH: Record<GapDeckStyle, number> = { flat: 1.1, arch: 5, lattice: 3 };

/**
 * The six, west of the avenue (x from -156 to -9, where the Heights and the gardens face each
 * other): clear of the street lines' ground bridges and of the racing corridor at x = -78
 * (lib/city-corridors.ts), staggered so their heights climb and fall as you fly along the gap.
 */
export const GAP_BRIDGES: GapBridge[] = [
  {
    x: -144,
    decks: [
      { y: 20, style: 'flat' },
      { y: 64, style: 'lattice' },
      { y: 106, style: 'arch' },
    ],
  },
  {
    x: -120,
    decks: [
      { y: 40, style: 'arch' },
      { y: 86, style: 'flat' },
    ],
  },
  {
    x: -112,
    decks: [
      { y: 24, style: 'lattice' },
      { y: 112, style: 'lattice' },
    ],
  },
  {
    x: -60,
    decks: [
      { y: 30, style: 'flat' },
      { y: 74, style: 'arch' },
    ],
  },
  {
    x: -40,
    decks: [
      { y: 18, style: 'lattice' },
      { y: 54, style: 'flat' },
      { y: 98, style: 'arch' },
    ],
  },
  {
    x: -18,
    decks: [
      { y: 36, style: 'arch' },
      { y: 80, style: 'lattice' },
    ],
  },
];

/** A deck's vertical extent over the street: what you fly under and over. */
export const deckSpan = (d: GapDeck): [number, number] => [d.y, d.y + DECK_DEPTH[d.style]];

const STEEL = mix(C.steel, C.white, 0.15);
/** The colour along a deck: steel at the Heights' bank (north, -z), gold at the gardens'. */
const along = (v: number) => mix(STEEL, C.gold, v);

const EDGE = Math.ceil((2 * GAP_HALF) / 0.35);
const RAIL = Math.ceil((2 * GAP_HALF) / 0.6);
const SLATS = 18;
const ARCH = Math.ceil((2 * GAP_HALF) / 0.4);
const HANGERS = 9;
const HANG = 5;
const PANELS = 10;
const DIAG = 8;
const POST_STEP = 0.9;

/** How many sites each style of deck has. */
function deckCount(st: GapDeckStyle): number {
  const deck = 2 * EDGE + SLATS * 6;
  if (st === 'flat') return deck + 2 * RAIL;
  if (st === 'arch') return deck + 2 * ARCH + 2 * HANGERS * HANG;
  return deck + 2 * EDGE + 2 * PANELS * DIAG;
}

/** Site s of deck dk at height y over (x, zc): deck edges, slats, then its style's own parts. */
function deckSite(dk: GapDeck, x: number, zc: number, s: number, t: number, o: number[]): boolean {
  const y = GROUND + dk.y;
  const swell = 0.85 + 0.15 * Math.sin(t * 0.5 + dk.y * 0.13 + x * 0.07);
  if (s < 2 * EDGE) {
    const e = s % 2 ? 1 : -1;
    const v = (Math.floor(s / 2) + 0.5) / EDGE;
    o[0] = x + e * DECK_HALF;
    o[1] = y;
    o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
    [o[3], o[4], o[5]] = scale(along(v), 0.34 * swell);
    return true;
  }
  s -= 2 * EDGE;
  if (s < SLATS * 6) {
    // Slats across the deck, a soft warm light in each.
    const k = Math.floor(s / 6);
    const v = (k + 0.5) / SLATS;
    o[0] = x - DECK_HALF + ((s % 6) + 0.5) * ((2 * DECK_HALF) / 6);
    o[1] = y;
    o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
    [o[3], o[4], o[5]] = scale(mix(along(v), C.warm, 0.4), 0.2 * swell);
    return true;
  }
  s -= SLATS * 6;
  if (dk.style === 'flat') {
    const e = s % 2 ? 1 : -1;
    const v = (Math.floor(s / 2) + 0.5) / RAIL;
    o[0] = x + e * DECK_HALF;
    o[1] = y + DECK_DEPTH.flat;
    o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
    [o[3], o[4], o[5]] = scale(along(v), 0.2 * swell);
    return true;
  }
  if (dk.style === 'arch') {
    const rise = DECK_DEPTH.arch;
    if (s < 2 * ARCH) {
      // An arch over each edge, springing from the deck's ends to its crown over the river.
      const e = s % 2 ? 1 : -1;
      const v = (Math.floor(s / 2) + 0.5) / ARCH;
      o[0] = x + e * DECK_HALF;
      o[1] = y + rise * 4 * v * (1 - v);
      o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
      [o[3], o[4], o[5]] = scale(mix(along(v), C.white, 0.15), 0.3 * swell);
      return true;
    }
    s -= 2 * ARCH;
    // Hangers down from the arch to the deck.
    const e = s % 2 ? 1 : -1;
    const q = Math.floor(s / 2);
    const v = (Math.floor(q / HANG) + 1) / (HANGERS + 1);
    const top = rise * 4 * v * (1 - v);
    o[0] = x + e * DECK_HALF;
    o[1] = y + (((q % HANG) + 0.5) / HANG) * top;
    o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
    [o[3], o[4], o[5]] = scale(along(v), 0.14);
    return true;
  }
  const depth = DECK_DEPTH.lattice;
  if (s < 2 * EDGE) {
    // A girder's top chord, each side.
    const e = s % 2 ? 1 : -1;
    const v = (Math.floor(s / 2) + 0.5) / EDGE;
    o[0] = x + e * DECK_HALF;
    o[1] = y + depth;
    o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
    [o[3], o[4], o[5]] = scale(along(v), 0.26 * swell);
    return true;
  }
  s -= 2 * EDGE;
  // Its diagonals, zigzagging between the chords.
  const e = s % 2 ? 1 : -1;
  const q = Math.floor(s / 2);
  const p = Math.floor(q / DIAG);
  const w = ((q % DIAG) + 0.5) / DIAG;
  const v = (p + w) / PANELS;
  o[0] = x + e * DECK_HALF;
  o[1] = y + depth * (p % 2 ? 1 - w : w);
  o[2] = zc - GAP_HALF + v * 2 * GAP_HALF;
  [o[3], o[4], o[5]] = scale(mix(along(v), C.white, 0.1), 0.18 * swell);
  return true;
}

/** A bridge at world x over the river's middle line zc: its decks, then four posts to the top one. */
function bridgeItem(b: GapBridge, x: number, zc: number, eye: Vec3, t: number): Item {
  const counts = b.decks.map((d) => deckCount(d.style));
  const decks = counts.reduce((a, n) => a + n, 0);
  const top = b.decks[b.decks.length - 1] as GapDeck;
  const yTop = top.y + DECK_DEPTH[top.style];
  const POST = Math.ceil(yTop / POST_STEP);
  return {
    d: boxDist(
      eye,
      [x - DECK_HALF, GROUND, zc - GAP_HALF],
      [x + DECK_HALF, GROUND + yTop, zc + GAP_HALF],
    ),
    gid: mixId(Math.round(x * 3), Math.round(zc) + 7201),
    count: decks + 4 * POST,
    weight: 1.6,
    probe: b.decks.flatMap((d): Vec3[] => [
      [x, GROUND + d.y + 0.5, zc],
      [x, GROUND + d.y + 0.5, zc - GAP_HALF + 1],
      [x, GROUND + d.y + 0.5, zc + GAP_HALF - 1],
    ]),
    site: (s, o) => {
      for (let i = 0; i < b.decks.length; i++) {
        const n = counts[i] as number;
        if (s < n) return deckSite(b.decks[i] as GapDeck, x, zc, s, t, o);
        s -= n;
      }
      // Four slim posts on the embankment walks, from the street up past the top deck, with a
      // warm lamp where each deck meets them.
      const p = Math.floor(s / POST);
      const u = ((s % POST) + 0.5) / POST;
      const y = u * yTop;
      o[0] = x + (p & 1 ? DECK_HALF : -DECK_HALF);
      o[1] = GROUND + y;
      o[2] = zc + (p & 2 ? POST_Z : -POST_Z);
      let atDeck = false;
      for (const d of b.decks) if (Math.abs(d.y - y) < POST_STEP) atDeck = true;
      const v = p & 2 ? 1 : 0;
      [o[3], o[4], o[5]] = atDeck ? scale(mix(C.warm, C.amber, 0.3), 0.6) : scale(along(v), 0.13);
      return true;
    },
  };
}

/** The gap's bridges within R of the eye, in every tile copy in reach. */
export function gapBridgeItems(eye: Vec3, t: number, R: number, out: Item[]) {
  const zc = riverZ(eye[2]);
  if (Math.abs(zc - eye[2]) > R + GAP_HALF) return;
  const ox = nearest(0, eye[0], TILE_X);
  for (const off of [-TILE_X, 0, TILE_X]) {
    for (const b of GAP_BRIDGES) {
      const x = ox + off + b.x;
      if (Math.abs(x - eye[0]) > R) continue;
      const it = bridgeItem(b, x, zc, eye, t);
      if (it.d < R) out.push(it);
    }
  }
}

/** The river's middle line in the tile's own frame (for the tests and the map). */
export const GAP_Z = RIVER_Z;
