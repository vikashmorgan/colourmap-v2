import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// The engine needs WebGL; the shell only has to drive it.
const engine = {
  setControls: vi.fn(),
  setWorld: vi.fn(),
  setDesign: vi.fn(),
  setPreview: vi.fn(),
  reset: vi.fn(),
  startIntro: vi.fn(),
  skipIntro: vi.fn(),
  launch: vi.fn(),
  resize: vi.fn(),
  start: vi.fn(),
  dispose: vi.fn(),
};
let hud: ((h: unknown) => void) | undefined;
let intro: ((s: unknown) => void) | undefined;
let finish: ((r: unknown) => void) | undefined;
// A class (not an arrow), since the shell constructs it with `new`.
vi.mock('@/components/drive/engine', () => ({
  DriveEngine: class {
    constructor(
      _c: unknown,
      o: {
        onHud?: (h: unknown) => void;
        onIntro?: (s: unknown) => void;
        onFinish?: (r: unknown) => void;
      },
    ) {
      finish = o.onFinish;
      hud = o.onHud;
      intro = o.onIntro;
      // biome-ignore lint/correctness/noConstructorReturn: hands the shared mock to the shell.
      return engine;
    }
  },
}));

import { DESIGN_KEY } from '@/lib/art/drive-design';
import DriveGame, { BACK_HREF, LAST_TRACK_KEY } from './DriveGame';

/** Opens the game and leaves the track ring by racing on the track it shows. */
/** Opens the game past its title, onto the track ring. */
function open() {
  render(<DriveGame />);
  fireEvent.pointerDown(screen.getByTestId('title-screen'));
}

function play() {
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Race' }));
}

