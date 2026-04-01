// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/CheckInForm', () => ({
  default: ({ onCheckInComplete }: { onCheckInComplete?: () => void }) => (
    <button type="button" data-testid="check-in-form" onClick={onCheckInComplete}>
      CheckInForm
    </button>
  ),
}));

vi.mock('@/components/CheckInHistory', () => ({
  default: ({ refreshKey }: { refreshKey: number }) => (
    <div data-testid="check-in-history">History {refreshKey}</div>
  ),
}));

vi.mock('@/components/MissionTracker', () => ({
  default: () => <div data-testid="mission-tracker">MissionTracker</div>,
}));

vi.mock('@/components/BackOfMind', () => ({
  default: () => <div data-testid="back-of-mind">BackOfMind</div>,
}));

import CockpitPage from './page';

describe('CockpitPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all sections', () => {
    render(<CockpitPage />);

    expect(screen.getByTestId('check-in-form')).toBeDefined();
    expect(screen.getByTestId('check-in-history')).toBeDefined();
    expect(screen.getByTestId('mission-tracker')).toBeDefined();
    expect(screen.getByTestId('back-of-mind')).toBeDefined();
  });
});
