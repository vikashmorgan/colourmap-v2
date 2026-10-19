import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /sql — the SQL & Business Intelligence class (MSE-DIM01-4), for the
 * signed-in user.
 *
 * Asked for 2026-10-19: "a page in School for the SQL sessions 1, 2, 3 for
 * studying it, minimalistic so not overwhelming, with the three dots,
 * comments, questions and a notepad." One self-contained HTML file,
 * content/sql/index.html, served like /coding and /git so it keeps its own
 * layout. Its marks and notes go through /api/coding, under keys that start
 * with sql|. Logged-out visitors are sent to sign in and brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'sql', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/sql');
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
