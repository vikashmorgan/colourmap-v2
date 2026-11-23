import { describe, expect, it } from 'vitest';
import {
  COOLDOWN,
  cooldownLeft,
  crosshairNear,
  fireAttack,
  LASER,
  laserLock,
  newAttacks,
  SHARK,
  SHOT,
  stepAttacks,
  unlocked,
} from './mars-attacks';

const you = { x: 0, y: 0, h: 0 };

/** Runs everything in flight for `secs` at 60 Hz with him at a fixed place (or moving). */
function fly(
  a: ReturnType<typeof newAttacks>,
  him: (t: number) => { x: number; y: number },
  secs: number,
  t0 = 0,
) {
  let at = a;
  const events = [];
  for (let i = 1; i <= secs * 60; i++) {
    const t = t0 + i / 60;
    const out = stepAttacks(at, 1 / 60, t, him(t));
    at = out.attacks;
    events.push(...out.events.map((e) => ({ ...e, t })));
  }
  return { attacks: at, events };
}

describe('what is unlocked', () => {
  it('opens the shark first, the shot after a catch, the laser and the pack after two', () => {
    expect(unlocked(0)).toEqual({ attacks: ['shark'], sharkLevel: 1 });
    expect(unlocked(1)).toEqual({ attacks: ['shark', 'shot'], sharkLevel: 1 });
    expect(unlocked(2)).toEqual({ attacks: ['shark', 'shot', 'laser'], sharkLevel: 2 });
    expect(unlocked(9).attacks).toHaveLength(3);
  });

  it('will not fire what is still locked, but a gate charge fires anyway', () => {
    const a = newAttacks();
    expect(fireAttack(a, 'laser', 0, you, { x: 100, y: 0 }, 0).fired).toBe(false);
    expect(fireAttack(a, 'shot', 0, you, { x: 100, y: 0 }, 0).fired).toBe(false);
    const charged = fireAttack(a, 'laser', 0, you, { x: 100, y: 0 }, 0, true);
    expect(charged.fired).toBe(true);
    expect(charged.attacks.ready.laser).toBe(0);
  });
});

describe('cooldowns', () => {
  it('waits its cooldown before the same attack goes again', () => {
    let a = newAttacks();
    const first = fireAttack(a, 'shark', 10, you, { x: 500, y: 0 }, 0);
    expect(first.fired).toBe(true);
    a = first.attacks;
    expect(cooldownLeft(a, 'shark', 10)).toBe(COOLDOWN.shark);
    expect(fireAttack(a, 'shark', 10 + COOLDOWN.shark - 0.1, you, { x: 500, y: 0 }, 0).fired).toBe(
      false,
    );
    expect(fireAttack(a, 'shark', 10 + COOLDOWN.shark, you, { x: 500, y: 0 }, 0).fired).toBe(true);
    expect(cooldownLeft(a, 'shot', 10)).toBe(0);
  });
});

describe('the Dust Sharks', () => {
  it('swim after him, faster than he runs, and hit him', () => {
    const fired = fireAttack(newAttacks(), 'shark', 0, you, { x: 300, y: 0 }, 0);
    expect(fired.attacks.flying).toHaveLength(1);
    // He runs north at his top pace from 300 m east.
    const him = (t: number) => ({ x: 300, y: 68 * t });
    const out = fly(fired.attacks, him, SHARK.life);
    const hit = out.events.find((e) => e.kind === 'hit');
    expect(hit).toBeDefined();
    expect(out.attacks.flying).toHaveLength(0);
  });

  it('sends a pack of four at level two, fanned out at first', () => {
    const fired = fireAttack(newAttacks(), 'shark', 0, you, { x: 300, y: 0 }, 2);
    expect(fired.attacks.flying).toHaveLength(4);
    const lanes = fired.attacks.flying.map((p) => p.h);
    expect(new Set(lanes).size).toBe(4);
    const out = fly(fired.attacks, () => ({ x: 300, y: 0 }), SHARK.life);
    expect(out.events.filter((e) => e.kind === 'hit')).toHaveLength(4);
  });

  it('give up after their life when he is out of reach', () => {
    const fired = fireAttack(newAttacks(), 'shark', 0, you, { x: 5000, y: 0 }, 0);
    const out = fly(fired.attacks, () => ({ x: 5000, y: 0 }), SHARK.life + 1);
    expect(out.events.some((e) => e.kind === 'gone')).toBe(true);
    expect(out.events.some((e) => e.kind === 'hit')).toBe(false);
  });
});

