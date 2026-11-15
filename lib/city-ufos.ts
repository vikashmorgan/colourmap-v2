/*
 * UFOs over the City of Dreams (docs/specs/art-city.md, "UFOs, more flying cars and the space
 * police", 2026-11-15). Pure: no three.js, no DOM.
 *
 * 2026-11-15, the user: "more cool unique UFOs like the current circular orange ones, some bigger
 * UFO ones that fly around the city, and more flying cars flying around. They are awesome."
 *
 * The circular orange ones are the cruisers' ringed orb (lib/city-game.ts shipGrain, design 2: a
 * warm orb in a turning rose ring). Eight designs of our own in that spirit, made of grains:
 * saucers, rings, double discs, domed discs with a light rim turning, a torus with a breathing core.
 * Five are small and dart round the quarters down the long street lines, in hops (a quick dash, a
 * hover, the next dash); three are big, several times larger, and drift slowly on long loops
 * stretched along the city's length, so they read down the long views (the user: "perspective is
 * everything and the whole point of this city"). The big ones fly in open air between every roof
 * (none solid over 135 outside the Temple skyscrapers, which they keep away from) and the stations
 * and rings of light (none lower than 198), so they cross neither. Light is mellow: colours lean
 * slowly, a rim's lights run round at a walk, the torus's core breathes over five seconds. Every
 * place is a formula of the time: nothing kept from frame to frame, nothing allocated per grain.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { CORRIDOR_LINES } from './city-corridors';
import {
  BLOCK_X,
  GROUND,
  type Item,
  mixId,
  nearest,
  STRIP_I,
  TAU,
  TILE_I,
  TILE_X,
  TILE_Z,
  wideLine,
  wrap,
} from './city-grid';
import { LIFT_AREA } from './city-skyscrapers-plan';

export type UfoId = 'ember' | 'halo' | 'twin' | 'lantern' | 'triad' | 'crown' | 'torus' | 'mother';

export type UfoDesign = {
  id: UfoId;
  name: string;
  /** What it is, in a line. */
  line: string;
  /** A big one drifts on a long loop; a small one darts round a quarter. */
  big: boolean;
  /** Its radius in the city's units: the design is drawn a unit across, scaled by this. */
  size: number;
  /** How many light sites it has in full (thinned with the distance like everything else). */
  sites: number;
  /** Its hull, its accent and its lights. */
  body: RGB;
  accent: RGB;
  light: RGB;
};

export const UFO_DESIGNS: UfoDesign[] = [
  {
    id: 'ember',
    name: 'Ember saucer',
    line: 'A lens of a saucer under a small dome, eight warm lights turning slowly round its rim.',
    big: false,
    size: 2.6,
    sites: 110,
    body: [1, 0.55, 0.2],
    accent: [1, 0.74, 0.3],
    light: [1, 0.85, 0.6],
  },
  {
    id: 'halo',
    name: 'Halo ring',
    line: 'An open ring turning on its own, a soft orb hanging at its heart on three spokes.',
    big: false,
    size: 2.8,
    sites: 100,
    body: [1, 0.6, 0.28],
    accent: [1, 0.45, 0.55],
    light: [1, 0.8, 0.65],
  },
  {
    id: 'twin',
    name: 'Twin discs',
    line: 'Two discs stacked with air between, their lights turning opposite ways, a column of light joining them.',
    big: false,
    size: 2.4,
    sites: 110,
    body: [1, 0.64, 0.22],
    accent: [0.4, 0.88, 0.85],
    light: [0.9, 0.95, 1],
  },
  {
    id: 'lantern',
    name: 'Lantern lens',
    line: 'A thin lens trailing three hanging lights that sway as it darts.',
    big: false,
    size: 2.2,
    sites: 90,
    body: [1, 0.5, 0.22],
    accent: [1, 0.3, 0.2],
    light: [1, 0.78, 0.45],
  },
  {
    id: 'triad',
    name: 'Triad',
    line: 'Three small orbs turning round a faint ring, a pale light at the middle.',
    big: false,
    size: 3,
    sites: 100,
    body: [1, 0.62, 0.3],
    accent: [0.7, 0.5, 1],
    light: [0.95, 0.9, 1],
  },
  {
    id: 'crown',
    name: 'Crown dome',
    line: 'A wide disc under a tall dome, a rim of lights brightening one after the next all the way round.',
    big: true,
    size: 16,
    sites: 620,
    body: [1, 0.6, 0.25],
    accent: [0.55, 0.9, 1],
    light: [1, 0.86, 0.6],
  },
  {
    id: 'torus',
    name: 'Pulse torus',
    line: 'A great ring of a torus, its core a soft sun that breathes in and out.',
    big: true,
    size: 20,
    sites: 640,
    body: [1, 0.55, 0.3],
    accent: [1, 0.35, 0.7],
    light: [1, 0.82, 0.55],
  },
  {
    id: 'mother',
    name: 'Mothership',
    line: 'A vast flat disc ringed with rows of windows, a dome at its heart, a warm glow under it.',
    big: true,
    size: 28,
    sites: 820,
    body: [0.95, 0.62, 0.3],
    accent: [1, 0.9, 0.7],
    light: [1, 0.76, 0.4],
  },
];

