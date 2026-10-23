/**
 * Drum and synth voices — raw Web Audio, shared by the Groove Machine and the
 * Chill Machine's Beats module. Each voice is a short burst triggered at a
 * specific AudioContext time; lifecycle is self-contained (sources stop after
 * the note decays). Spec: docs/specs/chill-machine-public.md → Beats.
 */

import type { PresetVoiceTweaks } from '@/lib/groove-presets';

/* Per-preset voice tweaks. The active preset writes its `voiceTweaks`
 * object to this module-level slot; voice trigger functions read from
 * it to shape kick/snare/hihat envelopes per preset without taking an
 * extra arg through the scheduler. Empty object = engine defaults. */
let CURRENT_TWEAKS: PresetVoiceTweaks = {};
export function setCurrentVoiceTweaks(tweaks: PresetVoiceTweaks | undefined) {
  CURRENT_TWEAKS = tweaks ?? {};
}

export type KickTweaks = NonNullable<PresetVoiceTweaks['kick']>;
export type HihatTweaks = NonNullable<PresetVoiceTweaks['hihat']>;
export type BassTweaks = NonNullable<PresetVoiceTweaks['bass']>;

export function triggerKick(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  kickVoice(ctx, when, vel, out, CURRENT_TWEAKS.kick ?? {});
}

/** The kick with explicit tweaks — the Chill beats shape their own kicks. */
export function kickVoice(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  tw: KickTweaks,
) {
  const freqStart = tw.freqStart ?? 150;
  const freqEnd = tw.freqEnd ?? 40;
  const sweepSec = tw.sweepSec ?? 0.12;
  const decaySec = tw.decaySec ?? 0.35;
  const bodyGain = tw.bodyGain ?? 0.9;
  const clickGain = tw.clickGain ?? 0.18;
  const clickHpHz = tw.clickHpHz ?? 4000;

  // Body: sine sweep, the deep punch.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqStart, when);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, when + sweepSec);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(bodyGain * vel, when + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + decaySec);
  osc.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + decaySec + 0.05);

  // Click: noise burst at the very start. Adds the "beater" attack
  // that pure sine kicks lack. Skipped when clickGain is ~0 (Lofi).
  if (clickGain > 0.01) {
    const clickBuf = ctx.createBuffer(1, ctx.sampleRate * 0.01, ctx.sampleRate);
    const cd = clickBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / cd.length);
    const click = ctx.createBufferSource();
    click.buffer = clickBuf;
    const clickHp = ctx.createBiquadFilter();
    clickHp.type = 'highpass';
    clickHp.frequency.value = clickHpHz;
    const cGain = ctx.createGain();
    cGain.gain.value = clickGain * vel;
    click.connect(clickHp);
    clickHp.connect(cGain);
    cGain.connect(out);
    click.start(when);
    click.stop(when + 0.012);
  }
}

export function triggerSnare(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  const tw = CURRENT_TWEAKS.snare ?? {};
  const noiseHpHz = tw.noiseHpHz ?? 1200;
  const noiseDecaySec = tw.noiseDecaySec ?? 0.15;
  const bodyFreq = tw.bodyFreq ?? 220;
  const bodyDecaySec = tw.bodyDecaySec ?? 0.1;
  const noiseGainPeak = tw.noiseGain ?? 0.35;

  // Noise + tonal body
  const bufSize = ctx.sampleRate * Math.max(0.2, noiseDecaySec + 0.05);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = noiseHpHz;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(noiseGainPeak * vel, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + noiseDecaySec);
  noise.connect(hp);
  hp.connect(noiseGain);
  noiseGain.connect(out);
  noise.start(when);
  noise.stop(when + noiseDecaySec + 0.05);

  // Tonal body
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.setValueAtTime(bodyFreq, when);
  body.frequency.exponentialRampToValueAtTime(bodyFreq * 0.82, when + 0.08);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.25 * vel, when);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + bodyDecaySec);
  body.connect(bodyGain);
  bodyGain.connect(out);
  body.start(when);
  body.stop(when + bodyDecaySec + 0.05);
}

export function triggerHihat(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  hihatVoice(ctx, when, vel, out, CURRENT_TWEAKS.hihat ?? {});
}

