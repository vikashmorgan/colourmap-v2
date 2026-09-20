'use client';

/*
 * THE FIGURE FOR `lib/branches.ts`.
 *
 * Three branches around a still centre, drawn so that the whole is legible
 * before any part is. The rules it obeys are argued in that file and in
 * `docs/specs/colour-brain.md`; the three that shape this component are:
 *
 *   RECEDE, NEVER DISAPPEAR. Focusing a branch dims the others to a low but
 *   non-zero opacity. A reader who cannot see what they turned away from has
 *   been navigated rather than oriented, and the whole point of an index is
 *   that you can see the shape you are standing in.
 *
 *   ALL TEXT HORIZONTAL. Rotated labels look like a diagram and read like a
 *   chore. If a label does not fit horizontally the layout is wrong, not the
 *   label.
 *
 *   EMPTY IS INFORMATION. Life admin has no surfaces, and the figure says so
 *   in words rather than rendering three identical-looking limbs. A picture
 *   that flatters the app is worth nothing next to one that shows where it is
 *   hollow.
 *
 * WHY THIS IS NOT A PORT OF ColourMesh's LatticeTree.
 *
 * That component is 673 lines and already does whole → focused beautifully,
 * but it is built on that product's demo data layer, mandala types and self
 * model, none of which exist here. What transferred is the reasoning; the
 * geometry is a morning's work in either codebase.
 */

import { useState } from 'react';

import {
  ADMIN_HALF_BLURBS,
  ADMIN_HALF_LABELS,
  type AdminHalf,
  BRANCH_BLURBS,
  BRANCH_HUE,
  BRANCH_LABELS,
  BRANCHES,
  type Branch,
  groupingsIn,
  halvesOf,
  weightOf,
} from '@/lib/branches';

/**
 * How far the unfocused branches fall back.
 *
 * Two forces pull against each other here and both are real.
 *
 * Receding wants this low — a branch you have turned away from should read as
 * background. The first pass used 0.28, which looked right.
 *
 * Accessibility wants it high, and accessibility wins, because these are not
 * decoration: each receded branch is still a BUTTON. At 0.28 its label sits
 * near 1.5:1 against the page and no contrast floor tolerates that on a
 * control. 0.5 is the compromise — visibly stepped back, still legible, still
 * clickable without guessing.
 */
const RECEDED = 0.5;

/** The floor the value above may never drop through. Asserted in the test. */
export const RECEDED_LEGIBILITY_FLOOR = 0.4;

type Props = {
  /** Starts whole. A branch key opens focused, which the tests use. */
  initialFocus?: Branch | null;
};

export default function BranchTree({ initialFocus = null }: Props) {
  const [focus, setFocus] = useState<Branch | null>(initialFocus);

  return (
    <section
      aria-label="The three branches"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 16px 22px',
        borderRadius: 14,
        border: '1px solid var(--panel-border, rgba(122,84,56,0.28))',
        background: 'var(--panel-bg, rgba(255,255,255,0.04))',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          All one brain
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--light-surface-muted, #7A5438)',
          }}
        >
          {focus ? 'The rest is still there.' : 'Three branches, one still centre.'}
        </p>
        {focus && (
          <button
            type="button"
            onClick={() => setFocus(null)}
            style={{
              marginLeft: 'auto',
              padding: '4px 14px',
              borderRadius: 999,
              border: '1px solid var(--panel-border, rgba(122,84,56,0.28))',
              background: 'transparent',
              color: 'var(--light-surface-muted, #7A5438)',
              fontFamily: 'var(--font-serif)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Whole
          </button>
        )}
      </header>

      {/*
       * The centre, stated before the branches rather than drawn between them.
       * Check-in and the notebook are what everything else arranges around, and
       * a row that sits above the three reads as the trunk without needing a
       * literal trunk shape.
       */}
      <p
        style={{
          margin: 0,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--palette-l3-bg, rgba(92,48,24,0.08))',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ fontWeight: 700 }}>How you are</strong>{' '}
        <span style={{ color: 'var(--light-surface-muted, #7A5438)' }}>
          — the check-in, the notebook, the journey. The middle, not a branch.
        </span>
      </p>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        }}
      >
        {BRANCHES.map((branch) => (
          <Limb
            key={branch}
            branch={branch}
            focused={focus === branch}
            receded={focus !== null && focus !== branch}
            onOpen={() => setFocus(focus === branch ? null : branch)}
          />
        ))}
      </div>
    </section>
  );
}

