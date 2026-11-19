import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const engine = {
  setAutopilot: vi.fn(),
  setWorld: vi.fn(),
  resize: vi.fn(),
  start: vi.fn(),
  dispose: vi.fn(),
};
vi.mock('@/components/drive/engine', () => ({
  DriveEngine: class {
    constructor() {
      // biome-ignore lint/correctness/noConstructorReturn: hands the shared mock over.
      return engine;
    }
  },
}));

import DriveWindow, { TOUR, TOUR_STAY } from './DriveWindow';

describe('the porthole view', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('drives itself and tours the worlds, naming each', () => {
    vi.useFakeTimers();
    render(<DriveWindow />);
    expect(engine.setAutopilot).toHaveBeenCalledWith(true);
    expect(engine.start).toHaveBeenCalled();
    expect(screen.getByTestId('drive-window').textContent).toBe('Coast Road');
    act(() => vi.advanceTimersByTime(TOUR_STAY * 1000));
    expect(engine.setWorld).toHaveBeenCalledWith(TOUR[1]);
    expect(screen.getByTestId('drive-window').textContent).toBe('Sky Canyon');
  });
});
