/**
 * Drive: the worlds, and what the Design panel chooses (docs/specs/drive-game.md): the vehicle in
 * each world, the ship's fire, the hull's finish and the weather; remembered on this device. Pure:
 * no three.js; storage is handed in, so it works (and tests) without it.
 */

import { blackbody, FLAME_PALETTES, type FlamePalette } from '@/lib/art/flame';
import type { VehicleKind } from '@/lib/art/vehicle';

export type WorldId =
  | 'salt'
  | 'coast'
  | 'canyon'
  | 'night'
  | 'chinatown'
  | 'neon'
  | 'sky'
  | 'mars'
  | 'gold'
  | 'water';

/** The worlds in the menus' order, best first (2026-11-22: "golden track on top of the menus. so
 * we have an order from best tracks to least cool"); the number keys follow this order. */
export const WORLDS: { id: WorldId; name: string; key: string }[] = [
  { id: 'gold', name: 'Golden Track', key: '1' },
  { id: 'neon', name: 'Neon District', key: '2' },
  { id: 'canyon', name: 'Canyon Race', key: '3' },
  { id: 'sky', name: 'Sky Canyon', key: '4' },
  { id: 'chinatown', name: 'Chinatown Run', key: '5' },
  { id: 'night', name: 'Night Rain', key: '6' },
  { id: 'coast', name: 'Coast Road', key: '7' },
  // 2026-11-19: "one map becomes Mars, in the style of the salt flats".
  { id: 'mars', name: 'Mars', key: '8' },
  { id: 'salt', name: 'Salt Flat', key: '9' },
  // 2026-11-25: found, not given: through the portals on the lake behind Chinatown Run's start
  // (lib/art/drive-unlocks.ts). Hidden from the menus until then.
  { id: 'water', name: 'Water City', key: '0' },
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

export type HullId = 'chrome' | 'oldChrome' | 'gold' | 'rust' | 'red' | 'leopard' | 'paint';

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
  /** A printed coat over the base: the leopard's rosettes, or old chrome's tarnish and haze. */
  pattern?: 'leopard' | 'tarnish';
  /** The rims and trim in their own metal (sRGB); otherwise each vehicle's own. */
  rim?: string;
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
    // 2026-11-23: "add old chrome as one of the colours." Worn chrome: warmer and greyer than new,
    // the mirror gone a little hazy (rougher), clouded with tarnish and fine pitting.
    id: 'oldChrome',
    name: 'Old chrome',
    colour: '#c9bca4',
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0,
    patina: 0,
    pattern: 'tarnish',
  },
  {
    // 2026-11-19: "user-pickable colours, chrome and gold included".
    id: 'gold',
    name: 'Gold',
    colour: '#e2b04a',
    metalness: 1,
    roughness: 0.14,
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
  {
    // 2026-11-21: "a leopard colour for ships and cars with golden rims". A tawny coat printed with
    // rosettes under a clear coat; the wheel rims and the ship's trim in gold.
    id: 'leopard',
    name: 'Leopard',
    colour: '#c8923f',
    metalness: 0.15,
    roughness: 0.4,
    clearcoat: 1,
    patina: 0,
    pattern: 'leopard',
    rim: '#e2b04a',
  },
  {
    // Your own colour, picked in the Garage (Design.paint), in a glossy clear-coated paint.
    id: 'paint',
    name: 'Paint',
    colour: '#2a6cf0',
    metalness: 0.35,
    roughness: 0.28,
    clearcoat: 1,
    patina: 0,
  },
];

export function hullById(id: string): Hull {
  return HULLS.find((h) => h.id === id) ?? (HULLS.find((h) => h.id === 'red') as Hull);
}

/** The design's hull, the Paint hull in the design's own colour. */
export function hullOf(d: Pick<Design, 'hull' | 'paint'>): Hull {
  const h = hullById(d.hull);
  return h.id === 'paint' ? { ...h, colour: d.paint } : h;
}

/** A colour as the Garage's picker writes it: #rrggbb. */
export const isHex = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** One ride everywhere (the Garage): the same vehicle in every world. */
export function rideEverywhere(d: Design, kind: VehicleKind): Design {
  const vehicle = { ...d.vehicle };
  for (const w of WORLDS) vehicle[w.id] = kind;
  return { ...d, vehicle };
}

/* ── The design ────────────────────────────────────────────── */

export interface Design {
  fire: FireId;
  hull: HullId;
  weather: string;
  vehicle: Record<WorldId, VehicleKind>;
  /** The speedometer: futuristic dial, the School Timer's paper card, or the plain number. */
  gauge: GaugeId;
  /** Flames out of the exhausts and boosters at high speed. */
  flames: boolean;
  /** A wall of light left behind every car and bike in its own colour (2026-11-22: "cars leave
   * colour trail behind them, bikes as well"). */
  trail: boolean;
  /** How every vehicle handles (lib/art/vehicle.ts MODES). */
  mode: DriveMode;
  /** The Paint hull's colour (#rrggbb). */
  paint: string;
  /** The car's body (components/drive/bodies.ts); the ship has its own. */
  body: BodyId;
  /** The ship's parts (the Garage's spaceship creator). */
  reactors: ReactorId;
  bubble: BubbleId;
  core: CoreId;
  /** The five rivals on the tracks (lib/art/rivals.ts). */
  rivals: boolean;
}

/**
 * The spaceship creator (2026-11-19: "different reactors I can place on the side or above,
 * different bubbles for the cockpit and different cores; the aim is that they match well with each
 * other"). Every part takes the hull's paint, and the core glows in the fire's colour, so any
 * mix matches.
 */
