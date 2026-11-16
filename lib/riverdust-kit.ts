/*
 * RIVERDUST, the kit (docs/specs/riverdust.md): the warm dusty palette and the grain primitives
 * every Riverdust design is made of. Each primitive is a Part (lib/city-shapes.ts): n light sites,
 * a formula from a site's place along the run (u, 0..1) and the time t to a point, and a colour.
 * Motion is slow (flags flutter, flames rise, water shimmers); nothing flashes. Pure: no three.js,
 * no DOM, so a design can be drawn anywhere later (the racing worlds).
 */

import { fibonacciSphere, hash, type RGB, type Vec3 } from './bigbang';
import { frac, lerp, mix, scale, TAU } from './city-grid';
import type { Part } from './city-shapes';

export { ball, type Part, ring, seg } from './city-shapes';

/* ---------- the palette: ochre, sand, burnt orange, burgundy, faded gold, dusk violet ---------- */

/** Warm dusty colours, bright as light (lamps, fire) or as cloth and stone; never white. */
export const RD = {
  sand: [0.86, 0.68, 0.44] as RGB,
  ochre: [0.82, 0.54, 0.24] as RGB,
  burnt: [0.88, 0.4, 0.16] as RGB,
  terracotta: [0.74, 0.36, 0.24] as RGB,
  burgundy: [0.66, 0.17, 0.24] as RGB,
  gold: [0.9, 0.72, 0.38] as RGB,
  saffron: [0.96, 0.62, 0.2] as RGB,
  rose: [0.8, 0.5, 0.44] as RGB,
  wood: [0.66, 0.42, 0.25] as RGB,
  stone: [0.7, 0.55, 0.42] as RGB,
  violet: [0.5, 0.38, 0.62] as RGB,
  palm: [0.54, 0.56, 0.3] as RGB,
  water: [0.56, 0.5, 0.66] as RGB,
  lamp: [1, 0.74, 0.4] as RGB,
  fire: [1, 0.52, 0.2] as RGB,
  ember: [0.95, 0.36, 0.14] as RGB,
};

/** Cloth and stone read dimmer than light: the shade structure is drawn in. */
export const dim = (c: RGB, k = 0.62): RGB => scale(c, k);

/** Prayer-flag colours, faded by sun and dust: blue, cream, red, green, yellow, in that order. */
export const PRAYER: RGB[] = [
  [0.48, 0.56, 0.68],
  [0.9, 0.84, 0.7],
  [0.8, 0.36, 0.28],
  [0.5, 0.62, 0.42],
  [0.92, 0.76, 0.4],
].map((c) => mix(c as RGB, RD.sand, 0.3));

/** The dusty banner colours of the flag avenue: orange and ochre, never a real flag. */
export const BANNER: RGB[] = [RD.burnt, RD.ochre, RD.saffron, RD.terracotta, RD.gold];

/* ---------- the primitives ---------- */

/** A run of n sites. */
export const P = (n: number, f: Part['f'], rgb: RGB, tw = 0): Part => ({
  n: Math.max(1, Math.round(n)),
  f,
  rgb,
  tw,
});

const at = (a: Vec3, b: Vec3, u: number): Vec3 => [
  lerp(a[0], b[0], u),
  lerp(a[1], b[1], u),
  lerp(a[2], b[2], u),
];

/** A line from a to b, sagging `sag` at its middle (a rope, a string of lamps). */
export const sag = (a: Vec3, b: Vec3, s: number, n: number, rgb: RGB, tw = 0): Part =>
  P(
    n,
    (u) => {
      const q = at(a, b, u);
      q[1] -= s * 4 * u * (1 - u);
      return q;
    },
    rgb,
    tw,
  );

/** A pole from the ground at (x, z) up to h. */
export const pole = (x: number, z: number, h: number, n: number, rgb = dim(RD.wood)): Part =>
  P(n, (u) => [x, u * h, z], rgb);

/**
 * A string of `count` small square flags hung from a to b (sagging `s`), each `w` wide, in the
 * five faded prayer colours in turn, one Part per colour. Each flag flutters gently across the
 * line, its lower edge most, slowly (the mellow rule). The string itself is the last Part.
 */
