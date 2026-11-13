/*
 * The Studio's buildings in the game city (docs/specs/art-city.md, "Game design"): the twenty of
 * lib/city-buildings.ts (stair temples, the pagoda, domes and minarets, twisted, rounded and
 * faceted towers) stand in the quarters they belong to, and the Studio's temples, factories and
 * domes (lib/golden-city.ts) in theirs, all drawn as grain meshes lit by how they face your eye.
 *
 * 2026-11-13: "the core buildings of the game city are boring: improve them. use the 20 buildings
 * in the main city, in the quarters they belong to."
 *
 * Each mesh is built once in its own frame and placed by lib/city-mesh.ts at its block, scaled to
 * fit; the Ship's renderer thins it with distance like everything else, and only blocks near the
 * eye are drawn at all. Pure: no three.js, no DOM.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { BUILDING_KINDS, Kit } from './city-buildings';
import { boxDist, C, GROUND, type Item, mix, mixId, scale } from './city-grid';
import { meshSite, type Palette, type Placed } from './city-mesh';
import { DOMES, FACTORIES, building as studioBuilding, TEMPLES } from './golden-city';
import { type Built, type Hit, Mesh, Tone } from './grain-mesh';

/** The quarters (lib/city-game.ts's districts), by id: kept as strings so this file stands alone. */
type Quarter = string;

/**
 * Which of the twenty each quarter builds, and how often a block of it holds one (of the blocks
 * that are not on the avenue, a plaza or the river). Indices into BUILDING_KINDS.
 */
export const DESIGN_QUARTERS: Record<Quarter, { kinds: number[]; share: number }> = {
  chinatown: { kinds: [2], share: 0.2 },
  indian: { kinds: [3, 3, 16], share: 0.28 },
  oriental: { kinds: [4, 4, 18], share: 0.32 },
  heights: { kinds: [9, 5, 11, 19], share: 0.16 },
  canals: { kinds: [7, 15, 10, 19], share: 0.24 },
  golden: { kinds: [6, 14, 18, 16], share: 0.26 },
  temples: { kinds: [0, 17, 14], share: 0.3 },
  industrial: { kinds: [12, 15, 13], share: 0.22 },
  domes: { kinds: [6, 16, 10], share: 0.2 },
  egypt: { kinds: [1], share: 0.28 },
  market: { kinds: [9, 11, 13, 19, 12, 5], share: 0.3 },
};

/** Stair temples, pyramids and spires: held out as a tapering mass, not a box. */
const TAPERED = new Set([0, 1, 2, 3, 17]);

/** The footprint a design may fill: a circle this wide round the block's middle. */
export const DESIGN_FIT = 10.5;

/** Design `kind` on a block: its scale, the box that stands for it (for the map, the eye), its height. */
export type Design = { kind: number; sc: number; r: number; h: number; tapered: boolean };

/**
 * Whether block-number k in quarter d holds one of the twenty, and which, fitted to the block and
 * kept `ceiling` under the metro (null: a plain building there).
 */
export function designFor(d: Quarter, k: number, ceiling: number): Design | null {
  const q = DESIGN_QUARTERS[d];
  if (!q || hash(k, 470) >= q.share) return null;
  const kind = q.kinds[Math.floor(hash(k, 471) * q.kinds.length) % q.kinds.length] as number;
  const spec = BUILDING_KINDS[kind];
  if (!spec) return null;
  // As large as the block allows (the plinth's reach), up to nearly twice the Studio's size.
  let sc = Math.min(DESIGN_FIT / spec.site.r, 1.9);
  // Under the metro, lower, so the rail clears the roof.
  if (spec.height * sc > ceiling - 2) sc = (ceiling - 2) / spec.height;
  if (sc < 0.5) return null;
  return {
    kind,
    sc,
    r: spec.site.r * sc * 0.82,
    h: spec.height * sc * 0.92,
    tapered: TAPERED.has(kind),
  };
}

/** Whether a point is inside design `g` standing at (x, z), MARGIN `m` included. */
export function designHolds(g: Design, x: number, z: number, q: Vec3, m: number): boolean {
  const dx = Math.abs(q[0] - x);
  const dz = Math.abs(q[2] - z);
  const e = g.r + m;
  if (dx >= e || dz >= e) return false;
  if (!g.tapered) return q[1] <= GROUND + g.h + m;
  return q[1] < GROUND + m + g.h * (1 - Math.max(dx, dz) / e);
}

/* ---------- the meshes, built once ---------- */

const designMeshes = new Map<number, Built>();
/** Design `kind`'s mesh in its own frame, its foot at the street: the building without its walkways. */
export function designMesh(kind: number): Built {
  const had = designMeshes.get(kind);
  if (had) return had;
  const spec = BUILDING_KINDS[kind] ?? BUILDING_KINDS[0];
  const m = new Mesh();
  spec?.build(new Kit(m, { at: [0, GROUND, 0] }));
  const B = m.build();
  designMeshes.set(kind, B);
  return B;
}

