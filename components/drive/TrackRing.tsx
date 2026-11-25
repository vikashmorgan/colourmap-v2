'use client';

/*
 * The track ring (docs/specs/drive-menus.md): the tracks as screens on a slow 3D ring, the chosen
 * one nearest, a window onto its world (the engine runs it live behind, holding still); under the
 * ring its map draws itself in the track's colour and a light runs a lap on it. ← → turn the ring,
 * ↑ ↓ switch between the racing tracks and those in development, Enter races, Esc closes. Follows docs/specs/drive-design-language.md.
 */

import { useEffect, useMemo, useState } from 'react';
import { type TrackTier, tierOf, WORLDS, type WorldId } from '@/lib/art/drive-design';
import { WORLD_CFG } from '@/lib/art/drive-worlds';
import { trackMap } from '@/lib/art/track-map';
import { runLabel, trackList } from '@/lib/art/track-registry';
import { driveSound } from '@/lib/audio/drive-sound';

const quiet = 'rgba(255,248,240,';
const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const GOLD = '#e2b04a';

const MAP_W = 600;
const MAP_H = 260;
const THUMB_W = 160;
const THUMB_H = 70;

export interface TrackRingProps {
  current: WorldId;
  /** The ring settled on a track: show its world behind. */
  onPick: (id: WorldId) => void;
  onRace: () => void;
  onClose: () => void;
  /** Open the design space on this track (docs/specs/drive-tracks.md, "Design space"). */
  onDesign?: () => void;
  /** Your best on a track, as shown in the HUD, or null. */
  best?: (id: WorldId) => string | null;
}

