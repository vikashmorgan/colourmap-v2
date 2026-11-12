/*
 * Cars on the ground in the City of Dreams (docs/specs/art-city.md, "Cars on the ground"). Pure:
 * no three.js, no DOM.
 *
 * Queued from the user (2026-11-12): "cars on the ground", simple grain cars with head and tail
 * lights, one colour per road, ready for ground racing later.
 *
 * Every street line along z (the avenue among them) and every cross street along x carries cars
 * both ways, keeping to the right. A car is a few dozen grains: its body's outline in its road's
 * colour, two warm headlights in front with a faint pool on the street ahead, two red tail lights
 * behind. Each car's place is a pure function of its road, its number and the time (`carAt`), so a
 * race can read them later. Only the cars near a low eye are drawn: they cost nothing from the sky
 * lanes up.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { DOCKS, PAD_R, placeDock } from './city-docks';
import {
  AVENUE,
  BLOCK_X,
  BLOCK_Z,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { inRiver } from './city-rain';

/** A road: along z at x (`axis` 2) or along x at z (`axis` 0); its line's number in the tile. */
export type Road = { axis: 0 | 2; line: number };

/** Cars a way on a road, a tile long, and how fast they go (units a second). */
const CARS_ALONG_Z = 22;
const CARS_ALONG_X = 4;
export const CAR_SPEED = 9;
export const CAR_LEN = 4.2;
export const CAR_HALF_W = 0.95;

/** Its colour, one a road: the avenue gold, the streets along z cool, the cross streets warm. */
const COOL: RGB[] = [C.cyan, C.violet, C.turquoise, C.magenta, C.steel];
const WARM: RGB[] = [C.amber, C.rose, C.saffron, C.leaf, C.ivory];
export function roadColour(r: Road): RGB {
  if (r.axis === 2 && r.line === 0) return C.gold;
  const pal = r.axis === 2 ? COOL : WARM;
  return pal[wrap(r.line * 3 + (r.axis === 2 ? 1 : 2), pal.length)] as RGB;
}

/** How far from the road's middle line a car keeps, on its right, by lane. */
const laneOff = (r: Road, lane: number) =>
  r.axis === 2 && r.line === 0 ? (lane === 0 ? AVENUE * 0.3 : AVENUE * 0.68) : 1.7;

export type Car = { pos: Vec3; dir: Vec3; road: Road; colour: RGB };

/**
 * Car k of road r going way `sgn` (+1 or -1 along its axis), the copy of it nearest `near`, at time
 * t: where its middle is on the street and which way it heads.
 */
export function carAt(r: Road, sgn: 1 | -1, k: number, t: number, near: Vec3): Car {
  const n = r.axis === 2 ? CARS_ALONG_Z * (r.line === 0 ? 2 : 1) : CARS_ALONG_X;
  const length = r.axis === 2 ? TILE_Z : TILE_X;
  const key = mixId(r.axis * 64 + r.line + 32, sgn > 0 ? 11 : 13);
  const lane = r.axis === 2 && r.line === 0 ? k & 1 : 0;
  // One pace a lane, so no car ever runs into the one ahead (the avenue's outer lane faster).
  const speed = CAR_SPEED * (0.8 + 0.4 * hash(key, 3)) * (lane ? 1.3 : 1);
  // Spread along the road, a little uneven, gliding on.
  const s0 = ((k + 0.6 * hash(key + k, 5)) / n) * length;
  const s = s0 + sgn * speed * t;
  const off = laneOff(r, lane);
  if (r.axis === 2) {
    const x = r.line * BLOCK_X;
    const z = nearest(wrap(s, length), near[2], length);
    // Heading -z, its right is +x; heading +z, -x.
    return {
      pos: [nearest(x, near[0], TILE_X) - sgn * off, GROUND, z],
      dir: [0, 0, sgn],
      road: r,
      colour: roadColour(r),
    };
  }
  const z = r.line * BLOCK_Z;
  const x = nearest(wrap(s, length), near[0], length);
  // Heading +x, its right is +z.
  return {
    pos: [x, GROUND, nearest(z, near[2], TILE_Z) + sgn * off],
    dir: [sgn, 0, 0],
    road: r,
    colour: roadColour(r),
  };
}

/** Whether a car may be on the street there: not on the river, a canal or Chinatown's avenue. */
export function carRoadOpen(c: Car, onCanal: (x: number, z: number) => boolean): boolean {
  const [x, , z] = c.pos;
  if (inRiver(x, z) && c.road.axis === 0) return false;
  if (onCanal(x, z)) return false;
  // Chinatown's avenue is a street to walk under the lanterns.
  const row = wrap(Math.floor(z / BLOCK_Z), TILE_J);
  if (c.road.axis === 2 && c.road.line === 0 && row < 8) return false;
  return true;
}

/** The docks down on the street (the Street lounge and its helipad): cars fade out round them. */
const STREET_DOCKS = DOCKS.map((d, i) => ({ d, i })).filter(({ d }) => d.at[1] < GROUND + 4);
/** How much a car shows: none within a street dock's room or pad, easing back in over 6. */
export function carFade(c: Car): number {
  let k = 1;
  for (const { i } of STREET_DOCKS) {
    const P = placeDock(i, c.pos);
    const { w, d } = P.dock;
    const span = Math.hypot(w, d / 2) + 2;
    for (const [q, rad] of [
      [P.c, span],
      [P.pad, PAD_R + 1.5],
    ] as const) {
      const e = Math.hypot(c.pos[0] - q[0], c.pos[2] - q[2]) - rad - CAR_LEN / 2;
      k = Math.min(k, Math.max(0, Math.min(1, e / 6)));
    }
  }
  return k;
}

