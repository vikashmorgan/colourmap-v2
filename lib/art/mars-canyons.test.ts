import { describe, expect, it } from 'vitest';
import type { Controls } from './drive';
import {
  CLEAR,
  DRIFT_PAN,
  distToLoop,
  KICKERS,
  MARS_TERRAIN,
  marsBase,
  marsGround,
  marsHeight,
  marsTerrainGlsl,
  ROCK_ARCHES,
  ROCKS,
  regionAt,
  SITES,
  siteHit,
} from './mars';
import {
  arcNearest,
  CANYON_ARCS,
  CANYON_BANK,
  CANYON_DEFS,
  CANYONS,
  canyonCut,
  canyonGlsl,
  canyonPoint,
  layCanyon,
} from './mars-canyons';
import { ARCHES, CRATER, LAKES } from './mars-map';
import { SLAB } from './mars-ramps';
import { rockArchFeet } from './mars-rocks';
import { LINE, START } from './salt-flat-game';
import { newVehicle, stepVehicle } from './vehicle';

/** Every point along every canyon's line, a few metres apart. */
const LINE_POINTS = CANYONS.map((arcs) =>
  arcs.flatMap((a) => Array.from({ length: 80 }, (_, k) => canyonPoint(a, k / 80))),
);

describe('the canyons', () => {
  it('lay their arcs end to end, each running on where the last one stopped', () => {
    expect(CANYONS.length).toBeGreaterThanOrEqual(2);
    for (const arcs of CANYONS) {
      for (let i = 1; i < arcs.length; i++) {
        const a = arcs[i - 1];
        const b = arcs[i];
        expect(Math.hypot(b.x0 - a.x1, b.y0 - a.y1)).toBeLessThan(1e-6);
        expect(b.w0).toBe(a.w1);
        expect(b.d0).toBe(a.d1);
        // The heading carries on: the end of one is the start of the next.
        const ha = canyonPoint(a, 1).h;
        const hb = canyonPoint(b, 0).h;
        expect(Math.abs(Math.sin(ha - hb))).toBeLessThan(1e-6);
        expect(Math.cos(ha - hb)).toBeGreaterThan(0);
      }
      // In and out at grade.
      expect(arcs[0].d0).toBe(0);
      expect(arcs[arcs.length - 1].d1).toBe(0);
    }
  });

  it('turns left and right round its radius, as laid', () => {
    const [a] = layCanyon({
      name: 't',
      x: 0,
      y: 0,
      h: 0,
      w: 10,
      pieces: [[100, Math.PI / 2, 10, 5]],
    });
    expect(a.x1).toBeCloseTo(100, 6);
    expect(a.y1).toBeCloseTo(100, 6);
    const [b] = layCanyon({
      name: 't',
      x: 0,
      y: 0,
      h: 0,
      w: 10,
      pieces: [[100, -Math.PI / 2, 10, 5]],
    });
    expect(b.x1).toBeCloseTo(100, 6);
    expect(b.y1).toBeCloseTo(-100, 6);
    expect(arcNearest(a, 50, 50).d).toBeCloseTo(100 - Math.hypot(50, 50), 6);
  });

  it('cut down to their depth on the line, nothing past the rim', () => {
    for (const a of CANYON_ARCS) {
      const p = canyonPoint(a, 0.5);
      const want = (a.d0 + a.d1) / 2;
      expect(canyonCut(p.x, p.y).carve).toBeCloseTo(want, 1);
      const w = (a.w0 + a.w1) / 2;
      const off = w + CANYON_BANK + 2;
      const q = { x: p.x - Math.sin(p.h) * off, y: p.y + Math.cos(p.h) * off };
      // Past the rim only another arc of the same canyon can reach (on a tight bend).
      const near = CANYON_ARCS.filter((b) => b !== a && arcNearest(b, q.x, q.y).d < off);
      if (!near.length) expect(canyonCut(q.x, q.y).carve).toBe(0);
    }
    expect(canyonCut(START.x, START.y).carve).toBe(0);
  });

  it('are part of the ground the physics drives and the backdrop draws', () => {
    // The deepest stretches lie well below anything the dunes alone reach.
    const deep = CANYON_ARCS.filter((a) => a.d1 >= 24).map((a) => canyonPoint(a, 1));
    expect(deep.length).toBeGreaterThan(0);
    for (const p of deep)
      expect(marsBase(p.x, p.y)).toBeLessThan(marsBase(p.x + 400, p.y + 400) + 30);
    expect(Math.min(...deep.map((p) => marsHeight(p.x, p.y)))).toBeLessThan(-20);
    const src = marsTerrainGlsl();
    expect(src).toContain('float marsCanyon(vec2 a, out float floorK)');
    expect(src).toContain('h -= marsCanyon(a, ck);');
    expect(canyonGlsl().match(/carve = max\(carve/g)?.length).toBe(CANYON_ARCS.length);
  });

  it('keeps the floor smooth along the line: no crest sharp enough to throw you at 60 m/s', () => {
    for (const pts of LINE_POINTS) {
      for (let i = 3; i < pts.length - 3; i += 3) {
        const a = pts[i - 3];
        const b = pts[i];
        const c = pts[i + 3];
        const ds = (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y)) / 2;
        // The cut alone (the dunes under it are as everywhere on Mars).
        const k =
          -(canyonCut(c.x, c.y).carve - 2 * canyonCut(b.x, b.y).carve + canyonCut(a.x, a.y).carve) /
          (ds * ds);
        expect(k).toBeGreaterThan(-20 / 60 ** 2);
      }
    }
  });

  it('banks its walls steep enough to ride the tilt, never so steep they cannot be driven', () => {
    let wall = 0;
    for (const a of CANYON_ARCS) {
      for (let k = 0; k <= 10; k++) {
        const p = canyonPoint(a, k / 10);
        for (let off = -220; off <= 220; off += 3) {
          const x = p.x - Math.sin(p.h) * off;
          const y = p.y + Math.cos(p.h) * off;
          if (marsHeight(x, y) !== marsBase(x, y)) continue;
          const g = marsGround(x, y);
          wall = Math.max(wall, Math.hypot(g.gx, g.gy));
        }
      }
    }
    expect(Math.atan(wall)).toBeGreaterThan((25 * Math.PI) / 180);
    expect(Math.atan(wall)).toBeLessThan((40 * Math.PI) / 180);
  });

  it('is raced: flat out along a canyon you stay in it, on the ground most of the way', () => {
    for (const pts of LINE_POINTS) {
      const v = newVehicle('car', pts[0].x, pts[0].y, pts[0].h);
      v.z = marsHeight(v.x, v.y);
      let idx = 0;
      let air = 0;
      let i = 0;
      for (; i < 60 * 90 && idx < pts.length - 3; i++) {
        while (idx < pts.length - 1 && Math.hypot(pts[idx].x - v.x, pts[idx].y - v.y) < 60) idx++;
        const t = pts[idx];
        let d = Math.atan2(t.y - v.y, t.x - v.x) - Math.atan2(v.vy, v.vx);
        d -= Math.PI * 2 * Math.round(d / (Math.PI * 2));
        const go: Controls = { throttle: 1, steer: Math.max(-1, Math.min(1, d * 1.2)), boost: 0 };
        stepVehicle(v, go, 1 / 60, MARS_TERRAIN, i / 60);
        if (v.air) air++;
        // Never sunk into the ground (a hair of give where a slab's face meets the floor).
        expect(v.z).toBeGreaterThanOrEqual(marsHeight(v.x, v.y) - 0.25);
        expect(Math.min(...CANYON_ARCS.map((a) => arcNearest(a, v.x, v.y).d))).toBeLessThan(15);
      }
      expect(idx).toBeGreaterThan(pts.length - 6);
      expect(air / i).toBeLessThan(0.3);
    }
  });

  it('keeps clear of his loop, the start, the mile, the drift lake bed, the crater, the lakes and the arches', () => {
    for (const a of CANYON_ARCS) {
      const reach = Math.max(a.w0, a.w1) + CANYON_BANK;
      for (let k = 0; k <= 20; k++) {
        const p = canyonPoint(a, k / 20);
        expect(distToLoop(p.x, p.y)).toBeGreaterThan(reach + 200);
        expect(Math.hypot(p.x - START.x, p.y - START.y)).toBeGreaterThan(reach + CLEAR.start);
        const cy = Math.min(LINE.y1, Math.max(LINE.y0, p.y));
        expect(Math.hypot(p.x - LINE.x, p.y - cy)).toBeGreaterThan(reach + CLEAR.line);
        expect(Math.hypot(p.x - DRIFT_PAN.x, p.y - DRIFT_PAN.y)).toBeGreaterThan(
          DRIFT_PAN.full + reach,
        );
        expect(Math.hypot(p.x - CRATER.x, p.y - CRATER.y)).toBeGreaterThan(CRATER.R * 2.5 + reach);
        for (const l of LAKES)
          expect(Math.hypot(p.x - l.x, p.y - l.y)).toBeGreaterThan(l.r + 450 + reach);
        for (const r of ARCHES) expect(Math.hypot(p.x - r.x, p.y - r.y)).toBeGreaterThan(reach);
      }
    }
    // No station stands in a canyon.
    for (const s of SITES) expect(canyonCut(s.x, s.y).carve).toBe(0);
  });

  it('names its regions', () => {
    const red = CANYONS[0][3];
    const rift = CANYONS[1][2];
    const p = canyonPoint(red, 0.5);
    const q = canyonPoint(rift, 0.5);
    expect(regionAt(p.x, p.y)?.id).toBe('canyons');
    expect(regionAt(q.x, q.y)?.id).toBe('rift');
    expect(CANYON_DEFS.map((d) => d.name)).toContain('The Rift');
  });
});

