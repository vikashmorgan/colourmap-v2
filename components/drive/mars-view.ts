/**
 * Drive, Mars (docs/specs/drive-game.md, world 8): what stands on the dunes and hangs in the sky.
 * The rust stations (dome clusters, Nova Core lattices, factories with tubes and chimneys, half-
 * buried derelicts), the pipelines on trestles between them, and five huge rusty craft with turning
 * rings high in the sky. Placement is pure (lib/art/mars.ts); here only the meshes.
 *
 * Cheap: each station and each pipeline is one merged mesh with vertex colours; each craft is one
 * hull mesh and one mesh per ring; lights are a few dim warm sprites that breathe slowly.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {
  CRAFT,
  CRAFT_FOLLOW,
  type Craft,
  DECKS,
  KICKERS,
  marsBase,
  marsHeight,
  PIPE_H,
  PIPES,
  type Pipe,
  SITES,
  type Site,
} from '@/lib/art/mars';
import { ARCHES, type Arch, LIGHTHOUSE } from '@/lib/art/mars-map';
import {
  DECK,
  type Deck,
  deckHeight,
  KICKER,
  type Kicker,
  kickerHeight,
} from '@/lib/art/mars-ramps';
import { START } from '@/lib/art/salt-flat-game';
import { at, hash, M, part, place, RUST, strut } from './mars-parts';
import { buildRocksView, type RocksView } from './mars-rocks-view';
import { buildWorksView, isWork, workParts } from './mars-works-view';
import { disposeGroup } from './track-view';
import { buildFireCone, glowSprite, glowTexture } from './vehicles';

export interface MarsView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number): void;
  /** An arch you just went through throws its fire. */
  flare(arch: Arch, t: number): void;
  dispose(): void;
}

/* ── The stations ── */

function domes(s: Site, parts: THREE.BufferGeometry[], lights: THREE.Vector3[]) {
  const R = 13 + 5 * s.seed;
  parts.push(part(new THREE.IcosahedronGeometry(R, 2), at(0, -1, 0), RUST, s.seed * 99));
  // The struts' ring at its foot.
  parts.push(
    part(new THREE.TorusGeometry(R, 0.7, 6, 32), place(0, 0.2, 0, Math.PI / 2), [0x2a1c18], 1),
  );
  lights.push(new THREE.Vector3(0, R + 1.5, 0));
  // Bubbles round it by the golden angle, each joined back by a tube.
  const n = 3 + Math.floor(s.seed * 3);
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996;
    const r = R * (0.62 / 1.618 ** (i * 0.5));
    const d = R + r * 0.9 + 4;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    parts.push(part(new THREE.IcosahedronGeometry(r, 1), at(x, -0.5, z), RUST, i * 7 + s.seed));
    const tube = new THREE.CylinderGeometry(1.4, 1.4, d - R - r * 0.6, 8);
    parts.push(
      part(
        tube,
        place(
          Math.cos(a) * (R + d - r) * 0.5,
          1.6,
          Math.sin(a) * (R + d - r) * 0.5,
          0,
          -a,
          Math.PI / 2,
        ),
        [0x3a2620, 0x5a3424],
        i,
      ),
    );
    if (i % 2 === 0) lights.push(new THREE.Vector3(x, r + 0.8, z));
  }
}

function factory(s: Site, parts: THREE.BufferGeometry[], lights: THREE.Vector3[]) {
  const L = 44;
  const W = 22;
  const H = 12;
  parts.push(part(new THREE.BoxGeometry(L, H, W), at(0, H / 2 - 1, 0), RUST, s.seed * 31));
  // A sawtooth roof.
  for (let i = 0; i < 5; i++) {
    const roof = new THREE.CylinderGeometry(0.01, 4.5, W, 3);
    parts.push(
      part(
        roof,
        place(-L / 2 + 4.4 + i * 8.8, H + 1.2, 0, Math.PI / 2, 0, 0),
        [0x5a3424, 0x8a3a1c],
        i,
      ),
    );
  }
  // Chimneys, banded, a dim ember at each mouth.
  const n = 2 + Math.floor(s.seed * 2);
  for (let i = 0; i < n; i++) {
    const h = 30 + 16 * hash(i, s.seed);
    const x = -L / 2 + 6 + i * 9;
    parts.push(
      part(new THREE.CylinderGeometry(2.2, 3.2, h, 10), at(x, h / 2, -W / 2 - 4), RUST, i),
    );
    parts.push(
      part(
        new THREE.TorusGeometry(2.8, 0.5, 5, 14),
        place(x, h * 0.7, -W / 2 - 4, Math.PI / 2),
        [0x2a1c18],
        0,
      ),
    );
    lights.push(new THREE.Vector3(x, h + 1.5, -W / 2 - 4));
  }
  // Tubes along the side, bending up into a tank.
  for (let k = 0; k < 3; k++) {
    parts.push(
      part(
        new THREE.CylinderGeometry(1, 1, L + 10, 8),
        place(5, 2.5 + k * 2.4, W / 2 + 2.5, 0, 0, Math.PI / 2),
        [0x3a2620, 0xa65a2a],
        k,
      ),
    );
  }
  parts.push(part(new THREE.SphereGeometry(8, 12, 8), at(L / 2 + 12, 7, W / 2 - 2), RUST, 5));
  parts.push(
    part(new THREE.CylinderGeometry(8, 8, 7, 12), at(L / 2 + 12, 3.5, W / 2 - 2), RUST, 6),
  );
  lights.push(new THREE.Vector3(-L / 2 - 0.5, 6, 4), new THREE.Vector3(L / 2 + 0.5, 6, -4));
}

