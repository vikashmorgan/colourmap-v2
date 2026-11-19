/**
 * Drive, the night worlds' furniture (docs/specs/drive-game.md): three wet tracks at night, each
 * furnished in one of the City of Dreams' manners and all of it mirrored in the road. Pure: no
 * three.js, no DOM; laid out along each track by distance, the same every time.
 *
 * - Night Rain: lamps on posts both sides and a row hung high over the middle trace the course to the
 *   vanishing point; towers of glowing grains, the great arch, strings of lights across, banners on
 *   the lamp posts, LED chevrons on the bends, boost rings.
 * - Chinatown Run: red and gold. Shophouses close along narrow lanes that open onto wide avenues,
 *   strings of red lanterns overhead drawing the course, Chinatown gates to race through and a
 *   temple gate at each avenue, upright signs with letters and CITY OF DREAMS panels. Kept
 *   uncluttered: the spans stand well apart and every gate is wide open.
 * - Neon District: magenta, cyan and violet. Tall towers edged in neon, bridges overhead, ship
 *   highways streaming at three heights above, LED chevrons, neon signs (a few of them flash, as the
 *   user allowed in the Neon Market, and nowhere else), boost rings.
 *
 * The looks follow the City's own modules (lib/city-gates.ts, lib/city-chinatown*.ts,
 * lib/city-symbols.ts, lib/city-banners.ts, lib/city-arrows.ts, lib/city-boost-rings.ts,
 * lib/city-market.ts) without importing them: those are laid out on the City's grid, and these
 * courses are roads.
 */

import { clamp } from '@/lib/art/drive';
import type { TrackDef } from '@/lib/art/track';

export type Rgb = [number, number, number];
export type NightTheme = 'rain' | 'chinatown' | 'neon' | 'gold';

/** The City's neon: amber, magenta, cyan, violet, warm white. */
export const NEON: Rgb[] = [
  [1, 0.62, 0.25],
  [0.95, 0.25, 0.75],
  [0.25, 0.85, 1],
  [0.6, 0.35, 1],
  [1, 0.9, 0.75],
];
/** Chinatown: lacquer red, gold, lantern red, jade. */
export const LACQUER: Rgb = [0.75, 0.08, 0.06];
export const GOLD: Rgb = [1, 0.75, 0.35];
export const LANTERN: Rgb = [1, 0.22, 0.08];
export const JADE: Rgb = [0.3, 0.9, 0.6];
/** The Neon District's own: the City of Dreams' neon (lib/city-grid.ts C, the Neon Canyon's four:
 * magenta, cyan, amber, violet; 2026-11-19: "make neon colours more inspired by the neon in City"). */
export const NEON_DISTRICT: Rgb[] = [
  [1, 0.28, 0.78],
  [0.22, 0.92, 1],
  [1, 0.64, 0.22],
  [0.6, 0.4, 1],
];

/**
 * The Neon District's rings recolour the world (2026-11-19: "make the golden circles transform all
 * lights into golden, orange ones make it all between yellow to red, and pink ones make it neon"):
 * each ring has a mood, and going through it turns every light toward that mood's three colours
 * (each light keeps its place along them by its own hue, so the variety stays), until a ring of
 * another mood.
 */
export type RingMood = 'gold' | 'fire' | 'neon';
export const MOODS: Record<RingMood, { ring: Rgb; stops: [Rgb, Rgb, Rgb] }> = {
  gold: {
    ring: [1, 0.74, 0.3],
    stops: [
      [1, 0.8, 0.38],
      [1, 0.62, 0.2],
      [1, 0.9, 0.62],
    ],
  },
  fire: {
    ring: [1, 0.45, 0.1],
    stops: [
      [1, 0.85, 0.15],
      [1, 0.12, 0.05],
      [1, 0.45, 0.08],
    ],
  },
  neon: {
    ring: [1, 0.28, 0.78],
    stops: [
      [1, 0.28, 0.78],
      [0.22, 0.92, 1],
      [0.6, 0.4, 1],
    ],
  },
};
export const MOOD_ORDER: RingMood[] = ['gold', 'fire', 'neon'];

/** The Golden Track's golds: warm, deep, pale and amber. */
export const GOLDS: Rgb[] = [
  [1, 0.8, 0.38],
  [1, 0.62, 0.2],
  [1, 0.9, 0.62],
  [0.95, 0.7, 0.3],
];

