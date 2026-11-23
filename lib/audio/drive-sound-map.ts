/*
 * Drive's sound, the pure part (docs/specs/drive-game.md, "Sound"): how speed, gear and revs become
 * the engine's pitch and loudness, how the wind rises, when the tyres hiss, the countdown's tones,
 * the finish flourish, and the remembered mute and volume. No Web Audio here, so it is all tested;
 * lib/audio/drive-sound.ts plays what these say.
 *
 * The mellow rule: every level is small and capped, so nothing spikes; the player smooths each
 * change over a tenth of a second or more.
 */

export type VehicleKind = 'car' | 'ship';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The top of the speed scale the sounds read (km/h); faster holds the top. */
export const TOP_KMH = 360;

export interface EngineTone {
  /** The fundamental (Hz); the player layers an octave below and a soft fifth above. */
  freq: number;
  /** 0..ENGINE_MAX. */
  gain: number;
  /** The low-pass cutoff (Hz): opens with the revs, so it brightens as it pulls, never rasps. */
  cutoff: number;
}

export const ENGINE_MAX = 0.22;

/**
 * The engine: low and round at idle, rising through each gear with the revs and dropping a little
 * at each change, a touch higher every gear. The ship hums a fifth higher and softer.
 */
export function engineTone(
  speed: number,
  gear = 1,
  revs = 0,
  kind: VehicleKind = 'car',
): EngineTone {
  const g = clamp(Math.round(gear), 1, 8);
  const r = clamp(revs, 0, 1);
  const s = clamp(speed / TOP_KMH, 0, 1);
  const base = kind === 'ship' ? 72 : 46;
  const freq = base * (1 + 0.07 * (g - 1)) * (1 + 0.9 * r);
  const gain = (kind === 'ship' ? 0.75 : 1) * ENGINE_MAX * (0.45 + 0.35 * r + 0.2 * s);
  const cutoff = 380 + 1500 * r + 600 * s;
  return { freq, gain: Math.min(ENGINE_MAX, gain), cutoff };
}

export const WIND_MAX = 0.16;

/** The wind and road rush: silent in town, rising from 40 km/h, opening up as it goes. */
export function windOf(speed: number): { gain: number; cutoff: number } {
  const t = smooth(40, TOP_KMH, speed);
  return { gain: WIND_MAX * t, cutoff: 350 + 2600 * t };
}

export const HISS_MAX = 0.07;

/**
 * The tyres' hiss: a drift combo held (the Salt Flat's gates), or the handbrake held while turning
 * at speed. A gentle hiss, louder with the combo and the speed, never more than HISS_MAX.
 */
export function hissOf(o: {
  speed: number;
  combo?: number | null;
  handbrake?: boolean;
  steer?: number;
}): number {
  const turning = !!o.handbrake && Math.abs(o.steer ?? 0) > 0.25;
  if (o.combo == null && !turning) return 0;
  if (o.speed < 30) return 0;
  const lift = o.combo != null ? clamp((o.combo - 1) / 3, 0, 1) : 0;
  return HISS_MAX * (0.55 + 0.25 * smooth(30, 200, o.speed) + 0.2 * lift);
}

/** A boost used: true when the level rises (none to boost, boost to double). */
export function boostStarted(prev: number, next: number): boolean {
  return next > prev;
}

export interface Tone {
  freq: number;
  /** Seconds. */
  dur: number;
  gain: number;
}

/** The countdown's low tone (G3) and the higher GO (an octave above). */
export const COUNT_TONE: Tone = { freq: 196, dur: 0.32, gain: 0.16 };
export const GO_TONE: Tone = { freq: 392, dur: 0.7, gain: 0.17 };

export interface IntroLights {
  lit: number;
  go: boolean;
}

/**
 * The intro's lights as they change: a low tone for each red lamp that comes on, the higher GO when
 * they turn. Nothing for a lamp going off, the same state again, or a skip back to the start.
 */
export function countdownTone(prev: IntroLights | null, next: IntroLights | null): Tone | null {
  if (!next) return null;
  if (next.go) return prev?.go ? null : GO_TONE;
  if (next.lit > 0 && next.lit > (prev?.lit ?? 0)) return COUNT_TONE;
  return null;
}

export interface Note {
  /** Seconds after it starts. */
  at: number;
  freq: number;
  dur: number;
  gain: number;
}

/**
 * The finish: a short rising arpeggio (C E G C) for a race run, a little brighter with a win or a
 * record; a soft falling pair when the race ended in the void.
 */
export function finishFlourish(r: {
  place?: number | null;
  record?: boolean;
  wrecked?: boolean;
}): Note[] {
  if (r.wrecked)
    return [
      { at: 0, freq: 220, dur: 0.5, gain: 0.12 },
      { at: 0.32, freq: 164.8, dur: 0.9, gain: 0.11 },
    ];
  const notes = [261.6, 329.6, 392, 523.3].map((freq, i) => ({
    at: i * 0.11,
    freq,
    dur: i === 3 ? 1.1 : 0.4,
    gain: 0.11,
  }));
  if (r.place === 1 || r.record) notes.push({ at: 0.55, freq: 659.3, dur: 1.2, gain: 0.08 });
  return notes;
}

/** The menu's sounds: a soft low tick for a move, a warm swell for a choice. */
export const TICK: Tone = { freq: 330, dur: 0.06, gain: 0.05 };
export const SWELL: Tone = { freq: 220, dur: 0.55, gain: 0.08 };

/* ── Mute and volume, remembered on the device ───────────────── */

export const SOUND_KEY = 'drive.sound';

export interface SoundPrefs {
  muted: boolean;
  /** The master volume, 0..1. */
  volume: number;
}

export const DEFAULT_PREFS: SoundPrefs = { muted: false, volume: 0.7 };

interface PrefStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

/** The remembered mute and volume; the defaults when there are none or they are broken. */
export function loadSoundPrefs(store: PrefStore | null): SoundPrefs {
  try {
    const raw = store?.getItem(SOUND_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw) as Partial<SoundPrefs>;
    return {
      muted: typeof p.muted === 'boolean' ? p.muted : DEFAULT_PREFS.muted,
      volume:
        typeof p.volume === 'number' && Number.isFinite(p.volume)
          ? clamp(p.volume, 0, 1)
          : DEFAULT_PREFS.volume,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveSoundPrefs(store: PrefStore | null, p: SoundPrefs): void {
  try {
    store?.setItem(SOUND_KEY, JSON.stringify({ muted: p.muted, volume: clamp(p.volume, 0, 1) }));
  } catch {
    // Storage may be blocked: the choice then lasts the visit.
  }
}

/** The master gain for the prefs: the volume squared (it feels even), and silence when muted. */
export function masterGain(p: SoundPrefs): number {
  return p.muted ? 0 : 0.8 * clamp(p.volume, 0, 1) ** 2;
}
