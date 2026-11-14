/*
 * Fireworks over the City of Dreams (docs/specs/art-city.md, "Taller landmarks and fireworks"):
 * now and then, over a landmark, a big square, a canal or the river, a shell rises from the roofs
 * and blooms into a sphere or a peony of grains in its quarter's colours, which drift outward,
 * fall slowly and fade over two to three seconds. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "also add fireworks in some places above the city they pop at random. in the colours
 * of the quarter."
 *
 * Random, but only from the time and each place's own number, so the same moment always shows
 * the same bursts (and tests are stable). Mellow, as all the City's light: the burst blooms in
 * over 0.4 s and fades softly, never white, never a flash; each spark is a grain no brighter than
 * a lit window, so nothing lights the screen. A burst that would bloom into a flying station or a
 * ring of the parcours (lib/city-skyport.ts) stays unlit: the sky's architecture is never lost in one.
 */

import { fibonacciSphere, hash, type RGB, smooth, type Vec3 } from './bigbang';
import { BIG_SQUARES, bigHeight, copiesNear } from './city-big';
import { DISTRICTS, districtAt, LANDMARKS } from './city-game';
import { BLOCK_X, BLOCK_Z, C, GROUND, type Item, mix, mixId, scale } from './city-grid';
import { crownKey, landmarkHeight } from './city-landmarks';
import { RIVER_Z } from './city-rain';
import { burstClear } from './city-skyport';

/** How high the shells burst: never under this (over every roof), never over the top. */
export const BURST_LOW = GROUND + 200;
export const BURST_HIGH = GROUND + 420;
/** A shell's climb, and a burst's life once it blooms (seconds). */
export const RISE = 1.6;
export const LIFE_MIN = 2.2;
export const LIFE_MAX = 3;
/** Sparks in one burst (each drawn with a fainter grain behind it, its trail), and the shell's grains. */
export const SPARKS = 140;
const SHELL = 6;
/** At most this many bursts drawn at once: the nearest. */
export const MAX_BURSTS = 8;

export type FireworkPlace = { x: number; z: number; floor: number; colour: RGB };
let places: FireworkPlace[] | null = null;

/** The places shells go up from, tile-local: every landmark and big square, the canals, the river. */
export function fireworkPlaces(): FireworkPlace[] {
  if (places) return places;
  const colourAt = (x: number, z: number) => DISTRICTS[districtAt(x, z)].colour;
  const list: FireworkPlace[] = [];
  for (const L of LANDMARKS) {
    const key = crownKey(L.kind, L.set);
    const top = key ? landmarkHeight(key) : L.kind === 'spire' ? landmarkHeight('spire') : 60;
    list.push({ x: L.x, z: L.z, floor: GROUND + top + 60, colour: DISTRICTS[L.d].colour });
  }
  for (const q of BIG_SQUARES) {
    const x = q.x + (q.x > 0 ? 1 : -1);
    list.push({ x: q.x, z: q.z, floor: GROUND + bigHeight(q) + 60, colour: colourAt(x, q.z + 1) });
  }
  // Over the canals (the Canals' three cross streets, under them), and either side of the river.
  for (const row of [18, 20, 22])
    list.push({ x: 4 * BLOCK_X, z: row * BLOCK_Z, floor: 0, colour: DISTRICTS.canals.colour });
  for (const side of [-1, 1])
    list.push({
      x: side * 2 * BLOCK_X,
      z: RIVER_Z,
      floor: 0,
      colour: colourAt(side * 2 * BLOCK_X, RIVER_Z + 1),
    });
  places = list;
  return list;
}

export type Burst = {
  /** Its place and number, its own key. */
  key: number;
  /** Where it blooms, and from where its shell rises. */
  c: Vec3;
  /** When its shell leaves the roofs. */
  t0: number;
  life: number;
  /** How far its sparks fly out. */
  r: number;
  peony: boolean;
  colour: RGB;
};

/** Each place's own rhythm: a slot every 9 to 15 seconds, about half of them with a shell. */
const period = (p: number) => 9 + 6 * hash(p, 811);
const phase = (p: number) => 20 * hash(p, 812);
const SHARE = 0.5;

/** Place p's burst in slot k, if it has one (tile copy n gives it its own randomness). */
function burstOf(
  P: FireworkPlace,
  p: number,
  k: number,
  x: number,
  z: number,
  n: number,
): Burst | null {
  const id = p * 7919 + k * 31 + n * 104729;
  if (hash(id, 813) >= SHARE) return null;
  const per = period(p);
  const life = LIFE_MIN + (LIFE_MAX - LIFE_MIN) * hash(id, 814);
  const t0 = phase(p) + k * per + (per - RISE - life) * hash(id, 815);
  const low = Math.max(BURST_LOW, P.floor);
  const y = Math.min(BURST_HIGH - 30, low + 60 * hash(id, 816));
  return {
    key: mixId(id, 9393),
    c: [x + 24 * (hash(id, 817) - 0.5), y, z + 24 * (hash(id, 818) - 0.5)],
    t0,
    life,
    r: 18 + 12 * hash(id, 819),
    peony: hash(id, 820) < 0.5,
    colour: P.colour,
  };
}