export function palette(theme: NightTheme): Rgb[] {
  if (theme === 'chinatown') return [LANTERN, GOLD, LACQUER, JADE];
  if (theme === 'gold') return GOLDS;
  if (theme === 'neon') return NEON_DISTRICT;
  return NEON;
}

function hash(n: number, k: number): number {
  const s = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ── The pieces ────────────────────────────────────────────── */

export type PieceKind =
  | 'tower'
  | 'shophouse'
  | 'lamp'
  | 'lights'
  | 'lanterns'
  | 'gate'
  | 'temple'
  | 'arch'
  | 'banner'
  | 'sign'
  | 'panel'
  | 'arrow'
  | 'bridge';

/**
 * One piece of furniture, in road coordinates: at s, its middle u across (positive left), its size
 * (w along, d across, h up) and its light. A span (lights, lanterns, gate, temple, arch, bridge)
 * crosses the whole road at height `lift`.
 */
export interface Piece {
  kind: PieceKind;
  s: number;
  u: number;
  w: number;
  d: number;
  h: number;
  lift: number;
  colour: Rgb;
  /** Which way it faces or points: +1 or -1 (a chevron: the way the bend turns). */
  side: 1 | -1;
  /** A sign that flashes (the Neon District only). */
  flash: boolean;
  id: number;
}

const piece = (p: Partial<Piece> & Pick<Piece, 'kind' | 's'>): Piece => ({
  u: 0,
  w: 1,
  d: 1,
  h: 1,
  lift: 0,
  colour: [1, 1, 1],
  side: 1,
  flash: false,
  id: 0,
  ...p,
});

/** Lamps every 32 m on Night Rain; strung lights or lanterns every 96 / 40 m; towers every 46 m. */
export const LAMP_STEP = 32;
export const TOWER_STEP = 46;
export const SHOP_STEP = 14;
export const LIGHTS_STEP = 96;
export const LANTERN_STEP = 40;
export const GATE_STEP = 400;
export const ARCH_STEP = 1500;
export const ARCH_AT = 300;
export const BRIDGE_STEP = 260;
export const ARROW_STEP = 24;
export const ARROW_CURVE = 1 / 420;

/** Everything between s0 and s1 for a theme, on its track. */
export function piecesBetween(theme: NightTheme, def: TrackDef, s0: number, s1: number): Piece[] {
  const out: Piece[] = [];
  const pal = palette(theme);
  const halfAt = (s: number) => def.half(Math.max(0, s));
  const each = (step: number, phase: number, f: (s: number, i: number) => void) => {
    for (let i = Math.ceil((s0 - phase) / step); i * step + phase < s1; i++) {
      const s = i * step + phase;
      if (s >= 0) f(s, i);
    }
  };

  if (theme === 'rain') {
    // Lamps on posts each side, a row hung over the middle halfway between.
    each(LAMP_STEP, 0, (s, i) => {
      const half = halfAt(s);
      const sodium = hash(i, 3) < 0.7;
      const colour: Rgb = sodium ? [1, 0.68, 0.32] : [0.85, 0.9, 1];
      out.push(piece({ kind: 'lamp', s, u: half + 1.5, h: 8, colour, side: 1, id: i * 3 }));
      out.push(
        piece({ kind: 'lamp', s: s + 16, u: -(half + 1.5), h: 8, colour, side: -1, id: i * 3 + 1 }),
      );
      out.push(piece({ kind: 'lamp', s: s + 8, u: 0, h: 9.5, lift: 9.5, colour, id: i * 3 + 2 }));
      if (i % 2 === 0) {
        const side: 1 | -1 = i % 4 === 0 ? 1 : -1;
        out.push(
          piece({
            kind: 'banner',
            s: side > 0 ? s : s + 16,
            u: side * (half + 1.5),
            w: 0.9,
            h: 3,
            lift: 3.5,
            colour: pal[Math.floor(hash(i, 31) * pal.length)],
            side,
            id: i,
          }),
        );
      }
    });
    each(LIGHTS_STEP, 48, (s, i) => {
      const d = (((s - ARCH_AT) % ARCH_STEP) + ARCH_STEP) % ARCH_STEP;
      if (d < 40 || d > ARCH_STEP - 40) return;
      out.push(piece({ kind: 'lights', s, lift: 10, colour: pal[i % pal.length], id: i }));
    });
    each(ARCH_STEP, ARCH_AT, (s, i) => {
      out.push(piece({ kind: 'arch', s, lift: halfAt(s) + 7, colour: GOLD, id: i }));
    });
  }

  if (theme === 'rain' || theme === 'neon') {
    // Towers set back past the lamps, taller further back.
    for (const side of [1, -1] as const) {
      each(TOWER_STEP, side > 0 ? 0 : TOWER_STEP / 2, (s, i) => {
        // Gaps between them, and set well back, so the lamps overhead stay the course's lines.
        if (hash(i, side) < (theme === 'neon' ? 0.15 : 0.3)) return;
        const back = (theme === 'neon' ? 16 : 22) + 34 * hash(i, side + 5);
        const across = 6 + 7 * hash(i, side + 9);
        const tall =
          theme === 'neon'
            ? 50 + 120 * hash(i, side + 11) ** 1.2
            : 24 + (40 + back * 2.2) * hash(i, side + 11) ** 1.4;
        const sign = hash(i, side + 17) < (theme === 'neon' ? 0.6 : 0.45);
        const colour = pal[Math.floor(hash(i, side + 13) * pal.length)];
        out.push(
          piece({
            kind: 'tower',
            s,
            u: side * (halfAt(s) + back + across),
            w: 6 + 8 * hash(i, side + 7),
            d: across,
            h: tall,
            colour,
            side,
            id: i * 2 + (side > 0 ? 0 : 1),
          }),
        );
        if (sign) {
          out.push(
            piece({
              kind: 'sign',
              s,
              u: side * (halfAt(s) + back - 0.3),
              w: 3 + 4 * hash(i, side + 21),
              h: 1.6 + 1.6 * hash(i, side + 23),
              lift: 6 + 14 * hash(i, side + 25),
              colour: pal[Math.floor(hash(i, side + 27) * pal.length)],
              side,
              // A few flash, in the Neon District only.
              flash: theme === 'neon' && hash(i, side + 29) < 0.14,
              id: i * 2 + (side > 0 ? 0 : 1),
            }),
          );
        }
      });
    }
  }

  if (theme === 'chinatown') {
    // Shophouses shoulder to shoulder along the lanes, set back on the avenues.
    for (const side of [1, -1] as const) {
      each(SHOP_STEP, side > 0 ? 0 : SHOP_STEP / 2, (s, i) => {
        const half = halfAt(s);
        const back = 2.5 + (half > 10 ? 6 : 0);
        const floors = 2 + Math.floor(hash(i, side + 41) * 4);
        out.push(
          piece({
            kind: 'shophouse',
            s,
            u: side * (half + back + 4),
            w: SHOP_STEP * 0.48,
            d: 4,
            h: floors * 3.4,
            colour: hash(i, side + 43) < 0.5 ? LACQUER : GOLD,
            side,
            id: i * 2 + (side > 0 ? 0 : 1),
          }),
        );
        // Upright signs with letters on every third house; CITY OF DREAMS panels now and then.
        if (i % 3 === 0) {
          const panel = hash(i, side + 45) < 0.18;
          out.push(
            piece({
              kind: panel ? 'panel' : 'sign',
              s,
              u: side * (half + back - 0.2),
              w: panel ? 5 : 0.9,
              h: panel ? 1.4 : 3.2,
              lift: panel ? 7 : 4.2,
              colour: panel ? GOLD : hash(i, side + 47) < 0.6 ? LANTERN : JADE,
              side,
              id: i * 2 + (side > 0 ? 0 : 1),
            }),
          );
        }
      });
    }
    // Lantern strings overhead every 40 m, gates every 400 m, a temple gate where each avenue opens.
    each(LANTERN_STEP, 20, (s, i) => {
      if (Math.abs(s - Math.round(s / GATE_STEP) * GATE_STEP) < 25) return;
      out.push(piece({ kind: 'lanterns', s, lift: 8.5, colour: LANTERN, id: i }));
    });
    each(GATE_STEP, 0, (s, i) => {
      if (i === 0) return;
      const temple = i % 3 === 0;
      out.push(
        piece({
          kind: temple ? 'temple' : 'gate',
          s,
          lift: temple ? 13 : 9.5,
          colour: LACQUER,
          id: i,
        }),
      );
    });
  }

  if (theme === 'neon') {
    // Bridges overhead between the towers.
    each(BRIDGE_STEP, 130, (s, i) => {
      out.push(
        piece({
          kind: 'bridge',
          s,
          lift: 18 + 18 * hash(i, 51),
          h: 2.2,
          w: 5,
          colour: pal[i % pal.length],
          id: i,
        }),
      );
    });
  }

  if (theme === 'rain' || theme === 'neon') {
    // LED chevrons on the outside of the bends, pointing the way.
    each(ARROW_STEP, 0, (s, i) => {
      const k = def.curv(s);
      if (Math.abs(k) < ARROW_CURVE) return;
      const turn: 1 | -1 = k > 0 ? 1 : -1;
      const side: 1 | -1 = turn > 0 ? -1 : 1;
      out.push(
        piece({
          kind: 'arrow',
          s,
          u: side * (halfAt(s) + 2.2),
          w: 2.4,
          h: 1.2,
          lift: 1.6,
          colour: theme === 'neon' ? NEON_DISTRICT[1] : NEON[0],
          side: turn,
          id: i,
        }),
      );
    });
  }

  return out.sort((a, b) => a.s - b.s);
}

/**
 * How lit a chevron is: a soft crest running along the bend the way you drive, always a dim glow,
 * never a blink (the City's LED arrows, lib/city-arrows.ts arrowGlow).
 */
export function chevronGlow(s: number, t: number): number {
  const w = 0.5 + 0.5 * Math.cos(2 * Math.PI * (0.65 * t - s / 12.8));
  return 0.25 + 0.75 * w * w * w;
}

/** A flashing sign's light: on and off a little over once a second, each in its own time. */
export function signLight(p: Pick<Piece, 'flash' | 'id'>, t: number): number {
  if (!p.flash) return 1;
  const phase = t * 1.3 + hash(p.id, 61) * 7;
  return phase - Math.floor(phase) < 0.55 ? 1 : 0.15;
}

/* ── Ship highways (Neon District) ─────────────────────────── */

/** Three lanes of ships streaming above the track, at their heights, speeds and offsets. */
export const HIGHWAYS = [
  { lift: 28, u: 6, speed: 70, gap: 38 },
  // All one way, the way you drive (2026-11-19: "not going back and forth, only in one direction").
  { lift: 42, u: -9, speed: 55, gap: 52 },
  { lift: 60, u: 2, speed: 90, gap: 70 },
];

/** Where the ships of a highway are along the track at time t, between s0 and s1. */
export function highwayShips(lane: number, t: number, s0: number, s1: number): number[] {
  const h = HIGHWAYS[lane];
  const off = (((h.speed * t) % h.gap) + h.gap) % h.gap;
  const out: number[] = [];
  for (let k = Math.ceil((s0 - off) / h.gap); k * h.gap + off < s1; k++) out.push(k * h.gap + off);
  return out;
}

/* ── Boost rings ───────────────────────────────────────────── */

export interface Ring {
  s: number;
  u: number;
  /** Its middle's height over the road, and its radius. */
  lift: number;
  r: number;
  colour: Rgb;
  /** The Neon District's: what going through it turns the lights to. */
  mood?: RingMood;
}

/** A boost ring every 750 m (Night Rain and the Neon District), a little to one side or the other. */
export const RING_STEP = 750;
export const RING_R = 4.2;

export function ringAt(theme: NightTheme, k: number, half: number): Ring | null {
  if (theme === 'chinatown') return null;
  const u = (hash(k, 41) - 0.5) * Math.max(0, half - RING_R - 1) * 2;
  const pal = palette(theme);
  const mood = theme === 'neon' ? MOOD_ORDER[k % MOOD_ORDER.length] : undefined;
  return {
    s: k * RING_STEP + 180,
    u,
    lift: RING_R + 0.4,
    r: RING_R,
    colour: mood ? MOODS[mood].ring : pal[(k + 2) % pal.length],
    ...(mood ? { mood } : {}),
  };
}

/** Whether moving from s0 to s1 at (u, height over the road) goes through the ring (a little forgiving). */
export function throughRing(ring: Ring, s0: number, s1: number, u: number, over: number): boolean {
  if (!(s0 < ring.s && s1 >= ring.s)) return false;
  return Math.hypot(u - ring.u, over - ring.lift) <= ring.r * 1.15;
}

/** A ring's surge: as in the City (2.6 s), a push ahead that rises fast and eases away. */
export const SURGE_LIFE = 2.6;
export const SURGE_PULL = 16;

export function surgeAccel(since: number): number {
  if (since < 0 || since >= SURGE_LIFE) return 0;
  const k = since / SURGE_LIFE;
  return SURGE_PULL * clamp(k * 8, 0, 1) * (1 - k) * (1 - k);
}
