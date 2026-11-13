/*
 * The Embassies of Happiness in the City of Dreams (docs/specs/art-city.md, "Embassies of
 * Happiness"). Pure: no three.js, no DOM.
 *
 * Queued from the user (2026-11-12): "Embassies of Happiness with a Shark Simulator cabinet":
 * several unique buildings with a big glowing "EMBASSY OF HAPPINESS" sign, each with a dock to a
 * big room holding an arcade cabinet, SHARK SIMULATOR; walking up to it asks "Do you want to take
 * a rest from the city and play Shark Simulator?", and yes opens the Ocean on its Shark Sim.
 *
 * Three embassies a tile, each its own design and two hues of its own, out of the districts'
 * crowds: the Lotus (a round tower in three rings of opening petals) among the Golden district's
 * parks, the Hanging Gardens (terraces widening as they rise, plants on every edge, water falling
 * from tier to tier) in the Oriental quarter, and the Prism (a glass prism turning a sixth as it
 * rises round a heart of light) in the Market. Each carries its sign on the face toward the avenue
 * and a big room on its roof (a dock of lib/city-docks.ts, its pad over the street; the arcade
 * is drawn by lib/city-rooms.ts).
 */

import { hash, type RGB, type Vec3 } from './bigbang';
import type { Dock, PadDesign } from './city-docks';
import { textPixels } from './city-font';
import {
  BLOCK_X,
  BLOCK_Z,
  beat,
  boxDist,
  C,
  GROUND,
  type Item,
  mix,
  mixId,
  nearest,
  scale,
  TAU,
  TILE_I,
  TILE_J,
  TILE_X,
  TILE_Z,
} from './city-grid';
import { meshSite, type Palette, type Placed } from './city-mesh';
import { Anim, type Built, type Hit, Mesh, Tone } from './grain-mesh';

const G = GROUND;
const { edge, glass, light, plant, road, water } = Tone;

export type EmbassyDesign = 'Lotus' | 'Hanging Gardens' | 'Prism';

/** An embassy, tile-local: its block (column -6..5, row 0..47), size, design, hues and room. */
export type Embassy = {
  design: EmbassyDesign;
  li: number;
  lj: number;
  hx: number;
  hz: number;
  h: number;
  hues: [RGB, RGB];
  /** Which way its roof room's window looks, and its pad's design. */
  view: [number, number];
  pad: PadDesign;
};

export const EMBASSIES: Embassy[] = [
  {
    design: 'Lotus',
    li: -4,
    lj: 30,
    hx: 9,
    hz: 9,
    h: 34,
    hues: [C.rose, C.gold],
    view: [0, -1],
    pad: 'garden',
  },
  {
    design: 'Hanging Gardens',
    li: 3,
    lj: 14,
    hx: 9,
    hz: 11,
    h: 38,
    hues: [C.turquoise, C.leaf],
    view: [0, -1],
    pad: 'ring',
  },
  {
    design: 'Prism',
    li: 2,
    lj: 42,
    hx: 9,
    hz: 10,
    h: 30,
    hues: [C.violet, C.white],
    view: [-1, 0],
    pad: 'helipad',
  },
];

/** The words of every embassy's sign. */
export const EMBASSY_SIGN = 'EMBASSY OF\nHAPPINESS';

/** An embassy's centre on the plan, tile-local. */
export const embassyCentre = (e: Embassy): [number, number] => [
  (e.li + 0.5) * BLOCK_X,
  (e.lj + 0.5) * BLOCK_Z,
];

/** The embassy on block (I, J) of the plan (any tile), or null. */
export function embassyAt(I: number, J: number): Embassy | null {
  const li = ((((I + TILE_I / 2) % TILE_I) + TILE_I) % TILE_I) - TILE_I / 2;
  const lj = ((J % TILE_J) + TILE_J) % TILE_J;
  for (const e of EMBASSIES) if (e.li === li && e.lj === lj) return e;
  return null;
}