describe('the shot', () => {
  it('bursts after its set distance, and hits him inside the burst', () => {
    const fired = fireAttack(newAttacks(), 'shot', 0, you, { x: 0, y: 0 }, 1);
    // He stands just off the line where it bursts.
    const out = fly(fired.attacks, () => ({ x: SHOT.burstAt + 5, y: 15 }), 3);
    const burst = out.events.find((e) => e.kind === 'burst');
    expect(burst).toBeDefined();
    expect(burst?.x).toBeGreaterThanOrEqual(SHOT.burstAt - 0.1);
    expect(burst?.x).toBeLessThan(SHOT.burstAt + SHOT.speed / 60 + 0.1);
    expect(burst?.t).toBeCloseTo(SHOT.burstAt / SHOT.speed, 1);
    expect(out.events.some((e) => e.kind === 'hit')).toBe(true);
  });

  it('bursts harmlessly when he is far from it', () => {
    const fired = fireAttack(newAttacks(), 'shot', 0, you, { x: 0, y: 0 }, 1);
    const out = fly(fired.attacks, () => ({ x: 0, y: 900 }), 3);
    expect(out.events.some((e) => e.kind === 'burst')).toBe(true);
    expect(out.events.some((e) => e.kind === 'hit')).toBe(false);
  });

  it('bursts early when it passes close to him', () => {
    const fired = fireAttack(newAttacks(), 'shot', 0, you, { x: 0, y: 0 }, 1);
    const out = fly(fired.attacks, () => ({ x: 120, y: 2 }), 3);
    const burst = out.events.find((e) => e.kind === 'burst');
    expect(burst?.x).toBeLessThan(130);
    expect(out.events.some((e) => e.kind === 'hit')).toBe(true);
  });
});

describe('the laser', () => {
  it('locks on when he is ahead, in reach and close to the line', () => {
    expect(laserLock(you, { x: 500, y: 0 })).toBe(0);
    expect(laserLock(you, { x: 500, y: 20 })).not.toBeNull();
    expect(laserLock(you, { x: 500, y: 80 })).toBeNull();
    expect(laserLock(you, { x: -500, y: 0 })).toBeNull();
    expect(laserLock(you, { x: LASER.reach + 1, y: 0 })).toBeNull();
  });

  it('hits at once when locked, and only draws its beam when not', () => {
    const on = fireAttack(newAttacks(), 'laser', 0, you, { x: 400, y: 5 }, 2);
    expect(on.events.map((e) => e.kind)).toEqual(['beam', 'hit']);
    const off = fireAttack(newAttacks(), 'laser', 0, you, { x: 400, y: 300 }, 2);
    expect(off.events.map((e) => e.kind)).toEqual(['beam']);
    expect(off.events[0].x2).toBeCloseTo(LASER.reach, 6);
  });

  it('shows the crosshair more as he comes into view ahead', () => {
    expect(crosshairNear(you, { x: -300, y: 0 })).toBe(0);
    expect(crosshairNear(you, { x: 300, y: 0 })).toBe(1);
    expect(crosshairNear(you, { x: 1500, y: 0 })).toBeLessThan(1);
    expect(crosshairNear(you, { x: 1500, y: 0 })).toBeGreaterThan(0);
    expect(crosshairNear(you, { x: 300, y: 100 })).toBeLessThan(
      crosshairNear(you, { x: 300, y: 0 }),
    );
    expect(crosshairNear(you, { x: 3000, y: 0 })).toBe(0);
  });
});
