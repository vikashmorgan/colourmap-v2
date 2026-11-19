import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The Garage needs WebGL; the page only has to hand it over.
vi.mock('@/components/Garage', () => ({ default: () => <div data-testid="garage" /> }));

import GaragePage, { metadata } from './page';

describe('Garage page', () => {
  it('shows the Garage under its own title', () => {
    render(<GaragePage />);
    expect(screen.getByTestId('garage')).toBeDefined();
    expect(metadata.title).toBe('Garage');
    expect(String(metadata.description)).toMatch(/turntable/);
  });
});
