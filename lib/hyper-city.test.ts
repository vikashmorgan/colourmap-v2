import { describe, expect, it } from 'vitest';
import type { Particle } from './bigbang';
import { type FarCopy, tileCopies } from './far-layer';
import {
  AVENUE,
  EYE_Y,
  FOV_PUSH,
  FOV_REST,
  HYPER_FAR,
  hueAt,
  hyperCamera,
  hyperCity,
  hyperStrip,
  MAX_H,
  makeParticles,
  pieceAt,
  rng,
  SPEED,
  STREAK_GRAINS,
  STRIP_LEN,
  STRIPS,
  TILE_X,
  TILE_Z,
  turnHue,
} from './hyper-city';

describe('the generator', () => {
  it('is deterministic per seed', () => {
    const a = hyperStrip(42);
    const b = hyperStrip(42);
    expect(a.positions).toEqual(b.positions);
    expect(a.colours).toEqual(b.colours);
    expect(rng(3)()).toBe(rng(3)());
  });

  it('differs across seeds', () => {
    expect(hyperStrip(1).positions).not.toEqual(hyperStrip(2).positions);
    expect(Array.from(hyperCity(11).positions)).not.toEqual(Array.from(hyperCity(12).positions));
  });

  it('gives each strip of the tile its own city', () => {
    const c = hyperCity(5);
    expect(c.cuts).toHaveLength(STRIPS);
    const len = (s: number) => (c.cuts[s + 1] ?? c.positions.length / 3) - (c.cuts[s] as number);
    const lens = Array.from({ length: STRIPS }, (_, s) => len(s));
    expect(new Set(lens).size).toBeGreaterThan(1);
  });

  it('is built once per seed', () => {
    expect(hyperCity(9)).toBe(hyperCity(9));
  });

  it('keeps every point within the tile, each strip within its span', () => {
    const c = hyperCity(7);
    expect(c.tile).toEqual([TILE_X, TILE_Z]);
    const n = c.positions.length / 3;
    expect(c.colours.length).toBe(c.positions.length);
    expect(n).toBeGreaterThan(10000);
    expect(n).toBeLessThan(80000);
    let s = 0;
    let bad = 0;
    for (let i = 0; i < n; i++) {
      while (s + 1 < STRIPS && i >= (c.cuts[s + 1] as number)) s++;
      const x = c.positions[i * 3] as number;
      const y = c.positions[i * 3 + 1] as number;
      const z = c.positions[i * 3 + 2] as number;
      const [z0, z1] = c.spans[s] as [number, number];
      if (Math.abs(x) > TILE_X / 2 || y < 0 || y > MAX_H || z < z0 || z >= z1) bad++;
      if (z1 - z0 !== STRIP_LEN) bad++;
    }
    expect(bad).toBe(0);
  });

  it('leaves the avenue open above the street, so the straight line meets nothing', () => {
    const c = hyperCity(7);
    let inside = 0;
    for (let i = 0; i < c.positions.length / 3; i++) {
      const x = c.positions[i * 3] as number;
      const y = c.positions[i * 3 + 1] as number;
      if (Math.abs(x) < AVENUE && y >= 1) inside++;
    }
    expect(inside).toBe(0);
  });
});

describe('the autopilot', () => {
  it('flies a straight line at a constant high speed', () => {
    const at = (s: number) => hyperCamera(0, s);
    const dt = 0.25;
    for (const s of [0, 1, 7.5, 60, 300]) {
      const a = at(s);
      const b = at(s + dt);
      // Down the avenue's middle, at one height, only z changing.
      expect(a.eye[0]).toBe(0);
      expect(b.eye[0]).toBe(0);
      expect(a.eye[1]).toBe(EYE_Y);
      expect(b.eye[1]).toBe(EYE_Y);
      expect((a.eye[2] - b.eye[2]) / dt).toBeCloseTo(SPEED, 6);
      // Looking straight ahead along the line, a little down.
      expect(a.target[0]).toBe(0);
      expect(a.target[2]).toBeLessThan(a.eye[2]);
      expect(a.target[1]).toBeLessThan(a.eye[1]);
    }
    expect(SPEED).toBeGreaterThanOrEqual(300);
  });

  it('pushes the field wide once under way, then holds it', () => {
    expect(hyperCamera(0, 0).fov).toBe(FOV_REST);
    expect(hyperCamera(0, 10).fov).toBe(FOV_PUSH);
    expect(hyperCamera(0, 200).fov).toBe(FOV_PUSH);
  });
});

describe('colour', () => {
  it('drifts slowly with distance flown, never jumping', () => {
    let last = hueAt([0, EYE_Y, 0]);
    let worst = 0;
    for (let s = 1 / 60; s < 30; s += 1 / 60) {
      const h = hueAt([0, EYE_Y, -SPEED * s]);
      worst = Math.max(worst, Math.abs(h - last));
      last = h;
    }
    // Under a degree a frame.
    expect(worst).toBeLessThan(Math.PI / 180);
  });

  it('turns a colour round the grey axis, keeping grey grey', () => {
    for (const v of turnHue([0.5, 0.5, 0.5], 1.3)) expect(v).toBeCloseTo(0.5, 6);
    expect(turnHue([1, 0, 0], (2 * Math.PI) / 3)[1]).toBeCloseTo(1, 6);
  });
});

describe('the far layer', () => {
  it('shows on every step, from just past the eye out to the horizon', () => {
    expect(HYPER_FAR.everyStep).toBe(true);
    expect(HYPER_FAR.shown([0, 0, 0])).toBe(1);
    expect(HYPER_FAR.near([0, 0, 0])).toBeLessThan(HYPER_FAR.far([0, 0, 0]));
    expect(HYPER_FAR.build()).toBe(HYPER_FAR.build());
  });

  it('places copies far down the avenue, receding to the horizon', () => {
    const cloud = HYPER_FAR.build();
    const eye = hyperCamera(0, 40).eye;
    const out: FarCopy[] = [];
    const n = tileCopies(eye, 36, 2400, cloud.tile, cloud.spans, out);
    expect(n).toBeGreaterThan(20);
    const furthest = Math.min(...out.slice(0, n).map((c) => c.oz));
    expect(eye[2] - furthest).toBeGreaterThan(1500);
  });
});

describe('the grains', () => {
  const ps = makeParticles(STREAK_GRAINS + 400);

  it('streak past clear of the eye, their colours sound', () => {
    let bad = 0;
    for (const p of ps.slice(0, STREAK_GRAINS)) {
      const a = pieceAt(p, 0, 10);
      if (Math.abs(a.pos[0]) < 6) bad++;
      if (a.rgb.some((v) => !Number.isFinite(v) || v < 0)) bad++;
    }
    expect(bad).toBe(0);
  });

  it('carry the city ahead of the eye beyond the streaks (a phone)', () => {
    const s = 20;
    const eye = hyperCamera(0, s).eye;
    let bad = 0;
    for (const p of ps.slice(STREAK_GRAINS) as Particle[]) {
      const a = pieceAt(p, 0, s);
      if (a.pos[2] > eye[2] || a.pos[2] <= eye[2] - 2 * STRIP_LEN) bad++;
      if (Math.abs(a.pos[0]) > TILE_X * 1.5) bad++;
    }
    expect(bad).toBe(0);
  });
});
