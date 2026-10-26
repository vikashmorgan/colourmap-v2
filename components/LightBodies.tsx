'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import LightCanvas, { type LightCanvasHandle } from '@/components/LightCanvas';
import {
  clampSettings,
  ECLIPSE_STYLES,
  frameName,
  KIND_SLIDERS,
  LIMITS,
  type LightKind,
  type LightSettings,
  makeSavedLight,
  PALETTES,
  PIECES,
  type LightPiece as Piece,
  paletteById,
  pieceBySlug,
  poseName,
  readSavedLights,
  type SavedLight,
  writeSavedLights,
} from '@/lib/art/light';

/*
 * LIGHT BODIES — the collection's space in the Art section (2026-10-26).
 * The pieces and their settings are in lib/art/light.ts; the shaders are
 * lib/art/light-shaders.ts.
 *
 * Three rows, one per kind: the Eclipse, Enlightenment and the Light Bubble.
 * Tap a piece to open it full screen: its kind's settings as sliders, any
 * palette, pause, reset, Save PNG, and Save preset to keep the tuning in its
 * own row, "My light", kept in this browser. Art first: once a look holds up
 * here it passes to the Geometry Builder and the Chill Machine
 * (docs/specs/visual-references.md).
 *
 * Cards draw at a low resolution and only move while on screen. With reduced
 * motion asked for, every piece holds still.
 */

const INK = '#5C3018';
const MUTED = '#8A6A4A';
const GOLD = '#C4A060';

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 22,
};

const KINDS: { kind: LightKind; title: string; line: string }[] = [
  { kind: 'eclipse', title: 'Eclipse', line: 'A void inside a burning ring, glitch and embers' },
  {
    kind: 'deity',
    title: 'Enlightenment',
    line: 'A figure of light with six arms, between imagination, the digital and light',
  },
  { kind: 'bubble', title: 'Light Bubble', line: 'A drop of liquid light, its skin a soap film' },
];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    } catch {
      setReduced(false);
    }
  }, []);
  return reduced;
}

function useOnScreen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOn(Boolean(e?.isIntersecting)), {
      rootMargin: '120px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on];
}

function Card({
  piece,
  saved,
  index,
  still,
  onOpen,
}: {
  piece: Piece;
  /** A saved tuning of the piece, shown instead of the piece itself. */
  saved?: SavedLight;
  index: number;
  still: boolean;
  onOpen: () => void;
}) {
  const [ref, on] = useOnScreen<HTMLButtonElement>();
  const title = saved?.name ?? piece.title;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={`Open ${title}`}
      style={{
        display: 'grid',
        gap: 8,
        padding: 0,
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        color: INK,
      }}
    >
      <LightCanvas
        kind={piece.kind}
        settings={saved?.settings ?? piece.settings}
        palette={paletteById(saved?.palette ?? piece.palette)}
        animate={on && !still}
        maxDpr={0.75}
        offset={index * 3.7}
        label={title}
        style={{
          width: '100%',
          aspectRatio: '4 / 5',
          borderRadius: 14,
          boxShadow: '0 10px 30px -14px rgba(40,20,8,0.5)',
        }}
      />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{title}</span>
      <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.4 }}>
        {saved ? `Your tuning of ${piece.title}` : piece.line}
      </span>
    </button>
  );
}

