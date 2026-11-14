/*
 * Flying stations over the City of Dreams (docs/specs/art-city.md, "Flying stations and rings of
 * light"): fifteen stations floating over the towers' sky, each its own design, in its quarter's
 * colours. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "add 15 cool flying stations. can be futuristic. circular. etc... like mini cities or
 * buildings or temples or novas above the sky. these will add an element above the city so when u
 * fly above there is cool stuff."
 *
 * Every station is grains from a few primitives (lib/city-shapes.ts and a handful of our own here),
 * built once round its own middle, then turned slowly round the vertical and bobbing gently up and
 * down, both only from the time (no state kept), so the same moment always shows the same picture
 * and nothing ever jumps. They float 200 to 480 over the street: over the towers' sky (150), under
 * the stratosphere (520), so the super boost still opens the whole plan over them. All of it is
 * light, as the Studio's other additions are: the Ship flies through every station, so it can never
 * be caught on one. Mellow, as all the City's light: colours drift slowly, a few lamps twinkle
 * softly, nothing flashes.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { copiesNear } from './city-big';
import { DISTRICTS, type DistrictId, planLook } from './city-game';
import { aroundRect, C, frac, GROUND, type Item, lerp, mix, mixId, scale, TAU } from './city-grid';
import {
  ball,
  cached,
  type Model,
  model,
  type Part,
  ring,
  seg,
  shift,
  square,
  turned,
  twistBox,
} from './city-shapes';

/** The fifteen designs, each its own. */
export type StationDesign =
  | 'lantern-harbour'
  | 'orbital-monastery'
  | 'lotus-rock'
  | 'spoke-wheel'
  | 'nova-stack'
  | 'docking-spire'
  | 'disc-city'
  | 'garden-island'
  | 'sky-ziggurat'
  | 'gyroscope'
  | 'biosphere'
  | 'hanging-pyramid'
  | 'neon-carousel'
  | 'data-lattice'
  | 'twin-rings';

export type Station = {
  name: string;
  design: StationDesign;
  /** Its quarter: the colours it wears, and the land under it. */
  d: DistrictId;
  /** Where it floats, tile-local, and how high its middle stands over the street. */
  x: number;
  z: number;
  h: number;
  /** How fast it turns round the vertical (radians a second), how far it bobs and how slowly. */
  spin: number;
  bob: number;
  period: number;
  /** In a few words, for the spec and the map. */
  form: string;
};

/** The lowest and highest a station's middle may float over the street. */
export const STATION_LOW = 200;
export const STATION_HIGH = 480;

/**
 * The fifteen, tile-local: one to every quarter, two over Chinatown, the Heights and the Green Code.
 * Each stands well off the landmarks and big squares (where the fireworks burst), off the space
 * portals and the Sky Island Loop, and off the ring parcours (lib/city-rings.ts); tested.
 */
