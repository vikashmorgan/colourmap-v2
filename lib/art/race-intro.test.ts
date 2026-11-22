import { describe, expect, it } from 'vitest';

import {
  BEAT,
  FLY,
  FLY_HIGH,
  GO_HOLD,
  GRID,
  introPhase,
  lightsAt,
  newIntro,
  plainShot,
  racing,
  trackShot,
} from './race-intro';
import { GOLDEN, heightAt, makeTrack, pointAt } from './track';

const at = (t: number, launchedAt: number | null = null) => ({ t, launchedAt, skipFly: false });

describe('the race intro’s timeline', () => {
  it('flies, comes down to the grid, then waits for the click', () => {
    expect(introPhase(at(0))?.phase).toBe('fly');
    expect(introPhase(at(FLY / 2))).toEqual({ phase: 'fly', k: 0.5 });
    expect(introPhase(at(FLY + GRID / 2))?.phase).toBe('grid');
    expect(introPhase(at(FLY + GRID + 30))?.phase).toBe('ready');
  });

  it('skips the flyover on a restart', () => {
    expect(introPhase(newIntro(true))?.phase).toBe('grid');
    expect(introPhase(newIntro())?.phase).toBe('fly');
  });

  it('counts three lights after the click, then GO, then hands over', () => {
    const t0 = 10;
    expect(lightsAt(at(t0, t0))).toEqual({ lit: 1, go: false });
    expect(lightsAt(at(t0 + BEAT * 1.5, t0))).toEqual({ lit: 2, go: false });
    expect(lightsAt(at(t0 + BEAT * 2.5, t0))).toEqual({ lit: 3, go: false });
    expect(racing(at(t0 + BEAT * 2.9, t0))).toBe(false);
    expect(lightsAt(at(t0 + BEAT * 3, t0))).toEqual({ lit: 3, go: true });
    expect(racing(at(t0 + BEAT * 3, t0))).toBe(true);
    expect(introPhase(at(t0 + BEAT, t0))?.phase).toBe('count');
    expect(introPhase(at(t0 + BEAT * 3 + 0.1, t0))?.phase).toBe('go');
    expect(introPhase(at(t0 + BEAT * 3 + GO_HOLD + 0.01, t0))).toBeNull();
    expect(lightsAt(at(5))).toEqual({ lit: 0, go: false });
  });
});

describe('the intro’s camera', () => {
  const track = makeTrack(GOLDEN);
  const start = 40;

  it('flies high over the road ahead, looking along it', () => {
    for (const k of [0, 0.5, 1]) {
      const { cam, look } = trackShot(track, start, 'fly', k);
      expect(cam.z - heightAt(track, start, 0)).toBeGreaterThan(FLY_HIGH * 0.6);
      expect(cam.z).toBeGreaterThan(look.z + 30);
      expect(Number.isFinite(look.x + look.y)).toBe(true);
    }
  });

  it('comes down behind the grid to the racers’ height, looking up the road over them', () => {
    const top = trackShot(track, start, 'grid', 0);
    const end = trackShot(track, start, 'grid', 1);
    expect(top.cam.z).toBeGreaterThan(end.cam.z + 15);
    const ground = heightAt(track, start, 0);
    expect(end.cam.z - ground).toBeCloseTo(3.2, 5);
    // Behind the start line, looking past it.
    const line = pointAt(track, start, 0);
    const dCam = Math.hypot(end.cam.x - line.x, end.cam.y - line.y);
    expect(dCam).toBeGreaterThan(12);
    expect(dCam).toBeLessThan(20);
    expect(trackShot(track, start, 'ready', 0)).toEqual(end);
  });

  it('keeps going straight back from the start when the grid is near the road’s beginning', () => {
    const { cam } = trackShot(track, 0, 'grid', 0);
    expect(cam.x).toBeLessThan(-50);
  });

  it('circles the vehicle on the plains, ending low behind it', () => {
    const v = { x: 10, y: 20, z: 0, h: 0 };
    const end = plainShot(v, 'ready', 0);
    expect(end.cam.x).toBeLessThan(v.x);
    expect(end.cam.z).toBeCloseTo(2.4, 5);
    expect(plainShot(v, 'fly', 0).cam.z).toBeGreaterThan(30);
  });
});