export function flagString(
  a: Vec3,
  b: Vec3,
  s: number,
  count: number,
  w: number,
  colours: RGB[] = PRAYER,
  per = 9,
): Part[] {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz) || 1;
  // Across the line, level: the way the cloth swings.
  const nx = -dz / len;
  const nz = dx / len;
  const k = colours.length;
  const parts: Part[] = colours.map((rgb, c) => {
    const m = Math.max(1, Math.floor((count - c + k - 1) / k));
    return P(
      m * per,
      (u, _s, t) => {
        const i = Math.min(m - 1, Math.floor(u * m));
        const j = c + i * k;
        const cell = Math.floor(frac(u * m) * per);
        const side = Math.round(Math.sqrt(per));
        const cu = (cell % side) / Math.max(1, side - 1);
        const cv = Math.floor(cell / side) / Math.max(1, side - 1);
        const v = (j + 0.5) / count;
        const top = at(a, b, v);
        top[1] -= s * 4 * v * (1 - v);
        const along = (cu - 0.5) * w * 0.85;
        const swing = Math.sin(t * 1.1 + j * 0.8 + cv * 1.6) * 0.32 * w * cv;
        return [
          top[0] + (dx / len) * along + nx * swing,
          top[1] - cv * w,
          top[2] + (dz / len) * along + nz * swing,
        ];
      },
      dim(rgb, 0.7),
    );
  });
  parts.push(sag(a, b, s, Math.max(6, len * 1.2), dim(RD.sand, 0.4)));
  return parts;
}

/**
 * A tall banner flying from the top of a pole at (x, z), `h` high: a cloth `w` long and `d` deep
 * blown along +x (or -x with dir -1), its waves running slowly out to its free end.
 */
export function banner(
  x: number,
  z: number,
  h: number,
  w: number,
  d: number,
  n: number,
  rgb: RGB,
  dir = 1,
  seed = 0,
): Part {
  const side = Math.max(2, Math.round(Math.sqrt(n * (w / d))));
  return P(
    n,
    (u, s, t) => {
      const cu = frac(u * side + hash(s, 3) * 0.01);
      const cv = Math.floor(u * side) / side;
      const wave = Math.sin(t * 0.9 + seed * 1.3 - cu * 4) * 0.35 * cu * w * 0.25;
      return [x + dir * cu * w, h - cv * d - cu * cu * d * 0.12, z + wave];
    },
    dim(rgb, 0.72),
  );
}

/** A round lantern (a lampion), radius r round c, a little taller than wide, breathing softly. */
export const lantern = (c: Vec3, r: number, n: number, rgb = RD.lamp, tw = 0.15): Part =>
  P(
    Math.max(6, n),
    (u) => {
      const m = Math.max(6, Math.round(n));
      const d = fibonacciSphere(Math.floor(u * m), m);
      return [c[0] + d[0] * r, c[1] + d[1] * r * 1.3, c[2] + d[2] * r];
    },
    rgb,
    tw,
  );

/** `count` lanterns hung along a sagging string from a to b, each `drop` under it on a thread. */
export function lanternString(
  a: Vec3,
  b: Vec3,
  s: number,
  count: number,
  r: number,
  per = 10,
  rgb = RD.lamp,
  drop = 0.6,
): Part[] {
  return [
    P(
      count * per,
      (u, _s, t) => {
        const i = Math.min(count - 1, Math.floor(u * count));
        const v = (i + 0.5) / count;
        const top = at(a, b, v);
        top[1] -= s * 4 * v * (1 - v) + drop + r;
        // A slow sway, a lantern on a breeze.
        top[0] += Math.sin(t * 0.6 + i * 1.7) * 0.06;
        const d = fibonacciSphere(Math.floor(frac(u * count) * per), per);
        return [top[0] + d[0] * r, top[1] + d[1] * r * 1.3, top[2] + d[2] * r];
      },
      rgb,
      0.15,
    ),
    sag(a, b, s, 8 + count, dim(RD.sand, 0.35)),
  ];
}

/**
 * A fire bowl on a short stand at (x, z): the bowl's rim at h, and its flame of grains rising
 * slowly from it, narrowing as they climb and fading out at the top, each on its own loop.
 */
