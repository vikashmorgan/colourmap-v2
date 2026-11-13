/*
 * ATLANTIS BUILDINGS — the sunken city's own architecture, from the single
 * building to the whole quarter (docs/specs/art-city.md, "Evolutions").
 *
 * 2026-11-13: "ok work on atlantis design components and add them, make sure all design
 * components for categories can be navigated by going up and something tells us."
 *
 * Six buildings of Atlantis, each from a few shapes and one ratio as the golden temples are:
 * a porthole tower, a pearl dome, a coral temple, a kelp spire, a submarine pen and a jelly
 * lighthouse. Then the same ladder as Temples, Factories and Domes: a cluster of domes joined
 * by glass tunnels, a walled compartment, a whole Atlantis quarter. Bubbles rise from every
 * crown; the sea's colours are the Deep sea palette (lib/golden-city.ts), the water behind it
 * Atlantis's own.
 *
 * Pure: no three.js, no DOM.
 */

import { GOLDEN_ANGLE, hash, type Vec3 } from './bigbang';
import { type Builder, dome, garden, tube } from './golden-buildings';
import { type BuildingSet, ladder, place } from './golden-quarters';
import { Anim, GROUND_Y, type Mesh, PHI, Tone } from './grain-mesh';

const TAU = Math.PI * 2;
const G = GROUND_Y;
const P = (x: number, y: number, z: number): Vec3 => [x, G + y, z];
const polar = (r: number, a: number, y = 0): Vec3 => P(Math.cos(a) * r, y, Math.sin(a) * r);
const { edge, face, glass, water, plant, fire, light, ground, road, steam, film } = Tone;

/** The sizes the buildings are built from, each a power of φ (checked by the tests). */
export const ATLANTIS_RATIOS = {
  /** The porthole tower's drums' radii, each φ^(1/2) narrower going up. */
  tower: [0, 1, 2].map((i) => 5 / Math.sqrt(PHI) ** i),
  /** The coral temple's terraces' radii, each φ times smaller. */
  temple: [0, 1, 2].map((i) => 12 / PHI ** i),
  /** The kelp spire's height: its base radius times φ⁴. */
  spire: { base: 4, height: 4 * PHI ** 4 },
};

/* ---------- shared pieces ---------- */

/** A round porthole of radius r on an upright wall at c, facing out along angle a: its rim and a lit pane. */
function porthole(m: Mesh, c: Vec3, a: number, r: number) {
  const tx = -Math.sin(a);
  const tz = Math.cos(a);
  m.poly(
    Array.from({ length: 10 }, (_, j) => {
      const t = (j / 10) * TAU;
      return [c[0] + tx * Math.cos(t) * r, c[1] + Math.sin(t) * r, c[2] + tz * Math.cos(t) * r];
    }),
    true,
    edge,
    { w: 0.5 },
  );
  m.dot(c, r * 0.55, light, { anim: Anim.pulse, key: a * 3, w: 0.35 });
}

/** A ring of n portholes round a round wall of radius r at height y. */
function portholeRing(m: Mesh, r: number, y: number, n: number, pr: number, off = 0) {
  for (let k = 0; k < n; k++) {
    const a = off + (k / n) * TAU;
    porthole(m, polar(r + 0.05, a, y), a, pr);
  }
}

/** Bubbles rising from c, `h` high: a few dots that climb, sway and fade. */
function bubbles(m: Mesh, c: Vec3, h: number, n = 4) {
  for (let j = 0; j < n; j++)
    m.dot([c[0], c[1], c[2]], 0.35 + 0.25 * hash(j, c[0] + 7), steam, {
      anim: Anim.rise,
      key: h,
      w: 0.5,
    });
}

/** A branch of coral from the foot at (x, y0, z): a stem forking twice, a lit polyp at each tip. */
function coral(m: Mesh, x: number, z: number, h: number, seed: number, y0 = 0) {
  const grow = (from: Vec3, a: number, len: number, depth: number) => {
    const lean = 0.35 + 0.25 * hash(depth, seed);
    const to: Vec3 = [
      from[0] + Math.cos(a) * len * lean,
      from[1] + len,
      from[2] + Math.sin(a) * len * lean,
    ];
    m.line(from, to, depth ? plant : fire, { w: 0.5 + 0.3 * depth });
    if (depth === 0) {
      m.dot(to, 0.3, fire, { anim: Anim.pulse, key: seed + a, w: 0.3 });
      return;
    }
    grow(to, a + 0.7, len / PHI, depth - 1);
    grow(to, a - 0.7, len / PHI, depth - 1);
  };
  grow(P(x, y0, z), hash(seed, 1) * TAU, h / 2, 2);
}

