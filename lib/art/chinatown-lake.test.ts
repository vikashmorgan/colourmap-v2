import { describe, expect, it } from 'vitest';

import {
  FAR_GATE,
  farGateThrough,
  KRAKEN,
  krakenRise,
  LAKE,
  lakeGround,
  lakeHeight,
  newLakeRun,
  newRipples,
  onLake,
  PORTAL,
  PORTALS,
  PORTALS_NEEDED,
  portalFacing,
  portalThrough,
  RIPPLE,
  ringAt,
  SHARK,
  SHARKS,
  SLAMMER,
  SLIP,
  sharkAt,
  sharkSplashes,
  slamLands,
  slamPhase,
  slamPush,
  slipHeight,
  splashRing,
  stepLakeRun,
  stepRipples,
  TENTACLES,
  tentaclePoints,
  turnedBack,
  wakes,
} from './chinatown-lake';
import { wrapAngle } from './drive';
import { CHINATOWN, frameAt, heightAt, makeTrackWorld, pointAt, project } from './track';
import { G, newVehicle, stepVehicle, type Vehicle } from './vehicle';

const world = makeTrackWorld(CHINATOWN);
const tr = world.track;

describe('the slipway behind the start (2026-11-25: "WHEN U 180 ON THE START … INTO THE LAKE")', () => {
  it('runs on back from the start at street level and dips smoothly down to the water', () => {
    expect(slipHeight(0)).toBeCloseTo(0, 9);
    expect(slipHeight(-SLIP.FROM)).toBeCloseTo(0, 9);
    expect(slipHeight(-SLIP.LEN)).toBeCloseTo(LAKE.LEVEL, 9);
    // Never steeper than 10 %, and its curve eases at both ends (at 30 m/s it asks under a third
    // of gravity).
    let steep = 0;
    let curve = 0;
    for (let s = -SLIP.LEN - 20; s < 10; s += 0.5) {
      steep = Math.max(steep, Math.abs(slipHeight(s + 0.5) - slipHeight(s - 0.5)));
      curve = Math.max(
        curve,
        Math.abs(slipHeight(s + 1) - 2 * slipHeight(s) + slipHeight(s - 1)) * 30 * 30,
      );
    }
    expect(steep).toBeLessThan(0.1);
    expect(curve).toBeLessThan(G / 3);
  });

  it('meets the street at the start without a step, and the track reads it behind the start', () => {
    for (const u of [-8, 0, 8]) {
      expect(Math.abs(heightAt(tr, -0.01, u) - heightAt(tr, 0.01, u))).toBeLessThan(0.05);
      expect(heightAt(tr, -SLIP.LEN - 50, u)).toBeCloseTo(LAKE.LEVEL, 9);
    }
    expect(lakeHeight(-1000, 500)).toBe(LAKE.LEVEL);
    expect(onLake(-100, 0)).toBe(false);
    expect(onLake(-SLIP.LEN - 1, 0)).toBe(true);
  });

  it('holds you to the slipway along it; on the water, loose grip and no road', () => {
    const g = lakeGround(-150, 2, 0);
    expect(g.road?.half).toBe(SLIP.HALF);
    expect(g.water).toBe(false);
    const w = lakeGround(-900, 300, 0);
    expect(w.road).toBeUndefined();
    expect(w.water).toBe(true);
    expect(w.grip).toBeLessThan(0.7);
  });

  it('knows a racer turned round behind the grid, and no one going the right way', () => {
    expect(turnedBack(-5, Math.PI, 0, 10)).toBe(true);
    expect(turnedBack(-5, 0.2, 0, 10)).toBe(false);
    expect(turnedBack(30, Math.PI, 0, 10)).toBe(false);
    expect(turnedBack(-5, Math.PI, 0, 0)).toBe(false);
  });
});

