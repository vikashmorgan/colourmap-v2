import { describe, expect, it } from 'vitest';

import { aimLane, autopilotControls, forkPick } from './autopilot';
import {
  BALCONY,
  BALCONY_LENGTH,
  balcony,
  balconyAtCrest,
  balconyLocal,
  forkNose,
  kickAt,
  LOWER,
  LOWER_FROM,
  LOWER_TO,
  PATH_SIGNS,
  pathMedian,
  pickFor,
  runStart,
  underpass,
  underpassDepth,
} from './chinatown-paths';
import { CT_PATH_CELLS } from './chinatown-street';
import { piecesBetween } from './night-course';
import { RIVALS, rivalPick } from './rivals';
import {
  belowStreet,
  CHINA_AVENUE,
  CHINA_BANK,
  CHINA_LANE,
  CHINA_LEVEL,
  CHINATOWN,
  chinatownHalf,
  collideTrack,
  frameAt,
  groundAt,
  heightAt,
  LOWER_RAIL,
  LOWER_SLAB,
  lowerCeiling,
  lowerFloor,
  lowerOpen,
  makeTrackWorld,
  medianAt,
  onBalcony,
  project,
  twistPose,
} from './track';
import { UNDER, UNDER_LENGTH, underLocal } from './undertown';
import { newVehicle, stepVehicle, type Vehicle } from './vehicle';

const first = UNDER.AT;
/** The first crest with a balcony road. */
const crest = (() => {
  for (let n = 0; n < 20; n++) if (balconyAtCrest(n)) return n * BALCONY.PERIOD + BALCONY.CREST;
  return -1;
})();

function carAt(w: ReturnType<typeof makeTrackWorld>, s: number, u: number, speed: number): Vehicle {
  const f = frameAt(w.track, s);
  const v = newVehicle(
    'car',
    f.x - Math.sin(f.h) * u,
    f.y + Math.cos(f.h) * u,
    f.h,
    heightAt(w.track, s, u),
  );
  v.vx = Math.cos(f.h) * speed;
  v.vy = Math.sin(f.h) * speed;
  w.track.hint = s;
  return v;
}

