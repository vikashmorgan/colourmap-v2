import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { onRacing, PORTHOLE_SRC, Porthole } from './Porthole';

describe('the porthole', () => {
  it('opens on the racing part of the map only', () => {
    expect(onRacing('grid|tree|art|worlds', null)).toBe(true);
    expect(onRacing('grid|tree|art|play', null)).toBe(true);
    expect(onRacing('', 'play')).toBe(true);
    expect(onRacing('grid|tree|art|visual', null)).toBe(false);
    expect(onRacing('', 'mind')).toBe(false);
  });

  it('shows Drive on autopilot, and opens Drive when tapped', () => {
    const open = vi.fn();
    render(<Porthole onOpen={open} />);
    expect(screen.getByTitle('Drive on autopilot').getAttribute('src')).toBe(PORTHOLE_SRC);
    fireEvent.click(screen.getByRole('button', { name: /open Drive/ }));
    expect(open).toHaveBeenCalled();
  });
});
