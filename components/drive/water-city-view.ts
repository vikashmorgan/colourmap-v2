/**
 * Water City, drawn (lib/art/water-city.ts; docs/specs/drive-tracks.md, "Water City"): the water
 * everywhere round the road (the shared water shader: rings from the car and the splashes, the
 * rain's dimples, the portals' light), the towers standing in it along the canals and the grand
 * canal with their reflections under it, the piers' columns, gold rails along the decks, the
 * portals of light over the road, the sharks and the kraken out on the open lake, and the rain.
 * Built per chunk along the road ahead, placed relative to the camera each frame.
 */

import * as THREE from 'three';
import {
  krakenRise,
  type Lair,
  type RippleTrail,
  type SharkSpot,
  SLAMMER,
  sharkPose,
  slamPose,
  TENTACLES,
  tentacleLine,
} from '@/lib/art/chinatown-lake';
import { frameAt, pointAt, type Track } from '@/lib/art/track';
import {
  towersBetween,
  WATER_LAIRS,
  WATER_LAP,
  WATER_PORTAL,
  WATER_PORTALS,
  WATER_SHARKS,
  waterElev,
  waterHalf,
} from '@/lib/art/water-city';
import { CityMesh, tower } from './lake-city-view';
import { WATER_TONES } from './lake-view';
import { makeKraken, makePortal, makeRain, makeSharks, makeWater } from './water-parts';

const CHUNK = 240;
const AHEAD = 1800;
const BEHIND = 300;
const SEGS = 22;
/** The water plane: this wide, re-centred on the camera every SNAP m. */
const PLANE = 6000;
const SNAP = 500;
/** The portals whose light lies on the water at once. */
const LIT = 8;

/** Water City's lap places as absolute spots near s (this lap and the next). */
function nearLaps<T>(
  s: number,
  list: readonly T[],
  at: (x: T) => number,
): { s: number; item: T }[] {
  const n = Math.floor(s / WATER_LAP);
  const out: { s: number; item: T }[] = [];
  for (const k of [n - 1, n, n + 1])
    for (const item of list) {
      const abs = k * WATER_LAP + at(item);
      if (abs >= 0) out.push({ s: abs, item });
    }
  return out;
}

/** The sharks as spots near s (absolute s). */
export function waterSharkSpots(s: number): SharkSpot[] {
  return nearLaps(s, WATER_SHARKS, (x) => x[0])
    .filter((p) => Math.abs(p.s - s) < 1500)
    .map(({ s: at, item: [, u, way, every, phase] }) => ({ s: at, u, way, every, phase }));
}

/** The kraken's lairs near s (absolute s; the road's frame: facing along it). */
export function waterLairsNear(s: number): Lair[] {
  return nearLaps(s, WATER_LAIRS, (x) => x[0])
    .filter((p) => Math.abs(p.s - s) < 1500)
    .map(({ s: at, item: [, u] }) => ({ s: at, u, way: 0 }));
}

export interface WaterFrame {
  cam: { x: number; y: number; z: number };
  s: number;
  ripples: RippleTrail;
  /** The lairs near you, when each woke (null asleep), how far past each you are, and where each
   * slams. */
  lairs: { lair: Lair; woke: number | null; past: number; aim: { s: number; u: number } }[];
  rain: number;
}

export interface WaterCityView {
  group: THREE.Group;
  update(ox: number, oy: number, t: number, dt: number, f: WaterFrame): void;
  dispose(): void;
}

