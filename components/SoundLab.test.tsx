import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/AtomVisualizer', () => ({ default: () => null }));
vi.mock('@/components/GrooveMachine', () => ({ default: () => null }));
vi.mock('@/components/LofiLooper', () => ({ default: () => null }));
vi.mock('@/components/MagicMaker', () => ({ default: () => null }));

import { CHILL_URL } from '@/lib/chill/url';

import SoundLab from './SoundLab';

describe('SoundLab', () => {
  it('opens the Chill Machine app from its tab instead of embedding the old one', () => {
    // jsdom has no scrollTo; the tab strip centres the active tab with it.
    HTMLElement.prototype.scrollTo = vi.fn();
    render(<SoundLab />);
    const link = screen.getByRole('link', { name: /Open the Chill Machine/ });
    expect(link.getAttribute('href')).toBe(CHILL_URL);
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
