/*
 * WIND — air passing over an object, from its left to its right.
 *
 * Asked for 2026-10-18 for the Ferrari project: "an object with currents of
 * wind passing from its left to its right … to represent aerodynamics, the
 * wind passing over an object. The union of science and art. Start with an
 * object, later do it with a car."
 *
 * Not a fluid solver: a field that behaves the way a wind tunnel's smoke does,
 * cheap enough for thousands of particles a frame.
 *  - The wind blows left to right at speed 1.
 *  - Near the object the part of the wind heading into it is taken away, so the
 *    air stops on the nose (the stagnation point) and slides round the body.
 *  - Over the shoulders the air speeds up (where the pressure drops: lift).
 *  - Behind it, a wake: slower air with vortices shed alternately up and down
 *    (a Kármán street), strong behind a blunt body, faint behind a wing.
 *
 * The object is a signed distance function, so any outline works: a circle, a
 * wing, a polygon. A car is one more polygon (see BODY).
 *
 * World units: the view is 2.2 high, centred on (0, 0); the object sits a
 * little left of centre so its wake has room.
 */

export type Vec = [number, number];

export type WindShape = {
  name: string;
  /** Signed distance: negative inside, positive outside. */
  sdf: (x: number, y: number) => number;
  /** How far ahead the air feels the object. */
  reach: number;
  /** The x where the wake starts, and the wake's half-height there. */
  tail: number;
  half: number;
  /** Vortex strength behind it: 1 for a blunt body, small for a wing. */
  bluff: number;
  /** Mean downwash behind it (a wing at an angle pushes the air down). */
  downwash: number;
  /** The outline, for drawing: closed polygon in world units. */
  outline: Vec[];
};

/* ---------- Outlines ---------- */

/** Distance from a point to a closed polygon, negative inside. */
export function polygonSdf(poly: Vec[], x: number, y: number): number {
  let d = Number.POSITIVE_INFINITY;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]!;
    const [bx, by] = poly[i]!;
    const ex = bx - ax;
    const ey = by - ay;
    const wx = x - ax;
    const wy = y - ay;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    const dx = wx - ex * t;
    const dy = wy - ey * t;
    d = Math.min(d, dx * dx + dy * dy);
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return (inside ? -1 : 1) * Math.sqrt(d);
}

const CX = -0.45;

/** A sphere (a circle in the section): the classic wind-tunnel object, with the strongest wake. */
function sphere(): WindShape {
  const r = 0.32;
  const outline: Vec[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    outline.push([CX + Math.cos(a) * r, Math.sin(a) * r]);
  }
  return {
    name: 'sphere',
    sdf: (x, y) => Math.hypot(x - CX, y) - r,
    reach: 0.22,
    tail: CX + r * 0.6,
    half: r,
    bluff: 1,
    downwash: 0,
    outline,
  };
}

