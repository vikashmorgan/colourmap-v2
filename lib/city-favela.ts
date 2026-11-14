/*
 * The Favela quarter of the City of Dreams (docs/specs/art-city.md, "Mountain and Favela
 * quarters"): hills densely covered with small stacked houses climbing their slopes, in the annex
 * beside the strip, past the river. Pure: no three.js, no DOM.
 *
 * 2026-11-14: "add the mountain and favela above, so the city becomes more square."
 *
 * Our own design, in a warm palette. Each hill is a low dome with a wavering foot, cut into
 * terraces; along every terrace stand small houses side by side, each its own width, one to three
 * storeys, painted coral, orange, ochre, rose, cream, now and then turquoise, lime or lilac. The
 * terraces step up so the houses stack over one another as they climb. Narrow alleys open between
 * them now and then, and four stairways climb straight up each hill, lamps along them. Windows
 * glow warm (not all of them); water tanks and antennas stand on the roofs; strings of small
 * lights hang along the terraces, twinkling slowly.
 *
 * Annex-local, as the Mountain quarter (lib/city-mountain.ts): `ax` across from the strip's edge
 * street, `lz` along the tile (FAVELA_Z0 to the tile's end). Laid out once into flat arrays; a
 * frame only reads them, and the sites write straight into the renderer's array. Light is mellow.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { GROUND, type Item, mixId, nearest, STRIP_X, TAU, TILE_X, TILE_Z } from './city-grid';
import { MOUNTAIN_Z1 } from './city-mountain';

/** The Favela quarter runs from the river (row 24) to the tile's end. */
export const FAVELA_Z0 = MOUNTAIN_Z1;

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
/** Nine hills past the river, annex-local, their feet inside the annex. */
export const HILLS: Hill[] = [
  hill(92, 930, 50, 74, 1),
  hill(228, 960, 62, 68, 2),
  hill(140, 1110, 56, 76, 3),
  hill(244, 1230, 44, 54, 4),
  hill(84, 1320, 52, 70, 5),
  hill(200, 1430, 66, 82, 6),
  hill(96, 1580, 46, 72, 7),
  hill(236, 1650, 58, 60, 8),
  hill(140, 1800, 50, 70, 9),
];
/** The houses stand this high at most over the hill's slope (three storeys and a tank). */
export const HOUSE_TOP = 8.5;
/** A terrace's rise, and a storey's. */
export const TERRACE = 3.6;
export const STOREY = 2.6;

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

/** The favela's height over the street at (ax, lz): its slope and its houses on it; 0 off the hills. */
export function favelaHeight(ax: number, lz: number): number {
  let h = -1;
  for (const p of HILLS) {
    const v = hillAt(p, ax, lz);
    if (v > h) h = v;
  }
  return h < 0 ? 0 : h + HOUSE_TOP;
}

/* ---------- laid out once: houses, light strings, stairs ---------- */

/** A house's numbers in the array: middle, foot, outward unit, half width and depth, top, colour, flags, phase. */
export const HOUSE_STRIDE = 13;
export const HOUSE_SITES = 28;
/** A row of houses along one terrace of one hill. */
export type Row = { hill: number; k: number; y: number; r: number; start: number; n: number };
/** A run of points (a string of lights, a stairway) in its array. */
export type Run = { hill: number; start: number; n: number; y: number; r: number };

