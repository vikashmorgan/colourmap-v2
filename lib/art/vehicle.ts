/**
 * Drive: the vehicles' physics (docs/specs/drive-game.md), shared by every world. Pure: no
 * three.js, no DOM.
 *
 * Two vehicles: the red car (on wheels, firm grip, a short hop off a crest) and the hover ship (it
 * floats a little over the ground, slides more and glides far when it leaves it). Both move in the
 * world's plane (x east, y north, metres; headings counter-clockwise from +x) over a ground the
 * world describes by its height and slope at any point.
 *
 * - The pull is strong off the line and fades toward the top speed; Space lifts both, Shift more.
 * - Steering turns the body; the velocity follows only as far as the grip allows, so a hard turn at
 *   speed slides wide (a drift) and scrubs off speed.
 * - Gravity pulls along the ground's slope: down a hill or off a banked turn's high side you gain
 *   speed, climbing you lose it. Riding a bank and dropping back in pumps the speed up, like a
 *   half-pipe: some of the sideways speed the grip takes back is turned into speed ahead.
 * - Over a crest sharper than gravity can follow, the vehicle leaves the ground and flies until it
 *   lands; a landing is smooth (a dust puff, a dip of the camera), never a crash.
 * - Obstacles are the world's to find (`World.collide`); a hit pushes the vehicle out, bounces it,
 *   costs speed and spins it a little.
 */

import { boostOf, type Controls, clamp, ease, wrapAngle } from '@/lib/art/drive';

/** The game's gravity, m/s²: heavier than Earth's, so jumps are short and snappy. */
export const G = 20;

export type VehicleKind = 'car' | 'ship';

export interface VehicleSpec {
  vTop: number;
  accel: number;
  brake: number;
  reverseAccel: number;
  reverseTop: number;
  wheelbase: number;
  /** Most sideways acceleration the grip gives (m/s²), and how fast it pulls a slide out. */
  grip: number;
  gripRate: number;
  rolling: number;
  drag: number;
  /** Height the body rides over the ground. */
  hover: number;
  /** Share of gravity while flying: the ship glides. */
  airGravity: number;
  /** Share of steering and pull left in the air. */
  airSteer: number;
  airPull: number;
  /** Share of the grip-scrubbed sideways speed turned into speed ahead when dropping off a slope. */
  pump: number;
}

export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  // Top speed 92 m/s (331 km/h, the Speed pieces' car). Salt is slippery: 14 m/s² of grip.
  car: {
    vTop: 92,
    accel: 12,
    brake: 30,
    reverseAccel: 5,
    reverseTop: 14,
    wheelbase: 2.7,
    grip: 14,
    gripRate: 9,
    rolling: 0.35,
    drag: 0.00032,
    hover: 0,
    airGravity: 1,
    airSteer: 0.1,
    airPull: 0,
    pump: 0.45,
  },
  ship: {
    vTop: 96,
    accel: 13,
    brake: 24,
    reverseAccel: 5,
    reverseTop: 14,
    wheelbase: 2.4,
    grip: 10,
    gripRate: 4.5,
    rolling: 0.2,
    drag: 0.0003,
    hover: 0.75,
    airGravity: 0.38,
    airSteer: 0.6,
    airPull: 0.5,
    pump: 0.6,
  },
};

export interface Vehicle {
  kind: VehicleKind;
  x: number;
  y: number;
  /** Height of the body's base over the world's zero. */
  z: number;
  vx: number;
  vy: number;
  vz: number;
  h: number;
  yawRate: number;
  steer: number;
  /** Speed along the heading (negative in reverse) and sideways (positive to the left). */
  vLong: number;
  vLat: number;
  /** Angle between where it points and where it goes (positive: sliding left). */
  slip: number;
  /** Body lean (positive leans the roof left) and nose pitch (positive up), radians. */
  roll: number;
  pitch: number;
  air: boolean;
  airTime: number;
}

/** What the ground is under a point: its height, its slope (dh/dx, dh/dy) and how rough it is. */
export interface Ground {
  h: number;
  gx: number;
  gy: number;
  /** 0 the road or the smooth salt, 1 rough ground that drags. */
  rough: number;
}

/** A hit: push the vehicle out along (nx, ny) by depth; it loses a share of its speed and spins. */
export interface Hit {
  nx: number;
  ny: number;
  depth: number;
  loss: number;
  spin: number;
  /** Soft things (a dust devil) push without a bump. */
  soft?: boolean;
}

export interface World {
  ground(x: number, y: number): Ground;
  collide?(v: Vehicle, t: number): Hit | null;
}

