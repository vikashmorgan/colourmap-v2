import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bassRoot,
  createBeatEngine,
  defaultRowMix,
  LOOKAHEAD_SEC,
  lowCutHz,
  rowGains,
  stepsInWindow,
  TIMER_MS,
} from './beat-engine';
import { emptyPattern, getLoop } from './beat-loops';
import { onChill } from './bus';
import {
  getTransport,
  resetTransport,
  setBpm,
  startTransport,
  type TransportState,
} from './transport';

const playing = (over: Partial<TransportState> = {}): TransportState => ({
  bpm: 120,
  swing: 0,
  playing: true,
  startTime: 0,
  ...over,
});

describe('stepsInWindow', () => {
  it('is empty when the transport is stopped', () => {
    expect(stepsInWindow(0, 1, { ...playing(), playing: false }, 16)).toEqual([]);
    expect(stepsInWindow(0, 1, { ...playing(), startTime: null }, 16)).toEqual([]);
    expect(stepsInWindow(1, 1, playing(), 16)).toEqual([]);
  });

  it('lists the 16ths in [from, to) at 120 bpm', () => {
    // 120 bpm → a 16th is 0.125 s.
    const steps = stepsInWindow(0, 0.5, playing(), 16);
    expect(steps.map((s) => s.step)).toEqual([0, 1, 2, 3]);
    expect(steps.map((s) => s.time)).toEqual([0, 0.125, 0.25, 0.375]);
  });

  it('wraps on the pattern length and offsets by the start time', () => {
    const steps = stepsInWindow(10 + 1.9, 10 + 2.2, playing({ startTime: 10 }), 16);
    expect(steps.map((s) => s.step)).toEqual([0, 1]);
    expect(steps[0].index).toBe(16);
    expect(steps[0].time).toBeCloseTo(12);
  });

  it('follows the bpm', () => {
    // 100 bpm → 0.15 s per 16th.
    const steps = stepsInWindow(0, 0.6, playing({ bpm: 100 }), 16);
    expect(steps.map((s) => s.step)).toEqual([0, 1, 2, 3]);
    expect(steps[3].time).toBeCloseTo(0.45);
  });

  it('delays odd 16ths by the swing', () => {
    const steps = stepsInWindow(0, 0.5, playing({ swing: 0.5 }), 16);
    expect(steps.map((s) => s.time)).toEqual([0, 0.1875, 0.25, 0.4375]);
  });

  it('places a swung step in the window it lands in, never twice', () => {
    const t = playing({ swing: 0.6 });
    const a = stepsInWindow(0, 0.13, t, 16);
    const b = stepsInWindow(0.13, 0.3, t, 16);
    expect(a.map((s) => s.step)).toEqual([0]);
    expect(b.map((s) => s.step)).toEqual([1, 2]);
    // Contiguous windows cover every step exactly once.
    const all = [] as number[];
    for (let from = 0; from < 2; from += 0.1) {
      all.push(...stepsInWindow(from, from + 0.1, t, 16).map((s) => s.index));
    }
    expect(all.length).toBeGreaterThanOrEqual(16);
    expect(all).toEqual(Array.from({ length: all.length }, (_, i) => i));
  });
});

describe('engine helpers', () => {
  it('mutes and solos rows', () => {
    const mix = defaultRowMix();
    mix.kick.volume = 0.5;
    expect(rowGains(mix).kick).toBe(0.5);
    mix.clap.mute = true;
    expect(rowGains(mix).clap).toBe(0);
    mix.bass.solo = true;
    const g = rowGains(mix);
    expect(g.bass).toBe(1);
    expect(g.kick).toBe(0);
    mix.bass.mute = true;
    expect(rowGains(mix).bass).toBe(0);
  });

  it('maps low cut to a 20 Hz – 1.5 kHz highpass', () => {
    expect(lowCutHz(0)).toBe(20);
    expect(lowCutHz(1)).toBeCloseTo(1500);
    expect(lowCutHz(-1)).toBe(20);
    expect(lowCutHz(0.5)).toBeCloseTo(Math.sqrt(20 * 1500));
  });

  it('folds the root into the bass register', () => {
    expect(bassRoot(220)).toBe(55);
    expect(bassRoot(20)).toBe(80);
    expect(bassRoot(0)).toBe(55);
  });
});

// ─── The engine on a fake AudioContext ──────────────────────

function fakeCtx() {
  const started: number[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: (t: number) => started.push(t),
    stop: vi.fn(),
    frequency: param(),
    gain: param(),
    Q: param(),
    playbackRate: param(),
    type: '',
    buffer: null as unknown,
  });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    createOscillator: node,
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: (_c: number, len: number) => ({
      duration: len / 8000,
      getChannelData: () => new Float32Array(len),
    }),
    decodeAudioData: vi.fn(),
  };
  return { ctx, started };
}

