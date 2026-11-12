/*
 * TEN GOLDEN PLANS — more round cities from above, in the Golden plan's style
 * (docs/specs/art-city.md, "Ten golden plans").
 *
 * 2026-11-12: "the golden plan design is amazing, do 10 like this that represent different
 * cities, or the different quartiers etc..."
 *
 * Each plan is a city about 55 across its radius, flat on the ground, grown from one simple
 * rule (PLAN_RULES, the spec carries the same words) and drawn with the same kit as the Golden
 * plan: ring roads, boulevards with travellers walking slowly along them, canals with arched
 * bridges, lit blocks thicker toward the heart, woods and fields at the rim, a sunflower heart.
 *
 * Pure: no three.js, no DOM.
 */

import { GOLDEN_ANGLE, hash, type Vec3 } from './bigbang';
import { Anim, GROUND_Y, Mesh, PHI, Tone } from './grain-mesh';

const TAU = Math.PI * 2;
const G = GROUND_Y;
const { road, edge, light, water, plant, face, ground } = Tone;

/** How far out every plan reaches. */
export const PLAN_R = 55;

/* ---------- the kit: the Golden plan's few forms ---------- */

export const polar = (r: number, a: number, y = G): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
const circlePts = (r: number, y = G) =>
  Mesh.circle([0, y, 0], r, Math.max(24, Math.ceil(TAU * r * 0.8)));
type Keep = (x: number, z: number) => boolean;
const anywhere: Keep = () => true;

/** A sunflower heart: florets on the golden angle out to r. */
export function florets(m: Mesh, r: number, n = 233) {
  for (let i = 0; i < n; i++)
    m.dot(polar(r * Math.sqrt((i + 0.5) / n), i * GOLDEN_ANGLE, G + 0.05), 0.08, light, {
      w: 0.05,
    });
}
export function ringRoad(m: Mesh, r: number, w = 1, tone: number = road) {
  m.poly(circlePts(r), true, tone, { w });
}
/** A boulevard along a polyline, with travellers walking slowly along it both ways. */
export function boulevard(m: Mesh, pts: Vec3[], w = 1.6) {
  m.poly(pts, false, road, { w });
  for (const [s, rev] of [
    [0.35, false],
    [-0.35, true],
  ] as [number, boolean][]) {
    const off = pts.map((q, i) => {
      const a = pts[Math.max(0, i - 1)] as Vec3;
      const b = pts[Math.min(pts.length - 1, i + 1)] as Vec3;
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const l = Math.hypot(dx, dz) || 1;
      return [q[0] - (dz / l) * s, q[1] + 0.05, q[2] + (dx / l) * s] as Vec3;
    });
    m.poly(rev ? off.reverse() : off, false, light, { anim: Anim.flow, key: 2.2, w: 0.45 });
  }
}
/** A straight boulevard out from r0 to r1 at angle a. */
export const spoke = (m: Mesh, a: number, r0: number, r1: number, w = 1.6) =>
  boulevard(m, [polar(r0, a), polar(r1, a)], w);
