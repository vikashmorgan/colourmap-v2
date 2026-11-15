/*
 * Atlantis's map (docs/specs/art-city.md, "Atlantis on the map"): what the City of Dreams' map
 * (components/CityDreamsMap.tsx) shows while you are on Atlantis's ground, in the same quiet
 * style as the city's (lib/city-minimap.ts): the lane in from the gate with its three tunnels, the
 * ring roads of light, the towers ring by ring (teal at the rim warming to gold toward the heart),
 * the spiral tubes winding up them, the bubble domes and their tubes, the four dome complexes,
 * the heart, and you. Flat, or tilted into 3D as the city's map is. Pure: no DOM beyond the
 * canvas it is handed.
 *
 * 2026-11-15: "put atlantis as map when u are in atlantis. with option to go back to big city."
 * A tap on a place flies there within Atlantis (lib/city.ts, `travelWithin`); the map's quiet
 * "Back to the city" takes you home to the Ship's start (lib/city-travel.ts, CITY_START_SPOT).
 *
 * Realm-local coordinates throughout (lib/city-speedway.ts: the gate at z = 0, north is -z).
 */

import type { RGB, Vec3 } from './bigbang';
import {
  ATL_CENTRE,
  ATL_EDGE,
  atlantisPlan,
  COMPLEX_R,
  COMPLEX_Y,
  HEART_H,
  pathPoint,
  RINGS,
} from './city-atlantis-rings';
import { GROUND } from './city-grid';
import {
  boxesOverlap,
  drawYou,
  labelBox,
  layoutLabels,
  MARK_PICK,
  type MapLabel,
  type MapView,
  projectMap,
  TILT_3D,
  TILT_MAX,
  youCaption,
  ZOOM_RANGE,
} from './city-minimap';
import { ARRIVAL_Z, LANE_LEN, laneHalf, TUNNEL_LEN, TUNNELS_AT } from './city-speedway';
import { type TravelSpot, yawToward } from './city-travel';

/* ---------- the ground the map covers ---------- */

/** Atlantis's map covers the lane from just south of its gate to the far edge past the heart. */
export const ATL_MAP = {
  x0: -ATL_EDGE,
  x1: ATL_EDGE,
  z0: ATL_CENTRE[2] - ATL_EDGE,
  z1: 40,
} as const;
const MID_X = (ATL_MAP.x0 + ATL_MAP.x1) / 2;
const MID_Z = (ATL_MAP.z0 + ATL_MAP.z1) / 2;

/** How many pixels a metre is on Atlantis's map, its whole ground fitting w × h at zoom 1. */
export function atlMapScale(v: MapView, w: number, h: number): number {
  const W = ATL_MAP.x1 - ATL_MAP.x0;
  const L = ATL_MAP.z1 - ATL_MAP.z0;
  const c = Math.abs(Math.cos(v.yaw));
  const s = Math.abs(Math.sin(v.yaw));
  return Math.min((w * 0.86) / (c * W + s * L), (h * 0.84) / (s * W + c * L)) * v.zoom;
}

/** Where a realm point (y over the ground) falls on the screen: [sx, sy, depth], as the city's. */
export const projectAtl = (v: MapView, w: number, h: number, x: number, y: number, z: number) =>
  projectMap(v, w, h, x, y, z, atlMapScale(v, w, h));

/** A view kept within Atlantis's ground and the map's limits. */
export function clampAtlView(v: MapView): MapView {
  return {
    tilt: Math.max(0, Math.min(TILT_MAX, v.tilt)),
    yaw: v.yaw,
    zoom: Math.max(ZOOM_RANGE[0], Math.min(ZOOM_RANGE[1], v.zoom)),
    cx: Math.max(ATL_MAP.x0, Math.min(ATL_MAP.x1, v.cx)),
    cz: Math.max(ATL_MAP.z0, Math.min(ATL_MAP.z1, v.cz)),
    ox: v.ox ?? 0,
    oy: v.oy ?? 0,
  };
}

/** The flat view of all of Atlantis: the long way up a tall screen, across a wide one. */
export function atlFitView(w: number, h: number): MapView {
  return { tilt: 0, yaw: w > h ? -Math.PI / 2 : 0, zoom: 1, cx: MID_X, cz: MID_Z, ox: 0, oy: 0 };
}

