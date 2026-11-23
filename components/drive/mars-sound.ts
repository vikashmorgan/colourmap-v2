/**
 * Drive, Mars: its own few sounds (docs/specs/drive-game.md, world 8), apart from the game's
 * general sound. Only the radio for now: a soft squelch as a line opens, a band of static under the
 * voice while it speaks, a squelch as it closes. Very quiet. The audio context is made only after a
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
