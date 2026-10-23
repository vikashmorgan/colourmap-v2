'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnimatedFigure from '@/components/AnimatedFigure';
import Billy3D from '@/components/Billy3D';
import GoldenGod, { type FigureAsset } from '@/components/GoldenGod';

const STATIC_FIGURES: FigureAsset[] = [
  {
    key: 'golden-god',
    label: 'Golden God',
    url: '/models/golden-god.obj',
    goldColor: '#E0A040',
    hologramColor: '#FFD080',
    starColor: '#FFE2A0',
  },
  {
    key: 'kid-lotus',
    label: 'Buddha Boy',
    url: '/models/kid-lotus.obj',
    goldColor: '#C9A06A',
    hologramColor: '#E8C898',
    starColor: '#F2D89A',
  },
  {
    key: 'spirit',
    label: 'Spirit',
    url: '/models/spirit.obj',
    goldColor: '#CFAE78',
    hologramColor: '#BFE8D8',
    starColor: '#D8FFE8',
  },
  {
    key: 'butterfly-priest',
    label: 'Butterfly Priest',
    url: '/models/butterfly-priest.obj',
    goldColor: '#D2A86A',
    hologramColor: '#D6C0FF',
    starColor: '#E5D7FF',
  },
  {
    key: 'butterfly-man',
    label: 'Butterfly Man',
    url: '/models/butterfly-man.obj',
    goldColor: '#C78E58',
    hologramColor: '#FFC7A2',
    starColor: '#FFD8B8',
  },
];

const ANIMATED_FIGURES = [
  { key: 'robot', label: 'Robot', url: '/models/robot.glb', color: '#E0A040' },
  { key: 'soldier', label: 'Soldier', url: '/models/soldier.glb', color: '#C9A06A' },
  { key: 'cesium', label: 'Cesium Man', url: '/models/test-animated.glb', color: '#E8C898' },
];

const SERIF = 'var(--font-serif)';

type Mode = 'static' | 'animated' | 'billy';

export default function FiguresPage() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const requestedFigure = searchParams.get('figure');
  const [mode, setMode] = useState<Mode>(getInitialMode(requestedMode));
  const [staticFig, setStaticFig] = useState<FigureAsset>(
    findStaticFigure(requestedFigure) ?? STATIC_FIGURES[0],
  );
  const [animFig, setAnimFig] = useState(
    ANIMATED_FIGURES.find((figure) => figure.key === requestedFigure) ?? ANIMATED_FIGURES[0],
  );
  // Full view: hide every bit of chrome and leave just the figure on screen.
  const [chromeOpen, setChromeOpen] = useState(true);

  useEffect(() => {
    const nextMode = getInitialMode(requestedMode);
    const nextStatic = findStaticFigure(requestedFigure);
    const nextAnimated = ANIMATED_FIGURES.find((figure) => figure.key === requestedFigure);

    if (nextStatic && requestedMode !== 'billy') {
      setMode('static');
      setStaticFig(nextStatic);
      return;
    }
    if (nextAnimated && requestedMode === 'animated') {
      setMode('animated');
      setAnimFig(nextAnimated);
      return;
    }
    setMode(nextMode);
  }, [requestedFigure, requestedMode]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0604',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {chromeOpen && (
        <header
          style={{
            padding: '14px 22px 12px',
            borderBottom: '1px solid rgba(240,216,152,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(240,216,152,0.55)',
            }}
          >
            3D Figures · preview
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ModeButton active={mode === 'static'} onClick={() => setMode('static')}>
              Static
            </ModeButton>
            <ModeButton active={mode === 'animated'} onClick={() => setMode('animated')}>
              Animated
            </ModeButton>
            <ModeButton active={mode === 'billy'} onClick={() => setMode('billy')}>
              Billy 3D
            </ModeButton>
            <Link
              href="/figure-stars?figure=billy"
              style={{
                border: '1px solid rgba(240,216,152,0.25)',
                borderRadius: 999,
                color: 'rgba(240,216,152,0.7)',
                fontFamily: SERIF,
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '6px 14px',
                textDecoration: 'none',
              }}
            >
              Billy Stars
            </Link>
            <button
              type="button"
              onClick={() => setChromeOpen(false)}
              title="Full view"
              aria-label="Full view"
              style={{
                border: '1px solid rgba(240,216,152,0.25)',
                borderRadius: 999,
                background: 'transparent',
                color: 'rgba(240,216,152,0.7)',
                fontFamily: SERIF,
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              ⤢ Full view
            </button>
          </div>
          {mode !== 'billy' && (
            <div style={{ display: 'flex', gap: 6 }}>
              {(mode === 'static' ? STATIC_FIGURES : ANIMATED_FIGURES).map((f) => {
                const isActive =
                  mode === 'static' ? staticFig.key === f.key : animFig.key === f.key;
                return (
                  <ModeButton
                    key={f.key}
                    active={isActive}
                    onClick={() => {
                      if (mode === 'static') setStaticFig(f as FigureAsset);
                      else setAnimFig(f as (typeof ANIMATED_FIGURES)[number]);
                    }}
                  >
                    {f.label}
                  </ModeButton>
                );
              })}
            </div>
          )}
        </header>
      )}
      <div style={{ flex: 1, position: 'relative' }}>
        {mode === 'static' && (
          <GoldenGod
            key={staticFig.key}
            assetUrl={staticFig.url}
            goldColor={staticFig.goldColor}
            hologramColor={staticFig.hologramColor}
            starColor={staticFig.starColor}
          />
        )}
        {mode === 'animated' && (
          <AnimatedFigure key={animFig.key} assetUrl={animFig.url} color={animFig.color} />
        )}
        {mode === 'billy' && <Billy3D />}
        {!chromeOpen && (
          <button
            type="button"
            onClick={() => setChromeOpen(true)}
            title="Show menu"
            aria-label="Show menu"
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(8,6,4,0.32)',
              border: '1px solid rgba(240,216,152,0.3)',
              borderRadius: 999,
              color: 'rgba(240,216,152,0.8)',
              fontSize: 11,
              lineHeight: 1,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              opacity: 0.5,
              zIndex: 20,
            }}
          >
            ◤
          </button>
        )}
      </div>
    </div>
  );
}

function getInitialMode(mode: string | null): Mode {
  if (mode === 'animated' || mode === 'billy') return mode;
  return 'static';
}

function findStaticFigure(key: string | null) {
  return STATIC_FIGURES.find((figure) => figure.key === key);
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        background: active ? 'rgba(255,200,100,0.18)' : 'transparent',
        border: `1px solid ${active ? 'rgba(255,200,100,0.55)' : 'rgba(240,216,152,0.25)'}`,
        borderRadius: 999,
        color: active ? '#FFD080' : 'rgba(240,216,152,0.7)',
        fontFamily: SERIF,
        fontSize: 12,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        padding: '6px 14px',
      }}
    >
      {children}
    </button>
  );
}
