'use client';

import { useEffect, useState } from 'react';
import ActiveCompartments from '@/components/ActiveCompartments';
import ArchetypeBridge from '@/components/ArchetypeBridge';
import CheckInPing from '@/components/CheckInPing';
import ColourMapPanel from '@/components/ColourMapPanel';
import DailyRituals from '@/components/DailyRituals';
import DayRoad from '@/components/DayRoad';
import DayTabs, { type BackgroundPlacement } from '@/components/DayTabs';
import DayView3D from '@/components/DayView3D';
import FeelingCircles2 from '@/components/FeelingCircles2';
import FirstRunOnboarding from '@/components/FirstRunOnboarding';
import IdeaConstellation from '@/components/IdeaConstellation';
import InfographicsView from '@/components/InfographicsView';
import InnerWork from '@/components/InnerWork';
import LearningHub from '@/components/LearningHub';
import MissionDesignSwitcher from '@/components/MissionDesignSwitcher';
import Overview2 from '@/components/Overview2';
import TodaysField from '@/components/TodaysField';
import { hydrate } from '@/lib/sync';

const DAY_EMOTION_IMAGES = ['/emotions/emotion-sunset-1.webp', '/emotions/emotion-sunset-2.webp'];
const ROUND_WINDOW_EMOTION_IMAGE = '/emotions/emotion-round-window-1.webp';
const AREA_FILL_EMOTION_IMAGES = [ROUND_WINDOW_EMOTION_IMAGE, ...DAY_EMOTION_IMAGES];
const MISSION_AREA_IMAGE = '/emotions/mission-terrace-1.webp';
const PROGRESS_AREA_IMAGE = '/emotions/progress-observatory-1.webp';

const NIGHT_EMOTION_IMAGES = [
  '/emotions/emotion-city-night-1.webp',
  '/emotions/emotion-city-night-2.webp',
];

const EMOTION_BACKDROPS = [...NIGHT_EMOTION_IMAGES, ...DAY_EMOTION_IMAGES];

type EmotionVisualDesign = 1 | 2 | 3;
type FocusDesignMode = 'sober' | 'image';
type LaneKey = 'emotion' | 'mission' | 'progress';
type LanePlacements = Record<LaneKey, BackgroundPlacement>;
type LaneImages = Record<LaneKey, string | null>;

const LANE_IMAGE_OPTIONS: Record<LaneKey, { label: string; src: string }[]> = {
  emotion: [
    { label: 'Round window', src: ROUND_WINDOW_EMOTION_IMAGE },
    { label: 'Sunset 1', src: DAY_EMOTION_IMAGES[0] },
    { label: 'Sunset 2', src: DAY_EMOTION_IMAGES[1] },
    { label: 'Night 1', src: NIGHT_EMOTION_IMAGES[0] },
    { label: 'Night 2', src: NIGHT_EMOTION_IMAGES[1] },
  ],
  mission: [
    { label: 'Mission terrace', src: MISSION_AREA_IMAGE },
    { label: 'Emotion sunset 1', src: DAY_EMOTION_IMAGES[0] },
    { label: 'Emotion sunset 2', src: DAY_EMOTION_IMAGES[1] },
  ],
  progress: [
    { label: 'Observatory', src: PROGRESS_AREA_IMAGE },
    { label: 'Emotion sunset 1', src: DAY_EMOTION_IMAGES[0] },
    { label: 'Emotion sunset 2', src: DAY_EMOTION_IMAGES[1] },
  ],
};

const DEFAULT_LANE_PLACEMENTS: LanePlacements = {
  emotion: { x: 44, y: 0, zoom: 36 },
  mission: { x: 100, y: 0, zoom: 119 },
  progress: { x: 50, y: 0, zoom: 132 },
};

const PHONE_LANE_PLACEMENTS: Partial<LanePlacements> = {
  emotion: { x: 80, y: 0, zoom: 181 },
};

const PLACEMENT_KEY = 'colourmap:lane-background-placement';
const IMAGE_KEY = 'colourmap:lane-background-images';
const FOCUS_DESIGN_MODE_KEY = 'colourmap:focus-design-mode';

function getEmotionImagePosition(image: string, nightMode: boolean) {
  if (image === ROUND_WINDOW_EMOTION_IMAGE) return 'center 36%';
  return nightMode ? 'center 42%' : 'center 48%';
}

