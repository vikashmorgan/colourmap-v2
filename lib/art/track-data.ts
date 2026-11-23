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
  /** A straight, unbanked stretch (the start grid, 2026-11-22: a level grid for the stage fire). */
  | { kind: 'straight'; from: number; to: number }
  /** A jump; `down` (m) lands it on a downslope that keeps falling that much further before it
   * eases back (2026-11-23: "landing zones into downslope"). */
  | { kind: 'jump'; at: number; length: number; every?: number; down?: number }
  /** A dive (2026-11-22: "after superloop make slope keep shooting downwards, so it enhances
   * acceleration, then it comes back up and a jump"): straight down a long slope, half back up,
   * held there for the jump, then slowly back to the road's own height. */
  | { kind: 'dive'; at: number; length: number; depth: number; hold: number; every?: number }
  /** The secret high road: a deck along the top of the curled wall of a banked bend (2026-11-22). */
  | {
      kind: 'deck';
      from: number;
      to: number;
      side: 'left' | 'right';
      every?: number;
      /** Its side fires twice as thick and far taller (2026-11-22: "the fire on turn edges is
       * amazing, add that even stronger on another one of the edges"). */
      blaze?: boolean;
    }
  /** The road crossing over itself, twice: a figure-of-eight of two loops (2026-11-22). */
  | { kind: 'crossover'; at: number; every?: number }
  /** A full roll of the road about its axis, on a straight (2026-11-22). */
  | {
      kind: 'twist';
      at: number;
      length: number;
      every?: number;
      /** Which way it rolls: 1 (default) or -1, the other way. */
      dir?: 1 | -1;
      /** Your line through it changes your speed: on the side the road rolls toward it runs
       * downhill by up to this slope (faster), on the other uphill (slower). */
      surge?: number;
      /** A straight lane past it on the right, for those who would rather not (2026-11-22: "a
       * choice to pass straight … but if you do the loopings you get a boost after it"). */
      bypass?: boolean;
      /** A normal looping instead (2026-11-22: "make second one a normal looping not a sideways
       * rotation"): the road climbs, goes over upside down and comes back down, end over end. */
      loop?: boolean;
    }
  /** A tunnel of blue gas fire shooting outwards over the road (2026-11-22). */
  | {
      kind: 'fire';
      at: number;
      length: number;
      every?: number;
      /** Each tunnel its own (2026-11-22: "make different ones have different dynamics and
       * aesthetics"): roar (orange tongues out from the arch), crown (white-hot jets in toward you,
       * a closing ring), wave (red fire running round the arch), blue (long blue gas lances). */
      style?: FireStyle;
    }
  | { kind: 'wallride'; from: number; to: number; side: 'left' | 'right' };

export const FIRE_STYLES = ['roar', 'crown', 'wave', 'blue'] as const;
export type FireStyle = (typeof FIRE_STYLES)[number];

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
  /** The radius (m) of a curved wall past the edge on a banked bend's high side, at full bank (a
   * wall to ride up off the road and boost back down; 2026-11-22). */
  curl?: number;
  /** Surf: the curled wall cut to a kicker this tall (m); past it you fly, pulled back. */
  surf?: number;
  /** An endless road's lap (m): its features repeat and its portal stands every lap. */
  lap?: number;
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

/**
 * A jump over the void (2026-11-22: "a big jump over the unknown", "the long jump over the void"):
 * the road runs straight for STRAIGHT m either side, rises on a kicker RAMP m long and RAMP_H high,
 * then is gone for the jump's length; the far side lands LAND_DROP lower and climbs back over LAND.
 */
export const JUMP = {
  RAMP: 140,
  RAMP_H: 12,
  LAND: 220,
  LAND_DROP: 8,
  STRAIGHT: 200,
  EASE: 160,
  /** A downslope landing: how long the slope runs, how long it takes to ease back, the most drop. */
  DOWN_RUN: 380,
  DOWN_BACK: 600,
  DOWN_MAX: 40,
};

/** Where s sits against a jump (or a fire tunnel): metres past its gap's start (negative before it), or null if far. */
function jumpLocal(j: { at: number; every?: number }, s: number): number {
  if (!j.every) return s - j.at;
  const p = (((s - j.at) % j.every) + j.every) % j.every;
  // Nearest occurrence: before the gap counts as negative.
  return p > j.every / 2 ? p - j.every : p;
}

/** How long a dive takes to ease back up to the road's own height after its hold (m). */
export const DIVE_BACK = 600;

