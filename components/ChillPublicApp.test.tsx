// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useChillAccount } from './ChillAccountContext';

vi.mock('@/components/BinauralTuner', () => ({
  default: function TunerProbe() {
    const { user } = useChillAccount();
    return <div data-testid="tuner">{user ? user.email : 'guest'}</div>;
  },
}));

import ChillPublicApp from './ChillPublicApp';

describe('ChillPublicApp', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Chill Machine for a guest', () => {
    render(<ChillPublicApp user={null} />);
    expect(screen.getByTestId('tuner').textContent).toBe('guest');
  });

  it('shares the signed-in account through ChillAccountContext', () => {
    render(<ChillPublicApp user={{ id: 'u1', email: 'a@b.co' }} />);
    expect(screen.getByTestId('tuner').textContent).toBe('a@b.co');
  });
});
