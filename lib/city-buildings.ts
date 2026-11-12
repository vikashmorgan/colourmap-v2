/*
 * BUILDINGS — twenty buildings of the golden city, one to a pill, each from a
 * few rules (docs/specs/art-city.md, "Buildings").
 *
 * 2026-11-12: "think about some temples or buildings with stairs, or
 * monumental temples. or roads for pedestrians that are curvy around the
 * buildings. or buildings that are not square but more innovative shapes or
 * rounded shapes, or mixes of rounded, diagonals and squares. do a cool
 * buildings category for building designs. do 20 cool buildings, each unique,
 * can be in different quartiers like chinatown etc..."
 *
 * Every building stands on its own plinth with curvy walkways of dotted light
 * winding round it, drawn in grains by lib/grain-mesh.ts: dense bright edges,
 * faces lit by how they face the eye, lamps. `building(kind, mesh, place)`
 * builds one anywhere (moved, turned and scaled), so the game city can set
 * them along its streets later.
 *
 * Pure: no three.js, no DOM.
 */

import { GOLDEN_ANGLE, type Vec3 } from './bigbang';
import { Anim, GROUND_Y, Mesh, type Opts, Tone } from './grain-mesh';

const TAU = Math.PI * 2;
const { edge, face, glass, water, plant, fire, light, ground, road } = Tone;

/** A point in the building's own frame: x and z across, y up from its foot. */
type Q = [number, number, number];
type Pt = [number, number];
/** A level of a loft: how much the plan is scaled, its height, and how far it is turned. */
type Level = [number, number] | [number, number, number];

/** Where a building stands: its foot, a turn round the vertical, a scale. */
export type Place = { at?: Vec3; rot?: number; scale?: number };

const circ = (n: number, a0 = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * TAU;
    return [Math.cos(a), Math.sin(a)] as Pt;
  });
const ngon = (n: number, r: number, a0 = 0): Pt[] =>
  circ(n, a0).map(([x, z]) => [x * r, z * r] as Pt);
const rect = (hx: number, hz: number): Pt[] => [
  [-hx, -hz],
  [hx, -hz],
  [hx, hz],
  [-hx, hz],
];
const lerpQ = (a: Q, b: Q, t: number): Q => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

type LoftOpts = {
  face?: number;
  edge?: number;
  cx?: number;
  cz?: number;
  /** An upright edge at every `posts`th corner (0: none). */
  posts?: number;
  /** A ring of edges at every `rings`th level (0: none). */
  rings?: number;
  cap?: boolean;
  capTone?: number;
  o?: Opts;
  eo?: Opts;
  co?: Opts;
};

/**
 * A mesh drawn in a building's own frame: every point is moved, turned and scaled to its place
 * before it reaches the mesh, so one builder serves the studio piece and the game's streets.
 */
export class Kit {
  readonly m: Mesh;
  private readonly at: Vec3;
  private readonly c: number;
  private readonly s: number;
  readonly k: number;

  constructor(m: Mesh, place: Place = {}) {
    this.m = m;
    this.at = place.at ?? [0, GROUND_Y, 0];
    this.c = Math.cos(place.rot ?? 0);
    this.s = Math.sin(place.rot ?? 0);
    this.k = place.scale ?? 1;
  }

  T = (q: Q): Vec3 => [
    this.at[0] + this.k * (q[0] * this.c - q[2] * this.s),
    this.at[1] + this.k * q[1],
    this.at[2] + this.k * (q[0] * this.s + q[2] * this.c),
  ];
  /** The point faces turn away from. */
  axis(x: number, y: number, z: number) {
    this.m.centre = this.T([x, y, z]);
  }
  pivot(x: number, y: number, z: number) {
    this.m.pivot = this.T([x, y, z]);
  }
  line(a: Q, b: Q, tone: number, o?: Opts) {
    this.m.line(this.T(a), this.T(b), tone, o);
  }
  poly(pts: Q[], closed: boolean, tone: number, o?: Opts) {
    this.m.poly(pts.map(this.T), closed, tone, o);
  }
  tri(a: Q, b: Q, c: Q, tone: number, o?: Opts) {
    this.m.tri(this.T(a), this.T(b), this.T(c), tone, o);
  }
  quad(a: Q, b: Q, c: Q, d: Q, tone: number, o?: Opts) {
    this.tri(a, b, c, tone, o);
    this.tri(a, c, d, tone, o);
  }
  dot(q: Q, r: number, tone: number, o?: Opts) {
    this.m.dot(this.T(q), r * this.k, tone, o);
  }
  surf(
    f: (u: number, v: number) => Q,
    nu: number,
    nv: number,
    tone: number,
    o?: Opts,
    grid?: { tone: number; uEvery?: number; vEvery?: number; opts?: Opts },
  ) {
    this.m.surface((u, v) => this.T(f(u, v)), nu, nv, tone, o, grid);
  }
  geodesic(c: Q, r: number, freq: number, tone: number, e: number, cut = -0.02, o: Opts = {}) {
    this.m.geodesic(this.T(c), r * this.k, freq, tone, e, cut, o);
  }

  /**
   * A plan lofted through levels, each scaled, raised and turned: walls as faces, rings at the
   * levels, upright edges at the corners, a cap on top. Prisms, towers, twists, tapers, lathes.
   */
  loft(plan: Pt[], levels: Level[], lo: LoftOpts = {}): Q[][] {
    const { cx = 0, cz = 0, posts = 1, rings = 1 } = lo;
    const fT = lo.face ?? face;
    const eT = lo.edge ?? edge;
    const L = levels.map(([s, y, r = 0]) => {
      const c = Math.cos(r);
      const sn = Math.sin(r);
      return plan.map(([x, z]) => [cx + (x * c - z * sn) * s, y, cz + (x * sn + z * c) * s] as Q);
    });
    const n = plan.length;
    for (let i = 0; i + 1 < L.length; i++) {
      const A = L[i] as Q[];
      const B = L[i + 1] as Q[];
      this.axis(cx, ((levels[i] as Level)[1] + (levels[i + 1] as Level)[1]) / 2, cz);
      for (let j = 0; j < n; j++) {
        const j1 = (j + 1) % n;
        this.quad(A[j] as Q, A[j1] as Q, B[j1] as Q, B[j] as Q, fT, lo.o);
      }
    }
    if (rings > 0)
      for (let i = 0; i < L.length; i++)
        if (i % rings === 0 || i === L.length - 1) this.poly(L[i] as Q[], true, eT, lo.eo);
    if (posts > 0)
      for (let j = 0; j < n; j += posts)
        this.poly(
          L.map((l) => l[j] as Q),
          false,
          eT,
          lo.eo,
        );
    if (lo.cap) {
      const top = L[L.length - 1] as Q[];
      const y = (levels[levels.length - 1] as Level)[1];
      this.axis(cx, y - 3, cz);
      for (let j = 0; j < n; j++)
        this.tri([cx, y, cz], top[j] as Q, top[(j + 1) % n] as Q, lo.capTone ?? fT, lo.co ?? lo.o);
    }
    return L;
  }
  /** A box standing on (cx, y0, cz), turned `rot`. */
  box(cx: number, cz: number, hx: number, hz: number, y0: number, y1: number, rot = 0, lo = {}) {
    return this.loft(
      rect(hx, hz),
      [
        [1, y0, rot],
        [1, y1, rot],
      ],
      { cx, cz, cap: true, ...lo },
    );
  }
  /** A round form from a profile of (radius, height) pairs. */
  lathe(profile: Pt[], n: number, lo: LoftOpts = {}) {
    return this.loft(
      circ(n),
      profile.map(([r, y]) => [r, y] as Level),
      lo,
    );
  }
  /** A flat disc (or ring, from r0) at height y, faces up. */
  disc(cx: number, y: number, cz: number, r1: number, tone: number, r0 = 0, o: Opts = {}) {
    this.axis(cx, y - 4, cz);
    const n = Math.max(16, Math.ceil(r1 * 2.5));
    this.surf(
      (u, v) => {
        const a = u * TAU;
        const r = r0 + (r1 - r0) * v;
        return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      },
      n,
      1,
      tone,
      o,
    );
  }
  ring(cx: number, y: number, cz: number, r: number, tone: number, o?: Opts, n = 32) {
    this.poly(
      ngon(n, r).map(([x, z]) => [cx + x, y, cz + z] as Q),
      true,
      tone,
      o,
    );
  }
  /** A ring of `n` lamps round a circle. */
  lamps(cx: number, y: number, cz: number, r: number, n: number, tone = light, w = 0.08) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.dot([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r], 0.16, tone, { w });
    }
  }
  /** Windows: `per` lamps along every side of a ring of corners, standing a little out. */
  windows(corners: Q[], per: number, cx = 0, cz = 0, w = 0.06, tone = light) {
    const n = corners.length;
    for (let j = 0; j < n; j++) {
      const A = corners[j] as Q;
      const B = corners[(j + 1) % n] as Q;
      for (let q = 0; q < per; q++) {
        const p = lerpQ(A, B, (q + 0.5) / per);
        const d = Math.hypot(p[0] - cx, p[2] - cz) || 1;
        this.dot(
          [p[0] + ((p[0] - cx) / d) * 0.08, p[1], p[2] + ((p[2] - cz) / d) * 0.08],
          0.15,
          tone,
          {
            w,
          },
        );
      }
    }
  }
  /**
   * A flight of steps from its foot (x0, y0, z0) along (dx, dz) for `run`, up to y1, `width`
   * across: risers and treads as faces, nosings and strings as edges, a lamp each side of the foot.
   */
  stair(
    x0: number,
    z0: number,
    dx: number,
    dz: number,
    width: number,
    y0: number,
    y1: number,
    run: number,
  ) {
    const n = Math.max(3, Math.round((y1 - y0) / 0.32));
    const P = (s: number, y: number, w: number): Q => [
      x0 + dx * s - dz * w,
      y,
      z0 + dz * s + dx * w,
    ];
    const hw = width / 2;
    // Behind and below the top step: risers face the foot, treads face up.
    this.axis(x0 + dx * (run + 2), y0 - 2, z0 + dz * (run + 2));
    for (let j = 0; j < n; j++) {
      const s0 = (run * j) / n;
      const s1 = (run * (j + 1)) / n;
      const ya = y0 + ((y1 - y0) * j) / n;
      const yb = y0 + ((y1 - y0) * (j + 1)) / n;
      this.quad(P(s0, ya, -hw), P(s0, ya, hw), P(s0, yb, hw), P(s0, yb, -hw), face);
      this.quad(P(s0, yb, -hw), P(s0, yb, hw), P(s1, yb, hw), P(s1, yb, -hw), face);
      this.line(P(s0, yb, -hw), P(s0, yb, hw), edge, { w: 0.8 });
    }
    for (const w of [-hw, hw]) {
      this.line(P(0, y0, w), P(run, y1, w), edge, { w: 1.2 });
      this.tri(P(0, y0, w), P(run, y0, w), P(run, y1, w), face, { two: true, w: 0.5 });
      this.dot(P(-0.3, y0 + 0.7, w * 1.25), 0.3, light, { w: 0.3 });
    }
  }
}

