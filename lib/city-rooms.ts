/*
 * The rooms behind the docks (docs/specs/art-city.md, "Docks and rooms"): small cyberpunk sky
 * lounges where the Dot Walker walks and rests, each with a window wall on its own view of the
 * city. Pure: no three.js, no DOM.
 *
 * 2026-11-12, the user: "rooms are places where the dot walker can rest. improve the dot walker
 * to walk across these." Queued with it: "cyberpunk rooms the Dot Walker walks through, with
 * panoramas"; perspective is the point, so the view out of the window is the real city, seen from
 * where the room hangs: the Ship's renderer keeps drawing it from the walker's eye, and only what
 * the window lets through is shown (`roomSeeThrough`).
 *
 * Inside: a floor grid, neon edges in the room's two hues, light strips up the side walls breathing
 * on the city's beat, the room's word in neon on the back wall, a window wall of mullions, a sofa
 * facing the view with a lamp, plants in the corners, light strips along the ceiling. W and S walk,
 * A and D turn, Shift runs, Space jumps; the walls hold the walker and it slides along them. Stand
 * still on the sofa a moment and it sits: the eye settles behind its shoulder and drifts slowly
 * over the view. Enter (or Esc) goes back to the ship on its pad.
 *
 * The Embassies of Happiness' big rooms (`arcade` docks, lib/city-embassy.ts) hold an arcade
 * cabinet against the left wall, SHARK SIMULATOR on its marquee and a little shark swimming on its
 * screen. Walk up to it and the words ask "Do you want to take a rest from the city and play Shark
 * Simulator?"; Enter says yes (`roomStep` answers 'arcade', and the city opens the Ocean's Shark
 * Sim).
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { type Placed, roomPoint } from './city-docks';
import { textPixels } from './city-font';
import { beat, C, mix, scale, TAU } from './city-grid';
import { heading, isDust, newWalker, stepWalker, walkerBody } from './dot-walker';

type Eye = { eye: Vec3; target: Vec3 };
type Spot = { pos: Vec3; rgb: RGB };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const frac = (x: number) => x - Math.floor(x);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

const room = {
  P: null as Placed | null,
  w: newWalker(),
  since: 0,
  t: 0,
  /** Keys held last frame, to catch a press of Enter. */
  held: [] as string[],
};

export const inRoom = () => room.P !== null;
export const currentRoom = () => room.P;
export const roomWalker = () => room.w;

/** The room's local frame: a world point's place across it (side) and along its view (out). */
function local(P: Placed, x: number, z: number): [number, number] {
  const dx = x - P.c[0];
  const dz = z - P.c[2];
  return [dx * P.r[0] + dz * P.r[2], dx * P.v[0] + dz * P.v[2]];
}

/** The sofa: its back's band along the view, its seat's band, and its half length across. */
const SOFA_HALF = 1.9;
const sofaBack = (d: number) => d / 2 - 3.3;
const seatOut = (d: number) => d / 2 - 2.1;
const WALL_ROOM = 0.55;

/**
 * The arcade cabinet in an embassy's room: its middle against the left wall (across, along the
 * view), facing into the room (+side); half as deep and wide as these, this tall to its marquee.
 */
const CAB_DEPTH = 0.45;
const CAB_HALF = 0.9;
const CAB_H = 2.25;
const cabinetAt = (P: Placed): [number, number] => [
  -P.dock.w + CAB_DEPTH + 0.1,
  -P.dock.d / 2 + 2.4,
];

/** Whether the walker stands at the cabinet, in front of it and turned toward it. */
export function atCabinet(P: Placed, x: number, z: number, yaw: number): boolean {
  if (!P.dock.arcade) return false;
  const [cs, co] = cabinetAt(P);
  const [s, o] = local(P, x, z);
  const front = s - (cs + CAB_DEPTH);
  if (front < 0.3 || front > 2.4 || Math.abs(o - co) > CAB_HALF + 0.5) return false;
  // Facing the cabinet (toward -side) at least a little.
  const [hx, hz] = heading(yaw);
  return -(hx * P.r[0] + hz * P.r[2]) > 0.2;
}

/** The words at the cabinet. */
export const ARCADE_PROMPT =
  'Do you want to take a rest from the city and play Shark Simulator? Enter: yes';

