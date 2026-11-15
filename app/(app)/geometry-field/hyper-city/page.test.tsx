import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The trip player needs WebGL; the page only has to hand the piece to it.
vi.mock('@/components/HyperCity', () => ({ default: () => <div data-testid="hyper-city" /> }));

import HyperCityPage, { metadata } from './page';

describe('Hyper-speed city page', () => {
  it('shows the piece under its own title', () => {
    render(<HyperCityPage />);
    expect(screen.getByTestId('hyper-city')).toBeDefined();
    expect(metadata.title).toBe('Hyper-speed city');
    expect(String(metadata.description)).toMatch(/straight line/);
  });
});
