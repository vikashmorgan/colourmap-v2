import { describe, expect, it } from 'vitest';

import {
  boostStarted,
  COUNT_TONE,
  countdownTone,
  DEFAULT_PREFS,
  ENGINE_MAX,
  engineTone,
  finishFlourish,
  GO_TONE,
  HISS_MAX,
  hissOf,
  loadSoundPrefs,
  masterGain,
  SOUND_KEY,
  saveSoundPrefs,
  WIND_MAX,
  windOf,
} from './drive-sound-map';

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    m,
  };
}

describe('engineTone', () => {
  it('rises with the revs inside a gear and sits a little higher each gear', () => {
    const idle = engineTone(0, 1, 0);
    const pulled = engineTone(80, 1, 1);
    expect(pulled.freq).toBeGreaterThan(idle.freq * 1.8);
    expect(engineTone(150, 3, 0.3).freq).toBeGreaterThan(engineTone(120, 2, 0.3).freq);
  });

  it('drops back at a gear change (revs fall), so the box is heard', () => {
    const top2 = engineTone(110, 2, 0.95);
    const low3 = engineTone(112, 3, 0.1);
    expect(low3.freq).toBeLessThan(top2.freq);
  });

  it('stays low and warm: never above the cap, the cutoff opens with the revs', () => {
    for (const s of [0, 100, 300, 9999])
      for (const r of [0, 0.5, 1, 4]) {
        const t = engineTone(s, 7, r);
        expect(t.gain).toBeLessThanOrEqual(ENGINE_MAX);
        expect(t.gain).toBeGreaterThan(0);
        expect(t.freq).toBeLessThan(200);
      }
    expect(engineTone(100, 3, 1).cutoff).toBeGreaterThan(engineTone(100, 3, 0).cutoff);
  });

  it('hums higher and softer for the ship', () => {
    const car = engineTone(100, 3, 0.5, 'car');
    const ship = engineTone(100, 3, 0.5, 'ship');
    expect(ship.freq).toBeGreaterThan(car.freq);
    expect(ship.gain).toBeLessThan(car.gain);
  });

  it('copes with a missing gear and odd values', () => {
    expect(engineTone(0).freq).toBe(46);
    expect(engineTone(-10, 0, -1).freq).toBe(46);
  });
});

describe('windOf', () => {
  it('is silent slow and rises smoothly to its cap', () => {
    expect(windOf(0).gain).toBe(0);
    expect(windOf(40).gain).toBe(0);
    const a = windOf(120).gain;
    const b = windOf(250).gain;
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(windOf(1000).gain).toBeCloseTo(WIND_MAX);
    expect(windOf(250).cutoff).toBeGreaterThan(windOf(100).cutoff);
  });
});

describe('hissOf', () => {
  it('hisses with a drift combo or the handbrake turned at speed, else nothing', () => {
    expect(hissOf({ speed: 120 })).toBe(0);
    expect(hissOf({ speed: 120, handbrake: true, steer: 0 })).toBe(0);
    expect(hissOf({ speed: 120, handbrake: true, steer: 0.8 })).toBeGreaterThan(0);
    expect(hissOf({ speed: 120, combo: 1.4 })).toBeGreaterThan(0);
    expect(hissOf({ speed: 10, combo: 3 })).toBe(0);
  });

  it('grows with the combo but never past its cap', () => {
    expect(hissOf({ speed: 150, combo: 4 })).toBeGreaterThan(hissOf({ speed: 150, combo: 1 }));
    expect(hissOf({ speed: 9999, combo: 99 })).toBeLessThanOrEqual(HISS_MAX);
  });
});

describe('boostStarted', () => {
  it('fires when the boost level rises, not while held or let go', () => {
    expect(boostStarted(0, 1)).toBe(true);
    expect(boostStarted(1, 2)).toBe(true);
    expect(boostStarted(1, 1)).toBe(false);
    expect(boostStarted(2, 0)).toBe(false);
  });
});