export function fireBowl(x: number, z: number, h: number, r: number, n: number): Part[] {
  return [
    P(Math.max(4, n * 0.15), (u) => [x, u * h, z], dim(RD.stone)),
    P(
      Math.max(6, n * 0.25),
      (u) => [x + Math.cos(u * TAU) * r, h, z + Math.sin(u * TAU) * r],
      dim(RD.gold, 0.8),
    ),
    P(
      Math.max(8, n * 0.6),
      (u, s, t) => {
        const life = frac(t * 0.35 + hash(s, 5));
        const a = hash(s, 6) * TAU + t * 0.2;
        const rr = r * 0.8 * (1 - life) * Math.sqrt(hash(s, 7) + 0.05);
        return [x + Math.cos(a) * rr, h + 0.1 + life * r * 2.6 + u * 0.01, z + Math.sin(a) * rr];
      },
      RD.fire,
      0.18,
    ),
  ];
}

/** The twelve edges of a box round c, half-sizes hx, hy, hz. */
export function box(c: Vec3, hx: number, hy: number, hz: number, n: number, rgb: RGB): Part {
  const E: [Vec3, Vec3][] = [];
  for (const sy of [-1, 1])
    for (const sz of [-1, 1])
      E.push([
        [-1, sy, sz],
        [1, sy, sz],
      ]);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      E.push([
        [sx, -1, sz],
        [sx, 1, sz],
      ]);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      E.push([
        [sx, sy, -1],
        [sx, sy, 1],
      ]);
  return P(
    n,
    (u) => {
      const k = Math.min(11, Math.floor(u * 12));
      const v = frac(u * 12);
      const [a, b] = E[k] as [Vec3, Vec3];
      return [
        c[0] + lerp(a[0], b[0], v) * hx,
        c[1] + lerp(a[1], b[1], v) * hy,
        c[2] + lerp(a[2], b[2], v) * hz,
      ];
    },
    rgb,
  );
}

/**
 * Mud plaster: sites scattered over a box's four walls and its roof (c its middle), a soft
 * texture between the edges. Each site keeps its spot (a hash of its number).
 */
export function plaster(c: Vec3, hx: number, hy: number, hz: number, n: number, rgb: RGB): Part {
  const m = Math.max(1, Math.round(n));
  const wx = hx * 2;
  const wz = hz * 2;
  const tot = 2 * (wx + wz) * hy * 2 + wx * wz;
  return P(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const pick = hash(i, 11) * tot;
      const a = hash(i, 12);
      const b = hash(i, 13);
      const wall = 2 * (wx + wz) * hy * 2;
      if (pick > wall) return [c[0] + (a - 0.5) * wx, c[1] + hy, c[2] + (b - 0.5) * wz];
      // Round the walls: a place along the perimeter, and a height.
      let p = a * 2 * (wx + wz);
      const y = c[1] + (b - 0.5) * 2 * hy;
      if (p < wx) return [c[0] - hx + p, y, c[2] + hz];
      p -= wx;
      if (p < wz) return [c[0] + hx, y, c[2] + hz - p];
      p -= wz;
      if (p < wx) return [c[0] + hx - p, y, c[2] - hz];
      p -= wx;
      return [c[0] - hx, y, c[2] - hz + p];
    },
    rgb,
  );
}

/**
 * Warm windows on a box's front (+z face) and its two sides: `count` small lit squares spread
 * over `rows` by `cols` slots a face, about a third of the slots left dark, each breathing softly.
 */
export function windows(
  c: Vec3,
  hx: number,
  hy: number,
  hz: number,
  rows: number,
  cols: number,
  per = 4,
  rgb = RD.lamp,
  seed = 0,
): Part {
  const slots = rows * cols * 3;
  const lit = Math.max(1, Math.round(slots * 0.65));
  return P(
    lit * per,
    (u) => {
      const k = Math.min(lit - 1, Math.floor(u * lit));
      // The lit ones spread over the slots by the golden ratio, so the dark ones fall between.
      const w = Math.floor(frac(k * 0.618034 + seed * 0.137) * slots);
      const face = w % 3;
      const q0 = Math.floor(w / 3);
      const r = Math.floor(q0 / cols);
      const q = q0 % cols;
      const j = Math.floor(frac(u * lit) * per);
      const ox = ((j % 2) - 0.5) * 0.35;
      const oy = (Math.floor(j / 2) - 0.5) * 0.45;
      const y = c[1] - hy + ((r + 0.6) / (rows + 0.2)) * 2 * hy * 0.85 + oy;
      if (face === 0) {
        const x = c[0] - hx + ((q + 0.5) / cols) * 2 * hx + ox;
        return [x, y, c[2] + hz + 0.05];
      }
      const z = c[2] - hz + ((q + 0.5) / cols) * 2 * hz + ox;
      return [c[0] + (face === 1 ? hx + 0.05 : -hx - 0.05), y, z];
    },
    rgb,
    0.12,
  );
}

