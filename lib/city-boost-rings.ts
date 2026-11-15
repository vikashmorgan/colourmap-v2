/*
 * Boost rings over and in the City of Dreams (docs/specs/art-city.md, "Boost rings, LED arrows and
 * the big fireworks", 2026-11-15). Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "More big unique circles above the city, or in the city, that you can fly
 * into, and they boost you." And: "Perspective is everything and the whole point of this city.
 * Perspective is power, and makes it beautiful."
 *
 * Big glowing rings, each in one of four designs (double, spokes, chevron, segmented), standing
 * upright across a long view so you fly through them along it, and laid out in series down those
 * views, one after another, so from one end they recede as a row of frames, each smaller than the
 * last:
 * - down the two racing corridors (lib/city-corridors.ts, x ±78), tall ovals between the walls,
 *   mid-block, over the street's own channel and clear of the corridor's bridges and gates;
 * - along the Heights–Golden river gap (lib/city-gap-bridges.ts), between its bridges;
 * - high over the avenue, in Chinatown and over Egypt and the market (never by the Golden Spire);
 * - high over the canals and over the corridors' lines, between the high currents and the parcours.
 *
 * Flying through one (its plane crossed within PASS of its rim: forgiving, never precise) gives a
 * surge: the pace leaps, then eases off over SURGE_LIFE seconds; under the boost it adds half as
 * much, so it stacks without running away. The ring warms toward gold and a soft halo ripples out
 * from it. These are not the parcours (lib/city-rings.ts): they never count toward "Rings 7", and
 * they stand well clear of its rings, the stations, the space portals, the ship currents, the races
 * and the towers (every ring is checked when the list is made, and tested).
 *
 * All light: the Ship flies through every ring.
 */

