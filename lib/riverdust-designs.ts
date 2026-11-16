/*
 * RIVERDUST, the designs (docs/specs/riverdust.md): a desert town in seven categories, each a row
 * of named original designs, the way the City of Dreams has its Studio pieces and pills. Flags
 * and lamps, tents and camps, the market, buildings, cavern and rock, water and the river, and
 * the race gate for the start and finish of the desert racing worlds.
 *
 * 2026-11-16: "Create series of desert town elements like you did for night city and call it
 * RIVERDUST, with design elements and up/down to go to variations." Then: "cool arches and
 * gradins for the racetrack installation around the main gate at start and finish."
 *
 * Every design is a list of Parts (lib/city-shapes.ts) round its own origin, ground at y 0, its
 * scene running away from the eye along -z (perspective first: rows receding, corridors to fly
 * down). The builders here (a house, a stall, a lamp arch, a gate, a grandstand ...) are exported
 * so the racing worlds can set them anywhere; `designGrains` draws a whole design at a place and
 * scale. Pure: no three.js, no DOM.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { lerp, mix, TAU } from './city-grid';
import type { Part } from './city-shapes';
import {
  arch,
  BANNER,
  ball,
  banner,
  boat,
  box,
  canyonWall,
  cliff,
  cone,
  dim,
  dome,
  doorway,
  fireBowl,
  flagString,
  ladder,
  lantern,
  lanternString,
  P,
  palm,
  place,
  plaster,
  pole,
  RD,
  ridgeTent,
  ring,
  rock,
  rockArch,
  sag,
  scatter,
  seg,
  sheet,
  tiers,
  water,
  windows,
  wobble,
} from './riverdust-kit';

/** Where the eye stands and looks for a design, and how far it glides forward and back. */
export type View = { eye: Vec3; target: Vec3; glide?: number };
export type Design = {
  /** `category/name`, unique across the series. */
  id: string;
  name: string;
  /** One line: what it is. */
  idea: string;
  make: () => Part[];
  view: View;
};
export type Category = {
  id: string;
  name: string;
  /** What one design of it is called (the pills' label). */
  label: string;
  line: string;
  designs: Design[];
};

/** The most light sites a design may have: within the trip player's grains with the dust to spare. */
export const DESIGN_BUDGET = 5000;

const LAMPS: RGB[] = [RD.lamp, RD.saffron, RD.gold, RD.burnt];
const lampOf = (i: number) => LAMPS[i % LAMPS.length] as RGB;
const pick = <T>(xs: T[], i: number) => xs[((i % xs.length) + xs.length) % xs.length] as T;

/* ---------- builders, reusable anywhere ---------- */

/** Two thin lines on the ground along z at ±hw, from z0 to z1: a road's edges, to the vanishing point. */
export const roadEdges = (
  hw: number,
  z0: number,
  z1: number,
  n: number,
  rgb = dim(RD.sand, 0.35),
) => [
  seg([-hw, 0.02, z0], [-hw, 0.02, z1], n / 2, rgb),
  seg([hw, 0.02, z0], [hw, 0.02, z1], n / 2, rgb),
];

/** An adobe house round (x, z): plastered walls, edges, a parapet, warm windows and a lit door. */
export function house(
  x: number,
  z: number,
  hx: number,
  hy: number,
  hz: number,
  seed = 0,
  ladderOn = false,
) {
  const c: Vec3 = [x, hy, z];
  const tone = mix(RD.ochre, RD.terracotta, hash(seed, 1));
  const ps: Part[] = [
    plaster(c, hx, hy, hz, 26 * hx * hy * 0.25 + 30, dim(tone, 0.42)),
    box(c, hx, hy, hz, 60 + 6 * (hx + hy + hz), dim(tone, 0.62)),
    // The parapet: a low rim round the flat roof.
    box([x, hy * 2 + 0.3, z], hx, 0.3, hz, 30, dim(RD.sand, 0.5)),
    windows(
      c,
      hx,
      hy,
      hz,
      Math.max(1, Math.round(hy / 1.8)),
      Math.max(1, Math.round(hx / 1.6)),
      3,
      RD.lamp,
      seed,
    ),
  ];
  // The door, toward the street: on the side facing x = 0.
  const side = x > 0 ? -1 : 1;
  ps.push(
    ...place(
      [doorway(0, 0, 1.1, 2.1, 14)],
      [x + side * (hx + 0.05), 0, z],
      side > 0 ? Math.PI / 2 : -Math.PI / 2,
    ),
  );
  if (ladderOn)
    ps.push(
      ladder(
        [x + side * (hx + 0.4), 0, z + hz * 0.5],
        [x + side * (hx + 0.1), hy * 2 + 1.2, z + hz * 0.5],
        6,
        26,
      ),
    );
  return ps;
}

/** A market stall at (x, z), its front toward x = 0: a frame, a counter, crates and a little lamp. */
export function stall(x: number, z: number, seed = 0) {
  const side = x > 0 ? -1 : 1;
  const ps: Part[] = [
    box([x, 1.4, z], 1.8, 1.4, 1.9, 44, dim(RD.wood, 0.6)),
    box([x + side * 1.5, 0.55, z], 0.35, 0.55, 1.8, 20, dim(RD.wood, 0.75)),
    // Wares on the counter: a heap of colour.
    scatter(
      [x + side * 1.5, 1.15, z],
      0.3,
      1.6,
      22,
      dim(pick([RD.saffron, RD.burnt, RD.burgundy, RD.ochre], seed), 0.8),
    ),
    box([x - side * 0.6, 0.35, z + 1.2], 0.4, 0.35, 0.4, 14, dim(RD.wood, 0.6)),
    lantern([x + side * 1.4, 2.4, z], 0.2, 8, lampOf(seed)),
  ];
  return ps;
}

/** An arch of lamps across the road at depth z, w wide, with lanterns hung from it on threads. */
export function lampArch(z: number, w = 12, leg = 3, rise = 5, seed = 0) {
  const ps: Part[] = [
    arch(0, z, w, leg, rise, 46, lampOf(seed), 0.15),
    arch(0, z, w + 0.6, leg, rise + 0.3, 26, dim(RD.wood, 0.55)),
  ];
  for (const k of [-0.5, 0, 0.5]) {
    const x = k * w * 0.6;
    const top = leg + rise * Math.sqrt(Math.max(0, 1 - (x / (w / 2)) ** 2));
    ps.push(
      seg([x, top, z], [x, top - 1.2, z], 4, dim(RD.sand, 0.35)),
      lantern([x, top - 1.6, z], 0.3, 10, lampOf(seed + 1)),
    );
  }
  return ps;
}

/** `count` lamp arches from z0 away along -z, `step` apart: a tunnel of light to drive through. */
export function lampTunnel(z0: number, count: number, step: number, w = 12, leg = 3, rise = 5) {
  const ps: Part[] = [];
  for (let i = 0; i < count; i++) ps.push(...lampArch(z0 - i * step, w, leg, rise, i));
  return ps;
}

/** A row of tall poles along z at x, banners flying from each (dusty orange and ochre cloth). */
export function bannerRow(
  x: number,
  z0: number,
  count: number,
  step: number,
  h = 13,
  dir = 1,
  salt = 0,
) {
  const ps: Part[] = [];
  for (let i = 0; i < count; i++) {
    const z = z0 - i * step;
    ps.push(pole(x, z, h, 22, dim(RD.gold, 0.5)), ball([x, h + 0.25, z], 0.18, 5, RD.lamp, 1, 0.1));
    ps.push(banner(x, z, h - 0.3, 3, 1.8, 56, pick(BANNER, i + salt), dir, i + salt));
  }
  return ps;
}

/** A crook lamp post at (x, z) leaning over toward x = 0, its lantern hanging from the arm. */
export function lampPost(x: number, z: number, h = 5.5, seed = 0) {
  const side = x > 0 ? -1 : 1;
  const tip: Vec3 = [x + side * 1.2, h, z];
  return [
    pole(x, z, h, 16, dim(RD.stone, 0.55)),
    sag([x, h, z], tip, -0.4, 8, dim(RD.stone, 0.55)),
    seg(tip, [tip[0], h - 0.5, z], 3, dim(RD.sand, 0.35)),
    lantern([tip[0], h - 0.9, z], 0.32, 12, lampOf(seed)),
  ];
}

/** A canopy on four poles at (x, z): a square of cloth sagging over a lamp. */
export function canopy(x: number, z: number, hw: number, h: number, rgb: RGB, seed = 0) {
  const a: Vec3 = [x - hw, h, z - hw];
  const b: Vec3 = [x + hw, h, z - hw];
  const c: Vec3 = [x + hw, h, z + hw];
  const d: Vec3 = [x - hw, h, z + hw];
  return [
    sheet(a, b, c, d, 0.5, 90, dim(rgb, 0.7), 6, 0.12, seed),
    ...[a, b, c, d].map((q) => pole(q[0], q[2], h, 10)),
    lantern([x, h - 1.1, z], 0.28, 10, lampOf(seed)),
  ];
}

/** A round yurt at c: a lattice wall, a low domed roof, a lit door toward +z. */
export function yurt(c: Vec3, r: number, seed = 0) {
  return [
    P(
      70,
      (u) => {
        const k = Math.floor(u * 4);
        const a = (u * 4 - k) * TAU;
        return [c[0] + Math.cos(a) * r, c[1] + (k / 3) * 1.8, c[2] + Math.sin(a) * r];
      },
      dim(pick([RD.sand, RD.rose, RD.ochre], seed), 0.55),
    ),
    dome([c[0], c[1] + 1.8, c[2]], r, 70, dim(RD.sand, 0.5), 0.45),
    ball([c[0], c[1] + 1.8 + r * 0.45, c[2]], 0.25, 6, RD.lamp, 1, 0.1),
    doorway(c[0], c[2] + r + 0.05, 0.9, 1.7, 12),
  ];
}

/** A hoodoo at (x, z): a column of rocks narrowing as it climbs, a wide cap stone on top. */
export function hoodoo(x: number, z: number, h: number, seed = 0) {
  const ps: Part[] = [];
  const k = 4;
  for (let i = 0; i < k; i++) {
    const r = 1.6 * (1 - i * 0.16) * (0.85 + 0.3 * hash(seed + i, 2));
    ps.push(
      rock(
        [x, (i + 0.5) * (h / k), z],
        r,
        h / k / 1.6,
        r,
        60,
        dim(mix(RD.terracotta, RD.ochre, i / k), 0.55),
        seed + i,
      ),
    );
  }
  ps.push(rock([x, h + 0.4, z], 2.1, 0.6, 2.1, 50, dim(RD.stone, 0.6), seed + 9));
  return ps;
}

