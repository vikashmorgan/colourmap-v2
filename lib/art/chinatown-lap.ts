/**
 * Chinatown Run's lap (2026-11-24: "make whole chinatown run much longer … some parts with more
 * tilt or also more up downs that are smoother not a sudden bump … rows of fires shooting up as u
 * pass … explosions. and circle of fire to pass through. and a view over a beautiful city in the
 * distance"). Pure: no three.js, no DOM.
 *
 * The street is endless, but it is laid out as one 22 km lap that comes round again and again: a
 * calm opening, a build, two climaxes and a release, never the same stretch twice in a lap. Every
 * feature of the run is placed here, in metres into the lap, and the rest of the run reads it:
 * - the bends (CHINA_BENDS): long gentle curves, and two runs of sweepers (the tilt stretches,
 *   CHINA_TILT) where the bends tighten and the road banks up to 0.51 rad;
 * - the rises and dips (CHINA_SWELLS): long, smooth swells, eased so the car is never thrown off
 *   a crest at speed; the two kicker crests of the balcony roads are the only sharp ones;
 * - where Undertown runs (with its underpass and lake city), the balcony roads, the lake arcades
 *   and the overlooks (the canyon parting at a summit for a view of a city across the lake);
 * - the spectacle: rows of fire that shoot up as you pass, explosions, rings of fire.
 *
 * Net heading over a lap is nil, and the heading never swings past 70°, so the road never turns
 * back on itself: every lap is the last one moved on.
 */

export const CHINA_LAP = 22_000;

/** The lap's sections, in order (m into the lap), for the spec and the map. */
export const CHINA_SECTIONS: readonly { from: number; to: number; name: string }[] = [
  { from: 0, to: 1600, name: 'The lanes: a calm opening' },
  { from: 1600, to: 2400, name: 'The first swell' },
  { from: 2400, to: 3000, name: 'The first fire row' },
  { from: 3000, to: 5400, name: 'Undertown I, the underpass and the lake city' },
  { from: 5400, to: 6200, name: 'Lake arcade I' },
  { from: 6200, to: 8000, name: 'Balcony road I' },
  { from: 8000, to: 10100, name: 'The sweepers: tilt and fire rows' },
  { from: 10100, to: 11800, name: 'The rollers: fire on the crest, blasts in the dip' },
  { from: 11800, to: 12700, name: 'The summit overlook: the city across the lake' },
  { from: 12700, to: 13300, name: 'The rings of fire' },
  { from: 13300, to: 15700, name: 'Undertown II, the underpass and the lake city' },
  { from: 15700, to: 16400, name: 'Lake arcade II' },
  { from: 16400, to: 17950, name: 'Balcony road II' },
  { from: 17950, to: 20250, name: 'The furnace: tilt, fire, explosions, rings' },
  { from: 20250, to: 22000, name: 'The release: the lanes home and a last view' },
];

/** Where each Undertown run starts (its flip in), m into the lap. */
export const LAP_UNDER = [4000, 14300] as const;
/** The balcony roads' crests (the kicker's top), m into the lap: mid-avenue, on a straight. */
export const LAP_BALCONY = [7500, 17500] as const;

/**
 * The bends: [start, length, radius at its middle] (m; radius positive turning left). Each eases
 * in and out (curvature sin² across it, so the bank follows it smoothly) and turns the heading by
 * length / (2 radius).
 */
export const CHINA_BENDS: readonly (readonly [number, number, number])[] = [
  // The lanes: long and gentle.
  [250, 700, 1000],
  [950, 700, -1000],
  [1650, 800, -1400],
  [2450, 500, 450],
  // Undertown I: gentle, turning away from the lake city on the right while you are over it.
  [2950, 1200, -2000],
  [4150, 1250, 2500],
  [5450, 700, -1500],
  // Then straight over the balcony road's deck.
  [6250, 1100, 2200],
  // The sweepers: four 48° bends, right and left in turn, on the tilt.
  [8050, 500, -300],
  [8550, 500, 300],
  [9050, 500, -300],
  [9550, 500, 300],
  // The rollers and the summit.
  [10100, 1000, -1500],
  [11100, 1000, 1500],
  [12300, 900, -2500],
  // Undertown II.
  [13300, 1300, 2200],
  [14600, 1200, -2400],
  [15800, 600, -2000],
  [16400, 900, -2500],
  // The furnace: four sweepers on the tilt.
  [18000, 550, 300],
  [18550, 550, -300],
  [19100, 550, 300],
  [19650, 550, -300],
  // Home, squaring the lap's heading.
  [20500, 900, 1973.3],
];

