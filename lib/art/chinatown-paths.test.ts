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
  MAIN,
  mainMedian,
  mainStreet,
  PATH_SIGNS,
  pickFor,
  runStart,
} from './chinatown-paths';
import { piecesBetween } from './night-course';
import { RIVALS, rivalPick } from './rivals';
import {
  BYPASS_LANE,
  CHINA_BANK,
  CHINA_LEVEL,
  CHINATOWN,
  chinatownHalf,
  collideTrack,
  frameAt,
  groundAt,
  heightAt,
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

describe('Main Street, the way past Undertown (2026-11-24: "there are 2 paths")', () => {
  it('peels off the right before each Undertown, runs clear of the flip, and merges back after', () => {
    for (const k of [0, 1, 3]) {
      const at = first + k * UNDER.EVERY;
      expect(mainStreet(at - MAIN.SPLIT - 1)).toBeNull();
      expect(mainStreet(at - MAIN.SPLIT + 1)).toBeCloseTo(0, 0);
      // Fully out before the flip starts and until after it ends.
      for (let s = at - MAIN.CLEAR; s <= at + UNDER_LENGTH + MAIN.CLEAR; s += 10)
        expect(mainStreet(s)).toBeCloseTo(-MAIN.OUT, 6);
      expect(mainStreet(at + UNDER_LENGTH + MAIN.SPLIT + 1)).toBeNull();
    }
    expect(mainStreet(Number.NaN)).toBeNull();
    expect(mainStreet(first + UNDER.EVERY / 2 + 600)).toBeNull();
    expect(MAIN.LANE).toBe(BYPASS_LANE);
  });

  it('keeps its lane outside the flip’s sweep (the ribbon’s edge round the axis)', () => {
    const half = Math.max(...Array.from({ length: 200 }, (_, i) => chinatownHalf(i * 10)));
    const sweep = Math.hypot(half, UNDER.AXIS);
    expect(MAIN.OUT - MAIN.LANE).toBeGreaterThan(sweep + 4);
  });

  it('eases out smoothly, never a jump across', () => {
    let prev = mainStreet(first - MAIN.SPLIT) ?? 0;
    for (let s = first - MAIN.SPLIT; s < first + UNDER_LENGTH + MAIN.SPLIT; s += 1) {
      const c = mainStreet(s) ?? 0;
      expect(Math.abs(c - prev)).toBeLessThan(0.2);
      prev = c;
    }
  });

  it('walls the lane apart from the road once they have parted, with the median between', () => {
    expect(mainMedian(null, 10)).toBeNull();
    expect(mainMedian(-10, 10)).toBeNull();
    expect(mainMedian(-MAIN.OUT, 10)).toBeCloseTo((-MAIN.OUT + MAIN.LANE - 10) / 2, 9);
    const half = chinatownHalf(first - 200);
    const nose = forkNose(first, half);
    expect(nose).toBeGreaterThan(first - MAIN.SPLIT);
    expect(nose).toBeLessThan(first - MAIN.CLEAR);
    expect(medianAt(makeTrackWorld(CHINATOWN).track, nose - 3)).toBeNull();
    expect(medianAt(makeTrackWorld(CHINATOWN).track, nose + 3)).not.toBeNull();
  });

  it('is road: flat, smooth, drawn flat (not rolled) while the ribbon flips beside it', () => {
    const w = makeTrackWorld(CHINATOWN);
    const mid = first + UNDER_LENGTH / 2;
    const c = mainStreet(mid) ?? 0;
    w.track.hint = mid;
    // Level with the road's right edge beside it (the bank carries it), flat across.
    const fm = frameAt(w.track, mid);
    expect(heightAt(w.track, mid, c)).toBeCloseTo(fm.e + Math.tan(fm.bank) * fm.half, 9);
    expect(heightAt(w.track, mid, c + 5)).toBeCloseTo(heightAt(w.track, mid, c - 5), 9);
    const p = frameAt(w.track, mid);
    const q = groundAt(w.track, p.x - Math.sin(p.h) * c, p.y + Math.cos(p.h) * c);
    expect(q.rough).toBe(0);
    // The lane holds you as a road of its own.
    expect(q.road?.half).toBe(BYPASS_LANE);
    expect(Math.abs(q.road?.u ?? 9)).toBeLessThan(0.5);
    // Far from the ribbon even where it sweeps out widest.
    const flip = first + UNDER.FLIP / 2;
    const edge = twistPose(w.track, flip, CHINATOWN.half(flip), 0);
    const e = project(w.track, edge.x, edge.y, flip);
    expect(e.u).toBeGreaterThan((mainStreet(flip) ?? 0) + MAIN.LANE + 4);
  });

  it('a car bearing right at the fork drives Main Street level past Undertown and comes back', () => {
    const w = makeTrackWorld(CHINATOWN);
    const start = first - MAIN.SPLIT - 100;
    const v = carAt(w, start, 0, 45);
    let onMain = 0;
    let rolledUnder = 0;
    for (let i = 0; i < 60 * 40; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      const c = autopilotControls(v, w.track, s, t, false, 0, { bypass: true, balcony: false });
      stepVehicle(v, { ...c, throttle: 0.7, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      if (underLocal(q.s) !== null) {
        const by = mainStreet(q.s) ?? 0;
        if (Math.abs(q.u - by) <= BYPASS_LANE) onMain++;
        else rolledUnder++;
      }
      if (q.s > first + UNDER_LENGTH + MAIN.SPLIT + 200) break;
    }
    expect(onMain).toBeGreaterThan(60 * 10);
    expect(rolledUnder).toBe(0);
    const end = project(w.track, v.x, v.y);
    expect(end.s).toBeGreaterThan(first + UNDER_LENGTH + MAIN.SPLIT);
    expect(Math.abs(end.u)).toBeLessThan(CHINATOWN.half(end.s));
  });

  it('a car keeping left flips under as before, held off the median', () => {
    const w = makeTrackWorld(CHINATOWN);
    const start = first - MAIN.SPLIT - 100;
    const v = carAt(w, start, 3, 45);
    let under = 0;
    for (let i = 0; i < 60 * 30; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      // Hard right all the way: the median keeps you on the ribbon.
      const steer = s > first + 20 ? -1 : 0;
      const c = autopilotControls(v, w.track, s, t, false, 3, { bypass: false, balcony: false });
      stepVehicle(v, { ...c, steer: steer || c.steer, throttle: 0.7, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      if (underLocal(q.s) !== null && underLocal(q.s)! > UNDER.FLIP) {
        under++;
        expect(Math.abs(q.u)).toBeLessThan(CHINATOWN.half(q.s) + 1);
      }
      if (q.s > first + UNDER_LENGTH) break;
    }
    expect(under).toBeGreaterThan(60 * 5);
  });

  it('a car against the median on either side is pushed back to its own side', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s = first - MAIN.CLEAR;
    const mid = medianAt(w.track, s) ?? 0;
    const onRoad = carAt(w, s, mid + 0.5, 30);
    expect(collideTrack(w, onRoad)?.ny).toBeDefined();
    const road = collideTrack(w, onRoad);
    const lane = collideTrack(w, carAt(w, s, mid - 0.5, 30));
    expect(road).not.toBeNull();
    expect(lane).not.toBeNull();
    // Opposite pushes: the road's car to the left, the lane's to the right.
    expect((road?.nx ?? 0) * (lane?.nx ?? 0) + (road?.ny ?? 0) * (lane?.ny ?? 0)).toBeLessThan(0);
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
      -MAIN.OUT + 2 * 0.3,
      6,
    );
    expect(aimLane(CHINATOWN, mid, 2, { bypass: false, balcony: true })).toBe(2);
    const deck = crest + 50;
    expect(aimLane(CHINATOWN, deck, 2, { bypass: false, balcony: true })).toBeCloseTo(
      CHINATOWN.balcony?.(deck)?.c ?? 0,
      6,
    );
    expect(aimLane(CHINATOWN, 500, 2, { bypass: true, balcony: true })).toBe(2);
  });

  it('rivals on the right take Main Street, the one furthest left goes for the balcony', () => {
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
    const on = (s: number) => mainStreet(s) !== null;
    const a = runStart(on, at);
    expect(a).toBeLessThanOrEqual(at - MAIN.SPLIT + 10);
    expect(a).toBeGreaterThanOrEqual(at - MAIN.SPLIT - 10);
    expect(runStart(on, at + 700)).toBe(a);
    const p = forkPick(CHINATOWN, at);
    expect(forkPick(CHINATOWN, at + 900)).toEqual(p);
    // Over many forks both ways come up.
    const ways = new Set(Array.from({ length: 12 }, (_, k) => pickFor(1000 + k * 3600)));
    expect(ways.size).toBe(2);
  });

  it('names both ways at the fork and the balcony road', () => {
    expect(PATH_SIGNS.under).toContain('UNDERTOWN');
    expect(PATH_SIGNS.main).toContain('MAIN STREET');
    expect(PATH_SIGNS.balcony).toContain('BALCONY');
  });
});

describe('the street around the two paths', () => {
  it('stands its towers back clear of Main Street and of the balcony road', () => {
    const fork = piecesBetween('chinatown', CHINATOWN, first - MAIN.SPLIT, first + UNDER_LENGTH);
    for (const p of fork) {
      if (p.kind !== 'shophouse' || p.side > 0) continue;
      const c = mainStreet(p.s);
      if (c === null) continue;
      expect(p.u + p.d).toBeLessThan(c - MAIN.LANE - 1);
    }
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
      [first - MAIN.SPLIT, first],
      [crest - BALCONY.KICK, crest + BALCONY_LENGTH],
    ]) {
      for (const p of piecesBetween('chinatown', CHINATOWN, a, b))
        if (spans.has(p.kind)) {
          // Over the fork only where the lane is walled well apart, never by the balcony road.
          const c = mainStreet(p.s);
          const half = chinatownHalf(p.s);
          if (c !== null) expect(mainMedian(c, half) ?? 0).toBeLessThan(-(half + 5));
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