/** The big rooms on the embassies' roofs, as docks: each with the arcade cabinet. */
export const EMBASSY_DOCKS: Dock[] = EMBASSIES.map((e) => {
  const [x, z] = embassyCentre(e);
  return {
    name: `Embassy of Happiness · ${e.design}`,
    at: [x, G + e.h + 0.2, z],
    view: e.view,
    w: 6,
    d: 10,
    h: 5,
    pad: e.pad,
    hues: e.hues,
    word: 'HAPPINESS',
    tilt: -0.1,
    arcade: true,
  };
});

/* ---------- the three designs, as grain meshes ---------- */

const PETAL = 3;
const HEART = 4;
const CROWN = 5;

function lotus(m: Mesh, e: Embassy) {
  const { h } = e;
  const r = Math.min(e.hx, e.hz) * 0.82;
  m.centre = [0, G + h / 2, 0];
  m.cylinder([0, 0, 0], r, G, G + h, glass, edge, 12);
  for (let y = 4; y < h; y += 4) m.ring([0, G + y, 0], r, edge, { w: 0.5 });
  // Three rings of petals opening outward up the tower, each turned half a petal from the last.
  for (let tier = 0; tier < 3; tier++) {
    const y0 = G + h * (0.18 + 0.27 * tier);
    const ph = h * 0.3;
    const n = 10;
    for (let k = 0; k < n; k++) {
      const a0 = ((k + (tier % 2) * 0.5) / n) * TAU;
      const pts: Vec3[] = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        // Out from the wall to a belly and back in to a point, its two edges either side.
        const out = r + (2.2 + tier * 0.6) * Math.sin(u * Math.PI) ** 0.8 + u * 0.8;
        const half = (TAU / n) * 0.42 * Math.sin(u * Math.PI) ** 0.7;
        pts.push([Math.cos(a0 - half) * out, y0 + u * ph, Math.sin(a0 - half) * out]);
      }
      for (let i = 12; i >= 0; i--) {
        const u = i / 12;
        const out = r + (2.2 + tier * 0.6) * Math.sin(u * Math.PI) ** 0.8 + u * 0.8;
        const half = (TAU / n) * 0.42 * Math.sin(u * Math.PI) ** 0.7;
        pts.push([Math.cos(a0 + half) * out, y0 + u * ph, Math.sin(a0 + half) * out]);
      }
      m.poly(pts, false, light, { key: PETAL, w: 0.9 });
    }
  }
  m.disc([0, G + h, 0], r, road, r - 0.6, { w: 0.6 });
}

function gardens(m: Mesh, e: Embassy) {
  const { h } = e;
  m.centre = [0, G + h / 2, 0];
  // Five terraces, widening as they rise, the top one the roof.
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const s = 0.55 + (0.45 * i) / (tiers - 1);
    const hx = e.hx * s;
    const hz = e.hz * s;
    const y0 = G + (i * h) / tiers;
    const th = h / tiers;
    m.box([0, y0, 0], hx, th, hz, glass, edge);
    // Plants along each terrace's rim, and water falling from its edge to the one below.
    for (let k = 0; k < 28; k++) {
      const u = k / 28;
      const per = 4 * (hx + hz);
      const at = u * per;
      let x: number;
      let z: number;
      if (at < 2 * hx) [x, z] = [-hx + at, -hz];
      else if (at < 2 * hx + 2 * hz) [x, z] = [hx, -hz + (at - 2 * hx)];
      else if (at < 4 * hx + 2 * hz) [x, z] = [hx - (at - 2 * hx - 2 * hz), hz];
      else [x, z] = [-hx, hz - (at - 4 * hx - 2 * hz)];
      m.dot([x, y0 + th + 0.5, z], 0.6, plant, { w: 0.5 });
      if (i > 0 && k % 7 === 3) {
        m.line([x * 1.02, y0 + th, z * 1.02], [x * 1.02, y0 - 0.1, z * 1.02], water, {
          anim: Anim.flow,
          key: 3,
          w: 0.6,
        });
      }
    }
  }
}

