'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { type BeatEngine, createBeatEngine } from '@/lib/chill/beat-engine';
import {
  BEAT_ROW_LABELS,
  BEAT_ROWS,
  type BeatPattern,
  type BeatRow,
  bassChoices,
  CORE_LOOPS,
  clonePattern,
  getLoop,
  patternLength,
  resizePattern,
} from '@/lib/chill/beat-loops';
import type { ChillBeatSettings } from '@/lib/chill/beats-settings';
import {
  getTransport,
  MAX_BPM,
  MIN_BPM,
  onTransport,
  STEPS_PER_BAR,
  setBpm,
  setSwing,
  stepDuration,
  tapTempo,
} from '@/lib/chill/transport';
import { readableInk } from '@/lib/pad-palettes';

/* ═══════════════════════════════════════════════════════════
   CHILL BEATS — the Beats module of the Chill Machine. Six core
   loops to lay under the pads (simple), or a 16-step grid to edit
   (custom). Settings are controlled by the parent; the engine
   lives here and follows them. Spec: chill-machine-public → Beats.
   ═══════════════════════════════════════════════════════════ */

const INK = '#5C3018';
const CREAM = '#F5ECDC';
const OCHRE = '#C4A060';
const MUTED = '#8A6A4A';
const ACCENT_VEL = 1;
const NORMAL_VEL = 0.7;
const LONG_PRESS_MS = 450;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

type Props = {
  ctx: AudioContext | null;
  output: AudioNode | null;
  /** Card colours, one per loop (wraps). */
  palette: readonly string[];
  /** Root of the pads (Hz); the bass and marimba follow it. */
  rootFreq?: number;
  /** Pad scale as semitone offsets; bass notes snap to it. */
  scale?: number[];
  value: ChillBeatSettings;
  onChange: (next: ChillBeatSettings) => void;
};

function hexOk(c: string | undefined): c is string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

/** Cream on dark fills, sepia on light ones. */
function inkOn(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? INK : CREAM;
}

function noteName(rootFreq: number, semis: number): string {
  const midi = Math.round(69 + 12 * Math.log2(rootFreq / 440)) + semis;
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}

const labelStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '13px',
  color: INK,
} as const;

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  display?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between" style={labelStyle}>
        <span>{label}</span>
        {display !== undefined && <span style={{ color: MUTED }}>{display}</span>}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: MUTED }}
        aria-label={label}
      />
    </label>
  );
}

