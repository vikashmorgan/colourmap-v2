/*
 * THE APPS, AS A THING YOU CAN STAND INSIDE.
 *
 * `lib/branches.ts` maps one life into three branches. This maps the software
 * that life is being built out of — and it is a different question, so it gets
 * a different model rather than being forced into the branch tree.
 *
 * WHY THIS IS NOT JUST ANOTHER BRANCH
 *
 * The obvious move is to file the apps under Art and Professional and be done.
 * It fails for a specific reason: a branch answers *which part of a life is
 * this*, and every one of these answers "several". Shipping Map is
 * professional and it is also the thing being made. Colour Brain holds the
 * admin that pays for the time to build Shipping Map. Filing them flattens
 * exactly the relationship worth seeing.
 *
 * So the apps are their own figure, and what it draws is not ownership but
 * DEPENDENCE — which one needs which, and where the work actually is.
 *
 * WHAT A STAGE IS FOR
 *
 * Every app here is at a different distance from being real, and the most
 * common mistake when holding four projects is treating them as equally alive.
 * A stage is a fact about reachability, not a score:
 *
 *   live      a person who is not you could use it today
 *   built     it runs, and only you can reach it
 *   specified written down in full, not built
 *   sketched  an idea with a name and no argument yet
 *
 * A LINK IS A DEPENDENCE, AND IT HAS A DIRECTION
 *
 * `from` needs `to`. Drawing undirected lines would say these four are
 * "related", which is true and useless. Direction is what makes the figure say
 * where a change propagates — and what makes it obvious that one node has
 * nothing pointing at it, which is the question worth asking about any project.
 */

export const APP_IDS = ['brain', 'shipping', 'mesh', 'network', 'studio', 'sound'] as const;

export type AppId = (typeof APP_IDS)[number];

export type Stage = 'live' | 'built' | 'specified' | 'sketched';

/** Ascending reachability. Index is the level, which is how the figure sizes a node. */
export const STAGES: readonly Stage[] = ['sketched', 'specified', 'built', 'live'];

export const STAGE_LABEL: Record<Stage, string> = {
  live: 'Live',
  built: 'Built',
  specified: 'Specified',
  sketched: 'Sketched',
};

export type App = {
  id: AppId;
  name: string;
  /** One line. What it is for, not what it contains. */
  purpose: string;
  stage: Stage;
  /** Where the code is, or null when there is no repository yet. */
  repo: string | null;
  /**
   * The next thing that would move it, stated as one action.
   *
   * Not a backlog. A single sentence per app, because four projects with four
   * backlogs is how none of them move — and because the figure should be able
   * to show what is next without opening anything.
   */
  next: string;
};

export const APPS: App[] = [
  {
    id: 'brain',
    name: 'Colour Brain',
    purpose: 'Clarity, the art of admin, and staying whole across everything else here.',
    stage: 'live',
    repo: 'colourmap-v2',
    next: 'Run the migration so missions can carry a branch, a date and their movement.',
  },
  {
    id: 'shipping',
    name: 'Shipping Map',
    purpose: 'Where the flows are, what blocks them, and which blocks are somebody’s opening.',
    stage: 'built',
    repo: 'shipping-map',
    next: 'Count whether shared blocks are dense enough to draw a graph from.',
  },
  {
    id: 'mesh',
    name: 'ColourMesh',
    purpose: 'Who in a community you should meet, and why — bridges rather than likeness.',
    stage: 'built',
    repo: 'milanmap',
    next: 'Decide whether it stays a matching product or becomes network mapping.',
  },
  {
    id: 'network',
    name: 'Network Map',
    purpose: 'Who bears which block in Geneva trading, drawn as points and clusters.',
    stage: 'specified',
    /* Deliberately inside Shipping Map. It is that ledger read along another axis. */
    repo: 'shipping-map',
    next: 'Twenty interviews. They produce the map rather than the other way round.',
  },
  {
    id: 'studio',
    name: 'Colour Studio',
    purpose: 'The generative visual work, out of the life organiser it is currently living inside.',
    stage: 'sketched',
    repo: null,
    next: 'Extract ten surfaces out of Colour Brain, which is most of its Art branch.',
  },
  {
    id: 'sound',
    name: 'Colour Sound',
    purpose: 'Music and sound, including the beds that end up in Ableton.',
    stage: 'sketched',
    repo: null,
    next: 'Decide whether it is its own app or a room inside Studio.',
  },
];

export type Link = {
  from: AppId;
  to: AppId;
  /** What actually passes along this edge. Vague answers here mean a fake edge. */
  carries: string;
};

/*
 * THE EDGES, AND THE ONES DELIBERATELY ABSENT.
 *
 * Every link names what passes along it. That requirement is the whole
 * discipline: a connection nobody can describe is a resemblance, and four
 * projects by one person resemble each other constantly without depending on
 * each other at all.
 *
 * ColourMesh points at nothing and nothing points at it. That is not an
 * oversight — it is the most useful thing this figure says, and the reason it
 * exists. An isolated node is either the next thing to connect or the next
 * thing to stop.
 */
export const LINKS: Link[] = [
  {
    from: 'network',
    to: 'shipping',
    carries: 'The whole corpus. Every edge derives from a block already in that ledger.',
  },
  {
    from: 'shipping',
    to: 'brain',
    carries: 'Missions. Research intentions live in the Professional half of Admin.',
  },
  {
    from: 'studio',
    to: 'brain',
    carries: 'Finished pieces, so Art has something true to show.',
  },
  {
    from: 'sound',
    to: 'brain',
    carries: 'Finished tracks, same shape as Studio.',
  },
  {
    from: 'sound',
    to: 'studio',
    carries: 'A shared shell, if Sound turns out to be a room rather than an app.',
  },
];

export function app(id: AppId): App | undefined {
  return APPS.find((entry) => entry.id === id);
}

export function linksFrom(id: AppId): Link[] {
  return LINKS.filter((link) => link.from === id);
}

export function linksTo(id: AppId): Link[] {
  return LINKS.filter((link) => link.to === id);
}

/**
 * Apps nothing depends on and which depend on nothing.
 *
 * Computed rather than listed, so it cannot go stale. This is the question the
 * figure exists to answer: what is floating, and is that deliberate?
 */
export function isolated(): App[] {
  return APPS.filter((entry) => linksFrom(entry.id).length === 0 && linksTo(entry.id).length === 0);
}

/**
 * How many other apps lean on this one.
 *
 * Used for size, and for nothing else. It is a count of dependence, not a
 * judgement of worth — an app with no dependants may simply be the newest.
 */
export function leanedOnBy(id: AppId): number {
  return linksTo(id).length;
}

export function atStage(stage: Stage): App[] {
  return APPS.filter((entry) => entry.stage === stage);
}

/** Everything that is not yet reachable by anyone but its author. */
export function unreachable(): App[] {
  return APPS.filter((entry) => entry.stage !== 'live');
}
