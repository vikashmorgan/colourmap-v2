/*
 * FLOCKS — a murmuration of small birds and a school of fish, in 3D dots,
 * asked for 2026-10-13: "flocks of sparrows made of dots, in 3D, flying and
 * making the patterns thousands of small birds make: opening, breaking,
 * uniting. And another the same, as a school of fish in perpetual movement."
 *
 * Real flocking (every bird watching its seven neighbours) is too slow for
 * thousands of dots in a browser, so each bird follows a TARGET in a shape
 * that moves and changes, and a shared CURRENT stirs them all; steering with a
 * limited turn and speed turns that into the sheets, folds and waves of a
 * murmuration.
 *
 *   birds  the flock is a sheet that turns and folds through the air; it
 *          breathes open and closed, and now and then breaks into three that
 *          wheel apart and unite again
 *   fish   a school in perpetual motion: it MILLS (a turning torus), STREAMS
 *          (a long ribbon snaking after its leader), and gathers into a BALL;
 *          a predator darts through now and then and the fish flash away from
 *          it, opening a hole that closes behind it
 *
 * Units: the space is about −1 … 1 each way. Pure: no canvas.
 */

export type V3 = [number, number, number];
const TAU = Math.PI * 2;

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** The shared current: sines crossing in space and time, stirring the whole flock. */
export function current(x: number, y: number, z: number, t: number): V3 {
  return [
    0.25 * (Math.sin(2.1 * y + 0.7 * t) + Math.sin(1.7 * z - 0.5 * t)),
    0.18 * (Math.sin(1.9 * z + 0.6 * t) + Math.sin(2.3 * x - 0.3 * t)),
    0.25 * (Math.sin(2.2 * x - 0.4 * t) + Math.sin(1.6 * y + 0.8 * t)),
  ];
}

/* ── the murmuration ──────────────────────────────────────── */

/** How far the flock has broken apart: 0 one flock … 1 three flocks wheeling apart. */
export const split = (t: number) => smooth((Math.sin(t * 0.11) - 0.25) / 0.6);

/** The centre of sub-flock k (0, 1, 2). */
export function birdCentre(k: number, t: number): V3 {
  const c: V3 = [
    0.32 * Math.sin(t * 0.13),
    0.14 * Math.sin(t * 0.21 + 1),
    0.3 * Math.sin(t * 0.17 + 2),
  ];
  const s = split(t);
  const a = t * 0.35 + (k * TAU) / 3;
  return [
    c[0] + s * 0.46 * Math.cos(a),
    c[1] + s * 0.2 * Math.sin(a * 1.3),
    c[2] + s * 0.46 * Math.sin(a),
  ];
}

/** Where a bird with offset o (in a unit ball) and sub-flock k wants to be. */
export function birdTarget(o: V3, k: number, t: number): V3 {
  // The sheet: flattened, breathing open and closed, turning and folding.
  const spread = (0.36 + 0.12 * Math.sin(t * 0.37)) * (1 - 0.35 * split(t));
  let x = o[0] * spread;
  let y = o[1] * spread * 0.32 + 0.12 * spread * Math.sin(o[0] * 4 + t * 0.9);
  let z = o[2] * spread * 0.8;
  const a1 = t * 0.23;
  const a2 = 0.5 * Math.sin(t * 0.19);
  [x, z] = [x * Math.cos(a1) - z * Math.sin(a1), x * Math.sin(a1) + z * Math.cos(a1)];
  [y, z] = [y * Math.cos(a2) - z * Math.sin(a2), y * Math.sin(a2) + z * Math.cos(a2)];
  const c = birdCentre(k, t);
  return [c[0] + x, c[1] + y, c[2] + z];
}

/* ── the school of fish ───────────────────────────────────── */

export type FishPhase = 'mill' | 'stream' | 'ball';
const PHASES: FishPhase[] = ['mill', 'stream', 'ball', 'stream'];
const PHASE_SECONDS = 14;

/** How much of each way of moving the school is in at time t (they blend into each other). */
export function fishWeights(t: number): Record<FishPhase, number> {
  const u = t / PHASE_SECONDS;
  const i = Math.floor(u);
  const f = smooth((u - i - 0.7) / 0.3);
  const a = PHASES[((i % 4) + 4) % 4] as FishPhase;
  const b = PHASES[(((i + 1) % 4) + 4) % 4] as FishPhase;
  const w: Record<FishPhase, number> = { mill: 0, stream: 0, ball: 0 };
  w[a] += 1 - f;
  w[b] += f;
  return w;
}

/** The leader of the stream: a path that snakes through the water. */
export function streamPath(t: number): V3 {
  return [0.62 * Math.sin(t * 0.31), 0.2 * Math.sin(t * 0.47 + 1), 0.55 * Math.sin(t * 0.23 + 2)];
}