/** A doorway of light on a wall facing +z at (x, z): a small arch w wide and h tall. */
export const doorway = (x: number, z: number, w: number, h: number, n: number, rgb = RD.lamp) =>
  P(
    n,
    (u) => {
      // Up one side, over the round top, down the other.
      const leg = h - w / 2;
      if (u < 0.3) return [x - w / 2, (u / 0.3) * leg, z];
      if (u > 0.7) return [x + w / 2, ((1 - u) / 0.3) * leg, z];
      const v = (u - 0.3) / 0.4;
      return [x - Math.cos(v * Math.PI) * (w / 2), leg + Math.sin(v * Math.PI) * (w / 2), z];
    },
    rgb,
    0.1,
  );

/**
 * A round arch standing across the z axis at depth z: from (x - w/2, 0) up over a half ellipse
 * `h` tall at its crown back down to (x + w/2, 0); legs straight up to `leg`.
 */
export const arch = (
  x: number,
  z: number,
  w: number,
  leg: number,
  rise: number,
  n: number,
  rgb: RGB,
  tw = 0,
  y0 = 0,
): Part => {
  const L = leg * 2 + (Math.PI * (w / 2 + rise)) / 2;
  const f1 = leg / L;
  return P(
    n,
    (u) => {
      if (u < f1) return [x - w / 2, y0 + (u / f1) * leg, z];
      if (u > 1 - f1) return [x + w / 2, y0 + ((1 - u) / f1) * leg, z];
      const v = (u - f1) / (1 - 2 * f1);
      return [x - Math.cos(v * Math.PI) * (w / 2), y0 + leg + Math.sin(v * Math.PI) * rise, z];
    },
    rgb,
    tw,
  );
};

/** A cone (a nomad tent) at c, radius r, height h: `ribs` poles up to the tip and rings round. */
export function cone(
  c: Vec3,
  r: number,
  h: number,
  ribs: number,
  rings: number,
  n: number,
  rgb: RGB,
) {
  return [
    P(
      n * 0.5,
      (u) => {
        const k = Math.floor(u * ribs);
        const v = frac(u * ribs);
        const a = (k / ribs) * TAU;
        return [
          c[0] + Math.cos(a) * r * (1 - v),
          c[1] + v * h * 1.08,
          c[2] + Math.sin(a) * r * (1 - v),
        ];
      },
      rgb,
    ),
    P(
      n * 0.5,
      (u) => {
        const k = Math.floor(u * rings);
        const v = (k + 0.5) / rings;
        const a = frac(u * rings) * TAU;
        return [c[0] + Math.cos(a) * r * (1 - v), c[1] + v * h, c[2] + Math.sin(a) * r * (1 - v)];
      },
      dim(rgb, 0.8),
    ),
  ];
}

/**
 * A ridge tent (or a long Bedouin tent with `low` walls) along z at c: `len` long, w wide, its
 * ridge h high, its roof lines running along it, with `bays` poles under the ridge.
 */
export function ridgeTent(
  c: Vec3,
  len: number,
  w: number,
  h: number,
  n: number,
  rgb: RGB,
  low = 0,
  bays = 3,
): Part[] {
  const lines = 7;
  return [
    P(
      n * 0.7,
      (u) => {
        const k = Math.floor(u * lines);
        const v = (k / (lines - 1)) * 2 - 1;
        const z = c[2] + (frac(u * lines) - 0.5) * len;
        const x = c[0] + v * (w / 2);
        const y = c[1] + low + (1 - Math.abs(v)) * (h - low);
        return [x, y, z];
      },
      rgb,
    ),
    // The gable ends.
    P(
      n * 0.2,
      (u) => {
        const end = u < 0.5 ? -1 : 1;
        const v = frac(u * 2) * 2 - 1;
        return [
          c[0] + v * (w / 2),
          c[1] + low + (1 - Math.abs(v)) * (h - low),
          c[2] + (end * len) / 2,
        ];
      },
      dim(rgb, 0.8),
    ),
    P(
      n * 0.1,
      (u) => {
        const k = Math.floor(u * (bays + 1));
        return [c[0], c[1] + frac(u * (bays + 1)) * h, c[2] + (k / bays - 0.5) * len];
      },
      dim(RD.wood),
    ),
  ];
}

