/**
 * Drive, Mars: the mission's live half (docs/specs/drive-game.md, world 8). The Red Bastard in his
 * red ship speeding round his loop over the dunes, his red light trail and the rust dust behind
 * him, the mission's clock and catch, his voice on the radio, and where he is on the screen for
 * the marker. The rules are pure (lib/art/mars.ts, lib/art/mars-mission.ts, lib/art/radio.ts);
 * the engine hands this its scene, its dust and a ribbon to draw the trail with.
 */

import * as THREE from 'three';

import { pushTrail, type Trail } from '@/lib/art/drive';
import { fireById, hullById, loadBest, type Store, saveBest } from '@/lib/art/drive-design';
import {
  type Bastard,
  bastardPose,
  marsHeight,
  newBastard,
  radiation,
  regionAt,
  stepBastard,
} from '@/lib/art/mars';
import {
  type AttackEvent,
  type AttackId,
  type Attacks,
  CATCHES_KEY,
  cooldownLeft,
  crosshairNear,
  fireAttack as fireAttackRule,
  laserLock,
  newAttacks,
  SLOW,
  stepAttacks,
  unlocked,
} from '@/lib/art/mars-attacks';
import {
  archThrough,
  type Grade,
  glitchOf,
  gradeShown,
  newGrade,
  stepGrade,
} from '@/lib/art/mars-fx';
import {
  type Mission,
  missionCard,
  missionKey,
  newMission,
  RED_BASTARD,
  stepMission,
} from '@/lib/art/mars-mission';
import { newRadio, type RadioMessage, type RadioState, stepRadio } from '@/lib/art/radio';
import type { Vehicle } from '@/lib/art/vehicle';
import { AttackView } from './mars-attack-view';
import { softBang } from './mars-sound';
import type { MarsView } from './mars-view';
import { buildVehicle, type VehicleView } from './vehicles';

/** What the shell shows of the mission. */
export interface MissionHud {
  card: 'unlocked' | 'caught' | null;
  phase: Mission['phase'];
  /** Seconds on the clock (running, or the catch's), and the best. */
  time: number;
  best: number | null;
  record: boolean;
  /** How far he is (m). */
  gap: number;
}

/** Where you are on Mars, for the shell: the region's name, the radiation (0..1, the Geiger
 * counter), and you and him on the map. */
export interface MarsWhere {
  region: string | null;
  rad: number;
  you: { x: number; y: number; h: number };
  him: { x: number; y: number };
}

/** The attacks as the shell shows them: what is unlocked, how long each cools, and the laser's
 * crosshair (how much it shows, and whether it has locked on). */
export interface AttackHud {
  open: AttackId[];
  sharkLevel: 1 | 2;
  cooling: Record<AttackId, number>;
  aim: { near: number; lock: boolean } | null;
}

/** Where he is on the screen: pixels from the top left, whether pinned to the edge (off screen),
 * the way to him there (radians, screen space, 0 = right) and how far (m). */
export interface Marker {
  x: number;
  y: number;
  edge: boolean;
  angle: number;
  gap: number;
}

export interface MarsDeps {
  scene: THREE.Scene;
  env: THREE.Texture | null;
  store: Store | null;
  emitDust: (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
  ) => void;
  /** A glowing upright ribbon in a colour; the caller owns its material. */
  makeTrail: (colour: THREE.Color) => {
    trail: Trail;
    mesh: THREE.Mesh;
    update(ox: number, oy: number, t: number): void;
  };
  /** The stations and arches, so an arch you pass can throw its fire. */
  view: MarsView | null;
}

/** His paint and fire. */
const RED = '#c8180c';

export class MarsRun {
  private bastard: Bastard = newBastard();
  private view: VehicleView;
  private ribbon: ReturnType<MarsDeps['makeTrail']>;
  private mission: Mission | null = null;
  private radio: RadioState = newRadio();
  private dustDebt = 0;
  private pose = bastardPose(this.bastard);
  private gap = Number.POSITIVE_INFINITY;
  private roll = 0;
  private ghost: Vehicle;
  /** The picture's moods: old film through the tunnels, the TV glitch near the lakes. */
  private grade: Grade = newGrade();
  private glitch = 0;
  private rad = 0;
  private last: { x: number; y: number } | null = null;
  private region: string | null = null;
  private regionId: string | null = null;
  private regionAt = -99;
  private you = { x: 0, y: 0, h: 0 };
  /** The attacks: in flight, cooling, unlocked by catches (kept on the device). */
  private attacks: Attacks = newAttacks();
  private catches = 0;
  private slowUntil = -99;
  private hitAt: number | undefined;
  private attackView: AttackView;
  private pending: AttackEvent[] = [];
  private runs = 0;

