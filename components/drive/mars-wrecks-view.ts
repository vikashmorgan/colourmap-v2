/**
 * Drive, Mars: the crashed stations and the artefacts as you see them (docs/specs/mars-world.md,
 * "Things to explore"). Placement, floors and walls are pure (lib/art/mars-wrecks.ts,
 * lib/art/mars.ts WRECKS, ARTEFACTS); here only the meshes: the broken hulls with their ribbed
 * insides and the sand floor curving up their sides, the torn rings standing tilted out of the
 * sand, the noses, the scorched trenches and the debris; the monoliths, the dead satellites and the
 * alien ruins with their glowing glyphs. The wrecks' lamps flicker and sparks spit from their torn
 * edges; the glyphs breathe slowly.
 *
 * Cheap: each wreck and each artefact is one merged mesh (plus its trench, its lamps and glyphs);
 * the sparks share one small pool of points, thrown only near you.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { ARTEFACTS, marsBase, WRECKS } from '@/lib/art/mars';
import {
  type Artefact,
  flicker,
  HULL_SIDE,
  hullFloor,
  hullWidth,
  MONOLITH,
  ringBroken,
  ringFootAngles,
  ringPoint,
  ruinPillars,
  type Wreck,
} from '@/lib/art/mars-wrecks';
import { hash, part, place } from './mars-parts';
import { disposeGroup } from './track-view';
import { glowSprite, glowTexture } from './vehicles';

/** Weathered hull metal: pale grey, white gone to dust, scorched rust. */
const HULL = [0x8a8580, 0x6e6a66, 0x9a8a7a, 0x5a4a40, 0x7a5a48, 0xa49a8c];
const SCORCH = [0x2a1e1a, 0x3a2a22, 0x4a3328];
const RING = [0x8c8478, 0x6a625a, 0x7a5040, 0x9a9488];
const SAND = [0xa0603a, 0x9a5834, 0xa86842];
const STONE = [0xb89a78, 0xa88a68, 0xc8aa84, 0x98785a];
const FOIL = [0xb08a3a, 0xc8a048, 0x8a6a2a];
const PANEL = [0x2a3040, 0x343a4c, 0x22283a];

export interface WrecksView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number, dt: number): void;
  dispose(): void;
}

interface Lamp {
  s: THREE.Sprite;
  base: number;
  seed: number;
}

interface Placed {
  obj: THREE.Group;
  x: number;
  y: number;
  lamps: Lamp[];
  sparks: THREE.Vector3[];
  far: number;
  glyphs?: THREE.MeshBasicMaterial;
}

/** A unit direction in the scene (x east, y up, z south) from a world heading. */
function dir3(h: number, up = 0): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(h), up, -Math.sin(h)).normalize();
}

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

/** A geometry placed by a position and a rotation taking `from` onto `to`. */
function aligned(
  geo: THREE.BufferGeometry,
  at: THREE.Vector3,
  from: THREE.Vector3,
  to: THREE.Vector3,
  colours: readonly number[],
  seed: number,
  spin = 0,
) {
  const q = new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(from, spin));
  const m = new THREE.Matrix4().compose(at, q, new THREE.Vector3(1, 1, 1));
  return part(geo, m, colours, seed);
}

/* ── A wreck ── */