/** A monumental adobe gate across the road at depth z: two pylons, a lintel, banners, lamps, flags. */
export function sunGate(z = 0, w = 20, h = 16) {
  const hw = w / 2;
  const ps: Part[] = [];
  for (const s of [-1, 1]) {
    const x = s * (hw + 2);
    ps.push(
      plaster([x, h / 2, z], 2.4, h / 2, 2.4, 260, dim(RD.ochre, 0.45)),
      box([x, h / 2, z], 2.4, h / 2, 2.4, 110, dim(RD.ochre, 0.65)),
      // Flags flying from the top of each pylon.
      pole(x, z, h + 6, 18, dim(RD.gold, 0.5)),
      banner(x, z, h + 5.7, 4, 2, 70, RD.burnt, 1, s),
      // A fire bowl at each pylon's foot.
      ...fireBowl(x - s * 3.4, z + 3, 1.4, 0.7, 50),
    );
  }
  // The lintel across, its lamps hung beneath, and long banners down from it.
  ps.push(
    plaster([0, h + 1.5, z], hw + 4.4, 1.5, 2.6, 260, dim(RD.terracotta, 0.45)),
    box([0, h + 1.5, z], hw + 4.4, 1.5, 2.6, 110, dim(RD.gold, 0.6)),
    ...lanternString([-hw, h, z + 2.8], [hw, h, z + 2.8], 2.4, 11, 0.38, 12, RD.lamp, 0.4),
  );
  for (const x of [-hw * 0.7, -hw * 0.35, hw * 0.35, hw * 0.7]) {
    ps.push(
      sheet(
        [x - 0.9, h, z + 2.7],
        [x + 0.9, h, z + 2.7],
        [x + 0.9, h - 6, z + 2.9],
        [x - 0.9, h - 6, z + 2.9],
        0.15,
        60,
        dim(RD.burgundy, 0.75),
        5,
        0.12,
        x,
      ),
    );
  }
  // The start and finish line: a row of lamps set in the ground under the gate.
  ps.push(P(60, (u) => [lerp(-hw, hw, u), 0.05, z], RD.lamp, 0.12));
  return ps;
}

/**
 * A grandstand along z at x (`face` 1 seeing +x, -1 seeing -x), `len` long: earth-and-timber
 * tiers with spectators as warm dots, a burgundy shade cloth over it on poles, lamps on its rail.
 */
export function grandstand(x: number, z: number, len: number, face = 1, steps = 8, seed = 0) {
  const depth = 1.1;
  const rise = 0.75;
  const back = x - face * steps * depth;
  const top = steps * rise + 4.5;
  const ps: Part[] = [
    ...tiers(x, z, len, steps, depth, rise, 26 * len),
    // The back wall of timber.
    P(
      6 * len,
      (u) => [
        back,
        (u * 7 - Math.floor(u * 7)) * top * 0.55,
        z + (Math.floor(u * 7) / 6 - 0.5) * len,
      ],
      dim(RD.wood, 0.55),
    ),
    sheet(
      [x, top - 1, z - len / 2],
      [back, top, z - len / 2],
      [back, top, z + len / 2],
      [x, top - 1, z + len / 2],
      0.6,
      7 * len,
      dim(RD.burgundy, 0.7),
      7,
      0.1,
      seed,
    ),
    P(len * 1.4, (u) => [x + face * 0.4, 1.2, z + (u - 0.5) * len], RD.lamp, 0.12),
  ];
  for (let k = 0; k <= 4; k++) {
    const zz = z + (k / 4 - 0.5) * len;
    ps.push(pole(x, zz, top - 1, 10), pole(back, zz, top, 10));
  }
  return ps;
}

/** A timing tower at (x, z): a slim tower of windows, a lit band for the times, a flag on top. */
export function timingTower(x: number, z: number, h = 18) {
  return [
    plaster([x, h / 2, z], 1.8, h / 2, 1.8, 160, dim(RD.sand, 0.4)),
    box([x, h / 2, z], 1.8, h / 2, 1.8, 90, dim(RD.ochre, 0.6)),
    windows([x, h / 2 - 2, z], 1.8, h / 2 - 3, 1.8, 6, 2, 3, RD.lamp, 4),
    // The board: three bands of light near the top, the times.
    P(
      90,
      (u) => {
        const k = Math.floor(u * 3);
        return [x + (u * 3 - k - 0.5) * 3.2, h - 1.4 - k * 0.6, z + 1.9];
      },
      RD.saffron,
      0.1,
    ),
    ring([x, h + 0.2, z], 2.6, 30, dim(RD.gold, 0.7)),
    pole(x, z, h + 5, 12, dim(RD.gold, 0.5)),
    banner(x, z, h + 4.7, 3, 1.6, 50, RD.burgundy, 1, 3),
  ];
}

/** A low town wall along x at depth z from x0 to x1, h high, crenellated. */
export function townWall(x0: number, x1: number, z: number, h: number, n: number) {
  const len = Math.abs(x1 - x0);
  const merlons = Math.round(len / 2.4);
  return [
    plaster([(x0 + x1) / 2, h / 2, z], len / 2, h / 2, 1.2, n * 0.6, dim(RD.ochre, 0.4)),
    seg([x0, h, z + 1.2], [x1, h, z + 1.2], n * 0.1, dim(RD.ochre, 0.6)),
    P(
      n * 0.3,
      (u) => {
        const k = Math.floor(u * merlons);
        const v = u * merlons - k;
        const x = lerp(x0, x1, (k + 0.25 + v * 0.5) / merlons);
        return [x, h + (v < 0.15 || v > 0.85 ? (Math.abs(v - 0.5) - 0.35) * 6 : 0.9), z + 1.2];
      },
      dim(RD.sand, 0.55),
    ),
  ];
}

/** A gentle desert of dune ridges far off along -z: a few long soft lines to the horizon. */
export function duneRidges(z: number, n: number) {
  const ps: Part[] = [];
  for (let k = 0; k < 4; k++) {
    ps.push(
      P(
        n / 4,
        (u) => {
          const x = lerp(-140, 140, u);
          return [
            x,
            3 + k * 2.5 + 2 * Math.sin(x * 0.04 + k * 2) + 1.2 * Math.sin(x * 0.11 + k),
            z - k * 30,
          ];
        },
        dim(mix(RD.sand, RD.violet, 0.3 + k * 0.15), 0.4),
      ),
    );
  }
  return ps;
}

/* ---------- 1. flags and lamps ---------- */

function prayerStreet() {
  const ps: Part[] = [];
  for (let i = 0; i < 11; i++) {
    const z = 8 - i * 14;
    for (const s of [-1, 1]) ps.push(pole(s * 7, z, 9, 20));
    ps.push(...flagString([-7, 8.7, z], [7, 8.3, z - 7], 1.4, 15, 0.65));
    ps.push(...flagString([7, 8.7, z - 7], [-7, 8.6, z - 14], 1.3, 15, 0.65));
    ps.push(
      ...house(-11, z - 4, 3, 2.2 + hash(i, 3) * 2, 5, i),
      ...house(11, z - 9, 3, 2 + hash(i, 4) * 2.4, 5, i + 20),
    );
  }
  return [...ps, ...roadEdges(6, 14, -150, 120)];
}

function hallOfBanners() {
  return [
    ...bannerRow(-9, 4, 16, 9, 13, 1, 0),
    ...bannerRow(9, 4, 16, 9, 13, 1, 2),
    // The assembly hall at the end: a long low colonnade under a cornice, its steps lit.
    plaster([0, 6, -160], 34, 6, 5, 420, dim(RD.sand, 0.4)),
    box([0, 6, -160], 34, 6, 5, 160, dim(RD.gold, 0.6)),
    P(
      260,
      (u) => {
        const k = Math.floor(u * 21);
        return [-32 + k * 3.2, (u * 21 - k) * 12, -154.6];
      },
      dim(RD.sand, 0.65),
    ),
    P(
      120,
      (u) => {
        const k = Math.floor(u * 4);
        return [lerp(-30, 30, u * 4 - k), k * 0.35, -153 + k * 0.9];
      },
      RD.lamp,
      0.1,
    ),
    ...roadEdges(4, 12, -150, 140, dim(RD.gold, 0.35)),
  ];
}

function lampionLane() {
  const ps: Part[] = [];
  for (let i = 0; i < 13; i++) {
    const z = 6 - i * 10;
    ps.push(
      ...lanternString([-8, 7 + hash(i, 5), z], [8, 7.4, z - 2], 1.6, 7, 0.36, 10, lampOf(i)),
    );
    ps.push(
      ...house(-11, z, 3, 2.5 + hash(i, 6) * 2.5, 4.6, i),
      ...house(11, z - 4, 3, 2.5 + hash(i, 7) * 2.5, 4.6, i + 9, i % 3 === 0),
    );
  }
  return [...ps, ...roadEdges(5, 14, -130, 110)];
}

function lampTunnelDesign() {
  return [
    ...lampTunnel(4, 24, 5.5),
    ...roadEdges(5.5, 14, -132, 140, dim(RD.gold, 0.35)),
    ...duneRidges(-160, 400),
  ];
}

function fireBowlRoad() {
  const ps: Part[] = [];
  for (let i = 0; i < 14; i++) {
    const z = 6 - i * 11;
    for (const s of [-1, 1]) ps.push(...fireBowl(s * 6.5, z, 1.3, 0.6, 70));
  }
  return [...ps, ...roadEdges(5, 14, -150, 140), ...duneRidges(-170, 700)];
}

function lampPostRow() {
  const ps: Part[] = [];
  const bend = (z: number) => 9 * Math.sin(z * 0.022);
  for (let i = 0; i < 16; i++) {
    const z = 6 - i * 9;
    for (const s of [-1, 1]) ps.push(...lampPost(bend(z) + s * 6, z, 5.5, i));
  }
  ps.push(
    P(
      200,
      (u) => {
        const z = lerp(14, -140, u);
        return [bend(z) - 5, 0.02, z];
      },
      dim(RD.sand, 0.35),
    ),
    P(
      200,
      (u) => {
        const z = lerp(14, -140, u);
        return [bend(z) + 5, 0.02, z];
      },
      dim(RD.sand, 0.35),
    ),
    ...duneRidges(-170, 600),
  );
  return ps;
}

function summitCairn() {
  const ps: Part[] = [
    pole(0, 0, 12, 30, dim(RD.gold, 0.55)),
    rock([0, 0.8, 0], 2.6, 1.6, 2.6, 180, dim(RD.stone, 0.6), 2),
  ];
  const lines = 14;
  for (let k = 0; k < lines; k++) {
    const a = (k / lines) * TAU;
    ps.push(...flagString([0, 11.8, 0], [Math.cos(a) * 22, 0.6, Math.sin(a) * 22], 1.6, 18, 0.7));
    ps.push(
      seg(
        [Math.cos(a) * 22, 0, Math.sin(a) * 22],
        [Math.cos(a) * 22, 0.8, Math.sin(a) * 22],
        3,
        dim(RD.wood),
      ),
    );
  }
  ps.push(ball([0, 12.4, 0], 0.4, 10, RD.lamp, 1, 0.12));
  return ps;
}

/* ---------- 2. tents and camps ---------- */

function nomadCones() {
  const ps: Part[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -1.1 + (i / 8) * 2.2;
    const x = Math.sin(a) * 20;
    const z = -30 - Math.cos(a) * 20;
    const r = 3 + hash(i, 8);
    ps.push(
      ...cone([x, 0, z], r, r * 1.8, 10, 5, 170, dim(pick([RD.sand, RD.rose, RD.ochre], i), 0.6)),
    );
    ps.push(doorway(x, z + r * 0.92, 1, 1.8, 14), ball([x, r * 1.95, z], 0.15, 5, RD.lamp, 1, 0.1));
  }
  ps.push(
    ...fireBowl(0, -26, 0.3, 1.1, 160),
    scatter([0, 0.05, -28], 10, 6, 60, dim(RD.ember, 0.6), 0.15),
  );
  return [...ps, ...duneRidges(-90, 500)];
}

