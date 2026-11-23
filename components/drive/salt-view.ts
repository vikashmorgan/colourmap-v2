/**
 * Drive: the Salt Flat's few things (docs/specs/drive-game.md). The salt, the sky, the ranges, the
 * painted line and the gate lines are the backdrop's (lib/art/drive-shaders.ts); here only what
 * stands on the flat: the tenth-mile markers and the gate posts with their lamps, lone survey stakes
 * scattered far apart, the red streak crossing the flat now and then, in dusty weather a few
 * dust devils wandering, and the drift gates (lib/art/drift-gates.ts): two tall posts each, the next
 * gate lit gold with a glowing line across the salt, the one after it warm and dim, the rest faint.
 */

import * as THREE from 'three';

import { DRIFT_GATES } from '@/lib/art/drift-gates';
import {
  COURSE_POLES,
  MAX_STAKES,
  newStreak,
  STREAK,
  type Streak,
  stakesNear,
  streakAt,
  streakDue,
} from '@/lib/art/salt-flat-game';
import type { Weather } from '@/lib/art/weather';
import { disposeGroup } from './track-view';
import { buildFireCone, glowSprite } from './vehicles';

export interface SaltView {
  group: THREE.Group;
  update(
    ox: number,
    oy: number,
    cam: { x: number; y: number; yaw: number },
    t: number,
    w: Weather,
    /** The drift gate to go through next. */
    next?: number,
  ): void;
  dispose(): void;
}

const lin = (r: number, g: number, b: number): [number, number, number] => [
  r ** 2.2,
  g ** 2.2,
  b ** 2.2,
];

export interface SaltViewOptions {
  /** The ground's height under a point (Mars's dunes); flat when absent. */
  ground?: (x: number, y: number) => number;
  /** The red streak crossing the plain (off on Mars, where the Red Bastard runs instead). */
  streak?: boolean;
}

