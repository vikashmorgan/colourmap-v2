/*
 * Fifteen new tall buildings for the City of Dreams (docs/specs/art-city.md, "Taller landmarks and
 * fireworks"), one or two in every quarter, each on a block of its own kept open for it, in its
 * quarter's colour. Our own designs, each with a name: no real named building, no other game's
 * look. Drawn as grains from the few primitives of lib/city-shapes.ts. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "ALL THE COOL BUILDINGS SERIES MUST BE MUCH BIGGER. MAKE 15 MORE OF THEM AND ADD
 * THEM TO THE CITY."
 *
 * Slim and tall (125 to 170 high, no more than 12 from their axis), so each stands on one block and
 * towers over the quarter round it. Light, as the Studio's other additions are: the Ship flies
 * through them. Their blocks are off the avenue, out from under the metro, off the race courses.
 */

import type { RGB, Vec3 } from './bigbang';
import { CODE_GREEN } from './city-code';
import {
  BLOCK_X,
  BLOCK_Z,
  boxDist,
  C,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';
import {
  ball,
  cached,
  type Model,
  model,
  type Part,
  ring,
  seg,
  shapeSite,
  shift,
  square,
  turned,
  twistBox,
} from './city-shapes';

/** A quarter's three tones: its colour, a lighter (toward warm white, never white) and a deeper. */
const tones = (m: RGB): [RGB, RGB, RGB] => [
  m,
  mix(m, C.warm, 0.4),
  scale(mix(m, C.violet, 0.25), 0.7),
];
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/* ---------- the fifteen ---------- */

/** Lantern Spindle: seven six-sided lanterns threaded up a gold spindle. */
function lanternSpindle(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [seg([0, 0, 0], [0, 156, 0], 80, C.gold)];
  for (let k = 0; k < 7; k++) {
    const R = 6 - 0.4 * k;
    const y0 = 14 + k * 20;
    parts.push(
      ...shift(
        turned((v) => [R * (0.6 + 0.4 * Math.sin(Math.PI * v)), 12 * v], 6, 4, 220, m, light, 0.12),
        [0, y0, 0],
      ),
    );
    parts.push(ring([0, y0, 0], R * 0.6, 20, C.gold), ring([0, y0 + 12, 0], R * 0.6, 20, C.gold));
    parts.push(ball([0, y0 + 6, 0], R * 0.25, 10, C.warm, 1, 0.3));
  }
  parts.push(
    ...twistBox(
      0,
      10,
      () => 5,
      () => 0,
      3,
      120,
      deep,
      deep,
    ),
  );
  return model(parts, 156, 7);
}

/** Lotus Stair: twelve petal terraces turning up round a column, each smaller. */
function lotusStair(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [];
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * TAU;
    parts.push(
      seg([Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5], [Math.cos(a), 140, Math.sin(a)], 60, deep),
    );
  }
  for (let k = 0; k < 12; k++) {
    const a0 = k * 2.4;
    const y = 10 + k * 10.5;
    const L = 10 - 0.5 * k;
    parts.push({
      n: 110,
      f: (u) => {
        // A petal: out from the column and back, its edges bowing apart, its tip lifted.
        const side = u < 0.5 ? 1 : -1;
        const v = u < 0.5 ? u * 2 : (1 - u) * 2;
        const r = L * v;
        const a = a0 + side * 0.45 * Math.sin(Math.PI * v);
        return [Math.cos(a) * r, y + 3 * v * v, Math.sin(a) * r];
      },
      rgb: k % 2 ? m : light,
    });
    parts.push(ring([0, y, 0], 2, 12, C.gold));
  }
  parts.push(ball([0, 142, 0], 2.2, 30, light, 1, 0.25));
  return model(parts, 144, 10);
}

