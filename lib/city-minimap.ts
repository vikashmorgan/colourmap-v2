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
  kind: 'landmark' | 'race' | 'station' | 'portal' | 'welcome';
  name: string;
  x: number;
  z: number;
  /** Its height over the street, where it stands in the 3D map. */
  y: number;
  colour: RGB;
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
};

const LANDMARK_NAMES: Record<Landmark['kind'], string> = {
  pagoda: 'Pagoda of nine roofs',
  race: 'Race plaza',
  shikhara: 'Temple of the curved spire',
  mosque: 'Mosque of the four minarets',
  spire: 'Golden spire',
  studio: 'Studio',
  pyramid: 'Great pyramid',
};
const STUDIO_NAMES = { temples: 'Ziggurat', factories: 'Foundry', domes: 'Garden of domes' };
const LANDMARK_Y: Partial<Record<Landmark['kind'], number>> = { spire: 190, pyramid: 40 };

export const landmarkName = (l: Landmark) =>
  l.kind === 'studio' && l.set ? STUDIO_NAMES[l.set] : LANDMARK_NAMES[l.kind];

/**
 * More places for the map, added by other parts of the city as they come (docks, embassies): each
 * shows as a named dot. Kept here so a new part only appends, never edits the map.
 */
export const MAP_EXTRAS: MapPlace[] = [];

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
        h: tw.shape === 'box' || tw.shape === 'pyramid' ? tw.h : 0,
        d: tw.d,
        shape: tw.shape === 'box' ? 'box' : tw.shape === 'pyramid' ? 'pyramid' : 'flat',
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
  places.push({
    kind: 'welcome',
    name: 'Welcome to the City of Dreams',
    x: 0,
    z: 0,
    y: 30,
    colour: [1, 0.74, 0.3],
  });
  basePlaces = places.length;
  places.push(...MAP_EXTRAS);

  const metro: [number, number][] = [];
  for (let s = 0; s < RAIL.n; s += 12)
    metro.push([RAIL.pos[s * 3] as number, RAIL.pos[s * 3 + 2] as number]);

  cached = { width: TILE_X, length: TILE_Z, districts, blocks, roads, places, metro };
  return cached;
}

/** A point of the endless city brought into the tile the map shows: x across the avenue, z along. */
export const tileLocal = (x: number, z: number): [number, number] => [
  wrap(x + TILE_X / 2, TILE_X) - TILE_X / 2,
  wrap(z, TILE_Z),
];

/** Your ship's heading on the map, radians: 0 up the avenue (-z), round to the right. */
export const mapHeading = (f: Vec3) => Math.atan2(f[0], -f[2]);

/* ---------- the view: flat, or tilted and spun ---------- */

/**
 * How the map is seen: `tilt` 0 straight down (2D) up to about 1.2 (3D, seen from the side),
 * `yaw` its turn on the table, `zoom` and the point it centres on (`cx`, `cz`, tile-local).
 */
export type MapView = { tilt: number; yaw: number; zoom: number; cx: number; cz: number };
export const TILT_3D = 0.95;
export const TILT_MAX = 1.25;
export const ZOOM_RANGE: [number, number] = [0.6, 8];

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
  };
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
  return [w / 2 + rx * k * p, h / 2 + sy * k * p, depth];
}

/* ---------- drawing ---------- */

const rgba = (c: RGB, k: number, a: number) =>
  `rgba(${Math.round(Math.min(1, c[0] * k) * 255)},${Math.round(Math.min(1, c[1] * k) * 255)},${Math.round(Math.min(1, c[2] * k) * 255)},${a})`;
const GOLD: RGB = [1, 0.78, 0.45];

type Face = { depth: number; pts: [number, number][]; fill: string; line?: string };

/**
 * Draws the map on a 2D canvas of w × h css pixels: the Dawn sky behind, the districts, the roads,
 * the blocks (flat or as prisms when tilted), the metro, the places and your ship (tile-local
 * `ship`, heading `heading`), the beat `t` breathing the pointer. `labels` names the districts and
 * places.
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
) {
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

  // The ground: each district a patch of its colour.
  for (const d of data.districts) poly(flat(d.x0, d.z0, d.x1, d.z1), rgba(d.colour, 0.32, 0.22));
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
  ctx.setLineDash([]);

  // The districts' names, quiet, in the middle of each patch.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (labels) {
    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    for (const d of data.districts) {
      const q = P((d.x0 + d.x1) / 2, 0, (d.z0 + d.z1) / 2 - BLOCK_Z * 1.5);
      ctx.fillStyle = rgba(d.colour, 1.1, 0.75);
      ctx.fillText(d.name.toUpperCase(), q[0], q[1]);
    }
  }

  // The places: landmarks a ringed dot, races a diamond, stations a small square, portals a ring.
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  for (const p of data.places) {
    const base = P(p.x, 0, p.z);
    const q = raised ? P(p.x, p.y, p.z) : base;
    if (raised && p.y > 0) {
      ctx.beginPath();
      ctx.moveTo(base[0], base[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.strokeStyle = rgba(p.colour, 1, 0.35);
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
      default:
        ctx.arc(q[0], q[1], 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(q[0], q[1], 6.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (labels && p.kind !== 'station' && p.kind !== 'portal') {
      ctx.fillStyle = 'rgba(244,234,216,0.82)';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, q[0] + 9, q[1]);
      ctx.textAlign = 'center';
    }
  }

  // You: a gold pointer the way you fly, breathing softly on the city's beat.
  if (ship) {
    const q = P(ship.x, raised ? Math.max(0, ship.y) : 0, ship.z);
    const ahead = P(
      ship.x + Math.sin(ship.heading) * 10,
      raised ? Math.max(0, ship.y) : 0,
      ship.z - Math.cos(ship.heading) * 10,
    );
    const a = Math.atan2(ahead[1] - q[1], ahead[0] - q[0]);
    const glow = 0.55 + 0.25 * Math.sin(t * 2.2);
    ctx.beginPath();
    ctx.arc(q[0], q[1], 13, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,214,150,${(0.16 * glow).toFixed(3)})`;
    ctx.fill();
    ctx.save();
    ctx.translate(q[0], q[1]);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fillStyle = '#ffe2a6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,24,10,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
