import { describe, expect, it } from 'vitest';
import { makeTrack } from './track';
import { BYPASS, compileTrack, type TrackData } from './track-data';
import gold from './tracks/gold.json';

const DOCS = { gold: gold as unknown as TrackData };

import {
  choosesStraight,
  nearTwist,
  newWreck,
  offTwist,
  STRAIGHT,
  stepWreck,
  twistEntry,
  twistOpen,
  WRECK,
} from './wreck';

describe('off the twist (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  const t = makeTrack(def);
  const tw = (DOCS.gold.features ?? []).find((f) => f.kind === 'twist') as {
    at: number;
    length: number;
  };
  const mid = tw.at + tw.length / 2;

  it('opens the edges only well into a twist', () => {
    expect(twistOpen(def, mid)).toBe(true);
    expect(twistOpen(def, tw.at - 20)).toBe(false);
    expect(offTwist(t, mid, def.half(mid) + 2)).toBe(true);
    expect(offTwist(t, mid, -def.half(mid) - 2)).toBe(true);
    expect(offTwist(t, mid, def.half(mid) - 1)).toBe(false);
    expect(offTwist(t, tw.at - 20, 40)).toBe(false);
    // The bypass lane beside it is road.
    expect(offTwist(t, mid, -BYPASS.OUT)).toBe(false);
  });

  it('throws you out from the axis, dives ever faster, blows up, then calls the race', () => {
    const w = newWreck({ x: 0, y: 0, z: 30 }, { vx: 60, vy: 0 }, { x: 0, y: 0, z: 18 });
    expect(w.vz).toBeCloseTo(WRECK.THROW);
    const flags: string[] = [];
    let last = w.vz;
    for (let i = 0; i < 60 * 4; i++) {
      const f = stepWreck(w, 1 / 60);
      expect(w.vz).toBeLessThan(last);
      last = w.vz;
      if (f.boom) flags.push(`boom ${w.t.toFixed(1)}`);
      if (f.over) flags.push(`over ${w.t.toFixed(1)}`);
    }
    expect(flags).toEqual([`boom ${WRECK.BOOM.toFixed(1)}`, `over ${WRECK.OVER.toFixed(1)}`]);
    expect(w.z).toBeLessThan(-100);
  });
});

describe('straight through a twist (2026-11-22)', () => {
  const def = compileTrack(DOCS.gold);
  let start = 0;
  for (let s = 2000; s < 3500; s += 1)
    if ((def.twist?.(s) ?? 0) !== 0) {
      start = s;
      break;
    }

  it('is chosen on the centre strip at the twist start, not from its sides or mid-twist', () => {
    expect(choosesStraight(def, start, 0)).toBe(true);
    expect(choosesStraight(def, start, STRAIGHT.STRIP - 0.5)).toBe(true);
    expect(choosesStraight(def, start, STRAIGHT.STRIP + 2)).toBe(false);
    expect(choosesStraight(def, start + 150, 0)).toBe(false);
    expect(choosesStraight(def, start - 50, 0)).toBe(false);
    const e = twistEntry(def, start);
    expect(e && e.end > start + 100).toBe(true);
  });

  it('marks the stretch before each twist and the twist itself', () => {
    expect(nearTwist(def, start - 200)).toBe(true);
    expect(nearTwist(def, start + 100)).toBe(true);
    expect(nearTwist(def, start - STRAIGHT.LEAD - 100)).toBe(false);
  });
});
