/*
 * The Matrix quarter of the City of Dreams (docs/specs/art-city.md, "Matrix quarter and Neon
 * Market"): the quarter that was the Green Code, come alive. Pure: no three.js, no DOM, and nothing
 * from lib/city-game.ts (which hands the towers in), so there is no cycle.
 *
 * 2026-11-14: "matrix quarter ... always green. buildings rising and sinking, some towers blink,
 * running lights giving a feeling of speed. the first buildings at the edge round tubes you can
 * spin around, deeper in more rigid and square. playful and interactive."
 *
 * - Its form follows the row's distance from the quarter's entry edge (matrixForm): the entrance
 *   rows stand round tubes, the next octagons, the rows deeper in square blocks. The avenue's own
 *   towers stay square (its bridges and galleries hang on their faces).
 * - Some towers blink (blinkLevel): a soft, eased swell down and up again on a one-and-a-quarter
 *   to two second rhythm, each tower on its own phase. Never a strobe, never fully dark.
 * - Running lights (runOf, runHead): streaks of green racing up, down or round each tower, one
 *   way per tower, bright heads with fading tails, like falling code and pulses up the edges.
 * - Play: the streaks brighten and stretch as the ship passes close (matrixBoost), cheaply, from
 *   the ship's place alone.
 *
 * Green only: every light here is a mix of the quarter's three greens (lib/city-code.ts).
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import {
  CODE_DEEP,
  CODE_GREEN,
  CODE_MINT,
  CODE_TEMPO,
  codeTowerItem,
  rainLight,
} from './city-code';
import { beat, frac, GROUND, type Item, mixId, TAU, TILE_I, TILE_J, wrap } from './city-grid';

const G = GROUND;

/* ---------- the plan: forms by depth ---------- */

/** The quarter's rows in the tile: the plan's seventh band (lib/city-game.ts BANDS). */
export const MATRIX_J0 = 48;
export const MATRIX_ROWS = 8;

/**
 * How far row J is from the quarter's nearer entry edge: 0 for the entrance rows (the market's
 * side and the next tile's Chinatown side), up to 3 in the middle; -1 outside the quarter.
 */
export function matrixDepth(J: number): number {
  const r = wrap(J, TILE_J) - MATRIX_J0;
  if (r < 0 || r >= MATRIX_ROWS) return -1;
  return Math.min(r, MATRIX_ROWS - 1 - r);
}

export type MatrixForm = 'round' | 'octagon' | 'square';
/** How many sides a form has: none for the round tubes. */
export const FORM_SIDES: Record<MatrixForm, number> = { round: 0, octagon: 8, square: 4 };

/** A tower's form from its block: round at the entrance, octagonal next, square deeper in. */
export function matrixForm(I: number, J: number): MatrixForm {
  const li = wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
  if (li === 0 || li === -1) return 'square';
  const d = matrixDepth(J);
  return d === 0 ? 'round' : d === 1 ? 'octagon' : 'square';
}

const OCT = Math.SQRT2;
/**
 * Whether (dx, dz) off a tower's middle is inside its footprint, `m` round it: a circle of radius
 * hx for a round tube, an octagon of apothem hx, else the box.
 */
export function matrixHolds(
  form: MatrixForm,
  dx: number,
  dz: number,
  hx: number,
  hz: number,
  m: number,
): boolean {
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  if (form === 'round') return ax * ax + az * az < (hx + m) * (hx + m);
  if (form === 'octagon') {
    const a = hx + m;
    return ax < a && az < a && ax + az < a * OCT;
  }
  return ax < hx + m && az < hz + m;
}

/* ---------- the outline: a point round a tower ---------- */

/** The outline's length round a tower of form `form`. */
export function perimeter(form: MatrixForm, hx: number, hz: number): number {
  if (form === 'round') return TAU * hx;
  if (form === 'octagon') return 8 * 2 * hx * Math.tan(Math.PI / 8);
  return 4 * (hx + hz);
}