function Viewer({
  piece,
  start,
  still,
  onClose,
  onSavePreset,
}: {
  piece: Piece;
  /** Open on a saved tuning rather than the piece. */
  start?: SavedLight;
  still: boolean;
  onClose: () => void;
  /** Keeps the current tuning; returns the name it was saved under. */
  onSavePreset: (settings: LightSettings, palette: string) => string;
}) {
  const first = {
    settings: start?.settings ?? piece.settings,
    palette: start?.palette ?? piece.palette,
  };
  const title = start?.name ?? piece.title;
  const [settings, setSettings] = useState<LightSettings>(first.settings);
  const [paletteId, setPaletteId] = useState(first.palette);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [paused, setPaused] = useState(still);
  const [panel, setPanel] = useState(true);
  const canvas = useRef<LightCanvasHandle | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k: keyof LightSettings, v: number) =>
    setSettings((s) => clampSettings({ ...s, [k]: v }));

  const save = () => {
    const url = canvas.current?.toDataURL();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = frameName(piece, paletteId);
    a.click();
  };

  const pill = (on = false): React.CSSProperties => ({
    minHeight: 40,
    padding: '0 14px',
    borderRadius: 999,
    border: `1px solid ${on ? GOLD : 'rgba(196,160,96,0.35)'}`,
    background: on ? 'rgba(196,160,96,0.22)' : 'rgba(10,8,6,0.55)',
    color: '#f2e6cc',
    fontSize: 12,
    letterSpacing: '0.06em',
    cursor: 'pointer',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 9980, background: '#000' }}
    >
      <LightCanvas
        ref={canvas}
        kind={piece.kind}
        settings={settings}
        palette={paletteById(paletteId)}
        animate={!paused}
        preserve
        label={title}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button ref={closeRef} type="button" onClick={onClose} style={pill()}>
          ← Collection
        </button>
        <span
          style={{
            color: '#f2e6cc',
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            textShadow: '0 1px 8px #000',
            marginRight: 'auto',
          }}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          style={pill(paused)}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => setSavedAs(onSavePreset(settings, paletteId))}
          style={pill(Boolean(savedAs))}
        >
          {savedAs ? `Saved · ${savedAs}` : 'Save preset'}
        </button>
        <button type="button" onClick={save} style={pill()}>
          Save PNG
        </button>
        <button
          type="button"
          onClick={() => setPanel((p) => !p)}
          aria-expanded={panel}
          aria-controls="light-controls"
          style={pill(panel)}
        >
          Controls
        </button>
      </div>

      {panel && (
        <section
          id="light-controls"
          aria-label="Controls"
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 'min(320px, calc(100vw - 24px))',
            maxHeight: 'calc(100dvh - 90px)',
            overflow: 'auto',
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(10,8,6,0.72)',
            border: '1px solid rgba(196,160,96,0.3)',
            backdropFilter: 'blur(8px)',
            color: '#e8dcc2',
            display: 'grid',
            gap: 4,
          }}
        >
          <fieldset
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              margin: '0 0 6px',
              padding: 0,
              border: 'none',
            }}
            aria-label="Palette"
          >
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaletteId(p.id)}
                aria-pressed={paletteId === p.id}
                title={p.label}
                aria-label={`${p.label} palette`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: `2px solid ${paletteId === p.id ? GOLD : 'transparent'}`,
                  background: `conic-gradient(${p.ramp[0]}, ${p.ramp[2]}, ${p.ramp[3]}, ${p.ramp[4]}, ${p.bg[1]}, ${p.ramp[0]})`,
                }}
              />
            ))}
          </fieldset>
          {piece.kind === 'eclipse' && (
            <fieldset
              aria-label="Style"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                margin: '0 0 6px',
                padding: 0,
                border: 'none',
              }}
            >
              {ECLIPSE_STYLES.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => set('style', i)}
                  aria-pressed={settings.style === i}
                  style={{ ...pill(settings.style === i), minHeight: 32, padding: '0 12px' }}
                >
                  {name}
                </button>
              ))}
            </fieldset>
          )}
          {KIND_SLIDERS[piece.kind].map(({ key: k, label }) => {
            const l = LIMITS[k];
            const name = label ?? l.label;
            return (
              <label
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 32,
                  fontSize: 12,
                }}
              >
                <span style={{ width: 86, flexShrink: 0, color: '#b9ab8e' }}>
                  {k === 'pose' ? poseName(settings.pose) : name}
                </span>
                <input
                  type="range"
                  min={l.min}
                  max={l.max}
                  step={l.step}
                  value={settings[k]}
                  onChange={(e) => set(k, Number(e.target.value))}
                  aria-label={name}
                  style={{ width: '100%', accentColor: GOLD }}
                />
              </label>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setSettings(first.settings);
              setPaletteId(first.palette);
            }}
            style={{ ...pill(), marginTop: 6, justifySelf: 'start' }}
          >
            Reset
          </button>
        </section>
      )}
    </div>
  );
}

export default function LightBodies() {
  const still = useReducedMotion();
  const [open, setOpen] = useState<{ piece: Piece; start?: SavedLight } | null>(null);
  const [saved, setSaved] = useState<SavedLight[]>([]);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    setSaved(readSavedLights());
  }, []);

  const savePreset = (piece: Piece) => (settings: LightSettings, palette: string) => {
    const look = makeSavedLight(piece, palette, settings, saved, Date.now());
    const next = [...saved, look];
    setSaved(next);
    writeSavedLights(next);
    return look.name;
  };

  const remove = (id: string) => {
    const next = saved.filter((b) => b.id !== id);
    setSaved(next);
    writeSavedLights(next);
  };

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 16px 120px', color: INK }}>
      <header style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Art · Collection
        </p>
        <h1
          style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 44px)' }}
        >
          Light Bodies
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: MUTED, maxWidth: '62ch' }}>
          Three bodies of light: a black sun in a ring of fire, a figure of gold light with six arms
          that meditates, prays and dances, and a drop of liquid light in soap-film colours. Open
          one to tune it and save a frame.
        </p>
      </header>

      {saved.length > 0 && (
        <section aria-label="My light" style={{ marginBottom: 34 }}>
          <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-serif)', fontSize: 22 }}>
            My light
          </h2>
          <div style={GRID}>
            {saved.map((b, i) => {
              const piece = pieceBySlug(b.piece) as Piece;
              return (
                <div key={b.id} style={{ position: 'relative' }}>
                  <Card
                    piece={piece}
                    saved={b}
                    index={i + 2}
                    still={still}
                    onOpen={() => setOpen({ piece, start: b })}
                  />
                  <button
                    type="button"
                    onClick={() => remove(b.id)}
                    aria-label={`Delete ${b.name}`}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid rgba(196,160,96,0.4)',
                      background: 'rgba(10,8,6,0.6)',
                      color: '#f2e6cc',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {KINDS.map((k) => (
        <section key={k.kind} aria-label={k.title} style={{ marginBottom: 34 }}>
          <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 22 }}>
            {k.title}
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: MUTED }}>{k.line}</p>
          <div style={GRID}>
            {PIECES.filter((p) => p.kind === k.kind).map((p) => {
              const i = PIECES.indexOf(p);
              return (
                <Card
                  key={p.slug}
                  piece={p}
                  index={i}
                  still={still}
                  onOpen={() => setOpen({ piece: p })}
                />
              );
            })}
          </div>
        </section>
      ))}

      {open && (
        <Viewer
          key={open.start?.id ?? open.piece.slug}
          piece={open.piece}
          start={open.start}
          still={still}
          onClose={close}
          onSavePreset={savePreset(open.piece)}
        />
      )}
    </main>
  );
}
