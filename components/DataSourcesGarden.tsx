'use client';

import { useMemo, useState } from 'react';

import { ALL_DOMAINS, DATA_SOURCES, type Domain } from '@/lib/data-sources';
import EducationModeSwitch from './EducationModeSwitch';

const DOMAIN_LABEL: Record<Domain, string> = {
  climate: 'Climate',
  energy: 'Energy',
  economy: 'Economy',
  demography: 'Demography',
  security: 'Security',
  food: 'Food',
  health: 'Health',
  biodiversity: 'Biodiversity',
  ai: 'AI',
  democracy: 'Democracy',
  shipping: 'Shipping',
  minerals: 'Minerals',
};

type Props = {
  onSwitchToSelf?: () => void;
};

export default function DataSourcesGarden({ onSwitchToSelf }: Props) {
  const [active, setActive] = useState<Domain | 'all'>('all');
  const visible = useMemo(() => {
    if (active === 'all') return DATA_SOURCES;
    return DATA_SOURCES.filter((s) => s.domain.includes(active));
  }, [active]);

  return (
    <main
      data-testid="data-sources-garden"
      style={{
        minHeight: 'calc(100svh - 120px)',
        background:
          'linear-gradient(180deg, rgba(236,220,188,0.74), rgba(206,184,145,0.34)), radial-gradient(circle at 84% 12%, rgba(122,84,56,0.14), transparent 36%)',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
      }}
    >
      <EducationModeSwitch active="world" onSwitchToSelf={onSwitchToSelf} />

      <header style={{ margin: '6px 0 12px' }}>
        <p style={smallLabel}>education / world · data garden</p>
        <h1
          style={{
            margin: '4px 0 4px',
            color: '#2a1d0e',
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(26px, 4.4vw, 40px)',
            letterSpacing: '0.01em',
          }}
        >
          Where the world is measured
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
          A literate citizen should be able to reach a primary source for almost any question about
          the world through this list alone. Filter by domain.
        </p>
      </header>

      <fieldset
        aria-label="Filter by domain"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 14,
          border: 0,
          padding: 0,
        }}
      >
        <DomainPill label="All" active={active === 'all'} onClick={() => setActive('all')} />
        {ALL_DOMAINS.map((domain) => (
          <DomainPill
            key={domain}
            label={DOMAIN_LABEL[domain]}
            active={active === domain}
            onClick={() => setActive(domain)}
          />
        ))}
      </fieldset>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {visible.map((source) => (
          <a
            key={source.slug}
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
            data-testid={`source-${source.slug}`}
            style={{
              textDecoration: 'none',
              border: '1px solid rgba(122,84,56,0.26)',
              background: 'rgba(255,248,231,0.82)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
              fontFamily: 'var(--font-serif)',
              color: '#2a1d0e',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 6,
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 15 }}>{source.name}</span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(82,58,38,0.66)',
                  fontWeight: 800,
                }}
              >
                {source.cadence}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(82,58,38,0.74)', fontStyle: 'italic' }}>
              {source.org}
            </span>
            <span style={{ fontSize: 13, color: 'rgba(34,28,20,0.86)', lineHeight: 1.5 }}>
              {source.blurb}
            </span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
              {source.domain.map((d) => (
                <span
                  key={d}
                  style={{
                    border: '1px solid rgba(122,84,56,0.32)',
                    borderRadius: 999,
                    color: '#5a3d18',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: '2px 7px',
                    textTransform: 'uppercase',
                  }}
                >
                  {DOMAIN_LABEL[d]}
                </span>
              ))}
              <span
                style={{
                  border: '1px solid rgba(122,84,56,0.32)',
                  borderRadius: 999,
                  background: 'rgba(255,243,217,0.62)',
                  color: '#7a4b18',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '2px 7px',
                  textTransform: 'uppercase',
                }}
              >
                {source.license}
              </span>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}

function DomainPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        border: '1px solid rgba(122,84,56,0.32)',
        borderRadius: 999,
        background: active ? 'rgba(122,84,56,0.92)' : 'rgba(255,248,231,0.78)',
        color: active ? '#ffe6aa' : '#2a1d0e',
        cursor: 'pointer',
        fontFamily: 'var(--font-serif)',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.1em',
        padding: '6px 12px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
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
