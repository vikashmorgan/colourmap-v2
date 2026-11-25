import { describe, expect, it } from 'vitest';
import { autopilotControls } from './autopilot';
import { CHINA_LAP, chinaElev, LAP_BALCONY, LAP_UNDER } from './chinatown-lap';
import { BALCONY, BALCONY_LENGTH } from './chinatown-paths';
import {
  DEEP_CHAMBERS,
  deepChamber,
  ROAD_OUT,
  ROADS,
  type RoadId,
  roadAt,
  roadStarts,
  sideRoads,
} from './chinatown-roads';
import { vistasBetween } from './chinatown-vista';
import { CATEGORIES, dressingFor } from './design-space';
import { piecesBetween, roadThrough } from './night-course';
import { RIVALS, rivalPick } from './rivals';
import {
  CHINATOWN,
  chinatownHalf,
  collideTrack,
  frameAt,
  heightAt,
  makeTrackWorld,
  onSideRoad,
  pointAt,
  project,
  sideRoadsAt,
} from './track';
import { UNDER_LENGTH } from './undertown';
import { G, newVehicle, stepVehicle, type Vehicle } from './vehicle';

const world = makeTrackWorld(CHINATOWN);
const road = (id: RoadId) => ROADS.find((r) => r.id === id)!;
/** Where each road is in the second lap (m along the street). */
const startOf = (id: RoadId) => CHINA_LAP + road(id).from;

const along = (id: RoadId, x: number) => {
  const s = startOf(id) + x;
  return sideRoadsAt(world.track, s).find((r) => r.id === id)!;
};

/** A car driven by the autopilot from s0 to s1, taking the side roads or not. */
function drive(s0: number, s1: number, side: boolean) {
  const f = frameAt(world.track, s0);
  const p = pointAt(world.track, s0, 0);
  const v: Vehicle = newVehicle('car', p.x, p.y, f.h);
  v.z = heightAt(world.track, s0, 0) + 0.5;
  v.vx = Math.cos(f.h) * 60;
  v.vy = Math.sin(f.h) * 60;
  world.track.hint = s0;
  const dt = 1 / 60;
  let s = s0;
  let t = 0;
  let lastVz = 0;
  const log: { s: number; u: number; z: number; on: RoadId | null; joined: boolean; az: number }[] =
    [];
  while (s < s1 && t < 120) {
    const c = autopilotControls(v, world.track, s, t, false, 0, {
      bypass: false,
      balcony: false,
      side,
    });
    stepVehicle(v, c, dt, world);
    const q = project(world.track, v.x, v.y, s);
    s = q.s;
    t += dt;
    const r = onSideRoad(world.track, q.s, q.u, v.z);
    log.push({
      s,
      u: q.u,
      z: v.z,
      on: r?.id ?? null,
      joined: r?.joined ?? false,
      az: t > 0.5 ? Math.abs(v.vz - lastVz) / dt : 0,
    });
    lastVz = v.vz;
  }
  return { log, s, t };
}

