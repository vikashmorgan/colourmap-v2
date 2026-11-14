/*
 * The City of Dreams' lettering and gates (docs/specs/art-city.md, "Signs, posters and gates"):
 * word signs in the city's pixel faces (lib/city-font.ts), posters on the roofs, boards hanging
 * down the walls, and rows of temple gates to fly through on the road you start on. Pure: no
 * three.js, no DOM.
 *
 * 2026-11-13: "check how banner typos can be better." / "work on different typos. pancartes like
 * chinatown ones. affiches publicitaires. cool pancartes. japanese doors like those temple doors
 * that u must fly through. also think of a cool entry for the game. a first road that is awesome
 * (like the chinatown one)."
 *
 * Every sign reads from both sides (from behind its letters are laid the other way, so they never
 * read mirrored); its strokes are filled between their pixels, so the words read as lines from far
 * off; big banners get a quiet frame with brighter corners, smaller words an underline. Light is
 * slow: a breath on the city's clock and a wave drifting along the letters, never a flash. The
 * posters' brands are invented, our own.
 */

import { hash, type RGB, smooth, type Vec3 } from './bigbang';
import { type FaceId, textPixels } from './city-font';
import {
  AVENUE,
  BLOCK_Z,
  beat,
  boxDist,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  scale,
  TAU,
} from './city-grid';

const G = GROUND;

/* ---------- word signs ---------- */

export type WordSign = {
  text: string;
  /** Its top left, as read from +z (the letters run along +x); it stands across z. */
  at: Vec3;
  /** The size of a pixel of the face. */
  px: number;
  rgb: RGB;
  key: number;
  face?: FaceId;
  /** Stacked top to bottom, a hanging board's. */
  vertical?: boolean;
  /**
   * 'box' a quiet frame with brighter corners (the big banners), 'line' an underline, 'board' a
   * frame and a faint backing (hanging boards), 'none'. Unset: a box from a pixel of 0.4 up, else a
   * line.
   */
  frame?: 'box' | 'line' | 'board' | 'none';
  /** A slow wave drifting along the letters toward this hue. */
  rgb2?: RGB;
  /** The frame's hue (the letters' own if unset). */
  frameRgb?: RGB;
};

/** The frame a sign gets. */
export const frameOf = (w: WordSign) => w.frame ?? (w.px >= 0.4 ? 'box' : 'line');

/**
 * Where a sign's letter pixel (px, py, in pixels from its top left as read) stands, seen from the
 * eye: from behind (-z) the letters are laid the other way, so the words read, never mirrored.
 */
export function signPoint(w: WordSign, W: number, px: number, py: number, back: boolean): Vec3 {
  const x = (px + 0.5) * w.px;
  return [back ? w.at[0] + W - x : w.at[0] + x, w.at[1] - (py + 0.5) * w.px, w.at[2]];
}

