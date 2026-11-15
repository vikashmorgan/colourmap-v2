/*
 * Clockwork for the City of Dreams' Industry superquarter (docs/specs/art-city.md, "Industry
 * superquarter and the observatory"): huge gears meshing and turning, big spinning wheels, wind
 * turbines with turning blades and the atom symbol, each a formula from a light site's number and
 * the time to a point. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "mechanical clockwork movements: huge gears meshing and rotating, a moving factory,
 * big and beautiful", "windmills with turning blades, big spinning wheels", and "the ATOM SYMBOL
 * (nucleus plus orbiting electron rings, rotating) on top of one of the big industry towers".
 *
 * Gears mesh truly: every gear of a train has the same tooth pitch (teeth in proportion to its
 * radius), neighbours stand their two pitch radii apart, turn the opposite way at speeds in inverse
 * proportion to their radii, and start at the phase that puts one's tooth in the other's gap where
 * they touch (toothPhase sums to a whole number there, for all time). Slow: a big gear takes over a
 * minute a turn. The sites write straight into the renderer's array; nothing is allocated per grain.
 */

import { GROUND, lerp, TAU } from './city-grid';

/** A gear (or, with no teeth, a wheel) standing upright: its disc across z ('z') or across x ('x'). */
export type Gear = {
  /** Its middle: annex-local across, height over the street, along. */
  x: number;
  y: number;
  z: number;
  /** Its pitch radius, its teeth (0: a spoked wheel), how deep they stand. */
  r: number;
  n: number;
  depth: number;
  /** Its turn, radians a second (positive: counter-clockwise seen from +z, or from +x), and at t = 0. */
  w: number;
  th0: number;
  plane: 'z' | 'x';
  spokes: number;
};

/** The pitch of every train's teeth: arc length per tooth along the pitch circle. */
export const TOOTH_PITCH = 3.1;
/** How many teeth a gear of pitch radius r has, for the common pitch. */
export const teethFor = (r: number) => Math.max(8, Math.round((TAU * r) / TOOTH_PITCH));

/** Gear g's turn at time t. */
export const gearAngle = (g: Gear, t: number) => g.th0 + g.w * t;

/**
 * Where along its teeth gear g is at angle a (in its plane, from its +u axis) at time t: 0..1 per
 * tooth, a tooth standing out over 0..0.5 (its tip at 0.25), a gap over 0.5..1.
 */
export function toothPhase(g: Gear, a: number, t: number): number {
  const v = (g.n * (a - gearAngle(g, t))) / TAU;
  return v - Math.floor(v);
}

/**
 * A gear meshing with `p` toward angle `dir` from p's middle (in their shared plane): pitch radius
 * r, the opposite turn at p's speed times p.r / r, started where its gap meets p's tooth.
 */
export function meshWith(p: Gear, dir: number, r: number, spokes = 6): Gear {
  const n = Math.round((p.n * r) / p.r);
  const rr = (n * p.r) / p.n;
  const dist = p.r + rr;
  const du = Math.cos(dir) * dist;
  const dv = Math.sin(dir) * dist;
  const w = (-p.w * p.r) / rr;
  // At the contact (angle dir on p, dir + π on the new gear) the two phases sum to a whole number.
  const th0 = dir + Math.PI + (p.n * (dir - p.th0)) / n;
  return {
    x: p.plane === 'z' ? p.x + du : p.x,
    y: p.y + dv,
    z: p.plane === 'z' ? p.z : p.z + du,
    r: rr,
    n,
    depth: p.depth,
    w,
    th0,
    plane: p.plane,
    spokes,
  };
}

/** A point (u, v) in gear g's plane into o[0..2]: world x, y, z for the copy shifted (ox, oz). */
function inPlane(g: Gear, u: number, v: number, ox: number, oz: number, o: number[]): void {
  if (g.plane === 'z') {
    o[0] = ox + g.x + u;
    o[2] = oz + g.z;
  } else {
    o[0] = ox + g.x;
    o[2] = oz + g.z + u;
  }
  o[1] = GROUND + g.y + v;
}

