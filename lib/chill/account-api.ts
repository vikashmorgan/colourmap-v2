import type { ChillCue } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/client';

/*
 * Browser-side fetchers for a signed-in Chill Machine account: saved mixes and
 * saved recordings. Every call throws a ChillApiError on a non-2xx answer, with
 * the server's message (e.g. "Recording is larger than 200 MB") and status.
 */

export type ChillMix = {
  id: string;
  title: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ChillRecording = {
  id: string;
  title: string;
  storagePath: string;
  mimeType: string;
  durationSecs: number | null;
  palette: string | null;
  cues: ChillCue[] | null;
  createdAt: string;
  /** Signed for an hour; null if signing failed. */
  url: string | null;
};

export type RecordingTake = { blob: Blob; mimeType: string; durationSecs: number };
export type RecordingMeta = { title: string; palette?: string | null; cues?: ChillCue[] | null };

export class ChillApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ChillApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string') message = body.error;
    } catch {
      // keep the generic message
    }
    throw new ChillApiError(message, res.status);
  }
  return (await res.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// ─── Mixes ───────────────────────────────────────────────────────────────────

export function listMixes(): Promise<ChillMix[]> {
  return request<ChillMix[]>('/api/chill/mixes');
}

export function saveMix(title: string, settings: Record<string, unknown>): Promise<ChillMix> {
  return request<ChillMix>('/api/chill/mixes', jsonInit('POST', { title, settings }));
}

export function updateMix(
  id: string,
  patch: { title?: string; settings?: Record<string, unknown> },
): Promise<ChillMix> {
  return request<ChillMix>(`/api/chill/mixes/${encodeURIComponent(id)}`, jsonInit('PATCH', patch));
}

export async function deleteMix(id: string): Promise<void> {
  await request(`/api/chill/mixes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ─── Recordings ──────────────────────────────────────────────────────────────

export function listRecordings(): Promise<ChillRecording[]> {
  return request<ChillRecording[]>('/api/chill/recordings');
}

/**
 * Saves a take: asks the server for a signed upload in the user's folder,
 * sends the audio straight to Storage (so large takes never pass through the
 * app server), then registers it. Resolves with the saved recording.
 */
export async function uploadRecording(
  take: RecordingTake,
  meta: RecordingMeta,
): Promise<ChillRecording> {
  const contentType = take.mimeType.split(';')[0]?.trim() ?? take.mimeType;
  const { storagePath, token } = await request<{ storagePath: string; token: string }>(
    '/api/chill/recordings/upload-url',
    jsonInit('POST', { mimeType: take.mimeType, size: take.blob.size }),
  );

  const { error } = await createClient()
    .storage.from('recordings')
    .uploadToSignedUrl(storagePath, token, take.blob, { contentType });
  if (error) throw new ChillApiError(error.message, 502);

  return request<ChillRecording>(
    '/api/chill/recordings',
    jsonInit('POST', {
      storagePath,
      mimeType: take.mimeType,
      durationSecs: take.durationSecs,
      title: meta.title,
      palette: meta.palette ?? null,
      cues: meta.cues ?? null,
    }),
  );
}

export async function deleteRecording(id: string): Promise<void> {
  await request(`/api/chill/recordings/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
