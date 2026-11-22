'use client';

/*
 * The G tree's two columns (lib/tree-columns.ts): Priorities on the left of the tree, Mood ·
 * Feeling · Emotion · Body on the right. Quiet: small caps headings, the words in the serif, a
 * thin bar where a level is known, nothing counted. Each line leads to Focus (/day), where they
 * are written. Wide screens only; on a phone the tree has the width.
 */

import { useEffect, useState } from 'react';

import {
  type CheckIn,
  type Mission,
  type Objective,
  type Priority,
  priorities,
  type StateLine,
  stateLines,
  whenLabel,
} from '@/lib/tree-columns';

const GOLD = '#e2b04a';
const quiet = 'rgba(255,244,225,';
const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

async function getJson<T>(url: string): Promise<T[]> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? (j as T[]) : [];
  } catch {
    return [];
  }
}

export function TreeColumns({ go }: { go: (href: string) => void }) {
  const [left, setLeft] = useState<Priority[] | null>(null);
  const [right, setRight] = useState<StateLine[] | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      getJson<Objective>('/api/daily-objectives'),
      getJson<Mission>('/api/missions'),
      getJson<CheckIn>('/api/check-ins'),
    ]).then(([o, m, c]) => {
      if (!live) return;
      setLeft(priorities(o, m));
      setRight(stateLines(c));
    });
    return () => {
      live = false;
    };
  }, []);

  const heading = {
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    color: GOLD,
    marginBottom: 14,
  } as const;
  const line = {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '5px 0',
    cursor: 'pointer',
    fontFamily: serif,
    fontSize: 15,
    lineHeight: 1.35,
    color: `${quiet}0.85)`,
  } as const;

  return (
    <>
      <style>{`
        .tree-col { position: absolute; top: 50%; transform: translateY(-50%); width: 240px; z-index: 30;
          animation: tc-in 700ms ease-out both; }
        .tree-col button:hover span:first-child { color: ${GOLD}; }
        @keyframes tc-in { from { opacity: 0 } to { opacity: 1 } }
        .tree-col.left { left: max(32px, calc(50% - 640px)); }
        .tree-col.right { right: max(32px, calc(50% - 640px)); }
        @media (max-width: 1100px) { .tree-col { display: none } }
        @media (prefers-reduced-motion: reduce) { .tree-col { animation: none } }
      `}</style>
      <nav aria-label="Priorities" className="tree-col left" data-testid="tree-priorities">
        <div style={heading}>Priorities</div>
        {left?.length === 0 && (
          <button
            type="button"
            style={{ ...line, color: `${quiet}0.45)` }}
            onClick={() => go('/day')}
          >
            <span>Nothing set. Set one</span>
          </button>
        )}
        {left?.map((p) => (
          <button
            type="button"
            key={`${p.text}-${p.when}`}
            style={{ ...line, textAlign: 'left' }}
            onClick={() => go('/day')}
          >
            <span>{p.text}</span>
            {p.when && (
              <span
                style={{ fontFamily: mono, fontSize: 10, marginLeft: 8, color: `${quiet}0.4)` }}
              >
                {whenLabel(p.when)}
              </span>
            )}
          </button>
        ))}
      </nav>
      <nav
        aria-label="Mood, feeling, emotion and body"
        className="tree-col right"
        style={{ textAlign: 'right' }}
        data-testid="tree-state"
      >
        <div style={heading}>Mood · Feeling · Emotion · Body</div>
        {right?.length === 0 && (
          <button
            type="button"
            style={{ ...line, color: `${quiet}0.45)` }}
            onClick={() => go('/day')}
          >
            <span>No check-in yet. Check in</span>
          </button>
        )}
        {right?.map((l) => (
          <button
            type="button"
            key={l.label}
            style={{ ...line, textAlign: 'right' }}
            onClick={() => go('/day')}
          >
            <span
              style={{
                display: 'block',
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: `${quiet}0.4)`,
              }}
            >
              {l.label}
            </span>
            <span>
              {l.colour && (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: l.colour,
                    marginRight: 8,
                    verticalAlign: 'middle',
                  }}
                />
              )}
              {l.word}
            </span>
            {l.level !== null && (
              <span
                aria-hidden="true"
                style={{
                  display: 'block',
                  marginLeft: 'auto',
                  marginTop: 5,
                  width: 120,
                  height: 2,
                  background: `${quiet}0.12)`,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    marginLeft: 'auto',
                    width: `${Math.round(l.level * 100)}%`,
                    height: '100%',
                    background: GOLD,
                    opacity: 0.8,
                  }}
                />
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}
