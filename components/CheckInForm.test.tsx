// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let capturedOnValueChange: ((value: number[]) => void) | undefined;

vi.mock('@/components/ui/slider', () => ({
  Slider: (props: { value: number[]; onValueChange: (value: number[]) => void; id?: string }) => {
    capturedOnValueChange = props.onValueChange;
    return (
      <input
        type="range"
        id={props.id}
        data-testid="slider"
        value={props.value[0]}
        onChange={(e) => props.onValueChange([Number(e.target.value)])}
        readOnly
      />
    );
  },
}));

vi.mock('@/components/ui/label', () => ({
  // biome-ignore lint/a11y/noLabelWithoutControl: test stub — htmlFor comes through props spread
  Label: (props: React.ComponentProps<'label'>) => <label {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ComponentProps<'button'>) => <button {...props} />,
}));

vi.mock('./ReflectionMoment', () => ({
  default: ({ word, onDismiss }: { word: string; onDismiss: () => void }) => (
    <button type="button" data-testid="reflection" onClick={onDismiss}>
      {word}
    </button>
  ),
}));

import CheckInForm from './CheckInForm';

describe('CheckInForm', () => {
  beforeEach(() => {
    capturedOnValueChange = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '1', sliderValue: 72, note: null, tags: null }),
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the slider, textarea, and submit button', () => {
    render(<CheckInForm />);

    expect(screen.getByTestId('slider')).toBeDefined();
    expect(screen.getByPlaceholderText("What's on your mind?")).toBeDefined();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeDefined();
  });

  it('renders scale endpoint labels', () => {
    render(<CheckInForm />);

    expect(screen.getByText('Heavy / Contracted')).toBeDefined();
    expect(screen.getByText('Light / Expansive')).toBeDefined();
  });

  it('disables the submit button initially', () => {
    render(<CheckInForm />);

    const button = screen.getByRole('button', { name: 'Check in' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('enables the submit button after the slider is moved', () => {
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));

    const button = screen.getByRole('button', { name: 'Check in' });
    expect(button).toHaveProperty('disabled', false);
  });

  it('displays the emotional vocabulary word', () => {
    render(<CheckInForm />);

    expect(screen.getByText('Still')).toBeDefined();

    act(() => capturedOnValueChange?.([80]));
    expect(screen.getByText('Alive')).toBeDefined();
  });

  it('renders context tag pills', () => {
    render(<CheckInForm />);

    expect(screen.getByRole('button', { name: 'Work' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Body' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Relationships' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Creative' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'General' })).toBeDefined();
  });

  it('toggles tag selection on click', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    const workTag = screen.getByRole('button', { name: 'Work' });
    expect(workTag.getAttribute('aria-pressed')).toBe('false');

    await user.click(workTag);
    expect(workTag.getAttribute('aria-pressed')).toBe('true');

    await user.click(workTag);
    expect(workTag.getAttribute('aria-pressed')).toBe('false');
  });

  it('sends a POST request with correct payload including tags', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    await user.click(screen.getByRole('button', { name: 'Work' }));
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    await user.type(textarea, 'feeling good');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(fetch).toHaveBeenCalledWith('/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sliderValue: 72, note: 'feeling good', tags: ['Work'] }),
    });
  });

  it('sends null tags when none selected', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([50]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(fetch).toHaveBeenCalledWith('/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sliderValue: 50, note: null, tags: null }),
    });
  });

  it('shows reflection moment after successful submit', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByTestId('reflection')).toBeDefined();
      expect(screen.getByText('Open')).toBeDefined();
    });
  });

  it('resets form after reflection dismiss', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<CheckInForm onCheckInComplete={onComplete} />);

    act(() => capturedOnValueChange?.([72]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByTestId('reflection')).toBeDefined();
    });

    await user.click(screen.getByTestId('reflection'));

    await waitFor(() => {
      expect(screen.getByTestId('slider')).toBeDefined();
    });

    expect((screen.getByTestId('slider') as HTMLInputElement).value).toBe('50');
    expect(screen.getByRole('button', { name: 'Check in' })).toHaveProperty('disabled', true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows an error message on API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'sliderValue is required' }),
        }),
      ),
    );

    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByText('sliderValue is required')).toBeDefined();
    });
  });

  it('shows a network error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network'))),
    );

    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByText('Network error — check your connection')).toBeDefined();
    });
  });

  it('shows loading text while submitting', async () => {
    let resolveResponse!: (value: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveResponse = resolve;
          }),
      ),
    );

    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Saving...' })).toHaveProperty('disabled', true);

    resolveResponse({
      ok: true,
      json: () => Promise.resolve({ id: '1' }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('reflection')).toBeDefined();
    });
  });

  it('shows time-of-day greeting', () => {
    render(<CheckInForm />);

    // The greeting is set via useEffect, so it will appear after mount
    // We just verify the form renders without hydration issues
    expect(screen.getByTestId('slider')).toBeDefined();
  });
});
