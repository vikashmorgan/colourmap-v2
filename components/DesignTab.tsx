'use client';

import { GOLD } from '@/lib/grid';

/*
 * DESIGN I / II, top left of the G menu's tree and wheel (2026-10-30): "a
 * design tab to go from one tree to the next".
 */

export type Design = 1 | 2;
/** The wheel has a third (2026-11-08): the compass rose. */
export type Design3 = 1 | 2 | 3;

/** The tree has a fourth (2026-11-10): the 3D tree comes in as II. */
export type Design4 = 1 | 2 | 3 | 4;

export const parseDesign = (raw: string | null): Design => (raw === '2' ? 2 : 1);
export const parseDesign3 = (raw: string | null): Design3 =>
  raw === '3' ? 3 : raw === '2' ? 2 : 1;

/**
 * The tree's design, from what is stored under its new key, or else under the
 * old one from when there were three (2026-11-10): the 3D tree came in as II,
 * so an old II (the willow) is now III and an old III (the banyan) IV. The
 * same look comes back either way.
 */
export function parseDesign4(raw: string | null, old: string | null = null): Design4 {
  if (raw === '1' || raw === '2' || raw === '3' || raw === '4') return Number(raw) as Design4;
  return old === '3' ? 4 : old === '2' ? 3 : 1;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const WORDS = ['', 'one', 'two', 'three', 'four'];

type Props<D extends Design4> = {
  label: string;
  design: D;
  pick: (d: D) => void;
  /** Which designs to offer; I and II unless said. */
  options?: readonly D[];
};

export function DesignTab<D extends Design4>({
  label,
  design,
  pick,
  options = [1, 2] as unknown as readonly D[],
}: Props<D>) {
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
      {options.map((d) => {
        const on = design === d;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={`Design ${WORDS[d]}`}
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
            {ROMAN[d]}
          </button>
        );
      })}
    </fieldset>
  );
}
