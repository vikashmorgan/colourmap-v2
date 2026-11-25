/**
 * Drive, Mars: the enemies (docs/specs/mars-world.md, "Enemies"). Pure: where each kind lives, how
 * it moves, what beats it, and what it does to you. No three.js, no DOM.
 *
 * 2026-11-24: "a bunch of ghosts. and enemies in the mars world and robots that u have to shoot and
 * explode and charge into with the turbo. giant spider robots. dusty manta rays. space squids in
 * the sky. flying ufos in the sky."
 *
 * - Robots patrol round the factories, the works and the wrecks; they roll at you when you come
 *   near. Shot, laser or a Dust Shark wrecks one; so does ramming it while boosting (turbo or
 *   superboost). Ram one without the boost and you bounce off it, losing speed.
 * - Giant spider robots stalk the canyons' floors and the open plain on eight legs; they take
 *   several hits (a boosted ram is the biggest) and go up in a big explosion.
 * - Ghosts drift round the wrecks and the alien ruins, fading in and out. Driving through one is
 *   a cold flash that slows you a little; only the laser dispels one.
 * - Dusty manta rays glide in flocks low over the dunes, trailing dust. Harmless; anything hits
 *   one (even a gentle bump) for a little score.
 * - Space squids drift high in the sky, glowing; out of reach. UFOs fly their patterns and now
 *   and then swoop low: while low anything can hit one, and one passing over you lifts you a bit.
 *
 * Fun, never punishing: nothing here ends a run or stops you dead. The world: x east, y north,
 * metres; a foe's z is its height above the ground under it.
 */

export type FoeKind = 'robot' | 'spider' | 'ghost' | 'manta' | 'ufo' | 'squid';
export type HitBy = 'shark' | 'shot' | 'laser' | 'ram' | 'bump';

export interface FoeSpec {
  hp: number;
  /** How far it reaches round its middle (m), and how high it stands (m). */
  r: number;
  tall: number;
  score: number;
  /** Seconds before a wrecked one comes back home. */
  respawn: number;
}

export const FOE: Record<FoeKind, FoeSpec> = {
  robot: { hp: 2, r: 2.4, tall: 4, score: 100, respawn: 45 },
  spider: { hp: 12, r: 6, tall: 14, score: 600, respawn: 90 },
  ghost: { hp: 1, r: 3.2, tall: 9, score: 150, respawn: 40 },
  manta: { hp: 1, r: 4.2, tall: 2, score: 25, respawn: 25 },
  ufo: { hp: 3, r: 7, tall: 4, score: 300, respawn: 60 },
  squid: { hp: 0, r: 12, tall: 30, score: 0, respawn: 0 },
};

/** What each attack takes off (a boosted ram is the hardest hit). */
export const DAMAGE: Record<HitBy, number> = { shark: 2, shot: 2, laser: 4, ram: 4, bump: 1 };

/** How a robot moves: patrolling (m/s), rolling at you, how near it sees you, how far it strays. */
export const ROBOT = { patrol: 5, chase: 15, sight: 75, leash: 170 };
/** How a spider walks (m/s), and how high its body rides (m). */
export const SPIDER = { speed: 8, body: 9 };
/** A ghost's cold flash: how much speed it keeps, and how long before the same ghost chills again. */
export const COLD = { keep: 0.82, again: 2.5 };
/** A bounce off a foe without the boost: the speed you keep. */
export const BOUNCE = { keep: 0.55 };
/** A UFO's swoop: how often (s), how long it stays low (s), how low (m), and the lift it gives. */
export const SWOOP = { every: 24, low: 7, alt: 5, lift: 7 };

export interface Path {
  x: number[];
  y: number[];
  /** A loop goes round; otherwise it walks to the end and back. */
  loop: boolean;
  /** Its length (m). */
  len: number;
}

