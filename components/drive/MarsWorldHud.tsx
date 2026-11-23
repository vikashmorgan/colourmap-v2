'use client';

/*
 * Drive, Mars (docs/specs/drive-game.md, world 8, "The map"): the world's quiet screen layer. The
 * region's name as you enter it (the display serif, a slow fade), the Geiger column on the right
 * edge that rises as you near a radioactive lake (its clicks in mars-sound), and the small map
 * (M) with the regions, his loop, you and him. Nothing blinks.
 */

import { useEffect, useRef } from 'react';

import { geigerRate } from '@/lib/art/mars-fx';
import { CRATER, LAKES, LIGHTHOUSE, REGIONS } from '@/lib/art/mars-map';
import { LOOP_PATH } from '@/lib/art/mars';
import type { MarsWhere } from './mars-run';
import { setGeiger } from './mars-sound';

const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const KEYFRAMES = `
@keyframes mars-region { 0% { opacity: 0; letter-spacing: 0.5em; } 18% { opacity: 1; letter-spacing: 0.34em; } 78% { opacity: 1; } 100% { opacity: 0; } }
`;

/** The region's name, low and centred, as you come into it. */
export function RegionCard({ region }: { region: string | null }) {
  if (!region) return null;
  return (
    <div
      key={region}
      data-testid="mars-region"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '18%',
        textAlign: 'center',
        pointerEvents: 'none',
        fontFamily: serif,
        fontSize: 22,
        textTransform: 'uppercase',
        color: 'rgba(255,226,190,0.9)',
        textShadow: '0 2px 16px rgba(0,0,0,0.6)',
        animation: 'mars-region 4.5s ease-in-out forwards',
      }}
    >
      <style>{KEYFRAMES}</style>
      {region}
    </div>
  );
}

/** The Geiger column on the right edge: a tall thin gauge that fills from the bottom, amber going
 * green near a lake, easing (never jumping). It drives the clicks too. */
