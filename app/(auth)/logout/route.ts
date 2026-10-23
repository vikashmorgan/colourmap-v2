import { NextResponse } from 'next/server';

import { getSafeRedirectPath } from '@/lib/supabase/paths';
import { createClient } from '@/lib/supabase/server';

async function readNext(request: Request): Promise<string> {
  const fromQuery = new URL(request.url).searchParams.get('next');
  if (fromQuery) return getSafeRedirectPath(fromQuery);
  try {
    const form = await request.formData();
    const next = form.get('next')?.toString() ?? null;
    return next ? getSafeRedirectPath(next) : '/login';
  } catch {
    return '/login';
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  // 303 so the browser follows the form POST with a GET.
  return NextResponse.redirect(new URL(await readNext(request), request.url), 303);
}