function longTents() {
  const ps: Part[] = [];
  for (let i = 0; i < 6; i++) {
    const s = i % 2 === 0 ? -1 : 1;
    const z = -8 - i * 22;
    const x = s * 10;
    ps.push(
      ...ridgeTent(
        [x, 0, z],
        16,
        7,
        3.2,
        300,
        dim(pick([RD.burgundy, RD.wood, RD.terracotta], i), 0.7),
        1.3,
        4,
      ),
    );
    // Guy ropes out to pegs, and lanterns at the open side facing the track.
    for (const k of [-0.4, 0, 0.4]) {
      ps.push(
        seg([x - s * 3.5, 1.3, z + k * 16], [x - s * 6, 0, z + k * 16], 6, dim(RD.sand, 0.35)),
      );
      ps.push(
        seg([x + s * 3.5, 1.3, z + k * 16], [x + s * 6, 0, z + k * 16], 6, dim(RD.sand, 0.35)),
      );
    }
    ps.push(
      ...lanternString(
        [x - s * 3.5, 1.4, z - 7],
        [x - s * 3.5, 1.4, z + 7],
        0.4,
        5,
        0.25,
        8,
        lampOf(i),
      ),
    );
  }
  return [...ps, ...duneRidges(-160, 500)];
}

function caravanCamp() {
  const ps: Part[] = [];
  const c: Vec3 = [0, 0, -32];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const x = c[0] + Math.cos(a) * 16;
    const z = c[2] + Math.sin(a) * 16;
    ps.push(
      ...place(
        ridgeTent([0, 0, 0], 6, 4.5, 3, 160, dim(pick([RD.sand, RD.ochre, RD.rose], i), 0.6)),
        [x, 0, z],
        -a + Math.PI / 2,
      ),
    );
    ps.push(
      box(
        [c[0] + Math.cos(a + 0.4) * 11, 0.5, c[2] + Math.sin(a + 0.4) * 11],
        0.6,
        0.5,
        0.6,
        18,
        dim(RD.wood, 0.6),
      ),
    );
  }
  ps.push(...fireBowl(c[0], c[2], 0.3, 1.2, 160));
  ps.push(ring([c[0], 0.03, c[2]], 22, 140, dim(RD.sand, 0.3)));
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU;
    const a1 = ((i + 1) / 6) * TAU;
    ps.push(
      ...lanternString(
        [c[0] + Math.cos(a0) * 22, 3, c[2] + Math.sin(a0) * 22],
        [c[0] + Math.cos(a1) * 22, 3, c[2] + Math.sin(a1) * 22],
        0.8,
        5,
        0.25,
        8,
        lampOf(i),
      ),
    );
    ps.push(pole(c[0] + Math.cos(a0) * 22, c[2] + Math.sin(a0) * 22, 3, 8));
  }
  return [...ps, ...duneRidges(-100, 400)];
}

function canopyRow() {
  const ps: Part[] = [];
  for (let i = 0; i < 13; i++) {
    const z = 4 - i * 10;
    ps.push(...canopy(-7, z, 2.6, 3.4, pick([RD.burgundy, RD.ochre, RD.saffron], i), i));
    ps.push(...canopy(7, z - 5, 2.6, 3.4, pick([RD.saffron, RD.burgundy, RD.rose], i), i + 7));
  }
  return [...ps, ...roadEdges(4, 14, -130, 120), ...duneRidges(-150, 400)];
}

function tarpVillage() {
  const ps: Part[] = [];
  for (let i = 0; i < 16; i++) {
    const x = (hash(i, 9) - 0.5) * 50;
    const z = -6 - hash(i, 10) * 80;
    const hw = 2 + hash(i, 11) * 1.5;
    const tilt = 1 + hash(i, 12) * 1.8;
    const h = 2.6 + hash(i, 13);
    const a: Vec3 = [x - hw, h + tilt, z - hw];
    const b: Vec3 = [x + hw, h + tilt, z - hw];
    const c: Vec3 = [x + hw, h - tilt * 0.3, z + hw];
    const d: Vec3 = [x - hw, h - tilt * 0.3, z + hw];
    ps.push(
      sheet(
        a,
        b,
        c,
        d,
        0.3,
        100,
        dim(pick([RD.burgundy, RD.sand, RD.terracotta, RD.ochre], i), 0.65),
        6,
        0.45,
        i,
      ),
    );
    ps.push(
      pole(a[0], a[2], a[1], 8),
      pole(b[0], b[2], b[1], 8),
      seg(c, [c[0] + 1, 0, c[2] + 1.5], 6, dim(RD.sand, 0.35)),
      seg(d, [d[0] - 1, 0, d[2] + 1.5], 6, dim(RD.sand, 0.35)),
    );
    if (i % 2 === 0) ps.push(lantern([x, h - 0.6, z], 0.25, 8, lampOf(i)));
  }
  return [...ps, ...duneRidges(-110, 500)];
}

function duneYurts() {
  const ps: Part[] = [];
  const slope = (z: number) => Math.max(0, -z - 10) * 0.18;
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (5 + hash(i, 14) * 6);
    const z = -12 - i * 9;
    ps.push(...yurt([x, slope(z), z], 3 + hash(i, 15) * 0.8, i));
  }
  // A path of little lamps winding up between them.
  ps.push(
    P(
      120,
      (u) => {
        const z = lerp(4, -85, u);
        return [Math.sin(z * 0.12) * 2.5, slope(z) + 0.1, z];
      },
      RD.lamp,
      0.15,
    ),
  );
  ps.push(
    P(
      600,
      (u) => {
        const k = Math.floor(u * 12);
        const z = -6 - k * 8;
        return [lerp(-40, 40, u * 12 - k), slope(z), z];
      },
      dim(RD.sand, 0.3),
    ),
  );
  return ps;
}

/* ---------- 3. market ---------- */

function burgundySouk() {
  const ps: Part[] = [];
  for (let i = 0; i < 16; i++) {
    const z = 4 - i * 6.5;
    ps.push(...stall(-6, z, i), ...stall(6, z - 3, i + 5));
    ps.push(pole(-4.6, z, 6.4, 12), pole(4.6, z - 3, 6.4, 12));
    // The cloths overhead: a sagging sail between the poles either side, one after another.
    ps.push(
      sheet(
        [-4.6, 6.4, z],
        [4.6, 6.6, z - 3],
        [4.6, 6.6, z - 9.5],
        [-4.6, 6.4, z - 6.5],
        1.3,
        130,
        dim(pick([RD.burgundy, mix(RD.burgundy, RD.rose, 0.4)], i), 0.75),
        7,
        0.15,
        i,
      ),
    );
    ps.push(
      seg([0, 5.6, z - 4.5], [0, 4.6, z - 4.5], 4, dim(RD.sand, 0.3)),
      lantern([0, 4.3, z - 4.5], 0.32, 12, lampOf(i)),
    );
  }
  return [...ps, ...roadEdges(3.6, 12, -104, 80, dim(RD.sand, 0.25))];
}

function rugLane() {
  const ps: Part[] = [];
  const rugs = [RD.burgundy, RD.ochre, RD.rose, RD.saffron, RD.terracotta];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const z = 6 - i * 9;
      ps.push(pole(s * 6, z, 4.5, 12));
      ps.push(sag([s * 6, 4.4, z], [s * 6, 4.4, z - 9], 0.3, 12, dim(RD.sand, 0.35)));
      for (const k of [0.25, 0.7]) {
        const zz = z - 9 * k;
        const rgb = pick(rugs, i * 2 + (k > 0.5 ? 1 : 0) + (s > 0 ? 2 : 0));
        ps.push(
          sheet(
            [s * 6, 4.3, zz + 1.3],
            [s * 6, 4.3, zz - 1.3],
            [s * 6, 1.3, zz - 1.3],
            [s * 6, 1.3, zz + 1.3],
            0.05,
            70,
            dim(rgb, 0.75),
            6,
            0.08,
            i + k,
          ),
        );
        // A lighter border woven in.
        ps.push(
          box([s * 6 - s * 0.05, 2.8, zz], 0.01, 1.2, 1, 24, dim(mix(rgb, RD.gold, 0.5), 0.75)),
        );
      }
    }
    ps.push(
      ...Array.from({ length: 6 }, (_, k) =>
        house(s * 11, 2 - k * 18, 3, 3 + hash(k, s + 5) * 2, 8, k + (s > 0 ? 10 : 0)),
      ).flat(),
    );
  }
  for (let i = 0; i < 6; i++)
    ps.push(...lanternString([-6, 5, -i * 18], [6, 5, -i * 18 - 4], 1, 5, 0.3, 9, lampOf(i)));
  return [...ps, ...roadEdges(4, 12, -110, 90)];
}

function lanternBazaar() {
  const ps: Part[] = [];
  for (let i = 0; i < 9; i++) {
    const z = -2 - i * 11;
    for (const s of [-1, 1]) {
      const x = s * 6.5;
      ps.push(box([x, 0.5, z], 2, 0.5, 3, 30, dim(RD.wood, 0.6)));
      ps.push(
        sheet(
          [x - 2.6, 5, z - 3.5],
          [x + 2.6, 5, z - 3.5],
          [x + 2.6, 5, z + 3.5],
          [x - 2.6, 5, z + 3.5],
          0.4,
          80,
          dim(RD.burgundy, 0.7),
          6,
          0.1,
          i * s,
        ),
      );
      // A cluster of lanterns of every size hung from the cloth at different heights.
      for (let k = 0; k < 7; k++) {
        const lx = x + (hash(i * 9 + k, s + 20) - 0.5) * 4;
        const lz = z + (hash(i * 9 + k, s + 21) - 0.5) * 5;
        const ly = 2.2 + hash(i * 9 + k, s + 22) * 2;
        const r = 0.2 + hash(i * 9 + k, s + 23) * 0.3;
        ps.push(
          seg([lx, 4.8, lz], [lx, ly + r * 1.3, lz], 3, dim(RD.sand, 0.3)),
          lantern([lx, ly, lz], r, 10, lampOf(k + i)),
        );
      }
      for (const q of [-1, 1])
        ps.push(pole(x + q * 2.6, z - 3.5, 5, 8), pole(x + q * 2.6, z + 3.5, 5, 8));
    }
  }
  return [...ps, ...roadEdges(3.5, 12, -104, 80)];
}

