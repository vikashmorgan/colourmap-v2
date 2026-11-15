/*
 * The five space bars floating in the City of Dreams' sky (docs/specs/art-city.md, "Space bars,
 * the Saturn tower, the great arch", 2026-11-14): the Space Bar series (lib/space-bars.ts) placed
 * over the city, between the high currents and the flying stations. Pure: no three.js, no DOM.
 *
 * Each floats 200 to 230 over the street (all of it between about 175 and 260), over the high
 * currents (to 186) and under the stations' and the parcours' layer, a little off the avenue on
 * either side (x ±40 to ±48), so flying up the avenue they float by in turn, framing the long view.
 * Each turns slowly round the vertical and bobs gently, both only from the time. All light (no
 * collision), as the stations: docked at slowly (lib/city-skyport.ts), its lamps warm. Mellow and
 * warm: amber and gold, drifting slowly, nothing flashes.
 */

import { hash, smooth, type Vec3 } from './bigbang';
import { copiesNear } from './city-big';
import { planLook } from './city-game';
import { C, GROUND, type Item, mixId, TAU } from './city-grid';
import type { MapPlace } from './city-minimap';
import type { TravelSpot } from './city-travel';
import { BAR_DESIGNS, barModel } from './space-bars';

export type SkyBar = {
  /** Its design in the Space Bar series (lib/space-bars.ts BAR_DESIGNS). */
  design: number;
  /** Where it floats, tile-local, and how high its deck stands over the street. */
  x: number;
  z: number;
  h: number;
  spin: number;
  bob: number;
  period: number;
};

/** The lowest and highest a bar's deck may float over the street. */
export const BAR_LOW = 190;
export const BAR_HIGH = 260;

/**
 * The five, tile-local: either side of the avenue in turn, up the whole plan, each clear of the
 * stations, the rings (crowns, halos, rings over buildings, free sets), the parcours, the portals,
 * the great arch and the Saturn tower (lib/city-symbols.ts); tested.
 */
export const SKY_BARS: SkyBar[] = [
  { design: 0, x: -42, z: 262, h: 222, spin: 0.03, bob: 2.2, period: 19 },
  { design: 1, x: 42, z: 700, h: 218, spin: -0.022, bob: 2.6, period: 23 },
  { design: 2, x: -45, z: 1305, h: 214, spin: 0.025, bob: 2.4, period: 21 },
  { design: 3, x: 45, z: 1560, h: 210, spin: -0.028, bob: 3, period: 18 },
  { design: 4, x: -40, z: 1840, h: 200, spin: 0.018, bob: 2.8, period: 24 },
];

/** A bar's name (its design's). */
export const barName = (b: SkyBar) => (BAR_DESIGNS[b.design] as (typeof BAR_DESIGNS)[number]).name;

const phaseOf = (b: SkyBar) => hash(b.design * 131 + b.x + b.z, 79) * TAU;

/** Bar b's deck middle at time t (at its tile copy at x, z): bobbing gently. */
export function barCentre(b: SkyBar, t: number, x = b.x, z = b.z): Vec3 {
  return [x, GROUND + b.h + b.bob * Math.sin((TAU * t) / b.period + phaseOf(b)), z];
}

/** How far bar b has turned round the vertical at time t. */
export const barTurn = (b: SkyBar, t: number) => b.spin * t + phaseOf(b);

/* ---------- warming while docked ---------- */

const WARM_IN = 2;
const WARM_OUT = 4;
const warmOn = new Uint8Array(SKY_BARS.length);
const warmAt = new Float64Array(SKY_BARS.length).fill(Number.NEGATIVE_INFINITY);
const warmFrom = new Float64Array(SKY_BARS.length);

/** How warm bar i's lamps are at time t, 0..1, easing (never a jump). */
export function barWarmth(i: number, t: number): number {
  const from = warmFrom[i] ?? 0;
  const e = t - (warmAt[i] ?? Number.NEGATIVE_INFINITY);
  if (e < 0) return from;
  return warmOn[i] ? from + (1 - from) * smooth(e / WARM_IN) : from * (1 - smooth(e / WARM_OUT));
}
/** Bar i begins to warm (docked) or to cool (left) at time t. */
export function setBarWarm(i: number, on: boolean, t: number) {
  if (i < 0 || i >= SKY_BARS.length || Boolean(warmOn[i]) === on) return;
  warmFrom[i] = barWarmth(i, t);
  warmAt[i] = t;
  warmOn[i] = on ? 1 : 0;
}
/** Every bar cool (a fresh start). */
export function resetBarWarmth() {
  warmOn.fill(0);
  warmAt.fill(Number.NEGATIVE_INFINITY);
  warmFrom.fill(0);
}

