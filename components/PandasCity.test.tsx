import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parsePandasCourse } from '@/lib/pandas-city';

import PandasCity from './PandasCity';

const lessons = parsePandasCourse(
  readFileSync(path.join(process.cwd(), 'content', 'pandas', 'index.html'), 'utf8'),
);

const fetchMock = vi.fn();

/** A tap: down on a place, up without moving. */
function tap(el: Element) {
  const svg = el.closest('svg') as SVGSVGElement;
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 10, clientY: 10, pointerType: 'touch' });
  fireEvent.pointerUp(svg, { pointerId: 1, clientX: 10, clientY: 10, pointerType: 'touch' });
}
const hit = (container: HTMLElement, h: string) =>
  container.querySelector(`[data-hit="${h}"]`) as Element;
/** Zoom into the map with the wheel, past the Parts depth. */
function zoomIn(container: HTMLElement) {
  const svg = container.querySelector('svg[role="application"]') as SVGSVGElement;
  act(() => {
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -1500,
        clientX: 195,
        clientY: 350,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

describe('PandasCity', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('draws the region: the plaza, 3 lit cities, 5 plots to come, and reads marks without writing any', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ marks: { 'pandas|s3|nan': 'got', 'stats|x': 'got' } }),
    });
    const { container } = render(<PandasCity lessons={lessons} />);
    expect(hit(container, 'plaza')).toBeTruthy();
    expect(container.querySelectorAll('[data-hit^="heart:"]')).toHaveLength(3);
    expect(screen.getByText('Lesson 4 · to come')).toBeTruthy();
    expect(screen.getByText('Lesson 8 · to come')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Core' }).getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/coding/marks'));
    // Only reads: never a PUT or POST.
    for (const call of fetchMock.mock.calls) expect(call[1]).toBeUndefined();

    // Zoomed in, the marked card's block is lit.
    zoomIn(container);
    await waitFor(() => {
      const nan = hit(container, 'building:3:1:nan');
      expect(nan.getAttribute('data-lit')).toBe('full');
      // Lit: a warm glow behind it and a solid warm-white square.
      expect(nan.querySelector('circle[fill="url(#cm-lit)"]')).toBeTruthy();
      expect(nan.querySelectorAll('rect')[1].getAttribute('fill')).toBe('#FFC780');
    });
  });

  it('draws the City of Dreams look: dotted light, a pulse from the centre, breathing hearts', () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { container } = render(<PandasCity lessons={lessons} />);
    const svg = container.querySelector('svg[role="application"]') as SVGSVGElement;
    // Lines are rows of dots: zero-length dashes with round caps.
    expect(svg.querySelectorAll('path[stroke-dasharray^="0 "]').length).toBeGreaterThan(50);
    // The pulse runs along the roads from the plaza, and stops for viewers who ask for less motion.
    expect(svg.querySelectorAll('path.cm-pulse').length).toBeGreaterThan(8);
    expect(container.querySelector('style')?.textContent).toContain('prefers-reduced-motion');
    expect(svg.querySelectorAll('.cm-breathe').length).toBeGreaterThan(3);
    // Each lit heart is a lattice star with a white-hot core.
    expect(hit(container, 'heart:1').querySelector('circle[fill="url(#cm-core)"]')).toBeTruthy();
    // The Dawn sky.
    expect((container.firstElementChild as HTMLElement).style.background).toContain(
      'linear-gradient',
    );
  });

  it('still draws everything unlit when the marks cannot be read', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { container } = render(<PandasCity lessons={lessons} />);
    zoomIn(container);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelectorAll('[data-hit^="building:"]').length).toBe(50);
    expect(container.querySelector('[data-lit="full"]')).toBeNull();
    expect(container.querySelector('[data-lit="none"]')).toBeTruthy();
  });

  it('at the Core depth, a tap on a city pops up its lines to remember', () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { container } = render(<PandasCity lessons={lessons} />);
    tap(hit(container, 'heart:3'));
    const box = screen.getByRole('dialog', { name: 'Lesson 3' });
    expect(box.textContent).toContain('Data quality assessment');
    expect(box.textContent).toContain('Assess before you clean: today no line changes df.');
    expect(screen.getByRole('button', { name: 'Enter the city' })).toBeTruthy();
    tap(hit(container, 'city:6'));
    expect(screen.getByRole('dialog', { name: 'Lesson 6' }).textContent).toContain('to come');
  });

  it('stacks sheets by depth: part, card, More; back and Esc pop one level', () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { container } = render(<PandasCity lessons={lessons} />);
    zoomIn(container);
    tap(hit(container, 'building:3:1:nan'));

    const sheets = () => container.querySelectorAll('section[data-depth]');
    expect([...sheets()].map((s) => s.getAttribute('data-depth'))).toEqual(['2', '3']);
    expect(
      screen.getByRole('heading', { name: 'NaN marks an empty cell, and behaves differently' }),
    ).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Where this sheet is' }).textContent).toBe(
      'Pandas› Lesson 3› Missing values› NaN marks an empty cell, and behaves differently',
    );
    expect(screen.getByRole('link', { name: 'Open in lesson ›' }).getAttribute('href')).toBe(
      '/pandas#c-3-nan',
    );

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(sheets()).toHaveLength(3);
    expect(container.textContent).toContain('Pandas skip NaN without telling you');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(sheets()).toHaveLength(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(sheets()).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Missing values' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(sheets()).toHaveLength(0);
  });

  it('opens the heart, the fountains and the shelf, and shows the legend', () => {
    fetchMock.mockResolvedValue({ ok: false });
    const { container } = render(<PandasCity lessons={lessons} />);
    zoomIn(container);
    tap(hit(container, 'heart:1'));
    expect(screen.getByRole('heading', { name: 'DataFrames and loading data' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Practice/ }));
    expect(
      screen.getByRole('link', { name: /Exercise 1 · Predict the loads/ }).getAttribute('href'),
    ).toBe('/pandas#c-1-ex-l1-e1');
    tap(hit(container, 'shelf:1'));
    expect(screen.getByRole('heading', { name: 'Cheat sheet' })).toBeTruthy();
    expect(container.textContent).toContain('read_csv');

    fireEvent.click(screen.getByRole('button', { name: 'What the shapes mean' }));
    expect(screen.getByRole('dialog', { name: 'What the shapes mean' }).textContent).toContain(
      'A part, clockwise from the gate',
    );
    expect(screen.getByRole('link', { name: '← Pandas' }).getAttribute('href')).toBe('/pandas');
  });
});
