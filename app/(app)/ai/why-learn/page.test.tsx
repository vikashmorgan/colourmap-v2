import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WHY_LEARN_NOTES } from '@/lib/ai/why-learn';

import WhyLearnPage from './page';

describe('Why learn the real tools page', () => {
  it('shows the title, every note in order, and the way to the Coding course', () => {
    render(<WhyLearnPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Why learn the real tools' }),
    ).toBeDefined();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(WHY_LEARN_NOTES.map((n) => n.title));
    expect(screen.getByRole('link', { name: /Coding course/ }).getAttribute('href')).toBe(
      '/coding',
    );
    expect(screen.getByRole('link', { name: /← AI/ }).getAttribute('href')).toBe('/ai');
  });
});
