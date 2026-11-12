// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Vec3 } from './bigbang';
import {
  CANOPIES,
  camView,
  cockpitEye,
  DISPLAY_CHOICES,
  DISPLAY_KEY,
  DISPLAY_NAMES,
  displayChoice,
  displayFor,
  displayIndex,
  displayNow,
  loadCockpit,
  setDisplay,
  setView,
  toggleView,
  VIEW_KEY,
  viewIndex,
} from './city-cockpit';
import { SHIPS, setShip } from './city-ships';

beforeEach(() => {
  window.localStorage.clear();
  setDisplay(0);
  setView(0);
  setShip(0);
});

describe('cockpit displays', () => {
  it("offer each ship's own, every style, and None", () => {
    expect(DISPLAY_NAMES).toEqual(["Ship's own", 'Dials', 'Lines', 'Holo', 'Segments', 'None']);
    expect(DISPLAY_CHOICES).toHaveLength(DISPLAY_NAMES.length);
  });

  it("draw the ship's own style by default, any one style for every ship, and None hides them all", () => {
    for (const s of SHIPS) {
      expect(displayFor('ship', s.display)).toBe(s.display);
      expect(displayFor('holo', s.display)).toBe('holo');
      expect(displayFor('none', s.display)).toBe('none');
    }
    setShip(3);
    expect(displayNow()).toBe('segments');
    setDisplay(DISPLAY_CHOICES.indexOf('none'));
    for (let i = 0; i < SHIPS.length; i++) {
      setShip(i);
      expect(displayNow()).toBe('none');
    }
  });

  it('remember the choice on the device, and bring it back', () => {
    setDisplay(2);
    expect(window.localStorage.getItem(DISPLAY_KEY)).toBe('lines');
    setDisplay(0);
    window.localStorage.setItem(DISPLAY_KEY, 'none');
    window.localStorage.setItem(VIEW_KEY, 'cockpit');
    loadCockpit();
    expect(displayChoice()).toBe('none');
    expect(displayIndex()).toBe(5);
    expect(camView()).toBe('cockpit');
    // Anything unknown is ignored.
    window.localStorage.setItem(DISPLAY_KEY, 'neon');
    loadCockpit();
    expect(displayChoice()).toBe('none');
  });
});

describe('the cockpit view', () => {
  it('toggles between the chase and the pilot seat, remembered', () => {
    expect(camView()).toBe('chase');
    toggleView();
    expect(camView()).toBe('cockpit');
    expect(viewIndex()).toBe(1);
    expect(window.localStorage.getItem(VIEW_KEY)).toBe('cockpit');
    toggleView();
    expect(camView()).toBe('chase');
  });

  it('puts the eye in the seat, just over the spine, looking on ahead, the horizon leaning with the bank', () => {
    const c: Vec3 = [5, 10, -40];
    const f: Vec3 = [0, 0, -1];
    const { eye, target, roll } = cockpitEye(c, f, 2.4, -0.5);
    expect(Math.hypot(eye[0] - c[0], eye[1] - c[1], eye[2] - c[2])).toBeLessThan(1);
    expect(eye[1]).toBeGreaterThan(c[1]);
    expect(target[2]).toBeLessThan(eye[2] - 20);
    expect(roll).toBeCloseTo(-0.3);
    // Slow mode tips the gaze down toward the city.
    expect(cockpitEye(c, f, 2.4, 0, 1).target[1]).toBeLessThan(target[1]);
  });

  it('gives every ship a canopy', () => {
    for (const s of SHIPS) {
      const k = CANOPIES[s.id];
      expect(k.frame.length).toBeGreaterThan(10);
      expect(k.dash.length).toBeGreaterThan(5);
    }
  });
});
