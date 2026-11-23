import { describe, expect, it } from 'vitest';
import {
  BOOSTER,
  boosterAccel,
  CHARGES_MAX,
  EMPTY_INVENTORY,
  pickupFor,
  spend,
  take,
  WEAPONS,
} from '@/lib/art/pickups';
import { GATE_STYLES } from '@/lib/art/track-data';

describe('what a gate gives', () => {
  it('is always the same for the same gate', () => {
    for (const style of GATE_STYLES)
      for (let k = 0; k < 40; k++) expect(pickupFor(k, style)).toBe(pickupFor(k, style));
  });

  it('gives a booster or one of the three weapons, a mix along every look', () => {
    for (const style of GATE_STYLES) {
      const seen = new Set(Array.from({ length: 60 }, (_, k) => pickupFor(k, style)));
      for (const p of seen) expect(['booster', ...WEAPONS]).toContain(p);
      expect(seen.size).toBeGreaterThan(1);
    }
  });

  it('leans each look its own way: fire arms you, halos push you, rust gives sharks', () => {
    const count = (style: (typeof GATE_STYLES)[number], p: string) =>
      Array.from({ length: 300 }, (_, k) => pickupFor(k, style)).filter((x) => x === p).length;
    expect(count('fire', 'shot')).toBeGreaterThan(count('fire', 'booster'));
    expect(count('halo', 'booster')).toBeGreaterThan(count('halo', 'laser'));
    expect(count('rust', 'shark')).toBeGreaterThan(count('rust', 'booster'));
    expect(count('chrome', 'laser')).toBeGreaterThan(count('chrome', 'booster'));
  });
});

describe('the inventory', () => {
  it('fires a booster at once and keeps weapons', () => {
    expect(take(EMPTY_INVENTORY, 'booster')).toEqual({ inv: EMPTY_INVENTORY, boost: true });
    const a = take(EMPTY_INVENTORY, 'laser');
    expect(a).toEqual({ inv: { charges: ['laser'] }, boost: false });
    expect(EMPTY_INVENTORY.charges).toEqual([]);
  });

  it('holds at most a few charges; a weapon past that is a booster', () => {
    let inv = EMPTY_INVENTORY;
    for (let i = 0; i < CHARGES_MAX; i++) inv = take(inv, 'shot').inv;
    expect(inv.charges).toHaveLength(CHARGES_MAX);
    const full = take(inv, 'shark');
    expect(full.boost).toBe(true);
    expect(full.inv).toBe(inv);
  });

  it('spends the oldest charge, or the oldest of the one asked for', () => {
    const inv = { charges: ['shot', 'laser', 'shot'] as const }.charges.slice();
    const held = { charges: inv };
    expect(spend(held)).toEqual({ inv: { charges: ['laser', 'shot'] }, used: 'shot' });
    expect(spend(held, 'laser')).toEqual({ inv: { charges: ['shot', 'shot'] }, used: 'laser' });
    expect(spend(held, 'shark')).toEqual({ inv: held, used: null });
    expect(spend(EMPTY_INVENTORY)).toEqual({ inv: EMPTY_INVENTORY, used: null });
    expect(held.charges).toEqual(['shot', 'laser', 'shot']);
  });
});

describe('the booster’s burst', () => {
  it('is nothing before and after its life', () => {
    expect(boosterAccel(-0.01)).toBe(0);
    expect(boosterAccel(BOOSTER.LIFE)).toBe(0);
    expect(boosterAccel(Number.NaN)).toBe(0);
  });

  it('comes in smoothly, holds its pull, then eases away', () => {
    expect(boosterAccel(0)).toBe(0);
    expect(boosterAccel(BOOSTER.RISE / 2)).toBeCloseTo(BOOSTER.PULL / 2, 6);
    expect(boosterAccel(BOOSTER.RISE)).toBe(BOOSTER.PULL);
    expect(boosterAccel((BOOSTER.RISE + BOOSTER.HOLD) / 2)).toBe(BOOSTER.PULL);
    let last = BOOSTER.PULL;
    for (let t = BOOSTER.HOLD; t < BOOSTER.LIFE; t += 0.05) {
      const a = boosterAccel(t);
      expect(a).toBeLessThanOrEqual(last + 1e-9);
      last = a;
    }
    expect(boosterAccel(BOOSTER.LIFE - 1e-6)).toBeLessThan(0.01);
  });

  it('adds a few tens of km/h, a burst and not a launch', () => {
    let dv = 0;
    for (let t = 0; t < BOOSTER.LIFE; t += 0.001) dv += boosterAccel(t) * 0.001;
    expect(dv * 3.6).toBeGreaterThan(50);
    expect(dv * 3.6).toBeLessThan(140);
  });
});