export const STATIONS: Station[] = [
  {
    name: 'Lantern Harbour',
    design: 'lantern-harbour',
    d: 'chinatown',
    x: -115,
    z: 60,
    h: 240,
    spin: 0.035,
    bob: 2.5,
    period: 17,
    form: 'a gold ring deck, eight great lanterns hung under it round one greater lantern',
  },
  {
    name: 'Orbital Monastery',
    design: 'orbital-monastery',
    d: 'chinatown',
    x: 115,
    z: 230,
    h: 360,
    spin: -0.025,
    bob: 3,
    period: 21,
    form: 'a ring walkway with eight small shrines on it, a bell hung under an arch in its middle',
  },
  {
    name: 'Lotus Rock',
    design: 'lotus-rock',
    d: 'indian',
    x: -115,
    z: 470,
    h: 300,
    spin: 0.02,
    bob: 3.5,
    period: 23,
    form: 'a temple on a floating rock, terraces round its curved spire, waterfalls of light',
  },
  {
    name: 'Turquoise Wheel',
    design: 'spoke-wheel',
    d: 'oriental',
    x: 115,
    z: 476,
    h: 420,
    spin: 0.05,
    bob: 2,
    period: 19,
    form: 'a torus on six spokes round a hub, a crescent over its axle',
  },
  {
    name: 'Nova Stack',
    design: 'nova-stack',
    d: 'heights',
    x: -115,
    z: 760,
    h: 340,
    spin: -0.03,
    bob: 3,
    period: 20,
    form: 'three Nova Cores stacked on a spine, each wrapped in two turning orbits',
  },
  {
    name: 'Docking Spire',
    design: 'docking-spire',
    d: 'heights',
    x: -115,
    z: 612,
    h: 280,
    spin: 0.03,
    bob: 2,
    period: 24,
    form: 'a needle with three docking rings and their pads, shuttles circling it',
  },
  {
    name: 'Violet Disc City',
    design: 'disc-city',
    d: 'canals',
    x: 140,
    z: 805,
    h: 250,
    spin: 0.022,
    bob: 2.5,
    period: 22,
    form: 'a mini city of tiny towers on a floating disc round a twisting tower',
  },
  {
    name: 'Garden Island',
    design: 'garden-island',
    d: 'golden',
    x: -115,
    z: 870,
    h: 260,
    spin: -0.018,
    bob: 3.5,
    period: 25,
    form: 'an island of gold trees round a great tree, roots trailing under its rock',
  },
  {
    name: 'Sky Ziggurat',
    design: 'sky-ziggurat',
    d: 'temples',
    x: 115,
    z: 1020,
    h: 380,
    spin: 0.02,
    bob: 2.5,
    period: 21,
    form: 'two stepped ziggurats base to base, a halo round them, a pillar of light under',
  },
  {
    name: 'Gyroscope Foundry',
    design: 'gyroscope',
    d: 'industrial',
    x: -115,
    z: 1290,
    h: 400,
    spin: 0.025,
    bob: 2,
    period: 18,
    form: 'three nested rings turning on their own axes round a furnace core',
  },
  {
    name: 'Biosphere Cluster',
    design: 'biosphere',
    d: 'domes',
    x: 115,
    z: 1275,
    h: 270,
    spin: -0.03,
    bob: 3,
    period: 22,
    form: 'three glass spheres joined by tubes, plants glowing inside',
  },
  {
    name: 'Hanging Pyramid',
    design: 'hanging-pyramid',
    d: 'egypt',
    x: -115,
    z: 1430,
    h: 340,
    spin: 0.02,
    bob: 3,
    period: 24,
    form: 'a pyramid hanging point down, a sun ring with rays over it',
  },
  {
    name: 'Neon Carousel',
    design: 'neon-carousel',
    d: 'market',
    x: 115,
    z: 1610,
    h: 300,
    spin: 0.03,
    bob: 2,
    period: 19,
    form: 'four discs stacked on a mast, each turning the other way, boards hung round them',
  },
  {
    name: 'Data Lattice',
    design: 'data-lattice',
    d: 'code',
    x: -115,
    z: 1850,
    h: 320,
    spin: 0.04,
    bob: 2.5,
    period: 20,
    form: 'a lattice cube standing on its corner, a core inside, light falling through it',
  },
  {
    name: 'Twin Ring Habitat',
    design: 'twin-rings',
    d: 'code',
    x: 115,
    z: 1780,
    h: 420,
    spin: -0.02,
    bob: 2.5,
    period: 23,
    form: 'two habitat rings turning opposite ways round a hub, panels over them',
  },
];

/* ---------- a few primitives of our own ---------- */

/** A part whose sites may also fade (a waterfall, falling light): `glow` 0..1 by place and time. */
type SPart = Part & { glow?: (u: number, t: number) => number };
type Shades = { m: RGB; l: RGB; d: RGB; g: RGB };

/** A quarter's colour, a lighter shade (toward warm, never white), a deeper one, and a golden one. */
export function stationShades(m: RGB): Shades {
  return {
    m,
    l: mix(m, C.warm, 0.35),
    d: scale(mix(m, C.violet, 0.2), 0.8),
    g: mix(m, C.gold, 0.3),
  };
}

const part = (n: number, f: Part['f'], rgb: RGB, tw = 0, glow?: SPart['glow']): SPart => ({
  n: Math.max(1, Math.round(n)),
  f,
  rgb,
  tw,
  glow,
});

const rotX = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};
const rotY = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
};
const rotZ = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};
const at = (c: Vec3, p: Vec3): Vec3 => [c[0] + p[0], c[1] + p[1], c[2] + p[2]];

/** A ring tilted `tilt` off level, its tilt facing `yaw`, the tilt itself turning `spin` a second. */
function tilted(
  c: Vec3,
  r: number,
  n: number,
  rgb: RGB,
  tilt: number,
  yaw: number,
  spin = 0,
  tw = 0,
) {
  return part(
    n,
    (u, _s, t) => {
      const a = u * TAU;
      return at(c, rotY(rotX([Math.cos(a) * r, 0, Math.sin(a) * r], tilt), yaw + spin * t));
    },
    rgb,
    tw,
  );
}

/** A box's four upright edges and its roof: half-width hw, from y0 to y1, at (cx, cz). */
function box(
  cx: number,
  cz: number,
  hw: number,
  y0: number,
  y1: number,
  n: number,
  rgb: RGB,
  tw = 0,
) {
  return part(
    n,
    (u) => {
      if (u < 0.55) {
        const k = Math.min(3, Math.floor(u / 0.1375));
        const v = frac(u / 0.1375);
        return [cx + (k & 1 ? hw : -hw), lerp(y0, y1, v), cz + (k & 2 ? hw : -hw)];
      }
      const [px, pz] = aroundRect(((u - 0.55) / 0.45) * 8 * hw, hw, hw);
      return [cx + px, y1, cz + pz];
    },
    rgb,
    tw,
  );
}