/** The tilted view: turned a little off its long axis, framed to fill most of the screen. */
export function atlFitView3D(w: number, h: number, share = 0.8): MapView {
  let v: MapView = { ...atlFitView(w, h), tilt: TILT_3D };
  v.yaw += 0.5;
  const bounds = () => {
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    for (const x of [ATL_MAP.x0, ATL_MAP.x1])
      for (const z of [ATL_MAP.z0, ATL_MAP.z1])
        for (const y of [0, HEART_H]) {
          const [sx, sy] = projectAtl(v, w, h, x, y, z);
          x0 = Math.min(x0, sx);
          x1 = Math.max(x1, sx);
          y0 = Math.min(y0, sy);
          y1 = Math.max(y1, sy);
        }
    return { x0, y0, x1, y1 };
  };
  // Perspective grows the box a little faster than the zoom: a few rounds settle it.
  for (let n = 0; n < 4; n++) {
    const b = bounds();
    v = {
      ...v,
      zoom: v.zoom * Math.min((share * w) / (b.x1 - b.x0 || 1), (share * h) / (b.y1 - b.y0 || 1)),
    };
  }
  const b = bounds();
  return { ...v, ox: w / 2 - (b.x0 + b.x1) / 2, oy: h / 2 - (b.y0 + b.y1) / 2 };
}

/* ---------- the places a tap flies to ---------- */

export type AtlPlace = {
  name: string;
  kind: 'gate' | 'arrival' | 'heart' | 'domes';
  /** Its mark on the map (realm-local; y over the ground). */
  x: number;
  y: number;
  z: number;
  /** Where a tap lands you: clear of every tower and dome, facing somewhere worth seeing. */
  spot: TravelSpot;
};

const heartXZ: [number, number] = [ATL_CENTRE[0], ATL_CENTRE[2]];
const aroundHeart = (R: number, a: number): [number, number] => [
  ATL_CENTRE[0] + R * Math.sin(a),
  ATL_CENTRE[2] - R * Math.cos(a),
];
const COMPLEX_NAMES = ['North domes', 'East domes', 'South domes', 'West domes'];

/**
 * Atlantis's places: the gate (the lane's start, facing up it), the arrival (the lane's end, the
 * welcome ahead), the heart (from the avenue in, its crown of rings ahead) and the four dome
 * complexes (under their great dome, facing the heart). Spots at 60 to 90 over the ground.
 */
export const ATL_PLACES: AtlPlace[] = [
  {
    name: 'The gate',
    kind: 'gate',
    x: 0,
    y: 0,
    z: 0,
    spot: { pos: [0, GROUND + 60, -30], yaw: 0 },
  },
  {
    name: 'Arrival',
    kind: 'arrival',
    x: 0,
    y: 0,
    z: -LANE_LEN,
    spot: { pos: [0, GROUND + 60, ARRIVAL_Z + 40], yaw: 0 },
  },
  {
    name: 'Heart of Atlantis',
    kind: 'heart',
    x: heartXZ[0],
    y: HEART_H,
    z: heartXZ[1],
    spot: { pos: [heartXZ[0], GROUND + 90, heartXZ[1] + 110], yaw: 0 },
  },
  ...COMPLEX_NAMES.map((name, c): AtlPlace => {
    const [x, z] = aroundHeart(COMPLEX_R, (c * Math.PI) / 2);
    return {
      name,
      kind: 'domes',
      x,
      y: COMPLEX_Y - GROUND,
      z,
      spot: { pos: [x, GROUND + 60, z], yaw: yawToward([x, z], heartXZ) },
    };
  }),
];

/** A name written on Atlantis's map, and the place a tap on it flies to. */
export type AtlLabel = MapLabel & { place?: AtlPlace };

/**
 * What a tap at screen point q flies to: a place whose name is shown under it (with its mark), or
 * whose mark lies within reach, the nearest; null for none.
 */
export function atlPick(
  shown: AtlLabel[],
  v: MapView,
  w: number,
  h: number,
  q: { x: number; y: number },
): AtlPlace | null {
  for (const l of shown) {
    if (!l.place) continue;
    const b = labelBox(l);
    if (q.x >= b.x0 - 16 && q.x <= b.x1 + 4 && q.y >= b.y0 - 3 && q.y <= b.y1 + 3) return l.place;
  }
  const raised = v.tilt > 0.02;
  let pick: AtlPlace | null = null;
  let best = MARK_PICK * 1.5;
  for (const p of ATL_PLACES) {
    const [sx, sy] = projectAtl(v, w, h, p.x, raised ? p.y : 0, p.z);
    const d = Math.hypot(sx - q.x, sy - q.y);
    if (d <= best) {
      best = d;
      pick = p;
    }
  }
  return pick;
}

/* ---------- drawing ---------- */

