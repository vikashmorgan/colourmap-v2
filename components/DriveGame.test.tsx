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
  resize: vi.fn(),
  start: vi.fn(),
  dispose: vi.fn(),
};
let hud: ((h: unknown) => void) | undefined;
// A class (not an arrow), since the shell constructs it with `new`.
vi.mock('@/components/drive/engine', () => ({
  DriveEngine: class {
    constructor(_c: unknown, o: { onHud?: (h: unknown) => void }) {
      hud = o.onHud;
      // biome-ignore lint/correctness/noConstructorReturn: hands the shared mock to the shell.
      return engine;
    }
  },
}));

import { DESIGN_KEY } from '@/lib/art/drive-design';
import DriveGame, { BACK_HREF } from './DriveGame';

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

  it('starts the engine on the Salt Flat; the menu names it and opens a column of the worlds', () => {
    render(<DriveGame />);
    expect(engine.start).toHaveBeenCalled();
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu.textContent).toContain('Salt Flat');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeDefined();
    expect(screen.getByRole('link', { name: /The Garage/ }).getAttribute('href')).toBe(
      '/geometry-field/garage',
    );
    for (const n of [
      'Salt Flat',
      'Coast Road',
      'Canyon Race',
      'Night Rain',
      'Chinatown Run',
      'Neon District',
      'Sky Canyon',
      'Mars',
      'Golden Track',
    ]) {
      expect(screen.getByRole('button', { name: n })).toBeDefined();
    }
    expect(screen.getByRole('button', { name: 'Salt Flat' }).getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('switches the five rivals on from the menu and keeps it', () => {
    render(<DriveGame />);
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
    render(<DriveGame />);
    fireEvent.keyDown(window, { key: '3' });
    expect(engine.setWorld).toHaveBeenCalledWith('canyon');
    fireEvent.keyDown(window, { key: '6' });
    expect(engine.setWorld).toHaveBeenCalledWith('neon');
    fireEvent.keyDown(window, { key: 'r' });
    expect(engine.reset).toHaveBeenCalled();
  });

  it('drives with the keys: throttle, steer, boost', () => {
    render(<DriveGame />);
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
    render(<DriveGame />);
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
    render(<DriveGame />);
    const base = { speed: 180, time: '20.00', best: null, record: false, running: true };
    act(() => hud?.({ ...base, drift: 1240, driftBest: 3120, combo: 2.5 }));
    expect(screen.getByTestId('drive-hud').textContent).toContain('drift 1240 ×2.5');
    act(() => hud?.({ ...base, drift: 1300, driftBest: 3120, combo: null }));
    expect(screen.getByTestId('drive-hud').textContent).toContain('drift 1300 · best 3120');
  });

  it('opens the menu, remembers a design choice and closes on Esc; Esc again goes back', () => {
    render(<DriveGame />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeDefined();
    expect(engine.setPreview).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    fireEvent.click(screen.getByRole('button', { name: 'Green plasma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Snowstorm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hover ship' }));
    const saved = JSON.parse(window.localStorage.getItem(DESIGN_KEY) ?? '{}');
    expect(saved).toMatchObject({ hull: 'chrome', fire: 'plasma', weather: 'snowstorm' });
    expect(saved.vehicle.salt).toBe('ship');
    expect(engine.setDesign).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(push).toHaveBeenCalledWith(BACK_HREF);
  });

  it('shows the speed and the run quietly', () => {
    render(<DriveGame />);
    act(() => hud?.({ speed: 214, time: '41.27', best: '39.80', record: false, running: false }));
    const h = screen.getByTestId('drive-hud');
    expect(h.textContent).toContain('214');
    expect(h.textContent).toContain('41.27');
    expect(h.textContent).toContain('best 39.80');
    act(() => hud?.({ speed: 100, time: '12.00', best: '39.80', record: false, running: true }));
    expect(screen.getByTestId('drive-hud').textContent).not.toContain('best');
  });

  it('drives on touch: hold the left of the screen to steer left', () => {
    render(<DriveGame />);
    const root = screen.getByTestId('drive');
    fireEvent.pointerDown(root, { pointerType: 'touch', pointerId: 1, clientX: 10 });
    const last = engine.setControls.mock.calls.at(-1)?.[0];
    expect(last.throttle).toBe(1);
    expect(last.steer).toBeGreaterThan(0);
    fireEvent.pointerUp(root, { pointerType: 'touch', pointerId: 1, clientX: 10 });
    expect(engine.setControls.mock.calls.at(-1)?.[0].throttle).toBe(0);
  });
});
