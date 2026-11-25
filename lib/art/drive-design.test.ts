import { describe, expect, it } from 'vitest';

import {
  BODIES,
  BUBBLES,
  bestKey,
  CORES,
  DEFAULT_DESIGN,
  DESIGN_KEY,
  FIRES,
  fireById,
  HOVER_BODIES,
  HULLS,
  hullById,
  hullOf,
  loadBest,
  loadDesign,
  parseDesign,
  REACTORS,
  rideEverywhere,
  type Store,
  saveBest,
  saveDesign,
  shipParts,
  tierOf,
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
  it('lists the ten worlds on keys 1 to 9 and 0, the racing tracks first', () => {
    expect(WORLDS.map((w) => `${w.key} ${w.name} ${w.tier}`)).toEqual([
      '1 Golden Track race',
      '2 Chinatown Run race',
      '3 Mars race',
      '4 Neon District race',
      '5 The Symphony dev',
      '6 Canyon Race dev',
      '7 Sky Canyon dev',
      '8 Night Rain dev',
      '9 Coast Road dev',
      '0 Salt Flat dev',
    ]);
    expect(tierOf('chinatown')).toBe('race');
    expect(tierOf('symphony')).toBe('dev');
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
  it('offers chrome, old chrome, gold, rust, red, leopard and your own paint', () => {
    expect(HULLS.map((h) => h.name)).toEqual([
      'Chrome',
      'Old chrome',
      'Gold',
      'Rust',
      'Red',
      'Leopard',
      'Paint',
    ]);
    expect(hullById('gold').metalness).toBe(1);
    expect(hullOf({ hull: 'paint', paint: '#123456' }).colour).toBe('#123456');
    expect(hullOf({ hull: 'gold', paint: '#123456' }).colour).toBe(hullById('gold').colour);
    expect(hullById('chrome').metalness).toBe(1);
    expect(hullById('rust').roughness).toBeGreaterThan(0.5);
    expect(hullById('rust').patina).toBeGreaterThan(0);
    expect(hullById('red').clearcoat).toBe(1);
    expect(hullById('nope').id).toBe('red');
  });

  it('old chrome: a metal mirror gone warm and hazy with tarnish, and remembered', () => {
    const old = hullById('oldChrome');
    const chrome = hullById('chrome');
    expect(old.metalness).toBe(1);
    // Hazier than new chrome, but still a reflecting metal, not a matte paint.
    expect(old.roughness).toBeGreaterThan(chrome.roughness);
    expect(old.roughness).toBeLessThan(0.45);
    expect(old.pattern).toBe('tarnish');
    // Warmer: more red than blue, where new chrome leans cool.
    const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    const [r, , b] = rgb(old.colour);
    expect(r).toBeGreaterThan(b);
    const store = memory();
    saveDesign(store, { ...DEFAULT_DESIGN, hull: 'oldChrome' });
    expect(loadDesign(store, IDS).hull).toBe('oldChrome');
  });
});

describe('bodies', () => {
  it('offers the wedge, the GTs, the Space Racer, the bikes, the UFO and the Garbage Ride', () => {
    expect(BODIES.map((b) => b.name)).toEqual([
      'Wedge',
      'Classic GT',
      'Future GT',
      'Space Racer',
      'Motorbike',
      'Light Cycle',
      'UFO Classic',
      'Garbage Ride',
    ]);
    expect(DEFAULT_DESIGN.body).toBe('wedge');
    expect(parseDesign('{"body":"ufo"}', IDS).body).toBe('ufo');
    expect(parseDesign('{"body":"garbage"}', IDS).body).toBe('garbage');
    expect([...HOVER_BODIES]).toEqual(['ufo', 'garbage']);
    expect(parseDesign('{"body":"tank"}', IDS).body).toBe('wedge');
  });
});

describe('ship parts', () => {
  it('offers reactors, cockpits and cores, and falls back on anything odd', () => {
    expect(REACTORS.map((r) => r.id)).toEqual(['side', 'top', 'quad']);
    expect(BUBBLES.map((b) => b.id)).toEqual(['dome', 'racer', 'twin', 'visor']);
    expect(CORES.map((c) => c.id)).toEqual(['none', 'ring', 'orb', 'crystal']);
    const d = parseDesign('{"reactors":"warp","bubble":"tank","core":"sun"}', IDS);
    expect(shipParts(d)).toEqual({ reactors: 'side', bubble: 'dome', core: 'none' });
  });
});

describe('rivals', () => {
  it('are on by default and kept as stored', () => {
    expect(DEFAULT_DESIGN.rivals).toBe(true);
    expect(parseDesign('{"rivals":true}', IDS).rivals).toBe(true);
    expect(parseDesign('{"rivals":false}', IDS).rivals).toBe(false);
    expect(parseDesign('{"rivals":"yes"}', IDS).rivals).toBe(true);
  });
});

describe('one ride everywhere', () => {
  it('puts the same vehicle in every world', () => {
    const d = rideEverywhere(DEFAULT_DESIGN, 'ship');
    expect(Object.values(d.vehicle).every((k) => k === 'ship')).toBe(true);
    expect(Object.keys(d.vehicle)).toHaveLength(WORLDS.length);
    expect(parseDesign('{"paint":"red"}', IDS).paint).toBe(DEFAULT_DESIGN.paint);
  });
});

describe('the design, remembered', () => {
  it('starts every world in the hover ship by default', () => {
    expect(DEFAULT_DESIGN.vehicle.salt).toBe('ship');
    expect(DEFAULT_DESIGN.vehicle.coast).toBe('ship');
  });

  it('leaves no wall of light behind by default, and offers the light cycle', () => {
    expect(DEFAULT_DESIGN.trail).toBe(false);
    expect(BODIES.map((b) => b.id)).toContain('cycle');
  });

  it('reads back what was saved, and falls back on anything odd', () => {
    const store = memory();
    const d = {
      ...DEFAULT_DESIGN,
      fire: 'plasma' as const,
      hull: 'chrome' as const,
      weather: 'snow',
      gauge: 'timer' as const,
      flames: false,
      trail: false,
      mode: 'easy' as const,
      paint: '#ff8800',
      body: 'classic' as const,
      reactors: 'quad' as const,
      bubble: 'visor' as const,
      core: 'crystal' as const,
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
