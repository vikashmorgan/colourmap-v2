/*
 * THE CITY MAP ENGINE — a memory palace seen from above. Any body of
 * knowledge given as plain data (a ring of cities → districts → buildings,
 * plus each city's spots, shelf and core lines) is laid out by fixed rules:
 * every kind of thing has one shape and one place, so the same data always
 * draws the same city and the eye learns where things are.
 *
 * First data source: the Pandas class (lib/pandas-city.ts). Meant to grow to
 * the second brain (the app's districts) and to the art organisation, each its
 * own city, later connected. Nothing here knows about any one source: words
 * such as "Lesson" or "Cheat sheet" come in with the data.
 *
 * Asked for 2026-11-12 ("aim is to use geometry to help memorise the lessons
 * because they all have a placement"); spec: docs/specs/pandas-city.md.
 *
 * All pure: the data types, the layout, the vein roads, and the panel stack.
 */

/* ── the data an adapter hands in ─────────────────────────────────────────── */

export type MapBuilding = {
  id: string;
  name: string;
  /** A short tag drawn on the block, e.g. "3.4". */
  tag: string;
  /** How much it holds; bigger blocks hold more. Any positive scale. */
  weight: number;
  /** Has a warning (drawn as a small triangle). */
  flag: boolean;
};
export type MapDistrict = { id: string; name: string; buildings: MapBuilding[] };
export type MapSpot = { id: string; name: string };
export type MapCity = {
  id: string;
  title: string;
  short: string;
  /** The few lines that matter most: shown at the Core depth and in the heart. */
  core: string[];
  districts: MapDistrict[];
  /** The places to practise or act, in the north. */
  spots: MapSpot[];
  /** How many reference entries stand on the east shelf. */
  shelf: number;
};
export type MapWords = {
  /** What one city is called: "Lesson". */
  city: string;
  district: string;
  building: string;
  spots: string;
  shelf: string;
  core: string;
};
export type MapData = {
  id: string;
  title: string;
  centre: { name: string; blurb: string };
  words: MapWords;
  /** The ring, in order clockwise from the top; null is a plot still to come. */
  slots: (MapCity | null)[];
};

/* ── layout: fixed placements, a shape for every kind ─────────────────────── */

export const PHI = (1 + Math.sqrt(5)) / 2;
/** The great ring the cities stand on, and the plaza at its centre. */
export const RING_R = 1000;
export const PLAZA_R = RING_R / PHI ** 4;
/** Every city fits in this radius around its heart. */
export const CITY_R = 340;
/** The districts sit on this ring around the heart. */
export const DISTRICT_RING = CITY_R / PHI;
export const HEART_R = CITY_R / PHI ** 4;
const DISTRICT_MAX = CITY_R / PHI ** 3;
const OUTER_GAP = 34;
const SPOT_R = 18;
const SPOT_STEP = 52;
const SHELF_W = 28;
const SHELF_H = 220;
const GATE_W = 64;
/** Where the spots, the gate and the shelf stand, from the heart. */
export const OUTER_REACH = DISTRICT_RING + DISTRICT_MAX + OUTER_GAP;

/** The vocabulary: one shape per kind of thing, the same in every city. */
export const SHAPES = {
  plaza: 'circle',
  heart: 'circle',
  core: 'star',
  district: 'octagon',
  building: 'square',
  flag: 'triangle',
  spot: 'hexagon',
  shelf: 'long rectangle',
  gate: 'gate',
} as const;
export type Kind = keyof typeof SHAPES;

/**
 * Each city's one character: its accent, all in the City of Dreams' family (deep saturated gold
 * [1, 0.5, 0.12] through ivory gold to warm white). The bones stay the same.
 */
export const ACCENTS = [
  '#FF8F33',
  '#FFA05A',
  '#FFB27A',
  '#F5A04A',
  '#FFC780',
  '#F28A3C',
  '#EBA65E',
  '#FFA54D',
];

export type Block = MapBuilding & {
  kind: 'building';
  x: number;
  y: number;
  /** The side of the square. */
  side: number;
  /** The cell the square sits in (side ≤ cell). */
  cell: number;
};
export type DistrictPlan = {
  kind: 'district';
  index: number;
  id: string;
  name: string;
  x: number;
  y: number;
  /** Circumradius of the octagon. */
  r: number;
  angle: number;
  blocks: Block[];
};
export type SpotPlan = MapSpot & { kind: 'spot'; x: number; y: number; r: number };
export type CityPlan = {
  /** Place on the ring, 1-based. */
  n: number;
  lit: boolean;
  city: MapCity | null;
  accent: string;
  x: number;
  y: number;
  r: number;
  heart: { kind: 'heart'; x: number; y: number; r: number };
  gate: { kind: 'gate'; x: number; y: number; w: number };
  districts: DistrictPlan[];
  spots: SpotPlan[];
  shelf: { kind: 'shelf'; x: number; y: number; w: number; h: number; entries: number };
};
export type MapPlan = {
  plaza: { kind: 'plaza'; x: number; y: number; r: number };
  ring: number;
  cities: CityPlan[];
};

