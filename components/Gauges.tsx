'use client';

/*
 * A game's instruments on screen, in one of four styles (docs/specs/art-journey.md, "Cockpit
 * displays"; first asked 2026-11-11: "meters like in an airplane cockpit", then 2026-11-12: "play
 * with different types of displays, and option to have no displays always possible"):
 *
 * - dials: round dials, a gold needle and the reading under it (the first style);
 * - lines: a minimal line each, a thin bar and the number;
 * - holo: open arcs of soft light, the number inside;
 * - segments: a retro row of ten lit segments and digits.
 *
 * Any game's gauges draw in any style; a compass (`kind: 'compass'`) and a word (`kind: 'text'`,
 * the district you are in) fit each. Drawn once by React, then painted every frame straight onto
 * the page by `paintGauges` (CSS variables and text only), so a frame never re-renders React.
 */

import type { CSSProperties, Ref } from 'react';

/** An instrument of a game's cockpit. */
export type Gauge = {
  label: string;
  value: number;
  min?: number;
  max: number;
  unit?: string;
  /** A compass (value in degrees, 0 north, round to the right) or a word (`text`); a dial otherwise. */
  kind?: 'compass' | 'text';
  text?: string;
};

export type GaugeStyle = 'dials' | 'lines' | 'holo' | 'segments';
export const GAUGE_STYLES: GaugeStyle[] = ['dials', 'lines', 'holo', 'segments'];

/** How far along its range a gauge reads, 0 at `min` (0 if not given) to 1 at `max`. */
export const gaugeShare = (g: Gauge) => {
  const lo = g.min ?? 0;
  const k = g.max > lo ? (g.value - lo) / (g.max - lo) : 0;
  return Math.max(0, Math.min(1, k));
};

/** Where a dial's needle points for a value: from -135° at `min` round to 135° at `max`. */
export const needleAngle = (g: Gauge) => -135 + 270 * gaugeShare(g);

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
/** A heading's name on the compass, to the nearest of eight points. */
export const headingName = (deg: number) =>
  POINTS[((Math.round((((deg % 360) + 360) % 360) / 45) % 8) + 8) % 8] as string;

/** What a gauge reads, as shown: the number, the heading's point, or the word. */
export function gaugeText(g: Gauge): string {
  if (g.kind === 'text') return g.text ?? '';
  if (g.kind === 'compass') return headingName(g.value);
  return String(Math.round(g.value));
}

const SEGMENTS = 10;

/** A heading as a share of a half turn either side of north: -1 (south, by the west) to 1. */
export const signedTurn = (deg: number) =>
  ((((Math.round(deg) + 180) % 360) + 360) % 360) / 180 - 1;

/**
 * Paints the gauges' readings onto the cluster at `root`, as React drew it: each gauge's share and
 * heading as CSS variables, its reading as text, its lit segments; only what changed.
 */
export function paintGauges(root: HTMLElement | null, gauges: Gauge[]) {
  if (!root) return;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-gauge]'))) {
    const g = gauges[Number(el.dataset.gauge)];
    if (!g) continue;
    const k = gaugeShare(g).toFixed(3);
    if (el.style.getPropertyValue('--k') !== k) el.style.setProperty('--k', k);
    if (g.kind === 'compass') {
      const h = `${Math.round(g.value)}deg`;
      if (el.style.getPropertyValue('--h') !== h) el.style.setProperty('--h', h);
      const hn = (Math.round(g.value) / 360).toFixed(4);
      if (el.style.getPropertyValue('--hn') !== hn) el.style.setProperty('--hn', hn);
      const hs = signedTurn(g.value).toFixed(4);
      if (el.style.getPropertyValue('--hs') !== hs) el.style.setProperty('--hs', hs);
    }
    const text = gaugeText(g);
    for (const r of Array.from(el.querySelectorAll('[data-reading]'))) {
      if (r.textContent !== text) r.textContent = text;
    }
    const segs = el.querySelector('[data-segments]');
    if (segs) {
      const lit = Math.round(gaugeShare(g) * SEGMENTS);
      Array.from(segs.children).forEach((s, n) => {
        const on = n < lit;
        if (s.classList.contains('on') !== on) s.classList.toggle('on', on);
      });
    }
  }
}

const vars = (g: Gauge): CSSProperties =>
  ({
    '--k': gaugeShare(g).toFixed(3),
    '--h': `${Math.round(g.kind === 'compass' ? g.value : 0)}deg`,
    '--hn': (Math.round(g.kind === 'compass' ? g.value : 0) / 360).toFixed(4),
    '--hs': signedTurn(g.kind === 'compass' ? g.value : 0).toFixed(4),
  }) as CSSProperties;

const aria = (g: Gauge) => `${g.label}${g.unit ? ` (${g.unit})` : ''}`;

