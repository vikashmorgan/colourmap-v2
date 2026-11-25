import { describe, expect, it } from 'vitest';

import { autopilotControls } from './autopilot';
import { dressingFor } from './design-space';
import { WORLD_CFG } from './drive-worlds';
import {
  burnerAt,
  CABLE_LOW,
  cableHeight,
  catenaryA,
  eachSym,
  euclid,
  fib,
  GATE,
  GATE_CENTRE,
  GOLDEN_ANGLE,
  gateBoost,
  gateCrossed,
  gateOpen,
  gateSpread,
  hangers,
  lapOf,
  nearGate,
  PHI,
  phyllotaxis,
  pillarHeight,
  ringRadius,
  SYM,
  SYM_BRIDGES,
  SYM_FIRE_ROWS,
  SYM_GATES,
  SYM_HUBS,
  SYM_SECTIONS,
  symBridge,
  symCurv,
  symElev,
  symHeading,
  symSection,
  towerHeight,
  VIADUCT,
} from './symphony';
import { bankFor, frameAt, heightAt, makeTrackWorld, project, SYMPHONY } from './track';
import { trackInfo } from './track-registry';
import { G, newVehicle, stepVehicle, type Vehicle } from './vehicle';

const LAP = SYM.LAP;
const section = (p: number) => symSection(p).id;

describe('the Symphony: the lap as a piece of music', () => {
  it('is one lap in movements, each piece in its own', () => {
    expect(SYMPHONY.lap).toBe(LAP);
    expect(SYM_SECTIONS[0].from).toBe(0);
    expect(SYM_SECTIONS[SYM_SECTIONS.length - 1].to).toBe(LAP);
    for (let i = 1; i < SYM_SECTIONS.length; i++)
      expect(SYM_SECTIONS[i].from).toBe(SYM_SECTIONS[i - 1].to);
    for (const b of SYM_BRIDGES) {
      expect(section(b.at)).toBe('bridges');
      expect(section(b.at + b.span)).toBe('bridges');
      // On the viaduct's level top.
      expect(b.at).toBeGreaterThanOrEqual(VIADUCT.up);
      expect(b.at + b.span).toBeLessThanOrEqual(VIADUCT.down);
    }
    for (const g of SYM_GATES) expect(section(g)).toBe('gates');
    for (const r of SYM_FIRE_ROWS) {
      expect(section(r.at)).toBe('fire');
      expect(section(r.to)).toBe('fire');
    }
    expect(section(SYM_HUBS[0].at)).toBe('opening');
    expect(section(SYM_HUBS[SYM_HUBS.length - 1].at)).toBe('release');
  });

  it('places its pieces lap after lap', () => {
    const all = eachSym(SYM_GATES, 0, 3 * LAP);
    expect(all).toHaveLength(3 * SYM_GATES.length);
    expect(all[SYM_GATES.length].s).toBe(LAP + SYM_GATES[0]);
    expect(eachSym(SYM_GATES, 10, 5)).toHaveLength(0);
    expect(lapOf(-1)).toBe(LAP - 1);
  });
});

