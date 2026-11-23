import { describe, expect, it } from 'vitest';
import { DRIFT_GATES } from './drift-gates';
import type { Controls } from './drive';
import {
  BASTARD,
  bastardPose,
  CLEAR,
  CRAFT,
  caught,
  DRIFT_PAN,
  DUNE_MAX,
  distToLoop,
  LOOP_PATH,
  loopAt,
  MARS_TERRAIN,
  marsBase,
  marsGround,
  marsHeight,
  marsTerrainGlsl,
  newBastard,
  PIPES,
  SITES,
  siteHit,
  stepBastard,
} from './mars';
import { FINISH_GATE, LINE, SALT_PERIOD, START, START_GATE } from './salt-flat-game';
import { newVehicle, stepVehicle, VEHICLES } from './vehicle';

describe('the dunes', () => {
  it('rolls: real hills off the course, within the waves’ sum', () => {
    let lo = 0;
    let hi = 0;
    for (let x = 400; x < 3000; x += 37)
      for (let y = -2000; y < 2000; y += 41) {
        const h = marsHeight(x, y);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    expect(hi - lo).toBeGreaterThan(10);
    expect(Math.max(hi, -lo)).toBeLessThanOrEqual(DUNE_MAX);
  });

  it('keeps the measured mile, the start and the drift lake bed flat', () => {
    expect(Math.abs(marsHeight(START.x, START.y))).toBe(0);
    for (let y = LINE.y0; y <= LINE.y1; y += 50) {
      expect(Math.abs(marsHeight(LINE.x, y))).toBe(0);
      expect(Math.abs(marsHeight(LINE.x + 25, y))).toBe(0);
    }
    for (const g of [START_GATE, FINISH_GATE, ...DRIFT_GATES]) {
      expect(Math.abs(marsHeight(g.ax, g.ay))).toBe(0);
      expect(Math.abs(marsHeight(g.bx, g.by))).toBe(0);
    }
    expect(Math.abs(marsHeight(DRIFT_PAN.x, DRIFT_PAN.y))).toBe(0);
  });

  it('repeats every ground period, as the shader sees it', () => {
    for (const [x, y] of [
      [3000, 900],
      [-2500, 4100],
      [5200, -3300],
    ])
      expect(marsHeight(x + SALT_PERIOD, y)).toBeCloseTo(marsHeight(x, y), 6);
  });

  it('gives the slope that matches its heights, and never steeper than 15°', () => {
    let steepest = 0;
    for (let x = -3000; x < 3000; x += 53)
      for (let y = -2000; y < 6000; y += 61) {
        // The dunes alone: the ramps and decks are steep on purpose (lib/art/mars-ramps.test.ts).
        const ramped = [0, 1.5, -1.5].some((d) =>
          [0, 1.5, -1.5].some((e) => marsHeight(x + d, y + e) - marsBase(x + d, y + e) > 1e-9),
        );
        if (ramped) continue;
        const g = marsGround(x, y);
        const e = 0.01;
        expect(g.gx).toBeCloseTo((marsHeight(x + e, y) - marsHeight(x - e, y)) / (2 * e), 3);
        expect(g.gy).toBeCloseTo((marsHeight(x, y + e) - marsHeight(x, y - e)) / (2 * e), 3);
        steepest = Math.max(steepest, Math.hypot(g.gx, g.gy));
      }
    expect(Math.atan(steepest)).toBeLessThan((15 * Math.PI) / 180);
  });

  it('writes the same waves into the backdrop shader', () => {
    const src = marsTerrainGlsl();
    expect(src).toContain('float marsH(vec2 g, vec2 rel, vec2 org)');
    expect(src.match(/h \+= [-\d.]+ \* sin/g)?.length).toBe(7);
    expect(src).toContain('#define MARS_HMAX');
  });

  it('is driven: full throttle over the dunes climbs, descends and leaves the ground a little', () => {
    const v = newVehicle('car', 600, -1500, 0.4);
    const go: Controls = { throttle: 1, steer: 0, boost: 1 };
    let zMin = 1e9;
    let zMax = -1e9;
    let air = 0;
    let took = 0;
    const n = 60 * 60;
    for (let i = 0; i < n; i++) {
      const ev = stepVehicle(v, go, 1 / 60, MARS_TERRAIN, i / 60);
      zMin = Math.min(zMin, v.z);
      zMax = Math.max(zMax, v.z);
      if (v.air) air++;
      if (ev.tookOff) took++;
      // Never sunk into the ground.
      expect(v.z).toBeGreaterThanOrEqual(marsHeight(v.x, v.y) - 0.05);
    }
    expect(zMax - zMin).toBeGreaterThan(6);
    expect(took).toBeGreaterThan(0);
    // Small airs, not a flight: most of the time on the ground.
    expect(air / n).toBeLessThan(0.25);
    expect(Math.hypot(v.vx, v.vy)).toBeGreaterThan(VEHICLES.car.vTop * 0.8);
  });
});

describe("the Red Bastard's loop", () => {
  it('is a long closed loop he runs in long curves', () => {
    expect(LOOP_PATH.length).toBeGreaterThan(9000);
    const a = loopAt(0);
    const b = loopAt(LOOP_PATH.length);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1);
    for (let s = 0; s < LOOP_PATH.length; s += 20)
      expect(Math.abs(loopAt(s).k)).toBeLessThan(1 / 250);
  });

  it('passes about a kilometre in front of the start', () => {
    const p = loopAt(0);
    expect(p.y).toBeGreaterThan(START.y + 600);
    expect(Math.hypot(p.x - START.x, p.y - START.y)).toBeLessThan(1500);
    expect(distToLoop(p.x, p.y)).toBeLessThan(0.5);
  });

  it('drives fast but slower than your top speed, sprinting when you close in', () => {
    let b = newBastard();
    for (let i = 0; i < 600; i++) b = stepBastard(b, 1 / 60, 5000);
    expect(b.speed).toBeCloseTo(BASTARD.speed, 1);
    expect(b.s).toBeGreaterThan(550);
    for (let i = 0; i < 600; i++) b = stepBastard(b, 1 / 60, 100);
    expect(b.speed).toBeGreaterThan(BASTARD.speed + 5);
    expect(b.speed).toBeLessThan(VEHICLES.car.vTop * 0.8);
  });

  it('rides the dunes', () => {
    const b = { s: 2000, speed: 60 };
    const p = bastardPose(b);
    expect(p.z).toBeCloseTo(marsHeight(p.x, p.y) + BASTARD.hover, 6);
  });

  it('counts as caught only close by', () => {
    expect(caught(5, 5)).toBe(true);
    expect(caught(BASTARD.catchR, 1)).toBe(false);
    expect(caught(0, 0, BASTARD.catchR + 1)).toBe(false);
  });
});

