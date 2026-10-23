// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet', () => ({
  default: { Icon: { Default: { prototype: {} } } },
}));

type Handlers = { click?: () => void };
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="leaflet-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: ({ children, eventHandlers }: { children?: ReactNode; eventHandlers?: Handlers }) => (
    <button type="button" data-testid="polyline" onClick={eventHandlers?.click}>
      {children}
    </button>
  ),
  CircleMarker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="circle-marker">{children}</div>
  ),
  Tooltip: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { AVAILABLE_WEEKS, CHOKEPOINTS, MOVEMENTS } from '@/lib/geopolitics-map';
import GeopoliticsLeafletMap from './GeopoliticsLeafletMap';

const thisWeek = MOVEMENTS.filter((m) => m.weekIso === AVAILABLE_WEEKS[0]);

describe('GeopoliticsLeafletMap', () => {
  afterEach(() => cleanup());

  it('renders every chokepoint and this week’s movements', () => {
    render(<GeopoliticsLeafletMap />);
    expect(screen.getByTestId('geopolitics-leaflet-map')).toBeDefined();
    expect(screen.getByTestId('leaflet-map-container')).toBeDefined();
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(CHOKEPOINTS.length);
    expect(screen.queryAllByTestId('polyline')).toHaveLength(thisWeek.length);
  });

  it('hides a layer’s movements when its toggle is switched off', () => {
    render(<GeopoliticsLeafletMap />);
    const toggle = screen.getByTestId('layer-military');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    const nonMilitary = thisWeek.filter((m) => m.layer !== 'military').length;
    expect(screen.queryAllByTestId('polyline')).toHaveLength(nonMilitary);
  });

  it('opens the linked page from a chokepoint popup and from a movement', () => {
    const onOpenPage = vi.fn();
    render(<GeopoliticsLeafletMap onOpenPage={onOpenPage} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Read why/i })[0]);
    expect(onOpenPage).toHaveBeenCalledWith(CHOKEPOINTS[0].pageSlug);
    fireEvent.click(screen.getAllByTestId('polyline')[0]);
    expect(onOpenPage).toHaveBeenLastCalledWith(thisWeek[0].pageSlug);
  });
});
