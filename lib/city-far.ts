/*
 * The far city (docs/specs/art-city.md, "The far city"): on a computer, one tile of the City's plan
 * built once as a still cloud of points, drawn by the GPU in copies round the eye from where the
 * live grains' view ends out to 2,600, five times a computer's street view. 2026-11-14: "what stops
 * u from increasing field depth of vision 5 times on computer?", then "lets try it. try a light
 * version that doesn't take u too much energy but still looks nice."
 *
 * A light version: each tower is its roof's corners and middles, a few points down its edges and,
 * on the tall ones, a row or two of windows; each landmark and big square a few dozen points
 * outlining its silhouette; the open blocks a glow or two on the ground. All in the districts'
 * colours, dimmed as a night city far away, and still: no flicker. Pure: no three.js, no DOM.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { BIG_SQUARES, bigHeight, studioBlockHeight } from './city-big';
import {
  BAND_ROWS,
  blockTower,
  cityQuality,
  DISTRICTS,
  districtAt,
  LANDMARKS,
  planLook,
  STREET_VIEW_LARGE,
  viewAt,
} from './city-game';
import { BLOCK_Z, C, GROUND, mix, TILE_I, TILE_J, TILE_X, TILE_Z, wrap } from './city-grid';
import { crownKey, crownModel, landmarkHeight } from './city-landmarks';
import { inRoom } from './city-rooms';
import { inSpace } from './city-space';
import { inAtlantis } from './city-speedway';
import type { FarCloud, FarLayer } from './far-layer';

/** Where the far city is gone: five times a computer's street view (520). */
export const FAR_REACH = 5 * STREET_VIEW_LARGE;
/** The towers' sky and the stratosphere, as lib/city.ts has them. */
const SKY = GROUND + 150;
const STRATOSPHERE = GROUND + 520;
/** How bright the far city's lights are: its roofs, its edges near the ground, its windows. */
const ROOF = 0.42;
const EDGE_TOP = 0.3;
const EDGE_FOOT = 0.1;
const WINDOW = 0.26;
const MARK = 0.5;
const GLOW = 0.12;

/** The strips the tile is cut into along z: one to each band of districts. */
const STRIP = BAND_ROWS * BLOCK_Z;
const STRIPS = Math.ceil(TILE_Z / STRIP);

let cloud: FarCloud | null = null;