/** Where the walker may stand: inside the walls, off the sofa's back, the plants and the cabinet. */
export function roomFree(P: Placed, x: number, z: number): boolean {
  const { w, d } = P.dock;
  const [s, o] = local(P, x, z);
  if (Math.abs(s) > w - WALL_ROOM || Math.abs(o) > d / 2 - WALL_ROOM) return false;
  if (P.dock.arcade) {
    const [cs, co] = cabinetAt(P);
    if (s < cs + CAB_DEPTH + 0.35 && Math.abs(o - co) < CAB_HALF + 0.3) return false;
  }
  if (Math.abs(s) < SOFA_HALF + 0.3 && o > sofaBack(d) - 0.35 && o < sofaBack(d) + 0.55)
    return false;
  // Plants in the two corners by the window.
  for (const sx of [-1, 1]) {
    if (Math.hypot(s - sx * (w - 0.9), o - (d / 2 - 0.9)) < 0.9) return false;
  }
  return true;
}
/** Whether a point is on the sofa's seat. */
export function onSeat(P: Placed, x: number, z: number): boolean {
  const [s, o] = local(P, x, z);
  return Math.abs(s) < SOFA_HALF - 0.2 && Math.abs(o - seatOut(P.dock.d)) < 0.75;
}

/** The yaw that looks down a level direction (yaw 0 looks down -z). */
const yawOf = (v: Vec3) => Math.atan2(-v[0], -v[2]);

/** Into the room of dock P: the walker by the door on the pad's side, facing the view. */
export function enterRoom(P: Placed, t: number) {
  const door = roomPoint(P, P.dock.w - 1.3, 0, 0);
  room.P = P;
  room.w = newWalker(door[0], door[2], yawOf(P.v));
  room.since = t;
  room.t = t;
  room.held = ['enter'];
}
/** Out of the room. */
export function leaveRoom() {
  room.P = null;
}

/**
 * The room each frame: whether it is played, the keys, the time step and the time. Returns
 * 'arcade' when Enter is pressed at the cabinet (yes, Shark Simulator), 'leave' when it is pressed
 * anywhere else or the game is let go (Esc), else 'stay'.
 */
export function roomStep(
  active: boolean,
  keys: string[],
  dt: number,
  t: number,
): 'stay' | 'leave' | 'arcade' {
  const P = room.P;
  if (!P) return 'leave';
  room.t = t;
  const enter = keys.includes('enter') && !room.held.includes('enter');
  room.held = [...keys];
  if (!active) return 'leave';
  if (enter) return atCabinet(P, room.w.x, room.w.z, room.w.yaw) ? 'arcade' : 'leave';
  const w = room.w;
  stepWalker(
    w,
    keys,
    dt,
    (x, z) => roomFree(P, x, z),
    (x, z) => onSeat(P, x, z),
  );
  // Sitting, it turns to face the view and settles on the middle of the seat.
  if (w.sit > 0) {
    const want = yawOf(P.v);
    let dy = want - w.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    w.yaw += dy * (1 - Math.exp(-4 * dt));
    const [s] = local(P, w.x, w.z);
    const to = roomPoint(P, s * 0.98, seatOut(P.dock.d), 0);
    w.x += (to[0] - w.x) * (1 - Math.exp(-3 * dt));
    w.z += (to[2] - w.z) * (1 - Math.exp(-3 * dt));
  }
  return 'stay';
}

/** The walker's pose in the world, for its body and the eye. */
export function walkerPose(): { c: Vec3; f: Vec3; stride: number; pace: number; sit: number } {
  const P = room.P;
  const w = room.w;
  const [hx, hz] = heading(w.yaw);
  return {
    c: [w.x, (P ? P.c[1] : 0) + w.jump, w.z],
    f: [hx, 0, hz],
    stride: w.stride,
    pace: Math.min(1, Math.abs(w.speed) / 6.4),
    sit: smooth(w.sit),
  };
}

/**
 * The eye in the room: behind the walker over its shoulder, kept inside the walls; seated, behind
 * its head looking out of the window, drifting slowly over the view (and up at the sky lanes from
 * the street lounge).
 */