/**
 * The point `u` (0..1) of the way round a tower's outline, written into `o`: its offset from the
 * middle (o[0], o[1] as x, z) and its outward normal (o[2], o[3]). No allocation.
 */
export function outline(form: MatrixForm, hx: number, hz: number, u: number, o: number[]) {
  const v = frac(u);
  if (form === 'round') {
    const a = v * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    o[0] = hx * c;
    o[1] = hx * s;
    o[2] = c;
    o[3] = s;
    return;
  }
  if (form === 'octagon') {
    // Faces square to the axes and the diagonals, each `hx` from the middle.
    const f = v * 8;
    const k = Math.floor(f);
    const w = f - k;
    const R = hx / Math.cos(Math.PI / 8);
    const a0 = ((k - 0.5) * Math.PI) / 4;
    const a1 = ((k + 0.5) * Math.PI) / 4;
    o[0] = R * (Math.cos(a0) + (Math.cos(a1) - Math.cos(a0)) * w);
    o[1] = R * (Math.sin(a0) + (Math.sin(a1) - Math.sin(a0)) * w);
    o[2] = Math.cos((k * Math.PI) / 4);
    o[3] = Math.sin((k * Math.PI) / 4);
    return;
  }
  const P = 4 * (hx + hz);
  const e = v * P;
  if (e < 2 * hx) {
    o[0] = -hx + e;
    o[1] = -hz;
    o[2] = 0;
    o[3] = -1;
  } else if (e < 2 * hx + 2 * hz) {
    o[0] = hx;
    o[1] = -hz + (e - 2 * hx);
    o[2] = 1;
    o[3] = 0;
  } else if (e < 4 * hx + 2 * hz) {
    o[0] = hx - (e - 2 * hx - 2 * hz);
    o[1] = hz;
    o[2] = 0;
    o[3] = 1;
  } else {
    o[0] = -hx;
    o[1] = hz - (e - 4 * hx - 2 * hz);
    o[2] = -1;
    o[3] = 0;
  }
}

/** Where the outline turns a corner: the ribs up a tower (u of each), or evenly round a tube. */
export function ribsOf(form: MatrixForm, hx: number, hz: number): number[] {
  if (form === 'round') return Array.from({ length: ROUND_RIBS }, (_, i) => i / ROUND_RIBS);
  if (form === 'octagon') return Array.from({ length: 8 }, (_, i) => i / 8);
  const P = 4 * (hx + hz);
  return [0, (2 * hx) / P, (2 * hx + 2 * hz) / P, (4 * hx + 2 * hz) / P];
}
const ROUND_RIBS = 12;

/* ---------- blinking ---------- */

/** How many towers blink: about three in ten. */
export const BLINK_SHARE = 0.3;
/** The shortest and longest blink, in seconds. */
export const BLINK_MIN = 1.25;
export const BLINK_MAX = 2;
/** How dim a blinking tower goes at the bottom of its blink: never dark. */
export const BLINK_LOW = 0.18;

/** A tower's blink from its block's number: none for most. */
export function blinkOf(k: number): { period: number; phase: number } | null {
  if (hash(k, 771) >= BLINK_SHARE) return null;
  return { period: BLINK_MIN + (BLINK_MAX - BLINK_MIN) * hash(k, 772), phase: hash(k, 773) };
}

/** How lit a tower is now, BLINK_LOW..1: 1 always for one that does not blink; eased, never a jump. */
export function blinkLevel(k: number, t: number): number {
  const b = blinkOf(k);
  if (!b) return 1;
  const s = 0.5 + 0.5 * Math.cos(TAU * (t / b.period + b.phase));
  // Eased twice: it lingers lit and lingers dim, and swells softly between.
  const e = smooth(smooth(s));
  return BLINK_LOW + (1 - BLINK_LOW) * e;
}

/* ---------- running lights ---------- */

