'use client';

/*
 * A place's name over the picture as you ride into it (docs/specs/drive-tracks.md, "Undertown",
 * "The lake behind the start"):
 * big spaced letters that come in slowly, hold, and fade, like the race intro's track name. Shown
 * once each time you enter; never flashing (docs/specs/drive-design-language.md).
 */

import { useEffect, useRef, useState } from 'react';

const ZONES = {
  undertown: { name: 'Undertown', sub: '下町 · the other side of the road', colour: '#c89cff' },
  // The lake behind Chinatown Run's start, and Water City found through its portals (2026-11-25).
  lake: { name: 'The Lake', sub: '湖 · behind the start', colour: '#7fd8e8' },
  'water-city': { name: 'Water City', sub: '水城 · found · now in the ring', colour: '#e8c060' },
} as const;

export type ZoneId = keyof typeof ZONES;

/** How long the name is on screen, in and out (ms). */
export const SHOW_MS = 4600;

export default function ZoneTitle({ zone }: { zone: ZoneId | null | undefined }) {
  const [shown, setShown] = useState<{ id: ZoneId; n: number } | null>(null);
  const last = useRef<ZoneId | null>(null);
  useEffect(() => {
    const now = zone ?? null;
    if (now && now !== last.current) setShown((s) => ({ id: now, n: (s?.n ?? 0) + 1 }));
    last.current = now;
  }, [zone]);
  // Gone when its fade is over (a timer, not the animation's end: that never comes when the tab is
  // hidden or motion is reduced to nothing).
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [shown]);
  if (!shown) return null;
  const z = ZONES[shown.id];
  return (
    <div
      key={shown.n}
      data-testid="zone-title"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '30%',
        textAlign: 'center',
        pointerEvents: 'none',
        fontFamily: 'var(--font-serif), Georgia, serif',
        color: 'rgba(255,244,255,0.92)',
        animation: `zt-name ${SHOW_MS}ms ease both`,
      }}
    >
      <style>{`
        @keyframes zt-name { 0% { opacity: 0; letter-spacing: .6em } 25%, 68% { opacity: 1; letter-spacing: .3em } 100% { opacity: 0; letter-spacing: .24em } }
        @keyframes zt-fade { 0%, 100% { opacity: 0 } 20%, 75% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [data-testid="zone-title"] { animation-name: zt-fade !important; letter-spacing: .3em } }
      `}</style>
      <div
        style={{
          fontSize: 'clamp(34px, 7vw, 84px)',
          textTransform: 'uppercase',
          textShadow: `0 0 34px ${z.colour}88, 0 2px 12px rgba(0,0,0,0.75)`,
        }}
      >
        {z.name}
      </div>
      <div style={{ marginTop: 10, fontSize: 14, color: `${z.colour}cc` }}>{z.sub}</div>
    </div>
  );
}
