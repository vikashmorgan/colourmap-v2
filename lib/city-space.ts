/*
 * Hyperspace and three solar systems over the City of Dreams (docs/specs/art-city.md,
 * "Hyperspace"). Pure: no three.js, no DOM.
 *
 * Queued from the user (2026-11-12): "ultraboost ring portals high in the sky into hyperspace and
 * other solar systems": a few portals high over the city, each a run of rings shrinking from big
 * to small, seen from far; through every ring in order is the ultraboost, into the hyperspace
 * tunnel (star lines streaking past, rings of light pulsing by, a quiet Mach number), and out into
 * space: three solar systems, each a star with its planets (rings, moons, the glow of an
 * atmosphere), all in grains, to fly between; more ring portals lead on to the next system and
 * back home to the City. No cities on the planets.
 *
 * Space has its own frame (the star of each system at its origin); while you are out there the
 * Ship's renderer draws only what this file gives it.
 */

import { fibonacciSphere, hash, type RGB, type Vec3 } from './bigbang';
import {
  beat,
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

type Spot = { pos: Vec3; rgb: RGB };

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const frac = (x: number) => x - Math.floor(x);
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Two unit vectors square to n and to each other. */
function basis(n: Vec3): [Vec3, Vec3] {
  const u = norm(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
  return [u, cross(n, u)];
}

/* ---------- portals: runs of rings shrinking from big to small ---------- */

/** How many rings a portal has, their radii from the first to the last, and the gap between them. */
export const RING_RADII = [24, 19, 15, 11, 8];
export const RING_GAP = 30;
/** How long you have from one ring to the next before the run starts over. */
export const RING_WINDOW = 6;

/** A portal: its first ring's middle, the way through it, and where it leads. */
export type Portal = { at: Vec3; axis: Vec3; to: number | 'city'; name: string };

/** The height of the city's portals: over the towers' sky, where the super boost holds you. */
export const PORTAL_Y = GROUND + 210;
/** The city's portals, tile-local, all leading to the first system. */
export const CITY_PORTALS: Portal[] = [
  { at: [0, PORTAL_Y, 26 * 34], axis: [0, 0, -1], to: 0, name: 'the Avenue Gate' },
  { at: [-110, PORTAL_Y + 30, 300], axis: [1, 0, 0], to: 0, name: 'the Chinatown Gate' },
  { at: [120, PORTAL_Y + 15, 1400], axis: [0, 0, 1], to: 0, name: 'the Market Gate' },
];

/** Ring i of portal P: its middle and radius. */
export const ringOf = (P: Portal, i: number): { c: Vec3; r: number } => ({
  c: add(P.at, P.axis, i * RING_GAP),
  r: RING_RADII[i] as number,
});

/** City portal i at the copy of it nearest q. */
export function cityPortal(i: number, q: Vec3): Portal {
  const P = CITY_PORTALS[i] as Portal;
  return {
    ...P,
    at: [nearest(P.at[0], q[0], TILE_X), P.at[1], nearest(P.at[2], q[2], TILE_Z)],
  };
}

/** Which ring of P the step from a to b went through (its plane crossed inside it), or -1. */
export function ringCrossed(P: Portal, a: Vec3, b: Vec3): number {
  for (let i = 0; i < RING_RADII.length; i++) {
    const { c, r } = ringOf(P, i);
    const da = dot(sub(a, c), P.axis);
    const db = dot(sub(b, c), P.axis);
    if (da < 0 && db >= 0) {
      const k = da / (da - db);
      const q = add(a, sub(b, a), k);
      if (len(sub(q, c)) < r) return i;
    }
  }
  return -1;
}

/* ---------- three solar systems ---------- */

export type Moon = { r: number; orbit: number; speed: number; colour: RGB };
export type Planet = {
  name: string;
  r: number;
  orbit: number;
  /** Radians a second round its star, and where it starts. */
  speed: number;
  phase: number;
  colour: RGB;
  /** Bands across a gas giant: their colour and how many. */
  bands?: { colour: RGB; n: number };
  atmosphere?: RGB;
  rings?: { inner: number; outer: number; colour: RGB; tilt: number };
  moons?: Moon[];
};
export type System = {
  name: string;
  star: { r: number; colour: RGB };
  planets: Planet[];
  /** Where you come out of hyperspace, facing the star. */
  arrive: Vec3;
  portals: Portal[];
};

const sys = (k: number, home: boolean): Portal[] => [
  {
    at: [900, 80, -300],
    axis: norm([0.3, 0, 1]),
    to: (k + 1) % 3,
    name: `the gate to ${['Tidewell', 'Ember', 'Aurora'][k]}`,
  },
  ...(home
    ? [
        {
          at: [-850, 40, 500] as Vec3,
          axis: norm([-0.2, 0, -1]),
          to: 'city' as const,
          name: 'the gate home',
        },
      ]
    : []),
];

export const SYSTEMS: System[] = [
  {
    name: 'Aurora',
    star: { r: 70, colour: [1, 0.78, 0.4] },
    planets: [
      { name: 'Cinder', r: 12, orbit: 220, speed: 0.05, phase: 0.4, colour: [0.9, 0.42, 0.28] },
      {
        name: 'Maren',
        r: 22,
        orbit: 380,
        speed: 0.032,
        phase: 2.1,
        colour: [0.2, 0.45, 0.95],
        atmosphere: [0.45, 0.75, 1],
        moons: [{ r: 5, orbit: 46, speed: 0.4, colour: [0.8, 0.8, 0.85] }],
      },
      {
        name: 'Hallow',
        r: 48,
        orbit: 620,
        speed: 0.018,
        phase: 4.2,
        colour: [0.95, 0.75, 0.5],
        bands: { colour: [0.75, 0.45, 0.3], n: 9 },
        rings: { inner: 1.45, outer: 2.3, colour: [0.95, 0.88, 0.7], tilt: 0.42 },
        moons: [
          { r: 6, orbit: 140, speed: 0.22, colour: [0.85, 0.75, 0.6] },
          { r: 4, orbit: 175, speed: 0.15, colour: [0.7, 0.75, 0.85] },
        ],
      },
      {
        name: 'Rime',
        r: 16,
        orbit: 820,
        speed: 0.012,
        phase: 5.5,
        colour: [0.75, 0.9, 1],
        atmosphere: [0.7, 0.95, 1],
      },
    ],
    arrive: [0, 60, 1150],
    portals: sys(0, true),
  },
  {
    name: 'Tidewell',
    star: { r: 60, colour: [0.65, 0.8, 1] },
    planets: [
      {
        name: 'Vesper',
        r: 26,
        orbit: 300,
        speed: 0.04,
        phase: 1.2,
        colour: [0.55, 0.35, 0.85],
        rings: { inner: 1.5, outer: 2.1, colour: [0.75, 0.65, 1], tilt: -0.3 },
      },
      {
        name: 'Verdance',
        r: 20,
        orbit: 520,
        speed: 0.026,
        phase: 3.3,
        colour: [0.3, 0.75, 0.45],
        atmosphere: [0.55, 1, 0.7],
        moons: [
          { r: 4, orbit: 40, speed: 0.5, colour: [0.85, 0.85, 0.8] },
          { r: 3, orbit: 55, speed: 0.33, colour: [0.7, 0.7, 0.8] },
        ],
      },
      {
        name: 'Abyssal',
        r: 40,
        orbit: 760,
        speed: 0.015,
        phase: 0.2,
        colour: [0.2, 0.35, 0.75],
        bands: { colour: [0.35, 0.6, 0.9], n: 7 },
        atmosphere: [0.4, 0.6, 1],
      },
    ],
    arrive: [0, 60, 1100],
    portals: sys(1, true),
  },
  {
    name: 'Ember',
    star: { r: 90, colour: [1, 0.45, 0.25] },
    planets: [
      {
        name: 'Forge',
        r: 14,
        orbit: 260,
        speed: 0.045,
        phase: 2.7,
        colour: [1, 0.35, 0.12],
        atmosphere: [1, 0.55, 0.25],
      },
      {
        name: 'Saffron',
        r: 52,
        orbit: 560,
        speed: 0.02,
        phase: 5.1,
        colour: [0.95, 0.6, 0.25],
        bands: { colour: [0.85, 0.4, 0.2], n: 11 },
        rings: { inner: 1.35, outer: 2.6, colour: [1, 0.8, 0.55], tilt: 0.25 },
        moons: [{ r: 7, orbit: 160, speed: 0.18, colour: [0.9, 0.7, 0.55] }],
      },
      {
        name: 'Hush',
        r: 18,
        orbit: 840,
        speed: 0.011,
        phase: 0.9,
        colour: [0.65, 0.55, 0.75],
        moons: [{ r: 3, orbit: 36, speed: 0.45, colour: [0.8, 0.8, 0.85] }],
      },
    ],
    arrive: [0, 70, 1250],
    portals: sys(2, true),
  },
];

/** Where planet P is at time t, round its star (a slight tilt to each orbit). */
export function planetAt(P: Planet, t: number): Vec3 {
  const a = P.phase + P.speed * t;
  return [Math.cos(a) * P.orbit, Math.sin(a * 1.0) * P.orbit * 0.04, Math.sin(a) * P.orbit];
}
/** Where moon m of a planet at c is at time t. */
export function moonAt(c: Vec3, m: Moon, t: number, k: number): Vec3 {
  const a = m.speed * t + k * 2.1;
  return [
    c[0] + Math.cos(a) * m.orbit,
    c[1] + Math.sin(a) * m.orbit * 0.25,
    c[2] + Math.sin(a) * m.orbit,
  ];
}

/* ---------- where you are: the city, the tunnel or a system ---------- */

export const TUNNEL_SECONDS = 6;
const state = {
  mode: 'city' as 'city' | 'tunnel' | 'space',
  system: 0,
  to: 0 as number | 'city',
  since: 0,
  travelled: 0,
  /** Where the tunnel home comes out: the city portal you left by. */
  home: null as Portal | null,
  /** Each portal's run: rings gone through in order, and when the last was. */
  runs: new Map<string, { n: number; t: number }>(),
  /** The name of the system you came out in, shown a while. */
  arrived: 0,
};

export const spaceMode = () => state.mode;
export const inSpace = () => state.mode !== 'city';
export const currentSystem = () => SYSTEMS[state.system] as System;
export function resetSpace() {
  state.mode = 'city';
  state.runs.clear();
  state.home = null;
}

/**
 * The rings you fly through, each step from a to b (the city's portals in the city, the system's
 * out in space): through all of a portal's rings in order, each within RING_WINDOW of the last, it
 * opens; returns that portal, else null.
 */
export function portalStep(a: Vec3, b: Vec3, t: number): Portal | null {
  const list =
    state.mode === 'space' ? currentSystem().portals : CITY_PORTALS.map((_, i) => cityPortal(i, b));
  for (const P of list) {
    const i = ringCrossed(P, a, b);
    if (i < 0) continue;
    const key = `${state.mode}:${P.name}:${Math.round(P.at[0])}:${Math.round(P.at[2])}`;
    const run = state.runs.get(key);
    const n = run && t - run.t < RING_WINDOW ? run.n : 0;
    const next = i === n ? n + 1 : i === 0 ? 1 : 0;
    state.runs.set(key, { n: next, t });
    if (next === RING_RADII.length) {
      state.runs.delete(key);
      return P;
    }
  }
  return null;
}
/** How many rings of the run you are on (for the words beside the bar), 0 if none. */
export function ringsDone(t: number): number {
  let best = 0;
  for (const r of state.runs.values()) if (t - r.t < RING_WINDOW) best = Math.max(best, r.n);
  return best;
}

/** Into the tunnel, through portal P (leaving the city by it, or a system). */
export function enterTunnel(P: Portal, t: number) {
  if (state.mode === 'city') state.home = P;
  state.mode = 'tunnel';
  state.to = P.to;
  state.since = t;
  state.travelled = 0;
  state.runs.clear();
}

/** The tunnel's pace, as a Mach number, through its seconds: up quickly, a long glide, easing down. */
export function tunnelMach(u: number): number {
  return 3 + 30 * smooth(u / 0.25) * (1 - smooth((u - 0.8) / 0.2));
}

export type Arrival = { pos: Vec3; yaw: number; city: boolean };
/**
 * A step in the tunnel: on along it; at its end, where you come out (in a system, facing its star;
 * home, just past the portal you left by, on along it).
 */
export function tunnelStep(dt: number, t: number): Arrival | null {
  const u = (t - state.since) / TUNNEL_SECONDS;
  state.travelled += tunnelMach(Math.min(1, u)) * 12 * dt;
  if (u < 1) return null;
  if (state.to === 'city') {
    const P = state.home ?? CITY_PORTALS[0];
    state.mode = 'city';
    const last = add(P.at, P.axis, (RING_RADII.length - 1) * RING_GAP + 40);
    return { pos: last, yaw: Math.atan2(-P.axis[0], -P.axis[2]), city: true };
  }
  state.mode = 'space';
  state.system = state.to;
  state.arrived = t;
  const S = currentSystem();
  const f = norm(sub([0, 0, 0], S.arrive));
  return { pos: [...S.arrive], yaw: Math.atan2(-f[0], -f[2]), city: false };
}

/** Out in space, nowhere inside a star, a planet or a moon: pushed out to just over its surface. */
export function keepOut(q: Vec3, t: number): Vec3 {
  const S = currentSystem();
  const out = (c: Vec3, r: number) => {
    const d = sub(q, c);
    const l = len(d);
    if (l < r + 4) q = add(c, norm(l > 1e-6 ? d : [0, 1, 0]), r + 4);
  };
  out([0, 0, 0], S.star.r * 1.3);
  for (const P of S.planets) {
    const c = planetAt(P, t);
    out(c, P.r);
    P.moons?.forEach((m, k) => {
      out(moonAt(c, m, t, k), m.r);
    });
  }
  return q;
}

/** The words beside the bar out there. */
export function spaceBanner(t: number): string {
  if (state.mode === 'tunnel') {
    const u = Math.min(1, (t - state.since) / TUNNEL_SECONDS);
    return `Hyperspace · Mach ${Math.round(tunnelMach(u))}`;
  }
  if (state.mode !== 'space') return '';
  const S = currentSystem();
  const n = ringsDone(t);
  if (n > 0) return `Ring ${n} of ${RING_RADII.length}`;
  if (t - state.arrived < 7)
    return `${S.name} · fly between the planets · the rings lead on, the gold ones home`;
  return S.name;
}
/** In the city, the run of rings you are on, if any. */
export function cityRingBanner(t: number): string {
  const n = ringsDone(t);
  return n > 0 ? `Ultraboost · ring ${n} of ${RING_RADII.length}` : '';
}

/* ---------- drawing: portals ---------- */

const RING_SITES = 240;

/** Site s of portal P's rings: each a circle of light, lights chasing round, big to small. */
function portalSite(P: Portal, s: number, t: number, o: number[], home: boolean): boolean {
  const n = RING_RADII.length;
  const per = RING_SITES;
  const i = Math.min(n - 1, Math.floor(s / per));
  const q = (s - i * per + 0.5) / per;
  const { c, r } = ringOf(P, i);
  const [u, v] = basis(P.axis);
  let a = q * TAU;
  let rr = r;
  // A tenth of each ring's grains a bright knot running round it, the next ring's later.
  const chase = frac(t * 0.25 - i * 0.12);
  if (q > 0.9) a = (chase + (q - 0.9) * 0.3) * TAU;
  // The rims thicken a little inward.
  if (hash(s, 3) < 0.35) rr = r * (0.95 + 0.04 * hash(s, 4));
  const p = add(add(c, u, Math.cos(a) * rr), v, Math.sin(a) * rr);
  o[0] = p[0];
  o[1] = p[1];
  o[2] = p[2];
  const hue = home ? mix(C.gold, C.white, (i / (n - 1)) * 0.5) : mix(C.violet, C.cyan, i / (n - 1));
  const pulse = 0.75 + 0.25 * beat(t, 1 / 2, -i * 0.08);
  const k = q > 0.9 ? 0.9 : 0.42 * pulse;
  [o[3], o[4], o[5]] = scale(hue, k);
  return true;
}

function portalItem(P: Portal, eye: Vec3, t: number, gid: number): Item {
  const mid = ringOf(P, 2).c;
  return {
    d: Math.max(0, len(sub(mid, eye)) - RING_GAP * 2.5),
    gid,
    count: RING_SITES * RING_RADII.length,
    weight: 2.6,
    site: (s, o) => portalSite(P, s, t, o, P.to === 'city'),
  };
}

/** How far off the city's portals show. */
export const PORTAL_R = 1500;
/** The city's portals within sight, for the Ship's renderer in the city. */
export function cityPortalItems(eye: Vec3, t: number, out: Item[]) {
  CITY_PORTALS.forEach((_, i) => {
    const P = cityPortal(i, eye);
    if (len(sub(ringOf(P, 2).c, eye)) > PORTAL_R) return;
    out.push(portalItem(P, eye, t, mixId(i, 9901)));
  });
}

/* ---------- drawing: stars, planets, rings, moons ---------- */

/** A sphere's site facing the eye (the far side is hidden behind it), lit from the star. */
function sphereSite(
  c: Vec3,
  r: number,
  s: number,
  n: number,
  eye: Vec3,
  colour: (nrm: Vec3) => RGB,
  lightFrom: Vec3 | null,
  o: number[],
): boolean {
  const nrm = fibonacciSphere(s, n);
  const p = add(c, nrm, r);
  if (dot(nrm, sub(eye, p)) < 0) return false;
  let k = 1;
  if (lightFrom) {
    const toStar = norm(sub(lightFrom, p));
    k = 0.07 + 0.93 * Math.max(0, dot(nrm, toStar)) ** 0.8;
  }
  const col = colour(nrm);
  o[0] = p[0];
  o[1] = p[1];
  o[2] = p[2];
  [o[3], o[4], o[5]] = scale(col, k);
  return true;
}

const STAR = [0, 0, 0] as Vec3;

/** Every body of system S near enough, for the Ship's renderer out in space. */
export function systemItems(S: System, eye: Vec3, t: number, out: Item[]) {
  const dist = (c: Vec3, r: number) => Math.max(0, len(sub(c, eye)) - r);
  // The star: its face, breathing slowly, and a corona round it.
  const { r: sr, colour: sc } = S.star;
  out.push({
    d: dist(STAR, sr),
    gid: mixId(1, 9001),
    count: 2600,
    weight: 1.4,
    site: (s, o) =>
      sphereSite(
        STAR,
        sr,
        s,
        2600,
        eye,
        (nrm) => scale(mix(sc, C.white, 0.35 + 0.15 * Math.sin(nrm[1] * 9 + t * 0.4)), 0.85),
        null,
        o,
      ),
  });
  out.push({
    d: dist(STAR, sr * 1.6),
    gid: mixId(2, 9001),
    count: 1400,
    weight: 1.2,
    site: (s, o) => {
      const dir = fibonacciSphere(s, 1400);
      const lift = frac(hash(s, 5) + t * 0.03);
      const p = add(STAR, dir, sr * (1.02 + 0.6 * lift));
      o[0] = p[0];
      o[1] = p[1];
      o[2] = p[2];
      [o[3], o[4], o[5]] = scale(sc, 0.4 * (1 - lift) ** 1.5);
      return true;
    },
  });
  S.planets.forEach((P, pi) => {
    const c = planetAt(P, t);
    const d = dist(c, P.r * 2.5);
    // Its orbit: a faint dotted circle, to steer by.
    out.push({
      d: Math.max(0, Math.abs(len(sub(eye, STAR)) - P.orbit) - 10),
      gid: mixId(pi, 9101),
      count: 360,
      weight: 0.6,
      site: (s, o) => {
        const a = (s / 360) * TAU;
        o[0] = Math.cos(a) * P.orbit;
        o[1] = Math.sin(a) * P.orbit * 0.04;
        o[2] = Math.sin(a) * P.orbit;
        [o[3], o[4], o[5]] = scale(mix(P.colour, C.white, 0.5), 0.07);
        return true;
      },
    });
    const n = 1800;
    out.push({
      d,
      gid: mixId(pi, 9102),
      count: n,
      weight: 1.3,
      site: (s, o) =>
        sphereSite(
          c,
          P.r,
          s,
          n,
          eye,
          (nrm) => {
            if (!P.bands) return scale(P.colour, 0.6);
            const band =
              0.5 + 0.5 * Math.sin(nrm[1] * P.bands.n * Math.PI + Math.sin(nrm[0] * 3) * 0.6);
            return scale(mix(P.colour, P.bands.colour, band), 0.6);
          },
          STAR,
          o,
        ),
    });
    const atm = P.atmosphere;
    if (atm) {
      // The glow of its air: a rim round its disc as the eye sees it, bright on the lit side.
      out.push({
        d,
        gid: mixId(pi, 9103),
        count: 420,
        weight: 1.3,
        site: (s, o) => {
          const view = norm(sub(c, eye));
          const [u, v] = basis(view);
          const a = (s / 420) * TAU;
          const rr = P.r * (1.03 + 0.12 * hash(s, 7) ** 2);
          const dir = add(scale3(u, Math.cos(a)), v, Math.sin(a));
          const p = add(c, dir, rr);
          const lit = 0.25 + 0.75 * Math.max(0, dot(dir, norm(sub(STAR, c))));
          o[0] = p[0];
          o[1] = p[1];
          o[2] = p[2];
          [o[3], o[4], o[5]] = scale(atm, 0.36 * lit * (1 - (rr / P.r - 1.03) / 0.12) ** 0.6);
          return true;
        },
      });
    }
    const R = P.rings;
    if (R) {
      // Its rings, in bands with gaps, tilted, hidden where the planet stands in front of them.
      const nrm = norm([Math.sin(R.tilt), Math.cos(R.tilt), 0.2]);
      const [u, v] = basis(nrm);
      out.push({
        d,
        gid: mixId(pi, 9104),
        count: 1300,
        weight: 1.2,
        site: (s, o) => {
          const a = hash(s, 11) * TAU;
          let f = hash(s, 12);
          // Bands: skip the gaps.
          if (Math.sin(f * 23) > 0.75) f = frac(f + 0.13);
          const rr = P.r * (R.inner + (R.outer - R.inner) * f);
          const p = add(add(c, u, Math.cos(a) * rr), v, Math.sin(a) * rr);
          // Behind the planet's disc as the eye sees it: hidden.
          const toP = sub(p, eye);
          const toC = sub(c, eye);
          const along = dot(toP, norm(toC));
          if (along > len(toC)) {
            const off = len(sub(toP, scale3(norm(toC), along)));
            if (off < (P.r * along) / len(toC)) return false;
          }
          // In the planet's shadow: dim.
          const shade =
            dot(norm(sub(p, c)), norm(sub(STAR, c))) < -0.2 && rr < P.r * 2.6 ? 0.25 : 1;
          o[0] = p[0];
          o[1] = p[1];
          o[2] = p[2];
          const band = 0.6 + 0.4 * Math.sin(f * 40);
          [o[3], o[4], o[5]] = scale(R.colour, 0.3 * band * shade);
          return true;
        },
      });
    }
    P.moons?.forEach((m, k) => {
      const mc = moonAt(c, m, t, k);
      out.push({
        d: dist(mc, m.r),
        gid: mixId(pi * 8 + k, 9105),
        count: 300,
        weight: 1.3,
        site: (s, o) => sphereSite(mc, m.r, s, 300, eye, () => scale(m.colour, 0.55), STAR, o),
      });
    });
  });
  S.portals.forEach((P, i) => {
    out.push(portalItem(P, eye, t, mixId(i, 9201)));
  });
}
const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

/* ---------- the tunnel ---------- */

const TUNNEL_SITES = 2400;
const STREAK_RUN = 420;

/**
 * Site s of the tunnel round an eye at `eye` flying along f: star lines streaking past (longer the
 * faster), and every so often a ring of light rushing by on the beat.
 */
function tunnelSite(eye: Vec3, f: Vec3, s: number, t: number, o: number[]): boolean {
  const u = Math.min(1, (t - state.since) / TUNNEL_SECONDS);
  const mach = tunnelMach(u);
  const [a, b] = basis(f);
  const go = state.travelled;
  if (s < TUNNEL_SITES * 0.78) {
    const k = Math.floor(s / 6);
    const ang = hash(k, 21) * TAU;
    const rad = 7 + 38 * hash(k, 22) ** 0.7;
    const along = frac(hash(k, 23) - go / STREAK_RUN) * STREAK_RUN - 60;
    const streak = 1 + mach * 0.9;
    const p = add(
      add(add(eye, a, Math.cos(ang) * rad), b, Math.sin(ang) * rad),
      f,
      along + ((s % 6) / 6) * streak,
    );
    o[0] = p[0];
    o[1] = p[1];
    o[2] = p[2];
    const hue = hash(k, 24) < 0.7 ? mix(C.white, C.cyan, 0.3) : C.violet;
    [o[3], o[4], o[5]] = scale(hue, (0.18 + 0.3 * smooth(mach / 20)) * (1 - (s % 6) / 7));
    return true;
  }
  // Rings rushing by, one every 90 of the way.
  const q = s - Math.floor(TUNNEL_SITES * 0.78);
  const ring = Math.floor(q / 132);
  const along = frac((ring * 90 - go) / 360) * 360 - 40;
  const ang = ((q % 132) / 132) * TAU;
  const p = add(add(add(eye, a, Math.cos(ang) * 30), b, Math.sin(ang) * 30), f, along);
  o[0] = p[0];
  o[1] = p[1];
  o[2] = p[2];
  [o[3], o[4], o[5]] = scale(mix(C.violet, C.magenta, 0.3), 0.32 * (0.6 + 0.4 * beat(t, 1)));
  return true;
}

/** What the Ship's renderer draws out here: the tunnel round you, or the system you are in. */
export function spaceItems(eye: Vec3, f: Vec3, t: number): Item[] {
  const out: Item[] = [];
  if (state.mode === 'tunnel') {
    out.push({
      d: 0,
      gid: 9300,
      count: TUNNEL_SITES,
      weight: 3,
      site: (s, o) => tunnelSite(eye, f, s, t, o),
    });
  } else if (state.mode === 'space') systemItems(currentSystem(), eye, t, out);
  return out.sort((x, y) => x.d - y.d);
}

/* ---------- the sky out there: stars all round, dust drifting past ---------- */

const STAR_SKY_R = 3200;
/** Grain L of n of the starry sky round the eye (and a band of the galaxy across it). */
export function spaceSky(L: number, n: number, eye: Vec3, t: number): Spot {
  const band = hash(L, 31) < 0.35;
  let dir = fibonacciSphere((L * 7919) % n, n);
  if (band) {
    // The galaxy: a band round a tilted great circle, thick in the middle.
    const a = hash(L, 32) * TAU;
    const w = (hash(L, 33) - 0.5) * 0.25 * hash(L, 34);
    dir = norm([Math.cos(a), w + Math.sin(a) * 0.35, Math.sin(a)]);
  }
  const twinkle = 0.85 + 0.15 * Math.sin(t * (0.5 + hash(L, 35)) + L);
  const bright = band ? 0.12 : 0.1 + 0.5 * hash(L, 36) ** 6;
  const hue: RGB = hash(L, 37) < 0.15 ? [1, 0.8, 0.6] : hash(L, 37) > 0.9 ? [0.7, 0.8, 1] : C.white;
  return { pos: add(eye, dir, STAR_SKY_R), rgb: scale(hue, bright * twinkle) };
}
/** Grain L of the dust round the eye, out in space: faint motes that slide past as you fly. */
export function spaceDust(L: number, eye: Vec3): Spot {
  const box = 90;
  const w = (v: number, e: number) => e + (frac((v - e) / box) - 0.5) * box;
  const p: Vec3 = [
    w(hash(L, 41) * 9000, eye[0]),
    w(hash(L, 42) * 9000, eye[1]),
    w(hash(L, 43) * 9000, eye[2]),
  ];
  const d = len(sub(p, eye));
  return { pos: p, rgb: scale(C.white, 0.1 * smooth((box / 2 - d) / 15)) };
}