describe('the road that never repeats', () => {
  it('runs straight and level over the grid at every lap’s start', () => {
    for (const n of [0, 1, 2])
      for (const p of [0, 60, 140, LAP - 220, LAP - 100]) {
        const s = n * LAP + p;
        expect(Math.abs(symHeading(s))).toBeLessThan(1e-9);
        expect(Math.abs(symCurv(s))).toBeLessThan(1e-9);
        expect(Math.abs(symElev(s))).toBeLessThan(1e-9);
      }
  });

  it('never comes round to the same shape within a lap, nor from one lap to the next', () => {
    // The heading over a 1.5 km window from the build, against the same window shifted by every
    // distance from 200 m to a lap: never a close match.
    const win = (a: number) => {
      const out: number[] = [];
      for (let s = a; s < a + 1500; s += 10) out.push(symHeading(s));
      return out;
    };
    const rms = (x: number[], y: number[]) =>
      Math.sqrt(x.reduce((a, v, i) => a + (v - y[i]) ** 2, 0) / x.length);
    const base = win(8000);
    const scale = Math.sqrt(base.reduce((a, v) => a + v * v, 0) / base.length);
    let least = Number.POSITIVE_INFINITY;
    // Within the climax, where the shape is held steady, so any match would be the waves' own.
    for (let d = 200; d <= 3500; d += 10) least = Math.min(least, rms(base, win(8000 + d)));
    expect(least).toBeGreaterThan(0.1 * scale);
    // The same place a lap on is another road.
    expect(rms(base, win(8000 + LAP))).toBeGreaterThan(0.3 * scale);
    expect(rms(win(10000), win(10000 + 2 * LAP))).toBeGreaterThan(0.3 * scale);
  });

  it('keeps its bends driveable and banks each one to its curvature', () => {
    const tr = makeTrackWorld(SYMPHONY).track;
    let tight = 0;
    let clamped = 0;
    let n = 0;
    let prevBank = 0;
    let steepRoll = 0;
    for (let s = 0; s < 3 * LAP; s += 4) {
      const f = frameAt(tr, s);
      tight = Math.max(tight, Math.abs(f.k));
      expect(f.bank).toBeCloseTo(bankFor(f.k, SYM.BANK_SPEED, SYM.BANK_MAX), 12);
      // Leaning into the bend: the outside up.
      if (Math.abs(f.k) > 1e-4) expect(Math.sign(f.bank)).toBe(Math.sign(f.k));
      if (Math.abs(f.bank) >= SYM.BANK_MAX - 1e-9) clamped++;
      if (s > 0) steepRoll = Math.max(steepRoll, Math.abs(f.bank - prevBank) / 4);
      prevBank = f.bank;
      n++;
    }
    // Tighter than 180 m nowhere (the format refuses 110), and the bank matches the turn almost
    // everywhere: its limit bites on the sharpest few per cent only.
    expect(1 / tight).toBeGreaterThan(180);
    expect(clamped / n).toBeLessThan(0.08);
    // The roll comes on smoothly: flat out, under 0.5 rad/s.
    expect(steepRoll * 92).toBeLessThan(0.5);
  });

  it('rises and falls smoothly, never throwing the car off a crest', () => {
    let grade = 0;
    let lift = 0;
    let jerk = 0;
    const d2 = (s: number) => (symElev(s + 2) - 2 * symElev(s) + symElev(s - 2)) / 4;
    for (let s = 2; s < 3 * LAP; s += 2) {
      grade = Math.max(grade, Math.abs(symElev(s + 1) - symElev(s - 1)) / 2);
      lift = Math.max(lift, Math.abs(d2(s)));
      jerk = Math.max(jerk, Math.abs(d2(s + 2) - d2(s)) / 2);
    }
    // Under 9 % (the viaduct's ramps), and at top speed a crest asks under a quarter of gravity.
    expect(grade).toBeLessThan(0.09);
    expect(lift * 92 * 92).toBeLessThan(0.25 * G);
    // No sudden change in that pull either: the curve itself changes smoothly.
    expect(jerk).toBeLessThan(1e-5);
  });

  it('never comes back across itself', () => {
    // Its heading never strays past 60° off the lap's way, so it always moves on.
    let most = 0;
    for (let s = 0; s < 4 * LAP; s += 5) most = Math.max(most, Math.abs(symHeading(s)));
    expect(most).toBeLessThan((60 * Math.PI) / 180);
    const tr = makeTrackWorld(SYMPHONY).track;
    let x = Number.NEGATIVE_INFINITY;
    for (let s = 0; s < 3 * LAP; s += 20) {
      const f = frameAt(tr, s);
      expect(f.x).toBeGreaterThan(x);
      x = f.x;
    }
  });

  it('is a bridge over the plain along the viaduct, and only there', () => {
    expect(symBridge(VIADUCT.up + 10)).toBe(true);
    expect(symBridge(LAP + (VIADUCT.up + VIADUCT.down) / 2)).toBe(true);
    expect(symBridge(VIADUCT.from + 50)).toBe(false);
    expect(symBridge(VIADUCT.to + 50)).toBe(false);
    expect(symBridge(8000)).toBe(false);
    expect(SYMPHONY.bridge?.(3000)).toBe(true);
  });
});

