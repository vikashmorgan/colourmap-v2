/*
 * The City game's races (docs/specs/art-city.md, "Game design"): a track of glowing moon gates
 * through a district's streets and round its towers, with diagonal bars to thread through, some
 * turning. Fly into the start and a quiet prompt asks if you want to race; Enter (or the Go button)
 * starts a 3, 2, 1, then three other ships race you. Pass the gates in order; a bar slows you a
 * moment, never more. The finish shows your place and time, and the best time is kept on the device.
 *
 * 2026-11-12: "a spaceship racing track in some part of the city with obstacles like diagonal bars
 * u have to navigate through. and u can start race when u go there (do u wanna start the race, and
 * have 3 2 1, and other spaceships racing with u). different racetracks to be developed for each
 * quartier."
 *
 * Pure but for the best time, kept in localStorage where there is one (and never failing where not).
 */

import type { RGB, Vec3 } from './bigbang';
import { type DistrictId, litDistricts } from './city-game';
import {
  C,
  GROUND,
  type Item,
  lerp,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';

/** A bar across the street: its middle, the street's way (it lies across it), its tilt, and how fast it turns. */
export type Bar = { at: Vec3; along: 'x' | 'z'; tilt: number; spin: number; half: number };
export type Track = {
  district: DistrictId;
  name: string;
  /** Raceable now (gates, bars and rivals), or a draft: gates only, to be developed. */
  full: boolean;
  start: Vec3;
  gates: Vec3[];
  bars: Bar[];
};
const G = (x: number, y: number, z: number): Vec3 => [x, GROUND + y, z];

/** The tracks, tile-local, one per quarter: Chinatown's is full, the rest are drafts. */
export const TRACKS: Track[] = [
  {
    district: 'chinatown',
    name: 'Lantern Loop',
    full: true,
    start: G(78, 9, 150),
    gates: [
      G(78, 10, 124),
      G(78, 14, 88),
      G(78, 10, 52),
      G(64, 12, 34),
      G(34, 16, 34),
      G(8, 12, 34),
      G(0, 10, 60),
      G(0, 10, 96),
      G(0, 10, 132),
      G(8, 12, 170),
      G(40, 16, 170),
      G(70, 12, 170),
      G(78, 10, 158),
    ],
    bars: [
      { at: G(78, 12, 70), along: 'z', tilt: 0.5, spin: 0, half: 4.6 },
      { at: G(49, 14, 34), along: 'x', tilt: 0, spin: 0.6, half: 4.6 },
      { at: G(0, 10, 78), along: 'z', tilt: -0.55, spin: 0, half: 5.5 },
      { at: G(0, 10, 114), along: 'z', tilt: 0, spin: 0.4, half: 5.5 },
      { at: G(24, 14, 170), along: 'x', tilt: 0.6, spin: 0, half: 4.6 },
    ],
  },
  {
    // Under the street: down into one canal, along it in the undercity under its arches of
    // pulsing light, up and over, and back along the next (2026-11-12: "tunnels can be
    // underground for racing").
    district: 'canals',
    name: 'Undercity Run',
    full: true,
    start: G(148, 6, 680),
    gates: [
      G(130, -5, 680),
      G(100, -11, 680),
      G(70, -11, 680),
      G(40, -11, 680),
      G(16, -3, 680),
      G(26, 8, 705),
      G(26, 8, 728),
      G(45, -8, 748),
      G(80, -11, 748),
      G(115, -11, 748),
      G(145, -3, 748),
    ],
    bars: [
      { at: G(55, -10, 680), along: 'x', tilt: 0.5, spin: 0, half: 3.6 },
      { at: G(98, -10, 748), along: 'x', tilt: 0, spin: 0.5, half: 3.6 },
    ],
  },
  {
    // A draft: round the sky island (the platform station high over the Canals), through its
    // deck and round its mast, the city far below (2026-11-12: "a racing track in the sky with
    // tunnels and stuff, on a sky station flying island thing").
    district: 'heights',
    name: 'Sky Island Loop',
    full: false,
    start: G(-150, 312, 1215),
    gates: [
      G(-120, 305, 1195),
      G(-118, 290, 1160),
      G(-150, 300, 1180),
      G(-182, 318, 1160),
      G(-185, 296, 1200),
      G(-150, 330, 1210),
    ],
    bars: [],
  },
  {
    district: 'indian',
    name: 'Diwali Run',
    full: false,
    start: G(-78, 10, 360),
    gates: [G(-78, 12, 330), G(-52, 14, 306), G(-26, 12, 280), G(-52, 18, 300)],
    bars: [],
  },
  {
    district: 'oriental',
    name: 'Minaret Slalom',
    full: false,
    start: G(78, 12, 470),
    gates: [G(78, 30, 440), G(52, 20, 420), G(26, 34, 400), G(52, 24, 380)],
    bars: [],
  },
  {
    district: 'temples',
    name: 'Stair Climb',
    full: false,
    start: G(78, 10, 1010),
    gates: [G(78, 14, 980), G(78, 24, 960), G(52, 12, 920), G(26, 18, 900)],
    bars: [],
  },
  {
    district: 'domes',
    name: 'Greenhouse Glide',
    full: false,
    start: G(78, 10, 1280),
    gates: [G(78, 8, 1250), G(52, 10, 1230), G(26, 8, 1200)],
    bars: [],
  },
  {
    district: 'egypt',
    name: 'Pyramid Circuit',
    full: false,
    start: G(-78, 10, 1560),
    gates: [G(-78, 34, 1520), G(-52, 12, 1480), G(-26, 18, 1450), G(-52, 26, 1430)],
    bars: [],
  },
];
export const GATE_R = 3.4;
const PASS_R = 4.4;
const START_R = 12;
const COUNTDOWN = 3;
const FINISH_SHOW = 8;
const CANCEL_SHOW = 2.5;
/** How far from the track you can stray before the race is off. */
export const STRAY = 70;
export const RIVALS = 3;
const RIVAL_SPEED = [10.5, 12, 13.5];

export type RacePhase = 'idle' | 'prompt' | 'countdown' | 'racing' | 'finished' | 'cancelled';
type Race = {
  phase: RacePhase;
  track: Track;
  /** Which copy of the tile the race runs in. */
  ox: number;
  oz: number;
  since: number;
  next: number;
  time: number;
  place: number;
  best: number | null;
  hitUntil: number;
  lastHit: number;
};
export const race: Race = {
  phase: 'idle',
  track: TRACKS[0] as Track,
  ox: 0,
  oz: 0,
  since: 0,
  next: 0,
  time: 0,
  place: 0,
  best: null,
  hitUntil: -1,
  lastHit: -10,
};

/* ---------- best times, kept on the device ---------- */

const KEY = 'colourmap:city-race:';
function readBest(track: Track): number | null {
  try {
    const v = globalThis.localStorage?.getItem(KEY + track.name);
    const n = v ? Number(v) : Number.NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
function writeBest(track: Track, s: number) {
  try {
    globalThis.localStorage?.setItem(KEY + track.name, s.toFixed(2));
  } catch {
    /* no storage: the best lives this visit only */
  }
}

/* ---------- the course ---------- */

const course = new Map<Track, { pts: Vec3[]; cum: number[]; length: number }>();
/** The track as a smooth line through its start and gates (Catmull-Rom), by length. */
function courseOf(track: Track) {
  const had = course.get(track);
  if (had) return had;
  const P = [track.start, ...track.gates];
  const pts: Vec3[] = [];
  const cr = (a: number, b: number, c: number, d: number, u: number) =>
    0.5 *
    (2 * b +
      (-a + c) * u +
      (2 * a - 5 * b + 4 * c - d) * u * u +
      (-a + 3 * b - 3 * c + d) * u * u * u);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)] as Vec3;
    const p1 = P[i] as Vec3;
    const p2 = P[i + 1] as Vec3;
    const p3 = P[Math.min(P.length - 1, i + 2)] as Vec3;
    for (let j = 0; j < 24; j++) {
      const u = j / 24;
      pts.push([
        cr(p0[0], p1[0], p2[0], p3[0], u),
        cr(p0[1], p1[1], p2[1], p3[1], u),
        cr(p0[2], p1[2], p2[2], p3[2], u),
      ]);
    }
  }
  pts.push(P[P.length - 1] as Vec3);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as Vec3;
    const b = pts[i] as Vec3;
    cum.push((cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const c = { pts, cum, length: cum[cum.length - 1] as number };
  course.set(track, c);
  return c;
}
export const trackLength = (track: Track) => courseOf(track).length;
/** The course `s` along it, tile-local, and its heading. */
export function courseAt(track: Track, s: number): { c: Vec3; f: Vec3 } {
  const { pts, cum, length } = courseOf(track);
  const x = Math.max(0, Math.min(length, s));
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] as number) <= x) lo = mid;
    else hi = mid;
  }
  const a = pts[lo] as Vec3;
  const b = pts[hi] as Vec3;
  const f = (x - (cum[lo] as number)) / ((cum[hi] as number) - (cum[lo] as number) || 1);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
  return {
    c: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)],
    f: [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d],
  };
}
/** How far from the course a tile-local point is (roughly, by its sampled line). */
function offCourse(track: Track, q: Vec3): number {
  const { pts } = courseOf(track);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pts.length; i += 4) {
    const p = pts[i] as Vec3;
    best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  }
  return best;
}

