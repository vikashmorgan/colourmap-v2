/*
 * The Favela quarter of the City of Dreams (docs/specs/art-city.md, "Mountain and Favela
 * quarters"): hills densely covered with small boxy houses stacked up their slopes, in the annex
 * beside the strip, past the river. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "add the mountain and favela above, so the city becomes more square."
 * 2026-11-15: "make sure favelas look like favelas ... right now favelas are just dots not boxes
 * stacked on each other etc..."
 *
 * Our own design, in a warm palette. Each hill is a low dome with a wavering foot, cut into
 * terraces; along every terrace stand small houses side by side, each its own width, one to three
 * storeys, painted coral, orange, ochre, rose, cream, now and then turquoise, lime or lilac. Since
 * 2026-11-15 every house is drawn as a BOX OUTLINE, lines of grains along its edges (as the
 * Mountain quarter draws its peaks as contour lines): the flat roof's rim, the storey slab's rim,
 * the corner edges. A house of two or three storeys is two boxes, its top storey a box of its own
 * on the lower one: the same size (the slab reads as a storey line), or narrower and shifted along
 * the terrace, or (on two-storey houses) jutting out over the slope, an overhang. Houses are
 * turned a little each their own way. The terraces step up so the boxes stack over one another as
 * they climb. Narrow alleys open now and then; four stairways wind up each hill, lamps along them.
 * Windows glow warm, each its own warm tone (not all of them); water tanks and antennas stand on
 * the flat roofs; wires tangle from roof to roof and up to the next terrace; strings of small
 * lights hang along some terraces, twinkling slowly.
 *
 * Annex-local, as the Mountain quarter (lib/city-mountain.ts): `ax` across from the strip's edge
 * street, `lz` along the tile (FAVELA_Z0 to the tile's end). Laid out once into flat arrays; a
 * frame only reads them, and the sites write straight into the renderer's array. Light is mellow.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import {
  aroundRect,
  frac,
  GROUND,
  type Item,
  mixId,
  nearest,
  STRIP_X,
  TAU,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { INDUSTRY_Z0 } from './city-industry';
import { MOUNTAIN_Z1 } from './city-mountain';

/**
 * The Favela quarter runs from the river (row 24) to the Industry superquarter (row 45; it ran to
 * the tile's end until 2026-11-14, when the industry took the annex's last rows).
 */
export const FAVELA_Z0 = MOUNTAIN_Z1;
export const FAVELA_Z1 = INDUSTRY_Z0;

/* ---------- the hills ---------- */

export type Hill = { x: number; z: number; h: number; r: number; p1: number; p2: number };
const hill = (x: number, z: number, h: number, r: number, n: number): Hill => ({
  x,
  z,
  h,
  r,
  p1: TAU * hash(n, 801),
  p2: TAU * hash(n, 802),
});
/**
 * Six hills past the river, annex-local, their feet inside the annex and short of the industry
 * (2026-11-14: the three beyond the sixth gave their ground to the Industry superquarter).
 */
export const HILLS: Hill[] = [
  hill(92, 930, 50, 74, 1),
  hill(228, 960, 62, 68, 2),
  hill(140, 1110, 56, 76, 3),
  hill(244, 1230, 44, 54, 4),
  hill(84, 1320, 52, 70, 5),
  hill(200, 1430, 66, 82, 6),
];
/** The houses stand this high at most over the hill's slope (three storeys and a tank). */
export const HOUSE_TOP = 8.8;
/** A terrace's rise, and a storey's. */
export const TERRACE = 3.6;
export const STOREY = 2.6;

/**
 * The favela cable car's pylons on the first hill (lib/city-cable-cars.ts, 2026-11-15): annex-local
 * (x, z), the last its summit station. No house stands within FAVELA_PYLON_CLEAR of one.
 */
export const FAVELA_PYLONS: [number, number][] = [
  [16, 918],
  [50, 918],
  [92, 918],
];
export const FAVELA_PYLON_CLEAR = 4.5;
const nearPylon = (x: number, z: number, pad: number) =>
  FAVELA_PYLONS.some(([px, pz]) => Math.hypot(x - px, z - pz) < FAVELA_PYLON_CLEAR + pad);

