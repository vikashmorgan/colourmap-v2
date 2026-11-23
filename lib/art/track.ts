/**
 * Drive: the two road worlds (docs/specs/drive-game.md). Pure: no three.js, no DOM.
 *
 * A track is a centre line traced from its curvature (x east, y north, metres; headings
 * counter-clockwise from +x), with an elevation, a half-width and a banking that follows the
 * curvature: on a right-hand bend the left side rises, on a left-hand bend the right side, more the
 * tighter the bend, so a fast line rides up the outside and gravity holds you in the turn. The road's
 * last metres curl up a little at each edge (a lip, like a half-pipe's), which you can ride and
 * drop back off.
 *
 * - Coast Road: endless, winding along a cliff top at sunset, wide and in brown earth; the sea far
 *   below on the left behind a rail, the cliff rising on the right. Timed in kilometres.
 * - Canyon Race: a fixed course over the salt flat (the same every time, so times compare): sweeping
 *   banked bends, three crests that launch you and dips that speed you up, a run through a canyon
 *   with passages that narrow a little and two arches; nothing stands on the road. Start, four
 *   checkpoints, finish.
 *
 * Road coordinates: s along the centre line, u across it (positive to the left).
 */

import { clamp, type Gate } from '@/lib/art/drive';
import { compileTrack, type TrackData } from '@/lib/art/track-data';
import coastData from '@/lib/art/tracks/coast.json';
import goldData from '@/lib/art/tracks/gold.json';
import neonData from '@/lib/art/tracks/neon.json';
import nightData from '@/lib/art/tracks/night.json';
import { UNDER, underLocal, underTwist, underWall } from '@/lib/art/undertown';
import { G, type Ground, type Hit, type Vehicle, type World } from '@/lib/art/vehicle';

export type TrackId = 'coast' | 'canyon' | 'night' | 'chinatown' | 'neon' | 'sky' | 'gold';

export interface Wall {
  /** Offset of the barrier from the centre (positive left), and its height over the road. */
  u: number;
  height: number;
}

export interface TrackDef {
  id: TrackId;
  startH: number;
  curv(s: number): number;
  elev(s: number): number;
  half(s: number): number;
  /** Lip height at the road's edges. */
  lip(s: number): number;
  /** Design speed for the banking (m/s) and the steepest bank (radians). */
  bankSpeed: number;
  bankMax: number;
  /** The ground off the road levels out toward this height (null: stays at the edge's height). */
  terrain: number | null;
  /** Barriers left and right (null: open). */
  walls(s: number): { left: Wall | null; right: Wall | null };
  /** A quarter-pipe beyond each edge (its radius in m, 0 none): the ground curves up into the walls,
   * smooth, so you can ride up them and gravity brings you back. */
  pipe?(s: number): number;
  /** Where the road (and the ground either side) is gone: a jump over the void. */
  gap?(s: number): boolean;
  /** Where a tunnel of blue gas fire stands over the road. */
  fire?(s: number): boolean;
  /** Which look a fire tunnel has here (an index into FIRE_STYLES in track-data). */
  fireStyle?(s: number): number;
  /** How far the road has rolled about its axis here (rad, 0 to 2π over a twist; 0 elsewhere). */
  twist?(s: number): number;
  /** How high over the road the axis a twist rolls about runs (m; default the half-width). */
  axis?(s: number): number;
  /** Where the road runs upside down as Undertown (lib/art/undertown.ts): a twist that keeps its
   * barriers and has no straight road through it. */
  under?(s: number): boolean;
  /** Where a twist is a normal looping (end over end), its start and length; null elsewhere. */
  looping?(s: number): { from: number; length: number } | null;
  /** On a twist, the slope your line through it adds along the road (negative runs downhill:
   * faster). */
  surge?(s: number, u: number): number;
  /** Surf (2026-11-22): the curled wall cut down to a kicker this tall (m); past it you fly, pulled
   * back to the road. */
  surf?: number;
  /** Which side a high deck runs along the top of the curled wall here (1 left, -1 right, 0 none). */
  deck?(s: number): number;
  /** Whether the deck here has the stronger fire on its sides. */
  blaze?(s: number): boolean;
  /** Where a twist's bypass lane runs here (its centre's u, on the right), or null. */
  bypass?(s: number): number | null;
  /** The radius (m) of the curved wall past the edge on a banked bend's high side, at full bank. */
  curl?: number;
  /** Where the road is raised as a bridge over another stretch of itself (no ground beside it). */
  bridge?(s: number): boolean;
  /** An endless road's lap (m). */
  lap?: number;
}

/**
 * A twist (2026-11-22: "a side looping, as if the road did a full twist while still going
 * straight"): the road rolls a full turn about an axis one half-width above it. You drive it on
 * a flat road (the physics never knows); what is drawn there, the road, the racers and the camera,
 * is turned by this. `above` is the height over the road's surface at (s, u). At no twist it is the
 * plain road's point. `roll` is how far the body is turned (positive leans the roof left, as
 * Vehicle.roll).
 */
export interface TwistPose {
  x: number;
  y: number;
  z: number;
  /** Body lean (as Vehicle.roll) and nose pitch (as Vehicle.pitch) added by the twist. */
  roll: number;
  pitch: number;
  th: number;
  /** The road's up here, in world axes (z up). */
  up: [number, number, number];
}

