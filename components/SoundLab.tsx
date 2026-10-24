'use client';

import { useEffect, useRef, useState } from 'react';
import AtomVisualizer, { type VisualizerMode } from '@/components/AtomVisualizer';
import GrooveMachine from '@/components/GrooveMachine';
import LofiLooper from '@/components/LofiLooper';
import MagicMaker from '@/components/MagicMaker';
import { CHILL_URL } from '@/lib/chill/url';

/* ═══════════════════════════════════════════════════════════
   Sound Lab — ambient / emotional audio tools.
   Tabs: Chill Machine / Groove Machine / Magic Maker /
         Lo-fi Looper / Visuals.
   Songs tab moved to Guitar Studio (music/page.tsx).
   ═══════════════════════════════════════════════════════════ */

type Mode = 'tuner' | 'groove' | 'maker' | 'looper' | 'visuals';
const SOUNDLAB_TAB_LS = 'colourmap:soundlab-tab';

const VISUALIZER_MODES: { id: VisualizerMode; label: string }[] = [
  { id: 'atom', label: 'Atom' },
  { id: 'fibonacci', label: 'Fibonacci' },
  { id: 'phyllotaxis', label: 'Sunflower' },
  { id: 'wave', label: 'Wave' },
  { id: 'lissajous', label: 'Lissajous' },
  { id: 'constellation', label: 'Constellation' },
  { id: 'helix', label: 'Helix' },
  { id: 'tunnel', label: 'Tunnel' },
  { id: 'galaxy', label: 'Galaxy' },
  { id: 'solar', label: 'Solar' },
  { id: 'saturn', label: 'Saturn' },
  { id: 'orbital', label: 'Orbital' },
  { id: 'morph', label: 'Morph' },
];

export default function SoundLab() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'tuner';
    const saved = window.localStorage.getItem(SOUNDLAB_TAB_LS);
    return saved === 'groove' || saved === 'maker' || saved === 'looper' || saved === 'visuals'
      ? saved
      : 'tuner';
  });
  const [visualMode, setVisualMode] = useState<VisualizerMode>('atom');
  const [visualSize, setVisualSize] = useState({ width: 360, height: 240 });
  const [fullscreen, setFullscreen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function update() {
      const w = Math.min(window.innerWidth - 40, 720);
      const h = Math.max(200, Math.min(420, Math.round(w * 0.65)));
      setVisualSize({ width: w, height: h });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Escape closes fullscreen without having to reach the corner button.
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Auto-scroll active tab into view — same pattern as NavLinks
  // biome-ignore lint/correctness/useExhaustiveDependencies: mode is the real trigger; refs are stable
  useEffect(() => {
    const el = activeTabRef.current;
    const nav = navRef.current;
    if (!el || !nav) return;
    const target = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUNDLAB_TAB_LS, mode);
    } catch {}
  }, [mode]);

  const TABS: readonly { id: Mode; label: string }[] = [
    { id: 'tuner', label: 'Chill Machine' },
    { id: 'groove', label: 'Groove Machine' },
    { id: 'maker', label: 'Magic Maker' },
    { id: 'looper', label: 'Lo-fi Looper' },
    { id: 'visuals', label: 'Visuals' },
  ];

  return (
    <div className="space-y-5">
      {/* Scrollable tab strip — same pattern as NavLinks:
          overflow-x-auto, scroll-snap, fade-right mask, no wrapping. */}
      <div
        ref={navRef}
        className="flex w-full items-center gap-7 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none"
        style={{
          scrollbarWidth: 'none',
          scrollSnapType: 'x proximity',
          WebkitMaskImage:
            'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
          maskImage:
            'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
        }}
      >
        {TABS.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              ref={
                active
                  ? (el) => {
                      activeTabRef.current = el;
                    }
                  : undefined
              }
              type="button"
              onClick={() => setMode(m.id)}
              className="shrink-0 cursor-pointer whitespace-nowrap bg-transparent transition-colors"
              style={{
                scrollSnapAlign: 'center',
                fontSize: 16,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}
            >
              {m.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="mx-auto block"
                  style={{
                    height: 2,
                    width: '100%',
                    background: '#C4A060',
                    borderRadius: 2,
                    marginTop: 2,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content — no outer box; each mode is responsible for its own
          interior structure and breathes across the full page width.
          Sound-emitting tabs (Chill, Groove, Maker, Looper) are
          kept *mounted* and visibility-toggled instead of conditional
          render — so the audio keeps playing when the user wanders to
          Visuals or Songs. Per Martin 2026-04-25: "chill machine stays
          when we are on visuals". */}
      {/* The Chill Machine is its own app now (2026-10-24): this tab opens it. */}
      <div style={{ display: mode === 'tuner' ? 'block' : 'none' }}>
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Pads, beats, song sections and visuals, in its own app.
          </p>
          <a
            href={CHILL_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-full border px-5 py-2 text-base font-semibold"
            style={{ borderColor: '#C4A060', color: 'var(--foreground)' }}
          >
            Open the Chill Machine ↗
          </a>
        </div>
      </div>
      <div style={{ display: mode === 'groove' ? 'block' : 'none' }}>
        <GrooveMachine />
      </div>
      <div style={{ display: mode === 'maker' ? 'block' : 'none' }}>
        <MagicMaker />
      </div>
      <div style={{ display: mode === 'looper' ? 'block' : 'none' }}>
        <LofiLooper />
      </div>
      {mode === 'visuals' && (
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <AtomVisualizer
              mode={visualMode}
              width={visualSize.width}
              height={visualSize.height}
              intensity={0.6}
              speed={0.55}
              density={0.6}
              scale={0.5}
              opacity={1}
              depth3d={0.3}
            />
            {/* Fullscreen trigger — tap to expand the current visualizer
                into a black-background overlay for proper zen-mode
                gazing on phone. */}
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              aria-label="Expand visualizer to fullscreen"
              className="absolute top-2 right-2 cursor-pointer rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 transition-all hover:bg-black/40"
            >
              ⤢ full
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
            {VISUALIZER_MODES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVisualMode(v.id)}
                className="cursor-pointer bg-transparent px-1 py-0.5 text-[11px] uppercase tracking-[0.1em] transition-all"
                style={{
                  color: '#5C3018',
                  opacity: visualMode === v.id ? 1 : 0.5,
                  fontFamily: 'var(--font-serif)',
                  borderBottom:
                    visualMode === v.id ? '1px solid #5C301860' : '1px solid transparent',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen overlay — black background, visualizer centered,
          minimal corner controls. Renders in any mode (so you can be
          on Relaxing Sounds + hit fullscreen from a future trigger and
          still see the Visuals engine). Escape also exits. */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen visualizer"
        >
          <AtomVisualizer
            mode={visualMode}
            width={typeof window !== 'undefined' ? window.innerWidth : 1024}
            height={typeof window !== 'undefined' ? window.innerHeight : 768}
            intensity={0.8}
            speed={0.55}
            density={0.7}
            scale={0.8}
            opacity={1}
            depth3d={0.5}
          />
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Exit fullscreen"
            className="absolute top-4 right-4 cursor-pointer rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/85 transition-all hover:bg-white/20"
          >
            ✕ exit
          </button>
          <p
            className="absolute bottom-6 left-1/2 -translate-x-1/2 italic text-white/55"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '12px',
              letterSpacing: '0.08em',
            }}
          >
            {visualMode} · esc to exit
          </p>
        </div>
      )}
    </div>
  );
}
