'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  categoriesByTier,
  firstPageOf,
  locatePage,
  type Page,
  TIER_DEFINITION,
  TIER_ORDER,
  WORLD_HERO_QUOTE,
} from '@/lib/geopolitics-content';
import EducationModeSwitch from './EducationModeSwitch';
import TrustBadge from './TrustBadge';

const STORAGE_KEY = 'colourmap:geopolitics-world:last-page';

// Warm gold palette aligned with LearningHub modal
const GOLD_STRONG = 'rgba(240,216,152,0.96)';
const GOLD = 'rgba(220,196,138,0.92)';
const GOLD_MID = 'rgba(220,196,138,0.74)';
const GOLD_FAINT = 'rgba(196,160,96,0.6)';
const GOLD_BORDER = 'rgba(180,140,80,0.32)';
const GOLD_BORDER_SOFT = 'rgba(180,140,80,0.18)';

function tierBlurb(tier: string): string {
  if (tier === 'now') return 'What broke this month. Live status, hot threads.';
  if (tier === 'decade') return 'What you need to understand the 2020s and 2030s.';
  if (tier === 'horizon') return 'The world we are walking into. 2030 → 2050.';
  return '';
}

type Props = {
  onSwitchToSelf?: () => void;
  onOpenIntel?: () => void;
  onOpenMap?: () => void;
  onOpenGraph?: () => void;
  onOpenSources?: () => void;
  onOpenSpace?: () => void;
  initialPageSlug?: string | null;
};

