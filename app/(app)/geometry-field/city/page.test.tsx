import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The trip player needs WebGL; the page only has to hand the City chapter to it.
vi.mock('@/components/City', () => ({ default: () => <div data-testid="city-chapter" /> }));

import CityPage, { metadata } from './page';

describe('City page', () => {
  it('shows the City chapter under its own title', () => {
    render(<CityPage />);
    expect(screen.getByTestId('city-chapter')).toBeDefined();
    expect(metadata.title).toBe('City');
    expect(String(metadata.description)).toMatch(/Chinatown/);
  });
});
