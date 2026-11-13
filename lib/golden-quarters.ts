/*
 * From the element to the whole quarter (docs/specs/art-city.md, "Evolutions").
 *
 * 2026-11-12: "for the designs factories domes etc... do different versions of each or
 * evolutions (1 dome, one group of domes, one dome complex etc... so u see from the element to
 * the whole quartier factory etc..)"
 *
 * Each of Temples, Factories and Domes is one row of pills: first its single buildings (the
 * kinds, lib/golden-buildings.ts), then three rungs of a ladder, each built from the rung below
 * placed again smaller: a group, a complex, a quarter. The ladder is drawn with the same shapes,
 * so the eye can follow one element into the whole district.
 *
 * Pure: no three.js, no DOM.
 */

import { GOLDEN_ANGLE, hash, type Vec3 } from './bigbang';
import {
  type Builder,
  DOME_KINDS,
  domeGroup,
  FACTORY_KINDS,
  garden,
  plaza,
  TEMPLE_KINDS,
  truss,
} from './golden-buildings';
import { Anim, GROUND_Y, Mesh, type Opts, PHI, Tone } from './grain-mesh';

const TAU = Math.PI * 2;
const G = GROUND_Y;
const P = (x: number, y: number, z: number): Vec3 => [x, G + y, z];
const { edge, face, glass, plant, light, road, water } = Tone;

/**
 * A mesh that draws into another one, moved to `at` on the ground, `s` times the size and turned
 * `rot` round the vertical: so a building can be placed again, smaller, inside a bigger one.
 * Turning and breathing elements are stilled (a mesh turns round one pivot only); steam, flow and
 * pulses keep moving, scaled.
 */
export class Placed extends Mesh {
  constructor(
    private target: Mesh,
    private at: Vec3,
    private s: number,
    private rot = 0,
  ) {
    super();
  }
  private T(q: Vec3): Vec3 {
    const c = Math.cos(this.rot);
    const n = Math.sin(this.rot);
    const x = q[0] * this.s;
    const z = q[2] * this.s;
    return [
      this.at[0] + x * c - z * n,
      this.at[1] + (q[1] - G) * this.s,
      this.at[2] + x * n + z * c,
    ];
  }
  private O(o: Opts): Opts {
    const anim = o.anim ?? 0;
    if (anim === Anim.breathe || anim === Anim.orbit) return { ...o, anim: 0 };
    if (anim === Anim.flow || anim === Anim.rise) return { ...o, key: (o.key ?? 0) * this.s };
    return o;
  }
  override line(a: Vec3, b: Vec3, tone: number, o: Opts = {}) {
    this.target.line(this.T(a), this.T(b), tone, this.O(o));
  }
  override tri(a: Vec3, b: Vec3, c: Vec3, tone: number, o: Opts = {}) {
    const keep = this.target.centre;
    this.target.centre = this.T(this.centre);
    this.target.tri(this.T(a), this.T(b), this.T(c), tone, this.O(o));
    this.target.centre = keep;
  }
  override dot(at: Vec3, r: number, tone: number, o: Opts = {}) {
    this.target.dot(this.T(at), r * this.s, tone, this.O(o));
  }
}

/** Build `b` into m at (x, z), s times the size, turned rot. */
export function place(m: Mesh, b: Builder, x: number, z: number, s: number, rot = 0) {
  const sub = new Placed(m, P(x, 0, z), s, rot);
  sub.centre = P(0, 5, 0);
  b(sub);
}

/* ---------- shared pieces of a quarter ---------- */

