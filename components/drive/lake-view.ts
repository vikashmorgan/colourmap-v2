/**
 * The lake behind Chinatown Run's start, drawn (lib/art/chinatown-lake.ts; docs/specs/drive-tracks.md,
 * "The lake behind the start"): the dark slipway down from the street, the quay, the water in the
 * rain (rings spreading from the car, drops dimpling it, the portals' light lying on it), the seven
 * portals of light, the sharks breaching, the kraken's tentacles, the rain itself, and Water City lit
 * on the far shore, mirrored in the lake. One group in the road's frame at the start, placed
 * relative to the camera each frame like the track's chunks.
 */

import * as THREE from 'three';
import {
  FAR_GATE,
  KRAKEN,
  krakenRise,
  LAKE,
  type LakeRun,
  lairPoint,
  PORTAL,
  PORTALS,
  portalFacing,
  type RippleTrail,
  SHARKS,
  SLAMMER,
  SLIP,
  sharkAt,
  slamPose,
  slipHeight,
  TENTACLES,
  tentaclePoints,
} from '@/lib/art/chinatown-lake';
import { buildLakeCity, type V3 } from './lake-city-view';
import { makeKraken, makePortal, makeRain, makeSharks, makeWater } from './water-parts';

/** Water City's lights on the far shore: teal, deep blue, gold, pale aqua. */
export const WATER_TONES: V3[] = [
  [1.6, 1.15, 0.45],
  [0.25, 1.1, 1.3],
  [0.35, 0.55, 1.6],
  [0.7, 1.4, 1.3],
];

/** The far shore's city: laid as the lake cities are, its anchor this far behind the start. */
const CITY_AT = -2080;
const CITY_SEED = 2600;
const SEGS = 22;

export interface LakeFrame {
  /** The camera, and where along the road you are. */
  cam: { x: number; y: number; z: number };
  s: number;
  run: LakeRun;
  ripples: RippleTrail;
  /** When each lair's kraken woke (null asleep), and how far past each you are (m along the S). */
  woke: (number | null)[];
  past: number[];
  /** Where each lair's slam is aimed (road s, u). */
  aim: { s: number; u: number }[];
  /** How much of the storm is about you (0 on the street, 1 out on the lake). */
  storm: number;
  /** Whether Water City is found (its gate on the far shore then stands lit). */
  found: boolean;
}

export interface LakeView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number, dt: number, f: LakeFrame): void;
  dispose(): void;
}

