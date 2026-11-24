/**
 * Drive, the night worlds' furniture (docs/specs/drive-game.md): three wet tracks at night, each
 * furnished in one of the City of Dreams' manners and all of it mirrored in the road. Pure: no
 * three.js, no DOM; laid out along each track by distance, the same every time.
 *
 * - Night Rain: lamps on posts both sides and a row hung high over the middle trace the course to the
 *   vanishing point; towers of glowing grains, the great arch, strings of lights across, banners on
 *   the lamp posts, LED chevrons on the bends, boost rings.
 * - Chinatown Run: red and gold. A tall street canyon of shophouse towers close along narrow lanes
 *   that open onto wide avenues (lib/art/chinatown-street.ts), blade signs and boards lettered up
 *   every face, strings of red lanterns overhead drawing the course and strings of light higher
 *   up, Chinatown gates to race through and a temple gate at each avenue. Kept uncluttered: only
 *   light crosses the road, the spans stand well apart and every gate is wide open.
 * - Neon District: magenta, cyan and violet. Tall towers edged in neon, bridges overhead, ship
 *   highways streaming at three heights above, LED chevrons, neon signs (a few of them flash, as the
 *   user allowed in the Neon Market, and nowhere else), boost rings.
 *
 * The looks follow the City's own modules (lib/city-gates.ts, lib/city-chinatown*.ts,
 * lib/city-symbols.ts, lib/city-banners.ts, lib/city-arrows.ts, lib/city-boost-rings.ts,
 * lib/city-market.ts) without importing them: those are laid out on the City's grid, and these
 * courses are roads.
 */