/* ---------- the site: a plinth and curvy walkways of dotted light ---------- */

export type Site = {
  shape: 'round' | 'square' | 'oct';
  r: number;
  amp: number;
  lobes: number;
  ph?: number;
};

/** How far the plinth's corners reach from the middle. */
const corner = (s: Site) =>
  s.shape === 'square' ? s.r * Math.SQRT2 : s.shape === 'oct' ? s.r / Math.cos(Math.PI / 8) : s.r;
/** The walkway loop's middle radius: clear of the plinth's corners at its narrowest. */
const loopR = (s: Site) => corner(s) + 2.2 + 1.35 * s.amp;
/** How far the site reaches from the middle (the loop's widest, and its border). */
export const siteReach = (s: Site) => loopR(s) + 1.35 * s.amp + 1.2;

function site(k: Kit, s: Site) {
  const plan =
    s.shape === 'round'
      ? ngon(48, s.r)
      : s.shape === 'oct'
        ? ngon(8, corner(s), Math.PI / 8)
        : rect(s.r, s.r);
  k.loft(
    plan,
    [
      [1, 0],
      [1, 0.6],
    ],
    {
      cap: true,
      capTone: ground,
      co: { w: 0.3 },
      o: { w: 0.6 },
      posts: s.shape === 'round' ? 0 : 1,
    },
  );
  // The loop: a closed curve swelling and narrowing round the plinth, its borders faint, lamps
  // dotted down its middle, a tree now and then on its outer side.
  const R = loopR(s);
  const N = 180;
  const ph = s.ph ?? 0;
  const at = (i: number, off: number, y = 0.08): Q => {
    const a = (i / N) * TAU;
    const rr =
      R + s.amp * Math.sin(s.lobes * a + ph) + 0.35 * s.amp * Math.sin((2 * s.lobes + 1) * a) + off;
    return [Math.cos(a) * rr, y, Math.sin(a) * rr];
  };
  for (const off of [-0.7, 0.7])
    k.poly(
      Array.from({ length: N }, (_, i) => at(i, off)),
      true,
      road,
      { w: 0.22 },
    );
  for (let i = 0; i < N; i += 3) k.dot(at(i, 0, 0.22), 0.13, light, { w: 0.05 });
  for (let i = 7; i < N; i += 15) {
    const base = at(i, 2.4, 0);
    k.line(base, [base[0], 1.8, base[2]], plant, { w: 0.5 });
    k.dot([base[0], 2.2, base[2]], 0.9, plant, { w: 0.25 });
  }
  // Two winding spurs, out from the front and the back of the plinth to the edge of the site.
  const r0 = s.r;
  const r1 = siteReach(s) + 4;
  for (const side of [1, -1]) {
    const M = 48;
    const sp = (j: number, off: number, y = 0.08): Q => {
      const f = j / M;
      const x = side * 2.6 * Math.sin(TAU * 0.9 * f + ph) * f + off;
      return [x, y, side * (r0 + (r1 - r0) * f)];
    };
    for (const off of [-0.65, 0.65])
      k.poly(
        Array.from({ length: M + 1 }, (_, j) => sp(j, off)),
        false,
        road,
        { w: 0.22 },
      );
    for (let j = 1; j <= M; j += 2) k.dot(sp(j, 0, 0.22), 0.13, light, { w: 0.05 });
  }
}

/* ---------- the twenty buildings ---------- */

/** 1. Sun Stair: three terraces, one grand stairway up them all, a hall of fourteen columns. */
function sunStair(k: Kit) {
  let y = 0.6;
  for (const [hx, hz] of [
    [13, 9],
    [10.5, 7],
    [8, 5],
  ] as Pt[]) {
    k.box(0, 0, hx, hz, y, y + 1.6);
    y += 1.6;
  }
  k.stair(0, 13.4, 0, -1, 6, 0.6, y, 8.4);
  for (let x = -6; x <= 6; x += 2)
    for (const z of [-3.4, 3.4])
      k.loft(
        ngon(8, 1),
        [
          [0.36, y],
          [0.3, y + 5],
        ],
        { cx: x, cz: z, posts: 4 },
      );
  const yb = y + 5;
  k.box(0, 0, 7.2, 4.2, yb, yb + 0.7);
  const ye = yb + 0.7;
  const yr = ye + 2.2;
  k.axis(0, ye - 2, 0);
  for (const z of [-4.2, 4.2]) {
    k.quad([-7.2, ye, z], [7.2, ye, z], [7.2, yr, 0], [-7.2, yr, 0], face);
    k.line([-7.2, ye, z], [7.2, ye, z], edge, { w: 1.2 });
  }
  for (const x of [-7.2, 7.2]) {
    k.tri([x, ye, -4.2], [x, ye, 4.2], [x, yr, 0], face, { two: true });
    k.poly(
      [
        [x, ye, -4.2],
        [x, yr, 0],
        [x, ye, 4.2],
      ],
      false,
      edge,
      { w: 1.2 },
    );
  }
  k.line([-7.2, yr, 0], [7.2, yr, 0], edge, { w: 1.5 });
  k.dot([0, y + 2.4, 0], 2.2, light, { anim: Anim.pulse, key: 0.4, w: 0.7 });
  for (const x of [-3.8, 3.8])
    k.dot([x, y + 0.7, 5.6], 0.5, fire, { anim: Anim.pulse, key: x, w: 0.8 });
}

