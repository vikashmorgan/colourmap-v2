/*
 * The Temples' skyscrapers and their long bridges (docs/specs/art-city.md, "Temple skyscrapers and
 * the Skyscraper series", 2026-11-14): six towers of the Skyscraper series (lib/skyscrapers.ts)
 * standing apart over the Temples' quarter (where, lib/city-skyscrapers-plan.ts), joined in pairs
 * by six long bridges high up, with real walls the Ship slides along.
 *
 * 2026-11-14: "Temple quarter should have a bunch of awesome unique skyscrapers as well, with a big
 * long bridge between them, so they are not right next to each other. This creates cool spaces to
 * fly around." And: "Perspective is everything and the whole point of this city. Perspective is
 * power, and makes it beautiful": the towers stand in two files that line up flying down the
 * quarter, and the bridges cross it, so each frames the distance as you fly under it.
 *
 * Every bridge is at 124 to 142 over the street: over the express lanes (112, 120) by four, under
 * the ceiling of ordinary flight (150), so you fly under, over and between; the high currents climb
 * over the whole group (lib/city-currents.ts loopAt). Light, mellow: a slow drift, lamps breathing.
 * Pure: no three.js, no DOM; meshes and strokes built once, nothing allocated per site.
 */

import { hash, type Vec3 } from './bigbang';
import { copiesNear, stretchSite } from './city-big';
import { quarterPalette } from './city-designs';
import { C, GROUND, type Item, mix, mixId, planX, TILE_I, TILE_J, TILE_Z, wrap } from './city-grid';
import {
  besideTempleTower,
  LIFT_AREA,
  TEMPLE_TOWERS,
  type TempleTower,
  templeTowerAt,
} from './city-skyscrapers-plan';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';
import type { Built } from './grain-mesh';
import { buildSky, Carved, inVoid, SKY_DESIGNS, type SkyDesign } from './skyscrapers';

const G = GROUND;

export { currentLift, LIFT_Y, TEMPLE_TOWERS, type TempleTower } from './city-skyscrapers-plan';

const tileCol = (I: number) => wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;

/** Whether block (I, J) holds a Temple skyscraper ('tower'), stands beside one ('beside'), or neither. */
export function skyscraperBlock(I: number, J: number): 'tower' | 'beside' | null {
  const li = tileCol(I);
  const lj = wrap(J, TILE_J);
  if (templeTowerAt(li, lj)) return 'tower';
  return besideTempleTower(li, lj) ? 'beside' : null;
}

/** A tower's design. */
const designOf = (T: TempleTower): SkyDesign =>
  SKY_DESIGNS[T.design] ?? (SKY_DESIGNS[0] as SkyDesign);
/** How far out a tower stands at height y over the street (its square's half-width). */
export function towerReach(T: TempleTower, y: number): number {
  return T.r * designOf(T).reach(Math.max(0, Math.min(1, y / T.top)));
}

const meshes = new Map<number, Built>();
/** Tower ti's mesh at the city's scale, its voids cut out, built once. */
export function towerMesh(ti: number): Built {
  const had = meshes.get(ti);
  if (had) return had;
  const T = TEMPLE_TOWERS[ti] as TempleTower;
  const m = new Carved(T.voids);
  buildSky(m, T.design, T.top, T.r, T.voids);
  const B = m.build();
  meshes.set(ti, B);
  return B;
}

/* ---------- the bridges ---------- */

/** A bridge's look: a plain deck, a bowstring arch over it, a lattice truss, an arch under it. */
export type BridgeStyle = 'deck' | 'arch' | 'lattice' | 'underarch';
/** A bridge between towers a and b (indices into TEMPLE_TOWERS), its deck at y over the street. */
export type TempleBridge = { a: number; b: number; y: number; style: BridgeStyle };

/**
 * The six (2026-11-14: "a big long bridge between them ... long spans, some arched, some straight
 * decks or lattice"): every tower joined, most spans seventy or more, all crossing the quarter so
 * they frame the view down it. Heights apart where two meet the same tower.
 */
export const TEMPLE_BRIDGES: TempleBridge[] = [
  { a: 1, b: 2, y: 128, style: 'lattice' },
  { a: 0, b: 2, y: 132, style: 'arch' },
  { a: 2, b: 3, y: 136, style: 'deck' },
  { a: 3, b: 4, y: 126, style: 'arch' },
  { a: 3, b: 5, y: 138, style: 'lattice' },
  { a: 4, b: 5, y: 134, style: 'underarch' },
];
/** Half a deck's width. */
export const DECK_HW = 1.3;
/** How high each style's structure reaches over and under its deck. */
export const STYLE_SPAN: Record<BridgeStyle, [number, number]> = {
  deck: [0, 1.2],
  arch: [0, 7],
  lattice: [0, 2.6],
  underarch: [-8, 1.2],
};