/** k straight spokes from radius r0 to r1 at height y, n sites in all. */
function spokes(k: number, r0: number, r1: number, y: number, n: number, rgb: RGB, a0 = 0) {
  return part(
    n,
    (u) => {
      const i = Math.min(k - 1, Math.floor(u * k));
      const a = a0 + (i * TAU) / k;
      const r = lerp(r0, r1, frac(u * k));
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    },
    rgb,
  );
}

/** Light falling from y0 to y1 at (x, z), flowing slowly, fading in at its top and out at its foot. */
function falling(x: number, z: number, y0: number, y1: number, n: number, rgb: RGB, pace: number) {
  return part(
    n,
    (u, _s, t) => [x, lerp(y0, y1, frac(u + t * pace)), z],
    rgb,
    0,
    (u, t) => {
      const q = frac(u + t * pace);
      return smooth(q / 0.1) * (1 - q) ** 1.5;
    },
  );
}

/* ---------- the fifteen designs ---------- */

function lanternHarbour(S: Shades): SPart[] {
  const ps: SPart[] = [ring([0, 0, 0], 30, 240, S.g), ring([0, -1.2, 0], 26, 150, S.g)];
  ps.push(spokes(8, 9, 30, 0, 176, S.g));
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * TAU) / 8;
    const lx = 28 * Math.cos(a);
    const lz = 28 * Math.sin(a);
    ps.push(seg([lx, -0.5, lz], [lx, -5, lz], 8, S.g));
    const prof = (v: number): [number, number] => [
      3.6 * (0.55 + 0.45 * Math.sin(Math.PI * v)),
      -14 + 9 * v,
    ];
    ps.push(...shift(turned(prof, 8, 3, 72, S.m, S.l, 0.1), [lx, 0, lz]));
  }
  // One greater lantern in the middle, a warm heart breathing in it, a gold finial over it.
  const big = (v: number): [number, number] => [
    9 * (0.5 + 0.5 * Math.sin(Math.PI * v)),
    -12 + 22 * v,
  ];
  ps.push(...turned(big, 14, 6, 460, S.m, S.l, 0.08));
  ps.push(ring([0, -12, 0], 4.5, 40, S.g), ring([0, 10, 0], 4.5, 40, S.g));
  ps.push(seg([0, 10, 0], [0, 22, 0], 30, S.g), ball([0, 23, 0], 1.4, 20, S.l));
  ps.push(ball([0, -1, 0], 3, 40, S.l, 1, 0.3));
  return ps;
}

function orbitalMonastery(S: Shades): SPart[] {
  const ps: SPart[] = [ring([0, 0, 0], 32, 220, S.g), ring([0, 0, 0], 36, 240, S.g)];
  ps.push(
    part(
      144,
      (u) => {
        const k = Math.floor(u * 48);
        const a = (k * TAU) / 48;
        const r = 32 + 4 * frac(u * 48);
        return [r * Math.cos(a), 0, r * Math.sin(a)];
      },
      S.d,
    ),
  );
  // Eight shrines on the walkway, three tiers each, their roofs flared a little wider.
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    const c: Vec3 = [34 * Math.cos(a), 0, 34 * Math.sin(a)];
    const tiers: Part[] = [];
    for (let j = 0; j < 3; j++) {
      const w = 2.6 - 0.6 * j;
      tiers.push(square(w, 0.8 + 3 * j, a, 16, S.m), square(w + 1.1, 2 + 3 * j, a, 16, S.l));
    }
    tiers.push(seg([0, 8, 0], [0, 11, 0], 6, S.g));
    ps.push(...shift(tiers, c));
  }
  // The bell under its arch, in the middle, an inner ring and four spokes holding it.
  const bell = (v: number): [number, number] => [1.5 + 5 * v * v, 9 - 10 * v];
  ps.push(...turned(bell, 12, 4, 240, S.g, S.l, 0.05));
  ps.push(
    part(
      90,
      (u) => {
        const a = Math.PI * u;
        return [14 * Math.cos(a), 1 + 12 * Math.sin(a), 0];
      },
      S.g,
    ),
  );
  ps.push(ring([0, 0, 0], 14, 120, S.l), spokes(4, 14, 32, 0, 80, S.d, Math.PI / 4));
  return ps;
}