describe('countdownTone', () => {
  it('plays three low tones and a higher GO through the lights', () => {
    const seq = [
      { lit: 0, go: false },
      { lit: 1, go: false },
      { lit: 2, go: false },
      { lit: 3, go: false },
      { lit: 0, go: true },
    ];
    const tones = seq.map((s, i) => countdownTone(i ? seq[i - 1] : null, s));
    expect(tones).toEqual([null, COUNT_TONE, COUNT_TONE, COUNT_TONE, GO_TONE]);
    expect(GO_TONE.freq).toBeGreaterThan(COUNT_TONE.freq);
  });

  it('is quiet for the same state, the intro ending, or a skip back', () => {
    expect(countdownTone({ lit: 2, go: false }, { lit: 2, go: false })).toBeNull();
    expect(countdownTone({ lit: 0, go: true }, { lit: 0, go: true })).toBeNull();
    expect(countdownTone({ lit: 0, go: true }, null)).toBeNull();
    expect(countdownTone({ lit: 3, go: false }, { lit: 0, go: false })).toBeNull();
  });
});

describe('finishFlourish', () => {
  it('rises for a race run, with a bright top note for a win or a record', () => {
    const plain = finishFlourish({ place: 3 });
    expect(plain.map((n) => n.freq)).toEqual([...plain.map((n) => n.freq)].sort((a, b) => a - b));
    expect(finishFlourish({ place: 1 }).length).toBe(plain.length + 1);
    expect(finishFlourish({ place: null, record: true }).length).toBe(plain.length + 1);
  });

  it('falls softly when the race ended in the void', () => {
    const w = finishFlourish({ wrecked: true });
    expect(w[1].freq).toBeLessThan(w[0].freq);
  });

  it('keeps every note quiet and in time order', () => {
    const ns = finishFlourish({ place: 1 });
    for (let i = 1; i < ns.length; i++) expect(ns[i].at).toBeGreaterThanOrEqual(ns[i - 1].at);
    for (const n of ns) expect(n.gain).toBeLessThanOrEqual(0.15);
  });
});

describe('sound prefs', () => {
  it('defaults when nothing is stored, storage is missing or broken', () => {
    expect(loadSoundPrefs(null)).toEqual(DEFAULT_PREFS);
    const s = memory();
    expect(loadSoundPrefs(s)).toEqual(DEFAULT_PREFS);
    s.setItem(SOUND_KEY, '{nope');
    expect(loadSoundPrefs(s)).toEqual(DEFAULT_PREFS);
    s.setItem(SOUND_KEY, JSON.stringify({ muted: 'yes', volume: 'loud' }));
    expect(loadSoundPrefs(s)).toEqual(DEFAULT_PREFS);
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSoundPrefs(throwing)).toEqual(DEFAULT_PREFS);
    expect(() => saveSoundPrefs(throwing, DEFAULT_PREFS)).not.toThrow();
  });

  it('remembers the mute and the volume, clamped', () => {
    const s = memory();
    saveSoundPrefs(s, { muted: true, volume: 0.4 });
    expect(loadSoundPrefs(s)).toEqual({ muted: true, volume: 0.4 });
    saveSoundPrefs(s, { muted: false, volume: 3 });
    expect(loadSoundPrefs(s)).toEqual({ muted: false, volume: 1 });
    s.setItem(SOUND_KEY, JSON.stringify({ muted: false, volume: -2 }));
    expect(loadSoundPrefs(s).volume).toBe(0);
  });

  it('silences the master when muted and eases the volume curve', () => {
    expect(masterGain({ muted: true, volume: 1 })).toBe(0);
    expect(masterGain({ muted: false, volume: 0 })).toBe(0);
    expect(masterGain({ muted: false, volume: 0.5 })).toBeLessThan(
      masterGain({ muted: false, volume: 1 }) / 2,
    );
    expect(masterGain({ muted: false, volume: 1 })).toBeLessThanOrEqual(0.8);
  });
});
