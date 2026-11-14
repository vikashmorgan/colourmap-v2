/*
 * The sharks of Atlantis (docs/specs/art-city.md, "Atlantis rising and the speed tunnel"): a
 * school of seven, made of grains, that swims alongside your ship when you arrive, at your speed,
 * for about twenty seconds, then peels away; now and then (every one to two minutes while you are
 * in Atlantis) it comes back and follows again. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "a school of sharks swims alongside at the ship's speed, following it, for about 20
 * seconds, then peels away. Sometimes they come back to follow again."
 *
 * Our own design: a long spindle of a body, a swept dorsal fin, two pectoral fins, a crescent
 * tail, a faint lateral line of sea light and two small eyes; each body swishes, the swish growing
 * toward the tail. The school is a point that follows the ship (carried at its velocity and eased
 * toward a place beside it), each shark at its own slot round that point, wandering a little on
 * slow sines, so the school moves as one but never stiffly. Mellow: slate and pearl, the lateral
 * line a soft teal; fading in as they join, out as they go.
 *
 * The state is stepped once a frame (`sharkStep`); each grain only reads it (`sharkGrain`).
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';

export const SCHOOL = 7;
/** How long they follow, how long the peeling away takes, and when they may come back. */
export const FOLLOW_S = 20;
export const LEAVE_S = 6;
export const RETURN_MIN = 60;
export const RETURN_MAX = 120;
/** Where the school swims beside you: to one side, a little below, level with the ship. */
export const BESIDE = 14;

export type SchoolMode = 'away' | 'follow' | 'leave';

/** Each shark's slot round the school's point: right, up, forward (behind is negative). */
const SLOTS: Vec3[] = [
  [0, 0, 0],
  [4.5, 1.6, -5],
  [-4, -1.2, -5.5],
  [8.5, -0.6, -10],
  [-2, 2.6, -11],
  [5, -2.8, -15],
  [0.5, 1, -19],
];

export const school = {
  mode: 'away' as SchoolMode,
  since: 0,
  nextAt: Number.POSITIVE_INFINITY,
  visits: 0,
  /** The school's point and heading, and which side of you it swims. */
  c: [0, 0, 0] as Vec3,
  f: [0, 0, -1] as Vec3,
  side: 1,
  /** How much it shows, 0..1, eased. */
  vis: 0,
  /** Each shark this frame: its middle, heading, right and up, and how much it shows. */
  at: SLOTS.map(() => [0, 0, 0] as Vec3),
  fw: SLOTS.map(() => [0, 0, -1] as Vec3),
  rt: SLOTS.map(() => [1, 0, 0] as Vec3),
  show: SLOTS.map(() => 0),
};

/** Back to none (leaving Atlantis, a start afresh). */
export function resetSchool() {
  school.mode = 'away';
  school.nextAt = Number.POSITIVE_INFINITY;
  school.vis = 0;
  school.show.fill(0);
}

/** For the tests: as if the page were fresh. */
export function resetSharks() {
  resetSchool();
  school.visits = 0;
}

const right = (f: Vec3): [number, number] => {
  const l = Math.hypot(f[0], f[2]) || 1;
  return [-f[2] / l, f[0] / l];
};

/** The school joins you: from behind and to one side, catching up. */
export function schoolJoin(c: Vec3, f: Vec3, t: number) {
  school.mode = 'follow';
  school.since = t;
  school.side = school.visits % 2 ? -1 : 1;
  school.visits++;
  const [rx, rz] = right(f);
  school.c = [
    c[0] - f[0] * 45 + rx * school.side * 26,
    c[1] - 6,
    c[2] - f[2] * 45 + rz * school.side * 26,
  ];
  school.f = [f[0], 0, f[2]];
}

/** When the school may come back, after leaving at t (between one and two minutes). */
export const returnAt = (t: number, visits: number) =>
  t + RETURN_MIN + (RETURN_MAX - RETURN_MIN) * hash(visits, 907);

/**
 * Once a frame: the ship's place, heading and speed. Following, the school is carried at your
 * velocity and eased to its place beside you; after FOLLOW_S it peels away, slowing and turning
 * off to its side and down; gone, it waits for its time to come back. Outside Atlantis, none.
 */
