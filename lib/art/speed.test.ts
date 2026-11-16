import { describe, expect, it } from 'vitest';

import {
  aheadDistance,
  buildField,
  CAR,
  closedSteps,
  emptyRoad,
  feel,
  LAP_LENGTH,
  labelAlpha,
  lapPosition,
  MONZA_NAMES,
  makeStream,
  monzaTrack,
  PERIOD,
  pointAt,
  ROAD_POINTS,
  roadAhead,
  roadCentreAt,
  SCENES,
  STREAM_GROUND,
  STREAM_SHAPE,
  STREAM_X,
  sectionOf,
  stepStream,
  streamColour,
  tunnelSpeed,
  windingAt,
} from './speed';
import { SPEED_FLOATS, speedFragment } from './speed-shaders';

/** A repeatable random source. */
function rng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('Speed scenes', () => {
  it('has the ten drives and the triangle stream, each with a unique slug and title', () => {
    expect(SCENES).toHaveLength(11);
    expect(new Set(SCENES.map((s) => s.slug)).size).toBe(11);
    expect(SCENES[0].title).toBe('Monza Lap');
    expect(SCENES[10].title).toBe('Triangle Stream');
  });

  it('specialises one shader per scene, every uniform declared', () => {
    for (let i = 0; i < SCENES.length; i++) {
      const src = speedFragment(i);
      expect(src.startsWith(`#define SCENE ${i}\n`)).toBe(true);
      expect(src).toContain(`#if SCENE == ${i}`);
      for (const u of SPEED_FLOATS) expect(src).toContain(`uniform float ${u};`);
    }
    // Out-of-range scenes clamp.
    expect(speedFragment(99).startsWith('#define SCENE 10\n')).toBe(true);
    expect(speedFragment(-3).startsWith('#define SCENE 0\n')).toBe(true);
  });
});

describe('The Monza trace', () => {
  const track = monzaTrack();

  it('closes into a loop: the two stretched straights stay positive', () => {
    const steps = closedSteps();
    expect(steps[0].len).toBeGreaterThan(800);
    expect(steps[6].len).toBeGreaterThan(0);
    const gap = Math.hypot(track.x[track.n - 1] - track.x[0], track.y[track.n - 1] - track.y[0]);
    expect(gap).toBeLessThan(track.ds * 1.5);
  });

  it('is scaled to two world periods, so the scenery joins up each lap', () => {
    expect(track.length).toBeCloseTo(LAP_LENGTH, 6);
    expect(LAP_LENGTH % PERIOD).toBe(0);
  });

  it('runs clockwise: one full right-hand turn round the lap', () => {
    let turn = 0;
    for (let i = 0; i < track.n; i++) {
      const dh = track.heading[(i + 1) % track.n] - track.heading[i];
      turn += Math.atan2(Math.sin(dh), Math.cos(dh));
    }
    expect(turn).toBeCloseTo(-2 * Math.PI, 2);
    // The smoothed curvature agrees roughly.
    let k = 0;
    for (let i = 0; i < track.n; i++) k += track.curv[i] * track.ds;
    expect(k).toBeLessThan(-5);
  });

  it('is fast on the straights and slow in the chicanes', () => {
    expect(track.vMax).toBeCloseTo(CAR.vTop, 0);
    expect(track.vMin).toBeLessThan(45);
    const straight = pointAt(track, 400);
    expect(straight.speed).toBeGreaterThan(80);
    expect(MONZA_NAMES[straight.label]).toBe('Rettifilo');
    // Somewhere in the Prima Variante the car is slow.
    let slowest = Infinity;
    for (let s = 0; s < track.length; s += 4) {
      const p = pointAt(track, s);
      if (MONZA_NAMES[p.label] === 'Prima Variante') slowest = Math.min(slowest, p.speed);
    }
    expect(slowest).toBeLessThan(50);
  });

  it('never accelerates or brakes harder than the car can', () => {
    for (let i = 0; i < track.n; i++) {
      const a = track.speed[i];
      const b = track.speed[(i + 1) % track.n];
      const acc = (b * b - a * a) / (2 * track.ds);
      expect(acc).toBeLessThanOrEqual(CAR.accel + 1e-3);
      expect(acc).toBeGreaterThanOrEqual(-CAR.brake - 1e-3);
    }
  });

  it('maps a clock onto the lap, and the lap repeats', () => {
    expect(lapPosition(track, 0).s).toBeCloseTo(0, 3);
    const half = lapPosition(track, track.lapTime / 2);
    expect(half.s).toBeGreaterThan(0);
    expect(half.s).toBeLessThan(track.length);
    expect(lapPosition(track, track.lapTime + 3).s).toBeCloseTo(lapPosition(track, 3).s, 2);
    // Further in time is further round.
    expect(lapPosition(track, 10).s).toBeGreaterThan(lapPosition(track, 5).s);
  });

  it('fades the corner names in and out at the ends of a section', () => {
    const sec = sectionOf(track, 400);
    expect(MONZA_NAMES[sec.label]).toBe('Rettifilo');
    expect(sec.length).toBeGreaterThan(800);
    expect(labelAlpha(0, 500)).toBe(0);
    expect(labelAlpha(200, 500)).toBe(1);
    expect(labelAlpha(500, 500)).toBe(0);
  });

  it('builds a field: near zero on the centre line, the speed and lap angle beside it', () => {
    const f = buildField(track, 128);
    const at = (x: number, y: number) => {
      const i = Math.floor((x - f.x0) / (f.span / f.size));
      const j = Math.floor((y - f.y0) / (f.span / f.size));
      return f.data.subarray((j * f.size + i) * 4, (j * f.size + i) * 4 + 4);
    };
    const p = pointAt(track, 500);
    const cell = at(p.x, p.y);
    expect(cell[0]).toBeLessThan(f.span / f.size);
    expect(Math.hypot(cell[1], cell[2])).toBeCloseTo(1, 3);
    expect(cell[3]).toBeGreaterThan(0.8);
    // Far from the track it says "far".
    expect(at(f.x0 + 1, f.y0 + 1)[0]).toBeGreaterThan(80);
  });
});