/** A canal ring from r0 to r1: water, its banks, and an arched bridge at each of `bridges` angles. */
export function canal(m: Mesh, r0: number, r1: number, bridges: number[]) {
  m.poly(circlePts(r0), true, edge);
  m.poly(circlePts(r1), true, edge);
  m.disc([0, G, 0], r1, water, r0, { w: 0.6 });
  for (const a of bridges)
    m.poly(
      Array.from({ length: 9 }, (_, j) =>
        polar(r0 + ((r1 - r0) * j) / 8, a, G + Math.sin((Math.PI * j) / 8) * (r1 - r0) * 0.45),
      ),
      false,
      edge,
      { w: 1.5 },
    );
}
/** Lit blocks: soft dots from r0 to r1, more toward the heart, only where `keep` says. */
export function lit(
  m: Mesh,
  r0: number,
  r1: number,
  n: number,
  seed: number,
  keep: Keep = anywhere,
) {
  for (let j = 0; j < n; j++) {
    const r = r0 + (r1 - r0) * Math.sqrt(hash(j, seed));
    const a = hash(j, seed + 1) * TAU;
    const q = polar(r, a, G + 0.05);
    if (keep(q[0], q[2])) m.dot(q, 0.45, face, { w: Math.exp(-r / 18) });
  }
}
/** Woods: trees as soft green dots from r0 to r1, where `keep` says. */
export function woods(
  m: Mesh,
  r0: number,
  r1: number,
  n: number,
  seed: number,
  keep: Keep = anywhere,
) {
  for (let j = 0; j < n; j++) {
    const r = r0 + (r1 - r0) * hash(j, seed);
    const q = polar(r, hash(j, seed + 1) * TAU, G + 0.3);
    if (keep(q[0], q[2])) m.dot(q, 0.5 + 0.6 * hash(j, seed + 2), plant, { w: 0.5 });
  }
}
/** Fields: lines out across the rim. */
function fields(m: Mesh, r0: number, r1: number, n: number, keep: Keep = anywhere) {
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU;
    const q = polar(r0, a);
    if (keep(q[0], q[2])) m.line(q, polar(r1, a), ground, { w: 0.6 });
  }
}
/** Towers seen from above: short upright points of light. */
function towers(m: Mesh, r: number, n: number, off = 0.5) {
  for (let j = 0; j < n; j++) {
    const q = polar(r, ((j + off) / n) * TAU);
    m.line(q, [q[0], G + 2.4, q[2]], light, { w: 1.5 });
  }
}
const heart = (m: Mesh) => {
  m.centre = [0, G - 10, 0];
};

/* ---------- the ten ---------- */

/** Sunflower: 987 blocks on the golden angle (r = 52√(n/987)), streets along the 21 and 34 spirals that link them. */
function sunflower(m: Mesh) {
  heart(m);
  const N = 987;
  const at = (n: number) => polar(52 * Math.sqrt((n + 0.5) / N), n * GOLDEN_ANGLE, G + 0.05);
  florets(m, 4, 144);
  for (let n = 0; n < N; n++) {
    const q = at(n);
    const r = Math.hypot(q[0], q[2]);
    if (r < 4.5) continue;
    m.dot(q, 0.35, n % 13 ? face : light, { w: Math.exp(-r / 22) * (n % 13 ? 1 : 2) });
    for (const step of [21, 34])
      if (n + step < N) m.line(q, at(n + step), r < 26 ? road : edge, { w: 0.35 });
  }
  ringRoad(m, 53.5, 1.2);
  // Seven of the thirteen spiral arms (florets n, n + 13, n + 26, …) as boulevards, walked by travellers.
  for (let k = 0; k < 13; k += 2) {
    const pts = Array.from({ length: Math.floor((N - 1 - k) / 13) + 1 }, (_, i) => at(k + 13 * i));
    boulevard(
      m,
      pts.filter((q) => Math.hypot(q[0], q[2]) > 4.5),
      0.9,
    );
  }
  woods(m, 54, 58, 160, 701);
}

/** Atlantis: rings of land and water of equal width out from an island (water 6–9, 17–21, 33–38), one canal straight in from the sea, bridges on four axes. */
function atlantis(m: Mesh) {
  heart(m);
  florets(m, 5.5);
  m.poly(circlePts(6), true, edge, { w: 1.5 });
  towers(m, 3.5, 6);
  const rings: [number, number][] = [
    [6, 9],
    [17, 21],
    [33, 38],
  ];
  for (const [a, b] of rings) canal(m, a, b, [Math.PI / 2, Math.PI, 1.5 * Math.PI]);
  // The canal from the sea: a straight cut along a = 0 through every ring.
  m.quad([6, G + 0.01, -1.2], [PLAN_R - 6, 0, 0], [0, 0, 2.4], water, { w: 0.8 });
  for (const z of [-1.2, 1.2]) m.line([6, G + 0.05, z], [PLAN_R, G + 0.05, z], edge, { w: 1 });
  const land: [number, number][] = [
    [9, 17],
    [21, 33],
    [38, PLAN_R],
  ];
  for (const [a, b] of land) {
    ringRoad(m, (a + b) / 2, 0.7);
    m.poly(circlePts(a + 0.4), true, edge, { w: 0.9 });
  }
  const offCanal: Keep = (x, z) => !(x > 0 && Math.abs(z) < 2);
  lit(m, 9, 17, 260, 711, offCanal);
  lit(m, 21, 33, 420, 713, offCanal);
  woods(m, 40, PLAN_R, 200, 715, offCanal);
  fields(m, 40, PLAN_R, 24, offCanal);
  for (const a of [Math.PI / 2, Math.PI, 1.5 * Math.PI]) spoke(m, a, 6, PLAN_R, 1.4);
  towers(m, 27, 24);
}

