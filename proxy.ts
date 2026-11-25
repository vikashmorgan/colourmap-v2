import { type NextRequest, NextResponse } from 'next/server';

import { drivePath, isDriveHost } from '@/lib/drive-site';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // The drive game's own site: every page is the game, no session, no login.
  if (isDriveHost(request.headers.get('host'))) {
    const to = drivePath(request.nextUrl.pathname);
    if (!to) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = to;
    return NextResponse.rewrite(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
