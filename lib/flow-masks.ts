/*
 * FLOW MASKS — ten masks made of a flowing golden current, asked for
 * 2026-10-13: "that liquid chaos in gold on the piano looks like an African
 * mask: two big eyes and a mouth, and what could be horns, hair, antennae, all
 * in flow and movement. Make 10 such masks on a slider, with mouths as an O or
 * different shapes, round eyes, or more skull-like shapes."
 *
 * A mask is SOLIDS (the face, horns, hair, antennae) minus HOLES (eyes,
 * mouth, nose, the gaps between teeth). The renderer fills the solids with
 * dots carried by the Liquid Chaos current; a dot that drifts into a hole or
 * out of the mask is born again inside it, so the eyes and mouth stay as dark
 * openings in moving gold, and their rims catch the light. Each shape is a
 * function of time: mouths open and close, horns sway, hair flows.
 *
 * Units: the mask fits in −1 … 1, y up. Pure: no canvas.
 */

/** An ellipse, a capsule (a thick segment), or a box. */
export type Prim =
  | { k: 'e'; x: number; y: number; rx: number; ry: number }
  | { k: 'c'; ax: number; ay: number; bx: number; by: number; r: number }
  | { k: 'b'; x: number; y: number; hw: number; hh: number };

export type Mask = { solids: Prim[]; holes: Prim[] };

/** How far inside a prim a point is: below 1 inside, 1 on the edge, above outside. */
export function level(p: Prim, x: number, y: number): number {
  if (p.k === 'e') {
    const dx = (x - p.x) / p.rx;
    const dy = (y - p.y) / p.ry;
    return Math.sqrt(dx * dx + dy * dy);
  }
  if (p.k === 'b') return Math.max(Math.abs(x - p.x) / p.hw, Math.abs(y - p.y) / p.hh);
  const vx = p.bx - p.ax;
  const vy = p.by - p.ay;
  const l2 = vx * vx + vy * vy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - p.ax) * vx + (y - p.ay) * vy) / l2));
  return Math.hypot(x - p.ax - vx * t, y - p.ay - vy * t) / p.r;
}

/** Inside the mask (in a solid, not in a hole)? And how close to a rim, 0 … 1. */
export function inside(m: Mask, x: number, y: number): { in: boolean; rim: number } {
  let solid = Number.POSITIVE_INFINITY;
  for (const p of m.solids) solid = Math.min(solid, level(p, x, y));
  let hole = Number.POSITIVE_INFINITY;
  for (const p of m.holes) hole = Math.min(hole, level(p, x, y));
  const isIn = solid < 1 && hole > 1;
  // The rim: just outside a hole, or just inside the outer edge.
  const rim = Math.max(
    isIn ? Math.max(0, 1 - (hole - 1) / 0.22) : 0,
    isIn ? Math.max(0, (solid - 0.86) / 0.14) : 0,
  );
  return { in: isIn, rim: Math.min(1, rim) };
}

const e = (x: number, y: number, rx: number, ry = rx): Prim => ({ k: 'e', x, y, rx, ry });
const c = (ax: number, ay: number, bx: number, by: number, r: number): Prim => ({
  k: 'c',
  ax,
  ay,
  bx,
  by,
  r,
});
const b = (x: number, y: number, hw: number, hh: number): Prim => ({ k: 'b', x, y, hw, hh });

/** A curling horn from (x, y), as a chain of capsules thinning to its tip. */
function horn(
  out: Prim[],
  x: number,
  y: number,
  side: number,
  len: number,
  curl: number,
  sway: number,
) {
  let px = x;
  let py = y;
  let a = Math.PI / 2 - side * 0.5;
  const n = 7;
  for (let i = 0; i < n; i++) {
    a += side * curl + sway * 0.04;
    const nx = px + Math.cos(a) * (len / n);
    const ny = py + Math.sin(a) * (len / n);
    out.push(c(px, py, nx, ny, 0.07 * (1 - i / n) + 0.015));
    px = nx;
    py = ny;
  }
}

