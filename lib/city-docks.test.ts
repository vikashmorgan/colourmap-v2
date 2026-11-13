import { describe, expect, it } from 'vitest';

import { placeShip, setFly, tally } from './city';
import {
  APPROACH,
  approachGlow,
  approachPrompt,
  DOCK_PROMPT,
  DOCKS,
  dockItems,
  dockNear,
  placeDock,
} from './city-docks';
import type { Item } from './city-grid';

const dt = 1 / 60;

// 2026-11-13: feedback on the way in to a pad, and a word when the autopilot takes over.
describe('coming in to a dock', () => {
  it('finds the nearest pad within reach, not too far over or under it', () => {
    const P = placeDock(0, [0, 0, 0]);
    const near = dockNear([P.pad[0] + 10, P.pad[1] + 3, P.pad[2]]);
    expect(near?.P.i).toBe(0);
    expect(near?.d).toBeCloseTo(10);
    expect(dockNear([P.pad[0] + APPROACH + 1, P.pad[1], P.pad[2]])).toBeNull();
    expect(dockNear([P.pad[0] + 5, P.pad[1] + 13, P.pad[2]])).toBeNull();
    expect(approachPrompt(P)).toBe(`${DOCKS[0]?.name} · land on the pad`);
  });

  it('brightens the pad’s rim lights as you come in: none from 30, +0.5 by the last 10', () => {
    expect(approachGlow(APPROACH)).toBe(0);
    expect(approachGlow(40)).toBe(0);
    expect(approachGlow(20)).toBeCloseTo(0.25);
    expect(approachGlow(10)).toBeCloseTo(0.5);
    expect(approachGlow(0)).toBeCloseTo(0.5);
    const P = placeDock(1, [0, 0, 0]);
    const eye: [number, number, number] = [P.pad[0] + 20, P.pad[1] + 5, P.pad[2] + 20];
    const rim = (ship?: [number, number, number]) => {
      const out: Item[] = [];
      dockItems(eye, 10, 160, out, ship);
      const pad = out.find(
        (it) => it.probe?.[0]?.[0] === P.pad[0] && it.probe?.[0]?.[2] === P.pad[2],
      ) as Item;
      const o = [0, 0, 0, 0, 0, 0];
      let sum = 0;
      for (let s = 0; s < 100; s++) {
        pad.site(s, o);
        sum += (o[3] as number) + (o[4] as number) + (o[5] as number);
      }
      return sum;
    };
    const far = rim();
    const close = rim([P.pad[0] + 8, P.pad[1] + 2, P.pad[2]]);
    expect(close).toBeCloseTo(far * 1.5, 3);
    expect(rim([P.pad[0] + 29, P.pad[1] + 2, P.pad[2]])).toBeLessThan(far * 1.01);
  });

  it('says "<name> · land on the pad" on the way in, docked on it, "Autopilot" once you let go', () => {
    const t0 = 4000;
    setFly(false, [], 0, t0);
    setFly(true, [], dt, t0 + dt);
    const P = placeDock(0, [0, 0, 0]);
    placeShip([P.pad[0], P.pad[1] + 2, P.pad[2] + 15], 0);
    let t = t0 + 2 * dt;
    setFly(true, [], dt, t);
    expect(tally()).toBe(`${P.dock.name} · land on the pad`);
    placeShip([P.pad[0], P.pad[1] + 2.5, P.pad[2]], 0);
    t += dt;
    setFly(true, [], dt, t);
    expect(tally()).toBe(DOCK_PROMPT);
    // Esc: the autopilot carries on, and says so for a few seconds.
    placeShip([P.pad[0], P.pad[1] + 2, P.pad[2] + 15], 0);
    t += dt;
    setFly(false, [], dt, t);
    expect(tally()).toBe('Autopilot');
    for (let f = 0; f < 60 * 3.2; f++) {
      t += dt;
      setFly(false, [], dt, t);
    }
    expect(tally()).not.toBe('Autopilot');
    expect(tally()).not.toContain('land on the pad');
    setFly(false, [], 0, 0);
  });
});
