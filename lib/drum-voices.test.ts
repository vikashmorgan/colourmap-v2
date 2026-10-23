import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cachedDrumSample,
  DJEMBE_URL,
  loadDrumSample,
  setCurrentVoiceTweaks,
  TAMBOURINE_URL,
  triggerArp,
  triggerBass,
  triggerChop,
  triggerClap,
  triggerConga,
  triggerDjembe,
  triggerGuitar,
  triggerHihat,
  triggerKick,
  triggerLead,
  triggerMarimba,
  triggerOpenHat,
  triggerPad,
  triggerPerc,
  triggerPluck,
  triggerRhodes,
  triggerRide,
  triggerRim,
  triggerRiser,
  triggerShaker,
  triggerSnare,
  triggerSubPulse,
  triggerTambourine,
  triggerWobble,
} from './drum-voices';

type Param = { value: number; calls: [string, number, number][] };

function param(value = 0): Param & Record<string, unknown> {
  const p: Param & Record<string, unknown> = { value, calls: [] };
  for (const m of [
    'setValueAtTime',
    'linearRampToValueAtTime',
    'exponentialRampToValueAtTime',
    'setTargetAtTime',
  ]) {
    p[m] = (v: number, t: number) => {
      p.calls.push([m, v, t]);
    };
  }
  p.cancelScheduledValues = () => {};
  return p;
}

function fakeCtx() {
  const started: number[] = [];
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: (t: number) => started.push(t),
    stop: vi.fn(),
    setPeriodicWave: vi.fn(),
    frequency: param(),
    gain: param(1),
    Q: param(),
    playbackRate: param(1),
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
    createPeriodicWave: vi.fn(),
    createBuffer: (_c: number, len: number) => ({
      duration: len / 8000,
      getChannelData: () => new Float32Array(len),
    }),
    decodeAudioData: vi.fn(async () => ({ duration: 1 })),
  };
  return { ctx: ctx as unknown as AudioContext, started, raw: ctx };
}

afterEach(() => {
  setCurrentVoiceTweaks(undefined);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('drum voices', () => {
  it('every voice schedules its sources at the requested time', () => {
    const { ctx, started } = fakeCtx();
    const out = {} as AudioNode;
    const hit = (fn: () => void) => {
      started.length = 0;
      fn();
      expect(started.length).toBeGreaterThan(0);
      expect(started.every((t) => t === 1)).toBe(true);
    };
    hit(() => triggerKick(ctx, 1, 1, out));
    hit(() => triggerSnare(ctx, 1, 1, out));
    hit(() => triggerHihat(ctx, 1, 1, out));
    hit(() => triggerPerc(ctx, 1, 1, out));
    hit(() => triggerClap(ctx, 1, 1, out));
    hit(() => triggerBass(ctx, 1, 1, out, 55));
    hit(() => triggerSubPulse(ctx, 1, 1, out, 55));
    hit(() => triggerRhodes(ctx, 1, 1, out, 220));
    hit(() => triggerGuitar(ctx, 1, 1, out, 220));
    hit(() => triggerPluck(ctx, 1, 1, out, 440));
    hit(() => triggerLead(ctx, 1, 1, out, 440));
    hit(() => triggerPad(ctx, 1, 1, out, 220));
    hit(() => triggerWobble(ctx, 1, 1, out, 55));
    hit(() => triggerArp(ctx, 1, 1, out, 440));
    hit(() => triggerChop(ctx, 1, 1, out, 440));
    hit(() => triggerRiser(ctx, 1, 2, out));
    hit(() => triggerOpenHat(ctx, 1, 1, out));
    hit(() => triggerRide(ctx, 1, 1, out));
    hit(() => triggerRim(ctx, 1, 1, out));
    hit(() => triggerShaker(ctx, 1, 1, out));
    hit(() => triggerConga(ctx, 1, 1, out));
    hit(() => triggerMarimba(ctx, 1, 1, out, 440));
  });

  it('the kick reads the Groove Machine preset tweaks', () => {
    const { ctx } = fakeCtx();
    const oscs: { frequency: Param }[] = [];
    const orig = (ctx as unknown as { createOscillator: () => { frequency: Param } })
      .createOscillator;
    (ctx as unknown as { createOscillator: () => unknown }).createOscillator = () => {
      const o = orig();
      oscs.push(o);
      return o;
    };
    setCurrentVoiceTweaks({ kick: { freqStart: 99, clickGain: 0 } });
    triggerKick(ctx, 0, 1, {} as AudioNode);
    expect(oscs[0].frequency.calls[0]).toEqual(['setValueAtTime', 99, 0]);
  });

  it('decodes a drum sample once and falls back to synth until it is ready', async () => {
    const { ctx, raw, started } = fakeCtx();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }));
    vi.stubGlobal('fetch', fetchMock);

    expect(cachedDrumSample(ctx, TAMBOURINE_URL)).toBeNull();
    triggerTambourine(ctx, 0.5, 1, {} as AudioNode);
    expect(started).toContain(0.5);
    const buf = await loadDrumSample(ctx, TAMBOURINE_URL);
    expect(buf).not.toBeNull();
    expect(cachedDrumSample(ctx, TAMBOURINE_URL)).toBe(buf);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(raw.decodeAudioData).toHaveBeenCalledTimes(1);
    started.length = 0;
    triggerTambourine(ctx, 2, 1, {} as AudioNode);
    expect(started).toEqual([2]);
  });

  it('returns null and retries later when a sample fails to load', async () => {
    const { ctx, started } = fakeCtx();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    expect(await loadDrumSample(ctx, DJEMBE_URL)).toBeNull();
    triggerDjembe(ctx, 1, 1, {} as AudioNode);
    expect(started).toContain(1);
  });
});