describe("Chinatown Run's side roads", () => {
  it('come off the left of the street and back onto it, out behind the front row between', () => {
    for (const def of ROADS) {
      const first = along(def.id, 0);
      const last = along(def.id, def.length);
      // Both ends lie over the road's left lane, level with its edge.
      for (const end of [first, last]) {
        const s = startOf(def.id) + end.x;
        expect(end.joined).toBe(true);
        expect(end.c + end.w).toBeLessThanOrEqual(chinatownHalf(s) + 0.01);
      }
      // In the middle, out past the shophouses' backs, walled.
      const mid = along(def.id, def.length / 2);
      expect(mid.joined).toBe(false);
      expect(mid.c - mid.w - chinatownHalf(startOf(def.id) + def.length / 2)).toBeCloseTo(
        ROAD_OUT,
        5,
      );
    }
  });

  it('stay within reach of the street (never past 80 m from its middle)', () => {
    for (const def of ROADS)
      for (let x = 0; x <= def.length; x += 10) {
        const r = along(def.id, x);
        expect(r.c + r.w).toBeLessThan(80);
      }
  });

  it('keep clear of Undertown, the balcony roads, the arcades and each other', () => {
    const spans = ROADS.map((d) => [d.from, d.from + d.length] as const);
    const clash = (a: number, b: number) =>
      spans.some(([f, t]) => [a, a + CHINA_LAP].some((o) => o < t && o + (b - a) > f));
    for (const u of LAP_UNDER) expect(clash(u - 1000, u + UNDER_LENGTH)).toBe(false);
    for (const c of LAP_BALCONY) expect(clash(c - BALCONY.KICK, c + BALCONY_LENGTH)).toBe(false);
    // The arcades on the left (the overlooks part the canyon on the right).
    for (const v of vistasBetween(0, CHINA_LAP).filter((o) => o.kind === 'arcade'))
      expect(clash(v.start, v.start + v.length)).toBe(false);
    for (let s = 0; s < 2 * CHINA_LAP; s += 20) expect(roadAt(s).length).toBeLessThanOrEqual(1);
  });

  it('none before the run starts; the deep way runs on into the next lap', () => {
    expect(roadAt(-5)).toEqual([]);
    const deep = road('deep');
    expect(deep.from + deep.length).toBeGreaterThan(CHINA_LAP);
    // Its end in lap 0 belongs to a lap before the run: none.
    expect(roadAt(500, 'deep')).toEqual([]);
    expect(roadAt(CHINA_LAP + 500, 'deep')).toHaveLength(1);
    const starts = roadStarts(0, 3 * CHINA_LAP).map((r) => r.s);
    expect(starts).toContain(CHINA_LAP + deep.from);
    expect(starts.every((s) => s >= 0)).toBe(true);
  });

  it('the high road climbs higher and runs longer than the balcony road', () => {
    const high = road('high');
    expect(high.length).toBeGreaterThan(3 * BALCONY_LENGTH);
    let top = 0;
    let run = 0;
    for (let x = 0; x <= high.length; x += 5) {
      const s = startOf('high') + x;
      const over = along('high', x).z - chinaElev(s);
      top = Math.max(top, over);
      if (over > 20) run += 5;
    }
    expect(top).toBeGreaterThan(3 * BALCONY.H);
    expect(run).toBeGreaterThan(1000);
  });

  it('the deep way goes under the ground through its four chambers, roofed from arch to arch', () => {
    const deep = road('deep');
    const names = DEEP_CHAMBERS.map((c) => c.id);
    expect(names).toEqual(['lanterns', 'dragon', 'flood', 'vault']);
    for (const c of DEEP_CHAMBERS) {
      const mid = (c.from + c.to) / 2;
      const r = along('deep', mid);
      const s = startOf('deep') + mid;
      expect(deepChamber(s)?.id).toBe(c.id);
      // Under the ground, with a roof over it, the halls wider and taller than the way between.
      expect(r.z).toBeLessThan(chinaElev(s) - 8);
      expect(r.roof).not.toBeNull();
      expect(r.z + (r.roof ?? 0)).toBeLessThan(chinaElev(s) + 4.5);
    }
    expect(along('deep', 1700).w).toBeGreaterThan(along('deep', 2250).w * 2);
    expect(along('deep', 1700).roof!).toBeGreaterThan(along('deep', 2250).roof! * 2);
    // Open where it joins the street; roofed from its arch on.
    expect(along('deep', 200).roof).toBeNull();
    expect(along('deep', 600).roof).not.toBeNull();
    expect(along('deep', deep.length - 200).roof).toBeNull();
  });

  it('its floor rises and falls smoothly: at 360 km/h never more than half of gravity', () => {
    for (const def of ROADS) {
      let most = 0;
      for (let x = 2; x < def.length - 2; x += 1) {
        const z = (q: number) => {
          const s = startOf(def.id) + q;
          const half = chinatownHalf(s);
          const e = chinaElev(s);
          return sideRoads(s, half, e, e).find((r) => r.id === def.id)!.z;
        };
        most = Math.max(most, Math.abs(z(x + 2) - 2 * z(x) + z(x - 2)) / 4);
      }
      expect(most * 100 * 100).toBeLessThan(G / 2);
    }
  });

  for (const id of ['alley', 'high', 'deep'] as RoadId[]) {
    it(`a car can take the ${id}: it bears left onto it, stays on it, and comes back`, () => {
      const def = road(id);
      const s0 = startOf(id) - 150;
      const s1 = startOf(id) + def.length + 150;
      const { log, s } = drive(s0, s1, true);
      expect(s).toBeGreaterThan(s1 - 1);
      const on = log.filter((l) => l.on === id);
      // On it most of the way (at about 90 m/s, a frame is about 1.5 m).
      expect(on.length / 60).toBeGreaterThan((def.length / 100) * 0.6);
      // Between its walls while it is apart from the street, its ground pushes gently.
      const apart = log.filter((l) => l.on === id && !l.joined);
      expect(apart.length).toBeGreaterThan(300);
      for (const l of apart) {
        const r = sideRoadsAt(world.track, l.s).find((o) => o.id === id)!;
        expect(Math.abs(l.u - r.c)).toBeLessThan(r.w + 0.5);
        expect(l.z).toBeGreaterThan(r.z - 0.5);
      }
      // Away from where it leaves and rejoins the street (whose banked edge it meets there).
      const inner = apart.filter((l) => {
        const x = sideRoadsAt(world.track, l.s).find((o) => o.id === id)!.x;
        return x > 600 && x < def.length - 600;
      });
      expect(Math.max(...inner.map((l) => l.az))).toBeLessThan(G * 0.75);
      // Back on the street at its end (the alley's end is the high road's start: on it goes).
      const end = startOf(id) + def.length;
      expect(
        log.some((l) => l.s > end - 20 && l.s < end + 60 && Math.abs(l.u) < chinatownHalf(l.s)),
      ).toBe(true);
    });
  }

  it('a car that keeps to the street never finds them', () => {
    const { log } = drive(startOf('alley') - 100, startOf('alley') + 2200, false);
    expect(log.some((l) => l.on !== null)).toBe(false);
    const deep = drive(startOf('deep') - 100, startOf('deep') + 900, false);
    expect(deep.log.some((l) => l.on !== null)).toBe(false);
  });

  it('picks the surface by height: under the high road you are on the ground, on it you are on it', () => {
    const r = along('high', 1400);
    const s = startOf('high') + 1400;
    const p = pointAt(world.track, s, r.c);
    world.track.hint = s;
    expect(world.ground(p.x, p.y, r.z + 1).h).toBeCloseTo(r.z, 3);
    expect(onSideRoad(world.track, s, r.c, r.z - 10)).toBeNull();
    // Deep under the ground the floor is the deep way's.
    const d = along('deep', 1700);
    const sd = startOf('deep') + 1700;
    const pd = pointAt(world.track, sd, d.c);
    world.track.hint = sd;
    expect(world.ground(pd.x, pd.y, d.z + 1).h).toBeCloseTo(d.z, 3);
  });

  it('its walls hold you once it is apart from the street, not where it joins', () => {
    const hit = (id: RoadId, x: number, du: number) => {
      const r = along(id, x);
      const s = startOf(id) + x;
      const p = pointAt(world.track, s, r.c + du);
      const v = newVehicle('car', p.x, p.y, frameAt(world.track, s).h);
      v.z = r.z + 0.5;
      world.track.hint = s;
      return collideTrack(world, v);
    };
    const r = along('alley', 1000);
    expect(hit('alley', 1000, r.w - 0.2)).not.toBeNull();
    expect(hit('alley', 1000, -(r.w - 0.2))).not.toBeNull();
    expect(hit('alley', 1000, 0)).toBeNull();
    expect(hit('deep', 1700, along('deep', 1700).w - 0.2)).not.toBeNull();
    // Joined: no wall on its street side.
    const j = along('high', 80);
    expect(j.joined).toBe(true);
    expect(hit('high', 80, -(j.w - 0.2))).toBeNull();
  });

  it('one rival knows the side roads', () => {
    expect(RIVALS.filter((r) => rivalPick(r).side)).toHaveLength(1);
  });

  it('parts the shophouses where a road comes through the row, and stands towers by the high road', () => {
    const s0 = startOf('high');
    const pieces = piecesBetween('chinatown', CHINATOWN, s0, s0 + road('high').length);
    for (const p of pieces)
      if (p.kind === 'shophouse' && p.side > 0 && p.u > 0 && p.id < 90000)
        expect(roadThrough(CHINATOWN, p.s, p.w)).toBe(false);
    // Slim towers (shophouses, storey on storey, as everywhere in Chinatown).
    expect(pieces.filter((p) => p.id >= 91000 && p.id < 92000).length).toBeGreaterThanOrEqual(10);
    expect(pieces.filter((p) => p.kind === 'gantry').length).toBeGreaterThanOrEqual(5);
    expect(pieces.filter((p) => p.kind === 'pillar').length).toBeGreaterThan(50);
  });

  it('are dressed in the design space by default', () => {
    const cat = CATEGORIES.findIndex((c) => c.id === 'chinatown');
    const v = CATEGORIES[cat].vars.findIndex((x) => x.id === 'sideroads');
    expect(dressingFor('chinatown')).toContainEqual({ cat, v });
  });
});
