/*
 * The Space Bar series (docs/specs/art-city.md, "Space bars, the Saturn tower, the great arch",
 * 2026-11-14): five flying bars of our own, big floating buildings with open terraces, warm lamps
 * and a glowing name over each. One to a pill in the City's Studio, and the same five floating in
 * the game city's sky (lib/city-bars.ts).
 *
 * 2026-11-14: "a space bar in big flying buildings with terraces, warm, beautiful. Add 5 space bars
 * to the designs as a category of its own. Some more elegant with golden lights, with a name above.
 * One is the Flying Saloon, cowboy style."
 *
 * Every bar is grains from the shared primitives (lib/city-shapes.ts) and a few of its own here,
 * built once round its own middle (its main deck at y 0), its name sign standing over it, read the
 * right way from the front and from behind. Light is mellow and warm: amber and gold lamps breathe
 * softly, nothing flashes; the only motion in a model is slow (the saloon's swinging doors, the
 * balloon's burner). Original designs only. Pure: no three.js, no DOM.
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import { textPixels } from './city-font';
import { C, frac, lerp, mix, scale, TAU } from './city-grid';
import { ball, type Model, model, type Part, ring, seg, turned } from './city-shapes';
import type { BuildingSet } from './golden-quarters';
import { GROUND_Y, type Mesh, Tone } from './grain-mesh';

/* ---------- warm shades ---------- */

/** A lamp's warm glow, a golden one, a wood brown, a deep amber and a pale cream (never white). */
export const BAR_TONES = {
  lamp: [1, 0.72, 0.38] as RGB,
  gold: C.gold,
  wood: [0.78, 0.46, 0.24] as RGB,
  amber: scale(C.amber, 0.85),
  cream: mix(C.warm, C.ivory, 0.5),
  rock: [0.62, 0.42, 0.3] as RGB,
  leaf: mix(C.leaf, C.gold, 0.45),
  rose: mix(C.rose, C.warm, 0.4),
};
const T = BAR_TONES;

/* ---------- a few primitives of our own ---------- */

const part = (n: number, f: Part['f'], rgb: RGB, tw = 0): Part => ({
  n: Math.max(1, Math.round(n)),
  f,
  rgb,
  tw,
});

/** The twelve edges of a box round (cx, cy, cz), half-sizes hx, hy, hz. */
function boxEdges(c: Vec3, hx: number, hy: number, hz: number, n: number, rgb: RGB): Part {
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
  return part(
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

/** k parallel planks across a level deck (along x), from z0 to z1, half-width hx, at height y. */
function planks(hx: number, z0: number, z1: number, y: number, k: number, n: number, rgb: RGB) {
  return part(
    n,
    (u) => {
      const i = Math.min(k - 1, Math.floor(u * k));
      return [lerp(-hx, hx, frac(u * k)), y, lerp(z0, z1, (i + 0.5) / k)];
    },
    rgb,
  );
}

/** A filled level disc of lights (sunflower spread), radius r at height y. */
function disc(c: Vec3, r: number, n: number, rgb: RGB, tw = 0) {
  const m = Math.max(1, Math.round(n));
  return part(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const a = i * 2.39996;
      const rr = r * Math.sqrt((i + 0.5) / m);
      return [c[0] + Math.cos(a) * rr, c[1], c[2] + Math.sin(a) * rr];
    },
    rgb,
    tw,
  );
}

/** A string of lamps hung from a to b, sagging `sag` at its middle. */
function lampString(a: Vec3, b: Vec3, sag: number, n: number, rgb: RGB, tw = 0.15) {
  return part(
    n,
    (u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u)],
    rgb,
    tw,
  );
}

/** A rail round a level circle at height y: its top ring and k posts down to y - h. */
function circleRail(r: number, y: number, h: number, k: number, n: number, rgb: RGB): Part[] {
  return [
    ring([0, y, 0], r, n * 0.7, rgb),
    part(
      n * 0.3,
      (u) => {
        const i = Math.min(k - 1, Math.floor(u * k));
        const a = (i * TAU) / k;
        return [Math.cos(a) * r, y - h * frac(u * k), Math.sin(a) * r];
      },
      rgb,
    ),
  ];
}

