/**
 * Chinatown Run's street canyon (2026-11-24: "chinatown make it longer and really think how all
 * the elements form the chinatown in the 3d city. check how streets look and check it to make a
 * taller chinatown streets with more of those chinese publicity panels"). Pure: no three.js, no DOM.
 *
 * Taken from the City's Chinatown (lib/city-game.ts towerSigns, tieredTower and the tower heights,
 * lib/city-chinatown-open.ts, lib/city-signs.ts):
 * - Towers storey on storey, a flared gold eave at every other storey over a red fascia, a balcony
 *   rail and a lantern at each corner on the eave storeys, a pagoda crown of three roofs (five and a
 *   spire on the tall ones). Mostly one height band, a tall tiered tower about one in six.
 * - Tall blade signs with one to four characters, standing out from both street walls at several
 *   levels up a tower (four on the tall ones), facing down the street so you read them as you come,
 *   staggered so two never face each other across the street.
 * - Name boards high on the tall towers; strings of lights across the street at a few heights.
 * - Red, gold and lantern red with a little jade, all of it steady light: nothing flashes.
 *
 * Here those become a road's canyon: shophouse towers shoulder to shoulder close along both sides,
 * their rooflines swelling slowly so the cornices recede as one line, blade signs up every face and
 * horizontal boards between them, and only light across the road, so the view down it stays open.
 */

import { PATH_SIGNS } from './chinatown-paths';

/** A storey (m), and the step from one shophouse to the next along a side (m). */
export const CT_STOREY = 3.4;
/** One crown roof's rise (m). */
export const CT_ROOF = 2.6;
/** From this many storeys a tower is one of the tall tiered ones (crown of five, spire, name board). */
export const CT_TALL_FLOORS = 13;
/** About one tower in six off the avenue stands tall (the City's CT_TALL_SHARE is 0.16). */
export const CT_TALL_SHARE = 0.16;
/**
 * Where Undertown hangs over the street (lib/art/undertown.ts), its shophouses hang roofs down from
 * the road 36 m up to about 25 m over the street: the towers below stay under this many storeys,
 * with a single roof, so nothing meets.
 */
export const CT_UNDER_FLOORS = 5;
/** The tallest anything below Undertown may reach (m): under its hanging houses with room. */
export const CT_UNDER_TOP = 21;

