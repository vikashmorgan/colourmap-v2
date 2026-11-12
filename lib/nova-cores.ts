/*
 * NOVA CORES — power sources of the golden city (docs/specs/art-city.md, "Nova Cores").
 *
 * 2026-11-12: "that part called the heart is absolutely premium. would love to have more novas
 * like this around the city that are like power sources, each unique, with different designs
 * for the hearts. call them the Nova Core."
 *
 * Each core is drawn in the heart's language: an open lattice of light floating over a round
 * plaza of florets, breathing slowly, its energy running out along conduits on the ground. Each
 * comes from one geometric rule (NOVA_RULES, listed in the spec too).
 *
 * `novaCore(kind, mesh, at, s)` builds one into any mesh, so the city game can set cores round
 * its districts later as landmarks and power sources.
 *
 * Pure: no three.js, no DOM.
 */

import { fibonacciSphere, GOLDEN_ANGLE, type Vec3 } from './bigbang';
import { Placed } from './golden-quarters';
import { Anim, GROUND_Y, Mesh, type Opts, PHI, Tone } from './grain-mesh';

const TAU = Math.PI * 2;
const G = GROUND_Y;
const { edge, light, plant, water, ground, road, face } = Tone;

/** The core's radius, and how high its centre floats over the ground (as the heart's sphere). */
export const NOVA_R = 5.5;
const PLAZA_Y = 1.2;
const PLAZA_R = 11;
export const NOVA_CENTRE: Vec3 = [0, G + PLAZA_Y + 3.5 + NOVA_R, 0];
/** How far the conduits run out from the core. */
export const NOVA_REACH = 46;

export const NOVA_CORES = [
  'Icosa',
  'Armillary',
  'Vortex',
  'Helix',
  'Platonic nest',
  'Star tetra',
  'Crystal',
  'Satellites',
];

/** Each core's rule, in a line: the spec carries the same words. */
export const NOVA_RULES = [
  'An icosahedron blown out to the sphere, each edge cut in two (a frequency-two geodesic lattice), a small icosahedron φ² smaller turning the other way inside.',
  'Five rings of radius R·φ^(−k/4), each tilted k·36° and turning round the vertical, by turns one way and the other, round a still equator.',
  'A torus, its tube R/φ² round, wound by one line eight times round the tube for every three times round the ring (a (3, 8) torus knot), a beam of light up its axis.',
  'Two helices R/φ out, 2R tall, three turns, half a turn apart, a rung every twelfth of a turn, rings closing the top and the foot.',
  'A sphere (three great circles), the octahedron in it (corners on the sphere) and the cube in that (corners on the octahedron’s faces, R/3 out), the octahedron and the cube turning opposite ways.',
  'Two tetrahedra through each other on a cube’s alternate corners, its long diagonal upright, turning opposite ways, a ring of light round its waist.',
  'Seven hexagonal crystals out from the centre on the golden-angle spiral, each φ^(1/3) shorter than the last, pointed at both ends.',
  'A small lattice orb R/φ across, twelve satellites on a ring of radius R tilted 1/φ² and eight on one tilted the other way, turning opposite ways, each tied to its neighbours.',
];

/** How many conduits each core sends out: its own symmetry. */
const CONDUITS = [12, 10, 8, 6, 8, 6, 7, 12];

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Turn q round the x axis by a, then round the vertical by b. */
const tilt = (q: Vec3, a: number, b = 0): Vec3 => {
  const y = q[1] * Math.cos(a) - q[2] * Math.sin(a);
  const z = q[1] * Math.sin(a) + q[2] * Math.cos(a);
  return [q[0] * Math.cos(b) - z * Math.sin(b), y, q[0] * Math.sin(b) + z * Math.cos(b)];
};

/** A ring of radius r tilted a round x then b round the vertical, round the core's centre. */
function ring(m: Mesh, r: number, a: number, b: number, o: Opts, n = 48) {
  m.poly(
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * TAU;
      return add(NOVA_CENTRE, tilt([Math.cos(t) * r, 0, Math.sin(t) * r], a, b));
    }),
    true,
    edge,
    o,
  );
}
/** An edge between two points (offsets from the centre), with nodes of light at its ends. */
function strut(m: Mesh, a: Vec3, b: Vec3, o: Opts, node = 0.16) {
  m.line(add(NOVA_CENTRE, a), add(NOVA_CENTRE, b), edge, o);
  if (node > 0) {
    m.dot(add(NOVA_CENTRE, a), node, light, { ...o, w: 0.3 });
    m.dot(add(NOVA_CENTRE, b), node, light, { ...o, w: 0.3 });
  }
}

