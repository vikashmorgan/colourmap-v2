import { describe, expect, it } from 'vitest';

import { BRANCHES } from './branches';
import { withVisit } from './grid';
import {
  branchWarmth,
  matchPages,
  page,
  placedPages,
  recentPages,
  spreadLabels,
  unplacedPages,
} from './life-tree-2';

const DAY = 24 * 60 * 60 * 1000;

describe('design II of the life tree', () => {
  it('places every page the Grid knows, once', () => {
    expect(unplacedPages()).toEqual([]);
    const all = placedPages();
    expect(new Set(all).size).toBe(all.length);
  });

  it('warms a tree by the share of its pages opened this week', () => {
    const now = 100 * DAY;
    let visits = withVisit({}, '/health', now - DAY);
    visits = withVisit(visits, '/programs', now - 30 * DAY);
    expect(branchWarmth('energy', visits, now)).toBeCloseTo(1 / 3);
    expect(branchWarmth('art', visits, now)).toBe(0);
    for (const b of BRANCHES) expect(branchWarmth(b, {}, now)).toBe(0);
  });

  it('keeps your last pages, newest first, only ones on the tree', () => {
    let visits = withVisit({}, '/music', 1);
    visits = withVisit(visits, '/somewhere-else', 5);
    visits = withVisit(visits, '/health', 3);
    visits = withVisit(visits, 'https://chillmachine.vercel.app', 4);
    expect(recentPages(visits, 2)).toEqual(['https://chillmachine.vercel.app', '/health']);
  });

  it('finds a page by the start of its name, then of any word', () => {
    expect(matchPages('chi')[0]).toBe('https://chillmachine.vercel.app');
    expect(matchPages('stars')).toContain('/figure-stars');
    expect(matchPages('')).toEqual([]);
    expect(matchPages('zzz')).toEqual([]);
    expect(page('/nowhere').label).toBe('/nowhere');
  });

  it('nudges names apart until none overlap', () => {
    const list = [
      { at: [100, 100] as [number, number], w: 80, h: 40 },
      { at: [110, 105] as [number, number], w: 80, h: 40 },
      { at: [400, 100] as [number, number], w: 80, h: 40 },
    ];
    spreadLabels(list);
    const [a, b, c] = list;
    if (!a || !b || !c) throw new Error('lost one');
    expect(Math.abs(a.at[1] - b.at[1]) >= 40 || Math.abs(a.at[0] - b.at[0]) >= 80).toBe(true);
    expect(c.at).toEqual([400, 100]);
  });
});
