/*
 * Flying cars over the City of Dreams (docs/specs/art-city.md, "UFOs, more flying cars and the
 * space police", 2026-11-15). Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "more flying cars flying around. They are awesome."
 *
 * The cars of the street (lib/city-cars.ts), lifted into sky lanes down the long views: both
 * racing corridors (x ±78) carry a lane each way at two levels, one under every obstacle (8 over
 * the street: under the low decks at 12 and the gates from 15) and one over them (48: over the high
 * decks at 40, under the darting UFOs from 56); the wide boulevards either side of the avenue carry
 * a lane each way at 44. All one way a lane, keeping to the right, every car of a lane at its
 * lane's one pace, so none runs into the next; a soft glow under each instead of a pool on the
 * street, its shape one of the five car bodies, its colour one of a few cool neon tones. Straight
 * down the corridors and boulevards, they recede in two lines of lights to the vanishing point.
 * Each car is a formula of its lane, its number and the time.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { bodyOf, CAR_SITES, type Car, carSite } from './city-cars';
import { CORRIDOR_LINES } from './city-corridors';
import {
  BLOCK_X,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { LIFT_AREA } from './city-skyscrapers-plan';

/** A sky lane, tile-local: along z at x, at height y over the street, one way, its cars and pace. */
export type SkyLane = { x: number; line: number; y: number; sgn: 1 | -1; n: number; speed: number };

/** The corridors' levels, and the boulevards'. */
export const CORRIDOR_LEVELS = [8, 48] as const;
export const BOULEVARD_Y = 44;
/** How far right of its line a lane keeps: in the corridors, on the boulevards. */
const CORRIDOR_OFF = 3.5;
const BOULEVARD_OFF = 2.5;
const BOULEVARDS = [-4, -2, 2, 4];

export const SKY_LANES: SkyLane[] = (() => {
  const out: SkyLane[] = [];
  const add = (line: number, y: number, off: number, n: number, speed: number) => {
    for (const sgn of [1, -1] as const)
      out.push({
        x: line * BLOCK_X - sgn * off,
        line,
        y,
        sgn,
        n,
        speed: speed * (sgn > 0 ? 1 : 1.08),
      });
  };
  for (const L of CORRIDOR_LINES)
    for (const y of CORRIDOR_LEVELS) add(L, y, CORRIDOR_OFF, 18, y < 20 ? 15 : 18);
  for (const L of BOULEVARDS) add(L, BOULEVARD_Y, BOULEVARD_OFF, 12, 13);
  return out;
})();

/** Flying cars in a tile, all lanes. */
export const SKY_CARS = SKY_LANES.reduce((s, l) => s + l.n, 0);

const TONES: RGB[] = [C.cyan, C.violet, C.turquoise, C.magenta, mix(C.amber, C.white, 0.2)];

/** Car k of sky lane i, the copy nearest `near`, at time t. */
export function skyCarAt(i: number, k: number, t: number, near: Vec3): Car {
  const L = SKY_LANES[i] as SkyLane;
  const key = mixId(i * 31 + 5, 4021);
  const s0 = ((k + 0.6 * hash(key + k, 5)) / L.n) * TILE_Z;
  const z = nearest(wrap(s0 + L.sgn * L.speed * t, TILE_Z), near[2], TILE_Z);
  // A gentle float up and down, each car its own.
  const bob = 0.25 * Math.sin(0.9 * t + 6.28 * hash(key + k, 6));
  return {
    pos: [nearest(L.x, near[0], TILE_X), GROUND + L.y + bob, z],
    dir: [0, 0, L.sgn],
    road: { axis: 2, line: L.line },
    colour: TONES[Math.floor(hash(key + k, 7) * TONES.length)] as RGB,
    body: bodyOf(key, k),
  };
}

/** Whether a flying car flies there: not over the Temple skyscrapers' blocks (their towers rise over the boulevards' level). */
export function skyCarOpen(c: Car): number {
  const x = c.pos[0] - nearest(0, c.pos[0], TILE_X);
  const z = wrap(c.pos[2], TILE_Z);
  if (x < LIFT_AREA.x0 - 4 || x > LIFT_AREA.x1 + 4) return 1;
  const e = Math.max(LIFT_AREA.z0 - z, z - LIFT_AREA.z1);
  return smooth((e - 8) / 12);
}

/** How near flying cars are drawn, and how many at most. */
export const SKYCAR_R = 240;
export const SKYCARS_DRAWN = 32;

/** The flying cars near the eye, ahead of it, nearest first, for the Ship's renderer. */
export function skyCarItems(eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const near: { d: number; c: Car; gid: number; k: number }[] = [];
  for (let i = 0; i < SKY_LANES.length; i++) {
    const L = SKY_LANES[i] as SkyLane;
    if (Math.abs(nearest(L.x, eye[0], TILE_X) - eye[0]) > SKYCAR_R) continue;
    for (let k = 0; k < L.n; k++) {
      const c = skyCarAt(i, k, t, eye);
      const dx = c.pos[0] - eye[0];
      const dz = c.pos[2] - eye[2];
      const d = Math.hypot(dx, c.pos[1] - eye[1], dz);
      if (d > SKYCAR_R || dx * hx + dz * hz < -3) continue;
      const open = skyCarOpen(c);
      if (open <= 0) continue;
      near.push({ d, c, gid: mixId(i * 977 + k, 4031), k: open });
    }
  }
  near.sort((a, b) => a.d - b.d);
  for (let n = 0; n < Math.min(SKYCARS_DRAWN, near.length); n++) {
    const e = near[n] as (typeof near)[number];
    const c = e.c;
    const fade = e.k;
    out.push({
      d: Math.max(0, e.d - 2.5),
      gid: e.gid,
      count: CAR_SITES,
      weight: 1.5,
      probe: [[c.pos[0], c.pos[1] + 0.8, c.pos[2]]],
      site: (s, o) => carSite(c, s, o, fade, 1, true),
    });
  }
}