export const ufoDesign = (id: UfoId) => UFO_DESIGNS.find((d) => d.id === id) as UfoDesign;
const SMALL = UFO_DESIGNS.filter((d) => !d.big);

/* ---------- the designs, a unit across ---------- */

/** Which part a grain is: hull (0), accent (1), light (2). */
export type UfoPart = 0 | 1 | 2;

/**
 * Grain q (0..1, spread over the design) of design `id`, with r (0..1) for spreads, at time t: its
 * place in the design's frame (a forward, b to its right, h up, a unit its radius), its part, and
 * how bright its part is now (1 most). Written into `o` [a, b, h, part, glow]: no allocation.
 */
export function ufoLocal(id: UfoId, q: number, r: number, t: number, o: Float64Array) {
  let a = 0;
  let b = 0;
  let h = 0;
  let part: UfoPart = 0;
  let glow = 1;
  const w = TAU * r;
  switch (id) {
    case 'ember': {
      if (q < 0.5) {
        // The lens: two rings, the rim and a smaller one under it.
        const low = q > 0.36;
        const R = low ? 0.55 : 1;
        a = R * Math.cos(w);
        b = R * Math.sin(w);
        h = low ? -0.2 : 0;
      } else if (q < 0.78) {
        // The dome: a golden-angle spread over a half sphere.
        const u = (q - 0.5) / 0.28;
        const y = u;
        const rad = 0.45 * Math.sqrt(Math.max(0, 1 - y * y));
        const g = 2.39996 * Math.floor(u * 30);
        a = rad * Math.cos(g);
        b = rad * Math.sin(g);
        h = 0.04 + 0.32 * y;
        part = 1;
      } else {
        // Eight rim lights, turning slowly round.
        const k = Math.floor(((q - 0.78) / 0.22) * 8);
        const g = (k * TAU) / 8 + 0.35 * t;
        a = 1.04 * Math.cos(g);
        b = 1.04 * Math.sin(g);
        h = -0.05;
        part = 2;
        glow = 0.8 + 0.2 * Math.sin(0.9 * t + k);
      }
      break;
    }
    case 'halo': {
      if (q < 0.55) {
        // The ring, a slim band turning round its middle.
        const g = w + 0.25 * t;
        const tube = 0.07 * (q < 0.28 ? 1 : -1);
        a = (1 + tube) * Math.cos(g);
        b = (1 + tube) * Math.sin(g);
        h = 0.05 * Math.sin(3 * g);
      } else if (q < 0.8) {
        // The orb at its heart.
        const u = (q - 0.55) / 0.25;
        const y = 1 - 2 * u;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const g = 2.39996 * Math.floor(u * 24);
        a = 0.26 * rad * Math.cos(g);
        b = 0.26 * rad * Math.sin(g);
        h = -0.1 + 0.26 * y;
        part = 2;
        glow = 0.85 + 0.15 * Math.sin(0.6 * t);
      } else {
        // Three spokes, out from the orb to the ring.
        const k = Math.floor(((q - 0.8) / 0.2) * 3);
        const g = (k * TAU) / 3 + 0.25 * t;
        const f = 0.3 + 0.68 * r;
        a = f * Math.cos(g);
        b = f * Math.sin(g);
        h = -0.03;
        part = 1;
      }
      break;
    }
    case 'twin': {
      if (q < 0.6) {
        // Two discs, each a rim and a hub ring, one over the other.
        const up = q < 0.3;
        const R = (q < 0.3 ? q / 0.3 : (q - 0.3) / 0.3) < 0.7 ? 1 : 0.5;
        a = R * Math.cos(w);
        b = R * Math.sin(w);
        h = up ? 0.24 : -0.24;
      } else if (q < 0.88) {
        // Lights round each rim, turning opposite ways.
        const up = q < 0.74;
        const k = Math.floor(((q - (up ? 0.6 : 0.74)) / 0.14) * 6);
        const g = (k * TAU) / 6 + (up ? 0.4 : -0.4) * t;
        a = 1.04 * Math.cos(g);
        b = 1.04 * Math.sin(g);
        h = up ? 0.24 : -0.24;
        part = 2;
        glow = 0.75 + 0.25 * Math.sin(0.8 * t + k);
      } else {
        // The column of light between them.
        const f = (q - 0.88) / 0.12;
        a = 0.08 * Math.cos(w);
        b = 0.08 * Math.sin(w);
        h = -0.2 + 0.4 * f;
        part = 1;
      }
      break;
    }
    case 'lantern': {
      if (q < 0.55) {
        // The lens: its rim, and a few rings over and under, thinning to its edge.
        const k = Math.floor((q / 0.55) * 4);
        const R = [1, 0.75, 0.75, 0.4][k] as number;
        a = R * Math.cos(w);
        b = R * Math.sin(w);
        h = [0, 0.1, -0.1, 0.16][k] as number;
      } else if (q < 0.85) {
        // Three hanging lights on threads, trailing behind and swaying.
        const k = Math.floor(((q - 0.55) / 0.3) * 3);
        const sway = 0.12 * Math.sin(1.1 * t + k * 1.7);
        const f = r;
        a = -0.3 - 0.25 * k + sway * f;
        b = (k - 1) * 0.35;
        h = -0.1 - 0.7 * f;
        part = f > 0.8 ? 2 : 1;
        glow = part === 2 ? 0.8 + 0.2 * Math.sin(0.7 * t + k) : 0.6;
      } else {
        a = 0.9;
        b = 0;
        h = 0.02;
        part = 2;
      }
      break;
    }
    case 'triad': {
      if (q < 0.3) {
        // The faint ring the orbs ride.
        a = 0.9 * Math.cos(w);
        b = 0.9 * Math.sin(w);
        h = 0;
        part = 1;
        glow = 0.6;
      } else if (q < 0.9) {
        // Three orbs turning round it.
        const u = (q - 0.3) / 0.6;
        const k = Math.floor(u * 3);
        const v = u * 3 - k;
        const g = (k * TAU) / 3 + 0.3 * t;
        const y = 1 - 2 * v;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const s = 2.39996 * Math.floor(v * 20);
        a = 0.9 * Math.cos(g) + 0.24 * rad * Math.cos(s);
        b = 0.9 * Math.sin(g) + 0.24 * rad * Math.sin(s);
        h = 0.24 * y;
      } else {
        a = 0.06 * Math.cos(w);
        b = 0.06 * Math.sin(w);
        h = 0;
        part = 2;
        glow = 0.85 + 0.15 * Math.sin(0.5 * t);
      }
      break;
    }
    case 'crown': {
      if (q < 0.4) {
        // The wide disc: its rim, a ring in, and a ring under, a saucer's profile.
        const k = Math.floor((q / 0.4) * 3);
        const R = [1, 0.7, 0.62][k] as number;
        a = R * Math.cos(w);
        b = R * Math.sin(w);
        h = [0, 0.08, -0.12][k] as number;
      } else if (q < 0.72) {
        // The tall dome.
        const u = (q - 0.4) / 0.32;
        const rad = 0.42 * Math.sqrt(Math.max(0, 1 - u * u));
        const g = 2.39996 * Math.floor(u * 90);
        a = rad * Math.cos(g);
        b = rad * Math.sin(g);
        h = 0.08 + 0.36 * u;
        part = 1;
        glow = 0.7;
      } else {
        // Twenty-four rim lights, brightening one after the next, a walk round the rim.
        const n = 24;
        const k = Math.floor(((q - 0.72) / 0.28) * n);
        const g = (k * TAU) / n;
        a = 1.03 * Math.cos(g);
        b = 1.03 * Math.sin(g);
        h = 0.02;
        part = 2;
        const run = wrap(k / n - 0.06 * t, 1);
        glow = 0.45 + 0.55 * smooth(1 - run * 4);
      }
      break;
    }
    case 'torus': {
      if (q < 0.72) {
        // The torus's shell: a ring of radius 0.75, its tube 0.25 across.
        const g = (TAU * q) / 0.72 + 0.02 * t;
        const R = 0.75 + 0.25 * Math.cos(w);
        a = R * Math.cos(g);
        b = R * Math.sin(g);
        h = 0.25 * Math.sin(w);
        part = Math.cos(w) > 0.7 ? 1 : 0;
      } else {
        // The core: a soft sun breathing over five seconds, its size and light together.
        const u = (q - 0.72) / 0.28;
        const breath = 0.5 + 0.5 * Math.sin((TAU * t) / 5);
        const y = 1 - 2 * u;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const g = 2.39996 * Math.floor(u * 180);
        const s = (0.2 + 0.06 * breath) * (0.6 + 0.4 * r);
        a = s * rad * Math.cos(g);
        b = s * rad * Math.sin(g);
        h = s * y;
        part = 2;
        glow = 0.55 + 0.35 * breath;
      }
      break;
    }
    default: {
      // The Mothership.
      if (q < 0.34) {
        // The disc: its rim and four rings in toward its heart, flat with a slight swell.
        const k = Math.floor((q / 0.34) * 5);
        const R = 1 - k * 0.18;
        a = R * Math.cos(w);
        b = R * Math.sin(w);
        h = 0.05 * k;
      } else if (q < 0.62) {
        // Three rows of windows, warm, each row a little apart.
        const k = Math.floor(((q - 0.34) / 0.28) * 3);
        const R = 0.92 - 0.2 * k;
        const g = (TAU * Math.floor(r * 60)) / 60 + 0.01 * t * (k & 1 ? 1 : -1);
        a = R * Math.cos(g);
        b = R * Math.sin(g);
        h = 0.03 + 0.05 * k;
        part = 1;
        glow = 0.75 + 0.25 * Math.sin(0.3 * t + 7 * r);
      } else if (q < 0.76) {
        // The dome at its heart.
        const u = (q - 0.62) / 0.14;
        const rad = 0.2 * Math.sqrt(Math.max(0, 1 - u * u));
        const g = 2.39996 * Math.floor(u * 60);
        a = rad * Math.cos(g);
        b = rad * Math.sin(g);
        h = 0.25 + 0.14 * u;
        part = 1;
        glow = 0.65;
      } else if (q < 0.9) {
        // A warm glow under it: a soft disc of light.
        const R = 0.7 * Math.sqrt(r);
        const g = TAU * hash(Math.floor(q * 1e4), 1171);
        a = R * Math.cos(g);
        b = R * Math.sin(g);
        h = -0.06;
        part = 2;
        glow = 0.35;
      } else {
        // Its rim lights, steady and slow.
        const k = Math.floor(((q - 0.9) / 0.1) * 16);
        const g = (k * TAU) / 16 + 0.015 * t;
        a = 1.02 * Math.cos(g);
        b = 1.02 * Math.sin(g);
        h = 0;
        part = 2;
        glow = 0.75 + 0.25 * Math.sin(0.4 * t + k);
      }
    }
  }
  o[0] = a;
  o[1] = b;
  o[2] = h;
  o[3] = part;
  o[4] = glow;
}