/** Crescent Needle: a tapering needle, three crescents standing round it, each turned. */
function crescentNeedle(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = twistBox(
    0,
    160,
    (v) => lerp(3, 0.4, v),
    () => 0,
    32,
    700,
    light,
    deep,
  );
  for (const [y, r, turn] of [
    [50, 9, 0],
    [95, 7, 1.1],
    [135, 5, 2.2],
  ] as const)
    parts.push({
      n: 160,
      f: (u) => {
        const a = -Math.PI / 2 + (u - 0.5) * 1.4 * Math.PI;
        const p = Math.cos(a) * r;
        return [p * Math.cos(turn), y + Math.sin(a) * r + r, p * Math.sin(turn)];
      },
      rgb: m,
    });
  parts.push(ball([0, 161, 0], 1, 10, C.gold, 1, 0.3));
  return model(parts, 162, 9);
}

/** Helix Exchange: two strands winding up to 170, rungs between them. */
function helixExchange(m: RGB): Model {
  const [, light, deep] = tones(m);
  const H = 170;
  const at = (v: number, k: number): Vec3 => {
    const a = v * 5 * TAU + k * Math.PI;
    const r = 8 - 3 * v;
    return [Math.cos(a) * r, H * v, Math.sin(a) * r];
  };
  const parts: Part[] = [
    { n: 600, f: (u) => at(u, 0), rgb: light },
    { n: 600, f: (u) => at(u, 1), rgb: m },
    {
      n: 500,
      f: (u) => {
        const k = Math.floor(u * 50);
        const v = (k + 0.5) / 50;
        const a = at(v, 0);
        const b = at(v, 1);
        const w = frac(u * 50);
        return [lerp(a[0], b[0], w), a[1], lerp(a[2], b[2], w)];
      },
      rgb: deep,
    },
    seg([0, 0, 0], [0, H + 6, 0], 60, scale(light, 0.7)),
  ];
  return model(parts, H + 6, 8);
}

/** Lily Bell: a slim stem opening into a tall flared cup, rings of water light at its foot. */
function lilyBell(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [
    ...turned((v) => [2.4 + 7.6 * v ** 4, 132 * v], 14, 24, 1300, m, light),
    ...[3, 6, 9].map((r) => ring([0, 0.3, 0], r, r * 10, scale(C.cyan, 0.6), 'y', 0.3)),
    ring([0, 132, 0], 10, 80, light),
    ring([0, 90, 0], 3.4, 24, deep),
    ball([0, 126, 0], 2, 20, mix(light, C.warm, 0.4), 1, 0.3),
  ];
  return model(parts, 132, 10);
}

/** Hourglass Tower: straight lines drawn between two turned rings make its waist. */
function hourglassTower(m: RGB): Model {
  const [, light, deep] = tones(m);
  const H = 150;
  const parts: Part[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    parts.push(
      seg(
        [Math.cos(a) * 9, 0, Math.sin(a) * 9],
        [Math.cos(a + 2.4) * 9, H, Math.sin(a + 2.4) * 9],
        60,
        k % 2 ? m : light,
      ),
    );
  }
  const waist = 9 * Math.cos(1.2);
  parts.push(
    ring([0, 0.2, 0], 9, 70, deep),
    ring([0, H, 0], 9, 70, light),
    ring([0, H / 2, 0], waist, 30, C.gold),
  );
  parts.push(ball([0, H + 3, 0], 1.6, 14, light, 1, 0.3));
  return model(parts, H + 5, 9);
}

/** Sunleaf Column: a column with leaves fanning out at nine levels, a gold sun on top. */
function sunleafColumn(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = twistBox(
    0,
    140,
    () => 1.6,
    () => 0,
    14,
    380,
    deep,
    deep,
  );
  for (let k = 0; k < 9; k++) {
    const y = 14 + k * 14;
    for (let j = 0; j < 4; j++) {
      const a0 = (j / 4) * TAU + k * 0.4;
      parts.push({
        n: 34,
        f: (u) => {
          const side = u < 0.5 ? 1 : -1;
          const v = u < 0.5 ? u * 2 : (1 - u) * 2;
          const r = 1.6 + 8 * v;
          const a = a0 + side * 0.25 * Math.sin(Math.PI * v);
          return [Math.cos(a) * r, y + 4 * v, Math.sin(a) * r];
        },
        rgb: k % 2 ? m : light,
        tw: 0.2,
      });
    }
  }
  parts.push(ball([0, 146, 0], 4, 70, C.gold, 1, 0.2));
  return model(parts, 150, 10);
}

