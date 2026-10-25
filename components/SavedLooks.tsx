'use client';

import { useEffect, useState } from 'react';

import {
  allLooks,
  type LookValues,
  makeLook,
  readSaved,
  removeLook,
  type SavedLook,
  writeSaved,
} from '@/lib/geometry-saved';

/*
 * The Geometry Builder's saved looks (lib/geometry-saved.ts): a row of chips
 * under the sliders. Tap one to bring it back, "+ Save" keeps what is on
 * screen now, × deletes one you saved (the built-in ones stay).
 */

type Props = {
  current: { mode: string; values: LookValues; oilColors?: string[]; preset?: string };
  /** What a new look is named after, e.g. the mode's name. */
  baseName: string;
  onApply: (look: SavedLook) => void;
  accent: string;
  accentMid: string;
  dim: string;
};

export default function SavedLooks({ current, baseName, onApply, accent, accentMid, dim }: Props) {
  const [saved, setSaved] = useState<SavedLook[]>([]);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  const looks = allLooks(saved);

  const save = () => {
    const look = makeLook(current, baseName, looks, Date.now());
    const next = [...saved, look];
    setSaved(next);
    writeSaved(next);
    setJustSaved(look.id);
  };

  const remove = (id: string) => {
    const next = removeLook(saved, id);
    setSaved(next);
    writeSaved(next);
  };

  const chip: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 32,
    borderRadius: 99,
    border: `1px solid ${accentMid}`,
    background: 'transparent',
    color: accent,
    fontFamily: 'var(--font-serif)',
    fontSize: 12,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  };

  return (
    <section aria-label="Saved looks" style={{ display: 'grid', gap: 6 }}>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: dim,
        }}
      >
        Saved
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {looks.map((l) => (
          <span
            key={l.id}
            style={{
              ...chip,
              padding: 0,
              background: justSaved === l.id ? accentMid : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => onApply(l)}
              style={{ ...chip, border: 'none', padding: '0 12px', background: 'transparent' }}
            >
              {l.name}
            </button>
            {!l.builtIn && (
              <button
                type="button"
                onClick={() => remove(l.id)}
                aria-label={`Delete ${l.name}`}
                style={{
                  ...chip,
                  border: 'none',
                  padding: '0 10px 0 2px',
                  background: 'transparent',
                  color: dim,
                }}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <button
          type="button"
          onClick={save}
          style={{ ...chip, padding: '0 12px', borderStyle: 'dashed' }}
        >
          + Save
        </button>
      </div>
    </section>
  );
}
