import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { CodingNoteValidationError, editNote, removeNote } from '@/lib/services/coding-notes';

/*
 *   PATCH  { body?, kind?, read? }  edit one note, or mark its answer read
 *   DELETE                           remove one note
 */

type Context = { params: Promise<{ id: string }> };

function validationOr(error: unknown) {
  if (error instanceof CodingNoteValidationError) return jsonError(error.message, 400);
  throw error;
}

export async function PATCH(request: Request, context: Context) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await context.params;
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    try {
      const note = await editNote(user.id, id, bodyResult.value);
      if (!note) return jsonError('note not found', 404);
      return NextResponse.json({ note });
    } catch (error) {
      return validationOr(error);
    }
  });
}

export async function DELETE(_request: Request, context: Context) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await context.params;
    try {
      await removeNote(user.id, id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return validationOr(error);
    }
  });
}
