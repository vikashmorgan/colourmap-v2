/*
 * Docks and their rooms in the City of Dreams (docs/specs/art-city.md, "Docks and rooms"). Pure:
 * no three.js, no DOM.
 *
 * Queued from the user (2026-11-12): "docking the ship and cyberpunk rooms the Dot Walker walks
 * through, with panoramas"; then "rooms are places where the dot walker can rest."
 *
 * Each dock is a landing pad beside a sky lounge: a glass room hung on a tower's face, its window
 * wall turned to one view of the city chosen for it (down the avenue, over the river in the rain,
 * up at the sky lanes from the street, across Chinatown to its pagoda). The pads are four designs
 * of our own: a helipad, a cantilever, a ring dock and a garden dock. Fly onto a pad and the words
 * beside the bar say "Docked — Enter to go inside". The rooms themselves are lib/city-rooms.ts.
 *
 * Docks are data, tile-local; each repeats with the plan.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import {
  BLOCK_Z,
  beat,
  boxDist,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { RIVER_W, RIVER_Z } from './city-rain';

export type PadDesign = 'helipad' | 'cantilever' | 'ring' | 'garden';

/**
 * A dock, tile-local: the room's floor centre `at`, the way its window looks (`view`, a level unit
 * vector along x or z), its half width across the view `w`, its depth along it `d`, its height
 * `h`; the pad beside it on the room's right (`side`), its design; the room's two hues and the
 * word on its back wall; `big` rooms hold the embassy's arcade.
 */
export type Dock = {
  name: string;
  at: Vec3;
  view: [number, number];
  w: number;
  d: number;
  h: number;
  pad: PadDesign;
  hues: [RGB, RGB];
  word: string;
  /** How the eye rests on the view when seated: looking up (positive) or down. */
  tilt: number;
  /** An embassy's big room, with the arcade cabinet. */
  arcade?: boolean;
};

const G = GROUND;
export const DOCKS: Dock[] = [
  {
    // High over the Heights' avenue, hung on an avenue tower, looking down the avenue.
    name: 'Avenue lounge',
    at: [-4.6, G + 52, 19.5 * BLOCK_Z],
    view: [0, -1],
    w: 4.4,
    d: 7,
    h: 4.2,
    pad: 'cantilever',
    hues: [C.cyan, C.magenta],
    word: 'AVENUE',
    tilt: -0.12,
  },
  {
    // On the Canals' bank, in the rain, looking across the river and its bridges.
    name: 'River lounge',
    at: [40, G + 9, RIVER_Z - RIVER_W + 0.5],
    view: [0, 1],
    w: 5,
    d: 6,
    h: 4.2,
    pad: 'ring',
    hues: [C.violet, C.turquoise],
    word: 'RAIN',
    tilt: -0.08,
  },
  {
    // At the street under the Heights' tube, looking up at the sky lanes.
    name: 'Street lounge',
    at: [-4.6, G + 1.2, 18.6 * BLOCK_Z],
    view: [0, -1],
    w: 4.2,
    d: 6.5,
    h: 4.4,
    pad: 'helipad',
    hues: [C.amber, C.cyan],
    word: 'LANES',
    tilt: 0.42,
  },
  {
    // Over Chinatown's roofs, looking across them to the Pagoda of nine roofs.
    name: 'Chinatown lounge',
    at: [-16, G + 40, 4 * BLOCK_Z],
    view: [-1, 0],
    w: 5,
    d: 7,
    h: 4.2,
    pad: 'garden',
    hues: [C.red, C.gold],
    word: 'TEA',
    tilt: -0.1,
  },
];

/* ---------- a dock's frame ---------- */

/** A dock placed in the world: its room's frame (floor centre, view, right) and its pad's centre. */
export type Placed = {
  dock: Dock;
  i: number;
  /** The room's floor centre, its view, its right, and the pad's centre on its floor's level. */
  c: Vec3;
  v: Vec3;
  r: Vec3;
  pad: Vec3;
};
export const PAD_R = 4.6;
/** The pad stands this far out from the room's right wall. */
const PAD_OUT = PAD_R + 1.4;

/** Dock i at the copy of it nearest the point q. */
export function placeDock(i: number, q: Vec3): Placed {
  const dock = DOCKS[i] as Dock;
  const ox = nearest(dock.at[0], q[0], TILE_X) - dock.at[0];
  const oz = nearest(dock.at[2], q[2], TILE_Z) - dock.at[2];
  const c: Vec3 = [dock.at[0] + ox, dock.at[1], dock.at[2] + oz];
  const v: Vec3 = [dock.view[0], 0, dock.view[1]];
  // Right of the view (yaw convention: x right when looking down -z).
  const r: Vec3 = [-v[2], 0, v[0]];
  const pad: Vec3 = [c[0] + r[0] * (dock.w + PAD_OUT), c[1], c[2] + r[2] * (dock.w + PAD_OUT)];
  return { dock, i, c, v, r, pad };
}
/** A point of the room, `side` along its right, `out` along its view, `up` over its floor. */
export const roomPoint = (P: Placed, side: number, out: number, up: number): Vec3 => [
  P.c[0] + P.r[0] * side + P.v[0] * out,
  P.c[1] + up,
  P.c[2] + P.r[2] * side + P.v[2] * out,
];

