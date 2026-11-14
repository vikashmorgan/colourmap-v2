/*
 * The landmarks' tall crowns (docs/specs/art-city.md, "Taller landmarks and fireworks"): each
 * quarter's landmark raised two to ten times its height with a silhouette of our own, so it reads
 * from far across the city. Drawn as grains over the landmark it crowns (lib/city-game.ts keeps the
 * old landmark as the crown's foot); light, so the Ship flies through them as through the Studio's
 * other additions. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "a lot of landmark buildings are not tall enough. they need to be much bigger like the
 * arch or other innovative buildings."
 */

import type { Vec3 } from './bigbang';
import { CODE_GREEN } from './city-code';
import { C, frac, GROUND, type Item, lerp, mix, mixId, scale, TAU } from './city-grid';
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

/** Which landmark a crown sits on: its kind, and for a Studio landmark its set. */
export type CrownKey =
  | 'pagoda'
  | 'race'
  | 'shikhara'
  | 'mosque'
  | 'nova'
  | 'temples'
  | 'factories'
  | 'domes'
  | 'pyramid'
  | 'dataspire';

/* ---------- Chinatown: the lantern tower over the pagoda ---------- */

/** Six great lanterns stacked on a gold mast over the nine roofs, each smaller, to 190. */
function lanternTower(): Model {
  const parts: Part[] = [seg([0, 62, 0], [0, 190, 0], 90, C.gold)];
  for (let k = 0; k < 6; k++) {
    const R = 8 - 0.8 * k;
    const H = 13 - 0.9 * k;
    const y0 = 70 + k * 19;
    const prof = (v: number): [number, number] => [
      R * (0.55 + 0.45 * Math.sin(Math.PI * v)),
      y0 + H * v,
    ];
    parts.push(
      ...turned(prof, 12, 5, 360 - k * 30, scale(C.red, 0.95), mix(C.red, C.amber, 0.35), 0.15),
    );
    parts.push(ring([0, y0, 0], R * 0.6, 26, C.gold), ring([0, y0 + H, 0], R * 0.6, 26, C.gold));
    // A warm heart in each lantern, breathing slowly.
    parts.push(ball([0, y0 + H / 2, 0], R * 0.3, 18, C.warm, 1, 0.3));
    parts.push(seg([0, y0, 0], [0, y0 - 3, 0], 4, C.gold));
  }
  for (const y of [184, 187]) parts.push(ring([0, y, 0], 1.2, 12, C.gold));
  return model(parts, 190, 8);
}

/* ---------- Chinatown's race plaza: two great moon arches crossing over it ---------- */

/** Two arches along the plaza's diagonals, crossing at 128 over the crossing; you fly under them. */
function moonArches(): Model {
  const A = 21;
  const H = 128;
  const parts: Part[] = [];
  for (const sg of [1, -1]) {
    // The arch from (-A, -sg A) to (A, sg A): three bands side by side, ribs across them.
    const at = (u: number, off: number): Vec3 => {
      const x = lerp(-A, A, u);
      const z = sg * x;
      const h = H * Math.sin(Math.PI * u) ** 0.55;
      // Off the arch's line, across it on the ground.
      return [x + (off * sg) / Math.SQRT2, h, z - off / Math.SQRT2];
    };
    for (const off of [-1.8, 0, 1.8])
      parts.push({
        n: off === 0 ? 260 : 200,
        f: (u) => at(u, off),
        rgb: off === 0 ? C.gold : C.red,
      });
    parts.push({
      n: 220,
      f: (u) => {
        const k = Math.floor(u * 44);
        const w = frac(u * 44) * 3.6 - 1.8;
        return at((k + 0.5) / 44, w);
      },
      rgb: scale(C.red, 0.7),
    });
    // Lanterns hung under the arch.
    for (let k = 1; k < 8; k++) {
      const p = at(k / 8, 0);
      parts.push(ball([p[0], p[1] - 3, p[2]], 1.1, 10, mix(C.red, C.amber, 0.4), 1, 0.3));
    }
  }
  // The moon where they cross.
  parts.push(
    ring([0, H + 6, 0], 6, 70, C.gold, 'x', 0.2),
    ring([0, H + 6, 0], 6, 70, C.gold, 'z', 0.2),
  );
  return model(parts, H + 12, A * Math.SQRT2);
}