/** A floating rock under a deck: a rough inverted cone, radius r at y 0 down to a point at -depth. */
function rock(r: number, depth: number, n: number, rgb: RGB, seed: number): Part {
  const m = Math.max(1, Math.round(n));
  return part(
    m,
    (u) => {
      const i = Math.floor(u * m);
      const v = (i + 0.5) / m;
      const a = i * 2.39996;
      // A lumpy profile: wide near the top, narrowing faster toward the point.
      const lump = 0.8 + 0.25 * hash(i, seed);
      const rr = r * (1 - v) ** 0.7 * lump;
      return [Math.cos(a) * rr, -depth * v - 1, Math.sin(a) * rr];
    },
    rgb,
  );
}

/**
 * A name sign standing over a bar at height y (its letters' foot), centred, `px` a pixel: the words
 * on the front (read from +z) and again on the back laid the other way (read from -z), so they are
 * never mirrored; a quiet frame round them.
 */
export function nameSign(
  text: string,
  y: number,
  px: number,
  rgb: RGB,
  frame: RGB,
  depth = 0.15,
): Part[] {
  const Tx = textPixels(text, { face: 'deco', fill: true });
  const W = Tx.w * px;
  const H = Tx.h * px;
  const n = Tx.px.length / 2;
  const letters = (side: 1 | -1) =>
    part(
      n,
      (u) => {
        const i = Math.min(n - 1, Math.floor(u * n));
        const x = ((Tx.px[i * 2] as number) + 0.5) * px - W / 2;
        const yy = y + H - ((Tx.px[i * 2 + 1] as number) + 0.5) * px;
        return [side * x, yy, side * depth];
      },
      rgb,
      0.06,
    );
  const m = 1.6 * px;
  const box = part(
    Math.ceil((2 * (W + H + 4 * m)) / (px * 1.4)),
    (u) => {
      const ww = W + 2 * m;
      const hh = H + 2 * m;
      const e = u * 2 * (ww + hh);
      let x: number;
      let yy: number;
      if (e < ww) [x, yy] = [e, 0];
      else if (e < ww + hh) [x, yy] = [ww, e - ww];
      else if (e < 2 * ww + hh) [x, yy] = [2 * ww + hh - e, hh];
      else [x, yy] = [0, 2 * (ww + hh) - e];
      // On a deep sign (the arch's attic) the frame is shared between its two faces.
      const z = depth > 1 ? (frac(u * 977) < 0.5 ? depth : -depth) : 0;
      return [x - ww / 2, y - m + yy, z];
    },
    frame,
  );
  return [letters(1), letters(-1), box];
}

/** One bar of the series: its name, its sign's words, its idea, its parts and its sign's height. */
export type BarDesign = {
  name: string;
  /** The words on its sign. */
  sign: string;
  idea: string;
  /** Its parts, round its middle (main deck at y 0). */
  make: () => Part[];
  /** Where its sign's letters stand (their foot, over the deck). */
  signY: number;
};

/* ---------- the five ---------- */