function spiceStalls() {
  const ps: Part[] = [];
  const spices = [RD.saffron, RD.burnt, RD.burgundy, RD.ochre, RD.gold];
  for (let i = 0; i < 10; i++) {
    const z = 2 - i * 10;
    for (const s of [-1, 1]) {
      const x = s * 6;
      ps.push(box([x, 0.45, z], 1.6, 0.45, 3.4, 30, dim(RD.wood, 0.6)));
      // Heaps of spice in rows of baskets: little cones of colour.
      for (let k = 0; k < 4; k++) {
        const bz = z - 2.4 + k * 1.6;
        ps.push(
          ring([x, 0.95, bz], 0.55, 12, dim(RD.wood, 0.7)),
          ...cone([x, 0.95, bz], 0.5, 0.55, 6, 3, 30, dim(pick(spices, i + k + s), 0.85)),
        );
      }
      // A slanted awning over the heaps, and crates stacked behind.
      ps.push(
        sheet(
          [x + s * 2, 3.4, z - 3.6],
          [x + s * 2, 3.4, z + 3.6],
          [x - s * 1.6, 2.4, z + 3.6],
          [x - s * 1.6, 2.4, z - 3.6],
          0.2,
          80,
          dim(pick([RD.burgundy, RD.ochre], i), 0.7),
          6,
          0.1,
          i,
        ),
      );
      ps.push(
        box([x + s * 2.6, 0.6, z + 1.4], 0.6, 0.6, 0.6, 16, dim(RD.wood, 0.55)),
        box([x + s * 2.6, 1.8, z + 1.4], 0.5, 0.5, 0.5, 14, dim(RD.wood, 0.55)),
      );
      ps.push(lantern([x - s * 1.4, 2.1, z], 0.22, 8, lampOf(i)));
    }
  }
  return [...ps, ...roadEdges(3.8, 12, -96, 80)];
}

function crossingSquare() {
  const ps: Part[] = [
    pole(0, -30, 11, 26, dim(RD.gold, 0.55)),
    ball([0, 11.3, -30], 0.35, 8, RD.lamp, 1, 0.12),
  ];
  const petals = 10;
  for (let k = 0; k < petals; k++) {
    const a0 = (k / petals) * TAU;
    const a1 = ((k + 1) / petals) * TAU;
    const p0: Vec3 = [Math.cos(a0) * 15, 5, -30 + Math.sin(a0) * 15];
    const p1: Vec3 = [Math.cos(a1) * 15, 5, -30 + Math.sin(a1) * 15];
    ps.push(
      sheet(
        [0, 10.8, -30],
        [0, 10.8, -30],
        p1,
        p0,
        0.9,
        110,
        dim(k % 2 ? RD.burgundy : RD.saffron, 0.7),
        6,
        0.12,
        k,
      ),
    );
    ps.push(pole(p0[0], p0[2], 5, 10), lantern([p0[0], 4.2, p0[2]], 0.3, 10, lampOf(k)));
    ps.push(...stall(Math.cos(a0 + 0.3) * 19, -30 + Math.sin(a0 + 0.3) * 19, k));
  }
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * TAU + Math.PI / 4;
    ps.push(...place(roadEdges(3, 22, 70, 30), [0, 0, -30], a));
  }
  return ps;
}

function coveredArcade() {
  const ps: Part[] = [];
  for (let i = 0; i < 14; i++) {
    const z = 4 - i * 6;
    // Arches along each side, their openings facing the street; a cloth roof sagging across.
    for (const s of [-1, 1])
      ps.push(
        ...place([arch(0, 0, 5.6, 3, 1.8, 40, dim(RD.sand, 0.6))], [s * 5, 0, z - 3], Math.PI / 2),
      );
    ps.push(
      sheet(
        [-5, 5, z],
        [5, 5, z],
        [5, 5, z - 6],
        [-5, 5, z - 6],
        1,
        100,
        dim(pick([RD.burgundy, RD.terracotta], i), 0.7),
        6,
        0.1,
        i,
      ),
    );
    ps.push(
      seg([0, 4, z - 3], [0, 3.3, z - 3], 3, dim(RD.sand, 0.3)),
      lantern([0, 3, z - 3], 0.3, 12, lampOf(i)),
    );
    for (const s of [-1, 1]) ps.push(...stall(s * 7.5, z - 3, i + s));
  }
  return [...ps, ...roadEdges(3, 12, -84, 70)];
}

/* ---------- 4. buildings ---------- */

function adobeStreet() {
  const ps: Part[] = [];
  for (const s of [-1, 1]) {
    let z = 8;
    for (let i = 0; i < 10; i++) {
      const hz = 2.6 + hash(i, s + 30) * 1.8;
      const hy = 2 + hash(i, s + 31) * 2.6;
      ps.push(
        ...house(
          s * (8 + hash(i, s + 32) * 1.5),
          z - hz,
          3 + hash(i, s + 33),
          hy,
          hz,
          i + (s > 0 ? 40 : 0),
          i % 3 === 1,
        ),
      );
      z -= hz * 2 + 1.2;
    }
  }
  for (let i = 0; i < 8; i++) ps.push(...lampPost((i % 2 ? 1 : -1) * 4.4, 4 - i * 14, 4.5, i));
  return [...ps, ...roadEdges(4, 14, -110, 100)];
}

/** A tower house round (x, z): a tall box narrowing as it climbs, floor rings and many small windows. */
export function towerHouse(x: number, z: number, w: number, h: number, seed = 0) {
  const floors = Math.round(h / 2.2);
  const taper = (v: number) => w * (1 - 0.18 * v);
  const ps: Part[] = [
    P(
      110,
      (u) => {
        const k = Math.floor(u * 4);
        const v = u * 4 - k;
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        return [
          x + Math.cos(a) * taper(v) * Math.SQRT2,
          v * h,
          z + Math.sin(a) * taper(v) * Math.SQRT2,
        ];
      },
      dim(RD.ochre, 0.65),
    ),
    P(
      floors * 24,
      (u) => {
        const k = Math.floor(u * floors);
        const v = (k + 1) / floors;
        const e = u * floors - k;
        const side = Math.floor(e * 4);
        const q = (e * 4 - side) * 2 - 1;
        const t = taper(v);
        const [px, pz] = [
          [q, -1],
          [1, q],
          [-q, 1],
          [-1, -q],
        ][side] as [number, number];
        return [x + px * t, v * h, z + pz * t];
      },
      dim(RD.terracotta, 0.45),
    ),
    plaster([x, h / 2, z], w * 0.95, h / 2, w * 0.95, 14 * h, dim(RD.ochre, 0.38)),
    windows([x, h / 2, z], w * 0.9, (h / 2) * 0.9, w * 0.9, floors, 2, 3, RD.lamp, seed),
  ];
  return ps;
}

function towerHouses() {
  const ps: Part[] = [];
  for (let i = 0; i < 18; i++) {
    const s = i % 2 === 0 ? -1 : 1;
    const x = s * (8 + hash(i, 34) * 14);
    const z = -4 - Math.floor(i / 2) * 12 - hash(i, 35) * 4;
    ps.push(...towerHouse(x, z, 2 + hash(i, 36) * 0.8, 12 + hash(i, 37) * 10, i));
  }
  return [...ps, ...roadEdges(4, 14, -110, 100), ...duneRidges(-150, 300)];
}

function caravanserai() {
  const hw = 15;
  const ps: Part[] = [];
  // Four walls round a courtyard; the front one with a tall arched gate.
  ps.push(
    plaster([0, 3.5, -hw], hw, 3.5, 1, 260, dim(RD.ochre, 0.42)),
    box([0, 3.5, 0], hw, 3.5, hw, 200, dim(RD.ochre, 0.6)),
  );
  ps.push(
    plaster([-hw, 3.5, 0], 1, 3.5, hw, 220, dim(RD.ochre, 0.42)),
    plaster([hw, 3.5, 0], 1, 3.5, hw, 220, dim(RD.ochre, 0.42)),
  );
  ps.push(
    plaster([-9, 3.5, hw], 6, 3.5, 1, 120, dim(RD.ochre, 0.42)),
    plaster([9, 3.5, hw], 6, 3.5, 1, 120, dim(RD.ochre, 0.42)),
  );
  ps.push(
    box([0, 5, hw], 3.4, 5, 1.4, 70, dim(RD.gold, 0.6)),
    arch(0, hw + 1.45, 4, 4.5, 2, 50, RD.lamp, 0.12),
  );
  // Domed towers on the corners.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const c: Vec3 = [sx * hw, 0, sz * hw];
      ps.push(
        box([c[0], 4.5, c[2]], 2, 4.5, 2, 60, dim(RD.ochre, 0.6)),
        dome([c[0], 9, c[2]], 2, 80, dim(RD.sand, 0.55)),
        ball([c[0], 11.2, c[2]], 0.18, 5, RD.lamp, 1, 0.1),
      );
    }
  // An arcade round the court, inside.
  for (let k = 0; k < 7; k++) {
    const x = -10.5 + k * 3.5;
    ps.push(arch(x, -hw + 2, 3, 2, 1.2, 18, dim(RD.sand, 0.55)));
    ps.push(lantern([x, 2.4, -hw + 2.3], 0.18, 6, lampOf(k)));
  }
  // The court: a round pool and a fire, and camels' troughs of light.
  ps.push(
    ring([0, 0.4, 0], 3, 50, dim(RD.stone, 0.7)),
    ...water(-2.4, 2.4, 2.4, -2.4, 80, 0.3, 0.1),
    ...fireBowl(6, 6, 0.3, 0.8, 70),
  );
  ps.push(...duneRidges(-60, 400));
  return ps;
}

function townGate() {
  const ps: Part[] = [];
  ps.push(...townWall(-70, -8, -20, 7, 900), ...townWall(8, 70, -20, 7, 900));
  for (const s of [-1, 1]) {
    ps.push(
      plaster([s * 6, 6, -20], 2.4, 6, 2.4, 180, dim(RD.ochre, 0.45)),
      box([s * 6, 6, -20], 2.4, 6, 2.4, 80, dim(RD.ochre, 0.65)),
    );
    ps.push(...townWall(s * 8.4 - 2.4, s * 8.4 + 2.4, -20, 13, 60));
    ps.push(...fireBowl(s * 6, -16.4, 1.4, 0.6, 50));
  }
  ps.push(
    box([0, 10, -20], 3.6, 2, 2.2, 50, dim(RD.ochre, 0.6)),
    arch(0, -17.7, 7, 4.5, 3, 56, RD.lamp, 0.12),
  );
  ps.push(...lanternString([-3.4, 7.2, -17.6], [3.4, 7.2, -17.6], 0.8, 5, 0.3, 10));
  // The town beyond, through the gate.
  for (let i = 0; i < 6; i++)
    ps.push(
      ...house(-7, -30 - i * 12, 3, 2.5 + hash(i, 38) * 2, 5, i),
      ...house(7, -34 - i * 12, 3, 2.5 + hash(i, 39) * 2, 5, i + 6),
    );
  return [...ps, ...roadEdges(3, 16, -100, 90)];
}

function watchtower() {
  const ps: Part[] = [...towerHouse(0, -30, 3, 24, 7)];
  ps.push(
    ring([0, 24, -30], 4.2, 60, dim(RD.gold, 0.7)),
    ring([0, 25, -30], 4.2, 50, dim(RD.gold, 0.6)),
  );
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    ps.push(
      seg(
        [Math.cos(a) * 4.2, 24, -30 + Math.sin(a) * 4.2],
        [Math.cos(a) * 4.2, 27, -30 + Math.sin(a) * 4.2],
        6,
        dim(RD.wood, 0.6),
      ),
    );
  }
  ps.push(
    ...cone([0, 27, -30], 4.6, 3.4, 12, 4, 140, dim(RD.terracotta, 0.6)),
    lantern([0, 25.6, -30], 0.9, 40, RD.lamp, 0.12),
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.4;
    ps.push(
      ...house(Math.cos(a) * 16, -30 + Math.sin(a) * 16, 2.6, 1.8 + hash(i, 40) * 1.4, 2.6, i),
    );
  }
  ps.push(P(100, (u) => [Math.sin(u * 7) * 1.5, 0.1, lerp(10, -22, u)], RD.lamp, 0.15));
  return [...ps, ...duneRidges(-80, 400)];
}

