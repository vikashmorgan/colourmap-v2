import { describe, expect, it } from 'vitest';

import { autopilotControls } from './autopilot';
import {
  CHINA_BENDS,
  CHINA_LAP,
  CHINA_SECTIONS,
  CHINA_TILT,
  chinaCurv,
  chinaElev,
  eachIn,
  FIRE_RING,
  fireRingThrough,
  KICK_CREST,
  LAP_BALCONY,
  LAP_BLASTS,
  LAP_FIRE_ROWS,
  LAP_OVERLOOK,
  LAP_RINGS,
  LAP_UNDER,
  lastOf,
  nearSpectacle,
  nthOf,
  OVERLOOK,
  TILT,
} from './chinatown-lap';
import { BALCONY_LENGTH, LOWER_FROM, LOWER_TO } from './chinatown-paths';
import { VISTA, vistaAt, vistasBetween } from './chinatown-vista';
import { LAKE_CITY } from './lake-city';
import { piecesBetween } from './night-course';
import {
  CHINA_BANK,
  CHINATOWN,
  chinatownHalf,
  frameAt,
  heightAt,
  makeTrackWorld,
  project,
} from './track';
import { UNDER_LENGTH } from './undertown';
import { G, newVehicle, stepVehicle, type Vehicle } from './vehicle';

const within = (x: number, [a, b]: readonly [number, number]) => x >= a && x <= b;
const section = (x: number) => CHINA_SECTIONS.find((c) => x >= c.from && x < c.to)?.name ?? '';
/** Near a balcony road's kicker crest (the street's only sharp crests, made to launch you). */
const nearKick = (x: number) => LAP_BALCONY.some((c) => Math.abs(x - c) < KICK_CREST.W + 2);

function carAt(w: ReturnType<typeof makeTrackWorld>, s: number, u: number, speed: number): Vehicle {
  const f = frameAt(w.track, s);
  const v = newVehicle(
    'car',
    f.x - Math.sin(f.h) * u,
    f.y + Math.cos(f.h) * u,
    f.h,
    heightAt(w.track, s, u),
  );
  v.vx = Math.cos(f.h) * speed;
  v.vy = Math.sin(f.h) * speed;
  w.track.hint = s;
  return v;
}

/** Drives a car on the autopilot from s0 to s1 (flat out, `boost` as given), calling `each`. */
function drive(
  s0: number,
  s1: number,
  speed: number,
  boost: 0 | 1,
  each: (v: Vehicle, s: number, u: number, dt: number) => void,
): Vehicle {
  const w = makeTrackWorld(CHINATOWN);
  const v = carAt(w, s0, 0, speed);
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 120; i++) {
    const t = i * dt;
    const { s } = project(w.track, v.x, v.y);
    w.track.hint = s;
    const c = autopilotControls(v, w.track, s, t, false, 0, { bypass: false, balcony: false });
    stepVehicle(v, { ...c, throttle: 1, boost }, dt, w, t);
    const q = project(w.track, v.x, v.y);
    w.track.hint = q.s;
    each(v, q.s, q.u, dt);
    if (q.s > s1) break;
  }
  return v;
}