/** 2. Step Mastaba: six battered levels, each a seventh smaller, a stair up the front, two obelisks. */
function stepMastaba(k: Kit) {
  let y = 0.6;
  for (let i = 0; i < 6; i++) {
    const h = 12 * (1 - i / 7);
    k.loft(
      rect(h, h),
      [
        [1, y],
        [0.94, y + 2.2],
      ],
      { cap: true },
    );
    y += 2.2;
  }
  // From the plinth's front edge up to the top level's (12/7·2, battered to 0.94) front face.
  k.stair(0, 15.4, 0, -1, 3, 0.6, y, 15.4 - ((12 * 2) / 7) * 0.94);
  k.box(0, 0, 1.4, 1.4, y, y + 2.4);
  k.dot([0, y + 1.2, 0], 1.2, light, { anim: Anim.pulse, key: 1.1, w: 0.6 });
  for (const x of [-6.5, 6.5]) {
    const z = 13.8;
    k.loft(
      rect(0.7, 0.7),
      [
        [1, 0.6],
        [0.55, 10],
      ],
      { cx: x, cz: z },
    );
    k.axis(x, 9, z);
    const c = rect(0.385, 0.385).map(([a, b]) => [x + a, 10, z + b] as Q);
    for (let j = 0; j < 4; j++) {
      k.tri(c[j] as Q, c[(j + 1) % 4] as Q, [x, 11, z], face);
      k.line(c[j] as Q, [x, 11, z], edge);
    }
    k.dot([x, 11.1, z], 0.35, light, { w: 0.4 });
  }
  // An avenue of lamps on low posts leading in.
  for (let j = 0; j < 5; j++)
    for (const x of [-3.2, 3.2]) {
      const z = 15.6 + j * 1.8;
      k.line([x, 0, z], [x, 1.2, z], edge, { w: 0.6 });
      k.dot([x, 1.35, z], 0.22, fire, { w: 0.25 });
    }
}

/** 3. Pagoda (Chinatown): nine eight-sided storeys, each 0.91 the last, upturned eaves, lanterns. */
function pagoda(k: Kit) {
  k.box(0, 0, 7, 7, 0.6, 1.8);
  k.stair(0, 10, 0, -1, 3.6, 0.6, 1.8, 3);
  let y = 1.8;
  let r = 5;
  let h = 2.4;
  for (let i = 0; i < 9; i++) {
    const L = k.loft(
      ngon(8, r, Math.PI / 8),
      [
        [1, y],
        [1, y + h],
      ],
      {},
    );
    const mid = (L[0] as Q[]).map((p) => [p[0], y + h * 0.5, p[2]] as Q);
    k.windows(mid, 1, 0, 0, 0.12);
    const yt = y + h;
    const ro = r + 1.5;
    k.axis(0, yt - 4, 0);
    const C = ngon(8, r, Math.PI / 8).map(([x, z]) => [x, yt + 0.3, z] as Q);
    const O = ngon(8, ro, Math.PI / 8).map(([x, z]) => [x, yt + 0.45, z] as Q);
    for (let j = 0; j < 8; j++) {
      const j1 = (j + 1) % 8;
      const ci = C[j] as Q;
      const cj = C[j1] as Q;
      const oi = O[j] as Q;
      const oj = O[j1] as Q;
      const m = lerpQ(oi, oj, 0.5);
      const M: Q = [m[0], yt - 0.35, m[2]];
      const cm = lerpQ(ci, cj, 0.5);
      k.quad(ci, oi, M, cm, face);
      k.quad(cm, M, oj, cj, face);
      k.poly([oi, M, oj], false, edge, { w: 1.2 });
      k.line(ci, oi, edge, { w: 0.8 });
      k.dot([oi[0], oi[1] - 0.7, oi[2]], 0.3, fire, { anim: Anim.pulse, key: i + j, w: 0.35 });
    }
    y = yt + 0.3;
    r *= 0.91;
    h *= 0.95;
  }
  for (let j = 0; j < 7; j++) k.ring(0, y + 0.5 + j * 0.6, 0, 0.9 - j * 0.1, edge, { w: 0.8 }, 12);
  k.line([0, y, 0], [0, y + 5.4, 0], edge, { w: 1.2 });
  k.dot([0, y + 5.6, 0], 0.4, light, { w: 0.5 });
  // A round moon gate on the front path.
  k.poly(
    Array.from({ length: 33 }, (_, j) => {
      const a = (j / 32) * TAU;
      return [Math.cos(a) * 2.6, 2.8 + Math.sin(a) * 2.6, 13] as Q;
    }),
    true,
    fire,
    { w: 0.6 },
  );
}

/** 4. Shikhara (Spice Quarter): a ribbed curving tower over a pillared hall, on a high plinth. */
function shikhara(k: Kit) {
  k.box(0, 0, 8, 8, 0.6, 3);
  k.stair(0, 12, 0, -1, 4, 0.6, 3, 4);
  const plan = circ(16, Math.PI / 16).map(([x, z], i) => {
    const r = i % 2 ? 0.84 : 1;
    return [x * r, z * r] as Pt;
  });
  const H = 22;
  const levels: Level[] = Array.from({ length: 19 }, (_, i) => {
    const t = (i / 18) * 0.92;
    return [5.2 * (1 - t ** 2.4) ** 0.55, 3 + H * t];
  });
  k.loft(plan, levels, { cz: -2, posts: 2, cap: true });
  const yt = 3 + H * 0.92;
  const rt = (levels[18] as Level)[0];
  k.loft(
    circ(24),
    [
      [rt, yt],
      [rt * 1.3, yt + 0.5],
      [rt, yt + 1],
      [rt * 0.4, yt + 1.2],
    ],
    { cz: -2, posts: 1, cap: true },
  );
  k.loft(
    circ(10),
    [
      [0.5, yt + 1.2],
      [0.8, yt + 1.8],
      [0.3, yt + 2.4],
      [0.08, yt + 3.2],
    ],
    { cz: -2, posts: 2 },
  );
  k.dot([0, yt + 3.4, -2], 0.4, light, { w: 0.5 });
  // The hall in front: sixteen pillars under a stepped pyramid roof.
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      if (i % 3 === 0 || j % 3 === 0)
        k.loft(
          ngon(6, 0.28),
          [
            [1, 3],
            [1, 6.4],
          ],
          { cx: -2.7 + i * 1.8, cz: 2.4 + j * 1.6, posts: 3 },
        );
  k.loft(
    rect(3.4, 3.2),
    [
      [1, 6.4],
      [0.75, 7.4],
      [0.5, 8.4],
      [0.12, 9.6],
    ],
    { cz: 4.8, cap: true },
  );
  k.dot([0, 4.6, 4.8], 1.3, light, { anim: Anim.pulse, key: 2, w: 0.5 });
  for (let i = 0; i < 9; i++)
    k.dot([-6 + i * 1.5, 3.3, 7.9], 0.2, fire, { anim: Anim.pulse, key: i, w: 0.2 });
}

/** 5. Domed Hall (Bazaar Quarter): a square hall, a dome on a drum of windows, four half domes, four minarets. */
function domedHall(k: Kit) {
  k.box(0, 0, 9, 9, 0.6, 6.6);
  for (const y of [2.4, 4.8])
    k.windows(
      rect(9, 9).map(([x, z]) => [x, y, z] as Q),
      6,
      0,
      0,
      0.06,
    );
  k.lathe(
    [
      [6, 6.6],
      [6, 8.4],
    ],
    24,
    { posts: 2 },
  );
  k.lamps(0, 7.5, 0, 6.1, 24, light, 0.12);
  const prof = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 7) * (Math.PI / 2) * 0.97;
    return [6 * Math.cos(a), 8.4 + 6 * Math.sin(a)] as Pt;
  });
  k.lathe(prof, 24, { posts: 2, rings: 2, cap: true });
  k.line([0, 14.2, 0], [0, 15.6, 0], edge, { w: 1 });
  k.dot([0, 15.8, 0], 0.35, light, { w: 0.5 });
  for (let s = 0; s < 4; s++) {
    const al = (s / 4) * TAU;
    const cx = Math.cos(al) * 6;
    const cz = Math.sin(al) * 6;
    k.axis(cx, 6.6, cz);
    k.surf(
      (u, v) => {
        const th = al - Math.PI / 2 + u * Math.PI;
        const lat = v * (Math.PI / 2);
        return [
          cx + 4.2 * Math.cos(lat) * Math.cos(th),
          6.6 + 4.2 * Math.sin(lat),
          cz + 4.2 * Math.cos(lat) * Math.sin(th),
        ];
      },
      12,
      4,
      face,
      {},
      { tone: edge, uEvery: 3, vEvery: 2 },
    );
  }
  for (const [x, z] of [
    [-11.5, -11.5],
    [11.5, -11.5],
    [11.5, 11.5],
    [-11.5, 11.5],
  ] as Pt[]) {
    k.loft(
      circ(10),
      [
        [0.8, 0.6],
        [0.8, 19],
        [0.65, 19],
        [0.65, 23],
        [0.5, 23],
        [0, 27],
      ],
      { cx: x, cz: z, posts: 5 },
    );
    for (const y of [14, 21]) {
      k.disc(x, y, z, 1.4, ground, 0.8, { w: 0.6 });
      k.ring(x, y + 0.6, z, 1.4, edge, { w: 0.8 }, 14);
      k.lamps(x, y + 0.3, z, 1.45, 6, light, 0.12);
    }
    k.dot([x, 27.2, z], 0.25, light, { w: 0.3 });
  }
  k.disc(0, 0.7, 12, 1.6, water, 0, { w: 0.6 });
  k.ring(0, 0.8, 12, 1.6, edge, { w: 0.6 }, 16);
}

