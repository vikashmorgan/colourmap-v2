/**
 * Drive, Mars: the factory city as you see it (docs/specs/mars-world.md, "The factory city").
 * Placement and surfaces are pure (lib/art/mars-works.ts, lib/art/mars.ts BOXES, TANKS, BARRELS,
 * SITES); here only the meshes: the Foundry Town's halls and warehouses, the nuclear towns'
 * workers' blocks, the tanks, the barrel pipe, and the works that stand alone in the City's
 * factory shapes (chimneys, cooling towers, reactor domes, preheater towers, silo batteries).
 *
 * Cheap: every building and tank of a town is one merged mesh, built round the town's middle; the
 * barrel is a shell, its ribs and a few lamp rings; windows are steady points of warm light.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { BARRELS, BOXES, type Site, TANKS } from '@/lib/art/mars';
import { type Barrel, type Box, ROOF_INSET, type Tank } from '@/lib/art/mars-works';
import { at, hash, part, place, RUST, strut } from './mars-parts';
import { glowTexture } from './vehicles';

const IRON = [0x3a2a24, 0x4a3830, 0x2e221e, 0x5a463a];
const CONCRETE = [0x7a5a48, 0x8a6a52, 0x6a4a3a, 0x9a7a5e, 0x5a3a2c];
const BRICK = [0x7a3420, 0x8a4028, 0x6a2c1c, 0x9a5032];
/** The roofs you can land on: dark tar with pale landing stripes. */
const TAR = [0x2a201c, 0x30241f];
const STRIPE = [0xd8b070];

export interface WorksView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number): void;
}

/** The kinds of works this view builds (the rest are mars-view.ts's). */
export function isWork(kind: Site['kind']): boolean {
  return (
    kind === 'chimney' ||
    kind === 'cooling' ||
    kind === 'reactor' ||
    kind === 'preheater' ||
    kind === 'silos'
  );
}

/** A hyperboloid tower's profile (the City's cooling towers): wide foot, waist, a flared mouth. */
function hyperboloid(r0: number, H: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    const r = r0 * (0.58 + 0.42 * ((k - 0.7) / 0.7) ** 2 * (k < 0.7 ? 1 : 2.2));
    out.push(new THREE.Vector2(r, k * H));
  }
  return out;
}

/**
 * One works standing alone, its parts built round its middle: where its lights go, the City's
 * star-light dots, and the glowing mouths (with their radii) that breathe steam.
 */
