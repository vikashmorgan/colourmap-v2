import { describe, expect, it } from 'vitest';
import {
  ARTEFACTS,
  DISCOVERIES,
  distToLoop,
  HULLS,
  KICKERS,
  MARS_TERRAIN,
  marsBase,
  marsHeight,
  marsTerrainGlsl,
  PORTALS,
  ROCKS,
  SITES,
  siteHit,
  WRECK_SOLIDS,
  WRECKS,
} from './mars';
import {
  ARTEFACT_DEFS,
  artefactSolids,
  DEBRIS_SOLID,
  flicker,
  foundString,
  type HaloRing,
  HULL_SIDE,
  type Hull,
  hullFloor,
  hullHit,
  hullWidth,
  newlyFound,
  parseFound,
  REVEAL,
  ringBroken,
  ringFeet,
  ringPoint,
  ruinPillars,
  solidHit,
  WRECK_DEFS,
  WRECK_FLATS,
  wreckSolids,
} from './mars-wrecks';
import { LINE, START } from './salt-flat-game';
import { newVehicle, stepVehicle } from './vehicle';

const hull: Hull = { ax: 0, ay: 0, bx: 200, by: 0, R: 15, a: 4.5 };

describe('a hull you drive through', () => {
  it('is as wide at the ground as its circle cut by the sand', () => {
    expect(hullWidth(hull)).toBeCloseTo(Math.sqrt(15 * 15 - 4.5 * 4.5), 9);
  });

  it('curves its sand floor up its sides, flat on its line, easing in at its ends', () => {
    const w = hullWidth(hull);
    expect(hullFloor(hull, 100, 0)).toBe(0);
    const side = hullFloor(hull, 100, w * HULL_SIDE - 0.01);
    expect(side).toBeGreaterThan(3);
    expect(side).toBeCloseTo(w - Math.sqrt(w * w - (w * HULL_SIDE) ** 2), 1);
    // Rises toward the sides, symmetric.
    expect(hullFloor(hull, 100, 5)).toBeCloseTo(hullFloor(hull, 100, -5), 9);
    expect(hullFloor(hull, 100, 8)).toBeGreaterThan(hullFloor(hull, 100, 4));
    // At the mouths you drive in at grade; off the hull, nothing.
    expect(hullFloor(hull, 0.01, 8)).toBeLessThan(0.01);
    expect(hullFloor(hull, 199.99, 8)).toBeLessThan(0.01);
    expect(hullFloor(hull, -5, 0)).toBe(0);
    expect(hullFloor(hull, 100, w)).toBe(0);
  });

  it('holds you inside its shell and keeps you off its outside, until you fly over it', () => {
    const w = hullWidth(hull);
    const inside = hullHit(hull, 100, w * HULL_SIDE, 1.2, 0);
    expect(inside?.ny).toBeCloseTo(-1, 9);
    expect(inside?.depth).toBeCloseTo(1.2, 9);
    const outside = hullHit(hull, 100, -(w + 2), 1.2, 0);
    expect(outside?.ny).toBeCloseTo(-1, 9);
    expect(hullHit(hull, 100, 0, 1.2, 0)).toBeNull();
    // The mouths are open, and above its top it is nothing.
    expect(hullHit(hull, -2, w * HULL_SIDE, 1.2, 0)).toBeNull();
    expect(hullHit(hull, 100, -(w + 2), 1.2, hull.a + hull.R)).toBeNull();
    expect(hullHit(hull, 100, -(w + 2), 1.2, hull.a + hull.R - 1)).not.toBeNull();
  });
});

describe('a broken ring standing in the sand', () => {
  const ring: HaloRing = {
    x: 0,
    y: 0,
    h: 0,
    R: 60,
    tube: 5,
    tilt: 0.3,
    zc: 30,
    gap0: 2,
    gap1: 2.5,
  };

  it('stands its two feet in the sand, either side of the way through it', () => {
    const feet = ringFeet(ring);
    expect(feet).toHaveLength(2);
    for (const f of feet) {
      // On the ground at its feet.
      const th = Math.atan2(f.y, f.x);
      expect(Number.isFinite(th)).toBe(true);
    }
    // Across the way (heading 0: the feet lie north and south, the way under is open).
    expect(feet[0].y * feet[1].y).toBeLessThan(0);
    const gap = Math.hypot(feet[1].x - feet[0].x, feet[1].y - feet[0].y);
    expect(gap).toBeGreaterThan(80);
  });

  it('meets the ground at its feet and rises high over the way', () => {
    const a = Math.asin(-ring.zc / (ring.R * Math.cos(ring.tilt)));
    expect(ringPoint(ring, a).z).toBeCloseTo(0, 6);
    expect(ringPoint(ring, Math.PI / 2).z).toBeCloseTo(ring.zc + ring.R * Math.cos(ring.tilt), 6);
    // Leaning back: its top lies behind its middle along the way.
    expect(ringPoint(ring, Math.PI / 2).x).toBeGreaterThan(0);
  });

  it('is torn away along its gap', () => {
    expect(ringBroken(ring, 2.2)).toBe(true);
    expect(ringBroken(ring, 1.5)).toBe(false);
  });
});

