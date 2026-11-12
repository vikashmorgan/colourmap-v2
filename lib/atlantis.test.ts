import { describe, expect, it } from 'vitest';

import {
  ATLANTIS_VIEWS,
  atlantisAt,
  BERTHS,
  BUBBLE_LIFE,
  bubble,
  COMPARTMENTS,
  dockedSub,
  floorAt,
  isGardenDome,
  prepareAtlantis,
  roleShare,
  SUB_COUNT,
  SUB_LANES,
  SUB_LEN,
  submarine,
  TEMPLE_SPHERE,
  viewEye,
} from './atlantis';
import { makeParticles } from './bigbang';
import { hasVariants, PHASES, pieceAt, setVariant, variantLabel, variantNames } from './city';
import { GOLDEN } from './golden-city';
import { GROUND_Y } from './grain-mesh';

const G = GROUND_Y;
const all = makeParticles(9000);
const some = all.filter((_, i) => i % 3 === 0);
const k = PHASES.findIndex((p) => p.id === 'atlantis');
const dist = (a: number[], b: number[]) =>
  Math.hypot(
    (a[0] as number) - (b[0] as number),
    (a[1] as number) - (b[1] as number),
    (a[2] as number) - (b[2] as number),
  );
const finite = (s: { pos: number[]; rgb: number[] }) =>
  [...s.pos, ...s.rgb].every(Number.isFinite) && Math.max(...s.rgb) <= 1 && Math.min(...s.rgb) >= 0;

prepareAtlantis();

