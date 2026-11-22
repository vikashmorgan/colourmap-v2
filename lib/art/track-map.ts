/**
 * Drive: each track's map for the track ring (docs/specs/drive-menus.md, "The track ring"): its road
 * as one SVG path seen from above, lifted where it rises, with its banked stretches, start and
 * gates marked. Pure: reads the tracks' outlines (lib/art/track-data.ts) and the Salt Flat's drift
 * loop; no DOM.
 */

import { DRIFT_PATH } from '@/lib/art/drift-gates';
import type { WorldId } from '@/lib/art/drive-design';
import { WORLD_CFG } from '@/lib/art/drive-worlds';
import { RACE, SKY_LAP } from '@/lib/art/track';
import { trackOutline } from '@/lib/art/track-data';

export interface MapMark {
  x: number;
  y: number;
  kind: 'start' | 'finish' | 'gate';
}

export interface TrackMap {
  /** The road, as an SVG path in a width × height box. */
  d: string;
  /** The steeply banked stretches, each its own path (drawn thicker). */
  banks: string[];
  marks: MapMark[];
  /** Whether the road closes on itself (a loop) or runs on (the first km of an endless road). */
  closed: boolean;
  /** How much road the map shows (m). */
  length: number;
}

/** How much of an endless road the map shows. */
export const MAP_SPAN = 6000;
const MARGIN = 0.08;
/** The highest rise is lifted this share of the box's height, so the crests read in the tilt. */
const LIFT = 0.1;

const f1 = (v: number) => Math.round(v * 10) / 10;

interface P {
  x: number;
  y: number;
  e: number;
}

/** Fits points in the box (keeping the aspect), north up, rises lifted. */
function fitBox(pts: P[], width: number, height: number): { x: number; y: number }[] {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  let e0 = Number.POSITIVE_INFINITY;
  let e1 = Number.NEGATIVE_INFINITY;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
    e0 = Math.min(e0, p.e);
    e1 = Math.max(e1, p.e);
  }
  const lift = e1 > e0 ? (LIFT * height) / (e1 - e0) : 0;
  const w = width * (1 - 2 * MARGIN);
  const h = height * (1 - 2 * MARGIN - LIFT);
  const k = Math.min(w / Math.max(1, x1 - x0), h / Math.max(1, y1 - y0));
  const ox = (width - (x1 - x0) * k) / 2;
  const oy = (height - (y1 - y0) * k + LIFT * height) / 2;
  return pts.map((p) => ({
    x: ox + (p.x - x0) * k,
    // North (plane +y) is up the box.
    y: oy + (y1 - p.y) * k - (p.e - e0) * lift,
  }));
}

const line = (pts: { x: number; y: number }[], close = false) =>
  `${pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`).join(' ')}${close ? ' Z' : ''}`;

/** The drift loop as a smooth closed curve through its gates (Catmull-Rom, sampled). */
function driftLoop(): P[] {
  const n = DRIFT_PATH.length;
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = DRIFT_PATH[(i - 1 + n) % n];
    const p1 = DRIFT_PATH[i];
    const p2 = DRIFT_PATH[(i + 1) % n];
    const p3 = DRIFT_PATH[(i + 2) % n];
    for (let k = 0; k < 12; k++) {
      const t = k / 12;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + cc) * t +
          (2 * a - 5 * b + 4 * cc - d) * t2 +
          (-a + 3 * b - 3 * cc + d) * t3);
      out.push({ x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]), e: 0 });
    }
  }
  return out;
}

/** The map of a world's track in a width × height box. */
export function trackMap(world: WorldId, width = 600, height = 260): TrackMap {
  const cfg = WORLD_CFG[world];
  const def = cfg.track;
  if (!def) {
    const loop = driftLoop();
    const pts = fitBox(loop, width, height);
    const gates = fitBox(
      DRIFT_PATH.map(([x, y]) => ({ x, y, e: 0 })).concat(loop),
      width,
      height,
    ).slice(0, DRIFT_PATH.length);
    return {
      d: line(pts, true),
      banks: [],
      marks: gates.map((g, i) => ({ ...g, kind: i === 0 ? 'start' : 'gate' })),
      closed: true,
      length: Math.round(
        loop.reduce(
          (a, p, i) => (i ? a + Math.hypot(p.x - loop[i - 1].x, p.y - loop[i - 1].y) : 0),
          0,
        ),
      ),
    };
  }
  const length = cfg.race === 'canyon' ? RACE.finish : cfg.race === 'lap' ? SKY_LAP : MAP_SPAN;
  const step = 20;
  const o = trackOutline(def, length, step);
  const pts = fitBox(o.points, width, height);
  // Banked stretches: past two thirds of the track's steepest bank.
  const banks: string[] = [];
  let run: { x: number; y: number }[] = [];
  o.points.forEach((p, i) => {
    if (def.bankMax > 0 && Math.abs(p.bank) > def.bankMax * 0.66) run.push(pts[i]);
    else {
      if (run.length > 2) banks.push(line(run));
      run = [];
    }
  });
  if (run.length > 2) banks.push(line(run));
  const at = (s: number) => pts[Math.min(pts.length - 1, Math.round(s / step))];
  const marks: MapMark[] = [];
  if (cfg.race === 'canyon') {
    marks.push({ ...at(RACE.start), kind: 'start' }, { ...at(RACE.finish), kind: 'finish' });
  } else {
    marks.push({ ...at(cfg.startS), kind: 'start' });
    const every = cfg.race === 'lap' ? SKY_LAP : 1000;
    for (let s = every; s < length; s += every) marks.push({ ...at(s), kind: 'gate' });
  }
  return { d: line(pts), banks, marks, closed: false, length };
}