export type RunMode = 'up' | 'down' | 'around';
export type Run = {
  mode: RunMode;
  /** For 'around': which way round (1 or -1). */
  way: 1 | -1;
  /** Units a second: fast, for the feeling of speed. */
  speed: number;
  phase: number;
};
/** How many samples a streak has, head to tail, and their spacing. */
export const STREAK = 16;
export const STREAK_GAP = 0.55;
/** The heights, as shares of a tower's, of the streaks that run round it. */
export const AROUND_AT = [0.22, 0.52, 0.82];

/** A tower's running lights from its block's number: one way for all its streaks. */
export function runOf(k: number): Run {
  const m = hash(k, 781);
  return {
    mode: m < 0.42 ? 'up' : m < 0.8 ? 'down' : 'around',
    way: hash(k, 782) < 0.5 ? 1 : -1,
    speed: 26 + 22 * hash(k, 783),
    phase: hash(k, 784),
  };
}

/**
 * Where streak `lane` of a tower's runs has its head now, along a track of length `len` (the
 * tower's height for 'up' and 'down', its outline for 'around'): from a little before the start
 * to past the end, always the same way. Smooth in t: the head never jumps but where it comes
 * round, out of sight, past the end.
 */
export function runHead(run: Run, lane: number, len: number, t: number): number {
  const L = len + STREAK * STREAK_GAP * 2 + 8;
  const ph = run.phase + hash(lane * 31 + 7, 785);
  return frac((run.speed * t) / L + ph) * L - 4;
}

/**
 * How near the ship is, 0..1: 1 against the tower's wall, nothing 30 off (or 40 over its roof).
 * The streaks brighten and stretch with it.
 */
export function matrixBoost(
  x: number,
  z: number,
  r: number,
  h: number,
  ship: Vec3 | undefined,
): number {
  if (!ship) return 0;
  const side = Math.max(0, Math.hypot(ship[0] - x, ship[2] - z) - r);
  const over = Math.max(0, ship[1] - (G + h));
  return smooth(1 - side / 30) * smooth(1 - over / 40);
}

/* ---------- the colours: green only ---------- */

const put = (o: number[], c: RGB, k: number) => {
  o[3] = c[0] * k;
  o[4] = c[1] * k;
  o[5] = c[2] * k;
};
const putMix = (o: number[], a: RGB, b: RGB, u: number, k: number) => {
  o[3] = (a[0] + (b[0] - a[0]) * u) * k;
  o[4] = (a[1] + (b[1] - a[1]) * u) * k;
  o[5] = (a[2] + (b[2] - a[2]) * u) * k;
};

/** What a Matrix tower needs: its place, size, height now, and its block's number. */
export type MatrixTower = { x: number; z: number; hx: number; hz: number; h: number; k: number };

/**
 * The running lights' sites: `lanes` streaks of STREAK samples each. Writes site s into o and
 * says whether it is lit. `P` is a scratch for the outline.
 */
function runSite(
  tw: MatrixTower,
  form: MatrixForm,
  run: Run,
  lanes: number[],
  boost: number,
  t: number,
  s: number,
  o: number[],
  P: number[],
): boolean {
  const { x, z, hx, hz, h } = tw;
  const lane = Math.floor(s / STREAK);
  const j = s % STREAK;
  const gap = STREAK_GAP * (1 + 0.8 * boost);
  const out = 0.22;
  if (run.mode === 'around') {
    const len = perimeter(form, hx, hz);
    const head = runHead(run, lane, len, t) - j * gap;
    if (head < 0 || head > len) return false;
    const y = G + h * (AROUND_AT[lane % AROUND_AT.length] as number);
    outline(form, hx, hz, (run.way * head) / len, P);
    o[0] = x + (P[0] as number) + (P[2] as number) * out;
    o[1] = y;
    o[2] = z + (P[1] as number) + (P[3] as number) * out;
  } else {
    const travel = runHead(run, lane, h, t) - j * gap;
    if (travel < 0 || travel > h) return false;
    outline(form, hx, hz, lanes[lane] as number, P);
    o[0] = x + (P[0] as number) + (P[2] as number) * out;
    o[1] = run.mode === 'up' ? G + travel : G + h - travel;
    o[2] = z + (P[1] as number) + (P[3] as number) * out;
  }
  const tail = (1 - j / STREAK) ** 1.5;
  const k = tail * (0.42 + 0.5 * boost);
  if (j < 2) put(o, CODE_MINT, k * 1.1);
  else putMix(o, CODE_GREEN, CODE_MINT, 0.3 * boost, k);
  return true;
}

