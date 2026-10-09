import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { addNotes, CodingNoteValidationError, listNotes } from '@/lib/services/coding-notes';

/*
 * The /coding page's questions and comments, for the signed-in user.
 *
 *   GET   → { notes: [ { id, itemKey, kind, body, answer, readAt, ... } ] }
 *   POST  { notes: [ { key, kind, body } ] }  → { notes: [ created rows ] }
 *
 * POST takes a list so one request can carry a single new note or every note
 * a browser held before it was signed in.
 */

export async function GET() {
  return withAuthenticatedUser(async (user) =>
    NextResponse.json({ notes: await listNotes(user.id) }),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const { notes } = (bodyResult.value ?? {}) as Record<string, unknown>;
    try {
      return NextResponse.json({ notes: await addNotes(user.id, notes) }, { status: 201 });
    } catch (error) {
      if (error instanceof CodingNoteValidationError) return jsonError(error.message, 400);
      throw error;
    }
  });
}
