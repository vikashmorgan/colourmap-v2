/*
 * The golden city's buildings (docs/specs/art-city.md): five temples, five
 * factories and five glass domes, each built from a few shapes with simple
 * rules, its sizes powers of φ, so it is easy to build and reads solid:
 * dense, bright edges, faces lit by how much they face the eye, a soft light
 * inside.
 *
 * 2026-11-12: "then do 5 visuals of temples in golden inspired by city using
 * math to simplify to maximum and create architecture that is easy to
 * construct and beautiful and looks solid."
 * 2026-11-12: "then imagine 5 factory buildings in city. imagine a set of
 * domes. and bubbles as well. like des serres. but golden. some can be
 * geometric glass domes."
 *
 * Every building stands on the ground at the origin, on a round plaza.
 * Pure: no three.js, no DOM.
 */

import { GOLDEN_ANGLE, hash, type Vec3 } from './bigbang';
import { Anim, GROUND_Y, type Mesh, PHI, Tone } from './grain-mesh';

const TAU = Math.PI * 2;
const G = GROUND_Y;
const P = (x: number, y: number, z: number): Vec3 => [x, G + y, z];
const { edge, face, glass, plant, fire, light, ground, road, steam, film } = Tone;

/** The sizes some of the buildings are built from, each a power of φ (checked by the tests). */
export const RATIOS = {
  /** The pyramid's half-base and height: the Kepler triangle, height² = φ · half-base². */
  pyramid: { half: 10, height: 10 * Math.sqrt(PHI) },
  /** The ziggurat's terraces' half-widths, each φ times smaller than the one below. */
  ziggurat: [0, 1, 2, 3].map((i) => 11 / PHI ** i),
  /** The workshops' floors' half-widths, each φ^(1/4) narrower. */
  workshops: [0, 1, 2, 3, 4].map((i) => 5 * PHI ** (-i / 4)),
  /** The solar works' rings of mirrors, each √φ times further out. */
  solar: [0, 1, 2, 3, 4, 5].map((j) => 6 * Math.sqrt(PHI) ** j),
  /** The bubbles' radii, each φ times smaller. */
  bubbles: [0, 1, 2, 3, 4].map((i) => 8 / PHI ** i),
};

/** The round plaza every building stands on. */
function plaza(m: Mesh, r = 18) {
  m.centre = P(0, -10, 0);
  m.disc(P(0, 0, 0), r, ground, 0, { w: 0.05 });
  m.ring(P(0, 0, 0), r, road, { w: 0.3 });
}

/** A tree inside a glasshouse: a trunk and a round crown, with a few flowers lit in it. */
function tree(m: Mesh, x: number, z: number, h: number, crown: number) {
  m.line(P(x, 0, z), P(x, h, z), plant, { w: 1.2 });
  m.dot(P(x, h, z), crown, plant, { w: crown * crown * 1.2 });
  m.dot(P(x, h + crown * 0.3, z), crown * 0.8, light, { w: crown * 0.15 });
}
/** Plants in a round bed of radius r: trees by the golden angle, the tallest in the middle. */
function garden(m: Mesh, cx: number, cz: number, r: number, top: number, n = 7) {
  for (let i = 0; i < n; i++) {
    const rr = r * 0.8 * Math.sqrt((i + 0.5) / n);
    const a = i * GOLDEN_ANGLE;
    const h = top * (1 - (0.55 * rr) / (r || 1));
    tree(m, cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, h, Math.max(0.6, h / PHI ** 2));
  }
  const keep = m.centre;
  m.centre = P(cx, -5, cz);
  m.disc(P(cx, 0.05, cz), r * 0.85, plant, 0, { w: 0.25 });
  m.centre = keep;
}

/** A hemisphere of radius r round c, from its foot up to `top` (0..1 of the way to its crown). */
function dome(
  m: Mesh,
  c: Vec3,
  r: number,
  tone: number,
  grid: { tone: number; ribs: number; rings: number } | null,
  top = 1,
  two = false,
) {
  const keep = m.centre;
  m.centre = c;
  const nu = grid ? grid.ribs * 2 : 24;
  const nv = grid ? Math.max(2, grid.rings) * 2 : 6;
  m.surface(
    (u, v) => {
      const a = u * TAU;
      const lat = v * top * (Math.PI / 2);
      return [
        c[0] + Math.cos(a) * Math.cos(lat) * r,
        c[1] + Math.sin(lat) * r,
        c[2] + Math.sin(a) * Math.cos(lat) * r,
      ];
    },
    nu,
    nv,
    tone,
    { two },
    grid ? { tone: grid.tone, uEvery: 2, vEvery: 2 } : undefined,
  );
  m.centre = keep;
}

/* ---------- temples ---------- */

/**
 * Rotunda. Rules: a = 7. Three round steps, radii a(1 + φ⁻²), a(1 + φ⁻³), a(1 + φ⁻⁴), each a·φ⁻⁵
 * high; twelve columns on a circle of radius a, each a high and a·φ⁻⁶ thick; a ring beam a·φ⁻³
 * deep; a hemispherical dome of radius a whose twelve ribs stand over the columns, open at the
 * crown (an oculus); a soft light inside.
 */
