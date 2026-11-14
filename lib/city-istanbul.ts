/*
 * The Oriental quarter in an Istanbul spirit (docs/specs/art-city.md, "Alive quarters",
 * 2026-11-14): "add higher buildings and make them unique in an Istanbul style: domes stacked on
 * towers, minaret-like spires, turquoise and gold. Original designs, not replicas. Add one big
 * skyscraper as the quarter's centrepiece, much taller than the rest: an original tower with a
 * dome crown and slender minaret-like needles, lit softly."
 *
 * The quarter's towers stand taller (lib/city-alive.ts RISE), and each plain one wears a crown of
 * our own: a drum and a dome on its roof, now and then a smaller dome stacked over it, and two or
 * four slender needles at its corners with a balcony ring and a pointed cap. The Turquoise Crown,
 * the centrepiece, stands on a block of its own at the quarter's entrance: an octagonal shaft in
 * five tiers, a balcony ring at each, a drum and a great dome at its head with a gold finial, and
 * four needles rising beside it. Turquoise and gold, a slow drift; light only (the Ship flies
 * through the crowns and the Crown). Pure: no three.js, no DOM.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import type { Ahead, AliveBlock, TowerAt } from './city-alive-base';
import {
  BLOCK_X,
  BLOCK_Z,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  TAU,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
  wrap,
} from './city-grid';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';

const G = GROUND;

/** The centrepiece: its block (tile-local), its top over the street, its reach from its axis. */
export const TURQUOISE_CROWN = { name: 'Turquoise Crown', I: 3, J: 8, top: 176, r: 10 };
/** How far over its roof a tower's crown reaches. */
export const CROWN_RISE = 15;

/** Whether block (I, J) is the Turquoise Crown's, kept open for it. */
export function crownBlock(I: number, J: number): boolean {
  return (
    wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2 === TURQUOISE_CROWN.I &&
    wrap(J, TILE_J) === TURQUOISE_CROWN.J
  );
}

/** A dome of radius r on a drum's top at (x, y, z): meridians drawn from rim to crown. */
function dome(S: Strokes, x: number, y: number, z: number, r: number, tone: number, k: number) {
  for (let m = 0; m < 8; m++) {
    const a = (m / 8) * TAU;
    S.curve(
      (u) => {
        const th = (u * Math.PI) / 2;
        // A little pointed at the top: not a half ball.
        const rr = r * Math.cos(th);
        return [x + Math.cos(a) * rr, y + r * 1.15 * Math.sin(th) ** 0.85, z + Math.sin(a) * rr];
      },
      8,
      tone,
      k,
    );
  }
  S.curve((u) => [x + Math.cos(u * TAU) * r, y, z + Math.sin(u * TAU) * r], 24, 1, k * 1.1);
}
/** A drum: two octagons and their posts. */
function drum(
  S: Strokes,
  x: number,
  y0: number,
  y1: number,
  z: number,
  r: number,
  tone: number,
  k: number,
) {
  const oct =
    (y: number) =>
    (u: number): Vec3 => [x + Math.cos(u * TAU) * r, y, z + Math.sin(u * TAU) * r];
  S.curve(oct(y0), 8, tone, k);
  S.curve(oct(y1), 8, tone, k);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    S.line(
      [x + Math.cos(a) * r, y0, z + Math.sin(a) * r],
      [x + Math.cos(a) * r, y1, z + Math.sin(a) * r],
      2,
      k * 0.6,
    );
  }
}
/** A needle: a slender shaft with a balcony ring and a pointed cap. */
function needle(S: Strokes, x: number, y0: number, y1: number, z: number, r: number) {
  for (const [dx, dz] of [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ] as const)
    S.line([x + dx, y0, z + dz], [x + dx * 0.8, y1, z + dz * 0.8], 0, 0.22);
  const ring = y0 + (y1 - y0) * 0.72;
  S.curve(
    (u) => [x + Math.cos(u * TAU) * r * 2.2, ring, z + Math.sin(u * TAU) * r * 2.2],
    12,
    1,
    0.3,
  );
  for (const [dx, dz] of [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ] as const)
    S.line([x + dx * 0.8, y1, z + dz * 0.8], [x, y1 + r * 6, z], 1, 0.34);
}

const crowns = new Map<number, StrokeSet>();
/** A plain Oriental tower's crown, built once: its dome or two, its needles. */
export function towerCrown(tw: AliveBlock): StrokeSet {
  const id = tw.I * 65536 + tw.J;
  const had = crowns.get(id);
  if (had) return had;
  const S = new Strokes(0.6);
  const roof = G + tw.h;
  const r = Math.min(tw.hx, tw.hz) * 0.62;
  drum(S, tw.x, roof, roof + 2, tw.z, r, 0, 0.24);
  dome(S, tw.x, roof + 2, tw.z, r, 0, 0.26);
  let top = roof + 2 + r * 1.15;
  if (hash(tw.k, 991) < 0.5) {
    // A smaller dome stacked over the first, on its own drum.
    drum(S, tw.x, top, top + 1.6, tw.z, r * 0.45, 0, 0.24);
    dome(S, tw.x, top + 1.6, tw.z, r * 0.45, 1, 0.3);
    top += 1.6 + r * 0.45 * 1.15;
  }
  S.line([tw.x, top, tw.z], [tw.x, top + 1.4, tw.z], 1, 0.5);
  const four = hash(tw.k, 992) < 0.4;
  const corners: [number, number][] = four
    ? [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]
    : hash(tw.k, 993) < 0.5
      ? [
          [1, 1],
          [-1, -1],
        ]
      : [
          [-1, 1],
          [1, -1],
        ];
  const nh = Math.min(CROWN_RISE - 2, 6 + 6 * hash(tw.k, 994));
  for (const [sx, sz] of corners)
    needle(S, tw.x + sx * (tw.hx - 0.8), roof, roof + nh, tw.z + sz * (tw.hz - 0.8), 0.28);
  const built = S.build();
  if (crowns.size > 6000) crowns.clear();
  crowns.set(id, built);
  return built;
}

