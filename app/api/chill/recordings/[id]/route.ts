import { NextResponse } from 'next/server';

import { jsonError, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { isUuid } from '@/lib/services/chill-mixes';
import {
  deleteChillRecording,
  getChillRecording,
  RECORDINGS_BUCKET,
} from '@/lib/services/chill-recordings';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

/*
 * DELETE → { deleted: id }. Removes the audio file, then the row. Another
 * user's recording answers 404.
 */
export async function DELETE(_request: Request, { params }: Params) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    if (!isUuid(id)) return jsonError('Not found', 404);

    const row = await getChillRecording(user.id, id);
    if (!row) return jsonError('Not found', 404);

    const supabase = await createClient();
    const { error } = await supabase.storage.from(RECORDINGS_BUCKET).remove([row.storagePath]);
    if (error) return jsonError(error.message, 502);

    await deleteChillRecording(user.id, id);
    return NextResponse.json({ deleted: id });
  });
}