export function hihatVoice(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  tw: HihatTweaks,
) {
  const hpHz = tw.hpHz ?? 7000;
  const decaySec = tw.decaySec ?? 0.05;
  const gainPeak = tw.gain ?? 0.12;

  const bufSize = ctx.sampleRate * Math.max(0.08, decaySec + 0.03);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = hpHz;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gainPeak * vel, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decaySec);
  noise.connect(hp);
  hp.connect(g);
  g.connect(out);
  noise.start(when);
  noise.stop(when + decaySec + 0.03);
}

export function triggerPerc(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  // Short shaker: noise burst with bandpass
  const bufSize = ctx.sampleRate * 0.08;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 4500;
  bp.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08 * vel, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + 0.1);
}

export function triggerBass(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  bassVoice(ctx, when, vel, out, freq, CURRENT_TWEAKS.bass ?? {});
}

export function bassVoice(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
  tw: BassTweaks,
) {
  const oscType = tw.oscType ?? 'sawtooth';
  const lpStartHz = tw.lpStartHz ?? 1200;
  const lpEndHz = tw.lpEndHz ?? 300;
  const sweepSec = tw.sweepSec ?? 0.15;
  const lpQ = tw.lpQ ?? 4;
  const gainPeak = tw.gain ?? 0.55;
  const decaySec = tw.decaySec ?? 0.2;

  const osc = ctx.createOscillator();
  osc.type = oscType;
  osc.frequency.setValueAtTime(freq, when);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(lpStartHz, when);
  lp.frequency.exponentialRampToValueAtTime(lpEndHz, when + sweepSec);
  lp.Q.value = lpQ;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gainPeak * vel, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decaySec);
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + decaySec + 0.05);
}

export function triggerSubPulse(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.4 * vel, when + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 1.8);
  osc.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 2);
}

export function triggerRhodes(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  const tw = CURRENT_TWEAKS.rhodes ?? {};
  const lpHz = tw.lpHz ?? 2500;
  const decaySec = tw.decaySec ?? 0.45;
  const gainPeak = tw.gain ?? 0.3;
  const overtoneRatio = tw.overtoneRatio ?? 3;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = freq * overtoneRatio;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lpHz;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gainPeak * vel, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decaySec);
  osc1.connect(lp);
  osc2.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc1.start(when);
  osc2.start(when);
  osc1.stop(when + decaySec + 0.05);
  osc2.stop(when + decaySec + 0.05);
}

export function triggerGuitar(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  // Wah guitar chop: sawtooth + bandpass filter sweep
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(800, when);
  bp.frequency.linearRampToValueAtTime(2500, when + 0.08);
  bp.Q.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.22 * vel, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
  osc.connect(bp);
  bp.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.2);
}

export function triggerPluck(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  // Tropical pluck: triangle wave with quick filtered attack
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4000, when);
  lp.frequency.exponentialRampToValueAtTime(500, when + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.3 * vel, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.32);
}

export function triggerLead(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  // Lead: square w/ filter envelope — simple emotional line à la The Blaze
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  lp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.18 * vel, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.55);
}

export function triggerPad(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  const tw = CURRENT_TWEAKS.pad ?? {};
  const oscType = tw.oscType ?? 'sawtooth';
  const detune = tw.detune ?? 1.005;
  const lpHz = tw.lpHz ?? 1800;
  const lpQ = tw.lpQ ?? 1;
  const gainPeak = tw.gain ?? 0.12;
  const fadeInSec = tw.fadeInSec ?? 1.5;
  const sustainSec = tw.sustainSec ?? 2.3;
  const totalSec = fadeInSec + sustainSec;

  const osc1 = ctx.createOscillator();
  osc1.type = oscType;
  osc1.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = oscType;
  osc2.frequency.value = freq * detune;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lpHz;
  lp.Q.value = lpQ;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gainPeak * vel, when + fadeInSec);
  g.gain.linearRampToValueAtTime(0.0001, when + totalSec);
  osc1.connect(lp);
  osc2.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc1.start(when);
  osc2.start(when);
  osc1.stop(when + totalSec + 0.2);
  osc2.stop(when + totalSec + 0.2);
}