describe('Drive', () => {
  beforeEach(() => {
    for (const f of Object.values(engine)) f.mockClear();
    push.mockClear();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('starts the engine on the top track (the Golden Track); the menu names it and opens a column of the worlds', () => {
    play();
    expect(engine.start).toHaveBeenCalled();
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu.textContent).toContain('Golden Track');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeDefined();
    expect(screen.getByRole('link', { name: /The Garage/ }).getAttribute('href')).toBe(
      '/geometry-field/garage',
    );
    for (const n of [
      'Golden Track',
      'Neon District',
      'Canyon Race',
      'Sky Canyon',
      'Chinatown Run',
      'Night Rain',
      'Coast Road',
      'Mars',
      'Salt Flat',
    ]) {
      expect(screen.getByRole('button', { name: n })).toBeDefined();
    }
    expect(screen.getByRole('button', { name: 'Golden Track' }).getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('switches the five rivals on from the menu and keeps it', () => {
    play();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: '5 rivals' }));
    expect(engine.setDesign).toHaveBeenLastCalledWith(expect.objectContaining({ rivals: true }));
    expect(JSON.parse(window.localStorage.getItem(DESIGN_KEY) ?? '{}').rivals).toBe(true);
  });

  it('opens the world asked for in the address', async () => {
    window.history.replaceState(null, '', '/geometry-field/drive?world=coast');
    render(<DriveGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('button', { name: 'Coast Road' }).getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('switches worlds on 1–6 and restarts on R', () => {
    play();
    fireEvent.keyDown(window, { key: '3' });
    expect(engine.setWorld).toHaveBeenCalledWith('canyon');
    fireEvent.keyDown(window, { key: '2' });
    expect(engine.setWorld).toHaveBeenCalledWith('neon');
    fireEvent.keyDown(window, { key: 'r' });
    expect(engine.startIntro).toHaveBeenLastCalledWith(true);
  });

  it('drives with the keys: throttle, steer, boost', () => {
    play();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: ' ' });
    expect(engine.setControls).toHaveBeenLastCalledWith({
      throttle: 1,
      steer: 1,
      boost: 1,
      handbrake: false,
    });
    fireEvent.keyUp(window, { key: 'ArrowUp' });
    fireEvent.keyUp(window, { key: 'a' });
    fireEvent.keyUp(window, { key: ' ' });
    expect(engine.setControls).toHaveBeenLastCalledWith({
      throttle: 0,
      steer: 0,
      boost: 0,
      handbrake: false,
    });
  });

  it('holds the handbrake with F or the Handbrake button', () => {
    play();
    fireEvent.keyDown(window, { key: 'f' });
    expect(engine.setControls.mock.calls.at(-1)?.[0].handbrake).toBe(true);
    fireEvent.keyUp(window, { key: 'f' });
    expect(engine.setControls.mock.calls.at(-1)?.[0].handbrake).toBe(false);
    const b = screen.getByRole('button', { name: /Handbrake/ });
    fireEvent.pointerDown(b, { pointerId: 3 });
    expect(engine.setControls.mock.calls.at(-1)?.[0].handbrake).toBe(true);
    expect(b.getAttribute('aria-pressed')).toBe('true');
    fireEvent.pointerUp(b, { pointerId: 3 });
    expect(engine.setControls.mock.calls.at(-1)?.[0].handbrake).toBe(false);
  });

  it('shows the drift score, its combo while sliding, and the best', () => {
    play();
    const base = { speed: 180, time: '20.00', best: null, record: false, running: true };
    act(() => hud?.({ ...base, drift: 1240, driftBest: 3120, combo: 2.5 }));
    expect(screen.getByTestId('drive-hud').textContent).toContain('drift 1240 ×2.5');
    act(() => hud?.({ ...base, drift: 1300, driftBest: 3120, combo: null }));
    expect(screen.getByTestId('drive-hud').textContent).toContain('drift 1300 · best 3120');
  });

  it('opens the menu, remembers a design choice and closes on Esc; Esc again goes back', () => {
    play();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeDefined();
    expect(engine.setPreview).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    fireEvent.click(screen.getByRole('button', { name: 'Green plasma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Snowstorm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hover ship' }));
    const saved = JSON.parse(window.localStorage.getItem(DESIGN_KEY) ?? '{}');
    expect(saved).toMatchObject({ hull: 'chrome', fire: 'plasma', weather: 'snowstorm' });
    expect(saved.vehicle.gold).toBe('ship');
    expect(engine.setDesign).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    // Esc again pauses; Leave goes back.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('pause-menu')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(push).toHaveBeenCalledWith(BACK_HREF);
  });

  it('shows the speed and the run quietly', () => {
    play();
    act(() => hud?.({ speed: 214, time: '41.27', best: '39.80', record: false, running: false }));
    const h = screen.getByTestId('drive-hud');
    expect(h.textContent).toContain('214');
    expect(h.textContent).toContain('41.27');
    expect(h.textContent).toContain('best 39.80');
    act(() => hud?.({ speed: 100, time: '12.00', best: '39.80', record: false, running: true }));
    expect(screen.getByTestId('drive-hud').textContent).not.toContain('best');
  });

  it('drives on touch: hold the left of the screen to steer left', () => {
    play();
    const root = screen.getByTestId('drive');
    fireEvent.pointerDown(root, { pointerType: 'touch', pointerId: 1, clientX: 10 });
    const last = engine.setControls.mock.calls.at(-1)?.[0];
    expect(last.throttle).toBe(1);
    expect(last.steer).toBeGreaterThan(0);
    fireEvent.pointerUp(root, { pointerType: 'touch', pointerId: 1, clientX: 10 });
    expect(engine.setControls.mock.calls.at(-1)?.[0].throttle).toBe(0);
  });

  it('opens on the track ring: the screens turn, the world behind follows, Race drives in', () => {
    vi.useFakeTimers();
    open();
    const ring = screen.getByTestId('track-ring');
    expect(ring).toBeDefined();
    expect(engine.setPreview).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Golden Track' }).getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('track-map')).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'Neon District' }).getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByText('The City of Dreams in neon')).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(engine.setWorld).toHaveBeenLastCalledWith('neon');
    // The ring's keys don't drive the car.
    expect(engine.setControls).not.toHaveBeenCalledWith(expect.objectContaining({ steer: -1 }));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    // Past the top it wraps round to the last.
    expect(screen.getByRole('button', { name: 'Salt Flat' }).getAttribute('aria-current')).toBe(
      'true',
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.queryByTestId('track-ring')).toBeNull();
    expect(engine.startIntro).toHaveBeenCalledWith();
    expect(engine.setPreview).toHaveBeenLastCalledWith(false);
    vi.useRealTimers();
  });

  it('comes back to the track ring from the menu', () => {
    play();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: /Track ring/ }));
    expect(screen.getByTestId('track-ring')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('track-ring')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('plays the race intro: the name while flying, any key skips, click to start, the countdown, GO', () => {
    play();
    expect(engine.startIntro).toHaveBeenCalledWith();
    act(() => intro?.({ phase: 'fly', lit: 0, go: false }));
    expect(screen.getByTestId('race-intro').textContent).toContain('Golden Track');
    expect(screen.queryByRole('button', { name: /Handbrake/ })).toBeDefined();
    fireEvent.keyDown(window, { key: 'x' });
    expect(engine.skipIntro).toHaveBeenCalled();
    act(() => intro?.({ phase: 'ready', lit: 0, go: false }));
    expect(screen.getByText('Click to start')).toBeDefined();
    fireEvent.pointerDown(screen.getByTestId('race-intro'));
    expect(engine.launch).toHaveBeenCalledTimes(1);
    // Holding ↑ at the grid also starts it, and is still held at GO.
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(engine.launch).toHaveBeenCalledTimes(2);
    expect(engine.setControls).toHaveBeenLastCalledWith(expect.objectContaining({ throttle: 1 }));
    act(() => intro?.({ phase: 'count', lit: 2, go: false }));
    expect(screen.getByTestId('race-intro').textContent).toContain('2');
    act(() => intro?.({ phase: 'go', lit: 3, go: true }));
    expect(screen.getByText('GO')).toBeDefined();
    act(() => intro?.(null));
    expect(screen.queryByTestId('race-intro')).toBeNull();
  });

  it('opens on the title, then the ring on the track raced last', () => {
    window.localStorage.setItem(LAST_TRACK_KEY, 'neon');
    render(<DriveGame />);
    expect(screen.getByTestId('title-screen').textContent).toContain('Colour Drive');
    expect(screen.queryByTestId('track-ring')).toBeNull();
    expect(engine.setPreview).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(window, { key: 'x' });
    expect(screen.queryByTestId('title-screen')).toBeNull();
    expect(screen.getByRole('button', { name: 'Neon District' }).getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('pauses on Esc while driving: resume, restart at the grid, or back to the tracks', () => {
    play();
    act(() => intro?.(null));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('pause-menu')).toBeDefined();
    expect(engine.setPreview).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('pause-menu')).toBeNull();
    expect(engine.setPreview).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    engine.startIntro.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(engine.startIntro).toHaveBeenCalledWith(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Tracks' }));
    expect(screen.getByTestId('track-ring')).toBeDefined();
  });

  it('shows the results when a course is run: place, time, best, everyone, race again', () => {
    play();
    act(() =>
      finish?.({
        time: '1:41.23',
        best: '1:39.50',
        record: false,
        place: 2,
        standings: [
          { name: 'Cyan', colour: '#18c8e0', you: false },
          { name: 'You', colour: '#c8923f', you: true },
          { name: 'Rose', colour: '#e04a8a', you: false },
        ],
      }),
    );
    const sheet = screen.getByTestId('race-results');
    expect(sheet.textContent).toContain('2nd');
    expect(sheet.textContent).toContain('1:41.23');
    expect(sheet.textContent).toContain('best 1:39.50');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1Cyan',
      '2You',
      '3Rose',
    ]);
    engine.startIntro.mockClear();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(engine.startIntro).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('race-results')).toBeNull();
  });
});
