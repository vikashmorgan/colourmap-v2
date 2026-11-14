import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  BANNER_FEET,
  type Banner,
  bannerBetween,
  orientedWordItem,
  ROOF_TOP,
  SIGN_FOOT,
  turnedBox,
  turnedSigns,
} from './city-banners';
import {
  archUnder,
  BRIDGE_HALF,
  CANAL_BRIDGE_ROWS,
  CANAL_BRIDGES,
  CANAL_DEEP,
  CANAL_HALF,
  canalBridgeItems,
  canalSky,
  LOW_TOP,
  WATER_Y,
} from './city-canal-bridges';
import { blockTower, CANAL_DEPTH, CANAL_W, districtOf, inCanal } from './city-game';
import { GATE_BEAM, GATES, gatePlace, gateSet } from './city-gates';
import { BLOCK_X, BLOCK_Z, GROUND, type Item, TILE_I } from './city-grid';
import { PLAZA, plazaSet } from './city-plazas';
import { strokePoint } from './city-strokes';

const G = GROUND;
const all = () => true;

function pts(S: ReturnType<typeof gateSet>): number[][] {
  const out: number[][] = [];
  for (let s = 0; s < S.count; s++) {
    const o = [0, 0, 0];
    strokePoint(S, s, 0, 0, o);
    out.push(o);
  }
  return out;
}