export function twistPose(t: Track, s: number, u: number, above: number): TwistPose {
  const th = t.def.twist?.(Math.max(0, s)) ?? 0;
  const f = frameAt(t, s);
  const surf = heightAt(t, s, u, true) - f.e;
  if (th === 0) {
    const p = pointAt(t, s, u);
    return { x: p.x, y: p.y, z: f.e + surf + above, roll: 0, pitch: 0, th, up: [0, 0, 1] };
  }
  const lp = t.def.looping?.(Math.max(0, s));
  if (lp) return loopPose(t, s, u, surf + above, lp, f.e, th);
  const A = t.def.axis?.(Math.max(0, s)) ?? f.half;
  const c = Math.cos(th);
  const sn = Math.sin(th);
  const up = surf + above - A;
  // Turning the left side up: (u, up) about the axis.
  const l = u * c - up * sn;
  const z = A + u * sn + up * c;
  const p = pointAt(t, s, l);
  // Its surface's up: the road's left, turned up by th.
  const nu: [number, number, number] = [Math.sin(f.h) * sn, -Math.cos(f.h) * sn, c];
  return { x: p.x, y: p.y, z: f.e + z, roll: -th, pitch: 0, th, up: nu };
}

/**
 * A normal looping (2026-11-22): over its length the road turns a full circle end over end, of
 * radius LOOP.R × length. Along the road it runs s + R sin ψ, up R (1 - cos ψ), with ψ easing from
 * 0 to 2π, so it climbs, runs back over itself upside down at the top, and comes down where the
 * straight carries on. It swings aside by up to W one way going up and the other coming down, so
 * the two never meet where they cross.
 */
export const LOOP = { R: 1 / 7.5 };

export function loopShape(x: number, length: number, half: number) {
  const L = length;
  const R = L * LOOP.R;
  const ease = x * x * x * (x * (6 * x - 15) + 10);
  const dEase = 30 * x * x * (1 - x) * (1 - x);
  const psi = Math.PI * 2 * ease;
  const dPsi = Math.PI * 2 * dEase;
  const da = L + R * Math.cos(psi) * dPsi;
  const dz = R * Math.sin(psi) * dPsi;
  return {
    a: L * x + R * Math.sin(psi),
    z: R * (1 - Math.cos(psi)),
    pitch: Math.atan2(dz, da),
    side: loopSwing(L, half) * Math.sin(Math.PI * 2 * x),
  };
}

const swings = new Map<string, number>();
/** How far a looping swings aside: where its way up crosses its way down, a road's width apart. */
function loopSwing(length: number, half: number): number {
  const key = `${length}:${half}`;
  const hit = swings.get(key);
  if (hit !== undefined) return hit;
  const R = length * LOOP.R;
  let cross = 0.35;
  for (let i = 1; i < 500; i++) {
    const x = i / 1000;
    const e = x * x * x * (x * (6 * x - 15) + 10);
    if (length * (x - 0.5) + R * Math.sin(Math.PI * 2 * e) >= 0) {
      cross = x;
      break;
    }
  }
  const w = (half + 3) / Math.max(0.3, Math.abs(Math.sin(Math.PI * 2 * cross)));
  swings.set(key, w);
  return w;
}

function loopPose(
  t: Track,
  s: number,
  u: number,
  above: number,
  lp: { from: number; length: number },
  e: number,
  th: number,
): TwistPose {
  const half = t.def.half(Math.max(0, s));
  const k = loopShape((s - lp.from) / lp.length, lp.length, half);
  const na = -Math.sin(k.pitch);
  const nz = Math.cos(k.pitch);
  const along = lp.from + k.a + na * above;
  const p = pointAt(t, along, u + k.side);
  const h = frameAt(t, along).h;
  return {
    x: p.x,
    y: p.y,
    z: e + k.z + nz * above,
    roll: 0,
    pitch: k.pitch,
    th,
    up: [Math.cos(h) * na, Math.sin(h) * na, nz],
  };
}

/** How far the void falls under a jump's gap (m): out of sight, never ground. */
export const VOID_DEPTH = 400;
/** Fallen this far under the road in a gap: you are lost to the void and start again before it. */
export const FALLEN = 30;

/* ── Banking and the surface ───────────────────────────────── */

/** The steepest bank on any road: gentle (about 11°), so a bend never throws you up its outside
 * edge (2026-11-17: "the car moves on top of the curves … and then it gets stuck"). */
export const BANK_MAX = 0.2;

/** The bank for a curvature: steep enough to hold the design speed, never past the most. */
export function bankFor(k: number, speed: number, most: number): number {
  return clamp(Math.atan((k * speed * speed) / G), -most, most);
}

/** The lip: flat across the road, curling up over its last 2.5 m at each edge. */
export function lipAt(u: number, half: number, lip: number): number {
  const d = Math.abs(u) - (half - 2.5);
  if (d <= 0) return 0;
  const k = Math.min(d, 2.5) / 2.5;
  return lip * k * k;
}

/**
 * The quarter-pipe (2026-11-19, on the Canyon: "don't do those borders where the road that went up
 * has a corner. If I go more up, make it so I can go higher up on the walls … a feeling of freedom,
 * but of course I can't wallride indefinitely: at some point it pushes back down with gravity").
 * Height at d metres past the road's edge for a radius R: a quarter circle, no corner anywhere,
 * steepening to about 72° at 0.95 R, then on up at that slope.
 */
