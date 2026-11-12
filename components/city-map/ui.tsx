/*
 * The city map's small parts, shared by the engine (CityMap.tsx) and the
 * sheets an adapter fills: the palette, the paper sheet with its lifted
 * shadow, the shape glyphs of the legend, and text with `code` spans.
 */

import type { CSSProperties, ReactNode } from 'react';

import { polygon, star } from '@/lib/city-map';

/* golden and ivory on a deep twilight; the sheets are paper, never blue */
export const SKY = '#141B2E';
export const SKY_2 = '#1F2844';
export const GOLD = '#E2B65A';
export const GOLD_LIT = '#F6D98E';
export const IVORY = '#F2E6CC';
export const DIM = 'rgba(242, 230, 204, 0.28)';
export const GUIDE = 'rgba(226, 182, 90, 0.13)';
export const PAPER = '#F5ECDC';
export const PAPER_2 = '#EFE2CB';
export const INK = '#5C3018';
export const INK_SOFT = '#7A5A3A';
export const LINE = '#D8C3A0';
export const WARN = '#E59A6A';
export const SERIF = 'Georgia, "Times New Roman", serif';
export const MONO = 'ui-monospace, "Cascadia Code", Consolas, monospace';

/** A paper sheet; the higher the depth, the more lifted its shadow. */
export function paper(depth: number): CSSProperties {
  return {
    background: PAPER,
    color: INK,
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    boxShadow: `0 ${2 + depth * 4}px ${8 + depth * 10}px rgba(30, 18, 8, ${0.18 + depth * 0.05}), 0 1px 2px rgba(30, 18, 8, 0.2)`,
  };
}

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