export function workParts(
  s: Site,
  parts: THREE.BufferGeometry[],
  lights: THREE.Vector3[],
  dots: THREE.Vector3[],
  mouths: { p: THREE.Vector3; r: number }[],
) {
  const seed = s.seed * 97;
  if (s.kind === 'chimney') {
    // A tall banded stack, an ember at its mouth.
    const H = 58 + 22 * s.seed;
    parts.push(part(new THREE.CylinderGeometry(2.4, 3.4, H, 12), at(0, H / 2, 0), BRICK, seed));
    for (const k of [0.3, 0.6, 0.85])
      parts.push(
        part(
          new THREE.TorusGeometry(3.4 - k, 0.4, 5, 16),
          place(0, H * k, 0, Math.PI / 2),
          [0xd8c8b0, 0x2a1c18],
          k * 10,
        ),
      );
    lights.push(new THREE.Vector3(0, H + 1.5, 0));
    mouths.push({ p: new THREE.Vector3(0, H, 0), r: 0 });
  } else if (s.kind === 'cooling') {
    const H = 112;
    const prof = hyperboloid(s.r, H);
    parts.push(part(new THREE.LatheGeometry(prof, 32), at(0, -1, 0), CONCRETE, seed));
    // Its foot of splayed columns, shown as a dark band.
    parts.push(
      part(
        new THREE.CylinderGeometry(s.r * 1.02, s.r * 1.04, 4, 32, 1, true),
        at(0, 1, 0),
        IRON,
        2,
      ),
    );
    const top = prof[prof.length - 1];
    mouths.push({ p: new THREE.Vector3(0, H - 0.5, 0), r: top.x });
    for (const [k, n] of [
      [0, 28],
      [10, 20],
      [14, 26],
    ] as const) {
      const r = prof[k].x + 0.5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        dots.push(new THREE.Vector3(Math.cos(a) * r, prof[k].y - 0.5, Math.sin(a) * r));
      }
    }
  } else if (s.kind === 'reactor') {
    // A great dome on a drum, ribs of dots, a ring of glow at its foot.
    const R = s.r;
    parts.push(part(new THREE.CylinderGeometry(R, R, 12, 28), at(0, 5, 0), CONCRETE, seed));
    parts.push(
      part(
        new THREE.SphereGeometry(R, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        at(0, 11, 0),
        CONCRETE,
        seed + 1,
      ),
    );
    for (let m = 0; m < 12; m++) {
      const a = (m / 12) * Math.PI * 2;
      for (let i = 1; i < 8; i++) {
        const e = (i / 8) * (Math.PI / 2);
        dots.push(
          new THREE.Vector3(
            Math.cos(a) * Math.cos(e) * (R + 0.4),
            11 + Math.sin(e) * (R + 0.4),
            Math.sin(a) * Math.cos(e) * (R + 0.4),
          ),
        );
      }
    }
    lights.push(new THREE.Vector3(0, 11 + R + 2, 0));
  } else if (s.kind === 'preheater') {
    // A preheater tower: a frame of four legs and floors, cyclones stacked down it.
    const H = 92;
    const w = 11;
    const corners = [
      [-w, -w],
      [w, -w],
      [w, w],
      [-w, w],
    ];
    for (const [x, z] of corners)
      parts.push(strut(new THREE.Vector3(x, -1, z), new THREE.Vector3(x, H, z), 1.4, IRON, x + z));
    for (let f = 1; f <= 6; f++) {
      const y = (f / 6) * H;
      parts.push(part(new THREE.BoxGeometry(w * 2 + 2, 1.2, w * 2 + 2), at(0, y, 0), IRON, f));
      // A cyclone on each floor, swapping sides as they go down.
      const cx = f % 2 ? -4 : 4;
      parts.push(part(new THREE.CylinderGeometry(4.2, 4.2, 6, 14), at(cx, y - 5, 2), RUST, f + 10));
      parts.push(
        part(new THREE.ConeGeometry(4.2, 7, 14), place(cx, y - 11.5, 2, Math.PI), RUST, f + 20),
      );
    }
    // A cladded upper block with the kiln's inlet and a stack.
    parts.push(part(new THREE.BoxGeometry(w * 2, 14, w * 2), at(0, H + 7, 0), RUST, seed));
    parts.push(
      part(new THREE.CylinderGeometry(2, 2.6, 26, 10), at(w - 3, H + 27, w - 3), BRICK, 3),
    );
    lights.push(new THREE.Vector3(w - 3, H + 41, w - 3), new THREE.Vector3(0, H + 15, 0));
    for (let i = 0; i < 4; i++)
      dots.push(new THREE.Vector3(corners[i][0], H + 14.5, corners[i][1]));
  } else {
    // A silo battery: two rows of three tall drums with cone tops, a gallery along their tops.
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        const x = (i - 1) * 14;
        const z = (j - 0.5) * 14;
        const H = 46 + 4 * hash(i, j);
        parts.push(
          part(
            new THREE.CylinderGeometry(6.6, 6.6, H, 18),
            at(x, H / 2 - 1, z),
            CONCRETE,
            i + j * 3,
          ),
        );
        parts.push(part(new THREE.ConeGeometry(6.8, 4, 18), at(x, H + 1, z), IRON, i * 7 + j));
      }
    parts.push(part(new THREE.BoxGeometry(36, 3, 4), at(0, 52, 0), IRON, 9));
    lights.push(new THREE.Vector3(-14, 54, 0), new THREE.Vector3(14, 54, 0));
  }
}

/** A building's parts, round (ox, oy): walls in bands, a door, the tar roof with pale stripes
 * marking where you can land, warm windows. */