/** How far hill p's foot reaches toward angle a: a wavering circle, never past 1.15 r. */
export const hillFoot = (p: Hill, a: number) =>
  p.r * (1 + 0.08 * Math.sin(2 * a + p.p1) + 0.05 * Math.sin(5 * a + p.p2));

/** Hill p's slope at annex-local (ax, lz), over the street; and how far out its foot (u, 0..1). */
function hillAt(p: Hill, ax: number, lz: number): number {
  const dx = ax - p.x;
  const dz = lz - p.z;
  const lim = p.r * 1.15;
  if (dx > lim || dx < -lim || dz > lim || dz < -lim) return -1;
  const d2 = dx * dx + dz * dz;
  if (d2 >= lim * lim) return -1;
  const f = hillFoot(p, Math.atan2(dz, dx));
  const u2 = d2 / (f * f);
  return u2 < 1 ? p.h * (1 - u2) : -1;
}

/** The hills' slope over the street at annex-local (ax, lz): the highest there, 0 off them. */
export function hillSurface(ax: number, lz: number): number {
  let h = 0;
  for (const p of HILLS) {
    const v = hillAt(p, ax, lz);
    if (v > h) h = v;
  }
  return h;
}

/**
 * How far past a hill's foot its lowest houses may reach (a turned house's corner, an overhang):
 * the walls reach that far too, so the drawing and the collision agree.
 */
export const FOOT_SKIRT = 1.5;

/** The favela's height over the street at (ax, lz): its slope and its houses on it; 0 off the hills. */
export function favelaHeight(ax: number, lz: number): number {
  let h = -1;
  for (const p of HILLS) {
    const dx = ax - p.x;
    const dz = lz - p.z;
    const lim = p.r * 1.15 + FOOT_SKIRT;
    if (dx > lim || dx < -lim || dz > lim || dz < -lim) continue;
    const d2 = dx * dx + dz * dz;
    if (d2 >= lim * lim) continue;
    const f = hillFoot(p, Math.atan2(dz, dx));
    if (d2 >= (f + FOOT_SKIRT) * (f + FOOT_SKIRT)) continue;
    const v = Math.max(0, p.h * (1 - d2 / (f * f)));
    if (v > h) h = v;
  }
  return h < 0 ? 0 : h + HOUSE_TOP;
}

/* ---------- the stairways: winding up the slope ---------- */

/** How far a stairway swings round the hill as it climbs, either way (radians), and how wide it is kept. */
export const STAIR_WIND = 0.22;
export const STAIR_HALF = 2.2;
/** The angles round each hill its four stairways start up from, at the foot. */
export const stairAngles = (p: Hill) => [0, 1, 2, 3].map((s) => p.p1 + (s * TAU) / 4 + 0.4);
/**
 * Stairway w of hill p's angle at distance `e` from the hill's middle: it winds, swinging round
 * the hill and back as it climbs, a slow wave of the distance (one swing and a bit, foot to top).
 */
export function stairAngleAt(p: Hill, w: number, e: number): number {
  const base = stairAngles(p)[w] as number;
  return base + STAIR_WIND * Math.sin((TAU * 0.8 * e) / p.r + p.p2 + w * 1.7);
}

/* ---------- laid out once: houses, wires, light strings, stairs ---------- */

/**
 * A house's numbers in the array: middle (x, z), foot (y), outward unit (nx, nz), half width and
 * depth, top, colour (r, g, b), flags, phase; then its top storey's box: the slab it stands on (y),
 * its middle's offset along the terrace and out, its half width and depth.
 */
export const HOUSE_STRIDE = 18;
/** Sites in one house, and where each part's begin. */
export const HOUSE_SITES = 68;
export const ROOF_SITES = 16;
export const SLAB_SITES = 14;
export const WINDOW_SITE0 = 54;
export const TANK_SITE0 = 60;
export const ANTENNA_SITE0 = 66;
/** A row of houses along one terrace of one hill. */
export type Row = { hill: number; k: number; y: number; r: number; start: number; n: number };
/** A run of points (a string of lights, a stairway, a terrace's wires) in its array. */
export type Run = { hill: number; start: number; n: number; y: number; r: number };
/** A wire's numbers: one end (x, y, z), the other, its sag. */
export const WIRE_STRIDE = 7;
export const WIRE_SITES = 8;