/** The tilt stretches [from, to] (m into the lap): the bank there is TILT times the street's. */
export const CHINA_TILT: readonly (readonly [number, number])[] = [
  [7950, 10100],
  [17950, 20250],
];
export const TILT = { MORE: 1.7, EASE: 250 } as const;

/**
 * The swells: [middle, height, half-length] (m). Each is a cosine bump squared, so its slope and
 * its curve both ease to nothing at its ends: long rises and dips, never a bump.
 */
export const CHINA_SWELLS: readonly (readonly [number, number, number])[] = [
  [2000, 6, 400],
  // The rollers: up, down, and up to the summit.
  [10550, 8, 450],
  [11400, -4, 400],
  [12250, 10, 450],
  [19100, 5, 450],
  [21100, 5, 500],
];

/** The kicker crests of the balcony roads: height (m) and half-width. */
export const KICK_CREST = { H: 4, W: 30 } as const;

/** The overlooks: [start, side] (m into the lap; side -1 the right): OVERLOOK m where the canyon
 * parts at a summit for the view of a city across the lake. */
export const LAP_OVERLOOK: readonly (readonly [number, 1 | -1])[] = [
  [12050, -1],
  [20900, -1],
];
export const OVERLOOK = 400;

/** The rows of fire [from, to] (m into the lap): burners down both edges that shoot up one after
 * another as you come to them, a wave running just ahead of you. */
export const LAP_FIRE_ROWS: readonly (readonly [number, number])[] = [
  [2450, 2750],
  [8150, 8450],
  [9150, 9450],
  [10400, 10700],
  [11280, 11520],
  [18050, 20150],
];
/** Burners in a row: a pair every STEP m, fired as you come within LEAD m, for FIRE s. */
export const FIRE_ROW = { STEP: 10, LEAD: 22, FIRE: 0.6, OUT: 0.9 } as const;

/** The explosions [where, side] (m into the lap; side +1 left, -1 right): beside the road, set
 * off as you come within BLAST.LEAD m. */
export const LAP_BLASTS: readonly (readonly [number, 1 | -1])[] = [
  [11330, 1],
  [11400, -1],
  [11470, 1],
  // Beside each ring of fire.
  [12780, 1],
  [12920, -1],
  [13060, 1],
  [13200, -1],
  // The furnace.
  ...Array.from({ length: 10 }, (_, i) => [18150 + i * 190, i % 2 ? -1 : 1] as const),
];
export const BLAST = { LEAD: 70, OUT: 5 } as const;

/** The rings of fire [where, across] (m into the lap; across positive left): a burning ring
 * standing over the road; through it, a surge. */
export const LAP_RINGS: readonly (readonly [number, number])[] = [
  [12780, 0],
  [12920, 4],
  [13060, -4],
  [13200, 0],
  [18550, 0],
  [19100, 0],
  [19650, 0],
];

/** A ring's radius and its middle's height over the road (its foot just clear of the road). */
export const FIRE_RING = { R: 6.4, LIFT: 6.9 } as const;

/* ── Reading the lap ───────────────────────────────────────── */

/** Metres into the lap. */
export function lapX(s: number): number {
  return ((s % CHINA_LAP) + CHINA_LAP) % CHINA_LAP;
}

/** Every place of a lap list (m into the lap) as an absolute position in [s0, s1), with its index
 * in the list and its lap. */
export function eachIn<T extends number | readonly [number, ...unknown[]]>(
  list: readonly T[],
  s0: number,
  s1: number,
): { s: number; i: number; item: T }[] {
  const out: { s: number; i: number; item: T }[] = [];
  if (!(s1 > s0)) return out;
  const at = (it: T) => (typeof it === 'number' ? it : it[0]);
  for (let n = Math.floor(s0 / CHINA_LAP); n * CHINA_LAP < s1; n++)
    list.forEach((item, i) => {
      const s = n * CHINA_LAP + at(item);
      if (s >= s0 && s < s1 && s >= 0) out.push({ s, i, item });
    });
  return out.sort((a, b) => a.s - b.s);
}