/** A bar's two ends now. */
export function barEnds(b: Bar, t: number): [Vec3, Vec3] {
  const a = b.tilt + b.spin * t;
  const dx = Math.cos(a) * b.half;
  const dy = Math.sin(a) * b.half;
  if (b.along === 'z')
    return [
      [b.at[0] - dx, b.at[1] - dy, b.at[2]],
      [b.at[0] + dx, b.at[1] + dy, b.at[2]],
    ];
  return [
    [b.at[0], b.at[1] - dy, b.at[2] - dx],
    [b.at[0], b.at[1] + dy, b.at[2] + dx],
  ];
}
const segDist = (q: Vec3, a: Vec3, b: Vec3) => {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
  const u = Math.max(
    0,
    Math.min(1, ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1] + (q[2] - a[2]) * ab[2]) / l2),
  );
  return Math.hypot(q[0] - a[0] - ab[0] * u, q[1] - a[1] - ab[1] * u, q[2] - a[2] - ab[2] * u);
};

/** The nearest track start to a point, in its tile copy, if within reach. */
function startNear(q: Vec3): { track: Track; ox: number; oz: number } | null {
  for (const track of TRACKS) {
    if (!track.full) continue;
    const ox = nearest(0, q[0] - track.start[0], TILE_X);
    const oz = nearest(0, q[2] - track.start[2], TILE_Z);
    const s = track.start;
    if (Math.hypot(q[0] - s[0] - ox, q[1] - s[1], q[2] - s[2] - oz) < START_R)
      return { track, ox, oz };
  }
  return null;
}