/** A reef of `n` corals in a ring from r0 to r1, by the golden angle. */
function reef(m: Mesh, r0: number, r1: number, n: number, seed: number) {
  for (let j = 0; j < n; j++) {
    const r = r0 + (r1 - r0) * hash(j, seed);
    const a = j * GOLDEN_ANGLE;
    coral(m, Math.cos(a) * r, Math.sin(a) * r, 1.2 + 1.8 * hash(j, seed + 1), seed + j);
  }
}

/** The sandy floor every Atlantis building stands on: a round bed, its rim, ripples of light. */
export function seabed(m: Mesh, r = 18) {
  m.centre = P(0, -10, 0);
  m.disc(P(0, 0, 0), r, ground, 0, { w: 0.05 });
  m.ring(P(0, 0, 0), r, road, { w: 0.3 });
  for (let i = 1; i <= 3; i++)
    m.ring(P(0, 0.03, 0), r * (i / 4), water, { w: 0.15, anim: Anim.pulse, key: i });
}

/** A glass tunnel from a to b, lifted `y` off the floor: a glass tube with ribs, a light running along it. */
function glassTunnel(m: Mesh, a: Vec3, b: Vec3, r = 1.1) {
  tube(m, a, b, r, 1.6, 10, glass);
  m.line(a, b, light, { anim: Anim.flow, key: 1.4, w: 0.35 });
}

/* ---------- the six buildings ---------- */

/**
 * Porthole tower. Rules: three drums stacked, radii 5, 5/√φ, 5/φ, each 5φ high; on every drum
 * rings of portholes (twelve, ten, eight round); a glass cap, a hemisphere on the top drum, a
 * pearl of light under it; bubbles from the crown.
 */
function portholeTower(m: Mesh) {
  let y = 0;
  const hs = 5 * PHI;
  ATLANTIS_RATIOS.tower.forEach((r, i) => {
    m.centre = P(0, y + hs / 2, 0);
    m.cylinder(P(0, 0, 0), r, G + y, G + y + hs, face, edge, 0);
    const n = [12, 10, 8][i] as number;
    for (let row = 1; row <= 2; row++) portholeRing(m, r, y + (hs * row) / 3, n, 0.55, row * 0.3);
    m.disc(P(0, y + hs, 0), r, ground, 0, { w: 0.4 });
    y += hs;
  });
  const top = ATLANTIS_RATIOS.tower[2] as number;
  dome(m, P(0, y, 0), top, glass, { tone: edge, ribs: 8, rings: 2 }, 1, true);
  m.dot(P(0, y + top * 0.4, 0), top / PHI ** 2, light, { anim: Anim.pulse, key: 0.4, w: 0.8 });
  bubbles(m, P(0, y + top, 0), 16, 6);
}

/**
 * Pearl dome. Rules: a geodesic glass dome of radius 11 on a drum 11/φ³ high ringed with
 * portholes; inside, a coral garden and, in its middle on a plinth, a pearl of radius 11/φ⁴
 * glowing slowly.
 */
function pearlDome(m: Mesh) {
  const R = 11;
  const drum = R / PHI ** 3;
  m.centre = P(0, drum / 2, 0);
  m.cylinder(P(0, 0, 0), R, G, G + drum, face, edge, 0);
  portholeRing(m, R, drum / 2, 16, 0.6);
  m.geodesic(P(0, drum, 0), R, 3, glass, edge, -0.02, { two: true });
  m.centre = P(0, -4, 0);
  m.cylinder(P(0, 0, 0), 1.6, G, G + 2, face, edge, 6);
  m.dot(P(0, 2 + R / PHI ** 4, 0), R / PHI ** 4, film, { anim: Anim.pulse, key: 0, w: 1.4 });
  m.dot(P(0, 2 + R / PHI ** 4, 0), R / PHI ** 5, light, { anim: Anim.pulse, key: 0, w: 0.6 });
  reef(m, 3, R * 0.85, 26, 701);
  bubbles(m, P(0, drum + R, 0), 14);
}