const GLASS: RGB = [0.35, 0.85, 0.85];
const GOLD: RGB = [1, 0.78, 0.45];
const PEARL: RGB = [0.92, 0.95, 1];
const rgba = (c: RGB, k: number, a: number) =>
  `rgba(${Math.round(Math.min(1, c[0] * k) * 255)},${Math.round(Math.min(1, c[1] * k) * 255)},${Math.round(Math.min(1, c[2] * k) * 255)},${a})`;
/** A ring's hue: teal at the rim, warming to gold toward the heart (the world's own, unmoving). */
export function ringColour(ring: number): RGB {
  const u = Math.min(1, 0.15 + (0.7 * ring) / RINGS.length);
  return [
    GLASS[0] + (GOLD[0] - GLASS[0]) * u,
    GLASS[1] + (GOLD[1] - GLASS[1]) * u,
    GLASS[2] + (GOLD[2] - GLASS[2]) * u,
  ];
}

type Mark = { depth: number; draw: () => void };

/**
 * Draws Atlantis on a 2D canvas of w × h css pixels in view v: a deep sea-blue dawn behind, the
 * lane, the ring roads, the towers (discs when flat, columns when tilted), the spiral and dome
 * tubes, the domes, the places' names and you (realm-local `ship`, its heading), the beat `t`
 * breathing your pointer. `hover` brings the names near it first. Returns the names written.
 */
