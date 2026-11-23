/**
 * Drive: the gates on every track (docs/specs/drive-tracks.md, "Gates and pickups"). Asked for
 * 2026-11-23: "i want different awesome gates some spit fire some have a semi circle of light.
 * some are filled with inner light. some are old chrome some are rusty metal. or local fabric. u
 * pass through them and get the boosters and weapons."
 *
 * Where the gates stand and how each one looks. On a road a gate stands every so many metres
 * (the track's `gate` feature, or the world's own spacing), nudged forward off a twist, a jump, a
 * deck, a fire tunnel or a bridge so it always stands on plain road; on the open plains (Salt Flat,
 * Mars) the gates are the drift course's own. Each gate's look comes from the track's `style` or,
 * left out, the world's own round of looks. Pure: no three.js.
 */

import type { WorldId } from '@/lib/art/drive-design';
import type { TrackDef } from '@/lib/art/track';
import { GATE_STYLES, type GateStyle } from '@/lib/art/track-data';

export { GATE_STYLES, type GateStyle };

/** Each world's round of looks, its signature first; gate k wears look k mod the round's length. */
export const WORLD_GATES: Record<WorldId, readonly GateStyle[]> = {
  salt: ['chrome', 'glow', 'chrome', 'fire'],
  mars: ['rust', 'rust', 'fire'],
  gold: ['halo', 'fire', 'glow', 'chrome'],
  coast: ['fabric', 'chrome', 'halo'],
  canyon: ['fire', 'rust', 'fire', 'chrome'],
  night: ['glow', 'chrome', 'halo'],
  chinatown: ['fabric', 'fire', 'halo'],
  neon: ['fabric', 'glow', 'halo'],
  sky: ['glow', 'halo', 'fire'],
};

/** Where a road's gates stand: s = offset + k × every (k from 0, or from 1 when offset is 0), up
 * to `until`. */
export interface GatePlan {
  every: number;
  offset: number;
  until: number;
  /** One look for every gate (the track's), or null for the world's round. */
  style: GateStyle | null;
  /** How far past the road's edge the gate's posts stand (m), and how tall it is over its width. */
  margin: number;
  tall: number;
}

/** The Canyon Race's finish (lib/art/track.ts RACE.finish): no gates past it. */
const CANYON_FINISH = 4950;
/** Sky Canyon: a gate between the lap doors, every 1.5 km, three tall enough for the top level. */
const SKY_GATES = { every: 1500, offset: 750 };

/** A road world's gates, or null on the open plains. */
export function gatePlan(world: WorldId, def: TrackDef | null): GatePlan | null {
  if (!def) return null;
  const base = { margin: 2, tall: 1, until: Number.POSITIVE_INFINITY };
  if (world === 'sky') return { ...base, ...SKY_GATES, style: null, margin: 6, tall: 1.6 };
  if (world === 'canyon')
    return { ...base, every: 1000, offset: 0, until: CANYON_FINISH - 100, style: null };
  return { ...base, every: def.gate?.every ?? 1000, offset: 0, style: def.gate?.style ?? null };
}

/** The look of gate k in a world. */
export function gateStyle(world: WorldId, k: number, style: GateStyle | null = null): GateStyle {
  if (style) return style;
  const round = WORLD_GATES[world];
  return round[((k % round.length) + round.length) % round.length];
}

/** Whether a gate can stand at s: plain road, a little either side. */
function plainAt(def: TrackDef, s: number): boolean {
  for (const q of [s - 24, s - 8, s + 8, s + 24]) {
    if (q < 0) continue;
    if ((def.twist?.(q) ?? 0) !== 0) return false;
    if (def.gap?.(q) || def.fire?.(q) || def.bridge?.(q)) return false;
    if ((def.deck?.(q) ?? 0) !== 0) return false;
  }
  return true;
}

/** On the open plains' loop a gate gives again this long after it last gave (s); a road's gates
 * give once a run. */
export const GATE_REARM = 20;

/** How far a gate may be nudged off its spot to find plain road (m), and the step. */
export const NUDGE = { MAX: 600, STEP: 20 };

/** Gate k's place along the road: its spot, or the first plain road after it; null when none is
 * near enough (that gate is left out). */
export function stationOf(plan: GatePlan, def: TrackDef, k: number): number | null {
  const spot = plan.offset + k * plan.every;
  if (spot <= 0 || spot > plan.until) return null;
  const reach = Math.min(NUDGE.MAX, plan.every / 2);
  for (let s = spot; s <= spot + reach; s += NUDGE.STEP) if (plainAt(def, s)) return s;
  return null;
}

export interface Station {
  k: number;
  s: number;
}

/** The gates standing between s0 and s1 (m along the road), in order. */
export function stationsBetween(plan: GatePlan, def: TrackDef, s0: number, s1: number): Station[] {
  const out: Station[] = [];
  const reach = Math.min(NUDGE.MAX, plan.every / 2);
  const k0 = Math.max(0, Math.ceil((s0 - reach - plan.offset) / plan.every));
  for (let k = k0; plan.offset + k * plan.every <= s1; k++) {
    const s = stationOf(plan, def, k);
    if (s !== null && s >= s0 && s <= s1) out.push({ k, s });
  }
  return out;
}

/** The gate driven through moving from s0 to s1 at u across the road (inside its posts), or null. */
export function gateCrossed(
  plan: GatePlan,
  def: TrackDef,
  s0: number,
  s1: number,
  u: number,
): Station | null {
  if (!(s1 > s0) || s1 - s0 > 200) return null;
  for (const st of stationsBetween(plan, def, s0, s1)) {
    if (st.s <= s0) continue;
    if (Math.abs(u) <= def.half(st.s) + plan.margin) return st;
  }
  return null;
}

/** The cloth a fabric gate hangs, by world: its ground, its trim, and whether it is open mesh. */
export interface Fabric {
  base: [number, number, number];
  trim: [number, number, number];
  mesh: boolean;
}

export function fabricOf(world: WorldId): Fabric {
  switch (world) {
    // Red silk with gold.
    case 'chinatown':
      return { base: [0.62, 0.05, 0.04], trim: [1, 0.72, 0.25], mesh: false };
    // Neon mesh: a dark open weave, its threads lit magenta and cyan.
    case 'neon':
      return { base: [1, 0.2, 0.75], trim: [0.2, 0.9, 1], mesh: true };
    // Sailcloth: off-white with sea-blue stripes.
    case 'coast':
      return { base: [0.9, 0.86, 0.76], trim: [0.12, 0.32, 0.55], mesh: false };
    // Mars: dusty canvas, rust stripes.
    case 'mars':
      return { base: [0.72, 0.5, 0.36], trim: [0.5, 0.16, 0.06], mesh: false };
    case 'gold':
      return { base: [0.3, 0.12, 0.05], trim: [1, 0.66, 0.22], mesh: false };
    case 'night':
      return { base: [0.12, 0.16, 0.3], trim: [0.85, 0.75, 0.5], mesh: false };
    default:
      return { base: [0.7, 0.2, 0.1], trim: [0.95, 0.8, 0.45], mesh: false };
  }
}
