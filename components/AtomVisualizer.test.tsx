// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitChill } from '@/lib/chill/bus';
import { DEFAULT_ECHO } from '@/lib/chill/echo';

import AtomVisualizer from './AtomVisualizer';

type Ctx = Record<string, unknown> & { calls: string[] };

/** A fake 2D context: every method records its name, every property is writable. */
function fakeContext(): Ctx {
  const calls: string[] = [];
  const target: Ctx = { calls };
  return new Proxy(target, {
    get(t, key: string) {
      if (key in t) return t[key];
      const fn = (..._args: unknown[]) => {
        calls.push(key);
        return key === 'createRadialGradient' ? { addColorStop: () => {} } : undefined;
      };
      t[key] = fn;
      return fn;
    },
    set(t, key: string, v) {
      t[key] = v;
      return true;
    },
  });
}

describe('AtomVisualizer', () => {
  let ctx: Ctx;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    ctx = fakeContext();
    frames = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const tick = (t: number) => {
    const cb = frames.shift();
    act(() => cb?.(t));
  };

  it('renders and draws without the new props', () => {
    render(<AtomVisualizer />);
    expect(screen.getByLabelText(/atom visualizer/i)).toBeTruthy();
    tick(16);
    expect(ctx.calls).toContain('clearRect');
    expect(ctx.calls).toContain('arc');
    expect(ctx.calls).not.toContain('stroke');
  });

  it('colours dots from the palette prop', () => {
    render(<AtomVisualizer palette={['#123456']} />);
    tick(16);
    expect(ctx.fillStyle).toBe('#123456');
  });

  it('draws a ripple ring when a chill event arrives with echo on', () => {
    render(<AtomVisualizer echo={DEFAULT_ECHO} palette={['#2A9D8F']} />);
    tick(16);
    act(() => emitChill({ kind: 'note', x: 0.5, y: 0.5, strength: 1 }));
    ctx.calls.length = 0;
    tick(performance.now() + 200);
    expect(ctx.calls).toContain('stroke');
    expect(ctx.strokeStyle).toBe('#2A9D8F');
  });

  it('ignores chill events without echo settings', () => {
    render(<AtomVisualizer />);
    act(() => emitChill({ kind: 'note', x: 0.5, y: 0.5, strength: 1 }));
    tick(performance.now() + 200);
    expect(ctx.calls).not.toContain('stroke');
  });

  it('trail echoes fade the last frame instead of clearing it', () => {
    const echo = {
      ...DEFAULT_ECHO,
      ripple: { ...DEFAULT_ECHO.ripple, on: false },
      trail: { ...DEFAULT_ECHO.trail, on: true },
    };
    render(<AtomVisualizer echo={echo} />);
    act(() => emitChill({ kind: 'pad', x: 0.2, y: 0.2, strength: 1, color: '#E53935' }));
    tick(performance.now() + 50);
    expect(ctx.calls).toContain('fillRect');
    expect(ctx.calls).not.toContain('clearRect');
  });
});
