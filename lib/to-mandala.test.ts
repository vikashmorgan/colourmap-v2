import { describe, expect, it } from 'vitest';

import { BRANCHES, groupingsIn, weightOf } from '@/lib/branches';
import { nameOfRoute, toMandala, wedgeLabel } from './to-mandala';

describe('feeding the lattice', () => {
  it('gives the figure one sector per branch, in branch order', () => {
    expect(toMandala().sectors.map((sector) => sector.branch)).toEqual([...BRANCHES]);
  });

  it('carries three levels, because the figure draws three rings', () => {
    /*
     * centre -> branch -> grouping -> route. If a level ever collapses, the
     * outermost ring has nothing to draw and the port stops being worth it.
     */
    const art = toMandala().sectors.find((sector) => sector.branch === 'art');

    expect(art?.wedges.length).toBeGreaterThan(0);
    expect(art?.wedges.some((wedge) => wedge.leaves.length > 0)).toBe(true);
  });

  it('counts surfaces, never invents them', () => {
    for (const sector of toMandala().sectors) {
      expect(sector.count).toBe(weightOf(sector.branch));

      for (const wedge of sector.wedges) {
        expect(wedge.leaves).toHaveLength(wedge.count);
      }
    }
  });

  it('draws the empty groupings rather than dropping them', () => {
    /*
     * A figure with holes in it is not a figure, and an absent grouping is
     * information — it says what has not been built. Life admin is the whole
     * reason this rule exists.
     */
    const admin = toMandala().sectors.find((sector) => sector.branch === 'admin');

    expect(admin?.wedges).toHaveLength(groupingsIn('admin').length);
    expect(admin?.wedges.some((wedge) => wedge.count === 0)).toBe(true);
  });

  it('names a route instead of printing its path', () => {
    /*
     * The outermost ring is where a reader finally learns what a dot IS.
     * Leaving raw paths there repeats the failure ColourMesh recorded: an
     * unnamed mark is decoration.
     */
    expect(nameOfRoute('/figure-stars-trio')).toBe('Figure stars trio');
    expect(nameOfRoute('/education/world')).toBe('Education · world');
  });

  it('names the fork only on the branch that forks', () => {
    const mandala = toMandala();
    const admin = mandala.sectors.find((sector) => sector.branch === 'admin');
    const art = mandala.sectors.find((sector) => sector.branch === 'art');

    expect(admin?.wedges.every((wedge) => wedgeLabel(wedge).includes('·'))).toBe(true);
    expect(art?.wedges.every((wedge) => !wedgeLabel(wedge).includes('·'))).toBe(true);
  });

  it('measures the whole figure against one scale', () => {
    const mandala = toMandala();
    const summed = BRANCHES.reduce((total, branch) => total + weightOf(branch), 0);

    expect(mandala.surfaces).toBe(summed);
    expect(mandala.largest).toBeGreaterThan(0);
  });
});