function lotusRock(S: Shades): SPart[] {
  const rock = (v: number): [number, number] => [2 + 24 * v ** 0.8, -34 + 34 * v];
  const ps: SPart[] = [...turned(rock, 14, 6, 520, S.d, scale(S.d, 0.9))];
  ps.push(
    ring([0, 0.5, 0], 26, 170, S.l),
    ring([0, 2, 0], 20, 130, S.m),
    ring([0, 3.5, 0], 14, 100, S.l),
  );
  // The curved spire, its finial, four small spires at the terrace's corners.
  const spire = (v: number): [number, number] => [7 * (1 - v) ** 0.8 + 0.4, 3.5 + 30 * v];
  ps.push(...turned(spire, 10, 7, 420, S.m, S.g), ball([0, 35, 0], 1.2, 20, S.g));
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    ps.push(seg([10 * sx, 3.5, 10 * sz], [10 * sx, 14, 10 * sz], 22, S.m));
    ps.push(ball([10 * sx, 14.5, 10 * sz], 0.8, 8, S.g));
  }
  // Waterfalls of light off the rim, flowing down and fading below the rock.
  const fall = 0.12;
  ps.push(
    part(
      6 * 75,
      (u, _s, t) => {
        const k = Math.min(5, Math.floor(u * 6));
        const q = frac(frac(u * 6) + t * fall);
        const a = (k * TAU) / 6 + 0.3;
        const r = 25.5 + 4 * q * q;
        return [r * Math.cos(a), -45 * q, r * Math.sin(a)];
      },
      S.l,
      0,
      (u, t) => {
        const q = frac(frac(u * 6) + t * fall);
        return smooth(q / 0.08) * (1 - q) ** 1.5;
      },
    ),
  );
  return ps;
}

function spokeWheel(S: Shades): SPart[] {
  const ps: SPart[] = [
    part(
      480,
      (u) => {
        const k = Math.floor(u * 32);
        const A = (k * TAU) / 32;
        const B = frac(u * 32) * TAU;
        const rr = 32 + 4.5 * Math.cos(B);
        return [rr * Math.cos(A), 4.5 * Math.sin(B), rr * Math.sin(A)];
      },
      S.m,
    ),
    ring([0, 0, 0], 36.5, 220, S.l, 'y', 0.2),
    ring([0, 0, 0], 27.5, 180, S.d),
    ball([0, 0, 0], 6, 140, S.l),
    seg([0, -16, 0], [0, 16, 0], 60, S.g),
    spokes(6, 6, 28, 1.5, 168, S.m),
    spokes(6, 6, 28, -1.5, 168, S.m, 0.18),
  ];
  // A crescent over the axle.
  ps.push(
    part(
      50,
      (u) => {
        const a = -2.2 + 4.4 * u;
        return [0, 20 + 3.2 * Math.sin(a), 3.2 * Math.cos(a)];
      },
      S.g,
    ),
    ball([0, 20, 1], 0.9, 10, S.l),
  );
  return ps;
}

function novaStack(S: Shades): SPart[] {
  const ps: SPart[] = [seg([0, -50, 0], [0, 48, 0], 120, S.d)];
  const cores: [number, number][] = [
    [-34, 9],
    [0, 11],
    [32, 8],
  ];
  cores.forEach(([y, r], j) => {
    const c: Vec3 = [0, y, 0];
    ps.push(ball(c, r, 22 * r, j === 1 ? S.l : S.m, 1, 0.08));
    ps.push(tilted(c, r * 1.9, 120, S.m, 1.1, j * 1.3, 0.22 * (j % 2 ? 1 : -1)));
    ps.push(tilted(c, r * 1.6, 100, S.g, -0.7, j * 2.1 + 1, 0.16 * (j % 2 ? -1 : 1)));
    ps.push(ring(c, r * 1.25, 60, S.d));
  });
  ps.push(ball([0, 50, 0], 1.6, 24, S.g, 1, 0.3), ball([0, -52, 0], 1.2, 16, S.g));
  return ps;
}

function dockingSpire(S: Shades): SPart[] {
  const ps: SPart[] = [seg([0, -62, 0], [0, 62, 0], 200, S.l)];
  ps.push(
    ...twistBox(
      -50,
      50,
      () => 3,
      (v) => v * Math.PI,
      12,
      320,
      S.m,
      S.d,
    ),
  );
  for (const [y, r] of [
    [-30, 18],
    [0, 25],
    [30, 18],
  ] as const) {
    ps.push(ring([0, y, 0], r, 6 * r + 40, S.m), ring([0, y, 0], r - 2.5, 5 * r + 30, S.d));
    ps.push(spokes(4, 3, r - 2.5, y, 60, S.d));
    for (let k = 0; k < 4; k++) {
      const a = ((k + 0.5) * TAU) / 4;
      ps.push(
        shift([square(2.2, y, a, 12, S.g)], [r * Math.cos(a), 0, r * Math.sin(a)])[0] as Part,
      );
    }
  }
  // Shuttles circling it, each a short streak of light, every other one the other way.
  ps.push(
    part(
      48,
      (u, _s, t) => {
        const k = Math.min(7, Math.floor(u * 8));
        const a = t * 0.35 * (k % 2 ? 1 : -1) + (k * TAU) / 8 + frac(u * 8) * 0.15;
        return [32 * Math.cos(a), -40 + k * 11, 32 * Math.sin(a)];
      },
      S.l,
      0.2,
    ),
  );
  ps.push(ball([0, 64, 0], 1.6, 30, S.g, 1, 0.3));
  return ps;
}

