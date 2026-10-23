import { NextResponse } from 'next/server';

import { jsonError, parseJsonBody, withAuthenticatedUser } from '@/lib/api/route-helpers';
import {
  baseRecordingMime,
  type ChillRecordingRow,
  checkRecordingSize,
  chillRecordingPath,
  createChillRecording,
  isOwnChillPath,
  listChillRecordings,
  parseRecordingMeta,
  RECORDINGS_BUCKET,
  SIGNED_URL_SECONDS,
} from '@/lib/services/chill-recordings';
import { createClient } from '@/lib/supabase/server';

/*
 * Saved Chill Machine recordings of the signed-in user.
 *
 *   GET   → (ChillRecording & { url })[]   url signed for an hour
 *   POST  multipart: file, title, mimeType, durationSecs, palette, cues (JSON)
 *         → uploads through this route. Fine for short takes, but hosting
 *         platforms cap request bodies (Vercel: 4.5 MB), so the browser uses:
 *   POST  JSON { storagePath, title, mimeType, durationSecs, palette, cues }
 *         → registers a file already uploaded through ./upload-url.
 *
 * Only audio/mp4 (.m4a) and audio/webm (.webm), at most 200 MB (413 above).
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function withSignedUrl(supabase: Supabase, row: ChillRecordingRow) {
  const { data } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(row.storagePath, SIGNED_URL_SECONDS);
  return { ...row, url: data?.signedUrl ?? null };
}

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const rows = await listChillRecordings(user.id);
    if (rows.length === 0) return NextResponse.json([]);
    const supabase = await createClient();
    const signed = await supabase.storage.from(RECORDINGS_BUCKET).createSignedUrls(
      rows.map((r) => r.storagePath),
      SIGNED_URL_SECONDS,
    );
    if (signed.error) return jsonError(signed.error.message, 502);
    return NextResponse.json(
      rows.map((row, i) => ({ ...row, url: signed.data?.[i]?.signedUrl ?? null })),
    );
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.startsWith('multipart/form-data')) {
      return uploadAndCreate(request, user.id);
    }
    return registerUploaded(request, user.id);
  });
}

async function uploadAndCreate(request: Request, userId: string) {
  // Refuse obviously oversized bodies before reading them.
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > 0) {
    const size = checkRecordingSize(declared);
    if (!size.ok && size.status === 413) return jsonError(size.error, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError('expected a form upload', 400);
  }

  const file = form.get('file');
  if (!(file instanceof Blob)) return jsonError('file required', 400);

  const mime = baseRecordingMime(form.get('mimeType') ?? file.type);
  if (!mime) return jsonError('Recording must be audio/mp4 or audio/webm', 400);

  const size = checkRecordingSize(file.size);
  if (!size.ok) return jsonError(size.error, size.status);

  const meta = parseRecordingMeta({
    title: form.get('title'),
    durationSecs: form.get('durationSecs'),
    palette: form.get('palette'),
    cues: form.get('cues'),
  });
  if (!meta.ok) return jsonError(meta.error, meta.status);

  const storagePath = chillRecordingPath(userId, crypto.randomUUID(), mime);
  const supabase = await createClient();
  const bucket = supabase.storage.from(RECORDINGS_BUCKET);
  const { error } = await bucket.upload(storagePath, file, { contentType: mime, upsert: false });
  if (error) return jsonError(error.message, 502);

  try {
    const row = await createChillRecording(userId, { ...meta.value, storagePath, mimeType: mime });
    return NextResponse.json(await withSignedUrl(supabase, row), { status: 201 });
  } catch (err) {
    // Don't leave an orphaned file behind when the row can't be written.
    await bucket.remove([storagePath]);
    throw err;
  }
}

async function registerUploaded(request: Request, userId: string) {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const body = (bodyResult.value ?? {}) as Record<string, unknown>;

  const mime = baseRecordingMime(body.mimeType);
  if (!mime) return jsonError('Recording must be audio/mp4 or audio/webm', 400);
  if (!isOwnChillPath(userId, body.storagePath, mime)) {
    return jsonError('storagePath is not one of your uploads', 400);
  }
  const storagePath = body.storagePath;

  const meta = parseRecordingMeta(body);
  if (!meta.ok) return jsonError(meta.error, meta.status);

  // The file must really be there before a row points at it.
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return jsonError('Upload not found', 400);

  const row = await createChillRecording(userId, { ...meta.value, storagePath, mimeType: mime });
  return NextResponse.json({ ...row, url: data.signedUrl }, { status: 201 });
}
