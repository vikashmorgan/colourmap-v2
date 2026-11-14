/*
 * Chinatown's sky (docs/specs/art-city.md, "Life in the city"): paper lanterns flying up over its
 * roofs, and jellyfish of light floating among them. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "above chinatown add flying lampions and jelly fish". Our own designs:
 * - A flying lantern is a small paper lantern, a little wider at the top than at its open foot, a
 *   warm flame in it: red to amber paper, glowing softly (a slow breath, never a flicker). Each
 *   rises slowly from a little over the roofs under it (eight over the highest within a block,
 *   seventy over the street at least), swaying as it goes, fading in as it starts and out at the
 *   top of its climb, then comes round again: always some at every height.
 * - A jellyfish of light is a translucent bell with a brighter rim, eight trailing tendrils and four
 *   frilled arms, floating higher, among and over the lanterns; its bell pulses slowly and softly,
 *   the tendrils swaying behind. Each leans slowly round rose, amber and soft violet, a minute or so
 *   from one to the next (the user's standing wish: colours drift, nothing flashes).
 * Every place is a formula of the lantern's number and the time.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { BAND_ROWS, blockTower, districtAt, viewAt } from './city-game';
import {
  BLOCK_X,
  BLOCK_Z,
  C,
  frac,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';

/** How far Chinatown runs along the avenue, from the start of each tile. */
const CT_LEN = BAND_ROWS * BLOCK_Z;

/** The lowest any of them flies: over Chinatown's grand pagoda and tallest roofs nearby. */
export const LANTERN_FLOOR = GROUND + 70;
/** How far over the highest roof round it a lantern starts, a jellyfish floats. */
export const LANTERN_CLEAR = 8;
export const JELLY_CLEAR = 16;
/** How high a lantern climbs before it fades. */
const LANTERN_SPAN = 90;

/** The highest roof on the blocks round (x, z): the one it is over and its eight neighbours. */
export function roofAround(x: number, z: number): number {
  const I = Math.floor(x / BLOCK_X);
  const J = Math.floor(z / BLOCK_Z);
  let top = GROUND;
  for (let i = I - 1; i <= I + 1; i++)
    for (let j = J - 1; j <= J + 1; j++) top = Math.max(top, GROUND + blockTower(i, j).h);
  return top;
}

const roofCache = new Map<number, number>();
/** The floor a lantern or jellyfish keeps over its home, found once for each. */
function floorOver(key: number, x: number, z: number, clear: number): number {
  const had = roofCache.get(key);
  if (had !== undefined) return had;
  const y = Math.max(LANTERN_FLOOR, roofAround(x, z) + clear);
  if (roofCache.size > 4000) roofCache.clear();
  roofCache.set(key, y);
  return y;
}

/**
 * Where a lantern or jellyfish of Chinatown's stretch n has its home, `ox` the tile's x, `m` kept in
 * from the stretch's ends so all its drift stays over Chinatown.
 */
function home(n: number, j: number, salt: number, ox: number, m: number): [number, number] {
  return [
    ox + (hash(j, salt) - 0.5) * (TILE_X - 24),
    n * TILE_Z + m + hash(j, salt + 1) * (CT_LEN - 2 * m),
  ];
}

/* ---------- flying lanterns ---------- */

export const FLY_LANTERNS = 64;
const LANTERN_SITES = 22;

/**
 * Flying lantern j of Chinatown's stretch n (tile index), in the tile whose x is `ox`, at time t:
 * its middle, how far it has faded in (0..1), and its own number.
 */
export function flyingLantern(n: number, j: number, t: number, ox = 0): { c: Vec3; k: number } {
  const [hx, hz] = home(n, j, 801, ox, 8);
  const base = floorOver(mixId(n * 4099 + j, 811), hx, hz, LANTERN_CLEAR);
  const speed = 0.35 + 0.3 * hash(j, 803);
  const rise = wrap(t * speed + hash(j, 804) * LANTERN_SPAN, LANTERN_SPAN);
  return {
    c: [
      hx + 1.6 * Math.sin(t * 0.13 + j * 1.7),
      base + rise,
      hz + 1.2 * Math.sin(t * 0.11 + j * 2.3),
    ],
    k: smooth(rise / 12) * smooth((LANTERN_SPAN - rise) / 25),
  };
}