function discCity(S: Shades): SPart[] {
  const ps: SPart[] = [
    ring([0, 0, 0], 34, 230, S.l),
    ring([0, -1, 0], 31, 200, S.d),
    ring([0, 0.3, 0], 18, 120, S.l, 'y', 0.3),
  ];
  const under = (v: number): [number, number] => [
    33 * Math.sqrt(Math.max(0, 1 - v * v)),
    -1 - 15 * v,
  ];
  ps.push(...turned(under, 16, 5, 380, S.d, scale(S.d, 0.9)));
  // Tiny towers spread over the disc on the golden angle, taller toward the middle.
  for (let i = 0; i < 22; i++) {
    const a = i * 2.39996;
    const rr = 7 + 20 * Math.sqrt((i + 0.5) / 22);
    const hw = 1.3 + 1.1 * hash(i, 61);
    const h = 3 + 10 * hash(i, 62) * (1.2 - rr / 34);
    ps.push(box(rr * Math.cos(a), rr * Math.sin(a), hw, 0, h, 36, i % 3 ? S.m : S.l, 0.1));
  }
  ps.push(
    ...twistBox(
      0,
      26,
      (v) => 3.2 * (1 - 0.6 * v),
      (v) => v * 0.8,
      8,
      220,
      S.l,
      S.m,
    ),
  );
  ps.push(seg([0, 26, 0], [0, 34, 0], 20, S.g));
  return ps;
}

function gardenIsland(S: Shades): SPart[] {
  const leafy = mix(S.m, C.leaf, 0.28);
  const rock = (v: number): [number, number] => [2 + 27 * v ** 0.7, -28 + 26 * v];
  const ps: SPart[] = [
    ring([0, 0, 0], 30, 200, S.g),
    ring([0, -2, 0], 29, 180, S.d),
    ...turned(rock, 12, 5, 380, S.d, scale(S.d, 0.85)),
    ring([0, 0.3, 0], 12, 90, S.l, 'y', 0.2),
  ];
  // Roots trailing under the rock, swaying slowly.
  ps.push(
    part(
      16 * 14,
      (u, _s, t) => {
        const k = Math.min(15, Math.floor(u * 16));
        const j = frac(u * 16);
        const a = (k * TAU) / 16 + 0.2;
        const r = 12 + 10 * hash(k, 65);
        const sway = 1.2 * Math.sin(t * 0.3 + k);
        return [r * Math.cos(a) + sway * j, -8 - (14 + 8 * hash(k, 66)) * j, r * Math.sin(a)];
      },
      mix(S.d, C.leaf, 0.15),
    ),
  );
  for (let i = 0; i < 9; i++) {
    const a = (i * TAU) / 9 + 0.4;
    const rr = 20 + 4 * hash(i, 67);
    const x = rr * Math.cos(a);
    const z = rr * Math.sin(a);
    const top = 4 + 3 * hash(i, 68);
    ps.push(seg([x, 0, z], [x, top, z], 8, S.d));
    ps.push(ball([x, top + 2.5, z], 3 + 1.5 * hash(i, 69), 60, leafy, 0.8, 0.12));
  }
  ps.push(seg([0, 0, 0], [0, 12, 0], 30, S.g), ball([0, 18, 0], 9, 220, leafy, 0.75, 0.1));
  return ps;
}

function skyZiggurat(S: Shades): SPart[] {
  const ps: SPart[] = [];
  for (let j = 0; j < 5; j++) {
    const w = 20 - 4 * j;
    const n = 80 - 12 * j;
    // Up: each terrace's foot and top, its corners joining them.
    ps.push(square(w, 4 * j, 0, n, S.l), square(w, 4 * j + 3.6, 0, n, S.m));
    ps.push(box(0, 0, w, 4 * j, 4 * j + 3.6, 24, S.m));
    // Down, mirrored and deeper.
    if (j > 0) ps.push(square(w + 2, -5 * j, 0, n, S.d));
  }
  ps.push(ball([0, 20.5, 0], 1.3, 20, S.g, 1, 0.3));
  ps.push(tilted([0, 0, 0], 28, 200, S.g, 0.12, 0, 0.05));
  ps.push(falling(0, 0, -22, -62, 60, S.l, 0.1));
  return ps;
}

function gyroscope(S: Shades): SPart[] {
  const hot = mix(S.m, C.amber, 0.3);
  const gimbal = (r: number, n: number, rgb: RGB, turn: (p: Vec3, t: number) => Vec3) =>
    part(
      n,
      (u, _s, t) => {
        const a = frac(u * 2) * TAU;
        const rr = u < 0.5 ? r : r - 1.6;
        return turn([rr * Math.cos(a), 0, rr * Math.sin(a)], t);
      },
      rgb,
    );
  return [
    gimbal(30, 400, S.m, (p, t) => rotX(p, Math.PI / 2 + 0.3 * Math.sin(0.1 * t))),
    gimbal(24, 320, S.l, (p, t) => rotZ(p, 0.12 * t)),
    gimbal(18, 240, S.m, (p, t) => rotX(rotZ(p, Math.PI / 2), 0.15 * t)),
    ball([0, 0, 0], 7, 220, hot, 1, 0.12),
    ball([0, 0, 0], 3.5, 50, mix(S.l, C.amber, 0.35), 1, 0.2),
    square(34, -20, 0, 200, S.d),
    seg([34, -20, 34], [0, -7, 0], 40, S.d),
    seg([-34, -20, 34], [0, -7, 0], 40, S.d),
    seg([34, -20, -34], [0, -7, 0], 40, S.d),
    seg([-34, -20, -34], [0, -7, 0], 40, S.d),
  ];
}

