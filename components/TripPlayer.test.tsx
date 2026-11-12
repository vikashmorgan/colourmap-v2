// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Particle } from '@/lib/bigbang';

// No WebGL in jsdom: the renderer and the bloom passes do nothing; the rest of three is real.
vi.mock('three', async (importOriginal) => {
  const real = await importOriginal<typeof import('three')>();
  class FakeRenderer {
    toneMapping = 0;
    setPixelRatio() {}
    setSize() {}
    dispose() {}
  }
  return { ...real, WebGLRenderer: FakeRenderer };
});
vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    addPass() {}
    setSize() {}
    render() {}
    dispose() {}
  },
}));
vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({ RenderPass: class {} }));
vi.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({ OutputPass: class {} }));
vi.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: class {
    strength = 0;
  },
}));

import TripPlayer, { claimLabel, stickKeys, swipeStep, type Trip } from './TripPlayer';

const phase = (id: string, name: string) => ({
  id,
  name,
  line: `${name} line`,
  duration: 10,
  glow: 1,
  size: 1,
});

// A trip of three pieces, the last one a game that claims Space and B (as the Shark Sim does).
function makeTrip(gameSet = vi.fn()): Trip {
  const at = () => ({
    pos: [0, 0, 0] as [number, number, number],
    rgb: [1, 1, 1] as [number, number, number],
  });
  return {
    phases: [phase('a', 'Towers'), phase('b', 'Neon'), phase('c', 'Ship')],
    start: [0, 10, 20],
    total: 30,
    stepColours: ['#c4a060', '#c4a060', '#c4a060'],
    makeParticles: (n) => Array.from({ length: n }, (_, i) => ({ i }) as unknown as Particle),
    particleAt: at,
    phaseAt: (t) => ({ index: Math.min(2, Math.floor(t / 10)), u: (t % 10) / 10 }),
    look: () => ({ glow: 1, size: 1 }),
    pieces: {
      length: () => 10,
      progress: (_k, s) => (s % 10) / 10,
      particleAt: at,
      camera: () => ({ eye: [0, 0, 10], target: [0, 0, 0] }),
      look: () => ({ glow: 1, size: 1 }),
      variants: { has: (k) => k === 0, names: ['Grid', 'Star'], set: () => {}, label: 'City' },
      game: {
        has: (k) => k === 2,
        set: gameSet,
        claims: [' ', 'b'],
        meter: { label: 'Boost', value: () => 1 },
      },
    },
  };
}

// The frame loop, run by hand: each call to `tick` runs one frame.
let frames: FrameRequestCallback[] = [];
const tick = () => {
  const run = frames;
  frames = [];
  act(() => {
    for (const f of run) f(performance.now());
  });
};

const ctx2d = {
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  fillRect() {},
  fillStyle: '',
};

