'use client';

import { useCallback, useEffect, useState } from 'react';

import MicDot from '@/components/MicDot';

/*
 * THE DOT, AND WHAT OPENS FROM IT.
 *
 * This replaces the AI presence chat behind the same dot, in the same corner.
 * The dot is kept because it is already muscle memory; what changed is what it
 * is for. The chat asked Claude a question and billed per message. This puts
 * something down and costs nothing.
 *
 * TWO DOORS, NOT THREE
 *
 * Build is for the app. Note is for you. An earlier sketch had three
 * compartments — prompts, reflect, notes — and three is a taxonomy: you have
 * to decide what KIND of thought you are having before you may write it, and
 * the thought most worth catching is exactly the one that is all three.
 *
 * Two is a fork: *is this for the app, or for me?* Answerable in under a
 * second, half asleep, which is when this gets used.
 *
 * WHY THE SHEET IS OPAQUE
 *
 * Not decoration. You open this to put something down, and a panel you can
 * read the page through leaves the page competing for attention. Opaque says
 * the rest can wait.
 *
 * WHERE A NOTE GOES
 *
 * To `notebook_entries` — the same store behind the Notes page. One notebook,
 * two doors into it. A second notes table would be precisely the confusion
 * this was asked to avoid.
 */

const OCHRE = '#C4A060';

type Door = 'build' | 'note';

const DOOR_LABEL: Record<Door, string> = { build: 'Build', note: 'Note' };

const PLACEHOLDER: Record<Door, string> = {
  build: 'What should get built?',
  /* Kept from the panel this replaces. It was the best line in the product. */
  note: 'Drop the fragment here. What is happening?',
};

export type Recent = { id: string; text: string };

/**
 * A note needs a title; a fragment does not have one.
 *
 * Taking the first line, or the first few words, rather than asking. Being
 * asked for a title is the moment you decide not to write the note.
 */
export function titleFrom(body: string): string {
  const firstLine = body.trim().split('\n')[0] ?? '';
  if (firstLine.length <= 60) return firstLine;
  const cut = firstLine.slice(0, 60);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 30 ? cut.slice(0, lastSpace) : cut}…`;
}

export default function PresenceSheet() {
  const [open, setOpen] = useState(false);
  const [door, setDoor] = useState<Door>('build');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<Recent[]>([]);

  const load = useCallback(async (which: Door) => {
    try {
      const url = which === 'build' ? '/api/prompts?limit=5' : '/api/notebook';
      const response = await fetch(url);
      if (!response.ok) return setRecent([]);
      const rows = (await response.json()) as Record<string, string>[];
      setRecent(
        rows.slice(0, 5).map((row) => ({
          id: row.id as string,
          text: which === 'build' ? (row.body ?? '') : (row.title ?? ''),
        })),
      );
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (open) void load(door);
  }, [open, door, load]);

  /* Escape closes it. A sheet with no keyboard way out is a trap. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function put() {
    const body = text.trim();
    if (!body || busy) return;

    setBusy(true);
    setError('');

    const request =
      door === 'build'
        ? fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body }),
          })
        : fetch('/api/notebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'capture', title: titleFrom(body), content: body }),
          });

    const response = await request;
    setBusy(false);

    if (!response.ok) {
      setError('could not save it — the text is still here');
      return;
    }

    /*
     * The field clears only on success. Losing dictated text to a failed
     * request is the same class of failure the voice rebuild existed to stop.
     */
    setText('');
    void load(door);
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1190,
            border: 'none',
            padding: 0,
            background: 'rgba(28,22,16,0.42)',
            cursor: 'pointer',
          }}
        />
      )}

      {open && (
        <section
          aria-label="Put something down"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            margin: '0 auto',
            maxWidth: 520,
            borderRadius: '20px 20px 0 0',
            /* Opaque. Nothing of the page shows through. */
            background: 'var(--card, #fdf7e9)',
            borderTop: '1px solid var(--border)',
            padding: '14px 16px calc(18px + env(safe-area-inset-bottom))',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {(['build', 'note'] as Door[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDoor(value)}
                aria-pressed={door === value}
                style={{
                  minHeight: 44,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  /* A door is a control, so it never takes the ochre. */
                  background: door === value ? 'var(--muted)' : 'transparent',
                  color: 'inherit',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 14,
                  fontWeight: door === value ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {DOOR_LABEL[value]}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER[door]}
              rows={4}
              style={{
                flex: 1,
                resize: 'none',
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'inherit',
                padding: '10px 12px',
                font: 'inherit',
                fontSize: 15,
                lineHeight: 1.5,
              }}
            />
            <MicDot visible value={text} onTranscript={setText} />
          </div>

          {error ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>{error}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void put()}
            disabled={busy || !text.trim()}
            style={{
              minHeight: 44,
              borderRadius: 14,
              border: 'none',
              background: text.trim() ? OCHRE : 'var(--muted)',
              color: text.trim() ? '#2a1c08' : 'var(--muted-foreground)',
              fontSize: 15,
              fontWeight: 600,
              cursor: text.trim() ? 'pointer' : 'default',
            }}
          >
            {busy ? 'Putting it down…' : 'Put it down'}
          </button>

          {recent.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: 'var(--muted-foreground)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  · {entry.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close' : 'Put something down'}
        style={{
          position: 'fixed',
          right: 16,
          /* Clears the All one brain bar rather than sitting on it. */
          bottom: 'calc(58px + env(safe-area-inset-bottom))',
          zIndex: 1210,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '1px solid var(--border)',
          background: OCHRE,
          color: '#2a1c08',
          fontSize: 22,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span aria-hidden="true">{open ? '×' : '+'}</span>
      </button>
    </>
  );
}