/** Where a fish with a fixed random (r1, r2, r3) wants to be. */
export function fishTarget(r1: number, r2: number, r3: number, t: number): V3 {
  const w = fishWeights(t);
  // Milling: round a torus, turning.
  const th = r1 * TAU + t * 0.9;
  const rad = 0.42 + 0.12 * (r2 - 0.5);
  const mill: V3 = [Math.cos(th) * rad, (r3 - 0.5) * 0.28, Math.sin(th) * rad];
  // Streaming: a ribbon after the leader, each fish a little later on the path.
  const p = streamPath(t - r1 * 2.6);
  const stream: V3 = [p[0] + (r2 - 0.5) * 0.09, p[1] + (r3 - 0.5) * 0.09, p[2] + (r2 - r3) * 0.06];
  // The ball: tight round the centre.
  const phi = Math.acos(2 * r2 - 1);
  const br = 0.26 * Math.cbrt(r3);
  const ball: V3 = [
    Math.sin(phi) * Math.cos(r1 * TAU) * br,
    Math.cos(phi) * br,
    Math.sin(phi) * Math.sin(r1 * TAU) * br,
  ];
  return [
    mill[0] * w.mill + stream[0] * w.stream + ball[0] * w.ball,
    mill[1] * w.mill + stream[1] * w.stream + ball[1] * w.ball,
    mill[2] * w.mill + stream[2] * w.stream + ball[2] * w.ball,
  ];
}

/** The predator: crossing the school now and then, otherwise far away. */
export function predator(t: number): V3 | null {
  const cycle = 9;
  const u = (t % cycle) / cycle;
  if (u > 0.35) return null;
  const k = u / 0.35;
  const a = Math.floor(t / cycle) * 2.1;
  return [Math.cos(a) * (1.4 - 2.8 * k), 0.1 * Math.sin(a * 3), Math.sin(a) * (1.4 - 2.8 * k)];
}

/* ── steering ─────────────────────────────────────────────── */

/**
 * One step for every member: toward its target, stirred by the current, away
 * from a predator, with limited speed and turn. pos and vel are flat xyz arrays.
 */
export function steer(
  pos: Float32Array,
  vel: Float32Array,
  target: (i: number) => V3,
  t: number,
  dt: number,
  opts: {
    pull: number;
    flow: number;
    turn: number;
    vmin: number;
    vmax: number;
    threat?: V3 | null;
  },
): void {
  const n = pos.length / 3;
  const k = Math.min(1, dt * opts.turn);
  for (let i = 0; i < n; i++) {
    const j = i * 3;
    const x = pos[j] as number;
    const y = pos[j + 1] as number;
    const z = pos[j + 2] as number;
    const g = target(i);
    const f = current(x, y, z, t);
    let dx = (g[0] - x) * opts.pull + f[0] * opts.flow;
    let dy = (g[1] - y) * opts.pull + f[1] * opts.flow;
    let dz = (g[2] - z) * opts.pull + f[2] * opts.flow;
    if (opts.threat) {
      const ex = x - opts.threat[0];
      const ey = y - opts.threat[1];
      const ez = z - opts.threat[2];
      const d = Math.hypot(ex, ey, ez) || 1e-6;
      const flee = 3.2 * Math.exp(-((d / 0.22) ** 2));
      dx += (ex / d) * flee;
      dy += (ey / d) * flee;
      dz += (ez / d) * flee;
    }
    let vx = (vel[j] as number) + (dx - (vel[j] as number)) * k;
    let vy = (vel[j + 1] as number) + (dy - (vel[j + 1] as number)) * k;
    let vz = (vel[j + 2] as number) + (dz - (vel[j + 2] as number)) * k;
    const sp = Math.hypot(vx, vy, vz) || 1e-6;
    const lim = Math.min(opts.vmax, Math.max(opts.vmin, sp)) / sp;
    vx *= lim;
    vy *= lim;
    vz *= lim;
    vel[j] = vx;
    vel[j + 1] = vy;
    vel[j + 2] = vz;
    pos[j] = x + vx * dt;
    pos[j + 1] = y + vy * dt;
    pos[j + 2] = z + vz * dt;
  }
}

/** A point turned about the vertical (yaw) and tipped (pitch), with a soft perspective. */
export function view(p: V3, yaw: number, pitch: number): [number, number, number] {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = p[0] * cy + p[2] * sy;
  const z1 = -p[0] * sy + p[2] * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = p[1] * cp - z1 * sp;
  const z2 = p[1] * sp + z1 * cp;
  const f = 2.6 / (2.6 - z2);
  return [x1 * f, y2 * f, z2];
}
