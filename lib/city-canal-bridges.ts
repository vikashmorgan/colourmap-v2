/*
 * Bridges over the canals (docs/specs/art-city.md, "Alive quarters", 2026-11-14): "in the canals
 * quarter, add bridges over the canals, including arches and cool bridges whose underside curves up
 * (an arch below the deck, Venice or Rialto-like, but original). Varied styles: tall single arches,
 * low multi-arch stone-like bridges, slender curved footbridges, and one grand arched bridge with a
 * gallery on top. Space them along the canals, at a few heights where the streets are tall."
 *
 * The canals run under the Canals' cross streets (lib/city-game.ts CANAL_ROWS, CANAL_W,
 * CANAL_DEPTH); every bridge here spans one across z at the middle of a block, so it never stands
 * over a side street's lane. At street level: tall single arches, low stone bridges of three
 * arches, slender footbridges whose whole deck is a curve, and the Gallery Bridge, a wide single
 * arch with an arcade on top; under every arch the canal stays open to fly along (its crown over
 * twelve over the water), and every top stays under the cross street's lowest lane (15) by four.
 * High up: arched sky bridges from tower to tower across the canal streets, their decks at heights
 * clear of every lane. All traced in glowing grains in the Canals' violet and warm lamp light, a
 * slow drift; light only (the Ship flies through). Pure: no three.js, no DOM.
 */

import type { Vec3 } from './bigbang';
import {
  type Ahead,
  type AliveBlock,
  laneFree,
  quarterTones,
  type TowerAt,
} from './city-alive-base';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, mixId, nearest, TILE_X, TILE_Z } from './city-grid';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';

const G = GROUND;

/** The canals' rows, half width and depth (the same as lib/city-game.ts's; the tests hold them so). */
export const CANAL_BRIDGE_ROWS = [18, 20, 22];
export const CANAL_HALF = 4.5;
export const CANAL_DEEP = 14;
/** The water's surface. */
export const WATER_Y = G - CANAL_DEEP + 0.6;
/** The highest any street-level bridge reaches: the cross street's lowest lane (15) less four. */
export const LOW_TOP = 11;

export type CanalStyle = 'tall' | 'stone' | 'foot' | 'grand' | 'sky';

/** A bridge over a canal: its row, the block column it stands at the middle of, its style. */
export type CanalBridge = { row: number; I: number; style: CanalStyle };

/** The bridges, tile-local: three rows, five blocks each, every style along each canal. */
export const CANAL_BRIDGES: CanalBridge[] = [
  { row: 18, I: 1, style: 'foot' },
  { row: 18, I: 2, style: 'stone' },
  { row: 18, I: 3, style: 'grand' },
  { row: 18, I: 4, style: 'sky' },
  { row: 18, I: 5, style: 'tall' },
  { row: 20, I: 1, style: 'tall' },
  { row: 20, I: 2, style: 'sky' },
  { row: 20, I: 3, style: 'foot' },
  { row: 20, I: 4, style: 'stone' },
  { row: 20, I: 5, style: 'sky' },
  { row: 22, I: 1, style: 'stone' },
  { row: 22, I: 2, style: 'foot' },
  { row: 22, I: 3, style: 'sky' },
  { row: 22, I: 4, style: 'tall' },
  { row: 22, I: 5, style: 'foot' },
];

/** Half the width of each street-level style, along the canal. */
export const BRIDGE_HALF: Record<Exclude<CanalStyle, 'sky'>, number> = {
  tall: 2.2,
  stone: 3,
  foot: 1.2,
  grand: 4,
};

/**
 * The underside of a street-level bridge at dz across the canal from its middle (|dz| ≤ CANAL_HALF):
 * an arch, highest at the middle, curving down to the canal's walls.
 */
export function archUnder(style: Exclude<CanalStyle, 'sky'>, dz: number): number {
  const u = Math.min(1, Math.abs(dz) / (style === 'foot' ? CANAL_HALF + 2.6 : CANAL_HALF));
  if (style === 'foot') return G - 0.75 + 3.4 * (1 - u * u);
  const spring = style === 'stone' ? G - 6 : WATER_Y + 0.6;
  const crown = style === 'stone' ? G + 1.6 : style === 'grand' ? G - 0.4 : G - 0.6;
  const p = style === 'stone' ? 2 : 2.4;
  return spring + (crown - spring) * (1 - u ** p) ** (1 / p);
}

/** The heights the sky bridges may cross the canal streets at. */
export const CANAL_SKY = [44, 62, 84];

const sets = new Map<string, StrokeSet>();

