/**
 * Drive, Mars: the factory city (docs/specs/mars-world.md, "The factory city"). Pure: where the
 * Foundry Town's streets and buildings stand, the big nuclear towns, the mega works in the City's
 * factory shapes, and the pieces you ride: roofs and tank tops to land on, conveyor ramps to jump,
 * a barrel pipe to ride through, a chimney slalom. Placement and surfaces only; lib/art/mars.ts
 * keeps them clear, makes them solid and adds the surfaces to the ground the physics drives.
 *
 * 2026-11-24: "much more big ass factories with shapes like the ones in city's factory designs.
 * and big ass nuclear towns"; "make sure u can ride, shred or play with factory elements as jumps
 * or loops to pass through. also some massive town part factory with streets u can race through".
 *
 * The shapes come from the City's Industry superquarter (lib/city-industry.ts): sawtooth halls,
 * silo batteries, preheater towers of stacked cyclones, hyperboloid cooling towers, chimneys,
 * diagonal conveyor galleries.
 *
 * A true vertical loop cannot be driven on Mars: the ground is a height field (one height per
 * point), so nothing can overhang. The "loop to pass through" is a barrel instead: a giant pipe
 * you drive through, its floor curving up its sides like a half-pipe so you ride high round it.
 *
 * World: x east, y north, metres. Everything here stands on flattened ground (`FLATS`), so the
 * floors are at height 0.
 */

/** A box standing on the flat: solid below its top; `roof`: its top can be landed on and driven
 * (inset a little from its walls, so you never climb a wall from the street). */
export interface Box {
  x: number;
  y: number;
  /** Half its length along `rot`, half its width across, its height (m). */
  hx: number;
  hy: number;
  rot: number;
  h: number;
  roof: boolean;
  kind: 'hall' | 'warehouse' | 'block' | 'wall';
  seed: number;
}

/** A tank: a drum standing on the flat, its top a landing (inset like a roof). */
export interface Tank {
  x: number;
  y: number;
  r: number;
  h: number;
}

/** A barrel pipe: a giant tube from a to b of radius R, its floor curving up its sides. */
export interface Barrel {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  R: number;
}

/** Ground kept flat for a town: flat within `flat` m of its middle, the dunes back by `full`. */
export interface Flat {
  x: number;
  y: number;
  flat: number;
  full: number;
}

/** A tall thing standing alone (a chimney, a cooling tower, a reactor, a works). */
export interface Work {
  x: number;
  y: number;
  kind: 'chimney' | 'cooling' | 'reactor' | 'preheater' | 'silos';
  rot: number;
}

/** A conveyor ramp or roof ramp to jump: where it starts, its heading, its size. */
export interface Ramp {
  x: number;
  y: number;
  h: number;
  len: number;
  height: number;
  width: number;
}

/** A roof or tank top this far in from its walls is where the landing starts (m). */
export const ROOF_INSET = 2;
/** Below its top by more than this, a box or tank is a wall to you (m). */
export const ROOF_STEP = 0.6;
/** How far up a barrel's sides its floor curves (share of its radius across). */
export const BARREL_SIDE = 0.75;

