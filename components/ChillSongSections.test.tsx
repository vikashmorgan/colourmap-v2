import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SECTIONS, type SongSection } from '@/lib/chill/sections';
import { resetTransport, startTransport, stopTransport } from '@/lib/chill/transport';

import ChillSongSections, { ChillSongPosition } from './ChillSongSections';

// Manual animation frames: each flush runs the queued callbacks once.
let frames: FrameRequestCallback[] = [];
function flush() {
  act(() => {
    const run = frames;
    frames = [];
    for (const f of run) f(0);
  });
}

let clock = 0;
const now = () => clock;

beforeEach(() => {
  frames = [];
  clock = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  resetTransport();
  vi.unstubAllGlobals();
});

const PALETTE = ['#C4A060', '#7A9A6A', '#9A6A8A'];

function Harness({
  initial = DEFAULT_SECTIONS.map((s) => ({ ...s })),
  onEnter,
  snapshot = () => ({ pads: ['rain'] }),
}: {
  initial?: SongSection[];
  onEnter?: (s: SongSection, i: number) => void;
  snapshot?: () => Record<string, unknown>;
}) {
  const [sections, setSections] = useState(initial);
  const [loop, setLoop] = useState<string | null>(null);
  return (
    <>
      <output data-testid="top">
        <ChillSongPosition sections={sections} loopSectionId={loop} now={now} />
      </output>
      <output data-testid="names">{sections.map((s) => `${s.name}:${s.bars}`).join(',')}</output>
      <ChillSongSections
        sections={sections}
        onChange={setSections}
        palette={PALETTE}
        loopSectionId={loop}
        onLoopChange={setLoop}
        getSnapshot={snapshot}
        onEnterSection={onEnter}
        now={now}
      />
    </>
  );
}

const names = () => screen.getByTestId('names').textContent;
const block = (name: RegExp) => screen.getByRole('button', { name });