export function buildSaltView(opts: SaltViewOptions = {}): SaltView {
  const ground = opts.ground ?? (() => 0);
  const showStreak = opts.streak ?? true;
  const group = new THREE.Group();
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x15151a });

  // The course's poles, and a lamp on each gate post: warm white at the start, red at the finish.
  const course: { obj: THREE.Object3D; x: number; y: number }[] = [];
  for (const p of COURSE_POLES) {
    const g = new THREE.Group();
    const r = p.kind >= 2 ? 0.1 : 0.05;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, p.height, 8), poleMat);
    pole.position.y = p.height / 2;
    g.add(pole);
    if (p.kind >= 2) {
      const lamp = glowSprite(p.kind === 3 ? 0xff3a1a : 0xffe2c0, 1.8, 0.9);
      lamp.position.y = p.height + 0.15;
      g.add(lamp);
    }
    group.add(g);
    course.push({ obj: g, x: p.x, y: p.y });
  }

  // The drift gates: two posts with a lamp on each, and a glowing line across the next one.
  const GATE_H = 3.4;
  const gateMat = new THREE.MeshLambertMaterial({ color: 0x1c1a1f });
  const gates = DRIFT_GATES.map((g) => {
    const obj = new THREE.Group();
    const lamps: THREE.Sprite[] = [];
    for (const [x, y] of [
      [g.ax, g.ay],
      [g.bx, g.by],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, GATE_H, 8), gateMat);
      post.position.set(x - g.ax, GATE_H / 2, -(y - g.ay));
      obj.add(post);
      const lamp = glowSprite(0xffc060, 2.4, 0.9);
      lamp.position.set(x - g.ax, GATE_H + 0.2, -(y - g.ay));
      obj.add(lamp);
      lamps.push(lamp);
    }
    group.add(obj);
    return { obj, lamps, g };
  });
  const lineGeo = new THREE.PlaneGeometry(1, 0.35);
  lineGeo.rotateX(-Math.PI / 2);
  const gateLine = new THREE.Mesh(
    lineGeo,
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.6, 1.0, 0.35),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  group.add(gateLine);

  // Stakes: one instanced mesh, refilled as you drive.
  const stakes = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.04, 0.05, 1, 6),
    poleMat,
    MAX_STAKES,
  );
  stakes.frustumCulled = false;
  stakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(stakes);
  let stakeAt = { x: Number.NaN, y: Number.NaN };
  let stakeList = stakesNear(0, 0);

  // The streak: two crossed ribbons from tail to head, its head a glow, its mirror in the salt.
  const streakGeo = new THREE.BufferGeometry();
  const streakPos = new Float32Array(4 * 4 * 3);
  const streakCol = new Float32Array(4 * 4 * 3);
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 3));
  streakGeo.setIndex([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15,
  ]);
  const streakMesh = new THREE.Mesh(
    streakGeo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  streakMesh.frustumCulled = false;
  group.add(streakMesh);
  const head = glowSprite(0xff4020, 6, 0.9);
  group.add(head);
  const headMirror = glowSprite(0xff2a10, 5, 0.35);
  group.add(headMirror);
  let streak: Streak | null = null;
  let side = 1;

  // Dust devils for the dusty weathers, wandering round you.
  const devils: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const d = buildFireCone(
      [lin(0.95, 0.85, 0.75), lin(0.9, 0.75, 0.62), lin(0.7, 0.55, 0.45)],
      4,
      22,
      0.12,
    );
    d.visible = false;
    group.add(d);
    devils.push(d);
  }

  return {
    group,
    update(ox, oy, cam, t, w, next = 0) {
      for (const c of course) c.obj.position.set(c.x - ox, ground(c.x, c.y), -(c.y - oy));
      const n = gates.length;
      gates.forEach(({ obj, lamps, g }, i) => {
        obj.position.set(g.ax - ox, ground(g.ax, g.ay), -(g.ay - oy));
        const ahead = (i - next + n) % n;
        // The next gate gold and breathing slowly, the one after warm, the rest faint.
        const glow = ahead === 0 ? 0.85 + 0.15 * Math.sin(t * 2.4) : ahead === 1 ? 0.45 : 0.14;
        const size = ahead === 0 ? 3.2 : ahead === 1 ? 2.2 : 1.4;
        for (const l of lamps) {
          (l.material as THREE.SpriteMaterial).opacity = glow;
          l.scale.set(size, size, 1);
        }
        if (ahead === 0) {
          const dx = g.bx - g.ax;
          const dy = g.by - g.ay;
          const mx = (g.ax + g.bx) / 2;
          const my = (g.ay + g.by) / 2;
          gateLine.position.set(mx - ox, ground(mx, my) + 0.04, -(my - oy));
          gateLine.scale.set(Math.hypot(dx, dy), 1, 1);
          gateLine.rotation.set(0, Math.atan2(dy, dx), 0);
          (gateLine.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.sin(t * 2.4);
        }
      });
      if (!(Math.hypot(cam.x - stakeAt.x, cam.y - stakeAt.y) < 200)) {
        stakeAt = { x: cam.x, y: cam.y };
        stakeList = stakesNear(cam.x, cam.y);
      }
      const m = new THREE.Matrix4();
      stakeList.forEach((p, i) => {
        m.makeScale(1, p.height, 1);
        m.setPosition(p.x - ox, ground(p.x, p.y) + p.height / 2, -(p.y - oy));
        stakes.setMatrixAt(i, m);
      });
      stakes.count = stakeList.length;
      stakes.instanceMatrix.needsUpdate = true;

      if (!streak || streakDue(streak, t)) {
        streak = newStreak(cam, t, side);
        side = -side;
      }
      const at = showStreak ? streakAt(streak, t) : null;
      streakMesh.visible = at !== null;
      head.visible = at !== null;
      headMirror.visible = at !== null;
      if (at) {
        const H = STREAK.height;
        const hx = at.hx - ox;
        const hz = -(at.hy - oy);
        const tx = at.tx - ox;
        const tz = -(at.ty - oy);
        const dx = hx - tx;
        const dz = hz - tz;
        const l = Math.hypot(dx, dz) || 1;
        const px = (-dz / l) * 0.45;
        const pz = (dx / l) * 0.45;
        const red = lin(1, 0.12, 0.06).map((v) => v * 3) as [number, number, number];
        const quads: [number, number, number, number, number, number, number][] = [
          // Flat and upright ribbons, then their dim mirror below the salt.
          [px, 0, pz, H, 1, 0, 0],
          [0, 0.45, 0, H, 1, 0, 0],
          [px, 0, pz, -H, 0.35, 0, 0],
          [0, 0.45, 0, -H, 0.35, 0, 0],
        ];
        quads.forEach(([ox2, oy2, oz2, y, k], qi) => {
          const v = (i: number, x: number, yy: number, z: number, b: number) => {
            const o = (qi * 4 + i) * 3;
            streakPos[o] = x;
            streakPos[o + 1] = yy;
            streakPos[o + 2] = z;
            streakCol[o] = red[0] * b * k;
            streakCol[o + 1] = red[1] * b * k;
            streakCol[o + 2] = red[2] * b * k;
          };
          v(0, tx - ox2, y - oy2, tz - oz2, 0);
          v(1, hx - ox2, y - oy2, hz - oz2, 1);
          v(2, hx + ox2, y + oy2, hz + oz2, 1);
          v(3, tx + ox2, y + oy2, tz + oz2, 0);
        });
        streakGeo.attributes.position.needsUpdate = true;
        streakGeo.attributes.color.needsUpdate = true;
        head.position.set(hx, H, hz);
        headMirror.position.set(hx, -H * 0.9, hz);
      }

      const want = w.devils > 0.05;
      devils.forEach((d, i) => {
        d.visible = want;
        if (!want) return;
        const a = i * 1.7 + t * 0.03 * (i % 2 ? 1 : -1);
        const r = 260 + 120 * i;
        const dx = cam.x + Math.cos(a) * r;
        const dy = cam.y + Math.sin(a) * r;
        d.position.set(dx - ox, ground(dx, dy), -(dy - oy));
        d.rotation.y = t * 1.5;
        const fire = d.userData.fire as THREE.ShaderMaterial;
        fire.uniforms.uTime.value = t * 0.4;
        fire.uniforms.uPower.value = 0.12 * w.devils;
      });
    },
    dispose() {
      disposeGroup(group);
    },
  };
}