/** The dock whose pad the ship is on (within the pad's radius, over it a little), or null. */
export function dockAt(q: Vec3): Placed | null {
  for (let i = 0; i < DOCKS.length; i++) {
    const P = placeDock(i, q);
    const dx = q[0] - P.pad[0];
    const dz = q[2] - P.pad[2];
    const dy = q[1] - P.pad[1];
    if (dx * dx + dz * dz < PAD_R * PAD_R && dy > -0.5 && dy < 6) return P;
  }
  return null;
}

/** The words beside the bar on a pad. */
export const DOCK_PROMPT = 'Docked — Enter to go inside';

/* ---------- drawing: the pad and the room's shell seen from outside ---------- */

const PAD_SITES = 520;
const SHELL_SITES = 520;

/** Site s of a pad of design D round centre p (its floor level), its colour into o[3..5]. */
function padSite(P: Placed, s: number, t: number, o: number[]) {
  const { pad, dock, r, v } = P;
  const [h1, h2] = dock.hues;
  const u = (s + 0.5) / PAD_SITES;
  const b = beat(t, 1);
  const set = (x: number, y: number, z: number, c: RGB, k: number) => {
    o[0] = x;
    o[1] = y;
    o[2] = z;
    [o[3], o[4], o[5]] = scale(c, k);
    return true;
  };
  // Every design's rim: lights chasing slowly round it.
  if (u < 0.3) {
    const a = (u / 0.3) * TAU;
    const chase = 0.5 + 0.5 * Math.cos(a * 3 - t * 1.2);
    const rr = dock.pad === 'cantilever' ? 0 : PAD_R;
    if (dock.pad === 'cantilever') {
      // A long deck from the room's wall: its outline.
      const e = (u / 0.3) * 4 * (PAD_R + PAD_R * 0.6);
      const L = PAD_R;
      const Wd = PAD_R * 0.6;
      let x: number;
      let z: number;
      if (e < 2 * L) [x, z] = [-L + e, -Wd];
      else if (e < 2 * L + 2 * Wd) [x, z] = [L, -Wd + (e - 2 * L)];
      else if (e < 4 * L + 2 * Wd) [x, z] = [L - (e - 2 * L - 2 * Wd), Wd];
      else [x, z] = [-L, Wd - (e - 4 * L - 2 * Wd)];
      return set(
        pad[0] + r[0] * x + v[0] * z,
        pad[1] + 0.05,
        pad[2] + r[2] * x + v[2] * z,
        h1,
        0.22 + 0.3 * chase,
      );
    }
    return set(
      pad[0] + Math.cos(a) * rr,
      pad[1] + 0.05,
      pad[2] + Math.sin(a) * rr,
      h1,
      0.22 + 0.3 * chase,
    );
  }
  const q = (u - 0.3) / 0.7;
  switch (dock.pad) {
    case 'helipad': {
      // A ring inside the rim and a cross of lights to land on, breathing on the beat.
      if (q < 0.45) {
        const a = (q / 0.45) * TAU;
        return set(
          pad[0] + Math.cos(a) * PAD_R * 0.62,
          pad[1] + 0.05,
          pad[2] + Math.sin(a) * PAD_R * 0.62,
          h2,
          0.3,
        );
      }
      const e = (q - 0.45) / 0.55;
      const arm = Math.floor(e * 4);
      const along = (frac4(e) - 0.5) * PAD_R * 0.9;
      const ax = arm % 2 === 0 ? along : 0;
      const az = arm % 2 === 0 ? 0 : along;
      return set(pad[0] + ax, pad[1] + 0.06, pad[2] + az, C.white, 0.2 + 0.25 * b);
    }
    case 'cantilever': {
      // Its truss under the deck: diagonals back to the tower's wall.
      const L = PAD_R;
      const e = q * 10;
      const k = Math.floor(e);
      const f = e - k;
      const x = -L + (k + f) * ((2 * L) / 10);
      const y = pad[1] - 1.6 * (k % 2 === 0 ? f : 1 - f);
      const z = (hash(s, 3) < 0.5 ? -1 : 1) * PAD_R * 0.6;
      return set(
        pad[0] + r[0] * x + v[0] * z,
        y,
        pad[2] + r[2] * x + v[2] * z,
        mix(h2, C.white, 0.4),
        0.22,
      );
    }
    case 'ring': {
      // A ring gate standing on the pad's outer edge, facing the way you come in, lights chasing.
      if (q < 0.7) {
        const a = (q / 0.7) * TAU;
        const R = PAD_R * 0.9;
        const chase = 0.5 + 0.5 * Math.cos(a * 4 + t * 1.5);
        return set(
          pad[0] + r[0] * PAD_R * 0.95 + v[0] * Math.cos(a) * R,
          pad[1] + R + Math.sin(a) * R,
          pad[2] + r[2] * PAD_R * 0.95 + v[2] * Math.cos(a) * R,
          h2,
          0.2 + 0.32 * chase,
        );
      }
      const a = ((q - 0.7) / 0.3) * TAU;
      return set(
        pad[0] + Math.cos(a) * PAD_R * 0.4,
        pad[1] + 0.05,
        pad[2] + Math.sin(a) * PAD_R * 0.4,
        C.white,
        0.3,
      );
    }
    default: {
      // A garden: little trees and lanterns round the rim, a lit path to the room.
      if (q < 0.6) {
        const k = Math.floor(q * 12);
        const a = (k / 7) * TAU + 0.3;
        const f = hash(s, 7);
        const tr = PAD_R * 0.78;
        return set(
          pad[0] + Math.cos(a) * tr + (hash(s, 8) - 0.5) * 0.9,
          pad[1] + 0.3 + f * 1.6,
          pad[2] + Math.sin(a) * tr + (hash(s, 9) - 0.5) * 0.9,
          f < 0.25 ? C.gold : C.leaf,
          f < 0.25 ? 0.4 : 0.26,
        );
      }
      const e = (q - 0.6) / 0.4;
      return set(
        pad[0] - r[0] * PAD_R * e,
        pad[1] + 0.05,
        pad[2] - r[2] * PAD_R * e,
        h2,
        0.3 * (0.8 + 0.2 * Math.sin(t * 0.8 + e * 6)),
      );
    }
  }
}
const frac4 = (e: number) => e * 4 - Math.floor(e * 4);

