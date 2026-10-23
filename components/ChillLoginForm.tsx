'use client';

import { type FormEvent, useState } from 'react';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

const INK = '#5C3018';

/** Email magic-link form for the public Chill Machine (/chill/login). */
export default function ChillLoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ kind: 'error', message: 'Enter your email address' });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/chill/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        setStatus({ kind: 'sent', email: trimmed });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ kind: 'error', message: body.error ?? 'The link could not be sent. Try again.' });
    } catch {
      setStatus({ kind: 'error', message: 'No connection. Try again in a moment.' });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div
        role="status"
        className="rounded-2xl border px-4 py-4 text-sm"
        style={{ borderColor: 'rgba(92,48,24,0.25)' }}
      >
        <p className="font-semibold">Check your inbox — the link signs you in</p>
        <p className="mt-1 opacity-80">We sent it to {status.email}.</p>
        <button
          type="button"
          className="mt-3 underline underline-offset-4"
          onClick={() => setStatus({ kind: 'idle' })}
        >
          Use another email
        </button>
      </div>
    );
  }

  const sending = status.kind === 'sending';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <label className="block text-sm" htmlFor="chill-email">
        Email
      </label>
      <input
        id="chill-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sending}
        className="w-full rounded-xl border bg-transparent px-3 py-2 text-base"
        style={{ borderColor: 'rgba(92,48,24,0.3)', color: INK }}
      />
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
        style={{ background: INK, color: '#F5ECDC' }}
      >
        {sending ? 'Sending…' : 'Send me a link'}
      </button>
      {status.kind === 'error' ? (
        <p role="alert" className="text-sm" style={{ color: '#8A2E1C' }}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
