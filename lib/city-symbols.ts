/*
 * The City of Dreams' symbols (docs/specs/art-city.md, "Space bars, the Saturn tower, the great
 * arch", 2026-11-14): the Great Arch over the avenue, the Saturn Tower, and the big Nova Cores round
 * the Golden Spire. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "a giant triumphal arch over one of the main big streets ... really big, hundreds
 * high", "a big tall tower with a large Saturn on top of a pole, as the symbol of the city", "add
 * some big novas around the golden spire". And over all of it: "Perspective is everything and the
 * whole point of this city. Perspective is power, and makes it beautiful."
 *
 * Perspective first. The arch stands across the avenue, the city's longest view, so flying up or
 * down it the arch frames the street from far off and you fly through its opening; its piers stand
 * on the blocks either side, off the avenue's towers. The Saturn Tower, the tallest thing in the
 * city, stands beside the avenue at the plan's heart, so from anywhere on the avenue its planet
 * hangs over the vanishing point. The novas climb round the Golden Spire in a slow spiral, one
 * ensemble seen down the corridor that runs through its plaza.
 *
 * Original designs only. All of it is light except the arch's two piers, which are walls (the
 * Ship flies through the opening, never through a pier). Mellow: lamps breathe slowly, the rings
 * and novas turn very slowly, nothing flashes.
 */

import type { RGB, Vec3 } from './bigbang';
import { copiesNear, type Stretched, stretchSite } from './city-big';
import { quarterPalette } from './city-designs';
import {
  BLOCK_X,
  BLOCK_Z,
  C,
  frac,
  GROUND,
  type Item,
  lerp,
  mix,
  mixId,
  planX,
  scale,
  TAU,
  TILE_I,
  TILE_J,
  TILE_Z,
  wrap,
} from './city-grid';
import { ball, cached, type Model, model, type Part, ring, seg, shapeSite } from './city-shapes';
import type { Built } from './grain-mesh';
import { NOVA_CENTRE, NOVA_R, novaHeart } from './nova-cores';
import { nameSign } from './space-bars';

const tileCol = (I: number) => wrap(I + TILE_I / 2, TILE_I) - TILE_I / 2;
const tileRow = (J: number) => wrap(J, TILE_J);

const part = (n: number, f: Part['f'], rgb: RGB, tw = 0): Part => ({
  n: Math.max(1, Math.round(n)),
  f,
  rgb,
  tw,
});

/* ---------- the Great Arch ---------- */

/** The row the arch stands across, its middle along z, and its piers' columns either side. */
export const ARCH_ROW = 13;
export const ARCH_Z = (ARCH_ROW + 0.5) * BLOCK_Z;
export const ARCH_COLS = [-2, 1] as const;
/** Each pier: its middle across (x ±39, on its block), half-width and half-depth. */
export const ARCH_PIER = { x: 39, hx: 11, hz: 12 };
/** The opening: the piers' inner faces (±28), the arch springing at 300, its crown at 328. */
export const ARCH_SPRING = 300;
export const ARCH_INNER = ARCH_PIER.x - ARCH_PIER.hx;
export const ARCH_OUTER = ARCH_PIER.x + ARCH_PIER.hx;
/** Where the masonry ends (the attic's top), and the crowning sun's tip. */
export const ARCH_ATTIC = 392;
export const ARCH_TOP = ARCH_ATTIC + 44;

/**
 * The loggia: a storey open right through each pier where the high currents fly (their flocks 142
 * to 182 over the street, lib/city-currents.ts), only its four corner columns standing, so a flock
 * crossing a pier passes through the loggia and the Ship may too. The currents are laid out on
 * their own cells, not the plan's, so somewhere one always crosses a pier.
 */
export const LOGGIA_LO = 134;
export const LOGGIA_HI = 198;
/** How thick the loggia's corner columns are (square, at the pier's corners). */
export const LOGGIA_COLUMN = 2.5;
const PIER_BANDS = [
  ...Array.from({ length: 20 }, (_, k) => 6 + 15 * k).filter(
    (y) => y < LOGGIA_LO - 4 || y > LOGGIA_HI + 4,
  ),
  LOGGIA_LO,
  LOGGIA_HI,
];

