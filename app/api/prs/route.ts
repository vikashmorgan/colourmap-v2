import { NextResponse } from 'next/server';

import { jsonError, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { listPullRequests } from '@/lib/github';

export async function GET() {
  return withAuthenticatedUser(async () => {
    try {
      return NextResponse.json(await listPullRequests());
    } catch (cause) {
      /*
       * A missing token is the ordinary state until somebody adds one, so it
       * answers with a sentence rather than a stack trace. 503 and not 500 —
       * nothing is broken, a dependency simply is not configured.
       */
      const message = cause instanceof Error ? cause.message : 'could not reach GitHub';
      return jsonError(message, message.includes('GITHUB_TOKEN') ? 503 : 502);
    }
  });
}