const polar = (r: number, a: number, y = 0): Vec3 => P(Math.cos(a) * r, y, Math.sin(a) * r);
function ringRoad(m: Mesh, r: number, w = 0.6, tone: number = road) {
  m.ring(P(0, 0.05, 0), r, tone, { w }, Math.max(32, Math.ceil(TAU * r * 0.8)));
}
function spokes(m: Mesh, n: number, r0: number, r1: number, w = 0.8, off = 0) {
  for (let k = 0; k < n; k++) {
    const a = off + (k / n) * TAU;
    m.line(polar(r0, a, 0.05), polar(r1, a, 0.05), road, { w });
  }
}
/** A canal ring from r0 to r1: water, its banks, a bridge on each of n crossings. */
function canal(m: Mesh, r0: number, r1: number, n: number, off = 0) {
  const keep = m.centre;
  m.centre = P(0, -10, 0);
  m.disc(P(0, 0.02, 0), r1, water, r0, { w: 0.5 });
  m.centre = keep;
  ringRoad(m, r0, 0.6, edge);
  ringRoad(m, r1, 0.6, edge);
  for (let k = 0; k < n; k++) {
    const a = off + (k / n) * TAU;
    m.poly(
      Array.from({ length: 9 }, (_, j) =>
        polar(r0 + ((r1 - r0) * j) / 8, a, Math.sin((Math.PI * j) / 8) * (r1 - r0) * 0.4),
      ),
      false,
      edge,
      { w: 1.4 },
    );
  }
}
/** Trees and lit lamps scattered in a ring from r0 to r1, kept off the n spokes. */
function grove(m: Mesh, r0: number, r1: number, count: number, seed: number) {
  for (let j = 0; j < count; j++) {
    const r = r0 + (r1 - r0) * hash(j, seed);
    const a = hash(j, seed + 1) * TAU;
    const h = 1 + 1.6 * hash(j, seed + 2);
    m.line(polar(r, a), polar(r, a, h), plant, { w: 0.3 });
    m.dot(polar(r, a, h), 0.45 + 0.4 * hash(j, seed + 3), plant, { w: 0.25 });
  }
}
/** A colonnade round a square of half-width h: columns every `step`, a beam over them. */
function colonnade(m: Mesh, h: number, tall: number, step: number) {
  const corners = [P(-h, 0, -h), P(h, 0, -h), P(h, 0, h), P(-h, 0, h)];
  for (let i = 0; i < 4; i++) {
    const a = corners[i] as Vec3;
    const b = corners[(i + 1) % 4] as Vec3;
    const n = Math.round((2 * h) / step);
    for (let j = 0; j < n; j++) {
      const f = j / n;
      const q: Vec3 = [a[0] + (b[0] - a[0]) * f, G, a[2] + (b[2] - a[2]) * f];
      m.line(q, [q[0], G + tall, q[2]], edge, { w: 0.7 });
    }
    m.line([a[0], G + tall, a[2]], [b[0], G + tall, b[2]], edge, { w: 1.4 });
    m.quad([a[0], G + tall, a[2]], [b[0] - a[0], 0, b[2] - a[2]], [0, tall / PHI ** 3, 0], face);
  }
}
/** A low block of the quarter: a box with a band of lit windows. */
function block(m: Mesh, x: number, z: number, hx: number, hz: number, h: number, rot: number) {
  m.box(P(x, 0, z), hx, h, hz, face, edge, rot);
  m.dot(P(x, h + 0.3, z), 0.25, light, { w: 0.25 });
}

/* ---------- temples: temple → court → sacred complex → quarter ---------- */

const T = TEMPLE_KINDS.build as [Builder, Builder, Builder, Builder, Builder];
const [rotunda, ziggurat, ringGate, pyramid, lotus] = T;

/**
 * Temple court. Rules: a square court of half-width 16 walled by a colonnade (columns every 2,
 * 16/φ³ tall); the Rotunda at φ⁻¹ in the middle; a temple φ⁻² in each corner (Ziggurat, Ring,
 * Pyramid, Lotus); a gate in the middle of each side; a pool on each axis.
 */
