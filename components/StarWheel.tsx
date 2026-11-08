'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { drawOrb, makeOrb } from '@/components/starOrb';
import { GOLD, type GridNode, type Hub } from '@/lib/grid';
import { type Frame, ROOT_RADIUS, SWITCH_SECONDS, scatter } from '@/lib/life-tree';
import {
  BRAIN,
  brainAngles,
  FORM_SECONDS,
  LABEL_RING,
  NODE_RING,
  pointAt,
  RING,
  spokeAngle,
  spokePoint,
  stage,
  twigPoint,
  WHEEL_HIDDEN_PAGES,
} from '@/lib/star-wheel';

/*
 * THE STAR WHEEL — design I of the G menu's wheel (lib/star-wheel.ts): the
 * wheel in the life tree's language. A current of stars along a bowed spoke
 * to each hub, each hub a small ball of stars, the whole held by a slow ring
 * of stars. At the top the wheel is a brain: a seam of stars splits it, the
 * left brain's hubs on the left and the right brain's on the right
 * (2026-11-08; the ball of stars at the centre went then too). Choose a hub
 * and its pages become the spokes, round the whole ring.
 *
 * Same keys as the wheel it grew from (components/GridMenu.tsx): arrows go
 * round, Enter goes in or opens, Esc comes back and then closes.
 */

type Props = {
  hub: Hub | null;
  items: (Hub | GridNode)[];
  sel: number;
  setSel: (i: number) => void;
  setRef: (i: number) => (el: HTMLElement | null) => void;
  activate: (i: number) => void;
  back: () => void;
  close: () => void;
  /** Come in from another look: the stars stream together. */
  arrive?: boolean;
  /** Come from the tree, whose stars gathered on the ring: the wheel forms out of the ring. */
  fromRing?: boolean;
};

const [GR, GG, GB] = [196, 160, 96];
const STARS_PER_SPOKE = 300;
const MAX_SPOKES = 12;
const RING_STARS = 520;
const ORB_RADIUS = ROOT_RADIUS * 1.5;
// The seam down the middle of the brain.
const SEAM_STARS = 420;
// The hubs' twigs, one per page inside (lib/star-wheel.ts twigPoint).
const TWIG_STARS = 1800;

