/*
 * BRAIN'S DATA, IN THE SHAPE THE LATTICE EATS.
 *
 * ColourMesh's `components/graphics/LatticeTree.tsx` is the most developed
 * figure either codebase has — three named rings, branches that fan open into
 * categories and then into specific things, every label level, the others
 * receding rather than vanishing. `docs/specs/colour-brain.md` argued against
 * porting it, on the grounds that it is welded to that product's demo data
 * layer, mandala types and self model.
 *
 * That was half right, and the wrong half is the expensive one. The *chrome*
 * around the figure is welded to ColourMesh — the vision line, the customise
 * bench, the people counts. The figure itself eats one plain data structure:
 *
 *   centre → branch → category → specific thing
 *
 * Which is exactly Colour Brain's own shape, and it was sitting there unused:
 *
 *   centre (you) → branch → grouping → route
 *
 * So the adapter is this file, and nothing of ColourMesh's data layer has to
 * come across. `lib/branches.ts` stays the single source of truth, the branch
 * is still computed and never stored, and the figure is fed rather than forked.
 *
 * WHAT THE COUNTS MEAN HERE, AND WHY IT MATTERS.
 *
 * The community figure counts PEOPLE, which is a real measurement of a real
 * group. This one counts the SURFACES that exist behind a part of your life —
 * things you have built, not things you have achieved. That distinction is why
 * a zero is allowed to be drawn: Life admin counting zero is the most useful
 * fact on the figure, and a drawing that hid it would be flattering rather than
 * honest.
 */

import {
  ADMIN_HALF_LABELS,
  type AdminHalf,
  BRANCH_LABELS,
  BRANCHES,
  type Branch,
  groupingsIn,
  weightOf,
} from '@/lib/branches';

export type LeafNode = {
  /** The route itself, which is already unique. */
  slug: string;
  label: string;
};

export type WedgeNode = {
  category: string;
  label: string;
  branch: Branch;
  /** Only Admin sets this. Carried so the figure can name the fork. */
  half?: AdminHalf;
  /** Surfaces behind this grouping. Zero is information, never a gap. */
  count: number;
  leaves: LeafNode[];
};

export type SectorNode = {
  branch: Branch;
  label: string;
  count: number;
  wedges: WedgeNode[];
};

export type BrainMandala = {
  /** Every surface the branch map can reach. The figure's own scale. */
  surfaces: number;
  /** The busiest grouping, so a design can measure against one thing. */
  largest: number;
  sectors: SectorNode[];
};

/**
 * A route as something a person would say out loud.
 *
 * `/figure-stars-trio` is a path. "Figure stars trio" is a name. The outermost
 * ring is where the reader finally learns what a dot IS, so leaving raw paths
 * there would repeat the exact failure ColourMesh recorded — an unnamed mark is
 * decoration.
 */
export function nameOfRoute(route: string): string {
  const bare = route.replace(/^\//, '').replace(/\//g, ' · ').replace(/-/g, ' ');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** The label a grouping carries on the figure, fork included where there is one. */
export function wedgeLabel(wedge: WedgeNode): string {
  if (!wedge.half) return wedge.label;
  return `${wedge.label} · ${ADMIN_HALF_LABELS[wedge.half]}`;
}

export function toMandala(): BrainMandala {
  const sectors: SectorNode[] = BRANCHES.map((branch) => ({
    branch,
    label: BRANCH_LABELS[branch],
    count: weightOf(branch),
    wedges: groupingsIn(branch).map((group) => ({
      category: group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label: group.label,
      branch,
      half: group.half,
      count: group.routes.length,
      leaves: group.routes.map((route) => ({ slug: route, label: nameOfRoute(route) })),
    })),
  }));

  const largest = sectors
    .flatMap((sector) => sector.wedges)
    .reduce((most, wedge) => Math.max(most, wedge.count), 0);

  return {
    surfaces: sectors.reduce((total, sector) => total + sector.count, 0),
    largest,
    sectors,
  };
}
