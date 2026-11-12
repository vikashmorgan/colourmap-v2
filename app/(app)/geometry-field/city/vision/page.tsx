import Link from 'next/link';

import { SECTIONS } from '@/lib/city-vision';

/*
 * THE CITY OF DREAMS, HOW FAR IT CAN GO.
 *
 * 2026-11-12: "think how far and wide u can develop project. do an
 * explanation brief simple in the app where i can read what u think. how far
 * u can take this. we've done a lot in 2 days so imagine in a year."
 * Then: "city vision must be in same design as the city dreams videogame."
 *
 * A page to read, not a tool: short sections, plain words, one idea each.
 * Like the City itself it covers the app shell (the .bb layer's z-index), on
 * the City's Dawn twilight with its gold, under a golden plan drawn in dots
 * of light. The words live in lib/city-vision.ts.
 */
export const metadata = {
  title: 'City vision',
  description:
    'How far the City of Dreams can go in a year: worlds, game, maps and a living second brain.',
};

/* The City's Dawn background (components/City.tsx) and its gold (lib/golden-city.ts). */
const DAWN = 'linear-gradient(180deg, #080a24 0%, #141638 40%, #2a2240 75%, #3d2a3a 100%)';
const GOLD = '#ff9a3c';
const IVORY = '#f6e7cc';
const SOFT = 'rgba(246, 231, 204, 0.72)';
const PHI = (1 + Math.sqrt(5)) / 2;

/** The golden plan in dots: rings each φ wider than the last, twelve boulevards to the heart. */
function GoldenPlan() {
  const rings = [0, 1, 2, 3, 4].map((i) => 14 * PHI ** i);
  const outer = rings[rings.length - 1] as number;
  return (
    <svg
      viewBox="-100 -100 200 200"
      width="180"
      height="180"
      aria-hidden="true"
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
    >
      <defs>
        <filter id="vision-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="vision-heart">
          <stop offset="0" stopColor="#fff3dc" />
          <stop offset="0.4" stopColor={GOLD} stopOpacity="0.8" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter="url(#vision-glow)" stroke={GOLD} strokeLinecap="round" fill="none">
        {rings.map((r) => (
          <circle key={r} r={r} strokeWidth="1.3" strokeDasharray="0 3.2" opacity="0.85" />
        ))}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line
              key={a}
              x1={Math.cos(a) * 9}
              y1={Math.sin(a) * 9}
              x2={Math.cos(a) * outer}
              y2={Math.sin(a) * outer}
              strokeWidth="1.3"
              strokeDasharray="0 2.6"
            />
          );
        })}
      </g>
      <circle r="16" fill="url(#vision-heart)" />
    </svg>
  );
}

export default function CityVisionPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        overflowY: 'auto',
        background: DAWN,
        color: IVORY,
      }}
    >
      <Link
        href="/geometry-field/city"
        style={{
          position: 'fixed',
          top: 'calc(14px + env(safe-area-inset-top))',
          left: 16,
          fontSize: 13,
          color: SOFT,
          textDecoration: 'none',
        }}
      >
        ← City
      </Link>
      <div className="mx-auto max-w-md px-4 py-12" style={{ display: 'grid', gap: 26 }}>
        <header style={{ display: 'grid', gap: 14 }}>
          <GoldenPlan />
          <div>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: GOLD,
              }}
            >
              City vision
            </p>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                lineHeight: 1.2,
                textShadow: '0 0 18px rgba(255, 154, 60, 0.35)',
              }}
            >
              The City of Dreams, how far it can go
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: SOFT }}>
              What two days made, and what a year could make of it.{' '}
              <Link
                href="/geometry-field/city"
                style={{ color: GOLD, textDecoration: 'underline' }}
              >
                Open the City
              </Link>
            </p>
          </div>
        </header>
        {SECTIONS.map((s) => (
          <section key={s.title} style={{ display: 'grid', gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 19,
                lineHeight: 1.3,
                color: GOLD,
              }}
            >
              {s.title}
            </h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
              {s.lines.map((line) => (
                <li
                  key={line}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: SOFT,
                    paddingLeft: 16,
                    position: 'relative',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 2,
                      top: '0.62em',
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: GOLD,
                      boxShadow: `0 0 6px ${GOLD}`,
                    }}
                  />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