function hash(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ── The Foundry Town ─────────────────────────────────────── */

/**
 * The Foundry Town, east of the Factory Belt: a grid of 64 m blocks and 24 m streets on a slight
 * turn, its middle row of blocks left open as a wide avenue (112 m) with a chimney slalom down it,
 * roof ramps along it and a barrel pipe at its far end.
 */
export const TOWN = { x: 3650, y: 2350, rot: 0.25, block: 64, street: 24, n: 5 };
export const TOWN_FLAT: Flat = { x: TOWN.x, y: TOWN.y, flat: 330, full: 600 };

/** The nuclear towns: a reactor dome, a ring of cooling towers, workers' blocks between. */
export const NUKES: { x: number; y: number; name: string; rot: number }[] = [
  { x: 2700, y: 5350, name: 'Reactor Town', rot: 0.3 },
  { x: -3400, y: 5650, name: 'Cooling Ring', rot: 1.1 },
];
export const NUKE_FLAT = { flat: 300, full: 560 };
/** How far the reactors' radiation reaches (m), and how strong it is at the dome (0..1). */
export const NUKE_RAD = { reach: 380, peak: 0.7 };

export const FLATS: Flat[] = [
  TOWN_FLAT,
  ...NUKES.map((n) => ({ x: n.x, y: n.y, flat: NUKE_FLAT.flat, full: NUKE_FLAT.full })),
];

/** A point in the town's frame (u along the avenue, v across) to the world. */
export function townXY(u: number, v: number): { x: number; y: number } {
  const c = Math.cos(TOWN.rot);
  const s = Math.sin(TOWN.rot);
  return { x: TOWN.x + u * c - v * s, y: TOWN.y + u * s + v * c };
}

const PITCH = TOWN.block + TOWN.street;

/** The town's buildings, tanks, chimneys, ramps and barrel. */
function layTown() {
  const boxes: Box[] = [];
  const tanks: Tank[] = [];
  const works: Work[] = [];
  const ramps: Ramp[] = [];
  const half = TOWN.block / 2;
  for (let i = 0; i < TOWN.n; i++) {
    for (let j = 0; j < TOWN.n; j++) {
      if (j === 2) continue; // the avenue
      const u = (i - 2) * PITCH;
      const v = (j - 2) * PITCH;
      const seed = hash(i, j, 3);
      // The blocks facing the avenue keep their roofs at 12 m, for the roof ramps.
      const front = j === 1 || j === 3;
      if (seed < 0.4 || front) {
        // One foundry hall filling the block.
        const p = townXY(u, v);
        boxes.push({
          x: p.x,
          y: p.y,
          hx: half - 2,
          hy: half - 2,
          rot: TOWN.rot,
          h: front ? 12 : 16 + 10 * hash(i, j, 4),
          roof: true,
          kind: 'hall',
          seed,
        });
      } else if (seed < 0.75) {
        // Two warehouses with an alley between them (8 m: thread it).
        for (const s of [-1, 1]) {
          const p = townXY(u, v + s * (half / 2 + 2));
          boxes.push({
            x: p.x,
            y: p.y,
            hx: half - 2,
            hy: half / 2 - 4,
            rot: TOWN.rot,
            h: 9 + 8 * hash(i, j, 5 + s),
            roof: true,
            kind: 'warehouse',
            seed: hash(i, j, 6 + s),
          });
        }
      } else {
        // A tank yard: three drums to land on, and a chimney.
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + seed;
          const p = townXY(u + Math.cos(a) * 15, v + Math.sin(a) * 15);
          tanks.push({ x: p.x, y: p.y, r: 9, h: 10 + 4 * hash(i, j, k) });
        }
        const c = townXY(u, v);
        works.push({ x: c.x, y: c.y, kind: 'chimney', rot: 0 });
      }
    }
  }
  // The chimney slalom down the second half of the avenue: seven stacks, alternating sides of its line.
  for (let k = 0; k < 7; k++) {
    const p = townXY(-10 + k * 30, (k % 2 ? 1 : -1) * 13);
    works.push({ x: p.x, y: p.y, kind: 'chimney', rot: 0 });
  }
  // Roof ramps: along the first half of the avenue, slanting out toward the blocks either side (52° off its line, so
  // the run-up stays on the avenue), their 15 m lips flinging you onto the 12 m roofs.
  for (const i of [0, 1]) {
    for (const s of [-1, 1]) {
      // Apart along the avenue, so neither's run-up crosses the other.
      const p = townXY((i - 2) * PITCH + (s > 0 ? -39 : 26), s * 8);
      ramps.push({ x: p.x, y: p.y, h: TOWN.rot + s * 0.9, len: 30, height: 15, width: 10 });
    }
  }
  // The barrel at the avenue's far end, on its line.
  const a = townXY(PITCH * 2 + 40, 0);
  const b = townXY(PITCH * 2 + 140, 0);
  const barrel: Barrel = { ax: a.x, ay: a.y, bx: b.x, by: b.y, R: 10 };
  return { boxes, tanks, works, ramps, barrel };
}

