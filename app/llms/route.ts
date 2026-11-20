import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/*
 * /llms — the LLMs class (MSEDIM017, Eugenio Lomurno), for the signed-in user.
 *
 * Asked for 2026-11-20: "LLMs new class in school". Session 2, linear regression:
 * training a model and measuring its error. Built on the Pandas page's system, one
 * self-contained HTML file, content/llms/index.html. Its marks and notes go
 * through /api/coding, under keys that start with llms|. Logged-out visitors are
 * sent to sign in and brought back.
 */
const PAGE_PATH = path.join(process.cwd(), 'content', 'llms', 'index.html');

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', '/llms');
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