export const PIPE_TOP = 0.95;
export function pipeAt(d: number, R: number): number {
  if (R <= 0 || d <= 0) return 0;
  const x = d / R;
  if (x < PIPE_TOP) return R * (1 - Math.sqrt(1 - x * x));
  const top = R * (1 - Math.sqrt(1 - PIPE_TOP * PIPE_TOP));
  const slope = PIPE_TOP / Math.sqrt(1 - PIPE_TOP * PIPE_TOP);
  return top + (d - R * PIPE_TOP) * slope;
}

/* ── The track ─────────────────────────────────────────────── */

export interface Frame {
  x: number;
  y: number;
  h: number;
  k: number;
  e: number;
  bank: number;
  half: number;
}

export interface Track {
  def: TrackDef;
  ds: number;
  x: Float64Array;
  y: Float64Array;
  h: Float64Array;
  n: number;
  /** Last place found, so the next search starts near it. */
  hint: number;
}

const DS = 2;

export function makeTrack(def: TrackDef): Track {
  const cap = 4096;
  const t: Track = {
    def,
    ds: DS,
    x: new Float64Array(cap),
    y: new Float64Array(cap),
    h: new Float64Array(cap),
    n: 1,
    hint: 0,
  };
  t.h[0] = def.startH;
  return t;
}

/** Traces the centre line at least as far as s. */
export function ensure(t: Track, s: number): void {
  const need = Math.ceil(Math.max(0, s) / t.ds) + 2;
  if (need <= t.n) return;
  if (need > t.x.length) {
    let cap = t.x.length;
    while (cap < need) cap *= 2;
    const grow = (a: Float64Array) => {
      const b = new Float64Array(cap);
      b.set(a);
      return b;
    };
    t.x = grow(t.x);
    t.y = grow(t.y);
    t.h = grow(t.h);
  }
  for (let i = t.n; i < need; i++) {
    const s0 = (i - 1) * t.ds;
    // Heading by the midpoint rule; position along the mean heading.
    const hm = t.h[i - 1] + t.def.curv(s0 + t.ds / 4) * (t.ds / 2);
    t.h[i] = t.h[i - 1] + t.def.curv(s0 + t.ds / 2) * t.ds;
    t.x[i] = t.x[i - 1] + Math.cos(hm) * t.ds;
    t.y[i] = t.y[i - 1] + Math.sin(hm) * t.ds;
  }
  t.n = need;
}

export function frameAt(t: Track, s: number): Frame {
  const sc = Math.max(0, s);
  ensure(t, sc + t.ds);
  const u = sc / t.ds;
  const i = Math.floor(u);
  const f = u - i;
  const k = t.def.curv(sc);
  const x = t.x[i] + (t.x[i + 1] - t.x[i]) * f;
  const y = t.y[i] + (t.y[i + 1] - t.y[i]) * f;
  const h = t.h[i] + (t.h[i + 1] - t.h[i]) * f;
  // Before the start the road carries straight on backwards.
  const back = Math.min(0, s);
  return {
    x: x + Math.cos(h) * back,
    y: y + Math.sin(h) * back,
    h,
    k,
    e: t.def.elev(sc),
    bank: bankFor(k, t.def.bankSpeed, t.def.bankMax),
    half: t.def.half(sc),
  };
}

/** A point beside the centre line: u metres to the left. */
export function pointAt(t: Track, s: number, u: number): { x: number; y: number } {
  const f = frameAt(t, s);
  return { x: f.x - Math.sin(f.h) * u, y: f.y + Math.cos(f.h) * u };
}

/** Road coordinates of a world point, searching from `hint` (Newton steps along the line). */
export function project(t: Track, px: number, py: number, hint = t.hint): { s: number; u: number } {
  let s = hint;
  let u = 0;
  for (let it = 0; it < 6; it++) {
    const f = frameAt(t, s);
    const c = Math.cos(f.h);
    const sn = Math.sin(f.h);
    const dx = px - f.x;
    const dy = py - f.y;
    const along = dx * c + dy * sn;
    u = -dx * sn + dy * c;
    const step = along / Math.max(0.3, 1 - f.k * u);
    s += clamp(step, -200, 200);
    if (Math.abs(step) < 1e-4) break;
  }
  return { s, u };
}

/** The surface's height at road coordinates (s, u). */
/** Where the gap that s is in (or just past) begins and ends, or null when s is not near one. */
export function gapAround(t: Track, s: number): { from: number; to: number } | null {
  const gap = t.def.gap;
  if (!gap) return null;
  let a = s;
  // Fallen short of the far side, or just past it: look back for the gap.
  while (a > s - 400 && a > 0 && !gap(a)) a -= 1;
  if (!gap(a)) return null;
  let from = a;
  while (from > 0 && gap(from - 1)) from -= 1;
  let to = a;
  while (gap(to + 1)) to += 1;
  return { from, to: to + 1 };
}

/** The ground's height at (s, u). In a jump's gap it is the void far below, unless `solid` (the
 * road as if it went on: for slopes, and for drawing the ramps' edges). */
