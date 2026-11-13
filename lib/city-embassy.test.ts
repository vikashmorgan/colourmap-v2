import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { PHASES, placeShip, SHARK_SIM_HREF, setFly, setOpenLink, tally } from './city';
import { DOCK_PROMPT, DOCKS, dockAt, placeDock, roomPoint } from './city-docks';
import { EMBASSIES, EMBASSY_DOCKS, embassyAt, embassyCentre, embassyItems } from './city-embassy';
import { blocked, blockTower } from './city-game';
import { GROUND, type Item, mixId, TILE_X, TILE_Z } from './city-grid';
import { railCeiling } from './city-metro';
import { besideRiver } from './city-rain';
import {
  ARCADE_PROMPT,
  atCabinet,
  enterRoom,
  inRoom,
  leaveRoom,
  roomBanner,
  roomFree,
  roomGrain,
  roomStep,
  roomWalker,
} from './city-rooms';
import { PHASES as OCEAN } from './ocean';

const dt = 1 / 60;
const embassyDock = (n: number) => DOCKS.indexOf(EMBASSY_DOCKS[n] as (typeof DOCKS)[number]);
/** The spot in front of an embassy room's cabinet, and the yaw that faces it. */
const atTheCabinet = (i: number): { q: Vec3; yaw: number } => {
  const P = placeDock(i, [0, 0, 0]);
  return {
    q: roomPoint(P, -P.dock.w + 1.6, -P.dock.d / 2 + 2.4, 0),
    yaw: Math.atan2(P.r[0], P.r[2]),
  };
};

