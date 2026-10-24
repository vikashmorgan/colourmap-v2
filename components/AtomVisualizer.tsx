'use client';

import { useEffect, useRef, useState } from 'react';

import { onChill } from '@/lib/chill/bus';
import {
  createSand,
  createStars,
  cymaticsCounts,
  type Grain,
  plateAt,
  type Star,
  stepSand,
  twinkle,
} from '@/lib/chill/cymatics-2d';
import { ECHO_TYPES, EchoField, type EchoSettings, shouldTrigger } from '@/lib/chill/echo';
import { EARTH_VISUAL_PALETTE } from '@/lib/chill/visuals';
import { luminance } from '@/lib/pad-palettes';

/*
 * Atom Visualizer — a family of eight soft dot visualizations
 * -----------------------------------------------------------
 *
 * Eight selectable modes, all on Canvas 2D, all touch-reactive,
 * all audio-reactive (if an AnalyserNode is provided).
 *
 *   atom         — golden-spiral cloud, spring-tied, drag-to-push
 *   fibonacci    — golden-angle spiral rotating and pulsing
 *   phyllotaxis  — sunflower-seed pattern, infinite-growth feel
 *   wave         — concentric radial ripples pulsing outward
 *   lissajous    — harmonograph-style braided curves
 *   constellation — network of lines between nearest neighbors
 *   helix        — parametric 3D-feeling double helix
 *   starfield    — warp-streak outward from center
 *
 * Tunable parameters exposed via props so a UI can let the user
 * modify the underlying math:
 *   - speed     : 0-1, how fast animations tick
 *   - density   : 0-1, how many dots (80-400 range)
 *   - scale     : 0-1, how big each dot is
 *
 * Every mode includes the same touch-push force as `atom` — drag
 * anywhere on the canvas and nearby dots are shoved outward before
 * easing back to their mode's home position.
 *
 * Optional `palette` recolours the dots (default: the warm Earth set) and
 * optional `echo` subscribes to the Chill bus so sound events leave echoes
 * (ripples, bubbles, bursts, glows, trails) — see lib/chill/echo.ts.
 */

export type VisualizerMode =
  | 'atom'
  | 'fibonacci'
  | 'phyllotaxis'
  | 'wave'
  | 'lissajous'
  | 'constellation'
  | 'helix'
  | 'tunnel'
  | 'morph'
  | 'saturn'
  | 'galaxy'
  | 'orbital'
  | 'solar'
  | 'cymatics';

interface AtomVisualizerProps {
  /** Optional AnalyserNode for audio-reactive modulation */
  analyser?: AnalyserNode | null;
  /** Width in px; defaults to 320 */
  width?: number;
  /** Height in px; defaults to 200 */
  height?: number;
  /** 0-1: how wildly dots react to touch + sound */
  intensity?: number;
  /** 0-1: animation speed multiplier */
  speed?: number;
  /** 0-1: controls dot count (~80 to ~400) */
  density?: number;
  /** 0-1: dot size multiplier */
  scale?: number;
  /** 0-1: overall opacity (0.2-1.0) */
  opacity?: number;
  /** 0-1: amount of 3D depth effect (adds perspective scaling) */
  depth3d?: number;
  /** Which visualization mode to render */
  mode?: VisualizerMode;
  /** Dot colours; defaults to the warm Earth palette. */
  palette?: readonly string[];
  /** Echo settings; when given, Chill bus events leave echoes on the canvas. */
  echo?: EchoSettings;
}

interface Dot {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  color: string;
  baseSize: number;
  phase: number;
  idx: number;
}

const WARM_PALETTE = EARTH_VISUAL_PALETTE;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function buildDots(
  count: number,
  width: number,
  height: number,
  palette: readonly string[],
): Dot[] {
  const dots: Dot[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.42;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const r = maxR * Math.sqrt(t);
    const a = i * GOLDEN_ANGLE;
    dots.push({
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
      homeX: cx + r * Math.cos(a),
      homeY: cy + r * Math.sin(a),
      vx: 0,
      vy: 0,
      color: palette[i % palette.length],
      baseSize: 1.4 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      idx: i,
    });
  }
  return dots;
}

