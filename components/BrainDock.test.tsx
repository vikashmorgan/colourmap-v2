// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import BrainDock from './BrainDock';

afterEach(cleanup);

describe('the band along the bottom', () => {
  it('is present before anything is pressed', () => {
    /*
     * The figure used to be a block on /day, which was wrong: it is not part
     * of the day, it is the thing the day sits inside. A block scrolls past
     * and is gone; an index has to be present on every surface to mean
     * anything.
     */
    render(<BrainDock />);

    expect(screen.getByRole('button', { name: /All one brain/ })).toBeDefined();
  });

  it('keeps the figure closed until asked', () => {
    render(<BrainDock />);

    expect(screen.queryByText('Part of life')).toBeNull();
    expect(
      screen.getByRole('button', { name: /All one brain/ }).getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('opens the tree, and closes it again', () => {
    render(<BrainDock />);
    const bar = screen.getByRole('button', { name: /All one brain/ });

    fireEvent.click(bar);
    expect(screen.getByText('Part of life')).toBeDefined();
    expect(bar.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(bar);
    expect(screen.queryByText('Part of life')).toBeNull();
  });

  it('lets a keyboard out of it', () => {
    /* A panel with no keyboard way out is a trap. */
    render(<BrainDock />);

    fireEvent.click(screen.getByRole('button', { name: /All one brain/ }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByText('Part of life')).toBeNull();
  });
});

describe('two figures in one band', () => {
  it('opens on the life, because that is what the product is about', () => {
    render(<BrainDock />);
    fireEvent.click(screen.getByRole('button', { name: /All one brain/ }));

    expect(screen.getByText('Part of life')).toBeDefined();
    expect(screen.queryByTestId('app-constellation')).toBeNull();
  });

  it('switches to the apps and back', () => {
    /*
     * Two honest answers to "where am I in all this": the life, and the
     * software the life is being built out of. Different questions, so
     * different figures rather than one forced to do both.
     */
    render(<BrainDock />);
    fireEvent.click(screen.getByRole('button', { name: /All one brain/ }));

    fireEvent.click(screen.getByRole('button', { name: 'The apps' }));
    expect(screen.getByTestId('app-constellation')).toBeDefined();
    expect(screen.queryByText('Part of life')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'The life' }));
    expect(screen.getByText('Part of life')).toBeDefined();
  });

  it('names what is floating rather than leaving it as a quiet dot', () => {
    /* An isolated project is either the next thing to connect or the next
     * thing to stop. A dot is easy to look past; a sentence is not. */
    render(<BrainDock />);
    fireEvent.click(screen.getByRole('button', { name: /All one brain/ }));
    fireEvent.click(screen.getByRole('button', { name: 'The apps' }));

    const floating = screen.getByText(/Floating/i).closest('p');

    expect(floating?.textContent).toMatch(/ColourMesh/);
    expect(floating?.textContent).toMatch(/nothing depends on it/i);
  });
});
