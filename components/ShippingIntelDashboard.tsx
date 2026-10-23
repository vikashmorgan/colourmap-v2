'use client';

import { useRouter } from 'next/navigation';
import {
  type ChokepointStatus,
  SHIPPING_INTEL_V1,
  type ShippingIntel,
  type Updatedness,
} from '@/lib/shipping-intel';
import EducationModeSwitch from './EducationModeSwitch';

const STATUS_COLOR: Record<ChokepointStatus, string> = {
  OPEN: '#5fb27a',
  'OPEN-THROTTLED': '#e0a445',
  DEGRADED: '#d77a52',
  CLOSED: '#b6463a',
};

const UPDATEDNESS_COLOR: Record<Updatedness, string> = {
  LIVE: '#5fb27a',
  EDITORIAL: '#9aa3b8',
  STALE: '#d77a52',
};

type Props = {
  snapshot?: ShippingIntel;
  onSwitchToSelf?: () => void;
  onOpenPage?: (slug: string) => void;
};

export default function ShippingIntelDashboard({
  snapshot = SHIPPING_INTEL_V1,
  onSwitchToSelf,
  onOpenPage,
}: Props) {
  const router = useRouter();
  const navigateToPage = (slug: string) => {
    if (onOpenPage) {
      onOpenPage(slug);
      return;
    }
    router.push(`/education/world?page=${slug}`);
  };

  return (
    <main
      data-testid="shipping-intel-dashboard"
      style={{
        minHeight: 'calc(100svh - 120px)',
        background:
          'linear-gradient(180deg, rgba(236,220,188,0.74), rgba(206,184,145,0.34)), radial-gradient(circle at 12% 8%, rgba(122,84,56,0.14), transparent 32%)',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
      }}
    >
      <EducationModeSwitch active="world" onSwitchToSelf={onSwitchToSelf} />

      <header style={{ margin: '6px 0 14px' }}>
        <p style={smallLabel}>education / world · shipping intel</p>
        <h1
          style={{
            margin: '4px 0 4px',
            color: '#2a1d0e',
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(26px, 4.4vw, 40px)',
            letterSpacing: '0.01em',
          }}
        >
          Shipping Intel
        </h1>
        <p
          style={{
            margin: 0,
            color: 'rgba(40,32,22,0.74)',
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          As of {snapshot.asOf}. Six tiles. Every number is labelled <strong>editorial</strong>,{' '}
          <strong>live</strong>, or <strong>stale</strong> — never silently mislead.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        <Tile
          title="Chokepoint status"
          updatedness={snapshot.chokepoints.updatedness}
          updatedAt={snapshot.chokepoints.updatedAt}
          onLearn={() => navigateToPage(snapshot.chokepoints.pageSlug)}
          testId="tile-chokepoints"
        >
          <div style={{ display: 'grid', gap: 5 }}>
            {snapshot.chokepoints.chokepoints.map((c) => (
              <div
                key={c.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 18px 1fr',
                  gap: 8,
                  alignItems: 'center',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 13,
                  color: 'rgba(34,28,20,0.86)',
                }}
              >
                <span style={{ fontWeight: 800 }}>{c.name}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 99,
                    background: STATUS_COLOR[c.status],
                  }}
                />
                <span style={{ fontSize: 12, color: 'rgba(34,28,20,0.7)' }}>
                  <span style={{ color: STATUS_COLOR[c.status], fontWeight: 700 }}>{c.status}</span>{' '}
                  · {c.note}
                </span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile
          title="War-risk premium · VLCC Hormuz"
          updatedness={snapshot.warRisk.updatedness}
          updatedAt={snapshot.warRisk.updatedAt}
          onLearn={() => navigateToPage(snapshot.warRisk.pageSlug)}
          testId="tile-war-risk"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              fontFamily: 'var(--font-serif)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(82,58,38,0.66)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Current
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#2a1d0e', lineHeight: 1.05 }}>
                {snapshot.warRisk.vlccPremiumPercent.toFixed(2)}%
              </div>
              <div style={{ fontSize: 11, color: 'rgba(40,32,22,0.7)', marginTop: 2 }}>
                of hull value · pre-war floor {snapshot.warRisk.baselinePremiumPercent}%
              </div>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <DeltaBadge label="7d" bps={snapshot.warRisk.delta7dBps} />
              <DeltaBadge label="30d" bps={snapshot.warRisk.delta30dBps} />
              <div style={{ fontSize: 11, color: 'rgba(40,32,22,0.6)' }}>
                source: {snapshot.warRisk.source}
              </div>
            </div>
          </div>
        </Tile>

        <Tile
          title="Freight rates · SCFI composite"
          updatedness={snapshot.freightRates.updatedness}
          updatedAt={snapshot.freightRates.updatedAt}
          onLearn={() => navigateToPage(snapshot.freightRates.pageSlug)}
          testId="tile-freight-rates"
        >
          <div style={{ display: 'grid', gap: 4 }}>
            {snapshot.freightRates.rates.map((r) => (
              <div
                key={r.lane}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'baseline',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                <span style={{ fontSize: 13, color: '#2a1d0e', fontWeight: 700 }}>{r.lane}</span>
                <span style={{ fontSize: 13, color: 'rgba(34,28,20,0.86)' }}>
                  ${r.usd.toLocaleString()}{' '}
                  <span
                    style={{
                      color: r.deltaPercent >= 0 ? '#5fb27a' : '#d77a52',
                      fontWeight: 700,
                    }}
                  >
                    {r.deltaPercent >= 0 ? '▲' : '▼'} {Math.abs(r.deltaPercent).toFixed(1)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile
          title="Recent incidents · last 48h"
          updatedness={snapshot.incidents.updatedness}
          updatedAt={snapshot.incidents.updatedAt}
          onLearn={() => navigateToPage(snapshot.incidents.pageSlug)}
          testId="tile-incidents"
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 30,
                fontWeight: 900,
                color: '#2a1d0e',
              }}
            >
              {snapshot.incidents.last48h}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
              {snapshot.incidents.recent.map((incident, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 12,
                    color: 'rgba(34,28,20,0.86)',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: 'rgba(82,58,38,0.72)', fontWeight: 700 }}>
                    {incident.when} · {incident.where}
                  </span>{' '}
                  — {incident.what}
                </li>
              ))}
            </ul>
          </div>
        </Tile>

        <Tile
          title="CMA CGM Watch"
          updatedness={snapshot.cmaCgmWatch.updatedness}
          updatedAt={snapshot.cmaCgmWatch.updatedAt}
          onLearn={() => navigateToPage(snapshot.cmaCgmWatch.pageSlug)}
          testId="tile-cma-cgm-watch"
          accent
        >
          <div style={{ display: 'grid', gap: 5 }}>
            {snapshot.cmaCgmWatch.metrics.map((m) => (
              <div
                key={m.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'baseline',
                  fontFamily: 'var(--font-serif)',
                  borderTop: '1px solid rgba(122,84,56,0.12)',
                  paddingTop: 5,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(40,32,22,0.76)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {m.label}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: '#2a1d0e',
                    fontWeight: 800,
                  }}
                  title={m.note}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile
          title="What changed today"
          updatedness={snapshot.whatChanged.updatedness}
          updatedAt={snapshot.whatChanged.updatedAt}
          onLearn={() => navigateToPage(snapshot.whatChanged.pageSlug)}
          testId="tile-what-changed"
        >
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {snapshot.whatChanged.bullets.map((b, i) => (
              <li
                key={i}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 13,
                  color: 'rgba(34,28,20,0.86)',
                  lineHeight: 1.45,
                  paddingLeft: 12,
                  borderLeft: '2px solid rgba(122,84,56,0.32)',
                }}
              >
                {b}
              </li>
            ))}
          </ul>
        </Tile>
      </div>
    </main>
  );
}

function Tile({
  title,
  updatedness,
  updatedAt,
  onLearn,
  children,
  testId,
  accent = false,
}: {
  title: string;
  updatedness: Updatedness;
  updatedAt: string;
  onLearn: () => void;
  children: React.ReactNode;
  testId?: string;
  accent?: boolean;
}) {
  return (
    <article
      data-testid={testId}
      style={{
        border: `1px solid ${accent ? 'rgba(180,108,52,0.45)' : 'rgba(122,84,56,0.26)'}`,
        background: accent ? 'rgba(255,243,217,0.86)' : 'rgba(255,248,231,0.84)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'grid',
        gap: 10,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: '#2a1d0e',
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          {title}
        </h2>
        <span
          title={`updatedness ${updatedness}`}
          style={{
            border: `1px solid ${UPDATEDNESS_COLOR[updatedness]}`,
            borderRadius: 999,
            color: '#2a1d0e',
            fontFamily: 'var(--font-serif)',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.1em',
            padding: '2px 7px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 99,
              marginRight: 5,
              verticalAlign: 1,
              background: UPDATEDNESS_COLOR[updatedness],
            }}
          />
          {updatedness} · {updatedAt}
        </span>
      </header>

      <div>{children}</div>

      <button
        type="button"
        onClick={onLearn}
        style={{
          justifySelf: 'start',
          border: 0,
          background: 'transparent',
          color: 'rgba(82,58,38,0.78)',
          cursor: 'pointer',
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.1em',
          padding: 0,
          textTransform: 'uppercase',
        }}
      >
        Learn this →
      </button>
    </article>
  );
}

function DeltaBadge({ label, bps }: { label: string; bps: number }) {
  const positive = bps >= 0;
  const color = positive ? '#d77a52' : '#5fb27a';
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        border: `1px solid ${color}`,
        borderRadius: 999,
        color: '#2a1d0e',
        fontFamily: 'var(--font-serif)',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.08em',
        padding: '3px 8px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      Δ{label}
      <span style={{ color }}>
        {positive ? '▲' : '▼'} {Math.abs(bps)} bps
      </span>
    </span>
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
