import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { getRequiredEnv } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  // Forward the request path to server components (the app layout reads
  // `x-pathname` to allow logged-out "visitor" access to the public visuals at
  // /geometry-field). Rebuilt after cookie mutations so the refreshed session
  // cookies are preserved alongside the header.
  const headersWithPath = () => {
    const headers = new Headers(request.headers);
    headers.set('x-pathname', request.nextUrl.pathname);
    return headers;
  };

  let response = NextResponse.next({
    request: { headers: headersWithPath() },
  });

  const supabase = createServerClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: { headers: headersWithPath() },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return response;
}