import { type RGB, smooth, type Vec3 } from './bigbang';
import { SKY_BARS } from './city-bars';
import { copiesNear } from './city-big';
import { CORRIDOR_FEATURES, CORRIDOR_X } from './city-corridors';
import { skyStreamOver } from './city-currents';
import { blocked, DISTRICTS, districtAt, LANDMARKS } from './city-game';
import { GAP_Z } from './city-gap-bridges';
import {
  BLOCK_Z,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { TRACKS } from './city-race';
import { RIVER_ROW } from './city-rain';
import { parcoursRings, ringSets } from './city-rings';
import { CITY_PORTALS, RING_RADII, ringOf } from './city-space';
import { STATIONS, stationCentre, stationModel } from './city-stations';
import { ARCH_OUTER, ARCH_PIER, ARCH_Z, SATURN_X, SATURN_Z } from './city-symbols';
import { QUARTER_STARTS } from './city-travel';
import { barModel } from './space-bars';

export type BoostStyle = 'double' | 'spokes' | 'chevron' | 'segmented';
export const BOOST_STYLES: BoostStyle[] = ['double', 'spokes', 'chevron', 'segmented'];
export type BoostPlace = 'corridor' | 'gap' | 'avenue' | 'canal' | 'high';

export type BoostRing = {
  i: number;
  style: BoostStyle;
  place: BoostPlace;
  /** Its middle, tile-local. */
  c: Vec3;
  /** The way through it: level, along z (axis 2) or along x (axis 0). */
  axis: 0 | 2;
  /** Half its width across (level) and its half height: a circle, or a tall oval between walls. */
  rx: number;
  ry: number;
  /** Its own number. */
  key: number;
};

/** The least and most a boost ring's size may be (the user: "big ... not precise and tiny"). */
export const BOOST_R_MIN = 14;
export const BOOST_R_MAX = 30;
/** Through a ring counts within this much of its rim (a little outside too: forgiving). */
export const BOOST_PASS = 1.15;
/** How long a surge lasts, how strong it is at its height, and how much of it under the boost. */
export const SURGE_LIFE = 2.6;
export const SURGE = 1.4;
export const SURGE_BOOSTED = 0.5;

/** Heights over the street: the low rings stay under the big ships (96 up), the high ones over the
 * high streams (186) and under the parcours. */
export const LOW_TOP = 92;
export const HIGH_LOW = 194;
export const HIGH_TOP = 246;

const wrapd = (d: number, P: number) => d - P * Math.round(d / P);
/** The shortest way between two tile-local points, the plan repeating. */
const apart = (a: Vec3, b: Vec3) =>
  Math.hypot(wrapd(a[0] - b[0], TILE_X), a[1] - b[1], wrapd(a[2] - b[2], TILE_Z));
const reach = (g: BoostRing) => Math.max(g.rx, g.ry);

/**
 * The Golden Spire and the ground kept round it (2026-11-15: its surroundings are being built
 * up), where no boost ring stands.
 */
const SPIRE = LANDMARKS.find((l) => l.kind === 'spire') as (typeof LANDMARKS)[number];
export const SPIRE_KEEP = 100;

/** A point on ring g's rim (its copy at c), angle a, scaled by k, into o[0..2]. */
function rimPoint(g: BoostRing, c: Vec3, a: number, k: number, o: number[]) {
  const across = Math.cos(a) * g.rx * k;
  o[0] = c[0] + (g.axis === 2 ? across : 0);
  o[1] = c[1] + Math.sin(a) * g.ry * k;
  o[2] = c[2] + (g.axis === 0 ? across : 0);
}

/**
 * Whether a ring stands clear: no tower, peak or wall on its rim; off every station, parcours ring,
 * decorative set, space portal, corridor bridge or gate, race gate and the Egypt and Temple sky
 * streams; and out of the bands where the currents fly.
 */
export function boostRingClear(g: BoostRing): boolean {
  const R = reach(g);
  const lo = g.c[1] - g.ry - GROUND;
  const hi = g.c[1] + g.ry - GROUND;
  // The low rings: under the big ships, the express lanes and the flocks; over the street channels
  // (11 at most along a street, 30 on a cross street, 35 on the avenue).
  if (hi > LOW_TOP && (lo < HIGH_LOW || hi > HIGH_TOP)) return false;
  if (hi <= LOW_TOP && lo < (g.place === 'corridor' ? 15 : 36)) return false;
  const o = [0, 0, 0];
  for (let k = 0; k < 48; k++) {
    rimPoint(g, g.c, (k / 48) * TAU, 1, o);
    if (blocked([o[0], o[1], o[2]] as Vec3)) return false;
  }
  if (blocked(g.c)) return false;
  if (skyStreamOver(g.c[0], g.c[2], R + 6) !== null) return false;
  const sx = wrapd(g.c[0] - SPIRE.x, TILE_X);
  const sz = wrapd(g.c[2] - SPIRE.z, TILE_Z);
  if (Math.hypot(sx, sz) < SPIRE_KEEP + R) return false;
  for (const st of STATIONS) {
    const M = stationModel(st);
    const s = stationCentre(st, 0);
    const flat = Math.hypot(wrapd(g.c[0] - s[0], TILE_X), wrapd(g.c[2] - s[2], TILE_Z));
    const slo = s[1] + M.lo - st.bob;
    const shi = s[1] + M.hi + st.bob;
    const dy = g.c[1] < slo ? slo - g.c[1] : g.c[1] > shi ? g.c[1] - shi : 0;
    if (Math.hypot(Math.max(0, flat - M.r), dy) - R < 12) return false;
  }
  for (const p of parcoursRings()) if (apart(g.c, p.c) - R - p.r < 14) return false;
  for (const S of ringSets()) if (apart(g.c, S.c) - R - Math.max(...S.radii) < 10) return false;
  for (const P of CITY_PORTALS)
    for (let i = 0; i < RING_RADII.length; i++) {
      const q = ringOf(P, i);
      if (apart(g.c, q.c) - R - q.r < 20) return false;
    }
  for (const f of CORRIDOR_FEATURES)
    if (apart(g.c, [f.x, GROUND + f.y, f.z]) - R < 14) return false;
  for (const T of TRACKS)
    for (const q of [T.start, ...T.gates]) if (apart(g.c, q) - R < 15) return false;
  // Off the space bars (their reach and their sign), the Great Arch and the Saturn Tower's pole.
  for (const b of SKY_BARS) {
    if (hi <= LOW_TOP) break;
    const M = barModel(b.design);
    const flat = Math.hypot(wrapd(g.c[0] - b.x, TILE_X), wrapd(g.c[2] - b.z, TILE_Z));
    if (flat - M.r - R < 14) return false;
  }
  const ax = Math.max(0, Math.abs(wrapd(g.c[0], TILE_X)) - ARCH_OUTER);
  const az = Math.max(0, Math.abs(wrapd(g.c[2] - ARCH_Z, TILE_Z)) - ARCH_PIER.hz);
  if (Math.hypot(ax, az) - R < 14) return false;
  const px = wrapd(g.c[0] - SATURN_X, TILE_X);
  const pz = wrapd(g.c[2] - SATURN_Z, TILE_Z);
  if (Math.hypot(px, pz) - R < 30) return false;
  // Never on top of a quarter's start (one ahead of it, down its view, is a welcome).
  for (const q of QUARTER_STARTS) if (apart(g.c, q.pos) - R < 6) return false;
  return true;
}

let rings: BoostRing[] | null = null;
/**
 * Every boost ring, tile-local, in series down the long views, each kept only where it stands
 * clear (boostRingClear). The designs take turns down each series, so no two neighbours match.
 */
export function boostRings(): BoostRing[] {
  if (rings) return rings;
  const cand: Omit<BoostRing, 'i' | 'key' | 'style'>[] = [];
  // Down the racing corridors: tall ovals between the walls (24 across), mid-block, every row.
  // (Not on the river's two rows: the gap's own rings cross there.)
  for (const x of CORRIDOR_X)
    for (let J = 1; J < TILE_Z / BLOCK_Z - 1; J++)
      if (J !== RIVER_ROW - 1 && J !== RIVER_ROW)
        cand.push({
          place: 'corridor',
          c: [x, GROUND + 33, (J + 0.5) * BLOCK_Z],
          axis: 2,
          rx: 10.5,
          ry: 16,
        });
  // Along the Heights–Golden gap, between its bridges, over the cross street's channel.
  for (const x of [-134, -100, -76, -52])
    cand.push({ place: 'gap', c: [x, GROUND + 62, GAP_Z], axis: 0, rx: 11, ry: 16 });
  // High over the avenue: in Chinatown, and over Egypt and the market (the Golden Spire left be).
  for (const z of [90, 150, 210, 1380, 1440, 1500, 1560])
    cand.push({ place: 'avenue', c: [0, GROUND + 220, z], axis: 2, rx: 22, ry: 22 });
  // High over the three canals, facing along them (they run across the plan, along x).
  for (const row of [18, 20, 22])
    for (const x of [40, 80, 120])
      cand.push({ place: 'canal', c: [x, GROUND + 220, row * BLOCK_Z], axis: 0, rx: 20, ry: 20 });
  // High over the corridors' lines, the length of the tile, every other block.
  for (const x of CORRIDOR_X)
    for (let J = 1; J < TILE_Z / BLOCK_Z; J += 2)
      cand.push({ place: 'high', c: [x, GROUND + 220, J * BLOCK_Z], axis: 2, rx: 24, ry: 24 });
  const out: BoostRing[] = [];
  const turn: Record<string, number> = {};
  for (const r of cand) {
    const g: BoostRing = { ...r, i: out.length, style: 'double', key: 0 };
    if (!boostRingClear(g)) continue;
    // Never two crowding one another; down one line of sight, a frame every 24 at the least.
    const crowds = (h: BoostRing) => {
      const coaxial =
        h.axis === g.axis &&
        h.c[1] === g.c[1] &&
        Math.abs(h.c[2 - g.axis] - g.c[2 - g.axis]) < 1 &&
        h.rx === g.rx;
      const gap = g.place === 'corridor' ? 60 : 24;
      return apart(h.c, g.c) < (coaxial ? gap : reach(h) + reach(g) + 10);
    };
    if (out.some(crowds)) continue;
    const series = `${r.place}${r.axis === 2 ? r.c[0] : r.c[2]}`;
    const n = turn[series] ?? Math.abs(Math.round(r.c[0] + r.c[2])) % 4;
    turn[series] = n + 1;
    g.style = BOOST_STYLES[n % 4] as BoostStyle;
    g.key = mixId(out.length, 8181);
    out.push(g);
  }
  rings = out;
  return out;
}

/** Ring g's copy nearest q, and its own number (which ring, which copy). */
function copyOf(g: BoostRing, q: Vec3, c: number[]): number {
  c[0] = nearest(g.c[0], q[0], TILE_X);
  c[1] = g.c[1];
  c[2] = nearest(g.c[2], q[2], TILE_Z);
  const mx = Math.round((c[0] - g.c[0]) / TILE_X);
  const nz = Math.round((c[2] - g.c[2]) / TILE_Z);
  return mixId(g.i * 4111 + mx * 89, nz * 7907 + 29);
}

/**
 * Whether the step from a to b went through ring g's copy at c (either way): its plane crossed
 * within BOOST_PASS of its rim. No allocation.
 */
export function boostPassedBy(g: BoostRing, c: ArrayLike<number>, a: Vec3, b: Vec3): boolean {
  const ax = g.axis;
  const da = a[ax] - (c[ax] as number);
  const db = b[ax] - (c[ax] as number);
  if (da === db || da * db > 0) return false;
  const k = da / (da - db);
  const across = g.axis === 2 ? 0 : 2;
  const u = (a[across] as number) + ((b[across] as number) - (a[across] as number)) * k;
  const v = a[1] + (b[1] - a[1]) * k;
  const qu = (u - (c[across] as number)) / g.rx;
  const qv = (v - (c[1] as number)) / g.ry;
  return qu * qu + qv * qv < BOOST_PASS * BOOST_PASS;
}

/** What the boost rings remember: when each copy was last flown through, and the last surge. */
const state = {
  passed: new Map<number, number>(),
  last: Number.NEGATIVE_INFINITY,
};
const scratch = [0, 0, 0];

/** Forgets every ring flown and any surge (a fresh start, a jump in time). */
export function resetBoostRings() {
  state.passed.clear();
  state.last = Number.NEGATIVE_INFINITY;
}

/**
 * A step of the ship from a to b at time t: every boost ring it went through warms and starts a
 * surge (the same ring twice within a second and a half, once). Returns how many. No allocation
 * for the rings it misses.
 */
export function boostRingStep(a: Vec3, b: Vec3, t: number): number {
  if (t < state.last) resetBoostRings();
  const step = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  let hits = 0;
  for (const g of boostRings()) {
    const key = copyOf(g, b, scratch);
    const dx = (scratch[0] as number) - b[0];
    const dy = (scratch[1] as number) - b[1];
    const dz = (scratch[2] as number) - b[2];
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) > reach(g) * BOOST_PASS + step + 2) continue;
    if (!boostPassedBy(g, scratch, a, b)) continue;
    const had = state.passed.get(key);
    if (had !== undefined && t - had < 1.5) continue;
    state.passed.set(key, t);
    state.last = t;
    hits++;
  }
  if (state.passed.size > 128)
    for (const [k, when] of state.passed) if (t - when > 12) state.passed.delete(k);
  return hits;
}

