// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getLoop } from '@/lib/chill/beat-loops';
import { type ChillBeatSettings, DEFAULT_BEATS } from '@/lib/chill/beats-settings';
import { getTransport, resetTransport, startTransport } from '@/lib/chill/transport';

import ChillBeats from './ChillBeats';

const engine = {
  setPattern: vi.fn(),
  setVolume: vi.fn(),
  setLowCut: vi.fn(),
  setMuteKick: vi.fn(),
  setFill: vi.fn(),
  setRootFreq: vi.fn(),
  setScale: vi.fn(),
  setRowMix: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  isRunning: vi.fn(() => false),
  dispose: vi.fn(),
};

vi.mock('@/lib/chill/beat-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chill/beat-engine')>();
  return { ...actual, createBeatEngine: vi.fn(() => engine) };
});

const PALETTE = ['#D4805A', '#C44E2A', '#88C878', '#5A8AAA', '#9B6BA0', '#3A2A1E'];

let latest: ChillBeatSettings = DEFAULT_BEATS;

function Harness({
  ready = true,
  initial = DEFAULT_BEATS,
}: {
  ready?: boolean;
  initial?: ChillBeatSettings;
}) {
  const [value, setValue] = useState(initial);
  const [ctx] = useState(() => (ready ? ({ currentTime: 0 } as unknown as AudioContext) : null));
  const [output] = useState(() => (ready ? ({} as AudioNode) : null));
  return (
    <ChillBeats
      ctx={ctx}
      output={output}
      palette={PALETTE}
      rootFreq={110}
      scale={[0, 3, 5, 7, 10]}
      value={value}
      onChange={(next) => {
        latest = next;
        setValue(next);
      }}
    />
  );
}

beforeEach(() => {
  resetTransport();
  latest = DEFAULT_BEATS;
  for (const fn of Object.values(engine)) fn.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('ChillBeats', () => {
  it('disables Play until the Chill Machine has started', () => {
    render(<Harness ready={false} />);
    const play = screen.getByRole('button', { name: 'Play beat' });
    expect((play as HTMLButtonElement).disabled).toBe(true);
    expect(play.getAttribute('title')).toBe('Start the Chill Machine first');
    // The rest still renders.
    expect(screen.getByRole('button', { name: /Tropical/ })).toBeDefined();
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeDefined();
  });

  it('plays and stops the engine', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Play beat' }));
    expect(latest.on).toBe(true);
    expect(engine.start).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop beat' }));
    expect(engine.stop).toHaveBeenCalled();
  });

  it('selects a loop and takes its tempo and swing', () => {
    render(<Harness />);
    const card = screen.getByRole('button', { name: /Tropical/ });
    expect(card.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(card);
    expect(latest.loopId).toBe('tropical');
    expect(screen.getByRole('button', { name: /Tropical/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(getTransport().bpm).toBe(110);
    expect(getTransport().swing).toBe(getLoop('tropical').swing);
    expect(engine.setPattern).toHaveBeenLastCalledWith(
      getLoop('tropical').pattern,
      getLoop('tropical').kit,
    );
  });

  it('sets bpm and swing from the top row', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('slider', { name: 'BPM' }), { target: { value: '128' } });
    expect(getTransport().bpm).toBe(128);
    fireEvent.change(screen.getByRole('slider', { name: 'Swing' }), { target: { value: '30' } });
    expect(getTransport().swing).toBe(0.3);
    expect(screen.getByText('30%')).toBeDefined();
  });

  it('taps a tempo', () => {
    const now = vi.spyOn(performance, 'now');
    render(<Harness />);
    const tap = screen.getByRole('button', { name: 'Tap' });
    for (const t of [1000, 1500, 2000]) {
      now.mockReturnValue(t);
      fireEvent.click(tap);
    }
    expect(getTransport().bpm).toBe(120);
    now.mockRestore();
  });

  it('drives the four performance controls', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '40' } });
    expect(latest.volume).toBe(0.4);
    fireEvent.change(screen.getByRole('slider', { name: 'Fill' }), { target: { value: '90' } });
    expect(latest.fill).toBe(0.9);
    fireEvent.change(screen.getByRole('slider', { name: 'Low cut' }), { target: { value: '20' } });
    expect(latest.lowCut).toBe(0.2);
    const mute = screen.getByRole('button', { name: 'Mute kick' });
    fireEvent.click(mute);
    expect(latest.muteKick).toBe(true);
    expect(screen.getByRole('button', { name: 'Mute kick' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(engine.setMuteKick).toHaveBeenLastCalledWith(true);
  });

  it('customises the loop: toggle, accent, bass note, bars, mix and reset', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Customise' }));
    expect(latest.mode).toBe('custom');

    // Melodic has a kick on step 1 and none on step 2.
    const step2 = screen.getByRole('button', { name: 'Kick step 2' });
    expect(step2.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(step2);
    expect(latest.custom?.steps.kick[1]).toBe(0.7);
    expect(screen.getByRole('button', { name: 'Kick step 2' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kick step 2' }), { shiftKey: true });
    expect(latest.custom?.steps.kick[1]).toBe(1);
    expect(screen.getByRole('button', { name: 'Kick step 2 accent' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Kick step 1 accent' }));
    expect(latest.custom?.steps.kick[0]).toBe(0);

    // A new bass step gets a note, and the picker sets it.
    fireEvent.click(screen.getByRole('button', { name: 'Bass step 1' }));
    expect(latest.custom?.bassNotes[0]).toBe(0);
    fireEvent.change(screen.getByRole('combobox', { name: 'Bass note step 1' }), {
      target: { value: '7' },
    });
    expect(latest.custom?.bassNotes[0]).toBe(7);

    fireEvent.click(screen.getByRole('button', { name: 'Solo bass row' }));
    expect(latest.rowMix.bass.solo).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Mute clap row' }));
    expect(latest.rowMix.clap.mute).toBe(true);
    fireEvent.change(screen.getByRole('slider', { name: 'Perc volume' }), {
      target: { value: '50' },
    });
    expect(latest.rowMix.perc.volume).toBe(0.5);

    fireEvent.click(screen.getByRole('button', { name: '2 bars' }));
    expect(latest.custom?.bars).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Show bar 2' }));
    expect(screen.getByRole('button', { name: 'Kick step 17' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Reset to loop' }));
    expect(latest.custom).toEqual(getLoop('melodic').pattern);
    expect(screen.getByRole('button', { name: 'Kick step 1 accent' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Back to loops' }));
    expect(latest.mode).toBe('simple');
  });

  it('long-press sets an accent without toggling', () => {
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Customise' }));
    const step = screen.getByRole('button', { name: 'Clap step 1' });
    fireEvent.pointerDown(step);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(step);
    fireEvent.click(step);
    expect(latest.custom?.steps.clap[0]).toBe(1);
    vi.useRealTimers();
  });

  it('highlights the current step while playing', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frame = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    startTransport(0);
    render(
      <Harness
        initial={{ ...DEFAULT_BEATS, on: true, mode: 'custom', custom: getLoop('melodic').pattern }}
      />,
    );
    // ctx time 0 at 120 bpm from bar 0 → step 1 is current.
    act(() => {
      frame?.(0);
    });
    expect(screen.getByRole('button', { name: 'Kick step 1 accent' }).dataset.current).toBe('true');
    vi.restoreAllMocks();
  });
});
