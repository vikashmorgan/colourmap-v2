/*
 * The City of Dreams' map (docs/specs/art-city.md, "Ships, cockpits and the map"): a simplified
 * plan of one tile of the city, from the game's own plan data (lib/city-game.ts, lib/city-race.ts,
 * lib/city-metro.ts), drawn flat as a 2D plan or tilted into 3D blocks you can spin. Pure data and
 * a Canvas 2D drawing; no three.js, no React.
 *
 * 2026-11-12: "add a cool 2d city map that can turn into 3d city map that u can spin in air to
 * see (M for map) or in menu for those on the phone. can be a bit simplified so it doesn't show
 * full city in detail but captures the map etc..."
 *
 * Simplified on purpose: one block per plot of the plan (its tower's footprint and height), the
 * districts as patches of their colour, the main roads in gold and the side streets faint, the
 * landmarks and race starts named, the metro's loop and its stations, the portals, and your ship.
 */

import type { RGB, Vec3 } from './bigbang';
import { CANYON_PATH } from './city-canyon';
import { DOCKS, LOUNGES, placeDock } from './city-docks';
import { EMBASSIES, embassyCentre } from './city-embassy';
import {
  BAND_ROWS,
  BANDS,
  blockTower,
  DISTRICTS,
  type DistrictId,
  LANDMARKS,
  type Landmark,
  PORTALS,
} from './city-game';
import {
  AVENUE,
  BLOCK_X,
  BLOCK_Z,
  GROUND,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { RAIL, STATIONS } from './city-metro';
import { TRACKS } from './city-race';
import { OPENING } from './city-signs';
import { parcoursLine, skyPlaces } from './city-skyport';
import { DEEP_MOUTHS, tunnelLines } from './city-under';

/* ---------- the data ---------- */

export type MapDistrict = {
  id: DistrictId;
  name: string;
  colour: RGB;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
};
export type MapBlock = {
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Its height over the street, 0 for a park or plaza. */
  h: number;
  d: DistrictId;
  shape: 'box' | 'pyramid' | 'flat';
};
export type MapRoad = { x0: number; z0: number; x1: number; z1: number; main: boolean };
export type MapPlace = {
  kind:
    | 'landmark'
    | 'race'
    | 'station'
    | 'portal'
    | 'welcome'
    | 'dock'
    | 'embassy'
    | 'canyon'
    | 'sky'
    | 'parcours';
  name: string;
  x: number;
  z: number;
  /** Its height over the street, where it stands in the 3D map. */
  y: number;
  colour: RGB;
  /** Where a tap on it travels, when not to a spot near (x, z) (a flying station, the parcours). */
  go?: MapGo;
};
export type MapData = {
  width: number;
  length: number;
  districts: MapDistrict[];
  blocks: MapBlock[];
  roads: MapRoad[];
  places: MapPlace[];
  /** The metro's loop, tile-local (x, z), every few metres. */
  metro: [number, number][];
  /** The tunnels (the Deep Line under the street, the one through a row of towers), as lines. */
  tunnels?: [number, number][][];
  /** The Neon Canyon's middle line (lib/city-canyon.ts), tile-local. */
  canyon?: [number, number][];
  /** The ring parcours' curve (lib/city-rings.ts): x, z and its height in the 3D map. */
  parcours?: [number, number, number][];
};

const LANDMARK_NAMES: Record<Landmark['kind'], string> = {
  pagoda: 'Pagoda of nine roofs',
  race: 'Race plaza',
  shikhara: 'Temple of the curved spire',
  mosque: 'Mosque of the four minarets',
  spire: 'Golden spire',
  studio: 'Studio',
  pyramid: 'Great pyramid',
  nova: 'Nova Core of the Heights',
  dataspire: 'Data spire',
};
const STUDIO_NAMES = { temples: 'Ziggurat', factories: 'Foundry', domes: 'Garden of domes' };
const LANDMARK_Y: Partial<Record<Landmark['kind'], number>> = {
  spire: 190,
  pyramid: 40,
  dataspire: 162,
};

export const landmarkName = (l: Landmark) =>
  l.kind === 'studio' && l.set ? STUDIO_NAMES[l.set] : LANDMARK_NAMES[l.kind];

/**
 * More places for the map, added by other parts of the city as they come (docks, embassies): each
 * shows as a named dot. Kept here so a new part only appends, never edits the map.
 */
export const MAP_EXTRAS: MapPlace[] = [];

/**
 * The docks' pads (lib/city-docks.ts) and the Embassies of Happiness (lib/city-embassy.ts) as
 * places: an H in a ring for a pad, a small triangle for an embassy (2026-11-13).
 */
export function dockAndEmbassyPlaces(): MapPlace[] {
  const out: MapPlace[] = [];
  DOCKS.forEach((d, i) => {
    const pad = placeDock(i, d.at).pad;
    const [x, z] = tileLocal(pad[0], pad[2]);
    const e = EMBASSIES[i - LOUNGES.length];
    out.push({
      kind: 'dock',
      name: e ? `${e.design} pad` : d.name,
      x,
      z,
      y: d.at[1] - GROUND,
      colour: d.hues[0],
    });
  });
  for (const e of EMBASSIES) {
    const [x, z] = embassyCentre(e);
    out.push({ kind: 'embassy', name: `${e.design} embassy`, x, z, y: e.h, colour: e.hues[0] });
  }
  return out;
}

let cached: MapData | null = null;
/** How many places the plan itself gives, before MAP_EXTRAS. */
let basePlaces = -1;

/** The map's data for one tile of the plan: the same every time. */
export function cityMapData(): MapData {
  if (cached && cached.places.length === basePlaces + MAP_EXTRAS.length) return cached;
  const districts: MapDistrict[] = [];
  BANDS.forEach(([left, right], band) => {
    const z0 = band * BAND_ROWS * BLOCK_Z;
    const z1 = z0 + BAND_ROWS * BLOCK_Z;
    if (left === right) {
      const d = DISTRICTS[left];
      districts.push({
        id: left,
        name: d.name,
        colour: d.colour,
        x0: -TILE_X / 2,
        x1: TILE_X / 2,
        z0,
        z1,
      });
      return;
    }
    for (const [id, x0, x1] of [
      [left, -TILE_X / 2, -AVENUE],
      [right, AVENUE, TILE_X / 2],
    ] as [DistrictId, number, number][]) {
      const d = DISTRICTS[id];
      districts.push({ id, name: d.name, colour: d.colour, x0, x1, z0, z1 });
    }
  });

  const blocks: MapBlock[] = [];
  for (let J = 0; J < TILE_J; J++) {
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++) {
      const tw = blockTower(I, J);
      blocks.push({
        x: tw.x,
        z: tw.z,
        hx: tw.hx,
        hz: tw.hz,
        h:
          tw.shape === 'box' ||
          tw.shape === 'code' ||
          tw.shape === 'pyramid' ||
          tw.shape === 'design'
            ? tw.h
            : 0,
        d: tw.d,
        shape:
          tw.shape === 'box' || tw.shape === 'code' || tw.shape === 'design'
            ? 'box'
            : tw.shape === 'pyramid'
              ? 'pyramid'
              : 'flat',
      });
    }
  }

  const roads: MapRoad[] = [];
  // The avenue's two edges, the tile's edges along, and every band's edge across: the main roads.
  for (const x of [-AVENUE, AVENUE, -TILE_X / 2, TILE_X / 2])
    roads.push({ x0: x, z0: 0, x1: x, z1: TILE_Z, main: true });
  for (let b = 0; b <= BANDS.length; b++) {
    const z = b * BAND_ROWS * BLOCK_Z;
    roads.push({ x0: -TILE_X / 2, z0: z, x1: TILE_X / 2, z1: z, main: true });
  }
  // The side streets, faint: every block's edge along and across.
  for (let I = -TILE_I / 2 + 1; I < TILE_I / 2; I++) {
    if (I === 0) continue;
    roads.push({ x0: I * BLOCK_X, z0: 0, x1: I * BLOCK_X, z1: TILE_Z, main: false });
  }
  for (let J = 1; J < TILE_J; J++) {
    if (J % BAND_ROWS === 0) continue;
    roads.push({ x0: -TILE_X / 2, z0: J * BLOCK_Z, x1: TILE_X / 2, z1: J * BLOCK_Z, main: false });
  }

  const places: MapPlace[] = [];
  for (const l of LANDMARKS) {
    places.push({
      kind: 'landmark',
      name: landmarkName(l),
      x: l.x,
      z: l.z,
      y: LANDMARK_Y[l.kind] ?? 24,
      colour: DISTRICTS[l.d].colour,
    });
  }
  for (const t of TRACKS) {
    places.push({
      kind: 'race',
      name: t.name,
      x: t.start[0],
      z: t.start[2],
      y: t.start[1] - GROUND,
      colour: DISTRICTS[t.district].colour,
    });
  }
  STATIONS.forEach((s, n) => {
    const i = Math.floor((s / RAIL.length) * RAIL.n) * 3;
    places.push({
      kind: 'station',
      name: `Metro ${n + 1}`,
      x: RAIL.pos[i] as number,
      z: RAIL.pos[i + 2] as number,
      y: (RAIL.pos[i + 1] as number) - GROUND,
      colour: [1, 0.8, 0.52],
    });
  });
  for (const p of PORTALS) {
    places.push({
      kind: 'portal',
      name: 'Portal',
      x: 0,
      z: p.z,
      y: p.y - GROUND,
      colour: [0.6, 0.4, 1],
    });
  }
  for (const m of DEEP_MOUTHS)
    places.push({ kind: 'portal', name: m.name, x: m.x, z: m.z, y: 0, colour: [0.22, 0.92, 1] });
  // The Neon Canyon, named at the middle of its long run.
  const [cx0, cz0] = CANYON_PATH[2] as [number, number];
  const [, cz1] = CANYON_PATH[3] as [number, number];
  places.push({
    kind: 'canyon',
    name: 'Neon Canyon',
    x: cx0,
    z: (cz0 + cz1) / 2,
    y: 0,
    colour: [1, 0.28, 0.78],
  });
  places.push({
    kind: 'welcome',
    name: 'Welcome to the City of Dreams',
    x: 0,
    z: OPENING.welcome,
    y: 30,
    colour: [1, 0.74, 0.3],
  });
  // The fifteen flying stations and the parcours' start (lib/city-skyport.ts, 2026-11-14).
  places.push(...skyPlaces());
  basePlaces = places.length;
  places.push(...MAP_EXTRAS);

  const metro: [number, number][] = [];
  for (let s = 0; s < RAIL.n; s += 12)
    metro.push([RAIL.pos[s * 3] as number, RAIL.pos[s * 3 + 2] as number]);

  cached = {
    width: TILE_X,
    length: TILE_Z,
    districts,
    blocks,
    roads,
    places,
    metro,
    tunnels: tunnelLines(),
    canyon: CANYON_PATH.map(([x, z]) => [x, z]),
    parcours: parcoursLine(),
  };
  return cached;
}

