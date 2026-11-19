import { describe, expect, it } from 'vitest';

import type { Controls } from './drive';
import {
  FLAT,
  G,
  landingLoss,
  leavesGround,
  newVehicle,
  pull,
  ROAD_KEEP,
  roughDrag,
  slopePull,
  speedOf,
  steerLimit,
  stepVehicle,
  VEHICLES,
  type World,
} from './vehicle';

const GO: Controls = { throttle: 1, steer: 0, boost: 0 };

function run(kind: 'car' | 'ship', ctl: Controls, seconds: number, world: World = FLAT) {
  const v = newVehicle(kind, 0, 0, 0);
  for (let i = 0; i < seconds * 60; i++) stepVehicle(v, ctl, 1 / 60, world, i / 60);
  return v;
}

describe('the pull', () => {
  it('is strong off the line and fades to nothing at the top speed', () => {
    const car = VEHICLES.car;
    expect(pull(car, 0, 1, 0)).toBe(car.accel);
    expect(pull(car, car.vTop, 1, 0)).toBeCloseTo(0);
    expect(pull(car, car.vTop / 2, 1, 0)).toBeLessThan(car.accel);
    expect(pull(car, 0, 1, 2)).toBeGreaterThan(pull(car, 0, 1, 1));
  });

  it('brakes when going forward and reverses from a stop', () => {
    const car = VEHICLES.car;
    expect(pull(car, 20, -1, 0)).toBe(-car.brake);
    expect(pull(car, 0, -1, 0)).toBe(-car.reverseAccel);
    expect(pull(car, -car.reverseTop - 1, -1, 0)).toBe(0);
    // Past the top (a boost let go of) it eases down, never brakes hard.
    expect(pull(car, car.vTop * 1.5, 1, 0)).toBe(-3);
  });

  it('steers less the faster it goes', () => {
    expect(steerLimit(80)).toBeLessThan(steerLimit(10));
  });
});

describe('driving on the flat', () => {
  it('holds a drift instead of spinning when a key is held hard over at speed (2026-11-16)', () => {
    for (const kind of ['car', 'ship'] as const) {
      const v = run(kind, GO, 12);
      let most = 0;
      for (let i = 0; i < 180; i++) {
        stepVehicle(v, { throttle: 1, steer: 1, boost: 0 }, 1 / 60);
        most = Math.max(most, Math.abs(v.slip));
      }
      expect(most).toBeLessThan(0.35);
      expect(speedOf(v)).toBeGreaterThan(30);
    }
  });

  it('accelerates to near its top speed and holds it', () => {
    const v = run('car', GO, 30);
    // Air drag holds it a little under the top (about 300 km/h).
    expect(speedOf(v)).toBeGreaterThan(VEHICLES.car.vTop * 0.86);
    expect(speedOf(v)).toBeLessThanOrEqual(VEHICLES.car.vTop * 1.01);
    expect(v.x).toBeGreaterThan(1000);
    expect(Math.abs(v.y)).toBeLessThan(1e-6);
  });

  it('goes faster with the boost, faster again with the double boost', () => {
    const plain = speedOf(run('car', GO, 25));
    const boost = speedOf(run('car', { ...GO, boost: 1 }, 25));
    const double = speedOf(run('car', { ...GO, boost: 2 }, 25));
    expect(boost).toBeGreaterThan(plain * 1.15);
    expect(double).toBeGreaterThan(boost * 1.1);
  });

  it('coasts to a stop and brakes to a stop without rolling back', () => {
    const v = run('car', GO, 4);
    for (let i = 0; i < 60 * 10; i++) stepVehicle(v, { throttle: -1, steer: 0, boost: 0 }, 1 / 60);
    // After stopping, holding the brake reverses slowly.
    expect(v.vLong).toBeLessThan(0.01);
    expect(v.vLong).toBeGreaterThanOrEqual(-VEHICLES.car.reverseTop - 0.1);
  });

  it('turns left with positive steer and slides wide when turned hard at speed', () => {
    const v = run('car', GO, 12);
    const h0 = v.h;
    let maxSlip = 0;
    for (let i = 0; i < 90; i++) {
      stepVehicle(v, { throttle: 1, steer: 1, boost: 0 }, 1 / 60);
      maxSlip = Math.max(maxSlip, Math.abs(v.slip));
    }
    expect(v.h).toBeGreaterThan(h0);
    // A drift: the car points further round than it goes.
    expect(maxSlip).toBeGreaterThan(0.03);
  });

  it('slides more on the hover ship than on the car', () => {
    const slide = (kind: 'car' | 'ship') => {
      const v = run(kind, GO, 12);
      let m = 0;
      for (let i = 0; i < 90; i++) {
        stepVehicle(v, { throttle: 1, steer: 1, boost: 0 }, 1 / 60);
        m = Math.max(m, Math.abs(v.slip));
      }
      return m;
    };
    expect(slide('ship')).toBeGreaterThan(slide('car'));
  });

  it('hovers the ship over the ground and keeps the car on it', () => {
    expect(run('ship', GO, 1).z).toBeCloseTo(VEHICLES.ship.hover);
    expect(run('car', GO, 1).z).toBeCloseTo(0);
  });
});

