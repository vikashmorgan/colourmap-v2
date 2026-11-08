import { describe, expect, it } from 'vitest';

import {
  ADN_GROOVE,
  ADN_HEIGHT,
  ADN_RADIUS,
  helixPoint,
  project,
  rungCount,
  rungPoint,
  rungU,
} from './adn';

describe('ADN, the double helix', () => {
  it('keeps both strands on the helix, from the bottom to the top', () => {
    for (const strand of [0, 1] as const) {
      for (const u of [0, 0.3, 0.77, 1]) {
        const [x, y, z] = helixPoint(u, strand, 4, 1.2);
        expect(Math.hypot(x, z)).toBeCloseTo(ADN_RADIUS);
        expect(y).toBeCloseTo(-ADN_HEIGHT + 2 * ADN_HEIGHT * u);
      }
    }
  });

  it('sets the strands apart by the groove, and turns them with the spin', () => {
    const [ax, , az] = helixPoint(0.4, 0, 3, 0);
    const [bx, , bz] = helixPoint(0.4, 1, 3, 0);
    const between = Math.abs(Math.atan2(az, ax) - Math.atan2(bz, bx));
    expect(Math.min(between, Math.PI * 2 - between)).toBeCloseTo(ADN_GROOVE);
    const turned = helixPoint(0.4, 0, 3, 0.5);
    expect(turned[0]).not.toBeCloseTo(ax);
  });

  it('has ten base pairs a turn, each rung joining the two strands', () => {
    expect(rungCount(4)).toBe(40);
    const k = 7;
    const u = rungU(k, 4);
    expect(rungPoint(k, 0, 4, 0.3)).toEqual(helixPoint(u, 0, 4, 0.3));
    const end = rungPoint(k, 1, 4, 0.3);
    helixPoint(u, 1, 4, 0.3).forEach((v, i) => expect(end[i]).toBeCloseTo(v));
  });

  it('projects with the front nearer and brighter than the back', () => {
    const [, , front] = project([0, 0, ADN_RADIUS], 0.28);
    const [, , back] = project([0, 0, -ADN_RADIUS], 0.28);
    expect(front).toBeCloseTo(1);
    expect(back).toBeCloseTo(0);
    const [fx] = project([0.1, 0, ADN_RADIUS], 0.28);
    const [bx] = project([0.1, 0, -ADN_RADIUS], 0.28);
    expect(fx).toBeGreaterThan(bx);
  });
});
