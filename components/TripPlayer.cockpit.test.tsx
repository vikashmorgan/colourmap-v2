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

import {
  type Gauge,
  GaugeCluster,
  type GaugeStyle,
  gaugeText,
  headingName,
  paintGauges,
  signedTurn,
} from './Gauges';
import TripPlayer, { claimLabel, menuKey, type Trip } from './TripPlayer';

const phase = (id: string, name: string) => ({
  id,
  name,
  line: `${name} line`,
  duration: 10,
  glow: 1,
  size: 1,
});

const GAUGES: Gauge[] = [
  { label: 'Height', value: 40, max: 150, unit: 'm' },
  { label: 'Speed', value: 9, max: 27, unit: 'm/s' },
  { label: 'Heading', kind: 'compass', value: 90, max: 360 },
  { label: 'District', kind: 'text', text: 'Chinatown', value: 0, max: 1 },
];

// A studio piece and a game with instruments, option rows, an overlay and a panel on M.
function makeTrip(opts: { display?: () => GaugeStyle | 'none'; gameSet?: () => void } = {}) {
  const at = () => ({
    pos: [0, 0, 0] as [number, number, number],
    rgb: [1, 1, 1] as [number, number, number],
  });
  let ship = 0;
  const pickShip = vi.fn((i: number) => {
    ship = i;
  });
  const trip: Trip = {
    phases: [phase('a', 'Towers'), phase('c', 'Ship')],
    start: [0, 10],
    total: 20,
    stepColours: ['#c4a060', '#c4a060'],
    makeParticles: (n) => Array.from({ length: n }, (_, i) => ({ i }) as unknown as Particle),
    particleAt: at,
    phaseAt: (t) => ({ index: Math.min(1, Math.floor(t / 10)), u: (t % 10) / 10 }),
    look: () => ({ glow: 1, size: 1 }),
    pieces: {
      length: () => 10,
      progress: (_k, s) => (s % 10) / 10,
      particleAt: at,
      camera: () => ({ eye: [0, 0, 10], target: [0, 0, 0], roll: 0.2 }),
      look: () => ({ glow: 1, size: 1 }),
      game: {
        has: (k) => k === 1,
        set: opts.gameSet ?? vi.fn(),
        claims: [' ', 'v'],
        meter: { label: 'Boost', value: () => 1 },
        gauges: () => GAUGES,
        display: opts.display,
        options: [{ label: 'Ship', names: ['Arrow', 'Manta'], get: () => ship, set: pickShip }],
        overlay: () => <div data-testid="canopy" />,
        sheet: {
          key: 'm',
          label: 'Map',
          render: (close) => (
            <button type="button" onClick={close}>
              Inside the map
            </button>
          ),
        },
      },
    },
  };
  return { trip, pickShip };
}

let frames: FrameRequestCallback[] = [];
// The frames' clock only ever runs on, a tenth of a second a frame, so the player's HUD (redrawn
// every fifth of a second) comes round each time.
let clock = 0;
const runFrames = (n: number) => {
  clock = Math.max(clock, performance.now());
  for (let i = 0; i < n; i++) {
    clock += 100;
    const run = frames;
    frames = [];
    act(() => {
      for (const f of run) f(clock);
    });
  }
};

const toGame = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Design' }));
  fireEvent.click(screen.getByRole('button', { name: 'Game' }));
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.keyUp(window, { key: 'Escape' });
};

