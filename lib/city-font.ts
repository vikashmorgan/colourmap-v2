/*
 * The City's pixel faces for its word signs (BANK, BAR, HOTEL, METRO, RACE, the districts' names,
 * "WELCOME TO THE CITY OF DREAMS", the posters, the hanging boards): Latin capitals, digits and a
 * little punctuation, written here as bits, so no font file is needed and they read the same
 * everywhere.
 *
 * 2026-11-13: "check how banner typos can be better." / "work on different typos. pancartes like
 * chinatown ones. affiches publicitaires. cool pancartes."
 *
 * Four faces, each legible on its own:
 * - `sign`: the plain one, five wide and seven high;
 * - `tall`: condensed and tall (four wide, nine high, M W T V X Y five), for neon and narrow boards;
 * - `deco`: the plain one made bold (every stroke two pixels wide), for the big banners;
 * - `brush`: the plain one drawn with a broad nib held at 45°, for the hanging boards.
 * Letters are spaced by what they hold (an I is narrower than an M), a pair whose shapes leave
 * room (L and T, A and T) set a pixel closer, words a little over half a letter apart. `fill` adds
 * a light halfway along every stroke, so the words read as lines, not dots, from far off.
 */

type Face = { h: number; glyphs: Record<string, string[]>; space: number };

const rows = (s: string) => s.split(' ');

/** The plain face: five wide (punctuation narrower), seven high. */
const SIGN: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11100 10010 10001 10001 10001 10010 11100',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '111 010 010 010 010 010 111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 11001 10101 10011 10011 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 01010 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '010 110 010 010 010 010 111',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11110 00001 00001 01110 00001 00001 11110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  '-': '0000 0000 0000 1111 0000 0000 0000',
  '.': '0 0 0 0 0 0 1',
  ',': '00 00 00 00 00 01 10',
  "'": '1 1 0 0 0 0 0',
  '’': '1 1 0 0 0 0 0',
  '!': '1 1 1 1 1 0 1',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  '&': '01100 10010 10100 01000 10101 10010 01101',
  ':': '0 1 0 0 0 1 0',
  '/': '001 001 010 010 010 100 100',
  '+': '000 000 010 111 010 000 000',
  '·': '0 0 0 1 0 0 0',
};

/** The tall face: condensed, nine high. */
const TALL: Record<string, string> = {
  A: '0110 1001 1001 1001 1111 1001 1001 1001 1001',
  B: '1110 1001 1001 1001 1110 1001 1001 1001 1110',
  C: '0110 1001 1000 1000 1000 1000 1000 1001 0110',
  D: '1110 1001 1001 1001 1001 1001 1001 1001 1110',
  E: '1111 1000 1000 1000 1110 1000 1000 1000 1111',
  F: '1111 1000 1000 1000 1110 1000 1000 1000 1000',
  G: '0110 1001 1000 1000 1011 1001 1001 1001 0111',
  H: '1001 1001 1001 1001 1111 1001 1001 1001 1001',
  I: '111 010 010 010 010 010 010 010 111',
  J: '0011 0001 0001 0001 0001 0001 1001 1001 0110',
  K: '1001 1001 1010 1010 1100 1010 1010 1001 1001',
  L: '1000 1000 1000 1000 1000 1000 1000 1000 1111',
  M: '10001 11011 10101 10101 10001 10001 10001 10001 10001',
  N: '1001 1001 1101 1101 1011 1011 1001 1001 1001',
  O: '0110 1001 1001 1001 1001 1001 1001 1001 0110',
  P: '1110 1001 1001 1001 1110 1000 1000 1000 1000',
  Q: '0110 1001 1001 1001 1001 1001 1101 1010 0101',
  R: '1110 1001 1001 1001 1110 1100 1010 1001 1001',
  S: '0111 1000 1000 1000 0110 0001 0001 0001 1110',
  T: '11111 00100 00100 00100 00100 00100 00100 00100 00100',
  U: '1001 1001 1001 1001 1001 1001 1001 1001 0110',
  V: '10001 10001 10001 10001 10001 01010 01010 00100 00100',
  W: '10001 10001 10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 01010 00100 01010 01010 10001 10001',
  Y: '10001 10001 01010 01010 00100 00100 00100 00100 00100',
  Z: '1111 0001 0001 0010 0110 0100 1000 1000 1111',
  '0': '0110 1001 1001 1011 1101 1001 1001 1001 0110',
  '1': '010 110 010 010 010 010 010 010 111',
  '2': '0110 1001 0001 0001 0010 0100 1000 1000 1111',
  '3': '1110 0001 0001 0001 0110 0001 0001 0001 1110',
  '4': '0010 0110 1010 1010 1010 1111 0010 0010 0010',
  '5': '1111 1000 1000 1110 0001 0001 0001 1001 0110',
  '6': '0110 1000 1000 1110 1001 1001 1001 1001 0110',
  '7': '1111 0001 0001 0010 0010 0100 0100 0100 0100',
  '8': '0110 1001 1001 1001 0110 1001 1001 1001 0110',
  '9': '0110 1001 1001 1001 0111 0001 0001 0001 0110',
  '-': '000 000 000 000 111 000 000 000 000',
};

