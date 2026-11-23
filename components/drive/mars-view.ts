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
  marsHeight,
  PIPE_H,
  PIPES,
  type Pipe,
  SITES,
  type Site,
} from '@/lib/art/mars';
import { START } from '@/lib/art/salt-flat-game';
import { disposeGroup } from './track-view';
import { glowSprite } from './vehicles';

export interface MarsView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number): void;
  dispose(): void;
}

/** The rust palette (sRGB): rust, ochre, dark iron, burnt umber, pale dust. */
const RUST = [0x8a3a1c, 0xa65a2a, 0xc0803a, 0x3a2620, 0x5a3424, 0x2a1c18, 0x9a6a48];

function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A part: its geometry (made non-indexed) painted one colour per face from a few, placed by m. */
function part(
  geo: THREE.BufferGeometry,
  m: THREE.Matrix4,
  colours: readonly number[],
  seed: number,
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.deleteAttribute('uv');
  g.applyMatrix4(m);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let f = 0; f < n / 3; f++) {
    c.set(colours[Math.floor(hash(f, seed) * colours.length)]);
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (f * 3 + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const M = () => new THREE.Matrix4();
const at = (x: number, y: number, z: number) => M().makeTranslation(x, y, z);
const q = new THREE.Quaternion();
const e = new THREE.Euler();
function place(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return M().compose(
    new THREE.Vector3(x, y, z),
    q.setFromEuler(e.set(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
}

/** A strut from a to b (a thin box), for lattices and trusses. */
function strut(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  colours: readonly number[],
  s: number,
) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const g = new THREE.BoxGeometry(r, len, r);
  const m = M().compose(
    new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()),
    new THREE.Vector3(1, 1, 1),
  );
  return part(g, m, colours, s);
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

/* ── The pipelines ── */

function pipeline(p: Pipe, ox: number, oy: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const len = Math.hypot(p.bx - p.ax, p.by - p.ay);
  const n = Math.max(2, Math.ceil(len / 30));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const x = p.ax + ((p.bx - p.ax) * i) / n;
    const y = p.ay + ((p.by - p.ay) * i) / n;
    pts.push(new THREE.Vector3(x - ox, marsHeight(x, y) + PIPE_H, -(y - oy)));
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

  // The stations.
  const sites = SITES.map((s, si) => {
    const parts: THREE.BufferGeometry[] = [];
    const lights: THREE.Vector3[] = [];
    const cores: THREE.Vector3[] = [];
    if (s.kind === 'domes') domes(s, parts, lights);
    else if (s.kind === 'factory') factory(s, parts, lights);
    else if (s.kind === 'nova') nova(s, parts, cores);
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
    obj.rotation.y = s.rot;
    // Sunk a little, so a slope never shows daylight under it; the derelicts deeper.
    const base = marsHeight(s.x, s.y) - (s.kind === 'ruin' ? 3 : 0.8);
    group.add(obj);
    return { obj, s, base };
  });

  // The pipelines, each built round its own middle.
  const pipes = PIPES.map((p) => {
    const mx = (p.ax + p.bx) / 2;
    const my = (p.ay + p.by) / 2;
    const mesh = new THREE.Mesh(pipeline(p, mx, my), groundMat);
    group.add(mesh);
    return { mesh, mx, my };
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
    dispose() {
      disposeGroup(group);
    },
  };
}