export interface Foe {
  id: number;
  kind: FoeKind;
  /** Where it lives (patrols round, drifts round, returns to). */
  hx: number;
  hy: number;
  /** How far round home it patrols or drifts (m). */
  range: number;
  x: number;
  y: number;
  /** Its height above the ground under it (m), and its heading (rad). */
  z: number;
  h: number;
  hp: number;
  /** When it was wrecked (null: whole). */
  dead: number | null;
  /** When it was last hit (the flash), when it last chilled you (ghosts). */
  hitAt: number;
  coldAt: number;
  seed: number;
  /** A walker's path (spiders) and how far along it is (m). */
  path?: Path;
  s: number;
  /** A robot rolling at you. */
  chasing: boolean;
}

function hash(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A path through points, measured. */
export function makePath(x: number[], y: number[], loop: boolean): Path {
  let len = 0;
  const n = x.length;
  for (let i = 1; i < n; i++) len += Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]);
  if (loop) len += Math.hypot(x[0] - x[n - 1], y[0] - y[n - 1]);
  return { x, y, loop, len };
}

/** Where a walker is `s` m along a path (wrapping round a loop, back and forth along a line), and
 * its heading there. */
export function pathAt(p: Path, s: number): { x: number; y: number; h: number } {
  let d: number;
  let back = false;
  if (p.loop) d = ((s % p.len) + p.len) % p.len;
  else {
    const k = ((s % (2 * p.len)) + 2 * p.len) % (2 * p.len);
    back = k > p.len;
    d = back ? 2 * p.len - k : k;
  }
  const n = p.x.length;
  const segs = p.loop ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const l = Math.hypot(p.x[j] - p.x[i], p.y[j] - p.y[i]);
    if (d <= l || i === segs - 1) {
      const f = l > 0 ? Math.min(1, d / l) : 0;
      const h = Math.atan2(p.y[j] - p.y[i], p.x[j] - p.x[i]);
      return {
        x: p.x[i] + (p.x[j] - p.x[i]) * f,
        y: p.y[i] + (p.y[j] - p.y[i]) * f,
        h: back ? h + Math.PI : h,
      };
    }
    d -= l;
  }
  return { x: p.x[0], y: p.y[0], h: 0 };
}

/* ── Where they live ──────────────────────────────────────── */

export interface Lair {
  x: number;
  y: number;
  /** How far round it they keep (m). */
  r: number;
}

/** What the world offers them: the works robots guard, the haunted places, the walkers' paths,
 * the flocks' and fliers' rounds, and a test that a point is clear to stand on. */
export interface Habitat {
  works: Lair[];
  haunts: Lair[];
  walks: Path[];
  flocks: Lair[];
  /** The UFOs' rounds (low sky) and the squids' (high sky). */
  skies: Lair[];
  heights: Lair[];
  clear: (x: number, y: number, r: number) => boolean;
}

/** Caps, so the world never fills past what draws cheaply. */
export const CAP = { robot: 30, spider: 4, ghost: 24, manta: 18, ufo: 5, squid: 8 };