export function buildWaterCityView(track: Track): WaterCityView {
  const outer = new THREE.Group();
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => {
    owned.push(x);
    return x;
  };
  const cityBody = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const cityLit = own(
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }),
  );
  const stone = own(
    new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.5, metalness: 0.2 }),
  );
  const gold = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.05, 0.4), toneMapped: false }),
  );
  const teal = own(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.1, 1.3), toneMapped: false }),
  );
  const colGeo = own(new THREE.CylinderGeometry(0.6, 0.8, 1, 8));
  const lampGeo = own(new THREE.SphereGeometry(0.3, 8, 6));
  const ringGeo = own(new THREE.TorusGeometry(WATER_PORTAL.R, 0.34, 10, 64));
  const discGeo = own(new THREE.CircleGeometry(WATER_PORTAL.R - 0.3, 48));

  /* The water, everywhere: a broad sheet at the water's level, re-centred on the camera. */
  const water = makeWater(LIT, 0);
  own(water.material);
  const plane = own(new THREE.PlaneGeometry(PLANE, PLANE, 1, 1));
  plane.rotateX(-Math.PI / 2);
  const sheet = new THREE.Mesh(plane, water.material);
  sheet.renderOrder = 2;
  sheet.frustumCulled = false;
  outer.add(sheet);
  let anchor = { x: Number.NaN, y: Number.NaN };

  /* The chunks: towers and their reflections, the piers' columns and rails, the portals. */
  const chunks = new Map<number, { group: THREE.Group; x: number; y: number }>();
  function buildChunk(i: number) {
    const s0 = i * CHUNK;
    const s1 = s0 + CHUNK;
    const f0 = frameAt(track, s0);
    const g = new THREE.Group();
    const L = (x: number, y: number, z: number): [number, number, number] => [
      x - f0.x,
      z,
      -(y - f0.y),
    ];
    // The towers, standing in the water, mirrored under it.
    const body = new CityMesh();
    const lit = new CityMesh();
    towersBetween(s0, s1).forEach((tw, k) => {
      const f = frameAt(track, tw.s);
      const c = Math.cos(f.h);
      const sn = Math.sin(f.h);
      const P = (a: number, b: number, h: number) => {
        const x = f.x + c * a - sn * b;
        const y = f.y + sn * a + c * b;
        return L(x, y, h);
      };
      tower(
        { a: 0, b: tw.u, w: tw.w, d: tw.d, h: tw.h, tone: tw.tone, crown: tw.h > 120 },
        i * 97 + k,
        P,
        body,
        lit,
        WATER_TONES,
        0,
      );
    });
    if (body.pos.length) g.add(new THREE.Mesh(body.geometry(), cityBody));
    if (lit.pos.length) g.add(new THREE.Mesh(lit.geometry(), cityLit));
    // The decks: columns down to the water both sides every 14 m, gold lamps on the rails, a teal
    // line along each edge where the road is the water.
    const cols: THREE.Matrix4[] = [];
    const lamps: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    for (let s = Math.ceil(s0 / 14) * 14; s < s1; s += 14) {
      const e = waterElev(s);
      const half = waterHalf(s);
      for (const side of [1, -1]) {
        const p = pointAt(track, s, side * (half + 1.6));
        if (e > 0.6) {
          const [x, , z] = L(p.x, p.y, 0);
          cols.push(
            m
              .clone()
              .compose(
                new THREE.Vector3(x, (e - 0.6) / 2, z),
                new THREE.Quaternion(),
                new THREE.Vector3(1, Math.max(0.1, e - 0.6), 1),
              ),
          );
        }
        if (Math.round(s / 14) % 2 === 0) {
          const [x, y, z] = L(p.x, p.y, e + (e > 0.6 ? 1.3 : 0.5));
          lamps.push(m.clone().makeTranslation(x, y, z));
        }
      }
    }
    if (cols.length) {
      const im = new THREE.InstancedMesh(colGeo, stone, cols.length);
      cols.forEach((c, k) => im.setMatrixAt(k, c));
      g.add(im);
    }
    if (lamps.length) {
      const deck = waterElev((s0 + s1) / 2) > 0.6;
      const im = new THREE.InstancedMesh(lampGeo, deck ? gold : teal, lamps.length);
      lamps.forEach((c, k) => im.setMatrixAt(k, c));
      g.add(im);
    }
    // The portals of light standing over the road.
    for (const { s, item } of nearLaps(s0, WATER_PORTALS, (x) => x[0])) {
      if (s < s0 || s >= s1) continue;
      const p = makePortal(ringGeo, discGeo);
      const f = frameAt(track, s);
      const at = pointAt(track, s, item[1]);
      p.group.position.set(...L(at.x, at.y, f.e + WATER_PORTAL.LIFT));
      p.group.rotation.y = f.h + Math.PI / 2;
      p.set(false, 0, 0);
      p.group.userData.portal = p;
      g.add(p.group);
    }
    for (const o of g.children) o.frustumCulled = false;
    return { group: g, x: f0.x, y: f0.y };
  }

  const shared = new Set<THREE.BufferGeometry>([colGeo, lampGeo, ringGeo, discGeo]);
  /** A chunk's own geometry and its portals' materials, freed (the shared pieces kept). */
  function dropChunk(g: THREE.Group) {
    g.traverse((o) => {
      const p = o.userData.portal as ReturnType<typeof makePortal> | undefined;
      if (p) p.dispose();
      if (o instanceof THREE.Mesh && !shared.has(o.geometry)) o.geometry.dispose();
    });
  }

  /* The sharks, the kraken, the rain. */
  const sharks = own(makeSharks(WATER_SHARKS.length * 2, outer));
  const kraken = own(makeKraken(4 * (TENTACLES.length * SEGS + 1), outer));
  const rain = own(makeRain());
  outer.add(rain.group);

  return {
    group: outer,
    update(ox, oy, t, dt, f) {
      // The water, re-centred under the camera now and then (its shader works in local metres).
      const ax = Math.round(f.cam.x / SNAP) * SNAP;
      const ay = Math.round(f.cam.y / SNAP) * SNAP;
      if (ax !== anchor.x || ay !== anchor.y) anchor = { x: ax, y: ay };
      // A hair under the road where the road is the water, so the two never flicker.
      sheet.position.set(ax - ox, -0.08, -(ay - oy));
      water.update(
        t,
        { x: f.cam.x - ax, y: f.cam.y - ay, z: f.cam.z },
        0.3 + 0.7 * f.rain,
        f.ripples.rings,
        ax,
        ay,
      );
      const lights = nearLaps(f.s, WATER_PORTALS, (x) => x[0])
        .filter((p) => p.s > f.s - 200)
        .sort((a, b) => a.s - b.s)
        .slice(0, LIT);
      for (let i = 0; i < LIT; i++) {
        const p = lights[i];
        if (!p) {
          water.portals[i].set(0, 0, 0, 0);
          continue;
        }
        const at = pointAt(track, p.s, p.item[1]);
        // On the water only (over a deck the light falls on the road, not the lake).
        water.portals[i].set(at.x - ax, at.y - ay, 0, waterElev(p.s) < 0.6 ? 1 : 0.3);
      }

      // The chunks ahead.
      const first = Math.max(0, Math.floor((f.s - BEHIND) / CHUNK));
      const last = Math.floor((f.s + AHEAD) / CHUNK);
      for (const [i, c] of chunks)
        if (i < first || i > last) {
          outer.remove(c.group);
          dropChunk(c.group);
          chunks.delete(i);
        }
      let built = 0;
      const budget = chunks.size === 0 ? 99 : 1;
      for (let i = first; i <= last && built < budget; i++) {
        if (chunks.has(i)) continue;
        const c = buildChunk(i);
        chunks.set(i, c);
        outer.add(c.group);
        built++;
      }
      for (const c of chunks.values()) {
        c.group.position.set(c.x - ox, 0, -(c.y - oy));
        c.group.traverse((o) => {
          const p = o.userData.portal as ReturnType<typeof makePortal> | undefined;
          if (p) p.set(Math.sin(t * 0.8 + o.position.x) > 0.6, t, 0);
        });
      }

      // The sharks breaching beside the open lake.
      const spots = waterSharkSpots(f.s);
      for (let i = 0; i < WATER_SHARKS.length * 2; i++) {
        const sp = spots[i];
        const p = sp ? sharkPose(sp, t) : null;
        if (!sp || !p) {
          sharks.place(i, null);
          continue;
        }
        const at = pointAt(track, p.s, p.u);
        sharks.place(
          i,
          [at.x - ox, p.z - 0.4, -(at.y - oy)],
          frameAt(track, p.s).h + p.way,
          p.pitch,
        );
      }

      // The kraken.
      kraken.begin();
      for (const l of f.lairs) {
        if (l.woke === null) continue;
        const since = t - l.woke;
        const rise = krakenRise(since, l.past);
        if (rise <= 0.001) continue;
        const pose = slamPose(since);
        for (let j = 0; j < TENTACLES.length; j++) {
          const pts = tentacleLine(
            l.lair,
            j,
            rise,
            t,
            SEGS,
            j === SLAMMER
              ? { lift: pose.lift, down: pose.down, ts: l.aim.s, tu: l.aim.u }
              : undefined,
            Math.round(l.lair.s / 1000),
          );
          kraken.tentacle(
            pts.map((pt) => {
              const at = pointAt(track, pt.s, pt.u);
              return [at.x - ox, pt.z - 1, -(at.y - oy)] as [number, number, number];
            }),
            2.6 * (TENTACLES[j].tall / 26),
          );
        }
        const mid = pointAt(track, l.lair.s, l.lair.u + 60);
        kraken.bulk([mid.x - ox, -6 + 3 * rise, -(mid.y - oy)]);
      }
      kraken.end();

      rain.update(f.cam, ox, oy, dt, f.rain);
    },
    dispose() {
      for (const c of chunks.values()) dropChunk(c.group);
      chunks.clear();
      for (const o of owned) o.dispose();
    },
  };
}