describe('the bridges: catenaries, Fibonacci and the golden ratio', () => {
  it('spans consecutive Fibonacci numbers, each φ times the last, towers one φ³-th of the span', () => {
    const spans = SYM_BRIDGES.map((b) => b.span);
    expect(spans).toEqual([fib(13), fib(14), fib(15)]);
    for (let i = 1; i < spans.length; i++) expect(spans[i] / spans[i - 1]).toBeCloseTo(PHI, 2);
    for (const sp of spans) expect(sp / towerHeight(sp)).toBeCloseTo(PHI ** 3, 9);
    expect([1, 2, 3, 4, 5, 6, 7].map(fib)).toEqual([1, 1, 2, 3, 5, 8, 13]);
  });

  it('hangs each cable in a true catenary from tower top to tower top', () => {
    for (const { span } of SYM_BRIDGES) {
      const H = towerHeight(span);
      const a = catenaryA(span, H - CABLE_LOW);
      expect(cableHeight(span, 0, a)).toBeCloseTo(H, 6);
      expect(cableHeight(span, span, a)).toBeCloseTo(H, 6);
      expect(cableHeight(span, span / 2, a)).toBeCloseTo(CABLE_LOW, 9);
      // y'' = √(1 + y'²) / a everywhere: the shape a hanging cable takes.
      for (const x of [span * 0.1, span * 0.3, span * 0.5, span * 0.85]) {
        const h = 0.5;
        const y0 = cableHeight(span, x - h, a);
        const y1 = cableHeight(span, x, a);
        const y2 = cableHeight(span, x + h, a);
        const d1 = (y2 - y0) / (2 * h);
        const dd = (y2 - 2 * y1 + y0) / (h * h);
        expect(dd).toBeCloseTo(Math.sqrt(1 + d1 * d1) / a, 4);
      }
    }
  });

  it('hangs its hangers at Fibonacci intervals, quickening toward the towers', () => {
    for (const { span } of SYM_BRIDGES) {
      const hs = hangers(span);
      // Symmetric about the middle, one hanger at it.
      expect(hs.filter((x) => Math.abs(x - span / 2) < 1e-9)).toHaveLength(1);
      for (const x of hs) expect(hs.some((y) => Math.abs(x + y - span) < 1e-9)).toBe(true);
      // From the tower: gaps of 1, 1, 2, 3, 5 … units.
      const half = hs.filter((x) => x <= span / 2 + 1e-9);
      const gaps = half.map((x, i) => x - (i ? half[i - 1] : 0));
      const unit = gaps[0];
      expect(unit).toBeGreaterThan(2);
      gaps.forEach((g, i) => expect(g / unit).toBeCloseTo(fib(i + 1), 9));
    }
  });
});