export function heightAt(t: Track, s: number, u: number, solid = false): number {
  const f = frameAt(t, s);
  if (!solid && t.def.gap?.(Math.max(0, s))) return f.e - VOID_DEPTH;
  const lip = t.def.lip(Math.max(0, s));
  const uc = clamp(u, -f.half, f.half);
  const edge = f.e - Math.tan(f.bank) * uc + lipAt(uc, f.half, lip);
  // A bypass lane is road too, flat, beside the twist.
  if (Math.abs(u) > f.half && onBypass(t, s, u) !== null) return f.e;
  const out = Math.abs(u) - f.half;
  if (out <= 0) return edge;
  const R = pipeRadius(t, s, u, f.bank);
  const toward = t.def.terrain;
  // Off the road the ground slopes back to the flat (1 in 2).
  const flat = toward === null ? edge : edge + clamp(toward - edge, -out * 0.5, out * 0.5);
  if (R <= 0) return flat;
  // A pipe fades in with its radius (the canyon's mouth), from the flat beside the road.
  const w = clamp(R / 8, 0, 1);
  const wall = flat + (edge + pipeAt(out, R) - flat) * w;
  // A high deck: the curled wall rises until it meets it, then it runs flat, then the stands fall
  // away to the ground beyond (2026-11-22: "you shoot up on the turn tilts and another road offers
  // itself, like driving on top of grandstands").
  const side = t.def.deck?.(Math.max(0, s)) ?? 0;
  if (side !== 0 && Math.sign(u) === side) {
    const top = f.e + DECK.H;
    if (out <= DECK.OUT) return Math.min(wall, top);
    return flat;
  }
  // Surf: the wall only as high as a kicker; past its lip there is no ground to catch you, only the
  // pull back to the road (2026-11-22: "you fly out of the track but gravity keeps you coming
  // back, instead of the big black walls"). Drawn, it is the flat beyond.
  const surf = t.def.surf;
  if (surf && t.def.curl && u * f.bank < 0 && wall - edge > surf)
    return solid ? flat : f.e - VOID_DEPTH;
  return wall;
}

/** The pull that brings you back from a surf (m/s²), and where it draws you: just inside the edge,
 * a little over the road. */
export const SURF = { PULL: 15, IN: 2, OVER: 0.6 };

/** The pull on a vehicle flying off a surf bend, or null where gravity is gravity. */
export function surfPull(
  t: Track,
  x: number,
  y: number,
  z: number,
): { ax: number; ay: number; az: number } | null {
  if (!t.def.surf || !t.def.curl) return null;
  const { s, u } = project(t, x, y);
  const f = frameAt(t, s);
  if (Math.abs(u) <= f.half + 0.3) return null;
  if (edgesOpen(t.def, s)) return null;
  if (onBypass(t, s, u) !== null || onDeck(t, s, u)) return null;
  // Only where a surf's ground has given way under you.
  if (heightAt(t, s, u) > f.e - VOID_DEPTH / 2) return null;
  const side = Math.sign(u);
  const du = side * (f.half - SURF.IN) - u;
  const dz = f.e + SURF.OVER - z;
  const d = Math.hypot(du, dz) || 1;
  const a = SURF.PULL;
  const nx = -Math.sin(f.h);
  const ny = Math.cos(f.h);
  return { ax: (nx * du * a) / d, ay: (ny * du * a) / d, az: (dz * a) / d };
}

/**
 * The pipe beside the road on the side of u: the road's own (the canyon's), or past the golden
 * lines on the high side of a banked bend, a curved wall growing with the bank (2026-11-22: "the
 * top side of tilted roads on turns need to curve up higher … so you can drive up those tilts to
 * boost back down"; "that extra tilt space is after the golden lines on the sides, so it feels
 * like you are going off track and get back into it").
 */
export function pipeRadius(t: Track, s: number, u: number, bank = frameAt(t, s).bank): number {
  const own = t.def.pipe?.(Math.max(0, s)) ?? 0;
  const curl = t.def.curl;
  if (!curl || u * bank >= 0) return own;
  return Math.max(own, curl * clamp(Math.abs(bank) / 0.5, 0, 1));
}

/** The high deck: how far above the road's centre (m), and how far past the edge it reaches. */
export const DECK = { H: 20, OUT: 30 };

/** Whether (s, u) is up on a high deck (its flat top, not the wall below it). */
export function onDeck(t: Track, s: number, u: number): boolean {
  const side = t.def.deck?.(Math.max(0, s)) ?? 0;
  if (side === 0 || Math.sign(u) !== side) return false;
  const f = frameAt(t, s);
  const out = Math.abs(u) - f.half;
  if (out <= 0 || out > DECK.OUT) return false;
  return heightAt(t, s, u, true) >= f.e + DECK.H - 0.01;
}

/** Half a bypass lane's width (m): see BYPASS in track-data. */
export const BYPASS_LANE = 9;

/** Across a bypass lane (u from its centre) if (s, u) is on it, else null. */
export function onBypass(t: Track, s: number, u: number): number | null {
  const c = t.def.bypass?.(Math.max(0, s));
  if (c === null || c === undefined) return null;
  return Math.abs(u - c) <= BYPASS_LANE ? u - c : null;
}

