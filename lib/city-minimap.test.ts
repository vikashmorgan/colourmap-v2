import { describe, expect, it } from 'vitest';
import { DISTRICTS, type DistrictId, LANDMARKS } from './city-game';
import { TILE_I, TILE_J, TILE_X, TILE_Z } from './city-grid';
import {
  cityMapData,
  clampMapView,
  drawCityMap,
  fitView,
  MAP_EXTRAS,
  mapHeading,
  projectMap,
  TILT_3D,
  tileLocal,
} from './city-minimap';
import { TRACKS } from './city-race';

describe('the map of the City of Dreams', () => {
  it('comes from the plan, the same every time', () => {
    const a = JSON.stringify(cityMapData());
    const b = JSON.stringify(cityMapData());
    expect(a).toBe(b);
  });

  it('shows every district, a block per plot, the main roads, every landmark and race start', () => {
    const m = cityMapData();
    expect(m.width).toBe(TILE_X);
    expect(m.length).toBe(TILE_Z);
    const ids = new Set(m.districts.map((d) => d.id));
    for (const id of Object.keys(DISTRICTS) as DistrictId[]) expect(ids.has(id)).toBe(true);
    expect(m.blocks).toHaveLength(TILE_I * TILE_J);
    expect(m.roads.filter((r) => r.main).length).toBeGreaterThanOrEqual(10);
    const names = m.places.map((p) => p.name);
    expect(m.places.filter((p) => p.kind === 'landmark')).toHaveLength(LANDMARKS.length);
    expect(names).toContain('Golden spire');
    expect(names).toContain('Great pyramid');
    for (const t of TRACKS) expect(names).toContain(t.name);
    expect(m.places.filter((p) => p.kind === 'station')).toHaveLength(4);
    for (const p of m.places) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(TILE_X / 2);
      expect(p.z).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeLessThanOrEqual(TILE_Z);
    }
  });

  it('draws the metro as a closed loop inside the tile', () => {
    const { metro } = cityMapData();
    expect(metro.length).toBeGreaterThan(50);
    const [ax, az] = metro[0] as [number, number];
    const [bx, bz] = metro[metro.length - 1] as [number, number];
    expect(Math.hypot(ax - bx, az - bz)).toBeLessThan(20);
  });

  it('takes places added later (docks, embassies) without changing the plan', () => {
    const before = cityMapData().places.length;
    MAP_EXTRAS.push({ kind: 'landmark', name: 'Docks', x: 100, z: 300, y: 5, colour: [1, 1, 1] });
    expect(cityMapData().places.length).toBe(before + 1);
    MAP_EXTRAS.pop();
    expect(cityMapData().places.length).toBe(before);
  });

  it('brings any point of the endless city into the tile, and reads the heading from the way you fly', () => {
    const [x, z] = tileLocal(TILE_X * 3 + 10, -5);
    expect(x).toBeCloseTo(10);
    expect(z).toBeCloseTo(TILE_Z - 5);
    expect(mapHeading([0, 0, -1])).toBeCloseTo(0);
    expect(mapHeading([1, 0, 0])).toBeCloseTo(Math.PI / 2);
  });

  it('is flat from straight above, and raises the blocks when tilted into 3D', () => {
    const w = 400;
    const h = 800;
    const flat = fitView(w, h);
    expect(flat.tilt).toBe(0);
    const [, y0] = projectMap(flat, w, h, 0, 0, TILE_Z / 2);
    const [, y1] = projectMap(flat, w, h, 0, 100, TILE_Z / 2);
    expect(y0).toBeCloseTo(h / 2);
    expect(Math.abs(y1 - y0)).toBeLessThan(1e-6);
    const tilted = { ...flat, tilt: TILT_3D };
    const [, t0] = projectMap(tilted, w, h, 0, 0, TILE_Z / 2);
    const [, t1] = projectMap(tilted, w, h, 0, 100, TILE_Z / 2);
    expect(t1).toBeLessThan(t0 - 10);
    // The whole tile fits the screen, the long way up a tall one.
    for (const [px, pz] of [
      [-TILE_X / 2, 0],
      [TILE_X / 2, TILE_Z],
    ]) {
      const [sx, sy] = projectMap(flat, w, h, px as number, 0, pz as number);
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThanOrEqual(w);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThanOrEqual(h);
    }
    // Across a wide screen it turns the long way across.
    expect(fitView(1200, 600).yaw).toBeCloseTo(-Math.PI / 2);
  });

  it('keeps the view within its limits', () => {
    const v = clampMapView({ tilt: 3, yaw: 1, zoom: 100, cx: 1e5, cz: -1e5 });
    expect(v.tilt).toBeLessThanOrEqual(1.3);
    expect(v.zoom).toBeLessThanOrEqual(8);
    expect(v.cx).toBe(TILE_X / 2);
    expect(v.cz).toBe(0);
  });

  it('draws, flat and tilted, without failing', () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, k) => {
          if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
          return (...args: unknown[]) => {
            calls.push(String(k));
            return args;
          };
        },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    const ship = { x: 0, y: 20, z: 400, heading: 0.3 };
    drawCityMap(ctx, cityMapData(), fitView(400, 800), 400, 800, ship, 1);
    drawCityMap(ctx, cityMapData(), { ...fitView(400, 800), tilt: TILT_3D }, 400, 800, ship, 1);
    expect(calls.filter((c) => c === 'fill').length).toBeGreaterThan(500);
  });
});
