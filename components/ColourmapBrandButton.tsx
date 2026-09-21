'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { BUILD_DATE, CHANGELOG, CURRENT_BRANCH, LATEST_HASH } from '@/lib/generated/changelog';

/*
 * Clickable "Colourmap" brand in the top header.
 * Opens an About modal with changelog (auto-generated from git log),
 * vision / next steps, user card, and technical primer.
 */

interface ColourmapBrandButtonProps {
  initials?: string;
  email?: string;
}

// Vision sections — distilled from docs/pdfs/colourmap-vision-2026-04.pdf
// (the master vision PDF). Each entry has a one-line summary +
// what I think the *core next step* is for that surface. Updated
// as those next steps land. Shown when the user expands the second
// losange in the About modal.
const VISION_SECTIONS: { title: string; color: string; summary: string; next: string }[] = [
  {
    title: 'The thesis',
    color: '#B33A2B',
    summary:
      'Patagonia of social, not Meta. A small intentional space that holds people who already love each other — without performing for strangers.',
    next: 'Live with it. Run Salon #1 with our 8 closest friends — see if the room recognizes itself.',
  },
  {
    title: 'Day · Check-in',
    color: '#D4805A',
    summary:
      'Two big dots, Feeling and Doing, opening into 60-second guided check-ins. The base layer everything else reads from.',
    next: 'Sharing — the third dot. Add the social-context check-in once Circles have missions and presence.',
  },
  {
    title: 'Music · Chill ↔ Groove unity',
    color: '#3A6890',
    summary:
      'Chill is the atmosphere creator; Groove is the rhythm. One shared sound library so a Chill landscape becomes the bed for a Groove session.',
    next: 'Extract lib/sound-library.ts, then ship the Atmosphere strip in Groove that consumes saved Chill soundscapes.',
  },
  {
    title: 'Music · 7 soundscapes deepened',
    color: '#C4A060',
    summary:
      'Big-dot picker landed (Tech / Funk / Tropical / Slow Roll / Boom Bap / Epic Electro / Lofi). Each preset reconfigures bpm + swing + tracks.',
    next: 'Source CC0 samples (marimba, vinyl crackle, snap, ooh-vocal) and tune the per-preset sound design — make each soundscape feel singular.',
  },
  {
    title: 'Notebook',
    color: '#9B6BA0',
    summary:
      'Lightweight markdown notebook with multiple categories (Notes / Ideas / Journal / Songs / Projects / Rhymes / Practice / Lessons). Saved sound moments land here.',
    next: 'Tag-based "now" view for what you\'re actively working on — feeds the Track Lines layer of Overview.',
  },
  {
    title: 'Circles · the social primitive',
    color: '#7AAA58',
    summary:
      'A shared space to align missions and become effective in the process. 5–30 people. No follow, no feed, no public profile.',
    next: 'Circle Missions schema + UI. Use it to run our own band project for 2 weeks. Without missions, Circles are a primitive; with them, Circles are the product.',
  },
  {
    title: 'Overview · the reflective surface',
    color: '#5AA8B0',
    summary:
      'Seven layers — NowBar (live), Week Shape, Compass flower, Track Lines, Soundscape Garden, Quiet Notes, Slow Wins. Recognition + Beauty + Insight.',
    next: 'Layer 2 — Week Shape. A horizontal heat-river of feeling + doing across 7 days. Mostly SVG work, ~half a day.',
  },
  {
    title: 'Mini-player · audio across navigation',
    color: '#5C3018',
    summary:
      'When music plays in any tool and you wander to /day, a small persistent pill keeps the audio alive and offers play/pause + jump-back.',
    next: 'lib/sound-session.tsx provider + <MiniPlayer />. ~2–3 days. Foundation for collective music control later.',
  },
  {
    title: 'Design system · adaptive',
    color: '#8A6A4A',
    summary:
      'Shipped lib/design-tokens.ts (NowBar dogfoods it). The bigger move is container queries + useViewport() so layouts adapt to where they are, not just what md: thinks.',
    next: 'useViewport() hook + 100dvh on the cockpit (fixes iOS Safari address-bar jump). Migrate one component as worked example.',
  },
  {
    title: 'Growth · €0 social media',
    color: '#E0844A',
    summary:
      'Salons (8 people, living room) → Underground Nights (50, friendly venue) → Experiments + Expos → Festivals. No paid ads, no influencers, no PR firms.',
    next: 'Ship Salon Mode preset — host-flow with the right surfaces sequenced. Run our first Salon. Iterate from there.',
  },
];

