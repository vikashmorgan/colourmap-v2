/**
 * The Garage (docs/specs/garage.md): the turntable's motion. Pure: no three.js, no DOM.
 *
 * Asked for 2026-11-19: "a space to design your car or spaceship, like a dope space garage, with a
 * circle raised in the middle of the room and the spaceship or car or bike on top; you can rotate
 * the circle and check your ride." Drag turns the platform; let go and it keeps turning, slowing to
 * a slow idle spin (it never stops dead, so the ride always shows off).
 */

/** The idle spin (rad/s), how fast a fling fades back to it (1/s), and the fastest fling. */
export const SPIN = { idle: 0.18, settle: 1.6, max: 9 };
/** How far one pixel of drag turns the platform (rad). */
export const DRAG_TURN = 0.008;
/** The camera's tilt range (rad above level) and distance range (m). */
export const TILT = { min: 0.04, max: 0.7, start: 0.15 };
export const ZOOM = { min: 7, max: 18, start: 11 };

export interface Turntable {
  angle: number;
  /** rad/s */
  speed: number;
  /** A finger or the mouse on it: it follows the drag and does not spin by itself. */
  held: boolean;
}

export const newTurntable = (): Turntable => ({ angle: 0, speed: SPIN.idle, held: false });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A drag of dx pixels over dt seconds: turns it, and sets the speed it will be flung at. */
export function dragTurn(t: Turntable, dx: number, dt: number): Turntable {
  const turn = dx * DRAG_TURN;
  const speed = dt > 0 ? clamp(turn / dt, -SPIN.max, SPIN.max) : t.speed;
  return { angle: t.angle + turn, speed, held: true };
}

/** One frame: held, it stays; let go, it carries on and eases back to the idle spin. */
export function stepTurntable(t: Turntable, dt: number): Turntable {
  if (t.held) return t;
  const target = Math.sign(t.speed || 1) * SPIN.idle;
  const speed = target + (t.speed - target) * Math.exp(-SPIN.settle * dt);
  return { ...t, angle: t.angle + speed * dt, speed };
}

export const tiltBy = (tilt: number, dy: number): number =>
  clamp(tilt + dy * 0.004, TILT.min, TILT.max);
export const zoomBy = (dist: number, wheel: number): number =>
  clamp(dist * Math.exp(wheel * 0.001), ZOOM.min, ZOOM.max);
