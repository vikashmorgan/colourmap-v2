import { describe, expect, it } from 'vitest';

import { flow } from './bigbang';
import {
  AVENUE,
  avenueSigns,
  BLOCK_X,
  BLOCK_Z,
  BOOST_PACE,
  BRIDGES,
  blocked,
  blockTower,
  boostLeft,
  builtTop,
  CANYON_SLOTS,
  CANYON_W,
  CITY,
  CT_SIGNS,
  CT_TOWERS,
  camera,
  canyonShip,
  canyonSlot,
  chinatownness,
  colour,
  dockShip,
  EYE_Y,
  FLY_SPEED,
  flier,
  GATE_SIGN,
  GLYPH_PX,
  GROUND,
  gauges,
  glyph,
  LANES,
  LANTERNS,
  laneShip,
  lanternAt,
  makeParticles,
  neonAt,
  PADS,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  route,
  SHIPS,
  SIGN_TEXTS,
  type Sign,
  SKY,
  STEP_COLOURS,
  STREET,
  setFly,
  signFlicker,
  signPoint,
  signSize,
  starBall,
  TOTAL,
  target,
  VIEW,
} from './city';

const particles = makeParticles(1500);
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const at = (k: number, u: number) =>
  (PHASE_START[k] as number) + u * (PHASES[k]?.duration as number);
const piece = (id: string) => PHASES.findIndex((p) => p.id === id);
const inside = (q: number[], tw: (typeof CITY)[number]) =>
  (q[1] as number) < GROUND + tw.h &&
  Math.abs((q[0] as number) - tw.x) < tw.hx &&
  Math.abs((q[2] as number) - tw.z) < tw.hz;

