'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useState } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet';
import {
  AVAILABLE_WEEKS,
  CHOKEPOINTS,
  type Chokepoint,
  type MapLayer,
  MOVEMENTS,
} from '@/lib/geopolitics-map';
import EducationModeSwitch from './EducationModeSwitch';

const LAYER_COLOR: Record<MapLayer, string> = {
  military: '#b6463a',
  commercial: '#7a4b18',
  energy: '#b48c2a',
};

const LAYER_LABEL: Record<MapLayer, string> = {
  military: 'Military',
  commercial: 'Commercial',
  energy: 'Energy',
};

const STATUS_COLOR: Record<Chokepoint['status'], string> = {
  OPEN: '#6a9a55',
  'OPEN-THROTTLED': '#c08a3a',
  DEGRADED: '#b34a2e',
  CLOSED: '#7a1b14',
};

// Quiet down Leaflet's default-icon shenanigans when bundled (we use CircleMarkers anyway).
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
}

type Props = {
  onSwitchToSelf?: () => void;
  onOpenPage?: (slug: string) => void;
};

export default function GeopoliticsLeafletMap({ onSwitchToSelf, onOpenPage }: Props) {
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({
    military: true,
    commercial: true,
    energy: true,
  });
  const [selectedWeek, setSelectedWeek] = useState<string>(AVAILABLE_WEEKS[0]);

  const visibleMovements = MOVEMENTS.filter((m) => layers[m.layer] && m.weekIso === selectedWeek);

  return (
    <main
      data-testid="geopolitics-leaflet-map"
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
          This week, on a real map
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
          Real cartography (OpenStreetMap / CartoDB Voyager tiles). Click any chokepoint or movement
          to open the page that explains it.
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
          borderRadius: 14,
          overflow: 'hidden',
          height: 'clamp(380px, 56vh, 620px)',
          background: '#f4e6c9',
        }}
      >
        <MapContainer
          center={[24, 50]}
          zoom={3}
          minZoom={2}
          maxZoom={7}
          worldCopyJump={true}
          style={{ height: '100%', width: '100%' }}
          attributionControl={true}
          data-testid="leaflet-map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {visibleMovements.map((movement) => (
            <Polyline
              key={movement.id}
              positions={[
                [movement.from.lat, movement.from.lng],
                [movement.to.lat, movement.to.lng],
              ]}
              pathOptions={{
                color: LAYER_COLOR[movement.layer],
                weight: movement.recency === 'this-week' ? 3 : 2,
                dashArray: movement.recency === 'this-week' ? undefined : '8 6',
                opacity: 0.92,
              }}
              eventHandlers={{
                click: () => onOpenPage?.(movement.pageSlug),
              }}
            >
              <Tooltip sticky direction="top" offset={[0, -6]}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 12 }}>
                  <strong style={{ color: LAYER_COLOR[movement.layer] }}>
                    {LAYER_LABEL[movement.layer]}
                  </strong>
                  {' · '}
                  {movement.label}
                  <br />
                  <span style={{ color: 'rgba(40,32,22,0.7)' }}>
                    {movement.from.name} → {movement.to.name}
                  </span>
                </span>
              </Tooltip>
            </Polyline>
          ))}

          {CHOKEPOINTS.map((chokepoint) => (
            <CircleMarker
              key={chokepoint.slug}
              center={[chokepoint.lat, chokepoint.lng]}
              radius={9}
              pathOptions={{
                color: STATUS_COLOR[chokepoint.status],
                fillColor: '#fff8e7',
                fillOpacity: 0.96,
                weight: 3,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent={false}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 12 }}>
                  <strong>{chokepoint.name}</strong>
                  <br />
                  <span style={{ color: STATUS_COLOR[chokepoint.status], fontWeight: 800 }}>
                    {chokepoint.status}
                  </span>
                </span>
              </Tooltip>
              <Popup>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: '#2a1d0e' }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>{chokepoint.name}</div>
                  <div
                    style={{
                      color: STATUS_COLOR[chokepoint.status],
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    {chokepoint.status}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenPage?.(chokepoint.pageSlug)}
                    style={{
                      border: '1px solid rgba(122,84,56,0.42)',
                      borderRadius: 999,
                      background: 'rgba(255,243,217,0.9)',
                      color: '#2a1d0e',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      padding: '4px 10px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Read why →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
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
        Tiles by CartoDB Voyager + OpenStreetMap contributors. Movement and chokepoint data is
        hand-curated and links back to the same verified research as the page reader.
      </p>
    </main>
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
