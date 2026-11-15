/*
 * The Industry superquarter of the City of Dreams (docs/specs/art-city.md, "Industry superquarter
 * and the observatory"): a giant factory town in the annex beside the strip, past the Favela to
 * the tile's end. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "a massive giant factory town: factories like the existing ones but much BIGGER,
 * inspired by cement factories (silos, kilns, preheater towers, conveyor galleries), CONNECTED to
 * each other into one mega set", "LOTS of bridges, rails and diagonal conveyor galleries and pipes,
 * so you can fly below them and in between the parts", "big nuclear cooling towers, windmills with
 * turning blades, big spinning wheels, and mechanical clockwork movements", and "the ATOM SYMBOL on
 * top of one of the big industry towers". And the principle: "Perspective is everything and the
 * whole point of this city. Perspective is power, and makes it beautiful."
 *
 * So it is laid out along one long lane (the Great Lane, LANE_X) running the quarter's length from
 * its gateway at the tile's end to the Atom tower at its far end: five stations of works stand in
 * two rows either side of it, a work a side at each station (halls, silo batteries, preheater
 * towers of stacked cyclones, two industrial towers), and at every station a diagonal conveyor
 * gallery crosses the lane, rising the other way at the next, so the galleries recede as a run of
 * frames toward the atom. Galleries run along each row from work to work and up to the Atom tower,
 * so the works are one connected set. Low pipe racks, a rail bridge and the clockwork gate (huge
 * meshing gears hung on a frame over the lane) cross it too, all high enough to fly under
 * (LANE_CLEAR). Outside the rows: rotary kilns turning beside the lane, elevated rail viaducts with
 * slow ore trains, two pairs of hyperboloid cooling towers framing the rows, two huge spinning
 * wheels between them, a line of wind turbines along the far edge, chimneys breathing slow steam,
 * sodium lamps lining the lane like a runway.
 *
 * Light is mellow: sodium orange, steel and cement grey, warm windows, slow pulses gliding along
 * the conveyors, nothing flashes. Annex-local, as the other annex quarters (`ax` across from the
 * strip's edge street, `lz` along the tile, y over the street); laid out once into pieces with flat
 * numbers, and the sites write straight into the renderer's array (no allocation per grain). Solid
 * masses (works, silos, cooling towers, chimneys, kilns, masts, the Atom tower) are held by a cheap
 * bucketed check for the collision's `blocked`; galleries, rails, pipes and gears are light to fly
 * through, as the other sky bridges are.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import {
  type Atom,
  atomSite,
  type Gear,
  gearSite,
  meshWith,
  teethFor,
  type Windmill,
  windmillSite,
} from './city-gears';
import {
  BLOCK_Z,
  clamp,
  frac,
  GROUND,
  type Item,
  lerp,
  mixId,
  nearest,
  STRIP_X,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';

/** The Industry superquarter runs from row 45 (past the Favela's last hill) to the tile's end. */
export const INDUSTRY_ROW0 = 45;
export const INDUSTRY_Z0 = INDUSTRY_ROW0 * BLOCK_Z;
export const INDUSTRY_Z1 = TILE_Z;
/** The Great Lane: its middle across, its kept-clear half width, and how high every span over it stands. */
export const LANE_X = 156;
export const LANE_HALF = 16;
export const LANE_CLEAR = 20;
/** The five stations along the lane, from the gateway end to the Atom tower's. */
export const STATIONS = [1850, 1790, 1730, 1670, 1610];

/* ---------- colours ---------- */

const SODIUM: RGB = [1, 0.6, 0.22];
const STEEL: RGB = [0.6, 0.68, 0.8];
const CEMENT: RGB = [0.82, 0.78, 0.72];
const EMBER: RGB = [1, 0.42, 0.15];
const WARM: RGB = [1, 0.8, 0.52];
const STEAM: RGB = [0.78, 0.75, 0.72];
const ATOM_RGB: RGB = [0.95, 0.9, 0.8];
const PALETTE: RGB[] = [CEMENT, STEEL, SODIUM, WARM, EMBER, STEAM, ATOM_RGB];

const tint = (o: number[], c: RGB, k: number) => {
  o[3] = c[0] * k;
  o[4] = c[1] * k;
  o[5] = c[2] * k;
};
/** A slow breath, never a flash: 0.86..1. */
const breath = (t: number, ph: number) => 0.93 + 0.07 * Math.sin(0.25 * t + ph);

/* ---------- the works: one a side at each station, and the Atom tower ---------- */

export type WorkKind = 'hall' | 'silos' | 'preheater' | 'tower' | 'atom';
export type Work = {
  name: string;
  kind: WorkKind;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Its top over the street (a silo battery's headhouse, a hall's roof, included). */
  h: number;
  side: -1 | 0 | 1;
};
const ROW_W = 112;
const ROW_E = 200;
const W_KINDS: WorkKind[] = ['hall', 'preheater', 'silos', 'hall', 'tower'];
const W_H = [26, 74, 48, 34, 92];
const E_KINDS: WorkKind[] = ['silos', 'hall', 'preheater', 'silos', 'tower'];
const E_H = [48, 30, 80, 48, 86];
/** A silo battery: four silos this wide, this far apart, a headhouse over them. */
export const SILO_R = 5.4;
export const SILO_SP = 12.2;
const HEADHOUSE = 6;
const SIZE: Record<WorkKind, [number, number]> = {
  hall: [12, 17],
  silos: [SILO_SP / 2 + SILO_R, SILO_SP / 2 + SILO_R],
  preheater: [8, 8],
  tower: [9, 9],
  atom: [9, 9],
};
const NAMES: Record<WorkKind, string> = {
  hall: 'Kiln hall',
  silos: 'Silo battery',
  preheater: 'Preheater tower',
  tower: 'Industry tower',
  atom: 'Atom tower',
};
const work = (kind: WorkKind, x: number, z: number, h: number, side: -1 | 0 | 1, k: number) => {
  const [hx, hz] = SIZE[kind];
  return {
    name: `${NAMES[kind]} ${k + 1}${side < 0 ? 'W' : side > 0 ? 'E' : ''}`,
    kind,
    x,
    z,
    hx,
    hz,
    h: kind === 'silos' ? h + HEADHOUSE : h,
    side,
  };
};
/** The Atom tower's height to its top platform, and its legs' half widths at the foot and the top. */
export const ATOM_TOWER_H = 112;
export const ATOM_HALF0 = 9;
export const ATOM_HALF1 = 4.5;
/** The works: the west row (0..4), the east row (5..9), the Atom tower (10). */
export const WORKS: Work[] = [
  ...STATIONS.map((z, k) => work(W_KINDS[k] as WorkKind, ROW_W, z, W_H[k] as number, -1, k)),
  ...STATIONS.map((z, k) => work(E_KINDS[k] as WorkKind, ROW_E, z, E_H[k] as number, 1, k)),
  { ...work('atom', LANE_X, 1568, ATOM_TOWER_H, 0, 0), name: 'Atom tower' },
];
export const ATOM_TOWER = WORKS[10] as Work;
/** The atom symbol over the Atom tower: its middle, its orbits' half length, its slow turn. */
export const ATOM: Atom = { x: LANE_X, y: ATOM_TOWER_H + 16, z: ATOM_TOWER.z, R: 11, w: 0.12 };

/* ---------- galleries: the conveyors that join the works ---------- */

export type Gallery = { from: number; to: number; a: Vec3; b: Vec3 };
/** Where work w's side faces a point toward (dx, dz) (one of its four faces), at height y. */
function faceToward(w: Work, dx: number, dz: number, y: number): Vec3 {
  if (Math.abs(dx) * w.hz > Math.abs(dz) * w.hx) return [w.x + Math.sign(dx) * w.hx, y, w.z];
  return [w.x, y, w.z + Math.sign(dz) * w.hz];
}
const CROSS_Y: [number, number][] = [
  [22, 42],
  [52, 26],
  [40, 62],
  [30, 44],
  [70, 58],
];
const ROW_Y: [number, number][][] = [
  [
    [18, 40],
    [44, 30],
    [24, 20],
    [28, 60],
  ],
  [
    [36, 22],
    [24, 50],
    [56, 36],
    [40, 64],
  ],
];
/** The rows' galleries run a little off their works' middles, clear of the clockwork gate's gears. */
const ROW_GX = [108, 205];
/**
 * Every gallery: across the lane at each station (rising one way, then the other), along each row
 * from station to station, and from each row's last work up to the Atom tower.
 */
