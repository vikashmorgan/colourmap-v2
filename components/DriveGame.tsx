'use client';

/*
 * Drive (docs/specs/drive-game.md): the racing game grown from the Speed pieces. Six worlds (Salt
 * Flat, Coast Road, Canyon Race, Night Rain, Chinatown Run, Neon District), the red car or the hover
 * ship, weather. The engine (components/drive/engine.ts) draws and runs it; this is the quiet shell
 * round it: a speed in the corner, the run's time, a menu at the top right that slides a sheet in
 * from the right (components/drive/DriveMenu.tsx: Tracks, Garage, World, Settings), and the keys.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import DesignHud from '@/components/drive/DesignHud';
import DriveMenu, {
  isMenuTab,
  MENU_TAB_KEY,
  type MenuTab,
  Row,
} from '@/components/drive/DriveMenu';
import { DesignSpace } from '@/components/drive/design-space';
import { DriveEngine, type Hud, type IntroState } from '@/components/drive/engine';
import { PauseMenu, RaceResults, TitleScreen } from '@/components/drive/GameSheets';
import RaceIntro from '@/components/drive/RaceIntro';
import { FutureGauge, TimerGauge } from '@/components/drive/Speedometer';
import TrackRing from '@/components/drive/TrackRing';
import ZoneTitle from '@/components/drive/ZoneTitle';
import { dressingFor, type Pos } from '@/lib/art/design-space';
import {
  controlsFromKeys,
  controlsFromTouches,
  DRIVE_KEYS,
  flightFromKeys,
  mergeControls,
} from '@/lib/art/drive';
import {
  type Design,
  isWorld,
  loadDesign,
  type Store,
  saveDesign,
  WORLDS,
  type WorldId,
} from '@/lib/art/drive-design';
import { WEAPON_NAME, type WeaponId } from '@/lib/art/pickups';
import type { RaceResult } from '@/lib/art/race-result';
import { WEATHERS } from '@/lib/art/weather';
import { driveSound } from '@/lib/audio/drive-sound';
import { loadSoundPrefs, type SoundPrefs, saveSoundPrefs } from '@/lib/audio/drive-sound-map';

export const BACK_HREF = '/geometry-field?tab=experiment';
/** The track you raced last, so the ring opens on it. */
export const LAST_TRACK_KEY = 'drive.lastTrack';
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
/** The weapon charges' dots in the HUD, as their orbs in the gates (components/drive/gates-view.ts). */
const CHARGE_DOT: Record<WeaponId, string> = {
  shark: 'rgba(110,230,205,0.85)',
  shot: 'rgba(255,225,100,0.85)',
  laser: 'rgba(255,110,90,0.85)',
};

