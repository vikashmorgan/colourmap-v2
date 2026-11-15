import { describe, expect, it } from 'vitest';

import { PHASES, setVariant, variantLabel, variantNames } from './city';
import { missingChars } from './city-font';
import { Mesh } from './grain-mesh';
import {
  BAR_DESIGNS,
  barModel,
  buildBar,
  nameSign,
  SPACE_BARS,
  STUDIO_BAR,
  spaceBarEye,
} from './space-bars';

const k = PHASES.findIndex((p) => p.id === 'space-bars');

describe('the Space Bar series (2026-11-14: "add 5 space bars to the designs as a category of its own")', () => {
  it('is registered as its own piece in the designs, five bars, one a pill, the Flying Saloon first', () => {
    expect(k).toBeGreaterThan(0);
    expect(PHASES[k]?.name).toBe('Space bars');
    expect(SPACE_BARS.names).toHaveLength(5);
    expect(variantNames(k)).toEqual(SPACE_BARS.names);
    expect(variantLabel(k)).toBe('Space bar');
    expect(SPACE_BARS.names[0]).toBe('Flying Saloon');
    expect(SPACE_BARS.names).toContain('Golden Lounge');
    expect(new Set(SPACE_BARS.names).size).toBe(5);
    for (const D of BAR_DESIGNS) expect(D.idea.length).toBeGreaterThan(40);
  });

  it('gives every bar a name sign over it, in letters the sign face can draw', () => {
    for (const [i, D] of BAR_DESIGNS.entries()) {
      expect(missingChars(D.sign, 'deco')).toEqual([]);
      const M = barModel(i);
      // The sign's letters stand over most of the building: its foot is high in the bar.
      expect(D.signY).toBeGreaterThan(0.5 * (M.top - M.lo) + M.lo);
      expect(M.top).toBeGreaterThan(D.signY);
    }
  });

  it('reads its name the right way from the front and from behind', () => {
    const [front, back] = nameSign('AB', 10, 1, [1, 1, 1], [1, 1, 1]);
    const f0 = (front as NonNullable<typeof front>).f(0.01, 0, 0);
    const b0 = (back as NonNullable<typeof back>).f(0.01, 0, 0);
    // The first letter: on the left seen from +z, on the left seen from -z (so x mirrored).
    expect(f0[0]).toBeLessThan(0);
    expect(b0[0]).toBeGreaterThan(0);
    expect(f0[2]).toBeGreaterThan(0);
    expect(b0[2]).toBeLessThan(0);
  });

  it('builds each bar big, with warm lamps on its terraces, finite, mellow', () => {
    for (let i = 0; i < 5; i++) {
      const M = barModel(i);
      expect(M.r).toBeGreaterThan(15);
      expect(M.r).toBeLessThan(32);
      expect(M.top - M.lo).toBeGreaterThan(30);
      expect(M.count).toBeGreaterThan(1000);
      expect(M.count).toBeLessThan(5000);
      let lamps = 0;
      let s = 0;
      for (const p of M.parts) {
        if ((p.tw ?? 0) > 0) lamps += p.n;
        // Softly twinkling at most: never a flash.
        expect(p.tw ?? 0).toBeLessThanOrEqual(0.2);
        for (const c of p.rgb) expect(c).toBeLessThanOrEqual(1);
        // Warm: red at least as strong as blue.
        expect(p.rgb[0]).toBeGreaterThanOrEqual(p.rgb[2] - 0.15);
        for (let j = 0; j < p.n; j += 5) {
          expect(p.f((j + 0.5) / p.n, s + j, 13).every(Number.isFinite)).toBe(true);
        }
        s += p.n;
      }
      expect(lamps).toBeGreaterThan(40);
    }
  });

  it('swings the saloon’s doors gently, nothing jumping from one frame to the next', () => {
    const M = barModel(0);
    const doors = M.parts.filter((p) => p.n === 40);
    expect(doors.length).toBeGreaterThan(0);
    for (const p of doors) {
      let prev = p.f(0.5, 0, 0);
      for (let t = 1 / 60; t < 20; t += 1 / 60) {
        const q = p.f(0.5, 0, t);
        expect(Math.hypot(q[0] - prev[0], q[2] - prev[2])).toBeLessThan(0.05);
        prev = q;
      }
    }
  });

  it('draws each pill in the Studio floating over its plaza, the eye round it', () => {
    for (let i = 0; i < 5; i++) {
      const m = new Mesh();
      buildBar(m, i);
      expect(m.lines.length + m.dots.length).toBeGreaterThan(500);
      for (let j = 1; j < m.dots.length; j += 4)
        expect(m.dots[j] as number).toBeGreaterThan(
          -16 + STUDIO_BAR.y + barModel(i).lo * STUDIO_BAR.s - 1,
        );
    }
    const a = spaceBarEye(0);
    const b = spaceBarEye(10);
    expect(a.eye).not.toEqual(b.eye);
    expect(a.target).toEqual(b.target);
    setVariant(4, k);
    setVariant(0, k);
  });
});
