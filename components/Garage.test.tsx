import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The room needs WebGL; the panel only has to drive it.
const scene = {
  setRide: vi.fn(),
  setRev: vi.fn(),
  resize: vi.fn(),
  start: vi.fn(),
  dispose: vi.fn(),
  pointerDown: vi.fn(),
  pointerMove: vi.fn(),
  pointerUp: vi.fn(),
  wheel: vi.fn(),
};
vi.mock('@/components/garage/scene', () => ({
  GarageScene: class {
    constructor() {
      // biome-ignore lint/correctness/noConstructorReturn: hands the shared mock to the panel.
      return scene;
    }
  },
}));

import { DESIGN_KEY } from '@/lib/art/drive-design';
import Garage, { DRIVE_HREF } from './Garage';

const saved = () => JSON.parse(window.localStorage.getItem(DESIGN_KEY) ?? '{}');

describe('the Garage', () => {
  beforeEach(() => {
    for (const f of Object.values(scene)) f.mockClear();
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it('starts the room and offers the ride, hull, fire, flames, speedometer and mode', () => {
    render(<Garage />);
    expect(scene.start).toHaveBeenCalled();
    for (const name of ['Car', 'Hover ship', 'Chrome', 'Gold', 'Paint', 'At speed', 'Easy'])
      expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Drive ›' }).getAttribute('href')).toBe(DRIVE_HREF);
  });

  it('a ride picked here is the ride in every world, rebuilt on the turntable', () => {
    render(<Garage />);
    fireEvent.click(screen.getByRole('button', { name: 'Hover ship' }));
    expect(Object.values(saved().vehicle).every((k) => k === 'ship')).toBe(true);
    expect(scene.setRide).toHaveBeenCalled();
  });

  it('Paint shows a colour picker, and the colour is kept', () => {
    render(<Garage />);
    fireEvent.click(screen.getByRole('button', { name: 'Paint' }));
    const picker = screen.getByLabelText('Your colour');
    fireEvent.change(picker, { target: { value: '#ff3366' } });
    expect(saved().hull).toBe('paint');
    expect(saved().paint).toBe('#ff3366');
  });

  it('revs while held, and turns the ride with a drag', () => {
    render(<Garage />);
    const rev = screen.getByRole('button', { name: 'Hold to rev' });
    fireEvent.pointerDown(rev);
    expect(scene.setRev).toHaveBeenLastCalledWith(true);
    fireEvent.pointerUp(rev);
    expect(scene.setRev).toHaveBeenLastCalledWith(false);
    const canvas = screen.getByLabelText(/turntable/);
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 60, clientY: 10 });
    fireEvent.pointerUp(canvas);
    expect(scene.pointerMove).toHaveBeenCalledWith(60, 10);
    expect(scene.pointerUp).toHaveBeenCalled();
  });
});
