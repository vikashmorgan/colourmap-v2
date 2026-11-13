/*
 * The Deep Line: wide tunnels under the City of Dreams (docs/specs/art-city.md, "Game design").
 * Down a ramp in the avenue, under the Indian quarter, Chinatown and Istanbul, round four corners,
 * and out into a canal of the undercity, or up a second ramp in Chinatown's avenue. Rings of light
 * line them, the tunnels' pulses running on ahead of you as in every tunnel of the city.
 *
 * 2026-11-13: "tunnels below the city that you can enter: wide and long, with turns, entrances
 * visible from the street, light pulses running along them."
 *
 * Also here, as data, the one tunnel that bores straight through a row of towers (lib/city-game.ts
 * shapes the towers round it), so the map can draw both. Pure: no three.js, no DOM.
 */

import type { RGB, Vec3 } from './bigbang';
import {
  aroundRect,
  BLOCK_X,
  BLOCK_Z,
  beat,
  boxDist,
  C,
  clamp,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  nearest,
  scale,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';

/** The tunnels' floor, how tall they stand, and half their width. */
export const DEEP = GROUND - 18;
export const DEEP_H = 11;
export const DEEP_W = 6.5;

/**
 * A straight run of tunnel, tile-local: along x (axis 0, at z = c) or z (axis 2, at x = c), from
 * s0 to s1, its floor y0 at s0 and y1 at s1. `open`: a ramp, no roof over it. `ea`/`eb`: the run
 * goes on DEEP_W past that end (round a corner, or to a closed end wall).
 */
export type Run = {
  axis: 0 | 2;
  c: number;
  s0: number;
  s1: number;
  y0: number;
  y1: number;
  open: boolean;
  ea: boolean;
  eb: boolean;
};
const run = (
  axis: 0 | 2,
  c: number,
  s0: number,
  s1: number,
  y0 = DEEP,
  y1 = DEEP,
  open = false,
  ea = true,
  eb = true,
): Run => ({ axis, c, s0, s1, y0, y1, open, ea, eb });

/** Where the canal the Deep Line comes out in runs (the Canals' first canal, z = 18 blocks). */
const CANAL_SOUTH = 18 * BLOCK_Z - 4.5;

/** The Deep Line, run by run: the avenue ramp, west, south, across, then north to the canal. */
export const DEEP_RUNS: Run[] = [
  // The avenue ramp in the Indian quarter: in at the street (z 520), down to the tunnel (z 460).
  run(2, 0, 460, 520, DEEP, GROUND, true, false, false),
  run(2, 0, 10 * BLOCK_Z, 460, DEEP, DEEP, false, true, false),
  run(0, 10 * BLOCK_Z, -5 * BLOCK_X, 0),
  run(2, -5 * BLOCK_X, 4 * BLOCK_Z, 10 * BLOCK_Z),
  run(0, 4 * BLOCK_Z, -5 * BLOCK_X, 5 * BLOCK_X),
  // Chinatown's avenue ramp, up out of the crossing toward the gate (z 76).
  run(2, 0, 76, 4 * BLOCK_Z, GROUND, DEEP, true, false, false),
  // North under Istanbul, rising gently to come out in the canal's south wall.
  // (It runs on a little into the canal, so no lip is left at its mouth.)
  run(2, 5 * BLOCK_X, 4 * BLOCK_Z, CANAL_SOUTH, DEEP, GROUND - 14),
];

/** The ramps' mouths at the street, tile-local, and which way down they go (along z). */
export const DEEP_MOUTHS: { x: number; z: number; down: 1 | -1; name: string }[] = DEEP_RUNS.filter(
  (r) => r.open,
).map((r) => {
  const top = r.y0 > r.y1 ? r.s0 : r.s1;
  return { x: r.c, z: top, down: r.y0 > r.y1 ? 1 : -1, name: 'Deep Line' };
});

/** The tunnel through a row of towers in the neon market: along z at x, at height y, z0 to z1. */
export const THROUGH = {
  x: 2.5 * BLOCK_X,
  y: GROUND + 14,
  hw: 4.2,
  hh: 3.4,
  J0: 43,
  J1: 47,
  get z0() {
    return this.J0 * BLOCK_Z;
  },
  get z1() {
    return (this.J1 + 1) * BLOCK_Z;
  },
};

/** For the map: each run (and the through tunnel) as a line, tile-local [x, z] pairs. */
export function tunnelLines(): [number, number][][] {
  const lines = DEEP_RUNS.map((r): [number, number][] =>
    r.axis === 0
      ? [
          [r.s0, r.c],
          [r.s1, r.c],
        ]
      : [
          [r.c, r.s0],
          [r.c, r.s1],
        ],
  );
  lines.push([
    [THROUGH.x, THROUGH.z0],
    [THROUGH.x, THROUGH.z1],
  ]);
  return lines;
}

/* ---------- inside: the floor, the roof, the open ramps ---------- */

export type Under = { floor: number; ceil: number; open: boolean };
const floorOf = (r: Run, s: number) =>
  lerp(r.y0, r.y1, clamp((s - r.s0) / (r.s1 - r.s0 || 1), 0, 1));

/**
 * The Deep Line at (x, z), `room` in from its walls: its floor and roof there (the lowest floor
 * and highest roof of the runs that meet), open to the sky over a ramp; null outside it.
 */
export function underAt(x: number, z: number, room = 0): Under | null {
  const lx = x - nearest(0, x, TILE_X);
  const lz = wrap(z, TILE_Z);
  let out: Under | null = null;
  for (const r of DEEP_RUNS) {
    const along = r.axis === 0 ? lx : lz;
    const lat = r.axis === 0 ? lz - r.c : lx - r.c;
    if (Math.abs(lat) >= DEEP_W - room) continue;
    const lo = r.s0 - (r.ea ? DEEP_W - room : 0);
    const hi = r.s1 + (r.eb ? DEEP_W - room : 0);
    if (along <= lo || along >= hi) continue;
    const floor = floorOf(r, along);
    if (!out) out = { floor, ceil: floor + DEEP_H, open: r.open };
    else {
      out.floor = Math.min(out.floor, floor);
      out.ceil = Math.max(out.ceil, floor + DEEP_H);
      out.open = out.open || r.open;
    }
  }
  return out;
}
/** Whether (x, z) is over an open ramp (cars keep off it). */
export const underOpen = (x: number, z: number) => underAt(x, z)?.open === true;

/**
 * Whether a point is held out by the Deep Line's rock: under its floor, or in the ground between
 * its roof and the street. null where the Deep Line has no say (the rest of the city decides);
 * false inside it, under the street, where no tower stands.
 */
export function underBlocked(q: Vec3, margin: number): boolean | null {
  const u = underAt(q[0], q[2], margin);
  if (!u) return null;
  if (q[1] < u.floor + 2 - 1e-6) return true;
  if (q[1] >= GROUND + 2 - 1e-6) return null;
  if (!u.open && q[1] > u.ceil - margin) return true;
  return q[1] < GROUND ? false : null;
}

/** The chase camera's height when the ship is down in the Deep Line: kept inside it; else null. */
export function underEyeY(c: Vec3, eyeY: number): number | null {
  if (c[1] > GROUND - 0.5) return null;
  const u = underAt(c[0], c[2]);
  if (!u) return null;
  return clamp(eyeY, u.floor + 1, u.open ? Number.POSITIVE_INFINITY : u.ceil - 1);
}

/** How near (tile-local) the nearest ramp is to (x, z). */
function rampNear(x: number, z: number): number {
  const lx = x - nearest(0, x, TILE_X);
  const lz = wrap(z, TILE_Z);
  let best = Number.POSITIVE_INFINITY;
  for (const r of DEEP_RUNS) {
    if (!r.open) continue;
    const along = r.axis === 0 ? lx : lz;
    const lat = r.axis === 0 ? lz - r.c : lx - r.c;
    const da = Math.max(0, r.s0 - along, along - r.s1);
    best = Math.min(best, Math.hypot(da, Math.max(0, Math.abs(lat) - DEEP_W)));
  }
  return best;
}

/**
 * From deep in a closed tunnel the city overhead is out of sight: only what lies under the street
 * is seen (and the grains go to the tunnel). Near a ramp, or anywhere else, everything (null).
 */
export function underSeeThrough(eye: Vec3): ((x: number, y: number, z: number) => boolean) | null {
  if (eye[1] > GROUND - 1.5) return null;
  const u = underAt(eye[0], eye[2]);
  if (!u || u.open || rampNear(eye[0], eye[2]) < 28) return null;
  return (_x, y) => y < GROUND - 0.3;
}

/* ---------- drawn: rings, lanes, chevrons, the portals at the street ---------- */

/** Rings every RING_GAP, each RING_SITES lights round; floor lanes every LANE_GAP. */
const RING_GAP = 3;
const RING_SITES = 40;
const LANE_GAP = 1.5;
const CHUNK = 30;
const PORTAL_SITES = 220;

/**
 * The Deep Line near the eye, drawn, in chunks so the far ones thin out: rings of light round its
 * walls and roof (a ramp's only up to the street), lanes of lamps down its floor, chevrons down
 * each ramp, and a lit portal over each ramp's mouth. `pulse(s, axis)` is the city's tunnel pulse
 * (lib/city-game.ts): the rings light up in waves running ahead of you. From the street, only the
 * ramps and what lies just beyond them are drawn.
 */
export function underItems(
  eye: Vec3,
  t: number,
  R: number,
  pulse: (s: number, axis: 0 | 2) => number,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
) {
  const ox = nearest(0, eye[0], TILE_X);
  if (Math.abs(eye[0] - ox) > R + 150) return;
  const above = eye[1] > GROUND;
  const n0 = Math.floor((eye[2] - R - 20) / TILE_Z);
  const n1 = Math.floor((eye[2] + R + 20) / TILE_Z);
  for (let n = n0; n <= n1; n++) {
    const oz = n * TILE_Z;
    DEEP_RUNS.forEach((r, ri) => {
      const lo = r.s0 - (r.ea ? DEEP_W : 0);
      const hi = r.s1 + (r.eb ? DEEP_W : 0);
      const chunks = Math.ceil((hi - lo) / CHUNK);
      for (let k = 0; k < chunks; k++) {
        const a = lo + k * CHUNK;
        const b = Math.min(hi, a + CHUNK);
        const P = (along: number, lat: number, y: number): Vec3 =>
          r.axis === 0 ? [ox + along, y, oz + r.c + lat] : [ox + r.c + lat, y, oz + along];
        const ya = floorOf(r, a);
        const yb = floorOf(r, b);
        const A = P(a, -DEEP_W, Math.min(ya, yb));
        const B = P(b, DEEP_W, Math.max(ya, yb) + DEEP_H);
        const d = boxDist(
          eye,
          [Math.min(A[0], B[0]), A[1], Math.min(A[2], B[2])],
          [Math.max(A[0], B[0]), B[1], Math.max(A[2], B[2])],
        );
        if (d > R) continue;
        const mid = P((a + b) / 2, 0, 0);
        if (d > 10 && !ahead(mid[0], mid[2], CHUNK)) continue;
        // From the street only the ramps, and the tunnel just past their foot.
        if (above && !r.open && d > 26) continue;
        const rings = Math.max(1, Math.floor((b - a) / RING_GAP));
        const lanes = Math.max(1, Math.floor((b - a) / LANE_GAP)) * 2;
        const chev = r.open ? Math.floor((b - a) / 6) * 9 : 0;
        out.push({
          d,
          gid: mixId(n * 31 + ri, 6100 + k),
          count: rings * RING_SITES + lanes + chev,
          weight: 1.5,
          site: (s, o) => {
            if (s < rings * RING_SITES) {
              const j = Math.floor(s / RING_SITES);
              const along = a + (j + 0.5) * ((b - a) / rings);
              const f = floorOf(r, along);
              const hh = DEEP_H / 2;
              const e = ((s % RING_SITES) + 0.5) / RING_SITES;
              const [lat, dy] = aroundRect(e * 4 * (DEEP_W + hh), DEEP_W, hh);
              const y = f + hh + dy;
              // A ramp has no roof: its rings stop at the street.
              if (r.open && y > GROUND - 0.2) return false;
              [o[0], o[1], o[2]] = P(along, lat, y);
              const p = pulse(r.axis === 0 ? (o[0] as number) : (o[2] as number), r.axis);
              const rgb: RGB = mix(mix(C.violet, C.magenta, 0.25), C.cyan, p);
              [o[3], o[4], o[5]] = scale(rgb, 0.08 + 0.44 * p);
              return true;
            }
            s -= rings * RING_SITES;
            if (s < lanes) {
              const side = s & 1 ? 1 : -1;
              const along = a + ((s >> 1) + 0.5) * LANE_GAP;
              [o[0], o[1], o[2]] = P(along, side * (DEEP_W - 1.6), floorOf(r, along) + 0.1);
              [o[3], o[4], o[5]] = scale(C.warm, 0.3);
              return true;
            }
            s -= lanes;
            // Chevrons down the ramp: a V of lamps every 6, pointing the way down, breathing.
            const j = Math.floor(s / 9);
            const q = (s % 9) - 4;
            const down = r.y0 < r.y1 ? -1 : 1;
            const along = a + (j + 0.5) * 6 - down * Math.abs(q) * 0.6;
            [o[0], o[1], o[2]] = P(along, q * 0.9, floorOf(r, along) + 0.12);
            const g = 0.7 + 0.3 * beat(t, 1 / 2, j * 0.1);
            [o[3], o[4], o[5]] = scale(C.amber, 0.42 * g);
            return true;
          },
        });
      }
    });
    // The portals: a tall lit frame over each ramp's mouth, seen down the avenue.
    DEEP_MOUTHS.forEach((m, mi) => {
      const x = ox + m.x;
      const z = oz + m.z;
      const d = boxDist(eye, [x - DEEP_W - 1, GROUND, z - 1], [x + DEEP_W + 1, GROUND + 11, z + 1]);
      if (d > R + 40 || (d > 20 && !ahead(x, z, 20))) return;
      out.push({
        d,
        gid: mixId(n * 7 + mi, 6200),
        count: PORTAL_SITES,
        weight: 2.6,
        probe: [
          [x, GROUND + 10, z],
          [x - DEEP_W, GROUND + 4, z],
          [x + DEEP_W, GROUND + 4, z],
        ],
        site: (s, o) => {
          // Two pillars and an arch over the lintel, a pulse running up and over them.
          const u = (s + 0.5) / PORTAL_SITES;
          const W = DEEP_W + 0.8;
          const len = 2 * 9 + Math.PI * W;
          const e = u * len;
          let lx: number;
          let y: number;
          if (e < 9) [lx, y] = [-W, GROUND + e];
          else if (e < 9 + Math.PI * W) {
            const a = Math.PI - (e - 9) / W;
            [lx, y] = [Math.cos(a) * W, GROUND + 9 + Math.sin(a) * W * 0.45];
          } else [lx, y] = [W, GROUND + 9 - (e - 9 - Math.PI * W)];
          const inner = s % 3 === 0 ? 0.55 : 0;
          o[0] = x + lx * (1 - inner / W);
          o[1] = y - inner * 0.4;
          o[2] = z;
          const p = 0.5 + 0.5 * Math.sin(u * 12 - t * 0.9);
          [o[3], o[4], o[5]] = scale(mix(C.cyan, C.gold, inner ? 0.7 : 0.2), 0.3 + 0.3 * p);
          return true;
        },
      });
    });
  }
}
