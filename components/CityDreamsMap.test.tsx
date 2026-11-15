import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { setFly } from '@/lib/city';
import { enterAtlantis, inAtlantis, MOUTH, resetSpeedway } from '@/lib/city-speedway';
import CityDreamsMap from './CityDreamsMap';

/*
 * 2026-11-15: "put atlantis as map when u are in atlantis. with option to go back to big city."
 * (jsdom has no canvas: the drawing itself is lib/city-atlantis-map.test.ts's.)
 */

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  setFly(false, [], 0, 0);
  resetSpeedway();
});

describe('the City of Dreams’ map', () => {
  it('in the city: the city’s map, no way “back”', () => {
    render(<CityDreamsMap onClose={() => {}} />);
    expect(screen.getByLabelText('Map of the City of Dreams')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back to the city' })).toBeNull();
    expect(screen.getByText('Tap a quarter to fly there')).toBeTruthy();
  });

  it('in Atlantis: Atlantis’s map, and a quiet way back to the city', () => {
    setFly(true, [], 1 / 60, 5);
    enterAtlantis(0, MOUTH.zGate);
    const onFly = vi.fn();
    render(<CityDreamsMap onClose={() => {}} onFly={onFly} />);
    expect(screen.getByLabelText('Map of Atlantis')).toBeTruthy();
    expect(screen.getByText('Atlantis')).toBeTruthy();
    expect(screen.getByText('Tap a place to fly there')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the city' }));
    expect(inAtlantis()).toBe(false);
    expect(onFly).toHaveBeenCalledTimes(1);
  });
});
