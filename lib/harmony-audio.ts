/**
 * Harmony Machine sound engine (Web Audio, no samples).
 * Two moods share one mixer: chill (bells, binaural drone, wind, birds) and piano (soft piano, very soft pads).
 * `mood` blends between them: 0 is chill, 1 is piano.
 */
import { mtof } from './harmony-machine';

type Voice = { oscs: OscillatorNode[]; gains: GainNode[] };

function impulse(ctx: BaseAudioContext, secs: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * secs);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return b;
}

export class HarmonyAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private chillBus: GainNode;
  private pianoBus: GainNode;
  private padChill: GainNode;
  private padPiano: GainNode;
  private padFilter: BiquadFilterNode;
  private bl: OscillatorNode;
  private br: OscillatorNode;
  private voices: Voice[] = [];
  mood = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    const t = ctx.currentTime;
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0, t);
    this.master.gain.linearRampToValueAtTime(0.85, t + 3);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 5, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    reverb.connect(wet).connect(this.master);

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.43;
    const fb = ctx.createGain();
    fb.gain.value = 0.33;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2000;
    delay.connect(dlp).connect(fb).connect(delay);
    dlp.connect(reverb);

    const bus = (dry: number, rev: number, dly = 0) => {
      const g = ctx.createGain();
      const d = ctx.createGain();
      d.gain.value = dry;
      g.connect(d).connect(this.master);
      const r = ctx.createGain();
      r.gain.value = rev;
      g.connect(r).connect(reverb);
      if (dly) {
        const q = ctx.createGain();
        q.gain.value = dly;
        g.connect(q).connect(delay);
      }
      return g;
    };
    this.chillBus = bus(0.7, 0.9, 0.15);
    this.pianoBus = bus(0.8, 0.6, 0.35);
    this.padChill = bus(0.8, 0.5);
    const padPianoOut = bus(0.7, 0.7);
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padPiano = ctx.createGain();
    this.padPiano.connect(this.padFilter).connect(padPianoOut);

    // Binaural drone: a 6 Hz beat between the ears.
    const merger = ctx.createChannelMerger(2);
    const binG = ctx.createGain();
    binG.gain.value = 0.05;
    this.bl = ctx.createOscillator();
    this.br = ctx.createOscillator();
    this.bl.frequency.value = 110;
    this.br.frequency.value = 116;
    this.bl.connect(merger, 0, 0);
    this.br.connect(merger, 0, 1);
    merger.connect(binG).connect(this.chillBus);
    this.bl.start();
    this.br.start();

    // Wind and far sea: brown noise through a slowly breathing filter.
    const nb = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nd.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      nd[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 520;
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoG.gain.value = 330;
    lfo.connect(lfoG).connect(nf.frequency);
    lfo.start();
    const ng = ctx.createGain();
    ng.gain.value = 0.22;
    noise.connect(nf).connect(ng).connect(this.chillBus);
    noise.start();
  }

  get now() {
    return this.ctx.currentTime;
  }

  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private pan(v: number) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = v;
    return p;
  }

  /** Follow the controls: mood (0 chill, 1 piano) and colour (0 dusk, 1 dawn). */
  update(mood: number, colour: number) {
    this.mood = mood;
    const t = this.now;
    this.chillBus.gain.setTargetAtTime(1 - mood, t, 0.1);
    this.padChill.gain.setTargetAtTime((1 - mood) * 0.9, t, 0.1);
    this.pianoBus.gain.setTargetAtTime(mood, t, 0.1);
    this.padPiano.gain.setTargetAtTime(mood * 0.8, t, 0.1);
    this.padFilter.frequency.setTargetAtTime(350 + colour * 1900, t, 0.2);
  }

  /** One light passing the needle: a bell in chill, a soft piano note in piano, blended by mood. */
  note(midi: number, vel: number, pan: number) {
    const f = mtof(midi);
    if (this.mood < 0.98) this.bell(f, vel * (1 - this.mood) * 1.4, pan);
    if (this.mood > 0.02) this.piano(f, vel * this.mood * 1.6, pan);
  }

  bell(f: number, vel: number, p: number) {
    const t = this.now;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.frequency.value = f;
    o2.frequency.value = f * 2.76;
    const pn = this.pan(p);
    o1.connect(this.env(t, vel, 0.004, 3.6)).connect(pn);
    o2.connect(this.env(t, vel * 0.22, 0.003, 1.1)).connect(pn);
    pn.connect(this.chillBus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 4);
    o2.stop(t + 1.3);
  }

  piano(f: number, vel: number, p: number) {
    const t = this.now;
    const len = 2.2 + Math.max(0, (400 - f) / 160);
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const o3 = this.ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = f;
    o2.frequency.value = f * 2.001;
    o3.frequency.value = f * 0.999;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(5200, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), t + 1.2);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.18;
    o1.connect(lp);
    o3.connect(lp);
    o2.connect(g2).connect(lp);
    lp.connect(this.env(t, vel, 0.006, len))
      .connect(this.pan(p * 0.6))
      .connect(this.pianoBus);
    for (const o of [o1, o2, o3]) {
      o.start(t);
      o.stop(t + len + 0.2);
    }
  }

  chirp() {
    const t = this.now;
    const p = this.pan(Math.random() * 1.6 - 0.8);
    const base = 2600 + Math.random() * 1800;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.09 + Math.random() * 0.06);
      const o = this.ctx.createOscillator();
      const f = base * (1 + (Math.random() - 0.5) * 0.25);
      o.frequency.setValueAtTime(f, s);
      o.frequency.exponentialRampToValueAtTime(f * (1.25 + Math.random() * 0.4), s + 0.04);
      o.frequency.exponentialRampToValueAtTime(f * 0.85, s + 0.08);
      o.connect(this.env(s, 0.025, 0.01, 0.08)).connect(p);
      o.start(s);
      o.stop(s + 0.12);
    }
    p.connect(this.chillBus);
  }

  /** Crossfade the pads to a new chord over a few seconds; the binaural carrier follows the root. */
  chord(notes: number[]) {
    const t = this.now;
    for (const v of this.voices) {
      for (const g of v.gains) {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
        g.gain.linearRampToValueAtTime(0, t + 5);
      }
      for (const o of v.oscs) o.stop(t + 5.3);
    }
    this.voices = notes.map((m, i) => {
      const f = mtof(m);
      const lvl = i === 0 ? 0.05 : 0.028;
      const gc = this.ctx.createGain();
      const gp = this.ctx.createGain();
      for (const g of [gc, gp]) {
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(lvl, t + 4);
      }
      const osc = (type: OscillatorType, freq: number, to: GainNode) => {
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.connect(to);
        o.start(t);
        return o;
      };
      gc.connect(this.padChill);
      gp.connect(this.padPiano);
      const oscs = [
        osc('sine', f, gc),
        osc('triangle', f * 1.003, gc),
        osc('sawtooth', f * 0.996, gp),
        osc('sawtooth', f * 1.004, gp),
      ];
      return { oscs, gains: [gc, gp] };
    });
    const root = mtof((notes[0] % 12) + 36) * 2;
    this.bl.frequency.setTargetAtTime(root, t, 2);
    this.br.frequency.setTargetAtTime(root + 6, t, 2);
    if (this.mood > 0.35) this.piano(mtof(notes[0]), 0.16 * this.mood, 0);
  }

  close() {
    void this.ctx.close();
  }
}
