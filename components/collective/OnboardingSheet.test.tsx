import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_MEMBERS } from '@/lib/collective/model';
import { QUESTIONS } from '@/lib/collective/onboarding';

import OnboardingSheet from './OnboardingSheet';

function next() {
  fireEvent.click(screen.getByRole('button', { name: /^(Next|Join the map)$/ }));
}

describe('the guided profile questions', () => {
  afterEach(cleanup);

  it('needs a name before moving on', () => {
    render(<OnboardingSheet index={0} onDone={vi.fn()} onCancel={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
    expect(button.disabled).toBe(false);
  });

  it('walks one question per screen and builds the profile', () => {
    const onDone = vi.fn();
    render(<OnboardingSheet index={5} onDone={onDone} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
    next();
    expect(screen.getByText(`Your profile · 2 of ${QUESTIONS.length + 1}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Architect/ }));
    expect(screen.getByRole('button', { name: /Architect/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    next();
    fireEvent.change(screen.getByLabelText(QUESTIONS[1].title), {
      target: { value: 'Mornings, alone' },
    });
    next();
    fireEvent.change(screen.getByLabelText(QUESTIONS[2].title), {
      target: { value: 'code, drawing' },
    });
    for (let i = 3; i < QUESTIONS.length; i++) next();

    expect(screen.getByRole('button', { name: 'Join the map' })).toBeTruthy();
    next();
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada',
        archetype: 'architect',
        style: 'Mornings, alone',
        skills: ['code', 'drawing'],
      }),
    );
  });

  it('goes back without losing answers', () => {
    render(<OnboardingSheet index={0} onDone={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByLabelText('Your name') as HTMLTextAreaElement).value).toBe('Ada');
  });

  it('opens with an existing profile filled in, and can be closed', () => {
    const onCancel = vi.fn();
    render(
      <OnboardingSheet index={0} initial={DEMO_MEMBERS[0]} onDone={vi.fn()} onCancel={onCancel} />,
    );
    expect((screen.getByLabelText('Your name') as HTMLTextAreaElement).value).toBe(
      DEMO_MEMBERS[0].name,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
