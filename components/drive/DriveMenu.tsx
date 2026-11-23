'use client';

/*
 * Drive's menu (docs/specs/drive-menus.md, "The menu"). Asked 2026-11-23: "make the right hand menu
 * better. like a proper menu that opens with garage a proper category in itself." A sheet slides in
 * from the right, lifted over the game with a soft shadow, in four categories:
 *
 * - Tracks: the nine worlds, and the way back to the track ring.
 * - Garage: the vehicle, its body (or the ship's parts), the colour and finish, the fire and the
 *   flames. Choosing it puts your ride big on the Garage's turntable, on Mars, beside the sheet.
 * - World: the weather, the light trails, the rivals.
 * - Settings: the driving mode and the speedometer.
 *
 * Keyboard first: ← → change category, ↑ ↓ move through the choices, Enter picks, Esc closes.
 * Everything chosen is the same saved design as before (lib/art/drive-design.ts).
 */

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { GarageScene } from '@/components/garage/scene';
import {
  BODIES,
  type BodyId,
  BUBBLES,
  type BubbleId,
  CORES,
  type CoreId,
  type Design,
  DRIVE_MODES,
  type DriveMode,
  FIRES,
  GAUGES,
  type GaugeId,
  HULLS,
  REACTORS,
  type ReactorId,
  WORLDS,
  type WorldId,
} from '@/lib/art/drive-design';
import type { VehicleKind } from '@/lib/art/vehicle';
import { WEATHERS } from '@/lib/art/weather';
import { driveSound } from '@/lib/audio/drive-sound';

export type MenuTab = 'tracks' | 'garage' | 'world' | 'settings';
export const MENU_TABS: { id: MenuTab; name: string }[] = [
  { id: 'tracks', name: 'Tracks' },
  { id: 'garage', name: 'Garage' },
  { id: 'world', name: 'World' },
  { id: 'settings', name: 'Settings' },
];
export const isMenuTab = (v: unknown): v is MenuTab => MENU_TABS.some((t) => t.id === v);
/** The category the menu opened on last. */
export const MENU_TAB_KEY = 'drive.menuTab';
export const GARAGE_HREF = '/geometry-field/garage';

const quiet = 'rgba(255,248,240,';
const serif = 'var(--font-serif), Georgia, serif';
const GOLD = '#e2b04a';
const SHEET_W = 360;

interface Props {
  world: WorldId;
  design: Design;
  /** The vehicle in this world. */
  kind: VehicleKind;
  tab: MenuTab;
  onTab: (t: MenuTab) => void;
  onChange: (d: Design) => void;
  onWorld: (id: WorldId) => void;
  onRing: () => void;
  /** Room for more settings (the game's sound, when it comes). */
  settingsExtra?: ReactNode;
}

