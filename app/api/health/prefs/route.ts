import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { HealthPrefValidationError, listPrefs, writePrefs } from '@/lib/services/health-prefs';

/*
 * The /health page's standing choices (exercise order, set aside, favourites).
 *
 *   GET  → { prefs: [ { key, value } ] }
 *   PUT  { prefs: [ { key, value | null } ] }  → { ok: true }
 */

export async function GET() {
  return withAuthenticatedUser(async (user) =>
    NextResponse.json({ prefs: await listPrefs(user.id) }),
  );
}

export async function PUT(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const { prefs } = (bodyResult.value ?? {}) as Record<string, unknown>;
    try {
      await writePrefs(user.id, prefs);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof HealthPrefValidationError) return jsonError(error.message, 400);
      throw error;
    }
  });
}