export function triggerClap(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  // Layered noise bursts with gaps simulating hand clap smear
  const bufSize = ctx.sampleRate * 0.18;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    // 3 quick bursts
    const t = i / ctx.sampleRate;
    let env = 0;
    if (t < 0.015) env = 1 - t / 0.015;
    else if (t > 0.02 && t < 0.035) env = 1 - (t - 0.02) / 0.015;
    else if (t > 0.04 && t < 0.12) env = Math.exp(-(t - 0.04) * 25);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.value = 0.32 * vel;
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + 0.2);
}

export function triggerWobble(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  // Dubstep wobble bass: saw + square through a filter that wobbles
  // on an LFO for the note duration (1 bar ≈ 2s at 115 bpm half-time).
  const dur = 1.7;
  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = freq * 0.5; // octave down
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 14;
  // Wobble: LFO on the filter cutoff (4x per bar)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 4; // 4 wobbles per second ~ 8 per bar at this tempo
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain);
  lfoGain.connect(lp.frequency);
  lp.frequency.value = 600;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.45 * vel, when + 0.02);
  g.gain.setValueAtTime(0.45 * vel, when + dur - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc1.connect(lp);
  osc2.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc1.start(when);
  osc2.start(when);
  lfo.start(when);
  osc1.stop(when + dur);
  osc2.stop(when + dur);
  lfo.stop(when + dur);
}

export function triggerArp(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  // Ratatat-style short bright arpeggio note — square wave + filter
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  lp.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.14 * vel, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.15);
}

// White-noise riser played once when a DROP begins. 2 bars at 115 bpm
// ≈ 4.2s. Rises in pitch and volume to create anticipation, then cuts
// so the slam-back feels big.
export function triggerRiser(ctx: AudioContext, when: number, durationSec: number, out: AudioNode) {
  const bufSize = Math.floor(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  // Sweep from 400Hz to 8kHz across the duration
  bp.frequency.setValueAtTime(400, when);
  bp.frequency.exponentialRampToValueAtTime(8000, when + durationSec - 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.3, when + durationSec - 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + durationSec);
}

export function triggerChop(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  // Short "ah" vocal chop — multi-partial periodic wave + vowel formant
  const osc = ctx.createOscillator();
  const real = new Float32Array([0, 1, 0.6, 0.4, 0.25, 0.15]);
  const imag = new Float32Array(real.length);
  const wave = ctx.createPeriodicWave(real, imag);
  osc.setPeriodicWave(wave);
  osc.frequency.value = freq;
  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.frequency.value = 900;
  formant.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.2 * vel, when + 0.02);
  g.gain.setValueAtTime(0.2 * vel, when + 0.14);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
  osc.connect(formant);
  formant.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.3);
}

// ─────────────────────────────────────────────────────────────
// Chill beat voices — the extra colours the Beats module needs on
// top of the Groove Machine kit: open hat, ride, rim, shaker, hand
// drums, a marimba-like mallet, and the two drum samples.
// ─────────────────────────────────────────────────────────────

function noiseBuffer(ctx: AudioContext, seconds: number, fade = false): AudioBuffer {
  const size = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (fade ? 1 - i / size : 1);
  return buf;
}

/** Open hat: the closed hat's noise, brighter and left to ring. */
export function triggerOpenHat(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  const decaySec = 0.32;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, decaySec + 0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7500;
  const peak = ctx.createBiquadFilter();
  peak.type = 'peaking';
  peak.frequency.value = 10000;
  peak.gain.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.1 * vel, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decaySec);
  src.connect(hp);
  hp.connect(peak);
  peak.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + decaySec + 0.05);
}

/** Ride: 808-style square partials through a bandpass, a long shimmer. */
export function triggerRide(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  const decaySec = 0.6;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 9000;
  bp.Q.value = 0.8;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.045 * vel, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decaySec);
  bp.connect(hp);
  hp.connect(g);
  g.connect(out);
  for (const ratio of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 205 * ratio;
    osc.connect(bp);
    osc.start(when);
    osc.stop(when + decaySec + 0.05);
  }
}

/** Rim / click: a woody tick, the minimal-techno off-16th. */
export function triggerRim(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1750, when);
  osc.frequency.exponentialRampToValueAtTime(1200, when + 0.02);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1900;
  bp.Q.value = 5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.22 * vel, when + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);
  osc.connect(bp);
  bp.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.05);
}

