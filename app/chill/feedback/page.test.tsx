import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => {
  const getUser = vi.fn();
  const createClient = vi.fn(async () => ({ auth: { getUser } }));
  return { createClient, getUser };
});

const { listChillFeedback, redirect, notFound } = vi.hoisted(() => ({
  listChillFeedback: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/db/queries/chill-feedback', () => ({ listChillFeedback }));
vi.mock('next/navigation', () => ({ redirect, notFound }));

import ChillFeedbackPage from './page';

describe('/chill/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('COCKPIT_OWNER_EMAILS', 'martin@example.com');
    listChillFeedback.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('sends signed-out visitors to /login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(ChillFeedbackPage()).rejects.toThrow('redirect:/login');
  });

  it('is a 404 for anyone but the owner', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u', email: 'guest@example.com' } } });
    await expect(ChillFeedbackPage()).rejects.toThrow('not-found');
    expect(listChillFeedback).not.toHaveBeenCalled();
  });

  it('lists notes for the owner with sender and palette', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'm', email: 'martin@example.com' } } });
    listChillFeedback.mockResolvedValue([
      {
        id: 'a',
        userId: null,
        name: 'Ana',
        email: null,
        message: 'More rain',
        palette: 'dusk',
        createdAt: new Date('2026-10-20T10:00:00Z'),
      },
      {
        id: 'b',
        userId: 'u1',
        name: null,
        email: 'u1@example.com',
        message: 'Lovely',
        palette: null,
        createdAt: new Date('2026-10-21T10:00:00Z'),
      },
      {
        id: 'c',
        userId: null,
        name: null,
        email: null,
        message: 'Quiet one',
        palette: null,
        createdAt: new Date('2026-10-22T10:00:00Z'),
      },
    ]);
    render(await ChillFeedbackPage());
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Ana · dusk');
    expect(items[0]).toContain('More rain');
    expect(items[1]).toContain('u1@example.com');
    expect(items[2]).toContain('guest');
  });

  it('says so when there are no notes', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'm', email: 'martin@example.com' } } });
    render(await ChillFeedbackPage());
    expect(screen.getByText('No notes yet.')).toBeTruthy();
  });
});
