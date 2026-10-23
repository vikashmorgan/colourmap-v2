// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_VISUALS } from '@/lib/chill/visuals';

import ChillVisualsPanel, { echoSummary } from './ChillVisualsPanel';

function setup(value = DEFAULT_VISUALS) {
  const onChange = vi.fn();
  render(<ChillVisualsPanel value={value} onChange={onChange} padPalette="rainbow" />);
  return onChange;
}

describe('ChillVisualsPanel', () => {
  afterEach(() => cleanup());

  it('picks a visual mode and a colour palette', async () => {
    const onChange = setup();
    expect(screen.getByRole('button', { name: 'atom' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'galaxy' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_VISUALS, mode: 'galaxy' });

    const colours = screen.getByRole('group', { name: 'Visual colours' });
    expect(colours).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Match pads (Rainbow)' }).getAttribute('aria-pressed'),
    ).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Night' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_VISUALS, colors: 'night' });
  });

  it('moves the look sliders', () => {
    const onChange = setup();
    fireEvent.change(screen.getByRole('slider', { name: 'Density' }), { target: { value: '80' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_VISUALS, density: 0.8 });
  });

  it('shows the echo summary when closed and toggles echo types', async () => {
    const onChange = setup();
    const header = screen.getByRole('button', { name: /echo/i, expanded: false });
    expect(header.textContent).toContain('ripple');
    await userEvent.click(header);
    expect(screen.getByRole('slider', { name: 'Ripple size' })).toBeTruthy();
    expect(screen.queryByRole('slider', { name: 'Bubble size' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Bubble' }));
    const next = onChange.mock.lastCall?.[0];
    expect(next.echo.bubble.on).toBe(true);
    expect(next.echo.ripple).toEqual(DEFAULT_VISUALS.echo.ripple);

    fireEvent.change(screen.getByRole('slider', { name: 'Ripple sensitivity' }), {
      target: { value: '10' },
    });
    expect(onChange.mock.lastCall?.[0].echo.ripple.sensitivity).toBe(0.1);
  });

  it('closes the look section to its mode summary', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /look/i, expanded: true }));
    expect(screen.queryByRole('slider', { name: 'Speed' })).toBeNull();
    expect(screen.getByRole('button', { name: /look/i }).textContent).toContain('atom');
  });

  it('summarises echoes as one line', () => {
    const echo = {
      ...DEFAULT_VISUALS.echo,
      bubble: { ...DEFAULT_VISUALS.echo.bubble, on: true },
    };
    expect(echoSummary(echo)).toBe('ripple + bubble');
    expect(
      echoSummary({ ...echo, ripple: { ...echo.ripple, on: false }, bubble: echo.ripple }),
    ).toBe('bubble');
    const off = {
      ...echo,
      ripple: { ...echo.ripple, on: false },
      bubble: DEFAULT_VISUALS.echo.bubble,
    };
    expect(echoSummary(off)).toBe('off');
  });
});