describe('ChillSongSections', () => {
  it('renders one block per section with its name and bars', () => {
    render(<Harness />);
    expect(block(/^Intro, 16 bars$/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Drop, 16 bars/ })).toHaveLength(2);
    expect(screen.queryByLabelText('Section name')).toBeNull();
  });

  it('selects a block to edit it, and closes on a second tap', () => {
    render(<Harness />);
    fireEvent.click(block(/^Build,/));
    expect(block(/^Build,/).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByLabelText('Section name') as HTMLInputElement).value).toBe('Build');
    fireEvent.click(block(/^Build,/));
    expect(screen.queryByLabelText('Section name')).toBeNull();
  });

  it('renames by typing (ignoring empty names) and by quick-name chips', () => {
    render(<Harness />);
    fireEvent.click(block(/^Intro,/));
    const input = screen.getByLabelText('Section name');
    fireEvent.change(input, { target: { value: '' } });
    expect(names()).toMatch(/^Intro:16/);
    fireEvent.change(input, { target: { value: 'Dawn ' } });
    expect(names()).toMatch(/^Dawn:16/);
    fireEvent.click(screen.getByRole('button', { name: 'Breakdown' }));
    expect(names()).toMatch(/^Breakdown:16/);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe('Breakdown');
  });

  it('sets the length in bars', () => {
    render(<Harness />);
    fireEvent.click(block(/^Build,/));
    fireEvent.click(screen.getByRole('button', { name: '32' }));
    expect(names()).toContain('Build:32');
    expect(screen.getByRole('button', { name: '32' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('takes and clears a snapshot, with a dot on the block', () => {
    const snapshot = vi.fn(() => ({ beat: true }));
    render(<Harness snapshot={snapshot} />);
    fireEvent.click(block(/^Break,/));
    expect(screen.queryByTestId('snapshot-dot')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Take snapshot' }));
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('snapshot-dot')).toHaveLength(1);
    expect(block(/^Break, 8 bars, snapshot/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear snapshot' }));
    expect(screen.queryByTestId('snapshot-dot')).toBeNull();
  });

  it('toggles the loop on the selected section', () => {
    render(<Harness />);
    fireEvent.click(block(/^Outro,/));
    const loop = screen.getByRole('button', { name: 'Loop this section' });
    fireEvent.click(loop);
    expect(loop.getAttribute('aria-pressed')).toBe('true');
    expect(block(/^Outro, 8 bars, looping/)).toBeTruthy();
    fireEvent.click(loop);
    expect(loop.getAttribute('aria-pressed')).toBe('false');
  });

  it('adds a section at the end and selects it', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    expect(names()).toMatch(/Outro:8,Section:8$/);
    expect((screen.getByLabelText('Section name') as HTMLInputElement).value).toBe('Section');
  });

  it('removes a section, clears its loop, and keeps the last one', () => {
    render(<Harness initial={DEFAULT_SECTIONS.slice(0, 2).map((s) => ({ ...s }))} />);
    fireEvent.click(block(/^Build,/));
    fireEvent.click(screen.getByRole('button', { name: 'Loop this section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(names()).toBe('Intro:16');
    expect(block(/^Intro, 16 bars$/).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveProperty('disabled', true);
  });

  it('moves the selected section left and right', () => {
    render(<Harness />);
    fireEvent.click(block(/^Build,/));
    expect(screen.getByRole('button', { name: 'Move right' })).toHaveProperty('disabled', false);
    fireEvent.click(screen.getByRole('button', { name: 'Move left' }));
    expect(names()).toMatch(/^Build:8,Intro:16/);
    expect(screen.getByRole('button', { name: 'Move left' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(names()).toMatch(/^Intro:16,Build:8/);
  });

  it('follows the transport: playhead, top-bar label and section entries', () => {
    const onEnter = vi.fn();
    render(<Harness onEnter={onEnter} />);
    expect(screen.getByTestId('top').textContent).toBe('');
    expect(screen.queryByTestId('playhead')).toBeNull();

    act(() => startTransport(0));
    flush();
    expect(screen.getByTestId('top').textContent).toBe('INTRO · bar 1/16');
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter.mock.calls[0][1]).toBe(0);

    // 120 bpm: 2 s per bar. Bar 28 → Drop, bar 5 of 16.
    clock = 56;
    flush();
    expect(screen.getByTestId('top').textContent).toBe('DROP · bar 5/16');
    const current = screen.getAllByRole('button', { current: 'step' });
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('aria-label')).toBe('Drop, 16 bars');
    expect(onEnter).toHaveBeenCalledTimes(2);
    expect(onEnter.mock.calls[1][0]).toMatchObject({ id: 'drop-1' });
    flush();
    expect(screen.getByTestId('playhead').style.left).toBe(`${(28 / 72) * 100}%`);

    clock = 58;
    flush();
    expect(onEnter).toHaveBeenCalledTimes(2);

    clock = 1000;
    flush();
    expect(screen.getByTestId('top').textContent).toBe('OUTRO · bar 8/8');

    act(() => stopTransport());
    expect(screen.getByTestId('top').textContent).toBe('');
    expect(screen.queryByTestId('playhead')).toBeNull();
  });

  it('wraps the position inside a looped section', () => {
    render(<Harness />);
    fireEvent.click(block(/^Build,/));
    fireEvent.click(screen.getByRole('button', { name: 'Loop this section' }));
    act(() => startTransport(0));
    clock = 2 * 26; // bar 26: two bars past the build's end → build bar 3
    flush();
    expect(screen.getByTestId('top').textContent).toBe('BUILD · bar 3/8');
  });

  it('falls back to ochre with an empty palette', () => {
    render(
      <ChillSongSections
        sections={[DEFAULT_SECTIONS[0]]}
        onChange={() => {}}
        palette={[]}
        loopSectionId={null}
        onLoopChange={() => {}}
        getSnapshot={() => ({})}
        now={now}
      />,
    );
    expect(block(/^Intro,/)).toBeTruthy();
  });
});