function biosphere(S: Shades): SPart[] {
  const ps: SPart[] = [ring([0, -14, 0], 26, 160, S.d)];
  const spheres: [Vec3, number][] = [
    [[18, 0, 0], 14],
    [[-9, 6, 15.6], 11],
    [[-9, -4, -15.6], 9],
  ];
  spheres.forEach(([c, r], i) => {
    ps.push(ball(c, r, 18 * r, S.l, 1, 0.06), ring(c, r, 6 * r, S.m));
    ps.push(ball(at(c, [1.5, -r * 0.35, 0]), r * 0.4, 30, S.m, 0.6, 0.25));
    ps.push(ball(at(c, [-2, -r * 0.4, 1.5]), r * 0.3, 24, S.g, 0.7, 0.25));
    ps.push(seg(at(c, [0, -r, 0]), [c[0] * 1.3, -14, c[2] * 1.3], 20, S.d));
    const [c2] = spheres[(i + 1) % 3] as [Vec3, number];
    ps.push(
      seg(at(c, [0, 1, 0]), at(c2, [0, 1, 0]), 30, S.m),
      seg(at(c, [0, -1, 0]), at(c2, [0, -1, 0]), 30, S.m),
    );
  });
  return ps;
}

function hangingPyramid(S: Shades): SPart[] {
  const ps: SPart[] = [square(22, 10, 0, 140, S.g)];
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    ps.push(seg([22 * sx, 10, 22 * sz], [0, -32, 0], 60, S.m));
    ps.push(seg([6 * sx, 10, 6 * sz], [0, 18, 0], 16, S.g));
  }
  for (let j = 1; j < 5; j++)
    ps.push(square(22 * (1 - j / 5), 10 - (42 * j) / 5, 0, 80 - 12 * j, S.l));
  ps.push(ring([0, 22, 0], 26, 200, S.g));
  ps.push(
    part(
      16 * 8,
      (u) => {
        const k = Math.floor(u * 16);
        const a = (k * TAU) / 16;
        const r = 26 + 5 * frac(u * 16);
        return [r * Math.cos(a), 22, r * Math.sin(a)];
      },
      S.l,
      0.15,
    ),
  );
  ps.push(tilted([0, 22, 0], 18, 160, S.l, 0.4, 0, 0.06));
  ps.push(falling(0, 0, -32, -62, 50, S.l, 0.08));
  return ps;
}

function neonCarousel(S: Shades): SPart[] {
  const ps: SPart[] = [
    seg([0, -24, 0], [0, 26, 0], 90, S.g),
    ball([0, 28, 0], 1.8, 40, S.l, 1, 0.3),
  ];
  for (let j = 0; j < 4; j++) {
    const r = 30 - 6 * j;
    const y = -15 + 10 * j;
    const turn = 0.08 * (j % 2 ? 1 : -1);
    const n = 2 * Math.round((TAU * r) / 0.7);
    ps.push(
      part(
        n,
        (u, _s, t) => {
          const a = frac(u * 2) * TAU + turn * t;
          const rr = u < 0.5 ? r : r - 2;
          return [rr * Math.cos(a), y, rr * Math.sin(a)];
        },
        j % 2 ? S.m : S.l,
        0.1,
      ),
    );
    // Small boards hung round its rim, each facing out.
    ps.push(
      part(
        12 * 16,
        (u, _s, t) => {
          const b = Math.min(11, Math.floor(u * 12));
          const a = (b * TAU) / 12 + turn * t;
          const [px, py] = aroundRect(frac(u * 12) * 8, 1.2, 0.8);
          return [
            r * Math.cos(a) - Math.sin(a) * px,
            y - 1.8 + py,
            r * Math.sin(a) + Math.cos(a) * px,
          ];
        },
        j % 2 ? S.l : S.m,
        0.25,
      ),
    );
  }
  return ps;
}