export function GeigerColumn({ rad, live }: { rad: number; live: boolean }) {
  useEffect(() => {
    setGeiger(live && rad > 0.02 ? geigerRate(rad) : 0);
  }, [rad, live]);
  useEffect(() => () => setGeiger(0), []);
  const k = Math.min(1, Math.max(0, rad));
  const shown = k > 0.02;
  return (
    <div
      data-testid="mars-geiger"
      aria-hidden
      style={{
        position: 'absolute',
        right: 14,
        top: '26%',
        height: '40%',
        width: 26,
        pointerEvents: 'none',
        opacity: shown ? 1 : 0,
        transition: 'opacity 1.2s ease',
        fontFamily: mono,
        fontSize: 9,
        color: 'rgba(255,226,190,0.6)',
        textAlign: 'center',
      }}
    >
      <div style={{ letterSpacing: '0.12em', marginBottom: 6 }}>RAD</div>
      <div
        style={{
          position: 'relative',
          height: 'calc(100% - 34px)',
          width: 8,
          margin: '0 auto',
          borderRadius: 4,
          background: 'rgba(30,18,12,0.55)',
          boxShadow: 'inset 0 0 0 1px rgba(255,226,190,0.18)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${k * 100}%`,
            borderRadius: 4,
            background: `linear-gradient(to top, rgba(230,150,60,0.85), rgba(${Math.round(
              230 - 90 * k,
            )},${Math.round(170 + 60 * k)},${Math.round(60 - 20 * k)},0.95))`,
            transition: 'height 0.5s ease-out',
          }}
        />
        {[0.25, 0.5, 0.75].map((m) => (
          <div
            key={m}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${m * 100}%`,
              height: 1,
              background: 'rgba(255,226,190,0.25)',
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(k * 100)}
      </div>
    </div>
  );
}

/** The map's extent (m): a box round every region. */
const EXTENT = (() => {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const r of REGIONS) {
    if (r.r <= 0) continue;
    x0 = Math.min(x0, r.x - r.r);
    x1 = Math.max(x1, r.x + r.r);
    y0 = Math.min(y0, r.y - r.r);
    y1 = Math.max(y1, r.y + r.r);
  }
  for (let i = 0; i < LOOP_PATH.x.length; i++) {
    x0 = Math.min(x0, LOOP_PATH.x[i]);
    x1 = Math.max(x1, LOOP_PATH.x[i]);
    y0 = Math.min(y0, LOOP_PATH.y[i]);
    y1 = Math.max(y1, LOOP_PATH.y[i]);
  }
  const pad = 300;
  return { x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad };
})();

/** The small map, bottom left: the regions as soft rings with their names, the crater, the lakes,
 * the lighthouse, his loop as a thin red line, him a red dot, you a warm arrow. */
export function MarsMap({ where }: { where: MarsWhere | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width;
    const H = cv.height;
    const s = Math.min(W / (EXTENT.x1 - EXTENT.x0), H / (EXTENT.y1 - EXTENT.y0));
    const ox = (W - (EXTENT.x1 - EXTENT.x0) * s) / 2;
    const oy = (H - (EXTENT.y1 - EXTENT.y0) * s) / 2;
    const X = (x: number) => ox + (x - EXTENT.x0) * s;
    const Y = (y: number) => H - oy - (y - EXTENT.y0) * s;
    g.clearRect(0, 0, W, H);
    g.font = `${Math.round(W / 26)}px Georgia, serif`;
    g.textAlign = 'center';
    for (const r of REGIONS) {
      if (r.r <= 0) continue;
      g.beginPath();
      g.arc(X(r.x), Y(r.y), r.r * s, 0, Math.PI * 2);
      g.fillStyle = 'rgba(200,120,70,0.08)';
      g.fill();
      g.strokeStyle = 'rgba(255,210,170,0.18)';
      g.stroke();
      g.fillStyle = 'rgba(255,226,190,0.55)';
      g.fillText(r.name.replace(/^The /, ''), X(r.x), Y(r.y) + r.r * s * 0.15);
    }
    g.beginPath();
    g.arc(X(CRATER.x), Y(CRATER.y), CRATER.R * s, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(255,190,140,0.5)';
    g.lineWidth = 2;
    g.stroke();
    g.lineWidth = 1;
    for (const l of LAKES) {
      g.beginPath();
      g.arc(X(l.x), Y(l.y), l.r * s, 0, Math.PI * 2);
      g.fillStyle = 'rgba(150,220,70,0.45)';
      g.fill();
    }
    g.fillStyle = 'rgba(255,240,220,0.8)';
    g.fillRect(X(LIGHTHOUSE.x) - 1.5, Y(LIGHTHOUSE.y) - 1.5, 3, 3);
    g.beginPath();
    for (let i = 0; i < LOOP_PATH.x.length; i += 8) {
      if (i === 0) g.moveTo(X(LOOP_PATH.x[i]), Y(LOOP_PATH.y[i]));
      else g.lineTo(X(LOOP_PATH.x[i]), Y(LOOP_PATH.y[i]));
    }
    g.closePath();
    g.strokeStyle = 'rgba(220,40,20,0.45)';
    g.stroke();
    if (!where) return;
    g.beginPath();
    g.arc(X(where.him.x), Y(where.him.y), 3.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(240,50,25,0.95)';
    g.fill();
    // You: a small arrow along your heading.
    const px = X(where.you.x);
    const py = Y(where.you.y);
    const h = where.you.h;
    g.beginPath();
    g.moveTo(px + Math.cos(h) * 7, py - Math.sin(h) * 7);
    g.lineTo(px + Math.cos(h + 2.5) * 5, py - Math.sin(h + 2.5) * 5);
    g.lineTo(px + Math.cos(h - 2.5) * 5, py - Math.sin(h - 2.5) * 5);
    g.closePath();
    g.fillStyle = 'rgba(255,214,150,0.95)';
    g.fill();
  }, [where]);
  return (
    <div
      data-testid="mars-map"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        padding: 8,
        borderRadius: 14,
        background: 'rgba(28,16,10,0.62)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        pointerEvents: 'none',
      }}
    >
      <canvas ref={ref} width={220} height={220} style={{ width: 220, height: 220 }} />
    </div>
  );
}