export const GALLERIES: Gallery[] = (() => {
  const out: Gallery[] = [];
  STATIONS.forEach((_, k) => {
    const W = WORKS[k] as Work;
    const E = WORKS[5 + k] as Work;
    const [yw, ye] = CROSS_Y[k] as [number, number];
    out.push({ from: k, to: 5 + k, a: faceToward(W, 1, 0, yw), b: faceToward(E, -1, 0, ye) });
  });
  for (const side of [0, 1]) {
    for (let k = 0; k < 4; k++) {
      const A = WORKS[side * 5 + k] as Work;
      const B = WORKS[side * 5 + k + 1] as Work;
      const [ya, yb] = (ROW_Y[side] as [number, number][])[k] as [number, number];
      const gx = ROW_GX[side] as number;
      out.push({
        from: side * 5 + k,
        to: side * 5 + k + 1,
        a: [gx, ya, A.z - A.hz],
        b: [gx, yb, B.z + B.hz],
      });
    }
  }
  const T = ATOM_TOWER;
  out.push({ from: 4, to: 10, a: [ROW_W + 9, 70, 1606], b: [T.x - 7, 86, T.z + 6] });
  out.push({ from: 9, to: 10, a: [ROW_E - 9, 62, 1606], b: [T.x + 7, 80, T.z + 6] });
  return out;
})();
/** A gallery's half width and half height. */
export const GALLERY_W = 1.8;
export const GALLERY_HH = 1.6;

/* ---------- the rest of the town ---------- */

/** A hyperboloid cooling tower: its foot's middle, height, radii at the foot and top, and its rulings' twist. */
export type CoolingTower = { x: number; z: number; h: number; r0: number; rt: number; phi: number };
const ct = (x: number, z: number): CoolingTower => ({ x, z, h: 96, r0: 28, rt: 19, phi: 1.4 });
/** Two pairs, framing the rows on either side: the west pair and the east pair. */
export const COOLING_TOWERS: CoolingTower[] = [
  ct(50, 1815),
  ct(50, 1695),
  ct(262, 1815),
  ct(262, 1695),
];
/**
 * A cooling tower's radius at height y over the street: its straight rulings, from the foot's ring
 * to the top's turned phi round, pass nearest the axis at its waist.
 */
export function coolingRadius(c: CoolingTower, y: number): number {
  const u = clamp(y / c.h, 0, 1);
  return Math.sqrt(
    c.r0 * c.r0 * (1 - u) ** 2 +
      c.rt * c.rt * u * u +
      2 * c.r0 * c.rt * u * (1 - u) * Math.cos(c.phi),
  );
}

export type Chimney = { x: number; z: number; r: number; h: number };
export const CHIMNEYS: Chimney[] = [
  { x: 96, z: 1772, r: 2.6, h: 98 },
  { x: 216, z: 1748, r: 2.6, h: 104 },
];
/** A rotary kiln: along z beside the lane, sloping down from z0 (its feed end) to z1 (its burner). */
export type Kiln = {
  x: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  r: number;
  w: number;
};
export const KILNS: Kiln[] = [
  { x: 132, z0: 1802, z1: 1744, y0: 9, y1: 5.5, r: 3, w: 0.32 },
  { x: 180, z0: 1742, z1: 1684, y0: 9, y1: 5.5, r: 3, w: -0.28 },
];
/** The rail viaducts along each side, and the rail bridge across the lane: ends, deck height. */
export type Viaduct = { ax: number; az: number; bx: number; bz: number; y: number };
export const VIADUCTS: Viaduct[] = [
  { ax: 88, az: 1545, bx: 88, bz: 1900, y: 14 },
  { ax: 224, az: 1545, bx: 224, bz: 1900, y: 18 },
  { ax: 88, az: 1760, bx: 224, bz: 1760, y: 26 },
];
/** The pipe racks across the lane: three pipes each, the lowest at y. */
export const PIPE_RACKS = [
  { z: 1820, y: 20 },
  { z: 1640, y: 20 },
];
/** The clockwork gate over the lane: its plane along the lane, its frame's columns and beam. */
export const GATE_Z = 1704;
export const GATE_COLS = [104, 208];
export const GATE_BEAM = 98;

/** The gears: the gate's train of five (0..4), two trains on the halls' lane walls, then two big wheels. */
export const GEARS: Gear[] = (() => {
  const g0: Gear = {
    x: LANE_X,
    y: 72,
    z: GATE_Z,
    r: 18,
    n: teethFor(18),
    depth: 1.6,
    w: 0.09,
    th0: 0.2,
    plane: 'z',
    spokes: 8,
  };
  const g1 = meshWith(g0, (200 / 180) * Math.PI, 11);
  const g2 = meshWith(g0, (-25 / 180) * Math.PI, 14);
  const g3 = meshWith(g2, (70 / 180) * Math.PI, 7, 5);
  const g4 = meshWith(g1, (120 / 180) * Math.PI, 9, 5);
  // On the east hall's wall facing the lane (station 1), across x.
  const h0: Gear = { ...g0, x: ROW_E - SIZE.hall[0] - 0.6, y: 15, z: STATIONS[1] as number, r: 9 };
  h0.n = teethFor(9);
  h0.w = -0.14;
  h0.plane = 'x';
  h0.spokes = 6;
  const h1 = meshWith(h0, (30 / 180) * Math.PI, 5.5, 5);
  const h2 = meshWith(h0, (205 / 180) * Math.PI, 6, 5);
  // On the west hall's wall facing the lane (station 3).
  const j0: Gear = { ...h0, x: ROW_W + SIZE.hall[0] + 0.6, z: STATIONS[3] as number, r: 10, y: 17 };
  j0.n = teethFor(10);
  j0.w = 0.12;
  const j1 = meshWith(j0, (150 / 180) * Math.PI, 6, 5);
  // The big wheels between each pair of cooling towers, turning slowly the opposite ways.
  const wheel = (x: number, w: number): Gear => ({
    x,
    y: 32,
    z: 1755,
    r: 26,
    n: 0,
    depth: 0,
    w,
    th0: 0,
    plane: 'z',
    spokes: 12,
  });
  return [g0, g1, g2, g3, g4, h0, h1, h2, j0, j1, wheel(50, 0.11), wheel(262, -0.11)];
})();
/** Which gears mesh with which. */
export const GEAR_MESHES: [number, number][] = [
  [0, 1],
  [0, 2],
  [2, 3],
  [1, 4],
  [5, 6],
  [5, 7],
  [8, 9],
];
/** The wind turbines along the quarter's far edge, every 55, rotors across the lane's way. */
export const WINDMILLS: Windmill[] = [1560, 1615, 1670, 1725, 1780, 1835, 1890].map((z, i) => ({
  x: 298,
  z,
  hub: 62,
  blade: 13,
  w: 0.32 + 0.06 * hash(i, 1301),
  th0: TAU * hash(i, 1302),
}));

/* ---------- solids, for the collision ---------- */

/** A solid mass: a box, an upright cylinder, a cooling tower, the tapering Atom tower, a kiln. */
type Solid = {
  kind: 0 | 1 | 2 | 3 | 4;
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
  i: number;
};
export const SOLIDS: Solid[] = [
  ...WORKS.map((w, i): Solid => {
    const kind = w.kind === 'atom' ? 3 : 0;
    const top = w.kind === 'hall' ? w.h + 3 : w.h;
    return { kind, x: w.x, z: w.z, hx: w.hx, hz: w.hz, h: top, i };
  }),
  ...COOLING_TOWERS.map(
    (c, i): Solid => ({ kind: 2, x: c.x, z: c.z, hx: c.r0, hz: c.r0, h: c.h, i }),
  ),
  ...CHIMNEYS.map((c, i): Solid => ({ kind: 1, x: c.x, z: c.z, hx: c.r, hz: c.r, h: c.h, i })),
  ...KILNS.map(
    (k, i): Solid => ({
      kind: 4,
      x: k.x,
      z: (k.z0 + k.z1) / 2,
      hx: k.r,
      hz: Math.abs(k.z0 - k.z1) / 2,
      h: Math.max(k.y0, k.y1) + k.r,
      i,
    }),
  ),
  ...WINDMILLS.map(
    (m, i): Solid => ({ kind: 1, x: m.x, z: m.z + 0.9, hx: 1.6, hz: 1.6, h: m.hub + 1.2, i }),
  ),
];
/** The solids filed in cells of the quarter, so a point checks only its own few. */
const CELL = 32;
const CELLS_X = Math.ceil(STRIP_X / CELL) + 1;
const CELLS_Z = Math.ceil((INDUSTRY_Z1 - INDUSTRY_Z0) / CELL) + 1;
const cells: number[][] = Array.from({ length: CELLS_X * CELLS_Z }, () => []);
SOLIDS.forEach((s, si) => {
  const pad = 3;
  const i0 = Math.max(0, Math.floor((s.x - s.hx - pad) / CELL));
  const i1 = Math.min(CELLS_X - 1, Math.floor((s.x + s.hx + pad) / CELL));
  const j0 = Math.max(0, Math.floor((s.z - s.hz - pad - INDUSTRY_Z0) / CELL));
  const j1 = Math.min(CELLS_Z - 1, Math.floor((s.z + s.hz + pad - INDUSTRY_Z0) / CELL));
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) (cells[j * CELLS_X + i] as number[]).push(si);
});

