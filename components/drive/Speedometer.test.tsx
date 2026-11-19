import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FutureGauge, TimerGauge } from './Speedometer';

describe('the speedometers', () => {
  it('the Timer card reads the speed and gear, lighting the rainbow and bars with speed and revs', () => {
    const { container } = render(<TimerGauge speed={210} gear={4} revs={0.5} />);
    expect(screen.getByTestId('gauge-timer').textContent).toContain('210');
    expect(screen.getByText('gear 4')).toBeTruthy();
    const lit = [...container.querySelectorAll('path')].filter(
      (p) => p.getAttribute('opacity') === '1',
    );
    expect(lit.length).toBe(4);
  });

  it('the futuristic dial reads the speed and gear, its arc only once moving', () => {
    const { container, rerender } = render(<FutureGauge speed={0} gear={1} revs={0} />);
    expect(container.querySelector('[filter="url(#gauge-glow)"]')?.tagName).toBe('text');
    rerender(<FutureGauge speed={300} gear={5} revs={0.9} />);
    expect(screen.getByTestId('gauge-future').textContent).toContain('300');
    expect(screen.getByTestId('gauge-future').textContent).toContain('5');
    expect(container.querySelectorAll('path[filter="url(#gauge-glow)"]')).toHaveLength(1);
  });
});
