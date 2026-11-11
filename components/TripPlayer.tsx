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
import { useCallback, useEffect, useRef, useState } from 'react';
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
     * The cursor as a guide on the steps that have one: told each frame where it points on the
     * plane through what the eye looks at, or null when it is away, switched off by a click, or in
     * the Journey; `dt` is how far the step's time moved.
     */
    pointer?: {
      has: (k: number) => boolean;
      set: (at: Vec3 | null, dt: number, t: number) => void;
    };
    /**
     * A step you play (the Ocean's Swim): told every frame whether it is being played, where the
     * cursor is on screen (-1 to 1 each way, null when away), the keys held (lower case), and how
     * far the step's time moved. While it plays, the arrow keys steer instead of changing step.
     */
    game?: {
      has: (k: number) => boolean;
      set: (
        active: boolean,
        at: { x: number; y: number } | null,
        keys: string[],
        dt: number,
        t: number,
      ) => void;
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
  };
};

/** The Art pills, the same as the panel's (components/GeometryField.tsx ART_PILLS). */
export type TripPage = 'big-bang' | 'journey' | 'vegetal' | 'ocean';

const ART_LINKS: { href: string; label: string; page?: TripPage }[] = [
  { href: '/geometry-field?tab=stars', label: 'Stars' },
  { href: '/geometry-field?tab=geometry', label: 'Geometry' },
  { href: '/geometry-field?tab=tunnels', label: 'Tunnels' },
  { href: '/geometry-field?tab=oils', label: 'Oils' },
  { href: '/geometry-field/big-bang', label: 'Big Bang', page: 'big-bang' },
  { href: '/geometry-field/journey', label: 'Journey', page: 'journey' },
  { href: '/geometry-field/vegetal', label: 'Vegetal', page: 'vegetal' },
  { href: '/geometry-field/ocean', label: 'Ocean', page: 'ocean' },
  { href: '/geometry-field?tab=experiment', label: 'Experiment' },
];

