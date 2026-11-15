/*
 * The city's cable cars (docs/specs/art-city.md, "Favela boxes and the city's cable cars",
 * 2026-11-15): gondolas gliding on cables between tall lattice pylons, through the strip's canyons
 * and up the favela's first hill. Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "add cable cars inside the city." And over all of it: "Perspective is
 * everything ... perspective is power, and makes it beautiful."
 *
 * Perspective first. Two lines run straight down the long streets near the strip's edges (x -130
 * and 130, one column in from the edge streets), the length of the first three bands, from row 1
 * to row 21: a pylon at every fourth cross street, so flying down either street the pylons recede
 * in a row and the cables scallop between them toward the vanishing point, the cabins strung along
 * them. They stand well off the avenue and the racing corridors (x ±66 to 90), past the river's
 * Heights–Golden bridges, the arch's piers and the Saturn Tower. A third line climbs from the
 * city to the Favela: from a station on the strip's east side down cross street 27, over the edge
 * road and up the first hill to a summit station over its houses.
 *
 * Heights: the city lines' ropes run at 66 over the street (sagging to 62 mid-span), over the
 * street channels (to 35), the loop metro's rail (35 to 45; crossing it, the cabins pass 15 over
 * the trains), the boulevards' flying cars (44) and the corridors' lanes (48), under the tube
 * metro (80 and up), the barge (96) and the express lanes (112, 120); off the darters' lines
 * (x ±52, ±78, ±104). Tested.
 *
 * The cables and cabins are light (the ship flies through them, as through the tube's glass); the
 * pylons are walls, each a thin column from its foot to its head: `cablePylonHolds`, a handful of
 * distance checks. A pylon stands at a street corner, off the car lanes, its arm reaching over the
 * street to carry the ropes down the street's middle. Mellow: cabin windows drift slowly, the ropes'
 * hue leans slowly, the pylons' lamps breathe; nothing flashes.
 */

