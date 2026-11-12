/*
 * The business district of the City of Dreams (docs/specs/art-city.md, "The business district"):
 * the Heights' towers, each its own design, round a Nova Core on the district's plaza. Pure: no
 * three.js, no DOM.
 *
 * Queued from the user (2026-11-12): "a business district of twisting towers with docks".
 *
 * Five designs, each from a few rules on a square or round plan, drawn as grain meshes (dense lit
 * edges, faint glass faces lit by how they face the eye, windows, a crown light breathing on the
 * Heights' beat): a Twist, turning a quarter as it rises; a Setback, three tiers stepping in with
 * gardens on each; Tubes, four round shafts of different heights bundled together; a Diagrid,
 * a round tower netted by crossing helices under a tilted crown ring; a Blade, a lens-shaped slab
 * whose roof slopes up to a sharp prow. They stand taller toward the plaza, sky bridges join the
 * tall neighbours, and the Nova Core (the Studio's Armillary, larger) breathes in the middle.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import {
  BLOCK_X,
  BLOCK_Z,
  beat,
  boxDist,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  scale,
  TAU,
  TILE_I,
  TILE_J,
} from './city-grid';
import { meshSite, type Palette, type Placed } from './city-mesh';
import { type Built, type Hit, Mesh, Tone } from './grain-mesh';
import { novaCore } from './nova-cores';

const G = GROUND;
const { edge, glass, light, plant, road } = Tone;

/** The Heights' plaza, tile-local: its landmark, the Nova Core, stands on the crossing. */
export const BUSINESS_PLAZA = { x: -3 * BLOCK_X, z: 20 * BLOCK_Z };
export const TOWER_KINDS = ['Twist', 'Setback', 'Tubes', 'Diagrid', 'Blade'] as const;
export type TowerKind = (typeof TOWER_KINDS)[number];

/** A business tower's footprint and height, for the plan (collision is this box). */
export type BusinessSize = { hx: number; hz: number; h: number; kind: number };

const tileLocal = (I: number, J: number) => ({
  li: ((((I + TILE_I / 2) % TILE_I) + TILE_I) % TILE_I) - TILE_I / 2,
  lj: ((J % TILE_J) + TILE_J) % TILE_J,
});

/**
 * Tower on block (I, J) of the Heights: its design by the block's own number k, its size from
 * the block, taller the nearer the plaza (from about 60 at the district's edge to over 120 beside
 * the core). Its box keeps a street of six or more all round.
 */
export function businessSize(I: number, J: number, k: number): BusinessSize {
  const { li, lj } = tileLocal(I, J);
  const cx = (li + 0.5) * BLOCK_X;
  const cz = (lj + 0.5) * BLOCK_Z;
  const d = Math.hypot(cx - BUSINESS_PLAZA.x, cz - BUSINESS_PLAZA.z);
  const kind = Math.floor(hash(k, 461) * TOWER_KINDS.length) % TOWER_KINDS.length;
  const w = 7.2 + 1.6 * hash(k, 462);
  const h = 58 + 70 * Math.exp(-d / 85) + 22 * hash(k, 463);
  // The box that holds you: a turning square's corners reach out, a blade is long and thin.
  const hx = kind === 0 ? w * 1.18 : kind === 4 ? w * 0.62 : w;
  const hz = kind === 0 ? w * 1.18 : kind === 4 ? Math.min(12, w * 1.35) : w;
  return { hx: Math.min(hx, 10), hz: Math.min(hz, 12), h, kind };
}

/* ---------- the five designs ---------- */

const CROWN = 7;
const WINDOW = 3;

