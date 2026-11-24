/**
 * Drive, Mars: the rock fields and the superboost portals as you see them
 * (docs/specs/mars-world.md, "Terrain to race in"). Placement is pure (lib/art/mars.ts ROCKS,
 * ROCK_ARCHES, PORTALS; lib/art/mars-rocks.ts); here only the meshes.
 *
 * Cheap: the rocks are merged into one mesh per 512 m cell, each arch is one mesh, each portal a
 * ring, a faint disc and a glow. The portals' light turns slowly and breathes; nothing flashes.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { marsBase, PORTALS, ROCK_ARCHES, ROCKS } from '@/lib/art/mars';
import type { Portal } from '@/lib/art/mars-boost';
import type { Rock, RockArch } from '@/lib/art/mars-rocks';
import { hash, part, place } from './mars-parts';
import { glowSprite } from './vehicles';

export interface RocksView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number): void;
  dispose(): void;
}

/** Rock: rust, oxblood, sand and dark basalt, with pale dust in the strata. */
const ROCK = [0x7a3a22, 0x8e4a2a, 0x6a2e1c, 0xa45e34, 0x5a2a1a];
const STRATA = [0xb87a4a, 0x9a5a34, 0xc89060, 0x7a3a22];

/** Roughens a geometry: each vertex pushed in or out a little by a hash of where it is. */
function rough(geo: THREE.BufferGeometry, amt: number, seed: number): THREE.BufferGeometry {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + (hash(x * 0.37 + seed, z * 0.41 + y * 0.13) - 0.5) * 2 * amt;
    p.setXYZ(i, x * k, y, z * k);
  }
  return geo;
}

/** The lowest ground under a footprint, so a rock on a slope never shows daylight under it. */
function groundUnder(x: number, y: number, r: number): number {
  let lo = marsBase(x, y);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lo = Math.min(lo, marsBase(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  return lo;
}

/** One rock, its parts placed round (ox, oy) at its height on the ground. */
function rockParts(r: Rock, ox: number, oy: number, parts: THREE.BufferGeometry[]) {
  const z0 = groundUnder(r.x, r.y, r.r) - 1.5;
  const x = r.x - ox;
  const z = -(r.y - oy);
  const turn = r.seed * Math.PI * 2;
  if (r.kind === 'mesa') {
    // Tiers of sheer rock in strata, a little narrower each, a flat cap on top.
    const tiers = 3;
    let y = z0;
    for (let i = 0; i < tiers; i++) {
      const hgt = (r.h + 1.5) / tiers;
      const rb = r.r * (1 - i * 0.09);
      const rt = r.r * (1 - (i + 1) * 0.09 + 0.03);
      const geo = rough(new THREE.CylinderGeometry(rt, rb, hgt, 11, 2), 0.12, r.seed * 9 + i);
      parts.push(
        part(geo, place(x, y + hgt / 2, z, 0, turn + i, 0), i % 2 ? STRATA : ROCK, r.seed + i),
      );
      y += hgt;
    }
  } else if (r.kind === 'spire') {
    // A hoodoo: a tapering column with a wider cap rock balanced on top.
    const geo = rough(new THREE.CylinderGeometry(r.r * 0.55, r.r, r.h, 7, 3), 0.18, r.seed * 7);
    parts.push(part(geo, place(x, z0 + r.h / 2, z, 0, turn, 0), STRATA, r.seed * 5));
    parts.push(
      part(
        rough(new THREE.DodecahedronGeometry(r.r * 0.95, 0), 0.2, r.seed),
        place(x, z0 + r.h + r.r * 0.4, z, 0.2, turn, 0.1, 1, 0.55, 1),
        ROCK,
        r.seed * 3,
      ),
    );
  } else if (r.kind === 'boulder') {
    parts.push(
      part(
        new THREE.DodecahedronGeometry(r.r, 0),
        place(x, z0 + 1.5 + r.r * 0.45, z, r.seed * 2, turn, r.seed, 1, 0.75, 1),
        ROCK,
        r.seed * 11,
      ),
    );
  }
  // The arches' feet are part of the arch's own mesh.
}

/** A natural arch over a canyon: a thick, lumpy half ring of rock from wall to wall. */
function archGeo(a: RockArch): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const thick = 5.5 - 1.8 * Math.sin(t) + hash(i, a.x) * 1.2;
    parts.push(
      part(
        new THREE.DodecahedronGeometry(thick, 0),
        place(Math.cos(t) * a.r, Math.sin(t) * a.r * 0.95, 0, t, i, 0, 1.3, 1, 1),
        i % 3 ? ROCK : STRATA,
        i + a.y,
      ),
    );
  }
  for (const s of [-1, 1])
    parts.push(
      part(new THREE.CylinderGeometry(4.5, 6, 10, 7), place(s * a.r, -2, 0, 0, s, 0), ROCK, s * 7),
    );
  const geo = mergeGeometries(parts) as THREE.BufferGeometry;
  for (const g of parts) g.dispose();
  return geo;
}

