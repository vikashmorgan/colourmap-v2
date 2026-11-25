/**
 * Water City (2026-11-25: "A WHOLE WATER CITY RACING TRACK UNLOCKS", "BUT IT IS ALL THE SAME WORLD.
 * SO WE BUILD IT AS RACETRACKS THAT KEEP ON EXPANDING"), found through the portals on the lake
 * behind Chinatown Run's start (lib/art/chinatown-lake.ts). Pure: no three.js, no DOM.
 *
 * The city across the lake, raced: one 10 km lap that comes round again and again, shaped as an
 * arc. A calm run out along the piers, down onto the canals between the towers, up over the arched
 * bridges, out onto the open lake for the climax (rain, portals of light that boost you, sharks
 * breaching, the kraken's tentacles arching over the road), back in through the grand canal between
 * the tallest towers, and home along the piers.
 *
 * Laid out like Chinatown's lap: every feature in metres into the lap; bends ease in and out
 * (curvature sin²), heights ease between keys (smootherstep) and the arches are cosine bumps
 * squared, so slope and curve both fade at their ends. Net heading over a lap is nil and it never
 * swings past 70°: every lap is the last one moved on.
 *
 * The water's level is 0. On the piers the road is a deck 3 m over it; on the canals and the open
 * lake the road is the water itself (a skim: less grip, spray, rings).
 */

export const WATER_LAP = 10_000;

/** The lap's sections (m into the lap), for the spec and the dressing. */
export type WaterKind = 'piers' | 'canal' | 'bridges' | 'open' | 'grand';
export const WATER_SECTIONS: readonly {
  from: number;
  to: number;
  name: string;
  kind: WaterKind;
}[] = [
  { from: 0, to: 1600, name: 'The piers: a calm run out over the water', kind: 'piers' },
  { from: 1600, to: 3400, name: 'The canals: on the water between the towers', kind: 'canal' },
  {
    from: 3400,
    to: 5000,
    name: 'The bridges: two arches and the banked sweepers',
    kind: 'bridges',
  },
  { from: 5000, to: 7300, name: 'The open lake: rain, portals, sharks, the kraken', kind: 'open' },
  { from: 7300, to: 8700, name: 'The grand canal: between the tallest towers', kind: 'grand' },
  { from: 8700, to: 10000, name: 'The piers home', kind: 'piers' },
];

/** Metres into the lap. */
export function waterX(s: number): number {
  return ((s % WATER_LAP) + WATER_LAP) % WATER_LAP;
}

export function waterSection(s: number): (typeof WATER_SECTIONS)[number] {
  const x = waterX(s);
  return WATER_SECTIONS.find((c) => x >= c.from && x < c.to) ?? WATER_SECTIONS[0];
}

const smoother = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * k * (k * (6 * k - 15) + 10);
};
const sin2 = (x: number) => {
  const v = Math.sin(Math.PI * x);
  return v * v;
};

/** The bends: [start, length, radius at its middle] (m; positive turning left). */
const BENDS_OPEN: readonly (readonly [number, number, number])[] = [
  [200, 600, 1400],
  [900, 500, -1100],
  [1800, 400, 700],
  [2250, 400, -650],
  [2700, 450, 800],
  [3550, 350, -320],
  [3950, 350, 320],
  [4350, 350, -340],
  [5100, 600, -600],
  [5800, 600, 550],
  [6500, 500, -700],
  [7450, 300, -330],
  [7800, 300, 330],
  [8150, 300, -330],
];
/** Home: one long bend that squares the lap's heading. */
const HOME: readonly [number, number] = [8800, 900];
const turned = BENDS_OPEN.reduce((a, [, len, r]) => a + len / (2 * r), 0);
export const WATER_BENDS: readonly (readonly [number, number, number])[] = [
  ...BENDS_OPEN,
  [HOME[0], HOME[1], -HOME[1] / (2 * turned)],
];

export function waterCurv(s: number): number {
  const x = waterX(s);
  let k = 0;
  for (const [a, len, r] of WATER_BENDS) if (x > a && x < a + len) k += sin2((x - a) / len) / r;
  return k;
}

/** The deck's height over the water between keys [m into the lap, height] (eased). */
export const DECK_KEYS: readonly (readonly [number, number])[] = [
  [0, 3],
  [1500, 3],
  [1750, 0],
  [3300, 0],
  [3550, 4],
  [4800, 4],
  [5050, 0],
  [7150, 0],
  [7400, 3],
  [10000, 3],
];
/** The arches of the bridges: [middle, height, half-length] (cosine bumps squared). */
export const ARCHES: readonly (readonly [number, number, number])[] = [
  [3900, 11, 380],
  [4580, 8, 300],
];
/** Water underfoot: where the deck is this low the road is the water itself. */
export const ON_WATER = 0.05;

export function waterElev(s: number): number {
  const x = waterX(s);
  let i = 0;
  while (i < DECK_KEYS.length - 2 && x > DECK_KEYS[i + 1][0]) i++;
  const [a, ha] = DECK_KEYS[i];
  const [b, hb] = DECK_KEYS[i + 1];
  let e = ha + (hb - ha) * smoother((x - a) / (b - a));
  for (const [c, h, w] of ARCHES) {
    const d = (x - c) / w;
    if (Math.abs(d) >= 1) continue;
    const q = (1 + Math.cos(Math.PI * d)) / 2;
    e += h * q * q;
  }
  return e;
}

/** Whether the road at s is the water itself (the canals, the open lake). */
export function onWaterRoad(s: number): boolean {
  return waterElev(s) < ON_WATER;
}