export default function AtomVisualizer({
  analyser,
  width = 320,
  height = 200,
  intensity = 0.6,
  speed = 0.5,
  density = 0.5,
  scale = 0.5,
  opacity = 1,
  depth3d = 0,
  mode = 'atom',
  palette,
  echo,
}: AtomVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const modeRef = useRef<VisualizerMode>(mode);
  // Current (smoothed) values — what the render loop actually uses
  const paramsRef = useRef({ speed, density, scale, intensity, opacity, depth3d });
  // Target values — what the props say. Every frame the current lerps
  // toward the target so slider changes feel like tide coming in,
  // not like a switch flipping.
  const targetRef = useRef({ speed, density, scale, intensity, opacity, depth3d });
  const [hidden, setHidden] = useState(false);
  const paletteRef = useRef<readonly string[]>(palette?.length ? palette : WARM_PALETTE);
  const [echoField] = useState(() => new EchoField(echo));
  const echoRef = useRef<EchoSettings | undefined>(echo);
  // Cymatics keeps its own sand and stars (far more points than the dots).
  const cymRef = useRef<{ grains: Grain[]; stars: Star[]; phase: number; last: number } | null>(
    null,
  );

  // Recolour in place — positions and motion carry on untouched.
  useEffect(() => {
    const pal = palette?.length ? palette : WARM_PALETTE;
    paletteRef.current = pal;
    for (const d of dotsRef.current) d.color = pal[d.idx % pal.length];
  }, [palette]);

  useEffect(() => {
    echoRef.current = echo;
    if (echo) echoField.setSettings(echo);
  }, [echo, echoField]);

  // Sound events → echoes. Only listens while echo settings are given.
  const echoOn = echo !== undefined;
  useEffect(() => {
    if (!echoOn) return;
    return onChill((event) => {
      const settings = echoRef.current;
      if (!settings) return;
      const pal = paletteRef.current;
      const colored = event.color
        ? event
        : { ...event, color: pal[Math.floor(Math.random() * pal.length)] };
      const now = performance.now();
      for (const type of ECHO_TYPES) {
        if (shouldTrigger(event, settings[type])) {
          echoField.spawn(colored, type, width, height, now);
        }
      }
    });
  }, [echoOn, echoField, width, height]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    // Only update targets — the loop smoothly eases current toward these.
    // Density is snapped immediately because it controls array size,
    // not a visual parameter.
    targetRef.current = { speed, density, scale, intensity, opacity, depth3d };
    paramsRef.current.density = density;
  }, [speed, density, scale, intensity, opacity, depth3d]);

  useEffect(() => {
    function onVis() {
      setHidden(document.hidden);
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const count = Math.round(80 + density * 320);
    dotsRef.current = buildDots(count, width, height, paletteRef.current);
    const cymCounts = cymaticsCounts(density);
    cymRef.current = {
      grains: createSand(cymCounts.grains),
      stars: createStars(cymCounts.stars),
      phase: cymRef.current?.phase ?? 0,
      last: 0,
    };
    const field = echoField;
    let frameNow = 0;

    const analyserData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    function applyPointerPush(d: Dot, pushRadius: number, pushStrength: number) {
      // Every mode calls this per dot, so echo pushes ride along here.
      if (field.size > 0) {
        const f = field.forceAt(d.x, d.y, frameNow);
        d.vx += f.dx;
        d.vy += f.dy;
      }
      const p = pointerRef.current;
      if (!p.active) return;
      const pdx = d.x - p.x;
      const pdy = d.y - p.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < pushRadius && pdist > 0.01) {
        const force = (1 - pdist / pushRadius) * pushStrength;
        d.vx += (pdx / pdist) * force;
        d.vy += (pdy / pdist) * force;
      }
    }

    function loop(tMs: number) {
      if (hidden) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Smoothly lerp current params toward target. ~1-second ease
      // so moving a slider feels like a breath, not a jolt.
      const ease = 0.05;
      const p = paramsRef.current;
      const t = targetRef.current;
      p.speed += (t.speed - p.speed) * ease;
      p.scale += (t.scale - p.scale) * ease;
      p.intensity += (t.intensity - p.intensity) * ease;
      p.opacity += (t.opacity - p.opacity) * ease;
      p.depth3d += (t.depth3d - p.depth3d) * ease;

      const params = paramsRef.current;
      // Slower default curve: 0.15..1.05 range instead of 0.2..2.0 —
      // keeps everything meditative. User can still push up but it's
      // never chaotic.
      const speedMul = 0.15 + params.speed * 0.9;
      const sizeMul = 0.5 + params.scale * 1.8;
      const pushStrength = 1.2 * params.intensity;
      const pushRadius = 50 + params.intensity * 80;
      const _opacityMul = 0.2 + params.opacity * 0.8;
      // 3D depth adds a z-like per-dot perspective scaling based on
      // distance from center + a gentle wobble so dots feel like they're
      // floating at different depths.
      const _depthAmount = params.depth3d;

      let loudness = 0;
      if (analyser && analyserData) {
        analyser.getByteTimeDomainData(analyserData);
        let sum = 0;
        for (let i = 0; i < analyserData.length; i++) {
          const v = (analyserData[i] - 128) / 128;
          sum += v * v;
        }
        loudness = Math.min(1, Math.sqrt(sum / analyserData.length) * 3);
      }

      if (!ctx) return;
      frameNow = tMs;
      field.step(tMs);
      // Trail echoes erase the last frame only partly, so dots leave tails.
      const erase = field.trailAlpha(tMs);
      if (erase >= 1) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = erase;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const dots = dotsRef.current;
      const currentMode = modeRef.current;
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) * 0.42;
      const timeS = (tMs / 1000) * speedMul;

      if (currentMode === 'atom') {
        for (const d of dots) {
          const dx = d.homeX - d.x;
          const dy = d.homeY - d.y;
          d.vx += dx * 0.02;
          d.vy += dy * 0.02;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.9;
          d.vy *= 0.9;
          d.x += d.vx;
          d.y += d.vy;
          const bob = 1 + Math.sin(timeS + d.phase) * 0.15;
          const audioBob = 1 + loudness * 1.2;
          const size = d.baseSize * bob * audioBob * sizeMul;
          ctx.globalAlpha = 0.4 + loudness * 0.6;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'fibonacci') {
        const rotation = timeS * 0.15;
        for (const d of dots) {
          const t = d.idx / dots.length;
          const r = maxR * Math.sqrt(t) * (1 + loudness * 0.25);
          const a = d.idx * GOLDEN_ANGLE + rotation;
          d.homeX = cx + r * Math.cos(a);
          d.homeY = cy + r * Math.sin(a);
          d.vx += (d.homeX - d.x) * 0.12;
          d.vy += (d.homeY - d.y) * 0.12;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.82;
          d.vy *= 0.82;
          d.x += d.vx;
          d.y += d.vy;
          const size = d.baseSize * sizeMul * (1 + Math.sin(timeS * 1.5 + d.phase) * 0.2);
          ctx.globalAlpha = 0.35 + t * 0.4 + loudness * 0.25;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'phyllotaxis') {
        const drift = (timeS * 15) % dots.length;
        for (const d of dots) {
          const shifted = (d.idx + drift) % dots.length;
          const t = shifted / dots.length;
          const r = maxR * Math.sqrt(t);
          const a = shifted * GOLDEN_ANGLE;
          d.homeX = cx + r * Math.cos(a);
          d.homeY = cy + r * Math.sin(a);
          d.vx += (d.homeX - d.x) * 0.2;
          d.vy += (d.homeY - d.y) * 0.2;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.75;
          d.vy *= 0.75;
          d.x += d.vx;
          d.y += d.vy;
          const centerFade = Math.min(1, t * 4);
          const edgeFade = 1 - Math.max(0, (t - 0.85) / 0.15);
          ctx.globalAlpha = (0.4 + loudness * 0.5) * centerFade * edgeFade;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, (d.baseSize + loudness * 1.5) * sizeMul, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'wave') {
        const rings = 12;
        const per = Math.ceil(dots.length / rings);
        for (let r = 0; r < rings; r++) {
          const ringT = r / (rings - 1);
          const wavePhase = timeS * 1.2 - r * 0.6;
          const radius = maxR * (ringT + Math.sin(wavePhase) * 0.08 * (1 + loudness));
          for (let i = 0; i < per; i++) {
            const d = dots[r * per + i];
            if (!d) continue;
            const a = (i / per) * Math.PI * 2 + wavePhase * 0.3;
            d.homeX = cx + radius * Math.cos(a);
            d.homeY = cy + radius * Math.sin(a);
            d.vx += (d.homeX - d.x) * 0.18;
            d.vy += (d.homeY - d.y) * 0.18;
            applyPointerPush(d, pushRadius, pushStrength);
            d.vx *= 0.78;
            d.vy *= 0.78;
            d.x += d.vx;
            d.y += d.vy;
            ctx.globalAlpha = 0.3 + loudness * 0.5;
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(
              d.x,
              d.y,
              d.baseSize * sizeMul * (0.8 + Math.sin(wavePhase) * 0.3),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      } else if (currentMode === 'lissajous') {
        // Two-frequency harmonograph. Each dot traces a different
        // phase offset on the Lissajous curve.
        const a = 3 + loudness * 2;
        const b = 2 + Math.sin(timeS * 0.2) * 0.5;
        const delta = timeS * 0.2;
        for (const d of dots) {
          const t = d.idx * 0.05 + timeS * 0.6;
          d.homeX = cx + maxR * Math.sin(a * t + delta);
          d.homeY = cy + maxR * Math.sin(b * t);
          d.vx += (d.homeX - d.x) * 0.15;
          d.vy += (d.homeY - d.y) * 0.15;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.8;
          d.vy *= 0.8;
          d.x += d.vx;
          d.y += d.vy;
          ctx.globalAlpha = 0.4 + loudness * 0.4;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.baseSize * sizeMul, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'constellation') {
        // Gently drifting nebula with lines connecting nearest neighbors.
        for (const d of dots) {
          const dx = d.homeX - d.x;
          const dy = d.homeY - d.y;
          d.vx += dx * 0.01 + Math.sin(timeS + d.phase) * 0.04;
          d.vy += dy * 0.01 + Math.cos(timeS + d.phase) * 0.04;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.93;
          d.vy *= 0.93;
          d.x += d.vx;
          d.y += d.vy;
        }
        // Draw lines first so dots sit on top
        ctx.strokeStyle = `rgba(196, 160, 96, ${0.12 + loudness * 0.15})`;
        ctx.lineWidth = 0.5;
        const maxDist = 50 + loudness * 25;
        const maxDistSq = maxDist * maxDist;
        for (let i = 0; i < dots.length; i++) {
          const a = dots[i];
          for (let j = i + 1; j < Math.min(dots.length, i + 10); j++) {
            const b = dots[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < maxDistSq) {
              ctx.globalAlpha = (1 - distSq / maxDistSq) * (0.3 + loudness * 0.3);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        // Draw dots
        for (const d of dots) {
          ctx.globalAlpha = 0.5 + loudness * 0.4;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.baseSize * sizeMul, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'helix') {
        // Double helix — two phase-offset strands rotating about a vertical axis.
        const axisSpread = maxR * 0.95;
        for (const d of dots) {
          const strand = d.idx % 2;
          const y = (d.idx / dots.length - 0.5) * height * 0.8 + cy;
          const phase = (d.idx / dots.length) * Math.PI * 4 + timeS + strand * Math.PI;
          const zx = Math.cos(phase) * (1 + loudness * 0.3);
          const depth = Math.sin(phase);
          d.homeX = cx + zx * axisSpread;
          d.homeY = y;
          d.vx += (d.homeX - d.x) * 0.2;
          d.vy += (d.homeY - d.y) * 0.2;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.75;
          d.vy *= 0.75;
          d.x += d.vx;
          d.y += d.vy;
          // Depth affects size + alpha to simulate perspective
          const depthScale = 0.4 + ((depth + 1) / 2) * 0.8;
          ctx.globalAlpha = depthScale * (0.5 + loudness * 0.4);
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.baseSize * sizeMul * depthScale, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'tunnel') {
        // Through-a-tunnel effect: concentric rings racing outward
        // from the center at different depths. Each ring expands,
        // fades, wraps back. Looks like flying through a star tunnel.
        const ringCount = 24;
        const perRing = Math.ceil(dots.length / ringCount);
        const loopS = 8;
        for (let r = 0; r < ringCount; r++) {
          const ringPhase = ((timeS * (1 + loudness * 0.5)) / loopS + r / ringCount) % 1;
          const depth = ringPhase;
          const radius = maxR * depth * 1.4;
          const centerFade = Math.min(1, depth * 3);
          const edgeFade = 1 - Math.max(0, (depth - 0.85) / 0.15);
          const ringAlpha = centerFade * edgeFade;
          const rotation = timeS * 0.15 + r * 0.1;
          for (let i = 0; i < perRing; i++) {
            const d = dots[r * perRing + i];
            if (!d) continue;
            const a = (i / perRing) * Math.PI * 2 + rotation;
            d.homeX = cx + radius * Math.cos(a);
            d.homeY = cy + radius * Math.sin(a);
            d.vx += (d.homeX - d.x) * 0.35;
            d.vy += (d.homeY - d.y) * 0.35;
            applyPointerPush(d, pushRadius * 0.7, pushStrength * 0.5);
            d.vx *= 0.7;
            d.vy *= 0.7;
            d.x += d.vx;
            d.y += d.vy;
            const size = d.baseSize * sizeMul * (0.4 + depth * 2.2);
            ctx.globalAlpha = ringAlpha * (0.35 + loudness * 0.5);
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
            ctx.fill();
            // Streak trail toward the center for "racing toward you" feel
            const tailLen = size * (1 + depth * 3);
            const tx = cx + (radius - tailLen) * Math.cos(a);
            const ty = cy + (radius - tailLen) * Math.sin(a);
            ctx.globalAlpha = ringAlpha * 0.25;
            ctx.strokeStyle = d.color;
            ctx.lineWidth = size * 0.7;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
          }
        }
      } else if (currentMode === 'morph') {
        // 4D-feeling morph: continuously blend between three parametric
        // shapes (Fibonacci spiral, double helix, Lissajous curve) on
        // slow-cycling weights so the cloud appears to transform through
        // another dimension. Very slow, mind-bending transitions.
        const cycleS = 20;
        const phase = (timeS / cycleS) % 1;
        const phaseA = Math.cos(phase * Math.PI * 2) * 0.5 + 0.5;
        const phaseB = Math.cos((phase - 1 / 3) * Math.PI * 2) * 0.5 + 0.5;
        const phaseC = Math.cos((phase - 2 / 3) * Math.PI * 2) * 0.5 + 0.5;
        const totalWeight = phaseA + phaseB + phaseC;
        const wA = phaseA / totalWeight;
        const wB = phaseB / totalWeight;
        const wC = phaseC / totalWeight;
        const slowRotation = timeS * 0.08;
        for (const d of dots) {
          const t = d.idx / dots.length;
          // Shape A — Fibonacci spiral
          const aRad = maxR * Math.sqrt(t);
          const aAng = d.idx * GOLDEN_ANGLE + slowRotation;
          const ax = cx + aRad * Math.cos(aAng);
          const ay = cy + aRad * Math.sin(aAng);
          // Shape B — Double helix
          const strand = d.idx % 2;
          const hy = (t - 0.5) * height * 0.8 + cy;
          const hPhase = t * Math.PI * 4 + timeS * 0.7 + strand * Math.PI;
          const hx = cx + Math.cos(hPhase) * maxR * 0.95;
          // Shape C — Lissajous curve
          const lA = 3;
          const lB = 2 + Math.sin(timeS * 0.15) * 0.5;
          const lDelta = timeS * 0.12;
          const lt = d.idx * 0.05 + timeS * 0.4;
          const lx = cx + maxR * Math.sin(lA * lt + lDelta);
          const ly = cy + maxR * Math.sin(lB * lt);
          // Weighted blend (loudness shifts toward Fibonacci slightly)
          const modWA = wA + loudness * 0.15;
          const homeX = ax * modWA + hx * wB + lx * wC;
          const homeY = ay * modWA + hy * wB + ly * wC;
          d.homeX = homeX;
          d.homeY = homeY;
          d.vx += (d.homeX - d.x) * 0.08;
          d.vy += (d.homeY - d.y) * 0.08;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.88;
          d.vy *= 0.88;
          d.x += d.vx;
          d.y += d.vy;
          ctx.globalAlpha = 0.45 + loudness * 0.4;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.baseSize * sizeMul, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'saturn') {
        // Planet body + flat ring system tilted toward viewer.
        const tilt = 0.35;
        const ringInner = maxR * 0.6;
        const ringOuter = maxR * 1.15;
        const bodyR = maxR * 0.38;
        const slowRot = timeS * 0.06;
        for (const d of dots) {
          const t = d.idx / dots.length;
          if (t < 0.35) {
            // Planet body — sphere of surface points
            const phi = (t / 0.35) * Math.PI * 2 + slowRot;
            const lat = Math.asin((d.idx % 17) / 17 - 0.5);
            const x3 = Math.cos(lat) * Math.cos(phi) * bodyR;
            const y3 = Math.cos(lat) * Math.sin(phi) * bodyR * tilt;
            const z3 = Math.sin(lat) * bodyR;
            d.homeX = cx + x3;
            d.homeY = cy + y3 + z3 * tilt * 0.4;
            const depthFade = 0.5 + ((z3 + bodyR) / (2 * bodyR)) * 0.5;
            ctx.globalAlpha = depthFade * (0.5 + loudness * 0.4);
          } else {
            // Rings — dots on elliptical orbits (projected)
            const ringT = (t - 0.35) / 0.65;
            const radius = ringInner + (ringOuter - ringInner) * ringT;
            const a = (d.idx * 0.7 + slowRot) % (Math.PI * 2);
            d.homeX = cx + radius * Math.cos(a);
            d.homeY = cy + radius * Math.sin(a) * tilt;
            // Ring gaps (Cassini-style): duller at specific radii
            const gapFactor = Math.abs(Math.sin(ringT * Math.PI * 5));
            ctx.globalAlpha = (0.3 + loudness * 0.4) * (0.5 + gapFactor * 0.5);
          }
          d.vx += (d.homeX - d.x) * 0.15;
          d.vy += (d.homeY - d.y) * 0.15;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.8;
          d.vy *= 0.8;
          d.x += d.vx;
          d.y += d.vy;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.baseSize * sizeMul, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'galaxy') {
        // Spiral galaxy — logarithmic arms slowly rotating.
        const arms = 3;
        const armTightness = 4.5;
        const rotation = timeS * 0.08;
        for (const d of dots) {
          const t = d.idx / dots.length;
          const armIdx = d.idx % arms;
          const armOffset = (armIdx / arms) * Math.PI * 2;
          // Logarithmic spiral: r = a * exp(b * θ)
          const theta = t * Math.PI * armTightness + armOffset + rotation + Math.random() * 0.001; // tiny jitter per dot for texture
          const r = maxR * t * (0.9 + Math.sin(theta * 0.5) * 0.05);
          // Scatter perpendicular to arm slightly for thickness
          const scatter = (d.phase - Math.PI) * 0.08 * t;
          const x = cx + r * Math.cos(theta + scatter);
          const y = cy + r * Math.sin(theta + scatter);
          d.homeX = x;
          d.homeY = y;
          d.vx += (d.homeX - d.x) * 0.12;
          d.vy += (d.homeY - d.y) * 0.12;
          applyPointerPush(d, pushRadius, pushStrength);
          d.vx *= 0.82;
          d.vy *= 0.82;
          d.x += d.vx;
          d.y += d.vy;
          // Core glows brighter than arms
          const brightness = (1 - t * 0.6) * (0.4 + loudness * 0.5);
          ctx.globalAlpha = Math.min(1, brightness);
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.baseSize * sizeMul * (1.5 - t * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentMode === 'orbital') {
        // Electrons on multiple orbital shells, tilted at different angles
        // — visually more "3D atom" than the default atom cloud.
        const shells = 4;
        const perShell = Math.ceil(dots.length / shells);
        for (let s = 0; s < shells; s++) {
          const shellR = maxR * (0.25 + (s / (shells - 1)) * 0.7);
          const tilt = (s / shells) * Math.PI * 0.45;
          const rot = timeS * (0.4 + s * 0.18);
          for (let i = 0; i < perShell; i++) {
            const d = dots[s * perShell + i];
            if (!d) continue;
            const a = (i / perShell) * Math.PI * 2 + rot;
            // 3D orbit projected to 2D
            const x3 = shellR * Math.cos(a);
            const y3 = shellR * Math.sin(a) * Math.cos(tilt);
            const z3 = shellR * Math.sin(a) * Math.sin(tilt);
            d.homeX = cx + x3;
            d.homeY = cy + y3;
            d.vx += (d.homeX - d.x) * 0.25;
            d.vy += (d.homeY - d.y) * 0.25;
            applyPointerPush(d, pushRadius, pushStrength);
            d.vx *= 0.72;
            d.vy *= 0.72;
            d.x += d.vx;
            d.y += d.vy;
            const depthFade = 0.4 + ((z3 + shellR) / (2 * shellR)) * 0.6;
            ctx.globalAlpha = depthFade * (0.5 + loudness * 0.35);
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.baseSize * sizeMul * depthFade, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Nucleus cluster
        ctx.globalAlpha = 0.7 + loudness * 0.3;
        ctx.fillStyle = '#E8B568';
        ctx.beginPath();
        ctx.arc(cx, cy, 4 * sizeMul + loudness * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentMode === 'cymatics') {
        drawCymatics(ctx, cymRef.current, {
          tMs,
          width,
          height,
          speedMul,
          sizeMul,
          loudness,
          palette: paletteRef.current,
          pointer: pointerRef.current,
          pushRadius,
        });
      } else if (currentMode === 'solar') {
        // Solar system — sun at center, 8 planets on concentric orbits
        // at real-ish proportional radii + dots scattered along each orbit.
        const planets = [
          { r: 0.12, speed: 4.15, color: '#C4A060', size: 1.5 }, // Mercury
          { r: 0.22, speed: 1.62, color: '#E8B568', size: 2.5 }, // Venus
          { r: 0.32, speed: 1.0, color: '#88C8E8', size: 2.8 }, // Earth
          { r: 0.42, speed: 0.53, color: '#B33A2B', size: 2.0 }, // Mars
          { r: 0.6, speed: 0.084, color: '#E8A878', size: 5.5 }, // Jupiter
          { r: 0.75, speed: 0.034, color: '#D4805A', size: 4.8 }, // Saturn
          { r: 0.88, speed: 0.012, color: '#7AAA58', size: 3.8 }, // Uranus
          { r: 0.98, speed: 0.006, color: '#6890B0', size: 3.6 }, // Neptune
        ];
        // Draw orbit rings first (faint guides)
        ctx.strokeStyle = 'rgba(196, 160, 96, 0.15)';
        ctx.lineWidth = 0.5;
        for (const p of planets) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, maxR * p.r, maxR * p.r * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Scattered dust on each orbit
        const dustPerOrbit = Math.floor(dots.length / planets.length);
        planets.forEach((p, pi) => {
          for (let i = 0; i < dustPerOrbit; i++) {
            const d = dots[pi * dustPerOrbit + i];
            if (!d) continue;
            const a = (i / dustPerOrbit) * Math.PI * 2 + timeS * p.speed * 0.5;
            d.homeX = cx + maxR * p.r * Math.cos(a);
            d.homeY = cy + maxR * p.r * 0.35 * Math.sin(a);
            d.vx += (d.homeX - d.x) * 0.12;
            d.vy += (d.homeY - d.y) * 0.12;
            applyPointerPush(d, pushRadius, pushStrength);
            d.vx *= 0.82;
            d.vy *= 0.82;
            d.x += d.vx;
            d.y += d.vy;
            ctx.globalAlpha = 0.25 + loudness * 0.3;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.baseSize * sizeMul * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
          // Planet itself
          const pAng = timeS * p.speed;
          const px = cx + maxR * p.r * Math.cos(pAng);
          const py = cy + maxR * p.r * 0.35 * Math.sin(pAng);
          ctx.globalAlpha = 0.85 + loudness * 0.15;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, p.size * sizeMul, 0, Math.PI * 2);
          ctx.fill();
        });
        // Sun at the center
        const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14 * sizeMul);
        sunGrad.addColorStop(0, 'rgba(255, 230, 150, 0.95)');
        sunGrad.addColorStop(1, 'rgba(232, 180, 80, 0)');
        ctx.globalAlpha = 0.9 + loudness * 0.1;
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 14 * sizeMul + loudness * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (field.size > 0) drawEchoes(ctx, field, tMs, paletteRef.current[0]);

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    function onPointerMove(e: PointerEvent) {
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return;
      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
    }
    function onPointerDown(e: PointerEvent) {
      onPointerMove(e);
      pointerRef.current.active = true;
    }
    function onPointerUp() {
      pointerRef.current.active = false;
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [analyser, width, height, density, hidden, echoField]);

  return (
    <div
      style={{
        perspective: depth3d > 0 ? `${600 - depth3d * 300}px` : 'none',
        perspectiveOrigin: 'center center',
        display: 'inline-block',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 16,
          background: mode === 'cymatics' ? nightBackground(palette) : canvasBackground(palette),
          touchAction: 'none',
          cursor: 'grab',
          display: 'block',
          opacity: 0.2 + opacity * 0.8,
          transform:
            depth3d > 0
              ? `rotateX(${depth3d * 18}deg) rotateY(${Math.sin(Date.now() / 4000) * depth3d * 8}deg)`
              : 'none',
          transformStyle: 'preserve-3d',
          transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        aria-label={`Interactive ${mode} visualizer — drag to push dots`}
      />
    </div>
  );
}

const DEFAULT_BACKGROUND =
  'radial-gradient(ellipse at center, rgba(255,248,220,0.25), rgba(92,48,24,0.05))';

/** Background tint follows the palette's darkest tone (spec: Visuals → Colour). */
function canvasBackground(palette: readonly string[] | undefined): string {
  if (!palette?.length) return DEFAULT_BACKGROUND;
  const darkest = palette.reduce((a, b) => (luminance(b) < luminance(a) ? b : a));
  return `radial-gradient(ellipse at center, rgba(255,248,220,0.25), ${darkest}14)`;
}

/** Cymatics sits on a night plate so its stars can shine. */
function nightBackground(palette: readonly string[] | undefined): string {
  const darkest = palette?.length
    ? palette.reduce((a, b) => (luminance(b) < luminance(a) ? b : a))
    : '#3A2418';
  return `radial-gradient(ellipse at center, ${darkest.slice(0, 7)}40, transparent 70%), #0B0806`;
}

/**
 * Cymatics: a twinkling star field, a round plate, and sand gathering on the
 * plate's still lines (lib/chill/cymatics-2d.ts). Sound shakes the plate and
 * walks the figure on faster; still grains glint like stars.
 */
function drawCymatics(
  ctx: CanvasRenderingContext2D,
  state: { grains: Grain[]; stars: Star[]; phase: number; last: number } | null,
  o: {
    tMs: number;
    width: number;
    height: number;
    speedMul: number;
    sizeMul: number;
    loudness: number;
    palette: readonly string[];
    pointer: { x: number; y: number; active: boolean };
    pushRadius: number;
  },
) {
  if (!state) return;
  const { width, height, loudness, palette, sizeMul } = o;
  const dt = state.last ? Math.min(0.1, (o.tMs - state.last) / 1000) : 0;
  state.last = o.tMs;
  state.phase += dt * o.speedMul * (0.7 + loudness * 1.6);
  const timeS = o.tMs / 1000;

  // Stars behind everything.
  for (const star of state.stars) {
    const b = twinkle(star, timeS, loudness);
    const x = star.x * width;
    const y = star.y * height;
    const r = star.size * (0.6 + sizeMul * 0.4);
    ctx.globalAlpha = b * 0.9;
    ctx.fillStyle = '#FFF6E0';
    if (star.sparkle) {
      drawSparkle(ctx, x, y, r * 3.2 * b, r * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The plate.
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.46;
  ctx.globalAlpha = 0.18 + loudness * 0.2;
  ctx.strokeStyle = palette[0] ?? '#C4A060';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Sand: physics in plate units, then a pointer push.
  const plate = plateAt(state.phase);
  stepSand(state.grains, plate, 0.2 + loudness * 1.2);
  const p = o.pointer;
  const pushR = o.pushRadius / R;
  for (const g of state.grains) {
    if (p.active) {
      const dx = g.x - (p.x - cx) / R;
      const dy = g.y - (p.y - cy) / R;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < pushR && d > 0.0001) {
        const f = (1 - d / pushR) * 0.03;
        g.x += (dx / d) * f;
        g.y += (dy / d) * f;
      }
    }
    const x = cx + g.x * R;
    const y = cy + g.y * R;
    const settled = Math.max(0, 1 - g.stir * 60);
    ctx.globalAlpha = 0.55 + settled * 0.45;
    ctx.fillStyle = palette[Math.floor(g.seed * palette.length) % palette.length];
    const size = (1 + g.seed * 1.1) * (0.5 + sizeMul * 0.5);
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    // A few settled grains glint as small stars.
    if (g.seed > 0.965 && settled > 0.6) {
      ctx.globalAlpha = settled * (0.5 + loudness * 0.5);
      ctx.fillStyle = '#FFF6E0';
      drawSparkle(ctx, x, y, size * 3.5, size * 0.45);
    }
  }
}

/** A four-point star: two thin crossing diamonds. */
function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - len);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + len);
  ctx.lineTo(x - w, y);
  ctx.closePath();
  ctx.moveTo(x - len, y);
  ctx.lineTo(x, y - w);
  ctx.lineTo(x + len, y);
  ctx.lineTo(x, y + w);
  ctx.closePath();
  ctx.fill();
}

/** Ripple rings and glow blooms, drawn on top of the dots. */
function drawEchoes(
  ctx: CanvasRenderingContext2D,
  field: EchoField,
  now: number,
  fallback: string,
) {
  for (const g of field.glows(now)) {
    const color = g.color ?? fallback;
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, `${color.slice(0, 7)}00`);
    ctx.globalAlpha = g.alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1.5;
  for (const r of field.rings(now)) {
    ctx.globalAlpha = r.alpha;
    ctx.strokeStyle = r.color ?? fallback;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
