/**
 * Drive: tracks as data (docs/specs/drive-tracks.md, "Tracks as data"). A track is a small JSON
 * document: its bends and rises as waves, bumps and keyframes, its width, banking, walls and
 * features. `compileTrack` turns it into the TrackDef the physics and the views already use, so a
 * track written by hand, by the menu's map, by the intro flyover or one day by Fable is the same
 * thing. `validateTrackData` checks a document before it is trusted. Pure: no three.js.
 *
 * Only types come from track.ts, so track.ts can build its tracks from this file without a cycle.
 */

import type { TrackDef, TrackId, Wall } from '@/lib/art/track';
import { G } from '@/lib/art/vehicle';

const TAU = Math.PI * 2;

/** A heading or height wave: amp × sin(2π s / period + phase). */
export interface Wave {
  amp: number;
  period: number;
  phase?: number;
}

/** A cosine bump of `height` and half-width `width` centred at `at` (m along the road). */
export interface Bump {
  at: number;
  height: number;
  width: number;
}

/** Something on the road the menus, timing and later the track's own features read. */
export type Feature =
  | { kind: 'gate'; every: number }
  | { kind: 'start'; at: number }
  | { kind: 'jump'; at: number; length: number }
  | { kind: 'wallride'; from: number; to: number; side: 'left' | 'right' };

export interface TrackData {
  id: TrackId;
  /** Heading at the start (radians, default 0). */
  startH?: number;
  /** The bends. Waves are of the heading (its curvature is their derivative); keys are curvature
   * keyframes [s, 1/radius], linear between, added to the waves. */
  curve: { waves?: Wave[]; keys?: [number, number][] };
  /** The rises. Bumps repeat every `every` metres (or once, if not given); waves run on. */
  rise: { waves?: Wave[]; bumps?: Bump[]; every?: number; keys?: [number, number][] };
  /** Half the road's width (m). */
  half: number;
  /** Height of the lip at the edges (m). */
  lip: number;
  /** Design speed (m/s) and steepest bank (rad). */
  bank: { speed: number; max: number };
  /** The ground off the road levels out toward this height (null: stays at the edge's height). */
  terrain: number | null;
  /** Barriers this far beyond the edge, 30 m high (when no explicit walls). */
  barrier?: number;
  /** Explicit walls (u positive left). */
  walls?: { left: Wall | null; right: Wall | null };
  features?: Feature[];
}

function bumpAt(s: number, c: number, a: number, w: number): number {
  const x = (s - c) / w;
  return Math.abs(x) >= 1 ? 0 : (a * (1 + Math.cos(Math.PI * x))) / 2;
}