/** How far a twist must have turned before its edges are open, without barriers (rad). */
export const TWIST_OPEN = 0.15;

/** Whether the road's edges are open here: on a twist, turned past TWIST_OPEN (Undertown keeps its
 * barriers). */
export function edgesOpen(def: TrackDef, s: number): boolean {
  return Math.abs(def.twist?.(Math.max(0, s)) ?? 0) > TWIST_OPEN && !def.under?.(Math.max(0, s));
}

/** How far past the edge the pipe's curve reaches on the side of u (0 without one). */
export function pipeReach(t: Track, s: number, u = 1): number {
  return pipeRadius(t, s, u) * PIPE_TOP;
}

/** What holds you: the road, or over a fork the span from the lane's far edge to the road's left,
 * and on a twist whose edges are open, room to ride off them. */
function corridor(
  t: Track,
  s: number,
  u: number,
  f: Frame,
  reach: number,
  out: number,
): NonNullable<Ground['road']> {
  const up = onDeck(t, s, u);
  const base = {
    h: f.h,
    k: f.k,
    u,
    half: up ? f.half + DECK.OUT + 1 : f.half + (reach > 0 ? reach + 1 : 0),
    pipe: up ? 0 : reach > 0 ? clamp(out / reach, 0, 1) : 0,
  };
  const open = edgesOpen(t.def, s);
  const c = t.def.bypass?.(Math.max(0, s));
  const extra = open ? 8 : 0;
  if (c === null || c === undefined) return open ? { ...base, half: base.half + extra } : base;
  const hi = f.half + extra;
  const lo = Math.min(-f.half, c - BYPASS_LANE) - extra;
  return { ...base, u: u - (hi + lo) / 2, half: (hi - lo) / 2, pipe: 0 };
}

/** The ground under a world point, for the physics. */
export function groundAt(t: Track, px: number, py: number): Ground & { s: number; u: number } {
  const { s, u } = project(t, px, py);
  t.hint = s;
  const f = frameAt(t, s);
  const h = heightAt(t, s, u);
  // Slopes from the road as if it went on, so a gap's edge never reads as a cliff to slide down.
  const dU = (heightAt(t, s, u + 0.25, true) - heightAt(t, s, u - 0.25, true)) / 0.5;
  const dS =
    (heightAt(t, s + 0.5, u, true) - heightAt(t, s - 0.5, u, true)) / Math.max(0.3, 1 - f.k * u) +
    (t.def.surge?.(Math.max(0, s), u) ?? 0);
  const c = Math.cos(f.h);
  const sn = Math.sin(f.h);
  const out = Math.abs(u) - f.half;
  // A pipe is ridden like the road (smooth, never rough), and the road's hold reaches its top.
  const reach = pipeReach(t, s, u);
  const lipped = t.def.lip(Math.max(0, s)) > 0 || reach > 0;
  return {
    h,
    gx: dS * c - dU * sn,
    gy: dS * sn + dU * c,
    rough: onDeck(t, s, u) ? 0 : clamp((out - reach) / 0.8, 0, 1),
    // A high deck's wall and top are ridden, never launched from: up the wall and over onto it.
    lip:
      (t.def.deck?.(Math.max(0, s)) ?? 0) === Math.sign(u) && out > 0 && out <= DECK.OUT
        ? 1
        : lipped
          ? clamp((Math.abs(u) - (f.half - 2.5)) / 2.5, 0, 1)
          : 0,
    road: corridor(t, s, u, f, reach, out),
    s,
    u,
  };
}

/* ── Shapes along the road ─────────────────────────────────── */

/** A cosine bump of height a and half-width w centred at c (0 outside). */
export function bump(s: number, c: number, a: number, w: number): number {
  const x = (s - c) / w;
  return Math.abs(x) >= 1 ? 0 : (a * (1 + Math.cos(Math.PI * x))) / 2;
}

/** 0 before a, rising to 1 by a + ramp, holding, falling back to 0 between b - ramp and b. */
export function window01(s: number, a: number, b: number, ramp: number): number {
  const up = clamp((s - a) / ramp, 0, 1);
  const down = clamp((b - s) / ramp, 0, 1);
  const k = Math.min(up, down);
  return k * k * (3 - 2 * k);
}

/** Linear between keyframes [s, value]. */
export function keyed(keys: readonly (readonly [number, number])[], s: number): number {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (s <= keys[i][0]) {
      const [s0, v0] = keys[i - 1];
      const [s1, v1] = keys[i];
      return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0);
    }
  }
  return keys[keys.length - 1][1];
}

/* ── Coast Road ────────────────────────────────────────────── */

const TAU = Math.PI * 2;

export const COAST_HALF = 22;
/** The rail on the sea side and the foot of the cliff, from the centre. */
export const COAST_RAIL = COAST_HALF + 6;
export const COAST_CLIFF = -(COAST_HALF + 9);
/** The sea, this far under the road. */
export const COAST_SEA = -40;

/** Three slow sways, so the bends come long and flowing (stretched 2026-11-17); the rail on the
 * sea side is 1.1 m to see but holds you however high a crest throws you: never into the sea.
 * The road is data: lib/art/tracks/coast.json. */
export const COAST: TrackDef = compileTrack(coastData as TrackData);

/** Coast Road is timed by the kilometre: a gate every 1,000 m. */
export const COAST_GATE = 1000;