/** The plain face made bold: every lit pixel lights the one to its right too. */
const bold = (r: string[]) =>
  r.map((row) =>
    [...`${row}0`].map((c, i) => (c === '1' || row[i - 1] === '1' ? '1' : '0')).join(''),
  );
/** The plain face drawn with a broad nib at 45°: every lit pixel lights the one below-right too. */
const nib = (r: string[]) => {
  const w = (r[0] as string).length + 1;
  const at = (x: number, y: number) => (r[y] ?? '')[x] === '1';
  return Array.from({ length: r.length + 1 }, (_, y) =>
    Array.from({ length: w }, (_, x) => (at(x, y) || at(x - 1, y - 1) ? '1' : '0')).join(''),
  );
};
const table = (t: Record<string, string>, f: (r: string[]) => string[] = (r) => r) =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, f(rows(v))]));

export type FaceId = 'sign' | 'tall' | 'deco' | 'brush';
const FACES: Record<FaceId, Face> = {
  sign: { h: 7, glyphs: table(SIGN), space: 3 },
  tall: { h: 9, glyphs: table(TALL), space: 3 },
  deco: { h: 7, glyphs: table(SIGN, bold), space: 4 },
  brush: { h: 8, glyphs: table(SIGN, nib), space: 4 },
};
/** Every face, by name. */
export const FACE_IDS = Object.keys(FACES) as FaceId[];

export const FONT_W = 5;
export const FONT_H = 7;
/** The space between letters, and between lines (under the face's height). */
const GAP = 1;
const LEADING = 3;

/** A face's glyph for a character: its own, or the plain face's set on its baseline. */
function glyphOf(face: FaceId, ch: string): string[] | null {
  const F = FACES[face];
  const own = F.glyphs[ch];
  if (own) return own;
  const base = FACES.sign.glyphs[ch];
  if (!base) return null;
  const w = (base[0] as string).length;
  return [...Array.from({ length: Math.max(0, F.h - base.length) }, () => '0'.repeat(w)), ...base];
}

/** Whether a face has a character (space aside). */
export const hasChar = (ch: string, face: FaceId = 'sign') => glyphOf(face, ch) !== null;
/** The characters of some words a face cannot draw (spaces and line breaks aside). */
export const missingChars = (text: string, face: FaceId = 'sign') =>
  [...new Set([...text.toUpperCase()])].filter(
    (ch) => ch !== ' ' && ch !== '\n' && !hasChar(ch, face),
  );

/** A glyph's empty columns at the left and right of each row (its full width where a row is empty). */
function edges(g: string[]): { l: number[]; r: number[] } {
  const w = (g[0] as string).length;
  return {
    l: g.map((row) => (row.includes('1') ? row.indexOf('1') : w)),
    r: g.map((row) => (row.includes('1') ? w - 1 - row.lastIndexOf('1') : w)),
  };
}
/**
 * Kerning: one pixel closer where, on every row, the two letters leave at least a pixel between
 * them even then (L then T, A then T, T then J), so the spacing looks even, not mechanical.
 */
