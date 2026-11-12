/*
 * The city map's small parts, shared by the engine (CityMap.tsx) and the
 * sheets an adapter fills: the palette, the paper sheet with its lifted
 * shadow, the shape glyphs of the legend, and text with `code` spans.
 */

import type { CSSProperties, ReactNode } from 'react';

import { polygon, star } from '@/lib/city-map';

/*
 * The City of Dreams' light (lib/golden-city.ts): deep saturated gold [1, 0.5, 0.12] to ivory and
 * warm white, on its Dawn twilight. The sheets stay paper, never blue.
 */
export const DAWN = ['#080a24', '#141638', '#2a2240', '#3d2a3a'];
export const SKY = '#080a24';
export const SKY_2 = '#141638';
export const GOLD = '#FF801F';
export const IVORY_GOLD = '#FF8F33';
export const GOLD_LIT = '#FFC780';
export const WHITE_HOT = '#FFE9C7';
export const IVORY = '#F4EAD8';
export const DIM = 'rgba(244, 234, 216, 0.3)';
export const GUIDE = 'rgba(255, 128, 31, 0.1)';
export const PAPER = '#F5ECDC';
export const PAPER_2 = '#EFE2CB';
export const INK = '#5C3018';
export const INK_SOFT = '#7A5A3A';
export const LINE = '#D8C3A0';
export const WARN = '#FF6A3D';
export const SERIF = 'Georgia, "Times New Roman", serif';
export const MONO = 'ui-monospace, "Cascadia Code", Consolas, monospace';

/**
 * A paper sheet in the game's quiet frame (the City player's menu: dark glass, an ivory
 * hairline): a thin dark rim and hairline around the paper; the higher the depth, the more lifted
 * its shadow.
 */
export function paper(depth: number): CSSProperties {
  return {
    background: PAPER,
    color: INK,
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    boxShadow: [
      '0 0 0 4px rgba(20, 14, 24, 0.88)',
      '0 0 0 5px rgba(244, 234, 216, 0.16)',
      `0 ${6 + depth * 6}px ${16 + depth * 14}px rgba(0, 0, 0, ${0.3 + depth * 0.06})`,
    ].join(', '),
  };
}

/** The game's quiet pill: dark glass with an ivory hairline. */
export const gamePill: CSSProperties = {
  font: `600 13px ${'Georgia, "Times New Roman", serif'}`,
  color: '#F4EAD8',
  background: 'rgba(20, 14, 24, 0.55)',
  border: '1px solid rgba(244, 234, 216, 0.2)',
  borderRadius: 999,
  padding: '8px 12px',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  minHeight: 36,
};

/** A row in a sheet that opens something deeper. */
export const rowButton: CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'baseline',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 0,
  borderTop: `1px solid ${LINE}`,
  padding: '12px 0',
  font: `15px/1.45 ${SERIF}`,
  color: INK,
  cursor: 'pointer',
  textDecoration: 'none',
};
export const sheetLink: CSSProperties = {
  color: INK,
  fontWeight: 600,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};
export const sheetHeading: CSSProperties = {
  margin: '8px 0 0',
  font: `600 14px ${SERIF}`,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  letterSpacing: '.02em',
};
export const pill: CSSProperties = {
  font: `600 14px ${SERIF}`,
  color: INK,
  background: PAPER_2,
  border: `1px solid ${LINE}`,
  borderRadius: 999,
  padding: '8px 16px',
  cursor: 'pointer',
};
export const codeBox: CSSProperties = {
  margin: 0,
  padding: '8px 12px',
  background: PAPER_2,
  borderRadius: 8,
  font: `13px/1.5 ${MONO}`,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/** Text with `code` spans. */
export function Inline({ text }: { text: string }) {
  const parts = text.split('`');
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <code
            key={i}
            style={{
              font: `0.92em ${MONO}`,
              background: PAPER_2,
              borderRadius: 4,
              padding: '0 4px',
            }}
          >
            {p}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export type GlyphKind =
  | 'circle'
  | 'star'
  | 'octagon'
  | 'square'
  | 'lit'
  | 'triangle'
  | 'hexagon'
  | 'shelf'
  | 'gate';

/** The shape of one kind of thing, small, for the legend and the sheets. */
export function Glyph({ kind, size = 18 }: { kind: GlyphKind; size?: number }) {
  const s = size;
  const c = s / 2;
  const stroke = { fill: 'none', stroke: INK, strokeWidth: 1.4 };
  const shapes: Record<GlyphKind, ReactNode> = {
    circle: <circle cx={c} cy={c} r={c - 2} {...stroke} />,
    star: <polygon points={star(c, c, c - 1.5)} {...stroke} />,
    octagon: <polygon points={polygon(c, c, c - 1.5, 8, Math.PI / 8)} {...stroke} />,
    square: <rect x={4} y={4} width={s - 8} height={s - 8} {...stroke} />,
    lit: (
      <rect x={4} y={4} width={s - 8} height={s - 8} fill={GOLD} stroke={INK} strokeWidth={1.4} />
    ),
    triangle: (
      <polygon points={polygon(c, c + 1.5, c - 2, 3)} fill="none" stroke={WARN} strokeWidth={1.6} />
    ),
    hexagon: <polygon points={polygon(c, c, c - 2, 6, 0)} {...stroke} />,
    shelf: <rect x={c - 3} y={1.5} width={6} height={s - 3} {...stroke} />,
    gate: <path d={`M3 ${s - 3} V5 H${s - 3} V${s - 3}`} {...stroke} />,
  };
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" style={{ flex: 'none' }}>
      {shapes[kind]}
    </svg>
  );
}
