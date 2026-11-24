/**
 * Drive, Mars: the canyons (docs/specs/mars-world.md, "Terrain to race in"). Pure: where each
 * canyon runs and how deep it cuts the ground at any point, in TypeScript for the physics and in
 * GLSL for the backdrop, so the walls you ride are the walls you see.
 *
 * 2026-11-24: "add some canyons that u can race in with tilt. and some canyons and rocks and stuff
 * like that".
 *
 * A canyon is a chain of circular arcs laid down like a turtle walks: from a start point and
 * heading, each piece turns left or right round a radius, its floor's width and the depth easing
 * from the last piece's end to its own. The cut across it is a smooth bowl: flat floor, banked
 * walls (`CANYON_BANK` m across) that you ride the tilt of, a soft rim. The first piece starts at
 * no depth and the last ends at none, so you drive in and out at grade; some pieces open wide
 * into gorges.
 *
 * World: x east, y north, metres.
 */

/** A canyon as laid down: a start, a heading (rad, counter-clockwise from east), a floor width
 * to start with, and its pieces: [radius (m), turn (rad, + left), floor half-width at the end
 * (m), depth at the end (m)]. */
export interface CanyonDef {
  name: string;
  x: number;
  y: number;
  h: number;
  w: number;
  pieces: [number, number, number, number][];
}

/** One arc of a canyon, ready to measure against. */
export interface CanyonArc {
  cx: number;
  cy: number;
  R: number;
  /** The angle round the centre at the start, and the signed sweep to the end (rad). */
  a0: number;
  sweep: number;
  /** Floor half-width and depth at the start and the end (m). */
  w0: number;
  w1: number;
  d0: number;
  d1: number;
  /** Where it starts and ends, and the heading at its end. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  h1: number;
  /** Whether it is the canyon's first or last arc: only there are the ends round (between two
   * arcs each covers its own side of the joint, so the floor runs on smoothly). */
  first: boolean;
  last: boolean;
}

/** How far the walls reach across from the floor's edge to the rim (m). Steepest at their middle:
 * 1.5 × depth / bank, about 27° for the deepest cut, plus what the dunes add. */
export const CANYON_BANK = 70;

/**
 * The canyons. The Red Canyons: a long snake south-east of the start, banking left and right,
 * opening into a wide gorge and narrowing again; the Rift: a straighter, deeper cut to the west,
 * past the Field of Arches.
 */
export const CANYON_DEFS: CanyonDef[] = [
  {
    name: 'The Red Canyons',
    x: 650,
    y: -1500,
    h: -0.35,
    w: 18,
    pieces: [
      [520, 0.55, 18, 20],
      [430, -1.05, 18, 24],
      [420, 1.1, 20, 26],
      [620, -0.7, 60, 22],
      [520, 0.75, 110, 18],
      [420, 0.65, 34, 22],
      [560, -0.55, 18, 0],
    ],
  },
  {
    name: 'The Rift',
    x: -2350,
    y: -1700,
    h: 1.95,
    w: 20,
    pieces: [
      [900, 0.35, 20, 24],
      [700, -0.6, 22, 26],
      [800, 0.5, 90, 20],
      [700, -0.4, 24, 24],
      [900, 0.3, 20, 0],
    ],
  },
];

/** Lays a canyon's pieces down as arcs. */
export function layCanyon(def: CanyonDef): CanyonArc[] {
  const out: CanyonArc[] = [];
  let x = def.x;
  let y = def.y;
  let h = def.h;
  let w = def.w;
  let d = 0;
  def.pieces.forEach(([R, turn, w1, d1], i) => {
    const s = turn >= 0 ? 1 : -1;
    // The centre is off to the side it turns toward.
    const cx = x - Math.sin(h) * R * s;
    const cy = y + Math.cos(h) * R * s;
    const a0 = Math.atan2(y - cy, x - cx);
    const a1 = a0 + turn;
    const x1 = cx + Math.cos(a1) * R;
    const y1 = cy + Math.sin(a1) * R;
    out.push({
      cx,
      cy,
      R,
      a0,
      sweep: turn,
      w0: w,
      w1,
      d0: d,
      d1,
      x0: x,
      y0: y,
      x1,
      y1,
      h1: h + turn,
      first: i === 0,
      last: i === def.pieces.length - 1,
    });
    x = x1;
    y = y1;
    h += turn;
    w = w1;
    d = d1;
  });
  return out;
}

export const CANYONS: CanyonArc[][] = CANYON_DEFS.map(layCanyon);
export const CANYON_ARCS: CanyonArc[] = CANYONS.flat();