/** 6. Sky Bridge (Business District): two chamfered towers with slanted crowns, joined high up. */
function skyBridge(k: Kit) {
  k.box(0, 0, 12, 5, 0.6, 3.6);
  const ch = (h: number, c: number): Pt[] => [
    [-h + c, -h],
    [h - c, -h],
    [h, -h + c],
    [h, h - c],
    [h - c, h],
    [-h + c, h],
    [-h, h - c],
    [-h, -h + c],
  ];
  const tower = (
    cx: number,
    rot: number,
    top: (x: number, z: number) => number,
    floors: number,
  ) => {
    const plan = ch(4.5, 1.4);
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const at = ([x, z]: Pt, y: number): Q => [cx + x * c - z * s, y, x * s + z * c];
    const lo = plan.map((p) => at(p, 0.6));
    const hi = plan.map((p) => at(p, top(p[0], p[1])));
    k.axis(cx, floors / 2, 0);
    for (let j = 0; j < 8; j++) {
      const j1 = (j + 1) % 8;
      k.quad(lo[j] as Q, lo[j1] as Q, hi[j1] as Q, hi[j] as Q, face);
      k.line(lo[j] as Q, hi[j] as Q, edge, { w: 1.2 });
    }
    k.poly(hi, true, edge, { w: 1.4 });
    for (let y = 4; y < floors; y += 2.4)
      k.poly(
        plan.map((p) => at(p, y)),
        true,
        edge,
        { w: 0.35 },
      );
    for (let y = 5.2; y < floors; y += 1.6)
      k.windows(
        plan.map((p) => at(p, y)),
        2,
        cx,
        0,
        0.05,
      );
    const cTop: Q = [cx, top(0, 0), 0];
    k.axis(cx, floors - 4, 0);
    for (let j = 0; j < 8; j++) k.tri(cTop, hi[j] as Q, hi[(j + 1) % 8] as Q, glass, { two: true });
    k.line(cTop, [cx, top(0, 0) + 4, 0], edge, { w: 0.8 });
    k.dot([cx, top(0, 0) + 4.2, 0], 0.3, fire, { anim: Anim.pulse, key: cx, w: 0.4 });
  };
  tower(-7, 0.2, (x) => 34 + 0.5 * x, 33);
  tower(7, -0.2, (_, z) => 28 - 0.6 * z, 25);
  // The bridge at 20: a glazed tube of four edges and ribs, lights flowing along its floor.
  const y0 = 20;
  const y1 = 22.4;
  k.axis(0, 21.2, 0);
  for (const z of [-1.2, 1.2])
    k.quad([-3, y0, z], [3, y0, z], [3, y1, z], [-3, y1, z], glass, { two: true });
  k.quad([-3, y1, -1.2], [3, y1, -1.2], [3, y1, 1.2], [-3, y1, 1.2], face);
  for (const [y, z] of [
    [y0, -1.2],
    [y0, 1.2],
    [y1, -1.2],
    [y1, 1.2],
  ] as Pt[])
    k.line([-3, y, z], [3, y, z], edge, { w: 1.2 });
  for (let x = -3; x <= 3; x += 0.75)
    k.poly(
      [
        [x, y0, -1.2],
        [x, y1, -1.2],
        [x, y1, 1.2],
        [x, y0, 1.2],
      ],
      true,
      edge,
      { w: 0.4 },
    );
  k.line([-3, y0 + 0.1, 0], [3, y0 + 0.1, 0], light, { anim: Anim.flow, key: 1, w: 2 });
}

/** 7. Tree Tower (Solarpunk Gardens): a tapering trunk, ten garden pads branching on the golden angle. */
function treeTower(k: Kit) {
  k.lathe(
    [
      [3, 0.6],
      [2.4, 6],
      [2, 20],
      [1.6, 32],
    ],
    16,
    { posts: 2 },
  );
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * TAU;
    k.poly(
      Array.from({ length: 9 }, (_, j) => {
        const f = j / 8;
        const a = a0 + f * 0.7;
        const r = 2.6 + 4.6 * f;
        return [Math.cos(a) * r, 0.6 + 1.8 * (1 - f) ** 2, Math.sin(a) * r] as Q;
      }),
      false,
      plant,
      { w: 0.8 },
    );
  }
  for (let i = 0; i < 10; i++) {
    const y = 4 + i * 2.7;
    const a = i * GOLDEN_ANGLE;
    const rp = 3.9 - i * 0.12;
    const d = 2 + rp * 0.6;
    const cx = Math.cos(a) * d;
    const cz = Math.sin(a) * d;
    k.loft(
      circ(16),
      [
        [rp, y],
        [rp, y + 0.5],
      ],
      { cx, cz, posts: 0, cap: true, capTone: plant, co: { w: 0.35 } },
    );
    k.ring(cx, y + 1.4, cz, rp, edge, { w: 0.5 }, 16);
    k.line([0, y - 1.2, 0], [cx, y, cz], edge, { w: 0.8 });
    for (let j = 0; j < 3; j++) {
      const b = a + (j - 1) * 0.9;
      const pr = rp * 0.55;
      k.dot([cx + Math.cos(b) * pr, y + 1.4, cz + Math.sin(b) * pr], 1, plant, { w: 0.4 });
    }
    k.dot([cx, y + 2, cz], 0.3, light, { w: 0.2 });
  }
  // A crown of seven solar leaves.
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * TAU;
    const c: Q = [Math.cos(a) * 3.4, 33.2, Math.sin(a) * 3.4];
    const t: Q = [-Math.sin(a), 0, Math.cos(a)];
    const out: Q = [Math.cos(a) * 1.6, 0.9, Math.sin(a) * 1.6];
    const p0: Q = [c[0] - t[0] * 1.3 - out[0], c[1] - out[1], c[2] - t[2] * 1.3 - out[2]];
    const p1: Q = [c[0] + t[0] * 1.3 - out[0], c[1] - out[1], c[2] + t[2] * 1.3 - out[2]];
    const p2: Q = [p1[0] + 2 * out[0], p1[1] + 2 * out[1], p1[2] + 2 * out[2]];
    const p3: Q = [p0[0] + 2 * out[0], p0[1] + 2 * out[1], p0[2] + 2 * out[2]];
    k.quad(p0, p1, p2, p3, glass, { two: true, w: 1.5 });
    k.poly([p0, p1, p2, p3], true, edge, { w: 0.7 });
    k.line([0, 32, 0], c, edge, { w: 0.6 });
  }
  k.dot([0, 33.6, 0], 0.9, light, { anim: Anim.pulse, key: 0.8, w: 0.5 });
}

/** 8. Porthole Hall (Atlantis Quarter): a drum ringed with portholes under a glass dome, in a moat. */
function portholeHall(k: Kit) {
  k.disc(0, 0.62, 0, 13.6, water, 10.5, { w: 0.5 });
  for (const r of [11.2, 12.2, 13.1]) k.ring(0, 0.66, 0, r, water, { w: 0.4 }, 48);
  k.lathe(
    [
      [9, 0.6],
      [9, 3.3],
      [9, 6],
      [9, 8.6],
    ],
    36,
    { posts: 2 },
  );
  for (let row = 0; row < 3; row++) {
    const y = 2 + row * 2.65;
    for (let i = 0; i < 18; i++) {
      const a = ((i + (row % 2) * 0.5) / 18) * TAU;
      const R = 9.06;
      const C: Q = [Math.cos(a) * R, y, Math.sin(a) * R];
      const t: Q = [-Math.sin(a), 0, Math.cos(a)];
      const hole = (r: number) =>
        Array.from({ length: 12 }, (_, j) => {
          const b = (j / 12) * TAU;
          return [
            C[0] + t[0] * Math.cos(b) * r,
            y + Math.sin(b) * r,
            C[2] + t[2] * Math.cos(b) * r,
          ] as Q;
        });
      k.poly(hole(0.62), true, edge, { w: 0.9 });
      k.poly(hole(0.82), true, edge, { w: 0.35 });
      k.dot(C, 0.45, light, { anim: Anim.pulse, key: i * 0.7 + row, w: 0.35 });
    }
  }
  k.geodesic([0, 8.6, 0], 8.6, 3, glass, edge, -0.02, { two: true });
  k.dot([0, 12, 0], 2.4, water, { anim: Anim.pulse, key: 1.3, w: 0.6 });
  k.dot([0, 17.4, 0], 0.5, light, { w: 0.5 });
  for (let j = 0; j < 4; j++) {
    const a = Math.PI / 4 + (j / 4) * TAU;
    k.box(Math.cos(a) * 11.6, Math.sin(a) * 11.6, 2.6, 1, 0.6, 1.1, a);
    for (const s of [-1, 1])
      k.dot(
        [Math.cos(a) * 13.8 - Math.sin(a) * s, 1.5, Math.sin(a) * 13.8 + Math.cos(a) * s],
        0.22,
        light,
        { w: 0.2 },
      );
  }
}