/** A street-level bridge's strokes, built once at (x, zc). */
function lowSet(B: CanalBridge, x: number, zc: number): StrokeSet {
  const key = `${B.style} ${x} ${zc}`;
  const had = sets.get(key);
  if (had) return had;
  const style = B.style as Exclude<CanalStyle, 'sky'>;
  const hw = BRIDGE_HALF[style];
  const W = CANAL_HALF;
  const S = new Strokes(0.35);
  const P = (side: number, dz: number, y: number): Vec3 => [x + side, y, zc + dz];
  const faces = [-hw, hw];
  // The deck's height across it.
  const deckW = style === 'foot' ? W + 2.6 : style === 'stone' ? W + 6 : W + 3;
  const deck = (dz: number) => {
    const u = Math.min(1, Math.abs(dz) / deckW);
    if (style === 'foot') return G - 0.4 + 3.4 * (1 - u * u);
    if (style === 'stone')
      return Math.abs(dz) < W + 4.5 ? G + 3 : G + 3 * (1 - (Math.abs(dz) - W - 4.5) / 1.5);
    if (style === 'grand') return G + 0.5 + 2.5 * (1 - u * u);
    return G + 0.3 + 1.9 * (1 - u * u);
  };
  for (const f of faces) {
    // Its arch under the deck, curving up from the walls to the crown.
    S.curve((u) => P(f, -W + 2 * W * u, archUnder(style, -W + 2 * W * u)), 24, 0, 0.32);
    // The deck, and a parapet or handrail over it.
    S.curve((u) => P(f, -deckW + 2 * deckW * u, deck(-deckW + 2 * deckW * u)), 24, 0, 0.26);
    S.curve((u) => P(f, -deckW + 2 * deckW * u, deck(-deckW + 2 * deckW * u) + 1.05), 24, 2, 0.16);
  }
  if (style === 'foot') {
    // Slender: its underside is its deck's own curve, a hair under it; balusters to the rail.
    for (const f of faces) {
      S.curve(
        (u) => P(f, -deckW + 2 * deckW * u, deck(-deckW + 2 * deckW * u) - 0.35),
        24,
        0,
        0.18,
      );
      for (let dz = -deckW + 0.6; dz < deckW; dz += 0.9)
        S.line(P(f, dz, deck(dz)), P(f, dz, deck(dz) + 1.05), 2, 0.08, 0.3);
    }
  } else {
    // Spandrels between the arch and the deck, and the voussoirs' ticks round the arch.
    for (const f of faces) {
      for (let dz = -W + 0.6; dz < W; dz += 0.9) {
        const a = archUnder(style, dz);
        const d = deck(dz);
        if (d - a > 0.5) S.line(P(f, dz, a + 0.15), P(f, dz, d - 0.1), 2, 0.07, 0.4);
      }
    }
    // Across under the crown: the arch's ring seen from the canal.
    for (let s = -hw; s <= hw; s += 0.7) S.dot(P(s, 0, archUnder(style, 0)), 1, 0.22);
  }
  if (style === 'stone') {
    // Two little side arches over the quays, and the piers at the canal walls.
    for (const f of faces)
      for (const sgn of [-1, 1]) {
        const c = sgn * (W + 2.5);
        S.curve(
          (u) => P(f, c - 2.1 * Math.cos(Math.PI * u), G + 2.1 * Math.sin(Math.PI * u)),
          12,
          0,
          0.26,
        );
        S.line(P(f, sgn * W, G - 6), P(f, sgn * W, WATER_Y + 0.3), 0, 0.2);
      }
  }
  if (style === 'grand') {
    // The gallery on top: an arcade of columns and round arches along both faces, a roof ridge.
    const top = deck(0) + 5.4;
    for (const f of faces) {
      const cols: number[] = [];
      for (let dz = -W - 1.5; dz <= W + 1.5 + 1e-6; dz += 2) cols.push(dz);
      for (const dz of cols) S.line(P(f, dz, deck(dz)), P(f, dz, deck(0) + 3.6), 0, 0.22);
      for (let i = 1; i < cols.length; i++) {
        const a = cols[i - 1] as number;
        const b = cols[i] as number;
        S.curve(
          (u) =>
            P(
              f,
              (a + b) / 2 - ((b - a) / 2) * Math.cos(Math.PI * u),
              deck(0) + 3.6 + 0.9 * Math.sin(Math.PI * u),
            ),
          8,
          1,
          0.3,
        );
      }
      S.line(P(f, -W - 1.5, deck(0) + 4.6), P(f, W + 1.5, deck(0) + 4.6), 0, 0.22);
    }
    S.line(P(0, -W - 1.5, top), P(0, W + 1.5, top), 1, 0.3);
    for (const f of faces) {
      S.line(P(f, -W - 1.5, deck(0) + 4.6), P(0, -W - 1.5, top), 0, 0.2);
      S.line(P(f, W + 1.5, deck(0) + 4.6), P(0, W + 1.5, top), 0, 0.2);
    }
  }
  // Lamps at its ends.
  for (const f of faces)
    for (const sgn of [-1, 1])
      S.dot(P(f, sgn * (deckW - 0.4), deck(sgn * (deckW - 0.4)) + 1.6), 1, 0.6);
  const built = S.build();
  if (sets.size > 400) sets.clear();
  sets.set(key, built);
  return built;
}

