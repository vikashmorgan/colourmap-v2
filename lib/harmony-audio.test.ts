import { describe, expect, it } from 'vitest';
import { HarmonyAudio } from './harmony-audio';

// A tiny stand-in for the Web Audio graph: records node creation and scheduled stops.
function fakeContext() {
  const created: string[] = [];
  const stops: number[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  });
  const node = (kind: string) => {
    created.push(kind);
    const n: Record<string, unknown> = {
      gain: param(),
      frequency: param(),
      delayTime: param(),
      pan: param(),
      threshold: param(),
      ratio: param(),
      Q: param(),
      type: '',
      buffer: null,
      loop: false,
      connect: (to: unknown) => to,
      start() {},
      stop: (t: number) => stops.push(t),
    };
    return n;
  };
  const ctx = {
    currentTime: 1,
    sampleRate: 8000,
    destination: node('destination'),
    createBuffer: (ch: number, len: number) => {
      const data = Array.from({ length: ch }, () => new Float32Array(len));
      return { getChannelData: (i: number) => data[i] };
    },
    createGain: () => node('gain'),
    createOscillator: () => node('osc'),
    createBiquadFilter: () => node('filter'),
    createConvolver: () => node('convolver'),
    createDelay: () => node('delay'),
    createDynamicsCompressor: () => node('comp'),
    createChannelMerger: () => node('merger'),
    createStereoPanner: () => node('panner'),
    createBufferSource: () => node('source'),
    close: async () => {},
  };
  return { ctx: ctx as unknown as AudioContext, created, stops };
}

describe('HarmonyAudio', () => {
  it('builds the mixer with a binaural drone and wind running', () => {
    const { ctx, created } = fakeContext();
    new HarmonyAudio(ctx);
    expect(created).toContain('merger');
    expect(created).toContain('source');
  });

  it('plays a bell in chill and a piano note in piano', () => {
    const { ctx, created } = fakeContext();
    const a = new HarmonyAudio(ctx);
    const before = created.length;
    a.update(0, 0.5);
    a.note(69, 0.1, 0);
    const chillNodes = created.length - before;
    a.update(1, 0.5);
    const mid = created.length;
    a.note(69, 0.1, 0);
    expect(chillNodes).toBeGreaterThan(0);
    expect(created.slice(mid)).toContain('filter'); // the piano's hammer filter
  });

  it('fades old pad voices out when the chord changes', () => {
    const { ctx, stops } = fakeContext();
    const a = new HarmonyAudio(ctx);
    a.update(0.5, 0.5);
    a.chord([45, 57, 60, 64]);
    const n = stops.length;
    a.chord([41, 53, 57, 60]);
    expect(stops.length).toBeGreaterThanOrEqual(n + 16);
    a.chirp();
    a.close();
  });
});
