import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DESIGN, fireById, hullById } from '@/lib/art/drive-design';
import { newVehicle } from '@/lib/art/vehicle';

import { buildBody } from './bodies';
import { buildVehicle } from './vehicles';

const fire = fireById(DEFAULT_DESIGN.fire);

describe('the extra bodies', () => {
  for (const id of ['classic', 'future', 'bike', 'cycle', 'ufo', 'garbage'] as const)
    it(`${id}: builds, spins its wheels, shows its flames only when asked, repaints`, () => {
      const view = buildBody(id, hullById('red'), fire, null);
      const box = new THREE.Box3().setFromObject(view.group);
      const size = box.getSize(new THREE.Vector3());
      const twoWheels = id === 'bike' || id === 'cycle';
      const hover = id === 'ufo' || id === 'garbage';
      expect(size.z).toBeGreaterThan(twoWheels ? 1.8 : hover ? 2.4 : 4);
      // The ground shadow and tail glow included.
      expect(size.x).toBeLessThan(twoWheels ? 1 : 2.7);
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

  it('the classic GT: wider haunches at the back, a narrower glasshouse, lamps on its tail', () => {
    const view = buildBody('classic', hullById('red'), fire, null);
    view.update(newVehicle('car', 0, 0, 0), 0, 0.016, 1, 0.5, 0);
    view.group.updateMatrixWorld(true);
    const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
    const meshes: THREE.Mesh[] = [];
    view.group.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    // The tail lamps: red, glowing past white, facing back from the very tail.
    const lamps = meshes.filter(
      (m) =>
        m.material instanceof THREE.MeshBasicMaterial &&
        m.material.color.r > 2 &&
        m.material.color.g < 0.5,
    );
    expect(lamps).toHaveLength(4);
    // The shell's tail (the first mesh in the body).
    const tail = box(meshes[0]).min.z;
    for (const l of lamps) expect(box(l).min.z).toBeLessThan(tail + 0.05);
    // The rear wheels sit wider than the front ones (the stance).
    const wheels = view.group.children.filter(
      (c) => c instanceof THREE.Group && c !== view.group.children[0],
    );
    const xs = wheels.map((w) => [Math.abs(w.position.x), w.position.z]);
    const rear = xs.filter(([, z]) => z < 2).map(([x]) => x);
    const front = xs.filter(([, z]) => z > 2).map(([x]) => x);
    expect(Math.min(...rear)).toBeGreaterThan(Math.max(...front));
    // Glass on the glasshouse, narrower than the body.
    const glass = meshes.filter(
      (m) => m.material instanceof THREE.MeshPhysicalMaterial && m.material.transparent,
    );
    expect(glass.length).toBeGreaterThanOrEqual(3);
    const bodyW = box(view.group.children[0]).getSize(new THREE.Vector3()).x;
    const sidePane = glass
      .map((g) => box(g).getSize(new THREE.Vector3()).x)
      .sort((a, b) => b - a)[2];
    expect(sidePane).toBeLessThan(bodyW * 0.95);
    view.dispose();
  });

  it('the UFO and the Garbage Ride float: no wheels, a gentle bob, lamps that never go dark', () => {
    for (const id of ['ufo', 'garbage'] as const) {
      const view = buildBody(id, hullById('oldChrome'), fire, null);
      const body = view.group.children[0];
      const v = newVehicle('car', 0, 0, 0);
      const heights: number[] = [];
      for (let t = 0; t < 4; t += 0.25) {
        view.update(v, t, 0.25, 1, 0.5, 0);
        heights.push(body.position.y);
      }
      expect(Math.min(...heights)).toBeGreaterThan(0.4);
      const bob = Math.max(...heights) - Math.min(...heights);
      expect(bob).toBeGreaterThan(0.02);
      expect(bob).toBeLessThan(0.2);
      const lamps: THREE.MeshBasicMaterial[] = [];
      view.group.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          o.material instanceof THREE.MeshBasicMaterial &&
          o.material.toneMapped === false
        )
          lamps.push(o.material);
      });
      expect(lamps.length).toBeGreaterThan(0);
      for (let t = 0; t < 6; t += 0.1) {
        view.update(v, t, 0.1, 1, 0.5, 0);
        for (const m of lamps)
          expect(Math.max(m.color.r, m.color.g, m.color.b)).toBeGreaterThan(0.5);
      }
      view.dispose();
    }
  });

  it('the Garbage Ride coughs puffs of smoke that rise and fade', () => {
    const view = buildBody('garbage', hullById('red'), fire, null);
    const puffs: THREE.Sprite[] = [];
    view.group.traverse((o) => {
      if (
        o instanceof THREE.Sprite &&
        (o.material as THREE.SpriteMaterial).blending === THREE.NormalBlending
      )
        puffs.push(o);
    });
    expect(puffs.length).toBe(3);
    const v = newVehicle('car', 0, 0, 0);
    const seen = new Set<number>();
    for (let t = 0; t < 2; t += 0.1) {
      view.update(v, t, 0.1, 1, 0.5, 0);
      seen.add(Math.round((puffs[0].material as THREE.SpriteMaterial).opacity * 10));
    }
    expect(seen.size).toBeGreaterThan(2);
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

  it('the light cycle’s lights take the hull’s own colour, and follow a repaint', () => {
    const view = buildBody('cycle', hullById('chrome'), fire, null);
    const lights = new Set<THREE.MeshBasicMaterial>();
    view.group.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshBasicMaterial &&
        !o.material.transparent
      )
        lights.add(o.material);
    });
    const glow = [...lights].find((m) => Math.max(m.color.r, m.color.g, m.color.b) > 1);
    expect(glow).toBeTruthy();
    const before = glow?.color.clone();
    view.setHull(hullById('red'), null);
    expect(glow?.color.equals(before as THREE.Color)).toBe(false);
    view.dispose();
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
