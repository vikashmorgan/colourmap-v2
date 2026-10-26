// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { VISITS_KEY } from '@/lib/grid';

import TheGrid from './TheGrid';

describe('TheGrid', () => {
  beforeEach(() => {
    // Reduced motion: no boot and no jack-in, so opening is immediate.
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    push.mockClear();
    vi.unstubAllGlobals();
  });

  it('shows the core, the seven hubs and the two satellites', () => {
    render(<TheGrid />);
    for (const hub of ['You', 'Sound', 'Mind', 'Learn', 'Engine room', 'Play', 'Body', 'Art']) {
      expect(screen.getByRole('button', { name: `${hub} hub` })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: 'Chill Machine (separate app)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'TunnelSurfer (separate app)' })).toBeTruthy();
  });

  it('zooms into a hub and back out with Esc', () => {
    render(<TheGrid />);
    fireEvent.click(screen.getByRole('button', { name: 'Art hub' }));
    expect(screen.getByRole('link', { name: 'Geometry' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mind hub' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('application'), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Mind hub' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Geometry' })).toBeNull();
  });

  it('scans what is hovered', () => {
    render(<TheGrid />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Body hub' }));
    expect(screen.getByText('What you are running on')).toBeTruthy();
  });

  it('opens a page and remembers the visit', () => {
    render(<TheGrid />);
    fireEvent.click(screen.getByRole('button', { name: 'Mind hub' }));
    fireEvent.click(screen.getByRole('link', { name: 'Notes' }));
    expect(push).toHaveBeenCalledWith('/notebook');
    expect(JSON.parse(window.localStorage.getItem(VISITS_KEY) ?? '{}')['/notebook']).toBeTypeOf(
      'number',
    );
  });

  it('marks a page opened this week as online in its scan', () => {
    window.localStorage.setItem(VISITS_KEY, JSON.stringify({ '/day': Date.now() }));
    render(<TheGrid />);
    fireEvent.click(screen.getByRole('button', { name: 'You hub' }));
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Focus' }));
    expect(screen.getByText(/online · last opened today/i)).toBeTruthy();
  });

  it('moves between hubs with the arrow keys', () => {
    render(<TheGrid />);
    screen.getByRole('button', { name: 'You hub' }).focus();
    fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sound hub' }));
  });
});