/**
 * The surge now, 0..1: up over a tenth of a second as you pass, easing off to nothing over
 * SURGE_LIFE (a push, then a long glide back to your pace).
 */
export function surgeAt(t: number): number {
  const e = t - state.last;
  if (!(e >= 0 && e < SURGE_LIFE)) return 0;
  return smooth(e / 0.1) * (1 - smooth(e / SURGE_LIFE));
}

/** The pace the surge gives (the flight's pace times this): less on top of the boost. */
export const surgePace = (t: number, boosting: boolean) =>
  1 + SURGE * (boosting ? SURGE_BOOSTED : 1) * surgeAt(t);

/** How warm a ring copy is at time t, 0..1: up as you pass, cooling over five seconds. */
export function boostHeat(key: number, t: number): number {
  const when = state.passed.get(key);
  if (when === undefined || t < when) return 0;
  const e = t - when;
  return smooth(e / 0.4) * (1 - smooth((e - 0.4) / 5));
}

/* ---------- drawing ---------- */

/** How densely a rim's lights are strung, and the halo's lights. */
const STEP = 0.6;
const ECHO = 72;
/** Sites in each design beyond its rim: a second rim, spokes and a hub, chevrons, segments. */
const SPOKES = 8;
const SPOKE_SITES = 14;
const CHEVRONS = 10;
const CHEVRON_SITES = 12;