/** 9. Nova Core: a ruled lattice shell (a hyperboloid of straight struts) round a core of light, rings orbiting. */
function novaCore(k: Kit) {
  k.lathe(
    [
      [8, 0.6],
      [8, 2.2],
      [7, 2.6],
    ],
    32,
    { posts: 4 },
  );
  const rb = 7;
  const rt = 5;
  const yb = 2.6;
  const yt = 32;
  const tw = TAU * 0.3;
  const B = (a: number): Q => [Math.cos(a) * rb, yb, Math.sin(a) * rb];
  const Tq = (a: number): Q => [Math.cos(a) * rt, yt, Math.sin(a) * rt];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    k.line(B(a), Tq(a + tw), edge, { w: 1 });
    k.line(B(a), Tq(a - tw), edge, { w: 1 });
  }
  const S = (u: number, v: number) => lerpQ(B(u * TAU), Tq(u * TAU + tw), v);
  k.axis(0, 16, 0);
  k.surf(S, 40, 12, glass, { two: true, w: 0.6 });
  for (const v of [0, 0.25, 0.5, 0.75, 1])
    k.poly(
      Array.from({ length: 40 }, (_, i) => S(i / 40, v)),
      true,
      edge,
      { w: 0.6 },
    );
  for (let y = 1.5; y < 33; y += 1.5)
    k.dot([0, y, 0], 0.9, light, { anim: Anim.pulse, key: y * 0.35, w: 0.25 });
  k.line([0, 0.6, 0], [0, 34, 0], light, { anim: Anim.flow, key: 2, w: 0.6 });
  k.pivot(0, 0, 0);
  for (const [y, r, tilt, key] of [
    [10, 8.6, 0.25, 0.05],
    [18, 6.4, -0.3, -0.04],
    [26, 7.6, 0.18, 0.06],
  ]) {
    const o = { anim: Anim.orbit, key, w: 0.9 };
    const pts = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * TAU;
      return [
        Math.cos(a) * r,
        y + Math.sin(a) * r * Math.sin(tilt),
        Math.sin(a) * r * Math.cos(tilt),
      ] as Q;
    });
    k.poly(pts, true, edge, o);
    for (let i = 0; i < 40; i += 5) k.dot(pts[i] as Q, 0.25, light, { ...o, w: 0.15 });
  }
}

/** 10. Twist (Business District): forty square floors, each turned 2.25° from the one below. */
function twist(k: Kit) {
  const n = 40;
  const L = k.loft(
    rect(4.6, 4.6),
    Array.from(
      { length: n + 1 },
      (_, i) => [1 - 0.15 * (i / n), 0.6 + i * 0.8, (i / n) * (Math.PI / 2)] as Level,
    ),
    { rings: 2, cap: true },
  );
  for (let i = 1; i < n; i += 2) {
    const ring = (L[i] as Q[]).map((p) => [p[0], p[1] + 0.4, p[2]] as Q);
    k.windows(ring, 3, 0, 0, 0.04);
  }
  const top = 0.6 + n * 0.8;
  k.ring(0, top + 0.3, 0, 2.2, light, { w: 0.8 }, 16);
  k.line([0, top, 0], [0, top + 5, 0], edge, { w: 0.8 });
  k.dot([0, top + 5.2, 0], 0.3, fire, { anim: Anim.pulse, key: 0.5, w: 0.4 });
}

/** A rounded pebble: a superellipse plan swelling up a soft profile to a rounded crown. */
function pebbleForm(k: Kit, cx: number, cz: number, a: number, b: number, H: number, rot: number) {
  const plan = circ(32).map(([c, s]) => {
    const e = 2 / 3;
    return [a * Math.sign(c) * Math.abs(c) ** e, b * Math.sign(s) * Math.abs(s) ** e] as Pt;
  });
  const n = 24;
  const L = k.loft(
    plan,
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      return [
        Math.max(0.02, Math.sin(Math.PI * (0.12 + 0.88 * t)) ** 0.35),
        0.6 + H * t,
        rot,
      ] as Level;
    }),
    { cx, cz, posts: 4, rings: 3 },
  );
  for (let i = 2; i < n - 2; i += 2) k.poly(L[i] as Q[], true, light, { w: 0.25 });
}

/** 11. Pebbles (Riverside): a family of three rounded towers on soft superellipse plans. */
function pebbles(k: Kit) {
  pebbleForm(k, -1.5, -1, 6, 4.2, 27, 0.2);
  pebbleForm(k, 6.2, 4, 3, 2.2, 13, -0.6);
  pebbleForm(k, -5.5, 5.5, 2.4, 1.8, 8, 1.1);
  k.loft(
    ngon(20, 1),
    [
      [3.4, 4],
      [3.4, 4.4],
    ],
    { cx: -1.5, cz: 3.4, posts: 0, cap: true },
  );
  k.lamps(-1.5, 3.8, 3.4, 3.2, 10, light, 0.1);
}

/** A faceted crystal: triangles turned 60° each section, joined by diagonal facets (antiprisms). */
function crystalForm(k: Kit, cx: number, cz: number, s: number) {
  const secs: [number, number, number][] = [
    [8, 0.6, 0],
    [9, 13, Math.PI / 3],
    [4, 28, 0],
  ];
  const tri3 = ([r, y, a]: [number, number, number]) =>
    [0, 1, 2].map((i) => {
      const t = a + (i / 3) * TAU + Math.PI / 2;
      return [cx + Math.cos(t) * r * s, 0.6 + (y - 0.6) * s, cz + Math.sin(t) * r * s] as Q;
    });
  const T3 = secs.map(tri3);
  const ang = (p: Q) => (Math.atan2(p[2] - cz, p[0] - cx) + TAU) % TAU;
  for (let q = 0; q + 1 < T3.length; q++) {
    const A = T3[q] as Q[];
    const B = T3[q + 1] as Q[];
    k.axis(cx, ((A[0] as Q)[1] + (B[0] as Q)[1]) / 2, cz);
    // The six corners in turn round the axis alternate low, high, low…: every three in a row make
    // one facet, so the band is six diagonal triangles (an antiprism).
    const v = [...A, ...B].sort((a, b) => ang(a) - ang(b));
    for (let i = 0; i < 6; i++) {
      const a = v[i] as Q;
      const b = v[(i + 1) % 6] as Q;
      k.tri(a, b, v[(i + 2) % 6] as Q, i % 2 ? glass : face, { two: true });
      k.line(a, b, edge, { w: 1.2 });
    }
    k.poly(A, true, edge, { w: 1.4 });
    k.poly(B, true, edge, { w: 1.4 });
  }
  const top = T3[2] as Q[];
  const apex: Q = [cx, 0.6 + 33 * s, cz];
  k.axis(cx, 0.6 + 25 * s, cz);
  for (let i = 0; i < 3; i++) {
    k.tri(top[i] as Q, top[(i + 1) % 3] as Q, apex, face);
    k.line(top[i] as Q, apex, edge, { w: 1.2 });
  }
  k.dot([cx, 0.6 + 13 * s, cz], 2.4 * s, light, { anim: Anim.pulse, key: cx, w: 0.5 });
  k.dot(apex, 0.4, light, { w: 0.4 });
}

/** 12. Crystal (Arts District): a faceted tower of diagonal triangles, a smaller shard beside it. */
function crystal(k: Kit) {
  crystalForm(k, 0, -1, 1);
  crystalForm(k, 6.5, 5.5, 0.42);
}