export default function GeopoliticsWorld({
  onSwitchToSelf,
  onOpenIntel,
  onOpenMap,
  onOpenGraph,
  onOpenSources,
  onOpenSpace,
  initialPageSlug,
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    if (initialPageSlug) {
      setActiveSlug(initialPageSlug);
      setHydrated(true);
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setActiveSlug(saved);
    } catch {}
    setHydrated(true);
  }, [initialPageSlug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (activeSlug) {
        window.localStorage.setItem(STORAGE_KEY, activeSlug);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [activeSlug, hydrated]);

  const located = useMemo(() => (activeSlug ? locatePage(activeSlug) : null), [activeSlug]);

  return (
    <main
      data-testid="geopolitics-world"
      style={{
        minHeight: 'calc(100svh - 120px)',
        background: 'radial-gradient(circle at 20% 10%, rgba(58,38,18,0.96), rgba(18,10,4,1) 70%)',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
      }}
    >
      <EducationModeSwitch active="world" onSwitchToSelf={onSwitchToSelf} />

      {located ? (
        <PageReader
          page={located.page}
          chapterTitle={located.chapter.title}
          chapterNumber={located.chapter.number}
          programTitle={located.program.title}
          categoryTitle={located.category.title}
          categoryTint={located.category.tint}
          categoryCover={located.category.cover}
          pageIndex={located.pageIndex}
          totalInChapter={located.totalInChapter}
          prevSlug={located.prev?.slug ?? null}
          nextSlug={located.next?.slug ?? null}
          onNavigate={setActiveSlug}
          onBack={() => setActiveSlug(null)}
        />
      ) : (
        <CategoryGrid
          onOpen={(slug) => setActiveSlug(slug)}
          onOpenIntel={onOpenIntel}
          onOpenMap={onOpenMap}
          onOpenGraph={onOpenGraph}
          onOpenSources={onOpenSources}
          onOpenSpace={onOpenSpace}
        />
      )}
    </main>
  );
}

function CategoryGrid({
  onOpen,
  onOpenIntel,
  onOpenMap,
  onOpenGraph,
  onOpenSources,
  onOpenSpace,
}: {
  onOpen: (firstSlug: string) => void;
  onOpenIntel?: () => void;
  onOpenMap?: () => void;
  onOpenGraph?: () => void;
  onOpenSources?: () => void;
  onOpenSpace?: () => void;
}) {
  return (
    <section
      data-testid="world-hub"
      style={{
        color: GOLD,
        fontFamily: 'var(--font-serif)',
      }}
    >
      <header style={{ marginBottom: 22, textAlign: 'center' }}>
        <p style={{ ...smallLabel, color: GOLD_FAINT }}>education · world</p>
        <h1
          style={{
            margin: '6px 0 8px',
            color: GOLD_STRONG,
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(34px, 6vw, 56px)',
            letterSpacing: '-0.01em',
            lineHeight: 1.05,
          }}
        >
          The World, walking
        </h1>
        <p
          style={{
            margin: '0 auto',
            color: GOLD_MID,
            fontStyle: 'italic',
            fontSize: 15,
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          Six worlds. Short pages. One claim each. Read three, and the news starts making sense.
        </p>
        <figure
          style={{
            margin: '14px auto 0',
            maxWidth: 560,
            display: 'grid',
            gap: 4,
          }}
        >
          <blockquote
            style={{
              margin: 0,
              color: GOLD,
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              lineHeight: 1.55,
              borderLeft: `2px solid ${GOLD_BORDER}`,
              paddingLeft: 12,
              textAlign: 'left',
            }}
          >
            &ldquo;{WORLD_HERO_QUOTE.text}&rdquo;
          </blockquote>
          <figcaption
            style={{
              color: GOLD_FAINT,
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textAlign: 'right',
            }}
          >
            — {WORLD_HERO_QUOTE.attribution}
          </figcaption>
        </figure>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 14,
            justifyContent: 'center',
          }}
        >
          {onOpenIntel && <ToolPill testId="open-intel" onClick={onOpenIntel} label="Intel" />}
          {onOpenMap && <ToolPill testId="open-map" onClick={onOpenMap} label="Map" />}
          {onOpenSpace && (
            <ToolPill testId="open-space" onClick={onOpenSpace} label="Space ✨" highlighted />
          )}
          {onOpenGraph && <ToolPill testId="open-graph" onClick={onOpenGraph} label="Graph" />}
          {onOpenSources && (
            <ToolPill testId="open-sources" onClick={onOpenSources} label="Sources" />
          )}
        </div>
      </header>

      {TIER_ORDER.map((tier) => {
        const categoriesInTier = categoriesByTier(tier);
        if (categoriesInTier.length === 0) return null;
        return (
          <section
            key={tier}
            data-testid={`tier-${tier}`}
            style={{
              marginTop: 26,
              paddingTop: 16,
            }}
          >
            <header style={{ marginBottom: 14, textAlign: 'center' }}>
              <h2
                style={{
                  margin: 0,
                  color: GOLD_STRONG,
                  fontSize: 14,
                  letterSpacing: '0.32em',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                — {TIER_DEFINITION[tier].title} —
              </h2>
              <p
                style={{
                  margin: '4px auto 0',
                  color: GOLD_FAINT,
                  fontStyle: 'italic',
                  fontSize: 12,
                  lineHeight: 1.4,
                  maxWidth: 520,
                }}
              >
                {tierBlurb(tier)}
              </p>
            </header>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 14,
              }}
            >
              {categoriesInTier.map((category) => (
                <article
                  key={category.slug}
                  style={{
                    border: `1px solid ${GOLD_BORDER}`,
                    background: 'linear-gradient(180deg, rgba(54,36,18,0.78), rgba(34,22,10,0.92))',
                    borderRadius: 14,
                    overflow: 'hidden',
                    display: 'grid',
                    gap: 0,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
                  }}
                >
                  <CategoryCover category={category} />
                  <div style={{ padding: '12px 18px 16px', display: 'grid', gap: 12 }}>
                    <header>
                      <h3
                        style={{
                          margin: '0 0 4px',
                          color: GOLD_STRONG,
                          fontSize: 22,
                          letterSpacing: '0.01em',
                          fontWeight: 700,
                        }}
                      >
                        {category.title}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          color: GOLD_MID,
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {category.blurb}
                      </p>
                    </header>
                    {category.programs.map((program) => {
                      const first = firstPageOf(program.slug);
                      return (
                        <button
                          key={program.slug}
                          type="button"
                          onClick={() => first && onOpen(first.slug)}
                          data-testid={`open-program-${program.slug}`}
                          style={{
                            textAlign: 'left',
                            border: `1px solid ${GOLD_BORDER_SOFT}`,
                            borderRadius: 10,
                            background: 'rgba(255,238,200,0.06)',
                            cursor: first ? 'pointer' : 'not-allowed',
                            padding: '11px 14px',
                            display: 'grid',
                            gap: 6,
                            fontFamily: 'var(--font-serif)',
                            color: GOLD,
                          }}
                        >
                          <span
                            style={{
                              color: GOLD_STRONG,
                              fontWeight: 700,
                              fontSize: 15,
                              letterSpacing: '0.005em',
                            }}
                          >
                            {program.title}
                          </span>
                          <span
                            style={{
                              color: GOLD_MID,
                              fontSize: 12,
                              lineHeight: 1.5,
                            }}
                          >
                            {program.blurb}
                          </span>
                          <span
                            style={{
                              color: GOLD_FAINT,
                              fontSize: 10,
                              letterSpacing: '0.16em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {program.durationMinutes} min · {program.chapters.length} chapter
                            {program.chapters.length === 1 ? '' : 's'}
                          </span>
                          <ol
                            style={{
                              margin: '6px 0 0',
                              padding: '8px 0 0 0',
                              borderTop: `1px solid ${GOLD_BORDER_SOFT}`,
                              display: 'grid',
                              gap: 4,
                              listStyle: 'none',
                            }}
                          >
                            {program.chapters.map((chapter, idx) => (
                              <li
                                key={chapter.slug}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '56px 1fr',
                                  gap: 10,
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: 12,
                                  color: GOLD_MID,
                                  lineHeight: 1.4,
                                }}
                              >
                                <span
                                  style={{
                                    color: GOLD_STRONG,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {chapter.number} of {program.chapters.length}
                                </span>
                                <span>{chapter.title}</span>
                              </li>
                            ))}
                          </ol>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

function PageReader({
  page,
  chapterTitle,
  chapterNumber,
  programTitle,
  categoryTitle,
  categoryTint,
  categoryCover,
  pageIndex,
  totalInChapter,
  prevSlug,
  nextSlug,
  onNavigate,
  onBack,
}: {
  page: Page;
  chapterTitle: string;
  chapterNumber: number;
  programTitle: string;
  categoryTitle: string;
  categoryTint: string;
  categoryCover?: string;
  pageIndex: number;
  totalInChapter: number;
  prevSlug: string | null;
  nextSlug: string | null;
  onNavigate: (slug: string) => void;
  onBack: () => void;
}) {
  const tint = categoryTint;
  return (
    <div
      data-testid="page-reader"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(4,2,0,0.6)',
      }}
    >
      <article
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'rgba(10,6,3,0.98)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          fontFamily: 'var(--font-serif)',
        }}
      >
        {/* Header: crumb + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px 10px',
            borderBottom: `1px solid ${tintAlpha(tint, 0.18)}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tintAlpha(tint, 0.7),
              }}
            >
              {categoryTitle} · {programTitle}
            </span>
            <span
              data-testid="chapter-crumb"
              style={{
                fontSize: 12,
                letterSpacing: '0.06em',
                color: tintAlpha(tint, 0.45),
              }}
            >
              Chapter {chapterNumber} · {chapterTitle} · Page {pageIndex + 1} of {totalInChapter}
            </span>
          </div>
          <button
            type="button"
            data-testid="back-to-hub"
            onClick={onBack}
            style={{
              background: 'none',
              border: `1px solid ${tintAlpha(tint, 0.32)}`,
              borderRadius: 999,
              color: tintAlpha(tint, 0.7),
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              letterSpacing: '0.12em',
              cursor: 'pointer',
              padding: '5px 14px',
              textTransform: 'uppercase',
            }}
          >
            close
          </button>
        </div>

        {/* Segment indicator: small numbered pills per page in chapter */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '12px 20px 0',
            flexShrink: 0,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {Array.from({ length: totalInChapter }).map((_, i) => (
            <span
              key={i}
              style={{
                minWidth: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                background: i === pageIndex ? tintAlpha(tint, 0.22) : 'transparent',
                border: `1px solid ${tintAlpha(tint, i === pageIndex ? 0.6 : i < pageIndex ? 0.32 : 0.14)}`,
                color: tintAlpha(tint, i === pageIndex ? 0.95 : i < pageIndex ? 0.6 : 0.32),
                fontSize: 11,
                fontWeight: i === pageIndex ? 700 : 400,
                padding: '0 6px',
                letterSpacing: '0.04em',
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Scrolling content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'clamp(16px, 5vw, 28px) clamp(16px, 5vw, 28px) 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* Optional cover banner — uses category tint */}
          <PageCoverBanner tint={tint} cover={categoryCover} />

          {/* Segment number */}
          <div
            style={{
              fontSize: 10,
              color: tintAlpha(tint, 0.55),
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            Page {pageIndex + 1}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: 700,
              color: CREAM_STRONG,
              lineHeight: 1.22,
              margin: 0,
              letterSpacing: '-0.01em',
              textAlign: 'center',
            }}
          >
            {page.title}
          </h1>

          {/* Tint divider */}
          <div
            style={{
              width: 40,
              height: 2,
              background: tintAlpha(tint, 0.65),
              borderRadius: 2,
              margin: '0 auto',
            }}
          />

          {/* Trust + tag chips */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <TrustBadge
              confidence={page.confidence}
              lastVerified={page.lastVerified}
              sources={page.sources}
              changelog={page.changelog}
            />
            {(page.tags ?? []).map((tag) => (
              <span
                key={tag}
                data-testid={`page-tag-${tag}`}
                style={{
                  border: `1px solid ${tintAlpha(tint, 0.32)}`,
                  borderRadius: 999,
                  background: tintAlpha(tint, 0.12),
                  color: tintAlpha(tint, 0.78),
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  padding: '3px 9px',
                  textTransform: 'uppercase',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* BLUF: stand-out italic gold paragraph */}
          <p
            data-testid="page-bluf"
            style={{
              margin: '4px 0 0',
              color: CREAM,
              fontSize: 17,
              fontStyle: 'italic',
              fontWeight: 600,
              lineHeight: 1.55,
              padding: '12px 16px',
              borderLeft: `3px solid ${tintAlpha(tint, 0.65)}`,
              background: tintAlpha(tint, 0.07),
              borderRadius: '0 8px 8px 0',
            }}
          >
            {page.bluf}
          </p>

          {/* Body: paragraphs in cream serif */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {splitParagraphs(page.body).map((para, i) => (
              <p
                key={i}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  color: CREAM_BODY,
                  lineHeight: 1.85,
                  margin: 0,
                }}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Graph chips: read first / then go */}
          {page.dependsOn.length > 0 && (
            <ChipRow
              label="Read first"
              slugs={page.dependsOn}
              onNavigate={onNavigate}
              testId="depends-on"
              tint={tint}
              dark
            />
          )}
          {page.feedsInto.length > 0 && (
            <ChipRow
              label="Then go"
              slugs={page.feedsInto}
              onNavigate={onNavigate}
              testId="feeds-into"
              tint={tint}
              dark
            />
          )}

          {/* Big "Next" CTA */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
            {nextSlug ? (
              <button
                type="button"
                data-testid="next-page"
                onClick={() => onNavigate(nextSlug)}
                style={tintButton(tint)}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                data-testid="next-page"
                onClick={onBack}
                style={tintButton(tint)}
              >
                Done · back to library
              </button>
            )}
          </div>

          {/* Sources */}
          <section aria-label="Sources" style={{ marginTop: 8 }}>
            <p
              style={{
                margin: 0,
                color: tintAlpha(tint, 0.6),
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              sources
            </p>
            <ol
              style={{
                margin: '8px 0 0',
                padding: '0 0 0 18px',
                color: CREAM_BODY,
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {page.sources.map((source) => (
                <li key={source.ref} style={{ marginBottom: 4 }}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: tintAlpha(tint, 0.92), textDecoration: 'underline' }}
                  >
                    {source.title}
                  </a>{' '}
                  · <span style={{ opacity: 0.7 }}>{source.date}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Footer: prev / next minimal nav */}
        <div
          style={{
            padding:
              'clamp(12px, 4vw, 18px) clamp(16px, 5vw, 24px) max(18px, env(safe-area-inset-bottom, 18px))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            borderTop: `1px solid ${tintAlpha(tint, 0.14)}`,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            data-testid="prev-page"
            disabled={!prevSlug}
            onClick={() => prevSlug && onNavigate(prevSlug)}
            style={tintGhostButton(tint, !prevSlug)}
          >
            ← prev
          </button>
          <span
            style={{
              color: tintAlpha(tint, 0.5),
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {pageIndex + 1} / {totalInChapter}
          </span>
          {nextSlug ? (
            <button
              type="button"
              onClick={() => onNavigate(nextSlug)}
              style={tintGhostButton(tint, false)}
            >
              next →
            </button>
          ) : (
            <button type="button" onClick={onBack} style={tintGhostButton(tint, false)}>
              library →
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function PageCoverBanner({ tint, cover }: { tint: string; cover?: string }) {
  if (cover) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          aspectRatio: '21 / 9',
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(10,6,3,0.85) 100%), url('${cover}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 12,
          marginBottom: 4,
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        aspectRatio: '21 / 9',
        background: `radial-gradient(circle at 70% 40%, ${tint} 0%, ${tint}aa 35%, #0a0603 95%)`,
        borderRadius: 12,
        marginBottom: 4,
      }}
    />
  );
}

const CREAM_STRONG = 'rgba(240,216,152,0.96)';
const CREAM = 'rgba(240,216,152,0.92)';
const CREAM_BODY = 'rgba(240,216,152,0.78)';

function tintAlpha(hex: string, alpha: number): string {
  // Accepts #RRGGBB
  if (!hex.startsWith('#') || hex.length !== 7) return `rgba(180,140,80,${alpha})`;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function tintButton(tint: string): React.CSSProperties {
  return {
    background: tintAlpha(tint, 0.18),
    border: `1px solid ${tintAlpha(tint, 0.55)}`,
    borderRadius: 999,
    padding: '10px 32px',
    fontFamily: 'var(--font-serif)',
    fontSize: 13,
    fontWeight: 600,
    color: tintAlpha(tint, 0.95),
    cursor: 'pointer',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  };
}

function tintGhostButton(tint: string, disabled: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: `1px solid ${tintAlpha(tint, disabled ? 0.12 : 0.32)}`,
    borderRadius: 999,
    padding: '7px 18px',
    fontFamily: 'var(--font-serif)',
    fontSize: 12,
    color: tintAlpha(tint, disabled ? 0.25 : 0.65),
    cursor: disabled ? 'default' : 'pointer',
    letterSpacing: '0.08em',
  };
}

function splitParagraphs(text: string): string[] {
  if (text.includes('\n\n'))
    return text
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);
  const sentences = text.match(/[^.!?]+[.!?]+["']?/g) ?? [text];
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(
      sentences
        .slice(i, i + 2)
        .join(' ')
        .trim(),
    );
  }
  return paras.filter(Boolean);
}

function CategoryCover({ category }: { category: ReturnType<typeof categoriesByTier>[number] }) {
  if (category.cover) {
    // Real photo cover (drop into /public/world/<slug>.webp)
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(18,10,4,0.78) 100%), url('${category.cover}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: `1px solid ${GOLD_BORDER_SOFT}`,
        }}
        aria-hidden="true"
      />
    );
  }

  // Procedural cover — warm gradient on the tint + diagonal sweep + title slug
  const tint = category.tint;
  const dark = '#1a0e05';
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        position: 'relative',
        background: `radial-gradient(circle at 70% 40%, ${tint} 0%, ${tint}aa 35%, ${dark} 95%)`,
        borderBottom: `1px solid ${GOLD_BORDER_SOFT}`,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 180"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.55 }}
      >
        <defs>
          <linearGradient id={`grad-${category.slug}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,238,200,0.5)" />
            <stop offset="1" stopColor="rgba(255,238,200,0)" />
          </linearGradient>
        </defs>
        <path
          d="M -20 130 Q 60 70 160 90 Q 260 110 340 60 L 340 220 L -20 220 Z"
          fill={`url(#grad-${category.slug})`}
        />
        <circle cx="246" cy="56" r="22" fill="rgba(255,238,200,0.32)" />
      </svg>
      <span
        style={{
          position: 'absolute',
          left: 14,
          bottom: 10,
          color: 'rgba(255,238,200,0.86)',
          fontFamily: 'var(--font-serif)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {category.tier}
      </span>
    </div>
  );
}

function ToolPill({
  label,
  onClick,
  testId,
  highlighted = false,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        border: `1px solid ${GOLD_BORDER}`,
        borderRadius: 999,
        background: highlighted
          ? 'linear-gradient(180deg, rgba(180,140,80,0.45), rgba(140,100,40,0.45))'
          : 'rgba(255,238,200,0.06)',
        color: GOLD_STRONG,
        cursor: 'pointer',
        fontFamily: 'var(--font-serif)',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.16em',
        padding: '7px 16px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}

function ChipRow({
  label,
  slugs,
  onNavigate,
  testId,
  tint,
  dark = false,
}: {
  label: string;
  slugs: string[];
  onNavigate: (slug: string) => void;
  testId: string;
  tint?: string;
  dark?: boolean;
}) {
  const labelColor = dark
    ? tint
      ? tintAlpha(tint, 0.6)
      : 'rgba(196,160,96,0.6)'
    : 'rgba(82,58,38,0.66)';
  return (
    <div data-testid={testId} style={{ display: 'grid', gap: 6 }}>
      <p
        style={{
          margin: 0,
          color: labelColor,
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {slugs.map((slug) => {
          const target = locatePage(slug);
          const title = target?.page.title ?? slug;
          const baseStyle: React.CSSProperties = dark
            ? {
                border: `1px solid ${tint ? tintAlpha(tint, 0.32) : 'rgba(180,140,80,0.32)'}`,
                background: target
                  ? tint
                    ? tintAlpha(tint, 0.14)
                    : 'rgba(255,238,200,0.08)'
                  : 'rgba(255,238,200,0.04)',
                color: tint ? tintAlpha(tint, 0.92) : 'rgba(240,216,152,0.86)',
              }
            : {
                border: '1px solid rgba(122,84,56,0.32)',
                background: target ? 'rgba(255,248,231,0.6)' : 'rgba(255,248,231,0.28)',
                color: '#2a1d0e',
              };
          return (
            <button
              key={slug}
              type="button"
              onClick={() => target && onNavigate(slug)}
              style={{
                ...baseStyle,
                borderRadius: 999,
                cursor: target ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                letterSpacing: '0.02em',
                padding: '5px 12px',
              }}
            >
              {title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const smallLabel = {
  margin: 0,
  color: 'rgba(82,58,38,0.66)',
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
};

const hubButtonPrimary = {
  border: '1px solid rgba(122,84,56,0.42)',
  borderRadius: 999,
  background: 'rgba(82,58,38,0.92)',
  color: '#ffe6aa',
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.1em',
  padding: '8px 16px',
  textTransform: 'uppercase' as const,
};

const hubButtonSecondary = {
  ...hubButtonPrimary,
  background: 'rgba(255,248,231,0.78)',
  color: '#2a1d0e',
};

const navButton = {
  border: '1px solid rgba(122,84,56,0.32)',
  borderRadius: 999,
  background: 'rgba(255,248,231,0.7)',
  color: '#2a1d0e',
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  padding: '7px 14px',
  textTransform: 'uppercase' as const,
};