/**
 * A cloth sheet on four corners (a, b along one edge, d, c2 along the other), sagging `s` at its
 * middle, drawn as a grid of `lines` threads each way; `flutter` lifts and drops it slowly.
 */
export function sheet(
  a: Vec3,
  b: Vec3,
  c2: Vec3,
  d: Vec3,
  s: number,
  n: number,
  rgb: RGB,
  lines = 6,
  flutter = 0.15,
  seed = 0,
): Part {
  return P(
    n,
    (u, _s, t) => {
      const both = lines * 2;
      const k = Math.floor(u * both);
      const v = frac(u * both);
      const across = (k % lines) / (lines - 1);
      const [p, q] = k < lines ? [across, v] : [v, across];
      const top = at(a, b, p);
      const bot = at(d, c2, p);
      const m = at(top, bot, q);
      const bulge = 4 * p * (1 - p) * 4 * q * (1 - q);
      m[1] -= s * bulge;
      m[1] += Math.sin(t * 0.7 + seed + p * 3 + q * 2) * flutter * bulge;
      return m;
    },
    rgb,
  );
}

/** A dome over c, radius r, squashed by sq: its upper half of a sphere. */
export const dome = (c: Vec3, r: number, n: number, rgb: RGB, sq = 1): Part => {
  const m = Math.max(4, Math.round(n));
  return P(
    m,
    (u) => {
      const d = fibonacciSphere(Math.floor(u * m), 2 * m);
      return [c[0] + d[0] * r, c[1] + d[1] * r * sq, c[2] + d[2] * r];
    },
    rgb,
  );
};

/** A palm at (x, z), h tall, leaning `lean` along x: a curved trunk and a crown of drooping fronds. */
export function palm(x: number, z: number, h: number, lean: number, n: number): Part[] {
  const top: Vec3 = [x + lean, h, z];
  const fronds = 8;
  return [
    P(n * 0.35, (u) => [x + lean * u * u, u * h, z], dim(RD.wood, 0.7)),
    P(
      n * 0.65,
      (u, _s, t) => {
        const k = Math.floor(u * fronds);
        const v = frac(u * fronds);
        const a = (k / fronds) * TAU + 0.3;
        const len = h * 0.42;
        const sway = Math.sin(t * 0.5 + k) * 0.08;
        return [
          top[0] + Math.cos(a + sway) * v * len,
          top[1] + v * len * 0.35 - v * v * len * 0.75,
          top[2] + Math.sin(a + sway) * v * len,
        ];
      },
      dim(RD.palm, 0.85),
    ),
  ];
}

/**
 * A rough rock mass round c, radii rx, ry, rz: sites on a lumpy ellipsoid (lumps from a hash of
 * the direction, the same every frame), its foot flattened onto the ground.
 */
export function rock(c: Vec3, rx: number, ry: number, rz: number, n: number, rgb: RGB, seed = 0) {
  const m = Math.max(4, Math.round(n));
  return P(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const d = fibonacciSphere(i, m);
      const lump =
        1 +
        0.12 * Math.sin(d[0] * 5 + seed) * Math.cos(d[2] * 4 + seed) +
        0.06 * Math.sin(d[1] * 9 + seed * 2);
      return [
        c[0] + d[0] * rx * lump,
        Math.max(0, c[1] + d[1] * ry * lump),
        c[2] + d[2] * rz * lump,
      ];
    },
    rgb,
  );
}