const ARCH_GOLD = mix(C.gold, C.ivory, 0.25);
const ARCH_STONE = scale(mix(C.ivory, C.sand, 0.4), 0.8);

/** The intrados' height over the street at x across the opening (the arch's underside). */
export function archUnderside(x: number): number {
  const a = Math.abs(x);
  if (a >= ARCH_INNER) return 0;
  return ARCH_SPRING + Math.sqrt(ARCH_INNER * ARCH_INNER - a * a);
}

function archModel(): Model {
  const ps: Part[] = [];
  const { x: px, hx, hz } = ARCH_PIER;
  // The piers: corner edges, bands every 20, a plinth, and two columns of lamps on each face.
  for (const s of [-1, 1]) {
    const cx = s * px;
    for (const [ex, ez] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as [number, number][])
      ps.push(
        seg([cx + ex * hx, 0, ez * hz], [cx + ex * hx, ARCH_ATTIC, ez * hz], 160, ARCH_STONE),
      );
    ps.push(
      part(
        900,
        (u) => {
          // Rectangles round the pier every 15 up (one per band), walked round their outline;
          // none in the loggia, a band at its floor and its ceiling.
          const n = PIER_BANDS.length;
          const k = Math.min(n - 1, Math.floor(u * n));
          const v = frac(u * n);
          const e = v * 4 * (hx + hz);
          const y = PIER_BANDS[k] as number;
          let x: number;
          let z: number;
          if (e < 2 * hx) [x, z] = [-hx + e, -hz];
          else if (e < 2 * hx + 2 * hz) [x, z] = [hx, -hz + (e - 2 * hx)];
          else if (e < 4 * hx + 2 * hz) [x, z] = [hx - (e - 2 * hx - 2 * hz), hz];
          else [x, z] = [-hx, hz - (e - 4 * hx - 2 * hz)];
          return [cx + x, y, z];
        },
        ARCH_STONE,
      ),
    );
    // A wider plinth round its foot.
    ps.push(
      part(
        200,
        (u) => {
          const k = Math.floor(u * 2);
          const e = frac(u * 2) * 4 * (hx + 2 + hz + 2);
          const w = hx + 2;
          const d = hz + 2;
          let x: number;
          let z: number;
          if (e < 2 * w) [x, z] = [-w + e, -d];
          else if (e < 2 * w + 2 * d) [x, z] = [w, -d + (e - 2 * w)];
          else if (e < 4 * w + 2 * d) [x, z] = [w - (e - 2 * w - 2 * d), d];
          else [x, z] = [-w, d - (e - 4 * w - 2 * d)];
          return [cx + x, k ? 12 : 0.4, z];
        },
        ARCH_GOLD,
      ),
    );
    for (const lz of [-hz - 0.1, hz + 0.1])
      for (const lx of [-hx + 2.5, hx - 2.5])
        ps.push(
          part(
            70,
            (u) => [
              cx + lx,
              u < 0.45
                ? lerp(14, LOGGIA_LO - 4, u / 0.45)
                : lerp(LOGGIA_HI + 4, ARCH_SPRING - 6, (u - 0.45) / 0.55),
              lz,
            ],
            C.warm,
            0.12,
          ),
        );
    // A tall niche on each face: a pointed frame of gold, a lamp in it.
    for (const lz of [-hz - 0.15, hz + 0.15]) {
      ps.push(
        part(
          120,
          (u) => {
            if (u < 0.3) return [cx - 4, lerp(212, 278, u / 0.3), lz];
            if (u < 0.6) return [cx + 4, lerp(212, 278, (u - 0.3) / 0.3), lz];
            const a = ((u - 0.6) / 0.4) * Math.PI;
            return [cx - 4 * Math.cos(a), 278 + 9 * Math.sin(a), lz];
          },
          ARCH_GOLD,
        ),
      );
      ps.push(ball([cx, 250, lz], 1.6, 18, C.warm, 1, 0.1));
    }
  }
  // The vault: its intrados and an archivolt on both faces, coffers across its soffit, lamps.
  for (const lz of [-hz, hz]) {
    ps.push(
      part(
        180,
        (u) => {
          const a = u * Math.PI;
          return [ARCH_INNER * Math.cos(a), ARCH_SPRING + ARCH_INNER * Math.sin(a), lz];
        },
        ARCH_GOLD,
      ),
    );
    ps.push(
      part(
        220,
        (u) => {
          const a = u * Math.PI;
          return [(ARCH_INNER + 6) * Math.cos(a), ARCH_SPRING + (ARCH_INNER + 6) * Math.sin(a), lz];
        },
        ARCH_STONE,
      ),
    );
    ps.push(
      part(
        40,
        (u) => {
          const a = ((Math.floor(u * 40) + 0.5) / 40) * Math.PI;
          return [(ARCH_INNER + 3) * Math.cos(a), ARCH_SPRING + (ARCH_INNER + 3) * Math.sin(a), lz];
        },
        C.warm,
        0.15,
      ),
    );
  }
  ps.push(
    part(
      260,
      (u) => {
        const k = Math.floor(u * 13);
        const a = ((k + 0.5) / 13) * Math.PI;
        return [
          ARCH_INNER * Math.cos(a),
          ARCH_SPRING + ARCH_INNER * Math.sin(a),
          lerp(-hz, hz, frac(u * 13)),
        ];
      },
      scale(ARCH_GOLD, 0.8),
    ),
  );
  // The spandrels' faces: the outer frame from the piers' tops over the vault to the cornice.
  for (const lz of [-hz, hz]) {
    ps.push(seg([-ARCH_OUTER, 350, lz], [ARCH_OUTER, 350, lz], 120, ARCH_STONE));
    ps.push(
      seg([-ARCH_INNER, ARCH_SPRING, lz], [ARCH_INNER, ARCH_SPRING, lz], 40, scale(ARCH_GOLD, 0.5)),
    );
  }
  // The cornice, stepping out, and the attic over it with the city's name on both faces.
  for (const [y, w, d] of [
    [350, ARCH_OUTER + 2, hz + 2],
    [354, ARCH_OUTER + 3.5, hz + 3],
    [ARCH_ATTIC, ARCH_OUTER + 2, hz + 1.5],
  ] as [number, number, number][])
    ps.push(
      part(
        240,
        (u) => {
          const e = u * 4 * (w + d);
          if (e < 2 * w) return [-w + e, y, -d];
          if (e < 2 * w + 2 * d) return [w, y, -d + (e - 2 * w)];
          if (e < 4 * w + 2 * d) return [w - (e - 2 * w - 2 * d), y, d];
          return [-w, y, d - (e - 4 * w - 2 * d)];
        },
        y === 354 ? ARCH_GOLD : ARCH_STONE,
      ),
    );
  for (const s of [-1, 1])
    for (const ez of [-1, 1])
      ps.push(
        seg(
          [s * (ARCH_OUTER + 2), 354, ez * (hz + 1.5)],
          [s * (ARCH_OUTER + 2), ARCH_ATTIC, ez * (hz + 1.5)],
          30,
          ARCH_STONE,
        ),
      );
  ps.push(...nameSign('CITY OF DREAMS', 364, 2.2, ARCH_GOLD, scale(ARCH_GOLD, 0.6), hz + 1.7));
  // The crowning sun: a half disc of thirteen rays over the attic, a sun ring, a halo round it.
  ps.push(
    part(
      390,
      (u) => {
        const k = Math.floor(u * 13);
        const a = ((k + 0.5) / 13) * Math.PI;
        const r = lerp(12, k % 2 ? 34 : 42, frac(u * 13));
        return [r * Math.cos(a), ARCH_ATTIC + r * Math.sin(a), 0];
      },
      ARCH_GOLD,
      0.05,
    ),
  );
  ps.push(
    part(
      120,
      (u) => {
        const a = u * Math.PI;
        return [10 * Math.cos(a), ARCH_ATTIC + 10 * Math.sin(a), 0];
      },
      C.warm,
      0.08,
    ),
  );
  ps.push(
    part(
      200,
      (u) => {
        const a = u * Math.PI;
        return [44 * Math.cos(a), ARCH_ATTIC + 44 * Math.sin(a), 0];
      },
      scale(ARCH_GOLD, 0.7),
    ),
  );
  return model(ps, ARCH_TOP, ARCH_OUTER + 3.5);
}
export const archModelOf = (): Model => cached('symbol arch', archModel);

