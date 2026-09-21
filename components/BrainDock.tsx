'use client';

/*
 * THE BAND ALONG THE BOTTOM.
 *
 * The branch figure started as a block on `/day`, which was wrong for a reason
 * that only became obvious once it was on screen: it is not part of the day. It
 * is the thing the day sits inside. A block scrolls past and is gone; a band
 * along the bottom is present on every surface, which is what an *index* has to
 * be to mean anything.
 *
 * Closed it is one line — the three branch hues and a name. Open it is the
 * circular figure. That is the whole interaction, and it is deliberately the
 * only one: this is furniture, not a feature.
 *
 * WHY IT DOES NOT NAVIGATE.
 *
 * Tapping a branch does not take you anywhere. The dock answers "where am I in
 * all this", and a control that answers that question by moving you somewhere
 * else has changed the subject. Navigation lives in the nav.
 */

import { useEffect, useState } from 'react';

import LatticeTree from '@/components/LatticeTree';
import { BRANCH_HUE, BRANCHES } from '@/lib/branches';

/** Room the dock takes from every page, so nothing hides behind it. */
export const DOCK_HEIGHT = 44;

export default function BrainDock() {
  const [open, setOpen] = useState(false);

  /* Escape closes it. A panel with no keyboard way out is a trap. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        /* The band is the floor; the panel grows up off it. */
        pointerEvents: 'none',
      }}
    >
      {open && (
        <div
          style={{
            pointerEvents: 'auto',
            background: 'var(--background)',
            borderTop: '1px solid var(--border)',
            padding: '14px 12px 4px',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <LatticeTree />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          height: DOCK_HEIGHT,
          padding: '0 16px',
          border: 'none',
          borderTop: '1px solid var(--border)',
          background: 'var(--secondary)',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', gap: 5 }}>
          {BRANCHES.map((branch) => (
            <span
              key={branch}
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: BRANCH_HUE[branch],
              }}
            />
          ))}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          All one brain
        </span>
        <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.55 }}>
          {open ? '▾' : '▴'}
        </span>
      </button>
    </div>
  );
}
