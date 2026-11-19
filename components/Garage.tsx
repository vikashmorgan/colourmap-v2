'use client';

/**
 * The Garage (docs/specs/garage.md), at /geometry-field/garage. Asked for 2026-11-19: "a space to
 * design your car or spaceship, like a dope space garage, with a circle raised in the middle of the
 * room and the spaceship or car or bike on top; you can rotate the circle and check your ride."
 *
 * The room is components/garage/scene.ts. Here: the panel. What you pick is the one ride Drive uses
 * everywhere (the same saved design, lib/art/drive-design.ts): the vehicle in every world, the hull
 * (chrome, gold, rust, red, or your own paint colour), the fire, the speed flames, the speedometer
 * and the driving mode. Hold Rev to see the fire and flames at full. Drive takes it out.
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { GarageScene } from '@/components/garage/scene';
import {
  BODIES,
  type BodyId,
  DEFAULT_DESIGN,
  type Design,
  DRIVE_MODES,
  type DriveMode,
  FIRES,
  GAUGES,
  type GaugeId,
  HULLS,
  loadDesign,
  rideEverywhere,
  type Store,
  saveDesign,
} from '@/lib/art/drive-design';
import { WEATHERS } from '@/lib/art/weather';

export const DRIVE_HREF = '/geometry-field/drive';
const WEATHER_IDS = WEATHERS.map((w) => w.id);
const ink = 'rgba(255,244,226,';
const GOLD = '#C4A060';
const serif = 'var(--font-serif), Georgia, serif';

function storage(): Store | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const RIDES = [
  { id: 'car', name: 'Car' },
  { id: 'ship', name: 'Hover ship' },
];

export default function Garage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GarageScene | null>(null);
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [failed, setFailed] = useState(false);
  const [rev, setRev] = useState(false);

  useEffect(() => {
    const d = loadDesign(storage(), WEATHER_IDS);
    setDesign(d);
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: GarageScene;
    try {
      scene = new GarageScene(canvas, d);
    } catch {
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    const fit = () => scene.resize(window.innerWidth, window.innerHeight);
    fit();
    scene.start();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const change = useCallback((d: Design, rebuild = true) => {
    setDesign(d);
    saveDesign(storage(), d);
    if (rebuild) sceneRef.current?.setRide(d);
  }, []);

  const revOn = (on: boolean) => {
    setRev(on);
    sceneRef.current?.setRev(on);
  };

  const row = (
    label: string,
    items: { id: string; name: string }[],
    current: string,
    pick: (id: string) => void,
  ) => (
    <div style={{ display: 'grid', gap: 6 }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: `${ink}0.4)`,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((it) => {
          const on = it.id === current;
          return (
            <button
              key={it.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(it.id)}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${on ? GOLD : 'rgba(196,160,96,0.25)'}`,
                background: on ? 'rgba(196,160,96,0.16)' : 'transparent',
                color: `${ink}${on ? 0.95 : 0.6})`,
                fontFamily: serif,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {it.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  const kind = design.vehicle.salt;

  return (
    <div
      data-testid="garage"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#050507',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        fontFamily: serif,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Your ride on the turntable: drag to turn it, scroll to zoom"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          sceneRef.current?.pointerDown(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => sceneRef.current?.pointerMove(e.clientX, e.clientY)}
        onPointerUp={() => sceneRef.current?.pointerUp()}
        onPointerCancel={() => sceneRef.current?.pointerUp()}
        onWheel={(e) => sceneRef.current?.wheel(e.deltaY)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {failed && (
        <p
          style={{
            position: 'absolute',
            top: '40%',
            width: '100%',
            textAlign: 'center',
            color: `${ink}0.6)`,
          }}
        >
          This browser cannot draw the Garage (no WebGL).
        </p>
      )}

      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 16,
          pointerEvents: 'none',
          color: `${ink}0.9)`,
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: '0.04em' }}>Garage</div>
        <div style={{ fontSize: 12, color: `${ink}0.45)`, marginTop: 2 }}>
          Drag to turn your ride · scroll to look closer
        </div>
      </div>

      <aside
        aria-label="Build your ride"
        className="garage-panel"
        style={{
          position: 'absolute',
          display: 'grid',
          gap: 14,
          alignContent: 'start',
          padding: 16,
          borderRadius: 14,
          border: '1px solid rgba(196,160,96,0.22)',
          background: 'rgba(8,8,11,0.72)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 18px 44px rgba(0,0,0,0.45)',
          overflowY: 'auto',
        }}
      >
        <style>{`
          .garage-panel { top: 60px; right: 16px; width: 280px; max-height: calc(100% - 140px); }
          @media (max-width: 700px) {
            .garage-panel { top: auto; right: 16px; left: 16px; bottom: 60px; width: auto; max-height: 42%; }
          }
        `}</style>
        {row('Ride', RIDES, kind, (id) => change(rideEverywhere(design, id as 'car' | 'ship')))}
        {kind === 'car' &&
          row('Body', BODIES, design.body, (id) => change({ ...design, body: id as BodyId }))}
        {row('Hull', HULLS, design.hull, (id) => change({ ...design, hull: id as Design['hull'] }))}
        {design.hull === 'paint' && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
              color: `${ink}0.7)`,
            }}
          >
            <input
              type="color"
              value={design.paint}
              onChange={(e) => change({ ...design, paint: e.target.value.toLowerCase() })}
              style={{ width: 40, height: 28, border: 0, background: 'none', cursor: 'pointer' }}
            />
            Your colour
          </label>
        )}
        {row('Fire', FIRES, design.fire, (id) => change({ ...design, fire: id as Design['fire'] }))}
        {row(
          'Flames',
          [
            { id: 'on', name: 'At speed' },
            { id: 'off', name: 'Off' },
          ],
          design.flames ? 'on' : 'off',
          (id) => change({ ...design, flames: id === 'on' }, false),
        )}
        {row('Speedo', GAUGES, design.gauge, (id) =>
          change({ ...design, gauge: id as GaugeId }, false),
        )}
        {row('Mode', DRIVE_MODES, design.mode, (id) =>
          change({ ...design, mode: id as DriveMode }, false),
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            aria-pressed={rev}
            onPointerDown={(e) => {
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
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: '1px solid rgba(255,120,60,0.5)',
              background: rev ? 'rgba(255,110,50,0.25)' : 'transparent',
              color: `${ink}0.9)`,
              fontFamily: serif,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Hold to rev
          </button>
          <Link
            href={DRIVE_HREF}
            style={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 10,
              background: GOLD,
              color: '#1a1208',
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Drive ›
          </Link>
        </div>
      </aside>
    </div>
  );
}
