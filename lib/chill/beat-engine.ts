/**
 * Chill beat engine — a lookahead scheduler on the AudioContext clock.
 * A 25 ms timer schedules every 16th that falls in the next 100 ms, reading
 * bpm and swing live from the shared transport. The beat bus is
 * rows → fade → low cut → volume → output. Spec: chill-machine-public → Beats.
 */

import {
  applyFill,
  BEAT_ROWS,
  type BeatKit,
  type BeatPattern,
  type BeatRow,
  muteKick,
  patternLength,
  scaleBass,
} from '@/lib/chill/beat-loops';
import { emitChill } from '@/lib/chill/bus';
import {
  barDuration,
  getTransport,
  nextBarTime,
  startTransport,
  stepDuration,
  type TransportState,
} from '@/lib/chill/transport';
import {
  type BassTweaks,
  bassVoice,
  type HihatTweaks,
  hihatVoice,
  type KickTweaks,
  kickVoice,
  triggerClap,
  triggerConga,
  triggerDjembe,
  triggerMarimba,
  triggerOpenHat,
  triggerRide,
  triggerRim,
  triggerShaker,
  triggerTambourine,
} from '@/lib/drum-voices';

export const LOOKAHEAD_SEC = 0.1;
export const TIMER_MS = 25;

export type ScheduledStep = {
  /** Step within the pattern (0 … patternLength − 1). */
  step: number;
  /** Absolute 16th index since the transport's bar 0. */
  index: number;
  /** AudioContext time the step sounds, swing included. */
  time: number;
};

/**
 * Every 16th whose (swung) time falls in [fromTime, toTime). Odd 16ths are
 * delayed by swing × one 16th. Empty when the transport is stopped.
 */
export function stepsInWindow(
  fromTime: number,
  toTime: number,
  transport: TransportState,
  patternLen: number,
): ScheduledStep[] {
  if (!transport.playing || transport.startTime === null || patternLen <= 0) return [];
  if (toTime <= fromTime) return [];
  const sd = stepDuration(transport.bpm);
  const swingSec = transport.swing * sd;
  const out: ScheduledStep[] = [];
  let k = Math.max(0, Math.floor((fromTime - transport.startTime - swingSec) / sd) - 1);
  for (; ; k++) {
    const time = transport.startTime + k * sd + (k % 2 === 1 ? swingSec : 0);
    if (time >= toTime) {
      // An even step past the window ends the search; an odd (late) one may not.
      if (k % 2 === 0) break;
      continue;
    }
    if (time >= fromTime) out.push({ step: k % patternLen, index: k, time });
  }
  return out;
}

export type RowMix = { volume: number; mute: boolean; solo: boolean };

export function defaultRowMix(): Record<BeatRow, RowMix> {
  const mix = {} as Record<BeatRow, RowMix>;
  for (const row of BEAT_ROWS) mix[row] = { volume: 1, mute: false, solo: false };
  return mix;
}

/** Gain each row actually plays at, after mute and solo. */
export function rowGains(mix: Record<BeatRow, RowMix>): Record<BeatRow, number> {
  const anySolo = BEAT_ROWS.some((r) => mix[r].solo);
  const gains = {} as Record<BeatRow, number>;
  for (const row of BEAT_ROWS) {
    const m = mix[row];
    gains[row] = m.mute || (anySolo && !m.solo) ? 0 : m.volume;
  }
  return gains;
}

/** Low cut 0..1 → highpass cutoff, exponential from 20 Hz to 1.5 kHz. */
export function lowCutHz(amount: number): number {
  const a = Math.min(1, Math.max(0, amount));
  return 20 * (1500 / 20) ** a;
}

/** Fold a root frequency into the bass register (≈ 41–82 Hz). */
export function bassRoot(rootFreq: number): number {
  let f = rootFreq > 0 ? rootFreq : 55;
  while (f >= 82.4) f /= 2;
  while (f < 41.2) f *= 2;
  return f;
}

const KICKS: Record<BeatKit['kick'], KickTweaks> = {
  deep: {
    freqStart: 120,
    freqEnd: 42,
    sweepSec: 0.1,
    decaySec: 0.5,
    bodyGain: 0.95,
    clickGain: 0.08,
    clickHpHz: 3000,
  },
  dry: {
    freqStart: 180,
    freqEnd: 50,
    sweepSec: 0.05,
    decaySec: 0.18,
    bodyGain: 0.9,
    clickGain: 0.25,
    clickHpHz: 5000,
  },
  soft: {
    freqStart: 110,
    freqEnd: 48,
    sweepSec: 0.08,
    decaySec: 0.3,
    bodyGain: 0.75,
    clickGain: 0,
  },
  warm: {
    freqStart: 140,
    freqEnd: 45,
    sweepSec: 0.1,
    decaySec: 0.4,
    bodyGain: 0.9,
    clickGain: 0.12,
    clickHpHz: 3500,
  },
  driving: {
    freqStart: 200,
    freqEnd: 45,
    sweepSec: 0.07,
    decaySec: 0.32,
    bodyGain: 1,
    clickGain: 0.3,
    clickHpHz: 4500,
  },
};

