'use client';

import { type ReactNode, useEffect, useState } from 'react';

/**
 * ChillGroup — the top level of the Chill Machine's two-level folding:
 * SOUND, VISUALS, SONG, + more. A quiet ruled label folds the whole group;
 * each module inside keeps its own closable pill. Open state is remembered
 * per group. Spec: docs/specs/chill-machine-public.md → Layout.
 */
export const CHILL_GROUP_LS = 'colourmap:chill-group:';

export default function ChillGroup({
  id,
  label,
  defaultOpen = true,
  summary,
  children,
}: {
  id: string;
  label: string;
  defaultOpen?: boolean;
  /** Shown beside the label while folded. */
  summary?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHILL_GROUP_LS + id);
      if (saved === '1' || saved === '0') setOpen(saved === '1');
    } catch {}
  }, [id]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CHILL_GROUP_LS + id, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  return (
    <section aria-label={label} className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-2 pt-4 pb-1"
        style={{ background: 'none', border: 'none' }}
      >
        <span aria-hidden="true" className="h-px flex-1" style={{ background: '#C4A06040' }} />
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.32em',
            color: '#8A6A4A',
          }}
        >
          {label}
        </span>
        {!open && summary && (
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              color: '#8A6A4A',
              opacity: 0.8,
            }}
          >
            · {summary}
          </span>
        )}
        <span
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: '#8A6A4A99',
            fontSize: 12,
          }}
        >
          ▾
        </span>
        <span aria-hidden="true" className="h-px flex-1" style={{ background: '#C4A06040' }} />
      </button>
      {open && <div className="animate-in fade-in duration-150 space-y-1">{children}</div>}
    </section>
  );
}

/**
 * ChillModule — one closable pill inside a group (beats, look, sections…),
 * drawn like the Chill Machine's existing section headers. Open state is
 * remembered per module; the summary shows while folded.
 */
export function ChillModule({
  id,
  label,
  summary,
  defaultOpen = false,
  color = '#7A5438',
  children,
}: {
  id: string;
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  color?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${CHILL_GROUP_LS}module:${id}`);
      if (saved === '1' || saved === '0') setOpen(saved === '1');
    } catch {}
  }, [id]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`${CHILL_GROUP_LS}module:${id}`, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  return (
    <div className="px-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
        style={{ background: 'none', border: 'none' }}
      >
        <span
          className="text-center text-base font-bold uppercase tracking-[0.22em]"
          style={{ color }}
        >
          {label}
          {!open && summary ? ` · ${summary}` : ''}
        </span>
        <span
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: `${color}80`,
          }}
        >
          ▾
        </span>
      </button>
      {open && <div className="animate-in fade-in duration-150 pt-1">{children}</div>}
    </div>
  );
}
