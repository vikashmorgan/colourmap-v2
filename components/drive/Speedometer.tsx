/**
 * Drive's speedometers (docs/specs/drive-game.md, "UI"). Asked for 2026-11-19: "cool speedometers,
 * one inspired by the timer in School, another more futuristic", and "another counter on the cockpit
 * instrument for gear 1, 2, 3, 4". Both read the speed (km/h, up to DIAL_MAX), the gear and the revs.
 *
 * - Timer: the School Timer's paper card (content/pandas/index.html): beige paper, brown ink and a
 *   brown shadow, its seven-colour rainbow as an arc that lights up with speed, and its thick bars
 *   (How solid I feel) as the revs, beige to brown.
 * - Futuristic: a glass ring dial: fine ticks, a glowing arc from cyan to magenta as the speed
 *   climbs, the number in a light monospace, the gear in a small hexagon, the revs as a thin arc.
 */

import { DIAL_MAX } from '@/lib/art/drive';

export interface GaugeProps {
  speed: number;
  gear: number;
  revs: number;
}

const RAINBOW = ['#d9534f', '#f08a3c', '#f2c14e', '#6fbf8e', '#4fb3b0', '#5b8fd9', '#9b6fd0'];
const BARS = 10;

function mixHex(a: string, b: string, k: number): string {
  const p = (h: string, i: number) => Number.parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** A point on a circle (degrees clockwise from the top). */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x0, y0] = polar(cx, cy, r, from);
  const [x1, y1] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** The School Timer's paper card, as a speedometer. */
export function TimerGauge({ speed, gear, revs }: GaugeProps) {
  const k = Math.min(1, speed / DIAL_MAX);
  // The rainbow over the top half: seven segments, each lit once the speed has reached it.
  const seg = 180 / RAINBOW.length;
  const lit = Math.ceil(k * RAINBOW.length - 1e-6);
  const bars = Math.round(revs * BARS);
  return (
    <div
      data-testid="gauge-timer"
      style={{
        width: 168,
        borderRadius: 14,
        background: '#f4ead9',
        border: '1px solid #dcc8a8',
        boxShadow: '0 14px 36px rgb(92 58 28 / 0.3)',
        color: '#3b2a1c',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '5px 12px',
          borderBottom: '1px solid #dcc8a8',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        <span>Speed</span>
        <span style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>gear {gear}</span>
      </div>
      <svg viewBox="0 0 168 92" width={168} height={92} role="img" aria-label={`${speed} km/h`}>
        {RAINBOW.map((c, i) => (
          <path
            key={c}
            d={arc(84, 82, 64, -90 + i * seg + 1.5, -90 + (i + 1) * seg - 1.5)}
            stroke={c}
            strokeWidth={11}
            strokeLinecap="round"
            fill="none"
            opacity={i < lit ? 1 : 0.18}
          />
        ))}
        <text
          x={84}
          y={72}
          textAnchor="middle"
          style={{ font: '700 28px Georgia, serif', fill: '#3b2a1c' }}
        >
          {speed}
        </text>
        <text
          x={84}
          y={87}
          textAnchor="middle"
          style={{ font: '600 9px system-ui', fill: '#8a6a4a' }}
        >
          km/h
        </text>
      </svg>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
          height: 26,
          padding: '0 12px 10px',
        }}
      >
        {Array.from({ length: BARS }, (_, i) => (
          <i
            key={i}
            style={{
              flex: 1,
              height: `${28 + i * 8}%`,
              borderRadius: 3,
              background: i < bars ? mixHex('#e3c9a0', '#7a4a2a', i / (BARS - 1)) : '#e9dcc6',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A glass ring dial: ticks, a glowing cyan-to-magenta arc, the gear in a hexagon, the revs. */
export function FutureGauge({ speed, gear, revs }: GaugeProps) {
  const k = Math.min(1, speed / DIAL_MAX);
  const from = -130;
  const span = 260;
  const to = from + span * k;
  const hot = mixHex('#38e8ff', '#ff48c8', Math.min(1, k * 1.25));
  const ticks = Array.from({ length: 22 }, (_, i) => from + (span * i) / 21);
  return (
    <div data-testid="gauge-future" style={{ width: 150, height: 150, position: 'relative' }}>
      <svg viewBox="0 0 150 150" width={150} height={150} role="img" aria-label={`${speed} km/h`}>
        <defs>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={75} cy={75} r={66} fill="rgba(8,10,22,0.55)" stroke="rgba(120,220,255,0.18)" />
        {ticks.map((d, i) => {
          const [x0, y0] = polar(75, 75, 60, d);
          const [x1, y1] = polar(75, 75, i % 3 === 0 ? 52 : 56, d);
          return (
            <line
              key={d}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke={d <= to ? hot : 'rgba(170,200,255,0.25)'}
              strokeWidth={i % 3 === 0 ? 1.6 : 1}
            />
          );
        })}
        <path
          d={arc(75, 75, 64, from, from + span)}
          stroke="rgba(120,200,255,0.12)"
          strokeWidth={4}
          fill="none"
        />
        {k > 0.002 && (
          <path
            d={arc(75, 75, 64, from, to)}
            stroke={hot}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
            filter="url(#gauge-glow)"
          />
        )}
        {/* The revs: a thin inner arc. */}
        <path
          d={arc(75, 75, 45, -60, 60)}
          stroke="rgba(120,200,255,0.12)"
          strokeWidth={3}
          fill="none"
        />
        {revs > 0.01 && (
          <path
            d={arc(75, 75, 45, -60, -60 + 120 * revs)}
            stroke={revs > 0.85 ? '#ff6a3a' : '#9fe8ff'}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        )}
        <text
          x={75}
          y={84}
          textAnchor="middle"
          style={{ font: '300 30px ui-monospace, Consolas, monospace', fill: '#e8f8ff' }}
          filter="url(#gauge-glow)"
        >
          {speed}
        </text>
        <text
          x={75}
          y={98}
          textAnchor="middle"
          style={{
            font: '600 8px ui-monospace, monospace',
            fill: 'rgba(170,220,255,0.6)',
            letterSpacing: 2,
          }}
        >
          KM/H
        </text>
        <polygon
          points={[0, 1, 2, 3, 4, 5]
            .map((i) =>
              polar(75, 121, 10, i * 60 + 30)
                .map((v) => v.toFixed(1))
                .join(','),
            )
            .join(' ')}
          fill="rgba(10,14,30,0.8)"
          stroke={hot}
          strokeWidth={1.2}
        />
        <text
          x={75}
          y={125}
          textAnchor="middle"
          style={{ font: '700 11px ui-monospace, monospace', fill: '#e8f8ff' }}
        >
          {gear}
        </text>
      </svg>
    </div>
  );
}
