import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/drive/DriveWindow', () => ({
  default: () => <div data-testid="drive-window" />,
}));

import DriveWindowPage, { metadata } from './page';

describe('Drive window page', () => {
  it('hands over the autopilot view', () => {
    render(<DriveWindowPage />);
    expect(screen.getByTestId('drive-window')).toBeDefined();
    expect(String(metadata.title)).toMatch(/autopilot/);
  });
});
