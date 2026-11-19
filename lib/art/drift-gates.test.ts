import { describe, expect, it } from 'vitest';
import {
  comboOf,
  DRIFT_GATE_HALF,
  DRIFT_GATES,
  DRIFT_GRACE,
  DRIFT_PATH,
  type DriftInput,
  type DriftRun,
  driftRate,
  liveScore,
  newDriftRun,
  stepDrift,
} from './drift-gates';
import { crosses } from './drive';
import { START, START_Y } from './salt-flat-game';

const still = (x: number, y: number): DriftInput => ({
  px: x,
  py: y,
  qx: x,
  qy: y,
  speed: 0,
  slip: 0,
  air: false,
});

/** Drives straight from gate centre to gate centre in steps, sliding or not, from gate `from`. */
function lap(run: DriftRun, slip: number, t0 = 0): { run: DriftRun; t: number } {
  let r = run;
  let t = t0;
  const n = DRIFT_PATH.length;
  // From just before the first gate, through every gate, and back through the first.
  const pts: [number, number][] = [[6, -70], ...DRIFT_PATH, DRIFT_PATH[0], [6, 10]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const steps = 20;
    for (let k = 0; k < steps; k++) {
      const px = ax + ((bx - ax) * k) / steps;
      const py = ay + ((by - ay) * k) / steps;
      const qx = ax + ((bx - ax) * (k + 1)) / steps;
      const qy = ay + ((by - ay) * (k + 1)) / steps;
      t += 0.1;
      r = stepDrift(r, { px, py, qx, qy, speed: 50, slip, air: false }, 0.1, t);
    }
  }
  expect(n).toBe(DRIFT_GATES.length);
  return { run: r, t };
}

describe('the Salt Flat drift gates (2026-11-19)', () => {
  it('lays a loop of gates west of the measured mile, the first just ahead of the start', () => {
    expect(DRIFT_GATES.length).toBeGreaterThanOrEqual(10);
    // The car starts facing north and drives straight through the first gate.
    expect(crosses(START.x, START.y, START.x, START.y + 80, DRIFT_GATES[0])).toBe(true);
    // Every gate is short of the measured mile's start line, and the gates are well spaced: long
    // sweeping runs to carry speed between them.
    for (const [, y] of DRIFT_PATH) expect(y).toBeLessThan(START_Y - 40);
    for (let i = 0; i < DRIFT_PATH.length; i++) {
      const [ax, ay] = DRIFT_PATH[i];
      const [bx, by] = DRIFT_PATH[(i + 1) % DRIFT_PATH.length];
      expect(Math.hypot(bx - ax, by - ay)).toBeGreaterThan(120);
    }
    for (const g of DRIFT_GATES)
      expect(Math.hypot(g.bx - g.ax, g.by - g.ay)).toBeCloseTo(2 * DRIFT_GATE_HALF, 6);
  });

  it('times a lap through the gates in order and keeps the best', () => {
    const first = lap(newDriftRun(), 0);
    expect(first.run.lastTime).not.toBeNull();
    expect(first.run.bestTime).toBe(first.run.lastTime);
    expect(first.run.recordTime).toBe(true);
    // The next lap started at once, at the first gate again.
    expect(first.run.start).not.toBeNull();
    expect(first.run.next).toBe(1);
  });

  it('only counts the next gate: skipping one leaves it waiting', () => {
    let r = stepDrift(newDriftRun(), { ...still(6, -70), qy: -10 }, 0.1, 1);
    expect(r.next).toBe(1);
    const [x2, y2] = DRIFT_PATH[2];
    r = stepDrift(r, { ...still(x2 - 30, y2), qx: x2 + 30 }, 0.1, 2);
    r = stepDrift(r, { ...still(x2, y2 - 30), qy: y2 + 30 }, 0.1, 3);
    expect(r.next).toBe(1);
  });

  it('scores drifts: more for speed and angle, a growing combo, banked after a grace', () => {
    expect(driftRate(50, 0.05)).toBe(0);
    expect(driftRate(5, 0.5)).toBe(0);
    expect(driftRate(60, 0.4)).toBeGreaterThan(driftRate(40, 0.4));
    expect(driftRate(50, 0.5)).toBeGreaterThan(driftRate(50, 0.3));
    expect(comboOf(0)).toBe(1);
    expect(comboOf(4)).toBeGreaterThan(comboOf(1));
    expect(comboOf(60)).toBe(4);

    let r = stepDrift(newDriftRun(), { ...still(6, -70), qy: -10 }, 0.1, 1);
    for (let i = 0; i < 20; i++)
      r = stepDrift(r, { ...still(6, 0), speed: 50, slip: 0.4 }, 0.1, 1.1 + i * 0.1);
    expect(r.pending).toBeGreaterThan(0);
    expect(r.score).toBe(0);
    const held = liveScore(r);
    // Straight again: after the grace the drift is banked.
    for (let i = 0; i < Math.ceil(DRIFT_GRACE / 0.1) + 2; i++)
      r = stepDrift(r, { ...still(6, 0), speed: 50 }, 0.1, 4 + i * 0.1);
    expect(r.pending).toBe(0);
    expect(r.score).toBe(held);
  });

  it('gives a bonus for sliding through a gate, and keeps the best score', () => {
    const clean = lap(newDriftRun(), 0).run;
    expect(clean.lastScore).toBe(0);
    const slid = lap(newDriftRun(), 0.4).run;
    expect(slid.lastScore).toBeGreaterThan(0);
    expect(slid.bestScore).toBe(slid.lastScore);
    expect(slid.recordScore).toBe(true);
    // Nothing scores before the first gate, or in the air.
    const before = stepDrift(newDriftRun(), { ...still(6, -70), speed: 50, slip: 0.5 }, 1, 1);
    expect(liveScore(before)).toBe(0);
  });
});