/** Where a bridge leaves tower a's wall and meets tower b's (tile-local), and its way. */
export function bridgeEnds(B: TempleBridge): { p: Vec3; q: Vec3; dir: [number, number] } {
  const A = TEMPLE_TOWERS[B.a] as TempleTower;
  const Z = TEMPLE_TOWERS[B.b] as TempleTower;
  const dx = Z.x - A.x;
  const dz = Z.z - A.z;
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  // From the axis to the square's wall along the way, a little inside it.
  const out = (T: TempleTower) => towerReach(T, B.y) / Math.max(Math.abs(ux), Math.abs(uz)) - 0.3;
  const a = out(A);
  const b = out(Z);
  return {
    p: [A.x + ux * a, G + B.y, A.z + uz * a],
    q: [Z.x - ux * b, G + B.y, Z.z - uz * b],
    dir: [ux, uz],
  };
}

const bridgeSets = new Map<number, StrokeSet>();
/** A bridge's strokes, built once: its deck's edges and rails, its style's structure, lamps along it. */
export function bridgeSet(bi: number): StrokeSet {
  const had = bridgeSets.get(bi);
  if (had) return had;
  const B = TEMPLE_BRIDGES[bi] as TempleBridge;
  const { p, q, dir } = bridgeEnds(B);
  const S = new Strokes(0.55);
  const len = Math.hypot(q[0] - p[0], q[2] - p[2]);
  // Along the deck s (0..len), across it c, up from it h.
  const at = (s: number, c: number, h: number): Vec3 => [
    p[0] + dir[0] * s - dir[1] * c,
    p[1] + h,
    p[2] + dir[1] * s + dir[0] * c,
  ];
  for (const c of [-DECK_HW, DECK_HW]) {
    S.line(at(0, c, 0), at(len, c, 0), 0, 0.32);
    S.line(at(0, c, 1.1), at(len, c, 1.1), 2, 0.2);
  }
  if (B.style === 'arch') {
    // A bowstring arch over each rail, hangers down to the deck every three.
    const rise = STYLE_SPAN.arch[1];
    for (const c of [-DECK_HW, DECK_HW]) {
      S.curve((u) => at(len * u, c, rise * 4 * u * (1 - u)), 24, 0, 0.3);
      for (let s = 3; s < len - 1; s += 3) {
        const u = s / len;
        S.line(at(s, c, 0), at(s, c, rise * 4 * u * (1 - u)), 2, 0.12);
      }
    }
  } else if (B.style === 'lattice') {
    // A box truss: top chords, zigzag sides, braces across its top.
    const H = STYLE_SPAN.lattice[1];
    const n = Math.max(4, Math.round(len / 2.6));
    for (const c of [-DECK_HW, DECK_HW]) {
      S.line(at(0, c, H), at(len, c, H), 0, 0.26);
      const zig: Vec3[] = [];
      for (let i = 0; i <= n; i++) zig.push(at((len * i) / n, c, i % 2 ? H : 0));
      S.poly(zig, 0, 0.18);
    }
    for (let i = 0; i <= n; i += 2)
      S.line(at((len * i) / n, -DECK_HW, H), at((len * i) / n, DECK_HW, H), 2, 0.14);
  } else if (B.style === 'underarch') {
    // An arch under the deck, springing from the towers' walls eight lower, posts up to the deck.
    const drop = -STYLE_SPAN.underarch[0];
    const under = (u: number) => -drop * (1 - 4 * u * (1 - u));
    for (const c of [-DECK_HW, DECK_HW]) {
      S.curve((u) => at(len * u, c, under(u)), 24, 0, 0.3);
      for (let s = 3; s < len - 1; s += 3) S.line(at(s, c, under(s / len)), at(s, c, 0), 2, 0.12);
    }
  }
  for (let s = 1.5; s < len; s += 3) S.dot(at(s, 0, 0.12), 1, 0.55);
  const built = S.build();
  bridgeSets.set(bi, built);
  return built;
}

/* ---------- walls ---------- */

/**
 * Whether a point is inside a Temple skyscraper (its square at each height, its voids open) or a
 * bridge's deck, `m` included: what the Ship slides along.
 */