/** Twelve gates: a round wall (r = 44) with twelve gates, a boulevard from the heart out through each, ring roads at 14 and 28, woods outside. */
function twelveGates(m: Mesh) {
  heart(m);
  florets(m, 6);
  ringRoad(m, 6.5, 1.2, edge);
  for (const r of [43.2, 44.8]) ringRoad(m, r, 1.4, edge);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    spoke(m, a, 6.5, PLAN_R);
    // The gate: a tower each side of the road.
    for (const s of [-1, 1]) {
      const q = polar(44, a + (s * 1.6) / 44);
      m.line(q, [q[0], G + 2.6, q[2]], light, { w: 1.6 });
      m.dot([q[0], G + 2.6, q[2]], 0.4, light, { w: 0.6 });
    }
  }
  ringRoad(m, 14, 1.1);
  ringRoad(m, 28, 1.1);
  for (let j = 0; j < 48; j++) {
    const a = ((j + 0.5) / 48) * TAU;
    m.line(polar(14, a), polar(28, a), road, { w: 0.4 });
    if (j % 2) m.line(polar(28, a), polar(43, a), road, { w: 0.35 });
  }
  towers(m, 21, 24);
  lit(m, 7, 43, 800, 721);
  woods(m, 46, PLAN_R, 260, 723);
  fields(m, 46, PLAN_R, 36);
}

/** Star fort: walls on a sixteen-sided star (points at radius 48, notches at 34), a moat round it, eight streets out to the points, ring roads at 10 and 22. */
function starFort(m: Mesh) {
  heart(m);
  const pts = Array.from({ length: 16 }, (_, i) => polar(i % 2 ? 34 : 48, (i / 16) * TAU));
  m.poly(pts, true, edge, { w: 2 });
  m.poly(
    pts.map((q) => [q[0] * 1.06, q[1], q[2] * 1.06] as Vec3),
    true,
    edge,
    { w: 1 },
  );
  // The moat: a band of water just outside the walls, one triangle pair a side.
  for (let i = 0; i < 16; i++) {
    const a = pts[i] as Vec3;
    const b = pts[(i + 1) % 16] as Vec3;
    const a2: Vec3 = [a[0] * 1.12, G, a[2] * 1.12];
    const b2: Vec3 = [b[0] * 1.12, G, b[2] * 1.12];
    m.tri([a[0] * 1.06, G, a[2] * 1.06], [b[0] * 1.06, G, b[2] * 1.06], b2, water, { w: 0.6 });
    m.tri([a[0] * 1.06, G, a[2] * 1.06], b2, a2, water, { w: 0.6 });
    if (i % 2 === 0) m.dot(a, 0.6, light, { w: 0.8 });
  }
  // A square in the middle.
  m.poly([polar(5, 0.785), polar(5, 2.356), polar(5, 3.927), polar(5, 5.498)], true, edge, {
    w: 1.4,
  });
  florets(m, 4.5, 144);
  for (let k = 0; k < 8; k++) spoke(m, (k / 8) * TAU, 5, 47);
  for (let k = 0; k < 8; k++)
    m.line(polar(10, ((k + 0.5) / 8) * TAU), polar(33, ((k + 0.5) / 8) * TAU), road, { w: 0.5 });
  ringRoad(m, 10, 1);
  ringRoad(m, 22, 1);
  const inside: Keep = (x, z) => {
    const r = Math.hypot(x, z);
    const a = Math.atan2(z, x);
    const f = Math.abs((((((a / TAU) * 16) % 2) + 2) % 2) - 1);
    return r < 34 + 14 * (1 - f) - 1.5;
  };
  lit(m, 6, 46, 900, 731, inside);
  woods(m, 50, PLAN_R + 2, 220, 733);
}