function getLaneImagePosition(tone: 'mission' | 'progress') {
  return tone === 'mission' ? 'center 48%' : 'center 45%';
}

function loadLanePlacements(): LanePlacements {
  try {
    const raw = localStorage.getItem(PLACEMENT_KEY);
    if (!raw) return DEFAULT_LANE_PLACEMENTS;
    const parsed = JSON.parse(raw) as Partial<Record<LaneKey, Partial<BackgroundPlacement>>>;
    return {
      emotion: { ...DEFAULT_LANE_PLACEMENTS.emotion, ...parsed.emotion },
      mission: { ...DEFAULT_LANE_PLACEMENTS.mission, ...parsed.mission },
      progress: { ...DEFAULT_LANE_PLACEMENTS.progress, ...parsed.progress },
    };
  } catch {
    return DEFAULT_LANE_PLACEMENTS;
  }
}

function loadLaneImages(): LaneImages {
  try {
    const raw = localStorage.getItem(IMAGE_KEY);
    if (!raw) return { emotion: null, mission: null, progress: null };
    const parsed = JSON.parse(raw) as Partial<LaneImages>;
    return {
      emotion: parsed.emotion ?? null,
      mission: parsed.mission ?? null,
      progress: parsed.progress ?? null,
    };
  } catch {
    return { emotion: null, mission: null, progress: null };
  }
}

function loadFocusDesignMode(): FocusDesignMode {
  try {
    return localStorage.getItem(FOCUS_DESIGN_MODE_KEY) === 'image' ? 'image' : 'sober';
  } catch {
    return 'sober';
  }
}