export function kern(a: string[], b: string[]): number {
  const A = edges(a);
  const B = edges(b);
  const n = Math.max(a.length, b.length);
  for (let y = 0; y < n; y++) if ((A.r[y] ?? 9) + (B.l[y] ?? 9) < 1) return 0;
  return 1;
}

export type Text = { px: Float32Array; w: number; h: number };
export type TextOptions = {
  face?: FaceId;
  /** Stacked top to bottom, one letter a row, each centred: a hanging board's. */
  vertical?: boolean;
  /** A light halfway along every stroke between lit pixels: words read as lines from far off. */
  fill?: boolean;
};
const cache = new Map<string, Text>();

/**
 * The lit pixels of some words, as column and row from the top left (fractional where `fill`
 * adds the strokes' halfway lights), lines split by '\n' and each centred; with the whole block's
 * width and height in pixels.
 */
export function textPixels(text: string, opt: TextOptions = {}): Text {
  const face = opt.face ?? 'sign';
  const key = `${face}|${opt.vertical ? 1 : 0}|${opt.fill ? 1 : 0}|${text}`;
  const had = cache.get(key);
  if (had) return had;
  const F = FACES[face];
  const lit = new Set<number>();
  const pts: [number, number][] = [];
  const put = (x: number, y: number) => {
    const k = y * 4096 + x;
    if (lit.has(k)) return;
    lit.add(k);
    pts.push([x, y]);
  };
  const draw = (g: string[], x: number, y: number) =>
    g.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '1') put(x + c, y + r);
    });
  const lines = text.toUpperCase().split('\n');
  let w = 0;
  let h = 0;
  if (opt.vertical) {
    // One letter a row, each centred on the column; a line break starts a new column to the right.
    const colW = Math.max(
      ...[...text.toUpperCase()].map((ch) => (glyphOf(face, ch)?.[0] ?? '').length),
      1,
    );
    lines.forEach((l, n) => {
      let y = 0;
      for (const ch of l) {
        const g = glyphOf(face, ch);
        if (g) draw(g, n * (colW + 3) + Math.floor((colW - (g[0] as string).length) / 2), y);
        y += g ? F.h + 2 : F.space + 1;
      }
      h = Math.max(h, y - 2);
    });
    w = lines.length * (colW + 3) - 3;
  } else {
    const layout = (l: string) => {
      const out: { g: string[]; x: number }[] = [];
      let x = 0;
      let prev: string[] | null = null;
      for (const ch of l) {
        const g = ch === ' ' ? null : glyphOf(face, ch);
        if (!g) {
          x += F.space + GAP;
          prev = null;
          continue;
        }
        if (prev) x -= kern(prev, g);
        out.push({ g, x });
        x += (g[0] as string).length + GAP;
        prev = g;
      }
      return { out, w: Math.max(0, x - GAP) };
    };
    const laid = lines.map(layout);
    w = Math.max(...laid.map((l) => l.w));
    laid.forEach((l, n) => {
      const x0 = Math.floor((w - l.w) / 2);
      for (const { g, x } of l.out) draw(g, x0 + x, n * (F.h + LEADING));
    });
    h = (lines.length - 1) * (F.h + LEADING) + F.h;
  }
  const out: number[] = [];
  for (const [x, y] of pts) out.push(x, y);
  if (opt.fill) {
    const on = (x: number, y: number) => lit.has(y * 4096 + x);
    for (const [x, y] of pts) {
      if (on(x + 1, y)) out.push(x + 0.5, y);
      if (on(x, y + 1)) out.push(x, y + 0.5);
      // Diagonal strokes too, where no straight neighbour already joins them.
      for (const dx of [1, -1])
        if (on(x + dx, y + 1) && !on(x + dx, y) && !on(x, y + 1)) out.push(x + dx * 0.5, y + 0.5);
    }
  }
  const t = { px: new Float32Array(out), w, h };
  if (cache.size > 512) cache.clear();
  cache.set(key, t);
  return t;
}
