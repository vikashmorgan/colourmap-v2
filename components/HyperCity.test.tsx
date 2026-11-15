import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Trip, TripPage } from './TripPlayer';

// The trip player needs WebGL; here only what the piece hands it matters.
const seen: { trip?: Trip; page?: TripPage } = {};
vi.mock('./TripPlayer', async (orig) => ({
  ...(await orig<typeof import('./TripPlayer')>()),
  default: ({ trip, page }: { trip: Trip; page: TripPage }) => {
    seen.trip = trip;
    seen.page = page;
    return <div data-testid="trip" />;
  },
}));

import { HYPER_FAR, STREAK_GRAINS } from '@/lib/hyper-city';
import HyperCity from './HyperCity';
import { ART_LINKS } from './TripPlayer';

describe('Hyper-speed city', () => {
  it('hands the trip player the neon city as a far layer on every step', () => {
    render(<HyperCity />);
    expect(seen.page).toBe('hyper-city');
    expect(seen.trip?.farLayer).toBe(HYPER_FAR);
    expect(seen.trip?.farLayer?.everyStep).toBe(true);
    // A computer streaks only; a phone carries the city in its extra grains.
    expect(seen.trip?.grains?.large).toBe(STREAK_GRAINS);
    expect(seen.trip?.grains?.small).toBeGreaterThan(STREAK_GRAINS);
    expect(seen.trip?.pieces?.camera(0, 10).fov).toBeGreaterThan(55);
  });

  it('is listed in the trip player menu, after the City', () => {
    const labels = ART_LINKS.map((l) => l.label);
    expect(labels.indexOf('Hyper-speed')).toBe(labels.indexOf('City') + 1);
    expect(ART_LINKS.find((l) => l.page === 'hyper-city')?.href).toBe('/geometry-field/hyper-city');
  });
});