function rotunda(m: Mesh) {
  const a = 7;
  const step = a / PHI ** 5;
  for (let i = 0; i < 3; i++) {
    const r = a * (1 + PHI ** -(2 + i));
    m.centre = P(0, -5, 0);
    m.cylinder(P(0, 0, 0), r, G + i * step, G + (i + 1) * step, face, edge, 0);
    m.disc(P(0, (i + 1) * step, 0), r, ground, 0, { w: 0.6 });
  }
  const y0 = 3 * step;
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * TAU;
    m.centre = P(Math.cos(t) * a, y0 + a / 2, Math.sin(t) * a);
    m.cylinder(
      P(Math.cos(t) * a, 0, Math.sin(t) * a),
      a / PHI ** 6,
      G + y0,
      G + y0 + a,
      face,
      edge,
      3,
      6,
    );
  }
  const ye = y0 + a + a / PHI ** 3;
  m.centre = P(0, y0 + a, 0);
  m.cylinder(P(0, 0, 0), a + 0.4, G + y0 + a, G + ye, face, edge, 0);
  dome(m, P(0, ye, 0), a + 0.4, face, { tone: edge, ribs: 12, rings: 4 }, 0.86);
  m.ring(
    P(0, ye + (a + 0.4) * Math.sin(0.86 * (Math.PI / 2)), 0),
    (a + 0.4) * Math.cos(0.86 * (Math.PI / 2)),
    light,
    { w: 2 },
  );
  m.dot(P(0, y0 + a * 0.55, 0), a / PHI ** 4, light, { anim: Anim.pulse, key: 0.3, w: 0.6 });
  m.line(P(0, ye + a, 0), P(0, y0, 0), light, { w: 0.5, anim: Anim.flow, key: 1.2 });
}

/**
 * Ziggurat. Rules: four square terraces, each φ times smaller than the one below (half-widths
 * 11, 11/φ, 11/φ², 11/φ³), each as high as its half-width over φ²; a small shrine on top; on
 * each side a stair climbs every terrace at 45°, φ⁻³ of the base wide.
 */
function ziggurat(m: Mesh) {
  const s0 = 11;
  let y = 0;
  const w = s0 / PHI ** 3;
  for (let i = 0; i < 4; i++) {
    const h = RATIOS.ziggurat[i] as number;
    const e = h / PHI ** 2;
    m.box(P(0, y, 0), h, e, h, face, edge);
    for (let side = 0; side < 4; side++) {
      const rot = (side * Math.PI) / 2;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const at = (d: number, yy: number, x: number): Vec3 => P(d * c - x * s, yy, d * s + x * c);
      // The flight up this terrace's face: treads and two strings, standing out from the wall.
      const n = Math.max(4, Math.round(e / 0.4));
      for (let j = 0; j <= n; j++) {
        const f = j / n;
        m.line(
          at(h + e * (1 - f), y + e * f, -w / 2),
          at(h + e * (1 - f), y + e * f, w / 2),
          edge,
          { w: 0.8 },
        );
      }
      for (const x of [-w / 2, w / 2]) m.line(at(h + e, y, x), at(h, y + e, x), edge);
      for (const x of [-w / 2, w / 2])
        m.tri(at(h + e, y, x), at(h, y, x), at(h, y + e, x), face, { two: true, w: 0.3 });
      m.dot(at(h, y + e, -h), 0.25, light, { w: 0.4 });
    }
    y += e;
  }
  const top = s0 / PHI ** 4;
  m.box(P(0, y, 0), top, top * 1.4, top, face, edge, Math.PI / 4);
  m.dot(P(0, y + top * 0.7, 0), top * 0.9, light, { anim: Anim.pulse, key: 1, w: 0.8 });
  m.dot(P(0, y + top * 2.2, 0), 0.5, light, { w: 1.5 });
}

/**
 * Ring. Rules: a round plinth of two steps (radii 9 and 9 − 9/φ⁴); an upright ring of radius
 * R = 7, its tube R/φ⁴ thick, standing on it; a second ring φ times smaller, turned a right angle
 * inside it; a sphere of light R/φ³ across at the centre.
 */
function ringGate(m: Mesh) {
  const R = 7;
  for (let i = 0; i < 2; i++) {
    m.centre = P(0, -5, 0);
    const r = i ? 9 - 9 / PHI ** 4 : 9;
    m.cylinder(P(0, 0, 0), r, G + i * 0.8, G + (i + 1) * 0.8, face, edge, 0);
    m.disc(P(0, (i + 1) * 0.8, 0), r, ground, 0, { w: 0.6 });
  }
  const rho = R / PHI ** 4;
  const cy = 1.6 + R + rho;
  const torus = (Rm: number, rm: number, turned: boolean) =>
    m.surface(
      (u, v) => {
        const th = u * TAU;
        const ph = v * TAU;
        const rr = Rm + rm * Math.cos(ph);
        const a = Math.cos(th) * rr;
        const b = Math.sin(th) * rr;
        const z = rm * Math.sin(ph);
        return turned ? P(z, cy + b, a) : P(a, cy + b, z);
      },
      48,
      8,
      face,
      { two: true },
      { tone: edge, uEvery: 4, vEvery: 2 },
    );
  m.centre = P(0, cy, 0);
  torus(R, rho, false);
  torus(R / PHI, rho / PHI, true);
  m.dot(P(0, cy, 0), R / PHI ** 3, light, { anim: Anim.pulse, key: 2, w: 0.8 });
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * TAU;
    m.dot(P(Math.cos(t) * 9, 1.8, Math.sin(t) * 9), 0.3, light, { w: 0.4 });
  }
}

/**
 * Pyramid. Rules: a square base of half-width a = 10 on a low plinth; the golden slope of the
 * Kepler triangle, its face's slant height φ times the half-width, so its height is a√φ; nine
 * courses marked round it; a light at the apex and a doorway on one face.
 */
function pyramid(m: Mesh) {
  const a = RATIOS.pyramid.half;
  const h = RATIOS.pyramid.height;
  const y0 = 0.8;
  m.box(P(0, 0, 0), a + 1.2, y0, a + 1.2, face, edge);
  m.centre = P(0, y0 + h / 4, 0);
  const apex = P(0, y0 + h, 0);
  const c = [P(-a, y0, -a), P(a, y0, -a), P(a, y0, a), P(-a, y0, a)];
  for (let i = 0; i < 4; i++) {
    const A = c[i] as Vec3;
    const B = c[(i + 1) % 4] as Vec3;
    m.tri(A, B, apex, face);
    m.line(A, apex, edge, { w: 1.4 });
  }
  for (let j = 1; j < 10; j++) {
    const f = j / 10;
    const s = a * (1 - f);
    const yy = y0 + h * f;
    m.poly([P(-s, yy, -s), P(s, yy, -s), P(s, yy, s), P(-s, yy, s)], true, edge, { w: 0.35 });
  }
  m.dot(apex, 1.2, light, { anim: Anim.pulse, key: 0.5, w: 0.8 });
  m.line(apex, P(0, y0 + h + 9, 0), light, { anim: Anim.flow, key: 2, w: 0.6 });
  // The doorway on the +z face, a third of the way up its slope.
  const dz = a - (a * 2.2) / h;
  m.poly([P(-1, y0, a), P(-1, y0 + 2.2, dz), P(1, y0 + 2.2, dz), P(1, y0, a)], false, edge, {
    w: 2,
  });
  m.dot(P(0, y0 + 1, a - 0.4), 0.9, light, { w: 1 });
}

