import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/DriveGame', () => ({
  default: () => <div data-testid="drive-game" />,
}));

import PlayPage, { metadata } from './page';

describe('Play page', () => {
  it('is the drive game on its own', () => {
    render(<PlayPage />);
    expect(screen.getByTestId('drive-game')).toBeDefined();
    expect(String(metadata.title)).toBe('Colour Drive');
  });
});
