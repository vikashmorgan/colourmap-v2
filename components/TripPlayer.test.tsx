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

import TripPlayer, {
  backgroundStops,
  claimLabel,
  clampView,
  easeView,
  gameHintText,
  HINT_KEY,
  isHome,
  pieceFromSearch,
  stickKeys,
  swipeStep,
  swipeVariant,
  type Trip,
  VIEW_HOME,
  viewCamera,
} from './TripPlayer';

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
    // Told the eye for every grain: where the camera stood this frame.
    fade: (_pos, e) => {
      seenEye = [...e];
      return 1;
    },
    pieces: {
      length: () => 10,
      progress: (_k, s) => (s % 10) / 10,
      particleAt: at,
      // Neon flies on its own, as the Cell corridor does: what it looks at moves on.
      camera: (k, s) =>
        k === 1
          ? { eye: [0, 0, 10 - 2 * s], target: [0, 0, -2 * s] }
          : { eye: [0, 0, 10], target: [0, 0, 0] },
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

let seenEye: number[] = [];

// To the game from the studio: the Design menu's Game pill (the Studio's arrows never go there),
// the menu shut again with Esc.
const toGame = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Design' }));
  fireEvent.click(screen.getByRole('button', { name: 'Game' }));
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.keyUp(window, { key: 'Escape' });
};