/** One choice: a label, then its options in the display serif; the chosen one warm white, gold-marked. */
export function Row({
  label,
  items,
  current,
  pick,
}: {
  label: string;
  items: { id: string; name: string }[];
  current: string;
  pick: (id: string) => void;
}) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
      <legend
        style={{
          padding: 0,
          marginBottom: 6,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: `${quiet}0.4)`,
        }}
      >
        {label}
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
        {items.map((it) => {
          const on = it.id === current;
          return (
            <button
              key={it.id}
              type="button"
              data-menu-item=""
              onClick={() => {
                driveSound.swell();
                pick(it.id);
              }}
              aria-pressed={on}
              className="dm-opt"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${on ? `${GOLD}88` : 'transparent'}`,
                background: on ? 'rgba(226,176,74,0.12)' : 'none',
                cursor: 'pointer',
                fontFamily: serif,
                fontSize: 13,
                color: `${quiet}${on ? 0.95 : 0.55})`,
              }}
            >
              {on && (
                <span
                  aria-hidden="true"
                  style={{ width: 5, height: 5, borderRadius: 9, background: GOLD }}
                />
              )}
              {it.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const onOff = (on: string, off: string) => [
  { id: 'on', name: on },
  { id: 'off', name: off },
];

/** The Garage's turntable on Mars, big beside the sheet, with your ride on it. */
function GarageStage({ design, kind }: { design: Design; kind: VehicleKind }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GarageScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [rev, setRev] = useState(false);
  const first = useRef({ design, kind });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: GarageScene;
    try {
      scene = new GarageScene(canvas, first.current.design, first.current.kind);
    } catch {
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    const fitStage = () => {
      const r = canvas.getBoundingClientRect();
      scene.resize(r.width || window.innerWidth, r.height || window.innerHeight);
    };
    fitStage();
    scene.start();
    window.addEventListener('resize', fitStage);
    return () => {
      window.removeEventListener('resize', fitStage);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Rebuild the ride when what it looks like changes.
  const look = [
    kind,
    design.hull,
    design.paint,
    design.body,
    design.fire,
    design.reactors,
    design.bubble,
    design.core,
    design.flames,
  ].join('|');
  const latest = useRef({ design, kind });
  latest.current = { design, kind };
  useEffect(() => {
    if (look) sceneRef.current?.setRide(latest.current.design, latest.current.kind);
  }, [look]);

  const revOn = (on: boolean) => {
    setRev(on);
    sceneRef.current?.setRev(on);
  };

  if (failed) return null;
  return (
    <div className="dm-stage" data-testid="menu-garage">
      <canvas
        ref={canvasRef}
        aria-label="Your ride on the turntable: drag to turn it, scroll to zoom"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          sceneRef.current?.pointerDown(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => sceneRef.current?.pointerMove(e.clientX, e.clientY)}
        onPointerUp={() => sceneRef.current?.pointerUp()}
        onPointerCancel={() => sceneRef.current?.pointerUp()}
        onWheel={(e) => {
          e.stopPropagation();
          sceneRef.current?.wheel(e.deltaY);
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          left: 20,
          top: 56,
          pointerEvents: 'none',
          fontFamily: serif,
          color: `${quiet}0.9)`,
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: '0.04em' }}>Garage</div>
        <div style={{ fontSize: 12, color: `${quiet}0.55)`, marginTop: 2 }}>
          Drag to turn your ride · scroll to look closer
        </div>
      </div>
      <button
        type="button"
        aria-pressed={rev}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          revOn(true);
        }}
        onPointerUp={() => revOn(false)}
        onPointerCancel={() => revOn(false)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') revOn(true);
        }}
        onKeyUp={() => revOn(false)}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 28,
          transform: 'translateX(-50%)',
          padding: '9px 18px',
          borderRadius: 999,
          border: '1px solid rgba(255,140,70,0.5)',
          background: rev ? 'rgba(255,110,50,0.25)' : 'rgba(14,10,14,0.35)',
          color: `${quiet}0.85)`,
          fontFamily: serif,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Hold to rev
      </button>
    </div>
  );
}

export default function DriveMenu({
  world,
  design,
  kind,
  tab,
  onTab,
  onChange,
  onWorld,
  onRing,
  settingsExtra,
}: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef(new Map<MenuTab, HTMLButtonElement>());

  // Open on the chosen category's tab, so the keys work straight away.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on opening.
  useEffect(() => {
    tabRefs.current.get(tab)?.focus({ preventScroll: true });
  }, []);

  const go = useCallback(
    (step: number) => {
      const i = MENU_TABS.findIndex((t) => t.id === tab);
      const next = MENU_TABS[(i + step + MENU_TABS.length) % MENU_TABS.length].id;
      driveSound.tick();
      onTab(next);
      tabRefs.current.get(next)?.focus({ preventScroll: true });
    },
    [tab, onTab],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      go(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [
        ...(sheetRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? []),
      ];
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next =
        at < 0
          ? e.key === 'ArrowDown'
            ? 0
            : items.length - 1
          : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      driveSound.tick();
      items[next].focus();
    }
  };

  const set = (patch: Partial<Design>) => onChange({ ...design, ...patch });

  return (
    <>
      <style>{`
        @keyframes dm-in { from { transform: translateX(28px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes dm-fade { from { opacity: 0 } to { opacity: 1 } }
        .dm-sheet { top: 0; right: 0; bottom: 0; width: min(${SHEET_W}px, 100%); border-radius: 18px 0 0 18px; }
        .dm-stage { position: absolute; top: 0; left: 0; bottom: 0; right: ${SHEET_W}px; animation: dm-fade 500ms ease-out; }
        .dm-opt:hover { color: rgba(255,248,240,0.9) !important; }
        .dm-opt:focus-visible, .dm-tab:focus-visible, .dm-world:focus-visible { outline: 1px solid ${GOLD}; outline-offset: 2px; }
        @media (max-width: 700px) {
          .dm-sheet { top: 46%; width: 100%; border-radius: 18px 18px 0 0; }
          .dm-stage { right: 0; bottom: 54%; }
        }
        @media (prefers-reduced-motion: reduce) { .dm-sheet, .dm-stage { animation: none !important } }
      `}</style>

      {tab === 'garage' && <GarageStage design={design} kind={kind} />}

      <div
        ref={sheetRef}
        role="dialog"
        aria-label="Menu"
        className="dm-sheet"
        onKeyDown={onKey}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(16,12,14,0.88)',
          backdropFilter: 'blur(10px)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.5), -1px 0 0 rgba(255,248,240,0.06)',
          fontFamily: serif,
          color: `${quiet}0.9)`,
          animation: 'dm-in 420ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div style={{ padding: '58px 22px 10px' }}>
          <div
            role="tablist"
            aria-label="Menu categories"
            style={{ display: 'flex', gap: 18, borderBottom: `1px solid ${quiet}0.08)` }}
          >
            {MENU_TABS.map((t) => {
              const on = t.id === tab;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(t.id, el);
                    else tabRefs.current.delete(t.id);
                  }}
                  type="button"
                  role="tab"
                  className="dm-tab"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => {
                    driveSound.tick();
                    onTab(t.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: `1.5px solid ${on ? GOLD : 'transparent'}`,
                    padding: '0 0 9px',
                    marginBottom: -1,
                    cursor: 'pointer',
                    fontFamily: serif,
                    fontSize: 16,
                    letterSpacing: '0.02em',
                    color: `${quiet}${on ? 0.95 : 0.45})`,
                    transition: 'color 300ms, border-color 300ms',
                  }}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          aria-label={MENU_TABS.find((t) => t.id === tab)?.name}
          key={tab}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 22px 28px',
            display: 'grid',
            alignContent: 'start',
            gap: 18,
            animation: 'dm-fade 320ms ease-out',
          }}
        >
          {tab === 'tracks' && (
            <>
              <nav aria-label="Worlds" style={{ display: 'grid', gap: 2 }}>
                {WORLDS.map((w) => {
                  const on = w.id === world;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      data-menu-item=""
                      className="dm-world"
                      onClick={() => onWorld(w.id)}
                      aria-current={on ? 'true' : undefined}
                      title={`${w.name} (${w.key})`}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        padding: '7px 10px',
                        borderRadius: 10,
                        border: 'none',
                        background: on ? 'rgba(226,176,74,0.12)' : 'none',
                        cursor: 'pointer',
                        fontFamily: serif,
                        fontSize: 16,
                        textAlign: 'left',
                        color: `${quiet}${on ? 0.95 : 0.6})`,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: 9,
                          width: 10,
                          color: on ? GOLD : `${quiet}0.35)`,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                      >
                        {w.key}
                      </span>
                      {w.name}
                    </button>
                  );
                })}
              </nav>
              <button
                type="button"
                data-menu-item=""
                className="dm-opt"
                onClick={onRing}
                style={{
                  justifySelf: 'start',
                  background: 'none',
                  border: 'none',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontFamily: serif,
                  fontSize: 13,
                  color: 'rgba(255,200,120,0.85)',
                }}
              >
                Track ring ›
              </button>
            </>
          )}

          {tab === 'garage' && (
            <>
              <Row
                label="Vehicle"
                items={[
                  { id: 'car', name: 'Car' },
                  { id: 'ship', name: 'Hover ship' },
                ]}
                current={kind}
                pick={(id) => set({ vehicle: { ...design.vehicle, [world]: id as VehicleKind } })}
              />
              {kind === 'car' && (
                <Row
                  label="Body"
                  items={BODIES}
                  current={design.body}
                  pick={(id) => set({ body: id as BodyId })}
                />
              )}
              {kind === 'ship' && (
                <>
                  <Row
                    label="Reactors"
                    items={REACTORS}
                    current={design.reactors}
                    pick={(id) => set({ reactors: id as ReactorId })}
                  />
                  <Row
                    label="Cockpit"
                    items={BUBBLES}
                    current={design.bubble}
                    pick={(id) => set({ bubble: id as BubbleId })}
                  />
                  <Row
                    label="Core"
                    items={CORES}
                    current={design.core}
                    pick={(id) => set({ core: id as CoreId })}
                  />
                </>
              )}
              <Row
                label="Colour"
                items={HULLS}
                current={design.hull}
                pick={(id) => set({ hull: id as Design['hull'] })}
              />
              {design.hull === 'paint' && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: -8,
                    fontSize: 12,
                    color: `${quiet}0.7)`,
                  }}
                >
                  <input
                    type="color"
                    data-menu-item=""
                    value={design.paint}
                    onChange={(e) => set({ paint: e.target.value.toLowerCase() })}
                    style={{
                      width: 40,
                      height: 28,
                      border: 0,
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  Your colour
                </label>
              )}
              <Row
                label="Fire"
                items={FIRES}
                current={design.fire}
                pick={(id) => set({ fire: id as Design['fire'] })}
              />
              <Row
                label="Flames"
                items={onOff('At speed', 'Off')}
                current={design.flames ? 'on' : 'off'}
                pick={(id) => set({ flames: id === 'on' })}
              />
              <a
                href={GARAGE_HREF}
                data-menu-item=""
                className="dm-opt"
                style={{
                  justifySelf: 'start',
                  padding: '4px 10px',
                  fontSize: 13,
                  color: 'rgba(255,200,120,0.85)',
                  textDecoration: 'none',
                }}
              >
                Full garage ›
              </a>
            </>
          )}

          {tab === 'world' && (
            <>
              <Row
                label="Weather"
                items={WEATHERS}
                current={design.weather}
                pick={(id) => set({ weather: id })}
              />
              <Row
                label="Light trail"
                items={onOff('On', 'Off')}
                current={design.trail ? 'on' : 'off'}
                pick={(id) => set({ trail: id === 'on' })}
              />
              <Row
                label="Racers"
                items={onOff('5 rivals', 'Alone')}
                current={design.rivals ? 'on' : 'off'}
                pick={(id) => set({ rivals: id === 'on' })}
              />
            </>
          )}

          {tab === 'settings' && (
            <>
              <Row
                label="Mode"
                items={DRIVE_MODES}
                current={design.mode}
                pick={(id) => set({ mode: id as DriveMode })}
              />
              <Row
                label="Speedo"
                items={GAUGES}
                current={design.gauge}
                pick={(id) => set({ gauge: id as GaugeId })}
              />
              {settingsExtra}
            </>
          )}
        </div>

        <div
          style={{
            padding: '10px 22px 16px',
            fontSize: 10,
            letterSpacing: '0.04em',
            color: `${quiet}0.35)`,
            borderTop: `1px solid ${quiet}0.06)`,
          }}
        >
          ← → categories · ↑ ↓ choose · Enter pick · Esc close
        </div>
      </div>
    </>
  );
}
