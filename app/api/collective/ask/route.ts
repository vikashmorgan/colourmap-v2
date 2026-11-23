import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

import {
  parseJsonBody,
  unauthorizedTextResponse,
  withAuthenticatedUser,
} from '@/lib/api/route-helpers';
import { buildPrompt, COLLECTIVE_MODEL, SYSTEM_PROMPT } from '@/lib/collective/prompt';
import { parseAsk } from '@/lib/collective/validate';

/** Ask Claude about a combination of people and their intentions. Signed-in only. */
export async function POST(req: Request) {
  return withAuthenticatedUser(
    async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return new Response('Claude is not connected yet: ANTHROPIC_API_KEY is missing.', {
          status: 503,
        });
      }
      const body = await parseJsonBody(req);
      if (!body.ok) return body.response;
      const input = parseAsk(body.value);
      if (!input.ok) return new Response(input.error, { status: 400 });

      const result = streamText({
        model: anthropic(COLLECTIVE_MODEL),
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(input.value.members, input.value.question),
      });
      return result.toTextStreamResponse();
    },
    { unauthorizedResponse: unauthorizedTextResponse },
  );
}
