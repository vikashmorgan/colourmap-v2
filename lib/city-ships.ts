/*
 * The player's ships for the City of Dreams (docs/specs/art-city.md, "Ships, cockpits and the
 * map"). Pure: no three.js, no DOM.
 *
 * 2026-11-12: "do a few different spaceships with different cool spaceship cockpit instruments
 * that u see on ur screen. height speed. play with different types of displays".
 *
 * Four designs of our own, each made of grains like the first: the Arrow (the first ship), the
 * Manta (a wide gliding wing), the Ring racer (a pod in a ring) and the Hauler (a long cargo
 * frame). Each flies a little differently (pace, turn, boost, climb) and has its own cockpit:
 * an instrument style and a canopy seen from the pilot's seat. The film is a mood only; no ship
 * here is anyone else's.
 */

import { hash, type Particle, type RGB, type Vec3 } from './bigbang';

export type ShipId = 'arrow' | 'manta' | 'ring' | 'hauler';

/** How the instruments are drawn on screen. */
export type DisplayStyle = 'dials' | 'lines' | 'holo' | 'segments';

/** How a ship flies, each a share of the first ship's (the Arrow, all 1). */
export type Handling = {
  /** Its cruise. */
  speed: number;
  /** How fast it turns. */
  turn: number;
  /** How much faster the boost takes it. */
  boost: number;
  /** How steeply it climbs and dives. */
  climb: number;
};

export type ShipDesign = {
  id: ShipId;
  name: string;
  /** What it is, in a line. */
  line: string;
  handling: Handling;
  /** Its own instruments. */
  display: DisplayStyle;
  /** Its length, in the city's units, as drawn behind the chase camera. */
  len: number;
  /** Its glow: engines and trail. */
  glow: RGB;
  /** Its hull's light. */
  hull: RGB;
};

export const SHIPS: ShipDesign[] = [
  {
    id: 'arrow',
    name: 'Arrow',
    line: 'The first ship: a flat arrowhead, two engines, quick and even.',
    handling: { speed: 1, turn: 1, boost: 1, climb: 1 },
    display: 'dials',
    len: 2.4,
    glow: [0.22, 0.92, 1],
    hull: [0.85, 0.92, 1],
  },
  {
    id: 'manta',
    name: 'Manta',
    line: 'A wide gliding wing: turns and climbs the most, cruises a little slower.',
    handling: { speed: 0.9, turn: 1.3, boost: 0.9, climb: 1.2 },
    display: 'lines',
    len: 2.6,
    glow: [0.75, 0.55, 1],
    hull: [0.92, 0.86, 1],
  },
  {
    id: 'ring',
    name: 'Ring racer',
    line: 'A pod in a turning ring: the fastest and the strongest boost, wide in the turns.',
    handling: { speed: 1.25, turn: 0.85, boost: 1.2, climb: 0.9 },
    display: 'holo',
    len: 2.2,
    glow: [1, 0.74, 0.3],
    hull: [1, 0.9, 0.7],
  },
  {
    id: 'hauler',
    name: 'Hauler',
    line: 'A long cargo frame on four engines: slow and steady, heavy in the turns.',
    handling: { speed: 0.75, turn: 0.7, boost: 0.8, climb: 0.7 },
    display: 'segments',
    len: 3.4,
    glow: [1, 0.6, 0.25],
    hull: [1, 0.85, 0.65],
  },
];

export const SHIP_NAMES = SHIPS.map((s) => s.name);

export const shipById = (id: ShipId): ShipDesign =>
  SHIPS.find((s) => s.id === id) ?? (SHIPS[0] as ShipDesign);

/* ---------- the ship you fly, remembered on the device ---------- */

export const SHIP_KEY = 'colourmap:city-ship';

let current: ShipId = 'arrow';

export const currentShip = (): ShipDesign => shipById(current);

/** Picks a ship by its place in SHIPS, remembered on the device (where there is one). */
export function setShip(i: number) {
  const s = SHIPS[Math.max(0, Math.min(SHIPS.length - 1, Math.round(i)))] as ShipDesign;
  current = s.id;
  try {
    window.localStorage.setItem(SHIP_KEY, s.id);
  } catch {
    // Not remembered; still chosen.
  }
}

export const shipIndex = () => SHIPS.findIndex((s) => s.id === current);

/** The ship last flown on this device, or the Arrow. */
export function loadShip() {
  try {
    const id = window.localStorage.getItem(SHIP_KEY);
    if (id && SHIPS.some((s) => s.id === id)) current = id as ShipId;
  } catch {
    // The Arrow.
  }
}

/* ---------- each ship's grains ---------- */

export type ShipPart = 'hull' | 'spine' | 'engine' | 'trail';

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;

/**
 * The ship's own axes at c heading f, banked `roll`: side (to its right) and up. A ship heading
 * straight up or down keeps a sideways axis all the same.
 */