/** How bright each part is drawn, a share of its colour: hull, accent, lights. */
export const UFO_LIGHT = [0.34, 0.44, 0.6] as const;
/** The most any grain of a UFO is lit (mellow: under the street lights' brightest). */
export const UFO_MAX = UFO_LIGHT[2];

const scratch = new Float64Array(5);

/**
 * Site q (r for spreads) of design D centred at c, flying along f (level) and leaning `tilt` into
 * it, at time t, its colour leaning slowly by `phase`: into o [x, y, z, r, g, b], `k` of its light.
 */
export function ufoSite(
  D: UfoDesign,
  q: number,
  r: number,
  c: Vec3,
  f: Vec3,
  tilt: number,
  t: number,
  phase: number,
  k: number,
  o: number[],
) {
  ufoLocal(D.id, q, r, t, scratch);
  const a = (scratch[0] as number) * D.size;
  const b = (scratch[1] as number) * D.size;
  const h = (scratch[2] as number) * D.size;
  const part = scratch[3] as number;
  const glow = scratch[4] as number;
  const fl = Math.hypot(f[0], f[2]) || 1;
  const fx = f[0] / fl;
  const fz = f[2] / fl;
  o[0] = c[0] + fx * a - fz * b;
  o[1] = c[1] + h - a * tilt;
  o[2] = c[2] + fz * a + fx * b;
  // Hull leaning slowly toward the accent and back; the lights a touch warmer white.
  const lean = 0.5 + 0.5 * Math.sin(0.12 * t + phase);
  const src = part === 0 ? D.body : part === 1 ? D.accent : D.light;
  const dst = part === 0 ? D.accent : D.body;
  const m = part === 2 ? 0.1 * lean : 0.25 * lean;
  const lit = (UFO_LIGHT[part] as number) * glow * k;
  o[3] = (src[0] + (dst[0] - src[0]) * m) * lit;
  o[4] = (src[1] + (dst[1] - src[1]) * m) * lit;
  o[5] = (src[2] + (dst[2] - src[2]) * m) * lit;
}

