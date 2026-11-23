import { describe, expect, it } from 'vitest';
import {
  archThrough,
  GRADE_TIME,
  geigerRate,
  glitchOf,
  gradeShown,
  newGrade,
  stepGrade,
} from './mars-fx';
import { ARCHES, archGate } from './mars-map';

const tunnel = ARCHES.find((a) => a.kind === 'tunnel');
const real = ARCHES.find((a) => a.kind === 'real');
const fire = ARCHES.find((a) => a.kind === 'fire');

/** A move straight through an arch, from 5 m before it to 5 m past. */
function through(a: NonNullable<typeof tunnel>) {
  const c = Math.cos(a.h);
  const s = Math.sin(a.h);
  return [a.x - c * 5, a.y - s * 5, a.x + c * 5, a.y + s * 5] as const;
}

describe('going through an arch', () => {
  it('finds the arch a move went under, and none for a move beside it', () => {
    if (!tunnel || !fire) throw new Error('arches missing');
    expect(archThrough(...through(tunnel))).not.toBeNull();
    expect(archThrough(...through(fire))).toBe(fire);
    const g = archGate(fire);
    // Outside its feet: a move past the arch, not under it.
    const ox = g.bx + (g.bx - fire.x) * 0.5;
    const oy = g.by + (g.by - fire.y) * 0.5;
    const c = Math.cos(fire.h);
    const s = Math.sin(fire.h);
    expect(archThrough(ox - c * 5, oy - s * 5, ox + c * 5, oy + s * 5)).toBeNull();
    expect(archThrough(0, 0, 1, 1)).toBeNull();
  });
});

describe('the grade (old film)', () => {
  it('eases to old film through a tunnel over its time, and back through an iron arch', () => {
    if (!tunnel || !real || !fire) throw new Error('arches missing');
    let g = stepGrade(newGrade(), 1 / 60, tunnel);
    expect(g.target).toBe(1);
    for (let i = 0; i < 60 * GRADE_TIME * 0.5; i++) g = stepGrade(g, 1 / 60, null);
    expect(g.amt).toBeGreaterThan(0.4);
    expect(g.amt).toBeLessThan(0.6);
    for (let i = 0; i < 60 * GRADE_TIME; i++) g = stepGrade(g, 1 / 60, null);
    expect(g.amt).toBe(1);
    // A fire arch changes nothing.
    g = stepGrade(g, 1 / 60, fire);
    expect(g.target).toBe(1);
    g = stepGrade(g, 1 / 60, real);
    expect(g.target).toBe(0);
    for (let i = 0; i < 60 * GRADE_TIME + 2; i++) g = stepGrade(g, 1 / 60, null);
    expect(g.amt).toBe(0);
  });

  it('never moves faster than its time allows (no jump)', () => {
    if (!tunnel) throw new Error('arches missing');
    const g = stepGrade(newGrade(), 0.1, tunnel);
    expect(g.amt).toBeCloseTo(0.1 / GRADE_TIME, 9);
  });

  it('shows eased at both ends', () => {
    expect(gradeShown({ target: 1, amt: 0 })).toBe(0);
    expect(gradeShown({ target: 1, amt: 1 })).toBe(1);
    expect(gradeShown({ target: 1, amt: 0.5 })).toBeCloseTo(0.5, 9);
    expect(gradeShown({ target: 1, amt: 0.1 })).toBeLessThan(0.1);
  });
});

describe('the lakes on the screen and in the ear', () => {
  it('gives a gentle glitch, growing with the radiation', () => {
    expect(glitchOf(0)).toBe(0);
    expect(glitchOf(0.5)).toBeLessThan(glitchOf(1));
    expect(glitchOf(1)).toBeLessThanOrEqual(0.6);
  });

  it('ticks rarely far off and patters near, never a buzz', () => {
    expect(geigerRate(0)).toBeLessThan(0.5);
    expect(geigerRate(0.5)).toBeGreaterThan(geigerRate(0.2));
    expect(geigerRate(1)).toBeLessThan(15);
    expect(geigerRate(5)).toBe(geigerRate(1));
  });
});