export function shipAxes(f: Vec3, roll: number): { side: Vec3; up: Vec3 } {
  let side0 = cross(f, [0, 1, 0]);
  if (Math.hypot(side0[0], side0[1], side0[2]) < 1e-6) side0 = [1, 0, 0];
  side0 = norm(side0);
  const up0 = cross(side0, f);
  const side = add(
    [side0[0] * Math.cos(roll), side0[1] * Math.cos(roll), side0[2] * Math.cos(roll)],
    up0,
    Math.sin(roll),
  );
  return { side, up: cross(side, f) };
}

/*
 * The boost's plume (2026-11-13: "effects behind ship for the boost"). `glow` (0..1) rises while
 * you boost and fades slowly after: the trail grows longer (up to 1.6 ship lengths more), a gentle
 * ripple running down it, growing from nothing at the engines; brighter and fuller (fading less
 * along its length), the engines brighter, and a few of the engines' grains given to the trail.
 */

/** Where trail grain `u` (0 at the engine, 1 at the tail) sits, behind the engine in ship lengths. */
export function plumeAt(
  u: number,
  pace: number,
  glow = 0,
  t = 0,
): { back: number; side: number; up: number } {
  const wave = TAU * 1.5 * u - 6 * t;
  return {
    back: u * (0.25 + 0.55 * pace + 1.6 * glow),
    side: 0.05 * glow * u * Math.sin(wave),
    up: 0.03 * glow * u * Math.cos(wave),
  };
}

/** Where the engines' grains end and the trail's begin (engines from lo), more trail at full glow. */
export const engineCut = (lo: number, hi: number, glow = 0) => lo + (hi - lo) * (1 - 0.35 * glow);

/** How bright the engines are, and trail grain u, as a share of the glow colour (never over 1). */
export const engineLight = (glow = 0) => 0.55 * (1 + 0.5 * glow);
export const trailLight = (u: number, glow = 0) =>
  0.35 * (1 - u * (1 - 0.4 * glow)) * (1 + 0.5 * glow);

/** A point on the outline through `pts` (closed), `s` (0..1) round it. */
function outline(pts: [number, number][], e: number, s: number): [number, number] {
  const A = pts[e % pts.length] as [number, number];
  const B = pts[(e + 1) % pts.length] as [number, number];
  return [lerp(A[0], B[0], s), lerp(A[1], B[1], s)];
}

/**
 * Grain p on ship `id` at c heading f, `len` long, banked `roll`, its trail longer the faster it
 * goes (`pace` 0 at rest) and with the boost's `glow` (plumeAt, `t` the time for its ripple). In
 * the ship's own units: a along it (nose +), s to its side, h up. The Arrow is drawn by
 * lib/city.ts (its first shape); this is every other one, and the Arrow too for a caller without it.
 */