/** Whether point q is inside one of the arch's piers (every tile copy), `m` the wall margin. */
export function archHolds(q: Vec3, m: number): boolean {
  if (q[1] > GROUND + ARCH_ATTIC + m) return false;
  const dz = Math.abs(wrap(q[2], TILE_Z) - ARCH_Z);
  if (dz >= ARCH_PIER.hz + m && TILE_Z - dz >= ARCH_PIER.hz + m) return false;
  const dx = Math.abs(Math.abs(planX(q[0])) - ARCH_PIER.x);
  if (dx >= ARCH_PIER.hx + m) return false;
  // In the loggia only the corner columns hold.
  const y = q[1] - GROUND;
  if (y > LOGGIA_LO + m && y < LOGGIA_HI - m) {
    const dzz = Math.min(dz, TILE_Z - dz);
    const inner = LOGGIA_COLUMN + m;
    return dx > ARCH_PIER.hx - inner && dzz > ARCH_PIER.hz - inner;
  }
  return true;
}

/* ---------- the Saturn Tower ---------- */

/** Its block (beside the avenue, right of it, at the plan's heart), and its axis. */
export const SATURN_BLOCK = { I: 1, J: 32 };
export const SATURN_X = (SATURN_BLOCK.I + 0.5) * BLOCK_X;
export const SATURN_Z = (SATURN_BLOCK.J + 0.5) * BLOCK_Z;
/** The pole's top, the planet's middle and radius, its rings' reach and tilt. */
export const SATURN_POLE = 404;
export const SATURN_Y = 430;
export const SATURN_R = 24;
export const SATURN_RINGS = [32, 35, 38, 41, 44, 49, 52, 55];
export const SATURN_TILT = 0.42;
export const SATURN_TOP = SATURN_Y + SATURN_R;