describe('the underpass, the way under Undertown (2026-11-24: "below the road of the main chinatown")', () => {
  const lane = (s: number) => underpass(s) ?? Number.NaN;

  it('peels off right, goes down, swings in under the road, then out, up and back', () => {
    for (const k of [0, 1, 3]) {
      const at = first + k * UNDER.EVERY;
      expect(underpass(at + LOWER_FROM - 1)).toBeNull();
      expect(underpass(at + LOWER_FROM + 1)).toBeCloseTo(0, 0);
      expect(underpassDepth(at + LOWER_FROM + 1)).toBe(0);
      // Out right and still level until the median has formed; then down.
      expect(lane(at + LOWER.PEEL[1])).toBeCloseTo(-LOWER.OUT, 6);
      expect(underpassDepth(at + LOWER.DIVE[0])).toBe(0);
      // Down and under the road from before the flip until well into the underside.
      for (let s = at + LOWER.IN[1]; s <= at + LOWER.BACK[0]; s += 10) {
        expect(lane(s)).toBeCloseTo(LOWER.UNDER_C, 6);
        expect(underpassDepth(s)).toBeCloseTo(LOWER.DEPTH, 6);
      }
      // Out again before the ribbon comes back down, up before the median ends, then merged.
      expect(lane(at + UNDER_LENGTH - UNDER.FLIP)).toBeLessThan(-LOWER.OUT + 4);
      expect(underpassDepth(at + LOWER.CLIMB[1])).toBe(0);
      expect(underpass(at + LOWER_TO + 1)).toBeNull();
    }
    expect(underpass(Number.NaN)).toBeNull();
    expect(underpass(first + LOWER_TO + 200)).toBeNull();
  });

  it('is a second track, nearly as wide as the avenues, and crosses under the road', () => {
    expect(LOWER.LANE * 2).toBeGreaterThanOrEqual(CHINA_AVENUE * 2 - 4);
    const under = first + 300;
    const half = chinatownHalf(under);
    // Most of its width lies under the road's footprint, its far kerb short of the left edge.
    expect(LOWER.UNDER_C + LOWER.LANE).toBeGreaterThan(0);
    expect(LOWER.UNDER_C + LOWER.LANE + LOWER.KERB).toBeLessThanOrEqual(CHINA_LANE);
    expect(Math.abs(LOWER.UNDER_C)).toBeLessThan(half);
  });

  it('dives and climbs gently enough at full boost, and swings across smoothly', () => {
    const fast = 125;
    let steep = 0;
    let bend = 0;
    let side = 0;
    for (let s = first + LOWER_FROM + 2; s < first + LOWER_TO - 2; s += 1) {
      const d0 = underpassDepth(s - 1);
      const d1 = underpassDepth(s);
      const d2 = underpassDepth(s + 1);
      steep = Math.max(steep, Math.abs(d2 - d0) / 2);
      bend = Math.max(bend, Math.abs(d2 - 2 * d1 + d0));
      side = Math.max(side, Math.abs(lane(s + 1) - 2 * lane(s) + lane(s - 1)));
    }
    expect(steep).toBeLessThan(0.08);
    // Over the brow you are never thrown off: the curve asks less than gravity gives.
    expect(bend * fast * fast).toBeLessThan(9.81);
    expect(side).toBeLessThan(0.004);
  });

  it('is walled apart by the median before it goes down and until it is back up', () => {
    expect(pathMedian(null, 10)).toBeNull();
    expect(pathMedian(-10, 10)).toBeNull();
    expect(pathMedian(-LOWER.OUT, 10)).toBeCloseTo((-LOWER.OUT + LOWER.LANE - 10) / 2, 9);
    for (const k of [0, 1, 2, 3, 4]) {
      const at = first + k * UNDER.EVERY;
      for (const s of [at + LOWER.DIVE[0], at + LOWER.CLIMB[1]])
        expect(pathMedian(underpass(s), chinatownHalf(s))).not.toBeNull();
    }
    const half = chinatownHalf(first - 900);
    const nose = forkNose(first, half);
    expect(nose).toBeGreaterThan(first + LOWER_FROM);
    expect(nose).toBeLessThan(first + LOWER.DIVE[0]);
    const t = makeTrackWorld(CHINATOWN).track;
    expect(medianAt(t, nose - 3)).toBeNull();
    expect(medianAt(t, nose + 3)).not.toBeNull();
  });

  it('keeps clear of the ribbon as it flips over it, in and out', () => {
    const w = makeTrackWorld(CHINATOWN);
    let checked = 0;
    for (const [a, b] of [
      [first, first + UNDER.FLIP],
      [first + UNDER_LENGTH - UNDER.FLIP, first + UNDER_LENGTH],
    ]) {
      for (let s = a; s <= b; s += 4) {
        const half = chinatownHalf(s);
        for (let u = -half; u <= half; u += 1) {
          const p = twistPose(w.track, s, u, 0);
          const q = project(w.track, p.x, p.y, s);
          const c = underpass(q.s);
          if (c === null || Math.abs(q.u - c) > LOWER.LANE + LOWER.KERB) continue;
          checked++;
          expect(p.z - lowerFloor(CHINATOWN, q.s)).toBeGreaterThan(6);
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('gives two surfaces under the road, picked by height; beside it, the void', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s = first + 400;
    const c = lane(s);
    const f = frameAt(w.track, s);
    const x = f.x - Math.sin(f.h) * c;
    const y = f.y + Math.cos(f.h) * c;
    const floor = lowerFloor(CHINATOWN, s);
    expect(floor).toBeCloseTo(-LOWER.DEPTH, 6);
    const street = heightAt(w.track, s, c);
    expect(street - floor).toBeGreaterThan(LOWER.DEPTH - 4);
    // Up on the street: the street.
    w.track.hint = s;
    const top = groundAt(w.track, x, y, street + 0.4);
    expect(top.h).toBeCloseTo(street, 6);
    expect(belowStreet(w.track, s, c, street + 0.4)).toBe(false);
    // Down below: the floor, flat, its track holding you.
    w.track.hint = s;
    const low = groundAt(w.track, x, y, floor + 0.4);
    expect(low.h).toBeCloseTo(floor, 6);
    expect(low.road?.half).toBe(LOWER.LANE);
    expect(Math.abs(low.road?.u ?? 9)).toBeLessThan(0.5);
    expect(low.rough).toBe(0);
    expect(belowStreet(w.track, s, c, floor + 0.4)).toBe(true);
    // Without a height the street is what is on top; beside the road it is the void's floor.
    expect(heightAt(w.track, s, c)).toBeCloseTo(street, 9);
    const by = first - 600;
    expect(heightAt(w.track, by, lane(by))).toBeCloseTo(lowerFloor(CHINATOWN, by), 9);
    expect(heightAt(w.track, by, -chinatownHalf(by) - 3)).toBeCloseTo(lowerFloor(CHINATOWN, by), 9);
    // The deck roofs it before the flip; the flip lifts it off.
    expect(lowerCeiling(w.track, first - 100, lane(first - 100))).not.toBeNull();
    expect(lowerCeiling(w.track, s, c)).toBeNull();
    expect(lowerOpen(CHINATOWN, s, c)).toBe(true);
    expect(lowerOpen(CHINATOWN, first - 100, lane(first - 100))).toBe(false);
  });

  it('a car bearing right drives down, under the road and the flip, and back up onto it', () => {
    const w = makeTrackWorld(CHINATOWN);
    const v = carAt(w, first + LOWER_FROM - 100, 0, 60);
    let below = 0;
    let underRoad = 0;
    let flew = 0;
    let lowest = 0;
    for (let i = 0; i < 60 * 60; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      const c = autopilotControls(v, w.track, s, t, false, 0, { bypass: true, balcony: false });
      // Flat out, boosting where the autopilot would.
      stepVehicle(v, { ...c, throttle: 1 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      const x = q.s - first;
      if (x > LOWER.DIVE[1] && x < LOWER.CLIMB[0]) {
        // Down on the floor all the way, never up on the street nor on the ribbon.
        expect(belowStreet(w.track, q.s, q.u, v.z)).toBe(true);
        expect(Math.abs(v.z - lowerFloor(CHINATOWN, q.s))).toBeLessThan(1.5);
        below++;
        if (Math.abs(q.u) < chinatownHalf(q.s)) underRoad++;
      }
      if (x > LOWER.DIVE[0] - 100 && x < LOWER.CLIMB[1] + 100 && v.air) flew++;
      lowest = Math.min(lowest, v.z);
      if (x > LOWER_TO + 200) break;
    }
    // About 1,250 m down on the floor, 800 of them under the road, at up to 100 m/s.
    expect(below).toBeGreaterThan(60 * 12);
    expect(underRoad).toBeGreaterThan(60 * 7);
    expect(flew).toBeLessThan(10);
    expect(lowest).toBeGreaterThan(-LOWER.DEPTH - 1);
    const end = project(w.track, v.x, v.y);
    expect(end.s).toBeGreaterThan(first + LOWER_TO + 150);
    expect(Math.abs(end.u)).toBeLessThan(CHINATOWN.half(end.s));
    expect(v.z).toBeGreaterThan(heightAt(w.track, end.s, end.u) - 0.5);
  });

  it('a car keeping left flips into Undertown over the underpass, never dropping into it', () => {
    const w = makeTrackWorld(CHINATOWN);
    const v = carAt(w, first + LOWER_FROM - 100, 3, 50);
    let under = 0;
    for (let i = 0; i < 60 * 45; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      // Hard right all the way through Undertown: the barriers keep you on the ribbon.
      const steer = s > first + 20 ? -1 : 0;
      const c = autopilotControls(v, w.track, s, t, false, 3, { bypass: false, balcony: false });
      stepVehicle(v, { ...c, steer: steer || c.steer, throttle: 0.7, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      expect(belowStreet(w.track, q.s, q.u, v.z)).toBe(false);
      if (underLocal(q.s) !== null && underLocal(q.s)! > UNDER.FLIP) {
        under++;
        expect(Math.abs(q.u)).toBeLessThan(CHINATOWN.half(q.s) + 1);
      }
      if (q.s > first + UNDER_LENGTH) break;
    }
    expect(under).toBeGreaterThan(60 * 5);
  });

  it('a car on the street over the underpass stays on top, held off the void by the rail', () => {
    const w = makeTrackWorld(CHINATOWN);
    // Over the deck before the flip, right over the track below, steering hard right at the edge.
    const s0 = first - 200;
    const v = carAt(w, s0, lane(s0), 45);
    for (let i = 0; i < 60 * 4; i++) {
      const t = i / 60;
      stepVehicle(v, { throttle: 0.6, steer: -0.6, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      expect(v.z).toBeGreaterThan(lowerFloor(CHINATOWN, q.s) + 6);
      expect(belowStreet(w.track, q.s, q.u, v.z)).toBe(false);
      expect(q.u).toBeGreaterThan(-chinatownHalf(q.s) - LOWER_RAIL - 0.1);
    }
  });

  it('walls a car below between the track’s kerbs, and one on top at the street’s edge', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s = first + 400;
    const c = lane(s);
    const floor = lowerFloor(CHINATOWN, s);
    const low = carAt(w, s, c + LOWER.LANE + 0.5, 30);
    low.z = floor;
    const hit = collideTrack(w, low);
    expect(hit).not.toBeNull();
    const f = frameAt(w.track, s);
    // Pushed right (toward -u).
    expect((hit?.nx ?? 0) * -Math.sin(f.h) + (hit?.ny ?? 0) * Math.cos(f.h)).toBeLessThan(0);
    const mid = carAt(w, s, c, 30);
    mid.z = floor;
    expect(collideTrack(w, mid)).toBeNull();
    const by = first - 600;
    const edge = carAt(w, by, -chinatownHalf(by) + 0.2, 30);
    const push = collideTrack(w, edge);
    expect(push).not.toBeNull();
    const g = frameAt(w.track, by);
    expect((push?.nx ?? 0) * -Math.sin(g.h) + (push?.ny ?? 0) * Math.cos(g.h)).toBeGreaterThan(0);
  });

  it('a car against the median before the dive is pushed back to its own side', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s = first + LOWER.DIVE[0] - 5;
    const mid = medianAt(w.track, s) ?? 0;
    const road = collideTrack(w, carAt(w, s, mid + 0.5, 30));
    const onLane = collideTrack(w, carAt(w, s, mid - 0.5, 30));
    expect(road).not.toBeNull();
    expect(onLane).not.toBeNull();
    expect((road?.nx ?? 0) * (onLane?.nx ?? 0) + (road?.ny ?? 0) * (onLane?.ny ?? 0)).toBeLessThan(
      0,
    );
  });
});

describe('the balcony road (2026-11-24: "a side track above the first floor of the buildings")', () => {
  it('stands at the crests clear of Undertown, several in every 18 km', () => {
    expect(crest).toBeGreaterThan(0);
    let n = 0;
    for (let k = 0; k < 9; k++) if (balconyAtCrest(k)) n++;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(balconyAtCrest(-1)).toBe(false);
    for (let s = 0; s < 40000; s += 5) {
      if (balconyLocal(s) === null) continue;
      expect(underLocal(s)).toBeNull();
      expect(underLocal(s - BALCONY.CLEAR)).toBeNull();
      expect(underLocal(s + BALCONY.CLEAR)).toBeNull();
    }
    expect(balconyLocal(Number.NaN)).toBeNull();
  });

  it('runs a storey up beside the road on the left, then a ramp down and a merge back', () => {
    const half = 15;
    expect(balcony(crest - 1, half)).toBeNull();
    const deck = balcony(crest + 10, half);
    expect(deck).toMatchObject({ z: BALCONY.H, raised: true, w: BALCONY.W });
    expect((deck?.c ?? 0) - (deck?.w ?? 0)).toBeCloseTo(half + BALCONY.GAP, 9);
    expect(BALCONY.H).toBeGreaterThanOrEqual(5);
    expect(BALCONY.H).toBeLessThanOrEqual(7);
    expect(BALCONY.RUN + BALCONY.RAMP).toBeGreaterThanOrEqual(300);
    // Down the ramp, never steeper than 1 in 8, smooth.
    let prev = BALCONY.H;
    for (let x = BALCONY.RUN; x < BALCONY.RUN + BALCONY.RAMP; x += 1) {
      const z = balcony(crest + x, half)?.z ?? 0;
      expect(z).toBeLessThanOrEqual(prev + 1e-9);
      expect(prev - z).toBeLessThan(0.125);
      prev = z;
    }
    const down = balcony(crest + BALCONY.RUN + BALCONY.RAMP + 1, half);
    expect(down?.z).toBe(0);
    expect(down?.raised).toBe(false);
    // The merge ends on the road's left lane.
    const end = balcony(crest + BALCONY_LENGTH - 0.01, half);
    expect((end?.c ?? 0) + (end?.w ?? 0)).toBeCloseTo(half, 2);
    expect(balcony(crest + BALCONY_LENGTH, half)).toBeNull();
    // The street itself is at its datum where the deck stands over it.
    for (let x = 30; x < BALCONY_LENGTH; x += 10) expect(CHINATOWN.elev(crest + x)).toBe(0);
  });

  it('puts a kicker on the left of the road up to the crest, ending in a lip', () => {
    const half = chinatownHalf(crest);
    expect(kickAt(crest - BALCONY.KICK - 1, half - 2, half)).toBe(0);
    expect(kickAt(crest - 0.5, half - 2, half)).toBeCloseTo(BALCONY.KICK_H, 2);
    expect(kickAt(crest - 0.5, 0, half)).toBe(0);
    expect(kickAt(crest + 0.5, half - 2, half)).toBe(0);
    const w = makeTrackWorld(CHINATOWN);
    expect(
      heightAt(w.track, crest - 0.5, half - 2) - heightAt(w.track, crest - 0.5, 0),
    ).toBeGreaterThan(1.5);
  });

  it('is ground to land and drive on: level, smooth, held as a road of its own', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s = crest + 100;
    const bc = CHINATOWN.balcony?.(s) ?? null;
    expect(bc).not.toBeNull();
    const c = bc?.c ?? 0;
    const z = bc?.z ?? 0;
    expect(heightAt(w.track, s, c)).toBeCloseTo(z, 9);
    // A storey over the road's left edge, however the bank carries it, all along the deck.
    for (let x = 30; x < BALCONY.RUN; x += 20) {
      const q = crest + x;
      const fq = frameAt(w.track, q);
      const edge = fq.e - Math.tan(fq.bank) * fq.half;
      expect((CHINATOWN.balcony?.(q)?.z ?? 0) - edge).toBeCloseTo(BALCONY.H, 2);
    }
    // Not part of the road as drawn (the deck is its own piece).
    expect(heightAt(w.track, s, c, true)).toBeLessThan(z - 3);
    expect(onBalcony(w.track, s, c)).not.toBeNull();
    expect(onBalcony(w.track, s, 0)).toBeNull();
    const f = frameAt(w.track, s);
    w.track.hint = s;
    const g = groundAt(w.track, f.x - Math.sin(f.h) * c, f.y + Math.cos(f.h) * c);
    expect(g.h).toBeCloseTo(z, 9);
    expect(g.rough).toBe(0);
    expect(Math.hypot(g.gx, g.gy)).toBeLessThan(1e-6);
    expect(g.road?.half).toBe(BALCONY.W);
  });

  it('stops a car on the road at its edge, lets one over it high enough, and holds you on top', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s = crest + 100;
    const bc = CHINATOWN.balcony?.(s) ?? null;
    const inner = (bc?.c ?? 0) - (bc?.w ?? 0);
    const low = carAt(w, s, inner - 0.4, 40);
    expect(collideTrack(w, low)).not.toBeNull();
    const high = carAt(w, s, inner - 0.4, 40);
    high.z = (bc?.z ?? 0) + 0.2;
    expect(collideTrack(w, high)).toBeNull();
    const top = carAt(w, s, (bc?.c ?? 0) + (bc?.w ?? 0), 40);
    top.z = bc?.z ?? 0;
    expect(collideTrack(w, top)).not.toBeNull();
    expect(collideTrack(w, carAt(w, s, bc?.c ?? 0, 40))).toBeNull();
  });

  it('a car jumping up-left off the kicker lands on it, rides it and comes down onto the road', () => {
    const w = makeTrackWorld(CHINATOWN);
    const start = crest - 400;
    const v = carAt(w, start, 4, 48);
    let rode = 0;
    let highest = 0;
    for (let i = 0; i < 60 * 20; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      const c = autopilotControls(v, w.track, s, t, false, 4, { bypass: false, balcony: true });
      stepVehicle(v, { ...c, throttle: 0.8, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      const on = onBalcony(w.track, q.s, q.u);
      if (on && !v.air) {
        rode++;
        const fq = frameAt(w.track, q.s);
        highest = Math.max(highest, v.z - (fq.e - Math.tan(fq.bank) * fq.half));
      }
      if (q.s > crest + BALCONY_LENGTH + 100) break;
    }
    expect(rode).toBeGreaterThan(60 * 3);
    // Riding it a storey over the road beside it.
    expect(highest).toBeGreaterThan(BALCONY.H - 0.5);
    const end = project(w.track, v.x, v.y);
    expect(end.s).toBeGreaterThan(crest + BALCONY_LENGTH);
    expect(Math.abs(end.u)).toBeLessThan(CHINATOWN.half(end.s) + 0.5);
  });

  it('a car that never goes for it stays on the road below', () => {
    const w = makeTrackWorld(CHINATOWN);
    const v = carAt(w, crest - 300, 0, 48);
    for (let i = 0; i < 60 * 12; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      const c = autopilotControls(v, w.track, s, t, false, 0, { bypass: false, balcony: false });
      stepVehicle(v, { ...c, throttle: 0.8, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      expect(onBalcony(w.track, q.s, q.u)).toBeNull();
    }
  });
});

describe('choosing a path', () => {
  it('aims along the path picked, and along the road elsewhere', () => {
    const mid = first + UNDER_LENGTH / 2;
    expect(aimLane(CHINATOWN, mid, 2, { bypass: true, balcony: false })).toBeCloseTo(
      LOWER.UNDER_C + 2 * 0.3,
      6,
    );
    expect(aimLane(CHINATOWN, mid, 2, { bypass: false, balcony: true })).toBe(2);
    const deck = crest + 50;
    expect(aimLane(CHINATOWN, deck, 2, { bypass: false, balcony: true })).toBeCloseTo(
      CHINATOWN.balcony?.(deck)?.c ?? 0,
      6,
    );
    expect(aimLane(CHINATOWN, first + LOWER_TO + 300, 2, { bypass: true, balcony: true })).toBe(2);
  });

  it('rivals on the right take the underpass, the one furthest left goes for the balcony', () => {
    const picks = RIVALS.map(rivalPick);
    expect(picks.some((p) => p.bypass)).toBe(true);
    expect(picks.some((p) => !p.bypass)).toBe(true);
    expect(picks.filter((p) => p.balcony).length).toBe(1);
    RIVALS.forEach((r, i) => {
      expect(picks[i].bypass).toBe(r.lane < 0);
    });
  });

  it('the autopilot picks one way or the other per fork, the same all along it', () => {
    const at = first + UNDER.EVERY;
    const on = (s: number) => underpass(s) !== null;
    const a = runStart(on, at);
    expect(a).toBeLessThanOrEqual(at + LOWER_FROM + 10);
    expect(a).toBeGreaterThanOrEqual(at + LOWER_FROM - 10);
    expect(runStart(on, at + 700)).toBe(a);
    const p = forkPick(CHINATOWN, at);
    expect(forkPick(CHINATOWN, at + 900)).toEqual(p);
    // Over many forks both ways come up.
    const ways = new Set(Array.from({ length: 12 }, (_, k) => pickFor(1000 + k * 3600)));
    expect(ways.size).toBe(2);
  });

  it('names both ways at the fork and the balcony road', () => {
    expect(PATH_SIGNS.under).toContain('UNDERTOWN');
    expect(PATH_SIGNS.main).toContain('UNDERPASS');
    expect(PATH_SIGNS.main).toContain('地下街');
    expect(PATH_SIGNS.balcony).toContain('BALCONY');
  });
});

describe('the street around the two paths', () => {
  it('stands its towers back clear of the underpass, none right of the street over its void', () => {
    const fork = piecesBetween('chinatown', CHINATOWN, first + LOWER_FROM, first + LOWER_TO);
    let right = 0;
    for (const p of fork) {
      if (p.kind !== 'shophouse' || p.side > 0) continue;
      const c = underpass(p.s);
      if (c === null) continue;
      right++;
      expect(underpassDepth(p.s)).toBeLessThan(2);
      expect(p.u + p.d).toBeLessThan(c - LOWER.LANE - 1);
    }
    // Only by the fork and the merge, where it is not yet (or no longer) down.
    expect(right).toBeLessThan(60);
    const side = piecesBetween('chinatown', CHINATOWN, crest - 50, crest + BALCONY_LENGTH);
    let near = 0;
    for (const p of side) {
      if (p.kind !== 'shophouse' || p.side < 0) continue;
      for (const ds of [-p.w, 0, p.w]) {
        const bc = CHINATOWN.balcony?.(p.s + ds) ?? null;
        if (!bc) continue;
        near++;
        expect(p.u - p.d).toBeGreaterThan(bc.c + bc.w + 1);
      }
    }
    expect(near).toBeGreaterThan(10);
  });

  it('keeps spans across the road out of the fork and off the balcony road', () => {
    const spans = new Set(['lights', 'lanterns', 'gate', 'temple']);
    for (const [a, b] of [
      [first + LOWER_FROM, first + LOWER_TO],
      [crest - BALCONY.KICK, crest + BALCONY_LENGTH],
    ]) {
      for (const p of piecesBetween('chinatown', CHINATOWN, a, b))
        if (spans.has(p.kind)) {
          // Over the fork only where the lane is walled well apart, never by the balcony road; over
          // the void only strings of light (no posts to stand in it).
          const c = underpass(p.s);
          const half = chinatownHalf(p.s);
          if (c !== null && underpassDepth(p.s) <= 0.05)
            expect(pathMedian(c, half) ?? 0).toBeLessThan(-(half + 5));
          if (c !== null && underpassDepth(p.s) > 0.05)
            expect(['lanterns', 'lights']).toContain(p.kind);
          expect(balconyLocal(p.s)).toBeNull();
        }
    }
  });

  it('lights the fork: a sign over each way and lights down the median', () => {
    const half = chinatownHalf(first - 200);
    const nose = forkNose(first, half);
    const ps = piecesBetween('chinatown', CHINATOWN, nose - 200, nose + 200);
    const boards = ps.filter((p) => p.kind === 'billboard' && p.d > 3);
    expect(boards.length).toBeGreaterThanOrEqual(2);
    expect(ps.some((p) => p.kind === 'gantry')).toBe(true);
    expect(ps.filter((p) => p.kind === 'beacon').length).toBeGreaterThan(20);
    const deck = piecesBetween('chinatown', CHINATOWN, crest - 200, crest);
    expect(deck.some((p) => p.kind === 'billboard' && p.d > 3)).toBe(true);
  });

  it('lights the void: lanterns down the track, columns and lanterns under the deck, panels', () => {
    const ps = piecesBetween('chinatown', CHINATOWN, first - 420, first);
    const below = ps.filter((p) => p.base !== undefined || (p.z ?? 0) < -2);
    expect(below.some((p) => p.kind === 'pillar' && (p.z ?? 0) < 0)).toBe(true);
    expect(below.some((p) => p.kind === 'beacon' && (p.z ?? 0) < -LOWER_SLAB)).toBe(true);
    expect(below.some((p) => p.kind === 'billboard' && p.cell === CT_PATH_CELLS.deep)).toBe(true);
    // Everything down there stands on the floor and under the deck.
    for (const p of below) {
      if (p.base !== undefined) expect(p.base).toBeCloseTo(lowerFloor(CHINATOWN, p.s), 6);
      if (p.kind === 'pillar') expect((p.z ?? 0) - (p.base ?? 0)).toBeLessThan(LOWER.DEPTH + 2);
    }
  });
});

describe('more banking on Chinatown (2026-11-24: "a bit more tilt")', () => {
  it('banks its bends half as steep again as before, never past 0.3 rad', () => {
    const tr = makeTrackWorld(CHINATOWN).track;
    let most = 0;
    for (let s = 400; s < 8000; s += 10) most = Math.max(most, Math.abs(frameAt(tr, s).bank));
    expect(most).toBeGreaterThan(0.25);
    expect(most).toBeLessThanOrEqual(CHINA_BANK + 1e-9);
    // On a gentle bend the bank's tangent is 1.5 times what it was (design speed 45, now 55).
    const was = (k: number) => Math.atan((k * 45 * 45) / 20);
    for (let s = 400; s < 8000; s += 37) {
      const f = frameAt(tr, s);
      if (Math.abs(was(f.k)) > 0.12 || Math.abs(f.k) < 2e-4) continue;
      expect(Math.tan(Math.abs(f.bank)) / Math.tan(Math.abs(was(f.k)))).toBeCloseTo(1.5, 1);
    }
  });

  it('keeps the start grid level, easing the bank in after it', () => {
    const tr = makeTrackWorld(CHINATOWN).track;
    for (let s = 0; s <= CHINA_LEVEL[0]; s += 5) expect(frameAt(tr, s).bank).toBe(0);
    expect(Math.abs(frameAt(tr, CHINA_LEVEL[1] + 10).bank)).toBeGreaterThan(0);
  });
});