export type FavelaGeo = {
  houses: Float32Array;
  rows: Row[];
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
/** The light strings' bulbs, in turn. */
const BULBS: RGB[] = [
  [1, 0.9, 0.7],
  [1, 0.66, 0.3],
  [1, 0.5, 0.6],
  [0.45, 0.9, 0.85],
  [1, 0.92, 0.45],
];
/** The angles round each hill its four stairways climb at, and how wide their way is kept. */
export const stairAngles = (p: Hill) => [0, 1, 2, 3].map((s) => p.p1 + (s * TAU) / 4 + 0.4);
const STAIR_HALF = 2.2;

/** The favela's geometry: built the first time it is asked for, the same object after. */
export function favelaGeo(): FavelaGeo {
  if (geo) return geo;
  const houses: number[] = [];
  const rows: Row[] = [];
  const lights: number[] = [];
  const strings: Run[] = [];
  const steps: number[] = [];
  const stairs: Run[] = [];
  HILLS.forEach((p, hi) => {
    const ways = stairAngles(p);
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
        const onStair = ways.some((s) => {
          const da = Math.abs(((a - s + Math.PI * 3) % TAU) - Math.PI);
          return da * rMean < STAIR_HALF + w / 2;
        });
        if (onStair) continue;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const rr = hillFoot(p, a) * shrink - depth / 2 - 0.2;
        const cx = p.x + ca * rr;
        const cz = p.z + sa * rr;
        // Buried in a higher neighbour's slope: not there.
        if (hillSurface(cx, cz) > y + TERRACE + 1) continue;
        const storeys = 1 + Math.floor(hash(key, 815) * (k === 0 ? 2 : 3));
        const tank = hash(key, 816) < 0.35 ? 1 : 0;
        const antenna = hash(key, 817) < 0.2 ? 1 : 0;
        let lit = 0;
        for (let b = 0; b < 6; b++) if (hash(key, 820 + b) < 0.55) lit |= 1 << b;
        const wall = WALLS[Math.floor(hash(key, 818) * WALLS.length)] as RGB;
        houses.push(
          cx,
          cz,
          y,
          ca,
          sa,
          w / 2,
          depth / 2,
          y + storeys * STOREY,
          wall[0],
          wall[1],
          wall[2],
          storeys | (tank << 2) | (antenna << 3) | (lit << 4),
          TAU * hash(key, 819),
        );
      }
      rows.push({ hill: hi, k, y, r: rMean, start, n: houses.length / HOUSE_STRIDE - start });
      // A string of small lights along every other terrace, sagging between its poles.
      if (k % 2 === 1) {
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
    // The stairways: straight up the slope from the foot to the top, at the kept angles.
    for (const a of ways) {
      const start = steps.length / 5;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const foot = hillFoot(p, a);
      for (let e = foot; e > 1; e -= 1) {
        const x = p.x + ca * e;
        const z = p.z + sa * e;
        const yy = Math.max(0, hillAt(p, x, z));
        if (hillSurface(x, z) > yy + 1) continue;
        steps.push(x, yy + 0.2, z, -sa, ca);
      }
      stairs.push({ hill: hi, start, n: steps.length / 5 - start, y: p.h / 2, r: foot / 2 });
    }
  });
  geo = {
    houses: new Float32Array(houses),
    rows,
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

/**
 * Site s (0..HOUSE_SITES) of house h into o: its roof's rim, its corners, its windows (the lit
 * ones), a water tank, an antenna's light. False where it has no such thing.
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
  const cx = H[i] as number;
  const cz = H[i + 1] as number;
  const y0 = H[i + 2] as number;
  const nx = H[i + 3] as number;
  const nz = H[i + 4] as number;
  const hw = H[i + 5] as number;
  const hd = H[i + 6] as number;
  const top = H[i + 7] as number;
  const flags = H[i + 11] as number;
  const ph = H[i + 12] as number;
  // a along the terrace (the tangent, -nz, nx), b out from the hill (n), h up.
  let a = 0;
  let b = 0;
  let y = top;
  if (s < 10) {
    const e = (s / 10) * 4;
    const side = Math.floor(e);
    const f = (e - side) * 2 - 1;
    a = (side === 0 ? f : side === 1 ? 1 : side === 2 ? -f : -1) * hw;
    b = (side === 0 ? -1 : side === 1 ? f : side === 2 ? 1 : -f) * hd;
    tint(o, H[i + 8] as number, H[i + 9] as number, H[i + 10] as number, 0.4);
  } else if (s < 18) {
    const q = s - 10;
    const corner = q >> 1;
    a = (corner & 1 ? 1 : -1) * hw;
    b = (corner & 2 ? 1 : -1) * hd;
    y = y0 + (top - y0) * (q & 1 ? 0.66 : 0.25);
    tint(o, H[i + 8] as number, H[i + 9] as number, H[i + 10] as number, 0.3);
  } else if (s < 24) {
    const q = s - 18;
    const storey = q >> 1;
    if (storey >= (flags & 3) || !((flags >> 4) & (1 << q))) return false;
    a = (q & 1 ? 0.45 : -0.45) * hw;
    b = hd + 0.05;
    y = y0 + storey * STOREY + 1.4;
    // Warm, a slow flicker of a lamp or a screen inside, never a flash.
    const k = 0.62 * (0.88 + 0.12 * Math.sin(0.3 * t + ph + q));
    tint(o, 1, q & 2 ? 0.72 : 0.82, q & 2 ? 0.42 : 0.55, k);
  } else if (s < 27) {
    if (!(flags & 4)) return false;
    const ang = ((s - 24) / 3) * TAU + ph;
    a = -0.4 * hw + Math.cos(ang) * 0.55;
    b = Math.sin(ang) * 0.55;
    y = top + 0.7;
    tint(o, 0.55, 0.75, 1, 0.38);
  } else {
    if (!(flags & 8)) return false;
    a = 0.5 * hw;
    y = top + 2.4;
    tint(o, 1, 0.35, 0.25, 0.45 * (0.8 + 0.2 * Math.sin(0.5 * t + ph)));
  }
  o[0] = ox + cx - nz * a + nx * b;
  o[1] = GROUND + y;
  o[2] = oz + cz + nx * a + nz * b;
  return true;
}

/** The shift from annex-local to the world for the annex's copy nearest the eye. */
function shiftNear(ax: number, lz: number, eye: Vec3): [number, number] {
  const x = STRIP_X / 2 + ax;
  return [nearest(x, eye[0], TILE_X) - x + STRIP_X / 2, nearest(lz, eye[2], TILE_Z) - lz];
}

/**
 * The favela's lit things round the eye, out to R: its rows of houses, its strings of lights and
 * its stairways, each an Item, kept to the view ahead.
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
      weight: 1.3,
      site: (s, o) => {
        const h = start + Math.floor(s / HOUSE_SITES);
        return houseSite(H, h, s % HOUSE_SITES, t, ox, oz, o);
      },
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
