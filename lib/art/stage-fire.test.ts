import { describe, expect, it } from 'vitest';

import { BEAT, LIGHTS } from './race-intro';
import { beatTime, STAGE_ALONG, stageJets } from './stage-fire';

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
