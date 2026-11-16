import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The trip player needs WebGL; the page only has to hand the series to it.
vi.mock('@/components/Riverdust', () => ({ default: () => <div data-testid="riverdust" /> }));

import RiverdustPage, { metadata } from './page';

describe('Riverdust page', () => {
  it('shows the desert town series under its own title', () => {
    render(<RiverdustPage />);
    expect(screen.getByTestId('riverdust')).toBeDefined();
    expect(metadata.title).toBe('Riverdust');
    expect(String(metadata.description)).toMatch(/burgundy cloths/);
    expect(String(metadata.description)).toMatch(/race gate/);
  });
});