/* ---------- the race, step by step ---------- */

export type RaceInput = { active: boolean; pos: Vec3; enter: boolean; t: number };
/**
 * One frame of the race: idle → prompt (in the start zone) → countdown (Enter) → racing → finished,
 * or cancelled (Esc, or straying from the track). Returns where to hold the ship during the countdown
 * (on the start, facing the first gate), and how much a bar just hit slows it (1 none).
 */
export function raceStep(inp: RaceInput): { hold: { c: Vec3; f: Vec3 } | null; pace: number } {
  const { active, pos, enter, t } = inp;
  const R = race;
  const local: Vec3 = [pos[0] - R.ox, pos[1], pos[2] - R.oz];
  switch (R.phase) {
    case 'idle':
    case 'prompt': {
      const near = active ? startNear(pos) : null;
      if (!near) {
        R.phase = 'idle';
        break;
      }
      if (R.phase === 'idle') {
        Object.assign(R, {
          phase: 'prompt',
          track: near.track,
          ox: near.ox,
          oz: near.oz,
          since: t,
        });
        R.best = readBest(near.track);
      }
      if (enter)
        Object.assign(R, {
          phase: 'countdown',
          since: t,
          next: 0,
          time: 0,
          place: 0,
          hitUntil: -1,
        });
      break;
    }
    case 'countdown': {
      if (!active) {
        Object.assign(R, { phase: 'cancelled', since: t });
        break;
      }
      if (t - R.since >= COUNTDOWN) Object.assign(R, { phase: 'racing', since: t });
      break;
    }
    case 'racing': {
      if (!active || offCourse(R.track, local) > STRAY) {
        Object.assign(R, { phase: 'cancelled', since: t });
        break;
      }
      R.time = t - R.since;
      const gate = R.track.gates[R.next] as Vec3;
      if (Math.hypot(local[0] - gate[0], local[1] - gate[1], local[2] - gate[2]) < PASS_R) {
        R.next++;
        if (R.next >= R.track.gates.length) {
          const L = trackLength(R.track);
          const ahead = RIVAL_SPEED.filter((v) => v * R.time >= L).length;
          R.place = 1 + ahead;
          if (R.best === null || R.time < R.best) {
            R.best = R.time;
            writeBest(R.track, R.time);
          }
          // The reward: a race won lights its district on the plan from above.
          if (R.place === 1) litDistricts.add(R.track.district);
          Object.assign(R, { phase: 'finished', since: t });
        }
      }
      for (const b of R.track.bars) {
        const [a, c] = barEnds(b, t);
        if (segDist(local, a, c) < 0.9 && t - R.lastHit > 1) {
          R.lastHit = t;
          R.hitUntil = t + 1;
        }
      }
      break;
    }
    case 'finished':
      if (t - R.since > FINISH_SHOW) R.phase = 'idle';
      break;
    default:
      if (t - R.since > CANCEL_SHOW) R.phase = 'idle';
  }
  let hold: { c: Vec3; f: Vec3 } | null = null;
  if (R.phase === 'countdown') {
    const s = R.track.start;
    const g = R.track.gates[0] as Vec3;
    const d = Math.hypot(g[0] - s[0], g[1] - s[1], g[2] - s[2]) || 1;
    hold = {
      c: [s[0] + R.ox, s[1], s[2] + R.oz],
      f: [(g[0] - s[0]) / d, (g[1] - s[1]) / d, (g[2] - s[2]) / d],
    };
  }
  return { hold, pace: R.phase === 'racing' && t < R.hitUntil ? 0.35 : 1 };
}
/** Lets go of any race (a jump in time, the piece picked again). */
export function resetRace() {
  race.phase = 'idle';
}

