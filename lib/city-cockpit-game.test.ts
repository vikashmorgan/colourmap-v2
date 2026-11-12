// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import { FLY_SPEED, flier, gauges, PHASES, pieceCamera, setFly, shipNow } from './city';
import { camView, setView } from './city-cockpit';
import { SHIPS, setShip } from './city-ships';

const k = PHASES.findIndex((p) => p.id === 'ship');
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Takes the controls at t, then flies `seconds` with `keys` held; the time it ends at. */
function fly(keys: string[], seconds: number, t0 = 10): number {
  setFly(false, [], 0, t0);
  setFly(true, [], 1 / 60, t0);
  let t = t0;
  for (let i = 0; i < seconds * 60; i++) {
    t += 1 / 60;
    setFly(true, keys, 1 / 60, t);
  }
  return t;
}

beforeEach(() => {
  window.localStorage.clear();
  setShip(0);
  setView(0);
});
afterEach(() => {
  setShip(0);
  setView(0);
  setFly(false, [], 0, 0);
});

describe('Ships, cockpits: in the game', () => {
  it('flies each ship at its own pace: the Ring racer outruns the Hauler', () => {
    const speedOf = (i: number) => {
      setShip(i);
      fly(['e'], 3);
      return gauges().find((g) => g.label === 'Speed')?.value as number;
    };
    const ring = speedOf(SHIPS.findIndex((s) => s.id === 'ring'));
    const hauler = speedOf(SHIPS.findIndex((s) => s.id === 'hauler'));
    const arrow = speedOf(0);
    expect(ring).toBeGreaterThan(arrow);
    expect(arrow).toBeGreaterThan(hauler);
    expect(arrow).toBeCloseTo(FLY_SPEED * 1.8, 0);
  });

  it('turns each ship at its own rate: the Manta turns further than the Hauler in a second', () => {
    const turned = (i: number) => {
      setShip(i);
      const t0 = fly([], 0.1);
      const a = flier(t0).f;
      const t = fly(['d'], 1, t0);
      const b = flier(t).f;
      return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[2] * b[2])));
    };
    expect(turned(SHIPS.findIndex((s) => s.id === 'manta'))).toBeGreaterThan(
      turned(SHIPS.findIndex((s) => s.id === 'hauler')),
    );
  });

  it('reads the heading and the district on the instruments', () => {
    fly([], 0.5);
    const g = gauges();
    const heading = g.find((d) => d.label === 'Heading');
    expect(heading?.kind).toBe('compass');
    expect(heading?.value).toBeGreaterThanOrEqual(0);
    expect(heading?.value).toBeLessThan(360);
    expect(g.find((d) => d.label === 'District')?.text?.length).toBeGreaterThan(3);
  });

  it('V moves the camera from behind the ship to the pilot seat and back', () => {
    const t = fly([], 0.5);
    const chase = pieceCamera(k, t);
    const { c } = flier(t);
    expect(dist(chase.eye, c)).toBeGreaterThan(8);
    setFly(true, ['v'], 1 / 60, t + 1 / 60);
    expect(camView()).toBe('cockpit');
    const pov = pieceCamera(k, t + 1 / 60);
    const c2 = flier(t + 1 / 60).c;
    expect(dist(pov.eye, c2)).toBeLessThan(1);
    expect(typeof pov.roll).toBe('number');
    // Held, it does not flicker; pressed again, back behind the ship.
    setFly(true, ['v'], 1 / 60, t + 2 / 60);
    expect(camView()).toBe('cockpit');
    setFly(true, [], 1 / 60, t + 3 / 60);
    setFly(true, ['v'], 1 / 60, t + 4 / 60);
    expect(camView()).toBe('chase');
    expect(dist(pieceCamera(k, t + 4 / 60).eye, flier(t + 4 / 60).c)).toBeGreaterThan(8);
  });

  it('banks the cockpit view in a turn', () => {
    setView(1);
    const t = fly(['d'], 1);
    expect(Math.abs(pieceCamera(k, t).roll ?? 0)).toBeGreaterThan(0.1);
  });

  it('gives the map where the ship is now', () => {
    const t = fly([], 0.5);
    expect(shipNow().c).toEqual(flier(t).c);
  });
});