function hullParts(
  w: Wreck,
  parts: THREE.BufferGeometry[],
  lamps: THREE.Vector3[],
  sparks: THREE.Vector3[],
) {
  const hl = w.hull;
  const L = Math.hypot(hl.bx - hl.ax, hl.by - hl.ay);
  const d = dir3(w.h);
  const mid = new THREE.Vector3((hl.ax + hl.bx) / 2 - w.x, hl.a, -((hl.ay + hl.by) / 2 - w.y));
  const seed = w.ring.R;
  // The shell: open at both ends, seen from inside and out.
  parts.push(
    aligned(new THREE.CylinderGeometry(hl.R, hl.R, L, 30, 8, true), mid, Y, d, HULL, seed),
  );
  // Its ribs inside, every 12 m, and stringers along its outside.
  for (let u = 6; u < L - 3; u += 12) {
    const p = mid.clone().addScaledVector(d, u - L / 2);
    parts.push(aligned(new THREE.TorusGeometry(hl.R - 0.7, 0.55, 5, 30), p, Z, d, SCORCH, u));
  }
  // Across: the horizontal across the hull, and up.
  const across = new THREE.Vector3(Math.sin(w.h), 0, Math.cos(w.h));
  for (let k = 0; k < 9; k++) {
    const phi = (k / 8) * Math.PI;
    const off = across
      .clone()
      .multiplyScalar(Math.cos(phi) * (hl.R + 0.3))
      .add(new THREE.Vector3(0, Math.sin(phi) * (hl.R + 0.3), 0));
    const c = mid.clone().add(off);
    parts.push(aligned(new THREE.BoxGeometry(0.8, L * 0.96, 0.8), c, Y, d, SCORCH, k));
  }
  // Torn ends: shards of plate bent out round each mouth, sparks spitting from the rim.
  for (const end of [-1, 1]) {
    const e = mid.clone().addScaledVector(d, (end * L) / 2);
    for (let k = 0; k < 12; k++) {
      const phi = (k / 11) * Math.PI * 1.1 - 0.05;
      const r = hl.R * (0.95 + 0.1 * hash(k, end + 3));
      const p = e
        .clone()
        .addScaledVector(across, Math.cos(phi) * r)
        .add(new THREE.Vector3(0, Math.sin(phi) * r, 0));
      if (p.y < 0.5) continue;
      const len = 2 + 6 * hash(k, end + 9);
      const out = d
        .clone()
        .multiplyScalar(end)
        .add(new THREE.Vector3(0, 0.3 * (hash(k, end) - 0.3), 0));
      parts.push(
        aligned(
          new THREE.ConeGeometry(0.9 + hash(k, end + 1), len, 3),
          p.clone().addScaledVector(out.clone().normalize(), len / 2),
          Y,
          out,
          HULL,
          k + end * 20,
        ),
      );
      if (k % 4 === 1) sparks.push(p);
    }
  }
  // Lamps along its ceiling, every 20 m: the few that still flicker.
  for (let u = 12; u < L - 8; u += 20)
    lamps.push(
      mid
        .clone()
        .addScaledVector(d, u - L / 2)
        .add(new THREE.Vector3(0, hl.R - 1.4, 0)),
    );
}

