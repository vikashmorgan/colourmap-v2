import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Same stubbed query builder as the reader's tests, and for the same reason:
 * this file runs unattended in the cloud, so its logic has to be checkable
 * without a database or it will only ever be checked in production.
 */
const rows: unknown[][] = [];
const inserted: unknown[] = [];

vi.mock('@/lib/db/client', () => {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.from = self;
  api.where = self;
  api.orderBy = self;
  api.limit = () => Promise.resolve(rows.shift() ?? []);
  api.insert = self;
  api.values = (value: unknown) => {
    inserted.push(value);
    return Promise.resolve();
  };
  return { getDb: () => api };
});

import {
  buildDigest,
  daysBetween,
  isDueSoon,
  isStalled,
  lastMovement,
  type MissionRow,
  perBranch,
  renderDigest,
  run,
  SOON_WITHIN_DAYS,
  STALLED_AFTER_DAYS,
  userIdFrom,
} from './brain-digest';

const NOW = new Date('2026-09-21T09:00:00Z');

function mission(over: Partial<MissionRow> = {}): MissionRow {
  return {
    title: 'A mission',
    branch: null,
    dueOn: null,
    movedAt: null,
    movedNote: null,
    blocking: null,
    createdAt: new Date('2026-09-20T09:00:00Z'),
    ...over,
  };
}

beforeEach(() => {
  rows.length = 0;
  inserted.length = 0;
  vi.restoreAllMocks();
});

describe('when a mission last moved', () => {
  it('falls back to when it was opened', () => {
    /*
     * A mission nobody has touched since creating it has, factually, not moved
     * since then. Treating "never moved" as "no information" would let a
     * forgotten mission look active forever.
     */
    const created = new Date('2026-09-01T00:00:00Z');
    expect(lastMovement(mission({ createdAt: created, movedAt: null }))).toEqual(created);
  });

  it('prefers a recorded movement over creation', () => {
    const moved = new Date('2026-09-19T00:00:00Z');
    expect(lastMovement(mission({ movedAt: moved }))).toEqual(moved);
  });

  it('counts whole days only', () => {
    expect(daysBetween(new Date('2026-09-20T23:00:00Z'), NOW)).toBe(0);
    expect(daysBetween(new Date('2026-09-11T00:00:00Z'), NOW)).toBe(10);
  });
});

describe('stalled and due', () => {
  it(`calls a mission stalled after ${STALLED_AFTER_DAYS} days without movement`, () => {
    const old = new Date(NOW.getTime() - STALLED_AFTER_DAYS * 86400000);
    const fresh = new Date(NOW.getTime() - 2 * 86400000);

    expect(isStalled(mission({ movedAt: old }), NOW)).toBe(true);
    expect(isStalled(mission({ movedAt: fresh }), NOW)).toBe(false);
  });

  it('treats a mission with no due date as never due soon', () => {
    /* Absence of a date is not urgency, and must never be rendered as any. */
    expect(isDueSoon(mission({ dueOn: null }), NOW)).toBe(false);
  });

  it(`counts anything within ${SOON_WITHIN_DAYS} days as soon, including overdue`, () => {
    expect(isDueSoon(mission({ dueOn: '2026-09-25' }), NOW)).toBe(true);
    expect(isDueSoon(mission({ dueOn: '2026-09-01' }), NOW)).toBe(true);
    expect(isDueSoon(mission({ dueOn: '2026-12-31' }), NOW)).toBe(false);
  });
});

describe('counting by branch', () => {
  it('counts each branch and gathers the unplaced', () => {
    const counts = perBranch([
      mission({ branch: 'art' }),
      mission({ branch: 'art' }),
      mission({ branch: 'admin' }),
      mission({ branch: null }),
      mission({ branch: 'nonsense' }),
    ]);

    expect(counts).toEqual({ art: 2, admin: 1, energy: 0, none: 2 });
  });

  it('keeps a branch with nothing in it rather than dropping it', () => {
    /* A missing branch reads as an error; a zero reads as a fact. */
    expect(perBranch([]).energy).toBe(0);
  });
});

