'use client';

/*
 * THE APPS AS A CIRCLE, AND WHAT THE CIRCLE ADMITS.
 *
 * `LatticeTree` draws one life in three branches. This draws the software that
 * life is being built out of, and it is deliberately a different figure —
 * because it answers a different question. A branch says *which part of a life
 * is this*. This says *what leans on what, and how far from real is it*.
 *
 * THREE THINGS IT SAYS AT A GLANCE, AND IT SHOULD SAY NOTHING ELSE
 *
 *   WHERE IT IS      ring position. Live at the centre, sketched at the rim.
 *   WHAT LEANS ON IT node size. Count of dependants, never a judgement of worth.
 *   WHAT IT NEEDS    an arrow, labelled with what actually passes along it.
 *
 * DISTANCE FROM THE MIDDLE IS REACHABILITY, NOT IMPORTANCE.
 *
 * The obvious reading of a circle is that the middle matters most, and that is
 * the wrong idea here. The middle is what a person who is not you could use
 * today. An app at the rim is not less good; it is less real, which is a fact
 * about the world rather than an opinion about the project — and it is the
 * single most useful thing to see when holding four at once.
 *
 * THE ISOLATED NODE IS THE POINT OF THE DRAWING.
 *
 * ColourMesh has no arrow in and no arrow out. Nothing depends on it and it
 * depends on nothing. The figure names that out loud rather than letting it sit
 * there looking like every other dot, because an isolated project is either the
 * next thing to connect or the next thing to stop, and both are decisions.
 */

import { useState } from 'react';

import {
  APPS,
  type App,
  type AppId,
  isolated,
  LINKS,
  leanedOnBy,
  STAGE_LABEL,
  STAGES,
  type Stage,
} from '@/lib/ecosystem';

const S = 340;
const C = S / 2;
/** Room for horizontal labels, which are wider than the drawing. */
const PAD = 66;

/** One ring per stage. Live nearest the middle, sketched at the rim. */
const RADIUS: Record<Stage, number> = {
  live: 42,
  built: 84,
  specified: 122,
  sketched: 156,
};

/**
 * One hue per stage, warm through cool as a thing becomes more real.
 *
 * Not a traffic light. Sketched is not a failure state, so nothing here is red
 * — the palette runs quiet-to-present rather than bad-to-good.
 */
const HUE: Record<Stage, string> = {
  live: '#5f8a6a',
  built: '#c4a060',
  specified: '#8a6a9c',
  sketched: '#9a8f86',
};

function polar(radius: number, angle: number) {
  return { x: C + Math.cos(angle) * radius, y: C + Math.sin(angle) * radius };
}

/**
 * Where each app sits on its ring.
 *
 * Spread evenly within the ring it belongs to, offset so nothing lands on
 * twelve o'clock where the ring labels sit. Same lesson the lattice learned:
 * an opaque label plate deletes what it covers rather than smudging it.
 */
/**
 * Each ring is turned a little further than the one inside it.
 *
 * Without this every ring starts from the same place, and with two apps on
 * most rings that puts nearly everything on the horizontal axis: a flat row of
 * dots with crossing lines and labels sitting on top of each other. The stagger
 * costs nothing and is the difference between a figure and a diagram of one.
 */
const RING_TURN = Math.PI / 5;

export function angleFor(id: AppId): number {
  const app = APPS.find((entry) => entry.id === id);
  if (!app) return 0;

  const peers = APPS.filter((entry) => entry.stage === app.stage);
  const index = peers.findIndex((entry) => entry.id === id);
  const step = (Math.PI * 2) / Math.max(peers.length, 1);
  const turn = STAGES.indexOf(app.stage) * RING_TURN;

  return -Math.PI / 2 + step * index + step / 2 + turn;
}