/* ── Night Rain ────────────────────────────────────────────── */

export const NIGHT_HALF = 14;
/** Lamps beside the road every 32 m, and a gantry across it every 128 m. */
export const NIGHT_LAMP = 32;
/** The night roads' barrier: at the road's edge, under the LED arrows, a kerb you glance off. It
 * stands tall (unseen) so a jump off the banked lip never carries you into the towers. */
export const NIGHT_BARRIER = 1.5;
const barrier = (half: number): { left: Wall; right: Wall } => ({
  left: { u: half + NIGHT_BARRIER, height: 30 },
  right: { u: -(half + NIGHT_BARRIER), height: 30 },
});
export const NIGHT_GANTRY = 128;
export const NIGHT_LAMP_U = NIGHT_HALF + 1.5;
export const NIGHT_LAMP_H = 8;

/** Every 1,500 m a crest that lifts you at 600 m and a dip at 1,100 m (lib/art/tracks/night.json). */
export const NIGHT: TrackDef = compileTrack(nightData as TrackData);

/* ── Chinatown Run and the Neon District ───────────────────── */

/** Chinatown: lanes (half 10 m) opening onto wide avenues (half 15 m), 600 m each. */
export const CHINA_LANE = 10;
export const CHINA_AVENUE = 15;

export function chinatownHalf(s: number): number {
  const p = ((s % 1200) + 1200) % 1200;
  // Widening and narrowing over 180 m, so the edge eases you along (was 70 m).
  const avenue = window01(p, 600, 1200, 180);
  return CHINA_LANE + (CHINA_AVENUE - CHINA_LANE) * avenue;
}

export const CHINATOWN: TrackDef = {
  id: 'chinatown',
  startH: 0,
  curv: (s) =>
    0.55 * (TAU / 1900) * Math.cos((TAU * s) / 1900 + 1.1) +
    0.35 * (TAU / 900) * Math.cos((TAU * s) / 900 + 0.3),
  elev: (s) => {
    const p = ((s % 1200) + 1200) % 1200;
    return bump(p, 900, 4, 30) + bump(p, 300, -2.5, 45);
  },
  half: chinatownHalf,
  lip: () => 0.4,
  bankSpeed: 45,
  bankMax: BANK_MAX,
  terrain: 0,
  walls: (s) => {
    // The shophouses' fronts stop you in the lanes; on the avenues the pavement is open.
    const half = chinatownHalf(s);
    const w =
      half > CHINA_LANE + 2
        ? barrier(half)
        : { left: { u: half + 2.3, height: 6 }, right: { u: -(half + 2.3), height: 6 } };
    if (underLocal(s) === null) return w;
    // Undertown: the barriers close in to the ribbon's edge.
    return {
      left: { ...w.left, u: underWall(s, w.left.u, half) },
      right: { ...w.right, u: -underWall(s, -w.right.u, half) },
    };
  },
  // Undertown (lib/art/undertown.ts): over the edge onto the road's underside and back.
  twist: underTwist,
  axis: (s) => (underLocal(s) === null ? chinatownHalf(s) : UNDER.AXIS),
  under: (s) => underLocal(s) !== null,
};

export const NEON_HALF = 16;

/** Crests every 1,800 m under the ship highways (lib/art/tracks/neon.json). */
export const NEON_TRACK: TrackDef = compileTrack(neonData as TrackData);

/* ── Golden Track ──────────────────────────────────────────── */

/**
 * The Golden Track (2026-11-19: "use the design art elements for the racing games in golden dots
 * for a golden track"): a wide road at night in long sweeping bends and soft rises, drawn in the
 * City's and Art's gold dots (components/drive/track-view.ts `goldDots`).
 */
export const GOLDEN_HALF = 18;
export const GOLDEN_BANK = 0.62;
/** Tighter bends (2026-11-19: "more curving on the turns, more tilt on the slope"): the tightest
 * about 130 m across, banked up to 0.62 rad (≈ 36°), gentler bends less, against the other
 * tracks' 0.2 (0.34, then 0.46, until 2026-11-22: "even more tilt to the roads on the turns",
 * "some turns with even more tilt"). Data: lib/art/tracks/gold.json. */
export const GOLDEN: TrackDef = compileTrack(goldData as TrackData);

/* ── Canyon Race ───────────────────────────────────────────── */

/** Curvature keyframes: the bends, eased in and out over 60 m (a right bend is negative). Radii
 * 1.8× the first course's (2026-11-17: "longer turns"), the tightest now 234 m. */
export const CANYON_CURVES: readonly (readonly [number, number])[] = [
  [0, 0],
  [300, 0],
  [360, -1 / 540],
  [640, -1 / 540],
  [700, 0],
  [900, 0],
  [960, 1 / 396],
  [1240, 1 / 396],
  [1300, -1 / 324],
  [1440, -1 / 324],
  [1500, 0],
  [1700, 0],
  [1760, 1 / 270],
  [1900, 1 / 270],
  [1950, 0],
  [2100, 0],
  [2160, -1 / 234],
  [2340, -1 / 234],
  [2400, 0],
  [2550, 0],
  [2610, 1 / 360],
  [2800, 1 / 360],
  [2850, 0],
  [3000, 0],
  [3060, -1 / 288],
  [3250, -1 / 288],
  [3300, 0],
  [3700, 0],
  [3760, 1 / 720],
  [4140, 1 / 720],
  [4200, -1 / 450],
  [4440, -1 / 450],
  [4500, 0],
];

