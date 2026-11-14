/*
 * Big temples, big domes and Nova Cores through the City (docs/specs/art-city.md, "Taller
 * landmarks and fireworks"), and the Studio's buildings on the quarters' blocks drawn much bigger.
 * Pure: no three.js, no DOM.
 *
 * 2026-11-14: "BIG TEMPLES. BIG DOMES. AND NOVA CORES IN THE CITY." and "ALL THE COOL BUILDINGS
 * SERIES MUST BE MUCH BIGGER."
 *
 * Ten open squares, each the four blocks round a crossing in the landmarks' columns, halfway
 * between two landmarks, hold one of the Studio's temples or domes or a Nova Core, stretched
 * upward to five to seven times their height (and half as wide again), in their quarter's colour.
 * No two of a kind are neighbours along a column or across the avenue. All of them are light, as
 * the Studio's other additions are: the Ship flies through them, and they stand well off the
 * avenue, so the autopilot's route and the race courses are untouched.
 */

import { makeParticles, type Particle, type RGB, type Vec3 } from './bigbang';
import { BUILDING_SPOTS, newBuildingItems } from './city-buildings-15';
import { quarterPalette } from './city-designs';
import {
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  GROUND,
  type Item,
  mixId,
  nearest,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { MESH_GRAINS, type Palette } from './city-mesh';
import { DOMES, FACTORIES, building as studioBuilding, TEMPLES } from './golden-city';
import { type Built, onMesh } from './grain-mesh';
import { novaCore } from './nova-cores';

export type BigKind = 'temple' | 'dome' | 'nova';
export type BigSquare = { kind: BigKind; x: number; z: number; i: number };

const SQ = (kind: BigKind, side: -1 | 1, row: number, i = 0): BigSquare => ({
  kind,
  x: side * 3 * BLOCK_X,
  z: row * BLOCK_Z,
  i,
});
/**
 * The big squares, tile-local: their crossings, left (x −78) and right (x 78) of the avenue, on the
 * rows between the landmarks (the Code quarter's two on row 50, clear of the metro and the through
 * tunnel).
 */
export const BIG_SQUARES: BigSquare[] = [
  SQ('nova', -1, 8),
  SQ('dome', -1, 16, 0),
  SQ('temple', -1, 32, 0),
  SQ('dome', -1, 40, 2),
  SQ('nova', -1, 50),
  SQ('temple', 1, 8, 2),
  SQ('nova', 1, 16),
  SQ('nova', 1, 32),
  SQ('temple', 1, 40, 4),
  SQ('dome', 1, 50, 1),
];

/** How each kind is stretched: across (sh) and up (sv), from its Studio size. */
export const BIG_STRETCH: Record<BigKind, { sh: number; sv: number }> = {
  temple: { sh: 1.5, sv: 5.5 },
  dome: { sh: 1.5, sv: 7 },
  nova: { sh: 0.6, sv: 6 },
};
/** The Studio's buildings on the quarters' blocks: much bigger than the 0.72 they stood at. */
export const BLOCK_STRETCH = { sh: 0.8, sv: 3.6 };

const tileCol = (I: number) => wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
const tileRow = (J: number) => wrap(J, TILE_J);

/**
 * Whether block (I, J) is kept open (no tower: a 'plaza' in lib/city-game.ts): one of the four
 * round a big square's crossing, or a block one of the fifteen new buildings stands on.
 */
export function openBlock(I: number, J: number): boolean {
  const li = tileCol(I);
  const lj = tileRow(J);
  for (const q of BIG_SQUARES) {
    const ci = Math.round(q.x / BLOCK_X);
    const cj = Math.round(q.z / BLOCK_Z);
    if ((li === ci - 1 || li === ci) && (lj === cj - 1 || lj === cj)) return true;
  }
  return BUILDING_SPOTS.some((b) => b.I === li && b.J === lj);
}

/* ---------- meshes, stretched ---------- */

const GRAINS: Particle[] = makeParticles(MESH_GRAINS);
type Stretched = { B: Built; at: Vec3; sh: number; sv: number; palette: Palette; k?: number };
const SHARES = { lines: 0.55, faces: 0.74 };

/** Site s of a mesh stretched sh across and sv up, lit from the eye (as lib/city-mesh.ts lights them). */
export function stretchSite(P: Stretched, s: number, t: number, eye: Vec3, o: number[]): boolean {
  const p = GRAINS[s % MESH_GRAINS] as Particle;
  const { at, sh, sv } = P;
  const local: Vec3 = [
    (eye[0] - at[0]) / sh,
    GROUND + (eye[1] - at[1]) / sv,
    (eye[2] - at[2]) / sh,
  ];
  const h = onMesh(P.B, p, p.c, t, local, SHARES);
  o[0] = at[0] + h.pos[0] * sh;
  o[1] = at[1] + (h.pos[1] - GROUND) * sv;
  o[2] = at[2] + h.pos[2] * sh;
  const c = P.palette(h, t);
  const m = h.lit * (P.k ?? 1);
  o[3] = Math.max(0, c[0] * m);
  o[4] = Math.max(0, c[1] * m);
  o[5] = Math.max(0, c[2] * m);
  return true;
}

let coreMesh: Built | null = null;
/** The mesh a big square holds. */
export function bigMesh(q: { kind: BigKind; i: number }): Built {
  if (q.kind === 'nova') {
    if (!coreMesh) coreMesh = novaCore(1).build();
    return coreMesh;
  }
  return studioBuilding(q.kind === 'temple' ? TEMPLES : DOMES, q.i);
}

/** The Studio sizes (at scale 1): height and reach, measured from the meshes, for the map and tests. */
const STUDIO_TOP: Record<string, number[]> = {
  temple: [17.8, 13.4, 17.6, 22, 15],
  dome: [10.8, 7.9, 13.1, 7.4, 5.6],
  nova: [14.3],
  temples: [17.8, 13.4, 17.6, 22, 15],
  domes: [10.8, 7.9, 13.1, 7.4, 5.6],
  factories: [8.6, 20.6, 8.1, 20.9, 20.9],
};
/** How tall a big square's building stands. */
export const bigHeight = (q: { kind: BigKind; i: number }) =>
  (STUDIO_TOP[q.kind]?.[q.kind === 'nova' ? 0 : q.i] ?? 10) * BIG_STRETCH[q.kind].sv;

/** How tall a Studio building on a block now stands. */
export const studioBlockHeight = (st: { set: string; i: number }) =>
  (STUDIO_TOP[st.set]?.[st.i] ?? 10) * BLOCK_STRETCH.sv;

/** A stretched mesh at (x, z) as one of the Ship's items. */
function stretchedItem(
  B: Built,
  x: number,
  z: number,
  r: number,
  h: number,
  st: { sh: number; sv: number },
  colour: RGB,
  count: number,
  key: number,
  eye: Vec3,
  t: number,
  k = 1,
): Item {
  const P: Stretched = {
    k,
    B,
    at: [x, GROUND, z],
    sh: st.sh,
    sv: st.sv,
    palette: quarterPalette(colour),
  };
  return {
    d: boxDist(eye, [x - r, GROUND, z - r], [x + r, GROUND + h, z + r]),
    gid: mixId(key, 6262),
    count,
    weight: 1.5,
    probe: [
      [x, GROUND + h * 0.9, z],
      [x, GROUND + h * 0.5, z],
      [x + r * 0.7, GROUND + 3, z],
      [x, GROUND + 3, z + r * 0.7],
    ],
    site: (s, o) => stretchSite(P, s, t, eye, o),
  };
}

type Ahead = (x: number, z: number, rad: number) => boolean;

/** Every tile copy of a tile-local point within R of the eye (the plan repeats every way). */
export function copiesNear(
  x: number,
  z: number,
  eye: Vec3,
  R: number,
  at: (x: number, z: number, n: number) => void,
) {
  const ox = nearest(0, eye[0], TILE_X);
  const n0 = Math.floor((eye[2] - R - z) / TILE_Z);
  const n1 = Math.floor((eye[2] + R - z) / TILE_Z) + 1;
  for (const mx of [-1, 0, 1]) {
    const X = x + ox + mx * TILE_X;
    if (Math.abs(X - eye[0]) > R + 40) continue;
    for (let n = n0; n <= n1; n++) {
      const Z = z + n * TILE_Z;
      if (Math.abs(Z - eye[2]) > R + 40) continue;
      at(X, Z, n * 7 + mx);
    }
  }
}

/** The big squares' temples, domes and Nova Cores within sight, and the fifteen new buildings. */
export function bigItems(
  eye: Vec3,
  t: number,
  R: number,
  ahead: Ahead,
  colourAt: (x: number, z: number) => RGB,
  out: Item[],
  lift = 1,
) {
  newBuildingItems(eye, t, R, ahead, out, lift);
  BIG_SQUARES.forEach((q, qi) => {
    copiesNear(q.x, q.z, eye, R, (x, z, n) => {
      const st = BIG_STRETCH[q.kind];
      const r = (q.kind === 'nova' ? 46 : 18) * st.sh;
      const h = bigHeight(q);
      if (Math.hypot(x - eye[0], z - eye[2]) > R + r) return;
      if (!ahead(x, z, r + 10) && eye[1] < GROUND + 80) return;
      // Coloured by the quarter just past the crossing (the square straddles two).
      const colour = colourAt(x + (x > 0 ? 1 : -1), z + 1);
      out.push(stretchedItem(bigMesh(q), x, z, r, h, st, colour, 4000, mixId(qi, n), eye, t, lift));
    });
  });
}

/** The Studio's buildings on the quarters' blocks, much bigger, out to the whole view. */
export function studioBlockItems(
  eye: Vec3,
  t: number,
  R: number,
  blockAt: (
    I: number,
    J: number,
  ) => {
    x: number;
    z: number;
    k: number;
    shape: string;
    studio: { set: 'temples' | 'factories' | 'domes'; i: number } | null;
  },
  ahead: Ahead,
  colourAt: (x: number, z: number) => RGB,
  out: Item[],
) {
  const reach = Math.min(R, 420);
  const I0 = Math.floor((eye[0] - reach) / BLOCK_X);
  const I1 = Math.floor((eye[0] + reach) / BLOCK_X);
  const J0 = Math.floor((eye[2] - reach) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + reach) / BLOCK_Z);
  const st = BLOCK_STRETCH;
  for (let I = I0; I <= I1; I++) {
    for (let J = J0; J <= J1; J++) {
      const tw = blockAt(I, J);
      if (tw.shape !== 'studio' || !tw.studio) continue;
      if (!ahead(tw.x, tw.z, 20)) continue;
      const set = tw.studio.set;
      const B = studioBuilding(
        set === 'temples' ? TEMPLES : set === 'domes' ? DOMES : FACTORIES,
        tw.studio.i,
      );
      const r = 18 * st.sh;
      const h = studioBlockHeight(tw.studio);
      if (Math.hypot(tw.x - eye[0], tw.z - eye[2]) > reach + r) continue;
      out.push(stretchedItem(B, tw.x, tw.z, r, h, st, colourAt(tw.x, tw.z), 3000, tw.k, eye, t));
    }
  }
}