/** Halo Stack: a slender column ringed by seven tilted halos, each leaning its own way, turning slowly. */
function haloStack(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [
    seg([0, 0, 0], [0, 140, 0], 70, deep),
    seg([0.6, 0, 0], [0.4, 140, 0], 70, deep),
  ];
  for (let k = 0; k < 7; k++) {
    const y = 20 + k * 18;
    const tilt = 0.35 + 0.1 * (k % 3);
    parts.push({
      n: 120,
      f: (u, _s, t) => {
        const a = u * TAU;
        const turn = k * 0.9 + t * 0.03 * (k % 2 ? 1 : -1);
        const x = Math.cos(a) * 7.5;
        const z = Math.sin(a) * 7.5;
        const y2 = y + z * Math.sin(tilt);
        const z2 = z * Math.cos(tilt);
        return [
          x * Math.cos(turn) - z2 * Math.sin(turn),
          y2,
          x * Math.sin(turn) + z2 * Math.cos(turn),
        ];
      },
      rgb: k % 2 ? m : light,
    });
  }
  parts.push(ball([0, 142, 0], 2.5, 26, C.gold, 1, 0.25));
  return model(parts, 145, 8);
}

/** Ivory Echo: square frames rising, each smaller and turned a step more, posts between them. */
function ivoryEcho(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [];
  const N = 14;
  const w = (k: number) => 9 - (6 * k) / N;
  const a = (k: number) => (k * Math.PI) / 2 / N;
  for (let k = 0; k <= N; k++) {
    const y = k * 10.5;
    parts.push(square(w(k), y, a(k), 60, k % 2 ? light : m));
    if (k < N)
      for (const [cx, cz] of CORNERS) {
        const p = (j: number, yy: number): Vec3 => {
          const x = cx * w(j);
          const z = cz * w(j);
          return [
            x * Math.cos(a(j)) - z * Math.sin(a(j)),
            yy,
            x * Math.sin(a(j)) + z * Math.cos(a(j)),
          ];
        };
        parts.push(seg(p(k, y), p(k + 1, y + 10.5), 8, deep));
      }
  }
  parts.push(seg([0, N * 10.5, 0], [0, N * 10.5 + 10, 0], 10, C.gold));
  return model(parts, N * 10.5 + 10, 13);
}

/** Cog Tower: nine gears stacked on a shaft, turning very slowly, each the other way. */
function cogTower(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [];
  for (const [cx, cz] of CORNERS)
    parts.push(seg([cx * 1.4, 0, cz * 1.4], [cx * 1.4, 150, cz * 1.4], 50, deep));
  for (let k = 0; k < 9; k++) {
    const y = 12 + k * 16;
    const R = 9 - 0.4 * k;
    parts.push({
      n: 200,
      f: (u, _s, t) => {
        const a = u * TAU + t * 0.03 * (k % 2 ? 1 : -1);
        const tooth = frac(u * 14) < 0.5 ? 1 : 0.82;
        return [Math.cos(a) * R * tooth, y, Math.sin(a) * R * tooth];
      },
      rgb: k % 2 ? m : light,
    });
    parts.push(ring([0, y, 0], R * 0.45, 24, deep));
  }
  parts.push(ring([0, 150, 0], 2, 16, mix(C.amber, m, 0.4), 'y', 0.3));
  return model(parts, 152, 9);
}

/** Vertebra Tower: discs stacked up a spine that sways in a gentle S. */
function vertebraTower(m: RGB): Model {
  const [, light, deep] = tones(m);
  const H = 155;
  const cx = (v: number) => 3 * Math.sin(Math.PI * v * 1.5);
  const parts: Part[] = [{ n: 120, f: (u) => [cx(u), H * u, 0], rgb: deep }];
  for (let k = 0; k < 18; k++) {
    const v = (k + 0.5) / 18;
    const r = 6 - 3 * v;
    parts.push(ring([cx(v), H * v, 0], r, 50, k % 2 ? m : light));
    parts.push(ring([cx(v), H * v - 1.2, 0], r * 0.7, 26, deep));
  }
  return model(parts, H, 9);
}

