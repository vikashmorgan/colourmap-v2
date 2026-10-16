import { describe, expect, it } from 'vitest';

import {
  framePlaces,
  HALL,
  hallLength,
  MATERIALS,
  plinthPlaces,
  ROOM_FEELS,
  SCULPTURES,
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
});