/** Site s of the room's shell seen from outside: its edges, its window, a glow inside. */
function shellSite(P: Placed, s: number, t: number, o: number[]) {
  const { dock } = P;
  const { w, d, h } = dock;
  const u = (s + 0.5) / SHELL_SITES;
  const [h1, h2] = dock.hues;
  let q: Vec3;
  let c: RGB;
  let k: number;
  if (u < 0.55) {
    // The twelve edges of its box.
    const e = Math.floor((u / 0.55) * 12);
    const f = frac((u / 0.55) * 12);
    const X = [-w, w];
    const Y = [0, h];
    const Z = [-d / 2, d / 2];
    const pick = e % 4;
    const ax = Math.floor(e / 4);
    const A = (pick & 1) as 0 | 1;
    const B = (pick >> 1) as 0 | 1;
    if (ax === 0) q = roomPoint(P, -w + 2 * w * f, Z[B] as number, Y[A] as number);
    else if (ax === 1) q = roomPoint(P, X[A] as number, Z[B] as number, h * f);
    else q = roomPoint(P, X[A] as number, -d / 2 + d * f, Y[B] as number);
    c = mix(h1, C.white, 0.3);
    k = 0.38;
  } else if (u < 0.8) {
    // The window wall: a band of light across it, the view's hue.
    const f = (u - 0.55) / 0.25;
    q = roomPoint(P, -w + 2 * w * frac(f * 7.3), d / 2 + 0.02, h * (0.15 + 0.7 * f));
    c = h2;
    k = 0.08;
  } else {
    // A warm glow inside, breathing slowly.
    const f = (u - 0.8) / 0.2;
    q = roomPoint(P, (hash(s, 1) - 0.5) * 2 * w * 0.8, (hash(s, 2) - 0.5) * d * 0.8, h * 0.85);
    c = C.warm;
    k = 0.2 * (0.8 + 0.2 * Math.sin(t * 0.6 + f * 3));
  }
  o[0] = q[0];
  o[1] = q[1];
  o[2] = q[2];
  [o[3], o[4], o[5]] = scale(c, k);
  return true;
}
const frac = (x: number) => x - Math.floor(x);

/** Every dock near the eye, its pad and its room's shell, for the Ship's renderer. */
export function dockItems(eye: Vec3, t: number, R: number, out: Item[]) {
  for (let i = 0; i < DOCKS.length; i++) {
    const P = placeDock(i, eye);
    const { w, d, h } = P.dock;
    const lo: Vec3 = [
      Math.min(P.c[0] - w - d, P.pad[0] - PAD_R),
      P.c[1] - 2,
      Math.min(P.c[2] - w - d, P.pad[2] - PAD_R),
    ];
    const hi: Vec3 = [
      Math.max(P.c[0] + w + d, P.pad[0] + PAD_R),
      P.c[1] + h + PAD_R * 2,
      Math.max(P.c[2] + w + d, P.pad[2] + PAD_R),
    ];
    const dist = boxDist(eye, lo, hi);
    if (dist > R) continue;
    out.push({
      d: dist,
      gid: mixId(i, 6601),
      count: PAD_SITES,
      weight: 2.2,
      probe: [P.pad, [P.pad[0], P.pad[1] + 3, P.pad[2]]],
      site: (s, o) => padSite(P, s, t, o),
    });
    out.push({
      d: dist,
      gid: mixId(i, 6602),
      count: SHELL_SITES,
      weight: 1.8,
      probe: [roomPoint(P, 0, 0, h / 2), roomPoint(P, 0, d / 2, h / 2)],
      site: (s, o) => shellSite(P, s, t, o),
    });
  }
}