export function roomCamera(t: number): Eye | null {
  const P = room.P;
  if (!P) return null;
  const { w, d, h, tilt } = P.dock;
  const me = walkerPose();
  const keep = (q: Vec3): Vec3 => {
    const [s, o] = local(P, q[0], q[2]);
    const cs = Math.max(-w + 0.3, Math.min(w - 0.3, s));
    const co = Math.max(-d / 2 + 0.3, Math.min(d / 2 - 0.3, o));
    const y = Math.max(P.c[1] + 0.8, Math.min(P.c[1] + h - 0.25, q[1]));
    return roomPoint(P, cs, co, y - P.c[1]);
  };
  const stand: Eye = {
    eye: keep([me.c[0] - me.f[0] * 3.4, me.c[1] + 3.1, me.c[2] - me.f[2] * 3.4]),
    target: [me.c[0] + me.f[0] * 7, me.c[1] + 2.3, me.c[2] + me.f[2] * 7],
  };
  if (me.sit <= 0) return stand;
  // Drifting slowly over the view: a turn of a few degrees each way, a little up and down.
  const sway = 0.22 * Math.sin((t - room.since) * 0.05);
  const lift = tilt + 0.05 * Math.sin((t - room.since) * 0.037);
  const c = Math.cos(sway);
  const s = Math.sin(sway);
  const look: Vec3 = [P.v[0] * c - P.v[2] * s, 0, P.v[2] * c + P.v[0] * s];
  const head: Vec3 = [me.c[0] - P.v[0] * 0.9, me.c[1] + 3.2, me.c[2] - P.v[2] * 0.9];
  const seated: Eye = {
    eye: keep(head),
    target: [head[0] + look[0] * 30, head[1] + lift * 30, head[2] + look[2] * 30],
  };
  const k = me.sit;
  return {
    eye: [
      lerp(stand.eye[0], seated.eye[0], k),
      lerp(stand.eye[1], seated.eye[1], k),
      lerp(stand.eye[2], seated.eye[2], k),
    ],
    target: [
      lerp(stand.target[0], seated.target[0], k),
      lerp(stand.target[1], seated.target[1], k),
      lerp(stand.target[2], seated.target[2], k),
    ],
  };
}

/**
 * What the window lets the eye see: a point of the city shows only if the line to it from the eye
 * leaves the room through the window wall (or the glass ceiling, in a room that looks up). Nothing
 * inside the room is the city's: the room draws its own.
 */
export function roomSeeThrough(eye: Vec3): ((x: number, y: number, z: number) => boolean) | null {
  const P = room.P;
  if (!P) return null;
  const { w, d, h, tilt } = P.dock;
  const [es, eo] = local(P, eye[0], eye[2]);
  const ey = eye[1] - P.c[1];
  const skylight = tilt > 0.3;
  return (x, y, z) => {
    const [ps, po] = local(P, x, z);
    const py = y - P.c[1];
    if (po > d / 2) {
      const k = (d / 2 - eo) / (po - eo);
      const s = es + (ps - es) * k;
      const yy = ey + (py - ey) * k;
      if (k > 0 && k <= 1 && Math.abs(s) < w - 0.05 && yy > 0.15 && yy < h - 0.1) return true;
    }
    if (skylight && py > h) {
      const k = (h - ey) / (py - ey);
      const s = es + (ps - es) * k;
      const o = eo + (po - eo) * k;
      if (k > 0 && k <= 1 && Math.abs(s) < w - 0.05 && Math.abs(o) < d / 2 - 0.05) return true;
    }
    return false;
  };
}

/** Whether anything within r of (x, z) can lie beyond the window wall (a quick test, before the exact one). */
export function roomBeyond(x: number, z: number, r: number): boolean {
  const P = room.P;
  if (!P) return true;
  const [, o] = local(P, x, z);
  return o + r > P.dock.d / 2 || P.dock.tilt > 0.3;
}

/* ---------- the room's own grains ---------- */

const WALKER_SHARE = 0.22;
/** In an embassy's room, the cabinet's share of the grains after the walker's. */
const CABINET_SHARE = 0.2;

/**
 * Grain L of the n the room draws with (the ship's and the other ships' share of the frame): the
 * Dot Walker first, then the room.
 */
export function roomGrain(L: number, n: number, t: number): Spot {
  const P = room.P;
  if (!P) return { pos: [0, 0, 0], rgb: [0, 0, 0] };
  const u = (L + 0.5) / n;
  if (u < WALKER_SHARE) {
    const me = walkerPose();
    const p = {
      i: L,
      a: frac(L * 0.6180339887 + 0.13),
      b: frac(L * 0.7548776662 + 0.5),
      d: frac(L * 0.569840291 + 0.5),
    };
    const pos = walkerBody(p, me, t);
    const head = p.a < 0.14 ? 1.25 : 1;
    const dust = isDust(p) ? me.pace * 0.5 * (1 - me.sit) : 1;
    return { pos, rgb: scale(C.gold, 0.5 * head * dust) };
  }
  if (P.dock.arcade && u < WALKER_SHARE + CABINET_SHARE)
    return cabinetSite(P, (u - WALKER_SHARE) / CABINET_SHARE, L, t);
  const k = P.dock.arcade ? WALKER_SHARE + CABINET_SHARE : WALKER_SHARE;
  return roomSite(P, (u - k) / (1 - k), L, t);
}

