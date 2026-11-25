import { describe, expect, it } from 'vitest';
import { distToLoop, siteHit, WRECKS } from './mars';
import {
  BOUNCE,
  bounceOff,
  COLD,
  DAMAGE,
  damageOf,
  FOE,
  type Foe,
  type FoeKind,
  fly,
  foesNear,
  foesOnBeam,
  ghostShown,
  hitFoe,
  hittable,
  legKnee,
  makePath,
  pathAt,
  ROBOT,
  SPIDER_LEGS,
  SWOOP,
  sharkPrey,
  stepFoe,
  swoopOf,
  touches,
} from './mars-foes';
import { marsHabitat, spawnFoes } from './mars-lairs';

function foe(kind: FoeKind, over: Partial<Foe> = {}): Foe {
  return {
    id: 1,
    kind,
    hx: 0,
    hy: 0,
    range: 30,
    x: 0,
    y: 0,
    z: kind === 'ufo' ? 5 : 0,
    h: 0,
    hp: FOE[kind].hp,
    dead: null,
    hitAt: -99,
    coldAt: -99,
    seed: 0.3,
    s: 0,
    chasing: false,
    ...over,
  };
}

describe('paths', () => {
  const line = makePath([0, 100, 100], [0, 0, 50], false);
  const loop = makePath([0, 100, 100, 0], [0, 0, 100, 100], true);

  it('measures and walks a line to its end and back', () => {
    expect(line.len).toBeCloseTo(150, 9);
    expect(pathAt(line, 50).x).toBeCloseTo(50, 9);
    expect(pathAt(line, 125).y).toBeCloseTo(25, 9);
    // On the way back it faces back.
    const back = pathAt(line, 250);
    expect(back.x).toBeCloseTo(50, 9);
    expect(Math.cos(back.h)).toBeCloseTo(-1, 9);
  });

  it('goes round a loop', () => {
    expect(loop.len).toBeCloseTo(400, 9);
    expect(pathAt(loop, 450).x).toBeCloseTo(50, 9);
    expect(pathAt(loop, -50).y).toBeCloseTo(50, 9);
  });
});

describe('where the foes live', () => {
  const foes = spawnFoes();
  const count = (k: FoeKind) => foes.filter((f) => f.kind === k).length;

  it('fills Mars with every kind, within the caps', () => {
    expect(count('robot')).toBeGreaterThanOrEqual(20);
    expect(count('robot')).toBeLessThanOrEqual(30);
    expect(count('spider')).toBe(4);
    expect(count('ghost')).toBe(24);
    expect(count('manta')).toBe(18);
    expect(count('ufo')).toBe(5);
    expect(count('squid')).toBe(8);
    expect(new Set(foes.map((f) => f.id)).size).toBe(foes.length);
  });

  it('stands the robots clear of what they guard, the ghosts round the wrecks', () => {
    for (const f of foes.filter((q) => q.kind === 'robot'))
      expect(siteHit(f.x, f.y, FOE.robot.r)).toBeNull();
    // Round a wreck, outside its hull's length.
    for (const w of WRECKS) {
      const half = Math.hypot(w.hull.bx - w.hull.ax, w.hull.by - w.hull.ay) / 2;
      for (const f of foes.filter((q) => q.kind === 'robot' && q.hx === w.x && q.hy === w.y))
        expect(f.range).toBeGreaterThan(half + w.hull.R);
    }
    for (const w of WRECKS)
      expect(foes.some((f) => f.kind === 'ghost' && Math.hypot(f.hx - w.x, f.hy - w.y) < 1)).toBe(
        true,
      );
  });

  it('walks the spiders down both canyons and round the plain, never through a station', () => {
    const h = marsHabitat();
    expect(h.walks).toHaveLength(4);
    for (const w of h.walks) {
      expect(w.len).toBeGreaterThan(1000);
      for (let s = 0; s < w.len; s += 10) {
        const p = pathAt(w, s);
        expect(siteHit(p.x, p.y, 6)).toBeNull();
      }
    }
  });

  it('gives each run its own copies', () => {
    const a = spawnFoes();
    a[0].hp = -5;
    expect(spawnFoes()[0].hp).toBe(FOE[a[0].kind].hp);
  });
});