describe('the portals of light (2026-11-25: "PORTALS OF LIGHT ON THE LAKE")', () => {
  it('stand on the water in a long S out toward the far shore, inside the lake', () => {
    expect(PORTALS).toHaveLength(7);
    for (const [s, u] of PORTALS) {
      expect(onLake(s, u)).toBe(true);
      expect(s).toBeGreaterThan(-LAKE.BACK + 200);
      expect(Math.abs(u)).toBeLessThan(LAKE.HALF - 200);
    }
    for (let i = 1; i < PORTALS.length; i++) {
      const [a, b] = [PORTALS[i - 1], PORTALS[i]];
      expect(b[0]).toBeLessThan(a[0]);
      // Never more than 40° off the way out from one to the next: a flowing S.
      expect(Math.abs(Math.atan2(b[1] - a[1], -(b[0] - a[0])))).toBeLessThan((40 * Math.PI) / 180);
    }
  });

  it('counts a pass through a ring, either way, and not beside it', () => {
    const [s, u] = PORTALS[3];
    const f = portalFacing(3);
    const along = (d: number, across = 0) => [
      s + Math.cos(f) * d - Math.sin(f) * across,
      u + Math.sin(f) * d + Math.cos(f) * across,
    ];
    const [a0, b0] = along(-3);
    const [a1, b1] = along(3);
    expect(portalThrough(a0, b0, a1, b1)).toBe(3);
    expect(portalThrough(a1, b1, a0, b0)).toBe(3);
    const [c0, d0] = along(-3, PORTAL.R + 1);
    const [c1, d1] = along(3, PORTAL.R + 1);
    expect(portalThrough(c0, d0, c1, d1)).toBe(-1);
    // Not a teleport across the lake.
    expect(portalThrough(a0, b0, a0 - 500, b0)).toBe(-1);
  });

  it('finds Water City when the last of the seven is lit, once', () => {
    let run = newLakeRun();
    for (let i = 0; i < PORTALS_NEEDED - 1; i++) run = stepLakeRun(run, i);
    expect(run.found).toBe(false);
    run = stepLakeRun(run, 2);
    expect(run.found).toBe(false);
    run = stepLakeRun(run, PORTALS_NEEDED - 1);
    expect(run.found).toBe(true);
    expect(stepLakeRun(run, -1)).toBe(run);
  });
});

describe('the far shore gate (2026-11-25: "also reachable via the lake")', () => {
  it('stands on the water before Water City; through it either way, not round it', () => {
    expect(onLake(FAR_GATE.S, 0)).toBe(true);
    expect(FAR_GATE.S).toBeLessThan(PORTALS[PORTALS.length - 1][0]);
    expect(farGateThrough(FAR_GATE.S + 2, 0, FAR_GATE.S - 2, 3)).toBe(true);
    expect(farGateThrough(FAR_GATE.S - 2, 0, FAR_GATE.S + 2, 0)).toBe(true);
    expect(farGateThrough(FAR_GATE.S + 2, 40, FAR_GATE.S - 2, 40)).toBe(false);
    expect(farGateThrough(FAR_GATE.S + 10, 0, FAR_GATE.S + 2, 0)).toBe(false);
  });
});

describe('ripples and rain', () => {
  it('drops a ring every few metres the car skims, never more than the shader holds', () => {
    let r = newRipples();
    for (let i = 0; i < 400; i++) r = stepRipples(r, i * 1, 0, i * 0.02, 50, true);
    expect(r.rings.length).toBeLessThanOrEqual(RIPPLE.MAX);
    const xs = r.rings.map((q) => q.x);
    for (let i = 1; i < xs.length; i++)
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(RIPPLE.STEP);
    // Off the water: none.
    expect(stepRipples(newRipples(), 0, 0, 0, 50, false).rings).toHaveLength(0);
  });

  it('a ring grows and fades out; a splash adds one', () => {
    const q = { x: 0, y: 0, t: 1, k: 1 };
    expect(ringAt(q, 1).a).toBe(1);
    expect(ringAt(q, 2).r).toBeCloseTo(RIPPLE.SPEED, 9);
    expect(ringAt(q, 1 + RIPPLE.LIFE).a).toBe(0);
    expect(splashRing(newRipples(), 3, 4, 5).rings).toHaveLength(1);
  });
});

