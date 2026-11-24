/**
 * Drive, Mars: things to explore (docs/specs/mars-world.md, "Things to explore"). Pure: where the
 * big crashed space stations lie (a broken hull you drive through, a torus ring standing tilted out
 * of the sand, the nose torn off and skidded aside, a scorched trench and a field of debris leading
 * in), the artefacts off the routes (monoliths, dead satellites, alien ruins), and which of them
 * you have found. Placement, surfaces and walls only; lib/art/mars.ts keeps them clear, makes them
 * solid and adds the hulls' floors to the ground the physics drives.
 *
 * 2026-11-24: "make more big crashed space stations on the ground and other artefacts and
 * factories so world is less empty." The vision: "the more u know the more u discover": the map
 * shows a wreck or an artefact only once you have come near it.
 *
 * World: x east, y north, metres. Each wreck lies on ground flattened by its fall (`WRECK_FLATS`),
 * so its floors are at height 0; the artefacts stand on the dunes.
 */

/** A broken hull section lying in the sand, open at both ends: a tube from a to b of radius R, its
 * axis `a` m above the ground (the rest is buried). You drive through it on the sand inside. */
export interface Hull {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  R: number;
  /** How high its axis is above the ground (m). */
  a: number;
}

/** A torus ring standing out of the sand, tilted, broken: its middle `zc` m above the ground, its
 * plane across the heading `h` (the way through it), leaning back by `tilt`. The arc from `gap0`
 * to `gap1` (radians round the ring, 0 at its right, π/2 at its top) is torn away. */
export interface HaloRing {
  x: number;
  y: number;
  h: number;
  R: number;
  tube: number;
  tilt: number;
  zc: number;
  gap0: number;
  gap1: number;
}

/** A solid thing to flow round: a circle (m) standing `top` m tall. */
export interface Solid {
  x: number;
  y: number;
  r: number;
  top: number;
}

export interface Debris {
  x: number;
  y: number;
  r: number;
  rot: number;
  kind: 'plate' | 'girder' | 'pod' | 'panel';
  seed: number;
}

export interface Wreck {
  id: string;
  name: string;
  x: number;
  y: number;
  h: number;
  hull: Hull;
  ring: HaloRing;
  /** The nose, torn off and lying to one side of the hull's front mouth. */
  nose: { x: number; y: number; r: number; h: number };
  /** The scorched trench it ploughed, from far back to the hull's tail. */
  trench: { ax: number; ay: number; bx: number; by: number; w: number };
  debris: Debris[];
}

export type ArtefactKind = 'monolith' | 'satellite' | 'ruins';

export interface Artefact {
  id: string;
  name: string;
  kind: ArtefactKind;
  x: number;
  y: number;
  rot: number;
  seed: number;
}

/** Something to find: a wreck or an artefact, revealed once you come within `reveal` m. */
export interface Discovery {
  id: string;
  name: string;
  kind: 'wreck' | ArtefactKind;
  x: number;
  y: number;
  reveal: number;
}