const rimSites = (g: BoostRing) => Math.round((TAU * reach(g)) / STEP);
/** How many sites ring g has: its rim, its design's own, and the halo after a pass. */
export function boostSites(g: BoostRing): number {
  const n = rimSites(g);
  const extra =
    g.style === 'double'
      ? Math.round(n * 0.84)
      : g.style === 'spokes'
        ? SPOKES * SPOKE_SITES + Math.round(n * 0.3)
        : g.style === 'chevron'
          ? CHEVRONS * CHEVRON_SITES
          : Math.round(n * 0.9);
  return n + extra + ECHO;
}

/** A quarter colour's warm lamp and its deeper shade, once a colour. */
const tones = new WeakMap<RGB, [RGB, RGB]>();
function tonesOf(c: RGB): [RGB, RGB] {
  let p = tones.get(c);
  if (!p) {
    p = [mix(mix(c, C.amber, 0.45), C.warm, 0.2), scale(mix(c, C.violet, 0.15), 0.9)];
    tones.set(c, p);
  }
  return p;
}

/**
 * Site s of boost ring g (its copy at c, its own number key) at time t: its rim, then its design
 * (a second rim drifting the other way; eight spokes to a hub, turning slowly; ten chevrons inside
 * the rim pointing in, lit one after another toward the middle; a turning ring of segments), then
 * the halo after a pass. Its quarter's colour with warm amber lamps, warming to gold as you pass;
 * mellow, never a flash.
 */