/** A ladder leaning from foot a up to top b: two rails and `rungs` rungs. */
export function ladder(a: Vec3, b: Vec3, rungs: number, n: number, rgb = dim(RD.wood, 0.8)): Part {
  const w = 0.35;
  return P(
    n,
    (u) => {
      if (u < 0.6) {
        const side = u < 0.3 ? -1 : 1;
        const q = at(a, b, frac(u / 0.3));
        return [q[0] + side * w, q[1], q[2]];
      }
      const v = (u - 0.6) / 0.4;
      const k = Math.floor(v * rungs);
      const q = at(a, b, (k + 0.5) / rungs);
      return [q[0] + (frac(v * rungs) * 2 - 1) * w, q[1], q[2]];
    },
    rgb,
  );
}

/** Dots scattered over a level patch round c (x half-width hx, z half-depth hz) at height y. */
export const scatter = (c: Vec3, hx: number, hz: number, n: number, rgb: RGB, tw = 0, salt = 0) => {
  const m = Math.max(1, Math.round(n));
  return P(
    m,
    (u) => {
      const i = Math.floor(u * m);
      return [
        c[0] + (hash(i, 21 + salt) - 0.5) * 2 * hx,
        c[1],
        c[2] + (hash(i, 22 + salt) - 0.5) * 2 * hz,
      ];
    },
    rgb,
    tw,
  );
};

/**
 * Water from x0 to x1 and z0 to z1 at height y: short glints on lines across it, drifting slowly
 * downstream (along -z by `flow`) and rippling, the dusk's violet with gold lights in it.
 */
export function water(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  n: number,
  y = 0.05,
  flow = 0.6,
) {
  const m = Math.max(1, Math.round(n));
  return [
    P(
      m * 0.8,
      (u, _s, t) => {
        const i = Math.floor(u * m * 0.8);
        const x = lerp(x0, x1, hash(i, 31));
        const z = z1 + frac(hash(i, 32) + (t * flow) / Math.max(1, Math.abs(z1 - z0))) * (z0 - z1);
        return [x + Math.sin(t * 0.5 + i) * 0.1, y, z];
      },
      dim(RD.water, 0.7),
    ),
    P(
      m * 0.2,
      (u, _s, t) => {
        const i = Math.floor(u * m * 0.2);
        const x = lerp(x0, x1, 0.3 + 0.4 * hash(i, 33));
        const z = lerp(z0, z1, hash(i, 34));
        return [x + Math.sin(t * 0.4 + i * 2) * 0.3, y, z];
      },
      dim(RD.gold, 0.75),
      0.18,
    ),
  ];
}

/**
 * Tiers of a grandstand along z at x (facing +x, or -x with face -1): `steps` stepped rows from
 * the front at x up and back, each `depth` deep and `rise` high, `len` long, with the step edges
 * as lines and spectators as warm dots on each row.
 */
export function tiers(
  x: number,
  z: number,
  len: number,
  steps: number,
  depth: number,
  rise: number,
  n: number,
  face = 1,
  rgb = dim(RD.ochre, 0.55),
): Part[] {
  const back = -face;
  return [
    P(
      n * 0.55,
      (u) => {
        const k = Math.floor(u * steps * 2);
        const v = frac(u * steps * 2);
        const step = Math.floor(k / 2);
        // The nose of each step, then the back of its tread.
        const off = (step + (k % 2)) * depth;
        return [x + back * off, (step + 1) * rise, z + (v - 0.5) * len];
      },
      rgb,
    ),
    P(
      n * 0.45,
      (u) => {
        const i = Math.floor(u * n * 0.45);
        const step = Math.floor(hash(i, 41) * steps);
        const off = (step + 0.5) * depth;
        const zz = z + (hash(i, 42) - 0.5) * len;
        return [x + back * off, (step + 1) * rise + 0.45, zz];
      },
      mix(RD.rose, RD.lamp, 0.3),
      0.08,
    ),
  ];
}

/* ---------- placing ---------- */

/** A part turned by `rot` round the vertical, scaled by s, then moved to o. */
export function placePart(p: Part, o: Vec3, rot = 0, s = 1): Part {
  if (rot === 0 && s === 1 && o[0] === 0 && o[1] === 0 && o[2] === 0) return p;
  const c = Math.cos(rot);
  const n = Math.sin(rot);
  return {
    ...p,
    f: (u, k, t) => {
      const q = p.f(u, k, t);
      return [o[0] + (q[0] * c + q[2] * n) * s, o[1] + q[1] * s, o[2] + (-q[0] * n + q[2] * c) * s];
    },
  };
}
export const place = (ps: Part[], o: Vec3, rot = 0, s = 1) =>
  ps.map((p) => placePart(p, o, rot, s));

