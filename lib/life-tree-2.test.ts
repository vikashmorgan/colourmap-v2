import { describe, expect, it } from 'vitest';

import { BRANCHES } from './branches';
import { withVisit } from './grid';
import { buildLifeTrees } from './life-tree';
import {
  AREAS_2,
  branchWarmth,
  limbPoint,
  matchPages,
  page,
  pagePoints,
  placedPages,
  recentPages,
  sectors,
  spreadLabels,
  unplacedPages,
} from './life-tree-2';
import { FOOT_Y } from './star-tree';

const DAY = 24 * 60 * 60 * 1000;

describe('design II of the life tree', () => {
  it('places every page the Grid knows, once', () => {
    expect(unplacedPages()).toEqual([]);
    const all = placedPages();
    expect(new Set(all).size).toBe(all.length);
  });

  it('cuts a crown into one sector per area, side to side, wider for more pages', () => {
    const tree = buildLifeTrees().art;
    const secs = sectors(tree, AREAS_2.art);
    expect(secs).toHaveLength(AREAS_2.art.length);
    for (let i = 1; i < secs.length; i++) expect(secs[i]?.lo).toBeCloseTo(secs[i - 1]?.hi ?? 0);
    const visual = secs.find((s) => s.area.label === 'Visual');
    const play = secs.find((s) => s.area.label === 'Play');
    if (!visual || !play) throw new Error('missing area');
    expect(visual.hi - visual.lo).toBeGreaterThan(play.hi - play.lo);
    // The name sits on the limb, inside the crown; the pages beyond the tips, in order.
    const [, ly] = limbPoint(tree, visual);
    const points = pagePoints(tree, visual, visual.area.pages.length);
    expect(points).toHaveLength(10);
    for (const [, y] of points) expect(y - FOOT_Y).toBeGreaterThan((ly - FOOT_Y) * 0.6);
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
