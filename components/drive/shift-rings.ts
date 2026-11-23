/*
 * Gear rings, drawn (the plan is lib/art/gear-rings.ts): on each upshift a soft band of light
 * bursts out round the vehicle across its way, and slides back past you as it grows and fades;
 * the top gear adds echoes and a cone of light opening back from the nose, a sonic boom. Additive
 * and faint at its peak, so it reads as a shock in the air, never a flash over the screen.
 */

import * as THREE from 'three';

import { type GearRing, ringAt } from '@/lib/art/gear-rings';

/** Where the vehicle is drawn this frame, in physics axes (z up), and which way it faces. */
export interface RingAnchor {
  x: number;
  y: number;
  z: number;
  /** Its heading (rad) and the road's up where it is drawn (z up; turned on a twist). */
  h: number;
  up: [number, number, number];
}

interface Live {
  ring: GearRing;
  age: number;
  bands: THREE.Mesh[];
  cone: THREE.Mesh | null;
  mats: THREE.MeshBasicMaterial[];
}

/** A unit band: dark at its inner and outer edges, lit in the middle (additive: dark is clear). */
function bandGeometry(): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(0.88, 1, 96, 2);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const p = g.attributes.position;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    const k = Math.max(0, 1 - Math.abs((r - 0.94) / 0.06));
    col.set([k, k, k], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** A unit cone, open, its mouth (radius 1) at y = 0 and its tip at y = 1, lit toward the mouth. */
function coneGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.08, 1, 1, 64, 6, true);
  g.translate(0, 0.5, 0);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const p = g.attributes.position;
  for (let i = 0; i < n; i++) {
    const k = (1 - p.getY(i)) ** 2 * 0.9;
    col.set([k, k, k], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export class ShiftRings {
  readonly group = new THREE.Group();
  private live: Live[] = [];
  private band = bandGeometry();
  private cone = coneGeometry();
  private q = new THREE.Quaternion();
  private fwd = new THREE.Vector3();
  private upV = new THREE.Vector3();
  private side = new THREE.Vector3();
  private lift = new THREE.Vector3();
  private basis = new THREE.Matrix4();
  private static Y = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.group.renderOrder = 8;
    this.group.frustumCulled = false;
  }

  /** A ring bursts out now, in a colour (the hull's). */
  emit(ring: GearRing, colour: THREE.Color) {
    const mats: THREE.MeshBasicMaterial[] = [];
    const mat = () => {
      const m = new THREE.MeshBasicMaterial({
        color: colour.clone().lerp(new THREE.Color(1, 1, 1), 0.35 + 0.4 * ring.level),
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      mats.push(m);
      return m;
    };
    const bands = Array.from({ length: 1 + ring.echoes }, () => {
      const b = new THREE.Mesh(this.band, mat());
      b.frustumCulled = false;
      this.group.add(b);
      return b;
    });
    const cone = ring.wall ? new THREE.Mesh(this.cone, mat()) : null;
    if (cone) {
      cone.frustumCulled = false;
      this.group.add(cone);
    }
    this.live.push({ ring, age: 0, bands, cone, mats });
  }

  /** One frame: the rings round where the vehicle is drawn, against the floating origin. */
  update(dt: number, at: RingAnchor, ox: number, oy: number) {
    // Three's axes: x, z up → y, −y → z.
    this.fwd.set(Math.cos(at.h), 0, -Math.sin(at.h));
    this.upV.set(at.up[0], at.up[2], -at.up[1]).normalize();
    // The ring's centre rides at the body's middle, a little over the road.
    const cx = at.x - ox + this.upV.x * 0.8;
    const cy = at.z + this.upV.y * 0.8;
    const cz = -(at.y - oy) + this.upV.z * 0.8;
    // Across the way: the band faces along the heading.
    this.side.crossVectors(this.upV, this.fwd).normalize();
    this.lift.crossVectors(this.fwd, this.side);
    this.basis.makeBasis(this.side, this.lift, this.fwd);
    this.q.setFromRotationMatrix(this.basis);
    const keep: Live[] = [];
    for (const l of this.live) {
      l.age += dt;
      let alive = false;
      l.bands.forEach((b, k) => {
        const s = ringAt(l.ring, l.age, k);
        if (!s) {
          b.visible = false;
          return;
        }
        alive = true;
        b.visible = s.alpha > 0.002;
        const back = s.back + k * 1.2;
        b.position.set(cx - this.fwd.x * back, cy, cz - this.fwd.z * back);
        b.quaternion.copy(this.q);
        // Scaled whole, so a bigger ring's band is wider too.
        const r = Math.max(0.01, s.radius);
        b.scale.set(r, r, 1);
        (b.material as THREE.MeshBasicMaterial).opacity = s.alpha;
      });
      if (l.cone) {
        const s = ringAt(l.ring, l.age);
        if (s) {
          // Its tip just ahead of the nose, its mouth opening back as wide as the ring.
          const len = 4 + s.radius * 0.9;
          const tip = 2.5;
          l.cone.position.set(cx + this.fwd.x * (tip - len), cy, cz + this.fwd.z * (tip - len));
          l.cone.quaternion.setFromUnitVectors(ShiftRings.Y, this.fwd);
          l.cone.scale.set(s.radius * 0.7, len, s.radius * 0.7);
          (l.cone.material as THREE.MeshBasicMaterial).opacity = s.alpha * 0.6;
          l.cone.visible = true;
        } else l.cone.visible = false;
      }
      if (alive) keep.push(l);
      else this.drop(l);
    }
    this.live = keep;
  }

  private drop(l: Live) {
    for (const b of l.bands) this.group.remove(b);
    if (l.cone) this.group.remove(l.cone);
    for (const m of l.mats) m.dispose();
  }

  /** Clears every ring (a restart, a new world). */
  clear() {
    for (const l of this.live) this.drop(l);
    this.live = [];
  }

  dispose() {
    this.clear();
    this.band.dispose();
    this.cone.dispose();
  }
}
