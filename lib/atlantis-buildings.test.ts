import { describe, expect, it } from 'vitest';

import { ATLANTIS_BUILDINGS, ATLANTIS_RATIOS } from './atlantis-buildings';
import { building } from './golden-city';
import { PHI } from './grain-mesh';

describe('Atlantis buildings (2026-11-13)', () => {
  it('has six buildings, then a cluster, a compartment and a quarter', () => {
    expect(ATLANTIS_BUILDINGS.names).toEqual([
      'Porthole tower',
      'Pearl dome',
      'Coral temple',
      'Kelp spire',
      'Submarine pen',
      'Jelly lighthouse',
      'Dome cluster',
      'Compartment',
      'Atlantis quarter',
    ]);
    expect(ATLANTIS_BUILDINGS.rung).toEqual([0, 0, 0, 0, 0, 0, 1, 2, 3]);
    expect(ATLANTIS_BUILDINGS.label).toBe('Atlantis');
  });

  it('stands on the seabed, not a plaza', () => {
    expect(ATLANTIS_BUILDINGS.floor).toBeTypeOf('function');
  });

  it('builds its sizes from powers of φ', () => {
    const [a, b, c] = ATLANTIS_RATIOS.temple as [number, number, number];
    expect(a / b).toBeCloseTo(PHI);
    expect(b / c).toBeCloseTo(PHI);
    const [t0, t1] = ATLANTIS_RATIOS.tower as [number, number];
    expect((t0 / t1) ** 2).toBeCloseTo(PHI);
    expect(ATLANTIS_RATIOS.spire.height / ATLANTIS_RATIOS.spire.base).toBeCloseTo(PHI ** 4);
  });

  it('builds every pill into lines, faces and dots', () => {
    for (let i = 0; i < ATLANTIS_BUILDINGS.names.length; i++) {
      const b = building(ATLANTIS_BUILDINGS, i);
      expect(b.lines.length + b.tris.length + b.dots.length).toBeGreaterThan(0);
    }
  });
});