describe('the sharks (2026-11-25: "SHARKS JUMPING INTO THE AIR AND BACK DOWN")', () => {
  it('each leaps in an arc and splashes back, then is under for most of the time', () => {
    for (let i = 0; i < SHARKS.length; i++) {
      let air = 0;
      let top = 0;
      const sp = SHARKS[i];
      for (let t = 0; t < sp.every; t += 0.01) {
        const p = sharkAt(i, t);
        if (!p) continue;
        air += 0.01;
        top = Math.max(top, p.z);
        expect(p.z).toBeGreaterThanOrEqual(0);
        expect(onLake(p.s, p.u)).toBe(true);
      }
      expect(air).toBeCloseTo(SHARK.AIR, 1);
      expect(top).toBeGreaterThan(SHARK.HIGH * 0.95);
      expect(air / sp.every).toBeLessThan(0.3);
    }
  });

  it('nose up leaving the water, nose down going back in', () => {
    const sp = SHARKS[0];
    const t0 = sp.every - sp.phase;
    expect(sharkAt(0, t0 + 0.05)?.pitch).toBeGreaterThan(0.5);
    expect(sharkAt(0, t0 + SHARK.AIR - 0.05)?.pitch).toBeLessThan(-0.5);
  });

  it('breaks the water twice a leap, out and back in', () => {
    const sp = SHARKS[0];
    let outs = 0;
    let ins = 0;
    for (let t = 0; t < sp.every; t += 1 / 60) {
      for (const s of sharkSplashes(t, t + 1 / 60).filter(
        (x) => Math.hypot(x.s - sp.s, x.u - sp.u) < 20,
      )) {
        if (s.out) outs++;
        else ins++;
      }
    }
    expect(outs).toBe(1);
    expect(ins).toBe(1);
  });
});

describe('the kraken (2026-11-25: "ADD A KRAKEN IN THE LAKE")', () => {
  it('wakes as you come near its lair, rises, and sinks once you are well past', () => {
    const [ls, lu] = KRAKEN.LAIRS[0];
    expect(wakes(0, ls + KRAKEN.WAKE + 50, lu)).toBe(false);
    expect(wakes(0, ls + KRAKEN.WAKE - 50, lu)).toBe(true);
    expect(krakenRise(-1, 0)).toBe(0);
    expect(krakenRise(0, -300)).toBe(0);
    expect(krakenRise(KRAKEN.RISE, 0)).toBeCloseTo(1, 9);
    expect(krakenRise(KRAKEN.RISE, KRAKEN.SLEEP + 300)).toBe(0);
  });

  it('two tentacles arch over the way, their tips meeting high over it', () => {
    for (const l of [0, 1]) {
      const a = tentaclePoints(l, 0, 1, 0, 24);
      const b = tentaclePoints(l, 1, 1, 0, 24);
      const ta = a[a.length - 1];
      const tb = b[b.length - 1];
      expect(Math.hypot(ta.s - tb.s, ta.u - tb.u)).toBeLessThan(6);
      expect(Math.min(ta.z, tb.z)).toBeGreaterThan(20);
      // Rooted either side of the S, the way between them clear (a car fits under).
      expect(a[0].z).toBe(0);
      expect(Math.hypot(a[0].s - b[0].s, a[0].u - b[0].u)).toBeGreaterThan(40);
    }
    expect(TENTACLES.filter((t) => t.arch !== 0)).toHaveLength(2);
  });

  it('slams on a beat once up, lifting first, landing once each time', () => {
    expect(slamPhase(0).lift).toBe(0);
    expect(slamPhase(KRAKEN.FIRST + KRAKEN.LIFT * 0.99).lift).toBeGreaterThan(0.9);
    let lands = 0;
    for (let x = 0; x < KRAKEN.FIRST + KRAKEN.SLAP * 3 - 0.5; x += 1 / 60)
      if (slamLands(x, x + 1 / 60)) lands++;
    expect(lands).toBe(3);
  });

  it('a slam nudges a car near it away, harmless, and nothing out of its reach', () => {
    const p = slamPush(0, 0, 3, 0);
    expect(p).not.toBeNull();
    expect(p!.vx).toBeGreaterThan(0);
    expect(Math.hypot(p!.vx, p!.vy)).toBeLessThanOrEqual(KRAKEN.PUSH);
    expect(slamPush(0, 0, KRAKEN.REACH + 1, 0)).toBeNull();
  });

  it('the slammer whips down onto where it strikes', () => {
    const [ls, lu] = KRAKEN.LAIRS[0];
    const pts = tentaclePoints(0, SLAMMER, 1, 0, 24, { lift: 0, ts: ls + 5, tu: lu, down: 1 });
    const tip = pts[pts.length - 1];
    expect(Math.hypot(tip.s - (ls + 5), tip.u - lu)).toBeLessThan(1);
    expect(tip.z).toBeLessThan(1);
  });
});

