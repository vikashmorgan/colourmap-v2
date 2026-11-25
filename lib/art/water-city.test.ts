import { describe, expect, it } from 'vitest';

import { autopilotControls } from './autopilot';
import { frameAt, heightAt, makeTrackWorld, project, WATER_TRACK } from './track';
import { G, newVehicle, stepVehicle } from './vehicle';
import {
  ARCHES,
  onWaterRoad,
  rainAt,
  towersBetween,
  WATER_BANK,
  WATER_BENDS,
  WATER_LAP,
  WATER_PORTALS,
  WATER_SECTIONS,
  waterCurv,
  waterElev,
  waterHalf,
  waterPortalThrough,
  waterSection,
} from './water-city';

const world = makeTrackWorld(WATER_TRACK);
const tr = world.track;

describe('Water City (2026-11-25: "A WHOLE WATER CITY RACING TRACK")', () => {
  it('is one 10 km lap in an arc: calm piers, canals, bridges, the open lake, the grand canal, home', () => {
    expect(WATER_SECTIONS[0].from).toBe(0);
    expect(WATER_SECTIONS[WATER_SECTIONS.length - 1].to).toBe(WATER_LAP);
    for (let i = 1; i < WATER_SECTIONS.length; i++)
      expect(WATER_SECTIONS[i].from).toBe(WATER_SECTIONS[i - 1].to);
    expect(WATER_SECTIONS.map((s) => s.kind)).toEqual([
      'piers',
      'canal',
      'bridges',
      'open',
      'grand',
      'piers',
    ]);
    expect(waterSection(WATER_LAP + 6000).kind).toBe('open');
  });

  it('never turns back on itself: net heading nil, never past 70° off its way', () => {
    let h = 0;
    let most = 0;
    for (let s = 0; s < WATER_LAP; s += 1) {
      h += waterCurv(s + 0.5);
      most = Math.max(most, Math.abs(h));
    }
    expect(Math.abs(h)).toBeLessThan(0.01);
    expect(most).toBeLessThan((70 * Math.PI) / 180);
    // No bend tighter than the data format allows (110 m).
    for (const [, , r] of WATER_BENDS) expect(Math.abs(r)).toBeGreaterThan(300);
  });

  it('rises and falls smoothly: at 300 km/h never more than half of gravity', () => {
    let curve = 0;
    let slope = 0;
    for (let s = 1; s < WATER_LAP; s += 1) {
      curve = Math.max(curve, Math.abs(waterElev(s + 1) - 2 * waterElev(s) + waterElev(s - 1)));
      slope = Math.max(slope, Math.abs(waterElev(s + 0.5) - waterElev(s - 0.5)));
    }
    expect(curve * 83 * 83).toBeLessThan(G / 2);
    expect(slope).toBeLessThan(0.15);
    for (const [c, h] of ARCHES) expect(waterElev(c)).toBeGreaterThan(h);
  });

  it('runs on the water on the canals and the open lake, on decks elsewhere', () => {
    expect(onWaterRoad(2500)).toBe(true);
    expect(onWaterRoad(6000)).toBe(true);
    expect(onWaterRoad(500)).toBe(false);
    expect(onWaterRoad(4000)).toBe(false);
    expect(onWaterRoad(8000)).toBe(false);
    tr.hint = 6000;
    const g = world.ground(frameAt(tr, 6000).x, frameAt(tr, 6000).y, 0);
    expect(g.water).toBe(true);
    expect(g.grip).toBeLessThan(1);
    tr.hint = 500;
    expect(world.ground(frameAt(tr, 500).x, frameAt(tr, 500).y, 3).water).toBeFalsy();
  });

  it('banks its bends within the engine’s limits, level on the grid, and smoothly', () => {
    let most = 0;
    let roll = 0;
    let prev = frameAt(tr, 0).bank;
    for (let s = 1; s < WATER_LAP; s += 1) {
      const b = frameAt(tr, s).bank;
      most = Math.max(most, Math.abs(b));
      roll = Math.max(roll, Math.abs(b - prev));
      prev = b;
    }
    expect(most).toBeLessThanOrEqual(WATER_BANK.MOST + 1e-9);
    expect(most).toBeGreaterThan(0.3);
    expect(roll).toBeLessThan(0.01);
    expect(frameAt(tr, 40).bank).toBe(0);
  });

  it('is wide everywhere, and widest out on the open lake', () => {
    for (let s = 0; s < WATER_LAP; s += 50) expect(waterHalf(s)).toBeGreaterThanOrEqual(11);
    expect(waterHalf(6000)).toBe(18);
  });

  it('rains over the canals and the open lake, dry on the piers', () => {
    expect(rainAt(500)).toBe(0);
    expect(rainAt(2600)).toBe(1);
    expect(rainAt(6000)).toBe(1);
  });

  it('stands towers along the canals clear of the road, the tallest on the grand canal', () => {
    const canal = towersBetween(1600, 3400);
    const grand = towersBetween(7300, 8700);
    expect(canal.length).toBeGreaterThan(40);
    for (const t of [...canal, ...grand])
      expect(Math.abs(t.u) - t.d).toBeGreaterThan(waterHalf(t.s) + 3);
    const tallest = (l: typeof canal) => Math.max(...l.map((t) => t.h));
    expect(tallest(grand)).toBeGreaterThan(tallest(canal));
    expect(towersBetween(0, 1500)).toHaveLength(0);
  });

  it('counts a pass through a portal of light, lap after lap', () => {
    const [x, u] = WATER_PORTALS[3];
    expect(waterPortalThrough(x - 2, x + 2, u)).toBe(3);
    expect(waterPortalThrough(WATER_LAP + x - 2, WATER_LAP + x + 2, u)).toBe(3);
    expect(waterPortalThrough(x - 2, x + 2, u + 12)).toBe(-1);
  });

  it('a car on the autopilot laps it flat out, held on the road, never thrown', () => {
    const f = frameAt(tr, 40);
    const v = newVehicle('car', f.x, f.y, f.h, heightAt(tr, 40, 0));
    tr.hint = 40;
    const dt = 1 / 60;
    let s = 40;
    let flew = 0;
    let worst = 0;
    let lastVz: number | null = null;
    for (let i = 0; i < 60 * 260 && s < WATER_LAP + 100; i++) {
      const c = autopilotControls(v, tr, s, i * dt);
      stepVehicle(v, { ...c, throttle: 1 }, dt, world, i * dt);
      const q = project(tr, v.x, v.y, s);
      s = q.s;
      tr.hint = s;
      if (v.air) flew++;
      if (lastVz !== null && !v.air) worst = Math.max(worst, Math.abs(v.vz - lastVz) / dt);
      lastVz = v.air ? null : v.vz;
      expect(Math.abs(q.u)).toBeLessThan(waterHalf(s) + 2);
    }
    expect(s).toBeGreaterThan(WATER_LAP + 100);
    expect(flew).toBeLessThan(30);
    // Boosting down off the arches it passes 400 km/h; even so the ground's push stays gentle.
    expect(worst).toBeLessThan(0.75 * G);
  });
});
