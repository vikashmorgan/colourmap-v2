'use client';

import { useState } from 'react';
import {
  AVAILABLE_WEEKS,
  CHOKEPOINTS,
  type Chokepoint,
  MAP_VIEWBOX,
  type MapLayer,
  MOVEMENTS,
  type Movement,
  REGIONS,
} from '@/lib/geopolitics-map';
import EducationModeSwitch from './EducationModeSwitch';

const LAYER_COLOR: Record<MapLayer, string> = {
  military: '#b6463a',
  commercial: '#246cae',
  energy: '#b48c2a',
};

const LAYER_LABEL: Record<MapLayer, string> = {
  military: 'Military',
  commercial: 'Commercial',
  energy: 'Energy',
};

const STATUS_COLOR: Record<Chokepoint['status'], string> = {
  OPEN: '#5fb27a',
  'OPEN-THROTTLED': '#e0a445',
  DEGRADED: '#d77a52',
  CLOSED: '#b6463a',
};

type Props = {
  onSwitchToSelf?: () => void;
  onOpenPage?: (slug: string) => void;
};

export default function GeopoliticsMap({ onSwitchToSelf, onOpenPage }: Props) {
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({
    military: true,
    commercial: true,
    energy: true,
  });
  const [selectedWeek, setSelectedWeek] = useState<string>(AVAILABLE_WEEKS[0]);
  const [hoverMovement, setHoverMovement] = useState<Movement | null>(null);

  const visibleMovements = MOVEMENTS.filter((m) => layers[m.layer] && m.weekIso === selectedWeek);

  return (
    <main
      data-testid="geopolitics-map"
      style={{
        minHeight: 'calc(100svh - 120px)',
        background:
          'linear-gradient(180deg, rgba(236,220,188,0.78), rgba(206,184,145,0.34)), radial-gradient(circle at 14% 12%, rgba(122,84,56,0.16), transparent 38%)',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
      }}
    >
      <EducationModeSwitch active="world" onSwitchToSelf={onSwitchToSelf} />

      <header style={{ margin: '6px 0 12px' }}>
        <p style={smallLabel}>education / world · weekly map</p>
        <h1
          style={{
            margin: '4px 0 4px',
            color: '#2a1d0e',
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(26px, 4.4vw, 40px)',
            letterSpacing: '0.01em',
          }}
        >
          This week in shipping & the Gulf
        </h1>
        <p
          style={{
            margin: 0,
            color: 'rgba(40,32,22,0.74)',
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          A hand-curated snapshot. Movement arrows are clickable — each one links to the page that
          explains it. Toggle layers to read one story at a time.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          <WeekSelector
            weeks={AVAILABLE_WEEKS}
            selected={selectedWeek}
            onChange={setSelectedWeek}
          />
          <LayerToggles
            layers={layers}
            onToggle={(layer) => setLayers((s) => ({ ...s, [layer]: !s[layer] }))}
          />
        </div>
      </header>

      <div
        style={{
          border: '1px solid rgba(122,84,56,0.26)',
          background:
            'radial-gradient(circle at 30% 30%, rgba(255,243,217,0.88), rgba(228,206,160,0.82))',
          borderRadius: 14,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <svg
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          width="100%"
          role="img"
          aria-label="Middle East and Indian Ocean weekly map"
          style={{ display: 'block' }}
        >
          <defs>
            {(Object.keys(LAYER_COLOR) as MapLayer[]).map((layer) => (
              <marker
                key={`arrow-${layer}`}
                id={`arrow-${layer}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={LAYER_COLOR[layer]} />
              </marker>
            ))}
            <pattern id="parchment-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(82,58,38,0.06)"
                strokeWidth="0.6"
              />
            </pattern>
          </defs>

          <rect width={MAP_VIEWBOX.width} height={MAP_VIEWBOX.height} fill="url(#parchment-grid)" />

          {REGIONS.map((region) => (
            <path
              key={region.id}
              d={region.d}
              fill="rgba(214,191,148,0.78)"
              stroke="rgba(82,58,38,0.45)"
              strokeWidth={1.4}
              style={{ filter: 'drop-shadow(0 1px 0 rgba(82,58,38,0.16))' }}
            />
          ))}

          {/* sea labels */}
          <SeaLabel x={760} y={420} text="Arabian Sea" />
          <SeaLabel x={420} y={420} text="Red Sea" />
          <SeaLabel x={520} y={345} text="Persian Gulf" />
          <SeaLabel x={210} y={130} text="Mediterranean" />

          {/* Movement arrows */}
          {visibleMovements.map((movement) => (
            <MovementArrow
              key={movement.id}
              movement={movement}
              isHovered={hoverMovement?.id === movement.id}
              onHover={() => setHoverMovement(movement)}
              onLeave={() =>
                setHoverMovement((current) => (current?.id === movement.id ? null : current))
              }
              onClick={() => onOpenPage?.(movement.pageSlug)}
            />
          ))}

          {/* Chokepoints */}
          {CHOKEPOINTS.map((chokepoint) => (
            <ChokepointMarker
              key={chokepoint.slug}
              chokepoint={chokepoint}
              onClick={() => onOpenPage?.(chokepoint.pageSlug)}
            />
          ))}
        </svg>

        {hoverMovement && (
          <div
            data-testid="movement-readout"
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              border: `1px solid ${LAYER_COLOR[hoverMovement.layer]}`,
              borderRadius: 10,
              background: 'rgba(255,248,231,0.96)',
              padding: '8px 12px',
              maxWidth: 320,
              boxShadow: '0 8px 24px rgba(20,16,12,0.18)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: LAYER_COLOR[hoverMovement.layer],
                fontWeight: 800,
              }}
            >
              {LAYER_LABEL[hoverMovement.layer]} · {hoverMovement.recency}
            </p>
            <p
              style={{
                margin: '4px 0 2px',
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                color: '#2a1d0e',
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {hoverMovement.label}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                color: 'rgba(40,32,22,0.7)',
              }}
            >
              {hoverMovement.from.name} → {hoverMovement.to.name} · tap to read why
            </p>
          </div>
        )}
      </div>

      <p
        style={{
          margin: '12px 0 0',
          color: 'rgba(40,32,22,0.6)',
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Map is a stylised V1 snapshot. Future versions will load Mapbox tiles with deck.gl layers
        for AIS-density and a time-slider over the 2025-2026 escalation arc. Every claim shown on
        this map traces back to the same verified research as the page reader.
      </p>
    </main>
  );
}

function MovementArrow({
  movement,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: {
  movement: Movement;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const dx = movement.to.x - movement.from.x;
  const dy = movement.to.y - movement.from.y;
  const curveOffset = 60;
  const midX = (movement.from.x + movement.to.x) / 2 + (dy > 0 ? -curveOffset : curveOffset);
  const midY = (movement.from.y + movement.to.y) / 2 + (dx > 0 ? -curveOffset : curveOffset);
  const path = `M ${movement.from.x} ${movement.from.y} Q ${midX} ${midY} ${movement.to.x} ${movement.to.y}`;
  const opacity = movement.recency === 'this-week' ? 1 : 0.6;
  const color = LAYER_COLOR[movement.layer];

  return (
    <g
      data-testid={`movement-${movement.id}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <path
        d={path}
        fill="none"
        stroke="rgba(82,58,38,0.65)"
        strokeWidth={isHovered ? 7 : 5}
        strokeOpacity={0.18}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={isHovered ? 3 : 2}
        strokeOpacity={opacity}
        strokeDasharray={movement.recency === 'this-week' ? undefined : '6 4'}
        markerEnd={`url(#arrow-${movement.layer})`}
      />
    </g>
  );
}

function ChokepointMarker({
  chokepoint,
  onClick,
}: {
  chokepoint: Chokepoint;
  onClick: () => void;
}) {
  return (
    <g
      data-testid={`chokepoint-${chokepoint.slug}`}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <circle
        cx={chokepoint.x}
        cy={chokepoint.y}
        r={10}
        fill="rgba(255,248,231,0.94)"
        stroke={STATUS_COLOR[chokepoint.status]}
        strokeWidth={2.5}
      />
      <circle cx={chokepoint.x} cy={chokepoint.y} r={3.5} fill={STATUS_COLOR[chokepoint.status]} />
      <text
        x={chokepoint.x + 14}
        y={chokepoint.y + 4}
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 12,
          fontWeight: 800,
          fill: '#1f1408',
        }}
      >
        {chokepoint.name}
      </text>
      <text
        x={chokepoint.x + 14}
        y={chokepoint.y + 18}
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fill: STATUS_COLOR[chokepoint.status],
          fontWeight: 800,
        }}
      >
        {chokepoint.status}
      </text>
    </g>
  );
}

function SeaLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text
      x={x}
      y={y}
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 12,
        fill: 'rgba(122,84,56,0.55)',
        fontStyle: 'italic',
        letterSpacing: '0.16em',
      }}
    >
      {text}
    </text>
  );
}

