'use client';

/*
 * The game's sheets (docs/specs/drive-menus.md): the title, the pause and the results. Each is a
 * sheet lifted over the frozen, softly blurred game (the notepad's lifted shadow), one primary
 * action named plainly, keyboard first. Follows docs/specs/drive-design-language.md.
 */

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { paintTitleArt } from '@/components/drive/title-art';

import type { WorldId } from '@/lib/art/drive-design';
import { ordinal, type RaceResult } from '@/lib/art/race-result';
import { trackInfo } from '@/lib/art/track-registry';

const quiet = 'rgba(255,248,240,';
const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const GOLD = '#e2b04a';

/** Keys for a sheet, caught before the game's own; true from a handler means it was used. */
function useSheetKeys(on: (k: string) => boolean) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (on(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', down, true);
    return () => window.removeEventListener('keydown', down, true);
  });
}

function Veil({ children, label, testId }: { children: ReactNode; label: string; testId: string }) {
  return (
    <div
      role="dialog"
      aria-label={label}
      data-testid={testId}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'rgba(8,6,10,0.38)',
        backdropFilter: 'blur(5px)',
        fontFamily: serif,
        color: `${quiet}0.9)`,
        animation: 'gs-in 380ms ease-out',
      }}
    >
      <style>{`
        @keyframes gs-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gs-lift { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes gs-breathe { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [role="dialog"] * { animation-duration: 1ms !important } }
      `}</style>
      {children}
    </div>
  );
}

const sheet = (accent: string) =>
  ({
    width: 'min(380px, 100%)',
    padding: '22px 24px',
    borderRadius: 14,
    background: 'rgba(16,12,16,0.9)',
    border: `1px solid ${accent}44`,
    boxShadow: `0 30px 70px rgba(0,0,0,0.6), 0 2px 0 ${accent}22 inset`,
    display: 'grid',
    gap: 14,
    animation: 'gs-lift 420ms cubic-bezier(.2,.8,.2,1)',
  }) as const;

function Action({
  children,
  onClick,
  accent,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  accent: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: primary ? '11px 18px' : '8px 14px',
        borderRadius: 999,
        border: `1px solid ${primary ? accent : `${quiet}0.2)`}`,
        background: primary ? `linear-gradient(90deg, ${accent}44, ${accent}14)` : 'none',
        color: `${quiet}${primary ? 0.95 : 0.7})`,
        fontFamily: serif,
        fontSize: primary ? 15 : 13,
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ── Title ─────────────────────────────────────────────────── */

export function TitleScreen({ onEnter }: { onEnter: () => void }) {
  useSheetKeys((k) => {
    if (
      k === 'escape' ||
      k === 'tab' ||
      k === 'shift' ||
      k === 'control' ||
      k === 'alt' ||
      k === 'meta'
    )
      return false;
    onEnter();
    return true;
  });
  return (
    <div
      role="dialog"
      aria-label="Colour Drive"
      data-testid="title-screen"
      onPointerDown={(e) => {
        e.stopPropagation();
        onEnter();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: 'pointer',
        display: 'grid',
        alignContent: 'end',
        justifyItems: 'center',
        paddingBottom: '16vh',
        fontFamily: serif,
        color: `${quiet}0.92)`,
        background: 'linear-gradient(180deg, rgba(8,6,10,0) 40%, rgba(8,6,10,0.75))',
        animation: 'gs-in 900ms ease-out',
        isolation: 'isolate',
        overflow: 'hidden',
      }}
    >
      <TitleArt />
      <style>{`
        @keyframes gs-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gs-breathe { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
      `}</style>
      <div
        style={{
          fontSize: 'clamp(40px, 8vw, 96px)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          textShadow: `0 0 40px ${GOLD}55, 0 2px 14px rgba(0,0,0,0.7)`,
        }}
      >
        Colour Drive
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 12,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: GOLD,
          animation: 'gs-breathe 2.6s ease-in-out infinite',
        }}
      >
        Click to enter
      </div>
    </div>
  );
}

/**
 * The title's painted key art (components/drive/title-art.ts), full screen under the words: the
 * fire flickers at about 30 frames a second, and stands still when motion is reduced.
 */
function TitleArt() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const t0 = performance.now();
    let raf = 0;
    let last = -1;
    const sizeCanvas = () => {
      const k = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.round(c.clientWidth * k);
      c.height = Math.round(c.clientHeight * k);
    };
    const frame = (now: number) => {
      if (now - last >= 33) {
        last = now;
        paintTitleArt(ctx, c.width, c.height, still ? 1.3 : 1.3 + (now - t0) / 1000);
      }
      if (!still) raf = requestAnimationFrame(frame);
    };
    const resize = () => {
      sizeCanvas();
      last = -1;
      if (still) frame(performance.now());
    };
    sizeCanvas();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      data-testid="title-art"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1 }}
    />
  );
}

/* ── Pause ─────────────────────────────────────────────────── */