/** Seed Pod: four tall lattice pods up a stalk, a glowing seed in each. */
function seedPod(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [seg([0, 0, 0], [0, 145, 0], 70, deep)];
  let y = 18;
  for (const r of [7.5, 6.5, 5.5, 4.5]) {
    const hy = r * 1.7;
    parts.push(ball([0, y + hy, 0], r, r * 60, r > 6 ? m : light, 1.7));
    parts.push(ball([0, y + hy, 0], r * 0.3, 16, mix(light, C.gold, 0.5), 1.4, 0.3));
    y += 2 * hy + 4;
  }
  return model(parts, Math.max(145, y), 8);
}

/** Sunboat Mast: a tapering mast, and high on it a crescent boat carrying a sun. */
function sunboatMast(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = twistBox(
    0,
    140,
    (v) => lerp(2.4, 0.8, v),
    () => 0,
    20,
    600,
    light,
    deep,
  );
  parts.push({
    n: 220,
    f: (u) => {
      const a = Math.PI + (0.15 + 0.7 * u) * Math.PI;
      return [0, 152 + Math.sin(a) * 11 + 2, Math.cos(a) * 11];
    },
    rgb: C.gold,
  });
  parts.push(seg([0, 141, -9], [0, 141, 9], 30, m));
  parts.push(ring([0, 157, 0], 3.6, 50, mix(C.gold, C.warm, 0.4), 'x', 0.15));
  return model(parts, 161, 11);
}

/** Neon Prism: a triangular tower twisting a third round as it rises. */
function neonPrism(m: RGB): Model {
  const [, light, deep] = tones(m);
  const H = 150;
  const at = (v: number, c: number): Vec3 => {
    const a = v * (TAU / 3) + (c * TAU) / 3;
    const r = 8 - 2 * v;
    return [Math.cos(a) * r, H * v, Math.sin(a) * r];
  };
  const parts: Part[] = [0, 1, 2].map((c) => ({ n: 260, f: (u: number) => at(u, c), rgb: light }));
  parts.push({
    n: 900,
    f: (u) => {
      const k = Math.floor(u * 30);
      const v = (k + 0.5) / 30;
      const w = frac(u * 30) * 3;
      const c = Math.floor(w);
      const p = at(v, c);
      const q = at(v, c + 1);
      const f = w - c;
      return [lerp(p[0], q[0], f), p[1], lerp(p[2], q[2], f)];
    },
    rgb: m,
  });
  parts.push(ring([0, 0.3, 0], 9, 60, deep));
  parts.push(seg([0, H, 0], [0, H + 8, 0], 10, light));
  return model(parts, H + 8, 8);
}

/** Cascade Monolith: six slabs stacked, each smaller and set back, light falling down them. */
function cascadeMonolith(m: RGB): Model {
  const [, light, deep] = tones(m);
  const parts: Part[] = [];
  let y = 0;
  for (let k = 0; k < 6; k++) {
    const w = 8 - k;
    const h = 30 - 2 * k;
    const ox = k * 0.5;
    parts.push(
      ...shift(
        twistBox(
          y,
          y + h,
          () => w,
          () => 0,
          3,
          260,
          light,
          deep,
        ),
        [ox, 0, 0],
      ),
    );
    const y0 = y;
    parts.push({
      n: 80,
      f: (u, s, t) => {
        const face = s % 2 ? 1 : -1;
        const lane = (frac(u * 7.3) - 0.5) * 2 * w * 0.9;
        const yy = y0 + h * (1 - frac(t * 0.07 + u * 3.1 + k * 0.2));
        return [ox + lane, yy, face * (w + 0.05)];
      },
      rgb: mix(m, C.white, 0.15),
    });
    y += h;
  }
  return model(parts, y, 11);
}

/* ---------- where they stand ---------- */

export type NewBuilding = {
  name: string;
  /** Its block, tile-local: column −6..5, row 0..55. */
  I: number;
  J: number;
  /** Its quarter, and that quarter's colour. */
  d: string;
  hue: RGB;
  make: (m: RGB) => Model;
};