/**
 * A point of the arcade cabinet, q (0..1) through it: its outline in neon, SHARK SIMULATOR on its
 * marquee, a blue screen with a little shark swimming across it after a fish, its stick and
 * buttons, and a pool of its light on the floor.
 */
function cabinetSite(P: Placed, q: number, L: number, t: number): Spot {
  const [h1, h2] = P.dock.hues;
  const [cs, co] = cabinetAt(P);
  const r = (salt: number) => hash(L, salt);
  // f: out from the wall (into the room), a: across (along the view), y: up.
  const at = (f: number, a: number, y: number, c: RGB, k: number): Spot => ({
    pos: roomPoint(P, cs + f, co + a, y),
    rgb: scale(c, k),
  });
  const D = CAB_DEPTH;
  const A = CAB_HALF;
  if (q < 0.22) {
    // The body's outline: its two sides' profiles (deep at the foot, a slanted screen, the marquee
    // jutting over it) and the lines across between them.
    const side = r(1) < 0.5 ? -1 : 1;
    const e = r(2) * (PROFILE.length - 1);
    const i = Math.floor(e);
    const fr = e - i;
    const p0 = PROFILE[i] as [number, number];
    const p1 = PROFILE[i + 1] as [number, number];
    if (r(3) < 0.75)
      return at(p0[0] + (p1[0] - p0[0]) * fr, side * A, p0[1] + (p1[1] - p0[1]) * fr, h1, 0.4);
    return at(p0[0], (r(4) - 0.5) * 2 * A, p0[1], mix(h1, C.white, 0.3), 0.3);
  }
  if (q < 0.5) {
    // The marquee: SHARK SIMULATOR in light, glowing on a slow breath; in the tall face, its
    // strokes filled, on a topper as wide as the cabinet (2026-11-13: it was too small to read).
    const T = textPixels(MARQUEE, { face: 'tall', fill: true });
    const npx = T.px.length / 2;
    const i = Math.floor(r(5) * npx);
    const px = Math.min((2 * A * 0.96) / T.w, (MARQUEE_TOP - 2.15) / T.h);
    const cx = ((T.px[i * 2] as number) + 0.5 - T.w / 2) * px;
    const cy = ((T.px[i * 2 + 1] as number) + 0.5) * px;
    const glow = 0.85 + 0.15 * Math.sin(t * 0.6);
    // Read from the room, facing the cabinet: the words run along the view (the reader's right).
    return at(D + 0.12, cx, MARQUEE_TOP - 0.06 - cy, mix(h2, C.cyan, 0.5), 0.6 * glow);
  }
  if (q < 0.82) {
    // The screen, slanting back: deep blue water, a shark chasing a fish across and back.
    const e = (q - 0.5) / 0.32;
    const sy = (v: number) => 1.3 + v * 0.65;
    const sf = (v: number) => D - 0.03 - v * 0.15;
    const sw = A * 0.8;
    const sx = Math.sin(t * 0.45) * sw * 0.6;
    const dir = Math.cos(t * 0.45) >= 0 ? -1 : 1;
    if (e < 0.45) {
      // The water: faint blue, lighter toward the top, light rippling through it.
      const a = (r(6) - 0.5) * 2 * sw;
      const v = r(7);
      const ripple = 0.5 + 0.5 * Math.sin(a * 6 + v * 4 + t * 1.3);
      return at(sf(v), a, sy(v), mix(DEEP, C.cyan, 0.3 * v), 0.1 + 0.06 * ripple);
    }
    if (e < 0.85) {
      // The shark: a body tapering to its tail, a fin on top, its tail sweeping.
      const k = r(8);
      const along = (k - 0.5) * 0.6;
      const thick = Math.max(0, 0.07 * (1 - Math.abs(k - 0.35) * 1.6));
      const tail = k < 0.15 ? Math.sin(t * 4) * 0.05 : 0;
      const fin = r(9) < 0.15 ? Math.max(0, 0.08 * (1 - Math.abs(k - 0.5) * 4)) : 0;
      const v = 0.45 + 0.08 * Math.sin(t * 0.7) + (r(10) - 0.5) * 2 * thick + tail + fin;
      return at(sf(v) + 0.01, sx - dir * along, sy(v), SHARK, 0.45);
    }
    // The fish it chases, gold, just ahead of it.
    const v = 0.5 + 0.1 * Math.sin(t * 1.1);
    const a = Math.max(-sw, Math.min(sw, sx - dir * 0.45 + (r(11) - 0.5) * 0.06));
    return at(sf(v) + 0.01, a, sy(v) + (r(12) - 0.5) * 0.05, C.gold, 0.5);
  }
  if (q < 0.9) {
    // The control panel: a red stick and two buttons breathing on the beat.
    const b = beat(t, 1);
    const k = r(13);
    if (k < 0.45) return at(D + 0.15, -0.3, 1.12 + 0.2 * r(14), C.red, 0.45);
    const btn = k < 0.72 ? 0.15 : 0.4;
    const a = r(15) * TAU;
    return at(D + 0.15 + Math.cos(a) * 0.05, btn + Math.sin(a) * 0.05, 1.12, h2, 0.3 + 0.25 * b);
  }
  // A pool of its light on the floor in front.
  const a = r(16) * TAU;
  const rr = 1.2 * Math.sqrt(r(17));
  return at(D + 0.9 + Math.cos(a) * rr * 0.7, Math.sin(a) * rr, 0.02, h1, 0.12 * (1 - rr / 1.2));
}
const MARQUEE = 'SHARK\nSIMULATOR';
/** The top of the cabinet's marquee: a topper standing over the screen. */
const MARQUEE_TOP = CAB_H + 0.95;
const DEEP: RGB = [0.1, 0.35, 0.8];
const SHARK: RGB = [0.75, 0.83, 0.95];
/** The cabinet's side, out from the wall and up: its foot, the panel, the slanted screen, the marquee. */
const PROFILE: [number, number][] = [
  [-CAB_DEPTH, 0],
  [CAB_DEPTH, 0],
  [CAB_DEPTH, 1.0],
  [CAB_DEPTH + 0.3, 1.1],
  [CAB_DEPTH, 1.25],
  [CAB_DEPTH - 0.15, 2.0],
  [CAB_DEPTH + 0.1, 2.05],
  [CAB_DEPTH + 0.1, CAB_H + 0.95],
  [-CAB_DEPTH, CAB_H + 0.95],
  [-CAB_DEPTH, 0],
];