export function PauseMenu({
  world,
  onResume,
  onRestart,
  onTracks,
  onLeave,
}: {
  world: WorldId;
  onResume: () => void;
  onRestart: () => void;
  onTracks: () => void;
  onLeave: () => void;
}) {
  const t = trackInfo(world);
  useSheetKeys((k) => {
    if (k === 'escape' || k === 'enter') onResume();
    else if (k === 'r') onRestart();
    else return false;
    return true;
  });
  // The picture is the point (2026-11-22: "when paused I need to see the image … static but with
  // moving camera is awesome"): no veil, no blur, only a slim bar at the foot that fades back.
  const link = {
    background: 'none',
    border: 'none',
    padding: '4px 2px',
    cursor: 'pointer',
    fontFamily: serif,
    fontSize: 13,
    color: `${quiet}0.7)`,
    textDecoration: 'none',
  } as const;
  return (
    <div
      role="dialog"
      aria-label="Paused"
      data-testid="pause-menu"
      onPointerDown={(e) => e.stopPropagation()}
      className="pause-bar"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 22,
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100% - 32px)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px 16px',
        padding: '8px 18px',
        borderRadius: 999,
        background: 'rgba(12,9,12,0.42)',
        border: `1px solid ${t.colour}33`,
        fontFamily: serif,
        color: `${quiet}0.85)`,
        animation: 'pb-fade 3.2s ease forwards',
      }}
    >
      <style>{`
        @keyframes pb-fade { 0%, 55% { opacity: 1 } 100% { opacity: .28 } }
        .pause-bar:hover, .pause-bar:focus-within { animation: none; opacity: 1 }
        @media (prefers-reduced-motion: reduce) { .pause-bar { animation: none } }
      `}</style>
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: t.colour,
        }}
      >
        Paused
      </span>
      <button type="button" onClick={onResume} style={{ ...link, color: `${quiet}0.95)` }}>
        Resume
      </button>
      <button type="button" onClick={onRestart} style={link}>
        Restart
      </button>
      <button type="button" onClick={onTracks} style={link}>
        Tracks
      </button>
      <a href="/geometry-field/garage" style={link}>
        Garage
      </a>
      <button type="button" onClick={onLeave} style={link}>
        Leave
      </button>
    </div>
  );
}

/* ── Results ───────────────────────────────────────────────── */

export function RaceResults({
  world,
  result,
  onAgain,
  onTracks,
}: {
  world: WorldId;
  result: RaceResult;
  onAgain: () => void;
  onTracks: () => void;
}) {
  const t = trackInfo(world);
  useSheetKeys((k) => {
    if (k === 'enter' || k === 'r') onAgain();
    else if (k === 'escape') onTracks();
    else return false;
    return true;
  });
  if (result.wrecked)
    return (
      <Veil label="Race over" testId="race-results">
        <div style={{ ...sheet('#ff5a1f'), textAlign: 'center', justifyItems: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(30px, 6vw, 46px)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#ff7a2a',
              textShadow: '0 0 30px rgba(255,90,20,0.55)',
            }}
          >
            U fucked up!
          </div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: `${quiet}0.6)`,
            }}
          >
            Race over
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Action primary accent="#ff5a1f" onClick={onAgain}>
              Race again
            </Action>
            <Action accent="#ff5a1f" onClick={onTracks}>
              Tracks
            </Action>
          </div>
          <span style={{ fontFamily: mono, fontSize: 10, color: `${quiet}0.35)` }}>
            enter race again · esc tracks
          </span>
        </div>
      </Veil>
    );
  return (
    <Veil label="Results" testId="race-results">
      <div style={sheet(t.colour)}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: t.colour,
          }}
        >
          {t.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          {result.place !== null && (
            <span style={{ fontSize: 40, color: result.place === 1 ? GOLD : `${quiet}0.92)` }}>
              {ordinal(result.place)}
            </span>
          )}
          <span style={{ fontFamily: mono, fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>
            {result.time}
          </span>
        </div>
        <div
          style={{ fontFamily: mono, fontSize: 12, color: result.record ? GOLD : `${quiet}0.5)` }}
        >
          {result.record ? 'new best' : result.best ? `best ${result.best}` : ''}
        </div>
        {result.standings.length > 1 && (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
            {result.standings.map((s, i) => (
              <li
                key={s.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: i < 3 ? 14 : 12,
                  color: `${quiet}${s.you ? 0.95 : i < 3 ? 0.75 : 0.5})`,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 11, width: 18, color: `${quiet}0.4)` }}>
                  {i + 1}
                </span>
                <span
                  aria-hidden="true"
                  style={{ width: 9, height: 9, borderRadius: '50%', background: s.colour }}
                />
                <span
                  style={{ textDecoration: s.you ? 'underline' : 'none', textUnderlineOffset: 4 }}
                >
                  {s.name}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Action primary accent={t.colour} onClick={onAgain}>
            Race again
          </Action>
          <Action accent={t.colour} onClick={onTracks}>
            Tracks
          </Action>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: `${quiet}0.35)` }}>
          enter race again · esc tracks
        </span>
      </div>
    </Veil>
  );
}
