'use client';

import { GOLD } from '@/lib/grid';

/*
 * DESIGN I / II, top left of the G menu's tree and wheel (2026-10-30): "a
 * design tab to go from one tree to the next".
 */

export type Design = 1 | 2;

export const parseDesign = (raw: string | null): Design => (raw === '2' ? 2 : 1);

type Props = { label: string; design: Design; pick: (d: Design) => void };

export function DesignTab({ label, design, pick }: Props) {
  return (
    <fieldset
      aria-label={label}
      style={{
        position: 'absolute',
        top: 64,
        left: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'auto',
        zIndex: 3,
        margin: 0,
        padding: 0,
        border: 'none',
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: '0.22em', color: '#6d6450', marginRight: 4 }}>
        DESIGN
      </span>
      {([1, 2] as const).map((d) => {
        const on = design === d;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={`Design ${d === 1 ? 'one' : 'two'}`}
            onClick={() => pick(d)}
            style={{
              minHeight: 32,
              minWidth: 36,
              padding: '0 10px',
              borderRadius: 999,
              border: `1px solid ${on ? GOLD : '#4a4234'}`,
              background: on ? `${GOLD}22` : 'transparent',
              color: on ? GOLD : '#8a7d62',
              fontFamily: 'inherit',
              fontSize: 11,
              letterSpacing: '0.2em',
              cursor: 'pointer',
            }}
          >
            {d === 1 ? 'I' : 'II'}
          </button>
        );
      })}
    </fieldset>
  );
}
