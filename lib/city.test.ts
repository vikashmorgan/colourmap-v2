import { describe, expect, it } from 'vitest';

import { flow } from './bigbang';
import {
  BOOST_PACE,
  BRIDGES,
  blocked,
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