/** A point of the endless city brought into the tile the map shows: x across the avenue, z along. */
export const tileLocal = (x: number, z: number): [number, number] => [
  wrap(x + TILE_X / 2, TILE_X) - TILE_X / 2,
  wrap(z, TILE_Z),
];
// Filled once tileLocal is defined: the docks and embassies join the plan's places.
MAP_EXTRAS.push(...dockAndEmbassyPlaces());

/** Your ship's heading on the map, radians: 0 up the avenue (-z), round to the right. */
export const mapHeading = (f: Vec3) => Math.atan2(f[0], -f[2]);

/* ---------- the view: flat, or tilted and spun ---------- */

/**
 * How the map is seen: `tilt` 0 straight down (2D) up to about 1.2 (3D, seen from the side),
 * `yaw` its turn on the table, `zoom` and the point it centres on (`cx`, `cz`, tile-local);
 * `ox`, `oy` shift the picture on the screen (px), so a tilted city sits in the middle.
 */
export type MapView = {
  tilt: number;
  yaw: number;
  zoom: number;
  cx: number;
  cz: number;
  ox?: number;
  oy?: number;
};
export const TILT_3D = 0.9;
export const TILT_MAX = 1.25;
export const ZOOM_RANGE: [number, number] = [0.6, 12];

