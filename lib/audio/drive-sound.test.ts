import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DriveSound } from './drive-sound';
import { FakeAudioContext } from './fake-audio-context';

const w = window as unknown as { AudioContext?: unknown };

describe('DriveSound', () => {
  let s: DriveSound;
  beforeEach(() => {
    FakeAudioContext.made = [];
    w.AudioContext = FakeAudioContext;
    s = new DriveSound();
  });
  afterEach(() => {
    s.close();
    delete w.AudioContext;
  });

  it('makes nothing before a gesture: every call is a quiet no-op', () => {
    s.hud({ speed: 200, gear: 4, revs: 0.5 });
    s.controls({ boost: 1 });
    s.intro({ lit: 1, go: false });
    s.finish({ place: 1 });
    s.whoosh();
    s.suspend();
    expect(s.ready).toBe(false);
    expect(FakeAudioContext.made).toHaveLength(0);
  });

  it('builds once on unlock, behind a compressor, and a menu tick unlocks too', () => {
    s.tick();
    expect(s.ready).toBe(true);
    s.unlock();
    expect(FakeAudioContext.made).toHaveLength(1);
    const ctx = FakeAudioContext.made[0];
    const comp = ctx.nodes.find((n) => n.kind === 'compressor');
    expect(comp?.ratio.value).toBeGreaterThan(1);
    expect(comp?.outs[0]).toBeDefined();
  });

  it('does nothing without Web Audio', () => {
    delete w.AudioContext;
    s.unlock();
    s.swell();
    expect(s.ready).toBe(false);
  });

  it('sets the master from the prefs: silent when muted', () => {
    s.unlock();
    const ctx = FakeAudioContext.made[0];
    const master = ctx.nodes.find((n) => n.kind === 'compressor')?.outs[0] as {
      gain: { value: number };
    };
    s.setPrefs({ muted: false, volume: 1 });
    expect(master.gain.value).toBeGreaterThan(0);
    s.setPrefs({ muted: true, volume: 1 });
    expect(master.gain.value).toBe(0);
  });

  it('plays a countdown tone per lamp and a GO, each a new oscillator', () => {
    s.unlock();
    const ctx = FakeAudioContext.made[0];
    const before = ctx.oscs().length;
    s.intro({ lit: 0, go: false });
    s.intro({ lit: 1, go: false });
    s.intro({ lit: 2, go: false });
    s.intro({ lit: 3, go: false });
    s.intro({ lit: 0, go: true });
    s.intro(null);
    const tones = ctx.oscs().slice(before);
    expect(tones).toHaveLength(4);
    expect(tones[3].frequency.value).toBeGreaterThan(tones[0].frequency.value);
  });

  it('whooshes when a boost starts only while driving', () => {
    s.unlock();
    const ctx = FakeAudioContext.made[0];
    const sources = () => ctx.nodes.filter((n) => n.kind === 'source').length;
    const base = sources();
    s.controls({ boost: 1 });
    expect(sources()).toBe(base);
    s.controls({ boost: 0 });
    s.setDriving(true);
    s.controls({ boost: 1 });
    s.controls({ boost: 1 });
    expect(sources()).toBe(base + 1);
    s.controls({ boost: 2 });
    expect(sources()).toBe(base + 2);
  });

  it('glides the engine and wind with the HUD, and the hiss with the handbrake', () => {
    s.unlock();
    s.setDriving(true);
    s.setVehicle('ship');
    const ctx = FakeAudioContext.made[0];
    s.hud({ speed: 250, gear: 5, revs: 0.8 });
    const engineOsc = ctx.oscs()[0];
    expect(engineOsc.frequency.calls.at(-1)?.[0]).toBe('target');
    expect(engineOsc.frequency.value).toBeGreaterThan(72);
    const gains = ctx.nodes.filter((n) => n.kind === 'gain');
    const hiss = gains.at(-1);
    expect(hiss?.gain.value).toBe(0);
    s.controls({ boost: 0, handbrake: true, steer: 1 });
    expect(hiss?.gain.value).toBeGreaterThan(0);
  });

  it('plays the finish flourish and sleeps and wakes', () => {
    s.unlock();
    const ctx = FakeAudioContext.made[0];
    const before = ctx.oscs().length;
    s.finish({ place: 2 });
    expect(ctx.oscs().length).toBe(before + 4);
    s.suspend();
    expect(ctx.state).toBe('suspended');
    s.unlock();
    expect(ctx.state).toBe('running');
  });
});
