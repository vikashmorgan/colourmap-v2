import { describe, expect, it } from 'vitest';

import { JOURNEYS, PAL } from './GeometryField';

/**
 * The Reconnect Festival (Gstaad) projection programs: long-form journeys
 * that loop seamlessly. These tests lock the two contracts that matter for a
 * live set — each program runs ~20 minutes, and every stage points at a real
 * palette (the renderer resolves colour via PAL[stage.preset]; a name that
 * isn't a PAL key silently falls back to the warm "Calm Field" palette).
 */
const FESTIVAL_IDS = [12, 13, 14] as const;

function journeyById(id: number) {
  const j = JOURNEYS.find((entry) => entry.id === id);
  if (!j) throw new Error(`journey ${id} missing`);
  return j;
}

function totalDuration(id: number): number {
  return journeyById(id).stages.reduce((sum, stage) => sum + stage.duration, 0);
}

describe('GeometryField journeys', () => {
  it('keeps journey ids aligned with their array index (JOURNEYS[id - 1] lookup)', () => {
    // The playback engine resolves the active journey via JOURNEYS[id - 1],
    // so a gap or out-of-order id would play the wrong program.
    JOURNEYS.forEach((journey, index) => {
      expect(journey.id).toBe(index + 1);
    });
  });

  it('ships the three 20-minute festival programs', () => {
    const names = FESTIVAL_IDS.map((id) => journeyById(id).name);
    expect(names).toEqual(['Cathedral of Light', 'Cosmos Drift', 'Desert Temple']);
  });

  it('runs each festival program for ~20 minutes', () => {
    for (const id of FESTIVAL_IDS) {
      const seconds = totalDuration(id);
      // 19–21 minutes — long enough to immerse, tunable without breaking the test.
      expect(seconds).toBeGreaterThanOrEqual(19 * 60);
      expect(seconds).toBeLessThanOrEqual(21 * 60);
    }
  });

  it('points every festival stage at a real palette (no silent fallback)', () => {
    for (const id of FESTIVAL_IDS) {
      for (const stage of journeyById(id).stages) {
        expect(PAL[stage.preset], `${journeyById(id).name} → ${stage.name}`).toBeDefined();
      }
    }
  });

  it('gives each festival program enough acts to breathe and morph', () => {
    for (const id of FESTIVAL_IDS) {
      expect(journeyById(id).stages.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('Trip Number 4 is a valid, seamlessly-looping trip', () => {
    const t4 = JOURNEYS.find((j) => j.name === 'Trip Number 4');
    expect(t4).toBeDefined();
    if (!t4) return;
    for (const stage of t4.stages) {
      expect(PAL[stage.preset], `Trip Number 4 -> ${stage.name}`).toBeDefined();
    }
    // Seamless loop: the final act eases back into the first (same palette + mode).
    expect(t4.stages.at(-1)?.preset).toBe(t4.stages[0].preset);
    expect(t4.stages.at(-1)?.mode).toBe(t4.stages[0].mode);
  });

  it('Trip Number 5 cycles the dot-walkers with valid palettes', () => {
    const t5 = JOURNEYS.find((j) => j.name === 'Trip Number 5');
    expect(t5).toBeDefined();
    if (!t5) return;
    for (const stage of t5.stages) {
      expect(stage.mode).toBe('dotwalker');
      expect(PAL[stage.preset], `Trip Number 5 -> ${stage.name}`).toBeDefined();
    }
    // Walker shape is driven by symmetry (1-5); it should visit every design.
    const designs = new Set(t5.stages.map((s) => s.symmetry));
    for (const d of [1, 2, 3, 4, 5]) expect(designs.has(d)).toBe(true);
    // Count is driven by stars; it alternates solo (1) and trio (3).
    expect(t5.stages.some((s) => s.stars === 1)).toBe(true);
    expect(t5.stages.some((s) => s.stars === 3)).toBe(true);
  });

  it('Trip Number 1 and 3 are valid, seamlessly-looping trips', () => {
    for (const name of ['Trip Number 1', 'Trip Number 3']) {
      const trip = JOURNEYS.find((j) => j.name === name);
      expect(trip, name).toBeDefined();
      if (!trip) continue;
      expect(trip.stages.length).toBeGreaterThanOrEqual(8);
      for (const stage of trip.stages) {
        expect(PAL[stage.preset], `${name} -> ${stage.name}`).toBeDefined();
      }
      // Seamless loop: final act eases back into the first (same palette + mode).
      expect(trip.stages.at(-1)?.preset).toBe(trip.stages[0].preset);
      expect(trip.stages.at(-1)?.mode).toBe(trip.stages[0].mode);
    }
  });

  it('Trip 6, Trip 7, Mega Trip and Magnetic Sands are valid, looping trips', () => {
    for (const name of ['Trip Number 6', 'Trip Number 7', 'Mega Trip', 'Magnetic Sands']) {
      const trip = JOURNEYS.find((j) => j.name === name);
      expect(trip, name).toBeDefined();
      if (!trip) continue;
      expect(trip.stages.length).toBeGreaterThanOrEqual(6);
      for (const stage of trip.stages) {
        expect(PAL[stage.preset], `${name} -> ${stage.name}`).toBeDefined();
      }
      expect(trip.stages.at(-1)?.preset).toBe(trip.stages[0].preset);
      expect(trip.stages.at(-1)?.mode).toBe(trip.stages[0].mode);
    }
  });

  it('Long Trip combines many modes into one valid, looping set', () => {
    const long = JOURNEYS.find((j) => j.name === 'Long Trip');
    expect(long).toBeDefined();
    if (!long) return;
    // It's a long, varied journey.
    expect(long.stages.length).toBeGreaterThanOrEqual(12);
    expect(new Set(long.stages.map((s) => s.mode)).size).toBeGreaterThanOrEqual(8);
    for (const stage of long.stages) {
      expect(PAL[stage.preset], `Long Trip -> ${stage.name}`).toBeDefined();
    }
    // Seamless loop.
    expect(long.stages.at(-1)?.preset).toBe(long.stages[0].preset);
    expect(long.stages.at(-1)?.mode).toBe(long.stages[0].mode);
  });

  it('builds the Diaporama play-all program from the featured presets', () => {
    const dia = JOURNEYS.find((j) => j.name === 'Diaporama — Play All');
    expect(dia).toBeDefined();
    if (!dia) return;
    // Many slides (the whole featured library, capped at 76). Each carries a
    // preset palette + a mode; some modes self-colour (fire/gravity) so we don't
    // require a PAL entry here — just a well-formed stage.
    expect(dia.stages.length).toBeGreaterThanOrEqual(40);
    expect(dia.stages.length).toBeLessThanOrEqual(76);
    for (const stage of dia.stages) {
      expect(typeof stage.preset, `Diaporama -> ${stage.name}`).toBe('string');
      expect(stage.mode, `Diaporama -> ${stage.name}`).toBeTruthy();
    }
  });

  it('Trip Number 3 evolves through a sacred pyramid, anchored in triangles', () => {
    const t3 = JOURNEYS.find((j) => j.name === 'Trip Number 3');
    expect(t3).toBeDefined();
    if (!t3) return;
    expect(t3.stages.length).toBeGreaterThanOrEqual(12);
    // The requested evolution: a sacred pyramid act, still anchored in the
    // triangle trip, with no hard kaleidoscope slice anywhere.
    expect(t3.stages.some((s) => s.mode === 'pyramid3d')).toBe(true);
    expect(t3.stages.some((s) => s.mode === 'tripnumber3')).toBe(true);
    expect(t3.stages.every((s) => s.mode !== 'kaleidoscope')).toBe(true);
  });

  it('Oil Projector is an oils-only, seamlessly looping journey', () => {
    const oil = JOURNEYS.find((j) => j.name === 'Oil Projector');
    expect(oil).toBeDefined();
    if (!oil) return;
    const oilModes = ['oilwarp', 'ripplefold', 'thinfilm', 'twooil', 'lavalamp', 'rorschach'];
    for (const stage of oil.stages) {
      expect(oilModes).toContain(stage.mode);
      expect(PAL[stage.preset], `Oil Projector -> ${stage.name}`).toBeDefined();
    }
    expect(oil.stages.some((s) => s.mode === 'rorschach')).toBe(true);
    expect(oil.stages.at(-1)?.mode).toBe(oil.stages[0].mode);
    expect(oil.stages.at(-1)?.preset).toBe(oil.stages[0].preset);
  });
});
