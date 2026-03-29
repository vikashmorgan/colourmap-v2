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

import CheckInForm from './CheckInForm';

describe('CheckInForm', () => {
  beforeEach(() => {
    capturedOnValueChange = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '1', sliderValue: 72, note: null }),
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

  it('sends a POST request with correct payload on submit', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    await user.type(textarea, 'feeling good');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(fetch).toHaveBeenCalledWith('/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sliderValue: 72, note: 'feeling good' }),
    });
  });

  it('sends null note when textarea is empty', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([50]));
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(fetch).toHaveBeenCalledWith('/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sliderValue: 50, note: null }),
    });
  });

  it('resets the form after successful submit', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    act(() => capturedOnValueChange?.([72]));
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    await user.type(textarea, 'hello');
    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByText('Checked in.')).toBeDefined();
    });

    expect((screen.getByTestId('slider') as HTMLInputElement).value).toBe('50');
    expect((textarea as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Check in' })).toHaveProperty('disabled', true);
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
      expect(screen.getByRole('button', { name: 'Check in' })).toBeDefined();
    });
  });
});
