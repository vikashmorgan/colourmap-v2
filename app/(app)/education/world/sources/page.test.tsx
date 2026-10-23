// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import DataSourcesGardenPage from './page';

describe('/education/world/sources route', () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
  });

  it('mounts the data sources garden', () => {
    render(<DataSourcesGardenPage />);
    expect(screen.getByTestId('data-sources-garden')).toBeDefined();
  });
});