const PLANET = mix(C.ivory, C.sand, 0.45);
const PLANET_BAND = mix(C.amber, C.sand, 0.5);
const RING_GOLD = mix(C.gold, C.ivory, 0.35);

function saturnModel(): Model {
  const ps: Part[] = [];
  // The plinth: three round steps, lit at their edges.
  for (const [r, y0, y1] of [
    [12, 0, 4],
    [9, 4, 8],
    [7, 8, 12],
  ] as [number, number, number][]) {
    ps.push(ring([0, y0 + 0.1, 0], r, r * 9, ARCH_STONE), ring([0, y1, 0], r, r * 9, ARCH_GOLD));
    ps.push(
      part(
        r * 4,
        (u) => {
          const k = Math.floor(u * 16);
          const a = (k * TAU) / 16;
          return [Math.cos(a) * r, lerp(y0, y1, frac(u * 16)), Math.sin(a) * r];
        },
        ARCH_STONE,
      ),
    );
  }
  // The pole: six edges tapering from 5 to 1.4, rings every 16, a light climbing it slowly.
  const w = (y: number) => lerp(5, 1.4, (y - 12) / (SATURN_POLE - 12));
  ps.push(
    part(
      1100,
      (u) => {
        const k = Math.floor(u * 6);
        const a = (k * TAU) / 6;
        const y = lerp(12, SATURN_POLE, frac(u * 6));
        return [Math.cos(a) * w(y), y, Math.sin(a) * w(y)];
      },
      ARCH_GOLD,
    ),
  );
  ps.push(
    part(
      900,
      (u) => {
        const k = Math.floor(u * 24);
        const y = 12 + (k + 0.5) * ((SATURN_POLE - 12) / 24);
        const a = frac(u * 24) * TAU;
        return [Math.cos(a) * w(y), y, Math.sin(a) * w(y)];
      },
      ARCH_STONE,
    ),
  );
  ps.push(part(60, (u, _s, t) => [0, lerp(12, SATURN_POLE, frac(u + t * 0.015)), 0], C.warm, 0.1));
  // Two decks on the pole, lamps round them.
  for (const [y, r] of [
    [150, 8],
    [280, 6.5],
  ] as [number, number][]) {
    ps.push(ring([0, y, 0], r, 70, ARCH_GOLD), ring([0, y - 1.2, 0], r * 0.8, 50, ARCH_STONE));
    ps.push(
      part(
        18,
        (u) => {
          const a = ((Math.floor(u * 18) + 0.5) / 18) * TAU;
          return [Math.cos(a) * r, y + 0.6, Math.sin(a) * r];
        },
        C.warm,
        0.12,
      ),
    );
  }
  // The planet, banded, and its glowing equator.
  ps.push(ball([0, SATURN_Y, 0], SATURN_R, 1500, PLANET, 0.94, 0.03));
  for (const [dy, rgb] of [
    [-14, PLANET_BAND],
    [-7, PLANET],
    [0, C.warm],
    [6, PLANET_BAND],
    [13, PLANET],
    [18, PLANET_BAND],
  ] as [number, RGB][]) {
    const r = Math.sqrt(Math.max(1, SATURN_R * SATURN_R - (dy / 0.94) ** 2));
    ps.push(ring([0, SATURN_Y + dy, 0], r, r * 8, rgb));
  }
  // The rings: bands of light in one tilted plane (a gap between the fifth and sixth), turning
  // very slowly round the planet's own axis.
  const tilt = (x: number, z: number, t: number): Vec3 => {
    const a = t * 0.01;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rx = x * ca - z * sa;
    const rz = x * sa + z * ca;
    return [rx, SATURN_Y + rz * Math.sin(SATURN_TILT), rz * Math.cos(SATURN_TILT)];
  };
  SATURN_RINGS.forEach((r, k) => {
    ps.push(
      part(
        r * 7,
        (u, _s, t) => {
          const a = u * TAU;
          return tilt(Math.cos(a) * r, Math.sin(a) * r, t);
        },
        k % 3 === 1 ? scale(RING_GOLD, 0.75) : RING_GOLD,
        k === 5 ? 0.08 : 0.02,
      ),
    );
  });
  return model(ps, SATURN_TOP, Math.max(...SATURN_RINGS));
}
export const saturnModelOf = (): Model => cached('symbol saturn', saturnModel);