describe('what the digest says', () => {
  it('says plainly when nothing is open', () => {
    const text = renderDigest(NOW, [], NOW, NOW);

    expect(text).toContain('Nothing open');
    expect(text).not.toContain('BLOCKED');
  });

  it('leads with the counts, then due, then blocked, then stalled', () => {
    const text = renderDigest(
      NOW,
      [
        mission({ title: 'Sanitas', blocking: 'no reply since the 18th', branch: 'admin' }),
        mission({ title: 'Codice fiscale', dueOn: '2026-09-25', branch: 'admin' }),
        mission({ title: 'Old thing', movedAt: new Date('2026-08-01T00:00:00Z') }),
      ],
      NOW,
      NOW,
    );

    expect(text).toContain('3 open');
    expect(text.indexOf('DUE SOON')).toBeLessThan(text.indexOf('BLOCKED'));
    expect(text.indexOf('BLOCKED')).toBeLessThan(text.indexOf('NOT MOVED IN'));
    expect(text).toContain('Sanitas — no reply since the 18th');
    expect(text).toContain('2026-09-25  Codice fiscale');
  });

  it('never ranks the branches against each other', () => {
    /*
     * The product does not rank. Counts are facts; "your most productive
     * branch" is a scoreboard, and this is exactly where one would creep in.
     */
    const text = renderDigest(NOW, [mission({ branch: 'art' })], NOW, NOW);

    expect(text).toContain('Art 1');
    expect(text).not.toMatch(/most|best|top|winning|productive/i);
  });

  it('names the unplaced only when there are some', () => {
    expect(renderDigest(NOW, [mission({ branch: 'art' })], NOW, NOW)).not.toContain('unplaced');
    expect(renderDigest(NOW, [mission({ branch: null })], NOW, NOW)).toContain('unplaced 1');
  });

  it('reports silence as an observation, not a reproach', () => {
    const longAgo = new Date('2026-08-20T00:00:00Z');
    const text = renderDigest(NOW, [mission()], longAgo, null);

    expect(text).toContain('Quiet:');
    expect(text).toContain('notebook quiet');
    expect(text).toContain('no check-ins');
    expect(text).not.toMatch(/should|must|failed|behind/i);
  });

  it('stays silent about silence when nothing is quiet', () => {
    expect(renderDigest(NOW, [mission()], NOW, NOW)).not.toContain('Quiet:');
  });
});

describe('running it', () => {
  it('will not guess whose life it is summarising', () => {
    expect(() => userIdFrom({})).toThrow(/BRAIN_USER_ID/);
  });

  it('counts a healthy mission without printing a line about it', async () => {
    /*
     * THE NOISE RULE, ASSERTED.
     *
     * A mission that is not due, not blocked and not stalled earns no line.
     * It is counted and otherwise left alone — a digest that lists everything
     * is the list you already had, and nobody reads it twice.
     */
    rows.push([mission({ title: 'Quietly fine' })]);
    rows.push([{ createdAt: NOW }]);
    rows.push([{ createdAt: NOW }]);

    const text = await buildDigest('victor', NOW);

    expect(text).toContain('1 open');
    expect(text).not.toContain('Quietly fine');
  });

  it('prints the mission that needs attention', async () => {
    rows.push([mission({ title: 'Sanitas', blocking: 'no reply' })]);
    rows.push([{ createdAt: NOW }]);
    rows.push([{ createdAt: NOW }]);

    const text = await buildDigest('victor', NOW);

    expect(text).toContain('Sanitas — no reply');
  });

  it('writes one row, tagged with where it ran', async () => {
    rows.push([], [], []);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await run({ BRAIN_USER_ID: 'victor', DIGEST_SOURCE: 'github-actions' }, NOW);

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ userId: 'victor', source: 'github-actions' });
  });

  it('writes nothing on a dry run', async () => {
    /*
     * The only way to see what the scheduled job would say without adding a
     * row nobody asked for.
     */
    rows.push([], [], []);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await run({ BRAIN_USER_ID: 'victor', DIGEST_DRY_RUN: 'true' }, NOW);

    expect(inserted).toHaveLength(0);
  });
});
