'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useViewMode } from './ViewModeContext';

const PRIMARY_LINKS = [
  { href: '/', label: 'Check In' },
  { href: '/overview', label: 'Overview' },
  { href: '/missions', label: 'Missions' },
  { href: '/journey', label: 'Journey' },
  { href: '/notebook', label: 'Notebook' },
];

const PHONE_PRIMARY_LINKS = [
  { href: '/', label: 'Check In' },
  { href: '/#cockpit', label: 'Cockpit' },
  { href: '/missions', label: 'Missions' },
  { href: '/journey', label: 'Journey' },
  { href: '/notebook', label: 'Notebook' },
];

const MORE_LINKS = [
  { href: '/life-scan', label: 'Life Scan' },
  { href: '/programs', label: 'Programs' },
  { href: '/research', label: 'Research' },
];

export default function NavLinks() {
  const pathname = usePathname();
  const { mode } = useViewMode();
  const isPhone = mode === 'phone';
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const primary = isPhone ? PHONE_PRIMARY_LINKS : PRIMARY_LINKS;
  const isMoreActive = MORE_LINKS.some((l) => l.href === pathname);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [moreOpen]);

  return (
    <nav
      className={`mx-auto flex w-full items-center justify-center px-4 pb-3 ${
        isPhone ? 'max-w-sm gap-3 text-xs flex-wrap' : 'max-w-5xl gap-6 text-sm'
      }`}
    >
      {primary.map((link) => {
        const isActive = link.href.startsWith('/#')
          ? pathname === '/' &&
            typeof window !== 'undefined' &&
            window.location.hash === link.href.slice(1)
          : pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {link.label}
          </Link>
        );
      })}

      {/* More menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex h-5 w-5 items-center justify-center rotate-45 transition-all hover:scale-110"
          style={{
            background: isMoreActive ? '#C4A060' : '#C4A06040',
            borderRadius: 2,
          }}
        >
          <span
            className="text-[9px] leading-none -rotate-45 font-bold"
            style={{ color: isMoreActive ? '#fff' : '#C4A060' }}
          >
            +
          </span>
        </button>

        {moreOpen && (
          <div className="absolute top-full mt-2 right-0 z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {MORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  pathname === link.href
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