function windTowers() {
  const ps: Part[] = [];
  for (const s of [-1, 1])
    for (let i = 0; i < 8; i++) {
      const z = 4 - i * 13 - (s > 0 ? 6 : 0);
      const x = s * 9;
      const hy = 2.4 + hash(i, s + 41);
      ps.push(...house(x, z, 3.4, hy, 5, i + (s > 0 ? 20 : 0)));
      // The wind catcher: a slim square tower over the roof, slotted on every side at its top.
      const wx = x + s * 1.2;
      const top = hy * 2 + 6;
      ps.push(
        box([wx, top - 2.5, z], 0.9, 2.5 + (top - 5 - hy * 2) / 2, 0.9, 50, dim(RD.sand, 0.6)),
      );
      ps.push(
        P(
          60,
          (u) => {
            const k = Math.floor(u * 12);
            const side = k % 4;
            const sl = (Math.floor(k / 4) - 1) * 0.5;
            const [px, pz] = [
              [sl, 0.92],
              [0.92, sl],
              [sl, -0.92],
              [-0.92, sl],
            ][side] as [number, number];
            return [wx + px, top - 2 + (u * 12 - k) * 1.6, z + pz];
          },
          dim(RD.lamp, 0.6),
          0.08,
        ),
      );
    }
  return [...ps, ...roadEdges(4.5, 14, -110, 100)];
}

function roofTerraces() {
  const ps: Part[] = [];
  for (let row = 0; row < 7; row++) {
    const z = -8 - row * 9;
    const base = row * 2.6;
    for (let k = 0; k < 4; k++) {
      const x = -15 + k * 10 + (row % 2) * 4 + hash(row * 4 + k, 42) * 2;
      const hy = 1.6 + hash(row * 4 + k, 43);
      ps.push(...place(house(0, 0, 3.4, hy, 3.6, row * 4 + k), [x, base, z]));
      if ((row + k) % 2 === 0)
        ps.push(
          ladder(
            [x + 2.5, base + hy * 2 + 0.6, z + 4.8],
            [x + 2.5, base + 2.6 + hy * 2, z + 3.2],
            5,
            22,
          ),
        );
      if ((row + k) % 3 === 0)
        ps.push(lantern([x, base + hy * 2 + 1.4, z + 3], 0.25, 8, lampOf(k)));
    }
  }
  return [...ps, ...duneRidges(-110, 300)];
}

/* ---------- 5. cavern and rock ---------- */

function glowingCavern() {
  // The mouth: straight sides 7 either way up to 9, a round top 3 higher.
  const mouth = (x: number, y: number) =>
    Math.abs(x) < 7 && y < 9 + 3 * Math.sqrt(Math.max(0, 1 - (x / 7) ** 2));
  const ps: Part[] = [cliff(-50, 50, 34, -30, 1700, dim(RD.terracotta, 0.48), 2.2, mouth)];
  // Inside, the cave runs back, rings of lamps on its walls fading into the rock.
  for (let i = 0; i < 12; i++) {
    const z = -33 - i * 5;
    const r = 6.5 - i * 0.12;
    ps.push(
      P(
        40,
        (u) => {
          const a = u * Math.PI;
          return [-Math.cos(a) * r, Math.sin(a) * r * 1.45 + wobble(i, u * 9) * 0.4, z];
        },
        i % 2 ? RD.lamp : RD.saffron,
        0.15,
      ),
    );
    ps.push(rockArch(z - 2.5, r * 2 + 1.5, r * 1.5 + 0.8, 1.2, 50, dim(RD.terracotta, 0.35)));
  }
  ps.push(P(160, (u) => [Math.sin(u * 30) * 3, 0.05, lerp(-28, -90, u)], dim(RD.gold, 0.6), 0.1));
  ps.push(...fireBowl(-8.5, -26, 1.5, 0.7, 60), ...fireBowl(8.5, -26, 1.5, 0.7, 60));
  ps.push(scatter([0, 0.02, -10], 30, 18, 200, dim(RD.sand, 0.3)));
  return ps;
}

function stoneArch() {
  const ps: Part[] = [
    rockArch(-36, 30, 22, 3.4, 1500),
    rock([-15, 4, -36], 4, 7, 5, 300, dim(RD.terracotta, 0.55), 1),
    rock([15, 4, -36], 4.4, 7, 5, 300, dim(RD.terracotta, 0.55), 2),
  ];
  for (let i = 0; i < 8; i++)
    ps.push(
      ...hoodoo((i % 2 ? 1 : -1) * (20 + hash(i, 44) * 20), -60 - i * 12, 6 + hash(i, 45) * 6, i),
    );
  for (let i = 0; i < 10; i++)
    for (const s of [-1, 1]) ps.push(lantern([s * 4.5, 0.5, 6 - i * 9], 0.25, 8, lampOf(i)));
  return [...ps, ...roadEdges(4, 14, -140, 120), ...duneRidges(-170, 300)];
}

function cliffDwellings() {
  const doors: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 8; k++) doors.push([-28 + k * 8 + (r % 2) * 4, 2 + r * 6]);
  const hole = (x: number, y: number) =>
    doors.some(([dx, dy]) => Math.abs(x - dx) < 1.1 && y > dy && y < dy + 2.4);
  const ps: Part[] = [cliff(-40, 40, 30, -26, 2000, dim(RD.ochre, 0.45), 1.6, hole)];
  for (const [i, [x, y]] of doors.entries()) {
    if (hash(i, 46) > 0.3)
      ps.push(
        ...place([doorway(0, 0, 2, 2.4, 14)], [x, y, -25.2 + wobble(x, y) * 1.6 - (y / 30) * 1.6]),
      );
    if (i % 3 === 0 && y > 2) ps.push(ladder([x + 1.6, y - 6, -24.6], [x + 1.6, y, -25], 6, 18));
  }
  for (let r = 0; r < 4; r++)
    ps.push(seg([-36, 2 + r * 6, -24.4], [36, 2 + r * 6, -24.4], 80, dim(RD.sand, 0.4)));
  return [
    ...ps,
    scatter([0, 0.02, -10], 30, 14, 150, dim(RD.sand, 0.3)),
    ...fireBowl(0, -14, 0.3, 0.9, 70),
  ];
}

function lampCanyon() {
  const ps: Part[] = [canyonWall(-7, 14, -160, 28, 1700), canyonWall(7, 14, -160, 28, 1700)];
  for (let i = 0; i < 18; i++) {
    const z = 8 - i * 9;
    ps.push(
      lantern([-5.6, 0.4, z], 0.22, 8, lampOf(i)),
      lantern([5.6, 0.4, z - 4.5], 0.22, 8, lampOf(i + 1)),
    );
    if (i % 3 === 0)
      ps.push(lantern([(i % 2 ? 1 : -1) * 7.6, 6 + hash(i, 47) * 6, z], 0.3, 10, RD.saffron));
  }
  ps.push(
    ...flagString([-8, 18, -40], [8, 18, -44], 2, 14, 0.7),
    ...flagString([-8, 20, -100], [8, 20, -104], 2, 14, 0.7),
  );
  return [...ps, ...roadEdges(3.5, 14, -150, 90, dim(RD.sand, 0.25))];
}

function hoodooField() {
  const ps: Part[] = [];
  for (let i = 0; i < 18; i++) {
    const s = i % 2 === 0 ? -1 : 1;
    ps.push(
      ...hoodoo(
        s * (6 + hash(i, 48) * 22),
        4 - Math.floor(i / 2) * 13 - hash(i, 49) * 5,
        5 + hash(i, 50) * 9,
        i,
      ),
    );
  }
  return [...ps, ...roadEdges(3.5, 14, -120, 100), ...duneRidges(-150, 400)];
}

function caveShrine() {
  const ps: Part[] = [];
  // The cavern's vault all round the eye: rough rock overhead.
  ps.push(
    P(
      1800,
      (u) => {
        const i = Math.floor(u * 1800);
        const a = hash(i, 54) * TAU;
        const e = Math.asin(hash(i, 55));
        const r = 30 + wobble(a * 8, e * 8, 4) * 3;
        return [
          Math.cos(a) * Math.cos(e) * r,
          Math.sin(e) * r * 0.6,
          -20 + Math.sin(a) * Math.cos(e) * r,
        ];
      },
      dim(RD.terracotta, 0.4),
    ),
  );
  // Lanterns hung on long threads from the vault, many heights.
  for (let k = 0; k < 40; k++) {
    const a = hash(k, 56) * TAU;
    const rr = 4 + hash(k, 57) * 18;
    const x = Math.cos(a) * rr;
    const z = -20 + Math.sin(a) * rr;
    const roof = Math.sqrt(Math.max(0, 900 - rr * rr)) * 0.6;
    const y = 4 + hash(k, 58) * (roof - 6);
    ps.push(
      seg([x, roof, z], [x, y + 0.5, z], 6, dim(RD.sand, 0.25)),
      lantern([x, y, z], 0.3, 10, lampOf(k)),
    );
  }
  ps.push(
    ring([0, 0.3, -20], 7, 80, dim(RD.stone, 0.6)),
    ...water(-6, 6, -14, -26, 260, 0.2, 0.15),
  );
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    ps.push(...fireBowl(Math.cos(a) * 9, -20 + Math.sin(a) * 9, 0.8, 0.4, 40));
  }
  return ps;
}

/* ---------- 6. water and the river ---------- */

/** A dusty river along z, its banks at ±hw from z0 to z1, the water slipping slowly downstream. */
export function river(hw: number, z0: number, z1: number, n: number) {
  return [
    ...water(-hw, hw, z0, z1, n * 0.75),
    P(
      n * 0.25,
      (u) => {
        const s = u < 0.5 ? -1 : 1;
        const z = lerp(z0, z1, (u * 2) % 1);
        return [s * (hw + 0.5 + wobble(z, s) * 0.8), 0.3, z];
      },
      dim(RD.sand, 0.45),
    ),
  ];
}