// The frame loop, run by hand: each call to `tick` runs one frame.
let frames: FrameRequestCallback[] = [];
const tick = (at = performance.now()) => {
  const run = frames;
  frames = [];
  act(() => {
    for (const f of run) f(at);
  });
};
// `n` frames a tenth of a second apart, starting `from` ms ahead of now.
const runFrames = (n: number, from = 100) => {
  const t0 = performance.now() + from;
  for (let i = 0; i < n; i++) tick(t0 + i * 100);
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

describe('pieceFromSearch', () => {
  it('opens on the piece a link names by its id, and on nothing else', () => {
    const trip = makeTrip();
    const id = trip.phases[2].id;
    expect(pieceFromSearch(trip, `?piece=${id}`)).toBe(2);
    expect(pieceFromSearch(trip, `?x=1&piece=${trip.phases[1].id}`)).toBe(1);
    expect(pieceFromSearch(trip, '?piece=nowhere')).toBeNull();
    expect(pieceFromSearch(trip, '')).toBeNull();
    // The Journey alone (no pieces) has nothing to pick.
    expect(pieceFromSearch({ ...trip, pieces: undefined }, `?piece=${id}`)).toBeNull();
  });
});

describe('backgroundStops', () => {
  it("shows a step's own background on that step alone, else the chosen one", () => {
    const water = ['#0b3f52', '#020a16'];
    const trip = makeTrip();
    trip.backgrounds = [
      { name: 'A', stops: ['#111111'] },
      { name: 'B', stops: ['#222222', '#333333'] },
    ];
    expect(backgroundStops(trip, 1, 0)).toEqual(['#222222', '#333333']);
    trip.pieces = { ...(trip.pieces as NonNullable<Trip['pieces']>) };
    trip.pieces.background = (k) => (k === 2 ? water : null);
    expect(backgroundStops(trip, 1, 2)).toBe(water);
    expect(backgroundStops(trip, 0, 1)).toEqual(['#111111']);
    // The Journey (no step alone) keeps the chosen one; with none chosen, black.
    expect(backgroundStops(trip, 1, null)).toEqual(['#222222', '#333333']);
    expect(backgroundStops({ ...trip, backgrounds: undefined }, 0, 1)).toEqual(['#040207']);
  });
});

describe('claimLabel', () => {
  it('names Space by the game bar, else Jump; B is the bite', () => {
    expect(claimLabel(' ', 'Boost')).toBe('Boost');
    expect(claimLabel(' ')).toBe('Jump');
    expect(claimLabel('b')).toBe('Bite');
    expect(claimLabel('l')).toBe('Look');
    expect(claimLabel('enter')).toBe('Go');
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

describe('swipeVariant', () => {
  it('goes to the next variant with a quick flick up, back with one down', () => {
    expect(swipeVariant(10, -120, 200)).toBe(1);
    expect(swipeVariant(-10, 120, 200)).toBe(-1);
  });
  it('ignores short, slow or mostly sideways moves', () => {
    expect(swipeVariant(0, -30, 200)).toBe(0);
    expect(swipeVariant(0, -120, 1200)).toBe(0);
    expect(swipeVariant(100, -80, 200)).toBe(0);
  });
});

// 2026-11-12: "make it clear how can i see the variants (like click up down for variants, left
// right for other category). make that clear, and a design pill that opens colour presets".
describe('TripPlayer Studio navigation', () => {
  const withVariants = (set = vi.fn()) => {
    const trip = makeTrip();
    if (trip.pieces?.variants) trip.pieces.variants.set = set;
    return trip;
  };

  it('cycles the variants with ↑ ↓ and shows the variant beside the piece name', () => {
    const set = vi.fn();
    render(<TripPlayer trip={withVariants(set)} page="city" />);
    expect(screen.getByText('· Grid')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('· Star')).toBeDefined();
    expect(set).toHaveBeenLastCalledWith(1, 0);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('· Grid')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByText('· Star')).toBeDefined();
    // On screen too: ˄ and ˅ by the variant's name.
    fireEvent.click(screen.getByRole('button', { name: 'Next variant (↓)' }));
    expect(screen.getByText('· Grid')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Previous variant (↑)' }));
    expect(screen.getByText('· Star')).toBeDefined();
  });

  it('goes through the studio pieces with ← → and the ‹ › buttons, never into the game', () => {
    render(<TripPlayer trip={makeTrip()} page="city" />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('2 / 3')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('1 / 3')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Next piece (→)' }));
    expect(screen.getByText('2 / 3')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Next piece (→)' }));
    expect(screen.getByText('1 / 3')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Previous piece (←)' }));
    expect(screen.getByText('2 / 3')).toBeDefined();
    // A piece with no variants: no variant name, no ˄ ˅, and ↑ ↓ do nothing.
    expect(screen.queryByRole('button', { name: 'Next variant (↓)' })).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('2 / 3')).toBeDefined();
  });

  it('leaves the arrow keys to the game while it is played, and shows no studio arrows there', () => {
    const gameSet = vi.fn();
    render(<TripPlayer trip={makeTrip(gameSet)} page="city" />);
    toGame();
    expect(screen.getByText('3 / 3')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Next piece (→)' })).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('3 / 3')).toBeDefined();
    runFrames(1);
    const keys = gameSet.mock.calls.at(-1)?.[1] as string[];
    expect(keys).toContain('arrowup');
    expect(keys).toContain('arrowleft');
  });

  it('flicks up and down on a phone for the variants', () => {
    setTouch(true);
    const set = vi.fn();
    const { container } = render(<TripPlayer trip={withVariants(set)} page="city" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, {
      pointerType: 'touch',
      pointerId: 7,
      clientX: 200,
      clientY: 300,
    });
    fireEvent.pointerUp(canvas, { pointerType: 'touch', pointerId: 7, clientX: 205, clientY: 150 });
    expect(screen.getByText('· Star')).toBeDefined();
    expect(screen.getByText('1 / 3')).toBeDefined();
  });

  it('shows the hint once per world, then fades it', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<TripPlayer trip={makeTrip()} page="city" />);
      expect(screen.getByRole('note').textContent).toBe('↑↓ variants · ←→ pieces');
      expect(window.localStorage.getItem(`${HINT_KEY}:city`)).toBe('1');
      act(() => {
        vi.advanceTimersByTime(4600);
      });
      expect(screen.getByRole('note').className).toContain('bb-hint-out');
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByRole('note')).toBeNull();
      unmount();
      render(<TripPlayer trip={makeTrip()} page="city" />);
      expect(screen.queryByRole('note')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the Game side its own hint once per world, then fades it (2026-11-13)', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<TripPlayer trip={makeTrip()} page="city" />);
      toGame();
      const notes = () => screen.getAllByRole('note').map((n) => n.textContent);
      expect(notes()).toContain('W A S D fly · Space boost · Esc lets go');
      expect(window.localStorage.getItem(`${HINT_KEY}:city:game`)).toBe('1');
      act(() => {
        vi.advanceTimersByTime(4600);
      });
      expect(screen.getByRole('note').className).toContain('bb-hint-out');
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryAllByRole('note')).toHaveLength(0);
      unmount();
      render(<TripPlayer trip={makeTrip()} page="city" />);
      toGame();
      expect(screen.queryAllByRole('note').map((n) => n.textContent)).not.toContain(
        'W A S D fly · Space boost · Esc lets go',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('names only what the game has in its hint, keys or touch', () => {
    const city = {
      claims: [' ', 'l', 'enter', 'v'],
      meter: { label: 'Boost', value: () => 1 },
      sheet: { key: 'm', label: 'Map', render: () => null },
    };
    expect(gameHintText(false, city)).toBe('W A S D fly · Space boost · M map · Esc lets go');
    expect(gameHintText(true, city)).toBe('Stick to fly · Boost · Map above the buttons');
    expect(gameHintText(false, {})).toBe('W A S D fly · Esc lets go');
    expect(gameHintText(true, {})).toBe('Stick to fly');
  });

  it('opens colour presets from a Palette pill, only on pieces that have them', () => {
    const trip = makeTrip();
    const set = vi.fn();
    if (trip.pieces)
      trip.pieces.palettes = {
        has: (k) => k === 0,
        names: ['Gold', 'Rose gold', 'Rust'],
        set,
      };
    render(<TripPlayer trip={trip} page="city" />);
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    const pill = screen.getByRole('button', { name: /^Palette/ });
    expect(pill.textContent).toBe('Palette · Gold');
    expect(screen.queryByRole('button', { name: 'Rust' })).toBeNull();
    fireEvent.click(pill);
    expect(pill.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Rust' }));
    expect(set).toHaveBeenLastCalledWith(2, 0);
    // Another piece has none: no Palette pill, and the next piece opens on the first preset.
    fireEvent.click(screen.getByRole('button', { name: 'Neon' }));
    expect(screen.queryByRole('button', { name: /^Palette/ })).toBeNull();
    expect(set).toHaveBeenLastCalledWith(0, 1);
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

describe('the viewer turn on the camera', () => {
  it('keeps zoom, climb and drift inside their limits', () => {
    const v = clampView({ zoom: 9, yaw: 7, pitch: -9, side: 3 });
    expect(v).toEqual({ zoom: 2.5, yaw: 7, pitch: -2.7, side: 0.4 });
    expect(clampView({ ...VIEW_HOME, zoom: 0.1 }).zoom).toBe(0.5);
  });

  it('eases home a share at a time, then lands exactly home', () => {
    const half = easeView({ zoom: 2, yaw: 1, pitch: -1, side: 0.2 }, 0.5);
    expect(half).toEqual({ zoom: 1.5, yaw: 0.5, pitch: -0.5, side: 0.1 });
    let v = half;
    for (let i = 0; i < 40; i++) v = easeView(v, 0.5);
    expect(isHome(v)).toBe(true);
  });

  it('zooms along the line of sight and orbits round the target', () => {
    const zoomed = viewCamera([0, 0, 10], [0, 0, 0], { ...VIEW_HOME, zoom: 2 });
    expect(zoomed.eye[2]).toBeCloseTo(20);
    const turned = viewCamera([0, 0, 10], [0, 0, 0], { ...VIEW_HOME, yaw: Math.PI / 2 });
    expect(turned.eye[0]).toBeCloseTo(10);
    expect(turned.eye[2]).toBeCloseTo(0);
    // Never over the top: the climb stops short of straight above.
    const high = viewCamera([0, 0, 10], [0, 0, 0], { ...VIEW_HOME, pitch: 2.7 });
    expect(high.eye[1]).toBeLessThan(10);
    expect(Math.hypot(...high.eye)).toBeCloseTo(10);
    // Sideways moves eye and target together, across the line of sight.
    const slid = viewCamera([0, 0, 10], [0, 0, 0], { ...VIEW_HOME, side: 0.2 });
    expect(slid.target[0]).toBeCloseTo(2);
    expect(slid.eye[0]).toBeCloseTo(2);
  });
});

describe('TripPlayer zoom and orbit', () => {
  it('zooms with the wheel, holds a while, then eases home on its own', () => {
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    fireEvent.wheel(canvas, { deltaY: 1000 });
    runFrames(3);
    expect(seenEye[2]).toBeCloseTo(25);
    runFrames(10, 5000);
    expect(seenEye[2]).toBeLessThan(25);
    expect(seenEye[2]).toBeGreaterThan(10);
  });

  it('goes back to the path quickly on Reset view', () => {
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    fireEvent.wheel(container.querySelector('canvas') as HTMLCanvasElement, { deltaY: -1000 });
    runFrames(1);
    expect(seenEye[2]).toBeCloseTo(5);
    fireEvent.click(screen.getByRole('button', { name: 'Design' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    runFrames(40);
    expect(seenEye[2]).toBeCloseTo(10);
  });

  it('orbits on a drag, but not on a game, where it only zooms', () => {
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 100 });
    runFrames(1);
    expect(seenEye[0]).toBeCloseTo(10 * Math.sin(-0.5));
    expect(Math.hypot(...seenEye)).toBeCloseTo(10);

    toGame();
    expect(screen.getByText('3 / 3')).toBeDefined();
    fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 200, clientY: 160 });
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 200, clientY: 160 });
    fireEvent.wheel(canvas, { deltaY: 1000 });
    runFrames(1);
    expect(seenEye[0]).toBeCloseTo(0);
    expect(seenEye[2]).toBeCloseTo(25);
  });

  it('pinches to zoom with two fingers', () => {
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    const touch = { pointerType: 'touch' };
    fireEvent.pointerDown(canvas, { ...touch, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(canvas, { ...touch, pointerId: 2, clientX: 200, clientY: 100 });
    // Fingers spread to twice as far apart: the eye comes in to half the distance.
    fireEvent.pointerMove(window, { ...touch, pointerId: 2, clientX: 300, clientY: 100 });
    runFrames(1);
    expect(seenEye[2]).toBeCloseTo(5);
    fireEvent.pointerUp(window, { ...touch, pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(window, { ...touch, pointerId: 1, clientX: 100, clientY: 100 });
    // A pinch is not a tap or a flick: still on the first piece.
    expect(screen.getByText('1 / 3')).toBeDefined();
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
    toGame();
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
    toGame();
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

  it('holds Shift and X from the Faster and Slower buttons on a game', () => {
    setTouch(true);
    const gameSet = vi.fn();
    render(<TripPlayer trip={makeTrip(gameSet)} page="ocean" />);
    toGame();
    const faster = screen.getByRole('button', { name: 'Faster' });
    fireEvent.pointerDown(faster, { pointerId: 1 });
    tick();
    expect(gameSet.mock.calls.at(-1)?.[1]).toEqual(['shift']);
    fireEvent.pointerUp(faster, { pointerId: 1 });
    const slower = screen.getByRole('button', { name: 'Slower' });
    fireEvent.pointerDown(slower, { pointerId: 2 });
    tick();
    expect(gameSet.mock.calls.at(-1)?.[1]).toEqual(['x']);
    fireEvent.pointerLeave(slower, { pointerId: 2 });
    tick();
    expect(gameSet.mock.calls.at(-1)?.[1]).toEqual([]);
  });

  it('gives the stick to a piece that flies on its own: up flies faster, sideways drifts', () => {
    setTouch(true);
    const { container } = render(<TripPlayer trip={makeTrip()} page="city" />);
    expect(container.querySelector('.bb-stick')).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyUp(window, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeDefined();
    const stick = container.querySelector('.bb-stick') as HTMLElement;
    expect(stick).not.toBeNull();
    // No game buttons on a piece that is not a game.
    expect(screen.queryByRole('button', { name: 'Boost' })).toBeNull();

    // Half a second of flight on its own.
    runFrames(5);
    const z0 = seenEye[2] as number;
    runFrames(5, 1000);
    const alone = z0 - (seenEye[2] as number);
    expect(alone).toBeCloseTo(1);
    fireEvent.pointerDown(stick, { pointerId: 1, clientX: 0, clientY: -40 });
    const z1 = seenEye[2] as number;
    runFrames(5, 2000);
    // Two and a half times the pace while the stick is up.
    expect(z1 - (seenEye[2] as number)).toBeCloseTo(2.5);
    fireEvent.pointerMove(stick, { pointerId: 1, clientX: 40, clientY: 0 });
    runFrames(5, 3000);
    expect(seenEye[0]).toBeGreaterThan(1);
    fireEvent.pointerUp(stick, { pointerId: 1 });
  });
});