const HATS: Record<'hat' | 'click', HihatTweaks> = {
  hat: { hpHz: 7500, decaySec: 0.045, gain: 0.11 },
  click: { hpHz: 9500, decaySec: 0.02, gain: 0.14 },
};

const BASSES: Record<BeatKit['bass'], BassTweaks> = {
  saw: {
    oscType: 'sawtooth',
    lpStartHz: 900,
    lpEndHz: 220,
    sweepSec: 0.12,
    lpQ: 6,
    gain: 0.4,
    decaySec: 0.18,
  },
  sub: {
    oscType: 'sine',
    lpStartHz: 400,
    lpEndHz: 200,
    sweepSec: 0.1,
    lpQ: 0.7,
    gain: 0.6,
    decaySec: 0.35,
  },
  pluck: {
    oscType: 'triangle',
    lpStartHz: 2500,
    lpEndHz: 300,
    sweepSec: 0.1,
    lpQ: 3,
    gain: 0.45,
    decaySec: 0.16,
  },
  rumble: {
    oscType: 'triangle',
    lpStartHz: 260,
    lpEndHz: 120,
    sweepSec: 0.2,
    lpQ: 2,
    gain: 0.5,
    decaySec: 0.22,
  },
};

const DEFAULT_KIT: BeatKit = {
  kick: 'deep',
  closedHat: 'hat',
  openHat: 'open',
  perc: 'shaker',
  bass: 'saw',
};

export type BeatEngine = {
  setPattern(pattern: BeatPattern, kit?: BeatKit): void;
  setVolume(volume: number): void;
  setLowCut(amount: number): void;
  setMuteKick(muted: boolean): void;
  setFill(fill: number): void;
  setRootFreq(hz: number): void;
  setScale(semitones: readonly number[]): void;
  setRowMix(mix: Record<BeatRow, RowMix>): void;
  /** Starts on the transport's next bar (or starts the transport now); fades in over 1 bar. */
  start(): void;
  /** Fades out over 1 bar, then stops scheduling. Leaves the transport running. */
  stop(): void;
  isRunning(): boolean;
  dispose(): void;
};