function nova(s: Site, parts: THREE.BufferGeometry[], cores: THREE.Vector3[]) {
  // A tall lattice octahedron round a core.
  const H = 46 + 10 * s.seed;
  const R = 11;
  const top = new THREE.Vector3(0, H, 0);
  const foot = new THREE.Vector3(0, 0, 0);
  const mid: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mid.push(new THREE.Vector3(Math.cos(a) * R, H * 0.45, Math.sin(a) * R));
  }
  const iron = [0x2a1c18, 0x3a2620, 0x8a3a1c];
  mid.forEach((p, i) => {
    parts.push(strut(foot, p, 0.7, iron, i));
    parts.push(strut(top, p, 0.7, iron, i + 9));
    parts.push(strut(p, mid[(i + 1) % 6], 0.6, iron, i + 17));
    // Legs out to the ground.
    const leg = new THREE.Vector3(p.x * 1.9, -1, p.z * 1.9);
    parts.push(strut(p, leg, 0.8, iron, i + 23));
  });
  parts.push(
    part(
      new THREE.TorusGeometry(R * 1.9, 0.9, 6, 36),
      place(0, 0.3, 0, Math.PI / 2),
      [0x5a3424],
      2,
    ),
  );
  cores.push(new THREE.Vector3(0, H * 0.45, 0));
}

function ruin(s: Site, parts: THREE.BufferGeometry[], lights: THREE.Vector3[]) {
  const dead = [0x3a2620, 0x2a1c18, 0x5a3424, 0x8a3a1c, 0x6a4a38];
  // A long hull sunk at a slant into the regolith.
  parts.push(
    part(
      new THREE.CylinderGeometry(8, 9, 48, 12, 1, true),
      place(0, 2, 0, 0.25, 0, Math.PI / 2 - 0.3),
      dead,
      3,
    ),
  );
  parts.push(
    part(new THREE.SphereGeometry(8, 10, 8), place(-20, 9, 0, 0, 0, 0, 1, 0.9, 1), dead, 4),
  );
  // A broken ring standing half out of the ground.
  parts.push(
    part(
      new THREE.TorusGeometry(18, 1.6, 6, 30, Math.PI * 1.1),
      place(8, -4, 6, 0.2, 0.6, 0.15),
      dead,
      5,
    ),
  );
  // Fallen panels.
  for (let i = 0; i < 6; i++) {
    const a = hash(i, s.seed) * Math.PI * 2;
    const d = 14 + 10 * hash(i + 3, s.seed);
    parts.push(
      part(
        new THREE.BoxGeometry(7, 0.5, 4),
        place(Math.cos(a) * d, 0.2, Math.sin(a) * d, 0.3 * hash(i, 2), a, 0.25 * hash(i, 4)),
        dead,
        i,
      ),
    );
  }
  if (s.seed > 0.5) lights.push(new THREE.Vector3(-20, 17, 0));
}

/** An atomic plant (2026-11-23: "usines atomiques"): two hyperboloid cooling towers with a faint
 * green glow at their mouths, a reactor dome, pipe runs between them. Fills in where the dot lights
 * go (the City's star-light dots, on the towers' rims and the dome's ribs) and the towers' mouths. */