/** Angle of place n of `count` on the ring: clockwise from the top (screen y points down). */
export const cityAngle = (n: number, count: number) =>
  -Math.PI / 2 + ((n - 1) * 2 * Math.PI) / count;
/** Angle of district k of g: clockwise from the gate at the bottom. */
export const districtAngle = (k: number, g: number) => Math.PI / 2 + ((k + 0.5) * 2 * Math.PI) / g;

function placeBlocks(items: MapBuilding[], cx: number, cy: number, r: number): Block[] {
  if (!items.length) return [];
  const cols = Math.ceil(Math.sqrt(items.length));
  const rows = Math.ceil(items.length / cols);
  // The grid's corners stay inside the octagon's inner circle.
  const inner = r * Math.cos(Math.PI / 8) * 0.92;
  const cell = Math.min(36, (2 * inner) / Math.hypot(cols, rows));
  const weights = items.map((c) => c.weight);
  const lo = Math.min(...weights);
  const hi = Math.max(...weights);
  return items.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inRow = row === rows - 1 ? items.length - row * cols : cols;
    const t = hi > lo ? (item.weight - lo) / (hi - lo) : 0.5;
    return {
      ...item,
      kind: 'building',
      x: cx + (col - (inRow - 1) / 2) * cell,
      y: cy + (row - (rows - 1) / 2) * cell,
      side: cell * (0.5 + 0.38 * t),
      cell,
    };
  });
}

function planCity(city: MapCity | null, n: number, count: number): CityPlan {
  const a = cityAngle(n, count);
  const x = RING_R * Math.cos(a);
  const y = RING_R * Math.sin(a);
  const groups = city?.districts ?? [];
  const g = Math.max(groups.length, 1);
  const r = Math.min(DISTRICT_MAX, DISTRICT_RING * Math.sin(Math.PI / g) * 0.9);
  const districts: DistrictPlan[] = groups.map((d, k) => {
    const angle = districtAngle(k, groups.length);
    const dx = x + DISTRICT_RING * Math.cos(angle);
    const dy = y + DISTRICT_RING * Math.sin(angle);
    return {
      kind: 'district',
      index: k,
      id: d.id,
      name: d.name,
      x: dx,
      y: dy,
      r,
      angle,
      blocks: placeBlocks(d.buildings, dx, dy, r),
    };
  });
  const spots = city?.spots ?? [];
  return {
    n,
    lit: Boolean(city),
    city,
    accent: ACCENTS[(n - 1) % ACCENTS.length],
    x,
    y,
    r: CITY_R,
    heart: { kind: 'heart', x, y, r: HEART_R },
    gate: { kind: 'gate', x, y: y + OUTER_REACH + SPOT_R, w: GATE_W },
    districts,
    spots: spots.map((s, i) => ({
      ...s,
      kind: 'spot',
      x: x + (i - (spots.length - 1) / 2) * SPOT_STEP,
      y: y - OUTER_REACH - SPOT_R,
      r: SPOT_R,
    })),
    shelf: {
      kind: 'shelf',
      x: x + OUTER_REACH,
      y: y - SHELF_H / 2,
      w: SHELF_W,
      h: SHELF_H,
      entries: city?.shelf ?? 0,
    },
  };
}

/** The whole map: the plaza, the ring, and every city with everything placed. */
export function layoutMap(data: MapData): MapPlan {
  const count = data.slots.length;
  return {
    plaza: { kind: 'plaza', x: 0, y: 0, r: PLAZA_R },
    ring: RING_R,
    cities: data.slots.map((c, i) => planCity(c, i + 1, count)),
  };
}

/* ── veins: roads that branch from a glowing centre ───────────────────────── */

/** One road: an SVG path, its width in map units, and its generation (0 the trunk). */
export type Vein = { d: string; w: number; gen: number };

const f1 = (v: number) => v.toFixed(1);

/** A curved road from a to b, bowed sideways by `bend` of its length. */
function curve(ax: number, ay: number, bx: number, by: number, bend: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / (len || 1);
  const ny = (bx - ax) / (len || 1);
  return `M${f1(ax)} ${f1(ay)} Q${f1(mx + nx * bend * len)} ${f1(my + ny * bend * len)} ${f1(bx)} ${f1(by)}`;
}

