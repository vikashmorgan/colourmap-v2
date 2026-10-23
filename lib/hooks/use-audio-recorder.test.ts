import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pickFormat, takeFilename, useAudioRecorder } from './use-audio-recorder';

class FakeRecorder extends EventTarget {
  static supported = new Set<string>();
  static instances: FakeRecorder[] = [];
  static isTypeSupported(type: string) {
    return FakeRecorder.supported.has(type);
  }
  state: 'inactive' | 'recording' = 'inactive';
  timeslice: number | undefined;
  constructor(
    public stream: MediaStream,
    public options: { mimeType: string },
  ) {
    super();
    FakeRecorder.instances.push(this);
  }
  get mimeType() {
    return this.options.mimeType;
  }
  start(timeslice?: number) {
    this.timeslice = timeslice;
    this.state = 'recording';
  }
  emit(text: string) {
    const event = new Event('dataavailable') as Event & { data: Blob };
    event.data = new Blob([text]);
    this.dispatchEvent(event);
  }
  stop() {
    this.state = 'inactive';
    this.emit('-end');
    this.dispatchEvent(new Event('stop'));
  }
}

function fakeGraph() {
  const destination = { stream: {} as MediaStream };
  const ctx = {
    createMediaStreamDestination: vi.fn(() => destination),
  } as unknown as AudioContext;
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  return { ctx, source, destination };
}

describe('takeFilename', () => {
  const at = new Date(2026, 9, 23, 7, 5);

  it('builds chill-<palette>-<yyyy-mm-dd-hhmm>.<ext>', () => {
    expect(takeFilename('dusk', at, 'm4a')).toBe('chill-dusk-2026-10-23-0705.m4a');
  });

  it('slugs the palette and adds a section label', () => {
    expect(takeFilename('Sea Glass', at, '.webm', 'Intro / A')).toBe(
      'chill-sea-glass-intro-a-2026-10-23-0705.webm',
    );
  });

  it('falls back to "mix" for an empty palette and ignores an empty section', () => {
    expect(takeFilename('', at, 'm4a', '!!')).toBe('chill-mix-2026-10-23-0705.m4a');
  });
});

describe('useAudioRecorder', () => {
  let urls = 0;

  beforeEach(() => {
    FakeRecorder.supported = new Set(['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus']);
    FakeRecorder.instances = [];
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    urls = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:take-${++urls}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('prefers AAC in mp4, then plain mp4, then webm opus', () => {
    expect(pickFormat()).toEqual({ mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' });
    FakeRecorder.supported = new Set(['audio/mp4', 'audio/webm;codecs=opus']);
    expect(pickFormat()).toEqual({ mimeType: 'audio/mp4', extension: 'm4a' });
    FakeRecorder.supported = new Set(['audio/webm;codecs=opus']);
    expect(pickFormat()).toEqual({ mimeType: 'audio/webm;codecs=opus', extension: 'webm' });
    FakeRecorder.supported = new Set();
    expect(pickFormat()).toBeNull();
  });

  it('reports unsupported when MediaRecorder is missing', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(pickFormat()).toBeNull();
    const { result } = renderHook(() => useAudioRecorder(null, null));
    expect(result.current.supported).toBe(false);
    expect(result.current.extension).toBeNull();
  });

  it('records the source tap in 10 s chunks and combines them on stop', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 12, 0, 0));
    const { ctx, source, destination } = fakeGraph();
    const { result } = renderHook(() => useAudioRecorder(ctx, source as unknown as AudioNode));

    expect(result.current.supported).toBe(true);
    expect(result.current.extension).toBe('m4a');
    expect(result.current.state).toBe('idle');

    act(() => result.current.start());
    expect(result.current.state).toBe('recording');
    expect(source.connect).toHaveBeenCalledWith(destination);
    const recorder = FakeRecorder.instances[0];
    expect(recorder.timeslice).toBe(10_000);
    expect(recorder.options.mimeType).toBe('audio/mp4;codecs=mp4a.40.2');

    recorder.emit('aaa');
    recorder.emit('bb');
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(result.current.elapsed).toBe(65);

    let take: Awaited<ReturnType<typeof result.current.stop>> | undefined;
    await act(async () => {
      take = await result.current.stop();
    });
    expect(take?.blob.size).toBe('aaa'.length + 'bb'.length + '-end'.length);
    expect(take?.mimeType).toBe('audio/mp4;codecs=mp4a.40.2');
    expect(take?.extension).toBe('m4a');
    expect(take?.durationSecs).toBe(65);
    expect(take?.url).toBe('blob:take-1');
    expect(source.disconnect).toHaveBeenCalledWith(destination);
    expect(result.current.state).toBe('idle');
    expect(result.current.elapsed).toBe(0);
    expect(result.current.take).toBe(take);
  });

  it('uses webm when mp4 is not supported', async () => {
    FakeRecorder.supported = new Set(['audio/webm;codecs=opus']);
    const { ctx, source } = fakeGraph();
    const { result } = renderHook(() => useAudioRecorder(ctx, source as unknown as AudioNode));
    act(() => result.current.start());
    let ext = '';
    await act(async () => {
      ext = (await result.current.stop()).extension;
    });
    expect(ext).toBe('webm');
  });

  it('does nothing on start without a context or source, and rejects stop when idle', async () => {
    const { result } = renderHook(() => useAudioRecorder(null, null));
    act(() => result.current.start());
    expect(result.current.state).toBe('idle');
    expect(FakeRecorder.instances).toHaveLength(0);
    await expect(result.current.stop()).rejects.toThrow('Not recording');
  });

  it('revokes the previous take URL on a new take and on clear', async () => {
    const { ctx, source } = fakeGraph();
    const { result } = renderHook(() => useAudioRecorder(ctx, source as unknown as AudioNode));
    for (let i = 0; i < 2; i++) {
      act(() => result.current.start());
      await act(async () => {
        await result.current.stop();
      });
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:take-1');
    act(() => result.current.clearTake());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:take-2');
    expect(result.current.take).toBeNull();
  });

  it('stops and untaps on unmount', () => {
    const { ctx, source, destination } = fakeGraph();
    const { result, unmount } = renderHook(() =>
      useAudioRecorder(ctx, source as unknown as AudioNode),
    );
    act(() => result.current.start());
    unmount();
    expect(FakeRecorder.instances[0].state).toBe('inactive');
    expect(source.disconnect).toHaveBeenCalledWith(destination);
  });
});
