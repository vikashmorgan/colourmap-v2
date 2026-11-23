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

import { boostOf, type Controls, clamp, ease, gearOf, gearPull, wrapAngle } from '@/lib/art/drive';

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
  /** How far past the grip's own turn rate the body may yaw: a little past it is a drift. */
  yawGrip: number;
  /** How hard the hover field holds it down: extra clearance (m) a crest must open to lift it. */
  cling: number;
  /** On a road, how much the road holds it (0 none, 1 full): see `ROAD_KEEP`. */
  keep: number;
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
    yawGrip: 1.25,
    cling: 0,
    keep: 1,
  },
  ship: {
    vTop: 96,
    accel: 13,
    brake: 24,
    reverseAccel: 5,
    reverseTop: 14,
    wheelbase: 2.4,
    grip: 12,
    gripRate: 6,
    rolling: 0.2,
    drag: 0.0003,
    hover: 0.75,
    airGravity: 0.38,
    airSteer: 0.6,
    airPull: 0.5,
    pump: 0.6,
    yawGrip: 1.45,
    cling: 0.06,
    keep: 1,
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
  /** How far the handbrake is on (0..1): eased in fast, let off over a few tenths of a second. */
  hand: number;
  /** The ship's flying height over its hover height (m), and how fast it is climbing (m/s). */
  lift: number;
  liftV: number;
  /** A quick sideways move across a road (m/s, positive to the left), on top of the steering. */
  dodge: number;
}

/** What the ground is under a point: its height, its slope (dh/dx, dh/dy) and how rough it is. */
export interface Ground {
  h: number;
  gx: number;
  gy: number;
  /** 0 the road or the smooth salt, 1 rough ground that drags. */
  rough: number;
  /** On a road's curled-up edge (0 to 1): a wall to ride, never a ramp that launches. */
  lip?: number;
  /** On a road: its heading and curvature here, where across it the point is (u, positive left)
   * and its half-width. Roads hold the vehicle on them (see `ROAD_KEEP`); open ground does not. */
  road?: {
    h: number;
    k: number;
    u: number;
    half: number;
    /** How high up a quarter-pipe beside the road (0 on the road, 1 at its top). */
    pipe?: number;
  };
}

/**
 * How a road holds you on it (2026-11-17: "create it so the car stays on track, on the road";
 * "so the car doesn't drift excessively and lose control all the time"):
 * - follow: the body turns with the bend by itself, so with no key held you ride the curve; the
 *   keys move you across the road and turn you further.
 * - hold: the grip gets what the bend asks (k v²) on top of its own, so the velocity follows.
 * - settle: the body swings back toward where it is going, so a slide straightens out (rad/s
 *   per radian of slip).
 * - align: with no key held the body lines up with the road again (rad/s per radian off), so you
 *   keep your place across it: let go and the car holds its lane.
 * - angle: the keys turn you at most this far from the road's way (radians, about 20°): enough to
 *   cross the road, never enough to turn into a wall.
 * - edge: from this far inside the edge (m) the road eases you back in, never past it.
 */
/**
 * The handbrake (2026-11-19, "a button to brake so I can brake and turn to drift harder"): the rear
 * locks, so the grip falls away, the body may swing much faster than the grip turns the velocity
 * (the tail steps out), the front turns further, and the locked wheels drag the speed down a
 * little. Let go, and the grip comes back over a few tenths of a second: the drift straightens.
 */
export const HANDBRAKE = {
  on: 12,
  off: 6,
  grip: 0.45,
  rate: 0.45,
  yaw: 0.9,
  steer: 0.4,
  drag: 5,
  pull: 0.5,
  settle: 3,
};

/** On a quarter-pipe, gravity wins in the end: the nose is turned back down (radians at the top),
 * and part of gravity always gets past the tyres (m/s² at the top), so no wall is ridden forever. */
export const PIPE_PULL = { aim: 0.3, slide: 6 };

/**
 * Quick sideways moves on a road (2026-11-19: "quicker tilt left right so I can do more small turns
 * on the track, which allow me to go left right while still moving in the same direction, as if you
 * wanted to skip an obstacle"): steering slides you across the road at up to `speed` m/s, easing
 * in at `in` and back out at `out` per second, while the heading barely changes. Never past an edge.
 */
export const DODGE = { speed: 16, in: 9, out: 7, steer: 14 };

