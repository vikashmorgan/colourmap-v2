/*
 * A small pixel font for the City's word signs (BANK, BAR, HOTEL, METRO, RACE, the districts'
 * names, "WELCOME TO THE CITY OF DREAMS"): Latin capitals and digits, five pixels wide and seven
 * high, written here as bits, so no font file is needed and they read the same everywhere.
 */

const ROWS: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11110 00001 00001 01110 00001 00001 11110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  '-': '00000 00000 00000 11111 00000 00000 00000',
};
export const FONT_W = 5;
export const FONT_H = 7;
const ADVANCE = 6;
const SPACE = 4;
const LINE = 10;

/** Whether the font has a character (space aside). */
export const hasChar = (ch: string) => ch in ROWS;

export type Text = { px: Float32Array; w: number; h: number };
const cache = new Map<string, Text>();

/**
 * The lit pixels of some words, as column and row from the top left, lines split by '\n' and each
 * centred; with the whole block's width and height in pixels.
 */
export function textPixels(text: string): Text {
  const had = cache.get(text);
  if (had) return had;
  const lines = text.toUpperCase().split('\n');
  const width = (l: string) =>
    [...l].reduce((s, ch) => s + (ch === ' ' ? SPACE : ADVANCE), 0) - (l.length ? 1 : 0);
  const w = Math.max(...lines.map(width));
  const out: number[] = [];
  lines.forEach((l, n) => {
    let x = Math.floor((w - width(l)) / 2);
    for (const ch of l) {
      const rows = ROWS[ch];
      if (rows) {
        rows.split(' ').forEach((row, r) => {
          for (let c = 0; c < FONT_W; c++) if (row[c] === '1') out.push(x + c, n * LINE + r);
        });
      }
      x += ch === ' ' ? SPACE : ADVANCE;
    }
  });
  const t = { px: new Float32Array(out), w, h: (lines.length - 1) * LINE + FONT_H };
  cache.set(text, t);
  return t;
}