/** The sand inside a hull, curving up its sides (the backdrop draws the bare ground under it). */
function hullFloorGeo(w: Wreck): THREE.BufferGeometry {
  const hl = w.hull;
  const L = Math.hypot(hl.bx - hl.ax, hl.by - hl.ay);
  const ex = (hl.bx - hl.ax) / L;
  const ey = (hl.by - hl.ay) / L;
  const edge = hullWidth(hl) * HULL_SIDE;
  const nu = Math.ceil(L / 4);
  const nv = 14;
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const vert = (i: number, j: number) => {
    const u = (i / nu) * L;
    const v = -edge + (j / nv) * edge * 2;
    const x = hl.ax + ex * u - ey * v;
    const y = hl.ay + ey * u + ex * v;
    pos.push(x - w.x, hullFloor(hl, x, y) + 0.03, -(y - w.y));
    c.set(SAND[(i + j) % SAND.length]).multiplyScalar(0.85 + 0.15 * Math.abs(v / edge));
    col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      vert(i, j);
      vert(i + 1, j);
      vert(i + 1, j + 1);
      vert(i, j);
      vert(i + 1, j + 1);
      vert(i, j + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function ringParts(
  w: Wreck,
  parts: THREE.BufferGeometry[],
  lamps: THREE.Vector3[],
  sparks: THREE.Vector3[],
) {
  const r = w.ring;
  const P = (th: number) => {
    const p = ringPoint(r, th);
    return new THREE.Vector3(p.x - w.x, p.z, -(p.y - w.y));
  };
  const [a0, a1] = ringFootAngles(r);
  // The tube as short segments from foot to foot over the top, the gap left torn away.
  const n = 64;
  for (let i = 0; i < n; i++) {
    const t0 = a0 - 0.08 + ((a1 - a0 + 0.16) * i) / n;
    const t1 = a0 - 0.08 + ((a1 - a0 + 0.16) * (i + 1)) / n;
    if (ringBroken(r, (t0 + t1) / 2)) continue;
    const p0 = P(t0);
    const p1 = P(t1);
    const len = p0.distanceTo(p1);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const along = p1.clone().sub(p0);
    parts.push(
      aligned(
        new THREE.CylinderGeometry(r.tube, r.tube, len + 0.6, 10, 1, true),
        mid,
        Y,
        along,
        RING,
        i,
      ),
    );
    // A band every few segments, and a lamp.
    if (i % 6 === 0) {
      parts.push(
        aligned(
          new THREE.CylinderGeometry(r.tube + 0.5, r.tube + 0.5, 1.4, 10),
          mid,
          Y,
          along,
          SCORCH,
          i + 99,
        ),
      );
      if (mid.y > 4) lamps.push(mid.clone().add(new THREE.Vector3(0, r.tube + 0.6, 0)));
    }
  }
  // The torn ends at the gap: shards, and sparks.
  for (const g of [r.gap0, r.gap1]) {
    const p = P(g);
    sparks.push(p);
    for (let k = 0; k < 5; k++) {
      const out = P(g + (g === r.gap0 ? 0.05 : -0.05))
        .sub(P(g))
        .normalize();
      out.add(new THREE.Vector3(hash(k, g) - 0.5, hash(g, k) - 0.5, hash(k + 1, g) - 0.5));
      const len = 3 + 4 * hash(k, g + 3);
      parts.push(
        aligned(
          new THREE.ConeGeometry(1.2, len, 3),
          p.clone().addScaledVector(out.normalize(), len / 2),
          Y,
          out,
          RING,
          k,
        ),
      );
    }
  }
  // The piece torn out, lying in the sand beside its foot.
  const foot = P(a0);
  const lie = new THREE.TorusGeometry(r.R, r.tube, 8, 14, r.gap1 - r.gap0);
  parts.push(
    part(
      lie,
      place(
        foot.x * 0.6,
        r.tube * 0.4 - r.R * 0.04,
        foot.z * 0.6 + 30,
        -Math.PI / 2 + 0.12,
        w.h,
        0,
        1,
        1,
        1,
      ),
      RING,
      7,
    ),
  );
}

function noseParts(w: Wreck, parts: THREE.BufferGeometry[], lamps: THREE.Vector3[]) {
  const n = w.nose;
  const len = n.r * 2.6;
  const d = dir3(n.h, -0.18);
  const c = new THREE.Vector3(n.x - w.x, n.r * 0.35, -(n.y - w.y));
  parts.push(aligned(new THREE.ConeGeometry(n.r, len, 24, 4, true), c, Y, d, HULL, 31));
  // The torn base, a dark ring.
  parts.push(
    aligned(
      new THREE.TorusGeometry(n.r - 0.3, 0.7, 5, 24),
      c.clone().addScaledVector(d, -len / 2),
      Z,
      d,
      SCORCH,
      32,
    ),
  );
  // Its cockpit windows: a row of dim lamps.
  for (let k = -2; k <= 2; k++)
    lamps.push(
      c
        .clone()
        .addScaledVector(d, len * 0.18)
        .add(new THREE.Vector3(Math.sin(n.h) * k * 1.6, n.r * 0.45, Math.cos(n.h) * k * 1.6)),
    );
}

function debrisParts(w: Wreck, parts: THREE.BufferGeometry[]) {
  for (const d of w.debris) {
    const z = marsBase(d.x, d.y);
    const x = d.x - w.x;
    const y = -(d.y - w.y);
    const tilt = (d.seed - 0.5) * 0.9;
    if (d.kind === 'plate')
      parts.push(
        part(
          new THREE.BoxGeometry(d.r * 2, 0.4 + d.r * 0.15, d.r * 1.4),
          place(x, z + d.r * 0.2, y, tilt, d.rot, tilt * 0.6),
          HULL,
          d.seed * 50,
        ),
      );
    else if (d.kind === 'girder')
      parts.push(
        part(
          new THREE.BoxGeometry(d.r * 3, 0.7, 0.7),
          place(x, z + 0.4, y, 0, d.rot, tilt),
          SCORCH,
          d.seed * 50,
        ),
      );
    else if (d.kind === 'pod')
      parts.push(
        part(
          new THREE.CylinderGeometry(d.r * 0.7, d.r * 0.8, d.r * 1.8, 10),
          place(x, z + d.r * 0.4, y, Math.PI / 2 + tilt, d.rot, 0),
          HULL,
          d.seed * 50,
        ),
      );
    else
      parts.push(
        part(
          new THREE.BoxGeometry(d.r * 2.2, 0.25, d.r * 1.1),
          place(x, z + 0.3 + d.r * 0.3, y, tilt * 1.5, d.rot, 0.4),
          PANEL,
          d.seed * 50,
        ),
      );
  }
}

/** The scorched trench: a dark strip on the ground, its edges fading into the sand. */
function trenchMesh(w: Wreck, mat: THREE.Material): THREE.Mesh {
  const t = w.trench;
  const L = Math.hypot(t.bx - t.ax, t.by - t.ay);
  const ex = (t.bx - t.ax) / L;
  const ey = (t.by - t.ay) / L;
  const n = Math.ceil(L / 8);
  const across = [-1, -0.45, 0.45, 1];
  const alpha = [0, 0.75, 0.75, 0];
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * L;
    // Narrow where it starts, widest where the hull came to rest.
    const half = (t.w / 2) * (0.35 + 0.65 * (i / n));
    for (let j = 0; j < 4; j++) {
      const v = across[j] * half;
      const x = t.ax + ex * u - ey * v;
      const y = t.ay + ey * u + ex * v;
      pos.push(x - w.x, marsBase(x, y) + 0.12, -(y - w.y));
      const fade = Math.min(1, i / 6);
      col.push(0.09, 0.06, 0.05, alpha[j] * fade);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 3; j++) {
      const a = i * 4 + j;
      idx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = -1;
  return m;
}

/* ── The artefacts ── */

function artefactParts(
  a: Artefact,
  z0: number,
  parts: THREE.BufferGeometry[],
  glyphs: THREE.BufferGeometry[],
  lamps: THREE.Vector3[],
) {
  const yaw = a.rot;
  if (a.kind === 'monolith') {
    // A black slab, sunk a little and leaning a hair.
    parts.push(
      part(
        new THREE.BoxGeometry(MONOLITH.w, MONOLITH.h, MONOLITH.d),
        place(0, z0 + MONOLITH.h / 2 - 0.8, 0, 0.03, yaw, 0.02),
        [0x0c0a0a, 0x100c0c, 0x0a0808],
        a.seed * 9,
      ),
    );
    lamps.push(new THREE.Vector3(0, z0 + MONOLITH.h + 2, 0));
  } else if (a.kind === 'satellite') {
    const dx = Math.cos(a.rot);
    const dz = -Math.sin(a.rot);
    // The body in gold foil, half sunk, tipped over.
    parts.push(
      part(new THREE.BoxGeometry(7, 4.5, 4.5), place(0, z0 + 1.6, 0, 0.3, yaw, 0.2), FOIL, a.seed),
    );
    // The dish resting on its rim, facing the sky at a slant.
    const dish = new THREE.SphereGeometry(9, 20, 6, 0, Math.PI * 2, 0, 0.75);
    parts.push(
      part(
        dish,
        place(dx * 9, z0 + 7.5, dz * 9, 0, yaw, -1.0),
        [0xc8c0b0, 0xa8a090, 0xd8d0c0],
        a.seed + 1,
      ),
    );
    parts.push(
      part(
        new THREE.CylinderGeometry(0.3, 0.3, 7, 5),
        place(dx * 6, z0 + 4, dz * 6, 0, yaw, -1.0),
        [0x3a2a24],
        3,
      ),
    );
    // Its solar wings: one still on, one snapped and lying in the sand.
    parts.push(
      part(
        new THREE.BoxGeometry(14, 0.3, 4),
        place(-dz * 9, z0 + 3, dx * 9, 0.4, yaw + Math.PI / 2, 0.1),
        PANEL,
        a.seed + 2,
      ),
    );
    parts.push(
      part(
        new THREE.BoxGeometry(14, 0.3, 4),
        place(dz * 14, z0 + 0.4, -dx * 14 + 3, 0.05, yaw + 2.0, 0.08),
        PANEL,
        a.seed + 3,
      ),
    );
    lamps.push(new THREE.Vector3(0, z0 + 4.4, 0));
  } else {
    // The ruins: pillars in a ring, lintels on the arch pairs, an altar in the middle.
    const ps = ruinPillars(a).map((p) => ({ ...p, lx: p.x - a.x, lz: -(p.y - a.y) }));
    for (const [k, p] of ps.entries()) {
      parts.push(
        part(
          new THREE.CylinderGeometry(1.4, 1.75, p.h, 8),
          place(p.lx, z0 + p.h / 2 - 0.5, p.lz, 0, k, 0),
          STONE,
          k + a.seed * 10,
        ),
      );
      // Glyphs up its outer face: short bars that glow.
      const out = new THREE.Vector3(p.lx, 0, p.lz).normalize();
      const face = Math.atan2(out.x, out.z);
      for (let g = 0; g < Math.min(5, Math.floor(p.h / 2.4)); g++) {
        const w = 0.4 + 0.8 * hash(k, g);
        glyphs.push(
          part(
            new THREE.PlaneGeometry(w, 0.28),
            place(p.lx + out.x * 1.62, z0 + 1.6 + g * 2.1, p.lz + out.z * 1.62, 0, face, 0),
            [0xffffff],
            g,
          ),
        );
        glyphs.push(
          part(
            new THREE.PlaneGeometry(0.22, 0.9),
            place(
              p.lx + out.x * 1.62,
              z0 + 2.2 + g * 2.1,
              p.lz + out.z * 1.62,
              0,
              face,
              (hash(g, k) - 0.5) * 0.8,
            ),
            [0xffffff],
            g + 7,
          ),
        );
      }
    }
    // The lintels: the two arches you drive under, either side of the way through.
    for (const [i, j] of [
      [0, ps.length - 1],
      [ps.length / 2 - 1, ps.length / 2],
    ]) {
      const p = ps[i];
      const q = ps[j];
      const mid = new THREE.Vector3((p.lx + q.lx) / 2, z0 + 15.6, (p.lz + q.lz) / 2);
      const len = Math.hypot(q.lx - p.lx, q.lz - p.lz) + 4;
      parts.push(
        aligned(
          new THREE.BoxGeometry(2.2, len, 2.4),
          mid,
          Y,
          new THREE.Vector3(q.lx - p.lx, 0, q.lz - p.lz),
          STONE,
          i,
        ),
      );
    }
    // The altar, its glyph ring glowing.
    parts.push(part(new THREE.BoxGeometry(5, 2.6, 5), place(0, z0 + 0.9, 0, 0, yaw, 0), STONE, 77));
    glyphs.push(
      part(
        new THREE.RingGeometry(1.6, 2.1, 24),
        place(0, z0 + 2.25, 0, -Math.PI / 2, 0, 0),
        [0xffffff],
        1,
      ),
    );
  }
}

/* ── The view ── */

export function buildWrecksView(): WrecksView {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const trenchMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const placed: Placed[] = [];

  const addLamps = (
    obj: THREE.Group,
    ps: THREE.Vector3[],
    colour: number,
    size: number,
    base: number,
    i: number,
  ) =>
    ps.map((p, k) => {
      const s = glowSprite(colour, size, base);
      (s.material as THREE.SpriteMaterial).fog = false;
      s.position.copy(p);
      obj.add(s);
      return { s, base, seed: hash(i * 17 + k, size) };
    });

  WRECKS.forEach((w, wi) => {
    const parts: THREE.BufferGeometry[] = [];
    const lamps: THREE.Vector3[] = [];
    const ringLamps: THREE.Vector3[] = [];
    const sparks: THREE.Vector3[] = [];
    hullParts(w, parts, lamps, sparks);
    ringParts(w, parts, ringLamps, sparks);
    noseParts(w, parts, lamps);
    debrisParts(w, parts);
    const obj = new THREE.Group();
    const geo = mergeGeometries(parts) as THREE.BufferGeometry;
    for (const g of parts) g.dispose();
    obj.add(new THREE.Mesh(geo, mat));
    obj.add(new THREE.Mesh(hullFloorGeo(w), mat));
    obj.add(trenchMesh(w, trenchMat));
    const ls = [
      ...addLamps(obj, lamps, 0xffd8a0, 3.4, 0.7, wi),
      ...addLamps(obj, ringLamps, 0xff7040, 4.5, 0.6, wi + 50),
    ];
    group.add(obj);
    placed.push({ obj, x: w.x, y: w.y, lamps: ls, sparks, far: 5200 });
  });

  ARTEFACTS.forEach((a, ai) => {
    const parts: THREE.BufferGeometry[] = [];
    const glyphParts: THREE.BufferGeometry[] = [];
    const lamps: THREE.Vector3[] = [];
    // The lowest ground under it, so nothing floats on a slope.
    let z0 = marsBase(a.x, a.y);
    for (let k = 0; k < 8; k++) {
      const r = a.kind === 'ruins' ? 28 : 8;
      z0 = Math.min(z0, marsBase(a.x + Math.cos(k) * r, a.y + Math.sin(k) * r));
    }
    artefactParts(a, z0, parts, glyphParts, lamps);
    const obj = new THREE.Group();
    const geo = mergeGeometries(parts) as THREE.BufferGeometry;
    for (const g of parts) g.dispose();
    obj.add(new THREE.Mesh(geo, mat));
    let glyphs: THREE.MeshBasicMaterial | undefined;
    if (glyphParts.length) {
      glyphs = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.35, 1.5, 1.15),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const g = mergeGeometries(glyphParts) as THREE.BufferGeometry;
      for (const q of glyphParts) q.dispose();
      obj.add(new THREE.Mesh(g, glyphs));
    }
    const colour = a.kind === 'monolith' ? 0x9a70ff : a.kind === 'satellite' ? 0xff4030 : 0x60ffd0;
    const ls = addLamps(obj, lamps, colour, a.kind === 'monolith' ? 9 : 2.4, 0.5, 100 + ai);
    group.add(obj);
    placed.push({ obj, x: a.x, y: a.y, lamps: ls, sparks: [], far: 3200, glyphs });
  });

  // The sparks: one pool of glowing points, thrown in small bursts from the torn edges near you.
  const N = 240;
  const sp = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const world = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkPts = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      map: glowTexture(),
      color: new THREE.Color(2.4, 1.5, 0.6),
      size: 0.9,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sparkPts.frustumCulled = false;
  group.add(sparkPts);
  let nextSpark = 0;
  const burst = (x: number, y: number, z: number) => {
    for (let k = 0; k < 14; k++) {
      const i = nextSpark;
      nextSpark = (nextSpark + 1) % N;
      world[i * 3] = x;
      world[i * 3 + 1] = y;
      world[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 7;
      vel[i * 3] = Math.cos(a) * s;
      vel[i * 3 + 1] = Math.sin(a) * s;
      vel[i * 3 + 2] = 2 + Math.random() * 6;
      life[i] = 0.5 + Math.random() * 0.7;
    }
  };

  return {
    group,
    update(ox, oy, t, dt) {
      for (const p of placed) {
        const far = Math.hypot(p.x - ox, p.y - oy);
        p.obj.visible = far < p.far;
        if (!p.obj.visible) continue;
        p.obj.position.set(p.x - ox, 0, -(p.y - oy));
        if (far > 1800) continue;
        for (const l of p.lamps)
          (l.s.material as THREE.SpriteMaterial).opacity = l.base * flicker(t, l.seed);
        if (p.glyphs) p.glyphs.opacity = 0.55 + 0.35 * Math.sin(t * 0.9 + p.x * 0.01);
        // Now and then a burst of sparks from a torn edge (each edge about every 2 s).
        if (far < 900)
          for (const s of p.sparks) if (Math.random() < dt * 0.5) burst(p.x + s.x, p.y - s.z, s.y);
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) {
          sp[i * 3 + 1] = -1e5;
          continue;
        }
        life[i] -= dt;
        vel[i * 3 + 2] -= 9.8 * dt;
        world[i * 3] += vel[i * 3] * dt;
        world[i * 3 + 1] += vel[i * 3 + 1] * dt;
        world[i * 3 + 2] += vel[i * 3 + 2] * dt;
        sp[i * 3] = world[i * 3] - ox;
        sp[i * 3 + 1] = world[i * 3 + 2];
        sp[i * 3 + 2] = -(world[i * 3 + 1] - oy);
      }
      sparkGeo.attributes.position.needsUpdate = true;
    },
    dispose() {
      disposeGroup(group);
      mat.dispose();
      trenchMat.dispose();
    },
  };
}