/** Shaker: band-passed noise with a soft swell, lighter than the hat. */
export function triggerShaker(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.1);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 6200;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(0.07 * vel, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + 0.1);
}

/** Conga: a pitched skin with a short downward bend and a slap of noise. */
export function triggerConga(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq = 220,
) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.35, when);
  osc.frequency.exponentialRampToValueAtTime(freq, when + 0.03);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.35 * vel, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
  osc.connect(g);
  g.connect(out);
  osc.start(when);
  osc.stop(when + 0.3);

  const slap = ctx.createBufferSource();
  slap.buffer = noiseBuffer(ctx, 0.02, true);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 1.2;
  const sg = ctx.createGain();
  sg.gain.value = 0.08 * vel;
  slap.connect(bp);
  bp.connect(sg);
  sg.connect(out);
  slap.start(when);
  slap.stop(when + 0.025);
}

/** Marimba-like mallet: sine plus a quiet 4th partial, quick wooden decay. */
export function triggerMarimba(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  freq: number,
) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.2 * vel, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.4);
  g.connect(out);
  const partials: [number, number][] = [
    [1, 1],
    [3.98, 0.25],
  ];
  for (const [ratio, level] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const pg = ctx.createGain();
    pg.gain.value = level;
    osc.connect(pg);
    pg.connect(g);
    osc.start(when);
    osc.stop(when + 0.42);
  }
}

// ─── Samples ────────────────────────────────────────────────
// Decoded once per URL and shared. Until a sample has decoded, the
// sample voices fall back to their synth cousin so nothing drops out.

export const DJEMBE_URL = '/sounds/drums/Djembe.ogg';
export const TAMBOURINE_URL = '/sounds/drums/Tambourine.ogg';

const sampleCache = new Map<string, AudioBuffer>();
const sampleLoads = new Map<string, Promise<AudioBuffer | null>>();

export function loadDrumSample(ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = sampleCache.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = sampleLoads.get(url);
  if (pending) return pending;
  const load = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`drum sample ${url}: HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buf) => ctx.decodeAudioData(buf))
    .then((decoded) => {
      sampleCache.set(url, decoded);
      return decoded;
    })
    .catch((err: unknown) => {
      console.warn('drum sample failed to load', err);
      sampleLoads.delete(url);
      return null;
    });
  sampleLoads.set(url, load);
  return load;
}

/** The decoded sample if it is ready; starts the load otherwise. */
export function cachedDrumSample(ctx: BaseAudioContext, url: string): AudioBuffer | null {
  const hit = sampleCache.get(url);
  if (hit) return hit;
  void loadDrumSample(ctx, url);
  return null;
}

function playSample(
  ctx: AudioContext,
  buffer: AudioBuffer,
  when: number,
  gain: number,
  out: AudioNode,
  rate: number,
  maxSec: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  const len = Math.min(maxSec, buffer.duration / rate);
  g.gain.setValueAtTime(gain, when);
  g.gain.setValueAtTime(gain, when + Math.max(0, len - 0.03));
  g.gain.linearRampToValueAtTime(0.0001, when + len);
  src.connect(g);
  g.connect(out);
  src.start(when);
  src.stop(when + len + 0.01);
}

/** Djembe hit from the sample; `rate` above 1 gives the higher slap. */
export function triggerDjembe(
  ctx: AudioContext,
  when: number,
  vel: number,
  out: AudioNode,
  rate = 1,
) {
  const buf = cachedDrumSample(ctx, DJEMBE_URL);
  if (buf) playSample(ctx, buf, when, 0.5 * vel, out, rate, 0.5);
  else triggerConga(ctx, when, vel, out, 150 * rate);
}

/** Tambourine jingle from the sample, cut short so 16ths stay crisp. */
export function triggerTambourine(ctx: AudioContext, when: number, vel: number, out: AudioNode) {
  const buf = cachedDrumSample(ctx, TAMBOURINE_URL);
  if (buf) playSample(ctx, buf, when, 0.3 * vel, out, 1, 0.14);
  else triggerShaker(ctx, when, vel, out);
}
