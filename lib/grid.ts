/*
 * THE GRID — every page the app has today, as a network you move through.
 *
 * 2026-10-25. Martin: "imagine for the apps I have now how system of networks
 * would look like a videogame cool menu kind of thing". The tree
 * (`lib/branches.ts`) is a picture of a life, and much of it has no pages yet;
 * this is the opposite figure: only what exists, as hubs and nodes joined by
 * lines, with signals running along the links that are real.
 *
 * WHAT A NODE SAYS, AND ONLY THAT
 *
 *   online     opened this week (bright, slow pulse)
 *   idle       not opened lately, or never (dim, still there)
 *   prototype  a page that is still a sketch (dashed)
 *   satellite  a separate app, outside the grid
 *
 * No counts, no scores. "Online" is a fact read from when you last opened it.
 *
 * Pure: no DOM. Positions are fractions of the screen, 0..1.
 */

export type HubId = 'you' | 'sound' | 'mind' | 'learn' | 'engine' | 'play' | 'body' | 'studio';

export type GridNode = {
  href: string;
  label: string;
  /** One line on what it is. */
  line: string;
  /** Still a sketch. */
  prototype?: boolean;
  /** A standalone page served by a route handler: an ordinary link, not a client one. */
  plain?: boolean;
  /** A separate app. */
  external?: boolean;
};

export type Hub = {
  id: HubId;
  label: string;
  line: string;
  /** The hub's own small glow. Gold stays the main colour everywhere. */
  accent: string;
  nodes: GridNode[];
};

export const GOLD = '#C4A060';

