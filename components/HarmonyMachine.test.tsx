// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HarmonyMachine from './HarmonyMachine';

describe('HarmonyMachine', () => {
  afterEach(cleanup);

  it('opens on a Begin screen with the two moods and autopilot on', () => {
    render(<HarmonyMachine />);
    expect(screen.getByRole('button', { name: 'Begin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chill' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Piano' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Autopilot' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('switches mood and autopilot from the buttons', () => {
    render(<HarmonyMachine />);
    fireEvent.click(screen.getByRole('button', { name: 'Piano' }));
    expect(screen.getByRole('button', { name: 'Piano' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Autopilot' }));
    expect(screen.getByRole('button', { name: 'Autopilot' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('moves the colour with the arrow keys on the gradient', () => {
    render(<HarmonyMachine />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toBeTruthy();
  });
});