function smooth(e0: number, e1: number, v: number): number {
  const k = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** The nearest point of an arc to (x, y): how far along it (0..1), and the distance (m). Off its
 * ends the nearest point is the end, so each canyon's ends are round; `inner` says the point lies
 * off an end that joins another arc (that arc measures it instead). */
export function arcNearest(
  a: CanyonArc,
  x: number,
  y: number,
): { f: number; d: number; inner: boolean } {
  const vx = x - a.cx;
  const vy = y - a.cy;
  let ang = Math.atan2(vy, vx) - (a.a0 + a.sweep / 2);
  ang -= Math.PI * 2 * Math.floor((ang + Math.PI) / (Math.PI * 2));
  const raw = 0.5 + ang / a.sweep;
  const inner = (raw < 0 && !a.first) || (raw > 1 && !a.last);
  const f = Math.min(1, Math.max(0, raw));
  const an = a.a0 + a.sweep * f;
  return {
    f,
    d: Math.hypot(x - a.cx - Math.cos(an) * a.R, y - a.cy - Math.sin(an) * a.R),
    inner,
  };
}

/**
 * How a point sits in the canyons: `carve`, how deep they cut there (m, 0 outside), and `floor`,
 * how much it is inside one (1 on the floor, 0 past the rim; the backdrop paints the walls' strata
 * by it). The dunes roll on under the cut, so the floor swells and dips with them.
 */
export function canyonCut(
  x: number,
  y: number,
  arcs: readonly CanyonArc[] = CANYON_ARCS,
): { carve: number; floor: number } {
  let carve = 0;
  let floor = 0;
  for (const a of arcs) {
    const reach = Math.max(a.w0, a.w1) + CANYON_BANK;
    if (Math.abs(Math.hypot(x - a.cx, y - a.cy) - a.R) > reach) continue;
    const { f, d, inner } = arcNearest(a, x, y);
    if (inner) continue;
    // Eased along the arc, so the floor's slope runs on smoothly from one arc to the next.
    const e = f * f * (3 - 2 * f);
    const w = a.w0 + (a.w1 - a.w0) * e;
    const D = a.d0 + (a.d1 - a.d0) * e;
    const pf = 1 - smooth(w, w + CANYON_BANK, d);
    floor = Math.max(floor, pf * Math.min(1, D / 6));
    carve = Math.max(carve, D * pf);
  }
  return { carve, floor };
}

/** Whether a circle at (x, y) of radius r keeps clear of every canyon's rim (with a margin). */
export function canyonNear(x: number, y: number, r: number, margin = 20): boolean {
  for (const a of CANYON_ARCS) {
    const reach = Math.max(a.w0, a.w1) + CANYON_BANK + r + margin;
    if (Math.abs(Math.hypot(x - a.cx, y - a.cy) - a.R) > reach) continue;
    const { f, d, inner } = arcNearest(a, x, y);
    if (inner) continue;
    const w = a.w0 + (a.w1 - a.w0) * f * f * (3 - 2 * f);
    if (d < w + CANYON_BANK + r + margin) return true;
  }
  return false;
}

/** A point along a canyon, `f` of the way along its arc i: position and heading. */
export function canyonPoint(arc: CanyonArc, f: number): { x: number; y: number; h: number } {
  const an = arc.a0 + arc.sweep * f;
  const s = arc.sweep >= 0 ? 1 : -1;
  return {
    x: arc.cx + Math.cos(an) * arc.R,
    y: arc.cy + Math.sin(an) * arc.R,
    h: an + (s * Math.PI) / 2,
  };
}

/**
 * The canyons in GLSL: `float marsCanyon(vec2 a, out float floorK)` returns the carve at world
 * point a (and how much of the floor it is), arc by arc, the same as `canyonCut`.
 */
export function canyonGlsl(arcs: readonly CanyonArc[] = CANYON_ARCS): string {
  const f = (v: number) => v.toFixed(6);
  const body = arcs
    .map((a) => {
      const reach = Math.max(a.w0, a.w1) + CANYON_BANK;
      return `  {
    vec2 v = a - vec2(${f(a.cx)}, ${f(a.cy)});
    if (abs(length(v) - ${f(a.R)}) < ${f(reach)}) {
      float ang = atan(v.y, v.x) - ${f(a.a0 + a.sweep / 2)};
      ang -= 6.2831853 * floor((ang + 3.14159265) / 6.2831853);
      float raw = 0.5 + ang / ${f(a.sweep)};
      float fc = clamp(raw, 0.0, 1.0);
      float an = ${f(a.a0)} + ${f(a.sweep)} * fc;
      float dd = length(v - ${f(a.R)} * vec2(cos(an), sin(an)));
      float fe = fc * fc * (3.0 - 2.0 * fc);
      float w = mix(${f(a.w0)}, ${f(a.w1)}, fe);
      float D = mix(${f(a.d0)}, ${f(a.d1)}, fe);
      float pf = 1.0 - smoothstep(w, w + ${f(CANYON_BANK)}, dd);
      if (${a.first ? '0.5' : 'raw'} < 0.0 || ${a.last ? '0.5' : 'raw'} > 1.0) pf = 0.0;
      floorK = max(floorK, pf * min(1.0, D / 6.0));
      carve = max(carve, D * pf);
    }
  }`;
    })
    .join('\n');
  return `float marsCanyon(vec2 a, out float floorK) {
  float carve = 0.0;
  floorK = 0.0;
${body}
  return carve;
}
`;
}