function solidHolds(s: Solid, ax: number, y: number, lz: number, m: number): boolean {
  if (y > s.h + m) return false;
  const dx = ax - s.x;
  const dz = lz - s.z;
  switch (s.kind) {
    case 0:
      return Math.abs(dx) < s.hx + m && Math.abs(dz) < s.hz + m;
    case 1:
      return dx * dx + dz * dz < (s.hx + m) ** 2;
    case 2: {
      const r = coolingRadius(COOLING_TOWERS[s.i] as CoolingTower, y) + m;
      return dx * dx + dz * dz < r * r;
    }
    case 3: {
      const half = lerp(ATOM_HALF0, ATOM_HALF1, clamp(y / s.h, 0, 1)) + m;
      return Math.abs(dx) < half && Math.abs(dz) < half;
    }
    default: {
      const k = KILNS[s.i] as Kiln;
      if (Math.abs(dx) > k.r + m || Math.abs(dz) > s.hz + m) return false;
      const f = clamp((lz - k.z0) / (k.z1 - k.z0), 0, 1);
      return Math.abs(y - lerp(k.y0, k.y1, f)) < k.r + m;
    }
  }
}

/**
 * Whether annex-local (ax, y over the street, lz) is inside one of the quarter's solid masses, `m`
 * round. Galleries, rails, pipes, gears and blades are light: the ship flies through them.
 */
export function industryBlocked(ax: number, y: number, lz: number, m: number): boolean {
  const i = Math.floor(ax / CELL);
  const j = Math.floor((lz - INDUSTRY_Z0) / CELL);
  if (i < 0 || j < 0 || i >= CELLS_X || j >= CELLS_Z) return false;
  for (const si of cells[j * CELLS_X + i] as number[])
    if (solidHolds(SOLIDS[si] as Solid, ax, y, lz, m)) return true;
  return false;
}

/** The highest solid top over annex-local (ax, lz) (0 on open ground). */
export function industryHeight(ax: number, lz: number): number {
  let h = 0;
  for (const s of SOLIDS) if (s.h > h && solidHolds(s, ax, Math.min(1, s.h - 1), lz, 0)) h = s.h;
  return h;
}

/* ---------- pieces: laid out once, each one of the Ship's items ---------- */

