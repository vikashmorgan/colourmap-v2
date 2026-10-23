// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

import GeopoliticsWorldPage from './page';

describe('/education/world route', () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
  });

  it('mounts the Geopolitics World shell', () => {
    render(<GeopoliticsWorldPage />);
    expect(screen.getByTestId('geopolitics-world')).toBeDefined();
    expect(screen.getByRole('heading', { name: /The World, walking/i })).toBeDefined();
  });
});