export function skyscraperHolds(q: Vec3, m: number): boolean {
  const lx = planX(q[0]);
  const lz = wrap(q[2], TILE_Z);
  const A = LIFT_AREA;
  if (lx < A.x0 || lx > A.x1 || lz < A.z0 || lz > A.z1) return false;
  const y = q[1] - G;
  for (const T of TEMPLE_TOWERS) {
    if (y > T.top + m) continue;
    const dx = lx - T.x;
    const dz = lz - T.z;
    if (Math.abs(dx) > T.r + m || Math.abs(dz) > T.r + m) continue;
    const e = towerReach(T, y) + m;
    if (Math.abs(dx) < e && Math.abs(dz) < e && !inVoid(T.voids, dx, y, dz, m)) return true;
  }
  for (let bi = 0; bi < TEMPLE_BRIDGES.length; bi++) {
    const B = TEMPLE_BRIDGES[bi] as TempleBridge;
    const hi = B.style === 'lattice' ? STYLE_SPAN.lattice[1] + 0.3 : 0.6;
    if (y < B.y - 0.4 - m || y > B.y + hi + m) continue;
    const { p, q: e, dir } = bridgeEnds(B);
    const rx = lx - p[0];
    const rz = lz - p[2];
    const along = rx * dir[0] + rz * dir[1];
    const len = Math.hypot(e[0] - p[0], e[2] - p[2]);
    if (along < -m || along > len + m) continue;
    if (Math.abs(-rx * dir[1] + rz * dir[0]) < DECK_HW + m) return true;
  }
  return false;
}

/* ---------- drawn ---------- */

/** Sites a tower is drawn with: enough to read from far off down the quarter. */
export const TOWER_SITES = 3600;
/** Each tower's tint: the quarter's ivory, leaning gold or warm, its own. */
const tintOf = (ti: number) => mix(C.ivory, ti % 2 ? C.gold : C.warm, 0.25 + 0.2 * hash(ti, 881));

/**
 * The Temple skyscrapers within R and their bridges within `near` (+ 220: they frame the view from
 * well back), as the Ship's items. `lift`: brighter seen from high up, as the landmarks are.
 */
export function skyscraperItems(
  eye: Vec3,
  t: number,
  R: number,
  near: number,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
  lift = 1,
) {
  TEMPLE_TOWERS.forEach((T, ti) => {
    copiesNear(T.x, T.z, eye, R, (x, z, n) => {
      if (Math.hypot(x - eye[0], z - eye[2]) > R + T.r) return;
      if (!ahead(x, z, T.r + 12) && eye[1] < G + 80) return;
      const P = {
        B: towerMesh(ti),
        at: [x, G, z] as Vec3,
        sh: 1,
        sv: 1,
        palette: quarterPalette(tintOf(ti)),
        k: lift,
      };
      const r = T.r;
      const dx = Math.max(0, Math.abs(eye[0] - x) - r);
      const dz = Math.max(0, Math.abs(eye[2] - z) - r);
      const dy = Math.max(0, eye[1] - (G + T.top), G - eye[1]);
      out.push({
        d: Math.hypot(dx, dy, dz),
        gid: mixId(ti + 41, n * 5 + 3),
        count: TOWER_SITES,
        weight: 1.5,
        probe: [
          [x, G + T.top * 0.9, z],
          [x, G + T.top * 0.55, z],
          [x, G + T.top * 0.2, z],
        ],
        site: (s, o) => stretchSite(P, s, t, eye, o),
      });
    });
  });
  const reach = Math.min(R, near + 220);
  TEMPLE_BRIDGES.forEach((B, bi) => {
    const A = TEMPLE_TOWERS[B.a] as TempleTower;
    const Z = TEMPLE_TOWERS[B.b] as TempleTower;
    const mx = (A.x + Z.x) / 2;
    const mz = (A.z + Z.z) / 2;
    copiesNear(mx, mz, eye, reach, (x, z, n) => {
      const half = Math.hypot(Z.x - A.x, Z.z - A.z) / 2;
      if (Math.hypot(x - eye[0], z - eye[2]) > reach + half) return;
      if (!ahead(x, z, half + 10) && eye[1] < G + 80) return;
      const tones = bridgeTones(t, bi);
      const it = strokeItem(
        bridgeSet(bi),
        x - mx,
        z - mz,
        tones,
        lift,
        eye,
        t,
        mixId(bi + 61, n),
        1.8,
        0.12,
      );
      if (it.d < reach) out.push(it);
    });
  });
}

/** A bridge's three tones now: ivory leaning slowly to gold, a warm lamp, a pale white. */
function bridgeTones(t: number, bi: number) {
  const lean = 0.5 + 0.5 * Math.sin(0.04 * t + bi * 1.3);
  return [
    mix(C.ivory, C.gold, 0.2 + 0.35 * lean),
    mix(C.warm, C.ivory, 0.3),
    mix(C.white, C.ivory, 0.3),
  ];
}