describe('the lap (2026-11-24: "make whole chinatown run much longer")', () => {
  it('is one long lap in sections, calm, building, two climaxes and a release', () => {
    // Twice and more what came round before (an Undertown every 3.6 km).
    expect(CHINA_LAP).toBeGreaterThanOrEqual(2 * 3600 * 2);
    expect(CHINATOWN.lap).toBe(CHINA_LAP);
    expect(CHINA_SECTIONS[0].from).toBe(0);
    expect(CHINA_SECTIONS[CHINA_SECTIONS.length - 1].to).toBe(CHINA_LAP);
    for (let i = 1; i < CHINA_SECTIONS.length; i++)
      expect(CHINA_SECTIONS[i].from).toBe(CHINA_SECTIONS[i - 1].to);
    // A calm opening: no spectacle, no Undertown, nothing tilted in the first 1.6 km.
    for (let x = 0; x < 1600; x += 10) {
      expect(nearSpectacle(x, 0)).toBe(false);
      expect(CHINATOWN.under?.(x)).toBe(false);
      expect(CHINATOWN.level?.(x)).toBeLessThanOrEqual(1);
    }
    // Each feature in its own section.
    for (const u of LAP_UNDER) expect(section(u)).toMatch(/Undertown/);
    for (const c of LAP_BALCONY) expect(section(c)).toMatch(/Balcony/);
    for (const [r] of LAP_RINGS) expect(section(r)).toMatch(/rings|furnace/);
    for (const [a] of LAP_OVERLOOK) expect(section(a + OVERLOOK / 2)).toMatch(/overlook|view/);
    for (const [a, b] of CHINA_TILT) expect(section((a + b) / 2)).toMatch(/tilt/);
    // Not the same stretch twice: the two halves differ.
    expect(chinaElev(2000)).not.toBe(chinaElev(2000 + CHINA_LAP / 2));
  });

  it('comes round the same every lap, its places counted lap by lap', () => {
    for (const s of [500, 6600, 11200, 17000])
      for (const f of [chinaCurv, chinaElev]) expect(f(s + 3 * CHINA_LAP)).toBeCloseTo(f(s), 12);
    expect(nthOf(LAP_UNDER, 0)).toBe(LAP_UNDER[0]);
    expect(nthOf(LAP_UNDER, 3)).toBe(CHINA_LAP + LAP_UNDER[1]);
    expect(lastOf(LAP_UNDER, LAP_UNDER[0] - 1)).toBe(-1);
    expect(lastOf(LAP_UNDER, CHINA_LAP + LAP_UNDER[0])).toBe(2);
    expect(lastOf(LAP_UNDER, Number.NaN)).toBe(-1);
    expect(eachIn(LAP_RINGS, 0, 2 * CHINA_LAP).length).toBe(2 * LAP_RINGS.length);
    expect(eachIn(LAP_RINGS, 5, 5)).toEqual([]);
  });

  it('never turns back on itself: net heading nil, never swinging past 70° off its way', () => {
    let h = 0;
    let x = 0;
    let y = 0;
    const hs: number[] = [];
    for (let s = 0; s < CHINA_LAP; s += 1) {
      h += chinaCurv(s + 0.5);
      x += Math.cos(h);
      y += Math.sin(h);
      hs.push(h);
    }
    expect(Math.abs(h)).toBeLessThan(0.002);
    const way = Math.atan2(y, x);
    for (const q of hs) expect(Math.abs(q - way)).toBeLessThan((70 * Math.PI) / 180);
    // Long sweeping bends: the tightest about 300 m round, every bend easing in and out.
    let tight = 0;
    let jump = 0;
    for (let s = 1; s < CHINA_LAP; s += 1) {
      tight = Math.max(tight, Math.abs(chinaCurv(s)));
      jump = Math.max(jump, Math.abs(chinaCurv(s) - chinaCurv(s - 1)));
    }
    expect(1 / tight).toBeGreaterThan(290);
    expect(jump).toBeLessThan(3e-5);
    for (const [, , r] of CHINA_BENDS) expect(Math.abs(r)).toBeGreaterThanOrEqual(300);
  });

  it('rises and dips in long smooth swells, never a bump that throws you at speed', () => {
    const fast = 100;
    let most = 0;
    let swell = 0;
    for (let s = 1; s < CHINA_LAP; s += 1) {
      swell = Math.max(swell, chinaElev(s));
      if (nearKick(s)) continue;
      const bend = chinaElev(s + 1) - 2 * chinaElev(s) + chinaElev(s - 1);
      most = Math.max(most, Math.abs(bend) * fast * fast);
    }
    // At 360 km/h a crest asks at most a quarter of gravity: you stay on the road.
    expect(most).toBeLessThan(0.25 * G);
    // And they are real hills: the summit 10 m up.
    expect(swell).toBeGreaterThanOrEqual(10);
    // The street is at its datum wherever another level is laid against it.
    for (const u of LAP_UNDER)
      for (let x = u + LOWER_FROM - 100; x < u + LOWER_TO + 100; x += 10)
        expect(chinaElev(x)).toBe(0);
    for (const c of LAP_BALCONY)
      for (let x = c + KICK_CREST.W; x < c + BALCONY_LENGTH + 20; x += 10)
        expect(chinaElev(x)).toBe(0);
  });

  it('banks steeper on the tilt stretches, up to 0.51 rad, following the bends smoothly', () => {
    const tr = makeTrackWorld(CHINATOWN).track;
    let tilted = 0;
    let roll = 0;
    let prev = frameAt(tr, 400).bank;
    for (let s = 401; s < CHINA_LAP; s += 1) {
      const b = frameAt(tr, s).bank;
      roll = Math.max(roll, Math.abs(b - prev));
      prev = b;
      const on = CHINA_TILT.some((t) => within(s, t));
      if (on) tilted = Math.max(tilted, Math.abs(b));
      else expect(Math.abs(b)).toBeLessThanOrEqual(CHINA_BANK + 1e-9);
      // The bank always leans into the bend.
      if (Math.abs(b) > 0.01) expect(Math.sign(b)).toBe(Math.sign(frameAt(tr, s).k));
    }
    expect(tilted).toBeGreaterThan(CHINA_BANK * TILT.MORE - 0.01);
    expect(tilted).toBeLessThanOrEqual(CHINA_BANK * TILT.MORE + 1e-9);
    // Rolling in and out gently: under 0.015 rad a metre.
    expect(roll).toBeLessThan(0.015);
  });

  it('carries a car flat out over the rollers to the summit, never thrown off a crest', () => {
    let flew = 0;
    let most = 0;
    let vz: number | null = null;
    let top = 0;
    const v = drive(10000, 12700, 85, 1, (car, s, u, dt) => {
      if (car.air) flew++;
      if (vz !== null && !car.air) most = Math.max(most, Math.abs(car.vz - vz) / dt);
      vz = car.air ? null : car.vz;
      top = Math.max(top, Math.hypot(car.vx, car.vy));
      expect(Math.abs(u)).toBeLessThan(chinatownHalf(s) + 2.5);
    });
    expect(top).toBeGreaterThan(90);
    expect(flew).toBe(0);
    // The ground's push up and down stays well under gravity's.
    expect(most).toBeLessThan(0.4 * G);
    expect(project(makeTrackWorld(CHINATOWN).track, v.x, v.y, 12700).s).toBeGreaterThan(12650);
  });

  it('carries a car through the sweepers on the tilt, held on the banked road', () => {
    const tr = makeTrackWorld(CHINATOWN).track;
    for (const [a, b] of CHINA_TILT) {
      let flew = 0;
      let leaned = 0;
      drive(a - 150, b + 100, 70, 0, (car, s, u) => {
        if (car.air) flew++;
        leaned = Math.max(leaned, Math.abs(frameAt(tr, s).bank));
        expect(Math.abs(u)).toBeLessThan(chinatownHalf(s) + 2.5);
      });
      expect(flew).toBeLessThan(6);
      expect(leaned).toBeGreaterThan(0.45);
    }
  });
});