/** Lotus: eight outer petals (from 10 to 50) and eight inner ones turned half a petal (from 6 to 30), a round pool at the heart, an avenue down each petal. */
function lotus(m: Mesh) {
  heart(m);
  m.disc([0, G, 0], 5.5, water, 0, { w: 0.8 });
  m.poly(circlePts(5.5), true, edge, { w: 1.2 });
  florets(m, 5, 89);
  const petal = (a: number, r0: number, r1: number, half: number) => {
    const n = 24;
    const side = (s: number) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const f = i / n;
        const r = r0 + (r1 - r0) * f;
        return polar(r, a + s * half * Math.sin(Math.PI * f) ** 0.7);
      });
    m.poly(side(1), false, edge, { w: 1.3 });
    m.poly(side(-1), false, edge, { w: 1.3 });
    boulevard(m, [polar(r0, a), polar(r1, a)], 1);
  };
  const inPetal = (x: number, z: number, n0: number, r0: number, r1: number, half: number) => {
    const r = Math.hypot(x, z);
    if (r < r0 || r > r1) return false;
    const a = Math.atan2(z, x);
    const k = Math.round((a / TAU) * 8 - n0);
    const da = a - ((k + n0) / 8) * TAU;
    return Math.abs(da) < half * Math.sin((Math.PI * (r - r0)) / (r1 - r0)) ** 0.7;
  };
  for (let k = 0; k < 8; k++) {
    petal((k / 8) * TAU, 10, 50, (Math.PI / 8) * 0.95);
    petal(((k + 0.5) / 8) * TAU, 6, 30, (Math.PI / 8) * 0.8);
  }
  lit(
    m,
    7,
    50,
    1000,
    741,
    (x, z) => inPetal(x, z, 0, 10, 50, Math.PI / 8) || inPetal(x, z, 0.5, 6, 30, Math.PI / 10),
  );
  ringRoad(m, 52, 1);
  woods(m, 30, 52, 260, 743, (x, z) => !inPetal(x, z, 0, 10, 50, Math.PI / 8));
}

/** Hive: a grid of hexagons 6 across clipped to a circle of 50, the middle hexagon a garden, six avenues along the grid's axes. */
function hive(m: Mesh) {
  heart(m);
  const s = 3.4;
  for (let q = -10; q <= 10; q++)
    for (let r = -10; r <= 10; r++) {
      const cx = s * 1.5 * q;
      const cz = s * Math.sqrt(3) * (r + q / 2);
      const d = Math.hypot(cx, cz);
      if (d > 50) continue;
      const corners = Array.from(
        { length: 6 },
        (_, k) => [cx + Math.cos((k / 6) * TAU) * s, G, cz + Math.sin((k / 6) * TAU) * s] as Vec3,
      );
      for (let k = 0; k < 3; k++)
        m.line(corners[k] as Vec3, corners[k + 1] as Vec3, d < 20 ? road : edge, { w: 0.6 });
      if (q === 0 && r === 0) {
        m.poly(corners, true, edge, { w: 2 });
        florets(m, 2.8, 89);
      } else {
        m.dot([cx, G + 0.05, cz], 1, face, { w: Math.exp(-d / 16) * 1.6 });
        if ((q * 7 + r * 3) % 11 === 0) m.line([cx, G, cz], [cx, G + 2.4, cz], light, { w: 1.2 });
      }
    }
  for (let k = 0; k < 6; k++) spoke(m, (k / 6) * TAU + Math.PI / 6, 3, 50, 1.2);
  const hexR = 52;
  m.poly(
    Array.from({ length: 6 }, (_, k) => polar(hexR, (k / 6) * TAU + Math.PI / 6)),
    true,
    edge,
    { w: 2 },
  );
  woods(m, 50, PLAN_R + 3, 200, 751);
}

