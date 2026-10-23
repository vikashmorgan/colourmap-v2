'use client';

import { type ReactNode, useState } from 'react';

import { ECHO_TYPES, type EchoType, type EchoTypeSettings } from '@/lib/chill/echo';
import {
  type ChillVisualSettings,
  EARTH_VISUAL_PALETTE,
  VISUALIZER_MODES,
} from '@/lib/chill/visuals';
import {
  getPadPalette,
  PAD_PALETTES,
  type PadPalette,
  type PadPaletteId,
} from '@/lib/pad-palettes';

/*
 * Chill Visuals panel — the controls under the visualizer, in two closable
 * sections: Look (mode, colours, shape sliders) and Echo (per-type toggles
 * and sliders). Controls only; the parent owns the state and the canvas.
 * Spec: docs/specs/chill-machine-public.md → Visuals and Echo.
 */

const INK = '#5C3018';
const BROWN = '#7A5438';
const SERIF = 'var(--font-serif)';

const ECHO_LABELS: Record<EchoType, string> = {
  ripple: 'Ripple',
  bubble: 'Bubble',
  burst: 'Burst',
  glow: 'Glow',
  trail: 'Trail',
};

const ECHO_SLIDERS: { key: Exclude<keyof EchoTypeSettings, 'on'>; label: string }[] = [
  { key: 'size', label: 'Size' },
  { key: 'speed', label: 'Speed' },
  { key: 'strength', label: 'Strength' },
  { key: 'sensitivity', label: 'Sensitivity' },
];

const LOOK_SLIDERS: {
  key: 'speed' | 'density' | 'scale' | 'opacity' | 'depth3d';
  label: string;
}[] = [
  { key: 'speed', label: 'Speed' },
  { key: 'density', label: 'Density' },
  { key: 'scale', label: 'Size' },
  { key: 'opacity', label: 'Opacity' },
  { key: 'depth3d', label: 'Depth' },
];

/** One-word summary of the echoes that are on, for the closed header. */
export function echoSummary(echo: ChillVisualSettings['echo']): string {
  const on = ECHO_TYPES.filter((t) => echo[t].on);
  return on.length ? on.join(' + ') : 'off';
}

function swatch(palette: PadPalette): string {
  const sw = (palette.colors.length ? palette.colors : EARTH_VISUAL_PALETTE).slice(0, 4);
  return `conic-gradient(${sw.map((c, i) => `${c} ${(i / sw.length) * 100}% ${((i + 1) / sw.length) * 100}%`).join(', ')})`;
}

function Section({
  label,
  summary,
  defaultOpen,
  children,
}: {
  label: string;
  summary: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 py-2"
        style={{ background: 'none', border: 'none' }}
      >
        <span
          className="text-center text-sm font-bold uppercase tracking-[0.22em]"
          style={{ color: BROWN }}
        >
          {label}
        </span>
        {!open && (
          <span style={{ fontFamily: SERIF, fontSize: 13, color: `${BROWN}B0` }}>{summary}</span>
        )}
        <span
          aria-hidden
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: `${BROWN}80`,
          }}
        >
          ▾
        </span>
      </button>
      {open && <div className="animate-in fade-in duration-150 space-y-3 pt-1">{children}</div>}
    </div>
  );
}

function Slider({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3" style={{ fontFamily: SERIF }}>
      <span style={{ fontSize: 13, color: INK, width: 88, flexShrink: 0 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="min-w-0 flex-1 cursor-pointer"
        style={{ accentColor: BROWN, height: 4 }}
      />
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer rounded-full px-3 py-1 transition-colors"
      style={{
        fontFamily: SERIF,
        fontSize: 13,
        color: active ? '#F5ECDC' : INK,
        background: active ? BROWN : 'transparent',
        border: `1px solid ${active ? BROWN : '#C4A06060'}`,
      }}
    >
      {children}
    </button>
  );
}

export default function ChillVisualsPanel({
  value,
  onChange,
  padPalette,
}: {
  value: ChillVisualSettings;
  onChange: (next: ChillVisualSettings) => void;
  padPalette: PadPaletteId;
}) {
  const set = (patch: Partial<ChillVisualSettings>) => onChange({ ...value, ...patch });
  const setEcho = (type: EchoType, patch: Partial<EchoTypeSettings>) =>
    set({ echo: { ...value.echo, [type]: { ...value.echo[type], ...patch } } });
  const matched = getPadPalette(padPalette);

  return (
    <div className="space-y-2 px-2">
      <Section label="Look" summary={value.mode} defaultOpen>
        <div className="flex flex-wrap justify-center gap-2">
          {VISUALIZER_MODES.map((m) => (
            <Chip key={m} active={value.mode === m} onClick={() => set({ mode: m })}>
              {m}
            </Chip>
          ))}
        </div>

        {/* Colour — Match pads, then one swatch dot per palette */}
        <fieldset
          aria-label="Visual colours"
          className="m-0 flex items-center justify-center gap-2.5 border-0 p-0"
        >
          <Chip
            active={value.colors === 'match'}
            onClick={() => set({ colors: 'match' })}
            label={`Match pads (${matched.label})`}
          >
            Match pads
          </Chip>
          {PAD_PALETTES.map((p) => {
            const active = value.colors === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                aria-label={p.label}
                title={p.label}
                onClick={() => set({ colors: p.id })}
                className="cursor-pointer rounded-full transition-transform"
                style={{
                  width: 20,
                  height: 20,
                  padding: 0,
                  background: swatch(p),
                  border: 'none',
                  boxShadow: active
                    ? '0 0 0 2px #FBF6EC, 0 0 0 3.5px #7A5438'
                    : '0 0 0 1px #C4A06040',
                  transform: active ? 'scale(1.1)' : 'none',
                }}
              />
            );
          })}
        </fieldset>

        <div className="space-y-2">
          {LOOK_SLIDERS.map((s) => (
            <Slider
              key={s.key}
              label={s.label}
              ariaLabel={s.label}
              value={value[s.key]}
              onChange={(v) => set({ [s.key]: v })}
            />
          ))}
        </div>
      </Section>

      <Section label="Echo" summary={echoSummary(value.echo)} defaultOpen={false}>
        {ECHO_TYPES.map((type) => {
          const s = value.echo[type];
          const name = ECHO_LABELS[type];
          return (
            <div key={type} className="space-y-2">
              <div className="flex justify-center">
                <Chip active={s.on} onClick={() => setEcho(type, { on: !s.on })}>
                  {name}
                </Chip>
              </div>
              {s.on && (
                <div className="space-y-2">
                  {ECHO_SLIDERS.map((sl) => (
                    <Slider
                      key={sl.key}
                      label={sl.label}
                      ariaLabel={`${name} ${sl.label.toLowerCase()}`}
                      value={s[sl.key]}
                      onChange={(v) => setEcho(type, { [sl.key]: v })}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );
}