  constructor(
    private deps: MarsDeps,
    private kind: 'car' | 'ship',
  ) {
    this.view = buildVehicle(
      'ship',
      { ...hullById('paint'), colour: RED },
      fireById('blaze'),
      deps.env,
    );
    deps.scene.add(this.view.group);
    this.ribbon = deps.makeTrail(new THREE.Color(RED).multiplyScalar(2.6));
    deps.scene.add(this.ribbon.mesh);
    this.attackView = new AttackView(deps.scene, deps.emitDust, marsHeight);
    this.catches = Math.round(loadBest(deps.store, CATCHES_KEY) ?? 0);
    // A vehicle-shaped record of him, for the view's own update (fire, bob).
    this.ghost = {
      kind: 'ship',
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      h: 0,
      yawRate: 0,
      steer: 0,
      vLong: 0,
      vLat: 0,
      slip: 0,
      roll: 0,
      pitch: 0,
      air: false,
      airTime: 0,
      hand: 0,
      lift: 0,
      liftV: 0,
      dodge: 0,
    };
  }

  /** A new run on Mars: he goes back to his start and the mission waits for you to drive. */
  reset(kind: 'car' | 'ship') {
    this.kind = kind;
    this.bastard = newBastard();
    this.mission = null;
    this.runs += 1;
    this.radio = newRadio(this.runs);
    this.ribbon.trail.count = 0;
    this.last = null;
    this.attacks = newAttacks();
    this.slowUntil = -99;
    this.hitAt = undefined;
  }

  /**
   * The one way in for an attack (the engine's weapon hook calls it): fires it if it is unlocked
   * and ready. Returns whether it went.
   */
  fireAttack(id: AttackId, t: number): boolean {
    if (!this.mission || this.mission.phase === 'caught') return false;
    const out = fireAttackRule(this.attacks, id, t, this.you, this.pose, this.catches);
    this.attacks = out.attacks;
    this.pending.push(...out.events);
    return out.fired;
  }

  /** What the shell shows of the attacks. */
  attackHud(t: number): AttackHud {
    const open = unlocked(this.catches);
    const cooling = {
      shark: Math.ceil(cooldownLeft(this.attacks, 'shark', t)),
      shot: Math.ceil(cooldownLeft(this.attacks, 'shot', t)),
      laser: Math.ceil(cooldownLeft(this.attacks, 'laser', t)),
    };
    const chasing = this.mission?.phase === 'chase';
    const aim =
      open.attacks.includes('laser') && chasing
        ? {
            near: Math.round(crosshairNear(this.you, this.pose) * 20) / 20,
            lock: laserLock(this.you, this.pose) !== null,
          }
        : null;
    return { open: open.attacks, sharkLevel: open.sharkLevel, cooling, aim };
  }

  /** The world round you a moment on: the arches you pass (their fire, the grade), the radiation
   * and its glitch, the region you are in. */
  private stepWorld(dt: number, t: number, you: Vehicle, live: boolean) {
    const through = live && this.last ? archThrough(this.last.x, this.last.y, you.x, you.y) : null;
    if (through) this.deps.view?.flare(through, t);
    this.grade = stepGrade(this.grade, dt, through);
    this.last = { x: you.x, y: you.y };
    this.you = { x: you.x, y: you.y, h: you.h };
    this.rad = radiation(you.x, you.y);
    this.glitch += (glitchOf(this.rad) - this.glitch) * (1 - Math.exp(-2 * dt));
    // The region is looked up a few times a second (its run band measures against his loop).
    if (t - this.regionAt > 0.25) {
      this.regionAt = t;
      const r = regionAt(you.x, you.y);
      this.region = r?.name ?? null;
      this.regionId = r?.id ?? null;
    }
  }

  /** The picture's moods now, for the screen pass. */
  fx(): { sepia: number; glitch: number } {
    return { sepia: gradeShown(this.grade), glitch: this.glitch };
  }

  where(): MarsWhere {
    return {
      region: this.region,
      rad: Math.round(this.rad * 100) / 100,
      you: {
        x: Math.round(this.you.x),
        y: Math.round(this.you.y),
        h: Math.round(this.you.h * 100) / 100,
      },
      him: { x: Math.round(this.pose.x), y: Math.round(this.pose.y) },
    };
  }

  /** Moves him and the mission on. `live`: you are driving (not held on the grid or in a menu). */
  step(dt: number, t: number, you: Vehicle, live: boolean, onRadio?: (m: RadioMessage) => void) {
    this.stepWorld(dt, t, you, live);
    if (!live && !this.mission) return;
    // The attacks in flight, and what they did (a hit slows him for a while).
    const flown = stepAttacks(this.attacks, dt, t, this.pose);
    this.attacks = flown.attacks;
    const events = [...this.pending, ...flown.events];
    this.pending = [];
    for (const e of events) {
      if (e.kind === 'hit') {
        this.slowUntil = t + SLOW.time;
        this.hitAt = t;
      }
      if (e.kind === 'burst') softBang();
    }
    this.attackView.events(events, t);
    this.bastard = stepBastard(this.bastard, dt, this.gap, t < this.slowUntil ? SLOW.factor : 1);
    const p = bastardPose(this.bastard);
    this.pose = p;
    this.gap = Math.hypot(p.x - you.x, p.y - you.y, p.z - you.z);
    if (!this.mission) {
      this.mission = newMission(t, loadBest(this.deps.store, missionKey(this.kind)));
    }
    const before = this.mission;
    this.mission = stepMission(before, t, this.gap);
    if (this.mission.phase === 'caught' && before.phase !== 'caught') {
      if (this.mission.record)
        saveBest(this.deps.store, missionKey(this.kind), this.mission.time as number);
      // Each catch unlocks the next attack.
      this.catches += 1;
      saveBest(this.deps.store, CATCHES_KEY, this.catches);
    }
    const { radio, say } = stepRadio(this.radio, RED_BASTARD, {
      t,
      phase: this.mission.phase,
      since: t - this.mission.start,
      gap: this.gap,
      hitAt: this.hitAt,
      region: this.regionId,
    });
    this.radio = radio;
    if (say) onRadio?.(say);
  }

