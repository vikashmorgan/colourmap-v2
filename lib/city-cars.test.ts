import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  CAR_EYE_MAX,
  CAR_LEN,
  CAR_R,
  carAt,
  carFade,
  carItems,
  carRoadOpen,
  carSite,
  type Road,
  roadColour,
} from './city-cars';
import { DOCKS, placeDock } from './city-docks';
import { inCanal } from './city-game';
import { BLOCK_X, BLOCK_Z, C, GROUND, type Item, TILE_Z } from './city-grid';
import { RIVER_ROW } from './city-rain';

const street: Road = { axis: 2, line: 3 };
const cross: Road = { axis: 0, line: 10 };
const avenue: Road = { axis: 2, line: 0 };

describe('cars on the ground (queued: "cars on the ground")', () => {
  it('drive their roads both ways on the right, gliding on, a pure function of the time', () => {
    const near: Vec3 = [3 * BLOCK_X, 0, 300];
    const a = carAt(street, -1, 4, 10, near);
    const b = carAt(street, -1, 4, 11, near);
    expect(carAt(street, -1, 4, 10, near)).toEqual(a);
    // Heading -z on a street along z: it keeps to +x of the middle line, and moves along -z.
    expect(a.dir).toEqual([0, 0, -1]);
    expect(a.pos[0]).toBeGreaterThan(3 * BLOCK_X);
    expect(a.pos[1]).toBe(GROUND);
    const dz = b.pos[2] - a.pos[2];
    expect(dz).toBeLessThan(0);
    expect(Math.abs(dz)).toBeGreaterThan(5);
    expect(carAt(street, 1, 4, 10, near).pos[0]).toBeLessThan(3 * BLOCK_X);
    // Heading +x on a cross street, it keeps to +z.
    const c = carAt(cross, 1, 1, 10, [0, 0, 10 * BLOCK_Z]);
    expect(c.dir).toEqual([1, 0, 0]);
    expect(c.pos[2]).toBeGreaterThan(10 * BLOCK_Z);
    // The avenue has two lanes each way.
    const lanes = new Set(
      [0, 1, 2, 3].map((k) => Math.round(carAt(avenue, -1, k, 0, [0, 0, 0]).pos[0] * 10)),
    );
    expect(lanes.size).toBe(2);
  });

  it('never runs into the car ahead in its lane', () => {
    for (const [r, n] of [
      [street, 22],
      [cross, 4],
      [avenue, 44],
    ] as const) {
      for (const t of [0, 37, 120]) {
        const pos = Array.from({ length: n }, (_, k) => carAt(r, 1, k, t, [0, 0, 0]));
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const A = pos[i] as (typeof pos)[number];
            const B = pos[j] as (typeof pos)[number];
            if (Math.abs(A.pos[r.axis === 2 ? 0 : 2] - B.pos[r.axis === 2 ? 0 : 2]) > 0.5) continue;
            const along = Math.abs(A.pos[r.axis] - B.pos[r.axis]);
            expect(Math.min(along, (r.axis === 2 ? TILE_Z : 312) - along)).toBeGreaterThan(CAR_LEN);
          }
        }
      }
    }
  });

  it('has one colour a road: the avenue gold, neighbours different', () => {
    expect(roadColour(avenue)).toEqual(C.gold);
    for (let k = 0; k < 6; k++) {
      expect(carAt(street, 1, k, 3, [0, 0, 0]).colour).toEqual(roadColour(street));
    }
    for (let l = -6; l < 5; l++) {
      expect(roadColour({ axis: 2, line: l })).not.toEqual(roadColour({ axis: 2, line: l + 1 }));
      expect(roadColour({ axis: 0, line: l + 20 })).not.toEqual(
        roadColour({ axis: 0, line: l + 21 }),
      );
    }
  });

  it('lights its nose warm and its tail red, its body in its road colour', () => {
    const c = carAt(street, -1, 2, 5, [3 * BLOCK_X, 0, 0]);
    const o = [0, 0, 0, 0, 0, 0];
    let front = 0;
    let back = 0;
    for (let s = 0; s < 64; s++) {
      expect(carSite(c, s, o)).toBe(true);
      expect(o.every(Number.isFinite)).toBe(true);
      const ahead = (o[2] - c.pos[2]) * c.dir[2];
      if (s >= 40 && s < 50) {
        expect(ahead).toBeGreaterThan(CAR_LEN / 2 - 0.1);
        expect(o[3]).toBeGreaterThan(0.5);
        front++;
      }
      if (s >= 50 && s < 58) {
        expect(ahead).toBeLessThan(-CAR_LEN / 2 + 0.1);
        expect(o[3]).toBeGreaterThan(o[4] * 3);
        back++;
      }
    }
    expect(front).toBe(10);
    expect(back).toBe(8);
  });

  it('keeps off the river, the canals and Chinatown avenue, and fades round the Street lounge', () => {
    const river = carAt({ axis: 0, line: RIVER_ROW }, 1, 0, 0, [0, 0, 0]);
    expect(carRoadOpen(river, inCanal)).toBe(false);
    const canal = carAt({ axis: 0, line: 20 }, 1, 0, 0, [0, 0, 0]);
    canal.pos[0] = 3 * BLOCK_X + 10;
    expect(carRoadOpen(canal, inCanal)).toBe(false);
    const ct = carAt(avenue, 1, 0, 0, [0, 0, 3 * BLOCK_Z]);
    ct.pos[2] = 3 * BLOCK_Z;
    expect(carRoadOpen(ct, inCanal)).toBe(false);
    // Bridges carry the streets over the river.
    const bridge = carAt(street, 1, 0, 0, [0, 0, 0]);
    bridge.pos[2] = RIVER_ROW * BLOCK_Z;
    expect(carRoadOpen(bridge, inCanal)).toBe(true);
    const lounge = DOCKS.findIndex((d) => d.name === 'Street lounge');
    const P = placeDock(lounge, [0, 0, 0]);
    const by = carAt(avenue, 1, 0, 0, [0, 0, P.c[2]]);
    by.pos = [P.c[0], GROUND, P.c[2]];
    expect(carFade(by)).toBe(0);
    by.pos = [P.c[0], GROUND, P.c[2] + 60];
    expect(carFade(by)).toBe(1);
  });

  it('is drawn only near a low eye, ahead of it', () => {
    const eye: Vec3 = [2 * BLOCK_X, GROUND + 6, 30 * BLOCK_Z];
    const fwd: Vec3 = [0, 0, -1];
    const out: Item[] = [];
    carItems(eye, fwd, 12, inCanal, out);
    expect(out.length).toBeGreaterThan(10);
    expect(out.length).toBeLessThan(160);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out) {
      expect(it.d).toBeLessThanOrEqual(CAR_R);
      it.site(0, o);
      expect(o[2] - eye[2]).toBeLessThan(CAR_LEN * 2);
    }
    const high: Item[] = [];
    carItems([eye[0], CAR_EYE_MAX + 1, eye[2]], fwd, 12, inCanal, high);
    expect(high.length).toBe(0);
  });
});