/**
 * Lotus. Rules: an eight-sided plinth; eight outer petals, each a pointed vault on a circle of
 * radius R = 8.5, Rφ high; eight inner petals between them, R/φ out; eightfold symmetry
 * throughout; a small lattice of light floating at its heart.
 */
function lotus(m: Mesh) {
  const R = 8.5;
  const H = R * PHI;
  const y0 = 1.2;
  m.centre = P(0, -5, 0);
  m.cylinder(P(0, 0, 0), R + 1, G, G + y0, face, edge, 8, 8);
  m.disc(P(0, y0, 0), R + 1, ground, 0, { w: 0.5 });
  const petal = (at: number, r0: number, h: number, half: number) =>
    m.surface(
      (u, v) => {
        const across = 2 * u - 1;
        const s = v;
        const wf = (1 - s) ** 0.8 * (0.85 + 0.6 * s);
        const a = at + half * wf * across;
        const rr =
          r0 * (1 - 0.85 * s * s) * (1 + 0.18 * Math.sin(Math.PI * s)) +
          0.8 * (1 - across * across) * Math.sin(Math.PI * s);
        return P(Math.cos(a) * rr, y0 + h * s, Math.sin(a) * rr);
      },
      8,
      12,
      face,
      {},
      { tone: edge, uEvery: 4, vEvery: 3 },
    );
  m.centre = P(0, y0 + H * 0.3, 0);
  for (let k = 0; k < 8; k++) {
    petal((k / 8) * TAU, R, H, (Math.PI / 8) * 0.92);
    petal(((k + 0.5) / 8) * TAU, R / PHI, H * 0.92, (Math.PI / 8) * 0.9);
  }
  m.pivot = P(0, y0 + H * 0.42, 0);
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * TAU;
    m.poly(
      Array.from({ length: 13 }, (_, j) => {
        const lat = -Math.PI / 2 + (j / 12) * Math.PI;
        return P(
          Math.cos(t) * Math.cos(lat) * 1.6,
          y0 + H * 0.42 + Math.sin(lat) * 1.6,
          Math.sin(t) * Math.cos(lat) * 1.6,
        );
      }),
      false,
      light,
      { anim: Anim.breathe, w: 0.6 },
    );
  }
  m.dot(m.pivot, 1.1, light, { anim: Anim.pulse, key: 3, w: 0.6 });
}

/* ---------- factories: the ring of making ---------- */

/**
 * Sawtooth. Rules: a hall 24 long, 24/φ deep, its walls 24/φ³ high; five roof teeth, each as high
 * as its width over φ, a glazed north face and a sloped back; a conveyor of light down the hall.
 */
function sawtooth(m: Mesh) {
  const hx = 12;
  const hz = hx / PHI;
  const h = (2 * hx) / PHI ** 3;
  m.box(P(0, 0, 0), hx, h, hz, face, edge, 0, false);
  const n = 5;
  const wd = (2 * hx) / n;
  const e = wd / PHI;
  for (let i = 0; i < n; i++) {
    const x0 = -hx + i * wd;
    m.centre = P(x0 + wd / 2, h - 2, 0);
    m.quad(P(x0, h, -hz), [0, e, 0], [0, 0, 2 * hz], glass, { two: true });
    m.quad(P(x0, h + e, -hz), [wd, -e, 0], [0, 0, 2 * hz], face);
    for (const z of [-hz, hz]) {
      m.tri(P(x0, h, z), P(x0, h + e, z), P(x0 + wd, h, z), face);
      m.poly([P(x0, h, z), P(x0, h + e, z), P(x0 + wd, h, z)], false, edge);
    }
    m.line(P(x0, h + e, -hz), P(x0, h + e, hz), edge, { w: 1.3 });
    for (let j = 0; j < 6; j++)
      m.dot(P(x0 + 0.6, h + e * 0.4, -hz + ((j + 0.5) / 6) * 2 * hz), 0.5, light, { w: 0.5 });
  }
  for (const z of [-2, 2]) {
    m.line(P(-hx + 1, 1, z), P(hx - 1, 1, z), light, {
      anim: Anim.flow,
      key: z > 0 ? 1.5 : -1.5,
      w: 2,
    });
    m.line(P(-hx + 1, 0.6, z), P(hx - 1, 0.6, z), edge, { w: 0.5 });
  }
  for (let j = 0; j < 16; j++) {
    const x = -hx + ((j + 0.5) / 16) * 2 * hx;
    m.dot(P(x, h / 2, hz + 0.05), 0.25, light, { w: 0.3 });
    m.dot(P(x, h / 2, -hz - 0.05), 0.25, light, { w: 0.3 });
  }
}

/**
 * Foundry. Rules: a round hall of radius R = 8, R/φ high, under a cone R/φ² high with a glazed
 * lantern R/φ³ wide at its top; six chimneys on a ring R(1 + φ⁻²) out, each Rφ tall, breathing
 * soft steam; four furnaces glowing slowly in the wall.
 */
