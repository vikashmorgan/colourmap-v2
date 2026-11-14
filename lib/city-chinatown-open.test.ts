/*
 * Openings through Chinatown's clutter (docs/specs/art-city.md, "Racing corridors and the
 * Heights–Golden bridges"), 2026-11-14: "Some Chinatown parts are getting too overloaded with panels
 * and lampions and stuff. Would be cool to have openings so I can fly through."
 */
import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { makeParticles, PHASES, pieceAt, pieceCamera, placeShip, setFly } from './city';
import {
  CT_ROPE_SHARE,
  CT_SIGN_LEVELS,
  CT_SIGN_LEVELS_TALL,
  CT_STRAND_LEVELS,
  CT_WALK_SHARE,
  CT_WINDOWS,
  inCtWindow,
} from './city-chinatown-open';
import {
  blocked,
  blockTower,
  districtAt,
  MARGIN,
  type Strand,
  signsNear,
  strandsNear,
  walkwaysNear,
} from './city-game';
import { BLOCK_Z, GROUND, type Item, TILE_X, TILE_Z } from './city-grid';
import { FLY_LANTERNS } from './city-lanterns';
import { ROPE_SHARE, ropeItems } from './city-ropes';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
/** Over the middle of a Chinatown, `n` tiles along and `m` across. */
const ctEye = (n = 0, m = 0): Vec3 => [m * TILE_X, GROUND + 30, 4 * BLOCK_Z + n * TILE_Z];
/** Chinatown's clutter over one stretch: its tall signs, lantern strings and walkways. */
function clutter(n = 0, m = 0) {
  const eye = ctEye(n, m);
  const st: Strand[] = [];
  strandsNear(eye, 160, st);
  const z1 = 8 * BLOCK_Z + n * TILE_Z;
  return {
    signs: signsNear(eye),
    strands: st.filter((s) => s.kind === 'red'),
    walks: walkwaysNear(eye, 160).filter((w) => w.z < z1),
  };
}
/**
 * How much there was before (measured 2026-11-14 on the plan of PR #473, the same way): 512 tall
 * signs, 368 lantern strings, 38 walkways; 64 flying lanterns a stretch.
 */
const BEFORE = { signs: 512, strands: 368, walks: 38, lanterns: 64 };

describe('Chinatown breathes: less clutter', () => {
  it('hangs fewer signs, strings, walkways, ropes and flying lanterns, by a third and more', () => {
    expect(CT_SIGN_LEVELS_TALL.length).toBeLessThan(5);
    expect(CT_SIGN_LEVELS.length).toBeLessThan(3);
    expect(CT_STRAND_LEVELS.length).toBeLessThan(5);
    expect(CT_WALK_SHARE).toBeLessThan(0.5);
    expect(CT_ROPE_SHARE).toBeLessThan(0.6);
    expect(ROPE_SHARE.chinatown).toBe(CT_ROPE_SHARE);
    expect(FLY_LANTERNS).toBeLessThan(BEFORE.lanterns);
    const c = clutter();
    expect(c.signs.length).toBeLessThan(BEFORE.signs);
    expect(c.strands.length).toBeLessThan(BEFORE.strands);
    expect(c.walks.length).toBeLessThan(BEFORE.walks);
    const now = c.signs.length + c.strands.length + c.walks.length;
    expect(now).toBeLessThan(0.7 * (BEFORE.signs + BEFORE.strands + BEFORE.walks));
  });

  it('keeps its character: still hundreds of signs and strings, walkways at several heights', () => {
    const c = clutter();
    expect(c.signs.length).toBeGreaterThan(200);
    expect(c.strands.length).toBeGreaterThan(100);
    expect(c.walks.length).toBeGreaterThan(6);
    expect(new Set(c.walks.map((w) => w.y)).size).toBeGreaterThanOrEqual(3);
  });
});