const PRIMER_SECTIONS: { title: string; items: { term: string; def: string }[] }[] = [
  {
    title: 'Git & GitHub',
    items: [
      { term: 'Commit', def: 'A saved snapshot of changes — like a permanent, labelled Save.' },
      {
        term: 'Branch',
        def: 'A parallel version of the code where you build without touching main.',
      },
      {
        term: 'PR (Pull Request)',
        def: 'A proposal to merge a branch into main. CI runs checks before it can merge.',
      },
      { term: 'Merge', def: 'Combining a branch back into main. Permanent.' },
      {
        term: 'Cherry-pick',
        def: 'Taking one commit from a stale branch and applying it to another.',
      },
      {
        term: 'Merge conflict',
        def: 'Two branches changed the same line — you resolve it by choosing one version.',
      },
      {
        term: 'Branch protection',
        def: 'A GitHub rule that blocks pushing directly to main. All changes must go through a PR.',
      },
    ],
  },
  {
    title: 'CI / Automated Checks',
    items: [
      {
        term: 'CI',
        def: 'Continuous Integration — GitHub runs 14 checks automatically on every PR.',
      },
      {
        term: 'Pre-push hook',
        def: 'A script that runs on your machine before code reaches GitHub (lint, tests, typecheck).',
      },
      { term: 'Coverage gate', def: 'CI fails if test coverage drops below a minimum threshold.' },
    ],
  },
  {
    title: 'The Tech Stack',
    items: [
      {
        term: 'TypeScript',
        def: 'JavaScript with types — the compiler catches mismatches before the code runs.',
      },
      { term: 'React', def: 'Library for building UI out of self-contained components.' },
      {
        term: 'Next.js',
        def: 'Framework on top of React. Handles routing, server logic, and builds. A file at app/(app)/day/page.tsx becomes /day.',
      },
      {
        term: 'Bun',
        def: 'The runtime that runs the code. Faster than Node. `bun run dev` starts the local server.',
      },
      {
        term: 'Supabase',
        def: 'Backend-as-a-service: database, auth, and API without managing a server.',
      },
      {
        term: 'PostgreSQL',
        def: 'The database. Relational — data lives in tables. SQL queries it.',
      },
      {
        term: 'PostGIS',
        def: 'A PostgreSQL extension for geographic queries (e.g. "find sparks within 10km").',
      },
      { term: 'Drizzle ORM', def: 'Translates TypeScript into SQL. Also manages migrations.' },
      {
        term: 'Migration',
        def: 'A SQL file that changes the DB schema (new table, new column). Run in order; permanent.',
      },
      { term: 'API route', def: 'A server endpoint. app/api/field/route.ts → GET /api/field.' },
      {
        term: 'Environment variable',
        def: 'Secrets stored outside the code in .env.local. Never committed to Git.',
      },
      {
        term: 'Tailwind CSS',
        def: 'Style by adding class names directly to HTML elements. Design tokens in tailwind.config.ts.',
      },
    ],
  },
  {
    title: 'Testing',
    items: [
      { term: 'Unit test', def: 'Tests one function or component in isolation.' },
      { term: 'Vitest', def: 'The test framework. Run with `bun run test`.' },
      {
        term: 'Mock',
        def: 'A fake version of a dependency (e.g. fake DB) used in tests to keep them fast.',
      },
      {
        term: 'Test pair',
        def: 'Repo policy: every service file and API route must have a matching .test.ts file.',
      },
    ],
  },
  {
    title: 'Architecture',
    items: [
      {
        term: 'Service layer',
        def: 'lib/services/ — owns all business logic and rules. API routes call this; never the DB directly.',
      },
      {
        term: 'DB queries layer',
        def: 'lib/db/queries/ — pure database reads and writes, no logic.',
      },
      {
        term: 'Component',
        def: 'A reusable piece of UI in components/. Pages assemble components.',
      },
    ],
  },
  {
    title: 'Vibe Coding',
    items: [
      {
        term: 'Vibe coding',
        def: 'Building by describing what you want in natural language. AI writes the code; you steer with vision and judgment.',
      },
      {
        term: 'Diff',
        def: 'What changed in a file — green lines added, red lines removed. Reading diffs is how you verify AI output.',
      },
      {
        term: 'Hallucination',
        def: 'When AI states something confidently but incorrectly. Tests and the build catch these mechanically.',
      },
      {
        term: 'Context window',
        def: "The AI's short-term memory. Important decisions go into files (specs, CLAUDE.md) so they survive past the window.",
      },
    ],
  },
];