/** A word sign, for the Ship's renderer: its letters, then its frame, underline or board. */
export function wordItem(w: WordSign, eye: Vec3, t: number): Item {
  const T = textPixels(w.text, { face: w.face, vertical: w.vertical, fill: true });
  const W = T.w * w.px;
  const H = T.h * w.px;
  const n = T.px.length / 2;
  const kind = frameOf(w);
  const m = 2 * w.px;
  const WW = W + 2 * m;
  const HH = H + 2 * m;
  const perim = 2 * (WW + HH);
  const frame =
    kind === 'none'
      ? 0
      : kind === 'line'
        ? Math.ceil((W + 2 * w.px) / w.px)
        : Math.ceil(perim / (w.px * 1.2)) + 12;
  const cols = Math.max(1, Math.floor(WW / (3 * w.px)));
  const rowsB = Math.max(1, Math.floor(HH / (3 * w.px)));
  const backing = kind === 'board' ? cols * rowsB : 0;
  const back = eye[2] < w.at[2];
  const fr = w.frameRgb ?? w.rgb;
  return {
    d: boxDist(
      eye,
      [w.at[0] - m, w.at[1] - H - m, w.at[2]],
      [w.at[0] + W + m, w.at[1] + m, w.at[2]],
    ),
    gid: mixId(w.key, Math.round(w.at[2])),
    count: n + frame + backing,
    weight: 3.5,
    probe: [
      [w.at[0], w.at[1], w.at[2]],
      [w.at[0] + W, w.at[1] - H, w.at[2]],
      [w.at[0] + W / 2, w.at[1] - H / 2, w.at[2]],
    ],
    site: (s, o) => {
      // Breathing in time with the city's clock.
      const f = 0.85 + 0.15 * beat(t, 1 / 2, w.key * 0.1);
      if (s < n) {
        const px = T.px[s * 2] as number;
        [o[0], o[1], o[2]] = signPoint(w, W, px, T.px[s * 2 + 1] as number, back);
        const c = w.rgb2
          ? mix(w.rgb, w.rgb2, 0.5 + 0.5 * Math.sin(t * 0.4 - px * 0.08 + w.key))
          : w.rgb;
        [o[3], o[4], o[5]] = scale(c, 0.7 * f);
        return true;
      }
      s -= n;
      o[2] = w.at[2];
      if (s < frame) {
        if (kind === 'line') {
          // An underline a pixel and a half under the words, its ends a little brighter.
          const u = (s + 0.5) / frame;
          o[0] = w.at[0] - w.px + u * (W + 2 * w.px);
          o[1] = w.at[1] - H - 1.6 * w.px;
          [o[3], o[4], o[5]] = scale(fr, (u < 0.04 || u > 0.96 ? 0.45 : 0.26) * f);
          return true;
        }
        const corner = s >= frame - 12;
        let x: number;
        let y: number;
        if (corner) {
          // Three brighter lights at each corner.
          const c = s - (frame - 12);
          const k = Math.floor(c / 3);
          const j = c % 3;
          const cx = k === 1 || k === 2 ? WW : 0;
          const cy = k >= 2 ? HH : 0;
          x = cx + (j === 1 ? (cx ? -1 : 1) * 1.2 * w.px : 0);
          y = cy + (j === 2 ? (cy ? -1 : 1) * 1.2 * w.px : 0);
        } else {
          const e = ((s + 0.5) / (frame - 12)) * perim;
          if (e < WW) [x, y] = [e, 0];
          else if (e < WW + HH) [x, y] = [WW, e - WW];
          else if (e < 2 * WW + HH) [x, y] = [2 * WW + HH - e, HH];
          else [x, y] = [0, Math.max(0, perim - e)];
        }
        o[0] = w.at[0] - m + x;
        o[1] = w.at[1] + m - y;
        [o[3], o[4], o[5]] = scale(fr, (corner ? 0.5 : kind === 'board' ? 0.3 : 0.22) * f);
        return true;
      }
      s -= frame;
      // A board's backing: a faint grid across it, so it reads as a panel.
      const cx = s % cols;
      const cy = Math.floor(s / cols);
      o[0] = w.at[0] - m + ((cx + 0.5) * WW) / cols;
      o[1] = w.at[1] + m - ((cy + 0.5) * HH) / rowsB;
      o[2] = w.at[2] + (back ? 0.05 : -0.05);
      [o[3], o[4], o[5]] = scale(mix(w.rgb, C.white, 0.2), 0.05);
      return true;
    },
  };
}

/* ---------- posters on the roofs ---------- */

