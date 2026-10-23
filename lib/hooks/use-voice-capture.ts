'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

/*
 * RECORD FIRST. UNDERSTAND LATER.
 *
 * This replaces `use-speech-to-text.ts`, which asked the browser to hear and
 * kept only what it produced. The order is now reversed and that reversal is
 * the entire feature: audio reaches storage before anything tries to read it,
 * so a bad model, a dead network or an unsupported browser costs a reading
 * rather than a thought.
 *
 * WHAT THIS GIVES UP
 *
 * Live interim text. The old hook painted words into the field as you spoke,
 * which felt immediate and was genuinely nice. It cannot be kept: interim
 * results only exist because the browser is doing the recognition, and the
 * browser is what was wrong. The replacement is an honest elapsed counter and
 * a visible reading state — slower to appear, and it arrives in the right
 * language with punctuation, on a phone, every time.
 */

export const BUCKET = 'recordings';

/*
 * Safari records MP4, everything else WebM/Opus. Asking for a type the browser
 * cannot produce makes MediaRecorder throw at construction, so the list is
 * tried in order and the first supported one wins. The empty string is the
 * last resort meaning "whatever you like" — which is what older iOS needs,
 * since it lacks `isTypeSupported` entirely.
 */
const PREFERRED = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''];

export function pickMimeType(supported: (type: string) => boolean): string {
  for (const type of PREFERRED) {
    if (type === '' || supported(type)) return type;
  }
  return '';
}

export function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

/** Where one user's audio lives. Under their own id, which the API enforces too. */
export function storagePathFor(userId: string, stamp: number, mimeType: string): string {
  return `${userId}/voice/${stamp}.${extensionFor(mimeType)}`;
}

export type CaptureState = 'idle' | 'recording' | 'saving' | 'reading' | 'done' | 'error';

export interface VoiceNote {
  id: string;
  status: string;
  transcript: string | null;
  lang: string | null;
  branch: string | null;
  error: string | null;
  storagePath: string;
}

export interface UseVoiceCaptureResult {
  state: CaptureState;
  /** Seconds recorded so far. The only honest progress signal while listening. */
  elapsed: number;
  error: string;
  note: VoiceNote | null;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export interface UseVoiceCaptureOptions {
  /** Called once the transcript exists. Receives the words, never the audio. */
  onTranscript?: (text: string, note: VoiceNote) => void;
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function useVoiceCapture(options: UseVoiceCaptureOptions = {}): UseVoiceCaptureResult {
  const [state, setState] = useState<CaptureState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [note, setNote] = useState<VoiceNote | null>(null);
  const [supported, setSupported] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const onTranscriptRef = useRef(options.onTranscript);

  onTranscriptRef.current = options.onTranscript;

  useEffect(() => {
    setSupported(isSupported());
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const release = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const upload = useCallback(async (blob: Blob, seconds: number) => {
    setState('saving');

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('not signed in');
      setState('error');
      return;
    }

    const path = storagePathFor(user.id, Date.now(), blob.type);
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'audio/webm',
      upsert: false,
    });

    if (storageError) {
      setError(storageError.message);
      setState('error');
      return;
    }

    const created = await fetch('/api/voice-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: path, durationSecs: seconds }),
    });

    if (!created.ok) {
      /*
       * The audio is already in the bucket, so this is recoverable rather than
       * lost — which is worth saying, because a bare "failed to save" would
       * send somebody looking for a thought that is actually safe.
       */
      setError('recorded and stored, but not filed yet');
      setState('error');
      return;
    }

    const saved = (await created.json()) as VoiceNote;
    setNote(saved);

    /* Reading is a separate request, and the note survives it going wrong. */
    setState('reading');
    const read = await fetch(`/api/voice-notes/${saved.id}/transcribe`, { method: 'POST' });

    if (!read.ok) {
      setError('recorded. Could not read it yet.');
      setState('error');
      return;
    }

    const finished = (await read.json()) as VoiceNote;
    setNote(finished);

    if (finished.status === 'transcribed' && finished.transcript) {
      onTranscriptRef.current?.(finished.transcript, finished);
      setState('done');
      return;
    }

    setError(finished.error ?? 'could not read it');
    setState('error');
  }, []);

  const start = useCallback(async () => {
    if (!isSupported()) {
      setError('this browser cannot record');
      setState('error');
      return;
    }

    setError('');
    setNote(null);
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType((type) =>
        typeof MediaRecorder.isTypeSupported === 'function'
          ? MediaRecorder.isTypeSupported(type)
          : false,
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        release();
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        void upload(blob, seconds);
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setState('recording');

      tickRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
    } catch (cause) {
      release();
      setError(cause instanceof Error ? cause.message : 'could not reach the microphone');
      setState('error');
    }
  }, [release, upload]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError('');
    setNote(null);
    setElapsed(0);
  }, []);

  return { state, elapsed, error, note, supported, start, stop, reset };
}