function twist(m: Mesh, w: number, h: number, _hz: number) {
  const n = Math.max(8, Math.round(h / 3.4));
  const corner = (f: number, c: number): Vec3 => {
    const u = f / n;
    const a = u * Math.PI * 0.5 + (c * Math.PI) / 2 + Math.PI / 4;
    const s = w * Math.SQRT2 * (1 - 0.2 * u);
    return [Math.cos(a) * s, G + u * h, Math.sin(a) * s];
  };
  m.centre = [0, G + h / 2, 0];
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < 4; c++) {
      const a = corner(f, c);
      const b = corner(f, (c + 1) % 4);
      const a2 = corner(f + 1, c);
      const b2 = corner(f + 1, (c + 1) % 4);
      m.tri(a, b, b2, glass, { w: 0.5 });
      m.tri(a, b2, a2, glass, { w: 0.5 });
      m.line(a, a2, edge, { w: 1.6 });
      if (f % 2 === 0) m.line(a, b, edge, { w: 0.5 });
      // Two windows a floor on each face.
      for (const q of [0.3, 0.7]) {
        const p: Vec3 = [a[0] + (b[0] - a[0]) * q, a[1] + 1.4, a[2] + (b[2] - a[2]) * q];
        m.dot(p, 0.35, light, { key: WINDOW, w: 0.06 });
      }
    }
  }
  const top = [0, 1, 2, 3].map((c) => corner(n, c));
  m.poly(top, true, road, { w: 1.4 });
  m.line([0, G + h, 0], [0, G + h + 12, 0], edge, { w: 1 });
  m.dot([0, G + h + 12.4, 0], 0.7, light, { key: CROWN, w: 0.6 });
}

function setback(m: Mesh, w: number, h: number, _hz: number) {
  const tiers: [number, number, number][] = [
    [1, 0, 0.5],
    [0.72, 0.5, 0.8],
    [0.46, 0.8, 1],
  ];
  for (const [s, y0, y1] of tiers) {
    const hw = w * s;
    m.box([0, G + y0 * h, 0], hw, (y1 - y0) * h, hw, glass, edge);
    // Fins up the faces, a band of windows every floor.
    for (let f = 0; f < 4; f++) {
      const a = (f * Math.PI) / 2;
      const nx = Math.cos(a);
      const nz = Math.sin(a);
      for (const q of [-0.5, 0, 0.5]) {
        const x = nx * hw - nz * q * hw;
        const z = nz * hw + nx * q * hw;
        m.line([x, G + y0 * h, z], [x, G + y1 * h, z], edge, { w: 0.4 });
      }
      for (let y = G + y0 * h + 2; y < G + y1 * h - 1; y += 3.4) {
        for (const q of [-0.75, -0.25, 0.25, 0.75]) {
          m.dot([nx * hw - nz * q * hw, y, nz * hw + nx * q * hw], 0.3, light, {
            key: WINDOW,
            w: 0.05,
          });
        }
      }
    }
    // Each setback's roof: a lit edge and a garden.
    const y = G + y1 * h;
    m.poly(
      [
        [-hw, y, -hw],
        [hw, y, -hw],
        [hw, y, hw],
        [-hw, y, hw],
      ],
      true,
      road,
      { w: 1.2 },
    );
    if (s < 1) continue;
    for (let j = 0; j < 14; j++) {
      const a = j * 2.39996;
      const r = hw * (0.78 + 0.18 * hash(j, 7));
      m.dot([Math.cos(a) * r, y + 0.5, Math.sin(a) * r], 0.6, plant, { w: 0.12 });
    }
  }
  m.dot([0, G + h + 1.2, 0], 0.9, light, { key: CROWN, w: 0.6 });
}

