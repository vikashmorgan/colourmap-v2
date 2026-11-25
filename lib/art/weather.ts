/**
 * Drive: the weather (docs/specs/drive-game.md). Pure: no three.js, no DOM.
 *
 * Every world has the oncoming motes of the Coast Road piece (dust streaking out of the vanishing
 * point, longer and thicker with speed); the weather sets what they are and how much of them there
 * is, with the haze, the light and the sky that go with it. A change of weather blends over two
 * seconds, never a cut.
 */

import { clamp } from '@/lib/art/drive';
import type { WorldId } from '@/lib/art/drive-design';

export type Rgb = [number, number, number];

export type WeatherId = 'clear' | 'sand' | 'sandstorm' | 'devils' | 'rain' | 'snow' | 'snowstorm';

export interface Weather {
  id: WeatherId;
  name: string;
  /** The motes' colour (null: the world's own), and how many, how long and how wide. */
  mote: Rgb | null;
  density: number;
  length: number;
  width: number;
  /** Motes allowed below the horizon too (0: only round and above it, as in the piece). */
  below: number;
  /** Haze: its colour and density (per metre, exponential). */
  fog: Rgb;
  fogDensity: number;
  /** A wash of colour over everything, and how much. */
  tint: Rgb;
  tintAmount: number;
  /** Light and sun: 1 is the clear evening. */
  light: number;
  sun: number;
  /** How white the ground turns (snow) and how wet (rain). */
  snow: number;
  wet: number;
  /** Side gusts (m/s² at their strongest). */
  gust: number;
  /** More dust devils wander the flat. */
  devils: number;
}

const CLEAR: Weather = {
  id: 'clear',
  name: 'Clear',
  mote: null,
  density: 0.5,
  length: 1,
  width: 1,
  below: 0,
  fog: [0.9, 0.7, 0.6],
  fogDensity: 0,
  tint: [1, 1, 1],
  tintAmount: 0,
  light: 1,
  sun: 1,
  snow: 0,
  wet: 0,
  gust: 0,
  devils: 0,
};

export const WEATHERS: Weather[] = [
  CLEAR,
  {
    ...CLEAR,
    id: 'sand',
    name: 'Light sand',
    mote: [0.95, 0.75, 0.5],
    density: 0.75,
    length: 1.2,
    width: 1.2,
    below: 0.4,
    fog: [0.85, 0.62, 0.42],
    fogDensity: 0.00035,
    tint: [1, 0.85, 0.65],
    tintAmount: 0.08,
    light: 0.95,
    sun: 0.85,
    gust: 1.2,
  },
  {
    ...CLEAR,
    id: 'sandstorm',
    name: 'Sandstorm',
    mote: [0.85, 0.55, 0.3],
    density: 1,
    length: 1.6,
    width: 1.8,
    below: 1,
    fog: [0.62, 0.4, 0.24],
    fogDensity: 0.004,
    tint: [1, 0.7, 0.45],
    tintAmount: 0.3,
    light: 0.75,
    sun: 0.25,
    gust: 4,
  },
  {
    ...CLEAR,
    id: 'devils',
    name: 'Dust devils',
    mote: [0.95, 0.78, 0.6],
    density: 0.65,
    length: 1.1,
    width: 1.3,
    below: 0.3,
    fog: [0.85, 0.66, 0.5],
    fogDensity: 0.0002,
    tint: [1, 0.9, 0.75],
    tintAmount: 0.05,
    gust: 1.6,
    devils: 1,
  },
  {
    ...CLEAR,
    id: 'rain',
    name: 'Rain',
    mote: [0.62, 0.68, 0.8],
    density: 0.95,
    length: 2.4,
    width: 0.7,
    below: 0.7,
    fog: [0.2, 0.22, 0.3],
    fogDensity: 0.0012,
    tint: [0.7, 0.78, 0.95],
    tintAmount: 0.2,
    light: 0.7,
    sun: 0.3,
    wet: 1,
    gust: 0.8,
  },
  {
    ...CLEAR,
    id: 'snow',
    name: 'Light snow',
    mote: [0.95, 0.97, 1],
    density: 0.7,
    length: 0.45,
    width: 2,
    below: 0.8,
    fog: [0.78, 0.8, 0.88],
    fogDensity: 0.0006,
    tint: [0.85, 0.9, 1],
    tintAmount: 0.12,
    light: 0.92,
    sun: 0.7,
    snow: 0.45,
    gust: 0.6,
  },
  {
    ...CLEAR,
    id: 'snowstorm',
    name: 'Snowstorm',
    mote: [0.97, 0.98, 1],
    density: 1,
    length: 0.7,
    width: 2.8,
    below: 1,
    fog: [0.72, 0.75, 0.84],
    fogDensity: 0.0045,
    tint: [0.82, 0.88, 1],
    tintAmount: 0.3,
    light: 0.8,
    sun: 0.2,
    snow: 1,
    gust: 3,
  },
];