/** Places every foe at home (deterministic: the same world every time). */
export function placeFoes(w: Habitat): Foe[] {
  const out: Foe[] = [];
  let id = 1;
  const add = (kind: FoeKind, hx: number, hy: number, range: number, seed: number, z = 0) => {
    out.push({
      id: id++,
      kind,
      hx,
      hy,
      range,
      x: hx,
      y: hy,
      z,
      h: seed * Math.PI * 2,
      hp: FOE[kind].hp,
      dead: null,
      hitAt: -99,
      coldAt: -99,
      seed,
      s: 0,
      chasing: false,
    });
    return out[out.length - 1];
  };
  // Robots: two round each works and wreck, on a ring clear of it.
  let n = 0;
  w.works.forEach((l, i) => {
    for (let k = 0; k < 2 && n < CAP.robot; k++) {
      const range = l.r + 24 + 10 * k;
      const a = hash(i, k, 1) * Math.PI * 2;
      if (!w.clear(l.x + Math.cos(a) * range, l.y + Math.sin(a) * range, FOE.robot.r)) continue;
      const f = add('robot', l.x, l.y, range, hash(i, k, 2));
      f.s = a;
      f.x = l.x + Math.cos(a) * range;
      f.y = l.y + Math.sin(a) * range;
      n++;
    }
  });
  // Spiders: one on each walk.
  w.walks.slice(0, CAP.spider).forEach((p, i) => {
    const f = add('spider', p.x[0], p.y[0], 0, hash(i, 3, 3));
    f.path = p;
    f.s = hash(i, 3, 4) * p.len;
    const at = pathAt(p, f.s);
    f.x = at.x;
    f.y = at.y;
    f.h = at.h;
    f.z = SPIDER.body;
  });
  // Ghosts: a few round each haunt.
  n = 0;
  w.haunts.forEach((l, i) => {
    for (let k = 0; k < 3 && n < CAP.ghost; k++, n++)
      add('ghost', l.x, l.y, l.r * (0.5 + 0.4 * hash(i, k, 5)), hash(i, k, 6), 3);
  });
  // Manta flocks: six to a flock.
  n = 0;
  w.flocks.forEach((l, i) => {
    for (let k = 0; k < 6 && n < CAP.manta; k++, n++)
      add('manta', l.x, l.y, l.r, (i * 6 + k) / 37, 5);
  });
  // UFOs and squids: one to each round.
  w.skies.forEach((l, i) => {
    if (i < CAP.ufo) add('ufo', l.x, l.y, l.r, hash(i, 9, 1), 90);
  });
  w.heights.forEach((l, i) => {
    if (i < CAP.squid) add('squid', l.x, l.y, l.r, hash(i, 9, 2), 200);
  });
  return out;
}

/* ── How they move ────────────────────────────────────────── */

/** A ghost's phasing now (0 faded out, 1 fully there): a slow breath, each on its own beat. */
export function ghostShown(f: Foe, t: number): number {
  const k = 0.5 + 0.5 * Math.sin(t * (0.45 + f.seed * 0.3) + f.seed * 20);
  return 0.15 + 0.85 * k * k;
}

/** How far into its swoop a UFO is now (0 high on its round, 1 at the bottom). */
export function swoopOf(f: Foe, t: number): number {
  const k = (t + f.seed * SWOOP.every) % SWOOP.every;
  if (k > SWOOP.low) return 0;
  return Math.sin((k / SWOOP.low) * Math.PI) ** 2;
}

/** Where a flier is now (ghosts, mantas, UFOs, squids follow set rounds; robots and spiders step). */
export function fly(f: Foe, t: number): { x: number; y: number; z: number; h: number } {
  const s = f.seed;
  if (f.kind === 'ghost') {
    // A slow figure eight round its haunt, bobbing.
    const a = t * (0.05 + s * 0.04) + s * 30;
    const x = f.hx + Math.sin(a) * f.range;
    const y = f.hy + Math.sin(a * 2) * f.range * 0.5;
    const h = Math.atan2(Math.cos(a * 2) * f.range, Math.cos(a) * f.range);
    return { x, y, z: 2.5 + 1.5 * Math.sin(t * 0.8 + s * 9), h };
  }
  if (f.kind === 'manta') {
    // The flock rounds a wide ellipse; each ray holds its place in the V and weaves.
    const a = t * 0.028 + Math.floor((s * 37) / 6) * 2;
    const k = Math.round(s * 37) % 6;
    const cx = f.hx + Math.cos(a) * f.range;
    const cy = f.hy + Math.sin(a) * f.range * 0.6;
    const h = Math.atan2(Math.cos(a) * f.range * 0.6, -Math.sin(a) * f.range);
    const back = 9 * Math.ceil(k / 2);
    const side = (k % 2 ? 1 : -1) * 8 * Math.ceil(k / 2);
    const weave = Math.sin(t * 0.7 + k) * 2.5;
    return {
      x: cx - Math.cos(h) * back - Math.sin(h) * (side + weave),
      y: cy - Math.sin(h) * back + Math.cos(h) * (side + weave),
      z: 4.5 + 1.8 * Math.sin(t * 0.9 + k * 1.3),
      h,
    };
  }
  if (f.kind === 'ufo') {
    // A figure of loops round its sky; down to a few metres off the ground in a swoop.
    const a = t * 0.07 + s * 40;
    const x = f.hx + Math.sin(a) * f.range;
    const y = f.hy + Math.sin(a * 1.5 + s) * f.range * 0.7;
    const dx = Math.cos(a) * f.range;
    const dy = Math.cos(a * 1.5 + s) * f.range * 1.05;
    const low = swoopOf(f, t);
    const top = 90 + 20 * s;
    return { x, y, z: top - (top - SWOOP.alt) * low, h: Math.atan2(dy, dx) };
  }
  // A squid drifts slowly round a wide circle, high, rising and sinking.
  const a = t * 0.004 + s * 50;
  return {
    x: f.hx + Math.cos(a) * f.range,
    y: f.hy + Math.sin(a) * f.range,
    z: 190 + 50 * s + 12 * Math.sin(t * 0.15 + s * 7),
    h: a + Math.PI / 2,
  };
}

