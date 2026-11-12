import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  breadcrumb,
  CITY_R,
  cityAngle,
  cityVeins,
  DISTRICT_RING,
  HEART_R,
  INNER_RING,
  layoutMap,
  type MapData,
  OUTER_REACH,
  openPanel,
  type Panel,
  PLAZA_R,
  panelChain,
  panelDepth,
  panelTitle,
  polygon,
  popPanel,
  pushPanel,
  RING_R,
  regionVeins,
  ringRoads,
  SHAPES,
  star,
} from './city-map';
import { pandasMap, parsePandasCourse } from './pandas-city';

const html = readFileSync(path.join(process.cwd(), 'content', 'pandas', 'index.html'), 'utf8');
const data = pandasMap(parsePandasCourse(html));
const plan = layoutMap(data);

/** A made-up source, to show the engine knows nothing of Pandas. */
const tiny: MapData = {
  id: 'tiny',
  title: 'Tiny',
  centre: { name: 'Home', blurb: 'All roads meet.' },
  words: {
    city: 'Area',
    district: 'room',
    building: 'thing',
    spots: 'Actions',
    shelf: 'Notes',
    core: 'Core',
  },
  slots: [
    {
      id: 'a',
      title: 'Area A',
      short: 'A',
      core: ['one'],
      districts: Array.from({ length: 8 }, (_, i) => ({
        id: `d${i}`,
        name: `Room ${i}`,
        buildings: Array.from({ length: 9 }, (_, j) => ({
          id: `b${j}`,
          name: `Thing ${j}`,
          tag: '',
          weight: j + 1,
          flag: j === 0,
        })),
      })),
      spots: [{ id: 's', name: 'Do it' }],
      shelf: 4,
    },
    null,
    null,
    null,
    null,
  ],
};

const squaresApart = (
  a: { x: number; y: number; side: number },
  b: { x: number; y: number; side: number },
) => Math.abs(a.x - b.x) >= (a.side + b.side) / 2 || Math.abs(a.y - b.y) >= (a.side + b.side) / 2;

/** A rectangle stays outside a circle (the octagon's outer circle). */
function rectClear(
  x: number,
  y: number,
  w: number,
  h: number,
  c: { x: number; y: number; r: number },
) {
  const nx = Math.max(x, Math.min(c.x, x + w));
  const ny = Math.max(y, Math.min(c.y, y + h));
  return Math.hypot(nx - c.x, ny - c.y) > c.r;
}

function checkCities(p: ReturnType<typeof layoutMap>) {
  for (const c of p.cities) {
    // On the ring, clear of the plaza.
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(RING_R, 6);
    expect(RING_R - CITY_R).toBeGreaterThan(PLAZA_R);
    if (!c.lit) continue;
    for (const d of c.districts) {
      // Octagons clear of the heart, of each other, and inside the city.
      expect(Math.hypot(d.x - c.x, d.y - c.y) - d.r).toBeGreaterThan(HEART_R);
      expect(Math.hypot(d.x - c.x, d.y - c.y) + d.r).toBeLessThan(OUTER_REACH);
      for (const e of c.districts)
        if (e !== d) expect(Math.hypot(d.x - e.x, d.y - e.y)).toBeGreaterThan(d.r + e.r);
      // Blocks inside their octagon (corners within its inner circle) and never on top of each other.
      for (const b of d.blocks) {
        expect(
          Math.hypot(Math.abs(b.x - d.x) + b.side / 2, Math.abs(b.y - d.y) + b.side / 2),
        ).toBeLessThan(d.r * Math.cos(Math.PI / 8));
        expect(b.side).toBeLessThanOrEqual(b.cell);
        for (const o of d.blocks) if (o !== b) expect(squaresApart(b, o)).toBe(true);
      }
      // The spots (north), the gate (south) and the shelf (east) stay outside every octagon.
      for (const s of c.spots) expect(Math.hypot(s.x - d.x, s.y - d.y)).toBeGreaterThan(d.r + s.r);
      expect(rectClear(c.shelf.x, c.shelf.y, c.shelf.w, c.shelf.h, d)).toBe(true);
      expect(rectClear(c.gate.x - c.gate.w / 2, c.gate.y - 14, c.gate.w, 28, d)).toBe(true);
    }
  }
}