/** Crests (they launch you) and dips (they speed you up): centre, height, half-width. */
export const CANYON_BUMPS: readonly (readonly [number, number, number])[] = [
  [600, 2, 80],
  [820, 5, 35],
  [1150, -2.5, 60],
  [2480, -4, 55],
  [3550, 6.5, 40],
  [4600, -3.5, 45],
  [4720, 5, 32],
];

/** Where the canyon walls stand, and the narrow passages inside it. */
export const CANYON_RANGE: readonly [number, number] = [1650, 3400];
export const CANYON_PASSAGES: readonly (readonly [number, number])[] = [
  [1970, 2130],
  [2830, 2970],
];
export const CANYON_ARCHES = [2050, 3250];
export const CANYON_HALF = 22;
export const CANYON_NARROW = 18;
/** The canyon's quarter-pipes: 16 m of curve each side, rising to about 11 m, then the rock. */
export const CANYON_PIPE = 16;

export function canyonHalf(s: number): number {
  let narrow = 0;
  for (const [a, b] of CANYON_PASSAGES) narrow = Math.max(narrow, window01(s, a - 40, b + 40, 60));
  return CANYON_HALF - (CANYON_HALF - CANYON_NARROW) * narrow;
}

/** How far the canyon walls have risen at s: 0 out on the salt, 1 inside. */
export function canyonDepth(s: number): number {
  return window01(s, CANYON_RANGE[0], CANYON_RANGE[1], 80);
}

/** The canyon walls' height over the road: 25 to 60 m, varying along it. */
export function canyonWallHeight(s: number, side: number): number {
  const v =
    0.5 +
    0.3 * Math.sin(s / 61 + side * 1.7) +
    0.2 * Math.sin(s / 23 + side * 0.6) * Math.sin(s / 137);
  return (25 + 35 * clamp(v, 0, 1)) * canyonDepth(s);
}

export const CANYON: TrackDef = {
  id: 'canyon',
  startH: Math.PI / 2,
  curv: (s) => keyed(CANYON_CURVES, s),
  elev: (s) => CANYON_BUMPS.reduce((e, [c, a, w]) => e + bump(s, c, a, w), 0),
  half: canyonHalf,
  // Out on the salt a small lip; in the canyon the edges become quarter-pipes, no corner anywhere.
  lip: (s) => 0.35 * (1 - canyonDepth(s)),
  bankSpeed: 50,
  bankMax: BANK_MAX,
  terrain: 0,
  pipe: (s) => CANYON_PIPE * canyonDepth(s),
  walls: (s) => {
    if (canyonDepth(s) < 0.5) return { left: null, right: null };
    const u = canyonWallU(s);
    return {
      left: { u, height: canyonWallHeight(s, 1) },
      right: { u: -u, height: canyonWallHeight(s, -1) },
    };
  },
};

/** Where the canyon's rock rises: at the top of the pipe's curve. */
export function canyonWallU(s: number): number {
  return canyonHalf(s) + CANYON_PIPE * canyonDepth(s) * PIPE_TOP + 1;
}

/* ── Sky Canyon ────────────────────────────────────────────── */

/**
 * Sky Canyon (2026-11-19: "a racetrack like the canyon, but with the path also turning left and
 * right like a long road, for spaceships … with three vertical levels. It must feel like an infinite
 * race, but you can do a door that is the start or finish of the laps"; the levels: "designed for a
 * spaceship that can fly on multiple heights"). An endless canyon in long alternate bends, deep and
 * wide, its edges quarter-pipes, its walls far taller than anything flies. The ship holds one of
 * three heights over the road (Q and E). A great door spans the canyon every lap.
 */
export const SKY_HALF = 30;
export const SKY_PIPE = 16;
/** The three heights the ship flies at, over its hover height (m). */
export const SKY_LEVELS = [0, 22, 44] as const;
/** A lap, door to door (m). */
export const SKY_LAP = 6000;

export function skyCurv(s: number): number {
  return 0.0024 * Math.sin((TAU * s) / 2400) + 0.0011 * Math.sin((TAU * s) / 1100 + 1.3);
}

export function skyElev(s: number): number {
  return 14 * Math.sin((TAU * s) / 1900) + 5 * Math.sin((TAU * s) / 760 + 0.5);
}

/** Where the rock rises: at the top of the pipes. */
export function skyWallU(): number {
  return SKY_HALF + SKY_PIPE * PIPE_TOP + 1;
}

/** The walls' height over the road: 130 to 190 m, varying along. */
export function skyWallHeight(s: number, side: number): number {
  const v = 0.5 + 0.3 * Math.sin(s / 83 + side * 1.1) + 0.2 * Math.sin(s / 31 + side * 2.3);
  return 130 + 60 * clamp(v, 0, 1);
}

