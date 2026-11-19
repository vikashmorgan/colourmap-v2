/**
 * Drive: the worlds, and what the Design panel chooses (docs/specs/drive-game.md): the vehicle in
 * each world, the ship's fire, the hull's finish and the weather; remembered on this device. Pure:
 * no three.js; storage is handed in, so it works (and tests) without it.
 */

import { blackbody, FLAME_PALETTES, type FlamePalette } from '@/lib/art/flame';
import type { VehicleKind } from '@/lib/art/vehicle';

export type WorldId = 'salt' | 'coast' | 'canyon' | 'night' | 'chinatown' | 'neon' | 'sky';

export const WORLDS: { id: WorldId; name: string; key: string }[] = [
  { id: 'salt', name: 'Salt Flat', key: '1' },
  { id: 'coast', name: 'Coast Road', key: '2' },
  { id: 'canyon', name: 'Canyon Race', key: '3' },
  { id: 'night', name: 'Night Rain', key: '4' },
  { id: 'chinatown', name: 'Chinatown Run', key: '5' },
  { id: 'neon', name: 'Neon District', key: '6' },
  { id: 'sky', name: 'Sky Canyon', key: '7' },
];

export function isWorld(id: string): id is WorldId {
  return WORLDS.some((w) => w.id === id);
}

/* ── Fire ──────────────────────────────────────────────────── */

export type Rgb = [number, number, number];
export type FireId = 'speed' | 'gas' | 'blaze' | 'whiteHot' | 'plasma';

/** A fire for the boosters: a flame tool palette, and its three colours from root to tip. */
export interface Fire {
  id: FireId;
  name: string;
  palette: FlamePalette;
  stops: [Rgb, Rgb, Rgb];
}

const lin = (c: Rgb): Rgb => [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2];
const bb = (k: number): Rgb => lin(blackbody(k));

/**
 * The fires. Speed fire is the ship's own: violet at the nozzle, blue, then an orange tongue. The
 * rest come from the flame tool's palettes (lib/art/flame.ts): the gas burner's blue, the blaze's
 * reds, the forge's white heat; green plasma is the odd one out.
 */
export const FIRES: Fire[] = [
  {
    id: 'speed',
    name: 'Speed fire',
    palette: { coreK: 3400, blue: 0.6, luminous: 0.5 },
    stops: [lin([0.72, 0.5, 1]), lin([0.25, 0.4, 1]), lin([1, 0.55, 0.2])],
  },
  {
    id: 'gas',
    name: 'Blue gas',
    palette: FLAME_PALETTES.gas,
    stops: [lin([0.7, 0.95, 1]), lin([0.2, 0.42, 1]), lin([0.1, 0.12, 0.6])],
  },
  {
    id: 'blaze',
    name: 'Blaze',
    palette: FLAME_PALETTES.blaze,
    stops: [
      bb(FLAME_PALETTES.blaze.coreK + 700),
      bb(FLAME_PALETTES.blaze.coreK),
      lin([0.8, 0.12, 0.04]),
    ],
  },
  {
    id: 'whiteHot',
    name: 'White-hot',
    palette: FLAME_PALETTES.whiteHot,
    stops: [lin([1, 1, 1]), bb(FLAME_PALETTES.whiteHot.coreK), bb(2400)],
  },
  {
    id: 'plasma',
    name: 'Green plasma',
    palette: { coreK: 3000, blue: 0.2, luminous: 0.3 },
    stops: [lin([0.85, 1, 0.85]), lin([0.2, 1, 0.45]), lin([0.05, 0.5, 0.6])],
  },
];

export function fireById(id: string): Fire {
  return FIRES.find((f) => f.id === id) ?? FIRES[0];
}

/* ── Hull ──────────────────────────────────────────────────── */

export type HullId = 'chrome' | 'rust' | 'red';

export interface Hull {
  id: HullId;
  name: string;
  /** sRGB base colour, metalness, roughness, clear coat. */
  colour: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  /** Rust's patina: how much the finish is broken up by a second, darker colour. */
  patina: number;
}

export const HULLS: Hull[] = [
  {
    id: 'chrome',
    name: 'Chrome',
    colour: '#e8eaef',
    metalness: 1,
    roughness: 0.06,
    clearcoat: 0,
    patina: 0,
  },
  {
    id: 'rust',
    name: 'Rust',
    colour: '#8a4a26',
    metalness: 0.55,
    roughness: 0.78,
    clearcoat: 0,
    patina: 1,
  },
  {
    id: 'red',
    name: 'Red',
    colour: '#a80c0c',
    metalness: 0.15,
    roughness: 0.32,
    clearcoat: 1,
    patina: 0,
  },
];

export function hullById(id: string): Hull {
  return HULLS.find((h) => h.id === id) ?? HULLS[2];
}

/* ── The design ────────────────────────────────────────────── */

export interface Design {
  fire: FireId;
  hull: HullId;
  weather: string;
  vehicle: Record<WorldId, VehicleKind>;
}

/** The red car on the salt, in the canyon and the night lanes; the hover ship on the coast and in the Neon District. */
export const DEFAULT_DESIGN: Design = {
  fire: 'speed',
  hull: 'red',
  weather: 'clear',
  vehicle: {
    salt: 'car',
    coast: 'ship',
    canyon: 'car',
    night: 'car',
    chinatown: 'car',
    neon: 'ship',
    sky: 'ship',
  },
};

const isVehicle = (v: unknown): v is VehicleKind => v === 'car' || v === 'ship';

/** A design from whatever was stored: anything unknown falls back to the default. */
export function parseDesign(raw: string | null, weathers: readonly string[]): Design {
  let o: Record<string, unknown> = {};
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === 'object') o = v as Record<string, unknown>;
  } catch {
    o = {};
  }
  const vehicle = { ...DEFAULT_DESIGN.vehicle };
  const stored = o.vehicle as Record<string, unknown> | undefined;
  if (stored && typeof stored === 'object') {
    for (const w of WORLDS)
      if (isVehicle(stored[w.id])) vehicle[w.id] = stored[w.id] as VehicleKind;
  }
  return {
    fire: FIRES.some((f) => f.id === o.fire) ? (o.fire as FireId) : DEFAULT_DESIGN.fire,
    hull: HULLS.some((h) => h.id === o.hull) ? (o.hull as HullId) : DEFAULT_DESIGN.hull,
    weather:
      typeof o.weather === 'string' && weathers.includes(o.weather)
        ? o.weather
        : DEFAULT_DESIGN.weather,
    vehicle,
  };
}

/** The bit of storage the game uses (localStorage in the browser). */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DESIGN_KEY = 'drive.design';

export function loadDesign(store: Store | null, weathers: readonly string[]): Design {
  try {
    return parseDesign(store?.getItem(DESIGN_KEY) ?? null, weathers);
  } catch {
    return parseDesign(null, weathers);
  }
}

export function saveDesign(store: Store | null, d: Design): void {
  try {
    store?.setItem(DESIGN_KEY, JSON.stringify(d));
  } catch {
    // Private windows and blocked storage: the choice just lasts this visit.
  }
}

/** Best times are kept per world and vehicle, so a ship's glide never beats a car's record. */
export function bestKey(world: WorldId, vehicle: VehicleKind): string {
  return `drive.best.${world}.${vehicle}`;
}

export function loadBest(store: Store | null, key: string): number | null {
  try {
    const v = Number.parseFloat(store?.getItem(key) ?? '');
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function saveBest(store: Store | null, key: string, time: number): void {
  try {
    store?.setItem(key, time.toFixed(3));
  } catch {
    // As above.
  }
}
