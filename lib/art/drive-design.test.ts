import { describe, expect, it } from 'vitest';

import {
  bestKey,
  DEFAULT_DESIGN,
  DESIGN_KEY,
  FIRES,
  fireById,
  HULLS,
  hullById,
  isWorld,
  loadBest,
  loadDesign,
  parseDesign,
  type Store,
  saveBest,
  saveDesign,
  WORLDS,
} from './drive-design';
import { FLAME_PALETTES } from './flame';
import { WEATHERS } from './weather';

const IDS = WEATHERS.map((w) => w.id);

function memory(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('worlds', () => {
  it('lists the seven worlds on keys 1 to 7', () => {
    expect(WORLDS.map((w) => `${w.key} ${w.name}`)).toEqual([
      '1 Salt Flat',
      '2 Coast Road',
      '3 Canyon Race',
      '4 Night Rain',
      '5 Chinatown Run',
      '6 Neon District',
      '7 Sky Canyon',
    ]);
    expect(isWorld('coast')).toBe(true);
    expect(isWorld('neon')).toBe(true);
    expect(isWorld('moon')).toBe(false);
  });
});

describe('fires', () => {
  it('opens on speed fire: violet, blue, then orange', () => {
    const f = fireById('nope');
    expect(f.id).toBe('speed');
    const [root, mid, tip] = f.stops;
    expect(root[2]).toBeGreaterThan(root[1]);
    expect(mid[2]).toBeGreaterThan(mid[0]);
    expect(tip[0]).toBeGreaterThan(tip[2]);
  });

  it("draws the others from the flame tool's palettes", () => {
    expect(fireById('gas').palette).toBe(FLAME_PALETTES.gas);
    expect(fireById('blaze').palette).toBe(FLAME_PALETTES.blaze);
    expect(fireById('whiteHot').palette).toBe(FLAME_PALETTES.whiteHot);
    // The gas fire is blue, the blaze red-orange, the plasma green.
    expect(fireById('gas').stops[1][2]).toBeGreaterThan(fireById('gas').stops[1][0]);
    expect(fireById('blaze').stops[1][0]).toBeGreaterThan(fireById('blaze').stops[1][2]);
    expect(fireById('plasma').stops[1][1]).toBeGreaterThan(fireById('plasma').stops[1][0]);
    expect(FIRES).toHaveLength(5);
  });
});

describe('hulls', () => {
  it('offers chrome, rust and red', () => {
    expect(HULLS.map((h) => h.name)).toEqual(['Chrome', 'Rust', 'Red']);
    expect(hullById('chrome').metalness).toBe(1);
    expect(hullById('rust').roughness).toBeGreaterThan(0.5);
    expect(hullById('rust').patina).toBeGreaterThan(0);
    expect(hullById('red').clearcoat).toBe(1);
    expect(hullById('nope').id).toBe('red');
  });
});

describe('the design, remembered', () => {
  it('keeps the red car on the salt and the ship on the coast by default', () => {
    expect(DEFAULT_DESIGN.vehicle.salt).toBe('car');
    expect(DEFAULT_DESIGN.vehicle.coast).toBe('ship');
  });

  it('reads back what was saved, and falls back on anything odd', () => {
    const store = memory();
    const d = {
      ...DEFAULT_DESIGN,
      fire: 'plasma' as const,
      hull: 'chrome' as const,
      weather: 'snow',
    };
    d.vehicle = { ...d.vehicle, salt: 'ship' };
    saveDesign(store, d);
    expect(store.data.has(DESIGN_KEY)).toBe(true);
    expect(loadDesign(store, IDS)).toEqual(d);
    expect(
      parseDesign('{"fire":"lava","hull":7,"weather":"hail","vehicle":{"salt":"bike"}}', IDS),
    ).toEqual(DEFAULT_DESIGN);
    expect(parseDesign('not json', IDS)).toEqual(DEFAULT_DESIGN);
    expect(parseDesign(null, IDS)).toEqual(DEFAULT_DESIGN);
  });

  it('works without storage, and when storage throws', () => {
    expect(loadDesign(null, IDS)).toEqual(DEFAULT_DESIGN);
    const broken: Store = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadDesign(broken, IDS)).toEqual(DEFAULT_DESIGN);
    expect(() => saveDesign(broken, DEFAULT_DESIGN)).not.toThrow();
    expect(loadBest(broken, 'x')).toBeNull();
    expect(() => saveBest(broken, 'x', 3)).not.toThrow();
  });

  it('keeps best times per world and vehicle', () => {
    const store = memory();
    expect(bestKey('canyon', 'ship')).not.toBe(bestKey('canyon', 'car'));
    expect(loadBest(store, bestKey('canyon', 'car'))).toBeNull();
    saveBest(store, bestKey('canyon', 'car'), 92.4567);
    expect(loadBest(store, bestKey('canyon', 'car'))).toBeCloseTo(92.457);
    store.setItem('bad', 'abc');
    expect(loadBest(store, 'bad')).toBeNull();
  });
});