/* ---------- the novas round the Golden Spire ---------- */

/** The Golden Spire's crossing, tile-local (lib/city-game.ts SPIRE: x −78, the golden band's middle row). */
export const SPIRE_AT: [number, number] = [-3 * BLOCK_X, 28 * BLOCK_Z];
/** How far out from the spire's axis the novas stand, how big they are (times the Studio core). */
export const SPIRE_NOVA_OUT = 38;
export const SPIRE_NOVA_S = 2.4;

export type SpireNova = { kind: number; x: number; z: number; y: number };
/**
 * Six big Nova Cores climbing round the spire in a slow spiral (one each sixth of a turn, 26
 * higher each), off the directions of the Sunleaf Column and the Halo Stack beside the plaza.
 */
export const SPIRE_NOVAS: SpireNova[] = Array.from({ length: 6 }, (_, k) => {
  const a = ((143 + 60 * k) * Math.PI) / 180;
  return {
    kind: k,
    x: SPIRE_AT[0] + SPIRE_NOVA_OUT * Math.cos(a),
    z: SPIRE_AT[1] + SPIRE_NOVA_OUT * Math.sin(a),
    y: 48 + 26 * k,
  };
});
/** How far a spire nova's lights reach from its middle (its core and what turns round it). */
export const SPIRE_NOVA_REACH = 2 * NOVA_R * SPIRE_NOVA_S;