/** A nuclear town: the dome in the middle, six cooling towers round it, workers' blocks in a ring
 * between, a few tanks. */
function layNuke(n: (typeof NUKES)[number], ni: number) {
  const boxes: Box[] = [];
  const tanks: Tank[] = [];
  const works: Work[] = [{ x: n.x, y: n.y, kind: 'reactor', rot: n.rot }];
  for (let k = 0; k < 6; k++) {
    const a = n.rot + (k / 6) * Math.PI * 2;
    works.push({
      x: n.x + Math.cos(a) * 215,
      y: n.y + Math.sin(a) * 215,
      kind: 'cooling',
      rot: a,
    });
  }
  // Workers' blocks: long low blocks on the ring between dome and towers, gaps between them.
  for (let k = 0; k < 12; k++) {
    const a = n.rot + ((k + 0.5) / 12) * Math.PI * 2;
    const r = k % 2 ? 120 : 150;
    boxes.push({
      x: n.x + Math.cos(a) * r,
      y: n.y + Math.sin(a) * r,
      hx: 22,
      hy: 8,
      rot: a + Math.PI / 2,
      h: 10 + 6 * hash(ni, k, 2),
      roof: true,
      kind: 'block',
      seed: hash(ni, k, 3),
    });
  }
  for (let k = 0; k < 3; k++) {
    const a = n.rot + (k / 3) * Math.PI * 2 + 0.52;
    tanks.push({ x: n.x + Math.cos(a) * 72, y: n.y + Math.sin(a) * 72, r: 10, h: 12 });
  }
  return { boxes, tanks, works };
}

/** The mega works out on the Factory Belt and round the town, in the City's factory shapes; kept
 * only where clear (lib/art/mars.ts). Each with a conveyor gallery to jump. */
export const MEGA_WORKS: Work[] = [
  { x: 2950, y: 3300, kind: 'preheater', rot: 0.4 },
  { x: 3050, y: 1750, kind: 'silos', rot: 1.2 },
  { x: 2050, y: 2200, kind: 'cooling', rot: 0 },
  { x: 2900, y: 2400, kind: 'preheater', rot: 2.2 },
  { x: 2700, y: 3650, kind: 'silos', rot: 0.1 },
  { x: 4300, y: 2900, kind: 'cooling', rot: 0 },
  { x: 4350, y: 1700, kind: 'preheater', rot: 3.0 },
];

/** How much ground each works stands on (its footprint's radius, m). */
export const WORK_R: Record<Work['kind'], number> = {
  chimney: 3.5,
  cooling: 30,
  reactor: 32,
  preheater: 22,
  silos: 26,
};

/** A conveyor gallery beside a works: a long iron ramp up to a high lip (20 m), pointing away. */
export function galleryFor(w: Work): Ramp {
  const r = WORK_R[w.kind] + 18;
  return {
    x: w.x + Math.cos(w.rot) * r,
    y: w.y + Math.sin(w.rot) * r,
    h: w.rot + Math.PI / 2,
    len: 70,
    height: 20,
    width: 9,
  };
}

const town = layTown();
const nukes = NUKES.map(layNuke);

/** Everything in the factory city, laid out (before the clearances). */
export const CITY = {
  boxes: [...town.boxes, ...nukes.flatMap((n) => n.boxes)],
  tanks: [...town.tanks, ...nukes.flatMap((n) => n.tanks)],
  works: [...town.works, ...nukes.flatMap((n) => n.works)],
  ramps: town.ramps,
  barrels: [town.barrel],
};

/* ── Surfaces and walls ───────────────────────────────────── */

/** A point in a box's own frame. */
function local(b: Box, x: number, y: number): { u: number; v: number } {
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  const dx = x - b.x;
  const dy = y - b.y;
  return { u: dx * c + dy * s, v: -dx * s + dy * c };
}

