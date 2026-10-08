import { describe, expect, it } from 'vitest';

import {
  ART_TABS,
  artTabOf,
  FEATURED_PRESETS,
  featuredFor,
  OIL_PALETTES,
  PRESETS,
  TRIP1_FLOW_SHAPES,
} from './GeometryField';

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

  it('groups the math tunnels and the oils into their own categories', () => {
    const section = (header: string) => {
      const start = FEATURED_PRESETS.findIndex((i) => 'header' in i && i.header === header);
      const rest = FEATURED_PRESETS.slice(start + 1);
      const end = rest.findIndex((i) => 'header' in i);
      return rest
        .slice(0, end === -1 ? undefined : end)
        .flatMap((i) => ('name' in i ? [i.name] : []));
    };
    const tunnels = section('Tunnels');
    const oils = section('Oils');
    expect(tunnels).toContain('Golden Zoom');
    expect(tunnels).toContain('Shader Tunnel');
    expect(oils).toEqual(
      expect.arrayContaining(['Oil Warp', 'Two Oil Projector', 'Lava Lamp', 'Rorschach Oils']),
    );
    expect(oils.some((n) => tunnels.includes(n))).toBe(false);
    for (const name of [...tunnels, ...oils]) expect(PRESETS[name], name).toBeDefined();
  });

  it('Rorschach Oils is a two-mirror inkblot, Mirror Oils a kaleidoscope', () => {
    expect(PRESETS['Rorschach Oils'].mode).toBe('rorschach');
    expect(PRESETS['Rorschach Oils'].symmetry).toBe(2);
    expect(PRESETS['Mirror Oils'].symmetry).toBeGreaterThan(2);
  });

  it('Trip Number 1 Flow sits next to Trip Number 1 and drops the sliced shapes', () => {
    const names = featuredNames();
    expect(names.indexOf('Trip Number 1 Flow')).toBe(names.indexOf('Trip Number 1') + 1);
    expect(PRESETS['Trip Number 1 Flow'].mode).toBe('tripnumber1flow');
    // 6 = petals sliced into sectors, 7 = stacked ring slices.
    expect(TRIP1_FLOW_SHAPES).not.toContain(6);
    expect(TRIP1_FLOW_SHAPES).not.toContain(7);
    expect(TRIP1_FLOW_SHAPES).toHaveLength(8);
  });

  it('keeps Magnetic Sands and Waves as their own categories', () => {
    const names = (header: string) => {
      const start = FEATURED_PRESETS.findIndex((i) => 'header' in i && i.header === header);
      const rest = FEATURED_PRESETS.slice(start + 1);
      const end = rest.findIndex((i) => 'header' in i);
      return rest
        .slice(0, end === -1 ? undefined : end)
        .flatMap((i) => ('name' in i ? [i.name] : []));
    };
    expect(names('Magnetic Sands')).toEqual([
      'Cymatic Sands 1',
      'Cymatic Sands 2',
      'Cymatic Sands 3',
      'Cymatic Sands 4',
    ]);
    expect(names('Waves')).toEqual(['Rolling Wave', 'Fractal Wave']);
    expect(PRESETS['Rolling Wave'].mode).toBe('rollingwave');
    expect(PRESETS['Fractal Wave'].mode).toBe('fractalwave');
  });

  it('splits the Art programs into Stars, Geometry, Tunnels and Oils', () => {
    expect(ART_TABS.map((t) => t.label)).toEqual(['Stars', 'Geometry', 'Tunnels', 'Oils']);
    const tabOf = (name: string) => artTabOf(PRESETS[name].mode);
    expect(tabOf('Magnetic Sand')).toBe('stars');
    expect(tabOf('Trip Number 1')).toBe('stars');
    expect(tabOf('Cymatic Sands 1')).toBe('stars');
    expect(tabOf('Yantra 3D')).toBe('geometry');
    expect(tabOf('Rolling Wave')).toBe('geometry');
    expect(tabOf('Dot Tunnel')).toBe('tunnels');
    expect(tabOf('Golden Zoom')).toBe('tunnels');
    expect(tabOf('Oil Warp')).toBe('oils');
    expect(tabOf('Rorschach Oils')).toBe('oils');
  });

  it('shows every featured preset in exactly one tab, keeping only headers that have presets', () => {
    const all = featuredNames().filter((n) => PRESETS[n]);
    const perTab = ART_TABS.map((t) =>
      featuredFor(t.id).flatMap((i) => ('name' in i ? [i.name] : [])),
    );
    expect(perTab.flat().sort()).toEqual([...all].sort());
    for (const list of perTab) expect(list.length).toBeGreaterThan(0);
    for (const t of ART_TABS) {
      const items = featuredFor(t.id);
      items.forEach((item, k) => {
        if ('header' in item) expect(items[k + 1] && 'name' in items[k + 1]).toBe(true);
      });
    }
  });

  it('puts the Thangka with the oils, each preset with its own design seed', () => {
    for (const name of ['Thangka', 'Thangka Lapis', 'Thangka Crimson']) {
      expect(PRESETS[name].mode).toBe('thangka');
      expect(artTabOf(PRESETS[name].mode)).toBe('oils');
    }
    const seeds = new Set(
      ['Thangka', 'Thangka Lapis', 'Thangka Crimson'].map((n) => PRESETS[n].seed),
    );
    expect(seeds.size).toBe(3);
  });

  it('offers oil palettes of four valid colours each, and the Lava Lamp starts in Lava', () => {
    expect(OIL_PALETTES.length).toBeGreaterThanOrEqual(8);
    for (const p of OIL_PALETTES) {
      expect(p.colors).toHaveLength(4);
      for (const c of p.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
    const lava = OIL_PALETTES.find((p) => p.name === 'Lava');
    expect(PRESETS['Lava Lamp'].oilColors).toEqual(lava?.colors);
  });
});
