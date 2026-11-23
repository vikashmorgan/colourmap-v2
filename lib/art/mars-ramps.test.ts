import { describe, expect, it } from 'vitest';
import type { Controls } from './drive';
import { DECKS, distToLoop, KICKERS, MARS_TERRAIN, marsBase, marsHeight } from './mars';
import { DECK, deckHeight, KICKER, type Kicker, kickerHeight, rampHeight } from './mars-ramps';
import { newVehicle, stepVehicle } from './vehicle';

const k: Kicker = { x: 0, y: 0, h: 0, len: 26, height: 7, width: 9 };

describe('kickers', () => {
  it('rise from nothing to the lip, steeper toward it, and fall away behind', () => {
    expect(kickerHeight(k, -1, 0)).toBe(0);
    expect(kickerHeight(k, 0, 0)).toBe(0);
    expect(kickerHeight(k, k.len, 0)).toBeCloseTo(k.height, 9);
    const a = kickerHeight(k, 6.5, 0) - kickerHeight(k, 0, 0);
    const b = kickerHeight(k, k.len, 0) - kickerHeight(k, k.len - 6.5, 0);
    expect(b).toBeGreaterThan(a);
    expect(kickerHeight(k, k.len + KICKER.back, 0)).toBe(0);
    expect(kickerHeight(k, k.len + KICKER.back / 2, 0)).toBeCloseTo(k.height / 2, 9);
  });

  it('are as wide as they say, tapering at the edges', () => {
    expect(kickerHeight(k, 20, k.width / 2)).toBeGreaterThan(0);
    expect(kickerHeight(k, 20, k.width / 2 + 0.5)).toBeLessThan(kickerHeight(k, 20, 0));
    expect(kickerHeight(k, 20, k.width / 2 + 1.1)).toBe(0);
  });

  it('turn with their heading', () => {
    const north = { ...k, h: Math.PI / 2 };
    expect(kickerHeight(north, 0, 20)).toBeCloseTo(kickerHeight(k, 20, 0), 9);
    expect(kickerHeight(north, 20, 0)).toBe(0);
  });

  it('stand by the factories and on the plain, clear of his loop', () => {
    expect(KICKERS.length).toBeGreaterThanOrEqual(6);
    for (const q of KICKERS) {
      expect(distToLoop(q.x, q.y)).toBeGreaterThan(40);
      expect(marsHeight(q.x + Math.cos(q.h) * q.len, q.y + Math.sin(q.h) * q.len)).toBeGreaterThan(
        marsBase(q.x + Math.cos(q.h) * q.len, q.y + Math.sin(q.h) * q.len) + q.height * 0.9,
      );
    }
  });

  it('throw a car flat out into the air', () => {
    const q = KICKERS[0];
    const v = newVehicle('car', q.x - Math.cos(q.h) * 60, q.y - Math.sin(q.h) * 60, q.h);
    v.vx = Math.cos(q.h) * 60;
    v.vy = Math.sin(q.h) * 60;
    v.z = marsHeight(v.x, v.y);
    const go: Controls = { throttle: 1, steer: 0, boost: 1 };
    let air = 0;
    let top = -1e9;
    for (let i = 0; i < 60 * 4; i++) {
      stepVehicle(v, go, 1 / 60, MARS_TERRAIN, i / 60);
      if (v.air) air += 1 / 60;
      top = Math.max(top, v.z - marsBase(v.x, v.y));
    }
    expect(air).toBeGreaterThan(0.8);
    expect(top).toBeGreaterThan(q.height);
  });
});

describe('decks on the pipelines', () => {
  const d = {
    ax: 0,
    ay: 0,
    bx: 300,
    by: 0,
    height: DECK.height,
    width: DECK.width,
    ramp: DECK.ramp,
  };

  it('ramp up at each end to a flat top, with sloping sides', () => {
    expect(deckHeight(d, -1, 0)).toBe(0);
    expect(deckHeight(d, 0, 0)).toBe(0);
    expect(deckHeight(d, DECK.ramp / 2, 0)).toBeCloseTo(DECK.height / 2, 9);
    expect(deckHeight(d, 150, 0)).toBe(DECK.height);
    expect(deckHeight(d, 150, DECK.width / 2)).toBe(DECK.height);
    expect(deckHeight(d, 150, DECK.width / 2 + DECK.berm / 2)).toBeCloseTo(DECK.height / 2, 9);
    expect(deckHeight(d, 150, DECK.width / 2 + DECK.berm + 0.1)).toBe(0);
    expect(deckHeight(d, 300, 0)).toBe(0);
  });

  it('lie on each long pipeline run, so you can ride the pipes', () => {
    expect(DECKS.length).toBeGreaterThan(0);
    for (const q of DECKS) {
      const mx = (q.ax + q.bx) / 2;
      const my = (q.ay + q.by) / 2;
      expect(marsHeight(mx, my) - marsBase(mx, my)).toBeCloseTo(q.height, 6);
    }
  });

  it('adds the highest of them to the ground', () => {
    expect(rampHeight([k], [d], 150, 0)).toBe(DECK.height);
    expect(rampHeight([k], [], 1000, 1000)).toBe(0);
  });
});