export const FLAT: World = { ground: () => ({ h: 0, gx: 0, gy: 0, rough: 0 }) };

/** What happened in a step, for the dust, the camera and the sound of it. */
export interface StepEvents {
  /** Speed into the ground at a landing (m/s), 0 if none. */
  landed: number;
  /** Speed into an obstacle (m/s), 0 if none. */
  bump: number;
  tookOff: boolean;
}

export function newVehicle(kind: VehicleKind, x: number, y: number, h: number, z = 0): Vehicle {
  return {
    kind,
    x,
    y,
    z: z + VEHICLES[kind].hover,
    vx: 0,
    vy: 0,
    vz: 0,
    h,
    yawRate: 0,
    steer: 0,
    vLong: 0,
    vLat: 0,
    slip: 0,
    roll: 0,
    pitch: 0,
    air: false,
    airTime: 0,
  };
}

/** The pull along the heading for a throttle at a speed: strong off the line, fading near the top. */
export function pull(spec: VehicleSpec, vLong: number, throttle: number, boost: 0 | 1 | 2): number {
  const b = boostOf(boost);
  const top = spec.vTop * b.top;
  if (throttle > 0) {
    if (vLong < -0.5) return spec.brake * throttle;
    const k = vLong / top;
    // Past the top (a boost let go of) it eases back down, never stamping on the brakes.
    return Math.max(-3, spec.accel * b.pull * throttle * (1 - k * k));
  }
  if (throttle < 0) {
    if (vLong > 0.5) return spec.brake * throttle;
    return vLong > -spec.reverseTop ? spec.reverseAccel * throttle : 0;
  }
  return 0;
}

/** Most the front turns at a speed: less the faster it goes, so it stays drivable. */
export function steerLimit(speed: number): number {
  return 0.55 / (1 + Math.abs(speed) / 16);
}

/** The pull of gravity along a slope (m/s² in the plane). */
export function slopePull(gx: number, gy: number): { ax: number; ay: number } {
  const k = -G / (1 + gx * gx + gy * gy);
  return { ax: k * gx, ay: k * gy };
}

/** Extra drag on rough ground: mild at a crawl, strong at speed, so it holds you near 43 m/s. */
export function roughDrag(rough: number, speed: number): number {
  return rough * (4 + 0.0025 * speed * speed);
}

/**
 * Whether a vehicle on the ground leaves it: its free path (carried on at its vertical speed under
 * gravity) would be above where the ground will be.
 */
export function leavesGround(z: number, vz: number, groundNext: number, dt: number): boolean {
  return z + vz * dt - 0.5 * G * dt * dt > groundNext + 0.01;
}

/** Share of the speed a landing costs: nothing for a kiss, up to 12% for a slam. */
export function landingLoss(impact: number): number {
  return clamp((impact - 3) * 0.008, 0, 0.12);
}

const SUB = 1 / 120;

/** Advances the vehicle by dt seconds (in small fixed steps). */
export function stepVehicle(
  v: Vehicle,
  ctl: Controls,
  dt: number,
  world: World = FLAT,
  t = 0,
): StepEvents {
  const ev: StepEvents = { landed: 0, bump: 0, tookOff: false };
  let left = Math.min(dt, 0.1);
  while (left > 1e-6) {
    const h = Math.min(SUB, left);
    subStep(v, ctl, h, world, t, ev);
    left -= h;
  }
  return ev;
}

