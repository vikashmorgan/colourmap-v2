/*
 * THE LIFE TREE, DESIGN II — every page on the tree, and the tree shows use.
 *
 * Martin, 2026-10-30, asked how the G menu's organisation could be better,
 * then: "do it as a second tree so I can combine both versions". Design I
 * (lib/life-tree.ts) reads lib/branches.ts, which places about twenty pages;
 * the rest of the app could not be reached from the tree. Design II places
 * every page the Grid knows (lib/grid.ts HUBS), so the tree is the whole way
 * round the brain, and lays a branch out in one view: its areas are the
 * limbs, their pages hang from the tips of that limb. Any page is two taps
 * from G.
 *
 * It also reads the one fact the Grid keeps -- when you last opened a page --
 * and lets it show: pages opened this week glow, and so does the tree they
 * are on. No counts, no scores.
 *
 * Which branch and area a page sits in is decided here, not stored, the same
 * rule as lib/branches.ts: changing this map re-sorts the tree.
 */

import type { Branch } from './branches';
import { type GridNode, HUBS, isOnline, type Visits, visitKey } from './grid';

export type Area2 = {
  label: string;
  /** Pages, by address. Empty is honest: nothing is built here yet. */
  pages: string[];
};

export const AREAS_2: Record<Branch, Area2[]> = {
  art: [
    { label: 'Writing', pages: ['/sparks'] },
    {
      label: 'Visual',
      pages: [
        '/art/flow',
        '/geometry-field',
        '/art/butterflies',
        '/art/light',
        '/figures',
        '/figure-stars',
        '/figure-stars-trio',
        '/build-lab',
        '/atlas',
        '/studios',
      ],
    },
    {
      label: 'Music',
      pages: ['/music', 'https://chillmachine.vercel.app', 'https://tunnelsurfer.vercel.app'],
    },
    { label: 'Play', pages: ['/entertainment'] },
  ],
  admin: [
    { label: 'Money', pages: [] },
    { label: 'Papers', pages: [] },
    { label: 'Messages', pages: [] },
    { label: 'Masters', pages: ['/education', '/school'] },
    { label: 'Skills', pages: ['/coding', '/git', '/sql'] },
    { label: 'Shipping', pages: ['/research', '/proposal/cma-cgm'] },
    { label: 'Pitches', pages: ['/proposal/ferrari'] },
    { label: 'Network', pages: ['/circles'] },
    { label: 'Building', pages: ['/workshop', '/shipyard', '/extras'] },
  ],
  energy: [
    { label: 'Body', pages: ['/health', '/life-scan'] },
    { label: 'Routines', pages: ['/programs'] },
    { label: 'Habits', pages: [] },
  ],
};

/** The pages about you, round the root. */
export const CENTRE_2 = ['/day', '/notebook', '/journey', '/progress-road', '/ai', '/profile'];

const NODES: GridNode[] = HUBS.flatMap((h) => h.nodes);

/** The Grid's own page, or a plain one for an address it does not list. */
export function page(href: string): GridNode {
  return NODES.find((n) => n.href === href) ?? { href, label: href, line: '' };
}

/** Every page the tree places, branches and centre. */
export function placedPages(): string[] {
  return [...CENTRE_2, ...Object.values(AREAS_2).flatMap((areas) => areas.flatMap((a) => a.pages))];
}

/** Pages the Grid knows that the tree has not placed: should always be empty. */
export function unplacedPages(): string[] {
  const placed = new Set(placedPages());
  return NODES.map((n) => n.href).filter((h) => !placed.has(h));
}

/* ── What use shows ──────────────────────────────────────────────────── */

/** How awake a branch is: 0 when nothing on it was opened this week, 1 when everything was. */
export function branchWarmth(branch: Branch, visits: Visits, now: number): number {
  const pages = AREAS_2[branch].flatMap((a) => a.pages);
  if (!pages.length) return 0;
  return pages.filter((h) => isOnline(visits, h, now)).length / pages.length;
}

/** The last `n` pages opened, newest first, among those the tree places. */
export function recentPages(visits: Visits, n = 3): string[] {
  const placed = new Set(placedPages().map(visitKey));
  return Object.entries(visits)
    .filter(([k]) => placed.has(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => placedPages().find((h) => visitKey(h) === k) ?? k);
}

/** Pages whose name starts a word with what was typed, best first: start of name, then any word. */
export function matchPages(query: string, limit = 5): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = placedPages();
  const starts = all.filter((h) => page(h).label.toLowerCase().startsWith(q));
  const words = all.filter(
    (h) =>
      !starts.includes(h) &&
      page(h)
        .label.toLowerCase()
        .split(/[\s&-]+/)
        .some((w) => w.startsWith(q)),
  );
  return [...starts, ...words].slice(0, limit);
}

export type Placed = { at: [number, number]; w: number; h: number };

/**
 * Nudges names apart until none overlap (or `rounds` run out): each pair that
 * touches is pushed apart along the line between them, half each, mostly up
 * and down so the names stay near their tips. Pure; mutates and returns `list`.
 */
export function spreadLabels<T extends Placed>(list: T[], rounds = 40, gap = 6): T[] {
  for (let r = 0; r < rounds; r++) {
    let moved = false;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i] as T;
        const b = list[j] as T;
        const ox = (a.w + b.w) / 2 + gap - Math.abs(a.at[0] - b.at[0]);
        const oy = (a.h + b.h) / 2 + gap - Math.abs(a.at[1] - b.at[1]);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Out along the shorter overlap, favouring vertical moves.
        if (oy <= ox * 1.5) {
          const d = (a.at[1] <= b.at[1] ? -1 : 1) * (oy / 2 + 0.5);
          a.at = [a.at[0], a.at[1] + d];
          b.at = [b.at[0], b.at[1] - d];
        } else {
          const d = (a.at[0] <= b.at[0] ? -1 : 1) * (ox / 2 + 0.5);
          a.at = [a.at[0] + d, a.at[1]];
          b.at = [b.at[0] - d, b.at[1]];
        }
      }
    }
    if (!moved) break;
  }
  return list;
}
