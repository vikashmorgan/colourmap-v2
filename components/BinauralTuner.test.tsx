// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BinauralTuner from './BinauralTuner';

vi.mock('@/components/AtomVisualizer', () => ({
  default: () => null,
}));

vi.mock('@/components/InfoTooltip', () => ({
  default: () => null,
}));

vi.mock('@/components/VoiceProviderSelector', () => ({
  default: () => null,
}));

vi.mock('@/lib/hooks/use-tts', () => ({
  useTTS: () => ({ speak: vi.fn(), stop: vi.fn() }),
}));

vi.mock('@/lib/sample-pack', () => ({
  playSampledNote: vi.fn(),
}));

const pads = () => within(screen.getByRole('group', { name: 'Pad colours' }));

describe('BinauralTuner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the long soft mood buttons in simple mode', () => {
    render(<BinauralTuner />);

    expect(screen.getByRole('button', { name: /Relax light cloud/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Focus clear air/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Sleep deep cloud/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Still one quiet horizon/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Ground deeper/i })).toBeDefined();
  });

  it('lets a long soft mood be selected without leaving simple mode', () => {
    render(<BinauralTuner />);

    fireEvent.click(screen.getByRole('button', { name: /Sleep deep cloud/i }));

    expect(screen.getByRole('button', { name: /studio/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Sleep deep cloud/i })).toBeDefined();
  });

  it('lets the pad colours switch palette and remembers the choice', () => {
    render(<BinauralTuner />);
    fireEvent.click(screen.getByRole('button', { name: /^studio$/i }));

    const earth = pads().getByRole('button', { name: 'Earth' });
    expect(earth.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(pads().getByRole('button', { name: 'Rainbow' }));

    expect(pads().getByRole('button', { name: 'Rainbow' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(localStorage.getItem('colourmap:pad-palette')).toBe('rainbow');
  });

  it('restores a saved palette on load', () => {
    localStorage.setItem('colourmap:pad-palette', 'night');
    render(<BinauralTuner />);
    fireEvent.click(screen.getByRole('button', { name: /^studio$/i }));

    expect(pads().getByRole('button', { name: 'Night' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('groups the studio into sound, visuals, song and + more', () => {
    render(<BinauralTuner />);
    fireEvent.click(screen.getByRole('button', { name: /^studio$/i }));

    for (const name of ['sound', 'visuals', 'song', '+ more']) {
      expect(screen.getByRole('region', { name })).toBeDefined();
    }
    expect(screen.getByRole('button', { name: /^beats/i })).toBeDefined();
  });

  it('opens the notes notepad from the pinned bar', () => {
    render(<BinauralTuner />);
    fireEvent.click(screen.getByRole('button', { name: /^notes$/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});
