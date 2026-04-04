// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeSwitcher from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the Design toggle button', () => {
    render(<ThemeSwitcher />);

    expect(screen.getByText('Design')).toBeDefined();
  });

  it('shows color theme options when opened', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByText('Design'));

    expect(screen.getByText('Paper')).toBeDefined();
    expect(screen.getByText('Golden')).toBeDefined();
    expect(screen.getByText('Night')).toBeDefined();
  });

  it('switches to Golden theme on click', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByText('Design'));
    await user.click(screen.getByText('Golden'));

    expect(document.documentElement.classList.contains('golden')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('colourmap-theme', 'golden');
  });

  it('switches to Night theme on click', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByText('Design'));
    await user.click(screen.getByText('Night'));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('colourmap-theme', 'night');
  });

  it('removes previous theme class when switching', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    // Apply Night theme
    await user.click(screen.getByText('Design'));
    await user.click(screen.getByText('Night'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Menu may close after click, reopen and switch to Golden
    if (!screen.queryByText('Golden')) {
      await user.click(screen.getByText('Design'));
    }
    await user.click(screen.getByText('Golden'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('golden')).toBe(true);
  });

  it('loads saved theme from localStorage', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('night');
    render(<ThemeSwitcher />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows Typography tab when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByText('Design'));
    await user.click(screen.getByText('Typography'));

    expect(screen.getByText('Normal')).toBeDefined();
    expect(screen.getByText('Cowboy')).toBeDefined();
    expect(screen.getByText('Groovy')).toBeDefined();
    expect(screen.getByText('Minimal')).toBeDefined();
  });
});
