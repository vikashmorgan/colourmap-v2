import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { askCollective } = vi.hoisted(() => ({ askCollective: vi.fn() }));
vi.mock('@/lib/collective/ask-client', () => ({ askCollective }));

import { DEMO_MEMBERS } from '@/lib/collective/model';
import { QUESTIONS } from '@/lib/collective/onboarding';

import CollectiveBrain from './CollectiveBrain';

const star = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

describe('the Collective Brain', () => {
  beforeEach(() => askCollective.mockReset());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('opens on the demo group and how it combines', () => {
    render(<CollectiveBrain />);
    expect(screen.getByText(`${DEMO_MEMBERS.length} stars · demo group`)).toBeTruthy();
    expect(screen.getByText('How this group combines')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Invite' }).getAttribute('href')).toContain(
      'https://wa.me/?text=',
    );
  });

  it('shows a profile for one person and the links for a combination', () => {
    const [a, b] = DEMO_MEMBERS;
    render(<CollectiveBrain />);
    fireEvent.click(star(a.name));
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByRole('heading', { name: a.name })).toBeTruthy();

    fireEvent.click(star(b.name));
    expect(screen.getByText('Combination · 2')).toBeTruthy();
    expect(screen.getByRole('heading', { name: `${a.name} + ${b.name}` })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByText('How this group combines')).toBeTruthy();
  });

  it('asks Claude about the chosen people and shows the answer', async () => {
    askCollective.mockImplementation(async (_m, _q, onText?: (t: string) => void) => {
      onText?.('Start small.');
      return { kind: 'done', text: 'Start small.\n\nMeet on Sunday.' };
    });
    const [a, b] = DEMO_MEMBERS;
    render(<CollectiveBrain />);
    fireEvent.click(star(a.name));
    fireEvent.click(star(b.name));
    fireEvent.change(screen.getByLabelText('Ask Claude about this combination'), {
      target: { value: 'What first?' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    });

    const [members, question] = askCollective.mock.calls.find((c) => c.length === 3) ?? [];
    expect(members.map((m: { id: string }) => m.id)).toEqual([a.id, b.id]);
    expect(question).toBe('What first?');
    expect(screen.getByText('Meet on Sunday.')).toBeTruthy();
  });

  it('uses a starter question, and points to sign-in when needed', async () => {
    askCollective.mockResolvedValue({ kind: 'signin' });
    render(<CollectiveBrain />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    });
    expect(askCollective.mock.calls[0][0]).toHaveLength(DEMO_MEMBERS.length);
    expect(askCollective.mock.calls[0][1]).toMatch(/make together/);
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
  });

  it('shows the error Claude’s route gives', async () => {
    askCollective.mockResolvedValue({ kind: 'error', message: 'Claude is not connected yet.' });
    render(<CollectiveBrain />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    });
    expect(screen.getByText('Claude is not connected yet.')).toBeTruthy();
  });

  it('adds you to the map after the guided questions and remembers you', () => {
    render(<CollectiveBrain />);
    fireEvent.click(screen.getByRole('button', { name: '＋ Add yourself' }));
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
    for (let i = 0; i <= QUESTIONS.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: /^(Next|Join the map)$/ }));
    }
    expect(star('Ada').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(`${DEMO_MEMBERS.length + 1} stars · you + demo group`)).toBeTruthy();
    cleanup();

    render(<CollectiveBrain />);
    expect(star('Ada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit me' })).toBeTruthy();
  });

  it('folds the panel away and back', () => {
    render(<CollectiveBrain />);
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByText('How this group combines')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open panel' }));
    expect(screen.getByText('How this group combines')).toBeTruthy();
  });
});
