import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  designStart,
  dressingFor,
  MARKING,
  move,
  pickKey,
  SURFACE_STYLE,
  safePicks,
  safePos,
} from './design-space';
import { GATE_STYLES } from './track-data';

describe('the design space catalogue', () => {
  it('has eleven categories of six or seven variations, ids unique within each', () => {
    expect(CATEGORIES).toHaveLength(11);
    for (const c of CATEGORIES) {
      expect(c.vars.length).toBeGreaterThanOrEqual(6);
      expect(new Set(c.vars.map((v) => v.id)).size).toBe(c.vars.length);
      for (const v of c.vars) expect(v.note.length).toBeGreaterThan(10);
    }
  });

  it('ends on the Gates, one cell for each of the gates’ looks', () => {
    const gates = CATEGORIES[CATEGORIES.length - 1];
    expect(gates.id).toBe('gates');
    expect(gates.vars.map((v) => v.id)).toEqual([...GATE_STYLES]);
  });

  it('gives every surface and marking a shader number', () => {
    const surf = CATEGORIES.find((c) => c.id === 'surface');
    const marks = CATEGORIES.find((c) => c.id === 'markings');
    for (const v of surf?.vars ?? []) expect(SURFACE_STYLE[v.id]).toBeTypeOf('number');
    for (const v of marks?.vars ?? []) expect(MARKING[v.id]).toBeGreaterThan(0);
  });
});

describe('moving round it', () => {
  it('goes right to the next category and up to the next variation, wrapping', () => {
    expect(move({ cat: 0, v: 0 }, 1, 0)).toEqual({ cat: 1, v: 0 });
    expect(move({ cat: 0, v: 0 }, -1, 0)).toEqual({ cat: CATEGORIES.length - 1, v: 0 });
    expect(move({ cat: 0, v: 0 }, 0, 1)).toEqual({ cat: 0, v: 1 });
    expect(move({ cat: 0, v: 0 }, 0, -1)).toEqual({ cat: 0, v: CATEGORIES[0].vars.length - 1 });
  });

  it('keeps the row on a new category when it has one, else its last', () => {
    const fw = CATEGORIES.findIndex((c) => c.id === 'fireworks');
    const last = CATEGORIES[fw].vars.length - 1;
    expect(move({ cat: fw, v: last }, 1, 0).v).toBe(CATEGORIES[fw + 1].vars.length - 1);
    expect(move({ cat: fw - 1, v: 2 }, 1, 0)).toEqual({ cat: fw, v: 2 });
  });
});

describe('saved state', () => {
  it('falls back to the first cell for anything unknown', () => {
    expect(safePos(null)).toEqual({ cat: 0, v: 0 });
    expect(safePos([99, 0])).toEqual({ cat: 0, v: 0 });
    expect(safePos([1, 99])).toEqual({ cat: 1, v: 0 });
    expect(safePos([2, 3])).toEqual({ cat: 2, v: 3 });
  });

  it('keeps only picks that still name a cell, once each', () => {
    const k = pickKey({ cat: 0, v: 1 });
    expect(k).toBe('Fire arches · Flame pillars');
    expect(safePicks([k, k, 'Nope · Gone', 3])).toEqual([k]);
    expect(safePicks('x')).toEqual([]);
  });
});

describe('the districts on their own tracks', () => {
  it('dresses Chinatown Run and the Neon District in their own pieces, nothing elsewhere', () => {
    const ct = dressingFor('chinatown').map((p) => CATEGORIES[p.cat].id);
    expect(ct.length).toBeGreaterThan(2);
    expect(new Set(ct)).toEqual(new Set(['chinatown', 'slide']));
    expect(dressingFor('neon').map((p) => CATEGORIES[p.cat].vars[p.v].id)).toContain('jumps');
    expect(dressingFor('salt')).toEqual([]);
    expect(dressingFor('mars')).toEqual([]);
  });

  it('runs the stage passages on every road (2026-11-24)', () => {
    for (const w of ['gold', 'coast', 'canyon', 'night', 'chinatown', 'neon', 'sky'])
      expect(dressingFor(w).map((p) => CATEGORIES[p.cat].vars[p.v].id)).toContain('passage');
  });

  it('opens the design space on the district’s own category there, else where you left it', () => {
    const saved = { cat: 2, v: 1 };
    expect(CATEGORIES[designStart('chinatown', saved).cat].id).toBe('chinatown');
    expect(CATEGORIES[designStart('neon', saved).cat].id).toBe('neon');
    expect(designStart('gold', saved)).toEqual(saved);
  });
});