function dataLattice(S: Shades): SPart[] {
  // Stood on a corner: turned so a long diagonal stands upright.
  const corner = (p: Vec3): Vec3 => rotZ(rotX(p, 0.6155), Math.PI / 4);
  const edges = (h: number, n: number, rgb: RGB) =>
    part(
      n,
      (u) => {
        const e = Math.min(11, Math.floor(u * 12));
        const v = frac(u * 12) * 2 - 1;
        const axis = Math.floor(e / 4);
        const a = e & 1 ? h : -h;
        const b = e & 2 ? h : -h;
        const p: Vec3 = axis === 0 ? [v * h, a, b] : axis === 1 ? [a, v * h, b] : [a, b, v * h];
        return corner(p);
      },
      rgb,
    );
  const ps: SPart[] = [edges(18, 432, S.m), edges(6, 144, S.l)];
  // Lines across every face, a third in from each edge.
  ps.push(
    part(
      576,
      (u) => {
        const k = Math.min(23, Math.floor(u * 24));
        const v = (frac(u * 24) * 2 - 1) * 18;
        const face = Math.floor(k / 4);
        const line = k % 4;
        const off = line & 1 ? 6 : -6;
        const side = face & 1 ? 18 : -18;
        const axis = face >> 1;
        const along = line < 2;
        const q: Vec3 = [0, 0, 0];
        q[axis] = side;
        q[(axis + 1) % 3] = along ? v : off;
        q[(axis + 2) % 3] = along ? off : v;
        return corner(q);
      },
      S.d,
    ),
  );
  // Light falling through it, column by column.
  for (let c = 0; c < 8; c++)
    ps.push(
      falling(
        -11 + 22 * hash(c, 71),
        -11 + 22 * hash(c, 72),
        16,
        -16,
        22,
        S.l,
        0.1 + 0.04 * hash(c, 73),
      ),
    );
  return ps;
}

function twinRings(S: Shades): SPart[] {
  const ps: SPart[] = [];
  for (const sgn of [-1, 1]) {
    const y = 10 * sgn;
    const turn = 0.06 * sgn;
    ps.push(
      part(
        420,
        (u, _s, t) => {
          const a = frac(u * 2) * TAU + turn * t;
          const rr = u < 0.5 ? 30 : 27.5;
          return [rr * Math.cos(a), y, rr * Math.sin(a)];
        },
        S.m,
      ),
      part(
        90,
        (u, _s, t) => {
          const a = u * TAU + turn * t;
          return [28.75 * Math.cos(a), y + 1.2, 28.75 * Math.sin(a)];
        },
        S.l,
        0.25,
      ),
      part(
        104,
        (u, _s, t) => {
          const k = Math.min(3, Math.floor(u * 4));
          const a = (k * TAU) / 4 + turn * t + (sgn > 0 ? Math.PI / 4 : 0);
          const r = 6 + 21.5 * frac(u * 4);
          return [r * Math.cos(a), y, r * Math.sin(a)];
        },
        S.d,
      ),
    );
  }
  ps.push(
    part(
      240,
      (u) => {
        const k = Math.min(5, Math.floor(u * 6));
        const a = frac(u * 6) * TAU;
        return [6 * Math.cos(a), -18 + (36 * k) / 5, 6 * Math.sin(a)];
      },
      S.l,
    ),
    part(
      192,
      (u) => {
        const k = Math.min(7, Math.floor(u * 8));
        const a = (k * TAU) / 8;
        return [6 * Math.cos(a), -18 + 36 * frac(u * 8), 6 * Math.sin(a)];
      },
      S.d,
    ),
    part(
      160,
      (u) => {
        const side = u < 0.5 ? -1 : 1;
        const [px, pz] = aroundRect(frac(u * 2) * 56, 9, 5);
        return [side * (17 + px), 20, pz];
      },
      S.g,
    ),
    ball([0, 22, 0], 1.6, 24, S.g, 1, 0.3),
  );
  return ps;
}

const MAKERS: Record<StationDesign, (S: Shades) => SPart[]> = {
  'lantern-harbour': lanternHarbour,
  'orbital-monastery': orbitalMonastery,
  'lotus-rock': lotusRock,
  'spoke-wheel': spokeWheel,
  'nova-stack': novaStack,
  'docking-spire': dockingSpire,
  'disc-city': discCity,
  'garden-island': gardenIsland,
  'sky-ziggurat': skyZiggurat,
  gyroscope,
  biosphere,
  'hanging-pyramid': hangingPyramid,
  'neon-carousel': neonCarousel,
  'data-lattice': dataLattice,
  'twin-rings': twinRings,
};

/* ---------- built once, measured ---------- */

/** A station's model, and how far it reaches from its middle: out (r), down (lo) and up (hi). */
export type StationModel = Model & { lo: number; hi: number };

