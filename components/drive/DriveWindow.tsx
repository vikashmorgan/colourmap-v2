'use client';

/**
 * The porthole's view (docs/specs/the-grid.md, "The porthole"): Drive on autopilot, touring the
 * worlds, nothing else on screen. Served bare at /drive-window so the Grid can show it in a small
 * round window over the map.
 */

import { useEffect, useRef, useState } from 'react';

import { DriveEngine } from '@/components/drive/engine';
import { loadDesign, type Store, WORLDS, type WorldId } from '@/lib/art/drive-design';
import { WEATHERS } from '@/lib/art/weather';

/** The worlds it tours, and how long it stays in each (s). */
export const TOUR: WorldId[] = ['coast', 'sky', 'neon', 'canyon', 'chinatown', 'night'];
export const TOUR_STAY = 14;

function storage(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function DriveWindow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [world, setWorld] = useState<WorldId>(TOUR[0]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: DriveEngine;
    try {
      engine = new DriveEngine(canvas, {
        world: TOUR[0],
        design: loadDesign(
          storage(),
          WEATHERS.map((w) => w.id),
        ),
        store: null,
        onHud: () => {},
      });
    } catch {
      setFailed(true);
      return;
    }
    engine.setAutopilot(true);
    const fit = () => engine.resize(window.innerWidth, window.innerHeight);
    fit();
    engine.start();
    window.addEventListener('resize', fit);
    let i = 0;
    const tour = window.setInterval(() => {
      i = (i + 1) % TOUR.length;
      engine.setWorld(TOUR[i]);
      setWorld(TOUR[i]);
    }, TOUR_STAY * 1000);
    return () => {
      window.clearInterval(tour);
      window.removeEventListener('resize', fit);
      engine.dispose();
    };
  }, []);

  const name = WORLDS.find((w) => w.id === world)?.name ?? '';
  return (
    <div
      data-testid="drive-window"
      style={{ position: 'fixed', inset: 0, background: '#08060a', pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <span
        style={{
          position: 'absolute',
          bottom: '14%',
          width: '100%',
          textAlign: 'center',
          font: '600 11px ui-monospace, Consolas, monospace',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'rgba(255,240,215,0.75)',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}
      >
        {failed ? 'No WebGL' : name}
      </span>
    </div>
  );
}