function atomic(parts: THREE.BufferGeometry[], dots: THREE.Vector3[], mouths: THREE.Vector3[]) {
  const concrete = [0x7a5a48, 0x8a6a52, 0x6a4a3a, 0x9a7a5e, 0x5a3a2c];
  const H = 50;
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    // Wide at the foot, a waist two thirds up, flaring a little at the mouth.
    const r = 9.5 + 8 * (k - 0.68) ** 2 * (k < 0.68 ? 1.6 : 2.6);
    profile.push(new THREE.Vector2(r, k * H));
  }
  for (const [x, z] of [
    [-22, 0],
    [22, -6],
  ]) {
    parts.push(part(new THREE.LatheGeometry(profile, 24), at(x, -1, z), concrete, x));
    mouths.push(new THREE.Vector3(x, H - 0.5, z));
    for (const [k, n] of [
      [0, 18],
      [8, 12],
      [12, 16],
    ] as const) {
      const r = profile[k].x + 0.4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        dots.push(new THREE.Vector3(x + Math.cos(a) * r, profile[k].y - 0.6, z + Math.sin(a) * r));
      }
    }
  }
  // The reactor: a dome on a drum, ribs of dots up its sides.
  parts.push(part(new THREE.CylinderGeometry(13, 13, 8, 20), at(0, 3, 18), concrete, 3));
  parts.push(
    part(
      new THREE.SphereGeometry(13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      at(0, 7, 18),
      concrete,
      4,
    ),
  );
  for (let m = 0; m < 8; m++) {
    const a = (m / 8) * Math.PI * 2;
    for (let i = 1; i < 6; i++) {
      const e = (i / 6) * (Math.PI / 2);
      dots.push(
        new THREE.Vector3(
          Math.cos(a) * Math.cos(e) * 13.4,
          7 + Math.sin(e) * 13.4,
          18 + Math.sin(a) * Math.cos(e) * 13.4,
        ),
      );
    }
  }
  // Pipe runs from the dome to each tower.
  for (const x of [-22, 22]) {
    for (const y of [2.5, 4.5]) {
      parts.push(
        strut(
          new THREE.Vector3(0, y, 18),
          new THREE.Vector3(x * 0.62, y, x > 0 ? -3 : 2),
          1.4,
          [0x5a3424, 0x8a3a1c],
          x + y,
        ),
      );
    }
  }
}

/** The lighthouse on the crater's rim: a tapering tower in rust and cream bands, a gallery, the
 * lantern room; its beam is added by the caller (it turns). */
function lighthouse(parts: THREE.BufferGeometry[]) {
  const H = LIGHTHOUSE.height;
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const y0 = (i / bands) * H;
    const y1 = ((i + 1) / bands) * H;
    const r0 = 6.5 - (i / bands) * 3;
    const r1 = 6.5 - ((i + 1) / bands) * 3;
    parts.push(
      part(
        new THREE.CylinderGeometry(r1, r0, y1 - y0, 16),
        at(0, (y0 + y1) / 2, 0),
        [i % 2 ? 0xe6d6b4 : 0x9a3a1c],
        i,
      ),
    );
  }
  parts.push(part(new THREE.CylinderGeometry(5.2, 5.2, 0.8, 16), at(0, H + 0.4, 0), [0x2a1c18], 1));
  parts.push(part(new THREE.CylinderGeometry(2.6, 2.6, 5, 12), at(0, H + 3.3, 0), [0x3a2620], 2));
  parts.push(part(new THREE.ConeGeometry(3.2, 3, 12), at(0, H + 7.3, 0), [0x8a3a1c], 3));
}

/** An arch: a half circle of rust (or iron, for the ones that bring Mars back) you drive under,
 * its feet on the ground, standing across the way through it. */
function archGeo(a: Arch): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const real = a.kind === 'real';
  const rust = real ? [0x2a2420, 0x3a302a, 0x1e1a18] : [0x8a3a1c, 0xa65a2a, 0x5a3424, 0x6a3020];
  parts.push(part(new THREE.TorusGeometry(a.r, real ? 0.7 : 1.1, 8, 28, Math.PI), M(), rust, a.x));
  // Ribs along it, and feet.
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * Math.PI;
    parts.push(
      part(
        new THREE.BoxGeometry(2.6, 0.5, 2.6),
        place(Math.cos(t) * a.r, Math.sin(t) * a.r, 0, 0, 0, t),
        rust,
        i,
      ),
    );
  }
  for (const s of [-1, 1])
    parts.push(part(new THREE.BoxGeometry(3.4, 1.4, 3.4), at(s * a.r, 0.2, 0), rust, s));
  const geo = mergeGeometries(parts) as THREE.BufferGeometry;
  for (const g of parts) g.dispose();
  return geo;
}

