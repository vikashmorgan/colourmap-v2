'use client';

/*
 * THE LATTICE, AS A THING YOU CAN STAND INSIDE.
 *
 * Ported from ColourMesh's `components/graphics/LatticeTree.tsx` — the most
 * developed figure in either codebase. What came across is the drawing: three
 * named rings, branches that fan open into categories and then into specific
 * things, scale-and-fade rather than rotation, every label level, plates of
 * page colour so a name never sits across a line.
 *
 * What did NOT come across is that product's chrome — the vision line, the
 * customise bench, the people counts, the self model. Those were the reason
 * `docs/specs/colour-brain.md` said not to port the file, and that reasoning
 * was right about the chrome and wrong about the figure. The figure eats one
 * plain structure, centre → branch → category → specific thing, and that is
 * already Colour Brain's own shape. See `lib/to-mandala.ts`.
 *
 * WHY THE OTHERS RECEDE INSTEAD OF VANISHING
 *
 * A reader who cannot see what they turned away from has been navigated, not
 * oriented. Keeping the rest faintly present makes the movement feel like
 * stepping closer rather than loading a different page.
 *
 * ALL TEXT IS HORIZONTAL. NO EXCEPTIONS.
 *
 * The original's first version set branch names along the arc, rotated to the
 * circle. It looked like a seal and could not be read: text tilted past about
 * 20° forces the head or the phone to turn, and half a radial layout is
 * upside-down by construction.
 *
 * SCALE AND CONTRAST, NEVER ROTATION.
 *
 * The obvious way to bring a branch forward is to swing it to the top. It
 * cannot be done here — rotating the group rotates the labels inside it, and a
 * branch that arrives at the front unreadable has not come forward.
 */

import { useState } from 'react';

import { BRANCH_BLURBS, BRANCH_HUE, type Branch } from '@/lib/branches';
import { type BrainMandala, type SectorNode, toMandala, wedgeLabel } from '@/lib/to-mandala';

const S = 400;
const C = S / 2;
/** Room for horizontal labels, which are wider than the drawing they sit on. */
const PAD = 74;

const RINGS = [
  { radius: 70, name: 'Part of life' },
  { radius: 118, name: 'Kind of thing' },
  { radius: 164, name: 'The specific thing' },
];

/**
 * How far an unfocused branch falls back.
 *
 * ColourMesh uses 0.16, which is right there because its branches are pure
 * drawing. Here the whole limb is a keyboard-reachable control, and a control
 * at 0.16 is invisible to anyone who needs contrast. 0.4 is the floor that
 * keeps it recognisably stepped back and still legible.
 */
const RECEDED = 0.4;

function polar(radius: number, angle: number) {
  return { x: C + Math.cos(angle) * radius, y: C + Math.sin(angle) * radius };
}

/**
 * One branch hue, nudged a few degrees per category.
 *
 * Closed, a branch is one colour, because a branch is one thing. Open, its
 * categories become variations of that same hue rather than colours of their
 * own — ColourMesh learned this the hard way: drawn in independent colours, a
 * branch stopped looking like one thing the instant it opened.
 */
