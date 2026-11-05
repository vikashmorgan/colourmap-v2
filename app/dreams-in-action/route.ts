import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /dreams-in-action — the user's own writing in School, for the signed-in user.
 *
 * Asked for 2026-11-05: "a segment in School called Criticism, where I can
 * write my ideas. We will break them into blocks." Renamed the same day: "just
 * call it Dreams in Action, not Criticism." One self-contained HTML
 * file, content/dreams-in-action/index.html, served like the classes so it keeps its
 * own layout. Its ideas go through /api/coding/notes, under keys that start
 * with dreams|. Logged-out visitors are sent to sign in and brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'dreams-in-action', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/dreams-in-action');
    return NextResponse.redirect(login);
  }

  const html = await readFile(PAGE_PATH, 'utf8');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Personal page behind a session: never cached by a shared cache.
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'DENY',
    },
  });
}
