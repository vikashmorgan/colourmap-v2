/*
 * Fire (docs/specs/geometry-field.md, "Fire", 2026-11-16): the five fire pieces of the Art
 * builder's Experiment tab, from a struck match to a wildfire. No three.js, no DOM.
 *
 * Each piece is a list of flames from the flame tool (lib/art/flame.ts) plus embers, smoke, the
 * light the fire throws on its surroundings, and a little scene state (the match's life). The
 * shader (lib/art/fire-shaders.ts) draws the surroundings and calls the tool.
 *
 * Screen units: the view is 1 high, y up, the centre at 0. Every piece fits ±0.6 across; on a
 * narrower screen the view zooms out (`fitOf`).
 */

import {
  clamp,
  type Embers,
  FLAME_PALETTES,
  type Flame,
  flame,
  flicker,
  NO_EMBERS,
  NO_SMOKE,
  type Smoke,
} from './flame';

export type FireScene = { slug: string; title: string; line: string };

/** The five pieces, by Scene slider index, small to big. */
export const FIRE_SCENES: FireScene[] = [
  {
    slug: 'match',
    title: 'Match',
    line: 'A match struck in still air: a flare, then a small teardrop flame, blue at the root',
  },
  {
    slug: 'candle',
    title: 'Candle',
    line: 'A calm candle flame with a blue root and a white-hot core, swaying in a soft halo',
  },
  {
    slug: 'gas-ring',
    title: 'Gas Ring',
    line: 'A ring of crisp blue gas flames with cyan cones, roaring steadily',
  },
  {
    slug: 'campfire',
    title: 'Campfire',
    line: 'Tongues of flame weaving between logs, embers rising, smoke drifting above',
  },
  {
    slug: 'wildfire',
    title: 'Wildfire',
    line: 'A wall of tall flames through burning trees, sparks streaming up, the air shimmering',
  },
];

/** The builder's sliders, read as the fire's controls. */
export interface FireControls {
  /** Turbulence multiplier, ~0.3–1.7 (1 = as designed). */
  turbulence: number;
  /** Wind, -1..1 (negative blows left). */
  wind: number;
  /** Heat, ~0.75–1.25 (1 = as designed): hotter is whiter, brighter and cleaner. */
  heat: number;
  /** Embers multiplier, 0–2. */
  embers: number;
}

export const DEFAULT_CONTROLS: FireControls = { turbulence: 1, wind: 0, heat: 1, embers: 1 };

/** Turns the builder's slider values into fire controls. */
export function controlsOf(cfg: {
  complexity: number;
  symmetry: number;
  intensity: number;
  glow: number;
}): FireControls {
  return {
    turbulence: 0.3 + 1.4 * clamp((cfg.complexity - 1) / 9, 0, 1),
    wind: clamp(cfg.symmetry / 3, -1, 1),
    heat: 0.75 + 0.05 * clamp(cfg.intensity, 0, 10),
    embers: clamp(cfg.glow / 5, 0, 2),
  };
}

/** How much the view zooms out so a piece ±0.6 wide fits a narrow screen. */
export function fitOf(aspect: number): number {
  return clamp(aspect / 1.25, 0.35, 1);
}

/* ── The match's life ──────────────────────────────────────── */

export const MATCH_CYCLE = 20;