/**
 * Coral temple. Rules: three round terraces, radii 12, 12/φ, 12/φ², each 12/φ³ high; on top a
 * shell roof of thirteen ribs fanned over the smallest terrace, each rib a half-arch of radius
 * 12/φ²; corals on every terrace; a stair up the front.
 */
function coralTemple(m: Mesh) {
  const step = 12 / PHI ** 3;
  ATLANTIS_RATIOS.temple.forEach((r, i) => {
    m.centre = P(0, -5, 0);
    m.cylinder(P(0, 0, 0), r, G + i * step, G + (i + 1) * step, face, edge, 0);
    m.disc(P(0, (i + 1) * step, 0), r, ground, 0, { w: 0.5 });
    for (let c = 0; c < 10 - 2 * i; c++) {
      const a = c * GOLDEN_ANGLE + i;
      const rr = r * (0.82 + 0.12 * hash(c, 712 + i));
      coral(
        m,
        Math.cos(a) * rr,
        Math.sin(a) * rr,
        1 + hash(c, 713),
        714 + c + i * 20,
        (i + 1) * step,
      );
    }
  });
  const y0 = 3 * step;
  const rs = ATLANTIS_RATIOS.temple[2] as number;
  const ribs = 13;
  m.centre = P(0, y0, 0);
  m.surface(
    (u, v) => {
      // A half dome open to the front, its rim scalloped into the shell's ribs.
      const a = Math.PI * u;
      const lat = v * (Math.PI / 2);
      const r = rs * 0.9 * (1 + 0.12 * Math.abs(Math.sin(u * ribs * Math.PI)));
      return P(
        Math.cos(a) * Math.cos(lat) * r,
        y0 + Math.sin(lat) * rs * 0.8,
        -Math.sin(a) * Math.cos(lat) * r,
      );
    },
    ribs * 2,
    8,
    film,
    { two: true },
    { tone: edge, uEvery: 2 },
  );
  for (let s = 0; s < 3; s++) {
    const r = ATLANTIS_RATIOS.temple[s] as number;
    m.box(P(0, s * step, r * 0.92), 1.4, step, 1.2, face, edge);
  }
  m.dot(P(0, y0 + rs * 0.35, 0), rs / PHI ** 2, light, { anim: Anim.pulse, key: 1, w: 0.7 });
  bubbles(m, P(0, y0 + rs * 0.8, 0), 12);
}

/**
 * Kelp spire. Rules: four ribs climb in a helix a full turn and a half, from radius 4 at the
 * foot to radius 4/φ⁴ at the top, 4φ⁴ high; glass between them; lit floors every φ³; strands of
 * kelp round its foot swaying; bubbles from the tip.
 */
function kelpSpire(m: Mesh) {
  const { base, height } = ATLANTIS_RATIOS.spire;
  const radius = (v: number) => base * PHI ** (-4 * v);
  const turns = 1.5;
  m.centre = P(0, height / 2, 0);
  m.surface(
    (u, v) => {
      const a = u * TAU + v * turns * TAU;
      const r = radius(v);
      return P(Math.cos(a) * r, v * height, Math.sin(a) * r);
    },
    16,
    20,
    glass,
    { two: true },
    { tone: edge, uEvery: 4 },
  );
  for (let y = PHI ** 3; y < height * 0.85; y += PHI ** 3) {
    const v = y / height;
    m.ring(P(0, y, 0), radius(v), light, { w: 0.5 }, 16);
  }
  m.line(P(0, 0, 0), P(0, height, 0), light, { anim: Anim.flow, key: 2, w: 0.4 });
  for (let k = 0; k < 14; k++) {
    const a = k * GOLDEN_ANGLE;
    const r = base + 1.5 + 3 * hash(k, 721);
    const h = 4 + 6 * hash(k, 722);
    const pts = Array.from({ length: 7 }, (_, j) => {
      const f = j / 6;
      const sway = Math.sin(f * Math.PI * 1.5 + k) * 0.6 * f;
      return P(Math.cos(a) * r + sway, f * h, Math.sin(a) * r + sway * 0.5);
    });
    m.poly(pts, false, plant, { w: 0.5 });
  }
  bubbles(m, P(0, height, 0), 14, 6);
}

/**
 * Submarine pen. Rules: a basin of water 24 long and 8 wide; over it three glass barrel vaults
 * side by side, radius 4, ribs every 1.6; a submarine resting in the middle bay, its hull an
 * ellipsoid 10 long, a conning tower and a row of lit portholes; quays lit along both sides.
 */