const K = {
  seg: 0,
  truss: 1,
  box: 2,
  silos: 3,
  pre: 4,
  tower: 5,
  lattice: 6,
  hyper: 7,
  cyl: 8,
  kiln: 9,
  via: 10,
  train: 11,
  lamps: 12,
  steam: 13,
  gear: 14,
  wind: 15,
  atom: 16,
} as const;
/** A piece: its kind, its numbers, its sites and weight, its bounds (annex-local) and its own number. */
export type Piece = {
  kind: number;
  p: Float64Array;
  count: number;
  weight: number;
  lo: Vec3;
  hi: Vec3;
  gid: number;
};
export const PIECES: Piece[] = [];
const add = (kind: number, p: number[], count: number, weight: number, lo: Vec3, hi: Vec3) => {
  PIECES.push({
    kind,
    p: Float64Array.from(p),
    count: Math.max(8, Math.round(count)),
    weight,
    lo,
    hi,
    gid: mixId(PIECES.length, 77100),
  });
};
/** A straight run of light from a to b, colour c at k, `flow` pulses gliding along it at that pace. */
function addSeg(a: Vec3, b: Vec3, c: number, k: number, flow: number, dens = 2.2, w = 1.2) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  add(
    K.seg,
    [a[0], a[1], a[2], b[0], b[1], b[2], c, k, flow, L],
    L * dens,
    w,
    [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
    [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
  );
}
/** A truss gallery from a to b: its frame of four chords, cross frames and bracing, and a conveyor. */
function addTruss(a: Vec3, b: Vec3, w = GALLERY_W, hh = GALLERY_HH, flow = 3) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const L = Math.hypot(dx, dy, dz);
  const ux = dx / L;
  const uy = dy / L;
  const uz = dz / L;
  const sl = Math.hypot(uz, ux) || 1;
  const sx = -uz / sl;
  const sz = ux / sl;
  // up' = s × u
  const vx = -uy * sz;
  const vy = sz * ux - sx * uz;
  const vz = sx * uy;
  const r = Math.max(w, hh) + 0.5;
  add(
    K.truss,
    [a[0], a[1], a[2], ux, uy, uz, sx, 0, sz, vx, vy, vz, L, w, hh, flow],
    L * 9,
    1.5,
    [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
    [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
  );
}

(function layout() {
  // The works.
  WORKS.forEach((w, wi) => {
    const lo: Vec3 = [w.x - w.hx - 1, 0, w.z - w.hz - 1];
    const hi: Vec3 = [w.x + w.hx + 1, w.h + 6, w.z + w.hz + 1];
    switch (w.kind) {
      case 'hall':
        add(
          K.box,
          [w.x, w.z, w.hx, w.hz, 0, w.h, Math.round(w.h / 5), 0, 1, wi],
          1300,
          1.4,
          lo,
          hi,
        );
        break;
      case 'silos':
        add(K.silos, [w.x, w.z, SILO_R, w.h - HEADHOUSE, SILO_SP, wi], 1500, 1.4, lo, hi);
        break;
      case 'preheater':
        add(K.pre, [w.x, w.z, w.hx, w.hz, w.h, wi], 1500, 1.45, lo, hi);
        break;
      case 'tower':
        add(K.tower, [w.x, w.z, w.hx, w.hz, w.h, wi], 1700, 1.5, lo, hi);
        break;
      default:
        add(K.lattice, [w.x, w.z, w.h, ATOM_HALF0, ATOM_HALF1, 8, 1], 1500, 1.6, lo, [
          w.x + w.hx,
          ATOM.y,
          w.z + w.hz,
        ]);
    }
  });
  // The atom on its mast: weighed heavily, a landmark from far away.
  addSeg([ATOM.x, ATOM_TOWER_H, ATOM.z], [ATOM.x, ATOM.y, ATOM.z], 1, 0.4, 0, 3);
  add(
    K.atom,
    [0],
    1500,
    2.6,
    [ATOM.x - ATOM.R - 1, ATOM.y - ATOM.R, ATOM.z - ATOM.R - 1],
    [ATOM.x + ATOM.R + 1, ATOM.y + ATOM.R, ATOM.z + ATOM.R + 1],
  );
  // The galleries.
  for (const g of GALLERIES) addTruss(g.a, g.b);
  // The cooling towers, and a plume of slow steam over each.
  for (const c of COOLING_TOWERS) {
    add(
      K.hyper,
      [c.x, c.z, c.h, c.r0, c.rt, c.phi],
      2600,
      1.5,
      [c.x - c.r0, 0, c.z - c.r0],
      [c.x + c.r0, c.h, c.z + c.r0],
    );
    add(
      K.steam,
      [c.x, c.h, c.z, 46, c.rt * 0.8],
      260,
      1.1,
      [c.x - c.rt, c.h, c.z - c.rt],
      [c.x + c.rt, c.h + 46, c.z + c.rt],
    );
  }
  // Chimneys, and their steam.
  for (const c of CHIMNEYS) {
    add(
      K.cyl,
      [c.x, c.z, 0, c.h, c.r, 6, Math.round(c.h / 6), 1],
      520,
      1.4,
      [c.x - c.r, 0, c.z - c.r],
      [c.x + c.r, c.h, c.z + c.r],
    );
    add(
      K.steam,
      [c.x, c.h, c.z, 30, 3.5],
      140,
      1.1,
      [c.x - 6, c.h, c.z - 6],
      [c.x + 6, c.h + 30, c.z + 6],
    );
  }
  // The rotary kilns, turning beside the lane.
  for (const k of KILNS) {
    add(
      K.kiln,
      [k.x, k.z0, k.z1, k.y0, k.y1, k.r, k.w],
      900,
      1.5,
      [k.x - k.r - 1, 0, Math.min(k.z0, k.z1)],
      [k.x + k.r + 1, Math.max(k.y0, k.y1) + k.r + 1, Math.max(k.z0, k.z1)],
    );
  }
  // The viaducts and the rail bridge, and a slow ore train on each long one.
  VIADUCTS.forEach((v, vi) => {
    const L = Math.hypot(v.bx - v.ax, v.bz - v.az);
    const lo: Vec3 = [Math.min(v.ax, v.bx) - 3, 0, Math.min(v.az, v.bz) - 3];
    const hi: Vec3 = [Math.max(v.ax, v.bx) + 3, v.y + 3, Math.max(v.az, v.bz) + 3];
    add(K.via, [v.ax, v.az, v.bx, v.bz, v.y, 12, L], L * 4.2, 1.35, lo, hi);
    if (vi < 2) {
      add(K.train, [v.ax, v.az, v.bx, v.bz, v.y, vi === 0 ? 3.2 : -2.6, 6, L], 6 * 60, 1.5, lo, [
        hi[0],
        v.y + 5,
        hi[2],
      ]);
    }
  });
  // The pipe racks across the lane, their ends dropping to the ground beside the rows.
  for (const rack of PIPE_RACKS) {
    for (let q = 0; q < 3; q++) {
      const y = rack.y + q * 1.8;
      addSeg(
        [ROW_W, y, rack.z + q * 0.9],
        [ROW_E, y, rack.z + q * 0.9],
        q === 1 ? 2 : 1,
        0.34,
        q === 1 ? 2 : 0,
      );
    }
    for (const x of [ROW_W + 6, ROW_E - 6])
      addSeg([x, 0, rack.z + 0.9], [x, rack.y + 4, rack.z + 0.9], 1, 0.3, 0);
  }
  // Big pipes from each cooling tower to its nearest work, over the viaducts.
  const pipe = (c: CoolingTower, to: Work, y: number) => {
    const dir = Math.sign(to.x - c.x);
    const r = coolingRadius(c, y);
    const a: Vec3 = [c.x + dir * r * 0.97, y, c.z];
    const b = faceToward(to, c.x - to.x, c.z - to.z, y);
    for (const off of [-0.9, 0.9])
      addSeg([a[0], y + off, a[2]], [b[0], y + off, b[2]], 1, 0.3, off > 0 ? 1.5 : 0);
  };
  pipe(COOLING_TOWERS[0] as CoolingTower, WORKS[0] as Work, 24);
  pipe(COOLING_TOWERS[1] as CoolingTower, WORKS[3] as Work, 25);
  pipe(COOLING_TOWERS[2] as CoolingTower, WORKS[5] as Work, 26);
  pipe(COOLING_TOWERS[3] as CoolingTower, WORKS[8] as Work, 26);
  // The clockwork gate: its frame, the struts holding each gear, the gears.
  for (const x of GATE_COLS)
    add(
      K.lattice,
      [x, GATE_Z + 1.5, GATE_BEAM, 2.2, 2.2, 6, 0],
      520,
      1.35,
      [x - 3, 0, GATE_Z - 2],
      [x + 3, GATE_BEAM, GATE_Z + 4],
    );
  addTruss(
    [GATE_COLS[0] as number, GATE_BEAM, GATE_Z + 1.5],
    [GATE_COLS[1] as number, GATE_BEAM, GATE_Z + 1.5],
    2,
    2,
    0,
  );
  for (let gi = 0; gi < 5; gi++) {
    const g = GEARS[gi] as Gear;
    addSeg([g.x, g.y, GATE_Z + 1.5], [g.x, GATE_BEAM, GATE_Z + 1.5], 1, 0.3, 0);
  }
  GEARS.forEach((g, gi) => {
    const big = g.n === 0;
    const r = g.r + g.depth + 1;
    const lo: Vec3 = g.plane === 'z' ? [g.x - r, g.y - r, g.z - 1] : [g.x - 1, g.y - r, g.z - r];
    const hi: Vec3 = g.plane === 'z' ? [g.x + r, g.y + r, g.z + 1] : [g.x + 1, g.y + r, g.z + r];
    add(K.gear, [gi, big ? 0 : 1], g.r * (big ? 46 : 52), 1.6, lo, hi);
    if (big) {
      // The wheel's axle stands on two legs.
      for (const s of [-1, 1])
        addSeg([g.x + s * 9, 0, g.z + 1.2], [g.x, g.y, g.z + 1.2], 1, 0.3, 0);
    }
  });
  // The wind turbines.
  WINDMILLS.forEach((m, mi) => {
    add(
      K.wind,
      [mi],
      420,
      1.45,
      [m.x - m.blade - 1, 0, m.z - 1],
      [m.x + m.blade + 1, m.hub + m.blade + 1, m.z + 5],
    );
  });
  // Sodium lamps lining the lane like a runway, to the Atom tower.
  for (const x of [LANE_X - LANE_HALF - 2, LANE_X + LANE_HALF + 2])
    add(K.lamps, [x, 1590, 1898, 24], 14 * 14, 1.5, [x - 1, 0, 1590], [x + 1, 8, 1898]);
})();

/* ---------- drawing ---------- */

/** Site s of a box's edges (0..11) at `along`: its four foot edges, four top edges, four uprights. */
function boxEdge(
  e: number,
  f: number,
  x: number,
  z: number,
  hx: number,
  hz: number,
  y0: number,
  y1: number,
  o: number[],
) {
  if (e < 8) {
    const side = e & 3;
    const g = f * 2 - 1;
    o[0] = x + (side === 0 ? g * hx : side === 1 ? hx : side === 2 ? -g * hx : -hx);
    o[2] = z + (side === 0 ? -hz : side === 1 ? g * hz : side === 2 ? hz : -g * hz);
    o[1] = e < 4 ? y0 : y1;
  } else {
    const c = e - 8;
    o[0] = x + (c & 1 ? hx : -hx);
    o[2] = z + (c & 2 ? hz : -hz);
    o[1] = lerp(y0, y1, f);
  }
}
/** A point e (0..1) round a rectangle of half sizes hx, hz at height y, into o. */
function aroundBox(
  e: number,
  x: number,
  z: number,
  hx: number,
  hz: number,
  y: number,
  o: number[],
) {
  const m = e * 4 * (hx + hz);
  if (m < 2 * hx) {
    o[0] = x - hx + m;
    o[2] = z - hz;
  } else if (m < 2 * hx + 2 * hz) {
    o[0] = x + hx;
    o[2] = z - hz + (m - 2 * hx);
  } else if (m < 4 * hx + 2 * hz) {
    o[0] = x + hx - (m - 2 * hx - 2 * hz);
    o[2] = z + hz;
  } else {
    o[0] = x - hx;
    o[2] = z + hz - (m - 4 * hx - 2 * hz);
  }
  o[1] = y;
}
/**
 * A window on a box's faces: window q of a grid of `rows` by the faces' columns (3.2 apart), lit
 * or not by the building's own number; false where dark.
 */
function windowOn(
  q: number,
  rows: number,
  x: number,
  z: number,
  hx: number,
  hz: number,
  y0: number,
  y1: number,
  seed: number,
  t: number,
  o: number[],
): boolean {
  const cx = Math.max(2, Math.round((2 * hx) / 3.2));
  const cz = Math.max(2, Math.round((2 * hz) / 3.2));
  const per = 2 * (cx + cz);
  const row = Math.floor(q / per) % rows;
  const c = q % per;
  if (hash(seed * 7919 + q, 1311) > 0.62) return false;
  const y = lerp(y0, y1, (row + 0.5) / rows);
  if (c < cx) {
    o[0] = x - hx + ((c + 0.5) / cx) * 2 * hx;
    o[2] = z - hz - 0.1;
  } else if (c < cx + cz) {
    o[0] = x + hx + 0.1;
    o[2] = z - hz + ((c - cx + 0.5) / cz) * 2 * hz;
  } else if (c < 2 * cx + cz) {
    o[0] = x + hx - ((c - cx - cz + 0.5) / cx) * 2 * hx;
    o[2] = z + hz + 0.1;
  } else {
    o[0] = x - hx - 0.1;
    o[2] = z + hz - ((c - 2 * cx - cz + 0.5) / cz) * 2 * hz;
  }
  o[1] = y;
  tint(o, WARM, 0.5 * (0.85 + 0.15 * Math.sin(0.3 * t + q * 0.7 + seed)));
  return true;
}

/** Site s (of n) of piece P at time t into o, annex-local (the caller shifts it). */
function pieceSite(P: Piece, s: number, t: number, o: number[]): boolean {
  const p = P.p;
  const n = P.count;
  const u = (s + 0.5) / n;
  switch (P.kind) {
    case K.seg: {
      o[0] = lerp(p[0] as number, p[3] as number, u);
      o[1] = lerp(p[1] as number, p[4] as number, u);
      o[2] = lerp(p[2] as number, p[5] as number, u);
      const flow = p[8] as number;
      let k = p[7] as number;
      if (flow > 0)
        k *=
          0.55 +
          0.7 * Math.max(0, Math.cos(TAU * frac((u * (p[9] as number)) / 9 - (t * flow) / 9))) ** 6;
      tint(o, PALETTE[p[6] as number] as RGB, k * breath(t, s * 0.01));
      return true;
    }
    case K.truss: {
      const L = p[12] as number;
      const w = p[13] as number;
      const hh = p[14] as number;
      let along = 0;
      let a = 0;
      let b = 0;
      let c = STEEL;
      let k = 0.34;
      if (u < 0.42) {
        // The four chords.
        const q = s & 3;
        along = (Math.floor(s / 4) + 0.5) / Math.ceil(n * 0.105);
        a = q & 1 ? w : -w;
        b = q & 2 ? hh : -hh;
      } else if (u < 0.66) {
        // Cross frames every 3.
        const f = (u - 0.42) / 0.24;
        const frames = Math.max(2, Math.floor(L / 3));
        const fi = Math.floor(f * frames);
        along = (fi + 0.5) / frames;
        const e = frac(f * frames) * 4;
        const side = Math.floor(e);
        const g = (e - side) * 2 - 1;
        a = side === 0 ? g * w : side === 1 ? w : side === 2 ? -g * w : -w;
        b = side === 0 ? -hh : side === 1 ? g * hh : side === 2 ? hh : -g * hh;
        k = 0.26;
      } else if (u < 0.84) {
        // Bracing zigzagging up and down both sides.
        const f = (u - 0.66) / 0.18;
        const side = s % 2 === 0 ? 1 : -1;
        along = f;
        const zig = frac((f * L) / 3);
        a = side * w;
        b = (Math.abs(zig * 2 - 1) * 2 - 1) * hh;
        k = 0.22;
      } else {
        // The conveyor along its floor: sodium pulses gliding up it.
        const f = (u - 0.84) / 0.16;
        along = f;
        b = -hh * 0.55;
        a = 0;
        c = SODIUM;
        const flow = p[15] as number;
        k =
          flow > 0
            ? 0.18 + 0.5 * Math.max(0, Math.cos(TAU * frac((f * L) / 7 - (t * flow) / 7))) ** 4
            : 0.3;
      }
      const d = along * L;
      o[0] = (p[0] as number) + (p[3] as number) * d + (p[6] as number) * a + (p[9] as number) * b;
      o[1] = (p[1] as number) + (p[4] as number) * d + (p[10] as number) * b;
      o[2] = (p[2] as number) + (p[5] as number) * d + (p[8] as number) * a + (p[11] as number) * b;
      tint(o, c, k * breath(t, s * 0.013));
      return true;
    }
    case K.box: {
      // A kiln hall: its edges, floors, warm windows, and a sawtooth roof along x.
      const x = p[0] as number;
      const z = p[1] as number;
      const hx = p[2] as number;
      const hz = p[3] as number;
      const y0 = p[4] as number;
      const y1 = p[5] as number;
      const floors = p[6] as number;
      const seed = p[9] as number;
      if (u < 0.26) {
        const f = (u / 0.26) * 12;
        boxEdge(Math.floor(f), frac(f), x, z, hx, hz, y0, y1, o);
        tint(o, CEMENT, 0.4 * breath(t, seed));
        return true;
      }
      if (u < 0.42) {
        const f = (u - 0.26) / 0.16;
        const k = Math.floor(f * floors);
        aroundBox(frac(f * floors), x, z, hx, hz, lerp(y0, y1, (k + 1) / (floors + 1)), o);
        tint(o, CEMENT, 0.18);
        return true;
      }
      if (u < 0.84) return windowOn(s, floors, x, z, hx, hz, y0, y1 - 1, seed, t, o);
      // The roof: sawtooth teeth across it, each rising to a lit ridge.
      const f = (u - 0.84) / 0.16;
      const teeth = 6;
      const ti = Math.floor(f * teeth);
      const g = frac(f * teeth);
      const zz = z - hz + ((ti + 0.5) / teeth) * 2 * hz;
      const side = s % 3;
      o[0] = x - hx + g * 2 * hx;
      o[1] = y1 + (side === 0 ? 3 : side === 1 ? 1.5 : 0);
      o[2] = zz + (side === 0 ? 0 : side === 1 ? -1.4 : -2.8);
      tint(o, side === 0 ? SODIUM : CEMENT, side === 0 ? 0.42 : 0.24);
      return true;
    }
    case K.silos: {
      const x = p[0] as number;
      const z = p[1] as number;
      const r = p[2] as number;
      const h = p[3] as number;
      const sp = p[4] as number;
      const seed = p[5] as number;
      if (u < 0.82) {
        const f = u / 0.82;
        const si = Math.floor(f * 4);
        const g = frac(f * 4);
        const cx = x + (si & 1 ? sp / 2 : -sp / 2);
        const cz = z + (si & 2 ? sp / 2 : -sp / 2);
        if (g < 0.5) {
          // Ribs up its side.
          const q = g / 0.5;
          const rib = Math.floor(q * 10);
          const a = (rib / 10) * TAU;
          o[0] = cx + Math.cos(a) * r;
          o[1] = frac(q * 10) * h;
          o[2] = cz + Math.sin(a) * r;
          tint(o, CEMENT, 0.3);
        } else if (g < 0.86) {
          // Rings every 4.
          const q = (g - 0.5) / 0.36;
          const rings = Math.floor(h / 4);
          const ri = Math.floor(q * rings);
          const a = frac(q * rings) * TAU;
          o[0] = cx + Math.cos(a) * r;
          o[1] = (ri + 1) * (h / (rings + 1));
          o[2] = cz + Math.sin(a) * r;
          tint(o, ri % 4 === 3 ? SODIUM : CEMENT, ri % 4 === 3 ? 0.36 : 0.2);
        } else {
          // Its conical cap.
          const q = (g - 0.86) / 0.14;
          const line = Math.floor(q * 8);
          const a = (line / 8) * TAU;
          const f2 = frac(q * 8);
          const rr = lerp(r, 0.8, f2);
          o[0] = cx + Math.cos(a) * rr;
          o[1] = h + f2 * 3;
          o[2] = cz + Math.sin(a) * rr;
          tint(o, CEMENT, 0.34);
        }
        return true;
      }
      // The headhouse over the four: edges and windows.
      const hx = sp / 2 + r;
      const f = (u - 0.82) / 0.18;
      if (f < 0.5) {
        boxEdge(Math.floor(f * 2 * 12), frac(f * 2 * 12), x, z, hx, 2.6, h + 1, h + HEADHOUSE, o);
        tint(o, STEEL, 0.36);
        return true;
      }
      return windowOn(s, 1, x, z, hx, 2.6, h + 1, h + HEADHOUSE, seed, t, o);
    }
    case K.pre: {
      const x = p[0] as number;
      const z = p[1] as number;
      const hx = p[2] as number;
      const hz = p[3] as number;
      const h = p[4] as number;
      if (u < 0.16) {
        const c = s & 3;
        o[0] = x + (c & 1 ? hx : -hx);
        o[2] = z + (c & 2 ? hz : -hz);
        o[1] = (u / 0.16) * h;
        tint(o, STEEL, 0.38);
        return true;
      }
      if (u < 0.36) {
        const f = (u - 0.16) / 0.2;
        const floors = Math.floor(h / 8);
        const k = Math.floor(f * floors);
        aroundBox(frac(f * floors), x, z, hx, hz, (k + 1) * 8, o);
        tint(o, k % 2 ? CEMENT : STEEL, 0.24);
        return true;
      }
      if (u < 0.9) {
        // Cyclones: four levels of two, each a drum over a cone, a duct falling between levels.
        const f = (u - 0.36) / 0.54;
        const ci = Math.floor(f * 8);
        const g = frac(f * 8);
        const level = ci >> 1;
        const cx = x + (ci & 1 ? hx * 0.45 : -hx * 0.45);
        const yc = h * (0.4 + 0.15 * level);
        if (g < 0.4) {
          const a = (g / 0.4) * TAU * 2;
          o[0] = cx + Math.cos(a) * 2.6;
          o[1] = yc - (g < 0.2 ? 0 : 2.2);
          o[2] = z + Math.sin(a) * 2.6;
        } else if (g < 0.85) {
          const q = (g - 0.4) / 0.45;
          const line = Math.floor(q * 6);
          const a = (line / 6) * TAU;
          const f2 = frac(q * 6);
          const rr = lerp(2.6, 0.7, f2);
          o[0] = cx + Math.cos(a) * rr;
          o[1] = yc - 2.2 - f2 * 4;
          o[2] = z + Math.sin(a) * rr;
        } else {
          const q = (g - 0.85) / 0.15;
          o[0] = cx;
          o[1] = yc - 6.2 - q * (h * 0.15 - 6.2);
          o[2] = z;
        }
        tint(o, CEMENT, 0.32 * breath(t, ci));
        return true;
      }
      // Sodium lamps at the frame's corners on each floor.
      const floors = Math.floor(h / 8);
      const q = s % (floors * 4);
      const c = q & 3;
      o[0] = x + (c & 1 ? hx + 0.3 : -hx - 0.3);
      o[2] = z + (c & 2 ? hz + 0.3 : -hz - 0.3);
      o[1] = ((q >> 2) + 1) * 8 + 0.6;
      tint(o, SODIUM, 0.55 * breath(t, q));
      return true;
    }
    case K.tower: {
      // An industry tower: a body to 0.78 of its height, a narrower crown above, floors, windows,
      // and a mast with a slow sodium beacon.
      const x = p[0] as number;
      const z = p[1] as number;
      const hx = p[2] as number;
      const hz = p[3] as number;
      const h = p[4] as number;
      const seed = p[5] as number;
      const yb = h * 0.78;
      if (u < 0.22) {
        const f = u / 0.22;
        const upper = f >= 0.5;
        const g = (upper ? f - 0.5 : f) * 2;
        const e = Math.floor(g * 12);
        if (upper) boxEdge(e, frac(g * 12), x, z, hx * 0.7, hz * 0.7, yb, h, o);
        else boxEdge(e, frac(g * 12), x, z, hx, hz, 0, yb, o);
        tint(o, STEEL, 0.42 * breath(t, seed));
        return true;
      }
      if (u < 0.4) {
        const f = (u - 0.22) / 0.18;
        const floors = Math.floor(h / 4);
        const k = Math.floor(f * floors);
        const y = (k + 1) * 4;
        const sc = y > yb ? 0.7 : 1;
        aroundBox(frac(f * floors), x, z, hx * sc, hz * sc, y, o);
        tint(o, k % 5 === 4 ? SODIUM : CEMENT, k % 5 === 4 ? 0.34 : 0.16);
        return true;
      }
      if (u < 0.9) {
        const rows = Math.floor(yb / 4);
        return windowOn(s, rows, x, z, hx, hz, 2, yb - 1, seed, t, o);
      }
      const f = (u - 0.9) / 0.1;
      if (f < 0.75) {
        o[0] = x;
        o[1] = h + (f / 0.75) * 14;
        o[2] = z;
        tint(o, STEEL, 0.34);
      } else {
        const a = ((f - 0.75) / 0.25) * TAU;
        o[0] = x + Math.cos(a) * 0.7;
        o[1] = h + 14.5 + Math.sin(a) * 0.7;
        o[2] = z;
        tint(o, SODIUM, 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(0.5 * t + seed)));
      }
      return true;
    }
    case K.lattice: {
      // A tapering lattice tower: four legs, X bracing on each face, platforms, lamps at the top.
      const x = p[0] as number;
      const z = p[1] as number;
      const h = p[2] as number;
      const h0 = p[3] as number;
      const h1 = p[4] as number;
      const panel = p[5] as number;
      const panels = Math.max(1, Math.floor(h / panel));
      const half = (y: number) => lerp(h0, h1, y / h);
      if (u < 0.28) {
        const c = s & 3;
        const y = (u / 0.28) * h;
        const hw = half(y);
        o[0] = x + (c & 1 ? hw : -hw);
        o[1] = y;
        o[2] = z + (c & 2 ? hw : -hw);
        tint(o, STEEL, 0.42);
        return true;
      }
      if (u < 0.78) {
        const f = (u - 0.28) / 0.5;
        const face = s & 3;
        const q = f * panels;
        const pi = Math.floor(q);
        const g = frac(q);
        const diag = (s >> 2) & 1;
        const y = (pi + g) * panel;
        const hw = half(y);
        const across = (diag ? g : 1 - g) * 2 - 1;
        if (face < 2) {
          o[0] = x + across * hw;
          o[2] = z + (face === 0 ? -hw : hw);
        } else {
          o[0] = x + (face === 2 ? -hw : hw);
          o[2] = z + across * hw;
        }
        o[1] = y;
        tint(o, STEEL, 0.24);
        return true;
      }
      if (u < 0.93) {
        const f = (u - 0.78) / 0.15;
        const every = 4;
        const levels = Math.max(1, Math.floor(panels / every));
        const k = Math.floor(f * levels);
        const y = Math.min(h, (k + 1) * every * panel);
        const hw = half(y);
        aroundBox(frac(f * levels), x, z, hw, hw, y, o);
        tint(o, (p[6] as number) > 0 && k === levels - 1 ? SODIUM : CEMENT, 0.3);
        return true;
      }
      const c = s & 3;
      o[0] = x + (c & 1 ? h1 : -h1);
      o[1] = h + 0.5;
      o[2] = z + (c & 2 ? h1 : -h1);
      tint(o, SODIUM, 0.5 * breath(t, c));
      return true;
    }
    case K.hyper: {
      const x = p[0] as number;
      const z = p[1] as number;
      const h = p[2] as number;
      const r0 = p[3] as number;
      const rt = p[4] as number;
      const phi = p[5] as number;
      if (u < 0.58) {
        // Its straight rulings, two families twisting either way: the hyperboloid drawn by lines.
        const f = u / 0.58;
        const rul = 40;
        const fam = s & 1 ? 1 : -1;
        const j = Math.floor(f * rul);
        const g = frac(f * rul);
        const th = (j / rul) * TAU + (fam > 0 ? 0 : 0.08);
        const x0 = Math.cos(th) * r0;
        const z0 = Math.sin(th) * r0;
        const x1 = Math.cos(th + fam * phi) * rt;
        const z1 = Math.sin(th + fam * phi) * rt;
        o[0] = x + lerp(x0, x1, g);
        o[1] = g * h;
        o[2] = z + lerp(z0, z1, g);
        tint(o, CEMENT, 0.22 + 0.08 * g);
        return true;
      }
      if (u < 0.92) {
        // Rings: the foot, the waist, a few between, the top brightest.
        const f = (u - 0.58) / 0.34;
        const rings = 9;
        const k = Math.floor(f * rings);
        const y = (k / (rings - 1)) * h;
        const v = y / h;
        const r = Math.sqrt(
          r0 * r0 * (1 - v) ** 2 + rt * rt * v * v + 2 * r0 * rt * v * (1 - v) * Math.cos(phi),
        );
        const a = frac(f * rings) * TAU;
        o[0] = x + Math.cos(a) * r;
        o[1] = y;
        o[2] = z + Math.sin(a) * r;
        tint(o, k === rings - 1 ? SODIUM : CEMENT, k === rings - 1 ? 0.42 : 0.26);
        return true;
      }
      // A warm glow inside its throat, from the water below, breathing slowly.
      const a = s * 2.399963229728653;
      const rr = Math.sqrt(frac(s * 0.618034)) * rt * 0.9;
      o[0] = x + Math.cos(a) * rr;
      o[1] = h - 4 - 6 * frac(s * 0.3819);
      o[2] = z + Math.sin(a) * rr;
      tint(o, SODIUM, 0.16 * breath(t, s));
      return true;
    }
    case K.cyl: {
      // A chimney: ribs, rings, sodium aviation lamps every third ring.
      const x = p[0] as number;
      const z = p[1] as number;
      const y0 = p[2] as number;
      const y1 = p[3] as number;
      const r = p[4] as number;
      const ribs = p[5] as number;
      const rings = p[6] as number;
      if (u < 0.5) {
        const f = u / 0.5;
        const rib = Math.floor(f * ribs);
        const a = (rib / ribs) * TAU;
        o[0] = x + Math.cos(a) * r;
        o[1] = lerp(y0, y1, frac(f * ribs));
        o[2] = z + Math.sin(a) * r;
        tint(o, CEMENT, 0.28);
        return true;
      }
      const f = (u - 0.5) / 0.5;
      const k = Math.floor(f * rings);
      const a = frac(f * rings) * TAU;
      o[0] = x + Math.cos(a) * r;
      o[1] = lerp(y0, y1, (k + 1) / rings);
      o[2] = z + Math.sin(a) * r;
      const lamp = k % 3 === 2 || k === rings - 1;
      tint(o, lamp ? SODIUM : CEMENT, lamp ? 0.42 * breath(t, k) : 0.2);
      return true;
    }
    case K.kiln: {
      const x = p[0] as number;
      const z0 = p[1] as number;
      const z1 = p[2] as number;
      const y0 = p[3] as number;
      const y1 = p[4] as number;
      const r = p[5] as number;
      const w = p[6] as number;
      const spin = w * t;
      let f = 0;
      let a = 0;
      let rr = r;
      let c = CEMENT;
      let k = 0.26;
      if (u < 0.34) {
        // Shell rings every 1.6.
        const g = u / 0.34;
        const rings = Math.floor(Math.abs(z1 - z0) / 1.6);
        f = (Math.floor(g * rings) + 0.5) / rings;
        a = frac(g * rings) * TAU;
      } else if (u < 0.7) {
        // Six stripes along it, turning with it: the kiln's slow roll.
        const g = (u - 0.34) / 0.36;
        const st = Math.floor(g * 6);
        f = frac(g * 6);
        a = spin + (st / 6) * TAU;
        c = st % 3 === 0 ? SODIUM : STEEL;
        k = st % 3 === 0 ? 0.36 : 0.26;
      } else if (u < 0.82) {
        // Three riding tyres, bright.
        const g = (u - 0.7) / 0.12;
        const ty = Math.floor(g * 3);
        f = 0.2 + 0.3 * ty;
        a = frac(g * 3) * TAU;
        rr = r + 0.45;
        c = STEEL;
        k = 0.4;
      } else if (u < 0.9) {
        // Piers under the tyres.
        const g = (u - 0.82) / 0.08;
        const ty = Math.floor(g * 3);
        f = 0.2 + 0.3 * ty;
        const yy = lerp(y0, y1, f) - r - 0.5;
        o[0] = x + (s & 1 ? 1.6 : -1.6);
        o[1] = frac(g * 3) * yy;
        o[2] = lerp(z0, z1, f);
        tint(o, CEMENT, 0.24);
        return true;
      } else {
        // The burner's glow at its low end, breathing slowly.
        const g = (u - 0.9) / 0.1;
        f = 1;
        a = g * TAU * 3;
        rr = r * Math.sqrt(frac(g * 3));
        c = EMBER;
        k = 0.45 * (0.8 + 0.2 * Math.sin(0.4 * t + s));
      }
      o[0] = x + Math.cos(a) * rr;
      o[1] = lerp(y0, y1, f) + Math.sin(a) * rr;
      o[2] = lerp(z0, z1, f);
      tint(o, c, k);
      return true;
    }
    case K.via: {
      const ax = p[0] as number;
      const az = p[1] as number;
      const bx = p[2] as number;
      const bz = p[3] as number;
      const y = p[4] as number;
      const step = p[5] as number;
      const L = p[6] as number;
      const ux = (bx - ax) / L;
      const uz = (bz - az) / L;
      let f = 0;
      let off = 0;
      let yy = y;
      let c = STEEL;
      let k = 0.3;
      if (u < 0.34) {
        f = u / 0.34;
        off = s & 1 ? 0.8 : -0.8;
        yy = y + 0.3;
        k = 0.36;
      } else if (u < 0.58) {
        f = (u - 0.34) / 0.24;
        off = s & 1 ? 2.2 : -2.2;
        c = CEMENT;
        k = 0.26;
      } else if (u < 0.9) {
        const g = (u - 0.58) / 0.32;
        const pillars = Math.max(1, Math.floor(L / step));
        const pi = Math.floor(g * pillars);
        f = (pi + 0.5) / pillars;
        off = s & 1 ? 1.6 : -1.6;
        yy = frac(g * pillars) * y;
        c = CEMENT;
        k = 0.22;
      } else {
        const g = (u - 0.9) / 0.1;
        const lamps = Math.max(1, Math.floor(L / (2 * step)));
        f = (Math.floor(g * lamps) + 0.5) / lamps;
        off = 2.4;
        yy = y + 2.5;
        c = SODIUM;
        k = 0.5 * breath(t, f * 10);
      }
      o[0] = ax + ux * f * L - uz * off;
      o[1] = yy;
      o[2] = az + uz * f * L + ux * off;
      tint(o, c, k);
      return true;
    }
    case K.train: {
      const ax = p[0] as number;
      const az = p[1] as number;
      const bx = p[2] as number;
      const bz = p[3] as number;
      const y = (p[4] as number) + 0.6;
      const speed = p[5] as number;
      const cars = p[6] as number;
      const L = p[7] as number;
      const per = Math.floor(n / cars);
      const car = Math.floor(s / per);
      if (car >= cars) return false;
      const q = (s % per) / per;
      const run = L + 40;
      const head = ((((t * speed) % run) + run) % run) - 20;
      const along = head - car * 10.5 * Math.sign(speed);
      if (along < 2 || along > L - 2) return false;
      const ux = (bx - ax) / L;
      const uz = (bz - az) / L;
      // Each car an open hopper: its outline along both sides, its ends, a warm lamp on its front.
      let da = 0;
      let off = 0;
      let yy = y;
      let c = STEEL;
      let k = 0.36;
      if (q < 0.7) {
        const e = q / 0.7;
        const side = Math.floor(e * 4);
        da = (frac(e * 4) - 0.5) * 9;
        off = side & 1 ? 1.4 : -1.4;
        yy = y + (side & 2 ? 2.4 : 0);
      } else if (q < 0.9) {
        const e = (q - 0.7) / 0.2;
        da = e < 0.5 ? -4.5 : 4.5;
        off = (frac(e * 2) * 2 - 1) * 1.4;
        yy = y + 1.2;
      } else {
        da = 4.6 * Math.sign(speed);
        yy = y + 1.4;
        c = WARM;
        k = 0.55;
      }
      // Fading in and out at the viaduct's ends.
      k *= clamp(Math.min(along, L - along) / 12, 0, 1);
      o[0] = ax + ux * (along + da) - uz * off;
      o[1] = yy;
      o[2] = az + uz * (along + da) + ux * off;
      tint(o, c, k);
      return true;
    }
    case K.lamps: {
      const x = p[0] as number;
      const z0 = p[1] as number;
      const z1 = p[2] as number;
      const step = p[3] as number;
      const posts = Math.floor((z1 - z0) / step) + 1;
      const post = Math.floor(s / 14);
      if (post >= posts) return false;
      const q = s % 14;
      const z = z0 + post * step;
      if (q < 6) {
        o[0] = x;
        o[1] = (q / 5) * 7;
        o[2] = z;
        tint(o, STEEL, 0.24);
      } else if (q < 10) {
        const a = ((q - 6) / 4) * TAU;
        o[0] = x + Math.cos(a) * 0.5;
        o[1] = 7.4;
        o[2] = z + Math.sin(a) * 0.5;
        tint(o, SODIUM, 0.62 * breath(t, post));
      } else {
        // A dashed line on the ground toward the next post: the lane's edge, receding.
        o[0] = x + (x < LANE_X ? 2 : -2);
        o[1] = 0.15;
        o[2] = z + ((q - 10) / 4) * step * 0.5;
        tint(o, SODIUM, 0.22);
      }
      return true;
    }
    case K.steam: {
      // Slow steam: motes rising and spreading, fading in and out, warm-lit from below.
      const x = p[0] as number;
      const y = p[1] as number;
      const z = p[2] as number;
      const rise = p[3] as number;
      const spread = p[4] as number;
      const ph = frac(s * 0.6180339887 + t * 0.045);
      const a = s * 2.399963229728653 + 0.15 * t;
      const rr = spread * (0.35 + 0.65 * ph) * Math.sqrt(frac(s * 0.3819));
      o[0] = x + Math.cos(a) * rr + ph * 6 * Math.sin(0.05 * t);
      o[1] = y + ph * rise;
      o[2] = z + Math.sin(a) * rr;
      const k = 0.2 * Math.sin(Math.PI * ph);
      o[3] = lerp(SODIUM[0], STEAM[0], ph) * k;
      o[4] = lerp(SODIUM[1], STEAM[1], ph) * k;
      o[5] = lerp(SODIUM[2], STEAM[2], ph) * k;
      return true;
    }
    case K.gear: {
      const g = GEARS[p[0] as number] as Gear;
      const part = gearSite(g, s, n, t, 0, 0, o);
      o[1] = (o[1] as number) - GROUND;
      const toothed = (p[1] as number) > 0;
      const c = part === 0 ? (toothed ? STEEL : CEMENT) : part === 3 ? SODIUM : STEEL;
      tint(o, c, (part === 0 ? 0.44 : part === 3 ? 0.5 : 0.28) * breath(t, p[0] as number));
      return true;
    }
    case K.wind: {
      const m = WINDMILLS[p[0] as number] as Windmill;
      const part = windmillSite(m, s, n, t, 0, 0, o);
      o[1] = (o[1] as number) - GROUND;
      tint(
        o,
        part === 3 ? SODIUM : part === 2 ? CEMENT : STEEL,
        part === 3 ? 0.5 : part === 2 ? 0.36 : 0.26,
      );
      return true;
    }
    default: {
      const part = atomSite(ATOM, s, n, t, 0, 0, o);
      o[1] = (o[1] as number) - GROUND;
      if (part === 0) tint(o, SODIUM, 0.55 * breath(t, s * 0.1));
      else if (part === 1) tint(o, ATOM_RGB, 0.46);
      else tint(o, WARM, 0.75 * (o[6] as number));
      return true;
    }
  }
}

/** The quarter's copy nearest the eye: the world x of annex-local 0, the shift along z. */
function shiftNear(eye: Vec3): [number, number] {
  const mx = STRIP_X / 2 + LANE_X;
  const mz = (INDUSTRY_Z0 + INDUSTRY_Z1) / 2;
  return [nearest(mx, eye[0], TILE_X) - LANE_X, nearest(mz, eye[2], TILE_Z) - mz];
}

/**
 * The quarter's lit things round the eye, out to R: every piece within reach and ahead, as one of
 * the Ship's items (its sites shifted to the copy of the quarter nearest the eye).
 */
export function industryItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]): void {
  const [ox, oz] = shiftNear(eye);
  // Nothing of it within reach: no work at all.
  const ex = eye[0] - ox;
  const ez = eye[2] - oz;
  if (ex < -R || ex > STRIP_X + R || ez < INDUSTRY_Z0 - R || ez > INDUSTRY_Z1 + R) return;
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const ey = eye[1] - GROUND;
  for (const P of PIECES) {
    const cx = clamp(ex, P.lo[0], P.hi[0]) - ex;
    const cy = clamp(ey, P.lo[1], P.hi[1]) - ey;
    const cz = clamp(ez, P.lo[2], P.hi[2]) - ez;
    const d = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (d > R) continue;
    // Kept to the view ahead (a wide wedge, as the other quarters keep theirs).
    const mx = (P.lo[0] + P.hi[0]) / 2 - ex;
    const mz = (P.lo[2] + P.hi[2]) / 2 - ez;
    const rad = Math.hypot(P.hi[0] - P.lo[0], P.hi[2] - P.lo[2]) / 2;
    const depth = mx * hx + mz * hz;
    if (depth < -rad || Math.abs(mx * hz - mz * hx) > depth * 1.1 + rad * 1.5 + 6) continue;
    out.push({
      d,
      gid: P.gid,
      count: P.count,
      weight: P.weight,
      site: (s, o) => {
        if (!pieceSite(P, s, t, o)) return false;
        o[0] = (o[0] as number) + ox;
        o[1] = (o[1] as number) + GROUND;
        o[2] = (o[2] as number) + oz;
        return true;
      },
    });
  }
}

