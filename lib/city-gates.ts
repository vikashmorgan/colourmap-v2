/*
 * The quarters' gates (docs/specs/art-city.md, "Alive quarters", 2026-11-14): "more big gates like
 * Chinatown's, one in several other quarters, each in its quarter's own style." One gate stands
 * across a wide side street of each quarter (Chinatown keeps its own), near where the quarter
 * begins, its posts at the street's walls and its lowest beam well over the street channels'
 * heights, so the ships and you fly through it. Each is drawn in strokes of light in its quarter's
 * tones (lib/city-strokes.ts), with the quarter's name on its lintel. Light only: nothing blocks.
 * Pure: no three.js, no DOM.
 */

import type { Vec3 } from './bigbang';
import {
  type Ahead,
  QUARTER_TONE,
  quarterTones,
  solidTower,
  type TowerAt,
} from './city-alive-base';
import type { FaceId } from './city-font';
import { textPixels } from './city-font';
import {
  BLOCK_X,
  BLOCK_Z,
  C,
  clamp,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { wordItem } from './city-signs';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';

const G = GROUND;

export type GateStyle =
  | 'mughal'
  | 'horseshoe'
  | 'portal'
  | 'venetian'
  | 'sun'
  | 'gopuram'
  | 'gantry'
  | 'onion'
  | 'pylon'
  | 'neon'
  | 'wire';

/** A quarter's gate: its quarter, the side street it spans (tile-local line), the row it stands in. */
export type Gate = {
  d: string;
  line: number;
  row: number;
  style: GateStyle;
  name: string;
  face: FaceId;
};

/**
 * The gates, tile-local: across the wide street two lines off the avenue (x ±52), in the middle
 * of each quarter's first-but-one row, away from the crossing streets.
 */
export const GATES: Gate[] = [
  { d: 'indian', line: -2, row: 9, style: 'mughal', name: 'INDIAN QUARTER', face: 'sign' },
  { d: 'oriental', line: 2, row: 9, style: 'horseshoe', name: 'ORIENTAL QUARTER', face: 'deco' },
  { d: 'heights', line: -2, row: 17, style: 'portal', name: 'THE HEIGHTS', face: 'tall' },
  { d: 'canals', line: 2, row: 17, style: 'venetian', name: 'THE CANALS', face: 'deco' },
  { d: 'golden', line: -2, row: 25, style: 'sun', name: 'GOLDEN QUARTER', face: 'deco' },
  { d: 'temples', line: 2, row: 25, style: 'gopuram', name: 'TEMPLES', face: 'sign' },
  { d: 'industrial', line: -2, row: 33, style: 'gantry', name: 'WORKS', face: 'tall' },
  { d: 'domes', line: 2, row: 33, style: 'onion', name: 'DOMES', face: 'deco' },
  { d: 'egypt', line: -2, row: 41, style: 'pylon', name: 'EGYPT', face: 'sign' },
  { d: 'market', line: 2, row: 41, style: 'neon', name: 'NEON MARKET', face: 'deco' },
  { d: 'code', line: 2, row: 49, style: 'wire', name: 'MATRIX', face: 'tall' },
];

/** The lowest any beam of a gate comes over the street: the street channels fly at 5 and 11. */
export const GATE_BEAM = 20;
/** How tall a gate's frame stands (its crown may rise over it). */
export const GATE_H = 38;

/** Where a gate stands, tile-local: its street's line (x), its middle (z), half its span. */
export function gatePlace(g: Gate, towerAt: TowerAt): { x: number; z: number; w: number } {
  const x = g.line * BLOCK_X;
  const z = (g.row + 0.5) * BLOCK_Z;
  const A = towerAt(g.line - 1, g.row);
  const B = towerAt(g.line, g.row);
  const ga = solidTower(A) ? x - (A.x + A.hx) : 10;
  const gb = solidTower(B) ? B.x - B.hx - x : 10;
  return { x, z, w: clamp(Math.min(ga, gb) - 0.6, 5, 11) };
}

const sets = new Map<string, StrokeSet>();

/** A gate's strokes, built once, tile-local, its posts at x ± w. */
export function gateSet(g: Gate, x: number, z: number, w: number): StrokeSet {
  const key = `${g.style} ${x} ${z} ${w}`;
  const had = sets.get(key);
  if (had) return had;
  const S = new Strokes(0.55);
  const dz = 0.8;
  const P = (u: number, y: number, f = 0): Vec3 => [x + u, G + y, z + f];
  /** A line on both faces of the gate. */
  const both = (a: [number, number], b: [number, number], tone: number, k: number) => {
    for (const f of [-dz, dz]) S.line(P(a[0], a[1], f), P(b[0], b[1], f), tone, k);
  };
  /** A curve (u, y) on both faces. */
  const bothCurve = (f: (s: number) => [number, number], n: number, tone: number, k: number) => {
    for (const fz of [-dz, dz])
      S.curve(
        (s) => {
          const [u, y] = f(s);
          return P(u, y, fz);
        },
        n,
        tone,
        k,
      );
  };
  /** A post at u: four corner lines up to `top`, rings every 4. */
  const post = (u: number, top: number, half = 0.7) => {
    for (const [a, b] of [
      [-half, -dz],
      [half, -dz],
      [half, dz],
      [-half, dz],
    ] as const)
      S.line(P(u + a, 0, b), P(u + a, top, b), 0, 0.3);
    for (let y = 4; y < top; y += 4)
      S.poly(
        [
          P(u - half, y, -dz),
          P(u + half, y, -dz),
          P(u + half, y, dz),
          P(u - half, y, dz),
          P(u - half, y, -dz),
        ],
        2,
        0.12,
      );
  };
  /** A small dome on a post top at (u, y), radius r: four meridians and a finial. */
  const dome = (u: number, y: number, r: number, onion = false) => {
    for (let m = 0; m < 4; m++) {
      const a = (m / 4) * Math.PI;
      S.curve(
        (s) => {
          const th = s * Math.PI;
          // An onion swells out low and draws to a point; a plain dome is a half ball.
          const rr = r * Math.cos(th) * (onion ? 1 + 0.4 * Math.sin(th) ** 2 : 1);
          const up = r * 1.4 * (onion ? Math.sin(th) ** 0.7 : Math.sin(th));
          return [x + u + Math.cos(a) * rr, G + y + up, z + Math.sin(a) * rr];
        },
        10,
        0,
        0.24,
      );
    }
    S.line(P(u, y + r * 1.4, 0), P(u, y + r * 1.4 + 1.6, 0), 1, 0.4);
  };
  const H = GATE_H;
  const B = GATE_BEAM;
  switch (g.style) {
    case 'mughal': {
      // A pointed arch between the posts, a frame round it, little domes on the posts.
      post(-w, H);
      post(w, H);
      const rise = Math.min(14, w * 1.2);
      for (const side of [-1, 1])
        bothCurve(
          (s) => {
            const a = s * (Math.PI / 2);
            return [side * (w - 0.7) * (1 - Math.sin(a) ** 1.4), B + rise * Math.sin(a)];
          },
          12,
          0,
          0.32,
        );
      both([-w, H - 3], [w, H - 3], 1, 0.3);
      both([-w, H], [w, H], 0, 0.3);
      dome(-w, H, 1.6);
      dome(w, H, 1.6);
      dome(0, H, 2.4);
      break;
    }
    case 'horseshoe': {
      post(-w, H);
      post(w, H);
      const r = w * 0.85;
      bothCurve(
        (s) => {
          const a = -0.35 + s * (Math.PI + 0.7);
          return [Math.cos(a) * r, B + 6 + Math.sin(a) * r];
        },
        20,
        0,
        0.32,
      );
      both([-w, H], [w, H], 0, 0.3);
      // A crescent over the middle.
      bothCurve(
        (s) => {
          const a = 0.6 + s * 4.6;
          return [Math.cos(a) * 1.8, H + 3 + Math.sin(a) * 1.8];
        },
        10,
        1,
        0.4,
      );
      break;
    }
    case 'portal': {
      // A tall glass frame, a frame within it, braces in its top band.
      post(-w, H + 6, 0.5);
      post(w, H + 6, 0.5);
      both([-w, H + 6], [w, H + 6], 0, 0.32);
      both([-w, B + 4], [w, B + 4], 0, 0.28);
      both([-w + 1.5, B + 6], [w - 1.5, B + 6], 2, 0.16);
      both([-w + 1.5, H + 4.5], [w - 1.5, H + 4.5], 2, 0.16);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const u0 = -w + (2 * w * i) / n;
        const u1 = -w + (2 * w * (i + 1)) / n;
        both([u0, B + 4], [u1, H + 6], 2, 0.12);
        both([u1, B + 4], [u0, H + 6], 2, 0.12);
      }
      break;
    }
    case 'venetian': {
      // A round arch between two bell towers, their caps pointed.
      post(-w, H + 8, 1.1);
      post(w, H + 8, 1.1);
      bothCurve(
        (s) => [-Math.cos(s * Math.PI) * (w - 1.1), B + 4 + Math.sin(s * Math.PI) * (w - 1.1)],
        18,
        0,
        0.32,
      );
      both([-w, B + 4 + w], [w, B + 4 + w], 1, 0.26);
      for (const u of [-w, w]) {
        for (const [a, b] of [
          [-1.1, -1.1],
          [1.1, -1.1],
          [1.1, 1.1],
          [-1.1, 1.1],
        ] as const)
          S.line([x + u + a, G + H + 8, z + b], [x + u, G + H + 13, z], 0, 0.3);
        S.dot([x + u, G + H + 5, z], 1, 0.6);
      }
      break;
    }
    case 'sun': {
      // A half sun: an arch, its rays out to an outer arch.
      post(-w, B + w);
      post(w, B + w);
      const r0 = w - 0.7;
      const r1 = w + 4;
      bothCurve(
        (s) => [-Math.cos(s * Math.PI) * r0, B + 2 + Math.sin(s * Math.PI) * r0],
        18,
        0,
        0.34,
      );
      bothCurve(
        (s) => [-Math.cos(s * Math.PI) * r1, B + 2 + Math.sin(s * Math.PI) * r1],
        22,
        1,
        0.26,
      );
      for (let i = 1; i < 12; i++) {
        const a = (i / 12) * Math.PI;
        both(
          [-Math.cos(a) * r0, B + 2 + Math.sin(a) * r0],
          [-Math.cos(a) * r1, B + 2 + Math.sin(a) * r1],
          1,
          0.2,
        );
      }
      break;
    }
    case 'gopuram': {
      // A stepped tower of tiers over the lintel, narrowing to a crown.
      post(-w, B + 4);
      post(w, B + 4);
      both([-w - 1, B + 4], [w + 1, B + 4], 0, 0.34);
      let y = B + 4;
      for (let i = 0; i < 6; i++) {
        const half = (w + 1) * (1 - i / 7);
        const h = 3.2 - i * 0.25;
        both([-half, y], [-half * 0.94, y + h], 0, 0.26);
        both([half, y], [half * 0.94, y + h], 0, 0.26);
        both([-half * 0.94, y + h], [half * 0.94, y + h], i % 2 ? 1 : 0, 0.26);
        y += h;
      }
      S.line(P(0, y, 0), P(0, y + 2.5, 0), 1, 0.5);
      break;
    }
    case 'gantry': {
      // A steel truss over the street on lattice towers.
      for (const u of [-w, w]) {
        post(u, H - 4, 0.9);
        const pts: Vec3[] = [];
        for (let y = 0, i = 0; y <= H - 4; y += 2.4, i++)
          pts.push(P(u + (i % 2 ? 0.9 : -0.9), y, 0));
        S.poly(pts, 2, 0.14);
      }
      const y0 = H - 9;
      const y1 = H - 4;
      both([-w - 1, y0], [w + 1, y0], 0, 0.3);
      both([-w - 1, y1], [w + 1, y1], 0, 0.3);
      const n = Math.max(4, Math.round((2 * w) / 2.2));
      for (let i = 0; i < n; i++) {
        const u0 = -w + (2 * w * i) / n;
        const u1 = -w + (2 * w * (i + 1)) / n;
        both([u0, i % 2 ? y1 : y0], [u1, i % 2 ? y0 : y1], 2, 0.16);
      }
      for (let i = 0; i <= 4; i++) S.dot(P(-w + (2 * w * i) / 4, y0 - 0.4, 0), 1, 0.6);
      break;
    }
    case 'onion': {
      // A hanging arch (a catenary) between posts crowned with onion domes.
      post(-w, H - 6);
      post(w, H - 6);
      const a = w * 0.55;
      const sag = Math.cosh((w - 0.7) / a) - 1;
      bothCurve(
        (s) => {
          const u = (s * 2 - 1) * (w - 0.7);
          return [u, H - 6 - ((Math.cosh(u / a) - 1) / sag) * (H - 6 - B)];
        },
        20,
        0,
        0.32,
      );
      dome(-w, H - 6, 1.8, true);
      dome(w, H - 6, 1.8, true);
      break;
    }
    case 'pylon': {
      // Two leaning pylons, a lintel between with a winged sun.
      for (const side of [-1, 1]) {
        const u0 = side * w;
        const ub = side * (w + 4);
        const ut = side * (w + 2.6);
        const ui = side * (w - 0.4);
        both([u0, 0], [ui, H - 6], 0, 0.3);
        both([ub, 0], [ut, H - 6], 0, 0.3);
        both([ui, H - 6], [ut, H - 6], 1, 0.3);
        for (let y = 6; y < H - 6; y += 6)
          both([u0 + (ui - u0) * (y / (H - 6)), y], [ub + (ut - ub) * (y / (H - 6)), y], 2, 0.12);
      }
      both([-w, H - 10], [w, H - 10], 0, 0.3);
      both([-w, H - 7], [w, H - 7], 0, 0.3);
      bothCurve((s) => [Math.cos(s * TAU) * 1.2, H - 8.5 + Math.sin(s * TAU) * 1.2], 12, 1, 0.5);
      for (const side of [-1, 1])
        bothCurve(
          (s) => [side * (1.4 + s * (w - 2)), H - 8.5 + 0.9 * Math.sin(s * Math.PI)],
          10,
          1,
          0.3,
        );
      break;
    }
    case 'neon': {
      // Three frames staggered in depth: the outer on the ground, the inner two hung over the
      // street from it, each closed under at the beam's height or higher.
      for (let i = 0; i < 3; i++) {
        const half = w - i * 1.2;
        const top = H - i * 3;
        const foot = i === 0 ? 0 : B + i * 2;
        const f = (i - 1) * 1.6;
        S.poly(
          [P(-half, foot, f), P(-half, top, f), P(half, top, f), P(half, foot, f)],
          i === 1 ? 2 : 0,
          0.3,
        );
        S.line(P(-half, B + i * 2, f), P(half, B + i * 2, f), 1, 0.2);
      }
      for (let i = 1; i < 3; i++) S.line(P(-w, H - i * 3, 0), P(w, H - i * 3, 0), 0, 0.12);
      break;
    }
    case 'wire': {
      // A wireframe portal: front and back frames, their corners joined, a grid on its top.
      const D = 2;
      for (const f of [-D, D]) S.poly([P(-w, 0, f), P(-w, H, f), P(w, H, f), P(w, 0, f)], 0, 0.3);
      for (const u of [-w, w]) S.line(P(u, H, -D), P(u, H, D), 0, 0.3);
      for (let u = -w + 2; u < w; u += 2) S.line(P(u, H, -D), P(u, H, D), 2, 0.12);
      for (const f of [-D, D]) S.line(P(-w, B + 6, f), P(w, B + 6, f), 2, 0.14);
      break;
    }
  }
  const built = S.build();
  if (sets.size > 400) sets.clear();
  sets.set(key, built);
  return built;
}