/** A dive's drop at x m past its start: down to -depth over 70% of its length (steepest at 1.5 ×
 * the mean slope), half back up by its end, held for `hold`, then eased back to 0 over DIVE_BACK. */
export function diveRise(x: number, dv: { length: number; depth: number; hold: number }): number {
  const ease = (k: number) => k * k * (3 - 2 * k);
  const L = dv.length;
  const D = dv.depth;
  if (x <= 0) return 0;
  if (x < 0.7 * L) return -D * ease(x / (0.7 * L));
  if (x < L) return -D + (D / 2) * ease((x - 0.7 * L) / (0.3 * L));
  if (x < L + dv.hold) return -D / 2;
  if (x < L + dv.hold + DIVE_BACK) return -D / 2 + (D / 2) * ease((x - L - dv.hold) / DIVE_BACK);
  return 0;
}

export function jumpRise(x: number, length: number, down = 0): number {
  const { RAMP, RAMP_H, LAND, LAND_DROP, DOWN_RUN, DOWN_BACK } = JUMP;
  if (down > 0 && x >= length) {
    // Landing on a slope that is steepest where you touch down and flattens as it falls.
    const a = (x - length) / DOWN_RUN;
    if (a < 1) return -LAND_DROP - down * a * (2 - a);
    const b = (x - length - DOWN_RUN) / DOWN_BACK;
    if (b < 1) return (-LAND_DROP - down) * (1 - b * b * (3 - 2 * b));
    return 0;
  }
  if (x >= -RAMP && x < 0) {
    const k = (x + RAMP) / RAMP;
    return RAMP_H * k * k;
  }
  if (x >= 0 && x < length) return RAMP_H + ((-LAND_DROP - RAMP_H) * x) / length;
  if (x >= length && x < length + LAND) {
    const k = (x - length) / LAND;
    // Back up to the road, easing in and out.
    return -LAND_DROP * (1 - k * k * (3 - 2 * k));
  }
  return 0;
}

/** 0 on a jump's straight, easing back to 1 away from it. */
function jumpStraight(x: number, length: number, down = 0): number {
  const { STRAIGHT, EASE } = JUMP;
  const d = x < 0 ? -x - STRAIGHT : x - length - STRAIGHT - (down > 0 ? JUMP.DOWN_RUN : 0);
  if (d <= 0) return 0;
  if (d >= EASE) return 1;
  const k = d / EASE;
  return k * k * (3 - 2 * k);
}

/**
 * The crossover (2026-11-22: "the track passes over the track so you can see it from above at
 * some point, or jump above it"): from a straight LEAD m long the road climbs RISE m through a
 * 270° left loop of radius R, runs MID m straight back across the road it came in on (over it),
 * then comes down through a 270° right loop and runs out under that straight, heading as it came.
 * Two overpasses; each loop's curvature eases in and out over RAMP m.
 */
export const CROSS = { R: 220, RISE: 18, LEAD: 300, MID: 500, RAMP: 30 };
const LOOP = 1.5 * Math.PI * CROSS.R + CROSS.RAMP;
/** How long a crossover is, from its lead straight to the end of its run-out (m). */
export const CROSS_LENGTH = 2 * CROSS.LEAD + 2 * LOOP + CROSS.MID;

function crossParts(x: number) {
  const a = CROSS.LEAD;
  const b = a + LOOP;
  const c = b + CROSS.MID;
  const d = c + LOOP;
  const trap = (y: number) => Math.max(0, Math.min(1, y / CROSS.RAMP, (LOOP - y) / CROSS.RAMP));
  const ease = (k: number) => {
    const t = Math.min(1, Math.max(0, k));
    return t * t * (3 - 2 * t);
  };
  let k = 0;
  if (x >= a && x <= b) k = trap(x - a) / CROSS.R;
  else if (x >= c && x <= d) k = -trap(x - c) / CROSS.R;
  const e = CROSS.RISE * (ease((x - a) / LOOP) - ease((x - c) / LOOP));
  return { k, e };
}

/**
 * A twist's bypass: a lane BY_LANE m half-wide that peels off the road's right edge from SPLIT m
 * before the twist, runs straight BY_OUT m out from the centre beside it (clear of the ribbon's
 * sweep), and merges back the same way after.
 */
export const BYPASS = { LANE: 9, OUT: 46, SPLIT: 420, CLEAR: 60 };