export type FavelaGeo = {
  houses: Float32Array;
  rows: Row[];
  /** Wires from roof to roof: WIRE_STRIDE a wire, one run a terrace. */
  wires: Float32Array;
  wireRuns: Run[];
  /** Light strings: x, y, z, colour index, four a light. */
  lights: Float32Array;
  strings: Run[];
  /** Stair samples: x, y, z, then the unit across (px, pz), five a sample. */
  steps: Float32Array;
  stairs: Run[];
};
let geo: FavelaGeo | null = null;

/** The walls' colours: warm mostly, a few cool ones among them. */
export const WALLS: RGB[] = [
  [1, 0.45, 0.3],
  [1, 0.6, 0.26],
  [1, 0.8, 0.36],
  [0.96, 0.42, 0.5],
  [1, 0.9, 0.74],
  [0.9, 0.36, 0.28],
  [1, 0.7, 0.45],
  [0.36, 0.82, 0.72],
  [0.6, 0.88, 0.42],
  [0.66, 0.56, 0.96],
];
/** The windows' warm tones: a lamp, a candle, a warm white, a rosy shade, a pale gold. */
export const WINDOW_TONES: RGB[] = [
  [1, 0.8, 0.52],
  [1, 0.66, 0.36],
  [1, 0.9, 0.72],
  [1, 0.62, 0.48],
  [1, 0.86, 0.46],
];
/** The light strings' bulbs, in turn. */
const BULBS: RGB[] = [
  [1, 0.9, 0.7],
  [1, 0.66, 0.3],
  [1, 0.5, 0.6],
  [0.45, 0.9, 0.85],
  [1, 0.92, 0.45],
];

/** A house's top storey's front corner (`side` -1 left, 1 right, 0 the middle; `back` its rear), at its roof. */
function roofCorner(H: number[], h: number, side: number, back: boolean): [number, number, number] {
  const i = h * HOUSE_STRIDE;
  const nx = H[i + 3] as number;
  const nz = H[i + 4] as number;
  const a = (H[i + 14] as number) + side * (H[i + 16] as number);
  const b = (H[i + 15] as number) + (back ? -1 : 1) * (H[i + 17] as number);
  return [
    (H[i] as number) - nz * a + nx * b,
    (H[i + 7] as number) - 0.15,
    (H[i + 1] as number) + nx * a + nz * b,
  ];
}

