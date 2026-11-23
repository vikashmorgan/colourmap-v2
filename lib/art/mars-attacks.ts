/**
 * Drive, Mars: the attacks on the Red Bastard (docs/specs/drive-game.md, world 8, "Attacks").
 * Pure: what is unlocked, the cooldowns, what each attack does in flight and when it hits.
 *
 * 2026-11-23: "prepare attacks. Dust Sharks … lvl 2 is many sharks"; "another does a shot and
 * explosion after a certain distance. yellow with explosion that goes bang"; "add lasers as one of
 * the attacks u can unlock".
 *
 * - Dust Sharks: a shark of dust swims out over the ground after him, faster than he runs, and
 *   slows him when it reaches him. Level 2 (unlocked later) sends a pack of four.
 * - The shot: a yellow round flies straight ahead and bursts after a set distance (or at once if it
 *   passes close to him); inside the burst he is slowed.
 * - The laser: unlocked last. A straight beam along your heading; it hits when he is in front,
 *   within its reach and close to the line (the crosshair locks on).
 *
 * Each attack goes through one entry, `fireAttack` (the engine's weapon hook calls it). Catching
 * him unlocks the next attack; the unlocks are kept on the device.
 */

export type AttackId = 'shark' | 'shot' | 'laser';
export const ATTACKS: readonly AttackId[] = ['shark', 'shot', 'laser'];

/** Seconds before the same attack can go again. */
export const COOLDOWN: Record<AttackId, number> = { shark: 6, shot: 3.5, laser: 8 };

/** Where the catches are counted on the device. */
export const CATCHES_KEY = 'drive.mars.catches';

/** What is unlocked after so many catches: the shark from the start, the shot after one, the
 * laser and the shark pack after two. */
export function unlocked(catches: number): { attacks: AttackId[]; sharkLevel: 1 | 2 } {
  const attacks: AttackId[] = ['shark'];
  if (catches >= 1) attacks.push('shot');
  if (catches >= 2) attacks.push('laser');
  return { attacks, sharkLevel: catches >= 2 ? 2 : 1 };
}

/** A hit slows him to this share of his speed, for this long (s). */
export const SLOW = { factor: 0.55, time: 2.5 };

export const SHARK = { speed: 92, turn: 1.6, life: 14, reach: 7 };
export const SHOT = { speed: 150, burstAt: 280, near: 12, radius: 28, life: 3 };
export const LASER = { reach: 900, lock: 0.07, show: 0.45 };

export interface Point {
  x: number;
  y: number;
}

/** One thing in flight. */
export interface Projectile {
  id: number;
  kind: 'shark' | 'shot';
  x: number;
  y: number;
  /** Heading (rad) and how far it has gone (m). */
  h: number;
  dist: number;
  born: number;
  /** A shark's place in its pack (a little to each side as it sets off). */
  lane: number;
}

/** What happened this moment: something hit him, a shot burst (where), a beam was drawn. */
export interface AttackEvent {
  kind: 'hit' | 'burst' | 'beam' | 'gone';
  attack: AttackId;
  x: number;
  y: number;
  /** For a beam: where it ends. */
  x2?: number;
  y2?: number;
  projectile?: number;
}

export interface Attacks {
  ready: Record<AttackId, number>;
  flying: Projectile[];
  next: number;
}

export function newAttacks(): Attacks {
  return { ready: { shark: 0, shot: 0, laser: 0 }, flying: [], next: 1 };
}

/** How long until an attack can go again (0 when ready). */
export function cooldownLeft(a: Attacks, id: AttackId, t: number): number {
  return Math.max(0, a.ready[id] - t);
}

/** Whether the laser would hit him now: in front, within reach, close to the line. Returns how
 * near the line he is (0 on it, 1 at the edge of the lock) or null when out of it. */
export function laserLock(from: Point & { h: number }, him: Point): number | null {
  const dx = him.x - from.x;
  const dy = him.y - from.y;
  const along = dx * Math.cos(from.h) + dy * Math.sin(from.h);
  if (along <= 0 || along > LASER.reach) return null;
  const off = Math.abs(-dx * Math.sin(from.h) + dy * Math.cos(from.h));
  const angle = Math.atan2(off, along);
  return angle <= LASER.lock ? angle / LASER.lock : null;
}

/** How much the crosshair shows: nothing with him far or behind, more as he comes into view in
 * front (within twice the laser's reach and 25° of the line). */
