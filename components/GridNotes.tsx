'use client';

import { useCallback, useEffect, useState } from 'react';

import { GOLD } from '@/lib/grid';

/*
 * NOTES IN THE G MENU (2026-11-08): "add ability to take notes in each of
 * these compartments, bottom right, so I can write my reflections on how to
 * develop the grid tree wheel when I am on it, and on each page of the tree
 * or wheel."
 *
 * A small NOTES pill at the bottom right. Each note is filed under where you
 * are when you write it: the look (tree, wheel, terminal) and, inside it, the
 * tree, area or hub you are on. The sheet lists the notes for that place,
 * newest first. Stored with the study pages' notes (/api/coding/notes) under
 * keys starting `grid|`, so they need no table of their own and the terminal
 * can read and answer them.
 */

export type GridPlace = { key: string; label: string };

type Note = {
  id: string;
  itemKey: string;
  body: string;
  answer?: string | null;
  createdAt?: string;
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export function GridNotes({ place }: { place: GridPlace }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [say, setSay] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/coding/notes');
      if (!res.ok) throw new Error(String(res.status));
      const all = ((await res.json()).notes ?? []) as Note[];
      setNotes(all.filter((n) => n.itemKey.startsWith('grid|')));
    } catch {
      setSay('Notes could not be loaded. Are you signed in?');
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const save = async () => {
    const body = text.trim();
    if (!body) return;
    setSay('Saving…');
    try {
      const res = await fetch('/api/coding/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: [{ key: place.key, kind: 'comment', body }] }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const made = ((await res.json()).notes ?? []) as Note[];
      setNotes((all) => [...made, ...all]);
      setText('');
      setSay('Saved.');
    } catch {
      // The words stay in the box, so nothing is lost.
      setSay('Not saved. Are you signed in? Your words are still here.');
    }
  };

  const here = notes
    .filter((n) => n.itemKey === place.key)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="grid-notes"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 14,
          zIndex: 3,
          minHeight: 32,
          padding: '0 12px',
          borderRadius: 999,
          border: `1px solid ${open ? GOLD : '#4a4234'}`,
          background: open ? `${GOLD}22` : 'rgba(5,5,6,0.6)',
          color: open ? GOLD : '#8a7d62',
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: '0.2em',
          cursor: 'pointer',
        }}
      >
        NOTES
      </button>
      {open ? (
        <section
          id="grid-notes"
          aria-label={`Notes on ${place.label}`}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 56,
            zIndex: 3,
            width: 'min(340px, calc(100vw - 32px))',
            maxHeight: 'min(60vh, 460px)',
            overflow: 'auto',
            display: 'grid',
            gap: 8,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${GOLD}55`,
            background: 'rgba(10,9,7,0.94)',
            boxShadow: '0 18px 48px rgb(0 0 0 / .45)',
            fontFamily: MONO,
            color: '#d8ccb0',
          }}
        >
          <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', color: GOLD }}>
            {place.label.toUpperCase()}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            rows={3}
            maxLength={2000}
            aria-label={`A note on ${place.label}`}
            placeholder="How this part should grow…"
            style={{
              resize: 'vertical',
              padding: 8,
              borderRadius: 8,
              border: '1px solid #4a4234',
              background: 'rgba(0,0,0,0.4)',
              color: '#efe3cc',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 13,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={save}
              style={{
                minHeight: 30,
                padding: '0 14px',
                borderRadius: 999,
                border: `1px solid ${GOLD}`,
                background: `${GOLD}22`,
                color: GOLD,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.2em',
                cursor: 'pointer',
              }}
            >
              SAVE
            </button>
            <span role="status" style={{ fontSize: 11, color: '#8a7d62' }}>
              {say}
            </span>
          </div>
          {here.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #3a3326',
                fontFamily: 'system-ui, sans-serif',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {n.body}
              {n.answer ? <p style={{ margin: '6px 0 0', color: '#b9ab8e' }}>{n.answer}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