function plankBridge() {
  const ps: Part[] = [...river(9, 20, -170, 1400)];
  const z = -30;
  ps.push(
    P(
      240,
      (u) => {
        const k = Math.floor(u * 30);
        const x = -13 + k * (26 / 29);
        const y = 2.4 + 1.2 * Math.cos((x / 13) * (Math.PI / 2)) ** 2;
        return [x, y, z - 1.6 + (u * 30 - k) * 3.2];
      },
      dim(RD.wood, 0.7),
    ),
  );
  for (const s of [-1, 1])
    ps.push(
      P(
        80,
        (u) => {
          const x = lerp(-13, 13, u);
          return [x, 3.6 + 1.2 * Math.cos((x / 13) * (Math.PI / 2)) ** 2, z + s * 1.6];
        },
        dim(RD.wood, 0.6),
      ),
    );
  for (let k = 0; k < 5; k++) {
    const x = -12 + k * 6;
    const y = 2.4 + 1.2 * Math.cos((x / 13) * (Math.PI / 2)) ** 2;
    for (const s of [-1, 1])
      ps.push(seg([x, 0, z + s * 1.6], [x, y + 1.4, z + s * 1.6], 8, dim(RD.wood, 0.6)));
    ps.push(lantern([x, y + 1.9, z + 1.6], 0.25, 10, lampOf(k)));
  }
  for (let i = 0; i < 12; i++)
    for (const s of [-1, 1])
      ps.push(
        ...palm(
          s * (12 + hash(i, s + 60) * 6),
          6 - i * 14 - hash(i, s + 61) * 6,
          7 + hash(i, s + 62) * 3,
          s * 1.2,
          50,
        ),
      );
  return [...ps, ...duneRidges(-190, 300)];
}

function palmOasis() {
  const c: Vec3 = [0, 0, -30];
  const ps: Part[] = [];
  ps.push(
    ...water(-13, 13, -19, -41, 900, 0.05, 0.05),
    P(
      160,
      (u) => [Math.cos(u * TAU) * 14 + wobble(u * 9, 1) * 0.6, 0.15, c[2] + Math.sin(u * TAU) * 11],
      dim(RD.palm, 0.5),
    ),
  );
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + hash(i, 63) * 0.3;
    const r = 16 + hash(i, 64) * 5;
    ps.push(
      ...palm(
        Math.cos(a) * r,
        c[2] + Math.sin(a) * r * 0.85,
        7 + hash(i, 65) * 4,
        -Math.cos(a) * 1.5,
        60,
      ),
    );
  }
  for (let i = 0; i < 3; i++)
    ps.push(
      ...cone([-22 + i * 8, 0, -52], 2.6, 4.6, 8, 4, 100, dim(RD.sand, 0.55)),
      doorway(-22 + i * 8, -49.6, 0.9, 1.6, 10),
    );
  for (let k = 0; k < 8; k++)
    ps.push(
      lantern(
        [Math.cos((k / 8) * TAU) * 14.6, 0.5, c[2] + Math.sin((k / 8) * TAU) * 11.6],
        0.25,
        8,
        lampOf(k),
      ),
    );
  return [...ps, ...duneRidges(-110, 500)];
}

function pulleyWell() {
  const ps: Part[] = [];
  // The well: a round wall, two posts, a beam, the pulley wheel and the rope down to the bucket.
  for (let k = 0; k < 5; k++) ps.push(ring([0, k * 0.28, 0], 1.6, 40, dim(RD.stone, 0.6)));
  ps.push(...water(-1.2, 1.2, 1.2, -1.2, 40, 0.6, 0.02));
  ps.push(
    seg([-1.9, 0, 0], [-1.9, 3.6, 0], 14, dim(RD.wood, 0.7)),
    seg([1.9, 0, 0], [1.9, 3.6, 0], 14, dim(RD.wood, 0.7)),
    seg([-2.2, 3.6, 0], [2.2, 3.6, 0], 18, dim(RD.wood, 0.7)),
  );
  ps.push(ring([0, 3.2, 0], 0.4, 20, dim(RD.gold, 0.8), 'z'));
  ps.push(
    P(30, (u, _s, t) => [0.4, 3.2 - u * (1.6 + 0.4 * Math.sin(t * 0.3)), 0], dim(RD.sand, 0.5)),
  );
  ps.push(
    P(
      30,
      (u, _s, t) => {
        const y = 3.2 - (1.6 + 0.4 * Math.sin(t * 0.3));
        return [
          0.4 + Math.cos(u * TAU) * 0.3,
          y - 0.3 + (u > 0.5 ? 0.3 : 0),
          Math.sin(u * TAU) * 0.3,
        ];
      },
      dim(RD.wood, 0.8),
    ),
  );
  // A trough of water beside it, a palm and the lantern on the beam.
  ps.push(
    box([3.6, 0.4, 1.2], 1.6, 0.4, 0.5, 30, dim(RD.stone, 0.6)),
    ...water(2.2, 5, 1.6, 0.8, 30, 0.75, 0.02),
  );
  ps.push(...palm(-4.5, -2, 6.5, 0.8, 70), lantern([-1.9, 3.1, 0.35], 0.3, 12));
  for (let i = 0; i < 6; i++)
    ps.push(...house(-14 + i * 6, -14 - hash(i, 66) * 4, 2.6, 1.8 + hash(i, 67), 2.6, i));
  ps.push(scatter([0, 0.02, 0], 10, 10, 160, dim(RD.sand, 0.3)));
  return ps;
}

function channelFields() {
  const ps: Part[] = [];
  for (let k = -4; k <= 4; k++) {
    const x = k * 6;
    ps.push(...water(x - 0.5, x + 0.5, 14, -170, 150, 0.05, 0.8));
    if (k % 2 === 0)
      for (let i = 0; i < 9; i++)
        ps.push(...palm(x + 3, 4 - i * 19, 5 + hash(i + k, 68) * 2, 0.4, 34));
  }
  for (let i = 0; i < 6; i++)
    ps.push(
      seg([-26, 0.4, -10 - i * 28], [26, 0.4, -10 - i * 28], 70, dim(RD.wood, 0.5)),
      lantern([0, 0.8, -10 - i * 28], 0.25, 8, lampOf(i)),
    );
  return [...ps, ...duneRidges(-190, 400)];
}

function riverBoats() {
  const ps: Part[] = [...river(12, 20, -170, 1300)];
  for (let i = 0; i < 9; i++) {
    const x = (hash(i, 69) - 0.5) * 16;
    const len = 5 + hash(i, 70) * 2;
    // A boat and its little sail, drifting slowly downstream on its own loop, out into the haze
    // far down the river before it comes round again near the eye.
    const sail = sheet(
      [0, 1.2, -len * 0.1],
      [0, 4.4, -len * 0.1],
      [0, 1.4, len * 0.3],
      [0, 1.2, len * 0.3],
      0,
      50,
      dim(pick([RD.sand, RD.burgundy, RD.ochre], i), 0.7),
      5,
      0.1,
      i,
    );
    for (const p of [...boat([0, 0, 0], len, 120), sail]) {
      ps.push({
        ...p,
        f: (u: number, s: number, t: number): Vec3 => {
          const q = p.f(u, s, t);
          const z = 20 - ((t * 0.5 + i * 21) % 190);
          return [x + q[0], q[1] + Math.sin(t * 0.5 + i) * 0.08, z + q[2]];
        },
      });
    }
  }
  for (let i = 0; i < 10; i++)
    for (const s of [-1, 1])
      ps.push(...palm(s * (15 + hash(i, s + 71) * 5), 6 - i * 16, 7 + hash(i, s + 72) * 3, s, 46));
  return [...ps, ...duneRidges(-190, 300)];
}

function waterSteps() {
  const ps: Part[] = [...river(10, 20, -150, 1100)];
  // The steps down to the water on the left bank, and little shrines along their top.
  ps.push(...tiers(-10.6, -50, 110, 9, 1, 0.55, 1500, 1, dim(RD.sand, 0.5)).slice(0, 1));
  for (let i = 0; i < 9; i++) ps.push(...house(-23, 0 - i * 12, 2.4, 2 + hash(i, 73) * 2, 3, i));
  // Floating lamps drifting slowly downstream.
  ps.push(
    P(
      160,
      (u, _s, t) => {
        const i = Math.floor(u * 160);
        const x = -8 + hash(i, 74) * 12;
        const z = 18 - ((hash(i, 75) * 170 + t * 0.6) % 170);
        return [x + Math.sin(t * 0.3 + i) * 0.4, 0.15, z];
      },
      RD.lamp,
      0.15,
    ),
  );
  for (let i = 0; i < 10; i++)
    ps.push(...palm(15 + hash(i, 76) * 6, 6 - i * 15, 7 + hash(i, 77) * 3, 1, 46));
  return [...ps, ...duneRidges(-170, 300)];
}

/* ---------- 7. race gate ---------- */

function sunGateDesign() {
  return [
    ...sunGate(0),
    ...roadEdges(10, 30, -150, 160, dim(RD.sand, 0.4)),
    ...bannerRow(-13, -10, 8, 14, 9, 1),
    ...bannerRow(13, -10, 8, 14, 9, 1, 3),
    ...duneRidges(-170, 400),
  ];
}

/** A timber gantry across the road at z: four posts, a trussed beam, lamp strings and banners. */
export function timberGantry(z = 0, w = 22, h = 11) {
  const hw = w / 2;
  const ps: Part[] = [];
  for (const sx of [-1, 1])
    for (const dz of [-1.5, 1.5])
      ps.push(seg([sx * hw, 0, z + dz], [sx * hw, h + 2, z + dz], 30, dim(RD.wood, 0.7)));
  for (const y of [h, h + 2])
    for (const dz of [-1.5, 1.5])
      ps.push(seg([-hw, y, z + dz], [hw, y, z + dz], 60, dim(RD.wood, 0.7)));
  // The truss: zigzag between the beams.
  ps.push(
    P(
      140,
      (u) => {
        const k = Math.floor(u * 22);
        const v = u * 22 - k;
        return [-hw + (k + v) * (w / 22), h + (k % 2 ? 2 - v * 2 : v * 2), z + 1.5];
      },
      dim(RD.wood, 0.6),
    ),
  );
  for (let k = 0; k < 3; k++)
    ps.push(
      ...lanternString(
        [-hw, h - 0.2, z + 1.6 + k * 0.01],
        [hw, h - 0.2, z + 1.6],
        1.6 + k * 1.2,
        9,
        0.3,
        10,
        lampOf(k),
      ),
    );
  for (const x of [-hw + 2, -hw / 3, hw / 3, hw - 2])
    ps.push(
      sheet(
        [x - 1, h, z + 1.7],
        [x + 1, h, z + 1.7],
        [x + 1, h - 4.5, z + 1.8],
        [x - 1, h - 4.5, z + 1.8],
        0.1,
        50,
        dim(pick([RD.saffron, RD.burgundy], Math.round(x)), 0.75),
        5,
        0.12,
        x,
      ),
    );
  for (const sx of [-1, 1])
    ps.push(
      pole(sx * hw, z, h + 7, 16, dim(RD.gold, 0.5)),
      banner(sx * hw, z, h + 6.7, 3.5, 1.8, 60, RD.burnt, 1, sx),
    );
  ps.push(P(60, (u) => [lerp(-hw, hw, u), 0.05, z], RD.lamp, 0.12));
  return ps;
}

function timberGateDesign() {
  return [
    ...timberGantry(0),
    ...roadEdges(11, 30, -150, 160, dim(RD.sand, 0.4)),
    ...Array.from({ length: 7 }, (_, i) =>
      lampPost((i % 2 ? 1 : -1) * 12, -12 - i * 18, 5.5, i),
    ).flat(),
    ...duneRidges(-170, 400),
  ];
}