/** The Flying Saloon: a wooden western saloon on a floating rock, porch terrace, swinging doors. */
function flyingSaloon(): Part[] {
  const ps: Part[] = [];
  // The rock and the plank deck on it.
  ps.push(rock(22, 26, 520, T.rock, 31));
  ps.push(planks(20, -16, 16, 0, 14, 380, T.wood));
  ps.push(boxEdges([0, -0.6, 0], 20, 0.6, 16, 140, T.wood));
  // The saloon: two storeys of wood, its false front rising over the roof with a stepped top.
  ps.push(boxEdges([0, 7, -3], 12, 7, 8, 240, T.wood));
  ps.push(planks(12, -11, 5, 7, 6, 90, scale(T.wood, 0.8)));
  ps.push(
    part(
      150,
      (u) => {
        // The false front's outline on +z: up the sides to 18, stepping in to a crest at 21.
        const pts: [number, number][] = [
          [-12, 0],
          [-12, 18],
          [-8, 18],
          [-8, 20],
          [-3, 20],
          [-3, 21.5],
          [3, 21.5],
          [3, 20],
          [8, 20],
          [8, 18],
          [12, 18],
          [12, 0],
        ];
        const k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
        const v = frac(u * (pts.length - 1));
        const a = pts[k] as [number, number];
        const b = pts[k + 1] as [number, number];
        return [lerp(a[0], b[0], v), lerp(a[1], b[1], v), 5.05];
      },
      T.wood,
    ),
  );
  // Upstairs windows, warm, and a balcony rail across the front.
  for (const wx of [-8, -3, 3, 8]) ps.push(disc([wx, 10.5, 5.2], 1.1, 10, T.lamp, 0.08));
  ps.push(seg([-12, 9, 9], [12, 9, 9], 40, T.wood), seg([-12, 7.6, 9], [12, 7.6, 9], 30, T.wood));
  // The porch: its roof on six posts, the terrace boards under it, a rail with a gap at the doors.
  for (const px of [-11, -6.5, -2.2, 2.2, 6.5, 11])
    ps.push(seg([px, 0, 13], [px, 7, 13], 10, T.wood));
  ps.push(planks(12, 5, 13.5, 7.2, 4, 80, scale(T.wood, 0.9)));
  ps.push(
    seg([-11, 1.6, 13], [-2.2, 1.6, 13], 16, T.wood),
    seg([2.2, 1.6, 13], [11, 1.6, 13], 16, T.wood),
  );
  // Swinging doors, a pair under the lamp, swaying gently on their hinges.
  for (const s of [-1, 1])
    ps.push(
      part(
        40,
        (u, _s, t) => {
          const a = 0.35 * Math.sin(t * 0.6 + s);
          const row = Math.floor(u * 4);
          const v = frac(u * 4);
          const w = 1.6 * v;
          return [s * (1.7 - w * Math.cos(a)), 2 + row * 0.9, 5.2 + w * Math.sin(a) * s];
        },
        T.cream,
      ),
    );
  ps.push(disc([0, 5.6, 5.4], 1.4, 18, T.lamp, 0.1));
  // Lanterns hung along the porch roof's edge.
  ps.push(lampString([-12, 6.8, 13.4], [12, 6.8, 13.4], 0.9, 44, T.lamp, 0.12));
  for (const lx of [-9, -4.5, 0, 4.5, 9]) ps.push(ball([lx, 5.6, 13.6], 0.6, 8, T.amber, 1, 0.1));
  // The lantern sign on the false front: a board with a lamp at each end.
  ps.push(boxEdges([0, 15, 5.3], 8, 1.6, 0.1, 60, T.gold));
  ps.push(
    ball([-9, 15, 5.6], 0.8, 10, T.lamp, 1, 0.1),
    ball([9, 15, 5.6], 0.8, 10, T.lamp, 1, 0.1),
  );
  // A water tower on legs at the back, a barrel on the porch, a hitching rail before it.
  ps.push(
    ...shiftParts(
      turned((v) => [3.2, 9 + 6 * v], 10, 4, 120, T.wood, T.wood),
      [15, 0, -10],
    ),
  );
  ps.push(
    ...shiftParts(
      turned((v) => [3.6 * (1 - v), 15 + 2 * v], 8, 2, 30, T.wood, T.wood),
      [15, 0, -10],
    ),
  );
  for (const [dx, dz] of [
    [-2.4, -2.4],
    [2.4, -2.4],
    [-2.4, 2.4],
    [2.4, 2.4],
  ] as [number, number][])
    ps.push(seg([15 + dx, 0, -10 + dz], [15 + dx * 0.8, 9, -10 + dz * 0.8], 10, T.wood));
  ps.push(seg([-16, 1.6, 15.5], [-6, 1.6, 15.5], 14, T.wood));
  // Wagon-wheel lamps on the deck's corners, and a warm glow under the porch.
  for (const [cx, cz] of [
    [-18, 14],
    [18, 14],
    [-18, -14],
    [18, -14],
  ] as [number, number][]) {
    ps.push(ring([cx, 2.2, cz], 1.6, 14, T.wood, 'z'), ball([cx, 2.2, cz], 0.5, 6, T.lamp, 1, 0.1));
  }
  ps.push(disc([0, 0.3, 9.5], 9, 70, scale(T.lamp, 0.7), 0.05));
  // The name, on a board over the roof held by two posts.
  ps.push(
    seg([-10, 21.5, 0], [-10, 26, 0], 10, T.wood),
    seg([10, 21.5, 0], [10, 26, 0], 10, T.wood),
  );
  ps.push(...nameSign('FLYING SALOON', 27, 0.5, T.lamp, T.wood));
  return ps;
}

