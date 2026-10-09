import type { Metadata } from 'next';

import { collectionBySlug, driveThumbnail, driveView } from '@/lib/art/collections';

/*
 * The space for the AI Sculptures · Flow collection, opened from the Art
 * branch of the tree. The pictures are shown from the owner's Google Drive (see
 * lib/art/collections.ts), so they stay private and the folder stays the place
 * where the collection is kept and added to.
 */

const flow = collectionBySlug('flow');

export const metadata: Metadata = { title: flow?.title ?? 'Collection' };

const INK = '#5C3018';
const MUTED = '#8A6A4A';

export default function FlowCollectionPage() {
  if (!flow) return null;
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 16px 120px', color: INK }}>
      <header style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Art · Collection
        </p>
        <h1
          style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 44px)' }}
        >
          {flow.title}
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: MUTED, maxWidth: '60ch' }}>{flow.line}</p>
        {flow.aim?.map((sentence) => (
          <p key={sentence} style={{ margin: 0, fontSize: 16, maxWidth: '64ch', lineHeight: 1.5 }}>
            {sentence}
          </p>
        ))}
        {flow.steps && (
          <ol
            aria-label="From image to delivered piece"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              listStyle: 'none',
              padding: 0,
              margin: '6px 0',
            }}
          >
            {flow.steps.map((step, i) => (
              <li
                key={step}
                style={{
                  fontSize: 13,
                  padding: '5px 12px',
                  borderRadius: 99,
                  border: `1px solid rgba(92,48,24,0.25)`,
                  background: 'rgba(92,48,24,0.05)',
                }}
              >
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        )}
        <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
          {flow.images.length} pictures ·{' '}
          <a href={flow.driveFolderUrl} target="_blank" rel="noreferrer" style={{ color: INK }}>
            Open the folder in Drive ↗
          </a>
        </p>
      </header>

      <div style={{ columns: '260px auto', columnGap: 12 }}>
        {flow.images.map((image) => (
          <a
            key={image.id}
            href={driveView(image.id)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', marginBottom: 12, breakInside: 'avoid' }}
          >
            {/* Drive serves these to the signed-in owner only; next/image cannot fetch them. */}
            <img
              src={driveThumbnail(image.id, 900)}
              alt={`${flow.title}: ${image.title}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                borderRadius: 12,
                background: 'rgba(92,48,24,0.06)',
                minHeight: 120,
              }}
            />
          </a>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: MUTED }}>
        The pictures load from your Google Drive, so they show when this browser is signed in to
        your Google account. Add new pieces to the Drive folder.
      </p>
    </main>
  );
}
