/*
 * Drive's sound player (docs/specs/drive-game.md, "Sound"): everything synthesized with the Web
 * Audio API, nothing downloaded. The numbers come from lib/audio/drive-sound-map.ts; this only
 * builds the graph and plays them.
 *
 *   engine (four detuned oscillators → a low-pass) ┐
 *   wind (looped noise → a low-pass)               ├→ drive bus (ducked in the menus) ┐
 *   hiss (looped noise → a band-pass)              ┘                                   ├→ compressor → master → out
 *   one-shots: ticks, swells, whooshes, countdown, flourish ──────────→ ui bus ────────┘
 *
 * Nothing is made until a user gesture calls unlock() (the browsers' rule, and ours): until then
 * every call is a quiet no-op. Every level glides (setTargetAtTime), and a gentle compressor sits
 * on the master, so nothing jumps (the mellow rule).
 */

import {
  boostStarted,
  countdownTone,
  DEFAULT_PREFS,
  engineTone,
  finishFlourish,
  hissOf,
  type IntroLights,
  masterGain,
  type Note,
  type SoundPrefs,
  SWELL,
  TICK,
  type Tone,
  type VehicleKind,
  windOf,
} from './drive-sound-map';

/** How fast the continuous layers follow (s, the time constant). */
const GLIDE = 0.12;

type AC = typeof AudioContext;

function audioContextClass(): AC | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AC; webkitAudioContext?: AC };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  drive: GainNode;
  ui: GainNode;
  noise: AudioBuffer;
  engine: { oscs: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode };
  wind: { filter: BiquadFilterNode; gain: GainNode };
  hiss: { gain: GainNode };
}

export interface HudSound {
  speed: number;
  gear?: number;
  revs?: number;
  combo?: number | null;
}

export interface ControlSound {
  boost: number;
  handbrake?: boolean;
  steer?: number;
}

export class DriveSound {
  private g: Graph | null = null;
  private prefs: SoundPrefs = { ...DEFAULT_PREFS };
  private driving = false;
  private kind: VehicleKind = 'car';
  private speed = 0;
  private combo: number | null = null;
  private ctl: ControlSound = { boost: 0 };
  private lights: IntroLights | null = null;

  /** True once a gesture has made the audio. */
  get ready(): boolean {
    return this.g !== null;
  }

