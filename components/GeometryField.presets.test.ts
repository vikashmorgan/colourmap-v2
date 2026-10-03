import { describe, expect, it } from 'vitest';

import { FEATURED_PRESETS, PRESETS } from './GeometryField';

function featuredNames() {
  return FEATURED_PRESETS.flatMap((item) => ('name' in item ? [item.name] : []));
}

describe('GeometryField featured presets', () => {
  it('keeps weaker depth presets at the bottom of the good list and removes Volcano', () => {
    const names = featuredNames();

    expect(names).not.toContain('Volcano');
    expect(names.indexOf('Embrace')).toBeGreaterThan(names.indexOf('Entropy 3D'));
    expect(names.indexOf('Dot Tunnel')).toBeGreaterThan(names.indexOf('Entropy 3D'));
  });

  it('lists the unfinished Star Sand Lines last, under In Progress, not in Good Ones', () => {
    const names = featuredNames();
    const inProgress = FEATURED_PRESETS.findIndex(
      (item) => 'header' in item && item.header === 'In Progress / To Develop',
    );
    const starSand = FEATURED_PRESETS.findIndex(
      (item) => 'name' in item && item.name === 'Star Sand Lines',
    );

    expect(names.filter((name) => name === 'Star Sand Lines')).toHaveLength(1);
    expect(names.at(-1)).toBe('Star Sand Lines');
    expect(starSand).toBeGreaterThan(inProgress);
  });

  it('keeps Swirl Dot Tunnel bright enough for the good list', () => {
    expect(PRESETS['Swirl Dot Tunnel'].preset).toBe('Golden Source');
    expect(PRESETS['Swirl Dot Tunnel'].glow).toBeGreaterThanOrEqual(8);
    expect(PRESETS['Swirl Dot Tunnel'].luminous).toBeGreaterThanOrEqual(4);
  });

  it('keeps Atomic Explosion calm — fine points, not big blown-out dots', () => {
    expect(PRESETS['Atomic Explosion'].preset).toBe('Golden Source');
    // Toned down to match the other presets' light (was glow 8.2 / luminous 4.2).
    expect(PRESETS['Atomic Explosion'].glow).toBeLessThanOrEqual(6);
    expect(PRESETS['Atomic Explosion'].luminous).toBeLessThanOrEqual(3.2);
  });
});