/** A lantern's paper colour: red to amber, its own. */
export const lanternPaper = (j: number): RGB => mix(C.red, C.amber, 0.2 + 0.4 * hash(j, 805));

/** Site s of flying lantern j at c: its paper body, the flame inside, the rim of its open foot. */
function lanternSite(c: Vec3, j: number, k: number, s: number, t: number, o: number[]): boolean {
  const breath = 0.85 + 0.15 * Math.sin(t * 0.5 + j * 1.3);
  if (s < 16) {
    // The paper: a ball a little taller than wide, wider at the top than at its foot.
    const y = 1 - (2 * (s + 0.5)) / 16;
    const a = s * 2.399963;
    const r = Math.sqrt(1 - y * y) * (0.55 + 0.12 * y);
    o[0] = c[0] + Math.cos(a) * r;
    o[1] = c[1] + y * 0.8;
    o[2] = c[2] + Math.sin(a) * r;
    [o[3], o[4], o[5]] = scale(lanternPaper(j), 0.46 * breath * k);
    return true;
  }
  if (s < 19) {
    // The flame, warm and bright, low inside it.
    o[0] = c[0] + (s - 17) * 0.08;
    o[1] = c[1] - 0.35 + (s - 16) * 0.06;
    o[2] = c[2];
    [o[3], o[4], o[5]] = scale(mix(C.amber, C.warm, 0.4), 0.7 * breath * k);
    return true;
  }
  // The rim of its open foot, gold.
  const a = ((s - 19) / 3) * TAU + j;
  o[0] = c[0] + Math.cos(a) * 0.32;
  o[1] = c[1] - 0.78;
  o[2] = c[2] + Math.sin(a) * 0.32;
  [o[3], o[4], o[5]] = scale(C.gold, 0.32 * k);
  return true;
}

/* ---------- jellyfish of light ---------- */

export const SKY_JELLIES = 10;
const JELLY_SITES = 120;
/** How far below its bell's top a jellyfish hangs at most, in its sizes (bell and tendrils). */
export const JELLY_HANG = 8;
/** The hues the jellyfish lean round: rose, amber, soft violet. */
export const JELLY_HUES: RGB[] = [C.rose, mix(C.amber, C.rose, 0.25), mix(C.violet, C.rose, 0.2)];

/** A jellyfish's colour now: leaning slowly round its hues, a minute or so from one to the next. */
export function jellyHue(j: number, t: number): RGB {
  const x = t * 0.014 + hash(j, 821) * JELLY_HUES.length;
  const a = Math.floor(x);
  return mix(
    JELLY_HUES[wrap(a, JELLY_HUES.length)] as RGB,
    JELLY_HUES[wrap(a + 1, JELLY_HUES.length)] as RGB,
    smooth(frac(x)),
  );
}

/** How far a jellyfish's bell is drawn in, 0..1: a slow, soft pulse, five to eight seconds. */
export const jellyPull = (j: number, t: number) =>
  (0.5 - 0.5 * Math.cos((TAU * t) / (5 + 3 * hash(j, 822)) + hash(j, 823) * TAU)) ** 1.5;

/** Jellyfish j of Chinatown's stretch n at time t: its bell's top, its size, how far it pulses. */
export function skyJelly(
  n: number,
  j: number,
  t: number,
  ox = 0,
): { c: Vec3; k: number; pull: number } {
  const [hx, hz] = home(n, j, 831, ox, 22);
  const k = 2.2 + 1.4 * hash(j, 834);
  // Its tendrils, some eight sizes long below the bell's top, clear the roofs by JELLY_CLEAR.
  const base = floorOver(mixId(n * 4099 + j, 841), hx, hz, JELLY_CLEAR + JELLY_HANG * k + 6);
  return {
    c: [
      hx + 8 * Math.sin(t * 0.03 + j),
      base + 30 * hash(j, 833) + 6 * Math.sin(t * 0.08 + j * 1.9),
      hz + 8 * Math.cos(t * 0.025 + j * 1.3),
    ],
    k,
    pull: jellyPull(j, t),
  };
}

