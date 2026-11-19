import { describe, expect, it } from 'vitest';

import { backdropFragment, FIRE_VERTEX } from './drive-shaders';
import { MESAS } from './salt-flat-game';

describe('Drive shaders', () => {
  it('builds each backdrop with its world and the mesas filled in', () => {
    for (const w of ['salt', 'coast', 'canyon', 'night', 'mars'] as const) {
      const src = backdropFragment(w, MESAS);
      expect(src).toMatch(/^#define WORLD \d/);
      expect(src).not.toContain('/*MESAS*/');
      expect(src).toContain('void main()');
    }
  });

  it('paints Mars on the salt plain: world 4, rust mesas, its own sky', () => {
    const src = backdropFragment('mars', MESAS);
    expect(src.startsWith('#define WORLD 4\n#define MESA_C C(0.5, 0.25, 0.17)')).toBe(true);
    expect(src).toContain('Mars at dusk');
    expect(backdropFragment('salt', MESAS)).toContain('#define MESA_C C(0.42, 0.28, 0.4)');
  });

  it('never takes atan(0, 0) at the flame tip (NaN there spreads through the bloom)', () => {
    expect(FIRE_VERTEX).toContain('atan(position.z, position.x + 1e-4)');
  });
});
