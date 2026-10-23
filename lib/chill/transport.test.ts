import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  barAt,
  barDuration,
  clampBpm,
  getTransport,
  nextBarTime,
  onTransport,
  resetTransport,
  setBpm,
  setSwing,
  startTransport,
  stepDuration,
  stopTransport,
  tapTempo,
} from './transport';

afterEach(() => resetTransport());

describe('chill transport', () => {
  it('computes bar and step lengths', () => {
    expect(barDuration(120)).toBe(2);
    expect(stepDuration(120)).toBe(0.125);
  });

  it('clamps bpm to 90–140', () => {
    expect(clampBpm(60)).toBe(90);
    expect(clampBpm(200)).toBe(140);
    expect(clampBpm(123.6)).toBe(124);
  });

  it('counts bars from the start time and finds the next bar line', () => {
    expect(barAt(5)).toBe(0);
    expect(nextBarTime(5)).toBe(5);
    startTransport(10);
    expect(barAt(13)).toBe(1.5);
    expect(nextBarTime(13)).toBe(14);
    expect(nextBarTime(14)).toBe(14);
    startTransport(99);
    expect(getTransport().startTime).toBe(10);
  });

  it('keeps position when the tempo changes', () => {
    startTransport(0);
    setBpm(90, 4); // bar 2 at 120
    expect(barAt(4)).toBeCloseTo(2);
    expect(getTransport().bpm).toBe(90);
    stopTransport();
    setBpm(130);
    expect(getTransport()).toMatchObject({ bpm: 130, playing: false, startTime: null });
  });

  it('notifies listeners and clamps swing', () => {
    const l = vi.fn();
    const off = onTransport(l);
    setSwing(2);
    expect(getTransport().swing).toBe(0.6);
    setSwing(-1);
    expect(getTransport().swing).toBe(0);
    expect(l).toHaveBeenCalledTimes(2);
    off();
  });

  it('turns taps into a tempo', () => {
    expect(tapTempo([0])).toBeNull();
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 5000, 5500])).toBe(120);
  });
});