const ICO: Vec3[] = (() => {
  const t = PHI;
  const v: Vec3[] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  return v.map(norm);
})();
/** The icosahedron's thirty edges: corners at the shortest distance apart. */
const ICO_EDGES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++) {
      const a = ICO[i] as Vec3;
      const b = ICO[j] as Vec3;
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1.1) out.push([i, j]);
    }
  return out;
})();

const B = { anim: Anim.breathe, w: 1.1 };
const R = NOVA_R;

const CORES: ((m: Mesh) => void)[] = [
  // Icosa
  (m) => {
    for (const [i, j] of ICO_EDGES) {
      const a = ICO[i] as Vec3;
      const b = ICO[j] as Vec3;
      const mid = norm(add(a, b));
      const s = (q: Vec3, k: number): Vec3 => [q[0] * k, q[1] * k, q[2] * k];
      strut(m, s(a, R), s(mid, R), B, 0.2);
      strut(m, s(mid, R), s(b, R), B, 0.12);
      const r = R / PHI ** 2;
      strut(m, s(a, r), s(b, r), { anim: Anim.orbit, key: -0.06, w: 0.8 }, 0.1);
    }
  },
  // Armillary
  (m) => {
    for (let k = 0; k < 5; k++)
      ring(m, R * PHI ** (-k / 4), (k * Math.PI) / 5, k * 0.7, {
        anim: Anim.orbit,
        key: (k % 2 ? -1 : 1) * (0.03 + 0.015 * k),
        w: 1.2,
      });
    ring(m, R * 1.08, 0, 0, { w: 0.8 }, 64);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      m.dot(add(NOVA_CENTRE, [Math.cos(a) * R * 1.08, 0, Math.sin(a) * R * 1.08]), 0.18, light, {
        w: 0.3,
      });
    }
  },
  // Vortex
  (m) => {
    const r = R / PHI ** 2;
    const Rm = R - r;
    const n = 480;
    const pts = Array.from({ length: n }, (_, i) => {
      const s = (i / n) * TAU;
      const th = 3 * s;
      const ph = 8 * s;
      const rr = Rm + r * Math.cos(ph);
      return add(NOVA_CENTRE, [Math.cos(th) * rr, r * Math.sin(ph) * 1.6, Math.sin(th) * rr]);
    });
    m.poly(pts, true, edge, B);
    ring(m, Rm, 0, 0, { ...B, w: 0.6 });
    m.line(add(NOVA_CENTRE, [0, -R, 0]), add(NOVA_CENTRE, [0, R * 1.6, 0]), light, {
      anim: Anim.flow,
      key: 2.5,
      w: 0.9,
    });
  },
  // Helix
  (m) => {
    const r = R / PHI;
    const o = { anim: Anim.orbit, key: 0.05, w: 1.2 };
    const at = (s: number, half: number): Vec3 => {
      const a = s * 3 * TAU + half * Math.PI;
      return [Math.cos(a) * r, -R + s * 2 * R, Math.sin(a) * r];
    };
    for (const half of [0, 1])
      m.poly(
        Array.from({ length: 97 }, (_, i) => add(NOVA_CENTRE, at(i / 96, half))),
        false,
        edge,
        o,
      );
    for (let i = 0; i <= 36; i++) strut(m, at(i / 36, 0), at(i / 36, 1), { ...o, w: 0.35 }, 0.12);
    ring(m, r * 1.2, 0, 0, { w: 1 }, 32);
    for (const y of [-R, R])
      m.poly(
        Array.from({ length: 32 }, (_, i) =>
          add(NOVA_CENTRE, [
            Math.cos((i / 32) * TAU) * r * 1.2,
            y,
            Math.sin((i / 32) * TAU) * r * 1.2,
          ]),
        ),
        true,
        edge,
        { w: 1 },
      );
  },
  // Platonic nest
  (m) => {
    for (const [a, b] of [
      [0, 0],
      [Math.PI / 2, 0],
      [Math.PI / 2, Math.PI / 2],
    ] as [number, number][])
      ring(m, R, a, b, B);
    const O: Vec3[] = [
      [R, 0, 0],
      [-R, 0, 0],
      [0, R, 0],
      [0, -R, 0],
      [0, 0, R],
      [0, 0, -R],
    ];
    const oo = { anim: Anim.orbit, key: 0.04, w: 1.1 };
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++)
        if (Math.floor(i / 2) !== Math.floor(j / 2)) strut(m, O[i] as Vec3, O[j] as Vec3, oo, 0.2);
    const c = R / 3;
    const oc = { anim: Anim.orbit, key: -0.07, w: 1 };
    for (let i = 0; i < 8; i++)
      for (const bit of [1, 2, 4]) {
        const j = i ^ bit;
        if (j < i) continue;
        const v = (k: number): Vec3 => [k & 1 ? c : -c, k & 2 ? c : -c, k & 4 ? c : -c];
        strut(m, v(i), v(j), oc, 0.14);
      }
  },
  // Star tetra
  (m) => {
    // Turn the cube's long diagonal (1, 1, 1) upright.
    const up = norm([1, 1, 1]);
    const ax = norm([1, -1, 0]);
    const az: Vec3 = [
      up[1] * ax[2] - up[2] * ax[1],
      up[2] * ax[0] - up[0] * ax[2],
      up[0] * ax[1] - up[1] * ax[0],
    ];
    const a = R / Math.sqrt(3);
    const v = (k: number): Vec3 => {
      const q: Vec3 = [k & 1 ? a : -a, k & 2 ? a : -a, k & 4 ? a : -a];
      return [
        q[0] * ax[0] + q[1] * ax[1] + q[2] * ax[2],
        q[0] * up[0] + q[1] * up[1] + q[2] * up[2],
        q[0] * az[0] + q[1] * az[1] + q[2] * az[2],
      ];
    };
    const even = [0, 3, 5, 6];
    const odd = [1, 2, 4, 7];
    for (const [set, key] of [
      [even, 0.04],
      [odd, -0.04],
    ] as [number[], number][])
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++)
          strut(
            m,
            v(set[i] as number),
            v(set[j] as number),
            { anim: Anim.orbit, key, w: 1.2 },
            0.22,
          );
    ring(m, R * 0.62, 0, 0, { ...B, w: 1 }, 40);
  },
  // Crystal
  (m) => {
    for (let k = 0; k < 7; k++) {
      const d = k === 0 ? ([0, 1, 0] as Vec3) : norm(fibonacciSphere(k * 3 + 1, 26));
      const dir: Vec3 = k === 0 ? d : norm([d[0], Math.abs(d[1]) * 0.6 + 0.1, d[2]]);
      const L = R * 1.2 * PHI ** (-k / 3);
      const w = 0.55 * PHI ** (-k / 6);
      const ref: Vec3 = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = norm([
        dir[1] * ref[2] - dir[2] * ref[1],
        dir[2] * ref[0] - dir[0] * ref[2],
        dir[0] * ref[1] - dir[1] * ref[0],
      ]);
      const v: Vec3 = [
        dir[1] * u[2] - dir[2] * u[1],
        dir[2] * u[0] - dir[0] * u[2],
        dir[0] * u[1] - dir[1] * u[0],
      ];
      const hex = (s: number) =>
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * TAU + k * GOLDEN_ANGLE;
          return add(
            add([dir[0] * s, dir[1] * s, dir[2] * s], u, Math.cos(a) * w),
            v,
            Math.sin(a) * w,
          );
        });
      const lo = hex(-L * 0.25);
      const hi = hex(L * 0.75);
      const tipA: Vec3 = [dir[0] * L, dir[1] * L, dir[2] * L];
      const tipB: Vec3 = [-dir[0] * L * 0.45, -dir[1] * L * 0.45, -dir[2] * L * 0.45];
      for (let i = 0; i < 6; i++) {
        strut(m, lo[i] as Vec3, hi[i] as Vec3, B, 0);
        strut(m, hi[i] as Vec3, tipA, B, 0);
        strut(m, lo[i] as Vec3, tipB, B, 0);
        strut(m, hi[i] as Vec3, hi[(i + 1) % 6] as Vec3, { ...B, w: 0.5 }, 0);
      }
      m.dot(add(NOVA_CENTRE, tipA), 0.3, light, { ...B, w: 0.4 });
    }
  },
  // Satellites
  (m) => {
    for (const [a, b] of [
      [0, 0],
      [Math.PI / 2, 0],
      [Math.PI / 2, Math.PI / 2],
    ] as [number, number][])
      ring(m, R / PHI, a, b, B, 32);
    for (const [n, tiltA, key] of [
      [12, 1 / PHI ** 2, 0.06],
      [8, -1 / PHI ** 2, -0.045],
    ] as [number, number, number][]) {
      const o = { anim: Anim.orbit, key, w: 0.9 };
      const pts = Array.from({ length: n }, (_, i) => {
        const t = (i / n) * TAU;
        return tilt(
          [Math.cos(t) * R * (n === 12 ? 1 : 0.82), 0, Math.sin(t) * R * (n === 12 ? 1 : 0.82)],
          tiltA,
        );
      });
      for (let i = 0; i < n; i++) {
        strut(m, pts[i] as Vec3, pts[(i + 1) % n] as Vec3, o, 0);
        m.line(add(NOVA_CENTRE, pts[i] as Vec3), add(NOVA_CENTRE, [0, 0, 0]), light, {
          ...o,
          anim: Anim.orbit,
          w: 0.15,
        });
        m.dot(add(NOVA_CENTRE, pts[i] as Vec3), 0.5, light, { ...o, w: 0.6 });
      }
    }
  },
];

