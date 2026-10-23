import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /school — the way into every class, for the signed-in user.
 *
 * Asked for 2026-10-16: "the platform for all classes. Call it School, not
 * Coding, and you get a menu with different classes; a third class will be
 * added for SQL." A sober menu page (content/school/index.html) linking to
 * each class's own page: Python (/coding), Git (/git), SQL coming. Served like
 * them, by a route handler, so it keeps its own layout. Logged-out visitors are
 * sent to sign in and brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'school', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/school');
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
