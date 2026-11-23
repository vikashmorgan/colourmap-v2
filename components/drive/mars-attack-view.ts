/**
 * Drive, Mars: the attacks as you see them (docs/specs/drive-game.md, world 8, "Attacks"). The
 * rules are pure (lib/art/mars-attacks.ts); this draws them: the Dust Sharks (a fin of rust
 * cutting the ground, a wake of dust), the yellow shot (a glowing round, then a soft burst), the
 * laser (an amber beam that fades in under half a second). Nothing flashes: every light fades.
 */

import * as THREE from 'three';

import type { AttackEvent, Projectile } from '@/lib/art/mars-attacks';
import { LASER } from '@/lib/art/mars-attacks';
import { glowSprite } from './vehicles';

type Dust = (
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  life: number,
  size: number,
) => void;

const finMat = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.9 });

function fin(): THREE.Mesh {
  // A tall thin wedge: a dorsal fin standing out of the dust.
  const shape = new THREE.Shape();
  shape.moveTo(-1.6, 0);
  shape.quadraticCurveTo(-0.4, 1.2, 0.9, 2.6);
  shape.quadraticCurveTo(0.5, 1.1, 1.2, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
  geo.translate(0, 0, -0.125);
  return new THREE.Mesh(geo, finMat);
}

interface Fading {
  obj: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  born: number;
  life: number;
  grow: number;
  base: number;
  mat: THREE.Material & { opacity: number };
}

export class AttackView {
  private group = new THREE.Group();
  private fins = new Map<number, THREE.Mesh>();
  private rounds = new Map<number, THREE.Sprite>();
  private fading: Fading[] = [];
  private dustDebt = 0;

  constructor(
    private scene: THREE.Scene,
    private dust: Dust,
    private height: (x: number, y: number) => number,
  ) {
    scene.add(this.group);
  }

  /** What happened this moment: bursts, beams, hits. */
  events(evs: AttackEvent[], t: number) {
    for (const e of evs) {
      if (e.kind === 'burst') {
        const z = this.height(e.x, e.y) + 3;
        const s = glowSprite(0xffd060, 10, 0.9);
        this.group.add(s);
        this.fading.push({ obj: s, x: e.x, y: e.y, z, born: t, life: 0.9, grow: 60, base: 10, mat: s.material });
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2;
          const v = 14 + Math.random() * 10;
          this.dust(e.x, e.y, z - 2, Math.cos(a) * v, Math.sin(a) * v, 2 + Math.random() * 3, 2.5, 4);
        }
      } else if (e.kind === 'beam' && e.x2 !== undefined && e.y2 !== undefined) {
        const z0 = this.height(e.x, e.y) + 1.4;
        const z1 = this.height(e.x2, e.y2) + 1.4;
        const len = Math.hypot(e.x2 - e.x, e.y2 - e.y, z1 - z0);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(2.2, 1.1, 0.35),
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, len, 6, 1, true), mat);
        // Lying from start to end (world: x east, y north, z up; scene: x, z up, -y).
        const dir = new THREE.Vector3(e.x2 - e.x, z1 - z0, -(e.y2 - e.y)).normalize();
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        this.group.add(beam);
        this.fading.push({
          obj: beam,
          x: (e.x + e.x2) / 2,
          y: (e.y + e.y2) / 2,
          z: (z0 + z1) / 2,
          born: t,
          life: LASER.show,
          grow: 0,
          base: 1,
          mat,
        });
      } else if (e.kind === 'hit') {
        const z = this.height(e.x, e.y) + 1;
        const s = glowSprite(e.attack === 'laser' ? 0xffa040 : 0xffc890, 8, 0.7);
        this.group.add(s);
        this.fading.push({ obj: s, x: e.x, y: e.y, z, born: t, life: 0.7, grow: 14, base: 8, mat: s.material });
        for (let i = 0; i < 14; i++)
          this.dust(e.x, e.y, z, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, 1 + Math.random() * 3, 2, 3);
      }
    }
  }

  /** Places what is in flight and fades what has gone. */
  update(flying: readonly Projectile[], ox: number, oy: number, t: number, dt: number) {
    const live = new Set<number>();
    this.dustDebt += dt * 22;
    const puffs = Math.floor(this.dustDebt);
    this.dustDebt -= puffs;
    for (const p of flying) {
      live.add(p.id);
      const g = this.height(p.x, p.y);
      if (p.kind === 'shark') {
        let f = this.fins.get(p.id);
        if (!f) {
          f = fin();
          this.fins.set(p.id, f);
          this.group.add(f);
        }
        // It weaves a little as it swims (a slow 1.2 Hz sway).
        f.position.set(p.x - ox, g + Math.sin(t * 7.5 + p.id) * 0.15, -(p.y - oy));
        f.rotation.set(0, p.h, Math.sin(t * 7.5 + p.id) * 0.12);
        for (let i = 0; i < puffs; i++)
          this.dust(
            p.x - Math.cos(p.h) * 2,
            p.y - Math.sin(p.h) * 2,
            g + 0.3,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            1 + Math.random() * 2,
            1.6 + Math.random(),
            2 + Math.random() * 1.5,
          );
      } else {
        let s = this.rounds.get(p.id);
        if (!s) {
          s = glowSprite(0xffd860, 3.2, 1);
          this.rounds.set(p.id, s);
          this.group.add(s);
        }
        s.position.set(p.x - ox, g + 1.6, -(p.y - oy));
      }
    }
    for (const [id, f] of this.fins)
      if (!live.has(id)) {
        this.group.remove(f);
        f.geometry.dispose();
        this.fins.delete(id);
      }
    for (const [id, s] of this.rounds)
      if (!live.has(id)) {
        this.group.remove(s);
        s.material.dispose();
        this.rounds.delete(id);
      }
    this.fading = this.fading.filter((f) => {
      const k = (t - f.born) / f.life;
      if (k >= 1) {
        this.group.remove(f.obj);
        f.mat.dispose();
        if (f.obj instanceof THREE.Mesh) f.obj.geometry.dispose();
        return false;
      }
      f.obj.position.set(f.x - ox, f.z, -(f.y - oy));
      if (f.grow) f.obj.scale.setScalar(f.base + f.grow * Math.sqrt(k));
      f.mat.opacity = (1 - k) * (1 - k) * 0.9;
      return true;
    });
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
