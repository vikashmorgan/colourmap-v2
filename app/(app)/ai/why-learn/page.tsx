import type { Metadata } from 'next';
import Link from 'next/link';

import { WHY_LEARN_LINE, WHY_LEARN_NOTES, WHY_LEARN_TITLE } from '@/lib/ai/why-learn';

export const metadata: Metadata = { title: WHY_LEARN_TITLE };

/*
 * Why learn the real tools: the owner's notes on challenging AI rather than
 * trusting it, opened from the AI tab. The notes live in lib/ai/why-learn.ts.
 */
export default function WhyLearnPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <p className="px-1 text-sm">
        <Link href="/ai" style={{ color: 'var(--ai-surface-muted, #7A5438)' }}>
          ← AI
        </Link>
      </p>
      <section
        className="border px-5 py-6 sm:px-8"
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
          Notes
        </p>
        <h1
          className="mt-2 text-3xl font-semibold sm:text-4xl"
          style={{ color: 'var(--palette-panel-text, #5C3018)', fontFamily: 'var(--font-serif)' }}
        >
          {WHY_LEARN_TITLE}
        </h1>
        <p
          className="mt-3 text-base leading-7"
          style={{ color: 'var(--palette-panel-muted, #7A5438)' }}
        >
          {WHY_LEARN_LINE}
        </p>
      </section>

      <ol className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {WHY_LEARN_NOTES.map((note, i) => (
          <li
            key={note.id}
            className="border px-5 py-4"
            style={{
              borderColor: 'var(--ai-surface-border, var(--panel-border, rgba(122,84,56,0.2)))',
              background: 'var(--ai-surface-raised, rgba(255,248,224,0.62))',
              borderRadius: 8,
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--ai-surface-muted, rgba(122,84,56,0.5))' }}
            >
              {String(i + 1).padStart(2, '0')}
            </p>
            <h2
              className="mt-1 text-xl font-semibold"
              style={{ color: 'var(--ai-surface-text, #5C3018)', fontFamily: 'var(--font-serif)' }}
            >
              {note.title}
            </h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: 'var(--ai-surface-muted, #6F5138)' }}
            >
              {note.body}
            </p>
          </li>
        ))}
      </ol>

      <p className="px-2 text-center text-sm" style={{ color: 'var(--ai-surface-muted, #7A5438)' }}>
        Start with the real tools:{' '}
        <a href="/coding" style={{ color: 'var(--ai-surface-text, #5C3018)', fontWeight: 600 }}>
          the Coding course →
        </a>
      </p>
    </main>
  );
}