/** The top you can land on at a point (m), or -Infinity: the roofs and tank tops, inset. */
export function platformTop(
  boxes: readonly Box[],
  tanks: readonly Tank[],
  x: number,
  y: number,
): number {
  let top = Number.NEGATIVE_INFINITY;
  for (const b of boxes) {
    if (!b.roof) continue;
    const reach = b.hx + b.hy;
    if (Math.abs(x - b.x) > reach || Math.abs(y - b.y) > reach) continue;
    const { u, v } = local(b, x, y);
    if (Math.abs(u) < b.hx - ROOF_INSET && Math.abs(v) < b.hy - ROOF_INSET)
      top = Math.max(top, b.h);
  }
  for (const t of tanks) {
    if (Math.abs(x - t.x) > t.r || Math.abs(y - t.y) > t.r) continue;
    if (Math.hypot(x - t.x, y - t.y) < t.r - ROOF_INSET) top = Math.max(top, t.h);
  }
  return top;
}

/** A push out of a box's walls for a circle of `radius` at a height z (null: clear, or above its
 * top). Returns the outward normal and how deep. */
export function boxHit(
  b: Box,
  x: number,
  y: number,
  radius: number,
  z: number,
): { nx: number; ny: number; depth: number } | null {
  if (z > b.h - ROOF_STEP) return null;
  const reach = b.hx + b.hy + radius;
  if (Math.abs(x - b.x) > reach || Math.abs(y - b.y) > reach) return null;
  const { u, v } = local(b, x, y);
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  const toWorld = (nu: number, nv: number) => ({ nx: nu * c - nv * s, ny: nu * s + nv * c });
  const iu = b.hx - Math.abs(u);
  const iv = b.hy - Math.abs(v);
  if (iu > 0 && iv > 0) {
    // Inside: out the nearer side.
    if (iu < iv) return { ...toWorld(Math.sign(u) || 1, 0), depth: iu + radius };
    return { ...toWorld(0, Math.sign(v) || 1), depth: iv + radius };
  }
  const cu = Math.max(-b.hx, Math.min(b.hx, u));
  const cv = Math.max(-b.hy, Math.min(b.hy, v));
  const du = u - cu;
  const dv = v - cv;
  const d = Math.hypot(du, dv);
  if (d >= radius || d < 1e-9) return null;
  return { ...toWorld(du / d, dv / d), depth: radius - d };
}

/** The barrel's floor at a point: how high it curves up (m, 0 off it or on its line), and
 * whether the point is against its shell (past where the floor stops curving). */
export function barrelAt(b: Barrel, x: number, y: number): { h: number; shell: number } {
  const ex = b.bx - b.ax;
  const ey = b.by - b.ay;
  const L = Math.hypot(ex, ey);
  const u = ((x - b.ax) * ex + (y - b.ay) * ey) / L;
  if (u < 0 || u > L) return { h: 0, shell: 0 };
  const v = Math.abs((-(x - b.ax) * ey + (y - b.ay) * ex) / L);
  const edge = b.R * BARREL_SIDE;
  if (v >= edge) return { h: 0, shell: v - edge };
  return { h: b.R - Math.sqrt(b.R * b.R - v * v), shell: 0 };
}

/** The barrel's shell as walls: a push back inside for a circle at a point past the floor's
 * curve, within a few metres of it (outside the tube it is solid too). */
export function barrelHit(
  b: Barrel,
  x: number,
  y: number,
  radius: number,
): { nx: number; ny: number; depth: number } | null {
  const ex = b.bx - b.ax;
  const ey = b.by - b.ay;
  const L = Math.hypot(ex, ey);
  const u = ((x - b.ax) * ex + (y - b.ay) * ey) / L;
  if (u < 0 || u > L) return null;
  const sv = (-(x - b.ax) * ey + (y - b.ay) * ex) / L;
  const v = Math.abs(sv);
  const inner = b.R * BARREL_SIDE - radius;
  const outer = b.R + 1.5;
  if (v <= inner || v >= outer + radius) return null;
  // Inside the tube: pushed back toward its line; outside it: pushed away.
  const inside = v < (inner + outer) / 2;
  const side = Math.sign(sv) || 1;
  const nx = (-ey / L) * side * (inside ? -1 : 1);
  const ny = (ex / L) * side * (inside ? -1 : 1);
  return { nx, ny, depth: inside ? v - inner : outer + radius - v };
}