function submarinePen(m: Mesh) {
  const hx = 12;
  const keep = m.centre;
  m.centre = P(0, -10, 0);
  m.quad(P(-hx, 0.02, -6), [2 * hx, 0, 0], [0, 0, 12], water, { w: 0.6 });
  m.centre = keep;
  for (const z of [-4, 0, 4]) {
    const r = 4 * (z ? 1 / Math.sqrt(PHI) : 1);
    m.centre = P(0, 0, z);
    m.surface(
      (u, v) => {
        const a = v * Math.PI;
        return P(-hx + 2 * hx * u, Math.sin(a) * r, z + Math.cos(a) * r * 0.5);
      },
      15,
      6,
      glass,
      { two: true },
      { tone: edge, uEvery: 1 },
    );
  }
  for (const z of [-6.2, 6.2]) {
    m.line(P(-hx, 0.4, z), P(hx, 0.4, z), edge, { w: 1.2 });
    for (let x = -hx + 1; x < hx; x += 3) m.dot(P(x, 0.8, z), 0.25, light, { w: 0.3 });
  }
  // The submarine: an ellipsoid hull, half under the water line.
  const L = 5;
  const R = 1.2;
  m.centre = P(0, 1.2, 0);
  m.surface(
    (u, v) => {
      const a = u * TAU;
      const t = (v - 0.5) * Math.PI;
      return P(Math.sin(t) * L, 1.2 + Math.cos(t) * Math.sin(a) * R, Math.cos(t) * Math.cos(a) * R);
    },
    12,
    10,
    face,
    {},
    { tone: edge, vEvery: 5 },
  );
  m.box(P(-0.8, 2.2, 0), 1, 1.1, 0.5, face, edge);
  for (let x = -3.5; x <= 3.5; x += 1) porthole(m, P(x, 1.4, R + 0.02), Math.PI / 2, 0.22);
  bubbles(m, P(L, 1.2, 0), 6, 5);
}

/**
 * Jelly lighthouse. Rules: a stem 5φ² high on a round foot; on top a bell, a dome flattened to
 * 1/φ of its radius 6, ribbed in eight; twelve tentacles of light trailing from its rim down
 * past the stem, swaying; it breathes slowly.
 */
function jellyLighthouse(m: Mesh) {
  const H = 5 * PHI ** 2;
  const R = 6;
  m.centre = P(0, -4, 0);
  m.cylinder(P(0, 0, 0), 3, G, G + 1.2, face, edge, 0);
  m.centre = P(0, H / 2, 0);
  m.cylinder(P(0, 0, 0), 0.6, G + 1.2, G + H, face, edge, 4, 8);
  m.centre = P(0, H, 0);
  m.surface(
    (u, v) => {
      const a = u * TAU;
      const lat = v * (Math.PI / 2);
      const scallop = 1 + 0.06 * Math.cos(a * 8);
      return P(
        Math.cos(a) * Math.cos(lat) * R * scallop,
        H + (Math.sin(lat) * R) / PHI,
        Math.sin(a) * Math.cos(lat) * R * scallop,
      );
    },
    32,
    6,
    film,
    { two: true, anim: Anim.breathe },
    { tone: edge, uEvery: 4 },
  );
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const pts = Array.from({ length: 9 }, (_, j) => {
      const f = j / 8;
      const sway = Math.sin(f * Math.PI * 2 + k * 0.8) * 0.7 * f;
      const r = R * 0.85 * (1 - 0.35 * f) + sway;
      return P(Math.cos(a) * r, H - f * H * 0.7, Math.sin(a) * r);
    });
    m.poly(pts, false, light, { anim: Anim.flow, key: -1.2, w: 0.35 });
  }
  m.dot(P(0, H + R / PHI / 2, 0), R / PHI ** 2, light, { anim: Anim.pulse, key: 2, w: 1 });
  bubbles(m, P(0, H + R / PHI, 0), 12);
}

const KINDS = {
  names: [
    'Porthole tower',
    'Pearl dome',
    'Coral temple',
    'Kelp spire',
    'Submarine pen',
    'Jelly lighthouse',
  ],
  build: [portholeTower, pearlDome, coralTemple, kelpSpire, submarinePen, jellyLighthouse],
};

/* ---------- the ladder: cluster → compartment → quarter ---------- */

