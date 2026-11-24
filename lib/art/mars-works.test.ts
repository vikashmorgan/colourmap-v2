import { describe, expect, it } from 'vitest';
import {
  BARRELS,
  BOXES,
  CLEAR,
  cityClear,
  DRIFT_PAN,
  distToLoop,
  KICKERS,
  MARS_TERRAIN,
  marsBase,
  marsHeight,
  marsTerrainGlsl,
  PORTALS,
  radiation,
  regionAt,
  SITES,
  siteHit,
  TANKS,
} from './mars';
import { canyonCut } from './mars-canyons';
import { CRATER, LAKES } from './mars-map';
import {
  BARREL_SIDE,
  type Barrel,
  type Box,
  barrelAt,
  barrelHit,
  boxHit,
  CITY,
  FLATS,
  MEGA_WORKS,
  NUKES,
  platformTop,
  ROOF_INSET,
  ROOF_STEP,
  TOWN,
  townXY,
} from './mars-works';
import { WRECK_FLATS } from './mars-wrecks';
import { LINE, START } from './salt-flat-game';
import { newVehicle, stepVehicle } from './vehicle';

const box: Box = {
  x: 0,
  y: 0,
  hx: 20,
  hy: 10,
  rot: 0,
  h: 12,
  roof: true,
  kind: 'hall',
  seed: 0.5,
};