/** Which part site s falls in (the parts' running totals, searched by halves). */
function partOf(M: Model, s: number): number {
  let lo = 0;
  let hi = M.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((M.cum[mid] as number) <= s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** A local point of site s at time t, unturned. */
function localPoint(M: Model, s: number, t: number): { p: Vec3; part: SPart; u: number } {
  const i = partOf(M, s);
  const part = M.parts[i] as SPart;
  const start = (M.cum[i] as number) - part.n;
  const u = (s - start + 0.5) / part.n;
  return { p: part.f(u, s, t), part, u };
}

const models = new Map<Station, StationModel>();
/** Station st's model, built once and measured over a minute of its motion. */
export function stationModel(st: Station): StationModel {
  const had = models.get(st);
  if (had) return had;
  const built = cached(`station ${st.name}`, () => {
    const parts = MAKERS[st.design](stationShades(DISTRICTS[st.d].colour));
    const M = model(parts, 0, 0);
    let r = 0;
    let lo = 0;
    let hi = 0;
    for (const t of [0, 13, 29, 47]) {
      for (let s = 0; s < M.count; s++) {
        const { p } = localPoint(M, s, t);
        r = Math.max(r, Math.hypot(p[0], p[2]));
        lo = Math.min(lo, p[1]);
        hi = Math.max(hi, p[1]);
      }
    }
    return { ...M, top: hi, r, lo, hi } as StationModel;
  }) as StationModel;
  models.set(st, built);
  return built;
}

/* ---------- motion: turning and bobbing, from the time alone ---------- */

const phases = new Map<Station, number>();
/** Each station's own phase, for its turn and its bob. */
function phaseOf(st: Station): number {
  let p = phases.get(st);
  if (p === undefined) {
    p = hash(st.name.length * 131 + st.x + st.z, 77) * TAU;
    phases.set(st, p);
  }
  return p;
}

/** Station st's middle at time t (at its tile copy at x, z): bobbing gently. */
export function stationCentre(st: Station, t: number, x = st.x, z = st.z): Vec3 {
  return [x, GROUND + st.h + st.bob * Math.sin((TAU * t) / st.period + phaseOf(st)), z];
}

/** How far station st has turned round the vertical at time t. */
export const stationTurn = (st: Station, t: number) => st.spin * t + phaseOf(st);

/**
 * Site s of station st at time t, its middle at c: its place and colour into o, brightness k. The
 * colour drifts slowly between the part's shade and a lighter one; a few lamps twinkle softly.
 */
export function stationSite(
  st: Station,
  s: number,
  t: number,
  c: Vec3,
  k: number,
  o: number[],
): boolean {
  const M = stationModel(st);
  const i = partOf(M, s);
  const part = M.parts[i] as SPart;
  const u = (s - ((M.cum[i] as number) - part.n) + 0.5) / part.n;
  const p = part.f(u, s, t);
  const turn = stationTurn(st, t);
  const ct = Math.cos(turn);
  const st2 = Math.sin(turn);
  o[0] = c[0] + p[0] * ct - p[2] * st2;
  o[1] = c[1] + p[1];
  o[2] = c[2] + p[0] * st2 + p[2] * ct;
  const tw = part.tw ? 1 - part.tw * (0.5 + 0.5 * Math.sin(t * 0.8 + s * 1.7)) : 1;
  const drift = 0.5 + 0.5 * Math.sin(t * 0.07 + s * 0.011 + c[2] * 0.01);
  const glow = part.glow ? part.glow(u, t) : 1;
  const b = 0.46 * k * tw * glow;
  const w = 0.25 * drift;
  const rgb = part.rgb;
  o[3] = (rgb[0] + (C.warm[0] - rgb[0]) * w) * b;
  o[4] = (rgb[1] + (C.warm[1] - rgb[1]) * w) * b;
  o[5] = (rgb[2] + (C.warm[2] - rgb[2]) * w) * b;
  return Number.isFinite(o[0]) && Number.isFinite(o[1]) && Number.isFinite(o[2]);
}

/** How many sites every station has. */
export const stationCount = (st: Station) => stationModel(st).count;

/**
 * The stations within sight (R), as the Ship's items: every tile copy near, ahead of the eye or
 * round it, each kept at weight 1.8 and thinned with the distance by the renderer like everything
 * else (so far off, a station is a sparse outline; near, every lamp). No probes: they float over
 * every tower, so nothing in the city hides them. From high up they are lit a little more, so they
 * read over the plan.
 */
export function stationItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]) {
  const lift = 1.15 * (1 + 0.6 * planLook(eye[1]));
  STATIONS.forEach((st, i) => {
    const M = stationModel(st);
    copiesNear(st.x, st.z, eye, R + M.r, (x, z, n) => {
      const c = stationCentre(st, t, x, z);
      const rx = c[0] - eye[0];
      const ry = c[1] - eye[1];
      const rz = c[2] - eye[2];
      const dc = Math.hypot(rx, ry, rz);
      const d = Math.max(0, dc - Math.max(M.r, -M.lo, M.hi));
      if (d > R) return;
      // Behind the eye, and not round it: nothing of it can be in view.
      if (rx * fwd[0] + ry * fwd[1] + rz * fwd[2] < -M.r - 10 && d > 0) return;
      out.push({
        d,
        gid: mixId(i * 977 + n, 4747),
        count: M.count,
        weight: 1.8,
        site: (s, o) => stationSite(st, s, t, c, lift, o),
      });
    });
  });
}