describe('the golden angle', () => {
  it('turns each seed 137.5° from the last, spreading them evenly with no gaps', () => {
    expect((GOLDEN_ANGLE * 180) / Math.PI).toBeCloseTo(137.508, 3);
    const c = 7;
    const pts = Array.from({ length: 233 }, (_, i) => phyllotaxis(i + 1, c));
    for (let i = 1; i < pts.length; i++) {
      const d = (((pts[i].a - pts[i - 1].a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      expect(d).toBeCloseTo(GOLDEN_ANGLE, 9);
      expect(pts[i].r).toBeCloseTo(c * Math.sqrt(i + 1), 9);
    }
    // Every seed's nearest neighbour is about as near as any other's: no clumps, no holes.
    const nearest = pts
      .slice(10)
      .map((p) =>
        Math.min(...pts.filter((q) => q !== p).map((q) => Math.hypot(p.x - q.x, p.y - q.y))),
      );
    expect(Math.min(...nearest)).toBeGreaterThan(0.75 * c);
    expect(Math.max(...nearest)).toBeLessThan(2.2 * c);
  });

  it('stands its pillars tallest at the hub, every hub clear of the road', () => {
    for (const hub of SYM_HUBS) {
      expect(pillarHeight(hub, 1)).toBeGreaterThan(pillarHeight(hub, hub.n));
      expect(Math.abs(hub.out)).toBeGreaterThan(SYM.HALF + 100);
    }
  });
});

describe('Euclidean fire', () => {
  it('spreads k onsets over n steps as evenly as they go', () => {
    const str = (k: number, n: number) =>
      euclid(k, n)
        .map((b) => (b ? 'x' : '.'))
        .join('');
    expect(str(3, 8)).toBe('x..x..x.');
    expect(str(5, 8)).toBe('x.x.xx.x');
    expect(str(0, 4)).toBe('....');
    expect(euclid(3, 0)).toEqual([]);
    for (const [k, n] of [
      [5, 8],
      [7, 12],
      [5, 13],
      [8, 13],
      [3, 8],
      [5, 12],
    ]) {
      const e = euclid(k, n);
      expect(e.filter(Boolean)).toHaveLength(k);
      expect(e[0]).toBe(true);
      const on = e.flatMap((b, i) => (b ? [i] : []));
      const gaps = on.map((x, i) => (i + 1 < on.length ? on[i + 1] : on[0] + n) - x);
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    }
  });

  it('fires each row’s burners in its rhythm, a different one each side', () => {
    for (const r of SYM_FIRE_ROWS) {
      expect(r.left).not.toEqual(r.right);
      const left = [];
      for (let i = 0; i < r.left[1]; i++) left.push(burnerAt(LAP + r.at + i * r.step, 1));
      expect(left).toEqual(euclid(r.left[0], r.left[1]));
      expect(burnerAt(r.at + r.step / 2, 1)).toBeNull();
    }
    expect(burnerAt(100, 1)).toBeNull();
  });
});

describe('ring gates: circles in circles', () => {
  it('nests its rings by the golden ratio round one middle, the inner one’s foot on the road', () => {
    for (let k = 1; k < GATE.RINGS; k++)
      expect(ringRadius(k - 1) / ringRadius(k)).toBeCloseTo(PHI, 9);
    expect(GATE_CENTRE).toBeCloseTo(ringRadius(GATE.RINGS - 1), 9);
    expect(ringRadius(GATE.RINGS - 1)).toBeGreaterThan(SYM.HALF / 2);
  });

  it('lines its gaps up only for a moment, but often enough to time a pass', () => {
    for (let i = 0; i < SYM_GATES.length; i++) {
      let open = 0;
      let wins = 0;
      let wait = 0;
      let lastClose = 0;
      let start = 0;
      let prev = gateOpen(i, 0);
      const lengths: number[] = [];
      const dt = 0.01;
      const T = 600;
      for (let t = dt; t < T; t += dt) {
        const o = gateOpen(i, t);
        if (o) open++;
        if (o && !prev) {
          wins++;
          wait = Math.max(wait, t - lastClose);
          start = t;
        }
        if (!o && prev) {
          lastClose = t;
          lengths.push(t - start);
        }
        prev = o;
      }
      lengths.sort((a, b) => a - b);
      // Open about an eighth of the time, about every five seconds, never more than 7 s apart.
      expect(open / (T / dt)).toBeGreaterThan(0.08);
      expect(open / (T / dt)).toBeLessThan(0.18);
      expect(wins / (T / 60)).toBeGreaterThan(8);
      expect(wait).toBeLessThan(7);
      // A moment: most windows last half a second to a second.
      expect(lengths[Math.floor(lengths.length / 2)]).toBeGreaterThan(0.5);
      expect(lengths[Math.floor(lengths.length / 2)]).toBeLessThan(1.2);
    }
    // The rings turn at golden-ratio speeds, the middle one the other way.
    const a0 = [0, 1, 2].map((k) => gateSpread(0, k));
    expect(new Set(a0).size).toBeGreaterThan(1);
  });

  it('boosts a pass through the rings while they line up, and only then', () => {
    let tOpen = 0;
    while (!gateOpen(0, tOpen)) tOpen += 0.01;
    let tShut = 0;
    while (gateOpen(0, tShut)) tShut += 0.01;
    expect(gateBoost(0, tOpen, 0)).toBe(true);
    expect(gateBoost(0, tShut, 0)).toBe(false);
    expect(gateBoost(0, tOpen, 40)).toBe(false);
    expect(gateCrossed(SYM_GATES[2] - 3, SYM_GATES[2] + 2)).toEqual({ i: 2, s: SYM_GATES[2] });
    expect(gateCrossed(LAP + SYM_GATES[1] - 3, LAP + SYM_GATES[1] + 2)?.i).toBe(1);
    expect(gateCrossed(100, 200)).toBeNull();
    expect(gateCrossed(SYM_GATES[0] - 100, SYM_GATES[0] + 100)).toBeNull();
    expect(nearGate(SYM_GATES[3] + 10)).toBe(true);
    expect(nearGate(SYM_GATES[3] + 100)).toBe(false);
  });
});

function carAt(
  w: ReturnType<typeof makeTrackWorld>,
  s: number,
  speed: number,
  kind: 'car' | 'ship' = 'car',
): Vehicle {
  const f = frameAt(w.track, s);
  const v = newVehicle(kind, f.x, f.y, f.h, heightAt(w.track, s, 0));
  v.vx = Math.cos(f.h) * speed;
  v.vy = Math.sin(f.h) * speed;
  w.track.hint = s;
  return v;
}

describe('a lap on the autopilot', () => {
  it.each([
    'car',
    'ship',
  ] as const)('drives the whole lap flat out in the %s and stays on the road', (kind) => {
    const w = makeTrackWorld(SYMPHONY);
    const v = carAt(w, 40, 30, kind);
    const dt = 1 / 60;
    let wide = 0;
    let top = 0;
    let s = 40;
    for (let i = 0; i < 60 * 400 && s < LAP + 40; i++) {
      const t = i * dt;
      s = project(w.track, v.x, v.y).s;
      w.track.hint = s;
      const c = autopilotControls(v, w.track, s, t, false, 0, {
        bypass: false,
        balcony: false,
        side: false,
      });
      stepVehicle(v, { ...c, throttle: 1 }, dt, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      s = q.s;
      wide = Math.max(wide, Math.abs(q.u));
      top = Math.max(top, Math.hypot(v.vx, v.vy));
      // Never fallen off the bridges: always near the road's surface.
      expect(v.z).toBeGreaterThan(heightAt(w.track, q.s, q.u) - 3);
    }
    expect(s).toBeGreaterThan(LAP + 40);
    expect(wide).toBeLessThan(SYM.HALF);
    expect(top).toBeGreaterThan(60);
  });
});

describe('in the game', () => {
  it('is a world in the ring with its own colour, dressed in its maths', () => {
    expect(WORLD_CFG.symphony.track).toBe(SYMPHONY);
    expect(WORLD_CFG.symphony.theme).toBe('symphony');
    const info = trackInfo('symphony');
    expect(info.name).toBe('The Symphony');
    expect(info.rivals).toBe(true);
    expect(dressingFor('symphony')).toHaveLength(6);
  });
});