describe('gravity on slopes', () => {
  it('pulls down the slope', () => {
    const g = slopePull(0.1, 0);
    expect(g.ax).toBeLessThan(0);
    expect(g.ay).toBeCloseTo(0);
    expect(Math.hypot(g.ax, g.ay)).toBeLessThan(G * 0.1 + 1e-9);
  });

  it('speeds you up downhill and slows you uphill', () => {
    const down: World = { ground: (x) => ({ h: -0.08 * x, gx: -0.08, gy: 0, rough: 0 }) };
    const up: World = { ground: (x) => ({ h: 0.08 * x, gx: 0.08, gy: 0, rough: 0 }) };
    const coast: Controls = { throttle: 0, steer: 0, boost: 0 };
    const start = (w: World) => {
      const v = newVehicle('car', 0, 0, 0);
      v.vx = 40;
      v.vLong = 40;
      for (let i = 0; i < 120; i++) stepVehicle(v, coast, 1 / 60, w);
      return speedOf(v);
    };
    expect(start(down)).toBeGreaterThan(40);
    expect(start(up)).toBeLessThan(start(FLAT));
  });

  it('turns a drop off a banked side into speed ahead (the pump)', () => {
    // A bank rising to the left (+y): driving east, steering gently down it.
    // A bank rising to the left (+y); the vehicle aims a little down it, as you would dropping in.
    const bank: World = { ground: (_x, y) => ({ h: 0.35 * y, gx: 0, gy: 0.35, rough: 0 }) };
    const coast: Controls = { throttle: 0, steer: 0, boost: 0 };
    const drop = (pump: number) => {
      const v = newVehicle('car', 0, 20, -0.25, 7);
      v.vx = 50 * Math.cos(-0.25);
      v.vy = 50 * Math.sin(-0.25);
      const keep = VEHICLES.car.pump;
      VEHICLES.car.pump = pump;
      for (let i = 0; i < 60; i++) stepVehicle(v, coast, 1 / 60, bank);
      VEHICLES.car.pump = keep;
      return v;
    };
    const flat = newVehicle('car', 0, 20, -0.25);
    flat.vx = 50 * Math.cos(-0.25);
    flat.vy = 50 * Math.sin(-0.25);
    for (let i = 0; i < 60; i++) stepVehicle(flat, coast, 1 / 60, FLAT);
    const pumped = drop(VEHICLES.car.pump);
    expect(pumped.y).toBeLessThan(20);
    // Dropping off the bank gains on the flat, and the pump adds to plain gravity.
    expect(speedOf(pumped)).toBeGreaterThan(speedOf(flat) + 1);
    expect(speedOf(pumped)).toBeGreaterThan(speedOf(drop(0)));
  });

  it('drags on rough ground, more at speed', () => {
    expect(roughDrag(0, 50)).toBe(0);
    expect(roughDrag(1, 50)).toBeGreaterThan(roughDrag(1, 10));
    const rough: World = { ground: () => ({ h: 0, gx: 0, gy: 0, rough: 1 }) };
    expect(speedOf(run('car', GO, 30, rough))).toBeLessThan(50);
  });
});