function foundry(m: Mesh) {
  const R = 8;
  const h = R / PHI;
  m.centre = P(0, h / 2, 0);
  m.cylinder(P(0, 0, 0), R, G, G + h, face, edge, 16);
  const rl = R / PHI ** 3;
  const hc = R / PHI ** 2;
  m.centre = P(0, h - 3, 0);
  m.surface(
    (u, v) => {
      const a = u * TAU;
      const r = R + (rl - R) * v;
      return P(Math.cos(a) * r, h + hc * v, Math.sin(a) * r);
    },
    24,
    3,
    face,
    {},
    { tone: edge, uEvery: 3, vEvery: 3 },
  );
  m.centre = P(0, h + hc, 0);
  m.cylinder(P(0, 0, 0), rl, G + h + hc, G + h + hc + rl / PHI, glass, edge, 6, 10);
  m.dot(P(0, h + hc + 0.5, 0), rl * 0.8, fire, { anim: Anim.pulse, key: 0.7, w: 2 });
  const rc = R * (1 + PHI ** -2);
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * TAU + Math.PI / 6;
    const x = Math.cos(t) * rc;
    const z = Math.sin(t) * rc;
    m.centre = P(x, R * 0.8, z);
    m.cylinder(P(x, 0, z), 0.7, G, G + R * PHI, face, edge, 2, 8);
    m.ring(P(x, R * PHI, z), 0.7, light, { w: 1.5 }, 8);
    m.dot(P(x, R * PHI + 0.3, z), 0.6, steam, { anim: Anim.rise, key: 7, w: 2.5 });
  }
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * TAU;
    m.dot(P(Math.cos(t) * (R + 0.1), 1.5, Math.sin(t) * (R + 0.1)), 1.1, fire, {
      anim: Anim.pulse,
      key: k * 1.7,
      w: 1.6,
    });
    // An arched doorway round it: two jambs and a half circle over them.
    const door = (side: number, y: number) => {
      const s = t + (side * 1.3) / R;
      return P(Math.cos(s) * (R + 0.05), y, Math.sin(s) * (R + 0.05));
    };
    m.line(door(-1, 0), door(-1, 1.6), edge, { w: 1.2 });
    m.line(door(1, 0), door(1, 1.6), edge, { w: 1.2 });
    m.poly(
      Array.from({ length: 9 }, (_, j) => {
        const a = (j / 8) * Math.PI;
        return door(Math.cos(a), 1.6 + Math.sin(a) * 1.3);
      }),
      false,
      edge,
      { w: 1.2 },
    );
  }
}

/**
 * Assembly. Rules: a long hall 30 by 10, its walls 5/φ high under a barrel roof of radius 5;
 * eleven arched trusses, one every 3, each two arcs (the inner φ⁻⁴ smaller) braced in a
 * zigzag; a skylight along the ridge; arched doors of light at both ends; a conveyor inside.
 */
function assembly(m: Mesh) {
  const hx = 15;
  const w = 5;
  const h = w / PHI;
  m.box(P(0, 0, 0), hx, h, w, face, edge, 0, false);
  const arc = (x: number, r: number, j: number, n: number): Vec3 => {
    const a = (j / n) * Math.PI;
    return P(x, h + Math.sin(a) * r, Math.cos(a) * r);
  };
  m.centre = P(0, h - 1, 0);
  m.surface(
    (u, v) => {
      const a = (0.1 + 0.8 * v) * Math.PI;
      return P(-hx + 2 * hx * u, h + Math.sin(a) * w, Math.cos(a) * w);
    },
    10,
    8,
    face,
  );
  m.surface(
    (u, v) => {
      const a = (0.4 + 0.2 * v) * Math.PI;
      return P(-hx + 2 * hx * u, h + Math.sin(a) * w + 0.05, Math.cos(a) * w);
    },
    10,
    1,
    glass,
    { two: true },
  );
  for (let i = 0; i <= 10; i++) {
    const x = -hx + i * 3;
    const n = 12;
    m.poly(
      Array.from({ length: n + 1 }, (_, j) => arc(x, w, j, n)),
      false,
      edge,
      { w: 1.2 },
    );
    const ri = w * (1 - PHI ** -4);
    m.poly(
      Array.from({ length: n + 1 }, (_, j) => arc(x, ri, j, n)),
      false,
      edge,
      { w: 0.7 },
    );
    for (let j = 0; j < n; j++)
      m.line(arc(x, j % 2 ? ri : w, j, n), arc(x, j % 2 ? w : ri, j + 1, n), edge, { w: 0.5 });
  }
  for (const x of [-hx, hx]) {
    m.centre = P(0, h, 0);
    m.surface(
      (u, v) => {
        const a = u * Math.PI;
        // The end wall, from the ground up to the arch of the roof.
        return P(x, v * (h + Math.sin(a) * w), Math.cos(a) * w);
      },
      12,
      2,
      face,
    );
    m.poly(
      Array.from({ length: 9 }, (_, j) =>
        P(x * 1.002, 0 + Math.sin((j / 8) * Math.PI) * 3.2, Math.cos((j / 8) * Math.PI) * 2),
      ),
      false,
      light,
      { w: 2 },
    );
    m.dot(P(x * 0.97, 1.6, 0), 1.6, light, { w: 0.3 });
  }
  m.line(P(-hx + 1, 1, 0), P(hx - 1, 1, 0), light, { anim: Anim.flow, key: 1.2, w: 3 });
  m.line(P(-hx + 1, 0.7, 0), P(hx - 1, 0.7, 0), edge, { w: 0.6 });
}

/**
 * Workshops. Rules: five floors, each 5/φ high, each φ^(1/4) narrower than the one below and
 * turned by the golden angle; a lattice crane beside it, 20 tall, its jib turning slowly.
 */