/** Mandala: a circle, the square inside it, the circle inside that, the square turned 45° inside that, and so on, each 1/√2 of the last, from 50 down to 6; avenues on the axes and the diagonals. */
function mandala(m: Mesh) {
  heart(m);
  let r = 50;
  for (let i = 0; i < 7; i++) {
    ringRoad(m, r, 1.1, i % 2 ? road : edge);
    const sq = Array.from({ length: 4 }, (_, k) =>
      polar(r, (k / 4) * TAU + (i % 2 ? Math.PI / 4 : 0)),
    );
    m.poly(sq, true, edge, { w: 1.4 });
    for (const q of sq) m.dot(q, 0.5, light, { w: 0.6 });
    r /= Math.SQRT2;
  }
  florets(m, r * 1.3, 144);
  for (let k = 0; k < 8; k++) spoke(m, (k / 8) * TAU, 5, PLAN_R, k % 2 ? 1 : 1.6);
  lit(m, 6, 50, 900, 761);
  woods(m, 50.5, PLAN_R, 160, 763);
}

/** Spiral: one avenue on the golden spiral (r = 2·φ^(2θ/π), φ wider each quarter turn) out to 52, blocks along both sides, cross streets every tenth of a turn. */
function spiral(m: Mesh) {
  heart(m);
  florets(m, 3.5, 144);
  const b = Math.log(PHI) / (Math.PI / 2);
  const tMax = Math.log(52 / 2) / b;
  const n = 220;
  const at = (i: number, k = 1, y = G) => {
    const t = (i / n) * tMax;
    return polar(2 * Math.exp(b * t) * k, t, y);
  };
  boulevard(
    m,
    Array.from({ length: n + 1 }, (_, i) => at(i)),
    1.8,
  );
  for (let i = 0; i <= n; i += 2) {
    const r = Math.hypot(at(i)[0], at(i)[2]);
    if (r < 5) continue;
    for (const k of [0.86, 1.14])
      m.dot(at(i, k, G + 0.05), 0.45, face, { w: Math.exp(-r / 18) * 2 });
    if (i % 6 === 0) m.line(at(i, 0.78), at(i, 1.25), road, { w: 0.5 });
    if (i % 20 === 0) m.line(at(i, 1.18), at(i, 1.18, G + 2.4), light, { w: 1.2 });
  }
  // The spiral's outer turn sets the city's edge.
  ringRoad(m, 53, 1.2);
  for (let k = 0; k < 4; k++) spoke(m, (k / 4) * TAU + 0.4, 6, 53, 0.8);
  woods(m, 5, 53, 300, 771, (x, z) => {
    // Woods in the gaps between the turns.
    const r = Math.hypot(x, z);
    const t = Math.log(Math.max(r, 2) / 2) / b;
    const a = (((Math.atan2(z, x) % TAU) + TAU) % TAU) as number;
    const turns = (t - a) / TAU;
    return Math.abs(turns - Math.round(turns)) > 0.3;
  });
}

/** Harbour: a half circle on the shore (ring roads at 12, 24, 36, 48, seven avenues fanning inland), the sea before it, piers, a breakwater arc at 30 and an island with a lighthouse. */
function harbour(m: Mesh) {
  heart(m);
  const land: Keep = (_x, z) => z < -0.5;
  // The sea: the near half, as one big half disc.
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * Math.PI;
    const a1 = ((i + 1) / 48) * Math.PI;
    m.tri([0, G, 0], polar(PLAN_R, a0), polar(PLAN_R, a1), water, { w: 0.6 });
  }
  m.line([-PLAN_R, G, 0], [PLAN_R, G, 0], edge, { w: 2 });
  for (const r of [12, 24, 36, 48])
    m.poly(
      Array.from({ length: 49 }, (_, i) => polar(r, Math.PI + (i / 48) * Math.PI)),
      false,
      road,
      { w: 1.1 },
    );
  for (let k = 0; k <= 6; k++) spoke(m, Math.PI + ((k + 0.5) / 7.5) * Math.PI, 3, 50, 1.4);
  m.poly(
    Array.from({ length: 25 }, (_, i) => polar(5, Math.PI + (i / 24) * Math.PI)),
    false,
    edge,
    { w: 1.5 },
  );
  florets(m, 4.5, 89);
  lit(m, 4, 49, 1100, 781, land);
  woods(m, 49, PLAN_R + 2, 160, 783, land);
  // Piers, a breakwater and the island with its lighthouse.
  for (let k = -4; k <= 4; k++)
    m.line([k * 8, G, 0], [k * 8, G, 8 + (k % 2 ? 0 : 4)], edge, { w: 1.2 });
  m.poly(
    Array.from({ length: 25 }, (_, i) => polar(30, 0.18 * Math.PI + (i / 24) * 0.64 * Math.PI)),
    false,
    edge,
    { w: 1.6 },
  );
  m.poly(Mesh.circle([0, G, 40], 5), true, edge, { w: 1.2 });
  m.disc([0, G + 0.02, 40], 5, ground, 0, { w: 0.3 });
  m.line([0, G, 40], [0, G + 2.6, 40], light, { w: 2 });
  m.dot([0, G + 2.9, 40], 0.5, light, { anim: Anim.pulse, key: 0, w: 1 });
  boulevard(
    m,
    [
      [0, G, 30],
      [0, G, 35],
    ],
    0.8,
  );
}

