// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeSwitcher from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders three theme buttons', () => {
    render(<ThemeSwitcher />);

    expect(screen.getByLabelText('Switch to Paper theme')).toBeDefined();
    expect(screen.getByLabelText('Switch to Golden theme')).toBeDefined();
    expect(screen.getByLabelText('Switch to Night theme')).toBeDefined();
  });

  it('defaults to Paper theme', () => {
    render(<ThemeSwitcher />);

    const paper = screen.getByLabelText('Switch to Paper theme');
    expect(paper.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches to Golden theme on click', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByLabelText('Switch to Golden theme'));

    expect(document.documentElement.classList.contains('golden')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('colourmap-theme', 'golden');
  });

  it('switches to Night theme on click', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByLabelText('Switch to Night theme'));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('colourmap-theme', 'night');
  });

  it('removes previous theme class when switching', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByLabelText('Switch to Night theme'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await user.click(screen.getByLabelText('Switch to Golden theme'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('golden')).toBe(true);
  });

  it('loads saved theme from localStorage', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('night');
    render(<ThemeSwitcher />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
