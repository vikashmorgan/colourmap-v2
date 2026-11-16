import { describe, expect, it } from 'vitest';

import { backdropFragment, FIRE_VERTEX } from './drive-shaders';
import { MESAS } from './salt-flat-game';

describe('Drive shaders', () => {
  it('builds each backdrop with its world and the mesas filled in', () => {
    for (const w of ['salt', 'coast', 'canyon', 'night'] as const) {
      const src = backdropFragment(w, MESAS);
      expect(src).toMatch(/^#define WORLD \d/);
      expect(src).not.toContain('/*MESAS*/');
      expect(src).toContain('void main()');
    }
  });

  it('never takes atan(0, 0) at the flame tip (NaN there spreads through the bloom)', () => {
    expect(FIRE_VERTEX).toContain('atan(position.z, position.x + 1e-4)');
  });
});