describe('how they move', () => {
  it('patrols a robot round its ring, rolls it at you when near, never past its leash', () => {
    const r = foe('robot', { range: 40, x: 40, y: 0 });
    const far = { x: 1000, y: 1000, up: 0 };
    for (let i = 0; i < 60; i++) stepFoe(r, 1 / 30, i / 30, far);
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(40, 0);
    expect(r.chasing).toBe(false);
    const you = { x: r.x + 50, y: r.y, up: 0 };
    stepFoe(r, 1 / 30, 3, you);
    expect(r.chasing).toBe(true);
    // Chased far away, it gives up at its leash.
    for (let i = 0; i < 2000; i++) {
      stepFoe(r, 1 / 30, 3 + i / 30, { x: r.x + 40, y: r.y, up: 0 });
    }
    expect(Math.hypot(r.x, r.y)).toBeLessThan(ROBOT.leash + ROBOT.chase);
    // Up in the air you are out of its reach.
    const r2 = foe('robot', { range: 40, x: 40, y: 0 });
    stepFoe(r2, 1 / 30, 0, { x: 60, y: 0, up: 10 });
    expect(r2.chasing).toBe(false);
  });

  it('walks a spider along its path', () => {
    const p = makePath([0, 1000], [0, 0], false);
    const s = foe('spider', { path: p, s: 0 });
    for (let i = 0; i < 30; i++) stepFoe(s, 1 / 30, i / 30, { x: 5000, y: 0, up: 0 });
    expect(s.x).toBeGreaterThan(5);
    expect(s.x).toBeLessThan(12);
  });

  it('fades a ghost in and out', () => {
    const g = foe('ghost');
    let lo = 1;
    let hi = 0;
    for (let t = 0; t < 60; t += 0.1) {
      lo = Math.min(lo, ghostShown(g, t));
      hi = Math.max(hi, ghostShown(g, t));
    }
    expect(lo).toBeLessThan(0.3);
    expect(hi).toBeGreaterThan(0.9);
  });

  it('flies mantas low over the dunes, squids high, UFOs swooping down now and then', () => {
    const m = foe('manta', { range: 400 });
    const q = foe('squid', { range: 600 });
    const u = foe('ufo', { range: 500 });
    let uLow = 90;
    let uHigh = 0;
    for (let t = 0; t < SWOOP.every * 2; t += 0.1) {
      expect(fly(m, t).z).toBeGreaterThan(2);
      expect(fly(m, t).z).toBeLessThan(7);
      expect(fly(q, t).z).toBeGreaterThan(150);
      uLow = Math.min(uLow, fly(u, t).z);
      uHigh = Math.max(uHigh, fly(u, t).z);
    }
    expect(uLow).toBeLessThan(SWOOP.alt + 1);
    expect(uHigh).toBeGreaterThan(80);
    expect(
      swoopOf(u, ((SWOOP.every - u.seed * SWOOP.every) % SWOOP.every) + SWOOP.low / 2),
    ).toBeCloseTo(1, 6);
  });

  it('brings a wrecked foe back home after a while, once you are away', () => {
    const r = foe('robot', { dead: 0, hp: 0, x: 500, y: 500 });
    stepFoe(r, 1 / 30, FOE.robot.respawn + 1, { x: 10, y: 0, up: 0 });
    expect(r.dead).toBe(0);
    stepFoe(r, 1 / 30, FOE.robot.respawn + 1, { x: 1000, y: 0, up: 0 });
    expect(r.dead).toBeNull();
    expect(r.hp).toBe(FOE.robot.hp);
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(r.range, 6);
  });
});

describe('what beats them', () => {
  it('wrecks a robot with one shot, shark, laser or boosted ram', () => {
    for (const by of ['shot', 'shark', 'laser', 'ram'] as const) {
      const r = foe('robot');
      expect(hitFoe(r, by, 1)).toBe(true);
      expect(r.dead).toBe(1);
      expect(hittable(r)).toBe(false);
    }
  });

  it('takes several hits to bring a spider down, a boosted ram the biggest', () => {
    const s = foe('spider');
    let hits = 0;
    while (!hitFoe(s, 'ram', hits)) hits++;
    expect(hits + 1).toBe(Math.ceil(FOE.spider.hp / DAMAGE.ram));
    expect(hits + 1).toBeGreaterThanOrEqual(3);
    expect(DAMAGE.ram).toBeGreaterThan(DAMAGE.shot);
  });

  it('dispels a ghost only with the laser; squids are out of reach; UFOs only while low', () => {
    expect(damageOf('ghost', 'shot')).toBe(0);
    expect(damageOf('ghost', 'ram')).toBe(0);
    expect(hitFoe(foe('ghost'), 'laser', 1)).toBe(true);
    expect(hitFoe(foe('squid'), 'laser', 1)).toBe(false);
    expect(hittable(foe('ufo', { z: 80 }))).toBe(false);
    expect(hittable(foe('ufo', { z: 6 }))).toBe(true);
  });

  it('finds what a burst reaches and what lies along a beam', () => {
    const a = foe('robot', { id: 1, x: 20, y: 0 });
    const b = foe('robot', { id: 2, x: 20, y: 30 });
    expect(foesNear([a, b], 10, 0, 10).map((f) => f.id)).toEqual([1]);
    expect(foesOnBeam([a, b], 0, 0, 100, 0).map((f) => f.id)).toEqual([1]);
    expect(foesOnBeam([a, b], 0, 0, 10, 0)).toHaveLength(0);
  });

  it('sends a Dust Shark after the nearest foe ahead, when it is nearer than him', () => {
    const a = foe('robot', { id: 1, x: 100, y: 0 });
    const behind = foe('robot', { id: 2, x: -20, y: 0 });
    const ghost = foe('ghost', { id: 3, x: 30, y: 0 });
    const p = { x: 0, y: 0, h: 0 };
    expect(sharkPrey([a, behind, ghost], p, 500)?.id).toBe(1);
    expect(sharkPrey([a, behind, ghost], p, 50)).toBeNull();
  });
});