/**
 * Four driving modes for every vehicle (2026-11-19: "4 driving modes for all vehicles. Easy tilt for
 * one, where you can easily slide left right of the track fast but still stay focused on the right
 * direction, so the flow continues"). Each scales the grip, how far past it the body may swing, how
 * much the keys turn the nose on a road, and the sideways move.
 * - Easy: wide, quick sideways slides; the nose barely turns, so you keep pointing down the road.
 * - Flow: as it was.
 * - Drift: looser grip, the tail swings wider; smaller sideways moves.
 * - Grip: tight and precise.
 */
export const MODES: Record<
  'easy' | 'flow' | 'drift' | 'grip',
  { grip: number; yaw: number; turn: number; dodge: number; dodgeIn: number }
> = {
  easy: { grip: 1.15, yaw: 0.85, turn: 0.35, dodge: 1.5, dodgeIn: 1.5 },
  flow: { grip: 1, yaw: 1, turn: 1, dodge: 1, dodgeIn: 1 },
  drift: { grip: 0.72, yaw: 1.4, turn: 1.1, dodge: 0.5, dodgeIn: 0.8 },
  grip: { grip: 1.3, yaw: 0.85, turn: 1, dodge: 0.8, dodgeIn: 1.2 },
};

export const ROAD_KEEP = {
  follow: 1,
  hold: 1,
  settle: 3,
  align: 2.5,
  angle: 0.35,
  edge: 5,
  push: 14,
  damp: 10,
};

/** A hit: push the vehicle out along (nx, ny) by depth; it loses a share of its speed and spins. */
export interface Hit {
  nx: number;
  ny: number;
  depth: number;
  loss: number;
  spin: number;
  /** Soft things (a dust devil) push without a bump. */
  soft?: boolean;
  /** A wall you flow along (2026-11-19): it takes only the speed into it, never a bounce, a loss
   * or a spin, and scraping it throws sparks. */
  flow?: boolean;
}

/** A drop under you this sudden (m, in one step) is flight, not ground to follow. */
export const DROP_AIR = 3;

export interface World {
  ground(x: number, y: number): Ground;
  collide?(v: Vehicle, t: number): Hit | null;
  /** Where gravity does not point down: the pull back to the road off a surf bend (m/s²). */
  pull?(x: number, y: number, z: number): { ax: number; ay: number; az: number } | null;
  /** This world's feel: how sharp and quick the turn, how far the body leans (1: as everywhere). */
  handling?: Handling;
}

export interface Handling {
  turn: number;
  lean: number;
  /** Grip mode at speed: up to this much more grip (and turn) at the top speed, from 40% of it. */
  fast?: number;
  /** Share of steering kept in the air (at least the vehicle's own), and of the turn the velocity
   * follows there. */
  air?: number;
}

export const FLAT: World = { ground: () => ({ h: 0, gx: 0, gy: 0, rough: 0 }) };

/**
 * Mars (2026-11-21: "much more tilt on the car and much more turn, much quicker turn. it goes way
 * too straight and rigid"): the same open plain, but the turn comes quicker and sharper and the body
 * leans far into it.
 */
/** How far the body leans in the air with full steering, against its most on the ground. */
export const AIR_LEAN = 1.2;

/**
 * 2026-11-23, on Mars in Grip mode: "allow turns to turn more when u are full tilt", "maybe it is
 * when i am full speed or high that it doesnt turn well": in Grip the grip grows with speed (up to
 * 1.9× at the top speed), so a full-speed carve turns about twice as tight; in the air every mode
 * keeps 60% of its steering and the flight bends with it, so a crest never locks you straight.
 */
export const MARS_HANDLING: Handling = { turn: 1.8, lean: 2.6, fast: 0.9, air: 0.6 };

/** How much more grip a world's Grip mode gives at a speed (1: none). */
export function fastGrip(feel: Handling, mode: string | undefined, speed: number, top: number) {
  if (mode !== 'grip' || !feel.fast) return 1;
  return 1 + feel.fast * clamp((speed / top - 0.4) / 0.6, 0, 1);
}
export const MARS_FLAT: World = { ...FLAT, handling: MARS_HANDLING };

