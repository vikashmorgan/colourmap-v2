'use client';

/*
 * GALLERY SPACE — the notebook for the 3D digital gallery of Victor's art,
 * asked for 2026-10-15: "one notebook has explanations on how far along we
 * are for the digital gallery, inside an open-closable tab; another
 * open-closable tab on how to do the marketing and views." Two panels, each
 * opened and closed on its own; Victor's own notes follow below them, as in
 * any notebook. Update PROGRESS as the gallery is built.
 */

type Step = { label: string; done: boolean; note?: string };

/** Where the digital gallery stands. Tick a step when it is done. */
export const PROGRESS: { phase: string; steps: Step[] }[] = [
  {
    phase: '1 · The pieces in 3D',
    steps: [
      {
        label: 'Golden God, Kid Lotus and Spirit exist as 3D models (OBJ)',
        done: true,
        note: 'OneDrive · BLENDER/PROJECTS/OBJECTS',
      },
      { label: 'Clean each in Blender: scale, centre, lighter mesh', done: false },
      { label: 'Export as GLB, the format for the web', done: false },
      { label: 'Scan or generate more pieces (Polycam, RealityScan, Meshy)', done: false },
    ],
  },
  {
    phase: '2 · The space',
    steps: [
      { label: 'Choose the feel: white cube, golden temple or dark space of light', done: false },
      { label: 'First room: walkable on phone and laptop, three plinths', done: false },
      { label: 'A card for each piece: title, story, materials, enquire', done: false },
      { label: 'Pick up and turn a piece; soft spotlights', done: false },
    ],
  },
  {
    phase: '3 · Going further',
    steps: [
      { label: 'See it in your room (AR on the phone)', done: false },
      { label: 'A room per collection (Flow, Golden …) and sound', done: false },
      { label: 'VR headset (WebXR)', done: false },
      { label: 'Live at its own link', done: false },
    ],
  },
];

/** How to bring people in, and count them. */
export const MARKETING: { title: string; points: string[] }[] = [
  {
    title: 'Before the opening',
    points: [
      'Film the making: Blender turntables, scans, prints. Short reels, 10 to 20 seconds.',
      'A waiting list: one email field on the gallery link, "be there at the opening".',
      'Tell collectors and friends first, personally, with a private preview.',
    ],
  },
  {
    title: 'The opening',
    points: [
      'A date and an hour, like a real vernissage: a live walk-through, you guiding.',
      'One reel of the walk-through, with music from your Chill Machine.',
      'Send it to art and design pages, 3D and AI art communities, and the press list.',
    ],
  },
  {
    title: 'Keep it alive',
    points: [
      'A new piece or a new room every month, each a reason to post again.',
      'The AR "see it in your room" clip: people placing your work at home. Ask them to share it.',
      "Collaborations: a room for another artist, or a brand (the Ferrari pitch's immersive museum idea).",
    ],
  },
  {
    title: 'Counting the views',
    points: [
      'Visits, time spent, and which pieces people stop at (Vercel Analytics, built into the hosting).',
      'Where visitors come from: which posts and links bring them.',
      'Enquiries per month: the number that matters most.',
    ],
  },
];

function Panel({
  title,
  color,
  defaultOpen,
  children,
}: {
  title: string;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl"
      style={{ border: `1px solid ${color}30`, background: `${color}08`, padding: '12px 16px' }}
    >
      <summary className="cursor-pointer select-none text-sm font-semibold" style={{ color }}>
        {title}
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm" style={{ color: '#5A4636' }}>
        {children}
      </div>
    </details>
  );
}

export function GallerySpace({ color = '#7A8AA0' }: { color?: string }) {
  const steps = PROGRESS.flatMap((p) => p.steps);
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="mb-4 flex flex-col gap-3" aria-label="The digital gallery">
      <Panel
        title={`How far along the digital gallery is · ${done} of ${steps.length}`}
        color={color}
        defaultOpen
      >
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: `${color}20` }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${(done / steps.length) * 100}%`, background: color }}
          />
        </div>
        {PROGRESS.map((p) => (
          <div key={p.phase}>
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: `${color}` }}
            >
              {p.phase}
            </p>
            <ul className="flex flex-col gap-1">
              {p.steps.map((s) => (
                <li key={s.label} className="flex items-start gap-2">
                  <span aria-hidden style={{ color: s.done ? '#7A8A50' : `${color}70` }}>
                    {s.done ? '✓' : '○'}
                  </span>
                  <span style={{ opacity: s.done ? 1 : 0.85 }}>
                    {s.label}
                    {s.note && <span style={{ opacity: 0.55 }}> · {s.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Panel>
      <Panel title="How to market it and get views" color={color}>
        {MARKETING.map((m) => (
          <div key={m.title}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
              {m.title}
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {m.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>
        ))}
      </Panel>
    </section>
  );
}

/*
 * PHILOSOPHY — the statement behind the work, in Victor's words (2026-10-15),
 * in its own panel that opens and closes; his notes follow below it.
 */
export const STATEMENT = [
  'Making it is statistically impossible.',
  'Logically irrational.',
  'Profoundly irresponsible.',
  'Stupid. Dangerous. Naive.',
  '… and yet we cannot escape the act of dreaming.',
  'The quest for a better tomorrow seems to be a program in my brain.',
];

export function ArtPhilosophy({ color = '#9B6BA0' }: { color?: string }) {
  return (
    <section className="mb-4" aria-label="Philosophy">
      <Panel title="Philosophy" color={color} defaultOpen>
        <div
          className="flex flex-col gap-1"
          style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6 }}
        >
          {STATEMENT.map((line, i) => (
            <p
              key={line}
              style={{ marginTop: i === 4 ? 10 : 0, fontStyle: i >= 4 ? 'italic' : 'normal' }}
            >
              {line}
            </p>
          ))}
        </div>
      </Panel>
    </section>
  );
}