function hash(n: number, k: number): number {
  const s = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
/** Smooth noise along a line: neighbours alike, so a roofline swells rather than jumps. */
function swell(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

/**
 * How many storeys shophouse i on a side has, standing at s: six to eleven along a slow swell of
 * the roofline (neighbours alike), now and then a tall tiered tower of 13 to 17; two more on the
 * avenues, where they stand further back; at most CT_UNDER_FLOORS where Undertown hangs over.
 */
export function ctFloors(
  i: number,
  side: 1 | -1,
  s: number,
  avenue: boolean,
  under: boolean,
): number {
  const seed = side > 0 ? 71 : 73;
  let f = 6 + Math.round(4 * swell(s / 110, seed) + 1.4 * (hash(i, seed + 2) - 0.5));
  if (hash(i, seed + 4) < CT_TALL_SHARE) f = CT_TALL_FLOORS + Math.floor(5 * hash(i, seed + 6));
  if (avenue) f += 2;
  if (under) f = Math.min(f, CT_UNDER_FLOORS);
  return Math.max(3, f);
}

/** How many crown roofs a tower of `floors` wears: five on the tall, one under Undertown, else three. */
export function ctRoofs(floors: number, under: boolean): number {
  if (under) return 1;
  return floors >= CT_TALL_FLOORS ? 5 : 3;
}

/** The top of a tower, crown and spire included (m). */
export function ctTop(floors: number, under: boolean): number {
  const roofs = ctRoofs(floors, under);
  const spire = floors >= CT_TALL_FLOORS && !under ? 8 : 0;
  return floors * CT_STOREY + roofs * CT_ROOF + spire;
}

/* ── The publicity panels ──────────────────────────────────── */

/** Blade signs' words (the City's SIGN_WORDS and more): ramen, tea, dragon, wine, dream, noodles,
 * good fortune, café, night market, gold, great luck, dim sum, restaurant, tea house. */
export const CT_BLADE_WORDS = [
  'ラーメン',
  '茶',
  '龍',
  '酒',
  '夢',
  '麺',
  '福',
  '喫茶',
  '夜市',
  '金',
  '大吉',
  '點心',
  '飯店',
  '茶樓',
];
/** The horizontal boards' words: Chinatown, the lucky star house, golden dragon, night market, tea
 * house, great luck, dragon gate, good fortune, dim sum, and the City's own name now and then. */
export const CT_BOARD_WORDS = [
  '中華街',
  '福星樓',
  '金龍',
  '夜市',
  '茶樓',
  '大吉',
  '龍門',
  'CITY OF DREAMS',
  '鴻運',
  '點心',
];

/** A board's ink and ground (css). Mostly red and gold; a jade and a pink neon for a little neon. */
export const CT_TONES: readonly { ink: string; bg: string }[] = [
  { ink: '#ffd27a', bg: '#7a0c06' }, // gold on lacquer
  { ink: '#ff6a3a', bg: '#2a0604' }, // lantern orange on dark
  { ink: '#5a0804', bg: '#e8a83a' }, // dark red on gold
  { ink: '#ffe0a0', bg: '#9a1208' }, // pale gold on red
  { ink: '#fff0d0', bg: '#b8160c' }, // warm white on red
  { ink: '#5cf0a8', bg: '#04140c' }, // jade neon
  { ink: '#ffb347', bg: '#200404' }, // amber on dark
  { ink: '#ff5ab4', bg: '#1a0410' }, // pink neon
];

/** The sign atlas: one canvas, 32 blade cells (128 × 512) above 32 board cells (512 × 128). */
export const CT_ATLAS = { size: 2048, cells: 32, blade: [128, 512], board: [512, 128] } as const;
/** A blade's lettering: a 20 px margin top and bottom, a character every 112 px. */
export const CT_BLADE_PAD = 20;
export const CT_BLADE_STEP = 112;

/**
 * The last three board cells carry the two paths' signs (lib/art/chinatown-paths.ts): 下町
 * UNDERTOWN in pink neon, 大街 MAIN STREET in gold on lacquer, 露台 BALCONY in jade. The street's
 * own boards take the cells before them (CT_BOARD_FREE).
 */
export const CT_PATH_CELLS = { under: 29, main: 30, balcony: 31 } as const;
export const CT_BOARD_FREE = 29;
const PATH_CELL_WORDS: Record<number, { word: string; tone: number }> = {
  [CT_PATH_CELLS.under]: { word: PATH_SIGNS.under, tone: 7 },
  [CT_PATH_CELLS.main]: { word: PATH_SIGNS.main, tone: 0 },
  [CT_PATH_CELLS.balcony]: { word: PATH_SIGNS.balcony, tone: 5 },
};

/** Which word and tone atlas cell c (0..31) of a kind carries. */
export function ctCell(kind: 'blade' | 'board', c: number): { word: string; tone: number } {
  const words = kind === 'blade' ? CT_BLADE_WORDS : CT_BOARD_WORDS;
  const k = ((c % CT_ATLAS.cells) + CT_ATLAS.cells) % CT_ATLAS.cells;
  if (kind === 'board' && PATH_CELL_WORDS[k]) return PATH_CELL_WORDS[k];
  return { word: words[k % words.length], tone: k % CT_TONES.length };
}

/** How tall a blade cell's lettering runs (px): only that much of the cell is used. */
export const bladeUsed = (word: string) => 2 * CT_BLADE_PAD + CT_BLADE_STEP * [...word].length;

/**
 * Where cell c sits in the atlas: its canvas rectangle (x, y, w, h, px from the top left) and its
 * uv rectangle [u0, v0, u1, v1] (v up, the texture flipped as three.js does). A blade's is cut to
 * its lettering, so a one-character sign is short and a four-character one tall.
 */
export function ctCellRect(
  kind: 'blade' | 'board',
  c: number,
): { x: number; y: number; w: number; h: number; uv: [number, number, number, number] } {
  const S = CT_ATLAS.size;
  const k = ((c % CT_ATLAS.cells) + CT_ATLAS.cells) % CT_ATLAS.cells;
  let x: number;
  let y: number;
  let w: number;
  let h: number;
  if (kind === 'blade') {
    const [cw, ch] = CT_ATLAS.blade;
    x = (k % 16) * cw;
    y = Math.floor(k / 16) * ch;
    w = cw;
    h = Math.min(ch, bladeUsed(ctCell('blade', k).word));
  } else {
    const [cw, ch] = CT_ATLAS.board;
    x = (k % 4) * cw;
    y = S / 2 + Math.floor(k / 4) * ch;
    w = cw;
    h = ch;
  }
  return { x, y, w, h, uv: [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S] };
}

/** A blade sign on a shophouse face: along its face at da (m from its middle), bottom at lift. */
export interface CtBlade {
  /** Which of the tower's levels it hangs at. */
  level: number;
  da: number;
  lift: number;
  /** Out from the wall (m) and up (m). */
  out: number;
  h: number;
  cell: number;
}

/** The levels blades stand at up a tower, as fractions of its height (the City's CT_SIGN_LEVELS
 * and CT_SIGN_LEVELS_TALL, one more each now the street is the whole view). */
export const CT_BLADE_LEVELS = [0.2, 0.5, 0.8];
export const CT_BLADE_LEVELS_TALL = [0.14, 0.36, 0.58, 0.8, 0.94];
/** Nothing hangs lower than this over the pavement (m). */
export const CT_SIGN_FLOOR = 4.6;

/**
 * Shophouse i's blade signs (half-length w along the road, `floors` storeys): one at each level,
 * near one end of the face or the other in turn and the other way round on the far side, so two
 * never face each other across the street and down the street they step like a zip. Bigger up the
 * tall towers. Each stays on its tower, over the pavement's head height and under its eave line.
 */
export function ctBlades(i: number, side: 1 | -1, floors: number, w: number): CtBlade[] {
  const out: CtBlade[] = [];
  const tall = floors >= CT_TALL_FLOORS;
  const H = floors * CT_STOREY;
  const levels = tall ? CT_BLADE_LEVELS_TALL : CT_BLADE_LEVELS;
  levels.forEach((lv, m) => {
    const j = i * 7 + m * 3 + (side > 0 ? 1 : 0);
    const cell = ((j % CT_ATLAS.cells) + CT_ATLAS.cells) % CT_ATLAS.cells;
    const width = tall && m >= 2 ? 2.2 : 1.6;
    const h = (width * bladeUsed(ctCell('blade', cell).word)) / CT_ATLAS.blade[0];
    const top = Math.min(H - 0.8, H * lv + h / 2);
    const lift = top - h;
    if (lift < CT_SIGN_FLOOR) return;
    // Pushed down under the eaves, the top one may meet the one below: then it is left off.
    const below = out[out.length - 1];
    if (below && lift < below.lift + below.h + 0.6) return;
    const back = (m + i + (side > 0 ? 1 : 0)) % 2 === 1;
    out.push({ level: m, da: (back ? -0.55 : 0.5) * w, lift, out: width, h, cell });
  });
  return out;
}

/** A horizontal board flat on a shophouse face: centred along it at da, bottom at lift. */
export interface CtBoard {
  da: number;
  lift: number;
  /** Along the face (m) and up (m): the atlas' 4 : 1. */
  len: number;
  h: number;
  cell: number;
}

/**
 * Shophouse i's horizontal boards: on two houses in three, one across the face at the storey
 * nearest a third of its height that no blade crosses; on the taller ones a second, higher up.
 * Always on a storey without a balcony (the even ones), between its fascia and the eave above.
 */
export function ctBoards(i: number, side: 1 | -1, floors: number, w: number): CtBoard[] {
  if (((i % 3) + 3) % 3 === 2) return [];
  const blades = ctBlades(i, side, floors, w);
  const len = Math.min(2 * w * 0.78, 10);
  const h = len / 4;
  const out: CtBoard[] = [];
  const free = (lift: number) =>
    lift >= CT_SIGN_FLOOR - 1.2 &&
    lift + h <= floors * CT_STOREY - 1 &&
    blades.every((b) => lift + h < b.lift - 0.3 || lift > b.lift + b.h + 0.3) &&
    out.every((o) => Math.abs(o.lift - lift) > h + 2);
  const wants = floors >= 9 ? [0.32, 0.68] : [0.38];
  wants.forEach((f, n) => {
    // The free storey nearest the wanted height: an even one, under no balcony rail.
    let best: number | null = null;
    for (let k = 2; k < floors; k += 2) {
      const lift = k * CT_STOREY + 0.5;
      if (!free(lift)) continue;
      if (
        best === null ||
        Math.abs(lift - floors * CT_STOREY * f) < Math.abs(best - floors * CT_STOREY * f)
      )
        best = lift;
    }
    if (best === null) return;
    const j = i * 5 + n * 11 + (side > 0 ? 3 : 0);
    out.push({
      da: 0,
      lift: best,
      len,
      h,
      cell: ((j % CT_BOARD_FREE) + CT_BOARD_FREE) % CT_BOARD_FREE,
    });
  });
  return out;
}

/** A lit window on a street face: along it at da (m), up at h (m), in tone t (0..3). */
export interface CtWindow {
  da: number;
  h: number;
  t: number;
}

/**
 * The street face's lit windows, as points of light (the City's grains): a column every 2.2 m, a
 * window at each storey over the shop, about a third of them lit, a few in jade. Same every time.
 */
export function ctWindows(i: number, side: 1 | -1, floors: number, w: number): CtWindow[] {
  const out: CtWindow[] = [];
  const cols = Math.max(1, Math.floor((2 * w - 1.6) / 2.2));
  const seed = side > 0 ? 91 : 97;
  for (let f = 1; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const n = i * 4099 + f * 131 + c;
      if (hash(n, seed) > 0.36) continue;
      const da = -((cols - 1) * 2.2) / 2 + c * 2.2;
      const r = hash(n, seed + 1);
      out.push({ da, h: f * CT_STOREY + 1.6, t: r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.94 ? 2 : 3 });
    }
  }
  return out;
}
