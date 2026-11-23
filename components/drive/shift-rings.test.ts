import { Color } from 'three';
import { describe, expect, it } from 'vitest';

import { gearRing } from '@/lib/art/gear-rings';
import { ShiftRings } from './shift-rings';

const at = { x: 100, y: 50, z: 2, h: 0, up: [0, 0, 1] as [number, number, number] };

describe('ShiftRings, drawn', () => {
  it('bursts a band round the vehicle, across its way, and slides it back', () => {
    const rings = new ShiftRings();
    const r = gearRing(3, 6);
    if (!r) throw new Error('a ring');
    rings.emit(r, new Color('#ff3020'));
    expect(rings.group.children).toHaveLength(1 + r.echoes);
    rings.update(0.2, at, 100, 50);
    const band = rings.group.children[0];
    // Facing along the heading (+x, which is three's +x): the band's normal is along x.
    const n = band.getWorldDirection(band.position.clone());
    expect(Math.abs(n.x)).toBeCloseTo(1, 5);
    // Slid back behind the vehicle, over the road.
    expect(band.position.x).toBeLessThan(0);
    expect(band.position.y).toBeGreaterThan(2);
    expect(band.scale.x).toBeGreaterThan(0);
  });

  it('adds the cone for the top gear, and is gone once its life is over', () => {
    const rings = new ShiftRings();
    const r = gearRing(6, 6);
    if (!r) throw new Error('a ring');
    rings.emit(r, new Color('#ffffff'));
    expect(rings.group.children).toHaveLength(1 + r.echoes + 1);
    for (let i = 0; i < 200; i++) rings.update(1 / 60, at, 100, 50);
    expect(rings.group.children).toHaveLength(0);
    rings.emit(r, new Color('#ffffff'));
    rings.clear();
    expect(rings.group.children).toHaveLength(0);
    rings.dispose();
  });
});
