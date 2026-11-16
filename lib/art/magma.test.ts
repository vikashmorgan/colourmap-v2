import { describe, expect, it } from 'vitest';

import {
  BUBBLES,
  boilCount,
  bubbleAt,
  DOT_CONVECT,
  DOT_CORE,
  DOT_SPRAY,
  ERUPT_EMBER,
  ERUPT_LOOP,
  eruptCount,
  fieldAt,
  flowAt,
  heatShift,
  LINE_POINTS,
  LOOPS,
  lineCount,
  loopAt,
  MAGMA_STOPS,
  METHODS,
  magmaColour,
  makeBoilDots,
  makeEruption,
  makeLines,
  methodOf,
  pulseAt,
  rotate,
  SHELLS,
  streamAt,
  swellOf,
  tangentOf,
  tick,
  traceLines,
  VENTS,
  type Vec3,
  ventAt,
} from './magma';

const len = (v: ArrayLike<number>, o = 0) => Math.hypot(v[o], v[o + 1], v[o + 2]);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('Magma Cores: methods and colour', () => {
  it('has five methods, the slider value rounded and clamped', () => {
    expect(METHODS.map((m) => m.name)).toEqual([
      'Boiling Magma',
      'Molten Core',
      'Cracked Crust',
      'Magma Currents',
      'Eruptive Core',
    ]);
    expect(methodOf(2.4)).toBe(2);
    expect(methodOf(9)).toBe(4);
    expect(methodOf(-1)).toBe(0);
    expect(methodOf(Number.NaN)).toBe(0);
  });

  it('runs from near-black through red and orange to yellow', () => {
    const cold = magmaColour(0);
    const hot = magmaColour(1);
    expect(Math.max(...cold)).toBeLessThan(0.05);
    expect(hot[0]).toBeCloseTo(1);
    expect(hot[1]).toBeGreaterThan(0.9);
    const red = magmaColour(0.38);
    expect(red[0]).toBeGreaterThan(red[1] * 4);
    const orange = magmaColour(0.62);
    expect(orange[1] / orange[0]).toBeGreaterThan(0.3);
    expect(orange[1] / orange[0]).toBeLessThan(0.6);
    // Red rises, then green, then blue: never back down.
    for (let i = 1; i <= 100; i++) {
      const a = magmaColour((i - 1) / 100);
      const b = magmaColour(i / 100);
      for (let c = 0; c < 3; c++) expect(b[c]).toBeGreaterThanOrEqual(a[c] - 1e-9);
    }
    expect(magmaColour(2)).toEqual([...MAGMA_STOPS[MAGMA_STOPS.length - 1].rgb]);
  });

  it('leans hotter or colder with the Heat slider, barely moving at the default', () => {
    expect(Math.abs(heatShift(0.5, 0.7) - 0.5)).toBeLessThan(0.05);
    expect(heatShift(0.5, 1)).toBeGreaterThan(heatShift(0.5, 0.7));
    expect(heatShift(0.5, 0.1)).toBeLessThan(heatShift(0.5, 0.7));
    expect(heatShift(1, 1.5)).toBe(1);
    expect(heatShift(0, 0)).toBe(0);
  });
});

describe('Magma Cores: geometry helpers', () => {
  it('finds a tangent and turns about an axis', () => {
    const d: Vec3 = [0.3, 0.4, Math.sqrt(1 - 0.25)];
    const t = tangentOf(d, 1.2);
    expect(dot(d, t)).toBeCloseTo(0);
    expect(len(t)).toBeCloseTo(1);
    const r = rotate([1, 0, 0], [0, 0, 1], Math.PI / 2);
    expect(r[0]).toBeCloseTo(0);
    expect(r[1]).toBeCloseTo(1);
  });

  it('keeps one clock that the Speed slider scales and that skips long gaps', () => {
    const c = { last: null, time: 0 };
    tick(c, 0, 1);
    tick(c, 50, 1);
    expect(c.time).toBeCloseTo(0.05);
    tick(c, 100, 2);
    expect(c.time).toBeCloseTo(0.15);
    tick(c, 60000, 1);
    expect(c.time).toBeCloseTo(0.25);
    tick(c, 60050, 0);
    expect(c.time).toBeCloseTo(0.25);
  });
});

describe('Magma Cores: boiling dots', () => {
  it('asks for thousands of dots, more with Detail', () => {
    expect(boilCount(1)).toBe(6000);
    expect(boilCount(10)).toBe(26000);
    expect(boilCount(6)).toBeGreaterThan(boilCount(3));
  });

  it('makes churning, inner and spray dots, repeatably', () => {
    const a = makeBoilDots(4000);
    const b = makeBoilDots(4000);
    expect(a.seed).toEqual(b.seed);
    const kinds = [0, 0, 0];
    for (let i = 0; i < a.n; i++) {
      const k = a.kind[i];
      kinds[k]++;
      if (k === DOT_CONVECT) {
        expect(len(a.position, i * 3)).toBeCloseTo(1, 4);
        const c: Vec3 = [a.position[i * 3], a.position[i * 3 + 1], a.position[i * 3 + 2]];
        const t: Vec3 = [a.tangent[i * 3], a.tangent[i * 3 + 1], a.tangent[i * 3 + 2]];
        expect(Math.abs(dot(c, t))).toBeLessThan(1e-4);
      } else if (k === DOT_CORE) {
        expect(len(a.position, i * 3)).toBeLessThanOrEqual(0.6 + 1e-6);
      } else {
        const bub = Math.floor(a.seed[i * 4 + 2] * BUBBLES);
        expect(bub).toBeGreaterThanOrEqual(0);
        expect(bub).toBeLessThan(BUBBLES);
      }
    }
    expect(kinds[DOT_CONVECT] / a.n).toBeCloseTo(0.7, 1);
    expect(kinds[DOT_CORE] / a.n).toBeCloseTo(0.2, 1);
    expect(kinds[DOT_SPRAY] / a.n).toBeCloseTo(0.1, 1);
  });

  it('swells bubbles slowly, collapses them once they burst, and moves them only when flat', () => {
    expect(swellOf(0)).toBe(0);
    expect(swellOf(0.4)).toBeGreaterThan(swellOf(0.2));
    expect(swellOf(0.749)).toBeGreaterThan(0.99);
    expect(swellOf(0.9)).toBe(0);
    // A bubble keeps its place through its life.
    const b0 = bubbleAt(3, 100);
    const b1 = bubbleAt(3, 100.5);
    if (b1.phase > b0.phase) expect(b1.dir).toEqual(b0.dir);
    expect(len(b0.dir)).toBeCloseTo(1);
    // Between frames the swell changes smoothly: never a pop.
    for (let t = 0; t < 60; t += 1 / 60) {
      for (let k = 0; k < BUBBLES; k++) {
        const s0 = swellOf(bubbleAt(k, t).phase);
        const s1 = swellOf(bubbleAt(k, t + 1 / 60).phase);
        expect(Math.abs(s1 - s0)).toBeLessThan(0.12);
      }
    }
  });
});

