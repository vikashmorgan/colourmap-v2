/*
 * Roofs and windows of the City of Dreams' plain buildings (docs/specs/art-city.md, "Game
 * design"). From above, every roof glows: its edge lit all round, lamps on it, a red light on the
 * tall ones, and a soft haze of light rising off it, so the city shines up at you instead of
 * showing black roofs. And some buildings wear readable windows: a grid of lit panes (most warm,
 * some dark, a few slowly switching on or off over minutes, never a flicker), ribbon windows in
 * bands, tall arched windows on the temples' streets, round ones under the domes.
 *
 * 2026-11-13: "make sure there are stars above the city and city shines a light from above etc...
 * not just black roofs." / "think about windows for some of the buildings."
 *
 * Pure: no three.js, no DOM.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import {
  beat,
  boxDist,
  C,
  clamp,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  scale,
} from './city-grid';

/** What a roof or a facade needs of a tower. */
export type Roofed = { x: number; z: number; hx: number; hz: number; h: number; k: number };
export type Facade = 'grid' | 'bands' | 'arched' | 'round';

/** Each quarter's windows, when a building of it wears them (none: the city's own window grid). */
export const FACADES: Record<string, Facade> = {
  indian: 'arched',
  temples: 'arched',
  egypt: 'arched',
  oriental: 'round',
  domes: 'round',
  golden: 'grid',
  canals: 'grid',
  industrial: 'grid',
  heights: 'bands',
  market: 'bands',
};
/** How many of a quarter's plain buildings wear them. */
export const FACADE_SHARE = 0.45;

/* ---------- windows, on and off over minutes ---------- */

/**
 * How lit window `key` is at time t, 0..1. Most keep their state all night (about six in ten
 * lit); one in six switches on or off now and then, every two to five minutes, easing over six
 * seconds: a room waking or going to sleep, never a flicker.
 */
export function windowOn(key: number, t: number): number {
  if (hash(key, 31) > 0.17) return hash(key, 32) < 0.6 ? 1 : 0;
  const P = 120 + 180 * hash(key, 33);
  const x = t / P + hash(key, 34);
  const n = Math.floor(x);
  const on = (m: number) => (hash(key * 131 + m, 36) < 0.55 ? 1 : 0);
  return lerp(on(n - 1), on(n), smooth(((x - n) * P) / 6));
}

/** A facade's windows: across every `gx`, up every `gy`, each `per` grains. */
const STYLE: Record<Facade, { gx: number; gy: number; per: number }> = {
  grid: { gx: 2.4, gy: 3.2, per: 6 },
  bands: { gx: 0.45, gy: 3.2, per: 2 },
  arched: { gx: 3, gy: 4.4, per: 11 },
  round: { gx: 2.6, gy: 3.4, per: 8 },
};

/** The face's outward normal and the way along it (faces 0..3: -z, +x, +z, -x, as lib/city.ts). */
const N: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Where a grain of a window falls, relative to the window's middle (across, up), and how bright. */
function pane(f: Facade, q: number): [number, number] {
  switch (f) {
    case 'grid':
      return [q & 1 ? 0.35 : -0.35, (Math.floor(q / 2) - 1) * 0.55];
    case 'bands':
      return [0, q * 0.45];
    case 'arched': {
      if (q < 6) return [q & 1 ? 0.45 : -0.45, -0.9 + Math.floor(q / 2) * 0.7];
      const a = ((q - 6) / 4) * Math.PI;
      return [Math.cos(a) * 0.45, 0.5 + Math.sin(a) * 0.45];
    }
    default: {
      const a = (q / 8) * Math.PI * 2;
      return [Math.cos(a) * 0.5, Math.sin(a) * 0.5];
    }
  }
}

/**
 * The windows on face `face` of tower tw, if the eye is in front of it: an item for the Ship's
 * renderer, or none. `tint`: the quarter's colour, mixed into the cooler panes.
 */