describe('the rock fields', () => {
  it('stand mesas and spires on the rims, boulders in the gorges, arches over the floors', () => {
    const count = (k: string) => ROCKS.filter((r) => r.kind === k).length;
    expect(count('mesa')).toBeGreaterThanOrEqual(8);
    expect(count('spire')).toBeGreaterThanOrEqual(8);
    expect(count('boulder')).toBeGreaterThanOrEqual(60);
    expect(ROCK_ARCHES.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the mesas and spires off the cut and the open ways', () => {
    for (const r of ROCKS) {
      expect(distToLoop(r.x, r.y)).toBeGreaterThan(r.r + 40);
      expect(Math.hypot(r.x - START.x, r.y - START.y)).toBeGreaterThan(r.r + CLEAR.start);
      if (r.kind === 'mesa' || r.kind === 'spire') expect(canyonCut(r.x, r.y).carve).toBe(0);
    }
  });

  it('leaves a racing lane down the middle of each gorge', () => {
    for (const r of ROCKS.filter((o) => o.kind === 'boulder')) {
      const d = Math.min(...CANYON_ARCS.map((a) => arcNearest(a, r.x, r.y).d));
      expect(d - r.r).toBeGreaterThan(18);
    }
  });

  it('makes the rocks solid and the way under a rock arch open', () => {
    for (const r of ROCKS) expect(siteHit(r.x, r.y)?.flow).toBe(true);
    for (const a of ROCK_ARCHES) {
      expect(siteHit(a.x, a.y)).toBeNull();
      for (const f of rockArchFeet(a)) expect(siteHit(f.x, f.y)).not.toBeNull();
      // Its feet stand outside the floor, on the walls' foot.
      expect(canyonCut(a.x, a.y).carve).toBeGreaterThan(15);
    }
  });

  it('lays rock slabs to jump, in the gorges and out of the canyons mouths', () => {
    const slabs = KICKERS.filter((k) => k.rock);
    expect(slabs.length).toBeGreaterThanOrEqual(4);
    for (const k of slabs) {
      expect(k.height).toBe(SLAB.height);
      const lx = k.x + Math.cos(k.h) * k.len;
      const ly = k.y + Math.sin(k.h) * k.len;
      expect(marsHeight(lx, ly) - marsBase(lx, ly)).toBeGreaterThan(SLAB.height * 0.9);
      // A clear run-up.
      for (const u of [-50, -20])
        expect(siteHit(k.x + Math.cos(k.h) * u, k.y + Math.sin(k.h) * u, 5)).toBeNull();
    }
  });
});
