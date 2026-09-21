import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { mergePullRequest } from '@/lib/github';

/**
 * Merge one pull request.
 *
 * The `sha` is required in the body rather than looked up here. It is what
 * makes this a merge of the thing that was READ: if the branch moved between
 * the phone rendering it and the thumb landing, the merge is refused instead
 * of quietly shipping a commit nobody saw.
 */
export async function POST(request: Request, context: { params: Promise<{ number: string }> }) {
  return withAuthenticatedUser(async () => {
    const { number } = await context.params;
    const parsed = Number(number);
    if (!Number.isInteger(parsed) || parsed <= 0) return jsonError('bad pull request number', 400);

    const body = await parseJsonBody(request);
    if (!body.ok) return body.response;

    const { sha } = body.value as Record<string, unknown>;
    if (typeof sha !== 'string' || sha.length < 7) return jsonError('sha required', 400);

    try {
      return NextResponse.json(await mergePullRequest(parsed, sha));
    } catch (cause) {
      /*
       * Every refusal from lib/github is a rule, not a fault — draft, Lane B,
       * checks red, branch moved. 409 says "the state is wrong", which is
       * exactly right, and the message is written to be read on a phone.
       */
      return jsonError(cause instanceof Error ? cause.message : 'merge failed', 409);
    }
  });
}