function tubes(m: Mesh, w: number, h: number, _hz: number) {
  const r = w * 0.5;
  const heights = [1, 0.82, 0.64, 0.9];
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].forEach(([a, b], i) => {
    const c: Vec3 = [(a as number) * r, G, (b as number) * r];
    const top = G + h * (heights[i] as number);
    m.cylinder(c, r, G, top, glass, edge, 6, 14);
    for (let y = G + 4; y < top - 1; y += 4)
      m.ring([c[0], y, c[2]], r + 0.02, edge, { w: 0.35 }, 14);
    for (let y = G + 2; y < top - 1; y += 3.4) {
      for (let j = 0; j < 6; j++) {
        const q = (j / 6) * TAU + i;
        m.dot([c[0] + Math.cos(q) * r, y, c[2] + Math.sin(q) * r], 0.28, light, {
          key: WINDOW,
          w: 0.04,
        });
      }
    }
    m.ring([c[0], top, c[2]], r, road, { w: 1 }, 14);
    m.dot([c[0], top + 0.6, c[2]], 0.6, light, { key: CROWN, w: 0.35 });
  });
}

function diagrid(m: Mesh, w: number, h: number, _hz: number) {
  const n = 12;
  const rows = Math.max(6, Math.round(h / 7));
  const P = (i: number, j: number): Vec3 => {
    const a = (i / n) * TAU;
    const r = w * (1 - 0.12 * Math.sin((j / rows) * Math.PI));
    return [Math.cos(a) * r, G + (j / rows) * h, Math.sin(a) * r];
  };
  m.centre = [0, G + h / 2, 0];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < n; i++) {
      const a = P(i, j);
      const b = P(i + 1, j);
      const c = P(i + 1, j + 1);
      const d = P(i, j + 1);
      m.tri(a, b, c, glass, { w: 0.45 });
      m.tri(a, c, d, glass, { w: 0.45 });
      // Crossing helices: the diagrid.
      m.line(a, c, edge, { w: 0.8 });
      m.line(b, d, edge, { w: 0.8 });
      if (j % 2 === 0) m.line(a, b, edge, { w: 0.3 });
      m.dot([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], 0.4, light, {
        key: WINDOW,
        w: 0.08,
      });
    }
  }
  // A crown ring tilted over the roof, and a light at its middle.
  const tilt = 0.35;
  const ring = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * TAU;
    const x = Math.cos(a) * w * 1.05;
    const z = Math.sin(a) * w * 1.05;
    return [x, G + h + 3 + z * Math.sin(tilt), z * Math.cos(tilt)] as Vec3;
  });
  m.poly(ring, true, road, { w: 1.4 });
  m.dot([0, G + h + 3, 0], 0.8, light, { key: CROWN, w: 0.5 });
}

function blade(m: Mesh, w: number, h: number, hz: number) {
  const rx = w * 0.62;
  const rz = Math.min(hz, w * 1.35);
  const n = 20;
  const top = (z: number) => G + h * (0.82 + 0.18 * ((z / rz + 1) / 2) ** 2);
  const P = (i: number): Vec3 => {
    const a = (i / n) * TAU;
    return [Math.cos(a) * rx * Math.abs(Math.cos(a)) ** -0.2, 0, Math.sin(a) * rz];
  };
  m.centre = [0, G + h / 2, 0];
  for (let i = 0; i < n; i++) {
    const a = P(i);
    const b = P(i + 1);
    const ya = top(a[2]);
    const yb = top(b[2]);
    m.tri([a[0], G, a[2]], [b[0], G, b[2]], [b[0], yb, b[2]], glass, { w: 0.5 });
    m.tri([a[0], G, a[2]], [b[0], yb, b[2]], [a[0], ya, a[2]], glass, { w: 0.5 });
    m.line([a[0], G, a[2]], [a[0], ya, a[2]], edge, { w: i % 5 === 0 ? 1.6 : 0.45 });
    m.line([a[0], ya, a[2]], [b[0], yb, b[2]], road, { w: 1.2 });
    for (let y = G + 2; y < ya - 1; y += 3.4)
      m.dot([a[0] * 1.01, y, a[2] * 1.01], 0.3, light, { key: WINDOW, w: 0.04 });
  }
  // The prow: a mast and a light at its tip.
  m.line([0, top(rz), rz], [0, top(rz) + 10, rz], edge, { w: 0.8 });
  m.dot([0, top(rz) + 10.4, rz], 0.7, light, { key: CROWN, w: 0.5 });
}

