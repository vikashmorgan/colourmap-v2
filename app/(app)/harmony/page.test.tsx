// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HarmonyPage from './page';

describe('/harmony route', () => {
  afterEach(cleanup);

  it('mounts the harmony machine or its loading placeholder', () => {
    render(<HarmonyPage />);
    const loaded = screen.queryByTestId('harmony-machine');
    const loading = screen.queryByText(/Loading the planet/i);
    expect(loaded ?? loading).not.toBeNull();
  });
});