const MORE_SEGMENTS = [
  { href: '/entertainment', label: 'Entertainment' },
  { href: '/music', label: 'Music' },
  { href: '/figures', label: '3D Figures' },
  { href: '/figure-stars', label: 'Figure Stars' },
  { href: '/figure-stars-trio', label: 'Figure Trio' },
  { href: '/figures?mode=billy', label: 'Billy 3D' },
  { href: '/figures?mode=static&figure=kid-lotus', label: 'Buddha Boy' },
  { href: '/proportion-buddy', label: 'Proportion Buddy' },
  { href: '/atlas', label: 'Atlas' },
  { href: '/progress-road', label: 'Roads' },
  { href: '/circles', label: 'Social' },
  { href: '/journey', label: 'Journey' },
  { href: '/life-scan', label: 'Life Scan' },
  { href: '/research', label: 'Research' },
  { href: '/build-lab', label: 'Creator Space' },
];

const OPEN_AI_PRESENCE_EVENT = 'colourmap:open-ai-presence';

function openAIPresenceFromTitleMenu() {
  window.dispatchEvent(
    new CustomEvent(OPEN_AI_PRESENCE_EVENT, { detail: { source: 'brand-menu' } }),
  );
}

export default function ColourmapBrandButton({ initials, email }: ColourmapBrandButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-85"
        style={{ background: 'none', border: 'none', padding: 0 }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="About Colour Brain"
      >
        {/* Invisible spacer matching the star width — keeps "Colourmap" text visually centred */}
        <span
          aria-hidden="true"
          style={{ display: 'inline-block', width: 18, height: 18, flexShrink: 0 }}
        />
        <p
          className="text-[22px] font-bold tracking-[0.08em] font-serif text-center"
          style={{ color: 'var(--header-text, #C8A858)' }}
        >
          Colour Brain
        </p>
        <svg width={18} height={18} viewBox="0 0 20 20" style={{ marginTop: 3 }} aria-hidden="true">
          {(() => {
            const cx = 10;
            const cy = 10;
            const r1 = 9;
            const r2 = 3.5;
            const pts: string[] = [];
            for (let i = 0; i < 8; i++) {
              const a = -Math.PI / 2 + (i * Math.PI) / 4;
              const r = i % 2 === 0 ? r1 : r2;
              // Round to 3 decimals so server-render and client-render
              // produce identical strings — Math.cos/sin can drift in
              // the last digit between V8 and Node, breaking SSR
              // hydration if the values are stringified at full
              // precision.
              const x = (cx + r * Math.cos(a)).toFixed(3);
              const y = (cy + r * Math.sin(a)).toFixed(3);
              pts.push(`${x},${y}`);
            }
            return (
              <polygon points={pts.join(' ')} fill="var(--header-text, #C8A858)" opacity={0.9} />
            );
          })()}
        </svg>
      </button>

      {open && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="About Colour Brain"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(26, 13, 4, 0.55)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => {
            if (e.target === overlayRef.current) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          <div
            className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[24px] border border-border bg-card p-6 shadow-[0_24px_80px_rgba(94,58,20,0.25)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 cursor-pointer text-xl leading-none transition-opacity hover:opacity-70"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted-foreground)',
                padding: 4,
              }}
            >
              ×
            </button>

            {/* Heading — centered */}
            <div className="mb-4 flex items-center justify-center gap-2">
              <p
                className="font-normal tracking-[0.1em]"
                style={{ fontSize: 26, color: '#B33A2B', fontStyle: 'italic' }}
              >
                Colour Brain
              </p>
              <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
                {(() => {
                  const cx = 10;
                  const cy = 10;
                  const r1 = 9;
                  const r2 = 3.5;
                  const pts: string[] = [];
                  for (let i = 0; i < 8; i++) {
                    const a = -Math.PI / 2 + (i * Math.PI) / 4;
                    const r = i % 2 === 0 ? r1 : r2;
                    // Round to 3 decimals so server-render and client-render
                    // produce identical strings — Math.cos/sin can drift in
                    // the last digit between V8 and Node, breaking SSR
                    // hydration if the values are stringified at full
                    // precision.
                    const x = (cx + r * Math.cos(a)).toFixed(3);
                    const y = (cy + r * Math.sin(a)).toFixed(3);
                    pts.push(`${x},${y}`);
                  }
                  return <polygon points={pts.join(' ')} fill="#B33A2B" opacity={0.85} />;
                })()}
              </svg>
            </div>

            {/* Tagline — short, single line */}
            <p
              className="mb-5 italic text-center"
              style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--muted-foreground)' }}
            >
              From organization to clarity.
            </p>

            {/* Divider */}
            <div
              aria-hidden="true"
              className="mb-5"
              style={{ height: 1, background: 'var(--border)' }}
            />

            {/* Signed-in user — initials + email + sign-out. Lives
                here (in the title's modal) instead of as a standalone
                pill in the header so the right slot can hold the
                theme palette. (Per Martin 2026-04-26.) */}
            {initials && (
              <div
                className="mb-5 flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: '#C4A06010', border: '1px solid #C4A06028' }}
              >
                <span
                  className="flex shrink-0 items-center justify-center rounded-full text-[12px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    width: 36,
                    height: 36,
                    color: '#5C3018',
                    background: '#C4A06028',
                    border: '1px solid #C4A06055',
                  }}
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  {email && (
                    <p
                      className="truncate"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        opacity: 0.8,
                      }}
                    >
                      {email}
                    </p>
                  )}
                  <form action="/logout" method="post" className="mt-0.5">
                    <button
                      type="submit"
                      className="cursor-pointer transition-colors hover:opacity-70"
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: '#B33A2B',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Credits — simplified to just the two names */}
            <p
              className="text-center"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 13,
                color: 'var(--muted-foreground)',
                letterSpacing: '0.04em',
                lineHeight: 1.6,
              }}
            >
              <span
                className="uppercase"
                style={{ opacity: 0.55, fontSize: 11, letterSpacing: '0.22em' }}
              >
                Created by
              </span>
              <br />
              <strong style={{ fontWeight: 600, color: '#5C3018', fontStyle: 'italic' }}>
                Vikash and Martin
              </strong>
            </p>

            <section
              className="mt-5 rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(196,160,96,0.08)',
                border: '1px solid rgba(196,160,96,0.22)',
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: '#5C3018',
                    }}
                  >
                    More segments
                  </p>
                  <p
                    style={{
                      marginTop: 2,
                      fontSize: 11.5,
                      lineHeight: 1.35,
                      color: 'var(--muted-foreground)',
                      opacity: 0.82,
                    }}
                  >
                    Developing areas of Colour Brain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    openAIPresenceFromTitleMenu();
                    setOpen(false);
                  }}
                  style={{
                    border: '1px solid rgba(196,160,96,0.38)',
                    borderRadius: 999,
                    background: 'rgba(196,160,96,0.12)',
                    color: '#5C3018',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: '7px 11px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  AI Presence
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 7,
                }}
              >
                {MORE_SEGMENTS.map((segment) => (
                  <Link
                    key={segment.href}
                    href={segment.href}
                    onClick={() => setOpen(false)}
                    style={{
                      border: '1px solid rgba(92,48,24,0.16)',
                      borderRadius: 999,
                      color: '#5C3018',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '7px 10px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      background: 'rgba(255,248,226,0.2)',
                    }}
                  >
                    {segment.label}
                  </Link>
                ))}
              </div>
            </section>

            {/* Divider before build footer */}
            <div
              aria-hidden="true"
              className="mt-6 mb-4"
              style={{ height: 1, background: 'var(--border)' }}
            />

            {/* Useful information — technical primer in pill form */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 12,
                  color: '#8A6A4A',
                  opacity: 0.85,
                  letterSpacing: '0.06em',
                }}
              >
                learn · <strong style={{ color: '#5C3018', fontWeight: 700 }}>vocabulary</strong>
              </p>
              <button
                type="button"
                onClick={() => setPrimerOpen((s) => !s)}
                aria-label={primerOpen ? 'Hide technical primer' : 'Show technical primer'}
                aria-expanded={primerOpen}
                className="flex cursor-pointer items-center justify-center transition-all hover:opacity-80"
                style={{
                  width: 28,
                  height: 28,
                  background: primerOpen ? '#5C301818' : 'transparent',
                  border: '1px solid #5C301855',
                  borderRadius: 6,
                  transform: 'rotate(45deg)',
                  padding: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    transform: 'rotate(-45deg)',
                    color: '#5C3018',
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1,
                  }}
                >
                  {primerOpen ? '−' : '+'}
                </span>
              </button>
            </div>

            {primerOpen && (
              <div
                className="mb-4 rounded-lg animate-in fade-in duration-150"
                style={{
                  background: '#F5E8C812',
                  border: '1px solid #5C301825',
                  padding: '12px 14px',
                  maxHeight: 380,
                  overflowY: 'auto',
                }}
              >
                {PRIMER_SECTIONS.map((section) => (
                  <div key={section.title} className="mb-4 last:mb-0">
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#8A6A4A',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                        opacity: 0.7,
                      }}
                    >
                      {section.title}
                    </p>
                    <dl className="space-y-2">
                      {section.items.map((item) => (
                        <div key={item.term}>
                          <dt
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#5C3018',
                              marginBottom: 1,
                            }}
                          >
                            {item.term}
                          </dt>
                          <dd
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 11.5,
                              color: 'var(--muted-foreground)',
                              lineHeight: 1.5,
                              opacity: 0.9,
                              paddingLeft: 0,
                              margin: 0,
                            }}
                          >
                            {item.def}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}

            {/* Vision losange — tap to expand the master-vision
                summary + core next step for each surface (Day,
                Music, Notebook, Circles, Overview, etc.). Sourced
                from docs/pdfs/colourmap-vision-2026-04.pdf. */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 12,
                  color: '#8A6A4A',
                  opacity: 0.85,
                  letterSpacing: '0.06em',
                }}
              >
                vision · <strong style={{ color: '#5C3018', fontWeight: 700 }}>next steps</strong>
              </p>
              <button
                type="button"
                onClick={() => setVisionOpen((s) => !s)}
                aria-label={visionOpen ? 'Hide vision sections' : 'Show vision sections'}
                aria-expanded={visionOpen}
                title="What's next, by surface"
                className="flex cursor-pointer items-center justify-center transition-all hover:opacity-80"
                style={{
                  width: 28,
                  height: 28,
                  background: visionOpen ? '#B33A2B18' : 'transparent',
                  border: '1px solid #B33A2B55',
                  borderRadius: 6,
                  transform: 'rotate(45deg)',
                  padding: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    transform: 'rotate(-45deg)',
                    color: '#B33A2B',
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1,
                  }}
                >
                  {visionOpen ? '−' : '+'}
                </span>
              </button>
            </div>

            {visionOpen && (
              <div
                className="mb-4 rounded-lg animate-in fade-in duration-150"
                style={{
                  background: '#F5E8C812',
                  border: '1px solid #B33A2B25',
                  padding: '12px 14px',
                  maxHeight: 360,
                  overflowY: 'auto',
                }}
              >
                <ul className="space-y-3.5">
                  {VISION_SECTIONS.map((section) => (
                    <li key={section.title} style={{ fontFamily: 'var(--font-serif)' }}>
                      <p
                        className="flex items-center gap-2"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: section.color,
                          letterSpacing: '0.04em',
                          marginBottom: 3,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: section.color,
                          }}
                        />
                        {section.title}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.5,
                          opacity: 0.95,
                          marginBottom: 4,
                        }}
                      >
                        {section.summary}
                      </p>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: '#5C3018',
                          lineHeight: 1.5,
                          fontStyle: 'italic',
                          paddingLeft: 14,
                          borderLeft: `2px solid ${section.color}55`,
                          marginLeft: 0,
                        }}
                      >
                        <strong
                          style={{
                            fontWeight: 700,
                            color: section.color,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            fontSize: 10,
                            marginRight: 6,
                          }}
                        >
                          next
                        </strong>
                        {section.next}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Changelog — auto-generated from git log at build time */}
            <div className="flex items-center justify-between gap-3">
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 12,
                  color: '#8A6A4A',
                  opacity: 0.8,
                  letterSpacing: '0.06em',
                }}
              >
                build ·{' '}
                <strong style={{ color: '#C4A060', fontWeight: 700 }}>recent changes</strong>
              </p>
              <button
                type="button"
                onClick={() => setChangelogOpen((s) => !s)}
                aria-label={changelogOpen ? 'Hide recent changes' : 'Show recent changes'}
                aria-expanded={changelogOpen}
                className="flex cursor-pointer items-center justify-center transition-all hover:opacity-80"
                style={{
                  width: 28,
                  height: 28,
                  background: changelogOpen ? '#C4A06018' : 'transparent',
                  border: '1px solid #C4A06055',
                  borderRadius: 6,
                  transform: 'rotate(45deg)',
                  padding: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    transform: 'rotate(-45deg)',
                    color: '#C4A060',
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1,
                  }}
                >
                  {changelogOpen ? '−' : '+'}
                </span>
              </button>
            </div>

            {changelogOpen && (
              <div
                className="mt-3 rounded-lg animate-in fade-in duration-150"
                style={{
                  background: '#F5E8C812',
                  border: '1px solid #C4A06025',
                  padding: '10px 12px',
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: '#8A6A4A',
                    opacity: 0.55,
                    marginBottom: 8,
                    letterSpacing: '0.04em',
                  }}
                >
                  {LATEST_HASH} · {BUILD_DATE} ·{' '}
                  {CURRENT_BRANCH.replace(/^(feature|fix|feat|chore)\//, '')}
                </p>
                <ul className="space-y-2">
                  {CHANGELOG.map((entry) => (
                    <li
                      key={entry.hash}
                      className="flex items-start gap-2"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      <span
                        className="flex flex-col items-end shrink-0"
                        style={{ marginTop: 2, minWidth: 48 }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: entry.prNum ? '#B33A2B' : '#8A6A4A',
                            letterSpacing: '0.04em',
                            lineHeight: 1.1,
                            fontFamily: 'monospace',
                          }}
                        >
                          {entry.prNum ? `#${entry.prNum}` : entry.hash}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            color: '#8A6A4A',
                            opacity: 0.55,
                            lineHeight: 1.1,
                            marginTop: 1,
                          }}
                        >
                          {entry.date}
                        </span>
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.4,
                          opacity: 0.9,
                        }}
                      >
                        {entry.subject}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tap-through hint */}
            <p
              className="mt-5 text-center"
              style={{
                fontSize: 11,
                color: 'var(--muted-foreground)',
                opacity: 0.5,
                letterSpacing: '0.08em',
              }}
            >
              tap anywhere to return
            </p>
          </div>
        </div>
      )}
    </>
  );
}
