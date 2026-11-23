'use client';

/*
 * Drive, Mars (docs/specs/drive-game.md, world 8): the mission's quiet screen layer. The mission
 * card ("Mission Unlocked · Follow the Red Bastard", then "Caught the Red Bastard" with the time),
 * the radio panel where the racer you follow talks (his name above, the line typed out over a faint
 * static, a voice graph moving while he speaks), and the marker showing where he is.
 * In the game's design language (docs/specs/drive-design-language.md): the display serif, warm
 * neutrals, slow fades, nothing blinks.
 */

import { forwardRef, useEffect, useRef, useState } from 'react';

import { formatTime } from '@/lib/art/drive';
import { type RadioMessage, showing, speaking, TYPE_RATE, typed } from '@/lib/art/radio';
import type { MissionHud } from './mars-run';
import { radioCrackle } from './mars-sound';

const quiet = 'rgba(255,248,240,';
const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const gold = 'rgba(255,200,110,';

const KEYFRAMES = `
@keyframes mars-card { 0% { opacity: 0; transform: translateY(6px); } 14% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes mars-static { from { background-position: 0 0; } to { background-position: 120px 60px; } }
`;

/** The mission card, centred high: it fades in, holds, and fades out. */
export function MissionCard({ mission }: { mission: MissionHud | null }) {
  const card = mission?.card ?? null;
  if (!card || !mission) return null;
  const caught = card === 'caught';
  return (
    <div
      key={card}
      data-testid="mars-card"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '22%',
        textAlign: 'center',
        pointerEvents: 'none',
        fontFamily: serif,
        animation: `mars-card ${caught ? 6 : 4.2}s ease-in-out forwards`,
        textShadow: '0 2px 18px rgba(0,0,0,0.55)',
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: `${gold}0.85)`,
        }}
      >
        {caught
          ? mission.record
            ? 'Mission complete · a record'
            : 'Mission complete'
          : 'Mission Unlocked'}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 34,
          letterSpacing: '0.06em',
          color: `${quiet}0.92)`,
        }}
      >
        {caught ? 'Caught the Red Bastard' : 'Follow the Red Bastard'}
      </div>
      {caught && (
        <div
          style={{
            marginTop: 10,
            fontFamily: mono,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 14,
            color: `${quiet}0.75)`,
          }}
        >
          {formatTime(mission.time)}
          {mission.best !== null && !mission.record && (
            <span style={{ color: `${quiet}0.5)` }}> · best {formatTime(mission.best)}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** The mission's one quiet line under the clock: the chase and how far he is. */
export function MissionLine({ mission }: { mission: MissionHud | null }) {
  if (!mission) return null;
  const caught = mission.phase === 'caught';
  return (
    <div
      style={{
        fontFamily: mono,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 11,
        marginTop: 2,
        color: `${quiet}0.5)`,
      }}
    >
      <span style={{ color: 'rgba(255,110,80,0.85)' }}>red bastard</span>{' '}
      {caught ? `caught ${formatTime(mission.time)}` : formatTime(mission.time)}
      {!caught && <span> · {distance(mission.gap)}</span>}
      {mission.best !== null && <span> · best {formatTime(mission.best)}</span>}
    </div>
  );
}

export function distance(m: number): string {
  if (!Number.isFinite(m)) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`;
}

/** The marker: a small red caret over him, or pinned to the screen's edge pointing his way. The
 * engine moves it every frame through the ref (no React render per frame). */
export const BastardMarker = forwardRef<HTMLDivElement>(function BastardMarker(_, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        display: 'none',
        pointerEvents: 'none',
        fontFamily: mono,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 10,
        color: `${quiet}0.6)`,
        textAlign: 'center',
        transform: 'translate(-50%, -100%)',
        willChange: 'transform',
      }}
    >
      <div
        data-arrow
        style={{
          width: 0,
          height: 0,
          margin: '0 auto 3px',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '9px solid rgba(255,70,40,0.85)',
          filter: 'drop-shadow(0 0 4px rgba(255,60,30,0.6))',
        }}
      />
      <div data-gap />
    </div>
  );
});

/** Moves the marker element (from the engine's onMarker). */
export function placeMarker(
  el: HTMLDivElement | null,
  m: { x: number; y: number; edge: boolean; angle: number; gap: number } | null,
) {
  if (!el) return;
  if (!m) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, ${m.edge ? '-50%' : '-100%'})`;
  const arrow = el.querySelector<HTMLElement>('[data-arrow]');
  // On screen it points down at him; at the edge it turns toward him (the triangle points down at 0).
  if (arrow) arrow.style.transform = m.edge ? `rotate(${m.angle - Math.PI / 2}rad)` : 'none';
  const gap = el.querySelector<HTMLElement>('[data-gap]');
  if (gap) {
    const text = distance(m.gap);
    if (gap.textContent !== text) gap.textContent = text;
  }
}

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/></filter><rect width='120' height='60' filter='url(%23n)' opacity='0.5'/></svg>\")";

/**
 * The radio: the latest line from the racer you follow. Generic: any message with a sender and a
 * colour. The line types out at TYPE_RATE characters a second while the voice graph moves, then
 * lingers and fades.
 */
export function RadioPanel({ message }: { message: RadioMessage | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shown, setShown] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t0 = performance.now();
    radioCrackle(message.text.length / TYPE_RATE);
    let env = 0;
    let raf = 0;
    let last = t0;
    let lastShown = '';
    const draw = (now: number) => {
      const age = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = typed(message.text, age);
      if (s !== lastShown) {
        lastShown = s;
        setShown(s);
      }
      setVisible(showing(message.text, age));
      // The voice: the envelope eases up while he speaks and settles flat when he stops.
      env += ((speaking(message.text, age) ? 1 : 0) - env) * (1 - Math.exp(-6 * dt));
      const c = canvasRef.current;
      const g = c?.getContext('2d');
      if (c && g) {
        const W = c.width;
        const H = c.height;
        g.clearRect(0, 0, W, H);
        g.strokeStyle = message.colour;
        g.globalAlpha = 0.25 + 0.6 * Math.max(env, 0.15);
        g.lineWidth = 1.2;
        g.beginPath();
        const syll = 0.55 + 0.45 * Math.sin(age * 2.6 * Math.PI * 2 + Math.sin(age * 1.3) * 2);
        for (let x = 0; x <= W; x += 2) {
          const taper = Math.sin((x / W) * Math.PI);
          const y =
            Math.sin(x * 0.09 + age * 9) * 0.6 +
            Math.sin(x * 0.23 - age * 13) * 0.3 +
            Math.sin(x * 0.041 + age * 4) * 0.4;
          const yy = H / 2 + y * env * syll * taper * (H * 0.36);
          if (x === 0) g.moveTo(x, yy);
          else g.lineTo(x, yy);
        }
        g.stroke();
      }
      if (showing(message.text, age) || env > 0.01) raf = requestAnimationFrame(draw);
      else setVisible(false);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [message]);

  if (!message) return null;
  return (
    <div
      data-testid="radio"
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 16,
        top: 58,
        width: 270,
        maxWidth: 'calc(100% - 32px)',
        padding: '10px 14px 12px',
        borderRadius: 12,
        background: 'rgba(16,10,10,0.62)',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
        border: `1px solid ${quiet}0.08)`,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
        overflow: 'hidden',
      }}
    >
      <style>{KEYFRAMES}</style>
      {/* A faint static, drifting slowly; and scan lines, still. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: NOISE,
          opacity: 0.07,
          animation: 'mars-static 24s linear infinite',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontFamily: serif,
            fontSize: 10,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: message.colour, opacity: 0.9 }}>{message.from}</span>
          <span style={{ color: `${quiet}0.3)`, letterSpacing: '0.18em' }}>radio</span>
        </div>
        <canvas
          ref={canvasRef}
          width={240}
          height={26}
          style={{ display: 'block', width: '100%', height: 26, margin: '6px 0 4px' }}
        />
        <div
          style={{
            fontFamily: serif,
            fontSize: 14,
            lineHeight: 1.35,
            minHeight: 19,
            color: `${quiet}0.88)`,
          }}
        >
          {shown}
        </div>
      </div>
    </div>
  );
}