describe('the wrecks on Mars', () => {
  it('lays all five big wrecks, clear of the open ways', () => {
    expect(WRECKS.map((w) => w.id)).toEqual(WRECK_DEFS.map((d) => d.id));
    for (const w of WRECKS) {
      expect(distToLoop(w.x, w.y)).toBeGreaterThan(600);
      expect(Math.hypot(w.x - START.x, w.y - START.y)).toBeGreaterThan(1500);
      for (const s of SITES) expect(Math.hypot(s.x - w.x, s.y - w.y)).toBeGreaterThan(300);
      for (const k of KICKERS) expect(Math.hypot(k.x - w.x, k.y - w.y)).toBeGreaterThan(230);
      for (const p of PORTALS) expect(Math.hypot(p.x - w.x, p.y - w.y)).toBeGreaterThan(230);
      for (const r of ROCKS) expect(Math.hypot(r.x - w.x, r.y - w.y)).toBeGreaterThan(230);
      // Off the line's corridor.
      const cy = Math.max(LINE.y0, Math.min(LINE.y1, w.y));
      expect(Math.hypot(w.x - LINE.x, w.y - cy)).toBeGreaterThan(400);
    }
  });

  it('lies on ground flattened by its fall, mirrored in the backdrop shader', () => {
    for (const w of WRECKS) {
      for (const [dx, dy] of [
        [0, 0],
        [150, 60],
        [-120, -140],
      ])
        expect(Math.abs(marsBase(w.x + dx, w.y + dy))).toBeLessThan(1e-6);
    }
    const glsl = marsTerrainGlsl();
    for (const f of WRECK_FLATS) expect(glsl).toContain(f.x.toFixed(6));
  });

  it('keeps each hull mouth and its trench line open, the debris to its sides', () => {
    for (const w of WRECKS) {
      const c = Math.cos(w.h);
      const s = Math.sin(w.h);
      // Down the trench, into the hull and out of its front: nothing solid on the line.
      for (let u = -w.hull.R * 0 - 400; u <= 200; u += 4) {
        const x = w.x + c * u;
        const y = w.y + s * u;
        expect(siteHit(x, y, 1.2, marsHeight(x, y))).toBeNull();
      }
      for (const d of w.debris) {
        const u = (d.x - w.x) * c + (d.y - w.y) * s;
        const v = -(d.x - w.x) * s + (d.y - w.y) * c;
        expect(Math.abs(v)).toBeGreaterThan(w.hull.R + 10);
        expect(Math.abs(u)).toBeLessThan(800);
      }
      expect(w.debris.length).toBeGreaterThan(20);
    }
  });

  it('makes the ring feet, the nose and the bigger debris solid, the small debris not', () => {
    for (const w of WRECKS) {
      const solids = wreckSolids(w);
      for (const f of ringFeet(w.ring))
        expect(solids.some((q) => Math.hypot(q.x - f.x, q.y - f.y) < 1e-6)).toBe(true);
      for (const d of w.debris)
        expect(solids.some((q) => q.x === d.x && q.y === d.y)).toBe(d.r >= DEBRIS_SOLID);
      for (const q of solids) expect(WRECK_SOLIDS).toContainEqual(q);
    }
  });

  it('carries you through a hull at speed, its floor under you, its shell keeping you in', () => {
    const w = WRECKS[0];
    const c = Math.cos(w.h);
    const s = Math.sin(w.h);
    const L = Math.hypot(w.hull.bx - w.hull.ax, w.hull.by - w.hull.ay);
    // In at the tail a little off its line, steering gently across it.
    const v = newVehicle('car', w.hull.ax - c * 60 - s * 3, w.hull.ay - s * 60 + c * 3, w.h + 0.05);
    v.vx = Math.cos(w.h + 0.05) * 50;
    v.vy = Math.sin(w.h + 0.05) * 50;
    let maxOff = 0;
    for (let i = 0; i < 60 * 5; i++) {
      stepVehicle(v, { throttle: 0.6, steer: 0, boost: 0 }, 1 / 60, MARS_TERRAIN, i / 60);
      const u = (v.x - w.hull.ax) * c + (v.y - w.hull.ay) * s;
      if (u > 10 && u < L - 10) {
        const off = Math.abs(-(v.x - w.hull.ax) * s + (v.y - w.hull.ay) * c);
        maxOff = Math.max(maxOff, off);
        expect(v.z).toBeGreaterThan(marsHeight(v.x, v.y) - 0.5);
      }
    }
    // Through and out of the front mouth, never through its wall.
    const u = (v.x - w.hull.ax) * c + (v.y - w.hull.ay) * s;
    expect(u).toBeGreaterThan(L);
    expect(maxOff).toBeLessThan(hullWidth(w.hull) * HULL_SIDE);
  });

  it('adds the hulls’ floors to the ground you drive', () => {
    const hl = HULLS[0];
    const mx = (hl.ax + hl.bx) / 2;
    const my = (hl.ay + hl.by) / 2;
    const ex = (hl.bx - hl.ax) / Math.hypot(hl.bx - hl.ax, hl.by - hl.ay);
    const ey = (hl.by - hl.ay) / Math.hypot(hl.bx - hl.ax, hl.by - hl.ay);
    const px = mx - ey * 8;
    const py = my + ex * 8;
    expect(marsHeight(px, py)).toBeCloseTo(marsBase(px, py) + hullFloor(hl, px, py), 9);
    expect(marsHeight(px, py)).toBeGreaterThan(1);
  });
});