describe('The road ahead', () => {
  it('keeps forward distance growing and puts a straight road dead ahead', () => {
    const road = roadAhead((s) => ({ x: 0, y: s }), 0, 0, 0, Math.PI / 2, emptyRoad());
    for (let k = 1; k < ROAD_POINTS; k++) expect(road.z[k]).toBeGreaterThan(road.z[k - 1]);
    for (let k = 0; k < ROAD_POINTS; k++) {
      expect(road.x[k]).toBeCloseTo(0, 4);
      expect(road.z[k]).toBeCloseTo(aheadDistance(k), 3);
    }
    expect(roadCentreAt(road, 50)).toBeCloseTo(0, 4);
  });

  it('bends right when the road turns right, and carries on past a hairpin', () => {
    const track = monzaTrack();
    const at = (s: number) => pointAt(track, s);
    // Approaching the Parabolica, a long right-hander that turns back on itself.
    const s0 = track.length - 520;
    const cam = at(s0);
    const road = roadAhead(at, s0, cam.x, cam.y, cam.heading, emptyRoad());
    for (let k = 1; k < ROAD_POINTS; k++) expect(road.z[k]).toBeGreaterThan(road.z[k - 1]);
    expect(roadCentreAt(road, road.z[ROAD_POINTS - 1])).toBeGreaterThan(20);
  });

  it('winds the mountain road continuously across the period seam', () => {
    const a = windingAt(PERIOD - 0.5);
    const b = windingAt(PERIOD + 0.5);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(1, 1);
  });
});

describe('Feel', () => {
  it('widens the view and shakes more as speed builds, softly', () => {
    const slow = feel(10, 1.3);
    const fast = feel(90, 1.3);
    expect(fast.focal).toBeLessThan(slow.focal);
    expect(Math.abs(feel(0, 2).shakeX)).toBe(0);
    for (let t = 0; t < 5; t += 0.1) {
      expect(Math.abs(feel(90, t).shakeX)).toBeLessThan(0.006);
    }
  });

  it('accelerates through the tunnel and eases off out on the straight', () => {
    expect(tunnelSpeed(1400)).toBeGreaterThan(tunnelSpeed(100));
    expect(tunnelSpeed(PERIOD - 10)).toBeLessThan(tunnelSpeed(1600));
    expect(tunnelSpeed(0)).toBeCloseTo(tunnelSpeed(PERIOD), 6);
  });
});

describe('Triangle Stream', () => {
  it('releases the triangles in lanes, outside the body and above the road', () => {
    const st = makeStream(500, rng(3));
    for (let i = 0; i < st.n; i++) {
      expect(STREAM_SHAPE.sdf(st.x[i], st.y[i])).toBeGreaterThan(0);
      expect(st.y[i]).toBeGreaterThan(STREAM_GROUND);
    }
  });

  it('carries them left to right round the body, never through it', () => {
    const r = rng(7);
    const st = makeStream(600, r);
    const startX = Float32Array.from(st.x);
    for (let f = 0; f < 120; f++) {
      stepStream(st, 1 / 60, 1.3, f / 60, r);
      for (let i = 0; i < st.n; i++) {
        expect(STREAM_SHAPE.sdf(st.x[i], st.y[i])).toBeGreaterThan(-0.01);
        expect(st.y[i]).toBeGreaterThanOrEqual(STREAM_GROUND);
        expect(Math.abs(st.x[i])).toBeLessThanOrEqual(STREAM_X + 0.25);
      }
    }
    // Most moved downstream (or wrapped round to the left again).
    let moved = 0;
    for (let i = 0; i < st.n; i++) if (st.x[i] !== startX[i]) moved++;
    expect(moved).toBe(st.n);
  });

  it('splits at the nose: air just ahead of it turns up or down', () => {
    const r = rng(11);
    const st = makeStream(1, r);
    // Just ahead of the nose, at its height.
    st.x[0] = -1.28;
    st.y[0] = -0.05;
    for (let f = 0; f < 30; f++) stepStream(st, 1 / 60, 1.3, 0, r);
    expect(Math.abs(st.vy[0])).toBeGreaterThan(0.05);
  });

  it('colours slow air deep red and fast air hot orange', () => {
    const slow = streamColour(0.2);
    const fast = streamColour(2);
    expect(slow[0]).toBeGreaterThan(slow[1] * 5);
    expect(fast[1]).toBeGreaterThan(slow[1]);
    expect(streamColour(1)[0]).toBeGreaterThan(0.9);
  });
});
