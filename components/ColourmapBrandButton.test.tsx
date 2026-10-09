// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import ColourmapBrandButton from './ColourmapBrandButton';

describe('ColourmapBrandButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the trigger as a button with the brand name', () => {
    render(<ColourmapBrandButton />);
    const trigger = screen.getByRole('button', { name: 'Colour Brain' });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('title')).toBe('About Colour Brain');
  });

  it('is closed by default (aria-expanded=false, no dialog in the DOM)', () => {
    render(<ColourmapBrandButton />);
    const trigger = screen.getByRole('button', { name: 'Colour Brain' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the dialog on click and shows credits', () => {
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));
    const dialog = screen.getByRole('dialog', { name: /about colour brain/i });
    expect(dialog).toBeDefined();
    expect(screen.getByText('Vikash and Martin')).toBeDefined();
  });

  it('shows the 3D shortcuts in the title menu', () => {
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));

    expect(screen.getByRole('link', { name: '3D Figures' }).getAttribute('href')).toBe('/figures');
    expect(screen.getByRole('link', { name: 'Figure Stars' }).getAttribute('href')).toBe(
      '/figure-stars',
    );
    expect(screen.getByRole('link', { name: 'Billy 3D' }).getAttribute('href')).toBe(
      '/figures?mode=billy',
    );
    expect(screen.getByRole('link', { name: 'Buddha Boy' }).getAttribute('href')).toBe(
      '/figures?mode=static&figure=kid-lotus',
    );
    expect(screen.getByRole('link', { name: 'Proportion Buddy' }).getAttribute('href')).toBe(
      '/proportion-buddy',
    );
  });

  it('closes the dialog when the close button is clicked', () => {
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the dialog on Escape key', () => {
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes the dialog when the backdrop itself is clicked', () => {
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));
    const dialog = screen.getByRole('dialog');
    // Click the backdrop (the dialog element itself, not its inner content)
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the door to the admin document', () => {
  afterEach(cleanup);

  it('is behind the title, where you already press to ask where you stand', () => {
    render(<ColourmapBrandButton />);

    /* Not reachable until the dialog is open — the title is the only way in. */
    expect(screen.queryByRole('link', { name: /ce que tu dois faire/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));

    expect(screen.getByRole('link', { name: /ce que tu dois faire/i })).toBeDefined();
  });

  it('points at a URL rather than a file, so the phone can reach it', () => {
    /*
     * The document lives on the Desktop and is deployed from there. A file://
     * path would work on exactly one machine, which is the machine this whole
     * workflow exists to stop depending on.
     */
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));

    const link = screen.getByRole('link', { name: /ce que tu dois faire/i });
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
  });

  it('opens in its own tab without handing over the opener', () => {
    render(<ColourmapBrandButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Colour Brain' }));

    const link = screen.getByRole('link', { name: /ce que tu dois faire/i });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });
});