import { fibonacciSphere, hash, type RGB, type Vec3 } from './bigbang';
import { FAVELA_PYLONS, hillSurface } from './city-favela';
import {
  aroundRect,
  BLOCK_Z,
  C,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  nearest,
  planX,
  STRIP_X,
  TAU,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import type { MapPlace } from './city-minimap';

/* ---------- the lines ---------- */

/**
 * A support of a line, tile-local: its column's foot (x, z, and y over the street), and its head
 * (x, z, y), where the ropes pass, over the street's middle. A station ends a line.
 */
export type CableSupport = {
  fx: number;
  fz: number;
  fy: number;
  hx: number;
  hz: number;
  hy: number;
  station: boolean;
  name: string;
};
export type CableLine = { name: string; tint: RGB; supports: CableSupport[] };

/** The city lines' ropes' height at their heads, over the street. */
export const CITY_HEAD = 66;
/** The cross streets the city lines' pylons stand at: every fourth, row 1 to row 21. */
export const CITY_ROWS = [1, 5, 9, 13, 17, 21];
/** How far a pylon's foot stands off the street's middle, across it and along it (at the corner). */
export const CORNER_X = 3.5;
export const CORNER_Z = 4.5;

const cityLine = (name: string, x: number, side: 1 | -1, tint: RGB): CableLine => ({
  name,
  tint,
  supports: CITY_ROWS.map((J, i) => {
    const station = i === 0 || i === CITY_ROWS.length - 1;
    const z = J * BLOCK_Z + CORNER_Z;
    return {
      fx: x + side * CORNER_X,
      fz: z,
      fy: 0,
      hx: x,
      hz: z,
      hy: CITY_HEAD,
      station,
      name: station ? `${name} ${i === 0 ? 'north' : 'south'}` : `${name} pylon ${i}`,
    };
  }),
});

/** The favela line's way: along cross street 27, from the strip's east side up the first hill. */
export const FAVELA_LINE_Z = 27 * BLOCK_Z;
const annexSupport = (i: number, hy: number, station: boolean, name: string): CableSupport => {
  const [ax, lz] = FAVELA_PYLONS[i] as [number, number];
  const x = STRIP_X / 2 + ax;
  return { fx: x, fz: lz, fy: hillSurface(ax, lz), hx: x, hz: lz, hy, station, name };
};

export const CABLE_LINES: CableLine[] = [
  cityLine('West cable', -130, -1, mix(C.rose, C.ivory, 0.5)),
  cityLine('East cable', 130, 1, mix(C.turquoise, C.ivory, 0.5)),
  {
    name: 'Favela cable',
    tint: mix(C.saffron, C.ivory, 0.45),
    supports: [
      {
        fx: 130 + CORNER_X,
        fz: FAVELA_LINE_Z - CORNER_Z,
        fy: 0,
        hx: 130 + CORNER_X,
        hz: FAVELA_LINE_Z,
        hy: 56,
        station: true,
        name: 'Favela cable city station',
      },
      annexSupport(0, 60, false, 'Favela cable pylon 1'),
      annexSupport(1, 66, false, 'Favela cable pylon 2'),
      annexSupport(2, 71, true, 'Favela summit station'),
    ],
  },
];

/** How far a span sags in its middle, for its length across. */
export const SAG = 0.03;
/** The two ropes of a line stand this far either side of its middle. */
export const ROPE_OFF = 1.2;
/** A cabin hangs this far under its rope; its half sizes; how fast it glides: slowly. */
export const CAR_DROP = 2.4;
export const CAR_HW = 1.0;
export const CAR_HL = 1.3;
export const CAR_HH = 0.9;
export const CAR_SPEED = 2.6;
/** About this far apart, cabin to cabin, round a line's loop. */
const CAR_GAP = 70;

/** A span between two supports, worked out once: ends, unit along, unit across, length across and in all. */
type Span = {
  a: Vec3;
  b: Vec3;
  ux: number;
  uz: number;
  px: number;
  pz: number;
  hl: number;
  len: number;
};
type LineGeo = { spans: Span[]; cum: number[]; length: number; loop: number; cars: number };

export const LINE_GEO: LineGeo[] = CABLE_LINES.map((L) => {
  const spans: Span[] = [];
  for (let i = 0; i + 1 < L.supports.length; i++) {
    const A = L.supports[i] as CableSupport;
    const B = L.supports[i + 1] as CableSupport;
    const hl = Math.hypot(B.hx - A.hx, B.hz - A.hz) || 1;
    spans.push({
      a: [A.hx, A.hy, A.hz],
      b: [B.hx, B.hy, B.hz],
      ux: (B.hx - A.hx) / hl,
      uz: (B.hz - A.hz) / hl,
      px: -(B.hz - A.hz) / hl,
      pz: (B.hx - A.hx) / hl,
      hl,
      len: Math.hypot(hl, B.hy - A.hy),
    });
  }
  const cum = [0];
  for (const s of spans) cum.push((cum[cum.length - 1] as number) + s.len);
  const length = cum[cum.length - 1] as number;
  // Out on one rope, round the end station's wheel, back on the other, round the first's.
  const loop = 2 * length + 2 * Math.PI * ROPE_OFF;
  return { spans, cum, length, loop, cars: Math.max(3, Math.round(loop / CAR_GAP)) };
});

/** Span `j` of line `l`'s rope `side` (-1, 0 the middle, 1) at s (0..1), into o[0..2]: tile-local, y over the street. */
export function ropeInto(l: number, j: number, s: number, side: number, o: number[]): void {
  const g = (LINE_GEO[l] as LineGeo).spans[j] as Span;
  o[0] = lerp(g.a[0], g.b[0], s) + g.px * side * ROPE_OFF;
  o[1] = lerp(g.a[1], g.b[1], s) - 4 * SAG * g.hl * s * (1 - s);
  o[2] = lerp(g.a[2], g.b[2], s) + g.pz * side * ROPE_OFF;
}

/** The point `d` along line l (0 at its first station) on rope `side`, into o; and the span's unit along, into o[3..4]. */
function alongInto(l: number, d: number, side: number, o: number[]): void {
  const G = LINE_GEO[l] as LineGeo;
  let j = 0;
  while (j < G.spans.length - 1 && (G.cum[j + 1] as number) <= d) j++;
  const sp = G.spans[j] as Span;
  const s = Math.min(1, Math.max(0, (d - (G.cum[j] as number)) / sp.len));
  ropeInto(l, j, s, side, o);
  o[3] = sp.ux;
  o[4] = sp.uz;
}

/**
 * Cabin k of line l at time t: its middle (tile-local, y over the street) and its heading (ux, uz),
 * into o[0..4]. Out along the +1 rope, round the end station's wheel (a half circle, no jump), back
 * along the -1 rope and round the first station's: all at one slow pace, evenly spaced, a formula
 * of the time, nothing kept.
 */
export function cabinInto(l: number, k: number, t: number, o: number[]): void {
  const G = LINE_GEO[l] as LineGeo;
  const R = ROPE_OFF;
  const p = wrap(t * CAR_SPEED + (k * G.loop) / G.cars + hash(l, 1611) * G.loop, G.loop);
  const L = G.length;
  const turn = Math.PI * R;
  if (p < L) alongInto(l, p, 1, o);
  else if (p < L + turn) {
    // Round the end station's wheel: from the +1 rope to the -1 rope.
    const sp = G.spans[G.spans.length - 1] as Span;
    const th = (p - L) / R;
    const c = Math.cos(th) * R;
    const s = Math.sin(th) * R;
    o[0] = sp.b[0] + sp.px * c + sp.ux * s;
    o[1] = sp.b[1];
    o[2] = sp.b[2] + sp.pz * c + sp.uz * s;
    o[3] = sp.px * -Math.sin(th) + sp.ux * Math.cos(th);
    o[4] = sp.pz * -Math.sin(th) + sp.uz * Math.cos(th);
  } else if (p < 2 * L + turn) {
    alongInto(l, L - (p - L - turn), -1, o);
    o[3] = -(o[3] as number);
    o[4] = -(o[4] as number);
  } else {
    // Round the first station's wheel: from the -1 rope back to the +1.
    const sp = G.spans[0] as Span;
    const th = (p - 2 * L - turn) / R;
    const c = Math.cos(th) * R;
    const s = Math.sin(th) * R;
    o[0] = sp.a[0] - sp.px * c - sp.ux * s;
    o[1] = sp.a[1];
    o[2] = sp.a[2] - sp.pz * c - sp.uz * s;
    o[3] = sp.px * Math.sin(th) - sp.ux * Math.cos(th);
    o[4] = sp.pz * Math.sin(th) - sp.uz * Math.cos(th);
  }
  o[1] = (o[1] as number) - CAR_DROP;
}

/* ---------- the pylons: walls ---------- */

/** A pylon's column's radius as a wall (a station stands on the same lattice column). */
export const PYLON_R = 1.1;

const SUPPORTS: CableSupport[] = CABLE_LINES.flatMap((L) => L.supports);

/**
 * Whether a point is inside a pylon's or a station's column, `m` round it (the cables, cabins and a
 * station's deck and roof are light).
 */
export function cablePylonHolds(q: Vec3, m: number): boolean {
  const lx = planX(q[0]);
  const lz = wrap(q[2], TILE_Z);
  const y = q[1] - GROUND;
  for (let i = 0; i < SUPPORTS.length; i++) {
    const S = SUPPORTS[i] as CableSupport;
    const r = PYLON_R + m;
    const dx = lx - S.fx;
    const dz = lz - S.fz;
    if (dx > r || dx < -r || dz > r || dz < -r) continue;
    if (y > S.hy + 1.2 + m || y < S.fy - m) continue;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

/* ---------- drawn ---------- */

const tint = (o: number[], c: RGB, k: number) => {
  o[3] = c[0] * k;
  o[4] = c[1] * k;
  o[5] = c[2] * k;
};

/** Sites in a pylon, a station (its pylon and more), a cabin. */
export const PYLON_SITES = 120;
export const STATION_SITES = 176;
export const CAR_SITES = 44;

/**
 * Site s of support S (its line running along (ux, uz) there) into o, at the tile copy (ox, oz): a
 * lattice pylon of four legs tapering up, a zigzag brace on two faces, an arm from its top over the
 * street to the ropes, a crossbar there carrying them, and a lamp on top. A station adds a deck
 * where the cabins turn, a roof over it, the bullwheel and warm lamps under the roof.
 */
export function supportSite(
  S: CableSupport,
  ux: number,
  uz: number,
  s: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): boolean {
  const breath = 0.9 + 0.1 * Math.sin(0.25 * t + S.hz * 0.05);
  const top = S.hy + 0.6;
  const px = -uz;
  const pz = ux;
  let x = S.fx;
  let z = S.fz;
  let y: number;
  if (s < 64) {
    // Four legs, wide at the foot, narrow at the top.
    const leg = s >> 4;
    const f = ((s & 15) + 0.5) / 16;
    const w = lerp(1.1, 0.45, f);
    x += (leg & 1 ? w : -w) * ux + (leg & 2 ? w : -w) * px;
    z += (leg & 1 ? w : -w) * uz + (leg & 2 ? w : -w) * pz;
    y = lerp(S.fy, top, f);
    tint(o, C.steel, (0.18 + 0.14 * f) * breath);
  } else if (s < 88) {
    // A zigzag brace up two faces.
    const q = s - 64;
    const face = q < 12 ? -1 : 1;
    const f = ((q % 12) + 0.5) / 12;
    const w = lerp(1.1, 0.45, f);
    const zig = Math.abs(((f * 5) % 2) - 1) * 2 - 1;
    x += face * w * px + zig * w * ux;
    z += face * w * pz + zig * w * uz;
    y = lerp(S.fy, top, f);
    tint(o, C.steel, 0.16 * breath);
  } else if (s < 98) {
    // The arm, from the pylon's top over the street to the ropes' head.
    const len = Math.hypot(S.hx - S.fx, S.hz - S.fz);
    if (len < 0.5) return false;
    const f = (s - 88 + 0.5) / 10;
    x = lerp(S.fx, S.hx, f);
    z = lerp(S.fz, S.hz, f);
    y = top;
    tint(o, C.ivory, 0.32 * breath);
  } else if (s < 110) {
    // The crossbar at the head, across the line, carrying the two ropes.
    const f = ((s - 98 + 0.5) / 12) * 2 - 1;
    x = S.hx + px * f * (ROPE_OFF + 0.6);
    z = S.hz + pz * f * (ROPE_OFF + 0.6);
    y = S.hy + 0.3;
    tint(o, C.ivory, 0.36 * breath);
  } else if (s < PYLON_SITES) {
    // A lamp on top, breathing slowly.
    const q = fibonacciSphere(s - 110, 10);
    x += q[0] * 0.35;
    z += q[2] * 0.35;
    y = top + 0.9 + q[1] * 0.35;
    tint(o, mix(C.red, C.amber, 0.5), 0.55 * breath);
  } else {
    if (!S.station) return false;
    const q = s - PYLON_SITES;
    let a = 0;
    let b = 0;
    if (q < 20) {
      // The deck the cabins turn over, at their floor.
      [a, b] = aroundRect(((q + 0.5) / 20) * 4 * (4 + 3), 4, 3);
      y = S.hy - CAR_DROP - CAR_HH - 0.3;
      tint(o, C.ivory, 0.34 * breath);
    } else if (q < 36) {
      // Its roof.
      [a, b] = aroundRect(((q - 20 + 0.5) / 16) * 4 * (4.5 + 3.4), 4.5, 3.4);
      y = S.hy + 1.6;
      tint(o, C.ivory, 0.38 * breath);
    } else if (q < 48) {
      // The bullwheel the ropes turn round.
      const th = ((q - 36) / 12) * TAU + 0.05 * t;
      a = Math.sin(th) * ROPE_OFF;
      b = Math.cos(th) * ROPE_OFF;
      y = S.hy;
      tint(o, C.white, 0.34 * breath);
    } else {
      // Warm lamps under the roof.
      [a, b] = aroundRect(((q - 48 + 0.5) / 8) * 4 * (3.6 + 2.6), 3.6, 2.6);
      y = S.hy + 1.1;
      tint(o, C.warm, 0.6 * breath);
    }
    x = S.hx + a * ux + b * px;
    z = S.hz + a * uz + b * pz;
  }
  o[0] = ox + x;
  o[1] = GROUND + y;
  o[2] = oz + z;
  return true;
}

/**
 * Site s of a cabin hanging at (cx, cy, cz) (tile-local, y over the street), heading (ux, uz), into
 * o at the tile copy (ox, oz): its hanger and grip, its roof's and floor's rims, its corner posts,
 * and its windows, warm, drifting slowly. Its body in its line's tint.
 */
export function cabinSite(
  cx: number,
  cy: number,
  cz: number,
  ux: number,
  uz: number,
  body: RGB,
  ph: number,
  s: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): boolean {
  let a = 0;
  let b = 0;
  let h = 0;
  if (s < 4) {
    h = CAR_HH + ((s + 0.5) / 4) * (CAR_DROP - CAR_HH);
    tint(o, C.steel, 0.3);
  } else if (s < 24) {
    const q = s - 4;
    [a, b] = aroundRect((((q % 10) + 0.5) / 10) * 4 * (CAR_HL + CAR_HW), CAR_HL, CAR_HW);
    h = q < 10 ? CAR_HH : -CAR_HH;
    tint(o, body, 0.42);
  } else if (s < 32) {
    const q = s - 24;
    const c = q >> 1;
    a = (c & 1 ? 1 : -1) * CAR_HL;
    b = (c & 2 ? 1 : -1) * CAR_HW;
    h = q & 1 ? 0.35 : -0.35;
    tint(o, body, 0.38);
  } else if (s < 40) {
    // Four windows a side, warm.
    const q = s - 32;
    a = ((q & 3) - 1.5) * 0.6;
    b = (q < 4 ? 1 : -1) * (CAR_HW + 0.05);
    h = 0.15;
    tint(o, C.warm, 0.6 * (0.88 + 0.12 * Math.sin(0.3 * t + ph + q)));
  } else {
    // The grip on the rope.
    const q = s - 40;
    a = (q - 1.5) * 0.25;
    h = CAR_DROP;
    tint(o, C.steel, 0.34);
  }
  o[0] = ox + cx + ux * a - uz * b;
  o[1] = GROUND + cy + h;
  o[2] = oz + cz + uz * a + ux * b;
  return true;
}

/** Each support's line heading (the span beside it), worked out once. */
const HEADINGS: [number, number][][] = CABLE_LINES.map((L, l) =>
  L.supports.map((_, i) => {
    const sp = (LINE_GEO[l] as LineGeo).spans[Math.min(i, L.supports.length - 2)] as Span;
    return [sp.ux, sp.uz];
  }),
);
const scratch = [0, 0, 0, 0, 0];

/** How far a point is from the eye, over the nearest tile copy; and that copy's shift, into SH. */
const SH = [0, 0];
function copyD(x: number, y: number, z: number, eye: Vec3): number {
  const nx = nearest(x, eye[0], TILE_X);
  const nz = nearest(z, eye[2], TILE_Z);
  SH[0] = nx - x;
  SH[1] = nz - z;
  return Math.hypot(nx - eye[0], GROUND + y - eye[1], nz - eye[2]);
}

/**
 * The cable cars within sight (R), as the Ship's items: each span's two ropes, each pylon and
 * station, each cabin, at the tile copy nearest the eye. The renderer thins them with the distance
 * like everything else, so far down a street the ropes and pylons become a dotted, receding line.
 */
export function cableCarItems(eye: Vec3, t: number, R: number, out: Item[]): void {
  CABLE_LINES.forEach((L, l) => {
    const G = LINE_GEO[l] as LineGeo;
    G.spans.forEach((sp, j) => {
      const mx = (sp.a[0] + sp.b[0]) / 2;
      const mz = (sp.a[2] + sp.b[2]) / 2;
      const dMid = copyD(mx, (sp.a[1] + sp.b[1]) / 2, mz, eye);
      const d = Math.max(0, dMid - sp.len / 2);
      if (d > R) return;
      const ox = SH[0] as number;
      const oz = SH[1] as number;
      const n = Math.ceil(sp.len / 1.4);
      const lean = 0.5 + 0.5 * Math.sin(0.04 * t + l + j * 0.3);
      const rope = mix(C.white, C.steel, lean);
      out.push({
        d,
        gid: mixId(l * 16 + j, 76100),
        count: 2 * n,
        weight: 1.1,
        site: (s, o) => {
          ropeInto(l, j, ((s % n) + 0.5) / n, s < n ? 1 : -1, o);
          o[0] = ox + (o[0] as number);
          o[1] = GROUND + (o[1] as number);
          o[2] = oz + (o[2] as number);
          tint(o, rope, 0.28);
          return true;
        },
      });
    });
    L.supports.forEach((S, i) => {
      const d = Math.max(
        0,
        copyD(S.fx, Math.min(S.hy, Math.max(S.fy, eye[1] - GROUND)), S.fz, eye) - 2,
      );
      if (d > R) return;
      const ox = SH[0] as number;
      const oz = SH[1] as number;
      const [ux, uz] = (HEADINGS[l] as [number, number][])[i] as [number, number];
      out.push({
        d,
        gid: mixId(l * 16 + i, 76200),
        count: S.station ? STATION_SITES : PYLON_SITES,
        weight: S.station ? 1.4 : 1.2,
        site: (s, o) => supportSite(S, ux, uz, s, t, ox, oz, o),
      });
    });
    for (let k = 0; k < G.cars; k++) {
      cabinInto(l, k, t, scratch);
      const cx = scratch[0] as number;
      const cy = scratch[1] as number;
      const cz = scratch[2] as number;
      const ux = scratch[3] as number;
      const uz = scratch[4] as number;
      const d = Math.max(0, copyD(cx, cy, cz, eye) - 2);
      if (d > R) continue;
      const ox = SH[0] as number;
      const oz = SH[1] as number;
      const ph = TAU * hash(l * 64 + k, 1612);
      out.push({
        d,
        gid: mixId(l * 64 + k, 76300),
        count: CAR_SITES,
        weight: 1.8,
        site: (s, o) => cabinSite(cx, cy, cz, ux, uz, L.tint, ph, s, t, ox, oz, o),
      });
    }
  });
}

/* ---------- the map ---------- */

/** The stations as places on the map (marks, named, as the Mountain quarter's cable stations). */
export function cablePlaces(): MapPlace[] {
  return SUPPORTS.filter((S) => S.station).map((S) => ({
    kind: 'cable' as const,
    name: S.name,
    x: S.hx,
    z: S.hz,
    y: S.hy,
    colour: C.white,
  }));
}
