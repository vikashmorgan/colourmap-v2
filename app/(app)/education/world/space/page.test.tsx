// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import GeopoliticsSpacePage from './page';

describe('/education/world/space route', () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
  });

  it('mounts the 3D space surface or its loading placeholder', () => {
    render(<GeopoliticsSpacePage />);
    const loaded = screen.queryByTestId('geopolitics-space');
    const loading = screen.queryByText(/Loading space/i);
    expect(loaded ?? loading).not.toBeNull();
  });
});