/** The favela's geometry: built the first time it is asked for, the same object after. */
export function favelaGeo(): FavelaGeo {
  if (geo) return geo;
  const houses: number[] = [];
  const rows: Row[] = [];
  const lights: number[] = [];
  const strings: Run[] = [];
  const steps: number[] = [];
  const stairs: Run[] = [];
  const wires: number[] = [];
  const wireRuns: Run[] = [];
  HILLS.forEach((p, hi) => {
    const hillRows: Row[] = [];
    for (let k = 0; k * TERRACE < p.h - 2; k++) {
      const y = k * TERRACE;
      const shrink = Math.sqrt(1 - y / p.h);
      const shrinkUp = Math.sqrt(Math.max(0, 1 - (y + TERRACE) / p.h));
      const rMean = p.r * shrink;
      const depth = Math.max(2.4, Math.min(4.2, p.r * (shrink - shrinkUp) + 1));
      const start = houses.length / HOUSE_STRIDE;
      const circ = TAU * rMean;
      let e = hash(hi * 61 + k, 811) * 3;
      let n = 0;
      while (e < circ - 2) {
        const key = hi * 100003 + k * 1009 + n;
        n++;
        const w = 2.6 + 1.8 * hash(key, 812);
        const a = (e + w / 2) / rMean;
        // Narrow alleys now and then, and the stairways' way kept clear.
        const gap = hash(key, 813) < 0.12 ? 2.4 : 0.35 + 0.5 * hash(key, 814);
        e += w + gap;
        const rr = hillFoot(p, a) * shrink - depth / 2 - 0.2 - 0.45 * hash(key, 840);
        // Clear of a winding stairway across the house's whole depth.
        const onStair = [0, 1, 2, 3].some((s) =>
          [rr - depth / 2, rr, rr + depth / 2].some((r) => {
            const da = Math.abs(((a - stairAngleAt(p, s, r) + Math.PI * 3) % TAU) - Math.PI);
            return da * r < STAIR_HALF + w / 2;
          }),
        );
        if (onStair) continue;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const cx = p.x + ca * rr;
        const cz = p.z + sa * rr;
        // Buried in a higher neighbour's slope, or on a cable pylon's ground: not there.
        if (hillSurface(cx, cz) > y + TERRACE + 1) continue;
        if (nearPylon(cx, cz, w / 2)) continue;
        const storeys = 1 + Math.floor(hash(key, 815) * (k === 0 ? 2 : 3));
        const tank = hash(key, 816) < 0.35 ? 1 : 0;
        const antenna = hash(key, 817) < 0.2 ? 1 : 0;
        let lit = 0;
        for (let b = 0; b < 6; b++) if (hash(key, 820 + b) < 0.55) lit |= 1 << b;
        const wall = WALLS[Math.floor(hash(key, 818) * WALLS.length)] as RGB;
        // Each house turned a little its own way.
        const yaw = 0.14 * (hash(key, 841) - 0.5);
        const nx = ca * Math.cos(yaw) - sa * Math.sin(yaw);
        const nz = sa * Math.cos(yaw) + ca * Math.sin(yaw);
        const hw = w / 2;
        const hd = depth / 2;
        // The top storey's box: the same, shifted and narrower, or (two storeys) jutting out.
        let split = y;
        let oa = 0;
        let ob = 0;
        let hw2 = hw;
        let hd2 = hd;
        if (storeys > 1) {
          split = y + (storeys - 1) * STOREY;
          const v = hash(key, 842);
          const u = hash(key, 843);
          if (v < 0.25) {
            hw2 = hw * (0.65 + 0.25 * u);
            oa = (hash(key, 844) < 0.5 ? -1 : 1) * (hw - hw2 + 0.3 * u);
            hd2 = hd * (0.8 + 0.2 * hash(key, 845));
            ob = -0.3 * hash(key, 846);
          } else if (v < 0.5 && storeys === 2) {
            ob = 0.4 + 0.4 * u;
            hd2 = hd * (0.85 + 0.15 * hash(key, 845));
            hw2 = hw * (0.9 + 0.2 * hash(key, 846));
          }
        }
        houses.push(
          cx,
          cz,
          y,
          nx,
          nz,
          hw,
          hd,
          y + storeys * STOREY,
          wall[0],
          wall[1],
          wall[2],
          storeys | (tank << 2) | (antenna << 3) | (lit << 4),
          TAU * hash(key, 819),
          split,
          oa,
          ob,
          hw2,
          hd2,
        );
      }
      const row = { hill: hi, k, y, r: rMean, start, n: houses.length / HOUSE_STRIDE - start };
      rows.push(row);
      hillRows.push(row);
      // A string of small lights along every third terrace, sagging between its poles.
      if (k % 3 === 1) {
        const ls = lights.length / 4;
        const cnt = Math.ceil(circ / 1.1);
        for (let i = 0; i < cnt; i++) {
          const a = ((i + 0.5) / cnt) * TAU;
          const rr = hillFoot(p, a) * shrink + 0.3;
          const sag = 0.7 * Math.sin(Math.PI * ((((i + 0.5) * 1.1) / 7) % 1));
          const x = p.x + Math.cos(a) * rr;
          const z = p.z + Math.sin(a) * rr;
          if (hillSurface(x, z) > y + TERRACE + 1) continue;
          lights.push(x, y + STOREY + 0.9 - sag, z, i % BULBS.length);
        }
        strings.push({ hill: hi, start: ls, n: lights.length / 4 - ls, y, r: rMean });
      }
    }
    // The wires, tangled: roof to the next roof along the terrace, up to a roof on the terrace
    // above, now and then a long one two terraces up.
    hillRows.forEach((row, ri) => {
      const ws = wires.length / WIRE_STRIDE;
      const angle = (h: number) =>
        Math.atan2(
          (houses[h * HOUSE_STRIDE + 1] as number) - p.z,
          (houses[h * HOUSE_STRIDE] as number) - p.x,
        );
      const nearestIn = (R: Row | undefined, a: number, skip: number) => {
        if (!R || R.n <= 0) return -1;
        let best = -1;
        let bd = Number.POSITIVE_INFINITY;
        for (let j = R.start; j < R.start + R.n; j++) {
          const d = Math.abs(((angle(j) - a + Math.PI * 3) % TAU) - Math.PI);
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        return best < 0 ? -1 : R.start + ((best - R.start + skip) % R.n);
      };
      const wire = (
        A: [number, number, number],
        B: [number, number, number],
        sag: number,
        max: number,
      ) => {
        if (Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) > max) return;
        wires.push(A[0], A[1], A[2], B[0], B[1], B[2], sag);
      };
      for (let h = row.start; h < row.start + row.n; h++) {
        if (h + 1 < row.start + row.n && hash(h, 831) < 0.6)
          wire(
            roofCorner(houses, h, 1, false),
            roofCorner(houses, h + 1, -1, false),
            0.35 + 0.5 * hash(h, 834),
            8,
          );
        if (hash(h, 832) < 0.35) {
          const j = nearestIn(hillRows[ri + 1], angle(h), 0);
          if (j >= 0)
            wire(
              roofCorner(houses, h, 0, true),
              roofCorner(houses, j, 0, false),
              0.6 + 0.6 * hash(h, 835),
              10,
            );
        }
        if (hash(h, 833) < 0.1) {
          const j = nearestIn(hillRows[ri + 2], angle(h), 1 + Math.floor(2 * hash(h, 836)));
          if (j >= 0)
            wire(
              roofCorner(houses, h, -1, true),
              roofCorner(houses, j, 1, false),
              1 + hash(h, 837),
              16,
            );
        }
      }
      wireRuns.push({
        hill: hi,
        start: ws,
        n: wires.length / WIRE_STRIDE - ws,
        y: row.y + STOREY,
        r: row.r,
      });
    });
    // The stairways: winding up the slope from the foot to the top.
    for (let w = 0; w < 4; w++) {
      const start = steps.length / 5;
      const foot = hillFoot(p, stairAngles(p)[w] as number);
      let px = Number.NaN;
      let pz = Number.NaN;
      // From where the winding way first meets the slope, at its foot.
      for (let e = p.r * 1.15; e > 1; e -= 0.05) {
        const a = stairAngleAt(p, w, e);
        const x = p.x + Math.cos(a) * e;
        const z = p.z + Math.sin(a) * e;
        if (hillAt(p, x, z) < 0) continue;
        if (!Number.isNaN(px) && Math.hypot(x - px, z - pz) < 1) continue;
        const dx = Number.isNaN(px) ? -Math.cos(a) : x - px;
        const dz = Number.isNaN(px) ? -Math.sin(a) : z - pz;
        const dl = Math.hypot(dx, dz) || 1;
        px = x;
        pz = z;
        const yy = Math.max(0, hillAt(p, x, z));
        if (hillSurface(x, z) > yy + 1 || nearPylon(x, z, 0)) continue;
        steps.push(x, yy + 0.2, z, -dz / dl, dx / dl);
      }
      stairs.push({ hill: hi, start, n: steps.length / 5 - start, y: p.h / 2, r: foot / 2 });
    }
  });
  geo = {
    houses: new Float32Array(houses),
    rows,
    wires: new Float32Array(wires),
    wireRuns,
    lights: new Float32Array(lights),
    strings,
    steps: new Float32Array(steps),
    stairs,
  };
  return geo;
}

