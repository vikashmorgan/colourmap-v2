import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChillFeedbackNotepad, { DRAFT_KEY, NAME_KEY, SENT_KEY } from './ChillFeedbackNotepad';

const textarea = () => screen.getByLabelText('Your note') as HTMLTextAreaElement;
const sendButton = () =>
  screen.getByRole('button', { name: 'Send to Martin' }) as HTMLButtonElement;

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe('ChillFeedbackNotepad', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    render(<ChillFeedbackNotepad open={false} onClose={() => {}} signedIn={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a modal notepad with focus in the textarea', () => {
    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn={false} />);
    const dialog = screen.getByRole('dialog', { name: 'Notes for Martin' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(textarea());
    expect(sendButton().disabled).toBe(true);
  });

  it('autosaves the draft after a short pause and restores it', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ChillFeedbackNotepad open onClose={() => {}} signedIn />);
    fireEvent.change(textarea(), { target: { value: 'More birds' } });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(localStorage.getItem(DRAFT_KEY)).toBe('More birds');
    unmount();

    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn />);
    expect(textarea().value).toBe('More birds');
  });

  it('asks guests for an optional name and remembers it; signed-in users never see it', () => {
    localStorage.setItem(NAME_KEY, 'Ana');
    const { unmount } = render(<ChillFeedbackNotepad open onClose={() => {}} signedIn={false} />);
    const name = screen.getByLabelText('Name (optional)') as HTMLInputElement;
    expect(name.value).toBe('Ana');
    fireEvent.change(name, { target: { value: 'Bea' } });
    expect(localStorage.getItem(NAME_KEY)).toBe('Bea');
    unmount();

    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn />);
    expect(screen.queryByLabelText('Name (optional)')).toBeNull();
  });

  it('sends the note, clears the draft and lists it under your sent notes', async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(NAME_KEY, 'Ana');
    localStorage.setItem(DRAFT_KEY, '  Slower rain  ');
    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn={false} palette="dusk" />);

    await act(async () => {
      fireEvent.click(sendButton());
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chill/feedback',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      message: 'Slower rain',
      name: 'Ana',
      palette: 'dusk',
      website: '',
    });
    expect(screen.getByText('Sent — thank you')).toBeTruthy();
    expect(textarea().value).toBe('');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(screen.getByRole('region', { name: 'Your sent notes' }).textContent).toContain(
      'Slower rain',
    );
    expect(JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]')).toHaveLength(1);
  });

  it('does not send a name for signed-in users', async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(NAME_KEY, 'Ana');
    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn />);
    fireEvent.change(textarea(), { target: { value: 'Hi' } });
    await act(async () => {
      fireEvent.click(sendButton());
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).name).toBeUndefined();
  });

  it('shows the gentle limit message on 429 and keeps the draft', async () => {
    vi.stubGlobal('fetch', respond(429, { error: 'rate limited' }));
    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn={false} />);
    fireEvent.change(textarea(), { target: { value: 'Again' } });
    await act(async () => {
      fireEvent.click(sendButton());
    });
    expect(screen.getByRole('alert').textContent).toBe(
      "That's a lot of notes for one hour — try again a bit later",
    );
    expect(textarea().value).toBe('Again');
  });

  it('shows the API error, or a connection error', async () => {
    vi.stubGlobal('fetch', respond(400, { error: 'Notes are up to 2000 characters' }));
    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn={false} />);
    fireEvent.change(textarea(), { target: { value: 'x' } });
    await act(async () => {
      fireEvent.click(sendButton());
    });
    expect(screen.getByRole('alert').textContent).toBe('Notes are up to 2000 characters');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await act(async () => {
      fireEvent.click(sendButton());
    });
    expect(screen.getByRole('alert').textContent).toContain('connection');
  });

  it('closes on Escape and on Keep writing, keeping the draft', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<ChillFeedbackNotepad open onClose={onClose} signedIn={false} />);
    fireEvent.change(textarea(), { target: { value: 'Half a thought' } });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Keep writing' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(localStorage.getItem(DRAFT_KEY)).toBe('Half a thought');
  });

  it('ignores a corrupt sent-notes list', () => {
    localStorage.setItem(SENT_KEY, '{not json');
    render(<ChillFeedbackNotepad open onClose={() => {}} signedIn={false} />);
    expect(screen.queryByRole('region', { name: 'Your sent notes' })).toBeNull();
  });
});