/** The gates within sight, and their names. */
export function gateItems(
  eye: Vec3,
  t: number,
  R: number,
  towerAt: TowerAt,
  ahead: Ahead,
  out: Item[],
) {
  const ox0 = nearest(0, eye[0], TILE_X);
  GATES.forEach((g, gi) => {
    for (const ox of [ox0 - TILE_X, ox0, ox0 + TILE_X]) {
      const gx = ox + g.line * BLOCK_X;
      if (Math.abs(gx - eye[0]) > R) continue;
      const gz = nearest((g.row + 0.5) * BLOCK_Z, eye[2], TILE_Z);
      if (Math.abs(gz - eye[2]) > R) continue;
      if (!ahead(gx, gz, 20)) continue;
      const oz = gz - (g.row + 0.5) * BLOCK_Z;
      const p = gatePlace(g, towerAt);
      const S = gateSet(g, p.x, p.z, p.w);
      const it = strokeItem(
        S,
        ox,
        oz,
        quarterTones(g.d, t, gi),
        1,
        eye,
        t,
        mixId(gi + 7, Math.round(oz)),
        2.2,
      );
      if (it.d > R) continue;
      out.push(it);
      if (it.d > 160) continue;
      const T = textPixels(g.name, { face: g.face });
      const px = Math.min(0.34, (p.w * 1.5) / T.w);
      const tone = QUARTER_TONE[g.d] ?? C.warm;
      const top = g.style === 'gopuram' || g.style === 'sun' ? GATE_BEAM + 3.4 : GATE_H - 0.6;
      out.push(
        wordItem(
          {
            text: g.name,
            at: [gx - (T.w * px) / 2, G + top, gz + 0.9],
            px,
            rgb: tone,
            rgb2: mix(tone, C.white, 0.4),
            key: 9700 + gi,
            face: g.face,
            frame: 'line',
          },
          eye,
          t,
        ),
      );
    }
  });
}