/** The Golden Lounge: three round terraces stepping up, gold rails and lamps, a ribbed crown. */
function goldenLounge(): Part[] {
  const ps: Part[] = [];
  const tiers: [number, number][] = [
    [24, 0],
    [17, 9],
    [11, 18],
  ];
  for (const [r, y] of tiers) {
    ps.push(ring([0, y, 0], r, r * 9, T.gold), ring([0, y - 1.2, 0], r * 0.97, r * 6, T.amber));
    ps.push(...circleRail(r - 0.6, y + 1.6, 1.6, Math.round(r * 1.2), r * 7, T.gold));
    // Warm lamps along the rail and a soft glow on the terrace floor.
    ps.push(
      part(
        Math.round(r * 2.2),
        (u) => {
          const a = u * TAU;
          return [Math.cos(a) * (r - 0.6), y + 2, Math.sin(a) * (r - 0.6)];
        },
        T.lamp,
        0.12,
      ),
    );
    ps.push(disc([0, y + 0.2, 0], r - 2, r * 5, scale(T.lamp, 0.55), 0.04));
  }
  // Slim gold columns between the tiers, and glass walls (rings) round the lounge inside.
  for (const [r0, y0, y1] of [
    [16, 0, 9],
    [10.5, 9, 18],
  ] as [number, number, number][]) {
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12;
      ps.push(
        seg(
          [Math.cos(a) * r0, y0, Math.sin(a) * r0],
          [Math.cos(a) * r0, y1, Math.sin(a) * r0],
          9,
          T.gold,
        ),
      );
    }
    for (let j = 1; j < 4; j++)
      ps.push(ring([0, lerp(y0, y1, j / 4), 0], r0 - 0.4, r0 * 4, scale(T.cream, 0.6)));
  }
  // The ribbed crown: eight gold ribs over the top terrace to a finial with a soft lamp.
  ps.push(
    ...turned(
      (v) => [10 * Math.cos((v * Math.PI) / 2), 18 + 8 * Math.sin((v * Math.PI) / 2)],
      8,
      3,
      220,
      T.gold,
      T.amber,
    ),
  );
  ps.push(seg([0, 26, 0], [0, 30, 0], 10, T.gold), ball([0, 30.6, 0], 0.9, 12, T.lamp, 1, 0.1));
  // A chandelier hung under the lowest terrace: rings of lamps tapering down.
  for (let k = 0; k < 4; k++)
    ps.push(ring([0, -3 - 2.4 * k, 0], 9 - 2 * k, 40 - 8 * k, T.lamp, 'y', 0.1));
  ps.push(seg([0, -1, 0], [0, -12, 0], 14, T.gold), ball([0, -12.8, 0], 1, 12, T.lamp, 1, 0.1));
  ps.push(...nameSign('THE GOLDEN LOUNGE', 33, 0.42, T.gold, T.amber));
  return ps;
}

