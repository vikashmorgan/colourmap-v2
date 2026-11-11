import { describe, expect, it } from 'vitest';

import { flow } from './bigbang';
import {
  BITE,
  BITE_NAMES,
  BOOST_PACE,
  BOOST_PER_FISH,
  BOOST_SECONDS,
  biteAt,
  boostLeft,
  CHANNEL_W,
  CLOWNS,
  CORAL_MODES,
  camera,
  clownFish,
  colour,
  corals,
  DEEP_FLOOR,
  dashSpeed,
  EYE_H,
  eatNear,
  GIANT_CYCLE,
  GULP,
  gapeAt,
  gardenGrowth,
  giantSeen,
  HAMMER_CYCLE,
  HUNT_LAP,
  hammersSeen,
  hasCoralModes,
  hasGame,
  hasPointer,
  hasSeas,
  hasVariants,
  hunterAt,
  JELLY_NAMES,
  lightOn,
  makeParticles,
  PHASE_START,
  PHASES,
  PREY,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  preyAt,
  preyShown,
  pulseOf,
  REEF_SLOTS,
  RESPAWN,
  reefFish,
  reefSlot,
  resetPrey,
  rootCoral,
  SEA_NAMES,
  SHOAL_KINDS,
  STEP_COLOURS,
  SWARM_NAMES,
  SWIM_NAMES,
  SWIM_SPEED,
  setCoralMode,
  setLight,
  setPointer,
  setSeaOf,
  setShoalKind,
  setSwim,
  setVariant,
  shoalFish,
  smallFish,
  starBall,
  swimmer,
  swimSway,
  TOTAL,
  TUNNEL_LEN,
  TUNNEL_R,
  target,
  tunnelAt,
  variantLabel,
  variantNames,
  WHALE_CYCLE,
  whaleSeen,
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
  it('has nine pieces, from a coral garden to the reef and a swim of your own, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'coral',
      'fans',
      'tables',
      'fish-pulse',
      'shoal',
      'sardines',
      'jellyfish',
      'reef',
      'swim',
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

  it('gives the small fish ten swarms and the jellyfish six kinds, each as pills', () => {
    expect(SWARM_NAMES).toHaveLength(10);
    expect(JELLY_NAMES).toHaveLength(6);
    expect(JELLY_NAMES[5]).toBe('Lanterns');
    const ids = ['shoal', 'sardines', 'jellyfish', 'fish-pulse', 'swim'];
    for (let k = 0; k < PHASES.length; k++) {
      expect(hasVariants(k)).toBe(ids.includes(PHASES[k]?.id ?? ''));
    }
    const small = PHASES.findIndex((p) => p.id === 'sardines');
    const jelly = PHASES.findIndex((p) => p.id === 'jellyfish');
    expect(variantNames(small)).toEqual(SWARM_NAMES);
    expect(variantLabel(jelly)).toBe('Jellyfish');
    for (const [k, n] of [
      [small, 10],
      [jelly, 6],
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

  it('swims the reef fish as a shoal, all one way down the channel', () => {
    for (const t of [3, 11, 27]) {
      const fish = Array.from({ length: 60 }, (_, j) => reefFish(j, 50, t));
      for (const { f } of fish) expect(f[2]).toBeLessThan(-0.5);
      const mean = [0, 1, 2].map((i) => fish.reduce((a, x) => a + (x.f[i] as number), 0) / 60);
      expect(Math.hypot(...mean)).toBeGreaterThan(0.9);
    }
  });

  it('turns the cursor-led shoal in easy curves, never on the spot', () => {
    // The cursor jumps behind the shoal: it swings round over seconds, a little each frame.
    setPointer([0, 0, 0], 1 / 60, 40);
    let f = shoalFish(5, 0.5, 40).f;
    setPointer([-60, 0, 0], 1 / 60, 40 + 1 / 60);
    for (let i = 2; i < 240; i++) {
      setPointer(i < 120 ? [-60, 0, 0] : [60, 0, 0], 1 / 60, 40 + i / 60);
      const g = shoalFish(5, 0.5, 40 + i / 60).f;
      const turn = Math.acos(Math.min(1, f[0] * g[0] + f[1] * g[1] + f[2] * g[2]));
      expect(turn).toBeLessThan(0.08);
      f = g;
    }
    for (let i = 1; i <= 200; i++) setPointer(null, 1 / 60, 44 + i / 60);
  });

  it('lights the lanterns red and warm orange, and grows the red garden from one root on a rock', () => {
    const jelly = PHASES.findIndex((p) => p.id === 'jellyfish');
    setVariant(5, jelly);
    for (const p of particles.filter((q) => q.c >= 0.1).slice(0, 400)) {
      const [r, g, b] = pieceAt(p, jelly, 9).rgb;
      // Warm: red the strongest, blue the weakest.
      expect(r).toBeGreaterThanOrEqual(g);
      expect(g).toBeGreaterThanOrEqual(b);
    }
    const pulse = PHASES.findIndex((p) => p.id === 'fish-pulse');
    expect(variantNames(pulse)).toEqual(['Clownfish', 'Red garden']);
    setVariant(1, pulse);
    for (const s of [0, 6, 13]) {
      for (const p of particles.slice(0, 400)) {
        const { pos, rgb } = pieceAt(p, pulse, s);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    // Every branch of the coral starts at the one root.
    const root = rootCoral();
    const starts = root.routes.map((r) => [r.pts[0], r.pts[1], r.pts[2]]);
    for (const s of starts) expect(Math.hypot(...(s as number[]))).toBeLessThan(1e-6);
    // The clownfish still hide as the hunter passes.
    const start = PHASE_START[pulse] as number;
    const near = (t: number) => {
      const { c } = hunterAt(t);
      return Math.hypot(c[0], c[1] + 9, c[2]);
    };
    const times = Array.from({ length: 200 }, (_, i) => start + (i / 200) * HUNT_LAP);
    const closest = times.reduce((a, b) => (near(b) < near(a) ? b : a));
    for (let j = 0; j < CLOWNS; j++) expect(clownFish(j, closest).out).toBeLessThan(0.05);
    setVariant(0);
  });

  it('lets you swim your own fish: cruising, steering with the cursor, faster on E, never through the sand', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    expect(hasGame(k)).toBe(true);
    expect(hasGame(k - 1)).toBe(false);
    // Shark Sim, the hammerhead first and so the one you start as; the other fish still there.
    expect(PHASES[k]?.name).toBe('Shark Sim');
    expect(SWIM_NAMES[0]).toBe('Hammerhead');
    expect(variantNames(k)[0]).toBe('Hammerhead');
    expect(SWIM_NAMES).toContain('Clownfish');
    expect(SWIM_NAMES).toContain('Silver school');
    // With no one at the controls it wanders on, above the sand.
    for (let t = 0; t < 120; t += 3) expect(swimmer(t).c[1]).toBeGreaterThan(-14 + 1);
    const frames = (n: number, at: { x: number; y: number } | null, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, at, keys, 1 / 60, t0 + i / 60);
      return swimmer(t0 + n / 60);
    };
    const a = frames(1, null, [], 0);
    // Two seconds straight on: about the cruising speed.
    const b = frames(120, null, [], 1 / 60);
    const run = Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2]);
    expect(run).toBeGreaterThan(SWIM_SPEED * 2 * 0.8);
    expect(run).toBeLessThan(SWIM_SPEED * 2 * 1.2);
    // The cursor to the right turns the fish right, gradually.
    const right = [-b.f[2], 0, b.f[0]];
    const c = frames(60, { x: 0.8, y: 0 }, [], 2);
    expect(c.f[0] * (right[0] as number) + c.f[2] * (right[2] as number)).toBeGreaterThan(0.3);
    // Down at the bottom of the screen it dives, but stops at the sand.
    const d = frames(900, { x: 0, y: -1 }, [], 3);
    expect(d.c[1]).toBeGreaterThanOrEqual(-14 + 1.5);
    // E speeds up.
    const e0 = frames(1, null, ['e'], 18);
    const e1 = frames(180, null, ['e'], 18 + 1 / 60);
    expect(Math.hypot(e1.c[0] - e0.c[0], e1.c[2] - e0.c[2])).toBeGreaterThan(SWIM_SPEED * 3 * 1.2);
    // Every grain somewhere real, as each fish.
    for (let i = 0; i < SWIM_NAMES.length; i++) {
      setVariant(i, k);
      for (const p of particles.slice(0, 300)) {
        const { pos, rgb } = pieceAt(p, k, 25);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    setSwim(false, null, [], 0, 0);
    setVariant(0);
  });

  it('grows the garden from nothing, quick at first and slower as it gets bigger, dark until it begins', () => {
    const k = PHASES.findIndex((p) => p.id === 'coral');
    // Before a colony begins, its grains give no light: no balls of light at the start.
    for (const p of particles.filter((q) => q.c >= 0.21).slice(0, 200)) {
      expect(Math.max(...pieceAt(p, k, 0.01).rgb)).toBeLessThan(1e-3);
    }
    // Each step of growth takes longer than the last.
    const steps = [0.1, 0.3, 0.5, 0.7].map((u) => gardenGrowth(2, u + 0.1) - gardenGrowth(2, u));
    for (let i = 1; i < steps.length; i++)
      expect(steps[i] as number).toBeLessThan(steps[i - 1] as number);
    expect(gardenGrowth(0, 0.9)).toBeGreaterThan(0.99);
  });

  it('rises on W and sinks on S in the Shark Sim', () => {
    const frames = (n: number, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, null, keys, 1 / 60, t0 + i / 60);
      return swimmer(t0 + n / 60);
    };
    const a = frames(1, [], 0);
    const up = frames(120, ['w'], 1 / 60);
    expect(up.c[1]).toBeGreaterThan(a.c[1] + 2);
    expect(up.f[1]).toBeGreaterThan(0.2);
    const down = frames(120, ['s'], 3);
    expect(down.c[1]).toBeLessThan(up.c[1] - 2);
    expect(down.f[1]).toBeLessThan(-0.2);
    setSwim(false, null, [], 0, 0);
  });

  it('turns every coral warm (no green, no blue) or gold, on every piece with corals', () => {
    expect(CORAL_MODES).toEqual(['Natural corals', 'Warm corals', 'Gold corals']);
    const ids = ['coral', 'fans', 'tables', 'fish-pulse', 'reef', 'swim'];
    for (let k = 0; k < PHASES.length; k++)
      expect(hasCoralModes(k)).toBe(ids.includes(PHASES[k]?.id ?? ''));
    // The hue of a colour in degrees, red at 0.
    const hue = (rgb: number[]) => {
      const [r, g, b] = rgb as [number, number, number];
      const mx = Math.max(r, g, b);
      const d = mx - Math.min(r, g, b);
      if (d < 1e-9) return 0;
      const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const coralGrains = particles.filter((p) => p.c >= 0.21);
    const swimCorals = particles.filter((p) => p.c >= 0.2 && p.c < 0.72);
    const check = (ok: (h: number, rgb: [number, number, number]) => boolean) => {
      for (const id of ['coral', 'fans', 'tables', 'swim']) {
        const k = PHASES.findIndex((p) => p.id === id);
        for (const p of (id === 'swim' ? swimCorals : coralGrains).slice(0, 300)) {
          const { rgb } = pieceAt(p, k, 20);
          if (Math.max(...rgb) < 1e-3) continue;
          expect(ok(hue(rgb), rgb as [number, number, number])).toBe(true);
        }
      }
    };
    setCoralMode(1);
    // Warm: red the strongest, between rose and amber.
    check((h, [r, g, b]) => r >= g && r >= b && (h <= 50 || h >= 320));
    setCoralMode(2);
    // Gold: red over green over blue, a golden hue.
    check((h, [r, g, b]) => r >= g && g >= b && h >= 20 && h <= 55);
    setCoralMode(0);
    // Natural keeps the garden's greens and teals.
    const k = PHASES.findIndex((p) => p.id === 'coral');
    const greens = coralGrains
      .slice(0, 600)
      .map((p) => pieceAt(p, k, 20).rgb)
      .filter(([r, g]) => g > r);
    expect(greens.length).toBeGreaterThan(0);
  });

  it('eats small fish with three bites in turn, each fish vanishing into the mouth and coming back', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setVariant(0, k);
    resetPrey();
    const t0 = 50;
    expect(biteAt(t0)).toBeNull();
    // A fish at the mouth is taken, and the first bite is the lunge.
    const fish = preyAt(0, t0);
    expect(fish.shown).toBe(1);
    expect(eatNear(fish.c, t0)).toBe(1);
    expect(BITE_NAMES).toEqual(['Lunge', 'Sweep', 'Rise']);
    expect(biteAt(t0 + 0.1)?.style).toBe(0);
    // No second bite while one is under way.
    expect(eatNear(preyAt(1, t0 + 0.1).c, t0 + 0.1)).toBe(0);
    // Shrinking into the mouth, then gone, then growing back, then whole.
    const s = preyShown(0, t0 + GULP / 2);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
    expect(preyShown(0, t0 + GULP + 1)).toBe(0);
    expect(preyShown(0, t0 + RESPAWN + 1)).toBeGreaterThan(0);
    expect(preyShown(0, t0 + RESPAWN + 3)).toBe(1);
    // The next two bites are the sweep and the rise; the sweep takes up to three.
    const t1 = t0 + BITE + 0.1;
    const swept = eatNear(preyAt(5, t1).c, t1, 30);
    expect(swept).toBeGreaterThan(0);
    expect(swept).toBeLessThanOrEqual(3);
    expect(biteAt(t1 + 0.1)?.style).toBe(1);
    const t2 = t1 + BITE + 0.1;
    expect(eatNear(preyAt(10, t2).c, t2)).toBeGreaterThan(0);
    expect(biteAt(t2 + 0.1)?.style).toBe(2);
    // Through every bite, every grain somewhere real.
    for (const t of [t0 + 0.2, t0 + 0.5, t1 + 0.3, t2 + 0.4, t2 + 0.7]) {
      for (const p of particles.slice(0, 600)) {
        const { pos, rgb } = pieceAt(p, k, t);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    // Once every bite is long over the schools are whole again: the sea never empties.
    for (let i = 0; i < 60; i++) expect(preyShown(i, t2 + RESPAWN + 5)).toBe(1);
    resetPrey();
  });

  it('parts the school round the hammerhead, never letting a fish inside its body', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    resetPrey();
    setVariant(0, k);
    const gap = (i: number, t: number) => {
      const me = swimmer(t).c;
      const c = preyAt(i, t).c;
      return Math.hypot(c[0] - me[0], c[1] - me[1], c[2] - me[2]);
    };
    let closest = Number.POSITIVE_INFINITY;
    for (let t = 0; t < 60; t += 0.5)
      for (let i = 0; i < 60; i++) closest = Math.min(closest, gap(i, t));
    expect(closest).toBeGreaterThan(0.5);
    // A clownfish hunts nothing; every grain still somewhere real.
    setVariant(2, k);
    expect(SWIM_NAMES[2]).toBe('Clownfish');
    for (const p of particles.slice(0, 200)) {
      for (const v of pieceAt(p, k, 12).pos) expect(Number.isFinite(v)).toBe(true);
    }
    setVariant(0);
  });

  it('offers three seas, each drawn in full, the deep reaching down to the vents', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    expect(SEA_NAMES).toEqual(['Coral forest', 'Open water', 'Deep ocean']);
    expect(hasSeas(k)).toBe(true);
    expect(hasSeas(k - 1)).toBe(false);
    for (let sea = 0; sea < 3; sea++) {
      setSeaOf(sea, k);
      for (const fish of [0, 4]) {
        setVariant(fish, k);
        for (const s of [0, 9.5, 31]) {
          for (const p of particles) {
            const { pos, rgb } = pieceAt(p, k, s);
            for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
          }
          const { eye, target } = pieceCamera(k, s);
          for (const v of [...eye, ...target]) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
    setVariant(0, k);
    // In the deep, with no one at the controls, the wander goes down the canyon toward the vents.
    setSeaOf(2, k);
    setSwim(false, null, [], 0, 0);
    const lows = Array.from({ length: 300 }, (_, i) => swimmer(i).c[1]);
    expect(Math.min(...lows)).toBeLessThan(DEEP_FLOOR + 10);
    expect(Math.min(...lows)).toBeGreaterThan(DEEP_FLOOR);
    // At the controls, S takes you down past the reef into the canyon.
    for (let i = 1; i <= 900; i++) setSwim(true, null, ['s'], 1 / 60, 100 + i / 60);
    expect(swimmer(115).c[1]).toBeLessThan(-14 - 20);
    setSwim(false, null, [], 0, 0);
    // The giant squid stays hidden most of the time, and shows now and then.
    const seen = Array.from({ length: GIANT_CYCLE }, (_, t) => giantSeen(t));
    expect(seen.filter((v) => v > 0.5).length).toBeLessThan(GIANT_CYCLE * 0.4);
    expect(Math.max(...seen)).toBeGreaterThan(0.9);
    // The open water's shoals and the deep's lantern fish are prey too.
    expect(PREY).toBeGreaterThan(400);
    // In the Journey, back to the coral forest: the wander keeps above the sand.
    setSeaOf(1);
    for (let t = 0; t < 120; t += 7) expect(swimmer(t).c[1]).toBeGreaterThan(-14);
  });

  it('boosts on Space while the bar lasts, and wins boost back for every fish eaten', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setSeaOf(1, k);
    // The clownfish, which eats nothing, so the bar only drains.
    setVariant(2, k);
    resetPrey();
    expect(boostLeft()).toBe(1);
    const frames = (n: number, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, null, keys, 1 / 60, t0 + i / 60);
      return swimmer(t0 + n / 60);
    };
    const a = frames(1, [' '], 200);
    const b = frames(60, [' '], 200 + 1 / 60);
    // One second of boost: well past the cruise, toward three times it.
    const run = Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2]);
    expect(run).toBeGreaterThan(SWIM_SPEED * 2);
    expect(run).toBeLessThan(SWIM_SPEED * BOOST_PACE * 1.05);
    expect(boostLeft()).toBeLessThan(0.75);
    expect(boostLeft()).toBeGreaterThan(0.5);
    // Held on, the bar runs dry and the pace falls back.
    frames(60 * BOOST_SECONDS, [' '], 202);
    expect(boostLeft()).toBe(0);
    const c0 = frames(1, [' '], 210);
    const c1 = frames(120, [' '], 210 + 1 / 60);
    expect(Math.hypot(c1.c[0] - c0.c[0], c1.c[2] - c0.c[2])).toBeLessThan(SWIM_SPEED * 2 * 1.2);
    // A fish eaten wins some back.
    setVariant(0, k);
    const before = boostLeft();
    const t = 213;
    const got = eatNear(preyAt(0, t).c, t);
    expect(got).toBeGreaterThan(0);
    expect(boostLeft()).toBeCloseTo(before + BOOST_PER_FISH * got, 5);
    setSwim(false, null, [], 0, 0);
    resetPrey();
    setSeaOf(0, k);
  });

  it('sends small fish dashing away as the hammerhead closes in, every one still somewhere real', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setSeaOf(1, k);
    setVariant(0, k);
    resetPrey();
    // A long swim through the open water's shoals, rising and turning.
    let fastest = 0;
    for (let i = 1; i <= 1800; i++) {
      const t = 300 + i / 60;
      setSwim(true, { x: 0.3 * Math.sin(t * 0.2), y: 0.2 * Math.sin(t * 0.13) }, [], 1 / 60, t);
      if (i % 30 === 0) for (let j = 0; j < PREY; j++) fastest = Math.max(fastest, dashSpeed(j));
    }
    expect(fastest).toBeGreaterThan(2);
    for (let j = 0; j < PREY; j += 7) {
      const { c, f } = preyAt(j, 330);
      for (const v of [...c, ...f]) expect(Number.isFinite(v)).toBe(true);
    }
    setSwim(false, null, [], 0, 0);
    resetPrey();
    setSeaOf(0, k);
  });

  it('bends the body into a turn and lets it flow straight again', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setVariant(0, k);
    const frames = (n: number, at: { x: number; y: number } | null, t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, at, [], 1 / 60, t0 + i / 60);
    };
    frames(60, { x: 0.8, y: 0 }, 400);
    const right = swimSway();
    expect(right.bend).toBeGreaterThan(0.5);
    expect(right.wave).toBeGreaterThan(1.5);
    frames(60, { x: -0.8, y: 0 }, 401);
    expect(swimSway().bend).toBeLessThan(-0.5);
    frames(240, null, 402);
    expect(Math.abs(swimSway().bend)).toBeLessThan(0.05);
    setSwim(false, null, [], 0, 0);
    expect(swimSway()).toEqual({ bend: 0, wave: 1 });
  });

  it('opens the jaw wide through a bite and snaps it shut', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setVariant(0, k);
    resetPrey();
    const t0 = 500;
    eatNear(preyAt(0, t0).c, t0, 100);
    expect(gapeAt(t0 + 0.5 * BITE)).toBeGreaterThan(0.95);
    expect(gapeAt(t0 + 0.2 * BITE)).toBeGreaterThan(0.2);
    expect(gapeAt(t0 + 0.8 * BITE)).toBeLessThan(0.05);
    // The clownfish has no bite.
    setVariant(2, k);
    expect(gapeAt(t0 + 0.5 * BITE)).toBe(0);
    setVariant(0, k);
    resetPrey();
  });

  it('runs a coral tunnel from one mouth to a fork and out by two mouths side by side', () => {
    const mouth = tunnelAt(0);
    const fork = tunnelAt(14);
    const left = tunnelAt(14 + 21.5 - 1e-3);
    const right = tunnelAt(TUNNEL_LEN);
    expect(mouth.c[0]).toBeCloseTo(fork.c[0], 6);
    expect(mouth.c[2]).toBeGreaterThan(fork.c[2]);
    // Two exits on the same side, far enough apart that each is its own mouth.
    expect(left.c[2]).toBeCloseTo(right.c[2], 2);
    expect(right.c[0] - left.c[0]).toBeGreaterThan(2 * TUNNEL_R - 1);
    // Wide enough for the hammerhead.
    expect(TUNNEL_R).toBeGreaterThan(4);
    for (let s = 0; s <= TUNNEL_LEN; s += 3) {
      const { c, f } = tunnelAt(s);
      expect(c[1]).toBe(-14);
      expect(Math.hypot(...f)).toBeCloseTo(1, 6);
    }
  });

  it('switches Light on the Shark Sim only, soft caustics below and waves of light above', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setLight(true, k - 1);
    expect(lightOn()).toBe(false);
    setLight(true, k);
    expect(lightOn()).toBe(true);
    for (const sea of [0, 1, 2]) {
      setSeaOf(sea, k);
      for (const p of particles) {
        const { pos, rgb } = pieceAt(p, k, 40);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        // The caustics on the sand never glare.
        if (p.c < 0.08) expect(Math.max(...rgb)).toBeLessThan(0.4);
      }
    }
    setLight(false);
    setSeaOf(0, k);
  });

  it('brings hammerhead schools and whales by now and then, never always there', () => {
    const hs = Array.from({ length: HAMMER_CYCLE }, (_, t) => hammersSeen(t));
    expect(Math.max(...hs)).toBeGreaterThan(0.9);
    expect(Math.min(...hs)).toBe(0);
    for (const w of [0, 1]) {
      const ws = Array.from({ length: WHALE_CYCLE }, (_, t) => whaleSeen(w, t));
      expect(Math.max(...ws)).toBeGreaterThan(0.9);
      expect(Math.min(...ws)).toBe(0);
    }
  });

  it('keeps your own fish dim, so it never reads as a white glare', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setVariant(0, k);
    for (const p of particles.filter((q) => q.c >= 0.87)) {
      expect(Math.max(...pieceAt(p, k, 20).rgb)).toBeLessThan(0.35);
    }
  });
});
