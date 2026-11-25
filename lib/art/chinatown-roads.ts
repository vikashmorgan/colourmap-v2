/**
 * Chinatown Run's side roads (2026-11-24: "a whole side road that goes on the left side of those
 * tallest buildings. another side road that goes high and is longer with cool passages", "a tunnel
 * u can enter on the left of main normal chinatrack which leads left and makes u have deep unique
 * adventures"; the world: "the more u know the more u discover"). Pure: no three.js, no DOM.
 *
 * Three roads off the left of the street, each a discovery rather than a signposted fork:
 * - **The alley** (後巷): through a gap between the tallest towers it peels off left and runs behind
 *   them, between their backs and the next row's, neon and lanterns, then comes back in.
 * - **The high road** (天路): up a ramp off the left edge and on up to 22 m over the street's
 *   crown on columns, longer and higher than the balcony road, behind the front row, between
 *   pairs of slim towers under the sky bridges joining them, through stage fire, and down again
 *   at the summit.
 * - **The deep way** (深道): a dark arch on the left, a faint glow inside. Down a ramp under the
 *   ground and away left: a lantern cavern, the hall of the dragon, a flooded stretch, the
 *   fireworks vault, and up again to the street in the next lap's lanes.
 *
 * Each is laid along the street (m into the lap, lib/art/chinatown-lap.ts) by keyframes of: its
 * gap from the road's left edge to its inner edge, its half-width, its floor's height over the
 * street's crown (null: level with its left edge) and its roof (clearance over the floor; none:
 * open sky). At each end it lies
 * against the road's left edge, level with it and unwalled (joined), so you simply bear left; in
 * between it is walled at both edges.
 */

import { CHINA_LAP, lapX } from './chinatown-lap';

export type RoadId = 'alley' | 'high' | 'deep';

/** One keyframe: m into the road, gap from the road's left edge (m), half-width, floor (m over the
 * street's crown; null: level with its left edge), roof (clearance, null: open). */
export type RoadKey = readonly [number, number, number, number | null, number | null];

export interface RoadDef {
  id: RoadId;
  /** Where it starts in the lap (m) and how long it runs. */
  from: number;
  length: number;
  keys: readonly RoadKey[];
}

/** How far each end lies joined against the road (m), and how far out its inner edge stands once
 * it has left the street: behind the front row of shophouses (their backs reach half + 16.5). */
export const ROAD_JOIN = 160;
export const ROAD_OUT = 18;

/** How far over the road's left lane each end lies (m): a road slides off it and back onto it. */
export const ROAD_IN = 10;

const J = ROAD_JOIN;
const O = ROAD_OUT;
const IN = ROAD_IN;

export const ROADS: readonly RoadDef[] = [
  {
    // Along the sweepers, level with the street's crown (not its banked edge, which rocks).
    id: 'alley',
    from: 8040,
    length: 2060,
    keys: [
      [0, -IN, 5, null, null],
      [J, 0, 5, null, null],
      [520, O, 5, 0, null],
      [1540, O, 5, 0, null],
      [2060 - J, 0, 5, null, null],
      [2060, -IN, 5, null, null],
    ],
  },
  {
    // Over the rollers: 22 m over the street's crown, riding its swells, down again at the summit.
    id: 'high',
    from: 10150,
    length: 2680,
    keys: [
      [0, -IN, 5, null, null],
      [J, 0, 5, null, null],
      [560, O, 5, 8, null],
      [950, O, 5, 22, null],
      [1850, O, 5, 22, null],
      [2200, O, 5, 10, null],
      [2680 - J, 0, 5, null, null],
      [2680, -IN, 5, null, null],
    ],
  },
  {
    // Through the arch at the end of the furnace, down under the ground and on into the next lap.
    id: 'deep',
    from: 20300,
    length: 3760,
    keys: [
      [0, -IN, 5, null, null],
      [J, 0, 5, null, null],
      // The arch.
      [480, O, 5, 0, 8],
      [750, O, 5, -8, 8],
      // The lantern cavern.
      [950, O, 16, -10, 14],
      [1300, O, 16, -10, 14],
      // The hall of the dragon.
      [1550, O, 18, -16, 20],
      [1900, O, 18, -16, 20],
      // The flooded way.
      [2100, O, 6, -12, 8],
      [2400, O, 6, -12, 8],
      // The fireworks vault.
      [2600, O, 15, -16, 18],
      [2850, O, 15, -16, 18],
      // Up and out.
      [3100, O, 5, -8, 8],
      [3350, O, 5, 0, 8],
      [3760 - J, 0, 5, null, null],
      [3760, -IN, 5, null, null],
    ],
  },
];