/** What happened in a step, for the dust, the camera and the sound of it. */
export interface StepEvents {
  /** Speed into the ground at a landing (m/s), 0 if none. */
  landed: number;
  /** Speed into an obstacle (m/s), 0 if none. */
  bump: number;
  tookOff: boolean;
  /** Scraping a flowing wall: the speed along it (m/s, 0 if none) and the wall's normal. */
  scrape?: number;
  scrapeNx?: number;
  scrapeNy?: number;
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
    hand: 0,
    lift: 0,
    liftV: 0,
    dodge: 0,
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
export function leavesGround(
  z: number,
  vz: number,
  groundNext: number,
  dt: number,
  margin = LIFT_MARGIN,
): boolean {
  return z + vz * dt - 0.5 * G * dt * dt > groundNext + margin;
}

/**
 * How far ahead (s) and by how much (m) the free path must clear the ground to take off. Judged a
 * few hundredths of a second ahead rather than over one sub-step: a sub-step opens at most a
 * millimetre even over a sharp crest (so a fixed centimetre over one step never let anything fly),
 * while over 0.06 s a crest opens several centimetres and a ripple in the road does not.
 */
export const LIFT_LOOK = 0.06;
export const LIFT_MARGIN = 0.03;

/** Share of the speed a landing costs: nothing for a kiss, up to 12% for a slam. */
export function landingLoss(impact: number): number {
  return clamp((impact - 3) * 0.008, 0, 0.12);
}

const SUB = 1 / 120;

/** The most upward speed a take-off keeps (m/s): about a second in the air for the car. */
export const MAX_LAUNCH = 11;

/** Climbing and diving: the most m/s, how fast it eases in, and the ceiling over the ground (m). */
export const CLIMB = { rate: 26, ease: 4, top: 62 };

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

  // The handbrake, eased: on fast, off slowly. The ship's field brakes too, a little less.
  const handOn = !!ctl.handbrake && !air && v.vLong > 1;
  v.hand = ease(v.hand ?? 0, handOn ? 1 : 0, handOn ? HANDBRAKE.on : HANDBRAKE.off, dt);
  const hb = v.hand * (v.kind === 'car' ? 1 : 0.8);

  // Steering turns the body.
  // Quicker on a road, so small left-right moves come at once.
  const feel = world.handling ?? { turn: 1, lean: 1 };
  v.steer = ease(v.steer, ctl.steer, (here.road && !air ? DODGE.steer : 7) * feel.turn, dt);
  const authority = air ? Math.max(spec.airSteer, feel.air ?? 0) : 1;
  const fastK = fastGrip(feel, ctl.mode, Math.hypot(v.vx, v.vy), spec.vTop);
  const delta = clamp(
    v.steer * steerLimit(v.vLong) * feel.turn * (1 + HANDBRAKE.steer * hb),
    -1,
    1,
  );
  // The body never turns much faster than the grip can swing the velocity after it, so a held key
  // at speed is a drift you can hold, not a spin: the yaw is capped near the grip's own turn rate.
  // A bank adds its own hold (gravity across the slope), so a banked bend can be taken faster.
  const bankHold = air ? 0 : G * Math.abs(-here.gx * Math.sin(v.h) + here.gy * Math.cos(v.h));
  // On a road, heading its way: the bend turns the body and the road lends the grip it needs.
  const guide = spec.keep > 0 ? here.road : undefined;
  const road = air ? undefined : guide;
  let follow = 0;
  let roadHold = 0;
  const off = guide ? wrapAngle(guide.h - v.h) : 0;
  const roadOn = !!guide && v.vLong > 1 && Math.cos(off) > 0.3;
  if (road && roadOn) {
    follow = v.vLong * road.k * ROAD_KEEP.follow * spec.keep;
    // Lined up by where it goes (the heading plus the slip), so a slow slide outward is caught too.
    // High on a pipe, the way to line up with points back down toward the road.
    const down = -Math.sign(road.u) * PIPE_PULL.aim * (road.pipe ?? 0);
    const course = wrapAngle(road.h + down - v.h - v.slip);
    follow += course * ROAD_KEEP.align * spec.keep * (1 - Math.min(1, Math.abs(ctl.steer)));
    roadHold = Math.abs(road.k) * v.vLong * v.vLong * ROAD_KEEP.hold * spec.keep;
  }
  const mode = MODES[ctl.mode ?? 'flow'];
  const yawCap =
    ((spec.grip * mode.grip * (1 + (fastK - 1) * 0.5) * spec.yawGrip * mode.yaw + bankHold) /
      Math.max(Math.abs(v.vLong), 6)) *
    (1 + HANDBRAKE.yaw * hb) *
    feel.turn;
  // A slide straightens itself (the tyres pull the nose round toward where it goes), firmly on a
  // road, gently on open ground, and not while the handbrake holds the tail out.
  // Off the road only the part of a slide past 7° (the drift you hold stays yours; a spin is caught).
  const settle = road
    ? ROAD_KEEP.settle * spec.keep * v.slip
    : HANDBRAKE.settle * (1 - hb) * Math.sign(v.slip) * Math.max(0, Math.abs(v.slip) - 0.12);
  let steerYaw = clamp((v.vLong * Math.tan(delta)) / spec.wheelbase, -yawCap, yawCap);
  // On a road the mode sets how much the keys turn the nose (Easy: the sideways move does the work).
  if (road && roadOn) steerYaw *= mode.turn;
  // In the air too, so a glide never turns the ship sideways to the road.
  if (roadOn && guide) {
    const road = guide;
    // The keys never turn you further than the angle from the road's way, and less as the edge
    // you are heading for comes near (none in its last metre), so you glide onto it, never into it.
    const across = Math.sign(-off);
    let lim = ROAD_KEEP.angle;
    if (across === Math.sign(road.u)) lim *= clamp((road.half - Math.abs(road.u) - 1) / 10, 0, 1);
    if (steerYaw * -off >= 0) steerYaw *= clamp((lim - Math.abs(off)) / 0.08, 0, 1);
    if (Math.abs(off) > lim) follow += (off - Math.sign(off) * lim) * 4 * spec.keep;
  }
  const target = (steerYaw + follow + settle) * authority;
  v.yawRate = ease(v.yawRate, target, (air ? 3 : 8) * feel.turn, dt);
  v.h = wrapAngle(v.h + v.yawRate * dt);
  // A world that steers in the air bends the flight with the body (Mars).
  if (air && feel.air) {
    const turn = v.yawRate * dt * feel.air;
    const c = Math.cos(turn);
    const sn = Math.sin(turn);
    const vx = v.vx;
    v.vx = vx * c - v.vy * sn;
    v.vy = vx * sn + v.vy * c;
  }

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

