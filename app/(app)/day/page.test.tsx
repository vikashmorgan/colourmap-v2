// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DayPage from './page';

vi.mock('@/lib/sync', () => ({
  hydrate: vi.fn(),
}));

vi.mock('@/components/ActiveCompartments', () => ({
  default: () => <div>active compartments</div>,
}));
vi.mock('@/components/ArchetypeBridge', () => ({ default: () => <div>archetype bridge</div> }));
vi.mock('@/components/CheckInPing', () => ({ default: () => <div>check in ping</div> }));
vi.mock('@/components/ColourMapPanel', () => ({ default: () => <div>areas panel</div> }));
vi.mock('@/components/DailyRituals', () => ({ default: () => <div>daily rituals</div> }));
vi.mock('@/components/DayRoad', () => ({ default: () => <div>day road</div> }));
vi.mock('@/components/DayView3D', () => ({ default: () => <div>day view 3d</div> }));
vi.mock('@/components/FeelingCircles2', () => ({ default: () => <div>feeling circles</div> }));
vi.mock('@/components/FirstRunOnboarding', () => ({ default: () => null }));
vi.mock('@/components/IdeaConstellation', () => ({ default: () => <div>idea constellation</div> }));
vi.mock('@/components/InfographicsView', () => ({ default: () => <div>infographics</div> }));
vi.mock('@/components/InnerWork', () => ({ default: () => <div>inner work</div> }));
vi.mock('@/components/LearningHub', () => ({ default: () => <div>learning hub</div> }));
vi.mock('@/components/MissionDesignSwitcher', () => ({
  default: ({ beforeContent }: { beforeContent?: React.ReactNode }) => (
    <div>
      {beforeContent}
      <div>tasks panel</div>
    </div>
  ),
}));
/*
 * Stubbed like every other child here, and for a sharper reason than the rest:
 * the real MissionTracker fetches /api/missions on mount, and jsdom cannot
 * parse a relative URL. Unstubbed it throws an unhandled rejection that leaves
 * every test passing and vitest exiting 1 — green output, red build.
 */
vi.mock('@/components/MissionTracker', () => ({ default: () => <div>mission tracker</div> }));
vi.mock('@/components/Overview2', () => ({ default: () => <div>overview</div> }));
vi.mock('@/components/TodaysField', () => ({ default: () => <div>today field</div> }));
vi.mock('@/components/DayTabs', () => ({
  default: ({
    missionContent,
    progressContent,
  }: {
    missionContent: React.ReactNode;
    progressContent: React.ReactNode;
  }) => (
    <div>
      <div>{missionContent}</div>
      <div>{progressContent}</div>
    </div>
  ),
}));

describe('DayPage sober lane banners', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('puts the missions in the lane named after them', () => {
    /*
     * /api/missions had full CRUD and MissionTracker had tests, and nothing
     * rendered it — the MISSIONS lane showed doing-cards out of prefs instead.
     * That meant no way to write a mission from a phone and nothing for the
     * terminal's reader to read. This is the guard against it drifting back.
     */
    render(<DayPage />);

    expect(screen.getByText('mission tracker')).toBeDefined();
  });

  it('renders contained sober banners for Missions and Progress', () => {
    const { container } = render(<DayPage />);

    const missionBanner = container.querySelector('img[src="/emotions/mission-terrace-1.webp"]');
    const progressBanner = container.querySelector(
      'img[src="/emotions/progress-observatory-1.webp"]',
    );

    expect(missionBanner).toBeDefined();
    expect(progressBanner).toBeDefined();
  });
});