/** The tracks the running lights take up a tower: its ribs, and on a square the middle of each face. */
function lanesOf(form: MatrixForm, hx: number, hz: number, run: Run): number[] {
  if (run.mode === 'around') return AROUND_AT.map((_, i) => i);
  if (form === 'square') {
    const r = ribsOf(form, hx, hz);
    const P = 4 * (hx + hz);
    return [...r, hx / P, (2 * hx + hz) / P, (3 * hx + 2 * hz) / P, (4 * hx + 3 * hz) / P];
  }
  const r = ribsOf(form, hx, hz);
  // On a tube, every other rib: six streaks, the octagon's eight corners all.
  return form === 'round' ? r.filter((_, i) => i % 2 === 0) : r;
}

/* ---------- a Matrix tower ---------- */

/** Ring spacing up a round tube, and the octagon's floor bands. */
const RING_GAP = 7;
const BAND_GAP = 9;

/**
 * A Matrix tower: its form by its depth in the quarter, the falling code on the side toward the
 * eye, its blink if it has one, and its running lights, brighter as the ship comes close.
 * A square tower keeps the code tower (lib/city-code.ts codeTowerItem) under these.
 */
export function matrixTowerItem(
  tw: MatrixTower,
  form: MatrixForm,
  eye: Vec3,
  t: number,
  d: number,
  ship?: Vec3,
): Item {
  const run = runOf(tw.k);
  const lanes = lanesOf(form, tw.hx, tw.hz, run);
  const runs = lanes.length * STREAK;
  const boost = matrixBoost(tw.x, tw.z, Math.max(tw.hx, tw.hz), tw.h, ship);
  const blink = blinkLevel(tw.k, t);
  const P = [0, 0, 0, 0];
  if (form === 'square') {
    const base = codeTowerItem(tw, eye, t, d);
    const n = base.count;
    return {
      ...base,
      count: n + runs,
      site: (s, o) => {
        if (s >= n) return runSite(tw, form, run, lanes, boost, t, s - n, o, P);
        if (!base.site(s, o)) return false;
        o[3] = (o[3] as number) * blink;
        o[4] = (o[4] as number) * blink;
        o[5] = (o[5] as number) * blink;
        return true;
      },
    };
  }
  return tubeItem(tw, form, eye, t, d, run, lanes, boost, blink, P);
}

