'use client';

/*
 * The race intro's words over the picture (docs/specs/drive-menus.md, "The race intro"): the
 * track's name while the camera flies, "Click to start" at the grid, the countdown and GO in the
 * track's colour. The engine flies the camera and lights the gantry; this only speaks. Follows
 * docs/specs/drive-design-language.md: slow, breathing, never flashing.
 */

import type { IntroState } from '@/components/drive/engine';
import type { WorldId } from '@/lib/art/drive-design';
import { trackInfo } from '@/lib/art/track-registry';

const quiet = 'rgba(255,248,240,';
const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export default function RaceIntro({
  state,
  world,
  onClick,
}: {
  state: IntroState;
  world: WorldId;
  onClick: () => void;
}) {
  const t = trackInfo(world);
  const waiting = state.phase === 'fly' || state.phase === 'grid' || state.phase === 'ready';
  const count = state.phase === 'count' ? 4 - state.lit : null;
  return (
    <div
      data-testid="race-intro"
      onPointerDown={(e) => {
        if (!waiting) return;
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: waiting ? 'pointer' : 'default',
        pointerEvents: waiting ? 'auto' : 'none',
        fontFamily: serif,
        color: `${quiet}0.92)`,
        // Letterbox bars while the camera flies, as in a film's opening.
        boxShadow:
          state.phase === 'fly'
            ? 'inset 0 9vh 0 rgba(0,0,0,0.85), inset 0 -9vh 0 rgba(0,0,0,0.85)'
            : 'none',
        transition: 'box-shadow 900ms ease',
      }}
    >
      <style>{`
        @keyframes ri-name { 0% { opacity: 0; letter-spacing: .5em } 25%, 70% { opacity: 1; letter-spacing: .18em } 100% { opacity: 0; letter-spacing: .14em } }
        @keyframes ri-breathe { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
        @keyframes ri-beat { from { opacity: 1; transform: scale(1) } to { opacity: .25; transform: scale(.92) } }
        @keyframes ri-go { 0% { opacity: 0; transform: scale(.9) } 20% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1.12) } }
        @media (prefers-reduced-motion: reduce) { [data-testid="race-intro"] * { animation-duration: 1ms !important } }
      `}</style>

      {state.phase === 'fly' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '40%',
            textAlign: 'center',
            animation: 'ri-name 4s ease both',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(34px, 6vw, 72px)',
              textTransform: 'uppercase',
              textShadow: `0 0 30px ${t.colour}66, 0 2px 12px rgba(0,0,0,0.7)`,
            }}
          >
            {t.name}
          </div>
          <div style={{ marginTop: 10, fontSize: 14, color: `${quiet}0.6)` }}>{t.tagline}</div>
        </div>
      )}

      {(state.phase === 'grid' || state.phase === 'ready') && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '22%',
            textAlign: 'center',
            fontSize: 15,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: t.colour,
            textShadow: '0 1px 10px rgba(0,0,0,0.8)',
            animation: 'ri-breathe 2.2s ease-in-out infinite',
          }}
        >
          Click to start
        </div>
      )}

      {count !== null && (
        <div
          key={count}
          aria-live="assertive"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '58%',
            textAlign: 'center',
            fontFamily: mono,
            fontSize: 44,
            color: `${quiet}0.9)`,
            textShadow: '0 0 18px rgba(255,60,40,0.6)',
            animation: 'ri-beat 0.8s ease-out both',
          }}
        >
          {count}
        </div>
      )}

      {state.phase === 'go' && (
        <div
          aria-live="assertive"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '54%',
            textAlign: 'center',
            fontSize: 'clamp(40px, 7vw, 84px)',
            letterSpacing: '0.2em',
            color: t.colour,
            textShadow: `0 0 34px ${t.colour}`,
            animation: 'ri-go 1.2s ease-out both',
          }}
        >
          GO
        </div>
      )}

      {state.phase === 'fly' && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 'calc(9vh + 10px)',
            fontFamily: mono,
            fontSize: 10,
            color: `${quiet}0.4)`,
          }}
        >
          any key to skip
        </div>
      )}
    </div>
  );
}
