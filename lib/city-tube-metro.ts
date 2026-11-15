/*
 * The tube metro (docs/specs/art-city.md, "The loop metro and the tube metro", 2026-11-15): a
 * transparent glowing tube that weaves through the City of Dreams at mid height, held up by a few
 * tall slender pillars, with capsule trains shooting through it. Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "a metro in a loop; another metro flying through the city in a tube, with a
 * few holding pillars." And over all of it: "Perspective is everything and the whole point of this
 * city. Perspective is power, and makes it beautiful."
 *
 * Perspective first. The tube is one closed loop per tile, a uniform cubic B-spline through its
 * control points, so its curvature is smooth all the way round (no kink, no sudden bend). It
 * crosses the Grand Avenue twice, high over the street, once just past the river and once at the
 * far end of the Matrix quarter (past where the market's lanes end), so flying up or down the avenue
 * it frames the long view twice, a glowing station hanging over the street at each crossing. Between
 * the crossings it sweeps up the west side, round the golden spire's novas and up between the
 * temples' blocks, and back down the east side, between the market's high lanes and the strip's
 * edge, dipping under the barge's line as it turns off the crossing and again past the Saturn
 * Tower: long curves that read from far off, the city's towers standing either side.
 *
 * Its height (about 80 to 100 over the street) keeps it clear of every current where it runs
 * alongside one: over the street channels (to 35), the metro (35 to 45), the corridors' low
 * obstacles (to 43) and the darting UFOs' lines (to 84), off to the side of the low-roof highways
 * and the market's high lanes, under the barge (96, wherever it crosses or runs beside its line),
 * the express lanes (112 and 120), the big ships' lines (126, 142), the high currents (142 and up)
 * and the flying stations and space bars (190 and up). Tested.
 *
 * The tube is light (the ship flies through it); only its few pillars are walls, each a thin round
 * column from the street to the tube: `tubePillarHolds`, a handful of distance checks. Mellow: the
 * glass breathes slowly, a capsule passing warms the rings round it, a station glows softly while a
 * capsule is in; nothing flashes.
 */