function rockGate() {
  const ps: Part[] = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++)
      ps.push(
        rock(
          [s * 13, 2 + k * 4, 0],
          3.6 - k * 0.3,
          2.6,
          3.4,
          220,
          dim(mix(RD.terracotta, RD.ochre, k / 4), 0.55),
          s * 3 + k,
        ),
      );
  }
  ps.push(rock([0, 18.5, 0], 17, 2, 3.4, 600, dim(RD.stone, 0.55), 9));
  ps.push(
    ...flagString([-12, 16.4, 2.6], [12, 16.4, 2.6], 2.2, 26, 0.8),
    ...flagString([-12, 16, -2.6], [12, 16, -2.6], 3.2, 26, 0.8),
  );
  ps.push(...lanternString([-10, 16.4, 3.4], [10, 16.4, 3.4], 4, 9, 0.38, 12));
  ps.push(P(60, (u) => [lerp(-10, 10, u), 0.05, 0], RD.lamp, 0.12));
  for (let i = 0; i < 6; i++)
    ps.push(
      ...hoodoo((i % 2 ? 1 : -1) * (18 + hash(i, 78) * 10), -20 - i * 16, 6 + hash(i, 79) * 5, i),
    );
  return [...ps, ...roadEdges(10, 30, -140, 150, dim(RD.sand, 0.4)), ...duneRidges(-170, 300)];
}

function grandstandStraight() {
  const ps: Part[] = [...sunGate(0, 20, 14)];
  for (let i = 0; i < 4; i++) {
    const z = -24 - i * 34;
    ps.push(...grandstand(-13, z, 28, 1, 7, i), ...grandstand(13, z, 28, -1, 7, i + 4));
  }
  return [...ps, ...roadEdges(10, 30, -160, 160, dim(RD.sand, 0.4))];
}

function startLine() {
  const ps: Part[] = [...lampTunnel(46, 7, 5, 18, 3.5, 6)];
  // The grid: boxes painted in light, two staggered columns.
  for (let k = 0; k < 8; k++) {
    const x = k % 2 ? 3.5 : -3.5;
    const z = -4 - k * 5;
    ps.push(
      P(
        26,
        (u) => {
          const e = Math.floor(u * 3);
          const v = u * 3 - e;
          if (e === 0) return [x - 1.5 + v * 3, 0.04, z];
          return [x + (e === 1 ? -1.5 : 1.5), 0.04, z - v * 3];
        },
        dim(RD.gold, 0.7),
      ),
    );
  }
  ps.push(P(70, (u) => [lerp(-9, 9, u), 0.05, 0], RD.lamp, 0.12));
  ps.push(...bannerRow(-10.5, 10, 10, 6, 10, 1), ...bannerRow(10.5, 10, 10, 6, 10, 1, 2));
  ps.push(...timingTower(16, -6, 16));
  return [...ps, ...roadEdges(9, 50, -130, 160, dim(RD.sand, 0.4)), ...duneRidges(-160, 300)];
}

function paddock() {
  const ps: Part[] = [];
  for (let i = 0; i < 10; i++) {
    const z = 6 - i * 9;
    ps.push(...canopy(14, z, 3.2, 3.6, pick([RD.burgundy, RD.ochre, RD.sand], i), i));
    ps.push(
      box([14, 0.6, z + 1.5], 0.7, 0.6, 0.7, 14, dim(RD.wood, 0.55)),
      box([15.3, 0.4, z - 1], 0.5, 0.4, 0.5, 10, dim(RD.wood, 0.55)),
    );
  }
  // The pit wall: a low line of light between the pit lane and the track.
  ps.push(
    seg([9, 0.8, 12], [9, 0.8, -90], 160, dim(RD.sand, 0.55)),
    P(100, (u) => [9, 1, lerp(12, -90, u)], RD.lamp, 0.12),
  );
  ps.push(...timingTower(-6, -44, 20), ...grandstand(-12, -10, 30, 1, 7, 2));
  ps.push(
    ...flagString([9, 6, 10], [9, 6, -40], 1.5, 40, 0.7),
    ...flagString([9, 6, -40], [9, 6, -90], 1.5, 40, 0.7),
  );
  for (let i = 0; i < 6; i++) ps.push(pole(9, 10 - i * 20, 6, 10));
  return [
    ...ps,
    ...roadEdges(8, 30, -140, 140, dim(RD.sand, 0.4)).slice(0, 1),
    ...duneRidges(-160, 300),
  ];
}

function finishArena() {
  const ps: Part[] = [...sunGate(0, 20, 14), ...lampTunnel(-14, 8, 6, 18, 3.5, 6)];
  ps.push(...grandstand(-13, -66, 34, 1, 8, 1), ...grandstand(13, -66, 34, -1, 8, 2));
  ps.push(...grandstand(-14, 24, 22, 1, 6, 3), ...grandstand(14, 24, 22, -1, 6, 4));
  ps.push(
    ...timingTower(-22, -8, 22),
    ...bannerRow(-11, -92, 6, 10, 11, 1),
    ...bannerRow(11, -92, 6, 10, 11, 1, 2),
  );
  return [...ps, ...roadEdges(10, 40, -160, 160, dim(RD.sand, 0.4))];
}

/* ---------- the series ---------- */

