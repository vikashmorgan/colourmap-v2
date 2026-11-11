import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /pandas — the Pandas & Data Manipulation class, for the signed-in user.
 *
 * Asked for 2026-11-11: "add these to pandas as a new class in school, using
 * the same system as in statistics, but trying to not make it too long". One
 * self-contained HTML file, content/pandas/index.html, served like /statistics
 * so it keeps its own layout. Its marks and notes go through /api/coding, under
 * keys that start with pandas|. Logged-out visitors are sent to sign in and
 * brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'pandas', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/pandas');
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