/**
 * A sky bridge across the canal street, for bridge B in the tile whose first block is (I0, J0): its
 * deck from za to zb at x, its height; null where no pair of towers carries one.
 */
export function canalSky(
  B: CanalBridge,
  towerAt: TowerAt,
  I0 = 0,
  J0 = 0,
): { x: number; za: number; zb: number; y: number } | null {
  const A = towerAt(I0 + B.I, J0 + B.row - 1);
  const C2 = towerAt(I0 + B.I, J0 + B.row);
  // From plain towers or the Canals' own tall buildings (lib/city-alive.ts canalDesign).
  const ok = (tw: AliveBlock) => tw.shape === 'box' || tw.shape === 'design';
  if (!ok(A) || !ok(C2)) return null;
  const lo = Math.max(A.x - A.hx, C2.x - C2.hx);
  const hi = Math.min(A.x + A.hx, C2.x + C2.hx);
  if (hi - lo < 3) return null;
  const top = Math.min(A.h, C2.h) - 4;
  const ys = CANAL_SKY.filter((y) => y <= top && laneFree(y - 5) && laneFree(y + 1.2));
  if (!ys.length) return null;
  const y = ys[(B.I + B.row) % ys.length] as number;
  return { x: (lo + hi) / 2, za: A.z + A.hz, zb: C2.z - C2.hz, y: G + y };
}

function skySet(x: number, za: number, zb: number, y: number): StrokeSet {
  const key = `sky ${x} ${za} ${zb} ${y}`;
  const had = sets.get(key);
  if (had) return had;
  const S = new Strokes(0.4);
  const len = zb - za;
  for (const f of [-1.3, 1.3]) {
    S.line([x + f, y, za], [x + f, y, zb], 0, 0.28);
    S.line([x + f, y + 1.1, za], [x + f, y + 1.1, zb], 2, 0.16);
    // The arch under it, from low on the walls up to just under its middle.
    S.curve(
      (u) => [x + f, y - 0.6 - 4.4 * (1 - Math.sin(Math.PI * u)) ** 1.6, za + len * u],
      20,
      0,
      0.3,
    );
    for (let s = 1; s < len; s += 1.2) {
      const u = s / len;
      S.line(
        [x + f, y - 0.6 - 4.4 * (1 - Math.sin(Math.PI * u)) ** 1.6 + 0.1, za + s],
        [x + f, y - 0.1, za + s],
        2,
        0.06,
        0.4,
      );
    }
  }
  for (let s = 1.5; s < len; s += 3) S.dot([x, y + 0.1, za + s], 1, 0.55);
  const built = S.build();
  sets.set(key, built);
  return built;
}

/** The canal bridges within sight. */
export function canalBridgeItems(
  eye: Vec3,
  t: number,
  R: number,
  towerAt: TowerAt,
  ahead: Ahead,
  out: Item[],
) {
  const ox0 = nearest(0, eye[0], TILE_X);
  CANAL_BRIDGES.forEach((B, bi) => {
    const lx = (B.I + 0.5) * BLOCK_X;
    const lz = B.row * BLOCK_Z;
    const x = ox0 + lx;
    if (Math.abs(x - eye[0]) > R) return;
    const z = nearest(lz, eye[2], TILE_Z);
    if (Math.abs(z - eye[2]) > R || !ahead(x, z, 14)) return;
    let ox = ox0;
    let oz = z - lz;
    let S: StrokeSet;
    if (B.style === 'sky') {
      const k = canalSky(B, towerAt, Math.round(ox / BLOCK_X), Math.round(oz / BLOCK_Z));
      if (!k) return;
      S = skySet(k.x, k.za, k.zb, k.y);
      ox = 0;
      oz = 0;
    } else S = lowSet(B, lx, lz);
    const it = strokeItem(
      S,
      ox,
      oz,
      quarterTones('canals', t, bi),
      1,
      eye,
      t,
      mixId(bi + 71, Math.round(oz)),
      2,
      0.18,
    );
    if (it.d < R) out.push(it);
  });
}