/* ---------- the Indian quarter: a stepped temple mountain ---------- */

const shikharaParts = (R: number, H: number, n: number): Part[] => {
  const prof = (v: number): [number, number] => [
    R * (1 - 0.82 * v ** 1.5) * (1 + 0.1 * Math.sin(Math.PI * v)),
    H * v,
  ];
  return [
    ...turned(prof, 16, 16, n, scale(C.saffron, 0.95), C.marigold),
    ring([0, H + 0.6, 0], R * 0.3, n * 0.05, C.gold),
    seg([0, H + 1, 0], [0, H + 6, 0], n * 0.03, C.gold),
  ];
};
/** A plinth of terraces, four great corner spires to 88, and an upper spire over the old one, to 138. */
function templeMountain(): Model {
  const parts: Part[] = [];
  for (let k = 0; k < 4; k++) parts.push(square(27 - 2 * k, 2 * k, 0, 90, scale(C.saffron, 0.6)));
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    parts.push(...shift(shikharaParts(5.5, 80, 420), [(a as number) * 18, 8, (b as number) * 18]));
  parts.push(...shift(shikharaParts(6.5, 84, 600), [0, 48, 0]));
  return model(parts, 138, 27);
}

/* ---------- Istanbul: great minarets, a dome stack and a floating ring ---------- */