export function boostSite(
  g: BoostRing,
  c: Vec3,
  key: number,
  colour: RGB,
  s: number,
  t: number,
  o: number[],
): boolean {
  const heat = boostHeat(key, t);
  const [lamp, deep] = tonesOf(colour);
  const n = rimSites(g);
  let tone: RGB = colour;
  let k: number;
  if (s < n) {
    const a = ((s + 0.5) / n) * TAU;
    rimPoint(g, c, a, 1, o);
    // A slow swell running round the rim, a warm lamp every twelfth of the way.
    const lit = s % Math.max(1, Math.round(n / 12)) === 0;
    tone = lit ? lamp : colour;
    k = (lit ? 0.56 : 0.36) * (0.85 + 0.15 * Math.sin(a * 2 - t * 0.8));
  } else {
    let q = s - n;
    const extra = boostSites(g) - n - ECHO;
    if (q < extra) {
      if (g.style === 'double') {
        const a = ((q + 0.5) / extra) * TAU - 0.15 * t;
        rimPoint(g, c, a, 0.84, o);
        tone = deep;
        k = 0.3 + 0.12 * Math.sin(a * 3 + t * 0.6);
      } else if (g.style === 'spokes') {
        if (q < SPOKES * SPOKE_SITES) {
          const j = Math.floor(q / SPOKE_SITES);
          const v = ((q % SPOKE_SITES) + 0.5) / SPOKE_SITES;
          const a = (j / SPOKES) * TAU + 0.12 * t;
          rimPoint(g, c, a, 0.3 + 0.62 * v, o);
          tone = v > 0.8 ? lamp : colour;
          k = 0.22 + 0.14 * v;
        } else {
          q -= SPOKES * SPOKE_SITES;
          const m = extra - SPOKES * SPOKE_SITES;
          rimPoint(g, c, ((q + 0.5) / m) * TAU - 0.12 * t, 0.3, o);
          tone = lamp;
          k = 0.34;
        }
      } else if (g.style === 'chevron') {
        // A chevron pointing in toward the middle: its tip at 0.7 of the rim, its arms back to 0.9.
        const j = Math.floor(q / CHEVRON_SITES);
        const p = q % CHEVRON_SITES;
        const side = p < CHEVRON_SITES / 2 ? -1 : 1;
        const v = ((p % (CHEVRON_SITES / 2)) + 0.5) / (CHEVRON_SITES / 2);
        const a0 = (j / CHEVRONS) * TAU;
        rimPoint(g, c, a0 + side * 0.13 * v, 0.7 + 0.2 * v, o);
        // Lit in turn round the ring, a soft wave, never a blink.
        const w = 0.5 + 0.5 * Math.cos(a0 - t * 1.6);
        tone = lamp;
        k = 0.16 + 0.36 * w * w;
      } else {
        // Ten segments turning, with gaps between, every other one warm.
        const a = ((q + 0.5) / extra) * TAU;
        const seg = Math.floor((a / TAU) * 10);
        const along = (a / TAU) * 10 - seg;
        if (along > 0.78) return false;
        rimPoint(g, c, a + 0.35 * t, 0.9, o);
        tone = seg % 2 ? lamp : deep;
        k = 0.4;
      }
    } else {
      // The halo: a soft ring rippling out from it after a pass, fading.
      const when = state.passed.get(key);
      if (when === undefined) return false;
      const e = (t - when) / 1.4;
      if (e < 0 || e >= 1) return false;
      q -= extra;
      rimPoint(g, c, ((q + 0.5) / ECHO) * TAU, 1 + 0.55 * e, o);
      tone = mix(lamp, C.gold, 0.5);
      k = 0.42 * smooth(e / 0.1) * (1 - e) ** 2;
    }
  }
  const gh = 0.6 * heat;
  const b = k * (1 + 0.35 * heat);
  for (let j = 0; j < 3; j++) o[3 + j] = (tone[j] + (C.gold[j] - tone[j]) * gh) * b;
  return true;
}