describe('createBeatEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetTransport();
  });
  afterEach(() => {
    vi.useRealTimers();
    resetTransport();
  });

  function kickOnly() {
    const p = emptyPattern(1);
    p.steps.kick = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    return p;
  }

  it('starts the transport when it is stopped and schedules ahead', () => {
    const { ctx, started } = fakeCtx();
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    engine.setPattern(kickOnly());
    engine.start();
    expect(getTransport().playing).toBe(true);
    expect(getTransport().startTime).toBeCloseTo(0.05);
    expect(engine.isRunning()).toBe(true);
    // First tick covers [0, 0.1): the kick at 0.05 is scheduled.
    expect(started).toContain(0.05);
    engine.dispose();
  });

  it('waits for the next bar when the transport is already running', () => {
    const { ctx, started } = fakeCtx();
    startTransport(0);
    ctx.currentTime = 0.5; // half way through bar 1 at 120 bpm (bars are 2 s)
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    engine.setPattern(kickOnly());
    engine.start();
    expect(started).toEqual([]);
    ctx.currentTime = 1.95;
    vi.advanceTimersByTime(TIMER_MS);
    expect(started).toContain(2);
    engine.dispose();
  });

  it('emits a kick echo at the scheduled time', () => {
    const { ctx } = fakeCtx();
    const events: number[] = [];
    const off = onChill((e) => {
      if (e.kind === 'kick') events.push(e.strength);
    });
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    engine.setPattern(kickOnly());
    engine.start();
    expect(events).toEqual([]);
    vi.advanceTimersByTime(60);
    expect(events).toEqual([1]);
    off();
    engine.dispose();
  });

  it('plays every row of every loop without throwing', () => {
    for (const id of ['melodic', 'minimal', 'deep-house', 'tropical', 'afro', 'hypnotic']) {
      resetTransport();
      const { ctx, started } = fakeCtx();
      const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
      const loop = getLoop(id);
      engine.setPattern(loop.pattern, loop.kit);
      engine.setScale([0, 3, 5, 7, 10]);
      engine.setRootFreq(110);
      engine.setFill(1);
      engine.start();
      for (let i = 0; i < 100; i++) {
        ctx.currentTime += TIMER_MS / 1000;
        vi.advanceTimersByTime(TIMER_MS);
      }
      expect(started.length).toBeGreaterThan(10);
      engine.dispose();
    }
  });

  it('muting the kick stops kick echoes', () => {
    const { ctx } = fakeCtx();
    const kicks: number[] = [];
    const off = onChill((e) => kicks.push(e.strength));
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    engine.setPattern(kickOnly());
    engine.setMuteKick(true);
    engine.start();
    vi.advanceTimersByTime(200);
    expect(kicks).toEqual([]);
    off();
    engine.dispose();
  });

  it('fades out over one bar on stop, then stops scheduling', () => {
    const { ctx, started } = fakeCtx();
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    engine.setPattern(kickOnly());
    engine.start();
    engine.stop();
    expect(engine.isRunning()).toBe(true);
    ctx.currentTime = 2.1; // past one bar at 120 bpm
    vi.advanceTimersByTime(TIMER_MS);
    expect(engine.isRunning()).toBe(false);
    const count = started.length;
    ctx.currentTime = 3;
    vi.advanceTimersByTime(TIMER_MS * 4);
    expect(started.length).toBe(count);
    // The transport keeps running for the pads and the song.
    expect(getTransport().playing).toBe(true);
    engine.dispose();
  });

  it('reads a bpm change live', () => {
    const { ctx, started } = fakeCtx();
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    const p = emptyPattern(1);
    p.steps.closedHat = new Array(16).fill(1);
    engine.setPattern(p);
    engine.start();
    setBpm(90, 0.05);
    started.length = 0;
    ctx.currentTime = 0.5;
    vi.advanceTimersByTime(TIMER_MS);
    // At 90 bpm a 16th is 1/6 s; steps land on 0.05 + k/6.
    const hatTimes = [...new Set(started)].filter((t) => t >= 0.5 && t < 0.5 + LOOKAHEAD_SEC);
    for (const t of hatTimes) expect(((t - 0.05) * 6) % 1).toBeCloseTo(0);
    engine.dispose();
  });

  it('applies the mix setters without throwing', () => {
    const { ctx } = fakeCtx();
    const engine = createBeatEngine(ctx as unknown as AudioContext, {} as AudioNode);
    engine.setVolume(2);
    engine.setLowCut(0.5);
    engine.setRowMix(defaultRowMix());
    engine.setRootFreq(-1);
    engine.stop(); // not running: no-op
    expect(engine.isRunning()).toBe(false);
    engine.dispose();
  });
});