  hud(t: number): MissionHud | null {
    const m = this.mission;
    if (!m) return null;
    return {
      card: missionCard(m, t),
      phase: m.phase,
      time: m.time ?? t - m.start,
      best: m.best,
      record: m.record,
      gap: this.gap,
    };
  }

  /** Draws him, his trail and his dust, and returns where he is on the screen. */
  draw(
    ox: number,
    oy: number,
    t: number,
    dt: number,
    camera: THREE.Camera,
    w: number,
    h: number,
  ): Marker | null {
    const p = this.pose;
    const speed = this.bastard.speed;
    const g = this.ghost;
    g.x = p.x;
    g.y = p.y;
    g.z = p.z;
    g.h = p.h;
    g.vx = Math.cos(p.h) * speed;
    g.vy = Math.sin(p.h) * speed;
    g.vLong = speed;
    // He leans into his curves, as a ship does.
    this.roll +=
      (Math.max(-0.4, Math.min(0.4, p.k * speed * speed * 0.012)) - this.roll) *
      (1 - Math.exp(-3 * dt));
    const ahead = bastardPose({ s: this.bastard.s + 6, speed });
    const pitch = Math.atan2(ahead.z - p.z, 6);
    const grp = this.view.group;
    grp.position.set(p.x - ox, p.z, -(p.y - oy));
    grp.rotation.set(-pitch, p.h + Math.PI / 2, -this.roll, 'YXZ');
    const far = Math.hypot(p.x - ox, p.y - oy);
    // Seen from far off he is a speck: drawn larger, so the red ship still reads in the distance.
    const k = 1 + Math.max(0, far - 300) / 500;
    grp.scale.setScalar(Math.min(k, 4));
    this.view.update(g, t, dt, 1.3, 1.1, 0.8);
    this.attackView.update(this.attacks.flying, ox, oy, t, dt);

    // The red light trail, from his tail.
    pushTrail(this.ribbon.trail, p.x - Math.cos(p.h) * 2, p.y - Math.sin(p.h) * 2, p.z + 0.6, t, 1);
    this.ribbon.update(ox, oy, t);

    // A thick cloud of rust dust behind him, billowing up (only while you could see it).
    if (far < 3200) {
      this.dustDebt += dt * 34;
      while (this.dustDebt >= 1) {
        this.dustDebt -= 1;
        const back = 4 + Math.random() * 6;
        const side = (Math.random() - 0.5) * 5;
        this.deps.emitDust(
          p.x - Math.cos(p.h) * back - Math.sin(p.h) * side,
          p.y - Math.sin(p.h) * back + Math.cos(p.h) * side,
          p.z - 0.4,
          Math.cos(p.h) * speed * 0.15 + (Math.random() - 0.5) * 6,
          Math.sin(p.h) * speed * 0.15 + (Math.random() - 0.5) * 6,
          1.5 + Math.random() * 3,
          3 + Math.random() * 2,
          2.2 + Math.random() * 2.5,
        );
      }
    }

    // The marker: where he is on the screen, or pinned to its edge toward him.
    if (!this.mission || this.mission.phase === 'caught') return null;
    const v = new THREE.Vector3(p.x - ox, p.z + 3, -(p.y - oy)).applyMatrix4(
      camera.matrixWorldInverse,
    );
    const behind = v.z > -0.5;
    const c = v.clone().applyMatrix4(camera.projectionMatrix);
    let sx = c.x;
    let sy = c.y;
    if (behind) {
      sx = -v.x;
      sy = -v.y;
    }
    const pad = 0.9;
    const on = !behind && Math.abs(sx) < pad && Math.abs(sy) < pad;
    if (!on) {
      const s = pad / Math.max(Math.abs(sx), Math.abs(sy), 1e-6);
      sx *= s;
      sy *= s;
    }
    return {
      x: ((sx + 1) / 2) * w,
      y: ((1 - sy) / 2) * h,
      edge: !on,
      angle: Math.atan2(-sy, sx),
      gap: this.gap,
    };
  }

  dispose() {
    this.attackView.dispose();
    this.deps.scene.remove(this.view.group);
    this.view.dispose();
    this.deps.scene.remove(this.ribbon.mesh);
    this.ribbon.mesh.geometry.dispose();
  }
}