/** 0 on a straight, easing back to 1 over EASE m either side. */
function straightAt(st: { from: number; to: number }, s: number): number {
  const d = s < st.from ? st.from - s : s > st.to ? s - st.to : 0;
  if (d >= JUMP.EASE) return 1;
  const k = d / JUMP.EASE;
  return k * k * (3 - 2 * k);
}

/** Turns a track document into the TrackDef the physics, views and timing use. */
export function compileTrack(d: TrackData): TrackDef {
  const cw = d.curve.waves ?? [];
  const ck = d.curve.keys;
  const rw = d.rise.waves ?? [];
  const rb = d.rise.bumps ?? [];
  const rk = d.rise.keys;
  const every = d.rise.every;
  const jumps = (d.features ?? []).filter((f) => f.kind === 'jump');
  const fires = (d.features ?? []).filter((f) => f.kind === 'fire');
  const dives = (d.features ?? []).filter((f) => f.kind === 'dive');
  const twists = (d.features ?? []).filter((f) => f.kind === 'twist');
  const crosses = (d.features ?? []).filter((f) => f.kind === 'crossover');
  const decks = (d.features ?? []).filter((f) => f.kind === 'deck');
  /** Where s sits in a crossover (m from its start), or null outside every one. */
  const inCross = (s: number) => {
    for (const c of crosses) {
      const x = jumpLocal(c, s);
      if (x >= -JUMP.EASE && x <= CROSS_LENGTH + JUMP.EASE) return x;
    }
    return null;
  };
  // A twist rolls on a straight: the road runs straight for its length and STRAIGHT m either side.
  const straights = [...(d.features ?? []).filter((f) => f.kind === 'straight')] as {
    from: number;
    to: number;
  }[];
  const twistStraight = (s: number) => {
    let k = 1;
    for (const tw of twists) {
      const x = jumpLocal(tw, s);
      k *= straightAt({ from: -JUMP.STRAIGHT, to: tw.length + JUMP.STRAIGHT }, x);
    }
    return k;
  };
  const within = (list: typeof jumps | typeof fires, s: number) =>
    list.some((j) => {
      const x = jumpLocal(j, s);
      return x >= 0 && x < j.length;
    });
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
      for (const j of jumps) k *= jumpStraight(jumpLocal(j, s), j.length, j.down);
      for (const st of straights) k *= straightAt(st, s);
      // A dive runs straight, so all its speed goes ahead.
      for (const dv of dives) k *= straightAt({ from: 0, to: dv.length }, jumpLocal(dv, s));
      if (twists.length) k *= twistStraight(s);
      // A crossover draws its own bends: the waves step aside for it.
      const x = crosses.length ? inCross(s) : null;
      if (x !== null) k = k * straightAt({ from: 0, to: CROSS_LENGTH }, x) + crossParts(x).k;
      return k;
    },
    elev: (s) => {
      const p = every ? ((s % every) + every) % every : s;
      let e = 0;
      for (const b of rb) e += bumpAt(p, b.at, b.height, b.width);
      for (const w of rw) e += w.amp * Math.sin((TAU * s) / w.period + (w.phase ?? 0));
      if (rk) e += keysAt(rk, s);
      for (const j of jumps) e += jumpRise(jumpLocal(j, s), j.length, j.down);
      for (const dv of dives) e += diveRise(jumpLocal(dv, s), dv);
      const x = crosses.length ? inCross(s) : null;
      if (x !== null) e += crossParts(x).e;
      return e;
    },
    half: () => d.half,
    lip: () => d.lip,
    bankSpeed: d.bank.speed,
    bankMax: d.bank.max,
    terrain: d.terrain,
    walls: () => walls,
    ...(jumps.length
      ? {
          gap: (s: number) => within(jumps, s),
        }
      : {}),
    ...(fires.length
      ? {
          fire: (s: number) => within(fires, s),
          fireStyle: (s: number) => {
            for (const f of fires) {
              const x = jumpLocal(f, s);
              if (x >= 0 && x < f.length)
                return Math.max(0, FIRE_STYLES.indexOf(f.style ?? 'roar'));
            }
            return 0;
          },
        }
      : {}),
    ...(crosses.length
      ? {
          bridge: (s: number) => {
            const x = inCross(s);
            return x !== null && crossParts(x).e > 3;
          },
        }
      : {}),
    ...(d.lap ? { lap: d.lap } : {}),
    ...(decks.length
      ? {
          deck: (s: number) => {
            for (const k of decks) {
              const p = k.every ? (((s - k.from) % k.every) + k.every) % k.every : s - k.from;
              if (p >= 0 && p < k.to - k.from) return k.side === 'left' ? 1 : -1;
            }
            return 0;
          },
          blaze: (s: number) =>
            decks.some((k) => {
              const p = k.every ? (((s - k.from) % k.every) + k.every) % k.every : s - k.from;
              return k.blaze === true && p >= 0 && p < k.to - k.from;
            }),
        }
      : {}),
    ...(d.curl ? { curl: d.curl } : {}),
    ...(d.surf ? { surf: d.surf } : {}),
    ...(twists.length
      ? {
          twist: (s: number) => {
            for (const tw of twists) {
              const x = jumpLocal(tw, s) / tw.length;
              if (x > 0 && x < 1)
                return (tw.dir ?? 1) * Math.PI * 2 * x * x * x * (x * (6 * x - 15) + 10);
            }
            return 0;
          },
          bypass: (s: number) => {
            for (const tw of twists) {
              if (!tw.bypass) continue;
              const x = jumpLocal(tw, s);
              const { OUT, SPLIT, CLEAR } = BYPASS;
              if (x < -SPLIT || x > tw.length + SPLIT) continue;
              const a = Math.min(
                (x + SPLIT) / (SPLIT - CLEAR),
                (tw.length + SPLIT - x) / (SPLIT - CLEAR),
                1,
              );
              const k = a * a * (3 - 2 * a);
              return -OUT * k;
            }
            return null;
          },
          looping: (s: number) => {
            for (const tw of twists) {
              if (!tw.loop) continue;
              const x = jumpLocal(tw, s);
              if (x > 0 && x < tw.length) return { from: s - x, length: tw.length };
            }
            return null;
          },
          surge: (s: number, u: number) => {
            for (const tw of twists) {
              const x = jumpLocal(tw, s) / tw.length;
              if (x > 0 && x < 1 && tw.surge && !tw.loop)
                // Rolling left (dir 1) the road turns toward its right (u < 0): that side is fast.
                return (
                  -(tw.dir ?? 1) *
                  tw.surge *
                  Math.sin(Math.PI * x) *
                  Math.max(-1, Math.min(1, u / d.half))
                );
            }
            return 0;
          },
        }
      : {}),
  };
}

