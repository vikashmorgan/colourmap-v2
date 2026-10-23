/**
 * Chill transport — the one musical clock the beats and the song sections
 * share. Time is the AudioContext clock: `startTime` is when bar 0 began.
 * 4/4, 16 steps per bar. Spec: docs/specs/chill-machine-public.md → Beats.
 */

export const STEPS_PER_BAR = 16;
export const MIN_BPM = 90;
export const MAX_BPM = 140;

export type TransportState = {
  bpm: number;
  /** 0–0.6: delay of every odd 16th, as a fraction of a 16th. */
  swing: number;
  playing: boolean;
  /** AudioContext time (s) bar 0 started; null when stopped. */
  startTime: number | null;
};

type Listener = (state: TransportState) => void;

let state: TransportState = { bpm: 120, swing: 0, playing: false, startTime: null };
const listeners = new Set<Listener>();

function set(next: Partial<TransportState>) {
  state = { ...state, ...next };
  for (const l of listeners) l(state);
}

export function getTransport(): TransportState {
  return state;
}

export function onTransport(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clampBpm(bpm: number): number {
  return Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)));
}

export function barDuration(bpm: number): number {
  return (60 / bpm) * 4;
}

export function stepDuration(bpm: number): number {
  return barDuration(bpm) / STEPS_PER_BAR;
}

/**
 * Bars elapsed (fractional) at AudioContext time `now`. A bpm change keeps the
 * current position: startTime is re-anchored in setBpm.
 */
export function barAt(now: number, s: TransportState = state): number {
  if (!s.playing || s.startTime === null) return 0;
  return Math.max(0, (now - s.startTime) / barDuration(s.bpm));
}

/** Time of the next bar line at or after `now` (for "start on the next bar"). */
export function nextBarTime(now: number, s: TransportState = state): number {
  if (!s.playing || s.startTime === null) return now;
  const bar = Math.ceil(barAt(now, s) - 1e-6);
  return s.startTime + bar * barDuration(s.bpm);
}

export function startTransport(atTime: number): void {
  if (state.playing) return;
  set({ playing: true, startTime: atTime });
}

export function stopTransport(): void {
  set({ playing: false, startTime: null });
}

/** Change tempo at AudioContext time `now` without jumping position. */
export function setBpm(bpm: number, now = 0): void {
  const next = clampBpm(bpm);
  if (state.playing && state.startTime !== null) {
    const bar = barAt(now);
    set({ bpm: next, startTime: now - bar * barDuration(next) });
  } else {
    set({ bpm: next });
  }
}

export function setSwing(swing: number): void {
  set({ swing: Math.min(0.6, Math.max(0, swing)) });
}

/** Test helper: back to defaults. */
export function resetTransport(): void {
  state = { bpm: 120, swing: 0, playing: false, startTime: null };
}

/** Average BPM from tap timestamps (ms); null until 2+ taps within 2 s gaps. */
export function tapTempo(taps: readonly number[]): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i >= 0; i--) {
    if (recent.length && recent[0] - taps[i] > 2000) break;
    recent.unshift(taps[i]);
  }
  if (recent.length < 2) return null;
  const gaps = recent.slice(1).map((t, i) => t - recent[i]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return clampBpm(60000 / avg);
}
