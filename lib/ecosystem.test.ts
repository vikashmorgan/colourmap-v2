import { describe, expect, it } from 'vitest';

import {
  APP_IDS,
  APPS,
  atStage,
  isolated,
  LINKS,
  leanedOnBy,
  linksFrom,
  linksTo,
  STAGES,
  unreachable,
} from './ecosystem';

describe('the apps', () => {
  it('describes and stages every one', () => {
    for (const app of APPS) {
      expect(app.purpose.length, `${app.id} purpose`).toBeGreaterThan(30);
      expect(STAGES).toContain(app.stage);
    }
  });

  it('gives each one a single next action rather than a backlog', () => {
    /*
     * Four projects with four backlogs is how none of them move. One sentence
     * each, so the figure can say what is next without opening anything.
     */
    for (const app of APPS) {
      expect(app.next.length, `${app.id} next`).toBeGreaterThan(25);
      expect(app.next, `${app.id} next`).not.toContain('\n');
    }
  });

  it('keeps ids unique and complete', () => {
    expect(APPS.map((app) => app.id).sort()).toEqual([...APP_IDS].sort());
  });
});

describe('a link is a dependence, not a resemblance', () => {
  it('says what passes along every edge', () => {
    /*
     * The whole discipline. Four projects by one person resemble each other
     * constantly without depending on each other at all, and a connection
     * nobody can describe is a resemblance.
     */
    for (const link of LINKS) {
      expect(link.carries.length, `${link.from}->${link.to}`).toBeGreaterThan(30);
    }
  });

  it('points only at apps that exist', () => {
    for (const link of LINKS) {
      expect(APP_IDS).toContain(link.from);
      expect(APP_IDS).toContain(link.to);
    }
  });

  it('never points an app at itself', () => {
    for (const link of LINKS) {
      expect(link.from, 'self-dependence is not a fact about anything').not.toBe(link.to);
    }
  });

  it('has a direction, because "related" is useless', () => {
    /* If both directions existed the edge would say nothing about propagation. */
    for (const link of LINKS) {
      const mirrored = LINKS.some((other) => other.from === link.to && other.to === link.from);
      expect(mirrored, `${link.from} and ${link.to} point at each other`).toBe(false);
    }
  });
});

describe('what the figure admits', () => {
  it('reports ColourMesh as floating, because it is', () => {
    /*
     * THIS IS MEANT TO STOP BEING TRUE, ONE WAY OR THE OTHER.
     *
     * Nothing depends on ColourMesh and it depends on nothing. An isolated
     * project is either the next thing to connect or the next thing to stop,
     * and both are decisions rather than things to drift into.
     *
     * Whoever breaks this test should have made that decision.
     */
    expect(isolated().map((app) => app.id)).toEqual(['mesh']);
  });

  it('places the network map inside the shipping ledger it derives from', () => {
    /* It is not a fourth product. It is that corpus read along another axis. */
    const network = APPS.find((app) => app.id === 'network');

    expect(network?.repo).toBe('shipping-map');
    expect(linksFrom('network').map((link) => link.to)).toContain('shipping');
  });

  it('counts dependants without ranking anything', () => {
    /* Size is a count, never a judgement. Brain is leaned on most; that makes
     * it a hub, not a winner. */
    expect(leanedOnBy('brain')).toBe(linksTo('brain').length);
    expect(leanedOnBy('brain')).toBeGreaterThan(0);
  });

  it('knows which things anyone else could reach today', () => {
    /*
     * Chill Machine was listed here as sketched, with no repository and a next
     * step of deciding whether it should exist. It already existed and was
     * three commands from live — which is the failure a map of several
     * projects is meant to prevent, made by the map.
     */
    expect(
      atStage('live')
        .map((app) => app.id)
        .sort(),
    ).toEqual(['brain', 'chill']);
    expect(unreachable()).toHaveLength(APPS.length - 2);
  });

  it('gives every app with a repository a real one on disk', () => {
    /* The rule that would have caught the Chill Machine mistake. */
    const known = ['colourmap-v2', 'shipping-map', 'milanmap', 'chill-machine'];

    for (const app of APPS) {
      if (!app.repo) continue;
      expect(known, `${app.id} points at a repo nobody has`).toContain(app.repo);
    }
  });
});