export function facadeItem(
  tw: Roofed,
  face: number,
  style: Facade,
  tint: RGB,
  eye: Vec3,
  t: number,
): Item | null {
  const [nx, nz] = N[face] as [number, number];
  const w = face % 2 ? tw.hz : tw.hx;
  const cx = tw.x + nx * tw.hx;
  const cz = tw.z + nz * tw.hz;
  if ((eye[0] - cx) * nx + (eye[2] - cz) * nz <= 0.5) return null;
  const S = STYLE[style];
  const cols = Math.max(1, Math.floor((2 * w - 1.6) / S.gx));
  const rows = Math.max(1, Math.floor((tw.h - 3) / S.gy));
  if (rows < 2) return null;
  // Along the face: (-nz, nx) is the way across it.
  const ax = -nz;
  const az = nx;
  const x0 = -((cols - 1) * S.gx) / 2;
  const lo: Vec3 = [Math.min(cx - ax * w, cx + ax * w), GROUND, Math.min(cz - az * w, cz + az * w)];
  const hi: Vec3 = [
    Math.max(cx - ax * w, cx + ax * w),
    GROUND + tw.h,
    Math.max(cz - az * w, cz + az * w),
  ];
  const out = 0.1;
  return {
    d: boxDist(eye, lo, hi),
    gid: mixId(tw.k, 7700 + face),
    count: cols * rows * S.per,
    weight: style === 'bands' ? 1.1 : 1.5,
    probe: [
      [cx + nx * 0.3, GROUND + tw.h * 0.5, cz + nz * 0.3],
      [cx + nx * 0.3 + ax * w * 0.8, GROUND + 3, cz + nz * 0.3 + az * w * 0.8],
      [cx + nx * 0.3 - ax * w * 0.8, GROUND + tw.h - 2, cz + nz * 0.3 - az * w * 0.8],
    ],
    site: (s, o) => {
      const win = Math.floor(s / S.per);
      const q = s % S.per;
      const col = win % cols;
      const row = Math.floor(win / cols);
      // Ribbon windows: a few metres of the band share one room's light.
      const key =
        style === 'bands'
          ? tw.k * 977 + face * 131 + row * 37 + Math.floor((col * S.gx) / 3)
          : tw.k * 977 + face * 131 + row * 37 + col;
      const lit = windowOn(key, t);
      if (lit < 0.04) return false;
      const [du, dv] = pane(style, q);
      const u = x0 + col * S.gx + du;
      const y = GROUND + 2.6 + row * S.gy + dv;
      o[0] = cx + ax * u + nx * out;
      o[1] = y;
      o[2] = cz + az * u + nz * out;
      const cool = hash(key, 19) > 0.72;
      const rgb =
        style === 'arched'
          ? mix(C.warm, C.marigold, 0.4)
          : cool
            ? mix(C.white, tint, 0.35)
            : style === 'round'
              ? mix(C.warm, tint, 0.2)
              : C.warm;
      [o[3], o[4], o[5]] = scale(rgb, (style === 'bands' ? 0.36 : 0.44) * lit);
      return true;
    },
  };
}

/* ---------- roofs, from above ---------- */

const EDGE_GAP = 0.7;
const LAMPS = 9;
const HAZE = 18;

/**
 * A plain building's roof, for an eye above it: its edge lit all round in its quarter's colour,
 * nine lamps on it, a red light breathing slowly on the tall ones, and a haze of soft light rising
 * off it and fading, so the city glows from above.
 */
export function roofItem(tw: Roofed, colour: RGB, eye: Vec3, t: number): Item | null {
  const top = GROUND + tw.h;
  if (eye[1] < top - 3) return null;
  const P = 2 * (tw.hx + tw.hz);
  const edge = Math.ceil((2 * P) / EDGE_GAP);
  const beacon = tw.h > 40 ? 3 : 0;
  const rim = scale(mix(colour, C.white, 0.3), 0.42);
  return {
    d: boxDist(eye, [tw.x - tw.hx, top, tw.z - tw.hz], [tw.x + tw.hx, top + 10, tw.z + tw.hz]),
    gid: mixId(tw.k, 8800),
    count: edge + LAMPS + beacon + HAZE,
    weight: 1.6,
    probe: [
      [tw.x, top + 0.5, tw.z],
      [tw.x + tw.hx, top + 0.3, tw.z + tw.hz],
      [tw.x - tw.hx, top + 0.3, tw.z - tw.hz],
    ],
    site: (s, o) => {
      if (s < edge) {
        const e = ((s + 0.5) / edge) * 2 * P;
        const m = e % P;
        let x: number;
        let z: number;
        if (m < 2 * tw.hx) [x, z] = [-tw.hx + m, e < P ? -tw.hz : tw.hz];
        else [x, z] = [e < P ? tw.hx : -tw.hx, -tw.hz + (m - 2 * tw.hx)];
        o[0] = tw.x + x;
        o[1] = top + 0.05;
        o[2] = tw.z + z;
        [o[3], o[4], o[5]] = rim;
        return true;
      }
      s -= edge;
      if (s < LAMPS) {
        o[0] = tw.x + ((s % 3) - 1) * tw.hx * 0.55;
        o[1] = top + 0.3;
        o[2] = tw.z + (Math.floor(s / 3) - 1) * tw.hz * 0.55;
        const g = 0.85 + 0.15 * Math.sin(t * 0.3 + s + tw.k);
        [o[3], o[4], o[5]] = scale(
          hash(tw.k, s + 40) < 0.7 ? C.warm : mix(C.white, colour, 0.4),
          0.4 * g,
        );
        return true;
      }
      s -= LAMPS;
      if (s < beacon) {
        o[0] = tw.x;
        o[1] = top + 2.4 + s * 0.25;
        o[2] = tw.z;
        [o[3], o[4], o[5]] = scale(C.red, 0.3 + 0.35 * beat(t, 1 / 2, tw.k * 0.01));
        return true;
      }
      s -= beacon;
      // The haze: soft motes rising slowly off the roof and fading, each on its own cycle.
      const j = s;
      const ph = frac(t / (16 + 8 * hash(tw.k, j + 60)) + hash(tw.k, j + 61));
      o[0] = tw.x + (hash(tw.k, j + 62) - 0.5) * 1.6 * tw.hx;
      o[1] = top + 0.8 + 11 * ph;
      o[2] = tw.z + (hash(tw.k, j + 63) - 0.5) * 1.6 * tw.hz;
      const k = 0.16 * Math.sin(Math.PI * clamp(ph, 0, 1));
      [o[3], o[4], o[5]] = scale(mix(colour, C.warm, 0.5), k);
      return true;
    },
  };
}
