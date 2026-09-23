import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { createPrompt, listOpen, listPrompts, MAX_BODY } from '@/lib/services/prompts';

const MAX_LIMIT = 100;

export async function GET(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const params = new URL(request.url).searchParams;
    const limit = Math.min(Number(params.get('limit')) || 50, MAX_LIMIT);

    const rows =
      params.get('open') === '1'
        ? await listOpen(user.id, limit)
        : await listPrompts(user.id, limit);

    return NextResponse.json(rows);
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;

    const { body } = parsed.value as Record<string, unknown>;

    if (typeof body !== 'string' || !body.trim()) {
      return jsonError('a prompt needs words', 400);
    }

    /*
     * Length is capped rather than rejected. Somebody who dictated four
     * thousand characters into a phone should not lose all of it to a
     * validation error — the truncation is visible in the list, and losing
     * the tail is recoverable in a way that losing the whole thing is not.
     */
    const row = await createPrompt(user.id, body);
    return NextResponse.json(row, { status: 201 });
  });
}

export { MAX_BODY };