/** A piece's site at time t, annex-local with y over the street (for the tests). */
export function industrySite(P: Piece, s: number, t: number): number[] {
  const o = [0, 0, 0, 0, 0, 0, 0];
  pieceSite(P, s, t, o);
  return o;
}

/* ---------- the map and the far city ---------- */

/** The quarter's footprints for the map's lines: closed outlines (plan-local x, z) at their heights. */
export function industryOutlines(): { y: number; pts: [number, number][] }[] {
  const out: { y: number; pts: [number, number][] }[] = [];
  const X = (ax: number) => STRIP_X / 2 + ax;
  const circle = (x: number, z: number, r: number, y: number, n = 24) =>
    out.push({
      y,
      pts: Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU;
        return [X(x + Math.cos(a) * r), z + Math.sin(a) * r] as [number, number];
      }),
    });
  for (const w of WORKS) {
    if (w.kind === 'silos') {
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          circle(w.x + (sx * SILO_SP) / 2, w.z + (sz * SILO_SP) / 2, SILO_R, w.h, 12);
      continue;
    }
    out.push({
      y: w.h,
      pts: [
        [X(w.x - w.hx), w.z - w.hz],
        [X(w.x + w.hx), w.z - w.hz],
        [X(w.x + w.hx), w.z + w.hz],
        [X(w.x - w.hx), w.z + w.hz],
      ],
    });
  }
  for (const c of COOLING_TOWERS) {
    circle(c.x, c.z, c.r0, 0, 32);
    circle(c.x, c.z, c.rt, c.h, 24);
  }
  for (const c of CHIMNEYS) circle(c.x, c.z, c.r + 1, c.h, 8);
  return out;
}