function keysAt(keys: readonly (readonly [number, number])[], s: number): number {
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

/** Turns a track document into the TrackDef the physics, views and timing use. */
export function compileTrack(d: TrackData): TrackDef {
  const cw = d.curve.waves ?? [];
  const ck = d.curve.keys;
  const rw = d.rise.waves ?? [];
  const rb = d.rise.bumps ?? [];
  const rk = d.rise.keys;
  const every = d.rise.every;
  const walls =
    d.walls ??
    (d.barrier !== undefined
      ? {
          left: { u: d.half + d.barrier, height: 30 },
          right: { u: -(d.half + d.barrier), height: 30 },
        }
      : { left: null, right: null });
  return {
    id: d.id,
    startH: d.startH ?? 0,
    curv: (s) => {
      let k = 0;
      for (const w of cw)
        k += w.amp * (TAU / w.period) * Math.cos((TAU * s) / w.period + (w.phase ?? 0));
      if (ck) k += keysAt(ck, s);
      return k;
    },
    elev: (s) => {
      const p = every ? ((s % every) + every) % every : s;
      let e = 0;
      for (const b of rb) e += bumpAt(p, b.at, b.height, b.width);
      for (const w of rw) e += w.amp * Math.sin((TAU * s) / w.period + (w.phase ?? 0));
      if (rk) e += keysAt(rk, s);
      return e;
    },
    half: () => d.half,
    lip: () => d.lip,
    bankSpeed: d.bank.speed,
    bankMax: d.bank.max,
    terrain: d.terrain,
    walls: () => walls,
  };
}

/* ── Checking a document ───────────────────────────────────── */

/** The limits a drivable track keeps. */
export const LIMITS = {
  /** Tightest radius any bend may reach (m). */
  minRadius: 110,
  /** Steepest bank (rad, about 29°). */
  maxBank: 0.5,
  half: [8, 40] as const,
  /** Steepest climb or drop (rise per metre): the launch crests reach about 0.24. */
  maxGrade: 0.3,
  maxJump: 120,
};

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Problems with a document, in plain words; an empty list means it can be driven. The geometry
 * (radius, grade) is sampled over `span` metres. */
export function validateTrackData(d: unknown, span = 6000): string[] {
  const out: string[] = [];
  if (!d || typeof d !== 'object') return ['not an object'];
  const t = d as Partial<TrackData>;
  if (typeof t.id !== 'string') out.push('id missing');
  if (!t.curve || typeof t.curve !== 'object') out.push('curve missing');
  if (!t.rise || typeof t.rise !== 'object') out.push('rise missing');
  if (!num(t.half) || t.half < LIMITS.half[0] || t.half > LIMITS.half[1])
    out.push(`half must be ${LIMITS.half[0]}–${LIMITS.half[1]} m`);
  if (!num(t.lip) || t.lip < 0 || t.lip > 2) out.push('lip must be 0–2 m');
  if (!t.bank || !num(t.bank.speed) || !num(t.bank.max) || t.bank.speed <= 0)
    out.push('bank needs a speed and a max');
  else if (t.bank.max < 0 || t.bank.max > LIMITS.maxBank)
    out.push(`bank max must be 0–${LIMITS.maxBank} rad`);
  if (t.terrain !== null && !num(t.terrain)) out.push('terrain must be a number or null');
  const waves = [...(t.curve?.waves ?? []), ...(t.rise?.waves ?? [])];
  for (const w of waves) {
    if (
      !num(w?.amp) ||
      !num(w?.period) ||
      w.period <= 0 ||
      (w.phase !== undefined && !num(w.phase))
    )
      out.push('a wave needs amp, a positive period and an optional phase');
  }
  for (const b of t.rise?.bumps ?? []) {
    if (!num(b?.at) || !num(b?.height) || !num(b?.width) || b.width <= 0)
      out.push('a bump needs at, height and a positive width');
  }
  if (t.rise?.every !== undefined && (!num(t.rise.every) || t.rise.every <= 0))
    out.push('rise.every must be positive');
  for (const keys of [t.curve?.keys, t.rise?.keys]) {
    if (keys === undefined) continue;
    if (!Array.isArray(keys) || keys.length === 0) out.push('keys must be a list of [s, value]');
    else
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!Array.isArray(k) || !num(k[0]) || !num(k[1]))
          out.push('keys must be a list of [s, value]');
        else if (i > 0 && k[0] <= keys[i - 1][0]) out.push('keys must run forward');
      }
  }
  for (const f of t.features ?? []) {
    if (
      f.kind === 'jump' &&
      (!num(f.at) || !num(f.length) || f.length <= 0 || f.length > LIMITS.maxJump)
    )
      out.push(`a jump needs at and a length up to ${LIMITS.maxJump} m`);
    if (f.kind === 'gate' && (!num(f.every) || f.every < 200))
      out.push('gates must be at least 200 m apart');
  }
  if (out.length) return out;

  // The geometry, sampled.
  const def = compileTrack(t as TrackData);
  let tight = 0;
  let steep = 0;
  for (let s = 0; s <= span; s += 2) {
    tight = Math.max(tight, Math.abs(def.curv(s)));
    steep = Math.max(steep, Math.abs(def.elev(s + 1) - def.elev(s - 1)) / 2);
  }
  if (tight > 1 / LIMITS.minRadius)
    out.push(`a bend is tighter than ${LIMITS.minRadius} m (${Math.round(1 / tight)} m)`);
  if (steep > LIMITS.maxGrade) out.push(`a slope is steeper than ${LIMITS.maxGrade * 100}%`);
  return out;
}

/* ── The outline, for the map ──────────────────────────────── */

export interface OutlinePoint {
  /** Position on the plane (m) and height (m). */
  x: number;
  y: number;
  e: number;
  /** Bank (rad) and half-width (m) here. */
  bank: number;
  half: number;
  s: number;
}

export interface Outline {
  points: OutlinePoint[];
  /** The box round the points on the plane, and the lowest and highest heights. */
  min: { x: number; y: number; e: number };
  max: { x: number; y: number; e: number };
}

/** The centre line traced `length` metres from the start, a point every `step` m, by the same
 * heading integration the physics uses (track.ts `ensure`). */
export function trackOutline(def: TrackDef, length: number, step = 10): Outline {
  const ds = 2;
  let x = 0;
  let y = 0;
  let h = def.startH;
  const points: OutlinePoint[] = [];
  const min = { x: 0, y: 0, e: Number.POSITIVE_INFINITY };
  const max = { x: 0, y: 0, e: Number.NEGATIVE_INFINITY };
  const every = Math.max(1, Math.round(step / ds));
  const n = Math.ceil(length / ds);
  for (let i = 0; i <= n; i++) {
    const s = i * ds;
    if (i % every === 0 || i === n) {
      const k = def.curv(s);
      const e = def.elev(s);
      const bank = Math.max(
        -def.bankMax,
        Math.min(def.bankMax, Math.atan((k * def.bankSpeed ** 2) / G)),
      );
      points.push({ x, y, e, bank, half: def.half(s), s });
      min.x = Math.min(min.x, x);
      min.y = Math.min(min.y, y);
      min.e = Math.min(min.e, e);
      max.x = Math.max(max.x, x);
      max.y = Math.max(max.y, y);
      max.e = Math.max(max.e, e);
    }
    const hm = h + def.curv(s + ds / 4) * (ds / 2);
    h += def.curv(s + ds / 2) * ds;
    x += Math.cos(hm) * ds;
    y += Math.sin(hm) * ds;
  }
  return { points, min, max };
}