const templeCourt: Builder = (m) => {
  colonnade(m, 16, 16 / PHI ** 3, 2);
  place(m, rotunda, 0, 0, 1 / PHI);
  [ziggurat, ringGate, pyramid, lotus].forEach((b, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    place(m, b, Math.cos(a) * 16 * 0.66, Math.sin(a) * 16 * 0.66, 1 / PHI ** 2);
  });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    m.line(polar(5.5, a, 0.05), polar(16, a, 0.05), road, { w: 1.2 });
    m.dot(polar(16, a, 16 / PHI ** 3 + 0.6), 0.5, light, { w: 0.8 });
    const keep = m.centre;
    m.centre = P(0, -10, 0);
    const c = polar(10.5, a, 0.04);
    m.disc(c, 1.6, water, 0, { w: 0.5 });
    m.centre = keep;
  }
};

/**
 * Sacred complex. Rules: the Lotus at φ⁻¹ in the middle on a round terrace; eight temples φ⁻³
 * round it on a circle of radius 24, the four kinds in turn; a reflecting canal ring between
 * radii 12 and 12 + 12/φ³; eight processional ways; a ring of trees.
 */
const sacredComplex: Builder = (m) => {
  m.cylinder(P(0, 0, 0), 9, G, G + 0.8, face, edge, 0, 36);
  place(m, lotus, 0, 0, 1 / PHI);
  canal(m, 12, 12 + 12 / PHI ** 3, 8, Math.PI / 8);
  spokes(m, 8, 9, 30, 1, Math.PI / 8);
  ringRoad(m, 24, 0.8);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    place(
      m,
      [rotunda, ziggurat, ringGate, pyramid][k % 4] as Builder,
      Math.cos(a) * 24,
      Math.sin(a) * 24,
      1 / PHI ** 3,
      -a,
    );
  }
  grove(m, 27, 31, 90, 611);
};

/**
 * Temple quarter. Rules: the sacred complex at φ⁻² in the middle; twelve streets out from it and
 * two ring roads (radii 24 and 40); in each of the twelve sectors a temple court at φ⁻⁴ on the
 * ring of 32 between low lit houses; gardens outside; a canal on its rim at 46.
 */
const templeQuarter: Builder = (m) => {
  place(m, sacredComplex, 0, 0, 1 / PHI ** 1.5);
  ringRoad(m, 24, 1);
  ringRoad(m, 40, 1);
  spokes(m, 12, 20, 46, 0.9);
  for (let k = 0; k < 12; k++) {
    const a = ((k + 0.5) / 12) * TAU;
    place(
      m,
      k % 2 ? templeCourt : ([rotunda, ziggurat, ringGate, pyramid, lotus][k % 5] as Builder),
      Math.cos(a) * 32,
      Math.sin(a) * 32,
      k % 2 ? 1 / PHI ** 4 : 1 / PHI ** 3,
      -a,
    );
    for (let j = 0; j < 4; j++) {
      const aa = a + (j - 1.5) * 0.06;
      for (const r of [26.5, 37.5])
        block(m, Math.cos(aa) * r, Math.sin(aa) * r, 0.7, 0.9, 1.2 + hash(k * 9 + j, r) * 1.2, -aa);
    }
  }
  canal(m, 45, 47, 12);
  grove(m, 40.8, 44.5, 160, 621);
};

/* ---------- factories: factory → group → complex → quarter ---------- */

const F = FACTORY_KINDS.build as Builder[];
const [sawtooth, foundry, assembly, workshops, solar, cementWorks, kilns] = F as [
  Builder,
  Builder,
  Builder,
  Builder,
  Builder,
  Builder,
  Builder,
];

/** A railway: two rails and sleepers along a line or a ring of points. */
function rail(m: Mesh, pts: Vec3[], closed: boolean) {
  for (const off of [-0.35, 0.35]) {
    const shifted = pts.map((q, i) => {
      const b = pts[(i + 1) % pts.length] as Vec3;
      const a = pts[(i - 1 + pts.length) % pts.length] as Vec3;
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const l = Math.hypot(dx, dz) || 1;
      return [q[0] - (dz / l) * off, q[1] + 0.06, q[2] + (dx / l) * off] as Vec3;
    });
    m.poly(shifted, closed, edge, { w: 0.5 });
  }
  m.poly(
    pts.map((q) => [q[0], q[1] + 0.1, q[2]] as Vec3),
    closed,
    light,
    { anim: Anim.flow, key: 3, w: 0.15 },
  );
}

