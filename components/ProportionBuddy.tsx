'use client';

import type { PointerEvent, WheelEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type OverlayMode = 'lines' | 'x' | 'triangle';

type CustomLandmark = {
  id: string;
  label: string;
  cm: number;
  color: string;
  visible: boolean;
};

type ReferenceImage = {
  id: string;
  name: string;
  image: string | null;
  offsetX: number;
  offsetY: number;
  zoom: number;
  stretchY: number;
  topCrop: number;
  bottomCrop: number;
  baseOffset: number;
  gridHeight: number;
  fixed: boolean;
};

type BuddyState = {
  version: number;
  image: string | null;
  activeReferenceId: string;
  suggestionMode: boolean;
  showGrid: boolean;
  showProportions: boolean;
  showLabels: boolean;
  references: ReferenceImage[];
  totalHeight: number;
  topSkull: number;
  browRidge: number;
  eyes: number;
  noseBase: number;
  mouth: number;
  chin: number;
  baseNeck: number;
  highestShoulder: number;
  shoulderJoint: number;
  shirtOpen: number;
  visibleArmpits: number;
  armsCrossTop: number;
  armsCrossBottom: number;
  armsBottom: number;
  elbowCenter: number;
  headBase: number;
  headLow: number;
  headHigh: number;
  topCrop: number;
  bottomCrop: number;
  gridStep: number;
  overlayMode: OverlayMode;
  customLandmarks: CustomLandmark[];
  visible: Record<string, boolean>;
};

const STORAGE_KEY = 'colourmap:proportion-buddy';
const STATE_VERSION = 7;
const CUSTOM_COLORS = ['#ffd166', '#7bdff2', '#f7aef8', '#b8f2e6', '#f08080', '#c4f07a'];
const MIN_IMAGE_Y = -620;
const MAX_IMAGE_Y = 360;
const MIN_IMAGE_ZOOM = 40;
const MAX_IMAGE_ZOOM = 900;
const MIN_GRID_ZERO = -140;
const MAX_GRID_ZERO = 240;
const MIN_GRID_HEIGHT = 40;
const MAX_GRID_HEIGHT = 280;
const GRID_RULER_GUTTER_PX = 34;
const X_RULER_LABEL_START_CM = 10;
const X_RULER_LEFT_GUTTER_PERCENT = 5;
const EXTRA_GRID_LINES = [88];
const DEFAULT_REFERENCES: ReferenceImage[] = [
  {
    id: 'image-1',
    name: 'Face',
    image: '/proportion-buddy/prop-image-face.jpg',
    offsetX: 0,
    offsetY: 25,
    zoom: 92,
    stretchY: 108,
    topCrop: 0,
    bottomCrop: 100,
    baseOffset: -1,
    gridHeight: 71,
    fixed: false,
  },
  {
    id: 'image-2',
    name: 'Front',
    image: '/proportion-buddy/prop-2.png',
    offsetX: 0,
    offsetY: -4,
    zoom: 106,
    stretchY: 106,
    topCrop: 0,
    bottomCrop: 100,
    baseOffset: 0,
    gridHeight: 100,
    fixed: false,
  },
  {
    id: 'image-3',
    name: 'Front 2',
    image: '/proportion-buddy/prop-3.png',
    offsetX: 0,
    offsetY: 11,
    zoom: 106,
    stretchY: 106,
    topCrop: 0,
    bottomCrop: 100,
    baseOffset: 0,
    gridHeight: 78,
    fixed: false,
  },
  {
    id: 'image-4',
    name: 'Left',
    image: '/proportion-buddy/prop-image-left.png',
    offsetX: 0,
    offsetY: -6,
    zoom: 108,
    stretchY: 108,
    topCrop: 0,
    bottomCrop: 100,
    baseOffset: 0,
    gridHeight: 100,
    fixed: false,
  },
  {
    id: 'image-5',
    name: 'Board',
    image: '/proportion-buddy/proportions-board.png',
    offsetX: 0,
    offsetY: 0,
    zoom: 100,
    stretchY: 100,
    topCrop: 0,
    bottomCrop: 100,
    baseOffset: 0,
    gridHeight: 100,
    fixed: false,
  },
  {
    id: 'image-6',
    name: 'Plinth',
    image: '/proportion-buddy/front-plinth.png',
    offsetX: 0,
    offsetY: -5,
    zoom: 106,
    stretchY: 106,
    topCrop: 0,
    bottomCrop: 100,
    baseOffset: 0,
    gridHeight: 100,
    fixed: false,
  },
];

const DEFAULT_STATE: BuddyState = {
  version: STATE_VERSION,
  image: null,
  activeReferenceId: 'image-2',
  suggestionMode: false,
  showGrid: true,
  showProportions: false,
  showLabels: false,
  references: DEFAULT_REFERENCES,
  totalHeight: 90,
  topSkull: 82,
  browRidge: 72,
  eyes: 70,
  noseBase: 66,
  mouth: 63,
  chin: 60,
  baseNeck: 52,
  highestShoulder: 51,
  shoulderJoint: 44.5,
  shirtOpen: 48,
  visibleArmpits: 41,
  armsCrossTop: 34,
  armsCrossBottom: 24,
  armsBottom: 17,
  elbowCenter: 27,
  headBase: 62,
  headLow: 80,
  headHigh: 84,
  topCrop: 0,
  bottomCrop: 100,
  gridStep: 2,
  overlayMode: 'lines',
  customLandmarks: [],
  visible: {
    topSkull: true,
    browRidge: false,
    eyes: false,
    noseBase: false,
    mouth: false,
    chin: true,
    baseNeck: true,
    highestShoulder: false,
    shoulderJoint: true,
    shirtOpen: true,
    visibleArmpits: true,
    armsCrossTop: true,
    armsCrossBottom: true,
    armsBottom: true,
    elbowCenter: true,
    headBase: true,
  },
};

const LANDMARKS = [
  { key: 'topSkull', label: 'top skull', color: '#c7a8ff' },
  { key: 'browRidge', label: 'brow ridge', color: '#f3a6ca' },
  { key: 'eyes', label: 'eyes', color: '#f28a4b' },
  { key: 'noseBase', label: 'nose base', color: '#f4d35e' },
  { key: 'mouth', label: 'mouth', color: '#91d17f' },
  { key: 'chin', label: 'bottom chin', color: '#75c6ed' },
  { key: 'baseNeck', label: 'base neck', color: '#f4e96b' },
  { key: 'highestShoulder', label: 'highest shoulder', color: '#ff8b58' },
  { key: 'shirtOpen', label: 'shirt opening V', color: '#e7a0bd' },
  { key: 'shoulderJoint', label: 'shoulder joint', color: '#b99cff' },
  { key: 'visibleArmpits', label: 'visible armpits', color: '#c2db8a' },
  { key: 'armsCrossTop', label: 'arms crossing top', color: '#f3be73' },
  { key: 'elbowCenter', label: 'elbow center', color: '#8bd17f' },
  { key: 'armsCrossBottom', label: 'arms crossing bottom', color: '#d69a6d' },
  { key: 'armsBottom', label: 'bottom arms', color: '#57b8eb' },
  { key: 'headBase', label: 'head base', color: '#d6c0ff' },
] as const;

type LandmarkKey = (typeof LANDMARKS)[number]['key'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function xPositionPercent(cm: number, totalHeight: number) {
  return (
    X_RULER_LEFT_GUTTER_PERCENT +
    (clamp(cm, 0, totalHeight) / Math.max(1, totalHeight)) * (100 - X_RULER_LEFT_GUTTER_PERCENT)
  );
}

function isMajorGridLine(cm: number, totalHeight: number) {
  return cm % 10 === 0 || cm === totalHeight || EXTRA_GRID_LINES.includes(cm);
}

function xRulerLabelSide(cm: number, totalHeight: number) {
  if (cm >= totalHeight - 10) return 'left';
  return 'right';
}

function loadState(): BuddyState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<BuddyState> & { showGuides?: boolean };
    if (parsed.version !== STATE_VERSION) {
      return {
        ...DEFAULT_STATE,
        customLandmarks: parsed.customLandmarks ?? DEFAULT_STATE.customLandmarks,
        visible: { ...DEFAULT_STATE.visible, ...(parsed.visible ?? {}) },
      };
    }
    const rawReferences =
      parsed.references && parsed.references.length > 0
        ? parsed.references
        : DEFAULT_REFERENCES.map((reference) =>
            reference.id === 'image-1' && parsed.image
              ? { ...reference, image: parsed.image }
              : reference,
          );
    const references = DEFAULT_REFERENCES.map((defaultReference) => ({
      ...defaultReference,
      ...(rawReferences.find((reference) => reference.id === defaultReference.id) ?? {}),
    }));
    return {
      ...DEFAULT_STATE,
      ...parsed,
      activeReferenceId:
        parsed.activeReferenceId ?? references[0]?.id ?? DEFAULT_STATE.activeReferenceId,
      suggestionMode: parsed.suggestionMode ?? DEFAULT_STATE.suggestionMode,
      showGrid: parsed.showGrid ?? DEFAULT_STATE.showGrid,
      showProportions:
        parsed.showProportions ??
        (parsed.showGuides === undefined ? DEFAULT_STATE.showProportions : parsed.showGuides),
      showLabels: parsed.showLabels ?? DEFAULT_STATE.showLabels,
      references,
      overlayMode: parsed.overlayMode ?? DEFAULT_STATE.overlayMode,
      customLandmarks: parsed.customLandmarks ?? DEFAULT_STATE.customLandmarks,
      visible: { ...DEFAULT_STATE.visible, ...(parsed.visible ?? {}) },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function guideTopWithBase(cm: number, totalHeight: number, baseOffset: number, gridHeight: number) {
  const ratio = Math.max(0, cm) / totalHeight;
  const zeroLine = 100 + clamp(baseOffset, MIN_GRID_ZERO, MAX_GRID_ZERO);
  const range = clamp(gridHeight, MIN_GRID_HEIGHT, MAX_GRID_HEIGHT);
  return `calc(${zeroLine - ratio * range}% - ${GRID_RULER_GUTTER_PX * (1 - ratio)}px)`;
}

function numberInput(
  label: string,
  value: number,
  onChange: (next: number) => void,
  options: { min?: number; max?: number; step?: number } = {},
) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span
        style={{
          color: 'rgba(82,58,38,0.72)',
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <input
        type="number"
        min={options.min ?? 0}
        max={options.max}
        step={options.step ?? 1}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{
          width: '100%',
          border: '1px solid rgba(116,83,49,0.22)',
          borderRadius: 6,
          background: 'rgba(255,248,231,0.74)',
          color: '#2f2419',
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          padding: '8px 9px',
        }}
      />
    </label>
  );
}

export default function ProportionBuddy() {
  const [state, setState] = useState<BuddyState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftCm, setDraftCm] = useState(42);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    lastY: number;
    pinchDistance: number;
    pinchZoom: number;
    points: Map<number, { x: number; y: number }>;
  }>({
    lastY: 0,
    pinchDistance: 0,
    pinchZoom: 100,
    points: new Map(),
  });

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [hydrated, state]);

  const activeReference =
    state.references.find((reference) => reference.id === state.activeReferenceId) ??
    state.references[0] ??
    DEFAULT_REFERENCES[0];
  const cropTop = clamp(activeReference.topCrop, 0, 96);
  const cropBottom = clamp(activeReference.bottomCrop, cropTop + 4, 100);
  const cropRange = cropBottom - cropTop;
  const baseOffset = clamp(activeReference.baseOffset, MIN_GRID_ZERO, MAX_GRID_ZERO);
  const gridHeight = clamp(activeReference.gridHeight, MIN_GRID_HEIGHT, MAX_GRID_HEIGHT);
  const imageZoom = clamp(activeReference.zoom, MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM);
  const imageOffsetX = clamp(activeReference.offsetX, -80, 80);
  const imageOffsetY = clamp(activeReference.offsetY, MIN_IMAGE_Y, MAX_IMAGE_Y);
  const gridLines = useMemo(() => {
    const lines: number[] = [];
    const step = Math.max(1, state.gridStep);
    for (let cm = 0; cm <= state.totalHeight; cm += step) lines.push(cm);
    for (const cm of EXTRA_GRID_LINES) {
      if (cm <= state.totalHeight && !lines.includes(cm)) lines.push(cm);
    }
    if (!lines.includes(state.totalHeight)) lines.push(state.totalHeight);
    return lines.sort((a, b) => a - b);
  }, [state.gridStep, state.totalHeight]);
  const xGridLines = useMemo(() => {
    const lines: number[] = [];
    for (let cm = 0; cm <= state.totalHeight; cm += 10) lines.push(cm);
    if (!lines.includes(state.totalHeight)) lines.push(state.totalHeight);
    return lines;
  }, [state.totalHeight]);
  const landmarks = useMemo(
    () =>
      LANDMARKS.map((mark) => ({
        ...mark,
        cm: clamp(Number(state[mark.key]), 0, state.totalHeight),
        visible: state.visible[mark.key] ?? true,
      })),
    [state],
  );
  const customLandmarks = useMemo(
    () =>
      state.customLandmarks.map((mark) => ({
        ...mark,
        cm: clamp(mark.cm, 0, state.totalHeight),
      })),
    [state.customLandmarks, state.totalHeight],
  );
  const proportionCards = useMemo(() => {
    const total = Math.max(1, state.totalHeight);
    const headSize = Math.max(0, state.headHigh - state.headBase);
    const fixedCards = [
      { label: 'head size', value: headSize, basis: total },
      { label: 'chin from base', value: state.chin, basis: total },
      { label: 'shirt opening', value: state.shirtOpen, basis: total },
      { label: 'arm crossing top', value: state.armsCrossTop, basis: total },
      { label: 'arm crossing bottom', value: state.armsCrossBottom, basis: total },
      { label: 'elbow center', value: state.elbowCenter, basis: total },
      { label: 'arms from base', value: state.armsBottom, basis: total },
      {
        label: 'arms to shirt',
        value: Math.max(0, state.shirtOpen - state.armsBottom),
        basis: total,
      },
      {
        label: 'head to shirt',
        value: Math.max(0, state.headBase - state.shirtOpen),
        basis: total,
      },
    ];
    return [
      ...fixedCards,
      ...customLandmarks.map((mark) => ({
        label: mark.label,
        value: mark.cm,
        basis: total,
      })),
    ];
  }, [
    state.armsCrossBottom,
    state.armsCrossTop,
    state.armsBottom,
    state.chin,
    state.elbowCenter,
    state.headBase,
    state.headHigh,
    state.shirtOpen,
    state.totalHeight,
    customLandmarks,
  ]);

  function update(patch: Partial<BuddyState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateActiveReference(patch: Partial<ReferenceImage>) {
    setState((current) => ({
      ...current,
      references: current.references.map((reference) =>
        reference.id === current.activeReferenceId ? { ...reference, ...patch } : reference,
      ),
    }));
  }

  function updateActiveReferenceWith(
    updater: (reference: ReferenceImage) => Partial<ReferenceImage>,
  ) {
    setState((current) => ({
      ...current,
      references: current.references.map((reference) =>
        reference.id === current.activeReferenceId
          ? { ...reference, ...updater(reference) }
          : reference,
      ),
    }));
  }

  function updateLandmark(key: LandmarkKey, value: number) {
    update({ [key]: clamp(value, 0, state.totalHeight) } as Partial<BuddyState>);
  }

  function updateCustomLandmark(id: string, patch: Partial<CustomLandmark>) {
    update({
      customLandmarks: state.customLandmarks.map((mark) =>
        mark.id === id
          ? {
              ...mark,
              ...patch,
              cm: patch.cm === undefined ? mark.cm : clamp(patch.cm, 0, state.totalHeight),
            }
          : mark,
      ),
    });
  }

  function addCustomLandmark() {
    const label = draftLabel.trim();
    if (!label) return;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `landmark-${Date.now()}`;
    update({
      customLandmarks: [
        ...state.customLandmarks,
        {
          id,
          label,
          cm: clamp(draftCm, 0, state.totalHeight),
          color: CUSTOM_COLORS[state.customLandmarks.length % CUSTOM_COLORS.length],
          visible: true,
        },
      ],
    });
    setDraftLabel('');
  }

  function removeCustomLandmark(id: string) {
    update({ customLandmarks: state.customLandmarks.filter((mark) => mark.id !== id) });
  }

  function loadImage(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateActiveReference({ image: reader.result });
    };
    reader.readAsDataURL(file);
  }

  function handleStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (activeReference.fixed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureRef.current.lastY = event.clientY;
    if (gestureRef.current.points.size === 2) {
      const points = [...gestureRef.current.points.values()];
      gestureRef.current.pinchDistance = distance(points[0], points[1]);
      gestureRef.current.pinchZoom = imageZoom;
    }
  }

  function handleStagePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (activeReference.fixed) return;
    if (!gestureRef.current.points.has(event.pointerId)) return;
    gestureRef.current.points.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (gestureRef.current.points.size >= 2) {
      const points = [...gestureRef.current.points.values()];
      const nextDistance = distance(points[0], points[1]);
      if (gestureRef.current.pinchDistance > 0) {
        const nextZoom = clamp(
          gestureRef.current.pinchZoom * (nextDistance / gestureRef.current.pinchDistance),
          MIN_IMAGE_ZOOM,
          MAX_IMAGE_ZOOM,
        );
        updateActiveReference({ zoom: Number(nextZoom.toFixed(1)) });
      }
      return;
    }

    const stageHeight = stageRef.current?.getBoundingClientRect().height ?? 1;
    const deltaY = event.clientY - gestureRef.current.lastY;
    gestureRef.current.lastY = event.clientY;
    const deltaPercent = (deltaY / stageHeight) * 100;
    updateActiveReferenceWith((reference) => ({
      offsetY: Number(clamp(reference.offsetY + deltaPercent, MIN_IMAGE_Y, MAX_IMAGE_Y).toFixed(2)),
    }));
  }

  function handleStagePointerUp(event: PointerEvent<HTMLDivElement>) {
    gestureRef.current.points.delete(event.pointerId);
    if (gestureRef.current.points.size === 1) {
      gestureRef.current.lastY = [...gestureRef.current.points.values()][0].y;
    }
    if (gestureRef.current.points.size < 2) {
      gestureRef.current.pinchDistance = 0;
    }
  }

  function handleStageWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (activeReference.fixed) return;
    updateActiveReferenceWith((reference) => ({
      zoom: Number(
        clamp(reference.zoom - event.deltaY * 0.12, MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM).toFixed(1),
      ),
    }));
  }

  return (
    <main
      style={{
        minHeight: 'calc(100svh - 120px)',
        background:
          'linear-gradient(180deg, rgba(236,220,188,0.72), rgba(206,184,145,0.34)), radial-gradient(circle at 20% 12%, rgba(122,84,56,0.10), transparent 34%)',
        borderBlock: '1px solid rgba(116,83,49,0.14)',
        width: 'calc(100% + 48px)',
        overflowX: 'clip',
        marginInline: '-24px',
        padding: 'clamp(3px, 1vw, 10px) 0 clamp(10px, 2vw, 18px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 18,
          alignItems: 'start',
          justifyContent: 'center',
          width: '100%',
        }}
        className="proportion-buddy-shell"
      >
        <section style={{ minWidth: 0, width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              gap: 12,
              alignItems: 'end',
              marginBottom: 12,
              paddingInline: 'clamp(8px, 2vw, 18px)',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: 'rgba(82,58,38,0.58)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                sculpture reference
              </p>
              <h1
                style={{
                  margin: '2px 0 0',
                  color: '#332416',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(28px, 5vw, 48px)',
                  letterSpacing: '0.02em',
                }}
              >
                Proportion Buddy
              </h1>
            </div>
          </div>

          <div
            ref={stageRef}
            data-testid="proportion-stage"
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            onWheel={handleStageWheel}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              minHeight: 'min(92svh, 860px)',
              background:
                'linear-gradient(180deg, rgba(47,36,25,0.96), rgba(26,20,15,0.96)), repeating-linear-gradient(0deg, transparent 0 18px, rgba(255,255,255,0.03) 18px 19px)',
              borderBlock: '1px solid rgba(68,47,30,0.32)',
              borderInline: 0,
              cursor: activeReference.image ? 'grab' : 'default',
              boxShadow: '0 18px 60px rgba(48,31,16,0.24)',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {activeReference.image ? (
              <img
                src={activeReference.image}
                alt={`${activeReference.name} sculpture reference`}
                style={{
                  position: 'absolute',
                  left: `${50 + imageOffsetX}%`,
                  top: `calc(${-(cropTop / cropRange) * imageZoom}% + ${imageOffsetY}%)`,
                  width: `${imageZoom}%`,
                  height: 'auto',
                  objectFit: 'contain',
                  objectPosition: 'center top',
                  transform: 'translateX(-50%)',
                  filter: 'contrast(1.02) saturate(0.82)',
                  pointerEvents: 'none',
                }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 24,
                  textAlign: 'center',
                  color: 'rgba(245,226,190,0.72)',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                <div>
                  <div style={{ fontSize: 42, marginBottom: 8 }}>+</div>
                  <div style={{ fontSize: 18 }}>Upload {activeReference.name}</div>
                  <div style={{ fontSize: 12, marginTop: 7, opacity: 0.72 }}>
                    The 17cm arms target and 80-84cm head zone are ready.
                  </div>
                </div>
              </div>
            )}

            {state.showGrid && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {xGridLines.map((cm) => (
                  <span
                    key={`x-grid-${cm}`}
                    data-x-grid-line="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: GRID_RULER_GUTTER_PX,
                      left: `${xPositionPercent(cm, state.totalHeight)}%`,
                      borderLeft: `1px solid rgba(255,238,198,${cm % 20 === 0 ? 0.2 : 0.12})`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                ))}
              </div>
            )}
            {state.showGrid &&
              gridLines.map((cm) => {
                const major = isMajorGridLine(cm, state.totalHeight);
                return (
                  <div
                    key={cm}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: guideTopWithBase(cm, state.totalHeight, baseOffset, gridHeight),
                      borderTop: `1px solid rgba(255,238,198,${major ? 0.28 : 0.1})`,
                      pointerEvents: 'none',
                    }}
                  >
                    {major && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 8,
                          top: -10,
                          color: 'rgba(255,238,198,0.76)',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 11,
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                        }}
                      >
                        {cm}cm
                      </span>
                    )}
                  </div>
                );
              })}
            {state.showGrid && (
              <div
                role="img"
                aria-label="Horizontal centimeter ruler"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: GRID_RULER_GUTTER_PX,
                  background: 'linear-gradient(180deg, rgba(20,15,11,0), rgba(20,15,11,0.78))',
                  borderTop: '1px solid rgba(255,238,198,0.42)',
                  pointerEvents: 'none',
                }}
              >
                {gridLines
                  .filter((cm) => cm >= X_RULER_LABEL_START_CM)
                  .map((cm) => {
                    const major = cm % 10 === 0 || cm === state.totalHeight;
                    const labelSide = xRulerLabelSide(cm, state.totalHeight);
                    return (
                      <span
                        key={`horizontal-${cm}`}
                        style={{
                          position: 'absolute',
                          left: `${xPositionPercent(cm, state.totalHeight)}%`,
                          top: 0,
                          width: 1,
                          height: major ? 18 : 10,
                          background: `rgba(255,238,198,${major ? 0.42 : 0.2})`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {major && (
                          <span
                            style={{
                              position: 'absolute',
                              left: labelSide === 'right' ? 3 : 'auto',
                              right: labelSide === 'left' ? 3 : 'auto',
                              top: 15,
                              color: 'rgba(255,238,198,0.78)',
                              fontFamily: 'var(--font-serif)',
                              fontSize: 10,
                              lineHeight: 1,
                              textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cm}cm
                          </span>
                        )}
                      </span>
                    );
                  })}
              </div>
            )}

            {state.showProportions &&
              landmarks
                .filter((mark) => mark.visible)
                .map((mark) => (
                  <GuideLine
                    key={mark.key}
                    cm={mark.cm}
                    total={state.totalHeight}
                    baseOffset={baseOffset}
                    gridHeight={gridHeight}
                    showLabel={state.showLabels}
                    label={`${mark.label} ${mark.cm % 1 ? mark.cm.toFixed(1) : Math.round(mark.cm)}cm`}
                    color={mark.color}
                  />
                ))}
            {state.showProportions &&
              customLandmarks
                .filter((mark) => mark.visible)
                .map((mark) => (
                  <GuideLine
                    key={mark.id}
                    cm={mark.cm}
                    total={state.totalHeight}
                    baseOffset={baseOffset}
                    gridHeight={gridHeight}
                    showLabel={state.showLabels}
                    label={`${mark.label} ${mark.cm % 1 ? mark.cm.toFixed(1) : Math.round(mark.cm)}cm`}
                    color={mark.color}
                  />
                ))}
            {state.showProportions && <ShapeGuides mode={state.overlayMode} />}
            {state.showProportions && (
              <div
                role="img"
                aria-label="Head guide band"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: guideTopWithBase(state.headHigh, state.totalHeight, baseOffset, gridHeight),
                  height: `calc(${guideTopWithBase(
                    state.headLow,
                    state.totalHeight,
                    baseOffset,
                    gridHeight,
                  )} - ${guideTopWithBase(
                    state.headHigh,
                    state.totalHeight,
                    baseOffset,
                    gridHeight,
                  )})`,
                  background: 'rgba(244,199,104,0.1)',
                  borderTop: '1px solid rgba(244,199,104,0.72)',
                  borderBottom: '1px solid rgba(244,199,104,0.62)',
                  pointerEvents: 'none',
                }}
              >
                {state.showLabels && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 4,
                      color: '#ffe6aa',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 12,
                      fontWeight: 800,
                      textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                    }}
                  >
                    head {state.headLow}-{state.headHigh}cm
                  </span>
                )}
              </div>
            )}
          </div>
          <section
            aria-label="Image controls"
            style={{
              border: '1px solid rgba(116,83,49,0.16)',
              background: 'rgba(255,248,231,0.62)',
              marginTop: 10,
              padding: 10,
              display: 'grid',
              gap: 10,
              marginInline: 'clamp(6px, 2vw, 18px)',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 8,
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                opacity: activeReference.fixed ? 0.42 : 1,
              }}
              className="proportion-buddy-placement-row"
            >
              <ControlSlider
                label="H"
                value={activeReference.gridHeight}
                min={MIN_GRID_HEIGHT}
                max={MAX_GRID_HEIGHT}
                suffix="%"
                disabled={activeReference.fixed}
                onChange={(gridHeight) =>
                  updateActiveReference({
                    gridHeight: clamp(gridHeight, MIN_GRID_HEIGHT, MAX_GRID_HEIGHT),
                  })
                }
              />
              <ControlSlider
                label="M"
                value={activeReference.offsetY}
                min={MIN_IMAGE_Y}
                max={MAX_IMAGE_Y}
                suffix="%"
                disabled={activeReference.fixed}
                onChange={(offsetY) =>
                  updateActiveReference({ offsetY: clamp(offsetY, MIN_IMAGE_Y, MAX_IMAGE_Y) })
                }
              />
              <ControlSlider
                label="S"
                value={activeReference.zoom}
                min={MIN_IMAGE_ZOOM}
                max={MAX_IMAGE_ZOOM}
                suffix="%"
                disabled={activeReference.fixed}
                onChange={(zoom) =>
                  updateActiveReference({ zoom: clamp(zoom, MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM) })
                }
              />
              <ControlSlider
                label="0 cm line"
                value={activeReference.baseOffset}
                min={MIN_GRID_ZERO}
                max={MAX_GRID_ZERO}
                suffix="%"
                disabled={activeReference.fixed}
                onChange={(baseOffset) =>
                  updateActiveReference({
                    baseOffset: clamp(baseOffset, MIN_GRID_ZERO, MAX_GRID_ZERO),
                  })
                }
              />
            </div>
            <button
              type="button"
              aria-pressed={activeReference.fixed}
              onClick={() => updateActiveReference({ fixed: !activeReference.fixed })}
              style={{
                border: '1px solid rgba(126,54,28,0.42)',
                borderRadius: 8,
                background: activeReference.fixed
                  ? 'linear-gradient(180deg, rgba(176,70,32,0.96), rgba(126,54,28,0.92))'
                  : 'linear-gradient(180deg, rgba(221,127,49,0.96), rgba(180,78,34,0.92))',
                boxShadow: activeReference.fixed
                  ? '0 8px 22px rgba(126,54,28,0.28)'
                  : '0 8px 20px rgba(180,78,34,0.22)',
                color: '#fff6df',
                cursor: 'pointer',
                fontFamily: 'var(--font-serif)',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.08em',
                padding: '11px 12px',
                textTransform: 'uppercase',
                width: '100%',
              }}
            >
              {activeReference.fixed ? 'Unlock proportions' : 'Lock proportions'}
            </button>
            <fieldset
              style={{
                display: 'flex',
                gap: 8,
                border: 0,
                width: '100%',
                maxWidth: '100%',
                minInlineSize: 0,
                overflowX: 'auto',
                padding: 0,
                scrollbarWidth: 'thin',
              }}
            >
              <legend className="sr-only">Reference images</legend>
              {state.references.map((reference) => (
                <button
                  key={reference.id}
                  type="button"
                  onClick={() => update({ activeReferenceId: reference.id })}
                  style={{
                    ...flatButtonStyle,
                    flex: '0 0 auto',
                    minWidth: 84,
                    background:
                      reference.id === activeReference.id
                        ? 'rgba(92,48,24,0.15)'
                        : 'rgba(255,248,231,0.58)',
                  }}
                >
                  {reference.name}
                </button>
              ))}
            </fieldset>
            <div
              style={{
                display: 'flex',
                gap: 8,
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                overflowX: 'auto',
                scrollbarWidth: 'thin',
              }}
              className="proportion-buddy-action-row"
            >
              <button
                type="button"
                aria-pressed={state.showGrid}
                onClick={() => update({ showGrid: !state.showGrid })}
                style={{
                  ...flatButtonStyle,
                  flex: '0 0 88px',
                  background: state.showGrid ? 'rgba(92,48,24,0.15)' : 'rgba(255,248,231,0.58)',
                }}
              >
                Grid
              </button>
              <button
                type="button"
                aria-pressed={state.showProportions}
                onClick={() => update({ showProportions: !state.showProportions })}
                style={{
                  ...flatButtonStyle,
                  flex: '0 0 108px',
                  background: state.showProportions
                    ? 'rgba(92,48,24,0.15)'
                    : 'rgba(255,248,231,0.58)',
                }}
              >
                Proportions
              </button>
              <button
                type="button"
                aria-pressed={state.showLabels}
                onClick={() => update({ showLabels: !state.showLabels })}
                style={{
                  ...flatButtonStyle,
                  flex: '0 0 92px',
                  background: state.showLabels ? 'rgba(92,48,24,0.15)' : 'rgba(255,248,231,0.58)',
                }}
              >
                Labels
              </button>
              <button
                type="button"
                aria-pressed={state.suggestionMode}
                onClick={() => update({ suggestionMode: !state.suggestionMode })}
                style={{
                  ...flatButtonStyle,
                  flex: '0 0 76px',
                  background: state.suggestionMode
                    ? 'rgba(92,48,24,0.15)'
                    : 'rgba(255,248,231,0.58)',
                }}
              >
                AI
              </button>
              <label style={{ ...flatButtonStyle, flex: '0 0 88px' }}>
                Upload
                <input
                  aria-label={`Upload reference image for ${activeReference.name}`}
                  type="file"
                  accept="image/*"
                  onChange={(event) => loadImage(event.currentTarget.files?.[0])}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                type="button"
                onClick={() => updateActiveReference({ image: null })}
                style={{ ...flatButtonStyle, flex: '0 0 82px' }}
              >
                Clear
              </button>
            </div>
          </section>
          {state.suggestionMode && (
            <AiSuggestions
              activeId={activeReference.id}
              activeName={activeReference.name}
              totalHeight={state.totalHeight}
              armsBottom={state.armsBottom}
              headLow={state.headLow}
              headHigh={state.headHigh}
              baseOffset={baseOffset}
            />
          )}
        </section>

        <aside
          style={{
            border: '1px solid rgba(116,83,49,0.18)',
            background: 'rgba(248,238,215,0.74)',
            padding: 14,
            display: 'grid',
            gap: 14,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: '#332416',
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
              }}
            >
              Measurements
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                color: 'rgba(82,58,38,0.68)',
                fontFamily: 'var(--font-serif)',
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Set the sculpture height and landmarks. Lines are measured upward from the base.
            </p>
          </div>

          <section
            aria-label="Guide shape mode"
            style={{
              border: '1px solid rgba(116,83,49,0.16)',
              background: 'rgba(255,248,231,0.42)',
              padding: 10,
              display: 'grid',
              gap: 8,
            }}
          >
            <div
              style={{
                color: '#332416',
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Visual guide
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { mode: 'lines' as const, label: 'Lines' },
                { mode: 'x' as const, label: 'X' },
                { mode: 'triangle' as const, label: 'Triangle' },
              ].map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  aria-label={`${option.label} guides`}
                  onClick={() => update({ overlayMode: option.mode })}
                  style={{
                    ...buttonStyle,
                    borderRadius: 6,
                    background:
                      state.overlayMode === option.mode
                        ? 'rgba(92,48,24,0.14)'
                        : 'rgba(255,248,231,0.58)',
                    padding: '7px 8px',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {numberInput('total cm', state.totalHeight, (totalHeight) =>
              update({ totalHeight: clamp(totalHeight, 20, 300) }),
            )}
            {numberInput('grid cm', state.gridStep, (gridStep) =>
              update({ gridStep: clamp(gridStep, 1, 20) }),
            )}
            {numberInput('head low', state.headLow, (headLow) =>
              update({ headLow: clamp(headLow, 0, state.totalHeight) }),
            )}
            {numberInput('head high', state.headHigh, (headHigh) =>
              update({ headHigh: clamp(headHigh, 0, state.totalHeight) }),
            )}
          </div>

          <section
            aria-label="Reference point switches"
            style={{
              border: '1px solid rgba(116,83,49,0.16)',
              background: 'rgba(255,248,231,0.42)',
              padding: 10,
              display: 'grid',
              gap: 7,
            }}
          >
            <div
              style={{
                color: '#332416',
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Reference points
            </div>
            {landmarks.map((mark) => (
              <label
                key={mark.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 10px minmax(0, 1fr) 66px',
                  gap: 7,
                  alignItems: 'center',
                  borderTop: '1px solid rgba(116,83,49,0.10)',
                  paddingTop: 6,
                  color: 'rgba(82,58,38,0.78)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  aria-label={`Show ${mark.label}`}
                  checked={mark.visible}
                  onChange={(event) =>
                    update({
                      visible: { ...state.visible, [mark.key]: event.currentTarget.checked },
                    })
                  }
                />
                <span
                  aria-hidden="true"
                  style={{ width: 9, height: 9, borderRadius: 99, background: mark.color }}
                />
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {mark.label}
                </span>
                <input
                  type="number"
                  aria-label={`${mark.label} centimeters`}
                  step={0.5}
                  min={0}
                  max={state.totalHeight}
                  value={mark.cm}
                  onChange={(event) => updateLandmark(mark.key, Number(event.currentTarget.value))}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(116,83,49,0.18)',
                    borderRadius: 5,
                    background: 'rgba(255,248,231,0.7)',
                    color: '#2f2419',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 12,
                    padding: '5px 6px',
                  }}
                />
              </label>
            ))}
          </section>

          <section
            aria-label="Custom landmarks"
            style={{
              border: '1px solid rgba(116,83,49,0.16)',
              background: 'rgba(255,248,231,0.42)',
              padding: 10,
              display: 'grid',
              gap: 8,
            }}
          >
            <div
              style={{
                color: '#332416',
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Your landmarks
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 74px', gap: 7 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="sr-only">New landmark name</span>
                <input
                  aria-label="New landmark name"
                  value={draftLabel}
                  onChange={(event) => setDraftLabel(event.currentTarget.value)}
                  placeholder="shirt split, left elbow..."
                  style={smallInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="sr-only">New landmark centimeters</span>
                <input
                  aria-label="New landmark centimeters"
                  type="number"
                  step={0.5}
                  min={0}
                  max={state.totalHeight}
                  value={draftCm}
                  onChange={(event) =>
                    setDraftCm(clamp(Number(event.currentTarget.value), 0, state.totalHeight))
                  }
                  style={smallInputStyle}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addCustomLandmark}
              disabled={!draftLabel.trim()}
              style={{
                ...buttonStyle,
                borderRadius: 6,
                opacity: draftLabel.trim() ? 1 : 0.46,
              }}
            >
              Add landmark
            </button>
            {customLandmarks.map((mark) => (
              <div
                key={mark.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 10px minmax(0, 1fr) 66px 28px',
                  gap: 7,
                  alignItems: 'center',
                  borderTop: '1px solid rgba(116,83,49,0.10)',
                  paddingTop: 6,
                }}
              >
                <input
                  type="checkbox"
                  aria-label={`Show ${mark.label}`}
                  checked={mark.visible}
                  onChange={(event) =>
                    updateCustomLandmark(mark.id, { visible: event.currentTarget.checked })
                  }
                />
                <span
                  aria-hidden="true"
                  style={{ width: 9, height: 9, borderRadius: 99, background: mark.color }}
                />
                <input
                  aria-label={`${mark.label} name`}
                  value={mark.label}
                  onChange={(event) =>
                    updateCustomLandmark(mark.id, { label: event.currentTarget.value })
                  }
                  style={smallInputStyle}
                />
                <input
                  type="number"
                  aria-label={`${mark.label} centimeters`}
                  step={0.5}
                  min={0}
                  max={state.totalHeight}
                  value={mark.cm}
                  onChange={(event) =>
                    updateCustomLandmark(mark.id, { cm: Number(event.currentTarget.value) })
                  }
                  style={smallInputStyle}
                />
                <button
                  type="button"
                  aria-label={`Remove ${mark.label}`}
                  onClick={() => removeCustomLandmark(mark.id)}
                  style={{
                    border: '1px solid rgba(116,83,49,0.18)',
                    borderRadius: 5,
                    background: 'rgba(255,248,231,0.58)',
                    color: '#5C3018',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 15,
                    lineHeight: 1,
                    padding: '5px 0',
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </section>

          <ControlSlider
            label="top crop"
            value={activeReference.topCrop}
            min={0}
            max={95}
            onChange={(topCrop) =>
              updateActiveReference({
                topCrop: clamp(topCrop, 0, activeReference.bottomCrop - 4),
              })
            }
          />

          <section
            aria-label="Reusable proportion ratios"
            style={{
              border: '1px solid rgba(116,83,49,0.16)',
              background: 'rgba(255,248,231,0.48)',
              padding: 10,
              display: 'grid',
              gap: 8,
            }}
          >
            <div
              style={{
                color: '#332416',
                fontFamily: 'var(--font-serif)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Reusable proportions
            </div>
            {proportionCards.map((card) => {
              const percent = (card.value / card.basis) * 100;
              const ratio = card.value > 0 ? card.basis / card.value : 0;
              return (
                <div
                  key={card.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    alignItems: 'baseline',
                    borderTop: '1px solid rgba(116,83,49,0.12)',
                    paddingTop: 7,
                  }}
                >
                  <span
                    style={{
                      color: 'rgba(82,58,38,0.76)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 12,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {card.label}
                  </span>
                  <span
                    style={{
                      color: '#332416',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {card.value.toFixed(1)}cm - {percent.toFixed(1)}% - 1:{ratio.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </section>
          <ControlSlider
            label="bottom crop"
            value={activeReference.bottomCrop}
            min={5}
            max={100}
            onChange={(bottomCrop) =>
              updateActiveReference({
                bottomCrop: clamp(bottomCrop, activeReference.topCrop + 4, 100),
              })
            }
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setState(DEFAULT_STATE)} style={buttonStyle}>
              Reset
            </button>
            <button
              type="button"
              onClick={() => updateActiveReference({ image: null })}
              style={buttonStyle}
            >
              Clear image
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .proportion-buddy-shell {
            grid-template-columns: 1fr !important;
          }
          .proportion-buddy-action-row {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .proportion-buddy-placement-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function GuideLine({
  cm,
  total,
  baseOffset,
  gridHeight,
  showLabel,
  label,
  color,
}: {
  cm: number;
  total: number;
  baseOffset: number;
  gridHeight: number;
  showLabel: boolean;
  label: string;
  color: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: guideTopWithBase(cm, total, baseOffset, gridHeight),
        borderTop: `2px solid ${color}`,
        boxShadow: `0 0 18px ${color}55`,
        pointerEvents: 'none',
      }}
    >
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: -22,
            background: 'rgba(23,17,12,0.82)',
            border: `1px solid ${color}99`,
            borderRadius: 999,
            color,
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.05em',
            padding: '3px 8px',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function AiSuggestions({
  activeId,
  activeName,
  totalHeight,
  armsBottom,
  headLow,
  headHigh,
  baseOffset,
}: {
  activeId: string;
  activeName: string;
  totalHeight: number;
  armsBottom: number;
  headLow: number;
  headHigh: number;
  baseOffset: number;
}) {
  const armsPercent = (armsBottom / totalHeight) * 100;
  const headZone = `${headLow}-${headHigh}cm`;
  const imageSuggestions =
    activeId === 'image-1'
      ? [
          'Use this as the adjustable working reference. Once you upload or crop it, compare it against Image 2/3 instead of treating it as isolated truth.',
          'If Image 1 is cropped tighter, do not force the visible base to be the real base. Lower the imagined base until the arms and head zone feel consistent.',
        ]
      : [
          'This photo family is good for the overall bust envelope: shoulder mass, crossed-arm block, shirt opening, and skull height.',
          'Image 2 and Image 3 are close enough to reuse the same proportion intelligence. Use them to confirm whether a landmark is stable or just photo perspective.',
        ];
  return (
    <section
      aria-label="AI proportion suggestions"
      style={{
        border: '1px solid rgba(116,83,49,0.2)',
        background: 'rgba(255,248,231,0.72)',
        marginTop: 10,
        padding: 12,
        display: 'grid',
        gap: 8,
      }}
    >
      <div
        style={{
          color: '#332416',
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        AI suggestions - {activeName}
      </div>
      {[
        ...imageSuggestions,
        `Use bottom of arms near ${armsBottom}cm (${armsPercent.toFixed(
          1,
        )}% of total height). Across the three photos this is the strongest stabilising anchor.`,
        `Treat the head as a flexible top zone, not one line: ${headZone}. The skull can read taller depending on crop and hair texture.`,
        `Use chin, shirt opening V, visible armpits, arm-crossing top, and arm-crossing bottom as the main sequence. These are easier to sculpt against than facial details too early.`,
        baseOffset > 0
          ? `The 0cm line is set ${baseOffset}% lower than the stage bottom. Move the 0cm line and height until the base and 82cm skull anchor both make sense.`
          : 'If the plinth/photo crop feels too high, move the 0cm line and height until the 17cm target and 82cm anchor feel believable.',
      ].map((suggestion) => (
        <p
          key={suggestion}
          style={{
            margin: 0,
            color: 'rgba(54,38,25,0.82)',
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {suggestion}
        </p>
      ))}
    </section>
  );
}

function ShapeGuides({ mode }: { mode: OverlayMode }) {
  if (mode === 'lines') return null;

  return (
    <svg
      aria-label={mode === 'x' ? 'X proportion guides' : 'Triangle proportion guides'}
      role="img"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {mode === 'x' ? (
        <>
          <line
            x1="8"
            y1="8"
            x2="92"
            y2="92"
            stroke="rgba(255,240,204,0.72)"
            strokeDasharray="1.8 1.6"
            strokeWidth="0.45"
          />
          <line
            x1="92"
            y1="8"
            x2="8"
            y2="92"
            stroke="rgba(255,240,204,0.72)"
            strokeDasharray="1.8 1.6"
            strokeWidth="0.45"
          />
        </>
      ) : (
        <>
          <path
            d="M50 7 L10 94 L90 94 Z"
            fill="rgba(244,216,160,0.05)"
            stroke="rgba(255,240,204,0.78)"
            strokeDasharray="1.8 1.6"
            strokeWidth="0.45"
          />
          <line
            x1="50"
            y1="7"
            x2="50"
            y2="94"
            stroke="rgba(255,240,204,0.62)"
            strokeDasharray="1.2 1.4"
            strokeWidth="0.35"
          />
          <line
            x1="10"
            y1="94"
            x2="90"
            y2="94"
            stroke="rgba(244,199,104,0.76)"
            strokeWidth="0.55"
          />
        </>
      )}
    </svg>
  );
}

function ControlSlider({
  label,
  value,
  min,
  max,
  suffix = '%',
  step = 0.5,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <label
      style={{
        display: 'grid',
        gap: 5,
        minWidth: 0,
        maxWidth: '100%',
        cursor: disabled ? 'not-allowed' : 'default',
      }}
    >
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'rgba(82,58,38,0.72)',
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          minWidth: 0,
        }}
      >
        <span>{label}</span>
        <span>
          {Math.round(value)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{
          width: '100%',
          minWidth: 0,
          accentColor: '#8b5e2f',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
    </label>
  );
}

const buttonStyle = {
  border: '1px solid rgba(116,83,49,0.28)',
  borderRadius: 999,
  background: 'rgba(255,248,231,0.72)',
  color: '#4f321d',
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  padding: '8px 12px',
  textTransform: 'uppercase' as const,
};

const flatButtonStyle = {
  border: '1px solid rgba(92,48,24,0.15)',
  borderRadius: 8,
  background: 'rgba(255,248,231,0.58)',
  color: '#4f321d',
  cursor: 'pointer',
  fontFamily: 'var(--font-serif)',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.08em',
  padding: '8px 6px',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
};

const smallInputStyle = {
  width: '100%',
  border: '1px solid rgba(116,83,49,0.18)',
  borderRadius: 5,
  background: 'rgba(255,248,231,0.7)',
  color: '#2f2419',
  fontFamily: 'var(--font-serif)',
  fontSize: 12,
  padding: '5px 6px',
};