function mosqueCrown(): Model {
  const parts: Part[] = [];
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = (a as number) * 26;
    const z = (b as number) * 26;
    // A great minaret at each corner of the plaza, three balconies up it, to 142.
    for (const [ox, oz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      parts.push(
        seg(
          [x + (ox as number), 0, z + (oz as number)],
          [x + (ox as number) * 0.7, 130, z + (oz as number) * 0.7],
          70,
          C.ivory,
        ),
      );
    for (const y of [50, 85, 115]) parts.push(ring([x, y, z], 2.2, 18, C.gold));
    parts.push(
      ...shift(
        turned((v) => [0.9 * (1 - v), 130 + 12 * v], 6, 3, 40, C.turquoise, C.turquoise),
        [x, 0, z],
      ),
    );
  }
  // The dome stack over the great dome: three drums and domes, each smaller.
  let y = 25;
  for (const r of [8, 6, 4]) {
    parts.push(ring([0, y, 0], r, r * 8, C.gold));
    parts.push(
      seg([r, y, 0], [r, y + r, 0], 6, C.ivory),
      seg([-r, y, 0], [-r, y + r, 0], 6, C.ivory),
    );
    parts.push(ball([0, y + r, 0], r, r * 26, C.turquoise, 0.9, 0.15, true));
    y += 2 * r + 1;
  }
  parts.push(seg([0, y, 0], [0, y + 6, 0], 8, C.gold));
  // A great ring floating over it all, turning very slowly: you can fly through its middle.
  parts.push({
    n: 220,
    f: (u, _s, t) => {
      const a = u * TAU;
      const turn = t * 0.05;
      const p = Math.cos(a) * 16;
      return [p * Math.cos(turn), 104 + Math.sin(a) * 16, p * Math.sin(turn)];
    },
    rgb: mix(C.turquoise, C.white, 0.2),
    tw: 0.15,
  });
  return model(parts, 142, 27);
}

/* ---------- the Heights: the sail tower over the Nova Core ---------- */

/** Two curved blades twisting up from round the Core to a needle at 285. */
function sailTower(): Model {
  const parts: Part[] = [];
  const Y0 = 30;
  const Y1 = 270;
  const r = (v: number) => 20 * (1 - v) ** 0.7 + 2;
  const span = (v: number) => 1.1 * (1 - v) + 0.15;
  for (const a0 of [0, Math.PI]) {
    const th = (v: number) => a0 + 1.1 * v;
    // The blade's face: a grid of grains on its curved surface.
    parts.push({
      n: 1100,
      f: (u) => {
        const v = frac(u * 37.3);
        const w = u;
        const a = th(v) + (w - 0.5) * span(v);
        return [Math.cos(a) * r(v), lerp(Y0, Y1, v), Math.sin(a) * r(v)];
      },
      rgb: scale(C.cyan, 0.55),
    });
    // Its two edges, bright.
    for (const e of [-0.5, 0.5])
      parts.push({
        n: 260,
        f: (v) => {
          const a = th(v) + e * span(v);
          return [Math.cos(a) * r(v), lerp(Y0, Y1, v), Math.sin(a) * r(v)];
        },
        rgb: mix(C.cyan, C.white, 0.4),
      });
    // Legs down to the plaza.
    parts.push(
      seg(
        [Math.cos(a0) * 22, 0, Math.sin(a0) * 22],
        [Math.cos(a0) * r(0), Y0, Math.sin(a0) * r(0)],
        30,
        C.cyan,
      ),
    );
  }
  for (let y = Y0 + 20; y < Y1; y += 24) {
    const v = (y - Y0) / (Y1 - Y0);
    parts.push(ring([0, y, 0], r(v) * 0.9, 30, scale(C.violet, 0.7)));
  }
  parts.push(seg([0, Y1, 0], [0, 285, 0], 20, C.white));
  parts.push(ball([0, 286, 0], 1.4, 14, C.cyan, 1, 0.3));
  return model(parts, 287, 22);
}

/* ---------- the Temple quarter: a stair tower on the ziggurat ---------- */

function stairTower(): Model {
  const parts: Part[] = [];
  const T = 10;
  const yAt = (k: number) => 22 + k * 13;
  const wAt = (k: number) => 14 - k * 1.15;
  for (let k = 0; k < T; k++) {
    parts.push(square(wAt(k), yAt(k), 0, 70 - k * 3, C.ivory));
    parts.push(square(wAt(k), yAt(k) + 9, 0, 50 - k * 2, scale(C.ivory, 0.6)));
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      parts.push(
        seg(
          [(cx as number) * wAt(k), yAt(k), (cz as number) * wAt(k)],
          [(cx as number) * wAt(k), yAt(k) + 9, (cz as number) * wAt(k)],
          6,
          scale(C.ivory, 0.7),
        ),
      );
    // A stair up the middle of every side, to the terrace above.
    if (k < T - 1)
      for (let side = 0; side < 4; side++) {
        const a = (side * Math.PI) / 2;
        const p = (w: number, y: number): Vec3 => [Math.cos(a) * w, y, Math.sin(a) * w];
        parts.push(
          seg(p(wAt(k) + 1, yAt(k)), p(wAt(k + 1), yAt(k + 1)), 16, mix(C.ivory, C.gold, 0.4)),
        );
      }
  }
  // The light rising: a small glow climbing the stairs, about a minute from foot to top.
  parts.push({
    n: 30,
    f: (u, s, t) => {
      const q = frac(t / 60 + 0.25 * Math.floor(u * 4));
      const k = Math.min(T - 2, Math.floor(q * (T - 1)));
      const f = q * (T - 1) - k;
      const a = (Math.floor(u * 4) * Math.PI) / 2;
      const w = lerp(wAt(k) + 1, wAt(k + 1), f);
      const y = lerp(yAt(k), yAt(k + 1), f) + 1;
      const j = frac(u * 4) - 0.5;
      return [
        Math.cos(a) * w - Math.sin(a) * j,
        y + 0.6 * Math.sin(s),
        Math.sin(a) * w + Math.cos(a) * j,
      ];
    },
    rgb: mix(C.gold, C.warm, 0.5),
  });
  parts.push(seg([0, yAt(T - 1) + 9, 0], [0, yAt(T - 1) + 22, 0], 14, C.gold));
  return model(parts, yAt(T - 1) + 22, 15);
}

/* ---------- the Industrial quarter: a twisting tower over the foundry ---------- */

function twistTower(): Model {
  const parts: Part[] = [
    ...twistBox(
      32,
      180,
      (v) => 9 - 4 * v,
      (v) => (Math.PI / 2) * v,
      30,
      1700,
      mix(C.steel, C.white, 0.25),
      scale(C.steel, 0.75),
    ),
  ];
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    parts.push(
      seg(
        [(a as number) * 12, 0, (b as number) * 12],
        [(a as number) * 9, 32, (b as number) * 9],
        20,
        C.steel,
      ),
    );
  // Furnace light at its foot, and slow rings of steam rising off its top and fading.
  parts.push(ring([0, 33, 0], 10, 60, mix(C.amber, C.steel, 0.3), 'y', 0.3));
  for (let k = 0; k < 3; k++)
    parts.push({
      n: 40,
      f: (u, _s, t) => {
        const q = frac(t / 18 + k / 3);
        const a = u * TAU;
        const r = 3 + 6 * q;
        return [Math.cos(a) * r, 182 + 14 * q, Math.sin(a) * r];
      },
      rgb: scale(mix(C.steel, C.white, 0.6), 0.5),
      tw: 0.2,
    });
  return model(parts, 196, 12);
}

/* ---------- the Solarpunk domes: a stack of glass domes ---------- */

function domeStack(): Model {
  const parts: Part[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    parts.push(
      seg(
        [Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4],
        [Math.cos(a) * 0.8, 138, Math.sin(a) * 0.8],
        70,
        scale(C.leaf, 0.7),
      ),
    );
  }
  const glass = mix(C.leaf, C.turquoise, 0.45);
  for (const [y, r] of [
    [30, 14],
    [58, 12],
    [84, 10],
    [106, 8],
    [124, 6],
  ] as const) {
    parts.push(ball([0, y, 0], r, r * 34, glass, 0.85));
    parts.push(ring([0, y, 0], r, r * 8, mix(glass, C.white, 0.3)));
    // Plants glowing under the glass.
    parts.push(ball([0, y - r * 0.3, 0], r * 0.5, r * 10, C.leaf, 0.6, 0.35));
  }
  parts.push(ball([0, 140, 0], 1.6, 16, mix(C.leaf, C.gold, 0.5), 1, 0.3));
  return model(parts, 142, 14);
}

/* ---------- Egypt: an obelisk floating over the pyramid, rings turning round it ---------- */

function floatingObelisk(): Model {
  const parts: Part[] = [];
  const Y0 = 52;
  const Y1 = 170;
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    parts.push(
      seg(
        [(a as number) * 3.4, Y0, (b as number) * 3.4],
        [(a as number) * 2, Y1, (b as number) * 2],
        220,
        C.sand,
      ),
    );
    parts.push(seg([(a as number) * 2, Y1, (b as number) * 2], [0, Y1 + 8, 0], 10, C.gold));
  }
  parts.push(
    ...twistBox(
      Y0,
      Y1,
      (v) => lerp(3.4, 2, v),
      () => 0,
      24,
      700,
      C.sand,
      scale(C.sand, 0.5),
    ).slice(4),
  );
  // A thread of light from the pyramid's apex up to it.
  parts.push(seg([0, 38, 0], [0, Y0, 0], 14, scale(C.gold, 0.6), 0.3));
  // Three rings, drifting slowly up and down round it, each its own pace.
  for (let k = 0; k < 3; k++)
    parts.push({
      n: 150,
      f: (u, _s, t) => {
        const a = u * TAU + t * 0.04 * (k + 1);
        const r = 10 - 2 * k;
        return [Math.cos(a) * r, 78 + 30 * k + 6 * Math.sin(t * 0.15 + k * 2), Math.sin(a) * r];
      },
      rgb: k === 1 ? C.gold : mix(C.sand, C.gold, 0.4),
      tw: 0.1,
    });
  return model(parts, Y1 + 8, 10);
}