/**
 * Factory group. Rules: three works round a yard on the corners of a triangle of side 22 (the
 * Sawtooth, the Foundry and the Workshops, each at φ⁻¹), a conveyor bridge between each pair, a
 * rail siding along one side.
 */
const factoryGroup: Builder = (m) => {
  const r = 22 / Math.sqrt(3);
  const at = [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i * TAU) / 3;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
  [sawtooth, foundry, workshops].forEach((b, i) => {
    const [x, z] = at[i] as [number, number];
    place(m, b, x, z, 1 / PHI, i * 0.7);
  });
  for (let i = 0; i < 3; i++) {
    const [x0, z0] = at[i] as [number, number];
    const [x1, z1] = at[(i + 1) % 3] as [number, number];
    const f = 0.3;
    truss(
      m,
      P(x0 + (x1 - x0) * f, 3, z0 + (z1 - z0) * f),
      P(x1 + (x0 - x1) * f, 3, z1 + (z0 - z1) * f),
      1,
      1,
    );
  }
  rail(m, [P(-22, 0, 16), P(22, 0, 16)], false);
  ringRoad(m, 6, 0.5);
};

/**
 * Industrial complex. Rules: the Cement works at φ⁻¹ in the middle; the Assembly, the Kilns,
 * the Solar works and the Foundry at φ⁻² on a ring of radius 26, a quarter turn apart; a rail
 * loop of radius 19 linking them; conveyor bridges from the middle out to each.
 */
const industrialComplex: Builder = (m) => {
  place(m, cementWorks, 0, 0, 1 / PHI);
  rail(
    m,
    Array.from({ length: 64 }, (_, i) => polar(19, (i / 64) * TAU)),
    true,
  );
  [assembly, kilns, solar, foundry].forEach((b, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    place(m, b, Math.cos(a) * 27, Math.sin(a) * 27, 1 / PHI ** 2, -a);
    truss(m, polar(11, a, 2.5), polar(22, a, 2.5), 1, 1, 2);
  });
  spokes(m, 4, 12, 34, 1, 0);
};

/**
 * Industrial quarter. Rules: a grid of 5 × 5 blocks 18 apart (the corners left for yards), a
 * work at φ⁻³ on each block (every kind in turn), the industrial complex at φ⁻² on the middle
 * block; a canal along the south side with a quay and cranes; a rail ring round it all.
 */
const industrialQuarter: Builder = (m) => {
  const pitch = 18;
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++) {
      if (Math.abs(i) === 2 && Math.abs(j) === 2) continue;
      const x = i * pitch;
      const z = j * pitch;
      if (i === 0 && j === 0) continue;
      const kind = F[((i + 2) * 5 + (j + 2)) % F.length] as Builder;
      place(m, kind, x, z, 1 / PHI ** 3, (Math.abs(i + j) % 2) * (Math.PI / 2));
      m.poly(
        [
          P(x - 8, 0.05, z - 8),
          P(x + 8, 0.05, z - 8),
          P(x + 8, 0.05, z + 8),
          P(x - 8, 0.05, z + 8),
        ],
        true,
        road,
        { w: 0.4 },
      );
    }
  place(m, industrialComplex, 0, 0, 1 / PHI ** 2.2);
  for (const v of [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]) {
    m.line(P(v * pitch, 0.05, -45), P(v * pitch, 0.05, 45), road, { w: 0.6 });
    m.line(P(-45, 0.05, v * pitch), P(45, 0.05, v * pitch), road, { w: 0.6 });
  }
  const keep = m.centre;
  m.centre = P(0, -10, 0);
  m.quad(P(-48, 0.02, 47), [96, 0, 0], [0, 0, 6], water, { w: 0.6 });
  m.centre = keep;
  m.line(P(-48, 0.4, 47), P(48, 0.4, 47), edge, { w: 1.5 });
  for (let c = 0; c < 5; c++) {
    const x = -36 + c * 18;
    m.line(P(x, 0, 46), P(x, 9, 46), edge, { w: 0.8 });
    m.line(P(x, 9, 43), P(x, 9, 51), edge, { w: 0.8 });
    m.dot(P(x, 9.4, 46), 0.35, light, { w: 0.4 });
  }
  rail(m, [P(-50, 0, -50), P(50, 0, -50), P(50, 0, 44), P(-50, 0, 44)], true);
};