/** The deep way's chambers (m into it): what is where, for its decor and its names. */
export const DEEP_CHAMBERS = [
  { id: 'lanterns', name: '灯窟 Lantern Cavern', from: 950, to: 1300 },
  { id: 'dragon', name: '龍殿 Hall of the Dragon', from: 1550, to: 1900 },
  { id: 'flood', name: '水道 The Flooded Way', from: 2100, to: 2400 },
  { id: 'vault', name: '花火庫 Fireworks Vault', from: 2600, to: 2850 },
] as const;

export interface SideRoad {
  id: RoadId;
  /** Metres into it. */
  x: number;
  /** Its centre (u, positive left), half-width, floor height (m), roof clearance (null: open). */
  c: number;
  w: number;
  z: number;
  roof: number | null;
  /** Lying against the road (or still within 3 m of it), level with its edge: no wall between. */
  joined: boolean;
}

const smoother = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * k * (k * (6 * k - 15) + 10);
};

/** The roads s is on, and how far into each (a road may run on past the lap's end into the next;
 * none before the run's start). */
export function roadAt(s: number, id?: RoadId): { def: RoadDef; x: number }[] {
  if (!Number.isFinite(s) || s < 0) return [];
  const x0 = lapX(s);
  const out: { def: RoadDef; x: number }[] = [];
  for (const def of ROADS) {
    if (id && def.id !== id) continue;
    const x = (((x0 - def.from) % CHINA_LAP) + CHINA_LAP) % CHINA_LAP;
    if (x <= def.length && s - x >= 0) out.push({ def, x });
  }
  return out;
}

/**
 * The side roads at s beside a road `half` wide whose crown stands at `e` and its left edge at
 * `edge` (m: as the swells and the bank carry them). Between keyframes everything eases
 * (smootherstep), so the floor's slope and curve both fade at each key.
 */
export function sideRoads(s: number, half: number, e: number, edge: number): SideRoad[] {
  return roadAt(s).map(({ def, x }) => {
    const ks = def.keys;
    let i = 0;
    while (i < ks.length - 2 && x > ks[i + 1][0]) i++;
    const a = ks[i];
    const b = ks[i + 1];
    const k = smoother((x - a[0]) / Math.max(1e-6, b[0] - a[0]));
    const mix = (p: number, q: number) => p + (q - p) * k;
    const gap = mix(a[1], b[1]);
    const w = mix(a[2], b[2]);
    const z = mix(a[3] === null ? edge : e + a[3], b[3] === null ? edge : e + b[3]);
    // A roof only between two keys that both have one (the tunnel's mouths are its first and last).
    const roof = a[4] === null || b[4] === null ? null : mix(a[4], b[4]);
    return {
      id: def.id,
      x,
      c: half + gap + w,
      w,
      z,
      roof,
      // (A negative gap: sliding off or back onto the road's left lane.)
      joined: gap < 3 && Math.abs(z - edge) < 0.6,
    };
  });
}

/** Every road start between s0 and s1 (m along the road; its end may run past s1). */
export function roadStarts(s0: number, s1: number): { s: number; def: RoadDef }[] {
  const out: { s: number; def: RoadDef }[] = [];
  for (let n = Math.max(-1, Math.floor(s0 / CHINA_LAP) - 1); n * CHINA_LAP < s1; n++)
    for (const def of ROADS) {
      const s = n * CHINA_LAP + def.from;
      if (s >= 0 && s + def.length >= s0 && s < s1) out.push({ s, def });
    }
  return out;
}

/** The deep way's chamber at s, or null. */
export function deepChamber(s: number): (typeof DEEP_CHAMBERS)[number] | null {
  const r = roadAt(s, 'deep')[0];
  if (!r) return null;
  return DEEP_CHAMBERS.find((c) => r.x >= c.from && r.x < c.to) ?? null;
}