export default function TrackRing({
  current,
  onPick,
  onRace,
  onClose,
  onDesign,
  best,
}: TrackRingProps) {
  // The racing tracks, or the ones still in development: two rings, one at a time.
  const [tier, setTier] = useState<TrackTier>(() => tierOf(current));
  const tracks = useMemo(() => trackList().filter((t) => tierOf(t.id) === tier), [tier]);
  const n = tracks.length;
  const [sel, setSel] = useState(() =>
    Math.max(
      0,
      tracks.findIndex((t) => t.id === current),
    ),
  );
  // The ring's turn, unwrapped, so going past the last screen keeps turning the same way.
  const [turn, setTurn] = useState(sel);
  const showTier = (next: TrackTier, id?: WorldId) => {
    if (next === tier && !id) return;
    driveSound.tick();
    const list = trackList().filter((t) => tierOf(t.id) === next);
    const i = Math.max(0, id ? list.findIndex((t) => t.id === id) : 0);
    setTier(next);
    setSel(i);
    setTurn(i);
  };
  const maps = useMemo(() => {
    const all = trackList();
    const big = Object.fromEntries(all.map((t) => [t.id, trackMap(t.id, MAP_W, MAP_H)]));
    const small = Object.fromEntries(all.map((t) => [t.id, trackMap(t.id, THUMB_W, THUMB_H)]));
    return { big, small };
  }, []);
  const t = tracks[Math.min(sel, n - 1)];
  const map = maps.big[t.id];

  const step = (d: number) => {
    driveSound.tick();
    setTurn((v) => v + d);
    setSel((s) => (s + d + n) % n);
  };
  const goTo = (i: number) => {
    let d = i - sel;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    if (d) step(d);
  };

  // Show the chosen world behind once the ring has settled on it.
  useEffect(() => {
    const id = tracks[Math.min(sel, n - 1)].id;
    const h = window.setTimeout(() => onPick(id), 420);
    return () => window.clearTimeout(h);
  }, [sel, tracks, onPick, n]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') step(-1);
      else if (k === 'arrowright' || k === 'd') step(1);
      else if (k === 'enter' || k === ' ') onRace();
      else if (k === 'escape') onClose();
      else if (k === 'arrowup' || k === 'w') showTier('race');
      else if (k === 'arrowdown' || k === 's') showTier('dev');
      else {
        const w = WORLDS.find((x) => x.key === k);
        if (!w) return;
        if (w.tier !== tier) showTier(w.tier, w.id);
        else goTo(tracks.findIndex((x) => x.id === w.id));
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', down, true);
    return () => window.removeEventListener('keydown', down, true);
  });

  // Swipe on touch.
  const [swipe, setSwipe] = useState<number | null>(null);

  // A small ring for a few screens, so they stand close.
  const R = n < 6 ? 340 : 520;
  const angle = 360 / n;

  return (
    <div
      role="dialog"
      aria-label="Choose a track"
      data-testid="track-ring"
      onPointerDown={(e) => {
        e.stopPropagation();
        setSwipe(e.clientX);
      }}
      onPointerUp={(e) => {
        if (swipe !== null && Math.abs(e.clientX - swipe) > 50) step(e.clientX < swipe ? 1 : -1);
        setSwipe(null);
      }}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        fontFamily: serif,
        color: `${quiet}0.9)`,
        // The world shows through the middle; the edges sink into the dark.
        background:
          'radial-gradient(ellipse 34% 30% at 50% 36%, rgba(8,6,10,0) 60%, rgba(8,6,10,0.72) 100%), linear-gradient(180deg, rgba(8,6,10,0.25), rgba(8,6,10,0.85) 70%)',
        animation: 'tr-in 600ms ease-out',
      }}
    >
      <style>{`
        @keyframes tr-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tr-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        @keyframes tr-breathe { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="track-ring"] * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
        }
      `}</style>

      {/* The ring of screens. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '36%',
          width: 0,
          height: 0,
          perspective: 1400,
          perspectiveOrigin: '50% 30%',
        }}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: `translateZ(${-R}px) rotateY(${-turn * angle}deg)`,
            transition: 'transform 450ms cubic-bezier(.3,.7,.2,1)',
          }}
        >
          {tracks.map((tr, i) => {
            const on = i === sel;
            const small = maps.small[tr.id];
            return (
              <button
                key={tr.id}
                type="button"
                aria-label={tr.name}
                aria-current={on ? 'true' : undefined}
                onClick={() => (on ? onRace() : goTo(i))}
                style={{
                  position: 'absolute',
                  left: -150,
                  top: -95,
                  width: 300,
                  height: 190,
                  padding: 0,
                  cursor: 'pointer',
                  borderRadius: 12,
                  border: `1px solid ${tr.colour}${on ? 'ee' : '55'}`,
                  // The chosen screen is a window onto its world, running behind.
                  background: on
                    ? 'transparent'
                    : `linear-gradient(160deg, ${tr.colour}33, rgba(10,8,12,0.88) 70%)`,
                  boxShadow: on
                    ? `0 0 0 1px ${tr.colour}55, 0 0 46px ${tr.colour}44, 0 24px 60px rgba(0,0,0,0.5)`
                    : '0 18px 40px rgba(0,0,0,0.45)',
                  transform: `rotateY(${i * angle}deg) translateZ(${R}px)`,
                  backfaceVisibility: 'hidden',
                  opacity: on ? 1 : 0.62,
                  transition: 'opacity 450ms, box-shadow 450ms, background 450ms',
                  color: `${quiet}0.9)`,
                  fontFamily: serif,
                  overflow: 'hidden',
                }}
              >
                {!on && (
                  <svg
                    aria-hidden="true"
                    viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
                    style={{
                      position: 'absolute',
                      left: 70,
                      top: 40,
                      width: THUMB_W,
                      height: THUMB_H,
                    }}
                  >
                    <path
                      d={small.d}
                      fill="none"
                      stroke={tr.colour}
                      strokeWidth={1.4}
                      opacity={0.75}
                    />
                  </svg>
                )}
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    bottom: 10,
                    fontSize: 15,
                    letterSpacing: '0.04em',
                    textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  }}
                >
                  {tr.name}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 9,
                    fontFamily: mono,
                    fontSize: 10,
                    color: `${quiet}0.45)`,
                  }}
                >
                  {WORLDS.find((w) => w.id === tr.id)?.key}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Its map, under the ring, tilted so the rises show. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '6%',
          width: `min(${MAP_W}px, 92vw)`,
          transform: 'translateX(-50%)',
          perspective: 900,
        }}
      >
        <svg
          key={t.id}
          data-testid="track-map"
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          role="img"
          aria-label={`Map of ${t.name}`}
          style={{
            width: '100%',
            height: 'auto',
            transform: 'rotateX(38deg)',
            transformOrigin: '50% 100%',
            overflow: 'visible',
            filter: `drop-shadow(0 0 6px ${t.colour}88)`,
          }}
        >
          <path
            id="tr-road"
            d={map.d}
            fill="none"
            stroke={t.colour}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1 1"
            style={{ animation: 'tr-draw 1.2s cubic-bezier(.4,0,.2,1) both' }}
          />
          {map.banks.map((b) => (
            <path
              key={b}
              d={b}
              fill="none"
              stroke={t.colour}
              strokeWidth={5.5}
              strokeLinecap="round"
              opacity={0.45}
            />
          ))}
          {map.marks.map((m) => (
            <circle
              key={`${m.kind}-${m.x}-${m.y}`}
              cx={m.x}
              cy={m.y}
              r={m.kind === 'gate' ? 2.2 : 4.5}
              fill={m.kind === 'gate' ? `${t.colour}` : GOLD}
              opacity={m.kind === 'gate' ? 0.7 : 1}
            />
          ))}
          {/* The light that runs a lap, slowly, for ever. */}
          <circle r={4} fill="#fff8ee" style={{ filter: `drop-shadow(0 0 6px ${t.colour})` }}>
            <animateMotion
              dur={`${Math.max(6, map.length / 600).toFixed(1)}s`}
              begin="1.2s"
              repeatCount="indefinite"
              path={map.d}
            />
          </circle>
        </svg>
      </div>

      {/* What the track is. */}
      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          left: 'max(16px, 5vw)',
          bottom: '9%',
          maxWidth: 260,
          display: 'grid',
          gap: 6,
        }}
      >
        <div style={{ fontSize: 30, lineHeight: 1.05, color: `${quiet}0.95)` }}>{t.name}</div>
        <div style={{ fontSize: 13, color: `${quiet}0.6)` }}>{t.tagline}</div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            fontFamily: mono,
            fontSize: 11,
            color: `${quiet}0.55)`,
          }}
        >
          <span>{runLabel(t)}</span>
          <span
            role="img"
            aria-label={`difficulty ${t.difficulty} of 3`}
            style={{ letterSpacing: 2 }}
          >
            {[1, 2, 3].map((d) => (
              <span key={d} style={{ color: d <= t.difficulty ? t.colour : `${quiet}0.2)` }}>
                ▮
              </span>
            ))}
          </span>
        </div>
        {best?.(t.id) && (
          <div style={{ fontFamily: mono, fontSize: 11, color: GOLD }}>best {best(t.id)}</div>
        )}
        <div style={{ fontSize: 12, color: `${quiet}0.45)` }}>{t.highlights.join(' · ')}</div>
      </div>

      {/* The one action. */}
      <div
        style={{
          position: 'absolute',
          right: 'max(16px, 5vw)',
          bottom: '9%',
          display: 'grid',
          justifyItems: 'end',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onDesign && WORLD_CFG[t.id].track && (
            <button
              type="button"
              onClick={onDesign}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                border: `1px solid ${quiet}0.3)`,
                background: 'transparent',
                color: `${quiet}0.8)`,
                fontFamily: serif,
                fontSize: 14,
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              Design
            </button>
          )}
          <button
            type="button"
            onClick={onRace}
            style={{
              padding: '12px 30px',
              borderRadius: 999,
              border: `1px solid ${t.colour}`,
              background: `linear-gradient(90deg, ${t.colour}44, ${t.colour}18)`,
              color: `${quiet}0.95)`,
              fontFamily: serif,
              fontSize: 16,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              boxShadow: `0 0 30px ${t.colour}33`,
            }}
          >
            Race
          </button>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: `${quiet}0.35)` }}>
          ← → choose · ↑ ↓ racing / in development · enter race · esc close
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '8%',
          display: 'flex',
          justifyContent: 'center',
          gap: 28,
        }}
      >
        <button type="button" aria-label="Previous track" onClick={() => step(-1)} style={arrow}>
          ‹
        </button>
        <span
          role="tablist"
          aria-label="Tracks"
          style={{ display: 'flex', gap: 18, alignSelf: 'center' }}
        >
          {(
            [
              ['race', 'Racing'],
              ['dev', 'In development'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tier === id}
              onClick={() => showTier(id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: serif,
                fontSize: 10,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: tier === id ? `${quiet}0.85)` : `${quiet}0.35)`,
                borderBottom: `1px solid ${tier === id ? GOLD : 'transparent'}`,
              }}
            >
              {label}
            </button>
          ))}
        </span>
        <button type="button" aria-label="Next track" onClick={() => step(1)} style={arrow}>
          ›
        </button>
      </div>
    </div>
  );
}

const arrow = {
  background: 'none',
  border: `1px solid ${quiet}0.2)`,
  borderRadius: 999,
  width: 32,
  height: 32,
  color: `${quiet}0.7)`,
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
} as const;