function nudge(hex: string, steps: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + steps * 9 + 360) % 360;

  return `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;
}

/**
 * A level label on a plate of page colour.
 *
 * The plate is opaque on purpose, and that is not a substitute for placing:
 * an opaque box hides whatever it lands on, so two colliding plates mean one
 * name is simply gone rather than smudged. Silently losing a label is worse
 * than overlapping one.
 */
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
  const width = (text.length + 1) * size * 0.6;

  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - size * 0.82}
        width={width}
        height={size * 1.5}
        rx={size * 0.7}
        fill="var(--background)"
      />
      <text
        x={x}
        y={y + size * 0.3}
        textAnchor="middle"
        fontSize={size}
        fill="currentColor"
        fillOpacity={muted ? 0.6 : 0.95}
      >
        {text}
      </text>
    </g>
  );
}

export default function LatticeTree({ mandala = toMandala() }: { mandala?: BrainMandala }) {
  const [focused, setFocused] = useState<Branch | null>(null);
  const sectors = mandala.sectors;
  const chosen = sectors.find((sector) => sector.branch === focused) ?? null;

  /**
   * Even spacing, offset by half a sector so nothing lands on twelve o'clock.
   *
   * The three ring names are stacked up the vertical axis, which is the only
   * place they can go and stay level. Starting the branches at -90° put Art
   * exactly on top of all three, and the opaque plates then hid the branch —
   * a label plate does not smudge what it lands on, it deletes it.
   *
   * ColourMesh never hit this because five sectors and three rings happen to
   * miss each other. Three sectors do not. Half a sector of rotation clears
   * the axis and costs nothing: the branches are still evenly spaced peers.
   */
  const sectorArc = (Math.PI * 2) / Math.max(sectors.length, 1);
  const angleOf = (index: number) => -Math.PI / 2 + sectorArc * index + sectorArc / 2;

  const said = (n: number) => `${n} ${n === 1 ? 'thing' : 'things'}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      {/*
       * The named chips are the REAL controls. An SVG group cannot be a native
       * button, so the drawing is a pointer convenience and these carry the
       * keyboard. Nothing here is pointer-only.
       */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        <Chip selected={focused === null} onClick={() => setFocused(null)}>
          The whole tree
        </Chip>
        {sectors.map((sector) => (
          <Chip
            key={sector.branch}
            hue={BRANCH_HUE[sector.branch]}
            selected={focused === sector.branch}
            onClick={() => setFocused(focused === sector.branch ? null : sector.branch)}
          >
            {sector.label}
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
          minHeight: 34,
        }}
      >
        {chosen
          ? BRANCH_BLURBS[chosen.branch]
          : 'Three parts of a life around one centre. Press a branch to bring it forward.'}
      </p>

      <svg
        viewBox={`${-PAD} ${-PAD} ${S + PAD * 2} ${S + PAD * 2}`}
        width="100%"
        role="img"
        aria-label={
          chosen
            ? `${chosen.label}, brought forward — ${said(chosen.count)}`
            : `The whole tree — ${said(mandala.surfaces)} across ${sectors.length} parts of a life`
        }
        style={{ display: 'block', height: 'auto', maxHeight: '54vh' }}
      >
        <title>{chosen ? `${chosen.label}, brought forward` : 'The whole tree'}</title>

        {/* The rings, named once each, horizontally, on the vertical axis. */}
        {RINGS.map((ring) => (
          <g key={ring.radius}>
            <circle
              cx={C}
              cy={C}
              r={ring.radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.14}
              strokeWidth={1}
            />
            {chosen ? null : <Plate x={C} y={C - ring.radius} text={ring.name} muted size={9.5} />}
          </g>
        ))}

        {sectors.map((sector, index) => {
          const isChosen = chosen?.branch === sector.branch;
          const dimmed = chosen !== null && !isChosen;

          return (
            <g
              key={sector.branch}
              style={{
                transformOrigin: `${C}px ${C}px`,
                transform: isChosen ? 'scale(1.16)' : undefined,
                opacity: dimmed ? RECEDED : 1,
                transition: 'transform 420ms ease, opacity 420ms ease',
              }}
            >
              <BranchGroup
                sector={sector}
                angle={angleOf(index)}
                expanded={isChosen}
                quiet={dimmed}
                spread={sectorArc}
                onOpen={() => setFocused(isChosen ? null : sector.branch)}
              />
            </g>
          );
        })}

        {/*
         * THE MIDDLE OF YOUR OWN TREE IS NOT A HEADCOUNT.
         *
         * ColourMesh's centre holds the community's size, which is the honest
         * answer there. On a drawing of somebody's own life a tally sits
         * exactly where the reader should be, answering a question nobody
         * standing in front of their own tree is asking. So this holds the
         * reader instead.
         */}
        <circle cx={C} cy={C} r={22} fill="currentColor" fillOpacity={0.07} />
        <text
          x={C}
          y={C + 4}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="currentColor"
          fillOpacity={0.62}
          style={{ letterSpacing: '0.08em' }}
        >
          YOU
        </text>
      </svg>
    </div>
  );
}