export function drawAtlantisMap(
  ctx: CanvasRenderingContext2D,
  v: MapView,
  w: number,
  h: number,
  ship: { x: number; y: number; z: number; heading: number } | null,
  t: number,
  hover: { x: number; y: number } | null = null,
): AtlLabel[] {
  const k = atlMapScale(v, w, h);
  const raised = v.tilt > 0.02;
  const P = (x: number, y: number, z: number) => projectMap(v, w, h, x, raised ? y : 0, z, k);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, 'rgba(4,12,32,0.95)');
  sky.addColorStop(0.5, 'rgba(8,26,48,0.95)');
  sky.addColorStop(1, 'rgba(22,40,58,0.95)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const line = (pts: [number, number, number][], style: string, lw: number, close = false) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (close) ctx.closePath();
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  const circle = (R: number, cx = ATL_CENTRE[0], cz = ATL_CENTRE[2], y = 0, n = 96) =>
    Array.from({ length: n }, (_, i) =>
      P(cx + R * Math.sin((i / n) * Math.PI * 2), y, cz - R * Math.cos((i / n) * Math.PI * 2)),
    );
  const plan = atlantisPlan();

  // The ground: a faint disc to the edge where you are turned back.
  ctx.beginPath();
  circle(ATL_EDGE).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(60,170,190,0.06)';
  ctx.fill();
  ctx.setLineDash([2, 6]);
  ctx.strokeStyle = rgba(GLASS, 1, 0.25);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  // The lane: a pale band from the gate, opening and flaring into Atlantis, its walls teal.
  const zs = Array.from({ length: 41 }, (_, i) => -(i / 40) * LANE_LEN);
  const left = zs.map((z) => P(-laneHalf(z), 0, z));
  const right = zs.map((z) => P(laneHalf(z), 0, z));
  ctx.beginPath();
  [...left, ...[...right].reverse()].forEach(([x, y], i) =>
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
  );
  ctx.closePath();
  ctx.fillStyle = 'rgba(244,234,216,0.07)';
  ctx.fill();
  line(left, rgba(GLASS, 1, 0.5), 1);
  line(right, rgba(GLASS, 1, 0.5), 1);
  // Its three tunnels, cyan, dashed across the lane.
  ctx.setLineDash([3, 3]);
  for (const z0 of TUNNELS_AT)
    for (const z of [z0, z0 - TUNNEL_LEN])
      line([P(-laneHalf(z), 0, z), P(laneHalf(z), 0, z)], 'rgba(56,235,255,0.6)', 1.4);
  ctx.setLineDash([]);
  // The avenue on in to the heart, paler still.
  line([P(0, 0, -LANE_LEN), P(0, 0, ATL_CENTRE[2])], 'rgba(244,234,216,0.12)', 1);

  // The ring roads of light and the plazas, quiet gold.
  const roads = new Set<number>();
  for (const g of plan.ground) {
    if (g.kind === 'road') roads.add(g.R);
    else line(circle(g.R, g.x, g.z, 0, 40), rgba(GOLD, 1, 0.4), 1, true);
  }
  for (const R of roads) line(circle(R), rgba(GOLD, 1, 0.4), 1, true);

  // Towers, domes and tubes, far ones first.
  const marks: Mark[] = [];
  const pt: Vec3 = [0, 0, 0];
  for (const p of plan.paths) {
    const n = p.kind === 'helix' ? Math.ceil(p.turns * 16) : 12;
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      pathPoint(p, i / n, pt);
      return P(pt[0], pt[1] - GROUND, pt[2]);
    });
    const helix = p.kind === 'helix';
    marks.push({
      depth: pts[n >> 1]?.[2] ?? 0,
      draw: () => line(pts, helix ? rgba(GOLD, 1.1, 0.5) : rgba(GLASS, 1.1, 0.4), helix ? 0.9 : 1),
    });
  }
  for (const tw of plan.towers) {
    const col = tw.kind === 'heart' ? GOLD : ringColour(tw.ring);
    const base = P(tw.x, 0, tw.z);
    const top = P(tw.x, tw.h, tw.z);
    const r = Math.max(1.2, tw.r * k * (tw.kind === 'heart' ? 1.4 : 1));
    marks.push({
      depth: top[2],
      draw: () => {
        if (raised) line([base, top], rgba(col, 0.9, 0.75), Math.max(1, r * 0.8));
        ctx.beginPath();
        ctx.arc(top[0], top[1], r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 1, 0.85);
        ctx.fill();
      },
    });
  }
  for (const d of plan.domes) {
    const q = P(d.c[0], d.c[1] - GROUND, d.c[2]);
    const r = Math.max(1.5, d.r * k);
    marks.push({
      depth: q[2] + 0.01,
      draw: () => {
        ctx.beginPath();
        ctx.arc(q[0], q[1], r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(PEARL, 1, 0.12);
        ctx.fill();
        ctx.strokeStyle = rgba(GLASS, 1.1, 0.7);
        ctx.lineWidth = 1;
        ctx.stroke();
      },
    });
  }
  marks.sort((a, b) => a.depth - b.depth);
  for (const m of marks) m.draw();

  // The places: a small ring, a bar for the gate and the arrival; their names, none piled up.
  const cands: AtlLabel[] = [];
  const measure = (text: string, font: string, size: number) => {
    ctx.font = font;
    const m = ctx.measureText?.(text) as TextMetrics | undefined;
    return typeof m?.width === 'number' ? m.width : text.length * size * 0.6;
  };
  const font = '11px ui-sans-serif, system-ui, sans-serif';
  for (const p of ATL_PLACES) {
    const q = P(p.x, p.y, p.z);
    const col = p.kind === 'domes' ? GLASS : GOLD;
    ctx.beginPath();
    if (p.kind === 'gate' || p.kind === 'arrival') ctx.rect(q[0] - 7, q[1] - 1.5, 14, 3);
    else ctx.arc(q[0], q[1], 4.5, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, 1.1, 0.95);
    ctx.fillStyle = rgba(col, 1.1, 0.95);
    ctx.lineWidth = 1.2;
    if (p.kind === 'gate' || p.kind === 'arrival') ctx.fill();
    else ctx.stroke();
    cands.push({
      text: p.name,
      x: q[0] + 9,
      y: q[1],
      align: 'left',
      size: 11,
      w: measure(p.name, font, 11),
      priority: p.kind === 'heart' ? 0 : 1,
      depth: q[2],
      alpha: 1,
      colour: 'rgb(244,234,216)',
      font,
      place: p,
    });
  }
  if (hover)
    for (const c of cands) if (Math.hypot(c.x - 9 - hover.x, c.y - hover.y) < 26) c.priority = -1;
  let shown = layoutLabels(cands, w, h) as AtlLabel[];
  const q = ship ? P(ship.x, Math.max(0, ship.y), ship.z) : null;
  const cap = ship && q ? youCaption([q[0], q[1]], ship.y, w, h, measure) : null;
  if (cap) shown = shown.filter((l) => !boxesOverlap(labelBox(l), labelBox(cap)));
  ctx.textBaseline = 'middle';
  for (const l of shown) {
    ctx.font = l.font;
    ctx.textAlign = l.align;
    ctx.globalAlpha = 0.85 * l.alpha;
    ctx.fillStyle = l.colour;
    ctx.fillText(l.text, l.x, l.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  if (ship && q) {
    const ahead = P(
      ship.x + Math.sin(ship.heading) * 10,
      Math.max(0, ship.y),
      ship.z - Math.cos(ship.heading) * 10,
    );
    drawYou(ctx, q, Math.atan2(ahead[1] - q[1], ahead[0] - q[0]), w, h, t, cap);
  }
  return shown;
}
