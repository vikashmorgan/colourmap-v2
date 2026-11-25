/**
 * Drive, Mars: its own few sounds (docs/specs/drive-game.md, world 8), apart from the game's
 * general sound: the radio (a soft squelch as a line opens, a band of static under the voice while
 * it speaks, a squelch as it closes), the Geiger counter's clicks and the shot's soft bang. Very
 * quiet. The audio context is made only after a
 * key or a touch (browsers ask for that), and everything fails silently where audio is missing.
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** Called from a key or a touch: makes (or wakes) the audio context. */
export function unlockMarsAudio(): void {
  try {
    if (!ctx) {
      const AC =
        typeof window !== 'undefined'
          ? (window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
          : undefined;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise) return noise;
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noise = b;
  return b;
}

/** The radio's static for a line of `seconds`, quietly. */
export function radioCrackle(seconds: number, volume = 0.02): void {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  try {
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1700;
    band.Q.value = 0.9;
    const g = c.createGain();
    const end = now + seconds + 0.25;
    // A squelch in, the static under the voice, a squelch out.
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume * 1.6, now + 0.04);
    g.gain.linearRampToValueAtTime(volume * 0.5, now + 0.18);
    g.gain.setValueAtTime(volume * 0.5, end - 0.2);
    g.gain.linearRampToValueAtTime(volume * 1.4, end - 0.12);
    g.gain.linearRampToValueAtTime(0, end);
    src.connect(band).connect(g).connect(c.destination);
    src.start(now);
    src.stop(end + 0.05);
  } catch {
    // No sound, no harm.
  }
}

/** One Geiger click: a very short, soft tick of filtered noise. */
function click(c: AudioContext, at: number, volume: number) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2400;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(volume, at + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.012);
  src.connect(hp).connect(g).connect(c.destination);
  src.start(at, Math.random() * 1.5);
  src.stop(at + 0.02);
}

let geigerTimer: ReturnType<typeof setInterval> | null = null;
let geigerRateNow = 0;

/** The Geiger counter's clicks, `rate` a second (at random, as real ones are); 0 stops them. */
export function setGeiger(rate: number, volume = 0.05): void {
  geigerRateNow = rate;
  if (rate <= 0) {
    if (geigerTimer) clearInterval(geigerTimer);
    geigerTimer = null;
    return;
  }
  if (geigerTimer) return;
  // Every tenth of a second, the clicks for the next tenth, laid out at random.
  geigerTimer = setInterval(() => {
    const c = ctx;
    if (!c || c.state !== 'running') return;
    try {
      const now = c.currentTime;
      let at = 0;
      for (;;) {
        at += -Math.log(1 - Math.random()) / Math.max(0.01, geigerRateNow);
        if (at >= 0.1) break;
        click(c, now + 0.02 + at, volume);
      }
    } catch {
      // No sound, no harm.
    }
  }, 100);
}

/** A soft synthesized bang (the yellow shot's burst): a thump of low noise and a falling tone. */
export function softBang(volume = 0.09): void {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  try {
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, now);
    lp.frequency.exponentialRampToValueAtTime(120, now + 0.7);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    src.connect(lp).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + 1);
    const o = c.createOscillator();
    o.frequency.setValueAtTime(110, now);
    o.frequency.exponentialRampToValueAtTime(38, now + 0.5);
    const og = c.createGain();
    og.gain.setValueAtTime(volume * 0.8, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    o.connect(og).connect(c.destination);
    o.start(now);
    o.stop(now + 0.6);
  } catch {
    // No sound, no harm.
  }
}

/** The superboost (a portal flown through): a rush of filtered air rising and a low swell under
 * it, about two seconds, quiet. */
export function superWhoosh(volume = 0.08): void {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  try {
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(300, now);
    band.frequency.exponentialRampToValueAtTime(2600, now + 0.9);
    band.frequency.exponentialRampToValueAtTime(900, now + 2.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
    src.connect(band).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + 2.4);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(55, now);
    o.frequency.exponentialRampToValueAtTime(140, now + 1.2);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const og = c.createGain();
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(volume * 0.5, now + 0.2);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    o.connect(lp).connect(og).connect(c.destination);
    o.start(now);
    o.stop(now + 1.9);
  } catch {
    // No sound, no harm.
  }
}

/** An enemy blown up: a deep boom (a long low-passed burst of noise and a falling sub tone), its
 * size (1 a robot, 2.5 a spider) making it longer and deeper. */
export function boom(size = 1, volume = 0.11): void {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  try {
    const now = c.currentTime;
    const len = 0.9 + 0.5 * size;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200 / Math.sqrt(size), now);
    lp.frequency.exponentialRampToValueAtTime(70, now + len);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    src.connect(lp).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + len + 0.05);
    const o = c.createOscillator();
    o.frequency.setValueAtTime(90 / Math.sqrt(size), now);
    o.frequency.exponentialRampToValueAtTime(24, now + len * 0.8);
    const og = c.createGain();
    og.gain.setValueAtTime(volume, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + len * 0.85);
    o.connect(og).connect(c.destination);
    o.start(now);
    o.stop(now + len);
  } catch {
    // No sound, no harm.
  }
}

/** Through a ghost: a cold breath, high airy noise falling away, and a faint glassy tone. */
export function coldBreath(volume = 0.05): void {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  try {
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = 'bandpass';
    hp.Q.value = 3;
    hp.frequency.setValueAtTime(5200, now);
    hp.frequency.exponentialRampToValueAtTime(1800, now + 1.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    src.connect(hp).connect(g).connect(c.destination);
    src.start(now);
    src.stop(now + 1.4);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1320, now);
    o.frequency.exponentialRampToValueAtTime(880, now + 1.1);
    const og = c.createGain();
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    o.connect(og).connect(c.destination);
    o.start(now);
    o.stop(now + 1.25);
  } catch {
    // No sound, no harm.
  }
}
