// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SAVED_KEY } from '@/lib/geometry-saved';

import SavedLooks from './SavedLooks';

const current = {
  mode: 'rorschach',
  values: {
    symmetry: 6,
    complexity: 5,
    glow: 2,
    breathSpeed: 0.3,
    intensity: 7,
    particles: 4,
    luminous: 0.8,
    stars: 0,
  },
};

function setup() {
  const onApply = vi.fn();
  render(
    <SavedLooks
      current={current}
      baseName="Rorschach Oils"
      onApply={onApply}
      accent="#c4a060"
      accentMid="#c4a06055"
      dim="#888"
    />,
  );
  return onApply;
}

describe('SavedLooks', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it('shows the first oil fractal, which cannot be deleted', () => {
    const onApply = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Oil Fractal 1' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'rorschach', name: 'Oil Fractal 1' }),
    );
    expect(screen.queryByRole('button', { name: 'Delete Oil Fractal 1' })).toBeNull();
  });

  it('saves what is on screen, keeps it, and deletes it', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '+ Save' }));
    expect(screen.getByRole('button', { name: 'Rorschach Oils 1' })).toBeTruthy();
    const stored = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]');
    expect(stored[0].values).toEqual(current.values);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Rorschach Oils 1' }));
    expect(screen.queryByRole('button', { name: 'Rorschach Oils 1' })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]')).toEqual([]);
  });

  it('brings back looks saved on an earlier visit', () => {
    window.localStorage.setItem(
      SAVED_KEY,
      JSON.stringify([
        { id: 'look-1', name: 'Night Oil', mode: 'oilwarp', values: current.values },
      ]),
    );
    setup();
    expect(screen.getByRole('button', { name: 'Night Oil' })).toBeTruthy();
  });
});
