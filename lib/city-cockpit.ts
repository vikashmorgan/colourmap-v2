/*
 * The Ship's cockpit (docs/specs/art-city.md, "Ships, cockpits and the map"): which instruments
 * show on screen, and the view from the pilot's seat. Pure: no three.js, no DOM (the canopy's
 * shapes are SVG path data, drawn by components/CityCockpit.tsx).
 *
 * 2026-11-12: "play with different types of displays, and option to have no displays always
 * possible, can be chosen in menu. and a pov view from inside the cockpit when u drive ur
 * spaceship."
 */

import type { Vec3 } from './bigbang';
import { currentShip, type DisplayStyle, type ShipId, shipAxes } from './city-ships';

/* ---------- displays ---------- */

/** What the Displays pills choose: each ship's own, any one style for every ship, or none. */
export type DisplayChoice = 'ship' | DisplayStyle | 'none';
export const DISPLAY_CHOICES: DisplayChoice[] = [
  'ship',
  'dials',
  'lines',
  'holo',
  'segments',
  'none',
];
export const DISPLAY_NAMES = ["Ship's own", 'Dials', 'Lines', 'Holo', 'Segments', 'None'];

/** The style drawn for a choice on a ship: its own for 'ship', nothing for 'none'. */
export function displayFor(choice: DisplayChoice, own: DisplayStyle): DisplayStyle | 'none' {
  return choice === 'ship' ? own : choice;
}

/* ---------- the view: behind the ship, or from the pilot's seat ---------- */

export type CamView = 'chase' | 'cockpit';
export const VIEW_NAMES = ['Chase', 'Cockpit'];
const VIEWS: CamView[] = ['chase', 'cockpit'];

export const DISPLAY_KEY = 'colourmap:city-display';
export const VIEW_KEY = 'colourmap:city-view';

const state = { display: 'ship' as DisplayChoice, view: 'chase' as CamView };

const remember = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembered; still chosen.
  }
};

export const displayChoice = () => state.display;
export const displayIndex = () => DISPLAY_CHOICES.indexOf(state.display);
export function setDisplay(i: number) {
  const c = DISPLAY_CHOICES[Math.max(0, Math.min(DISPLAY_CHOICES.length - 1, Math.round(i)))];
  state.display = c as DisplayChoice;
  remember(DISPLAY_KEY, state.display);
}
/** The style drawn now, for the ship flown now. */
export const displayNow = () => displayFor(state.display, currentShip().display);

export const camView = () => state.view;
export const viewIndex = () => VIEWS.indexOf(state.view);
export function setView(i: number) {
  state.view = VIEWS[i ? 1 : 0] as CamView;
  remember(VIEW_KEY, state.view);
}
/** V: from behind the ship to the pilot's seat and back. */
export const toggleView = () => setView(state.view === 'chase' ? 1 : 0);

/** The displays and the view last chosen on this device. */
export function loadCockpit() {
  try {
    const d = window.localStorage.getItem(DISPLAY_KEY);
    if (d && (DISPLAY_CHOICES as string[]).includes(d)) state.display = d as DisplayChoice;
    const v = window.localStorage.getItem(VIEW_KEY);
    if (v === 'chase' || v === 'cockpit') state.view = v;
  } catch {
    // Each ship's own displays, behind the ship.
  }
}

/**
 * The eye from the pilot's seat of a ship at c heading f, `len` long, banked `roll`: a little
 * behind its nose and above its spine, looking on ahead the way it flies, the horizon leaning
 * with the bank (a share of it, so the turn reads without the world spinning). In slow mode
 * (`look` 0..1) the gaze tips down toward the city below.
 */
export function cockpitEye(
  c: Vec3,
  f: Vec3,
  len: number,
  roll: number,
  look = 0,
): { eye: Vec3; target: Vec3; roll: number } {
  const { up } = shipAxes(f, 0);
  const eye: Vec3 = [
    c[0] + f[0] * 0.12 * len + up[0] * 0.16 * len,
    c[1] + f[1] * 0.12 * len + up[1] * 0.16 * len,
    c[2] + f[2] * 0.12 * len + up[2] * 0.16 * len,
  ];
  const ahead = 30;
  const target: Vec3 = [
    eye[0] + f[0] * ahead,
    eye[1] + f[1] * ahead - 14 * look,
    eye[2] + f[2] * ahead,
  ];
  return { eye, target, roll: roll * 0.6 };
}

/* ---------- the canopy, as seen from the seat ---------- */

/**
 * Each ship's canopy frame and dashboard edge, drawn over the picture in the cockpit view: SVG
 * path data in a 1000 × 600 box, kept to the edges so the middle stays clear. `frame` is filled
 * (the struts and the sill), `glass` a faint line along the canopy's edge, `dash` the dashboard's
 * lit edge. A `round` canopy keeps its shape on any screen (the box fitted inside the screen, not
 * stretched), its frame running on past the box's edges to fill the rest.
 */
export type Canopy = { frame: string; glass: string; dash: string; round?: boolean };

export const CANOPIES: Record<ShipId, Canopy> = {
  // The Arrow: two slim struts rising to a peak above, a low straight sill.
  arrow: {
    frame:
      'M0 600 L0 520 L120 500 L300 488 L700 488 L880 500 L1000 520 L1000 600 Z ' +
      'M0 0 L60 0 L330 488 L300 488 L0 60 Z M1000 0 L940 0 L670 488 L700 488 L1000 60 Z',
    glass: 'M60 0 L330 488 M940 0 L670 488',
    dash: 'M120 500 L300 488 L700 488 L880 500',
  },
  // The Manta: a wide low bubble, its sill curving up at the sides like the wing.
  manta: {
    frame:
      'M0 600 L0 380 Q140 470 320 500 Q500 520 680 500 Q860 470 1000 380 L1000 600 Z ' +
      'M0 0 L0 120 Q260 40 500 30 Q740 40 1000 120 L1000 0 Z',
    glass: 'M0 120 Q260 40 500 30 Q740 40 1000 120 M0 380 Q140 470 320 500',
    dash: 'M180 480 Q500 540 820 480',
  },
  // The Ring racer: a round porthole, the ring's arc framing it.
  ring: {
    frame: 'M-4000 -4000 H5000 V5000 H-4000 Z M500 30 A290 290 0 1 0 500.1 30 Z',
    glass: 'M500 46 A274 274 0 1 1 499.9 46',
    dash: 'M330 540 Q500 580 670 540',
    round: true,
  },
  // The Hauler: a square windscreen in three panes, a heavy sill.
  hauler: {
    frame:
      'M0 600 L0 440 L1000 440 L1000 600 Z M0 0 L1000 0 L1000 70 L0 70 Z ' +
      'M0 0 L90 0 L90 600 L0 600 Z M1000 0 L910 0 L910 600 L1000 600 Z ' +
      'M318 70 L338 70 L328 440 L308 440 Z M682 70 L662 70 L672 440 L692 440 Z',
    glass: 'M90 70 L910 70 L910 440 L90 440 Z',
    dash: 'M90 440 L910 440',
  },
};
