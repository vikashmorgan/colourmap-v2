import { describe, expect, it } from 'vitest';

import { BEAT, LIGHTS } from './race-intro';
import { ARCH_ANGLES, archJets, archPoint, beatTime, STAGE_ALONG, stageJets } from './stage-fire';

describe('the start’s stage fire (2026-11-22)', () => {
  const jets = stageJets();

  it('stands in mirror pairs on both edges of the grid', () => {
    expect(jets).toHaveLength(STAGE_ALONG.length * 2);
    for (const along of STAGE_ALONG) {
      const pair = jets.filter((j) => j.along === along);
      expect(pair.map((j) => j.side).sort()).toEqual([-1, 1]);
      expect(pair[0].bursts).toEqual(pair[1].bursts);
    }
  });

  it('runs up the road with the count: the nearest pair on 3, the next on 2, the next on 1', () => {
    for (let beat = 0; beat < LIGHTS; beat++) {
      const firing = jets.filter((j) => j.bursts.some((b) => b.beat === beat));
      expect(firing.map((j) => j.along)).toEqual([STAGE_ALONG[beat], STAGE_ALONG[beat]]);
    }
    // Nearest first, so the fire runs away up the road.
    expect([...STAGE_ALONG]).toEqual([...STAGE_ALONG].sort((a, b) => a - b));
  });

  it('fires everything on GO, with sparks, the farthest pair tallest', () => {
    const go = jets.map((j) => j.bursts.find((b) => b.beat === LIGHTS));
    expect(go.every((b) => b?.sparks)).toBe(true);
    const front = jets.filter((j) => j.along === STAGE_ALONG.at(-1));
    const tallest = Math.max(...go.map((b) => b?.height ?? 0));
    for (const j of front) expect(j.bursts.at(-1)?.height).toBe(tallest);
    expect(beatTime(LIGHTS)).toBeCloseTo(BEAT * LIGHTS, 9);
  });
});

describe('the start arch (2026-11-22)', () => {
  const jets = archJets();

  it('climbs the arch with the count, mirror pairs, feet first', () => {
    for (let beat = 0; beat < LIGHTS; beat++) {
      const firing = jets.filter((j) => j.bursts.some((b) => b.beat === beat));
      expect(firing.map((j) => j.arch)).toEqual([ARCH_ANGLES[beat], ARCH_ANGLES[beat]]);
      expect(firing.map((j) => j.side).sort()).toEqual([-1, 1]);
    }
  });

  it('roars all at once on GO, the crown tallest', () => {
    const go = jets.map((j) => j.bursts.find((b) => b.beat === LIGHTS));
    expect(go.every(Boolean)).toBe(true);
    const crown = jets.find((j) => j.arch === Math.PI / 2);
    expect(crown?.bursts.at(-1)?.height).toBe(Math.max(...go.map((b) => b?.height ?? 0)));
  });

  it('stands on a half circle over the road', () => {
    const r = 20;
    const foot = archPoint(0, 1, r);
    expect(foot.y).toBeCloseTo(0, 9);
    expect(foot.z).toBeCloseTo(-r, 9);
    expect(archPoint(Math.PI / 2, 1, r).y).toBeCloseTo(r, 9);
    expect(archPoint(0.5, -1, r).z).toBeCloseTo(-archPoint(0.5, 1, r).z, 9);
  });
});