function LayerToggles({
  layers,
  onToggle,
}: {
  layers: Record<MapLayer, boolean>;
  onToggle: (layer: MapLayer) => void;
}) {
  return (
    <fieldset
      aria-label="Map layers"
      style={{
        display: 'inline-flex',
        gap: 6,
        border: '1px solid rgba(122,84,56,0.28)',
        borderRadius: 999,
        background: 'rgba(255,248,231,0.78)',
        padding: 3,
      }}
    >
      {(Object.keys(LAYER_LABEL) as MapLayer[]).map((layer) => (
        <button
          key={layer}
          type="button"
          data-testid={`layer-${layer}`}
          aria-pressed={layers[layer]}
          onClick={() => onToggle(layer)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 0,
            borderRadius: 999,
            background: layers[layer] ? LAYER_COLOR[layer] : 'transparent',
            color: layers[layer] ? '#fff' : 'rgba(40,32,22,0.78)',
            cursor: 'pointer',
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.1em',
            padding: '6px 12px',
            textTransform: 'uppercase',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: LAYER_COLOR[layer],
              border: `1px solid ${layers[layer] ? '#fff' : 'rgba(40,32,22,0.5)'}`,
            }}
          />
          {LAYER_LABEL[layer]}
        </button>
      ))}
    </fieldset>
  );
}

function WeekSelector({
  weeks,
  selected,
  onChange,
}: {
  weeks: string[];
  selected: string;
  onChange: (week: string) => void;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        gap: 8,
        alignItems: 'center',
        border: '1px solid rgba(122,84,56,0.28)',
        borderRadius: 999,
        background: 'rgba(255,248,231,0.78)',
        padding: '6px 12px',
        fontFamily: 'var(--font-serif)',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(40,32,22,0.86)',
      }}
    >
      Week
      <select
        value={selected}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={{
          border: 0,
          background: 'transparent',
          color: '#2a1d0e',
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {weeks.map((week) => (
          <option key={week} value={week}>
            {week}
          </option>
        ))}
      </select>
    </label>
  );
}

const smallLabel = {
  margin: 0,
  color: 'rgba(82,58,38,0.66)',
  fontFamily: 'var(--font-serif)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
};