const DESIGNS = [twist, setback, tubes, diagrid, blade];

const built = new Map<string, Built>();
/** Tower (I, J)'s mesh, in its own frame (its foot at the origin), built once to its box. */
export function towerMesh(I: number, J: number, size: BusinessSize): Built {
  const key = `${I},${J}`;
  const had = built.get(key);
  if (had) return had;
  const m = new Mesh();
  const w =
    size.kind === 0
      ? Math.min(size.hx, size.hz) / 1.18
      : size.kind === 4
        ? size.hx / 0.62
        : Math.min(size.hx, size.hz);
  const design = DESIGNS[size.kind] as (m: Mesh, w: number, h: number, hz: number) => void;
  design(m, Math.min(w, 9), size.h, size.hz);
  const B = m.build();
  if (built.size > 300) built.clear();
  built.set(key, B);
  return B;
}

/* ---------- colours: cyan and white, warm windows, the crowns on the beat ---------- */

const GLASS_RGB: RGB = mix(C.cyan, [0.2, 0.3, 0.6], 0.5);
export const businessPalette: Palette = (h: Hit, t: number) => {
  switch (h.tone) {
    case Tone.edge:
      return scale(mix(C.cyan, C.white, 0.45), 0.36);
    case Tone.glass:
    case Tone.face:
      return scale(GLASS_RGB, 0.12);
    case Tone.road:
      return scale(mix(C.white, C.gold, 0.35), 0.5);
    case Tone.plant:
      return scale(C.leaf, 0.3);
    case Tone.light:
      if (h.key === CROWN) return scale(C.white, 0.5 + 0.4 * beat(t, 2));
      return scale(hash(Math.round(h.pos[1] * 3 + h.pos[0] * 7), 5) < 0.7 ? C.warm : C.cyan, 0.42);
    default:
      return scale(C.white, 0.3);
  }
};
const SHARES = { lines: 0.55, faces: 0.78 };

/** A business tower on its block, for the Ship's renderer. */
export function towerItem(
  tw: { x: number; z: number; hx: number; hz: number; h: number; k: number; I: number; J: number },
  size: BusinessSize,
  eye: Vec3,
  t: number,
  d: number,
): Item {
  const P: Placed = {
    B: towerMesh(tw.I, tw.J, size),
    at: [tw.x, G, tw.z],
    sc: 1,
    shares: SHARES,
    palette: businessPalette,
  };
  const top = G + tw.h;
  return {
    d,
    gid: mixId(tw.k, 7331),
    count: Math.min(4000, Math.round(900 + tw.h * 18)),
    weight: 1.25,
    probe: [
      [tw.x, top, tw.z],
      [tw.x + tw.hx, G + tw.h * 0.5, tw.z + tw.hz],
      [tw.x - tw.hx, G + tw.h * 0.5, tw.z - tw.hz],
      [tw.x, G + 6, tw.z],
    ],
    site: (s, o) => meshSite(P, s, t, eye, 1, o),
  };
}

/**
 * A sky bridge between two business towers, a glass tube with lights along its floor, at a height
 * both reach; along x (neighbours across a street) or z.
 */