const clock = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
};
const ORD = ['1st', '2nd', '3rd', '4th'];
/** The race's quiet words for the screen now, or none. */
export function raceBanner(t: number): string | null {
  const R = race;
  switch (R.phase) {
    case 'prompt':
      return `${R.track.name} · Start the race? Enter`;
    case 'countdown': {
      const left = COUNTDOWN - (t - R.since);
      return left > 0 ? String(Math.ceil(left)) : 'Go';
    }
    case 'racing':
      return `Gate ${Math.min(R.next + 1, R.track.gates.length)}/${R.track.gates.length} · ${clock(R.time)}`;
    case 'finished':
      return `${ORD[R.place - 1] ?? `${R.place}th`} · ${clock(R.time)}${R.best !== null ? ` · best ${clock(R.best)}` : ''}`;
    case 'cancelled':
      return 'Race off';
    default:
      return null;
  }
}

/** Rival j, while a race is on: where it is and which way it flies (world), or none. */
export function rival(j: number, t: number): { c: Vec3; f: Vec3 } | null {
  const R = race;
  if (R.phase !== 'countdown' && R.phase !== 'racing' && R.phase !== 'finished') return null;
  const run =
    R.phase === 'countdown'
      ? 0
      : Math.max(0, R.phase === 'racing' ? t - R.since : R.time + (t - R.since));
  const v = RIVAL_SPEED[j] ?? 11;
  const s = Math.min(trackLength(R.track), v * run * (1 + 0.04 * Math.sin(t * 0.7 + j)));
  const a = courseAt(R.track, s);
  // Side by side at the start, then each on its own line.
  const side: Vec3 = [-a.f[2], 0, a.f[0]];
  const off = (j - 1) * 1.8 * (1 - Math.min(1, s / 40)) + 0.6 * Math.sin(s * 0.08 + j);
  return {
    c: [a.c[0] + R.ox + side[0] * off, a.c[1] + 0.4 * j, a.c[2] + R.oz + side[2] * off],
    f: a.f,
  };
}