/* ---------- domes: dome → group → complex → quarter ---------- */

const D = DOME_KINDS.build as [Builder, Builder, Builder, Builder];
const [geodesic, bubbles, palmHouse, lattice] = D;

/** A glass corridor on the ground from a to b: a low barrel of ribs. */
export function corridor(m: Mesh, a: Vec3, b: Vec3, r = 1.4) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const L = Math.hypot(dx, dz) || 1;
  const sx = -dz / L;
  const sz = dx / L;
  const n = Math.max(3, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const c: Vec3 = [a[0] + dx * f, G, a[2] + dz * f];
    m.poly(
      Array.from({ length: 7 }, (_, j) => {
        const t = (j / 6) * Math.PI;
        return [
          c[0] + sx * Math.cos(t) * r,
          G + Math.sin(t) * r,
          c[2] + sz * Math.cos(t) * r,
        ] as Vec3;
      }),
      false,
      edge,
      { w: 0.6 },
    );
  }
  m.surface(
    (u, v) => {
      const t = v * Math.PI;
      return [
        a[0] + dx * u + sx * Math.cos(t) * r,
        G + Math.sin(t) * r,
        a[2] + dz * u + sz * Math.cos(t) * r,
      ];
    },
    n,
    4,
    glass,
    { two: true },
  );
  m.line([a[0], G + 0.1, a[2]], [b[0], G + 0.1, b[2]], light, {
    anim: Anim.flow,
    key: 1.2,
    w: 0.4,
  });
}

/**
 * Dome complex. Rules: the Geodesic at full size in the middle; the Palm house at φ⁻¹ to the
 * west and the Lattice shell at φ⁻¹ to the east, the Bubbles at φ⁻¹ to the north and a group of
 * domes at φ⁻² to the south, each 24 from the middle, joined to it by glass corridors.
 */
const domeComplex: Builder = (m) => {
  place(m, geodesic, 0, 0, 1 / PHI ** 0.5);
  const arms: [Builder, number, number, number][] = [
    [palmHouse, -24, 0, 1 / PHI],
    [lattice, 24, 0, 1 / PHI],
    [bubbles, 0, -24, 1 / PHI],
    [domeGroup, 0, 24, 1 / PHI ** 2],
  ];
  for (const [b, x, z, s] of arms) {
    place(m, b, x, z, s, x ? Math.PI / 2 : 0);
    const l = Math.hypot(x, z);
    corridor(
      m,
      P((x / l) * 9, 0, (z / l) * 9),
      P((x / l) * (l - 11 * s * 1.1), 0, (z / l) * (l - 11 * s * 1.1)),
    );
  }
  grove(m, 30, 36, 120, 631);
};

/**
 * Dome quarter: a solarpunk district round a landmark dome. Rules: a Geodesic √φ times larger in
 * the middle, the landmark; a ring of terraced gardens out to 18; eight streets; on the ring of
 * radius 34 eight neighbourhoods by turns a dome complex at φ⁻³ or a group of domes at φ⁻²,
 * houses with roof gardens between them; a canal on the rim at 46 and trees everywhere.
 */
