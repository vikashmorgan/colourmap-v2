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

import CockpitPage from './page';

describe('CockpitPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the cockpit content with check-in form, history, and life scan placeholder', () => {
    render(<CockpitPage />);

    expect(screen.getByText('Your life balance will land here.')).toBeDefined();
    expect(screen.getByTestId('check-in-form')).toBeDefined();
    expect(screen.getByTestId('check-in-history')).toBeDefined();
    expect(screen.getByText('Life scan radar')).toBeDefined();
  });
});
