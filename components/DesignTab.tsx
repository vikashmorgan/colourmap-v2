'use client';

import { GOLD } from '@/lib/grid';

/*
 * DESIGN I / II, top left of the G menu's tree and wheel (2026-10-30): "a
 * design tab to go from one tree to the next".
 */

export type Design = 1 | 2;
/** The wheel has a third (2026-11-08): the compass rose. */
export type Design3 = 1 | 2 | 3;

export const parseDesign = (raw: string | null): Design => (raw === '2' ? 2 : 1);
export const parseDesign3 = (raw: string | null): Design3 =>
  raw === '3' ? 3 : raw === '2' ? 2 : 1;

/**
 * The tree's design, from what is stored under its key, or else under the old
 * one. There were four (2026-11-10 to 11-11); III and IV, the willow and the
 * banyan, read the pages of II, so they come back as II. Under the old key II
 * and III were the willow and banyan.
 */
export function parseTreeDesign(raw: string | null, old: string | null = null): Design {
  if (raw === '1') return 1;
  if (raw === '2' || raw === '3' || raw === '4') return 2;
  return old === '2' || old === '3' ? 2 : 1;
}

const ROMAN = ['', 'I', 'II', 'III'];
const WORDS = ['', 'one', 'two', 'three'];

type Props<D extends Design3> = {
  label: string;
  design: D;
  pick: (d: D) => void;
  /** Which designs to offer; I and II unless said. */
  options?: readonly D[];
};

export function DesignTab<D extends Design3>({
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
