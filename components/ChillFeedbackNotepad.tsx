'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

/*
 * Notes for Martin — the Chill Machine's feedback, as a paper notepad sliding
 * up from the bottom rather than a form.
 *
 * The draft autosaves to this browser while people type (closing loses
 * nothing). Guests may leave a name, remembered here too. Sent notes are kept
 * in a short local list ("your sent notes", last 20). The hidden `website`
 * field is a honeypot the API quietly drops.
 */

export const DRAFT_KEY = 'colourmap:chill-feedback-draft';
export const NAME_KEY = 'colourmap:chill-feedback-name';
export const SENT_KEY = 'colourmap:chill-feedback-sent';

const SAVE_DELAY_MS = 400;
const MAX_SENT = 20;
const MAX_MESSAGE = 2000;
const LINE = 28;

const PAPER = '#FBF6EC';
const INK = '#5C3018';
const RULE = 'rgba(92, 48, 24, 0.14)';
const RED = '#B23A2E';
const SERIF = 'Georgia, "Times New Roman", serif';

const TOO_MANY = "That's a lot of notes for one hour — try again a bit later";

type SentNote = { message: string; at: string };
type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string };

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null || value === '') window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked (private mode) — the note still works, it just isn't kept.
  }
}

function readSent(): SentNote[] {
  const raw = readStorage(SENT_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (note): note is SentNote =>
        typeof note === 'object' &&
        note !== null &&
        typeof (note as SentNote).message === 'string' &&
        typeof (note as SentNote).at === 'string',
    );
  } catch {
    return [];
  }
}

const buttonBase: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 16,
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  lineHeight: 1.5,
};

type Props = {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  palette?: string;
};

export default function ChillFeedbackNotepad({ open, onClose, signedIn, palette }: Props) {
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [sent, setSent] = useState<SentNote[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(readStorage(DRAFT_KEY) ?? '');
    setName(readStorage(NAME_KEY) ?? '');
    setSent(readSent());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => writeStorage(DRAFT_KEY, draft), SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [draft, loaded]);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const message = draft.trim();
  const sending = status.kind === 'sending';

  const send = async () => {
    if (!message || sending) return;
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/chill/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          name: signedIn ? undefined : name.trim() || undefined,
          palette,
          website,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        const error =
          res.status === 429
            ? TOO_MANY
            : typeof body?.error === 'string'
              ? body.error
              : 'Could not send — try again';
        setStatus({ kind: 'error', message: error });
        return;
      }
      const next = [{ message, at: new Date().toISOString() }, ...sent].slice(0, MAX_SENT);
      setSent(next);
      writeStorage(SENT_KEY, JSON.stringify(next));
      setDraft('');
      writeStorage(DRAFT_KEY, null);
      setStatus({ kind: 'sent' });
      textareaRef.current?.focus();
    } catch {
      setStatus({ kind: 'error', message: 'Could not send — check your connection' });
    }
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(40, 24, 12, 0.35)', zIndex: 60 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chill-notepad-title"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 61,
          maxHeight: '85vh',
          overflowY: 'auto',
          margin: '0 auto',
          maxWidth: 640,
          background: PAPER,
          color: INK,
          fontFamily: SERIF,
          borderRadius: '14px 14px 0 0',
          boxShadow: '0 -8px 32px rgba(40, 24, 12, 0.25)',
          padding: '24px 24px 32px',
        }}
      >
        <h2
          id="chill-notepad-title"
          style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 400, lineHeight: 1.2 }}
        >
          Notes for Martin
        </h2>

        <textarea
          ref={textareaRef}
          aria-label="Your note"
          value={draft}
          maxLength={MAX_MESSAGE}
          placeholder="What would make the Chill Machine better?"
          onChange={(event) => {
            setDraft(event.target.value);
            if (status.kind !== 'idle' && status.kind !== 'sending') setStatus({ kind: 'idle' });
          }}
          rows={8}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            minHeight: LINE * 8 + 16,
            resize: 'vertical',
            border: 'none',
            outline: 'none',
            padding: '8px 4px',
            fontFamily: SERIF,
            fontSize: 16,
            lineHeight: `${LINE}px`,
            color: INK,
            backgroundColor: 'transparent',
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${
              LINE - 1
            }px, ${RULE} ${LINE - 1}px, ${RULE} ${LINE}px)`,
            backgroundPosition: '0 8px',
            backgroundAttachment: 'local',
          }}
        />

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        />

        {!signedIn && (
          <label
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginTop: 12,
              fontSize: 14,
            }}
          >
            Name (optional)
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(event) => {
                setName(event.target.value);
                writeStorage(NAME_KEY, event.target.value.trim());
              }}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                borderBottom: `1px solid ${RULE}`,
                background: 'transparent',
                fontFamily: SERIF,
                fontSize: 16,
                color: INK,
                padding: '4px 0',
                outline: 'none',
              }}
            />
          </label>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            onClick={send}
            disabled={!message || sending}
            style={{
              ...buttonBase,
              background: INK,
              color: PAPER,
              border: `1px solid ${INK}`,
              opacity: !message || sending ? 0.5 : 1,
              cursor: !message || sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : 'Send to Martin'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...buttonBase,
              background: 'transparent',
              color: INK,
              border: `1px solid ${RULE}`,
            }}
          >
            Keep writing
          </button>
        </div>

        <div aria-live="polite" style={{ minHeight: 24, marginTop: 12, fontSize: 14 }}>
          {status.kind === 'sent' && <span>Sent — thank you</span>}
          {status.kind === 'error' && (
            <span role="alert" style={{ color: RED }}>
              {status.message}
            </span>
          )}
        </div>

        {sent.length > 0 && (
          <section aria-label="Your sent notes" style={{ marginTop: 24, fontSize: 13 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 400, opacity: 0.8 }}>
              Your sent notes
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {sent.map((note) => (
                <li key={`${note.at}-${note.message.slice(0, 16)}`} style={{ opacity: 0.8 }}>
                  <span style={{ marginRight: 8, fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(note.at).toLocaleDateString()}
                  </span>
                  {note.message.length > 140 ? `${note.message.slice(0, 140)}…` : note.message}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