import { smooth, type Vec3 } from './bigbang';
import {
  C,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  nearest,
  planX,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import type { MapPlace } from './city-minimap';
import type { TravelSpot } from './city-travel';

/* ---------- the route ---------- */

/**
 * The tube's control points, tile-local (x, z) and the height over the street, in order round the
 * loop: over the avenue past the river, up the west side, over the avenue again at z 1690, down
 * the east side and back. The curve is a closed uniform cubic B-spline through them (it passes near,
 * not through, each point), checked clear of every wall and lit thing along it.
 */
export const TUBE_POINTS: [number, number, number][] = [
  [60, 836, 100],
  [20, 838, 100],
  [-20, 842, 98],
  [-40, 864, 94],
  [-38, 905, 88],
  [-37, 952, 92],
  [-74, 988, 96],
  [-119, 995, 98],
  [-132, 1032, 98],
  [-132, 1074, 98],
  [-119, 1113, 98],
  [-90, 1143, 98],
  [-61, 1173, 98],
  [-51, 1212, 98],
  [-51, 1254, 98],
  [-51, 1296, 98],
  [-46, 1338, 98],
  [-39, 1380, 98],
  [-39, 1430, 98],
  [-39, 1490, 98],
  [-39, 1550, 98],
  [-39, 1610, 98],
  [-32, 1660, 98],
  [-6, 1690, 98],
  [34, 1698, 98],
  [72, 1698, 98],
  [98, 1688, 96],
  [116, 1668, 79],
  [134, 1656, 79],
  [148, 1642, 86],
  [151, 1610, 94],
  [148, 1560, 96],
  [146, 1500, 96],
  [145, 1430, 96],
  [143, 1370, 90],
  [137, 1320, 84],
  [131, 1280, 80],
  [129, 1240, 80],
  [129, 1200, 80],
  [129, 1158, 80],
  [121, 1119, 80],
  [107, 1082, 84],
  [86, 1046, 94],
  [66, 1008, 98],
  [48, 970, 100],
  [51, 930, 100],
  [76, 900, 100],
  [98, 868, 100],
];

/** The tube's radius: the glass round the capsules' path. */
export const TUBE_R = 2.2;
/** How many even steps the loop is sampled in (by its length). */
const SAMPLES = 4096;

/** A closed uniform cubic B-spline through the points, sampled evenly by length, with its frame. */
export const TUBE = (() => {
  const P = TUBE_POINTS;
  const n = P.length;
  const per = 160;
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = P[wrap(i - 1, n)] as [number, number, number];
    const b = P[i] as [number, number, number];
    const c = P[(i + 1) % n] as [number, number, number];
    const d = P[(i + 2) % n] as [number, number, number];
    for (let j = 0; j < per; j++) {
      const u = j / per;
      const u2 = u * u;
      const u3 = u2 * u;
      const w0 = (1 - u) ** 3 / 6;
      const w1 = (3 * u3 - 6 * u2 + 4) / 6;
      const w2 = (-3 * u3 + 3 * u2 + 3 * u + 1) / 6;
      const w3 = u3 / 6;
      for (let k = 0; k < 3; k++)
        raw.push(
          w0 * (a[k] as number) +
            w1 * (b[k] as number) +
            w2 * (c[k] as number) +
            w3 * (d[k] as number),
        );
    }
  }
  const m = raw.length / 3;
  const cum = new Float64Array(m + 1);
  for (let i = 1; i <= m; i++) {
    const p = (i - 1) * 3;
    const q = (i % m) * 3;
    cum[i] =
      (cum[i - 1] as number) +
      Math.hypot(
        (raw[q] as number) - (raw[p] as number),
        (raw[q + 1] as number) - (raw[p + 1] as number),
        (raw[q + 2] as number) - (raw[p + 2] as number),
      );
  }
  const length = cum[m] as number;
  // Raw (x, z, height) → evenly spaced places (x, y, z), y over GROUND.
  const pos = new Float32Array(SAMPLES * 3);
  let k = 0;
  for (let s = 0; s < SAMPLES; s++) {
    const want = (s / SAMPLES) * length;
    while ((cum[k + 1] as number) < want) k++;
    const f = (want - (cum[k] as number)) / ((cum[k + 1] as number) - (cum[k] as number) || 1);
    const p = k * 3;
    const q = ((k + 1) % m) * 3;
    pos[s * 3] = lerp(raw[p] as number, raw[q] as number, f);
    pos[s * 3 + 1] = GROUND + lerp(raw[p + 2] as number, raw[q + 2] as number, f);
    pos[s * 3 + 2] = lerp(raw[p + 1] as number, raw[q + 1] as number, f);
  }
  // The frame at each step: the heading, a level side, and an up square to both.
  const tan = new Float32Array(SAMPLES * 3);
  const side = new Float32Array(SAMPLES * 3);
  const up = new Float32Array(SAMPLES * 3);
  for (let s = 0; s < SAMPLES; s++) {
    const a = wrap(s - 1, SAMPLES) * 3;
    const b = ((s + 1) % SAMPLES) * 3;
    let tx = (pos[b] as number) - (pos[a] as number);
    let ty = (pos[b + 1] as number) - (pos[a + 1] as number);
    let tz = (pos[b + 2] as number) - (pos[a + 2] as number);
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    const hl = Math.hypot(tx, tz) || 1;
    const sx = -tz / hl;
    const sz = tx / hl;
    tan[s * 3] = tx;
    tan[s * 3 + 1] = ty;
    tan[s * 3 + 2] = tz;
    side[s * 3] = sx;
    side[s * 3 + 2] = sz;
    // up = side × tan
    up[s * 3] = -sz * ty;
    up[s * 3 + 1] = sz * tx - sx * tz;
    up[s * 3 + 2] = sx * ty;
  }
  return { pos, tan, side, up, n: SAMPLES, length };
})();

/** The step (fractional) of the tube's samples at `s` along it (any s: it loops). */
const stepAt = (s: number) => (wrap(s, TUBE.length) / TUBE.length) * TUBE.n;

/** The tube's middle at `s` along it, tile-local, into o[0..2] (no allocation). */
export function tubePoint(s: number, o: number[] | Float32Array, at = 0): void {
  const x = stepAt(s);
  const i = Math.floor(x);
  const f = x - i;
  const a = i * 3;
  const b = ((i + 1) % TUBE.n) * 3;
  const P = TUBE.pos;
  o[at] = (P[a] as number) + ((P[b] as number) - (P[a] as number)) * f;
  o[at + 1] = (P[a + 1] as number) + ((P[b + 1] as number) - (P[a + 1] as number)) * f;
  o[at + 2] = (P[a + 2] as number) + ((P[b + 2] as number) - (P[a + 2] as number)) * f;
}

