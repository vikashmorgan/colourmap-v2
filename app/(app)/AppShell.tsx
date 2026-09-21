'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import BrainDock from '@/components/BrainDock';
import ErrorBoundary from '@/components/ErrorBoundary';
import GuitarStudio from '@/components/GuitarStudio';
import NavLinks from '@/components/NavLinks';
import SoundLab from '@/components/SoundLab';
import { useViewMode } from '@/components/ViewModeContext';

const SOCIAL_ROUTES = [
  { href: '/circles', label: 'Team' },
  { href: '/sparks', label: 'Sparks' },
  { href: '/chat', label: 'Chat' },
];

type MusicSection = 'makers' | 'guitar';

function formatFooterDate(date: Date) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { mode, navPosition } = useViewMode();
  const pathname = usePathname();
  const onMusic = pathname === '/music';
  const onDay = pathname === '/day';
  const onSocial = SOCIAL_ROUTES.some((r) => r.href === pathname);
  const immersivePage =
    pathname === '/progress-road' ||
    pathname === '/geometry-field' ||
    pathname === '/entertainment' ||
    pathname === '/figures' ||
    pathname === '/figure-stars';
  const [musicSection, setMusicSection] = useState<MusicSection>('makers');
  function showRecordingsSection(_songId?: string) {
    // Recordings hidden for now — no-op
  }

  const containerClass = immersivePage
    ? 'w-full p-0'
    : onDay
      ? 'mx-auto w-full max-w-7xl px-0 py-0'
      : mode === 'phone'
        ? 'mx-auto w-full max-w-sm px-4 py-6'
        : 'mx-auto w-full max-w-7xl px-6 py-10';

  return (
    <ErrorBoundary>
      <div className={containerClass}>
        {/* Always mounted so Web Audio keeps running on navigation.
            display:none hides it but never unmounts — audio survives
            route changes. Only visible when on /music. */}
        <div style={{ display: onMusic ? 'block' : 'none' }}>
          {/* Music top-nav: Music Studio · Guitar Studio */}
          <div className="flex items-center justify-center gap-8 pb-1 mb-4">
            {(
              [
                { id: 'makers', label: 'Music Studio' },
                { id: 'guitar', label: 'Guitar Studio' },
              ] as { id: MusicSection; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMusicSection(id)}
                className="shrink-0 cursor-pointer bg-transparent border-none transition-opacity"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '11px',
                  fontWeight: musicSection === id ? 700 : 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: musicSection === id ? '#C4A060' : '#A0907A',
                  opacity: musicSection === id ? 1 : 0.55,
                  padding: '4px 0',
                  borderBottom: musicSection === id ? '2px solid #C4A060' : '2px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* SoundLab: always mounted so audio keeps running */}
          <div style={{ display: musicSection === 'makers' ? 'block' : 'none' }}>
            <SoundLab />
          </div>
          {/* GuitarStudio: shown when selected */}
          {musicSection === 'guitar' && (
            <GuitarStudio onShowRecordingsSection={showRecordingsSection} />
          )}
        </div>

        {/* Social sub-navigation — shown on /circles, /sparks, /chat */}
        {onSocial && (
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-4">
              <div style={{ flex: 1, height: 1, background: '#6890B020' }} />
              <span
                className="shrink-0 text-[11px] uppercase tracking-[0.18em]"
                style={{ color: '#6890B0', fontFamily: 'var(--font-serif)', fontWeight: 700 }}
              >
                Social
              </span>
              <div style={{ flex: 1, height: 1, background: '#6890B020' }} />
            </div>
            <div className="flex gap-5">
              {SOCIAL_ROUTES.map((route) => {
                const active = pathname === route.href;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="cursor-pointer bg-transparent transition-colors"
                    style={{
                      fontSize: 15,
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                      textDecoration: 'none',
                      borderBottom: active ? '2px solid #6890B0' : '2px solid transparent',
                      paddingBottom: 2,
                    }}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {children}

        {/* Date footer — shown at the bottom of every page */}
        {!immersivePage && (
          <p
            style={{
              textAlign: 'center',
              padding: '16px 0 8px',
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              fontStyle: 'italic',
              letterSpacing: '0.06em',
              color: 'rgba(122,84,56,0.35)',
              pointerEvents: 'none',
            }}
          >
            {formatFooterDate(new Date())}
          </p>
        )}
      </div>

      {/*
        The index of the whole, present on every surface. It is furniture
        rather than a feature — see components/BrainDock.tsx.
      */}
      <BrainDock />

      {/* Bottom nav — shown when navPosition='bottom' */}
      {navPosition === 'bottom' && (
        <div
          className="fixed bottom-0 left-0 right-0 border-t border-border"
          style={{ background: 'var(--secondary)', zIndex: 1000 }}
        >
          <NavLinks />
        </div>
      )}
    </ErrorBoundary>
  );
}
