'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import AtomVisualizer, { type VisualizerMode } from '@/components/AtomVisualizer';
import InfoTooltip from '@/components/InfoTooltip';
import VoiceProviderSelector from '@/components/VoiceProviderSelector';
import { haptic } from '@/lib/haptics';
import { useTTS } from '@/lib/hooks/use-tts';
import {
  getPadPalette,
  PAD_PALETTE_LS,
  PAD_PALETTES,
  type PadPaletteId,
  padColor,
  paletteSwatch,
  readableInk,
} from '@/lib/pad-palettes';
import { playSampledNote, type SamplePackId } from '@/lib/sample-pack';

/* ═══════════════════════════════════════════════════════════
   BINAURAL TUNER — adaptive soundscape generator.
   Reads your check-in state to suggest a frequency.
   Full layered soundscape: nature, tones, textures.
   Genre modes: trippy, classical, groovy, logical.
   ═══════════════════════════════════════════════════════════ */

// ── Wave visualization styles ──
type WaveStyle = 'sine' | 'pulse' | 'double' | 'zigzag';
const WAVE_STYLES: { id: WaveStyle; label: string }[] = [
  { id: 'sine', label: 'sine' },
  { id: 'pulse', label: 'pulse' },
  { id: 'double', label: 'double' },
  { id: 'zigzag', label: 'zigzag' },
];

// ── Soft-beat bed (gentle percussion on a user-chosen tempo) ──
type BeatPreset = 'off' | 'heartbeat' | 'walking' | 'dance';
const BEAT_PRESETS: { id: BeatPreset; label: string; intervalMs: number }[] = [
  { id: 'off', label: 'off', intervalMs: 0 },
  { id: 'heartbeat', label: 'heartbeat', intervalMs: 857 }, // ~70 BPM
  { id: 'walking', label: 'walking', intervalMs: 600 }, // 100 BPM
  { id: 'dance', label: 'dance', intervalMs: 500 }, // 120 BPM
];
const BEAT_SAMPLE_URL = '/sounds/drums/Djembe.ogg';

// ── Brain state presets ──
const PRESETS = [
  { id: 'deep-sleep', label: 'Deep Sleep', base: 40, beat: 2, color: '#C4A060' },
  { id: 'meditation', label: 'Meditation', base: 60, beat: 5, color: '#6890B0' },
  { id: 'creativity', label: 'Creativity', base: 70, beat: 6, color: '#D4805A' },
  { id: 'calm-focus', label: 'Calm Focus', base: 80, beat: 8, color: '#7AAA58' },
  { id: 'presence', label: 'Presence', base: 50, beat: 4, color: '#C4A060' },
  { id: 'stillness', label: 'Stillness', base: 35, beat: 2, color: '#A0907A' },
];

// ── Default layers per preset ──
const PRESET_LAYERS: Record<string, string[]> = {
  'deep-sleep': ['ocean', 'sub'],
  meditation: ['rain', 'breath'],
  creativity: ['birds', 'wind', 'bowl'],
  'calm-focus': ['hum', 'wind'],
  presence: ['breath', 'drone'],
  stillness: ['bowl', 'breath'],
};

// ── Soundscape layers ──
interface LayerDef {
  id: string;
  label: string;
  color: string;
  group: 'nature' | 'tones' | 'texture' | 'ambient' | 'real';
  build: (
    ctx: AudioContext,
    baseFreq: number,
  ) => { node: AudioNode; source: AudioBufferSourceNode | OscillatorNode };
}

function buildNoise(
  ctx: AudioContext,
  filterType: BiquadFilterType,
  filterFreq: number,
  gain: number,
): { node: AudioNode; source: AudioBufferSourceNode } {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * gain;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  source.connect(filter);
  return { node: filter, source };
}

function buildTone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
): { node: AudioNode; source: OscillatorNode } {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  return { node: osc, source: osc };
}

type LongSoftTone = {
  freq: number;
  amp: number;
  driftSeconds: number;
};

function buildLongSoftLoop(
  ctx: AudioContext,
  options: {
    tones: LongSoftTone[];
    noise: number;
    lowpass: number;
    delaySeconds: number;
    delayWet: number;
    feedback: number;
  },
): { node: AudioNode; source: AudioBufferSourceNode } {
  const seconds = 16;
  const frames = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, frames, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let smoothNoise = 0;

    for (let i = 0; i < frames; i++) {
      const t = i / ctx.sampleRate;
      const loop = t / seconds;
      const edgeFrames = ctx.sampleRate * 0.35;
      const edge = Math.min(1, i / edgeFrames, (frames - i - 1) / edgeFrames);
      const breath = 0.74 + 0.26 * Math.sin(loop * Math.PI * 2 + ch * 0.7);
      const white = Math.random() * 2 - 1;
      smoothNoise = smoothNoise * 0.985 + white * 0.015;
      let sample = smoothNoise * options.noise;

      for (const tone of options.tones) {
        const drift = 1 + 0.006 * Math.sin((t / tone.driftSeconds) * Math.PI * 2 + ch * 0.45);
        sample += Math.sin(t * tone.freq * drift * Math.PI * 2 + ch * 0.32) * tone.amp;
      }

      data[i] = sample * breath * edge;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = options.lowpass;
  filter.Q.value = 0.35;

  const output = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 1 - options.delayWet;
  const wet = ctx.createGain();
  wet.gain.value = options.delayWet;
  const delay = ctx.createDelay(3);
  delay.delayTime.value = options.delaySeconds;
  const feedback = ctx.createGain();
  feedback.gain.value = options.feedback;

  source.connect(filter);
  filter.connect(dry);
  dry.connect(output);
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(output);

  return { node: output, source };
}

const LAYERS: LayerDef[] = [
  // Nature
  {
    id: 'rain',
    label: 'Synth Rain',
    color: '#6890B0',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'highpass', 800, 1.2),
  },
  {
    id: 'ocean',
    label: 'Synth Ocean',
    color: '#5A8AAA',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'lowpass', 300, 1.5),
  },
  {
    id: 'wind',
    label: 'Synth Wind',
    color: '#A0C8A0',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'lowpass', 400, 1.0),
  },
  {
    id: 'fire',
    label: 'Synth Fire',
    color: '#D4805A',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'bandpass', 600, 0.8),
  },
  {
    id: 'forest',
    label: 'Synth Forest',
    color: '#7AAA58',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'bandpass', 2000, 0.6),
  },
  {
    id: 'thunder',
    label: 'Synth Thunder',
    color: '#8A6A4A',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'lowpass', 100, 1.8),
  },
  {
    id: 'birds',
    label: 'Synth Birds',
    color: '#C8906A',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'highpass', 3500, 0.4),
  },
  {
    id: 'waves',
    label: 'Synth Waves',
    color: '#88B0C8',
    group: 'nature',
    build: (ctx) => buildNoise(ctx, 'bandpass', 200, 1.0),
  },
  // Tones
  {
    id: 'drone',
    label: 'Drone',
    color: '#C4A060',
    group: 'tones',
    build: (ctx, base) => buildTone(ctx, base / 4, 'sine'),
  },
  {
    id: 'bowl',
    label: 'Bowl',
    color: '#C4A060',
    group: 'tones',
    build: (ctx, base) => buildTone(ctx, base * 1.5, 'sine'),
  },
  {
    id: 'harmonic',
    label: 'Harmonic',
    color: '#6890B0',
    group: 'tones',
    build: (ctx, base) => buildTone(ctx, base * 2, 'triangle'),
  },
  {
    id: 'sub',
    label: 'Sub Bass',
    color: '#5C3018',
    group: 'tones',
    build: (ctx, base) => buildTone(ctx, base / 8, 'sine'),
  },
  // Textures
  {
    id: 'crackle',
    label: 'Vinyl',
    color: '#B8A080',
    group: 'texture',
    build: (ctx) => buildNoise(ctx, 'highpass', 3000, 0.3),
  },
  {
    id: 'breath',
    label: 'Breath',
    color: '#C8C8A0',
    group: 'texture',
    build: (ctx) => buildNoise(ctx, 'bandpass', 500, 0.5),
  },
  {
    id: 'hum',
    label: 'Room Hum',
    color: '#A0907A',
    group: 'texture',
    build: (ctx) => buildTone(ctx, 60, 'sine'),
  },
  // Vinyl / scratchy / lo-fi warmth
  {
    id: 'vinylwarm',
    label: 'Warm Vinyl',
    color: '#C8A878',
    group: 'texture',
    build: (ctx) => {
      // Warm vinyl crackle — gentle, continuous, cozy
      const n = ctx.sampleRate * 6;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) {
          const pop = Math.random() > 0.997 ? (Math.random() - 0.5) * 0.08 : 0;
          d[i] = (Math.random() * 2 - 1) * 0.008 + pop;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 0.3;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'scratchlp',
    label: 'Old Record',
    color: '#B09070',
    group: 'texture',
    build: (ctx) => {
      // Scratchy LP surface noise — rhythmic, warm
      const n = ctx.sampleRate * 4;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) {
          const rpm = Math.sin((i / ctx.sampleRate) * 0.56 * Math.PI * 2); // 33rpm rotation
          const scratch = (Math.random() * 2 - 1) * (0.01 + Math.abs(rpm) * 0.005);
          const click = Math.random() > 0.999 ? (Math.random() - 0.5) * 0.12 : 0;
          d[i] = scratch + click;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 800;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'tapeglitch',
    label: 'Tape Glitch',
    color: '#A08878',
    group: 'texture',
    build: (ctx) => {
      // Cassette tape warble — pitch wobble + hiss
      const n = ctx.sampleRate * 8;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) {
          const t = i / ctx.sampleRate;
          const hiss = (Math.random() * 2 - 1) * 0.006;
          const warble = Math.sin(t * 0.8 * Math.PI * 2) * 0.003;
          const dropout = Math.random() > 0.998 ? 0 : 1;
          d[i] = (hiss + warble) * dropout;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2500;
      f.Q.value = 0.5;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  // Ambient — noise, periodic sounds, atmospheric
  {
    id: 'whitenoise',
    label: 'White Noise',
    color: '#D8C8B8',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 4;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'pinknoise',
    label: 'Pink Noise',
    color: '#E8B8C8',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 4;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.04;
          b6 = w * 0.115926;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'brownnoise',
    label: 'Brown Noise',
    color: '#A08060',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => buildNoise(ctx, 'lowpass', 200, 2.0),
  },
  {
    id: 'chimes',
    label: 'Wind Chimes',
    color: '#88D8D0',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Metallic wind chimes — aluminium pipe resonance with overtones
      const n = ctx.sampleRate * 14;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      // Pipe tunings — pentatonic set like real wind chimes
      const pipes = [523, 587, 659, 784, 880, 1047, 1175];
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 10; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 3));
          const pipe = pipes[Math.floor(Math.random() * pipes.length)];
          const ringTime = 1.5 + Math.random() * 2.0; // long ring-out
          const l = Math.floor(ctx.sampleRate * ringTime);
          for (let i = 0; i < l && p + i < n; i++) {
            const t = i / l;
            const env = Math.exp(-t * 3); // exponential decay like metal
            // Fundamental + 2 inharmonic overtones (metallic character)
            const fund = Math.sin((i / ctx.sampleRate) * pipe * Math.PI * 2);
            const over1 = Math.sin((i / ctx.sampleRate) * pipe * 2.76 * Math.PI * 2) * 0.3;
            const over2 = Math.sin((i / ctx.sampleRate) * pipe * 5.4 * Math.PI * 2) * 0.1;
            d[p + i] += (fund + over1 + over2) * env * 0.04;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'tibetanbowl',
    label: 'Tibetan Bowl',
    color: '#C4A060',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Singing bowl — rich resonant tone with beating overtones
      const n = ctx.sampleRate * 16;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      const bowlFreqs = [220, 330, 440, 528]; // common bowl frequencies
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 4; j++) {
          const p = Math.floor((j * n) / 4 + (Math.random() * n) / 8);
          const freq = bowlFreqs[j % bowlFreqs.length];
          const ringTime = 4 + Math.random() * 3;
          const l = Math.floor(ctx.sampleRate * ringTime);
          for (let i = 0; i < l && p + i < n; i++) {
            const t = i / l;
            const env = Math.exp(-t * 1.5) * (1 - Math.exp(-t * 20)); // strike + decay
            // Bowl overtone series — slightly detuned for beating
            const f1 = Math.sin((i / ctx.sampleRate) * freq * Math.PI * 2);
            const f2 = Math.sin((i / ctx.sampleRate) * freq * 2.003 * Math.PI * 2) * 0.5; // beating
            const f3 = Math.sin((i / ctx.sampleRate) * freq * 3.01 * Math.PI * 2) * 0.2;
            d[p + i] += (f1 + f2 + f3) * env * 0.05;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'bubbles',
    label: 'Soft Bubbles',
    color: '#90C0E0',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Gentle underwater bubbles — slow, deep, relaxing
      const n = ctx.sampleRate * 12;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 8; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 0.5));
          const bf = 80 + Math.random() * 150; // lower frequencies = deeper bubbles
          const l = Math.floor(ctx.sampleRate * (0.1 + Math.random() * 0.2)); // longer
          for (let i = 0; i < l && p + i < n; i++) {
            const t = i / l;
            const rise = bf * (1 + t * 1.2); // gentle rise, not sharp
            const env = Math.sin(t * Math.PI); // smooth bell envelope
            d[p + i] += Math.sin((i / ctx.sampleRate) * rise * Math.PI * 2) * env * 0.025;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'echoes',
    label: 'Echoes',
    color: '#D4B870',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 10;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 5; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 2));
          const f = 300 + Math.random() * 200;
          for (let rep = 0; rep < 4; rep++) {
            const offset = p + Math.floor(rep * ctx.sampleRate * 0.4);
            const vol = 0.08 * 0.8 ** rep;
            const l = Math.floor(ctx.sampleRate * 0.15);
            for (let i = 0; i < l && offset + i < n; i++) {
              d[offset + i] +=
                Math.sin((i / ctx.sampleRate) * f * Math.PI * 2) * (1 - i / l) ** 2 * vol;
            }
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'rollingwaves',
    label: 'Rolling Waves',
    color: '#5A8AAA',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 12;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        let last = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          const wave = Math.sin((i / ctx.sampleRate) * 0.15 * Math.PI * 2);
          d[i] = last * 1.2 * Math.max(0, wave * 0.7 + 0.3);
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'whispers',
    label: 'Whispers',
    color: '#D8C8B8',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 8;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 6; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 0.8));
          const l = Math.floor(ctx.sampleRate * (0.3 + Math.random() * 0.5));
          for (let i = 0; i < l && p + i < n; i++) {
            const env = Math.sin((i / l) * Math.PI);
            d[p + i] += (Math.random() * 2 - 1) * env * 0.03;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2000;
      f.Q.value = 2;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'jungle',
    label: 'Lazer Jungle',
    color: '#5F7447',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 10;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 10; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 0.5));
          const isChirp = Math.random() > 0.5;
          const f = isChirp ? 2000 + Math.random() * 3000 : 500 + Math.random() * 800;
          const l = Math.floor(
            ctx.sampleRate * (isChirp ? 0.05 + Math.random() * 0.1 : 0.2 + Math.random() * 0.3),
          );
          for (let i = 0; i < l && p + i < n; i++) {
            const t = i / l;
            const env = isChirp ? (1 - t) ** 2 : Math.sin(t * Math.PI);
            const fMod = isChirp ? f * (1 + t * 0.5) : f;
            d[p + i] +=
              Math.sin((i / ctx.sampleRate) * fMod * Math.PI * 2) * env * (isChirp ? 0.04 : 0.03);
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'crickets',
    label: 'Crickets',
    color: '#A0B070',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 6;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 15; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 0.3));
          const f = 4000 + Math.random() * 2000;
          const chirps = 3 + Math.floor(Math.random() * 4);
          for (let k = 0; k < chirps; k++) {
            const cp = p + Math.floor(k * ctx.sampleRate * 0.06);
            const l = Math.floor(ctx.sampleRate * 0.02);
            for (let i = 0; i < l && cp + i < n; i++) {
              d[cp + i] += Math.sin((i / ctx.sampleRate) * f * Math.PI * 2) * 0.02;
            }
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 3000;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'heartbeat',
    label: 'Heartbeat',
    color: '#C85050',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Rhythmic double-thump — like a slow heartbeat
      const bpm = 60; // 60bpm = 1 beat per second
      const beatLen = ctx.sampleRate * (60 / bpm);
      const n = Math.floor(beatLen * 4); // 4 beats loop
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let beat = 0; beat < 4; beat++) {
          const offset = Math.floor(beat * beatLen);
          // Lub (lower)
          const lubLen = Math.floor(ctx.sampleRate * 0.08);
          for (let i = 0; i < lubLen; i++) {
            const t = i / lubLen;
            d[offset + i] += Math.sin(t * 50 * Math.PI * 2) * (1 - t) ** 2 * 0.12;
          }
          // Dub (higher, slightly delayed)
          const dubOffset = offset + Math.floor(ctx.sampleRate * 0.15);
          const dubLen = Math.floor(ctx.sampleRate * 0.06);
          for (let i = 0; i < dubLen && dubOffset + i < n; i++) {
            const t = i / dubLen;
            d[dubOffset + i] += Math.sin(t * 70 * Math.PI * 2) * (1 - t) ** 2 * 0.08;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 150;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  // More nature variety
  {
    id: 'frogs',
    label: 'Space Frogs',
    color: '#6B8F4E',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Gentle, slow, spacey frog sounds — more reverb-like tones
      const n = ctx.sampleRate * 14;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 5; j++) {
          const p = Math.floor(Math.random() * (n - ctx.sampleRate * 1));
          const f = 200 + Math.random() * 200; // lower, deeper
          const ribbitCount = 2 + Math.floor(Math.random() * 2);
          for (let r = 0; r < ribbitCount; r++) {
            const rp = p + Math.floor(r * ctx.sampleRate * 0.25); // slower spacing
            const rl = Math.floor(ctx.sampleRate * 0.2); // longer notes
            for (let i = 0; i < rl && rp + i < n; i++) {
              const t = i / rl;
              const freq = f * (1 - t * 0.2);
              d[rp + i] +=
                Math.sin((i / ctx.sampleRate) * freq * Math.PI * 2) * Math.sin(t * Math.PI) * 0.03;
            }
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'stream',
    label: 'Stream',
    color: '#70A8C0',
    group: 'nature' as const,
    build: (ctx: AudioContext) => {
      // Babbling brook — filtered noise with rhythmic amplitude modulation
      const n = ctx.sampleRate * 6;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        let last = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.04 * w) / 1.04;
          // Multiple rhythm layers for babbling effect
          const mod1 = 0.5 + 0.5 * Math.sin((i / ctx.sampleRate) * 3.7 * Math.PI * 2);
          const mod2 = 0.7 + 0.3 * Math.sin((i / ctx.sampleRate) * 1.3 * Math.PI * 2);
          d[i] = last * 0.8 * mod1 * mod2;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 0.3;
      s.connect(f);
      return { node: f, source: s };
    },
  },
];

// Audio file cache for real recorded sounds
const audioCache = new Map<string, AudioBuffer>();

function applyCrossfade(buffer: AudioBuffer): AudioBuffer {
  // Fade first 0.3s in and last 0.3s out so loop points don't click
  const fadeLen = Math.min(Math.floor(buffer.sampleRate * 0.3), buffer.length / 4);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      data[i] *= t; // fade in
      data[data.length - 1 - i] *= t; // fade out
    }
  }
  return buffer;
}

