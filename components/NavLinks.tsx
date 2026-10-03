'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useViewMode } from './ViewModeContext';

/*
 * `plain` links leave the app: /coding is a whole standalone page served by a
 * route handler, not an app screen, so it gets an ordinary <a> rather than a
 * client-side <Link> navigation.
 */
const PRIMARY_LINKS: { href: string; label: string; plain?: boolean }[] = [
  { href: '/day', label: 'Focus' },
  { href: '/ai', label: 'AI' },
  { href: '/notebook', label: 'Notes' },
  { href: '/education', label: 'Education' },
  { href: '/geometry-field', label: 'AI Projections' },
  { href: '/coding', label: 'Coding', plain: true },
];

const PHONE_PRIMARY_LINKS = PRIMARY_LINKS;

export default function NavLinks() {
  const pathname = usePathname();
  const { mode } = useViewMode();
  const isPhone = mode === 'phone';
  const navRef = useRef<HTMLElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  const primary = isPhone ? PHONE_PRIMARY_LINKS : PRIMARY_LINKS;

  // Auto-scroll the active tab into view on route change so the user
  // never loses orientation. Especially matters on phone where only
  // 2–3 tabs are visible at once — without this, navigating to
  // /notebook scrolls Day off-screen and you feel 'lost'.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the real trigger; refs are stable
  useEffect(() => {
    const el = activeLinkRef.current;
    const nav = navRef.current;
    if (!el || !nav) return;
    const linkRect = el.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    // Center the active link in the visible nav strip when possible.
    const target = el.offsetLeft - navRect.width / 2 + linkRect.width / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [pathname]);

  // On phone, the nav scrolls horizontally with scroll-snap + fade
  // edges so the user feels like they're flipping through tabs.
  return (
    <div
      className="relative flex items-center w-full"
      style={{ background: 'var(--nav-bg, #d4b896)' }}
    >
      {/* Nav centered in full width. Extra surfaces live in the Colourmap title menu. */}
      <nav
        ref={(el) => {
          navRef.current = el;
        }}
        className="flex w-full items-center gap-7 justify-center scrollbar-none px-4 pb-3 pt-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {primary.map((link) => {
          const isActive = link.href.startsWith('/#')
            ? pathname === '/' &&
              typeof window !== 'undefined' &&
              window.location.hash === link.href.slice(1)
            : pathname === link.href;
          const linkStyle = {
            fontSize: 16,
            fontFamily: 'var(--font-serif)',
            color: 'var(--header-text, #7A5438)',
            fontWeight: isActive ? 800 : 700,
            letterSpacing: '0.08em',
          };
          if (link.plain) {
            return (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 whitespace-nowrap transition-colors tracking-[0.04em]"
                style={linkStyle}
              >
                {link.label}
              </a>
            );
          }
          return (
            <Link
              key={link.href}
              href={link.href}
              ref={
                isActive
                  ? (el) => {
                      activeLinkRef.current = el;
                    }
                  : undefined
              }
              className="shrink-0 whitespace-nowrap transition-colors tracking-[0.04em]"
              style={linkStyle}
            >
              {link.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="block mx-auto"
                  style={{
                    height: 2,
                    width: '100%',
                    background: '#C4A060',
                    borderRadius: 2,
                    marginTop: 2,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