function Limb({
  branch,
  focused,
  receded,
  onOpen,
}: {
  branch: Branch;
  focused: boolean;
  receded: boolean;
  onOpen: () => void;
}) {
  const hue = BRANCH_HUE[branch];
  const halves = halvesOf(branch);

  return (
    <article
      style={{
        opacity: receded ? RECEDED : 1,
        transition: 'opacity 220ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={focused}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          width: '100%',
          minHeight: 44,
          padding: '10px 12px',
          borderRadius: 10,
          /* The tint fills the shape. It never edges one. */
          /*
           * The tint has to survive the paper it sits on. This page is a
           * saturated beige, and the first pass used 8% and 15% alpha — over
           * that ground the fill read as more beige and the little dot was
           * carrying the whole identity of the branch. These values are what
           * it took for the colour to actually arrive.
           */
          background: focused ? `${hue}4a` : `${hue}2b`,
          border: `1px solid ${hue}${focused ? 'aa' : '55'}`,
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-hidden="true"
            style={{ width: 9, height: 9, borderRadius: 999, background: hue }}
          />
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
            {BRANCH_LABELS[branch]}
          </span>
        </span>
        <span
          style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--light-surface-muted, #7A5438)' }}
        >
          {BRANCH_BLURBS[branch]}
        </span>
      </button>

      {focused && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 2 }}>
          {halves.length > 0
            ? halves.map((half) => <Half key={half} branch={branch} half={half} hue={hue} />)
            : groupingsIn(branch).map((group) => (
                <GroupRow key={group.label} label={group.label} count={group.routes.length} />
              ))}
        </div>
      )}
    </article>
  );
}

function Half({ branch, half, hue }: { branch: Branch; half: AdminHalf; hue: string }) {
  const groups = groupingsIn(branch).filter((group) => group.half === half);
  const surfaces = groups.reduce((total, group) => total + group.routes.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: hue,
        }}
      >
        {ADMIN_HALF_LABELS[half]}
      </span>
      <span
        style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--light-surface-muted, #7A5438)' }}
      >
        {ADMIN_HALF_BLURBS[half]}
      </span>
      {groups.map((group) => (
        <GroupRow key={group.label} label={group.label} count={group.routes.length} />
      ))}
      {/*
       * THIS SENTENCE IS MEANT TO STOP BEING TRUE.
       *
       * Life admin is the heaviest part of a real week and has no surface in
       * this app at all. Saying so in the figure is the clearest statement
       * available of what to build next; `lib/branches.test.ts` asserts the
       * same emptiness and will break on the day it ends.
       */}
      {surfaces === 0 && (
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 12.5,
            lineHeight: 1.45,
            fontStyle: 'italic',
            color: 'var(--light-surface-muted, #7A5438)',
          }}
        >
          Nothing here yet — this is where the week actually goes.
        </p>
      )}
    </div>
  );
}

function GroupRow({ label, count }: { label: string; count: number }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12,
          color: 'var(--light-surface-muted, #7A5438)',
        }}
      >
        {count === 0 ? '—' : count}
      </span>
    </span>
  );
}

/**
 * Exported for the test that asserts Art carries more than the other two
 * combined. Keeping the sum here rather than in the test stops the test from
 * quietly re-implementing the thing it is checking.
 */
export function totalSurfaces(): number {
  return BRANCHES.reduce((total, branch) => total + weightOf(branch), 0);
}
