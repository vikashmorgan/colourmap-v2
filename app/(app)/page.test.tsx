// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/CheckInForm', () => ({
  default: () => <div data-testid="check-in-form">CheckInForm</div>,
}));

vi.mock('@/components/CheckInHistory', () => ({
  default: () => <div data-testid="check-in-history">History</div>,
}));

vi.mock('@/components/MissionTracker', () => ({
  default: () => <div data-testid="mission-tracker">MissionTracker</div>,
}));

vi.mock('@/components/BackOfMind', () => ({
  default: () => <div data-testid="back-of-mind">BackOfMind</div>,
}));

vi.mock('@/components/CockpitSection', () => ({
  default: () => <div data-testid="cockpit-sections">Sections</div>,
}));

vi.mock('@/components/CollapsibleCard', () => ({
  default: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }) => <div data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}>{children}</div>,
}));

import CockpitPage from './page';

describe('CockpitPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders all sections', () => {
    render(<CockpitPage />);

    expect(screen.getByTestId('check-in-form')).toBeDefined();
    expect(screen.getByTestId('check-in-history')).toBeDefined();
    expect(screen.getByTestId('mission-tracker')).toBeDefined();
    expect(screen.getByTestId('back-of-mind')).toBeDefined();
    expect(screen.getByTestId('cockpit-sections')).toBeDefined();
  });
});
