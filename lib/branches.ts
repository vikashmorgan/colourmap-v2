/*
 * THREE BRANCHES AND A STILL CENTRE.
 *
 * `docs/product.md` says "Life doesn't have compartments. The notebook, the
 * missions, the check-ins, the songs — all one brain." A structure of named
 * branches looks like exactly the compartments that sentence refuses, so the
 * rule that keeps both true has to be stated before anything else:
 *
 *   A BRANCH IS COMPUTED, NEVER STORED.
 *
 * Nothing is filed anywhere. The database knows what a thing *is*; which
 * branch it appears under is a pure function over that, and changing the
 * function re-sorts the whole app without a migration. The branches are how
 * you stand inside one brain, not how you cut it into four.
 *
 * The same discipline is why the figure that draws this makes the other
 * branches *recede* rather than disappear. A reader who cannot see what they
 * turned away from has been navigated, not oriented.
 *
 * WHY THREE, WHEN THE OBVIOUS ANSWER WAS FIVE
 *
 * This is adapted from ColourMesh's `lib/trees.ts`, which uses five branches
 * of three categories each and argues at length for that shape: the scheme it
 * replaced was 3 / 11 / 1, and "rendered as sections it is a heading with
 * eleven things under it and a heading with one, so it had to stay a filter."
 * Evenness is what makes a structure a structure rather than a lens.
 *
 * The number five was never the point. Five was what that product's fifteen
 * interest categories divided into evenly. This product is one person's life,
 * and it divides into three:
 *
 *   ART           what gets made
 *   ADMIN         what has to be handled, and what is being built toward
 *   ENERGY        what the machine is running on
 *
 * THE CENTRE IS NOT A BRANCH, AND THAT IS THE LOAD-BEARING DECISION.
 *
 * Check-in, the notebook, how you are today — these were nearly filed under
 * Energy, next to routines and sleep. That would have demoted the trunk into one
 * of the spokes. How your *body* is belongs in Energy. How *you* are is the
 * middle, and everything else is arranged around it.
 *
 * ADMIN FORKS, AND IT FORKS ON PURPOSE.
 *
 * Admin carries two halves that are genuinely different in kind — the things
 * that must be handled to stay alive somewhere, and the direction being built
 * toward. They are one branch today because Professional is three months old
 * and a branch of its own would be mostly empty. The fork is declared here so
 * that promoting it later is a two-line change rather than a redesign.
 */

export const BRANCHES = ['art', 'admin', 'energy'] as const;

export type Branch = (typeof BRANCHES)[number];

/**
 * The names a reader sees. The keys never change, so renaming is a copy
 * decision rather than a migration.
 */
export const BRANCH_LABELS: Record<Branch, string> = {
  art: 'Art',
  admin: 'Admin',
  energy: 'Energy',
};

/**
 * What each branch is for, in your own terms.
 *
 * One line each, and never a count — a description carrying a number becomes a
 * scoreboard row, and this is not a leaderboard.
 */
export const BRANCH_BLURBS: Record<Branch, string> = {
  art: 'What you write, make, and play',
  admin: 'What has to be handled, and what you are building toward',
  energy: 'Sport, health, sleep — what you are running on',
};

/**
 * One hue per branch. Desaturated on purpose: three saturated colours on one
 * screen is a chart, and this is a place rather than a readout.
 */
export const BRANCH_HUE: Record<Branch, string> = {
  art: '#8a6a9c',
  admin: '#c4a060',
  energy: '#5f8a6a',
};

/* ── The fork inside Admin ─────────────────────────────────────────────── */

export const ADMIN_HALVES = ['life', 'professional'] as const;

export type AdminHalf = (typeof ADMIN_HALVES)[number];

export const ADMIN_HALF_LABELS: Record<AdminHalf, string> = {
  life: 'Life admin',
  professional: 'Professional',
};

export const ADMIN_HALF_BLURBS: Record<AdminHalf, string> = {
  life: 'Insurance, payments, papers, people owed a reply',
  professional: 'The masters, shipping and trading, the network',
};

/* ── What sits under each branch ───────────────────────────────────────── */

