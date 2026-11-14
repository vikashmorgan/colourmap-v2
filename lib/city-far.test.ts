import { afterEach, describe, expect, it } from 'vitest';
import { CITY_FAR, FAR_REACH, farCity, farShown } from './city-far';
import { DISTRICTS, STREET_VIEW_LARGE, setCityQuality } from './city-game';
import { C, GROUND, mix, TILE_X, TILE_Z } from './city-grid';
import { type FarCopy, farFade, tileCopies } from './far-layer';

afterEach(() => setCityQuality('small'));

describe('the far city (2026-11-14: "lets try it. try a light version")', () => {
  it('is built once: the same cloud on a second call', () => {
    expect(farCity()).toBe(farCity());
    expect(CITY_FAR.build()).toBe(farCity());
  });

  it('holds 20,000 to 40,000 points, light on memory', () => {
    const { positions, colours, cuts, spans } = farCity();
    const n = positions.length / 3;
    expect(n).toBeGreaterThanOrEqual(20000);
    expect(n).toBeLessThanOrEqual(40000);
    // Six floats a point (24 bytes), three for its place and three for its colour: under 1 MB.
    expect(positions.byteLength + colours.byteLength).toBeLessThan(1 << 20);
    expect(colours.length).toBe(positions.length);
    expect(cuts.length).toBe(spans.length);
    expect(cuts[0]).toBe(0);
  });

  it('keeps every point inside one tile, and each strip inside its own span', () => {
    const { positions, tile, cuts, spans } = farCity();
    expect(tile).toEqual([TILE_X, TILE_Z]);
    const n = positions.length / 3;
    let outside = 0;
    for (let s = 0; s < cuts.length; s++) {
      const [z0, z1] = spans[s] as [number, number];
      const end = cuts[s + 1] ?? n;
      for (let i = cuts[s] as number; i < end; i++) {
        const x = positions[i * 3] as number;
        const y = positions[i * 3 + 1] as number;
        const z = positions[i * 3 + 2] as number;
        const inTile = x >= -TILE_X / 2 && x < TILE_X / 2 && z >= 0 && z < TILE_Z;
        if (!inTile || z < z0 || z > z1 || y < GROUND) outside++;
      }
    }
    expect(outside).toBe(0);
  });

  it('lights them in the districts’ colours, dimmed, as a night city far away', () => {
    const { colours } = farCity();
    // Each district's colour, and the whites and warm windows mixed into it.
    const families = Object.values(DISTRICTS).flatMap((d) => [
      d.colour,
      mix(d.colour, C.white, 0.1),
      mix(d.colour, C.white, 0.15),
      mix(d.colour, C.warm, 0.35),
    ]);
    const n = colours.length / 3;
    for (let i = 0; i < n; i += 37) {
      const c = [colours[i * 3], colours[i * 3 + 1], colours[i * 3 + 2]] as number[];
      const top = Math.max(...c);
      expect(top).toBeGreaterThan(0);
      // Dim: never brighter than a landmark's light, varied up to 1.15.
      expect(top).toBeLessThanOrEqual(0.5 * 1.15 + 1e-6);
      const shape = c.map((u) => u / top);
      const near = families.some((f) => {
        const m = Math.max(...f);
        return f.every((u, j) => Math.abs(u / m - (shape[j] as number)) < 0.02);
      });
      expect(near).toBe(true);
    }
  });

  it('is off on a phone, and shows on a computer in the street', () => {
    const street: [number, number, number] = [0, GROUND + 10, 100];
    setCityQuality('small');
    expect(farShown(street)).toBe(0);
    setCityQuality('large');
    expect(farShown(street)).toBe(1);
    // Half once the plan from above has taken over, none by the stratosphere.
    expect(farShown([0, GROUND + 200, 100])).toBeLessThan(1);
    expect(farShown([0, GROUND + 600, 100])).toBe(0);
  });

  it('reaches five times a computer’s street view', () => {
    setCityQuality('large');
    expect(FAR_REACH).toBe(5 * STREET_VIEW_LARGE);
    const eye: [number, number, number] = [0, GROUND + 10, 100];
    expect(CITY_FAR.near(eye)).toBe(STREET_VIEW_LARGE);
    expect(CITY_FAR.far(eye)).toBe(2600);
  });
});

describe('the far fade', () => {
  const near = 520;
  const far = 2600;
  it('is nothing inside the near view, rises after it, and is gone beyond the far edge', () => {
    expect(farFade(0, near, far)).toBe(0);
    expect(farFade(near * 0.8, near, far)).toBe(0);
    expect(farFade(near * 0.9, near, far)).toBeGreaterThan(0);
    expect(farFade(near * 0.9, near, far)).toBeLessThan(farFade(near, near, far));
    expect(farFade(near, near, far)).toBeCloseTo(1);
    expect(farFade(far, near, far)).toBe(0);
    expect(farFade(far + 100, near, far)).toBe(0);
  });
  it('dims with distance', () => {
    expect(farFade(1500, near, far)).toBeLessThan(farFade(800, near, far));
    expect(farFade(1500, near, far)).toBeGreaterThan(0);
  });
});

describe('the tile copies round the eye', () => {
  it('covers the reach, leaves out what is wholly inside the near view', () => {
    const { tile, spans } = farCity();
    const out: FarCopy[] = [];
    const eye: [number, number, number] = [40, GROUND + 10, 900];
    const n = tileCopies(eye, 520, 2600, tile, spans, out);
    expect(n).toBeGreaterThan(0);
    // Every point of the plane out to the reach (and past the near view) is in some copy.
    for (let a = 0; a < 24; a++) {
      for (const d of [500, 1200, 2500]) {
        const px = eye[0] + d * Math.cos((a / 24) * Math.PI * 2);
        const pz = eye[2] + d * Math.sin((a / 24) * Math.PI * 2);
        const hit = out.slice(0, n).some((c) => {
          const [z0, z1] = spans[c.chunk] as [number, number];
          return (
            px >= c.ox - tile[0] / 2 &&
            px <= c.ox + tile[0] / 2 &&
            pz >= z0 + c.oz &&
            pz <= z1 + c.oz
          );
        });
        expect(hit).toBe(true);
      }
    }
    // None wholly inside 0.8 of the near view: the strip under the eye's tile copy is left out.
    for (const c of out.slice(0, n)) {
      const [z0, z1] = spans[c.chunk] as [number, number];
      const fx = Math.max(
        Math.abs(c.ox - tile[0] / 2 - eye[0]),
        Math.abs(c.ox + tile[0] / 2 - eye[0]),
      );
      const fz = Math.max(Math.abs(z0 + c.oz - eye[2]), Math.abs(z1 + c.oz - eye[2]));
      expect(Math.hypot(fx, fz)).toBeGreaterThanOrEqual(520 * 0.8);
    }
    // The same objects reused on a second call.
    const first = out[0];
    tileCopies(eye, 520, 2600, tile, spans, out);
    expect(out[0]).toBe(first);
  });
});
