import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { ARTEFACTS, WRECKS } from '@/lib/art/mars';

import { buildWrecksView } from './mars-wrecks-view';

describe('the wrecks as you see them', () => {
  it('builds every wreck and artefact as whole meshes, shown near you and hidden far off', () => {
    const view = buildWrecksView();
    let meshes = 0;
    view.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        meshes++;
        expect(o.geometry).toBeInstanceOf(THREE.BufferGeometry);
        expect(o.geometry.attributes.position.count).toBeGreaterThan(0);
      }
    });
    // A shell, a floor and a trench per wreck; a body per artefact.
    expect(meshes).toBeGreaterThanOrEqual(WRECKS.length * 3 + ARTEFACTS.length);
    const w = WRECKS[0];
    view.update(w.x, w.y, 1, 1 / 60);
    for (let i = 0; i < 120; i++) view.update(w.x, w.y, 1 + i / 60, 1 / 60);
    const shown = view.group.children.filter((c) => c.visible && c instanceof THREE.Group);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(WRECKS.length + ARTEFACTS.length);
    view.dispose();
  });
});