export interface MatchState {
  /** The stick's opacity: a new match fades in, the spent one fades out. */
  alpha: number;
  /** Strike swipe, 0 (start of the swipe) to 1 (struck). */
  swipe: number;
  /** Flame size, 0–~1.9 (it flares on the strike, then settles). */
  size: number;
  /** The strike's flare, 1 on the strike decaying to 0. */
  flare: number;
  /** The burst of sparks on the strike. */
  burst: number;
  /** How far the stick has charred, 0–1. */
  char: number;
  /** Smoke: a thin curl while it burns, a fuller one when it goes out. */
  smoke: number;
  /** The head's ember glow after the flame dies. */
  glow: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Where the match is in its 20 s life: swipe, strike, burn, go out, smoke, fade, next. */
export function matchState(t: number): MatchState {
  const s = ((t % MATCH_CYCLE) + MATCH_CYCLE) % MATCH_CYCLE;
  const after = Math.max(0, s - 1);
  const lit = s >= 1;
  const ign = smooth(1, 1.12, s);
  const out = 1 - smooth(15.5, 16.6, s);
  const flare = lit ? Math.exp(-after / 0.5) : 0;
  return {
    alpha: smooth(0, 0.6, s) * (1 - smooth(19.2, 20, s)),
    swipe: smooth(0.55, 1, s),
    size: ign * out * (1 + 0.9 * flare),
    flare,
    burst: lit ? Math.exp(-after / 0.18) : 0,
    char: clamp((s - 1.5) / 14, 0, 1),
    smoke: 0.3 * ign * out + smooth(15.8, 16.4, s) * (1 - smooth(17.5, 19.5, s)),
    glow: smooth(15.6, 16.2, s) * (1 - smooth(16.2, 18.5, s)),
  };
}

/** The match's head when struck; the stick runs down-left from it. */
export const MATCH_HEAD = { x: 0.04, y: -0.1 };

/* ── The frame ─────────────────────────────────────────────── */

export interface FireLight {
  x: number;
  y: number;
  intensity: number;
  radius: number;
  /** Linear RGB. */
  colour: [number, number, number];
}

export interface FireFrame {
  flames: Flame[];
  embers: Embers;
  smoke: Smoke;
  light: FireLight;
  /** Heat shimmer strength above the fire, screen units. */
  shimmer: number;
  /** Scene state for the shader: (offset x, offset y, char, alpha) and (glow, flare, 0, 0). */
  obj: [number, number, number, number];
  obj2: [number, number, number, number];
}

function lin(c: [number, number, number]): [number, number, number] {
  return [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2];
}

/** Everything the shader needs for one frame of a piece at time t (seconds). */
export function fireFrame(
  scene: number,
  t: number,
  c: FireControls = DEFAULT_CONTROLS,
  aspect = 16 / 9,
): FireFrame {
  const halfW = (0.5 * aspect) / fitOf(aspect);
  const base: FireFrame = {
    flames: [],
    embers: { ...NO_EMBERS },
    smoke: { ...NO_SMOKE },
    light: { x: 0, y: 0, intensity: 0, radius: 0.3, colour: [1, 0.5, 0.15] },
    shimmer: 0,
    obj: [0, 0, 0, 1],
    obj2: [0, 0, 0, 0],
  };
  // Hotter burns cleaner: less soot, less smoke.
  const smokeMul = clamp(2 - c.heat, 0.4, 1.4);
  const bright = 0.5 + 0.5 * c.heat;
  switch (Math.round(clamp(scene, 0, FIRE_SCENES.length - 1))) {
    case 0:
      return matchFrame(base, t, c, smokeMul, bright);
    case 1:
      return candleFrame(base, t, c, smokeMul, bright);
    case 2:
      return gasFrame(base, t, c, bright);
    case 3:
      return campfireFrame(base, t, c, smokeMul, bright);
    default:
      return wildfireFrame(base, t, c, smokeMul, bright, halfW);
  }
}

function matchFrame(f: FireFrame, t: number, c: FireControls, smokeMul: number, bright: number) {
  const m = matchState(t);
  const ox = -0.09 * (1 - m.swipe);
  const oy = -0.03 * (1 - m.swipe);
  const hx = MATCH_HEAD.x + ox;
  const hy = MATCH_HEAD.y + oy;
  const fl = flicker(t, 3, 5);
  const size = m.size * (1 + 0.05 * fl);
  const h = 0.17 * size;
  const P = FLAME_PALETTES.match;
  if (size > 0.01) {
    f.flames.push(
      flame({
        x: hx + 0.004,
        y: hy - 0.012,
        width: 0.068 * (0.6 + 0.4 * size),
        height: h,
        turbulence: (0.22 + 0.35 * m.flare) * c.turbulence,
        rise: 2.6,
        lean: 0.05 * flicker(t, 7, 0.6) + 0.25 * c.wind,
        seed: 1.3,
        coreK: (P.coreK + 500 * m.flare) * c.heat,
        blue: P.blue * (1 - 0.6 * m.flare),
        luminous: P.luminous,
        brightness: bright * (1 + 0.5 * m.flare) * (1 + 0.04 * fl),
        halo: 0.7 + 0.5 * m.flare,
      }),
    );
  }
  f.embers = {
    x0: hx - 0.015,
    x1: hx + 0.015,
    y0: hy - 0.01,
    height: 0.16,
    density: clamp(m.burst * 0.9 * c.embers, 0, 1),
    size: 0.0016,
    wind: 0.3 * c.wind,
    rise: 0.28,
    hotK: 3000,
  };
  f.smoke = {
    x: hx,
    y: hy + h * 0.75,
    width: 0.035,
    height: 0.38,
    amount: clamp(m.smoke * smokeMul, 0, 1.4),
    wind: 0.15 + 0.4 * c.wind,
    rise: 0.13,
    curl: 1,
  };
  f.light = {
    x: hx,
    y: hy + 0.05,
    intensity: (size * 0.55 + m.glow * 0.06) * bright * (1 + 0.04 * fl),
    radius: 0.16,
    colour: lin([1, 0.62, 0.28]),
  };
  f.obj = [ox, oy, m.char, m.alpha];
  f.obj2 = [m.glow, m.flare, 0, 0];
  return f;
}

/** The candle's wick tip; the wax top is just below. */
export const CANDLE_WICK = { x: 0, y: -0.075 };

function candleFrame(f: FireFrame, t: number, c: FireControls, smokeMul: number, bright: number) {
  const fl = flicker(t, 11, 1.6);
  const sway = 0.06 * flicker(t, 2, 0.35) + 0.25 * c.wind;
  const P = FLAME_PALETTES.candle;
  f.flames.push(
    flame({
      x: CANDLE_WICK.x,
      y: CANDLE_WICK.y - 0.012,
      width: 0.068,
      height: 0.25 * (1 + 0.03 * fl),
      turbulence: 0.12 * c.turbulence,
      rise: 1.5,
      lean: sway,
      seed: 4.2,
      coreK: P.coreK * c.heat,
      blue: P.blue,
      luminous: P.luminous,
      brightness: bright * (1 + 0.03 * fl),
      halo: 1.1,
    }),
  );
  f.smoke = {
    x: CANDLE_WICK.x + sway * 0.25,
    y: CANDLE_WICK.y + 0.24,
    width: 0.03,
    height: 0.3,
    amount: clamp(0.12 * smokeMul * c.turbulence, 0, 1),
    wind: 0.1 + 0.4 * c.wind,
    rise: 0.1,
    curl: 0.8,
  };
  f.light = {
    x: CANDLE_WICK.x + sway * 0.25,
    y: CANDLE_WICK.y + 0.1,
    intensity: 0.75 * bright * (1 + 0.03 * fl),
    radius: 0.22,
    colour: lin([1, 0.68, 0.36]),
  };
  return f;
}

/** The gas burner: centre and the ring's radii on screen (a ring seen from above at an angle). */
export const GAS_RING = { x: 0, y: -0.12, rx: 0.3, ry: 0.085, n: 18 };

function gasFrame(f: FireFrame, t: number, c: FireControls, bright: number) {
  const P = FLAME_PALETTES.gas;
  const roar = flicker(t, 21, 10);
  for (let i = 0; i < GAS_RING.n; i++) {
    const a = (i / GAS_RING.n) * Math.PI * 2 + 0.09;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // Nearer flames (lower on screen) are a little bigger.
    const k = 1 - 0.18 * sa;
    const own = flicker(t, i * 1.7, 9);
    f.flames.push(
      flame({
        x: GAS_RING.x + GAS_RING.rx * ca,
        y: GAS_RING.y + GAS_RING.ry * sa,
        width: 0.036 * k,
        height: 0.1 * k * (1 + 0.06 * own + 0.03 * roar),
        turbulence: 0.32 * c.turbulence,
        rise: 3.4,
        lean: 0.32 * ca + 0.3 * c.wind,
        seed: i * 2.31,
        coreK: P.coreK * c.heat,
        blue: P.blue,
        // A hotter setting burns cleaner; a cooler one shows a little yellow at the tips.
        luminous: P.luminous + 0.25 * clamp(1 - c.heat, 0, 0.25) * 4,
        brightness: bright * 1.3 * (1 + 0.04 * own),
        layer: sa > 0 ? 0 : 1,
        halo: 0,
      }),
    );
  }
  f.light = {
    x: GAS_RING.x,
    y: GAS_RING.y + 0.03,
    intensity: 0.6 * bright * (1 + 0.02 * roar),
    radius: 0.32,
    colour: [0.1, 0.3, 1],
  };
  return f;
}

/** The fire's centre in the Campfire: the logs cross here. */
export const CAMPFIRE = { x: 0, y: -0.26 };

const TONGUES = [
  { dx: -0.13, h: 0.22, w: 0.1 },
  { dx: -0.075, h: 0.34, w: 0.12 },
  { dx: -0.02, h: 0.46, w: 0.13 },
  { dx: 0.035, h: 0.4, w: 0.13 },
  { dx: 0.09, h: 0.3, w: 0.11 },
  { dx: 0.14, h: 0.2, w: 0.09 },
];

function campfireFrame(f: FireFrame, t: number, c: FireControls, smokeMul: number, bright: number) {
  const P = FLAME_PALETTES.wood;
  const lean = 0.04 + 0.35 * c.wind;
  f.flames.push(
    flame({
      x: CAMPFIRE.x,
      y: CAMPFIRE.y - 0.01,
      width: 0.38,
      height: 0.13,
      turbulence: 0.7 * c.turbulence,
      rise: 1.4,
      lean: lean * 0.5,
      seed: 0.7,
      coreK: (P.coreK - 150) * c.heat,
      blue: P.blue,
      luminous: P.luminous,
      brightness: bright * 0.7,
      shape: 'wall',
      tongues: 7,
      layer: 0,
      halo: 0,
    }),
  );
  let total = 0;
  TONGUES.forEach((g, i) => {
    const fl = flicker(t, 5 + i * 3.1, 2.2);
    const s = 1 + 0.2 * fl;
    total += s;
    f.flames.push(
      flame({
        x: CAMPFIRE.x + g.dx + 0.01 * flicker(t, i, 0.7),
        y: CAMPFIRE.y + 0.005 - 0.01 * (i % 2),
        width: g.w,
        height: g.h * s,
        turbulence: 1.1 * c.turbulence,
        rise: 1.25,
        lean: lean + 0.06 * flicker(t, 30 + i, 0.4),
        seed: 3.3 + i * 1.91,
        coreK: P.coreK * c.heat,
        blue: P.blue,
        luminous: P.luminous,
        brightness: bright * (0.6 + 0.1 * fl),
        layer: 0,
        halo: 0,
      }),
    );
  });
  f.embers = {
    x0: CAMPFIRE.x - 0.13,
    x1: CAMPFIRE.x + 0.13,
    y0: CAMPFIRE.y + 0.05,
    height: 0.62,
    density: clamp(0.04 * c.embers, 0, 1),
    size: 0.0021,
    wind: 0.12 + 0.5 * c.wind,
    rise: 0.13,
    hotK: 2500,
  };
  f.smoke = {
    x: CAMPFIRE.x + 0.02,
    y: CAMPFIRE.y + 0.33,
    width: 0.26,
    height: 0.62,
    amount: clamp(0.55 * smokeMul, 0, 1.4),
    wind: 0.1 + 0.6 * c.wind,
    rise: 0.07,
    curl: 0.35,
  };
  f.light = {
    x: CAMPFIRE.x,
    y: CAMPFIRE.y + 0.12,
    intensity: 0.9 * bright * (total / TONGUES.length),
    radius: 0.36,
    colour: lin([1, 0.55, 0.22]),
  };
  f.shimmer = 0.0018 * c.turbulence;
  return f;
}

/** Where the Wildfire's walls stand: the far one and the near one. */
export const WILDFIRE = { backY: -0.12, frontY: -0.3 };

function wildfireFrame(
  f: FireFrame,
  t: number,
  c: FireControls,
  smokeMul: number,
  bright: number,
  halfW: number,
) {
  const P = FLAME_PALETTES.blaze;
  const lean = 0.1 + 0.4 * c.wind;
  const width = 2 * halfW + 0.3;
  const surge = flicker(t, 41, 0.5);
  f.flames.push(
    flame({
      x: 0,
      y: WILDFIRE.backY,
      width,
      height: 0.55 * (1 + 0.08 * surge),
      turbulence: 1.15 * c.turbulence,
      rise: 0.7,
      lean,
      seed: 2.2,
      coreK: (P.coreK - 150) * c.heat,
      blue: 0,
      luminous: 1,
      brightness: bright * 0.5,
      shape: 'wall',
      tongues: 5 * width,
      layer: 0,
      halo: 0,
    }),
  );
  // Tall tongues in the far wall: the yellow cores.
  const far = 5;
  for (let i = 0; i < far; i++) {
    const u = (i + 0.5) / far;
    const fl = flicker(t, 50 + i * 2.7, 1.3);
    f.flames.push(
      flame({
        x: -halfW + 2 * halfW * u + 0.05 * Math.sin(i * 2.1),
        y: WILDFIRE.backY - 0.02,
        width: 0.28,
        height: (0.52 + 0.12 * Math.sin(i * 3.7)) * (1 + 0.15 * fl),
        turbulence: 1.2 * c.turbulence,
        rise: 0.8,
        lean,
        seed: 9 + i * 1.37,
        coreK: P.coreK * c.heat,
        blue: 0,
        luminous: 1,
        brightness: bright * (0.55 + 0.1 * fl),
        layer: 0,
        halo: 0,
      }),
    );
  }
  f.flames.push(
    flame({
      x: 0,
      y: WILDFIRE.frontY,
      width,
      height: 0.42 * (1 + 0.06 * surge),
      turbulence: 1 * c.turbulence,
      rise: 0.9,
      lean,
      seed: 6.6,
      coreK: (P.coreK + 100) * c.heat,
      blue: 0,
      luminous: 1,
      brightness: bright * 0.65,
      shape: 'wall',
      tongues: 6 * width,
      layer: 1,
      halo: 0,
    }),
  );
  const near = 4;
  for (let i = 0; i < near; i++) {
    const u = (i + 0.5) / near;
    const fl = flicker(t, 70 + i * 1.9, 1.6);
    f.flames.push(
      flame({
        x: -halfW + 2 * halfW * u + 0.08 * Math.cos(i * 1.7),
        y: WILDFIRE.frontY - 0.02,
        width: 0.26,
        height: (0.36 + 0.08 * Math.cos(i * 2.9)) * (1 + 0.15 * fl),
        turbulence: 1.1 * c.turbulence,
        rise: 1,
        lean,
        seed: 20 + i * 2.03,
        coreK: (P.coreK + 200) * c.heat,
        blue: 0,
        luminous: 1,
        brightness: bright * (0.6 + 0.1 * fl),
        layer: 1,
        halo: 0,
      }),
    );
  }
  f.embers = {
    x0: -halfW,
    x1: halfW,
    y0: WILDFIRE.frontY + 0.05,
    height: 0.9,
    density: clamp(0.035 * c.embers, 0, 1),
    size: 0.0024,
    wind: 0.35 + 0.6 * c.wind,
    rise: 0.24,
    hotK: 2600,
  };
  f.smoke = {
    x: 0.1,
    y: 0.12,
    width: 2.6 * halfW,
    height: 0.9,
    amount: clamp(0.75 * smokeMul, 0, 1.4),
    wind: 0.2 + 0.5 * c.wind,
    rise: 0.035,
    curl: 0.2,
  };
  f.light = {
    x: 0,
    y: WILDFIRE.backY + 0.05,
    intensity: 1.1 * bright * (1 + 0.06 * surge),
    radius: 0.6,
    colour: lin([1, 0.45, 0.15]),
  };
  f.shimmer = 0.004 * c.turbulence;
  return f;
}