export interface You {
  x: number;
  y: number;
  /** Your height above the ground (m). */
  up: number;
}

function turnToward(h: number, target: number, max: number): number {
  let d = target - h;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return h + Math.max(-max, Math.min(max, d));
}

/**
 * Moves a foe on a moment (in place): robots patrol their ring and roll at you when they see you
 * (never further than their leash from home); spiders walk their paths; the rest fly their rounds.
 * A wrecked foe comes back home once its time is up and you are away from there.
 */
export function stepFoe(f: Foe, dt: number, t: number, you: You): void {
  const spec = FOE[f.kind];
  if (f.dead !== null) {
    if (
      spec.respawn > 0 &&
      t - f.dead > spec.respawn &&
      Math.hypot(you.x - f.hx, you.y - f.hy) > 300
    ) {
      f.dead = null;
      f.hp = spec.hp;
      f.chasing = false;
      if (f.kind === 'robot') {
        f.x = f.hx + Math.cos(f.s) * f.range;
        f.y = f.hy + Math.sin(f.s) * f.range;
      }
    }
    return;
  }
  if (f.kind === 'robot') {
    const toYou = Math.hypot(you.x - f.x, you.y - f.y);
    const fromHome = Math.hypot(f.x - f.hx, f.y - f.hy);
    f.chasing = toYou < ROBOT.sight && fromHome < ROBOT.leash && you.up < 6;
    if (f.chasing) {
      f.h = turnToward(f.h, Math.atan2(you.y - f.y, you.x - f.x), 2.5 * dt);
      f.x += Math.cos(f.h) * ROBOT.chase * dt;
      f.y += Math.sin(f.h) * ROBOT.chase * dt;
    } else {
      // Back to its ring, then round it.
      const want = { x: f.hx + Math.cos(f.s) * f.range, y: f.hy + Math.sin(f.s) * f.range };
      const d = Math.hypot(want.x - f.x, want.y - f.y);
      if (d > 3) {
        f.h = turnToward(f.h, Math.atan2(want.y - f.y, want.x - f.x), 2 * dt);
        const step = Math.min(d, ROBOT.chase * 0.6 * dt);
        f.x += Math.cos(f.h) * step;
        f.y += Math.sin(f.h) * step;
      } else {
        f.s += (ROBOT.patrol / f.range) * dt;
        f.x = want.x;
        f.y = want.y;
        f.h = turnToward(f.h, f.s + Math.PI / 2, 3 * dt);
      }
    }
    return;
  }
  if (f.kind === 'spider' && f.path) {
    f.s += SPIDER.speed * dt;
    const p = pathAt(f.path, f.s);
    f.x = p.x;
    f.y = p.y;
    f.h = turnToward(f.h, p.h, 1.2 * dt);
    return;
  }
  const p = fly(f, t);
  f.x = p.x;
  f.y = p.y;
  f.z = p.z;
  f.h = p.h;
}