/** The point at t along the quadratic road from a to b with that bend. */
function along(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  bend: number,
  t: number,
): [number, number] {
  const len = Math.hypot(bx - ax, by - ay);
  const cx = (ax + bx) / 2 + (-(by - ay) / (len || 1)) * bend * len;
  const cy = (ay + by) / 2 + ((bx - ax) / (len || 1)) * bend * len;
  const u = 1 - t;
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

/**
 * A city's roads, like the veins of a leaf: the main avenue from the gate to
 * the spots is the midrib; a trunk curves from the heart to each district and
 * forks into twigs to its blocks; side veins branch off each trunk towards the
 * edge; two ring roads cross them. The same city always grows the same veins.
 */
export function cityVeins(c: CityPlan): Vein[] {
  if (!c.lit) return [];
  const veins: Vein[] = [];
  const top = c.spots[0]?.y ?? c.y - OUTER_REACH;
  veins.push({ d: curve(c.x, c.gate.y, c.x, c.y + HEART_R, 0), w: 7, gen: 0 });
  veins.push({ d: curve(c.x, c.y - HEART_R, c.x, top + SPOT_R, 0), w: 7, gen: 0 });
  veins.push({ d: curve(c.x + HEART_R, c.y, c.shelf.x, c.y, 0.04), w: 4, gen: 1 });
  for (const d of c.districts) {
    const bend = d.index % 2 ? 0.12 : -0.12;
    const sx = c.x + HEART_R * Math.cos(d.angle);
    const sy = c.y + HEART_R * Math.sin(d.angle);
    veins.push({ d: curve(sx, sy, d.x, d.y, bend), w: 5, gen: 1 });
    // Side veins leave the trunk two-thirds out and run to the city's edge.
    const [bx, by] = along(sx, sy, d.x, d.y, bend, 0.62);
    for (const side of [-1, 1]) {
      const a = d.angle + side * (Math.PI / 2.6);
      const len = d.r * 1.15;
      veins.push({
        d: curve(bx, by, bx + len * Math.cos(a), by + len * Math.sin(a), side * 0.18),
        w: 2,
        gen: 2,
      });
    }
    // Twigs from the district's centre to each block.
    d.blocks.forEach((b, i) => {
      if (Math.hypot(b.x - d.x, b.y - d.y) < 1) return;
      veins.push({ d: curve(d.x, d.y, b.x, b.y, i % 2 ? 0.2 : -0.2), w: 1.4, gen: 3 });
    });
  }
  return veins;
}

/** The inner ring road, clear of every city. */
export const INNER_RING = RING_R - CITY_R - 60;

/** The ring road: one arc between each pair of neighbours, stopping at the cities' edges. */
export function ringRoads(plan: MapPlan): string[] {
  const count = plan.cities.length;
  if (count < 2) return [];
  const gap = Math.asin(Math.min(1, (CITY_R + 24) / RING_R));
  const step = (2 * Math.PI) / count;
  if (step <= 2 * gap) return [];
  return plan.cities.map((c) => {
    const a0 = cityAngle(c.n, count) + gap;
    const a1 = cityAngle(c.n, count) + step - gap;
    return `M${f1(RING_R * Math.cos(a0))} ${f1(RING_R * Math.sin(a0))} A${RING_R} ${RING_R} 0 0 1 ${f1(RING_R * Math.cos(a1))} ${f1(RING_R * Math.sin(a1))}`;
  });
}

/** The region's veins: a curved trunk from the plaza to every city, forking toward the inner ring. */
export function regionVeins(plan: MapPlan): Vein[] {
  const veins: Vein[] = [];
  const count = plan.cities.length;
  for (const c of plan.cities) {
    const a = Math.atan2(c.y, c.x);
    const end = RING_R - CITY_R - 24;
    const ax = plan.plaza.r * Math.cos(a);
    const ay = plan.plaza.r * Math.sin(a);
    const bend = c.n % 2 ? 0.08 : -0.08;
    veins.push({ d: curve(ax, ay, end * Math.cos(a), end * Math.sin(a), bend), w: 10, gen: 0 });
    const [fx, fy] = along(ax, ay, end * Math.cos(a), end * Math.sin(a), bend, 0.7);
    for (const side of [-1, 1]) {
      const b = a + (side * Math.PI) / count;
      const r = INNER_RING;
      veins.push({ d: curve(fx, fy, r * Math.cos(b), r * Math.sin(b), side * 0.15), w: 3, gen: 2 });
    }
  }
  return veins;
}

/** The points of a regular polygon around (x, y), the first at `start` radians. */
export function polygon(
  x: number,
  y: number,
  r: number,
  sides: number,
  start = -Math.PI / 2,
): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / sides;
    return `${f1(x + r * Math.cos(a))},${f1(y + r * Math.sin(a))}`;
  }).join(' ');
}

/** A five-pointed star around (x, y). */
export function star(x: number, y: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r / PHI ** 2 : r;
    return `${f1(x + rr * Math.cos(a))},${f1(y + rr * Math.sin(a))}`;
  }).join(' ');
}

