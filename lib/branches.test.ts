import { describe, expect, it } from 'vitest';

import {
  ADMIN_HALVES,
  BRANCH_BLURBS,
  BRANCH_HUE,
  BRANCH_LABELS,
  BRANCHES,
  branchOf,
  CENTRE_ROUTES,
  GROUPINGS,
  groupingsIn,
  halvesOf,
  isCentre,
  unplaced,
  weightOf,
} from './branches';

describe('the branches', () => {
  it('names, describes and colours every branch', () => {
    for (const branch of BRANCHES) {
      expect(BRANCH_LABELS[branch]).toBeTruthy();
      expect(BRANCH_BLURBS[branch].length, `${branch} has no blurb`).toBeGreaterThan(20);
      expect(BRANCH_HUE[branch]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps a blurb free of counts, so it cannot become a scoreboard row', () => {
    /*
     * A description that carries a number stops describing and starts
     * ranking. The same rule ColourMesh's tree holds itself to.
     */
    for (const branch of BRANCHES) {
      expect(BRANCH_BLURBS[branch]).not.toMatch(/\d/);
    }
  });

  it('gives Art and Energy three groups each', () => {
    /*
     * Evenness is what makes this a structure rather than a filter. The
     * scheme this replaces was 3 / 11 / 1, which could only ever be a lens.
     */
    expect(groupingsIn('art')).toHaveLength(3);
    expect(groupingsIn('energy')).toHaveLength(3);
  });

  it('forks Admin into exactly two halves, each with three groups', () => {
    expect(halvesOf('admin')).toEqual([...ADMIN_HALVES]);

    for (const half of ADMIN_HALVES) {
      const groups = groupingsIn('admin').filter((group) => group.half === half);
      expect(groups, `admin/${half}`).toHaveLength(3);
    }
  });

  it('forks nothing except Admin', () => {
    for (const branch of BRANCHES) {
      if (branch === 'admin') continue;
      expect(halvesOf(branch), `${branch} should not fork`).toEqual([]);
      expect(groupingsIn(branch).every((group) => !group.half)).toBe(true);
    }
  });
});

describe('placing a route', () => {
  it('sends a visual tool to Art and a life-scan to Energy', () => {
    expect(branchOf('/geometry-field')).toBe('art');
    expect(branchOf('/music')).toBe('art');
    expect(branchOf('/life-scan')).toBe('energy');
    expect(branchOf('/education')).toBe('admin');
  });

  it('never places a route in two branches', () => {
    const seen = new Set<string>();

    for (const group of GROUPINGS) {
      for (const route of group.routes) {
        expect(seen.has(route), `${route} appears twice`).toBe(false);
        seen.add(route);
      }
    }
  });

  it('keeps the centre out of every branch', () => {
    /*
     * The load-bearing decision. Check-in and the notebook were nearly filed
     * under Body next to sleep and routines, which would have demoted the
     * trunk into one of the spokes. How your body is belongs in Energy; how you
     * are is the middle.
     */
    for (const route of CENTRE_ROUTES) {
      expect(isCentre(route)).toBe(true);
      expect(branchOf(route), `${route} was filed into a branch`).toBeUndefined();
    }
  });
});

describe('what the map admits it does not cover', () => {
  it('reports life admin as empty, because it is', () => {
    /*
     * THIS TEST IS MEANT TO START FAILING.
     *
     * Insurance, payments and the people owed a reply are the heaviest part
     * of the owner's actual week and have no surface in this app at all. The
     * tree renders that half nearly empty on purpose — it is the clearest
     * statement available of what to build next.
     *
     * When Life admin gains a real surface, this breaks. Whoever breaks it
     * should read this and update the expectation rather than delete it.
     */
    const life = groupingsIn('admin').filter((group) => group.half === 'life');
    const routes = life.flatMap((group) => group.routes);

    expect(routes, 'life admin gained a surface — update this expectation').toHaveLength(0);
  });

  it('shows Art carrying most of the weight, which is why Studio comes out', () => {
    /*
     * Ten of thirty surfaces are generative visual work. That is not a branch
     * of a life organiser; it is a second product living inside one.
     */
    expect(weightOf('art')).toBeGreaterThan(weightOf('admin') + weightOf('energy'));
  });

  it('lists routes belonging to no branch rather than hiding them', () => {
    const outstanding = unplaced(['/geometry-field', '/day', '/entertainment', '/workshop']);

    expect(outstanding).toEqual(['/entertainment', '/workshop']);
  });

  it('places or excuses every route it is given', () => {
    /* A route is placed, is the centre, or is an open decision. Never silent. */
    const all = ['/music', '/day', '/sparks'];

    for (const route of all) {
      const placed = Boolean(branchOf(route));
      const centre = isCentre(route);
      const outstanding = unplaced(all).includes(route);

      expect(placed || centre || outstanding, `${route} fell through`).toBe(true);
    }
  });
});