describe('Embassies of Happiness (queued: "Embassies of Happiness with a Shark Simulator cabinet")', () => {
  it('stands three unique buildings a tile, each on a block of its own, solid', () => {
    expect(new Set(EMBASSIES.map((e) => e.design)).size).toBe(EMBASSIES.length);
    expect(EMBASSIES.length).toBeGreaterThanOrEqual(3);
    for (const e of EMBASSIES) {
      for (const [ti, tj] of [
        [0, 0],
        [1, -2],
      ]) {
        const I = e.li + ti * 12;
        const J = e.lj + tj * 48;
        expect(embassyAt(I, J)).toBe(e);
        const tw = blockTower(I, J);
        expect(tw.shape).toBe('embassy');
        expect(tw.h).toBe(e.h);
        // Out of the metro's way and off the river's banks.
        expect(railCeiling(I, J)).toBe(Number.POSITIVE_INFINITY);
        expect(besideRiver(J)).toBe(false);
      }
      const [x, z] = embassyCentre(e);
      expect(blocked([x, GROUND + e.h / 2, z])).toBe(true);
      expect(blocked([x, GROUND + e.h + 4, z])).toBe(false);
    }
  });

  it('draws each building near and its glowing sign from far off, over the roof, finite', () => {
    EMBASSIES.forEach((e, i) => {
      const [lx, lz] = embassyCentre(e);
      const x = lx + TILE_X;
      const z = lz - TILE_Z;
      const near: Item[] = [];
      embassyItems([x + 60, GROUND + 30, z + 60], 5, 150, near);
      expect(near.length).toBe(2);
      // From far off, its sign still shows, its building not.
      const far: Item[] = [];
      embassyItems([x, GROUND + 200, z + 500], 5, 900, far);
      expect(far.some((it) => it.gid === mixId(i, 7711))).toBe(false);
      const sign = far.find((it) => it.gid === mixId(i, 7712)) as Item;
      expect(sign.count).toBe(near[1]?.count);
      const o = [0, 0, 0, 0, 0, 0];
      let bright = 0;
      for (let s = 0; s < sign.count; s++) {
        expect(sign.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
        // Standing on the roof, toward the avenue.
        expect(o[1]).toBeGreaterThan(GROUND + e.h);
        expect(Math.sign(o[0] - x)).toBe(-Math.sign(e.li + 0.5));
        if (Math.max(o[3], o[4], o[5]) > 0.4) bright++;
      }
      expect(bright).toBeGreaterThan(sign.count * 0.5);
      for (const it of near) {
        for (let s = 0; s < it.count; s += 7) {
          it.site(s, o);
          expect(o.every(Number.isFinite)).toBe(true);
          expect(Math.min(o[3], o[4], o[5])).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  it('docks each to a big room on its roof, its pad clear of the building', () => {
    expect(EMBASSY_DOCKS.length).toBe(EMBASSIES.length);
    EMBASSY_DOCKS.forEach((d, n) => {
      expect(d.arcade).toBe(true);
      const i = embassyDock(n);
      const P = placeDock(i, [0, 0, 0]);
      const ship: Vec3 = [P.pad[0], P.pad[1] + 2.5, P.pad[2]];
      expect(dockAt(ship)?.i).toBe(i);
      expect(blocked(ship)).toBe(false);
      expect(P.c[1]).toBeCloseTo(GROUND + (EMBASSIES[n]?.h ?? 0), 0);
    });
  });

  it('holds a SHARK SIMULATOR cabinet: walking up to it asks, Enter says yes', () => {
    const i = embassyDock(0);
    const P = placeDock(i, [0, 0, 0]);
    enterRoom(P, 10);
    const w = roomWalker();
    // By the door: no question, and Enter is the way out.
    expect(atCabinet(P, w.x, w.z, w.yaw)).toBe(false);
    expect(roomBanner(30)).not.toBe(ARCADE_PROMPT);
    // The cabinet itself stands in the way.
    const cab = roomPoint(P, -P.dock.w + 0.6, -P.dock.d / 2 + 2.4, 0);
    expect(roomFree(P, cab[0], cab[2])).toBe(false);
    // In front of it, facing it: the question.
    const { q, yaw } = atTheCabinet(i);
    expect(roomFree(P, q[0], q[2])).toBe(true);
    [w.x, w.z, w.yaw, w.speed] = [q[0], q[2], yaw, 0];
    roomStep(true, [], dt, 30);
    expect(atCabinet(P, w.x, w.z, w.yaw)).toBe(true);
    expect(roomBanner(30)).toBe(ARCADE_PROMPT);
    expect(ARCADE_PROMPT).toContain(
      'Do you want to take a rest from the city and play Shark Simulator?',
    );
    // Turned away, no question.
    expect(atCabinet(P, w.x, w.z, yaw + Math.PI)).toBe(false);
    expect(roomStep(true, ['enter'], dt, 30 + dt)).toBe('arcade');
    // Its grains are finite and lit.
    for (let L = 0; L < 1200; L++) {
      const g = roomGrain(L, 1200, 31);
      expect([...g.pos, ...g.rgb].every(Number.isFinite)).toBe(true);
    }
    leaveRoom();
  });

  it('in the game: Enter at the cabinet opens the Ocean on Shark Sim, the ship left on its pad', () => {
    const opened: string[] = [];
    setOpenLink((href) => opened.push(href));
    const i = embassyDock(1);
    const P = placeDock(i, [0, 0, 0]);
    let t = 3000;
    const tick = (keys: string[]) => {
      t += dt;
      setFly(true, keys, dt, t);
    };
    setFly(false, [], 0, t);
    tick([]);
    placeShip([P.pad[0], P.pad[1] + 2.5, P.pad[2]], 0);
    tick([]);
    expect(tally()).toBe(DOCK_PROMPT);
    tick(['enter']);
    expect(inRoom()).toBe(true);
    const w = roomWalker();
    const { q, yaw } = atTheCabinet(i);
    [w.x, w.z, w.yaw, w.speed] = [q[0], q[2], yaw, 0];
    tick([]);
    expect(tally()).toBe(ARCADE_PROMPT);
    tick(['enter']);
    expect(opened).toEqual([SHARK_SIM_HREF]);
    expect(inRoom()).toBe(false);
    expect(tally()).toBe(DOCK_PROMPT);
    // The link names the Ocean's Shark Sim by its piece id.
    const id = new URLSearchParams(SHARK_SIM_HREF.split('?')[1]).get('piece');
    expect(OCEAN.find((p) => p.id === id)?.name).toBe('Shark Sim');
    expect(SHARK_SIM_HREF.startsWith('/geometry-field/ocean')).toBe(true);
    expect(PHASES.length).toBeGreaterThan(0);
    setFly(false, [], 0, 0);
  });
});
