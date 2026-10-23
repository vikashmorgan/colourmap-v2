import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { deleteChillMix, isUuid, parseMixPatch, updateChillMix } from '@/lib/services/chill-mixes';

type Params = { params: Promise<{ id: string }> };

/*
 * One saved mix, scoped to its owner (another user's id answers 404).
 *   PATCH  { title?, settings? } → ChillMix
 *   DELETE → { deleted: id }
 */
export async function PATCH(request: Request, { params }: Params) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    if (!isUuid(id)) return jsonError('Not found', 404);
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = parseMixPatch(bodyResult.value);
    if (!parsed.ok) return jsonError(parsed.error, parsed.status);

    const row = await updateChillMix(user.id, id, parsed.value);
    if (!row) return jsonError('Not found', 404);
    return NextResponse.json(row);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    if (!isUuid(id)) return jsonError('Not found', 404);
    const row = await deleteChillMix(user.id, id);
    if (!row) return jsonError('Not found', 404);
    return NextResponse.json({ deleted: id });
  });
}
