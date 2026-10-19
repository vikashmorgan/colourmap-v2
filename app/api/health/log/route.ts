import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { HealthLogValidationError, listLog, writeLog } from '@/lib/services/health-log';

/*
 * The /health page's day log, for the signed-in user.
 *
 *   GET  → { entries: [ { day, key, value, updatedAt } ] }
 *   PUT  { entries: [ { day, key, value | null } ] }  → { ok: true }
 *
 * PUT takes a list so one request carries one tick or a whole offline queue.
 */

export async function GET() {
  return withAuthenticatedUser(async (user) =>
    NextResponse.json({ entries: await listLog(user.id) }),
  );
}

export async function PUT(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const { entries } = (bodyResult.value ?? {}) as Record<string, unknown>;
    try {
      await writeLog(user.id, entries);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof HealthLogValidationError) return jsonError(error.message, 400);
      throw error;
    }
  });
}