/** The rim's radius at angle a: the pitch circle, teeth standing out half their depth, gaps sunk as much. */
export function rimRadius(g: Gear, a: number, t: number): number {
  if (g.n <= 0) return g.r;
  const w = Math.sin(TAU * toothPhase(g, a, t));
  return g.r + (g.depth / 2) * Math.max(-1, Math.min(1, 2.6 * w));
}

/**
 * Site s (of count) of gear g at time t into o: its toothed rim (or a wheel's double rim), an
 * inner ring, its spokes and its hub. Returns the part: 0 rim, 1 ring, 2 spokes, 3 hub.
 */
export function gearSite(
  g: Gear,
  s: number,
  count: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): number {
  const th = gearAngle(g, t);
  const u = (s + 0.5) / count;
  if (u < 0.5) {
    // The rim: the toothed outline all round (a wheel: two rims a little apart).
    const f = u / 0.5;
    const a = f * TAU;
    let rr = rimRadius(g, a, t);
    if (g.n <= 0 && s % 2 === 1) rr -= 1.1;
    inPlane(g, Math.cos(a) * rr, Math.sin(a) * rr, ox, oz, o);
    return 0;
  }
  if (u < 0.62) {
    const a = ((u - 0.5) / 0.12) * TAU;
    const rr = g.r * 0.72;
    inPlane(g, Math.cos(a) * rr, Math.sin(a) * rr, ox, oz, o);
    return 1;
  }
  if (u < 0.92) {
    // The spokes, turning with it.
    const f = (u - 0.62) / 0.3;
    const k = Math.floor(f * g.spokes);
    const along = f * g.spokes - k;
    const a = th + (k / g.spokes) * TAU;
    const rr = lerp(g.r * 0.16, g.r * (g.n > 0 ? 0.72 : 0.94), along);
    inPlane(g, Math.cos(a) * rr, Math.sin(a) * rr, ox, oz, o);
    return 2;
  }
  // The hub: a small ring, turning.
  const a = th + ((u - 0.92) / 0.08) * TAU;
  const rr = g.r * 0.15;
  inPlane(g, Math.cos(a) * rr, Math.sin(a) * rr, ox, oz, o);
  return 3;
}

/* ---------- wind turbines ---------- */

/** A wind turbine: its foot (annex-local), hub height, blade length, turn rate and phase; rotor across z. */
export type Windmill = { x: number; z: number; hub: number; blade: number; w: number; th0: number };
/** Blade b's angle (of three) of windmill m at time t. */
export const bladeAngle = (m: Windmill, b: number, t: number) => m.th0 + m.w * t + (b * TAU) / 3;

/**
 * Site s (of count) of windmill m at time t into o: its tapering mast, its nacelle, its three
 * turning blades (two edges each, narrowing to the tip) and a soft lamp on each tip. Returns the
 * part: 0 mast, 1 nacelle, 2 blade, 3 tip lamp.
 */
export function windmillSite(
  m: Windmill,
  s: number,
  count: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): number {
  const u = (s + 0.5) / count;
  if (u < 0.3) {
    const f = u / 0.3;
    const k = s % 3;
    const a = (k / 3) * TAU;
    const rr = lerp(1.5, 0.6, f);
    o[0] = ox + m.x + Math.cos(a) * rr;
    o[1] = GROUND + f * m.hub;
    o[2] = oz + m.z + Math.sin(a) * rr + 0.9;
    return 0;
  }
  if (u < 0.38) {
    const f = (u - 0.3) / 0.08;
    const a = f * TAU * 3;
    o[0] = ox + m.x + Math.cos(a) * 0.9;
    o[1] = GROUND + m.hub + Math.sin(a) * 0.9;
    o[2] = oz + m.z + 0.9 + f * 4;
    return 1;
  }
  if (u < 0.94) {
    const f = (u - 0.38) / 0.56;
    const b = Math.floor(f * 3);
    const along = f * 3 - b;
    const a = bladeAngle(m, b, t);
    const side = s % 2 === 0 ? 1 : -1;
    const half = lerp(1.1, 0.15, along) * side;
    const L = along * m.blade;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    o[0] = ox + m.x + ca * L - sa * half;
    o[1] = GROUND + m.hub + sa * L + ca * half;
    o[2] = oz + m.z;
    return 2;
  }
  const b = s % 3;
  const a = bladeAngle(m, b, t);
  o[0] = ox + m.x + Math.cos(a) * m.blade;
  o[1] = GROUND + m.hub + Math.sin(a) * m.blade;
  o[2] = oz + m.z;
  return 3;
}

