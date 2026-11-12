// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SECTIONS } from '@/lib/city-vision';

import CityVisionPage from './page';

describe('CityVisionPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('reads as short sections, from today to a year, with a way back into the City', () => {
    render(<CityVisionPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/City of Dreams/);
    for (const s of SECTIONS) expect(screen.getByRole('heading', { name: s.title })).toBeDefined();
    expect(SECTIONS.map((s) => s.title)).toEqual(
      expect.arrayContaining(['In three months', 'In six months', 'In a year']),
    );
    expect(screen.getByRole('link', { name: 'Open the City' }).getAttribute('href')).toBe(
      '/geometry-field/city',
    );
    expect(screen.getByRole('link', { name: '← City' }).getAttribute('href')).toBe(
      '/geometry-field/city',
    );
  });
});