export function weatherById(id: string): Weather {
  return WEATHERS.find((w) => w.id === id) ?? CLEAR;
}

/** Each world's own motes in clear weather: salt-white, warm coast dust, red grit, cool rain. */
export const WORLD_MOTES: Record<WorldId, Rgb> = {
  salt: [1, 0.96, 0.94],
  mars: [0.95, 0.56, 0.36],
  gold: [1, 0.82, 0.45],
  coast: [1, 0.95, 0.92],
  canyon: [0.78, 0.42, 0.26],
  night: [0.6, 0.65, 0.75],
  chinatown: [1, 0.7, 0.55],
  neon: [0.75, 0.6, 1],
  sky: [0.85, 0.5, 0.32],
  symphony: [1, 0.85, 0.5],
  water: [0.55, 0.8, 0.9],
};

export function moteColour(w: Weather, world: WorldId): Rgb {
  return w.mote ?? WORLD_MOTES[world];
}

const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mixRgb = (a: Rgb, b: Rgb, k: number): Rgb => [
  mix(a[0], b[0], k),
  mix(a[1], b[1], k),
  mix(a[2], b[2], k),
];

/** The weather part way (k, 0..1) from a to b; the motes' colour blends too, a world's own included. */
export function blendWeather(a: Weather, b: Weather, k: number, world: WorldId): Weather {
  const t = clamp(k, 0, 1);
  const num = (key: keyof Weather) => mix(a[key] as number, b[key] as number, t);
  return {
    id: t < 0.5 ? a.id : b.id,
    name: t < 0.5 ? a.name : b.name,
    mote: mixRgb(moteColour(a, world), moteColour(b, world), t),
    density: num('density'),
    length: num('length'),
    width: num('width'),
    below: num('below'),
    fog: mixRgb(a.fog, b.fog, t),
    fogDensity: num('fogDensity'),
    tint: mixRgb(a.tint, b.tint, t),
    tintAmount: num('tintAmount'),
    light: num('light'),
    sun: num('sun'),
    snow: num('snow'),
    wet: num('wet'),
    gust: num('gust'),
    devils: num('devils'),
  };
}

/** Seconds a change of weather takes. */
export const WEATHER_BLEND = 2;

export interface WeatherState {
  from: Weather;
  to: Weather;
  /** 0..1 through the change. */
  k: number;
}

export function newWeather(id: string): WeatherState {
  const w = weatherById(id);
  return { from: w, to: w, k: 1 };
}

/** Asks for a new weather: it blends from wherever the last change had got to. */
export function setWeather(s: WeatherState, id: string, world: WorldId): WeatherState {
  const to = weatherById(id);
  if (to.id === s.to.id) return s;
  return { from: blendWeather(s.from, s.to, s.k, world), to, k: 0 };
}

export function stepWeather(s: WeatherState, dt: number): WeatherState {
  if (s.k >= 1) return s;
  return { ...s, k: Math.min(1, s.k + dt / WEATHER_BLEND) };
}

/**
 * Worlds whose sky stays dark in every weather (2026-11-21, the Golden Track: "weathers bring too
 * much light. i want the snow or sand but keeping dark sky"). The motes fall as bright as anywhere;
 * the haze keeps its hue but turns night-dark, the wash barely shows, the ground whitens only a little.
 */
export const DARK_SKY: readonly WorldId[] = ['gold', 'symphony'];
export const DARK_FOG = 0.06;
export const DARK_TINT = 0.2;
export const DARK_SNOW = 0.3;

export function keepDark(w: Weather): Weather {
  return {
    ...w,
    fog: [w.fog[0] * DARK_FOG, w.fog[1] * DARK_FOG, w.fog[2] * DARK_FOG],
    tintAmount: w.tintAmount * DARK_TINT,
    snow: w.snow * DARK_SNOW,
  };
}

/** The weather now, eased (smoothstep) through the change. */
export function weatherNow(s: WeatherState, world: WorldId): Weather {
  const e = s.k * s.k * (3 - 2 * s.k);
  const w = blendWeather(s.from, s.to, e, world);
  return DARK_SKY.includes(world) ? keepDark(w) : w;
}

/** The side gust now (m/s²): slow swells, never a jolt. */
export function gustAt(w: Weather, t: number): number {
  return (
    w.gust * (0.6 * Math.sin(t * 0.43) + 0.3 * Math.sin(t * 1.13 + 1.7) + 0.1 * Math.sin(t * 2.9))
  );
}

/** How many motes, for the shader: the density, more with speed (n, 0..1.5) and the boost. */
export function moteAmount(w: Weather, speedN: number, boost: number): number {
  return clamp(w.density * (0.15 + 0.35 * speedN * (1 + 0.25 * boost)) + w.below * 0.25, 0, 1.15);
}