export const SKY: TrackDef = {
  id: 'sky',
  startH: Math.PI / 2,
  curv: skyCurv,
  elev: skyElev,
  half: () => SKY_HALF,
  lip: () => 0,
  bankSpeed: 55,
  bankMax: BANK_MAX,
  terrain: null,
  pipe: () => SKY_PIPE,
  walls: (s) => ({
    left: { u: skyWallU(), height: skyWallHeight(s, 1) },
    right: { u: -skyWallU(), height: skyWallHeight(s, -1) },
  }),
};

export const RACE = {
  start: 150,
  checkpoints: [1000, 2000, 3000, 4000],
  finish: 4950,
};

/** Half the vehicle's width, for hits. */
export const BODY_R = 1.0;

/* ── The world for the physics ─────────────────────────────── */

export interface TrackWorld extends World {
  track: Track;
}

export function makeTrackWorld(def: TrackDef): TrackWorld {
  const track = makeTrack(def);
  const world: TrackWorld = {
    track,
    ground: (x, y) => groundAt(track, x, y),
    collide: (v) => collideTrack(world, v),
    pull: (x, y, z) => surfPull(track, x, y, z),
  };
  return world;
}

/** The barriers either side: nothing else stands on the roads (2026-11-17: "nice and flowy and clean").
 * You flow along them, never stopped (2026-11-19: "you can't stop if you hit something, maybe just
 * sparks when you scratch against a wall"). */
export function collideTrack(w: TrackWorld, v: Vehicle): Hit | null {
  const tr = w.track;
  const { s, u } = project(tr, v.x, v.y);
  const f = frameAt(tr, s);
  const nx = -Math.sin(f.h);
  const ny = Math.cos(f.h);
  const walls = tr.def.walls(s);
  const ground = heightAt(tr, s, u);
  const above = v.z - ground;
  // A twist has no barriers (2026-11-22): ride off it and you are gone.
  if (edgesOpen(tr.def, s)) return null;
  // A curled bend's wall stands back past its pipe's top.
  const left = walls.left;
  const deckSide = tr.def.deck?.(Math.max(0, s)) ?? 0;
  let lu = left ? left.u + (tr.def.curl ? pipeReach(tr, s, 1) : 0) : 0;
  if (left && deckSide === 1) lu = Math.max(lu, f.half + DECK.OUT);
  if (left && u > lu - BODY_R && above < left.height) {
    return { nx: -nx, ny: -ny, depth: u - (lu - BODY_R), loss: 0, spin: 0, flow: true };
  }
  const right = walls.right;
  const by = tr.def.bypass?.(Math.max(0, s));
  let ru = right ? right.u - (tr.def.curl ? pipeReach(tr, s, -1) : 0) : 0;
  if (right && by !== null && by !== undefined)
    ru = Math.min(ru, by - BYPASS_LANE + right.u + f.half);
  if (right && deckSide === -1) ru = Math.min(ru, -(f.half + DECK.OUT));
  if (right && u < ru + BODY_R && above < right.height) {
    return { nx, ny, depth: ru + BODY_R - u, loss: 0, spin: 0, flow: true };
  }
  return null;
}

/* ── Gates ─────────────────────────────────────────────────── */

/** The gate across the road at s (a line from edge to edge, a little wider). */
export function gateAt(t: Track, s: number): Gate {
  const f = frameAt(t, s);
  const a = pointAt(t, s, f.half + 2);
  const b = pointAt(t, s, -(f.half + 2));
  return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
}

export interface Race {
  /** When the run started, or null. */
  start: number | null;
  /** The next gate to pass (an index into the course's gates). */
  next: number;
  last: number | null;
  best: number | null;
  record: boolean;
}

export function newRace(best: number | null = null): Race {
  return { start: null, next: 0, last: null, best, record: false };
}

/** Whether moving from s0 to s1 (with |u| inside the gate) passes the gate at g. */
export function passes(s0: number, s1: number, u: number, half: number, g: number): boolean {
  return s0 < g && s1 >= g && Math.abs(u) <= half + 3;
}

/**
 * The Canyon Race: the start gate starts the clock, the checkpoints must be passed in order, the
 * finish stops it. Going back through the start restarts the run.
 */
export function stepCanyonRace(
  race: Race,
  s0: number,
  s1: number,
  u: number,
  half: number,
  t: number,
): Race {
  const gates = [RACE.start, ...RACE.checkpoints, RACE.finish];
  if (passes(s0, s1, u, half, RACE.start)) return { ...race, start: t, next: 1, record: false };
  if (race.start === null) return race;
  const g = gates[race.next];
  if (g !== undefined && passes(s0, s1, u, half, g)) {
    if (race.next === gates.length - 1) {
      const time = t - race.start;
      const record = race.best === null || time < race.best;
      return { start: null, next: 0, last: time, best: record ? time : race.best, record };
    }
    return { ...race, next: race.next + 1 };
  }
  return race;
}

/** Coast Road and Night Rain: every kilometre gate ends one timed kilometre and starts the next. */
export function stepKmRace(
  race: Race,
  s0: number,
  s1: number,
  u: number,
  half: number,
  t: number,
  every = COAST_GATE,
): Race {
  const g = Math.ceil(s0 / every) * every;
  if (g <= 0 || !passes(s0, s1, u, half, g)) return race;
  if (race.start === null) return { ...race, start: t, record: false };
  const time = t - race.start;
  const record = race.best === null || time < race.best;
  return { start: t, next: 0, last: time, best: record ? time : race.best, record };
}
