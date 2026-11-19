import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DESIGN, fireById, hullById } from '@/lib/art/drive-design';
import { newVehicle } from '@/lib/art/vehicle';

import { buildBody } from './bodies';
import { buildVehicle } from './vehicles';

const fire = fireById(DEFAULT_DESIGN.fire);

describe('the extra bodies', () => {
  for (const id of ['classic', 'future', 'bike'] as const)
    it(`${id}: builds, spins its wheels, shows its flames only when asked, repaints`, () => {
      const view = buildBody(id, hullById('red'), fire, null);
      const box = new THREE.Box3().setFromObject(view.group);
      const size = box.getSize(new THREE.Vector3());
      expect(size.z).toBeGreaterThan(id === 'bike' ? 1.8 : 4);
      // The ground shadow and tail glow included.
      expect(size.x).toBeLessThan(id === 'bike' ? 1 : 2.7);
      const v = { ...newVehicle('car', 0, 0, 0), vLong: 20 };
      const flames: THREE.Mesh[] = [];
      view.group.traverse((o) => {
        if (o instanceof THREE.Mesh && o.userData.lenK) flames.push(o);
      });
      expect(flames.length).toBeGreaterThan(0);
      // The engine reads two feet for the dust and the tyre marks.
      expect(view.feet).toHaveLength(2);
      view.update(v, 1, 0.1, 1, 0.5, 0);
      expect(flames.every((f) => !f.visible)).toBe(true);
      view.update(v, 1.1, 0.1, 1, 1, 1);
      expect(flames.every((f) => f.visible)).toBe(true);
      expect(() => view.setHull(hullById('gold'), null)).not.toThrow();
      expect(() => view.setFire(fireById('plasma'))).not.toThrow();
      view.dispose();
    });

  it('the bike leans far more than a car for the same roll', () => {
    const roll = { ...newVehicle('car', 0, 0, 0), roll: 0.08 };
    const lean = (id: 'classic' | 'bike') => {
      const view = buildBody(id, hullById('red'), fire, null);
      view.update(roll, 0, 0.016, 1, 0.5, 0);
      return Math.abs(view.group.children[0].rotation.z);
    };
    expect(lean('bike')).toBeGreaterThan(lean('classic') * 4);
  });

  it('buildVehicle picks the body for the car, and ignores it for the ship', () => {
    const car = buildVehicle('car', hullById('red'), fire, null, 'bike');
    const ship = buildVehicle('ship', hullById('red'), fire, null, 'bike');
    const width = (g: THREE.Object3D) =>
      new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).x;
    expect(width(car.group)).toBeLessThan(1);
    expect(width(ship.group)).toBeGreaterThan(2);
  });
});