/** Strands of flowing hair from a line of roots, waving. */
function hair(out: Prim[], roots: [number, number][], dx: number, dy: number, t: number) {
  roots.forEach(([x, y], i) => {
    const w = Math.sin(t * 1.3 + i * 0.9) * 0.06;
    out.push(c(x, y, x + dx * 0.5 + w, y + dy * 0.5, 0.035));
    out.push(c(x + dx * 0.5 + w, y + dy * 0.5, x + dx - w, y + dy, 0.025));
  });
}

export const MASK_NAMES = [
  'Horned moon',
  'Long ancestor',
  'Skull',
  'Antennae spirit',
  'Sun mask',
  'Antelope',
  'Heart face',
  'Striped spirit',
  'Horned skull',
  'Flowing-hair spirit',
] as const;

const masks: ((t: number) => Mask)[] = [
  // 1. A round face, two big round eyes, an O mouth, two horns curling up.
  (t) => {
    const solids = [e(0, -0.05, 0.55, 0.62)];
    horn(solids, -0.32, 0.42, -1, 0.75, 0.16, Math.sin(t));
    horn(solids, 0.32, 0.42, 1, 0.75, 0.16, Math.sin(t + 1));
    const o = 0.1 + 0.03 * Math.sin(t * 1.4);
    return { solids, holes: [e(-0.22, 0.12, 0.13), e(0.22, 0.12, 0.13), e(0, -0.36, o, o * 1.1)] };
  },
  // 2. A long oval ancestor: high crest, arched brows over round eyes, a small O.
  (t) => {
    const solids = [e(0, -0.08, 0.38, 0.82), c(0, 0.7, 0, 0.95, 0.12)];
    const o = 0.06 + 0.02 * Math.sin(t * 1.2);
    return {
      solids,
      holes: [
        e(-0.16, 0.2, 0.1, 0.11),
        e(0.16, 0.2, 0.1, 0.11),
        c(-0.26, 0.36, -0.06, 0.38, 0.018),
        c(0.06, 0.38, 0.26, 0.36, 0.018),
        e(0, -0.5, o, o * 1.3),
      ],
    };
  },
  // 3. A skull: the cranium, great round sockets, the nose, a row of teeth.
  (t) => {
    const solids = [e(0, 0.12, 0.6, 0.6), b(0, -0.42, 0.34, 0.2)];
    const jaw = 0.02 * Math.sin(t * 1.6);
    const holes: Prim[] = [
      e(-0.23, 0.08, 0.17, 0.18),
      e(0.23, 0.08, 0.17, 0.18),
      e(0, -0.16, 0.06, 0.09),
    ];
    for (let i = -3; i <= 3; i++) holes.push(b(i * 0.09, -0.42 - jaw, 0.018, 0.1));
    holes.push(b(0, -0.38 - jaw, 0.3, 0.012));
    return { solids, holes };
  },
  // 4. A round spirit with antennae ending in balls, and a wide smiling mouth.
  (t) => {
    const solids = [e(0, -0.1, 0.55, 0.55)];
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 1.4 + s) * 0.08;
      solids.push(
        c(s * 0.18, 0.38, s * 0.32 + sw, 0.72, 0.03),
        c(s * 0.32 + sw, 0.72, s * 0.45 + sw, 0.86, 0.025),
        e(s * 0.47 + sw, 0.9, 0.08),
      );
    }
    return {
      solids,
      holes: [
        e(-0.2, 0.05, 0.14),
        e(0.2, 0.05, 0.14),
        e(0, -0.34, 0.26, 0.06 + 0.03 * Math.sin(t * 1.3)),
        e(0, -0.29, 0.22, 0.05),
      ],
    };
  },
  // 5. A sun mask: a round face crowned with flowing rays, an O mouth.
  (t) => {
    const solids = [e(0, 0, 0.48, 0.5)];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.05 * Math.sin(t + i);
      const len = 0.84 + 0.05 * Math.sin(t * 1.7 + i * 1.3);
      solids.push(
        c(Math.cos(a) * 0.4, Math.sin(a) * 0.42, Math.cos(a) * len, Math.sin(a) * len, 0.04),
      );
    }
    const o = 0.09 + 0.03 * Math.sin(t * 1.5);
    return { solids, holes: [e(-0.18, 0.1, 0.11), e(0.18, 0.1, 0.11), e(0, -0.24, o)] };
  },
  // 6. The antelope: a narrow face and two long thin horns sweeping up.
  (t) => {
    const solids = [e(0, -0.25, 0.32, 0.6)];
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 0.9 + s) * 0.04;
      solids.push(
        c(s * 0.12, 0.25, s * 0.2 + sw, 0.6, 0.05),
        c(s * 0.2 + sw, 0.6, s * 0.16 + sw * 2, 0.95, 0.025),
      );
    }
    return {
      solids,
      holes: [
        e(-0.13, -0.08, 0.09),
        e(0.13, -0.08, 0.09),
        e(0, -0.62, 0.07, 0.05 + 0.02 * Math.sin(t * 1.4)),
      ],
    };
  },
  // 7. A heart-shaped face: two lobes meeting at the chin, round eyes, a tiny mouth.
  (t) => {
    const solids = [
      e(-0.25, 0.15, 0.36, 0.42),
      e(0.25, 0.15, 0.36, 0.42),
      c(-0.38, 0.02, 0, -0.72, 0.18),
      c(0.38, 0.02, 0, -0.72, 0.18),
      e(0, -0.2, 0.42, 0.42),
    ];
    const o = 0.05 + 0.02 * Math.sin(t * 1.3);
    return { solids, holes: [e(-0.2, 0.06, 0.1), e(0.2, 0.06, 0.1), e(0, -0.4, o)] };
  },
  // 8. A striped spirit: a broad face carved with stripes, a jutting box mouth.
  (t) => {
    const solids = [e(0, 0, 0.52, 0.72), c(0, 0.62, 0, 0.92, 0.08)];
    const holes: Prim[] = [e(-0.2, 0.18, 0.12, 0.09), e(0.2, 0.18, 0.12, 0.09)];
    const shift = 0.02 * Math.sin(t);
    for (const y of [0.42, -0.04, -0.62]) holes.push(c(-0.4, y + shift, 0.4, y + shift, 0.022));
    holes.push(b(0, -0.32, 0.14, 0.05 + 0.025 * Math.sin(t * 1.4)));
    return { solids, holes };
  },
  // 9. A horned skull.
  (t) => {
    const solids = [e(0, 0.06, 0.55, 0.56), b(0, -0.44, 0.3, 0.17)];
    horn(solids, -0.4, 0.3, -1, 0.7, 0.22, Math.sin(t * 0.8));
    horn(solids, 0.4, 0.3, 1, 0.7, 0.22, Math.sin(t * 0.8 + 1));
    const holes: Prim[] = [
      e(-0.21, 0.02, 0.16, 0.17),
      e(0.21, 0.02, 0.16, 0.17),
      e(0, -0.2, 0.05, 0.08),
    ];
    for (let i = -2; i <= 2; i++)
      holes.push(b(i * 0.1, -0.45, 0.02, 0.09 + 0.02 * Math.sin(t * 1.5)));
    return { solids, holes };
  },
  // 10. A spirit with long flowing hair and a wide-open crying mouth.
  (t) => {
    const solids = [e(0, 0.1, 0.42, 0.55)];
    const roots: [number, number][] = [];
    for (let i = 0; i < 9; i++) roots.push([-0.36 + i * 0.09, 0.56 - Math.abs(i - 4) * 0.03]);
    hair(solids, roots.slice(0, 4), -0.25, -0.95, t);
    hair(solids, roots.slice(5), 0.25, -0.95, t + 2);
    solids.push(c(-0.38, 0.4, -0.55, -0.6, 0.04), c(0.38, 0.4, 0.55, -0.6, 0.04));
    const o = 0.12 + 0.04 * Math.sin(t * 1.1);
    return {
      solids,
      holes: [e(-0.16, 0.2, 0.11, 0.13), e(0.16, 0.2, 0.11, 0.13), e(0, -0.18, 0.09, o)],
    };
  },
];

export function mask(index: number, t: number): Mask {
  const f = masks[Math.max(0, Math.min(masks.length - 1, index))] as (t: number) => Mask;
  return f(t);
}
