import { describe, expect, it } from 'vitest';

import {
  fabricOf,
  GATE_STYLES,
  gateCrossed,
  gatePlan,
  gateStyle,
  NUDGE,
  stationOf,
  stationsBetween,
  WORLD_GATES,
} from '@/lib/art/drive-gates';
import { CANYON, CHINATOWN, COAST, GOLDEN, SKY } from '@/lib/art/track';
import { compileTrack, type TrackData, validateTrackData } from '@/lib/art/track-data';

const ok: TrackData = {
  id: 'gold',
  curve: { waves: [{ amp: 1, period: 2400 }] },
  rise: { waves: [{ amp: 3, period: 1300 }] },
  half: 18,
  lip: 0.45,
  bank: { speed: 70, max: 0.34 },
  terrain: 0,
  barrier: 1.5,
};

describe('a gate’s style in a track document', () => {
  it('accepts every named look and refuses any other', () => {
    for (const style of GATE_STYLES)
      expect(validateTrackData({ ...ok, features: [{ kind: 'gate', every: 800, style }] })).toEqual(
        [],
      );
    expect(
      validateTrackData({
        ...ok,
        features: [{ kind: 'gate', every: 800, style: 'gold' as never }],
      })[0],
    ).toMatch(/gate's style is one of fire, halo, glow, chrome, rust, fabric/);
  });

  it('compiles into the track’s gate', () => {
    const def = compileTrack({ ...ok, features: [{ kind: 'gate', every: 800, style: 'rust' }] });
    expect(def.gate).toEqual({ every: 800, style: 'rust' });
    expect(compileTrack({ ...ok, features: [{ kind: 'gate', every: 900 }] }).gate).toEqual({
      every: 900,
    });
    expect(compileTrack(ok).gate).toBeUndefined();
  });
});

describe('each world’s looks', () => {
  it('gives every world a round of real looks, Mars rust first', () => {
    for (const round of Object.values(WORLD_GATES)) {
      expect(round.length).toBeGreaterThan(0);
      for (const s of round) expect(GATE_STYLES).toContain(s);
    }
    expect(WORLD_GATES.mars[0]).toBe('rust');
    expect(WORLD_GATES.chinatown[0]).toBe('fabric');
    expect(WORLD_GATES.neon[0]).toBe('fabric');
  });

  it('goes round the world’s looks, unless the track names one', () => {
    const round = WORLD_GATES.gold;
    for (let k = 0; k < 9; k++) expect(gateStyle('gold', k)).toBe(round[k % round.length]);
    expect(gateStyle('gold', 5, 'chrome')).toBe('chrome');
    expect(gateStyle('mars', -1)).toBe(WORLD_GATES.mars[WORLD_GATES.mars.length - 1]);
  });

  it('dresses the fabric gates in the place’s cloth', () => {
    expect(fabricOf('chinatown').base[0]).toBeGreaterThan(fabricOf('chinatown').base[1] * 5);
    expect(fabricOf('neon').mesh).toBe(true);
    expect(fabricOf('coast').mesh).toBe(false);
  });
});

describe('where the gates stand', () => {
  it('has no road gates on the open plains', () => {
    expect(gatePlan('salt', null)).toBeNull();
    expect(gatePlan('mars', null)).toBeNull();
  });

  it('reads the track’s spacing, else a kilometre', () => {
    expect(gatePlan('coast', COAST)).toMatchObject({ every: 1000, offset: 0, style: null });
    expect(gatePlan('chinatown', CHINATOWN)).toMatchObject({ every: 1000 });
    const own = compileTrack({ ...ok, features: [{ kind: 'gate', every: 700, style: 'glow' }] });
    expect(gatePlan('gold', own)).toMatchObject({ every: 700, style: 'glow' });
  });

  it('stands the canyon’s gates on its checkpoints and none past the finish', () => {
    const plan = gatePlan('canyon', CANYON);
    if (!plan) throw new Error('no plan');
    const ks = stationsBetween(plan, CANYON, 0, 9000).map((st) => st.k);
    expect(ks).toEqual([1, 2, 3, 4]);
  });

  it('stands Sky Canyon’s between the lap doors, tall', () => {
    const plan = gatePlan('sky', SKY);
    if (!plan) throw new Error('no plan');
    expect(plan.tall).toBeGreaterThan(1);
    for (const st of stationsBetween(plan, SKY, 0, 12000)) expect(st.s % 6000).not.toBe(0);
  });

  it('never stands a gate on a twist, a jump, a deck, a fire tunnel or a bridge', () => {
    const plan = gatePlan('gold', GOLDEN);
    if (!plan) throw new Error('no plan');
    const list = stationsBetween(plan, GOLDEN, 0, 24000);
    expect(list.length).toBeGreaterThan(15);
    for (const { s } of list) {
      for (const q of [s - 20, s, s + 20]) {
        expect(GOLDEN.twist?.(q) ?? 0).toBe(0);
        expect(GOLDEN.gap?.(q) ?? false).toBe(false);
        expect(GOLDEN.fire?.(q) ?? false).toBe(false);
        expect(GOLDEN.deck?.(q) ?? 0).toBe(0);
        expect(GOLDEN.bridge?.(q) ?? false).toBe(false);
      }
    }
    // Nudged forward only, and not far.
    for (const { k, s } of list) {
      expect(s).toBeGreaterThanOrEqual(k * plan.every);
      expect(s - k * plan.every).toBeLessThanOrEqual(NUDGE.MAX);
    }
  });

  it('lists the same gate wherever the window starts', () => {
    const plan = gatePlan('gold', GOLDEN);
    if (!plan) throw new Error('no plan');
    const whole = stationsBetween(plan, GOLDEN, 0, 8000);
    const pieces = [0, 2000, 4000, 6000].flatMap((a) =>
      stationsBetween(plan, GOLDEN, a, a + 1999.999),
    );
    expect(pieces).toEqual(whole);
    for (const st of whole) expect(stationOf(plan, GOLDEN, st.k)).toBe(st.s);
  });
});

describe('driving through a gate', () => {
  const plan = gatePlan('coast', COAST);
  if (!plan) throw new Error('no plan');
  const at = stationOf(plan, COAST, 1) as number;

  it('counts a pass between its posts, once', () => {
    expect(gateCrossed(plan, COAST, at - 1, at + 1, 0)).toEqual({ k: 1, s: at });
    expect(gateCrossed(plan, COAST, at, at + 2, 0)).toBeNull();
    expect(gateCrossed(plan, COAST, at - 3, at - 1, 0)).toBeNull();
  });

  it('misses it outside the posts, going backwards, or on a teleport', () => {
    const half = COAST.half(at);
    expect(gateCrossed(plan, COAST, at - 1, at + 1, half + plan.margin + 1)).toBeNull();
    expect(gateCrossed(plan, COAST, at + 1, at - 1, 0)).toBeNull();
    expect(gateCrossed(plan, COAST, at - 500, at + 1, 0)).toBeNull();
  });
});
