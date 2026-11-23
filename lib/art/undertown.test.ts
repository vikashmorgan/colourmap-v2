import { describe, expect, it } from 'vitest';

import { clearOfFlip, piecesBetween } from './night-course';
import {
  CHINATOWN,
  collideTrack,
  edgesOpen,
  frameAt,
  heightAt,
  makeTrackWorld,
  project,
  twistPose,
} from './track';
import {
  inUndertown,
  onUnderside,
  UNDER,
  UNDER_COLOURS,
  UNDER_LENGTH,
  underDepth,
  underLocal,
  underSpan,
  underTint,
  underTwist,
  underWall,
} from './undertown';
import { newVehicle, stepVehicle } from './vehicle';
import { choosesStraight, nearTwist, offTwist, twistEntry } from './wreck';

const first = UNDER.AT;
const mid = first + UNDER.FLIP + UNDER.HOLD / 2;

describe('where Undertown runs (2026-11-23)', () => {
  it('comes round every UNDER.EVERY m from UNDER.AT, flip in, underside, flip out', () => {
    expect(underLocal(first - 1)).toBeNull();
    expect(underLocal(first + 10)).toBe(10);
    expect(underLocal(first + UNDER_LENGTH + 1)).toBeNull();
    expect(underLocal(first + UNDER.EVERY + 10)).toBe(10);
    expect(underLocal(Number.NaN)).toBeNull();
    expect(underSpan(mid)).toEqual({ from: first, to: first + UNDER_LENGTH });
    expect(underSpan(first - 5)).toBeNull();
    expect(UNDER_LENGTH).toBeLessThan(UNDER.EVERY);
  });

  it('rolls over the edge to π, holds upside down, and rolls on the same way to 2π', () => {
    expect(underTwist(first - 1)).toBe(0);
    expect(underTwist(first)).toBe(0);
    expect(underTwist(first + UNDER.FLIP / 2)).toBeCloseTo(Math.PI / 2, 6);
    expect(underTwist(mid)).toBe(Math.PI);
    expect(underTwist(first + UNDER_LENGTH - 0.01)).toBeCloseTo(Math.PI * 2, 3);
    expect(underTwist(first + UNDER_LENGTH + 1)).toBe(0);
    // Smooth and one way: never back, never a jump.
    let prev = 0;
    for (let s = first; s < first + UNDER_LENGTH; s += 0.5) {
      const th = underTwist(s);
      expect(th).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(th - prev).toBeLessThan(0.02);
      prev = th;
    }
  });

  it('names Undertown past halfway over, and puts its pieces only on the flat underside', () => {
    expect(underDepth(first - 1)).toBe(0);
    expect(underDepth(mid)).toBeCloseTo(1, 9);
    expect(inUndertown(first + UNDER.FLIP * 0.4)).toBe(false);
    expect(inUndertown(first + UNDER.FLIP * 0.6)).toBe(true);
    expect(inUndertown(first + UNDER_LENGTH - UNDER.FLIP * 0.4)).toBe(false);
    expect(onUnderside(first + UNDER.FLIP - 1)).toBe(false);
    expect(onUnderside(first + UNDER.FLIP)).toBe(true);
    expect(onUnderside(first + UNDER.FLIP + UNDER.HOLD)).toBe(false);
  });

  it('closes the barriers in to the ribbon’s edge, easing in and out', () => {
    expect(underWall(first - 1, 12, 10)).toBe(12);
    expect(underWall(mid, 12, 10)).toBeCloseTo(10 + UNDER.EDGE, 9);
    const part = underWall(first + UNDER.EASE / 2, 12, 10);
    expect(part).toBeLessThan(12);
    expect(part).toBeGreaterThan(10 + UNDER.EDGE);
    expect(underWall(first + UNDER_LENGTH - 1, 12, 10)).toBeGreaterThan(11.9);
  });

  it('tints the road plum in the middle and crimson at the edges, by how far over it is', () => {
    const grey: [number, number, number] = [0.1, 0.1, 0.1];
    expect(underTint(grey, 0, 0)).toEqual(grey);
    const centre = underTint(grey, 0, 1);
    centre.forEach((v, i) => {
      expect(v).toBeCloseTo(UNDER_COLOURS.asphalt[i], 9);
    });
    const edge = underTint(grey, 1, 1);
    edge.forEach((v, i) => {
      expect(v).toBeCloseTo(UNDER_COLOURS.edge[i], 9);
    });
    expect(underTint(grey, 0, 2)).toEqual(centre);
  });
});