describe('layoutMap: the Pandas region', () => {
  it('stands 8 cities on the ring in course order, clockwise from the top', () => {
    expect(plan.cities).toHaveLength(8);
    expect(plan.cities[0].x).toBeCloseTo(0, 6);
    expect(plan.cities[0].y).toBeCloseTo(-RING_R, 6);
    // Clockwise on screen (y down): the second city is to the right of the first.
    expect(plan.cities[1].x).toBeGreaterThan(0);
    expect(plan.cities[2].x).toBeCloseTo(RING_R, 6);
    expect(plan.cities.map((c) => c.lit)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    // Neighbours never touch.
    for (let i = 0; i < 8; i++) {
      const a = plan.cities[i];
      const b = plan.cities[(i + 1) % 8];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * (OUTER_REACH + 40));
    }
  });

  it('gives every lit city the same bones: gate south, avenue, spots north, heart, shelf east', () => {
    for (const c of plan.cities.filter((x) => x.lit)) {
      expect(c.heart).toMatchObject({ kind: 'heart', x: c.x, y: c.y });
      expect(c.gate.x).toBe(c.x);
      expect(c.gate.y).toBeGreaterThan(c.y);
      expect(c.spots.length).toBe(3);
      for (const s of c.spots) expect(s.y).toBeLessThan(c.y - OUTER_REACH + 1);
      expect(c.shelf.x).toBeGreaterThan(c.x + DISTRICT_RING);
      expect(c.shelf.y + c.shelf.h / 2).toBeCloseTo(c.y, 6);
      expect(c.shelf.entries).toBe(data.slots[c.n - 1]?.shelf);
      expect(c.districts.length).toBeGreaterThan(0);
    }
    expect(plan.cities[2].districts).toHaveLength(6);
    expect(plan.cities[2].districts.flatMap((d) => d.blocks)).toHaveLength(19);
  });

  it('places districts in order clockwise from the gate', () => {
    const c = plan.cities[2];
    // The first part sits just west of the gate (bottom-left), the last just east of it.
    expect(c.districts[0].x).toBeLessThan(c.x);
    expect(c.districts[0].y).toBeGreaterThan(c.y);
    expect(c.districts[5].x).toBeGreaterThan(c.x);
    expect(c.districts[5].y).toBeGreaterThan(c.y);
    const angles = c.districts.map((d) => d.angle);
    expect([...angles].sort((a, b) => a - b)).toEqual(angles);
  });

  it('never overlaps: districts, blocks, spots, gate and shelf', () => {
    checkCities(plan);
    checkCities(layoutMap(tiny));
  });

  it('is deterministic: the same data draws the same city', () => {
    expect(layoutMap(data)).toEqual(plan);
    expect(cityVeins(plan.cities[0])).toEqual(cityVeins(layoutMap(data).cities[0]));
  });

  it('makes bigger blocks for cards that hold more, and flags the watch-outs', () => {
    const blocks = plan.cities[2].districts.flatMap((d) => d.blocks);
    const nan = blocks.find((b) => b.id === 'nan');
    expect(nan?.flag).toBe(true);
    expect(new Set(blocks.map((b) => b.side.toFixed(2))).size).toBeGreaterThan(1);
  });

  it('leaves the plots to come empty', () => {
    const plot = plan.cities[5];
    expect(plot).toMatchObject({ lit: false, city: null, districts: [], spots: [] });
    expect(cityVeins(plot)).toEqual([]);
  });

  it('has one shape per kind', () => {
    expect(SHAPES).toMatchObject({
      district: 'octagon',
      building: 'square',
      flag: 'triangle',
      spot: 'hexagon',
      core: 'star',
      heart: 'circle',
    });
    expect(cityAngle(1, 8)).toBeCloseTo(-Math.PI / 2, 9);
    expect(polygon(0, 0, 10, 8).split(' ')).toHaveLength(8);
    expect(star(0, 0, 10).split(' ')).toHaveLength(10);
  });
});

