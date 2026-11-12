/*
 * The City game's sky (docs/specs/art-city.md, "Game design"): stars, three constellations you
 * can find (Orion, the Big Dipper, Cassiopeia, from their real stars' places), a few satellites
 * slowly crossing, two stations high over the city (a turning ring, a platform), and the golden
 * spire's beacon, seen from anywhere in the city. Brighter the higher you fly. Pure.
 *
 * 2026-11-12: "stars and constellations. a few satellites in the sky or sky stations."
 */

import { fibonacciSphere, hash, type RGB, type Vec3 } from './bigbang';
import { SPIRE, SPIRE_H } from './city-game';
import { C, GROUND, mix, nearest, scale, TAU, TILE_X, TILE_Z } from './city-grid';

/** A star by its right ascension (hours) and declination (degrees), the public catalogue's. */
type Star = { name: string; ra: number; dec: number; mag: number };
export const CONSTELLATIONS: { name: string; stars: Star[]; lines: [number, number][] }[] = [
  {
    name: 'Orion',
    stars: [
      { name: 'Betelgeuse', ra: 5.919, dec: 7.41, mag: 0.5 },
      { name: 'Bellatrix', ra: 5.419, dec: 6.35, mag: 1.6 },
      { name: 'Alnitak', ra: 5.679, dec: -1.94, mag: 1.8 },
      { name: 'Alnilam', ra: 5.604, dec: -1.2, mag: 1.7 },
      { name: 'Mintaka', ra: 5.533, dec: -0.3, mag: 2.2 },
      { name: 'Saiph', ra: 5.796, dec: -9.67, mag: 2.1 },
      { name: 'Rigel', ra: 5.242, dec: -8.2, mag: 0.1 },
      { name: 'Meissa', ra: 5.585, dec: 9.93, mag: 3.4 },
    ],
    lines: [
      [7, 0],
      [7, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
    ],
  },
  {
    name: 'Big Dipper',
    stars: [
      { name: 'Dubhe', ra: 11.062, dec: 61.75, mag: 1.8 },
      { name: 'Merak', ra: 11.031, dec: 56.38, mag: 2.4 },
      { name: 'Phecda', ra: 11.897, dec: 53.69, mag: 2.4 },
      { name: 'Megrez', ra: 12.257, dec: 57.03, mag: 3.3 },
      { name: 'Alioth', ra: 12.9, dec: 55.96, mag: 1.8 },
      { name: 'Mizar', ra: 13.399, dec: 54.93, mag: 2.2 },
      { name: 'Alkaid', ra: 13.792, dec: 49.31, mag: 1.9 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: 'Cassiopeia',
    stars: [
      { name: 'Caph', ra: 0.153, dec: 59.15, mag: 2.3 },
      { name: 'Schedar', ra: 0.675, dec: 56.54, mag: 2.2 },
      { name: 'Navi', ra: 0.945, dec: 60.72, mag: 2.4 },
      { name: 'Ruchbah', ra: 1.43, dec: 60.24, mag: 2.7 },
      { name: 'Segin', ra: 1.907, dec: 63.67, mag: 3.4 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
];
const LAT = (50 * Math.PI) / 180;

/**
 * Where a star stands in the sky at time t: a unit direction (north is -z, east +x, up +y). The
 * sky turns a little, slowly, round Orion's hour, so all three stay up.
 */
export function starDir(ra: number, dec: number, t: number): Vec3 {
  const lst = 5.6 + 1.6 * Math.sin((TAU * t) / 900);
  const H = ((lst - ra) / 24) * TAU;
  const d = (dec * Math.PI) / 180;
  const alt = Math.asin(Math.sin(d) * Math.sin(LAT) + Math.cos(d) * Math.cos(LAT) * Math.cos(H));
  const az = Math.atan2(
    -Math.cos(d) * Math.sin(H),
    Math.sin(d) * Math.cos(LAT) - Math.cos(d) * Math.sin(LAT) * Math.cos(H),
  );
  return [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)];
}

const ALL = CONSTELLATIONS.flatMap((c) => c.stars);
const LINES = CONSTELLATIONS.flatMap((c, k) => {
  const base = CONSTELLATIONS.slice(0, k).reduce((s, q) => s + q.stars.length, 0);
  return c.lines.map(([a, b]) => [a + base, b + base] as [number, number]);
});

/** The stations high over the city, tile-local; they repeat with the plan. */
export const STATIONS_SKY = [
  { kind: 'ring' as const, at: [110, GROUND + 360, 420] as Vec3, r: 34 },
  { kind: 'deck' as const, at: [-150, GROUND + 300, 1180] as Vec3, r: 18 },
];

type Spot = { pos: Vec3; rgb: RGB };
const sats = 3;

/**
 * Sky grain L of n at time t, round the ship at c, the sky's radius R, `high` (0..1) how far up
 * the stratosphere you are (the stars brighter): stars and constellations first, then satellites,
 * the spire's beacon (when it is far off) and the stations.
 */
export function skyGrain(L: number, n: number, c: Vec3, R: number, high: number, t: number): Spot {
  const bright = 0.7 + 0.6 * high;
  const dome = (d: Vec3, k: number, rgb: RGB): Spot => ({
    pos: [c[0] + d[0] * R, c[1] + d[1] * R, c[2] + d[2] * R],
    rgb: d[1] > 0.02 || high > 0.3 ? scale(rgb, k * bright) : [0, 0, 0],
  });
  const plain = Math.min(60, Math.floor(n * 0.2));
  if (L < plain) {
    const d = fibonacciSphere(L * 7 + 3, plain * 7);
    const up: Vec3 = [d[0], Math.abs(d[1]) * 0.9 + 0.08, d[2]];
    const l = Math.hypot(up[0], up[1], up[2]);
    const tw = 0.75 + 0.25 * Math.sin(t * 0.9 + L * 0.37);
    return dome([up[0] / l, up[1] / l, up[2] / l], 0.3 * tw, mix(C.white, C.violet, hash(L, 1)));
  }
  let m = L - plain;
  // The constellations: each star three grains, brighter for brighter stars; their figures faint.
  if (m < ALL.length * 3) {
    const s = ALL[Math.floor(m / 3)] as Star;
    const d = starDir(s.ra, s.dec, t);
    const k = 0.75 - 0.12 * s.mag;
    const j = (m % 3) * 0.0012;
    return dome([d[0] + j, d[1], d[2] - j], k, C.white);
  }
  m -= ALL.length * 3;
  const lineGrains = 60;
  if (m < lineGrains) {
    const [a, b] = LINES[m % LINES.length] as [number, number];
    const u = (Math.floor(m / LINES.length) + 1) / (Math.ceil(lineGrains / LINES.length) + 1);
    const A = ALL[a] as Star;
    const B = ALL[b] as Star;
    const da = starDir(A.ra, A.dec, t);
    const db = starDir(B.ra, B.dec, t);
    const v: Vec3 = [
      da[0] + (db[0] - da[0]) * u,
      da[1] + (db[1] - da[1]) * u,
      da[2] + (db[2] - da[2]) * u,
    ];
    const l = Math.hypot(v[0], v[1], v[2]);
    return dome([v[0] / l, v[1] / l, v[2] / l], 0.09, C.cyan);
  }
  m -= lineGrains;
  // Satellites: a body and two panels, slowly crossing on their own great circles, a soft glow.
  if (m < sats * 6) {
    const j = Math.floor(m / 6);
    const q = m % 6;
    const tilt = 0.6 + j * 0.9;
    const a = t * (0.012 + 0.006 * j) + j * 2.1;
    const n0: Vec3 = [Math.sin(tilt), Math.cos(tilt), 0.3 * j];
    const e1: Vec3 = [Math.cos(tilt), -Math.sin(tilt), 0];
    const e2: Vec3 = [
      n0[1] * e1[2] - n0[2] * e1[1],
      n0[2] * e1[0] - n0[0] * e1[2],
      n0[0] * e1[1] - n0[1] * e1[0],
    ];
    const l2 = Math.hypot(e2[0], e2[1], e2[2]) || 1;
    const d: Vec3 = [
      e1[0] * Math.cos(a) + (e2[0] / l2) * Math.sin(a),
      e1[1] * Math.cos(a) + (e2[1] / l2) * Math.sin(a),
      e1[2] * Math.cos(a) + (e2[2] / l2) * Math.sin(a),
    ];
    const off = q === 0 ? 0 : (q < 3 ? -1 : 1) * (0.004 + 0.003 * (q % 3));
    const g = 0.75 + 0.25 * Math.sin(t * 1.2 + j * 2);
    return dome(
      [d[0] + off, d[1], d[2] - off],
      q === 0 ? 0.6 * g : 0.25,
      q === 0 ? C.warm : C.steel,
    );
  }
  m -= sats * 6;
  // The golden spire's beacon, from anywhere: its shaft and its sphere, when it is beyond sight.
  const beacon = 40;
  if (m < beacon) {
    const x = nearest(SPIRE.x, c[0], TILE_X);
    const z = nearest(SPIRE.z, c[2], TILE_Z);
    const far = Math.hypot(x - c[0], z - c[2]) > 175;
    if (!far) return { pos: [x, GROUND, z], rgb: [0, 0, 0] };
    if (m < 28)
      return { pos: [x, GROUND + (SPIRE_H * (m + 0.5)) / 28, z], rgb: scale(C.gold, 0.35) };
    const a = ((m - 28) / 12) * TAU + t * 0.05;
    return {
      pos: [x + Math.cos(a) * 9, GROUND + SPIRE_H + 9, z + Math.sin(a) * 9],
      rgb: scale(C.gold, 0.55),
    };
  }
  m -= beacon;
  // The stations share what is left.
  const rest = Math.max(1, n - plain - ALL.length * 3 - lineGrains - sats * 6 - beacon);
  const half = Math.ceil(rest / 2);
  const which = m < half ? 0 : 1;
  const q = which ? m - half : m;
  const per = which ? rest - half : half;
  const S = STATIONS_SKY[which] as (typeof STATIONS_SKY)[number];
  const at: Vec3 = [nearest(S.at[0], c[0], TILE_X), S.at[1], nearest(S.at[2], c[2], TILE_Z)];
  const u = (q + 0.5) / Math.max(1, per);
  if (S.kind === 'ring') {
    // A turning ring, four spokes to a hub, lights round its rim.
    const spin = t * 0.04;
    if (u < 0.7) {
      const a = (u / 0.7) * TAU + spin;
      return {
        pos: [at[0] + Math.cos(a) * S.r, at[1] + Math.sin(a * 3) * 0.6, at[2] + Math.sin(a) * S.r],
        rgb: scale(q % 5 === 0 ? C.warm : C.steel, q % 5 === 0 ? 0.6 : 0.3),
      };
    }
    if (u < 0.92) {
      const k = Math.floor(((u - 0.7) / 0.22) * 4);
      const v = frac4(((u - 0.7) / 0.22) * 4);
      const a = (k / 4) * TAU + spin;
      return {
        pos: [at[0] + Math.cos(a) * S.r * v, at[1], at[2] + Math.sin(a) * S.r * v],
        rgb: scale(C.steel, 0.25),
      };
    }
    const d = fibonacciSphere(q % 20, 20);
    return { pos: [at[0] + d[0] * 4, at[1] + d[1] * 4, at[2] + d[2] * 4], rgb: scale(C.cyan, 0.5) };
  }
  // A platform: a hexagonal deck, its rim lights chasing slowly round, a mast with a beacon.
  if (u < 0.75) {
    const v = (u / 0.75) * 6;
    const k = Math.floor(v);
    const f = v - k;
    const a0 = (k / 6) * TAU;
    const a1 = ((k + 1) / 6) * TAU;
    const chase = 0.5 + 0.5 * Math.sin(u * TAU * 6 - t * 0.6);
    return {
      pos: [
        at[0] + S.r * (Math.cos(a0) * (1 - f) + Math.cos(a1) * f),
        at[1],
        at[2] + S.r * (Math.sin(a0) * (1 - f) + Math.sin(a1) * f),
      ],
      rgb: scale(mix(C.amber, C.warm, chase), 0.25 + 0.3 * chase),
    };
  }
  const v = (u - 0.75) / 0.25;
  return {
    pos: [at[0], at[1] + v * 14, at[2]],
    rgb: scale(v > 0.95 ? C.red : C.steel, v > 0.95 ? 0.6 : 0.25),
  };
}
const frac4 = (x: number) => x - Math.floor(x);