describe('the spectacle (2026-11-24: "rows of fires shooting up as u pass … circle of fire")', () => {
  it('stands its fire rows, blasts and rings on plain road, out of Undertown and the paths', () => {
    const plain = (x: number) =>
      !CHINATOWN.under?.(x) &&
      CHINATOWN.bypass?.(x) === null &&
      CHINATOWN.balcony?.(x) === null &&
      !((CHINATOWN.kick?.(x, CHINATOWN.half(x)) ?? 0) > 0);
    for (const [a, b] of LAP_FIRE_ROWS) for (let x = a; x <= b; x += 5) expect(plain(x)).toBe(true);
    for (const [x] of LAP_BLASTS) expect(plain(x)).toBe(true);
    for (const [x] of LAP_RINGS) expect(plain(x)).toBe(true);
    // The furnace burns its whole length; the rings stand over the road, their foot clear of it.
    expect(Math.max(...LAP_FIRE_ROWS.map(([a, b]) => b - a))).toBeGreaterThan(1500);
    expect(FIRE_RING.LIFT - FIRE_RING.R).toBeGreaterThan(0.3);
    for (const [x, u] of LAP_RINGS)
      expect(Math.abs(u) + FIRE_RING.R).toBeLessThan(chinatownHalf(x) + 2);
  });

  it('gives a surge through a ring of fire, none beside it nor jumping past it', () => {
    const [x, u] = LAP_RINGS[1];
    expect(fireRingThrough(x - 1, x + 1, u, 1)).toEqual({ s: x, u });
    expect(fireRingThrough(x + CHINA_LAP - 1, x + CHINA_LAP + 1, u + 1.5, 1)).not.toBeNull();
    expect(fireRingThrough(x - 1, x + 1, u + 6, 1)).toBeNull();
    expect(fireRingThrough(x - 1, x + 1, u, 16)).toBeNull();
    expect(fireRingThrough(x + 1, x + 3, u, 1)).toBeNull();
    expect(fireRingThrough(x - 1, x - 1, u, 1)).toBeNull();
    expect(fireRingThrough(x - 60, x + 1, u, 1)).toBeNull();
  });

  it('a car aiming through the rings of fire goes through them', () => {
    const w = makeTrackWorld(CHINATOWN);
    const rings = LAP_RINGS.filter(([x]) => x < LAP_UNDER[1]);
    const v = carAt(w, rings[0][0] - 300, 0, 50);
    let through = 0;
    let prev = rings[0][0] - 300;
    for (let i = 0; i < 60 * 40; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      const next = rings.find(([x]) => x > s - 5) ?? rings[rings.length - 1];
      const c = autopilotControls(v, w.track, s, t, false, next[1], {
        bypass: false,
        balcony: false,
      });
      stepVehicle(v, { ...c, throttle: 0.7, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      const over = v.z - heightAt(w.track, q.s, q.u) + 1;
      if (fireRingThrough(prev, q.s, q.u, over)) through++;
      prev = q.s;
      if (q.s > rings[rings.length - 1][0] + 20) break;
    }
    expect(through).toBe(rings.length);
  });

  it('keeps gates and strings of light out of the rings of fire', () => {
    for (const { s } of eachIn(LAP_RINGS, 0, CHINA_LAP)) {
      const ps = piecesBetween('chinatown', CHINATOWN, s - 40, s + 40);
      for (const p of ps)
        if (Math.abs(p.s - s) < 25)
          expect(['gate', 'temple', 'lanterns', 'lights']).not.toContain(p.kind);
    }
  });
});

describe('the views (2026-11-24: "a view over a beautiful city in the distance")', () => {
  it('parts the canyon at the summits: no towers on that side, the balustrade lit', () => {
    const looks = vistasBetween(0, CHINA_LAP).filter((v) => v.kind === 'overlook');
    expect(looks.length).toBe(LAP_OVERLOOK.length);
    for (const o of looks) {
      // At the top of a long climb.
      const mid = o.start + o.length / 2;
      expect(chinaElev(mid)).toBeGreaterThan(4);
      expect(vistaAt(mid)?.v.kind).toBe('overlook');
      const ps = piecesBetween('chinatown', CHINATOWN, o.start - 50, o.start + o.length + 50);
      let rail = 0;
      for (const p of ps) {
        const inside = p.s > o.start && p.s < o.start + o.length;
        if (!inside || Math.sign(p.u) !== o.side) continue;
        expect(['shophouse', 'blade', 'billboard', 'gate', 'temple']).not.toContain(p.kind);
        if (p.kind === 'beacon' && Math.abs(p.u) > chinatownHalf(p.s) + VISTA.RAIL - 1) rail++;
      }
      expect(rail).toBeGreaterThan(30);
    }
  });

  it('keeps every lake city clear of the road round it, so the road never runs into it', () => {
    const tr = makeTrackWorld(CHINATOWN).track;
    const cities = [
      ...LAP_UNDER.map((u) => ({ at: u + LAKE_CITY.AT, side: -1 })),
      ...vistasBetween(0, CHINA_LAP).map((v) => ({ at: v.start + v.length / 2, side: v.side })),
    ];
    for (const c of cities) {
      const f = frameAt(tr, c.at);
      for (let s = c.at - 3000; s < c.at + 3000; s += 20) {
        const p = frameAt(tr, Math.max(0, s));
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const a = dx * Math.cos(f.h) + dy * Math.sin(f.h);
        // Out to the city's side (u: positive left).
        const b = (-dx * Math.sin(f.h) + dy * Math.cos(f.h)) * c.side;
        const inA = Math.abs(a) < LAKE_CITY.LENGTH * 0.45;
        if (inA) expect(b).toBeLessThan(LAKE_CITY.FAR - 100);
      }
    }
  });

  it('the overlooks stand clear of Undertown, its underpass and the arcades', () => {
    for (const [a] of LAP_OVERLOOK)
      for (const u of LAP_UNDER) {
        expect(a + OVERLOOK < u + LOWER_FROM || a > u + Math.max(UNDER_LENGTH, LOWER_TO)).toBe(
          true,
        );
        expect(Math.abs(a - (u + VISTA.FROM))).toBeGreaterThan(VISTA.LENGTH + 200);
      }
  });
});