export function sharkStep(c: Vec3, f: Vec3, speed: number, dt: number, t: number, here: boolean) {
  if (!here) {
    if (school.mode !== 'away' || school.vis > 0) resetSchool();
    return;
  }
  if (school.mode === 'away') {
    if (t >= school.nextAt) schoolJoin(c, f, t);
    else {
      school.vis = 0;
      school.show.fill(0);
      return;
    }
  }
  const [rx, rz] = right(f);
  const side = school.side;
  const age = t - school.since;
  if (school.mode === 'follow') {
    // Carried at the ship's velocity, eased to beside it.
    for (let a = 0; a < 3; a++)
      school.c[a] = (school.c[a] as number) + (f[a] as number) * speed * dt;
    const want: Vec3 = [c[0] + rx * side * BESIDE, c[1] - 3, c[2] + rz * side * BESIDE];
    const k = 1 - Math.exp(-1.4 * dt);
    for (let a = 0; a < 3; a++)
      school.c[a] = (school.c[a] as number) + ((want[a] as number) - (school.c[a] as number)) * k;
    const kf = 1 - Math.exp(-3 * dt);
    school.f = [
      school.f[0] + (f[0] - school.f[0]) * kf,
      0,
      school.f[2] + (f[2] - school.f[2]) * kf,
    ];
    school.vis += (1 - school.vis) * (1 - Math.exp(-1.2 * dt));
    if (age >= FOLLOW_S) {
      school.mode = 'leave';
      school.since = t;
    }
  } else {
    // Peeling away: slowing from your speed, turning off to its side and down.
    const u = Math.min(1, age / LEAVE_S);
    const pace = speed * (1 - 0.75 * smooth(u));
    const turn = 0.9 * dt * smooth(u * 2);
    const [frx, frz] = right(school.f);
    school.f = [school.f[0] + frx * side * turn, 0, school.f[2] + frz * side * turn];
    const l = Math.hypot(school.f[0], school.f[2]) || 1;
    school.f = [school.f[0] / l, 0, school.f[2] / l];
    school.c[0] += (school.f[0] * pace + rx * side * 10 * u) * dt;
    school.c[1] -= 2.5 * u * dt;
    school.c[2] += (school.f[2] * pace + rz * side * 10 * u) * dt;
    school.vis = leaveShow(age, SCHOOL - 1);
    if (age >= LEAVE_S) {
      school.mode = 'away';
      school.nextAt = returnAt(t, school.visits);
      school.vis = 0;
    }
  }
  // Each shark at its slot round the point, wandering a little; in the peel each goes in turn.
  const fl = Math.hypot(school.f[0], school.f[2]) || 1;
  const fx = school.f[0] / fl;
  const fz = school.f[2] / fl;
  const sx = -fz;
  const sz = fx;
  for (let i = 0; i < SCHOOL; i++) {
    const s = SLOTS[i] as Vec3;
    const lat = s[0] * side + 1.6 * Math.sin(t * 0.5 + i * 1.7);
    const up = s[1] + Math.sin(t * 0.37 + i * 2.3);
    const along = s[2] + 1.2 * Math.sin(t * 0.29 + i);
    const P = school.at[i] as Vec3;
    P[0] = school.c[0] + sx * lat + fx * along;
    P[1] = school.c[1] + up;
    P[2] = school.c[2] + sz * lat + fz * along;
    // Its heading leans with its wander (the sine's slope), so each swims its own small curve.
    const yaw = 0.12 * Math.cos(t * 0.5 + i * 1.7);
    const F = school.fw[i] as Vec3;
    F[0] = fx + sx * yaw;
    F[1] = 0.04 * Math.cos(t * 0.37 + i * 2.3);
    F[2] = fz + sz * yaw;
    const L = Math.hypot(F[0], F[1], F[2]) || 1;
    F[0] /= L;
    F[1] /= L;
    F[2] /= L;
    const R = school.rt[i] as Vec3;
    const rl = Math.hypot(F[0], F[2]) || 1;
    R[0] = -F[2] / rl;
    R[1] = 0;
    R[2] = F[0] / rl;
    school.show[i] =
      school.mode === 'leave' ? leaveShow(age, i) : school.mode === 'follow' ? school.vis : 0;
  }
}

/** In the peel, how much shark i still shows `age` seconds in: each fades in turn, all gone by LEAVE_S. */
export const leaveShow = (age: number, i: number) => 1 - smooth((age - 2 - 0.35 * i) / 1.6);

/** Whether the school is with you now (following, or still peeling away and showing). */
export const sharksShowing = () => school.mode !== 'away' && school.vis > 0.02;

const SLATE: RGB = [0.34, 0.45, 0.6];
const BELLY: RGB = [0.62, 0.7, 0.78];
const FIN: RGB = [0.3, 0.4, 0.55];
const LINE: RGB = [0.3, 0.95, 0.85];
const EYE: RGB = [0.7, 1, 0.92];

