import { describe, expect, it } from 'vitest';

import { flow } from './bigbang';
import {
  CHANNEL_W,
  CLOWNS,
  camera,
  clownFish,
  colour,
  corals,
  EYE_H,
  HUNT_LAP,
  hasPointer,
  hasVariants,
  hunterAt,
  JELLY_NAMES,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  pulseOf,
  REEF_SLOTS,
  reefSlot,
  SHOAL_KINDS,
  STEP_COLOURS,
  SWARM_NAMES,
  setPointer,
  setShoalKind,
  setVariant,
  shoalFish,
  smallFish,
  starBall,
  TOTAL,
  target,
  variantLabel,
  variantNames,
} from './ocean';

const particles = makeParticles(1500);
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const at = (k: number, u: number) =>
  (PHASE_START[k] as number) + u * (PHASES[k]?.duration as number);

describe('the ocean chapter', () => {
  it('has eight pieces, from a coral garden to the reef, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'coral',
      'fans',
      'tables',
      'fish-pulse',
      'shoal',
      'sardines',
      'jellyfish',
      'reef',
    ]);
    for (const p of PHASES) {
      expect(p.words).toHaveLength(2);
      expect(p.line.length).toBeGreaterThan(20);
    }
    expect(STEP_COLOURS).toHaveLength(PHASES.length);
    expect(TOTAL).toBe(PHASES.reduce((s, p) => s + p.duration, 0));
    expect(phaseAt(TOTAL + 1).index).toBe(0);
  });

  it('opens every piece from a wide ball of faint stars', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const t = at(k, 0);
      for (const p of particles.slice(0, 50)) {
        expect(target(k, p, 0, t)).toEqual(starBall(k, p, t));
        expect(Math.max(...colour(k, p, 0, t))).toBeLessThan(0.35);
      }
    }
  });

  it('keeps every grain somewhere real, in every piece and between them', () => {
    for (let k = 0; k < PHASES.length; k++) {
      for (const u of [0, 0.3, 0.6, 0.85, 0.99]) {
        for (const p of particles.slice(0, 300)) {
          const { pos, rgb } = particleAt(p, at(k, u));
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it('pours each grain into the next piece with no cut', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const next = (k + 1) % PHASES.length;
      const t = at(k, 0.9999);
      for (const p of particles.slice(0, 200)) {
        expect(flow(p, 0.9999)).toBeCloseTo(1, 3);
        expect(dist(particleAt(p, t).pos, target(next, p, 0, t))).toBeLessThan(0.05);
      }
    }
  });

  it('grows the corals up from the sand like trees', () => {
    const all = corals();
    expect(all).toHaveLength(7);
    for (const c of all) expect(c.routes.length).toBeGreaterThan(20);
    const height = (u: number) =>
      Math.max(...particles.filter((p) => p.c >= 0.34).map((p) => target(0, p, u, at(0, u))[1]));
    // Grown by mid-piece: standing up from the sand at -14, none of it below.
    expect(height(0.6)).toBeGreaterThan(-14 + 8);
    for (const p of particles.filter((q) => q.c >= 0.34)) {
      expect(target(0, p, 0.6, at(0, 0.6))[1]).toBeGreaterThan(-14 - 1);
    }
  });

  it('keeps the shoal together and pointing the same way', () => {
    const t = at(
      PHASES.findIndex((p) => p.id === 'shoal'),
      0.5,
    );
    const fish = Array.from({ length: 36 }, (_, j) => shoalFish(j, 0.5, t));
    const c = [0, 1, 2].map((i) => fish.reduce((s, f) => s + (f.c[i] as number), 0) / fish.length);
    for (const f of fish) expect(dist(f.c, c)).toBeLessThan(16);
    const mean = [0, 1, 2].map(
      (i) => fish.reduce((s, f) => s + (f.f[i] as number), 0) / fish.length,
    );
    expect(Math.hypot(...mean)).toBeGreaterThan(0.6);
  });

  it('pulses each jellyfish between open and drawn in', () => {
    const pulls = Array.from({ length: 60 }, (_, i) => pulseOf(3, i * 0.1));
    expect(Math.min(...pulls)).toBeLessThan(0.05);
    expect(Math.max(...pulls)).toBeGreaterThan(0.9);
  });

  it('swims the eye down the reef channel, corals on both sides', () => {
    const reef = PHASES.findIndex((p) => p.id === 'reef');
    const a = camera(at(reef, 0.2));
    const b = camera(at(reef, 0.6));
    expect(a.eye[1]).toBeCloseTo(EYE_H, 6);
    expect(b.eye[2]).toBeLessThan(a.eye[2] - 20);
    const xs = Array.from({ length: REEF_SLOTS }, (_, j) => reefSlot(j).x);
    expect(xs.some((x) => x < -CHANNEL_W)).toBe(true);
    expect(xs.some((x) => x > CHANNEL_W)).toBe(true);
    for (const x of xs) expect(Math.abs(x)).toBeGreaterThan(CHANNEL_W);
    for (let s = 0; s < TOTAL; s += 3) {
      const { eye, target: aim } = camera(s);
      expect(dist(eye, aim)).toBeGreaterThan(1);
    }
  });

  it('grows the sea fans and the table corals up from the sand', () => {
    for (const id of ['fans', 'tables']) {
      const k = PHASES.findIndex((p) => p.id === id);
      const grown = particles
        .filter((p) => p.c >= 0.34)
        .map((p) => target(k, p, 0.7, at(k, 0.7))[1]);
      expect(Math.max(...grown)).toBeGreaterThan(-14 + 5);
      expect(Math.min(...grown)).toBeGreaterThan(-14 - 1);
    }
  });

  it('hides the clownfish in their coral while the blue hunter passes, and lets them out once it has gone', () => {
    const start = PHASE_START[PHASES.findIndex((p) => p.id === 'fish-pulse')] as number;
    const near = (t: number) => {
      const { c } = hunterAt(t);
      return Math.hypot(c[0], c[1] + 9, c[2]);
    };
    const times = Array.from({ length: 200 }, (_, i) => start + (i / 200) * HUNT_LAP);
    const closest = times.reduce((a, b) => (near(b) < near(a) ? b : a));
    const farthest = times.reduce((a, b) => (near(b) > near(a) ? b : a));
    expect(near(farthest)).toBeGreaterThan(near(closest) + 20);
    for (let j = 0; j < CLOWNS; j++) {
      expect(clownFish(j, closest).out).toBeLessThan(0.05);
      expect(clownFish(j, farthest).out).toBeGreaterThan(0.95);
    }
    // Out in the water, well away from where they hid.
    const moved = Array.from({ length: CLOWNS }, (_, j) =>
      dist(clownFish(j, farthest).c, clownFish(j, closest).c),
    );
    expect(moved.reduce((x, y) => x + y, 0) / CLOWNS).toBeGreaterThan(4);
  });

  it('swims eleven kinds of shoal, each of one kind of fish, the big ones fewer and wider apart', () => {
    expect(SHOAL_KINDS.map((s) => s.name)).toEqual([
      'Silver fish',
      'Yellow tangs',
      'Barracudas',
      'Hammerheads',
      'Swordfish',
      'Thresher sharks',
      'Copperbands',
      'Threadfins',
      'Raccoons',
      'Longnoses',
      'Bannerfish',
    ]);
    // A thresher's upper tail lobe is as long as its body; a hammerhead's is the longer of its two.
    expect(SHOAL_KINDS[5]?.lobes?.[0]).toBeGreaterThan(0.8);
    const lobes = SHOAL_KINDS[3]?.lobes ?? [0, 0];
    expect(lobes[0]).toBeGreaterThan(lobes[1] * 2);
    const k = PHASES.findIndex((p) => p.id === 'shoal');
    for (let i = 0; i < SHOAL_KINDS.length; i++) {
      setShoalKind(i);
      for (const p of particles.slice(0, 300)) {
        const { pos, rgb } = particleAt(p, at(k, 0.5));
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    setShoalKind(0);
    const shark = SHOAL_KINDS[3];
    const tang = SHOAL_KINDS[1];
    expect(shark?.head).toBe('hammer');
    expect(SHOAL_KINDS[4]?.head).toBe('bill');
    expect((shark?.count ?? 0) < (tang?.count ?? 0)).toBe(true);
    expect((shark?.spread ?? 0) > (tang?.spread ?? 0)).toBe(true);
  });

  it('plays each piece on its own: no ball of stars at the start, looping with no seam', () => {
    for (let k = 0; k < PHASES.length; k++) {
      const len = pieceLength(k);
      for (const p of particles.slice(0, 100)) {
        expect(dist(pieceAt(p, k, 0).pos, starBall(k, p, 0))).toBeGreaterThan(1e-3);
      }
      for (const s of [0, 0.3 * len, 0.9 * len]) {
        for (const p of particles.slice(0, 200)) {
          const { pos, rgb } = pieceAt(p, k, s);
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        }
      }
      // Seen from the eye, the end of a loop is where the next begins; in the reef a grain may
      // be going round behind the eye at that very moment, as at any other.
      const before = len * 3 - 1e-4;
      const after = len * 3 + 1e-4;
      const e0 = pieceCamera(k, before).eye;
      const e1 = pieceCamera(k, after).eye;
      const kept = particles.slice(0, 400).filter((p) => {
        const ra = pieceAt(p, k, before).pos.map((v, i) => v - (e0[i] as number));
        const rb = pieceAt(p, k, after).pos.map((v, i) => v - (e1[i] as number));
        return dist(ra, rb) < 0.05;
      });
      expect(kept.length).toBeGreaterThanOrEqual(PHASES[k]?.id === 'reef' ? 370 : 400);
    }
  });

  it('gives the small fish ten swarms and the jellyfish five kinds, each as pills', () => {
    expect(SWARM_NAMES).toHaveLength(10);
    expect(JELLY_NAMES).toHaveLength(5);
    const ids = ['shoal', 'sardines', 'jellyfish'];
    for (let k = 0; k < PHASES.length; k++) {
      expect(hasVariants(k)).toBe(ids.includes(PHASES[k]?.id ?? ''));
    }
    const small = PHASES.findIndex((p) => p.id === 'sardines');
    const jelly = PHASES.findIndex((p) => p.id === 'jellyfish');
    expect(variantNames(small)).toEqual(SWARM_NAMES);
    expect(variantLabel(jelly)).toBe('Jellyfish');
    for (const [k, n] of [
      [small, 10],
      [jelly, 5],
    ] as const) {
      for (let i = 0; i < n; i++) {
        setVariant(i, k);
        for (const s of [0, 7.3, 19]) {
          for (const p of particles.slice(0, 300)) {
            const { pos, rgb } = pieceAt(p, k, s);
            for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
    // Every swarm keeps its fish in view of the eye.
    for (let i = 0; i < 10; i++) {
      setVariant(i, small);
      for (let j = 0; j < 900; j += 37) {
        const { c } = smallFish(j, 0.5, 12);
        expect(Math.hypot(...c)).toBeLessThan(32);
      }
    }
    setVariant(0);
  });

  it('lets the cursor lead the shoal at its own speed, and hands back to the loop when it goes', () => {
    const k = PHASES.findIndex((p) => p.id === 'shoal');
    expect(hasPointer(k)).toBe(true);
    expect(hasPointer(k + 1)).toBe(false);
    const before = shoalFish(0, 0.5, 10).c;
    const aim: [number, number, number] = [30, 0, 0];
    // Ten seconds of frames with the cursor held to one side.
    for (let i = 1; i <= 600; i++) setPointer(aim, 1 / 60, 10 + i / 60);
    const fish = Array.from({ length: 36 }, (_, j) => shoalFish(j, 0.5, 20).c);
    const mid = [0, 1, 2].map((i) => fish.reduce((s, f) => s + (f[i] as number), 0) / fish.length);
    expect(dist(mid, aim)).toBeLessThan(dist(before, aim));
    // No faster than the shoal swims: at most 4.4 a second from where it started.
    expect(dist(mid, before)).toBeLessThan(4.4 * 10 + 12);
    for (let i = 1; i <= 120; i++) setPointer(null, 1 / 60, 20 + i / 60);
    expect(shoalFish(0, 0.5, 22).c).toEqual(shoalFish(0, 0.5, 22).c);
    const loop = shoalFish(3, 0.5, 30).c;
    setPointer(null, 1, 30);
    expect(shoalFish(3, 0.5, 30).c).toEqual(loop);
  });
});