/* ---------- the big ones: long slow loops over the city ---------- */

/**
 * A big UFO's loop, tile-local: an ellipse stretched along the city (z), round (cx, cz), rx across
 * and rz along, at height y over the street (rising and falling `bob`), flown at `speed`, one way.
 */
export type BigLoop = {
  id: UfoId;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  y: number;
  bob: number;
  speed: number;
  sgn: 1 | -1;
  phase: number;
};

/**
 * The three loops, each over the strip's middle (|x| under 64 with its rim, well off the Temple
 * skyscrapers at x 96 and more), between every roof (135 at most there) and the stations and rings
 * (198 at the lowest): the tallest, the Mothership's dome, tops out under 190.
 */
export const BIG_LOOPS: BigLoop[] = [
  { id: 'crown', cx: -22, cz: 520, rx: 24, rz: 440, y: 164, bob: 3, speed: 6, sgn: 1, phase: 0.4 },
  { id: 'torus', cx: 18, cz: 1330, rx: 22, rz: 500, y: 170, bob: 3, speed: 5, sgn: -1, phase: 2.2 },
  { id: 'mother', cx: 0, cz: 950, rx: 26, rz: 780, y: 172, bob: 2, speed: 4, sgn: 1, phase: 4.1 },
];

/** Big UFO B at time t, tile-local: its middle and its heading (along its loop). */
export function bigUfoAt(B: BigLoop, t: number): { c: Vec3; f: Vec3 } {
  const R = Math.sqrt((B.rx * B.rx + B.rz * B.rz) / 2);
  const th = B.phase + (B.sgn * B.speed * t) / R;
  const c: Vec3 = [
    B.cx + B.rx * Math.cos(th),
    GROUND + B.y + B.bob * Math.sin(0.21 * t + B.phase),
    B.cz + B.rz * Math.sin(th),
  ];
  const f: Vec3 = [-B.sgn * B.rx * Math.sin(th), 0, B.sgn * B.rz * Math.cos(th)];
  const l = Math.hypot(f[0], f[2]) || 1;
  f[0] /= l;
  f[2] /= l;
  return { c, f };
}