describe('Undertown on Chinatown Run', () => {
  const world = makeTrackWorld(CHINATOWN);
  const tr = world.track;

  it('draws you upside down, mirrored, on the road’s underside high over the street', () => {
    const f = frameAt(tr, mid);
    const p = twistPose(tr, mid, 0, 1);
    const surf = heightAt(tr, mid, 0, true) - f.e;
    expect(p.up[2]).toBeCloseTo(-1, 6);
    expect(p.roll).toBeCloseTo(-Math.PI, 6);
    expect(p.z - f.e).toBeCloseTo(2 * UNDER.AXIS - surf - 1, 6);
    // Your left is drawn on the road's right.
    const left = twistPose(tr, mid, 5, 0);
    const q = project(tr, left.x, left.y, mid);
    expect(q.u).toBeCloseTo(-5, 1);
    // Off Undertown the road is the plain road.
    expect(twistPose(tr, first - 20, 3, 0).th).toBe(0);
  });

  it('keeps its barriers: no open edges, no wreck, no straight road through', () => {
    expect(CHINATOWN.under?.(mid)).toBe(true);
    expect(edgesOpen(CHINATOWN, mid)).toBe(false);
    expect(offTwist(tr, mid, CHINATOWN.half(mid) + 5)).toBe(false);
    expect(twistEntry(CHINATOWN, first + 0.5)).toBeNull();
    expect(choosesStraight(CHINATOWN, first + 0.5, 0)).toBe(false);
    expect(nearTwist(CHINATOWN, first - 50)).toBe(false);
    // A car pressed against the edge on the underside is held there.
    const f = frameAt(tr, mid);
    const u = CHINATOWN.half(mid) + 0.5;
    const v = newVehicle(
      'car',
      f.x - Math.sin(f.h) * u,
      f.y + Math.cos(f.h) * u,
      f.h,
      heightAt(tr, mid, u),
    );
    tr.hint = mid;
    expect(collideTrack(world, v)).not.toBeNull();
  });

  it('carries a car through, steering hard, never off the ribbon', () => {
    const w = makeTrackWorld(CHINATOWN);
    const start = first - 150;
    const f = frameAt(w.track, start);
    const v = newVehicle('car', f.x, f.y, f.h, heightAt(w.track, start, 0));
    v.vx = Math.cos(f.h) * 45;
    v.vy = Math.sin(f.h) * 45;
    w.track.hint = start;
    let worst = -99;
    let under = 0;
    for (let i = 0; i < 60 * 25; i++) {
      const t = i / 60;
      stepVehicle(
        v,
        { throttle: 1, steer: Math.floor(t / 0.9) % 2 ? 1 : -1, boost: 0 },
        1 / 60,
        w,
        t,
      );
      const { s, u } = project(w.track, v.x, v.y);
      w.track.hint = s;
      if (onUnderside(s)) {
        under++;
        worst = Math.max(worst, Math.abs(u) - CHINATOWN.half(s));
        expect(offTwist(w.track, s, u)).toBe(false);
      }
    }
    expect(under).toBeGreaterThan(60);
    // The car's middle stays over the ribbon (its barrier is UNDER.EDGE past the edge).
    expect(worst).toBeLessThan(UNDER.EDGE);
  });

  it('clears the street where the road flips, keeps it where it runs over upside down', () => {
    const inFlip = first + UNDER.FLIP / 2;
    expect(clearOfFlip(CHINATOWN, { s: inFlip, u: 0, d: 1 })).toBe(false);
    expect(clearOfFlip(CHINATOWN, { s: inFlip, u: 14, d: 4 })).toBe(false);
    expect(clearOfFlip(CHINATOWN, { s: inFlip, u: UNDER.AXIS + 8, d: 4 })).toBe(true);
    expect(clearOfFlip(CHINATOWN, { s: mid, u: 0, d: 1 })).toBe(true);
    expect(clearOfFlip(CHINATOWN, { s: first - 200, u: 0, d: 1 })).toBe(true);
    const pieces = piecesBetween('chinatown', CHINATOWN, first, first + UNDER.FLIP);
    for (const p of pieces) expect(clearOfFlip(CHINATOWN, p)).toBe(true);
    const all = piecesBetween('chinatown', CHINATOWN, mid - 100, mid + 100);
    expect(all.some((p) => p.kind === 'lanterns')).toBe(true);
  });
});
