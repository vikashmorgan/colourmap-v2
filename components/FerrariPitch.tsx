import type { CSSProperties, ReactNode } from 'react';

import {
  FERRARI_AVOID,
  FERRARI_CONTEXT,
  FERRARI_DINO,
  FERRARI_PROJECT,
  FERRARI_QUESTIONS,
  FERRARI_QUOTES,
  FERRARI_SECTIONS,
  FERRARI_THESIS,
  FERRARI_TODO,
  FERRARI_WORDS,
} from '@/lib/proposals/ferrari';

/*
 * The Ferrari pitch, as a page to work on: cream paper, deep ink, and one
 * touch of Ferrari red for the through-line. Words live in lib/proposals/ferrari.ts.
 */

const CREAM = '#FBF5E6';
const PAPER = '#FFFBF1';
const INK = '#2B2118';
const MUTED = '#7A6A55';
const LINE = 'rgba(43,33,24,0.14)';
const RED = '#B0161E';

const label: CSSProperties = {
  margin: 0,
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: MUTED,
};

const card: CSSProperties = {
  background: PAPER,
  border: `1px solid ${LINE}`,
  borderRadius: 14,
  padding: 'clamp(16px, 3vw, 26px)',
};

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <p style={label}>{kicker}</p>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(22px, 3.4vw, 30px)',
          color: INK,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function FerrariPitch() {
  return (
    <main
      data-testid="ferrari-pitch"
      style={{
        minHeight: '100svh',
        background: CREAM,
        color: INK,
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(18px, 4vw, 56px) clamp(14px, 6vw, 64px) 96px',
      }}
    >
      <div
        style={{
          maxWidth: 880,
          marginInline: 'auto',
          display: 'grid',
          gap: 'clamp(32px, 5vw, 56px)',
        }}
      >
        <header
          style={{ display: 'grid', gap: 10, borderBottom: `1px solid ${LINE}`, paddingBottom: 22 }}
        >
          <p style={label}>Pitch · Ferrari · draft</p>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(34px, 6vw, 58px)',
              lineHeight: 1.05,
            }}
          >
            Technique and spirit
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(17px, 2.2vw, 21px)',
              lineHeight: 1.5,
              maxWidth: '40ch',
            }}
          >
            {FERRARI_THESIS}
          </p>
          <p style={{ margin: '6px 0 0', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {FERRARI_WORDS.map((w, i) => (
              <span
                key={w}
                style={{
                  fontSize: 13,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: i === 2 ? RED : INK,
                  fontWeight: 600,
                }}
              >
                {w}
              </span>
            ))}
          </p>
        </header>

        <Section kicker="Context" title="Why now">
          {FERRARI_CONTEXT.map((p) => (
            <p key={p} style={{ margin: 0, fontSize: 17, lineHeight: 1.6, maxWidth: '62ch' }}>
              {p}
            </p>
          ))}
        </Section>

        <Section kicker="Structure" title="Six movements">
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {FERRARI_SECTIONS.map((s) => (
              <li key={s.n} style={card}>
                <p style={{ ...label, color: s.n === 3 ? RED : MUTED }}>
                  {String(s.n).padStart(2, '0')} · {s.question}
                </p>
                <h3 style={{ margin: '4px 0 8px', fontFamily: 'var(--font-serif)', fontSize: 21 }}>
                  {s.title}
                </h3>
                {s.body.map((b) => (
                  <p
                    key={b}
                    style={{ margin: '0 0 6px', fontSize: 15.5, lineHeight: 1.6, color: INK }}
                  >
                    {b}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </Section>

        <Section kicker="Section 5 · the project" title={FERRARI_PROJECT.title}>
          <div style={{ ...card, display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 16, color: MUTED }}>{FERRARI_PROJECT.line}</p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{FERRARI_PROJECT.why}</p>
            <ol
              aria-label="From image to gallery"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              {FERRARI_PROJECT.steps.map((step, i) => (
                <li
                  key={step}
                  style={{
                    fontSize: 13,
                    padding: '5px 12px',
                    borderRadius: 99,
                    border: `1px solid ${LINE}`,
                    background: CREAM,
                  }}
                >
                  {i + 1}. {step}
                </li>
              ))}
            </ol>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: MUTED }}>
              {FERRARI_PROJECT.aim}
            </p>
            <a href={FERRARI_PROJECT.link} style={{ color: RED, fontSize: 14, fontWeight: 600 }}>
              See the collection →
            </a>
          </div>
        </Section>

        <Section kicker="Section 3 · the emotional centre" title="Dino">
          <p style={{ ...card, margin: 0, fontSize: 16, lineHeight: 1.65 }}>{FERRARI_DINO}</p>
        </Section>

        <Section kicker="Section 6" title="Questions for the discussion">
          <ol
            style={{
              margin: 0,
              paddingLeft: 22,
              display: 'grid',
              gap: 8,
              fontSize: 16,
              lineHeight: 1.55,
            }}
          >
            {FERRARI_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Section>

        <Section kicker="Enzo Ferrari" title="Quotes to weave in">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {FERRARI_QUOTES.map((q) => (
              <li key={q.text} style={{ ...card, padding: '14px 18px' }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-serif)',
                    fontSize: 19,
                    lineHeight: 1.4,
                  }}
                >
                  “{q.text}”
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED }}>{q.use}</p>
              </li>
            ))}
          </ul>
          <p style={{ margin: 0, fontSize: 13.5, color: MUTED }}>
            Widely attributed; check the wording against his memoir <em>Le mie gioie terribili</em>{' '}
            (1962) before printing. Avoid “{FERRARI_AVOID}”, often credited to him but believed to
            be misattributed.
          </p>
        </Section>

        <Section kicker="Before it goes in" title="To finish">
          <ul
            style={{
              ...card,
              margin: 0,
              display: 'grid',
              gap: 8,
              paddingLeft: 38,
              fontSize: 15.5,
              lineHeight: 1.5,
            }}
          >
            {FERRARI_TODO.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>

        <footer style={{ borderTop: `1px solid ${LINE}`, paddingTop: 18 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.5 }}>
            {FERRARI_THESIS}
          </p>
        </footer>
      </div>
    </main>
  );
}
