import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import { CABLE_YS, canyonWallAt } from './city-canyon';
import {
  MARKET_LEVELS,
  MARKET_STREAMS,
  marketPoint,
  marketShip,
  marketShips,
} from './city-currents';
import { AVE_HEIGHTS, EXPRESS_X, EXPRESS_Z, X_HEIGHTS, Z_HEIGHTS } from './city-flow';
import { BAND_ROWS, BANDS, blocked, blockTower, districtAt, gameItems } from './city-game';
import { BLOCK_Z, GROUND, TILE_I } from './city-grid';
import {
  BRIDGE_CLEAR,
  FLASH_EDGE,
  FLASH_OFF,
  flashItem,
  flashLevel,
  flashOf,
  flashSignOn,
  highwayItem,
  marketBridge,
  marketBridgeItem,
} from './city-market';

const B = BANDS.findIndex((b) => b[1] === 'market');
const J0 = B * BAND_ROWS;

/** The market's blocks, tile-local. */
function marketBlocks() {
  const out = [];
  for (let J = J0; J < J0 + BAND_ROWS; J++)
    for (let I = 0; I < TILE_I / 2; I++) {
      const tw = blockTower(I, J);
      if (tw.d === 'market') out.push(tw);
    }
  return out;
}

describe('the Neon Market: bridges across its streets (2026-11-14)', () => {
  const bridges = () => {
    const out = [];
    for (const tw of marketBlocks()) {
      const a = marketBridge(tw, blockTower(tw.I + 1, tw.J), 0);
      const b = marketBridge(tw, blockTower(tw.I, tw.J + 1), 2);
      if (a) out.push({ br: a, tw });
      if (b) out.push({ br: b, tw });
    }
    return out;
  };

  it('hangs a good few, both ways across, at various heights, under the roofs, never on the canyon', () => {
    const all = bridges();
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(new Set(all.map((x) => x.br.axis)).size).toBe(2);
    const ys = all.map((x) => x.br.y - GROUND);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(15);
    for (const { br, tw } of all) {
      expect(canyonWallAt(tw.I, tw.J)).toBeNull();
      const other = br.axis === 0 ? blockTower(tw.I + 1, tw.J) : blockTower(tw.I, tw.J + 1);
      expect(br.y).toBeLessThan(GROUND + Math.min(tw.h, other.h));
      expect(br.b).toBeGreaterThan(br.a);
      // Clear of every highway's height.
      for (const Y of Object.values(MARKET_LEVELS))
        expect(Math.abs(br.y - GROUND - Y)).toBeGreaterThanOrEqual(BRIDGE_CLEAR - 1e-9);
      // Its deck spans open air: the street between the two walls.
      const mid: Vec3 =
        br.axis === 0
          ? [(br.a + br.b) / 2, br.y + 2.5, br.c]
          : [br.c, br.y + 2.5, (br.a + br.b) / 2];
      expect(blocked(mid)).toBe(false);
    }
  });

  it('lights them in slow-drifting neon, finite', () => {
    const { br } = bridges()[0] as ReturnType<typeof bridges>[number];
    const eye: Vec3 = [br.c + 20, br.y, br.a - 20];
    const o = [0, 0, 0, 0, 0, 0];
    const it = marketBridgeItem(br, eye, 3);
    let n = 0;
    for (let s = 0; s < it.count; s += 7) {
      if (!it.site(s, o)) continue;
      expect(o.every(Number.isFinite)).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThan(20);
  });
});

describe('the Neon Market: a few flashing signs (2026-11-14, the one exception to mellow light)', () => {
  it('puts one on only a few towers', () => {
    const all = marketBlocks().filter((tw) => tw.shape === 'box');
    const signs = all.map(flashSignOn).filter((s) => s !== null);
    expect(signs.length).toBeGreaterThanOrEqual(2);
    expect(signs.length).toBeLessThan(all.length * 0.3);
  });

  it('flashes crisply on and off, under twice a second, never a strobe', () => {
    for (const key of [8601, 8777, 9123, 9500]) {
      const f = flashOf(key);
      let on = 0;
      let edges = 0;
      let wasOn = flashLevel(key, 0) > 0.5;
      const N = 10 * 240;
      for (let i = 1; i < N; i++) {
        const v = flashLevel(key, i / 240);
        expect(v).toBeGreaterThanOrEqual(FLASH_OFF - 1e-9);
        expect(v).toBeLessThanOrEqual(1);
        const isOn = v > 0.5;
        if (isOn) on++;
        if (isOn !== wasOn) edges++;
        wasOn = isOn;
      }
      // Lit a good part of the time, dark a good part.
      expect(on / N).toBeGreaterThan(0.25);
      expect(on / N).toBeLessThan(0.75);
      // At most two flashes a period (each an on and an off edge), periods over a second.
      expect(f.period).toBeGreaterThan(1);
      expect(edges).toBeLessThanOrEqual(Math.ceil((10 / f.period) * 4) + 2);
      // Crisp: mostly fully on or fully off, little time in between.
      let between = 0;
      for (let i = 0; i < N; i++) {
        const v = flashLevel(key, i / 240);
        if (v > FLASH_OFF + 0.05 && v < 0.95) between++;
      }
      expect(between / N).toBeLessThan((FLASH_EDGE * 8) / f.period);
    }
  });

  it('dims the sign’s light with its flash', () => {
    const tw = marketBlocks().find((x) => flashSignOn(x));
    if (!tw) throw new Error('no flashing sign');
    const w = flashSignOn(tw);
    if (!w) return;
    const f = flashOf(w.key);
    const eye: Vec3 = [tw.x, GROUND + tw.h - 4, tw.z - tw.hz - 30];
    const sum = (t: number) => {
      const it = flashItem(w, eye, t);
      const o = [0, 0, 0, 0, 0, 0];
      let s = 0;
      for (let i = 0; i < it.count; i++) if (it.site(i, o)) s += o[3] + o[4] + o[5];
      return s;
    };
    // At the start of its period (on), and just before the end (off).
    const start = (1 - f.phase) * f.period + 0.1;
    const end = (1 - f.phase) * f.period - 0.08;
    expect(sum(start)).toBeGreaterThan(sum(end) * 5);
  });
});

describe('the Neon Market: flying highways at three heights (2026-11-14)', () => {
  it('runs several one-way streams, at low, mid and high levels clearly apart', () => {
    expect(MARKET_STREAMS.length).toBeGreaterThanOrEqual(5);
    const levels = new Set(MARKET_STREAMS.map((S) => S.level));
    expect(levels).toEqual(new Set(['low', 'mid', 'high']));
    const ys = [...new Set(MARKET_STREAMS.map((S) => S.y))].sort((a, b) => a - b);
    expect(ys).toHaveLength(3);
    for (let i = 1; i < ys.length; i++)
      expect((ys[i] as number) - (ys[i - 1] as number)).toBeGreaterThan(25);
    // Clear of the street channels' heights, the express lanes' and the canyon's cables.
    const others = [...AVE_HEIGHTS, ...Z_HEIGHTS, ...X_HEIGHTS, EXPRESS_Z, EXPRESS_X, ...CABLE_YS];
    for (const y of ys) for (const o of others) expect(Math.abs(y - o)).toBeGreaterThan(3);
  });

  it('keeps every stream in the market, in open air, its crossings at different levels', () => {
    for (const S of MARKET_STREAMS) {
      for (let u = 0.02; u < 1; u += 0.02) {
        const p = marketPoint(S, S.s0 + u * (S.s1 - S.s0));
        expect(districtAt(p[0], Math.min(p[2], 48 * BLOCK_Z - 0.5))).toBe('market');
        expect(blocked(p)).toBe(false);
      }
    }
    for (const a of MARKET_STREAMS)
      for (const b of MARKET_STREAMS) {
        if (a === b || a.axis === b.axis) continue;
        const crosses = b.c >= a.s0 && b.c <= a.s1 && a.c >= b.s0 && a.c <= b.s1;
        if (crosses) expect(a.y).not.toBe(b.y);
      }
  });

  it('flies every ship of a stream one way, at one speed, evenly spaced', () => {
    for (const S of MARKET_STREAMS) {
      const n = marketShips(S);
      expect(n).toBeGreaterThan(8);
      const dt = 1 / 30;
      for (let i = 0; i < n; i += 3) {
        const a = marketShip(S, i, 5).s;
        const b = marketShip(S, i, 5 + dt).s;
        // Unless it just came round at the stream's end, it moved the stream's way, at its speed.
        if (Math.abs(b - a) < 5) expect((b - a) * S.sgn).toBeCloseTo(S.speed * dt, 6);
      }
      const ss = Array.from({ length: n }, (_, i) => marketShip(S, i, 2).s).sort((x, y) => x - y);
      const len = S.s1 - S.s0;
      for (let i = 1; i < n; i++)
        expect((ss[i] as number) - (ss[i - 1] as number)).toBeCloseTo(len / n, 6);
    }
  });

  it('lights its ships and lanes in the stream’s colour, and the game draws them near the market', () => {
    const S = MARKET_STREAMS[0] as (typeof MARKET_STREAMS)[number];
    const p = marketPoint(S, (S.s0 + S.s1) / 2);
    const eye: Vec3 = [p[0], p[1], p[2] - 30];
    const it = highwayItem(S, 0, 0, eye, 4, 0);
    const o = [0, 0, 0, 0, 0, 0];
    let n = 0;
    for (let s = 0; s < it.count; s++) {
      if (!it.site(s, o)) continue;
      expect(o.every(Number.isFinite)).toBe(true);
      expect(Math.abs((o[1] as number) - p[1])).toBeLessThan(1.5);
      n++;
    }
    expect(n).toBeGreaterThan(50);
    const items = gameItems(eye, [0, 0, 1], 4, eye);
    expect(items.some((x) => x.gid === it.gid)).toBe(true);
  });
});