describe('Atlantis (2026-11-12: "add Atlantis as a city, with marine life around it")', () => {
  it('comes after From above, with five views on pills', () => {
    expect(k).toBe(PHASES.findIndex((p) => p.id === 'above') + 1);
    expect(PHASES[k]?.name).toBe('Atlantis');
    expect(hasVariants(k)).toBe(true);
    expect(variantNames(k)).toEqual(['Plan', 'Domes', 'Coral gardens', 'The heart', 'Harbour']);
    expect(variantLabel(k)).toBe('View');
    for (let v = 0; v < ATLANTIS_VIEWS.length; v++) {
      // Each view shares out the whole budget.
      const roles = ['plankton', 'shaft', 'floor', 'city', 'temple', 'harbour', 'reef', 'sub'];
      const more = ['bubble', 'dock', 'fish', 'jelly', 'manta', 'whale'];
      const sum = [...roles, ...more].reduce((s, r) => s + roleShare(v, r), 0);
      expect(sum).toBeCloseTo(1, 9);
    }
  });

  it('draws every view finite, mostly lit, and the same at the same moment', () => {
    const cells: Set<string>[] = [];
    for (let v = 0; v < 5; v++) {
      setVariant(v, k);
      let ok = true;
      let lit = 0;
      let same = true;
      const seen = new Set<string>();
      const { eye } = viewEye(v, 0.3, 12);
      for (const p of some) {
        const a = pieceAt(p, k, 12);
        ok &&= finite(a);
        if (Math.max(...a.rgb) > 0.01) lit++;
        const b = pieceAt(p, k, 12);
        same &&= dist(a.pos, b.pos) === 0 && dist(a.rgb, b.rgb) === 0;
        // What the eye sees: direction from the eye, coarse.
        const d = dist(a.pos, eye) || 1;
        seen.add(
          [0, 1, 2]
            .map((i) => Math.round((((a.pos[i] as number) - (eye[i] as number)) / d) * 8))
            .join(),
        );
      }
      expect(ok).toBe(true);
      expect(same).toBe(true);
      expect(lit).toBeGreaterThan(some.length * 0.6);
      cells.push(seen);
    }
    // The five views look from five different places.
    const eyes = [0, 1, 2, 3, 4].map((v) => viewEye(v, 0.3, 12).eye);
    for (let i = 0; i < 5; i++)
      for (let j = i + 1; j < 5; j++)
        expect(dist(eyes[i] as number[], eyes[j] as number[])).toBeGreaterThan(8);
    setVariant(0);
  });

  it('lays the plan out on GOLDEN’s rings, seen from nearly straight above', () => {
    const { eye, target } = viewEye(0, 0.2, 5);
    expect((eye[1] - target[1]) / dist(eye, target)).toBeGreaterThan(0.95);
    // Canals are sunk trenches; land rings flat; the rim rises.
    const canal = GOLDEN.bands.find((b) => b.name === 'Middle canal') as { r0: number; r1: number };
    expect(floorAt((canal.r0 + canal.r1) / 2, 0)).toBeLessThan(G - 1);
    expect(floorAt(12, 0)).toBe(G);
    expect(floorAt(64, 0)).toBeGreaterThan(G + 1);
    setVariant(0, k);
    let wide = 0;
    for (const p of some)
      wide = Math.max(wide, Math.hypot(pieceAt(p, k, 8).pos[0], pieceAt(p, k, 8).pos[2]));
    expect(wide).toBeGreaterThan(GOLDEN.outer);
  });

  it('has domes of many sizes with portholes, joined by glass tunnels, and gardens under some', () => {
    const kinds = new Set(COMPARTMENTS.map((c) => c.kind));
    for (const kind of ['knowledge', 'making', 'garden', 'homes', 'dome', 'airlock'])
      expect(kinds.has(kind)).toBe(true);
    const sizes = new Set(
      COMPARTMENTS.filter((c) => c.kind !== 'airlock').map((c) => Math.round(c.r * 10)),
    );
    expect(sizes.size).toBeGreaterThan(5);
    expect(isGardenDome(0)).toBe(true);
    expect(isGardenDome(1)).toBe(false);
    // Coral grows inside the garden domes: plenty of reef grains in their hemispheres.
    setVariant(0, k);
    const gardens = COMPARTMENTS.filter((c) => c.kind === 'garden');
    let inside = 0;
    for (const p of all) {
      const s = atlantisAt(p, 0.3, 9, 0);
      if (gardens.some((g) => dist(s.pos, g.c) < g.r * 0.9 && s.pos[1] > G)) inside++;
    }
    expect(inside).toBeGreaterThan(80);
    setVariant(0);
  });

  it('keeps every submarine in its lane, clear of every dome, each lane one colour', () => {
    expect(SUB_COUNT).toBeGreaterThan(20);
    const colours = new Set(SUB_LANES.map((L) => L.colour.join()));
    expect(colours.size).toBe(SUB_LANES.length);
    let off = 0;
    let hit = 0;
    let low = 0;
    for (let g = 0; g < SUB_COUNT; g++) {
      for (let t = 0; t < 120; t += 1.7) {
        const { c, lane } = submarine(g, t);
        const L = SUB_LANES[lane] as (typeof SUB_LANES)[number];
        let near = Number.POSITIVE_INFINITY;
        for (const q of L.pts) near = Math.min(near, dist(c, q));
        off = Math.max(off, near);
        for (const C of COMPARTMENTS) if (dist(c, C.c) < C.r + 0.3) hit++;
        if (c[1] - floorAt(c[0], c[2]) < 1.5) low++;
        // And always in the same lane.
        expect(submarine(g, t + 33).lane).toBe(lane);
      }
    }
    expect(off).toBeLessThan(0.2);
    expect(hit).toBe(0);
    expect(low).toBe(0);
    // They move along, at the lane's pace.
    const a = submarine(5, 10).c;
    const b = submarine(5, 11).c;
    expect(dist(a, b)).toBeGreaterThan(0.8);
    expect(dist(a, b)).toBeLessThan(3);
  });

  it('leaves trails of bubbles that rise as they age and fade before they come round', () => {
    for (let g = 0; g < SUB_COUNT; g += 3) {
      let prev = Number.NEGATIVE_INFINITY;
      for (let age = 0; age <= BUBBLE_LIFE; age += 0.5) {
        const y = bubble(g, age, 20, 7)[1];
        expect(y).toBeGreaterThan(prev);
        prev = y;
      }
      // A fresh bubble leaves from the stern, behind the submarine.
      const { c, f } = submarine(g, 20);
      const stern = [c[0] - f[0] * SUB_LEN * 0.55, c[1], c[2] - f[2] * SUB_LEN * 0.55];
      expect(dist(bubble(g, 0, 20, 7), stern)).toBeLessThan(0.3);
    }
    // In the picture: bubble grains a frame later are higher, unless faint where they come round.
    setVariant(0, k);
    const lo = roleShare(0, 'plankton') + roleShare(0, 'floor') + roleShare(0, 'city');
    const from =
      lo +
      roleShare(0, 'temple') +
      roleShare(0, 'harbour') +
      roleShare(0, 'reef') +
      roleShare(0, 'sub');
    const to = from + roleShare(0, 'bubble');
    const bubbles = all.filter((p) => p.c >= from && p.c < to);
    expect(bubbles.length).toBeGreaterThan(300);
    let up = 0;
    let bright = 0;
    for (const p of bubbles) {
      const a = atlantisAt(p, 0.3, 14, 0);
      const b = atlantisAt(p, 0.3, 14 + 1 / 30, 0);
      if (b.pos[1] > a.pos[1]) up++;
      else bright = Math.max(bright, Math.max(...a.rgb), Math.max(...b.rgb));
    }
    expect(up).toBeGreaterThan(bubbles.length * 0.95);
    expect(bright).toBeLessThan(0.05);
  });

  it('brings harbour submarines in to rest still at a berth, then out again', () => {
    for (let b = 0; b < BERTHS.length; b++) {
      const rests: number[] = [];
      for (let t = 0; t < 60; t += 0.5) if (dockedSub(b, t).resting) rests.push(t);
      expect(rests.length).toBeGreaterThan(10);
      const r0 = rests.find((t) => rests.includes(t + 1)) as number;
      expect(dist(dockedSub(b, r0).c, BERTHS[b] as number[])).toBe(0);
      expect(dist(dockedSub(b, r0 + 1).c, dockedSub(b, r0).c)).toBe(0);
    }
  });

  it('glows from the heart, and drifts its colours slowly: a frame apart nothing jumps', () => {
    for (const v of [0, 3]) {
      setVariant(v, k);
      let jump = 0;
      for (const p of some) {
        const a = pieceAt(p, k, 9);
        const b = pieceAt(p, k, 9 + 1 / 60);
        jump = Math.max(jump, dist(a.rgb, b.rgb));
      }
      expect(jump).toBeLessThan(0.05);
    }
    // In The heart, a good share of the grains sits on the temple, light near its sphere.
    setVariant(3, k);
    let near = 0;
    for (const p of all)
      if (dist(pieceAt(p, k, 9).pos, TEMPLE_SPHERE.c) < TEMPLE_SPHERE.r * 1.3) near++;
    expect(near).toBeGreaterThan(300);
    setVariant(0);
  });
});