export function StarWheel({
  hub,
  items,
  sel,
  setSel,
  setRef,
  activate,
  back,
  close,
  arrive = false,
  fromRing = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<Frame>({ cx: 0, cy: 0, min: 0 });
  // What the drawing reads each frame, without restarting.
  const countRef = useRef(items.length);
  // How many pages each spoke's hub holds: one twig each. Pages themselves have none.
  const twigsRef = useRef<number[]>([]);
  twigsRef.current = items.map((it) =>
    'nodes' in it ? it.nodes.filter((n) => !WHEEL_HIDDEN_PAGES.has(n.href)).length : 0,
  );
  const selRef = useRef(sel);
  const arriveRef = useRef(arrive);
  const formRef = useRef(fromRing ? performance.now() : 0);
  // The names come in once the wheel has formed out of the ring.
  const [named, setNamed] = useState(!fromRing);
  useEffect(() => {
    if (named) return;
    const t = window.setTimeout(() => setNamed(true), FORM_SECONDS * 700);
    return () => window.clearTimeout(t);
  }, [named]);
  // Where each spoke points: at the top, the two halves of the brain; in a hub, the whole ring.
  const brain = !hub;
  const angles = brain
    ? (() => {
        const right = items.filter((it) => !('href' in it) && BRAIN[it.id] !== 'left').length;
        return brainAngles(right, items.length - right);
      })()
    : items.map((_, i) => spokeAngle(i, items.length));
  const anglesRef = useRef(angles);
  anglesRef.current = angles;
  const brainRef = useRef(brain);
  brainRef.current = brain;
  const changedRef = useRef(0);
  countRef.current = items.length;
  selRef.current = sel;

  // A new ring of spokes (into a hub, or back) re-forms from the centre.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a change of hub is what re-forms the spokes
  useEffect(() => {
    changedRef.current = performance.now();
  }, [hub]);

  useEffect(() => {
    const fitFrame = () =>
      setFrame({
        cx: window.innerWidth / 2,
        cy: window.innerHeight / 2 + 12,
        min: Math.min(window.innerWidth, window.innerHeight),
      });
    fitFrame();
    window.addEventListener('resize', fitFrame);
    return () => window.removeEventListener('resize', fitFrame);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = STARS_PER_SPOKE * MAX_SPOKES;
    const t = new Float32Array(n);
    const across = new Float32Array(n);
    const pace = new Float32Array(n);
    const tw = new Float32Array(n);
    const flyTurn = new Float32Array(n);
    const flyFar = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      t[i] = Math.random();
      across[i] = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
      pace[i] = 0.7 + 0.6 * Math.random();
      tw[i] = Math.random() * Math.PI * 2;
      flyTurn[i] = (Math.random() - 0.5) * 1.6;
      flyFar[i] = 0.04 + 0.3 * Math.sqrt(Math.random());
    }
    const nodes = Array.from({ length: MAX_SPOKES }, () => makeOrb(90));
    const ringA = new Float32Array(RING_STARS);
    const ringR = new Float32Array(RING_STARS);
    for (let i = 0; i < RING_STARS; i++) {
      ringA[i] = Math.random() * Math.PI * 2;
      ringR[i] = 1 + (Math.random() - 0.5) * 0.03;
    }
    const glow = new Float32Array(MAX_SPOKES).fill(0.8);
    const twigT = new Float32Array(TWIG_STARS);
    const twigPick = new Float32Array(TWIG_STARS);
    const twigPace = new Float32Array(TWIG_STARS);
    for (let i = 0; i < TWIG_STARS; i++) {
      twigT[i] = Math.random();
      twigPick[i] = Math.random();
      twigPace[i] = 0.6 + 0.8 * Math.random();
    }
    const seamT = new Float32Array(SEAM_STARS);
    const seamX = new Float32Array(SEAM_STARS);
    for (let i = 0; i < SEAM_STARS; i++) {
      seamT[i] = Math.random();
      seamX[i] = (Math.random() + Math.random() - 1) * 0.6;
    }
    const seamGlow = { v: brainRef.current ? 1 : 0 };
    const start =
      arriveRef.current && !formRef.current ? performance.now() - (SWITCH_SECONDS * 1000) / 2 : 0;
    let clock = 0;
    let last = performance.now();
    let raf = 0;

    const draw = () => {
      const now = performance.now();
      const dt = still ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(window.innerWidth * dpr);
      const H = Math.round(window.innerHeight * dpr);
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
      }
      const f: Frame = { cx: W / 2, cy: H / 2 + 12 * dpr, min: Math.min(W, H) };
      const apart = still ? 0 : scatter((now - start) / 1000);
      // Formed out of the ring, coming from the tree: 0 on the ring, 1 on the spokes.
      const formed =
        still || !formRef.current ? 1 : stage((now - formRef.current) / 1000, FORM_SECONDS);
      const angles = anglesRef.current;
      const angleOf = (k: number) => angles[k] ?? spokeAngle(k, count);
      // Spokes grow out from the centre again when the ring changes.
      const grown = still ? 1 : Math.min(1, (now - changedRef.current) / 900);
      const count = Math.min(MAX_SPOKES, countRef.current);
      const chosen = selRef.current;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(4, 4, 6, ${0.22 + 0.08 * apart})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const size = 1.1 * dpr;
      const ease = still ? 1 : Math.min(1, dt * 4);

      // The context circle: a slow ring of stars round everything.
      const turn = clock * 0.02;
      for (let i = 0; i < RING_STARS; i++) {
        const a = (ringA[i] as number) + turn;
        const r = (ringR[i] as number) * RING * f.min * (1 + 0.8 * apart);
        const alpha = 0.32 * (0.6 + 0.4 * Math.sin(clock * 1.3 + i)) * (1 - 0.4 * apart);
        ctx.fillStyle = `rgba(${GR}, ${GG}, ${GB}, ${alpha})`;
        ctx.fillRect(
          f.cx + Math.cos(a) * r - size / 2,
          f.cy + Math.sin(a) * r - size / 2,
          size,
          size,
        );
      }

      // No ball at the centre any more: the currents leave from a small empty heart.
      const orbR = f.min * ORB_RADIUS * (1 + 1.5 * apart);

      // The seam: a slow fall of stars down the middle, the line between the two brains.
      seamGlow.v += ((brainRef.current ? 1 : 0) - seamGlow.v) * ease;
      if (seamGlow.v > 0.02) {
        const half = RING * f.min * 0.96;
        for (let i = 0; i < SEAM_STARS; i++) {
          seamT[i] = (seamT[i] as number) + dt * 0.05;
          if ((seamT[i] as number) > 1) seamT[i] = 0;
          const y = f.cy - half + (seamT[i] as number) * half * 2;
          const x = f.cx + (seamX[i] as number) * f.min * 0.006 * (1 + Math.sin(clock + i) * 0.3);
          const alpha =
            0.45 *
            seamGlow.v *
            formed *
            (1 - 0.5 * apart) *
            (0.6 + 0.4 * Math.sin(clock * 1.5 + i));
          ctx.fillStyle = `rgba(${GR}, ${GG}, ${GB}, ${alpha})`;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }

      for (let k = 0; k < count; k++) {
        glow[k] = (glow[k] as number) + ((k === chosen ? 1.25 : 0.6) - (glow[k] as number)) * ease;
      }

      // The currents: stars from the ball along each spoke to its hub.
      for (let i = 0; i < n; i++) {
        const k = i % MAX_SPOKES;
        if (k >= count) continue;
        t[i] = (t[i] as number) + dt * 0.22 * (pace[i] as number);
        if ((t[i] as number) > 1) t[i] = 0;
        const s = (t[i] as number) * grown;
        if (s <= 0) continue;
        let [x, y] = spokePoint(f, angleOf(k), s, across[i] as number, orbR * 0.8);
        if (formed < 1) {
          // Still on the ring it came from the tree on, at the spoke's own bearing.
          const ra = Math.atan2(y - f.cy, x - f.cx) + (flyTurn[i] as number) * 0.25 * (1 - formed);
          const rr = RING * f.min * (1 + (across[i] as number) * 0.02);
          const rx = f.cx + Math.cos(ra) * rr;
          const ry = f.cy + Math.sin(ra) * rr;
          x = rx + (x - rx) * formed;
          y = ry + (y - ry) * formed;
        }
        if (apart > 0) {
          const ox = x - f.cx;
          const oy = y - f.cy;
          const o = Math.hypot(ox, oy) || 1;
          const a = (flyTurn[i] as number) + apart * 0.9;
          const far = (flyFar[i] as number) * apart * f.min;
          x += ((ox * Math.cos(a) - oy * Math.sin(a)) / o) * far;
          y += ((ox * Math.sin(a) + oy * Math.cos(a)) / o) * far;
        }
        const twinkle = 0.7 + 0.3 * Math.sin(clock * 1.7 + (tw[i] as number) * 3);
        // Brightest leaving the ball, fading a touch as it reaches the hub.
        const alpha = 0.6 * (glow[k] as number) * twinkle * (1 - 0.35 * s) * (1 - 0.2 * apart);
        ctx.fillStyle = `rgba(${GR}, ${GG}, ${GB}, ${Math.min(1, alpha)})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      // Each hub's twigs: a current out of its ball along one twig per page inside.
      if (grown > 0.6 && apart < 0.5 && formed > 0.6) {
        const twigs = twigsRef.current;
        for (let i = 0; i < TWIG_STARS; i++) {
          const k = i % MAX_SPOKES;
          const m = k < count ? (twigs[k] ?? 0) : 0;
          if (!m) continue;
          twigT[i] = (twigT[i] as number) + dt * 0.35 * (twigPace[i] as number);
          if ((twigT[i] as number) > 1) twigT[i] = 0;
          const t = twigT[i] as number;
          const j = Math.floor((twigPick[i] as number) * m);
          const [x, y] = twigPoint(f, angleOf(k), j, m, t);
          const alpha =
            0.5 * (glow[k] as number) * (1 - t * 0.6) * (grown - 0.6) * 2.5 * (1 - 2 * apart);
          ctx.fillStyle = `rgba(${GR}, ${GG}, ${GB}, ${Math.min(1, alpha)})`;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }

      // Each hub, or page, a small ball of stars at the end of its spoke.
      if (grown > 0.6 && formed > 0.6) {
        for (let k = 0; k < count; k++) {
          const [x, y] = pointAt(f, angleOf(k), NODE_RING);
          const r = f.min * 0.022 * (k === chosen ? 1.25 : 1) * (1 + 1.5 * apart);
          drawOrb(
            ctx,
            nodes[k]!,
            x,
            y,
            r,
            clock + k,
            size,
            (glow[k] as number) * (grown - 0.6) * 2.5 * Math.min(1, (formed - 0.6) * 2.5),
            [GR, GG, GB],
          );
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const current = items[sel];
  const hint = current ? current.line : '';
  const orbD = frame.min * ORB_RADIUS * 2.6;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* The centre: back out of a hub, or on to the full map. */}
      {frame.min > 0 ? (
        hub ? (
          <button
            type="button"
            onClick={back}
            aria-label={`${hub.label}, back`}
            style={{
              position: 'absolute',
              left: frame.cx,
              top: frame.cy,
              width: orbD,
              height: orbD,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          />
        ) : (
          <Link
            href="/grid"
            onClick={close}
            aria-label="Grid, full map"
            style={{
              position: 'absolute',
              left: frame.cx,
              top: frame.cy,
              width: orbD,
              height: orbD,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              pointerEvents: 'auto',
            }}
          />
        )
      ) : null}

      {frame.min > 0 &&
        items.map((it, i) => {
          const [x, y] = pointAt(frame, angles[i] ?? spokeAngle(i, items.length), LABEL_RING);
          const on = i === sel;
          const isNode = 'href' in it;
          return (
            <button
              key={isNode ? it.href : it.id}
              ref={setRef(i)}
              type="button"
              onClick={() => activate(i)}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              aria-label={
                isNode ? `${it.label}${it.external ? ' (separate app)' : ''}` : `${it.label} hub`
              }
              className="grid-menu-item"
              style={{
                left: x,
                top: y,
                pointerEvents: 'auto',
                opacity: named ? 1 : 0,
                transition: 'opacity 0.5s ease',
                borderColor: on ? GOLD : `${GOLD}44`,
                boxShadow: on ? `0 0 18px ${GOLD}88, inset 0 0 12px ${GOLD}33` : 'none',
                color: on ? '#fff6e0' : '#d8ccb0',
              }}
            >
              {it.label}
            </button>
          );
        })}

      {frame.min > 0 && brain
        ? (['left', 'right'] as const).map((side) => (
            <span
              key={side}
              aria-hidden
              style={{
                position: 'absolute',
                // Inside the circle, either side of the seam near the top, clear of the hubs' names.
                left: frame.cx + (side === 'left' ? -1 : 1) * Math.max(52, frame.min * 0.1),
                top: frame.cy - frame.min * RING * 0.82,
                transform: 'translate(-50%, -50%)',
                opacity: named ? 1 : 0,
                transition: 'opacity 0.5s ease',
                fontSize: 10,
                letterSpacing: '0.3em',
                color: '#8a7d62',
                whiteSpace: 'nowrap',
              }}
            >
              {side === 'left' ? 'LEFT BRAIN' : 'RIGHT BRAIN'}
            </span>
          ))
        : null}

      <p
        aria-live="polite"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 44,
          margin: 0,
          textAlign: 'center',
          fontSize: 12,
          color: '#b9ab8e',
          letterSpacing: '0.04em',
        }}
      >
        {hint}
        {/* The centre's way out, said here so nothing sits on a spoke. */}
        <span style={{ marginLeft: 14, fontSize: 10, letterSpacing: '0.2em', color: '#6d6450' }}>
          {hub ? `CENTRE ← ${hub.label.toUpperCase()}` : 'CENTRE · FULL MAP ↗'}
        </span>
      </p>
    </div>
  );
}