/** The road's half-width: [m into the lap, half] keys, eased. */
export const HALF_KEYS: readonly (readonly [number, number])[] = [
  [0, 12],
  [1500, 12],
  [1750, 14],
  [3300, 14],
  [3500, 11],
  [4850, 11],
  [5100, 18],
  [7150, 18],
  [7400, 13],
  [8600, 13],
  [8800, 12],
  [10000, 12],
];

export function waterHalf(s: number): number {
  const x = waterX(s);
  let i = 0;
  while (i < HALF_KEYS.length - 2 && x > HALF_KEYS[i + 1][0]) i++;
  const [a, ha] = HALF_KEYS[i];
  const [b, hb] = HALF_KEYS[i + 1];
  return ha + (hb - ha) * smoother((x - a) / (b - a));
}

/** Banking: design speed and the most (rad), and the level grid (the bank eases in over these m). */
export const WATER_BANK = { SPEED: 50, MOST: 0.42, LEVEL: [120, 320] as const };

export function waterLevel(s: number): number {
  const [a, b] = WATER_BANK.LEVEL;
  return s < 0 ? 0 : smoother((s - a) / (b - a));
}

/** On the water the tyres find this much of their grip (a little more than the lake's: a race). */
export const WATER_ROAD_GRIP = 0.7;

/** Rain over the canals, the open lake and the grand canal: 0 dry to 1, easing over 200 m. */
export function rainAt(s: number): number {
  const x = waterX(s);
  const band = (a: number, b: number) => Math.min(smoother((x - a) / 200), smoother((b - x) / 200));
  return Math.max(band(1900, 3300), band(5000, 7300), band(7400, 8600) * 0.6);
}

/** The portals of light on the road: [m into the lap, across] (m). Through one, a surge. */
export const WATER_PORTALS: readonly (readonly [number, number])[] = [
  [2100, 0],
  [2900, 3],
  ...Array.from(
    { length: 7 },
    (_, i) => [5200 + i * 300, Math.round(6 * Math.sin(i * 1.3))] as const,
  ),
  [7900, 0],
];
export const WATER_PORTAL = { R: 8, LIFT: 7.6 } as const;

/** The portal passed going from s0 to s1 at u (m over the road `over`), its index, or -1. */
export function waterPortalThrough(s0: number, s1: number, u: number, over = 1): number {
  if (!(s1 > s0) || s1 - s0 > 60) return -1;
  const n0 = Math.floor(s0 / WATER_LAP);
  for (let n = n0; n <= n0 + 1; n++)
    for (let i = 0; i < WATER_PORTALS.length; i++) {
      const [x, pu] = WATER_PORTALS[i];
      const at = n * WATER_LAP + x;
      if (
        at > s0 &&
        at <= s1 &&
        Math.abs(u - pu) <= WATER_PORTAL.R &&
        over <= WATER_PORTAL.LIFT + 8
      )
        return i;
    }
  return -1;
}

/** The kraken's lairs beside the open lake: [m into the lap, across] (m). Its arching pair rise
 * either side of the road and meet over it. */
export const WATER_LAIRS: readonly (readonly [number, number])[] = [
  [5650, 0],
  [6750, 0],
];

/** The sharks: [m into the lap, across, way off the road's heading, period, phase]. */
export const WATER_SHARKS: readonly (readonly [number, number, number, number, number])[] = [
  [5050, 46, 0.4, 6.2, 0],
  [5350, -52, 2.6, 7.4, 1.1],
  [5900, 60, 0.9, 6.8, 2.7],
  [6250, -48, 2.2, 8.1, 0.6],
  [6950, 55, 0.3, 7.0, 3.4],
  [7100, -60, 2.9, 6.5, 4.2],
  [2400, 38, 0.1, 9.0, 1.9],
];

/** The towers along the canals and the grand canal: one every so many m each side, the tallest at
 * the grand canal. Their faces stand GAP m past the road's edge. */
export const TOWERS = { STEP: 34, GAP: 7, LOW: 30, HIGH: 190 } as const;

function hash(n: number, k: number): number {
  const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export interface WaterTower {
  /** Along the road (absolute m), across to its middle (m, + left), half its width and depth, its
   * height (m) and its light (an index into the tones). */
  s: number;
  u: number;
  w: number;
  d: number;
  h: number;
  tone: number;
}

/** The towers standing between s0 and s1 (both sides of the canals and the grand canal). */
export function towersBetween(s0: number, s1: number): WaterTower[] {
  const out: WaterTower[] = [];
  for (let k = Math.ceil(s0 / TOWERS.STEP); k * TOWERS.STEP < s1; k++) {
    const s = k * TOWERS.STEP;
    if (s < 0) continue;
    const sec = waterSection(s);
    if (sec.kind !== 'canal' && sec.kind !== 'grand') continue;
    const x = waterX(s);
    // Not where the road climbs out of the canal or the deck meets it.
    if (x - sec.from < 120 || sec.to - x < 120) continue;
    for (const side of [1, -1]) {
      const r = (j: number) => hash(k * 2 + (side > 0 ? 0 : 1), j);
      if (r(0) < 0.12) continue;
      const w = 6 + r(1) * 8;
      const d = 7 + r(2) * 9;
      const tall = sec.kind === 'grand' ? 0.55 + 0.45 * r(3) : 0.15 + 0.5 * r(3);
      out.push({
        s: s + (r(4) - 0.5) * 8,
        u: side * (waterHalf(s) + TOWERS.GAP + d),
        w,
        d,
        h: TOWERS.LOW + (TOWERS.HIGH - TOWERS.LOW) * tall,
        tone: Math.floor(r(5) * 4),
      });
    }
  }
  return out;
}
