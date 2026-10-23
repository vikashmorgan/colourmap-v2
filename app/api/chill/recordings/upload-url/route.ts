import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import {
  baseRecordingMime,
  checkRecordingSize,
  chillRecordingPath,
  RECORDINGS_BUCKET,
} from '@/lib/services/chill-recordings';
import { createClient } from '@/lib/supabase/server';

/*
 * POST { mimeType, size } → { storagePath, token }
 *
 * Step one of a direct-to-Storage upload: the server picks the path inside the
 * user's own folder and signs a one-time upload for it. The browser then sends
 * the file straight to Supabase (uploadToSignedUrl) and registers it with
 * POST /api/chill/recordings. Keeps large takes off the app server.
 */
export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const body = (bodyResult.value ?? {}) as Record<string, unknown>;

    const mime = baseRecordingMime(body.mimeType);
    if (!mime) return jsonError('Recording must be audio/mp4 or audio/webm', 400);

    const size = checkRecordingSize(body.size);
    if (!size.ok) return jsonError(size.error, size.status);

    const storagePath = chillRecordingPath(user.id, crypto.randomUUID(), mime);
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data) return jsonError(error?.message ?? 'Could not start the upload', 502);

    return NextResponse.json({ storagePath: data.path, token: data.token });
  });
}
