import { describe, expect, it } from 'vitest';

import { ALIVE_CAP, laneFree } from './city-alive';
import { studioBlockHeight } from './city-big';
import { HIGH_STREAMS, SKY_STREAMS } from './city-currents';
import { aliveMonuments, blockTower } from './city-game';
import { BLOCK_X, BLOCK_Z, GROUND, TAU, TILE_I, TILE_J } from './city-grid';
import { ORBIT_TOP, orbitShip, orbitsOf } from './city-orbits';
import { ringSets } from './city-rings';
import { STATIONS, stationModel } from './city-stations';

const G = GROUND;

describe('alive quarters: higher streams and rings of ships round the monuments', () => {
  it('keeps the low-roof highways over every roof in every copy of the tile', () => {
    for (const [m, n] of [
      [0, 1],
      [1, 2],
      [-1, 3],
      [2, -1],
    ]) {
      const I0 = (m as number) * TILE_I;
      const J0 = (n as number) * TILE_J;
      for (const S of SKY_STREAMS)
        for (let z = S.s0; z <= S.s1; z += 3)
          for (const dx of [-4, 0, 4]) {
            const tw = blockTower(
              I0 + Math.floor((S.c + dx) / BLOCK_X),
              J0 + Math.floor(z / BLOCK_Z),
            );
            const h =
              tw.shape === 'studio' && tw.studio
                ? studioBlockHeight(tw.studio)
                : tw.shape === 'design' && tw.design
                  ? tw.design.h
                  : tw.h;
            expect(h + 6).toBeLessThan(S.y);
          }
    }
  });

  it('threads the higher streams over the high currents and under the stations and ring sets', () => {
    expect(HIGH_STREAMS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(HIGH_STREAMS.map((S) => S.sgn)).size).toBe(2);
    const lowStation = Math.min(...STATIONS.map((s) => G + s.h + stationModel(s).lo - s.bob));
    for (const S of HIGH_STREAMS) {
      // The high currents' loops reach 182 at the most.
      expect(S.y).toBeGreaterThan(182 + 2);
      expect(G + S.y + 1).toBeLessThan(lowStation - 2);
      expect(S.y).toBeGreaterThan(ALIVE_CAP + 40);
      for (const R of ringSets()) {
        const big = Math.max(...R.radii);
        const top = Math.abs(R.n[1]) > 0.9 ? 1.5 : big;
        if (Math.abs(R.c[0] - S.c) < big + 4)
          expect(Math.abs(R.c[1] - (G + S.y))).toBeGreaterThan(top + 2);
      }
    }
  });

  it('circles each monument at a constant radius, one way, clear of its walls and the roofs round it', () => {
    const ms = aliveMonuments();
    let n = 0;
    let spirals = 0;
    for (const [m, k] of [
      [0, 0],
      [1, 1],
    ])
      ms.forEach((M, mi) => {
        const I0 = (m as number) * TILE_I;
        const J0 = (k as number) * TILE_J;
        for (const O of orbitsOf(M, mi, I0, J0, blockTower)) {
          n++;
          if (O.rise > 0) spirals++;
          expect(O.r).toBeGreaterThan(M.r + 5);
          expect(O.y + O.rise).toBeLessThanOrEqual(ORBIT_TOP);
          for (let y = O.y; y <= O.y + O.rise; y++) expect(laneFree(y)).toBe(true);
          for (let i = 0; i < 4; i++) {
            const a = orbitShip(O, i, 7);
            const b = orbitShip(O, i, 7.05);
            expect(Math.hypot(a.p[0] - O.cx, a.p[2] - O.cz)).toBeCloseTo(O.r, 6);
            // One way round: the turn from a to b is the orbit's own sense.
            const ta = Math.atan2(a.p[2] - O.cz, a.p[0] - O.cx);
            const tb = Math.atan2(b.p[2] - O.cz, b.p[0] - O.cx);
            const turn = Math.atan2(Math.sin(tb - ta), Math.cos(tb - ta));
            if (a.k > 0.5 && b.k > 0.5) expect(Math.sign(turn)).toBe(O.sgn);
          }
          // Over every roof under its circle by six.
          for (let q = 0; q < 48; q++) {
            const th = (q / 48) * TAU;
            const x = I0 * BLOCK_X + O.cx + Math.cos(th) * O.r;
            const z = J0 * BLOCK_Z + O.cz + Math.sin(th) * O.r;
            const tw = blockTower(Math.floor(x / BLOCK_X), Math.floor(z / BLOCK_Z));
            if (Math.abs(x - tw.x) < tw.hx + 1 && Math.abs(z - tw.z) < tw.hz + 1)
              expect(O.y).toBeGreaterThan(tw.h + 6);
          }
        }
      });
    expect(n).toBeGreaterThan(20);
    expect(spirals).toBeGreaterThan(2);
  });
});
