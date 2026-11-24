/**
 * Drive, Mars: the superboost portals (docs/specs/mars-world.md, "Terrain to race in"). Pure:
 * where a portal stands, whether a move went through it, and the push it gives.
 *
 * 2026-11-24: "a superboost for the desert parts. that u can take by flying through portals. and
 * it allows u to super speed".
 *
 * A portal is a tall ring standing on the ground across its way. Through it (on the ground or
 * flying, inside the ring), the superboost pushes you well past your top speed for a few seconds,
 * then lets go; past the top the engine eases you back down (lib/art/vehicle.ts pull), so the
 * speed bleeds off over many seconds, never stamped on. Another portal while it runs starts it
 * again.
 */

export interface Portal {
  x: number;
  y: number;
  /** The way through it (rad, counter-clockwise from east). */
  h: number;
  /** Its ring's radius (m): it stands on the ground, its middle this high. */
  r: number;
}

export const PORTAL_R = 9;

/**
 * The push: up to `pull` m/s² toward `top` × your top speed, easing off as you near it; full for
 * `hold` s, fading over `fade` s. `look` s is how long the picture's streaks and the wider view
 * last (they fade over the last second).
 */
export const SUPER = { pull: 38, top: 1.7, hold: 3.5, fade: 1.5, ease: 18, look: 5 };

/** Whether a move from p to q (at a height z above the ground there) went through the portal
 * the right way or the wrong way (both count). */
export function throughPortal(
  p: Portal,
  px: number,
  py: number,
  qx: number,
  qy: number,
  z: number,
): boolean {
  if (Math.abs(qx - p.x) > p.r + 60 || Math.abs(qy - p.y) > p.r + 60) return false;
  const c = Math.cos(p.h);
  const s = Math.sin(p.h);
  const a = (px - p.x) * c + (py - p.y) * s;
  const b = (qx - p.x) * c + (qy - p.y) * s;
  if (a > 0 === b > 0 || a === b) return false;
  const k = a / (a - b);
  const x = px + (qx - px) * k;
  const y = py + (qy - py) * k;
  const across = Math.abs(-(x - p.x) * s + (y - p.y) * c);
  // Inside the ring: the circle round its middle, r up.
  return Math.hypot(across, z - p.r) < p.r;
}

/** The portal a move went through, if any. */
export function portalCrossed(
  portals: readonly Portal[],
  px: number,
  py: number,
  qx: number,
  qy: number,
  z: number,
): Portal | null {
  for (const p of portals) if (throughPortal(p, px, py, qx, qy, z)) return p;
  return null;
}

/** The superboost's push along your heading (m/s²), `since` s after a portal, at a speed. */
export function superAccel(since: number, speed: number, vTop: number): number {
  if (!(since >= 0) || since >= SUPER.hold + SUPER.fade) return 0;
  const k = since < SUPER.hold ? 1 : (1 - (since - SUPER.hold) / SUPER.fade) ** 2;
  // A quick swell in (a fifth of a second), so it lands as a kick, not a jolt.
  const swell = Math.min(1, since / 0.2);
  const room = Math.min(1, Math.max(0, (vTop * SUPER.top - speed) / SUPER.ease));
  return SUPER.pull * k * swell * room;
}

/** How much the superboost shows on the screen (0..1): the streaks and the wider view. */
export function superLook(since: number): number {
  if (!(since >= 0) || since >= SUPER.look) return 0;
  const inK = Math.min(1, since / 0.15);
  const outK = Math.min(1, (SUPER.look - since) / 1);
  return inK * outK;
}
