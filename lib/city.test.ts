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
  boostPaceAt,
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
  facingFace,
  flier,
  floorAt,
  GATE_SIGN,
  GLYPH_PX,
  GROUND,
  gauges,
  glyph,
  hasPalettes,
  hasVariants,
  LANES,
  LANTERNS,
  laneShip,
  lanternAt,
  makeParticles,
  neonAt,
  PADS,
  PHASE_START,
  PHASES,
  paletteNames,
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
  setPalette,
  setVariant,
  signFlicker,
  signPoint,
  signSize,
  starBall,
  TOTAL,
  target,
  VIEW,
  variantLabel,
  variantNames,
} from './city';
import { districtAt } from './city-game';
import { CITIES, CITY_K, cityPlan } from './city-plans';
import { RATIOS } from './golden-buildings';
import {
  band,
  bandIndex,
  GOLDEN,
  HEART_K,
  hopeAt,
  revealed,
  risen,
  SPHERE_C,
  SPHERE_R,
} from './golden-city';
import { PLAN_NAMES, PLAN_RULES } from './golden-plans';
import { DOMES, FACTORIES, TEMPLES } from './golden-quarters';
import { GROUND_Y, PHI } from './grain-mesh';
import { NOVA_CENTRE, NOVA_CORES, NOVA_R, NOVA_RULES, novaCore } from './nova-cores';

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
  it('has seventeen pieces, from the golden plan to the ship, each with words', () => {
    expect(PHASES.map((p) => p.id)).toEqual([
      'golden-plan',
      'rising',
      'heart',
      'nova',
      'temples',
      'factories',
      'domes',
      'buildings',
      'above',
      'atlantis',
      'towers',
      'lanes',
      'neon',
      'chinatown',
      'docks',
      'canyon',
      'ship',
    ]);
    expect(PHASES.map((p) => p.name)).toEqual([
      'Golden plan',
      'Rising',
      'The heart',
      'Nova Cores',
      'Temples',
      'Factories',
      'Domes',
      'Buildings',
      'From above',
      'Atlantis',
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
    // Collected per grain and asserted once, so the test stays fast under the full suite.
    let finite = true;
    let far = 0;
    let hi = 0;
    let lo = 1;
    for (let k = 0; k < PHASES.length; k++) {
      for (const u of [0, 0.3, 0.6, 0.85, 0.99]) {
        const t = at(k, u);
        const { eye } = camera(t);
        for (const p of particles.slice(0, 300)) {
          const { pos, rgb } = particleAt(p, t);
          for (const v of [...pos, ...rgb]) finite &&= Number.isFinite(v);
          far = Math.max(far, dist(pos, eye));
          hi = Math.max(hi, ...rgb);
          lo = Math.min(lo, ...rgb);
        }
      }
    }
    expect(finite).toBe(true);
    // Within the trip player's far plane, and never brighter than a grain should be.
    expect(far).toBeLessThan(900);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeGreaterThanOrEqual(0);
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
    // Flat at the very start, rising from the first moments (2026-11-12: "make them start moving
    // faster"), all up by about a third of the way in (the sky's stars apart).
    const roofs = (u: number) =>
      Math.max(
        ...particles
          .filter((p) => p.c >= 0.12)
          .map((p) => pieceAt(p, k, u * (PHASES[k]?.duration as number)).pos[1]),
      );
    expect(roofs(0)).toBeLessThan(GROUND + 1);
    expect(roofs(0.05)).toBeGreaterThan(GROUND + 10);
    for (let j = 0; j < CITY.length; j++)
      expect(builtTop(j, 0.36)).toBeCloseTo(CITY[j]?.h as number, 6);
    expect(roofs(0.7)).toBeGreaterThan(GROUND + 30);
    expect(height(0.7)).toBeGreaterThan(roofs(0.7));
  });

  it('spends the tower grains on the faces toward the eye, fading those that change face', () => {
    // 2026-11-12: "towers and sky lanes more defined, more dots."
    const tw = CITY[12] as (typeof CITY)[number];
    const eye: [number, number, number] = [tw.x + 50, GROUND + 30, tw.z + 10];
    const count = [0, 0, 0, 0];
    let faded = 0;
    for (let i = 0; i < 4000; i++) {
      const { face, fade } = facingFace(tw, eye, (i + 0.5) / 4000);
      count[face] = (count[face] as number) + 1;
      if (fade < 1) faded++;
    }
    // +x faces the eye squarely, +z a little; -x and -z, turned away, almost nothing.
    expect(count[1]).toBeGreaterThan(2500);
    expect(count[2]).toBeGreaterThan(count[0] as number);
    expect((count[0] as number) + (count[3] as number)).toBeLessThan(400);
    expect(faded / 4000).toBeLessThan(0.15);
    // Each tower is drawn by more grains on the faces seen than on those turned away.
    const k = piece('towers');
    const { eye: e } = pieceCamera(k, 0.6 * (PHASES[k]?.duration as number));
    let near = 0;
    let far = 0;
    for (const p of makeParticles(9000)) {
      if (p.c < 0.08) continue;
      const s = pieceAt(p, k, 0.6 * (PHASES[k]?.duration as number));
      if (Math.max(...s.rgb) < 0.01) continue;
      for (const t of CITY) {
        if (
          !inside([s.pos[0], s.pos[1] - 0.05, s.pos[2]], { ...t, hx: t.hx + 0.1, hz: t.hz + 0.1 })
        )
          continue;
        const toEye = (e[0] - t.x) * (s.pos[0] - t.x) + (e[2] - t.z) * (s.pos[2] - t.z);
        if (toEye > 0) near++;
        else far++;
        break;
      }
    }
    expect(near).toBeGreaterThan(far * 4);
  });

  it('has the sky lanes streaming from the first moment', () => {
    const k = piece('lanes');
    const ships = makeParticles(9000).filter((p) => p.c >= 0.5);
    const lit = ships.filter((p) => Math.max(...pieceAt(p, k, 0.2).rgb) > 0.02).length;
    expect(lit / ships.length).toBeGreaterThan(0.2);
    expect(Math.min(...LANES.map((l) => l.speed))).toBeGreaterThanOrEqual(6.5);
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
    // The street's ships all fly forward, above and below the eye; the cross traffic goes
    // left and right above it; every road keeps one colour.
    const ships = Array.from({ length: 160 }, (_, j) => canyonShip(j, 0, 5));
    const street = ships.filter((s) => s.dir[2] !== 0);
    const cross = ships.filter((s) => s.dir[0] !== 0);
    expect(street.length + cross.length).toBe(160);
    expect(street.every((s) => s.dir[2] < 0)).toBe(true);
    expect(street.some((s) => s.c[1] > EYE_Y) && street.some((s) => s.c[1] < EYE_Y)).toBe(true);
    expect(cross.every((s) => s.c[1] > EYE_Y + 10)).toBe(true);
    expect(cross.some((s) => s.dir[0] > 0) && cross.some((s) => s.dir[0] < 0)).toBe(true);
    const later = Array.from({ length: 160 }, (_, j) => canyonShip(j, 0, 9));
    for (const [i, s] of ships.entries()) {
      const road = (x: typeof s) => `${x.c[0].toFixed(3)}|${x.c[1]}`;
      if (s.dir[2] !== 0) expect(road(later[i] as typeof s)).toBe(road(s));
      expect(later[i]?.colour).toEqual(s.colour);
    }
    const colourOf = new Map<string, string>();
    for (const s of street) {
      const key = `${s.c[0]}|${s.c[1]}`;
      const c = s.colour.join(',');
      expect(colourOf.get(key) ?? c).toBe(c);
      colourOf.set(key, c);
    }
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
    // The boost by height (2026-11-13): twice the cruise in the streets, three times at the roofs.
    const tb = run([' '], 1);
    expect(speed()).toBeGreaterThan(FLY_SPEED * (boostPaceAt(flier(tb).c[1]) - 0.3));
    expect(boostPaceAt(SKY)).toBeCloseTo(BOOST_PACE, 1);
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
        // The floor is the street, or a canal's bed under it; no super boost here (Space and W
        // never held together), so the ceiling is the towers' sky.
        expect(c[1]).toBeGreaterThanOrEqual(floorAt(c[0], c[2]) + 2 - 1e-9);
        expect(c[1]).toBeLessThanOrEqual(SKY + 1e-9);
      }
    }
  });

  it('shows height, speed, heading and district, and keeps the ship behind the eye in view', () => {
    fresh();
    const g = gauges();
    expect(g.map((d) => d.label)).toEqual(['Height', 'Speed', 'Heading', 'District']);
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
    // A few frames first, so the plan has settled on how many grains are drawn and how densely
    // to deal them, whatever the tests before left behind.
    setFly(false, [], 0, s - 3 / 60);
    for (const f of [3, 2, 1]) {
      if (f < 3) setFly(false, [], 1 / 60, s - f / 60);
      frame(s - f / 60);
    }
    setFly(false, [], 1 / 60, s);
  };

  it('keeps walls dense near the eye and sparser far off', () => {
    // Among the tall towers of the Heights, away from Chinatown.
    let s0 = 0;
    while (districtAt(route(s0).c[0], route(s0).c[2]) !== 'heights') s0 += 0.5;
    s0 += 8;
    expect(chinatownness(route(s0).c[2], 40)).toBe(0);
    fresh(s0);
    const shot = frame(s0);
    const { eye } = pieceCamera(k, s0);
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
    for (let t = 0; t < 600; t += 0.25) {
      const { c, f } = route(t);
      expect(blocked(c)).toBe(false);
      expect(Math.abs(c[0])).toBeLessThan(AVENUE - 2);
      expect(f[2] / Math.hypot(f[0], f[2])).toBeLessThan(-0.95);
      const ct = chinatownness(c[2]);
      if (ct === 1) expect(c[1]).toBeLessThan(GROUND + 12);
      if (ct === 1 && was === 0) stretches++;
      was = ct;
    }
    // Chinatown once in every turn of the plan (three minutes), then every other district.
    expect(stretches).toBeGreaterThanOrEqual(3);
    expect(stretches).toBeLessThanOrEqual(4);
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

/* ---------- the golden city ---------- */

const brightness = (rgb: number[]) => Math.max(...rgb);
const finiteSpot = (s: { pos: number[]; rgb: number[] }) =>
  [...s.pos, ...s.rgb].every(Number.isFinite) && Math.max(...s.rgb) <= 1 && Math.min(...s.rgb) >= 0;
const STAR_SHARE = 0.03;

describe('The golden city (2026-11-12: "build the city")', () => {
  const all = makeParticles(9000);
  const city = all.filter((p) => p.c >= STAR_SHARE);

  it('stands on the chapter’s ground and lays its rings out by φ', () => {
    expect(GROUND_Y).toBe(GROUND);
    expect(GOLDEN.bands.map((b) => b.name)).toEqual([
      'Heart',
      'Inner canal',
      'Ring of knowledge',
      'Ring of making',
      'Middle canal',
      'Ring of living',
      'Outer canal',
      'Ring of nature',
    ]);
    const width = (b: { r0: number; r1: number }) => b.r1 - b.r0;
    const land = GOLDEN.bands.filter((b) => b.kind === 'land');
    const water = GOLDEN.bands.filter((b) => b.kind === 'water');
    // Each land ring φ times wider than the one inside it, the first φ times the heart's radius;
    // and each canal φ times wider than the canal inside it.
    expect(width(land[0] as never) / width(band('Heart'))).toBeCloseTo(PHI, 9);
    for (let i = 1; i < land.length; i++)
      expect(width(land[i] as never) / width(land[i - 1] as never)).toBeCloseTo(PHI, 9);
    for (let i = 1; i < water.length; i++)
      expect(width(water[i] as never) / width(water[i - 1] as never)).toBeCloseTo(PHI, 9);
    // The rings meet edge to edge, out to the city's rim.
    for (let i = 1; i < GOLDEN.bands.length; i++)
      expect(GOLDEN.bands[i]?.r0).toBeCloseTo(GOLDEN.bands[i - 1]?.r1 as number, 9);
    expect(GOLDEN.outer).toBeCloseTo(GOLDEN.bands[GOLDEN.bands.length - 1]?.r1 as number, 9);
    expect(GOLDEN.spokes).toBe(12);
    expect(bandIndex(0)).toBe(0);
    expect(bandIndex(GOLDEN.outer + 5)).toBe(GOLDEN.bands.length - 1);
    // Heights φ times higher each ring toward the heart.
    const H = GOLDEN.heights;
    expect(H.making / H.living).toBeCloseTo(PHI, 9);
    expect(H.knowledge / H.making).toBeCloseTo(PHI, 9);
    expect(H.tower / H.knowledge).toBeCloseTo(PHI, 9);
    // Brighter toward the heart.
    expect(hopeAt(0)).toBeGreaterThan(hopeAt(20));
    expect(hopeAt(20)).toBeGreaterThan(hopeAt(50));
  });

  it('opens the plan ring by ring from the heart, flat on the ground, brighter toward the centre', () => {
    const k = piece('golden-plan');
    expect(k).toBe(0);
    const L = pieceLength(k);
    expect(revealed(0, 0.12)).toBeGreaterThan(0.9);
    expect(revealed(GOLDEN.bands.length - 1, 0.12)).toBe(0);
    const ring = (pos: number[]) => bandIndex(Math.hypot(pos[0] as number, pos[2] as number));
    const mean = (s: number, keep: (i: number) => boolean) => {
      let sum = 0;
      let n = 0;
      for (const p of city) {
        const { pos, rgb } = pieceAt(p, k, s);
        if (!keep(ring(pos))) continue;
        sum += brightness(rgb);
        n++;
      }
      return sum / Math.max(1, n);
    };
    const last = GOLDEN.bands.length - 1;
    expect(mean(0.12 * L, (i) => i === 0)).toBeGreaterThan(0.1);
    expect(mean(0.12 * L, (i) => i === last)).toBeLessThan(0.01);
    expect(mean(0.7 * L, (i) => i <= 2)).toBeGreaterThan(mean(0.7 * L, (i) => i === last) * 1.3);
    let ok = true;
    let flat = 0;
    let far = 0;
    for (const p of city) {
      const s = pieceAt(p, k, 0.7 * L);
      ok &&= finiteSpot(s);
      flat = Math.max(flat, Math.abs(s.pos[1] - GROUND));
      far = Math.max(far, Math.hypot(s.pos[0], s.pos[2]));
    }
    expect(ok).toBe(true);
    expect(flat).toBeLessThan(3);
    expect(far).toBeLessThan(GOLDEN.outer + 2);
  });

  it('raises the city from its map, φ times higher toward the heart, the eye tilting down to the side', () => {
    const k = piece('rising');
    expect(k).toBe(piece('golden-plan') + 1);
    const L = pieceLength(k);
    expect(risen(2, 0.02)).toBe(0);
    let early = 0;
    for (const p of city) early = Math.max(early, pieceAt(p, k, 0.02 * L).pos[1] - GROUND);
    expect(early).toBeLessThan(0.5);
    const top = [0, 0, 0, 0, 0, 0, 0, 0];
    let ok = true;
    for (const p of city) {
      const s = pieceAt(p, k, 0.65 * L);
      ok &&= finiteSpot(s);
      const i = bandIndex(Math.hypot(s.pos[0], s.pos[2]));
      top[i] = Math.max(top[i] as number, s.pos[1] - GROUND);
    }
    expect(ok).toBe(true);
    const H = GOLDEN.heights;
    const kn = GOLDEN.bands.findIndex((b) => b.name === 'Ring of knowledge');
    const lv = GOLDEN.bands.findIndex((b) => b.name === 'Ring of living');
    const nt = GOLDEN.bands.findIndex((b) => b.name === 'Ring of nature');
    expect(top[kn]).toBeGreaterThan(H.tower * 0.9);
    expect(top[kn]).toBeLessThan(H.tower + 1.5);
    expect(top[lv]).toBeLessThan(H.living + 0.01);
    expect(top[lv]).toBeGreaterThan(H.living * 0.9);
    expect(top[nt]).toBeLessThan(3);
    // From nearly straight above to an oblique view.
    const tilt = (s: number) => {
      const { eye, target } = pieceCamera(k, s);
      return (eye[1] - target[1]) / dist(eye, target);
    };
    expect(tilt(0)).toBeGreaterThan(0.95);
    expect(tilt(0.65 * L)).toBeLessThan(0.6);
  });

  it('floats an open sphere of light over the heart’s garden, breathing slowly', () => {
    const k = piece('heart');
    expect(HEART_K).toBeGreaterThan(1);
    let near = 0;
    let shell = 0;
    let ok = true;
    let jump = 0;
    for (const p of city) {
      const a = pieceAt(p, k, 11);
      ok &&= finiteSpot(a);
      const d = dist(a.pos, SPHERE_C);
      if (d < SPHERE_R * 1.1) {
        near++;
        if (Math.abs(d - SPHERE_R) < SPHERE_R * 0.06) shell++;
      }
      const b = pieceAt(p, k, 11 + 1 / 60);
      jump = Math.max(jump, dist(a.rgb, b.rgb));
    }
    expect(ok).toBe(true);
    // A lattice on the sphere's shell, not a solid ball: most grains near it sit on the shell.
    expect(near).toBeGreaterThan(300);
    expect(shell / near).toBeGreaterThan(0.7);
    // Mellow: a frame apart no colour jumps.
    expect(jump).toBeLessThan(0.05);
    // Above the garden, which is above the ground.
    expect(SPHERE_C[1] - SPHERE_R).toBeGreaterThan(GROUND + 2.4);
  });

  // 2026-11-12: "do different versions of each or evolutions (1 dome, one group of domes, one dome
  // complex etc... so u see from the element to the whole quartier factory etc..)".
  for (const [id, label, set, names] of [
    [
      'temples',
      'Temple',
      TEMPLES,
      [
        'Rotunda',
        'Ziggurat',
        'Ring',
        'Pyramid',
        'Lotus',
        'Temple court',
        'Sacred complex',
        'Temple quarter',
      ],
    ],
    [
      'factories',
      'Factory',
      FACTORIES,
      [
        'Sawtooth',
        'Foundry',
        'Assembly',
        'Workshops',
        'Solar',
        'Cement works',
        'Kilns',
        'Factory group',
        'Industrial complex',
        'Industrial quarter',
      ],
    ],
    [
      'domes',
      'Dome',
      DOMES,
      [
        'Geodesic',
        'Bubbles',
        'Palm house',
        'Lattice',
        'Group of domes',
        'Dome complex',
        'Dome quarter',
      ],
    ],
  ] as const) {
    it(`builds the ${id} from the single building to the quarter, each solid, on the ground and its own`, () => {
      const k = piece(id);
      expect(hasVariants(k)).toBe(true);
      expect(variantNames(k)).toEqual(names);
      expect(variantLabel(k)).toBe(label);
      // The ladder's last three rungs: group, complex, quarter, each seen from further back.
      expect(set.rung.slice(-3)).toEqual([1, 2, 3]);
      const maps: Set<string>[] = [];
      const reach: number[] = [];
      for (let i = 0; i < names.length; i++) {
        setVariant(i, k);
        let ok = true;
        let below = 0;
        let wide = 0;
        let lit = 0;
        const cells = new Set<string>();
        for (const p of city) {
          const s = pieceAt(p, k, 7.5);
          ok &&= finiteSpot(s);
          below = Math.min(below, s.pos[1] - GROUND);
          wide = Math.max(wide, Math.hypot(s.pos[0], s.pos[2]));
          if (brightness(s.rgb) > 0.02) lit++;
          cells.add(s.pos.map((v) => Math.floor(v / 1.5)).join());
        }
        expect(ok).toBe(true);
        expect(below).toBeGreaterThan(-0.01);
        // A building within 40 of its centre; the bigger rungs within as much again as the eye stands back.
        expect(wide).toBeLessThan(40 * (set.reach[i] as number));
        expect(lit).toBeGreaterThan(city.length * 0.8);
        maps.push(cells);
        const { eye, target } = pieceCamera(k, 7.5);
        reach.push(dist(eye, target));
      }
      for (let i = 0; i < names.length; i++)
        for (let j = i + 1; j < names.length; j++) {
          const a = maps[i] as Set<string>;
          const b = maps[j] as Set<string>;
          const both = [...a].filter((c) => b.has(c)).length;
          expect(both / (a.size + b.size - both)).toBeLessThan(0.6);
        }
      // The quarter is seen from further back than the complex, and that than the single building.
      const n = names.length;
      expect(reach[n - 1]).toBeGreaterThan(reach[n - 2] as number);
      expect(reach[n - 2]).toBeGreaterThan(reach[0] as number);
      setVariant(0);
    });
  }

  it('offers colour presets on the golden pieces and the factories, and applies them', () => {
    expect(paletteNames(piece('temples'))).toEqual([
      'Gold',
      'Rose gold',
      'White marble & gold',
      'Night neon gold',
    ]);
    expect(paletteNames(piece('factories'))).toEqual([
      'Gold',
      'Rust',
      'Steel blue-grey',
      'Night neon gold',
    ]);
    expect(hasPalettes(piece('heart'))).toBe(true);
    expect(hasPalettes(piece('towers'))).toBe(false);
    expect(paletteNames(piece('towers'))).toEqual([]);
    const k = piece('factories');
    setVariant(5, k);
    const sample = city.slice(0, 400);
    const look = () => sample.map((p) => pieceAt(p, k, 7.5).rgb);
    setPalette(0, k);
    const gold = look();
    setPalette(1, k);
    const rust = look();
    let changed = 0;
    let ok = true;
    for (let i = 0; i < sample.length; i++) {
      if (dist(gold[i] as number[], rust[i] as number[]) > 0.01) changed++;
      ok &&= finiteSpot({ pos: [0, 0, 0], rgb: rust[i] as number[] });
    }
    expect(ok).toBe(true);
    expect(changed).toBeGreaterThan(sample.length * 0.5);
    // Rust leans red: less green than gold over the same grains.
    const green = (c: number[][]) =>
      c.reduce((s, x) => s + (x[1] as number) / ((x[0] as number) + 1e-6), 0);
    expect(green(rust)).toBeLessThan(green(gold));
    // The Journey (no piece) and an unknown preset fall back to gold.
    setPalette(9, k);
    expect(look()).toEqual(gold);
    setPalette(1, k);
    setPalette(0);
    expect(look()).toEqual(gold);
    setVariant(0);
  });

  it('lays out eleven plans from above, each its own, flat, finite and the same every time', () => {
    // 2026-11-12: "the golden plan design is amazing, do 10 like this".
    const k = piece('golden-plan');
    expect(variantNames(k)).toEqual(['Golden', ...PLAN_NAMES]);
    expect(PLAN_NAMES).toHaveLength(10);
    expect(PLAN_RULES).toHaveLength(10);
    const L = pieceLength(k);
    const maps: Set<string>[] = [];
    for (let i = 0; i < 11; i++) {
      setVariant(i, k);
      let ok = true;
      let flat = 0;
      let far = 0;
      let same = true;
      const cells = new Set<string>();
      for (const p of city) {
        const s = pieceAt(p, k, 0.7 * L);
        ok &&= finiteSpot(s);
        flat = Math.max(flat, Math.abs(s.pos[1] - GROUND));
        far = Math.max(far, Math.hypot(s.pos[0], s.pos[2]));
        cells.add(`${Math.floor(s.pos[0] / 2)},${Math.floor(s.pos[2] / 2)}`);
      }
      for (const p of city.slice(0, 200))
        same &&= dist(pieceAt(p, k, 9).pos, pieceAt(p, k, 9).pos) === 0;
      expect(ok).toBe(true);
      expect(same).toBe(true);
      expect(flat).toBeLessThan(3.5);
      expect(far).toBeLessThan(65);
      expect(far).toBeGreaterThan(40);
      maps.push(cells);
    }
    for (let i = 0; i < maps.length; i++)
      for (let j = i + 1; j < maps.length; j++) {
        const a = maps[i] as Set<string>;
        const b = maps[j] as Set<string>;
        const both = [...a].filter((c) => b.has(c)).length;
        expect(both / (a.size + b.size - both)).toBeLessThan(0.7);
      }
    setVariant(0);
  });

  it('lights eight Nova Cores over their plazas, each its own, breathing, its energy running out', () => {
    // 2026-11-12: "would love to have more novas like this around the city ... call them the Nova Core."
    const k = piece('nova');
    expect(k).toBe(piece('heart') + 1);
    expect(variantNames(k)).toEqual(NOVA_CORES);
    expect(NOVA_CORES).toHaveLength(8);
    expect(NOVA_RULES).toHaveLength(8);
    const maps: Set<string>[] = [];
    for (let i = 0; i < 8; i++) {
      setVariant(i, k);
      let ok = true;
      let near = 0;
      let below = 0;
      let jump = 0;
      let out = 0;
      const cells = new Set<string>();
      for (const p of city) {
        const a = pieceAt(p, k, 11);
        ok &&= finiteSpot(a);
        below = Math.min(below, a.pos[1] - GROUND);
        if (dist(a.pos, NOVA_CENTRE) < NOVA_R * 1.4) {
          near++;
          cells.add(a.pos.map((v) => Math.floor(v / 0.8)).join());
        }
        // Energy out along the conduits: lit grains on the ground far from the core.
        if (
          Math.hypot(a.pos[0], a.pos[2]) > 15 &&
          a.pos[1] - GROUND < 0.3 &&
          brightness(a.rgb) > 0.05
        )
          out++;
        jump = Math.max(jump, dist(a.rgb, pieceAt(p, k, 11 + 1 / 60).rgb));
      }
      expect(ok).toBe(true);
      expect(below).toBeGreaterThan(-0.01);
      expect(near).toBeGreaterThan(city.length * 0.15);
      expect(out).toBeGreaterThan(100);
      expect(jump).toBeLessThan(0.05);
      maps.push(cells);
      // The same picture for the same moment.
      for (const p of city.slice(0, 100)) expect(pieceAt(p, k, 4)).toEqual(pieceAt(p, k, 4));
    }
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++) {
        const a = maps[i] as Set<string>;
        const b = maps[j] as Set<string>;
        const both = [...a].filter((c) => b.has(c)).length;
        expect(both / (a.size + b.size - both)).toBeLessThan(0.6);
      }
    setVariant(0);
  });

  it('builds a Nova Core anywhere for the game, still and scaled', () => {
    const home = novaCore(3).build();
    expect(home.pivot).toEqual(NOVA_CENTRE);
    const placed = novaCore(3, undefined, [100, GROUND, -40], 0.5).build();
    expect(placed.lines.length).toBe(home.lines.length);
    let ok = true;
    let lo = Number.POSITIVE_INFINITY;
    for (let i = 0; i < placed.lines.length; i += 3) {
      const x = placed.lines[i] as number;
      const y = placed.lines[i + 1] as number;
      const z = placed.lines[i + 2] as number;
      ok &&= Number.isFinite(x + y + z) && Math.hypot(x - 100, z + 40) <= 46 * 0.5 + 0.01;
      lo = Math.min(lo, y);
    }
    expect(ok).toBe(true);
    expect(lo).toBeGreaterThanOrEqual(GROUND - 1e-6);
    // Placed elsewhere nothing turns (a mesh turns round one pivot only).
    for (let i = 1; i < placed.lineMeta.length; i += 4) {
      expect(placed.lineMeta[i]).not.toBe(3);
      expect(placed.lineMeta[i]).not.toBe(5);
    }
    // Any kind number lands on one of the eight.
    expect(novaCore(11).build().lines.length).toBe(novaCore(3).build().lines.length);
  });

  it('builds its temples, factories and domes from powers of φ', () => {
    const { half, height } = RATIOS.pyramid;
    // The Kepler triangle: height² = φ · half², so the slant is φ times the half-base.
    expect((height / half) ** 2).toBeCloseTo(PHI, 9);
    expect(Math.hypot(height, half) / half).toBeCloseTo(PHI, 9);
    const ratios = (v: number[], r: number) => {
      for (let i = 1; i < v.length; i++)
        expect((v[i - 1] as number) / (v[i] as number)).toBeCloseTo(r, 9);
    };
    ratios(RATIOS.ziggurat, PHI);
    ratios(RATIOS.bubbles, PHI);
    ratios(RATIOS.workshops, PHI ** 0.25);
    ratios(RATIOS.solar, 1 / Math.sqrt(PHI));
  });
});

describe('From above (moved from Vegetal, 2026-11-12)', () => {
  const k = piece('above');
  const all = makeParticles(9000);

  it('comes after the golden city and its buildings, before the neon towers, with five cities on pills', () => {
    expect(PHASES[k - 1]?.id).toBe('buildings');
    expect(piece('buildings')).toBe(piece('domes') + 1);
    expect(PHASES[k + 1]?.id).toBe('atlantis');
    expect(PHASES[k + 2]?.id).toBe('towers');
    expect(CITIES.map((c) => c.name)).toEqual(['Grid', 'Star', 'River', 'Bay', 'Canals']);
    expect(variantNames(k)).toEqual(['Grid', 'Star', 'River', 'Bay', 'Canals']);
    expect(variantLabel(k)).toBe('City');
  });

  it('lays every city flat, wide, bright in the centre and sparse at the edge, dark on the water', () => {
    const L = pieceLength(k);
    const maps = CITIES.map((_, i) => {
      setVariant(i, k);
      const plan = cityPlan(i);
      expect(plan.roads.length).toBeGreaterThan(50);
      const [cx, cy] = plan.centre.map((v) => v * CITY_K) as [number, number];
      let inner = 0;
      let innerN = 0;
      let outer = 0;
      let outerN = 0;
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      const cells = new Set<string>();
      // Collected per grain and asserted once, so the test stays fast under the full suite.
      let finite = true;
      let highest = 0;
      let onWater = 0;
      for (const p of all) {
        const { pos, rgb } = pieceAt(p, k, 0.5 * L);
        for (const v of [...pos, ...rgb]) finite &&= Number.isFinite(v);
        highest = Math.max(highest, Math.abs(pos[2]));
        lo = Math.min(lo, pos[0]);
        hi = Math.max(hi, pos[0]);
        if (p.c >= 0.74 && plan.wet(pos[0] / CITY_K, pos[1] / CITY_K)) onWater++;
        const r = Math.hypot(pos[0] - cx, pos[1] - cy);
        const glow = Math.max(...rgb);
        if (r < 0.25 * CITY_K) {
          inner += glow;
          innerN++;
        } else if (r > 0.7 * CITY_K && r < 1.4 * CITY_K) {
          outer += glow;
          outerN++;
        }
        cells.add(`${Math.floor(pos[0] / 3)},${Math.floor(pos[1] / 3)}`);
      }
      expect(finite).toBe(true);
      expect(highest).toBeLessThan(1.5);
      expect(onWater).toBe(0);
      expect(hi - lo).toBeGreaterThan(CITY_K * 1.5);
      expect(innerN / 0.25 ** 2).toBeGreaterThan((3 * outerN) / (1.4 ** 2 - 0.7 ** 2));
      expect(inner / innerN).toBeGreaterThan((outer / outerN) * 1.3);
      return cells;
    });
    for (let i = 0; i < maps.length; i++)
      for (let j = i + 1; j < maps.length; j++) {
        const a = maps[i] as Set<string>;
        const b = maps[j] as Set<string>;
        const both = [...a].filter((c) => b.has(c)).length;
        expect(both / (a.size + b.size - both)).toBeLessThan(0.7);
      }
    setVariant(0);
  });

  it('moves the car lights along the fast roads, and lays the same city every time', () => {
    setVariant(3, k);
    const cars = all.filter((p) => p.c < 0.08).slice(0, 200);
    const moved = cars.filter((p) => dist(pieceAt(p, k, 2).pos, pieceAt(p, k, 4).pos) > 1).length;
    expect(moved).toBeGreaterThan(cars.length * 0.8);
    let same = true;
    for (const p of all.slice(0, 300)) {
      const a = pieceAt(p, k, 5);
      const b = pieceAt(p, k, 5);
      same &&= dist(a.pos, b.pos) === 0 && dist(a.rgb, b.rgb) === 0;
    }
    expect(same).toBe(true);
    // The eye drifts over the city, looking down at it.
    const a = pieceCamera(k, 3);
    const b = pieceCamera(k, 30);
    expect(dist(a.eye, b.eye)).toBeGreaterThan(3);
    expect(a.eye[2] - a.target[2]).toBeGreaterThan(40);
    // The Journey shows the first city.
    setVariant(0);
    expect(variantNames(k)[0]).toBe('Grid');
  });
});