  // Through the gears: strongest low in each, easing toward the shift, when pulling forward.
  const gearK = throttle > 0 && vLong > 0 ? gearPull(gearOf(v.kind, vLong, spec.vTop).revs) : 1;
  let a =
    pull(spec, vLong, throttle, ctl.boost) *
    gearK *
    (air ? spec.airPull : 1) *
    (1 - HANDBRAKE.pull * hb);
  if (hb > 0 && Math.abs(vLong) > 1) a -= Math.sign(vLong) * HANDBRAKE.drag * hb;
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
    const want =
      -vLat *
      (1 - Math.exp(-spec.gripRate * grip * (road ? 2 : 1) * (1 - HANDBRAKE.rate * hb) * dt));
    const most =
      (spec.grip * MODES[ctl.mode ?? 'flow'].grip * fastK * grip * (1 - HANDBRAKE.grip * hb) +
        roadHold) *
      dt;
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

  // Near a road's edge, the road eases you back in: the speed outward fades and a soft push turns
  // you back toward the middle, so you ride along the edge instead of up it.
  // It works in the air too, so a jump on a bend lands on the road: the flight curves with it.
  const edgeRoad = spec.keep > 0 ? here.road : undefined;
  // The dodge: across the road, beside the velocity (the tyres never scrub it away), easing out
  // as an edge comes near.
  const dodging = !!edgeRoad && !air && vLong > 3 && Math.cos(wrapAngle(edgeRoad.h - v.h)) > 0.3;
  const dm = MODES[ctl.mode ?? 'flow'];
  const wantDodge = dodging ? ctl.steer * DODGE.speed * dm.dodge : 0;
  v.dodge = ease(
    v.dodge ?? 0,
    wantDodge,
    Math.abs(wantDodge) > 0.5 ? DODGE.in * dm.dodgeIn : DODGE.out,
    dt,
  );
  if (edgeRoad && v.dodge !== 0) {
    const room = edgeRoad.half - ROAD_KEEP.edge - Math.abs(edgeRoad.u);
    if (Math.sign(v.dodge) === Math.sign(edgeRoad.u || v.dodge))
      v.dodge *= clamp(room / 4, 0, 1) * (1 - (edgeRoad.pipe ?? 0));
    v.x += -Math.sin(edgeRoad.h) * v.dodge * dt;
    v.y += Math.cos(edgeRoad.h) * v.dodge * dt;
  }
  if (edgeRoad && air && vLong > 1 && Math.cos(wrapAngle(edgeRoad.h - v.h)) > 0.3) {
    const turn = vLong * edgeRoad.k * spec.keep * dt;
    const c = Math.cos(turn);
    const sn = Math.sin(turn);
    const vx = v.vx;
    v.vx = vx * c - v.vy * sn;
    v.vy = vx * sn + v.vy * c;
    v.h = wrapAngle(v.h + turn);
  }
  if (edgeRoad && !air && (edgeRoad.pipe ?? 0) > 0) {
    const p = edgeRoad.pipe ?? 0;
    const side = Math.sign(edgeRoad.u);
    const a = PIPE_PULL.slide * p * dt;
    v.vx -= -Math.sin(edgeRoad.h) * side * a;
    v.vy -= Math.cos(edgeRoad.h) * side * a;
  }
  if (edgeRoad) {
    const road = edgeRoad;
    const over = Math.abs(road.u) - (road.half - ROAD_KEEP.edge);
    if (over > 0) {
      const side = Math.sign(road.u);
      const ox = -Math.sin(road.h) * side;
      const oy = Math.cos(road.h) * side;
      const k = clamp(over / ROAD_KEEP.edge, 0, 1) * spec.keep;
      const out = v.vx * ox + v.vy * oy;
      const back =
        (out > 0 ? out * (1 - Math.exp(-ROAD_KEEP.damp * k * dt)) : 0) + ROAD_KEEP.push * k * dt;
      v.vx -= ox * back;
      v.vy -= oy * back;
    }
  }

