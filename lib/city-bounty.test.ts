import { describe, expect, it } from 'vitest';

import { hash, type Vec3 } from './bigbang';
import { FLY_SPEED, STREET_BOOST } from './city';
import {
  BOUNTY_SLOT,
  type Bounty,
  type BountyInput,
  bountyItems,
  bountyShows,
  bountyStep,
  ESCAPE_D,
  ESCORT_GAP,
  escortAt,
  FLEE_MAX,
  FLEE_MIN,
  makeBounty,
  planBounty,
  RING_SITES,
  RUN_MAX,
  TAIL_R,
  TAIL_TIME,
  WANTED_SITES,
  WANTED_WEAVE_X,
  WARNING,
  wantedAt,
  wantedPath,
  wantedSite,
} from './city-bounty';
import { CORRIDOR_HALF, CORRIDOR_X } from './city-corridors';
import { blocked } from './city-game';
import { GROUND, type Item, TILE_X } from './city-grid';
import { CRUISER_SITES, cruiserSite } from './city-police';

/*
 * 2026-11-15: "think how police chases could be and how we could do bounty hunting and try to
 * capture bad guys."
 */

const DT = 1 / 30;
const X = CORRIDOR_X[0] as number;
const N = Array.from({ length: 60 }, (_, k) => k).find((k) => hash(k, 1501) < 0.5) as number;
const T0 = N * BOUNTY_SLOT + 11;
const o = [0, 0, 0, 0, 0, 0];

/** A wanted ship broken out ahead of a pilot flying down the corridor (toward -z). */
function spawn(): { b: Bounty; pos: Vec3; t: number } {
  const b = makeBounty();
  const pos: Vec3 = [X + 3, GROUND + 22, 500];
  bountyStep(b, { t: T0, dt: DT, on: true, busy: false, pos, fwd: [0, 0, -1] });
  expect(b.phase).toBe('flee');
  return { b, pos, t: T0 };
}
const wantedNow = (b: Bounty): Vec3 => {
  const p: Vec3 = [0, 0, 0];
  wantedAt(b, p, [0, 0, 0]);
  return p;
};
/** Steps the bounty `secs`, the pilot moved by `move` each frame. */
function run(
  s: { b: Bounty; pos: Vec3; t: number },
  secs: number,
  move: (pos: Vec3, w: Vec3) => void,
  each?: () => void,
) {
  for (let k = 0; k < Math.round(secs / DT); k++) {
    s.t += DT;
    move(s.pos, wantedNow(s.b));
    const inp: BountyInput = { t: s.t, dt: DT, on: true, busy: false, pos: s.pos, fwd: [0, 0, -1] };
    bountyStep(s.b, inp);
    each?.();
  }
}