function prism(m: Mesh, e: Embassy) {
  const { h } = e;
  const r = Math.min(e.hx, e.hz) * 1.05;
  m.centre = [0, G + h / 2, 0];
  const n = 10;
  const corner = (f: number, c: number): Vec3 => {
    const u = f / n;
    const a = (c / 3) * TAU + u * (TAU / 6) + Math.PI / 2;
    return [Math.cos(a) * r, G + u * h, Math.sin(a) * r];
  };
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < 3; c++) {
      const a = corner(f, c);
      const b = corner(f, (c + 1) % 3);
      const a2 = corner(f + 1, c);
      const b2 = corner(f + 1, (c + 1) % 3);
      m.tri(a, b, b2, glass, { w: 0.4 });
      m.tri(a, b2, a2, glass, { w: 0.4 });
      m.line(a, a2, edge, { w: 1.4 });
      if (f % 2 === 0) m.line(a, b, edge, { w: 0.4 });
    }
  }
  // A heart of light in the middle, breathing.
  m.dot([0, G + h * 0.5, 0], r * 0.42, light, { key: HEART, w: 2 });
  // A round deck on the roof, for the room.
  m.disc([0, G + h, 0], 7.4, road, 6.8, { w: 0.6 });
  m.line([0, G + h, 0], [0, G + h + 8, 0], edge, { w: 0.5 });
  m.dot([0, G + h + 8.3, 0], 0.5, light, { key: CROWN, w: 0.3 });
}

const DESIGNS: Record<EmbassyDesign, (m: Mesh, e: Embassy) => void> = {
  Lotus: lotus,
  'Hanging Gardens': gardens,
  Prism: prism,
};
const built = new Map<EmbassyDesign, Built>();
/** Embassy e's building, in its own frame, built once. */
export function embassyMesh(e: Embassy): Built {
  const had = built.get(e.design);
  if (had) return had;
  const m = new Mesh();
  DESIGNS[e.design](m, e);
  const B = m.build();
  built.set(e.design, B);
  return B;
}

/** Its colours: edges in its first hue, glass faint in its second, its lights on a slow beat. */
function embassyPalette(e: Embassy): Palette {
  const [h1, h2] = e.hues;
  const glassRgb = mix(h2, [0.2, 0.25, 0.5], 0.5);
  return (h: Hit, t: number) => {
    switch (h.tone) {
      case Tone.edge:
        return scale(mix(h1, C.white, 0.35), 0.34);
      case Tone.glass:
      case Tone.face:
        return scale(glassRgb, 0.11);
      case Tone.road:
        return scale(mix(C.gold, C.white, 0.3), 0.45);
      case Tone.plant:
        return scale(C.leaf, 0.3);
      case Tone.water:
        return scale(mix(C.turquoise, C.white, 0.3), 0.36);
      case Tone.light:
        if (h.key === HEART) return scale(mix(h1, C.white, 0.4), 0.38 + 0.25 * beat(t, 1 / 2));
        if (h.key === PETAL) {
          const lift = 0.5 + 0.5 * Math.sin(t * 0.35 + (h.pos[1] - G) * 0.08);
          return scale(mix(h1, h2, lift * 0.5), 0.32 + 0.14 * lift);
        }
        return scale(C.white, 0.5 + 0.3 * beat(t, 1 / 2));
      default:
        return scale(h1, 0.3);
    }
  };
}
const palettes = EMBASSIES.map(embassyPalette);
const SHARES = { lines: 0.55, faces: 0.8 };

/* ---------- the sign ---------- */

const SIGN_PX = 0.34;
const SIGN_SITES = 1500;

/**
 * Site s of embassy e's sign (centred at x, z): the words in light standing on the roof's edge
 * toward the avenue, clear of the room; a frame round them; each letter's light breathing slowly
 * from the first hue toward the second and back, a wave running along the words. It reads from
 * both sides (2026-11-13: it read only from the avenue's side, mirrored from behind): seen from
 * behind, the words run the other way.
 */