describe('the artefacts', () => {
  it('stands every artefact, off the loop and the stations', () => {
    expect(ARTEFACTS.map((a) => a.id)).toEqual(ARTEFACT_DEFS.map((d) => d.id));
    for (const a of ARTEFACTS) {
      expect(distToLoop(a.x, a.y)).toBeGreaterThan(100);
      for (const s of SITES) expect(Math.hypot(s.x - a.x, s.y - a.y)).toBeGreaterThan(s.r + 30);
    }
    expect(new Set(ARTEFACTS.map((a) => a.kind))).toEqual(
      new Set(['monolith', 'satellite', 'ruins']),
    );
  });

  it('rings the ruins with pillars you can drive between, arches either side of the way', () => {
    const ruins = ARTEFACTS.filter((a) => a.kind === 'ruins');
    for (const a of ruins) {
      const ps = ruinPillars(a);
      expect(ps.filter((p) => p.arch)).toHaveLength(4);
      for (let i = 0; i < ps.length; i++) {
        const q = ps[(i + 1) % ps.length];
        expect(Math.hypot(q.x - ps[i].x, q.y - ps[i].y) - 2 * 1.7).toBeGreaterThan(10);
      }
      // Solid pillars and altar, the gaps open.
      const solids = artefactSolids(a);
      expect(solids).toHaveLength(ps.length + 1);
    }
  });

  it('is solid below its top, nothing above it', () => {
    const s = { x: 0, y: 0, r: 2, top: 10 };
    expect(solidHit(s, 2.5, 0, 1.2, 0)?.nx).toBeCloseTo(1, 9);
    expect(solidHit(s, 2.5, 0, 1.2, 10)).toBeNull();
    expect(solidHit(s, 4, 0, 1.2, 0)).toBeNull();
    const m = ARTEFACTS.find((a) => a.kind === 'monolith');
    if (!m) throw new Error('no monolith');
    expect(siteHit(m.x + 2.5, m.y, 1.2, marsBase(m.x, m.y))).not.toBeNull();
  });
});

describe('finding things', () => {
  it('lists every wreck and artefact to find', () => {
    expect(DISCOVERIES).toHaveLength(WRECKS.length + ARTEFACTS.length);
    expect(new Set(DISCOVERIES.map((d) => d.id)).size).toBe(DISCOVERIES.length);
  });

  it('finds a thing once you come near it, and only once', () => {
    const w = DISCOVERIES[0];
    expect(newlyFound([], DISCOVERIES, w.x + w.reveal + 5, w.y)).toHaveLength(0);
    const found = newlyFound([], DISCOVERIES, w.x + REVEAL.wreck - 5, w.y);
    expect(found.map((d) => d.id)).toEqual([w.id]);
    expect(newlyFound([w.id], DISCOVERIES, w.x, w.y)).toHaveLength(0);
  });

  it('keeps the finds on the device as a plain list', () => {
    expect(parseFound(foundString(['ark', 'mono-south', 'ark']))).toEqual(['ark', 'mono-south']);
    expect(parseFound(null)).toEqual([]);
    expect(parseFound('ark,<bad>,halo')).toEqual(['ark', 'halo']);
  });
});

describe('the wrecks’ lamps', () => {
  it('flicker: mostly a dim glow, now and then dropping out', () => {
    let out = 0;
    let lo = 1;
    let hi = 0;
    for (let i = 0; i < 4000; i++) {
      const k = flicker(i / 60, 0.37);
      if (k < 0.2) out++;
      lo = Math.min(lo, k);
      hi = Math.max(hi, k);
    }
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(out / 4000).toBeGreaterThan(0.03);
    expect(out / 4000).toBeLessThan(0.2);
    expect(flicker(1.23, 0.5)).toBe(flicker(1.23, 0.5));
  });
});
