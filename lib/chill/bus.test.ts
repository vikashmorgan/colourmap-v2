import { describe, expect, it, vi } from 'vitest';

import { emitChill, onChill, pitchToY } from './bus';

describe('chill bus', () => {
  it('delivers events to listeners until they unsubscribe', () => {
    const l = vi.fn();
    const off = onChill(l);
    emitChill({ kind: 'kick', x: 0.5, y: 0.5, strength: 1 });
    expect(l).toHaveBeenCalledWith({ kind: 'kick', x: 0.5, y: 0.5, strength: 1 });
    off();
    emitChill({ kind: 'note', x: 0, y: 0, strength: 0.2 });
    expect(l).toHaveBeenCalledTimes(1);
  });

  it('maps pitch to height, high notes on top', () => {
    expect(pitchToY(55)).toBe(1);
    expect(pitchToY(55 * 32)).toBe(0);
    expect(pitchToY(440)).toBeLessThan(pitchToY(110));
    expect(pitchToY(0)).toBe(0.5);
    expect(pitchToY(20000)).toBe(0);
  });
});
