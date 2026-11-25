import { describe, expect, it } from 'vitest';
import { autopilotControls } from './autopilot';
import { CHINA_LAP } from './chinatown-lap';
import { balconyLocal, PATH_SIGNS, underpass } from './chinatown-paths';
import { CT_PATH_CELLS, ctCell } from './chinatown-street';
import { nearVista, VISTA, vistaLocal, vistasBetween } from './chinatown-vista';
import { piecesBetween } from './night-course';
import {
  CHINATOWN,
  chinatownHalf,
  frameAt,
  heightAt,
  makeTrackWorld,
  project,
  streetAt,
} from './track';
import { underLocal, underStart } from './undertown';
import { newVehicle, stepVehicle } from './vehicle';

const arcades = vistasBetween(0, 3 * CHINA_LAP).filter((v) => v.kind === 'arcade');
const first = arcades[0].start;

describe('the lake arcade (2026-11-24: "a whole part left that is below the buildings")', () => {
  it('comes after every Undertown, clear of the underpass, Undertown and the balcony road', () => {
    expect(arcades.length).toBe(6);
    arcades.forEach((v, k) => {
      const a = v.start;
      expect(v.side).toBe(1);
      expect(a).toBe(underStart(k) + VISTA.FROM);
      for (let s = a - VISTA.CLEAR + 1; s < a + VISTA.LENGTH + VISTA.CLEAR; s += 5) {
        expect(balconyLocal(s)).toBeNull();
        expect(underpass(s)).toBeNull();
        expect(underLocal(s)).toBeNull();
      }
      expect(vistaLocal(a - 1)).toBeNull();
      expect(vistaLocal(a + 1)).toBeCloseTo(1, 9);
      expect(vistaLocal(a + VISTA.LENGTH + 1)).toBeNull();
    });
    expect(vistaLocal(Number.NaN)).toBeNull();
  });

  it('a car hard against the left edge under the deck stays on the road, well under it', () => {
    const w = makeTrackWorld(CHINATOWN);
    const s0 = first - 50;
    const f = frameAt(w.track, s0);
    const v = newVehicle('car', f.x, f.y, f.h, heightAt(w.track, s0, 0));
    v.vx = Math.cos(f.h) * 50;
    v.vy = Math.sin(f.h) * 50;
    w.track.hint = s0;
    let inside = 0;
    for (let i = 0; i < 60 * 14; i++) {
      const t = i / 60;
      const { s } = project(w.track, v.x, v.y);
      w.track.hint = s;
      const c = autopilotControls(v, w.track, s, t, false, 0, { bypass: false, balcony: false });
      stepVehicle(v, { ...c, steer: 1, throttle: 0.8, boost: 0 }, 1 / 60, w, t);
      const q = project(w.track, v.x, v.y);
      w.track.hint = q.s;
      if (vistaLocal(q.s) === null) continue;
      inside++;
      const half = chinatownHalf(q.s);
      // Held by the street's own wall, never out onto the terrace or over the drop.
      expect(q.u).toBeLessThan(half + 2.4);
      // The deck stays well over you, even off the crests.
      expect(streetAt(CHINATOWN, q.s, half) + VISTA.DECK - v.z).toBeGreaterThan(6);
      if (q.s > first + VISTA.LENGTH) break;
    }
    expect(inside).toBeGreaterThan(60 * 3);
  });

  it('lifts the left side up onto the deck and keeps the view out over the lake open', () => {
    const a = first;
    const ps = piecesBetween('chinatown', CHINATOWN, a - 100, a + VISTA.LENGTH + 100);
    let onDeck = 0;
    let columns = 0;
    for (const p of ps) {
      const half = chinatownHalf(p.s);
      const inside = vistaLocal(p.s) !== null;
      if (p.kind === 'shophouse' && p.side > 0 && inside) {
        // Up on the deck, never standing on the street in the arcade.
        expect(p.base).toBeGreaterThan(streetAt(CHINATOWN, p.s, half) + VISTA.DECK);
        onDeck++;
      }
      if (p.kind === 'pillar' && inside) {
        columns++;
        expect(p.u).toBeGreaterThan(half + 1);
        expect(p.z).toBeCloseTo(streetAt(CHINATOWN, p.s, half) + VISTA.DECK, 6);
      }
      if (inside) {
        // No gates nor high strings of light through the deck.
        expect(['gate', 'temple', 'lights']).not.toContain(p.kind);
        // Past the columns only the balustrade's lights: the view stays clear.
        if (p.u > half + VISTA.COLS[1] + 1) {
          expect(p.kind).toBe('beacon');
          expect(p.u).toBeGreaterThan(half + VISTA.RAIL - 1);
        }
      }
    }
    expect(onDeck).toBeGreaterThan(20);
    expect(columns).toBeGreaterThan(80);
    expect(ps.some((p) => p.kind === 'billboard' && p.cell === CT_PATH_CELLS.lake)).toBe(true);
    expect(ctCell('board', CT_PATH_CELLS.lake).word).toBe(PATH_SIGNS.lake);
    expect(nearVista(a - 5, 10)).toBe(true);
    expect(nearVista(a - 50, 10)).toBe(false);
  });
});
