/*
 * The Symphony's moving pieces (docs/specs/symphony-track.md; the maths is lib/art/symphony.ts):
 * - the ring gates, three rings inside one another turning about the road at golden-ratio speeds,
 *   their gaps lining up only for a moment, built as each comes into view, dropped behind you;
 * - the space ripples bending the deck and its lines (a few lines spliced into their shaders,
 *   exactly rippleAt) and lifting the gates with them;
 * - the rainbows: a cone of light round the point opposite the sun, seen from the camera, so they
 *   stand at their real angle and slide as you turn.
 * The bridges, pillars and fire rows are static and stand in the design space's Maths pieces
 * (components/drive/design-space.ts).
 */

import * as THREE from 'three';

import {
  bowColour,
  eachSym,
  GATE,
  GATE_CENTRE,
  gateAngles,
  gateGlow,
  RAINBOW,
  RIPPLE,
  type Ripple,
  ringRadius,
  SYM_GATES,
  swell,
} from '@/lib/art/symphony';
import { frameAt, heightAt, type Track } from '@/lib/art/track';
import { glowSprite } from './vehicles';

/** How far ahead and behind gates are built (m). */
const AHEAD = 1600;
const BEHIND = 120;

/** The rings' light, outer to inner: gold, violet, pale gold (linear, past 1 to bloom). */
const RING_COLS: [number, number, number][] = [
  [1.6, 0.95, 0.32],
  [0.75, 0.45, 1.6],
  [1.7, 1.35, 0.8],
];
const TUBE = [0.62, 0.48, 0.36];

interface GateMesh {
  s: number;
  i: number;
  group: THREE.Group;
  rings: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  /** The light in the shared gap, shown as they line up. */
  key: THREE.Sprite;
  x: number;
  y: number;
}

export interface SymphonyView {
  group: THREE.Group;
  update(ox: number, oy: number, s: number, t: number): void;
  /** Bends a material's surface with the space ripples (the deck, its lines). */
  ripple(mat: THREE.Material): void;
  /** The space ripples now, the camera's height, and the rainbow (k its strength, 0 none). */
  space(
    ripples: readonly Ripple[],
    ox: number,
    oy: number,
    t: number,
    camZ: number,
    bow: { k: number; second: boolean },
  ): void;
  dispose(): void;
}

const f1 = (x: number) => x.toFixed(3);

/** The ripples in GLSL: exactly rippleAt (lib/art/symphony.ts), over the shader's slots. Each slot
 * is (x, z) in three's frame against the floating origin, its age (s) and its strength. */
export const RIPPLE_GLSL = /* glsl */ `
uniform vec4 uRip[${RIPPLE.MAX}];
float ripSwell(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < ${RIPPLE.MAX}; i++) {
    vec4 r = uRip[i];
    if (r.w == 0.0 || r.z <= 0.0 || r.z >= ${f1(RIPPLE.LIFE)}) continue;
    float z = length(p - r.xy) - ${f1(RIPPLE.SPEED)} * r.z;
    float q = z / ${f1(RIPPLE.WIDTH)};
    float life = min(1.0, r.z / 0.4) * pow(1.0 - r.z / ${f1(RIPPLE.LIFE)}, 2.0);
    h += ${f1(RIPPLE.AMP)} * r.w * life * exp(-q * q) * sin(6.2831853 * z / ${f1(RIPPLE.WAVE)});
  }
  return h;
}
`;

/** How far the bow is drawn (m): well inside the far plane, beyond everything near. */
const BOW_FAR = 3000;

/** A bow as a band of a cone round the point opposite the sun (`anti`, three's frame), seen from
 * the camera: the primary from just inside its violet edge to just outside its red, or the second
 * bow, reversed. Its colours baked, faded under the horizon. */
