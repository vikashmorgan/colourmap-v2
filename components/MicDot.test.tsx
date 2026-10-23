// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useVoiceCapture } = vi.hoisted(() => ({ useVoiceCapture: vi.fn() }));

vi.mock('@/lib/hooks/use-voice-capture', () => ({ useVoiceCapture }));

import MicDot, { labelFor } from './MicDot';

const start = vi.fn();
const stop = vi.fn();
const reset = vi.fn();
let captured: ((text: string, note: unknown) => void) | undefined;

function capture(overrides: Record<string, unknown> = {}) {
  useVoiceCapture.mockImplementation((options: { onTranscript?: typeof captured }) => {
    captured = options.onTranscript;
    return {
      state: 'idle',
      elapsed: 0,
      error: '',
      note: null,
      supported: true,
      start,
      stop,
      reset,
      ...overrides,
    };
  });
}

afterEach(cleanup);

describe('the mic dot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capture();
  });

  it('hides itself on a device that cannot record', () => {
    capture({ supported: false });
    render(<MicDot visible value="hello" onTranscript={vi.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('stays out of an empty field', () => {
    render(<MicDot visible={false} value="" onTranscript={vi.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('starts recording when tapped', () => {
    render(<MicDot visible value="hello" onTranscript={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(start).toHaveBeenCalled();
  });

  it('stops when tapped while recording', () => {
    capture({ state: 'recording', elapsed: 4 });
    render(<MicDot visible value="hello" onTranscript={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(stop).toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('is tappable at 44px even though it reads as a dot', () => {
    /*
     * This control was 9px square for its whole life. The touch target floor
     * does not relax, and the fix must not move six existing layouts — hence
     * padding out and an equal negative margin back.
     */
    render(<MicDot visible value="hello" onTranscript={vi.fn()} />);
    const button = screen.getByRole('button');

    expect(button.style.width).toBe('43px');
    expect(button.style.height).toBe('43px');
    expect(button.style.margin).toBe('-17px');
  });

  it('cannot be tapped again while the recording is being filed', () => {
    /*
     * A second tap mid-upload would start a new recording on top of one still
     * in flight, and the first would be orphaned in the bucket.
     */
    capture({ state: 'saving' });
    render(<MicDot visible value="hello" onTranscript={vi.fn()} />);
    const button = screen.getByRole('button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('offers another go after a failed reading', () => {
    capture({ state: 'error', error: 'nothing audible' });
    render(<MicDot visible value="hello" onTranscript={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(reset).toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('appends the words rather than replacing what is written', () => {
    const onTranscript = vi.fn();
    render(<MicDot visible value="Already typed" onTranscript={onTranscript} />);

    captured?.('and this was spoken.', null);

    expect(onTranscript).toHaveBeenCalledWith('Already typed and this was spoken.');
  });

  it('does not add a leading space to an empty field', () => {
    const onTranscript = vi.fn();
    render(<MicDot visible value="" onTranscript={onTranscript} />);

    captured?.('spoken.', null);

    expect(onTranscript).toHaveBeenCalledWith('spoken.');
  });
});

describe('what the dot says it is doing', () => {
  it('names every state in words, because colour cannot', () => {
    /*
     * The dot is 9px and carries four states. Colour and animation alone are
     * not a description, and a blind user gets nothing from either.
     */
    expect(labelFor('idle', 0)).toBe('Record a note');
    expect(labelFor('recording', 7)).toContain('7s');
    expect(labelFor('saving', 0)).toMatch(/saving/i);
    expect(labelFor('reading', 0)).toMatch(/reading/i);
  });

  it('says the recording survived when the reading did not', () => {
    /*
     * The whole point of the rebuild. An error here must not read as "your
     * thought is gone", because it is not.
     */
    expect(labelFor('error', 0)).toMatch(/saved/i);
  });
});