describe('Magma Cores: currents', () => {
  it('flows along the sphere without leaving it, along level lines of the stream function', () => {
    const f = fieldAt(12);
    const p: Vec3 = [0.48, -0.6, 0.64];
    const l = Math.hypot(...p);
    const u: Vec3 = [p[0] / l, p[1] / l, p[2] / l];
    const v = flowAt(f, u);
    expect(Math.abs(dot(u, v))).toBeLessThan(1e-9);
    // A small step along the flow keeps the stream function the same, to first order.
    const h = 1e-4;
    const s0 = streamAt(f, u);
    const step: Vec3 = [u[0] + v[0] * h, u[1] + v[1] * h, u[2] + v[2] * h];
    expect(Math.abs(streamAt(f, step) - s0)).toBeLessThan(1e-7);
  });

  it('traces every line on its shell, centred on its seed, bending slowly as time goes on', () => {
    expect(lineCount(1)).toBe(90);
    expect(lineCount(10)).toBe(260);
    const lines = makeLines(40);
    traceLines(lines, 5, 0.5);
    const segs = LINE_POINTS - 1;
    for (let i = 0; i < lines.n; i++) {
      const r = SHELLS[lines.shell[i]];
      for (let j = 0; j < segs * 2; j++) {
        expect(len(lines.positions, (i * segs * 2 + j) * 3)).toBeCloseTo(r, 4);
      }
      // Segments join end to start.
      for (let j = 1; j < segs; j++) {
        const end = (i * segs + j - 1) * 2 + 1;
        const start = (i * segs + j) * 2;
        expect(lines.positions[end * 3]).toBe(lines.positions[start * 3]);
      }
    }
    for (const h of lines.heat) {
      expect(h).toBeGreaterThan(0.45);
      expect(h).toBeLessThanOrEqual(1);
    }
    const before = Float32Array.from(lines.positions);
    traceLines(lines, 5 + 1 / 60, 0.5);
    let worst = 0;
    for (let k = 0; k < before.length; k++)
      worst = Math.max(worst, Math.abs(before[k] - lines.positions[k]));
    expect(worst).toBeLessThan(0.05);
  });
});

describe('Magma Cores: eruption', () => {
  it('makes loop riders, plume particles and embers', () => {
    expect(eruptCount(1)).toBe(4000);
    expect(eruptCount(10)).toBe(14000);
    const e = makeEruption(3000);
    let loops = 0;
    let embers = 0;
    for (let i = 0; i < e.n; i++) {
      if (e.kind[i] === ERUPT_LOOP) {
        loops++;
        expect(e.index[i]).toBeLessThan(LOOPS);
      } else expect(e.index[i]).toBeLessThan(VENTS);
      if (e.kind[i] === ERUPT_EMBER) embers++;
    }
    expect(loops / e.n).toBeCloseTo(0.45, 1);
    expect(embers / e.n).toBeCloseTo(0.2, 1);
  });

  it('lives and fades its loops and vents, moving them only while unseen', () => {
    for (let k = 0; k < LOOPS; k++) {
      for (let t = 0; t < 120; t += 0.5) {
        const l = loopAt(k, t);
        expect(l.life).toBeGreaterThanOrEqual(0);
        expect(l.life).toBeLessThanOrEqual(1);
        expect(l.height).toBeGreaterThan(0.1);
        expect(l.height).toBeLessThan(0.6);
        const sep = Math.acos(Math.min(1, dot(l.a, l.b)));
        expect(sep).toBeGreaterThan(0.3);
        expect(sep).toBeLessThan(0.8);
        const next = loopAt(k, t + 0.05);
        if (next.a[0] !== l.a[0]) expect(l.life + next.life).toBeLessThan(0.02);
      }
    }
    for (let k = 0; k < VENTS; k++) {
      for (let t = 0; t < 120; t += 0.25) {
        const v = ventAt(k, t);
        const next = ventAt(k, t + 0.05);
        if (next.dir[0] !== v.dir[0]) expect(v.strength + next.strength).toBeLessThan(0.02);
      }
    }
  });

  it('breathes slowly', () => {
    expect(pulseAt(0)).toBeCloseTo(0.5);
    expect(pulseAt(3.5)).toBeCloseTo(1);
    expect(Math.abs(pulseAt(1 / 60) - pulseAt(0))).toBeLessThan(0.01);
  });
});