const WORDS_KEY = 'colourmap:journey-words';
const BG_KEY = 'colourmap:trip-bg';

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
  const immerse = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    mainRef.current?.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const change = () => setImmersed(document.fullscreenElement === mainRef.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
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
  // Where the cursor is on screen, -1 to 1 each way, and whether a click has it guiding.
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef(new Set<string>());
  const [bg, setBg] = useState(0);
  const bgRef = useRef<((i: number) => void) | null>(null);
  useEffect(() => {
    try {
      const i = Number(window.localStorage.getItem(`${BG_KEY}:${page}`));
      if (i > 0 && i < (tripRef.current.backgrounds?.length ?? 0)) setBg(i);
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
        window.localStorage.setItem(`${BG_KEY}:${page}`, String(i));
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

  const jumpTo = useCallback((k: number) => {
    const { phases, start } = tripRef.current;
    const n = phases.length;
    const i = ((k % n) + n) % n;
    if (journeyRef.current) timeRef.current = (start[i] as number) + 0.01;
    else {
      pieceRef.current = i;
      timeRef.current = 0;
      setHud({ index: i, u: 0, time: 0 });
      // Each step opens on its first look.
      setVariant(0);
    }
  }, []);
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
  }, []);
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
      if (playingRef.current) {
        const next = timeRef.current + dt * speedRef.current;
        // A step on its own keeps counting, so whatever moves with time never jumps at its loop.
        timeRef.current = P ? next : next % T.total;
      }
      const t = timeRef.current;
      const c = P ? P.camera(k, t) : T.camera?.(t);
      const game = T.pieces?.game;
      if (game) {
        const moved = playingRef.current ? dt * speedRef.current : 0;
        game.set(!!(P && game.has(k)), cursorRef.current, [...keysRef.current], moved, t);
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

      if (c) {
        // Stepped back from what it looks at on a tall screen.
        eye[0] = c.target[0] + (c.eye[0] - c.target[0]) * back;
        eye[1] = c.target[1] + (c.eye[1] - c.target[1]) * back;
        eye[2] = c.target[2] + (c.eye[2] - c.target[2]) * back;
        camera.position.set(eye[0], eye[1], eye[2]);
        camera.lookAt(c.target[0], c.target[1], c.target[2]);
      } else {
        // A slow sway of the eye, so depth reads even when nothing else moves.
        camera.position.x = Math.sin(t * 0.05) * 3;
        camera.position.y = Math.cos(t * 0.037) * 2;
        camera.lookAt(0, 0, 0);
      }

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
        if (P) {
          const u = P.progress(k, t);
          setHud({ index: k, u, time: u * P.length(k) });
        } else {
          const { index, u } = T.phaseAt(t);
          setHud({ index, u, time: t });
        }
        if (playingRef.current && now - idleRef.current > 4500) setChrome(false);
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
    const playing = () =>
      !journeyRef.current && !!tripRef.current.pieces?.game?.has(pieceRef.current);
    const key = (e: KeyboardEvent) => {
      wake();
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea');
      if (!typing) keysRef.current.add(e.key.toLowerCase());
      if (playing() && e.key.startsWith('Arrow')) {
        // While a step is played, the arrows steer.
        e.preventDefault();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') jumpTo(currentStep() + 1);
      else if (e.key === 'ArrowLeft') jumpTo(currentStep() - 1);
      else if (e.key === 'f') immerse();
    };
    const move = (e: PointerEvent) => {
      wake();
      cursorRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: 1 - (e.clientY / window.innerHeight) * 2,
      };
    };
    const away = (e: PointerEvent) => {
      if (!e.relatedTarget) cursorRef.current = null;
    };
    // A click on the picture itself switches the cursor's guide off and on again.
    const press = (e: PointerEvent) => {
      wake();
      if (e.target !== canvasRef.current || journeyRef.current) return;
      if (!tripRef.current.pieces?.pointer?.has(pieceRef.current)) return;
      guideRef.current = !guideRef.current;
      setGuide(guideRef.current);
    };
    const keyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const blur = () => keysRef.current.clear();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', press);
    document.addEventListener('pointerout', away);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      document.removeEventListener('pointerout', away);
      window.removeEventListener('keydown', key);
    };
  }, [jumpTo, togglePlay, currentStep, immerse]);

  const step = trip.phases[hud.index] as TripStep;
  const lines = step.words ?? [];
  const shown = trip.wordsShown?.(hud.u, lines.length) ?? lines.map(() => 1);
  return (
    <main
      ref={mainRef}
      className={`bb bb-${page}${
        !journey && trip.pieces?.variants?.has(hud.index) ? ' bb-raised' : ''
      }${immersed ? ' bb-immersed' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="bb-canvas"
        style={
          !journey && guide && trip.pieces?.pointer?.has(hud.index) ? { cursor: 'none' } : undefined
        }
      />
      <div className={`bb-top${chrome ? '' : ' bb-hidden'}`}>
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
      </div>
      {hasWords && words && lines.length > 0 ? (
        <blockquote className="jr-words" aria-live="polite">
          {lines.map((line, k) => (
            <p key={line} style={{ opacity: shown[k] ?? 0 }}>
              {line}
            </p>
          ))}
        </blockquote>
      ) : null}
      <div className={`bb-step${chrome ? '' : ' bb-quiet'}`} aria-live="polite">
        <div className="bb-step-head">
          <span className="bb-num" style={{ background: trip.stepColours[hud.index] }}>
            {hud.index + 1} / {trip.phases.length}
          </span>
          <span className="bb-name">{step.name}</span>
          {step.thread ? <span className="jr-thread">{step.thread}</span> : null}
        </div>
        <p className={`bb-line${chrome ? '' : ' bb-hidden'}`}>{step.line}</p>
      </div>
      <div className={`bb-bar${chrome ? '' : ' bb-hidden'}`}>
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
            <div className="bb-pills" role="toolbar" aria-label="Pieces">
              {trip.phases.map((p, k) => (
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
          </>
        )}
        <div className="bb-controls">
          {journey ? (
            <button type="button" onClick={() => jumpTo(hud.index - 1)} aria-label="Previous step">
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
            ⛶
          </button>
          {(trip.backgrounds?.length ?? 0) > 1 ? (
            <button type="button" onClick={nextBg} title="Change the background">
              {trip.backgrounds?.[bg]?.name}
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
          {!journey && trip.pieces?.toggle?.has(hud.index) ? (
            <button type="button" aria-pressed={switched} onClick={() => setSwitched((s) => !s)}>
              {typeof trip.pieces.toggle.label === 'string'
                ? trip.pieces.toggle.label
                : trip.pieces.toggle.label(hud.index)}
            </button>
          ) : null}
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
        </div>
      </div>
    </main>
  );
}
