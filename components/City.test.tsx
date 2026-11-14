import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Trip } from './TripPlayer';

// The trip player needs WebGL; here only the trip the City hands it matters.
const seen: { trip?: Trip } = {};
vi.mock('./TripPlayer', () => ({
  default: ({ trip }: { trip: Trip }) => {
    seen.trip = trip;
    return <div data-testid="trip" />;
  },
}));

import City from './City';

describe('City chapter', () => {
  it('flies without the far city on the horizon (2026-11-14: "take it off")', () => {
    render(<City />);
    expect(seen.trip).toBeDefined();
    expect(seen.trip?.farLayer).toBeUndefined();
    expect(seen.trip?.grains).toEqual({ small: 6500, large: 15000 });
  });
});