/** The far city's cloud: built the first time it is asked for, the same object after. */
export function farCity(): FarCloud {
  if (cloud) return cloud;
  const strips: number[][] = Array.from({ length: STRIPS }, () => []);
  // A point, at (x, y, z) anywhere: brought into the tile (the plan repeats, so its copy there is
  // the same place), and filed in its strip with its colour.
  const put = (x: number, y: number, z: number, c: RGB, k: number, salt: number) => {
    const tx = wrap(x + TILE_X / 2, TILE_X) - TILE_X / 2;
    const tz = wrap(z, TILE_Z);
    const s = Math.min(STRIPS - 1, Math.floor(tz / STRIP));
    // A little difference from light to light, fixed: a far city is never even.
    const v = 0.85 + 0.3 * hash(k, salt);
    (strips[s] as number[]).push(tx, y, tz, c[0] * v, c[1] * v, c[2] * v);
  };
  // A silhouette: a column of points to the tip, and rings narrowing as it climbs.
  const outline = (x: number, z: number, h: number, r: number, c: RGB, k: number) => {
    const col = mix(c, C.white, 0.15);
    for (let i = 0; i <= 12; i++) {
      put(x, GROUND + (h * i) / 12, z, col.map((u) => u * MARK) as RGB, k, 900 + i);
    }
    for (let ring = 0; ring < 8; ring++) {
      const f = (ring + 0.5) / 8;
      const rr = r * (1 - 0.85 * f ** 1.2);
      for (let a = 0; a < 6; a++) {
        const th = ((a + 0.5 * (ring % 2)) / 6) * Math.PI * 2;
        const b = MARK * (0.6 + 0.4 * f);
        put(
          x + rr * Math.cos(th),
          GROUND + h * f,
          z + rr * Math.sin(th),
          c.map((u) => u * b) as RGB,
          k,
          920 + ring * 6 + a,
        );
      }
    }
  };
  for (let I = -TILE_I / 2; I < TILE_I / 2; I++) {
    for (let J = 0; J < TILE_J; J++) {
      const tw = blockTower(I, J);
      const c = DISTRICTS[tw.d].colour;
      const k = tw.k;
      if (tw.h <= 0) {
        // An open block: a Studio building's outline, or a glow or two on the ground.
        if (tw.studio) {
          outline(tw.x, tw.z, studioBlockHeight(tw.studio), 9, c, k);
        } else {
          for (let g = 0; g < 2; g++) {
            const gx = tw.x + (hash(k, 860 + g) - 0.5) * tw.hx;
            const gz = tw.z + (hash(k, 862 + g) - 0.5) * tw.hz;
            put(gx, GROUND + 0.5, gz, c.map((u) => u * GLOW) as RGB, k, 864 + g);
          }
        }
        continue;
      }
      const top = GROUND + tw.h;
      const corners: [number, number][] = [
        [-tw.hx, -tw.hz],
        [tw.hx, -tw.hz],
        [tw.hx, tw.hz],
        [-tw.hx, tw.hz],
      ];
      if (tw.shape === 'pyramid') {
        // A pyramid: its apex, and its four edges down to the corners.
        put(tw.x, top, tw.z, c.map((u) => u * MARK) as RGB, k, 800);
        corners.forEach(([cx, cz], e) => {
          for (let i = 1; i <= 5; i++) {
            const f = i / 5;
            const b = EDGE_TOP + (EDGE_FOOT - EDGE_TOP) * f;
            put(
              tw.x + cx * f,
              top - tw.h * f,
              tw.z + cz * f,
              c.map((u) => u * b) as RGB,
              k,
              801 + e * 5 + i,
            );
          }
        });
        continue;
      }
      // The roof: its corners and the middles of its sides, brightest.
      const roof = mix(c, C.white, 0.1).map((u) => u * ROOF) as RGB;
      corners.forEach(([cx, cz], e) => {
        put(tw.x + cx, top, tw.z + cz, roof, k, 810 + e);
        const [nx, nz] = corners[(e + 1) % 4] as [number, number];
        put(tw.x + (cx + nx) / 2, top, tw.z + (cz + nz) / 2, roof, k, 814 + e);
      });
      // Down its edges, dimming toward the street.
      const n = Math.max(3, Math.min(16, Math.round(tw.h / 6)));
      corners.forEach(([cx, cz], e) => {
        for (let i = 1; i <= n; i++) {
          const f = i / n;
          const b = EDGE_TOP + (EDGE_FOOT - EDGE_TOP) * f;
          put(
            tw.x + cx,
            top - tw.h * f,
            tw.z + cz,
            c.map((u) => u * b) as RGB,
            k,
            820 + e * 16 + i,
          );
        }
      });
      // A tall tower's rows of windows, warmer: two on a tower over 40, three over 80.
      const rows = tw.h >= 80 ? 3 : tw.h >= 40 ? 2 : 0;
      const win = mix(c, C.warm, 0.35).map((u) => u * WINDOW) as RGB;
      for (let r = 0; r < rows; r++) {
        const y = GROUND + tw.h * (0.3 + (0.55 * r) / Math.max(1, rows - 1));
        corners.forEach(([cx, cz], e) => {
          const [nx, nz] = corners[(e + 1) % 4] as [number, number];
          for (const f of [1 / 3, 2 / 3]) {
            put(
              tw.x + cx + (nx - cx) * f,
              y,
              tw.z + cz + (nz - cz) * f,
              win,
              k,
              890 + r * 8 + e * 2 + (f < 0.5 ? 0 : 1),
            );
          }
        });
      }
    }
  }
  // The landmarks, each seen over the towers by its silhouette.
  LANDMARKS.forEach((l, i) => {
    if (l.kind === 'race') return;
    const key = crownKey(l.kind, l.set);
    const h = l.kind === 'spire' ? landmarkHeight('spire') : key ? landmarkHeight(key) : 60;
    const r = key ? Math.max(6, crownModel(key).r) : 8;
    outline(l.x, l.z, h, r, DISTRICTS[l.d].colour, 7000 + i);
  });
  // The big squares' temples, domes and Nova Cores.
  BIG_SQUARES.forEach((q, i) => {
    const r = q.kind === 'nova' ? 9 : 18;
    outline(q.x, q.z, bigHeight(q), r, DISTRICTS[districtAt(q.x, q.z)].colour, 7100 + i);
  });
  const total = strips.reduce((s, a) => s + a.length / 6, 0);
  const positions = new Float32Array(total * 3);
  const colours = new Float32Array(total * 3);
  const cuts: number[] = [];
  let p = 0;
  for (const a of strips) {
    cuts.push(p);
    for (let i = 0; i < a.length; i += 6, p++) {
      positions[p * 3] = a[i] as number;
      positions[p * 3 + 1] = a[i + 1] as number;
      positions[p * 3 + 2] = a[i + 2] as number;
      colours[p * 3] = a[i + 3] as number;
      colours[p * 3 + 1] = a[i + 4] as number;
      colours[p * 3 + 2] = a[i + 5] as number;
    }
  }
  const spans = Array.from({ length: STRIPS }, (_, s): [number, number] => [
    s * STRIP,
    Math.min(TILE_Z, (s + 1) * STRIP),
  ]);
  cloud = { positions, colours, tile: [TILE_X, TILE_Z], cuts, spans };
  return cloud;
}

/**
 * How much of the far city shows from an eye: only on a computer, never in a room or in space;
 * half of it once the plan from above has taken over (its own far edge, viewAt, already far out),
 * and none by the stratosphere.
 */
export function farShown(eye: Vec3): number {
  if (cityQuality() !== 'large' || inRoom() || inSpace() || inAtlantis()) return 0;
  const high = smooth((eye[1] - SKY) / (STRATOSPHERE - SKY));
  return (1 - 0.5 * planLook(eye[1])) * (1 - high);
}

/** The far city, as the trip player takes it. */
export const CITY_FAR: FarLayer = {
  build: farCity,
  near: (eye) => viewAt(eye[1]),
  far: (eye) => Math.max(FAR_REACH, 2 * viewAt(eye[1])),
  shown: farShown,
};
