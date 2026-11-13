/*
 * The Dot Walker, shared (docs/specs/art-vegetal.md, the Bird Sim's walker; docs/specs/art-city.md,
 * "Docks and rooms"): the golden figure of dots from the Dot Walker Arena, in the round. Pure: no
 * three.js, no DOM.
 *
 * 2026-11-12, the user: "rooms are places where the dot walker can rest. improve the dot walker
 * to walk across these."
 *
 * Its body (a round head, a body wide at the shoulders, arms swinging against the legs, dust at
 * its feet) is the Vegetal's, with a seated pose added. Its steps are smoother than the forest's:
 * the pace and the turn both ease in and out, it slides along walls instead of stopping dead, and
 * it can sit down to rest.
 */

import { fibonacciSphere, type Vec3 } from './bigbang';

const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Walking pace in units a second; Shift runs at twice it. */
export const WALK_SPEED = 3.2;
/** How far one stride carries it. */
export const WALK_STRIDE = 1.5;
/** How high its head stands. */
export const WALKER_H = 3.4;

/** The walker's pose, for its body: where it stands, which way it faces, its stride and pace. */
export type WalkerPose = {
  c: Vec3;
  f: Vec3;
  /** Strides so far, and how fast it goes, 0 standing to 1 running. */
  stride: number;
  pace: number;
  /** How far it has sat down, 0 standing to 1 seated. */
  sit?: number;
};

/**
 * A grain of the Dot Walker standing at c facing f (`i` its number, `a`, `b`, `d` its own numbers
 * in 0..1): a round head, a body, arms and legs swinging opposite as it strides, more the faster
 * it goes, dust kicked up where its feet land; seated, its thighs forward and its hands on them.
 */
export function walkerBody(
  p: { i: number; a: number; b: number; d: number },
  me: WalkerPose,
  t: number,
): Vec3 {
  const side = norm(cross(me.f, [0, 1, 0]));
  const sit = me.sit ?? 0;
  // Seated, the whole figure sinks onto its seat (the hips at about 1.1).
  const drop = 0.65 * sit;
  const at = (fw: number, sd: number, u: number): Vec3 =>
    add(add(add(me.c, me.f, fw), side, sd), [0, 1, 0], u - drop);
  const ph = me.stride * Math.PI;
  const swing = (0.15 + 0.55 * me.pace) * (1 - sit);
  const bob = (0.1 * me.pace * Math.abs(Math.sin(ph)) + 0.03 * Math.sin(t * 1.6)) * (1 - sit);
  const breath = 0.02 * Math.sin(t * 1.1) * sit;
  const d = fibonacciSphere(p.i % 89, 89);
  const q = p.b;
  if (p.a < 0.14) return at(d[2] * 0.3, d[0] * 0.3, 3.05 + bob + breath + d[1] * 0.32);
  if (p.a < 0.42) {
    // The body: wide at the shoulders, narrow at the waist, leaning back a little when seated.
    const h = 1.65 + 1.05 * q;
    const w = 0.28 + 0.2 * q;
    return at(d[2] * 0.18 + 0.05 * me.pace - 0.12 * sit * q, d[0] * w, h + bob + d[1] * 0.05);
  }
  if (p.a < 0.62) {
    // An arm from the shoulder, swinging against the leg on its side; seated, resting on the thigh.
    const s = p.a < 0.52 ? -1 : 1;
    const a = -s * swing * Math.sin(ph) + 0.55 * sit;
    const len = 1.15 * q;
    return at(Math.sin(a) * len, s * (0.52 + 0.06 * q), 2.6 + bob - Math.cos(a) * len);
  }
  if (p.a < 0.92) {
    // A leg: the thigh swings from the hip, the shin bends back as the foot comes through; seated,
    // the thigh lies forward on the seat and the shin hangs down to the floor.
    const s = p.a < 0.77 ? -1 : 1;
    const a1 = s * swing * Math.sin(ph) + (Math.PI / 2) * sit;
    const a2 = (a1 - 1.1 * me.pace * Math.max(0, Math.sin(ph * s + Math.PI / 2)) * 0.6) * (1 - sit);
    const knee: Vec3 = [Math.sin(a1) * 0.82, s * 0.22, 1.65 + bob - Math.cos(a1) * 0.82];
    const k = q < 0.5 ? q * 2 : 1;
    if (q < 0.5) return at(knee[0] * k, knee[1], 1.65 + bob + (knee[2] - 1.65 - bob) * k);
    const u = (q - 0.5) * 2;
    return at(knee[0] + Math.sin(a2) * 0.82 * u, knee[1], knee[2] - Math.cos(a2) * 0.82 * u);
  }
  // Dust at the feet, rising and spreading from each step (none while seated).
  const f = frac(p.b + me.stride * 0.5);
  const a = p.d * TAU;
  return at(
    Math.cos(a) * (0.3 + 0.8 * f) - 0.6 * f,
    Math.sin(a) * (0.3 + 0.8 * f),
    0.05 + 0.5 * f * me.pace * (1 - sit),
  );
}
/** Whether grain p of the walker is dust (shown only while it walks). */
export const isDust = (p: { a: number }) => p.a >= 0.92;