/**
 * Grain L of n of the school at time t: which shark (its share), which part (body, dorsal fin,
 * pectoral fins, tail, lateral line and eyes), its place on the swishing body; and how lit.
 */
export function sharkGrain(L: number, n: number, t: number): { pos: Vec3; rgb: RGB } {
  const each = Math.max(1, Math.floor(n / SCHOOL));
  const i = Math.min(SCHOOL - 1, Math.floor(L / each));
  const P = school.at[i] as Vec3;
  const F = school.fw[i] as Vec3;
  const R = school.rt[i] as Vec3;
  const k = school.show[i] as number;
  const Ls = 7 + 1.6 * hash(i, 911);
  const r = hash(L, 501);
  const a = hash(L, 502);
  const b = hash(L, 503);
  let u: number;
  let side: number;
  let up: number;
  let rgb: RGB;
  let lit: number;
  const radAt = (v: number) =>
    Ls * 0.1 * (v < 0.22 ? Math.sqrt(v / 0.22) : 1 - 0.85 * ((v - 0.22) / 0.78) ** 1.1);
  if (r < 0.58) {
    // The body: an elliptic spindle, paler underneath.
    u = a;
    const th = b * Math.PI * 2;
    const rad = radAt(u);
    side = Math.cos(th) * rad;
    up = Math.sin(th) * rad * 1.15;
    const belly = up < -rad * 0.3;
    rgb = belly ? BELLY : SLATE;
    lit = belly ? 0.2 : 0.26;
  } else if (r < 0.68) {
    // The dorsal fin: a triangle swept back over the body's top.
    const base = 0.3 + 0.2 * a;
    const v = b * (1 - a) ** 0.7;
    u = base + 0.16 * v;
    side = 0;
    up = radAt(base) * 1.1 + Ls * 0.17 * v;
    rgb = FIN;
    lit = 0.24 + 0.08 * v;
  } else if (r < 0.8) {
    // The pectoral fins, out to the sides, swept back and a little down.
    const s = b < 0.5 ? -1 : 1;
    const v = a;
    u = 0.27 + 0.15 * v + 0.05 * hash(L, 504);
    side = s * (radAt(0.27) + Ls * 0.22 * v);
    up = -Ls * 0.06 * v - radAt(0.27) * 0.4;
    rgb = FIN;
    lit = 0.2;
  } else if (r < 0.94) {
    // The tail: a crescent, its upper lobe longer.
    const upper = b < 0.62;
    const v = a;
    u = 1 + 0.12 * v * v;
    side = 0;
    up = (upper ? 1 : -0.6) * Ls * 0.2 * v + Ls * 0.02;
    rgb = FIN;
    lit = 0.24;
  } else if (r < 0.985) {
    // The lateral line: a soft teal light along each flank.
    u = 0.12 + 0.75 * a;
    side = (b < 0.5 ? -1 : 1) * radAt(u) * 1.02;
    up = radAt(u) * 0.2;
    rgb = LINE;
    lit = 0.34;
  } else {
    u = 0.07;
    side = (b < 0.5 ? -1 : 1) * radAt(0.07) * 0.95;
    up = radAt(0.07) * 0.3;
    rgb = EYE;
    lit = 0.5;
  }
  // The swish, growing toward the tail.
  side += Math.sin(t * 3.2 + i * 1.3 - u * 4.2) * 0.12 * Ls * u * u;
  const along = Ls * (0.4 - u);
  const pos: Vec3 = [
    P[0] + F[0] * along + R[0] * side,
    P[1] + F[1] * along + up,
    P[2] + F[2] * along + R[2] * side,
  ];
  const kk = k * lit;
  return { pos, rgb: [rgb[0] * kk, rgb[1] * kk, rgb[2] * kk] };
}

/** Grain L of the sea's motes round the eye (when the school is away): faint, still in the water. */
export function moteGrain(L: number, eye: Vec3): { pos: Vec3; rgb: RGB } {
  const box = 70;
  const w = (v: number, e: number) => {
    const q = (v - e) / box;
    return e + (q - Math.floor(q) - 0.5) * box;
  };
  const pos: Vec3 = [
    w(hash(L, 521) * 7000, eye[0]),
    w(hash(L, 522) * 7000, eye[1]),
    w(hash(L, 523) * 7000, eye[2]),
  ];
  const d = Math.hypot(pos[0] - eye[0], pos[1] - eye[1], pos[2] - eye[2]);
  const k = 0.07 * smooth((box / 2 - d) / 12) * (0.5 + 0.5 * hash(L, 524));
  return { pos, rgb: [0.4 * k, 0.9 * k, 0.85 * k] };
}
