import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /health — knee, shoulder and feet, day by day, for the signed-in user.
 *
 * One self-contained page (content/health/index.html), served like /coding and
 * /school so it keeps its own layout; on this origin its ticks, feelings and
 * notes sync through /api/health with the same session. Logged-out visitors
 * are sent to sign in and brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'health', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/health');
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
