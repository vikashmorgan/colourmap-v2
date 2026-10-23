import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import {
  CodingMarkValidationError,
  getState,
  mergeState,
  saveBox,
} from '@/lib/services/coding-marks';

/*
 * The /coding study page's marks and notes, for the signed-in user.
 *
 *   GET   → { marks: { key: mark }, notes: { key: { text, kind } } }
 *   PUT   { key, mark, note }   save one box; mark and note both null clears it
 *   POST  { marks, notes }      merge boxes recorded in a browser before sign-in
 */

function validationOr500(error: unknown) {
  if (error instanceof CodingMarkValidationError) return jsonError(error.message, 400);
  throw error;
}

export async function GET() {
  return withAuthenticatedUser(async (user) => NextResponse.json(await getState(user.id)));
}

export async function PUT(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const { key, mark, note } = (bodyResult.value ?? {}) as Record<string, unknown>;
    try {
      await saveBox(user.id, key, mark ?? null, note ?? null);
    } catch (error) {
      return validationOr500(error);
    }
    return NextResponse.json({ ok: true });
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const { marks, notes } = (bodyResult.value ?? {}) as Record<string, unknown>;
    try {
      const merged = await mergeState(user.id, marks, notes);
      return NextResponse.json({ merged });
    } catch (error) {
      return validationOr500(error);
    }
  });
}
