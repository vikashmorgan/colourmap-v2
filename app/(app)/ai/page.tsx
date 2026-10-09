import Link from 'next/link';

const AI_SECTIONS = [
  {
    title: 'Talk now',
    label: 'Quick assistant',
    body: 'Drop one fragment, question, or stuck feeling. Best for the moment you are in.',
    availability: 'Free daily use',
  },
  {
    title: 'Review patterns',
    label: 'Longer mirror',
    body: 'Read the week across check-ins, missions, notes, and repeated tensions.',
    availability: 'Paid depth',
  },
  {
    title: 'Saved reflections',
    label: 'Memory',
    body: 'Keep the reflections that feel true, so they become part of the long-term archive.',
    availability: 'Limited free',
  },
] as const;

export default function AIPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <section
        className="border px-5 py-6 text-center sm:px-8"
        style={{
          borderColor: 'var(--panel-border, rgba(122,84,56,0.22))',
          background: 'var(--ai-surface-bg, rgba(251,243,216,0.72))',
          borderRadius: 8,
          boxShadow: 'var(--ai-surface-shadow, 0 18px 44px rgba(92,48,24,0.16))',
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--ai-surface-muted, rgba(92,48,24,0.52))' }}
        >
          Inner AI
        </p>
        <h1
          className="mt-2 text-3xl font-semibold sm:text-4xl"
          style={{
            color: 'var(--palette-panel-text, #5C3018)',
            fontFamily: 'var(--font-serif)',
            letterSpacing: 0,
          }}
        >
          Ask what matters.
        </h1>
        <p
          className="mx-auto mt-3 max-w-xl text-sm leading-6"
          style={{ color: 'var(--palette-panel-muted, #7A5438)' }}
        >
          A small mirror for the process.
        </p>
      </section>

      <section className="space-y-3">
        {AI_SECTIONS.map((section) => (
          <article
            key={section.title}
            className="border px-5 py-4"
            style={{
              borderColor: 'var(--ai-surface-border, var(--panel-border, rgba(122,84,56,0.2)))',
              background: 'var(--ai-surface-raised, rgba(255,248,224,0.62))',
              borderRadius: 8,
              boxShadow: 'var(--ai-surface-shadow, 0 18px 44px rgba(92,48,24,0.16))',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: 'var(--ai-surface-muted, rgba(122,84,56,0.5))' }}
                >
                  {section.label}
                </p>
                <h2
                  className="mt-1 text-xl font-semibold"
                  style={{
                    color: 'var(--ai-surface-text, #5C3018)',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {section.title}
                </h2>
              </div>
              <span
                className="border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{
                  borderColor: 'var(--ai-surface-accent, rgba(196,160,96,0.36))',
                  color: 'var(--ai-surface-text, #7A5438)',
                  borderRadius: 999,
                }}
              >
                {section.availability}
              </span>
            </div>
            <p
              className="mt-3 text-sm leading-6"
              style={{ color: 'var(--ai-surface-muted, #6F5138)' }}
            >
              {section.body}
            </p>
          </article>
        ))}
      </section>

      {/* Notes on challenging AI rather than trusting it: why the real tools still matter. */}
      <Link
        href="/ai/why-learn"
        className="block border px-5 py-4"
        style={{
          borderColor: 'var(--ai-surface-accent, rgba(196,160,96,0.5))',
          background: 'var(--ai-surface-raised, rgba(255,248,224,0.62))',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: 'var(--ai-surface-muted, rgba(122,84,56,0.5))' }}
        >
          Notes
        </p>
        <h2
          className="mt-1 text-xl font-semibold"
          style={{ color: 'var(--ai-surface-text, #5C3018)', fontFamily: 'var(--font-serif)' }}
        >
          Why learn the real tools →
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ai-surface-muted, #6F5138)' }}>
          AI made mediocrity cheaper. Its assumptions add up. The art is to check and challenge the
          code, so we learn coding, SQL and the rest.
        </p>
      </Link>

      <p
        className="px-2 text-center text-xs leading-5"
        style={{ color: 'var(--ai-surface-muted, rgba(122,84,56,0.58))' }}
      >
        The AI should read only the scope you choose. Small reflections can be free; deeper pattern
        reading is the paid layer because it uses Claude API tokens.
      </p>
    </main>
  );
}