/* ---------- the atom symbol ---------- */

/** The atom: its middle (annex-local), its orbits' half-length, their turn round the vertical. */
export type Atom = { x: number; y: number; z: number; R: number; w: number };
/** How flat each orbit is (its half-width over its half-length). */
export const ORBIT_FLAT = 0.36;
/** How fast the electrons run round their orbits, radians a second. */
export const ELECTRON_W = 0.9;
/** The nucleus's radius. */
export const NUCLEUS_R = 2.6;

/** The symbol's facing at time t: the angle round the vertical its plane has turned to. */
export const atomFacing = (A: Atom, t: number) => A.w * t;

/** Orbit k's point at angle a, at time t, into o (world, for the copy shifted ox, oz). */
function orbitPoint(A: Atom, k: number, a: number, t: number, ox: number, oz: number, o: number[]) {
  const psi = atomFacing(A, t);
  const beta = (k * Math.PI) / 3;
  const px = A.R * Math.cos(a);
  const py = ORBIT_FLAT * A.R * Math.sin(a);
  const X = px * Math.cos(beta) - py * Math.sin(beta);
  const Y = px * Math.sin(beta) + py * Math.cos(beta);
  // A little depth: each orbit leans out of the symbol's plane, so it reads round from the side.
  const D = py * 0.35 * (k - 1);
  o[0] = ox + A.x + Math.cos(psi) * X - Math.sin(psi) * D;
  o[1] = GROUND + A.y + Y;
  o[2] = oz + A.z + Math.sin(psi) * X + Math.cos(psi) * D;
}

/**
 * Site s (of count) of the atom at time t into o: its nucleus (a ball of light), its three orbits
 * turning together round the vertical, and an electron with a short fading trail on each. Returns
 * the part: 0 nucleus, 1 orbit, 2 electron (its trail's fade in o[6] when the caller wants it).
 */
export function atomSite(
  A: Atom,
  s: number,
  count: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): number {
  const u = (s + 0.5) / count;
  if (u < 0.22) {
    // A ball by the golden angle, a little lumpy as a cluster of nucleons.
    const m = Math.max(1, Math.round(count * 0.22));
    const i = s % m;
    const yy = 1 - (2 * (i + 0.5)) / m;
    const rad = Math.sqrt(Math.max(0, 1 - yy * yy));
    const a = i * 2.399963229728653 + 0.2 * t;
    const r = NUCLEUS_R * (0.82 + 0.18 * Math.sin(i * 1.7));
    o[0] = ox + A.x + Math.cos(a) * rad * r;
    o[1] = GROUND + A.y + yy * r;
    o[2] = oz + A.z + Math.sin(a) * rad * r;
    return 0;
  }
  if (u < 0.85) {
    const f = (u - 0.22) / 0.63;
    const k = Math.floor(f * 3);
    orbitPoint(A, k, (f * 3 - k) * TAU, t, ox, oz, o);
    return 1;
  }
  const f = (u - 0.85) / 0.15;
  const k = Math.floor(f * 3);
  const back = f * 3 - k;
  orbitPoint(A, k, ELECTRON_W * t + k * 2.1 - back * 0.5, t, ox, oz, o);
  o[6] = 1 - back;
  return 2;
}

/** Electron k's place at time t (world, for the copy at the origin), for the tests. */
export function electronAt(A: Atom, k: number, t: number): [number, number, number] {
  const o = [0, 0, 0];
  orbitPoint(A, k, ELECTRON_W * t + k * 2.1, t, 0, 0, o);
  return [o[0] as number, o[1] as number, o[2] as number];
}