  /** Makes (or wakes) the audio. Call it from a click, a tap or a key. */
  unlock(): void {
    if (this.g) {
      if (this.g.ctx.state === 'suspended') this.g.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = audioContextClass();
    if (!Ctx) return;
    try {
      this.g = build(new Ctx());
    } catch {
      this.g = null;
      return;
    }
    this.applyMaster(0);
    this.applyDrive(0);
  }

  setPrefs(p: SoundPrefs): void {
    this.prefs = { ...p };
    this.applyMaster();
  }

  /** The race layers (engine, wind, hiss) play only while driving; menus and sheets duck them. */
  setDriving(on: boolean): void {
    if (on === this.driving) return;
    this.driving = on;
    this.applyDrive();
  }

  setVehicle(kind: VehicleKind): void {
    this.kind = kind;
  }

  /** The HUD as it changes: the engine follows speed, gear and revs; the wind the speed. */
  hud(h: HudSound): void {
    this.speed = h.speed;
    this.combo = h.combo ?? null;
    const g = this.g;
    if (!g) return;
    const now = g.ctx.currentTime;
    const e = engineTone(h.speed, h.gear, h.revs, this.kind);
    const ratios = [1, 1, 0.5, 1.5];
    g.engine.oscs.forEach((o, i) => {
      o.frequency.setTargetAtTime(e.freq * ratios[i], now, GLIDE);
    });
    g.engine.filter.frequency.setTargetAtTime(e.cutoff, now, GLIDE);
    g.engine.gain.gain.setTargetAtTime(e.gain, now, GLIDE);
    const w = windOf(h.speed);
    g.wind.filter.frequency.setTargetAtTime(w.cutoff, now, GLIDE * 2);
    g.wind.gain.gain.setTargetAtTime(w.gain, now, GLIDE * 2);
    this.applyHiss();
  }

  /** The controls as they change: a whoosh when a boost starts, the hiss with the handbrake. */
  controls(c: ControlSound): void {
    const was = this.ctl.boost;
    this.ctl = { ...c };
    if (this.driving && boostStarted(was, c.boost)) this.whoosh(c.boost >= 2 ? 1.25 : 1);
    this.applyHiss();
  }

  /** The race intro's lights: a low tone per red lamp, a higher GO. */
  intro(s: IntroLights | null): void {
    const tone = countdownTone(this.lights, s);
    this.lights = s ? { lit: s.lit, go: s.go } : null;
    if (tone) this.tone(tone, 'sine', 900);
  }

  /** A race run to its end (or into the void). */
  finish(r: { place?: number | null; record?: boolean; wrecked?: boolean }): void {
    this.notes(finishFlourish(r));
  }

  /** A menu move: a soft low tick. */
  tick(): void {
    this.unlock();
    this.tone(TICK, 'triangle', 1200, 0.004);
  }

  /** A choice made: a warm swell (a root and its fifth, slowly in, slowly out). */
  swell(): void {
    this.unlock();
    this.tone(SWELL, 'sine', 1400, 0.16);
    this.tone({ ...SWELL, freq: SWELL.freq * 1.5, gain: SWELL.gain * 0.5 }, 'sine', 1400, 0.2);
  }

  /** A soft rush of air: the boost, and a fire arch passed. */
  whoosh(strength = 1): void {
    const g = this.g;
    if (!g) return;
    const t = g.ctx.currentTime;
    const src = g.ctx.createBufferSource();
    src.buffer = g.noise;
    const band = g.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(320, t);
    band.frequency.exponentialRampToValueAtTime(1700, t + 0.25);
    band.frequency.exponentialRampToValueAtTime(500, t + 0.9);
    const amp = g.ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(0.13 * Math.min(strength, 1.3), t + 0.14);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    src.connect(band).connect(amp).connect(g.ui);
    src.start(t);
    src.stop(t + 1);
  }

  /** Sleeps the audio (the page hidden, the game left); unlock() wakes it. */
  suspend(): void {
    if (this.g && this.g.ctx.state === 'running') this.g.ctx.suspend().catch(() => {});
  }

  /** Lets the audio go for good (tests, or a hard reset). */
  close(): void {
    this.g?.ctx.close().catch(() => {});
    this.g = null;
    this.driving = false;
    this.lights = null;
  }

  private applyMaster(tau = 0.15) {
    const g = this.g;
    if (!g) return;
    const v = masterGain(this.prefs);
    if (tau === 0) g.master.gain.setValueAtTime(v, g.ctx.currentTime);
    else g.master.gain.setTargetAtTime(v, g.ctx.currentTime, tau);
  }

  private applyDrive(tau = 0.35) {
    const g = this.g;
    if (!g) return;
    const v = this.driving ? 1 : 0;
    if (tau === 0) g.drive.gain.setValueAtTime(v, g.ctx.currentTime);
    else g.drive.gain.setTargetAtTime(v, g.ctx.currentTime, tau);
  }

  private applyHiss() {
    const g = this.g;
    if (!g) return;
    const v = hissOf({
      speed: this.speed,
      combo: this.combo,
      handbrake: this.ctl.handbrake,
      steer: this.ctl.steer,
    });
    g.hiss.gain.gain.setTargetAtTime(v, g.ctx.currentTime, 0.18);
  }

  /** One soft tone: in over `attack`, out over the rest, through a low-pass so it stays round. */
  private tone(n: Tone, type: OscillatorType, cutoff: number, attack = 0.02, at = 0) {
    const g = this.g;
    if (!g) return;
    const t = g.ctx.currentTime + at;
    const osc = g.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = n.freq;
    const lp = g.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const amp = g.ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(n.gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(n.dur, attack + 0.02));
    osc.connect(lp).connect(amp).connect(g.ui);
    osc.start(t);
    osc.stop(t + n.dur + 0.05);
  }

  private notes(ns: Note[]) {
    for (const n of ns) this.tone(n, 'triangle', 1600, 0.03, n.at);
  }
}

function build(ctx: AudioContext): Graph {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 18;
  comp.ratio.value = 4;
  comp.attack.value = 0.006;
  comp.release.value = 0.3;
  const master = ctx.createGain();
  master.gain.value = 0;
  comp.connect(master).connect(ctx.destination);
  const drive = ctx.createGain();
  drive.gain.value = 0;
  drive.connect(comp);
  const ui = ctx.createGain();
  ui.gain.value = 1;
  ui.connect(comp);

  // Two seconds of soft noise, looped, for the wind, the hiss and the whooshes.
  const len = Math.floor(ctx.sampleRate * 2);
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // A gently low-passed white noise: warmer than raw white.
    last = 0.85 * last + 0.15 * (Math.random() * 2 - 1);
    data[i] = last * 3;
  }

  // The engine: two saws a hair apart (warmth), a triangle an octave down (body), a quiet sine on
  // the fifth (colour), all through a low-pass that opens with the revs.
  const eFilter = ctx.createBiquadFilter();
  eFilter.type = 'lowpass';
  eFilter.Q.value = 0.7;
  eFilter.frequency.value = 400;
  const eGain = ctx.createGain();
  eGain.gain.value = 0;
  eFilter.connect(eGain).connect(drive);
  const layers: [OscillatorType, number, number][] = [
    ['sawtooth', 4, 0.5],
    ['sawtooth', -6, 0.5],
    ['triangle', 0, 0.8],
    ['sine', 0, 0.18],
  ];
  const oscs = layers.map(([type, detune, level]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = 46;
    o.detune.value = detune;
    const lv = ctx.createGain();
    lv.gain.value = level;
    o.connect(lv).connect(eFilter);
    o.start();
    return o;
  });

  const loop = () => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.start();
    return s;
  };
  const wFilter = ctx.createBiquadFilter();
  wFilter.type = 'lowpass';
  wFilter.frequency.value = 350;
  const wGain = ctx.createGain();
  wGain.gain.value = 0;
  loop().connect(wFilter).connect(wGain).connect(drive);

  const hBand = ctx.createBiquadFilter();
  hBand.type = 'bandpass';
  hBand.frequency.value = 3200;
  hBand.Q.value = 0.8;
  const hGain = ctx.createGain();
  hGain.gain.value = 0;
  loop().connect(hBand).connect(hGain).connect(drive);

  return {
    ctx,
    master,
    drive,
    ui,
    noise,
    engine: { oscs, filter: eFilter, gain: eGain },
    wind: { filter: wFilter, gain: wGain },
    hiss: { gain: hGain },
  };
}

/** The game's one player, shared by the shell and its menus. */
export const driveSound = new DriveSound();
