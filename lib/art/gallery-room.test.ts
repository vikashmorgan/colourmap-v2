import { describe, expect, it } from 'vitest';

import {
  allowed,
  CIRCLE_ROOM,
  CIRCLE_SERIES,
  CIRCLES,
  circlePlaces,
  DOOR,
  framePlaces,
  HALL,
  hallLength,
  MATERIALS,
  PROJECTIONS,
  plinthPlaces,
  projectionUrl,
  ROOM_FEELS,
  ROUND_ROOM,
  ringRecipe,
  rooms,
  roundRoomPlaces,
  SCULPTURES,
  step,
  walkable,
} from './gallery-room';

describe('the gallery', () => {
  it('offers the three moods and the four materials', () => {
    expect(ROOM_FEELS.map((f) => f.id)).toEqual(['white', 'temple', 'dark']);
    expect(Object.keys(MATERIALS)).toEqual(['marble', 'bronze', 'gold', 'glass']);
    expect(MATERIALS.bronze.metalness).toBe(1);
    expect(SCULPTURES.some((s) => s.name === 'Total fracture')).toBe(true);
  });

  it('makes the hall long enough for every picture and every plinth', () => {
    const length = hallLength(22, 5);
    const frames = framePlaces(22, length);
    expect(frames).toHaveLength(22);
    for (const f of frames) {
      expect(f.z).toBeGreaterThan(HALL.frameW / 2);
      expect(f.z).toBeLessThan(length - HALL.frameW / 2);
    }
    // Neighbours on the same wall never overlap.
    const left = frames.filter((f) => f.x < 0).map((f) => f.z);
    for (let i = 1; i < left.length; i++)
      expect((left[i] as number) - (left[i - 1] as number)).toBeGreaterThan(HALL.frameW);
    // Half on each wall, each facing into the room.
    expect(frames.filter((f) => f.x < 0 && f.facing === 1)).toHaveLength(11);
    expect(frames.filter((f) => f.x > 0 && f.facing === -1)).toHaveLength(11);
  });

  it('keeps a visitor inside the walls and out of the plinths', () => {
    const length = hallLength(22, 5);
    const plinths = plinthPlaces(5, length);
    const out = walkable(100, -5, length, plinths);
    expect(Math.abs(out.x)).toBeLessThan(HALL.width / 2);
    expect(out.z).toBeGreaterThan(0);
    const p = plinths[0]!;
    const pushed = walkable(p.x + 0.2, p.z, length, plinths);
    expect(Math.hypot(pushed.x - p.x, pushed.z - p.z)).toBeGreaterThanOrEqual(1.5);
  });

  it('stands seven different circles in a ring of their own at the end of the hall', () => {
    expect(CIRCLES).toHaveLength(7);
    expect(new Set(CIRCLES.map((c) => c.variant)).size).toBe(7);
    expect(CIRCLES.every((c) => c.form === 'circles' && c.material === 'gold')).toBe(true);
    const length = hallLength(26, 8) + CIRCLE_ROOM.depth;
    const places = circlePlaces(7, length);
    const cz = length - CIRCLE_ROOM.depth / 2;
    for (const p of places) {
      expect(Math.hypot(p.x, p.z - cz)).toBeCloseTo(CIRCLE_ROOM.radius, 6);
      expect(Math.abs(p.x)).toBeLessThan(HALL.width / 2 - 1);
    }
    // Far enough apart to walk between.
    for (let i = 0; i < places.length; i++) {
      const a = places[i]!;
      const b = places[(i + 1) % places.length]!;
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(3);
    }
  });

  it('lays out the three rooms: the corridor, the round room, the projection room', () => {
    const r = rooms(26);
    expect(r.round).toBe(r.corridor);
    expect(r.roundCentre).toBe(r.round + ROUND_ROOM.radius);
    expect(r.projection).toBe(r.round + 2 * ROUND_ROOM.radius);
    expect(r.walls).toEqual([r.corridor, r.projection]);
    expect(DOOR).toBeGreaterThan(2);
  });

  it('lets a visitor walk through the doorways but not through the walls', () => {
    const r = rooms(26);
    // Down the corridor and through the first doorway.
    expect(allowed(0, r.corridor, r)).toBe(true);
    expect(allowed(5, r.corridor, r)).toBe(false);
    // The round room is wider than the corridor.
    expect(allowed(10, r.roundCentre, r)).toBe(true);
    expect(allowed(10, r.corridor - 2, r)).toBe(false);
    expect(allowed(ROUND_ROOM.radius, r.roundCentre, r)).toBe(false);
    // A step into a wall slides along it rather than stopping dead.
    const from = { x: 5, z: r.corridor - 3 };
    const to = { x: 5.3, z: r.corridor + 0.5 };
    const went = step(from, to, r, []);
    expect(went.z).toBeLessThan(r.corridor);
    expect(went.x).toBeCloseTo(5.3, 6);
  });

  it('stands twenty-four different ring sculptures in a circle, gold with some bronze and glass', () => {
    expect(CIRCLE_SERIES).toHaveLength(24);
    const recipes = CIRCLE_SERIES.map((s) => JSON.stringify(ringRecipe(s.seed as number)));
    expect(new Set(recipes).size).toBe(24);
    expect(new Set(CIRCLE_SERIES.map((s) => ringRecipe(s.seed as number).family)).size).toBe(10);
    expect(new Set(CIRCLE_SERIES.map((s) => s.material))).toEqual(
      new Set(['gold', 'bronze', 'glass']),
    );
    const r = rooms(26);
    const places = roundRoomPlaces(24, r.roundCentre);
    for (const p of places)
      expect(Math.hypot(p.x, p.z - r.roundCentre)).toBeCloseTo(ROUND_ROOM.ring, 6);
    // Room to walk between them, and every one is somewhere a visitor can reach round.
    const gap = Math.hypot(places[0]!.x - places[1]!.x, places[0]!.z - places[1]!.z);
    expect(gap).toBeGreaterThan(2.2);
  });

  it('projects the quantum and liquid programs, cleanly, from the builder', () => {
    expect(PROJECTIONS).toContain('Liquid Quantum');
    expect(PROJECTIONS as readonly string[]).not.toContain('One Flame');
    expect(projectionUrl('Liquid Quantum')).toBe(
      'https://artprojection.vercel.app/?preset=Liquid%20Quantum&display=1',
    );
  });
});