/** Garden city: a central garden; a ring of halls; a park; a glass arcade; houses; a grand avenue of green; houses; a railway ring; farms and woods in the green belt; six boulevards out. */
function gardenCity(m: Mesh) {
  heart(m);
  florets(m, 5, 233);
  // The ring of halls round the garden.
  for (let j = 0; j < 12; j++) {
    const a = ((j + 0.5) / 12) * TAU;
    const q = polar(6.2, a, G + 0.05);
    m.dot(q, 0.7, light, { w: 0.5 });
  }
  ringRoad(m, 7.4, 1.1, edge);
  woods(m, 7.8, 13.5, 220, 791);
  for (const r of [14, 14.6]) ringRoad(m, r, 1.3, edge);
  lit(m, 15, 24, 380, 793);
  for (const r of [24.5, 28.5]) ringRoad(m, r, 1, road);
  woods(m, 25, 28, 200, 795);
  lit(m, 29, 36, 420, 797);
  // The railway ring and its trains.
  for (const r of [37.6, 38.4]) ringRoad(m, r, 0.9, edge);
  m.poly(circlePts(38), true, light, { anim: Anim.flow, key: 4, w: 0.3 });
  fields(m, 40, PLAN_R, 48);
  woods(m, 40, PLAN_R, 240, 799);
  for (let k = 0; k < 6; k++) spoke(m, (k / 6) * TAU, 5.5, PLAN_R);
}

/* ---------- the row of pills ---------- */

export const PLAN_NAMES = [
  'Sunflower',
  'Atlantis',
  'Twelve gates',
  'Star fort',
  'Lotus',
  'Hive',
  'Mandala',
  'Spiral',
  'Harbour',
  'Garden city',
];
export const PLAN_RULES = [
  'Blocks on the golden angle, r = 52√(n/987), streets along the 21 and 34 spirals that join them.',
  'Equal rings of land and water out from an island (water at 6–9, 17–21, 33–38), one canal cut straight in from the sea, bridges on three axes.',
  'A round wall of radius 44 with twelve gates, a boulevard through each, ring roads at 14 and 28, woods outside.',
  'Walls on a sixteen-pointed star (points at 48, notches at 34) with a moat, eight streets to the points, ring roads at 10 and 22.',
  'Eight outer petals from 10 to 50, eight inner ones turned half a petal from 6 to 30, a pool at the heart, an avenue down each petal.',
  'A grid of hexagons 6.8 across clipped to a circle of 50, the middle one a garden, six avenues on the grid’s axes.',
  'Circle, square in it, circle in that, square turned 45° in that…, each 1/√2 of the last from 50 down to 6, avenues on the axes and diagonals.',
  'One avenue on the golden spiral, r = 2·φ^(2θ/π) (φ wider each quarter turn), out to 52, blocks either side, woods between the turns.',
  'A half circle on the shore (ring roads at 12, 24, 36, 48, seven avenues fanning inland), piers, a breakwater arc at 30, an island and its lighthouse.',
  'Garden, halls, park, glass arcade, houses, a grand green avenue, houses, a railway ring and a green belt of farms, six boulevards out (a garden city).',
];
const BUILD = [
  sunflower,
  atlantis,
  twelveGates,
  starFort,
  lotus,
  hive,
  mandala,
  spiral,
  harbour,
  gardenCity,
];

/** Plan i (0..9) as a mesh. */
export function planVariantMesh(i: number): Mesh {
  const m = new Mesh();
  (BUILD[i] ?? sunflower)(m);
  return m;
}