/** How many houses stand on the favela's hills. */
export const houseCount = () => favelaGeo().houses.length / HOUSE_STRIDE;

/* ---------- drawing ---------- */

const tint = (o: number[], r: number, g: number, b: number, k: number) => {
  o[3] = r * k;
  o[4] = g * k;
  o[5] = b * k;
};

/** The corner `c` (0..3) of a box of half sizes (hw, hd) round (oa, ob): into CO. */
const CO = [0, 0];
function corner(c: number, oa: number, ob: number, hw: number, hd: number): void {
  CO[0] = oa + (c & 1 ? hw : -hw);
  CO[1] = ob + (c & 2 ? hd : -hd);
}

/**
 * Site s (0..HOUSE_SITES) of house h into o: its outline, line by line. The top storey's roof rim,
 * the lower box's rim at the slab the top storey stands on (a one-storey house's: its foot), the
 * lower box's corner edges and the top storey's, its windows (the lit ones), a water tank, an
 * antenna. False where it has no such thing.
 */
export function houseSite(
  H: Float32Array,
  h: number,
  s: number,
  t: number,
  ox: number,
  oz: number,
  o: number[],
): boolean {
  const i = h * HOUSE_STRIDE;
  const y0 = H[i + 2] as number;
  const hw = H[i + 5] as number;
  const hd = H[i + 6] as number;
  const top = H[i + 7] as number;
  const r = H[i + 8] as number;
  const g = H[i + 9] as number;
  const bl = H[i + 10] as number;
  const flags = H[i + 11] as number;
  const ph = H[i + 12] as number;
  const split = H[i + 13] as number;
  const oa = H[i + 14] as number;
  const ob = H[i + 15] as number;
  const hw2 = H[i + 16] as number;
  const hd2 = H[i + 17] as number;
  // a along the terrace (the tangent, -nz, nx), b out from the hill (n), y up.
  let a = 0;
  let b = 0;
  let y = top;
  if (s < ROOF_SITES) {
    // The flat roof's rim, catching the light.
    [a, b] = aroundRect(((s + 0.5) / ROOF_SITES) * 4 * (hw2 + hd2), hw2, hd2);
    a += oa;
    b += ob;
    tint(o, r, g, bl, 0.46);
  } else if (s < ROOF_SITES + SLAB_SITES) {
    // The slab under the top storey, or a one-storey house's foot.
    [a, b] = aroundRect(((s - ROOF_SITES + 0.5) / SLAB_SITES) * 4 * (hw + hd), hw, hd);
    y = split;
    tint(o, r, g, bl, 0.36);
  } else if (s < WINDOW_SITE0) {
    // The corner edges: the lower box's four (none on a one-storey house), the top storey's four.
    const q = s - ROOF_SITES - SLAB_SITES;
    const upper = q >= 12;
    const c = Math.floor((q % 12) / 3);
    const f = ((q % 3) + 0.5) / 3;
    if (upper) {
      corner(c, oa, ob, hw2, hd2);
      y = split + (top - split) * f;
    } else {
      if (split - y0 < 0.5) return false;
      corner(c, 0, 0, hw, hd);
      y = y0 + (split - y0) * f;
    }
    a = CO[0] as number;
    b = CO[1] as number;
    tint(o, r, g, bl, 0.3);
  } else if (s < TANK_SITE0) {
    const q = s - WINDOW_SITE0;
    const storey = q >> 1;
    const storeys = flags & 3;
    if (storey >= storeys || !((flags >> 4) & (1 << q))) return false;
    const side = q & 1 ? 0.45 : -0.45;
    if (storey === storeys - 1) {
      a = oa + side * hw2;
      b = ob + hd2 + 0.05;
    } else {
      a = side * hw;
      b = hd + 0.05;
    }
    y = y0 + storey * STOREY + 1.4;
    // Each window its own warm tone; a slow drift of a lamp or a screen inside, never a flash.
    const c = WINDOW_TONES[Math.floor(frac(ph * 7.3 + q * 0.37) * WINDOW_TONES.length)] as RGB;
    tint(o, c[0], c[1], c[2], 0.6 * (0.86 + 0.14 * Math.sin(0.25 * t + ph + q * 1.3)));
  } else if (s < ANTENNA_SITE0) {
    // A water tank on the flat roof: a small drum's lid, toward the back.
    if (!(flags & 4)) return false;
    const ang = ((s - TANK_SITE0) / 6) * TAU + ph;
    a = oa - 0.4 * hw2 + Math.cos(ang) * 0.55;
    b = ob - 0.35 * hd2 + Math.sin(ang) * 0.55;
    y = top + 0.9;
    tint(o, 0.55, 0.75, 1, 0.36);
  } else {
    if (!(flags & 8)) return false;
    a = oa + 0.5 * hw2;
    if (s === ANTENNA_SITE0) {
      y = top + 1.2;
      tint(o, 0.6, 0.62, 0.7, 0.22);
    } else {
      y = top + 2.4;
      tint(o, 1, 0.35, 0.25, 0.45 * (0.8 + 0.2 * Math.sin(0.5 * t + ph)));
    }
  }
  const cx = H[i] as number;
  const cz = H[i + 1] as number;
  const nx = H[i + 3] as number;
  const nz = H[i + 4] as number;
  o[0] = ox + cx - nz * a + nx * b;
  o[1] = GROUND + y;
  o[2] = oz + cz + nx * a + nz * b;
  return true;
}