/** At most this many boost rings are drawn, the nearest. */
export const MOST_BOOST = 12;

/** The boost rings within sight (R), as the Ship's items: the nearest, ahead of the eye. */
export function boostRingItems(eye: Vec3, fwd: Vec3, t: number, R: number): Item[] {
  const out: Item[] = [];
  for (const g of boostRings()) {
    const rad = reach(g);
    copiesNear(g.c[0], g.c[2], eye, R + rad, (x, z) => {
      const c: Vec3 = [x, g.c[1], z];
      const rx = x - eye[0];
      const ry = c[1] - eye[1];
      const rz = z - eye[2];
      const d = Math.max(0, Math.hypot(rx, ry, rz) - rad * 1.5);
      if (d > R || (rx * fwd[0] + ry * fwd[1] + rz * fwd[2] < -rad * 1.5 - 10 && d > 0)) return;
      const key = copyOf(g, c, scratch);
      const colour = DISTRICTS[districtAt(x, z)].colour;
      out.push({
        d,
        gid: mixId(key, 8282),
        count: boostSites(g),
        weight: 2,
        site: (s, o) => boostSite(g, c, key, colour, s, t, o),
      });
    });
  }
  return out.sort((a, b) => a.d - b.d).slice(0, MOST_BOOST);
}

/**
 * Whether a firework bursting at c with sparks out to r (falling up to 24 as they fade) stays off
 * every boost ring (lib/city-fireworks.ts). No allocation: it runs for each burst, every frame.
 */
export function boostClearOfBurst(c: Vec3, r: number): boolean {
  const G = boostRings();
  for (let i = 0; i < G.length; i++) {
    const g = G[i] as BoostRing;
    const R = reach(g);
    const flat = Math.hypot(wrapd(c[0] - g.c[0], TILE_X), wrapd(c[2] - g.c[2], TILE_Z)) - r - R;
    if (flat >= 8) continue;
    const top = c[1] + r;
    const low = c[1] - r - 24;
    const dy = low > g.c[1] + R ? low - g.c[1] - R : g.c[1] - R - top;
    if (dy < 8) return false;
  }
  return true;
}