function workshops(m: Mesh) {
  const hf = 5 / PHI;
  for (let i = 0; i < 5; i++) {
    const s = RATIOS.workshops[i] as number;
    const rot = i * GOLDEN_ANGLE;
    m.box(P(0, i * hf, 0), s, hf, s, face, edge, rot);
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      m.line(
        P(
          Math.cos(a) * s - Math.sin(a) * s * 0.8,
          i * hf + hf * 0.5,
          Math.sin(a) * s + Math.cos(a) * s * 0.8,
        ),
        P(
          Math.cos(a) * s + Math.sin(a) * s * 0.8,
          i * hf + hf * 0.5,
          Math.sin(a) * s - Math.cos(a) * s * 0.8,
        ),
        light,
        { w: 0.6 },
      );
    }
  }
  const mx = 10;
  const H = 20;
  for (const [dx, dz] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ] as [number, number][])
    m.line(P(mx + dx, 0, dz), P(mx + dx, H, dz), edge);
  for (let j = 0; j < 17; j++) {
    const y = (j / 17) * H;
    const y2 = ((j + 1) / 17) * H;
    m.line(P(mx - 0.5, y, j % 2 ? -0.5 : 0.5), P(mx - 0.5, y2, j % 2 ? 0.5 : -0.5), edge, {
      w: 0.5,
    });
    m.line(P(mx + 0.5, y, j % 2 ? 0.5 : -0.5), P(mx + 0.5, y2, j % 2 ? -0.5 : 0.5), edge, {
      w: 0.5,
    });
  }
  m.pivot = P(mx, 0, 0);
  const o = { anim: Anim.orbit, key: 0.04 };
  for (const z of [-0.4, 0.4]) m.line(P(mx - 5, H, z), P(mx - 16, H, z), edge, o);
  m.line(P(mx - 5, H, 0), P(mx + 4, H, 0), edge, o);
  for (let j = 0; j < 10; j++)
    m.line(
      P(mx - 5 - j * 1.1, H, j % 2 ? -0.4 : 0.4),
      P(mx - 6.1 - j * 1.1, H, j % 2 ? 0.4 : -0.4),
      edge,
      { ...o, w: 0.5 },
    );
  m.line(P(mx - 14, H, 0), P(mx - 14, H - 9, 0), edge, { ...o, w: 0.5 });
  m.dot(P(mx - 16, H, 0), 0.45, light, { ...o, w: 0.6 });
  m.dot(P(mx - 14, H - 9.5, 0), 0.6, light, { ...o, w: 0.6 });
  m.dot(P(mx, H + 0.5, 0), 0.4, fire, { anim: Anim.pulse, key: 1, w: 0.5 });
  m.dot(P(0, 5 * hf + 0.5, 0), 1.2, light, { anim: Anim.pulse, key: 2, w: 0.5 });
}

/**
 * Solar. Rules: a tower 18 high with a glowing receiver at its top; six rings of mirrors round
 * it, each ring √φ times further out than the last (6, 6√φ, 6φ, …), the mirrors 2.4 apart, each
 * tilted toward the receiver; thin beams of light running up to it.
 */
function solar(m: Mesh) {
  const H = 18;
  m.centre = P(0, H / 2, 0);
  m.cylinder(P(0, 0, 0), 0.9, G, G + H, face, edge, 4, 10);
  m.centre = P(0, H + 1.2, 0);
  m.cylinder(P(0, 0, 0), 1.6, G + H, G + H + 2.4, fire, edge, 6, 12);
  m.dot(P(0, H + 1.2, 0), 1.8, light, { anim: Anim.pulse, key: 0.2, w: 1 });
  const top = P(0, H + 1.2, 0);
  for (let j = 0; j < 6; j++) {
    const r = RATIOS.solar[j] as number;
    const n = Math.round((TAU * r) / 2.4);
    for (let i = 0; i < n; i++) {
      const a = ((i + (j % 2) * 0.5) / n) * TAU;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const c = P(x, 0.9, z);
      // The mirror faces halfway between the sky and the receiver.
      const toTop: Vec3 = [top[0] - c[0], top[1] - c[1], top[2] - c[2]];
      const l = Math.hypot(...toTop);
      const nrm: Vec3 = [toTop[0] / l, toTop[1] / l + 1, toTop[2] / l];
      const nl = Math.hypot(...nrm);
      const nn: Vec3 = [nrm[0] / nl, nrm[1] / nl, nrm[2] / nl];
      const side: Vec3 = [-Math.sin(a), 0, Math.cos(a)];
      const up: Vec3 = [
        nn[1] * side[2] - nn[2] * side[1],
        nn[2] * side[0] - nn[0] * side[2],
        nn[0] * side[1] - nn[1] * side[0],
      ];
      const o: Vec3 = [
        c[0] - side[0] * 0.7 - up[0] * 0.45,
        c[1] - up[1] * 0.45,
        c[2] - side[2] * 0.7 - up[2] * 0.45,
      ];
      const U: Vec3 = [side[0] * 1.4, 0, side[2] * 1.4];
      const V: Vec3 = [up[0] * 0.9, up[1] * 0.9, up[2] * 0.9];
      m.centre = [c[0] - nn[0], c[1] - nn[1], c[2] - nn[2]];
      m.quad(o, U, V, glass, { w: 2.5 });
      m.poly(
        [
          o,
          [o[0] + U[0], o[1] + U[1], o[2] + U[2]],
          [o[0] + U[0] + V[0], o[1] + U[1] + V[1], o[2] + U[2] + V[2]],
          [o[0] + V[0], o[1] + V[1], o[2] + V[2]],
        ],
        true,
        edge,
        { w: 0.5 },
      );
      m.line(P(x, 0, z), c, edge, { w: 0.5 });
      m.line(c, top, light, { anim: Anim.flow, key: 3, w: 0.01 });
    }
  }
}

/* ---------- domes: golden glasshouses ---------- */

/** Geodesic. Rules: an icosahedron cut three times each way, blown out to a sphere of radius 11, its upper half standing on a ring; struts bright, glass faint; a garden inside. */
function geodesicHouse(m: Mesh) {
  m.geodesic(P(0, 0, 0), 11, 3, glass, edge, -0.02, { two: true });
  m.ring(P(0, 0, 0), 11, edge, { w: 1.5 });
  garden(m, 0, 0, 9, 8, 9);
}

