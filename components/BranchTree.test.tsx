// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BRANCH_LABELS, weightOf } from '@/lib/branches';
import BranchTree, { RECEDED_LEGIBILITY_FLOOR, totalSurfaces } from './BranchTree';

afterEach(cleanup);

describe('the whole, before any part', () => {
  it('names all three branches without being asked', () => {
    render(<BranchTree />);

    for (const label of Object.values(BRANCH_LABELS)) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeDefined();
    }
  });

  it('keeps the centre out of the branches and above them', () => {
    /*
     * The load-bearing decision from lib/branches.ts, rendered. Check-in and
     * the notebook are the middle; if they ever appear as a fourth limb the
     * product has lost its subject.
     */
    render(<BranchTree />);

    expect(screen.getByText('How you are')).toBeDefined();
    expect(screen.queryByRole('button', { name: /How you are/ })).toBeNull();
  });

  it('shows no group rows until a branch is opened', () => {
    render(<BranchTree />);

    expect(screen.queryByText('Writing')).toBeNull();
    expect(screen.queryByText('Money')).toBeNull();
  });
});

describe('focusing a branch', () => {
  it('opens its groups', () => {
    render(<BranchTree />);

    fireEvent.click(screen.getByRole('button', { name: /Art/ }));

    expect(screen.getByText('Writing')).toBeDefined();
    expect(screen.getByText('Visual')).toBeDefined();
    expect(screen.getByText('Music')).toBeDefined();
  });

  it('makes the others recede rather than disappear', () => {
    /*
     * THE RULE THIS COMPONENT EXISTS TO HOLD.
     *
     * A reader who cannot see what they turned away from has been navigated,
     * not oriented. So the unfocused branches must still be in the document
     * and still be readable — dimmed, never removed and never at zero.
     */
    render(<BranchTree initialFocus="art" />);

    const admin = screen.getByRole('button', { name: /Admin/ });
    const limb = admin.closest('article');

    expect(limb).not.toBeNull();
    const opacity = Number((limb as HTMLElement).style.opacity);
    /*
     * Both bounds matter and they pull opposite ways. Below the floor the
     * label stops clearing contrast on what is still a button; at 1 nothing
     * has receded and the focus did nothing.
     */
    expect(opacity).toBeGreaterThanOrEqual(RECEDED_LEGIBILITY_FLOOR);
    expect(opacity).toBeLessThan(1);
  });

  it('lets the reader get back to the whole', () => {
    render(<BranchTree initialFocus="art" />);

    fireEvent.click(screen.getByRole('button', { name: 'Whole' }));

    expect(screen.queryByText('Writing')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Whole' })).toBeNull();
  });

  it('forks Admin into its two halves, and nothing else forks', () => {
    render(<BranchTree initialFocus="admin" />);

    expect(screen.getByText('Life admin')).toBeDefined();
    expect(screen.getByText('Professional')).toBeDefined();

    cleanup();
    render(<BranchTree initialFocus="energy" />);
    expect(screen.queryByText('Life admin')).toBeNull();
  });
});

describe('what the figure admits', () => {
  it('says in words that Life admin is empty', () => {
    /*
     * THIS ASSERTION IS MEANT TO START FAILING.
     *
     * Insurance, payments and the people owed a reply are the heaviest part of
     * the owner's week and have no surface in this app. The figure says so
     * rather than drawing three limbs that look equally full.
     *
     * When Life admin gains a real surface this breaks. Whoever breaks it
     * should update the expectation, not delete it.
     */
    render(<BranchTree initialFocus="admin" />);

    expect(screen.getByText(/this is where the week actually goes/i)).toBeDefined();
  });

  it('does not print that sentence over a half that has surfaces', () => {
    render(<BranchTree initialFocus="admin" />);

    expect(screen.getAllByText(/this is where the week actually goes/i)).toHaveLength(1);
  });

  it('marks an empty group with a dash rather than a zero', () => {
    /*
     * A zero is a score. A dash is an absence. The product does not rank, so
     * it does not print numbers that invite comparison to other numbers.
     */
    render(<BranchTree initialFocus="art" />);

    const writing = screen.getByText('Writing').parentElement as HTMLElement;
    expect(within(writing).getByText('—')).toBeDefined();
  });

  it('counts every surface exactly once across the three branches', () => {
    const summed = weightOf('art') + weightOf('admin') + weightOf('energy');

    expect(totalSurfaces()).toBe(summed);
  });
});