function boxParts(
  b: Box,
  ox: number,
  oy: number,
  parts: THREE.BufferGeometry[],
  windows: THREE.Vector3[],
) {
  const x = b.x - ox;
  const z = -(b.y - oy);
  const turn = b.rot;
  const walls = b.kind === 'warehouse' ? BRICK : b.kind === 'block' ? CONCRETE : RUST;
  parts.push(
    part(
      new THREE.BoxGeometry(b.hx * 2, b.h + 2, b.hy * 2),
      place(x, b.h / 2 - 1, z, 0, turn, 0),
      walls,
      b.seed * 50,
    ),
  );
  // The roof's landing: a slab just over the top, inset, and stripes across it.
  parts.push(
    part(
      new THREE.BoxGeometry((b.hx - ROOF_INSET) * 2, 0.3, (b.hy - ROOF_INSET) * 2),
      place(x, b.h + 0.1, z, 0, turn, 0),
      TAR,
      b.seed,
    ),
  );
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const n = Math.max(2, Math.floor((b.hx * 2) / 14));
  for (let i = 0; i < n; i++) {
    const u = -b.hx + ROOF_INSET + 4 + ((b.hx - ROOF_INSET - 4) * 2 * (i + 0.5)) / n;
    parts.push(
      part(
        new THREE.BoxGeometry(1.2, 0.08, (b.hy - ROOF_INSET - 2) * 2),
        place(x + u * c, b.h + 0.3, z - u * s, 0, turn, 0),
        STRIPE,
        i,
      ),
    );
  }
  // A dark band of iron round the top: the edge, where you drop off.
  parts.push(
    part(
      new THREE.BoxGeometry(b.hx * 2 + 0.4, 1, b.hy * 2 + 0.4),
      place(x, b.h - 0.5, z, 0, turn, 0),
      IRON,
      b.seed * 3,
    ),
  );
  // Windows: rows of warm points on the long sides.
  const rows = Math.max(1, Math.floor(b.h / 6));
  for (let r = 0; r < rows; r++) {
    const y = 3 + r * 5.5;
    for (let k = -b.hx + 4; k <= b.hx - 4; k += 6) {
      if (hash(k + r * 13, b.seed * 100) < 0.45) continue;
      for (const side of [-1, 1]) {
        const v = side * (b.hy + 0.3);
        windows.push(new THREE.Vector3(x + k * c - v * s, y, z - (k * s + v * c)));
      }
    }
  }
}

function tankParts(t: Tank, ox: number, oy: number, parts: THREE.BufferGeometry[]) {
  const x = t.x - ox;
  const z = -(t.y - oy);
  parts.push(
    part(new THREE.CylinderGeometry(t.r, t.r, t.h + 2, 24), at(x, t.h / 2 - 1, z), RUST, t.x),
  );
  parts.push(
    part(
      new THREE.CylinderGeometry(t.r - ROOF_INSET, t.r - ROOF_INSET, 0.3, 24),
      at(x, t.h + 0.1, z),
      TAR,
      1,
    ),
  );
  for (const k of [0.33, 0.66])
    parts.push(
      part(
        new THREE.TorusGeometry(t.r + 0.2, 0.3, 4, 24),
        place(x, t.h * k, z, Math.PI / 2),
        IRON,
        k,
      ),
    );
  parts.push(
    part(
      new THREE.TorusGeometry(t.r - ROOF_INSET - 1, 0.25, 4, 24),
      place(x, t.h + 0.35, z, Math.PI / 2),
      STRIPE,
      2,
    ),
  );
}