/* ---------- drawing ---------- */

const CAR_SITES = 64;

/** Site s of a car: its outline in its road's colour, its lights, the pool of its headlights. */
export function carSite(c: Car, s: number, o: number[], fade = 1): boolean {
  const f = c.dir;
  // Its right: heading -z it is +x.
  const r: Vec3 = [-f[2], 0, f[0]];
  const put = (a: number, b: number, y: number, col: RGB, k: number) => {
    o[0] = c.pos[0] + f[0] * a + r[0] * b;
    o[1] = c.pos[1] + y;
    o[2] = c.pos[2] + f[2] * a + r[2] * b;
    [o[3], o[4], o[5]] = scale(col, k * fade);
    return true;
  };
  const L = CAR_LEN / 2;
  const W = CAR_HALF_W;
  if (s < 40) {
    // Three outlines: the sill, the belt line, the smaller roof set back.
    const ring = s < 14 ? 0 : s < 28 ? 1 : 2;
    const u = ring === 2 ? (s - 28 + 0.5) / 12 : (s - ring * 14 + 0.5) / 14;
    const [ha, hb, y] =
      ring === 0 ? [L, W, 0.4] : ring === 1 ? [L * 0.96, W, 0.95] : [L * 0.5, W * 0.82, 1.5];
    const da = ring === 2 ? -0.3 : 0;
    const per = 4 * (ha + hb);
    const e = u * per;
    let a: number;
    let b: number;
    if (e < 2 * ha) [a, b] = [-ha + e, -hb];
    else if (e < 2 * ha + 2 * hb) [a, b] = [ha, -hb + (e - 2 * ha)];
    else if (e < 4 * ha + 2 * hb) [a, b] = [ha - (e - 2 * ha - 2 * hb), hb];
    else [a, b] = [-ha, hb - (e - 4 * ha - 2 * hb)];
    return put(
      a + da,
      b,
      y,
      mix(c.colour, C.white, ring === 2 ? 0.3 : 0),
      ring === 1 ? 0.34 : 0.24,
    );
  }
  if (s < 50) {
    // Headlights, warm white, either side of its nose.
    const side = s & 1 ? 1 : -1;
    const j = hash(s, 7) * 0.12;
    return put(L + 0.02, side * (W - 0.25) + j, 0.72, C.warm, 0.75);
  }
  if (s < 58) {
    // Tail lights, red.
    const side = s & 1 ? 1 : -1;
    return put(-L - 0.02, side * (W - 0.2) + hash(s, 8) * 0.12, 0.75, C.red, 0.6);
  }
  // A faint pool of its headlights on the street ahead.
  const a = L + 1.2 + 3.5 * hash(s, 9);
  const b = (hash(s, 10) - 0.5) * 1.4 * (1 + (a - L) * 0.25);
  return put(a, b, 0.03, C.warm, 0.1);
}

/** How near a car is drawn, and how high the eye may be for cars to be drawn at all. */
export const CAR_R = 130;
export const CAR_EYE_MAX = GROUND + 80;

/**
 * The cars near a low eye, ahead of it (`fwd`), for the Ship's renderer; `onCanal` keeps them off
 * the Canals' water.
 */
export function carItems(
  eye: Vec3,
  fwd: Vec3,
  t: number,
  onCanal: (x: number, z: number) => boolean,
  out: Item[],
) {
  if (eye[1] > CAR_EYE_MAX) return;
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const push = (c: Car, gid: number) => {
    const dx = c.pos[0] - eye[0];
    const dz = c.pos[2] - eye[2];
    const d = Math.hypot(dx, c.pos[1] + 0.8 - eye[1], dz);
    if (d > CAR_R) return;
    if (dx * hx + dz * hz < -CAR_LEN) return;
    if (!carRoadOpen(c, onCanal)) return;
    const fade = carFade(c);
    if (fade <= 0) return;
    out.push({
      d: Math.max(0, d - CAR_LEN),
      gid,
      count: CAR_SITES,
      weight: 1.6,
      probe: [[c.pos[0], c.pos[1] + 0.9, c.pos[2]]],
      site: (s, o) => carSite(c, s, o, fade),
    });
  };
  // Streets along z: the lines within reach across x.
  const i0 = Math.ceil((eye[0] - CAR_R) / BLOCK_X);
  const i1 = Math.floor((eye[0] + CAR_R) / BLOCK_X);
  for (let I = i0; I <= i1; I++) {
    const line = wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
    const r: Road = { axis: 2, line };
    const lanes = line === 0 ? 2 : 1;
    const n = CARS_ALONG_Z * lanes;
    for (const sgn of [1, -1] as const) {
      for (let k = 0; k < n; k++) {
        const c = carAt(r, sgn, k, t, [I * BLOCK_X, 0, eye[2]]);
        push(c, mixId(I * 977 + k, sgn > 0 ? 8801 : 8803));
      }
    }
  }
  // Cross streets along x: the lines within reach along z.
  const j0 = Math.ceil((eye[2] - CAR_R) / BLOCK_Z);
  const j1 = Math.floor((eye[2] + CAR_R) / BLOCK_Z);
  for (let J = j0; J <= j1; J++) {
    const r: Road = { axis: 0, line: wrap(J, TILE_J) };
    for (const sgn of [1, -1] as const) {
      for (let k = 0; k < CARS_ALONG_X; k++) {
        const c = carAt(r, sgn, k, t, [eye[0], 0, J * BLOCK_Z]);
        push(c, mixId(J * 991 + k, sgn > 0 ? 8807 : 8809));
      }
    }
  }
}