/* ---------- drawn ---------- */

/** The brightest a bar's lamp may be: a lit window's glow (mellow). */
export const BAR_GLOW_MAX = 0.74;

/** Which part site s falls in (the parts' running totals, searched by halves). */
function partOf(cum: number[], s: number): number {
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] as number) <= s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Site s of bar b at time t, its deck's middle at c: place and colour into o, brightness k. Its
 * colours lean slowly toward the warm lamp's shade and back; `warm` (docked) leans them further.
 */
export function barSite(
  b: SkyBar,
  s: number,
  t: number,
  c: Vec3,
  k: number,
  o: number[],
  warm = 0,
): boolean {
  const M = barModel(b.design);
  const i = partOf(M.cum, s);
  const part = M.parts[i] as (typeof M.parts)[number];
  const u = (s - ((M.cum[i] as number) - part.n) + 0.5) / part.n;
  const p = part.f(u, s, t);
  const turn = barTurn(b, t);
  const ct = Math.cos(turn);
  const st = Math.sin(turn);
  o[0] = c[0] + p[0] * ct - p[2] * st;
  o[1] = c[1] + p[1];
  o[2] = c[2] + p[0] * st + p[2] * ct;
  const tw = part.tw ? 1 - part.tw * (0.5 + 0.5 * Math.sin(t * 0.7 + s * 1.7)) : 1;
  const drift = 0.5 + 0.5 * Math.sin(t * 0.06 + s * 0.013 + c[2] * 0.01);
  const bright = Math.min(BAR_GLOW_MAX, 0.5 * k * (1 + 0.2 * warm)) * tw;
  const w = 0.2 * drift + 0.45 * warm;
  const rgb = part.rgb;
  o[3] = (rgb[0] + (C.warm[0] - rgb[0]) * w) * bright;
  o[4] = (rgb[1] + (C.warm[1] - rgb[1]) * w) * bright;
  o[5] = (rgb[2] + (C.warm[2] - rgb[2]) * w) * bright;
  return Number.isFinite(o[0]) && Number.isFinite(o[1]) && Number.isFinite(o[2]);
}

/**
 * The bars within sight (R), as the Ship's items: every tile copy near, weight 1.8, thinned with
 * the distance by the renderer like everything else; no probes (they float over every tower).
 */
export function barItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]) {
  const lift = 1.15 * (1 + 0.6 * planLook(eye[1]));
  for (let i = 0; i < SKY_BARS.length; i++) {
    const b = SKY_BARS[i] as SkyBar;
    const M = barModel(b.design);
    copiesNear(b.x, b.z, eye, R + M.r, (x, z, n) => {
      const c = barCentre(b, t, x, z);
      const rx = c[0] - eye[0];
      const ry = c[1] - eye[1];
      const rz = c[2] - eye[2];
      const d = Math.max(0, Math.hypot(rx, ry, rz) - Math.max(M.r, -M.lo, M.top));
      if (d > R) return;
      if (rx * fwd[0] + ry * fwd[1] + rz * fwd[2] < -M.r - 10 && d > 0) return;
      const warm = barWarmth(i, t);
      out.push({
        d,
        gid: mixId(i * 983 + n, 5151),
        count: M.count,
        weight: 1.8,
        site: (s, o) => barSite(b, s, t, c, lift, o, warm),
      });
    });
  }
}

/* ---------- travel and the map ---------- */

/** How far out from a bar's reach a trip to it ends, facing it. */
export const BAR_STANDOFF = 30;

/** Where a trip to bar i ends (tile-local): level with its deck, out past its reach on +z, facing it. */
export function barSpot(i: number): TravelSpot {
  const b = SKY_BARS[i] ?? (SKY_BARS[0] as SkyBar);
  return { pos: [b.x, GROUND + b.h, b.z + barModel(b.design).r + BAR_STANDOFF], yaw: 0 };
}

/** The share of their height the bars stand at in the 3D map (as the stations', lib/city-skyport.ts). */
const BAR_MAP_K = 0.45;
/** The bars' warm gold on the map. */
export const BAR_MAP_COLOUR = C.gold;

/** The five bars as places on the map, each tapped to fly there. */
export function barPlaces(): MapPlace[] {
  return SKY_BARS.map((b, i) => ({
    kind: 'bar',
    name: barName(b),
    x: b.x,
    z: b.z,
    y: b.h * BAR_MAP_K,
    colour: BAR_MAP_COLOUR,
    go: { bar: i, name: barName(b) },
  }));
}
