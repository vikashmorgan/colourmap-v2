import { describe, expect, it } from 'vitest';

import { WORLDS } from './drive-design';
import { RACE, SKY_LAP } from './track';
import { runLabel, TRACKS, trackInfo, trackList } from './track-registry';

describe('the track registry', () => {
  it('describes every world, in the keys’ order', () => {
    expect(trackList().map((t) => t.id)).toEqual(WORLDS.map((w) => w.id));
    expect(Object.keys(TRACKS).sort()).toEqual(WORLDS.map((w) => w.id).sort());
  });

  it('gives each track its own colour, a tagline and at most three highlights', () => {
    const colours = trackList().map((t) => t.colour.toLowerCase());
    expect(new Set(colours).size).toBe(colours.length);
    for (const t of trackList()) {
      expect(t.colour).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.tagline.length).toBeGreaterThan(5);
      expect(t.tagline.length).toBeLessThan(48);
      expect(t.highlights.length).toBeGreaterThan(0);
      expect(t.highlights.length).toBeLessThanOrEqual(3);
    }
  });

  it('races rivals only on roads, never on the open plains', () => {
    expect(trackInfo('salt').rivals).toBe(false);
    expect(trackInfo('mars').rivals).toBe(false);
    expect(trackInfo('canyon').rivals).toBe(true);
  });

  it('reads the course and lap lengths from the tracks themselves', () => {
    expect(trackInfo('canyon').runLength).toBe(RACE.finish - RACE.start);
    expect(trackInfo('sky').runLength).toBe(SKY_LAP);
    expect(runLabel(trackInfo('canyon'))).toBe('4.8 km course');
    expect(runLabel(trackInfo('sky'))).toBe('6.0 km lap');
    expect(runLabel(trackInfo('salt'))).toBe('1 mile');
    expect(runLabel(trackInfo('gold'))).toBe('timed every km');
  });
});
