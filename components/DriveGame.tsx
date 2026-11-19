'use client';

/*
 * Drive (docs/specs/drive-game.md): the racing game grown from the Speed pieces. Six worlds (Salt
 * Flat, Coast Road, Canyon Race, Night Rain, Chinatown Run, Neon District), the red car or the hover
 * ship, weather. The engine (components/drive/engine.ts) draws and runs it; this is the quiet shell
 * round it: a speed in the corner, the run's time, the worlds named small at the top, a Design
 * button, and the keys.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DriveEngine, type Hud } from '@/components/drive/engine';
import { FutureGauge, TimerGauge } from '@/components/drive/Speedometer';
import {
  controlsFromKeys,
  controlsFromTouches,
  DRIVE_KEYS,
  flightFromKeys,
  mergeControls,
} from '@/lib/art/drive';
import {
  type Design,
  DRIVE_MODES,
  type DriveMode,
  FIRES,
  GAUGES,
  type GaugeId,
  HULLS,
  isWorld,
  loadDesign,
  type Store,
  saveDesign,
  WORLDS,
  type WorldId,
} from '@/lib/art/drive-design';
import { WEATHERS } from '@/lib/art/weather';

export const BACK_HREF = '/geometry-field?tab=experiment';
const WEATHER_IDS = WEATHERS.map((w) => w.id);

function storage(): Store | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const quiet = 'rgba(255,248,240,';
const font = 'var(--font-serif), Georgia, serif';

export default function DriveGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DriveEngine | null>(null);
  const keys = useRef(new Set<string>());
  const touches = useRef(new Map<number, number>());
  // The Handbrake button, held (touch or mouse).
  const handHeld = useRef(false);
  const [hand, setHand] = useState(false);
  const [world, setWorldState] = useState<WorldId>('salt');
  const [design, setDesignState] = useState<Design>(() => loadDesign(null, WEATHER_IDS));
  const [panel, setPanel] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [hint, setHint] = useState(true);
  const [failed, setFailed] = useState(false);
  const panelRef = useRef(panel);
  panelRef.current = panel;
  // Sky Canyon flies as the City does (W S climb and dive, always cruising forward).
  const worldRef = useRef(world);
  worldRef.current = world;

  const pushControls = useCallback(() => {
    const w = window.innerWidth || 1;
    const xs = [...touches.current.values()].map((x) => x / w);
    const fromKeys =
      worldRef.current === 'sky' ? flightFromKeys(keys.current) : controlsFromKeys(keys.current);
    const c = mergeControls(fromKeys, controlsFromTouches(xs));
    engineRef.current?.setControls({ ...c, handbrake: !!c.handbrake || handHeld.current });
  }, []);

  const chooseWorld = useCallback(
    (id: WorldId) => {
      setWorldState(id);
      if (id === 'sky') setHint(true);
      worldRef.current = id;
      engineRef.current?.setWorld(id);
      pushControls();
    },
    [pushControls],
  );

  const changeDesign = useCallback((d: Design) => {
    setDesignState(d);
    saveDesign(storage(), d);
    engineRef.current?.setDesign(d);
  }, []);

  // The engine, the remembered design, and the world asked for in the address (?world=coast).
  useEffect(() => {
    const d = loadDesign(storage(), WEATHER_IDS);
    setDesignState(d);
    const asked = new URLSearchParams(window.location.search).get('world') ?? '';
    const first: WorldId = isWorld(asked) ? asked : 'salt';
    setWorldState(first);
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: DriveEngine;
    try {
      engine = new DriveEngine(canvas, {
        world: first,
        design: d,
        store: storage(),
        onHud: setHud,
      });
    } catch {
      setFailed(true);
      return;
    }
    engineRef.current = engine;
    const fit = () => engine.resize(window.innerWidth, window.innerHeight);
    fit();
    engine.start();
    window.addEventListener('resize', fit);
    const stopHint = window.setTimeout(() => setHint(false), 7000);
    return () => {
      window.removeEventListener('resize', fit);
      window.clearTimeout(stopHint);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPreview(panel);
  }, [panel]);

  // The keys: the City game's (arrows or WASD, Space, Shift), 1–6 for the worlds, R to restart, Esc.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (panelRef.current) setPanel(false);
        else router.push(BACK_HREF);
        return;
      }
      if (e.target instanceof HTMLInputElement) return;
      const w = WORLDS.find((x) => x.key === k);
      if (w) {
        chooseWorld(w.id);
        return;
      }
      if (k === 'r') {
        engineRef.current?.reset();
        return;
      }
      if (DRIVE_KEYS.includes(k)) {
        e.preventDefault();
        keys.current.add(k);
        setHint(false);
        pushControls();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      pushControls();
    };
    const blur = () => {
      keys.current.clear();
      touches.current.clear();
      handHeld.current = false;
      setHand(false);
      pushControls();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [router, chooseWorld, pushControls]);

  // Touch: hold the left or right of the screen to steer; any touch drives; two fingers boost.
  const onPointer = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (e.type === 'pointerdown' || e.type === 'pointermove')
      touches.current.set(e.pointerId, e.clientX);
    else touches.current.delete(e.pointerId);
    setHint(false);
    pushControls();
  };

  const kind = design.vehicle[world];
  const row = (
    label: string,
    items: { id: string; name: string }[],
    current: string,
    pick: (id: string) => void,
  ) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 12px' }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: `${quiet}0.35)`,
          minWidth: 62,
        }}
      >
        {label}
      </span>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => pick(it.id)}
          aria-pressed={it.id === current}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: font,
            fontSize: 12,
            color: `${quiet}${it.id === current ? 0.95 : 0.45})`,
            textDecoration: it.id === current ? 'underline' : 'none',
            textUnderlineOffset: 4,
          }}
        >
          {it.name}
        </button>
      ))}
    </div>
  );

  return (
    <div
      data-testid="drive"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#08060a',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerDown={onPointer}
      onPointerMove={onPointer}
      onPointerUp={onPointer}
      onPointerCancel={onPointer}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* The way out is the shared tab in this corner (components/GridMenu.tsx); Esc goes to Art. */}

      <nav
        aria-label="Worlds"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          left: 80,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: '2px 4px',
          fontFamily: font,
          fontSize: 12,
        }}
      >
        {WORLDS.map((w, i) => (
          <span key={w.id} style={{ color: `${quiet}0.3)` }}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <button
              type="button"
              onClick={() => chooseWorld(w.id)}
              aria-current={w.id === world ? 'true' : undefined}
              title={`${w.name} (${w.key})`}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: font,
                fontSize: 12,
                color: `${quiet}${w.id === world ? 0.9 : 0.4})`,
              }}
            >
              {w.name}
            </button>
          </span>
        ))}
      </nav>

      {hud && (
        <div
          data-testid="drive-hud"
          style={{
            position: 'absolute',
            left: 16,
            bottom: 14,
            fontFamily: font,
            color: `${quiet}0.7)`,
            pointerEvents: 'none',
          }}
        >
          {design.gauge === 'future' ? (
            <FutureGauge speed={hud.speed} gear={hud.gear ?? 1} revs={hud.revs ?? 0} />
          ) : design.gauge === 'timer' ? (
            <TimerGauge speed={hud.speed} gear={hud.gear ?? 1} revs={hud.revs ?? 0} />
          ) : (
            <div style={{ fontSize: 22, lineHeight: 1 }}>
              {hud.speed}
              <span style={{ fontSize: 9, marginLeft: 4, color: `${quiet}0.4)` }}>km/h</span>
              {hud.gear !== undefined && (
                <span style={{ fontSize: 10, marginLeft: 8, color: `${quiet}0.5)` }}>
                  gear {hud.gear}
                </span>
              )}
            </div>
          )}
          {(hud.time || hud.best) && (
            <div style={{ fontSize: 11, marginTop: 4, color: `${quiet}0.5)` }}>
              {hud.time && (
                <span style={{ color: hud.record ? `${quiet}0.9)` : undefined }}>{hud.time}</span>
              )}
              {hud.time && hud.best && !hud.running && <span> · </span>}
              {hud.best && !hud.running && <span>best {hud.best}</span>}
            </div>
          )}
          {hud.drift != null && (
            <div style={{ fontSize: 11, marginTop: 2, color: `${quiet}0.5)` }}>
              drift {hud.drift}
              {hud.combo != null && (
                <span style={{ color: 'rgba(255,200,110,0.9)' }}> ×{hud.combo.toFixed(1)}</span>
              )}
              {hud.combo == null && hud.driftBest != null && <span> · best {hud.driftBest}</span>}
            </div>
          )}
        </div>
      )}

      {hint && !failed && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 112,
            textAlign: 'center',
            fontFamily: font,
            fontSize: 11,
            color: `${quiet}0.4)`,
            pointerEvents: 'none',
          }}
        >
          {world === 'sky'
            ? 'W S climb and dive · A D turn · E faster · Q slower · F handbrake · space boost · R restart'
            : '↑ drive · ← → steer · F handbrake: hold it and turn to drift · space boost · shift double · R restart'}
        </div>
      )}

      {failed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontFamily: font,
            fontSize: 13,
            color: `${quiet}0.5)`,
          }}
        >
          This game needs WebGL.
        </div>
      )}

      <button
        type="button"
        aria-label="Handbrake: hold it and turn to drift"
        aria-pressed={hand}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          handHeld.current = true;
          setHand(true);
          setHint(false);
          pushControls();
        }}
        onPointerUp={() => {
          handHeld.current = false;
          setHand(false);
          pushControls();
        }}
        onPointerCancel={() => {
          handHeld.current = false;
          setHand(false);
          pushControls();
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 64,
          padding: '10px 16px',
          borderRadius: 999,
          border: `1px solid ${quiet}${hand ? 0.6 : 0.22})`,
          background: hand ? 'rgba(255,190,100,0.22)' : 'rgba(14,10,14,0.25)',
          cursor: 'pointer',
          fontFamily: font,
          fontSize: 12,
          color: `${quiet}${hand ? 0.95 : 0.6})`,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        Handbrake
      </button>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setPanel((p) => !p)}
        aria-expanded={panel}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 14,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: font,
          fontSize: 12,
          color: `${quiet}${panel ? 0.9 : 0.5})`,
        }}
      >
        Design
      </button>

      {panel && (
        <div
          role="dialog"
          aria-label="Design"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 40,
            maxWidth: 'calc(100% - 32px)',
            width: 420,
            padding: '14px 18px',
            borderRadius: 14,
            background: 'rgba(14,10,14,0.72)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            display: 'grid',
            gap: 10,
            fontFamily: font,
          }}
        >
          {row(
            'Vehicle',
            [
              { id: 'car', name: 'Car' },
              { id: 'ship', name: 'Hover ship' },
            ],
            kind,
            (id) =>
              changeDesign({
                ...design,
                vehicle: { ...design.vehicle, [world]: id as 'car' | 'ship' },
              }),
          )}
          {row('Fire', FIRES, design.fire, (id) =>
            changeDesign({ ...design, fire: id as Design['fire'] }),
          )}
          {row('Hull', HULLS, design.hull, (id) =>
            changeDesign({ ...design, hull: id as Design['hull'] }),
          )}
          {row('Weather', WEATHERS, design.weather, (id) =>
            changeDesign({ ...design, weather: id }),
          )}
          {row('Mode', DRIVE_MODES, design.mode, (id) =>
            changeDesign({ ...design, mode: id as DriveMode }),
          )}
          {row('Speedo', GAUGES, design.gauge, (id) =>
            changeDesign({ ...design, gauge: id as GaugeId }),
          )}
          {row(
            'Flames',
            [
              { id: 'on', name: 'At speed' },
              { id: 'off', name: 'Off' },
            ],
            design.flames ? 'on' : 'off',
            (id) => changeDesign({ ...design, flames: id === 'on' }),
          )}
        </div>
      )}
    </div>
  );
}