function hash(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(e0: number, e1: number, v: number): number {
  const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/* ── The crashed stations ─────────────────────────────────── */

interface WreckDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** The hull's heading (the way it slid), its length and radius. */
  h: number;
  L: number;
  R: number;
  /** The ring: where it stands from the middle (along the heading, across it), its radius, how it
   * turns from the heading and how far it leans. */
  ring: { along: number; across: number; R: number; turn: number; tilt: number };
}

/**
 * Five big wrecks, each well off the routes on open ground (kept clear by lib/art/mars.ts): south
 * of the start past the line's end, east beyond the canyons' head, far west past the Rift, north
 * past the Glow Lakes on both sides.
 */
export const WRECK_DEFS: WreckDef[] = [
  {
    id: 'ark',
    name: 'The Fallen Ark',
    x: -700,
    y: -2000,
    h: 0.6,
    L: 200,
    R: 15,
    ring: { along: -20, across: 130, R: 62, turn: 0.9, tilt: 0.35 },
  },
  {
    id: 'halo',
    name: 'Halo Down',
    x: 3900,
    y: 400,
    h: -0.4,
    L: 150,
    R: 12,
    ring: { along: 30, across: -150, R: 86, turn: 0.3, tilt: 0.5 },
  },
  {
    id: 'spindle',
    name: 'The Broken Spindle',
    x: -4100,
    y: 1500,
    h: 2.0,
    L: 220,
    R: 16,
    ring: { along: 40, across: 125, R: 55, turn: -0.7, tilt: 0.25 },
  },
  {
    id: 'leviathan',
    name: 'The Sleeping Leviathan',
    x: 1500,
    y: 7000,
    h: 1.2,
    L: 240,
    R: 17,
    ring: { along: -30, across: -140, R: 70, turn: 1.1, tilt: 0.42 },
  },
  {
    id: 'lantern',
    name: 'The Last Lantern',
    x: -1600,
    y: 6800,
    h: -1.1,
    L: 170,
    R: 13,
    ring: { along: 20, across: 120, R: 50, turn: -0.4, tilt: 0.6 },
  },
];

/** How far a wreck's things reach from its middle (m), for the clearances. */
export const WRECK_REACH = 230;

/** The ground each wreck lies on, flattened by its fall: flat within 240 m, the dunes back by 470. */
export const WRECK_FLATS = WRECK_DEFS.map((d) => ({ x: d.x, y: d.y, flat: 240, full: 470 }));

/** How long the trench runs back from the hull's tail (m), and how wide. */
export const TRENCH = { len: 360, w: 24 };

/** A point in a wreck's frame (u along its heading, v to its left) to the world. */
function frame(d: { x: number; y: number; h: number }, u: number, v: number) {
  const c = Math.cos(d.h);
  const s = Math.sin(d.h);
  return { x: d.x + u * c - v * s, y: d.y + u * s + v * c };
}

/** Lays out one wreck from its def: the hull, the ring, the nose, the trench and the debris. */
export function layWreck(d: WreckDef, wi: number): Wreck {
  const a = frame(d, -d.L / 2, 0);
  const b = frame(d, d.L / 2, 0);
  const hull: Hull = { ax: a.x, ay: a.y, bx: b.x, by: b.y, R: d.R, a: d.R * 0.3 };
  const rc = frame(d, d.ring.along, d.ring.across);
  const ring: HaloRing = {
    x: rc.x,
    y: rc.y,
    h: d.h + d.ring.turn,
    R: d.ring.R,
    tube: 4 + d.ring.R * 0.03,
    tilt: d.ring.tilt,
    zc: d.ring.R * 0.5,
    // Torn away up on its left shoulder.
    gap0: Math.PI / 2 + 0.3,
    gap1: Math.PI / 2 + 0.95,
  };
  const side = d.ring.across > 0 ? -1 : 1;
  const np = frame(d, d.L / 2 + 40, side * (d.R + 16));
  const nose = { x: np.x, y: np.y, r: d.R * 0.9, h: d.h + side * 0.5 };
  const t0 = frame(d, -d.L / 2 - TRENCH.len, 0);
  const trench = { ax: t0.x, ay: t0.y, bx: a.x, by: a.y, w: TRENCH.w };
  const debris: Debris[] = [];
  const kinds: Debris['kind'][] = ['plate', 'girder', 'pod', 'panel'];
  const ok = (u: number, v: number, r: number) => {
    // Off the hull and the lane through it (down the trench, in at its tail, out of its front),
    // off the nose and the ring's feet.
    if (Math.abs(v) < d.R + 10 + r) return false;
    const p = frame(d, u, v);
    if (Math.hypot(p.x - nose.x, p.y - nose.y) < nose.r + r + 6) return false;
    for (const f of ringFeet(ring))
      if (Math.hypot(p.x - f.x, p.y - f.y) < ring.tube + r + 8) return false;
    return true;
  };
  // Along the trench, either side of its middle (its line stays open to drive in on).
  for (let i = 0; i < 16; i++) {
    const u = -d.L / 2 - 30 - hash(wi, i, 1) * (TRENCH.len - 40);
    const v = (hash(wi, i, 2) < 0.5 ? -1 : 1) * (11 + hash(wi, i, 3) * 26);
    const r = 1.2 + 3.8 * hash(wi, i, 4) ** 2;
    const p = frame(d, u, v);
    if (ok(u, v, r))
      debris.push({
        x: p.x,
        y: p.y,
        r,
        rot: hash(wi, i, 5) * Math.PI * 2,
        kind: kinds[Math.floor(hash(wi, i, 6) * 4)],
        seed: hash(wi, i, 7),
      });
  }
  // Scattered round the wreck.
  for (let i = 0; i < 22; i++) {
    const ang = hash(wi, i, 11) * Math.PI * 2;
    const dist = 50 + hash(wi, i, 12) * 160;
    const u = Math.cos(ang) * dist;
    const v = Math.sin(ang) * dist;
    const r = 1.2 + 4.8 * hash(wi, i, 13) ** 2;
    const p = frame(d, u, v);
    if (ok(u, v, r))
      debris.push({
        x: p.x,
        y: p.y,
        r,
        rot: hash(wi, i, 14) * Math.PI * 2,
        kind: kinds[Math.floor(hash(wi, i, 15) * 4)],
        seed: hash(wi, i, 16),
      });
  }
  return { id: d.id, name: d.name, x: d.x, y: d.y, h: d.h, hull, ring, nose, trench, debris };
}

/** Debris this big or bigger is solid; smaller you drive over. */
export const DEBRIS_SOLID = 2.2;

/* ── The hull: a floor to ride, a shell to hold you ───────── */

/** How far up a hull's sides its sand floor curves (share of its half-width at the ground). */
export const HULL_SIDE = 0.75;
/** Below its top by more than this, a wall stops you (m), as a box's (lib/art/mars-works.ts). */
const STEP = 0.6;

/** A hull's half-width where it meets the ground (m). */
export function hullWidth(h: Hull): number {
  return Math.sqrt(h.R * h.R - h.a * h.a);
}

/** A point in a hull's frame: how far along from a (u), how far off its line (v, signed), its length. */
function hullLocal(h: Hull, x: number, y: number) {
  const ex = h.bx - h.ax;
  const ey = h.by - h.ay;
  const L = Math.hypot(ex, ey);
  const u = ((x - h.ax) * ex + (y - h.ay) * ey) / L;
  const v = (-(x - h.ax) * ey + (y - h.ay) * ex) / L;
  return { u, v, L, ex: ex / L, ey: ey / L };
}

/** The sand floor inside a hull at a point: how high it curves up (m, 0 off it or on its line),
 * easing in over its first and last 14 m so you drive in at grade. */
export function hullFloor(h: Hull, x: number, y: number): number {
  const { u, v, L } = hullLocal(h, x, y);
  if (u <= 0 || u >= L) return 0;
  const w = hullWidth(h);
  const av = Math.abs(v);
  const edge = w * HULL_SIDE;
  if (av >= edge) return 0;
  const lift = w - Math.sqrt(w * w - av * av);
  return lift * smooth(0, 14, u) * smooth(0, 14, L - u);
}

/** The hull's shell as walls, for a circle at a point `up` m above the ground: inside it pushes you
 * back toward its line, outside it keeps you off; above its top it is nothing (you fly over). */
export function hullHit(
  h: Hull,
  x: number,
  y: number,
  radius: number,
  up: number,
): { nx: number; ny: number; depth: number } | null {
  if (up > h.a + h.R - STEP) return null;
  const { u, v, L, ex, ey } = hullLocal(h, x, y);
  if (u < 0 || u > L) return null;
  const av = Math.abs(v);
  const w = hullWidth(h);
  const inner = w * HULL_SIDE - radius;
  const outer = w + 1.5;
  if (av <= inner || av >= outer + radius) return null;
  const inside = av < (inner + outer) / 2;
  const side = Math.sign(v) || 1;
  const k = side * (inside ? -1 : 1);
  return { nx: -ey * k, ny: ex * k, depth: inside ? av - inner : outer + radius - av };
}

/** Whether a point is near a hull at all (a cheap test before the others). */
export function nearHull(h: Hull, x: number, y: number, pad: number): boolean {
  const r = h.R + pad;
  return (
    x > Math.min(h.ax, h.bx) - r &&
    x < Math.max(h.ax, h.bx) + r &&
    y > Math.min(h.ay, h.by) - r &&
    y < Math.max(h.ay, h.by) + r
  );
}

/* ── The ring ─────────────────────────────────────────────── */

/** A point on the ring at angle θ (0 its right, π/2 its top): where it is over the ground and how
 * high (m above the ground at its middle). */
export function ringPoint(r: HaloRing, th: number): { x: number; y: number; z: number } {
  // Across the way: s = (-sin h, cos h); up leaned back along the way by the tilt.
  const sx = -Math.sin(r.h);
  const sy = Math.cos(r.h);
  const c = Math.cos(th) * r.R;
  const s = Math.sin(th) * r.R;
  return {
    x: r.x + c * sx + s * Math.cos(r.h) * Math.sin(r.tilt),
    y: r.y + c * sy + s * Math.sin(r.h) * Math.sin(r.tilt),
    z: r.zc + s * Math.cos(r.tilt),
  };
}

/** The angles where the ring meets the ground (the right foot's, then the left's). */
export function ringFootAngles(r: HaloRing): [number, number] {
  const k = Math.max(-1, Math.min(1, -r.zc / (r.R * Math.cos(r.tilt))));
  const a = Math.asin(k);
  return [a, Math.PI - a];
}

/** Where the ring's two feet stand in the sand. */
export function ringFeet(r: HaloRing): { x: number; y: number }[] {
  return ringFootAngles(r).map((th) => {
    const p = ringPoint(r, th);
    return { x: p.x, y: p.y };
  });
}

/** Whether an angle round the ring is torn away. */
export function ringBroken(r: HaloRing, th: number): boolean {
  return th > r.gap0 && th < r.gap1;
}

/* ── The artefacts ────────────────────────────────────────── */

/**
 * Monoliths, dead satellites and alien ruins, each a little off the routes: none on the Red
 * Bastard's loop, the line or a station, close enough to a way you might take to glimpse.
 */
export const ARTEFACT_DEFS: Omit<Artefact, 'seed'>[] = [
  { id: 'mono-south', name: 'The Black Monolith', kind: 'monolith', x: 2200, y: -2600, rot: 0.4 },
  { id: 'mono-east', name: 'The Second Monolith', kind: 'monolith', x: 3400, y: 4400, rot: 2.1 },
  { id: 'mono-west', name: 'The Silent Monolith', kind: 'monolith', x: -3800, y: -1800, rot: 1.2 },
  { id: 'sat-plain', name: 'Dead Satellite Vesta', kind: 'satellite', x: 1200, y: 1300, rot: 0.9 },
  {
    id: 'sat-lakes',
    name: 'Dead Satellite Orpheus',
    kind: 'satellite',
    x: -1100,
    y: 4700,
    rot: 2.6,
  },
  { id: 'sat-west', name: 'Dead Satellite Juno', kind: 'satellite', x: -4000, y: 4200, rot: 4.0 },
  { id: 'ruin-west', name: 'The Glyph Circle', kind: 'ruins', x: -3700, y: -400, rot: 0.2 },
  { id: 'ruin-east', name: 'The Old Gate', kind: 'ruins', x: 4300, y: 4200, rot: 1.4 },
  { id: 'ruin-south', name: 'The Sunken Temple', kind: 'ruins', x: 900, y: -2600, rot: 2.8 },
];

/** How much ground each artefact stands on (m), for the clearances. */
export const ARTEFACT_R: Record<ArtefactKind, number> = { monolith: 6, satellite: 16, ruins: 36 };

/** A monolith: a black slab (its width, depth, height, m). */
export const MONOLITH = { w: 4, d: 1.2, h: 26 };
/** The ruins: pillars in a ring (how many, its radius), each this thick. */
export const RUINS = { n: 10, R: 26, pillar: 1.7 };

/** A pillar of the ruins: where it stands and how tall (some are broken). The two pairs either
 * side of the way through (`rot`) carry lintels: arches you drive under. */
export function ruinPillars(a: Artefact): { x: number; y: number; h: number; arch: boolean }[] {
  const out: { x: number; y: number; h: number; arch: boolean }[] = [];
  for (let k = 0; k < RUINS.n; k++) {
    const th = a.rot + ((k + 0.5) / RUINS.n) * Math.PI * 2;
    // The pillars nearest the way in and the way out stand whole, as arches.
    const arch = k === 0 || k === RUINS.n - 1 || k === RUINS.n / 2 - 1 || k === RUINS.n / 2;
    const broken = !arch && hash(k, a.seed * 100, 3) < 0.45;
    out.push({
      x: a.x + Math.cos(th) * RUINS.R,
      y: a.y + Math.sin(th) * RUINS.R,
      h: arch ? 15 : broken ? 3 + 5 * hash(k, a.seed * 100, 4) : 11 + 4 * hash(k, a.seed * 100, 5),
      arch,
    });
  }
  return out;
}

/** What of an artefact is solid. */
export function artefactSolids(a: Artefact): Solid[] {
  if (a.kind === 'monolith') return [{ x: a.x, y: a.y, r: MONOLITH.w / 2 + 0.3, top: MONOLITH.h }];
  if (a.kind === 'satellite') {
    // Its body, and the dish's foot where its rim digs into the sand.
    const dx = Math.cos(a.rot);
    const dy = Math.sin(a.rot);
    return [
      { x: a.x, y: a.y, r: 4, top: 6 },
      { x: a.x + dx * 9, y: a.y + dy * 9, r: 3, top: 14 },
    ];
  }
  const out: Solid[] = ruinPillars(a).map((p) => ({ x: p.x, y: p.y, r: RUINS.pillar, top: p.h }));
  // The altar in the middle, its glyphs glowing.
  out.push({ x: a.x, y: a.y, r: 3, top: 2.5 });
  return out;
}

/** What of a wreck is solid (the hull's shell is its own wall, `hullHit`): the ring's feet, the
 * nose and the bigger debris. */
export function wreckSolids(w: Wreck): Solid[] {
  const out: Solid[] = ringFeet(w.ring).map((f) => ({
    x: f.x,
    y: f.y,
    r: w.ring.tube + 1,
    top: 8,
  }));
  out.push({ x: w.nose.x, y: w.nose.y, r: w.nose.r, top: w.nose.r * 1.2 });
  for (const d of w.debris)
    if (d.r >= DEBRIS_SOLID) out.push({ x: d.x, y: d.y, r: d.r, top: d.r * 0.9 });
  return out;
}

/** A push out of a solid for a circle at a point `up` m above the ground (null: clear, or above it). */
export function solidHit(
  s: Solid,
  x: number,
  y: number,
  radius: number,
  up: number,
): { nx: number; ny: number; depth: number } | null {
  if (up > s.top - STEP) return null;
  const dx = x - s.x;
  const dy = y - s.y;
  const reach = s.r + radius;
  if (Math.abs(dx) > reach || Math.abs(dy) > reach) return null;
  const d = Math.hypot(dx, dy);
  if (d >= reach) return null;
  return { nx: d > 1e-6 ? dx / d : 1, ny: d > 1e-6 ? dy / d : 0, depth: reach - d };
}

/* ── Lights and finding things ────────────────────────────── */

/**
 * A wrecked lamp's light now (0..1): mostly a dim unsteady glow, now and then dropping out for an
 * eighth of a second, each lamp on its own beat.
 */
export function flicker(t: number, seed: number): number {
  const slot = Math.floor(t * 8);
  if (hash(slot, seed * 1000, 3) < 0.1) return 0.08;
  return 0.75 + 0.25 * Math.sin(t * (5 + seed * 7) + seed * 40);
}

/** How near you must come to find a wreck, and an artefact (m). */
export const REVEAL = { wreck: 450, artefact: 240 };

/** Everything there is to find, given the wrecks and artefacts that stand. */
export function discoveries(wrecks: readonly Wreck[], artefacts: readonly Artefact[]): Discovery[] {
  return [
    ...wrecks.map((w) => ({
      id: w.id,
      name: w.name,
      kind: 'wreck' as const,
      x: w.x,
      y: w.y,
      reveal: REVEAL.wreck,
    })),
    ...artefacts.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      x: a.x,
      y: a.y,
      reveal: REVEAL.artefact,
    })),
  ];
}

/** What you find at a point that you had not found before. */
export function newlyFound(
  found: readonly string[],
  list: readonly Discovery[],
  x: number,
  y: number,
): Discovery[] {
  return list.filter((d) => !found.includes(d.id) && Math.hypot(x - d.x, y - d.y) < d.reveal);
}

/** Where the finds are kept on the device, and how (their ids, comma separated). */
export const FOUND_KEY = 'drive.mars.found';

export function parseFound(s: string | null | undefined): string[] {
  if (!s) return [];
  return [...new Set(s.split(',').map((x) => x.trim()))].filter((x) => /^[a-z0-9-]+$/.test(x));
}

export function foundString(ids: readonly string[]): string {
  return [...new Set(ids)].join(',');
}