/* ---------- the Matrix quarter: a cascade of data pillars round the spire ---------- */

function dataCascade(): Model {
  const parts: Part[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const cx = Math.cos(a) * 23;
    const cz = Math.sin(a) * 23;
    const h = 30 + 10 * k;
    for (const [ox, oz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      parts.push(
        seg(
          [cx + (ox as number) * 1.6, 0, cz + (oz as number) * 1.6],
          [cx + (ox as number) * 1.6, h, cz + (oz as number) * 1.6],
          h * 0.5,
          scale(CODE_GREEN, 0.7),
        ),
      );
    parts.push(...shift([square(1.6, h, 0, 16, mix(CODE_GREEN, C.white, 0.3))], [cx, 0, cz]));
    // Light falling down its faces, slowly.
    parts.push({
      n: Math.round(h * 0.6),
      f: (u, s, t) => {
        const face = s % 4;
        const lane = Math.floor(u * 3) - 1;
        const y = h * (1 - frac(t * 0.06 + u * 2.7 + k * 0.13));
        const f = 1.65;
        const p: [number, number] =
          face === 0
            ? [lane * 0.8, -f]
            : face === 1
              ? [f, lane * 0.8]
              : face === 2
                ? [-lane * 0.8, f]
                : [-f, -lane * 0.8];
        return [cx + p[0], y, cz + p[1]];
      },
      rgb: mix(CODE_GREEN, C.white, 0.2),
    });
  }
  return model(parts, 140, 25);
}

/* ---------- the crowns ---------- */

const MAKERS: Record<CrownKey, () => Model> = {
  pagoda: lanternTower,
  race: moonArches,
  shikhara: templeMountain,
  mosque: mosqueCrown,
  nova: sailTower,
  temples: stairTower,
  factories: twistTower,
  domes: domeStack,
  pyramid: floatingObelisk,
  dataspire: dataCascade,
};
/** The crown on a landmark, built once. */
export const crownModel = (key: CrownKey): Model => cached(`crown ${key}`, MAKERS[key]);

/**
 * How tall each landmark now stands, foot to tip, crown and all (the golden spire, already the
 * tallest, keeps its 199; the data spire keeps its 165 and gains its cascade).
 */
export function landmarkHeight(key: CrownKey | 'spire'): number {
  if (key === 'spire') return 199;
  if (key === 'dataspire') return 165;
  return crownModel(key).top;
}

/** A landmark's crown key from its kind (and set, for the Studio's landmarks); null for none. */
export function crownKey(kind: string, set?: string): CrownKey | null {
  if (kind === 'studio') return (set as CrownKey) ?? null;
  if (kind === 'spire') return null;
  return kind in MAKERS ? (kind as CrownKey) : null;
}

/**
 * The crown on landmark `key` at (x, z), for the Ship's renderer: dense enough to read from 300
 * away (its count grows with its height), seen over the towers by probes high on it.
 */
export function crownItem(
  key: CrownKey,
  x: number,
  z: number,
  eye: Vec3,
  t: number,
  gid: number,
  pulse: number,
): Item {
  const M = crownModel(key);
  // The nearest the crown comes: to its axis, from foot to tip, less its reach.
  const yy = Math.max(GROUND, Math.min(GROUND + M.top, eye[1]));
  const d = Math.max(0, Math.hypot(x - eye[0], yy - eye[1], z - eye[2]) - M.r);
  return {
    d,
    gid: mixId(gid, 7171),
    count: M.count,
    weight: 1.6,
    probe: [
      [x, GROUND + M.top * 0.95, z],
      [x, GROUND + M.top * 0.6, z],
      [x, GROUND + M.top * 0.3, z],
    ],
    site: (s, o) => shapeSite(M, s, t, x, GROUND, z, 1.15 * pulse, o),
  };
}