/* ---------- rock and boats ---------- */

/** A smooth hash noise in two numbers, -1..1. */
export const wobble = (a: number, b: number, seed = 0) =>
  Math.sin(a * 0.37 + seed) * Math.cos(b * 0.29 - seed) * 0.6 +
  Math.sin(a * 1.13 + b * 0.71 + seed * 2) * 0.4;

/**
 * A cliff face facing +z at depth z, from x0 to x1 and up to h: sites on a rough wall (bulging by
 * up to `rough`), leaving open where `hole(x, y)` says (a cave mouth, a carved door).
 */
export function cliff(
  x0: number,
  x1: number,
  h: number,
  z: number,
  n: number,
  rgb = dim(RD.stone, 0.5),
  rough = 1.6,
  hole?: (x: number, y: number) => boolean,
): Part {
  const m = Math.max(1, Math.round(n));
  return P(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const x = lerp(x0, x1, hash(i, 51));
      const y = h * Math.sqrt(hash(i, 52));
      const open = hole?.(x, y);
      // A site in the hole slips back into the rock beside it: the mouth stays dark.
      const xx = open ? (x < (x0 + x1) / 2 ? x0 : x1) - Math.sign(x1 - x0) * hash(i, 53) * 2 : x;
      return [xx, y, z + wobble(xx, y) * rough - (y / h) * rough];
    },
    rgb,
  );
}

/**
 * A rock wall along z at x (its face toward the middle, x = 0), from z0 to z1 and up to h,
 * leaning back as it climbs: a canyon's side.
 */
export function canyonWall(
  x: number,
  z0: number,
  z1: number,
  h: number,
  n: number,
  rgb = dim(RD.terracotta, 0.5),
) {
  const m = Math.max(1, Math.round(n));
  const side = Math.sign(x) || 1;
  return P(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const z = lerp(z0, z1, hash(i, 61));
      const y = h * Math.sqrt(hash(i, 62));
      return [x + side * (wobble(z, y, 3) * 1.4 + y * 0.18), y, z];
    },
    rgb,
  );
}

/** A thick rock arch across z at depth z: a lumpy band `th` thick over a half ellipse w wide, h high. */
export function rockArch(
  z: number,
  w: number,
  h: number,
  th: number,
  n: number,
  rgb = dim(RD.terracotta, 0.6),
) {
  const m = Math.max(1, Math.round(n));
  return P(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const a = hash(i, 71) * Math.PI;
      const r = th * Math.sqrt(hash(i, 72));
      const b = hash(i, 73) * TAU;
      const cx = -Math.cos(a) * (w / 2);
      const cy = Math.sin(a) * h;
      const lump = 1 + 0.25 * wobble(a * 9, b, 5);
      return [
        cx + Math.cos(b) * r * lump * 0.6,
        Math.max(0, cy + Math.sin(b) * r * lump),
        z + Math.cos(b + 1) * r,
      ];
    },
    rgb,
  );
}

/** A small boat along z at c, `len` long: its gunwale, keel line and a mast with a lamp at the prow. */
export function boat(c: Vec3, len: number, n: number, rgb = dim(RD.wood, 0.8)): Part[] {
  const w = len * 0.22;
  return [
    P(
      n * 0.6,
      (u) => {
        const a = u * TAU;
        const z = Math.cos(a) * len * 0.5;
        const x = Math.sin(a) * w * (1 - (z / len) ** 2 * 2);
        return [c[0] + x, c[1] + 0.5 + Math.abs(z / len) * 0.4, c[2] + z];
      },
      rgb,
    ),
    P(n * 0.2, (u) => [c[0], c[1] - 0.1, c[2] + (u - 0.5) * len * 0.9], dim(rgb, 0.7)),
    P(n * 0.12, (u) => [c[0], c[1] + 0.5 + u * len * 0.5, c[2] - len * 0.1], dim(RD.wood, 0.7)),
    lantern([c[0], c[1] + 1.2, c[2] - len * 0.45], 0.25, n * 0.08),
  ];
}