describe('bounty hunting: a wanted ship breaks out', () => {
  it('now and then, ahead of you as you fly along a corridor, never while the police are after you', () => {
    const fwd: Vec3 = [0, 0, -1];
    const near: Vec3 = [X + 5, GROUND + 20, 300];
    let some = 0;
    for (let n = 0; n < 60; n++) {
      const p = planBounty(n, n * BOUNTY_SLOT + 11, near, fwd);
      if (!p) continue;
      some++;
      expect(Math.abs(p.x - X)).toBeLessThan(1e-6);
      expect(p.sgn).toBe(-1);
      expect(p.z0).toBeLessThan(near[2]);
    }
    expect(some).toBeGreaterThan(20);
    expect(some).toBeLessThan(55);
    // Not far from a corridor, not across it, not high over the city.
    expect(planBounty(N, T0, [X + 39, GROUND + 20, 300], fwd)).toBeNull();
    expect(planBounty(N, T0, near, [1, 0, 0])).toBeNull();
    expect(planBounty(N, T0, [X, GROUND + 120, 300], fwd)).toBeNull();
    // The copies across the tile count too.
    expect(planBounty(N, T0, [X + TILE_X, GROUND + 20, 300], fwd)?.x).toBeCloseTo(X + TILE_X);
    const b = makeBounty();
    bountyStep(b, { t: T0, dt: DT, on: true, busy: true, pos: near, fwd });
    expect(b.phase).toBe('off');
    bountyStep(b, { t: T0, dt: DT, on: false, busy: false, pos: near, fwd });
    expect(b.phase).toBe('off');
  });

  it('flees smartly: slow while you are far, faster as you close, under the street boost', () => {
    expect(FLEE_MIN).toBeGreaterThan(FLY_SPEED);
    expect(FLEE_MAX).toBeLessThan(FLY_SPEED * STREET_BOOST);
    const far = spawn();
    // You hang back.
    run(far, 5, () => {});
    expect(far.b.v).toBeLessThan(FLEE_MIN + 2);
    const near = spawn();
    // You keep close behind it, the far side of TAIL_R so it is not caught.
    run(near, 5, (pos, w) => {
      pos[0] = w[0];
      pos[2] = w[2] + 22;
    });
    expect(near.b.v).toBeGreaterThan(FLEE_MAX - 3);
    expect(near.b.phase).toBe('flee');
  });

  it('runs down the corridor inside its walls, nothing solid in its way or its escorts’', () => {
    for (let n = 0; n < 8; n++)
      for (const x of CORRIDOR_X) {
        const b = { ...makeBounty(), n, x, z0: 977 * n, sgn: (n & 1 ? 1 : -1) as 1 | -1 };
        for (let s = 0; s < 1600; s += 2.5) {
          b.s = s;
          const p: Vec3 = [0, 0, 0];
          const f: Vec3 = [0, 0, 0];
          wantedAt(b, p, f);
          expect(Math.abs(p[0] - x)).toBeLessThanOrEqual(WANTED_WEAVE_X + 1e-9);
          for (let k = 0; k < WANTED_SITES; k += 3) {
            wantedSite(p, f, k, 1, 1, 1, 1, o);
            expect(blocked([o[0] as number, o[1] as number, o[2] as number])).toBe(false);
          }
          // The escorts coming to it and leading and following it away: inside the walls too.
          for (const phase of ['caught', 'escort'] as const) {
            b.phase = phase;
            b.since = 0;
            for (const j of [0, 1]) {
              escortAt(b, j, 1.5, p, f);
              expect(Math.abs(p[0] - x)).toBeLessThan(CORRIDOR_HALF - 2);
              expect(blocked(p)).toBe(false);
            }
          }
          b.phase = 'off';
        }
      }
  }, 120_000);
});

describe('bounty hunting: the capture', () => {
  it('tailed close behind for a few seconds: captured, escorted away, counted', () => {
    const s = spawn();
    let caughtAt = Number.NaN;
    run(
      s,
      TAIL_TIME + 2,
      (pos, w) => {
        pos[0] = w[0];
        pos[1] = w[1];
        pos[2] = w[2] + 9;
      },
      () => {
        if (s.b.phase === 'caught' && Number.isNaN(caughtAt)) caughtAt = s.t;
      },
    );
    expect(caughtAt - T0).toBeGreaterThan(TAIL_TIME - 0.1);
    expect(caughtAt - T0).toBeLessThan(TAIL_TIME + 0.3);
    expect(s.b.caught).toBe(1);
    // It slows to a stop; the escorts come down the corridor to it, facing it.
    const stopped: Vec3 = [...wantedNow(s.b)];
    const q: Vec3 = [0, 0, 0];
    const g: Vec3 = [0, 0, 0];
    escortAt(s.b, 0, s.t, q, g);
    expect((q[2] - stopped[2]) * s.b.sgn).toBeGreaterThan(3);
    expect(g[2] * s.b.sgn).toBeLessThan(-0.9);
    run(s, 2.5, () => {});
    expect(s.b.phase).toBe('escort');
    // Then flank it and fly it away, turned about.
    run(s, 2, () => {});
    const w = wantedNow(s.b);
    escortAt(s.b, 0, s.t, q, g);
    expect((q[2] - w[2]) * s.b.sgn).toBeCloseTo(ESCORT_GAP, 5);
    expect(g[2] * s.b.sgn).toBeGreaterThan(0.99);
    escortAt(s.b, 1, s.t, q, g);
    expect((q[2] - w[2]) * s.b.sgn).toBeCloseTo(-ESCORT_GAP, 5);
    expect(g[2] * s.b.sgn).toBeGreaterThan(0.99);
    expect((w[2] - stopped[2]) * s.b.sgn).toBeGreaterThan(5);
    run(s, 5, () => {});
    expect(s.b.phase).toBe('off');
    expect(bountyShows(s.b, s.t)).toBe(0);
    expect(s.b.caught).toBe(1);
  });

  it('never captured from ahead of it, or from too far', () => {
    const ahead = spawn();
    run(ahead, TAIL_TIME + 2, (pos, w) => {
      pos[0] = w[0];
      pos[2] = w[2] + 8 * ahead.b.sgn;
    });
    expect(ahead.b.phase).toBe('flee');
    const far = spawn();
    run(far, TAIL_TIME + 2, (pos, w) => {
      pos[0] = w[0];
      pos[2] = w[2] + TAIL_R + 4;
    });
    expect(far.b.phase).toBe('flee');
    expect(far.b.caught).toBe(0);
  });

  it('gets away when you fall far behind, or after a while', () => {
    const s = spawn();
    const from = s.pos[2];
    run(s, 30, (pos) => {
      pos[2] = from;
    });
    expect(['gone', 'off']).toContain(s.b.phase);
    expect(ESCAPE_D).toBeGreaterThan(200);
    const t = spawn();
    run(t, RUN_MAX + 3, (pos, w) => {
      pos[0] = w[0];
      pos[2] = w[2] + 30;
    });
    expect(t.b.caught).toBe(0);
    expect(['gone', 'off']).toContain(t.b.phase);
  });
});