/* ── light: the shapes as paths, grains and the heart's lattice ──────────── */

/** A circle as a path. */
export const circlePath = (x: number, y: number, r: number) =>
  `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;

/** A polygon's points (from `polygon`) as a closed path. */
export const polygonPath = (points: string) => `M${points.split(' ').join(' L')}Z`;

/**
 * The heart as a small Nova-like lattice: an eight-pointed star drawn as one line through every
 * third point, the eight spokes, and an inner octagon.
 */
export function lattice(x: number, y: number, r: number): string {
  const at = (i: number, rr: number) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    return `${f1(x + rr * Math.cos(a))} ${f1(y + rr * Math.sin(a))}`;
  };
  const starLine = `M${at(0, r)}${Array.from({ length: 8 }, (_, i) => ` L${at(((i + 1) * 3) % 8, r)}`).join('')}`;
  const spokes = Array.from({ length: 8 }, (_, i) => `M${f1(x)} ${f1(y)} L${at(i, r)}`).join(' ');
  const inner = `M${at(0, r / PHI ** 2)}${Array.from({ length: 8 }, (_, i) => ` L${at(i + 1, r / PHI ** 2)}`).join('')}`;
  return `${starLine} ${spokes} ${inner}`;
}

/** A small deterministic random in [0, 1). */
function seeded(seed: number): () => number {
  let s = Math.floor(Math.abs(seed)) % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Grains of light around (x, y): `count` points within radius r, denser toward the centre
 * (hope as a gradient, as in the City of Dreams), drawn as one path of dots. Same seed, same grains.
 */
export function grains(seed: number, count: number, x: number, y: number, r: number): string {
  const rand = seeded(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const rr = r * rand() ** 1.6;
    d += `M${f1(x + rr * Math.cos(a))} ${f1(y + rr * Math.sin(a))}h0`;
  }
  return d;
}

/* ── panels: sheets on top, one depth per level ───────────────────────────── */

export type Panel =
  | { kind: 'city'; n: number }
  | { kind: 'district'; n: number; district: number }
  | { kind: 'spots'; n: number }
  | { kind: 'shelf'; n: number }
  | { kind: 'building'; n: number; district: number; building: string }
  | { kind: 'more'; n: number; district: number; building: string };

const DEPTH: Record<Panel['kind'], number> = {
  city: 1,
  district: 2,
  spots: 2,
  shelf: 2,
  building: 3,
  more: 4,
};
export const panelDepth = (p: Panel) => DEPTH[p.kind];

/** Open a panel: everything as deep or deeper goes, so each depth holds one sheet; another city starts afresh. */
export function pushPanel(stack: Panel[], panel: Panel): Panel[] {
  const kept = stack.filter((p) => panelDepth(p) < panelDepth(panel) && p.n === panel.n);
  return [...kept, panel];
}

/** Back one level. */
export const popPanel = (stack: Panel[]): Panel[] => stack.slice(0, -1);

/** The sheets that lead to a panel, from a tap on the map: a building opens on its district. */
export function panelChain(panel: Panel): Panel[] {
  if (panel.kind === 'building')
    return [{ kind: 'district', n: panel.n, district: panel.district }, panel];
  if (panel.kind === 'more')
    return [
      { kind: 'district', n: panel.n, district: panel.district },
      { kind: 'building', n: panel.n, district: panel.district, building: panel.building },
      panel,
    ];
  return [panel];
}

/** Open a panel from anywhere: its chain, pushed onto the stack. */
export const openPanel = (stack: Panel[], panel: Panel): Panel[] =>
  panelChain(panel).reduce(pushPanel, stack);

/** The name a panel stands for. */
export function panelTitle(panel: Panel, data: MapData): string {
  const city = data.slots[panel.n - 1];
  if (!city) return `${data.words.city} ${panel.n}`;
  switch (panel.kind) {
    case 'city':
      return city.title;
    case 'spots':
      return data.words.spots;
    case 'shelf':
      return data.words.shelf;
    case 'district':
      return city.districts[panel.district]?.name ?? '';
    case 'building':
    case 'more':
      return (
        city.districts[panel.district]?.buildings.find((b) => b.id === panel.building)?.name ?? ''
      );
  }
}

/** Pandas › Lesson 3 › Missing values › NaN marks an empty cell… › More */
export function breadcrumb(stack: Panel[], data: MapData): string[] {
  if (!stack.length) return [data.title];
  const crumbs = [data.title, `${data.words.city} ${stack[0].n}`];
  for (const p of stack) {
    if (p.kind === 'city') continue;
    crumbs.push(p.kind === 'more' ? 'More' : panelTitle(p, data));
  }
  return crumbs;
}