/** A round or octagonal tower: ribs, rings or floor bands, its rim, its kerb, the code, the runs. */
function tubeItem(
  tw: MatrixTower,
  form: MatrixForm,
  eye: Vec3,
  t: number,
  d: number,
  run: Run,
  lanes: number[],
  boost: number,
  blink: number,
  P: number[],
): Item {
  const { x, z, hx, h, k } = tw;
  const r = hx;
  const per = perimeter(form, r, r);
  const ribs = ribsOf(form, r, r);
  const ribN = Math.ceil(h / 0.7);
  const ringGap = form === 'round' ? RING_GAP : BAND_GAP;
  const rings = Math.max(0, Math.floor(h / ringGap));
  const ringN = Math.ceil(per / 0.6);
  const rimN = Math.ceil(per / 0.4);
  const kerbN = Math.ceil(perimeter(form, r + 1.5, r + 1.5) / 0.7);
  // The code: columns round the outline, those turned toward the eye.
  const cols = Math.max(8, Math.floor(per / 1.25));
  const rows = Math.max(2, Math.floor(h / 1.15));
  const ch = h / rows;
  const seen: number[] = [];
  for (let c = 0; c < cols; c++) {
    outline(form, r, r, (c + 0.5) / cols, P);
    const px = x + (P[0] as number);
    const pz = z + (P[1] as number);
    if ((eye[0] - px) * (P[2] as number) + (eye[2] - pz) * (P[3] as number) > 0.05) seen.push(c);
  }
  const pulse = 0.85 + 0.15 * beat(t, CODE_TEMPO, (k % 7) * 0.05);
  const glow = pulse * blink;
  const n0 = ribs.length * ribN;
  const n1 = n0 + rings * ringN;
  const n2 = n1 + rimN;
  const n3 = n2 + kerbN;
  const n4 = n3 + seen.length * rows;
  return {
    d,
    gid: mixId(k, 7402),
    count: n4 + lanes.length * STREAK,
    weight: 1.3,
    probe: [
      [x, G + h, z],
      [x + r, G + h * 0.5, z],
      [x - r, G + h * 0.5, z],
      [x, G + h * 0.5, z + r],
      [x, G + h * 0.5, z - r],
    ],
    site: (s, o) => {
      if (s < n0) {
        // The ribs: up the tube evenly, up the octagon's corners.
        outline(form, r, r, ribs[s % ribs.length] as number, P);
        o[0] = x + (P[0] as number);
        o[1] = G + ((Math.floor(s / ribs.length) + 0.5) * h) / ribN;
        o[2] = z + (P[1] as number);
        put(o, CODE_DEEP, 0.6 * glow);
        return true;
      }
      if (s < n1) {
        // Rings round the tube (the octagon's floor bands), faint.
        const q = s - n0;
        const ring = Math.floor(q / ringN);
        outline(form, r, r, ((q % ringN) + 0.5) / ringN, P);
        o[0] = x + (P[0] as number);
        o[1] = G + (ring + 1) * ringGap;
        o[2] = z + (P[1] as number);
        put(o, CODE_DEEP, 0.42 * glow);
        return true;
      }
      if (s < n2) {
        outline(form, r, r, (s - n1 + 0.5) / rimN, P);
        o[0] = x + (P[0] as number);
        o[1] = G + h;
        o[2] = z + (P[1] as number);
        put(o, CODE_GREEN, 0.4 * glow);
        return true;
      }
      if (s < n3) {
        // The kerb round its foot, lit green, a soft lamp every few steps (it does not blink).
        const q = s - n2;
        outline(form, r + 1.5, r + 1.5, (q + 0.5) / kerbN, P);
        o[0] = x + (P[0] as number);
        o[1] = G + 0.03;
        o[2] = z + (P[1] as number);
        const lamp = q % 9 === 0;
        put(o, lamp ? CODE_MINT : CODE_GREEN, lamp ? 0.42 : 0.16);
        return true;
      }
      if (s < n4) {
        const q = s - n3;
        const col = seen[q % seen.length] as number;
        const row = Math.floor(q / seen.length);
        const b = rainLight(mixId(k, 97 + col), row, rows, t);
        if (b < 0.04) return false;
        outline(form, r, r, (col + 0.5) / cols, P);
        o[0] = x + (P[0] as number) + (P[2] as number) * 0.12;
        o[1] = G + h - (row + 0.5) * ch;
        o[2] = z + (P[1] as number) + (P[3] as number) * 0.12;
        const kk = (0.12 + 0.5 * b) * glow;
        if (b > 0.86) put(o, CODE_MINT, kk);
        else putMix(o, CODE_DEEP, CODE_GREEN, Math.min(1, b * 1.3), kk);
        return true;
      }
      return runSite(tw, form, run, lanes, boost, t, s - n4, o, P);
    },
  };
}
