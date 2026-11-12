'use client';

/*
 * THE TRIP PLAYER — the Big Bang's player, shared since 2026-11-09 with the
 * Journey that follows it (docs/specs/art-journey.md). One cloud of grains,
 * a perspective camera, the Builder's bloom, and the step bar that always
 * says where in the trip you are; tapping a step jumps there. The trip itself
 * is pure math (lib/bigbang.ts, lib/journey.ts): where each grain is, and what
 * colour, at any moment. A trip may also move the camera, fade grains by their
 * distance from it, and carry words for each step.
 */
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Particle, Phase, RGB, Vec3 } from '@/lib/bigbang';

export type TripStep = Phase & {
  /** What the step's words are about (the Journey's threads). */
  thread?: string;
  /** A short reflection, shown a line at a time. */
  words?: string[];
};

export type Trip = {
  phases: TripStep[];
  start: number[];
  total: number;
  stepColours: string[];
  makeParticles: (n: number) => Particle[];
  particleAt: (p: Particle, t: number) => { pos: Vec3; rgb: RGB };
  phaseAt: (t: number) => { index: number; u: number };
  look: (t: number) => { glow: number; size: number };
  /** Where the eye stands and looks; without it, the Big Bang's slow sway round the centre. */
  camera?: (t: number) => { eye: Vec3; target: Vec3 };
  /** How much a grain shows by its distance from the eye; without it, the Big Bang's depth fade. */
  fade?: (pos: Vec3, eye: Vec3) => number;
  /**
   * Backgrounds to pick from, the first by default: one colour is flat, several run from the top
   * of the screen to the bottom for a feeling of depth. The choice is remembered on the device.
   */
  backgrounds?: { name: string; stops: string[] }[];
  /** How far each line of a step's words has come in, `u` through the step. */
  wordsShown?: (u: number, lines: number) => number[];
  /**
   * Each step on its own, looping, with nothing between: what the page opens
   * on when given. The Journey button plays the whole trip instead.
   */
  pieces?: {
    length: (k: number) => number;
    progress: (k: number, s: number) => number;
    particleAt: (p: Particle, k: number, s: number) => { pos: Vec3; rgb: RGB };
    camera: (k: number, s: number) => { eye: Vec3; target: Vec3 };
    look: (k: number) => { glow: number; size: number };
    /** Which way the moving dots run, for the steps that have them: all up or all down; null in the Journey. */
    flow?: { has: (k: number) => boolean; set: (up: boolean | null) => void };
    /**
     * Looks to try on a step, as a row of pills (the 3D tree's ground); the first in the Journey.
     * Names and label may differ per step; `set` is told the step, none in the Journey.
     */
    variants?: {
      has: (k: number) => boolean;
      names: string[] | ((k: number) => string[]);
      set: (i: number, k?: number) => void;
      /** What the pills choose, for screen readers; "Ground" if not given. */
      label?: string | ((k: number) => string);
    };
    /**
     * Colour presets for a step (the golden city's Gold, Rose gold, …), opened from a Palette pill
     * in the Design menu; the pill shows only on the steps that have them. The first in the
     * Journey and on each step as it opens; `set` is told the step, none in the Journey.
     */
    palettes?: {
      has: (k: number) => boolean;
      names: string[] | ((k: number) => string[]);
      set: (i: number, k?: number) => void;
    };
    /**
     * The cursor as a guide on the steps that have one: told each frame where it points on the
     * plane through what the eye looks at, or null when it is away, switched off by a click, or in
     * the Journey; `dt` is how far the step's time moved.
     */
    pointer?: {
      has: (k: number) => boolean;
      set: (at: Vec3 | null, dt: number, t: number) => void;
    };
    /**
     * A step you play (the Ocean's Shark Sim, the Vegetal's Bird Sim): told every frame whether it
     * is being played, the keys held (lower case), and how far the step's time moved. Keys only,
     * never the mouse (2026-11-11). While it plays, the arrow keys steer instead of changing step.
     * Esc lets go of it (told it is not played, so it plays on by itself) until Steer, Enter or
     * W A S D E Q X takes it back.
     */
    game?: {
      has: (k: number) => boolean;
      set: (active: boolean, keys: string[], dt: number, t: number) => void;
      /** Keys the game takes for itself while played, beyond the arrows (the Shark Sim's Space, its boost). */
      claims?: string[];
      /** A small bar shown while it is played (the Shark Sim's boost), its value 0 to 1, read every frame. */
      meter?: { label: string; value: () => number };
      /** A short count shown beside the bar while it is played (the Shark Sim's finds), read every frame. */
      tally?: () => string;
      /**
       * Small round dials, like a cockpit's, shown while it is played and kept in full screen (the
       * Shark Sim's height, speed, fish eaten, treasure): read every frame, their needles swinging
       * from `min` (0 if not given) to `max`. The same dials every frame.
       */
      gauges?: () => Gauge[];
      /**
       * How much the screen is blotted out, 0 to 1, read every frame (the Shark Sim's squid ink):
       * drawn as blots of ink over the picture, splashed somewhere new each time it comes.
       */
      veil?: () => number;
    };
    /**
     * A switch to try on a step (the 3D tree all in gold), beside the speeds; off in the Journey.
     * Each step its own: named by step, told which step, and off again on a new step.
     */
    toggle?: {
      has: (k: number) => boolean;
      label: string | ((k: number) => string);
      set: (on: boolean, k?: number) => void;
    };
    /**
     * A second row of pills above the looks (the Ocean's Shark Sim's seas); the first in the Journey
     * and on each step as it opens. `set` is told the step, none in the Journey.
     */
    scenes?: {
      has: (k: number) => boolean;
      names: string[];
      set: (i: number, k?: number) => void;
      label: string;
    };
    /**
     * A button beside the speeds that steps through a few looks, showing the one on (the Ocean's
     * coral colours); kept from step to step, the first in the Journey. Several give a button each
     * (the Ocean's coral colours and fish colours).
     */
    cycle?: Cycle | Cycle[];
    /**
     * Words of a step on its own that change as it plays (the Shark Sim's lines on freedom), `s`
     * seconds in: the lines, and how far they have come in (0..1); null for the step's own words.
     */
    words?: (k: number, s: number) => { lines: string[]; shown: number } | null;
  };
};

export type Cycle = {
  has: (k: number) => boolean;
  names: string[];
  label: string;
  set: (i: number) => void;
};

/** A dial of a game's cockpit. */
export type Gauge = { label: string; value: number; min?: number; max: number; unit?: string };

/** Where a dial's needle points for a value: from -135° at `min` round to 135° at `max`. */
export const needleAngle = (g: Gauge) => {
  const lo = g.min ?? 0;
  const k = g.max > lo ? (g.value - lo) / (g.max - lo) : 0;
  return -135 + 270 * Math.max(0, Math.min(1, k));
};

/** How far the on-screen stick's knob travels from its middle, in px. */
const STICK_REACH = 44;
/** The middle of the stick that steers nothing, as a share of its reach. */
const STICK_DEAD = 0.35;

/**
 * The arrow keys the on-screen stick holds for a thumb `dx`, `dy` px from its middle (down is
 * positive): the keys the games already read from a keyboard, so a phone needs no game changes
 * (2026-11-12: "find a way to move and navigate when on phone").
 */