/** Moonlight Terrace: a crescent deck of gardens, a pergola of lamps, a hanging fall of light. */
function moonlightTerrace(): Part[] {
  const ps: Part[] = [];
  // The crescent: the space between two circles, its outer rim and inner rim and boards across.
  const R = 25;
  const inner = (a: number): [number, number] => [9 + 18 * Math.cos(a), 18 * Math.sin(a)];
  ps.push(
    part(
      260,
      (u) => {
        // The outer rim, but not where the inner circle cuts it away (the crescent's hollow).
        const a = lerp(0.56, TAU - 0.56, u);
        return [Math.cos(a) * R, 0, Math.sin(a) * R];
      },
      T.cream,
    ),
  );
  ps.push(
    part(
      200,
      (u) => {
        const [x, z] = inner(lerp(0.83, TAU - 0.83, u));
        return [x, 0, z];
      },
      T.cream,
    ),
  );
  ps.push(
    part(
      420,
      (_u, s) => {
        // Sites strewn over the crescent: a point of the outer disc not inside the inner one.
        const a = hash(s, 41) * TAU;
        const rr = R * Math.sqrt(hash(s, 42));
        let x = Math.cos(a) * rr;
        let z = Math.sin(a) * rr;
        if ((x - 9) ** 2 + z ** 2 < 18 * 18) x = -Math.abs(x) - 2;
        if (x * x + z * z > R * R) {
          const k = R / Math.hypot(x, z);
          x *= k;
          z *= k;
        }
        return [x, 0, z];
      },
      scale(T.cream, 0.55),
    ),
  );
  // The rock under it, thin, following the crescent's back.
  ps.push(shiftPart(rock(16, 14, 260, T.rock, 57), [-12, 0, 0]));
  // Gardens: small trees (a trunk and a round crown) along the crescent's back.
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.62 + (0.76 * k) / 6);
    const x = Math.cos(a) * 20;
    const z = Math.sin(a) * 20;
    ps.push(seg([x, 0, z], [x, 4, z], 6, T.wood), ball([x, 5.6, z], 2, 26, T.leaf, 0.8, 0.05));
  }
  // A pergola along the crescent: arches of lamps, their posts on the deck.
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.55 + (0.9 * k) / 8);
    const c = Math.cos(a);
    const s = Math.sin(a);
    ps.push(
      part(
        26,
        (u) => {
          const w = lerp(-1, 1, u);
          const rr = 15.5 + 3.5 * w;
          return [c * rr, 7 + 2.2 * Math.sqrt(1 - w * w), s * rr];
        },
        T.lamp,
        0.1,
      ),
    );
    ps.push(
      seg([c * 12, 0, s * 12], [c * 12, 7, s * 12], 8, T.gold),
      seg([c * 19, 0, s * 19], [c * 19, 7, s * 19], 8, T.gold),
    );
  }
  // A long bar counter on the inner rim, lit, and stools of light.
  ps.push(
    part(
      120,
      (u) => {
        const [x, z] = inner(Math.PI * (0.7 + 0.6 * u));
        return [x - 1.5, 1.4, z];
      },
      T.gold,
    ),
  );
  for (let k = 0; k < 10; k++) {
    const [x, z] = inner(Math.PI * (0.72 + (0.56 * k) / 9));
    ps.push(ball([x + 1.2, 0.8, z], 0.4, 4, T.lamp, 1, 0.1));
  }
  // A fall of light from the crescent's tips, and a crescent moon of light standing over the deck.
  for (const tip of [1, -1]) {
    const a = Math.acos(0.5) * tip;
    const x = Math.cos(a) * 22;
    const z = Math.sin(a) * 22;
    ps.push(part(50, (u, _s, t) => [x, -18 * frac(u + t * 0.05), z], scale(T.lamp, 0.7), 0.15));
  }
  ps.push(
    part(
      140,
      (u) => {
        const a = lerp(0.5, TAU - 0.5, u);
        const rr = 7 + 1.5 * Math.sin(a / 2);
        return [-6 + Math.cos(a) * rr, 18 + Math.sin(a) * rr, 0];
      },
      T.cream,
      0.06,
    ),
  );
  ps.push(...nameSign('MOONLIGHT TERRACE', 30, 0.42, T.cream, T.gold));
  return ps;
}