/* ---------- walking: smooth steps, walls to slide along, a seat to rest on ---------- */

export type Walker = {
  /** On the floor plane: x, z; its height over the floor while it jumps. */
  x: number;
  z: number;
  jump: number;
  vy: number;
  yaw: number;
  /** Its pace along its heading (eased) and how fast it turns (eased). */
  speed: number;
  spin: number;
  stride: number;
  /** How far it has sat down (0..1), and how long it has stood still on the seat. */
  sit: number;
  still: number;
};

export const newWalker = (x = 0, z = 0, yaw = 0): Walker => ({
  x,
  z,
  jump: 0,
  vy: 0,
  yaw,
  speed: 0,
  spin: 0,
  stride: 0,
  sit: 0,
  still: 0,
});

/** Its heading on the floor: yaw 0 faces -z, as the city's ships do. */
export const heading = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];

/** How long it stands still on the seat before it sits down. */
export const SIT_AFTER = 0.8;

/**
 * One frame of walking: W walks on, S steps back, A and D turn, Shift runs, Space jumps. The pace
 * and the turn ease in and out; `free(x, z)` says where it may stand, and a step into a wall
 * slides along it; standing still on the seat (`seat(x, z)`) for a moment, it sits down, and any
 * step stands it up again.
 */
export function stepWalker(
  w: Walker,
  keys: string[],
  dt: number,
  free: (x: number, z: number) => boolean,
  seat: (x: number, z: number) => boolean = () => false,
): Walker {
  const held = (...names: string[]) => names.some((n) => keys.includes(n));
  const fwd = held('w', 'arrowup') ? 1 : held('s', 'arrowdown') ? -0.6 : 0;
  const turn = (held('a', 'arrowleft') ? 1 : 0) - (held('d', 'arrowright') ? 1 : 0);
  const run = held('shift') ? 2 : held('x') ? 0.5 : 1;
  const ease = (rate: number) => 1 - Math.exp(-rate * dt);
  const moving = fwd !== 0 || turn !== 0;
  // Seated: a step or a turn stands it up first.
  if (w.sit > 0 && moving) w.sit = Math.max(0, w.sit - dt * 2.5);
  if (w.sit > 0.05) {
    w.speed = 0;
    w.spin = 0;
  } else {
    w.spin += (turn * 1.9 - w.spin) * ease(9);
    w.yaw += w.spin * dt;
    w.speed += (WALK_SPEED * run * fwd - w.speed) * ease(fwd === 0 ? 10 : 5);
  }
  const [hx, hz] = heading(w.yaw);
  const nx = w.x + hx * w.speed * dt;
  const nz = w.z + hz * w.speed * dt;
  // Into a wall: slide along it on whichever way is free.
  if (free(nx, nz)) [w.x, w.z] = [nx, nz];
  else if (free(nx, w.z)) w.x = nx;
  else if (free(w.x, nz)) w.z = nz;
  else w.speed *= 0.5;
  w.stride += (Math.abs(w.speed) * dt) / WALK_STRIDE;
  if (held(' ', 'space') && w.jump <= 0 && w.sit <= 0) w.vy = 6;
  w.vy -= 18 * dt;
  w.jump = Math.max(0, w.jump + w.vy * dt);
  if (w.jump <= 0) w.vy = Math.max(0, w.vy);
  // Resting: still on the seat a moment, it sits.
  const onSeat = seat(w.x, w.z) && Math.abs(w.speed) < 0.3 && w.jump <= 0 && !moving;
  w.still = onSeat ? w.still + dt : 0;
  if (w.still > SIT_AFTER) w.sit = Math.min(1, w.sit + dt * 1.2);
  return w;
}