/** A car on the track at (s, u) heading h (world), at speed. */
function carAt(s: number, u: number, h: number, speed: number): Vehicle {
  const p = pointAt(tr, s, u);
  const v = newVehicle('car', p.x, p.y, h, heightAt(tr, s, u));
  v.vx = Math.cos(h) * speed;
  v.vy = Math.sin(h) * speed;
  tr.hint = s;
  return v;
}

describe('the secret, driven', () => {
  it('turn round on the grid, down the slipway, through all seven portals: Water City', () => {
    const h0 = frameAt(tr, 0).h;
    const v = carAt(40, 0, h0 + Math.PI, 0);
    const dt = 1 / 60;
    let run = newLakeRun();
    let s = 40;
    let u = 0;
    let target = 0;
    let wasWet = false;
    let fell = 0;
    for (let i = 0; i < 60 * 150 && !run.found; i++) {
      // Steer for the next unlit portal (a little past it, so the line runs through it).
      while (target < PORTALS.length - 1 && run.lit[target]) target++;
      const [ps, pu] = PORTALS[target];
      const f = portalFacing(target);
      const aim = pointAt(tr, ps + Math.cos(f) * 15, pu + Math.sin(f) * 15);
      const err = wrapAngle(Math.atan2(aim.y - v.y, aim.x - v.x) - v.h);
      stepVehicle(
        v,
        { throttle: 0.75, steer: Math.max(-1, Math.min(1, err * 2.5)), boost: 0 },
        dt,
        world,
      );
      const q = project(tr, v.x, v.y, s);
      run = stepLakeRun(run, portalThrough(s, u, q.s, q.u, v.z - heightAt(tr, q.s, q.u) + 1));
      s = q.s;
      u = q.u;
      if (onLake(s, u)) wasWet = true;
      if (v.z < LAKE.LEVEL - 1) fell++;
    }
    expect(wasWet).toBe(true);
    expect(fell).toBe(0);
    expect(run.lit.every(Boolean)).toBe(true);
    expect(run.found).toBe(true);
  });

  it('skims the water looser than the street: the same turn slides further', () => {
    const slide = (s: number, u: number) => {
      const v = carAt(s, u, Math.PI, 50);
      const dt = 1 / 60;
      let worst = 0;
      for (let i = 0; i < 90; i++) {
        stepVehicle(v, { throttle: 1, steer: 1, boost: 0 }, dt, world);
        worst = Math.max(worst, Math.abs(v.slip));
      }
      return worst;
    };
    expect(slide(-1200, 0)).toBeGreaterThan(slide(-100, 0) * 1.2);
  });

  it('the lake holds you inside its shores, and back up the slipway is Chinatown again', () => {
    // Out to the far edge and back.
    const v = carAt(-1500, 0, Math.PI / 2, 60);
    for (let i = 0; i < 60 * 30; i++)
      stepVehicle(v, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, world);
    const q = project(tr, v.x, v.y, -1500);
    expect(Math.abs(q.u)).toBeLessThan(LAKE.HALF);
    // From the water, heading up the slipway the street's way: onto the street past the start.
    const w = carAt(-SLIP.LEN - 80, 0, frameAt(tr, 0).h, 30);
    let s = -SLIP.LEN - 80;
    for (let i = 0; i < 60 * 20 && s < 200; i++) {
      stepVehicle(w, { throttle: 1, steer: 0, boost: 0 }, 1 / 60, world);
      s = project(tr, w.x, w.y, s).s;
    }
    expect(s).toBeGreaterThan(200);
    expect(Math.abs(w.z - heightAt(tr, s, 0))).toBeLessThan(1.5);
  });
});
