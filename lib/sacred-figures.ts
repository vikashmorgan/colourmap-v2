/*
 * SACRED FIGURES AND SACRED DANCERS — figures of light drawn in thousands of
 * dots, asked for 2026-10-13:
 *
 *   "a series of 10 sacred figures inspired by holy Indian and Tibetan poses of
 *    the gods, like the one with many arms meditating, or Shiva Nataraja … one
 *    preset, the 10 chosen on a slider like the Dot Walker."
 *   "like the Dot Walker but more enriched, inspired by the quantum liquids:
 *    more dots, more substance, that liquid movement like a dance. A figure
 *    dancing with the motion. Do 5 of them."
 *
 * A figure is a list of SHAPES in a unit frame (y up, about −0.9 … 0.9):
 * BONES (a capsule from a to b, its radius going from ra to rb), DISCS (filled)
 * and RINGS (a halo, an aureole, a discus). Each is a function of time, so the
 * figures breathe, sway, and the dancers dance. Dots are scattered over the
 * shapes once (`sampleDots`), each keeping its shape and its place on it, and
 * every frame they are placed again on the moving shapes (`dotAt`); the
 * renderer adds the liquid (dots easing after their place, a wave of light).
 *
 * Pure: no canvas.
 */

export type Shape =
  | { k: 'bone'; ax: number; ay: number; bx: number; by: number; ra: number; rb: number }
  | { k: 'disc'; x: number; y: number; r: number }
  | { k: 'ring'; x: number; y: number; r: number; w: number };

type Out = Shape[];
const TAU = Math.PI * 2;

const bone = (o: Out, ax: number, ay: number, bx: number, by: number, ra: number, rb = ra) =>
  o.push({ k: 'bone', ax, ay, bx, by, ra, rb });
const disc = (o: Out, x: number, y: number, r: number) => o.push({ k: 'disc', x, y, r });
const ring = (o: Out, x: number, y: number, r: number, w: number) =>
  o.push({ k: 'ring', x, y, r, w });
/** A limb through its joints: shoulder → elbow → hand, hip → knee → foot. */
const limb = (o: Out, pts: [number, number][], r0: number, r1: number) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i] as [number, number], pts[i + 1] as [number, number]];
    const f0 = i / (pts.length - 1);
    const f1 = (i + 1) / (pts.length - 1);
    bone(o, a[0], a[1], b[0], b[1], r0 + (r1 - r0) * f0, r0 + (r1 - r0) * f1);
  }
};

/* ── shared bodies ─────────────────────────────────────────── */

/** A body seated in lotus: torso, neck, head, crossed legs. Returns the shoulders. */
function lotusBody(
  o: Out,
  t: number,
  head = 0.12,
): { sl: [number, number]; sr: [number, number]; hy: number } {
  const b = Math.sin(t * 0.9) * 0.012; // the breath
  bone(o, 0, -0.36, 0, 0.06 + b, 0.17, 0.2);
  bone(o, -0.18, 0.15 + b, 0.18, 0.15 + b, 0.06);
  bone(o, 0, 0.12 + b, 0, 0.32 + b, 0.06);
  disc(o, 0, 0.45 + b, head);
  // Crossed legs, each foot resting on the other thigh.
  limb(
    o,
    [
      [-0.1, -0.38],
      [-0.44, -0.46],
      [0.14, -0.42],
    ],
    0.1,
    0.06,
  );
  limb(
    o,
    [
      [0.1, -0.38],
      [0.44, -0.46],
      [-0.14, -0.4],
    ],
    0.1,
    0.06,
  );
  return { sl: [-0.2, 0.17 + b], sr: [0.2, 0.17 + b], hy: 0.45 + b };
}

/** A lotus throne: petals along a shallow curve. */
function lotusSeat(o: Out, y: number, w = 0.55) {
  for (let i = -5; i <= 5; i++) {
    const x = (i / 5) * w;
    const lift = 0.05 * Math.cos((i / 5) * Math.PI * 0.5);
    bone(o, x * 0.9, y - 0.05, x, y + lift, 0.025, 0.06);
  }
  bone(o, -w * 0.9, y - 0.09, w * 0.9, y - 0.09, 0.025);
}

/** A standing body from its joints. */
type Pose = {
  head: [number, number];
  neck: [number, number];
  chest: [number, number];
  pelvis: [number, number];
  sl: [number, number];
  sr: [number, number];
  hl: [number, number];
  hr: [number, number];
  kl: [number, number];
  kr: [number, number];
  fl: [number, number];
  fr: [number, number];
};
function standingBody(o: Out, p: Pose, head = 0.11) {
  bone(o, p.pelvis[0], p.pelvis[1], p.chest[0], p.chest[1], 0.13, 0.17);
  bone(o, p.sl[0], p.sl[1], p.sr[0], p.sr[1], 0.055);
  bone(o, p.chest[0], p.chest[1], p.neck[0], p.neck[1], 0.055);
  disc(o, p.head[0], p.head[1], head);
  limb(o, [p.hl, p.kl, p.fl], 0.085, 0.05);
  limb(o, [p.hr, p.kr, p.fr], 0.085, 0.05);
}

