import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import { createVoiceNote, listPending, listVoiceNotes } from '@/lib/services/voice-notes';

const MAX_LIMIT = 100;
/*
 * Nothing longer than twenty minutes is a voice note; it is a recording, and
 * `api/recordings` already exists for those. The cap is here rather than only
 * in the browser because a duration arrives as a number in a request body and
 * anything that arrives in a request body is a claim, not a fact.
 */
const MAX_DURATION_SECS = 20 * 60;

export async function GET(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const params = new URL(request.url).searchParams;
    const limit = Math.min(Number(params.get('limit')) || 50, MAX_LIMIT);

    const rows =
      params.get('pending') === '1'
        ? await listPending(user.id, limit)
        : await listVoiceNotes(user.id, limit);

    return NextResponse.json(rows);
  });
}

/**
 * Write down that audio exists.
 *
 * The client uploads to storage first and posts here second, which is the
 * order that makes capture unloseable: if this request fails the audio is
 * still in the bucket and can be claimed later, whereas a row created before
 * the upload would point at nothing.
 */
export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;

    const { storagePath, durationSecs } = bodyResult.value as Record<string, unknown>;

    if (typeof storagePath !== 'string' || !storagePath.trim()) {
      return jsonError('storagePath required', 400);
    }

    /*
     * A path is a key into this user's own folder, never a path the caller
     * composes freely. Without this a crafted storagePath makes a row that
     * points at somebody else's object, and the signed URL the app later
     * fetches would hand it over.
     */
    if (!storagePath.startsWith(`${user.id}/`) || storagePath.includes('..')) {
      return jsonError('storagePath must sit under your own folder', 400);
    }

    const duration =
      typeof durationSecs === 'number' && Number.isFinite(durationSecs) && durationSecs >= 0
        ? Math.min(Math.round(durationSecs), MAX_DURATION_SECS)
        : null;

    const row = await createVoiceNote(user.id, {
      storagePath: storagePath.trim(),
      durationSecs: duration,
    });
    return NextResponse.json(row, { status: 201 });
  });
}