/* ── What beats them ──────────────────────────────────────── */

/** Whether a foe can be hit now at all: not wrecked, not a squid, a UFO only while low. */
export function hittable(f: Foe): boolean {
  if (f.dead !== null || f.kind === 'squid') return false;
  if (f.kind === 'ufo') return f.z < 16;
  return true;
}

/** What an attack does to a foe of this kind: only the laser dispels a ghost. */
export function damageOf(kind: FoeKind, by: HitBy): number {
  if (kind === 'squid') return 0;
  if (kind === 'ghost') return by === 'laser' ? DAMAGE.laser : 0;
  if (kind === 'manta') return 1;
  return DAMAGE[by];
}

/** A hit (in place): takes its damage off, flashes it, and wrecks it at no health left. Returns
 * whether this hit wrecked it. */
export function hitFoe(f: Foe, by: HitBy, t: number): boolean {
  if (!hittable(f)) return false;
  const d = damageOf(f.kind, by);
  if (d <= 0) return false;
  f.hp -= d;
  f.hitAt = t;
  if (f.hp <= 0) {
    f.dead = t;
    return true;
  }
  return false;
}

/** The foes a point reaches (a shark's bite, a shot's burst): those within `reach` of their edge,
 * low enough to touch (its height above the ground under 12 m). */
export function foesNear(foes: readonly Foe[], x: number, y: number, reach: number): Foe[] {
  return foes.filter(
    (f) =>
      hittable(f) &&
      f.z < 12 + FOE[f.kind].tall &&
      Math.hypot(f.x - x, f.y - y) < reach + FOE[f.kind].r,
  );
}