/* ---------- colours: each quarter's own, warm lamps, never a flash ---------- */

const palettes = new Map<string, Palette>();
/** A quarter's palette for a mesh: its edges in its colour, faint faces, warm windows. */
export function quarterPalette(colour: RGB): Palette {
  const key = colour.join(',');
  const had = palettes.get(key);
  if (had) return had;
  const edge = scale(mix(colour, C.white, 0.35), 0.42);
  const face = scale(mix(colour, C.violet, 0.3), 0.11);
  const glass = scale(mix(C.cyan, colour, 0.4), 0.13);
  const p: Palette = (h: Hit, t: number) => {
    switch (h.tone) {
      case Tone.edge:
        return edge;
      case Tone.face:
        return face;
      case Tone.glass:
        return glass;
      case Tone.water:
        return scale(C.cyan, 0.22 + 0.06 * Math.sin(t * 0.6 + h.pos[0]));
      case Tone.plant:
        return scale(C.leaf, 0.3);
      case Tone.fire:
        return scale(C.amber, 0.4 + 0.08 * Math.sin(t * 0.5 + h.key));
      case Tone.light: {
        // Windows and lamps: most warm, a few cool, each its own slow breath.
        const w = hash(Math.round(h.pos[1] * 3 + h.pos[0] * 7 + h.pos[2] * 5), 5);
        const g = 0.85 + 0.15 * Math.sin(t * 0.3 + w * 20);
        return scale(w < 0.75 ? C.warm : mix(C.white, colour, 0.3), 0.46 * g);
      }
      case Tone.ground:
        return scale(colour, 0.1);
      case Tone.road:
        return scale(mix(C.gold, colour, 0.3), 0.3);
      case Tone.steam:
        return scale(C.white, 0.14);
      default:
        return scale(colour, 0.22);
    }
  };
  palettes.set(key, p);
  return p;
}
const SHARES = { lines: 0.55, faces: 0.76 };

/** A design on its block, for the Ship's renderer. */
export function designItem(
  g: Design,
  at: { x: number; z: number; k: number },
  colour: RGB,
  eye: Vec3,
  t: number,
): Item {
  const P: Placed = {
    B: designMesh(g.kind),
    at: [at.x, GROUND, at.z],
    sc: g.sc,
    shares: SHARES,
    palette: quarterPalette(colour),
  };
  const top = GROUND + g.h;
  return {
    d: boxDist(eye, [at.x - g.r, GROUND, at.z - g.r], [at.x + g.r, top + 4, at.z + g.r]),
    gid: mixId(at.k, 5151),
    count: Math.min(4000, Math.round(1300 + g.h * 32)),
    weight: 1.3,
    probe: [
      [at.x, top, at.z],
      [at.x + g.r, GROUND + g.h * 0.4, at.z + g.r],
      [at.x - g.r, GROUND + g.h * 0.4, at.z - g.r],
      [at.x, GROUND + 3, at.z],
    ],
    site: (s, o) => meshSite(P, s, t, eye, 1, o),
  };
}

/* ---------- the Studio's temples, factories and domes ---------- */

const SETS = { temples: TEMPLES, factories: FACTORIES, domes: DOMES };
export type StudioSet = keyof typeof SETS;
const SET_COLOURS: Record<StudioSet, RGB> = {
  temples: mix(C.ivory, C.gold, 0.35),
  factories: mix(C.steel, C.amber, 0.3),
  domes: mix(C.leaf, C.turquoise, 0.3),
};

/**
 * One of the Studio's temples, factories or domes (lib/golden-city.ts, read only) on a block or a
 * plaza, scaled by sc, lit from your own eye in its quarter's colours.
 */
export function studioItem(
  set: StudioSet,
  i: number,
  at: { x: number; z: number; key: number },
  sc: number,
  count: number,
  eye: Vec3,
  t: number,
): Item {
  const B = studioBuilding(SETS[set], i);
  const P: Placed = {
    B,
    at: [at.x, GROUND, at.z],
    sc,
    shares: { lines: 0.5, faces: 0.74 },
    palette: quarterPalette(SET_COLOURS[set]),
  };
  const r = 14 * sc;
  const h = 18 * sc;
  return {
    d: boxDist(eye, [at.x - r, GROUND, at.z - r], [at.x + r, GROUND + h, at.z + r]),
    gid: mixId(at.key, 4321),
    count,
    weight: 1.4,
    probe: [
      [at.x, GROUND + h * 0.5, at.z],
      [at.x, GROUND + 2, at.z + r * 0.7],
      [at.x + r * 0.7, GROUND + 2, at.z],
    ],
    site: (s, o) => meshSite(P, s, t, eye, 1, o),
  };
}