function buildRealSound(
  ctx: AudioContext,
  url: string,
): { node: AudioNode; source: AudioBufferSourceNode } {
  const source = ctx.createBufferSource();
  source.loop = true;
  const cached = audioCache.get(url);
  if (cached) {
    source.buffer = cached;
  } else {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        const faded = applyCrossfade(decoded);
        audioCache.set(url, faded);
        try {
          source.buffer = faded;
        } catch {
          /* source may have been stopped */
        }
      })
      .catch(() => {});
  }
  return { node: source, source };
}

const REAL_LAYERS: LayerDef[] = [
  {
    id: 'real-birds',
    label: 'Birds',
    color: '#D4805A',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-birds.ogg'),
  },
  {
    id: 'real-garden',
    label: 'Garden Birds',
    color: '#C8906A',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-garden-birds.ogg'),
  },
  {
    id: 'real-rain',
    label: 'Rain',
    color: '#6890B0',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-rain.ogg'),
  },
  {
    id: 'real-thunder',
    label: 'Thunder',
    color: '#8A6A4A',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-thunder.ogg'),
  },
  {
    id: 'real-wind',
    label: 'Wind & Thunder',
    color: '#A0C8A0',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-wind-thunder.ogg'),
  },
  {
    id: 'real-forest',
    label: 'Forest',
    color: '#7AAA58',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-forest.ogg'),
  },
  {
    id: 'real-cicada',
    label: 'Cicada',
    color: '#A0B070',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-cicada.ogg'),
  },
  {
    id: 'real-clock',
    label: 'Clock',
    color: '#B8A080',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-clock.ogg'),
  },
  {
    id: 'real-windchimes',
    label: 'Wind Chimes',
    color: '#88D8D0',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-windchimes.ogg'),
  },
  {
    id: 'real-sheep',
    label: 'Sheep',
    color: '#C8B898',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-sheep-bleating.ogg'),
  },
  {
    id: 'real-wolf',
    label: 'Wolf Howl',
    color: '#5A6A8A',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-wolf-howl-sound.ogg'),
  },
  {
    id: 'real-bear',
    label: 'Bear',
    color: '#7A5438',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-bear-growl.ogg'),
  },
  {
    id: 'real-singing-bowl',
    label: 'Singing Bowl',
    color: '#C4A060',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-singing-bowl-tibetan.ogg'),
  },
  {
    id: 'real-heavy-rain',
    label: 'Heavy Rain',
    color: '#5A7AAA',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/real-rain-heavy-recording.ogg'),
  },
  // Percussion (Public Domain — see public/sounds/ATTRIBUTIONS.md).
  // Djembe is a hand drum used here as the "Shaman Drum" layer — a deep,
  // steady pulse when looped. The Schamanische_Reise.ogg file is a
  // 60-minute ambient trance recording (too long + too thin to loop as a
  // drum) — surfaced as "Shaman Journey" ambient so the character fits.
  {
    id: 'real-shaman-drum',
    label: 'Shaman Drum',
    color: '#B33A2B',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/drums/Djembe.ogg'),
  },
  {
    id: 'real-shaman-journey',
    label: 'Shaman Journey',
    color: '#8A3A2B',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/drums/Schamanische_Reise.ogg'),
  },
  {
    id: 'real-tambourine',
    label: 'Tambourine',
    color: '#E8B568',
    group: 'real',
    build: (ctx) => buildRealSound(ctx, '/sounds/drums/Tambourine.ogg'),
  },
  // Synthesized sci-fi / cyberpunk
  {
    id: 'spaceship',
    label: 'Spaceship',
    color: '#5060A0',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 10;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) {
          const t = i / n;
          // Low engine hum + occasional whoosh pass-bys
          const hum = Math.sin((i / ctx.sampleRate) * 35 * Math.PI * 2) * 0.04;
          const whooshPhase = (t * 3) % 1;
          const whoosh =
            whooshPhase > 0.8
              ? Math.sin(whooshPhase * 50 * Math.PI * 2) * (1 - (whooshPhase - 0.8) / 0.2) * 0.06
              : 0;
          d[i] = hum + whoosh + (Math.random() * 2 - 1) * 0.008;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 300;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'laser',
    label: 'Space Robot',
    color: '#7060C0',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Long, slow laser sweeps — relaxing sci-fi atmosphere
      const n = ctx.sampleRate * 16;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 3; j++) {
          const p = Math.floor((j * n) / 3 + (Math.random() * n) / 6);
          const freq = 400 + Math.random() * 600;
          const sweepLen = Math.floor(ctx.sampleRate * (3 + Math.random() * 3));
          for (let i = 0; i < sweepLen && p + i < n; i++) {
            const t = i / sweepLen;
            const env = Math.sin(t * Math.PI); // smooth bell
            const sweep = freq * (1 + t * 0.8); // gentle rise
            d[p + i] += Math.sin((i / ctx.sampleRate) * sweep * Math.PI * 2) * env * 0.03;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      return { node: s as AudioNode, source: s };
    },
  },
  {
    id: 'cyberdrone',
    label: 'Cyber Drone',
    color: '#4050A0',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Deep modulated drone with digital artifacts
      const n = ctx.sampleRate * 12;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) {
          const t = i / ctx.sampleRate;
          const base = Math.sin(t * 45 * Math.PI * 2);
          const mod = Math.sin(t * 0.3 * Math.PI * 2);
          const glitch = Math.random() > 0.998 ? (Math.random() * 2 - 1) * 0.15 : 0;
          d[i] = base * (0.3 + mod * 0.2) * 0.06 + glitch;
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 250;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'cafechatter',
    label: 'Cafe',
    color: '#C8906A',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Synthesized background chatter — overlapping filtered noise bursts
      const n = ctx.sampleRate * 10;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        // Multiple "voices" = noise bursts at speech-like frequencies
        for (let v = 0; v < 12; v++) {
          const start = Math.floor(Math.random() * n * 0.8);
          const len = Math.floor(ctx.sampleRate * (0.5 + Math.random() * 2));
          const pitch = 150 + Math.random() * 200;
          for (let i = 0; i < len && start + i < n; i++) {
            const t = i / len;
            const env = Math.sin(t * Math.PI) * (0.8 + 0.2 * Math.sin(t * 8 * Math.PI));
            const noise = Math.random() * 2 - 1;
            const formant = Math.sin((i / ctx.sampleRate) * pitch * Math.PI * 2);
            d[start + i] += (noise * 0.3 + formant * 0.7) * env * 0.015;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 500;
      f.Q.value = 0.3;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  // Synthesized predators — fun!
  {
    id: 'lion',
    label: 'Wobble',
    color: '#C87030',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 14;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 3; j++) {
          const p = Math.floor((j * n) / 3 + (Math.random() * n) / 6);
          const roarLen = Math.floor(ctx.sampleRate * (2 + Math.random() * 1.5));
          for (let i = 0; i < roarLen && p + i < n; i++) {
            const t = i / roarLen;
            // Build-up → peak → fade — like a real roar
            const env = t < 0.2 ? t / 0.2 : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
            const freq = 80 + 30 * Math.sin(t * 6 * Math.PI); // rumbling vibrato
            const growl = Math.sin((i / ctx.sampleRate) * freq * Math.PI * 2);
            const noise = (Math.random() * 2 - 1) * 0.4;
            d[p + i] += (growl * 0.6 + noise * 0.4) * env * 0.06;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'trex',
    label: 'T-Rex',
    color: '#8A4030',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      const n = ctx.sampleRate * 16;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 2; j++) {
          const p = Math.floor((j * n) / 2 + (Math.random() * n) / 4);
          const roarLen = Math.floor(ctx.sampleRate * (3 + Math.random() * 2));
          for (let i = 0; i < roarLen && p + i < n; i++) {
            const t = i / roarLen;
            const env = t < 0.15 ? (t / 0.15) ** 2 : t < 0.5 ? 1 : (1 - (t - 0.5) / 0.5) ** 0.5;
            // Very low frequency sweep with sub-bass rumble
            const freq = 30 + 20 * Math.sin(t * 4 * Math.PI);
            const base = Math.sin((i / ctx.sampleRate) * freq * Math.PI * 2);
            const sub = Math.sin((i / ctx.sampleRate) * 18 * Math.PI * 2) * 0.5;
            const distort = Math.tanh((base + sub) * 3) * 0.5;
            const noise = (Math.random() * 2 - 1) * 0.2;
            d[p + i] += (distort + noise) * env * 0.08;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 200;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'softlaser',
    label: 'Soft Lasers',
    color: '#A08090',
    group: 'ambient' as const,
    build: (ctx: AudioContext) => {
      // Very long, gentle frequency sweeps — ethereal and calming
      const n = ctx.sampleRate * 20;
      const b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let j = 0; j < 4; j++) {
          const p = Math.floor((j * n) / 4 + (Math.random() * n) / 8);
          const sweepLen = Math.floor(ctx.sampleRate * (4 + Math.random() * 4));
          const baseFreq = 300 + Math.random() * 300;
          for (let i = 0; i < sweepLen && p + i < n; i++) {
            const t = i / sweepLen;
            const env = Math.sin(t * Math.PI) ** 0.5; // very smooth
            const freq = baseFreq * (1 + Math.sin(t * Math.PI) * 0.5);
            d[p + i] += Math.sin((i / ctx.sampleRate) * freq * Math.PI * 2) * env * 0.025;
          }
        }
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1000;
      s.connect(f);
      return { node: f, source: s };
    },
  },
  {
    id: 'long-soft-light',
    label: 'Long Soft Light',
    color: '#D7C9A1',
    group: 'ambient' as const,
    build: (ctx: AudioContext) =>
      buildLongSoftLoop(ctx, {
        tones: [
          { freq: 132.0, amp: 0.024, driftSeconds: 11 },
          { freq: 198.5, amp: 0.014, driftSeconds: 13 },
          { freq: 264.0, amp: 0.008, driftSeconds: 16 },
        ],
        noise: 0.018,
        lowpass: 980,
        delaySeconds: 0.82,
        delayWet: 0.48,
        feedback: 0.42,
      }),
  },
  {
    id: 'long-soft-ground',
    label: 'Long Soft Ground',
    color: '#9B7A58',
    group: 'ambient' as const,
    build: (ctx: AudioContext) =>
      buildLongSoftLoop(ctx, {
        tones: [
          { freq: 48.0, amp: 0.03, driftSeconds: 14 },
          { freq: 72.0, amp: 0.018, driftSeconds: 16 },
          { freq: 96.0, amp: 0.01, driftSeconds: 19 },
        ],
        noise: 0.012,
        lowpass: 520,
        delaySeconds: 1.12,
        delayWet: 0.52,
        feedback: 0.46,
      }),
  },
  {
    id: 'long-soft-cloud',
    label: 'Long Soft Cloud',
    color: '#A7B3C8',
    group: 'ambient' as const,
    build: (ctx: AudioContext) =>
      buildLongSoftLoop(ctx, {
        tones: [
          { freq: 86.0, amp: 0.02, driftSeconds: 15 },
          { freq: 129.0, amp: 0.015, driftSeconds: 18 },
          { freq: 172.0, amp: 0.009, driftSeconds: 21 },
        ],
        noise: 0.022,
        lowpass: 740,
        delaySeconds: 1.36,
        delayWet: 0.58,
        feedback: 0.5,
      }),
  },
  {
    id: 'long-soft-deep',
    label: 'Long Soft Deep',
    color: '#6F665C',
    group: 'ambient' as const,
    build: (ctx: AudioContext) =>
      buildLongSoftLoop(ctx, {
        tones: [
          { freq: 36.0, amp: 0.034, driftSeconds: 16 },
          { freq: 54.0, amp: 0.018, driftSeconds: 20 },
          { freq: 108.0, amp: 0.008, driftSeconds: 24 },
        ],
        noise: 0.01,
        lowpass: 360,
        delaySeconds: 1.58,
        delayWet: 0.5,
        feedback: 0.44,
      }),
  },
];

const ALL_LAYERS = [...LAYERS, ...REAL_LAYERS];

// ── Layer category system ──
type LayerCategory = 'waters' | 'birds' | 'drones' | 'textures' | 'wild' | 'digital';
const CATEGORY_LABELS: Record<LayerCategory, string> = {
  waters: 'Waters',
  birds: 'Birds & Forest',
  drones: 'Drones & Tones',
  textures: 'Textures',
  wild: 'Wild & Ceremony',
  digital: 'Digital',
};
const CATEGORY_COLORS: Record<LayerCategory, string> = {
  waters: '#6890B0',
  birds: '#7AAA58',
  drones: '#C4A060',
  textures: '#A0907A',
  wild: '#B33A2B',
  digital: '#5060A0',
};
const CATEGORY_ORDER: LayerCategory[] = [
  'waters',
  'birds',
  'drones',
  'textures',
  'wild',
  'digital',
];
function getLayerCategory(id: string): LayerCategory {
  if (
    ['rain', 'ocean', 'wind', 'waves', 'rollingwaves', 'real-rain', 'real-heavy-rain'].includes(id)
  )
    return 'waters';
  if (['birds', 'forest', 'real-birds', 'real-garden', 'real-forest', 'real-cicada'].includes(id))
    return 'birds';
  if (
    [
      'drone',
      'bowl',
      'harmonic',
      'sub',
      'tibetanbowl',
      'real-singing-bowl',
      'chimes',
      'bubbles',
      'echoes',
      'long-soft-light',
      'long-soft-ground',
      'long-soft-cloud',
      'long-soft-deep',
    ].includes(id)
  )
    return 'drones';
  if (
    [
      'crackle',
      'vinylwarm',
      'scratchlp',
      'tapeglitch',
      'whitenoise',
      'pinknoise',
      'brownnoise',
      'breath',
      'hum',
    ].includes(id)
  )
    return 'textures';
  if (
    [
      'fire',
      'thunder',
      'real-thunder',
      'real-wind',
      'real-wolf',
      'real-bear',
      'real-sheep',
      'real-shaman-drum',
      'real-shaman-journey',
      'real-tambourine',
      'real-windchimes',
      'real-clock',
    ].includes(id)
  )
    return 'wild';
  return 'digital';
}

// ── Genre modes ──
interface Genre {
  id: string;
  label: string;
  color: string;
  subtitle: string;
  beat: number;
  base: number;
  layers: string[];
}

const GENRES: Genre[] = [
  {
    id: 'deep-ocean',
    label: 'Deep Ocean',
    color: '#5A8AAA',
    subtitle: 'waves · drone · vast stillness',
    beat: 3,
    base: 45,
    layers: ['ocean', 'waves', 'sub', 'breath'],
  },
  {
    id: 'forest-morning',
    label: 'Forest Morning',
    color: '#7AAA58',
    subtitle: 'birds · wind · alive',
    beat: 6,
    base: 65,
    layers: ['forest', 'birds', 'wind'],
  },
  {
    id: 'fireside',
    label: 'Fireside',
    color: '#D4805A',
    subtitle: 'fire · drone · warm crackle',
    beat: 5,
    base: 55,
    layers: ['fire', 'drone', 'crackle'],
  },
  {
    id: 'rain-night',
    label: 'Rain Night',
    color: '#6890B0',
    subtitle: 'rain · thunder · deep rest',
    beat: 3,
    base: 40,
    layers: ['rain', 'thunder', 'sub'],
  },
  {
    id: 'focus',
    label: 'Focus',
    color: '#C4A060',
    subtitle: 'bowl · hum · clear mind',
    beat: 8,
    base: 75,
    layers: ['bowl', 'hum', 'wind'],
  },
  {
    id: 'trippy',
    label: 'Trippy',
    color: '#C4A060',
    subtitle: 'harmonic · ocean · floating',
    beat: 4,
    base: 50,
    layers: ['ocean', 'harmonic', 'sub', 'breath'],
  },
  {
    id: 'storm',
    label: 'Storm',
    color: '#8A6A4A',
    subtitle: 'thunder · rain · waves · power',
    beat: 3,
    base: 35,
    layers: ['thunder', 'rain', 'waves', 'wind'],
  },
  {
    id: 'zen',
    label: 'Zen',
    color: '#A0907A',
    subtitle: 'bowl · breath · silence',
    beat: 4,
    base: 45,
    layers: ['bowl', 'breath'],
  },
];

type LongSoftMoodId = 'relax' | 'focus' | 'sleep' | 'still' | 'ground';

type LongSoftMood = {
  id: LongSoftMoodId;
  label: string;
  subtitle: string;
  color: string;
  volume: number;
  reverb: number;
  layers: Record<string, number>;
};

const LONG_SOFT_MOODS: LongSoftMood[] = [
  {
    id: 'relax',
    label: 'Relax',
    subtitle: 'light cloud, soft ground',
    color: '#B9A86C',
    volume: 0.12,
    reverb: 76,
    layers: {
      'long-soft-light': 0.36,
      'long-soft-cloud': 0.22,
      rollingwaves: 0.08,
    },
  },
  {
    id: 'focus',
    label: 'Focus',
    subtitle: 'clear air, low room',
    color: '#718AA5',
    volume: 0.1,
    reverb: 62,
    layers: {
      'long-soft-light': 0.24,
      'long-soft-ground': 0.18,
      hum: 0.06,
    },
  },
  {
    id: 'sleep',
    label: 'Sleep',
    subtitle: 'deep cloud, brown hush',
    color: '#66768E',
    volume: 0.08,
    reverb: 84,
    layers: {
      'long-soft-cloud': 0.34,
      'long-soft-deep': 0.22,
      brownnoise: 0.08,
    },
  },
  {
    id: 'still',
    label: 'Still',
    subtitle: 'one quiet horizon',
    color: '#A0907A',
    volume: 0.08,
    reverb: 82,
    layers: {
      'long-soft-cloud': 0.24,
      'long-soft-light': 0.18,
      breath: 0.06,
    },
  },
  {
    id: 'ground',
    label: 'Ground',
    subtitle: 'deeper, slower body',
    color: '#8C7259',
    volume: 0.09,
    reverb: 72,
    layers: {
      'long-soft-ground': 0.34,
      'long-soft-deep': 0.28,
      ocean: 0.06,
    },
  },
];

function _getBrainState(beat: number): string {
  if (beat <= 4) return 'delta · deep rest';
  if (beat <= 8) return 'theta · meditation';
  if (beat <= 14) return 'alpha · relaxed focus';
  if (beat <= 30) return 'beta · active thinking';
  return 'gamma · peak awareness';
}

function loadNum(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

// Each pad's position in grid order (category by category), so palettes walk
// their colours across the whole grid and neighbouring pads differ.
const PAD_GRID_INDEX: Record<string, number> = Object.fromEntries(
  CATEGORY_ORDER.flatMap((cat) =>
    ALL_LAYERS.filter((l) => getLayerCategory(l.id) === cat).map((l) => l.id),
  ).map((id, i) => [id, i]),
);

// ── Adaptive suggestion from check-in state ──
function getSuggestion(
  body: number,
  focus: number,
  clarity: number,
): { preset: string; reason: string } {
  const tense = body >= 3;
  const relaxed = body <= 1;
  const focused = focus <= 1;
  const drifting = focus >= 3;
  const foggy = clarity >= 3;

  if (tense && foggy)
    return {
      preset: 'meditation',
      reason: 'you seem tense and foggy — try theta waves to calm the mind',
    };
  if (tense && focused)
    return {
      preset: 'calm-focus',
      reason: 'intense focus detected — alpha waves can sustain it without burning out',
    };
  if (tense && drifting)
    return { preset: 'deep-sleep', reason: 'tension + disconnection — delta waves to reset' };
  if (relaxed && drifting)
    return { preset: 'active-mind', reason: 'relaxed but drifting — beta waves to sharpen' };
  if (relaxed && focused)
    return { preset: 'creativity', reason: 'you are in a sweet spot — theta can deepen the flow' };
  if (foggy)
    return { preset: 'calm-focus', reason: 'clarity is low — alpha waves can clear the fog' };
  if (drifting)
    return { preset: 'active-mind', reason: 'mind is wandering — beta waves to engage' };
  return { preset: 'calm-focus', reason: 'balanced state — alpha waves to maintain' };
}

// ── Crossfade duration in seconds ──
const CROSSFADE_DURATION = 1.5;

// Saved-item marker shape icon — user taps to cycle dot/star/heart/losange/triangle/square
type SavedShape = 'dot' | 'star' | 'heart' | 'losange' | 'triangle' | 'square';

function SavedShapeIcon({ shape, color }: { shape: SavedShape; color: string }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 12 12',
    fill: color,
    opacity: 0.65,
  } as const;
  switch (shape) {
    case 'star':
      return (
        <svg {...common}>
          <title>Star marker</title>
          <path d="M6 1l1.5 3.3 3.5.4-2.7 2.4.8 3.5L6 8.9 2.9 10.6l.8-3.5L1 4.7l3.5-.4L6 1z" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <title>Heart marker</title>
          <path d="M6 10.3S1.2 7.4 1.2 4.3c0-1.5 1.2-2.7 2.7-2.7 1 0 1.7.5 2.1 1.2.4-.7 1.1-1.2 2.1-1.2 1.5 0 2.7 1.2 2.7 2.7 0 3.1-4.8 6-4.8 6z" />
        </svg>
      );
    case 'losange':
      return (
        <svg {...common}>
          <title>Diamond marker</title>
          <path d="M6 1l5 5-5 5-5-5 5-5z" />
        </svg>
      );
    case 'triangle':
      return (
        <svg {...common}>
          <title>Triangle marker</title>
          <path d="M6 1.5l4.5 8H1.5L6 1.5z" />
        </svg>
      );
    case 'square':
      return (
        <svg {...common}>
          <title>Square marker</title>
          <rect x="2" y="2" width="8" height="8" rx="1" />
        </svg>
      );
    default:
      return (
        <span
          className="block rounded-full"
          style={{ width: 8, height: 8, background: color, opacity: 0.5 }}
        />
      );
  }
}

export default function BinauralTuner() {
  const [playing, setPlaying] = useState(false);
  const [binauralOn, setBinauralOn] = useState(true);
  const [baseToneOn, setBaseToneOn] = useState(true);
  // Engine-breathing: slow organic modulation of the binaural beat frequency,
  // feels like a ship's engine on the ocean rather than a fixed tone.
  const [engineBreathing, setEngineBreathing] = useState(false);
  const engineLfoSlowRef = useRef<OscillatorNode | null>(null);
  const engineLfoSlowGainRef = useRef<GainNode | null>(null);
  const engineLfoFastRef = useRef<OscillatorNode | null>(null);
  const engineLfoFastGainRef = useRef<GainNode | null>(null);
  const panLRef = useRef<StereoPannerNode | null>(null);
  const panRRef = useRef<StereoPannerNode | null>(null);
  const binGainRef = useRef<GainNode | null>(null);
  const oscLGainRef = useRef<GainNode | null>(null);
  const oscRGainRef = useRef<GainNode | null>(null);
  const [baseFreq, setBaseFreq] = useState(60);
  const [beatFreq, setBeatFreq] = useState(4);
  const [volume, setVolume] = useState(0.15);
  const [activeLayers, setActiveLayers] = useState<Record<string, number>>({});
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [longSoftMood, setLongSoftMood] = useState<LongSoftMoodId | null>(null);
  const [_showSuggestion, _setShowSuggestion] = useState(true);
  const [_view, _setView] = useState<'presets' | 'layers' | 'genres'>('presets');
  const [tremolo, setTremolo] = useState(false);
  const [waveAmount, setWaveAmount] = useState(0);
  const tremoloSpeed = 0.15;
  const [waveStyle, setWaveStyle] = useState<WaveStyle>('zigzag');
  useEffect(() => {
    setTremolo(waveAmount > 0);
  }, [waveAmount]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('colourmap:wave-style');
      if (stored && WAVE_STYLES.some((w) => w.id === stored)) setWaveStyle(stored as WaveStyle);
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('colourmap:wave-style', waveStyle);
    } catch {
      /* silent */
    }
  }, [waveStyle]);
  const [beatPreset, setBeatPreset] = useState<BeatPreset>('off');
  const [beatVolume, setBeatVolume] = useState(0.3);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatBufferRef = useRef<AudioBuffer | null>(null);
  const beatGainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('colourmap:beat-preset');
      if (stored && BEAT_PRESETS.some((b) => b.id === stored)) {
        setBeatPreset(stored as BeatPreset);
      }
      const v = Number.parseFloat(localStorage.getItem('colourmap:beat-volume') ?? '');
      if (!Number.isNaN(v) && v >= 0 && v <= 1) setBeatVolume(v);
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('colourmap:beat-preset', beatPreset);
    } catch {
      /* silent */
    }
  }, [beatPreset]);
  useEffect(() => {
    try {
      localStorage.setItem('colourmap:beat-volume', String(beatVolume));
    } catch {
      /* silent */
    }
    if (beatGainRef.current) beatGainRef.current.gain.value = beatVolume;
  }, [beatVolume]);
  const warmth = 0.3; // always-on gentle warmth for smoother sound
  const filterFreq = 5000; // wide open — no muffling
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);
  const warmOscRef = useRef<OscillatorNode | null>(null);
  const warmGainRef = useRef<GainNode | null>(null);
  const binFilterRef = useRef<BiquadFilterNode | null>(null);
  const [savedMixes, setSavedMixes] = useState<
    {
      name: string;
      base: number;
      beat: number;
      vol: number;
      layers: Record<string, number>;
      binaural: boolean;
      shape?: 'dot' | 'star' | 'heart' | 'losange' | 'triangle' | 'square';
    }[]
  >([]);
  const [reverbMix, setReverbMix] = useState(0.7);
  const [layerReverb, setLayerReverb] = useState(30); // 0-100, shared layer reverb
  const layerReverbRef = useRef<ConvolverNode | null>(null);
  const layerDryRef = useRef<GainNode | null>(null);
  const layerWetRef = useRef<GainNode | null>(null);
  // Harmony tones — musical intervals relative to base frequency
  const HARMONICS = [
    { id: 'sub-third', label: 'Sub Third', ratio: 4 / 5, color: '#B85A50' },
    { id: 'sub-fourth', label: 'Sub Fourth', ratio: 3 / 4, color: '#9A4858' },
    { id: 'sub-fifth', label: 'Sub Fifth', ratio: 2 / 3, color: '#7A3850' },
    { id: 'sub-octave', label: 'Sub Octave', ratio: 1 / 2, color: '#5A2E48' },
    { id: 'third', label: 'Third', ratio: 5 / 4, color: '#D4805A' },
    { id: 'fourth', label: 'Fourth', ratio: 4 / 3, color: '#C4A060' },
    { id: 'fifth', label: 'Fifth', ratio: 3 / 2, color: '#6890B0' },
    { id: 'octave', label: 'Octave', ratio: 2, color: '#7AAA58' },
  ] as const;
  const [activeHarmonics, setActiveHarmonics] = useState<Set<string>>(new Set());
  const harmOscsRef = useRef<Map<string, { osc: OscillatorNode; gain: GainNode }>>(new Map());

  // Sacred / Solfeggio frequencies
  const SACRED = [
    { id: 's174', label: '174', freq: 174, desc: 'foundation', color: '#5A8A6A' },
    { id: 's285', label: '285', freq: 285, desc: 'healing', color: '#6A90B8' },
    { id: 's396', label: '396', freq: 396, desc: 'liberation', color: '#C4A060' },
    { id: 's417', label: '417', freq: 417, desc: 'change', color: '#D4805A' },
    { id: 's432', label: '432', freq: 432, desc: 'nature', color: '#7AAA58' },
    { id: 's528', label: '528', freq: 528, desc: 'love', color: '#5FAA70' },
    { id: 's639', label: '639', freq: 639, desc: 'connection', color: '#6890B0' },
    { id: 's741', label: '741', freq: 741, desc: 'intuition', color: '#D4B870' },
    { id: 's852', label: '852', freq: 852, desc: 'spiritual', color: '#D8A878' },
    { id: 's963', label: '963', freq: 963, desc: 'higher self', color: '#1E7A50' },
  ] as const;
  const [activeSacred, setActiveSacred] = useState<Set<string>>(new Set());
  const sacredOscsRef = useRef<Map<string, { osc: OscillatorNode; gain: GainNode }>>(new Map());
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);

  // Generative melodies
  const MELODIES: {
    readonly id: string;
    readonly label: string;
    readonly color: string;
    readonly type: OscillatorType;
    readonly attack: number;
    readonly release: number;
    readonly octave: number;
    readonly sampledPack?: SamplePackId;
  }[] = [
    {
      id: 'piano',
      label: 'Soft Piano',
      color: '#C4A060',
      type: 'triangle' as OscillatorType,
      attack: 0.3,
      release: 3.5,
      octave: 4,
    },
    {
      id: 'musicbox',
      label: 'Music Box',
      color: '#7A9AB8',
      type: 'sine' as OscillatorType,
      attack: 0.4,
      release: 3.0,
      octave: 4,
    },
    {
      id: 'pad',
      label: 'Ambient Pad',
      color: '#7AAA58',
      type: 'sine' as OscillatorType,
      attack: 1.2,
      release: 6.0,
      octave: 3,
    },
    {
      id: 'harp',
      label: 'Harp',
      color: '#C4A060',
      type: 'triangle' as OscillatorType,
      attack: 0.1,
      release: 2.0,
      octave: 5,
    },
    {
      id: 'strings',
      label: 'Strings',
      color: '#D4805A',
      type: 'sawtooth' as OscillatorType,
      attack: 0.8,
      release: 5.0,
      octave: 3,
    },
    {
      id: 'guitar',
      label: 'Boat Sounds',
      color: '#A88848',
      type: 'sawtooth' as OscillatorType,
      attack: 0.2,
      release: 4.0,
      octave: 3,
    },
    // Real sampled instruments (CC0, from public/sounds/<pack>/).
    // When sampledPack is set, the melody loop plays a real recording
    // via playSampledNote() instead of building an oscillator.
    {
      id: 'real-piano',
      label: 'Real Piano',
      color: '#C4A060',
      type: 'sine' as OscillatorType,
      attack: 0.1,
      release: 3.5,
      octave: 4,
      sampledPack: 'piano',
    },
    {
      id: 'real-violin',
      label: 'Real Violin',
      color: '#D4805A',
      type: 'sine' as OscillatorType,
      attack: 0.1,
      release: 3.5,
      octave: 4,
      sampledPack: 'violin',
    },
    {
      id: 'real-flute',
      label: 'Real Flute',
      color: '#5A7A9A',
      type: 'sine' as OscillatorType,
      attack: 0.1,
      release: 3.5,
      octave: 5,
      sampledPack: 'flute',
    },
    {
      id: 'real-harp',
      label: 'Real Harp',
      color: '#6890B0',
      type: 'sine' as OscillatorType,
      attack: 0.1,
      release: 3.5,
      octave: 5,
      sampledPack: 'harp',
    },
  ];
  // Musical scales for melodies
  const MELODY_SCALES: Record<string, { label: string; notes: number[] }> = {
    pentatonic: { label: 'Pentatonic', notes: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] },
    major: { label: 'Major', notes: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19] },
    minor: { label: 'Minor', notes: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19] },
    japanese: { label: 'Japanese', notes: [0, 1, 5, 7, 8, 12, 13, 17, 19, 20] },
    blues: { label: 'Blues', notes: [0, 3, 5, 6, 7, 10, 12, 15, 17, 18, 19, 22] },
    arabic: { label: 'Arabic', notes: [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19] },
  };
  const [melodyScale, setMelodyScale] = useState('pentatonic');
  const [activeMelodies, setActiveMelodies] = useState<Set<string>>(new Set());
  const [melodySpeed, setMelodySpeed] = useState(50); // 0-100, 0=very slow, 100=fast
  const [melodyReverb, setMelodyReverb] = useState(80); // 0-100
  const [melodyVolume, setMelodyVolume] = useState(1); // 0-1, multiplies per-note vol
  const melodyTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const melodyActiveIdsRef = useRef<Set<string>>(new Set());
  const melodyReverbRef = useRef<ConvolverNode | null>(null);
  const melodyDryRef = useRef<GainNode | null>(null);
  const melodyWetRef = useRef<GainNode | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: uses refs, stable
  const playMelodyNote = useCallback((melDef: (typeof MELODIES)[number]) => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain || !melodyActiveIdsRef.current.has(melDef.id)) return;

    // Pick a random note from the selected scale
    const scaleNotes = MELODY_SCALES[melodyScale]?.notes || MELODY_SCALES.pentatonic.notes;
    const noteIdx = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];

    // Sampled-instrument branch — play a real recording at the chosen
    // pitch, schedule the next note, and return. Skips the entire
    // oscillator stack below.
    if (melDef.sampledPack) {
      const octavesFromCenter = Math.floor(noteIdx / 12);
      const baseNote = 261.63 * 2 ** (melDef.octave - 4);
      const freq = baseNote * 2 ** (noteIdx / 12);
      const output = melodyDryRef.current ?? gain;
      // Per-note volume × user-controlled melodyVolume (0-1).
      const vol = 0.25 * melodyVolume;
      playSampledNote(ctx, melDef.sampledPack, freq, vol, output);
      if (melodyReverbRef.current) {
        playSampledNote(ctx, melDef.sampledPack, freq, vol * 0.6, melodyReverbRef.current);
      }
      // Schedule next note on the same cadence as the other melodies
      const speedMult =
        melodySpeed < 50 ? 1 + (50 - melodySpeed) / 10 : 1 / (1 + (melodySpeed - 50) / 25);
      const interval = (1500 + Math.random() * 3000) * speedMult;
      melodyTimersRef.current.set(
        melDef.id,
        setTimeout(() => {
          if (melodyActiveIdsRef.current.has(melDef.id)) playMelodyNote(melDef);
        }, interval),
      );
      // Unused in sampled path — keeps the later code skipped without
      // a TypeScript "unused var" complaint.
      void octavesFromCenter;
      return;
    }

    // Multi-octave spread (RM-C3): about 25% chance of ±1 octave jump
    // and 5% chance of ±2 octave jump on each note. Gives the melody
    // real range instead of sitting in one register. Base probability
    // 55% keeps the home octave dominant so the key center stays audible.
    const r = Math.random();
    let octaveOffset = 0;
    if (r < 0.025) octaveOffset = -24;
    else if (r < 0.05) octaveOffset = 24;
    else if (r < 0.2) octaveOffset = -12;
    else if (r < 0.35) octaveOffset = 12;

    // Clamp to a musical range: midi ~24 (C1) through midi ~96 (C7).
    // melDef.octave is the center octave (4 for C4); noteIdx adds
    // semitones on top; octaveOffset may push further. Fold back if
    // we land outside the safe range.
    const octavesFromCenter = Math.floor((noteIdx + octaveOffset) / 12);
    const finalOctave = melDef.octave + octavesFromCenter;
    let safeOctaveOffset = octaveOffset;
    if (finalOctave < 1) safeOctaveOffset += 12 * (1 - finalOctave);
    else if (finalOctave > 7) safeOctaveOffset -= 12 * (finalOctave - 7);

    const baseNote = 261.63 * 2 ** (melDef.octave - 4); // C of the octave
    const freq = baseNote * 2 ** ((noteIdx + safeOctaveOffset) / 12);

    const osc = ctx.createOscillator();
    osc.type = melDef.type;
    osc.frequency.value = freq;

    // For strings, add lowpass filter
    let source: AudioNode = osc;
    if (melDef.id === 'strings') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      lp.Q.value = 0.5;
      osc.connect(lp);
      source = lp;
    }

    // For guitar, add distortion + pitch bend
    if (melDef.id === 'guitar') {
      // Waveshaper distortion
      const ws = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = i / 128 - 1;
        curve[i] = Math.tanh(x * 2.5); // soft clip
      }
      ws.curve = curve;
      ws.oversample = '2x';
      // Lowpass to tame highs
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      lp.Q.value = 1;
      osc.connect(ws);
      ws.connect(lp);
      source = lp;
      // Pitch bend — slide into the note
      const t0 = ctx.currentTime;
      osc.frequency.setValueAtTime(freq * 0.95, t0);
      osc.frequency.linearRampToValueAtTime(freq, t0 + 0.15);
    }

    // For pad, add second detuned osc
    let osc2: OscillatorNode | null = null;
    if (melDef.id === 'pad') {
      osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.003; // slight detune
    }

    const env = ctx.createGain();
    const now = ctx.currentTime;
    const baseVol = melDef.id === 'pad' ? 0.12 : melDef.id === 'strings' ? 0.08 : 0.15;
    const vol = baseVol * melodyVolume;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(vol, now + melDef.attack);
    env.gain.linearRampToValueAtTime(0, now + melDef.attack + melDef.release);

    source.connect(env);
    if (osc2) {
      const env2 = ctx.createGain();
      env2.gain.setValueAtTime(0, now);
      env2.gain.linearRampToValueAtTime(vol * 0.7, now + melDef.attack);
      env2.gain.linearRampToValueAtTime(0, now + melDef.attack + melDef.release);
      osc2.connect(env2);
      env2.connect(gain);
      osc2.start(now);
      osc2.stop(now + melDef.attack + melDef.release + 0.1);
    }

    // Route through melody reverb if set up, otherwise direct
    if (melodyDryRef.current && melodyReverbRef.current) {
      env.connect(melodyDryRef.current);
      env.connect(melodyReverbRef.current);
    } else {
      env.connect(gain);
    }
    osc.start(now);
    osc.stop(now + melDef.attack + melDef.release + 0.1);

    // Schedule next note — speed 0=slow, 50=normal, 100=fast
    const speedMult =
      melodySpeed < 50 ? 1 + (50 - melodySpeed) / 10 : 1 / (1 + (melodySpeed - 50) / 25);
    const baseInterval =
      melDef.id === 'pad'
        ? 3000 + Math.random() * 4000
        : melDef.id === 'harp'
          ? 400 + Math.random() * 800
          : 1500 + Math.random() * 3000;
    const interval = baseInterval * speedMult;

    melodyTimersRef.current.set(
      melDef.id,
      setTimeout(() => {
        if (melodyActiveIdsRef.current.has(melDef.id)) playMelodyNote(melDef);
      }, interval),
    );
  }, []);

  // Start/stop melodies — supports multiple simultaneous
  // biome-ignore lint/correctness/useExhaustiveDependencies: MELODIES stable, melodyReverb used in setup only
  useEffect(() => {
    // Start newly activated melodies
    for (const m of MELODIES) {
      if (activeMelodies.has(m.id) && !melodyActiveIdsRef.current.has(m.id) && ctxRef.current) {
        melodyActiveIdsRef.current.add(m.id);

        // Set up melody reverb on first melody activation
        if (!melodyReverbRef.current && ctxRef.current) {
          const ctx = ctxRef.current;
          const len = ctx.sampleRate * 4;
          const buf = ctx.createBuffer(2, len, ctx.sampleRate);
          for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
              d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
            }
          }
          const rev = ctx.createConvolver();
          rev.buffer = buf;
          melodyReverbRef.current = rev;
          const dry = ctx.createGain();
          dry.gain.value = 1 - melodyReverb / 100;
          melodyDryRef.current = dry;
          const wet = ctx.createGain();
          wet.gain.value = melodyReverb / 100;
          melodyWetRef.current = wet;
          dry.connect(ctx.destination);
          rev.connect(wet);
          wet.connect(ctx.destination);
        }

        playMelodyNote(m);
      }
    }
    // Stop removed melodies
    for (const id of melodyActiveIdsRef.current) {
      if (!activeMelodies.has(id)) {
        melodyActiveIdsRef.current.delete(id);
        const timer = melodyTimersRef.current.get(id);
        if (timer) {
          clearTimeout(timer);
          melodyTimersRef.current.delete(id);
        }
      }
    }
    return () => {
      // Cleanup all on unmount
      for (const [, timer] of melodyTimersRef.current) {
        clearTimeout(timer);
      }
      melodyTimersRef.current.clear();
      melodyActiveIdsRef.current.clear();
    };
  }, [activeMelodies, playMelodyNote]);

  // Melody reverb mix update
  useEffect(() => {
    if (melodyDryRef.current) melodyDryRef.current.gain.value = 1 - melodyReverb / 100;
    if (melodyWetRef.current) melodyWetRef.current.gain.value = melodyReverb / 100;
  }, [melodyReverb]);

  // Layer reverb mix update
  useEffect(() => {
    if (layerDryRef.current) layerDryRef.current.gain.value = 1 - layerReverb / 100;
    if (layerWetRef.current) layerWetRef.current.gain.value = layerReverb / 100;
  }, [layerReverb]);

  // Voice / Poetry system
  const VOICE_CONTENT = {
    affirmations: [
      'I am exactly where I need to be.',
      'This moment is enough.',
      'I release what I cannot control.',
      'My breath is my anchor.',
      'I am becoming who I was meant to be.',
      'Stillness is not emptiness. It is fullness.',
      'I trust the process of my life.',
      'Every breath is a new beginning.',
      'I am worthy of peace.',
      'The light in me recognizes the light in others.',
      'I choose calm over chaos.',
      'My feelings are valid. I honor them.',
    ],
    meditation: [
      'Close your eyes. Feel the weight of your body.',
      'Breathe in through the nose. Slowly. Deeply.',
      'Hold. Feel the stillness between breaths.',
      'Breathe out. Let everything go.',
      'Notice where you hold tension. Let it soften.',
      'You are safe. You are here. You are whole.',
      'The thoughts will come. Let them pass like clouds.',
      'Return to the breath. Always the breath.',
      'Feel the ground beneath you. Solid. Still.',
      'You are not your thoughts. You are the space that holds them.',
    ],
    poetry: [
      'The river does not push. It flows. And in flowing, it arrives.',
      'Between the notes, silence. Between the words, truth.',
      'You were not made to be small. You were made to be the whole sky.',
      'The wound is where the light enters you.',
      'Do not be afraid of the dark. It is where the stars live.',
      'Let yourself be silently drawn by the strange pull of what you really love.',
      'The quieter you become, the more you can hear.',
      'Out beyond ideas of wrongdoing and rightdoing, there is a field. I will meet you there.',
      'You are not a drop in the ocean. You are the entire ocean in a drop.',
      'Be like water. Soft enough to flow, strong enough to carve stone.',
    ],
  };
  const [voiceMode, setVoiceMode] = useState<'off' | 'affirmations' | 'meditation' | 'poetry'>(
    'off',
  );
  const { speak: ttsSpeak, stop: ttsStop } = useTTS();
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceIdxRef = useRef(0);
  const voiceActiveRef = useRef(false);

  function speakLine(text: string) {
    void ttsSpeak(text);
  }

  function scheduleNextVoiceLine() {
    if (!voiceActiveRef.current || voiceMode === 'off') return;
    const content = VOICE_CONTENT[voiceMode];
    if (!content) return;
    const line = content[voiceIdxRef.current % content.length];
    voiceIdxRef.current++;
    speakLine(line);
    // Schedule next line — longer pauses for poetry, shorter for affirmations
    const pause =
      voiceMode === 'meditation'
        ? 8000 + Math.random() * 5000
        : voiceMode === 'poetry'
          ? 12000 + Math.random() * 8000
          : 10000 + Math.random() * 6000;
    voiceTimerRef.current = setTimeout(scheduleNextVoiceLine, pause);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: voice scheduling uses refs
  useEffect(() => {
    if (voiceMode !== 'off') {
      voiceActiveRef.current = true;
      voiceIdxRef.current = Math.floor(Math.random() * 10);
      // Small delay before first line
      voiceTimerRef.current = setTimeout(scheduleNextVoiceLine, 2000);
    } else {
      voiceActiveRef.current = false;
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
      ttsStop();
    }
    return () => {
      voiceActiveRef.current = false;
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    };
  }, [voiceMode]);

  const [_showSave, _setShowSave] = useState(false);
  const crossfadingRef = useRef(false);

  // Collapsible section state
  const [simpleMode, setSimpleMode] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [padPaletteId, setPadPaletteId] = useState<PadPaletteId>(() => {
    if (typeof window === 'undefined') return 'earth';
    try {
      return getPadPalette(localStorage.getItem(PAD_PALETTE_LS)).id;
    } catch {
      return 'earth';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(PAD_PALETTE_LS, padPaletteId);
    } catch {}
  }, [padPaletteId]);
  const padPalette = getPadPalette(padPaletteId);
  const tinted = padPalette.id !== 'earth';
  const [harmonicsOpen, setHarmonicsOpen] = useState(false);
  const [sacredOpen, setSacredOpen] = useState(false);
  const [melodiesOpen, setMelodiesOpen] = useState(false);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [genresOpen, setGenresOpen] = useState(false);
  const [brainStatesOpen, setBrainStatesOpen] = useState(false);
  const [savedSoundsOpen, setSavedSoundsOpen] = useState(false);

  // Auto-save current sound state to localStorage
  const LS_STATE = 'colourmap:calming-sounds-state';
  useEffect(() => {
    // Restore on mount
    try {
      const raw = localStorage.getItem(LS_STATE);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.baseFreq) setBaseFreq(s.baseFreq);
        if (s.beatFreq) setBeatFreq(s.beatFreq);
        if (s.volume) setVolume(s.volume);
        if (s.reverbMix !== undefined) setReverbMix(s.reverbMix);
        if (s.binauralOn !== undefined) setBinauralOn(s.binauralOn);
        if (s.baseToneOn !== undefined) setBaseToneOn(s.baseToneOn);
        if (s.engineBreathing !== undefined) setEngineBreathing(s.engineBreathing);
        if (s.tremolo !== undefined) setTremolo(s.tremolo);
        if (s.activeLayers) setActiveLayers(s.activeLayers);
        if (s.activeGenre) setActiveGenre(s.activeGenre);
        if (s.activeHarmonics) setActiveHarmonics(new Set(s.activeHarmonics));
        if (s.activeSacred) setActiveSacred(new Set(s.activeSacred));
        if (s.activeMelodies) setActiveMelodies(new Set(s.activeMelodies));
        if (s.melodyScale) setMelodyScale(s.melodyScale);
        if (s.melodySpeed !== undefined) setMelodySpeed(s.melodySpeed);
        if (s.melodyReverb !== undefined) setMelodyReverb(s.melodyReverb);
        if (s.layerReverb !== undefined) setLayerReverb(s.layerReverb);
        if (s.simpleMode !== undefined) setSimpleMode(s.simpleMode);
      }
    } catch {}
  }, []);

  // Save state on changes (debounced via the dep array)
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_STATE,
        JSON.stringify({
          baseFreq,
          beatFreq,
          volume,
          reverbMix,
          binauralOn,
          baseToneOn,
          engineBreathing,
          tremolo,
          activeLayers,
          activeGenre,
          activeHarmonics: [...activeHarmonics],
          activeSacred: [...activeSacred],
          activeMelodies: [...activeMelodies],
          melodyScale,
          melodySpeed,
          melodyReverb,
          layerReverb,
          simpleMode,
        }),
      );
    } catch {}
  }, [
    baseFreq,
    beatFreq,
    volume,
    reverbMix,
    binauralOn,
    baseToneOn,
    engineBreathing,
    tremolo,
    activeLayers,
    activeGenre,
    activeHarmonics,
    activeSacred,
    activeMelodies,
    melodyScale,
    melodySpeed,
    melodyReverb,
    layerReverb,
    simpleMode,
  ]);

  // Load saved mixes
  useEffect(() => {
    try {
      const raw = localStorage.getItem('colourmap:tuner-mixes');
      if (raw) setSavedMixes(JSON.parse(raw));
    } catch {}
  }, []);

  function deleteMix(index: number) {
    setSavedMixes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem('colourmap:tuner-mixes', JSON.stringify(next));
      return next;
    });
  }

  function loadMix(mix: (typeof savedMixes)[0]) {
    setBaseFreq(mix.base);
    setBeatFreq(mix.beat);
    setVolume(mix.vol);
    setBinauralOn(mix.binaural);
    // Stop current layers
    if (ctxRef.current) {
      for (const [id, node] of layerNodesRef.current) {
        try {
          node.source.stop();
        } catch {}
        node.gain.disconnect();
        layerNodesRef.current.delete(id);
      }
      // Start mix layers
      for (const [id, vol] of Object.entries(mix.layers)) {
        if (vol > 0) startLayer(ctxRef.current, id, vol);
      }
    }
    setActiveLayers(mix.layers);
  }

  const ctxRef = useRef<AudioContext | null>(null);
  const oscLeftRef = useRef<OscillatorNode | null>(null);
  const oscRightRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const layerNodesRef = useRef<
    Map<string, { source: AudioBufferSourceNode | OscillatorNode; gain: GainNode }>
  >(new Map());

  // Adaptive: read check-in state (parked — suggestion not yet shown
  // in UI; prefixed with _ to satisfy biome.)
  const [_suggestion, _setSuggestion] = useState<{ preset: string; reason: string } | null>(null);
  useEffect(() => {
    const body = loadNum('colourmap:body-idx', 2);
    const focus = loadNum('colourmap:focus-idx', 2);
    const clarity = loadNum('colourmap:clarity-idx', 2);
    _setSuggestion(getSuggestion(body, focus, clarity));
  }, []);

  const [audioError, setAudioError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: startLayer uses refs, stable in component body
  const startAudio = useCallback(() => {
    try {
      if (ctxRef.current) return;
      setAudioError(null);
      const ctx = new AudioContext();
      // Resume context — required by browsers after user gesture
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => setAudioError('browser blocked audio'));
      }
      ctxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gainRef.current = gain;

      // Connect both channels to stereo output for binaural effect
      // But also send to both ears so it's audible without headphones
      const oscL = ctx.createOscillator();
      oscL.type = 'sine';
      oscL.frequency.value = baseFreq;
      oscLeftRef.current = oscL;

      const oscR = ctx.createOscillator();
      oscR.type = 'sine';
      oscR.frequency.value = baseFreq + beatFreq;
      oscRightRef.current = oscR;

      // Stereo panning: left osc panned left, right osc panned right
      // When binaural is off, center the left pan so tone plays in both ears
      const panL = ctx.createStereoPanner();
      panL.pan.value = binauralOn ? -0.8 : 0;
      const panR = ctx.createStereoPanner();
      panR.pan.value = 0.8;
      panLRef.current = panL;
      panRRef.current = panR;

      // Master gain for oscillators — always on, individual muting via oscL/oscR gains
      const binGain = ctx.createGain();
      binGain.gain.value = 1;
      binGainRef.current = binGain;

      // Individual gain for base tone and beat tone
      const oscLGain = ctx.createGain();
      oscLGain.gain.value = baseToneOn ? 1 : 0;
      oscLGainRef.current = oscLGain;
      const oscRGain = ctx.createGain();
      oscRGain.gain.value = binauralOn ? 1 : 0;
      oscRGainRef.current = oscRGain;

      oscL.connect(oscLGain);
      oscLGain.connect(panL);
      panL.connect(binGain);
      oscR.connect(oscRGain);
      oscRGain.connect(panR);
      panR.connect(binGain);

      // Filter on binaural signal
      const binFilter = ctx.createBiquadFilter();
      binFilter.type = 'lowpass';
      binFilter.frequency.value = filterFreq;
      binFilter.Q.value = 0.5;
      binFilterRef.current = binFilter;

      binGain.connect(binFilter);
      binFilter.connect(gain);

      // Warmth — adds a harmonic layer
      if (warmth > 0.01) {
        const warmOsc = ctx.createOscillator();
        warmOsc.type = 'triangle';
        warmOsc.frequency.value = baseFreq * 2;
        const wg = ctx.createGain();
        wg.gain.value = warmth * 0.15;
        warmOsc.connect(wg);
        wg.connect(binFilter);
        warmOsc.start();
        warmOscRef.current = warmOsc;
        warmGainRef.current = wg;
      }

      // Reverb — smooths the overall binaural sound
      const reverbLen = ctx.sampleRate * 3;
      const reverbBuf = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = reverbBuf.getChannelData(ch);
        for (let i = 0; i < reverbLen; i++) {
          d[i] = (Math.random() * 2 - 1) * (1 - i / reverbLen) ** 2.5;
        }
      }
      const reverb = ctx.createConvolver();
      reverb.buffer = reverbBuf;
      reverbNodeRef.current = reverb;

      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - reverbMix;
      dryGainRef.current = dryGain;
      const wetGain = ctx.createGain();
      wetGain.gain.value = reverbMix;
      wetGainRef.current = wetGain;

      gain.connect(dryGain);
      dryGain.connect(ctx.destination);
      gain.connect(reverb);
      reverb.connect(wetGain);
      wetGain.connect(ctx.destination);

      oscL.start();
      oscR.start();
      setPlaying(true);

      // Start any active layers
      for (const [layerId, vol] of Object.entries(activeLayers)) {
        if (vol > 0) startLayer(ctx, layerId, vol);
      }
    } catch {
      setAudioError('could not start audio');
    }
  }, [baseFreq, beatFreq, volume, activeLayers]);

  const stopAudio = useCallback(() => {
    for (const [, node] of layerNodesRef.current) {
      try {
        node.source.stop();
      } catch {}
      node.gain.disconnect();
    }
    layerNodesRef.current.clear();
    // Clear harmonic and sacred oscillator refs so the next startAudio creates fresh ones
    harmOscsRef.current.clear();
    sacredOscsRef.current.clear();
    oscLeftRef.current?.stop();
    oscRightRef.current?.stop();
    ctxRef.current?.close();
    ctxRef.current = null;
    oscLeftRef.current = null;
    oscRightRef.current = null;
    gainRef.current = null;
    setPlaying(false);
  }, []);

  function ensureLayerReverb(ctx: AudioContext) {
    if (layerReverbRef.current) return;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
      }
    }
    const rev = ctx.createConvolver();
    rev.buffer = buf;
    layerReverbRef.current = rev;
    const dry = ctx.createGain();
    dry.gain.value = 1 - layerReverb / 100;
    layerDryRef.current = dry;
    const wet = ctx.createGain();
    wet.gain.value = layerReverb / 100;
    layerWetRef.current = wet;
    dry.connect(ctx.destination);
    rev.connect(wet);
    wet.connect(ctx.destination);
  }

  function startLayer(ctx: AudioContext, layerId: string, vol: number) {
    const def = ALL_LAYERS.find((l) => l.id === layerId);
    if (!def) return;
    ensureLayerReverb(ctx);
    const { node, source } = def.build(ctx, baseFreq);
    const layerGain = ctx.createGain();
    layerGain.gain.value = vol;
    node.connect(layerGain);
    // Route through layer reverb bus
    if (layerDryRef.current && layerReverbRef.current) {
      layerGain.connect(layerDryRef.current);
      layerGain.connect(layerReverbRef.current);
    } else {
      layerGain.connect(ctx.destination);
    }
    if ('start' in source) source.start();
    layerNodesRef.current.set(layerId, { source, gain: layerGain });
  }

  function startLayerWithFadeIn(
    ctx: AudioContext,
    layerId: string,
    targetVol: number,
    delaySeconds = 0,
  ) {
    const def = ALL_LAYERS.find((l) => l.id === layerId);
    if (!def) return;
    ensureLayerReverb(ctx);
    const { node, source } = def.build(ctx, baseFreq);
    const layerGain = ctx.createGain();
    layerGain.gain.value = 0;
    node.connect(layerGain);
    if (layerDryRef.current && layerReverbRef.current) {
      layerGain.connect(layerDryRef.current);
      layerGain.connect(layerReverbRef.current);
    } else {
      layerGain.connect(ctx.destination);
    }
    const now = ctx.currentTime;
    if ('start' in source) source.start(now + delaySeconds);
    layerNodesRef.current.set(layerId, { source, gain: layerGain });
    // Fade in over crossfade duration
    layerGain.gain.setValueAtTime(0, now);
    layerGain.gain.setValueAtTime(0, now + delaySeconds);
    layerGain.gain.linearRampToValueAtTime(targetVol, now + delaySeconds + CROSSFADE_DURATION);
  }

  function fadeOutLayer(ctx: AudioContext, layerId: string) {
    const existing = layerNodesRef.current.get(layerId);
    if (!existing) return;
    const now = ctx.currentTime;
    existing.gain.gain.cancelScheduledValues(now);
    existing.gain.gain.setValueAtTime(existing.gain.gain.value, now);
    existing.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);
    // Schedule cleanup after fade
    setTimeout(
      () => {
        try {
          existing.source.stop();
        } catch {}
        existing.gain.disconnect();
        layerNodesRef.current.delete(layerId);
      },
      CROSSFADE_DURATION * 1000 + 100,
    );
  }

  function toggleLayer(layerId: string) {
    const current = activeLayers[layerId] || 0;
    const newVol = current > 0 ? 0 : 0.25;
    setActiveLayers((prev) => ({ ...prev, [layerId]: newVol }));

    if (ctxRef.current) {
      const existing = layerNodesRef.current.get(layerId);
      if (existing && newVol <= 0) {
        try {
          existing.source.stop();
        } catch {}
        existing.gain.disconnect();
        layerNodesRef.current.delete(layerId);
      } else if (!existing && newVol > 0) {
        startLayer(ctxRef.current, layerId, newVol);
      }
    }
  }

  function setLayerVol(layerId: string, vol: number) {
    setActiveLayers((prev) => ({ ...prev, [layerId]: vol }));
    const existing = layerNodesRef.current.get(layerId);
    if (existing) existing.gain.gain.value = vol;
  }

  function applyGenre(genre: Genre) {
    const ctx = ctxRef.current;
    setActiveGenre(genre.id);
    setLongSoftMood(null);
    setBaseFreq(genre.base);
    setBeatFreq(genre.beat);

    if (ctx && !crossfadingRef.current) {
      crossfadingRef.current = true;
      // Fade out all current layers
      const oldLayerIds = [...layerNodesRef.current.keys()];
      for (const id of oldLayerIds) {
        fadeOutLayer(ctx, id);
      }
      // After fade out completes, start new layers with fade in
      setTimeout(
        () => {
          const newLayers: Record<string, number> = {};
          for (const id of genre.layers) {
            newLayers[id] = 0.2;
            startLayerWithFadeIn(ctx, id, 0.2);
          }
          setActiveLayers(newLayers);
          crossfadingRef.current = false;
        },
        CROSSFADE_DURATION * 1000 + 150,
      );
    } else {
      // No audio context or already crossfading — just set state
      const newLayers: Record<string, number> = {};
      for (const id of genre.layers) {
        newLayers[id] = 0.2;
      }
      setActiveLayers(newLayers);
    }
  }

  function applyLongSoftMood(mood: LongSoftMood) {
    const ctx = ctxRef.current;
    setLongSoftMood(mood.id);
    setActiveGenre(null);
    setBinauralOn(false);
    setBaseToneOn(false);
    setEngineBreathing(false);
    setBeatPreset('off');
    setVolume(mood.volume);
    setLayerReverb(mood.reverb);

    if (ctx && !crossfadingRef.current) {
      crossfadingRef.current = true;
      const oldLayerIds = [...layerNodesRef.current.keys()];
      for (const id of oldLayerIds) {
        fadeOutLayer(ctx, id);
      }
      setTimeout(
        () => {
          Object.entries(mood.layers).forEach(([id, vol], index) => {
            startLayerWithFadeIn(ctx, id, vol, index * 7);
          });
          setActiveLayers(mood.layers);
          crossfadingRef.current = false;
        },
        CROSSFADE_DURATION * 1000 + 150,
      );
    } else {
      setActiveLayers(mood.layers);
    }
  }

  function applyPresetWithLayers(preset: (typeof PRESETS)[0]) {
    setBaseFreq(preset.base);
    setBeatFreq(preset.beat);
    setLongSoftMood(null);
    const defaultLayers = PRESET_LAYERS[preset.id];
    if (!defaultLayers) return;

    const ctx = ctxRef.current;
    if (ctx && !crossfadingRef.current) {
      crossfadingRef.current = true;
      // Fade out all current layers
      const oldLayerIds = [...layerNodesRef.current.keys()];
      for (const id of oldLayerIds) {
        fadeOutLayer(ctx, id);
      }
      // After fade out, start preset layers with fade in
      setTimeout(
        () => {
          const newLayers: Record<string, number> = {};
          for (const id of defaultLayers) {
            newLayers[id] = 0.2;
            startLayerWithFadeIn(ctx, id, 0.2);
          }
          setActiveLayers(newLayers);
          crossfadingRef.current = false;
        },
        CROSSFADE_DURATION * 1000 + 150,
      );
    } else {
      // No audio context — just set state
      const newLayers: Record<string, number> = {};
      for (const id of defaultLayers) {
        newLayers[id] = 0.2;
      }
      setActiveLayers(newLayers);
    }
  }

  useEffect(() => {
    if (oscLeftRef.current) oscLeftRef.current.frequency.value = baseFreq;
    if (oscRightRef.current) oscRightRef.current.frequency.value = baseFreq + beatFreq;
  }, [baseFreq, beatFreq]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('binaural:beatfreq', { detail: { hz: beatFreq } }));
    }
  }, [beatFreq]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  // Mobile-friendly audio session handling:
  //   - Page Visibility API  → when the user tabs away, switches
  //     apps, or locks the phone, duck the master gain to ~0 over
  //     300ms so the audio goes quiet without disappearing. Restore
  //     to the user's volume when the tab becomes visible again.
  //     This is the web-app equivalent of iOS AudioSession ducking
  //     and matches how native apps behave on incoming calls.
  //   - Works on both iOS Safari and Android Chrome; both fire
  //     'visibilitychange' events reliably.
  // NOTE: The browser may also freeze Web Audio entirely when the
  // tab is hidden (especially iOS Safari). That's platform-level,
  // not something we can prevent from JS. The duck-and-restore
  // keeps the audio graph alive and ready to resume cleanly.
  useEffect(() => {
    if (!playing) return;

    function duck() {
      const g = gainRef.current;
      const ctx = ctxRef.current;
      if (!g || !ctx) return;
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + 0.3);
    }

    function restore() {
      const g = gainRef.current;
      const ctx = ctxRef.current;
      if (!g || !ctx) return;
      // Resume the context too — iOS Safari sometimes auto-suspends
      // a hidden AudioContext, and we want audible sound back fast.
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(volume, now + 0.5);
    }

    function onVisibilityChange() {
      if (document.hidden) duck();
      else restore();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [playing, volume]);

  // Binaural beat (right osc) toggle
  useEffect(() => {
    if (oscRGainRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime;
      oscRGainRef.current.gain.cancelScheduledValues(now);
      oscRGainRef.current.gain.setValueAtTime(oscRGainRef.current.gain.value, now);
      oscRGainRef.current.gain.linearRampToValueAtTime(binauralOn ? 1 : 0, now + 0.5);
    }
  }, [binauralOn]);

  // Engine-breathing: two slow LFOs added to the right-ear oscillator
  // frequency so the audible beat drifts organically instead of staying
  // perfectly fixed. Feels like a ship's engine riding on the ocean.
  //
  // LFO #1 — slow, wider swing (~50s period, ±0.35 Hz)
  // LFO #2 — faster, smaller swing (~17s period, ±0.12 Hz)
  // Sum gives non-repeating organic variation without wobbling too fast.
  useEffect(() => {
    const ctx = ctxRef.current;
    const oscR = oscRightRef.current;

    function teardown() {
      try {
        engineLfoSlowRef.current?.stop();
      } catch {}
      engineLfoSlowRef.current?.disconnect();
      engineLfoSlowGainRef.current?.disconnect();
      engineLfoSlowRef.current = null;
      engineLfoSlowGainRef.current = null;
      try {
        engineLfoFastRef.current?.stop();
      } catch {}
      engineLfoFastRef.current?.disconnect();
      engineLfoFastGainRef.current?.disconnect();
      engineLfoFastRef.current = null;
      engineLfoFastGainRef.current = null;
    }

    // Only arm when audio is live, binaural is on, and the user opted in.
    if (!engineBreathing || !playing || !binauralOn || !ctx || !oscR) {
      teardown();
      return;
    }

    const slow = ctx.createOscillator();
    slow.type = 'sine';
    slow.frequency.value = 1 / 50; // ~50 s cycle
    const slowGain = ctx.createGain();
    slowGain.gain.value = 0.35;
    slow.connect(slowGain);
    slowGain.connect(oscR.frequency);
    slow.start();
    engineLfoSlowRef.current = slow;
    engineLfoSlowGainRef.current = slowGain;

    const fast = ctx.createOscillator();
    fast.type = 'sine';
    fast.frequency.value = 1 / 17; // ~17 s cycle
    const fastGain = ctx.createGain();
    fastGain.gain.value = 0.12;
    fast.connect(fastGain);
    fastGain.connect(oscR.frequency);
    fast.start();
    engineLfoFastRef.current = fast;
    engineLfoFastGainRef.current = fastGain;

    return teardown;
  }, [engineBreathing, playing, binauralOn]);

  // Mono routing: center panL when binaural is off, restore stereo when on
  useEffect(() => {
    if (panLRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime;
      panLRef.current.pan.cancelScheduledValues(now);
      panLRef.current.pan.setValueAtTime(panLRef.current.pan.value, now);
      panLRef.current.pan.linearRampToValueAtTime(binauralOn ? -0.8 : 0, now + 0.3);
    }
  }, [binauralOn]);

  // Base tone (left osc) toggle
  useEffect(() => {
    if (oscLGainRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime;
      oscLGainRef.current.gain.cancelScheduledValues(now);
      oscLGainRef.current.gain.setValueAtTime(oscLGainRef.current.gain.value, now);
      oscLGainRef.current.gain.linearRampToValueAtTime(baseToneOn ? 1 : 0, now + 0.5);
    }
  }, [baseToneOn]);

  // Reverb mix update
  useEffect(() => {
    if (dryGainRef.current) dryGainRef.current.gain.value = 1 - reverbMix;
    if (wetGainRef.current) wetGainRef.current.gain.value = reverbMix;
  }, [reverbMix]);

  // Harmony tones — start/stop oscillators based on activeHarmonics
  useEffect(() => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;

    // Start new harmonics — route through binFilter so they get reverb too
    const binFilter = binFilterRef.current;
    for (const h of HARMONICS) {
      if (activeHarmonics.has(h.id) && !harmOscsRef.current.has(h.id)) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * h.ratio;
        const g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g);
        // Connect to filter chain (same as main oscs) so harmonics get reverb
        g.connect(binFilter || gain);
        osc.start();
        // Fade in to full audible volume
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.8);
        harmOscsRef.current.set(h.id, { osc, gain: g });
      }
    }

    // Stop removed harmonics
    for (const [id, node] of harmOscsRef.current) {
      if (!activeHarmonics.has(id)) {
        const now = ctx.currentTime;
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(0, now + 0.5);
        setTimeout(() => {
          try {
            node.osc.stop();
          } catch {}
          node.gain.disconnect();
        }, 600);
        harmOscsRef.current.delete(id);
      }
    }

    // Update frequencies for existing harmonics (when baseFreq changes)
    for (const h of HARMONICS) {
      const node = harmOscsRef.current.get(h.id);
      if (node) node.osc.frequency.value = baseFreq * h.ratio;
    }
  }, [activeHarmonics, baseFreq, HARMONICS]);

  // Sacred tones — fixed frequencies, same pattern
  useEffect(() => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    const binFilter = binFilterRef.current;

    for (const s of SACRED) {
      if (activeSacred.has(s.id) && !sacredOscsRef.current.has(s.id)) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = s.freq;
        const g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g);
        g.connect(binFilter || gain);
        osc.start();
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.0);
        sacredOscsRef.current.set(s.id, { osc, gain: g });
      }
    }

    for (const [id, node] of sacredOscsRef.current) {
      if (!activeSacred.has(id)) {
        const now = ctx.currentTime;
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(0, now + 0.8);
        setTimeout(() => {
          try {
            node.osc.stop();
          } catch {}
          node.gain.disconnect();
        }, 900);
        sacredOscsRef.current.delete(id);
      }
    }
  }, [activeSacred, SACRED]);

  // Warmth — create/destroy harmonic oscillator dynamically
  useEffect(() => {
    const ctx = ctxRef.current;
    const binFilter = binFilterRef.current;
    if (!ctx || !binFilter) return;

    if (warmth > 0.01) {
      if (warmOscRef.current) {
        // Update existing
        warmGainRef.current!.gain.value = warmth * 0.15;
        warmOscRef.current.frequency.value = baseFreq * 2;
      } else {
        // Create new
        const warmOsc = ctx.createOscillator();
        warmOsc.type = 'triangle';
        warmOsc.frequency.value = baseFreq * 2;
        const wg = ctx.createGain();
        wg.gain.value = warmth * 0.15;
        warmOsc.connect(wg);
        wg.connect(binFilter);
        warmOsc.start();
        warmOscRef.current = warmOsc;
        warmGainRef.current = wg;
      }
    } else {
      // Destroy if exists
      if (warmOscRef.current) {
        try {
          warmOscRef.current.stop();
        } catch {}
        warmOscRef.current = null;
      }
      if (warmGainRef.current) {
        warmGainRef.current.disconnect();
        warmGainRef.current = null;
      }
    }
  }, [baseFreq]);

  // Tremolo — slow wave effect on main gain
  useEffect(() => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    if (tremolo) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = tremoloSpeed;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = volume * 0.4; // modulation depth
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      lfoRef.current = lfo;
      lfoGainRef.current = lfoGain;
    } else {
      if (lfoRef.current) {
        try {
          lfoRef.current.stop();
        } catch {}
        lfoRef.current = null;
      }
      if (lfoGainRef.current) {
        lfoGainRef.current.disconnect();
        lfoGainRef.current = null;
      }
    }
  }, [tremolo, volume]);

  // Soft-beat bed — schedules a percussion sample at the chosen tempo.
  // Uses a dedicated gain node so beat volume is independent of main.
  useEffect(() => {
    const ctx: AudioContext | null = ctxRef.current;
    if (!ctx || !playing || beatPreset === 'off') return;
    const interval = BEAT_PRESETS.find((b) => b.id === beatPreset)?.intervalMs ?? 0;
    if (!interval) return;

    let cancelled = false;
    const gain = ctx.createGain();
    gain.gain.value = beatVolume;
    gain.connect(ctx.destination);
    beatGainRef.current = gain;

    async function start() {
      if (!beatBufferRef.current) {
        try {
          const res = await fetch(BEAT_SAMPLE_URL);
          const buf = await res.arrayBuffer();
          if (!ctx) return;
          const decoded = await ctx.decodeAudioData(buf);
          beatBufferRef.current = decoded;
        } catch {
          return;
        }
      }
      if (cancelled) return;
      const play = () => {
        if (cancelled || !ctxRef.current || !beatBufferRef.current) return;
        const src = ctxRef.current.createBufferSource();
        src.buffer = beatBufferRef.current;
        src.connect(gain);
        src.start();
      };
      play();
      beatTimerRef.current = setInterval(play, interval);
    }
    start();

    return () => {
      cancelled = true;
      if (beatTimerRef.current) {
        clearInterval(beatTimerRef.current);
        beatTimerRef.current = null;
      }
      try {
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
      beatGainRef.current = null;
    };
  }, [playing, beatPreset, beatVolume]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        for (const [, node] of layerNodesRef.current) {
          try {
            node.source.stop();
          } catch {}
        }
        oscLeftRef.current?.stop();
        oscRightRef.current?.stop();
        ctxRef.current.close();
      }
    };
  }, []);

  // Wave visualization — tremolo modulates amplitude when active
  const W = 320;
  const H = 100;
  const cy = H / 2;
  const wavelength = Math.max(20, 80 - beatFreq * 1.5);
  const baseAmplitude = 15 + volume * 30;
  const [waveTime, setWaveTime] = useState(0);
  // Animate whenever sound is playing, tremolo is on, or zigzag style is selected
  // (zigzag flows continuously so the user can see the pattern before hitting play).
  const shouldAnimate = playing || tremolo || waveStyle === 'zigzag';
  useEffect(() => {
    if (!shouldAnimate) return;
    let raf: number;
    const start = performance.now();
    function animate() {
      setWaveTime((performance.now() - start) / 1000);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [shouldAnimate]);

  const points: string[] = [];
  for (let x = 0; x <= W; x += 2) {
    const tremoloMod =
      tremolo && playing
        ? 1 - 0.35 * Math.sin(waveTime * tremoloSpeed * Math.PI * 2 + (x / W) * 0.5)
        : 1;
    const amplitude = baseAmplitude * tremoloMod;
    const phase = (x / wavelength) * Math.PI * 2;
    let sample: number;
    switch (waveStyle) {
      case 'pulse': {
        // Very slow amplitude envelope on top of the sine — meditative
        // breath, not a heartbeat. Cycle roughly every 8-10 seconds
        // (~0.125 Hz) so it stays relaxing as a background visual.
        const envelope = 0.55 + 0.45 * Math.sin(waveTime * 0.25 * Math.PI * 2 + phase * 0.08);
        sample = Math.sin(phase) * envelope;
        break;
      }
      case 'double':
        // Two sines at slightly different wavelengths — visual beat pattern
        sample = (Math.sin(phase) + Math.sin(phase * 1.07 + waveTime * 0.8)) * 0.5;
        break;
      case 'zigzag': {
        // Triangle wave that flows left→right via waveTime scroll
        const t = (((x / wavelength - waveTime * 0.4) % 1) + 1) % 1;
        sample = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
        break;
      }
      default:
        sample = Math.sin(phase);
    }
    const y = cy + sample * amplitude;
    points.push(`${x},${y.toFixed(1)}`);
  }
  const pathD = `M ${points.join(' L ')}`;
  const preset = PRESETS.find((p) => p.beat === beatFreq && p.base === baseFreq);
  const genre = GENRES.find((g) => g.id === activeGenre);
  const mood = LONG_SOFT_MOODS.find((item) => item.id === longSoftMood);
  const activeColor = mood?.color || genre?.color || preset?.color || '#C4A060';
  const _activeLayerCount = Object.values(activeLayers).filter((v) => v > 0).length;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-center space-y-1.5">
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#5C3018',
          }}
        >
          Calming Sounds
        </p>
        {playing && (
          <p
            className="italic"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              color: '#8A6A4A',
              opacity: 0.85,
            }}
          >
            {baseToneOn ? (
              <span style={{ color: '#5C3018', fontWeight: 600, fontStyle: 'normal' }}>
                {baseFreq}
                <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: 2 }}>Hz</span>
              </span>
            ) : null}
            {binauralOn && baseToneOn && <span style={{ opacity: 0.4 }}> · </span>}
            {binauralOn ? (
              <span style={{ color: '#7A5438', fontWeight: 600, fontStyle: 'normal' }}>
                {beatFreq}
                <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: 2 }}>Hz beat</span>
              </span>
            ) : null}
          </p>
        )}
      </div>

      {/* Simple / Full toggle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setSimpleMode((s) => !s)}
          className="cursor-pointer bg-transparent border-none transition-opacity hover:opacity-100"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '11px',
            color: 'var(--muted-foreground)',
            opacity: 0.5,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '2px 0',
          }}
        >
          {simpleMode ? 'studio' : 'simple'}
        </button>
      </div>

      {/* Wave visualization with gradient fill + play button overlay */}
      <div className="relative flex justify-center">
        <svg width={W} height={H}>
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
              {RAINBOW.map((c, i) => (
                // index key — RAINBOW repeats #E0908A at start and end for
                // a wrap-around gradient, so color alone would collide.
                <stop
                  key={i}
                  offset={`${(i / (RAINBOW.length - 1)) * 100}%`}
                  stopColor={c}
                  stopOpacity={0.15}
                />
              ))}
            </linearGradient>
            <linearGradient id="waveStroke" x1="0" y1="0" x2="1" y2="0">
              {RAINBOW.map((c, i) => (
                <stop
                  key={i}
                  offset={`${(i / (RAINBOW.length - 1)) * 100}%`}
                  stopColor={c}
                  stopOpacity={playing ? 0.8 : 0.4}
                />
              ))}
            </linearGradient>
          </defs>
          {/* Just the wave line — rainbow fill removed per user
              feedback (clutter). Keep the subtle rainbow stroke
              because it still reads as a single line. */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#waveStroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* Glow when playing */}
          {playing && (
            <path
              d={pathD}
              fill="none"
              stroke={activeColor}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.12}
            />
          )}
        </svg>
        {/* Play button — overlaid on the right */}
        <button
          type="button"
          onClick={() => {
            haptic(playing ? 'tick' : 'tap');
            if (playing) stopAudio();
            else startAudio();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex cursor-pointer items-center justify-center rounded-full transition-all"
          style={{
            width: 36,
            height: 36,
            background: playing ? `${activeColor}25` : `${activeColor}10`,
            border: `2px solid ${activeColor}${playing ? '50' : '25'}`,
          }}
        >
          {playing ? (
            <div className="flex gap-0.5">
              <span
                className="block rounded-sm"
                style={{ width: 3, height: 12, background: activeColor }}
              />
              <span
                className="block rounded-sm"
                style={{ width: 3, height: 12, background: activeColor }}
              />
            </div>
          ) : (
            <span
              className="block"
              style={{
                width: 0,
                height: 0,
                borderLeft: `10px solid ${activeColor}`,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                marginLeft: 1,
              }}
            />
          )}
        </button>
      </div>

      {/* Wave-style picker — 4 small dots, no labels */}
      <div className="flex justify-center gap-2">
        {WAVE_STYLES.map((w) => {
          const isActive = waveStyle === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setWaveStyle(w.id)}
              title={w.label}
              className="cursor-pointer transition-all"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isActive ? activeColor : 'transparent',
                border: `1.5px solid ${isActive ? activeColor : '#C4A06050'}`,
                padding: 0,
              }}
            />
          );
        })}
      </div>

      {/* Beat bed UI removed per user feedback — clutter in studio.
          The scheduler state still exists but defaults to 'off' and is
          inaccessible from the UI. If it comes back later it should be
          as a dedicated 'rhythm' surface, not stacked under the wave. */}

      {/* Audio error */}
      {audioError && (
        <p
          className="text-center"
          style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: '#D06040' }}
        >
          {audioError}
        </p>
      )}

      {/* ── SIMPLE MODE: just genres + volume ── */}
      {simpleMode && (
        <div className="space-y-3 px-2">
          {/* Saved mixes — surfaced above the genre pills in simple
              mode so the user can load their tuned presets in one tap
              without opening studio. */}
          {savedMixes.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {savedMixes.map((mix, i) => (
                <div
                  key={`${mix.name}-${i}`}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full transition-all"
                  style={{
                    background: '#C4A06012',
                    border: '1px solid #C4A06035',
                    paddingLeft: 10,
                    paddingRight: 4,
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      loadMix(mix);
                      if (!playing) startAudio();
                    }}
                    className="flex items-center gap-1.5"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    title={`Load "${mix.name}" — ${mix.beat}Hz · ${Object.values(mix.layers).filter((v) => v > 0).length} layers`}
                  >
                    <SavedShapeIcon shape={mix.shape ?? 'dot'} color="#C4A060" />
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#5C3018',
                      }}
                    >
                      {mix.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMix(i);
                    }}
                    title="Delete this mix"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8A6A4A',
                      opacity: 0.45,
                      fontSize: 14,
                      lineHeight: 1,
                      padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {LONG_SOFT_MOODS.map((mood) => {
              const isActive = longSoftMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    if (!playing) startAudio();
                    applyLongSoftMood(mood);
                  }}
                  className="min-w-[92px] cursor-pointer rounded-[10px] px-3 py-2 transition-all"
                  style={{
                    background: isActive ? `${mood.color}22` : 'rgba(196,160,96,0.05)',
                    border: `1px solid ${isActive ? `${mood.color}70` : `${mood.color}32`}`,
                    boxShadow: isActive ? `0 8px 24px ${mood.color}18` : 'none',
                  }}
                  title={mood.subtitle}
                >
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 13,
                      fontWeight: 800,
                      color: isActive ? mood.color : '#5C3018',
                      lineHeight: 1.15,
                    }}
                  >
                    {mood.label}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 3,
                      fontFamily: 'var(--font-serif)',
                      fontSize: 10,
                      color: '#7A5438',
                      opacity: 0.78,
                      lineHeight: 1.15,
                    }}
                  >
                    {mood.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Genre pills — always visible in simple mode */}
          <div className="flex flex-wrap justify-center gap-2">
            {GENRES.map((g) => {
              const isActive = activeGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    applyGenre(g);
                    if (!playing) startAudio();
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 transition-all"
                  style={{
                    background: isActive ? `${g.color}18` : '#C4A06006',
                    border: `1px solid ${isActive ? `${g.color}55` : `${g.color}30`}`,
                  }}
                  title={g.subtitle}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? g.color : '#7A5438',
                      opacity: isActive ? 1 : 0.8,
                    }}
                  >
                    {g.label}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Volume — brown dots, longer than the reverb row per user.
              Drag-to-slide: pointer-capture + move updates volume. */}
          <div className="flex items-center gap-3 px-1 py-2">
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '13px',
                color: '#C4A060',
                fontWeight: 600,
                width: 60,
                flexShrink: 0,
              }}
            >
              volume
            </span>
            <button
              type="button"
              aria-label="Volume"
              className="flex flex-1 cursor-pointer gap-[3px]"
              style={{
                height: 20,
                touchAction: 'none',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
              onPointerDown={(e) => {
                const el = e.currentTarget;
                el.setPointerCapture(e.pointerId);
                const set = (cx: number) => {
                  const r = el.getBoundingClientRect();
                  setVolume(Math.max(0.02, Math.min(1, (cx - r.left) / r.width)));
                };
                set(e.clientX);
              }}
              onPointerMove={(e) => {
                if ((e.buttons & 1) === 0 && e.pointerType === 'mouse') return;
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                setVolume(Math.max(0.02, Math.min(1, (e.clientX - r.left) / r.width)));
              }}
            >
              {Array.from({ length: 14 }, (_, i) => {
                const active = i / 13 <= volume;
                const rainbowIdx = Math.min(
                  RAINBOW.length - 1,
                  Math.floor((i / 13) * RAINBOW.length),
                );
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-[3px] transition-all pointer-events-none"
                    style={{
                      background: active ? RAINBOW[rainbowIdx] : '#7A5438',
                      opacity: active ? 0.55 + (i / 13) * 0.4 : 0.1,
                    }}
                  />
                );
              })}
            </button>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '12px',
                color: '#C4A060',
                fontWeight: 600,
                width: 40,
                flexShrink: 0,
                textAlign: 'right',
              }}
            >
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* ── FULL MODE: all controls ── */}
      {!simpleMode && (
        <>
          {/* Controls — closable pillbox: tone, rate, reverb, wave, volume */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setControlsOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                controls
              </span>
              <span
                style={{
                  transform: controlsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A06080',
                }}
              >
                ▾
              </span>
            </button>
            {controlsOpen && (
              <div className="animate-in fade-in duration-150 space-y-3 pt-1">
                <SliderRow
                  label="tone"
                  value={baseFreq}
                  min={30}
                  max={80}
                  unit="Hz"
                  color="#C4A060"
                  onChange={setBaseFreq}
                  toggleOn={baseToneOn}
                  onToggle={() => setBaseToneOn((s) => !s)}
                />
                <SliderRow
                  label="brain-wave rate"
                  value={beatFreq}
                  min={1}
                  max={10}
                  unit="Hz"
                  color={activeColor}
                  onChange={setBeatFreq}
                  toggleOn={binauralOn}
                  onToggle={() => setBinauralOn((s) => !s)}
                />
                {/* Reverb as rainbow dots */}
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '13px',
                      color: '#C4A060',
                      fontWeight: 600,
                      width: 60,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    reverb
                  </span>
                  <div
                    className="flex flex-1 justify-center gap-2 cursor-pointer"
                    style={{ touchAction: 'none' }}
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setReverbMix(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                    }}
                    onMouseDown={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const onMove = (ev: MouseEvent) => {
                        const r = el.getBoundingClientRect();
                        setReverbMix(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)));
                      };
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const active = i / 11 <= reverbMix;
                      const dotColor = RAINBOW[i % RAINBOW.length];
                      return (
                        <div
                          key={i}
                          className="rounded-full transition-all"
                          style={{
                            width: active ? 10 : 7,
                            height: active ? 10 : 7,
                            background: dotColor,
                            opacity: active ? 0.6 + (i / 11) * 0.3 : 0.12,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '12px',
                      color: '#A0907A',
                      fontWeight: 600,
                      width: 40,
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(reverbMix * 100)}%
                  </span>
                </div>
                {/* Wave — depth slider (dot system, 0 = off) */}
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '13px',
                      color: '#C4A060',
                      fontWeight: 600,
                      width: 60,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    wave
                  </span>
                  <div
                    className="flex flex-1 justify-center gap-2 cursor-pointer"
                    style={{ touchAction: 'none' }}
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      setWaveAmount(Math.round(pct * 100));
                    }}
                    onMouseDown={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const onMove = (ev: MouseEvent) => {
                        const r = el.getBoundingClientRect();
                        setWaveAmount(
                          Math.round(
                            Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100,
                          ),
                        );
                      };
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                    onTouchStart={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const set = (cx: number) => {
                        const r = el.getBoundingClientRect();
                        setWaveAmount(
                          Math.round(Math.max(0, Math.min(1, (cx - r.left) / r.width)) * 100),
                        );
                      };
                      set(e.touches[0].clientX);
                      const onMove = (ev: TouchEvent) => {
                        ev.preventDefault();
                        set(ev.touches[0].clientX);
                      };
                      const onEnd = () => {
                        window.removeEventListener('touchmove', onMove);
                        window.removeEventListener('touchend', onEnd);
                      };
                      window.addEventListener('touchmove', onMove, { passive: false });
                      window.addEventListener('touchend', onEnd);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const active = i / 11 <= waveAmount / 100;
                      const dotColor = RAINBOW[i % RAINBOW.length];
                      return (
                        <div
                          key={i}
                          className="rounded-full transition-all"
                          style={{
                            width: active ? 10 : 7,
                            height: active ? 10 : 7,
                            background: dotColor,
                            opacity: active ? 0.6 + (i / 11) * 0.3 : 0.12,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '12px',
                      color: '#A0907A',
                      fontWeight: 600,
                      width: 40,
                      flexShrink: 0,
                    }}
                  >
                    {waveAmount}%
                  </span>
                </div>
                {/* Volume — rainbow gradient track */}
                <div className="flex items-center gap-3 px-1 py-1">
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '13px',
                      color: '#C4A060',
                      fontWeight: 600,
                      width: 60,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    volume
                  </span>
                  <div
                    className="relative flex-1 cursor-pointer"
                    style={{ height: 20, touchAction: 'none' }}
                    onMouseDown={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const set = (cx: number) => {
                        const r = el.getBoundingClientRect();
                        setVolume(Math.max(0.02, Math.min(1, (cx - r.left) / r.width)));
                      };
                      set(e.clientX);
                      const onMove = (ev: MouseEvent) => set(ev.clientX);
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                    onTouchStart={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const set = (cx: number) => {
                        const r = el.getBoundingClientRect();
                        setVolume(Math.max(0.02, Math.min(1, (cx - r.left) / r.width)));
                      };
                      set(e.touches[0].clientX);
                      const onMove = (ev: TouchEvent) => {
                        ev.preventDefault();
                        set(ev.touches[0].clientX);
                      };
                      const onEnd = () => {
                        window.removeEventListener('touchmove', onMove);
                        window.removeEventListener('touchend', onEnd);
                      };
                      window.addEventListener('touchmove', onMove, { passive: false });
                      window.addEventListener('touchend', onEnd);
                    }}
                  >
                    <div
                      className="absolute top-1/2 -translate-y-1/2 left-0 right-0 rounded-full"
                      style={{ height: 6, background: '#C4A06010' }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 left-0 rounded-full"
                      style={{
                        height: 6,
                        width: `${volume * 100}%`,
                        background: `linear-gradient(90deg, ${RAINBOW[0]}, ${RAINBOW[4]}, ${RAINBOW[8]})`,
                        opacity: 0.8,
                      }}
                    />
                    <div
                      className="absolute top-1/2 rounded-full"
                      style={{
                        left: `${volume * 100}%`,
                        width: 14,
                        height: 14,
                        background:
                          RAINBOW[
                            Math.min(RAINBOW.length - 1, Math.floor(volume * RAINBOW.length))
                          ],
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 2px 6px rgba(196,160,96,0.35)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '12px',
                      color: '#C4A060',
                      fontWeight: 600,
                      width: 40,
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* VisualizerBox removed from Calming Sounds per user feedback —
              Visuals is now a separate 4th category in SoundLab. The
              <VisualizerBox/> function is kept in this file so the
              import still works; it's just not rendered here. */}

          {/* Harmonics — closable pillbox */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setHarmonicsOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                harmonics · {baseFreq}Hz
              </span>
              <span
                style={{
                  transform: harmonicsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A06080',
                }}
              >
                ▾
              </span>
            </button>
            {harmonicsOpen && (
              <div className="animate-in fade-in duration-150 grid grid-cols-4 gap-1.5 pt-1">
                {HARMONICS.map((h, idx) => {
                  const isOn = activeHarmonics.has(h.id);
                  const freq = Math.round(baseFreq * h.ratio);
                  const hColor = RAINBOW[idx % RAINBOW.length];
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setActiveHarmonics((prev) => {
                          const next = new Set(prev);
                          if (next.has(h.id)) next.delete(h.id);
                          else next.add(h.id);
                          return next;
                        });
                      }}
                      className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-all"
                      style={{
                        background: isOn ? `${hColor}18` : '#C4A06006',
                        border: `1px solid ${isOn ? `${hColor}50` : '#C4A06018'}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '11px',
                          fontWeight: isOn ? 700 : 500,
                          color: isOn ? hColor : '#8A6A4A',
                          opacity: isOn ? 1 : 0.75,
                          lineHeight: 1.2,
                        }}
                      >
                        {h.label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '10px',
                          color: isOn ? hColor : '#A0907A',
                          opacity: isOn ? 0.85 : 0.55,
                        }}
                      >
                        {freq}Hz
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sacred Melodies — closable pillbox */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setSacredOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                sacred melodies
              </span>
              <span
                style={{
                  transform: sacredOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A06080',
                }}
              >
                ▾
              </span>
            </button>
            {sacredOpen && (
              <div className="animate-in fade-in duration-150 grid grid-cols-5 gap-1.5 pt-1">
                {SACRED.map((s) => {
                  const isOn = activeSacred.has(s.id);
                  const ratio = s.freq / baseFreq;
                  const nearestInt = Math.round(ratio);
                  const isAligned =
                    nearestInt >= 2 && nearestInt <= 16 && Math.abs(ratio - nearestInt) < 0.05;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveSacred((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        });
                      }}
                      className="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 transition-all"
                      style={{
                        background: isOn
                          ? `${s.color}18`
                          : isAligned
                            ? `${s.color}08`
                            : '#C4A06006',
                        border: `1px solid ${isOn ? `${s.color}40` : isAligned ? `${s.color}20` : '#C4A06018'}`,
                      }}
                      title={`${s.desc}${isAligned ? ` · harmonic ×${nearestInt} of ${baseFreq}Hz` : ''}`}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '12px',
                          fontWeight: isOn ? 700 : 600,
                          color: isOn ? s.color : '#8A6A4A',
                          opacity: isOn ? 1 : isAligned ? 0.7 : 0.55,
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '9px',
                          color: isOn ? s.color : '#A0907A',
                          opacity: isOn ? 0.85 : 0.45,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {s.desc}
                        {isAligned && !isOn ? ` ×${nearestInt}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generative melodies — closable pillbox */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setMelodiesOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                melodies
              </span>
              <span
                style={{
                  transform: melodiesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A06080',
                }}
              >
                ▾
              </span>
            </button>
            {melodiesOpen && (
              <div className="animate-in fade-in duration-150 space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-1.5">
                  {MELODIES.map((m) => {
                    const isOn = activeMelodies.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveMelodies((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            return next;
                          });
                        }}
                        className="w-full cursor-pointer rounded-lg px-2 py-2 text-center transition-all"
                        style={{
                          background: isOn ? `${m.color}18` : '#C4A06006',
                          border: `1px solid ${isOn ? `${m.color}45` : '#C4A06018'}`,
                          minHeight: 38,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '12px',
                            fontWeight: isOn ? 700 : 400,
                            color: isOn ? m.color : '#8A6A4A',
                            opacity: isOn ? 1 : 0.7,
                          }}
                        >
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Scale selector */}
                <div className="flex flex-wrap justify-center gap-1">
                  {Object.entries(MELODY_SCALES).map(([id, s]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMelodyScale(id)}
                      className="cursor-pointer rounded-full px-3 py-1 text-[12px] font-semibold transition-all"
                      style={{
                        color: melodyScale === id ? '#5C3018' : '#8A6A4A',
                        background: melodyScale === id ? '#5C301810' : 'transparent',
                        border: `1px solid ${melodyScale === id ? '#5C301830' : '#C4A06008'}`,
                        opacity: melodyScale === id ? 1 : 0.7,
                        fontFamily: 'var(--font-serif)',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {activeMelodies.size > 0 && (
                  <div className="space-y-2 pt-2 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '12px',
                          color: '#8A6A4A',
                        }}
                      >
                        speed
                      </span>
                      <div
                        className="flex flex-1 gap-[2px] cursor-pointer"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setMelodySpeed(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                        }}
                      >
                        {Array.from({ length: 8 }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-[3px] transition-all"
                            style={{
                              height: 10,
                              background: RAINBOW[i % RAINBOW.length],
                              opacity: i / 7 <= melodySpeed / 100 ? 0.4 + (i / 7) * 0.4 : 0.08,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '12px',
                          color: '#8A6A4A',
                        }}
                      >
                        reverb
                      </span>
                      <div
                        className="flex flex-1 gap-[2px] cursor-pointer"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setMelodyReverb(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                        }}
                      >
                        {Array.from({ length: 8 }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-[3px] transition-all"
                            style={{
                              height: 10,
                              background: RAINBOW[(i + 4) % RAINBOW.length],
                              opacity: i / 7 <= melodyReverb / 100 ? 0.4 + (i / 7) * 0.4 : 0.08,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '12px',
                          color: '#8A6A4A',
                        }}
                      >
                        vol
                      </span>
                      <div
                        className="flex flex-1 gap-[2px] cursor-pointer"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setMelodyVolume(
                            Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
                          );
                        }}
                      >
                        {Array.from({ length: 8 }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-[3px] transition-all"
                            style={{
                              height: 10,
                              background: RAINBOW[(i + 2) % RAINBOW.length],
                              opacity: i / 7 <= melodyVolume ? 0.4 + (i / 7) * 0.4 : 0.08,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voices — closable pillbox */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setVoicesOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                voices
              </span>
              <span
                style={{
                  transform: voicesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A06080',
                }}
              >
                ▾
              </span>
            </button>
            {voicesOpen && (
              <div className="animate-in fade-in duration-150 space-y-3 pt-1">
                <div className="flex justify-center gap-2 flex-wrap">
                  {(['off', 'affirmations', 'meditation', 'poetry'] as const).map((mode) => {
                    const isOn = voiceMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setVoiceMode(isOn ? 'off' : mode)}
                        className="cursor-pointer rounded-full px-2.5 py-1 text-[12px] font-semibold transition-all"
                        style={{
                          color: isOn ? '#C4A060' : '#8A6A4A',
                          background: isOn ? '#C4A06015' : 'transparent',
                          border: `1px solid ${isOn ? '#C4A06040' : '#C4A06010'}`,
                          opacity: isOn ? 1 : mode === 'off' ? 0.5 : 0.8,
                          fontFamily: 'var(--font-serif)',
                        }}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
                {voiceMode !== 'off' && (
                  <div className="px-1">
                    <VoiceProviderSelector />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Layers — closable, categories with rectangle pad cards */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setLayersOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#7A5438' }}
              >
                layers
              </span>
              <span
                style={{
                  transform: layersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#7A543880',
                }}
              >
                ▾
              </span>
            </button>
            {layersOpen && (
              <div className="animate-in fade-in duration-150 space-y-4 pt-1">
                {/* Layer softness control */}
                <div className="flex items-center justify-center gap-2">
                  <InfoTooltip
                    title="Layer Softness (Reverb)"
                    content={
                      <>
                        <p style={{ margin: 0 }}>
                          Reverb makes every layer sound like it&apos;s playing in a bigger space —
                          a room, a hall, a cathedral. Turn it up and sounds feel softer, further
                          away, more dreamlike. Turn it down and they feel tight and close.
                        </p>
                        <p style={{ margin: '8px 0 0 0' }}>
                          Technically it&apos;s a shared reverb bus that all active layers run
                          through, so the whole mix breathes together.
                        </p>
                      </>
                    }
                    trigger={
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#7A5438',
                          letterSpacing: '0.02em',
                          borderBottom: '1px dotted #7A543860',
                          paddingBottom: 1,
                        }}
                      >
                        softness
                      </span>
                    }
                  />
                  <div
                    className="relative cursor-pointer"
                    style={{ width: 140, height: 28, touchAction: 'none' }}
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setLayerReverb(
                        Math.round(
                          Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100,
                        ),
                      );
                    }}
                    onMouseDown={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const onMove = (ev: MouseEvent) => {
                        const r = el.getBoundingClientRect();
                        setLayerReverb(
                          Math.round(
                            Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100,
                          ),
                        );
                      };
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                    onTouchStart={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const set = (cx: number) => {
                        const r = el.getBoundingClientRect();
                        setLayerReverb(
                          Math.round(Math.max(0, Math.min(1, (cx - r.left) / r.width)) * 100),
                        );
                      };
                      set(e.touches[0].clientX);
                      const onMove = (ev: TouchEvent) => {
                        ev.preventDefault();
                        set(ev.touches[0].clientX);
                      };
                      const onEnd = () => {
                        window.removeEventListener('touchmove', onMove);
                        window.removeEventListener('touchend', onEnd);
                      };
                      window.addEventListener('touchmove', onMove, { passive: false });
                      window.addEventListener('touchend', onEnd);
                    }}
                  >
                    <div
                      className="absolute top-1/2 -translate-y-1/2 left-0 right-0 rounded-full"
                      style={{ height: 10, background: '#C4A06010' }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 left-0 rounded-full"
                      style={{
                        height: 10,
                        width: `${layerReverb}%`,
                        background: `linear-gradient(90deg, ${RAINBOW[0]}, ${RAINBOW[4]}, ${RAINBOW[8]})`,
                        opacity: 0.7,
                      }}
                    />
                    <div
                      className="absolute top-1/2 rounded-full"
                      style={{
                        left: `${layerReverb}%`,
                        width: 16,
                        height: 16,
                        background:
                          RAINBOW[
                            Math.min(
                              RAINBOW.length - 1,
                              Math.floor((layerReverb / 100) * RAINBOW.length),
                            )
                          ],
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 2px 8px rgba(160,144,122,0.4)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#8A6A4A',
                      width: 30,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    {layerReverb}%
                  </span>
                </div>

                {/* Pad palette — one small swatch dot per colour set */}
                <fieldset
                  aria-label="Pad colours"
                  className="m-0 flex items-center justify-center gap-2.5 border-0 p-0"
                >
                  {PAD_PALETTES.map((p) => {
                    const sw = paletteSwatch(p, Object.values(CATEGORY_COLORS));
                    const active = p.id === padPaletteId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={active}
                        aria-label={p.label}
                        title={p.label}
                        onClick={() => setPadPaletteId(p.id)}
                        className="cursor-pointer rounded-full transition-transform"
                        style={{
                          width: 20,
                          height: 20,
                          padding: 0,
                          background: `conic-gradient(${sw.map((c, i) => `${c} ${(i / sw.length) * 100}% ${((i + 1) / sw.length) * 100}%`).join(', ')})`,
                          border: 'none',
                          boxShadow: active
                            ? '0 0 0 2px #FBF6EC, 0 0 0 3.5px #7A5438'
                            : '0 0 0 1px #C4A06040',
                          transform: active ? 'scale(1.1)' : 'none',
                        }}
                      />
                    );
                  })}
                </fieldset>

                {/* Category groups — each with a natural-language title + 3-col pad grid */}
                {CATEGORY_ORDER.map((cat) => {
                  const catLayers = ALL_LAYERS.filter((l) => getLayerCategory(l.id) === cat);
                  if (catLayers.length === 0) return null;
                  const catColor = CATEGORY_COLORS[cat];
                  const titleColor = tinted
                    ? readableInk(padColor(padPalette, PAD_GRID_INDEX[catLayers[0].id], catColor))
                    : catColor;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <p
                        className="uppercase tracking-[0.2em]"
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: titleColor,
                          opacity: 1,
                        }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {catLayers.map((l, layerIdx) => {
                          const vol = activeLayers[l.id] || 0;
                          const isOn = vol > 0;
                          const colT = (layerIdx % 3) / 2; // 0.0, 0.5, 1.0 left→right
                          const bgAlpha = Math.round(10 + colT * 18)
                            .toString(16)
                            .padStart(2, '0');
                          const borderAlpha = Math.round(28 + colT * 32)
                            .toString(16)
                            .padStart(2, '0');
                          const color = padColor(padPalette, PAD_GRID_INDEX[l.id], catColor);
                          const ink = tinted ? readableInk(color) : color;
                          const padBg = padPalette.dark
                            ? isOn
                              ? color
                              : `${color}1F`
                            : isOn
                              ? padPalette.solid
                                ? color
                                : `${color}${tinted ? '55' : bgAlpha}`
                              : tinted
                                ? `${color}0A`
                                : '#C4A06006';
                          const padText = padPalette.dark
                            ? isOn
                              ? '#F5E8C8'
                              : ink
                            : isOn
                              ? padPalette.solid
                                ? readableInk(color, color)
                                : ink
                              : tinted
                                ? ink
                                : '#8A6A4A';
                          return (
                            <div key={l.id} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => toggleLayer(l.id)}
                                className="w-full cursor-pointer rounded-lg px-2 py-2 text-center transition-all"
                                style={{
                                  background: padBg,
                                  border: `1px solid ${isOn ? `${color}${borderAlpha}` : tinted ? `${color}30` : '#C4A06018'}`,
                                  minHeight: 40,
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: '13px',
                                    fontWeight: isOn ? 700 : 400,
                                    color: padText,
                                    opacity: tinted ? 1 : isOn ? 0.6 + colT * 0.4 : 0.65,
                                  }}
                                >
                                  {l.label}
                                </span>
                              </button>
                              {isOn && (
                                <div
                                  className="flex gap-[3px] cursor-pointer"
                                  style={{ padding: '4px 0', touchAction: 'none' }}
                                  onClick={(e) => {
                                    const rect = (
                                      e.currentTarget as HTMLElement
                                    ).getBoundingClientRect();
                                    setLayerVol(
                                      l.id,
                                      Math.max(
                                        0.05,
                                        Math.min(1, (e.clientX - rect.left) / rect.width),
                                      ),
                                    );
                                  }}
                                  onMouseDown={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    const onMove = (ev: MouseEvent) => {
                                      const r = el.getBoundingClientRect();
                                      setLayerVol(
                                        l.id,
                                        Math.max(
                                          0.05,
                                          Math.min(1, (ev.clientX - r.left) / r.width),
                                        ),
                                      );
                                    };
                                    const onUp = () => {
                                      window.removeEventListener('mousemove', onMove);
                                      window.removeEventListener('mouseup', onUp);
                                    };
                                    window.addEventListener('mousemove', onMove);
                                    window.addEventListener('mouseup', onUp);
                                  }}
                                  onTouchStart={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    const set = (cx: number) => {
                                      const r = el.getBoundingClientRect();
                                      setLayerVol(
                                        l.id,
                                        Math.max(0.05, Math.min(1, (cx - r.left) / r.width)),
                                      );
                                    };
                                    set(e.touches[0].clientX);
                                    const onMove = (ev: TouchEvent) => {
                                      ev.preventDefault();
                                      set(ev.touches[0].clientX);
                                    };
                                    const onEnd = () => {
                                      window.removeEventListener('touchmove', onMove);
                                      window.removeEventListener('touchend', onEnd);
                                    };
                                    window.addEventListener('touchmove', onMove, {
                                      passive: false,
                                    });
                                    window.addEventListener('touchend', onEnd);
                                  }}
                                >
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <div
                                      key={i}
                                      className="flex-1 rounded-[3px] transition-all"
                                      style={{
                                        height: 18,
                                        background: color,
                                        opacity: i / 4 <= vol ? 0.5 + (i / 4) * 0.45 : 0.1,
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collapsible: Genres */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setGenresOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                genres
              </span>
              <span
                style={{
                  transform: genresOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A060',
                }}
              >
                ▾
              </span>
            </button>
            {genresOpen && (
              <div className="animate-in fade-in duration-150 flex flex-wrap justify-center gap-2 pt-1">
                {GENRES.map((g) => {
                  const isActive = activeGenre === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => applyGenre(g)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 transition-all"
                      style={{
                        background: isActive ? `${g.color}18` : '#C4A06006',
                        border: `1px solid ${isActive ? `${g.color}55` : `${g.color}30`}`,
                      }}
                      title={g.subtitle}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '15px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? g.color : '#7A5438',
                          opacity: isActive ? 1 : 0.8,
                        }}
                      >
                        {g.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collapsible: Brain States */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setBrainStatesOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                brain states
              </span>
              <span
                style={{
                  transform: brainStatesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A060',
                }}
              >
                ▾
              </span>
            </button>
            {brainStatesOpen && (
              <div className="animate-in fade-in duration-150">
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {PRESETS.map((p) => {
                    const isActive = p.base === baseFreq && p.beat === beatFreq;
                    const presetLayers = PRESET_LAYERS[p.id] || [];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPresetWithLayers(p)}
                        className="cursor-pointer rounded-full px-3 py-1.5 text-left transition-all"
                        style={{
                          background: isActive ? `${p.color}15` : 'transparent',
                          border: `1px solid ${isActive ? `${p.color}55` : `${p.color}30`}`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: isActive ? p.color : '#7A5438',
                            opacity: isActive ? 1 : 0.8,
                          }}
                        >
                          {p.label}
                        </span>
                        {isActive && presetLayers.length > 0 && (
                          <span
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '12px',
                              color: p.color,

                              marginLeft: 4,
                            }}
                          >
                            +{presetLayers.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible: Daily Note */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setSavedSoundsOpen((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
              style={{ background: 'none', border: 'none' }}
            >
              <span
                className="text-center text-base font-bold uppercase tracking-[0.22em]"
                style={{ color: '#C4A060' }}
              >
                daily note
              </span>
              <span
                style={{
                  transform: savedSoundsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#C4A060',
                }}
              >
                ▾
              </span>
            </button>
            {savedSoundsOpen && (
              <div className="animate-in fade-in duration-150 pt-1 pb-3">
                <p
                  className="text-center italic leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '14px',
                    color: '#8A6A4A',
                    opacity: 0.85,
                    padding: '8px 12px',
                    border: '1px solid #C4A06020',
                    borderRadius: 10,
                    background: '#C4A06008',
                  }}
                >
                  {
                    [
                      'Structure is the scaffolding of freedom.',
                      'Every action you take is a vote for who you want to become.',
                      'The present moment is where your power lives.',
                      'Build the life you want one hour at a time.',
                      'Rest is not a reward — it is a foundation.',
                      'Creativity is intelligence having fun.',
                      'What you practice in private shows up in public.',
                    ][new Date().getDay()]
                  }
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Suggestion removed — was "balanced state alpha waves to maintain" */}
    </div>
  );
}

/*
 * VisualizerBox — eight-mode visualizer + parameter sliders +
 * fullscreen toggle. All state persists in localStorage so the
 * user's chosen math stays across sessions.
 */
const VALID_MODES: VisualizerMode[] = [
  'atom',
  'fibonacci',
  'phyllotaxis',
  'wave',
  'lissajous',
  'constellation',
  'helix',
  'tunnel',
  'morph',
  'saturn',
  'galaxy',
  'orbital',
  'solar',
];

function _VisualizerBox() {
  const [mode, setMode] = useState<VisualizerMode>('atom');
  // Speed default 0.25 — most calm, relaxing stable spot for the whole
  // family. Other stable spots are at 0.4 (gentle), 0.6 (flowing),
  // 0.8 (energetic). The speed preset chips in the UI snap to these.
  const [speed, setSpeed] = useState(0.25);
  const [density, setDensity] = useState(0.5);
  const [scale, setScale] = useState(0.5);
  const [opacity, setOpacity] = useState(0.9);
  const [depth3d, setDepth3d] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 300, h: 180 });
  const [learnDepth, setLearnDepth] = useState(0);

  // Restore persisted state
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('colourmap:visualizer-mode');
      if (savedMode && (VALID_MODES as string[]).includes(savedMode)) {
        setMode(savedMode as VisualizerMode);
      }
      const savedSpeed = Number.parseFloat(
        localStorage.getItem('colourmap:visualizer-speed') || 'NaN',
      );
      if (!Number.isNaN(savedSpeed)) setSpeed(Math.max(0, Math.min(1, savedSpeed)));
      const savedDensity = Number.parseFloat(
        localStorage.getItem('colourmap:visualizer-density') || 'NaN',
      );
      if (!Number.isNaN(savedDensity)) setDensity(Math.max(0, Math.min(1, savedDensity)));
      const savedScale = Number.parseFloat(
        localStorage.getItem('colourmap:visualizer-scale') || 'NaN',
      );
      if (!Number.isNaN(savedScale)) setScale(Math.max(0, Math.min(1, savedScale)));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('colourmap:visualizer-mode', mode);
    } catch {}
    // Collapse "learn more" blocks each time the user switches modes
    setLearnDepth(0);
  }, [mode]);
  useEffect(() => {
    try {
      localStorage.setItem('colourmap:visualizer-speed', speed.toString());
    } catch {}
  }, [speed]);
  useEffect(() => {
    try {
      localStorage.setItem('colourmap:visualizer-density', density.toString());
    } catch {}
  }, [density]);
  useEffect(() => {
    try {
      localStorage.setItem('colourmap:visualizer-scale', scale.toString());
    } catch {}
  }, [scale]);

  // Resize canvas to fit fullscreen or the normal embedded frame
  useEffect(() => {
    function update() {
      if (fullscreen) {
        setDims({
          w: Math.min(window.innerWidth, 1200),
          h: Math.min(window.innerHeight - 200, 900),
        });
      } else {
        setDims({ w: 300, h: 180 });
      }
    }
    update();
    if (fullscreen) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, [fullscreen]);

  // Escape exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullscreen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const MODES: { id: VisualizerMode; label: string; desc: string }[] = [
    { id: 'atom', label: 'Atom', desc: 'drag to push — spring-tied cloud breathes with sound' },
    { id: 'fibonacci', label: 'Fibonacci', desc: 'golden-ratio spiral rotating and pulsing' },
    { id: 'phyllotaxis', label: 'Sunflower', desc: 'continuous outward seed growth' },
    { id: 'wave', label: 'Ripples', desc: 'concentric rings pulsing outward' },
    { id: 'lissajous', label: 'Lissajous', desc: 'braided harmonograph curves' },
    {
      id: 'constellation',
      label: 'Constellation',
      desc: 'drifting nebula — lines between neighbors',
    },
    { id: 'helix', label: 'Helix', desc: 'double helix rotating about a vertical axis' },
    {
      id: 'tunnel',
      label: 'Tunnel',
      desc: 'flying through a tunnel of rings — depth + motion',
    },
    {
      id: 'morph',
      label: 'Morph',
      desc: '4D-like transformation between three shapes, very slow',
    },
    {
      id: 'saturn',
      label: 'Saturn',
      desc: 'a tilted planet with rings — with Cassini-like gaps',
    },
    {
      id: 'galaxy',
      label: 'Galaxy',
      desc: 'logarithmic spiral arms slowly rotating with a bright core',
    },
    {
      id: 'orbital',
      label: 'Orbital',
      desc: '3D atom — electrons on tilted shells around a nucleus',
    },
    {
      id: 'solar',
      label: 'Solar',
      desc: 'our solar system — 8 planets on concentric orbits',
    },
  ];

  // Stable "calm spots" on the speed axis — the user noticed certain
  // speeds feel particularly settled. These are the sweet spots; the
  // pill row lets them jump between without hunting on the slider.
  const SPEED_PRESETS: { label: string; value: number }[] = [
    { label: 'Dream', value: 0.15 },
    { label: 'Calm', value: 0.25 },
    { label: 'Gentle', value: 0.4 },
    { label: 'Flow', value: 0.6 },
    { label: 'Alive', value: 0.8 },
  ];

  // Layered educational content for each mode — the user can press
  // losanges to dig deeper, one block at a time.
  const LEARN_CONTENT: Record<VisualizerMode, { title: string; blocks: string[] }> = {
    atom: {
      title: 'The golden-angle spiral',
      blocks: [
        '200 dots arranged using the golden angle (~137.5°) — the angle that packs points on a disk more evenly than any other rotation.',
        'Why 137.5°? It is 360° divided by φ² where φ = 1.618, the golden ratio. Any other angle leaves visible gaps or ridges; this one alone spreads dots evenly at every radius.',
        'Sunflowers use this angle in their seed heads. Pinecones, daisies, pineapple skins, and the scales on a Romanesco broccoli do the same. Nature independently evolved this for optimal sunlight / growing-space packing.',
        'Da Vinci and Kepler wrote about it, but botanist Wilhelm Hofmeister (1868) and later Douady & Couder (1992) showed it emerges from a simple "place the next primordium as far from the previous as possible" rule. Life does optimization without knowing math.',
      ],
    },
    fibonacci: {
      title: 'Fibonacci and the golden spiral',
      blocks: [
        'The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21, ...) — each number is the sum of the two before. Ratios of consecutive terms converge to the golden ratio φ ≈ 1.6180339...',
        'Fibonacci (Leonardo of Pisa, 1202) introduced the sequence to Europe via a rabbit-breeding problem. The sequence itself was known in Sanskrit prosody much earlier — Pingala, around 200 BCE.',
        "The golden spiral (r = φ^(θ/90°)) appears in nautilus shells, galaxies, hurricanes, Greek architecture, Renaissance paintings (Da Vinci's Vitruvian Man, Parthenon facade), and human body proportions.",
        'The deep reason: φ is the "most irrational" number — its continued-fraction expansion is [1; 1, 1, 1, ...] — so φ-rotations never align with themselves. That makes it nature\'s best choice whenever non-repetition matters.',
      ],
    },
    phyllotaxis: {
      title: 'Phyllotaxis — the mathematics of plant growth',
      blocks: [
        'Phyllotaxis = "leaf arrangement." The study of how plants place new leaves, petals, seeds, and branches around a stem.',
        'Nearly every spiral pattern in a plant follows a Fibonacci number of clockwise and counter-clockwise arms. Count them on a pinecone — you will find 5 and 8, or 8 and 13, or 13 and 21.',
        'The dots here spawn continuously from the center, drift outward, and fade at the edge — simulating how a plant adds new primordia at its tip while older ones push outward.',
        'Why does evolution "choose" Fibonacci? Because it gives each leaf maximum sunlight and each seed maximum packing density. The geometry is the survival strategy.',
      ],
    },
    wave: {
      title: 'Radial waves — ripples in the pond',
      blocks: [
        'Concentric rings pulse outward like ripples in a pond, each ring phase-shifted in time. In physics this is a simplified wave equation: u(r, t) = A·sin(kr - ωt).',
        'The same pattern describes sound spreading from a speaker, light from a bulb, seismic waves from an earthquake, and the cosmic microwave background ripples from the Big Bang.',
        'Huygens (1678) showed every point on a wave front is itself the source of a new wave — a deeply strange idea that perfectly describes diffraction and interference 350 years later.',
      ],
    },
    lissajous: {
      title: 'Lissajous curves — two rhythms braiding',
      blocks: [
        'x = sin(a·t + δ), y = sin(b·t) — two sine waves at different frequencies plotted against each other. Named after Jules Lissajous (1857).',
        'Lissajous invented them to visualize vibrations — he bounced light off a tuning-fork mirror onto a wall. 165 years later oscilloscopes still use them.',
        'The curve closes into a loop only when the ratio a/b is rational (like 2:3). Irrational ratios trace paths that fill the square forever without repeating — chaos-adjacent behavior from a simple equation.',
        'Bowen Technique, harmonograph pendulums, and 1960s-era music visualizers all rely on this math. Kids drawing spirograph with two pens are drawing Lissajous variants.',
      ],
    },
    constellation: {
      title: 'Drifting nebula — proximity graphs',
      blocks: [
        'Dots drift gently, and lines connect those within a threshold distance. This is a live proximity graph — a basic structure in computational geometry.',
        'Used in 3D rendering for boids (flocking birds), in physics for ideal-gas simulations, and in social network analysis to find clusters of close friends.',
        'The nebula feel comes from a happy accident: gentle noise in dot motion + distance-thresholded opacity makes patterns appear and dissolve organically — the Brownian-motion aesthetic.',
      ],
    },
    helix: {
      title: 'The double helix',
      blocks: [
        "Two intertwined strands rotating about a shared axis — DNA's structure, discovered by Watson, Crick, Franklin, and Wilkins in 1953 from Rosalind Franklin's X-ray crystallography.",
        "DNA's helix has ~10 base pairs per turn, a pitch of 3.4 nm, and a diameter of 2 nm. If you uncoiled all the DNA in your body end-to-end, it would stretch ~67 billion km — 446 times the distance Earth to the Sun.",
        'The same mathematical shape appears in phone cords, climbing plants (morning glory), spiral staircases, and the tubulin proteins in your cells. It is the most compact way to store a linear sequence in 3D space while keeping both ends accessible.',
      ],
    },
    tunnel: {
      title: 'Depth and perspective — the racing tunnel',
      blocks: [
        'Rings expand outward at different depths, creating an illusion of forward motion. Early Renaissance painters (Brunelleschi, ~1415) discovered linear perspective — far things appear smaller with mathematical precision.',
        'Alberti (1435) formalized the vanishing point. Suddenly 2D paintings could evoke 3D space. Every 3D video game, VR headset, and film camera since uses his projection matrix.',
        'The "warp tunnel" effect here is that same math animated — rings start tiny at the vanishing point and grow as they "travel" toward you. Star Wars hyperspace and 2001: A Space Odyssey\'s star gate use it.',
      ],
    },
    morph: {
      title: 'Morphing — weighted blends of shapes',
      blocks: [
        'Each dot sits at a weighted sum of its position on three different shapes (Fibonacci spiral, double helix, Lissajous curve). The weights shift over 20 seconds, so the cloud continuously transforms.',
        'This technique is used in 3D animation as "blend shapes" or "morph targets" — how Pixar animates face expressions (smile → frown → surprise) by interpolating between stored shapes.',
        'Mathematically this is a convex combination: a·P₁ + b·P₂ + c·P₃ where a + b + c = 1. At any moment the cloud is a unique hybrid shape that has never existed before and may never again.',
        'The feeling of watching a 4-dimensional object rotate comes from this: you are seeing 2D projections of a 3-way shape blend, and your brain insists it must be a single object moving through higher-dimensional space.',
      ],
    },
    saturn: {
      title: 'Saturn — rings of ice and rock',
      blocks: [
        "Saturn's rings are not solid — they are billions of ice and rock chunks, from dust grains to boulders, all orbiting the planet within a ring system just ~10 meters thick on average. You could park a building-height structure across the whole thing.",
        "The gaps in the rings (Cassini Division, Encke Gap) are swept clean by Saturn's moons. Small moons orbiting inside the gap pull debris out; tiny gravitational resonances do the rest.",
        'Ring planets exist for the same reason: any close-orbiting material tidally breaks into pieces too small to gravitationally pull into a single moon. The Roche limit — below this distance, a moon shatters — is where rings form.',
        "Jupiter, Uranus, and Neptune all have rings too, they are just thinner. Saturn's are visible because its rings are mostly water ice, which reflects sunlight brilliantly.",
      ],
    },
    galaxy: {
      title: 'Spiral galaxies — rivers of stars',
      blocks: [
        'Our Milky Way is a barred spiral galaxy with ~200-400 billion stars arranged in 4 main arms. Light from the far side takes ~100,000 years to reach us.',
        'Spiral arms are not solid structures — they are density waves. Stars pass through the arms like cars through a traffic jam, slowing briefly as gas compresses and new stars form, then moving on.',
        'The arms follow a logarithmic spiral: r = a·e^(b·θ). Same equation as nautilus shells, hurricanes, and the Fibonacci spiral. Scale-invariant beauty.',
        "Galaxies rotate, but not like rigid disks — inner stars orbit faster, outer stars slower. Yet they somehow keep the same shape for billions of years. The answer involves dark matter, unseen scaffolding we can't directly observe but can calculate must exist.",
      ],
    },
    orbital: {
      title: 'Atomic orbitals — where electrons probably are',
      blocks: [
        'Electrons do not orbit the nucleus like planets around a sun. They exist as probability clouds — the orbital — where the electron could be with some probability density.',
        'Each shell (1s, 2s, 2p, 3d, ...) has a different 3D shape: spheres, dumbbells, clovers, even more exotic. The visualization here simplifies to rotating rings but real orbitals are stranger and more beautiful.',
        'The quantum numbers that define orbitals (n, ℓ, mℓ, ms) were worked out in the 1920s by Schrödinger, Heisenberg, Pauli. They explain the entire periodic table.',
        'When two atoms bond chemically, their orbitals merge into "molecular orbitals" — the actual shape of every molecule in your body is a sum of blended orbital geometries. Math is the architecture of life.',
      ],
    },
    solar: {
      title: 'Our solar system',
      blocks: [
        '8 planets + the Sun + ~200 moons + millions of asteroids + trillions of comets, all bound by gravity. Age: ~4.6 billion years. Formed from a collapsing cloud of gas and dust.',
        "The Sun holds 99.86% of the solar system's mass. Jupiter holds most of the rest. Everything else, including Earth, is rounding error by mass.",
        "Orbital periods follow Kepler's third law: T² ∝ r³ (square of year length is proportional to cube of distance). Discovered by Kepler in 1609 from Tycho Brahe's observations, 80 years before Newton explained why.",
        "Voyager 1, launched 1977, crossed the heliopause (edge of the Sun's influence) in 2012 and is now in interstellar space, ~24 billion km away, still transmitting. Its Golden Record carries music and greetings for any civilization that ever finds it.",
      ],
    },
  };

  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  const slider = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    leftLabel: string,
    rightLabel: string,
  ) => (
    <div key={label} className="flex items-center gap-2">
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          color: '#8A6A4A',
          width: 50,
          flexShrink: 0,
          textAlign: 'right',
        }}
      >
        {label}
      </span>
      <div
        className="relative flex-1 cursor-pointer"
        style={{ height: 14 }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setValue(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
        }}
        onMouseDown={(e) => {
          const el = e.currentTarget as HTMLElement;
          const onMove = (ev: MouseEvent) => {
            const r = el.getBoundingClientRect();
            setValue(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)));
          };
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 rounded-full"
          style={{ height: 3, background: '#C4A06015' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 rounded-full"
          style={{
            height: 3,
            width: `${value * 100}%`,
            background: 'linear-gradient(90deg, #C4A06040, #C4A060)',
          }}
        />
        <div
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${value * 100}%`,
            width: 10,
            height: 10,
            background: '#C4A060',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 1px 2px rgba(196,160,96,0.4)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 10,
          color: '#8A6A4A',
          opacity: 0.5,
          width: 42,
          flexShrink: 0,
        }}
      >
        {leftLabel} · {rightLabel}
      </span>
    </div>
  );

  const content = (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 overflow-auto'
          : 'rounded-2xl border border-border p-3'
      }
      style={{
        background: fullscreen
          ? 'radial-gradient(ellipse at center, rgba(40,20,10,0.9), rgba(10,5,2,0.98))'
          : 'rgba(92,48,24,0.03)',
        fontFamily: 'var(--font-serif)',
      }}
    >
      <div className="mb-2 flex w-full max-w-4xl items-center justify-between">
        <p
          className="uppercase"
          style={{
            fontSize: fullscreen ? 15 : 13,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: fullscreen ? '#F2DCBC' : '#5C3018',
          }}
        >
          Visual · {current.label}
        </p>
        <div className="flex items-center gap-3">
          <p
            className="italic"
            style={{
              fontSize: 11,
              color: fullscreen ? '#C8A070' : '#8A6A4A',
              opacity: 0.75,
              textAlign: 'right',
              maxWidth: 260,
            }}
          >
            {current.desc}
          </p>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all"
            style={{
              color: fullscreen ? '#F5E8C8' : '#7A5438',
              background: fullscreen ? '#7A5438' : 'transparent',
              border: '1px solid rgba(196, 160, 96, 0.35)',
            }}
            aria-pressed={fullscreen}
            title="Toggle fullscreen"
          >
            {fullscreen ? 'close ✕' : 'open ⛶'}
          </button>
        </div>
      </div>

      {/* Mode picker */}
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {MODES.map((m) => {
          const isOn = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={isOn}
              className="cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all"
              style={{
                color: isOn ? '#F5E8C8' : fullscreen ? '#C8A070' : '#8A6A4A',
                background: isOn ? '#7A5438' : 'transparent',
                border: '1px solid rgba(196, 160, 96, 0.3)',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <AtomVisualizer
          width={dims.w}
          height={dims.h}
          intensity={0.7}
          speed={speed}
          density={density}
          scale={scale}
          opacity={opacity}
          depth3d={depth3d}
          mode={mode}
        />
      </div>

      {/* Speed preset chips — snap to the five stable "calm spots" */}
      <div className="mt-3 flex w-full max-w-md mx-auto justify-between gap-1.5">
        {SPEED_PRESETS.map((p) => {
          const isOn = Math.abs(speed - p.value) < 0.04;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setSpeed(p.value)}
              aria-pressed={isOn}
              className="flex-1 cursor-pointer rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all"
              style={{
                color: isOn ? '#F5E8C8' : fullscreen ? '#C8A070' : '#8A6A4A',
                background: isOn ? '#7A5438' : 'transparent',
                border: '1px solid rgba(196, 160, 96, 0.25)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Parameter sliders — touch anywhere on the canvas still pushes dots */}
      <div className="mt-3 w-full max-w-md mx-auto space-y-2">
        {slider('speed', speed, setSpeed, 'slow', 'fast')}
        {slider('density', density, setDensity, 'few', 'many')}
        {slider('scale', scale, setScale, 'tiny', 'big')}
        {slider('opacity', opacity, setOpacity, 'faint', 'bold')}
        {slider('3D', depth3d, setDepth3d, 'flat', 'deep')}
      </div>

      {/* Learn more — losange buttons reveal layered educational content */}
      <div className="mt-4 w-full max-w-md mx-auto">
        <p
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: fullscreen ? '#C8A070' : '#8A6A4A',
            opacity: 0.75,
          }}
        >
          {LEARN_CONTENT[mode].title}
        </p>
        {LEARN_CONTENT[mode].blocks.slice(0, learnDepth).map((block, i) => (
          <p
            key={`${mode}-${i}`}
            className="mb-2 animate-in fade-in duration-300"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 12,
              lineHeight: 1.55,
              color: fullscreen ? '#F2DCBC' : '#5C3018',
              opacity: 0.88,
            }}
          >
            {block}
          </p>
        ))}
        {learnDepth < LEARN_CONTENT[mode].blocks.length && (
          <button
            type="button"
            onClick={() => setLearnDepth((d) => Math.min(d + 1, LEARN_CONTENT[mode].blocks.length))}
            className="mt-1 flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              color: fullscreen ? '#C8A070' : '#8A6A4A',
              letterSpacing: '0.06em',
            }}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rotate-45"
              style={{ background: '#C4A060', opacity: 0.85 }}
            />
            {learnDepth === 0 ? 'learn about this' : 'know more'}
          </button>
        )}
        {learnDepth > 0 && (
          <button
            type="button"
            onClick={() => setLearnDepth(0)}
            className="mt-1 ml-4 cursor-pointer transition-opacity hover:opacity-70"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 10,
              color: fullscreen ? '#C8A070' : '#8A6A4A',
              opacity: 0.5,
            }}
          >
            close
          </button>
        )}
      </div>
    </div>
  );

  // Reset learn depth when mode changes so each mode starts collapsed
  // (done via an effect so we don't mix state updates with render)
  return <div className="px-2">{content}</div>;
}

const RAINBOW = [
  '#E0908A',
  '#E8A878',
  '#D8C078',
  '#C0D088',
  '#A0C8A0',
  '#90C0C0',
  '#A0B0D0',
  '#D4B870',
  '#C8A8C8',
  '#E0908A',
];

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  color,
  onChange,
  toggleOn,
  onToggle,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
  toggleOn?: boolean;
  onToggle?: () => void;
}) {
  const pct = (value - min) / (max - min);
  const muted = toggleOn === false;
  const thumbColor = RAINBOW[Math.min(RAINBOW.length - 1, Math.floor(pct * RAINBOW.length))];

  function handleDrag(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(min + x * (max - min)));
  }

  return (
    <div className="flex items-center gap-2" style={{ opacity: muted ? 0.35 : 1 }}>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="cursor-pointer"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            color: muted ? '#8A6A4A' : '#C4A060',
            fontWeight: 600,
            width: 60,
            flexShrink: 0,
            textAlign: 'right',
            background: 'none',
            border: 'none',
            textDecoration: muted ? 'line-through' : 'none',
          }}
          title={muted ? `tap to enable ${label}` : `tap to mute ${label}`}
        >
          {label}
        </button>
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            color: '#C4A060',
            fontWeight: 600,
            width: 60,
            flexShrink: 0,
            textAlign: 'right',
          }}
        >
          {label}
        </span>
      )}
      <div
        className="relative flex-1 cursor-pointer"
        style={{ height: 28, touchAction: 'none' }}
        onMouseDown={(e) => {
          const el = e.currentTarget as HTMLElement;
          handleDrag(e.clientX, el);
          const onMove = (ev: MouseEvent) => handleDrag(ev.clientX, el);
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
        onTouchStart={(e) => {
          const el = e.currentTarget as HTMLElement;
          handleDrag(e.touches[0].clientX, el);
          const onMove = (ev: TouchEvent) => {
            ev.preventDefault();
            handleDrag(ev.touches[0].clientX, el);
          };
          const onEnd = () => {
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
          };
          window.addEventListener('touchmove', onMove, { passive: false });
          window.addEventListener('touchend', onEnd);
        }}
      >
        {/* Track bg */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 rounded-full"
          style={{ height: 6, background: '#C4A06010' }}
        />
        {/* Filled rainbow track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 rounded-full"
          style={{
            height: 6,
            width: `${pct * 100}%`,
            background: `linear-gradient(90deg, ${RAINBOW[0]}, ${RAINBOW[4]}, ${RAINBOW[8]})`,
            opacity: 0.75,
          }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${pct * 100}%`,
            width: 16,
            height: 16,
            background: thumbColor,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 2px 8px ${thumbColor}60`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '12px',
          color,
          fontWeight: 600,
          width: 40,
          flexShrink: 0,
          textAlign: 'left',
        }}
      >
        {value}
        {unit}
      </span>
    </div>
  );
}
