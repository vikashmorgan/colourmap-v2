/*
 * The annex of the City of Dreams (docs/specs/art-city.md, "Mountain and Favela quarters"): the
 * twelve columns beside the strip on +x (lib/city-grid.ts STRIP_I, ANNEX_I), the top of the map on
 * a wide screen, holding two quarters along the tile: the Mountain quarter from the tile's start
 * to the river (lib/city-mountain.ts), the Favela past it to the tile's end (lib/city-favela.ts).
 * Pure: no three.js, no DOM.
 *
 * 2026-11-14: "add the mountain and favela above, so the city becomes more square. doesn't have to
 * be a square map yet."
 *
 * This module is the annex's few hooks into the rest of the city: which quarter a point is in,
 * the ground's height there (for the collision's `blocked`), the lit things to draw, each
 * quarter's gateway (its name over the way in, as the other quarters' gates), its start for fast
 * travel, its topographic lines for the map and its points for the far city. The annex has no
 * streets: no towers, cars or street currents are drawn there.
 */

import type { RGB, Vec3 } from './bigbang';
import { favelaFar, favelaHeight, favelaItems, HILLS, hillFoot } from './city-favela';
import {
  ANNEX_I,
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  planX,
  STRIP_X,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import {
  CABLE_STATIONS,
  CONTOUR,
  contourR,
  INDEX_EVERY,
  MOUNTAIN_Z1,
  mountainFar,
  mountainHeight,
  mountainItems,
  mountainSolid,
  PEAKS,
  rampInto,
  TEMPLES,
} from './city-mountain';
import { nameBanner, wordItem } from './city-signs';

export type AnnexDistrict = 'mountain' | 'favela';
/** The annex's width, across. */
export const ANNEX_X = ANNEX_I * BLOCK_X;
/** The Mountain quarter holds the tile's rows up to the river; the Favela the rest. */
export const MOUNTAIN_ROWS = MOUNTAIN_Z1 / BLOCK_Z;
export const annexDistrict = (row: number): AnnexDistrict =>
  row < MOUNTAIN_ROWS ? 'mountain' : 'favela';

/** A world point's place in the annex: across from the strip's edge street, and along the tile. */
export const annexLocal = (x: number, z: number): [number, number] => [
  planX(x) - STRIP_X / 2,
  wrap(z, TILE_Z),
];

/** The ground's height over the street at a world point in the annex: its peaks, or its hills and houses. */
export function annexGround(x: number, z: number): number {
  const [ax, lz] = annexLocal(x, z);
  if (ax < 0) return 0;
  return lz < MOUNTAIN_Z1 ? mountainHeight(ax, lz) : favelaHeight(ax, lz);
}

/**
 * Whether a point in the annex is inside its ground (`m` round): a peak, a temple, a cable pylon,
 * a hill and the houses on it. A cheap height field: the collision's `blocked` asks it for every
 * point in the annex.
 */
export function annexBlocked(q: Vec3, m: number): boolean {
  const [ax, lz] = annexLocal(q[0], q[2]);
  const y = q[1] - GROUND;
  // Off the slopes the street (or the river) is the floor, as everywhere (the collision's floorAt).
  if (lz < MOUNTAIN_Z1) return mountainSolid(ax, y, lz, m);
  const h = favelaHeight(ax, lz);
  return h > 0 && y < h + m;
}

/* ---------- gateways: each quarter's name over its way in ---------- */

/**
 * A gateway at the edge of each quarter, as the other quarters' gates stand at their bands'
 * edges: two glowing posts and the quarter's name between them, read from +z as you fly in up the
 * tile (yaw 0). The Mountain's stands on the river's bank, the Favela's at the tile's end.
 */
export type Gateway = { d: AnnexDistrict; text: string; x: number; z: number; rgb: RGB; rgb2: RGB };
export const GATEWAYS: Gateway[] = [
  {
    d: 'mountain',
    text: 'MOUNTAIN QUARTER',
    x: STRIP_X / 2 + 150,
    z: MOUNTAIN_Z1 - 26,
    rgb: [1, 0.94, 0.7],
    rgb2: [0.82, 0.26, 0.64],
  },
  {
    d: 'favela',
    text: 'FAVELA',
    x: STRIP_X / 2 + 270,
    z: TILE_Z - 24,
    rgb: [1, 0.6, 0.3],
    rgb2: [1, 0.45, 0.55],
  },
];
/** How high a gateway's lintel stands, and how far apart its posts. */
export const GATE_Y = 34;
export const GATE_HALF = 24;
const POST_SITES = 60;

function gatewayItems(eye: Vec3, t: number, R: number, out: Item[]): void {
  GATEWAYS.forEach((g, gi) => {
    const x = nearest(g.x, eye[0], TILE_X);
    const z = nearest(g.z, eye[2], TILE_Z);
    const d = boxDist(
      eye,
      [x - GATE_HALF, GROUND, z - 1],
      [x + GATE_HALF, GROUND + GATE_Y + 8, z + 1],
    );
    if (d > R) return;
    const banner = nameBanner({
      text: g.text,
      x,
      y: GROUND + GATE_Y,
      z,
      px: 0.5,
      maxW: 2 * GATE_HALF - 6,
      face: 'deco',
      rgb: g.rgb,
      rgb2: g.rgb2,
      key: 9900 + gi,
    });
    out.push(wordItem(banner, eye, t));
    const post = g.rgb;
    out.push({
      d,
      gid: mixId(gi, 75100),
      count: 2 * POST_SITES,
      weight: 1.6,
      site: (s, o) => {
        const side = s < POST_SITES ? -1 : 1;
        const q = s % POST_SITES;
        const a = ((q % 4) / 4) * TAU;
        const u = (Math.floor(q / 4) + 0.5) / (POST_SITES / 4);
        o[0] = x + side * GATE_HALF + Math.cos(a) * 0.6;
        o[1] = GROUND + u * (GATE_Y + 6);
        o[2] = z + Math.sin(a) * 0.6;
        const k = 0.5 * (0.9 + 0.1 * Math.sin(0.3 * t + u * 3));
        o[3] = post[0] * k;
        o[4] = post[1] * k;
        o[5] = post[2] * k;
        return true;
      },
    });
  });
}

/**
 * The annex's lit things round the eye, out to R: the Mountain quarter's, the Favela's and their
 * gateways. Each quarter only when the eye could see some of it.
 */
export function annexItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]): void {
  // How far the eye is from the annex's copy nearest it, across.
  const ax = nearest(STRIP_X / 2 + ANNEX_X / 2, eye[0], TILE_X);
  if (Math.abs(eye[0] - ax) > ANNEX_X / 2 + R) return;
  mountainItems(eye, fwd, t, R, out);
  favelaItems(eye, fwd, t, R, out);
  gatewayItems(eye, t, R, out);
}