/** The core first, then the ring clockwise from the top. */
export const HUBS: Hub[] = [
  {
    id: 'you',
    label: 'You',
    line: 'Your day, your road, your story',
    accent: '#f1dfb4',
    nodes: [
      { href: '/day', label: 'Focus', line: 'Today: check in, missions, what matters now' },
      { href: '/journey', label: 'Journey', line: 'Your life timeline and what you have mastered' },
      {
        href: '/progress-road',
        label: 'Progress road',
        line: 'The road you are walking, drawn',
        prototype: true,
      },
      { href: '/profile', label: 'Profile', line: 'Who is signed in, and the settings' },
    ],
  },
  {
    id: 'sound',
    label: 'Sound',
    line: 'Music made and played',
    accent: '#d46ab0',
    nodes: [
      { href: '/music', label: 'Music', line: 'Music Studio, Guitar Studio, Songs' },
      {
        href: 'https://chillmachine.vercel.app',
        label: 'Chill Machine',
        line: 'Piano, pads, beats and visuals: its own app',
        external: true,
      },
      {
        href: 'https://tunnelsurfer.vercel.app',
        label: 'TunnelSurfer',
        line: 'Ride the tunnel to the music: its own app',
        external: true,
      },
    ],
  },
  {
    id: 'mind',
    label: 'Mind',
    line: 'Thinking, writing, people',
    accent: '#5fc4d4',
    nodes: [
      { href: '/notebook', label: 'Notes', line: 'Every notebook, quick notes and deep dives' },
      { href: '/ai', label: 'AI', line: 'Think it through with the AI' },
      { href: '/sparks', label: 'Sparks', line: 'Ideas that light up, and their map' },
      { href: '/circles', label: 'Circles', line: 'Your team and the people around you' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    line: 'Classes, the world, the work',
    accent: '#6a8ce0',
    nodes: [
      { href: '/education', label: 'Education', line: 'Programs, and World mode for geopolitics' },
      { href: '/school', label: 'School', line: 'The way into every class', plain: true },
      { href: '/coding', label: 'Python', line: 'Learn Python, step by step', plain: true },
      { href: '/git', label: 'Git', line: 'Learn Git, step by step', plain: true },
      { href: '/sql', label: 'SQL', line: 'Learn SQL', plain: true },
      { href: '/research', label: 'Research', line: 'Shipping and trading research' },
      { href: '/proposal/cma-cgm', label: 'CMA CGM', line: 'The CMA CGM proposal' },
      { href: '/proposal/ferrari', label: 'Ferrari', line: 'The Ferrari proposal' },
    ],
  },
  {
    id: 'engine',
    label: 'Engine room',
    line: 'How the app itself is built',
    accent: '#c45a4a',
    nodes: [
      { href: '/workshop', label: 'Workshop', line: 'The app architecture' },
      { href: '/shipyard', label: 'Shipyard', line: 'Where finished work ships' },
      {
        href: '/extras',
        label: 'Extras',
        line: 'Overview demos and the quick scan',
        prototype: true,
      },
    ],
  },
  {
    id: 'play',
    label: 'Play',
    line: 'Stories to get lost in',
    accent: '#e08a3c',
    nodes: [{ href: '/entertainment', label: 'Billy', line: "Billy's infinite comic" }],
  },
  {
    id: 'body',
    label: 'Body',
    line: 'What you are running on',
    accent: '#5fae6a',
    nodes: [
      {
        href: '/health',
        label: 'Health',
        line: 'Knee, shoulder and feet, day by day',
        plain: true,
      },
      { href: '/life-scan', label: 'Life scan', line: 'A scan of how life is going' },
      { href: '/programs', label: 'Programs', line: 'Routines to follow' },
    ],
  },
  {
    id: 'studio',
    label: 'Studio',
    line: 'Visual art and the tools to make it',
    accent: '#9a7ad4',
    nodes: [
      {
        href: '/geometry-field',
        label: 'Geometry',
        line: 'The Geometry Builder: stars, wind, figures',
      },
      { href: '/art/flow', label: 'Flow', line: 'AI Sculptures, the Flow collection' },
      {
        href: '/art/butterflies',
        label: 'Butterflies',
        line: 'Liquid Butterflies: mirrored, flowing, always changing',
      },
      { href: '/figures', label: 'Figures', line: '3D figures' },
      { href: '/figure-stars', label: 'Figure stars', line: 'Figures drawn in stars' },
      { href: '/figure-stars-trio', label: 'Trio', line: 'Three figures in stars' },
      { href: '/dot-walker-arena', label: 'Arena', line: 'The dot walker arena' },
      { href: '/build-lab', label: 'Build lab', line: 'Creator space', prototype: true },
      { href: '/proportion-buddy', label: 'Proportions', line: 'Proportion buddy' },
      { href: '/atlas', label: 'Atlas', line: 'The living atlas', prototype: true },
      { href: '/studios', label: 'Studios', line: 'Colour studios' },
    ],
  },
];

export const hubById = (id: HubId): Hub => HUBS.find((h) => h.id === id) as Hub;

/** Links between hubs that carry something real, and what passes along them. */
export const SIGNALS: { from: HubId; to: HubId; what: string }[] = [
  { from: 'body', to: 'you', what: 'how the body is, into the day' },
  { from: 'mind', to: 'learn', what: 'the AI helps you learn' },
  { from: 'studio', to: 'sound', what: 'visuals that play to music' },
  { from: 'play', to: 'studio', what: 'the comic uses the figures' },
  { from: 'mind', to: 'you', what: 'notes feed the day' },
];

export type Point = { x: number; y: number };

/** Where the core sits. */
export const CORE: Point = { x: 0.5, y: 0.5 };

/**
 * Where ring hub `i` of `n` sits: on an ellipse round the core, the first at
 * the top. Narrow screens get a taller ellipse so labels do not collide.
 */
export function hubPoint(i: number, n: number, aspect = 1): Point {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  const rx = aspect < 0.8 ? 0.36 : 0.32;
  const ry = aspect < 0.8 ? 0.36 : 0.38;
  return { x: CORE.x + Math.cos(a) * rx, y: CORE.y + Math.sin(a) * ry };
}

/** Where node `i` of `n` sits round its hub once zoomed in (the hub in the middle). */
export function nodePoint(i: number, n: number, aspect = 1): Point {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  const r = n > 6 ? 0.36 : 0.3;
  const rx = aspect < 0.8 ? r * 1.05 : r * 0.85;
  const ry = aspect < 0.8 ? r * 0.85 : r;
  return { x: CORE.x + Math.cos(a) * rx, y: CORE.y + Math.sin(a) * ry };
}

/** Where a hub's satellites sit in the overview: further out, beyond the hub. */
export function satellitePoint(hub: Point, k: number, n: number): Point {
  const dx = hub.x - CORE.x;
  const dy = hub.y - CORE.y;
  const len = Math.hypot(dx, dy) || 1;
  const spread = (k - (n - 1) / 2) * 0.16;
  const out = 0.11;
  return {
    x: Math.min(0.96, Math.max(0.04, hub.x + (dx / len) * out - (dy / len) * spread)),
    y: Math.min(0.96, Math.max(0.04, hub.y + (dy / len) * out + (dx / len) * spread)),
  };
}

export type Dir = 'up' | 'down' | 'left' | 'right';

/**
 * The point an arrow key moves to from `from`: the nearest one in that
 * direction, with straight-on beating off to the side. `null` when there is
 * nothing that way.
 */
export function nextInDirection(points: Point[], from: number, dir: Dir): number | null {
  const o = points[from];
  if (!o) return null;
  let best: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  points.forEach((p, i) => {
    if (i === from) return;
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    const along = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
    const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (along <= 1e-6) return;
    const score = along + side * 2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/* ── When you last opened it ─────────────────────────────────────────── */

export const VISITS_KEY = 'cb-grid-visits';

const DAY = 24 * 60 * 60 * 1000;

/** Online means opened in the last week. */
export const ONLINE_FOR = 7 * DAY;

export type Visits = Record<string, number>;

/** The path a visit is filed under: no query, no hash, no trailing slash. */
export function visitKey(href: string): string {
  const path = href.split(/[?#]/)[0] ?? href;
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

export function parseVisits(raw: string | null): Visits {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return {};
    const out: Visits = {};
    for (const [k, t] of Object.entries(v as Record<string, unknown>)) {
      if (typeof t === 'number' && Number.isFinite(t)) out[k] = t;
    }
    return out;
  } catch {
    return {};
  }
}

export function withVisit(visits: Visits, href: string, now: number): Visits {
  return { ...visits, [visitKey(href)]: now };
}

export const isOnline = (visits: Visits, href: string, now: number): boolean => {
  const t = visits[visitKey(href)];
  return t !== undefined && now - t < ONLINE_FOR;
};

/** A hub is online when any of its nodes is. */
export const hubOnline = (visits: Visits, hub: Hub, now: number): boolean =>
  hub.nodes.some((n) => isOnline(visits, n.href, now));

/** "today", "yesterday", "4 days ago", "not yet". */
export function lastSeen(visits: Visits, href: string, now: number): string {
  const t = visits[visitKey(href)];
  if (t === undefined) return 'not yet';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((today.getTime() - t) / DAY);
  if (t >= today.getTime()) return 'today';
  if (days <= 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return 'a while ago';
}

/** Saves a visit in this browser; never throws. */
export function recordVisit(href: string, now = Date.now()): void {
  try {
    const visits = parseVisits(window.localStorage.getItem(VISITS_KEY));
    window.localStorage.setItem(VISITS_KEY, JSON.stringify(withVisit(visits, href, now)));
  } catch {
    // Private window or blocked storage: the grid just shows everything idle.
  }
}

export function readVisits(): Visits {
  try {
    return parseVisits(window.localStorage.getItem(VISITS_KEY));
  } catch {
    return {};
  }
}

/* ── The quick menu: a wheel, or a terminal (components/GridMenu.tsx) ── */

export type MenuMode = 'wheel' | 'terminal';

export const MENU_MODE_KEY = 'cb-grid-menu-mode';

export const parseMenuMode = (raw: string | null): MenuMode =>
  raw === 'terminal' ? 'terminal' : 'wheel';

/** Where item `i` of `n` sits on a wheel of radius `r` round (0, 0): the first at the top, then clockwise. */
export function wheelPoint(i: number, n: number, r: number): Point {
  const a = -Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

/** The next index round a ring of `n`, either way, wrapping. */
export const step = (i: number, n: number, by: number): number =>
  n <= 0 ? 0 : (((i + by) % n) + n) % n;

/** The key that opens the quick menu, unless the person is typing somewhere. */
export function isMenuKey(
  e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean },
  typing: boolean,
): boolean {
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key === 'g' || e.key === 'G' || e.key === '`';
}

/** Opens a page: a separate app in a new tab, a standalone page by a full load, an app screen by the router. */
export function openNode(node: GridNode, push: (href: string) => void): void {
  recordVisit(node.href);
  if (node.external) window.open(node.href, '_blank', 'noopener');
  else if (node.plain) window.location.assign(node.href);
  else push(node.href);
}
