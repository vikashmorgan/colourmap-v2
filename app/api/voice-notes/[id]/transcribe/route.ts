import { NextResponse } from 'next/server';

import { jsonError, withAuthenticatedUser } from '@/lib/api/route-helpers';
import {
  attachReading,
  claimForTranscription,
  getVoiceNote,
  markFailed,
} from '@/lib/services/voice-notes';
import { createClient } from '@/lib/supabase/server';
import { transcribe } from '@/lib/transcribe';

export const BUCKET = 'recordings';

/*
 * A voice note is minutes of speech, and Gemini is not instant. The default
 * serverless timeout will cut a long note off mid-read and leave the row
 * claimed, which is the one state this design must not get stuck in.
 */
export const maxDuration = 120;

/**
 * Read one voice note.
 *
 * Deliberately a separate request from creating the note. Capture returns as
 * soon as the audio is safe; understanding happens afterwards and is allowed
 * to fail, be slow, or be retried tomorrow from a different machine. Folding
 * the two together would make a slow model able to lose a thought, which is
 * the exact failure this whole change exists to remove.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await context.params;

    const existing = await getVoiceNote(user.id, id);
    if (!existing) return jsonError('not found', 404);
    if (existing.status === 'transcribed') return NextResponse.json(existing);

    /*
     * Claim before doing anything expensive. Returns null when the note is not
     * `captured` — already claimed, or failed and not yet reopened — and that
     * is a conflict rather than an error, because the right response is to
     * leave the other reader alone.
     */
    const claimed = await claimForTranscription(user.id, id);
    if (!claimed) return jsonError('already being read, or needs reopening first', 409);

    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(existing.storagePath);

    if (error || !data) {
      const failed = await markFailed(user.id, id, error?.message ?? 'audio not found in storage');
      return NextResponse.json(failed, { status: 502 });
    }

    const audio = new Uint8Array(await data.arrayBuffer());
    const result = await transcribe(audio, data.type || 'audio/webm');

    if (!result.ok) {
      /*
       * Failure is written down, and the response is 200 with the row rather
       * than an error status. The request did what it was asked: it tried, and
       * the note now says why it did not work. The audio is untouched and the
       * note is retryable, so treating this as a server error would tell the
       * client something worse happened than did.
       */
      const failed = await markFailed(user.id, id, result.error);
      return NextResponse.json(failed);
    }

    const row = await attachReading(user.id, id, result.reading);
    return NextResponse.json(row);
  });
}