export type Grouping = {
  branch: Branch;
  /** Only set for Admin, which forks. */
  half?: AdminHalf;
  label: string;
  /** App routes that belong here. Empty means the work happens elsewhere. */
  routes: string[];
};

/**
 * THE MAP, AND WHAT IT REVEALS.
 *
 * Writing this down is what turned a naming exercise into a finding. Two of
 * them, both uncomfortable and both useful:
 *
 * 1. LIFE ADMIN HAS NO SURFACES AT ALL. Insurance, payments, the people owed
 *    a reply — none of it exists in this app. It is the branch with the most
 *    real weight in the owner's week and the least code behind it. The tree
 *    will render it nearly empty, which is the honest thing for it to do and
 *    the clearest statement of what to build next.
 *
 * 2. ART IS ENORMOUS AND ALMOST ENTIRELY VISUAL TOOLING. Ten of the app's
 *    thirty surfaces are generative visual work. That is not a branch of a
 *    life organiser; it is a second product living inside one, and it is the
 *    reason extracting Colour Studio comes after this.
 */
export const GROUPINGS: Grouping[] = [
  /* Art — what gets made. */
  { branch: 'art', label: 'Writing', routes: [] },
  {
    branch: 'art',
    label: 'Visual',
    routes: [
      '/geometry-field',
      '/figures',
      '/figure-stars',
      '/figure-stars-trio',
      '/dot-walker-arena',
      '/build-lab',
      '/proportion-buddy',
      '/atlas',
      '/studios',
    ],
  },
  { branch: 'art', label: 'Music', routes: ['/music', '/sounds'] },

  /* Admin — the fork. */
  { branch: 'admin', half: 'life', label: 'Money', routes: [] },
  { branch: 'admin', half: 'life', label: 'Messages', routes: [] },
  { branch: 'admin', half: 'life', label: 'Papers', routes: [] },
  { branch: 'admin', half: 'professional', label: 'Masters', routes: ['/education'] },
  { branch: 'admin', half: 'professional', label: 'Shipping & trading', routes: ['/research'] },
  { branch: 'admin', half: 'professional', label: 'Network', routes: [] },

  /* Energy — what the machine is running on. */
  { branch: 'energy', label: 'Routines', routes: ['/programs'] },
  { branch: 'energy', label: 'Habits', routes: [] },
  { branch: 'energy', label: 'How the body is', routes: ['/life-scan'] },
];

/**
 * The centre. Not a branch, and never rendered as one.
 *
 * These are the surfaces that are *about how you are* rather than about an
 * area of life. They stay in the middle of the figure because that is what
 * the product is: the branches are what you do, this is who is doing it.
 */
export const CENTRE_ROUTES = [
  '/day',
  '/notebook',
  '/journey',
  '/progress-road',
  '/chat',
  '/ai',
  '/profile',
];

/* ── Reading the map ───────────────────────────────────────────────────── */

export function groupingsIn(branch: Branch): Grouping[] {
  return GROUPINGS.filter((group) => group.branch === branch);
}

export function halvesOf(branch: Branch): AdminHalf[] {
  if (branch !== 'admin') return [];
  return [...ADMIN_HALVES];
}

/** Which branch a route belongs to, or undefined for the centre and beyond. */
export function branchOf(route: string): Branch | undefined {
  return GROUPINGS.find((group) => group.routes.includes(route))?.branch;
}

export function isCentre(route: string): boolean {
  return CENTRE_ROUTES.includes(route);
}

/**
 * Routes the branch map has never heard of.
 *
 * Deliberately computed rather than maintained by hand. A surface that belongs
 * to no branch and is not the centre is either something to place, something
 * to move to another app, or something to delete — and this is the list that
 * says which decisions are still outstanding.
 */
export function unplaced(allRoutes: readonly string[]): string[] {
  return allRoutes.filter((route) => !branchOf(route) && !isCentre(route));
}

/** How many routes a branch can actually reach. Zero is a finding, not a bug. */
export function weightOf(branch: Branch): number {
  return groupingsIn(branch).reduce((total, group) => total + group.routes.length, 0);
}