/** Invented brands and their lines: our own, none real. */
export const POSTERS: [string, string][] = [
  ['GLOWBERRY SODA', 'DRINK THE GLOW'],
  ['ORBIT NOODLES', 'HOT ALL NIGHT'],
  ['DRIFT TEA HOUSE', 'SLOW IS GOOD'],
  ['VELVET HOURS', 'JAZZ TILL DAWN'],
  ['MOONLIGHT RADIO 88', 'TUNE IN, FLOAT ON'],
  ['PAPER LANTERN INN', 'ROOMS WITH STARS'],
  ['KITE & CLOUD AIR', 'FLY SOFTLY'],
  ['FAR SIGHT OPTICS', 'SEE FURTHER'],
  ['HALCYON BATHS', 'WARM WATER, COOL NIGHTS'],
  ['SWIFTLIGHT BIKES', 'RIDE THE LIGHT'],
];
/** A long brand set on two lines, split at the space nearest its middle. */
export function brandLines(brand: string): string {
  if (brand.length <= 10) return brand;
  const mid = brand.length / 2;
  let best = -1;
  for (let i = 0; i < brand.length; i++)
    if (brand[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? brand : `${brand.slice(0, best)}\n${brand.slice(best + 1)}`;
}

export type Poster = {
  brand: string;
  line: string;
  /** The middle of its foot on the roof, the board facing +z. */
  at: Vec3;
  /** Its width. */
  w: number;
  /** The brand's hue (its district's); the line is white, the frame gold. */
  rgb: RGB;
  key: number;
};
/** A poster's two words, laid out on its board: the brand in the bold face, its line under it. */
export function posterSigns(p: Poster): WordSign[] {
  const brand = brandLines(p.brand);
  const Tb = textPixels(brand, { face: 'deco' });
  const Tl = textPixels(p.line, { face: 'tall' });
  const pb = Math.min(0.5, (p.w * 0.86) / Tb.w);
  const pl = Math.min(pb * 0.62, (p.w * 0.8) / Tl.w);
  const legs = 1.8;
  const top = p.at[1] + legs + 1.2 + Tb.h * pb + 0.9 + Tl.h * pl;
  return [
    {
      text: brand,
      at: [p.at[0] - (Tb.w * pb) / 2, top, p.at[2]],
      px: pb,
      rgb: p.rgb,
      rgb2: mix(p.rgb, C.white, 0.4),
      key: p.key,
      face: 'deco',
      frame: 'none',
    },
    {
      text: p.line,
      at: [p.at[0] - (Tl.w * pl) / 2, top - Tb.h * pb - 0.9, p.at[2]],
      px: pl,
      rgb: mix(C.white, p.rgb, 0.15),
      key: p.key + 1,
      face: 'tall',
      frame: 'none',
    },
  ];
}
/**
 * A poster's board: its frame in gold with a soft light running slowly round it (once in about
 * seven seconds), a faint backing, and two legs down to the roof.
 */
export function posterBoardItem(p: Poster, eye: Vec3, t: number): Item {
  const [a, b] = posterSigns(p);
  const A = a as WordSign;
  const B = b as WordSign;
  const Tl = textPixels(B.text, { face: 'tall' });
  const x0 = p.at[0] - p.w / 2;
  const x1 = p.at[0] + p.w / 2;
  const y1 = A.at[1] + 0.8;
  const y0 = B.at[1] - Tl.h * B.px - 0.8;
  const W = x1 - x0;
  const H = y1 - y0;
  const perim = 2 * (W + H);
  const frame = Math.ceil(perim / 0.35);
  const cols = Math.ceil(W / 0.9);
  const rows = Math.ceil(H / 0.9);
  const legs = 2 * 12;
  const z = p.at[2];
  const back = eye[2] < z;
  return {
    d: boxDist(eye, [x0, p.at[1], z], [x1, y1, z]),
    gid: mixId(p.key, 6601),
    count: frame + cols * rows + legs,
    weight: 2.2,
    probe: [
      [x0, y1, z],
      [x1, y0, z],
      [p.at[0], (y0 + y1) / 2, z],
    ],
    site: (s, o) => {
      if (s < frame) {
        const e = ((s + 0.5) / frame) * perim;
        let x: number;
        let y: number;
        if (e < W) [x, y] = [e, 0];
        else if (e < W + H) [x, y] = [W, e - W];
        else if (e < 2 * W + H) [x, y] = [2 * W + H - e, H];
        else [x, y] = [0, perim - e];
        [o[0], o[1], o[2]] = [x0 + x, y1 - y, z];
        // A soft light running round the frame, slowly.
        const run = Math.cos(TAU * (e / perim - t * 0.14));
        const glow = 0.24 + 0.22 * Math.max(0, run) ** 6;
        [o[3], o[4], o[5]] = scale(C.gold, glow);
        return true;
      }
      s -= frame;
      if (s < cols * rows) {
        [o[0], o[1], o[2]] = [
          x0 + ((s % cols) + 0.5) * (W / cols),
          y1 - (Math.floor(s / cols) + 0.5) * (H / rows),
          z + (back ? 0.06 : -0.06),
        ];
        [o[3], o[4], o[5]] = scale(mix(p.rgb, C.white, 0.3), 0.045);
        return true;
      }
      s -= cols * rows;
      const side = s < 12 ? -1 : 1;
      const u = ((s % 12) + 0.5) / 12;
      [o[0], o[1], o[2]] = [p.at[0] + side * W * 0.32, p.at[1] + u * (y0 - p.at[1]), z];
      [o[3], o[4], o[5]] = scale(C.steel, 0.2);
      return true;
    },
  };
}

/** A tower that could carry a poster on its roof: plain, lit, not Chinatown's nor the code's. */
type Plain = { x: number; z: number; hx: number; hz: number; h: number; k: number };
/**
 * The poster on a tower's roof, if it carries one: about one tower in twelve, each standing on the
 * roof's +z edge, facing down the street; `often` for the road you start on.
 */
export function posterOn(tw: Plain, rgb: RGB, often = false): Poster | null {
  if (tw.h < 16 || hash(tw.k, 490) > (often ? 0.45 : 0.08)) return null;
  const [brand, line] = POSTERS[Math.floor(hash(tw.k, 491) * POSTERS.length)] as [string, string];
  return {
    brand,
    line,
    at: [tw.x, G + tw.h, tw.z + tw.hz - 0.6],
    w: Math.min(18, 2 * tw.hx * 0.95),
    rgb,
    key: tw.k * 3 + 17,
  };
}

/* ---------- boards hanging down the walls ---------- */

export const BOARD_WORDS = [
  'HOTEL',
  'BAR',
  'TEA',
  'RAMEN',
  'JAZZ',
  'DREAMS',
  'NOODLES',
  'ARCADE',
  'OPEN',
  'KARAOKE',
  'BATHS',
  'RADIO',
];
/**
 * Hanging boards on a tower's wall, standing out over the street and facing down it (+z), one word
 * stacked top to bottom in the brush face, framed, at up to `levels` heights; `sides` -1 the wall
 * toward -x, 1 toward +x. From the Chinatown boards' idea, in Latin letters.
 */
export function boardsOn(
  tw: Plain,
  sides: (-1 | 1)[],
  levels: number[],
  tones: RGB[],
  wallX?: (side: -1 | 1, w: number) => number,
): WordSign[] {
  const out: WordSign[] = [];
  for (const side of sides) {
    levels.forEach((lv, m) => {
      const j = tw.k * 5 + m * 3 + (side > 0 ? 1 : 0);
      const text = BOARD_WORDS[Math.floor(hash(j, 493) * BOARD_WORDS.length)] as string;
      const px = text.length > 5 ? 0.17 : 0.2;
      const T = textPixels(text, { face: 'brush', vertical: true });
      const w = T.w * px;
      const h = T.h * px;
      const top = G + Math.min(tw.h - 1, Math.max(h + 2.5, tw.h * lv + h / 2));
      if (top - h < G + 2) return;
      const x0 = wallX ? wallX(side, w) : side > 0 ? tw.x + tw.hx + 0.6 : tw.x - tw.hx - 0.6 - w;
      // Staggered (2026-11-14: "great when tall streets with lots of pancartes but needs to
      // breathe"): a level's board on a +x wall hangs where the -x wall across has none.
      const back = (m + (side > 0 ? 1 : 0)) % 2;
      out.push({
        text,
        at: [x0, top, tw.z + tw.hz * (back ? -0.35 : 0.5)],
        px,
        rgb: tones[Math.floor(hash(j, 494) * tones.length)] as RGB,
        frameRgb: C.white,
        key: 5000 + (j % 997),
        face: 'brush',
        vertical: true,
        frame: 'board',
      });
    });
  }
  return out;
}

/* ---------- the road you start on, and its gates ---------- */

/**
 * The opening road (tile-local z): the avenue's stretch the Ship starts on, from where it starts
 * (`start`, lib/city.ts's route) down to Chinatown's gate (`end`, Chinatown's eight blocks): a row
 * of temple gates to fly through, the welcome over it, boards and posters on its walls.
 */
export const OPENING = {
  end: 8 * BLOCK_Z,
  start: 8 * BLOCK_Z + 190,
  /** The welcome hangs over the cross street just ahead of the start. */
  welcome: 13 * BLOCK_Z,
};
/** Whether row J (tile-local) is the opening road's. */
export const openingRow = (lj: number) => lj >= 8 && lj < 14;
/** The temple gates down the opening road, tile-local z: one every eighteen. */
export const TORII_Z = Array.from({ length: 10 }, (_, i) => OPENING.end + 20 + 18 * i);
/** A gate's posts (half the span between them), the top of its lintel, its lower beam. */
export const TORII = { post: 7.2, lintel: 29.5, beam: 25.5, wide: 8.7 };

const litAt = new Map<number, number>();
/**
 * How bright a gate is, `since` seconds after you passed through it (or never, NaN): a quiet glow,
 * swelling over a second and a half as you pass and settling at a warm light that stays.
 */
export function gateGlow(since: number): number {
  if (!Number.isFinite(since) || since < 0) return 0.3;
  return 0.3 + 0.55 * smooth(since / 1.5) * (0.4 + 0.6 * Math.exp(-since / 45));
}
/** Marks a gate passed when the eye comes through it; returns when it was (NaN if never). */
export function passGate(id: number, gz: number, xc: number, eye: Vec3, t: number): number {
  const had = litAt.get(id);
  if (
    had === undefined &&
    Math.abs(eye[2] - gz) < 3 &&
    Math.abs(eye[0] - xc) < TORII.wide + 2 &&
    eye[1] < G + TORII.lintel + 8
  ) {
    if (litAt.size > 500) litAt.clear();
    litAt.set(id, t);
    return t;
  }
  return had ?? Number.NaN;
}
export const resetGates = () => litAt.clear();

const VERMILION: RGB = [1, 0.3, 0.12];
const POST_SITES = 4 * 70;
const LINTEL_SITES = 2 * 90;
const BEAM_SITES = 60;
const LANTERN = 2 * 14;
const TORII_SITES = 2 * POST_SITES + LINTEL_SITES + BEAM_SITES + 24 + LANTERN;

/**
 * A temple gate across the avenue at z (our own, from the torii's idea): two round posts leaning
 * in a little, a lintel curving up at its ends over a second beam under it, a short strut and a
 * plaque between them, two paper lanterns hanging from the lower beam; it glows as you pass.
 */
export function toriiItem(gz: number, xc: number, eye: Vec3, t: number, id: number): Item {
  const since = t - passGate(id, gz, xc, eye, t);
  const glow = gateGlow(since);
  const { post, lintel, beam, wide } = TORII;
  return {
    d: boxDist(eye, [xc - wide, G, gz - 0.6], [xc + wide, G + lintel + 1.5, gz + 0.6]),
    gid: mixId(id, 4747),
    count: TORII_SITES,
    weight: 1.7,
    probe: [
      [xc - post, G + 12, gz],
      [xc + post, G + 12, gz],
      [xc, G + lintel, gz],
    ],
    site: (s, o) => {
      const breath = 0.9 + 0.1 * beat(t, 1 / 2, id * 0.07);
      if (s < 2 * POST_SITES) {
        // The posts: four lines round each, leaning in a little toward the top.
        const side = s < POST_SITES ? -1 : 1;
        const q = s % POST_SITES;
        const a = ((q % 4) / 4) * TAU + 0.4;
        const u = (Math.floor(q / 4) + 0.5) / 70;
        const r = 0.55 - 0.1 * u;
        o[0] = xc + side * (post - 0.5 * u) + Math.cos(a) * r;
        o[1] = G + u * beam + u * 1.6;
        o[2] = gz + Math.sin(a) * r;
        [o[3], o[4], o[5]] = scale(VERMILION, 0.5 * glow * breath);
        return true;
      }
      s -= 2 * POST_SITES;
      if (s < LINTEL_SITES) {
        // The lintel: two lines, its ends swept up; its top edge gold.
        const top = s % 2 === 0;
        const u = ((s >> 1) + 0.5) / 90;
        const x = (u * 2 - 1) * wide;
        const lift = 1.1 * Math.abs(x / wide) ** 3;
        o[0] = xc + x;
        o[1] = G + lintel + lift - (top ? 0 : 0.7);
        o[2] = gz;
        [o[3], o[4], o[5]] = scale(
          top ? mix(C.gold, VERMILION, 0.3) : VERMILION,
          0.55 * glow * breath,
        );
        return true;
      }
      s -= LINTEL_SITES;
      if (s < BEAM_SITES) {
        const u = (s + 0.5) / BEAM_SITES;
        o[0] = xc + (u * 2 - 1) * (post + 0.9);
        o[1] = G + beam;
        o[2] = gz;
        [o[3], o[4], o[5]] = scale(VERMILION, 0.45 * glow * breath);
        return true;
      }
      s -= BEAM_SITES;
      if (s < 24) {
        // The strut and its plaque between the beams.
        if (s < 8) {
          o[0] = xc;
          o[1] = G + beam + ((s + 0.5) / 8) * (lintel - 0.7 - beam);
        } else {
          const e = ((s - 8 + 0.5) / 16) * 4;
          const k = Math.floor(e);
          const f = e - k;
          const [px, py] =
            k === 0
              ? [-1 + 2 * f, -1]
              : k === 1
                ? [1, -1 + 2 * f]
                : k === 2
                  ? [1 - 2 * f, 1]
                  : [-1, 1 - 2 * f];
          o[0] = xc + px * 0.9;
          o[1] = G + (beam + lintel - 0.7) / 2 + py * 1.1;
        }
        o[2] = gz;
        [o[3], o[4], o[5]] = scale(C.gold, 0.5 * glow);
        return true;
      }
      s -= 24;
      // Two paper lanterns hanging from the lower beam, swaying slowly, warm.
      const side = s < 14 ? -1 : 1;
      const q = fibonacciLite(s % 14, 14);
      const sway = 0.12 * Math.sin(t * 0.55 + id + side);
      o[0] = xc + side * 4.6 + q[0] * 0.6;
      o[1] = G + beam - 2.2 + q[1] * 0.8;
      o[2] = gz + q[2] * 0.6 + sway;
      [o[3], o[4], o[5]] = scale(mix(C.warm, C.amber, 0.3), (0.35 + 0.25 * glow) * breath);
      return true;
    },
  };
}
/** A point of a small sphere, spread evenly (the golden angle). */
function fibonacciLite(i: number, n: number): Vec3 {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.39996;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

/** The welcome over the opening road, its words in the bold face, gold drifting to warm white. */
export function welcomeSign(xc: number, z: number, key: number): WordSign {
  const text = 'WELCOME TO THE\nCITY OF DREAMS';
  const px = 0.42;
  const T = textPixels(text, { face: 'deco' });
  return {
    text,
    at: [xc - (T.w * px) / 2, G + 29 + T.h * px, z],
    px,
    rgb: C.gold,
    rgb2: mix(C.gold, C.white, 0.55),
    frameRgb: C.gold,
    key,
    face: 'deco',
    frame: 'box',
  };
}
/* ---------- the city's names, all round it ---------- */

/**
 * The names the city gives itself on its big banners (2026-11-13: "u can put more banners liek
 * city of dreams. city of hope etc...all around the city."): its own words, no brand's.
 */
export const CITY_NAMES = [
  'CITY OF DREAMS',
  'CITY OF HOPE',
  'CITY OF LIGHT',
  'CITY OF PEACE',
  'CITY OF LOVE',
  'CITY OF JOY',
  'CITY OF FRIENDS',
] as const;
/** A name set on two lines, "CITY OF" over its word: for a roof or a tower's face. */
export const twoLines = (name: string) => name.replace('CITY OF ', 'CITY OF\n');

export type NameBanner = {
  text: string;
  /** The middle of its foot: it stands across z, its letters running along x. */
  x: number;
  y: number;
  z: number;
  px: number;
  face: FaceId;
  /** Its district's hue, and the hue a slow wave drifts toward along its letters. */
  rgb: RGB;
  rgb2: RGB;
  key: number;
  /** The widest it may be: its pixel shrinks to fit. */
  maxW?: number;
};
/**
 * One of the city's name banners, as the welcome is: centred on its x, its foot at its y, framed,
 * reading from both sides, its colour drifting slowly between its two hues (never a flash).
 */
export function nameBanner(b: NameBanner): WordSign {
  const T = textPixels(b.text, { face: b.face });
  const px = b.maxW ? Math.min(b.px, b.maxW / T.w) : b.px;
  return {
    text: b.text,
    at: [b.x - (T.w * px) / 2, b.y + T.h * px, b.z],
    px,
    rgb: b.rgb,
    rgb2: b.rgb2,
    frameRgb: mix(b.rgb, C.white, 0.2),
    key: b.key,
    face: b.face,
    frame: 'box',
  };
}

/** The wall a board on the opening road hangs from: the avenue's own, standing out over it. */
export const avenueWall = (xc: number) => (side: -1 | 1, w: number) =>
  side < 0 ? xc - AVENUE + 0.3 : xc + AVENUE - 0.3 - w;