/** The Lantern Junk: a sky ship with a deck bar, three batten sails as canopies, lanterns strung. */
function lanternJunk(): Part[] {
  const ps: Part[] = [];
  // The hull: a boat's lines along z, rising to a high stern and a raked bow.
  const hull = (v: number, w: number): Vec3 => {
    const z = lerp(-24, 22, v);
    const half = 9 * Math.sin(Math.PI * Math.min(1, 0.08 + v * 0.95)) ** 0.6;
    const rise = 3.5 * (1 - v) ** 4 + 2.5 * v ** 6;
    return [half * w, rise - 5 * (1 - Math.abs(w)) ** 0.4, z];
  };
  for (const w of [-1, -0.6, 0, 0.6, 1])
    ps.push(part(120, (u) => hull(u, w), w === 0 ? T.wood : scale(T.wood, 0.85)));
  for (let k = 0; k <= 10; k++)
    ps.push(part(30, (u) => hull(k / 10, lerp(-1, 1, u)), scale(T.wood, 0.75)));
  // The deck, its rail, warm portholes along both sides.
  ps.push(planks(8, -21, 19, 0, 16, 300, T.wood));
  for (const s of [-1, 1]) {
    ps.push(
      part(
        90,
        (u) => {
          const p = hull(u, s);
          return [p[0], p[1] + 1.8, p[2]];
        },
        T.wood,
      ),
    );
    for (let k = 1; k < 9; k++) {
      const p = hull(k / 9, s);
      ps.push(ball([p[0] * 1.02, -1.6, p[2]], 0.45, 5, T.lamp, 1, 0.1));
    }
  }
  // Three masts, each with a fan-shaped batten sail: ribs of light.
  for (const [mz, h, w] of [
    [-12, 22, 9],
    [2, 28, 11],
    [14, 18, 7],
  ] as [number, number, number][]) {
    ps.push(seg([0, 0, mz], [0, h + 2, mz], h, T.wood));
    for (let b = 0; b < 6; b++) {
      const y = h * (0.35 + (0.65 * b) / 5);
      const ww = w * (1 - 0.35 * (b / 5));
      ps.push(seg([0, y, mz - ww * 0.3], [0, y + 1, mz + ww], 14, b % 2 ? T.amber : T.rose));
    }
    ps.push(seg([0, h * 0.35, mz + w], [0, h, mz + w * 0.65], 12, T.amber));
  }
  // The bar on the deck: a round counter under the main sail, lamps over it.
  ps.push(ring([0, 1.6, 2], 4, 40, T.gold), ring([0, 0.8, 2], 4.2, 30, T.gold));
  ps.push(disc([0, 0.25, 2], 7, 50, scale(T.lamp, 0.6), 0.05));
  // Lantern strings from the masts' tops to the bow and the stern.
  ps.push(lampString([0, 24, -12], [0, 4, -24], 3, 30, T.lamp));
  ps.push(lampString([0, 30, 2], [0, 22, -12], 1.5, 24, T.lamp));
  ps.push(lampString([0, 30, 2], [0, 20, 14], 1.5, 24, T.lamp));
  ps.push(lampString([0, 20, 14], [0, 4, 22], 3, 26, T.lamp));
  for (const s of [-1, 1]) ps.push(lampString([0, 26, 2], [s * 8, 2, 8], 2, 26, T.rose));
  // Two great lanterns hung from the stern, and a warm glow beneath the hull.
  for (const s of [-1, 1])
    ps.push(
      ...shiftParts(
        turned((v) => [1.6 * Math.sin(Math.PI * v) + 0.4, -3 * v], 8, 3, 40, T.rose, T.lamp, 0.08),
        [s * 4, 5, -24],
      ),
    );
  ps.push(disc([0, -6, 0], 6, 30, scale(T.amber, 0.5), 0.08));
  ps.push(...nameSign('LANTERN JUNK', 34, 0.5, T.rose, T.gold));
  return ps;
}