/** The view that fits the whole tile on a screen w × h: the long way up a tall screen, across a wide one. */
export function fitView(w: number, h: number, tilt = 0): MapView {
  return { tilt, yaw: w > h ? -Math.PI / 2 : 0, zoom: 1, cx: 0, cz: TILE_Z / 2 };
}

/** A view kept within its limits. */
export function clampMapView(v: MapView): MapView {
  return {
    tilt: Math.max(0, Math.min(TILT_MAX, v.tilt)),
    yaw: v.yaw,
    zoom: Math.max(ZOOM_RANGE[0], Math.min(ZOOM_RANGE[1], v.zoom)),
    cx: Math.max(-TILE_X / 2, Math.min(TILE_X / 2, v.cx)),
    cz: Math.max(0, Math.min(TILE_Z, v.cz)),
    ox: v.ox ?? 0,
    oy: v.oy ?? 0,
  };
}

/** The share of the screen the 3D city fills, the long way it can. */
export const FIT_SHARE = 0.8;

/** The screen box round the whole tile (its ground and its tall towers) seen in view v. */
export function projectedBounds(v: MapView, w: number, h: number) {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const x of [-TILE_X / 2, TILE_X / 2]) {
    for (const z of [0, TILE_Z]) {
      for (const y of [0, 100]) {
        const [sx, sy] = projectMap(v, w, h, x, y, z);
        x0 = Math.min(x0, sx);
        x1 = Math.max(x1, sx);
        y0 = Math.min(y0, sy);
        y1 = Math.max(y1, sy);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/** View v zoomed and shifted so the tile's projected box fills `share` of w × h, centred. */
export function frameView(v: MapView, w: number, h: number, share = FIT_SHARE): MapView {
  let out: MapView = { ...v, ox: 0, oy: 0 };
  // Perspective makes the box grow a little faster than the zoom: a few rounds settle it.
  for (let n = 0; n < 4; n++) {
    const b = projectedBounds(out, w, h);
    const k = Math.min((share * w) / (b.x1 - b.x0 || 1), (share * h) / (b.y1 - b.y0 || 1));
    out = { ...out, zoom: out.zoom * k };
  }
  const b = projectedBounds(out, w, h);
  return { ...out, ox: w / 2 - (b.x0 + b.x1) / 2, oy: h / 2 - (b.y0 + b.y1) / 2 };
}

/**
 * The 3D view a screen w × h opens on: tilted at a pleasant oblique angle, the city turned a little
 * off its long axis (whichever turn lets it fill the screen best), framed to fill FIT_SHARE of it.
 */
export function fitView3D(w: number, h: number, tilt = TILT_3D): MapView {
  const base = w > h ? -Math.PI / 2 : 0;
  let best: MapView | null = null;
  let bestScale = 0;
  for (let off = 0.3; off <= 0.91; off += 0.05) {
    const v = frameView({ tilt, yaw: base + off, zoom: 1, cx: 0, cz: TILE_Z / 2 }, w, h);
    // Compared by metres to the pixel: the zoom alone is relative to each turn's own flat fit.
    const scale = mapScale(v, w, h);
    if (scale > bestScale + 1e-9) {
      bestScale = scale;
      best = v;
    }
  }
  return best as MapView;
}

/** How many pixels a metre is, the whole tile fitting w × h at zoom 1. */
export function mapScale(v: MapView, w: number, h: number): number {
  const across = Math.abs(Math.cos(v.yaw)) * TILE_X + Math.abs(Math.sin(v.yaw)) * TILE_Z;
  const along = Math.abs(Math.sin(v.yaw)) * TILE_X + Math.abs(Math.cos(v.yaw)) * TILE_Z;
  return Math.min((w * 0.86) / across, (h * 0.84) / along) * v.zoom;
}

/** Heights in the 3D map, a little taller than life so the districts' silhouettes read. */
export const HEIGHT_K = 1.6;

/**
 * Where a point of the tile (x, z, `y` over the street) falls on a screen w × h: [sx, sy, depth],
 * the depth growing toward the viewer, for drawing far things first. A gentle perspective.
 */
export function projectMap(
  v: MapView,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const k = mapScale(v, w, h);
  const X = x - v.cx;
  const Z = z - v.cz;
  const c = Math.cos(v.yaw);
  const s = Math.sin(v.yaw);
  const rx = X * c - Z * s;
  const rz = X * s + Z * c;
  const Y = y * HEIGHT_K;
  const ct = Math.cos(v.tilt);
  const st = Math.sin(v.tilt);
  const sy = rz * ct - Y * st;
  const depth = rz * st + Y * ct;
  const D = (Math.max(w, h) / k) * 1.6;
  const p = D / Math.max(D * 0.2, D - depth);
  return [w / 2 + (v.ox ?? 0) + rx * k * p, h / 2 + (v.oy ?? 0) + sy * k * p, depth];
}

/* ---------- labels: none piled on another ---------- */

/** A name to write on the map, and how much it matters (0 first: districts, landmarks, races, others). */
export type MapLabel = {
  text: string;
  x: number;
  y: number;
  align: 'left' | 'center';
  /** Its font size, px. */
  size: number;
  /** Its width, px (measured, or guessed from its length). */
  w: number;
  priority: number;
  /** Nearer the viewer is larger (3D), for the order within a priority. */
  depth: number;
  alpha: number;
  colour: string;
  font: string;
  /** Where a tap on it travels (a quarter, or a place); none for your own caption. */
  go?: MapGo;
};
/**
 * Where a tap on the map travels (2026-11-14: "from map i can click to the diff spots and fast
 * travel"): a quarter's start, or a named place (tile-local, `y` over the street).
 */
export type MapGo =
  | { d: DistrictId }
  | { x: number; z: number; y: number; name: string }
  | { sky: number | 'parcours'; name: string };
export type LabelBox = { x0: number; y0: number; x1: number; y1: number };

export const labelBox = (l: MapLabel): LabelBox => {
  const x0 = l.align === 'left' ? l.x : l.x - l.w / 2;
  return { x0, y0: l.y - l.size / 2 - 2, x1: x0 + l.w, y1: l.y + l.size / 2 + 2 };
};
export const boxesOverlap = (a: LabelBox, b: LabelBox, pad = 3) =>
  a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;

/**
 * Which labels to show, greedily: by priority, then nearest first; a label is kept only if it lies
 * on the screen and touches none kept before it. The rest wait for a zoom or a hover.
 */
export function layoutLabels(labels: MapLabel[], w: number, h: number): MapLabel[] {
  const order = [...labels].sort((a, b) => a.priority - b.priority || b.depth - a.depth);
  const kept: MapLabel[] = [];
  const boxes: LabelBox[] = [];
  for (const l of order) {
    const b = labelBox(l);
    if (b.x0 < 2 || b.y0 < 2 || b.x1 > w - 2 || b.y1 > h - 2) continue;
    if (boxes.some((o) => boxesOverlap(o, b))) continue;
    kept.push(l);
    boxes.push(b);
  }
  return kept;
}

/**
 * A tap on a touch screen: a finger lifted within 8 px of where it came down (a mouse points
 * instead). Its lift shows the name under it, as a pointer coming near does (2026-11-13).
 */
export const isTap = (
  down: { x: number; y: number },
  up: { x: number; y: number },
  pointerType: string,
) => pointerType !== 'mouse' && Math.hypot(up.x - down.x, up.y - down.y) < 8;
/** A click or a tap, any pointer: lifted within 8 px of where it came down (a drag pans instead). */
export const isClick = (down: { x: number; y: number }, up: { x: number; y: number }) =>
  Math.hypot(up.x - down.x, up.y - down.y) < 8;

/** Whether screen point q lies inside the polygon pts (any convex or plain quad on the screen). */
function inside(pts: [number, number][], q: { x: number; y: number }): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i] as [number, number];
    const [xj, yj] = pts[j] as [number, number];
    if (yi > q.y !== yj > q.y && q.x < ((xj - xi) * (q.y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** How near a sky mark a tap must land to travel there, px. */
export const MARK_PICK = 9;

/**
 * What a tap at screen point q travels to (2026-11-14: "from map i can click to the diff spots and
 * fast travel"): a name shown under it (with its mark, left of a place's name), else, when `area`
 * (a mouse, which shows names by pointing), the quarter whose ground lies under it; null for none.
 */
export function mapPick(
  shown: MapLabel[],
  data: MapData,
  v: MapView,
  w: number,
  h: number,
  q: { x: number; y: number },
  area = true,
): MapGo | null {
  for (const l of shown) {
    if (!l.go) continue;
    const b = labelBox(l);
    const x0 = l.align === 'left' ? b.x0 - 16 : b.x0 - 4;
    if (q.x >= x0 && q.x <= b.x1 + 4 && q.y >= b.y0 - 3 && q.y <= b.y1 + 3) return l.go;
  }
  // A flying station's or the parcours' mark, its name shown or not (2026-11-14).
  const raised = v.tilt > 0.02;
  for (const p of data.places) {
    if (!p.go) continue;
    const [sx, sy] = projectMap(v, w, h, p.x, raised ? p.y : 0, p.z);
    if (Math.hypot(sx - q.x, sy - q.y) <= MARK_PICK) return p.go;
  }
  if (!area) return null;
  for (const d of data.districts) {
    const pts = [
      [d.x0, d.z0],
      [d.x1, d.z0],
      [d.x1, d.z1],
      [d.x0, d.z1],
    ].map(([x, z]) => projectMap(v, w, h, x as number, 0, z as number).slice(0, 2)) as [
      number,
      number,
    ][];
    if (inside(pts, q)) return { d: d.id };
  }
  return null;
}

/**
 * Your caption, "You · 52 m", always shown (2026-11-14): right of the pointer, or left of it near
 * the right edge, kept on screen; the names it touches give way to it.
 */
export function youCaption(
  q: [number, number],
  height: number,
  w: number,
  h: number,
  measure: (text: string, font: string, size: number) => number = (t, _f, size) =>
    t.length * size * 0.6,
): MapLabel {
  const text = `You · ${Math.max(0, Math.round(height))} m`;
  const size = 12;
  const font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  const tw = measure(text, font, size);
  const left = q[0] + 24 + tw > w - 4;
  return {
    text,
    x: left ? q[0] - 24 - tw : q[0] + 24,
    y: Math.max(size + 2, Math.min(h - 4, q[1])),
    align: 'left',
    size,
    w: tw,
    priority: 5,
    depth: 0,
    alpha: 0.95,
    colour: 'rgb(255,226,166)',
    font,
  };
}

/* ---------- drawing ---------- */

const rgba = (c: RGB, k: number, a: number) =>
  `rgba(${Math.round(Math.min(1, c[0] * k) * 255)},${Math.round(Math.min(1, c[1] * k) * 255)},${Math.round(Math.min(1, c[2] * k) * 255)},${a})`;
const GOLD: RGB = [1, 0.78, 0.45];
const NONE_LIT: ReadonlySet<DistrictId> = new Set();

type Face = { depth: number; pts: [number, number][]; fill: string; line?: string };

/**
 * Draws the map on a 2D canvas of w × h css pixels: the Dawn sky behind, the districts, the roads,
 * the blocks (flat or as prisms when tilted), the metro, the places and your ship (tile-local
 * `ship`, heading `heading`), the beat `t` breathing the pointer. `labels` names the districts and
 * places; `hover` brings the names near it first; the districts in `lit` (their race won) are
 * brighter, edged in gold.
 */
export function drawCityMap(
  ctx: CanvasRenderingContext2D,
  data: MapData,
  v: MapView,
  w: number,
  h: number,
  ship: { x: number; y: number; z: number; heading: number } | null,
  t: number,
  labels = true,
  hover: { x: number; y: number } | null = null,
  lit: ReadonlySet<DistrictId> = NONE_LIT,
): MapLabel[] {
  const P = (x: number, y: number, z: number) => projectMap(v, w, h, x, y, z);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, 'rgba(8,10,36,0.94)');
  sky.addColorStop(0.45, 'rgba(20,22,56,0.94)');
  sky.addColorStop(0.8, 'rgba(42,34,64,0.94)');
  sky.addColorStop(1, 'rgba(61,42,58,0.94)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const poly = (pts: [number, number][], fill: string | null, line?: string, lw = 1) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };
  const flat = (x0: number, z0: number, x1: number, z1: number, y = 0): [number, number][] =>
    [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)].map(
      (q) => [q[0], q[1]] as [number, number],
    );

  // The ground: each district a patch of its colour; a district whose race was won brighter,
  // edged in gold (2026-11-13).
  for (const d of data.districts) {
    const pts = flat(d.x0, d.z0, d.x1, d.z1);
    if (lit.has(d.id)) poly(pts, rgba(d.colour, 0.6, 0.36), rgba(GOLD, 1, 0.9), 1);
    else poly(pts, rgba(d.colour, 0.32, 0.22));
  }
  // The avenue, a pale band.
  poly(flat(-AVENUE, 0, AVENUE, data.length), 'rgba(244,234,216,0.07)');

  // The roads: the side streets faint, the main roads in gold.
  ctx.lineCap = 'round';
  for (const r of data.roads) {
    const a = P(r.x0, 0, r.z0);
    const b = P(r.x1, 0, r.z1);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = r.main ? rgba(GOLD, 1, 0.55) : 'rgba(244,234,216,0.08)';
    ctx.lineWidth = r.main ? 1.4 : 0.6;
    ctx.stroke();
  }

  // The blocks: flat roofs in 2D, prisms when tilted, far ones first.
  const raised = v.tilt > 0.02;
  const faces: Face[] = [];
  for (const b of data.blocks) {
    const col = DISTRICTS[b.d].colour;
    if (b.shape === 'flat' || b.h <= 0) {
      const pts = flat(b.x - b.hx, b.z - b.hz, b.x + b.hx, b.z + b.hz);
      faces.push({ depth: -1e9, pts, fill: rgba(col, 0.5, 0.16), line: rgba(col, 0.8, 0.22) });
      continue;
    }
    const x0 = b.x - b.hx;
    const x1 = b.x + b.hx;
    const z0 = b.z - b.hz;
    const z1 = b.z + b.hz;
    if (!raised) {
      faces.push({
        depth: b.h,
        pts: flat(x0, z0, x1, z1),
        fill: rgba(col, 0.45 + b.h / 320, 0.5),
        line: rgba(col, 1, 0.5),
      });
      continue;
    }
    const corners: [number, number][] = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ];
    if (b.shape === 'pyramid') {
      const top = P(b.x, b.h, b.z);
      for (let e = 0; e < 4; e++) {
        const [ax, az] = corners[e] as [number, number];
        const [bx, bz] = corners[(e + 1) % 4] as [number, number];
        const A = P(ax, 0, az);
        const B = P(bx, 0, bz);
        faces.push({
          depth: (A[2] + B[2] + top[2]) / 3,
          pts: [
            [A[0], A[1]],
            [B[0], B[1]],
            [top[0], top[1]],
          ],
          fill: rgba(col, 0.55 + 0.15 * (e % 2), 0.78),
          line: rgba(GOLD, 1, 0.35),
        });
      }
      continue;
    }
    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e] as [number, number];
      const [bx, bz] = corners[(e + 1) % 4] as [number, number];
      const A = P(ax, 0, az);
      const B = P(bx, 0, bz);
      const C = P(bx, b.h, bz);
      const D = P(ax, b.h, az);
      faces.push({
        depth: (A[2] + B[2] + C[2] + D[2]) / 4,
        pts: [
          [A[0], A[1]],
          [B[0], B[1]],
          [C[0], C[1]],
          [D[0], D[1]],
        ],
        fill: rgba(col, 0.28 + 0.1 * (e % 2), 0.82),
      });
    }
    const roof = flat(x0, z0, x1, z1, b.h);
    faces.push({
      depth: P(b.x, b.h, b.z)[2] + 0.01,
      pts: roof,
      fill: rgba(col, 0.62, 0.9),
      line: rgba(col, 1.1, 0.6),
    });
  }
  faces.sort((a, b) => a.depth - b.depth);
  for (const f of faces) poly(f.pts, f.fill, f.line, 0.7);

  // The metro's loop, high over the streets, its pale rose line.
  ctx.beginPath();
  data.metro.forEach(([x, z], i) => {
    const q = P(x, raised ? 40 : 0, z);
    if (i) ctx.lineTo(q[0], q[1]);
    else ctx.moveTo(q[0], q[1]);
  });
  ctx.closePath();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(255,190,170,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // The tunnels, dashed in cyan: the Deep Line at the street (it lies under it), the through
  // tunnel at its height in the towers.
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = 'rgba(56,235,255,0.7)';
  ctx.lineWidth = 1.6;
  (data.tunnels ?? []).forEach((line, i, all) => {
    const y = raised && i === all.length - 1 ? 14 : 0;
    ctx.beginPath();
    line.forEach(([x, z], j) => {
      const q = P(x, y, z);
      if (j) ctx.lineTo(q[0], q[1]);
      else ctx.moveTo(q[0], q[1]);
    });
    ctx.stroke();
  });
  ctx.setLineDash([]);
  // The Neon Canyon: a broad soft magenta line down its street, a fine bright one in it.
  if (data.canyon) {
    for (const [width, style] of [
      [5, 'rgba(255,72,200,0.28)'],
      [1.6, 'rgba(255,140,225,0.9)'],
    ] as const) {
      ctx.beginPath();
      data.canyon.forEach(([x, z], j) => {
        const q = P(x, 0, z);
        if (j) ctx.lineTo(q[0], q[1]);
        else ctx.moveTo(q[0], q[1]);
      });
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }
  // The ring parcours high over the city: a faint dotted gold line (quiet: it never outshines the
  // roads), at its height in 3D (2026-11-14).
  if (data.parcours) {
    ctx.beginPath();
    data.parcours.forEach(([x, z, y], j) => {
      const q = P(x, raised ? y : 0, z);
      if (j) ctx.lineTo(q[0], q[1]);
      else ctx.moveTo(q[0], q[1]);
    });
    ctx.setLineDash([1, 5]);
    ctx.strokeStyle = rgba(GOLD, 1, 0.38);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The names, gathered here and written last, none piled on another: districts first, then
  // landmarks, races and the rest.
  const cands: MapLabel[] = [];
  const measure = (text: string, font: string, size: number) => {
    ctx.font = font;
    const m = ctx.measureText?.(text) as TextMetrics | undefined;
    return typeof m?.width === 'number' ? m.width : text.length * size * 0.6;
  };
  const say = (
    text: string,
    q: [number, number, number],
    align: MapLabel['align'],
    priority: number,
    colour: string,
    bold = false,
    go?: MapGo,
  ) => {
    const size = bold ? 10 : 11;
    const font = `${bold ? '600 ' : ''}${size}px ui-sans-serif, system-ui, sans-serif`;
    const x = align === 'left' ? q[0] + 9 : q[0];
    cands.push({
      text,
      x,
      y: q[1],
      align,
      size,
      w: measure(text, font, size),
      priority,
      depth: q[2],
      alpha: 1,
      colour,
      font,
      go,
    });
  };
  ctx.textBaseline = 'middle';
  if (labels) {
    for (const d of data.districts) {
      const q = P((d.x0 + d.x1) / 2, 0, (d.z0 + d.z1) / 2 - BLOCK_Z * 1.5);
      say(d.name.toUpperCase(), q, 'center', 0, rgba(d.colour, 1.1, 1), true, { d: d.id });
    }
  }

  // The places: landmarks a ringed dot, races a diamond, stations a small square, portals a ring,
  // docks an H in a ring, embassies a small triangle, flying stations a small level disc and the
  // parcours' start a small open ring.
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  for (const p of data.places) {
    const sky = p.kind === 'sky' || p.kind === 'parcours';
    const base = P(p.x, 0, p.z);
    const q = raised ? P(p.x, p.y, p.z) : base;
    if (raised && p.y > 0) {
      ctx.beginPath();
      ctx.moveTo(base[0], base[1]);
      ctx.lineTo(q[0], q[1]);
      // The sky's stems fainter: they float, nothing holds them up.
      ctx.strokeStyle = rgba(p.colour, 1, sky ? 0.12 : 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = rgba(p.colour, 1.1, 0.95);
    ctx.strokeStyle = rgba(p.colour, 1.1, 0.95);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    switch (p.kind) {
      case 'race':
        ctx.moveTo(q[0], q[1] - 5);
        ctx.lineTo(q[0] + 4, q[1]);
        ctx.lineTo(q[0], q[1] + 5);
        ctx.lineTo(q[0] - 4, q[1]);
        ctx.closePath();
        ctx.fill();
        break;
      case 'station':
        ctx.rect(q[0] - 2.5, q[1] - 2.5, 5, 5);
        ctx.fill();
        break;
      case 'portal':
        ctx.arc(q[0], q[1], 4.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'welcome':
        ctx.rect(q[0] - 7, q[1] - 1.5, 14, 3);
        ctx.fill();
        break;
      case 'canyon':
        // Its line says where it is; a small mark for its name.
        ctx.arc(q[0], q[1], 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'dock':
        ctx.arc(q[0], q[1], 4.5, 0, Math.PI * 2);
        ctx.moveTo(q[0] - 2, q[1] - 2.2);
        ctx.lineTo(q[0] - 2, q[1] + 2.2);
        ctx.moveTo(q[0] + 2, q[1] - 2.2);
        ctx.lineTo(q[0] + 2, q[1] + 2.2);
        ctx.moveTo(q[0] - 2, q[1]);
        ctx.lineTo(q[0] + 2, q[1]);
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      case 'embassy':
        ctx.moveTo(q[0], q[1] - 4.5);
        ctx.lineTo(q[0] + 4, q[1] + 3);
        ctx.lineTo(q[0] - 4, q[1] + 3);
        ctx.closePath();
        ctx.fill();
        break;
      case 'sky':
        // A flying station: a small level disc (a flat ring) round a dot, quiet.
        ctx.ellipse(q[0], q[1], 5, 2, 0, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(p.colour, 1.1, 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(q[0], q[1], 1.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'parcours':
        // The parcours' start: a small open ring, as its rings are.
        ctx.arc(q[0], q[1], 3.5, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(p.colour, 1, 0.8);
        ctx.stroke();
        break;
      default:
        ctx.arc(q[0], q[1], 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(q[0], q[1], 6.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (labels && p.kind !== 'station' && p.kind !== 'portal') {
      say(
        p.name,
        q,
        'left',
        p.kind === 'landmark' || p.kind === 'canyon' ? 1 : p.kind === 'race' ? 2 : sky ? 4 : 3,
        'rgb(244,234,216)',
        false,
        p.go ?? { x: p.x, z: p.z, y: p.y, name: p.name },
      );
    }
  }

  // In 3D the far names fade; a name near the pointer comes first, whatever it is.
  if (raised && cands.length > 1) {
    const ds = cands.map((c) => c.depth);
    const lo = Math.min(...ds);
    const span = Math.max(...ds) - lo || 1;
    for (const c of cands) c.alpha = 0.4 + 0.6 * ((c.depth - lo) / span);
  }
  if (hover) {
    for (const c of cands) {
      if (Math.hypot(c.x - (c.align === 'left' ? 9 : 0) - hover.x, c.y - hover.y) < 26)
        c.priority = -1;
    }
  }
  let shown = layoutLabels(cands, w, h);
  // Where you are, on screen, and your caption: it always shows, the names it would touch give way
  // (2026-11-14: "make it clear on the map where I am").
  const q = ship ? P(ship.x, raised ? Math.max(0, ship.y) : 0, ship.z) : null;
  const cap = ship && q && labels ? youCaption([q[0], q[1]], ship.y, w, h, measure) : null;
  if (cap) shown = shown.filter((l) => !boxesOverlap(labelBox(l), labelBox(cap)));
  for (const l of shown) {
    ctx.font = l.font;
    ctx.textAlign = l.align;
    ctx.globalAlpha = (l.priority === 0 ? 0.75 : 0.85) * l.alpha;
    ctx.fillStyle = l.colour;
    ctx.fillText(l.text, l.x, l.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';

  // You: a gold pointer the way you fly, two rings spreading slowly from it and faint lines across
  // the map through it, so the eye finds it at once. Mellow: the rings ease out, nothing flashes.
  if (ship && q) {
    const ahead = P(
      ship.x + Math.sin(ship.heading) * 10,
      raised ? Math.max(0, ship.y) : 0,
      ship.z - Math.cos(ship.heading) * 10,
    );
    const a = Math.atan2(ahead[1] - q[1], ahead[0] - q[0]);
    const k = Math.max(0.7, Math.min(1.3, Math.min(w, h) / 480));
    ctx.strokeStyle = 'rgba(255,214,150,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, q[1]);
    ctx.lineTo(w, q[1]);
    ctx.moveTo(q[0], 0);
    ctx.lineTo(q[0], h);
    ctx.stroke();
    for (const off of [0, 0.5]) {
      const u = (t / 3.2 + off) % 1;
      ctx.beginPath();
      ctx.arc(q[0], q[1], (14 + 34 * u) * k, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,214,150,${(0.5 * (1 - u) * (1 - u)).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(q[0], q[1], 15 * k, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,214,150,0.22)';
    ctx.fill();
    ctx.save();
    ctx.translate(q[0], q[1]);
    ctx.rotate(a);
    ctx.scale(1.5 * k, 1.5 * k);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fillStyle = '#ffe2a6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,24,10,0.85)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    if (cap) {
      ctx.font = cap.font;
      ctx.textAlign = cap.align;
      ctx.globalAlpha = cap.alpha;
      ctx.fillStyle = cap.colour;
      ctx.fillText(cap.text, cap.x, cap.y);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
    }
  }
  return shown;
}