/**
 * A ramp or deck as a mesh: a sheet over its footprint (local u along, v across, from its origin
 * on heading h), each vertex at the ground plus the feature's height, rust with darker iron bands
 * across it every few metres, and a dark skirt down its sides and back so it reads as solid.
 * Built round (ox, oy).
 */
function rampSheet(
  ax: number,
  ay: number,
  h: number,
  u0: number,
  u1: number,
  half: number,
  height: (x: number, y: number) => number,
  ox: number,
  oy: number,
  rock = false,
  gallery = false,
): THREE.BufferGeometry {
  const c = Math.cos(h);
  const s = Math.sin(h);
  const nu = Math.max(2, Math.ceil((u1 - u0) / 2));
  const vs = [-half, -half * 0.6, 0, half * 0.6, half];
  const pos: number[] = [];
  const col: number[] = [];
  // Rust sheets with iron bands, or (the slabs) rock with pale strata.
  // The factory city's galleries and roof ramps: dark iron with pale hazard bands.
  const rust = new THREE.Color(gallery ? 0x3a2c26 : rock ? 0x7a3a22 : 0x9a4a22);
  const iron = new THREE.Color(gallery ? 0xd8a860 : rock ? 0xb07a4a : 0x3a2620);
  const skirt = new THREE.Color(gallery ? 0x1e1612 : rock ? 0x4a2416 : 0x24160f);
  const at = (u: number, v: number, drop = 0): [number, number, number] => {
    const x = ax + c * u - s * v;
    const y = ay + s * u + c * v;
    return [x - ox, marsBase(x, y) + height(x, y) + 0.06 - drop, -(y - oy)];
  };
  const tri = (a: number[], b: number[], d: number[], k: THREE.Color) => {
    pos.push(...a, ...b, ...d);
    for (let i = 0; i < 3; i++) col.push(k.r, k.g, k.b);
  };
  for (let i = 0; i < nu; i++) {
    const ua = u0 + ((u1 - u0) * i) / nu;
    const ub = u0 + ((u1 - u0) * (i + 1)) / nu;
    const k = Math.floor(ua / 4) % 3 === 0 ? iron : rust;
    for (let j = 0; j < vs.length - 1; j++) {
      const p00 = at(ua, vs[j]);
      const p01 = at(ua, vs[j + 1]);
      const p10 = at(ub, vs[j]);
      const p11 = at(ub, vs[j + 1]);
      tri(p00, p10, p11, k);
      tri(p00, p11, p01, k);
    }
    // The skirts, from the edge down below the ground.
    for (const v of [-half, half]) {
      const a = at(ua, v);
      const b = at(ub, v);
      const a2 = at(ua, v, 0.2 + height(a[0] + ox, -a[2] + oy));
      const b2 = at(ub, v, 0.2 + height(b[0] + ox, -b[2] + oy));
      tri(a, a2, b2, skirt);
      tri(a, b2, b, skirt);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function kickerGeo(k: Kicker, ox: number, oy: number): THREE.BufferGeometry {
  return rampSheet(
    k.x,
    k.y,
    k.h,
    0,
    k.len + KICKER.back,
    k.width / 2,
    (x, y) => kickerHeight(k, x, y),
    ox,
    oy,
    k.rock,
    k.gallery,
  );
}

function deckGeo(d: Deck, ox: number, oy: number): THREE.BufferGeometry {
  const L = Math.hypot(d.bx - d.ax, d.by - d.ay);
  const h = Math.atan2(d.by - d.ay, d.bx - d.ax);
  return rampSheet(
    d.ax,
    d.ay,
    h,
    0,
    L,
    d.width / 2 + DECK.berm,
    (x, y) => deckHeight(d, x, y),
    ox,
    oy,
  );
}

/* ── The pipelines ── */

function pipeline(p: Pipe, ox: number, oy: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const len = Math.hypot(p.bx - p.ax, p.by - p.ay);
  const n = Math.max(2, Math.ceil(len / 30));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const x = p.ax + ((p.bx - p.ax) * i) / n;
    const y = p.ay + ((p.by - p.ay) * i) / n;
    pts.push(new THREE.Vector3(x - ox, marsBase(x, y) + PIPE_H, -(y - oy)));
  }
  const ux = -(p.by - p.ay) / len;
  const uz = -(p.bx - p.ax) / len;
  for (const off of [-1.3, 1.3]) {
    for (let i = 0; i < n; i++) {
      const a = pts[i].clone().add(new THREE.Vector3(ux * off, 0, uz * off));
      const b = pts[i + 1].clone().add(new THREE.Vector3(ux * off, 0, uz * off));
      const d = new THREE.Vector3().subVectors(b, a);
      const g = new THREE.CylinderGeometry(0.9, 0.9, d.length() + 0.2, 8, 1, true);
      const m = M().compose(
        new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()),
        new THREE.Vector3(1, 1, 1),
      );
      parts.push(part(g, m, [0x8a3a1c, 0xa65a2a, 0x5a3424], i + off * 10));
    }
  }
  // Trestles every other sample: two legs and a beam.
  for (let i = 0; i <= n; i += 2) {
    const c = pts[i];
    for (const s of [-1, 1]) {
      const top = c.clone().add(new THREE.Vector3(ux * s * 2.6, 0, uz * s * 2.6));
      const foot = top.clone();
      foot.y -= PIPE_H + 1.5;
      parts.push(strut(top, foot, 0.5, [0x2a1c18, 0x3a2620], i + s));
    }
    parts.push(
      strut(
        c.clone().add(new THREE.Vector3(ux * 2.8, -1, uz * 2.8)),
        c.clone().add(new THREE.Vector3(-ux * 2.8, -1, -uz * 2.8)),
        0.6,
        [0x2a1c18],
        i,
      ),
    );
  }
  const merged = mergeGeometries(parts) as THREE.BufferGeometry;
  for (const g of parts) g.dispose();
  return merged;
}

/* ── The craft in the sky ── */

const SKY_RUST = [0x6a3422, 0x7a4a2c, 0x8a5a36, 0x3a2824, 0x4a3026, 0x9a6a44];

function craftHull(c: Craft): { geo: THREE.BufferGeometry; lights: THREE.Vector3[] } {
  const S = c.size;
  const parts: THREE.BufferGeometry[] = [];
  const lights: THREE.Vector3[] = [];
  const sd = c.seed * 100;
  if (c.kind === 'station' || c.kind === 'carrier') {
    const long = c.kind === 'carrier';
    // The spine: a long hull of drums, with a truss running its length.
    const segs = long ? 3 : 5;
    for (let i = 0; i < segs; i++) {
      const x = (i / (segs - 1) - 0.5) * S * 0.8;
      const r = S * (long ? 0.09 : 0.06) * (1 + 0.4 * hash(i, sd));
      const g = long
        ? new THREE.BoxGeometry(S * 0.26, r * 1.4, r * 2.2)
        : new THREE.CylinderGeometry(r, r, S * 0.16, 12);
      parts.push(part(g, place(x, 0, 0, 0, 0, long ? 0 : Math.PI / 2), SKY_RUST, i + sd));
      if (i % 2 === 0) lights.push(new THREE.Vector3(x, r * 1.05, 0));
    }
    const a = new THREE.Vector3(-S * 0.5, 0, 0);
    const b = new THREE.Vector3(S * 0.5, 0, 0);
    for (const [dy, dz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const o = new THREE.Vector3(0, dy * S * 0.025, dz * S * 0.025);
      parts.push(strut(a.clone().add(o), b.clone().add(o), S * 0.006, [0x3a2824], dy + dz));
    }
    // Panels sticking out, some missing.
    for (let i = 0; i < 6; i++) {
      if (hash(i, sd + 3) < 0.3) continue;
      const x = (i / 5 - 0.5) * S * 0.7;
      const side = i % 2 ? 1 : -1;
      parts.push(
        part(
          new THREE.BoxGeometry(S * 0.08, S * 0.004, S * 0.22),
          place(x, 0, side * S * 0.16, 0.2 * hash(i, sd), 0, 0),
          [0x4a3026, 0x7a4a2c, 0x2a1c18],
          i,
        ),
      );
    }
    if (long) {
      parts.push(
        part(
          new THREE.ConeGeometry(S * 0.12, S * 0.22, 4),
          place(S * 0.5, 0, 0, 0, 0, -Math.PI / 2),
          SKY_RUST,
          7,
        ),
      );
    }
  } else if (c.kind === 'gyro') {
    parts.push(part(new THREE.IcosahedronGeometry(S * 0.22, 1), M(), SKY_RUST, sd));
    for (const s of [-1, 1])
      parts.push(
        part(
          new THREE.CylinderGeometry(S * 0.04, S * 0.06, S * 0.5, 8),
          at(0, s * S * 0.3, 0),
          SKY_RUST,
          s,
        ),
      );
    lights.push(new THREE.Vector3(0, S * 0.23, 0), new THREE.Vector3(0, -S * 0.56, 0));
  } else {
    // The dish: a box body, a great dish on a mast.
    parts.push(part(new THREE.BoxGeometry(S * 0.3, S * 0.14, S * 0.18), M(), SKY_RUST, sd));
    parts.push(
      part(
        new THREE.SphereGeometry(S * 0.3, 16, 6, 0, Math.PI * 2, 0, 0.9),
        place(S * 0.32, 0, 0, 0, 0, -Math.PI / 2),
        [0x7a4a2c, 0x8a5a36, 0x5a3a2a],
        2,
      ),
    );
    parts.push(
      strut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(S * 0.4, 0, 0), S * 0.015, [0x3a2824], 3),
    );
    lights.push(new THREE.Vector3(-S * 0.15, S * 0.08, 0));
  }
  const geo = mergeGeometries(parts) as THREE.BufferGeometry;
  for (const g of parts) g.dispose();
  return { geo, lights };
}

function craftRing(c: Craft, r: number, k: number): THREE.BufferGeometry {
  const R = c.size * r;
  const parts: THREE.BufferGeometry[] = [
    part(new THREE.TorusGeometry(R, c.size * 0.02, 6, 64), M(), [0x5a3424, 0x7a4a2c, 0x3a2824], k),
  ];
  // Modules along it, a few gone.
  const n = 12;
  for (let i = 0; i < n; i++) {
    if (hash(i, c.seed * 10 + k) < 0.25) continue;
    const a = (i / n) * Math.PI * 2;
    parts.push(
      part(
        new THREE.BoxGeometry(c.size * 0.05, c.size * 0.03, c.size * 0.03),
        place(Math.cos(a) * R, Math.sin(a) * R, 0, 0, 0, a),
        SKY_RUST,
        i + k,
      ),
    );
  }
  const geo = mergeGeometries(parts) as THREE.BufferGeometry;
  for (const g of parts) g.dispose();
  return geo;
}

export function buildMarsView(): MarsView {
  const group = new THREE.Group();
  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  // The sky craft are far in the haze: dimmer, warmer, a little of the sky's glow in them.
  const skyMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    color: 0x9a7a6a,
    emissive: new THREE.Color(0x3a2018),
    fog: false,
  });
  const breathing: { s: THREE.Sprite; base: number; phase: number; period: number }[] = [];
  const light = (parent: THREE.Object3D, p: THREE.Vector3, size: number, i: number, o = 0.55) => {
    const s = glowSprite(i % 3 === 0 ? 0xffb060 : 0xff8a40, size, o);
    (s.material as THREE.SpriteMaterial).fog = false;
    s.position.copy(p);
    parent.add(s);
    breathing.push({ s, base: o, phase: hash(i, size), period: 3 + 3 * hash(size, i) });
  };

  const steam: { puff: THREE.Sprite; from: THREE.Vector3; phase: number }[] = [];
  // The rock fields round the canyons and the superboost portals (mars-rocks-view.ts).
  const rocks: RocksView = buildRocksView(groundMat);
  group.add(rocks.group);
  // The factory city's towns and barrel (mars-works-view.ts).
  const works = buildWorksView(groundMat);
  group.add(works.group);
  const beams: THREE.Group[] = [];

  // The stations.
  const sites = SITES.map((s, si) => {
    const parts: THREE.BufferGeometry[] = [];
    const lights: THREE.Vector3[] = [];
    const cores: THREE.Vector3[] = [];
    const dots: THREE.Vector3[] = [];
    const mouths: THREE.Vector3[] = [];
    const wide: { p: THREE.Vector3; r: number }[] = [];
    if (isWork(s.kind)) workParts(s, parts, lights, dots, wide);
    else if (s.kind === 'domes') domes(s, parts, lights);
    else if (s.kind === 'factory') factory(s, parts, lights);
    else if (s.kind === 'nova') nova(s, parts, cores);
    else if (s.kind === 'atomic') atomic(parts, dots, mouths);
    else if (s.kind === 'lighthouse') lighthouse(parts);
    else ruin(s, parts, lights);
    const obj = new THREE.Group();
    const geo = mergeGeometries(parts) as THREE.BufferGeometry;
    for (const g of parts) g.dispose();
    obj.add(new THREE.Mesh(geo, groundMat));
    lights.forEach((p, i) => light(obj, p, 3.2, si * 13 + i));
    for (const c of cores) {
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(4.5, 1),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.6, 0.18), toneMapped: false }),
      );
      core.position.copy(c);
      obj.add(core);
      light(obj, c, 26, si * 13 + 7, 0.5);
    }
    if (dots.length) {
      // The City's star-light dots: steady, a pale green on the plant.
      const pts = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(dots),
        new THREE.PointsMaterial({
          map: glowTexture(),
          color: new THREE.Color(0.9, 1.4, 0.45),
          size: 2.4,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      obj.add(pts);
    }
    // The towers' glowing mouths breathe steam (a chimney's mouth, no ring, steam only).
    const allMouths = [...mouths.map((p) => ({ p, r: 10.2 })), ...wide];
    for (const [mi, { p: m, r: mr }] of allMouths.entries()) {
      if (mr > 0) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(mr, 0.5, 6, 40),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.2, 0.3), toneMapped: false }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(m);
        obj.add(ring);
        light(obj, m.clone().setY(m.y + 2), mr * 3, si * 13 + mi, 0.3);
      }
      for (let k = 0; k < 5; k++) {
        const puff = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTexture(),
            color: 0xd8c8b0,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        obj.add(puff);
        steam.push({ puff, from: m.clone(), phase: (k / 5 + mi * 0.37) % 1 });
      }
    }
    if (s.kind === 'lighthouse') {
      const lamp = glowSprite(0xffd8a0, 16, 0.85);
      lamp.position.set(0, LIGHTHOUSE.height + 3.3, 0);
      obj.add(lamp);
      const beam = new THREE.Group();
      beam.position.set(0, LIGHTHOUSE.height + 3.3, 0);
      for (const side of [1, -1]) {
        const geo = new THREE.ConeGeometry(34, 320, 24, 1, true);
        // The apex at the lantern, the cone lying out along x, dipping a little.
        geo.translate(0, -160, 0);
        const cone = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(1.0, 0.82, 0.55),
            transparent: true,
            opacity: 0.07,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
        );
        cone.rotation.z = side * (Math.PI / 2 + 0.04);
        beam.add(cone);
      }
      obj.add(beam);
      beams.push(beam);
    }
    obj.rotation.y = s.rot;
    // Sunk a little, so a slope never shows daylight under it; the derelicts deeper.
    const sink = s.kind === 'ruin' ? 3 : s.kind === 'lighthouse' ? 1.5 : 0.8;
    const base = marsHeight(s.x, s.y) - sink;
    group.add(obj);
    return { obj, s, base };
  });

  // The kickers and the decks on the pipelines, each built round its own middle.
  const ramps = [
    ...KICKERS.map((k) => ({
      geo: (ox: number, oy: number) => kickerGeo(k, ox, oy),
      mx: k.x,
      my: k.y,
    })),
    ...DECKS.map((d) => ({
      geo: (ox: number, oy: number) => deckGeo(d, ox, oy),
      mx: (d.ax + d.bx) / 2,
      my: (d.ay + d.by) / 2,
    })),
  ].map((r) => {
    const mesh = new THREE.Mesh(r.geo(r.mx, r.my), groundMat);
    group.add(mesh);
    return { mesh, mx: r.mx, my: r.my };
  });

  // The pipelines, each built round its own middle.
  const pipes = PIPES.map((p) => {
    const mx = (p.ax + p.bx) / 2;
    const my = (p.ay + p.by) / 2;
    const mesh = new THREE.Mesh(pipeline(p, mx, my), groundMat);
    group.add(mesh);
    return { mesh, mx, my };
  });

  // The arches, with fire at their feet and crown (none on the iron ones).
  const fireStops: [[number, number, number], [number, number, number], [number, number, number]] =
    [
      [1, 0.85, 0.5],
      [1, 0.42, 0.12],
      [0.55, 0.12, 0.04],
    ];
  const arches = ARCHES.map((a) => {
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(archGeo(a), groundMat));
    const fires: THREE.ShaderMaterial[] = [];
    if (a.kind === 'real') {
      // The iron arches: a steady line of pale warm light along the inside.
      obj.add(
        new THREE.Mesh(
          new THREE.TorusGeometry(a.r - 0.9, 0.18, 6, 40, Math.PI),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(1.3, 0.75, 0.55),
            toneMapped: false,
          }),
        ),
      );
    } else {
      const spots: [number, number][] =
        a.kind === 'tunnel'
          ? [
              [-a.r, 0.8],
              [a.r, 0.8],
              [-a.r * 0.7, a.r * 0.72],
              [a.r * 0.7, a.r * 0.72],
            ]
          : [
              [-a.r, 0.8],
              [a.r, 0.8],
              [0, a.r + 0.6],
            ];
      for (const [x, y] of spots) {
        const f = buildFireCone(fireStops, 1.1, a.kind === 'tunnel' ? 7 : 5, 0.12);
        f.position.set(x, y, 0);
        obj.add(f);
        fires.push(f.userData.fire as THREE.ShaderMaterial);
      }
    }
    // Across the way through it: its plane square to the heading.
    obj.rotation.y = a.h + Math.PI / 2;
    group.add(obj);
    return { obj, a, fires, base: marsHeight(a.x, a.y) - 0.3, flareAt: -99 };
  });

  // The craft.
  const craft = CRAFT.map((c, ci) => {
    const obj = new THREE.Group();
    const hull = craftHull(c);
    obj.add(new THREE.Mesh(hull.geo, skyMat));
    hull.lights.forEach((p, i) => light(obj, p, c.size * 0.04, ci * 31 + i, 0.45));
    const rings = c.rings.map((r, k) => {
      const tilt = new THREE.Group();
      // Round the hull's spine (its x) on the long craft; free on the others.
      if (c.kind === 'station' || c.kind === 'carrier')
        tilt.rotation.set(0, Math.PI / 2, r.tilt * 0.3);
      else tilt.rotation.set(r.tilt, 0, k * 0.7);
      const ring = new THREE.Mesh(craftRing(c, r.r, k), skyMat);
      tilt.add(ring);
      obj.add(tilt);
      return { ring, spin: r.spin };
    });
    obj.rotation.set(0, 0, c.pitch);
    group.add(obj);
    const ax = START.x + Math.cos(c.az) * c.dist;
    const ay = START.y + Math.sin(c.az) * c.dist;
    return { obj, c, rings, ax, ay };
  });

  return {
    group,
    update(ox, oy, t) {
      for (const { obj, s, base } of sites) {
        const far = Math.hypot(s.x - ox, s.y - oy);
        obj.visible = far < 5200;
        obj.position.set(s.x - ox, base, -(s.y - oy));
      }
      for (const ar of arches) {
        ar.obj.visible = Math.hypot(ar.a.x - ox, ar.a.y - oy) < 3000;
        if (!ar.obj.visible) continue;
        ar.obj.position.set(ar.a.x - ox, ar.base, -(ar.a.y - oy));
        // The fire idles low and rises to a roar after you pass, easing down over a second.
        const k = Math.exp(-Math.max(0, t - ar.flareAt) / 0.7);
        for (const f of ar.fires) {
          f.uniforms.uTime.value = t;
          f.uniforms.uPower.value = 0.3 + 0.7 * k;
        }
      }
      // The lighthouse's beam sweeps round once in 18 s.
      for (const b of beams) b.rotation.y = t * 0.35;
      for (const st of steam) {
        // Steam rises slowly from the towers' mouths, swelling and thinning (a 14 s cycle).
        const k = (t / 14 + st.phase) % 1;
        st.puff.position.set(st.from.x + k * 9, st.from.y + 4 + k * 46, st.from.z - k * 4);
        st.puff.scale.setScalar(14 + k * 34);
        (st.puff.material as THREE.SpriteMaterial).opacity = 0.22 * Math.sin(k * Math.PI);
      }
      rocks.update(ox, oy, t);
      works.update(ox, oy, t);
      for (const r of ramps) {
        r.mesh.visible = Math.hypot(r.mx - ox, r.my - oy) < 4000;
        r.mesh.position.set(r.mx - ox, 0, -(r.my - oy));
      }
      for (const p of pipes) {
        p.mesh.visible = Math.hypot(p.mx - ox, p.my - oy) < 5200;
        p.mesh.position.set(p.mx - ox, 0, -(p.my - oy));
      }
      for (const { obj, c, rings, ax, ay } of craft) {
        // They keep their place in the sky: they follow you most of the way.
        const x = ax + (ox - START.x) * CRAFT_FOLLOW;
        const y = ay + (oy - START.y) * CRAFT_FOLLOW;
        obj.position.set(x - ox, c.alt, -(y - oy));
        // Turned so the rings are seen at a slant, never edge on.
        obj.rotation.y = c.az + Math.PI / 2 - 0.5 + t * c.yaw;
        for (const r of rings) r.ring.rotation.z = t * r.spin;
      }
      // Lights breathe slowly (3 to 6 s), never blink.
      for (const b of breathing) {
        const k = 0.75 + 0.25 * Math.sin((t / b.period + b.phase) * Math.PI * 2);
        (b.s.material as THREE.SpriteMaterial).opacity = b.base * k;
      }
    },
    flare(a, t) {
      const ar = arches.find((x) => x.a === a);
      if (ar) ar.flareAt = t;
    },
    dispose() {
      disposeGroup(group);
    },
  };
}