let crownSet: StrokeSet | null = null;
/** The Turquoise Crown, built once round (0, 0). */
export function turquoiseCrownSet(): StrokeSet {
  if (crownSet) return crownSet;
  const S = new Strokes(1);
  const T = TURQUOISE_CROWN;
  const tiers = 5;
  const shaftTop = 132;
  let y = 0;
  for (let i = 0; i < tiers; i++) {
    const r0 = T.r * (1 - i * 0.11);
    const r1 = T.r * (1 - (i + 1) * 0.11);
    const y1 = (shaftTop * (i + 1)) / tiers;
    for (let c = 0; c < 8; c++) {
      const a = (c / 8) * TAU + Math.PI / 8;
      S.line(
        [Math.cos(a) * r0, G + y, Math.sin(a) * r0],
        [Math.cos(a) * r1, G + y1, Math.sin(a) * r1],
        0,
        0.3,
      );
    }
    // A balcony ring at the tier's head, standing out a little, and its small arches.
    S.curve(
      (u) => [Math.cos(u * TAU) * (r1 + 1.2), G + y1, Math.sin(u * TAU) * (r1 + 1.2)],
      32,
      1,
      0.34,
    );
    for (let c = 0; c < 8; c++) {
      const a0 = (c / 8) * TAU + Math.PI / 8;
      const a1 = ((c + 1) / 8) * TAU + Math.PI / 8;
      S.curve(
        (u) => {
          const a = a0 + (a1 - a0) * u;
          return [Math.cos(a) * r1, G + y1 - 3 + 2 * Math.sin(Math.PI * u), Math.sin(a) * r1];
        },
        6,
        2,
        0.16,
      );
    }
    y = y1;
  }
  const rTop = T.r * (1 - tiers * 0.11);
  drum(S, 0, G + shaftTop, G + shaftTop + 6, 0, rTop + 1, 0, 0.32);
  const domeR = rTop + 3;
  dome(S, 0, G + shaftTop + 6, 0, domeR, 0, 0.36);
  const domeTop = shaftTop + 6 + domeR * 1.15;
  S.line([0, G + domeTop, 0], [0, G + T.top, 0], 1, 0.6);
  S.curve((u) => [Math.cos(u * TAU) * 0.8, G + T.top - 4, Math.sin(u * TAU) * 0.8], 8, 1, 0.5);
  // Four needles beside the shaft, from its third tier to near the dome's height.
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * TAU + Math.PI / 4;
    const d = T.r + 2.5;
    needle(
      S,
      Math.cos(a) * d,
      G + (shaftTop * 2) / tiers,
      G + shaftTop + 14,
      Math.sin(a) * d,
      0.45,
    );
  }
  crownSet = S.build();
  return crownSet;
}

/** Turquoise and gold, leaning slowly: the quarter's three tones now. */
function tones(t: number, key: number): RGB[] {
  const lean = 0.5 + 0.5 * Math.sin(0.05 * t + key * 0.3);
  return [
    mix(C.turquoise, mix(C.turquoise, C.white, 0.3), lean),
    mix(C.gold, C.amber, lean * 0.4),
    mix(C.ivory, C.turquoise, 0.2),
  ];
}

/** The crowns on the Oriental quarter's towers near the eye, and the Turquoise Crown within sight. */
export function istanbulItems(
  eye: Vec3,
  t: number,
  near: number,
  far: number,
  towerAt: TowerAt,
  ahead: Ahead,
  out: Item[],
) {
  const ox0 = nearest(0, eye[0], TILE_X);
  const T = TURQUOISE_CROWN;
  const cz0 = (T.J + 0.5) * BLOCK_Z;
  for (const ox of [ox0 - TILE_X, ox0, ox0 + TILE_X]) {
    const x = ox + (T.I + 0.5) * BLOCK_X;
    const z = nearest(cz0, eye[2], TILE_Z);
    if (Math.hypot(x - eye[0], z - eye[2]) > far + T.r) continue;
    if (!ahead(x, z, T.r + 20) && eye[1] < G + 80) continue;
    const it = strokeItem(
      turquoiseCrownSet(),
      x,
      z,
      tones(t, 1),
      1,
      eye,
      t,
      mixId(Math.round(x), Math.round(z)),
      1.8,
      0.15,
    );
    if (it.d < far) out.push(it);
  }
  const I0 = Math.floor((eye[0] - near) / BLOCK_X);
  const I1 = Math.floor((eye[0] + near) / BLOCK_X);
  const J0 = Math.floor((eye[2] - near) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + near) / BLOCK_Z);
  for (let I = I0; I <= I1; I++)
    for (let J = J0; J <= J1; J++) {
      const tw = towerAt(I, J);
      if (tw.d !== 'oriental' || tw.shape !== 'box' || tw.h < 30 || !ahead(tw.x, tw.z, 20))
        continue;
      const it = strokeItem(
        towerCrown(tw),
        0,
        0,
        tones(t, tw.k),
        1,
        eye,
        t,
        mixId(tw.k, 9911),
        1.6,
        0.15,
      );
      if (it.d < near) out.push(it);
    }
}