/** The barrel pipe: a ribbed shell you drive through, lamp rings glowing inside it. */
function barrelObj(b: Barrel): { obj: THREE.Group; mx: number; my: number } {
  const obj = new THREE.Group();
  const L = Math.hypot(b.bx - b.ax, b.by - b.ay);
  const h = Math.atan2(b.by - b.ay, b.bx - b.ax);
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(b.R, b.R, L, 40, 8, true),
    new THREE.MeshLambertMaterial({ color: 0x6a3a26, side: THREE.DoubleSide, flatShading: true }),
  );
  shell.rotation.z = Math.PI / 2;
  obj.add(shell);
  const ribs: THREE.BufferGeometry[] = [];
  for (let u = 0; u <= L; u += 10) {
    const g = new THREE.TorusGeometry(b.R + 0.4, 0.6, 6, 32);
    g.rotateY(Math.PI / 2);
    g.translate(u - L / 2, 0, 0);
    ribs.push(g);
  }
  const ribMesh = new THREE.Mesh(
    mergeGeometries(ribs) as THREE.BufferGeometry,
    new THREE.MeshLambertMaterial({ color: 0x2e221e, flatShading: true }),
  );
  for (const g of ribs) g.dispose();
  obj.add(ribMesh);
  const lamps: THREE.BufferGeometry[] = [];
  for (let u = 15; u < L; u += 20) {
    const g = new THREE.TorusGeometry(b.R - 0.3, 0.12, 4, 40, Math.PI * 1.2);
    g.rotateZ(-Math.PI * 0.1);
    g.rotateY(Math.PI / 2);
    g.translate(u - L / 2, 0, 0);
    lamps.push(g);
  }
  obj.add(
    new THREE.Mesh(
      mergeGeometries(lamps) as THREE.BufferGeometry,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.45), toneMapped: false }),
    ),
  );
  for (const g of lamps) g.dispose();
  // Lying along its way, its floor at the ground (its middle a radius up).
  obj.rotation.y = h;
  obj.children.forEach((c) => {
    c.position.y += b.R;
  });
  return { obj, mx: (b.ax + b.bx) / 2, my: (b.ay + b.by) / 2 };
}

/** The towns' buildings and tanks, merged per town (grouped by which flat they stand on), and the
 * barrels. */
export function buildWorksView(mat: THREE.Material): WorksView {
  const group = new THREE.Group();
  const groups = new Map<string, { boxes: Box[]; tanks: Tank[] }>();
  const key = (x: number, y: number) => `${Math.round(x / 1500)},${Math.round(y / 1500)}`;
  for (const b of BOXES) {
    const g = groups.get(key(b.x, b.y)) ?? { boxes: [], tanks: [] };
    g.boxes.push(b);
    groups.set(key(b.x, b.y), g);
  }
  for (const t of TANKS) {
    const g = groups.get(key(t.x, t.y)) ?? { boxes: [], tanks: [] };
    g.tanks.push(t);
    groups.set(key(t.x, t.y), g);
  }
  const winMat = new THREE.PointsMaterial({
    map: glowTexture(),
    color: new THREE.Color(1.5, 0.95, 0.5),
    size: 1.8,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const towns: { obj: THREE.Group; mx: number; my: number }[] = [];
  for (const g of groups.values()) {
    const all = [...g.boxes.map((b) => [b.x, b.y]), ...g.tanks.map((t) => [t.x, t.y])];
    const mx = all.reduce((a, p) => a + p[0], 0) / all.length;
    const my = all.reduce((a, p) => a + p[1], 0) / all.length;
    const parts: THREE.BufferGeometry[] = [];
    const windows: THREE.Vector3[] = [];
    for (const b of g.boxes) boxParts(b, mx, my, parts, windows);
    for (const t of g.tanks) tankParts(t, mx, my, parts);
    const obj = new THREE.Group();
    const geo = mergeGeometries(parts) as THREE.BufferGeometry;
    for (const p of parts) p.dispose();
    obj.add(new THREE.Mesh(geo, mat));
    obj.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(windows), winMat));
    group.add(obj);
    towns.push({ obj, mx, my });
  }
  const barrels = BARRELS.map((b) => {
    const v = barrelObj(b);
    group.add(v.obj);
    return v;
  });
  return {
    group,
    update(ox, oy) {
      for (const tw of towns) {
        tw.obj.visible = Math.hypot(tw.mx - ox, tw.my - oy) < 5200;
        tw.obj.position.set(tw.mx - ox, 0, -(tw.my - oy));
      }
      for (const b of barrels) {
        b.obj.visible = Math.hypot(b.mx - ox, b.my - oy) < 4000;
        b.obj.position.set(b.mx - ox, 0, -(b.my - oy));
      }
    },
  };
}