/** Site s of a wire (from `start` in W): a line sagging between two roofs, faint. */
export function wireSite(
  W: Float32Array,
  start: number,
  s: number,
  ox: number,
  oz: number,
  o: number[],
): boolean {
  const i = (start + Math.floor(s / WIRE_SITES)) * WIRE_STRIDE;
  const u = ((s % WIRE_SITES) + 0.5) / WIRE_SITES;
  o[0] = ox + (W[i] as number) + ((W[i + 3] as number) - (W[i] as number)) * u;
  o[1] =
    GROUND +
    (W[i + 1] as number) +
    ((W[i + 4] as number) - (W[i + 1] as number)) * u -
    4 * (W[i + 6] as number) * u * (1 - u);
  o[2] = oz + (W[i + 2] as number) + ((W[i + 5] as number) - (W[i + 2] as number)) * u;
  tint(o, 0.6, 0.52, 0.45, 0.22);
  return true;
}

/** The shift from annex-local to the world for the annex's copy nearest the eye. */
function shiftNear(ax: number, lz: number, eye: Vec3): [number, number] {
  const x = STRIP_X / 2 + ax;
  return [nearest(x, eye[0], TILE_X) - x + STRIP_X / 2, nearest(lz, eye[2], TILE_Z) - lz];
}

