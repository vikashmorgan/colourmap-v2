import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FERRARI_FELT,
  FERRARI_IMMERSIVE,
  FERRARI_QUOTES,
  FERRARI_SECTIONS,
  FERRARI_THESIS,
} from '@/lib/proposals/ferrari';

import FerrariPitchPage from './page';

describe('Ferrari pitch page', () => {
  afterEach(cleanup);

  it('opens on the thesis and walks the six movements in order', () => {
    render(<FerrariPitchPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Technique and spirit' })).toBeDefined();
    // the thesis opens and closes the pitch
    expect(screen.getAllByText(FERRARI_THESIS)).toHaveLength(2);
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(FERRARI_SECTIONS.map((s) => s.title));
  });

  it('shows the Flow collection as the project, the Dino story, the quotes and what is left to do', () => {
    render(<FerrariPitchPage />);
    expect(screen.getByRole('heading', { level: 2, name: 'AI Sculptures · Flow' })).toBeDefined();
    expect(screen.getByRole('link', { name: /See the collection/ }).getAttribute('href')).toBe(
      '/art/flow',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Dino' })).toBeDefined();
    for (const q of FERRARI_QUOTES) expect(screen.getByText(`“${q.text}”`)).toBeDefined();
    expect(screen.getByText(/I don't sell cars; I sell engines\./)).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'To finish' })).toBeDefined();
  });

  it('adds the felt line and the immersive museum room', () => {
    render(<FerrariPitchPage />);
    expect(screen.getByRole('heading', { level: 2, name: FERRARI_FELT })).toBeDefined();
    const senses = screen.getByRole('list', { name: 'The senses' });
    expect(senses.querySelectorAll('li')).toHaveLength(FERRARI_IMMERSIVE.senses.length);
  });
});