describe('roofs and walls', () => {
  it('lets you land on a roof inside its inset, not on its edge', () => {
    expect(platformTop([box], [], 0, 0)).toBe(12);
    expect(platformTop([box], [], 20 - ROOF_INSET - 0.1, 0)).toBe(12);
    expect(platformTop([box], [], 20 - ROOF_INSET + 0.1, 0)).toBe(Number.NEGATIVE_INFINITY);
    expect(platformTop([{ ...box, roof: false }], [], 0, 0)).toBe(Number.NEGATIVE_INFINITY);
    expect(platformTop([], [{ x: 50, y: 0, r: 9, h: 10 }], 50, 3)).toBe(10);
  });

  it('turns roofs with their heading', () => {
    const turned = { ...box, rot: Math.PI / 2 };
    expect(platformTop([turned], [], 0, 15)).toBe(12);
    expect(platformTop([turned], [], 15, 0)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('is a wall from the street, nothing from up on the roof', () => {
    const hit = boxHit(box, 20.5, 0, 1.2, 0);
    expect(hit?.nx).toBeCloseTo(1, 9);
    expect(hit?.depth).toBeCloseTo(0.7, 9);
    expect(boxHit(box, 0, 10.5, 1.2, 0)?.ny).toBeCloseTo(1, 9);
    expect(boxHit(box, 23, 0, 1.2, 0)).toBeNull();
    expect(boxHit(box, 20.5, 0, 1.2, box.h - ROOF_STEP + 0.01)).toBeNull();
    // Inside, out the nearer side.
    expect(boxHit(box, 0, 8, 1.2, 0)?.ny).toBeCloseTo(1, 9);
  });
});

describe('the barrel', () => {
  const b: Barrel = { ax: 0, ay: 0, bx: 100, by: 0, R: 10 };

  it('curves its floor up its sides, round as the pipe', () => {
    expect(barrelAt(b, 50, 0).h).toBe(0);
    expect(barrelAt(b, 50, 6).h).toBeCloseTo(10 - 8, 9);
    expect(barrelAt(b, 50, -6).h).toBeCloseTo(2, 9);
    expect(barrelAt(b, -1, 6).h).toBe(0);
    expect(barrelAt(b, 50, 9).shell).toBeGreaterThan(0);
  });

  it('holds you inside its shell, and keeps you off its outside', () => {
    const inside = barrelHit(b, 50, b.R * BARREL_SIDE, 1.2);
    expect(inside?.ny).toBeCloseTo(-1, 9);
    const outside = barrelHit(b, 50, -(b.R + 2), 1.2);
    expect(outside?.ny).toBeCloseTo(-1, 9);
    expect(barrelHit(b, 50, 0, 1.2)).toBeNull();
    expect(barrelHit(b, -2, b.R * BARREL_SIDE, 1.2)).toBeNull();
  });
});

describe('the factory city', () => {
  it('stands on flat ground, mirrored in the backdrop shader', () => {
    for (const f of FLATS) {
      expect(Math.abs(marsBase(f.x, f.y))).toBe(0);
      expect(Math.abs(marsBase(f.x + f.flat * 0.7, f.y))).toBe(0);
    }
    const masks = marsTerrainGlsl().match(/m \*= smoothstep\([\d.]+, [\d.]+, length\(a - vec2/g);
    // The towns' flats, the lakes, and the wrecks' flats (lib/art/mars-wrecks.ts).
    expect(masks?.length).toBe(FLATS.length + LAKES.length + WRECK_FLATS.length);
    for (const b of BOXES) {
      expect(marsBase(b.x, b.y)).toBeCloseTo(0, 9);
      const inTown =
        Math.hypot(b.x - TOWN.x, b.y - TOWN.y) < 400 ||
        NUKES.some((n) => Math.hypot(b.x - n.x, b.y - n.y) < 300);
      expect(inTown).toBe(true);
    }
  });

  it('keeps every town clear of his loop, the start, the mile, the crater, the lakes and the canyons', () => {
    expect(cityClear()).toBe(true);
    for (const f of FLATS) {
      expect(distToLoop(f.x, f.y)).toBeGreaterThan(f.full + CLEAR.loop);
      expect(Math.hypot(f.x - START.x, f.y - START.y)).toBeGreaterThan(f.full + CLEAR.start);
      const cy = Math.min(LINE.y1, Math.max(LINE.y0, f.y));
      expect(Math.hypot(f.x - LINE.x, f.y - cy)).toBeGreaterThan(f.full + CLEAR.line);
      expect(Math.hypot(f.x - DRIFT_PAN.x, f.y - DRIFT_PAN.y)).toBeGreaterThan(f.full);
      expect(Math.hypot(f.x - CRATER.x, f.y - CRATER.y)).toBeGreaterThan(CRATER.R * 1.5 + f.full);
      for (const l of LAKES)
        expect(Math.hypot(f.x - l.x, f.y - l.y)).toBeGreaterThan(l.r * 1.35 + f.full);
      expect(canyonCut(f.x, f.y).carve).toBe(0);
    }
  });

  it('builds a town of streets, nuclear towns and the mega works', () => {
    expect(BOXES.length).toBe(CITY.boxes.length);
    const town = BOXES.filter((b) => b.kind === 'hall' || b.kind === 'warehouse');
    expect(town.length).toBeGreaterThan(14);
    expect(TANKS.length).toBeGreaterThanOrEqual(6);
    expect(BARRELS.length).toBe(1);
    const kinds = (k: string) => SITES.filter((s) => s.kind === k).length;
    expect(kinds('cooling')).toBeGreaterThanOrEqual(NUKES.length * 6);
    expect(kinds('reactor')).toBe(NUKES.length);
    expect(kinds('chimney')).toBeGreaterThanOrEqual(7);
    expect(kinds('preheater') + kinds('silos')).toBeGreaterThanOrEqual(4);
    expect(MEGA_WORKS.every((w) => SITES.some((s) => s.x === w.x && s.y === w.y))).toBe(true);
    expect(regionAt(TOWN.x, TOWN.y)?.id).toBe('foundry');
    expect(regionAt(NUKES[0].x, NUKES[0].y)?.id).toBe('reactor');
    expect(regionAt(NUKES[1].x, NUKES[1].y)?.id).toBe('cooling');
  });

  it('leaves the streets open: no building on another, the avenue clear down its line', () => {
    for (const a of BOXES)
      for (const b of BOXES) {
        if (a === b) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(Math.min(a.hy, b.hy) * 2);
      }
    // Down the avenue's line from end to end, nothing but the slalom's stacks either side.
    for (let u = -260; u <= 210; u += 4) {
      const p = townXY(u, 0);
      expect(siteHit(p.x, p.y, 1.2)).toBeNull();
    }
    // A street between blocks is open too.
    for (let v = -200; v <= 200; v += 4) {
      const p = townXY(-132, v);
      expect(siteHit(p.x, p.y, 1.2)).toBeNull();
    }
  });

  it('gives the reactors a milder radiation than the lakes', () => {
    const r = radiation(NUKES[0].x, NUKES[0].y);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(0.8);
    expect(radiation(NUKES[0].x + 600, NUKES[0].y)).toBe(0);
  });

  it('stands a superboost portal on the avenue before the slalom', () => {
    const p = townXY(-40, 0);
    expect(PORTALS.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1)).toBe(true);
  });
});

describe('riding the factory city', () => {
  const roofRamps = KICKERS.filter((k) => CITY.ramps.some((r) => r.x === k.x && r.y === k.y));

  it('flings you off a roof ramp onto a roof at speed', () => {
    expect(roofRamps.length).toBe(CITY.ramps.length);
    for (const k of roofRamps) {
      // Somewhere between 140 and 220 km/h each one puts you on the roof across the street.
      let onRoof = 0;
      for (const speed of [40, 46, 52, 58]) {
        const v = newVehicle('car', k.x - Math.cos(k.h) * 40, k.y - Math.sin(k.h) * 40, k.h);
        v.vx = Math.cos(k.h) * speed;
        v.vy = Math.sin(k.h) * speed;
        // The landing after the flight off the lip (high above the street).
        let landed = false;
        let high = false;
        for (let i = 0; i < 60 * 5 && !landed; i++) {
          const wasAir = v.air;
          stepVehicle(v, { throttle: 0.3, steer: 0, boost: 0 }, 1 / 60, MARS_TERRAIN, i / 60);
          if (v.air && v.z > 13) high = true;
          if (high && wasAir && !v.air) landed = true;
        }
        expect(landed).toBe(true);
        expect(v.z).toBeCloseTo(marsHeight(v.x, v.y), 1);
        if (platformTop(BOXES, TANKS, v.x, v.y) > 10) onRoof++;
      }
      expect(onRoof).toBeGreaterThanOrEqual(2);
    }
  });

  it('never climbs a wall from the street, even superboosted', () => {
    const hall = BOXES.find((b) => b.kind === 'hall') as Box;
    for (const speed of [40, 92, 150]) {
      // Straight at its long side, from the street.
      const nx = -Math.sin(hall.rot);
      const ny = Math.cos(hall.rot);
      const v = newVehicle(
        'car',
        hall.x + nx * (hall.hy + 20),
        hall.y + ny * (hall.hy + 20),
        Math.atan2(-ny, -nx),
      );
      v.vx = -nx * speed;
      v.vy = -ny * speed;
      for (let i = 0; i < 60; i++) {
        stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, MARS_TERRAIN, i / 60);
        expect(v.z).toBeLessThan(2);
      }
    }
  });

  it('runs you through the barrel, riding up its sides off its line', () => {
    const b = BARRELS[0];
    const h = Math.atan2(b.by - b.ay, b.bx - b.ax);
    const L = Math.hypot(b.bx - b.ax, b.by - b.ay);
    const along = (x: number, y: number) =>
      ((x - b.ax) * (b.bx - b.ax) + (y - b.ay) * (b.by - b.ay)) / L;
    for (const off of [0, 4]) {
      const v = newVehicle(
        'car',
        b.ax - Math.cos(h) * 80 - Math.sin(h) * off,
        b.ay - Math.sin(h) * 80 + Math.cos(h) * off,
        h + (off ? 0.05 : 0),
      );
      v.vx = Math.cos(h) * 40;
      v.vy = Math.sin(h) * 40;
      let top = 0;
      for (let i = 0; i < 60 * 6; i++) {
        stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, MARS_TERRAIN, i / 60);
        const u = along(v.x, v.y);
        if (u > 0 && u < L) top = Math.max(top, v.z);
      }
      expect(along(v.x, v.y)).toBeGreaterThan(L);
      if (off) expect(top).toBeGreaterThan(2);
      else expect(top).toBeLessThan(1.5);
    }
  });

  it('gives every mega works a conveyor gallery to jump', () => {
    const galleries = KICKERS.filter((k) => k.gallery && !roofRamps.includes(k));
    expect(galleries.length).toBeGreaterThanOrEqual(4);
    for (const k of galleries) expect(k.height).toBe(20);
  });
});
