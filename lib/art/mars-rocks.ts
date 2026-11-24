/**
 * Drive, Mars: the rock fields (docs/specs/mars-world.md, "Terrain to race in"). Pure: where the
 * mesas, hoodoo spires, boulders and natural rock arches stand round the canyons, and the rock
 * slabs that throw you as natural jumps. Placement only; lib/art/mars.ts keeps each where it
 * leaves the open ways clear and makes the rocks solid.
 *
 * 2026-11-24: "some canyons and rocks and stuff like that".
 *
 * - Mesas: flat-topped buttes on the canyons' rims, alternating sides, so a canyon runs between
 *   cliffs.
 * - Spires: tall thin hoodoos in clusters on the rims.
 * - Boulders: gardens on the gorges' wide floors, off the racing line, to weave between.
 * - Rock arches: natural arches straddling a canyon's floor, its feet at the walls' foot; the way
 *   under is open.
 * - Jump slabs: tilted rock slabs on the canyons' line and out on the desert by the canyons'
 *   mouths, as kickers (lib/art/mars-ramps.ts) in rock.
 */

import { CANYON_BANK, CANYONS, type CanyonArc, canyonPoint } from '@/lib/art/mars-canyons';

export type RockKind = 'mesa' | 'spire' | 'boulder' | 'foot';

export interface Rock {
  x: number;
  y: number;
  /** Footprint radius (m), solid; and how tall it stands (m). */
  r: number;
  h: number;
  kind: RockKind;
  seed: number;
}

export interface RockArch {
  x: number;
  y: number;
  /** The way under it (rad), its half-span (m: centre to each foot). */
  h: number;
  r: number;
}

export interface Slab {
  x: number;
  y: number;
  h: number;
}

function hash(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A point off a canyon arc: `f` along it, `off` m to its left (negative: right). */
function offArc(a: CanyonArc, f: number, off: number): { x: number; y: number; h: number } {
  const p = canyonPoint(a, f);
  return { x: p.x - Math.sin(p.h) * off, y: p.y + Math.cos(p.h) * off, h: p.h };
}

/** The floor's half-width and depth f along an arc. */
function arcAt(a: CanyonArc, f: number): { w: number; d: number } {
  const e = f * f * (3 - 2 * f);
  return { w: a.w0 + (a.w1 - a.w0) * e, d: a.d0 + (a.d1 - a.d0) * e };
}

/**
 * The rock fields round the canyons: candidates, each still to be kept clear by the caller.
 * `clear(x, y, r)` says whether a footprint leaves the open ways (and the canyons' cuts) clear.
 */
export function placeRocks(clear: (x: number, y: number, r: number) => boolean): {
  rocks: Rock[];
  arches: RockArch[];
  slabs: Slab[];
} {
  const rocks: Rock[] = [];
  const arches: RockArch[] = [];
  const slabs: Slab[] = [];
  const free = (x: number, y: number, r: number) =>
    rocks.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 6);
  CANYONS.forEach((arcs, ci) => {
    arcs.forEach((a, ai) => {
      const len = Math.abs(a.sweep) * a.R;
      // Mesas and spires along the rims, every 140 m or so, alternating sides.
      const n = Math.max(1, Math.floor(len / 140));
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        const { w, d } = arcAt(a, f);
        if (d < 8) continue;
        const side = (i + ai) % 2 ? 1 : -1;
        const seed = hash(ci, ai, i);
        if (seed < 0.6) {
          const r = 24 + 34 * hash(ci, ai, i + 50);
          const p = offArc(a, f, side * (w + CANYON_BANK + 26 + r));
          if (clear(p.x, p.y, r) && free(p.x, p.y, r))
            rocks.push({ x: p.x, y: p.y, r, h: 22 + 26 * seed, kind: 'mesa', seed });
        } else {
          for (let k = 0; k < 4; k++) {
            const r = 3.5 + 2.5 * hash(ci * 7 + k, ai, i);
            const p = offArc(
              a,
              Math.min(1, Math.max(0, f + (k - 1.5) * 0.04)),
              side * (w + CANYON_BANK + 30 + 16 * hash(k, ai, i + 9)),
            );
            if (clear(p.x, p.y, r) && free(p.x, p.y, r))
              rocks.push({
                x: p.x,
                y: p.y,
                r,
                h: 18 + 22 * hash(k, ci, i + 3),
                kind: 'spire',
                seed: hash(k, i, ai),
              });
          }
        }
      }
      // Boulder gardens on the wide gorge floors, off the line (a lane 26 m either side of it
      // stays open).
      const gorge = Math.max(a.w0, a.w1) >= 60;
      if (gorge) {
        for (let i = 0; i < 46; i++) {
          const f = hash(i, ai, ci + 20);
          const { w } = arcAt(a, f);
          if (w < 40) continue;
          const side = hash(i, ai, ci + 21) < 0.5 ? -1 : 1;
          const off = side * (26 + (w - 26) * hash(i, ai, ci + 22));
          const r = 1.6 + 3.8 * hash(i, ai, ci + 23) ** 2;
          const p = offArc(a, f, off);
          if (free(p.x, p.y, r))
            rocks.push({ x: p.x, y: p.y, r, h: r * 1.5, kind: 'boulder', seed: hash(i, 1, ai) });
        }
        // A slab in the middle of the gorge to jump.
        const p = offArc(a, 0.45, 0);
        slabs.push({ x: p.x, y: p.y, h: p.h });
      }
      // A natural arch over the narrow, deep stretches.
      if (!gorge && arcAt(a, 0.5).d >= 22 && ai % 2 === 1) {
        const p = offArc(a, 0.5, 0);
        const r = arcAt(a, 0.5).w + 12;
        arches.push({ x: p.x, y: p.y, h: p.h, r });
      }
    });
    // Out of each canyon's mouth, two slabs on the open desert.
    const last = arcs[arcs.length - 1];
    for (const u of [160, 420]) {
      slabs.push({
        x: last.x1 + Math.cos(last.h1) * u,
        y: last.y1 + Math.sin(last.h1) * u,
        h: last.h1,
      });
    }
  });
  return { rocks, arches, slabs };
}

/** A rock arch's two feet, solid (the way between them is open). */
export function rockArchFeet(a: RockArch): Rock[] {
  const px = -Math.sin(a.h) * a.r;
  const py = Math.cos(a.h) * a.r;
  return [-1, 1].map((s) => ({
    x: a.x + px * s,
    y: a.y + py * s,
    r: 4,
    h: 10,
    kind: 'foot' as const,
    seed: 0.5,
  }));
}