/** The nearest sample's index at `s` (for its frame). */
const frameAt = (s: number) => Math.round(stepAt(s)) % TUBE.n;

/**
 * A point on the tube's skin at `s` along it: `r` out from its middle at angle `a` round it (0 the
 * level side, π/2 up), tile-local, into o[0..2].
 */
export function tubeSkin(s: number, r: number, a: number, o: number[]): void {
  tubePoint(s, o);
  const j = frameAt(s) * 3;
  const c = Math.cos(a) * r;
  const d = Math.sin(a) * r;
  o[0] = (o[0] as number) + (TUBE.side[j] as number) * c + (TUBE.up[j] as number) * d;
  o[1] = (o[1] as number) + (TUBE.side[j + 1] as number) * c + (TUBE.up[j + 1] as number) * d;
  o[2] = (o[2] as number) + (TUBE.side[j + 2] as number) * c + (TUBE.up[j + 2] as number) * d;
}

/* ---------- the pillars ---------- */

/** The pillars' places, as fractions of the way round the loop (few: tested at most eight a tile). */
export const PILLAR_AT = [0.071, 0.142, 0.345, 0.548, 0.714, 0.848, 0.949];
/** A pillar's radius: tall and slender. */
export const PILLAR_R = 0.9;

export type TubePillar = { s: number; x: number; z: number; top: number };
/** Each pillar, tile-local: its foot (x, z) under the tube and its top (the tube's underside). */
export const TUBE_PILLARS: TubePillar[] = PILLAR_AT.map((k) => {
  const s = k * TUBE.length;
  const o = [0, 0, 0];
  tubePoint(s, o);
  return { s, x: o[0] as number, z: o[2] as number, top: (o[1] as number) - TUBE_R };
});
const PZ0 = Math.min(...TUBE_PILLARS.map((p) => p.z));
const PZ1 = Math.max(...TUBE_PILLARS.map((p) => p.z));

/** Whether a point is inside a pillar, `m` round it (the tube itself is light: fly through it). */
export function tubePillarHolds(q: Vec3, m: number): boolean {
  const lz = wrap(q[2], TILE_Z);
  if (lz < PZ0 - PILLAR_R - m || lz > PZ1 + PILLAR_R + m) return false;
  const lx = planX(q[0]);
  const rr = (PILLAR_R + m) * (PILLAR_R + m);
  for (let i = 0; i < TUBE_PILLARS.length; i++) {
    const p = TUBE_PILLARS[i] as TubePillar;
    if (q[1] > p.top + m) continue;
    const dx = lx - p.x;
    const dz = lz - p.z;
    if (dx * dx + dz * dz < rr) return true;
  }
  return false;
}

/* ---------- the capsules ---------- */

/** Capsule trains: this many, of this many cars, each car this long, shooting on at this pace. */
export const CAPSULES = 3;
export const CAPSULE_CARS = 3;
export const CAPSULE_LEN = 5;
export const CAPSULE_GAP = 0.7;
export const CAPSULE_SPEED = 36;
/** A capsule's radius: well inside the glass. */
export const CAPSULE_R = 1.25;

/** How far along the loop car `car` of capsule train j is at time t. */
export const capsuleS = (j: number, car: number, t: number) =>
  wrap(
    (j / CAPSULES) * TUBE.length + CAPSULE_SPEED * t - car * (CAPSULE_LEN + CAPSULE_GAP),
    TUBE.length,
  );

/** The shortest way round the loop between two places along it. */
export const loopGap = (a: number, b: number) => {
  const d = Math.abs(wrap(a - b, TUBE.length));
  return Math.min(d, TUBE.length - d);
};

/* ---------- the stations ---------- */

/**
 * The tube's two stations, each over the avenue where the tube crosses it (the fractions of the
 * loop nearest x = 0 on each crossing), so seen up the avenue a lit station hangs over the street.
 */