/** Bubbles. Rules: five half-bubbles, radii 8, 8/φ, 8/φ², 8/φ³, 8/φ⁴, set round the largest by the golden angle, each overlapping its neighbour by a third of its radius; golden films; a garden in each. */
function bubbles(m: Mesh) {
  for (let i = 0; i < 5; i++) {
    const r = RATIOS.bubbles[i] as number;
    const a = i * GOLDEN_ANGLE;
    const d = i ? 8 + r * 0.66 : 0;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    dome(m, P(x, 0, z), r, film, null, 1, true);
    m.ring(P(x, 0, z), r, edge, { w: 1.2 });
    m.ring(P(x, r * 0.5, z), r * Math.cos(Math.PI / 6), film, { w: 0.4 });
    garden(m, x, z, r * 0.8, r * 0.75, Math.max(2, 7 - i));
  }
}

/** Palm house. Rules: a barrel vault 24 long, radius 4.5, ribs every 1.5, on walls 1.5 high; across its middle a drum of radius 6.5 and a dome on it; glass faint, ribs bright; palms inside, the tallest under the dome. */
function palmHouse(m: Mesh) {
  const hx = 12;
  const r = 4.5;
  const h = 1.5;
  m.box(P(0, 0, 0), hx, h, r, glass, edge, 0, false);
  m.centre = P(0, h - 1, 0);
  m.surface(
    (u, v) => {
      const a = v * Math.PI;
      return P(-hx + 2 * hx * u, h + Math.sin(a) * r, Math.cos(a) * r);
    },
    16,
    8,
    glass,
    { two: true },
    { tone: edge, uEvery: 1, vEvery: 2 },
  );
  for (const x of [-hx, hx])
    dome(m, P(x, h, 0), r, glass, { tone: edge, ribs: 6, rings: 2 }, 1, true);
  const R = 6.5;
  m.centre = P(0, 3, 0);
  m.cylinder(P(0, 0, 0), R, G, G + h + r, glass, edge, 16);
  dome(m, P(0, h + r, 0), R, glass, { tone: edge, ribs: 16, rings: 3 }, 1, true);
  m.dot(P(0, h + r + R + 0.4, 0), 0.5, light, { w: 0.8 });
  garden(m, 0, 0, 5.5, 9.5, 7);
  for (const x of [-8, -4.5, 4.5, 8]) tree(m, x, hash(x, 3) * 2 - 1, 3.6, 1.4);
}

/** Lattice. Rules: a grid shell of hexagons 1.3 across over a circle of radius 12, lifted to a shallow dome 12/φ high (height ∝ 1 − (r/12)²); edges bright, glass faint; a garden inside. */
function latticeShell(m: Mesh) {
  const R = 12;
  const H = R / PHI;
  const s = 1.3;
  const lift = (x: number, z: number): Vec3 =>
    P(x, H * Math.max(0, 1 - (x * x + z * z) / (R * R)), z);
  m.centre = P(0, -4, 0);
  for (let q = -12; q <= 12; q++)
    for (let r = -12; r <= 12; r++) {
      const cx = s * Math.sqrt(3) * (q + r / 2);
      const cz = s * 1.5 * r;
      const corners = Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * TAU + Math.PI / 6;
        return [cx + Math.cos(a) * s, cz + Math.sin(a) * s] as [number, number];
      });
      if (corners.some(([x, z]) => x * x + z * z > R * R)) continue;
      const pts = corners.map(([x, z]) => lift(x, z));
      const c = lift(cx, cz);
      for (let k = 0; k < 6; k++) {
        m.tri(c, pts[k] as Vec3, pts[(k + 1) % 6] as Vec3, glass, { two: true });
        if (k < 3) m.line(pts[k] as Vec3, pts[k + 1] as Vec3, edge);
      }
    }
  m.ring(P(0, 0, 0), R, edge, { w: 1.5 });
  garden(m, 0, 0, 10, 5.5, 11);
}

/** Garden of domes. Rules: five geodesic domes on a ring of radius 13, radii 4.5·φ^(−k/2) for k = 0…4, a sixth √φ larger in the middle; paths between them; a garden in each. */
function domeGarden(m: Mesh) {
  const C = 4.5 * Math.sqrt(PHI);
  m.geodesic(P(0, 0, 0), C, 3, glass, edge, -0.02, { two: true });
  garden(m, 0, 0, C * 0.85, C * 0.7, 5);
  for (let k = 0; k < 5; k++) {
    const r = 4.5 * PHI ** (-k / 2);
    const a = (k / 5) * TAU;
    const x = Math.cos(a) * 13;
    const z = Math.sin(a) * 13;
    m.geodesic(P(x, 0, z), r, 2, glass, edge, -0.02, { two: true });
    m.ring(P(x, 0, z), r, edge, { w: 1 });
    garden(m, x, z, r * 0.85, r * 0.7, 4);
    m.line(
      P(Math.cos(a) * C, 0.05, Math.sin(a) * C),
      P(Math.cos(a) * (13 - r), 0.05, Math.sin(a) * (13 - r)),
      road,
      { w: 0.8 },
    );
  }
  m.ring(P(0, 0.05, 0), 13, road, { w: 0.6 });
}

/* ---------- new works: cement and kilns (2026-11-12) ---------- */

/*
 * 2026-11-12: "factories do different ones: cement factory inspired by big old rusty cement
 * factories etc..." Our own cement works, built from the same few shapes: silos, a preheater
 * tower of stacked cyclones, a long kiln tube, conveyor bridges. Its rust look is the Rust
 * palette (lib/golden-city.ts), the shapes stay the same.
 */