/** The Amber Balloon: a great balloon of ribs over a round basket terrace, its burner glowing. */
function amberBalloon(): Part[] {
  const ps: Part[] = [];
  // The envelope: a tear shape on gores, banded.
  const env = (v: number): [number, number] => {
    const y = 12 + 30 * v;
    const r = 16 * Math.sin(Math.PI * (0.12 + 0.88 * v)) ** 0.75 * (v < 0.15 ? 0.5 + v * 3.3 : 1);
    return [Math.max(2, r), y];
  };
  ps.push(...turned(env, 16, 9, 900, T.amber, T.gold, 0.04));
  // Ropes from its skirt down to the terrace's rail.
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    ps.push(
      seg(
        [Math.cos(a) * 7.5, 13, Math.sin(a) * 7.5],
        [Math.cos(a) * 14, 2, Math.sin(a) * 14],
        12,
        T.cream,
      ),
    );
  }
  // The burner: a soft fire in a ring under the mouth, breathing slowly.
  ps.push(ring([0, 10.5, 0], 2.4, 20, T.gold));
  ps.push(
    part(
      30,
      (u, s, t) => {
        const a = u * TAU * 3;
        const r = 1.2 * (1 - frac(u * 3));
        return [
          Math.cos(a) * r,
          11 + 2.5 * frac(u * 3) + 0.4 * Math.sin(t * 0.7 + s),
          Math.sin(a) * r,
        ];
      },
      T.lamp,
      0.2,
    ),
  );
  // The basket terrace: a round deck, wicker bands, its rail with lamps, a bar ring in its middle.
  ps.push(disc([0, 0, 0], 15, 160, scale(T.wood, 0.7)));
  ps.push(...circleRail(15, 2, 2, 16, 140, T.wood));
  for (let j = 0; j < 3; j++) ps.push(ring([0, -1 - j * 1.4, 0], 15 - j * 2.2, 70, T.wood));
  ps.push(
    part(
      32,
      (u) => {
        const a = u * TAU;
        return [Math.cos(a) * 15, 2.4, Math.sin(a) * 15];
      },
      T.lamp,
      0.12,
    ),
  );
  ps.push(ring([0, 1.4, 0], 4.5, 40, T.gold), disc([0, 0.3, 0], 13, 70, scale(T.lamp, 0.55), 0.05));
  // Little terraces hung round the basket: three balconies on struts.
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3 + 0.5;
    const c: Vec3 = [Math.cos(a) * 20, -4, Math.sin(a) * 20];
    ps.push(ring(c, 3.5, 30, T.wood), ring([c[0], c[1] + 1.4, c[2]], 3.5, 24, T.gold));
    ps.push(seg([Math.cos(a) * 14, -2, Math.sin(a) * 14], c, 10, T.wood));
    ps.push(ball([c[0], c[1] + 2.2, c[2]], 0.6, 8, T.lamp, 1, 0.1));
  }
  // Sandbags of light hung round the basket.
  for (let k = 0; k < 10; k++) {
    const a = (k * TAU) / 10;
    ps.push(ball([Math.cos(a) * 15.3, -4.5, Math.sin(a) * 15.3], 0.5, 5, T.amber, 1, 0.08));
  }
  ps.push(...nameSign('AMBER BALLOON', 46, 0.5, T.lamp, T.gold));
  return ps;
}

const shiftPart = (p: Part, d: Vec3): Part => ({
  ...p,
  f: (u, s, t) => {
    const q = p.f(u, s, t);
    return [q[0] + d[0], q[1] + d[1], q[2] + d[2]];
  },
});
const shiftParts = (ps: Part[], d: Vec3) => ps.map((p) => shiftPart(p, d));

/** The five, in pill order. */
export const BAR_DESIGNS: BarDesign[] = [
  {
    name: 'Flying Saloon',
    sign: 'FLYING SALOON',
    idea: 'A wooden western saloon on a floating rock: a false front with a lantern sign, a porch terrace with lanterns, swinging doors swaying, a water tower behind.',
    make: flyingSaloon,
    signY: 27,
  },
  {
    name: 'Golden Lounge',
    sign: 'THE GOLDEN LOUNGE',
    idea: 'Three round terraces stepping up on slim gold columns, gold rails lined with lamps, a ribbed crown, a chandelier hung beneath.',
    make: goldenLounge,
    signY: 33,
  },
  {
    name: 'Moonlight Terrace',
    sign: 'MOONLIGHT TERRACE',
    idea: 'A crescent deck of gardens under a pergola of lamps, a long lit counter on its inner rim, light falling from its tips, a crescent of light over it.',
    make: moonlightTerrace,
    signY: 30,
  },
  {
    name: 'Lantern Junk',
    sign: 'LANTERN JUNK',
    idea: 'A sky ship with a bar on its deck: three batten sails as canopies, strings of lanterns from the masts, warm portholes, great lanterns at the stern.',
    make: lanternJunk,
    signY: 34,
  },
  {
    name: 'Amber Balloon',
    sign: 'AMBER BALLOON',
    idea: 'A great balloon of amber gores over a round basket terrace, its burner breathing a soft fire, three little balconies hung round it.',
    make: amberBalloon,
    signY: 46,
  },
];