describe('Chinatown breathes: windows to fly through', () => {
  it('opens a few long windows each stretch, down side streets and along cross streets, twenty high', () => {
    expect(CT_WINDOWS.length).toBeGreaterThanOrEqual(5);
    const alongZ = CT_WINDOWS.filter((w) => w.z[1] - w.z[0] > w.x[1] - w.x[0]);
    const alongX = CT_WINDOWS.filter((w) => w.x[1] - w.x[0] > w.z[1] - w.z[0]);
    expect(alongZ.length).toBeGreaterThanOrEqual(2);
    expect(alongX.length).toBeGreaterThanOrEqual(2);
    for (const w of CT_WINDOWS) {
      expect(w.y[1] - w.y[0]).toBeGreaterThanOrEqual(20);
      expect(Math.max(w.x[1] - w.x[0], w.z[1] - w.z[0])).toBeGreaterThan(120);
      // Over Chinatown, all of it.
      for (const [x, z] of [
        [w.x[0], w.z[0]],
        [w.x[1], w.z[1]],
      ])
        expect(districtAt(x as number, z as number)).toBe('chinatown');
    }
  });

  it('stands no tower in any window: fly each end to end, in every copy', () => {
    for (const [n, m] of [
      [0, 0],
      [1, 0],
      [-1, 1],
    ]) {
      const ox = m * TILE_X;
      const oz = n * TILE_Z;
      for (const w of CT_WINDOWS) {
        const lx = w.x[1] - w.x[0] > 20;
        const x0 = w.x[0] + MARGIN + 0.1;
        const x1 = w.x[1] - MARGIN - 0.1;
        const z0 = w.z[0] + MARGIN + 0.1;
        const z1 = w.z[1] - MARGIN - 0.1;
        for (let u = 0; u <= 1; u += lx ? 0.005 : 0.004)
          for (const v of [0, 0.5, 1])
            for (const y of [w.y[0] + 0.5, (w.y[0] + w.y[1]) / 2, w.y[1] - 0.5]) {
              const x = lx ? x0 + u * (x1 - x0) : x0 + v * (x1 - x0);
              const z = lx ? z0 + v * (z1 - z0) : z0 + u * (z1 - z0);
              expect(blocked([ox + x, GROUND + y, oz + z])).toBe(false);
            }
      }
    }
  });

  it('hangs no sign, lantern string, walkway or rope into a window', () => {
    for (const [n, m] of [
      [0, 0],
      [2, -1],
    ]) {
      const c = clutter(n, m);
      // The strings' boxes, sag and tassels (as lib/city-game.ts reckons them), never reach one.
      for (const st of c.strands) {
        const sag = 0.5 + Math.hypot(st.b[0] - st.a[0], st.b[2] - st.a[2]) * 0.05;
        expect(
          inCtWindow(
            [Math.min(st.a[0], st.b[0]), st.a[1] - sag - 2.2, Math.min(st.a[2], st.b[2]) - 0.8],
            [Math.max(st.a[0], st.b[0]), st.a[1] + 0.2, Math.max(st.a[2], st.b[2]) + 0.8],
          ),
        ).toBe(false);
      }
      for (const wk of c.walks)
        expect(inCtWindow([wk.x0, wk.y, wk.z - 1.2], [wk.x1, wk.y + 3.4, wk.z + 1.2])).toBe(false);
      // The rope lights' every light, sampled.
      const out: Item[] = [];
      ropeItems(ctEye(n, m), 3, 160, blockTower, () => true, out);
      const o = [0, 0, 0, 0, 0, 0];
      for (const it of out)
        for (let s = 0; s < it.count; s += 3) {
          it.site(s, o);
          if (districtAt(o[0] as number, o[2] as number) !== 'chinatown') continue;
          expect(inCtWindow(o.slice(0, 3) as Vec3, o.slice(0, 3) as Vec3)).toBe(false);
        }
    }
  });

  it('keeps every tall sign out of every window, glyph by glyph', () => {
    // A sign's grains stand in its column from its top down; none falls in a window.
    const c = clutter();
    let checked = 0;
    for (const s of c.signs) {
      const w = s.px * 16;
      const h = s.px * (16 + ([...s.text].length - 1) * 19);
      const [x0, top, z] = s.at;
      expect(inCtWindow([x0, top - h, z - 0.5], [x0 + w, top, z + 0.5])).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('Chinatown breathes: within the grain budget', () => {
  it('keeps to a phone’s and a computer’s grains threading a window, every grain finite', () => {
    const w = CT_WINDOWS[0] as (typeof CT_WINDOWS)[number];
    for (const n of [6500, 15000]) {
      const ps = makeParticles(n);
      let t = 500;
      setFly(false, [], 0, t);
      setFly(true, [], dt, t);
      // Down the window (+z), at its middle height.
      placeShip([(w.x[0] + w.x[1]) / 2, GROUND + (w.y[0] + w.y[1]) / 2, w.z[0] + 10], Math.PI);
      let lit = 0;
      let finite = true;
      for (let k = 0; k < 3; k++) {
        t += dt;
        setFly(true, [], dt, t);
        pieceCamera(ship, t);
        lit = 0;
        for (const p of ps) {
          const g = pieceAt(p, ship, t);
          finite &&= g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite);
          if (g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.004) lit++;
        }
      }
      expect(finite).toBe(true);
      expect(lit).toBeLessThanOrEqual(n);
      expect(lit).toBeGreaterThan(n * 0.3);
      setFly(false, [], 0, 0);
    }
  });
});
