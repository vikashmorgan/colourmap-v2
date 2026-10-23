import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /git — the Git course study page (MSE-DIM01-3), for the signed-in user.
 *
 * Asked for 2026-10-15: a page like the Coding app, but sober, with less
 * information: what the project built, what to say to the teacher at the oral
 * defence, the key concepts and the key terms. One self-contained HTML file,
 * content/git/index.html, served the same way as /coding: a route handler, so
 * the page keeps its own layout. Logged-out visitors are sent to sign in and
 * brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'git', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/git');
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