/** 13. Trio (Old Town Edge): a square podium, a round tower cut by a slanted roof, a diagonal blade. */
function trio(k: Kit) {
  const L = k.box(0, 0, 9, 7, 0.6, 5.6);
  for (const y of [2, 4]) {
    const ring = (L[0] as Q[]).map((p) => [p[0], y, p[2]] as Q);
    k.windows(ring, 7, 0, 0, 0.05);
  }
  const cx = -2.5;
  const cz = -1;
  const R = 5;
  const n = 28;
  const top = (x: number) => 22 + 3 * (x / R);
  const lo: Q[] = [];
  const hi: Q[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    lo.push([cx + x, 5.6, cz + z]);
    hi.push([cx + x, top(x), cz + z]);
  }
  k.axis(cx, 14, cz);
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    k.quad(lo[i] as Q, lo[i1] as Q, hi[i1] as Q, hi[i] as Q, face);
    if (i % 2 === 0) k.line(lo[i] as Q, hi[i] as Q, edge, { w: 0.8 });
  }
  k.poly(hi, true, edge, { w: 1.5 });
  for (let y = 7.6; y < 19; y += 2.4) k.ring(cx, y, cz, R, edge, { w: 0.4 }, n);
  for (let y = 8.8; y < 19; y += 2.4) k.lamps(cx, y, cz, R + 0.08, 20, light, 0.06);
  k.axis(cx, 18, cz);
  for (let i = 0; i < n; i++)
    k.tri([cx, 22, cz], hi[i] as Q, hi[(i + 1) % n] as Q, glass, { two: true });
  // The blade: a wedge leaning on the tower, its long edge a diagonal.
  const z0 = 1.6;
  const z1 = 3.2;
  const A: Pt = [2.4, 5.6];
  const Bp: Pt = [8.6, 5.6];
  const C: Pt = [2.4, 18];
  const at = ([x, y]: Pt, z: number): Q => [x, y, z];
  k.axis(4, 8, 2.4);
  for (const z of [z0, z1]) {
    k.tri(at(A, z), at(Bp, z), at(C, z), face, { two: true });
    k.poly([at(A, z), at(Bp, z), at(C, z)], true, edge, { w: 1.2 });
  }
  k.quad(at(Bp, z0), at(C, z0), at(C, z1), at(Bp, z1), glass, { two: true });
  for (let j = 1; j < 6; j++) {
    const f = j / 6;
    k.line(
      at([A[0], 5.6 + 12.4 * f], z1 + 0.02),
      at([A[0] + 6.2 * (1 - f) + 0.01, 5.6], z1 + 0.02),
      light,
      {
        w: 0.3,
      },
    );
  }
}

/** 14. Cantilever (Design Quarter): six long boxes stacked, each turned 30° and slid out 2.5. */
function cantilever(k: Kit) {
  k.lathe(
    [
      [1.5, 0.6],
      [1.5, 21.6],
    ],
    12,
    { posts: 3, rings: 1, face: glass, o: { two: true } },
  );
  for (let i = 0; i < 6; i++) {
    const rot = (i * Math.PI) / 6;
    const sh = i % 2 ? 2.5 : -2.5;
    const cx = Math.cos(rot) * sh;
    const cz = Math.sin(rot) * sh;
    const y0 = 0.6 + i * 3.4 + (i ? 0.6 : 0);
    const L = k.box(cx, cz, 6.5, 2.6, y0, y0 + 3);
    const mid = (L[0] as Q[]).map((p) => [p[0], y0 + 1.5, p[2]] as Q);
    k.poly(mid, true, light, { w: 0.6 });
    k.windows(mid, 6, cx, cz, 0.05);
  }
  k.dot([0, 22.4, 0], 0.7, plant, { w: 0.3 });
  for (let j = 0; j < 4; j++)
    k.dot([Math.cos(j * 1.6) * 3, 22.4, Math.sin(j * 1.6) * 3 - 1.2], 0.8, plant, { w: 0.3 });
}

/** 15. Great Arch (University Quarter): a catenary arch 22 high over a pool, a half cloister behind. */
function greatArch(k: Kit) {
  const a = 4.5;
  const Lh = 11;
  const H0 = 0.6 + a * (Math.cosh(Lh / a) - 1);
  const C = (u: number, sx: number, sz: number): Q => {
    const x = -Lh + 2 * Lh * u;
    const y = H0 - a * (Math.cosh(x / a) - 1);
    const d = -Math.sinh(x / a);
    const l = Math.hypot(1, d);
    const h = 1.4 - (0.6 * (y - 0.6)) / (H0 - 0.6);
    return [x + (-d / l) * h * sx, y + (1 / l) * h * sx, h * 1.1 * sz];
  };
  const corners: Pt[] = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ];
  k.axis(0, 6, 0);
  for (let i = 0; i < 4; i++) {
    const [s1, t1] = corners[i] as Pt;
    const [s2, t2] = corners[(i + 1) % 4] as Pt;
    k.surf((u, v) => lerpQ(C(u, s1, t1), C(u, s2, t2), v), 44, 1, face, { two: true });
    k.poly(
      Array.from({ length: 45 }, (_, j) => C(j / 44, s1, t1)),
      false,
      edge,
      { w: 1.3 },
    );
  }
  for (let j = 2; j < 44; j += 3)
    k.poly(
      corners.map(([s, t]) => C(j / 44, s, t)),
      true,
      edge,
      { w: 0.5 },
    );
  k.dot([0, H0 + 0.6, 0], 0.5, light, { w: 0.5 });
  k.axis(0, -4, 4.5);
  k.quad([-7, 0.66, 2], [7, 0.66, 2], [7, 0.66, 7], [-7, 0.66, 7], water, { w: 0.6 });
  k.poly(
    [
      [-7, 0.7, 2],
      [7, 0.7, 2],
      [7, 0.7, 7],
      [-7, 0.7, 7],
    ],
    true,
    edge,
    { w: 0.6 },
  );
  // The half cloister: eleven columns on a half circle, round arches between, a band over them.
  const Rc = 10;
  const cols = 11;
  const colAt = (i: number): Pt => {
    const t = Math.PI + (i / (cols - 1)) * Math.PI;
    return [Math.cos(t) * Rc, Math.sin(t) * Rc];
  };
  for (let i = 0; i < cols; i++) {
    const [x, z] = colAt(i);
    k.loft(
      ngon(6, 0.3),
      [
        [1, 0.6],
        [1, 3.6],
      ],
      { cx: x, cz: z, posts: 3 },
    );
    if (i + 1 < cols) {
      const [x2, z2] = colAt(i + 1);
      k.poly(
        Array.from({ length: 9 }, (_, j) => {
          const f = j / 8;
          return [x + (x2 - x) * f, 3.6 + Math.sin(Math.PI * f) * 1.3, z + (z2 - z) * f] as Q;
        }),
        false,
        edge,
        { w: 0.9 },
      );
      k.dot([(x + x2) / 2, 2.6, (z + z2) / 2], 0.25, light, { w: 0.2 });
    }
  }
  k.axis(0, 2, 0);
  k.surf(
    (u, v) => {
      const t = Math.PI + u * Math.PI;
      return [Math.cos(t) * Rc, 4.9 + v * 0.9, Math.sin(t) * Rc];
    },
    20,
    1,
    face,
    {},
    { tone: edge, vEvery: 1 },
  );
}

/** 16. Ring Stack (Harbour Quarter): seven glazed rings of changing width threaded on a column. */
function ringStack(k: Kit) {
  k.lathe(
    [
      [1.4, 0.6],
      [1.4, 31],
    ],
    12,
    { posts: 3, face: glass, o: { two: true } },
  );
  for (let i = 0; i < 7; i++) {
    const y = 2.5 + i * 4.1;
    const Ro = 6.6 + 2.2 * Math.sin(i * 1.3 + 0.4);
    const off = 1.3;
    const cx = Math.cos(i * GOLDEN_ANGLE) * off;
    const cz = Math.sin(i * GOLDEN_ANGLE) * off;
    const n = Math.round(Ro * 4);
    k.lathe(
      [
        [Ro, y],
        [Ro, y + 2.6],
      ],
      n,
      { cx, cz, posts: 3 },
    );
    k.disc(cx, y + 2.6, cz, Ro, face, 2, { w: 0.8 });
    k.lamps(cx, y + 1.3, cz, Ro + 0.08, n, light, 0.06);
  }
  k.dot([0, 31.6, 0], 0.6, light, { w: 0.4 });
}