export type ReactorId = 'side' | 'top' | 'quad';
export const REACTORS: { id: ReactorId; name: string }[] = [
  { id: 'side', name: 'Twin side' },
  { id: 'top', name: 'One on top' },
  { id: 'quad', name: 'Four' },
];
export type BubbleId = 'dome' | 'racer' | 'twin' | 'visor';
export const BUBBLES: { id: BubbleId; name: string }[] = [
  { id: 'dome', name: 'Dome' },
  { id: 'racer', name: 'Racing canopy' },
  { id: 'twin', name: 'Twin bubbles' },
  { id: 'visor', name: 'Visor' },
];
export type CoreId = 'none' | 'ring' | 'orb' | 'crystal';
export const CORES: { id: CoreId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'ring', name: 'Light ring' },
  { id: 'orb', name: 'Orb' },
  { id: 'crystal', name: 'Crystal' },
];

export interface ShipParts {
  reactors: ReactorId;
  bubble: BubbleId;
  core: CoreId;
}

/** The ship's parts out of a design. */
export const shipParts = (d: ShipParts): ShipParts => ({
  reactors: d.reactors,
  bubble: d.bubble,
  core: d.core,
});

/**
 * The car's bodies (2026-11-19: "a motorbike", "cars inspired by the 50s GTO, and then the same
 * but futuristic"). The physics stay the car's.
 */
export type BodyId =
  | 'wedge'
  | 'classic'
  | 'future'
  | 'racer'
  | 'bike'
  | 'cycle'
  | 'ufo'
  | 'garbage';
export const BODIES: { id: BodyId; name: string }[] = [
  { id: 'wedge', name: 'Wedge' },
  { id: 'classic', name: 'Classic GT' },
  { id: 'future', name: 'Future GT' },
  // 2026-11-21: "those tron like cars are awesome i wanna be able to drive them … one called Space
  // Racer, with the tron designs": the Future GT with its light lines in the hull's own colour.
  { id: 'racer', name: 'Space Racer' },
  { id: 'bike', name: 'Motorbike' },
  // 2026-11-22: "make tron bikes".
  { id: 'cycle', name: 'Light Cycle' },
  // 2026-11-23: "one of the cars is UFO classic saucer": a 1950s flying saucer, hovering on the
  // car's physics, its rim lights glowing softly.
  { id: 'ufo', name: 'UFO Classic' },
  // 2026-11-23: "call it the garbage ride": an original junkyard flying car bolted from scrap.
  { id: 'garbage', name: 'Garbage Ride' },
];

/** The bodies that float instead of rolling (no wheels; they bob a little over the road). */
export const HOVER_BODIES: readonly BodyId[] = ['ufo', 'garbage'];

export type DriveMode = 'easy' | 'flow' | 'drift' | 'grip';
export const DRIVE_MODES: { id: DriveMode; name: string }[] = [
  { id: 'easy', name: 'Easy' },
  { id: 'flow', name: 'Flow' },
  { id: 'drift', name: 'Drift' },
  { id: 'grip', name: 'Grip' },
];

export type GaugeId = 'future' | 'timer' | 'plain';
export const GAUGES: { id: GaugeId; name: string }[] = [
  { id: 'future', name: 'Futuristic' },
  { id: 'timer', name: 'Timer' },
  { id: 'plain', name: 'Plain' },
];

/** The red car on the salt, in the canyon and the night lanes; the hover ship on the coast and in the Neon District. */
export const DEFAULT_DESIGN: Design = {
  fire: 'speed',
  hull: 'red',
  weather: 'clear',
  gauge: 'future',
  flames: true,
  trail: true,
  mode: 'flow',
  paint: '#2a6cf0',
  body: 'wedge',
  reactors: 'side',
  bubble: 'dome',
  core: 'none',
  rivals: false,
  vehicle: {
    salt: 'ship',
    coast: 'ship',
    canyon: 'ship',
    night: 'ship',
    chinatown: 'ship',
    neon: 'ship',
    sky: 'ship',
    mars: 'ship',
    gold: 'ship',
    water: 'ship',
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
    gauge: GAUGES.some((g) => g.id === o.gauge) ? (o.gauge as GaugeId) : DEFAULT_DESIGN.gauge,
    flames: typeof o.flames === 'boolean' ? o.flames : DEFAULT_DESIGN.flames,
    trail: typeof o.trail === 'boolean' ? o.trail : DEFAULT_DESIGN.trail,
    mode: DRIVE_MODES.some((m) => m.id === o.mode) ? (o.mode as DriveMode) : DEFAULT_DESIGN.mode,
    paint: isHex(o.paint) ? o.paint.toLowerCase() : DEFAULT_DESIGN.paint,
    body: BODIES.some((b) => b.id === o.body) ? (o.body as BodyId) : DEFAULT_DESIGN.body,
    reactors: REACTORS.some((r) => r.id === o.reactors)
      ? (o.reactors as ReactorId)
      : DEFAULT_DESIGN.reactors,
    bubble: BUBBLES.some((b) => b.id === o.bubble) ? (o.bubble as BubbleId) : DEFAULT_DESIGN.bubble,
    core: CORES.some((c) => c.id === o.core) ? (o.core as CoreId) : DEFAULT_DESIGN.core,
    rivals: typeof o.rivals === 'boolean' ? o.rivals : DEFAULT_DESIGN.rivals,
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