/** The track near the eye, drawn: its moon gates (the next brightest), bars, and its start. */
export function trackItems(eye: Vec3, t: number, R: number): Item[] {
  const out: Item[] = [];
  for (const track of TRACKS) {
    const racing = race.phase !== 'idle' && race.track === track;
    const ox = racing ? race.ox : nearest(0, eye[0] - track.start[0], TILE_X);
    const oz = racing ? race.oz : nearest(0, eye[2] - track.start[2], TILE_Z);
    const P = [track.start, ...track.gates];
    P.forEach((g, i) => {
      const c: Vec3 = [g[0] + ox, g[1], g[2] + oz];
      const d = Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) - GATE_R;
      if (d > R) return;
      const next = P[Math.min(P.length - 1, i + 1)] as Vec3;
      const prev = P[Math.max(0, i - 1)] as Vec3;
      const fx = next[0] - prev[0];
      const fz = next[2] - prev[2];
      const fl = Math.hypot(fx, fz) || 1;
      const gate = i - 1;
      const isNext = racing && race.phase === 'racing' && gate === race.next;
      const passed =
        racing &&
        (race.phase === 'racing' || race.phase === 'finished') &&
        gate >= 0 &&
        gate < race.next;
      const tone: RGB = i === 0 ? C.gold : track.full ? C.red : C.violet;
      const k = isNext ? 0.75 : passed ? 0.12 : track.full ? 0.36 : 0.22;
      out.push({
        d: Math.max(0, d),
        gid: mixId(Math.round(oz / TILE_Z) * 97 + i, 3000 + TRACKS.indexOf(track)),
        count: 64,
        weight: 3,
        probe: [c],
        site: (s, o) => {
          const a = ((s + 0.5) / 64) * TAU;
          const r = GATE_R + (s % 2 ? 0.25 : 0);
          const ca = Math.cos(a) * r;
          o[0] = c[0] + (-fz / fl) * ca;
          o[1] = c[1] + Math.sin(a) * r;
          o[2] = c[2] + (fx / fl) * ca;
          const breathe = isNext ? 0.8 + 0.2 * Math.sin(t * 2) : 1;
          [o[3], o[4], o[5]] = scale(tone, k * breathe);
          return true;
        },
      });
    });
    track.bars.forEach((b, i) => {
      const c: Vec3 = [b.at[0] + ox, b.at[1], b.at[2] + oz];
      const d = Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) - b.half;
      if (d > R) return;
      out.push({
        d: Math.max(0, d),
        gid: mixId(Math.round(oz / TILE_Z) * 89 + i, 3500),
        count: 40,
        weight: 3,
        probe: [c],
        site: (s, o) => {
          const [a, e] = barEnds(b, t);
          const u = (s + 0.5) / 40;
          o[0] = lerp(a[0], e[0], u) + ox;
          o[1] = lerp(a[1], e[1], u);
          o[2] = lerp(a[2], e[2], u) + oz;
          const hit = racing && t < race.hitUntil;
          [o[3], o[4], o[5]] = scale(hit ? C.amber : wrap(s, 6) < 3 ? C.amber : C.red, 0.45);
          return true;
        },
      });
    });
  }
  return out;
}