describe('what they do to you', () => {
  it('rams a robot while boosting, bounces you off without', () => {
    const r = foe('robot', { x: 2, y: 0 });
    const you = { x: 0, y: 0, up: 0 };
    expect(touches([r], you, true, 0)[0].kind).toBe('ram');
    const t = touches([r], you, false, 0)[0];
    expect(t.kind).toBe('bounce');
    if (t.kind === 'bounce') expect(t.nx).toBeCloseTo(-1, 9);
    // Flying over it, nothing.
    expect(touches([r], { x: 0, y: 0, up: 8 }, true, 0)).toHaveLength(0);
  });

  it('turns the speed into it back out, losing some', () => {
    // Driving east into a foe ahead (the normal points back west, at you).
    const out = bounceOff(40, 5, -1, 0);
    expect(out.vx).toBeCloseTo(-40 * BOUNCE.keep, 9);
    expect(out.vy).toBeCloseTo(5 * BOUNCE.keep, 9);
    // Already moving away: only the loss.
    expect(bounceOff(-10, 0, -1, 0).vx).toBeCloseTo(-10 * BOUNCE.keep, 9);
  });

  it('chills you through a ghost now and then, bumps a manta, lifts you under a UFO', () => {
    const g = foe('ghost', { z: 3 });
    expect(touches([g], { x: 1, y: 0, up: 0 }, false, 5)[0].kind).toBe('cold');
    expect(touches([{ ...g, coldAt: 4 }], { x: 1, y: 0, up: 0 }, false, 5)).toHaveLength(0);
    expect(
      touches([{ ...g, coldAt: 5 - COLD.again - 0.1 }], { x: 1, y: 0, up: 0 }, false, 5),
    ).toHaveLength(1);
    const m = foe('manta', { z: 4 });
    expect(touches([m], { x: 2, y: 0, up: 3 }, false, 0)[0].kind).toBe('bump');
    const u = foe('ufo', { z: 8 });
    expect(touches([u], { x: 4, y: 0, up: 0 }, false, 0)[0].kind).toBe('lift');
    expect(touches([{ ...u, z: 80 }], { x: 4, y: 0, up: 0 }, false, 0)).toHaveLength(0);
  });
});

describe('the spiders’ legs', () => {
  it('bends each leg at a knee raised above the line from hip to foot, bones kept their length', () => {
    const hip: [number, number, number] = [0, 0, 9];
    const foot: [number, number, number] = [10, 2, 0];
    const k = legKnee(hip, foot, 8, 8);
    expect(Math.hypot(k[0] - hip[0], k[1] - hip[1], k[2] - hip[2])).toBeCloseTo(8, 6);
    expect(Math.hypot(k[0] - foot[0], k[1] - foot[1], k[2] - foot[2])).toBeCloseTo(8, 6);
    // Above the straight line's middle.
    expect(k[2]).toBeGreaterThan((hip[2] + foot[2]) / 2);
    // Out of reach: the leg straightens toward the foot.
    const far = legKnee(hip, [40, 0, 0], 8, 8);
    expect(Math.hypot(far[0] - hip[0], far[1] - hip[1], far[2] - hip[2])).toBeCloseTo(8, 3);
  });

  it('splays eight legs, four a side, in two groups that step in turn', () => {
    expect(SPIDER_LEGS).toHaveLength(8);
    expect(SPIDER_LEGS.filter((l) => l.fy > 0)).toHaveLength(4);
    expect(SPIDER_LEGS.filter((l) => l.group === 0)).toHaveLength(4);
    for (const l of SPIDER_LEGS) expect(Math.hypot(l.fx, l.fy)).toBeGreaterThan(10);
  });

  it('keeps every foe off the Red Bastard’s start and away from where you start', () => {
    for (const f of spawnFoes().filter((q) => q.kind === 'robot'))
      expect(distToLoop(f.x, f.y)).toBeGreaterThan(20);
  });
});