/** 17. Hanging Gardens (Garden Quarter): seven round terraces stepping north, plants spilling, waterfalls. */
function hangingGardens(k: Kit) {
  let y = 0.6;
  let topZ = 0;
  for (let i = 0; i < 7; i++) {
    const R = 12.5 - 1.4 * i;
    const cz = -0.55 * i;
    k.lathe(
      [
        [R, y],
        [R, y + 2.2],
      ],
      Math.round(R * 3),
      { cz, posts: 4, cap: true, capTone: plant, co: { w: 0.3 } },
    );
    const n = Math.round(R * 1.6);
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU;
      k.dot([Math.cos(a) * (R - 0.4), y + 2.5, cz + Math.sin(a) * (R - 0.4)], 0.6, plant, {
        w: 0.12,
      });
    }
    for (const a of [0.9, 1.1, 2.05, 2.25]) {
      const x = Math.cos(a) * (R + 0.1);
      const z = cz + Math.sin(a) * (R + 0.1);
      k.line([x, y + 2.2, z], [x, y, z], water, { anim: Anim.flow, key: 0.8, w: 1.4 });
    }
    y += 2.2;
    topZ = cz;
  }
  // Straight up the south face, from the plinth's edge to the top terrace's rim.
  k.stair(0, 13.4, 0, -1, 2, 0.6, y, 13.4 - (12.5 - 1.4 * 6 - 0.55 * 6) - 0.2);
  for (let j = 0; j < 6; j++) {
    const a = (j / 6) * TAU;
    k.loft(
      ngon(6, 0.18),
      [
        [1, y],
        [1, y + 2.4],
      ],
      { cx: Math.cos(a) * 2.2, cz: topZ + Math.sin(a) * 2.2, posts: 3 },
    );
  }
  const prof = Array.from({ length: 6 }, (_, i) => {
    const t = (i / 5) * (Math.PI / 2) * 0.96;
    return [2.6 * Math.cos(t), y + 2.4 + 2.6 * Math.sin(t)] as Pt;
  });
  k.lathe(prof, 18, { cz: topZ, posts: 3, cap: true });
  k.dot([0, y + 1.2, topZ], 0.8, light, { anim: Anim.pulse, key: 0.9, w: 0.4 });
}

/** 18. Amphitheatre (Theatre District): ten tiers in a 220° sweep round a round stage, five arches behind it. */
function amphitheatre(k: Kit) {
  const sweep = (220 / 360) * TAU;
  const a0 = -Math.PI / 2 - sweep / 2;
  const ex = 1.12;
  const P = (r: number, a: number, y: number): Q => [Math.cos(a) * r * ex, y, Math.sin(a) * r];
  k.axis(0, -6, 0);
  for (let j = 0; j < 10; j++) {
    const r = 5.5 + j;
    const y = 0.6 + j * 0.6;
    k.surf((u, v) => P(r, a0 + u * sweep, y + v * 0.6), 30, 1, face, { two: true });
    k.surf((u, v) => P(r + v, a0 + u * sweep, y + 0.6), 30, 1, face);
    k.poly(
      Array.from({ length: 31 }, (_, i) => P(r, a0 + (i / 30) * sweep, y + 0.6)),
      false,
      edge,
      { w: 0.7 },
    );
  }
  for (let i = 0; i <= 6; i++) {
    const a = a0 + (i / 6) * sweep;
    k.line(P(5.5, a, 1.2), P(15.5, a, 6.6), road, { w: 0.8 });
  }
  for (let i = 0; i <= 22; i++) {
    const a = a0 + (i / 22) * sweep;
    k.line(P(15.6, a, 6.6), P(15.6, a, 9), edge, { w: 0.7 });
    k.dot(P(15.6, a, 9.3), 0.2, light, { w: 0.15 });
  }
  k.poly(
    Array.from({ length: 45 }, (_, i) => P(15.6, a0 + (i / 44) * sweep, 9)),
    false,
    edge,
    { w: 1 },
  );
  k.lathe(
    [
      [4.4, 0.6],
      [4.4, 1.4],
    ],
    28,
    { posts: 0, cap: true },
  );
  k.dot([0, 2.6, 0], 1.4, light, { anim: Anim.pulse, key: 0.6, w: 0.4 });
  // The backdrop: a wall with five round arches, lit inside.
  k.axis(0, 3, 9);
  k.quad([-8, 0.6, 6.2], [8, 0.6, 6.2], [8, 6.6, 6.2], [-8, 6.6, 6.2], face, { two: true });
  k.poly(
    [
      [-8, 0.6, 6.2],
      [-8, 6.6, 6.2],
      [8, 6.6, 6.2],
      [8, 0.6, 6.2],
    ],
    false,
    edge,
    { w: 1.2 },
  );
  for (let i = 0; i < 5; i++) {
    const x = -6 + i * 3;
    k.poly(
      [
        [x - 1.1, 0.6, 6.1],
        ...Array.from({ length: 9 }, (_, j) => {
          const t = Math.PI - (j / 8) * Math.PI;
          return [x + Math.cos(t) * 1.1, 3.6 + Math.sin(t) * 1.1, 6.1] as Q;
        }),
        [x + 1.1, 0.6, 6.1],
      ],
      false,
      edge,
      { w: 1 },
    );
    k.dot([x, 2.4, 6], 0.7, light, { w: 0.3 });
  }
}

/** 19. Spiral Library (Scholars' Quarter): a tapering drum, a ramp winding three times round it, a reading dome. */
function spiralLibrary(k: Kit) {
  const H = 22;
  const rc = (y: number) => 7 - 2.5 * ((y - 0.6) / (H - 0.6));
  k.lathe(
    Array.from({ length: 12 }, (_, i) => {
      const y = 0.6 + ((H - 0.6) * i) / 11;
      return [rc(y), y] as Pt;
    }),
    32,
    { posts: 4, rings: 0 },
  );
  const turns = 3;
  const Y = (u: number) => 0.6 + u * (H - 1.4);
  const ramp = (u: number, v: number): Q => {
    const th = u * turns * TAU;
    const y = Y(u);
    const r = rc(y) + v * 2.2;
    return [Math.cos(th) * r, y, Math.sin(th) * r];
  };
  k.axis(0, -10, 0);
  k.surf(ramp, 180, 1, face, { two: true });
  k.poly(
    Array.from({ length: 181 }, (_, i) => ramp(i / 180, 1)),
    false,
    edge,
    { w: 1.2 },
  );
  k.poly(
    Array.from({ length: 181 }, (_, i) => {
      const p = ramp(i / 180, 1);
      return [p[0], p[1] + 1, p[2]] as Q;
    }),
    false,
    edge,
    { w: 0.6 },
  );
  for (let i = 0; i <= 180; i += 3) {
    const p = ramp(i / 180, 1);
    k.line(p, [p[0], p[1] + 1, p[2]], edge, { w: 0.4 });
    if (i % 6 === 0) k.dot([p[0], p[1] + 1.1, p[2]], 0.15, light, { w: 0.06 });
  }
  // Window slits between the turns, lit warm: the books.
  for (let i = 0; i < 96; i++) {
    const u = (i + 0.5) / 96;
    const th = u * turns * TAU;
    const y = Y(u) + (H - 1.4) / turns / 2;
    if (y > H - 1) continue;
    const r = rc(y) + 0.06;
    k.line(
      [Math.cos(th) * r, y - 0.7, Math.sin(th) * r],
      [Math.cos(th) * r, y + 0.7, Math.sin(th) * r],
      light,
      {
        w: 0.35,
      },
    );
  }
  const rt = rc(H);
  const prof = Array.from({ length: 7 }, (_, i) => {
    const t = (i / 6) * (Math.PI / 2) * 0.95;
    return [rt * Math.cos(t), H + rt * Math.sin(t)] as Pt;
  });
  k.lathe(prof, 24, { posts: 2, face: glass, o: { two: true }, cap: true });
  k.dot([0, H + 1.5, 0], 1.6, light, { anim: Anim.pulse, key: 1.7, w: 0.5 });
}