/**
 * The favela's lit things round the eye, out to R: its rows of houses, its wires, its strings of
 * lights and its stairways, each an Item, kept to the view ahead.
 */
export function favelaItems(eye: Vec3, fwd: Vec3, t: number, R: number, out: Item[]): void {
  const G = favelaGeo();
  const fl = Math.hypot(fwd[0], fwd[2]) || 1;
  const hx = fwd[0] / fl;
  const hz = fwd[2] / fl;
  const ahead = (x: number, z: number, rad: number) => {
    const rx = x - eye[0];
    const rz = z - eye[2];
    const depth = rx * hx + rz * hz;
    return depth > -rad && Math.abs(rx * hz - rz * hx) < depth * 1.1 + rad * 1.5 + 6;
  };
  const shifts = HILLS.map((p) => shiftNear(p.x, p.z, eye));
  const ringD = (hi: number, r: number, y: number) => {
    const p = HILLS[hi] as Hill;
    const [ox, oz] = shifts[hi] as [number, number];
    const flat = Math.hypot(eye[0] - ox - p.x, eye[2] - oz - p.z);
    return Math.hypot(Math.max(0, Math.abs(flat - r) - 0.12 * p.r), eye[1] - GROUND - y);
  };
  const seenHill = (hi: number) => {
    const p = HILLS[hi] as Hill;
    const [ox, oz] = shifts[hi] as [number, number];
    return ahead(ox + p.x, oz + p.z, p.r * 1.15);
  };
  const H = G.houses;
  for (const row of G.rows) {
    if (row.n <= 0 || !seenHill(row.hill)) continue;
    const d = ringD(row.hill, row.r, row.y);
    if (d > R) continue;
    const [ox, oz] = shifts[row.hill] as [number, number];
    const { start } = row;
    out.push({
      d,
      gid: mixId(row.hill * 211 + row.k, 74100),
      count: row.n * HOUSE_SITES,
      // Lines need more grains than the dots did: a little lighter each, so the pool holds.
      weight: 1.05,
      site: (s, o) => {
        const h = start + Math.floor(s / HOUSE_SITES);
        return houseSite(H, h, s % HOUSE_SITES, t, ox, oz, o);
      },
    });
  }
  const W = G.wires;
  for (const run of G.wireRuns) {
    if (run.n <= 0 || !seenHill(run.hill)) continue;
    const d = ringD(run.hill, run.r, run.y);
    if (d > R) continue;
    const [ox, oz] = shifts[run.hill] as [number, number];
    const { start } = run;
    out.push({
      d,
      gid: mixId(run.hill * 211 + Math.round(run.y * 10), 74400),
      count: run.n * WIRE_SITES,
      weight: 0.9,
      site: (s, o) => wireSite(W, start, s, ox, oz, o),
    });
  }
  const L = G.lights;
  for (const st of G.strings) {
    if (st.n <= 0 || !seenHill(st.hill)) continue;
    const d = ringD(st.hill, st.r, st.y + STOREY);
    if (d > R) continue;
    const [ox, oz] = shifts[st.hill] as [number, number];
    const { start } = st;
    out.push({
      d,
      gid: mixId(st.hill * 211 + Math.round(st.y), 74200),
      count: st.n,
      weight: 1.5,
      site: (s, o) => {
        const i = (start + s) * 4;
        o[0] = ox + (L[i] as number);
        o[1] = GROUND + (L[i + 1] as number);
        o[2] = oz + (L[i + 2] as number);
        const b = BULBS[L[i + 3] as number] as RGB;
        // Twinkling slowly, each bulb on its own phase.
        tint(o, b[0], b[1], b[2], 0.5 * (0.8 + 0.2 * Math.sin(0.45 * t + s * 1.7)));
        return true;
      },
    });
  }
  const S = G.steps;
  G.stairs.forEach((st, si) => {
    if (st.n <= 0 || !seenHill(st.hill)) return;
    const d = ringD(st.hill, st.r, st.y);
    if (d > R) return;
    const [ox, oz] = shifts[st.hill] as [number, number];
    const { start } = st;
    out.push({
      d: Math.max(0, d - 20),
      gid: mixId(si, 74300),
      count: st.n * 3,
      weight: 1.4,
      site: (s, o) => {
        const m = Math.floor(s / 3);
        const part = s % 3;
        const i = (start + m) * 5;
        let off = 0;
        let lift = 0;
        if (part < 2) {
          off = part === 0 ? -0.9 : 0.9;
          tint(o, 1, 0.86, 0.68, 0.3);
        } else {
          // A lamp at every eighth step.
          if (m % 8 !== 0) return false;
          off = 1.2;
          lift = 1.7;
          tint(o, 1, 0.7, 0.35, 0.6 * (0.88 + 0.12 * Math.sin(0.35 * t + m)));
        }
        o[0] = ox + (S[i] as number) + (S[i + 3] as number) * off;
        o[1] = GROUND + (S[i + 1] as number) + lift;
        o[2] = oz + (S[i + 2] as number) + (S[i + 4] as number) * off;
        return true;
      },
    });
  });
}

/** The far city's favela (lib/city-far.ts): a warm glow, in the quarter's colour, for every eighth house. */
export function favelaFar(
  put: (x: number, y: number, z: number, c: RGB, k: number, salt: number) => void,
  colour: RGB,
): void {
  const H = favelaGeo().houses;
  const n = H.length / HOUSE_STRIDE;
  const c: RGB = [colour[0] * 0.3, colour[1] * 0.3, colour[2] * 0.3];
  for (let h = 0; h < n; h += 8) {
    const i = h * HOUSE_STRIDE;
    put(
      STRIP_X / 2 + (H[i] as number),
      GROUND + (H[i + 7] as number),
      H[i + 1] as number,
      c,
      h,
      950,
    );
  }
}
