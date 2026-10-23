// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import ChillGroup, { CHILL_GROUP_LS, ChillModule } from './ChillGroup';

describe('ChillGroup', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('folds and unfolds its children and remembers the choice', () => {
    render(
      <ChillGroup id="sound" label="sound" summary="3 pads">
        <p>inside</p>
      </ChillGroup>,
    );
    const header = screen.getByRole('button', { name: /sound/i });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('inside')).toBeDefined();
    expect(screen.queryByText(/3 pads/)).toBeNull();

    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('inside')).toBeNull();
    expect(screen.getByText(/3 pads/)).toBeDefined();
    expect(localStorage.getItem(`${CHILL_GROUP_LS}sound`)).toBe('0');
  });

  it('restores a saved state and honours defaultOpen', () => {
    localStorage.setItem(`${CHILL_GROUP_LS}more`, '1');
    render(
      <ChillGroup id="more" label="+ more" defaultOpen={false}>
        <p>extra</p>
      </ChillGroup>,
    );
    expect(screen.getByText('extra')).toBeDefined();
  });

  it('starts closed when defaultOpen is false and nothing is saved', () => {
    render(
      <ChillGroup id="song" label="song" defaultOpen={false}>
        <p>timeline</p>
      </ChillGroup>,
    );
    expect(screen.queryByText('timeline')).toBeNull();
  });
});

describe('ChillModule', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('starts folded with its summary and opens on click, remembering it', () => {
    render(
      <ChillModule id="beats" label="beats" summary="124 · Melodic">
        <p>grid</p>
      </ChillModule>,
    );
    const header = screen.getByRole('button', { name: /beats · 124 · Melodic/i });
    expect(screen.queryByText('grid')).toBeNull();
    fireEvent.click(header);
    expect(screen.getByText('grid')).toBeDefined();
    expect(header.textContent).not.toContain('124');
    expect(localStorage.getItem(`${CHILL_GROUP_LS}module:beats`)).toBe('1');
  });

  it('restores a saved open state', () => {
    localStorage.setItem(`${CHILL_GROUP_LS}module:look`, '1');
    render(
      <ChillModule id="look" label="look">
        <p>canvas</p>
      </ChillModule>,
    );
    expect(screen.getByText('canvas')).toBeDefined();
  });
});