/** How far the big ones are drawn: they read from a long way down the views. */
export const BIG_SIGHT = 900;

/* ---------- the small ones: darting down the street lines ---------- */

/** A small UFO patrols a stretch this long down a street line (an eighth of the tile), darting from point to point. */
export const PATROL = TILE_Z / 8;
const PATROLS = 8;
/** A hop: dash then hover, this long (seconds); the dash takes the first share of it. */
export const HOP = 4;
export const DASH_SHARE = 0.45;
/** Of every street stretch, about this share has a darter. */
const DARTER_SHARE = 0.4;
/** How far the small ones are drawn, and how many at most. */
export const SMALL_SIGHT = 300;
export const SMALL_DRAWN = 6;
/** The small ones' heights over the street: over the lantern strings (50), under the express lanes. */
export const DARTER_LOW = 56;
export const DARTER_HIGH = 84;

/**
 * The street lines a darter may patrol, tile-local columns: the wide boulevards and the racing
 * corridors either side of the avenue (16 to 24 across), so a darter has room to sway.
 */
export const darterLine = (li: number) =>
  Math.abs(li) <= STRIP_I / 2 - 2 &&
  (wideLine(2, li) || (CORRIDOR_LINES as readonly number[]).includes(li));

/** Whether the stretch `cell` along street line `li` (tile-local) has a darter, and which design. */
export function darterOf(li: number, cell: number): { key: number; design: UfoDesign } | null {
  if (!darterLine(li)) return null;
  const key = mixId(li * 131 + 7, cell * 977 + 3);
  if (hash(key % 100003, 1181) >= DARTER_SHARE) return null;
  // Off the Temple skyscrapers' block, where the towers rise over every other roof.
  const x = li * BLOCK_X;
  const z0 = wrap(cell, PATROLS) * PATROL;
  if (
    x > LIFT_AREA.x0 - 6 &&
    x < LIFT_AREA.x1 + 6 &&
    z0 + PATROL > LIFT_AREA.z0 - 6 &&
    z0 < LIFT_AREA.z1 + 6
  )
    return null;
  const design = SMALL[Math.floor(hash(key % 100003, 1182) * SMALL.length)] as UfoDesign;
  return { key, design };
}