/** A wing (NACA 0012 section) at eight degrees: the air above it runs faster, the air behind it is pushed down. */
function wing(): WindShape {
  const chord = 1.1;
  const t = 0.14;
  const aoa = (-8 * Math.PI) / 180;
  const top: Vec[] = [];
  const bottom: Vec[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    // Points closer together at the round nose.
    const u = (1 - Math.cos((i / N) * Math.PI)) / 2;
    const yt =
      5 *
      t *
      (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    top.push([u, yt]);
    bottom.push([u, -yt]);
  }
  const local = [...top, ...bottom.slice(1, -1).reverse()];
  const ca = Math.cos(aoa);
  const sa = Math.sin(aoa);
  const outline: Vec[] = local.map(([u, v]) => {
    const px = (u - 0.35) * chord;
    const py = v * chord;
    return [CX + 0.1 + px * ca - py * sa, px * sa + py * ca];
  });
  return {
    name: 'wing',
    sdf: (x, y) => polygonSdf(outline, x, y),
    reach: 0.16,
    tail: CX + 0.1 + 0.65 * chord * ca,
    half: 0.08,
    bluff: 0.18,
    downwash: -0.16,
    outline,
  };
}

/**
 * A streamlined body: a long low shape, round at the front, flat underneath,
 * tapering at the back. The step before a car: replace these points with a
 * car's side outline and the same air flows over it.
 */
export const BODY: Vec[] = [
  [-1.0, -0.12],
  [-0.98, -0.02],
  [-0.92, 0.07],
  [-0.8, 0.14],
  [-0.6, 0.19],
  [-0.35, 0.27],
  [-0.15, 0.31],
  [0.05, 0.3],
  [0.25, 0.24],
  [0.45, 0.14],
  [0.62, 0.05],
  [0.7, 0.0],
  [0.7, -0.08],
  [0.55, -0.14],
  [-0.9, -0.14],
];

function body(): WindShape {
  const outline: Vec[] = BODY.map(([x, y]) => [x * 0.95 + CX + 0.2, y * 0.95]);
  return {
    name: 'body',
    sdf: (x, y) => polygonSdf(outline, x, y),
    reach: 0.16,
    tail: CX + 0.2 + 0.62 * 0.95,
    half: 0.2,
    bluff: 0.55,
    downwash: -0.03,
    outline,
  };
}

export const WIND_SHAPES: WindShape[] = [sphere(), wing(), body()];

/** The shape for a preset's choice (0 sphere, 1 wing, 2 body). */
export function windShape(choice: number): WindShape {
  return WIND_SHAPES[Math.max(0, Math.min(WIND_SHAPES.length - 1, Math.round(choice)))]!;
}

/* ---------- The field ---------- */

/** The surface normal (pointing out of the object) at a point, from the distance function. */
export function normalAt(shape: WindShape, x: number, y: number): Vec {
  const e = 0.003;
  const nx = shape.sdf(x + e, y) - shape.sdf(x - e, y);
  const ny = shape.sdf(x, y + e) - shape.sdf(x, y - e);
  const n = Math.hypot(nx, ny) || 1;
  return [nx / n, ny / n];
}

/**
 * The wind's velocity at (x, y) at time t. `turbulence` scales the wake's
 * vortices (0 calm, 1 strong).
 */
export function windVelocity(
  shape: WindShape,
  x: number,
  y: number,
  t: number,
  turbulence = 0.6,
): Vec {
  let vx = 1;
  let vy = 0;
  const d = shape.sdf(x, y);
  if (d < shape.reach * 4) {
    const [nx, ny] = normalAt(shape, x, y);
    // Take away the part of the wind heading into the object: it stops on the nose and slides round.
    const w = Math.exp(-Math.max(d, 0) / shape.reach);
    const un = vx * nx + vy * ny;
    if (un < 0) {
      vx -= nx * un * w;
      vy -= ny * un * w;
    }
    // Over the shoulders, where the air runs along the surface, it speeds up.
    const tx = -ny;
    const ty = nx;
    const ut = vx * tx + vy * ty;
    const boost = 0.9 * Math.exp(-Math.max(d, 0) / (shape.reach * 0.7));
    vx += tx * ut * boost;
    vy += ty * ut * boost;
    // Inside (a particle that slipped in) is pushed straight out.
    if (d < 0) {
      vx += nx * 3;
      vy += ny * 3;
    }
  }
  // The wake: slower air, vortices shed alternately above and below, widening downstream.
  const behind = x - shape.tail;
  if (behind > -0.05) {
    const along = Math.max(0, behind);
    const width = shape.half * (1 + 1.1 * along);
    const env = Math.exp(-((y / width) ** 2)) * Math.exp(-along / 2.2);
    const k = 7 / (1 + 0.6 * along);
    const amp = turbulence * shape.bluff * 0.75;
    vy += amp * env * Math.sin(k * along - 6 * t) + shape.downwash * env;
    vx -= 0.4 * shape.bluff * env * (0.6 + 0.4 * Math.cos(k * along - 6 * t));
    // The low pressure behind the body draws the air in, so smoke curls into the wake instead of leaving it empty.
    vy -= (y / width) * 0.6 * env * (0.25 + shape.bluff) * Math.exp(-along / 0.9);
    // Smaller eddies on top, so no two passes look the same.
    vy += amp * 0.35 * env * Math.sin(2.7 * k * along - 11 * t + y * 9);
  }
  return [vx, vy];
}

/* ---------- Colour ---------- */

/**
 * The colour of air at a speed, as [hue, saturation, lightness]: slow air
 * (high pressure, on the nose and in the wake) deep blue, free stream cyan,
 * fast air over the shoulders white turning gold. A science figure's colour
 * map, warmed for a gallery.
 */
export function speedColour(speed: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, (speed - 0.25) / 1.35));
  const stops: [number, number, number][] = [
    [222, 85, 42],
    [196, 90, 58],
    [178, 70, 74],
    [44, 95, 72],
  ];
  const f = u * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  const v = f - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v];
}