export default function DriveGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DriveEngine | null>(null);
  const keys = useRef(new Set<string>());
  const touches = useRef(new Map<number, number>());
  // The Handbrake button, held (touch or mouse).
  const handHeld = useRef(false);
  const [hand, setHand] = useState(false);
  const [world, setWorldState] = useState<WorldId>(WORLDS[0].id);
  const [design, setDesignState] = useState<Design>(() => loadDesign(null, WEATHER_IDS));
  const [panel, setPanel] = useState(false);
  // The menu's category (Tracks, Garage, World, Settings), remembered.
  const [tab, setTab] = useState<MenuTab>('tracks');
  // The track ring (docs/specs/drive-menus.md): the first screen, and from the menu.
  const [ring, setRing] = useState(true);
  // The title comes first, then the ring; the pause and the results are sheets over the game.
  const [title, setTitle] = useState(true);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<RaceResult | null>(null);
  const sheetRef = useRef(false);
  // The race intro (flyover, grid, click to start, countdown), while it runs.
  const [intro, setIntro] = useState<IntroState | null>(null);
  const introRef = useRef(intro);
  introRef.current = intro;
  const [hud, setHud] = useState<Hud | null>(null);
  /** The sound's mute and volume, remembered on the device (lib/audio/drive-sound-map.ts). */
  const [sound, setSound] = useState<SoundPrefs>(() => loadSoundPrefs(null));
  const [hint, setHint] = useState(true);
  const [failed, setFailed] = useState(false);
  /** The design space is open (docs/specs/drive-tracks.md, "Design space"). */
  const [designing, setDesigning] = useState(false);
  const spaceRef = useRef<DesignSpace | null>(null);
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
    const handbrake = !!c.handbrake || handHeld.current;
    engineRef.current?.setControls({ ...c, handbrake });
    driveSound.controls({ boost: c.boost, handbrake, steer: c.steer });
  }, []);

  /** Chinatown Run and the Neon District wear their district's pieces (lib/art/design-space.ts). */
  const dress = useCallback((id: WorldId) => {
    const sp = spaceRef.current;
    if (!sp) return;
    const cells = dressingFor(id);
    sp.root.visible = cells.length > 0;
    if (cells.length) sp.setLayers(cells);
  }, []);

  const chooseWorld = useCallback(
    (id: WorldId) => {
      setWorldState(id);
      dress(id);
      if (id === 'sky') setHint(true);
      worldRef.current = id;
      engineRef.current?.setWorld(id);
      try {
        storage()?.setItem(LAST_TRACK_KEY, id);
      } catch {
        // Storage may be blocked: the ring then opens on the top track.
      }
      pushControls();
    },
    [pushControls, dress],
  );

  const changeSound = useCallback((p: SoundPrefs) => {
    setSound(p);
    saveSoundPrefs(storage(), p);
    driveSound.setPrefs(p);
  }, []);

  const chooseTab = useCallback((t: MenuTab) => {
    setTab(t);
    try {
      storage()?.setItem(MENU_TAB_KEY, t);
    } catch {
      // Blocked storage: the menu opens on Tracks next time.
    }
  }, []);

  const changeDesign = useCallback((d: Design) => {
    setDesignState(d);
    saveDesign(storage(), d);
    engineRef.current?.setDesign(d);
  }, []);

  // The engine, the remembered design, and the world asked for in the address (?world=coast).
  useEffect(() => {
    const d = loadDesign(storage(), WEATHER_IDS);
    setDesignState(d);
    const prefs = loadSoundPrefs(storage());
    setSound(prefs);
    driveSound.setPrefs(prefs);
    const lastTab = storage()?.getItem(MENU_TAB_KEY);
    if (isMenuTab(lastTab)) setTab(lastTab);
    const asked = new URLSearchParams(window.location.search).get('world') ?? '';
    const last = storage()?.getItem(LAST_TRACK_KEY) ?? '';
    const first: WorldId = isWorld(asked) ? asked : isWorld(last) ? last : WORLDS[0].id;
    setWorldState(first);
    // A link to a world drives straight in; otherwise the ring comes first.
    if (isWorld(asked)) {
      setRing(false);
      setTitle(false);
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: DriveEngine;
    let lastPickup: string | null = null;
    try {
      engine = new DriveEngine(canvas, {
        world: first,
        design: d,
        store: storage(),
        onHud: (h) => {
          setHud(h);
          driveSound.hud(h);
          // Through a gate: a soft rush of air and a warm swell for what it gave.
          if (h.pickup && !lastPickup) {
            driveSound.whoosh(0.8);
            driveSound.swell();
          }
          lastPickup = h.pickup ?? null;
        },
        onIntro: (s) => {
          setIntro(s);
          driveSound.intro(s);
        },
        onFinish: (r) => {
          setResults(r);
          driveSound.finish(r);
        },
        onFrame: (dt) => {
          const sp = spaceRef.current;
          const here = engineRef.current?.where();
          if (sp?.root.visible && here) sp.update(dt, here.track, here.s, here.ox, here.oy);
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    engineRef.current = engine;
    const space = new DesignSpace(engine.stage3d);
    space.root.visible = false;
    spaceRef.current = space;
    const cells = dressingFor(first);
    if (cells.length) {
      space.setLayers(cells);
      space.root.visible = true;
    }
    const fit = () => {
      engine.resize(window.innerWidth, window.innerHeight);
      space.setScale(1.5 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5));
    };
    fit();
    engine.start();
    window.addEventListener('resize', fit);
    const stopHint = window.setTimeout(() => setHint(false), 7000);
    return () => {
      window.removeEventListener('resize', fit);
      window.clearTimeout(stopHint);
      space.dispose();
      spaceRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPreview(panel || ring || title || paused || results !== null);
  }, [panel, ring, title, paused, results]);

  // The race's sound (engine, wind, hiss) plays while you drive; the menus and sheets duck it.
  useEffect(() => {
    driveSound.setDriving(
      !panel && !ring && !title && !paused && results === null && !designing && !failed,
    );
  }, [panel, ring, title, paused, results, designing, failed]);
  useEffect(() => {
    driveSound.setVehicle(design.vehicle[world]);
  }, [design, world]);
  // The audio sleeps while the page is hidden and when the game is left.
  useEffect(() => {
    const vis = () => {
      if (document.hidden) driveSound.suspend();
      else if (driveSound.ready) driveSound.unlock();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      driveSound.setDriving(false);
      driveSound.suspend();
    };
  }, []);
  sheetRef.current = title || paused || results !== null || designing;

  // The Garage category shows your ride on its own turntable: the game rests underneath meanwhile.
  const inGarage = panel && !ring && tab === 'garage';
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (inGarage) e.stop();
    else e.start();
  }, [inGarage]);

  const openRing = useCallback(() => {
    driveSound.tick();
    setPaused(false);
    setResults(null);
    setPanel(false);
    setIntro(null);
    setRing(true);
  }, []);

  const restart = useCallback(() => {
    driveSound.swell();
    setPaused(false);
    setResults(null);
    engineRef.current?.startIntro(true);
  }, []);

  /** The design space: the autopilot drives the chosen track while its elements are laid on it. */
  const openDesign = useCallback(() => {
    driveSound.swell();
    setRing(false);
    setPanel(false);
    setHint(false);
    setDesigning(true);
    engineRef.current?.setAutopilot(true);
    if (spaceRef.current) spaceRef.current.root.visible = true;
  }, []);
  const closeDesign = useCallback(() => {
    driveSound.tick();
    setDesigning(false);
    engineRef.current?.setAutopilot(false);
    dress(worldRef.current);
    setRing(true);
  }, [dress]);
  const showDesign = useCallback((p: Pos) => spaceRef.current?.set(p), []);

  const race = useCallback(() => {
    driveSound.swell();
    setRing(false);
    setPanel(false);
    setHint(true);
    engineRef.current?.startIntro();
  }, []);

  /** A key or click during the intro: skip the flyover, or start the countdown. True if used. */
  const introKey = useCallback(() => {
    const p = introRef.current?.phase;
    if (p === 'fly') engineRef.current?.skipIntro();
    else if (p === 'grid' || p === 'ready') engineRef.current?.launch();
    else return false;
    return true;
  }, []);

  // The keys: the City game's (arrows or WASD, Space, Shift), 1–6 for the worlds, R to restart, Esc.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // A key is a gesture: the audio may start now.
      driveSound.unlock();
      // The title, pause and results sheets take their own keys first.
      if (sheetRef.current) return;
      if (k === 'escape') {
        // Esc closes the menu; in the intro it goes back to the ring; driving, it pauses.
        if (panelRef.current) setPanel(false);
        else if (introRef.current) openRing();
        else setPaused(true);
        return;
      }
      if (e.target instanceof HTMLInputElement) return;
      // The open menu takes the arrows (categories and choices).
      if (panelRef.current && k.startsWith('arrow')) return;
      // During the intro any key moves it on; the driving keys are still held for the GO.
      if (introKey() && !DRIVE_KEYS.includes(k)) return;
      const w = WORLDS.find((x) => x.key === k);
      if (w) {
        chooseWorld(w.id);
        return;
      }
      if (k === 'x') {
        // Fire a weapon charge from the gates (the attack code handles it).
        engineRef.current?.fireWeapon();
        return;
      }
      if (k === 'r') {
        // A restart goes straight to the grid.
        restart();
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
  }, [chooseWorld, pushControls, introKey, openRing, restart]);

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
      onPointerDownCapture={() => driveSound.unlock()}
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

      {/* The menu (2026-11-19: "the space garage should be accessible below the menu top right where
          the tracks can be chosen … make that menu smarter, open closed column, and the design
          options for racing also there"): one button naming the track; it opens a column with the
          tracks, the Garage and the Design rows. */}
      {!ring && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            driveSound.tick();
            setPanel((p) => !p);
          }}
          aria-expanded={panel}
          aria-label="Menu"
          style={{
            position: 'absolute',
            zIndex: 3,
            top: 10,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 14px',
            borderRadius: 999,
            border: `1px solid ${quiet}${panel ? 0.4 : 0.18})`,
            background: panel ? 'rgba(14,10,14,0.78)' : 'rgba(14,10,14,0.35)',
            backdropFilter: 'blur(6px)',
            cursor: 'pointer',
            fontFamily: font,
            fontSize: 12,
            color: `${quiet}0.85)`,
          }}
        >
          <span aria-hidden="true" style={{ display: 'grid', gap: 2.5 }}>
            {[0, 1, 2].map((k) => (
              <span key={k} style={{ width: 12, height: 1.2, background: `${quiet}0.7)` }} />
            ))}
          </span>
          <span>{WORLDS.find((w) => w.id === world)?.name}</span>
          <span
            aria-hidden="true"
            style={{
              fontSize: 9,
              color: `${quiet}0.5)`,
              transform: panel ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          >
            ▼
          </span>
        </button>
      )}

      {hud && !ring && (
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
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 11,
                marginTop: 4,
                color: `${quiet}0.5)`,
              }}
            >
              {hud.time && (
                <span style={{ color: hud.record ? `${quiet}0.9)` : undefined }}>{hud.time}</span>
              )}
              {hud.time && hud.best && !hud.running && <span> · </span>}
              {hud.best && !hud.running && <span>best {hud.best}</span>}
            </div>
          )}
          {hud.place != null && (
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 11,
                marginTop: 2,
                color: `${quiet}0.5)`,
              }}
            >
              <span style={{ color: hud.place === 1 ? 'rgba(255,200,110,0.95)' : undefined }}>
                P{hud.place}
              </span>{' '}
              / {hud.racers}
            </div>
          )}
          {hud.drift != null && (
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 11,
                marginTop: 2,
                color: `${quiet}0.5)`,
              }}
            >
              drift {hud.drift}
              {hud.combo != null && (
                <span style={{ color: 'rgba(255,200,110,0.9)' }}> ×{hud.combo.toFixed(1)}</span>
              )}
              {hud.combo == null && hud.driftBest != null && <span> · best {hud.driftBest}</span>}
            </div>
          )}
          {((hud.charges?.length ?? 0) > 0 || hud.pickup) && (
            <div
              data-testid="drive-charges"
              style={{
                fontSize: 11,
                marginTop: 4,
                color: `${quiet}0.5)`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {hud.charges?.map((c, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{ width: 6, height: 6, borderRadius: 3, background: CHARGE_DOT[c] }}
                  />
                  {WEAPON_NAME[c]}
                </span>
              ))}
              {(hud.charges?.length ?? 0) > 0 && <span style={{ color: `${quiet}0.3)` }}>x</span>}
              {hud.pickup && (
                <span style={{ color: 'rgba(255,200,110,0.85)' }}>
                  {hud.pickup === 'booster' ? 'booster' : `+ ${WEAPON_NAME[hud.pickup]}`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {hint && !failed && !ring && !intro && !paused && !results && (
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
            : '↑ drive · ← → steer · F handbrake: hold it and turn to drift · space boost · shift double · X fire · R restart'}
        </div>
      )}

      {!ring && !intro && !paused && !results && <ZoneTitle zone={hud?.zone} />}

      {intro && !ring && !failed && <RaceIntro state={intro} world={world} onClick={introKey} />}

      {title && !failed && (
        <TitleScreen
          onEnter={() => {
            driveSound.swell();
            setTitle(false);
          }}
        />
      )}

      {paused && !failed && (
        <PauseMenu
          world={world}
          onResume={() => {
            driveSound.tick();
            setPaused(false);
          }}
          onRestart={restart}
          onTracks={openRing}
          onLeave={() => router.push(BACK_HREF)}
        />
      )}

      {results && !failed && (
        <RaceResults world={world} result={results} onAgain={restart} onTracks={openRing} />
      )}

      {ring && !title && !failed && (
        <TrackRing
          current={world}
          onPick={chooseWorld}
          onRace={race}
          onClose={race}
          onDesign={openDesign}
        />
      )}

      {designing && !failed && (
        <DesignHud
          trackName={WORLDS.find((w) => w.id === world)?.name ?? ''}
          world={world}
          onShow={showDesign}
          onClose={closeDesign}
        />
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

      {!ring && !intro && !title && !paused && !results && (
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
      )}

      {panel && !ring && (
        <DriveMenu
          world={world}
          design={design}
          kind={kind}
          tab={tab}
          onTab={chooseTab}
          onChange={changeDesign}
          onWorld={chooseWorld}
          onRing={() => {
            setPanel(false);
            setRing(true);
          }}
          settingsExtra={
            <>
              <Row
                label="Sound"
                items={[
                  { id: 'on', name: 'Sound on' },
                  { id: 'off', name: 'Muted' },
                ]}
                current={sound.muted ? 'off' : 'on'}
                pick={(id) => changeSound({ ...sound, muted: id === 'off' })}
              />
              <label
                style={{
                  display: 'grid',
                  gap: 8,
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: `${quiet}0.4)`,
                  opacity: sound.muted ? 0.5 : 1,
                }}
              >
                Volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(sound.volume * 100)}
                  aria-label="Volume"
                  onChange={(e) => changeSound({ ...sound, volume: Number(e.target.value) / 100 })}
                  onPointerUp={() => driveSound.tick()}
                  style={{ width: 180, maxWidth: '100%', accentColor: '#e2b04a' }}
                />
              </label>
            </>
          }
        />
      )}
    </div>
  );
}
