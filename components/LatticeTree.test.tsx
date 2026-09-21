// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BRANCH_LABELS } from '@/lib/branches';
import LatticeTree from './LatticeTree';

afterEach(cleanup);

describe('the whole tree', () => {
  it('names the three rings, so a level is never an unexplained depth', () => {
    render(<LatticeTree />);

    expect(screen.getByText('Part of life')).toBeDefined();
    expect(screen.getByText('Kind of thing')).toBeDefined();
    expect(screen.getByText('The specific thing')).toBeDefined();
  });

  it('offers a real button per branch, not just a drawing', () => {
    /*
     * An SVG group cannot be a native button, so the drawing is a pointer
     * convenience and the chips carry the keyboard. If these disappear the
     * figure becomes pointer-only.
     */
    render(<LatticeTree />);

    for (const label of Object.values(BRANCH_LABELS)) {
      expect(screen.getByRole('button', { name: label })).toBeDefined();
    }
    expect(screen.getByRole('button', { name: 'The whole tree' })).toBeDefined();
  });

  it('keeps the specific things hidden until a branch is opened', () => {
    render(<LatticeTree />);

    expect(screen.queryByText('Geometry field')).toBeNull();
  });
});

describe('bringing a branch forward', () => {
  it('opens its groupings and their specific things', () => {
    render(<LatticeTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Art' }));

    expect(screen.getByText(/^Visual/)).toBeDefined();
    expect(screen.getByText('Geometry field')).toBeDefined();
  });

  it('hides the ring names once a branch is chosen, so labels stop competing', () => {
    render(<LatticeTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Energy' }));

    expect(screen.queryByText('Part of life')).toBeNull();
  });

  it('says what it left out rather than truncating in silence', () => {
    /*
     * The figure draws at most four specific things per grouping. Visual has
     * nine. A figure that showed four and said nothing would read as complete.
     */
    render(<LatticeTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Art' }));

    expect(screen.getByText(/^\+\d+ more$/)).toBeDefined();
  });

  it('lets the reader back out to the whole', () => {
    render(<LatticeTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    fireEvent.click(screen.getByRole('button', { name: 'The whole tree' }));

    expect(screen.getByText('Part of life')).toBeDefined();
  });

  it('names the fork when Admin is the one open', () => {
    render(<LatticeTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));

    /* Three groupings on each side of the fork, each naming its half. */
    expect(screen.getAllByText(/· Life admin$/)).toHaveLength(3);
    expect(screen.getAllByText(/· Professional$/)).toHaveLength(3);
  });
});