/** The plaza under every core: florets on the golden angle, a basin of light, conduits out. */
function plazaAndConduits(m: Mesh, kind: number) {
  m.centre = [0, G - 10, 0];
  const N = 377;
  for (let n = 0; n < N; n++) {
    const r = 2.6 + (PLAZA_R - 2.8) * Math.sqrt((n + 0.5) / N);
    m.dot(
      [Math.cos(n * GOLDEN_ANGLE) * r, G + PLAZA_Y + 0.08, Math.sin(n * GOLDEN_ANGLE) * r],
      0.18,
      n % 4 ? plant : light,
      { w: 0.08 },
    );
  }
  m.cylinder([0, 0, 0], PLAZA_R, G, G + PLAZA_Y, face, edge, 0, 64);
  m.disc([0, G + PLAZA_Y, 0], PLAZA_R, ground, 2.4, { w: 0.2 });
  m.disc([0, G + PLAZA_Y + 0.02, 0], 2.4, water, 0, { w: 0.6 });
  m.ring([0, G + PLAZA_Y + 0.05, 0], 2.4, light, { w: 1.2 }, 32);
  // A beam of light rising from the basin to the core.
  m.line([0, G + PLAZA_Y, 0], add(NOVA_CENTRE, [0, -NOVA_R * 0.4, 0]), light, {
    anim: Anim.flow,
    key: 1.5,
    w: 0.7,
  });
  const n = CONDUITS[kind] ?? 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + Math.PI / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const at = (r: number, side: number, y = 0.06): Vec3 => [
      c * r - s * side,
      G + y,
      s * r + c * side,
    ];
    for (const side of [-0.45, 0.45])
      m.line(at(PLAZA_R, side), at(NOVA_REACH, side), road, { w: 0.22 });
    // Energy running out along the conduit, slowly.
    m.line(at(PLAZA_R - 6, 0, PLAZA_Y + 0.1), at(PLAZA_R, 0, 0.1), light, {
      anim: Anim.flow,
      key: 2.4,
      w: 0.5,
    });
    m.line(at(PLAZA_R, 0, 0.1), at(NOVA_REACH, 0, 0.1), light, {
      anim: Anim.flow,
      key: 3.2,
      w: 0.45,
    });
    for (let j = 1; j <= 4; j++) {
      const r = PLAZA_R + ((NOVA_REACH - PLAZA_R) * j) / 5;
      m.line(at(r, 0), at(r, 0, 1.2), edge, { w: 0.4 });
      m.dot(at(r, 0, 1.3), 0.22, light, { anim: Anim.pulse, key: k + j, w: 0.25 });
    }
  }
  m.ring([0, G + 0.06, 0], NOVA_REACH * 0.62, road, { w: 0.25 }, 96);
}

