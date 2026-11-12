import { describe, expect, it } from 'vitest';

import { makeParticles } from './bigbang';
import { Anim, Mesh, onMesh, PHI, Tone } from './grain-mesh';

const ps = makeParticles(4000);

describe('grain mesh', () => {
  it('knows φ', () => {
    expect(PHI * PHI).toBeCloseTo(PHI + 1, 12);
  });

  it('shares grains out fairly: lines by length, faces by area', () => {
    const m = new Mesh();
    m.line([0, 0, 0], [1, 0, 0], Tone.edge);
    m.line([0, 5, 0], [3, 5, 0], Tone.road);
    m.quad([0, 0, 10], [1, 0, 0], [0, 1, 0], Tone.face);
    m.quad([0, 0, 20], [3, 0, 0], [0, 1, 0], Tone.glass);
    const B = m.build();
    let short = 0;
    let small = 0;
    for (const p of ps) {
      if (onMesh(B, p, 0.1, 0, [0, 0, 50], { lines: 0.5, faces: 1 }).tone === Tone.edge) short++;
      if (onMesh(B, p, 0.7, 0, [0, 0, 50], { lines: 0.5, faces: 1 }).tone === Tone.face) small++;
    }
    expect(short / ps.length).toBeCloseTo(0.25, 1);
    expect(small / ps.length).toBeCloseTo(0.25, 1);
  });

  it('lights faces that look at the eye, and keeps those turned away faint', () => {
    const m = new Mesh();
    m.line([0, 0, 0], [1, 0, 0], Tone.edge);
    m.box([0, 0, 0], 2, 4, 2, Tone.face, Tone.edge);
    const B = m.build();
    let front = 0;
    let back = 0;
    let nf = 0;
    let nb = 0;
    for (const p of ps) {
      const h = onMesh(B, p, 0.9, 0, [0, 2, 40], { lines: 0.5, faces: 1 });
      if (h.pos[2] > 1.99) {
        front += h.lit;
        nf++;
      } else if (h.pos[2] < -1.99) {
        back += h.lit;
        nb++;
      }
    }
    expect(front / nf).toBeGreaterThan(0.8);
    expect(back / nb).toBeLessThan(0.2);
  });

  it('moves grains gently: steam rises and fades, lights flow, lattices breathe and turn', () => {
    const m = new Mesh();
    m.pivot = [0, 0, 0];
    m.line([0, 0, 0], [10, 0, 0], Tone.light, { anim: Anim.flow, key: 2 });
    m.dot([0, 0, 0], 0.1, Tone.steam, { anim: Anim.rise, key: 6 });
    const B = m.build();
    const p = ps[7] as (typeof ps)[number];
    const a = onMesh(B, p, 0.1, 0, [0, 0, 20], { lines: 0.5, faces: 0.5 });
    const b = onMesh(B, p, 0.1, 1, [0, 0, 20], { lines: 0.5, faces: 0.5 });
    expect(Math.abs(b.pos[0] - a.pos[0])).toBeGreaterThan(0.5);
    const heights = ps.map(
      (q) => onMesh(B, q, 0.9, 3, [0, 0, 20], { lines: 0.5, faces: 0.5 }).pos[1],
    );
    expect(Math.max(...heights)).toBeGreaterThan(4);
    expect(Math.min(...heights)).toBeGreaterThan(-0.2);
    const g = new Mesh();
    g.pivot = [0, 0, 0];
    g.line([5, 0, 0], [5, 1, 0], Tone.edge, { anim: Anim.orbit, key: 0.1 });
    g.line([3, 0, 0], [3, 1, 0], Tone.edge, { anim: Anim.breathe });
    const G = g.build();
    let moved = 0;
    for (const q of ps.slice(0, 200)) {
      const s0 = onMesh(G, q, 0.1, 0, [0, 0, 20], { lines: 1, faces: 1 });
      const s1 = onMesh(G, q, 0.1, 5, [0, 0, 20], { lines: 1, faces: 1 });
      // Turning round the vertical keeps each grain at its distance from the pivot (give or take
      // the breath) and its height.
      expect(Math.abs(s1.pos[1] - s0.pos[1])).toBeLessThan(0.2);
      if (Math.hypot(s1.pos[0] - s0.pos[0], s1.pos[2] - s0.pos[2]) > 0.1) moved++;
    }
    expect(moved).toBeGreaterThan(150);
  });

  it('stands a geodesic dome on the ground, no strut below its ring', () => {
    const m = new Mesh();
    m.geodesic([0, 0, 0], 5, 3, Tone.glass, Tone.edge);
    const B = m.build();
    let low = 0;
    let high = 0;
    for (const p of ps) {
      const h = onMesh(B, p, p.c, 0, [0, 3, 30], { lines: 0.5, faces: 1 });
      low = Math.min(low, h.pos[1]);
      high = Math.max(high, h.pos[1]);
    }
    expect(low).toBeGreaterThan(-1e-6);
    expect(high).toBeGreaterThan(4.5);
  });
});