function bowGeometry(anti: THREE.Vector3, second: boolean): THREE.BufferGeometry {
  const a = anti.clone().normalize();
  const b = new THREE.Vector3(0, 1, 0).cross(a).normalize();
  const c = a.clone().cross(b).normalize();
  const [d0, d1] = second
    ? [RAINBOW.RED2 - 0.4, RAINBOW.VIOLET2 + 0.4]
    : [RAINBOW.VIOLET - 0.4, RAINBOW.RED + 0.4];
  const RINGS = 14;
  const SEG = 160;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const d = new THREE.Vector3();
  for (let i = 0; i <= RINGS; i++) {
    const deg = d0 + ((d1 - d0) * i) / RINGS;
    const th = (deg * Math.PI) / 180;
    const rgb = bowColour(deg, second);
    for (let j = 0; j <= SEG; j++) {
      const ph = (j / SEG) * Math.PI * 2;
      d.copy(a)
        .multiplyScalar(Math.cos(th))
        .addScaledVector(b, Math.sin(th) * Math.cos(ph))
        .addScaledVector(c, Math.sin(th) * Math.sin(ph));
      // Only over the horizon, fading in just above it.
      const over = Math.min(1, Math.max(0, d.y / 0.05));
      pos.push(d.x * BOW_FAR, d.y * BOW_FAR, d.z * BOW_FAR);
      col.push(rgb[0] * over, rgb[1] * over, rgb[2] * over);
    }
  }
  for (let i = 0; i < RINGS; i++)
    for (let j = 0; j < SEG; j++) {
      const p = i * (SEG + 1) + j;
      const q = p + SEG + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export function buildSymphonyView(track: Track, sunDir: THREE.Vector3): SymphonyView {
  const group = new THREE.Group();
  const gates = new Map<number, GateMesh>();
  const ringGeos = RING_COLS.map(
    (_, k) => new THREE.TorusGeometry(ringRadius(k), TUBE[k], 8, 128, Math.PI * 2 - GATE.GAP),
  );
  const rip = { value: Array.from({ length: RIPPLE.MAX }, () => new THREE.Vector4()) };
  let live: readonly Ripple[] = [];
  let now = 0;
  const bowMats = [0, 1].map(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      }),
  );
  const anti = sunDir.clone().negate();
  const bows = [false, true].map((second, i) => {
    const m = new THREE.Mesh(bowGeometry(anti, second), bowMats[i]);
    m.frustumCulled = false;
    m.visible = false;
    group.add(m);
    return m;
  });

  function buildGate(s: number, i: number): GateMesh {
    const f = frameAt(track, s);
    const g = new THREE.Group();
    g.rotation.set(0, f.h + Math.PI / 2, -f.bank, 'YXZ');
    const rings: THREE.Mesh[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];
    RING_COLS.forEach((c, k) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(...c),
        toneMapped: false,
      });
      const m = new THREE.Mesh(ringGeos[k], mat);
      m.position.y = GATE_CENTRE;
      m.frustumCulled = false;
      g.add(m);
      rings.push(m);
      mats.push(mat);
    });
    const key = glowSprite(new THREE.Color(1.8, 1.3, 0.7), 26, 0);
    key.position.y = GATE_CENTRE;
    g.add(key);
    group.add(g);
    return { s, i, group: g, rings, mats, key, x: f.x, y: f.y };
  }

  const drop = (m: GateMesh) => {
    group.remove(m.group);
    for (const mat of m.mats) mat.dispose();
    m.key.material.dispose();
  };

  return {
    group,
    update(ox, oy, s, t) {
      const want = eachSym(SYM_GATES, Math.max(0, s - BEHIND), s + AHEAD);
      const keep = new Set(want.map((w) => w.s));
      for (const [at, m] of gates)
        if (!keep.has(at)) {
          drop(m);
          gates.delete(at);
        }
      for (const w of want) if (!gates.has(w.s)) gates.set(w.s, buildGate(w.s, w.i));
      for (const m of gates.values()) {
        // The gates ride the ripples with the deck.
        const e = heightAt(track, m.s, 0, true) + swell(live, m.x, m.y, now);
        m.group.position.set(m.x - ox, e, -(m.y - oy));
        const angles = gateAngles(m.i, t);
        const glow = gateGlow(m.i, t);
        m.rings.forEach((r, k) => {
          // The torus's arc starts at its +x (the road's left) and runs counter-clockwise: turn it
          // so its gap is centred on the gap's angle.
          r.rotation.z = angles[k] + GATE.GAP / 2;
          const c = RING_COLS[k];
          const b = 0.7 + 1.1 * glow;
          m.mats[k].color.setRGB(c[0] * b, c[1] * b, c[2] * b);
        });
        // Where the gaps meet: the light of the way through, at the middle ring's radius.
        let cx = 0;
        let cy = 0;
        for (const a of angles) {
          cx += Math.cos(a);
          cy += Math.sin(a);
        }
        const a = Math.atan2(cy, cx);
        const r = ringRadius(1);
        m.key.position.set(Math.cos(a) * r, GATE_CENTRE + Math.sin(a) * r, 0);
        m.key.material.opacity = glow * glow * 0.9;
      }
    },
    ripple(mat) {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uRip = rip;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', `#include <common>\n${RIPPLE_GLSL}`)
          .replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\n  { vec4 wq = modelMatrix * vec4(transformed, 1.0); transformed.y += ripSwell(wq.xz); }',
          );
      };
      mat.customProgramCacheKey = () => 'symphony-ripple';
      mat.needsUpdate = true;
    },
    space(ripples, ox, oy, t, camZ, bow) {
      live = ripples;
      now = t;
      for (let i = 0; i < RIPPLE.MAX; i++) {
        const r = ripples[i];
        if (r) rip.value[i].set(r.x - ox, -(r.y - oy), t - r.t0, r.amp);
        else rip.value[i].set(0, 0, 0, 0);
      }
      bows.forEach((m, i) => {
        const k = i === 0 ? bow.k : bow.second ? bow.k : 0;
        m.visible = k > 0.002;
        m.position.set(0, camZ, 0);
        bowMats[i].opacity = 0.55 * k;
      });
    },
    dispose() {
      for (const m of gates.values()) drop(m);
      gates.clear();
      for (const g of ringGeos) g.dispose();
      for (const m of bows) m.geometry.dispose();
      for (const m of bowMats) m.dispose();
    },
  };
}