/** 20. Sail (Harbour Quarter): a lens-shaped tower curving forward like a filled sail, crossed by diagonal ribs. */
function sail(k: Kit) {
  const H = 32;
  const w = (t: number) => 8 * Math.max(0, 1 - t ** 1.6) ** 0.5;
  const lean = (t: number) => -4 + 7 * t * t;
  const S = (u: number, t: number, bow: number): Q => {
    const x = w(t) * (2 * u - 1);
    return [x, 0.6 + H * t, lean(t) + bow * (1 - (2 * u - 1) ** 2) * (1 - 0.6 * t)];
  };
  k.axis(0, H / 2, lean(0.5));
  k.surf((u, t) => S(u, t, 2.6), 16, 24, face, { two: true }, { tone: edge, vEvery: 2 });
  k.surf((u, t) => S(u, t, -0.9), 12, 24, glass, { two: true }, { tone: edge, vEvery: 4 });
  for (const side of [0, 1])
    k.poly(
      Array.from({ length: 25 }, (_, j) => S(side, j / 24, 0)),
      false,
      edge,
      { w: 1.4 },
    );
  for (let d = -1; d <= 1.01; d += 0.2)
    for (const dir of [1, -1]) {
      const pts: Q[] = [];
      for (let j = 0; j <= 30; j++) {
        const t = j / 30;
        const u = dir > 0 ? d + 0.9 * t : 1 - d - 0.9 * t;
        if (u >= 0 && u <= 1 && t < 0.98) pts.push(S(u, t, 2.62));
      }
      if (pts.length > 1) k.poly(pts, false, edge, { w: 0.5 });
    }
  k.poly(
    Array.from({ length: 25 }, (_, j) => S(0.5, j / 24, 2.7)),
    false,
    light,
    { w: 0.5 },
  );
  const tip = S(0.5, 1, 0);
  k.line(tip, [tip[0], tip[1] + 4, tip[2]], edge, { w: 0.8 });
  k.dot([tip[0], tip[1] + 4.2, tip[2]], 0.3, fire, { anim: Anim.pulse, key: 0.2, w: 0.4 });
  k.lathe(
    [
      [9.5, 0.6],
      [9.5, 1.4],
    ],
    36,
    { posts: 0, cap: true, co: { w: 0.4 } },
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    k.line(
      [Math.cos(a) * 9.6, 0.6, Math.sin(a) * 9.6],
      [Math.cos(a) * 9.6, 2.2, Math.sin(a) * 9.6],
      edge,
      {
        w: 0.6,
      },
    );
    k.dot([Math.cos(a) * 9.6, 2.4, Math.sin(a) * 9.6], 0.2, light, { w: 0.15 });
  }
}

/* ---------- the catalogue ---------- */

export type BuildingKind = {
  name: string;
  district: string;
  /** How tall it stands, for the eye. */
  height: number;
  site: Site;
  build: (k: Kit) => void;
};

export const BUILDING_KINDS: BuildingKind[] = [
  {
    name: 'Sun Stair',
    district: 'Temple Hill',
    height: 16,
    site: { shape: 'square', r: 14, amp: 1.2, lobes: 3 },
    build: sunStair,
  },
  {
    name: 'Step Mastaba',
    district: 'Nile Quarter',
    height: 16,
    site: { shape: 'square', r: 15.5, amp: 1, lobes: 4, ph: 1 },
    build: stepMastaba,
  },
  {
    name: 'Pagoda',
    district: 'Chinatown',
    height: 29,
    site: { shape: 'square', r: 8, amp: 1.6, lobes: 5 },
    build: pagoda,
  },
  {
    name: 'Shikhara',
    district: 'Spice Quarter',
    height: 28,
    site: { shape: 'square', r: 8.5, amp: 1.4, lobes: 4, ph: 0.5 },
    build: shikhara,
  },
  {
    name: 'Domed Hall',
    district: 'Bazaar Quarter',
    height: 27,
    site: { shape: 'square', r: 13, amp: 1, lobes: 4, ph: 0.8 },
    build: domedHall,
  },
  {
    name: 'Sky Bridge',
    district: 'Business District',
    height: 36,
    site: { shape: 'round', r: 13, amp: 1.5, lobes: 3, ph: 2 },
    build: skyBridge,
  },
  {
    name: 'Tree Tower',
    district: 'Solarpunk Gardens',
    height: 34,
    site: { shape: 'round', r: 8.5, amp: 2, lobes: 5, ph: 1.2 },
    build: treeTower,
  },
  {
    name: 'Porthole Hall',
    district: 'Atlantis Quarter',
    height: 18,
    site: { shape: 'round', r: 14, amp: 1.2, lobes: 6 },
    build: portholeHall,
  },
  {
    name: 'Nova Core',
    district: 'Nova Quarter',
    height: 34,
    site: { shape: 'round', r: 9, amp: 1.6, lobes: 4, ph: 2.4 },
    build: novaCore,
  },
  {
    name: 'Twist',
    district: 'Business District',
    height: 37,
    site: { shape: 'round', r: 8, amp: 1.5, lobes: 3, ph: 0.3 },
    build: twist,
  },
  {
    name: 'Pebbles',
    district: 'Riverside',
    height: 27,
    site: { shape: 'round', r: 9.5, amp: 2, lobes: 3, ph: 1.7 },
    build: pebbles,
  },
  {
    name: 'Crystal',
    district: 'Arts District',
    height: 33,
    site: { shape: 'oct', r: 9.5, amp: 1.4, lobes: 5, ph: 0.9 },
    build: crystal,
  },
  {
    name: 'Trio',
    district: 'Old Town Edge',
    height: 25,
    site: { shape: 'square', r: 10, amp: 1.2, lobes: 3, ph: 2.2 },
    build: trio,
  },
  {
    name: 'Cantilever',
    district: 'Design Quarter',
    height: 23,
    site: { shape: 'round', r: 10.5, amp: 1.5, lobes: 4, ph: 1.4 },
    build: cantilever,
  },
  {
    name: 'Great Arch',
    district: 'University Quarter',
    height: 22,
    site: { shape: 'round', r: 13, amp: 1.2, lobes: 3, ph: 0.6 },
    build: greatArch,
  },
  {
    name: 'Ring Stack',
    district: 'Harbour Quarter',
    height: 32,
    site: { shape: 'round', r: 11, amp: 1.6, lobes: 5, ph: 2.8 },
    build: ringStack,
  },
  {
    name: 'Hanging Gardens',
    district: 'Garden Quarter',
    height: 22,
    site: { shape: 'round', r: 13.8, amp: 1.4, lobes: 4, ph: 1 },
    build: hangingGardens,
  },
  {
    name: 'Amphitheatre',
    district: 'Theatre District',
    height: 9,
    site: { shape: 'round', r: 17.6, amp: 1.2, lobes: 5, ph: 0.4 },
    build: amphitheatre,
  },
  {
    name: 'Spiral Library',
    district: "Scholars' Quarter",
    height: 27,
    site: { shape: 'round', r: 10, amp: 1.6, lobes: 3, ph: 1.9 },
    build: spiralLibrary,
  },
  {
    name: 'Sail',
    district: 'Harbour Quarter',
    height: 36,
    site: { shape: 'round', r: 10, amp: 1.8, lobes: 4, ph: 3 },
    build: sail,
  },
];

/**
 * Building `kind` (an index, or a name) on its plinth with its walkways, drawn into `m` at
 * `place` (its foot, a turn, a scale): by default at the middle of the City's ground.
 */
export function building(kind: number | string, m: Mesh = new Mesh(), place: Place = {}): Mesh {
  const i = typeof kind === 'string' ? BUILDING_KINDS.findIndex((b) => b.name === kind) : kind;
  const spec = BUILDING_KINDS[i] ?? (BUILDING_KINDS[0] as BuildingKind);
  const k = new Kit(m, place);
  site(k, spec.site);
  spec.build(k);
  return m;
}

/** The set for the City's Studio piece: one pill a building. */
export const BUILDINGS = {
  names: BUILDING_KINDS.map((b) => b.name),
  build: BUILDING_KINDS.map((_, i) => (m: Mesh) => {
    building(i, m);
  }),
  label: 'Building',
};

/**
 * Slowly round building `kind`, a little above, far enough to see it whole with its walkways.
 * The same turn as the temples' eye, so faces are lit as they face it.
 */
export function buildingsEye(kind: number, t: number): { eye: Vec3; target: Vec3 } {
  const b = BUILDING_KINDS[kind] ?? (BUILDING_KINDS[0] as BuildingKind);
  const d = 18 + 1.1 * Math.max(b.height, 1.25 * siteReach(b.site));
  const target: Vec3 = [0, GROUND_Y + b.height * 0.4, 0];
  const az = 0.8 + t * 0.035;
  const el = 0.3;
  return {
    eye: [
      target[0] + Math.sin(az) * Math.cos(el) * d,
      target[1] + Math.sin(el) * d,
      target[2] + Math.cos(az) * Math.cos(el) * d,
    ],
    target,
  };
}