function BranchGroup({
  sector,
  angle,
  expanded,
  quiet,
  spread,
  onOpen,
}: {
  sector: SectorNode;
  angle: number;
  expanded: boolean;
  quiet: boolean;
  spread: number;
  onOpen: () => void;
}) {
  const hub = polar(RINGS[0].radius, angle);
  /*
   * Past the outermost ring, where nothing else is drawn — except once the
   * branch opens, when its own leaf labels arrive at exactly that radius. So
   * the name steps further out when expanded rather than fighting them.
   */
  const outer = polar(RINGS[2].radius + (expanded ? 52 : 26), angle);
  const hue = BRANCH_HUE[sector.branch];

  return (
    <g onClick={onOpen} style={{ cursor: 'pointer' }}>
      {/*
       * ONE COLOUR FOR A WHOLE BRANCH, UNTIL IT IS OPENED. Drawn in its
       * categories' colours, a branch reads as several separate things that
       * happen to sit near each other. Given one colour it reads as one thing.
       */}
      <circle cx={hub.x} cy={hub.y} r={9} fill={hue} />

      {/*
       * The name sits on the OUTER rim, past everything the branch draws, not
       * tucked beside its hub. Inside, the labels crowd the middle where the
       * lines are densest; outside they sit in empty space at a constant
       * radius, and the figure reads from its edge inwards — which is the
       * direction a reader scans a circle.
       */}
      {quiet ? null : <Plate x={outer.x} y={outer.y} text={`${sector.label} ${sector.count}`} />}

      {sector.wedges.map((wedge, index) => {
        const fan = sector.wedges.length === 1 ? 0 : index / (sector.wedges.length - 1) - 0.5;
        /* Categories fan wider once the branch is forward, so labels stop colliding. */
        const at = polar(RINGS[1].radius, angle + fan * spread * (expanded ? 0.92 : 0.62));
        const tone = nudge(hue, expanded ? index - (sector.wedges.length - 1) / 2 : 0);

        return (
          <g key={wedge.category}>
            <line
              x1={hub.x}
              y1={hub.y}
              x2={at.x}
              y2={at.y}
              stroke={tone}
              strokeWidth={1.5}
              opacity={0.8}
            />
            {/*
             * A grouping with nothing behind it draws as a ring rather than a
             * disc. Open Admin and Life admin is three hollow circles — the
             * heaviest part of a real week with no code behind it. The geometry
             * says so before any sentence does.
             */}
            <circle
              cx={at.x}
              cy={at.y}
              r={4 + Math.min(wedge.count, 9) * 0.6}
              fill={wedge.count > 0 ? tone : 'none'}
              stroke={tone}
              strokeWidth={wedge.count > 0 ? 0 : 1.4}
            />

            {expanded ? (
              <>
                <Plate x={at.x} y={at.y - 16} text={wedgeLabel(wedge)} />

                {wedge.leaves.slice(0, 4).map((leaf, leafIndex) => {
                  const leafFan =
                    wedge.leaves.length === 1
                      ? 0
                      : leafIndex / Math.min(wedge.leaves.length, 4) - 0.36;
                  /*
                   * THE LEAF FAN HAD TO OPEN MUCH WIDER HERE.
                   *
                   * ColourMesh fans its leaves across 0.2 of a sector, which
                   * works when a sector is a fifth of the circle and the labels
                   * are short interest names. This has three sectors, so a
                   * sector is 120°, and the labels are route names — "Figure
                   * stars trio" is seventeen characters. At 0.2 the plates
                   * landed on each other, and an opaque plate does not smudge
                   * what it covers, it deletes it.
                   */
                  const tip = polar(
                    RINGS[2].radius,
                    angle + fan * spread * 0.92 + leafFan * spread * 0.42,
                  );
                  /* Alternating the label side buys a second row of clearance. */
                  const lift = leafIndex % 2 === 0 ? -12 : 15;

                  return (
                    <g key={leaf.slug}>
                      <line
                        x1={at.x}
                        y1={at.y}
                        x2={tip.x}
                        y2={tip.y}
                        stroke={tone}
                        strokeWidth={1}
                        opacity={0.6}
                      />
                      <circle cx={tip.x} cy={tip.y} r={3.2} fill={tone} />
                      {/*
                       * THE OUTER DOTS HAD NO NAMES, AND NOBODY COULD READ THEM.
                       *
                       * The ring legend says "The specific thing", which names
                       * the LEVEL and not the thing. An unnamed mark is
                       * decoration; a drawing whose parts cannot be named is a
                       * picture of data rather than a reading of it.
                       */}
                      <Plate x={tip.x} y={tip.y + lift} text={leaf.label} muted size={9} />
                    </g>
                  );
                })}

                {wedge.leaves.length > 4 && (
                  /* Never silently truncate — say what was left out. */
                  <Plate
                    x={at.x}
                    y={at.y + 18}
                    text={`+${wedge.leaves.length - 4} more`}
                    muted
                    size={8.5}
                  />
                )}
              </>
            ) : null}
          </g>
        );
      })}
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
        padding: '5px 12px',
        borderRadius: 999,
        border: `1px solid ${hue ?? 'var(--border)'}`,
        borderColor: selected ? (hue ?? 'currentColor') : 'var(--border)',
        background: selected && hue ? `${hue}3a` : 'transparent',
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
