import { describe, expect, it } from 'vitest';

import {
  DANCER_NAMES,
  dancer,
  dotAt,
  FIGURE_NAMES,
  figure,
  type Shape,
  sampleDots,
} from './sacred-figures';

const extent = (shapes: readonly Shape[]) => {
  let m = 0;
  for (const s of shapes) {
    if (s.k === 'bone')
      m = Math.max(m, Math.abs(s.ax), Math.abs(s.ay), Math.abs(s.bx), Math.abs(s.by));
    else m = Math.max(m, Math.abs(s.x) + s.r, Math.abs(s.y) + s.r);
  }
  return m;
};

let seed = 1;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe('sacred figures', () => {
  it('has ten figures and five dancers, each named', () => {
    expect(FIGURE_NAMES).toHaveLength(10);
    expect(DANCER_NAMES).toHaveLength(5);
    expect(FIGURE_NAMES).toContain('Shiva Nataraja');
    expect(FIGURE_NAMES).toContain('Thousand-armed Avalokiteshvara');
  });

  it('keeps the same shapes through time, so every dot stays on its own', () => {
    for (let i = 0; i < 10; i++) expect(figure(i, 0).length).toBe(figure(i, 7.3).length);
    for (let i = 0; i < 5; i++) expect(dancer(i, 0).length).toBe(dancer(i, 4.1).length);
  });

  it('fits every figure and dancer in the frame', () => {
    for (let i = 0; i < 10; i++)
      for (const t of [0, 1.7, 5]) expect(extent(figure(i, t))).toBeLessThan(1.05);
    for (let i = 0; i < 5; i++)
      for (const t of [0, 1.7, 5]) expect(extent(dancer(i, t))).toBeLessThan(1.05);
  });

  it('gives the thousand-armed figure many more arms than the Buddha', () => {
    expect(figure(1, 0).length).toBeGreaterThan(figure(0, 0).length * 2);
  });

  it('moves the dancers far more than the seated figures, which only breathe', () => {
    const motion = (f: (t: number) => Shape[]) => {
      const a = f(0);
      const b = f(0.7);
      let sum = 0;
      a.forEach((s, i) => {
        const o = b[i] as Shape;
        if (s.k === 'bone' && o.k === 'bone') sum += Math.hypot(s.bx - o.bx, s.by - o.by);
      });
      return sum / a.length;
    };
    expect(motion((t) => dancer(0, t))).toBeGreaterThan(motion((t) => figure(0, t)) * 3);
  });

  it('scatters dots over the shapes, more on the bigger ones, and places them on their shape', () => {
    const shapes = figure(0, 0);
    const dots = sampleDots(shapes, 4000, rand);
    expect(dots).toHaveLength(4000);
    const counts = new Map<number, number>();
    for (const d of dots) counts.set(d.shape, (counts.get(d.shape) ?? 0) + 1);
    // The torso (the first bone) holds more dots than the ushnisha (a small disc).
    const ushnisha = shapes.findIndex((s) => s.k === 'disc' && s.r === 0.05);
    expect(counts.get(0) ?? 0).toBeGreaterThan(counts.get(ushnisha) ?? 0);
    for (const d of dots.slice(0, 200)) {
      const [x, y] = dotAt(shapes[d.shape], d);
      expect(Math.abs(x)).toBeLessThan(1.1);
      expect(Math.abs(y)).toBeLessThan(1.1);
    }
  });
});
