import { describe, expect, it } from 'vitest';
import { DRIFT_PATH } from './drift-gates';
import { WORLDS } from './drive-design';
import { RACE, SKY_LAP } from './track';
import { MAP_SPAN, trackMap } from './track-map';

const coords = (d: string) =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

describe('the track maps', () => {
  it.each(WORLDS.map((w) => w.id))('draws %s inside its box', (id) => {
    const m = trackMap(id, 600, 260);
    const pts = coords(m.d);
    expect(pts.length).toBeGreaterThan(30);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(600);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(260);
    }
    // It fills the box one way or the other, not a speck in the middle.
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    expect(spanX > 400 || spanY > 160).toBe(true);
    expect(m.marks.filter((k) => k.kind === 'start')).toHaveLength(1);
  });

  it('shows the plains as their drift loop, closed, a mark at every gate', () => {
    const m = trackMap('salt');
    expect(m.closed).toBe(true);
    expect(m.d.endsWith('Z')).toBe(true);
    expect(m.marks).toHaveLength(DRIFT_PATH.length);
    expect(m.banks).toEqual([]);
  });

  it('runs the canyon to its finish, the sky to its lap door, the gold its 12 km lap, the rest 6 km', () => {
    expect(trackMap('canyon').length).toBe(RACE.finish);
    expect(trackMap('canyon').marks.map((k) => k.kind)).toEqual(['start', 'finish']);
    expect(trackMap('sky').length).toBe(SKY_LAP);
    expect(trackMap('gold').length).toBe(12000);
    expect(trackMap('gold').marks.filter((k) => k.kind === 'gate')).toHaveLength(11);
    expect(trackMap('coast').length).toBe(MAP_SPAN);
  });

  it('lays every map along its longest spread, so it fills a wide box', () => {
    for (const id of ['canyon', 'sky', 'coast'] as const) {
      const xs = coords(trackMap(id, 600, 260).d).map((p) => p.x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(400);
    }
  });

  it('marks the Golden Track’s steep bends', () => {
    expect(trackMap('gold').banks.length).toBeGreaterThan(1);
  });
});