  // Up and down: follow the ground, or fly.
  const next = world.ground(v.x, v.y);
  // The ship climbs and dives as the City's does (W and S in Sky Canyon), easing into the climb and
  // out of it, between the ground and its ceiling; the car stays on the ground.
  const climb = v.kind === 'ship' ? clamp(ctl.climb ?? 0, -1, 1) : 0;
  v.liftV = ease(v.liftV ?? 0, climb * CLIMB.rate, CLIMB.ease, dt);
  v.lift = (v.lift ?? 0) + v.liftV * dt;
  if (v.lift <= 0 || v.kind !== 'ship') {
    v.lift = 0;
    v.liftV = Math.max(0, v.liftV);
  } else if (v.lift >= CLIMB.top) {
    v.lift = CLIMB.top;
    v.liftV = Math.min(0, v.liftV);
  }
  const floor = next.h + spec.hover + v.lift;
  let surfLean: number | null = null;
  if (air) {
    const pull = world.pull?.(v.x, v.y, v.z);
    if (pull) {
      // Off a surf bend: drawn back to the road, the body rolling into the pull so you come round
      // nearly upside down and back onto your wheels (2026-11-22: "this awesome surfy flight
      // pattern where it tilts even more and almost flips before coming back down").
      v.vx += pull.ax * dt;
      v.vy += pull.ay * dt;
      v.vz += pull.az * dt;
      const side = -pull.ax * Math.sin(v.h) + pull.ay * Math.cos(v.h);
      surfLean = clamp(Math.atan2(side, Math.max(0.5, -pull.az + 4)) * 2.8, -2.7, 2.7);
    } else v.vz -= G * spec.airGravity * dt;
    v.z += v.vz * dt;
    v.airTime += dt;
    // The ship's field catches it again near the ground on the way down: it floats over small
    // rises and the banks' lips instead of leaving the road at every one.
    const caught = spec.cling > 0 && v.vz <= 0 && v.z - floor < 0.35 && v.airTime < 0.5;
    if (v.z <= floor || caught) {
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
  } else if (
    !(next.lip ?? 0) &&
    leavesGround(
      v.z,
      v.vz,
      world.ground(v.x + v.vx * LIFT_LOOK, v.y + v.vy * LIFT_LOOK).h +
        spec.hover +
        v.lift +
        v.liftV * LIFT_LOOK,
      LIFT_LOOK,
      LIFT_MARGIN + spec.cling,
    )
  ) {
    // A crest throws you up, but never harder than a jump you can read and land.
    v.vz = Math.min(v.vz, MAX_LAUNCH);
    v.z += v.vz * dt - 0.5 * G * dt * dt;
    v.vz -= G * dt;
    v.air = true;
    v.airTime = 0;
    ev.tookOff = true;
  } else if (floor < v.z - DROP_AIR) {
    // The ground gone from under you (a surf's lip, a cliff): you fly from where you are, never
    // snapped down to wherever the ground went.
    v.z += v.vz * dt;
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
    if (hit.flow) {
      // Flow on: the speed into the wall is turned along it, none lost, and sparks fly.
      if (vn < 0) {
        const sp = Math.hypot(v.vx, v.vy);
        v.vx -= vn * hit.nx;
        v.vy -= vn * hit.ny;
        const k = sp / (Math.hypot(v.vx, v.vy) || 1);
        v.vx *= k;
        v.vy *= k;
      }
      const along = Math.abs(-v.vx * hit.ny + v.vy * hit.nx);
      if (along > (ev.scrape ?? 0)) {
        ev.scrape = along;
        ev.scrapeNx = hit.nx;
        ev.scrapeNy = hit.ny;
      }
    } else if (vn < 0) {
      const bounce = hit.soft ? 1 : 1.25;
      v.vx -= bounce * vn * hit.nx;
      v.vy -= bounce * vn * hit.ny;
      // The loss and the spin go with how hard it struck, not with how long it touches: a glancing
      // scrape along a barrier (contact every sub-step) keeps its speed and flows on, a head-on hit
      // (14 m/s or more into it) takes the whole share and the spin.
      const hard = clamp(-vn / 14, 0, 1);
      const keep = 1 - hit.loss * hard;
      v.vx *= keep;
      v.vy *= keep;
      v.yawRate += hit.spin * hard;
      if (!hit.soft) ev.bump = Math.max(ev.bump, -vn);
    }
    // Along a wall the body swings back parallel to it, so a scrape ends pointing down the road.
    if (!hit.soft) {
      const along = Math.atan2(v.vy, v.vx);
      const off = wrapAngle(along - v.h);
      if (Math.hypot(v.vx, v.vy) > 4 && Math.abs(off) < 1.2) {
        v.yawRate += off * 6 * dt;
        // A flowing wall turns the nose along it at once, so the tyres never scrub against it.
        if (hit.flow) {
          v.h = wrapAngle(v.h + off * (1 - Math.exp(-30 * dt)));
          v.yawRate *= Math.exp(-10 * dt);
        }
      }
    }
  }

  // The body leans with the turn and with the ground; the nose follows the slope or the flight.
  const lateral = vLong * v.yawRate + (v.dodge ?? 0) * 3;
  const sideSlope = -next.gx * fy + next.gy * fx;
  const aheadSlope = next.gx * fx + next.gy * fy;
  const lean = (v.kind === 'ship' ? 0.012 : 0.0035) * feel.lean;
  const leanMax = (v.kind === 'ship' ? 0.4 : 0.09) * feel.lean;
  // In the air it still leans with the wheel (2026-11-22: "I need tilt to keep working when in the
  // air"): the tyres don't turn you there, so the lean follows your steering, not the turn.
  const rollTo = air
    ? clamp(v.steer * leanMax * AIR_LEAN + lateral * lean, -leanMax * AIR_LEAN, leanMax * AIR_LEAN)
    : -Math.atan(sideSlope) +
      // Both lean into the turn: the side you turn toward goes down (the car: "when you turn left
      // you lean left"; the ship, 2026-11-19: "when I turn right the right side should be lower").
      clamp(lateral * lean, -leanMax, leanMax);
  v.roll =
    surfLean !== null ? ease(v.roll, surfLean, 3.5, dt) : ease(v.roll, rollTo, air ? 4 : 6, dt);
  const pitchTo = air
    ? Math.atan2(v.vz, Math.max(speed, 5)) * 0.6
    : Math.atan(aheadSlope) + clamp(Math.atan2(v.liftV, Math.max(speed, 10)) * 0.8, -0.22, 0.22);
  v.pitch = ease(v.pitch, pitchTo, air ? 2 : 8, dt);
}

export function speedOf(v: Vehicle): number {
  return Math.hypot(v.vx, v.vy);
}