describe('bounty hunting: the look', () => {
  it('a dark hull with one slow red warning light; soft gold and a ring of light once captured', () => {
    const c: Vec3 = [0, GROUND + 24, 0];
    const f: Vec3 = [0, 0, -1];
    let lightest = 0;
    for (let s = 0; s < 72; s++) {
      wantedSite(c, f, s, 0.3, 1, 1, 1, o);
      const m = Math.max(o[3] as number, o[4] as number, o[5] as number);
      if (s < 60) expect(m).toBeLessThan(0.2);
      lightest = Math.max(lightest, m);
      expect(o.every(Number.isFinite)).toBe(true);
    }
    // The light red, breathing slowly: a small change over a tenth of a second.
    wantedSite(c, f, 60, 0.3, 1, 1, 1, o);
    expect(o[3] as number).toBeGreaterThan((o[4] as number) * 4);
    const a = o[3] as number;
    wantedSite(c, f, 60, 0.4, 1, 1, 1, o);
    expect(Math.abs((o[3] as number) - a)).toBeLessThan(0.2);
    expect(WARNING[0]).toBeGreaterThan(WARNING[2] * 5);
    // Captured: the light gold, the ring spreading round it.
    wantedSite(c, f, 60, 0.3, 1, 0, 0.5, o);
    expect(o[4] as number).toBeGreaterThan(0.5 * (o[3] as number));
    let ringR = 0;
    for (let s = WANTED_SITES; s < WANTED_SITES + RING_SITES; s++) {
      wantedSite(c, f, s, 0.3, 1, 0, 0.5, o);
      ringR = Math.max(ringR, Math.hypot((o[0] as number) - c[0], (o[2] as number) - c[2]));
      expect(o[3] as number).toBeGreaterThan(0);
    }
    expect(ringR).toBeGreaterThan(3);
  });

  it('draws the wanted ship near the eye, and the two escorts once captured', () => {
    const s = spawn();
    run(s, 1, () => {});
    const eye: Vec3 = [X, GROUND + 22, s.pos[2]];
    const out: Item[] = [];
    bountyItems(s.b, eye, [0, 0, -1], s.t, out);
    expect(out.length).toBe(1);
    expect(out[0]?.count).toBe(WANTED_SITES);
    run(
      s,
      TAIL_TIME + 1,
      (pos, w) => {
        pos[0] = w[0];
        pos[2] = w[2] + 9;
      },
      () => {},
    );
    expect(s.b.phase).toBe('caught');
    const caught: Item[] = [];
    bountyItems(s.b, [X, GROUND + 22, wantedNow(s.b)[2] + 90], [0, 0, -1], s.t, caught);
    expect(caught.length).toBe(3);
    for (const it of caught)
      for (let k = 0; k < it.count; k++) {
        it.site(k, o);
        expect(o.every(Number.isFinite)).toBe(true);
      }
    expect(caught[1]?.count).toBe(CRUISER_SITES);
    // The escorts are police cruisers.
    cruiserSite([0, 0, 0], [0, 0, 1], 0, 0, 0, 1, o);
    expect(o.every(Number.isFinite)).toBe(true);
    const path: Vec3 = [0, 0, 0];
    wantedPath(s.b, 0, path);
    expect(path.every(Number.isFinite)).toBe(true);
  });
});