const dashEase = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;

/**
 * The darter of stretch `cell` on world street line I at time t: its middle (over the line, its
 * stretch's z), its heading (the way it last dashed), and how fast it is going now.
 */
export function darterAt(I: number, cell: number, key: number, t: number) {
  const k = key % 100003;
  const ph = HOP * hash(k, 1183);
  const n = Math.floor((t + ph) / HOP);
  const u = (t + ph) / HOP - n;
  const p0 = 12 + (PATROL - 24) * hash(k + n, 1184);
  const p1 = 12 + (PATROL - 24) * hash(k + n + 1, 1184);
  const y0 = DARTER_LOW + (DARTER_HIGH - DARTER_LOW) * hash(k + n, 1185);
  const y1 = DARTER_LOW + (DARTER_HIGH - DARTER_LOW) * hash(k + n + 1, 1185);
  const e = dashEase(u / DASH_SHARE);
  const s = p0 + (p1 - p0) * e;
  const sgn = p1 >= p0 ? 1 : -1;
  // Its pace now: the ease's slope, high at the dash's start, none while it hovers.
  const de = u < DASH_SHARE ? (3 * (1 - u / DASH_SHARE) ** 2) / (DASH_SHARE * HOP) : 0;
  const speed = Math.abs(p1 - p0) * de;
  const hover = 0.6 * Math.sin(1.3 * t + ph);
  const c: Vec3 = [
    I * BLOCK_X + 0.6 * Math.sin(0.5 * t + 2 * ph),
    GROUND + y0 + (y1 - y0) * e + hover,
    cell * PATROL + s,
  ];
  return { c, f: [0, 0, sgn] as Vec3, speed };
}

