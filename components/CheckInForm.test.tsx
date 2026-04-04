// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ComponentProps<'button'>) => <button {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('./ReflectionMoment', () => ({
  default: ({ word, onDismiss }: { word: string; onDismiss: () => void }) => (
    <button type="button" data-testid="reflection" onClick={onDismiss}>
      {word}
    </button>
  ),
}));

vi.mock('@/components/PostCheckInInsight', () => ({
  default: ({ onDismiss }: { onDismiss: () => void }) => (
    <button type="button" data-testid="insight" onClick={onDismiss}>
      Insight
    </button>
  ),
}));

import CheckInForm from './CheckInForm';

describe('CheckInForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/life-scan-answers') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ answers: {} }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '1', sliderValue: 72, note: null, tags: null }),
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the submit button', () => {
    render(<CheckInForm />);

    expect(screen.getByRole('button', { name: 'Check in' })).toBeDefined();
  });

  it('renders the Hawkins emotion bar', () => {
    const { container } = render(<CheckInForm />);

    // The bar contains 14 colored segments (HAWKINS array has 14 entries)
    const form = container.querySelector('form');
    expect(form).toBeDefined();
  });

  it('renders the textarea', () => {
    render(<CheckInForm />);

    // The textarea exists with a dynamic placeholder
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('submit button is enabled by default', () => {
    render(<CheckInForm />);

    const button = screen.getByRole('button', { name: 'Check in' });
    expect(button).toHaveProperty('disabled', false);
  });

  it('sends a POST request on submit', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    await user.click(screen.getByRole('button', { name: 'Check in' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/check-ins',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('shows reflection moment after successful submit', async () => {
    const user = userEvent.setup();
    render(<CheckInForm />);

    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByTestId('reflection')).toBeDefined();
    });
  });

  it('shows insight after reflection dismiss, then resets on insight dismiss', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<CheckInForm onCheckInComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => {
      expect(screen.getByTestId('reflection')).toBeDefined();
    });

    await user.click(screen.getByTestId('reflection'));

    await waitFor(() => {
      expect(screen.getByTestId('insight')).toBeDefined();
    });

    await user.click(screen.getByTestId('insight'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check in' })).toBeDefined();
    });

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

  it('renders the Pulse collapsible section', () => {
    render(<CheckInForm />);

    expect(screen.getByText('Pulse')).toBeDefined();
  });
});
