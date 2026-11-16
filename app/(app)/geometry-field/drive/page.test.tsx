import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The game needs WebGL; the page only has to hand it over.
vi.mock('@/components/DriveGame', () => ({ default: () => <div data-testid="drive-game" /> }));

import DrivePage, { metadata } from './page';

describe('Drive page', () => {
  it('shows the game under its own title', () => {
    render(<DrivePage />);
    expect(screen.getByTestId('drive-game')).toBeDefined();
    expect(metadata.title).toBe('Drive');
    expect(String(metadata.description)).toMatch(/Salt Flat/);
  });
});
