import Link from 'next/link';

import { SECTIONS } from '@/lib/city-vision';

/*
 * THE CITY OF DREAMS, HOW FAR IT CAN GO.
 *
 * 2026-11-12: "think how far and wide u can develop project. do an
 * explanation brief simple in the app where i can read what u think. how far
 * u can take this. we've done a lot in 2 days so imagine in a year."
 *
 * A page to read, not a tool: short sections, plain words, one idea each.
 * The words live in lib/city-vision.ts.
 */
export const metadata = {
  title: 'City vision',
  description:
    'How far the City of Dreams can go in a year: worlds, game, maps and a living second brain.',
};

export default function CityVisionPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8" style={{ display: 'grid', gap: 22 }}>
      <header>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
          }}
        >
          City vision
        </p>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.2 }}>
          The City of Dreams, how far it can go
        </h1>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--muted-foreground)',
          }}
        >
          What two days made, and what a year could make of it.{' '}
          <Link href="/geometry-field/city" style={{ textDecoration: 'underline' }}>
            Open the City
          </Link>
        </p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.title} style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.3 }}>
            {s.title}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            {s.lines.map((line) => (
              <li key={line} style={{ fontSize: 14, lineHeight: 1.55 }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
