/*
 * The Symphony's moving pieces (docs/specs/symphony-track.md; the maths is lib/art/symphony.ts):
 * the ring gates, three rings inside one another turning about the road at golden-ratio speeds,
 * their gaps lining up only for a moment. Built as each gate comes into view, dropped behind you.
 * The bridges, pillars and fire rows are static and stand in the design space's Maths pieces
 * (components/drive/design-space.ts).
 */

import * as THREE from 'three';

import {
  eachSym,
  GATE,
  GATE_CENTRE,
  gateAngles,
  gateGlow,
  ringRadius,
  SYM_GATES,
} from '@/lib/art/symphony';
import { frameAt, heightAt, type Track } from '@/lib/art/track';
import { glowSprite } from './vehicles';

/** How far ahead and behind gates are built (m). */
const AHEAD = 1600;
const BEHIND = 120;

/** The rings' light, outer to inner: gold, violet, pale gold (linear, past 1 to bloom). */
const RING_COLS: [number, number, number][] = [
  [1.6, 0.95, 0.32],
  [0.75, 0.45, 1.6],
  [1.7, 1.35, 0.8],
];
const TUBE = [0.62, 0.48, 0.36];

interface GateMesh {
  s: number;
  i: number;
  group: THREE.Group;
  rings: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  /** The light in the shared gap, shown as they line up. */
  key: THREE.Sprite;
  x: number;
  y: number;
}

export interface SymphonyView {
  group: THREE.Group;
  update(ox: number, oy: number, s: number, t: number): void;
  dispose(): void;
}

export function buildSymphonyView(track: Track): SymphonyView {
  const group = new THREE.Group();
  const gates = new Map<number, GateMesh>();
  const ringGeos = RING_COLS.map(
    (_, k) => new THREE.TorusGeometry(ringRadius(k), TUBE[k], 8, 128, Math.PI * 2 - GATE.GAP),
  );

  function buildGate(s: number, i: number): GateMesh {
    const f = frameAt(track, s);
    const g = new THREE.Group();
    g.rotation.set(0, f.h + Math.PI / 2, -f.bank, 'YXZ');
    const rings: THREE.Mesh[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];
    RING_COLS.forEach((c, k) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(...c),
        toneMapped: false,
      });
      const m = new THREE.Mesh(ringGeos[k], mat);
      m.position.y = GATE_CENTRE;
      m.frustumCulled = false;
      g.add(m);
      rings.push(m);
      mats.push(mat);
    });
    const key = glowSprite(new THREE.Color(1.8, 1.3, 0.7), 26, 0);
    key.position.y = GATE_CENTRE;
    g.add(key);
    group.add(g);
    return { s, i, group: g, rings, mats, key, x: f.x, y: f.y };
  }

  const drop = (m: GateMesh) => {
    group.remove(m.group);
    for (const mat of m.mats) mat.dispose();
    m.key.material.dispose();
  };

  return {
    group,
    update(ox, oy, s, t) {
      const want = eachSym(SYM_GATES, Math.max(0, s - BEHIND), s + AHEAD);
      const keep = new Set(want.map((w) => w.s));
      for (const [at, m] of gates)
        if (!keep.has(at)) {
          drop(m);
          gates.delete(at);
        }
      for (const w of want) if (!gates.has(w.s)) gates.set(w.s, buildGate(w.s, w.i));
      for (const m of gates.values()) {
        const e = heightAt(track, m.s, 0, true);
        m.group.position.set(m.x - ox, e, -(m.y - oy));
        const angles = gateAngles(m.i, t);
        const glow = gateGlow(m.i, t);
        m.rings.forEach((r, k) => {
          // The torus's arc starts at its +x (the road's left) and runs counter-clockwise: turn it
          // so its gap is centred on the gap's angle.
          r.rotation.z = angles[k] + GATE.GAP / 2;
          const c = RING_COLS[k];
          const b = 0.7 + 1.1 * glow;
          m.mats[k].color.setRGB(c[0] * b, c[1] * b, c[2] * b);
        });
        // Where the gaps meet: the light of the way through, at the middle ring's radius.
        let cx = 0;
        let cy = 0;
        for (const a of angles) {
          cx += Math.cos(a);
          cy += Math.sin(a);
        }
        const a = Math.atan2(cy, cx);
        const r = ringRadius(1);
        m.key.position.set(Math.cos(a) * r, GATE_CENTRE + Math.sin(a) * r, 0);
        m.key.material.opacity = glow * glow * 0.9;
      }
    },
    dispose() {
      for (const m of gates.values()) drop(m);
      gates.clear();
      for (const g of ringGeos) g.dispose();
    },
  };
}
