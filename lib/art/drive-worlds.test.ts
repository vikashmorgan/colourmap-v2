import { describe, expect, it } from 'vitest';

import { WORLDS } from './drive-design';
import { WORLD_CFG } from './drive-worlds';
import {
  CHINA_AVENUE,
  CHINA_LANE,
  CHINATOWN,
  chinatownHalf,
  frameAt,
  makeTrackWorld,
  NEON_TRACK,
  NIGHT,
  pointAt,
  project,
} from './track';
import { newVehicle, stepVehicle } from './vehicle';

describe('world settings', () => {
  it('sets up every world in the picker', () => {
    for (const w of WORLDS) {
      const c = WORLD_CFG[w.id];
      expect(c.id).toBe(w.id);
      expect(c.dust).toHaveLength(3);
    }
    expect(WORLD_CFG.salt.track).toBeNull();
    expect(WORLD_CFG.salt.race).toBe('mile');
    expect(WORLD_CFG.canyon.race).toBe('canyon');
  });

  it('makes the three night tracks wet, each with its own theme', () => {
    expect(WORLD_CFG.night.theme).toBe('rain');
    expect(WORLD_CFG.chinatown.theme).toBe('chinatown');
    expect(WORLD_CFG.neon.theme).toBe('neon');
    for (const id of ['night', 'chinatown', 'neon'] as const) expect(WORLD_CFG[id].wet).toBe(true);
    for (const id of ['salt', 'coast', 'canyon'] as const) expect(WORLD_CFG[id].theme).toBeNull();
  });
});

describe('the night tracks', () => {
  it('open Chinatown from narrow lanes onto wide avenues', () => {
    const halves = Array.from({ length: 200 }, (_, i) => chinatownHalf(i * 10));
    expect(Math.min(...halves)).toBeCloseTo(CHINA_LANE, 1);
    expect(Math.max(...halves)).toBeCloseTo(CHINA_AVENUE, 1);
  });

  it('bank their bends and lift you over crests', () => {
    for (const def of [NIGHT, CHINATOWN, NEON_TRACK]) {
      const w = makeTrackWorld(def);
      let maxBank = 0;
      let rise = 0;
      for (let s = 0; s < 1800; s += 10) {
        const l = pointAt(w.track, s, 4);
        const r = pointAt(w.track, s, -4);
        maxBank = Math.max(maxBank, Math.abs(w.ground(l.x, l.y).h - w.ground(r.x, r.y).h));
        rise = Math.max(rise, def.elev(s) - def.elev(0));
      }
      expect(maxBank).toBeGreaterThan(1);
      expect(rise).toBeGreaterThan(2);
    }
  });

  it('keep you off the towers: driving hard at the edge, the barrier holds', () => {
    const w = makeTrackWorld(NIGHT);
    const s = 300;
    const p = pointAt(w.track, s, 0);
    const h = frameAt(w.track, s).h + 1.2;
    const v = newVehicle('car', p.x, p.y, h, w.ground(p.x, p.y).h);
    v.vx = Math.cos(h) * 60;
    v.vy = Math.sin(h) * 60;
    for (let i = 0; i < 120; i++)
      stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, w, i / 60);
    const q = project(w.track, v.x, v.y, s);
    expect(Math.abs(q.u)).toBeLessThan(NIGHT.half(q.s) + 2);
  });
});
