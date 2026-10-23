'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

import {
  type AudioRecorder,
  type Take,
  takeFilename,
  useAudioRecorder,
} from '@/lib/hooks/use-audio-recorder';

/*
 * The Chill Machine recorder: one round button (press to start, press again to
 * stop), a thin red dot and a running timer while recording, then an inline
 * take card — play, rename, Download (plus a .txt cue sheet when there are
 * cues), Save for signed-in users, and discard.
 *
 * A take that was neither downloaded nor saved guards the page with
 * beforeunload, since guest takes only live in memory.
 *
 * `ChillRecordButton` is the same button for a pinned top bar; pass it the
 * hook result shared with `ChillRecorder` (`recorder` prop) so both see one
 * recording and one take.
 */

export type ChillCue = { at: number; label: string };

const INK = '#5C3018';
const PAPER = '#F5ECDC';
const RED = '#B23A2E';
const SERIF = 'Georgia, "Times New Roman", serif';

export function formatClock(totalSecs: number): string {
  const secs = Math.max(0, Math.floor(totalSecs));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** One cue per line: `mm:ss  label`, in time order. */
export function cueSheet(cues: ChillCue[]): string {
  return `${[...cues]
    .sort((a, b) => a.at - b.at)
    .map((cue) => `${formatClock(cue.at)}  ${cue.label}`)
    .join('\n')}\n`;
}

function fileBase(title: string, fallback: string): string {
  const cleaned = title
    .trim()
    .replace(/\.(m4a|webm)$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-');
  return cleaned || fallback;
}

const buttonStyle: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 14,
  color: INK,
  background: 'transparent',
  border: `1px solid ${INK}55`,
  borderRadius: 8,
  padding: '4px 12px',
  cursor: 'pointer',
  textDecoration: 'none',
  lineHeight: 1.5,
};

type ButtonProps = {
  recorder: AudioRecorder;
  /** False until the Chill Machine has sound to tap (no context or source yet). */
  ready: boolean;
};

export function ChillRecordButton({ recorder, ready }: ButtonProps) {
  const recording = recorder.state === 'recording';
  const disabled = !recording && (!ready || !recorder.supported);
  const title = !ready
    ? 'Play something first'
    : !recorder.supported
      ? 'Recording is not supported in this browser'
      : recording
        ? 'Stop recording'
        : 'Record';

  const toggle = () => {
    if (recording) {
      recorder.stop().catch(() => {
        // The recorder was already torn down; the button simply returns to idle.
      });
    } else {
      recorder.start();
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={title}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        aria-pressed={recording}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `1.5px solid ${INK}`,
          background: PAPER,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          padding: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: recording ? 12 : 16,
            height: recording ? 12 : 16,
            borderRadius: recording ? 2 : '50%',
            background: RED,
          }}
        />
      </button>
      {recording && (
        <span
          role="timer"
          aria-label="Recording time"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: SERIF,
            fontSize: 14,
            color: INK,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: '50%', background: RED }}
          />
          {formatClock(recorder.elapsed)}
        </span>
      )}
    </span>
  );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function TakeCard({
  take,
  palette,
  cues,
  onSave,
  onDiscard,
  onHandled,
}: {
  take: Take;
  palette: string;
  cues?: ChillCue[];
  onSave?: (take: Take, title: string) => Promise<void>;
  onDiscard: () => void;
  onHandled: () => void;
}) {
  const defaultBase = takeFilename(palette, take.startedAt, take.extension).replace(/\.[^.]+$/, '');
  const [title, setTitle] = useState(defaultBase);
  const [playing, setPlaying] = useState(false);
  const [save, setSave] = useState<SaveState>('idle');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const base = fileBase(title, defaultBase);
  const hasCues = Boolean(cues && cues.length > 0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const downloadCues = () => {
    if (!cues || cues.length === 0) return;
    const url = URL.createObjectURL(new Blob([cueSheet(cues)], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${base}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const saveTake = async () => {
    if (!onSave) return;
    setSave('saving');
    try {
      await onSave(take, title.trim() || defaultBase);
      setSave('saved');
      onHandled();
    } catch {
      setSave('error');
    }
  };

  return (
    <fieldset
      aria-label="Your recording"
      style={{
        margin: '12px 0 0',
        minWidth: 0,
        padding: '12px 16px',
        borderRadius: 14,
        background: PAPER,
        border: `1px solid ${INK}33`,
        color: INK,
        fontFamily: SERIF,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: a music take has no speech to caption */}
      <audio ref={audioRef} src={take.url} preload="metadata" onEnded={() => setPlaying(false)} />
      <button
        type="button"
        onClick={togglePlay}
        style={buttonStyle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <span style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
        {formatClock(take.durationSecs)}
      </span>
      <input
        type="text"
        aria-label="Recording name"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        style={{
          flex: '1 1 160px',
          minWidth: 0,
          fontFamily: SERIF,
          fontSize: 14,
          color: INK,
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${INK}55`,
          padding: '4px 0',
        }}
      />
      <a
        href={take.url}
        download={`${base}.${take.extension}`}
        onClick={() => {
          downloadCues();
          onHandled();
        }}
        style={buttonStyle}
      >
        Download{hasCues ? ' + cues' : ''}
      </a>
      {onSave && (
        <button
          type="button"
          onClick={saveTake}
          disabled={save === 'saving' || save === 'saved'}
          style={buttonStyle}
        >
          {save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved' : 'Save'}
        </button>
      )}
      {save === 'error' && (
        <span role="alert" style={{ fontSize: 13, color: RED }}>
          Couldn't save — try again
        </span>
      )}
      <button
        type="button"
        onClick={() => (confirmDiscard ? onDiscard() : setConfirmDiscard(true))}
        style={{ ...buttonStyle, border: 'none', opacity: 0.75 }}
      >
        {confirmDiscard ? 'Really discard?' : 'Discard'}
      </button>
    </fieldset>
  );
}

type Props = {
  ctx: AudioContext | null;
  source: AudioNode | null;
  palette: string;
  /** Section markers, `at` in seconds from the start of the take. */
  cues?: () => ChillCue[];
  /** Only for signed-in users. */
  onSave?: (take: Take, title: string) => Promise<void>;
  /** Share one recorder with a `ChillRecordButton` elsewhere (e.g. a pinned top bar). */
  recorder?: AudioRecorder;
  /** Hide the button here when it lives in the top bar; the take card still shows. */
  hideButton?: boolean;
};

export default function ChillRecorder({
  ctx,
  source,
  palette,
  cues,
  onSave,
  recorder: shared,
  hideButton = false,
}: Props) {
  const own = useAudioRecorder(ctx, source);
  const recorder = shared ?? own;
  const take = recorder.take;

  const [handledUrl, setHandledUrl] = useState<string | null>(null);
  const [takeCues, setTakeCues] = useState<ChillCue[] | undefined>(undefined);
  const cuesRef = useRef(cues);
  cuesRef.current = cues;
  const wasRecording = useRef(false);

  // Snapshot the cues when a take finishes, so the sheet matches that take.
  useEffect(() => {
    if (recorder.state === 'recording') {
      wasRecording.current = true;
    } else if (wasRecording.current) {
      wasRecording.current = false;
      setTakeCues(cuesRef.current?.());
    }
  }, [recorder.state]);

  const unsaved = take !== null && handledUrl !== take.url;

  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'You have an unsaved recording';
      return 'You have an unsaved recording';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  return (
    <div>
      {!hideButton && <ChillRecordButton recorder={recorder} ready={Boolean(ctx && source)} />}
      {take && (
        <TakeCard
          key={take.url}
          take={take}
          palette={palette}
          cues={takeCues}
          onSave={onSave}
          onDiscard={recorder.clearTake}
          onHandled={() => setHandledUrl(take.url)}
        />
      )}
    </div>
  );
}
