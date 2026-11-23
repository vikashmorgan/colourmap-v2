/**
 * Drive: what a gate gives you (docs/specs/drive-tracks.md, "Gates and pickups"). Through a gate
 * you get either a booster, a short burst of speed at once, or a weapon charge kept in a small
 * inventory for later. Pure: which gate gives what, the inventory, the booster's curve.
 *
 * The weapons themselves (the Dust Shark, the yellow explosive shot, the laser) are the attack
 * code's (feature/mars-mission). This file only names them and carries the charges; the engine
 * hands a spent charge to whatever handler the attack code registered (`WeaponHandler`), and
 * keeps the charge when no handler is there yet.
 */

import type { GateStyle } from '@/lib/art/track-data';

export const WEAPONS = ['shark', 'shot', 'laser'] as const;
export type WeaponId = (typeof WEAPONS)[number];
export type Pickup = 'booster' | WeaponId;

/** The weapons' names as the HUD shows them. */
export const WEAPON_NAME: Record<WeaponId, string> = {
  shark: 'dust shark',
  shot: 'shot',
  laser: 'laser',
};

/** What each look tends to give: fire gates arm you, halos and glows push you, and so on. */
const TABLE: Record<GateStyle, readonly Pickup[]> = {
  fire: ['shot', 'booster', 'shot'],
  halo: ['booster', 'booster', 'laser'],
  glow: ['booster', 'shot', 'booster'],
  chrome: ['laser', 'booster', 'laser'],
  rust: ['shark', 'booster', 'shark'],
  fabric: ['booster', 'shark', 'shot', 'laser'],
};

/** A small integer hash, the same on every machine. */
function mix(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

const STYLE_SEED: Record<GateStyle, number> = {
  fire: 1,
  halo: 2,
  glow: 3,
  chrome: 4,
  rust: 5,
  fabric: 6,
};

/** What gate k of this look gives: always the same for the same gate. */
export function pickupFor(k: number, style: GateStyle): Pickup {
  const t = TABLE[style];
  return t[mix(k, STYLE_SEED[style]) % t.length];
}

/** How many weapon charges you can carry. */
export const CHARGES_MAX = 3;

export interface Inventory {
  /** The charges held, oldest first. */
  charges: WeaponId[];
}

export const EMPTY_INVENTORY: Inventory = { charges: [] };

/** A pickup taken: a weapon goes into the inventory, a booster fires at once. With the inventory
 * full a weapon becomes a booster instead, so a gate is never wasted. */
export function take(inv: Inventory, p: Pickup): { inv: Inventory; boost: boolean } {
  if (p === 'booster') return { inv, boost: true };
  if (inv.charges.length >= CHARGES_MAX) return { inv, boost: true };
  return { inv: { charges: [...inv.charges, p] }, boost: false };
}

/** Spends a charge: of that weapon if named (its oldest), else the oldest held. */
export function spend(inv: Inventory, id?: WeaponId): { inv: Inventory; used: WeaponId | null } {
  const i = id === undefined ? (inv.charges.length ? 0 : -1) : inv.charges.indexOf(id);
  if (i < 0) return { inv, used: null };
  const charges = inv.charges.slice();
  const [used] = charges.splice(i, 1);
  return { inv: { charges }, used };
}

/** The booster: a push ahead (m/s²) that comes in over a fifth of a second, holds, and eases away
 * over the rest of its life: a short, smooth burst, never a jolt. */
export const BOOSTER = { LIFE: 2.2, PULL: 16, RISE: 0.2, HOLD: 0.7 };

export function boosterAccel(since: number): number {
  if (!(since >= 0) || since >= BOOSTER.LIFE) return 0;
  if (since < BOOSTER.RISE) {
    const k = since / BOOSTER.RISE;
    return BOOSTER.PULL * k * k * (3 - 2 * k);
  }
  if (since < BOOSTER.HOLD) return BOOSTER.PULL;
  const k = (since - BOOSTER.HOLD) / (BOOSTER.LIFE - BOOSTER.HOLD);
  return BOOSTER.PULL * (1 - k) * (1 - k);
}

/** A weapon fired: which, when, and the shooter as the physics has it (x east, y north, z up,
 * heading h in radians, velocity vx, vy in m/s). The attack code draws and resolves the rest. */
export interface WeaponFire {
  weapon: WeaponId;
  t: number;
  x: number;
  y: number;
  z: number;
  h: number;
  vx: number;
  vy: number;
}

export type WeaponHandler = (e: WeaponFire) => void;
