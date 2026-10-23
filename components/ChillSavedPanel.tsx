'use client';

import { useCallback, useEffect, useState } from 'react';

import { useChillAccount } from '@/components/ChillAccountContext';
import {
  type ChillMix,
  type ChillRecording,
  deleteMix,
  deleteRecording,
  listMixes,
  listRecordings,
  saveMix,
  updateMix,
} from '@/lib/chill/account-api';

/*
 * Saved mixes and recordings for a signed-in Chill Machine account.
 * Guests see one quiet line pointing at email sign-in.
 */
export type ChillSavedPanelProps = {
  /** The current mix settings, saved as-is when the user taps Save. */
  getSettings: () => Record<string, unknown>;
  /** Called with a saved mix's settings when the user taps Load. */
  onLoadMix: (settings: Record<string, unknown>) => void;
};

const INK = '#5C3018';
const LINE = 'rgba(92,48,24,0.18)';
const ERROR = '#8A2E1C';

function defaultTitle(now = new Date()) {
  return `Mix ${now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${now
    .toTimeString()
    .slice(0, 5)}`;
}

function extensionFor(mimeType: string) {
  return mimeType.startsWith('audio/mp4') ? 'm4a' : 'webm';
}

function safeFileName(title: string) {
  return (
    title
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'chill'
  );
}

export default function ChillSavedPanel({ getSettings, onLoadMix }: ChillSavedPanelProps) {
  const { user } = useChillAccount();

  if (!user) {
    return (
      <p className="text-sm opacity-80" style={{ color: INK }}>
        <a href="/chill/login" className="underline underline-offset-4">
          Sign in with email
        </a>{' '}
        to keep your mixes and recordings
      </p>
    );
  }

  return <SavedLists getSettings={getSettings} onLoadMix={onLoadMix} />;
}

function SavedLists({ getSettings, onLoadMix }: ChillSavedPanelProps) {
  const [mixes, setMixes] = useState<ChillMix[] | null>(null);
  const [recordings, setRecordings] = useState<ChillRecording[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : 'Something went wrong');
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMixes(), listRecordings()])
      .then(([m, r]) => {
        if (cancelled) return;
        setMixes(m);
        setRecordings(r);
      })
      .catch((err: unknown) => {
        if (!cancelled) fail(err);
      });
    return () => {
      cancelled = true;
    };
  }, [fail]);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveMix(newTitle.trim() || defaultTitle(), getSettings());
      setMixes((prev) => [saved, ...(prev ?? [])]);
      setNewTitle('');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onRename() {
    if (!renaming) return;
    const title = renaming.title.trim();
    if (!title) return;
    setError(null);
    try {
      const updated = await updateMix(renaming.id, { title });
      setMixes((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)));
      setRenaming(null);
    } catch (err) {
      fail(err);
    }
  }

  async function onDeleteMix(id: string) {
    setError(null);
    try {
      await deleteMix(id);
      setMixes((prev) => (prev ?? []).filter((m) => m.id !== id));
    } catch (err) {
      fail(err);
    }
  }

  async function onDeleteRecording(id: string) {
    setError(null);
    try {
      await deleteRecording(id);
      setRecordings((prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch (err) {
      fail(err);
    }
  }

  const buttonClass = 'text-sm underline-offset-4 hover:underline disabled:opacity-50';

  return (
    <div className="space-y-6 text-sm" style={{ color: INK }}>
      <section aria-labelledby="chill-saved-mixes">
        <h3 id="chill-saved-mixes" className="mb-2 text-base font-semibold">
          Saved mixes
        </h3>
        <div className="flex gap-2">
          <input
            aria-label="Mix name"
            placeholder="Name this mix"
            value={newTitle}
            maxLength={120}
            onChange={(e) => setNewTitle(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-1"
            style={{ borderColor: LINE }}
          />
          <button type="button" onClick={onSave} disabled={busy} className={buttonClass}>
            Save current
          </button>
        </div>
        {mixes === null ? (
          <p className="mt-2 opacity-70">Loading…</p>
        ) : mixes.length === 0 ? (
          <p className="mt-2 opacity-70">No saved mixes yet.</p>
        ) : (
          <ul className="mt-2">
            {mixes.map((mix) => (
              <li
                key={mix.id}
                className="flex items-center gap-3 border-b py-2"
                style={{ borderColor: LINE }}
              >
                {renaming?.id === mix.id ? (
                  <>
                    <input
                      aria-label="New name"
                      value={renaming.title}
                      maxLength={120}
                      onChange={(e) => setRenaming({ id: mix.id, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void onRename();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      className="min-w-0 flex-1 rounded-lg border bg-transparent px-2 py-1"
                      style={{ borderColor: LINE }}
                    />
                    <button type="button" onClick={onRename} className={buttonClass}>
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate">{mix.title}</span>
                    <button
                      type="button"
                      onClick={() => onLoadMix(mix.settings)}
                      className={buttonClass}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming({ id: mix.id, title: mix.title })}
                      className={buttonClass}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${mix.title}`}
                      onClick={() => onDeleteMix(mix.id)}
                      className={buttonClass}
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="chill-saved-recordings">
        <h3 id="chill-saved-recordings" className="mb-2 text-base font-semibold">
          Recordings
        </h3>
        {recordings === null ? (
          <p className="opacity-70">Loading…</p>
        ) : recordings.length === 0 ? (
          <p className="opacity-70">No saved recordings yet.</p>
        ) : (
          <ul>
            {recordings.map((rec) => (
              <li key={rec.id} className="border-b py-2" style={{ borderColor: LINE }}>
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate">{rec.title}</span>
                  {rec.url ? (
                    <a
                      href={rec.url}
                      download={`${safeFileName(rec.title)}.${extensionFor(rec.mimeType)}`}
                      className={buttonClass}
                    >
                      Download
                    </a>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Delete ${rec.title}`}
                    onClick={() => onDeleteRecording(rec.id)}
                    className={buttonClass}
                  >
                    Delete
                  </button>
                </div>
                {rec.url ? (
                  // biome-ignore lint/a11y/useMediaCaption: user-made instrumental audio has no captions
                  <audio controls preload="none" src={rec.url} className="mt-2 w-full" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p role="alert" style={{ color: ERROR }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