export function stickKeys(dx: number, dy: number, reach = STICK_REACH): string[] {
  const x = dx / reach;
  const y = dy / reach;
  const keys: string[] = [];
  if (x < -STICK_DEAD) keys.push('arrowleft');
  else if (x > STICK_DEAD) keys.push('arrowright');
  if (y < -STICK_DEAD) keys.push('arrowup');
  else if (y > STICK_DEAD) keys.push('arrowdown');
  return keys;
}

/** What a key a game claims is called on its round button: Space by the game's bar, B the bite. */
export function claimLabel(key: string, meter?: string): string {
  if (key === ' ') return meter ?? 'Jump';
  if (key === 'b') return 'Bite';
  if (key === 'l') return 'Look';
  if (key === 'enter') return 'Go';
  return key.toUpperCase();
}

/**
 * A finger's move on the picture, from touch to lift: a quick sideways flick goes to the next
 * piece (1, flicked left) or the previous one (-1); anything else is no swipe (0), so a slower
 * drag is free to turn the view.
 */
export function swipeStep(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > 400 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * The same for an upright flick, in the Studio: up goes to the piece's next variant (1), down to
 * the one before (-1), as ↓ and ↑ do (2026-11-12: "click up down for variants, left right for
 * other category").
 */
export function swipeVariant(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > 400 || Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.5) return 0;
  return dy < 0 ? 1 : -1;
}

/** The names of a step's variants, or none. */
export function variantsAt(v: NonNullable<Trip['pieces']>['variants'], k: number): string[] {
  if (!v?.has(k)) return [];
  return typeof v.names === 'function' ? v.names(k) : v.names;
}

/** The key that remembers a world's navigation hint was shown. */
export const HINT_KEY = 'colourmap:trip-hint';

/**
 * The viewer's own turn on a piece's camera, on top of its path (2026-11-12: pinch to zoom, drag
 * to orbit): `zoom` scales the eye's distance from what it looks at, `yaw` and `pitch` turn the eye
 * round it (radians), `side` slides eye and target sideways, a share of that distance.
 */
export type View = { zoom: number; yaw: number; pitch: number; side: number };
export const VIEW_HOME: View = { zoom: 1, yaw: 0, pitch: 0, side: 0 };
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;
/** The highest the eye climbs above (or sinks below) what it looks at, radians. */
const ELEVATION_MAX = 1.35;
const SIDE_MAX = 0.4;

const clampTo = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** A view kept inside its limits. */
export function clampView(v: View): View {
  return {
    zoom: clampTo(v.zoom, ZOOM_MIN, ZOOM_MAX),
    yaw: v.yaw,
    pitch: clampTo(v.pitch, -2 * ELEVATION_MAX, 2 * ELEVATION_MAX),
    side: clampTo(v.side, -SIDE_MAX, SIDE_MAX),
  };
}

/** A view eased a share `k` (0..1) of the way home, exactly home once it is close. */
export function easeView(v: View, k: number): View {
  const near = (x: number, home: number, eps: number) => {
    const y = x + (home - x) * k;
    return Math.abs(y - home) < eps ? home : y;
  };
  return {
    zoom: near(v.zoom, 1, 1e-3),
    yaw: near(v.yaw, 0, 1e-3),
    pitch: near(v.pitch, 0, 1e-3),
    side: near(v.side, 0, 1e-3),
  };
}

export const isHome = (v: View) => v.zoom === 1 && v.yaw === 0 && v.pitch === 0 && v.side === 0;

/**
 * Where the eye stands and looks with the viewer's turn on top of the path's: round the target,
 * the climb kept short of straight above or below so the picture never flips.
 */
export function viewCamera(eye: Vec3, target: Vec3, v: View): { eye: Vec3; target: Vec3 } {
  const dx = eye[0] - target[0];
  const dy = eye[1] - target[1];
  const dz = eye[2] - target[2];
  const r = Math.hypot(dx, dy, dz) || 1e-6;
  const flat = Math.hypot(dx, dz);
  const az = Math.atan2(dx, dz) + v.yaw;
  const el = clampTo(Math.atan2(dy, flat) + v.pitch, -ELEVATION_MAX, ELEVATION_MAX);
  const rr = r * v.zoom;
  // Sideways: across the line of sight, level with the ground.
  const sx = Math.cos(az) * v.side * r;
  const sz = -Math.sin(az) * v.side * r;
  const t: Vec3 = [target[0] + sx, target[1], target[2] + sz];
  return {
    eye: [
      t[0] + rr * Math.cos(el) * Math.sin(az),
      t[1] + rr * Math.sin(el),
      t[2] + rr * Math.cos(el) * Math.cos(az),
    ],
    target: t,
  };
}

/** The Art pills, the same as the panel's (components/GeometryField.tsx ART_PILLS). */
export type TripPage = 'big-bang' | 'journey' | 'vegetal' | 'ocean' | 'city';

const ART_LINKS: { href: string; label: string; page?: TripPage }[] = [
  { href: '/geometry-field?tab=stars', label: 'Stars' },
  { href: '/geometry-field?tab=geometry', label: 'Geometry' },
  { href: '/geometry-field?tab=tunnels', label: 'Tunnels' },
  { href: '/geometry-field?tab=oils', label: 'Oils' },
  { href: '/geometry-field/big-bang', label: 'Big Bang', page: 'big-bang' },
  { href: '/geometry-field/journey', label: 'Journey', page: 'journey' },
  { href: '/geometry-field/vegetal', label: 'Vegetal', page: 'vegetal' },
  { href: '/geometry-field/ocean', label: 'Ocean', page: 'ocean' },
  { href: '/geometry-field/city', label: 'City', page: 'city' },
  { href: '/geometry-field?tab=experiment', label: 'Experiment' },
];

const WORDS_KEY = 'colourmap:journey-words';
const BG_KEY = 'colourmap:trip-bg';
const MODE_KEY = 'colourmap:trip-mode';

/** A background from top to bottom through its colours, with a soft glow of light from above. */
function backgroundTexture(stops: string[]): THREE.Texture | THREE.Color {
  if (stops.length < 2) return new THREE.Color(stops[0] ?? '#040207');
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 512);
  const glow = ctx.createRadialGradient(32, -40, 0, 32, -40, 300);
  glow.addColorStop(0, 'rgba(120,180,255,0.14)');
  glow.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function circleTexture(): THREE.Texture {
  const sz = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = sz;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, sz, sz);
  return new THREE.CanvasTexture(canvas);
}

