import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AudioRecorder, Take } from '@/lib/hooks/use-audio-recorder';
import ChillRecorder, { ChillRecordButton, cueSheet, formatClock } from './ChillRecorder';

class FakeRecorder extends EventTarget {
  static isTypeSupported(type: string) {
    return type === 'audio/mp4;codecs=mp4a.40.2';
  }
  state = 'inactive';
  constructor(
    public stream: MediaStream,
    public options: { mimeType: string },
  ) {
    super();
  }
  get mimeType() {
    return this.options.mimeType;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    const event = new Event('dataavailable') as Event & { data: Blob };
    event.data = new Blob(['sound']);
    this.dispatchEvent(event);
    this.dispatchEvent(new Event('stop'));
  }
}

function graph() {
  const ctx = {
    createMediaStreamDestination: () => ({ stream: {} }),
  } as unknown as AudioContext;
  const source = { connect: vi.fn(), disconnect: vi.fn() } as unknown as AudioNode;
  return { ctx, source };
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

async function recordTake() {
  fireEvent.click(button('Start recording'));
  await act(async () => {
    fireEvent.click(button('Stop recording'));
  });
}

describe('ChillRecorder helpers', () => {
  it('formats mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65.7)).toBe('01:05');
    expect(formatClock(3725)).toBe('62:05');
  });

  it('writes a cue sheet in time order', () => {
    expect(
      cueSheet([
        { at: 70, label: 'Chorus' },
        { at: 0, label: 'Intro' },
      ]),
    ).toBe('00:00  Intro\n01:10  Chorus\n');
  });
});

describe('ChillRecorder', () => {
  beforeEach(() => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:take');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is disabled with a hint until something plays', () => {
    render(<ChillRecorder ctx={null} source={null} palette="dusk" />);
    const record = button('Start recording');
    expect(record.disabled).toBe(true);
    expect(record.title).toBe('Play something first');
  });

  it('shows the red-dot timer while recording, then a take card with a download link', async () => {
    const { ctx, source } = graph();
    render(<ChillRecorder ctx={ctx} source={source} palette="Sea Glass" />);
    fireEvent.click(button('Start recording'));
    expect(screen.getByRole('timer').textContent).toBe('00:00');

    await act(async () => {
      fireEvent.click(button('Stop recording'));
    });
    expect(screen.queryByRole('timer')).toBeNull();

    const link = screen.getByRole('link', { name: 'Download' });
    expect(link.getAttribute('href')).toBe('blob:take');
    expect(link.getAttribute('download')).toMatch(/^chill-sea-glass-\d{4}-\d{2}-\d{2}-\d{4}\.m4a$/);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Recording name'), {
      target: { value: 'Night rain' },
    });
    expect(link.getAttribute('download')).toBe('Night-rain.m4a');
  });

  it('downloads a cue sheet next to the audio when there are cues', async () => {
    const { ctx, source } = graph();
    const cues = () => [{ at: 5, label: 'Verse' }];
    render(<ChillRecorder ctx={ctx} source={source} palette="dusk" cues={cues} />);
    await recordTake();
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    fireEvent.click(screen.getByRole('link', { name: 'Download + cues' }));
    expect(clicked).toHaveLength(1);
    expect(clicked[0]).toMatch(/^chill-dusk-.*\.txt$/);
  });

  it('guards an unsaved take with beforeunload until it is downloaded', async () => {
    const { ctx, source } = graph();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    render(<ChillRecorder ctx={ctx} source={source} palette="dusk" />);
    await recordTake();
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: 'Download' }));
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('saves for signed-in users and shows the outcome', async () => {
    const { ctx, source } = graph();
    const onSave = vi.fn(async (_take: Take, _title: string) => {});
    render(<ChillRecorder ctx={ctx} source={source} palette="dusk" onSave={onSave} />);
    await recordTake();
    await act(async () => {
      fireEvent.click(button('Save'));
    });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'blob:take' }),
      expect.stringMatching(/^chill-dusk-/),
    );
    expect(button('Saved').disabled).toBe(true);
  });

  it('shows an error when saving fails', async () => {
    const { ctx, source } = graph();
    const onSave = vi.fn(async () => {
      throw new Error('nope');
    });
    render(<ChillRecorder ctx={ctx} source={source} palette="dusk" onSave={onSave} />);
    await recordTake();
    await act(async () => {
      fireEvent.click(button('Save'));
    });
    expect(screen.getByRole('alert').textContent).toContain("Couldn't save");
  });

  it('discards after a second press', async () => {
    const { ctx, source } = graph();
    render(<ChillRecorder ctx={ctx} source={source} palette="dusk" />);
    await recordTake();
    fireEvent.click(button('Discard'));
    fireEvent.click(button('Really discard?'));
    expect(screen.queryByRole('link', { name: 'Download' })).toBeNull();
  });

  it('plays and pauses the take', async () => {
    const { ctx, source } = graph();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<ChillRecorder ctx={ctx} source={source} palette="dusk" />);
    await recordTake();
    await act(async () => {
      fireEvent.click(button('Play'));
    });
    expect(play).toHaveBeenCalled();
    const audio = screen.getByRole('group').querySelector('audio') as HTMLAudioElement;
    Object.defineProperty(audio, 'paused', { value: false });
    fireEvent.click(button('Pause'));
    expect(pause).toHaveBeenCalled();
  });
});

describe('ChillRecordButton', () => {
  afterEach(cleanup);

  const base: AudioRecorder = {
    state: 'idle',
    elapsed: 0,
    start: vi.fn(),
    stop: vi.fn(async () => ({}) as Take),
    take: null,
    clearTake: vi.fn(),
    supported: true,
    mimeType: 'audio/mp4',
    extension: 'm4a',
  };

  it('starts and stops a shared recorder', () => {
    const { rerender } = render(<ChillRecordButton recorder={base} ready />);
    fireEvent.click(button('Start recording'));
    expect(base.start).toHaveBeenCalled();
    rerender(<ChillRecordButton recorder={{ ...base, state: 'recording', elapsed: 75 }} ready />);
    expect(screen.getByRole('timer').textContent).toBe('01:15');
    fireEvent.click(button('Stop recording'));
    expect(base.stop).toHaveBeenCalled();
  });

  it('is disabled when the browser cannot record', () => {
    render(<ChillRecordButton recorder={{ ...base, supported: false }} ready />);
    const record = button('Start recording');
    expect(record.disabled).toBe(true);
    expect(record.title).toBe('Recording is not supported in this browser');
  });
});