/* ── the ten sacred figures ────────────────────────────────── */

export const FIGURE_NAMES = [
  'Buddha in meditation',
  'Thousand-armed Avalokiteshvara',
  'Shiva Nataraja',
  'Ganesha',
  'Green Tara',
  'Vishnu',
  'Durga',
  'Krishna with the flute',
  'Lakshmi on the lotus',
  'Shiva in meditation',
] as const;

const figures: ((t: number) => Out)[] = [
  // 1. The Buddha: lotus seat, hands in the lap (dhyana mudra), halo and aureole.
  (t) => {
    const o: Out = [];
    const { sl, sr, hy } = lotusBody(o, t);
    limb(o, [sl, [-0.3, -0.12], [-0.05, -0.27]], 0.06, 0.05);
    limb(o, [sr, [0.3, -0.12], [0.05, -0.27]], 0.06, 0.05);
    disc(o, 0, -0.27, 0.07);
    disc(o, 0, hy + 0.14, 0.05);
    ring(o, 0, hy, 0.25, 0.02);
    ring(o, 0, -0.02, 0.78 + 0.01 * Math.sin(t), 0.015);
    lotusSeat(o, -0.6);
    return o;
  },
  // 2. Avalokiteshvara of a thousand arms: hands joined at the heart, a fan of
  //    arms all round, a cascade of slow waves through them, heads stacked above.
  (t) => {
    const o: Out = [];
    const { sl, sr, hy } = lotusBody(o, t);
    limb(o, [sl, [-0.24, -0.02], [-0.02, 0.1]], 0.06, 0.05);
    limb(o, [sr, [0.24, -0.02], [0.02, 0.1]], 0.06, 0.05);
    const c: [number, number] = [0, 0.12];
    const n = 14;
    for (const side of [-1, 1]) {
      for (let k = 0; k < n; k++) {
        const base = (k / (n - 1)) * 2.6 - 1.1; // from below the shoulder, round over the head
        const a = Math.PI / 2 + side * (0.35 + base) + 0.06 * Math.sin(t * 1.2 - k * 0.45);
        const s: [number, number] = side < 0 ? sl : sr;
        const elbow: [number, number] = [
          c[0] + Math.cos(a - side * 0.12) * 0.38,
          c[1] + Math.sin(a - side * 0.12) * 0.38,
        ];
        const hand: [number, number] = [c[0] + Math.cos(a) * 0.66, c[1] + Math.sin(a) * 0.66];
        limb(o, [s, elbow, hand], 0.035, 0.025);
        disc(o, hand[0], hand[1], 0.035);
      }
    }
    // Eleven heads: a pyramid of smaller faces above the first.
    for (let row = 1; row <= 3; row++) {
      const count = 4 - row;
      for (let i = 0; i < count; i++)
        disc(o, (i - (count - 1) / 2) * 0.13, hy + row * 0.13, 0.065 - row * 0.008);
    }
    ring(o, 0, 0.12, 0.8, 0.02);
    lotusSeat(o, -0.6);
    return o;
  },
  // 3. Shiva Nataraja: dancing in a ring of fire, one leg raised across the
  //    body, four arms (drum, flame, blessing, pointing to the raised foot),
  //    his locks flying out on both sides, the dwarf of ignorance under his foot.
  (t) => {
    const o: Out = [];
    const sw = Math.sin(t * 1.3) * 0.04;
    const p: Pose = {
      head: [0.06, 0.48],
      neck: [0.05, 0.34],
      chest: [0.03, 0.16],
      pelvis: [0.02, -0.14],
      sl: [-0.16, 0.24],
      sr: [0.2, 0.26],
      hl: [-0.06, -0.17],
      hr: [0.08, -0.17],
      kl: [-0.32 + sw, -0.22 + sw * 0.5],
      kr: [0.16, -0.45],
      fl: [-0.52 + sw * 1.5, -0.36 + sw],
      fr: [0.08, -0.72],
    };
    standingBody(o, p);
    limb(o, [p.sr, [0.38, 0.32], [0.44, 0.5]], 0.05, 0.04); // the drum hand
    disc(o, 0.46, 0.56, 0.05);
    limb(o, [p.sl, [-0.4, 0.32], [-0.46, 0.5]], 0.05, 0.04); // the fire hand
    for (let i = 0; i < 4; i++)
      bone(o, -0.46, 0.5, -0.46 + (i - 1.5) * 0.04, 0.6 + 0.05 * Math.sin(t * 8 + i), 0.02, 0.006);
    limb(o, [p.sr, [0.3, 0.08], [0.33, 0.24]], 0.05, 0.04); // blessing
    limb(o, [p.sl, [-0.02, 0.1], [-0.3, -0.02]], 0.05, 0.04); // pointing to the raised foot
    // The locks fly out from behind the head, rising and falling in waves.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const y0 = 0.5 + (i - 1) * 0.06;
        const wave = Math.sin(t * 2 + i + side) * 0.04;
        limb(
          o,
          [
            [0.06 + side * 0.13, y0],
            [0.06 + side * 0.36, y0 + 0.08 + wave + i * 0.03],
            [0.06 + side * 0.58, y0 + 0.02 - wave + i * 0.05],
          ],
          0.012,
          0.005,
        );
      }
    }
    disc(o, 0.06, -0.8, 0.08);
    bone(o, -0.12, -0.82, 0.24, -0.82, 0.04);
    // The ring of fire, flames licking outward.
    ring(o, 0, 0.02, 0.82, 0.02);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const len = 0.07 + 0.03 * Math.sin(t * 7 + i * 1.9);
      bone(
        o,
        Math.cos(a) * 0.82,
        0.02 + Math.sin(a) * 0.82,
        Math.cos(a) * (0.82 + len),
        0.02 + Math.sin(a) * (0.82 + len),
        0.02,
        0.004,
      );
    }
    return o;
  },
  // 4. Ganesha: the elephant head and its trunk, fanned ears, a round belly,
  //    four arms, seated at ease with one leg down.
  (t) => {
    const o: Out = [];
    const flap = Math.sin(t * 1.6) * 0.02;
    bone(o, 0, -0.3, 0, 0.18, 0.18, 0.2);
    disc(o, 0, -0.12, 0.25);
    disc(o, 0, 0.42, 0.17);
    disc(o, -0.24 - flap, 0.44, 0.13);
    disc(o, 0.24 + flap, 0.44, 0.13);
    const sw = Math.sin(t * 1.1) * 0.03;
    limb(
      o,
      [
        [0, 0.36],
        [0.02, 0.2],
        [0.1 + sw, 0.08],
        [0.06 + sw, 0.0],
      ],
      0.05,
      0.025,
    );
    bone(o, 0.07, 0.33, 0.13, 0.27, 0.015, 0.006);
    for (let i = -2; i <= 2; i++)
      bone(o, i * 0.05, 0.57, i * 0.04, 0.68 - Math.abs(i) * 0.03, 0.02, 0.006);
    for (const side of [-1, 1]) {
      limb(
        o,
        [
          [side * 0.22, 0.16],
          [side * 0.42, 0.28],
          [side * 0.45, 0.45],
        ],
        0.055,
        0.045,
      );
      limb(
        o,
        [
          [side * 0.22, 0.14],
          [side * 0.38, -0.02],
          [side * 0.22, -0.08],
        ],
        0.055,
        0.045,
      );
    }
    bone(o, -0.45, 0.45, -0.45, 0.62, 0.012); // the axe
    bone(o, -0.5, 0.6, -0.4, 0.6, 0.03);
    disc(o, 0.22, -0.08, 0.05); // the sweet
    limb(
      o,
      [
        [-0.1, -0.36],
        [-0.42, -0.42],
        [-0.04, -0.44],
      ],
      0.1,
      0.06,
    );
    limb(
      o,
      [
        [0.1, -0.36],
        [0.36, -0.44],
        [0.4, -0.74],
      ],
      0.1,
      0.06,
    );
    ring(o, 0, 0.42, 0.33, 0.02);
    lotusSeat(o, -0.62);
    return o;
  },
  // 5. Green Tara: seated, the right leg stepping down ready to help, the right
  //    hand open in giving, the left at the heart holding a lotus by its stem.
  (t) => {
    const o: Out = [];
    const b = Math.sin(t * 0.9) * 0.012;
    bone(o, 0, -0.36, 0, 0.06 + b, 0.16, 0.19);
    bone(o, -0.18, 0.15 + b, 0.18, 0.15 + b, 0.055);
    bone(o, 0, 0.12 + b, 0, 0.32 + b, 0.055);
    disc(o, 0, 0.45 + b, 0.11);
    limb(
      o,
      [
        [-0.1, -0.38],
        [-0.42, -0.46],
        [0.1, -0.42],
      ],
      0.09,
      0.055,
    );
    limb(
      o,
      [
        [0.1, -0.38],
        [0.36, -0.46],
        [0.42, -0.76],
      ],
      0.09,
      0.05,
    );
    disc(o, 0.42, -0.8, 0.06);
    limb(
      o,
      [
        [0.2, 0.17 + b],
        [0.32, -0.08],
        [0.4, -0.3],
      ],
      0.05,
      0.045,
    );
    limb(
      o,
      [
        [-0.2, 0.17 + b],
        [-0.3, -0.02],
        [-0.1, 0.08],
      ],
      0.05,
      0.045,
    );
    limb(
      o,
      [
        [-0.1, 0.08],
        [-0.28, 0.3],
        [-0.36, 0.48 + 0.01 * Math.sin(t * 1.4)],
      ],
      0.01,
      0.008,
    );
    disc(o, -0.36, 0.5, 0.06);
    for (let i = -2; i <= 2; i++)
      bone(o, i * 0.05, 0.56 + b, i * 0.045, 0.66 + b - Math.abs(i) * 0.025, 0.018, 0.005);
    ring(o, 0, 0.45 + b, 0.24, 0.02);
    ring(o, 0, -0.02, 0.78, 0.015);
    lotusSeat(o, -0.6);
    return o;
  },
  // 6. Vishnu: standing straight, a tall crown, four arms: the spinning discus,
  //    the conch, a hand raised in protection, a hand resting on the mace.
  (t) => {
    const o: Out = [];
    const b = Math.sin(t * 0.8) * 0.01;
    const p: Pose = {
      head: [0, 0.48 + b],
      neck: [0, 0.34 + b],
      chest: [0, 0.16 + b],
      pelvis: [0, -0.16],
      sl: [-0.19, 0.25 + b],
      sr: [0.19, 0.25 + b],
      hl: [-0.08, -0.18],
      hr: [0.08, -0.18],
      kl: [-0.1, -0.48],
      kr: [0.1, -0.48],
      fl: [-0.11, -0.78],
      fr: [0.11, -0.78],
    };
    standingBody(o, p);
    bone(o, 0, 0.58 + b, 0, 0.8 + b, 0.07, 0.025);
    limb(o, [p.sr, [0.36, 0.32], [0.42, 0.46]], 0.05, 0.04);
    ring(o, 0.42, 0.55, 0.09 + 0.005 * Math.sin(t * 4), 0.022);
    limb(o, [p.sl, [-0.36, 0.32], [-0.42, 0.46]], 0.05, 0.04);
    disc(o, -0.42, 0.53, 0.06);
    limb(o, [p.sr, [0.3, 0.06], [0.3, 0.2]], 0.05, 0.04);
    limb(o, [p.sl, [-0.3, 0.02], [-0.34, -0.12]], 0.05, 0.04);
    bone(o, -0.34, -0.12, -0.34, -0.76, 0.018);
    disc(o, -0.34, -0.08, 0.06);
    ring(o, 0, 0.48 + b, 0.26, 0.02);
    ring(o, 0, 0, 0.86, 0.015);
    return o;
  },
  // 7. Durga: the warrior goddess, eight arms fanned out, each holding a
  //    weapon, in a lunging stance.
  (t) => {
    const o: Out = [];
    const p: Pose = {
      head: [0.02, 0.48],
      neck: [0.02, 0.34],
      chest: [0.02, 0.15],
      pelvis: [0, -0.16],
      sl: [-0.17, 0.24],
      sr: [0.2, 0.24],
      hl: [-0.07, -0.18],
      hr: [0.08, -0.18],
      kl: [-0.24, -0.46],
      kr: [0.32, -0.38],
      fl: [-0.38, -0.76],
      fr: [0.36, -0.76],
    };
    standingBody(o, p);
    for (let i = -2; i <= 2; i++)
      bone(o, 0.02 + i * 0.05, 0.57, 0.02 + i * 0.04, 0.7 - Math.abs(i) * 0.03, 0.02, 0.006);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 2 - side * (0.45 + k * 0.42) + 0.05 * Math.sin(t * 1.5 + k);
        const s: [number, number] = side < 0 ? p.sl : p.sr;
        const hand: [number, number] = [s[0] + Math.cos(a) * 0.48, s[1] + Math.sin(a) * 0.48];
        const elbow: [number, number] = [
          s[0] + Math.cos(a + side * 0.25) * 0.25,
          s[1] + Math.sin(a + side * 0.25) * 0.25,
        ];
        limb(o, [s, elbow, hand], 0.045, 0.035);
        // The weapon in each hand, pointing outward.
        bone(
          o,
          hand[0],
          hand[1],
          hand[0] + Math.cos(a) * 0.16,
          hand[1] + Math.sin(a) * 0.16,
          0.012,
          0.004,
        );
      }
    }
    // The trident, held upright.
    bone(o, 0.62, -0.7, 0.62, 0.62, 0.014);
    for (const dx of [-0.07, 0, 0.07])
      bone(o, 0.62 + dx, 0.56, 0.62 + dx * 1.2, 0.72 - Math.abs(dx), 0.014, 0.004);
    ring(o, 0.02, 0.48, 0.26, 0.02);
    ring(o, 0, 0.04, 0.86, 0.015);
    return o;
  },
  // 8. Krishna with the flute: standing in the three-bend S-curve, legs
  //    crossed at the ankle, the flute held across to the right, a peacock
  //    feather in his hair.
  (t) => {
    const o: Out = [];
    const sw = Math.sin(t * 0.9) * 0.02;
    const p: Pose = {
      head: [0.05 + sw, 0.47],
      neck: [0.02 + sw, 0.33],
      chest: [-0.02 + sw * 0.6, 0.16],
      pelvis: [0.06, -0.15],
      sl: [-0.2 + sw * 0.6, 0.24],
      sr: [0.16 + sw * 0.6, 0.25],
      hl: [0.0, -0.17],
      hr: [0.12, -0.17],
      kl: [0.14, -0.46],
      kr: [0.07, -0.47],
      fl: [0.19, -0.74],
      fr: [0.05, -0.77],
    };
    standingBody(o, p);
    limb(o, [p.sl, [-0.06, 0.18], [0.22, 0.38]], 0.045, 0.035);
    limb(o, [p.sr, [0.36, 0.22], [0.42, 0.36]], 0.045, 0.035);
    bone(o, 0.1, 0.42, 0.64, 0.34, 0.016);
    limb(
      o,
      [
        [0.09 + sw, 0.56],
        [0.15 + sw, 0.66],
        [0.18 + sw, 0.74],
      ],
      0.012,
      0.008,
    );
    disc(o, 0.19 + sw, 0.77, 0.035);
    ring(o, 0.05 + sw, 0.47, 0.24, 0.02);
    return o;
  },
  // 9. Lakshmi on the lotus: standing on a great lotus, two hands holding
  //    lotus flowers high, one giving (a stream of gold falls from it), one
  //    raised in blessing.
  (t) => {
    const o: Out = [];
    const b = Math.sin(t * 0.8) * 0.01;
    const p: Pose = {
      head: [0, 0.48 + b],
      neck: [0, 0.34 + b],
      chest: [0, 0.16 + b],
      pelvis: [0, -0.15],
      sl: [-0.18, 0.25 + b],
      sr: [0.18, 0.25 + b],
      hl: [-0.08, -0.17],
      hr: [0.08, -0.17],
      kl: [-0.08, -0.44],
      kr: [0.08, -0.44],
      fl: [-0.09, -0.66],
      fr: [0.09, -0.66],
    };
    standingBody(o, p);
    for (const side of [-1, 1]) {
      limb(o, [side < 0 ? p.sl : p.sr, [side * 0.36, 0.32], [side * 0.42, 0.46]], 0.045, 0.035);
      bone(o, side * 0.42, 0.46, side * 0.44, 0.56, 0.008);
      disc(o, side * 0.44, 0.6, 0.065);
    }
    limb(o, [p.sr, [0.3, 0.04], [0.34, -0.1]], 0.045, 0.035);
    // The falling gold: a thin stream that ripples as it falls.
    limb(
      o,
      [
        [0.34, -0.12],
        [0.36 + 0.02 * Math.sin(t * 3), -0.36],
        [0.35, -0.62],
      ],
      0.012,
      0.03,
    );
    limb(o, [p.sl, [-0.3, 0.06], [-0.3, 0.2]], 0.045, 0.035);
    for (let i = -2; i <= 2; i++)
      bone(o, i * 0.05, 0.57 + b, i * 0.04, 0.68 + b - Math.abs(i) * 0.025, 0.018, 0.005);
    ring(o, 0, 0.48 + b, 0.25, 0.02);
    lotusSeat(o, -0.72, 0.62);
    return o;
  },
  // 10. Shiva in meditation: lotus seat, hands on the knees, matted locks piled
  //     high with the crescent moon, the third eye, the snake at his neck, the
  //     Ganga falling from his hair, the trident standing by him.
  (t) => {
    const o: Out = [];
    const { sl, sr, hy } = lotusBody(o, t);
    limb(o, [sl, [-0.32, -0.08], [-0.38, -0.36]], 0.06, 0.05);
    limb(o, [sr, [0.32, -0.08], [0.38, -0.36]], 0.06, 0.05);
    for (let i = 0; i < 3; i++) disc(o, 0, hy + 0.12 + i * 0.07, 0.07 - i * 0.012);
    limb(
      o,
      [
        [-0.1, hy + 0.14],
        [-0.04, hy + 0.2],
        [0.06, hy + 0.21],
      ],
      0.012,
      0.006,
    );
    disc(o, 0, hy + 0.02, 0.012);
    limb(
      o,
      [
        [-0.12, 0.3],
        [0, 0.24],
        [0.12, 0.3],
        [0.16, 0.38],
      ],
      0.018,
      0.01,
    );
    const g = Math.sin(t * 2) * 0.02;
    limb(
      o,
      [
        [0.05, hy + 0.3],
        [0.2 + g, hy + 0.36],
        [0.32 - g, hy + 0.28],
        [0.36 + g, hy + 0.12],
      ],
      0.008,
      0.016,
    );
    bone(o, 0.6, -0.7, 0.6, 0.62, 0.014);
    for (const dx of [-0.07, 0, 0.07])
      bone(o, 0.6 + dx, 0.56, 0.6 + dx * 1.2, 0.72 - Math.abs(dx), 0.014, 0.004);
    disc(o, 0.6, 0.42, 0.04);
    ring(o, 0, hy, 0.26, 0.02);
    lotusSeat(o, -0.6);
    return o;
  },
];