export function createBeatEngine(ctx: AudioContext, output: AudioNode): BeatEngine {
  const rowNodes = {} as Record<BeatRow, GainNode>;
  const fade = ctx.createGain();
  fade.gain.value = 0.0001;
  const lowCut = ctx.createBiquadFilter();
  lowCut.type = 'highpass';
  lowCut.frequency.value = lowCutHz(0);
  lowCut.Q.value = 0.7;
  const volume = ctx.createGain();
  volume.gain.value = 0.8;
  for (const row of BEAT_ROWS) {
    rowNodes[row] = ctx.createGain();
    rowNodes[row].connect(fade);
  }
  fade.connect(lowCut);
  lowCut.connect(volume);
  volume.connect(output);

  let source: BeatPattern | null = null;
  let kit: BeatKit = DEFAULT_KIT;
  let fill = 0.5;
  let kickMuted = false;
  let scale: number[] = [];
  let rootFreq = 55;
  let playing: BeatPattern | null = null;

  let running = false;
  let startAt = 0;
  let stopAt: number | null = null;
  let scheduledUntil = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const pending = new Set<ReturnType<typeof setTimeout>>();

  function rebuild() {
    if (!source) {
      playing = null;
      return;
    }
    let p = applyFill(source, fill);
    if (kickMuted) p = muteKick(p);
    if (scale.length) p = { ...p, bassNotes: scaleBass(p.bassNotes, scale) };
    playing = p;
  }

  function play(row: BeatRow, step: number, vel: number, time: number, index: number) {
    const out = rowNodes[row];
    switch (row) {
      case 'kick':
        kickVoice(ctx, time, vel, out, KICKS[kit.kick]);
        scheduleEcho(time, vel);
        break;
      case 'clap':
        triggerClap(ctx, time, vel, out);
        break;
      case 'closedHat':
        if (kit.closedHat === 'shaker') triggerShaker(ctx, time, vel, out);
        else if (kit.closedHat === 'tambourine') triggerTambourine(ctx, time, vel, out);
        else hihatVoice(ctx, time, vel, out, HATS[kit.closedHat]);
        break;
      case 'openHat':
        if (kit.openHat === 'ride') triggerRide(ctx, time, vel, out);
        else triggerOpenHat(ctx, time, vel, out);
        break;
      case 'perc':
        playPerc(step, vel, time, index, out);
        break;
      case 'bass': {
        const semi = playing?.bassNotes[step] ?? 0;
        const freq = bassRoot(rootFreq) * 2 ** (semi / 12);
        bassVoice(ctx, time, vel, out, freq, BASSES[kit.bass]);
        break;
      }
    }
  }

  function playPerc(step: number, vel: number, time: number, index: number, out: AudioNode) {
    const high = index % 4 === 2;
    switch (kit.perc) {
      case 'shaker':
        triggerShaker(ctx, time, vel, out);
        break;
      case 'rim':
        triggerRim(ctx, time, vel, out);
        break;
      case 'conga':
        triggerConga(ctx, time, vel, out, high ? 262 : 196);
        break;
      case 'marimba': {
        const notes = kit.percNotes ?? [24];
        const raw = notes[step % notes.length] ?? 24;
        const semi = scale.length ? (scaleBass([raw], scale)[0] ?? raw) : raw;
        triggerMarimba(ctx, time, vel, out, bassRoot(rootFreq) * 2 ** (semi / 12));
        break;
      }
      case 'afro':
        if (vel >= 0.8) triggerDjembe(ctx, time, vel, out, high ? 1.25 : 1);
        else triggerConga(ctx, time, vel, out, high ? 247 : 185);
        break;
    }
  }

  function scheduleEcho(time: number, vel: number) {
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    const id = setTimeout(() => {
      pending.delete(id);
      emitChill({ kind: 'kick', x: 0.5, y: 0.75, strength: vel });
    }, delay);
    pending.add(id);
  }

  function tick() {
    const now = ctx.currentTime;
    const until = now + LOOKAHEAD_SEC;
    const transport = getTransport();
    if (stopAt !== null && now >= stopAt) {
      halt();
      return;
    }
    if (playing && until > scheduledUntil) {
      const from = Math.max(scheduledUntil, startAt);
      const to = stopAt !== null ? Math.min(until, stopAt) : until;
      const len = patternLength(playing);
      for (const { step, index, time } of stepsInWindow(from, to, transport, len)) {
        for (const row of BEAT_ROWS) {
          const vel = playing.steps[row][step] ?? 0;
          if (vel > 0) play(row, step, vel, time, index);
        }
      }
    }
    scheduledUntil = Math.max(scheduledUntil, until);
  }

  function halt() {
    running = false;
    stopAt = null;
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  return {
    setPattern(pattern, nextKit) {
      source = pattern;
      if (nextKit) kit = nextKit;
      rebuild();
    },
    setVolume(v) {
      volume.gain.setTargetAtTime(Math.min(1, Math.max(0, v)), ctx.currentTime, 0.03);
    },
    setLowCut(amount) {
      lowCut.frequency.setTargetAtTime(lowCutHz(amount), ctx.currentTime, 0.05);
    },
    setMuteKick(muted) {
      kickMuted = muted;
      rebuild();
    },
    setFill(f) {
      fill = Math.min(1, Math.max(0, f));
      rebuild();
    },
    setRootFreq(hz) {
      if (hz > 0) rootFreq = hz;
    },
    setScale(semitones) {
      scale = [...semitones];
      rebuild();
    },
    setRowMix(mix) {
      const gains = rowGains(mix);
      for (const row of BEAT_ROWS) {
        rowNodes[row].gain.setTargetAtTime(gains[row], ctx.currentTime, 0.02);
      }
    },
    start() {
      const now = ctx.currentTime;
      if (running && stopAt === null) return;
      const transport = getTransport();
      if (transport.playing) {
        startAt = nextBarTime(now);
      } else {
        startAt = now + 0.05;
        startTransport(startAt);
      }
      const bar = barDuration(getTransport().bpm);
      fade.gain.cancelScheduledValues(now);
      fade.gain.setValueAtTime(Math.max(0.0001, fade.gain.value), now);
      fade.gain.exponentialRampToValueAtTime(0.0001, startAt);
      fade.gain.exponentialRampToValueAtTime(1, startAt + bar);
      stopAt = null;
      scheduledUntil = Math.max(scheduledUntil, now);
      running = true;
      if (timer === null) timer = setInterval(tick, TIMER_MS);
      tick();
    },
    stop() {
      if (!running || stopAt !== null) return;
      const now = ctx.currentTime;
      const bar = barDuration(getTransport().bpm);
      fade.gain.cancelScheduledValues(now);
      fade.gain.setValueAtTime(Math.max(0.0001, fade.gain.value), now);
      fade.gain.exponentialRampToValueAtTime(0.0001, now + bar);
      stopAt = now + bar;
    },
    isRunning() {
      return running;
    },
    dispose() {
      halt();
      for (const id of pending) clearTimeout(id);
      pending.clear();
      try {
        volume.disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}