describe('the city chapter', () => {
  it('has seven pieces, from the towers to the ship, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'towers',
      'lanes',
      'neon',
      'chinatown',
      'docks',
      'canyon',
      'ship',
    ]);
    expect(PHASES.map((p) => p.name)).toEqual([
      'Towers',
      'Sky lanes',
      'Neon',
      'Chinatown',
      'Bridges and docks',
      'Canyon',
      'Ship',
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

  it('keeps every grain somewhere real and in view, in every piece and between them', () => {
    for (let k = 0; k < PHASES.length; k++) {
      for (const u of [0, 0.3, 0.6, 0.85, 0.99]) {
        const t = at(k, u);
        const { eye } = camera(t);
        for (const p of particles.slice(0, 300)) {
          const { pos, rgb } = particleAt(p, t);
          for (const v of [...pos, ...rgb]) expect(Number.isFinite(v)).toBe(true);
          // Within the trip player's far plane, and never brighter than a grain should be.
          expect(dist(pos, eye)).toBeLessThan(900);
          expect(Math.max(...rgb)).toBeLessThanOrEqual(1);
          expect(Math.min(...rgb)).toBeGreaterThanOrEqual(0);
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

  it('is the same picture every time for the same moment', () => {
    const again = makeParticles(1500);
    for (let k = 0; k < PHASES.length - 1; k++) {
      for (const s of [0, 7.3, 21]) {
        for (let i = 0; i < 300; i += 7) {
          expect(pieceAt(again[i] as never, k, s)).toEqual(pieceAt(particles[i] as never, k, s));
        }
      }
    }
  });

  it('grows the towers up from the ground, the middle first, and none below it', () => {
    const mid = 12;
    const edge = 0;
    expect(builtTop(mid, 0)).toBe(0);
    expect(builtTop(mid, 0.4)).toBeGreaterThan(builtTop(edge, 0.4));
    for (let j = 0; j < CITY.length; j++)
      expect(builtTop(j, 1)).toBeCloseTo(CITY[j]?.h as number, 6);
    const k = piece('towers');
    const height = (u: number) =>
      Math.max(...particles.map((p) => pieceAt(p, k, u * (PHASES[k]?.duration as number)).pos[1]));
    for (const p of particles) {
      expect(pieceAt(p, k, 0.5 * (PHASES[k]?.duration as number)).pos[1]).toBeGreaterThan(
        GROUND - 1e-6,
      );
    }
    // Taller by the middle of the piece than at its start (the sky's stars apart).
    const roofs = (u: number) =>
      Math.max(
        ...particles
          .filter((p) => p.c >= 0.12)
          .map((p) => pieceAt(p, k, u * (PHASES[k]?.duration as number)).pos[1]),
      );
    expect(roofs(0.02)).toBeLessThan(GROUND + 1);
    expect(roofs(0.7)).toBeGreaterThan(GROUND + 30);
    expect(height(0.7)).toBeGreaterThan(roofs(0.7));
  });

  it('sends ships along the lanes between the towers, both ways, at four heights', () => {
    expect(new Set(LANES.map((l) => Math.round(l.y - GROUND))).size).toBeGreaterThanOrEqual(4);
    expect(LANES.some((l) => l.dir > 0) && LANES.some((l) => l.dir < 0)).toBe(true);
    expect(LANES.some((l) => l.axis === 0) && LANES.some((l) => l.axis === 2)).toBe(true);
    for (const t of [0, 3.3, 17]) {
      for (let j = 0; j < SHIPS; j++) {
        const { c, f } = laneShip(j, t);
        for (const tw of CITY) expect(inside(c, tw)).toBe(false);
        // Moving: a moment later it is further along its heading.
        const n = laneShip(j, t + 0.1).c;
        const moved = (n[0] - c[0]) * f[0] + (n[2] - c[2]) * f[2];
        expect(moved > 0 || Math.hypot(n[0] - c[0], n[2] - c[2]) > 10).toBe(true);
      }
    }
  });

  it('drifts the neon slowly, never jumping from one colour to another', () => {
    for (let t = 0; t < 300; t += 0.5) {
      const a = neonAt(3, t);
      const b = neonAt(3, t + 1 / 60);
      expect(dist(a, b)).toBeLessThan(0.01);
    }
  });

  it('lands sky bridges on tower walls, and ships rest on the docks a while', () => {
    expect(BRIDGES.length).toBeGreaterThan(3);
    expect(PADS.length).toBeGreaterThan(3);
    for (let j = 0; j < PADS.length; j++) {
      const pad = PADS[j] as (typeof PADS)[number];
      const rests = Array.from({ length: 180 }, (_, i) => dockShip(j, 0, i * 0.1)).filter(
        (s) => s.pace === 0,
      );
      expect(rests.length).toBeGreaterThan(30);
      for (const s of rests) expect(dist(s.c, pad.at)).toBeLessThan(0.5);
    }
  });

  it('flies the eye down an endless canyon, towers recycled to the far end, the count kept', () => {
    const k = piece('canyon');
    const len = pieceLength(k);
    const xs = Array.from({ length: CANYON_SLOTS }, (_, j) => canyonSlot(j));
    for (const tw of xs) expect(Math.abs(tw.x) - tw.hx).toBeGreaterThanOrEqual(CANYON_W);
    expect(xs.some((tw) => tw.x < 0) && xs.some((tw) => tw.x > 0)).toBe(true);
    // Towers reach above the eye and their feet are below it: traffic above and below.
    expect(xs.some((tw) => GROUND + tw.h > EYE_Y + 10)).toBe(true);
    const a = pieceCamera(k, 0.1 * len);
    const b = pieceCamera(k, 0.6 * len);
    expect(b.eye[2]).toBeLessThan(a.eye[2] - 50);
    // Every tower grain stays within the stretch of street round the eye, however far it has flown.
    const towerGrains = particles.filter((p) => p.c >= 0.08 && p.c < 0.66);
    for (const s of [0, 0.37 * len, 0.99 * len, 3.2 * len]) {
      const eye = pieceCamera(k, s).eye;
      for (const p of towerGrains) {
        const dz = pieceAt(p, k, s).pos[2] - eye[2];
        expect(dz).toBeLessThan(14 + 8);
        expect(dz).toBeGreaterThan(-140);
      }
    }
    // Ships both ways, above and below the eye.
    const ships = Array.from({ length: 160 }, (_, j) => canyonShip(j, 0, 5));
    expect(ships.some((s) => s.c[1] > EYE_Y) && ships.some((s) => s.c[1] < EYE_Y)).toBe(true);
    expect(ships.some((s) => s.dir > 0) && ships.some((s) => s.dir < 0)).toBe(true);
  });

  it('plays each piece on its own: no ball of stars at the start, looping with no seam', () => {
    setFly(false, [], 0, 0);
    for (let k = 0; k < PHASES.length; k++) {
      const len = pieceLength(k);
      for (const p of particles.slice(0, 100)) {
        expect(dist(pieceAt(p, k, 0).pos, starBall(k, p, 0))).toBeGreaterThan(1e-3);
      }
      const before = len * 3 - 1e-4;
      const after = len * 3 + 1e-4;
      const e0 = pieceCamera(k, before).eye;
      const e1 = pieceCamera(k, after).eye;
      const kept = particles.slice(0, 400).filter((p) => {
        const ra = pieceAt(p, k, before).pos.map((v, i) => v - (e0[i] as number));
        const rb = pieceAt(p, k, after).pos.map((v, i) => v - (e1[i] as number));
        return dist(ra, rb) < 0.05;
      });
      expect(kept.length).toBeGreaterThanOrEqual(PHASES[k]?.id === 'canyon' ? 370 : 400);
    }
  });
});

describe('Chinatown', () => {
  const insideSign = (s: Sign, q: number[]) => {
    const { w, h } = signSize(s);
    const m = 2.5 * s.px;
    return (
      (q[0] as number) >= s.at[0] - m &&
      (q[0] as number) <= s.at[0] + w + m &&
      (q[1] as number) <= s.at[1] + m &&
      (q[1] as number) >= s.at[1] - h - m &&
      Math.abs((q[2] as number) - s.at[2]) < 1e-9
    );
  };

  it('has every character of every sign, each a real glyph', () => {
    for (const text of [...SIGN_TEXTS, '夜市', '中華街']) {
      for (const ch of text) {
        const px = glyph(ch);
        expect(px.length).toBeGreaterThan(8);
        for (const [c, r] of px) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(GLYPH_PX);
          expect(r).toBeLessThan(GLYPH_PX);
        }
      }
    }
    // 中: a box with a stroke straight down its middle, all the way.
    const zhong = new Set(glyph('中').map(([c, r]) => `${c},${r}`));
    for (let r = 0; r < 14; r++) expect(zhong.has(`7,${r}`)).toBe(true);
    // In a vertical sign the long vowel mark stands upright.
    const flat = glyph('ー');
    const upright = glyph('ー', true);
    const span = (px: [number, number][], i: 0 | 1) =>
      Math.max(...px.map((q) => q[i])) - Math.min(...px.map((q) => q[i]));
    expect(span(flat, 0)).toBeGreaterThan(span(flat, 1));
    expect(span(upright, 1)).toBeGreaterThan(span(upright, 0));
  });

  it('puts every grain of a sign on a lit pixel of its characters, or on its frame', () => {
    for (const s of [...CT_SIGNS, GATE_SIGN]) {
      const lit = new Set<string>();
      [...s.text].forEach((ch, n) => {
        for (const [c, r] of glyph(ch, s.vertical)) {
          const step = n * (GLYPH_PX + 3);
          lit.add(s.vertical ? `${c},${r + step}` : `${c + step},${r}`);
        }
      });
      for (const p of particles) {
        const { pos, frame } = signPoint(s, p);
        expect(insideSign(s, pos)).toBe(true);
        if (frame) continue;
        const c = Math.floor((pos[0] - s.at[0]) / s.px);
        const r = Math.floor((s.at[1] - pos[1]) / s.px);
        expect(lit.has(`${c},${r}`)).toBe(true);
      }
    }
  });

  it('hangs the tall signs on the towers’ street walls, down their sides', () => {
    const tall = CT_SIGNS.filter((s) => s.vertical);
    expect(tall.length).toBeGreaterThan(8);
    expect(CT_SIGNS.some((s) => !s.vertical)).toBe(true);
    for (const s of tall) {
      const tw = CT_TOWERS[s.k] as (typeof CT_TOWERS)[number];
      const { w, h } = signSize(s);
      const wall = tw.x < 0 ? -STREET : STREET;
      const near = tw.x < 0 ? s.at[0] : s.at[0] + w;
      expect(Math.abs(near - wall)).toBeLessThan(0.5);
      // Standing out into the street, never through the wall.
      expect(Math.abs(s.at[0] + w / 2)).toBeLessThan(STREET);
      expect(s.at[2]).toBeGreaterThan(tw.z - tw.hz);
      expect(s.at[2]).toBeLessThan(tw.z + tw.hz);
      expect(s.at[1]).toBeLessThanOrEqual(GROUND + tw.h);
      expect(s.at[1] - h).toBeGreaterThan(GROUND + 2);
    }
  });

  it('flickers the signs very gently, never a hard flash', () => {
    for (const k of [0, 5, 31]) {
      let low = 1;
      for (let t = 0; t < 120; t += 1 / 60) {
        const a = signFlicker(k, t);
        const b = signFlicker(k, t + 1 / 60);
        low = Math.min(low, a);
        expect(a).toBeGreaterThan(0.45);
        expect(a).toBeLessThanOrEqual(1.01);
        expect(Math.abs(b - a)).toBeLessThan(0.02);
      }
      // A dip now and then.
      expect(low).toBeLessThan(0.75);
    }
  });

  it('strings red lanterns across the street, inside its walls', () => {
    expect(LANTERNS).toBeGreaterThan(30);
    for (let j = 0; j < LANTERNS; j++) {
      const c = lanternAt(j, 4);
      expect(Math.abs(c[0])).toBeLessThan(STREET);
      expect(c[1]).toBeGreaterThan(GROUND + 4);
    }
  });
});

describe('Ship', () => {
  const k = PHASES.findIndex((p) => p.id === 'ship');
  const fresh = (t = 10) => {
    setFly(false, [], 0, t);
    setFly(true, [], 1 / 60, t);
  };
  const run = (keys: string[], seconds: number, t0 = 10) => {
    let t = t0;
    for (let i = 0; i < seconds * 60; i++) {
      t += 1 / 60;
      setFly(true, keys, 1 / 60, t);
    }
    return t;
  };

  it('takes over from the autopilot where it is, and cruises straight on with no keys', () => {
    setFly(false, [], 0, 10);
    const was = flier(10);
    setFly(true, [], 1 / 60, 10);
    // One frame on from where the autopilot was.
    expect(dist(flier(10).c, was.c)).toBeLessThan(FLY_SPEED / 30);
    const t = run([], 1);
    expect(dist(flier(t).c, was.c)).toBeGreaterThan(FLY_SPEED * 0.8);
  });

  it('turns on A and D, climbs on W and dives on S', () => {
    // Seen from above, A turns the heading to the left (anticlockwise), D to the right.
    const turned = (keys: string[]) => {
      fresh();
      const a = flier(10).f;
      const b = flier(run(keys, 0.5)).f;
      return a[2] * b[0] - a[0] * b[2];
    };
    expect(turned(['a'])).toBeGreaterThan(0.2);
    expect(turned(['d'])).toBeLessThan(-0.2);
    let t: number;
    fresh();
    const y0 = flier(10).c[1];
    t = run(['w'], 2);
    expect(flier(t).c[1]).toBeGreaterThan(y0 + 3);
    fresh();
    t = run(['s'], 2);
    expect(flier(t).c[1]).toBeLessThan(y0 - 3);
  });

  it('goes faster on E, slower on Q, and boosts on Space while the bar lasts', () => {
    const speed = () => gauges().find((g) => g.label === 'Speed')?.value as number;
    fresh();
    run(['e'], 3);
    expect(speed()).toBeGreaterThan(FLY_SPEED * 1.5);
    fresh();
    run(['q'], 3);
    expect(speed()).toBeLessThan(FLY_SPEED * 0.6);
    fresh();
    run([' '], 1);
    expect(speed()).toBeGreaterThan(FLY_SPEED * (BOOST_PACE - 0.3));
    expect(boostLeft()).toBeLessThan(0.75);
    // Held on, the bar runs dry and the pace falls back; cruising fills it again.
    run([' '], 6);
    expect(boostLeft()).toBe(0);
    expect(speed()).toBeLessThan(FLY_SPEED * 1.3);
    run([], 4);
    expect(boostLeft()).toBeGreaterThan(0.3);
  });

  it('never flies into a tower, through the ground or past the sky', () => {
    fresh();
    let t = 10;
    const plan = [['a'], ['a', 'e'], ['s'], ['d', ' '], ['w', 'd'], ['s', 'a'], [' ']];
    for (const keys of plan) {
      for (let i = 0; i < 300; i++) {
        t += 1 / 60;
        setFly(true, keys, 1 / 60, t);
        const { c } = flier(t);
        expect(blocked(c)).toBe(false);
        expect(c[1]).toBeGreaterThanOrEqual(GROUND + 2 - 1e-9);
        expect(c[1]).toBeLessThanOrEqual(SKY + 1e-9);
      }
    }
  });

  it('shows height and speed on two dials, and keeps the ship behind the eye in view', () => {
    fresh();
    const g = gauges();
    expect(g.map((d) => d.label)).toEqual(['Height', 'Speed']);
    for (const d of g) expect(d.value).toBeLessThanOrEqual(d.max);
    const { eye, target: aim } = pieceCamera(k, 10);
    const { c } = flier(10);
    expect(dist(eye, c)).toBeGreaterThan(8);
    expect(dist(eye, c)).toBeLessThan(14);
    expect(dist(aim, c)).toBeLessThan(8);
    setFly(false, [], 0, 0);
  });
});

describe('Ship, round two: solid walls, the avenue and Chinatown', () => {
  const k = PHASES.findIndex((p) => p.id === 'ship');
  const all = makeParticles(9000);
  const lit = (rgb: number[]) => (rgb[0] as number) + (rgb[1] as number) + (rgb[2] as number) > 0;
  /** The picture at s, as the player draws it (every grain, in order). */
  const frame = (s: number) => all.map((p) => pieceAt(p, k, s));
  /** The route at s, a frame drawn just before it, so the plan knows how many grains are drawn. */
  const fresh = (s: number) => {
    setFly(false, [], 0, s - 5);
    setFly(false, [], 0, s - 1 / 60);
    frame(s - 1 / 60);
    setFly(false, [], 1 / 60, s);
  };

  it('keeps walls dense near the eye and sparser far off', () => {
    // Among the neon towers, between two Chinatowns.
    expect(chinatownness(route(25).c[2], 40)).toBe(0);
    fresh(25);
    const shot = frame(25);
    const { eye } = pieceCamera(k, 25);
    // Grains by the tower face they lie on: count, area and distance.
    const faces = new Map<string, { n: number; area: number; d: number }>();
    for (const { pos, rgb } of shot) {
      if (!lit(rgb)) continue;
      const I = Math.floor(pos[0] / BLOCK_X);
      const J = Math.floor(pos[2] / BLOCK_Z);
      const tw = blockTower(I, J);
      if (pos[1] < GROUND + 0.1 || pos[1] > GROUND + tw.h + 0.01) continue;
      const onX =
        Math.abs(Math.abs(pos[0] - tw.x) - tw.hx) < 0.1 && Math.abs(pos[2] - tw.z) <= tw.hz;
      const onZ =
        Math.abs(Math.abs(pos[2] - tw.z) - tw.hz) < 0.1 && Math.abs(pos[0] - tw.x) <= tw.hx;
      if (!onX && !onZ) continue;
      const key = `${I},${J},${onX ? Math.sign(pos[0] - tw.x) : 2 * Math.sign(pos[2] - tw.z)}`;
      // The nearest the face comes to the eye.
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const y = clamp(eye[1], GROUND, GROUND + tw.h);
      const nearest = onX
        ? [tw.x + Math.sign(pos[0] - tw.x) * tw.hx, y, clamp(eye[2], tw.z - tw.hz, tw.z + tw.hz)]
        : [clamp(eye[0], tw.x - tw.hx, tw.x + tw.hx), y, tw.z + Math.sign(pos[2] - tw.z) * tw.hz];
      const f = faces.get(key) ?? {
        n: 0,
        area: 2 * (onX ? tw.hz : tw.hx) * tw.h,
        d: dist(nearest, eye),
      };
      f.n++;
      faces.set(key, f);
    }
    const density = (lo: number, hi: number) => {
      const fs = [...faces.values()].filter((f) => f.d >= lo && f.d < hi && f.n > 5);
      expect(fs.length).toBeGreaterThan(1);
      return fs.reduce((s, f) => s + f.n / f.area, 0) / fs.length;
    };
    expect(density(0, 40)).toBeGreaterThan(3 * density(80, VIEW));
  });

  it('deals one fixed pool of grains to what the eye sees: in front, in reach, the rest unlit', () => {
    fresh(30);
    const counts: number[] = [];
    for (let s = 30; s < 36; s += 0.5) {
      setFly(false, [], 0.5, s);
      const shot = frame(s);
      expect(shot).toHaveLength(all.length);
      const { eye, target: aim } = pieceCamera(k, s);
      const fwd = aim.map((v, i) => v - (eye[i] as number));
      const { c } = flier(s);
      let n = 0;
      let finite = true;
      let behind = 0;
      let beyond = 0;
      for (const { pos, rgb } of shot) {
        finite &&= [...pos, ...rgb].every(Number.isFinite);
        // The stars apart, in a dome beyond everything else.
        if (!lit(rgb) || dist(pos, c) > VIEW + 10) continue;
        n++;
        const rel = pos.map((v, i) => v - (eye[i] as number));
        if (rel[0] * fwd[0] + rel[1] * fwd[1] + rel[2] * fwd[2] <= 0) behind++;
        if (dist(pos, eye) > VIEW) beyond++;
      }
      expect(finite).toBe(true);
      expect(behind).toBe(0);
      expect(beyond).toBe(0);
      counts.push(n);
    }
    // The towers passed come round ahead: the pool stays well used however far the ship has gone,
    // and never asks for a grain more than there are.
    expect(Math.min(...counts)).toBeGreaterThan(0.6 * all.length);
    expect(Math.max(...counts)).toBeLessThanOrEqual(all.length);
  });

  it('keeps the autopilot down the middle of the avenue, low under each Chinatown gate', () => {
    let stretches = 0;
    let was = 0;
    for (let t = 0; t < 300; t += 0.25) {
      const { c, f } = route(t);
      expect(blocked(c)).toBe(false);
      expect(Math.abs(c[0])).toBeLessThan(AVENUE - 2);
      expect(f[2] / Math.hypot(f[0], f[2])).toBeLessThan(-0.95);
      const ct = chinatownness(c[2]);
      if (ct === 1) expect(c[1]).toBeLessThan(GROUND + 12);
      if (ct === 1 && was === 0) stretches++;
      was = ct;
    }
    // A Chinatown stretch about every half minute, then neon towers again.
    expect(stretches).toBeGreaterThanOrEqual(8);
    expect(stretches).toBeLessThanOrEqual(11);
  });

  it('passes through Chinatown: legible signs on its walls, red lanterns overhead', () => {
    // The first stretch on the route, and the sign nearest its gate.
    let t = 0;
    while (chinatownness(route(t).c[2]) < 1) t += 0.05;
    const J = Math.floor((route(t).c[2] - 4) / BLOCK_Z);
    const signs = avenueSigns(J);
    expect(signs.length).toBe(4);
    const sign = signs.reduce((a, b) => (b.at[2] > a.at[2] ? b : a)) as Sign;
    // Twenty-five short of it.
    while (route(t).c[2] > sign.at[2] + 18) t += 0.02;
    fresh(t);
    const { eye } = pieceCamera(k, t);
    expect(eye[2]).toBeGreaterThan(sign.at[2]);
    const shot = frame(t);
    const lit_ = new Set<string>();
    [...sign.text].forEach((ch, n) => {
      for (const [col, r] of glyph(ch, true)) lit_.add(`${col},${r + n * (GLYPH_PX + 3)}`);
    });
    const hit = new Set<string>();
    let lanterns = 0;
    for (const { pos, rgb } of shot) {
      if (!lit(rgb)) continue;
      if (Math.abs(pos[2] - sign.at[2]) < 1e-3) {
        const key = `${Math.floor((pos[0] - sign.at[0]) / sign.px)},${Math.floor((sign.at[1] - pos[1]) / sign.px)}`;
        if (lit_.has(key)) hit.add(key);
      }
      if (
        pos[1] > eye[1] &&
        Math.abs(pos[0]) < AVENUE &&
        rgb[0] > 2 * rgb[2] &&
        rgb[0] > 1.5 * rgb[1]
      )
        lanterns++;
    }
    // Most of its characters' pixels alight, so it reads as you pass.
    expect(hit.size).toBeGreaterThan(0.6 * lit_.size);
    expect(lanterns).toBeGreaterThan(200);
  });

  it('steers into a side street with D, and carries on from where you let go, back down the avenue', () => {
    // Just short of a crossing, outside Chinatown.
    let t = 10;
    for (;;) {
      const z = route(t).c[2];
      const into = z - Math.floor(z / BLOCK_Z) * BLOCK_Z;
      if (into > 6.5 && into < 7.5 && chinatownness(z, 30) === 0) break;
      t += 0.01;
    }
    setFly(false, [], 0, t);
    setFly(true, [], 1 / 60, t);
    const step = (active: boolean, keys: string[], seconds: number) => {
      for (let i = 0; i < seconds * 60; i++) {
        t += 1 / 60;
        setFly(active, keys, 1 / 60, t);
        expect(blocked(flier(t).c)).toBe(false);
      }
    };
    step(true, ['d'], 1.4);
    step(true, [], 2.5);
    const side = flier(t);
    expect(side.f[0]).toBeGreaterThan(0.9);
    expect(side.c[0]).toBeGreaterThan(AVENUE + 5);
    // Let go: no jump, the autopilot carries on from there.
    step(false, [], 1 / 60);
    expect(dist(flier(t).c, side.c)).toBeLessThan(FLY_SPEED / 30);
    step(false, [], 40);
    const back = flier(t);
    expect(Math.abs(back.c[0])).toBeLessThan(AVENUE);
    expect(back.f[2]).toBeLessThan(-0.9);
    setFly(false, [], 0, 0);
  });
});