export function figure(index: number, t: number): Shape[] {
  const f = figures[Math.max(0, Math.min(figures.length - 1, index))] as (t: number) => Out;
  return f(t);
}

/* ── the five sacred dancers ───────────────────────────────── */

export const DANCER_NAMES = [
  'Bharatanatyam',
  'Whirling dervish',
  'Tandava, the cosmic dance',
  'Cham, the Tibetan masked dance',
  'Odissi, the flowing goddess',
] as const;

/** A dancer's body and arms from its joints, with long flowing extras. */
function dancerBody(
  o: Out,
  p: Pose,
  el: [number, number],
  er: [number, number],
  wl: [number, number],
  wr: [number, number],
  head = 0.1,
) {
  standingBody(o, p, head);
  limb(o, [p.sl, el, wl], 0.05, 0.035);
  limb(o, [p.sr, er, wr], 0.05, 0.035);
}

const dancers: ((t: number) => Out)[] = [
  // 1. Bharatanatyam: the half-sitting stance, knees out in a diamond; the arms
  //    strike lines out and fold back to the chest in turn; the feet stamp the
  //    rhythm; the head slides from side to side.
  (t) => {
    const o: Out = [];
    const beat = t * 2.2;
    const step = Math.sin(beat);
    const stampL = Math.max(0, Math.sin(beat)) * 0.06;
    const stampR = Math.max(0, -Math.sin(beat)) * 0.06;
    const slide = Math.sin(beat * 2) * 0.04;
    const p: Pose = {
      head: [slide, 0.38],
      neck: [0, 0.25],
      chest: [0, 0.08],
      pelvis: [0, -0.26],
      sl: [-0.18, 0.16],
      sr: [0.18, 0.16],
      hl: [-0.08, -0.28],
      hr: [0.08, -0.28],
      kl: [-0.36, -0.44],
      kr: [0.36, -0.44],
      fl: [-0.2, -0.72 + stampL],
      fr: [0.2, -0.72 + stampR],
    };
    const out = 0.5 + 0.5 * step;
    const el: [number, number] = [-0.18 - 0.26 * out, 0.16 + 0.02 * out];
    const wl: [number, number] = [-0.18 - 0.52 * out, 0.16 + 0.1 * out - 0.05 * (1 - out)];
    const er: [number, number] = [0.18 + 0.26 * (1 - out), 0.16 + 0.02 * (1 - out)];
    const wr: [number, number] = [0.18 + 0.52 * (1 - out), 0.16 + 0.1 * (1 - out) - 0.05 * out];
    dancerBody(o, p, el, er, wl, wr);
    // The pleated fan between the knees.
    for (let i = -3; i <= 3; i++) bone(o, i * 0.03, -0.3, i * 0.08, -0.5, 0.012, 0.02);
    return o;
  },
  // 2. The whirling dervish: turning on the spot, the right palm raised to
  //    heaven, the left turned down to earth, the long skirt flaring into a bell.
  (t) => {
    const o: Out = [];
    const spin = t * 2.4;
    const c = Math.cos(spin);
    const p: Pose = {
      head: [0.03, 0.5],
      neck: [0.02, 0.37],
      chest: [0, 0.18],
      pelvis: [0, -0.12],
      sl: [-0.18 * c, 0.27],
      sr: [0.18 * c, 0.27],
      hl: [-0.06, -0.14],
      hr: [0.06, -0.14],
      kl: [-0.05, -0.42],
      kr: [0.05, -0.42],
      fl: [-0.05, -0.7],
      fr: [0.05, -0.7],
    };
    const el: [number, number] = [-0.4 * c, 0.24];
    const wl: [number, number] = [-0.62 * c, 0.12];
    const er: [number, number] = [0.38 * c, 0.42];
    const wr: [number, number] = [0.52 * c, 0.62];
    dancerBody(o, p, el, er, wl, wr);
    bone(o, 0.03, 0.58, 0.03, 0.76, 0.05, 0.045); // the tall hat
    // The skirt: a bell of folds, flaring and turning.
    const folds = 18;
    for (let i = 0; i < folds; i++) {
      const a = (i / folds) * TAU + spin;
      const hemX = Math.cos(a) * 0.56;
      const hemY = -0.62 + Math.sin(a) * 0.07 + 0.04 * Math.sin(spin * 2 + i);
      bone(o, Math.cos(a) * 0.1, -0.1, hemX, hemY, 0.012, 0.03);
    }
    return o;
  },
  // 3. Tandava: Shiva's cosmic dance in motion: leaps, the raised leg swinging
  //    across, four arms wheeling, the locks flying.
  (t) => {
    const o: Out = [];
    const beat = t * 1.8;
    const swing = Math.sin(beat);
    const leap = Math.max(0, Math.sin(beat * 2)) * 0.08;
    const p: Pose = {
      head: [0.04 + swing * 0.04, 0.48 + leap],
      neck: [0.04 + swing * 0.03, 0.34 + leap],
      chest: [0.02, 0.16 + leap],
      pelvis: [0, -0.14 + leap],
      sl: [-0.17, 0.24 + leap],
      sr: [0.19, 0.25 + leap],
      hl: [-0.07, -0.17 + leap],
      hr: [0.08, -0.17 + leap],
      kl: [-0.3 * swing, -0.24 + leap - 0.1 * (1 - Math.abs(swing))],
      kr: [0.16, -0.45 + leap],
      fl: [-0.52 * swing, -0.36 + leap + 0.08 * Math.abs(swing)],
      fr: [0.08, -0.72 + leap],
    };
    standingBody(o, p);
    for (let k = 0; k < 4; k++) {
      const side = k % 2 ? 1 : -1;
      const a = Math.PI / 2 - side * (0.6 + (k < 2 ? 0 : 0.9)) + 0.5 * Math.sin(beat + k * 1.4);
      const s = side < 0 ? p.sl : p.sr;
      const hand: [number, number] = [s[0] + Math.cos(a) * 0.46, s[1] + Math.sin(a) * 0.46];
      const elbow: [number, number] = [
        s[0] + Math.cos(a + side * 0.4) * 0.24,
        s[1] + Math.sin(a + side * 0.4) * 0.24,
      ];
      limb(o, [s, elbow, hand], 0.045, 0.035);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const y = p.head[1] + (i - 1.5) * 0.045;
        const wave = Math.sin(t * 3 + i + side) * 0.06;
        limb(
          o,
          [
            [p.head[0], y],
            [p.head[0] + side * 0.3, y + wave],
            [p.head[0] + side * 0.56, y - wave],
          ],
          0.016,
          0.006,
        );
      }
    }
    ring(o, 0, 0.02, 0.84, 0.015);
    return o;
  },
  // 4. Cham: the Tibetan masked dance: a great mask and crown, a wide heavy
  //    stance, a slow turn and stamp, the long sleeves sweeping in arcs.
  (t) => {
    const o: Out = [];
    const beat = t * 0.9;
    const turn = Math.sin(beat);
    const stamp = Math.max(0, Math.sin(beat * 2)) * 0.07;
    const p: Pose = {
      head: [turn * 0.04, 0.46],
      neck: [turn * 0.03, 0.32],
      chest: [turn * 0.02, 0.14],
      pelvis: [0, -0.18],
      sl: [-0.22, 0.22],
      sr: [0.22, 0.22],
      hl: [-0.1, -0.2],
      hr: [0.1, -0.2],
      kl: [-0.34, -0.42 + stamp],
      kr: [0.34, -0.44],
      fl: [-0.38, -0.72 + stamp],
      fr: [0.38, -0.74],
    };
    const el: [number, number] = [-0.44, 0.26 + 0.1 * turn];
    const wl: [number, number] = [-0.62, 0.18 + 0.2 * turn];
    const er: [number, number] = [0.44, 0.26 - 0.1 * turn];
    const wr: [number, number] = [0.62, 0.18 - 0.2 * turn];
    dancerBody(o, p, el, er, wl, wr, 0.16);
    // The crown of five skulls above the mask.
    for (let i = -2; i <= 2; i++)
      disc(o, p.head[0] + i * 0.07, p.head[1] + 0.18 - Math.abs(i) * 0.02, 0.035);
    // The long sleeves, sweeping down in waves.
    for (const [w, side] of [
      [wl, -1],
      [wr, 1],
    ] as const) {
      const sweep = Math.sin(t * 1.8 + side) * 0.08;
      limb(
        o,
        [
          w,
          [w[0] + side * 0.12, w[1] - 0.18 + sweep],
          [w[0] + side * 0.06, w[1] - 0.42 - sweep],
          [w[0] + side * 0.16, w[1] - 0.6],
        ],
        0.045,
        0.02,
      );
    }
    // The heavy brocade skirt.
    for (let i = -4; i <= 4; i++)
      bone(o, i * 0.03, -0.2, i * 0.09 + turn * 0.03, -0.66, 0.016, 0.03);
    return o;
  },
  // 5. Odissi: the flowing goddess: the three-bend S-curve swaying from hip to
  //    hip, the arms flowing in waves above the head and down, like water.
  (t) => {
    const o: Out = [];
    const beat = t * 1.2;
    const sway = Math.sin(beat) * 0.08;
    const p: Pose = {
      head: [-sway * 0.6, 0.47],
      neck: [-sway * 0.4, 0.33],
      chest: [-sway * 0.5, 0.15],
      pelvis: [sway, -0.15],
      sl: [-0.18 - sway * 0.5, 0.23],
      sr: [0.18 - sway * 0.5, 0.23],
      hl: [-0.07 + sway, -0.17],
      hr: [0.08 + sway, -0.17],
      kl: [-0.14 + sway * 0.6, -0.44],
      kr: [0.12 + sway * 0.6, -0.46],
      fl: [-0.12, -0.74],
      fr: [0.14, -0.74],
    };
    // The arms flow: each joint follows the one before a little later.
    const arm = (side: number, s: [number, number]) => {
      const pts: [number, number][] = [s];
      let a = Math.PI / 2 - side * 0.9;
      let x = s[0];
      let y = s[1];
      for (let k = 1; k <= 4; k++) {
        a += side * 0.35 * Math.sin(beat * 1.3 - k * 0.8 + side);
        x += Math.cos(a) * 0.13;
        y += Math.sin(a) * 0.13;
        pts.push([x, y]);
      }
      limb(o, pts, 0.045, 0.025);
    };
    standingBody(o, p);
    arm(-1, p.sl);
    arm(1, p.sr);
    for (let i = -3; i <= 3; i++)
      bone(o, sway + i * 0.025, -0.2, sway * 0.4 + i * 0.07, -0.6, 0.012, 0.022);
    return o;
  },
];