export function skyBridgeItem(
  A: { x: number; z: number; hx: number; hz: number; h: number; k: number },
  B: { x: number; z: number; hx: number; hz: number; h: number; k: number },
  axis: 0 | 2,
  eye: Vec3,
  t: number,
): Item | null {
  const top = Math.min(A.h, B.h) - 8;
  if (top < 40) return null;
  const y = G + 30 + (top - 30) * hash(A.k + axis, 471);
  const a: Vec3 = axis === 0 ? [A.x + A.hx, y, (A.z + B.z) / 2] : [(A.x + B.x) / 2, y, A.z + A.hz];
  const b: Vec3 = axis === 0 ? [B.x - B.hx, y, (A.z + B.z) / 2] : [(A.x + B.x) / 2, y, B.z - B.hz];
  const len = axis === 0 ? b[0] - a[0] : b[2] - a[2];
  if (len <= 1) return null;
  const per = Math.ceil(len / 0.35);
  const RIBS = Math.ceil(len / 1.6);
  return {
    d: boxDist(
      eye,
      [Math.min(a[0], b[0]), y - 1.4, Math.min(a[2], b[2])],
      [Math.max(a[0], b[0]), y + 1.4, Math.max(a[2], b[2])],
    ),
    gid: mixId(A.k * 3 + axis, 472),
    count: per * 5 + RIBS * 12,
    weight: 2,
    probe: [a, b, [(a[0] + b[0]) / 2, y, (a[2] + b[2]) / 2]],
    site: (s, o) => {
      const along = (u: number, side: number, up: number) => {
        o[0] = axis === 0 ? a[0] + u * len : a[0] + side;
        o[1] = y + up;
        o[2] = axis === 0 ? a[2] + side : a[2] + u * len;
      };
      if (s < per * 5) {
        const e = Math.floor(s / per);
        const u = ((s % per) + 0.5) / per;
        if (e < 4) {
          along(u, e & 2 ? 1.1 : -1.1, e & 1 ? 1.5 : -1.2);
          [o[3], o[4], o[5]] = scale(mix(C.cyan, C.white, 0.4), 0.3);
        } else {
          along(u, 0, -1.15);
          // Lights running along the floor, slowly, on the Heights' beat.
          const run = 0.5 + 0.5 * Math.sin(u * len * 0.8 - t * 2);
          [o[3], o[4], o[5]] = scale(C.warm, 0.12 + 0.4 * run ** 4);
        }
        return true;
      }
      const r = s - per * 5;
      const rib = Math.floor(r / 12);
      const q = ((r % 12) / 12) * TAU;
      along((rib + 0.5) / RIBS, Math.cos(q) * 1.15, Math.sin(q) * 1.35 + 0.15);
      [o[3], o[4], o[5]] = scale(mix(C.cyan, C.white, 0.5), 0.22);
      return true;
    },
  };
}

/* ---------- the landmark: the Nova Core of the Heights ---------- */

export const CORE_KIND = 1;
export const CORE_SCALE = 1.7;
let coreMesh: Built | null = null;
const corePalette: Palette = (h: Hit, t: number) => {
  switch (h.tone) {
    case Tone.edge:
      return scale(mix(C.gold, C.cyan, 0.35), 0.42);
    case Tone.light:
      return scale(mix(C.warm, C.white, 0.4), 0.6 + 0.25 * beat(t, 2));
    case Tone.road:
      return scale(mix(C.cyan, C.gold, 0.4), 0.42);
    case Tone.plant:
      return scale(C.leaf, 0.3);
    case Tone.water:
      return scale(C.cyan, 0.25);
    case Tone.ground:
    case Tone.face:
      return scale(mix(C.cyan, C.violet, 0.4), 0.12);
    default:
      return scale(C.gold, 0.3);
  }
};
/** The Nova Core on the Heights' plaza at (x, z), larger than the Studio's, breathing as it does. */
export function coreItem(x: number, z: number, eye: Vec3, t: number, d: number, gid: number): Item {
  if (!coreMesh) coreMesh = novaCore(CORE_KIND).build();
  const P: Placed = {
    B: coreMesh,
    at: [x, G, z],
    sc: CORE_SCALE,
    shares: { lines: 0.62, faces: 0.72 },
    palette: corePalette,
  };
  return {
    d,
    gid,
    count: 3200,
    weight: 1.5,
    probe: [
      [x, G + 20, z],
      [x, G + 4, z + 16],
      [x - 16, G + 4, z],
    ],
    site: (s, o) => meshSite(P, s, t, eye, 1, o),
  };
}