describe('jumps', () => {
  it('leaves the ground when it falls away faster than gravity follows', () => {
    expect(leavesGround(0, 5, 0, 1 / 120)).toBe(true);
    expect(leavesGround(0, 0, 0, 1 / 120)).toBe(false);
    expect(leavesGround(0, -1, 0, 1 / 120)).toBe(false);
  });

  // A crest: up a 1-in-4 ramp to x = 0, then a sharp drop back to the flat.
  const crest: World = {
    ground: (x) => {
      if (x < -20 || x > 0) return { h: 0, gx: 0, gy: 0, rough: 0 };
      return { h: (x + 20) * 0.25, gx: 0.25, gy: 0, rough: 0 };
    },
  };

  function jump(kind: 'car' | 'ship', speed: number) {
    const v = newVehicle(kind, -60, 0, 0);
    v.vx = speed;
    v.vLong = speed;
    let air = 0;
    let landed = 0;
    let flew = false;
    for (let i = 0; i < 600; i++) {
      const ev = stepVehicle(v, { throttle: 0.3, steer: 0, boost: 0 }, 1 / 60, crest);
      if (v.air) {
        air += 1 / 60;
        flew = true;
      }
      if (ev.landed > 0) landed = ev.landed;
    }
    return { air, landed, flew, v };
  }

  it('flies off a crest at speed and lands smoothly', () => {
    const j = jump('car', 50);
    expect(j.flew).toBe(true);
    expect(j.air).toBeGreaterThan(0.4);
    expect(j.landed).toBeGreaterThan(0);
    expect(j.v.air).toBe(false);
    // Still going: a landing costs at most 12%.
    expect(speedOf(j.v)).toBeGreaterThan(35);
  });

  it('glides far longer on the hover ship', () => {
    expect(jump('ship', 50).air).toBeGreaterThan(jump('car', 50).air * 1.8);
  });

  // A smooth crest 4.5 m high (a cosine hump 68 m long), like the night tracks' crests.
  const hump: World = {
    ground: (x) => {
      if (Math.abs(x) > 34) return { h: 0, gx: 0, gy: 0, rough: 0 };
      const k = Math.PI / 34;
      return { h: 2.25 * (1 + Math.cos(k * x)), gx: -2.25 * k * Math.sin(k * x), gy: 0, rough: 0 };
    },
  };

  it('flies off a smooth crest at speed, not only off a sharp ramp (2026-11-16)', () => {
    const v = newVehicle('car', -80, 0, 0);
    v.vx = 55;
    v.vLong = 55;
    let air = 0;
    for (let i = 0; i < 300; i++) {
      stepVehicle(v, { throttle: 0.3, steer: 0, boost: 0 }, 1 / 60, hump);
      if (v.air) air += 1 / 60;
    }
    expect(air).toBeGreaterThan(0.3);
  });

  it('keeps the car down over small ripples in the road', () => {
    const ripples: World = {
      // 5 cm undulations every 60 m: at 60 m/s they pull about 2 m/s², well under gravity.
      ground: (x) => ({
        h: 0.05 * Math.sin(x / 9.5),
        gx: (0.05 / 9.5) * Math.cos(x / 9.5),
        gy: 0,
        rough: 0,
      }),
    };
    const v = newVehicle('car', 0, 0, 0);
    v.vx = 60;
    v.vLong = 60;
    let took = 0;
    for (let i = 0; i < 300; i++) if (stepVehicle(v, GO, 1 / 60, ripples).tookOff) took++;
    expect(took).toBe(0);
  });

  it("never launches off a road's curled-up edge: it is ridden like a wall", () => {
    const lip: World = {
      ground: (x) =>
        x > 0 ? { h: x * 0.9, gx: 0.9, gy: 0, rough: 0, lip: 1 } : { h: 0, gx: 0, gy: 0, rough: 0 },
    };
    const v = newVehicle('car', -10, 0, 0);
    v.vx = 40;
    v.vLong = 40;
    let took = 0;
    for (let i = 0; i < 30; i++) if (stepVehicle(v, GO, 1 / 60, lip).tookOff) took++;
    expect(took).toBe(0);
  });

  it('costs little speed on a soft landing and more on a slam, never all of it', () => {
    expect(landingLoss(1)).toBe(0);
    expect(landingLoss(10)).toBeGreaterThan(0);
    expect(landingLoss(100)).toBe(0.12);
  });
});

describe('obstacles', () => {
  it('bounces off, loses speed and spins', () => {
    const wall: World = {
      ground: FLAT.ground,
      collide: (v) => (v.x > 10 ? { nx: -1, ny: 0, depth: v.x - 10, loss: 0.35, spin: 2 } : null),
    };
    const v = newVehicle('car', 0, 0, 0);
    v.vx = 30;
    v.vLong = 30;
    let bump = 0;
    for (let i = 0; i < 60; i++) bump = Math.max(bump, stepVehicle(v, GO, 1 / 60, wall).bump);
    expect(bump).toBeGreaterThan(10);
    expect(v.x).toBeLessThanOrEqual(10.5);
    expect(Math.abs(v.yawRate)).toBeGreaterThan(0);
  });

  it('scrapes along a barrier at a shallow angle and keeps going (2026-11-16)', () => {
    const rail: World = {
      ground: FLAT.ground,
      collide: (v) => (v.y > 5 ? { nx: 0, ny: -1, depth: v.y - 5, loss: 0.08, spin: 0.6 } : null),
    };
    const v = newVehicle('car', 0, 0, 0.12);
    v.vx = 50 * Math.cos(0.12);
    v.vy = 50 * Math.sin(0.12);
    v.vLong = 50;
    for (let i = 0; i < 120; i++) stepVehicle(v, GO, 1 / 60, rail);
    expect(speedOf(v)).toBeGreaterThan(38);
    expect(Math.abs(v.h)).toBeLessThan(0.2);
  });
});