/** A portal: a tall bright ring on its feet, a faint disc of light across it, a glow. */
function portalObj(p: Portal): { obj: THREE.Group; disc: THREE.Mesh; ring2: THREE.Mesh } {
  const obj = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(p.r, 0.65, 8, 48),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.6, 2.2), toneMapped: false }),
  );
  ring.position.y = p.r;
  obj.add(ring);
  // A second, broken ring of segments turning slowly inside it.
  const segs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.TorusGeometry(p.r - 1.4, 0.25, 4, 8, Math.PI / 5);
    g.rotateZ((i / 6) * Math.PI * 2);
    segs.push(g);
  }
  const ring2 = new THREE.Mesh(
    mergeGeometries(segs) as THREE.BufferGeometry,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 2.4), toneMapped: false }),
  );
  for (const g of segs) g.dispose();
  ring2.position.y = p.r;
  obj.add(ring2);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(p.r - 0.4, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.4, 0.9, 1.4),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  disc.position.y = p.r;
  obj.add(disc);
  // Feet: two dark iron pads the ring stands in.
  for (const s of [-1, 1]) {
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x2a1c18 }),
    );
    foot.position.set(s * (p.r * 0.55), 0.6, 0);
    obj.add(foot);
  }
  const glow = glowSprite(0x80d8ff, p.r * 5, 0.35);
  (glow.material as THREE.SpriteMaterial).fog = false;
  glow.position.y = p.r;
  obj.add(glow);
  // Square across its way, as the arches stand.
  obj.rotation.y = p.h + Math.PI / 2;
  return { obj, disc, ring2 };
}

export function buildRocksView(mat: THREE.Material): RocksView {
  const group = new THREE.Group();
  // The rocks, one merged mesh per 512 m cell, built round the cell's middle.
  const cells = new Map<string, Rock[]>();
  for (const r of ROCKS) {
    const key = `${Math.floor(r.x / 512)},${Math.floor(r.y / 512)}`;
    const list = cells.get(key) ?? [];
    list.push(r);
    cells.set(key, list);
  }
  const chunks: { mesh: THREE.Mesh; mx: number; my: number }[] = [];
  for (const [key, list] of cells) {
    const [i, j] = key.split(',').map(Number);
    const mx = (i + 0.5) * 512;
    const my = (j + 0.5) * 512;
    const parts: THREE.BufferGeometry[] = [];
    for (const r of list) rockParts(r, mx, my, parts);
    if (!parts.length) continue;
    const geo = mergeGeometries(parts) as THREE.BufferGeometry;
    for (const g of parts) g.dispose();
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    chunks.push({ mesh, mx, my });
  }
  const arches = ROCK_ARCHES.map((a) => {
    const mesh = new THREE.Mesh(archGeo(a), mat);
    mesh.rotation.y = a.h + Math.PI / 2;
    group.add(mesh);
    // The feet stand at the walls' foot, a little up them: the lower one sets the arch's base.
    const px = -Math.sin(a.h) * a.r;
    const py = Math.cos(a.h) * a.r;
    const base = Math.min(marsBase(a.x + px, a.y + py), marsBase(a.x - px, a.y - py));
    return { mesh, a, base };
  });
  const portals = PORTALS.map((p) => {
    const v = portalObj(p);
    group.add(v.obj);
    return { ...v, p, base: marsBase(p.x, p.y) };
  });
  return {
    group,
    update(ox, oy, t) {
      for (const c of chunks) {
        c.mesh.visible = Math.hypot(c.mx - ox, c.my - oy) < 5000;
        c.mesh.position.set(c.mx - ox, 0, -(c.my - oy));
      }
      for (const ar of arches) {
        ar.mesh.visible = Math.hypot(ar.a.x - ox, ar.a.y - oy) < 4000;
        ar.mesh.position.set(ar.a.x - ox, ar.base, -(ar.a.y - oy));
      }
      for (const pv of portals) {
        pv.obj.visible = Math.hypot(pv.p.x - ox, pv.p.y - oy) < 4500;
        if (!pv.obj.visible) continue;
        pv.obj.position.set(pv.p.x - ox, pv.base, -(pv.p.y - oy));
        // The inner ring turns once in 12 s; the disc breathes over 3 s.
        pv.ring2.rotation.z = t * 0.52;
        (pv.disc.material as THREE.MeshBasicMaterial).opacity =
          0.1 + 0.05 * Math.sin((t / 3) * Math.PI * 2 + pv.p.x);
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.geometry.dispose();
          if (o.material !== mat) (o.material as THREE.Material).dispose();
        }
      });
    },
  };
}