describe('the rust stations', () => {
  it('stands a good number of every kind round the course', () => {
    expect(SITES.length).toBeGreaterThan(12);
    for (const k of ['domes', 'nova', 'factory', 'ruin'])
      expect(SITES.some((s) => s.kind === k)).toBe(true);
    expect(PIPES.length).toBeGreaterThan(2);
  });

  it('leaves his loop, the start, the mile and the lake bed clear', () => {
    for (const s of SITES) {
      expect(distToLoop(s.x, s.y)).toBeGreaterThanOrEqual(s.r + CLEAR.loop);
      expect(Math.hypot(s.x - START.x, s.y - START.y)).toBeGreaterThan(s.r + CLEAR.start);
      const cy = Math.min(LINE.y1, Math.max(LINE.y0, s.y));
      expect(Math.hypot(s.x - LINE.x, s.y - cy)).toBeGreaterThan(s.r + CLEAR.line);
      expect(Math.hypot(s.x - DRIFT_PAN.x, s.y - DRIFT_PAN.y)).toBeGreaterThan(DRIFT_PAN.full);
    }
    for (const p of PIPES)
      for (let k = 0; k <= 10; k++) {
        const x = p.ax + ((p.bx - p.ax) * k) / 10;
        const y = p.ay + ((p.by - p.ay) * k) / 10;
        expect(distToLoop(x, y)).toBeGreaterThanOrEqual(CLEAR.pipeLoop - 1);
      }
  });

  it('are flowed round, never crashed into', () => {
    const s = SITES[0];
    const hit = siteHit(s.x + s.r * 0.5, s.y);
    expect(hit?.flow).toBe(true);
    expect(hit?.nx).toBeCloseTo(1, 6);
    expect(siteHit(START.x, START.y)).toBeNull();
  });
});

describe('the craft in the sky', () => {
  it('hang huge and far, every one with a ring, slow', () => {
    expect(CRAFT.length).toBeGreaterThanOrEqual(5);
    for (const c of CRAFT) {
      expect(c.dist).toBeGreaterThan(4000);
      expect(c.dist + c.size).toBeLessThan(9000);
      expect(c.alt).toBeGreaterThan(400);
      expect(Math.atan2(c.alt, c.dist)).toBeLessThan(0.25);
      expect(c.rings.length).toBeGreaterThan(0);
      for (const r of c.rings) expect(Math.abs(r.spin)).toBeLessThan(0.1);
    }
  });
});