function signSite(
  e: Embassy,
  x: number,
  z: number,
  s: number,
  t: number,
  o: number[],
  eye?: Vec3,
): boolean {
  const T = textPixels(EMBASSY_SIGN, { face: 'deco', fill: true });
  const npx = T.px.length / 2;
  // Toward the avenue (x = 0 in the tile): the edge on that side; read from there, the words run
  // along -z on the left of the avenue, along +z on its right; from behind, the other way.
  const side = e.li < 0 ? 1 : -1;
  const fx = x + side * (e.hx + 0.6);
  const behind = eye !== undefined && (eye[0] - fx) * side < 0;
  const run = (e.li < 0 ? -1 : 1) * (behind ? -1 : 1);
  const top = G + e.h + 1.2 + T.h * SIGN_PX;
  const [h1, h2] = e.hues;
  const u = (s + 0.5) / SIGN_SITES;
  if (u < 0.86) {
    const i = Math.floor(hash(s, 31) * npx);
    const px = T.px[i * 2] as number;
    const py = T.px[i * 2 + 1] as number;
    const jx = (hash(s, 32) - 0.5) * SIGN_PX * 0.7;
    const jy = (hash(s, 33) - 0.5) * SIGN_PX * 0.7;
    const along = (px + 0.5 - T.w / 2) * SIGN_PX + jx;
    o[0] = fx;
    o[1] = top - (py + 0.5) * SIGN_PX + jy;
    o[2] = z + run * along;
    const wave = 0.5 + 0.5 * Math.sin(t * 0.5 - px * 0.06);
    [o[3], o[4], o[5]] = scale(mix(h1, h2, 0.6 * wave), 0.55 + 0.25 * wave);
    return true;
  }
  // The frame: a rounded line round the words, white.
  const f = (u - 0.86) / 0.14;
  const W = (T.w * SIGN_PX) / 2 + 0.8;
  const H = (T.h * SIGN_PX) / 2 + 0.6;
  const per = 4 * (W + H);
  const at = f * per;
  let a: number;
  let b: number;
  if (at < 2 * W) [a, b] = [-W + at, -H];
  else if (at < 2 * W + 2 * H) [a, b] = [W, -H + (at - 2 * W)];
  else if (at < 4 * W + 2 * H) [a, b] = [W - (at - 2 * W - 2 * H), H];
  else [a, b] = [-W, H - (at - 4 * W - 2 * H)];
  o[0] = fx;
  o[1] = top - (T.h * SIGN_PX) / 2 + b;
  o[2] = z + run * a;
  [o[3], o[4], o[5]] = scale(C.white, 0.28 + 0.12 * beat(t, 1 / 2));
  return true;
}

/* ---------- the items, for the Ship's renderer ---------- */

/** How near a building is drawn; its sign is seen from much further. */
const BUILDING_R = 220;

/** Every embassy within sight of the eye (the copy of it nearest): its building and its sign. */
export function embassyItems(eye: Vec3, t: number, R: number, out: Item[]) {
  EMBASSIES.forEach((e, i) => {
    const [lx, lz] = embassyCentre(e);
    const x = nearest(lx, eye[0], TILE_X);
    const z = nearest(lz, eye[2], TILE_Z);
    const lo: Vec3 = [x - e.hx - 3, G, z - e.hz - 3];
    const hi: Vec3 = [x + e.hx + 3, G + e.h + 9, z + e.hz + 3];
    const d = boxDist(eye, lo, hi);
    if (d > R) return;
    const top = G + e.h;
    if (d < BUILDING_R) {
      const P: Placed = {
        B: embassyMesh(e),
        at: [x, G, z],
        sc: 1,
        shares: SHARES,
        palette: palettes[i] as Palette,
      };
      out.push({
        d,
        gid: mixId(i, 7711),
        count: 2600,
        weight: 1.4,
        probe: [
          [x, top, z],
          [x + e.hx, G + e.h * 0.5, z + e.hz],
          [x - e.hx, G + e.h * 0.5, z - e.hz],
          [x, G + 6, z],
        ],
        site: (s, o) => meshSite(P, s, t, eye, 1, o),
      });
    }
    const side = e.li < 0 ? 1 : -1;
    const fx = x + side * (e.hx + 0.6);
    out.push({
      d,
      gid: mixId(i, 7712),
      count: SIGN_SITES,
      weight: 2.4,
      probe: [
        [fx + side, top + 3.5, z],
        [fx + side, top + 3.5, z + 6],
        [fx + side, top + 3.5, z - 6],
      ],
      site: (s, o) => signSite(e, x, z, s, t, o, eye),
    });
  });
}
