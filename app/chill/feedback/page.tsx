import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isOwnerEmail } from '@/lib/auth/owner';
import { listChillFeedback } from '@/lib/db/queries/chill-feedback';
import { createClient } from '@/lib/supabase/server';

/*
 * /chill/feedback — Martin's private list of Notes for Martin. Signed-out
 * visitors go to /login; any other signed-in account sees a plain 404.
 */

export const metadata: Metadata = {
  title: 'Chill notes',
  robots: { index: false, follow: false },
};

const INK = '#5C3018';
const SERIF = 'Georgia, "Times New Roman", serif';

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function ChillFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isOwnerEmail(user.email)) notFound();

  const notes = await listChillFeedback(200);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '48px 16px 64px',
        fontFamily: SERIF,
        color: INK,
        background: '#FBF6EC',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.2, margin: '0 0 32px' }}>
        Notes for Martin
      </h1>
      {notes.length === 0 ? (
        <p style={{ fontSize: 16, opacity: 0.8 }}>No notes yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 24 }}>
          {notes.map((note) => (
            <li
              key={note.id}
              style={{ borderBottom: '1px solid rgba(92, 48, 24, 0.14)', paddingBottom: 16 }}
            >
              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
                {when.format(new Date(note.createdAt))}
                {' · '}
                {note.userId ? (note.email ?? 'signed in') : note.name || 'guest'}
                {note.palette ? ` · ${note.palette}` : ''}
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                {note.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