/** A round dial, as the first cockpit's: ticks, a gold needle, the reading under it. */
function Dial({ g, i }: { g: Gauge; i: number }) {
  if (g.kind === 'text') {
    return (
      <span className="bb-gauge bb-gauge-word" data-gauge={i} role="img" aria-label={g.label}>
        <span className="bb-gauge-label" data-reading>
          {gaugeText(g)}
        </span>
      </span>
    );
  }
  const compass = g.kind === 'compass';
  return (
    <span className="bb-gauge" data-gauge={i} style={vars(g)} role="img" aria-label={aria(g)}>
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle className="bb-gauge-face" cx="28" cy="28" r="26" />
        {compass ? (
          // The rose turns under a fixed mark at the top: the way you fly is always up.
          <g className="bb-gauge-rose">
            {['N', 'E', 'S', 'W'].map((p, n) => {
              const a = ((n * 90 - 90) * Math.PI) / 180;
              return (
                <text key={p} x={28 + Math.cos(a) * 17} y={28 + Math.sin(a) * 17 + 3}>
                  {p}
                </text>
              );
            })}
          </g>
        ) : (
          Array.from({ length: 9 }, (_, n) => {
            const a = ((-135 + n * 33.75 - 90) * Math.PI) / 180;
            return (
              <line
                key={n}
                className="bb-gauge-tick"
                x1={28 + Math.cos(a) * 21}
                y1={28 + Math.sin(a) * 21}
                x2={28 + Math.cos(a) * 24}
                y2={28 + Math.sin(a) * 24}
              />
            );
          })
        )}
        {compass ? (
          <path className="bb-gauge-mark" d="M28 3 L31 9 L25 9 Z" />
        ) : (
          <g className="bb-gauge-needle">
            <line x1="28" y1="31" x2="28" y2="9" />
          </g>
        )}
        {compass ? null : <circle className="bb-gauge-hub" cx="28" cy="28" r="2.5" />}
        <text className="bb-gauge-value" x="28" y={compass ? 32 : 45} data-reading>
          {gaugeText(g)}
        </text>
      </svg>
      <span className="bb-gauge-label">{g.label}</span>
    </span>
  );
}

/** A minimal line: the label, a thin bar filled to the reading, the number. */
function Line({ g, i }: { g: Gauge; i: number }) {
  return (
    <span className="bb-line-g" data-gauge={i} style={vars(g)} role="img" aria-label={aria(g)}>
      <span className="bb-line-label">{g.label}</span>
      {g.kind === 'text' ? null : g.kind === 'compass' ? (
        // A heading tape: the points slide under a fixed mark.
        <span className="bb-line-tape" aria-hidden="true">
          <span className="bb-line-tape-in">
            {['N', 'E', 'S', 'W', 'N', 'E', 'S', 'W', 'N'].map((p, n) => (
              <span key={`${p}${n}`}>{p}</span>
            ))}
          </span>
        </span>
      ) : (
        <span className="bb-line-bar" aria-hidden="true">
          <span />
        </span>
      )}
      <span className="bb-line-value" data-reading>
        {gaugeText(g)}
      </span>
    </span>
  );
}

/** An open arc of soft light, filled to the reading, the number inside. */
function Holo({ g, i }: { g: Gauge; i: number }) {
  if (g.kind === 'text') {
    return (
      <span className="bb-holo bb-holo-word" data-gauge={i} role="img" aria-label={g.label}>
        <span data-reading>{gaugeText(g)}</span>
      </span>
    );
  }
  const compass = g.kind === 'compass';
  return (
    <span className="bb-holo" data-gauge={i} style={vars(g)} role="img" aria-label={aria(g)}>
      <svg viewBox="0 0 80 52" aria-hidden="true">
        <path className="bb-holo-track" d="M8 46 A32 32 0 0 1 72 46" pathLength={100} />
        {compass ? (
          // The heading as a bead of light riding the arc.
          <g className="bb-holo-needle">
            <circle cx="40" cy="14" r="3" />
          </g>
        ) : (
          <path className="bb-holo-fill" d="M8 46 A32 32 0 0 1 72 46" pathLength={100} />
        )}
        <text className="bb-holo-value" x="40" y="44" data-reading>
          {gaugeText(g)}
        </text>
      </svg>
      <span className="bb-holo-label">{g.label}</span>
    </span>
  );
}

/** A retro row of ten lit segments and digits. */
function Segments({ g, i }: { g: Gauge; i: number }) {
  return (
    <span className="bb-seg7" data-gauge={i} style={vars(g)} role="img" aria-label={aria(g)}>
      <span className="bb-seg7-label">{g.label}</span>
      <span className="bb-seg7-value" data-reading>
        {gaugeText(g)}
      </span>
      {g.kind ? null : (
        <span className="bb-seg7-row" data-segments aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, n) => (
            <i key={n} className={n < Math.round(gaugeShare(g) * SEGMENTS) ? 'on' : undefined} />
          ))}
        </span>
      )}
    </span>
  );
}

/** A game's gauges, drawn in a style; `rootRef` is what `paintGauges` paints each frame. */
export function GaugeCluster({
  gauges,
  style = 'dials',
  rootRef,
}: {
  gauges: Gauge[];
  style?: GaugeStyle;
  rootRef?: Ref<HTMLDivElement>;
}) {
  const Each = { dials: Dial, lines: Line, holo: Holo, segments: Segments }[style] ?? Dial;
  return (
    <div className={`bb-gauges bb-gauges-${style}`} ref={rootRef} data-style={style}>
      {gauges.map((g, i) => (
        <Each key={g.label} g={g} i={i} />
      ))}
    </div>
  );
}
