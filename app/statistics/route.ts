import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /statistics — the Statistics & Probability for Data Science class, for the
 * signed-in user.
 *
 * Asked for 2026-11-05: "use the SQL format and design for this new statistics
 * chapter". One self-contained HTML file, content/statistics/index.html, served
 * like /sql so it keeps its own layout. Its marks and notes go through
 * /api/coding, under keys that start with stats|. Logged-out visitors are sent
 * to sign in and brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'statistics', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/statistics');
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