/** The k-th occurrence (from 0, lap by lap) of a lap list's places, absolute. */
export function nthOf(list: readonly number[], k: number): number {
  const n = Math.floor(k / list.length);
  return n * CHINA_LAP + list[((k % list.length) + list.length) % list.length];
}

/** The last occurrence k of a lap list's places at or before s (-1 before the first). */
export function lastOf(list: readonly number[], s: number): number {
  if (!Number.isFinite(s)) return -1;
  const n = Math.floor(s / CHINA_LAP);
  const x = s - n * CHINA_LAP;
  let j = -1;
  for (let i = 0; i < list.length; i++) if (list[i] <= x) j = i;
  const k = n * list.length + j;
  return k < 0 ? -1 : k;
}

const sin2 = (x: number) => {
  const v = Math.sin(Math.PI * x);
  return v * v;
};

/** The street's curvature at s (1/m, positive turning left). */
export function chinaCurv(s: number): number {
  const x = lapX(s);
  let k = 0;
  for (const [a, len, r] of CHINA_BENDS) if (x > a && x < a + len) k += sin2((x - a) / len) / r;
  return k;
}

/** The street's height at s over its datum (m): the swells, and a kicker crest at each balcony
 * road. 0 elsewhere. */
export function chinaElev(s: number): number {
  const x = lapX(s);
  let e = 0;
  for (const [c, h, w] of CHINA_SWELLS) {
    const d = (x - c) / w;
    if (Math.abs(d) >= 1) continue;
    const q = (1 + Math.cos(Math.PI * d)) / 2;
    e += h * q * q;
  }
  for (const c of LAP_BALCONY) {
    const d = (x - c) / KICK_CREST.W;
    if (Math.abs(d) < 1) e += (KICK_CREST.H * (1 + Math.cos(Math.PI * d))) / 2;
  }
  return e;
}

/** How much more than the street's own the road banks at s (1, up to TILT.MORE on the tilt). */
export function chinaTilt(s: number): number {
  const x = lapX(s);
  let k = 0;
  for (const [a, b] of CHINA_TILT) {
    const up = Math.min(1, Math.max(0, (x - a) / TILT.EASE));
    const down = Math.min(1, Math.max(0, (b - x) / TILT.EASE));
    const m = Math.min(up, down);
    // Smootherstep: the bank's rate of change eases too, so an off-centre car rides in smoothly.
    k = Math.max(k, m * m * m * (m * (6 * m - 15) + 10));
  }
  return 1 + (TILT.MORE - 1) * k;
}

/** Whether s is in a row of fire. */
export function inFireRow(s: number): boolean {
  const x = lapX(s);
  return LAP_FIRE_ROWS.some(([a, b]) => x >= a && x <= b);
}

/** The ring of fire passed through moving from s0 to s1 at (u, `over` m over the road), or null. */
export function fireRingThrough(
  s0: number,
  s1: number,
  u: number,
  over: number,
): { s: number; u: number } | null {
  if (!(s1 > s0) || s1 - s0 > 50) return null;
  for (const { s, item } of eachIn(LAP_RINGS, s0 + 1e-9, s1 + 1e-9)) {
    if (Math.hypot(u - item[1], over - FIRE_RING.LIFT) <= FIRE_RING.R * 1.05)
      return { s, u: item[1] };
  }
  return null;
}

/** Whether a ring of fire or a row of fire stands within w of s (other pieces keep out of them). */
export function nearSpectacle(s: number, w: number): boolean {
  const x = lapX(s);
  if (LAP_RINGS.some(([r]) => Math.abs(x - r) < w)) return true;
  return LAP_FIRE_ROWS.some(([a, b]) => x > a - w && x < b + w);
}

/** Whether a ring of fire stands within w of s. */
export function nearRing(s: number, w: number): boolean {
  const x = lapX(s);
  return LAP_RINGS.some(([r]) => Math.abs(x - r) < w);
}