function FocusDesignPill({
  value,
  onChange,
  floating = false,
}: {
  value: FocusDesignMode;
  onChange: (next: FocusDesignMode) => void;
  floating?: boolean;
}) {
  return (
    <fieldset
      aria-label="Focus design mode"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--panel-border, rgba(196,160,96,0.22))',
        borderRadius: 999,
        background: floating
          ? 'rgba(18,10,5,0.30)'
          : 'color-mix(in srgb, var(--card) 54%, transparent)',
        padding: 1,
        gap: 1,
        margin: 0,
        backdropFilter: floating ? 'blur(8px)' : undefined,
      }}
    >
      {(
        [
          ['sober', 'S'],
          ['image', 'I'],
        ] as const
      ).map(([mode, label]) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-label={mode === 'sober' ? 'Use sober focus design' : 'Use image focus design'}
            aria-pressed={active}
            title={mode === 'sober' ? 'Sober mode' : 'Image mode'}
            style={{
              border: 0,
              borderRadius: 999,
              width: 22,
              height: 22,
              padding: 0,
              background: active ? 'rgba(196,160,96,0.22)' : 'transparent',
              color: floating
                ? active
                  ? 'rgba(246,222,156,0.96)'
                  : 'rgba(246,222,156,0.54)'
                : active
                  ? 'var(--palette-panel-text, #5C3018)'
                  : 'var(--palette-panel-muted, rgba(122,84,56,0.52))',
              fontFamily: 'var(--font-serif)',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 0,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </fieldset>
  );
}

function PlacementTuner({
  lane,
  placement,
  onChange,
  image,
  onImageChange,
}: {
  lane: LaneKey;
  placement: BackgroundPlacement;
  onChange: (next: BackgroundPlacement) => void;
  image?: string | null;
  onImageChange: (src: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const defaults = DEFAULT_LANE_PLACEMENTS[lane];
  const currentImage = image ?? LANE_IMAGE_OPTIONS[lane][0]?.src ?? '';
  const code = `${lane} x ${placement.x} y ${placement.y} zoom ${placement.zoom}`;

  function update(key: keyof BackgroundPlacement, value: number) {
    onChange({ ...placement, [key]: value });
  }

  function loadLocalImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onImageChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        margin: '0 0 10px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          border: '1px solid rgba(240,216,152,0.28)',
          borderRadius: 999,
          background: 'rgba(18,10,5,0.32)',
          color: 'rgba(240,216,152,0.86)',
          fontFamily: 'var(--font-serif)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.12em',
          padding: '4px 12px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        Place image
      </button>
      {open && (
        <div
          style={{
            width: 'min(560px, calc(100vw - 28px))',
            border: '1px solid rgba(240,216,152,0.24)',
            borderRadius: 12,
            background: 'rgba(18,10,5,0.52)',
            color: 'rgba(240,216,152,0.88)',
            padding: 12,
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <label
              style={{
                display: 'grid',
                gridTemplateColumns: '54px 1fr',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>image</span>
              <select
                value={currentImage.startsWith('data:') ? '__custom__' : currentImage}
                onChange={(event) => {
                  if (event.target.value === '__custom__') return;
                  onImageChange(event.target.value);
                }}
                style={{
                  width: '100%',
                  border: '1px solid rgba(240,216,152,0.22)',
                  borderRadius: 8,
                  background: 'rgba(255,248,226,0.08)',
                  color: 'rgba(240,216,152,0.9)',
                  padding: '6px 8px',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {currentImage.startsWith('data:') && (
                  <option value="__custom__">Custom image</option>
                )}
                {LANE_IMAGE_OPTIONS[lane].map((option) => (
                  <option key={option.src} value={option.src}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{
                display: 'grid',
                gridTemplateColumns: '54px 1fr',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>file</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => loadLocalImage(event.target.files?.[0])}
                style={{ width: '100%', color: 'rgba(240,216,152,0.82)' }}
              />
            </label>
            <PlacementSlider label="x" value={placement.x} min={0} max={100} onChange={update} />
            <PlacementSlider label="y" value={placement.y} min={-40} max={100} onChange={update} />
            <PlacementSlider
              label="zoom"
              value={placement.zoom}
              min={35}
              max={220}
              onChange={update}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              paddingTop: 10,
            }}
          >
            <code style={{ color: 'rgba(240,216,152,0.9)' }}>{code}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(code)}
              style={{
                border: '1px solid rgba(240,216,152,0.28)',
                borderRadius: 999,
                background: 'rgba(255,248,226,0.08)',
                color: 'rgba(240,216,152,0.9)',
                fontFamily: 'var(--font-serif)',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '4px 10px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(defaults);
                onImageChange(null);
              }}
              style={{
                border: '1px solid rgba(240,216,152,0.2)',
                borderRadius: 999,
                background: 'rgba(255,248,226,0.05)',
                color: 'rgba(240,216,152,0.78)',
                fontFamily: 'var(--font-serif)',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '4px 10px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlacementSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: keyof BackgroundPlacement;
  value: number;
  min: number;
  max: number;
  onChange: (key: keyof BackgroundPlacement, value: number) => void;
}) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '54px 1fr 42px',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(label, Number(event.target.value))}
        aria-label={`${label} background placement`}
        style={{ accentColor: '#FFD080', width: '100%' }}
      />
      <span style={{ textAlign: 'right' }}>{value}</span>
    </label>
  );
}

function EmotionMoodSurface({
  children,
  design,
  focusMode,
  onFocusModeChange,
  imageIndex,
  imageOverride,
  onImageChange,
  placement,
  onPlacementChange,
}: {
  children: React.ReactNode;
  design: EmotionVisualDesign;
  focusMode: FocusDesignMode;
  onFocusModeChange: (next: FocusDesignMode) => void;
  imageIndex: number;
  imageOverride: string | null;
  onImageChange: (src: string | null) => void;
  placement: BackgroundPlacement;
  onPlacementChange: (next: BackgroundPlacement) => void;
}) {
  const [isLightTheme, setIsLightTheme] = useState(true);
  const [nightMode, setNightMode] = useState(false);
  const areaFill = focusMode === 'image';
  const images = nightMode ? NIGHT_EMOTION_IMAGES : DAY_EMOTION_IMAGES;
  const areaFillImages = areaFill ? AREA_FILL_EMOTION_IMAGES : images;
  const currentImage =
    imageOverride ??
    (areaFill ? ROUND_WINDOW_EMOTION_IMAGE : areaFillImages[imageIndex % areaFillImages.length]) ??
    DAY_EMOTION_IMAGES[0];
  const currentPosition = getEmotionImagePosition(currentImage, nightMode);

  useEffect(() => {
    function syncLightTheme() {
      const color = localStorage.getItem('colourmap-theme') ?? 'paper';
      const palette = localStorage.getItem('colourmap-palette') ?? 'light-brown';
      setIsLightTheme(color === 'golden' || (color === 'paper' && palette === 'light-brown'));
    }

    syncLightTheme();
    const observer = new MutationObserver(syncLightTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', syncLightTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncLightTheme);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      setNightMode(root.classList.contains('dark'));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        overflow: areaFill ? 'visible' : 'hidden',
        width: areaFill ? '100%' : undefined,
        marginTop: areaFill ? -1 : undefined,
        borderRadius: areaFill || isLightTheme ? 0 : 18,
        padding: areaFill
          ? '0 0 40px'
          : isLightTheme
            ? '0 0 14px'
            : design === 2
              ? '8px 8px 14px'
              : '12px 8px 14px',
        minHeight: areaFill ? 'calc(100svh - 168px)' : undefined,
        background: areaFill
          ? 'transparent'
          : isLightTheme
            ? 'transparent'
            : 'linear-gradient(180deg, var(--palette-l2-bg, rgba(30,16,8,0.54)), color-mix(in srgb, var(--palette-l2-bg, rgba(30,16,8,0.54)) 82%, black))',
        boxShadow:
          areaFill || isLightTheme
            ? 'none'
            : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 42px rgba(0,0,0,0.14)',
      }}
    >
      <div
        style={{
          position: areaFill ? 'absolute' : 'relative',
          zIndex: 3,
          top: areaFill ? -42 : undefined,
          left: areaFill ? 8 : undefined,
          right: areaFill ? 8 : undefined,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          margin: areaFill ? 0 : '0 0 10px',
          pointerEvents: 'auto',
        }}
      >
        {areaFill && (
          <PlacementTuner
            lane="emotion"
            placement={placement}
            onChange={onPlacementChange}
            image={currentImage}
            onImageChange={onImageChange}
          />
        )}
        <FocusDesignPill
          value={focusMode}
          onChange={onFocusModeChange}
          floating={areaFill || !isLightTheme}
        />
      </div>
      {design === 1 && !areaFill && (
        <div
          style={{
            border: '1px solid var(--panel-border, rgba(122,84,56,0.22))',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'var(--card)',
            boxShadow: '0 12px 28px rgba(92,48,24,0.1)',
          }}
        >
          <img
            src={currentImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '16 / 7',
              objectFit: 'cover',
              objectPosition: currentPosition,
              transition: 'opacity 900ms ease',
            }}
          />
        </div>
      )}
      <div
        className={areaFill ? undefined : 'space-y-3'}
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'transparent',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AreaFillLaneSurface({
  children,
  focusMode,
  onFocusModeChange,
  image,
  label,
  tone,
  soberBanner = false,
  onImageChange,
  placement,
  onPlacementChange,
}: {
  children: React.ReactNode;
  focusMode: FocusDesignMode;
  onFocusModeChange: (next: FocusDesignMode) => void;
  image: string;
  label: string;
  tone: 'mission' | 'progress';
  soberBanner?: boolean;
  onImageChange: (src: string | null) => void;
  placement: BackgroundPlacement;
  onPlacementChange: (next: BackgroundPlacement) => void;
}) {
  const areaFill = focusMode === 'image';
  const imagePosition = getLaneImagePosition(tone);
  return (
    <div
      style={{
        position: 'relative',
        overflow: areaFill ? 'visible' : 'hidden',
        width: areaFill ? '100%' : undefined,
        padding: areaFill ? '0 0 40px' : '0 0 14px',
        minHeight: areaFill ? 'calc(100svh - 168px)' : undefined,
      }}
    >
      <div
        style={{
          position: areaFill ? 'absolute' : 'relative',
          zIndex: 3,
          top: areaFill ? -42 : undefined,
          left: areaFill ? 8 : undefined,
          right: areaFill ? 8 : undefined,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          margin: areaFill ? 0 : '0 0 10px',
          pointerEvents: 'auto',
        }}
      >
        {areaFill && (
          <PlacementTuner
            lane={tone}
            placement={placement}
            onChange={onPlacementChange}
            image={image}
            onImageChange={onImageChange}
          />
        )}
        <FocusDesignPill value={focusMode} onChange={onFocusModeChange} floating={areaFill} />
      </div>
      {!areaFill && soberBanner && (
        <div
          style={{
            border: '1px solid var(--panel-border, rgba(122,84,56,0.22))',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'var(--card)',
            boxShadow: '0 12px 28px rgba(92,48,24,0.1)',
            marginBottom: 12,
          }}
        >
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="eager"
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '16 / 7',
              objectFit: 'cover',
              objectPosition: imagePosition,
            }}
          />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

function DayContent() {
  const [roadOpen, setRoadOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [starsOpen, setStarsOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [experimentsOpen, setExperimentsOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [focusDesignMode, setFocusDesignMode] = useState<FocusDesignMode>('sober');
  const [emotionImageIndex, setEmotionImageIndex] = useState(0);
  const [lanePlacements, setLanePlacements] = useState<LanePlacements>(DEFAULT_LANE_PLACEMENTS);
  const [laneImages, setLaneImages] = useState<LaneImages>({
    emotion: null,
    mission: null,
    progress: null,
  });

  // Silently restore server state into localStorage on mount.
  // Current session renders from whatever is already local (instant).
  // Next session (or cross-device) benefits from the restored values.
  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    setLanePlacements(loadLanePlacements());
    setLaneImages(loadLaneImages());
    setFocusDesignMode(loadFocusDesignMode());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(
      () => setEmotionImageIndex((current) => (current + 1) % EMOTION_BACKDROPS.length),
      18_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  function changeFocusDesignMode(next: FocusDesignMode) {
    setFocusDesignMode(next);
    try {
      localStorage.setItem(FOCUS_DESIGN_MODE_KEY, next);
    } catch {}
  }

  function changeLanePlacement(lane: LaneKey, next: BackgroundPlacement) {
    setLanePlacements((current) => {
      const updated = { ...current, [lane]: next };
      try {
        localStorage.setItem(PLACEMENT_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  function changeLaneImage(lane: LaneKey, src: string | null) {
    setLaneImages((current) => {
      const updated = { ...current, [lane]: src };
      try {
        localStorage.setItem(IMAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem('colourmap:open-education') === '1') {
        sessionStorage.removeItem('colourmap:open-education');
        setLearnOpen(true);
      }
    } catch {}
  }, []);

  const imageBackedFocus = focusDesignMode === 'image';

  return (
    <div
      className="mx-auto w-full max-w-2xl space-y-4 px-2 sm:px-4"
      style={{ paddingTop: imageBackedFocus ? 0 : 12, paddingBottom: 36 }}
    >
      <FirstRunOnboarding />
      {!imageBackedFocus && <TodaysField />}
      {!imageBackedFocus && <CheckInPing />}
      {starsOpen && <IdeaConstellation onClose={() => setStarsOpen(false)} />}
      {learnOpen && <LearningHub onClose={() => setLearnOpen(false)} />}

      <DayTabs
        headerBackdrops={{
          emotion: {
            enabled: imageBackedFocus,
            image:
              laneImages.emotion ??
              (imageBackedFocus
                ? ROUND_WINDOW_EMOTION_IMAGE
                : EMOTION_BACKDROPS[emotionImageIndex]),
            dayImage: true,
            position: imageBackedFocus
              ? getEmotionImagePosition(ROUND_WINDOW_EMOTION_IMAGE, false)
              : 'center 46%',
            placement: {
              ...lanePlacements.emotion,
              phone: PHONE_LANE_PLACEMENTS.emotion,
            },
            fullBleed: imageBackedFocus,
          },
          mission: {
            enabled: imageBackedFocus,
            image: laneImages.mission ?? MISSION_AREA_IMAGE,
            dayImage: true,
            position: getLaneImagePosition('mission'),
            placement: lanePlacements.mission,
            fullBleed: true,
            overlay: 'rgba(48,22,7,0.34)',
          },
          progress: {
            enabled: imageBackedFocus,
            image: laneImages.progress ?? PROGRESS_AREA_IMAGE,
            dayImage: true,
            position: getLaneImagePosition('progress'),
            placement: lanePlacements.progress,
            fullBleed: true,
            overlay: 'rgba(17,28,22,0.36)',
          },
        }}
        emotionContent={
          <EmotionMoodSurface
            design={1}
            focusMode={focusDesignMode}
            onFocusModeChange={changeFocusDesignMode}
            imageIndex={emotionImageIndex}
            imageOverride={laneImages.emotion}
            onImageChange={(src) => changeLaneImage('emotion', src)}
            placement={lanePlacements.emotion}
            onPlacementChange={(next) => changeLanePlacement('emotion', next)}
          >
            {imageBackedFocus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <InnerWork />
                <FeelingCircles2 visualDesign={1} />
              </div>
            ) : (
              <>
                <InnerWork />
                <div style={{ height: 20 }} />
                <FeelingCircles2 visualDesign={1} />
              </>
            )}
            {/* Experiments â€” collapsible pill */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                paddingTop: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setExperimentsOpen((v) => !v)}
                style={{
                  padding: '4px 18px',
                  borderRadius: 20,
                  border: `1px solid ${experimentsOpen ? 'var(--panel-border, rgba(122,84,56,0.45))' : 'var(--panel-border, rgba(122,84,56,0.22))'}`,
                  background: 'transparent',
                  color: 'var(--light-surface-muted, #7A5438)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Experiments
                <span style={{ fontSize: 8, opacity: 0.4 }}>{experimentsOpen ? 'â–²' : 'â–¼'}</span>
              </button>
              {experimentsOpen && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(
                    [
                      { label: 'Road', active: roadOpen, toggle: () => setRoadOpen((v) => !v) },
                      { label: 'Map', active: mapOpen, toggle: () => setMapOpen((v) => !v) },
                      { label: 'View', active: viewOpen, toggle: () => setViewOpen((v) => !v) },
                    ] as const
                  ).map(({ label, active, toggle }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={toggle}
                      style={{
                        padding: '4px 14px',
                        borderRadius: 20,
                        border: `1px solid ${active ? 'var(--panel-border, rgba(92,48,24,0.55))' : 'var(--panel-border, rgba(122,84,56,0.28))'}`,
                        background: active
                          ? 'var(--palette-l3-bg, rgba(92,48,24,0.1))'
                          : 'transparent',
                        color: active
                          ? 'var(--light-surface-text, #5C3018)'
                          : 'var(--light-surface-muted, #7A5438)',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {roadOpen && <DayRoad embedded onClose={() => setRoadOpen(false)} />}
            {mapOpen && <InfographicsView embedded onClose={() => setMapOpen(false)} />}
            {viewOpen && <DayView3D embedded onClose={() => setViewOpen(false)} />}
          </EmotionMoodSurface>
        }
        missionContent={
          <AreaFillLaneSurface
            focusMode={focusDesignMode}
            onFocusModeChange={changeFocusDesignMode}
            image={laneImages.mission ?? MISSION_AREA_IMAGE}
            label="Mission"
            tone="mission"
            soberBanner
            onImageChange={(src) => changeLaneImage('mission', src)}
            placement={lanePlacements.mission}
            onPlacementChange={(next) => changeLanePlacement('mission', next)}
          >
            <div
              className={imageBackedFocus ? undefined : 'space-y-3'}
              style={
                imageBackedFocus ? { display: 'flex', flexDirection: 'column', gap: 0 } : undefined
              }
            >
              {imageBackedFocus ? (
                <>
                  <ColourMapPanel surfaceMode="image" />
                  <MissionDesignSwitcher surfaceMode="image" />
                  <DailyRituals surfaceMode="image" />
                </>
              ) : (
                <>
                  <MissionDesignSwitcher
                    beforeContent={
                      <>
                        <ActiveCompartments />
                        <ColourMapPanel />
                      </>
                    }
                  />
                  <div style={{ paddingTop: 16 }}>
                    <DailyRituals />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setStarsOpen(true)}
                  style={{
                    padding: '5px 20px',
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
                  Constellation
                </button>
              </div>
            </div>
          </AreaFillLaneSurface>
        }
        progressContent={
          <AreaFillLaneSurface
            focusMode={focusDesignMode}
            onFocusModeChange={changeFocusDesignMode}
            image={laneImages.progress ?? PROGRESS_AREA_IMAGE}
            label="Progress"
            tone="progress"
            soberBanner
            onImageChange={(src) => changeLaneImage('progress', src)}
            placement={lanePlacements.progress}
            onPlacementChange={(next) => changeLanePlacement('progress', next)}
          >
            <div className="space-y-3">
              <Overview2 />
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setModesOpen((v) => !v)}
                  style={{
                    padding: '5px 20px',
                    borderRadius: 999,
                    border: `1px solid ${modesOpen ? 'var(--panel-border, rgba(92,48,24,0.55))' : 'var(--panel-border, rgba(122,84,56,0.28))'}`,
                    background: modesOpen
                      ? 'var(--palette-l3-bg, rgba(92,48,24,0.1))'
                      : 'transparent',
                    color: modesOpen
                      ? 'var(--light-surface-text, #5C3018)'
                      : 'var(--light-surface-muted, #7A5438)',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11,
                    fontWeight: modesOpen ? 700 : 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Modes
                </button>
              </div>
              {modesOpen && <ArchetypeBridge />}
            </div>
          </AreaFillLaneSurface>
        }
      />
    </div>
  );
}

export default function DayPage() {
  return <DayContent />;
}