export default function ChillBeats({
  ctx,
  output,
  palette,
  rootFreq = 110,
  scale,
  value,
  onChange,
}: Props) {
  const transport = useSyncExternalStore(onTransport, getTransport, getTransport);
  const loop = getLoop(value.loopId);
  const custom = value.mode === 'custom' && value.custom ? value.custom : null;
  const pattern: BeatPattern = custom ?? loop.pattern;
  const ready = ctx !== null && output !== null;
  const engineRef = useRef<BeatEngine | null>(null);
  const [engineTick, setEngineTick] = useState(0);
  const [taps, setTaps] = useState<number[]>([]);
  const [barPage, setBarPage] = useState(0);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const set = useCallback(
    (patch: Partial<ChillBeatSettings>) => onChange({ ...valueRef.current, ...patch }),
    [onChange],
  );

  // ─── Engine lifecycle ───────────────────────────────────────
  useEffect(() => {
    if (!ctx || !output) return;
    const engine = createBeatEngine(ctx, output);
    engineRef.current = engine;
    setEngineTick((t) => t + 1);
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [ctx, output]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: engineTick re-syncs a fresh engine
  useEffect(() => {
    engineRef.current?.setPattern(pattern, loop.kit);
  }, [pattern, loop, engineTick]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: engineTick re-syncs a fresh engine
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.setVolume(value.volume);
    e.setFill(value.fill);
    e.setLowCut(value.lowCut);
    e.setMuteKick(value.muteKick);
    e.setRowMix(value.rowMix);
  }, [value.volume, value.fill, value.lowCut, value.muteKick, value.rowMix, engineTick]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: engineTick re-syncs a fresh engine
  useEffect(() => {
    engineRef.current?.setRootFreq(rootFreq);
  }, [rootFreq, engineTick]);
  const scaleKey = scale?.join(',') ?? '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: scaleKey stands in for the array
  useEffect(() => {
    engineRef.current?.setScale(scale ?? []);
  }, [scaleKey, engineTick]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: engineTick re-syncs a fresh engine
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (value.on) e.start();
    else e.stop();
  }, [value.on, engineTick]);

  // ─── Playhead ──────────────────────────────────────────────
  const len = patternLength(pattern);
  useEffect(() => {
    if (!ctx || !value.on) {
      setCurrentStep(null);
      return;
    }
    let raf = 0;
    const loopFrame = () => {
      const t = getTransport();
      if (t.playing && t.startTime !== null && ctx.currentTime >= t.startTime) {
        const idx = Math.floor((ctx.currentTime - t.startTime) / stepDuration(t.bpm)) % len;
        setCurrentStep((prev) => (prev === idx ? prev : idx));
      }
      raf = requestAnimationFrame(loopFrame);
    };
    raf = requestAnimationFrame(loopFrame);
    return () => cancelAnimationFrame(raf);
  }, [ctx, value.on, len]);

  // ─── Actions ───────────────────────────────────────────────
  const now = () => ctx?.currentTime ?? 0;

  const selectLoop = (id: string) => {
    const next = getLoop(id);
    setBpm(next.bpm, now());
    setSwing(next.swing);
    set({ loopId: id, mode: 'simple', custom: null });
  };

  const tap = () => {
    const t = performance.now();
    const recent = [...taps.filter((x) => t - x < 4000), t].slice(-6);
    setTaps(recent);
    const bpm = tapTempo(recent);
    if (bpm !== null) setBpm(bpm, now());
  };

  const editCustom = (fn: (p: BeatPattern) => BeatPattern) => {
    const base = value.custom ?? clonePattern(loop.pattern);
    set({ custom: fn(clonePattern(base)), mode: 'custom' });
  };

  const setStep = (row: BeatRow, i: number, accent: boolean) => {
    editCustom((p) => {
      const cur = p.steps[row][i];
      const nextVel = accent
        ? cur === ACCENT_VEL
          ? NORMAL_VEL
          : ACCENT_VEL
        : cur > 0
          ? 0
          : NORMAL_VEL;
      p.steps[row][i] = nextVel;
      if (row === 'bass') p.bassNotes[i] = nextVel > 0 ? (p.bassNotes[i] ?? 0) : null;
      return p;
    });
  };

  const setRowMix = (row: BeatRow, patch: Partial<ChillBeatSettings['rowMix'][BeatRow]>) => {
    set({ rowMix: { ...value.rowMix, [row]: { ...value.rowMix[row], ...patch } } });
  };

  const choices = useMemo(() => bassChoices(scale ?? [0, 2, 3, 5, 7, 8, 10]), [scale]);
  const pages = pattern.bars;
  const page = Math.min(barPage, pages - 1);

  return (
    <div className="space-y-4" style={{ fontFamily: 'var(--font-serif)' }}>
      {/* Top row — play, tempo, tap, swing */}
      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={() => set({ on: !value.on })}
          disabled={!ready}
          title={ready ? undefined : 'Start the Chill Machine first'}
          aria-pressed={value.on}
          className="cursor-pointer rounded-lg px-4 py-2 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: value.on ? INK : '#C4A06014',
            border: `1px solid ${value.on ? INK : '#C4A06055'}`,
            color: value.on ? CREAM : INK,
            fontSize: '14px',
            fontWeight: 700,
            minHeight: 40,
          }}
        >
          {value.on ? 'Stop beat' : 'Play beat'}
        </button>
        <div className="min-w-[160px] flex-1">
          <Slider
            label="BPM"
            min={MIN_BPM}
            max={MAX_BPM}
            value={transport.bpm}
            display={String(transport.bpm)}
            onChange={(v) => setBpm(v, now())}
          />
        </div>
        <button
          type="button"
          onClick={tap}
          className="cursor-pointer rounded-lg px-3 py-2"
          style={{
            background: '#C4A06010',
            border: '1px solid #C4A06040',
            color: INK,
            fontSize: '13px',
            minHeight: 40,
          }}
        >
          Tap
        </button>
        <div className="min-w-[120px] flex-1">
          <Slider
            label="Swing"
            min={0}
            max={60}
            value={Math.round(transport.swing * 100)}
            display={`${Math.round(transport.swing * 100)}%`}
            onChange={(v) => setSwing(v / 100)}
          />
        </div>
      </div>

      {value.mode === 'simple' ? (
        /* The six core loops */
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CORE_LOOPS.map((l, i) => {
            const raw = palette[i % Math.max(1, palette.length)];
            const color = hexOk(raw) ? raw : OCHRE;
            const selected = l.id === value.loopId;
            const text = selected ? inkOn(color) : readableInk(color);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => selectLoop(l.id)}
                aria-pressed={selected}
                className="cursor-pointer rounded-lg px-3 py-3 text-left transition-all"
                style={{
                  background: selected ? color : `${color}14`,
                  border: `1px solid ${selected ? color : `${color}55`}`,
                  minHeight: 72,
                }}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span style={{ fontSize: '14px', fontWeight: 700, color: text }}>{l.label}</span>
                  <span style={{ fontSize: '12px', color: text, opacity: 0.8 }}>{l.bpm}</span>
                </span>
                <span
                  className="mt-1 block"
                  style={{ fontSize: '12px', lineHeight: 1.4, color: text, opacity: 0.85 }}
                >
                  {l.description}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <CustomGrid
          pattern={pattern}
          page={page}
          onPage={setBarPage}
          currentStep={currentStep}
          rowMix={value.rowMix}
          rootFreq={rootFreq}
          choices={choices}
          onStep={setStep}
          onRowMix={setRowMix}
          onBassNote={(i, semis) =>
            editCustom((p) => {
              p.bassNotes[i] = semis;
              return p;
            })
          }
          onBars={(bars) => {
            setBarPage(0);
            editCustom((p) => resizePattern(p, bars));
          }}
          onReset={() => {
            setBarPage(0);
            set({ custom: clonePattern(loop.pattern), mode: 'custom' });
          }}
        />
      )}

      {/* The four performance controls */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Slider
          label="Volume"
          value={Math.round(value.volume * 100)}
          onChange={(v) => set({ volume: v / 100 })}
        />
        <Slider
          label="Fill"
          value={Math.round(value.fill * 100)}
          onChange={(v) => set({ fill: v / 100 })}
        />
        <Slider
          label="Low cut"
          value={Math.round(value.lowCut * 100)}
          onChange={(v) => set({ lowCut: v / 100 })}
        />
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => set({ muteKick: !value.muteKick })}
            aria-pressed={value.muteKick}
            className="w-full cursor-pointer rounded-lg px-3 py-2"
            style={{
              background: value.muteKick ? INK : '#C4A06010',
              border: `1px solid ${value.muteKick ? INK : '#C4A06040'}`,
              color: value.muteKick ? CREAM : INK,
              fontSize: '13px',
              minHeight: 40,
            }}
          >
            Mute kick
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          value.mode === 'simple'
            ? set({ mode: 'custom', custom: value.custom ?? clonePattern(loop.pattern) })
            : set({ mode: 'simple' })
        }
        className="cursor-pointer rounded-lg px-3 py-1.5"
        style={{
          background: 'transparent',
          border: '1px solid #C4A06040',
          color: INK,
          fontSize: '13px',
        }}
      >
        {value.mode === 'simple' ? 'Customise' : 'Back to loops'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Custom grid — 16 steps × 6 rows, one bar at a time
// ─────────────────────────────────────────────────────────────

type GridProps = {
  pattern: BeatPattern;
  page: number;
  onPage: (page: number) => void;
  currentStep: number | null;
  rowMix: ChillBeatSettings['rowMix'];
  rootFreq: number;
  choices: number[];
  onStep: (row: BeatRow, index: number, accent: boolean) => void;
  onRowMix: (row: BeatRow, patch: Partial<ChillBeatSettings['rowMix'][BeatRow]>) => void;
  onBassNote: (index: number, semis: number) => void;
  onBars: (bars: 1 | 2 | 4) => void;
  onReset: () => void;
};

function CustomGrid({
  pattern,
  page,
  onPage,
  currentStep,
  rowMix,
  rootFreq,
  choices,
  onStep,
  onRowMix,
  onBassNote,
  onBars,
  onReset,
}: GridProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const offset = page * STEPS_PER_BAR;
  const stepIdx = Array.from({ length: STEPS_PER_BAR }, (_, i) => offset + i);
  const activeBass = stepIdx.filter((i) => pattern.steps.bass[i] > 0);

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const dot = (on: boolean, label: string, letter: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full"
      style={{
        background: on ? INK : 'transparent',
        border: `1px solid ${on ? INK : '#C4A06060'}`,
        color: on ? CREAM : MUTED,
        fontSize: '12px',
      }}
    >
      {letter}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" style={labelStyle}>
        <span>Bars</span>
        {([1, 2, 4] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onBars(b)}
            aria-pressed={pattern.bars === b}
            aria-label={`${b} bar${b > 1 ? 's' : ''}`}
            className="cursor-pointer rounded-md px-2 py-1"
            style={{
              background: pattern.bars === b ? INK : 'transparent',
              border: `1px solid ${pattern.bars === b ? INK : '#C4A06040'}`,
              color: pattern.bars === b ? CREAM : INK,
              fontSize: '13px',
            }}
          >
            {b}
          </button>
        ))}
        {pattern.bars > 1 && (
          <span className="ml-2 flex items-center gap-1">
            {Array.from({ length: pattern.bars }, (_, p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-pressed={page === p}
                aria-label={`Show bar ${p + 1}`}
                className="h-3 w-3 cursor-pointer rounded-full"
                style={{
                  background: page === p ? INK : 'transparent',
                  border: `1px solid ${INK}`,
                }}
              />
            ))}
          </span>
        )}
        <button
          type="button"
          onClick={onReset}
          className="ml-auto cursor-pointer rounded-md px-2 py-1"
          style={{ border: '1px solid #C4A06040', color: INK, fontSize: '13px' }}
        >
          Reset to loop
        </button>
      </div>

      {BEAT_ROWS.map((row) => {
        const label = BEAT_ROW_LABELS[row];
        const mix = rowMix[row];
        return (
          <div key={row} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0" style={{ ...labelStyle, fontWeight: 700 }}>
                {label}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(mix.volume * 100)}
                onChange={(e) => onRowMix(row, { volume: Number(e.target.value) / 100 })}
                aria-label={`${label} volume`}
                className="min-w-0 flex-1 cursor-pointer"
                style={{ accentColor: MUTED }}
              />
              {dot(mix.mute, `Mute ${label.toLowerCase()} row`, 'M', () =>
                onRowMix(row, { mute: !mix.mute }),
              )}
              {dot(mix.solo, `Solo ${label.toLowerCase()} row`, 'S', () =>
                onRowMix(row, { solo: !mix.solo }),
              )}
            </div>
            <div
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${STEPS_PER_BAR}, minmax(0, 1fr))` }}
            >
              {stepIdx.map((i) => {
                const vel = pattern.steps[row][i];
                const on = vel > 0;
                const accent = vel >= ACCENT_VEL;
                const playing = currentStep === i;
                const beat = (i % STEPS_PER_BAR) % 4 === 0;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${label} step ${i + 1}${accent ? ' accent' : ''}`}
                    data-current={playing || undefined}
                    onPointerDown={() => {
                      longPressed.current = false;
                      clearPress();
                      pressTimer.current = setTimeout(() => {
                        longPressed.current = true;
                        onStep(row, i, true);
                      }, LONG_PRESS_MS);
                    }}
                    onPointerUp={clearPress}
                    onPointerLeave={clearPress}
                    onClick={(e) => {
                      clearPress();
                      if (longPressed.current) {
                        longPressed.current = false;
                        return;
                      }
                      onStep(row, i, e.shiftKey);
                    }}
                    className="h-7 cursor-pointer rounded-sm transition-colors"
                    style={{
                      background: on ? (accent ? INK : MUTED) : beat ? '#C4A06022' : '#C4A0600C',
                      border: `1px solid ${playing ? OCHRE : on ? INK : '#C4A06030'}`,
                      boxShadow: playing ? `0 0 0 1px ${OCHRE}` : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {activeBass.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeBass.map((i) => {
            const note = pattern.bassNotes[i] ?? 0;
            const opts = choices.includes(note)
              ? choices
              : [...choices, note].sort((a, b) => a - b);
            return (
              <label key={i} className="flex items-center gap-1" style={labelStyle}>
                <span style={{ color: MUTED, fontSize: '12px' }}>{i + 1}</span>
                <select
                  value={note}
                  onChange={(e) => onBassNote(i, Number(e.target.value))}
                  aria-label={`Bass note step ${i + 1}`}
                  className="cursor-pointer rounded-md px-1 py-0.5"
                  style={{
                    background: '#C4A06010',
                    border: '1px solid #C4A06040',
                    color: INK,
                    fontSize: '13px',
                  }}
                >
                  {opts.map((s) => (
                    <option key={s} value={s}>
                      {noteName(rootFreq, s)}
                      {s < 0 ? ' low' : s >= 12 ? ' high' : ''}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
