/**
 * Drive, Mars: the small mesh helpers the Mars views share (components/drive/mars-view.ts,
 * mars-rocks-view.ts): parts painted one colour per face from a palette, placed by a matrix, and
 * struts between two points. Everything is merged into one mesh per thing by the caller.
 */

import * as THREE from 'three';

/** The rust palette (sRGB): rust, ochre, dark iron, burnt umber, pale dust. */
export const RUST = [0x8a3a1c, 0xa65a2a, 0xc0803a, 0x3a2620, 0x5a3424, 0x2a1c18, 0x9a6a48];

export function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A part: its geometry (made non-indexed) painted one colour per face from a few, placed by m. */
export function part(
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

export const M = () => new THREE.Matrix4();
export const at = (x: number, y: number, z: number) => M().makeTranslation(x, y, z);
const q = new THREE.Quaternion();
const e = new THREE.Euler();
export function place(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  return M().compose(
    new THREE.Vector3(x, y, z),
    q.setFromEuler(e.set(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
}

/** A strut from a to b (a thin box), for lattices and trusses. */
export function strut(
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