/** The bursts alive at time t (rising or blooming) within R of the eye, the nearest first. */
export function burstsAt(t: number, eye: Vec3, R: number): Burst[] {
  const out: Burst[] = [];
  fireworkPlaces().forEach((P, p) => {
    copiesNear(P.x, P.z, eye, R, (x, z, n) => {
      const k = Math.floor((t - phase(p)) / period(p));
      const b = burstOf(P, p, k, x, z, n);
      if (!b) return;
      const age = t - b.t0;
      if (age < 0 || age >= RISE + b.life) return;
      if (!burstClear(b.c, b.r)) return;
      if (Math.hypot(b.c[0] - eye[0], b.c[1] - eye[1], b.c[2] - eye[2]) > R) return;
      out.push(b);
    });
  });
  const dist = (b: Burst) => Math.hypot(b.c[0] - eye[0], b.c[1] - eye[1], b.c[2] - eye[2]);
  return out.sort((a, b) => dist(a) - dist(b)).slice(0, MAX_BURSTS);
}

/** A burst's three shades: its quarter's colour, a lighter and a deeper one (never white). */
export function shades(c: RGB): [RGB, RGB, RGB] {
  return [c, mix(c, C.warm, 0.4), scale(mix(c, C.violet, 0.2), 0.75)];
}

/** How bright a burst's sparks are, `tb` seconds after it blooms: in over 0.4 s, out to 0 at its end. */
export const bloomAt = (tb: number, life: number) =>
  tb < 0 || tb >= life ? 0 : smooth(tb / 0.4) * (1 - tb / life) ** 1.5;

/**
 * Site s of burst b at time t: sparks (and their trails) once it blooms, the shell's few grains
 * while it rises. False when there is nothing there now.
 */
export function burstSite(b: Burst, s: number, t: number, o: number[]): boolean {
  const age = t - b.t0;
  const [main, light, deep] = shades(b.colour);
  if (s >= 2 * SPARKS) {
    // The shell, rising from the roofs and slowing as it nears its height.
    if (age < 0 || age >= RISE) return false;
    const j = s - 2 * SPARKS;
    const q = Math.max(0, age - j * 0.05) / RISE;
    const y = BURST_LOW - 100 + (b.c[1] - BURST_LOW + 100) * (1 - (1 - q) ** 2);
    o[0] = b.c[0];
    o[1] = y;
    o[2] = b.c[2];
    [o[3], o[4], o[5]] = scale(
      mix(light, C.amber, 0.3),
      0.32 * (1 - j / SHELL) * smooth(age / 0.2),
    );
    return true;
  }
  const trail = s >= SPARKS;
  const i = trail ? s - SPARKS : s;
  const tb = age - RISE - (trail ? 0.15 : 0);
  const k = bloomAt(tb, b.life);
  if (k <= 0) return false;
  const d = fibonacciSphere(i, SPARKS);
  // A peony throws its sparks out unevenly, fuller; a sphere evenly.
  const sp = b.peony ? 0.7 + 0.3 * hash(i, b.key % 977) : 1;
  const out = b.r * sp * (1 - Math.exp(-2.2 * tb));
  o[0] = b.c[0] + d[0] * out;
  o[1] = b.c[1] + d[1] * out - 2.6 * tb * tb;
  o[2] = b.c[2] + d[2] * out;
  const tone = b.peony
    ? sp > 0.9
      ? light
      : i % 2
        ? main
        : deep
    : ([main, light, deep][i % 3] as RGB);
  [o[3], o[4], o[5]] = scale(tone, 0.5 * k * (trail ? 0.45 : 1));
  return true;
}

/** The fireworks within sight, as the Ship's items: a modest budget, a few hundred grains a burst. */
export function fireworkItems(eye: Vec3, t: number, R: number): Item[] {
  return burstsAt(t, eye, R).map((b) => ({
    d: Math.max(0, Math.hypot(b.c[0] - eye[0], b.c[1] - eye[1], b.c[2] - eye[2]) - b.r),
    gid: b.key,
    count: 2 * SPARKS + SHELL,
    weight: 1.6,
    site: (s, o) => burstSite(b, s, t, o),
  }));
}
