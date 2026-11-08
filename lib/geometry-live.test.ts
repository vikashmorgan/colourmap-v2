import { beforeEach, describe, expect, it } from 'vitest';

import {
  readGeometryLiveState,
  resetGeometryLiveStateForTest,
  writeGeometryLiveState,
} from './geometry-live';

describe('geometry live state', () => {
  beforeEach(() => {
    resetGeometryLiveStateForTest();
  });

  it('stores a controller state for projection polling', () => {
    const saved = writeGeometryLiveState({
      presetName: 'Trip Number 1',
      sourceId: 'controller-1',
      cfg: {
        preset: 'Golden Source',
        symmetry: 8,
        complexity: 9,
        glow: 8,
        breathSpeed: 0.7,
        intensity: 9,
        particles: 8,
        luminous: 4,
        stars: 7,
        mode: 'tripnumber1',
      },
    });

    expect(saved.presetName).toBe('Trip Number 1');
    expect(saved.sourceId).toBe('controller-1');
    expect(saved.cfg.mode).toBe('tripnumber1');
    expect(saved.updatedAt).toBeGreaterThan(0);
    expect(readGeometryLiveState()).toEqual(saved);
  });

  it('keeps a valid fallback when bad controller payloads arrive', () => {
    const saved = writeGeometryLiveState({ presetName: '', cfg: { glow: 'not-a-number' } });

    expect(saved.presetName).toBe('Calm Field');
    expect(saved.cfg.glow).toBe(3);
    expect(saved.cfg.mode).toBe('sacred');
  });
});
