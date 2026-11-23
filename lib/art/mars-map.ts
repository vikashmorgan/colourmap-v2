/**
 * Drive, Mars: the world's map (docs/specs/drive-game.md, world 8, "The map of Mars"). Pure: where
 * each named region lies and what it holds. Everything built on Mars is placed by this map.
 *
 * 2026-11-23: "make a map for mars so it becomes a world"; "add one big crater in it"; "add
 * radioactive lakes"; "add the radioactive stations in mars. usines atomiques"; "add a cool
 * lighthouse tower in mars"; the arches of rust and fire.
 *
 * World: x east, y north, metres. The start is at (6, -70) facing north; the Red Bastard's loop
 * circles a point at (-300, 2900) at 1.2 to 2.3 km (lib/art/mars.ts LOOP).
 */

export type RegionId = 'plain' | 'city' | 'factory' | 'lakes' | 'arches' | 'crater' | 'run';

export interface Region {
  id: RegionId;
  name: string;
  /** Its middle and how far it reaches (m); the run follows his loop instead. */
  x: number;
  y: number;
  r: number;
}

/** The regions, in the order they claim a point (the first that holds it names it). */
export const REGIONS: Region[] = [
  { id: 'crater', name: 'The Great Crater', x: -4500, y: 3000, r: 1150 },
  { id: 'lakes', name: 'The Glow Lakes', x: 300, y: 6700, r: 1000 },
  { id: 'city', name: 'Dome City', x: -300, y: 2900, r: 900 },
  { id: 'factory', name: 'The Factory Belt', x: 3700, y: 2600, r: 1100 },
  { id: 'arches', name: 'The Field of Arches', x: -2100, y: -1100, r: 850 },
  { id: 'plain', name: 'The Landing Plain', x: 0, y: 0, r: 1100 },
  { id: 'run', name: "The Bastard's Run", x: -300, y: 2900, r: 0 },
];

/** The crater: its middle, the rim's radius, how high the rim stands and how deep the bowl. */
export const CRATER = { x: -4500, y: 3000, R: 520, rim: 28, depth: 70 };

/** The radioactive lakes: flat glowing pools, each its middle and radius (m). */
export const LAKES: { x: number; y: number; r: number }[] = [
  { x: -150, y: 6500, r: 240 },
  { x: 520, y: 6920, r: 300 },
  { x: 280, y: 6250, r: 150 },
  { x: 950, y: 6450, r: 190 },
];
/** The lakes' surface (m), a little under the plain. */
export const LAKE_LEVEL = -1.4;
/** How far the radiation reaches past a lake's shore (m). */
export const RAD_REACH = 450;

/** The lighthouse on the crater's east rim. */
export const LIGHTHOUSE = { x: CRATER.x + CRATER.R + 14, y: CRATER.y, height: 64, r: 7 };

/** The atomic plants by the lakes: cooling towers, a reactor dome, pipe runs. */
export const ATOMIC: { x: number; y: number; rot: number }[] = [
  { x: -650, y: 6900, rot: 0.4 },
  { x: 1250, y: 6900, rot: 2.1 },
  { x: 700, y: 5900, rot: 4.0 },
];

/** Station places by region: [x, y, kind]. Domes and Nova Cores in the city, factories along the
 * belt, derelicts scattered over the plain and among the arches. Kept only where clear
 * (lib/art/mars.ts siteClear). */
export const PLACES: [number, number, 'domes' | 'nova' | 'factory' | 'ruin'][] = [
  // Dome City, inside his loop.
  [-300, 2900, 'nova'],
  [-650, 3150, 'domes'],
  [60, 3250, 'domes'],
  [-500, 2500, 'domes'],
  [200, 2620, 'domes'],
  [-900, 2800, 'nova'],
  [380, 3000, 'nova'],
  [-250, 3500, 'domes'],
  // The Factory Belt, east of the loop, running north to south.
  [3500, 3500, 'factory'],
  [3800, 3000, 'factory'],
  [3550, 2450, 'nova'],
  [3900, 1950, 'factory'],
  [3600, 1450, 'factory'],
  [4200, 2600, 'factory'],
  // Derelicts in the rust.
  [1500, -900, 'ruin'],
  [-1300, 600, 'ruin'],
  [-2900, -400, 'ruin'],
  [2400, 600, 'ruin'],
  [-3300, 5600, 'ruin'],
  [2600, 5400, 'ruin'],
];

export type ArchKind = 'fire' | 'tunnel' | 'real';

export interface Arch {
  x: number;
  y: number;
  /** The way through it (heading, rad) and its radius (m: the half circle's). */
  h: number;
  r: number;
  kind: ArchKind;
  /** Which tunnel it belongs to (tunnels only). */
  tunnel?: number;
}

/** The arches' radius (m): a half circle you drive under. */
export const ARCH_R = 13;
/** Arches in a tunnel stand this far apart (m). */
export const TUNNEL_STEP = 24;

/**
 * The Field of Arches: lone half circles of rust that throw fire as you pass, two tunnels of
 * fiery half circles that turn the picture to old film, and iron arches of another make that
 * bring the colour of Mars back.
 */
export const ARCHES: Arch[] = (() => {
  const out: Arch[] = [];
  const C = REGIONS.find((r) => r.id === 'arches') as Region;
  const lone: [number, number, number][] = [
    [-260, 300, 0.3],
    [180, 380, -0.6],
    [420, -60, 1.9],
    [-420, -260, 2.6],
    [80, -420, -1.4],
    [-560, 140, 0.9],
  ];
  for (const [dx, dy, h] of lone)
    out.push({ x: C.x + dx, y: C.y + dy, h, r: ARCH_R, kind: 'fire' });
  const tunnels: [number, number, number][] = [
    [-150, -120, 0.5],
    [300, 180, -2.4],
  ];
  tunnels.forEach(([dx, dy, h], ti) => {
    for (let i = 0; i < 6; i++)
      out.push({
        x: C.x + dx + Math.cos(h) * TUNNEL_STEP * i,
        y: C.y + dy + Math.sin(h) * TUNNEL_STEP * i,
        h,
        r: ARCH_R,
        kind: 'tunnel',
        tunnel: ti,
      });
  });
  const real: [number, number, number][] = [
    [520, 420, 1.2],
    [-620, -520, -0.4],
    [-60, 560, 3.0],
  ];
  for (const [dx, dy, h] of real)
    out.push({ x: C.x + dx, y: C.y + dy, h, r: ARCH_R + 2, kind: 'real' });
  return out;
})();

/** The line across an arch's foot (between its legs), as a gate. */
export function archGate(a: Arch): { ax: number; ay: number; bx: number; by: number } {
  const px = -Math.sin(a.h) * a.r;
  const py = Math.cos(a.h) * a.r;
  return { ax: a.x - px, ay: a.y - py, bx: a.x + px, by: a.y + py };
}
