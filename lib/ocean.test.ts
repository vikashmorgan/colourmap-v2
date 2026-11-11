import { describe, expect, it } from 'vitest';

import { flow, hash } from './bigbang';
import {
  airborne,
  anemoneAt,
  anemoneClown,
  anemoneHidden,
  BITE,
  BITE_NAMES,
  BOOST_PACE,
  BOOST_PER_FISH,
  BOOST_SECONDS,
  besideWhale,
  biteAt,
  boostLeft,
  bubblesNow,
  CALAMARI,
  CALM_SECONDS,
  CALM_TRUST,
  CHANNEL_W,
  CLOWNS,
  COINS,
  CORAL_MODES,
  CURRENT_PUSH,
  calamariAt,
  calmNow,
  camera,
  clamAt,
  clamOpen,
  clownFish,
  colour,
  corals,
  currentStart,
  DEEP_FLOOR,
  dashSpeed,
  EYE_H,
  eatenCount,
  eatNear,
  FINDS,
  FISH_MODES,
  FLOCK,
  FREEDOM,
  finds,
  fishTint,
  flockManta,
  freedomAt,
  GIANT_CYCLE,
  GULP,
  gapeAt,
  gardenGrowth,
  gauges,
  giantSeen,
  HAMMER_CYCLE,
  HUNT_LAP,
  hammersSeen,
  hasCoralModes,
  hasFishModes,
  hasGame,
  hasPointer,
  hasSeas,
  hasVariants,
  hunterAt,
  INK_SECONDS,
  inkVeil,
  inTunnel,
  JELLY_NAMES,
  LUNGE,
  lastSplash,
  lightOn,
  makeParticles,
  mantaNow,
  mantaRate,
  PHASE_START,
  PHASES,
  PREY,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  placeSwimmer,
  preyAt,
  preyShown,
  pulseOf,
  QUOTE_SECONDS,
  RED_FISH,
  REEF_SLOTS,
  RESPAWN,
  redFish,
  reefFish,
  reefSlot,
  resetPrey,
  resetTreasure,
  rootCoral,
  SEA_NAMES,
  SHOAL_KINDS,
  STEP_COLOURS,
  SUPER_PACE,
  SWARM_NAMES,
  SWIM_NAMES,
  SWIM_SPEED,
  setCoralMode,
  setFishMode,
  setLight,
  setPointer,
  setSeaOf,
  setShoalKind,
  setSwim,
  setVariant,
  shoalFish,
  smallFish,
  starBall,
  superOn,
  swimmer,
  swimPartOf,
  swimSway,
  TOTAL,
  TUNNEL_BRANCH,
  TUNNEL_LEN,
  TUNNEL_R,
  TUNNEL_TRUNK,
  tally,
  target,
  treasureAt,
  tubeAt,
  tubeOf,
  tubeShut,
  tunnelAt,
  variantLabel,
  variantNames,
  WHALE_CYCLE,
  whaleNow,
  whaleRate,
  whaleSeen,
  wingsOpen,
  ZONE_CELL,
  zoneAt,
  zoneNow,
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
    const frames = (n: number, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, keys, 1 / 60, t0 + i / 60);
      return swimmer(t0 + n / 60);
    };
    const a = frames(1, [], 0);
    // Two seconds straight on: about the cruising speed.
    const b = frames(120, [], 1 / 60);
    const run = Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2]);
    expect(run).toBeGreaterThan(SWIM_SPEED * 2 * 0.8);
    expect(run).toBeLessThan(SWIM_SPEED * 2 * 1.2);
    // D turns the fish right, gradually: keys only, no cursor.
    const right = [-b.f[2], 0, b.f[0]];
    const c = frames(60, ['d'], 2);
    expect(c.f[0] * (right[0] as number) + c.f[2] * (right[2] as number)).toBeGreaterThan(0.3);
    // S dives, but stops at the sand.
    const d = frames(900, ['s'], 3);
    expect(d.c[1]).toBeGreaterThanOrEqual(-14 + 1.5);
    // E speeds up.
    const e0 = frames(1, ['e'], 18);
    const e1 = frames(180, ['e'], 18 + 1 / 60);
    expect(Math.hypot(e1.c[0] - e0.c[0], e1.c[2] - e0.c[2])).toBeGreaterThan(SWIM_SPEED * 3 * 1.2);
    // Every grain somewhere real, as each fish.
    for (let i = 0; i < SWIM_NAMES.length; i++) {
      setVariant(i, k);
      for (const p of particles.slice(0, 300)) {
        const { pos, rgb } = pieceAt(p, k, 25);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    setSwim(false, [], 0, 0);
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
      for (let i = 1; i <= n; i++) setSwim(true, keys, 1 / 60, t0 + i / 60);
      return swimmer(t0 + n / 60);
    };
    const a = frames(1, [], 0);
    const up = frames(120, ['w'], 1 / 60);
    expect(up.c[1]).toBeGreaterThan(a.c[1] + 2);
    expect(up.f[1]).toBeGreaterThan(0.2);
    const down = frames(120, ['s'], 3);
    expect(down.c[1]).toBeLessThan(up.c[1] - 2);
    expect(down.f[1]).toBeLessThan(-0.2);
    setSwim(false, [], 0, 0);
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
    // The coral grains of the Shark Sim, not the tunnel's red fish (fish follow the fish colours).
    const swimCorals = particles.filter(
      (p) => p.c >= 0.2 && p.c < 0.72 && swimPartOf(p, 20) !== 'redfish',
    );
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
    setSwim(false, [], 0, 0);
    const lows = Array.from({ length: 300 }, (_, i) => swimmer(i).c[1]);
    expect(Math.min(...lows)).toBeLessThan(DEEP_FLOOR + 10);
    expect(Math.min(...lows)).toBeGreaterThan(DEEP_FLOOR);
    // At the controls, S takes you down past the reef into the canyon.
    for (let i = 1; i <= 900; i++) setSwim(true, ['s'], 1 / 60, 100 + i / 60);
    expect(swimmer(115).c[1]).toBeLessThan(-14 - 20);
    setSwim(false, [], 0, 0);
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
      for (let i = 1; i <= n; i++) setSwim(true, keys, 1 / 60, t0 + i / 60);
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
    setSwim(false, [], 0, 0);
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
      setSwim(true, i % 240 < 120 ? ['d', 'w'] : ['a'], 1 / 60, t);
      if (i % 30 === 0) for (let j = 0; j < PREY; j++) fastest = Math.max(fastest, dashSpeed(j));
    }
    expect(fastest).toBeGreaterThan(2);
    for (let j = 0; j < PREY; j += 7) {
      const { c, f } = preyAt(j, 330);
      for (const v of [...c, ...f]) expect(Number.isFinite(v)).toBe(true);
    }
    setSwim(false, [], 0, 0);
    resetPrey();
    setSeaOf(0, k);
  });

  it('bends the body into a turn and lets it flow straight again', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    setVariant(0, k);
    const frames = (n: number, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, keys, 1 / 60, t0 + i / 60);
    };
    frames(60, ['d'], 400);
    const right = swimSway();
    expect(right.bend).toBeGreaterThan(0.5);
    expect(right.wave).toBeGreaterThan(1.5);
    frames(60, ['a'], 401);
    expect(swimSway().bend).toBeLessThan(-0.5);
    frames(240, [], 402);
    expect(Math.abs(swimSway().bend)).toBeLessThan(0.05);
    setSwim(false, [], 0, 0);
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

  it('runs a great round coral tunnel from one mouth to a fork and out by two mouths side by side', () => {
    const mouth = tunnelAt(0);
    const fork = tunnelAt(TUNNEL_TRUNK);
    const left = tunnelAt(TUNNEL_TRUNK + TUNNEL_BRANCH - 1e-3);
    const right = tunnelAt(TUNNEL_LEN);
    expect(mouth.c[0]).toBeCloseTo(fork.c[0], 6);
    expect(mouth.c[2]).toBeGreaterThan(fork.c[2]);
    // Two exits on the same side, far enough apart that each is its own mouth.
    expect(left.c[2]).toBeCloseTo(right.c[2], 2);
    expect(right.c[0] - left.c[0]).toBeGreaterThan(2 * TUNNEL_R + 4);
    // Big (2026-11-11: "make tunnel really big, like a big circular tunnel"): twice the hammerhead
    // across, a round tube resting on the sand, its middle line level.
    expect(2 * TUNNEL_R).toBeGreaterThanOrEqual(2 * 9);
    for (let s = 0; s <= TUNNEL_LEN; s += 3) {
      const { c, f } = tunnelAt(s);
      expect(c[1] - TUNNEL_R).toBeLessThan(-14);
      expect(c[1] - TUNNEL_R).toBeGreaterThan(-14 - 2);
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

  describe('round three: a reef that answers, treasure, calm, currents, guests', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    const frames = (n: number, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, keys, 1 / 60, t0 + i / 60);
      return t0 + n / 60;
    };
    const yawOf = (f: number[]) => Math.atan2(-(f[0] as number), -(f[2] as number));

    it('has the anemones draw in and their clownfish dive as you come, then peek back out', () => {
      setSeaOf(0, k);
      setVariant(2, k);
      resetPrey();
      const a = anemoneAt(0, [50, -14, 30]);
      placeSwimmer([a[0], a[1] + 3, a[2] + 2]);
      let t = frames(40, ['q'], 600);
      expect(anemoneHidden(0)).toBeGreaterThan(0.7);
      const me = swimmer(t).c;
      const fish = anemoneClown(0, t, me).c;
      const home = anemoneAt(0, me);
      expect(
        Math.hypot(fish[0] - home[0], fish[1] - home[1] - 0.7, fish[2] - home[2]),
      ).toBeLessThan(0.8);
      // Gone past: they come out slowly, a peek first, then all the way.
      placeSwimmer([a[0], a[1] + 3, a[2] + 42]);
      t = frames(60, ['q'], t);
      expect(anemoneHidden(0)).toBeGreaterThan(0.3);
      t = frames(900, ['q'], t);
      expect(anemoneHidden(0)).toBeLessThan(0.1);
      // A tube worm snaps shut at once.
      const tb = tubeAt(0, [44, -14, 40]);
      placeSwimmer([tb[0], tb[1] + 2, tb[2]]);
      frames(20, ['q'], t);
      expect(tubeShut(0)).toBeGreaterThan(0.8);
      setSwim(false, [], 0, 0);
      setVariant(0, k);
    });

    it('hides treasure: a pearl for the slow, an amphora, a coin trail, an egg; three bring the Golden hammerhead', () => {
      setSeaOf(0, k);
      setVariant(2, k);
      resetTreasure();
      expect(tally()).toBe(`Finds 0 / ${FINDS}`);
      expect(variantNames(k)).not.toContain('Golden hammerhead');
      // At a cruise the clam stays shut; slow and close, it opens.
      const c = clamAt(0, [42, -14, 22]);
      placeSwimmer([c[0], c[1] + 3, c[2] + 6]);
      let t = frames(60, [], 700);
      expect(clamOpen(0)).toBeLessThan(0.1);
      placeSwimmer([c[0], c[1] + 3, c[2] + 6]);
      t = frames(300, ['q'], t);
      expect(clamOpen(0)).toBeGreaterThan(0.7);
      placeSwimmer(treasureAt('pearl0') as [number, number, number]);
      t = frames(1, ['q'], t);
      expect(finds()).toBe(1);
      // The amphora in the tunnel's fork.
      placeSwimmer(treasureAt('amphora') as [number, number, number]);
      t = frames(1, [], t);
      expect(finds()).toBe(2);
      // The coin trail counts once every coin is taken.
      setSeaOf(2, k);
      for (let i = 0; i < COINS; i++) {
        placeSwimmer(treasureAt(`coin${i}`) as [number, number, number]);
        t = frames(1, [], t);
        if (i < COINS - 1) expect(finds()).toBe(2);
      }
      expect(finds()).toBe(3);
      expect(variantNames(k)).toContain('Golden hammerhead');
      placeSwimmer(treasureAt('egg') as [number, number, number]);
      t = frames(1, [], t);
      expect(tally()).toBe(`Finds 4 / ${FINDS}`);
      // Each bursts softly, then is gone; every grain somewhere real.
      for (const s of [t + 0.4, t + 2]) {
        for (const p of particles) {
          const { pos, rgb } = pieceAt(p, k, s);
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
        }
      }
      // The golden one swims in gold.
      setVariant(6, k);
      for (const p of particles.filter((q) => q.c >= 0.87 && hash(q.i, 260) < 0.4).slice(0, 200)) {
        const [r, g, b] = pieceAt(p, k, t).rgb;
        expect(r).toBeGreaterThanOrEqual(g as number);
        expect(g as number).toBeGreaterThanOrEqual(b as number);
      }
      setSwim(false, [], 0, 0);
      resetTreasure();
      setVariant(0, k);
      setSeaOf(0, k);
    });

    it('grows calm on a long cruise, glowing softly; a calm hunter does not bite; a boost breaks it', () => {
      setSeaOf(0, k);
      setVariant(2, k);
      resetPrey();
      placeSwimmer([40, -6, 40]);
      let t = frames(60 * (CALM_SECONDS + 1), [], 800);
      expect(calmNow()).toBeGreaterThan(0.95);
      setVariant(0, k);
      expect(eatNear(preyAt(0, t).c, t)).toBe(0);
      t = frames(1, [' '], t);
      expect(calmNow()).toBe(0);
      expect(calmNow()).toBeLessThan(CALM_TRUST);
      setSwim(false, [], 0, 0);
      resetPrey();
    });

    it('carries you fast along a current once you are in it', () => {
      setSeaOf(0, k);
      setVariant(2, k);
      const start = currentStart(0);
      placeSwimmer(start);
      const a = swimmer(0).c;
      frames(60, ['q'], 900);
      const b = swimmer(901).c;
      expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeGreaterThan(CURRENT_PUSH * 0.6);
      setSwim(false, [], 0, 0);
    });

    it('lets you swim beside a whale, which keeps your pace, and follow a manta, which waits for you', () => {
      setSeaOf(1, k);
      setVariant(2, k);
      // A moment when the first whale is out.
      let t0 = 1000;
      while (whaleSeen(0, t0) < 0.8) t0 += 1;
      const w = whaleNow(0);
      const side = [-(w.f[2] as number), 0, w.f[0] as number];
      placeSwimmer(
        [w.c[0] + 8 * (side[0] as number), w.c[1], w.c[2] + 8 * (side[2] as number)],
        yawOf(w.f),
      );
      frames(150, [], t0);
      expect(besideWhale(0)).toBeGreaterThan(0.5);
      expect(whaleRate(0)).toBeGreaterThan(1.8);
      setSwim(false, [], 0, 0);
      // The manta: fallen far behind, it waits; close behind, it moves on.
      setSeaOf(2, k);
      const m = mantaNow();
      placeSwimmer(
        [m.c[0] - 22 * (m.f[0] as number), m.c[1], m.c[2] - 22 * (m.f[2] as number)],
        yawOf(m.f),
      );
      frames(30, ['q'], 1100);
      expect(mantaRate()).toBeLessThan(0.8);
      const m2 = mantaNow();
      placeSwimmer(
        [m2.c[0] - 5 * (m2.f[0] as number), m2.c[1], m2.c[2] - 5 * (m2.f[2] as number)],
        yawOf(m2.f),
      );
      frames(90, ['q'], 1101);
      expect(mantaRate()).toBeGreaterThan(1.2);
      setSwim(false, [], 0, 0);
      setVariant(0, k);
      setSeaOf(0, k);
    });
  });

  describe('round four: flight, the bite key, fish colours, gauges, the great tunnel, regions, calamari, freedom', () => {
    const k = PHASES.findIndex((p) => p.id === 'swim');
    const frames = (n: number, keys: string[], t0: number) => {
      for (let i = 1; i <= n; i++) setSwim(true, keys, 1 / 60, t0 + i / 60);
      return t0 + n / 60;
    };
    const SKY_TOP = -14 + 72;
    const allReal = (s: number) => {
      for (const p of particles) {
        const { pos, rgb } = pieceAt(p, k, s);
        for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
      }
    };

    it('leaps out on a boost, glides on spread wings, and dives back in with a splash and bubbles', () => {
      setSeaOf(1, k);
      setVariant(0, k);
      resetPrey();
      placeSwimmer([40, SKY_TOP - 1, 40], 0, 0.6);
      // Without a boost the surface holds you.
      let t = frames(120, ['w'], 1200);
      expect(airborne()).toBe(false);
      expect(swimmer(t).c[1]).toBeLessThanOrEqual(SKY_TOP + 1e-9);
      // Boosting up into it, you leap out in a splash.
      t = frames(40, ['w', ' '], t);
      expect(airborne()).toBe(true);
      const first = lastSplash();
      expect(first).toBeGreaterThan(1200);
      // Wings out, you glide above the water a good while.
      t = frames(30, ['w'], t);
      expect(wingsOpen()).toBeGreaterThan(0.8);
      expect(swimmer(t).c[1]).toBeGreaterThan(SKY_TOP + 2);
      // The wings spread you wide: your grains reach far out to your sides.
      const width = (s: number) => {
        const { c, f } = swimmer(s);
        const side = [-(f[2] as number), 0, f[0] as number];
        const n = Math.hypot(side[0] as number, side[2] as number) || 1;
        let most = 0;
        for (const p of particles.filter((q) => q.c >= 0.87 && hash(q.i, 260) < 0.4)) {
          const { pos } = pieceAt(p, k, s);
          most = Math.max(
            most,
            Math.abs(
              ((pos[0] - c[0]) * (side[0] as number) + (pos[2] - c[2]) * (side[2] as number)) / n,
            ),
          );
        }
        return most;
      };
      const spread = width(t);
      expect(spread).toBeGreaterThan(9 * 0.75);
      t = frames(30, ['w'], t);
      expect(airborne()).toBe(true);
      allReal(t);
      // S folds the wings and you dive back in, nose first, bubbles streaming behind.
      let n = 0;
      while (airborne() && n++ < 600) t = frames(1, ['s'], t);
      expect(airborne()).toBe(false);
      expect(wingsOpen()).toBeLessThan(0.3);
      expect(lastSplash()).toBeGreaterThan(first);
      expect(swimmer(t).f[1]).toBeLessThan(-0.3);
      t = frames(10, [], t);
      expect(bubblesNow()).toBeGreaterThan(0.5);
      expect(width(t)).toBeLessThan(spread * 0.7);
      allReal(t);
      setSwim(false, [], 0, 0);
      setSeaOf(0, k);
    });

    it('eats only on B, the three bites by turns; on a boost B is one long lunge', () => {
      setSeaOf(0, k);
      setVariant(0, k);
      resetPrey();
      const t0 = 1300;
      placeSwimmer([40, -6, 40]);
      const fish = preyAt(0, t0).c;
      // The mouth right at a fish (you head along -z).
      placeSwimmer([fish[0], fish[1] - 2, fish[2] + 0.65 * 9]);
      setSwim(true, [], 1 / 60, t0);
      expect(biteAt(t0 + 0.01)).toBeNull();
      expect(eatenCount()).toBe(0);
      // B: the lunge, taking the fish at the mouth.
      setSwim(true, ['b'], 1 / 60, t0 + 1 / 60);
      expect(biteAt(t0 + 0.1)?.style).toBe(0);
      expect(eatenCount()).toBeGreaterThan(0);
      // Held, it does not bite again; pressed again, the sweep, then the rise.
      const t1 = t0 + BITE + 0.1;
      setSwim(true, ['b'], 1 / 60, t1);
      expect(biteAt(t1 + 0.01)).toBeNull();
      setSwim(true, [], 1 / 60, t1 + 0.02);
      setSwim(true, ['b'], 1 / 60, t1 + 0.04);
      expect(biteAt(t1 + 0.1)?.style).toBe(1);
      const t2 = t1 + BITE + 0.2;
      setSwim(true, [], 1 / 60, t2);
      setSwim(true, ['b'], 1 / 60, t2 + 0.02);
      expect(biteAt(t2 + 0.1)?.style).toBe(2);
      // With Space held: a long lunge, still going after a plain bite would have ended.
      const t3 = t2 + BITE + 0.2;
      setSwim(true, [' '], 1 / 60, t3);
      setSwim(true, [' ', 'b'], 1 / 60, t3 + 0.02);
      const long = biteAt(t3 + 0.1);
      expect(long?.style).toBe(0);
      expect(long?.long).toBe(true);
      expect(LUNGE).toBeGreaterThan(BITE);
      expect(biteAt(t3 + 0.02 + BITE + 0.1)).not.toBeNull();
      // A clownfish has no bite.
      setVariant(2, k);
      const before = eatenCount();
      frames(30, ['b'], t3 + 3);
      expect(eatenCount()).toBe(before);
      setSwim(false, [], 0, 0);
      setVariant(0, k);
      resetPrey();
    });

    it('sends a school turning away together and fast as you charge it', () => {
      setSeaOf(0, k);
      setVariant(0, k);
      resetPrey();
      const t0 = 1400;
      placeSwimmer([40, -6, 40]);
      const school = Array.from({ length: 12 }, (_, n) => n * 5);
      const mid = school
        .map((i) => preyAt(i, t0).c)
        .reduce((a, c) => [a[0] + c[0] / 12, a[1] + c[1] / 12, a[2] + c[2] / 12], [0, 0, 0]);
      placeSwimmer([mid[0], mid[1] - 3, mid[2] + 16]);
      frames(45, [' '], t0);
      const fleeing = school.filter((i) => dashSpeed(i) > 2);
      expect(fleeing.length).toBeGreaterThanOrEqual(8);
      expect(Math.max(...school.map(dashSpeed))).toBeGreaterThan(5);
      setSwim(false, [], 0, 0);
      resetPrey();
    });

    it('turns every fish blue, red, gold or silver at the press of a button, and back', () => {
      expect(FISH_MODES).toEqual([
        'Natural fish',
        'Blue fish',
        'Red fish',
        'Gold fish',
        'Silver fish',
      ]);
      const ids = ['fish-pulse', 'shoal', 'sardines', 'reef', 'swim'];
      for (let i = 0; i < PHASES.length; i++)
        expect(hasFishModes(i)).toBe(ids.includes(PHASES[i]?.id ?? ''));
      // Each fish keeps its own light: only the hue changes.
      setFishMode(1);
      const c = fishTint([0.3, 0.2, 0.05], 3);
      expect(Math.max(...c)).toBeCloseTo(0.3, 6);
      expect(c[2]).toBeGreaterThan(c[0]);
      setFishMode(0);
      expect(fishTint([0.3, 0.2, 0.05], 3)).toEqual([0.3, 0.2, 0.05]);
      // In the open water every shoal fish is blue, then red.
      setSeaOf(1, k);
      setVariant(2, k);
      const fishGrains = particles.filter((p) => p.c >= 0.2 && p.c < 0.72).slice(0, 400);
      const sardines = PHASES.findIndex((p) => p.id === 'sardines');
      for (const [mode, ok] of [
        [1, (r: number, _g: number, b: number) => b >= r],
        [2, (r: number, g: number, b: number) => r >= g && r >= b],
      ] as [number, (r: number, g: number, b: number) => boolean][]) {
        setFishMode(mode);
        for (const p of fishGrains) {
          const [r, g, b] = pieceAt(p, k, 30).rgb as [number, number, number];
          if (Math.max(r, g, b) < 1e-3) continue;
          // The visitors' whales keep their own colours.
          if (hash(p.i, 250) < 0.22 && hash(p.i, 251) >= 0.55) continue;
          expect(ok(r, g, b)).toBe(true);
        }
        for (const p of particles.filter((q) => q.c >= 0.08).slice(0, 200)) {
          const [r, g, b] = pieceAt(p, sardines, 10).rgb as [number, number, number];
          expect(ok(r, g, b)).toBe(true);
        }
      }
      setFishMode(0);
      setVariant(0, k);
      setSeaOf(0, k);
    });

    it('shows four cockpit gauges: height, speed, fish eaten, treasure', () => {
      setSeaOf(0, k);
      setVariant(0, k);
      resetPrey();
      resetTreasure();
      placeSwimmer([40, -6, 40]);
      frames(10, [], 1500);
      const g = gauges();
      expect(g.map((x) => x.label)).toEqual(['Height', 'Speed', 'Fish', 'Treasure']);
      for (const x of g) {
        expect(Number.isFinite(x.value)).toBe(true);
        expect(x.max).toBeGreaterThan(x.min ?? 0);
      }
      // Under the surface the height reads below zero; the speed your cruise.
      expect(g[0]?.value).toBeLessThan(0);
      expect(g[1]?.value).toBe(Math.round(SWIM_SPEED));
      expect(g[2]?.value).toBe(0);
      expect(g[3]?.value).toBe(0);
      setSwim(false, [], 0, 0);
    });

    it('holds you inside the great tunnel until a mouth, and keeps you out of its walls from outside', () => {
      setSeaOf(0, k);
      setVariant(0, k);
      // Inside the trunk, swimming hard at the wall: held inside.
      const mid = tunnelAt(12).c;
      placeSwimmer([mid[0], mid[1], mid[2]], -Math.PI / 2);
      expect(inTunnel()).toBe(true);
      let t = 1600;
      for (let i = 0; i < 6; i++) {
        // Straight at the side wall, then up into the roof as well.
        t = frames(40, i % 2 ? ['e'] : ['e', 'w'], t);
        expect(inTunnel()).toBe(true);
        expect(tubeOf(swimmer(t).c).d).toBeLessThan(TUNNEL_R - 2);
      }
      // Out through the mouth, it lets you go.
      const near0 = tunnelAt(3).c;
      placeSwimmer([near0[0], near0[1], near0[2]], Math.PI);
      t = frames(180, [], t);
      expect(inTunnel()).toBe(false);
      expect(swimmer(t).c[2]).toBeGreaterThan(tunnelAt(0).c[2]);
      // From outside its side, the wall keeps you out.
      placeSwimmer([mid[0] + TUNNEL_R + 6, mid[1], mid[2]], Math.PI / 2);
      t = frames(240, ['e'], t);
      expect(inTunnel()).toBe(false);
      expect(tubeOf(swimmer(t).c).d).toBeGreaterThan(TUNNEL_R + 2);
      // In by the mouth, and out by a branch's.
      const mouth = tunnelAt(0).c;
      placeSwimmer([mouth[0], mouth[1], mouth[2] + 5], 0);
      t = frames(120, [], t);
      expect(inTunnel()).toBe(true);
      const end = tunnelAt(TUNNEL_LEN - 3);
      placeSwimmer(end.c, Math.atan2(-end.f[0], -end.f[2]));
      t = frames(150, [], t);
      expect(inTunnel()).toBe(false);
      // The small red fish swim inside it; every grain somewhere real.
      const me = swimmer(t).c;
      for (let j = 0; j < RED_FISH; j++)
        expect(tubeOf(redFish(j, t, me).c).d).toBeLessThan(TUNNEL_R + 0.5);
      allReal(t);
      setSwim(false, [], 0, 0);
    });

    it('finds regions as you swim: a flight of forty mantas that keeps your pace, swarms of jellyfish', () => {
      setSeaOf(1, k);
      setVariant(0, k);
      // Look across the sea for one of each.
      const find = (kind: 'manta' | 'jelly') => {
        for (let x = -900; x < 900; x += 15)
          for (let z = -900; z < 900; z += 15) {
            const zone = zoneAt([x, 0, z]);
            if (zone?.kind === kind && zone.w >= 1) return [x, z] as [number, number];
          }
        return null;
      };
      const manta = find('manta');
      const jelly = find('jelly');
      expect(manta).not.toBeNull();
      expect(jelly).not.toBeNull();
      const [mx, mz] = manta as [number, number];
      placeSwimmer([mx, 10, mz]);
      let t = frames(240, [], 1700);
      expect(zoneNow(t)?.kind).toBe('manta');
      expect(FLOCK).toBe(40);
      const me = swimmer(t).c;
      for (let m = 0; m < FLOCK; m++) {
        const c = flockManta(m, t).c;
        expect(Math.hypot(c[0] - me[0], c[2] - me[2])).toBeLessThan(45);
      }
      // They keep your pace: still round you after a hard swim.
      t = frames(120, ['e'], t);
      const me2 = swimmer(t).c;
      const gaps = Array.from({ length: FLOCK }, (_, m) => {
        const c = flockManta(m, t).c;
        return Math.hypot(c[0] - me2[0], c[2] - me2[2]);
      });
      expect(Math.max(...gaps)).toBeLessThan(50);
      allReal(t);
      const [jx, jz] = jelly as [number, number];
      placeSwimmer([jx, 20, jz]);
      t = frames(30, ['q'], t);
      expect(zoneNow(t)?.kind).toBe('jelly');
      allReal(t);
      // Out in open sea, no region.
      expect(ZONE_CELL).toBeGreaterThan(84);
      setSwim(false, [], 0, 0);
      setSeaOf(0, k);
    });

    it('lets you eat a calamari for a superboost, and blinds you with ink now and then', () => {
      setSeaOf(0, k);
      setVariant(0, k);
      resetPrey();
      // Up close to each squid in turn, until one inks.
      let t = 1800;
      let inked = -1;
      for (let tries = 0; tries < 40 && inked < 0; tries++) {
        const j = tries % CALAMARI;
        placeSwimmer([40, -6, 40]);
        const c = calamariAt(j, t).c;
        placeSwimmer([c[0], c[1], c[2] + 4]);
        setSwim(true, [], 1 / 60, t);
        if (inkVeil(t + 0.1) > 0) inked = t;
        else t += 13;
      }
      expect(inked).toBeGreaterThan(0);
      expect(inkVeil(inked + 1)).toBe(1);
      const fading = inkVeil(inked + 3);
      expect(fading).toBeGreaterThan(0);
      expect(fading).toBeLessThan(1);
      expect(inkVeil(inked + INK_SECONDS + 0.1)).toBe(0);
      // A calamari at the mouth, bitten: the bar fills and a superboost runs.
      resetPrey();
      t += 50;
      placeSwimmer([40, -6, 40]);
      const c = calamariAt(1, t).c;
      placeSwimmer([c[0], c[1], c[2] + 0.65 * 9]);
      setSwim(true, ['b'], 1 / 60, t);
      expect(superOn()).toBe(true);
      expect(boostLeft()).toBe(1);
      // Faster than a boost, and the bar does not run down.
      t = frames(30, [' '], t + 1);
      const a = swimmer(t).c;
      t = frames(60, [' '], t);
      const b = swimmer(t).c;
      expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeGreaterThan(
        SWIM_SPEED * BOOST_PACE * 1.1,
      );
      expect(boostLeft()).toBe(1);
      expect(SUPER_PACE).toBeGreaterThan(BOOST_PACE);
      allReal(t);
      setSwim(false, [], 0, 0);
      resetPrey();
    });

    it('gives deep lines about freedom while you play, each with its author, a line at a time', () => {
      expect(FREEDOM.length).toBeGreaterThanOrEqual(10);
      const allowed = [
        'Walt Whitman',
        'Jean-Jacques Rousseau',
        'Henry David Thoreau',
        'Charlotte Brontë',
        'Ralph Waldo Emerson',
        'Herman Melville',
        'Rabindranath Tagore',
        'Frederick Douglass',
      ];
      for (const q of FREEDOM) {
        expect(q.text.split(/\s+/).length).toBeLessThanOrEqual(15);
        expect(allowed).toContain(q.by);
      }
      // The Journey shows the first, with its author.
      expect(PHASES[k]?.words).toEqual([FREEDOM[0]?.text, `— ${FREEDOM[0]?.by}`]);
      // On its own the piece goes through them, each fading in and out.
      const a = freedomAt(QUOTE_SECONDS * 0.5);
      expect(a.lines[1]).toBe(`— ${FREEDOM[0]?.by}`);
      expect(a.shown).toBe(1);
      expect(freedomAt(QUOTE_SECONDS * 1.5).lines[0]).toBe(FREEDOM[1]?.text);
      expect(freedomAt(QUOTE_SECONDS * 2).shown).toBe(0);
      expect(freedomAt(QUOTE_SECONDS * FREEDOM.length + 1).lines).toEqual(freedomAt(1).lines);
    });
  });
});
