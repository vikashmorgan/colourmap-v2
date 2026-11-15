/*
 * LED arrows on the towers of the City of Dreams (docs/specs/art-city.md, "Boost rings, LED arrows
 * and the big fireworks", 2026-11-15). Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "A bunch of arrows on some of the buildings that create a feeling of speed,
 * pointing the direction, as an LED design element." And: "Perspective is everything."
 *
 * Rows of chevrons on tower faces along the streets, pointing the way the street's traffic flows
 * (lib/city-flow.ts: every street one way, the next the other; the cross streets the same; the
 * currents of lib/city-currents.ts on the same rules). Some run along a tower's top, under its
 * roof, some down its facade lower on. Each chevron lights in turn, a soft wave running along the
 * street the way the traffic goes, at about its pace; the wave is one along the whole street, so
 * down a street the arrows on tower after tower run together toward the vanishing point. Mellow:
 * a dim glow always, brighter as the wave passes, never a blink or a flash.
 *
 * Most along the two racing corridors (x ±78), fewer on the other streets and cross streets, none
 * on the Grand Avenue (it keeps its own lights) or in Chinatown. Only on plain towers, flat on
 * their faces, where the face stands over an open street.
 */

import type { RGB, Vec3 } from './bigbang';
import { hash } from './bigbang';
import { copiesNear } from './city-big';
import { CORRIDOR_LINES } from './city-corridors';
import { xStreetWay, zStreetWay } from './city-flow';
import { blocked, blockTower, DISTRICTS } from './city-game';
import { C, GROUND, type Item, mix, mixId, STRIP_I, TAU, TILE_J } from './city-grid';

/** A row of chevrons on a tower's face. */
export type ArrowPanel = {
  /** Its middle on the face, tile-local (a little out from the wall). */
  c: Vec3;
  /** The axis the street runs along (2: along z, 0: along x), and the way its traffic flows. */
  axis: 0 | 2;
  sgn: 1 | -1;
  /** The street line it looks across at: x = line · BLOCK_X along z, z = line · BLOCK_Z along x. */
  line: number;
  /** Which way the face looks, across the street's axis (+1 or -1). */
  out: 1 | -1;
  /** How many chevrons, and its quarter's colour. */
  n: number;
  colour: RGB;
  /** Along a tower's top, or down its facade. */
  roof: boolean;
  /** On a racing corridor. */
  corridor: boolean;
  key: number;
};

/** A chevron's spacing along the row, its depth along it and its half height. */
export const CHEVRON_GAP = 3.2;
const CHEVRON_DEPTH = 1.3;
const CHEVRON_HALF = 1.4;
/** Lights along each arm of a chevron. */
const ARM = 5;
const SITES_PER = 2 * ARM;
/** The wave: its length along the street, and how often it passes (so it runs at about 8 a second). */
export const WAVE = 4 * CHEVRON_GAP;
export const WAVE_RATE = 0.65;

/**
 * The wave's phase at a point s along a street flowing sgn, at time t: a whole number at each
 * crest. As t grows the crests move along s the way the traffic flows.
 */
export const arrowPhase = (sgn: 1 | -1, s: number, t: number) => WAVE_RATE * t - (sgn * s) / WAVE;
/** How lit a chevron at s is at time t, 0..1: a soft crest, never a blink. */
export function arrowGlow(sgn: 1 | -1, s: number, t: number): number {
  const w = 0.5 + 0.5 * Math.cos(TAU * arrowPhase(sgn, s, t));
  return w * w * w;
}

/** How likely a tower face is to wear arrows: on a corridor, on another street, on a cross street. */
const SHARE_CORRIDOR = 0.6;
const SHARE_STREET = 0.16;
const SHARE_CROSS = 0.12;
const corridorLine = (L: number) => (CORRIDOR_LINES as readonly number[]).includes(L);

let panels: ArrowPanel[] | null = null;
/** Every row of arrows, tile-local, on the strip's plain towers along their streets. */
export function arrowPanels(): ArrowPanel[] {
  if (panels) return panels;
  const out: ArrowPanel[] = [];
  const add = (p: Omit<ArrowPanel, 'key'>) => {
    // The face must be there, and the street before it open, the whole row long.
    const half = (p.n * CHEVRON_GAP) / 2;
    const across = p.axis === 2 ? 0 : 2;
    for (const f of [-1, 0, 1]) {
      const inside: Vec3 = [p.c[0], p.c[1], p.c[2]];
      inside[p.axis] += f * half;
      const outside: Vec3 = [inside[0], inside[1], inside[2]];
      inside[across] -= p.out * 0.6;
      outside[across] += p.out * 3;
      for (const dy of [-CHEVRON_HALF, CHEVRON_HALF]) {
        if (!blocked([inside[0], inside[1] + dy, inside[2]])) return;
        if (blocked([outside[0], outside[1] + dy, outside[2]])) return;
      }
    }
    out.push({ ...p, key: mixId(out.length, 9191) });
  };
  for (let I = -STRIP_I / 2; I < STRIP_I / 2; I++)
    for (let J = 0; J < TILE_J; J++) {
      const tw = blockTower(I, J);
      // Chinatown keeps its tiered towers and its own red and gold.
      if (tw.shape !== 'box' || tw.bore || tw.h < 22 || tw.d === 'chinatown') continue;
      const colour = DISTRICTS[tw.d].colour;
      const len = (h: number) => Math.min(9, Math.floor((2 * h - 3) / CHEVRON_GAP));
      // A roof row, a facade row, or both on a tall tower; their heights.
      const rows = (seed: number): [boolean, number][] => {
        const r = hash(seed, 3);
        const roof: [boolean, number] = [true, GROUND + tw.h - 2.6];
        const face: [boolean, number] = [false, GROUND + 9 + (tw.h - 22) * 0.45 * hash(seed, 4)];
        return r < 0.45 ? [roof] : r < 0.8 || tw.h < 50 ? [face] : [roof, face];
      };
      // Faces along z, looking across at the street lines I (low face) and I + 1 (high face).
      for (const side of [-1, 1] as const) {
        const L = side < 0 ? I : I + 1;
        if (L === 0) continue;
        const seed = mixId(I * 131 + J, side * 7 + 11);
        const corridor = corridorLine(L);
        if (hash(seed, 1) >= (corridor ? SHARE_CORRIDOR : SHARE_STREET)) continue;
        const n = len(tw.hz);
        if (n < 3) continue;
        for (const [roof, y] of rows(seed))
          add({
            c: [tw.x + side * (tw.hx + 0.25), y, tw.z],
            axis: 2,
            sgn: zStreetWay(L),
            line: L,
            out: side,
            n,
            colour,
            roof,
            corridor,
          });
      }
      // Faces along x, looking across at the cross streets J (low face) and J + 1 (high face).
      for (const side of [-1, 1] as const) {
        const L = side < 0 ? J : J + 1;
        const seed = mixId(I * 137 + J, side * 5 + 29);
        if (hash(seed, 1) >= SHARE_CROSS) continue;
        const n = len(tw.hx);
        if (n < 3) continue;
        for (const [roof, y] of rows(seed))
          add({
            c: [tw.x, y, tw.z + side * (tw.hz + 0.25)],
            axis: 0,
            sgn: xStreetWay(L),
            line: L,
            out: side,
            n,
            colour,
            roof,
            corridor: false,
          });
      }
    }
  panels = out;
  return out;
}