describe('the veins', () => {
  it('grow a midrib, a trunk to every district with side veins, and a twig to every block', () => {
    const c = plan.cities[2];
    const veins = cityVeins(c);
    const blocks = c.districts.flatMap((d) => d.blocks).length;
    expect(veins.filter((v) => v.gen === 0)).toHaveLength(2);
    expect(veins.filter((v) => v.gen === 1)).toHaveLength(c.districts.length + 1);
    expect(veins.filter((v) => v.gen === 2)).toHaveLength(2 * c.districts.length);
    // A district with one block has it in the centre: no twig needed there.
    expect(veins.filter((v) => v.gen === 3).length).toBeLessThanOrEqual(blocks);
    expect(veins.filter((v) => v.gen === 3).length).toBeGreaterThan(blocks - c.districts.length);
    for (const v of veins) expect(v.d).toMatch(/^M-?[\d.]+ -?[\d.]+ Q/);
  });

  it('run from the plaza to every city in the region', () => {
    const veins = regionVeins(plan);
    expect(veins.filter((v) => v.gen === 0)).toHaveLength(8);
    expect(veins).toHaveLength(24);
  });

  it('keep the ring road between the cities, never across one', () => {
    const roads = ringRoads(plan);
    expect(roads).toHaveLength(8);
    for (const d of roads) {
      const nums = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
      const ends = [
        [nums[0], nums[1]],
        [nums[7], nums[8]],
      ];
      for (const [x, y] of ends)
        for (const c of plan.cities) expect(Math.hypot(x - c.x, y - c.y)).toBeGreaterThan(CITY_R);
    }
    expect(INNER_RING + OUTER_REACH).toBeLessThan(RING_R);
    expect(ringRoads(layoutMap({ ...tiny, slots: [tiny.slots[0]] }))).toEqual([]);
  });
});

describe('the panel stack: one sheet per depth', () => {
  const part: Panel = { kind: 'district', n: 3, district: 1 };
  const card: Panel = { kind: 'building', n: 3, district: 1, building: 'nan' };
  const more: Panel = { kind: 'more', n: 3, district: 1, building: 'nan' };

  it('opens a card on top of its part, and More on top of the card', () => {
    expect(panelChain(card)).toEqual([part, card]);
    expect(panelChain(more)).toEqual([part, card, more]);
    expect(openPanel([], card)).toEqual([part, card]);
    expect(openPanel(openPanel([], card), more)).toEqual([part, card, more]);
    expect([part, card, more].map(panelDepth)).toEqual([2, 3, 4]);
  });

  it('replaces a sheet of the same depth, and starts afresh in another city', () => {
    const other: Panel = { kind: 'building', n: 3, district: 1, building: 'isna' };
    expect(pushPanel([part, card, more], other)).toEqual([part, other]);
    expect(pushPanel([{ kind: 'city', n: 3 }, part], { kind: 'spots', n: 3 })).toEqual([
      { kind: 'city', n: 3 },
      { kind: 'spots', n: 3 },
    ]);
    expect(pushPanel([part, card], { kind: 'city', n: 1 })).toEqual([{ kind: 'city', n: 1 }]);
  });

  it('pops one level at a time', () => {
    expect(popPanel([part, card, more])).toEqual([part, card]);
    expect(popPanel(popPanel([part, card]))).toEqual([]);
    expect(popPanel([])).toEqual([]);
  });

  it('names the path: Pandas › Lesson 3 › Missing values › the card › More', () => {
    expect(breadcrumb([], data)).toEqual(['Pandas']);
    expect(breadcrumb([{ kind: 'city', n: 3 }, part, card, more], data)).toEqual([
      'Pandas',
      'Lesson 3',
      'Missing values',
      'NaN marks an empty cell, and behaves differently',
      'More',
    ]);
    expect(panelTitle({ kind: 'spots', n: 3 }, data)).toBe('Practice');
    expect(panelTitle({ kind: 'shelf', n: 1 }, data)).toBe('Cheat sheet');
    expect(panelTitle({ kind: 'city', n: 6 }, data)).toBe('Lesson 6');
    expect(panelTitle({ kind: 'city', n: 1 }, tiny)).toBe('Area A');
  });
});