/* ---------- drawing ---------- */

/** The UFOs near the eye, for the Ship's renderer: the big ones far, the small ones near. */
export function ufoItems(eye: Vec3, fwd: Vec3, t: number, out: Item[]) {
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  // The big ones: every loop's copies round the eye in sight.
  for (let i = 0; i < BIG_LOOPS.length; i++) {
    const B = BIG_LOOPS[i] as BigLoop;
    const D = ufoDesign(B.id);
    const at = bigUfoAt(B, t);
    for (let dz = -1; dz <= 1; dz++) {
      const c: Vec3 = [
        nearest(at.c[0], eye[0], TILE_X),
        at.c[1],
        nearest(at.c[2], eye[2], TILE_Z) + dz * TILE_Z,
      ];
      const ex = c[0] - eye[0];
      const ez = c[2] - eye[2];
      const d = Math.max(0, Math.hypot(ex, c[1] - eye[1], ez) - D.size);
      if (d > BIG_SIGHT || ex * hx + ez * hz < -D.size) continue;
      pushUfo(out, D, c, at.f, 0, t, mixId(i, 12301 + dz), d, B.phase, 1);
    }
  }
  // The small ones: the stretches round the eye with a darter, nearest first.
  const near: { d: number; I: number; cell: number; key: number; D: UfoDesign }[] = [];
  const i0 = Math.ceil((eye[0] - SMALL_SIGHT) / BLOCK_X);
  const i1 = Math.floor((eye[0] + SMALL_SIGHT) / BLOCK_X);
  const c0 = Math.floor((eye[2] - SMALL_SIGHT) / PATROL);
  const c1 = Math.floor((eye[2] + SMALL_SIGHT) / PATROL);
  for (let I = i0; I <= i1; I++) {
    const li = wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
    for (let cell = c0; cell <= c1; cell++) {
      const lc = wrap(cell, PATROLS);
      const dr = darterOf(li, lc);
      if (!dr) continue;
      const d = Math.hypot(I * BLOCK_X - eye[0], (cell + 0.5) * PATROL - eye[2]);
      if (d < SMALL_SIGHT + PATROL / 2) near.push({ d, I, cell, key: dr.key, D: dr.design });
    }
  }
  near.sort((a, b) => a.d - b.d);
  for (let n = 0; n < Math.min(SMALL_DRAWN, near.length); n++) {
    const e = near[n] as (typeof near)[number];
    const at = darterAt(e.I, e.cell, e.key, t);
    const ex = at.c[0] - eye[0];
    const ez = at.c[2] - eye[2];
    const d = Math.max(0, Math.hypot(ex, at.c[1] - eye[1], ez) - e.D.size);
    if (d > SMALL_SIGHT || ex * hx + ez * hz < -e.D.size) continue;
    // Leaning into its dash, a little, as it goes.
    const tilt = Math.min(0.25, at.speed * 0.008);
    pushUfo(
      out,
      e.D,
      at.c,
      at.f,
      tilt,
      t,
      mixId(e.key, 12311),
      d,
      hash(e.key % 1000, 1186) * TAU,
      1.2,
    );
  }
}

function pushUfo(
  out: Item[],
  D: UfoDesign,
  c: Vec3,
  f: Vec3,
  tilt: number,
  t: number,
  gid: number,
  d: number,
  phase: number,
  weight: number,
) {
  const R = D.size;
  out.push({
    d,
    gid,
    count: D.sites,
    weight,
    probe: D.big
      ? [
          c,
          [c[0] + R, c[1], c[2]],
          [c[0] - R, c[1], c[2]],
          [c[0], c[1], c[2] + R],
          [c[0], c[1], c[2] - R],
        ]
      : [c],
    site: (s, o) => {
      ufoSite(D, (s + 0.5) / D.sites, hash(s, 1191), c, f, tilt, t, phase, 1, o);
      return true;
    },
  });
}