const hearts: (Built | null)[] = SPIRE_NOVAS.map(() => null);
const heartOf = (k: number): Built => {
  const had = hearts[k];
  if (had) return had;
  const b = novaHeart(k).build();
  hearts[k] = b;
  return b;
};

const NOVA_TINTS: RGB[] = [C.gold, C.warm, C.amber, C.gold, mix(C.gold, C.ivory, 0.4), C.amber];

/* ---------- the blocks they stand on, the walls, the items ---------- */

/** Whether block (I, J) is kept open for a symbol: the arch's two pier blocks, the Saturn Tower's. */
export function symbolBlock(I: number, J: number): boolean {
  const li = tileCol(I);
  const lj = tileRow(J);
  if (lj === ARCH_ROW && (ARCH_COLS as readonly number[]).includes(li)) return true;
  return li === SATURN_BLOCK.I && lj === SATURN_BLOCK.J;
}

/** Whether a point is held by a symbol's walls: the arch's piers only (all else is light). */
export const symbolHolds = (q: Vec3, m: number) => archHolds(q, m);

const staticItem = (
  M: Model,
  x: number,
  z: number,
  eye: Vec3,
  t: number,
  key: number,
  k: number,
): Item => {
  const yy = Math.max(GROUND, Math.min(GROUND + M.top, eye[1]));
  return {
    d: Math.max(0, Math.hypot(x - eye[0], yy - eye[1], z - eye[2]) - M.r),
    gid: mixId(key, 8383),
    count: M.count,
    weight: 1.6,
    probe: [
      [x, GROUND + M.top * 0.95, z],
      [x, GROUND + M.top * 0.7, z],
      [x, GROUND + M.top * 0.4, z],
    ],
    site: (s, o) => shapeSite(M, s, t, x, GROUND, z, k, o),
  };
};

/**
 * The symbols within sight (R: they are drawn out to the whole view, as the landmarks' crowns),
 * as the Ship's items: the arch, the Saturn Tower, the six novas round the spire.
 */
export function symbolItems(eye: Vec3, t: number, R: number, out: Item[], lift = 1) {
  const A = archModelOf();
  copiesNear(0, ARCH_Z, eye, R + A.r, (x, z, n) => {
    out.push(staticItem(A, x, z, eye, t, 11 + n * 3, 1.2 * lift));
  });
  const S = saturnModelOf();
  copiesNear(SATURN_X, SATURN_Z, eye, R + S.r, (x, z, n) => {
    out.push(staticItem(S, x, z, eye, t, 12 + n * 3, 1.2 * lift));
  });
  SPIRE_NOVAS.forEach((q, k) => {
    copiesNear(q.x, q.z, eye, R + SPIRE_NOVA_REACH, (x, z, n) => {
      const cy = GROUND + q.y;
      const d = Math.max(0, Math.hypot(x - eye[0], cy - eye[1], z - eye[2]) - SPIRE_NOVA_REACH);
      if (d > R) return;
      const s = SPIRE_NOVA_S;
      const P: Stretched = {
        B: heartOf(k),
        // The core's middle (NOVA_CENTRE over the Studio's ground) lands at the nova's height.
        at: [x, cy - (NOVA_CENTRE[1] - GROUND) * s, z],
        sh: s,
        sv: s,
        palette: quarterPalette(NOVA_TINTS[k] as RGB),
        k: lift,
      };
      out.push({
        d,
        gid: mixId(k * 37 + n, 8484),
        count: 1500,
        weight: 1.5,
        probe: [[x, cy, z]],
        site: (si, o) => stretchSite(P, si, t, eye, o),
      });
    });
  });
}
