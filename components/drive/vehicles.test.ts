import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  BUBBLES,
  CORES,
  DEFAULT_DESIGN,
  fireById,
  hullById,
  REACTORS,
} from '@/lib/art/drive-design';
import { newVehicle } from '@/lib/art/vehicle';

import { buildShip, reactorLayout } from './vehicles';

const fire = fireById(DEFAULT_DESIGN.fire);

describe('the spaceship creator', () => {
  it('places one, two or four reactors, the top one above the hull', () => {
    expect(reactorLayout('side')).toHaveLength(2);
    expect(reactorLayout('quad')).toHaveLength(4);
    const top = reactorLayout('top');
    expect(top).toHaveLength(1);
    expect(top[0].x).toBe(0);
    expect(top[0].y).toBeGreaterThan(1);
  });

  it('builds every mix of reactors, cockpit and core, always with two trails', () => {
    const v = newVehicle('ship', 0, 0, 0);
    for (const r of REACTORS)
      for (const b of BUBBLES)
        for (const c of CORES) {
          const ship = buildShip(hullById('gold'), fire, null, {
            reactors: r.id,
            bubble: b.id,
            core: c.id,
          });
          expect(ship.nozzles).toHaveLength(2);
          expect(() => ship.update(v, 1, 0.016, 1, 0.5, 0.5)).not.toThrow();
          ship.dispose();
        }
  });

  it('lights its core in the fire’s colour, and follows a change of fire', () => {
    const ship = buildShip(hullById('gold'), fire, null, {
      reactors: 'side',
      bubble: 'dome',
      core: 'orb',
    });
    const lit: THREE.MeshBasicMaterial[] = [];
    ship.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial)
        lit.push(o.material);
    });
    expect(lit.length).toBeGreaterThan(0);
    const plasma = fireById('plasma');
    ship.setFire(plasma);
    const want = new THREE.Color(...plasma.stops[1]).multiplyScalar(2.2);
    expect(lit.some((m) => m.color.equals(want))).toBe(true);
  });
});
