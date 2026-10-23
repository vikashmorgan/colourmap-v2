import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { createChillMix, listChillMixes, parseMixInput } from '@/lib/services/chill-mixes';

/*
 * Saved Chill Machine mixes of the signed-in user.
 *   GET   → ChillMix[] (newest change first)
 *   POST  { title, settings } → ChillMix (201)
 */
export async function GET() {
  return withAuthenticatedUser(async (user) => {
    return NextResponse.json(await listChillMixes(user.id));
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = parseMixInput(bodyResult.value);
    if (!parsed.ok) return jsonError(parsed.error, parsed.status);

    const row = await createChillMix(user.id, parsed.value);
    return NextResponse.json(row, { status: 201 });
  });
}
