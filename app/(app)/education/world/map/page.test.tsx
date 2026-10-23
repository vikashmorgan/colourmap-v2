// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import GeopoliticsMapPage from './page';

describe('/education/world/map route', () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
  });

  it('mounts and shows either the Leaflet map or its loading placeholder', () => {
    render(<GeopoliticsMapPage />);
    const loaded = screen.queryByTestId('geopolitics-leaflet-map');
    const loading = screen.queryByText(/Loading map/i);
    expect(loaded ?? loading).not.toBeNull();
  });
});