function setTouch(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('coarse'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  frames = [];
  window.localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    frames.push(f);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx2d as unknown as RenderingContext,
  );
  setTouch(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('stickKeys', () => {
  it('holds nothing near the middle', () => {
    expect(stickKeys(0, 0)).toEqual([]);
    expect(stickKeys(10, -10)).toEqual([]);
  });
  it('holds the arrow keys the games read, one per axis', () => {
    expect(stickKeys(-44, 0)).toEqual(['arrowleft']);
    expect(stickKeys(44, 0)).toEqual(['arrowright']);
    expect(stickKeys(0, -44)).toEqual(['arrowup']);
    expect(stickKeys(0, 44)).toEqual(['arrowdown']);
    expect(stickKeys(40, -40)).toEqual(['arrowright', 'arrowup']);
  });
});

describe('claimLabel', () => {
  it('names Space by the game bar, else Jump; B is the bite', () => {
    expect(claimLabel(' ', 'Boost')).toBe('Boost');
    expect(claimLabel(' ')).toBe('Jump');
    expect(claimLabel('b')).toBe('Bite');
    expect(claimLabel('k')).toBe('K');
  });
});

describe('swipeStep', () => {
  it('goes on with a quick swipe left, back with one right', () => {
    expect(swipeStep(-120, 10, 200)).toBe(1);
    expect(swipeStep(120, -10, 200)).toBe(-1);
  });
  it('ignores short, slow or mostly upright moves', () => {
    expect(swipeStep(-30, 0, 200)).toBe(0);
    expect(swipeStep(-120, 0, 1200)).toBe(0);
    expect(swipeStep(-80, 100, 200)).toBe(0);
  });
});

describe('TripPlayer Design menu', () => {
  it('keeps only the Design button and the piece name on screen until opened', () => {
    render(<TripPlayer trip={makeTrip()} page="city" />);
    const design = screen.getByRole('button', { name: 'Design' });
    expect(design.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('toolbar', { name: 'Pieces' })).toBeNull();
    expect(screen.getByText('1 / 3')).toBeDefined();
    expect(screen.getAllByText('Towers').length).toBe(1);
  });

  it('opens a dialog holding the art tabs, pieces, looks and speeds', () => {
    render(<TripPlayer trip={makeTrip()} page="city" />);
    const design = screen.getByRole('button', { name: 'Design' });
    fireEvent.click(design);
    const dialog = screen.getByRole('dialog', { name: 'Design' });
    expect(design.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(screen.getByRole('navigation', { name: 'Art' })).toBeDefined();
    expect(screen.getByRole('toolbar', { name: 'Pieces' })).toBeDefined();
    expect(screen.getByRole('toolbar', { name: 'City' })).toBeDefined();
    expect(screen.getByRole('toolbar', { name: 'Speed' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Neon' }));
    expect(screen.getByText('2 / 3')).toBeDefined();
    // Picking a piece keeps the menu open.
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('closes on Esc and the close button, the focus back on Design', () => {
    render(<TripPlayer trip={makeTrip()} page="city" />);
    const design = screen.getByRole('button', { name: 'Design' });
    fireEvent.click(design);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(design);
    fireEvent.click(design);
    fireEvent.click(screen.getByRole('button', { name: 'Close the design menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(design.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a tap outside it, and M opens and shuts it', () => {
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    fireEvent.keyDown(window, { key: 'm' });
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(dialog);
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.pointerDown(container.querySelector('canvas') as HTMLCanvasElement);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('goes to the picture alone where the browser has no full screen, Esc back', () => {
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    fireEvent.click(screen.getByRole('button', { name: /Full screen/ }));
    expect(container.querySelector('main')?.className).toContain('bb-immersed');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('main')?.className).not.toContain('bb-immersed');
  });
});

describe('TripPlayer Game and Studio', () => {
  it('shows the studio pieces in the Studio, the game alone in the Game', () => {
    render(<TripPlayer trip={makeTrip()} page="city" />);
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    const studio = screen.getByRole('button', { name: 'Studio' });
    expect(studio.getAttribute('aria-pressed')).toBe('true');
    const pieces = screen.getByRole('toolbar', { name: 'Pieces' });
    expect(pieces.textContent).toBe('TowersNeon');
    fireEvent.click(screen.getByRole('button', { name: 'Neon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Game' }));
    expect(screen.getByText('3 / 3')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Game' }).getAttribute('aria-pressed')).toBe('true');
    // One game piece: no row of pieces to pick from.
    expect(screen.queryByRole('toolbar', { name: 'Pieces' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Steer' })).toBeDefined();
    // Back to the studio piece it came from.
    fireEvent.click(screen.getByRole('button', { name: 'Studio' }));
    expect(screen.getByText('2 / 3')).toBeDefined();
  });

  it('opens a world on the side it was left on', () => {
    const { unmount } = render(<TripPlayer trip={makeTrip()} page="ocean" />);
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    fireEvent.click(screen.getByRole('button', { name: 'Game' }));
    unmount();
    render(<TripPlayer trip={makeTrip()} page="ocean" />);
    expect(screen.getByText('3 / 3')).toBeDefined();
    cleanup();
    // Another world keeps its own.
    render(<TripPlayer trip={makeTrip()} page="vegetal" />);
    expect(screen.getByText('1 / 3')).toBeDefined();
  });

  it('has no Game · Studio switch in a world with no game', () => {
    const trip = makeTrip();
    delete trip.pieces?.game;
    render(<TripPlayer trip={trip} page="vegetal" />);
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    expect(screen.queryByRole('toolbar', { name: 'Mode' })).toBeNull();
    expect(screen.getByRole('toolbar', { name: 'Pieces' }).textContent).toBe('TowersNeonShip');
  });

  it('swipes through the studio pieces only, never into the game', () => {
    setTouch(true);
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    // From Towers, back (a swipe right) wraps past the Ship to Neon.
    fireEvent.pointerDown(canvas, {
      pointerType: 'touch',
      pointerId: 5,
      clientX: 100,
      clientY: 200,
    });
    fireEvent.pointerUp(canvas, { pointerType: 'touch', pointerId: 5, clientX: 260, clientY: 200 });
    expect(screen.getByText('2 / 3')).toBeDefined();
  });
});

describe('TripPlayer on a phone', () => {
  it('shows no stick on a desktop or on a piece that is not a game', () => {
    const { container, unmount } = render(<TripPlayer trip={makeTrip()} page="city" />);
    expect(container.querySelector('.bb-stick')).toBeNull();
    unmount();
    setTouch(true);
    const again = render(<TripPlayer trip={makeTrip()} page="city" />);
    expect(again.container.querySelector('.bb-stick')).toBeNull();
  });

  it('swipes left and right on the picture to the next and previous piece', () => {
    setTouch(true);
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, {
      pointerType: 'touch',
      pointerId: 3,
      clientX: 300,
      clientY: 200,
    });
    fireEvent.pointerUp(canvas, { pointerType: 'touch', pointerId: 3, clientX: 150, clientY: 210 });
    expect(screen.getByText('2 / 3')).toBeDefined();
    fireEvent.pointerDown(canvas, {
      pointerType: 'touch',
      pointerId: 4,
      clientX: 100,
      clientY: 200,
    });
    fireEvent.pointerUp(canvas, { pointerType: 'touch', pointerId: 4, clientX: 260, clientY: 200 });
    expect(screen.getByText('1 / 3')).toBeDefined();
  });

  it('holds and lets go of the game keys from the stick and the round buttons', () => {
    setTouch(true);
    const gameSet = vi.fn();
    const { container } = render(<TripPlayer trip={makeTrip(gameSet)} page="ocean" />);
    // Go to the game piece (the arrows change piece when no game is played).
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyUp(window, { key: 'ArrowLeft' });
    expect(screen.getByText('3 / 3')).toBeDefined();
    const stick = container.querySelector('.bb-stick') as HTMLElement;
    expect(stick).not.toBeNull();
    expect(container.querySelector('main')?.className).toContain('bb-touch-game');
    const lastKeys = () => gameSet.mock.calls.at(-1)?.[1] as string[];

    // jsdom lays nothing out: the stick's middle is at 0, 0.
    fireEvent.pointerDown(stick, { pointerId: 7, clientX: -40, clientY: -40 });
    tick();
    expect(gameSet.mock.calls.at(-1)?.[0]).toBe(true);
    expect(lastKeys()).toEqual(expect.arrayContaining(['arrowleft', 'arrowup']));
    fireEvent.pointerMove(stick, { pointerId: 7, clientX: 40, clientY: 0 });
    tick();
    expect(lastKeys()).toEqual(['arrowright']);

    const boost = screen.getByRole('button', { name: 'Boost' });
    fireEvent.pointerDown(boost, { pointerId: 8 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Bite' }), { pointerId: 9 });
    tick();
    expect(lastKeys()).toEqual(expect.arrayContaining(['arrowright', ' ', 'b']));

    fireEvent.pointerUp(stick, { pointerId: 7 });
    fireEvent.pointerUp(boost, { pointerId: 8 });
    tick();
    expect(lastKeys()).toEqual(['b']);
  });

  it('takes the controls back when the stick is touched after Esc let go', () => {
    setTouch(true);
    const gameSet = vi.fn();
    const { container } = render(<TripPlayer trip={makeTrip(gameSet)} page="ocean" />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyUp(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Escape' });
    tick();
    expect(gameSet.mock.calls.at(-1)?.[0]).toBe(false);
    fireEvent.pointerDown(container.querySelector('.bb-stick') as HTMLElement, {
      pointerId: 1,
      clientX: 0,
      clientY: -40,
    });
    tick();
    expect(gameSet.mock.calls.at(-1)?.[0]).toBe(true);
    expect(gameSet.mock.calls.at(-1)?.[1]).toEqual(['arrowup']);
  });
});
