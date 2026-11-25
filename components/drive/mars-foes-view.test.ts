import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { makeTrail } from '@/lib/art/drive';
import { marsHeight } from '@/lib/art/mars';
import { spawnFoes } from '@/lib/art/mars-lairs';
import { newVehicle } from '@/lib/art/vehicle';

import { FoeView } from './mars-foes-view';
import { MarsRun } from './mars-run';

const noDust = () => {};

describe('the enemies as you see them', () => {
  it('draws every kind near you, and a wreck going up, without falling over', () => {
    const scene = new THREE.Scene();
    const foes = spawnFoes();
    const view = new FoeView(scene, foes, noDust, marsHeight);
    const spider = foes.find((f) => f.kind === 'spider');
    if (!spider) throw new Error('no spider');
    view.events([{ kind: 'boom', foe: 'spider', x: spider.x, y: spider.y, z: 10 }], 0);
    view.events([{ kind: 'poof', foe: 'ghost', x: spider.x, y: spider.y, z: 3 }], 0);
    for (let i = 0; i < 90; i++) {
      // The spider walks on, its legs stepping.
      spider.x += 0.15;
      view.update(foes, spider.x, spider.y, i / 60, 1 / 60);
    }
    let shown = 0;
    scene.traverse((o) => {
      if (o.visible && o instanceof THREE.Mesh) shown++;
    });
    expect(shown).toBeGreaterThan(10);
    view.dispose();
    expect(scene.children).toHaveLength(0);
  });
});

describe('fighting on Mars', () => {
  function run() {
    const scene = new THREE.Scene();
    const r = new MarsRun(
      {
        scene,
        env: null,
        store: null,
        emitDust: noDust,
        makeTrail: () => ({
          trail: makeTrail(64, 2),
          mesh: new THREE.Mesh(new THREE.BufferGeometry()),
          update() {},
        }),
        view: null,
      },
      'car',
    );
    return r;
  }

  it('wrecks a robot rammed while boosting, bounces you off one without', () => {
    const r = run();
    // Reach into the run's foes: a robot, and you driving at it.
    const foes = (r as unknown as { foes: ReturnType<typeof spawnFoes> }).foes;
    const robot = foes.find((f) => f.kind === 'robot');
    if (!robot) throw new Error('no robot');
    const v = newVehicle('car', robot.x - 2, robot.y, 0);
    v.z = marsHeight(v.x, v.y);
    v.vx = 60;
    r.step(1 / 60, 10, v, true, undefined, false);
    expect(robot.dead).toBeNull();
    expect(v.vx).toBeLessThan(0);
    expect(r.where().tally.kills).toBe(0);
    // Boosted, it goes up.
    v.x = robot.x - 2;
    v.y = robot.y;
    v.vx = 60;
    r.step(1 / 60, 11, v, true, undefined, true);
    expect(robot.dead).not.toBeNull();
    expect(r.where().tally.kills).toBe(1);
    expect(r.where().tally.score).toBeGreaterThan(0);
    // A new run brings it back.
    r.reset('car');
    expect(robot.dead).toBeNull();
    expect(r.where().tally.kills).toBe(0);
    r.dispose();
  });
});
