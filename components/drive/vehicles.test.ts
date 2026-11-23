import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  BODIES,
  BUBBLES,
  CORES,
  DEFAULT_DESIGN,
  fireById,
  hullById,
  REACTORS,
} from '@/lib/art/drive-design';
import { newVehicle } from '@/lib/art/vehicle';

import { buildShip, buildVehicle, hullMaterial, reactorLayout } from './vehicles';

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

describe('the leopard and the Space Racer (2026-11-21)', () => {
  const metals = (g: THREE.Object3D) => {
    const out: THREE.MeshStandardMaterial[] = [];
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m instanceof THREE.MeshStandardMaterial && !(m instanceof THREE.MeshPhysicalMaterial))
          out.push(m);
    });
    return out;
  };
  const gold = new THREE.Color(hullById('leopard').rim);

  it('gives the leopard gold rims on every car body and gold trim on the ship', () => {
    const v = newVehicle('car', 0, 0, 0);
    // The Future GT and the Space Racer have rims of light: those glow gold.
    const goldLight = gold.clone().multiplyScalar(2.4);
    for (const b of BODIES) {
      const car = buildVehicle('car', hullById('leopard'), fire, null, b.id);
      expect(() => car.update(v, 1, 0.016, 1, 0.5, 0.5)).not.toThrow();
      let lightGold = false;
      car.group.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial)
          lightGold ||= o.material.color.equals(goldLight);
      });
      const metalGold = metals(car.group).some((m) => m.color.equals(gold) && m.metalness === 1);
      expect(metalGold || lightGold).toBe(true);
      car.dispose();
    }
    const ship = buildVehicle('ship', hullById('leopard'), fire, null);
    expect(metals(ship.group).some((m) => m.color.equals(gold))).toBe(true);
    ship.dispose();
  });

  it('puts the rims back to their own colour on another hull', () => {
    const car = buildVehicle('car', hullById('leopard'), fire, null, 'classic');
    car.setHull(hullById('red'), null);
    expect(metals(car.group).some((m) => m.color.equals(gold))).toBe(false);
    car.dispose();
  });

  it('lights the Space Racer in its hull’s colour, and follows a new paint', () => {
    const lit = (g: THREE.Object3D) => {
      const out: THREE.MeshBasicMaterial[] = [];
      g.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial)
          out.push(o.material);
      });
      return out;
    };
    const paint = { ...hullById('paint'), colour: '#ff2a8a' };
    const racer = buildVehicle('car', paint, fire, null, 'racer');
    const want = new THREE.Color('#ff2a8a').multiplyScalar(2.4);
    expect(lit(racer.group).filter((m) => m.color.equals(want)).length).toBeGreaterThan(0);
    const lime = { ...paint, colour: '#7ad62a' };
    racer.setHull(lime, null);
    const want2 = new THREE.Color('#7ad62a').multiplyScalar(2.4);
    expect(lit(racer.group).some((m) => m.color.equals(want2))).toBe(true);
    racer.dispose();
  });
});

describe('old chrome', () => {
  it('is a reflecting metal, hazier and warmer than new chrome, with a rubbed sheen', () => {
    const env = new THREE.Texture();
    const old = hullMaterial(hullById('oldChrome'), env);
    const chrome = hullMaterial(hullById('chrome'), env);
    expect(old.metalness).toBe(1);
    expect(old.envMap).toBe(env);
    expect(old.roughness).toBeGreaterThan(chrome.roughness);
    expect(old.envMapIntensity).toBeLessThan(chrome.envMapIntensity);
    expect(old.envMapIntensity).toBeGreaterThan(1);
    expect(old.sheen).toBeGreaterThan(0);
    expect(old.color.r).toBeGreaterThan(old.color.b);
    old.dispose();
    chrome.dispose();
  });
});