/** The foes along a beam from a to b: within 2 m of the line past their edge. */
export function foesOnBeam(
  foes: readonly Foe[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Foe[] {
  const ex = bx - ax;
  const ey = by - ay;
  const L2 = ex * ex + ey * ey || 1;
  return foes.filter((f) => {
    if (!hittable(f) || f.z > 16 + FOE[f.kind].tall) return false;
    const k = Math.max(0, Math.min(1, ((f.x - ax) * ex + (f.y - ay) * ey) / L2));
    return Math.hypot(f.x - ax - ex * k, f.y - ay - ey * k) < FOE[f.kind].r + 2;
  });
}

/** The nearest foe a Dust Shark could go for from where it is: on the ground (robots, spiders,
 * mantas), ahead of it within 240 m, and nearer than him. */
export function sharkPrey(
  foes: readonly Foe[],
  p: { x: number; y: number; h: number },
  himDist: number,
): Foe | null {
  let best: Foe | null = null;
  let bestD = Math.min(240, himDist);
  for (const f of foes) {
    if (!hittable(f) || (f.kind !== 'robot' && f.kind !== 'spider' && f.kind !== 'manta')) continue;
    const dx = f.x - p.x;
    const dy = f.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d >= bestD) continue;
    if (dx * Math.cos(p.h) + dy * Math.sin(p.h) < 0) continue;
    best = f;
    bestD = d;
  }
  return best;
}

/** What touching a foe does to you. */
export type Touch =
  | { kind: 'ram'; f: Foe }
  | { kind: 'bounce'; f: Foe; nx: number; ny: number }
  | { kind: 'bump'; f: Foe }
  | { kind: 'cold'; f: Foe }
  | { kind: 'lift'; f: Foe };

/**
 * What you touch now, foe by foe: a robot or a spider you ram while boosting takes the hit (and
 * you plough on); without the boost you bounce off it (the way out of it, to push you along). A
 * manta you touch is hit, at any speed. A ghost you pass through chills you (once in a while per
 * ghost). A swooping UFO passing over you lifts you.
 */
export function touches(foes: readonly Foe[], you: You, boosting: boolean, t: number): Touch[] {
  const out: Touch[] = [];
  for (const f of foes) {
    if (f.dead !== null) continue;
    const spec = FOE[f.kind];
    const dx = you.x - f.x;
    const dy = you.y - f.y;
    const d = Math.hypot(dx, dy);
    if (f.kind === 'robot' || f.kind === 'spider') {
      // A spider's body rides high: you hit its legs' ring low down, or its body in the air.
      if (d > spec.r + 1.6 || you.up > spec.tall) continue;
      if (boosting) out.push({ kind: 'ram', f });
      else out.push({ kind: 'bounce', f, nx: d > 1e-6 ? dx / d : 1, ny: d > 1e-6 ? dy / d : 0 });
    } else if (f.kind === 'manta') {
      if (d < spec.r + 1.6 && Math.abs(you.up - f.z) < 3) out.push({ kind: 'bump', f });
    } else if (f.kind === 'ghost') {
      if (d < spec.r + 1.2 && you.up < f.z + spec.tall && t - f.coldAt > COLD.again)
        out.push({ kind: 'cold', f });
    } else if (f.kind === 'ufo') {
      if (d < spec.r + 6 && f.z - you.up < 14 && f.z > you.up) out.push({ kind: 'lift', f });
    }
  }
  return out;
}

/** A bounce off a foe: the speed into it turned back out, everything kept at `keep`. */
export function bounceOff(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
  keep = BOUNCE.keep,
): { vx: number; vy: number } {
  const into = vx * nx + vy * ny;
  // Only the speed toward it (into < 0, the normal points from it to you) is turned back.
  const rx = into < 0 ? vx - 2 * into * nx : vx;
  const ry = into < 0 ? vy - 2 * into * ny : vy;
  return { vx: rx * keep, vy: ry * keep };
}

/* ── The spiders' legs ────────────────────────────────────── */

/**
 * A two-bone leg's knee: from the hip to the foot with thigh `a` and shin `b`, the knee raised
 * up (z) out of the plane through hip and foot. Points are [x, y, z]. A foot out of reach is
 * pulled in along the line (the leg straight).
 */
export function legKnee(
  hip: readonly [number, number, number],
  foot: readonly [number, number, number],
  a: number,
  b: number,
): [number, number, number] {
  const dx = foot[0] - hip[0];
  const dy = foot[1] - hip[1];
  const dz = foot[2] - hip[2];
  const d = Math.max(1e-6, Math.min(a + b - 1e-6, Math.hypot(dx, dy, dz)));
  const ux = dx / Math.hypot(dx, dy, dz || 1e-9);
  const uy = dy / Math.hypot(dx, dy, dz || 1e-9);
  const uz = dz / Math.hypot(dx, dy, dz || 1e-9);
  // Along the line to the knee's foot, and how far off it.
  const along = (a * a - b * b + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, a * a - along * along));
  // "Up" made square to the line.
  const k = uz;
  let px = -ux * k;
  let py = -uy * k;
  let pz = 1 - uz * k;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl;
  py /= pl;
  pz /= pl;
  return [
    hip[0] + ux * along + px * off,
    hip[1] + uy * along + py * off,
    hip[2] + uz * along + pz * off,
  ];
}

/** A spider's eight hips round its body and where each foot rests (in its own frame: x ahead, y
 * left), the legs splayed wide. Feet in two groups that step in turn. */
export const SPIDER_LEGS: { hx: number; hy: number; fx: number; fy: number; group: 0 | 1 }[] = [
  -1, 1,
].flatMap((side) =>
  [0, 1, 2, 3].map((i) => {
    const a = (0.2 + i * 0.2) * Math.PI * side;
    return {
      hx: Math.cos(a) * 2.6,
      hy: Math.sin(a) * 2.2,
      fx: Math.cos(a) * 13 + (1.5 - i) * 1.5,
      fy: Math.sin(a) * 12,
      group: ((i + (side > 0 ? 0 : 1)) % 2) as 0 | 1,
    };
  }),
);
/** How far a foot may lag behind its rest before it steps (m), and how long a step takes (s). */
export const STRIDE = { reach: 3.4, time: 0.32, lift: 2.6 };