export const TUBE_STATIONS: number[] = (() => {
  const best = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const at = [0, 0];
  for (let s = 0; s < TUBE.n; s++) {
    const x = TUBE.pos[s * 3] as number;
    const z = TUBE.pos[s * 3 + 2] as number;
    const k = z < 1200 ? 0 : 1;
    if (Math.abs(x) < (best[k] as number)) {
      best[k] = Math.abs(x);
      at[k] = (s / TUBE.n) * TUBE.length;
    }
  }
  return at;
})();
/** A station's half length along the tube, and how far its glass swells out. */
export const STATION_HALF = 9;
export const STATION_R = 4;

/** How brightly station k glows at time t (0..1): softly, while a capsule is in it. */
export function tubeStationGlow(k: number, t: number): number {
  const s0 = TUBE_STATIONS[k] ?? 0;
  let g = 0;
  for (let j = 0; j < CAPSULES; j++) {
    const head = capsuleS(j, 0, t);
    const tail = capsuleS(j, CAPSULE_CARS - 1, t);
    const mid = wrap(tail + loopGap(head, tail) / 2, TUBE.length);
    const half = loopGap(head, tail) / 2 + CAPSULE_LEN / 2;
    const d = Math.max(0, loopGap(mid, s0) - half - STATION_HALF);
    g = Math.max(g, 1 - smooth(d / 24));
  }
  return g;
}

/* ---------- drawn ---------- */

const GLASS = mix(C.cyan, C.violet, 0.35);
const GLASS_WARM = mix(C.warm, C.cyan, 0.25);
const CAPSULE_BODY = mix(C.white, C.cyan, 0.2);

/** How much a capsule passing warms the glass at `s` along it (0..1, eased). */
function capsuleNear(s: number, t: number): number {
  let k = 0;
  for (let j = 0; j < CAPSULES; j++) {
    const d = loopGap(s, capsuleS(j, 0, t) - (CAPSULE_CARS * (CAPSULE_LEN + CAPSULE_GAP)) / 2);
    if (d < 18) k = Math.max(k, 1 - smooth(d / 18));
  }
  return k;
}

const CHUNK = 24;
const CHUNKS = Math.ceil(TUBE.length / CHUNK);
const scratch = [0, 0, 0];

/**
 * Site s of the tube's chunk from s0 (CHUNK long) at the tile copy (ox, oz): rings of glass round
 * it every 2.4, each `rg` grains, and (`lines`) four faint threads along it. A station's chunk
 * swells to the station's glass and glows with `glow`.
 */
function glassSite(
  s0: number,
  s: number,
  rg: number,
  lines: boolean,
  ox: number,
  oz: number,
  t: number,
  station: number,
  glow: number,
  o: number[],
): boolean {
  const rings = CHUNK / 2.4;
  const nr = rings * rg;
  let along: number;
  let a: number;
  let ring = true;
  if (s < nr) {
    along = s0 + (Math.floor(s / rg) + 0.5) * 2.4;
    a = ((s % rg) / rg) * TAU;
  } else {
    if (!lines) return false;
    const q = s - nr;
    along = s0 + ((Math.floor(q / 4) + 0.5) / 24) * CHUNK;
    a = (q % 4) * (TAU / 4) + TAU / 8;
    ring = false;
  }
  // Swelling into a station: smoothly, over the station's length.
  let r = TUBE_R;
  let lit = 0;
  if (station >= 0) {
    const d = loopGap(along, TUBE_STATIONS[station] as number);
    const w = 1 - smooth((d - STATION_HALF) / 6 + 1);
    r = lerp(TUBE_R, STATION_R, w);
    lit = w * glow;
  }
  tubeSkin(along, r, a, o);
  o[0] = (o[0] as number) + ox;
  o[2] = (o[2] as number) + oz;
  const warm = capsuleNear(along, t);
  const breathe = 0.85 + 0.15 * Math.sin(t * 0.35 + along * 0.03);
  const k = (ring ? 0.2 : 0.11) * breathe * (1 + 0.8 * warm) + 0.35 * lit;
  const w = Math.min(1, 0.6 * warm + lit);
  o[3] = (GLASS[0] + (GLASS_WARM[0] - GLASS[0]) * w) * k;
  o[4] = (GLASS[1] + (GLASS_WARM[1] - GLASS[1]) * w) * k;
  o[5] = (GLASS[2] + (GLASS_WARM[2] - GLASS[2]) * w) * k;
  return true;
}

