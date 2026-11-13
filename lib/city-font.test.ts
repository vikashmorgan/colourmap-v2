import { describe, expect, it } from 'vitest';
import { EMBASSY_SIGN } from './city-embassy';
import { FACE_IDS, type FaceId, hasChar, kern, missingChars, textPixels } from './city-font';
import { DISTRICTS, SIGN_STRINGS } from './city-game';
import { BOARD_WORDS, brandLines, POSTERS, welcomeSign } from './city-signs';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** A glyph's bits, read back from the font as one string per letter. */
function bitsOf(ch: string, face: FaceId): string {
  const T = textPixels(ch, { face });
  return [...T.px].join(',');
}

describe('the city’s pixel faces (2026-11-13: "check how banner typos can be better")', () => {
  it('draws every character of every sign the city writes, in the face it writes it in', () => {
    const uses: [string, FaceId][] = [
      ...SIGN_STRINGS.map((s) => [s, 'deco'] as [string, FaceId]),
      ...SIGN_STRINGS.map((s) => [s, 'tall'] as [string, FaceId]),
      ...Object.values(DISTRICTS).map((d) => [d.name.toUpperCase(), 'deco'] as [string, FaceId]),
      [welcomeSign(0, 0, 0).text, 'deco'],
      [EMBASSY_SIGN, 'deco'],
      ['SHARK\nSIMULATOR', 'tall'],
      ...POSTERS.flatMap(
        ([b, l]) =>
          [
            [brandLines(b), 'deco'],
            [l, 'tall'],
          ] as [string, FaceId][],
      ),
      ...BOARD_WORDS.map((w) => [w, 'brush'] as [string, FaceId]),
      ['METRO', 'sign'],
      ['RACE', 'sign'],
    ];
    for (const [text, face] of uses)
      expect(missingChars(text, face), `${text} in ${face}`).toEqual([]);
    for (const face of FACE_IDS) for (const ch of ALPHABET) expect(hasChar(ch, face)).toBe(true);
  });

  it('keeps every letter distinct in every face: no two read alike', () => {
    for (const face of FACE_IDS) {
      const seen = new Map<string, string>();
      for (const ch of ALPHABET) {
        // O and 0 are told apart by the zero's slash; I and 1 by the one's flag.
        const b = bitsOf(ch, face);
        expect(seen.get(b), `${ch} and ${seen.get(b)} in ${face}`).toBeUndefined();
        seen.set(b, ch);
      }
    }
  });

  it('sets letters by what they hold, and a pair that leaves room a pixel closer', () => {
    const I = textPixels('I');
    const M = textPixels('M');
    expect(I.w).toBeLessThan(M.w);
    const L = ['10000', '10000', '10000', '10000', '10000', '10000', '11111'];
    const T = ['11111', '00100', '00100', '00100', '00100', '00100', '00100'];
    const O = ['01110', '10001', '10001', '10001', '10001', '10001', '01110'];
    expect(kern(L, T)).toBe(1);
    expect(kern(O, O)).toBe(0);
    expect(textPixels('LT').w).toBe(textPixels('HT').w - 1);
    // Words are set a little over half a letter apart.
    expect(textPixels('A A').w - textPixels('AA').w).toBeGreaterThanOrEqual(3);
  });

  it('keeps its lights inside the words’ block, fills the strokes, and stacks a board’s word', () => {
    for (const face of FACE_IDS) {
      const plain = textPixels('WELCOME TO THE\nCITY OF DREAMS', { face });
      const filled = textPixels('WELCOME TO THE\nCITY OF DREAMS', { face, fill: true });
      // The strokes' halfway lights: half as many again, at least.
      expect(filled.px.length).toBeGreaterThan(plain.px.length * 1.5);
      for (let i = 0; i < filled.px.length; i += 2) {
        expect(filled.px[i]).toBeGreaterThanOrEqual(0);
        expect(filled.px[i]).toBeLessThan(filled.w);
        expect(filled.px[i + 1]).toBeLessThan(filled.h);
      }
    }
    const v = textPixels('HOTEL', { face: 'brush', vertical: true });
    expect(v.h).toBeGreaterThan(4 * v.w);
    // Each face keeps one height: a tall face is taller than the plain one.
    expect(textPixels('A', { face: 'tall' }).h).toBeGreaterThan(textPixels('A').h);
    expect(textPixels('A', { face: 'tall' }).w).toBeLessThan(textPixels('A').w);
  });
});