/**
 * Dome cluster. Rules: the Pearl dome at φ⁻¹ in the middle; the Porthole tower, the Coral
 * temple, the Kelp spire and the Jelly lighthouse at φ⁻² on a circle of radius 22, a quarter
 * turn apart; a glass tunnel from the dome out to each, 1.5 off the floor; a reef between.
 */
const domeCluster: Builder = (m) => {
  place(m, pearlDome, 0, 0, 1 / PHI);
  [portholeTower, coralTemple, kelpSpire, jellyLighthouse].forEach((b, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    place(m, b, Math.cos(a) * 22, Math.sin(a) * 22, 1 / PHI ** 2, -a);
    glassTunnel(m, polar(7.2, a, 1.5), polar(22 - 12 / PHI ** 2, a, 1.5));
  });
  reef(m, 9, 30, 70, 731);
};

/**
 * Compartment. Rules: a round sea wall of radius 30, 30/φ⁴ high, glass above it as a shallow
 * dome 30/φ² high; inside, the dome cluster at φ⁻¹; a submarine pen at φ⁻² by the gate on its
 * east side, its basin running out through the wall; kelp and coral round the rim.
 */
const compartment: Builder = (m) => {
  const R = 30;
  const wall = R / PHI ** 4;
  m.centre = P(0, wall / 2, 0);
  m.cylinder(P(0, 0, 0), R, G, G + wall, face, edge, 24);
  portholeRing(m, R, wall / 2, 36, 0.7);
  m.centre = P(0, -R, 0);
  m.surface(
    (u, v) => {
      const a = u * TAU;
      const rr = R * (1 - v);
      return P(
        Math.cos(a) * rr,
        wall + (R / PHI ** 2) * Math.sqrt(1 - (1 - v) ** 2),
        Math.sin(a) * rr,
      );
    },
    36,
    6,
    glass,
    { two: true },
    { tone: edge, uEvery: 3, vEvery: 2 },
  );
  place(m, domeCluster, -4, 0, 1 / PHI);
  place(m, submarinePen, R - 9, 0, 1 / PHI ** 2, Math.PI / 2);
  reef(m, R - 5, R - 1, 60, 741);
  bubbles(m, P(0, wall + R / PHI ** 2, 0), 20, 8);
};

/**
 * Atlantis quarter. Rules: a Kelp spire √φ times larger in the middle, the landmark, inside a
 * ring of coral gardens out to 14; on the ring of radius 34 six neighbourhoods, by turns a
 * compartment at φ⁻³ and a dome cluster at φ⁻²·⁵; a ring of glass tunnels joining them at radius
 * 34, six more out to the spire; submarine lanes of light round the rim at 46; reefs everywhere.
 */
const atlantisQuarter: Builder = (m) => {
  place(m, kelpSpire, 0, 0, Math.sqrt(PHI) / PHI);
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * TAU;
    garden(m, Math.cos(a) * 10, Math.sin(a) * 10, 2.4, 2.6, 4);
  }
  reef(m, 6, 15, 60, 751);
  const at = (k: number) => ((k + 0.5) / 6) * TAU;
  for (let k = 0; k < 6; k++) {
    const a = at(k);
    place(
      m,
      k % 2 ? compartment : domeCluster,
      Math.cos(a) * 34,
      Math.sin(a) * 34,
      k % 2 ? 1 / PHI ** 3 : 1 / PHI ** 2.5,
      -a,
    );
    const b = at(k + 1);
    const r = 34;
    const gap = 0.2;
    glassTunnel(m, polar(r, a + gap, 1.4), polar(r, b - gap, 1.4), 0.9);
    glassTunnel(m, polar(9, a, 1.4), polar(r - 8, a, 1.4), 0.9);
  }
  for (const r of [45, 47.5])
    m.ring(P(0, 3, 0), r, light, { anim: Anim.flow, key: r === 45 ? 3 : -3, w: 0.4 }, 96);
  reef(m, 18, 28, 90, 761);
  reef(m, 40, 48, 110, 771);
};

/** The pills of the Atlantis buildings piece: the six buildings, then the ladder. */
export const ATLANTIS_BUILDINGS: BuildingSet = {
  ...ladder('Atlantis', KINDS, [
    ['Dome cluster', domeCluster],
    ['Compartment', compartment],
    ['Atlantis quarter', atlantisQuarter],
  ]),
  floor: seabed,
};