export function shipGrainAt(
  id: ShipId,
  c: Vec3,
  f: Vec3,
  len: number,
  p: Particle,
  pace: number,
  roll = 0,
  glow = 0,
  t = 0,
): { pos: Vec3; part: ShipPart } {
  const { side, up } = shipAxes(f, roll);
  const at = (a: number, s: number, h: number): Vec3 =>
    add(add(add(c, f, a * len), side, s * len), up, h * len);
  const q = p.b;
  const u = hash(p.i, 92);
  const pick = (n: number) => Math.floor(hash(p.i, 91) * n);
  const trail = (a0: number, s0: number, h0 = 0) => {
    const w = plumeAt(u, pace, glow, t);
    return { pos: at(a0 - w.back, s0 + w.side, h0 + w.up), part: 'trail' as const };
  };
  switch (id) {
    case 'manta': {
      // A ray's wing: the nose, the leading edges curving out to the tips, the trailing edge in.
      if (q < 0.5) {
        const pts: [number, number][] = [
          [0.42, 0],
          [0.22, 0.22],
          [0.02, 0.46],
          [-0.12, 0.62],
          [-0.22, 0.4],
          [-0.3, 0.12],
          [-0.36, 0],
          [-0.3, -0.12],
          [-0.22, -0.4],
          [-0.12, -0.62],
          [0.02, -0.46],
          [0.22, -0.22],
        ];
        const [a, s] = outline(pts, pick(pts.length), u);
        // The wing bows down a little toward its tips.
        return { pos: at(a, s, -0.08 * s * s), part: 'hull' };
      }
      if (q < 0.62) {
        // The tail: one thin line behind.
        return { pos: at(-0.36 - u * 0.5, 0, 0.02), part: 'spine' };
      }
      const e = hash(p.i, 94) < 0.5 ? 1 : -1;
      if (q < engineCut(0.62, 0.8, glow)) {
        const a = hash(p.i, 95) * TAU;
        return {
          pos: at(-0.26, e * 0.14 + Math.cos(a) * 0.04, Math.sin(a) * 0.04),
          part: 'engine',
        };
      }
      return trail(-0.28, e * 0.14);
    }
    case 'ring': {
      // A pod, and round it a ring standing across the way it flies, turning slowly.
      if (q < 0.45) {
        const a = u * TAU + (p.i % 7) * 0.02;
        return { pos: at(-0.04, Math.cos(a) * 0.4, Math.sin(a) * 0.4), part: 'hull' };
      }
      if (q < 0.7) {
        // The pod: a long drop, pointed at the nose.
        const a = hash(p.i, 95) * TAU;
        const along = lerp(0.42, -0.3, u);
        const r = 0.13 * Math.sin(Math.PI * Math.min(1, (0.42 - along) / 0.72)) ** 0.6;
        return { pos: at(along, Math.cos(a) * r, Math.sin(a) * r), part: 'spine' };
      }
      if (q < 0.8) {
        // Four struts from the pod out to the ring.
        const k = pick(4);
        const a = (k * TAU) / 4 + TAU / 8;
        const r = lerp(0.12, 0.4, u);
        return { pos: at(-0.04, Math.cos(a) * r, Math.sin(a) * r), part: 'spine' };
      }
      if (q < engineCut(0.8, 0.88, glow)) {
        const a = hash(p.i, 95) * TAU;
        return { pos: at(-0.32, Math.cos(a) * 0.06, Math.sin(a) * 0.06), part: 'engine' };
      }
      return trail(-0.34, 0);
    }
    case 'hauler': {
      // A long frame: the box's twelve edges, ribs across it, a cab at the front, four engines.
      if (q < 0.5) {
        const w = 0.17;
        const h = 0.1;
        const k = pick(12);
        const x = (k & 1 ? 1 : -1) * w;
        const y = (k & 2 ? 1 : -1) * h;
        if (k < 4) return { pos: at(lerp(0.3, -0.45, u), x, y), part: 'hull' };
        const a = k < 8 ? 0.3 : -0.45;
        const kk = k % 4;
        return {
          pos:
            kk < 2 ? at(a, lerp(-w, w, u), kk ? h : -h) : at(a, kk === 2 ? w : -w, lerp(-h, h, u)),
          part: 'hull',
        };
      }
      if (q < 0.62) {
        // Ribs round the frame, every fifth of its length.
        const r = pick(5);
        const a = lerp(0.2, -0.38, r / 4);
        const t = u * 4;
        const e = Math.floor(t);
        const s = t - e;
        const pts: [number, number][] = [
          [-0.17, -0.1],
          [0.17, -0.1],
          [0.17, 0.1],
          [-0.17, 0.1],
        ];
        const [x, y] = outline(pts, e, s);
        return { pos: at(a, x, y), part: 'spine' };
      }
      if (q < 0.7) {
        // The cab: a short rounded nose ahead of the frame.
        const a = hash(p.i, 95) * TAU;
        return {
          pos: at(0.3 + 0.12 * u, Math.cos(a) * 0.1 * (1 - u), 0.04 + Math.sin(a) * 0.07 * (1 - u)),
          part: 'spine',
        };
      }
      const k = pick(4);
      const ex = k & 1 ? 0.11 : -0.11;
      const ey = k & 2 ? 0.06 : -0.06;
      if (q < engineCut(0.7, 0.84, glow)) {
        const a = hash(p.i, 95) * TAU;
        return { pos: at(-0.47, ex + Math.cos(a) * 0.04, ey + Math.sin(a) * 0.04), part: 'engine' };
      }
      return trail(-0.5, ex, ey);
    }
    default: {
      // The Arrow: a flat arrowhead with a raised spine and two engines (lib/city.ts's first ship).
      if (q < 0.42) {
        const pts: [number, number][] = [
          [0.5, 0],
          [-0.45, 0.42],
          [-0.28, 0],
          [-0.45, -0.42],
        ];
        const [a, s] = outline(pts, pick(4), u);
        return { pos: at(a, s, 0), part: 'hull' };
      }
      if (q < 0.58)
        return { pos: at(0.45 - u * 0.75, 0, 0.07 * Math.sin(Math.PI * u)), part: 'spine' };
      const e = hash(p.i, 94) < 0.5 ? 1 : -1;
      if (q < engineCut(0.58, 0.76, glow)) {
        const a = hash(p.i, 95) * TAU;
        return { pos: at(-0.3, e * 0.17 + Math.cos(a) * 0.05, Math.sin(a) * 0.05), part: 'engine' };
      }
      return trail(-0.32, e * 0.17);
    }
  }
}

/**
 * A grain's colour on ship `id`: the hull's quiet light, the engines and trail in its glow,
 * brighter and fuller with the boost's `glow` (no channel over 1).
 */
export function shipGrainColour(id: ShipId, part: ShipPart, p: Particle, k: number, glow = 0): RGB {
  const s = shipById(id);
  const sc = (c: RGB, m: number): RGB => [
    Math.min(1, c[0] * m),
    Math.min(1, c[1] * m),
    Math.min(1, c[2] * m),
  ];
  switch (part) {
    case 'hull':
      return sc(s.hull, 0.28 * k);
    case 'spine':
      return sc(s.hull, 0.34 * k);
    case 'engine':
      return sc(s.glow, engineLight(glow) * k);
    default:
      return sc(s.glow, trailLight(hash(p.i, 92), glow) * k);
  }
}