export function crosshairNear(from: Point & { h: number }, him: Point): number {
  const dx = him.x - from.x;
  const dy = him.y - from.y;
  const along = dx * Math.cos(from.h) + dy * Math.sin(from.h);
  if (along <= 0) return 0;
  const dist = Math.hypot(dx, dy);
  const angle = Math.acos(Math.min(1, along / Math.max(dist, 1e-6)));
  const byDist = 1 - Math.min(1, Math.max(0, (dist - LASER.reach) / LASER.reach));
  const byAngle = 1 - Math.min(1, angle / 0.44);
  return byDist * byAngle;
}

/**
 * Fires an attack, if it is unlocked and ready. Returns the attacks after, and what happened at
 * once (the laser's beam and hit). Nothing when it is locked or cooling down. `charge`: a charge
 * picked up from a gate (lib/art/pickups.ts) fires whatever is unlocked or not, and leaves the
 * cooldown as it was.
 */
export function fireAttack(
  a: Attacks,
  id: AttackId,
  t: number,
  you: Point & { h: number },
  him: Point,
  catches: number,
  charge = false,
): { attacks: Attacks; fired: boolean; events: AttackEvent[] } {
  const open = unlocked(catches);
  if (!charge && (!open.attacks.includes(id) || t < a.ready[id]))
    return { attacks: a, fired: false, events: [] };
  const ready = charge ? a.ready : { ...a.ready, [id]: t + COOLDOWN[id] };
  const flying = [...a.flying];
  let next = a.next;
  const events: AttackEvent[] = [];
  if (id === 'shark') {
    const n = open.sharkLevel === 2 ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const lane = n === 1 ? 0 : (i - (n - 1) / 2) * 0.35;
      flying.push({
        id: next++,
        kind: 'shark',
        x: you.x,
        y: you.y,
        h: you.h + lane,
        dist: 0,
        born: t,
        lane,
      });
    }
  } else if (id === 'shot') {
    flying.push({
      id: next++,
      kind: 'shot',
      x: you.x,
      y: you.y,
      h: you.h,
      dist: 0,
      born: t,
      lane: 0,
    });
  } else {
    const lock = laserLock(you, him);
    const end =
      lock !== null
        ? { x: him.x, y: him.y }
        : { x: you.x + Math.cos(you.h) * LASER.reach, y: you.y + Math.sin(you.h) * LASER.reach };
    events.push({ kind: 'beam', attack: 'laser', x: you.x, y: you.y, x2: end.x, y2: end.y });
    if (lock !== null) events.push({ kind: 'hit', attack: 'laser', x: him.x, y: him.y });
  }
  return { attacks: { ready, flying, next }, fired: true, events };
}

function turnToward(h: number, target: number, max: number): number {
  let d = target - h;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return h + Math.max(-max, Math.min(max, d));
}

/** Everything in flight a moment on: sharks swim after him, shots fly and burst. */
export function stepAttacks(
  a: Attacks,
  dt: number,
  t: number,
  him: Point,
): { attacks: Attacks; events: AttackEvent[] } {
  if (!a.flying.length) return { attacks: a, events: [] };
  const events: AttackEvent[] = [];
  const flying: Projectile[] = [];
  for (const p of a.flying) {
    if (p.kind === 'shark') {
      // Homing, its turn limited; the pack fans out at first and closes in.
      const want = Math.atan2(him.y - p.y, him.x - p.x);
      const h = turnToward(p.h, want, SHARK.turn * dt * (t - p.born < 0.6 ? 0.3 : 1));
      const step = SHARK.speed * dt;
      const q = {
        ...p,
        h,
        x: p.x + Math.cos(h) * step,
        y: p.y + Math.sin(h) * step,
        dist: p.dist + step,
      };
      if (Math.hypot(him.x - q.x, him.y - q.y) < SHARK.reach) {
        events.push({ kind: 'hit', attack: 'shark', x: q.x, y: q.y, projectile: p.id });
        continue;
      }
      if (t - p.born > SHARK.life) {
        events.push({ kind: 'gone', attack: 'shark', x: q.x, y: q.y, projectile: p.id });
        continue;
      }
      flying.push(q);
    } else {
      const step = SHOT.speed * dt;
      const q = {
        ...p,
        x: p.x + Math.cos(p.h) * step,
        y: p.y + Math.sin(p.h) * step,
        dist: p.dist + step,
      };
      const near = Math.hypot(him.x - q.x, him.y - q.y);
      if (q.dist >= SHOT.burstAt || near < SHOT.near) {
        events.push({ kind: 'burst', attack: 'shot', x: q.x, y: q.y, projectile: p.id });
        if (near < SHOT.radius) events.push({ kind: 'hit', attack: 'shot', x: him.x, y: him.y });
        continue;
      }
      flying.push(q);
    }
  }
  return { attacks: { ...a, flying }, events };
}