function subStep(v: Vehicle, ctl: Controls, dt: number, world: World, t: number, ev: StepEvents) {
  const spec = VEHICLES[v.kind];
  const throttle = ctl.boost > 0 ? Math.max(ctl.throttle, 1) : ctl.throttle;
  const here = world.ground(v.x, v.y);
  const air = v.air;

  // Steering turns the body.
  v.steer = ease(v.steer, ctl.steer, 7, dt);
  const authority = air ? spec.airSteer : 1;
  const delta = v.steer * steerLimit(v.vLong);
  const target = ((v.vLong * Math.tan(delta)) / spec.wheelbase) * authority;
  v.yawRate = ease(v.yawRate, target, air ? 3 : 8, dt);
  v.h = wrapAngle(v.h + v.yawRate * dt);

  // Gravity along the slope, while on the ground.
  let downhill = false;
  if (!air) {
    const g = slopePull(here.gx, here.gy);
    v.vx += g.ax * dt;
    v.vy += g.ay * dt;
    downhill = here.gx * v.vx + here.gy * v.vy < -0.5;
  }

  // The velocity, seen from the new heading.
  const fx = Math.cos(v.h);
  const fy = Math.sin(v.h);
  let vLong = v.vx * fx + v.vy * fy;
  let vLat = -v.vx * fy + v.vy * fx;
  const speed = Math.hypot(vLong, vLat);

  let a = pull(spec, vLong, throttle, ctl.boost) * (air ? spec.airPull : 1);
  const resist =
    (air ? 0 : spec.rolling) + spec.drag * vLong * vLong + (air ? 0 : roughDrag(here.rough, speed));
  if (Math.abs(vLong) < resist * dt && throttle === 0) vLong = 0;
  else a -= Math.sign(vLong) * resist;
  const before = vLong;
  vLong += a * dt;
  if (throttle < 0 && before > 0 && vLong < 0) vLong = 0;

  // The grip pulls the slide out up to its limit; past it the vehicle drifts and scrubs speed.
  // Dropping off a slope, part of what the grip takes back goes into speed ahead: the pump.
  const grip = air ? (v.kind === 'ship' ? 0.15 : 0) : 1;
  if (grip > 0) {
    const want = -vLat * (1 - Math.exp(-spec.gripRate * grip * dt));
    const most = spec.grip * grip * dt;
    const fix = clamp(want, -most, most);
    vLat += fix;
    const sliding = Math.abs(want) - Math.abs(fix);
    vLong -=
      Math.sign(vLong) * Math.min(Math.abs(vLong), sliding * 0.35 + Math.abs(vLat) * 0.05 * dt);
    if (downhill && vLong > 0) vLong += Math.abs(fix) * spec.pump;
  }

  v.vLong = vLong;
  v.vLat = vLat;
  v.vx = vLong * fx - vLat * fy;
  v.vy = vLong * fy + vLat * fx;
  v.x += v.vx * dt;
  v.y += v.vy * dt;
  v.slip = Math.atan2(vLat, Math.max(Math.abs(vLong), 1));

  // Up and down: follow the ground, or fly.
  const next = world.ground(v.x, v.y);
  const floor = next.h + spec.hover;
  if (air) {
    v.vz -= G * spec.airGravity * dt;
    v.z += v.vz * dt;
    v.airTime += dt;
    if (v.z <= floor) {
      const groundRate = next.gx * v.vx + next.gy * v.vy;
      const impact = Math.max(0, groundRate - v.vz);
      const keep = 1 - landingLoss(impact);
      v.vx *= keep;
      v.vy *= keep;
      v.z = floor;
      v.vz = groundRate;
      v.air = false;
      v.airTime = 0;
      ev.landed = Math.max(ev.landed, impact);
    }
  } else if (leavesGround(v.z, v.vz, floor, dt)) {
    v.z += v.vz * dt - 0.5 * G * dt * dt;
    v.vz -= G * dt;
    v.air = true;
    v.airTime = 0;
    ev.tookOff = true;
  } else {
    v.vz = clamp((floor - v.z) / dt, -60, 60);
    v.z = floor;
  }

  // Obstacles.
  const hit = world.collide?.(v, t);
  if (hit) {
    v.x += hit.nx * hit.depth;
    v.y += hit.ny * hit.depth;
    const vn = v.vx * hit.nx + v.vy * hit.ny;
    if (vn < 0) {
      const bounce = hit.soft ? 1 : 1.25;
      v.vx -= bounce * vn * hit.nx;
      v.vy -= bounce * vn * hit.ny;
      const keep = 1 - hit.loss;
      v.vx *= keep;
      v.vy *= keep;
      v.yawRate += hit.spin;
      if (!hit.soft) ev.bump = Math.max(ev.bump, -vn);
    }
  }

  // The body leans out of the turn and with the ground; the nose follows the slope or the flight.
  const lateral = vLong * v.yawRate;
  const sideSlope = -next.gx * fy + next.gy * fx;
  const aheadSlope = next.gx * fx + next.gy * fy;
  const lean = v.kind === 'ship' ? 0.012 : 0.0035;
  const rollTo = air
    ? v.roll * 0.98
    : -Math.atan(sideSlope) +
      clamp(-lateral * lean, v.kind === 'ship' ? -0.4 : -0.07, v.kind === 'ship' ? 0.4 : 0.07);
  v.roll = ease(v.roll, rollTo, air ? 1 : 6, dt);
  const pitchTo = air ? Math.atan2(v.vz, Math.max(speed, 5)) * 0.6 : Math.atan(aheadSlope);
  v.pitch = ease(v.pitch, pitchTo, air ? 2 : 8, dt);
}

export function speedOf(v: Vehicle): number {
  return Math.hypot(v.vx, v.vy);
}
