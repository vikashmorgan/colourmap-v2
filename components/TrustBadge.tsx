'use client';

import { useEffect, useRef, useState } from 'react';

import {
  type ChangelogEntry,
  CONFIDENCE_DEFINITION,
  type Confidence,
  daysSince,
  type Source,
} from '@/lib/geopolitics-content';

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  HIGH: '#5fb27a',
  MED: '#e0a445',
  LOW: '#d77a52',
};

const QUALITY_LABEL: Record<NonNullable<Source['quality']>, string> = {
  primary: 'PRIMARY',
  secondary: 'SECONDARY',
  blog: 'BLOG',
};

type Props = {
  confidence: Confidence;
  lastVerified: string;
  sources: Source[];
  changelog?: ChangelogEntry[];
  now?: Date;
};

export default function TrustBadge({ confidence, lastVerified, sources, changelog, now }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const days = daysSince(lastVerified, now);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        data-testid="trust-badge-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          border: `1px solid ${CONFIDENCE_COLOR[confidence]}`,
          borderRadius: 999,
          background: 'rgba(255,248,231,0.62)',
          color: '#2a1d0e',
          cursor: 'pointer',
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.1em',
          padding: '4px 10px',
          textTransform: 'uppercase',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: CONFIDENCE_COLOR[confidence],
          }}
        />
        {confidence} confidence · {days}d ago · {sources.length} src
        <span aria-hidden="true" style={{ marginLeft: 4, opacity: 0.7 }}>
          ⓘ
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Trust chain"
          data-testid="trust-badge-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 30,
            minWidth: 280,
            maxWidth: 360,
            border: `1px solid ${CONFIDENCE_COLOR[confidence]}`,
            background: 'rgba(255,248,231,0.98)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(20,16,12,0.18)',
            padding: '12px 14px',
            display: 'grid',
            gap: 10,
            fontFamily: 'var(--font-serif)',
          }}
        >
          <header style={{ display: 'grid', gap: 4 }}>
            <p style={smallLabel}>trust chain</p>
            <p
              style={{
                margin: 0,
                color: '#1f1408',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              <span style={{ color: CONFIDENCE_COLOR[confidence] }}>● {confidence}</span> ·{' '}
              {CONFIDENCE_DEFINITION[confidence]}
            </p>
          </header>

          <div data-testid="trust-sources" style={{ display: 'grid', gap: 6 }}>
            <p style={smallLabel}>sources</p>
            <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'grid', gap: 5 }}>
              {sources.map((source) => (
                <li
                  key={source.ref}
                  style={{ fontSize: 12, color: 'rgba(34,28,20,0.86)', lineHeight: 1.4 }}
                >
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: '#2a1d0e', textDecoration: 'underline' }}
                  >
                    {source.title}
                  </a>{' '}
                  · <span style={{ opacity: 0.7 }}>{source.date}</span>
                  {source.quality && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: '1px 6px',
                        border: '1px solid rgba(122,84,56,0.42)',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        color: '#2a1d0e',
                        background: 'rgba(255,243,217,0.5)',
                      }}
                    >
                      {QUALITY_LABEL[source.quality]}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div data-testid="trust-changelog" style={{ display: 'grid', gap: 4 }}>
            <p style={smallLabel}>
              last verified · {lastVerified} ({days}d ago)
            </p>
            {changelog && changelog.length > 0 ? (
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'grid', gap: 4 }}>
                {changelog
                  .slice()
                  .sort((a, b) => (a.at < b.at ? 1 : -1))
                  .map((entry) => (
                    <li
                      key={entry.at}
                      style={{ fontSize: 12, color: 'rgba(34,28,20,0.74)', lineHeight: 1.45 }}
                    >
                      <span style={{ color: '#2a1d0e', fontWeight: 700 }}>{entry.at}</span> —{' '}
                      {entry.note}
                    </li>
                  ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(34,28,20,0.66)' }}>
                No changelog yet. Page hasn&apos;t been revised since first publication.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const smallLabel = {
  margin: 0,
  color: 'rgba(82,58,38,0.66)',
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
};