/**
 * Nova Core `kind` (0..7, NOVA_CORES), built into `m`: its plaza, its conduits and the core.
 * At the origin and full size it breathes and turns round its own centre (the mesh's pivot);
 * placed elsewhere (`at` a point on the ground, `s` its size) it is drawn still, as a mesh can
 * turn round one pivot only, so a game that sets several turns them itself round
 * `at + (NOVA_CENTRE − ground) · s`.
 */
export function novaCore(kind: number, m: Mesh = new Mesh(), at?: Vec3, s = 1): Mesh {
  const k = ((Math.floor(kind) % CORES.length) + CORES.length) % CORES.length;
  const home = !at || (at[0] === 0 && at[1] === G && at[2] === 0 && s === 1);
  const into = home ? m : new Placed(m, at as Vec3, s);
  plazaAndConduits(into, k);
  into.pivot = NOVA_CENTRE;
  into.centre = NOVA_CENTRE;
  (CORES[k] as (m: Mesh) => void)(into);
  into.dot(NOVA_CENTRE, 1, light, { anim: Anim.pulse, key: k, w: 1.2 });
  // Motes rising from the plaza toward the core.
  for (let j = 0; j < 24; j++) {
    const a = j * GOLDEN_ANGLE;
    const r = PLAZA_R * 0.8 * Math.sqrt((j + 0.5) / 24);
    into.dot([Math.cos(a) * r, G + PLAZA_Y + 0.3, Math.sin(a) * r], 0.25, light, {
      anim: Anim.rise,
      key: 8,
      w: 0.4,
    });
  }
  if (home) m.pivot = NOVA_CENTRE;
  return m;
}
