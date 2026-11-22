'use client';

/*
 * The game's sheets (docs/specs/drive-menus.md): the title, the pause and the results. Each is a
 * sheet lifted over the frozen, softly blurred game (the notepad's lifted shadow), one primary
 * action named plainly, keyboard first. Follows docs/specs/drive-design-language.md.
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';

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
      }}
    >
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
  return (
    <Veil label="Paused" testId="pause-menu">
      <div style={sheet(t.colour)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 22 }}>Paused</span>
          <span style={{ fontSize: 12, color: t.colour }}>{t.name}</span>
        </div>
        <Action primary accent={t.colour} onClick={onResume}>
          Resume
        </Action>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Action accent={t.colour} onClick={onRestart}>
            Restart
          </Action>
          <Action accent={t.colour} onClick={onTracks}>
            Tracks
          </Action>
          <a
            href="/geometry-field/garage"
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${quiet}0.2)`,
              color: `${quiet}0.7)`,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Garage
          </a>
          <Action accent={t.colour} onClick={onLeave}>
            Leave
          </Action>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: `${quiet}0.35)` }}>
          esc resume · r restart
        </span>
      </div>
    </Veil>
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
