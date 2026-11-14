/*
 * Banners across the streets and signs turned every way (docs/specs/art-city.md, "Alive quarters",
 * 2026-11-14): "panels and banners crossing streets, like the CITY OF DREAMS ones, giving a door
 * effect and perspective: you fly under or over them", and "signs and words not all facing one way.
 * Some face cross streets, so flying perpendicular you also read them and feel you navigate. Some
 * sit at angles, and some high above buildings."
 *
 * Word signs (lib/city-signs.ts) stand across z; here a sign may be turned about the vertical by
 * any angle (orientedWordItem), still reading from both sides. Banners hang wall to wall across
 * the side streets (facing along them) and across the cross streets (turned a quarter, facing along
 * those), their foot well over the street channels' heights (lib/city-alive-base.ts), on two thin
 * cables to the walls. Blade signs stand out from the walls into the cross streets, corner signs
 * at forty-five degrees into the crossings, roof signs on posts high over the roofs at their own
 * angles. Light is the signs' slow breath and drift; nothing flashes. Pure: no three.js, no DOM.
 */

import { hash, type Vec3 } from './bigbang';
import {
  type Ahead,
  type AliveBlock,
  LANE_CLEAR,
  laneFree,
  offAvenue,
  QUARTER_TONE,
  quarterTones,
  solidTower,
  type TowerAt,
} from './city-alive-base';
import { skyStreamOver } from './city-currents';
import { type FaceId, textPixels } from './city-font';
import {
  BLOCK_X,
  BLOCK_Z,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { CITY_NAMES, type WordSign, wordItem } from './city-signs';
import { type StrokeSet, Strokes, strokeItem } from './city-strokes';

const G = GROUND;

/* ---------- a word sign turned about the vertical ---------- */

/** A word sign turned by `yaw` about the vertical line through (px, pz): its letters' +x to (cos, sin). */
export type Turned = { w: WordSign; yaw: number; px: number; pz: number };

/** A turned sign for the Ship's renderer: the sign seen from the eye turned back, its sites turned out. */
export function orientedWordItem(T: Turned, eye: Vec3, t: number): Item {
  const c = Math.cos(T.yaw);
  const s = Math.sin(T.yaw);
  const ex = eye[0] - T.px;
  const ez = eye[2] - T.pz;
  const local: Vec3 = [T.px + ex * c + ez * s, eye[1], T.pz - ex * s + ez * c];
  const base = wordItem(T.w, local, t);
  const turn = (o: number[] | Vec3) => {
    const x = (o[0] as number) - T.px;
    const z = (o[2] as number) - T.pz;
    o[0] = T.px + x * c - z * s;
    o[2] = T.pz + x * s + z * c;
  };
  const probe = base.probe?.map((p) => {
    const q: Vec3 = [p[0], p[1], p[2]];
    turn(q);
    return q;
  });
  return {
    ...base,
    gid: mixId(base.gid, Math.round(T.yaw * 100)),
    probe,
    site: (q, o) => {
      if (!base.site(q, o)) return false;
      turn(o);
      return true;
    },
  };
}

/** The ends of a turned sign's top edge and its foot, for the tests and the cables. */
export function turnedBox(T: Turned): { a: Vec3; b: Vec3; foot: number; top: number } {
  const P = textPixels(T.w.text, { face: T.w.face, vertical: T.w.vertical });
  const W = P.w * T.w.px;
  const H = P.h * T.w.px;
  const c = Math.cos(T.yaw);
  const s = Math.sin(T.yaw);
  const at = (x: number, z: number): Vec3 => {
    const dx = x - T.px;
    const dz = z - T.pz;
    return [T.px + dx * c - dz * s, T.w.at[1], T.pz + dx * s + dz * c];
  };
  return {
    a: at(T.w.at[0], T.w.at[2]),
    b: at(T.w.at[0] + W, T.w.at[2]),
    foot: T.w.at[1] - H,
    top: T.w.at[1],
  };
}

/* ---------- words ---------- */

/** The turned signs' words, quarter by quarter: our own. */
export const TURNED_WORDS: Record<string, string[]> = {
  indian: ['CHAI', 'LOTUS', 'SPICE', 'SITAR'],
  oriental: ['BAZAAR', 'LANTERN', 'MINT TEA', 'CARPETS'],
  heights: ['SKY BAR', 'EXCHANGE', 'HOTEL', 'LOOKOUT'],
  canals: ['GONDOLA', 'MOON BRIDGE', 'BOATHOUSE', 'JAZZ'],
  golden: ['GOLD', 'SUNRISE', 'GALLERY', 'BOOKS'],
  temples: ['INCENSE', 'BELLS', 'QUIET', 'GARDEN'],
  industrial: ['FOUNDRY', 'WORKSHOP', 'STEEL', 'MAKERS'],
  domes: ['GREENHOUSE', 'ORCHARD', 'TEA', 'STARS'],
  egypt: ['PAPYRUS', 'DATES', 'SPHINX', 'NILE'],
  market: ['NOODLES', 'ARCADE', 'KARAOKE', 'NEON'],
  code: ['ROOT', 'DATA', 'LOOP', 'ECHO'],
};
const FACES: FaceId[] = ['deco', 'tall', 'sign'];
const pick = <T>(xs: T[], h: number) => xs[Math.floor(h * xs.length) % xs.length] as T;

/* ---------- banners across the streets ---------- */

/** About this share of the street between two towers carries a banner across it. */
export const BANNER_SHARE = 0.45;
/** The heights a banner's foot may hang at, over the street: all clear of the lanes. */
export const BANNER_FEET = [38, 50, 64, 80];
/** A banner across a street, and the two cable ends at the walls. */
export type Banner = Turned & { axis: 0 | 2; walls: [Vec3, Vec3]; d: string };

/**
 * The banner across the street between tower A and its neighbour B (at I + 1 for `axis` 0, the
 * side street; at J + 1 for `axis` 2, the cross street), if it carries one: wall to wall, in the
 * middle of the block's length, its foot at one of BANNER_FEET under both roofs.
 */
export function bannerBetween(A: AliveBlock, B: AliveBlock, axis: 0 | 2): Banner | null {
  // Hung from plain towers, business towers and the Studio's buildings (never the Matrix's, which
  // rise and sink), never in Chinatown, whose streets have their own.
  const wall = (tw: AliveBlock) =>
    tw.shape === 'box' || tw.shape === 'business' || tw.shape === 'design';
  if (A.d === 'chinatown' || A.d !== B.d || !wall(A) || !wall(B)) return null;
  if (!offAvenue(A.I) || !offAvenue(B.I)) return null;
  const key = mixId(A.k * 5 + axis, 941);
  if (hash(key, 942) >= BANNER_SHARE) return null;
  const [a, b] = axis === 0 ? [A.x + A.hx, B.x - B.hx] : [A.z + A.hz, B.z - B.hz];
  const span = b - a - 1.2;
  if (span < 6) return null;
  // Its middle along the street: the middle of the walls' overlap, off the crossings.
  const lo = axis === 0 ? Math.max(A.z - A.hz, B.z - B.hz) : Math.max(A.x - A.hx, B.x - B.hx);
  const hi = axis === 0 ? Math.min(A.z + A.hz, B.z + B.hz) : Math.min(A.x + A.hx, B.x + B.hx);
  if (hi - lo < 4) return null;
  const c = (lo + hi) / 2;
  const words = [...CITY_NAMES, ...(TURNED_WORDS[A.d] ?? [])];
  const text = pick(words, hash(key, 943));
  const face = pick(FACES, hash(key, 944));
  const P = textPixels(text, { face });
  const px = Math.min(0.5, (span * 0.86) / P.w);
  const H = P.h * px;
  const roof = Math.min(A.h, B.h) - 4;
  const feet = BANNER_FEET.filter(
    (f) => f + H + 2 < roof && laneFree(f - 1) && laneFree(f + H + 1, A.d === 'market'),
  );
  if (!feet.length) return null;
  const foot = pick(feet, hash(key, 945));
  const W = P.w * px;
  const mid = (a + b) / 2;
  const tone = QUARTER_TONE[A.d] ?? C.warm;
  // Set out across z (letters along x) at its middle; turned a quarter for a cross street.
  const w: WordSign = {
    text,
    at: [mid - W / 2, G + foot + H, axis === 0 ? c : mid],
    px,
    rgb: tone,
    rgb2: mix(tone, C.white, 0.45),
    frameRgb: mix(tone, C.white, 0.2),
    key: 9800 + (key % 997),
    face,
    frame: 'box',
  };
  if (axis === 0)
    return {
      w,
      yaw: 0,
      px: mid,
      pz: c,
      axis,
      d: A.d,
      walls: [
        [a, G + foot + H + 3, c],
        [b, G + foot + H + 3, c],
      ],
    };
  // A cross street's: centred on (c, mid), turned so its letters run along z.
  w.at = [c - W / 2, G + foot + H, mid];
  return {
    w,
    yaw: Math.PI / 2,
    px: c,
    pz: mid,
    axis,
    d: A.d,
    walls: [
      [c, G + foot + H + 3, a],
      [c, G + foot + H + 3, b],
    ],
  };
}

/* ---------- signs on the towers, turned ---------- */

/** How often a tower carries a blade sign into a cross street, a corner sign, a roof sign. */
export const BLADE_SHARE = 0.16;
export const CORNER_SHARE = 0.08;
export const ROOF_SHARE = 0.1;
/** The lowest a turned sign's foot comes over the street: clear of the cross streets' lanes (30). */
export const SIGN_FOOT = 36;
/** The highest a turned sign on a wall reaches: under the express lanes (112, 120). */
export const SIGN_TOP = 100;
/** The highest a roof sign's top reaches: under the express lanes, the big ships and the high currents. */
export const ROOF_TOP = 104;

const towerSigns = new Map<number, Turned[]>();
/** A tower's turned signs: a blade into a cross street, a corner sign, a sign on posts over its roof. */
export function turnedSigns(tw: AliveBlock): Turned[] {
  const id = tw.I * 65536 + tw.J;
  const had = towerSigns.get(id);
  if (had) return had;
  const out: Turned[] = [];
  const words = TURNED_WORDS[tw.d];
  if (words && solidTower(tw) && offAvenue(tw.I) && tw.h >= SIGN_FOOT + 8) {
    const tone = QUARTER_TONE[tw.d] ?? C.warm;
    const sign = (
      text: string,
      x: number,
      top: number,
      z: number,
      px: number,
      s: number,
      vertical = false,
    ): WordSign => ({
      text,
      at: [x, top, z],
      px,
      rgb: tone,
      rgb2: mix(C.warm, tone, 0.3),
      key: 9900 + ((tw.k * 3 + s) % 997),
      face: vertical ? 'sign' : pick(FACES, hash(tw.k, 950 + s)),
      vertical,
      frame: vertical ? 'board' : 'line',
    });
    // A blade: stacked letters standing out of a wall into the cross street, read along it.
    if (hash(tw.k, 951) < BLADE_SHARE) {
      const side = hash(tw.k, 952) < 0.5 ? 1 : -1;
      const zf = tw.z + side * tw.hz;
      const line = (side > 0 ? Math.ceil(zf / BLOCK_Z) : Math.floor(zf / BLOCK_Z)) * BLOCK_Z;
      const room = Math.abs(line - zf) - 3.5;
      const text = pick(words, hash(tw.k, 953));
      const P = textPixels(text, { face: 'sign', vertical: true });
      const px = Math.min(0.28, room / P.w);
      const H = P.h * px;
      const top = G + Math.min(tw.h - 2, SIGN_TOP, SIGN_FOOT + H + 30 * hash(tw.k, 954));
      if (px > 0.12 && top - H >= G + SIGN_FOOT) {
        const x = tw.x + (hash(tw.k, 955) < 0.5 ? -1 : 1) * (tw.hx - 0.8);
        out.push({
          w: sign(text, x + 0.4, top, zf, px, 1, true),
          yaw: (side * Math.PI) / 2,
          px: x,
          pz: zf,
        });
      }
    }
    // A corner sign at forty-five degrees, out over the crossing.
    if (hash(tw.k, 961) < CORNER_SHARE) {
      const sx = hash(tw.k, 962) < 0.5 ? 1 : -1;
      const sz = hash(tw.k, 963) < 0.5 ? 1 : -1;
      const cx = tw.x + sx * tw.hx;
      const cz = tw.z + sz * tw.hz;
      const text = pick(words, hash(tw.k, 964));
      const P = textPixels(text, { face: 'deco' });
      const px = Math.min(0.24, 3.2 / P.w);
      const H = P.h * px;
      const top = G + Math.min(tw.h - 2, SIGN_FOOT + H + 24 * hash(tw.k, 965));
      if (top - H >= G + SIGN_FOOT)
        out.push({
          w: { ...sign(text, cx + 0.3, top, cz, px, 2), face: 'deco' },
          yaw: Math.atan2(sz, sx),
          px: cx,
          pz: cz,
        });
    }
    // A sign on posts over the roof, at its own angle: one of five.
    if (hash(tw.k, 971) < ROOF_SHARE) {
      const text = pick(words, hash(tw.k, 972));
      const face = pick(FACES, hash(tw.k, 973));
      const P = textPixels(text, { face });
      // Never wider than the roof, however it is turned: it stays over the tower.
      const px = Math.min(0.45, (2 * Math.min(tw.hx, tw.hz) * 0.9) / P.w);
      const H = P.h * px;
      const foot = tw.h + 4;
      // Never up into a low-roof highway over the tower (lib/city-currents.ts SKY_STREAMS).
      const lx = tw.x - nearest(0, tw.x, TILE_X);
      const lz = tw.z - Math.floor(tw.z / TILE_Z) * TILE_Z;
      const hw = skyStreamOver(lx, lz, Math.max(tw.hx, tw.hz) + 4);
      if (foot + H <= ROOF_TOP && (hw === null || foot + H < hw - 4)) {
        const yaw = pick([0, Math.PI / 2, Math.PI / 6, -Math.PI / 4, Math.PI / 3], hash(tw.k, 974));
        const W = P.w * px;
        out.push({
          w: { ...sign(text, tw.x - W / 2, G + foot + H, tw.z, px, 3), face, frame: 'box' },
          yaw,
          px: tw.x,
          pz: tw.z,
        });
      }
    }
  }
  if (towerSigns.size > 20000) towerSigns.clear();
  towerSigns.set(id, out);
  return out;
}

/* ---------- near the eye ---------- */

const cables = new Map<number, StrokeSet>();
/** The banners across the streets and the turned signs near the eye. */
export function bannerItems(
  eye: Vec3,
  t: number,
  R: number,
  towerAt: TowerAt,
  ahead: Ahead,
  out: Item[],
) {
  const I0 = Math.floor((eye[0] - R) / BLOCK_X);
  const I1 = Math.floor((eye[0] + R) / BLOCK_X);
  const J0 = Math.floor((eye[2] - R) / BLOCK_Z);
  const J1 = Math.floor((eye[2] + R) / BLOCK_Z);
  for (let I = I0; I <= I1; I++)
    for (let J = J0; J <= J1; J++) {
      const A = towerAt(I, J);
      if (!ahead(A.x, A.z, 30)) continue;
      for (const axis of [0, 2] as const) {
        const B = bannerBetween(A, axis === 0 ? towerAt(I + 1, J) : towerAt(I, J + 1), axis);
        if (!B) continue;
        const it = orientedWordItem(B, eye, t);
        if (it.d > R) continue;
        out.push(it);
        // Its two cables, from its top corners up to the walls.
        const ck = mixId(I * 7 + axis, J);
        let S = cables.get(ck);
        if (!S) {
          const box = turnedBox(B);
          S = new Strokes(0.6)
            .line([box.a[0], box.top, box.a[2]], B.walls[0], 0, 0.14)
            .line([box.b[0], box.top, box.b[2]], B.walls[1], 0, 0.14)
            .build();
          if (cables.size > 4000) cables.clear();
          cables.set(ck, S);
        }
        out.push(
          strokeItem(
            S,
            0,
            0,
            quarterTones(B.d, t, I + J),
            1,
            eye,
            t,
            mixId(I * 7 + axis, J),
            1.5,
            0,
          ),
        );
      }
      if (Math.hypot(A.x - eye[0], A.z - eye[2]) > 130) continue;
      for (const T of turnedSigns(A)) {
        const it = orientedWordItem(T, eye, t);
        if (it.d < 130) out.push(it);
      }
    }
}

/** For the tests: the least a banner's foot keeps over the nearest lane under it. */
export const BANNER_CLEAR = LANE_CLEAR;