/* ── Checking a document ───────────────────────────────────── */

/** The limits a drivable track keeps. */
export const LIMITS = {
  /** Tightest radius any bend may reach (m). */
  minRadius: 110,
  /** Steepest bank (rad, about 40°). */
  maxBank: 0.7,
  half: [8, 40] as const,
  /** Steepest climb or drop (rise per metre): the launch crests reach about 0.24. */
  maxGrade: 0.3,
  maxJump: 160,
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
    if (
      f.kind === 'jump' &&
      f.down !== undefined &&
      (!num(f.down) || f.down < 0 || f.down > JUMP.DOWN_MAX)
    )
      out.push(`a jump's downslope landing drops 0 to ${JUMP.DOWN_MAX} m`);
    if (f.kind === 'fire' && (!num(f.at) || !num(f.length) || f.length <= 0 || f.length > 1000))
      out.push('a fire tunnel needs at and a length up to 1000 m');
    if (f.kind === 'fire' && f.style !== undefined && !FIRE_STYLES.includes(f.style))
      out.push(`a fire tunnel's style is one of ${FIRE_STYLES.join(', ')}`);
    if (f.kind === 'deck' && (!num(f.from) || !num(f.to) || f.to <= f.from || f.to - f.from > 1500))
      out.push('a deck needs from before to, at most 1.5 km');
    if (f.kind === 'crossover' && !num(f.at)) out.push('a crossover needs at');
    if (
      f.kind === 'dive' &&
      (!num(f.at) ||
        !num(f.length) ||
        !num(f.depth) ||
        !num(f.hold) ||
        f.length < 200 ||
        f.depth <= 0 ||
        f.depth > 0.15 * f.length ||
        f.hold < 0)
    )
      out.push('a dive needs at, a length of 200 m or more, a depth up to 15% of it, and a hold');
    if (f.kind === 'twist' && (!num(f.at) || !num(f.length) || f.length < 150 || f.length > 800))
      out.push('a twist needs at and a length from 150 to 800 m');
    if (f.kind === 'twist' && f.surge !== undefined && (f.surge < 0 || f.surge > 0.3))
      out.push('a twist’s surge is a slope from 0 to 0.3');
    if (f.kind === 'straight' && (!num(f.from) || !num(f.to) || f.to <= f.from))
      out.push('a straight needs from before to');
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
