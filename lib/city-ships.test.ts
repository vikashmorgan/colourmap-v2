// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { makeParticles, type Vec3 } from './bigbang';
import {
  currentShip,
  loadShip,
  SHIP_KEY,
  SHIP_NAMES,
  SHIPS,
  setShip,
  shipAxes,
  shipGrainAt,
  shipGrainColour,
  shipIndex,
} from './city-ships';

beforeEach(() => {
  window.localStorage.clear();
  setShip(0);
});

describe('the ships', () => {
  it('are four designs of our own, each with its own instruments', () => {
    expect(SHIP_NAMES).toEqual(['Arrow', 'Manta', 'Ring racer', 'Hauler']);
    expect(new Set(SHIPS.map((s) => s.display)).size).toBe(4);
  });

  it('fly differently: the Arrow the measure, the Ring racer fastest, the Hauler slowest, the Manta nimblest', () => {
    const by = (id: string) => SHIPS.find((s) => s.id === id)?.handling;
    expect(by('arrow')).toEqual({ speed: 1, turn: 1, boost: 1, climb: 1 });
    const speeds = SHIPS.map((s) => s.handling.speed);
    expect(by('ring')?.speed).toBe(Math.max(...speeds));
    expect(by('hauler')?.speed).toBe(Math.min(...speeds));
    expect(by('manta')?.turn).toBe(Math.max(...SHIPS.map((s) => s.handling.turn)));
    for (const s of SHIPS) {
      for (const v of Object.values(s.handling)) {
        expect(v).toBeGreaterThan(0.5);
        expect(v).toBeLessThan(1.5);
      }
    }
  });

  it('remembers the ship chosen on the device, and brings it back', () => {
    setShip(2);
    expect(currentShip().id).toBe('ring');
    expect(window.localStorage.getItem(SHIP_KEY)).toBe('ring');
    setShip(0);
    window.localStorage.setItem(SHIP_KEY, 'hauler');
    loadShip();
    expect(shipIndex()).toBe(3);
    // Anything unknown leaves the choice alone; out of range is kept in range.
    window.localStorage.setItem(SHIP_KEY, 'x-wing');
    loadShip();
    expect(currentShip().id).toBe('hauler');
    setShip(99);
    expect(currentShip().id).toBe('hauler');
    setShip(-3);
    expect(currentShip().id).toBe('arrow');
  });

  it('builds every ship of finite grains around itself, the engines in its glow', () => {
    const ps = makeParticles(600);
    const c: Vec3 = [10, 5, -20];
    const f: Vec3 = [0, 0, -1];
    for (const s of SHIPS) {
      const parts = new Set<string>();
      for (const p of ps) {
        const g = shipGrainAt(s.id, c, f, s.len, p, 1, 0.3);
        parts.add(g.part);
        for (const v of g.pos) expect(Number.isFinite(v)).toBe(true);
        const d = Math.hypot(g.pos[0] - c[0], g.pos[1] - c[1], g.pos[2] - c[2]);
        expect(d).toBeLessThan(s.len * 1.6);
        const rgb = shipGrainColour(s.id, g.part, p, 1);
        for (const v of rgb) expect(v).toBeGreaterThanOrEqual(0);
      }
      expect([...parts].sort()).toEqual(['engine', 'hull', 'spine', 'trail']);
    }
  });

  it('keeps a sideways axis even flying straight up', () => {
    const { side, up } = shipAxes([0, 1, 0], 0);
    expect(Math.hypot(...side)).toBeCloseTo(1);
    expect(Math.hypot(...up)).toBeCloseTo(1);
  });
});