/** A straight tube from a to b, radius r: its skin as faces, rings every `ringEvery` along it. */
export function tube(m: Mesh, a: Vec3, b: Vec3, r: number, ringEvery = 0, n = 12) {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const f: Vec3 = [d[0] / L, d[1] / L, d[2] / L];
  // Two directions square to the tube.
  const ref: Vec3 = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u0: Vec3 = [
    f[1] * ref[2] - f[2] * ref[1],
    f[2] * ref[0] - f[0] * ref[2],
    f[0] * ref[1] - f[1] * ref[0],
  ];
  const ul = Math.hypot(u0[0], u0[1], u0[2]);
  const u: Vec3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul];
  const v: Vec3 = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
  const at = (s: number, ang: number): Vec3 => [
    a[0] + d[0] * s + (u[0] * Math.cos(ang) + v[0] * Math.sin(ang)) * r,
    a[1] + d[1] * s + (u[1] * Math.cos(ang) + v[1] * Math.sin(ang)) * r,
    a[2] + d[2] * s + (u[2] * Math.cos(ang) + v[2] * Math.sin(ang)) * r,
  ];
  const keep = m.centre;
  m.centre = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  // The centre line moves with the faces, so each face's normal points out from the axis.
  const segs = Math.max(2, Math.ceil(L / 1.5));
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < n; j++) {
      const s0 = i / segs;
      const s1 = (i + 1) / segs;
      const a0 = (j / n) * TAU;
      const a1 = ((j + 1) / n) * TAU;
      m.centre = [
        a[0] + d[0] * (s0 + s1) * 0.5,
        a[1] + d[1] * (s0 + s1) * 0.5,
        a[2] + d[2] * (s0 + s1) * 0.5,
      ];
      m.tri(at(s0, a0), at(s1, a0), at(s1, a1), face);
      m.tri(at(s0, a0), at(s1, a1), at(s0, a1), face);
    }
  if (ringEvery > 0) {
    const k = Math.max(1, Math.round(L / ringEvery));
    for (let i = 0; i <= k; i++)
      m.poly(
        Array.from({ length: n }, (_, j) => at(i / k, (j / n) * TAU)),
        true,
        edge,
        { w: 1.2 },
      );
  }
  for (const ang of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI])
    m.line(at(0, ang), at(1, ang), edge, { w: 0.6 });
  m.centre = keep;
}

/** A truss bridge from a to b, `w` wide: two rails each side, posts and a zigzag between them, a belt of light inside. */
export function truss(m: Mesh, a: Vec3, b: Vec3, w: number, h: number, belt = 1.6) {
  const d: Vec3 = [b[0] - a[0], 0, b[2] - a[2]];
  const L = Math.hypot(d[0], d[2]) || 1;
  const side: Vec3 = [(-d[2] / L) * (w / 2), 0, (d[0] / L) * (w / 2)];
  const at = (s: number, k: number, y: number): Vec3 => [
    a[0] + (b[0] - a[0]) * s + side[0] * k,
    a[1] + (b[1] - a[1]) * s + y,
    a[2] + (b[2] - a[2]) * s + side[2] * k,
  ];
  const n = Math.max(3, Math.round(Math.hypot(L, b[1] - a[1]) / 2));
  for (const k of [-1, 1]) {
    m.line(at(0, k, 0), at(1, k, 0), edge, { w: 1.1 });
    m.line(at(0, k, h), at(1, k, h), edge, { w: 1.1 });
    m.quad(at(0, k, 0), [b[0] - a[0], b[1] - a[1], b[2] - a[2]], [0, h, 0], face, {
      two: true,
      w: 0.4,
    });
    for (let i = 0; i < n; i++) {
      m.line(at(i / n, k, 0), at(i / n, k, h), edge, { w: 0.5 });
      m.line(at(i / n, k, i % 2 ? 0 : h), at((i + 1) / n, k, i % 2 ? h : 0), edge, { w: 0.4 });
    }
  }
  m.line(at(0, 0, 0.3), at(1, 0, 0.3), light, { anim: Anim.flow, key: belt, w: 1.2 });
}

/**
 * Cement works. Rules: a = 2.4. Four silos in a row, radius a, a·φ³ tall, banded every a; a
 * preheater tower a·φ⁴ tall and 2a square, carrying four cyclones down its side (each a cone
 * a/φ wide); from its foot the kiln, a tube a/φ round and 10a long falling one in twenty-five,
 * on three piers with a tyre at each, its far end glowing; conveyor bridges from the silo tops to
 * the tower; a chimney a·φ⁵ tall breathing slow steam. Big, plain and heavy, as old works are.
 */