/** The quarter's named places for the map: the Atom tower, the clockwork gate, the cooling towers. */
export function industryPlaces(): { name: string; x: number; z: number; y: number }[] {
  return [
    { name: 'Atom tower', x: STRIP_X / 2 + ATOM.x, z: ATOM.z, y: ATOM.y },
    { name: 'Clockwork gate', x: STRIP_X / 2 + LANE_X, z: GATE_Z, y: (GEARS[0] as Gear).y },
    {
      name: 'Cooling towers',
      x: STRIP_X / 2 + (COOLING_TOWERS[0] as CoolingTower).x,
      z: 1755,
      y: (COOLING_TOWERS[0] as CoolingTower).h,
    },
  ];
}

/**
 * The far city's industry (lib/city-far.ts): the cooling towers' rims and waists, the works' roofs,
 * the chimneys, the turbines' hubs, and the Atom tower with its atom brightest: seen from far away.
 */
export function industryFar(
  put: (x: number, y: number, z: number, c: RGB, k: number, salt: number) => void,
  colour: RGB,
): void {
  const X = (ax: number) => STRIP_X / 2 + ax;
  const dim = (b: number): RGB => [colour[0] * b, colour[1] * b, colour[2] * b];
  COOLING_TOWERS.forEach((c, ci) => {
    for (const y of [0, c.h * 0.68, c.h]) {
      const r = coolingRadius(c, y);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        put(
          X(c.x + Math.cos(a) * r),
          GROUND + y,
          c.z + Math.sin(a) * r,
          dim(y === c.h ? 0.45 : 0.25),
          ci * 97 + i,
          960,
        );
      }
    }
  });
  WORKS.forEach((w, wi) => {
    for (let c = 0; c < 4; c++) {
      const x = w.x + (c & 1 ? w.hx : -w.hx);
      const z = w.z + (c & 2 ? w.hz : -w.hz);
      put(X(x), GROUND + w.h, z, dim(0.36), wi * 13 + c, 961);
      put(X(x), GROUND + w.h * 0.5, z, dim(0.18), wi * 13 + c, 962);
    }
  });
  for (const c of CHIMNEYS)
    for (let i = 0; i <= 8; i++)
      put(X(c.x), GROUND + (c.h * i) / 8, c.z, dim(i === 8 ? 0.5 : 0.22), i, 963);
  WINDMILLS.forEach((m, mi) => put(X(m.x), GROUND + m.hub, m.z, dim(0.4), mi, 964));
  for (let i = 0; i <= 12; i++)
    put(X(ATOM.x), GROUND + (ATOM_TOWER_H * i) / 12, ATOM.z, dim(0.3), i, 965);
  // The atom's three orbits, at rest, and its nucleus: bright.
  const ring: RGB = [ATOM_RGB[0] * 0.5, ATOM_RGB[1] * 0.5, ATOM_RGB[2] * 0.5];
  for (let k = 0; k < 3; k++) {
    const beta = (k * Math.PI) / 3;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU;
      const px = ATOM.R * Math.cos(a);
      const py = 0.36 * ATOM.R * Math.sin(a);
      put(
        X(ATOM.x + px * Math.cos(beta) - py * Math.sin(beta)),
        GROUND + ATOM.y + px * Math.sin(beta) + py * Math.cos(beta),
        ATOM.z,
        ring,
        k * 31 + i,
        966,
      );
    }
  }
  put(
    X(ATOM.x),
    GROUND + ATOM.y,
    ATOM.z,
    [SODIUM[0] * 0.6, SODIUM[1] * 0.6, SODIUM[2] * 0.6],
    1,
    967,
  );
}