/** Site s of a capsule car whose middle is at `sc` along the tube: a lozenge of light, its windows lit. */
export function capsuleSite(sc: number, s: number, ox: number, oz: number, o: number[]): boolean {
  if (s < 96) {
    // The body: eight rings along it, narrowing to round noses.
    const ring = Math.floor(s / 12);
    const u = (ring + 0.5) / 8;
    const r = CAPSULE_R * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) ** 0.7;
    tubeSkin(sc + (u - 0.5) * CAPSULE_LEN, r, ((s % 12) / 12) * TAU, o);
    o[3] = CAPSULE_BODY[0] * 0.3;
    o[4] = CAPSULE_BODY[1] * 0.3;
    o[5] = CAPSULE_BODY[2] * 0.3;
  } else {
    // The windows: a warm band down both sides.
    const q = s - 96;
    const u = ((q >> 1) + 0.5) / 12;
    tubeSkin(sc + (u - 0.5) * CAPSULE_LEN * 0.8, CAPSULE_R * 0.95, q & 1 ? Math.PI : 0, o);
    o[3] = C.warm[0] * 0.55;
    o[4] = C.warm[1] * 0.55;
    o[5] = C.warm[2] * 0.55;
  }
  o[0] = (o[0] as number) + ox;
  o[2] = (o[2] as number) + oz;
  return true;
}
/** Sites in one capsule car. */
export const CAPSULE_SITES = 120;

/** Site s of pillar p at (ox, oz): its column of light, a cradle under the tube, a foot. */
function pillarSite(p: TubePillar, s: number, ox: number, oz: number, o: number[]): boolean {
  const n = PILLAR_SITES;
  if (s < n - 24) {
    // Four edges up the column, catching the light more toward the top.
    const e = s & 3;
    const u = ((s >> 2) + 0.5) / ((n - 24) / 4);
    const a = e * (TAU / 4) + 0.4;
    o[0] = p.x + ox + Math.cos(a) * PILLAR_R;
    o[1] = lerp(GROUND, p.top, u);
    o[2] = p.z + oz + Math.sin(a) * PILLAR_R;
    const k = 0.1 + 0.12 * u;
    o[3] = C.steel[0] * k;
    o[4] = C.steel[1] * k;
    o[5] = C.steel[2] * k;
    return true;
  }
  // The cradle: a half ring under the tube, warm.
  const q = s - (n - 24);
  tubeSkin(p.s, TUBE_R + 0.5, Math.PI + ((q + 0.5) / 24) * Math.PI, scratch);
  o[0] = (scratch[0] as number) + ox;
  o[1] = scratch[1] as number;
  o[2] = (scratch[2] as number) + oz;
  o[3] = C.amber[0] * 0.4;
  o[4] = C.amber[1] * 0.4;
  o[5] = C.amber[2] * 0.4;
  return true;
}
/** Sites in a pillar. */
export const PILLAR_SITES = 200;

/** The middle of chunk c (tile-local), precomputed: for its distance from the eye. */
const CHUNK_MID = (() => {
  const m = new Float32Array(CHUNKS * 3);
  for (let c = 0; c < CHUNKS; c++) tubePoint((c + 0.5) * CHUNK, m, c * 3);
  return m;
})();
/** Which station (if any) each chunk holds part of. */
const CHUNK_STATION = (() => {
  const a = new Int8Array(CHUNKS).fill(-1);
  for (let c = 0; c < CHUNKS; c++)
    TUBE_STATIONS.forEach((s0, k) => {
      if (loopGap((c + 0.5) * CHUNK, s0) < CHUNK / 2 + STATION_HALF + 6) a[c] = k;
    });
  return a;
})();

/**
 * The tube within sight (R), as the Ship's items: every tile copy near, its glass in chunks (fewer
 * grains a ring, and no threads, the farther a chunk is), its pillars, its capsules and stations.
 * The renderer thins them with the distance like everything else.
 */