const smooth = (x: number) => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function TripPlayer({ trip, page }: { trip: Trip; page: TripPage }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [chrome, setChrome] = useState(true);
  // Full screen with nothing but the picture: every control and word hidden until Esc
  // (2026-11-11: "make ability to really go full screen so I can get absorbed in the visual").
  const mainRef = useRef<HTMLElement>(null);
  const [immersed, setImmersed] = useState(false);
  // Where the browser has no full screen for a page (an iPhone), the picture alone all the same:
  // the player already covers the window, so hiding the controls is the whole of it.
  const fauxRef = useRef(false);
  // Every control in one Design menu, shut by default, so the picture has the screen
  // (2026-11-12: "all buttons can be in a design menu tab so on phone they dont take all the
  // screen space").
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(false);
  const designRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openMenu = useCallback((open: boolean, focusBack = false) => {
    menuRef.current = open;
    setMenu(open);
    if (!open && focusBack) designRef.current?.focus();
  }, []);
  useEffect(() => {
    if (menu) panelRef.current?.focus();
  }, [menu]);
  const immerse = useCallback(() => {
    openMenu(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (fauxRef.current) {
      fauxRef.current = false;
      setImmersed(false);
      return;
    }
    const faux = () => {
      fauxRef.current = true;
      setImmersed(true);
    };
    const el = mainRef.current;
    if (!el?.requestFullscreen) faux();
    else el.requestFullscreen().catch(faux);
  }, [openMenu]);
  useEffect(() => {
    const change = () => {
      fauxRef.current = false;
      setImmersed(document.fullscreenElement === mainRef.current);
    };
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  // A phone or tablet: the games get a stick and buttons, and a swipe changes piece.
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    // Not 'ontouchstart': a laptop with a touch screen keeps its keyboard look until it is touched.
    if (window.matchMedia?.('(pointer: coarse)').matches) setTouch(true);
  }, []);
  const [words, setWords] = useState(true);
  const idleRef = useRef(0);
  const tripRef = useRef(trip);
  const hasWords = trip.phases.some((p) => p.words?.length);
  // Steps on their own (time counts up from 0 in the step) or the whole trip.
  const [journey, setJourney] = useState(!trip.pieces);
  const journeyRef = useRef(!trip.pieces);
  const pieceRef = useRef(0);
  const [flowUp, setFlowUp] = useState(true);
  useEffect(() => {
    tripRef.current.pieces?.flow?.set(journey ? null : flowUp);
  }, [journey, flowUp]);
  const [variant, setVariant] = useState(0);
  const [hud, setHud] = useState({ index: 0, u: 0, time: 0 });
  useEffect(() => {
    const v = tripRef.current.pieces?.variants;
    if (journey) v?.set(0);
    else v?.set(variant, hud.index);
  }, [journey, variant, hud.index]);
  /** The current piece's next (1) or previous (-1) variant, round and round; none in the Journey. */
  const stepVariant = useCallback((d: 1 | -1) => {
    if (journeyRef.current) return;
    const n = variantsAt(tripRef.current.pieces?.variants, pieceRef.current).length;
    if (n < 2) return;
    setVariant((v) => (((v + d) % n) + n) % n);
  }, []);
  // Colour presets: a Palette pill opens them; each piece opens on its first.
  const [palette, setPalette] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const c = tripRef.current.pieces?.palettes;
    if (journey) c?.set(0);
    else c?.set(palette, hud.index);
  }, [journey, palette, hud.index]);
  // The navigation hint, once per world on the device, fading after a few seconds.
  const [hint, setHint] = useState<'on' | 'out' | null>(null);
  // Where the cursor is on screen, -1 to 1 each way, and whether a click has it guiding.
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef(new Set<string>());
  // A step you play can be let go of (Esc) and taken back (Steer, Enter or a steering key); each
  // step opens taken.
  const stoppedRef = useRef(false);
  const [stopped, setStopped] = useState(false);
  const stopGame = useCallback((stop: boolean) => {
    stoppedRef.current = stop;
    setStopped(stop);
    keysRef.current.clear();
  }, []);
  // The on-screen stick and buttons hold keys in the same set the keyboard fills.
  const stickRef = useRef<{ id: number; cx: number; cy: number } | null>(null);
  const stickHeld = useRef<string[]>([]);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const holdStick = useCallback((keys: string[]) => {
    for (const k of stickHeld.current) if (!keys.includes(k)) keysRef.current.delete(k);
    for (const k of keys) keysRef.current.add(k);
    stickHeld.current = keys;
  }, []);
  const stickMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const s = stickRef.current;
      if (!s || s.id !== e.pointerId) return;
      let dx = e.clientX - s.cx;
      let dy = e.clientY - s.cy;
      const d = Math.hypot(dx, dy);
      if (d > STICK_REACH) {
        dx *= STICK_REACH / d;
        dy *= STICK_REACH / d;
      }
      setKnob({ x: dx, y: dy });
      holdStick(stickKeys(dx, dy));
    },
    [holdStick],
  );
  const stickDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault();
      // A thumb on the stick takes the controls back, as W A S D do.
      if (stoppedRef.current) stopGame(false);
      const r = e.currentTarget.getBoundingClientRect();
      stickRef.current = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      stickMove(e);
    },
    [stickMove, stopGame],
  );
  const stickUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (stickRef.current?.id !== e.pointerId) return;
      stickRef.current = null;
      setKnob({ x: 0, y: 0 });
      holdStick([]);
    },
    [holdStick],
  );
  // The viewer's own turn on the camera (pinch or wheel to zoom, drag to orbit), eased home a
  // few seconds after the last touch, or quickly on Reset view.
  const viewRef = useRef<View>(VIEW_HOME);
  const viewAtRef = useRef(0);
  const returnRef = useRef(false);
  const holdingRef = useRef(false);
  const resetView = useCallback(() => {
    returnRef.current = true;
  }, []);
  // A piece that flies on its own (the Cell corridor, the Canyon): what it looks at moves on.
  // Found from its camera, never by name; there the stick drives instead of steering a game.
  const fliesRef = useRef(false);
  const [flies, setFlies] = useState(false);
  const pressKey = useCallback(
    (key: string, down: boolean) => {
      if (!down) {
        keysRef.current.delete(key);
        return;
      }
      if (stoppedRef.current) stopGame(false);
      keysRef.current.add(key);
    },
    [stopGame],
  );
  const meterRef = useRef<HTMLSpanElement>(null);
  const tallyRef = useRef<HTMLSpanElement>(null);
  const [bg, setBg] = useState(0);
  const bgRef = useRef<((i: number) => void) | null>(null);
  useEffect(() => {
    try {
      // Remembered by name, so adding a background never shifts the choice.
      const name = window.localStorage.getItem(`${BG_KEY}:${page}`);
      const i = tripRef.current.backgrounds?.findIndex((b) => b.name === name) ?? -1;
      if (i > 0) setBg(i);
    } catch {
      // The first background.
    }
  }, [page]);
  useEffect(() => {
    bgRef.current?.(bg);
  }, [bg]);
  const nextBg = useCallback(() => {
    const n = tripRef.current.backgrounds?.length ?? 0;
    if (n < 2) return;
    setBg((b) => {
      const i = (b + 1) % n;
      try {
        const name = tripRef.current.backgrounds?.[i]?.name;
        if (name) window.localStorage.setItem(`${BG_KEY}:${page}`, name);
      } catch {
        // Not remembered; still changed.
      }
      return i;
    });
  }, [page]);
  const guideRef = useRef(true);
  const [guide, setGuide] = useState(true);
  const [switched, setSwitched] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new step is what turns it off
  useEffect(() => {
    setSwitched(false);
  }, [hud.index]);
  useEffect(() => {
    tripRef.current.pieces?.toggle?.set(!journey && switched, journey ? undefined : hud.index);
  }, [journey, switched, hud.index]);
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const s = tripRef.current.pieces?.scenes;
    if (journey) s?.set(0);
    else s?.set(scene, hud.index);
  }, [journey, scene, hud.index]);
  // Asked again when the look or the scene changes (the Cell's Corridor pill), after they are set.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new look or scene can start the flight
  useEffect(() => {
    const P = tripRef.current.pieces;
    const k = hud.index;
    let f = false;
    if (!journey && P && !P.game?.has(k)) {
      const a = P.camera(k, 0).target;
      const b = P.camera(k, 6).target;
      f = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 3;
    }
    fliesRef.current = f;
    setFlies(f);
  }, [journey, hud.index, variant, scene]);
  const cycles = ([] as Cycle[]).concat(trip.pieces?.cycle ?? []);
  const [cycled, setCycled] = useState<number[]>([]);
  useEffect(() => {
    const all = ([] as Cycle[]).concat(tripRef.current.pieces?.cycle ?? []);
    all.forEach((c, i) => {
      c.set(journey ? 0 : (cycled[i] ?? 0));
    });
  }, [journey, cycled]);
  // A game's dials and its ink, drawn straight onto the page every frame.
  const needlesRef = useRef<(SVGGElement | null)[]>([]);
  const readingsRef = useRef<(SVGTextElement | null)[]>([]);
  const inkRef = useRef<HTMLDivElement>(null);
  // Words that change as a step plays (the Shark Sim's lines on freedom).
  const [live, setLive] = useState<{ lines: string[]; shown: number } | null>(null);
  const liveKey = useRef('');

  useEffect(() => {
    try {
      if (window.localStorage.getItem(WORDS_KEY) === 'off') setWords(false);
    } catch {
      // Words stay on.
    }
  }, []);

  const toggleWords = useCallback(() => {
    setWords((w) => {
      try {
        window.localStorage.setItem(WORDS_KEY, w ? 'off' : 'on');
      } catch {
        // Not remembered; still switched.
      }
      return !w;
    });
  }, []);

  // The last studio piece, to come back to from the game.
  const studioRef = useRef(-1);
  const jumpTo = useCallback(
    (k: number) => {
      const { phases, start } = tripRef.current;
      const n = phases.length;
      const i = ((k % n) + n) % n;
      if (journeyRef.current) timeRef.current = (start[i] as number) + 0.01;
      else {
        // Which side of the world this is (the game or the studio), remembered on the device.
        const game = tripRef.current.pieces?.game;
        if (game && phases.some((_, k) => game.has(k))) {
          if (!game.has(i)) studioRef.current = i;
          try {
            window.localStorage.setItem(`${MODE_KEY}:${page}`, game.has(i) ? 'game' : 'studio');
          } catch {
            // Not remembered; still switched.
          }
        }
        pieceRef.current = i;
        timeRef.current = 0;
        // Each piece opens on its own path's view.
        viewRef.current = VIEW_HOME;
        setHud({ index: i, u: 0, time: 0 });
        // Each step opens on its first look.
        setVariant(0);
        setScene(0);
        setPalette(0);
        stopGame(false);
      }
    },
    [stopGame, page],
  );
  // Two sides to a world with a game (2026-11-12: "u have all the test elements and the 3d
  // videogame as two components"): the Game (the pieces `game.has`), and the Studio, every other
  // piece, to play with designs. Never by name or number, so new pieces fall in on their own.
  const isGame = useCallback((k: number) => !!tripRef.current.pieces?.game?.has(k), []);
  const toStudio = useCallback(
    (from: number, dir: 1 | -1) => {
      const n = tripRef.current.phases.length;
      for (let s = 1; s <= n; s++) {
        const k = (((from + dir * s) % n) + n) % n;
        if (!isGame(k)) return k;
      }
      return from;
    },
    [isGame],
  );
  const switchMode = useCallback(
    (game: boolean) => {
      const n = tripRef.current.phases.length;
      if (game) {
        const k = Array.from({ length: n }, (_, i) => i).find(isGame);
        if (k !== undefined) jumpTo(k);
        return;
      }
      const back = studioRef.current;
      jumpTo(back >= 0 && !isGame(back) ? back : toStudio(-1, 1));
    },
    [isGame, jumpTo, toStudio],
  );
  // A world opens on the side it was left on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the page opens
  useEffect(() => {
    if (journeyRef.current) return;
    try {
      if (window.localStorage.getItem(`${MODE_KEY}:${page}`) === 'game') switchMode(true);
    } catch {
      // The first piece.
    }
  }, []);
  // The hint, once per world: "↑↓ variants · ←→ pieces", gone after a few seconds.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the page opens
  useEffect(() => {
    if (journeyRef.current) return;
    try {
      if (window.localStorage.getItem(`${HINT_KEY}:${page}`)) return;
      window.localStorage.setItem(`${HINT_KEY}:${page}`, '1');
    } catch {
      // Shown, though not remembered.
    }
    setHint('on');
  }, []);
  useEffect(() => {
    if (!hint) return;
    const next = window.setTimeout(
      () => setHint(hint === 'on' ? 'out' : null),
      hint === 'on' ? 4500 : 1800,
    );
    return () => window.clearTimeout(next);
  }, [hint]);
  const currentStep = useCallback(
    () => (journeyRef.current ? tripRef.current.phaseAt(timeRef.current).index : pieceRef.current),
    [],
  );
  const toggleJourney = useCallback(() => {
    const T = tripRef.current;
    if (journeyRef.current) {
      pieceRef.current = T.phaseAt(timeRef.current).index;
      timeRef.current = 0;
    } else timeRef.current = (T.start[pieceRef.current] as number) + 0.01;
    journeyRef.current = !journeyRef.current;
    setJourney(journeyRef.current);
    stopGame(false);
  }, [stopGame]);
  const togglePlay = useCallback(() => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  }, []);
  const changeSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const T = tripRef.current;
    const small = window.innerWidth < 700;
    const N = small ? 5200 : 9000;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040207');
    let bgTex: THREE.Texture | null = null;
    bgRef.current = (i: number) => {
      const stops = T.backgrounds?.[i]?.stops ?? ['#040207'];
      bgTex?.dispose();
      const b = backgroundTexture(stops);
      bgTex = b instanceof THREE.Texture ? b : null;
      scene.background = b;
    };
    const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 900);
    camera.position.set(0, 0, 58);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.2, 0.6, 0.05);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const particles = T.makeParticles(N);
    const positions = new Float32Array(N * 3);
    const colours = new Float32Array(N * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const texture = circleTexture();
    const material = new THREE.PointsMaterial({
      size: 0.42,
      sizeAttenuation: true,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    // On a tall phone screen the eye steps back, so the whole picture stays in view.
    let back = 1;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      back = w / h < 0.8 ? 1 / Math.max(0.55, w / h / 0.8) : 1;
      if (!T.camera) camera.position.z = 58 * back;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const eye: Vec3 = [0, 0, 58];
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane();
    const look = new THREE.Vector3();
    const aimAt = new THREE.Vector3();
    const hit = new THREE.Vector3();
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const P = journeyRef.current ? undefined : T.pieces;
      const k = pieceRef.current;
      const gamePiece = !!(P && T.pieces?.game?.has(k));
      // The stick on a piece that flies on its own: up flies faster, down slower, left and right
      // drift across.
      let pace = 1;
      if (P && !gamePiece && fliesRef.current && stickHeld.current.length > 0) {
        const held = stickHeld.current;
        if (held.includes('arrowup')) pace = 2.5;
        else if (held.includes('arrowdown')) pace = 0.3;
        const drift = (held.includes('arrowright') ? 1 : 0) - (held.includes('arrowleft') ? 1 : 0);
        if (drift !== 0) {
          viewRef.current = clampView({
            ...viewRef.current,
            side: viewRef.current.side + drift * dt * 0.5,
          });
        }
        viewAtRef.current = now;
      }
      // Home again, slowly a few seconds after the last touch, quickly on Reset view.
      if (!isHome(viewRef.current) && !holdingRef.current) {
        const rate = returnRef.current ? 3 : now - viewAtRef.current > 4000 ? 0.5 : 0;
        if (rate > 0) viewRef.current = easeView(viewRef.current, 1 - Math.exp(-dt * rate));
      }
      if (isHome(viewRef.current)) returnRef.current = false;
      if (playingRef.current) {
        const next = timeRef.current + dt * speedRef.current * pace;
        // A step on its own keeps counting, so whatever moves with time never jumps at its loop.
        timeRef.current = P ? next : next % T.total;
      }
      const t = timeRef.current;
      const c = P ? P.camera(k, t) : T.camera?.(t);
      const game = T.pieces?.game;
      if (game) {
        const moved = playingRef.current ? dt * speedRef.current : 0;
        const on = !!(P && game.has(k)) && !stoppedRef.current;
        game.set(on, [...keysRef.current], moved, t);
        // The game's bar (the Shark Sim's boost), drawn straight onto the page every frame.
        const bar = meterRef.current;
        if (bar && game.meter) bar.style.width = `${Math.round(game.meter.value() * 100)}%`;
        const count = tallyRef.current;
        if (count && game.tally) {
          const text = game.tally();
          if (count.textContent !== text) count.textContent = text;
        }
        // The cockpit's dials: each needle swung to its reading, the number under it.
        if (game.gauges && needlesRef.current.some(Boolean)) {
          game.gauges().forEach((g, i) => {
            const needle = needlesRef.current[i];
            const turn = `rotate(${needleAngle(g).toFixed(1)}deg)`;
            if (needle && needle.style.transform !== turn) needle.style.transform = turn;
            const reading = readingsRef.current[i];
            const text = String(Math.round(g.value));
            if (reading && reading.textContent !== text) reading.textContent = text;
          });
        }
        // Ink over the picture: splashed somewhere new each time it comes, then fading.
        const ink = inkRef.current;
        if (ink && game.veil) {
          const v = on ? game.veil() : 0;
          const was = Number(ink.dataset.v ?? 0);
          if (v > 0 && was === 0) {
            for (const blot of Array.from(ink.children) as HTMLElement[]) {
              const size = 22 + Math.random() * 26;
              blot.style.width = `${size}vmin`;
              blot.style.height = `${size * (0.8 + Math.random() * 0.4)}vmin`;
              blot.style.left = `${Math.random() * 90 - 10}%`;
              blot.style.top = `${Math.random() * 80 - 5}%`;
              blot.style.transform = `rotate(${Math.random() * 360}deg)`;
            }
          }
          const shown = Math.round(v * 100) / 100;
          if (shown !== was) {
            ink.dataset.v = String(shown);
            ink.style.opacity = String(shown);
          }
        }
      }
      const guided = T.pieces?.pointer;
      if (guided) {
        const at = cursorRef.current;
        const moved = playingRef.current ? dt * speedRef.current : 0;
        if (P && c && at && guideRef.current && guided.has(k)) {
          ndc.set(at.x, at.y);
          ray.setFromCamera(ndc, camera);
          camera.getWorldDirection(look);
          plane.setFromNormalAndCoplanarPoint(
            look,
            aimAt.set(c.target[0], c.target[1], c.target[2]),
          );
          const got = ray.ray.intersectPlane(plane, hit);
          guided.set(got ? [got.x, got.y, got.z] : null, moved, t);
        } else guided.set(null, moved, t);
      }

      // The path's eye: stepped back from what it looks at on a tall screen; with no camera, a
      // slow sway round the centre, so depth reads even when nothing else moves.
      const target: Vec3 = c ? c.target : [0, 0, 0];
      const path: Vec3 = c
        ? [
            c.target[0] + (c.eye[0] - c.target[0]) * back,
            c.target[1] + (c.eye[1] - c.target[1]) * back,
            c.target[2] + (c.eye[2] - c.target[2]) * back,
          ]
        : [Math.sin(t * 0.05) * 3, Math.cos(t * 0.037) * 2, 58 * back];
      // The viewer's turn on top; a game's chase camera only zooms (the stick steers there).
      const vw = gamePiece ? { ...VIEW_HOME, zoom: viewRef.current.zoom } : viewRef.current;
      const seen = isHome(vw) ? { eye: path, target } : viewCamera(path, target, vw);
      eye[0] = seen.eye[0];
      eye[1] = seen.eye[1];
      eye[2] = seen.eye[2];
      camera.position.set(eye[0], eye[1], eye[2]);
      camera.lookAt(seen.target[0], seen.target[1], seen.target[2]);

      for (let i = 0; i < N; i++) {
        const p = particles[i] as Particle;
        const { pos, rgb } = P ? P.particleAt(p, k, t) : T.particleAt(p, t);
        positions[i * 3] = pos[0];
        positions[i * 3 + 1] = pos[1];
        positions[i * 3 + 2] = pos[2];
        // Long, smooth fades: light comes out of the far dark and dissolves as it nears the eye.
        const z = pos[2];
        const fade = T.fade ? T.fade(pos, eye) : smooth((z + 340) / 230) * smooth((56 - z) / 30);
        colours[i * 3] = rgb[0] * fade;
        colours[i * 3 + 1] = rgb[1] * fade;
        colours[i * 3 + 2] = rgb[2] * fade;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      const lk = P ? P.look(k) : T.look(t);
      bloom.strength = lk.glow * 0.78; // a quarter less glow overall: the grains read as grains
      material.size = 0.42 * lk.size;
      composer.render();

      if (now - lastHud > 200) {
        lastHud = now;
        // Words that change as the step plays, set only when they do.
        const w = P?.words?.(k, t) ?? null;
        const key = w ? `${w.lines.join('|')}:${Math.round(w.shown * 10)}` : '';
        if (key !== liveKey.current) {
          liveKey.current = key;
          setLive(w);
        }
        if (P) {
          const u = P.progress(k, t);
          setHud({ index: k, u, time: u * P.length(k) });
        } else {
          const { index, u } = T.phaseAt(t);
          setHud({ index, u, time: t });
        }
        if (playingRef.current && !menuRef.current && now - idleRef.current > 4500) {
          setChrome(false);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    idleRef.current = performance.now();
    raf = requestAnimationFrame(frame);

    bgRef.current(0);
    return () => {
      cancelAnimationFrame(raf);
      bgRef.current = null;
      bgTex?.dispose();
      window.removeEventListener('resize', resize);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  // Show the controls again on any movement; keys for the projection.
  useEffect(() => {
    const wake = () => {
      idleRef.current = performance.now();
      setChrome(true);
    };
    const gameStep = () =>
      !journeyRef.current && !!tripRef.current.pieces?.game?.has(pieceRef.current);
    const playing = () => gameStep() && !stoppedRef.current;
    const key = (e: KeyboardEvent) => {
      wake();
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea');
      if (e.key === 'Escape' && menuRef.current) {
        // Esc shuts the Design menu first, the focus back on its button.
        openMenu(false, true);
        return;
      }
      if (e.key === 'Escape' && fauxRef.current) {
        // Out of the stand-in full screen, as the browser's own takes the first Esc.
        immerse();
        return;
      }
      if (!typing) keysRef.current.add(e.key.toLowerCase());
      if (!typing && e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) {
        openMenu(!menuRef.current, menuRef.current);
        return;
      }
      const claimed = tripRef.current.pieces?.game?.claims?.includes(e.key.toLowerCase());
      if (playing() && (e.key.startsWith('Arrow') || claimed)) {
        // While a step is played, the arrows steer, and the keys it claims are its own (Space: the
        // Shark Sim's boost, the Dot Walker's jump), not pause.
        e.preventDefault();
        return;
      }
      if (playing() && e.key === 'Escape') {
        // Esc lets go: the step plays on by itself. (In full screen the browser takes the first Esc to
        // leave full screen; a second one lets go.)
        stopGame(true);
        return;
      }
      if (gameStep() && !playing() && /^(enter|[wasdeqx])$/.test(e.key.toLowerCase())) {
        stopGame(false);
        keysRef.current.add(e.key.toLowerCase());
        return;
      }
      // In the Studio (a piece on its own that is no game): ↑ / ↓ the piece's variants, ← / → the
      // pieces, never into the game. A game let go of and the Journey keep ← / → as steps.
      const studio = !journeyRef.current && !gameStep();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (studio && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        stepVariant(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const d = e.key === 'ArrowRight' ? 1 : -1;
        jumpTo(studio ? toStudio(currentStep(), d) : currentStep() + d);
      } else if (e.key === 'f') immerse();
    };
    // Fingers and the mouse on the picture: one drags to orbit (not on a game, where the stick
    // steers), two pinch to zoom, a tap is the click, a quick sideways flick changes piece.
    const pts = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; zoom: number } | null = null;
    let drag: {
      id: number;
      x: number;
      y: number;
      lx: number;
      ly: number;
      at: number;
      moved: boolean;
      touch: boolean;
      start: View;
    } | null = null;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) || 1 : 1;
    };
    const touched = () => {
      viewAtRef.current = performance.now();
      returnRef.current = false;
    };
    const move = (e: PointerEvent) => {
      wake();
      cursorRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: 1 - (e.clientY / window.innerHeight) * 2,
      };
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        touched();
        viewRef.current = clampView({
          ...viewRef.current,
          zoom: (pinch.zoom * pinch.d) / spread(),
        });
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      const ddx = e.clientX - drag.lx;
      const ddy = e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
      if (!drag.moved || gameStep()) return;
      touched();
      const v = viewRef.current;
      viewRef.current = clampView({ ...v, yaw: v.yaw - ddx * 0.005, pitch: v.pitch + ddy * 0.005 });
    };
    const zoomBy = (e: WheelEvent) => {
      e.preventDefault();
      touched();
      const v = viewRef.current;
      viewRef.current = clampView({ ...v, zoom: v.zoom * Math.exp(e.deltaY * 0.0015) });
    };
    const away = (e: PointerEvent) => {
      if (!e.relatedTarget) cursorRef.current = null;
    };
    // A click on the picture itself switches the cursor's guide off and on again.
    const toggleGuide = () => {
      if (journeyRef.current) return;
      if (!tripRef.current.pieces?.pointer?.has(pieceRef.current)) return;
      guideRef.current = !guideRef.current;
      setGuide(guideRef.current);
    };
    const press = (e: PointerEvent) => {
      wake();
      const target = e.target as Node | null;
      if (e.pointerType === 'touch') setTouch(true);
      if (menuRef.current) {
        // A tap anywhere outside the Design menu shuts it, and does nothing else.
        const inside =
          !!target && (panelRef.current?.contains(target) || designRef.current?.contains(target));
        if (!inside) openMenu(false);
        return;
      }
      if (e.target !== canvasRef.current) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      holdingRef.current = true;
      touched();
      if (pts.size === 2) {
        // A second finger: a pinch, and no tap or flick when they lift.
        pinch = { d: spread(), zoom: viewRef.current.zoom };
        drag = null;
        return;
      }
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        lx: e.clientX,
        ly: e.clientY,
        at: performance.now(),
        moved: false,
        touch: e.pointerType === 'touch',
        start: viewRef.current,
      };
    };
    const lift = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) holdingRef.current = false;
      touched();
      const d = drag;
      if (!d || d.id !== e.pointerId) return;
      drag = null;
      if (e.type === 'pointercancel') return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= 8) {
        toggleGuide();
        return;
      }
      // A quick sideways flick changes piece, its little turn of the view undone; the games keep
      // the finger for their stick. In the studio it goes through its pieces only.
      const ms = performance.now() - d.at;
      const s = d.touch ? swipeStep(e.clientX - d.x, e.clientY - d.y, ms) : 0;
      if (s !== 0 && !gameStep()) {
        viewRef.current = d.start;
        jumpTo(journeyRef.current ? currentStep() + s : toStudio(currentStep(), s));
        return;
      }
      // An upright flick in the Studio: the piece's next or previous variant.
      const v = d.touch ? swipeVariant(e.clientX - d.x, e.clientY - d.y, ms) : 0;
      if (v !== 0 && !gameStep() && !journeyRef.current) {
        viewRef.current = d.start;
        stepVariant(v);
      }
    };
    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', zoomBy, { passive: false });
    const keyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const blur = () => keysRef.current.clear();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', lift);
    window.addEventListener('pointercancel', lift);
    document.addEventListener('pointerout', away);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', lift);
      window.removeEventListener('pointercancel', lift);
      canvas?.removeEventListener('wheel', zoomBy);
      document.removeEventListener('pointerout', away);
      window.removeEventListener('keydown', key);
    };
  }, [jumpTo, togglePlay, currentStep, immerse, stopGame, openMenu, toStudio, stepVariant]);

  const step = trip.phases[hud.index] as TripStep;
  const lines = live?.lines ?? step.words ?? [];
  const shown = live
    ? lines.map(() => live.shown)
    : (trip.wordsShown?.(hud.u, lines.length) ?? lines.map(() => 1));
  const game = trip.pieces?.game;
  const steering = !journey && !stopped && !!game?.has(hud.index);
  // The dials, the same set every frame: read once here for their names and ranges.
  const dials = steering ? (game?.gauges?.() ?? []) : [];
  const cockpit =
    dials.length > 0 ? (
      <div className="bb-gauges">
        {dials.map((g, i) => (
          <span
            key={g.label}
            className="bb-gauge"
            role="img"
            aria-label={`${g.label}${g.unit ? ` (${g.unit})` : ''}`}
          >
            <svg viewBox="0 0 56 56" aria-hidden="true">
              <circle className="bb-gauge-face" cx="28" cy="28" r="26" />
              {Array.from({ length: 9 }, (_, n) => {
                const a = ((-135 + n * 33.75 - 90) * Math.PI) / 180;
                return (
                  <line
                    key={n}
                    className="bb-gauge-tick"
                    x1={28 + Math.cos(a) * 21}
                    y1={28 + Math.sin(a) * 21}
                    x2={28 + Math.cos(a) * 24}
                    y2={28 + Math.sin(a) * 24}
                  />
                );
              })}
              <g
                className="bb-gauge-needle"
                ref={(el) => {
                  needlesRef.current[i] = el;
                }}
                style={{ transform: `rotate(${needleAngle(g)}deg)` }}
              >
                <line x1="28" y1="31" x2="28" y2="9" />
              </g>
              <circle className="bb-gauge-hub" cx="28" cy="28" r="2.5" />
              <text
                className="bb-gauge-value"
                x="28"
                y="45"
                ref={(el) => {
                  readingsRef.current[i] = el;
                }}
              >
                {Math.round(g.value)}
              </text>
            </svg>
            <span className="bb-gauge-label">{g.label}</span>
          </span>
        ))}
      </div>
    ) : null;
  const playable = !journey && !!game?.has(hud.index);
  // A button held like a key: down while the finger is on it.
  const holdKey = (k: string, label: string, className: string) => (
    <button
      type="button"
      key={k}
      className={className}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        pressKey(k, true);
      }}
      onPointerUp={() => pressKey(k, false)}
      onPointerCancel={() => pressKey(k, false)}
      onPointerLeave={() => pressKey(k, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
  const claims = game?.claims ?? [];
  // A world with a game has two sides, Game and Studio; the pills show the side you are on.
  const gamePieces = trip.phases.map((_, k) => k).filter((k) => !!game?.has(k));
  const twoSides = !!trip.pieces && gamePieces.length > 0 && gamePieces.length < trip.phases.length;
  const pillPieces = trip.phases
    .map((p, k) => ({ p, k }))
    .filter(({ k }) => !twoSides || !!game?.has(k) === playable);
  // The Studio's on-screen arrows and the current variant's name beside the piece's.
  const studioNav = !!trip.pieces && !journey && !playable;
  const variantList = variantsAt(trip.pieces?.variants, hud.index);
  const variantNow = variantList[variant] ?? '';
  const palettes = trip.pieces?.palettes;
  const paletteList =
    !journey && palettes?.has(hud.index)
      ? typeof palettes.names === 'function'
        ? palettes.names(hud.index)
        : palettes.names
      : [];
  return (
    <main
      ref={mainRef}
      className={`bb bb-${page}${immersed ? ' bb-immersed' : ''}${
        touch && (playable || flies) ? ' bb-touch-game' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        className="bb-canvas"
        style={
          !journey && guide && trip.pieces?.pointer?.has(hud.index) ? { cursor: 'none' } : undefined
        }
      />
      {immersed ? (
        <button
          type="button"
          className="bb-exit"
          onClick={immerse}
          title="Leave full screen (Esc or F)"
        >
          ✕ Exit full screen
        </button>
      ) : null}
      {/* While a game is played its bar and count stay on screen, full screen or not. */}
      {steering && (game?.meter || game?.tally || (immersed && cockpit)) ? (
        <div className="bb-hud">
          {game?.meter ? (
            <span className="bb-meter" role="img" aria-label={game.meter.label}>
              <span ref={meterRef} />
            </span>
          ) : null}
          {game?.tally ? <span className="bb-tally" ref={tallyRef} aria-live="polite" /> : null}
          {immersed ? cockpit : null}
        </div>
      ) : null}
      {/* A cockpit of dials while you steer (2026-11-11: "meters like in an airplane cockpit"). */}
      {!immersed && cockpit ? <div className="bb-cockpit">{cockpit}</div> : null}
      {/* Ink over the picture, when the game asks for it (2026-11-11: "spit ink on your screen"). */}
      {game?.veil ? (
        <div className="bb-ink" ref={inkRef} aria-hidden="true">
          {Array.from({ length: 7 }, (_, n) => (
            <span key={n} />
          ))}
        </div>
      ) : null}
      {/* On a phone a game is flown with a stick under the left thumb and its own keys under the
          right, held in the same set of keys as the keyboard's (2026-11-12). */}
      {touch && (playable || flies) ? (
        <div className="bb-touch">
          <div
            className="bb-stick"
            aria-hidden="true"
            onPointerDown={stickDown}
            onPointerMove={stickMove}
            onPointerUp={stickUp}
            onPointerCancel={stickUp}
          >
            <span
              className="bb-stick-knob"
              style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
            />
          </div>
          {playable ? (
            <div className="bb-acts">
              {claims.map((k) => holdKey(k, claimLabel(k, game?.meter?.label), 'bb-act'))}
              {/* Faster and slower, as Shift and X: small, above the game's own buttons. */}
              <div className="bb-paces">
                {holdKey('x', 'Slower', 'bb-pace')}
                {holdKey('shift', 'Faster', 'bb-pace')}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {hasWords && words && lines.length > 0 ? (
        <blockquote className="jr-words" aria-live="polite">
          {lines.map((line, k) => (
            <p
              key={line}
              className={line.startsWith('— ') ? 'jr-by' : undefined}
              style={{ opacity: shown[k] ?? 0 }}
            >
              {line}
            </p>
          ))}
        </blockquote>
      ) : null}
      {hint && studioNav ? (
        <div className={`bb-hint${hint === 'out' ? ' bb-hint-out' : ''}`} role="note">
          {touch ? 'Swipe ↕ variants · ↔ pieces' : '↑↓ variants · ←→ pieces'}
        </div>
      ) : null}
      <div className={`bb-step${chrome ? '' : ' bb-quiet'}`} aria-live="polite">
        <div className="bb-step-head">
          <span className="bb-num" style={{ background: trip.stepColours[hud.index] }}>
            {hud.index + 1} / {trip.phases.length}
          </span>
          {studioNav ? (
            <button
              type="button"
              className="bb-nav"
              onClick={() => jumpTo(toStudio(hud.index, -1))}
              aria-label="Previous piece (←)"
              title="Previous piece (←)"
            >
              ‹
            </button>
          ) : null}
          <span className="bb-name">{step.name}</span>
          {studioNav ? (
            <button
              type="button"
              className="bb-nav"
              onClick={() => jumpTo(toStudio(hud.index, 1))}
              aria-label="Next piece (→)"
              title="Next piece (→)"
            >
              ›
            </button>
          ) : null}
          {studioNav && variantNow ? (
            <>
              <span className="bb-variant-name">· {variantNow}</span>
              {variantList.length > 1 ? (
                <span className="bb-navs">
                  <button
                    type="button"
                    className="bb-nav"
                    onClick={() => stepVariant(-1)}
                    aria-label="Previous variant (↑)"
                    title="Previous variant (↑)"
                  >
                    ˄
                  </button>
                  <button
                    type="button"
                    className="bb-nav"
                    onClick={() => stepVariant(1)}
                    aria-label="Next variant (↓)"
                    title="Next variant (↓)"
                  >
                    ˅
                  </button>
                </span>
              ) : null}
            </>
          ) : null}
          {step.thread ? <span className="jr-thread">{step.thread}</span> : null}
        </div>
        <p className={`bb-line${chrome ? '' : ' bb-hidden'}`}>{step.line}</p>
      </div>
      <button
        type="button"
        ref={designRef}
        className={`bb-design${chrome || menu ? '' : ' bb-quiet'}`}
        aria-haspopup="dialog"
        aria-expanded={menu}
        aria-controls="bb-menu"
        onClick={() => openMenu(!menu, menu)}
        title="Design: the art, its pieces and looks (M)"
      >
        Design
      </button>
      {menu ? (
        <div
          id="bb-menu"
          ref={panelRef}
          className="bb-menu"
          role="dialog"
          aria-label="Design"
          tabIndex={-1}
        >
          <div className="bb-menu-head">
            <span className="bb-menu-title">Design</span>
            <button
              type="button"
              className="bb-menu-close"
              onClick={() => openMenu(false, true)}
              aria-label="Close the design menu"
            >
              ✕
            </button>
          </div>
          <nav className="bb-tabs" aria-label="Art">
            {ART_LINKS.map((l) =>
              l.page === page ? (
                <span key={l.href} className="bb-back bb-tab-on" aria-current="page">
                  {l.label}
                </span>
              ) : (
                <a key={l.href} href={l.href} className="bb-back">
                  {l.label}
                </a>
              ),
            )}
          </nav>
          {journey ? (
            <div className="bb-segments" role="toolbar" aria-label="Steps of the trip">
              {trip.phases.map((p, k) => {
                const fill = k === hud.index ? hud.u : k < hud.index ? 1 : 0;
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`bb-seg${k === hud.index ? ' bb-seg-on' : ''}`}
                    style={{ flexGrow: p.duration }}
                    onClick={() => jumpTo(k)}
                    title={`${k + 1}. ${p.name}`}
                    aria-label={`Go to step ${k + 1}, ${p.name}`}
                  >
                    <span style={{ width: `${fill * 100}%`, background: trip.stepColours[k] }} />
                  </button>
                );
              })}
            </div>
          ) : (
            // Steps on their own are presets, picked by name like the Art panel's, with no time bar.
            <>
              {twoSides ? (
                <div className="bb-pills bb-modes" role="toolbar" aria-label="Mode">
                  <button
                    type="button"
                    className="bb-pill"
                    aria-pressed={playable}
                    onClick={() => switchMode(true)}
                    title="The game: fly it yourself"
                  >
                    Game
                  </button>
                  <button
                    type="button"
                    className="bb-pill"
                    aria-pressed={!playable}
                    onClick={() => switchMode(false)}
                    title="The studio: every other piece, to play with designs"
                  >
                    Studio
                  </button>
                </div>
              ) : null}
              {pillPieces.length > 1 || !twoSides ? (
                <div className="bb-pills" role="toolbar" aria-label="Pieces">
                  {pillPieces.map(({ p, k }) => (
                    <button
                      type="button"
                      key={p.id}
                      className="bb-pill"
                      aria-pressed={k === hud.index}
                      onClick={() => jumpTo(k)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              ) : null}
              {trip.pieces?.scenes?.has(hud.index) ? (
                <div
                  className="bb-pills bb-variants"
                  role="toolbar"
                  aria-label={trip.pieces.scenes.label}
                >
                  {trip.pieces.scenes.names.map((name, i) => (
                    <button
                      type="button"
                      key={name}
                      className="bb-pill"
                      aria-pressed={i === scene}
                      onClick={() => setScene(i)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              {trip.pieces?.variants?.has(hud.index) ? (
                <div
                  className="bb-pills bb-variants"
                  role="toolbar"
                  aria-label={
                    (typeof trip.pieces.variants.label === 'function'
                      ? trip.pieces.variants.label(hud.index)
                      : trip.pieces.variants.label) ?? 'Ground'
                  }
                >
                  {(typeof trip.pieces.variants.names === 'function'
                    ? trip.pieces.variants.names(hud.index)
                    : trip.pieces.variants.names
                  ).map((name, i) => (
                    <button
                      type="button"
                      key={name}
                      className="bb-pill"
                      aria-pressed={i === variant}
                      onClick={() => setVariant(i)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              {paletteList.length > 0 ? (
                <div className="bb-pills bb-variants" role="toolbar" aria-label="Palette">
                  <button
                    type="button"
                    className="bb-pill"
                    aria-expanded={paletteOpen}
                    onClick={() => setPaletteOpen((o) => !o)}
                    title="Colour presets for this piece"
                  >
                    Palette{paletteOpen ? '' : ` · ${paletteList[palette] ?? paletteList[0]}`}
                  </button>
                  {paletteOpen
                    ? paletteList.map((name, i) => (
                        <button
                          type="button"
                          key={name}
                          className="bb-pill"
                          aria-pressed={i === palette}
                          onClick={() => setPalette(i)}
                        >
                          {name}
                        </button>
                      ))
                    : null}
                </div>
              ) : null}
            </>
          )}
          <div className="bb-controls">
            {journey ? (
              <button
                type="button"
                onClick={() => jumpTo(hud.index - 1)}
                aria-label="Previous step"
              >
                ⏮
              </button>
            ) : null}
            <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '❚❚' : '▶'}
            </button>
            {journey ? (
              <>
                <button type="button" onClick={() => jumpTo(hud.index + 1)} aria-label="Next step">
                  ⏭
                </button>
                <span className="bb-time">
                  {fmt(hud.time)} / {fmt(trip.total)}
                </span>
              </>
            ) : null}
            {trip.pieces ? (
              <button
                type="button"
                aria-pressed={journey}
                onClick={toggleJourney}
                title="Play every piece as one trip, through a ball of stars"
              >
                Journey
              </button>
            ) : null}
            {hasWords ? (
              <button type="button" aria-pressed={words} onClick={toggleWords}>
                Words
              </button>
            ) : null}
            <button
              type="button"
              onClick={immerse}
              aria-label="Full screen, the picture alone; Esc to come back"
              title="Full screen (F); Esc to come back"
            >
              ⛶ Full screen
            </button>
            <button
              type="button"
              onClick={resetView}
              title="Back to the piece's own view (pinch or wheel zooms, drag turns it)"
            >
              Reset view
            </button>
            {(trip.backgrounds?.length ?? 0) > 1 ? (
              <button type="button" onClick={nextBg} title="Change the background">
                {trip.backgrounds?.[bg]?.name}
              </button>
            ) : null}
            {playable ? (
              <button
                type="button"
                aria-pressed={!stopped}
                onClick={() => stopGame(!stopped)}
                title={stopped ? 'Take the controls (Enter)' : 'Let go (Esc)'}
              >
                Steer
              </button>
            ) : null}
            {!journey && trip.pieces?.toggle?.has(hud.index) ? (
              <button type="button" aria-pressed={switched} onClick={() => setSwitched((s) => !s)}>
                {typeof trip.pieces.toggle.label === 'string'
                  ? trip.pieces.toggle.label
                  : trip.pieces.toggle.label(hud.index)}
              </button>
            ) : null}
            {journey
              ? null
              : cycles.map((c, i) =>
                  c.has(hud.index) ? (
                    <button
                      type="button"
                      key={c.label}
                      onClick={() =>
                        setCycled((was) => {
                          const next = [...was];
                          next[i] = ((was[i] ?? 0) + 1) % (c.names.length || 1);
                          return next;
                        })
                      }
                      title={`${c.label}: next`}
                    >
                      {c.names[cycled[i] ?? 0]}
                    </button>
                  ) : null,
                )}
            {!journey && trip.pieces?.flow?.has(hud.index) ? (
              <button
                type="button"
                onClick={() => setFlowUp((f) => !f)}
                aria-label={
                  flowUp ? 'Dots moving up; send them down' : 'Dots moving down; send them up'
                }
                title={flowUp ? 'Moving up' : 'Moving down'}
              >
                {flowUp ? '↑' : '↓'}
              </button>
            ) : null}
            <span className="bb-speeds" role="toolbar" aria-label="Speed">
              {[0.5, 1, 2].map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={speed === s}
                  onClick={() => changeSpeed(s)}
                >
                  {s}×
                </button>
              ))}
            </span>
          </div>
        </div>
      ) : null}
    </main>
  );
}
