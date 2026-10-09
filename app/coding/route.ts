import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /coding — the Python course study page, for the signed-in user.
 *
 * The page is one self-contained HTML file (content/coding/index.html, also
 * published on its own at coding-vikash.vercel.app). Served from here it sits
 * on Colour Brain's origin, so its marks and notes sync through
 * /api/coding/marks with the same Google session. Logged-out visitors are sent
 * to sign in and brought back.
 *
 * It is a route handler rather than an app screen because the page brings its
 * own layout, styles and script; wrapping it in the app shell would fight it.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'coding', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/coding');
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