export function tubeItems(eye: Vec3, t: number, R: number, out: Item[]): void {
  const ox = nearest(0, eye[0], TILE_X);
  const oz0 = Math.floor((eye[2] - R) / TILE_Z) * TILE_Z;
  for (let oz = oz0; oz <= eye[2] + R; oz += TILE_Z) {
    const tile = Math.round(oz / TILE_Z);
    for (let c = 0; c < CHUNKS; c++) {
      const mx = (CHUNK_MID[c * 3] as number) + ox;
      const my = CHUNK_MID[c * 3 + 1] as number;
      const mz = (CHUNK_MID[c * 3 + 2] as number) + oz;
      const d = Math.max(0, Math.hypot(mx - eye[0], my - eye[1], mz - eye[2]) - CHUNK / 2);
      if (d > R) continue;
      const rg = d < 90 ? 16 : d < 220 ? 10 : 6;
      const lines = d < 140;
      const s0 = c * CHUNK;
      const station = CHUNK_STATION[c] as number;
      const glow = station >= 0 ? tubeStationGlow(station, t) : 0;
      out.push({
        d,
        gid: mixId(tile, 9300 + c),
        count: (CHUNK / 2.4) * rg + (lines ? 96 : 0),
        weight: station >= 0 ? 1.5 : 1.1,
        probe: [[mx, my, mz]],
        site: (s, o) => glassSite(s0, s, rg, lines, ox, oz, t, station, glow, o),
      });
    }
    for (let i = 0; i < TUBE_PILLARS.length; i++) {
      const p = TUBE_PILLARS[i] as TubePillar;
      const px = p.x + ox;
      const pz = p.z + oz;
      const py = Math.max(GROUND, Math.min(p.top, eye[1]));
      const d = Math.hypot(px - eye[0], py - eye[1], pz - eye[2]);
      if (d > R) continue;
      out.push({
        d,
        gid: mixId(tile, 9500 + i),
        count: PILLAR_SITES,
        weight: 1.2,
        probe: [
          [px, p.top, pz],
          [px, (GROUND + p.top) / 2, pz],
        ],
        site: (s, o) => pillarSite(p, s, ox, oz, o),
      });
    }
    for (let j = 0; j < CAPSULES; j++) {
      for (let car = 0; car < CAPSULE_CARS; car++) {
        const sc = capsuleS(j, car, t);
        tubePoint(sc, scratch);
        const cx = (scratch[0] as number) + ox;
        const cy = scratch[1] as number;
        const cz = (scratch[2] as number) + oz;
        const d = Math.max(0, Math.hypot(cx - eye[0], cy - eye[1], cz - eye[2]) - CAPSULE_LEN);
        if (d > R) continue;
        out.push({
          d,
          gid: mixId(tile * 31 + j, 9700 + car),
          count: CAPSULE_SITES,
          weight: 2.2,
          probe: [[cx, cy, cz]],
          site: (s, o) => capsuleSite(sc, s, ox, oz, o),
        });
      }
    }
  }
}

/* ---------- travel and the map ---------- */

/**
 * Where a trip to tube station k ends (tile-local): over the avenue, a little under the tube, 40
 * along the avenue from the station (toward the plan's middle), facing it.
 */
export function tubeSpot(k: number): TravelSpot {
  const s0 = TUBE_STATIONS[k] ?? (TUBE_STATIONS[0] as number);
  const o = [0, 0, 0];
  tubePoint(s0, o);
  const back = (o[2] as number) < TILE_Z / 2 ? 40 : -40;
  // yaw 0 flies -z, π flies +z.
  return { pos: [0, (o[1] as number) - 6, (o[2] as number) + back], yaw: back > 0 ? 0 : Math.PI };
}

/** The tube's line for the map, tile-local: (x, z) and its height over the street, every few metres. */
export function tubeLine(): [number, number, number][] {
  const line: [number, number, number][] = [];
  for (let s = 0; s < TUBE.n; s += 16)
    line.push([
      TUBE.pos[s * 3] as number,
      TUBE.pos[s * 3 + 2] as number,
      (TUBE.pos[s * 3 + 1] as number) - GROUND,
    ]);
  return line;
}

/** The tube's colour on the map: its glass, a little brighter. */
export const TUBE_MAP_COLOUR = GLASS;

/** The tube's two stations as places on the map, each tapped to fly there. */
export function tubePlaces(): MapPlace[] {
  return TUBE_STATIONS.map((s0, k) => {
    const o = [0, 0, 0];
    tubePoint(s0, o);
    const name = `Tube ${k + 1}`;
    return {
      kind: 'station' as const,
      name,
      x: o[0] as number,
      z: o[2] as number,
      y: (o[1] as number) - GROUND,
      colour: TUBE_MAP_COLOUR,
      go: { metro: 'tube' as const, i: k, name },
    };
  });
}