/* ---------- fast travel ---------- */

/** A quarter's start in the annex: plan-local x, z, and the point it looks at. */
export type AnnexStart = { d: AnnexDistrict; x: number; z: number; view: [number, number] };
/**
 * The Mountain's start: on the river's bank before its gateway, looking up the valley past it,
 * the highest peak rising beside the way. The Favela's: at the tile's end beside its gateway,
 * looking up the open way past its last hills.
 */
export const ANNEX_STARTS: AnnexStart[] = (() => {
  const top = PEAKS.reduce((a, b) => (b.h > a.h ? b : a));
  const lastHill = HILLS[HILLS.length - 1] as (typeof HILLS)[number];
  return [
    {
      d: 'mountain',
      x: STRIP_X / 2 + 150,
      z: MOUNTAIN_Z1 - 10,
      // Straight up the valley between the peaks, the highest rising just to its right.
      view: [STRIP_X / 2 + 150, top.z + 92],
    },
    {
      d: 'favela',
      x: STRIP_X / 2 + 270,
      z: TILE_Z - 6,
      // Up the open way beside the last hills, their houses climbing on the left.
      view: [STRIP_X / 2 + 270, lastHill.z - 60],
    },
  ];
})();

/* ---------- the map: topographic lines and named places ---------- */

/** A closed line of the map's topography: its quarter, height over the street, points (plan-local x, z). */
export type MapContour = { d: AnnexDistrict; y: number; colour: RGB; pts: [number, number][] };

/**
 * The annex's lines for the map: each peak's index contours and every other ring between, in the
 * peak's ramp; each hill's foot and two terraces, warm.
 */
export function annexContours(): MapContour[] {
  const out: MapContour[] = [];
  const o = [0, 0, 0, 0, 0, 0];
  for (const p of PEAKS) {
    for (let lv = 1; lv * CONTOUR < p.top - 2; lv++) {
      if (lv % 2 !== 0 && lv % INDEX_EVERY !== 0) continue;
      const L = lv * CONTOUR;
      rampInto(o, L / p.top, lv % INDEX_EVERY === 0 ? 0.4 : 0, 1);
      const pts: [number, number][] = [];
      for (let s = 0; s < 40; s++) {
        const a = (s / 40) * TAU;
        const r = contourR(p, L, a);
        pts.push([STRIP_X / 2 + p.x + Math.cos(a) * r, p.z + Math.sin(a) * r]);
      }
      out.push({ d: 'mountain', y: L, colour: [o[3], o[4], o[5]] as RGB, pts });
    }
  }
  for (const p of HILLS) {
    for (const f of [0, 0.4, 0.75]) {
      const pts: [number, number][] = [];
      for (let s = 0; s < 32; s++) {
        const a = (s / 32) * TAU;
        const r = hillFoot(p, a) * Math.sqrt(1 - f);
        pts.push([STRIP_X / 2 + p.x + Math.cos(a) * r, p.z + Math.sin(a) * r]);
      }
      out.push({ d: 'favela', y: f * p.h, colour: mix(C.saffron, C.rose, f), pts });
    }
  }
  return out;
}

/** A named place of the annex for the map (lib/city-minimap.ts MapPlace). */
export type AnnexPlace = {
  kind: 'temple' | 'cable';
  name: string;
  x: number;
  z: number;
  y: number;
  colour: RGB;
};
/** The annex's named places for the map: the temples and the cable stations (plan-local). */
export function annexPlaces(): AnnexPlace[] {
  return [
    ...TEMPLES.map((T, i) => ({
      kind: 'temple' as const,
      name:
        T.kind === 'summit'
          ? `Summit temple ${Math.floor(i / 2) + 1}`
          : `Ledge temple ${i / 2 + 1}`,
      x: STRIP_X / 2 + T.x,
      z: T.z,
      y: T.y,
      colour: C.gold,
    })),
    ...CABLE_STATIONS.map((S) => ({
      kind: 'cable' as const,
      name: S.name,
      x: STRIP_X / 2 + S.x,
      z: S.z,
      y: S.head,
      colour: C.white,
    })),
  ];
}

/** The annex's points for the far city (lib/city-far.ts): its contours and its houses' glows. */
export function annexFar(
  put: (x: number, y: number, z: number, c: RGB, k: number, salt: number) => void,
  mountain: RGB,
  favela: RGB,
): void {
  mountainFar(put, mountain);
  favelaFar(put, favela);
}