export default function AppConstellation() {
  const [focus, setFocus] = useState<AppId | null>(null);
  const chosen = APPS.find((entry) => entry.id === focus) ?? null;
  const floating = isolated();

  return (
    <section
      data-testid="app-constellation"
      style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        <Chip selected={focus === null} onClick={() => setFocus(null)}>
          All of it
        </Chip>
        {APPS.map((entry) => (
          <Chip
            key={entry.id}
            hue={HUE[entry.stage]}
            selected={focus === entry.id}
            onClick={() => setFocus(focus === entry.id ? null : entry.id)}
          >
            {entry.name}
          </Chip>
        ))}
      </div>

      <p
        style={{
          margin: 0,
          textAlign: 'center',
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.68,
          minHeight: 36,
        }}
      >
        {chosen
          ? chosen.purpose
          : 'Nearer the middle is nearer to being real. An arrow means one needs the other.'}
      </p>

      <svg
        viewBox={`${-PAD} ${-PAD} ${S + PAD * 2} ${S + PAD * 2}`}
        width="100%"
        role="img"
        aria-label="The apps, placed by how close they are to being real"
        style={{ display: 'block', maxHeight: '50vh' }}
      >
        <title>The apps, placed by how close they are to being real</title>

        {STAGES.map((stage) => (
          <g key={stage}>
            <circle
              cx={C}
              cy={C}
              r={RADIUS[stage]}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            {chosen ? null : (
              <Plate x={C} y={C - RADIUS[stage]} text={STAGE_LABEL[stage]} muted size={9} />
            )}
          </g>
        ))}

        {/*
         * Arrows first, so a node always sits on top of its own lines rather
         * than under them.
         */}
        {LINKS.map((link) => {
          const from = place(link.from);
          const to = place(link.to);
          const lit = focus === null || focus === link.from || focus === link.to;

          return (
            <line
              key={`${link.from}-${link.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="currentColor"
              strokeOpacity={lit ? 0.42 : 0.1}
              strokeWidth={1.2}
              markerEnd="url(#leans)"
              style={{ transition: 'stroke-opacity 280ms ease' }}
            />
          );
        })}

        <defs>
          <marker
            id="leans"
            viewBox="0 0 8 8"
            refX={7}
            refY={4}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" fillOpacity={0.42} />
          </marker>
        </defs>

        {APPS.map((entry) => {
          const at = place(entry.id);
          const dimmed = focus !== null && focus !== entry.id;
          /* Size is a count of dependants. It is never a score. */
          const r = 7 + leanedOnBy(entry.id) * 2.5;

          return (
            // biome-ignore lint/a11y/useSemanticElements: SVG has no native button, and a <button> may not contain SVG shapes here. role + tabIndex + Enter/Space is the standard interactive-region pattern and all three are present; the named chips above are real buttons doing the same thing, so nothing is pointer-only either.
            <g
              key={entry.id}
              role="button"
              tabIndex={0}
              aria-pressed={focus === entry.id}
              aria-label={`${entry.name} — ${STAGE_LABEL[entry.stage]}`}
              onClick={() => setFocus(focus === entry.id ? null : entry.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFocus(focus === entry.id ? null : entry.id);
                }
              }}
              /*
               * 0.45, not lower. These are controls, and the lattice already
               * learned that anything dimmer is invisible to a reader who
               * needs contrast.
               */
              opacity={dimmed ? 0.45 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 280ms ease' }}
            >
              <circle cx={at.x} cy={at.y} r={r} fill={HUE[entry.stage]} />
              <Plate x={at.x} y={at.y - r - 11} text={entry.name} size={10} />
            </g>
          );
        })}
      </svg>

      {chosen ? <Detail app={chosen} /> : <Floating apps={floating} />}
    </section>
  );
}

function place(id: AppId) {
  const app = APPS.find((entry) => entry.id === id);
  return polar(app ? RADIUS[app.stage] : 0, angleFor(id));
}

function Detail({ app }: { app: App }) {
  const needs = LINKS.filter((link) => link.from === app.id);
  const needed = LINKS.filter((link) => link.to === app.id);

  return (
    <div style={{ display: 'grid', gap: 6, fontSize: 12.5, lineHeight: 1.5 }}>
      <p style={{ margin: 0 }}>
        <Label>Next</Label>
        {app.next}
      </p>
      {app.repo ? (
        <p style={{ margin: 0, opacity: 0.7 }}>
          <Label>Repo</Label>
          {app.repo}
        </p>
      ) : (
        <p style={{ margin: 0, opacity: 0.7 }}>
          <Label>Repo</Label>
          none yet
        </p>
      )}
      {needs.map((link) => (
        <p key={`needs-${link.to}`} style={{ margin: 0, opacity: 0.7 }}>
          <Label>Needs</Label>
          {link.carries}
        </p>
      ))}
      {needed.map((link) => (
        <p key={`feeds-${link.from}`} style={{ margin: 0, opacity: 0.7 }}>
          <Label>Feeds</Label>
          {link.carries}
        </p>
      ))}
    </div>
  );
}

/**
 * What is floating, said in words.
 *
 * The figure can show an unconnected dot, but a dot is easy to look past. An
 * isolated project is either the next thing to connect or the next thing to
 * stop, and both are decisions worth being made rather than drifted into.
 */
function Floating({ apps }: { apps: App[] }) {
  if (apps.length === 0) return null;

  return (
    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, opacity: 0.72 }}>
      <Label>Floating</Label>
      {apps.map((app) => app.name).join(', ')} — nothing depends on{' '}
      {apps.length === 1 ? 'it' : 'them'} and {apps.length === 1 ? 'it depends' : 'they depend'} on
      nothing.
    </p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        opacity: 0.6,
        marginRight: 7,
      }}
    >
      {children}
    </span>
  );
}

function Plate({
  x,
  y,
  text,
  muted,
  size = 10,
}: {
  x: number;
  y: number;
  text: string;
  muted?: boolean;
  size?: number;
}) {
  const width = (text.length + 1) * size * 0.58;

  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - size * 0.8}
        width={width}
        height={size * 1.45}
        rx={size * 0.7}
        fill="var(--background)"
      />
      <text
        x={x}
        y={y + size * 0.3}
        textAnchor="middle"
        fontSize={size}
        fill="currentColor"
        fillOpacity={muted ? 0.58 : 0.92}
      >
        {text}
      </text>
    </g>
  );
}

function Chip({
  children,
  selected,
  hue,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  hue?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        minHeight: 30,
        padding: '5px 11px',
        borderRadius: 999,
        border: `1px solid ${selected ? (hue ?? 'currentColor') : 'var(--border)'}`,
        background: selected && hue ? `${hue}33` : 'transparent',
        color: 'inherit',
        fontSize: 12,
        fontWeight: selected ? 700 : 500,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