function cementWorks(m: Mesh) {
  const a = 2.4;
  const hs = a * PHI ** 3;
  // The silos, side by side along -z.
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * (2 * a + 0.3);
    const z = -6;
    m.centre = P(x, hs / 2, z);
    m.cylinder(P(x, 0, z), a, G, G + hs, face, edge, 4, 16);
    for (let y = a; y < hs; y += a) m.ring(P(x, y, z), a + 0.04, edge, { w: 0.6 }, 16);
    // A cone roof and a lamp.
    m.surface(
      (u, v) => {
        const t = u * TAU;
        const r = a * (1 - v);
        return P(x + Math.cos(t) * r, hs + v * a * 0.5, z + Math.sin(t) * r);
      },
      12,
      1,
      face,
    );
    m.dot(P(x, hs + a * 0.55, z), 0.3, light, { w: 0.4 });
  }
  // The preheater tower: a frame of floors, cyclones down its face.
  const ht = a * PHI ** 4;
  const tx = 8;
  const tz = -4;
  m.box(P(tx, 0, tz), a, ht, a, glass, edge, 0, true);
  for (let y = a; y < ht; y += a) {
    m.poly(
      [P(tx - a, y, tz - a), P(tx + a, y, tz - a), P(tx + a, y, tz + a), P(tx - a, y, tz + a)],
      true,
      edge,
      { w: 0.7 },
    );
    // Cross bracing on the front, a zigzag up the frame.
    m.line(P(tx - a, y - a, tz + a), P(tx + a, y, tz + a), edge, { w: 0.4 });
  }
  for (let k = 0; k < 4; k++) {
    const y = ht - a * 0.8 - k * a * 1.4;
    const cx = tx + (k % 2 ? -a * 0.6 : a * 0.6);
    const cz = tz + a + a / PHI;
    m.centre = P(cx, y - a / 2, cz - 0.5);
    m.cylinder(P(cx, 0, cz), a / PHI, G + y - a * 0.5, G + y, face, edge, 0, 10);
    m.surface(
      (u, v) => {
        const t = u * TAU;
        const r = (a / PHI) * (1 - 0.85 * v);
        return P(cx + Math.cos(t) * r, y - a * 0.5 - v * a, cz + Math.sin(t) * r);
      },
      10,
      2,
      face,
    );
  }
  m.dot(P(tx, ht + 0.6, tz), 0.45, light, { w: 0.5 });
  // The kiln: a long tube falling gently from the tower's foot, on three piers, glowing at its end.
  const k0 = P(tx - 1, a * 1.6, tz + a + 1.5);
  const k1 = P(tx - 1 - 10 * a * 0.8, a * 1.6 - (10 * a) / 25, tz + a + 1.5 + 10 * a * 0.6);
  tube(m, k0, k1, a / PHI, a * 1.4, 14);
  for (let i = 1; i <= 3; i++) {
    const s = i / 4;
    const q: Vec3 = [
      k0[0] + (k1[0] - k0[0]) * s,
      k0[1] + (k1[1] - k0[1]) * s,
      k0[2] + (k1[2] - k0[2]) * s,
    ];
    m.box([q[0], G, q[2]], 0.6, q[1] - G - a / PHI, 0.9, face, edge);
    m.ring(q, a / PHI + 0.2, edge, { w: 1.5 }, 14);
  }
  m.dot(k1, a / PHI, fire, { anim: Anim.pulse, key: 0.4, w: 1.8 });
  // Conveyor bridges from the silo tops to the tower.
  truss(m, P(-9 + 3 * (2 * a + 0.3), hs, -6), P(tx - a, ht * 0.62, tz), 1.2, 1.1);
  truss(m, P(-9, hs, -6 + a), P(-14, 0.2, 8), 1.1, 1, -1.4);
  // The chimney and its steam.
  const cx = 14;
  const cz = 6;
  m.centre = P(cx, 10, cz);
  m.cylinder(P(cx, 0, cz), 0.9, G, G + a * PHI ** 5, face, edge, 3, 10);
  m.ring(P(cx, a * PHI ** 5, cz), 0.9, light, { w: 1.2 }, 10);
  m.dot(P(cx, a * PHI ** 5 + 0.4, cz), 0.8, steam, { anim: Anim.rise, key: 9, w: 3 });
  // A low hall along the kiln, its windows lit.
  m.box(P(-4, 0, 9), 6, a, 2.4, face, edge);
  for (let j = 0; j < 10; j++) m.dot(P(-9.5 + j * 1.2, a * 0.55, 11.45), 0.22, light, { w: 0.3 });
}

/**
 * Kilns. Rules: five bottle kilns round a yard by the golden angle, the first base radius 3.2 and
 * each φ^(1/2) smaller; each kiln's wall a bottle, r(y) = R(1 − 0.6·(y/H)^0.8), H = Rφ², a neck
 * R/φ² wide on top; a fire glowing slowly in each door; a long low workshop beside them.
 */
function kilns(m: Mesh) {
  for (let i = 0; i < 5; i++) {
    const R = 3.2 * PHI ** (-i / 2);
    const H = R * PHI ** 2;
    const ang = i * GOLDEN_ANGLE;
    const d = i ? 7 + 2.2 * i : 0;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    m.centre = P(x, H * 0.3, z);
    const r = (y: number) => R * (1 - 0.6 * (y / H) ** 0.8);
    m.surface(
      (u, v) => {
        const t = u * TAU;
        const y = v * H;
        return P(x + Math.cos(t) * r(y), y, z + Math.sin(t) * r(y));
      },
      16,
      6,
      face,
      {},
      { tone: edge, uEvery: 4, vEvery: 2 },
    );
    m.cylinder(P(x, 0, z), R / PHI ** 2 + 0.3, G + H, G + H + R / PHI, face, edge, 0, 10);
    m.ring(P(x, H + R / PHI, z), R / PHI ** 2 + 0.3, light, { w: 1 }, 10);
    m.dot(P(x, H + R / PHI + 0.4, z), 0.6, steam, { anim: Anim.rise, key: 5, w: 1.5 });
    const door = (ang + Math.PI) % TAU;
    m.dot(P(x + Math.cos(door) * R, 1, z + Math.sin(door) * R), 0.8, fire, {
      anim: Anim.pulse,
      key: i * 1.3,
      w: 1.2,
    });
  }
  m.box(P(0, 0, -15), 10, 2.6, 2.2, face, edge);
  m.centre = P(0, 5, 0);
  for (let j = 0; j < 14; j++) m.dot(P(-9 + j * 1.4, 1.4, -12.75), 0.24, light, { w: 0.3 });
}

/* ---------- the elements ---------- */

export type Builder = (m: Mesh) => void;

/** The single buildings, each one kind: the first rung of each ladder (lib/golden-quarters.ts). */
export const TEMPLE_KINDS = {
  names: ['Rotunda', 'Ziggurat', 'Ring', 'Pyramid', 'Lotus'],
  build: [rotunda, ziggurat, ringGate, pyramid, lotus] as Builder[],
};
export const FACTORY_KINDS = {
  names: ['Sawtooth', 'Foundry', 'Assembly', 'Workshops', 'Solar', 'Cement works', 'Kilns'],
  build: [sawtooth, foundry, assembly, workshops, solar, cementWorks, kilns] as Builder[],
};
export const DOME_KINDS = {
  names: ['Geodesic', 'Bubbles', 'Palm house', 'Lattice'],
  build: [geodesicHouse, bubbles, palmHouse, latticeShell] as Builder[],
};
/** Five domes on a ring round a sixth: the domes' "group" rung. */
export const domeGroup: Builder = domeGarden;
export { garden, plaza, tree };