/** Site s of a jellyfish: its bell, its rim, eight tendrils trailing and four frilled arms. */
function jellySite(
  J: { c: Vec3; k: number; pull: number },
  j: number,
  s: number,
  t: number,
  o: number[],
): boolean {
  const { c, k, pull } = J;
  const R = 2.4 * k * (1 - 0.15 * pull);
  const H = 1.6 * k * (1 + 0.15 * pull);
  const hue = jellyHue(j, t);
  if (s < 72) {
    // The bell and its rim: rings down a dome, the last its brighter rim.
    const ring = Math.floor(s / 12);
    const v = (ring + 1) / 6;
    const a = ((s % 12) + (ring % 2) * 0.5) * (TAU / 12);
    const r = R * Math.sin((v * Math.PI) / 2);
    o[0] = c[0] + Math.cos(a) * r;
    o[1] = c[1] - H * (1 - Math.cos((v * Math.PI) / 2));
    o[2] = c[2] + Math.sin(a) * r;
    [o[3], o[4], o[5]] = scale(mix(hue, C.white, 0.15), ring === 5 ? 0.45 : 0.18 + 0.03 * ring);
    return true;
  }
  if (s < 112) {
    // Eight tendrils from the rim, trailing and swaying, longer as the bell relaxes.
    const q = s - 72;
    const m = q % 8;
    const u = (Math.floor(q / 8) + 0.5) / 5;
    const a = (m / 8) * TAU;
    const L = 6 * k * (1 - 0.12 * pull);
    const sway = Math.sin(u * 4 - t * 0.9 + m + j) * 0.5 * u * k;
    o[0] = c[0] + Math.cos(a) * R * (1 - 0.25 * u) + Math.cos(a + 1.6) * sway;
    o[1] = c[1] - H - u * L;
    o[2] = c[2] + Math.sin(a) * R * (1 - 0.25 * u) + Math.sin(a + 1.6) * sway;
    [o[3], o[4], o[5]] = scale(hue, 0.26 * (1 - 0.6 * u));
    return true;
  }
  // Four frilled arms down the middle, turning slowly.
  const q = s - 112;
  const m = q % 4;
  const u = (Math.floor(q / 4) + 0.5) / 2;
  const a = (m / 4) * TAU + u * 2.5 + t * 0.15;
  o[0] = c[0] + Math.cos(a) * 0.45 * k;
  o[1] = c[1] - H * 0.6 - u * 3 * k;
  o[2] = c[2] + Math.sin(a) * 0.45 * k;
  [o[3], o[4], o[5]] = scale(mix(hue, C.white, 0.3), 0.3);
  return true;
}

/* ---------- into the picture ---------- */

/**
 * The lanterns and jellyfish over the Chinatown stretches within sight of the eye, one item each,
 * nearest first in the plan like everything else.
 */
export function chinatownSkyItems(eye: Vec3, t: number, out: Item[]) {
  const R = Math.min(viewAt(eye[1]), 420);
  const ox = nearest(0, eye[0], TILE_X);
  if (Math.abs(eye[0] - ox) > TILE_X / 2 + R) return;
  for (let n = Math.floor((eye[2] - R - CT_LEN) / TILE_Z); n * TILE_Z <= eye[2] + R; n++) {
    const z0 = n * TILE_Z;
    if (eye[2] < z0 - R || eye[2] > z0 + CT_LEN + R) continue;
    for (let j = 0; j < FLY_LANTERNS; j++) {
      const L = flyingLantern(n, j, t, ox);
      if (L.k <= 0) continue;
      const d = Math.hypot(L.c[0] - eye[0], L.c[1] - eye[1], L.c[2] - eye[2]) - 1;
      if (d > R) continue;
      out.push({
        d: Math.max(0, d),
        gid: mixId(n * 4099 + j, 9301),
        count: LANTERN_SITES,
        weight: 2.2,
        probe: [L.c],
        site: (s, o) => lanternSite(L.c, j, L.k, s, t, o),
      });
    }
    for (let j = 0; j < SKY_JELLIES; j++) {
      const J = skyJelly(n, j, t, ox);
      const d = Math.hypot(J.c[0] - eye[0], J.c[1] - eye[1], J.c[2] - eye[2]) - 4 * J.k;
      if (d > R) continue;
      out.push({
        d: Math.max(0, d),
        gid: mixId(n * 4099 + j, 9311),
        count: JELLY_SITES,
        weight: 1.8,
        probe: [J.c, [J.c[0], J.c[1] - 4 * J.k, J.c[2]]],
        site: (s, o) => jellySite(J, j, s, t, o),
      });
    }
  }
}

/** Whether a point is over Chinatown (for the tests). */
export const overChinatown = (x: number, z: number) => districtAt(x, z) === 'chinatown';