beforeEach(() => {
  frames = [];
  window.localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => {
    frames.push(f);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    fillStyle: '',
  } as unknown as RenderingContext);
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Gauges in four styles', () => {
  it('reads numbers, the heading as a point of the compass, and words', () => {
    expect(gaugeText(GAUGES[0] as Gauge)).toBe('40');
    expect(gaugeText(GAUGES[2] as Gauge)).toBe('E');
    expect(gaugeText(GAUGES[3] as Gauge)).toBe('Chinatown');
    expect(headingName(0)).toBe('N');
    expect(headingName(359)).toBe('N');
    expect(headingName(-90)).toBe('W');
    expect(headingName(225)).toBe('SW');
    expect(signedTurn(0)).toBe(0);
    expect(signedTurn(90)).toBeCloseTo(0.5);
    expect(signedTurn(270)).toBeCloseTo(-0.5);
  });

  for (const style of ['dials', 'lines', 'holo', 'segments'] as GaugeStyle[]) {
    it(`draws every gauge as ${style}, and paints new readings straight on`, () => {
      const { container } = render(<GaugeCluster gauges={GAUGES} style={style} />);
      const root = container.querySelector(`.bb-gauges-${style}`) as HTMLElement;
      expect(root).not.toBeNull();
      expect(root.querySelectorAll('[data-gauge]')).toHaveLength(4);
      expect(screen.getByRole('img', { name: 'Height (m)' })).toBeDefined();
      const next: Gauge[] = GAUGES.map((g) =>
        g.label === 'Height'
          ? { ...g, value: 150 }
          : g.label === 'District'
            ? { ...g, text: 'The Heights' }
            : g,
      );
      paintGauges(root, next);
      const height = root.querySelector('[data-gauge="0"]') as HTMLElement;
      expect(height.style.getPropertyValue('--k')).toBe('1.000');
      expect(height.textContent).toContain('150');
      expect(root.textContent).toContain('The Heights');
      if (style === 'segments') expect(height.querySelectorAll('i.on')).toHaveLength(10);
    });
  }

  it('paints nothing on no cluster', () => {
    expect(() => paintGauges(null, GAUGES)).not.toThrow();
  });
});

describe('TripPlayer: a game with displays, rows, a canopy and a map', () => {
  it('names V the View on a phone, and moves the Design menu to N where the game takes M', () => {
    expect(claimLabel('v')).toBe('View');
    expect(menuKey('m')).toBe('n');
    expect(menuKey(undefined)).toBe('m');
  });

  it("draws the game's instruments in its style, and none at all on None", () => {
    let style: GaugeStyle | 'none' = 'segments';
    const { trip } = makeTrip({ display: () => style });
    const { container } = render(<TripPlayer trip={trip} page="city" />);
    toGame();
    expect(container.querySelector('.bb-gauges-segments')).not.toBeNull();
    style = 'none';
    runFrames(3);
    expect(container.querySelector('.bb-gauges')).toBeNull();
    style = 'holo';
    runFrames(3);
    expect(container.querySelector('.bb-gauges-holo')).not.toBeNull();
  });

  it('draws dials when the game gives no style', () => {
    const { trip } = makeTrip();
    const { container } = render(<TripPlayer trip={trip} page="city" />);
    toGame();
    expect(container.querySelector('.bb-gauges-dials')).not.toBeNull();
  });

  it("shows the game's own rows on its side of the Design menu, and its canopy while played", () => {
    const { trip, pickShip } = makeTrip();
    render(<TripPlayer trip={trip} page="city" />);
    expect(screen.queryByTestId('canopy')).toBeNull();
    toGame();
    expect(screen.getByTestId('canopy')).toBeDefined();
    fireEvent.keyDown(window, { key: 'n' });
    const row = screen.getByRole('toolbar', { name: 'Ship' });
    const manta = screen.getByRole('button', { name: 'Manta' });
    expect(row.contains(manta)).toBe(true);
    fireEvent.click(manta);
    expect(pickShip).toHaveBeenCalledWith(1);
    expect(manta.getAttribute('aria-pressed')).toBe('true');
  });

  it('opens the map on M, holds time still under it, and shuts it on Esc, M or its own close', () => {
    const gameSet = vi.fn();
    const { trip } = makeTrip({ gameSet });
    render(<TripPlayer trip={trip} page="city" />);
    toGame();
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.getByRole('dialog', { name: 'Map' })).toBeDefined();
    // Not the Design menu: that is on N here.
    expect(screen.queryByRole('dialog', { name: 'Design' })).toBeNull();
    gameSet.mockClear();
    runFrames(4);
    expect(gameSet).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Map' })).toBeNull();
    runFrames(2);
    expect(gameSet).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.queryByRole('dialog', { name: 'Map' })).toBeNull();
    // From the Design menu's Map button, closed from inside.
    fireEvent.keyDown(window, { key: 'n' });
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(screen.queryByRole('dialog', { name: 'Design' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inside the map' }));
    expect(screen.queryByRole('dialog', { name: 'Map' })).toBeNull();
  });

  it('keeps M for the Design menu in the Studio', () => {
    const { trip } = makeTrip();
    render(<TripPlayer trip={trip} page="city" />);
    fireEvent.keyDown(window, { key: 'm' });
    expect(screen.getByRole('dialog', { name: 'Design' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Map' })).toBeNull();
  });
});