/** The lake's view, its anchor the road's start (x0, y0) heading h0 there. */
export function buildLakeView(x0: number, y0: number, h0: number): LakeView {
  const group = new THREE.Group();
  const c = Math.cos(h0);
  const sn = Math.sin(h0);
  /** Road (s, u) behind the start to local world (dx, dy) from the anchor. */
  const W = (s: number, u: number) => ({ x: c * s - sn * u, y: sn * s + c * u });
  /** And to the scene (x, height, −y). */
  const S = (s: number, u: number, z: number): [number, number, number] => {
    const p = W(s, u);
    return [p.x, z, -p.y];
  };
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => {
    owned.push(x);
    return x;
  };

  /* The slipway, its walls and the quay. */
  const stone = new THREE.MeshStandardMaterial({
    color: 0x0b0d10,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  own(stone);
  const lineMat = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.0, 1.15), toneMapped: false }),
  );
  const goldMat = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.05, 0.4), toneMapped: false }),
  );
  {
    const pos: number[] = [];
    const lines: number[] = [];
    const quad = (out: number[], a: number[], b: number[], cc: number[], d: number[]) =>
      out.push(...a, ...b, ...cc, ...a, ...cc, ...d);
    const wall = SLIP.HALF + SLIP.WALL;
    const end = -SLIP.LEN - 10;
    for (let s = 0; s > end; s -= 4) {
      const s1 = Math.max(end, s - 4);
      const z0 = Math.max(LAKE.LEVEL - 0.3, slipHeight(s));
      const z1 = Math.max(LAKE.LEVEL - 0.3, slipHeight(s1));
      quad(pos, S(s, -wall, z0), S(s, wall, z0), S(s1, wall, z1), S(s1, -wall, z1));
      for (const side of [1, -1]) {
        const u = side * wall;
        // A low wall, a thin teal line along its top: the only light on the way down.
        quad(pos, S(s, u, z0 - 3), S(s, u, z0 + 1.1), S(s1, u, z1 + 1.1), S(s1, u, z1 - 3));
        quad(
          lines,
          S(s, u, z0 + 1.1),
          S(s, u - side * 0.12, z0 + 1.12),
          S(s1, u - side * 0.12, z1 + 1.12),
          S(s1, u, z1 + 1.1),
        );
      }
    }
    // The quay across the slipway's foot, either side out to the lake's edges.
    for (const side of [1, -1])
      for (let u = wall; u < LAKE.HALF; u += 20) {
        const a = side * u;
        const b = side * Math.min(LAKE.HALF, u + 20);
        const q = -SLIP.LEN;
        quad(pos, S(q, a, LAKE.LEVEL - 2), S(q, b, LAKE.LEVEL - 2), S(q, b, 0.8), S(q, a, 0.8));
        quad(pos, S(q, a, 0.8), S(q, b, 0.8), S(q + 30, b, 0.8), S(q + 30, a, 0.8));
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(own(geo), stone));
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    group.add(new THREE.Mesh(own(lg), lineMat));
    // Gold lamps along the quay's edge, and dim buoys marking the lake's far edges.
    const lamp = own(new THREE.SphereGeometry(0.35, 8, 6));
    const lamps: THREE.Vector3[] = [];
    for (const side of [1, -1])
      for (let u = wall + 10; u < LAKE.HALF; u += 40)
        lamps.push(new THREE.Vector3(...S(-SLIP.LEN, side * u, 1.6)));
    for (let s = -SLIP.LEN - 40; s > -LAKE.BACK; s -= 60)
      for (const side of [1, -1])
        lamps.push(new THREE.Vector3(...S(s, side * LAKE.HALF, LAKE.LEVEL + 0.6)));
    for (let u = -LAKE.HALF; u <= LAKE.HALF; u += 60)
      lamps.push(new THREE.Vector3(...S(-LAKE.BACK, u, LAKE.LEVEL + 0.6)));
    const lampMesh = new THREE.InstancedMesh(lamp, goldMat, lamps.length);
    const m = new THREE.Matrix4();
    lamps.forEach((p, i) => {
      lampMesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
    });
    lampMesh.frustumCulled = false;
    group.add(lampMesh);
  }

  /* The water. */
  const water = makeWater(PORTALS.length, LAKE.LEVEL);
  const waterMat = own(water.material);
  PORTALS.forEach(([s, u], i) => {
    const p = W(s, u);
    water.portals[i].set(p.x, p.y, 0, 1);
  });
  {
    // Wider than the lake's edges and on under the far shore's city, so it meets the horizon.
    const pos: number[] = [];
    const near = -SLIP.LEN + 30;
    const far = -LAKE.BACK - 900;
    const wide = LAKE.HALF + 900;
    const n = 24;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const s0 = near + ((far - near) * i) / n;
        const s1 = near + ((far - near) * (i + 1)) / n;
        const u0 = -wide + (2 * wide * j) / n;
        const u1 = -wide + (2 * wide * (j + 1)) / n;
        const a = S(s0, u0, LAKE.LEVEL);
        const b = S(s0, u1, LAKE.LEVEL);
        const cc = S(s1, u1, LAKE.LEVEL);
        const d = S(s1, u0, LAKE.LEVEL);
        pos.push(...a, ...b, ...cc, ...a, ...cc, ...d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const water = new THREE.Mesh(own(geo), waterMat);
    water.renderOrder = 2;
    water.frustumCulled = false;
    group.add(water);
  }

  /* Water City on the far shore, mirrored in the lake. */
  const cityBody = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const cityLit = own(
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }),
  );
  const city = buildLakeCity(CITY_SEED, h0 + Math.PI / 2, waterMat, cityBody, cityLit, 1, 0, {
    tones: WATER_TONES,
    water: false,
  });
  const cp = W(CITY_AT, 0);
  city.position.set(cp.x, 0, -cp.y);
  group.add(city);

  /* The portals of light, and the far shore's gate into Water City (lit once it is found). */
  const ringGeo = own(new THREE.TorusGeometry(PORTAL.R, 0.32, 10, 64));
  const discGeo = own(new THREE.CircleGeometry(PORTAL.R - 0.3, 48));
  const portals = PORTALS.map(([s, u], i) => {
    const p = own(makePortal(ringGeo, discGeo));
    p.group.position.set(...S(s, u, LAKE.LEVEL + PORTAL.LIFT));
    p.group.rotation.y = h0 + portalFacing(i) + Math.PI / 2;
    group.add(p.group);
    return p;
  });
  const gate = own(makePortal(ringGeo, discGeo));
  gate.group.scale.setScalar(FAR_GATE.R / PORTAL.R);
  gate.group.position.set(...S(FAR_GATE.S, 0, LAKE.LEVEL + FAR_GATE.LIFT));
  gate.group.rotation.y = h0 + Math.PI / 2;
  group.add(gate.group);

  /* The sharks, the kraken, the rain. */
  const sharks = own(makeSharks(SHARKS.length, group));
  const kraken = own(makeKraken(KRAKEN.LAIRS.length * (TENTACLES.length * SEGS + 1), group));
  const rain = own(makeRain());

  return {
    group: (() => {
      const outer = new THREE.Group();
      outer.add(group, rain.group);
      return outer;
    })(),
    update(ox, oy, t, dt, f) {
      group.position.set(x0 - ox, 0, -(y0 - oy));
      water.update(
        t,
        { x: f.cam.x - x0, y: f.cam.y - y0, z: f.cam.z },
        0.4 + 0.6 * f.storm,
        f.ripples.rings,
        x0,
        y0,
      );
      PORTALS.forEach((_, i) => {
        const lit = f.run.lit[i];
        water.portals[i].z = lit ? 1 : 0;
        portals[i].set(lit, t, i);
      });
      gate.group.visible = f.found;
      if (f.found) gate.set(true, t, 0);

      // Sharks in the air: nose along the leap (world heading h0 + way), up out, down back in.
      SHARKS.forEach((_, i) => {
        const p = sharkAt(i, t);
        sharks.place(i, p && S(p.s, p.u, LAKE.LEVEL + p.z - 0.4), h0 + (p?.way ?? 0), p?.pitch);
      });

      // The kraken.
      kraken.begin();
      for (let l = 0; l < KRAKEN.LAIRS.length; l++) {
        const woke = f.woke[l];
        if (woke === null) continue;
        const since = t - woke;
        const rise = krakenRise(since, f.past[l]);
        if (rise <= 0.001) continue;
        const pose = slamPose(since);
        for (let j = 0; j < TENTACLES.length; j++) {
          const pts = tentaclePoints(
            l,
            j,
            rise,
            t,
            SEGS,
            j === SLAMMER
              ? { lift: pose.lift, down: pose.down, ts: f.aim[l].s, tu: f.aim[l].u }
              : undefined,
          );
          kraken.tentacle(
            pts.map((pt) => S(pt.s, pt.u, LAKE.LEVEL - 1 + pt.z)),
            2.6 * (TENTACLES[j].tall / 26),
          );
        }
        // The lair's bulk, just breaking the water.
        const mid = lairPoint(l, 0, 0);
        kraken.bulk(S(mid.s, mid.u, LAKE.LEVEL - 6 + 3 * rise));
      }
      kraken.end();

      // The rain round the camera, heavier out on the lake.
      rain.update(f.cam, ox, oy, dt, f.storm);
    },
    dispose() {
      for (const o of owned) o.dispose();
      city.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
