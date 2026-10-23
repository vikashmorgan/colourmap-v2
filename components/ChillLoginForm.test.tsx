// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChillLoginForm from './ChillLoginForm';

const fetchMock = vi.fn();

function submit(email: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByText('Send me a link'));
}

describe('ChillLoginForm', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('sends the email and shows the inbox message', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<ChillLoginForm />);

    submit(' guest@example.com ');

    expect(await screen.findByText('Check your inbox — the link signs you in')).toBeDefined();
    expect(screen.getByText('We sent it to guest@example.com.')).toBeDefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/chill/login');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'guest@example.com' });
  });

  it('shows the sending state while waiting', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<ChillLoginForm />);
    submit('guest@example.com');
    expect(await screen.findByText('Sending…')).toBeDefined();
  });

  it('asks for an email before sending', () => {
    render(<ChillLoginForm />);
    submit('   ');
    expect(screen.getByRole('alert').textContent).toBe('Enter your email address');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the server error, e.g. the rate limit', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Too many links requested.' }), { status: 429 }),
    );
    render(<ChillLoginForm />);
    submit('guest@example.com');
    expect((await screen.findByRole('alert')).textContent).toBe('Too many links requested.');
  });

  it('shows a connection error when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render(<ChillLoginForm />);
    submit('guest@example.com');
    expect((await screen.findByRole('alert')).textContent).toContain('No connection');
  });

  it('lets the user start over after sending', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    render(<ChillLoginForm />);
    submit('guest@example.com');
    fireEvent.click(await screen.findByText('Use another email'));
    expect(screen.getByText('Send me a link')).toBeDefined();
  });
});