/** How many sites a row has. */
export const panelSites = (p: ArrowPanel) => p.n * SITES_PER;

/** A row's tone: its quarter's colour leaning warm, the corridors' a little warmer. */
const tones = new WeakMap<ArrowPanel, RGB>();
function toneOf(p: ArrowPanel): RGB {
  let c = tones.get(p);
  if (!c) {
    c = mix(mix(p.colour, C.amber, p.corridor ? 0.4 : 0.25), C.warm, 0.15);
    tones.set(p, c);
  }
  return c;
}

/**
 * Site s of row p (its copy's middle at c) at time t: chevron i's arm, from its tip (pointing the
 * way the street flows) back to its end above or below. Lit by the street's one wave. No
 * allocation.
 */
export function arrowSite(p: ArrowPanel, c: Vec3, s: number, t: number, o: number[]): boolean {
  const i = Math.floor(s / SITES_PER);
  const q = s % SITES_PER;
  const up = q < ARM ? 1 : -1;
  const v = (q % ARM) / (ARM - 1);
  const mid = (i + 0.5 - p.n / 2) * CHEVRON_GAP;
  const along = mid + p.sgn * CHEVRON_DEPTH * (0.5 - v);
  o[0] = c[0] + (p.axis === 0 ? along : 0);
  o[1] = c[1] + up * CHEVRON_HALF * v;
  o[2] = c[2] + (p.axis === 2 ? along : 0);
  // The wave along the street (world coordinates, so tower after tower runs as one).
  const g = arrowGlow(p.sgn, c[p.axis] + mid, t);
  const k = (p.roof ? 0.12 : 0.1) + 0.36 * g;
  const tone = toneOf(p);
  o[3] = tone[0] * k;
  o[4] = tone[1] * k;
  o[5] = tone[2] * k;
  return true;
}

/** How far down a street the arrows are drawn, and at most how many rows: the nearest. */
export const ARROW_REACH = 340;
export const MOST_ARROWS = 36;

/**
 * The rows of arrows within sight, as the Ship's items: ahead of the eye, out to ARROW_REACH (down
 * a corridor, rows on both walls receding to its end); none from high over the towers' sky.
 */
export function arrowItems(eye: Vec3, fwd: Vec3, t: number, R: number): Item[] {
  if (eye[1] > GROUND + 320) return [];
  const reach = Math.min(R, ARROW_REACH);
  const out: Item[] = [];
  const P = arrowPanels();
  for (let k = 0; k < P.length; k++) {
    const p = P[k] as ArrowPanel;
    copiesNear(p.c[0], p.c[2], eye, reach, (x, z, n) => {
      const rx = x - eye[0];
      const ry = p.c[1] - eye[1];
      const rz = z - eye[2];
      const d = Math.max(0, Math.hypot(rx, ry, rz) - (p.n * CHEVRON_GAP) / 2);
      if (d > reach || rx * fwd[0] + ry * fwd[1] + rz * fwd[2] < -12) return;
      // Seen only from the street it faces (from behind its tower, it is the tower's back).
      const across = p.axis === 2 ? rx : rz;
      if (across * p.out > 1) return;
      const c: Vec3 = [x, p.c[1], z];
      const off = p.out * 1.5;
      out.push({
        d,
        gid: mixId(p.key, n * 31 + 9292),
        count: panelSites(p),
        weight: 1.8,
        probe: [
          [x + (p.axis === 2 ? off : 0), p.c[1], z + (p.axis === 0 ? off : 0)],
          [
            x + (p.axis === 2 ? off : (p.n * CHEVRON_GAP) / 2),
            p.c[1],
            z + (p.axis === 0 ? off : (p.n * CHEVRON_GAP) / 2),
          ],
          [
            x + (p.axis === 2 ? off : -(p.n * CHEVRON_GAP) / 2),
            p.c[1],
            z + (p.axis === 0 ? off : -(p.n * CHEVRON_GAP) / 2),
          ],
        ],
        site: (s, o) => arrowSite(p, c, s, t, o),
      });
    });
  }
  return out.sort((a, b) => a.d - b.d).slice(0, MOST_ARROWS);
}
