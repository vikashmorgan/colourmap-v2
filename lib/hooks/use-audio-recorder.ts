'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/*
 * Records the Chill Machine's own output — not the mic, so no permission
 * prompt. `source` (the master gain) is tapped into a MediaStreamDestination
 * that feeds a MediaRecorder; on stop only that tap is disconnected, so the
 * sound keeps playing.
 *
 * Data comes in 10 s chunks so memory stays flat on long takes. There is no
 * length limit, and recording carries on while the tab is hidden: `elapsed` is
 * read from the clock, not counted, so throttled timers don't skew it.
 */

export type RecorderState = 'idle' | 'recording';

export type Take = {
  blob: Blob;
  /** Object URL for playback and download. Revoked by `clearTake` or the next take. */
  url: string;
  mimeType: string;
  extension: string;
  durationSecs: number;
  startedAt: Date;
};

export type AudioRecorder = {
  state: RecorderState;
  /** Whole seconds since the current recording started (0 when idle). */
  elapsed: number;
  start: () => void;
  stop: () => Promise<Take>;
  /** The latest finished take, until cleared. */
  take: Take | null;
  clearTake: () => void;
  supported: boolean;
  mimeType: string | null;
  extension: string | null;
};

const CHUNK_MS = 10_000;

const FORMATS: { mimeType: string; extension: string }[] = [
  { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
  { mimeType: 'audio/mp4', extension: 'm4a' },
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
];

/** The best recording format this browser supports, or null. */
export function pickFormat(): { mimeType: string; extension: string } | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  return FORMATS.find((format) => MediaRecorder.isTypeSupported(format.mimeType)) ?? null;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `chill-<palette>[-<section>]-<yyyy-mm-dd-hhmm>.<extension>`, in local time. */
export function takeFilename(
  palette: string,
  startedAt: Date,
  extension: string,
  sectionLabel?: string,
): string {
  const stamp = `${startedAt.getFullYear()}-${pad(startedAt.getMonth() + 1)}-${pad(
    startedAt.getDate(),
  )}-${pad(startedAt.getHours())}${pad(startedAt.getMinutes())}`;
  const parts = ['chill', slug(palette) || 'mix'];
  const section = sectionLabel ? slug(sectionLabel) : '';
  if (section) parts.push(section);
  parts.push(stamp);
  return `${parts.join('-')}.${extension.replace(/^\./, '')}`;
}

const noopSubscribe = () => () => {};
const clientMimeType = () => pickFormat()?.mimeType ?? null;
const serverMimeType = () => null;

export function useAudioRecorder(
  ctx: AudioContext | null,
  source: AudioNode | null,
): AudioRecorder {
  const mimeType = useSyncExternalStore(noopSubscribe, clientMimeType, serverMimeType);
  const extension = FORMATS.find((format) => format.mimeType === mimeType)?.extension ?? null;
  const supported = mimeType !== null;

  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Take | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const tapRef = useRef<{ source: AudioNode; destination: MediaStreamAudioDestinationNode } | null>(
    null,
  );
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<Date | null>(null);
  const takeRef = useRef<Take | null>(null);

  const untap = useCallback(() => {
    const tap = tapRef.current;
    tapRef.current = null;
    if (!tap) return;
    try {
      tap.source.disconnect(tap.destination);
    } catch {
      // Already disconnected (the graph was torn down first) — nothing left to undo.
    }
  }, []);

  const replaceTake = useCallback((next: Take | null) => {
    const previous = takeRef.current;
    if (previous && previous.url !== next?.url) URL.revokeObjectURL(previous.url);
    takeRef.current = next;
    setTake(next);
  }, []);

  const start = useCallback(() => {
    if (!ctx || !source || !mimeType || recorderRef.current) return;
    const destination = ctx.createMediaStreamDestination();
    source.connect(destination);
    tapRef.current = { source, destination };

    const recorder = new MediaRecorder(destination.stream, { mimeType });
    chunksRef.current = [];
    recorder.addEventListener('dataavailable', (event: BlobEvent) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    });
    recorderRef.current = recorder;
    startedAtRef.current = new Date();
    recorder.start(CHUNK_MS);
    setElapsed(0);
    setState('recording');
  }, [ctx, source, mimeType]);

  const stop = useCallback((): Promise<Take> => {
    const recorder = recorderRef.current;
    const startedAt = startedAtRef.current;
    if (!recorder || !startedAt || !mimeType || !extension) {
      return Promise.reject(new Error('Not recording'));
    }
    return new Promise<Take>((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          untap();
          recorderRef.current = null;
          startedAtRef.current = null;
          const type = recorder.mimeType || mimeType;
          const blob = new Blob(chunksRef.current, { type });
          chunksRef.current = [];
          const next: Take = {
            blob,
            url: URL.createObjectURL(blob),
            mimeType: type,
            extension,
            durationSecs: Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000)),
            startedAt,
          };
          replaceTake(next);
          setState('idle');
          setElapsed(0);
          resolve(next);
        },
        { once: true },
      );
      recorder.stop();
    });
  }, [mimeType, extension, untap, replaceTake]);

  const clearTake = useCallback(() => replaceTake(null), [replaceTake]);

  useEffect(() => {
    if (state !== 'recording') return;
    const tick = () => {
      const startedAt = startedAtRef.current;
      if (startedAt) setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    };
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      untap();
      if (takeRef.current) URL.revokeObjectURL(takeRef.current.url);
      takeRef.current = null;
    },
    [untap],
  );

  return { state, elapsed, start, stop, take, clearTake, supported, mimeType, extension };
}
