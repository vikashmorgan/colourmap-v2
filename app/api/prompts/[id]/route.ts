import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { deletePrompt, isStatus, updatePrompt } from '@/lib/services/prompts';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await context.params;

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;

    const { status, prUrl, note } = parsed.value as Record<string, unknown>;

    if (status !== undefined && !isStatus(status)) {
      return jsonError('unknown status', 400);
    }

    const row = await updatePrompt(user.id, id, {
      ...(status !== undefined ? { status } : {}),
      ...(prUrl !== undefined ? { prUrl: typeof prUrl === 'string' ? prUrl : null } : {}),
      ...(note !== undefined ? { note: typeof note === 'string' ? note : null } : {}),
    });

    if (!row) return jsonError('not found, or nothing to change', 404);
    return NextResponse.json(row);
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await context.params;
    const row = await deletePrompt(user.id, id);
    if (!row) return jsonError('not found', 404);
    return NextResponse.json(row);
  });
}
