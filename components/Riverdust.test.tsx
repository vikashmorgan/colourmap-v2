import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Trip, TripPage } from './TripPlayer';

// The trip player needs WebGL; here only what the series hands it matters.
const seen: { trip?: Trip; page?: TripPage } = {};
vi.mock('./TripPlayer', async (orig) => ({
  ...(await orig<typeof import('./TripPlayer')>()),
  default: ({ trip, page }: { trip: Trip; page: TripPage }) => {
    seen.trip = trip;
    seen.page = page;
    return <div data-testid="trip" />;
  },
}));

import { CATEGORIES } from '@/lib/riverdust-designs';
import Riverdust from './Riverdust';
import { ART_LINKS, variantsAt } from './TripPlayer';

describe('Riverdust', () => {
  it('hands the trip player one piece a category, its designs as pills for ↑ ↓', () => {
    render(<Riverdust />);
    expect(seen.page).toBe('riverdust');
    expect(seen.trip?.phases.map((p) => p.name)).toEqual(CATEGORIES.map((c) => c.name));
    const v = seen.trip?.pieces?.variants;
    for (const [k, c] of CATEGORIES.entries()) {
      expect(variantsAt(v, k)).toEqual(c.designs.map((d) => d.name));
    }
    expect(seen.trip?.backgrounds?.[0]?.name).toBe('Dusk');
  });

  it('is listed in the trip player menu, after the Hyper-speed city', () => {
    const labels = ART_LINKS.map((l) => l.label);
    expect(labels.indexOf('Riverdust')).toBe(labels.indexOf('Hyper-speed') + 1);
    expect(ART_LINKS.find((l) => l.page === 'riverdust')?.href).toBe('/geometry-field/riverdust');
  });
});