/**
 * The fifteen and their blocks: off the avenue, out from under the metro, no gate of a race within
 * 30, no landmark within 60, never on a big square, one or two to a quarter.
 */
export const BUILDING_SPOTS: NewBuilding[] = [
  { name: 'Lantern Spindle', I: 5, J: 1, d: 'chinatown', hue: C.red, make: lanternSpindle },
  { name: 'Lotus Stair', I: -2, J: 10, d: 'indian', hue: C.saffron, make: lotusStair },
  { name: 'Crescent Needle', I: 1, J: 14, d: 'oriental', hue: C.turquoise, make: crescentNeedle },
  { name: 'Helix Exchange', I: -5, J: 18, d: 'heights', hue: C.cyan, make: helixExchange },
  { name: 'Lily Bell', I: 2, J: 18, d: 'canals', hue: C.violet, make: lilyBell },
  { name: 'Hourglass Tower', I: 4, J: 17, d: 'canals', hue: C.violet, make: hourglassTower },
  { name: 'Sunleaf Column', I: -5, J: 26, d: 'golden', hue: C.gold, make: sunleafColumn },
  { name: 'Halo Stack', I: -2, J: 29, d: 'golden', hue: C.gold, make: haloStack },
  { name: 'Ivory Echo', I: 2, J: 25, d: 'temples', hue: C.ivory, make: ivoryEcho },
  { name: 'Cog Tower', I: -2, J: 33, d: 'industrial', hue: C.steel, make: cogTower },
  { name: 'Vertebra Tower', I: -5, J: 39, d: 'industrial', hue: C.steel, make: vertebraTower },
  { name: 'Seed Pod', I: 1, J: 37, d: 'domes', hue: C.leaf, make: seedPod },
  { name: 'Sunboat Mast', I: -6, J: 44, d: 'egypt', hue: C.sand, make: sunboatMast },
  { name: 'Neon Prism', I: 4, J: 45, d: 'market', hue: C.magenta, make: neonPrism },
  { name: 'Cascade Monolith', I: 5, J: 53, d: 'code', hue: CODE_GREEN, make: cascadeMonolith },
];

/** A new building's model, built once. */
export const buildingModel = (b: NewBuilding): Model =>
  cached(`new ${b.name}`, () => b.make(b.hue));
/** Where it stands, tile-local: its block's middle. */
export const buildingAt = (b: NewBuilding): [number, number] => [
  (b.I + 0.5) * BLOCK_X,
  (b.J + 0.5) * BLOCK_Z,
];

/** The fifteen within sight, as the Ship's items: dense enough to read from 300 away. */
export function newBuildingItems(
  eye: Vec3,
  t: number,
  R: number,
  ahead: (x: number, z: number, rad: number) => boolean,
  out: Item[],
  lift = 1,
) {
  const ox = nearest(0, eye[0], TILE_X);
  BUILDING_SPOTS.forEach((b, bi) => {
    const M = buildingModel(b);
    const [lx, lz] = buildingAt(b);
    for (const mx of [-1, 0, 1]) {
      const x = lx + ox + mx * TILE_X;
      if (Math.abs(x - eye[0]) > R + 20) continue;
      const n0 = Math.floor((eye[2] - R - lz) / TILE_Z);
      const n1 = Math.floor((eye[2] + R - lz) / TILE_Z) + 1;
      for (let n = n0; n <= n1; n++) {
        const z = lz + n * TILE_Z;
        if (Math.hypot(x - eye[0], z - eye[2]) > R + M.r) continue;
        if (!ahead(x, z, M.r + 10) && eye[1] < GROUND + 80) continue;
        out.push({
          d: boxDist(eye, [x - M.r, GROUND, z - M.r], [x + M.r, GROUND + M.top, z + M.r]),
          gid: mixId(bi * 31 + n, 7373 + mx),
          count: M.count,
          weight: 1.5,
          probe: [
            [x, GROUND + M.top * 0.95, z],
            [x, GROUND + M.top * 0.6, z],
            [x, GROUND + M.top * 0.25, z],
          ],
          site: (s, o) => shapeSite(M, s, t, x, GROUND, z, lift, o),
        });
      }
    }
  });
}
