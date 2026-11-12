'use client';

/*
 * The City of Dreams' map, opened over the Ship (M, or Map in the Design menu and on a phone;
 * docs/specs/art-city.md, "Ships, cockpits and the map"). A flat 2D plan that tilts into 3D
 * blocks; drag turns it (pans it when flat), the wheel or a pinch zooms. Time stands still under
 * it (the trip player holds the frame); M, Esc or ✕ closes it. Drawn on a Canvas 2D from
 * lib/city-minimap.ts, only when something changed or the pointer's beat moves on.
 */

import { useEffect, useRef, useState } from 'react';
import { shipNow } from '@/lib/city';
import { GROUND } from '@/lib/city-grid';
import {
  cityMapData,
  clampMapView,
  drawCityMap,
  fitView,
  type MapView,
  mapHeading,
  mapScale,
  TILT_3D,
  tileLocal,
} from '@/lib/city-minimap';

/** Flat or tilted, remembered while the page is open. */
let lastMode: '2d' | '3d' = '2d';

export default function CityDreamsMap({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<'2d' | '3d'>(lastMode);
  const viewRef = useRef<MapView | null>(null);
  const wantTilt = useRef(lastMode === '3d' ? TILT_3D : 0);
  const dirty = useRef(true);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    lastMode = mode;
    wantTilt.current = mode === '3d' ? TILT_3D : 0;
    dirty.current = true;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = cityMapData();
    const { c, f } = shipNow();
    const [sx, sz] = tileLocal(c[0], c[2]);
    const ship = { x: sx, y: c[1] - GROUND, z: sz, heading: mapHeading(f) };
    let w = 0;
    let h = 0;
    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!viewRef.current) viewRef.current = fitView(w, h, wantTilt.current);
      dirty.current = true;
    };
    size();
    window.addEventListener('resize', size);

    let raf = 0;
    let last = performance.now();
    let drawn = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const v = viewRef.current as MapView;
      // Tilting toward 2D or 3D, eased.
      const gap = wantTilt.current - v.tilt;
      if (Math.abs(gap) > 1e-3) {
        viewRef.current = { ...v, tilt: v.tilt + gap * (1 - Math.exp(-dt * 5)) };
        dirty.current = true;
      } else if (gap !== 0) {
        viewRef.current = { ...v, tilt: wantTilt.current };
        dirty.current = true;
      }
      // The pointer breathes: a redraw some ten times a second is enough.
      if (dirty.current || now - drawn > 100) {
        drawCityMap(ctx, data, viewRef.current as MapView, w, h, ship, now / 1000);
        drawn = now;
        dirty.current = false;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Drag turns the map (pans it when flat); two fingers pinch; the wheel zooms.
    const pts = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; zoom: number } | null = null;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) || 1 : 1;
    };
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) pinch = { d: spread(), zoom: (viewRef.current as MapView).zoom };
    };
    const move = (e: PointerEvent) => {
      const was = pts.get(e.pointerId);
      if (!was) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = viewRef.current as MapView;
      if (pinch && pts.size >= 2) {
        viewRef.current = clampMapView({ ...v, zoom: (pinch.zoom * spread()) / pinch.d });
        dirty.current = true;
        return;
      }
      const dx = e.clientX - was.x;
      const dy = e.clientY - was.y;
      if (v.tilt > 0.05) {
        // Spun round, and tipped between flat and seen from the side.
        viewRef.current = clampMapView({
          ...v,
          yaw: v.yaw + dx * 0.008,
          tilt: v.tilt - dy * 0.006,
        });
        wantTilt.current = (viewRef.current as MapView).tilt;
      } else {
        // Flat: dragged across the table, under the finger.
        const k = mapScale(v, w, h);
        const c = Math.cos(v.yaw);
        const s = Math.sin(v.yaw);
        const mx = dx / k;
        const mz = dy / k;
        viewRef.current = clampMapView({
          ...v,
          cx: v.cx - (mx * c + mz * s),
          cz: v.cz - (-mx * s + mz * c),
        });
      }
      dirty.current = true;
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current as MapView;
      viewRef.current = clampMapView({ ...v, zoom: v.zoom * Math.exp(-e.deltaY * 0.0015) });
      dirty.current = true;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
    };
  }, []);

  const recentre = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    viewRef.current = fitView(r.width, r.height, wantTilt.current);
    viewRef.current.tilt = wantTilt.current;
    dirty.current = true;
  };

  return (
    <div className="cd-map">
      <canvas ref={canvasRef} className="cd-map-canvas" aria-label="Map of the City of Dreams" />
      <div className="cd-map-bar">
        <span className="cd-map-title">City of Dreams</span>
        <span className="bb-pills" role="toolbar" aria-label="Map view">
          <button
            type="button"
            className="bb-pill"
            aria-pressed={mode === '2d'}
            onClick={() => setMode('2d')}
          >
            2D
          </button>
          <button
            type="button"
            className="bb-pill"
            aria-pressed={mode === '3d'}
            onClick={() => setMode('3d')}
          >
            3D
          </button>
          <button type="button" className="bb-pill" onClick={recentre} title="The whole city again">
            Fit
          </button>
        </span>
        <button
          type="button"
          ref={closeRef}
          className="bb-menu-close"
          onClick={onClose}
          aria-label="Close the map (M or Esc)"
        >
          ✕
        </button>
      </div>
      <p className="cd-map-hint">
        {mode === '3d' ? 'Drag to spin and tilt' : 'Drag to move'} · wheel or pinch to zoom · M or
        Esc to close
      </p>
    </div>
  );
}