export function dancer(index: number, t: number): Shape[] {
  const f = dancers[Math.max(0, Math.min(dancers.length - 1, index))] as (t: number) => Out;
  return f(t);
}

/* ── dots on the shapes ────────────────────────────────────── */

/** A dot's place on its shape: which shape, along it (u) and across it (v, w). */
export type DotSeed = { shape: number; u: number; v: number; w: number; drift: number };

const area = (s: Shape) =>
  s.k === 'bone'
    ? Math.hypot(s.bx - s.ax, s.by - s.ay) * (s.ra + s.rb) +
      0.5 * Math.PI * (s.ra * s.ra + s.rb * s.rb)
    : s.k === 'disc'
      ? Math.PI * s.r * s.r
      : TAU * s.r * s.w * 2.2;

/** Scatter `n` dots over the shapes, more where there is more of them. `rand` gives numbers in [0, 1). */
export function sampleDots(shapes: readonly Shape[], n: number, rand: () => number): DotSeed[] {
  const areas = shapes.map(area);
  const total = areas.reduce((a, b) => a + b, 0) || 1;
  const cum: number[] = [];
  let acc = 0;
  for (const a of areas) {
    acc += a / total;
    cum.push(acc);
  }
  const out: DotSeed[] = [];
  for (let i = 0; i < n; i++) {
    const r = rand();
    let shape = cum.findIndex((c) => r <= c);
    if (shape < 0) shape = shapes.length - 1;
    out.push({ shape, u: rand(), v: rand() * 2 - 1, w: rand() * 2 - 1, drift: rand() });
  }
  return out;
}

/** Where a dot is on its shape now (shapes from the same figure at another time). */
export function dotAt(s: Shape | undefined, d: DotSeed): [number, number] {
  if (!s) return [0, 0];
  if (s.k === 'disc') {
    const a = d.u * TAU;
    const r = Math.sqrt(Math.abs(d.v)) * s.r;
    return [s.x + Math.cos(a) * r, s.y + Math.sin(a) * r];
  }
  if (s.k === 'ring') {
    const a = d.u * TAU;
    const r = s.r + d.v * s.w;
    return [s.x + Math.cos(a) * r, s.y + Math.sin(a) * r];
  }
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / len;
  const ny = dx / len;
  const rad = s.ra + (s.rb - s.ra) * d.u;
  // Filled across: denser toward the middle, a soft round edge.
  const across = Math.sign(d.v) * Math.sqrt(Math.abs(d.v)) * rad;
  return [s.ax + dx * d.u + nx * across, s.ay + dy * d.u + ny * across];
}
