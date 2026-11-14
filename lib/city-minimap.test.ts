import { describe, expect, it } from 'vitest';
import { DOCKS } from './city-docks';
import { EMBASSIES } from './city-embassy';
import { DISTRICTS, type DistrictId, LANDMARKS } from './city-game';
import { TILE_I, TILE_J, TILE_X, TILE_Z } from './city-grid';
import {
  boxesOverlap,
  cityMapData,
  clampMapView,
  drawCityMap,
  FIT_SHARE,
  fitView,
  fitView3D,
  isClick,
  isTap,
  labelBox,
  layoutLabels,
  MAP_EXTRAS,
  type MapLabel,
  mapHeading,
  mapPick,
  projectedBounds,
  projectMap,
  TILT_3D,
  tileLocal,
  youCaption,
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
    expect(v.zoom).toBeLessThanOrEqual(12);
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

/** A canvas that draws nothing and measures text as the map guesses it. */
const quietCtx = () =>
  new Proxy(
    {},
    {
      get: (_t, k) => {
        if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
        return () => undefined;
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;

const noOverlap = (shown: MapLabel[]) => {
  for (let i = 0; i < shown.length; i++) {
    for (let j = i + 1; j < shown.length; j++) {
      expect(boxesOverlap(labelBox(shown[i] as MapLabel), labelBox(shown[j] as MapLabel), 0)).toBe(
        false,
      );
    }
  }
};

describe('the map, framed and labelled', () => {
  const label = (text: string, x: number, y: number, priority: number, depth = 0): MapLabel => ({
    text,
    x,
    y,
    align: 'left',
    size: 11,
    w: text.length * 6.6,
    priority,
    depth,
    alpha: 1,
    colour: '#fff',
    font: '11px sans-serif',
  });

  it('keeps the labels that matter most, never two on top of each other', () => {
    const shown = layoutLabels(
      [
        label('Mosque of the four minarets', 100, 100, 1),
        label('ISTANBUL', 110, 102, 0),
        label('Minaret Slalom', 120, 98, 2),
        label('Far away', 600, 300, 3),
        label('Off the screen', 990, 300, 1),
      ],
      1000,
      600,
    );
    expect(shown.map((l) => l.text)).toEqual(['ISTANBUL', 'Far away']);
    noOverlap(shown);
    // Within a priority, the nearer first.
    const near = layoutLabels(
      [label('Back', 100, 100, 1, -5), label('Front', 104, 101, 1, 5)],
      800,
      600,
    );
    expect(near.map((l) => l.text)).toEqual(['Front']);
  });

  for (const [w, h] of [
    [1536, 640],
    [390, 844],
    [1024, 768],
  ] as [number, number][]) {
    it(`opens 3D framed to fill most of a ${w} × ${h} screen, centred, at an oblique angle`, () => {
      const v = fitView3D(w, h);
      expect(v.tilt).toBeCloseTo(TILT_3D);
      // Turned off the city's long axis, so it is seen at a slant.
      const off = Math.abs(Math.sin(v.yaw - (w > h ? -Math.PI / 2 : 0)));
      expect(off).toBeGreaterThan(0.25);
      const b = projectedBounds(v, w, h);
      const fill = Math.max((b.x1 - b.x0) / w, (b.y1 - b.y0) / h);
      expect(fill).toBeGreaterThan(FIT_SHARE - 0.03);
      expect(fill).toBeLessThan(FIT_SHARE + 0.03);
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.y0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(w);
      expect(b.y1).toBeLessThanOrEqual(h);
      expect((b.x0 + b.x1) / 2).toBeCloseTo(w / 2, 0);
      expect((b.y0 + b.y1) / 2).toBeCloseTo(h / 2, 0);
      // Not a thin strip: both ways it takes a good share of the screen (the flat plan merely
      // tilted was about 100 px tall on a wide one).
      expect(Math.min((b.x1 - b.x0) / w, (b.y1 - b.y0) / h)).toBeGreaterThan(0.4);
    });

    it(`shows no two labels overlapping on a ${w} × ${h} screen, flat or in 3D`, () => {
      const data = cityMapData();
      const flat = drawCityMap(quietCtx(), data, fitView(w, h), w, h, null, 0);
      const deep = drawCityMap(quietCtx(), data, fitView3D(w, h), w, h, null, 0);
      for (const shown of [flat, deep]) {
        expect(shown.length).toBeGreaterThan(3);
        noOverlap(shown);
      }
      // Districts first: on the flat plan every district's name has room.
      expect(flat.filter((l) => l.priority === 0).length).toBeGreaterThanOrEqual(6);
      // In 3D the far names are fainter than the near ones.
      const alphas = deep.map((l) => l.alpha);
      expect(Math.min(...alphas)).toBeLessThan(Math.max(...alphas));
    });
  }

  it('shows a hidden name when the pointer comes near it', () => {
    const data = cityMapData();
    const w = 1536;
    const h = 640;
    const v = fitView3D(w, h);
    const all = drawCityMap(quietCtx(), data, v, w, h, null, 0);
    // Find a place whose name was hidden, and point at it.
    const hidden = data.places.find(
      (p) => p.kind !== 'station' && p.kind !== 'portal' && !all.some((l) => l.text === p.name),
    );
    expect(hidden).toBeDefined();
    if (!hidden) return;
    const [x, y] = projectMap(v, w, h, hidden.x, hidden.y, hidden.z);
    const near = drawCityMap(quietCtx(), data, v, w, h, null, 0, true, { x, y });
    expect(near.some((l) => l.text === hidden.name)).toBe(true);
    noOverlap(near);
  });
});

/** A canvas that records every stroke and every word written, with the style it had. */
const recordingCtx = () => {
  const state: Record<string, unknown> = {};
  const strokes: { style: unknown; width: unknown }[] = [];
  const texts: string[] = [];
  const ctx = new Proxy(state, {
    get: (t, k) => {
      if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'stroke') return () => strokes.push({ style: t.strokeStyle, width: t.lineWidth });
      if (k === 'fillText') return (text: string) => texts.push(text);
      if (typeof k === 'string' && k in t) return t[k];
      return () => undefined;
    },
    set: (t, k, v) => {
      t[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, strokes, texts };
};

describe('the map, 2026-11-13: docks, embassies, taps, you and the races won', () => {
  it('shows every dock and every embassy, inside the tile, the plan cached as before', () => {
    const m = cityMapData();
    const docks = m.places.filter((p) => p.kind === 'dock');
    const embassies = m.places.filter((p) => p.kind === 'embassy');
    expect(docks).toHaveLength(DOCKS.length);
    expect(embassies).toHaveLength(EMBASSIES.length);
    for (const p of [...docks, ...embassies]) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(TILE_X / 2);
      expect(p.z).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeLessThanOrEqual(TILE_Z);
      expect(p.y).toBeGreaterThan(0);
    }
    expect(embassies.map((p) => p.name)).toContain('Lotus embassy');
    expect(docks.map((p) => p.name)).toContain('Avenue lounge');
    expect(cityMapData()).toBe(m);
  });

  it('draws an H in a ring for a dock and a triangle for an embassy, their names after the races', () => {
    const w = 1536;
    const h = 640;
    const data = cityMapData();
    const v = fitView3D(w, h);
    // Pointed at, a dock's or an embassy's name shows like any other.
    for (const kind of ['dock', 'embassy'] as const) {
      const p = data.places.find((q) => q.kind === kind);
      expect(p).toBeDefined();
      if (!p) continue;
      const [x, y] = projectMap(v, w, h, p.x, p.y, p.z);
      const shown = drawCityMap(quietCtx(), data, v, w, h, null, 0, true, { x, y });
      expect(shown.some((l) => l.text === p.name)).toBe(true);
      noOverlap(shown);
    }
    const all = drawCityMap(quietCtx(), data, fitView(w, h), w, h, null, 0);
    const names = new Set(
      data.places.filter((p) => p.kind === 'dock' || p.kind === 'embassy').map((p) => p.name),
    );
    for (const l of all) if (names.has(l.text)) expect(l.priority).toBe(3);
  });

  it('tells a tap from a drag, and a tap shows the hidden name under it', () => {
    expect(isTap({ x: 10, y: 10 }, { x: 14, y: 15 }, 'touch')).toBe(true);
    expect(isTap({ x: 10, y: 10 }, { x: 20, y: 10 }, 'touch')).toBe(false);
    expect(isTap({ x: 10, y: 10 }, { x: 10, y: 10 }, 'mouse')).toBe(false);
    expect(isTap({ x: 10, y: 10 }, { x: 12, y: 10 }, 'pen')).toBe(true);
    const data = cityMapData();
    const w = 390;
    const h = 844;
    const v = fitView3D(w, h);
    const all = drawCityMap(quietCtx(), data, v, w, h, null, 0);
    const hidden = data.places.filter(
      (p) => p.kind !== 'station' && p.kind !== 'portal' && !all.some((l) => l.text === p.name),
    );
    expect(hidden.length).toBeGreaterThan(0);
    // A finger lands a few px off; the name under it shows (where the screen has room for it).
    let found = 0;
    for (const p of hidden) {
      const [x, y] = projectMap(v, w, h, p.x, p.y, p.z);
      const tapped = drawCityMap(quietCtx(), data, v, w, h, null, 0, true, { x: x + 3, y: y - 2 });
      if (tapped.some((l) => l.text === p.name)) found++;
      noOverlap(tapped);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('always captions your pointer "You · 52 m", the names it touches giving way (2026-11-14)', () => {
    const cap = youCaption([200, 300], 52.4, 800, 600);
    expect(cap.text).toBe('You · 52 m');
    expect(cap.x).toBeGreaterThan(200);
    // Near the right edge it sits left of the pointer, on screen.
    const edge = youCaption([790, 300], 52, 800, 600);
    expect(edge.x + edge.w).toBeLessThan(790);
    // Drawn wherever you are, and no name shown touches it.
    const data = cityMapData();
    const v = fitView(400, 800);
    for (const [x, z] of [
      [-60, 200],
      [40, 600],
      [-20, 1200],
      [60, 1700],
    ]) {
      const { ctx, texts } = recordingCtx();
      const shown = drawCityMap(ctx, data, v, 400, 800, { x, y: 52, z, heading: 0 }, 0);
      expect(texts.includes('You · 52 m')).toBe(true);
      const [sx, sy] = projectMap(v, 400, 800, x, 0, z);
      const box = labelBox(youCaption([sx, sy], 52, 400, 800));
      for (const l of shown) expect(boxesOverlap(labelBox(l), box)).toBe(false);
    }
  });

  it('draws the districts whose race was won brighter, edged in gold', () => {
    const data = cityMapData();
    const v = fitView(400, 800);
    const gold = 'rgba(255,199,115,0.9)';
    const plain = recordingCtx();
    drawCityMap(plain.ctx, data, v, 400, 800, null, 0);
    expect(plain.strokes.filter((s) => s.style === gold)).toHaveLength(0);
    const id = data.districts[0]?.id as DistrictId;
    const lit = recordingCtx();
    drawCityMap(lit.ctx, data, v, 400, 800, null, 0, true, null, new Set([id]));
    const edged = lit.strokes.filter((s) => s.style === gold);
    expect(edged).toHaveLength(data.districts.filter((d) => d.id === id).length);
    for (const e of edged) expect(e.width).toBe(1);
  });
});

describe('fast travel from the map (2026-11-14: "from map i can click to the diff spots and fast travel")', () => {
  it('tells a click or a tap from a drag, any pointer', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 14, y: 15 })).toBe(true);
    expect(isClick({ x: 10, y: 10 }, { x: 30, y: 10 })).toBe(false);
  });

  for (const [w, h] of [
    [1536, 640],
    [390, 844],
  ] as const) {
    it(`travels to the quarter or place whose name is tapped, on a ${w} × ${h} screen`, () => {
      const data = cityMapData();
      for (const v of [fitView(w, h), fitView3D(w, h)]) {
        const shown = drawCityMap(quietCtx(), data, v, w, h, null, 0);
        let quarters = 0;
        for (const l of shown) {
          const x = l.align === 'left' ? l.x + l.w / 2 : l.x;
          const go = mapPick(shown, data, v, w, h, { x, y: l.y }, false);
          expect(go, l.text).toEqual(l.go);
          if (go && 'd' in go) {
            quarters++;
            expect(DISTRICTS[go.d].name.toUpperCase()).toBe(l.text);
          } else if (go) expect(go.name).toBe(l.text);
        }
        expect(quarters).toBeGreaterThanOrEqual(6);
      }
    });
  }

  it('travels to the quarter under a click on its ground (a mouse), never from a finger off a name', () => {
    const w = 1536;
    const h = 640;
    const data = cityMapData();
    const v = fitView(w, h);
    const shown = drawCityMap(quietCtx(), data, v, w, h, null, 0);
    for (const d of data.districts) {
      // A point inside its patch, off its name.
      const [x, y] = projectMap(v, w, h, (d.x0 + d.x1) / 2 + 20, 0, (d.z0 + d.z1) / 2 + 40);
      const go = mapPick(shown, data, v, w, h, { x, y });
      if (go && 'd' in go) expect(go.d).toBe(d.id);
    }
    // Off the city altogether: nothing.
    expect(mapPick(shown, data, v, w, h, { x: 2, y: 2 })).toBeNull();
    // A finger on bare ground shows names instead (as before), no trip.
    const [x, y] = projectMap(v, w, h, 100, 0, 1000);
    const touch = mapPick(shown, data, v, w, h, { x, y }, false);
    if (touch) expect(shown.some((l) => l.go === touch)).toBe(true);
  });
});