const d = (cat: string, name: string, idea: string, make: () => Part[], view: View): Design => ({
  id: `${cat}/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  idea,
  make,
  view,
});
/** Down a corridor: eye low over its middle, looking along -z, gliding forward. */
const along = (y = 3.2, z = 22, ty = 6, glide = 12): View => ({
  eye: [0, y, z],
  target: [0, ty, -50],
  glide,
});

export const CATEGORIES: Category[] = [
  {
    id: 'flags',
    name: 'Flags and lamps',
    label: 'Flags and lamps',
    line: 'Prayer flags strung across the streets, an avenue of dusty orange banners, lanterns, lamp tunnels and fire bowls, all in a slow breeze.',
    designs: [
      d(
        'flags',
        'Prayer Street',
        'Strings of small faded prayer flags zigzag across a street from pole to pole, mud houses either side, to the vanishing point.',
        prayerStreet,
        along(),
      ),
      d(
        'flags',
        'Hall of Banners',
        'Two rows of tall poles, each flying an orange or ochre banner, lead to a long low assembly hall with lit steps.',
        hallOfBanners,
        along(2.6, 20, 7, 14),
      ),
      d(
        'flags',
        'Lampion Lane',
        'Lanterns on sagging strings across a lane of mud houses, one string after another into the distance.',
        lampionLane,
        along(3, 20, 6, 10),
      ),
      d(
        'flags',
        'Lamp Tunnel',
        'Arches of lamps one after another with lanterns hung from each, a tunnel of light to drive through.',
        lampTunnelDesign,
        along(2.6, 14, 4, 14),
      ),
      d(
        'flags',
        'Fire Bowl Road',
        'A road out into the dunes lined with fire bowls on stands, their flames rising slowly.',
        fireBowlRoad,
        along(2.4, 18, 3, 14),
      ),
      d(
        'flags',
        'Lamp Post Row',
        'Crook lamp posts with hanging lanterns either side of a road bending gently away.',
        lampPostRow,
        along(3, 18, 4, 12),
      ),
      d(
        'flags',
        'Summit Cairn',
        'A cairn and a mast on a hilltop, prayer flag lines running down from its top to the ground all round.',
        summitCairn,
        { eye: [24, 5, 24], target: [0, 5, 0], glide: 6 },
      ),
    ],
  },
  {
    id: 'tents',
    name: 'Tents and camps',
    label: 'Tent',
    line: 'Nomad tents, long low desert tents, a caravan camp round its fire, canopies, a tarp village in the wind and yurts up a dune.',
    designs: [
      d(
        'tents',
        'Nomad Cones',
        'Nine conical tents in an arc round a campfire, their doorways lit, embers on the sand.',
        nomadCones,
        { eye: [0, 4, 10], target: [0, 3, -30], glide: 8 },
      ),
      d(
        'tents',
        'Long Low Tents',
        'Long low tents on poles alternating either side of the track, guy ropes to pegs, lanterns along their open sides.',
        longTents,
        along(3, 20, 3, 14),
      ),
      d(
        'tents',
        'Caravan Camp',
        'Ridge tents in a ring round a fire, crates beside them, a fence of lantern strings round the camp.',
        caravanCamp,
        { eye: [0, 9, 4], target: [0, 1, -32], glide: 8 },
      ),
      d(
        'tents',
        'Canopy Row',
        'Square canopies on four poles staggered either side of a road, a lantern under each.',
        canopyRow,
        along(2.8, 18, 3, 12),
      ),
      d(
        'tents',
        'Tarp Village',
        'Tarps pitched every which way on poles and ropes, flapping slowly in the wind.',
        tarpVillage,
        { eye: [0, 5, 14], target: [0, 2, -40], glide: 10 },
      ),
      d(
        'tents',
        'Dune Yurts',
        'Round yurts stepping up a dune, a path of little lamps winding up between them.',
        duneYurts,
        { eye: [0, 3, 14], target: [0, 6, -50], glide: 10 },
      ),
    ],
  },
  {
    id: 'market',
    name: 'Market',
    label: 'Market',
    line: 'The souk: burgundy dusty cloths hung overhead between poles, stalls and crates, rugs drying, heaps of spice and lanterns under the cloth.',
    designs: [
      d(
        'market',
        'Burgundy Souk',
        'Sagging burgundy sails one after another over a narrow market street, stalls either side, lamps hung beneath.',
        burgundySouk,
        along(2.4, 14, 3.4, 10),
      ),
      d(
        'market',
        'Rug Lane',
        'Rugs hung on lines to dry along both sides of a lane, borders woven in, lantern strings across.',
        rugLane,
        along(2.6, 16, 3, 10),
      ),
      d(
        'market',
        'Lantern Bazaar',
        'Stalls under burgundy cloths, a cluster of lanterns of every size hung from each.',
        lanternBazaar,
        along(2.4, 14, 3, 10),
      ),
      d(
        'market',
        'Spice Stalls',
        'Rows of baskets heaped with saffron, ochre and red spice under slanted awnings, crates stacked behind.',
        spiceStalls,
        along(2.4, 14, 2.4, 10),
      ),
      d(
        'market',
        'Crossing Square',
        'A square where four lanes meet, cloths radiating from a central mast like a great umbrella, stalls round it.',
        crossingSquare,
        { eye: [0, 5, 4], target: [0, 4, -30], glide: 6 },
      ),
      d(
        'market',
        'Covered Arcade',
        'Arches along both sides of a lane, a cloth roof sagging over it, a lamp under every bay.',
        coveredArcade,
        along(2.4, 14, 3, 10),
      ),
    ],
  },
  {
    id: 'buildings',
    name: 'Buildings',
    label: 'Building',
    line: 'Mud-brick houses with flat roofs and ladders, tower houses, a domed caravanserai, a gate in the town wall, a watchtower and wind towers.',
    designs: [
      d(
        'buildings',
        'Adobe Street',
        'Mud-brick houses of every height along a street, flat roofs with parapets, ladders, warm windows, lamp posts.',
        adobeStreet,
        along(3, 18, 5, 12),
      ),
      d(
        'buildings',
        'Tower Houses',
        'Tall narrow tower houses tapering as they rise, many small lit windows, either side of a road.',
        towerHouses,
        along(3, 18, 9, 12),
      ),
      d(
        'buildings',
        'Caravanserai',
        'A walled courtyard with domed corner towers, an arched gate, an arcade inside, a pool and a fire.',
        caravanserai,
        { eye: [0, 16, 44], target: [0, 2, 0], glide: 8 },
      ),
      d(
        'buildings',
        'Town Gate',
        'A crenellated town wall with two towers and a lit arched gate, the street of houses running on beyond.',
        townGate,
        { eye: [0, 3, 18], target: [0, 6, -40], glide: 12 },
      ),
      d(
        'buildings',
        'Watchtower',
        'A tall tapering tower with a lantern room under a pointed roof, low houses round its foot, a lamp path to it.',
        watchtower,
        { eye: [0, 4, 16], target: [0, 12, -30], glide: 8 },
      ),
      d(
        'buildings',
        'Wind Towers',
        'Houses with slim square wind catchers over their roofs, slotted at the top, glowing faintly.',
        windTowers,
        along(3, 18, 6, 12),
      ),
      d(
        'buildings',
        'Roof Terraces',
        'Houses stepping up a hill row by row, ladders between the roofs, lamps on the terraces.',
        roofTerraces,
        { eye: [0, 5, 10], target: [0, 9, -40], glide: 8 },
      ),
    ],
  },
  {
    id: 'cavern',
    name: 'Cavern and rock',
    label: 'Rock',
    line: 'A cavern glowing from within, a great rock arch, dwellings carved into a cliff, a canyon passage lit by lamps, hoodoos and a cave shrine.',
    designs: [
      d(
        'cavern',
        'Glowing Cavern',
        'A cliff with a cave mouth, rings of lamps running back inside into the rock, fire bowls at the entrance.',
        glowingCavern,
        { eye: [0, 3, 12], target: [0, 5, -40], glide: 12 },
      ),
      d(
        'cavern',
        'Stone Arch',
        'A great natural arch of rock over the road, lanterns along it, hoodoos beyond.',
        stoneArch,
        along(3, 18, 8, 14),
      ),
      d(
        'cavern',
        'Cliff Dwellings',
        'Rows of doorways carved into a cliff, some lit, ladders between the ledges, a fire below.',
        cliffDwellings,
        { eye: [0, 4, 12], target: [0, 12, -26], glide: 6 },
      ),
      d(
        'cavern',
        'Lamp Canyon',
        'A narrow canyon passage, rock walls leaning back high on both sides, lamps along its floor, flags across.',
        lampCanyon,
        along(2.6, 16, 5, 14),
      ),
      d(
        'cavern',
        'Hoodoo Field',
        'Tall stacked-rock pillars with cap stones, standing either side of a road out into the desert.',
        hoodooField,
        along(3, 18, 5, 12),
      ),
      d(
        'cavern',
        'Cave Shrine',
        'Inside a great cavern: lanterns hung on long threads from the vault, a round pool ringed with fire bowls.',
        caveShrine,
        { eye: [0, 4, 6], target: [0, 6, -24], glide: 5 },
      ),
    ],
  },
  {
    id: 'river',
    name: 'Water and river',
    label: 'Water',
    line: 'The river of Riverdust: a dusty river under a wooden bridge, an oasis of palms, a well with a pulley, irrigation channels, boats and water steps.',
    designs: [
      d(
        'river',
        'Plank Bridge',
        'A dusty river running away between palms, a humped wooden bridge across it with lanterns on its posts.',
        plankBridge,
        { eye: [0, 4, 16], target: [0, 3, -40], glide: 10 },
      ),
      d(
        'river',
        'Palm Oasis',
        'A pool ringed with palms and lanterns, tents beyond, the dunes behind.',
        palmOasis,
        { eye: [0, 5, 6], target: [0, 2, -32], glide: 6 },
      ),
      d(
        'river',
        'Pulley Well',
        'A round well with two posts, a beam and a pulley, the bucket rising and falling slowly, a trough and a palm.',
        pulleyWell,
        { eye: [7, 3.4, 9], target: [0, 1.8, 0], glide: 3 },
      ),
      d(
        'river',
        'Channel Fields',
        'Straight irrigation channels running to the vanishing point, palms between, sluice beams across.',
        channelFields,
        { eye: [0, 5, 18], target: [0, 1, -60], glide: 12 },
      ),
      d(
        'river',
        'River Boats',
        'Small boats with lanterns drifting slowly down a wide river between palms.',
        riverBoats,
        { eye: [0, 5, 18], target: [0, 1, -40], glide: 10 },
      ),
      d(
        'river',
        'Water Steps',
        'Steps down to the river along its bank, shrines along the top, floating lamps drifting downstream.',
        waterSteps,
        { eye: [4, 4, 18], target: [-2, 1, -40], glide: 10 },
      ),
    ],
  },
  {
    id: 'race',
    name: 'Race gate',
    label: 'Race gate',
    line: 'The start and finish of the desert races: monumental gates, grandstands under burgundy shade cloths, the start line, the paddock and the timing tower.',
    designs: [
      d(
        'race',
        'Sun Gate',
        'A monumental adobe gate over the track: two pylons, a lintel hung with golden lamps and long banners, flags on top, banner poles beyond.',
        sunGateDesign,
        { eye: [0, 3, 34], target: [0, 9, -20], glide: 14 },
      ),
      d(
        'race',
        'Timber Gantry',
        'A trussed timber gantry over the start line, strings of lamps sagging under it, banners, lamp posts down the straight.',
        timberGateDesign,
        { eye: [0, 3, 30], target: [0, 7, -20], glide: 14 },
      ),
      d(
        'race',
        'Rock Gate',
        'Two stacked rock pillars and a great lintel stone, prayer flags and lanterns strung between, hoodoos down the track.',
        rockGate,
        { eye: [0, 3, 32], target: [0, 10, -20], glide: 14 },
      ),
      d(
        'race',
        'Grandstand Straight',
        'The gate with grandstands on both sides receding down the straight, burgundy shade cloths, lamp rails and the crowd as warm dots.',
        grandstandStraight,
        { eye: [0, 3.4, 30], target: [0, 6, -40], glide: 16 },
      ),
      d(
        'race',
        'Start Line',
        'A lamp tunnel leading in to the start line, the grid painted in light, banner poles either side, the timing tower.',
        startLine,
        { eye: [0, 2.6, 56], target: [0, 4, 0], glide: 16 },
      ),
      d(
        'race',
        'Paddock',
        'The pit lane: paddock canopies in a row, the lit pit wall, prayer flags over it, a grandstand and the timing tower opposite.',
        paddock,
        { eye: [3, 4, 22], target: [3, 3, -30], glide: 10 },
      ),
      d(
        'race',
        'Finish Arena',
        'The whole finish: the gate, a lamp tunnel beyond it, grandstands on both sides front and back, the timing tower and banner rows.',
        finishArena,
        { eye: [0, 4, 48], target: [0, 6, -20], glide: 16 },
      ),
    ],
  },
];

/** Every design, by id. */
export const DESIGNS: Design[] = CATEGORIES.flatMap((c) => c.designs);

/* ---------- models: built once, kept in budget ---------- */

export type DesignModel = {
  parts: Part[];
  count: number;
  /** For every site, its part; and each part's first site. */
  partOf: Uint16Array;
  start: Uint32Array;
};

/**
 * Parts thinned to the budget (at least one site each): the walls, cloth and rock first, the
 * lamps kept whole while they take under half the budget, so a thinned scene still glows.
 */
export function fitBudget(parts: Part[], budget = DESIGN_BUDGET): Part[] {
  const live = parts.filter((p) => p.n > 0);
  const total = live.reduce((a, p) => a + p.n, 0);
  if (total <= budget) return live;
  const isLamp = (p: Part) => (p.tw ?? 0) > 0;
  const lamps = live.filter(isLamp).reduce((a, p) => a + p.n, 0);
  const room = budget - live.length;
  if (lamps < budget / 2) {
    const k = (room - lamps) / (total - lamps);
    return live.map((p) => (isLamp(p) ? p : { ...p, n: Math.max(1, Math.floor(p.n * k)) }));
  }
  const k = room / total;
  return live.map((p) => ({ ...p, n: Math.max(1, Math.floor(p.n * k)) }));
}

const models = new Map<string, DesignModel>();
/** A design's model, built once under its id. */
export function designModel(id: string): DesignModel {
  const had = models.get(id);
  if (had) return had;
  const D = DESIGNS.find((x) => x.id === id) ?? (DESIGNS[0] as Design);
  const parts = fitBudget(D.make());
  const count = parts.reduce((a, p) => a + p.n, 0);
  const partOf = new Uint16Array(count);
  const start = new Uint32Array(parts.length);
  let s = 0;
  parts.forEach((p, i) => {
    start[i] = s;
    partOf.fill(i, s, s + p.n);
    s += p.n;
  });
  const M = { parts, count, partOf, start };
  models.set(id, M);
  return M;
}

/** Where to draw a design: its origin, turn round the vertical (radians) and scale. */
export type Placement = { x: number; y?: number; z: number; rot?: number; scale?: number };

/**
 * Site s of a design's model at time t, drawn at a placement: its point and colour into o
 * (x, y, z, r, g, b), brightness k. The colour drifts slowly and a lamp breathes softly (the
 * mellow rule: nothing flashes). False if the site is not a number.
 */
export function designSite(
  M: DesignModel,
  s: number,
  t: number,
  at: Placement,
  k: number,
  o: number[],
): boolean {
  const i = M.partOf[s] as number;
  const part = M.parts[i] as Part;
  const q = part.f((s - (M.start[i] as number) + 0.5) / part.n, s, t);
  const sc = at.scale ?? 1;
  const r = at.rot ?? 0;
  const c = Math.cos(r);
  const n = Math.sin(r);
  o[0] = at.x + (q[0] * c + q[2] * n) * sc;
  o[1] = (at.y ?? 0) + q[1] * sc;
  o[2] = at.z + (-q[0] * n + q[2] * c) * sc;
  const tw = part.tw ? 1 - part.tw * (0.5 + 0.5 * Math.sin(t * 0.8 + s * 1.7)) : 1;
  const drift = 0.9 + 0.1 * Math.sin(t * 0.21 + s * 0.013);
  const b = 0.46 * k * tw * drift;
  o[3] = part.rgb[0] * b;
  o[4] = part.rgb[1] * b;
  o[5] = part.rgb[2] * b;
  return Number.isFinite(o[0]) && Number.isFinite(o[1]) && Number.isFinite(o[2]);
}

/**
 * A whole design as grains at a placement and time, for the racing worlds and anything else:
 * flat positions and colours, three numbers a grain each.
 */
export function designGrains(
  id: string,
  at: Placement,
  t = 0,
): { positions: Float32Array; colours: Float32Array } {
  const M = designModel(id);
  const positions = new Float32Array(M.count * 3);
  const colours = new Float32Array(M.count * 3);
  const o = [0, 0, 0, 0, 0, 0];
  for (let s = 0; s < M.count; s++) {
    designSite(M, s, t, at, 1, o);
    positions.set([o[0] as number, o[1] as number, o[2] as number], s * 3);
    colours.set([o[3] as number, o[4] as number, o[5] as number], s * 3);
  }
  return { positions, colours };
}