describe('a road holds you on it (2026-11-17)', () => {
  // A straight road east along y = 0, 30 m wide: the road is all the world knows.
  const ROAD: World = {
    ground: (_x, y) => ({ h: 0, gx: 0, gy: 0, rough: 0, road: { h: 0, k: 0, u: y, half: 15 } }),
  };

  it('lets go of the keys and the car lines up with the road, keeping its place across it', () => {
    const v = newVehicle('car', 0, 0, 0.2);
    v.vx = 60 * Math.cos(0.2);
    v.vy = 60 * Math.sin(0.2);
    for (let i = 0; i < 60 * 4; i++) stepVehicle(v, GO, 1 / 60, ROAD, i / 60);
    expect(Math.abs(v.h)).toBeLessThan(0.02);
    expect(Math.abs(v.vy)).toBeLessThan(0.5);
    expect(Math.abs(v.y)).toBeLessThan(15 - 1);
  });

  it('turns you no further than the angle from the road, and glides you onto its edge', () => {
    const v = newVehicle('car', 0, 0, 0);
    v.vx = 60;
    let most = 0;
    for (let i = 0; i < 60 * 6; i++) {
      stepVehicle(v, { throttle: 1, steer: 1, boost: 0 }, 1 / 60, ROAD, i / 60);
      most = Math.max(most, v.h);
    }
    expect(most).toBeLessThan(ROAD_KEEP.angle + 0.05);
    expect(v.y).toBeGreaterThan(5);
    expect(v.y).toBeLessThan(15);
    expect(speedOf(v)).toBeGreaterThan(55);
  });

  it('leaves open ground alone: a held key there still turns you round', () => {
    const v = newVehicle('car', 0, 0, 0);
    let far = 0;
    for (let i = 0; i < 60 * 6; i++) {
      stepVehicle(v, { throttle: 1, steer: 1, boost: 0 }, 1 / 60, FLAT, i / 60);
      far = Math.max(far, Math.abs(v.y));
    }
    // Round in a circle, far across the line it started on (a road would hold it within 15 m).
    expect(far).toBeGreaterThan(20);
  });
});

describe('the handbrake (2026-11-19: "brake and turn to drift harder")', () => {
  // Full lock at 45 m/s for 2/3 s, with or without the handbrake, then 2 s straight on the throttle.
  const drift = (kind: 'car' | 'ship', hand: boolean) => {
    const v = newVehicle(kind, 0, 0, Math.PI / 2);
    v.vy = 45;
    let widest = 0;
    for (let i = 0; i < 60; i++) {
      stepVehicle(v, { throttle: 1, steer: 1, boost: 0, handbrake: hand && i < 40 }, 1 / 60);
      widest = Math.max(widest, Math.abs(Math.atan2(v.vLat, v.vLong)));
    }
    for (let i = 0; i < 120; i++) stepVehicle(v, GO, 1 / 60);
    return { widest, v };
  };

  it('swings the tail out much wider than steering alone', () => {
    for (const kind of ['car', 'ship'] as const) {
      const plain = drift(kind, false).widest;
      const hand = drift(kind, true).widest;
      expect(hand).toBeGreaterThan(0.25);
      expect(hand).toBeGreaterThan(plain * 2);
    }
  });

  it('straightens once let go, still driving forward, never a spin', () => {
    for (const kind of ['car', 'ship'] as const) {
      const { v } = drift(kind, true);
      expect(Math.abs(Math.atan2(v.vLat, v.vLong))).toBeLessThan(0.05);
      expect(v.vLong).toBeGreaterThan(25);
      expect(v.hand).toBeLessThan(0.01);
    }
  });

  it('does nothing in the air or at a standstill', () => {
    const v = newVehicle('car', 0, 0, 0);
    stepVehicle(v, { ...GO, throttle: 0, handbrake: true }, 0.5);
    expect(v.hand).toBe(0);
  });
});

describe('walls you flow along (2026-11-19: "you can\'t stop if you hit something")', () => {
  // A wall along y = 6, flowing: driving into it at 20° and 70 m/s.
  const WALL: World = {
    ground: FLAT.ground,
    collide: (v) =>
      v.y > 5 ? { nx: 0, ny: -1, depth: v.y - 5, loss: 0, spin: 0, flow: true } : null,
  };

  it('turns the speed along the wall, losing none of it, and throws sparks', () => {
    const v = newVehicle('car', 0, 0, 0.35);
    v.vx = Math.cos(0.35) * 70;
    v.vy = Math.sin(0.35) * 70;
    let scraped = 0;
    let slowest = 1e9;
    for (let i = 0; i < 120; i++) {
      const ev = stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, WALL, i / 60);
      scraped = Math.max(scraped, ev.scrape ?? 0);
      if (i > 20) slowest = Math.min(slowest, speedOf(v));
    }
    expect(scraped).toBeGreaterThan(50);
    // Still flying along it: no hit slows you.
    expect(slowest).toBeGreaterThan(66);
    expect(v.y).toBeLessThan(5.5);
    expect(Math.abs(v.yawRate)).toBeLessThan(1);
  });
});
