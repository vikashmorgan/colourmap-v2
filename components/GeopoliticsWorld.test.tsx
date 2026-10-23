// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import GeopoliticsWorld from './GeopoliticsWorld';

describe('GeopoliticsWorld', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens on the world hub with both V1 categories', () => {
    render(<GeopoliticsWorld />);

    expect(screen.getByRole('heading', { name: /The World, walking/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Hormuz Crisis' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Shipping Industry' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'World' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Self' })).toBeDefined();
  });

  it('opens the first page of the Hormuz briefing when the program is clicked', () => {
    render(<GeopoliticsWorld />);

    fireEvent.click(screen.getByTestId('open-program-hormuz-briefing'));

    const reader = screen.getByTestId('page-reader');
    expect(within(reader).getByText(/21-mile pinch/i)).toBeDefined();
    expect(within(reader).getByTestId('trust-badge-trigger').textContent).toMatch(/HIGH/);
    expect(within(reader).getByTestId('page-bluf').textContent).toMatch(
      /swimming pool|Persian Gulf/i,
    );
  });

  it('navigates forward and backward inside a chapter', () => {
    render(<GeopoliticsWorld />);
    fireEvent.click(screen.getByTestId('open-program-hormuz-briefing'));

    fireEvent.click(screen.getByTestId('next-page'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/20% of global oil/i);

    fireEvent.click(screen.getByTestId('prev-page'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/21-mile pinch/i);
  });

  it('persists the active page across remount via localStorage', () => {
    const { unmount } = render(<GeopoliticsWorld />);
    fireEvent.click(screen.getByTestId('open-program-hormuz-briefing'));
    fireEvent.click(screen.getByTestId('next-page'));
    fireEvent.click(screen.getByTestId('next-page'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /biggest non-nuclear lever/i,
    );
    unmount();

    render(<GeopoliticsWorld />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /biggest non-nuclear lever/i,
    );
  });

  it('uses dependsOn chips as navigation links', () => {
    render(<GeopoliticsWorld />);
    fireEvent.click(screen.getByTestId('open-program-hormuz-briefing'));
    fireEvent.click(screen.getByTestId('next-page'));
    fireEvent.click(screen.getByTestId('next-page'));

    const dependsOn = screen.getByTestId('depends-on');
    const chip = within(dependsOn).getByRole('button', { name: /20% of global oil/i });
    fireEvent.click(chip);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/20% of global oil/i);
  });

  it('back-to-hub button returns to the category grid', () => {
    render(<GeopoliticsWorld />);
    fireEvent.click(screen.getByTestId('open-program-hormuz-briefing'));
    fireEvent.click(screen.getByTestId('back-to-hub'));

    expect(screen.getByTestId('world-hub')).toBeDefined();
  });
});