describe('quarter gates (2026-11-14: "more big gates like Chinatown’s, each in its quarter’s style")', () => {
  it('stands one in each quarter but Chinatown, each its own style, in its own quarter', () => {
    expect(GATES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(GATES.map((g) => g.d)).size).toBe(GATES.length);
    expect(new Set(GATES.map((g) => g.style)).size).toBe(GATES.length);
    expect(GATES.some((g) => g.d === 'chinatown')).toBe(false);
    for (const g of GATES) {
      expect(districtOf(g.line - 1, g.row)).toBe(g.d);
      expect(districtOf(g.line, g.row)).toBe(g.d);
      expect(Math.abs(g.line)).toBeGreaterThan(0);
    }
  });

  it('spans its street, its posts at the walls, every beam over the street channels: fly through it', () => {
    for (const g of GATES) {
      const p = gatePlace(g, blockTower);
      const S = gateSet(g, p.x, p.z, p.w);
      expect(S.count).toBeGreaterThan(200);
      let tall = 0;
      for (const o of pts(S)) {
        const u = Math.abs((o[0] as number) - p.x);
        // Between its posts, nothing comes lower than its lowest beam.
        if (u < p.w - 1.5) expect(o[1], g.style).toBeGreaterThan(G + GATE_BEAM - 0.5);
        tall = Math.max(tall, (o[1] as number) - G);
        // Off the crossing streets: within the block's length.
        expect(Math.abs((o[2] as number) - p.z)).toBeLessThan(BLOCK_Z / 2 - 4);
      }
      expect(tall, g.style).toBeGreaterThan(30);
      expect(tall, g.style).toBeLessThan(60);
      // The street between its posts is clear for the Ship.
      expect(p.w).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('banners across the streets (2026-11-14: "a door effect ... you fly under or over them")', () => {
  const banners = (): Banner[] => {
    const out: Banner[] = [];
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
      for (let J = 0; J < 56; J++) {
        const A = blockTower(I, J);
        for (const axis of [0, 2] as const) {
          const B = bannerBetween(
            A,
            axis === 0 ? blockTower(I + 1, J) : blockTower(I, J + 1),
            axis,
          );
          if (B) out.push(B);
        }
      }
    return out;
  };

  it('hangs many across both the side streets and the cross streets, high enough to fly under', () => {
    const bs = banners();
    expect(bs.filter((b) => b.axis === 0).length).toBeGreaterThan(10);
    expect(bs.filter((b) => b.axis === 2).length).toBeGreaterThan(10);
    for (const b of bs) {
      const box = turnedBox(b);
      expect(box.foot).toBeGreaterThanOrEqual(G + Math.min(...BANNER_FEET) - 1e-6);
      // Over the cross streets' highest lane (30) by six, under both roofs.
      expect(box.foot - G).toBeGreaterThan(30 + 6);
      // Wall to wall: its letters inside the street, its cables reaching the walls.
      const [wa, wb] = b.walls;
      const along = b.axis === 0 ? 0 : 2;
      const ends = [box.a[along] as number, box.b[along] as number].sort((x, y) => x - y);
      expect(ends[0]).toBeGreaterThan((wa[along] as number) - 1e-6);
      expect(ends[1]).toBeLessThan((wb[along] as number) + 1e-6);
      expect((wb[along] as number) - (wa[along] as number)).toBeGreaterThan(6);
    }
  });

  it('faces each the way its street runs: a cross street’s turned a quarter, its letters along z', () => {
    const b = banners().find((x) => x.axis === 2) as Banner;
    const it = orientedWordItem(b, [b.px + 30, b.w.at[1], b.pz], 2);
    const xs = new Set<number>();
    for (let s = 0; s < it.count; s++) {
      const o = [0, 0, 0, 0, 0, 0];
      if (it.site(s, o)) xs.add(Math.round((o[0] as number) * 100));
    }
    // One plane across x: read flying along the cross street.
    expect(xs.size).toBe(1);
  });
});

describe('signs turned every way (2026-11-14: "not all facing one way")', () => {
  it('turns them to the cross streets, to the crossings at an angle, and high over the roofs', () => {
    const yaws = new Set<number>();
    let roof = 0;
    for (let I = -TILE_I / 2; I < TILE_I / 2; I++)
      for (let J = 0; J < 56; J++) {
        const tw = blockTower(I, J);
        for (const T of turnedSigns(tw)) {
          yaws.add(Math.round((((T.yaw % Math.PI) + Math.PI) % Math.PI) * 100));
          const box = turnedBox(T);
          if (box.foot > G + tw.h) {
            roof++;
            expect(box.top).toBeLessThanOrEqual(G + ROOF_TOP + 1e-6);
          } else expect(box.foot).toBeGreaterThanOrEqual(G + SIGN_FOOT - 1e-6);
        }
      }
    // Square to the streets, along them, and at angles between.
    expect(yaws.size).toBeGreaterThanOrEqual(4);
    expect(yaws.has(157)).toBe(true);
    expect(roof).toBeGreaterThan(5);
  });
});

describe('canal bridges (2026-11-14: "arches ... whose underside curves up, Venice or Rialto-like")', () => {
  it('holds the canals where lib/city-game.ts has them', () => {
    expect(CANAL_HALF).toBe(CANAL_W);
    expect(CANAL_DEEP).toBe(CANAL_DEPTH);
    for (const r of CANAL_BRIDGE_ROWS) expect(inCanal(65, r * BLOCK_Z)).toBe(true);
  });

  it('builds every style along the canals: tall arches, stone, footbridges, the gallery, sky bridges', () => {
    const styles = new Set(CANAL_BRIDGES.map((b) => b.style));
    for (const s of ['tall', 'stone', 'foot', 'grand', 'sky'])
      expect(styles.has(s as never)).toBe(true);
    for (const r of CANAL_BRIDGE_ROWS)
      expect(CANAL_BRIDGES.filter((b) => b.row === r).length).toBeGreaterThanOrEqual(3);
    for (const b of CANAL_BRIDGES) expect(districtOf(b.I, b.row)).toBe('canals');
    // The sky bridges cross at heights where both towers stand.
    const sky = CANAL_BRIDGES.filter((b) => b.style === 'sky').map((b) => canalSky(b, blockTower));
    expect(sky.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('curves every arch up from the walls to its crown, with room to fly under along the canal', () => {
    for (const style of ['tall', 'stone', 'foot', 'grand'] as const) {
      const crown = archUnder(style, 0);
      // Concave from below: highest in the middle, lower toward the walls.
      expect(crown).toBeGreaterThan(archUnder(style, CANAL_HALF * 0.5));
      expect(archUnder(style, CANAL_HALF * 0.5)).toBeGreaterThan(
        archUnder(style, CANAL_HALF * 0.95),
      );
      expect(crown - WATER_Y).toBeGreaterThan(10);
    }
    const eye: Vec3 = [80, G - 4, 20 * BLOCK_Z];
    const out: Item[] = [];
    canalBridgeItems(eye, 3, 400, blockTower, all, out);
    expect(out.length).toBeGreaterThan(5);
    for (const b of CANAL_BRIDGES) {
      if (b.style === 'sky') continue;
      const xb = (b.I + 0.5) * BLOCK_X;
      const zc = b.row * BLOCK_Z;
      for (const it of out)
        for (let s = 0; s < it.count; s++) {
          const o = [0, 0, 0, 0, 0, 0];
          it.site(s, o);
          if (Math.abs((o[0] as number) - xb) > BRIDGE_HALF[b.style] + 0.1) continue;
          const dz = (o[2] as number) - zc;
          if (Math.abs(dz) > CANAL_HALF - 1) continue;
          // Nothing under its arch: the canal stays open to fly along.
          expect(o[1]).toBeGreaterThan(archUnder(b.style, dz) - 0.05);
          // At street level, every top under the cross street's lowest lane by four.
          if (Math.abs(dz) < 12) expect(o[1]).toBeLessThan(G + LOW_TOP);
        }
    }
  });
});

describe('plazas composed as one design round the temples and unique buildings', () => {
  it('lays a ring road, a pool with its rings, ramps and a ring walkway, inside the four open blocks', () => {
    const S = plazaSet();
    let ramp = 0;
    for (let s = 0; s < S.count; s++) {
      const o = [0, 0, 0];
      strokePoint(S, s, 0, 0, o);
      const x = o[0] as number;
      const y = (o[1] as number) - G;
      const z = o[2] as number;
      // Inside the plaza's blocks, clear of the streets round it.
      expect(Math.abs(x)).toBeLessThan(BLOCK_X - 3.5);
      expect(Math.abs(z)).toBeLessThan(BLOCK_Z - 4);
      expect(y).toBeLessThan(PLAZA.ringY + 1.5);
      if (y > 2 && y < PLAZA.ringY - 1) {
        ramp++;
        // The ramps climb in the quarters between the crossing streets.
        expect(Math.abs(x)).toBeGreaterThan(2.5);
        expect(Math.abs(z)).toBeGreaterThan(2.5);
      }
    }
    expect(ramp).toBeGreaterThan(50);
  });
});