/** A point of the room's own, q (0..1) through it. */
function roomSite(P: Placed, q: number, L: number, t: number): Spot {
  const { w, d, h, hues, word } = P.dock;
  const [h1, h2] = hues;
  const at = (s: number, o: number, y: number, c: RGB, k: number): Spot => ({
    pos: roomPoint(P, s, o, y),
    rgb: scale(c, k),
  });
  const r = (salt: number) => hash(L, salt);
  const b = beat(t, 1 / 2);
  if (q < 0.14) {
    // The box's edges: floor and ceiling rims, the four corners.
    const e = q / 0.14;
    const k = Math.floor(e * 3);
    const f = frac(e * 3);
    if (k < 2) {
      const per = 2 * (2 * w + d);
      const m = f * per;
      const y = k === 0 ? 0.02 : h;
      let s: number;
      let o: number;
      if (m < 2 * w) [s, o] = [-w + m, -d / 2];
      else if (m < 2 * w + d) [s, o] = [w, -d / 2 + (m - 2 * w)];
      else if (m < 4 * w + d) [s, o] = [w - (m - 2 * w - d), d / 2];
      else [s, o] = [-w, d / 2 - (m - 4 * w - d)];
      return at(s, o, y, mix(h1, C.white, 0.2), 0.3);
    }
    const c = Math.floor(f * 4);
    return at(c & 1 ? w : -w, c & 2 ? d / 2 : -d / 2, frac(f * 4) * h, h1, 0.32);
  }
  if (q < 0.28) {
    // The floor: a grid of light every 1.2, glowing toward the window.
    const across = r(1) < 0.5;
    const n = across ? Math.floor((d / 1.2) * r(2)) : Math.floor(((2 * w) / 1.2) * r(2));
    const f = r(3);
    const s = across ? -w + f * 2 * w : -w + (n + 0.5) * 1.2;
    const o = across ? -d / 2 + (n + 0.5) * 1.2 : -d / 2 + f * d;
    if (Math.abs(s) > w || Math.abs(o) > d / 2) return at(0, 0, 0.01, h1, 0);
    return at(s, o, 0.01, h1, 0.07 + 0.06 * ((o + d / 2) / d));
  }
  if (q < 0.42) {
    // The room's word in neon on the back wall, breathing slowly.
    const T = textPixels(word);
    const npx = T.px.length / 2;
    const i = Math.floor(r(4) * npx);
    const px = Math.min(0.16, (2 * w * 0.7) / T.w);
    const s = -T.w * px * 0.5 + ((T.px[i * 2] as number) + 0.5) * px;
    const y = h * 0.62 + T.h * px * 0.5 - ((T.px[i * 2 + 1] as number) + 0.5) * px;
    return at(s, -d / 2 + 0.04, y, h2, 0.42 * (0.85 + 0.15 * Math.sin(t * 0.4)));
  }
  if (q < 0.54) {
    // Light strips up the side walls, three a side, breathing on the city's beat.
    const side = r(5) < 0.5 ? -1 : 1;
    const k = Math.floor(r(6) * 3);
    const o = -d / 2 + ((k + 0.5) / 3) * d * 0.8;
    return at(side * (w - 0.03), o, r(7) * h, mix(h2, h1, k / 2), 0.14 + 0.16 * b);
  }
  if (q < 0.66) {
    // The window wall: its frame and mullions every 1.8, a sill of light.
    const e = (q - 0.54) / 0.12;
    if (e < 0.5) {
      const n = Math.max(2, Math.round((2 * w) / 1.8));
      const k = Math.floor(r(8) * (n + 1));
      return at(-w + (k / n) * 2 * w, d / 2, r(9) * h, mix(C.white, h1, 0.3), 0.2);
    }
    const sill = r(10) < 0.5;
    return at(
      -w + r(11) * 2 * w,
      d / 2 - (sill ? 0.25 : 0),
      sill ? 0.55 : h - 0.05,
      C.white,
      sill ? 0.16 : 0.12,
    );
  }
  if (q < 0.78) {
    // The sofa facing the view: its back, seat and arms in outline, warm.
    const e = r(12);
    const so = seatOut(d);
    const bk = sofaBack(d);
    const s = (r(13) - 0.5) * 2 * SOFA_HALF;
    if (e < 0.35) return at(s, bk + 0.1, 0.5 + 0.9 * r(14), C.warm, 0.14);
    if (e < 0.55) return at(s, bk + 0.1, 1.45, C.warm, 0.3);
    if (e < 0.8) return at(s, so - 0.5 + r(15) * 1.1, 0.75, mix(C.warm, h1, 0.2), 0.2);
    const arm = r(16) < 0.5 ? -1 : 1;
    return at(arm * SOFA_HALF, bk + r(17) * (so + 0.6 - bk), 0.4 + 0.6 * r(18), C.warm, 0.22);
  }
  if (q < 0.86) {
    // Light strips along the ceiling.
    const k = r(19) < 0.5 ? -1 : 1;
    return at(k * w * 0.45, -d / 2 + r(20) * d, h - 0.04, C.warm, 0.18 * (0.9 + 0.1 * b));
  }
  if (q < 0.94) {
    // Plants in the corners by the window.
    const sx = r(21) < 0.5 ? -1 : 1;
    const a = r(22) * TAU;
    const rr = 0.7 * Math.sqrt(r(23));
    const y = 0.2 + 1.9 * r(24) * (1 - 0.5 * rr);
    return at(sx * (w - 0.9) + Math.cos(a) * rr, d / 2 - 0.9 + Math.sin(a) * rr, y, C.leaf, 0.22);
  }
  // A lamp by the sofa, glowing amber.
  const pt = roomPoint(P, SOFA_HALF + 0.7, seatOut(d) - 0.3, 1.2);
  const g = 0.35 * (0.85 + 0.15 * Math.sin(t * 0.5));
  const a = r(25) * TAU;
  const rr = 0.25 * Math.cbrt(r(26));
  return {
    pos: [pt[0] + Math.cos(a) * rr, pt[1] + (r(27) - 0.5) * 0.4, pt[2] + Math.sin(a) * rr],
    rgb: scale(C.amber, g),
  };
}

/** The words beside the bar in a room. */
export function roomBanner(t: number): string {
  const P = room.P;
  if (!P) return '';
  if (atCabinet(P, room.w.x, room.w.z, room.w.yaw)) return ARCADE_PROMPT;
  if (t - room.since < 6)
    return `${P.dock.name} · W S walk, A D turn, Shift run, Space jump · Enter: back to the ship`;
  if (room.w.sit > 0.5) return `${P.dock.name} · resting`;
  return '';
}