const domeQuarter: Builder = (m) => {
  place(m, geodesic, 0, 0, Math.sqrt(PHI));
  for (let s = 0; s < 3; s++) {
    const r0 = 15.5 + s * 1.2;
    m.centre = P(0, -10, 0);
    m.cylinder(P(0, 0, 0), r0, G, G + 1.2 - s * 0.4, face, edge, 0, 72);
    m.disc(P(0, 1.2 - s * 0.4, 0), r0, plant, r0 - 1.2, { w: 0.3 });
  }
  for (let j = 0; j < 30; j++) {
    const a = j * GOLDEN_ANGLE;
    const r = 15 + 2.2 * hash(j, 641);
    m.dot(polar(r, a, 2), 0.6, plant, { w: 0.3 });
  }
  spokes(m, 8, 19, 46, 1);
  ringRoad(m, 26, 0.9);
  ringRoad(m, 42, 0.9);
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * TAU;
    place(
      m,
      k % 2 ? domeComplex : domeGroup,
      Math.cos(a) * 34,
      Math.sin(a) * 34,
      k % 2 ? 1 / PHI ** 3.2 : 1 / PHI ** 2,
      -a,
    );
    for (let j = 0; j < 3; j++) {
      const aa = a + (j - 1) * 0.13 + 0.39;
      const r = 30 + 6 * hash(k * 5 + j, 642);
      const x = Math.cos(aa) * r;
      const z = Math.sin(aa) * r;
      block(m, x, z, 1.1, 0.8, 1.4, -aa);
      garden(m, x, z, 1.2, 1.4, 2);
    }
  }
  canal(m, 45, 47, 8, Math.PI / 8);
  grove(m, 19.5, 25, 140, 651);
};

/* ---------- the rows of pills ---------- */

export type BuildingSet = {
  names: string[];
  build: Builder[];
  label: string;
  /** How far the eye stands back for each pill, in units of the single building's distance. */
  reach: number[];
  /** Where each pill sits on the ladder: 0 the element, 1 group, 2 complex, 3 quarter. */
  rung: number[];
  /** What it stands on, `r` wide: a plaza unless given (Atlantis stands on the seabed). */
  floor?: (m: Mesh, r: number) => void;
};

const REACH = [1, 1.3, 1.55, 2.1];
export function ladder(
  label: string,
  kinds: { names: string[]; build: Builder[] },
  rungs: [string, Builder][],
  firstRung = 1,
): BuildingSet {
  const names = [...kinds.names, ...rungs.map(([n]) => n)];
  const rung = [...kinds.names.map(() => 0), ...rungs.map((_, i) => firstRung + i)];
  return {
    names,
    build: [...kinds.build, ...rungs.map(([, b]) => b)],
    label,
    rung,
    reach: rung.map((r) => REACH[r] as number),
  };
}

export const TEMPLES = ladder('Temple', TEMPLE_KINDS, [
  ['Temple court', templeCourt],
  ['Sacred complex', sacredComplex],
  ['Temple quarter', templeQuarter],
]);
export const FACTORIES = ladder('Factory', FACTORY_KINDS, [
  ['Factory group', factoryGroup],
  ['Industrial complex', industrialComplex],
  ['Industrial quarter', industrialQuarter],
]);
export const DOMES = ladder('Dome', DOME_KINDS, [
  ['Group of domes', domeGroup],
  ['Dome complex', domeComplex],
  ['Dome quarter', domeQuarter],
]);

/** Pill i of a set, on its plaza (a wider one for the bigger rungs), as a mesh: built once by the caller. */
export function buildingMesh(set: BuildingSet, i: number): Mesh {
  const k = set.build[i] ? i : 0;
  const m = new Mesh();
  (set.floor ?? plaza)(m, 18 * (set.reach[k] ?? 1) * (set.rung[k] === 3 ? 1.25 : 1));
  m.centre = P(0, 5, 0);
  (set.build[k] as Builder)(m);
  return m;
}