/** A bar's model, built once: its parts, with its reach from its axis and its top noted. */
const models = new Map<number, Model & { lo: number }>();
export function barModel(i: number): Model & { lo: number } {
  const had = models.get(i);
  if (had) return had;
  const D = BAR_DESIGNS[i] ?? (BAR_DESIGNS[0] as BarDesign);
  const M = model(D.make(), 0, 0);
  let r = 0;
  let lo = 0;
  let hi = 0;
  for (const t of [0, 7, 19]) {
    let s = 0;
    for (const p of M.parts) {
      for (let k = 0; k < p.n; k++, s++) {
        const q = p.f((k + 0.5) / p.n, s, t);
        r = Math.max(r, Math.hypot(q[0], q[2]));
        lo = Math.min(lo, q[1]);
        hi = Math.max(hi, q[1]);
      }
    }
  }
  const out = { ...M, r, top: hi, lo };
  models.set(i, out);
  return out;
}

/* ---------- the Studio's pills ---------- */

/** The Studio's size: a bar drawn at this share of its game size, floating this high over the plaza. */
export const STUDIO_BAR = { s: 0.55, y: 16 };
const G = GROUND_Y;

/**
 * Bar i drawn into a Studio mesh: each part's sites at time 0, neighbours joined by a line where
 * they are close (so decks, rails and hulls read as lines), lamps as soft dots.
 */
export function buildBar(m: Mesh, i: number) {
  const M = barModel(i);
  const { s, y } = STUDIO_BAR;
  const at = (q: Vec3): Vec3 => [q[0] * s, G + y + q[1] * s, q[2] * s];
  m.centre = [0, G + y, 0];
  let n = 0;
  for (const p of M.parts) {
    const lamp = (p.tw ?? 0) > 0;
    let prev: Vec3 | null = null;
    for (let k = 0; k < p.n; k++, n++) {
      const q = at(p.f((k + 0.5) / p.n, n, 0));
      if (lamp) m.dot(q, 0.22, Tone.light, { w: 0.6 });
      else if (prev && Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]) < 1.4)
        m.line(prev, q, p.rgb === T.wood || p.rgb === T.rock ? Tone.face : Tone.edge, { w: 0.7 });
      prev = q;
    }
  }
  // A thread of light down to the plaza: where it floats from.
  m.line([0, G + 0.2, 0], [0, G + y + M.lo * s, 0], Tone.light, { w: 0.25 });
}

/** Slowly round a pill's bar, a little under its deck's height, far enough back to see it whole. */
export function spaceBarEye(t: number): { eye: Vec3; target: Vec3 } {
  const target: Vec3 = [0, G + STUDIO_BAR.y + 6, 0];
  const d = 58;
  const az = 0.8 + t * 0.035;
  const el = 0.12;
  return {
    eye: [
      target[0] + Math.sin(az) * Math.cos(el) * d,
      target[1] + Math.sin(el) * d,
      target[2] + Math.cos(az) * Math.cos(el) * d,
    ],
    target,
  };
}

/** The series as a Studio set (lib/golden-quarters.ts BuildingSet): one pill a bar. */
export const SPACE_BARS: BuildingSet = {
  names: BAR_DESIGNS.map((d) => d.name),
  build: BAR_DESIGNS.map((_, i) => (m: Mesh) => buildBar(m, i)),
  label: 'Space bar',
  reach: BAR_DESIGNS.map(() => 1.15),
  rung: BAR_DESIGNS.map(() => 0),
};