import { BALCONY, balconyLocal, forkNose, LOWER, pathMedian } from '@/lib/art/chinatown-paths';
import {
  CT_BOARD_FREE,
  CT_PATH_CELLS,
  CT_STOREY,
  CT_TALL_FLOORS,
  CT_TONES,
  ctBlades,
  ctBoards,
  ctCell,
  ctFloors,
  ctRoofs,
} from '@/lib/art/chinatown-street';
import { clamp } from '@/lib/art/drive';
import {
  CHINA_LANE,
  LOWER_RAIL,
  LOWER_SLAB,
  lowerFloor,
  ROOF_OPEN,
  streetAt,
  type TrackDef,
  voidLeft,
} from '@/lib/art/track';
import { UNDER } from '@/lib/art/undertown';

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
/** The sign tones' ink as light (lib/art/chinatown-street.ts CT_TONES), for their neon frames. */
const CT_TONE_RGB: Rgb[] = CT_TONES.map(({ ink, bg }) => {
  // The brighter of ink and ground: a dark-on-gold board glows gold.
  const rgb = (c: string): Rgb =>
    [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16) / 255) as Rgb;
  const a = rgb(ink);
  const b = rgb(bg);
  return a[0] + a[1] + a[2] >= b[0] + b[1] + b[2] ? a : b;
});
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
  | 'blade'
  | 'billboard'
  | 'arrow'
  | 'bridge'
  /** A beam on two posts across from u - d to u + d at `lift` (the paths' signs hang on it). */
  | 'gantry'
  /** A small light (w its size) at `lift` over the ground, or with `z` at that height. */
  | 'beacon'
  /** A red column from the ground up to `z` (the balcony road's supports). */
  | 'pillar';

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
  /** Chinatown's blades and boards: their cell in the sign atlas (lib/art/chinatown-street.ts). A
   * shophouse's `lift` is how many crown roofs it wears. */
  cell?: number;
  /** On the balcony road: the height over the street's datum it stands at (m), not over the ground. */
  z?: number;
  /** Down in the underpass's void: the height it stands on (m), in place of the ground's. */
  base?: number;
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
/** Chinatown's high strings of light, at 18 and 26 m in turn. */
export const HIGH_LIGHTS_STEP = 90;
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
    // The street canyon (lib/art/chinatown-street.ts): shophouse towers shoulder to shoulder close
    // along the lanes, set back on the avenues, storey on storey, their blade signs and boards up
    // every face. Lower where Undertown hangs over the street.
    const underNear = (s: number) =>
      [-12, 0, 12].some((d) => def.under?.(Math.max(0, s + d)) ?? false);
    const shop = (side: 1 | -1, i: number) => {
      const s = i * SHOP_STEP + (side > 0 ? 0 : SHOP_STEP / 2);
      const half = halfAt(s);
      const avenue = half > CHINA_LANE + 2;
      const under = underNear(s);
      return { s, half, avenue, under, floors: ctFloors(i, side, s, avenue, under) };
    };
    for (const side of [1, -1] as const) {
      each(SHOP_STEP, side > 0 ? 0 : SHOP_STEP / 2, (s, i) => {
        const { half, avenue, under, floors } = shop(side, i);
        const back = 2.5 + (avenue ? 6 : 0);
        const w = SHOP_STEP * 0.48;
        // None right of the street over the underpass's void (open to the lake), stood back
        // behind the underpass on the right and the balcony road on the left.
        if (side < 0 && voidOpen(def, s, w)) return;
        const face = Math.max(half + back, pathClear(def, s, w, side));
        const id = i * 2 + (side > 0 ? 0 : 1);
        out.push(
          piece({
            kind: 'shophouse',
            s,
            u: side * (face + 4),
            w,
            d: 4,
            h: floors * CT_STOREY,
            lift: ctRoofs(floors, under),
            colour: hash(i, side + 43) < 0.5 ? LACQUER : GOLD,
            side,
            id,
          }),
        );
        // Blade signs standing out from the face, facing down the street.
        for (const b of ctBlades(i, side, floors, w)) {
          // None through a gate's beams (these every 400 m, Design's between them).
          const g = (s + b.da) / (GATE_STEP / 2);
          if (Math.abs(g - Math.round(g)) * (GATE_STEP / 2) < 3) continue;
          out.push(
            piece({
              kind: 'blade',
              s: s + b.da,
              u: side * (face - b.out / 2),
              w: 0.08,
              d: b.out / 2,
              h: b.h,
              lift: b.lift,
              colour: CT_TONE_RGB[ctCell('blade', b.cell).tone],
              side,
              id,
              cell: b.cell,
            }),
          );
        }
        // Horizontal boards flat on the face, between the blades.
        for (const b of ctBoards(i, side, floors, w)) {
          out.push(
            piece({
              kind: 'billboard',
              s: s + b.da,
              u: side * (face - 0.18),
              w: b.len / 2,
              d: 0.1,
              h: b.h,
              lift: b.lift,
              colour: CT_TONE_RGB[ctCell('board', b.cell).tone],
              side,
              id,
              cell: b.cell,
            }),
          );
        }
        // A name board on the roof of each tall tiered tower, facing the way you come.
        if (floors >= CT_TALL_FLOORS && !under) {
          const cell = (i * 3 + (side > 0 ? 7 : 0)) % CT_BOARD_FREE;
          out.push(
            piece({
              kind: 'billboard',
              s: s - (w - 0.1),
              u: side * (face + 4),
              w: 0.08,
              d: 3.6,
              h: 1.8,
              lift: floors * CT_STOREY + 0.3,
              colour: CT_TONE_RGB[ctCell('board', cell).tone],
              side,
              id,
              cell,
            }),
          );
        }
      });
    }
    // High strings of light across the street, where the towers both sides stand taller than them
    // (the City's strands at three heights); only light crosses the road.
    each(HIGH_LIGHTS_STEP, 60, (s, i) => {
      if (onPath(def, s, false) || voidOpen(def, s, 10)) return;
      const iL = Math.round(s / SHOP_STEP);
      const iR = Math.round((s - SHOP_STEP / 2) / SHOP_STEP);
      const low = Math.min(shop(1, iL).floors, shop(-1, iR).floors) * CT_STOREY;
      if (shop(1, iL).under) return;
      const lift = i % 2 ? 26 : 18;
      if (low < lift + 4) return;
      out.push(piece({ kind: 'lights', s, lift, colour: GOLD, id: i }));
    });
    // Lantern strings overhead every 40 m, gates every 400 m, a temple gate where each avenue opens.
    each(LANTERN_STEP, 20, (s, i) => {
      if (Math.abs(s - Math.round(s / GATE_STEP) * GATE_STEP) < 25) return;
      if (onPath(def, s, false)) return;
      out.push(piece({ kind: 'lanterns', s, lift: 8.5, colour: LANTERN, id: i }));
    });
    each(GATE_STEP, 0, (s, i) => {
      if (i === 0 || onPath(def, s)) return;
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

  if (theme === 'chinatown') out.push(...pathPieces(def, s0, s1));

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

  return (def.under ? out.filter((p) => clearOfFlip(def, p)) : out).sort((a, b) => a.s - b.s);
}

/**
 * Undertown (lib/art/undertown.ts): where the road flips over its edge it sweeps out to its axis'
 * height either side, so nothing may stand within that (nor cross the road). Upside down it runs
 * high over the street, and the street keeps all its pieces.
 */
export function clearOfFlip(
  def: TrackDef,
  p: Pick<Piece, 's' | 'u' | 'd'> & Partial<Pick<Piece, 'z' | 'base'>>,
): boolean {
  // Down in the underpass's void, under the street: the flip sweeps over it, never through it.
  if ((p.base ?? 0) < -2 || (p.z ?? 0) < -2) return true;
  for (const ds of [-20, 0, 20]) {
    const s = Math.max(0, p.s + ds);
    if (!def.under?.(s)) continue;
    const th = Math.abs(def.twist?.(s) ?? 0);
    if (th === 0 || th === Math.PI) continue;
    const axis = def.axis?.(s) ?? def.half(s);
    if (Math.abs(p.u) - p.d < axis + 2) return false;
  }
  return true;
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

/* ── Chinatown's two paths (lib/art/chinatown-paths.ts) ────── */

/** Whether s is by the fork (the underpass not yet walled well apart from the road) or the balcony
 * road, with room either side for a span's posts: no span across the road there. Where the
 * underpass is down in its void no span with `posts` stands (they would stand in the void); strings
 * of light, which have none, still cross. */
function onPath(def: TrackDef, s: number, posts = true): boolean {
  for (const d of [-25, 0, 25]) {
    const q = Math.max(0, s + d);
    const c = def.bypass?.(q) ?? null;
    const half = def.half(q);
    if (c !== null) {
      if ((def.lower?.(q) ?? 0) > 0.05) {
        if (posts) return true;
      } else {
        const mid = pathMedian(c, half);
        if (mid === null || mid > -(half + 5)) return true;
      }
    }
    if (def.balcony?.(q) || (def.kick?.(q, def.half(q)) ?? 0) > 0) return true;
  }
  return false;
}

/** Whether the underpass's void is well down anywhere within w of s: the right side is open there,
 * no shophouses (2026-11-24: "more emptiness around it"). */
export function voidOpen(def: TrackDef, s: number, w: number): boolean {
  for (const d of [-w, 0, w]) if ((def.lower?.(Math.max(0, s + d)) ?? 0) > 2) return true;
  return false;
}

/**
 * How far from the centre a shophouse half-length w at s must keep its face on its side: past the
 * underpass's far edge on the right (and well past it as it goes down: LOWER.OPEN more at full
 * depth), past the balcony road's rail on the left (0 where neither runs).
 */
export function pathClear(def: TrackDef, s: number, w: number, side: 1 | -1): number {
  let need = 0;
  for (const d of [-w - 2, -w / 2, 0, w / 2, w + 2]) {
    const q = Math.max(0, s + d);
    if (side < 0) {
      const c = def.bypass?.(q);
      if (c !== null && c !== undefined) {
        const k = clamp((def.lower?.(q) ?? 0) / LOWER.DEPTH, 0, 1);
        need = Math.max(need, -c + LOWER.LANE + 2.5 + LOWER.OPEN * k);
      }
    } else {
      const bc = def.balcony?.(q);
      if (bc) need = Math.max(need, bc.c + bc.w + 2.5);
    }
  }
  return need;
}

const PATH_GOLD: Rgb = [1, 0.72, 0.3];
const PATH_VIOLET: Rgb = [0.62, 0.22, 1];
const PATH_JADE: Rgb = [0.3, 0.95, 0.6];

/** The underpass's void at s (every 3 m, i its count): see pathPieces. */
function voidPieces(
  def: TrackDef,
  s: number,
  i: number,
  c: number,
  half: number,
  vl: number,
  out: Piece[],
): void {
  const fz = lowerFloor(def, s);
  const twisting = Math.abs(def.twist?.(Math.max(0, s)) ?? 0) > ROOF_OPEN;
  const covered = !twisting && vl > -half;
  // The rail along the street's edge over the void, lit violet.
  if (!twisting && i % 2 === 0)
    out.push(
      piece({
        kind: 'beacon',
        s,
        u: -(half + LOWER_RAIL),
        w: 0.15,
        colour: PATH_VIOLET,
        id: i,
        z: streetAt(def, s, -half) + 1,
      }),
    );
  // Red lanterns on posts along the far kerb, echoing down the plain.
  if (i % 8 === 0) {
    const u = c - LOWER.LANE - LOWER.KERB - 0.6;
    out.push(piece({ kind: 'pillar', s, u, z: fz + 5, base: fz, colour: LACQUER, id: i }));
    out.push(
      piece({ kind: 'beacon', s, u: u + 0.3, w: 0.42, colour: LANTERN, id: i, z: fz + 5.5 }),
    );
  }
  if (covered) {
    // Under the deck: lacquer columns along the wall, lanterns hung from the deck over the track.
    const roof = streetAt(def, s, vl) - LOWER_SLAB;
    if (i % 6 === 0)
      out.push(
        piece({ kind: 'pillar', s, u: vl - 0.6, z: roof, base: fz, colour: LACQUER, id: i }),
      );
    if (i % 4 === 2)
      for (const f of [-0.5, 0.5]) {
        const u = c + f * LOWER.LANE;
        if (u > -half)
          out.push(
            piece({
              kind: 'beacon',
              s,
              u,
              w: 0.38,
              colour: LANTERN,
              id: i,
              z: streetAt(def, s, u) - LOWER_SLAB - 1.2,
            }),
          );
      }
  }
  // Lettered panels along the retaining wall, facing the track.
  if (i % 24 === 0 && vl - c > LOWER.LANE)
    out.push(
      piece({
        kind: 'billboard',
        s,
        u: vl - 0.18,
        w: 3.6,
        d: 0.1,
        h: 1.9,
        lift: 3.2,
        base: fz,
        colour: PATH_GOLD,
        side: 1,
        id: i,
        cell: CT_PATH_CELLS.deep,
      }),
    );
}

/**
 * The fork before each Undertown and the balcony road, lit and signed: over the road before the
 * fork a gantry with 下町 UNDERTOWN ↶ over the road ahead and 地下街 UNDERPASS ↘ over the lane
 * peeling off; chevrons of light on the road, violet ahead and gold bearing right; the median's
 * kerbs in violet on the road's side and gold on the lane's, the lane's far edge in gold. Down in
 * the void: violet lights along the street's rail over it, red lanterns on posts along the track's
 * far kerb, lacquer columns along the retaining wall under the deck and lanterns hung from the
 * deck's underside over the track, lettered panels (地下街 · 灯 · UNDERPASS) along the wall. Before
 * each balcony road a gantry with 露台 BALCONY ↖ over the left of the road, jade lights along the
 * kicker's lip and its inner side; on the deck lanterns along its rail and gold along its open
 * edge, red columns under it.
 */
export function pathPieces(def: TrackDef, s0: number, s1: number): Piece[] {
  const out: Piece[] = [];
  const halfAt = (s: number) => def.half(Math.max(0, s));
  const step = (every: number, f: (s: number, i: number) => void) => {
    for (let i = Math.ceil(s0 / every); i * every < s1; i++) {
      const s = i * every;
      if (s >= 0) f(s, i);
    }
  };
  const beacon = (s: number, u: number, lift: number, colour: Rgb, size: number, id: number) =>
    out.push(piece({ kind: 'beacon', s, u, lift, w: size, colour, id }));
  const board = (s: number, u: number, cell: number, colour: Rgb, id: number) =>
    out.push(
      piece({ kind: 'billboard', s, u, w: 0.08, d: 3.8, h: 1.9, lift: 5.4, colour, id, cell }),
    );

  if (def.bypass && def.median) {
    // The signs: a gantry 60 m before the nose, a board over each way.
    for (let k = Math.max(0, Math.floor((s0 - UNDER.AT) / UNDER.EVERY)); ; k++) {
      const under = UNDER.AT + k * UNDER.EVERY;
      if (under + LOWER.PEEL[0] > s1) break;
      const g = forkNose(under, halfAt(under + LOWER.PEEL[0] / 2)) - 60;
      if (g < s0 || g >= s1) continue;
      const half = halfAt(g);
      const c = def.bypass(g) ?? 0;
      const uL = half + 1.2;
      const uR = Math.min(-half, c - LOWER.LANE) - 1.2;
      out.push(
        piece({
          kind: 'gantry',
          s: g,
          u: (uL + uR) / 2,
          d: (uL - uR) / 2,
          lift: 7.6,
          colour: PATH_GOLD,
          id: k,
        }),
      );
      board(g, half * 0.3, CT_PATH_CELLS.under, PATH_VIOLET, k);
      board(g, Math.min(c, -half - 2), CT_PATH_CELLS.main, PATH_GOLD, k);
    }
    step(3, (s, i) => {
      const c = def.bypass?.(s);
      if (c === null || c === undefined) return;
      const half = halfAt(s);
      const vl = def.lower ? voidLeft(def, s, 0.05) : null;
      if (vl !== null) {
        voidPieces(def, s, i, c, half, vl, out);
        return;
      }
      const mid = pathMedian(c, half);
      if (mid !== null) {
        if (mid > -(half + 1.5)) return;
        // The median's kerbs: violet on the road's side, gold on the lane's; the lane's far edge.
        if (i % 2 === 0) {
          beacon(s, Math.max(mid, -(half + 1)) - 0.2, 0.5, PATH_VIOLET, 0.16, i);
          beacon(s, Math.min(mid, c + LOWER.LANE + 1) + 0.2, 0.5, PATH_GOLD, 0.16, i);
        } else beacon(s, c - LOWER.LANE - 0.4, 0.5, PATH_GOLD, 0.16, i);
      } else if (i % 10 === 0 && c < -2) {
        // Before the nose, chevrons on the road: gold bearing right over the lane, violet ahead.
        for (let o = -3; o <= 3; o++) {
          beacon(s + o * 0.9, c - (3 - Math.abs(o)) * 0.9, 0.12, PATH_GOLD, 0.14, i * 8 + o);
          beacon(s - Math.abs(o) * 0.9, half * 0.4 + o * 0.9, 0.12, PATH_VIOLET, 0.14, i * 8 + o);
        }
      }
    });
  }

  if (def.balcony && def.kick) {
    step(2, (s, i) => {
      const half = halfAt(s);
      const x = balconyLocal(s);
      if (x === null) return;
      if (x < 0) {
        if (x > -2) {
          // The kicker's lip in jade, across it.
          for (let u = half - BALCONY.KICK_W; u <= half - 0.3; u += 0.8)
            beacon(s, u, 0.18, PATH_JADE, 0.16, i);
        } else if (i % 3 === 0) beacon(s, half - BALCONY.KICK_W - 1.5, 0.12, PATH_JADE, 0.14, i);
        return;
      }
      const bc = def.balcony?.(s);
      if (!bc) return;
      if (bc.raised) {
        // Gold along the open edge, a lantern every 8 m on the rail, red columns every 12 m.
        if (i % 2 === 0)
          out.push(
            piece({
              kind: 'beacon',
              s,
              u: bc.c - bc.w + 0.2,
              w: 0.15,
              colour: PATH_GOLD,
              id: i,
              z: bc.z + 0.3,
            }),
          );
        if (i % 4 === 0)
          out.push(
            piece({
              kind: 'beacon',
              s,
              u: bc.c + bc.w + 0.2,
              w: 0.32,
              colour: LANTERN,
              id: i,
              z: bc.z + 1.3,
            }),
          );
        if (i % 6 === 0)
          for (const du of [-(bc.w - 0.6), bc.w - 0.6])
            out.push(
              piece({ kind: 'pillar', s, u: bc.c + du, z: bc.z - 0.6, colour: LACQUER, id: i }),
            );
      } else if (i % 2 === 0) beacon(s, bc.c + bc.w + 0.3, 0.4, PATH_GOLD, 0.15, i);
    });
    // The sign, 140 m before each crest with a balcony road.
    for (let n = Math.max(0, Math.floor((s0 - BALCONY.CREST) / BALCONY.PERIOD)); ; n++) {
      const crest = n * BALCONY.PERIOD + BALCONY.CREST;
      const g = crest - 140;
      if (g >= s1) break;
      if (g < s0 || balconyLocal(crest) === null) continue;
      const half = halfAt(g);
      out.push(
        piece({ kind: 'gantry', s: g, u: 0, d: half + 1.2, lift: 7.6, colour: PATH_GOLD, id: n }),
      );
      board(g, half * 0.55, CT_PATH_CELLS.balcony, PATH_JADE, n);
    }
  }
  return out;
}
